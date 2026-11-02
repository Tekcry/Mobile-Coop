import { describe, expect, it } from 'vitest';

// (CT prototype G6) The posed wall stances on the real rig (NullEngine): the side-on crouch against the face, the hand
// on the knee, the peek's head past the edge (AUDIT-WALLS rows 1, 9, 18). The face is the plane z = 0 (normal +z).
describe('wall stances on the rig (G6)', () => {
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    return { scene, rig, Vector3 };
  }
  const pose = (crouch: number, wallTurn: number, lean: number, armed = false) =>
    ({ speed: 0, localX: 0, localZ: 0, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, armed, wall: true, wallSide: 1, wallTurn, wallNx: 0, wallNz: 1, wallFace: 0, lean }) as const;

  it('crouched side-on: the wall-side shoulder and hip 2-10 cm off the face, nothing behind it; the open hand on its knee', async () => {
    const { scene, rig } = await setup();
    const { wallRootPush, wallYawOffset } = await import('../src/player/wallController');
    const { COVER_STANDOFF } = await import('../src/world/levelBuilder');
    const p = rig.p;
    const yaw = wallYawOffset(1, 1);
    rig.root.rotation.y = yaw;
    for (let k = 0; k < 150; k++) {
      const push = wallRootPush(COVER_STANDOFF, p.bodyDepthHalf, Math.max(Math.abs(Math.sin(yaw)), Math.abs(rig.shoulderTurnSin(0, 1))), p.shoulderHalf, 1);
      rig.root.position.set(0, 0, COVER_STANDOFF - push);
      rig.animate(1 / 60, pose(1, Math.abs(Math.sin(yaw)), 0));
    }
    // turned right toward the travel the wall is on the body's right
    const sh = rig.shoulderR.getAbsolutePosition().z;
    const hip = rig.hipR.getAbsolutePosition().z;
    expect(sh, `wall-side shoulder ${sh.toFixed(3)} m off the face`).toBeGreaterThan(0.05);
    expect(sh).toBeLessThan(0.12);
    expect(hip).toBeGreaterThan(0.08);
    expect(hip).toBeLessThan(0.2);
    for (const n of [rig.elbowR, rig.wristR, rig.kneeR, rig.ankleR, rig.elbowL, rig.wristL]) expect(n.getAbsolutePosition().z).toBeGreaterThan(0.06);
    // the left (open-side) wrist on the left knee
    const kn = rig.kneeL.getAbsolutePosition();
    const wr = rig.wristL.getAbsolutePosition();
    expect(Math.hypot(kn.x - wr.x, kn.y - wr.y, kn.z - wr.z)).toBeLessThan(0.12);
    expect(wr.y).toBeGreaterThan(kn.y);
    // the trunk well forward over the knees (CT about 45 deg): the head ahead of the hips along the facing
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const hd = rig.headNode.getAbsolutePosition();
    const hp = rig.hips.getAbsolutePosition();
    const ahead = (hd.x - hp.x) * fwdX + (hd.z - hp.z) * fwdZ;
    const up = hd.y - hp.y;
    const deg = (Math.atan2(ahead, up) * 180) / Math.PI;
    expect(deg, `trunk ${deg.toFixed(1)} deg forward`).toBeGreaterThan(30);
    expect(deg).toBeLessThan(60);
    scene.dispose();
  });

  it('standing peek: the head ends WALL.peekOut along the wall from the capsule (0.14 m past a 0.22 m end stop)', async () => {
    const { scene, rig, Vector3 } = await setup();
    const { wallRootPush, WALL } = await import('../src/player/wallController');
    const { COVER_STANDOFF } = await import('../src/world/levelBuilder');
    const p = rig.p;
    rig.root.rotation.y = 0;
    const push = wallRootPush(COVER_STANDOFF, p.bodyDepthHalf, 0, p.shoulderHalf);
    rig.root.position.set(WALL.peekStep, 0, COVER_STANDOFF - push);
    for (let k = 0; k < 120; k++) rig.animate(1 / 60, pose(0, 0, WALL.peekLean));
    const h = rig.posedHead(new Vector3());
    expect(Math.abs(h.x - WALL.peekOut)).toBeLessThan(0.03);
    // past the end stop (EDGE_MARGIN 0.22): CT 0.15-0.25 m past the frame
    expect(h.x - 0.22).toBeGreaterThan(0.1);
    // the head stays off the face
    expect(h.z).toBeGreaterThan(0.1);
    scene.dispose();
  });
});

