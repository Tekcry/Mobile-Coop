import { describe, expect, it } from 'vitest';

/** CT prototype A2.1: the camera follows the character rigidly and moves only by look input. */
async function rig() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { ShoulderCamera } = await import('../src/player/shoulderCamera');
  const scene = new Scene(new NullEngine());
  const cam = new ShoulderCamera(scene);
  return { cam, feet: new Vector3(0, 0, 0), Vector3 };
}

describe('rigid camera follow (A2.1)', () => {
  it('camera offset from the character is constant while walking, running and stopping with no look input', async () => {
    const { cam, feet } = await rig();
    const dt = 1 / 60;
    cam.yaw = 0.7;
    cam.pitch = -0.3;
    for (let i = 0; i < 30; i++) cam.update(dt, feet, 0);
    const off0 = { x: cam.camera.position.x - feet.x, y: cam.camera.position.y - feet.y, z: cam.camera.position.z - feet.z };
    let worst = 0;
    let t = 0;
    for (let i = 0; i < 300; i++) {
      // accelerate to 4 m/s along +x for 2 s, hold, then stop dead (a hard stop must not settle or overshoot)
      const speed = i < 120 ? (4 * i) / 120 : i < 220 ? 4 : 0;
      feet.x += speed * dt;
      feet.z += speed * 0.5 * dt;
      cam.update(dt, feet, 0);
      t += dt;
      const ox = cam.camera.position.x - feet.x - off0.x;
      const oy = cam.camera.position.y - feet.y - off0.y;
      const oz = cam.camera.position.z - feet.z - off0.z;
      worst = Math.max(worst, Math.hypot(ox, oy, oz));
    }
    expect(t).toBeGreaterThan(4);
    expect(worst).toBeLessThan(1e-6);
    expect(cam.yaw).toBe(0.7);
    expect(cam.pitch).toBe(-0.3);
  });

  it('framing: about 1.8 m behind the head, head near screen centre (camera looks at it), no zoom when aiming', async () => {
    const { cam, feet } = await rig();
    cam.yaw = 0;
    cam.pitch = -0.3;
    for (let i = 0; i < 10; i++) cam.update(1 / 60, feet, 0);
    const head = { x: 0, y: 1.68, z: 0 };
    const p = cam.camera.position;
    const d = Math.hypot(p.x - head.x, p.y - head.y, p.z - head.z);
    expect(d).toBeGreaterThan(1.7);
    expect(d).toBeLessThan(1.9);
    expect(p.y).toBeGreaterThan(2.2);
    expect(p.y).toBeLessThan(2.4);
    const fovHip = cam.camera.fov;
    cam.adsTarget = 1;
    let t = 0;
    while (cam.ads < 1 && t < 3) {
      cam.update(1 / 60, feet, 0);
      t += 1 / 60;
    }
    expect(t).toBeGreaterThan(0.5);
    expect(t).toBeLessThan(0.7);
    expect(cam.camera.fov).toBeCloseTo(fovHip, 9);
    const q = cam.camera.position;
    expect(Math.hypot(q.x - head.x, q.z - head.z)).toBeLessThan(0.7);
  });

  it('fast-out: half way back in about 0.1 s, settled in about 0.5 s', async () => {
    const { cam, feet } = await rig();
    cam.adsTarget = 1;
    for (let i = 0; i < 90; i++) cam.update(1 / 60, feet, 0);
    cam.adsTarget = 0;
    let half = -1;
    let done = -1;
    for (let i = 0; i < 120; i++) {
      cam.update(1 / 60, feet, 0);
      const t = (i + 1) / 60;
      if (half < 0 && cam.ads < 0.5) half = t;
      if (done < 0 && cam.ads < 0.05) done = t;
    }
    expect(half).toBeLessThan(0.15);
    expect(done).toBeGreaterThan(0.3);
    expect(done).toBeLessThan(0.6);
  });
});

