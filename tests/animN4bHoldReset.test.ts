/**
 * (N4b train-8 fix) The Body base's hold and carry rows on the real rig (NullEngine CharacterRig, a Wren rig reading the
 * tables), as e2e-chamber's Body block drives them through `__animBase`: a row set on the rig's own hold / carry state
 * moves its pose, and a reset (the generated table loaded again) puts the pose back. A team holder's brace (the bend from
 * the team pose, clips/team.ts) takes neither row: the rows leave it as it was. And the team pose jumps to its phase's
 * weight on a paused scrub (`TeamPoser.jump`), where the ease (dt 0) never moved.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RigPose } from '../src/player/characterRig';
import { ANIM_BASE } from '../src/anim/animBase';
import { animBaseLoad, animBaseNow } from '../src/anim/tuneJointsRig';
import { newTeamPoseIn, TeamPoser } from '../src/anim/clips/team';

const BONES = ['spine', 'neck', 'shoulderR', 'shoulderL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'] as const;
type Q = [number, number, number, number];
const jang = (a: Q, b: Q): number => (2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180) / Math.PI;

interface Run {
  body: string;
  /** Degrees each bone moved: base row set, then after the reset (both from the pose before). */
  set: number[];
  reset: number[];
  hips: [number, number];
}

async function runRows(pose: Partial<RigPose>, rows: Record<string, Record<string, number>>): Promise<Run> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 1.75, 'm0');
  rg.tuneRows = true;
  const p: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', traverse: 'none', traverseT: 0, ...pose };
  const step = (dt: number): void => {
    rg.root.position.set(0, 0, 0);
    rg.root.rotation.y = 0;
    rg.animate(dt, p);
  };
  const snap = (): Q[] => BONES.map((n) => {
    const q = rg[n].rotationQuaternion!;
    return [q.x, q.y, q.z, q.w] as Q;
  });
  const hipsY = (): number => rg.hips.getAbsolutePosition().y - rg.root.position.y;
  // settled, then paused (dt 0) as the chamber's Body block reads it
  for (let f = 0; f < 120; f++) step(1 / 60);
  for (let f = 0; f < 6; f++) step(0);
  const b0 = snap();
  const h0 = hipsY();
  const body = rg.tuneSt!.body;
  const b = animBaseNow();
  for (const [row, ps] of Object.entries(rows)) b.body = { ...b.body, [row]: { ...b.body?.[row], ...ps } };
  animBaseLoad(b);
  for (let f = 0; f < 30; f++) step(0);
  const b1 = snap();
  const h1 = hipsY();
  animBaseLoad(ANIM_BASE);
  for (let f = 0; f < 30; f++) step(0);
  const b2 = snap();
  const h2 = hipsY();
  return { body, set: b0.map((q, i) => jang(q, b1[i]!)), reset: b0.map((q, i) => jang(q, b2[i]!)), hips: [h1 - h0, h2 - h0] };
}

const ROWS = { leanAdd: 0.3, pelvisYAdd: -0.06 };

afterEach(() => {
  animBaseLoad(ANIM_BASE);
  vi.restoreAllMocks();
});

describe('N4b train-8 fix: the Body base reset over the hold and carry rows', () => {
  it('a hold row moves the holding pose and a reset puts every bone back', async () => {
    const r = await runRows({ bend: 0.3, bendDrop: 0.05 }, { hold: ROWS });
    expect(r.body).toBe('hold');
    expect(r.set[0]!).toBeGreaterThan(4);
    expect(r.hips[0]).toBeLessThan(-0.03);
    expect(Math.max(...r.reset)).toBeLessThan(0.1);
    expect(Math.abs(r.hips[1])).toBeLessThan(1e-6);
  }, 30000);

  it('a carry row moves the carrying pose and a reset puts every bone back', async () => {
    const r = await runRows({ bend: 0.25, bendDrop: 0.05, carryBody: true, speed: 0.6 }, { carry: ROWS });
    expect(r.body).toBe('carry');
    expect(r.set[0]!).toBeGreaterThan(4);
    expect(Math.max(...r.reset)).toBeLessThan(0.1);
    expect(Math.abs(r.hips[1])).toBeLessThan(1e-6);
  }, 30000);

  it("a team holder's brace takes neither row (no Body group)", async () => {
    const r = await runRows({ bend: 0.22, bendDrop: -0.05, crouch: 1, traverse: 'brace' }, { hold: ROWS, carry: ROWS });
    expect(r.body).toBe('');
    expect(Math.max(...r.set)).toBeLessThan(0.1);
    expect(Math.max(...r.reset)).toBeLessThan(0.1);
  }, 30000);
});

describe('N4b train-8 fix: the team pose on a paused scrub', () => {
  it('jumps to the weight its input wants (on: 1, off: 0) where the dt-0 ease never moves', () => {
    const tp = new TeamPoser();
    const i = newTeamPoseIn();
    const pose = { bend: 0, bendDrop: 0, sway: 0 };
    const t = () => ({ x: 0, y: 0, z: 0, w: 0 });
    const rig = { reachL: t(), reachR: t(), plantR: t(), root: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }, height: 1.75 };
    i.move = 'boost';
    i.role = 'b';
    i.k = -1;
    tp.begin(4 / 60, i, pose, rig);
    tp.end(rig);
    const eased = tp.w;
    expect(eased).toBeGreaterThan(0);
    expect(eased).toBeLessThan(1);
    // paused: dt 0 leaves the ease where it was; the jump puts it at the phase's weight
    tp.begin(0, i, pose, rig);
    tp.end(rig);
    expect(tp.w).toBe(eased);
    tp.jump(i);
    pose.bend = 0;
    tp.begin(0, i, pose, rig);
    tp.end(rig);
    expect(tp.w).toBe(1);
    expect(pose.bend).toBeGreaterThan(0.15);
    // past the move (no team pose): off at once, not the last pose held at its weight
    i.move = '';
    i.role = '';
    tp.jump(i);
    pose.bend = 0;
    tp.begin(0, i, pose, rig);
    tp.end(rig);
    expect(tp.w).toBe(0);
    expect(pose.bend).toBe(0);
  });
});