// (G6 fix, e2e-netmove "wall crouch": the host's copy had the hands 0.15-0.3 m off the owner's) the crouched side-on wall
// stance comes from the MoveState-derivable inputs alone: the planner's lead (which differs between the owner and the
// copy as their feet settle) no longer picks the kneeling knee on a wall, so the knee hand lands on the same knee
describe('wall stance parity (G6 fix)', () => {
  it('the side-on wall kneel and knee hand do not depend on the planner lead (owner and copy alike)', async () => {
    const { AnimGraph, defaultInput } = await import('../src/anim/animGraph');
    const { proportions } = await import('../src/player/proportions');
    const p = proportions('average');
    for (const side of [1, -1]) {
      const run = (lead: number) => {
        const g = new AnimGraph(p);
        const i = { ...defaultInput(), crouch: 1, kneel: true, armed: false, ready: true, wall: true, wallSide: side, wallTurn: 1 };
        g.setLead(lead);
        let t = g.update(1 / 60, i);
        for (let k = 0; k < 180; k++) t = g.update(1 / 60, i);
        return { kneeHand: t.kneeHand, stance: { ...t.stance }, handL: { ...t.handL }, handR: { ...t.handR }, pelvisY: t.pelvis.y };
      };
      const a = run(0.2);
      const b = run(-0.2);
      expect(Math.abs(a.kneeHand)).toBeGreaterThan(0.9);
      expect(a.kneeHand).toBeCloseTo(b.kneeHand, 9);
      // the open-side hand is the one away from the wall (the wall is on the travel side, `side`)
      expect(Math.sign(a.kneeHand)).toBe(-side);
      for (const k of ['lX', 'lZ', 'rX', 'rZ', 'lY', 'rY', 'lPitch', 'rPitch'] as const) expect(a.stance[k], `${side} ${k}`).toBeCloseTo(b.stance[k], 3);
      expect(a.handL.y).toBeCloseTo(b.handL.y, 3);
      expect(a.handR.y).toBeCloseTo(b.handR.y, 3);
      // (the idle clocks start at a random phase on every graph: a breath's few tenths of a mm)
      expect(Math.abs(a.pelvisY - b.pelvisY)).toBeLessThan(0.01);
    }
  });

  it('a remote-posed crouched wall stance (the copy\'s inputs) matches the owner\'s on the rig within 2 cm', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { wallRootPush, wallYawOffset, wallHeadYaw, WALL_SUB, wallSideFromSub, wallFacing } = await import('../src/player/wallController');
    const { COVER_STANDOFF } = await import('../src/world/levelBuilder');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const mk = () => new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const owner = mk();
    const copy = mk();
    // the owner slid toward a (dir -1: WALL_SUB.faceRight), crouched, still; the copy reads the side from the sub bits
    const ownerSide = wallFacing(0, -1);
    const copySide = wallSideFromSub(WALL_SUB.crouch | WALL_SUB.faceRight);
    expect(copySide).toBe(ownerSide);
    const yaw = wallYawOffset(1, ownerSide);
    const base = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 1, kneel: true, aimPitch: 0, aim: 0, kick: 0, wall: true, wallNx: 0, wallNz: 1, wallFace: 0, lean: 0, wallTurn: Math.abs(Math.sin(yaw)), stride: 'velocity' as const };
    // the owner's extra inputs (the motion driver, the stop hold, the camera's pitch); the copy has none of them
    const ownerPose = { ...base, wallSide: ownerSide, phase: -1, motion: 'idle' as const, motionT: 1, quickStop: 0.2, holdSpeed: 0, accelFwd: 0, accelSide: 0, velX: 0, velZ: 0, lookYaw: wallHeadYaw(ownerSide, 0, 1, yaw, 0), lookPitch: 0.1 };
    const copyPose = { ...base, wallSide: copySide, lookYaw: wallHeadYaw(copySide, 0, 1, yaw, 0), lookPitch: 0.1 };
    for (const [rig, pose] of [[owner, ownerPose], [copy, copyPose]] as const) {
      rig.root.rotation.y = yaw;
      for (let k = 0; k < 150; k++) {
        const push = wallRootPush(COVER_STANDOFF, rig.p.bodyDepthHalf, Math.max(Math.abs(Math.sin(yaw)), Math.abs(rig.shoulderTurnSin(0, 1))), rig.p.shoulderHalf, 1);
        rig.root.position.set(0, 0, COVER_STANDOFF - push);
        rig.animate(1 / 60, pose as never);
      }
    }
    for (const n of ['wristL', 'wristR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'headNode'] as const) {
      const a = owner[n].getAbsolutePosition();
      const b = copy[n].getAbsolutePosition();
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z), n).toBeLessThan(0.02);
    }
    scene.dispose();
  });
});