describe('shoulder rule (F1, playtest 2)', () => {
  const rightOf = (cam: { yaw: number; camera: { position: { x: number; z: number } } }, x: number, z: number) =>
    Math.cos(cam.yaw) * (cam.camera.position.x - x) - Math.sin(cam.yaw) * (cam.camera.position.z - z);
  it('the holstered wall camera stays over the right shoulder (the wall never sets the shoulder)', async () => {
    const { cam, feet } = await rig();
    const dt = 1 / 60;
    expect(cam.shoulder).toBe(1);
    cam.attach = 'wall';
    for (let i = 0; i < 30; i++) cam.update(dt, feet, 0);
    expect(cam.shoulder).toBe(1);
    cam.attach = null;
    for (let i = 0; i < 60; i++) cam.update(dt, feet, 0);
    expect(cam.shoulder).toBe(1);
    expect(rightOf(cam, feet.x, feet.z)).toBeGreaterThan(0);
  });
  it('a left swap lasts while aiming; holstering resets the follow camera to the right', async () => {
    const { cam, feet } = await rig();
    const dt = 1 / 60;
    cam.adsTarget = 1;
    for (let i = 0; i < 60; i++) cam.update(dt, feet, 0);
    cam.swapShoulder();
    for (let i = 0; i < 60; i++) cam.update(dt, feet, 0);
    expect(rightOf(cam, feet.x, feet.z)).toBeLessThan(0);
    cam.adsTarget = 0;
    cam.resetShoulder();
    for (let i = 0; i < 60; i++) cam.update(dt, feet, 0);
    expect(cam.shoulder).toBe(1);
    expect(rightOf(cam, feet.x, feet.z)).toBeGreaterThan(0);
  });
  it('(F4) an edge peek slides the camera toward the open side, whichever way the camera looks', async () => {
    // the edge (-x) on the camera's left, on its right, and straight ahead (looking round the corner)
    for (const yaw of [0, Math.PI, -Math.PI / 2]) {
      const { cam, feet } = await rig();
      const dt = 1 / 60;
      cam.yaw = yaw;
      cam.attach = 'wall';
      cam.wallEdgeX = -1;
      cam.wallEdgeZ = 0;
      for (let i = 0; i < 40; i++) cam.update(dt, feet, 0);
      const x0 = cam.camera.position.x;
      cam.wallPeek = 1;
      for (let i = 0; i < 40; i++) cam.update(dt, feet, 0);
      expect(cam.camera.position.x).toBeLessThan(x0 - 0.2);
    }
  });
});

