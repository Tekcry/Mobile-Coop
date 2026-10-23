// Guard base body check (scripts/operators/guardBodyCheck.mjs, guard-models G1): a bodies job's report against the
// contract (PLAN G1 checks, PLAN 5 bones / influences, SPEC 1 kind scale, SPEC 7 neck seam).
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as chk from '../scripts/operators/guardBodyCheck.mjs';
// @ts-expect-error plain .mjs build script without types
import * as gj from '../scripts/operators/guardJoints.mjs';

type Report = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const check = chk.checkGuardBody as (r: Report, kit: unknown, heights?: Record<string, number>) => string[];

const RIG = ['root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
  'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'toeL', 'toeR', 'clavL', 'clavR'];
const FINGERS = [1, 2, 3, 4, 5].flatMap((f) => [`fingerL_${f}`, `fingerR_${f}`]);
/** The parts of guards.json the check reads (slice G0's values). */
const KIT = {
  bases: [
    { id: 'average', refHeight: 1.77, build: 'average', kinds: ['grunt', 'droneOp', 'officer'] },
    { id: 'lean', refHeight: 1.76, build: 'lean', kinds: ['runner', 'sniper'] },
    { id: 'broad', refHeight: 1.825, build: 'broad', kinds: ['heavy', 'enforcer'] },
  ],
  bones: { rig: RIG, fingers: FINGERS, fingerParent: { fingerL: 'wrL', fingerR: 'wrR' }, influences: [4, 4, 2] },
  face: { neckSeam: { joint: 'neck', at: 0.45, blendLoops: 2 } },
};
const HEIGHTS = { grunt: 1.77, runner: 1.74, heavy: 1.83, sniper: 1.78, enforcer: 1.82, droneOp: 1.75, officer: 1.8 };

/** A report as build_guard_body.py writes it, passing every check. */
function report(baseId = 'average'): Report {
  const base = KIT.bases.find((b) => b.id === baseId)!;
  const g = gj.guardJoints(base) as { joints: { name: string; pos: number[] }[]; hitVolumes: Record<string, number> };
  const target = { stature: base.refHeight, hipW: 0.354, chestGirth: 1.064, shoulderWidth: 0.515, neckGirth: 0.401 };
  const order = g.joints.map((j) => j.name);
  return {
    base: baseId, refHeight: base.refHeight, build: base.build, tris: 18568, vertices: 9306, seconds: 5,
    bones: 33, boneNames: [...order, ...FINGERS], maxInfluences: 4, unweightedVerts: 0, deformCheck: { maxMove: 0.66 },
    jointRoundTripMaxError: 5e-8, boneLengthMaxError: 1e-16,
    rigRestJoints: Object.fromEntries(g.joints.map((j) => [j.name, j.pos])), hitVolumes: g.hitVolumes,
    target, measured: { ...target, stature: base.refHeight - 0.0045 },
    errorsMm: { stature: -4.45, hipW: 0, chestGirth: 0, shoulderWidth: 0, neckGirth: 0 },
    lodBones: {
      lod0: [...order, ...FINGERS], lod1: order, lod2: order,
      fold: Object.fromEntries(FINGERS.map((f) => [f, f.startsWith('fingerL') ? 'wrL' : 'wrR'])), influences: [4, 4, 2],
    },
    neckSeam: {
      at: 0.45, mhVerts: Array.from({ length: 42 }, (_, i) => 1000 + i), bodyVerts: Array.from({ length: 42 }, (_, i) => i),
      rings: { '-2': [1], '-1': [2], 0: [3], 1: [4], 2: [5] },
    },
  };
}

describe('guard body check', () => {
  it('passes a report that meets the contract, for every base and its kinds', () => {
    for (const b of KIT.bases) expect(check(report(b.id), KIT, HEIGHTS)).toEqual([]);
  });

  it('refuses bones off the PLAN 5 count, a missing finger, face bones, or a LOD that keeps the fingers', () => {
    const r = report();
    r.bones = 34;
    r.boneNames = [...r.boneNames.filter((n: string) => n !== 'fingerR_5'), 'jaw'];
    r.lodBones.lod1 = [...r.lodBones.lod1, 'fingerL_1'];
    r.lodBones.fold.fingerL_2 = 'elL';
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/34 bones, want 33/);
    expect(p).toMatch(/bones missing: fingerR_5/);
    expect(p).toMatch(/not in the kit: jaw/);
    expect(p).toMatch(/lod1 must keep exactly the 23/);
    expect(p).toMatch(/fingerL_2 folds into elL, want wrL/);
  });

  it('refuses more than 4 influences, unweighted vertices, a joint round trip at 0.1 mm', () => {
    const r = report();
    r.maxInfluences = 5;
    r.unweightedVerts = 3;
    r.jointRoundTripMaxError = 1e-4;
    expect(check(r, KIT)).toEqual(expect.arrayContaining([
      '5 influences, limit 4', '3 unweighted vertices', 'joint round trip 0.0001 m',
    ]));
  });

  it('refuses rig joints or hit volumes that are not the game rig at the base height and build', () => {
    const r = report('broad');
    r.rigRestJoints.knL = [r.rigRestJoints.knL[0], r.rigRestJoints.knL[1] + 0.001, r.rigRestJoints.knL[2]];
    r.hitVolumes = { ...r.hitVolumes, headR: r.hitVolumes.headR + 0.01 };
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/rig rest knL/);
    expect(p).toMatch(/hit volume headR/);
  });

  it('allows the stature 12 mm (not solved) and every other dimension 10 mm', () => {
    const r = report();
    r.measured.stature = r.target.stature - 0.011;
    r.measured.chestGirth = r.target.chestGirth + 0.0099;
    expect(check(r, KIT)).toEqual([]);
    r.measured.stature = r.target.stature - 0.013;
    r.measured.neckGirth = Number.NaN;
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/stature .*limit 12 mm/);
    expect(p).toMatch(/neckGirth NaN/);
  });

  it('checks the neck seam: a closed loop, the five blend rings, the kit seam height', () => {
    const r = report();
    r.neckSeam.rings['2'] = [];
    r.neckSeam.at = 0.5;
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/ring 2 empty/);
    expect(p).toMatch(/at 0.5 != kit 0.45/);
    r.neckSeam.mhVerts = [1, 2, 3];
    expect(check(r, KIT).join('\n')).toMatch(/loop missing/);
  });

  it('checks every kind of a base scales within 2 % of its reference height (SPEC 1, A2)', () => {
    expect(check(report('broad'), KIT, { ...HEIGHTS, heavy: 1.87 }).join('\n')).toMatch(/heavy 1.87 m scales 2.5 %/);
    expect(check(report('lean'), KIT, { sniper: 1.78 }).join('\n')).toMatch(/kind runner: no height/);
  });

  it('refuses a base that is not in the kit or does not match it', () => {
    expect(check({ ...report(), base: 'huge' }, KIT)).toEqual(['base "huge" is not in the kit']);
    expect(check({ ...report(), refHeight: 1.8 }, KIT).join('\n')).toMatch(/refHeight 1.8 != kit 1.77/);
  });

  it('summarises a report in one line for the bake log', () => {
    expect(chk.summary(report())).toMatch(/^average: 18568 tris, 9306 verts, 33 bones, 4 influences, stature 1.766 m \(-4.45 mm\)/);
  });
});