// (G6 fix, check BLOCK 3: shots/g6/wallcrouchslide-side 0.90-1.05 s) the crouched reversal turns through square-on with the
// side-on crouch's forward trunk still easing out: no joint goes behind the face on the way
describe('crouched wall reversal (G6 fix)', () => {
  it('no joint behind the face through the 0.45 s side-on reversal (both ways)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { wallRootPush, wallYawOffset, wallTurnRate } = await import('../src/player/wallController');
    const { COVER_STANDOFF } = await import('../src/world/levelBuilder');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const names = ['hips', 'spine', 'chest', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'] as const;
    let worst = Infinity;
    let at = '';
    for (const from of [1, -1]) {
      let yaw = wallYawOffset(1, from);
      let side = from;
      let x = 0;
      rig.root.rotation.y = yaw;
      for (let k = 0; k < 150; k++) {
        if (k === 60) side = -from; // the stick reverses: the side flips, the body turns at the settled side-on rate
        const goal = wallYawOffset(1, side);
        const d = goal - yaw;
        const mx = wallTurnRate(Math.abs(d), true, true, 1) / 60;
        yaw += Math.max(-mx, Math.min(mx, d));
        rig.root.rotation.y = yaw;
        const ts = Math.max(Math.abs(Math.sin(yaw)), Math.abs(rig.shoulderTurnSin(0, 1)));
        const push = wallRootPush(COVER_STANDOFF, rig.p.bodyDepthHalf, ts, rig.p.shoulderHalf, 1);
        // sliding along the wall (+x when turned right) at the crouched pace, as the capsule does
        const moving = k > 55 && k < 100;
        if (moving) x += side * 0.45 / 60;
        rig.root.position.set(x, 0, COVER_STANDOFF - push);
        rig.animate(1 / 60, { speed: moving ? 0.45 : 0, localX: 0, localZ: moving ? 1 : 0, grounded: true, crouch: 1, aimPitch: 0, aim: 0, kick: 0, armed: false, wall: true, wallSide: side, wallTurn: Math.abs(Math.sin(yaw)), wallNx: 0, wallNz: 1, wallFace: 0, lean: 0, stride: 'velocity' } as never);
        if (k < 55) continue;
        for (const n of names) {
          const node = (rig as unknown as Record<string, { getAbsolutePosition(): { z: number } } | undefined>)[n];
          if (!node) continue;
          const z = node.getAbsolutePosition().z;
          if (z < worst) {
            worst = z;
            at = `${n} frame ${k} yaw ${yaw.toFixed(2)}`;
          }
        }
      }
    }
    // joint centres at least 4 cm in front of the face (a limb's half thickness)
    expect(worst, at).toBeGreaterThan(0.04);
    scene.dispose();
  });
});
