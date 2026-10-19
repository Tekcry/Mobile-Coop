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
    const head = { x: 0, y: 1.75, z: 0 };
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
