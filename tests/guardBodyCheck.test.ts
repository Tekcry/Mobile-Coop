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
const FINGERS = [1, 2, 3, 4, 5].flatMap((f) => [`fingerL_${f}_1`, `fingerR_${f}_1`]);
/** The average base's right hand as the bake builds it (guard_body.fingers(), game frame); the left mirrors x. */
const HAND_R: Record<number, { head: number[]; tail: number[]; zAxis: number[] }> = {
  1: { head: [0.524, 1.0508, 0.2236], tail: [0.479, 1.0129, 0.3033], zAxis: [-0.81, 0.5535, -0.1936] },
  2: { head: [0.5521, 1.0194, 0.2775], tail: [0.5496, 0.968, 0.3366], zAxis: [0.562, -0.6355, -0.5294] },
  3: { head: [0.5705, 1.0063, 0.2583], tail: [0.5794, 0.9349, 0.3146], zAxis: [0.4503, -0.5176, -0.7276] },
  4: { head: [0.5792, 0.997, 0.2396], tail: [0.5952, 0.9248, 0.2802], zAxis: [0.3425, -0.4019, -0.8492] },
  5: { head: [0.5809, 0.9859, 0.2185], tail: [0.5911, 0.9314, 0.2402], zAxis: [0.2614, -0.3141, -0.9127] },
};
const PALM_R = [-0.7412, -0.6711, 0.0187];
const mirror = (v: number[]) => [-v[0]!, v[1]!, v[2]!];
function fingerBones(): Record<string, Record<string, number[] | string>> {
  const out: Record<string, Record<string, number[] | string>> = {};
  for (const [f, b] of Object.entries(HAND_R)) {
    out[`fingerR_${f}_1`] = { ...b, palm: PALM_R, parent: 'wrR' };
    out[`fingerL_${f}_1`] = { head: mirror(b.head), tail: mirror(b.tail), zAxis: mirror(b.zAxis), palm: mirror(PALM_R), parent: 'wrL' };
  }
  return out;
}
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
    base: baseId, refHeight: base.refHeight, height: base.refHeight, build: base.build, tris: 18568, vertices: 9306, seconds: 5,
    fingerBones: fingerBones(), fingerAxes: { thumbFlexDot: { fingerL_1_1: 0.9946, fingerR_1_1: 0.9946 } },
    bindJoints: { handL: [-0.6, 0.95, 0.3], handR: [0.6, 0.95, 0.3] },
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
    r.boneNames = [...r.boneNames.filter((n: string) => n !== 'fingerR_5_1'), 'jaw'];
    r.lodBones.lod1 = [...r.lodBones.lod1, 'fingerL_1_1'];
    r.lodBones.fold.fingerL_2_1 = 'elL';
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/34 bones, want 33/);
    expect(p).toMatch(/bones missing: fingerR_5_1/);
    expect(p).toMatch(/not in the kit: jaw/);
    expect(p).toMatch(/lod1 must keep exactly the 23/);
    expect(p).toMatch(/fingerL_2_1 folds into elL, want wrL/);
  });

  it('fingers: Wren\'s names, and src/anim/fingers.ts closes each finger toward the palm on both hands', () => {
    expect(chk.checkFingerAxes(report())).toEqual([]);
    // G1's first roll (Z to the back of the hand, curl about X): fingers.ts would swing them sideways
    const r = report();
    for (const b of Object.values(r.fingerBones) as { palm: number[]; zAxis: number[] }[]) b.zAxis = b.palm.map((x) => -x);
    const p = chk.checkFingerAxes(r).join('\n');
    expect(p).toMatch(/zAxis not normal to the bone|toward the palm/);
    // the roll flipped (Blender's own +Z on the right hand): the curl opens the hand
    const f = report();
    for (const b of Object.values(f.fingerBones) as { zAxis: number[] }[]) b.zAxis = b.zAxis.map((x) => -x);
    expect(chk.checkFingerAxes(f).join('\n')).toMatch(/fingerR_3_1: a curl moves the tip -\d.\d+ toward the palm/);
    // the old names (one bone, no segment): fingerRig would find none
    const o = report();
    o.fingerBones = Object.fromEntries(Object.entries(o.fingerBones).map(([k, v]) => [k.replace(/_1$/, ''), v]));
    expect(chk.checkFingerAxes(o).join('\n')).toMatch(/not in Wren's scheme/);
    const t = report();
    t.fingerAxes.thumbFlexDot.fingerR_1_1 = 0.5;
    expect(check(t, KIT).join('\n')).toMatch(/fingerR_1_1: THUMB_AXES\[0\] off/);
  });

  it('G2 reads height and the fingertip ends from bindJoints', () => {
    const r = report();
    delete r.height;
    delete r.bindJoints.handR;
    const p = check(r, KIT).join('\n');
    expect(p).toMatch(/height undefined != refHeight 1.77/);
    expect(p).toMatch(/bindJoints.handR missing/);
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
