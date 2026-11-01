// (anim-n3b) Wren's per-shot body recoil (PASS2 row 25) and the wall block (PASS2 row 24) on the real rig maths
// (NullEngine, Wren's hands, the weapons' grip data), and the recoil step's allocation.
import { describe, expect, it } from 'vitest';
import type { RigPose } from '../src/player/characterRig';
import { BodyRecoil, WREN_RECOIL_PISTOL, WREN_RECOIL_RIFLE } from '../src/anim/recoil';
import { WALL_BLOCK, wallBlockK } from '../src/anim/animGraph';

const DT = 1 / 60;
const DEG = 180 / Math.PI;
type P3 = { x: number; y: number; z: number };
const dist = (a: P3, b: P3): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

async function rigWithWeapons() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3, Matrix } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const { WREN_HANDS, WREN_HOLSTER, WREN_BACK_MOUNT } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  // as operatorRig (playerFigure.ts): Wren's build, her hands, holster and back mount, and a Wren rig (`tuneRows`)
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'n3b', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
  rig.backMount = WREN_BACK_MOUNT as unknown as typeof rig.backMount;
  rig.tuneRows = true;
  const rifle = new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  const pistol = new WeaponModel(scene, lib, WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  const settle = (): void => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  };
  const inv = new Matrix();
  /** A point of a node's local space in the rig root's frame (+y up, +z forward). */
  const inRoot = (node: typeof rifle.node, p: readonly number[]): P3 => {
    rig.root.getWorldMatrix().invertToRef(inv);
    return Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(p[0], p[1], p[2]), node.getWorldMatrix()), inv);
  };
  return { scene, rig, rifle, pistol, settle, inRoot, WEAPONS };
}

function aimPose(o: Partial<RigPose> = {}): RigPose {
  return { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true, ...o };
}

