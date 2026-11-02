// (anim-n4c, AUDIT row 29) The weapon changing hands (the left-shoulder aim swap, the open-left wall edge) on the real
// rig maths (NullEngine, a Wren rig: her hands, the rifle and pistol grip data): sampled every frame through the swap and
// back. Before (4.57.0): the bore stayed under the aim line, but the gun crossed at face height, the stock end 5-18 cm
// above the head joint, through the head and the top of the trunk; the body clearance pushed it 0.27-0.31 m and flipped
// it to the other side in one frame at the centre line (grip 28-41 cm in a frame): the rifle swung up round the head.
import { describe, expect, it } from 'vitest';
import type { RigPose } from '../src/player/characterRig';
import { HAND_SWAP, handSwapK } from '../src/anim/handSwapPath';
import { TUNABLES } from '../src/anim/tune';
import { BAKE_RULES } from '../src/anim/tuneBakeTable';

const DT = 1 / 60;
const DEG = 180 / Math.PI;
type P3 = { x: number; y: number; z: number };
const dist = (a: P3, b: P3): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

async function wrenRig(weapon: 'rifle' | 'pistolSd') {
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
  // as operatorRig (playerFigure.ts): Wren's build and hands, a Wren rig (`tuneRows`) and a carrier (the drawn keyed set)
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'n4c', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
  rig.backMount = WREN_BACK_MOUNT as unknown as typeof rig.backMount;
  rig.tuneRows = true;
  rig.carrier = true;
  const def = WEAPONS[weapon];
  const gun = new WeaponModel(scene, lib, def, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  gun.hold(rig);
  const settle = (): void => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  };
  const inv = new Matrix();
  /** A point of a node's local space in the rig root's frame (+y up, +z forward). */
  const inRoot = (node: { getWorldMatrix(): typeof inv }, p: readonly number[]): P3 => {
    rig.root.getWorldMatrix().invertToRef(inv);
    return Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(p[0], p[1], p[2]), node.getWorldMatrix()), inv);
  };
  const span = (rig as unknown as { gunSpan: { z0: number; bore: number } }).gunSpan;
  const mz = def.muzzle;
  const back = [mz[0], mz[1], mz[2] - 0.5];
  /** The bore (pitch above level, rad; its forward share), the grip, the stock end and the head joint (root frame). */
  const sample = () => {
    settle();
    const m = inRoot(gun.node, mz);
    const b = inRoot(gun.node, back);
    const dx = m.x - b.x;
    const dy = m.y - b.y;
    const dz = m.z - b.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { pitch: Math.asin(dy / len), fwd: dz / len, grip: inRoot(gun.node, def.grip), stock: inRoot(gun.node, [0, span.bore, span.z0]), head: inRoot(rig.headNode, [0, 0, 0]), s: rig.handSwap };
  };
  return { scene, rig, sample };
}

const aimedPose = (o: Partial<RigPose> = {}): RigPose => ({
  speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0,
  carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true, ...o,
});
/** At a left wall end, the gun out and lowered (aiming leaves the wall), peeking: the weapon goes to the left hand. */
const wallEdgePose = (): RigPose => aimedPose({ aim: 0, wall: true, wallSide: -1, wallNx: 0, wallNz: 1, wallFace: -0.35, lean: -0.3 });

/** Settle, switch to the left hand, then back, sampling every frame. */
async function swapRun(weapon: 'rifle' | 'pistolSd', pose: RigPose) {
  const { scene, rig, sample } = await wrenRig(weapon);
  for (let k = 0; k < 150; k++) rig.animate(DT, pose);
  const rest = sample();
  const frames: ReturnType<typeof sample>[] = [];
  for (const left of [true, false]) {
    rig.openLeft = left;
    for (let k = 0; k < 40; k++) {
      rig.animate(DT, pose);
      frames.push(sample());
    }
  }
  scene.dispose();
  return { rest, frames };
}

