// (mixamo-retarget M2, docs/mixamo-retarget/PLAN.md M2) The Mixamo bone map: every Wren joint the retarget drives has a
// slot and the Mixamo bone matched by rest height (A6 spine: Spine, Spine1 + Spine2, Neck + Head), every segment ends at
// a measured joint, the direction check's spans cover every driven segment, the CMU names
// analyze.mjs reads exist, any `mixamorig<N>:` prefix (or none) resolves, a missing or re-parented bone is an error, and
// missing fingers / end bones fall back without breaking the chain.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as mapMod from '../scripts/mocap/mixamoMap.mjs';
// @ts-expect-error plain .mjs build script without types
import * as retargetMod from '../scripts/mocap/retarget.mjs';

interface SlotDef { rot: string; end: string | null; parent: string | null; kind: string; extend?: number; blend?: string; at?: number }
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
  WREN_SPANS: Record<string, [Pt, Pt]>;
  WREN_CHORD: { from: string; via: string; to: string; span: [string, string] };
  NECK_AT: number;
  HEAD_GUESS: number;
};
type Pt = string | [string, string, number];
const R = retargetMod as {
  MAP: Record<string, string>;
  SEG_END: Record<string, string>;
  wrenRig: () => { names: string[]; bind: Record<string, number[]> };
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

  it('maps every Wren joint the retarget drives, to the bones matched by rest height (A6 spine)', () => {
    const rig = R.wrenRig();
    for (const j of rig.names) {
      if (['root', 'body', 'handL', 'handR'].includes(j)) continue; // identity / follow the wrist (retarget.mjs)
      const slot = R.MAP[j];
      expect(slot, j).toBeTypeOf('string');
      expect(M.MIXAMO_MAP[slot!], `${j} -> ${slot}`).toBeDefined();
    }
    const want: Record<string, string> = {
      pelvis: 'Hips', spine: 'Spine', chest: 'Spine1', neck: 'Neck', head: 'Head',
      shL: 'LeftArm', elL: 'LeftForeArm', wrL: 'LeftHand', shR: 'RightArm', elR: 'RightForeArm', wrR: 'RightHand',
      hipL: 'LeftUpLeg', knL: 'LeftLeg', anL: 'LeftFoot', toeL: 'LeftToeBase', hipR: 'RightUpLeg', knR: 'RightLeg', anR: 'RightFoot', toeR: 'RightToeBase',
    };
    for (const [j, b] of Object.entries(want)) expect(M.MIXAMO_MAP[R.MAP[j]!]!.rot, j).toBe(b);
    // chest spans Spine1 + Spine2, neck spans Neck + the lower Head bone (blend slots)
    expect(M.MIXAMO_MAP.thorax).toMatchObject({ rot: 'Spine1', blend: 'Spine2', end: 'Neck' });
    expect(M.MIXAMO_MAP.thorax!.at).toBeUndefined();
    expect(M.MIXAMO_MAP.upperneck).toMatchObject({ rot: 'Neck', blend: 'Head', end: 'HeadTop_End', at: M.NECK_AT });
    expect(M.MIXAMO_MAP.lowerback).toMatchObject({ kind: 'hub', end: null });
    expect(M.MIXAMO_TO_SLOT.Spine).toBe('upperback');
    expect(M.MIXAMO_TO_SLOT.Spine2).toBeUndefined();
    expect(M.MIXAMO_TO_SLOT.LeftShoulder).toBe('lclavicle');
    expect(M.MIXAMO_TO_SLOT.RightHandIndex2).toBe('rindex2');
  });

  it('ends every driven segment at the child bone head (never a tail)', () => {
    const end: Record<string, string> = {
      spine: 'Spine1', chest: 'Neck', neck: 'HeadTop_End', shL: 'LeftForeArm', elL: 'LeftHand', wrL: 'LeftHandMiddle1',
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

  it('has a check span for every driven Wren segment, matched by rest height and independent of the slots', () => {
    expect(Object.keys(M.WREN_SPANS).sort()).toEqual(Object.keys(R.SEG_END).sort());
    expect(M.WREN_SPANS.spine).toEqual(['Spine', 'Spine1']);
    expect(M.WREN_SPANS.chest).toEqual(['Spine1', 'Neck']);
    expect(M.WREN_SPANS.neck).toEqual(['Neck', ['Head', 'HeadTop_End', M.NECK_AT]]);
    expect(M.WREN_SPANS.knR).toEqual(['RightLeg', 'RightFoot']);
    expect(M.WREN_CHORD).toEqual({ from: 'spine', via: 'chest', to: 'neck', span: ['Spine', 'Neck'] });
    // NECK_AT: Wren's neck share of its spine -> neck chord, put on the measured Mixamo chain (standing_idle heads, m)
    const w = R.wrenRig().bind, h = (a: string, b: string): number => Math.hypot(...w[b]!.map((x, i) => x - w[a]![i]!));
    const wrenShare = h('neck', 'head') / (h('spine', 'chest') + h('chest', 'neck'));
    const mx = { spineToNeck: 1.399 - 1.015, neck: 0.0715, headBone: 0.207 };
    expect((wrenShare * mx.spineToNeck - mx.neck) / mx.headBone).toBeCloseTo(M.NECK_AT, 1);
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
    // a blend slot needs its chain: blend under rot, end under blend
    const reNeck = bones('').map((b) => (b.name === 'Neck' ? { ...b, parent: 'Spine1' } : b));
    expect(() => M.resolveMixamoBones(reNeck)).toThrow(/Neck's parent is Spine1, the map needs Spine2 (slot thorax)/);
    const reS2 = bones('').map((b) => (b.name === 'Spine2' ? { ...b, parent: 'Spine' } : b));
    expect(() => M.resolveMixamoBones(reS2)).toThrow(/Spine2's parent is Spine, the map needs Spine1 (slot thorax)/);
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
    // HeadTop_End missing: upperneck guesses the head bone (HEAD_GUESS neck hops), the head's tip lands on the same guess
    expect(slots.get('upperneck')).toMatchObject({ end: null, extend: M.HEAD_GUESS, blend: 'Head', at: M.NECK_AT });
    const k = M.NECK_AT, g = M.HEAD_GUESS;
    expect(slots.get('head')!.end).toBeNull();
    expect(1 + k * g + slots.get('head')!.extend! * (1 + k * g)).toBeCloseTo(1 + g, 9);
    // the chain stays whole: every slot's parent is present
    for (const s of slots.values()) if (s.parent) expect(slots.has(s.parent), s.slot).toBe(true);
  });
});