describe('anim-n3b: per-shot body recoil (PASS2 row 25)', () => {
  it('the recoil step: a unit peak per shot, back to rest within 0.3 s, nothing without a rising kick', () => {
    const r = new BodyRecoil();
    let kick = 1;
    let peakG = 0;
    let peakB = 0;
    let peakGAt = 0;
    let peakBAt = 0;
    for (let k = 0; k < 60; k++) {
      r.step(kick, 0, 1, DT);
      kick = Math.max(0, kick - DT * 8);
      if (r.back > peakG) [peakG, peakGAt] = [r.back, k * DT];
      if (r.spine > peakB) [peakB, peakBAt] = [r.spine, k * DT];
      if (k === 18) {
        // 0.3 s after the shot: under 5 % of the peak (gun and body)
        expect(r.back).toBeLessThan(0.05 * WREN_RECOIL_RIFLE.back);
        expect(r.spine).toBeLessThan(0.05 * WREN_RECOIL_RIFLE.spine);
      }
    }
    // the gun peaks near 1 / omega, the trunk a frame or two after it (the push goes hands -> shoulder -> chest)
    expect(peakG).toBeGreaterThan(0.9 * WREN_RECOIL_RIFLE.back);
    expect(peakG).toBeLessThanOrEqual(WREN_RECOIL_RIFLE.back * 1.0001);
    expect(peakGAt).toBeLessThan(0.06);
    expect(peakBAt).toBeGreaterThanOrEqual(peakGAt);
    // a held (falling) kick never re-fires; the pistol mix and the tuner scale
    r.reset();
    for (let k = 0; k < 30; k++) r.step(0.15 - k * 0.004, 1, 1, DT);
    expect(r.flip).toBe(0);
    r.step(1, 1, 2, DT);
    for (let k = 0; k < 2; k++) r.step(0.9, 1, 2, DT);
    expect(r.flip).toBeGreaterThan(WREN_RECOIL_PISTOL.flip);
  });

  it('the step allocates nothing (sustained fire at 620 rpm)', () => {
    const r = new BodyRecoil();
    const acc = new Float64Array(1);
    const run = (): number => {
      const before = process.memoryUsage().heapUsed;
      let kick = 0;
      for (let k = 0; k < 200000; k++) {
        if (k % 6 === 0) kick = 1;
        r.step(kick, (k >> 10) & 1, 1, DT);
        kick = Math.max(0, kick - DT * 8);
        acc[0] = acc[0]! + r.back + r.flip + r.spine;
      }
      return process.memoryUsage().heapUsed - before;
    };
    run();
    const grown = Math.min(run(), run(), run());
    expect(Number.isFinite(acc[0]!)).toBe(true);
    expect(grown).toBeLessThan(2_000_000);
  });

  it('on the rig: a rifle shot kicks the gun and hands back and up, the chest gives, all settle in 0.3 s; the pistol flips more at the wrists', async () => {
    // twin rigs on the same input, one firing: the difference is the recoil (the idle and its weight shifts cancel)
    const A = await rigWithWeapons();
    const B = await rigWithWeapons();
    for (const pistolCase of [false, true]) {
      const weight = pistolCase ? 0.7 : 1;
      const def = pistolCase ? A.WEAPONS.pistolSd : A.WEAPONS.rifle;
      for (const R of [A, B]) {
        const held = pistolCase ? R.pistol : R.rifle;
        (pistolCase ? R.rifle : R.pistol).holster(R.rig, pistolCase ? 'backL' : 'thigh');
        held.hold(R.rig);
      }
      // the idle clock starts at random (animGraph idleT): line the twins up
      for (const R of [A, B]) (R.rig.graph as unknown as { idleT: number }).idleT = 0;
      const pa = aimPose({ weight });
      const pb = aimPose({ weight });
      for (let k = 0; k < 150; k++) {
        A.rig.animate(DT, pa);
        B.rig.animate(DT, pb);
      }
      let back = 0;
      let up = 0;
      let rise = 0;
      let wrist = 0;
      let chest = 0;
      let jump = 0;
      let late = 0;
      let lateChest = 0;
      let prev: P3 | null = null;
      pb.kick = 1;
      for (let k = 0; k < 30; k++) {
        A.rig.animate(DT, pa);
        B.rig.animate(DT, pb);
        pb.kick = Math.max(0, pb.kick - DT * 8);
        A.settle();
        B.settle();
        const ha = pistolCase ? A.pistol.node : A.rifle.node;
        const hb = pistolCase ? B.pistol.node : B.rifle.node;
        const ga = A.inRoot(ha, def.grip);
        const gb = B.inRoot(hb, def.grip);
        const ma = A.inRoot(ha, def.muzzle);
        const mb = B.inRoot(hb, def.muzzle);
        const wa = A.inRoot(A.rig.wristR, [0, 0, 0]);
        const wb = B.inRoot(B.rig.wristR, [0, 0, 0]);
        back = Math.max(back, ga.z - gb.z);
        up = Math.max(up, gb.y - ga.y);
        rise = Math.max(rise, Math.atan2(mb.y - gb.y, mb.z - gb.z) - Math.atan2(ma.y - ga.y, ma.z - ga.z));
        wrist = Math.max(wrist, dist(wa, wb));
        const dc = A.rig.graph.out.spine.pitch - B.rig.graph.out.spine.pitch;
        chest = Math.max(chest, dc);
        if (prev) jump = Math.max(jump, dist(gb, prev));
        prev = gb;
        if (k >= 17) {
          // 0.3 s on: back at rest
          late = Math.max(late, dist(ga, gb));
          lateChest = Math.max(lateChest, Math.abs(dc));
        }
      }
      const name = pistolCase ? 'pistol' : 'rifle';
      console.info(`${name} shot: grip back ${(back * 100).toFixed(1)} cm, up ${(up * 100).toFixed(1)} cm, muzzle rise ${(rise * DEG).toFixed(1)} deg, wrist ${(wrist * 100).toFixed(1)} cm, chest ${(chest * DEG).toFixed(1)} deg, largest frame ${(jump * 100).toFixed(1)} cm; after 0.3 s grip ${(late * 1000).toFixed(1)} mm, chest ${(lateChest * DEG).toFixed(2)} deg`);
      if (!pistolCase) {
        // braced in the shoulder: 2-4 cm back at the hands, a 1-2 deg muzzle rise, the chest gives about 1.5 deg
        expect(back).toBeGreaterThan(0.02);
        expect(back).toBeLessThan(0.045);
        expect(rise * DEG).toBeGreaterThan(0.5);
        expect(rise * DEG).toBeLessThan(3);
        expect(chest * DEG).toBeGreaterThan(1);
        expect(chest * DEG).toBeLessThan(2.5);
      } else {
        // held out in the hands: more muzzle flip and lift at the wrists, little chest
        // (the locked arms take the push: less back than the rifle, the lift and flip at the wrists)
        expect(back).toBeGreaterThan(0.005);
        expect(up).toBeGreaterThan(0.01);
        expect(rise * DEG).toBeGreaterThan(2);
        expect(rise * DEG).toBeLessThan(7);
        expect(chest * DEG).toBeLessThan(0.8);
      }
      expect(wrist).toBeGreaterThan(0.015);
      // a kick, not a pop
      expect(jump).toBeLessThan(0.035);
      expect(late).toBeLessThan(0.003);
      expect(lateChest * DEG).toBeLessThan(0.1);
    }
  });
});

