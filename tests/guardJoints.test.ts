// Guard base joints (scripts/operators/guardJoints.mjs, guard-models G1): the game rig at a base's reference height and
// build, clavicles at the SC points, shoulders under the clavicles, the export-joints file shape.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as gj from '../scripts/operators/guardJoints.mjs';
import { proportions, hitVolumes } from '../src/player/proportions';
import { operatorJoints, operatorProportions, OPERATORS } from '../src/operators/operatorBody';
import { CLAV_SC } from '../src/anim/clavicle';
import { RIG_JOINTS } from '../src/operators/runtime/pose';

interface J { name: string; parent: string | null; pos: [number, number, number] }
interface Entry {
  id: string; base: string; height: number; build: string; joints: J[]; ends: { handL: number[]; handR: number[] };
  hitVolumes: unknown; proportions: unknown; clavicleSplit: { x: number[]; y: number[]; max: number } | null;
}
const guardJoints = gj.guardJoints as (b: unknown, clav?: unknown) => Entry;
const CLAV_CFG = JSON.parse(readFileSync('scripts/anim-skeleton/skeleton.json', 'utf8')).clavicle as { x: number[]; y: number[]; max: number };
/** guards.json's bases (slice G0, SPEC section 1). */
const BASES = [
  { id: 'average', refHeight: 1.77, build: 'average' },
  { id: 'lean', refHeight: 1.76, build: 'lean' },
  { id: 'broad', refHeight: 1.825, build: 'broad' },
];

describe('guard joints', () => {
  it('has exactly the 23 rig joints, parents first, shoulders under the clavicles', () => {
    for (const b of BASES) {
      const e = guardJoints(b, CLAV_CFG);
      expect(e.id).toBe(`guard-${b.id}`);
      expect(e.joints.map((j) => j.name).sort()).toEqual([...RIG_JOINTS].sort());
      const seen = new Set<string>();
      for (const j of e.joints) {
        if (j.parent) expect(seen.has(j.parent), `${j.name} before ${j.parent}`).toBe(true);
        seen.add(j.name);
      }
      const par = Object.fromEntries(e.joints.map((j) => [j.name, j.parent]));
      expect(par.shL).toBe('clavL');
      expect(par.shR).toBe('clavR');
      expect(par.clavL).toBe('chest');
      expect(par.root).toBe(null);
    }
  });

  it('places every joint where the CharacterRig of that (height, build) has it', () => {
    for (const b of BASES) {
      const e = guardJoints(b, CLAV_CFG);
      const p = proportions(b.build as 'average', b.refHeight);
      const ref = Object.fromEntries(operatorJoints(p).map((j) => [j.name, j.pos]));
      for (const j of e.joints) {
        if (j.name.startsWith('clav')) continue;
        j.pos.forEach((v, i) => expect(v).toBeCloseTo(ref[j.name]![i]!, 5));
      }
      expect(e.ends.handL[1]).toBeCloseTo(ref.handL![1]!, 5);
      expect(e.hitVolumes).toEqual(hitVolumes(p));
      expect(e.height).toBe(b.refHeight);
    }
  });

  it('puts the clavicles at the SC point: lateral of the midline, under the neck joint, forward of the chest', () => {
    const e = guardJoints(BASES[0], CLAV_CFG);
    const at = Object.fromEntries(e.joints.map((j) => [j.name, j.pos]));
    const p = proportions('average', 1.77);
    expect(at.clavL).toEqual([-CLAV_SC.lateral, Math.round((p.y.neck - CLAV_SC.belowNeck) * 1e5) / 1e5, CLAV_SC.forward]);
    expect(at.clavR![0]).toBe(CLAV_SC.lateral);
    // skeleton.json (Wren's skin) and the game rig use the same SC constants
    expect(JSON.parse(readFileSync('scripts/anim-skeleton/skeleton.json', 'utf8')).clavicle).toMatchObject(CLAV_SC);
  });

  it('scales the clavicle weight bands from Wren: her proportions give skeleton.json back, taller and wider guards move them', () => {
    const wren = gj.clavicleSplit(operatorProportions(OPERATORS.wren), CLAV_CFG) as typeof CLAV_CFG;
    wren.x.forEach((v, i) => expect(v).toBeCloseTo(CLAV_CFG.x[i]!, 5));
    wren.y.forEach((v, i) => expect(v).toBeCloseTo(CLAV_CFG.y[i]!, 5));
    const broad = guardJoints(BASES[2], CLAV_CFG).clavicleSplit!;
    expect(broad.y[0]).toBeGreaterThan(CLAV_CFG.y[0]!);
    expect(broad.x[1]).toBeGreaterThan(CLAV_CFG.x[1]!);
    expect(broad.max).toBe(CLAV_CFG.max);
    // the band still ends above the chest joint and below the neck
    const at = Object.fromEntries(guardJoints(BASES[2], CLAV_CFG).joints.map((j) => [j.name, j.pos]));
    expect(broad.y[1]).toBeLessThan(at.neck![1]);
  });

  it('bigger builds give wider shoulders and a taller skeleton', () => {
    const sh = (b: (typeof BASES)[number]) => guardJoints(b).joints.find((j) => j.name === 'shR')!.pos[0];
    expect(sh(BASES[2]!)).toBeGreaterThan(sh(BASES[0]!));
    expect(sh(BASES[0]!)).toBeGreaterThan(sh(BASES[1]!));
    expect(guardJoints(BASES[2]).clavicleSplit).toBe(null);
  });

  it('refuses a base without a usable height or build', () => {
    expect(() => guardJoints({ id: 'x', refHeight: 17.7, build: 'average' })).toThrow(/refHeight/);
    expect(() => guardJoints({ id: 'x', refHeight: 1.77, build: 'huge' })).toThrow(/build/);
    expect(() => guardJoints({ refHeight: 1.77, build: 'average' })).toThrow(/id/);
  });

  it('writes export-joints.mjs\' file shape and a path under joints/', () => {
    const f = gj.guardJointsFile(BASES[1], CLAV_CFG) as { frame: string; operators: Entry[] };
    expect(f.operators).toHaveLength(1);
    expect(f.operators[0]?.id).toBe('guard-lean');
    expect(f.frame).toMatch(/\+Y up/);
    expect(gj.jointsRel('lean')).toBe('joints/guard-lean.json');
  });
});
