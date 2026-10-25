// (mixamo-retarget M2, docs/mixamo-retarget/PLAN.md M2) The Mixamo bone map: every Wren joint the retarget drives has a
// slot and the Mixamo bone the plan names (A6 spine split), every segment ends at a child bone's head, the CMU names
// analyze.mjs reads exist, any `mixamorig<N>:` prefix (or none) resolves, a missing or re-parented bone is an error, and
// missing fingers / end bones fall back without breaking the chain.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as mapMod from '../scripts/mocap/mixamoMap.mjs';
// @ts-expect-error plain .mjs build script without types
import * as retargetMod from '../scripts/mocap/retarget.mjs';

interface SlotDef { rot: string; end: string | null; parent: string | null; kind: string; extend?: number }
interface Slot extends SlotDef { slot: string }
interface Resolved { prefix: string; full: Map<string, string>; parent: Map<string, string | null>; missingFingers: string[]; missingEnds: string[]; unknown: string[] }
interface BoneIn { name: string; parent: string | null }
const M = mapMod as {
  MIXAMO_MAP: Record<string, SlotDef>;
  MIXAMO_TO_SLOT: Record<string, string>;
  MIXAMO_REQUIRED: string[];
  MIXAMO_ALL: string[];
  MIXAMO_ENDS: string[];
  resolveMixamoBones: (b: BoneIn[]) => Resolved;
  mixamoSlots: (r: Resolved) => Slot[];
  baseName: (n: string) => string;
};
const R = retargetMod as {
  MAP: Record<string, string>;
  SEG_END: Record<string, string>;
  wrenRig: () => { names: string[] };
};

/** The standard 65-bone Mixamo hierarchy (child -> parent), base names. */
function hierarchy(): [string, string | null][] {
  const h: [string, string | null][] = [['Hips', null], ['Spine', 'Hips'], ['Spine1', 'Spine'], ['Spine2', 'Spine1'], ['Neck', 'Spine2'], ['Head', 'Neck'], ['HeadTop_End', 'Head']];
  for (const S of ['Left', 'Right']) {
    h.push([`${S}Shoulder`, 'Spine2'], [`${S}Arm`, `${S}Shoulder`], [`${S}ForeArm`, `${S}Arm`], [`${S}Hand`, `${S}ForeArm`]);
    for (const F of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 4; k++) h.push([`${S}Hand${F}${k}`, k === 1 ? `${S}Hand` : `${S}Hand${F}${k - 1}`]);
    h.push([`${S}UpLeg`, 'Hips'], [`${S}Leg`, `${S}UpLeg`], [`${S}Foot`, `${S}Leg`], [`${S}ToeBase`, `${S}Foot`], [`${S}Toe_End`, `${S}ToeBase`]);
  }
  return h;
}
const bones = (prefix = 'mixamorig:', drop: string[] = []): BoneIn[] =>
  hierarchy().filter(([n]) => !drop.includes(n)).map(([n, p]) => ({ name: prefix + n, parent: p === null ? null : prefix + p }));

describe('MIXAMO_MAP', () => {
  it('covers the standard 65-bone skeleton', () => {
    expect(hierarchy().length).toBe(65);
    expect(new Set(M.MIXAMO_ALL)).toEqual(new Set(hierarchy().map(([n]) => n)));
    expect(M.MIXAMO_REQUIRED.length).toBe(22);
  });

  it('maps every Wren joint the retarget drives, to the bones the plan names (A6 spine split)', () => {
    const rig = R.wrenRig();
    for (const j of rig.names) {
      if (['root', 'body', 'handL', 'handR'].includes(j)) continue; // identity / follow the wrist (retarget.mjs)
      const slot = R.MAP[j];
      expect(slot, j).toBeTypeOf('string');
      expect(M.MIXAMO_MAP[slot!], `${j} -> ${slot}`).toBeDefined();
    }
    const want: Record<string, string> = {
      pelvis: 'Hips', spine: 'Spine1', chest: 'Spine2', neck: 'Neck', head: 'Head',
      shL: 'LeftArm', elL: 'LeftForeArm', wrL: 'LeftHand', shR: 'RightArm', elR: 'RightForeArm', wrR: 'RightHand',
      hipL: 'LeftUpLeg', knL: 'LeftLeg', anL: 'LeftFoot', toeL: 'LeftToeBase', hipR: 'RightUpLeg', knR: 'RightLeg', anR: 'RightFoot', toeR: 'RightToeBase',
    };
    for (const [j, b] of Object.entries(want)) expect(M.MIXAMO_MAP[R.MAP[j]!]!.rot, j).toBe(b);
    expect(M.MIXAMO_TO_SLOT.Spine).toBe('lowerback');
    expect(M.MIXAMO_TO_SLOT.LeftShoulder).toBe('lclavicle');
    expect(M.MIXAMO_TO_SLOT.RightHandIndex2).toBe('rindex2');
  });

  it('ends every driven segment at the child bone head (never a tail)', () => {
    const end: Record<string, string> = {
      spine: 'Spine2', chest: 'Neck', neck: 'Head', shL: 'LeftForeArm', elL: 'LeftHand', wrL: 'LeftHandMiddle1',
      shR: 'RightForeArm', elR: 'RightHand', wrR: 'RightHandMiddle1', hipL: 'LeftLeg', knL: 'LeftFoot', anL: 'LeftToeBase',
      hipR: 'RightLeg', knR: 'RightFoot', anR: 'RightToeBase',
    };
    expect(Object.keys(end).sort()).toEqual(Object.keys(R.SEG_END).sort());
    for (const [j, b] of Object.entries(end)) expect(M.MIXAMO_MAP[R.MAP[j]!]!.end, j).toBe(b);
    expect(M.MIXAMO_MAP.ltoes!.end).toBe('LeftToe_End');
    expect(M.MIXAMO_MAP.head!.end).toBe('HeadTop_End');
    expect(M.MIXAMO_MAP.lhipjoint!.end).toBe('LeftUpLeg');
    expect(M.MIXAMO_MAP.rhipjoint!.end).toBe('RightUpLeg');
  });

  it('has every CMU name retarget.mjs and analyze.mjs read, parents before children', () => {
    const cmu = ['root', 'lhipjoint', 'rhipjoint', 'lowerback', 'upperback', 'thorax', 'lowerneck', 'upperneck', 'head',
      'lclavicle', 'rclavicle', 'lhumerus', 'lradius', 'rhumerus', 'rradius', 'lfemur', 'ltibia', 'lfoot', 'rfemur', 'rtibia', 'rfoot',
      'ltoes', 'rtoes', 'lwrist', 'lhand', 'lfingers', 'lthumb', 'rwrist', 'rhand', 'rfingers', 'rthumb'];
    for (const n of cmu) expect(M.MIXAMO_MAP[n], n).toBeDefined();
    const seen = new Set<string>();
    for (const [slot, d] of Object.entries(M.MIXAMO_MAP)) {
      if (d.parent) expect(seen.has(d.parent), `${slot} after ${d.parent}`).toBe(true);
      seen.add(slot);
    }
  });
});

