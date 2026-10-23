/**
 * (mt2-guardgate, CHECK-6 Required 1) The mocap switch is Wren's (BRIEF M4, the Settings label): guards
 * (`buildEnemyRig`, host guards and co-op guard puppets, `CharacterRig.carrier` false) keep the hand-keyed set and the
 * planner's feet whatever the switch says. Before the gate a patrol walk with the switch on took the mocap walk and its
 * clip feet (keyMocap 0.80, joints 22-30 cm off the OFF pose, 76 cm in a walking turn; 17 / 64 guard fixture hashes
 * moved). Pins: the guard identity fixture with the switch on (64 / 64), a guard bit-identical ON vs OFF through a
 * patrol walk, a walking turn, walk and jog stops and a switch flipped mid-walk (no clip feet, keyMocap 0), and a
 * carrier on the same build still taking the mocap set (the gate is the carrier flag, not the build).
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCO, setMocapLocomotion } from '../src/anim/mocap';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { runGuardIdentity, type GuardFixture } from './helpers/animSkeletonGuardIdentity';

const FIXTURE = 'tests/fixtures/anim-skeleton-guard-identity.json';
const DT = 1 / 60;
const J = ['root', 'hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR'] as const;

/** A frame's pose (returns the yaw rate, rad/s). */
type Sc = (k: number, p: RigPose) => number;
const facing = (p: RigPose, speed: number): void => {
  p.speed = speed;
  p.localZ = speed > 0 ? 1 : 0;
  p.aim = 0.2;
  p.stride = 'facing';
};
const SCENARIOS: Record<string, [Sc, number]> = {
  'patrol walk 1.4': [(_k, p) => { facing(p, 1.4); return 0; }, 180],
  'walk 1.4 then stop': [(k, p) => { facing(p, k < 90 ? 1.4 : Math.max(0, 1.4 - (k - 90) * 0.1)); return 0; }, 180],
  'walk 1.4 turning 2 rad/s': [(k, p) => { facing(p, 1.4); return k > 60 && k < 120 ? 2 : 0; }, 180],
  'jog 3.0 then stop': [(k, p) => { facing(p, k < 90 ? 3 : Math.max(0, 3 - (k - 90) * 0.15)); return 0; }, 180],
  'run 5.0 then stop': [(k, p) => { facing(p, k < 90 ? 5 : Math.max(0, 5 - (k - 90) * 0.5)); return 0; }, 150],
};

/** Switch schedule: on for every frame, or flipped on at 60 and off at 120 (the toggle's cross-fade path). */
type Sw = 'off' | 'on' | 'flip';

async function drive(kind: string, sc: Sc, steps: number, sw: Sw, carrier = false) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const vals: number[] = [];
  let keyMocap = 0;
  let clipFeet = 0;
  try {
    setMocapLocomotion(sw === 'on');
    const { rig, gun } = buildEnemyRig(scene, world as never, ENEMIES[kind as 'grunt'], `g-${kind}`);
    // (the control: a carrier with nothing in hand, the player's holstered free gait as mocapSwitch drives it)
    rig.carrier = carrier;
    if (carrier) rig.heldWeapon = null;
    const nodes = J.map((j) => (rig as unknown as Record<string, CharacterRig['hips']>)[j]!);
    const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.2, kick: 0 };
    let yaw = 0;
    for (let k = 0; k < steps; k++) {
      if (sw === 'flip' && (k === 60 || k === 120)) setMocapLocomotion(k === 60);
      yaw += sc(k, p) * DT;
      rig.root.rotation.y = yaw;
      rig.root.position.x += Math.sin(yaw) * p.speed * DT;
      rig.root.position.z += Math.cos(yaw) * p.speed * DT;
      p.velX = Math.sin(yaw) * p.speed;
      p.velZ = Math.cos(yaw) * p.speed;
      rig.animate(DT, p);
      for (const n of nodes) {
        const m = n.computeWorldMatrix(true).m;
        for (let i = 0; i < 16; i++) vals.push(m[i]!);
      }
      keyMocap = Math.max(keyMocap, rig.graph.out.keyMocap);
      if ((rig as unknown as { pin: { clipFeet: unknown } }).pin.clipFeet) clipFeet++;
    }
    gun?.dispose();
    rig.dispose();
  } finally {
    Math.random = random;
    scene.dispose();
    setMocapLocomotion(false);
  }
  return { vals, keyMocap, clipFeet };
}

/** Values that differ (bit for bit; -0 as +0) and the largest difference. */
function diff(a: number[], b: number[]): { n: number; max: number } {
  let n = 0;
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i] || (Number.isNaN(a[i]) && Number.isNaN(b[i]))) continue;
    n++;
    max = Math.max(max, Math.abs(a[i]! - b[i]!));
  }
  return { n, max };
}

describe('mt2-guardgate: guards keep the hand-keyed set with the mocap switch on', () => {
  afterEach(() => setMocapLocomotion(false));

  it('the guard identity fixture with the switch on: 64 / 64', async () => {
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as GuardFixture;
    setMocapLocomotion(true);
    let got: GuardFixture;
    try {
      got = await runGuardIdentity();
      expect(LOCO.mocap).toBe(true);
    } finally {
      setMocapLocomotion(false);
    }
    expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
    expect(Object.keys(got).length).toBeGreaterThanOrEqual(8 * 8);
    const moved = Object.keys(want).filter((id) => got[id]!.rig !== want[id]!.rig || got[id]!.steps !== want[id]!.steps);
    expect(moved, `${moved.length} / ${Object.keys(want).length} moved`).toEqual([]);
  }, 900_000);

  it('a guard ON (and flipped mid-walk) is bit-identical to OFF: patrol walk, turn, stops', async () => {
    const rows: string[] = [];
    for (const kind of ['grunt', 'heavy', 'officer']) {
      for (const [name, [sc, n]] of Object.entries(SCENARIOS)) {
        const off = await drive(kind, sc, n, 'off');
        for (const sw of ['on', 'flip'] as const) {
          const got = await drive(kind, sc, n, sw);
          const d = diff(off.vals, got.vals);
          rows.push(`${kind} ${name} ${sw}: ${d.n} differ (max ${d.max}), keyMocap ${got.keyMocap}, clip feet ${got.clipFeet}`);
          expect(got.vals.length, `${kind} ${name} ${sw}`).toBe(off.vals.length);
          expect(d.n, `${kind} ${name} ${sw}: max ${d.max}`).toBe(0);
          expect(got.keyMocap, `${kind} ${name} ${sw}`).toBe(0);
          expect(got.clipFeet, `${kind} ${name} ${sw}`).toBe(0);
        }
      }
    }
    expect(rows.length).toBe(3 * Object.keys(SCENARIOS).length * 2);
  }, 900_000);

  it('a carrier on the same build still takes the mocap set (the gate is the carrier flag)', async () => {
    const [sc, n] = SCENARIOS['patrol walk 1.4']!;
    const off = await drive('grunt', sc, n, 'off', true);
    const on = await drive('grunt', sc, n, 'on', true);
    expect(on.keyMocap).toBeGreaterThan(0.5);
    expect(on.clipFeet).toBeGreaterThan(0);
    expect(diff(off.vals, on.vals).max).toBeGreaterThan(0.05);
  }, 900_000);
});
