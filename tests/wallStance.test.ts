import { describe, expect, it } from 'vitest';

// (CT prototype G6) The posed wall stances on the real rig (NullEngine): the side-on crouch against the face, the hand
// on the knee, the peek's head past the edge (AUDIT-WALLS rows 1, 9, 18). The face is the plane z = 0 (normal +z).
describe('wall stances on the rig (G6)', () => {
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
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
      const push = wallRootPush(COVER_STANDOFF, p.bodyDepthHalf, Math.max(Math.abs(Math.sin(yaw)), Math.abs(rig.shoulderTurnSin(0, 1))), p.shoulderHalf);
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
