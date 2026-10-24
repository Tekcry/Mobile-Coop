// Guard gear kit (guard-models G3): the fit targets the Python builders use (scripts/operators/py/gear/fit.py, FIT)
// must equal the game rig's proportions and bind joints for each base, and every gear piece of the id contract must
// have a builder. Pure: reads the .py files as text.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { operatorJoints, type JointName } from '../src/operators/operatorBody';
import { proportions, type Build } from '../src/player/proportions';

const ROOT = path.resolve(__dirname, '..');
const GEAR = path.join(ROOT, 'scripts/operators/py/gear');
const KIT_FILE = path.join(ROOT, 'scripts/operators/data/guards.json');

/** SPEC section 1 (A2): base, build and reference height. guards.json wins when it exists (checked below). */
const BASES: { id: string; build: Build; refHeight: number }[] = [
  { id: 'average', build: 'average', refHeight: 1.77 },
  { id: 'lean', build: 'lean', refHeight: 1.76 },
  { id: 'broad', build: 'broad', refHeight: 1.825 },
];
/** gm-common.md id contract: every rigid gear piece (outfits are garments, G2). */
const GEAR_IDS = [
  'cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie', 'glasses_clear', 'glasses_dark',
  'helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy', 'shield_riot',
  'radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount',
];
const FIT_JOINTS: JointName[] = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'hipR'];

type Num = number | number[] | { [k: string]: Num };

function readFit(): Record<string, Record<string, Num>> {
  const src = readFileSync(path.join(GEAR, 'fit.py'), 'utf8');
  const m = /FIT-BEGIN[^\n]*\r?\nFIT = json\.loads\(r'''([\s\S]*?)'''\)\r?\n# FIT-END/.exec(src);
  if (!m?.[1]) throw new Error('fit.py: FIT-BEGIN / FIT-END block not found');
  return JSON.parse(m[1]) as Record<string, Record<string, Num>>;
}

/** What FIT must hold for a base: the TypeScript rig, rounded like the generated block (4 decimals). */
function expected(build: Build, h: number): Record<string, Num> {
  const p = proportions(build, h);
  const joints = operatorJoints(p);
  const J: Record<string, number[]> = {};
  for (const n of FIT_JOINTS) {
    const j = joints.find((x) => x.name === n);
    if (!j) throw new Error(`no joint ${n}`);
    J[n] = [...j.pos];
  }
  return {
    height: p.height,
    head: { h: p.head.h, w: p.head.w, d: p.head.d },
    neck: { len: p.neck.len, r: p.neck.r },
    y: { ...p.y },
    shoulderWidth: p.shoulderWidth, shoulderHalf: p.shoulderHalf, hipHalf: p.hipHalf,
    chest: { w: p.chest.w, d: p.chest.d }, waist: { w: p.waist.w, d: p.waist.d }, pelvis: { w: p.pelvis.w, d: p.pelvis.d },
    upperArm: { ...p.upperArm }, forearm: { ...p.forearm }, hand: { len: p.hand.len }, thigh: { ...p.thigh },
    joints: J,
  };
}

function compare(got: Num | undefined, want: Num, where: string, out: string[]): void {
  if (typeof want === 'number') {
    if (typeof got !== 'number' || Math.abs(got - want) > 6e-5) out.push(`${where}: ${JSON.stringify(got)} vs ${want}`);
    return;
  }
  if (Array.isArray(want)) {
    if (!Array.isArray(got) || got.length !== want.length) { out.push(`${where}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`); return; }
    want.forEach((w, i) => compare(got[i], w, `${where}[${i}]`, out));
    return;
  }
  if (typeof got !== 'object' || got === null || Array.isArray(got)) { out.push(`${where}: missing`); return; }
  for (const [k, w] of Object.entries(want)) compare((got as Record<string, Num>)[k], w, `${where}.${k}`, out);
}

describe('guard gear fit targets (G3)', () => {
  const FIT = readFit();

  it('FIT has exactly the three bases', () => {
    expect(Object.keys(FIT).sort()).toEqual(BASES.map((b) => b.id).sort());
  });

  for (const b of BASES) {
    it(`FIT.${b.id} equals proportions('${b.build}', ${b.refHeight}) and operatorJoints (no drift from the rig)`, () => {
      const f = FIT[b.id];
      expect(f?.build).toBe(b.build);
      const diffs: string[] = [];
      compare(f, expected(b.build, b.refHeight), b.id, diffs);
      expect(diffs).toEqual([]);
    });
  }

  it.skipIf(!existsSync(KIT_FILE))('reference heights and builds match guards.json', () => {
    const kit = JSON.parse(readFileSync(KIT_FILE, 'utf8')) as { bases: { id: string; refHeight: number; build: string }[] };
    for (const b of BASES) {
      const k = kit.bases.find((x) => x.id === b.id);
      expect(k?.refHeight).toBe(b.refHeight);
      expect(k?.build).toBe(b.build);
    }
  });
});

describe('guard gear builders (G3)', () => {
  /** Keys of every `BUILDERS = {...}` dict in py/gear/*.py (pieces.py merges them). */
  function builderIds(): string[] {
    const ids: string[] = [];
    for (const f of readdirSync(GEAR).filter((n) => n.endsWith('.py') && n !== 'pieces.py')) {
      const src = readFileSync(path.join(GEAR, f), 'utf8');
      const m = /^BUILDERS = \{([\s\S]*?)\}/m.exec(src);
      if (!m?.[1]) continue;
      for (const k of m[1].matchAll(/'(\w+)':\s*\w+/g)) if (k[1]) ids.push(k[1]);
    }
    return ids.sort();
  }

  it('every rigid gear piece of the id contract has exactly one builder, and nothing else does', () => {
    expect(builderIds()).toEqual([...GEAR_IDS].sort());
  });

  it.skipIf(!existsSync(KIT_FILE))('every non-outfit piece in guards.json has a builder', () => {
    const kit = JSON.parse(readFileSync(KIT_FILE, 'utf8')) as { pieces: { id: string; kind: string }[] };
    const have = new Set(builderIds());
    expect(kit.pieces.filter((p) => p.kind !== 'outfit' && !have.has(p.id)).map((p) => p.id)).toEqual([]);
  });
});