describe('anim-n3b: the wall block (PASS2 row 24)', () => {
  /** Walk at 1.4 m/s toward a wall 3 m ahead until the capsule stops 0.3 m off it, hold, then back off. */
  async function approach(aim: number, aimPitch: number) {
    const { rig, rifle, pistol, settle, inRoot, WEAPONS } = await rigWithWeapons();
    pistol.holster(rig, 'thigh');
    rifle.hold(rig);
    const mz = WEAPONS.rifle.muzzle;
    const bore0 = [mz[0], mz[1], mz[2] - 0.5];
    const wallZ = 3;
    const stopAt = 0.3;
    const pose = aimPose({ aim, aimPitch });
    for (let k = 0; k < 150; k++) rig.animate(DT, pose);
    const frames: { block: number; grip: P3; muzzle: P3; bore: number }[] = [];
    let z = 0;
    for (let k = 0; k < 330; k++) {
      // in until stopped, hold to frame 220, then back off
      const v = k < 220 ? (wallZ - z > stopAt ? 1.4 : 0) : -1.4;
      z = Math.min(z + v * DT, wallZ - stopAt);
      rig.root.position.z = z;
      pose.speed = Math.abs(v);
      pose.localZ = v < 0 ? -1 : 1;
      pose.wallBlock = aim > 0.05 ? wallBlockK(wallZ - z) : 0;
      rig.animate(DT, pose);
      settle();
      const m = inRoot(rifle.node, mz);
      const b = inRoot(rifle.node, bore0);
      frames.push({ block: pose.wallBlock, grip: inRoot(rifle.node, WEAPONS.rifle.grip), muzzle: m, bore: Math.atan2(m.y - b.y, Math.hypot(m.x - b.x, m.z - b.z)) });
    }
    return frames;
  }

  for (const [name, aim, aimPitch] of [
    ['aimed level', 1, 0],
    ['aimed up 0.3 rad', 1, 0.3],
    ['aimed down 0.3 rad', 1, -0.3],
    ['low ready', 0, 0],
  ] as const) {
    it(`${name}: one eased move in and out, no stall, no grip jump, the muzzle never above the aim line while blocked`, async () => {
      const f = await approach(aim, aimPitch);
      let jump = 0;
      let longest = 0;
      let maxOver = -Infinity;
      const on = f.findIndex((x) => x.block >= WALL_BLOCK.on);
      const off = on < 0 ? -1 : f.findIndex((x, k) => k > on && x.block <= WALL_BLOCK.off);
      const moveFrames = Math.ceil(WALL_BLOCK.time / DT);
      let run = 0;
      for (let k = 1; k < f.length; k++) {
        const a = f[k - 1]!;
        const b = f[k]!;
        jump = Math.max(jump, dist(a.grip, b.grip));
        const inMove = on >= 0 && ((k > on && k < on + moveFrames - 1) || (off >= 0 && k > off && k < off + moveFrames - 1));
        if (inMove) {
          // the move in / out: the muzzle (body frame) never stands still for 3 frames (0.1 m/s)
          run = dist(a.muzzle, b.muzzle) / DT < 0.1 ? run + 1 : 0;
          longest = Math.max(longest, run);
        } else run = 0;
        // blocked (the move in, the hold, until the release starts): the bore at or under the aim line
        if (on >= 0 && k >= on && (off < 0 || k <= off)) maxOver = Math.max(maxOver, b.bore - aimPitch);
      }
      const held = f[200]!;
      console.info(`wall block ${name}: blocked frames ${on}-${off}, largest grip frame ${(jump * 100).toFixed(2)} cm, longest still run in a move ${longest} frames, bore vs aim line max ${(maxOver * DEG).toFixed(1)} deg, held bore ${(held.bore * DEG).toFixed(1)} deg, muzzle ${held.muzzle.z.toFixed(2)} m ahead`);
      expect(jump).toBeLessThan(0.035);
      if (aim > 0) {
        expect(on).toBeGreaterThan(0);
        expect(off).toBeGreaterThan(on);
        expect(longest).toBeLessThan(3);
        expect(maxOver).toBeLessThan(0.5 / DEG);
        // held: tipped well under the aim line, never muzzle-up, the muzzle short of the wall (0.3 m ahead)
        expect(held.bore - aimPitch).toBeLessThan(-40 / DEG);
        // back off: the raise comes back to the aim
        expect(Math.abs(f[f.length - 1]!.bore - aimPitch)).toBeLessThan(2 / DEG);
      }
    });
  }
});