describe('anim-n4c: the hand swap passes low across the chest (AUDIT row 29)', () => {
  it('the envelope: 0 at both ends, 1 at the mid-point, eased, continuous through a reversal (s -> 1 - s)', () => {
    expect(handSwapK(-1)).toBe(0);
    expect(handSwapK(0)).toBe(0);
    expect(handSwapK(1)).toBeLessThan(1e-12);
    expect(handSwapK(0.5)).toBeCloseTo(1, 12);
    for (const s of [0.1, 0.27, 0.43]) expect(handSwapK(1 - s)).toBeCloseTo(handSwapK(s), 12);
    // zero rate at the ends (no kick on the first frame)
    expect(handSwapK(0.01)).toBeLessThan(0.0011);
  });

  it('the Gun section slider and its bake rule (identity 1 = HAND_SWAP as coded)', () => {
    const t = TUNABLES.find((x) => x.id === 'swapDropMul');
    expect(t?.def).toBe(1);
    expect(t?.kind).toBe('mul');
    const r = BAKE_RULES.filter((x) => x.id === 'swapDropMul');
    expect(r.length).toBe(1);
    expect(r[0]!.edits.map((e) => e.path).sort()).toEqual(['HAND_SWAP.drop', 'HAND_SWAP.fwd']);
    expect(HAND_SWAP.drop).toBeGreaterThan(0);
    expect(HAND_SWAP.fwd).toBeGreaterThan(0);
  });

  for (const [weapon, name, pose] of [
    ['rifle', 'shoulder swap, aimed level', aimedPose()],
    ['rifle', 'shoulder swap, aimed up 0.3 rad', aimedPose({ aimPitch: 0.3 })],
    ['rifle', 'shoulder swap, aimed down 0.4 rad', aimedPose({ aimPitch: -0.4 })],
    ['pistolSd', 'shoulder swap, pistol aimed level', aimedPose({ weight: 0.7 })],
    ['rifle', 'wall edge left, lowered', wallEdgePose()],
  ] as const) {
    it(`${name}: the muzzle never above the aim line or back, the stock under the chin, one eased move`, async () => {
      const { rest, frames } = await swapRun(weapon, pose);
      const aimed = (pose.aim ?? 0) > 0.5;
      // the line the muzzle may not rise above: the aim line aimed, the rest pose's bore lowered
      const line = aimed ? pose.aimPitch : rest.pitch;
      let maxOver = -Infinity;
      let minFwd = Infinity;
      let stockOverHead = -Infinity;
      let jump = 0;
      let still = 0;
      let longestStill = 0;
      for (let k = 0; k < frames.length; k++) {
        const f = frames[k]!;
        maxOver = Math.max(maxOver, f.pitch - line);
        minFwd = Math.min(minFwd, f.fwd);
        if (f.s > 0.25 && f.s < 0.75) stockOverHead = Math.max(stockOverHead, f.stock.y - f.head.y);
        if (k > 0) {
          const step = dist(f.grip, frames[k - 1]!.grip);
          jump = Math.max(jump, step);
          // inside the swap the grip keeps moving (no stall: 3 frames under 0.1 m/s)
          if (f.s > 0.1 && f.s < 0.9) {
            still = step / DT < 0.1 ? still + 1 : 0;
            longestStill = Math.max(longestStill, still);
          } else still = 0;
        }
      }
      const end = frames[frames.length - 1]!;
      console.info(`hand swap ${name}: bore vs line max ${(maxOver * DEG).toFixed(1)} deg, forward share min ${minFwd.toFixed(2)}, stock vs head joint mid-swap ${(stockOverHead * 100).toFixed(0)} cm, largest grip frame ${(jump * 100).toFixed(1)} cm, longest still run ${longestStill}`);
      expect(maxOver).toBeLessThan(2 / DEG);
      expect(minFwd).toBeGreaterThan(0.45);
      expect(longestStill).toBeLessThan(3);
      // no pop at the centre line (before: 28-41 cm in a frame)
      expect(jump).toBeLessThan(0.15);
      if (aimed) {
        // the stock passes under the chin (before: 5-18 cm above the head joint)
        expect(stockOverHead).toBeLessThan(-0.03);
        // and back on the aim line in the first hand
        expect(Math.abs(end.pitch - pose.aimPitch)).toBeLessThan(2 / DEG);
      }
    });
  }
});

// (rig-pose-fix S7, audit G15) The weapon swap holds on a sim hand-switch clock (`PlayerWeapons.hand`), not on the rig's
// eased blend (`rig.weaponHand` / `rig.handSwitching`, render rate). The rig eases its own copy with the same maths and
// target, so the drawn switch is unchanged.
describe('rig-pose-fix S7: the hand switch runs on a sim clock the rig follows (G15)', () => {
  it('at 60 fps the rig and the sim clock agree every frame: a switch, a reversal mid-switch and back', async () => {
    const { HandSwitch } = await import('../src/player/handSwitch');
    const { rig, scene } = await wrenRig('rifle');
    const pose = aimedPose();
    for (let k = 0; k < 30; k++) rig.animate(DT, pose);
    const sim = new HandSwitch();
    // left, a reversal at 6 frames (mid-switch), then left again and settled
    const plan: boolean[] = [];
    for (let k = 0; k < 6; k++) plan.push(true);
    for (let k = 0; k < 30; k++) plan.push(false);
    for (let k = 0; k < 30; k++) plan.push(true);
    let switching = 0;
    for (const left of plan) {
      rig.openLeft = left;
      rig.animate(DT, pose);
      sim.step(DT, rig.openLeft);
      expect(sim.swap).toBe(rig.handSwap);
      expect(sim.hand).toBe(rig.weaponHand);
      expect(sim.switching).toBe(rig.handSwitching);
      if (sim.switching) switching++;
    }
    expect(switching).toBeGreaterThan(20);
    expect(sim.hand).toBe(-1);
    expect(sim.switching).toBe(false);
    scene.dispose();
  });

  it('the sim clock ends a switch on time whatever the render rate: the rig at 30 / 144 fps within one render frame of it', async () => {
    const { HandSwitch, EDGE_HAND_TIME } = await import('../src/player/handSwitch');
    const ends: number[] = [];
    for (const dt of [1 / 60, 1 / 30, 1 / 144]) {
      const c = new HandSwitch();
      let t = 0;
      c.step(dt, true);
      t += dt;
      while (c.switching) {
        c.step(dt, true);
        t += dt;
      }
      expect(c.hand).toBe(-1);
      expect(c.blend).toBe(1);
      ends.push(t);
      expect(Math.abs(t - EDGE_HAND_TIME)).toBeLessThanOrEqual(dt + 1e-9);
    }
    // the sim's (1/60) and a 30 fps rig's end within one 30 fps frame
    expect(Math.abs(ends[0]! - ends[1]!)).toBeLessThanOrEqual(1 / 30 + 1e-9);
  });
});