describe('G3: CT footage framing (AUDIT-CAMERA)', () => {
  const step = (cam: { update(dt: number, f: unknown, c: number): void }, feet: unknown, n: number, crouch = 0) => {
    for (let i = 0; i < n; i++) cam.update(1 / 60, feet, crouch);
  };
  it('rows 1 and 7: an open space frames from 2.8 m (crouched 2.2 m), a tight one from 1.8 m, eased between them', async () => {
    const { cam, feet } = await rig();
    cam.space = 1;
    step(cam, feet, 5);
    // the first space snaps (no glide at spawn)
    expect(cam.boomActual).toBeGreaterThan(2.7);
    step(cam, feet, 60);
    expect(cam.boomActual).toBeCloseTo(2.8, 2);
    step(cam, feet, 120, 1);
    expect(cam.boomActual).toBeCloseTo(2.2, 2);
    // into a tight space: a glide (no cut), settled within about a second
    cam.space = 0;
    let worst = 0;
    let prev = cam.boomActual;
    for (let i = 0; i < 90; i++) {
      cam.update(1 / 60, feet, 0);
      worst = Math.max(worst, Math.abs(cam.boomActual - prev));
      prev = cam.boomActual;
    }
    expect(worst).toBeLessThan(0.06);
    expect(cam.boomActual).toBeCloseTo(1.8, 1);
    // no map data and no physics: tight
    cam.space = Number.NaN;
    step(cam, feet, 120);
    expect(cam.boomActual).toBeCloseTo(1.8, 2);
  });
  it('row 13: an aim off the wall dollies in within 0.35 s; elsewhere the weapon time (0.6 s)', async () => {
    const { cam, feet } = await rig();
    cam.attach = 'wall';
    step(cam, feet, 20);
    cam.attach = null;
    cam.adsTarget = 1;
    let t = 0;
    while (cam.ads < 1 && t < 2) {
      cam.update(1 / 60, feet, 0);
      t += 1 / 60;
    }
    expect(t).toBeLessThan(0.38);
    expect(t).toBeGreaterThan(0.3);
    // a free aim later keeps the weapon's time
    cam.adsTarget = 0;
    step(cam, feet, 120);
    cam.adsTarget = 1;
    t = 0;
    while (cam.ads < 1 && t < 2) {
      cam.update(1 / 60, feet, 0);
      t += 1 / 60;
    }
    expect(t).toBeGreaterThan(0.55);
  });
  it('row 11: the edge peek eases in over 0.35 s and back over 0.3 s (CT 0.2 / 0.17; e2e-wall caps the step)', async () => {
    const { cam, feet } = await rig();
    cam.attach = 'wall';
    cam.wallEdgeX = -1;
    cam.wallEdgeZ = 0;
    step(cam, feet, 60);
    const x0 = cam.camera.position.x;
    cam.wallPeek = 1;
    step(cam, feet, 22);
    const x1 = cam.camera.position.x;
    step(cam, feet, 30);
    expect(Math.abs(cam.camera.position.x - x1)).toBeLessThan(0.01);
    cam.wallPeek = 0;
    step(cam, feet, 19);
    expect(Math.abs(cam.camera.position.x - x0)).toBeLessThan(0.01);
  });
  it('rows 19 and 24: FOV 86 at 16:9, no zoom at a door crack', async () => {
    const { CAMERA } = await import('../src/config/camera');
    const { DOOR_PEEK } = await import('../src/world/doorPeek');
    const { vfovFromH16x9 } = await import('../src/player/shoulderCamera');
    expect(CAMERA.fov).toBe(86);
    // CT's 55.7 deg vertical within half a degree
    expect(Math.abs((vfovFromH16x9(CAMERA.fov) * 180) / Math.PI - 55.7)).toBeLessThan(0.5);
    expect(DOOR_PEEK.fovMul).toBe(1);
  });
});

describe('G3: door passage and boom rates (AUDIT-EXTRA)', () => {
  it('through an open door the boom pushes in to 0.8 m over 0.4 s and returns over 0.7 s', async () => {
    const { cam, feet } = await rig();
    for (let i = 0; i < 30; i++) cam.update(1 / 60, feet, 0);
    expect(cam.boomActual).toBeCloseTo(1.8, 2);
    cam.doorPass = 1;
    for (let i = 0; i < 24; i++) cam.update(1 / 60, feet, 0);
    // the spring (`boomIn` 16) trails the eased target a little
    expect(cam.boomActual).toBeLessThan(1.0);
    for (let i = 0; i < 30; i++) cam.update(1 / 60, feet, 0);
    expect(cam.boomActual).toBeCloseTo(0.8, 2);
    cam.doorPass = 0;
    for (let i = 0; i < 20; i++) cam.update(1 / 60, feet, 0);
    expect(cam.boomActual).toBeLessThan(1.6);
    for (let i = 0; i < 120; i++) cam.update(1 / 60, feet, 0);
    expect(cam.boomActual).toBeCloseTo(1.8, 2);
  });
  it('CT 053437: the boom spring pulls in at 16 /s and eases out at 4 /s', async () => {
    const { CAMERA } = await import('../src/config/camera');
    expect(CAMERA.boomIn).toBe(16);
    expect(CAMERA.boomOut).toBe(4);
  });
});