describe('resolveMixamoBones', () => {
  it('accepts mixamorig:, mixamorig<N>: and no prefix', () => {
    for (const p of ['mixamorig:', 'mixamorig1:', 'mixamorig2:', 'mixamorig12:', '']) {
      const r = M.resolveMixamoBones(bones(p));
      expect(r.prefix).toBe(p);
      expect(r.full.get('LeftUpLeg')).toBe(`${p}LeftUpLeg`);
      expect(r.parent.get('LeftLeg')).toBe('LeftUpLeg');
      expect(r.missingFingers).toEqual([]);
      expect(r.missingEnds).toEqual([]);
      expect(r.unknown).toEqual([]);
    }
    expect(M.baseName('mixamorig7:Spine2')).toBe('Spine2');
  });

  it('refuses mixed prefixes, duplicates, a missing bone and a re-parented bone', () => {
    const mixed = bones('mixamorig:');
    mixed[3] = { name: 'mixamorig2:Spine2', parent: 'mixamorig:Spine1' };
    expect(() => M.resolveMixamoBones(mixed)).toThrow(/mixed bone name prefixes/);
    expect(() => M.resolveMixamoBones([...bones(''), { name: 'mixamorig:Hips', parent: null }])).toThrow(/mixed|duplicate/);
    expect(() => M.resolveMixamoBones(bones('', ['Hips']).concat({ name: 'Hips', parent: null }, { name: 'Hips', parent: null }))).toThrow(/duplicate bone Hips/);
    expect(() => M.resolveMixamoBones(bones('mixamorig:', ['LeftLeg']))).toThrow(/missing bone LeftLeg/);
    expect(() => M.resolveMixamoBones(bones('mixamorig:', ['Spine1', 'RightFoot']))).toThrow(/missing bones Spine1, RightFoot/);
    const re = bones('').map((b) => (b.name === 'LeftLeg' ? { ...b, parent: 'Hips' } : b));
    expect(() => M.resolveMixamoBones(re)).toThrow(/LeftLeg's parent is Hips, the map needs LeftUpLeg/);
  });

  it('lists extra bones and falls back for missing fingers and end bones', () => {
    const r = M.resolveMixamoBones([...bones('', ['LeftHandIndex2', 'LeftHandMiddle1', 'RightToe_End', 'HeadTop_End']), { name: 'Prop', parent: 'RightHand' }]);
    expect(r.unknown).toEqual(['Prop']);
    expect(r.missingFingers).toEqual(['LeftHandIndex', 'LeftHandMiddle']);
    expect(r.missingEnds).toEqual(['HeadTop_End', 'RightToe_End']);
    const slots = new Map(M.mixamoSlots(r).map((s) => [s.slot, s]));
    expect(slots.has('lindex1')).toBe(false);
    expect(slots.has('lmiddle0')).toBe(false);
    expect(slots.has('rindex1')).toBe(true);
    expect(slots.get('lfingers')).toMatchObject({ rot: 'LeftHand', end: null, parent: 'lhand', kind: 'hub' });
    expect(slots.get('lhand')).toMatchObject({ end: null, extend: 0.4 });
    expect(slots.get('rtoes')).toMatchObject({ end: null, extend: 0.6 });
    expect(slots.get('ltoes')).toMatchObject({ end: 'LeftToe_End' });
    expect(slots.get('head')).toMatchObject({ end: null, extend: 1.7 });
    // the chain stays whole: every slot's parent is present
    for (const s of slots.values()) if (s.parent) expect(slots.has(s.parent), s.slot).toBe(true);
  });
});
