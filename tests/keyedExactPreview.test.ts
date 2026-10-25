// (anim-skeleton S4b) The live key preview against a Blender rebake of the edited key file
// (tests/fixtures/keyed-s4b-rebake.json, scripts/anim-skeleton/s4b-fixtures.mjs): jog and walk (mirrored) and hold_fwd
// (8 keys, unmirrored), one key edited (pelvis dy +3 cm, chest pitch +10, right arm flex +20, head pitch +8 deg).
// Measured: today's preview (the build's linear spread), and the proposed spreads for track A's `tuneKeys` build (the
// offset tables rewritten here as the build would write them): the curve of the edit alone, the curve of key + edit
// minus the curve of the key (`keyCurveSpread` with the key file's values), and that with the offsets composed as the
// bake's forward kinematics (exact at the keys too), and the trunk re-keyed in Blender's channel frames (exact).
// docs/archive/anim-skeleton/s4b/REPORT.md.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { newKeyedPose, sampleKeyed, type KeyedClip, type KeyedPose } from '../src/anim/keyed';
import { keyCurveSpread, newKeyCurve } from '../src/anim/keyCurve';
import { KEY_CLIPS } from '../src/anim/tuneKeysMeta';
import { keyBasePos } from '../src/anim/tuneKeysTime';
import { keyGroupId } from '../src/anim/tuneKeysFile';
import { keyedClipByName, tuneKeysSync } from '../src/anim/tuneKeys';
import { tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';

interface Bake {
  pel: number[];
  q: number[];
  arm: number[];
  head?: number[];
}
interface Case {
  clip: string;
  key: number;
  edit: Record<string, number>;
  frames: number;
  base: Bake;
  edited: Bake;
}
const FIX = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'keyed-s4b-rebake.json'), 'utf8')) as { cases: Case[] };
const KEYS = path.join(__dirname, '..', 'scripts', 'anim-keys', 'keys');
type Seg = Record<string, number | Record<string, number>>;
type Key = Record<string, Seg | number>;

/** The angle (deg) between quaternions a[s..] and b[s..]: 2 atan2(|vector part|, |w|) of conj(a) b (no acos: exact near 0). */
const qAngle = (a: ArrayLike<number>, b: ArrayLike<number>, s: number): number => {
  const [ax, ay, az, aw] = [a[s]!, a[s + 1]!, a[s + 2]!, a[s + 3]!];
  const [bx, by, bz, bw] = [b[s]!, b[s + 1]!, b[s + 2]!, b[s + 3]!];
  const w = aw * bw + ax * bx + ay * by + az * bz;
  const x = aw * bx - ax * bw - ay * bz + az * by;
  const y = aw * by + ax * bz - ay * bw - az * bx;
  const z = aw * bz - ax * by + ay * bx - az * bw;
  return (2 * Math.atan2(Math.sqrt(x * x + y * y + z * z), Math.abs(w)) * 180) / Math.PI;
};

interface Err {
  pel: number;
  q: number[];
  arm: number;
  head: number;
}
/** The worst error of `clip` sampled at its frames against the bake: pel (m), q per segment (deg), arm points (m), head (deg). */
function errors(clip: KeyedClip, bake: Bake, only: ((f: number) => boolean) | null = null): Err {
  const N = clip.frames;
  const p: KeyedPose = newKeyedPose();
  const e: Err = { pel: 0, q: [0, 0, 0, 0], arm: 0, head: 0 };
  for (let f = 0; f < N; f++) {
    if (only && !only(f)) continue;
    sampleKeyed(clip, f / N, 1, p);
    for (let c = 0; c < 3; c++) e.pel = Math.max(e.pel, Math.abs(p.pel[c]! - bake.pel[f * 3 + c]!));
    const bq = bake.q.slice(f * 16, f * 16 + 16);
    for (let s = 0; s < 4; s++) e.q[s] = Math.max(e.q[s]!, qAngle(p.q, bq, s * 4));
    for (let c = 0; c < 12; c++) e.arm = Math.max(e.arm, Math.abs(p.arm[c]! - bake.arm[f * 12 + c]!));
    const bh = bake.head ? bake.head.slice(f * 4, f * 4 + 4) : [0, 0, 0, 1];
    e.head = Math.max(e.head, qAngle(p.head, bh, 0));
  }
  return e;
}

const CM = (0.01 * 1.75) / 1.68;
const D2R = Math.PI / 180;
type V3 = [number, number, number];
type Q4 = [number, number, number, number];
const rot = (axis: 0 | 1 | 2, deg: number, v: V3): V3 => {
  const c = Math.cos(deg * D2R);
  const s = Math.sin(deg * D2R);
  const [x, y, z] = v;
  if (axis === 0) return [x, c * y - s * z, s * y + c * z];
  if (axis === 1) return [c * x + s * z, y, -s * x + c * z];
  return [c * x - s * y, s * x + c * y, z];
};
const qmul = (a: Q4, b: Q4): Q4 => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qaxis = (axis: 0 | 1 | 2, deg: number): Q4 => {
  const q: Q4 = [0, 0, 0, Math.cos(deg * D2R * 0.5)];
  q[axis] = Math.sin(deg * D2R * 0.5);
  return q;
};
/** Babylon's RotationYawPitchRoll (deg): Ry(yaw) Rx(pitch) Rz(roll). */
const ypr = (y: number, p: number, r: number): Q4 => qmul(qmul(qaxis(1, y), qaxis(0, p)), qaxis(2, r));
const conj = (q: Q4): Q4 => [-q[0], -q[1], -q[2], q[3]];
/** The shortest rotation taking direction a to b. */
const between = (a: V3, b: V3): Q4 => {
  const w = 1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const q: Q4 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0], w];
  const l = Math.hypot(...q);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
const put = (o: Float32Array, t: number, q: Q4): void => {
  for (let c = 0; c < 4; c++) o[t + c] = q[c]!;
};

/** A rotation matrix (rows) to a quaternion (x, y, z, w). */
function matQ(m: number[][]): Q4 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m as [[number, number, number], [number, number, number], [number, number, number]];
  const tr = a + e + i;
  let q: Q4;
  if (tr > 0) {
    const S = Math.sqrt(tr + 1) * 2;
    q = [(h - f) / S, (c - g) / S, (d - b) / S, S / 4];
  } else if (a > e && a > i) {
    const S = Math.sqrt(1 + a - e - i) * 2;
    q = [S / 4, (b + d) / S, (c + g) / S, (h - f) / S];
  } else if (e > i) {
    const S = Math.sqrt(1 + e - a - i) * 2;
    q = [(b + d) / S, S / 4, (f + h) / S, (c - g) / S];
  } else {
    const S = Math.sqrt(1 + i - a - e) * 2;
    q = [(c + g) / S, (f + h) / S, S / 4, (d - b) / S];
  }
  return q;
}
/**
 * The trunk bones' channel frames (tests/fixtures/key-curve-blender.json `rest`, Blender's armature-space rest): a
 * clip local q is P b P^-1 of the bone's Blender quaternion b, P = -CI REST (key_clip.py `evaluated`; C improper, so
 * the minus makes P a rotation).
 */
const REST_Q: Q4[] = (() => {
  const rest = (JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'key-curve-blender.json'), 'utf8')) as { rest: Record<string, number[][]> }).rest;
  const CI = [
    [-1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ];
  return ['pelvis', 'spine', 'chest', 'neck'].map((b) => {
    const R = rest[b]!;
    const P = CI.map((row) => [0, 1, 2].map((j) => -(row[0]! * R[0]![j]! + row[1]! * R[1]![j]! + row[2]! * R[2]![j]!)));
    return matQ(P);
  });
})();

/** The key file's keys as the bake poses them (key_clip.py `mirror_key`: the trunk's dx, yaw, roll negated, arms swapped). */
function bakeKeys(name: string): Key[] {
  const f = JSON.parse(readFileSync(path.join(KEYS, `${name}.json`), 'utf8')) as { mirror?: boolean; keys: Key[] };
  const out = [...f.keys];
  if (f.mirror) {
    for (const k of f.keys) {
      const m: Key = { ...k, armL: k.armR!, armR: k.armL! };
      for (const s of ['pelvis', 'spine', 'chest', 'neck']) {
        const e = { ...(k[s] as Seg) };
        for (const a of ['dx', 'yaw', 'roll']) if (typeof e[a] === 'number') e[a] = -(e[a] as number);
        m[s] = e;
      }
      out.push(m);
    }
  }
  return out;
}

// the fields the measurement spreads: [segment, field]; the edit sits on the first four
const FIELDS = [
  ['pelvis', 'dy'],
  ['chest', 'pitch'],
  ['armL', 'flex'],
  ['armR', 'flex'],
  ['chest', 'yaw'],
  ['chest', 'roll'],
  ['armL', 'abd'],
  ['armL', 'elbow'],
  ['armL', 'inward'],
  ['armR', 'abd'],
  ['armR', 'elbow'],
  ['armR', 'inward'],
] as const;
const NF = FIELDS.length;

/**
 * This case's offset tables rewritten as the proposed build writes them. The Bezier fields (pelvis dy, chest pitch, arm
 * flex: the bake interpolates them on Blender's curves) spread by `keyCurveSpread`: 'delta' the curve of the edit
 * alone; 'base' with the key file's values; 'fk' as 'base', the chest and arm offsets composed as the bake's FK at the
 * spread values (chest: ypr(key)^-1 ypr(key + edit) in its own frame; arms: the rotations taking the upper arm and the
 * forearm directions of the key to those of key + edit, key_clip.py `fk`); 'exact' as 'fk' for the arms, the trunk
 * re-keyed: each segment's local quaternion at every key from the key file with the edit (ypr chain), taken into its
 * bone's Blender channel frame (REST_Q), Blender's curve per component, normalised and taken back (the bake's own
 * interpolation), the tables chained through the sampler's counter-turn. The head (lerped by the bake) keeps the
 * build's linear spread.
 */
function curveSpread(clip: KeyedClip, c: Case, mode: 'delta' | 'base' | 'fk' | 'exact', carry: number): void {
  const meta = KEY_CLIPS.find((m) => m.name === c.clip)!;
  const n = meta.phases.length;
  const T = meta.mirror ? 2 * n : n;
  const keys = bakeKeys(c.clip);
  const order = Array.from({ length: T }, (_, k) => k).sort((a, b) => keyBasePos(meta, a) - keyBasePos(meta, b));
  const t = Float64Array.from(order.map((k) => keyBasePos(meta, k) / 48));
  const D = new Float64Array(T * NF);
  const B = new Float64Array(T * NF);
  order.forEach((k, r) => {
    const own = k === c.key;
    const mir = meta.mirror && k === c.key + n;
    FIELDS.forEach(([seg, fld], j) => {
      const s = (keys[k]![seg] as Seg | undefined) ?? {};
      B[r * NF + j] = (s[fld] as number | undefined) ?? 0;
      if (!own && !mir) return;
      const side = mir ? (seg === 'armL' ? 'armR' : 'armL') : seg; // the mirrored half: the own key's other arm
      D[r * NF + j] = j < 4 ? (c.edit[seg === 'pelvis' ? 'pelvis_dy' : seg === 'chest' ? 'chest_pitch' : `${side}_flex`] ?? 0) : 0;
    });
  });
  const N = clip.frames;
  const kc = newKeyCurve();
  const kb = newKeyCurve();
  const SP = new Float64Array(N * NF); // the spread edit per frame and field
  const BC = new Float64Array(N * NF); // the base curve per frame and field ('fk')
  for (let j = 0; j < NF; j++) {
    keyCurveSpread(kc, kb, t, mode === 'delta' ? null : B, D, T, NF, j, N, SP, NF, j);
    keyCurveSpread(kc, kb, t, null, B, T, NF, j, N, BC, NF, j);
  }
  const off = clip.keyOff!;
  // 'exact': the trunk's bake channels themselves (key_clip.py `fk`: each segment ypr(key) in the body frame, the
  // locals pelvis, spine, chest, neck) at every key with the edit, Blender's curve per quaternion component, normalised
  const QK = new Float64Array(T * 16);
  if (mode === 'exact') {
    order.forEach((k, r) => {
      const own = k === c.key || (meta.mirror && k === c.key + n);
      const W = (['pelvis', 'spine', 'chest', 'neck'] as const).map((s) => {
        const e = (keys[k]![s] as Seg | undefined) ?? {};
        const g = (a: string): number => (e[a] as number | undefined) ?? 0;
        return ypr(g('yaw'), g('pitch') + (own && s === 'chest' ? (c.edit.chest_pitch ?? 0) : 0), g('roll'));
      });
      const loc = [W[0]!, qmul(conj(W[0]!), W[1]!), qmul(conj(W[1]!), W[2]!), qmul(conj(W[2]!), W[3]!)];
      for (let s = 0; s < 4; s++) {
        // into the bone's Blender channel frame (its rest): the curve clamps each channel there
        const pr = REST_Q[s]!;
        let q = qmul(qmul(conj(pr), loc[s]!), pr);
        if (r > 0 && q[0] * QK[(r - 1) * 16 + s * 4]! + q[1] * QK[(r - 1) * 16 + s * 4 + 1]! + q[2] * QK[(r - 1) * 16 + s * 4 + 2]! + q[3] * QK[(r - 1) * 16 + s * 4 + 3]! < 0) q = [-q[0], -q[1], -q[2], -q[3]];
        for (let cc = 0; cc < 4; cc++) QK[r * 16 + s * 4 + cc] = q[cc]!;
      }
    });
  }
  const EQ = new Float64Array(N * 16);
  if (mode === 'exact') {
    for (let j = 0; j < 16; j++) keyCurveSpread(kc, kb, t, null, QK, T, 16, j, N, EQ, 16, j);
  }
  for (let f = 0; f < N; f++) {
    const v = (j: number): number => SP[f * NF + j]!;
    const b = (j: number): number => BC[f * NF + j]!;
    off.pel[f * 3 + 1] = v(0) * CM;
    if (mode === 'exact') {
      // the tables chained so that the sampler's turn-and-counter-turn (keyed.ts keyOffTrunk: q_s o_s, the child
      // o_s^-1 q_child) lands each segment on its exact local: o_0 = q_0^-1 E_0, o_s+1 = q_s+1^-1 o_s E_s+1
      let prev: Q4 = [0, 0, 0, 1];
      for (let s = 0; s < 4; s++) {
        const e0 = EQ.slice(f * 16 + s * 4, f * 16 + s * 4 + 4);
        const l = Math.hypot(...e0);
        const pr = REST_Q[s]!;
        const E: Q4 = qmul(qmul(pr, [e0[0]! / l, e0[1]! / l, e0[2]! / l, e0[3]! / l]), conj(pr));
        const cq = clip.q.slice(f * 16 + s * 4, f * 16 + s * 4 + 4);
        const cl = Math.hypot(...cq);
        const Q: Q4 = [cq[0]! / cl, cq[1]! / cl, cq[2]! / cl, cq[3]! / cl];
        const o = qmul(qmul(conj(Q), prev), E);
        put(off.trunk, f * 16 + s * 4, o);
        prev = o;
      }
    }
    if (mode === 'delta' || mode === 'base') {
      put(off.trunk, f * 16 + 8, qaxis(0, v(1)));
      for (let side = 0; side < 2; side++) {
        put(off.arm, f * 16 + side * 8, qaxis(0, -v(2 + side)));
        put(off.arm, f * 16 + side * 8 + 4, qaxis(0, -v(2 + side)));
      }
      continue;
    }
    if (mode === 'fk') put(off.trunk, f * 16 + 8, qmul(conj(ypr(b(4), b(1), b(5))), ypr(b(4), b(1) + v(1), b(5))));
    for (let side = 0; side < 2; side++) {
      const s = side === 0 ? -1 : 1;
      const j0 = 6 + side * 3;
      const fl = b(2 + side);
      const ab = b(j0);
      const el = b(j0 + 1);
      const inw = b(j0 + 2);
      const dfl = v(2 + side);
      const up = (x: number): V3 => rot(0, -x, rot(2, s * ab, [0, -1, 0]));
      const fore = (x: number): V3 => rot(1, -s * inw, rot(0, -(x + el), rot(2, s * (ab + carry), [0, -1, 0])));
      put(off.arm, f * 16 + side * 8, between(up(fl), up(fl + dfl)));
      put(off.arm, f * 16 + side * 8 + 4, between(fore(fl), fore(fl + dfl)));
    }
  }
}

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
});

describe('anim-skeleton S4b: the key preview against a Blender rebake', () => {
  const rows: string[] = [];
  const fmt = (e: Err): string => `pel ${(e.pel * 100).toFixed(4)} cm, chest ${e.q[2]!.toFixed(3)} / neck ${e.q[3]!.toFixed(3)} deg, arm ${(e.arm * 100).toFixed(3)} cm, head ${e.head.toFixed(4)} deg`;

  it('no edit: the shipped clips equal their rebake (float noise: the modules round to 1e-5)', () => {
    for (const c of FIX.cases) {
      const clip = keyedClipByName(c.clip)!;
      tuneKeysSync();
      expect(clip.keyOff).toBeNull();
      const e = errors(clip, c.base);
      expect(e.pel, c.clip).toBeLessThan(2e-5);
      expect(e.arm, c.clip).toBeLessThan(2e-5);
      for (const q of e.q) expect(q, c.clip).toBeLessThan(0.002);
    }
  });

  it('one key edited: today and the proposed spreads against the rebake (S4B_PRINT=1 prints the table)', () => {
    for (const c of FIX.cases) {
      const clip = keyedClipByName(c.clip)!;
      const carry = (JSON.parse(readFileSync(path.join(KEYS, `${c.clip}.json`), 'utf8')) as { carry?: number }).carry ?? 5;
      for (const [id, v] of Object.entries(c.edit)) tuneSet(keyGroupId(c.clip, c.key), id, v);
      tuneKeysSync();
      expect(clip.keyOff).not.toBeNull();
      const lin = errors(clip, c.edited);
      curveSpread(clip, c, 'delta', carry);
      const del = errors(clip, c.edited);
      curveSpread(clip, c, 'base', carry);
      const bas = errors(clip, c.edited);
      curveSpread(clip, c, 'fk', carry);
      const fk = errors(clip, c.edited);
      curveSpread(clip, c, 'exact', carry);
      const ex = errors(clip, c.edited);
      rows.push(`${c.clip} key ${c.key}\n  today (linear)   ${fmt(lin)}\n  curve, edit only ${fmt(del)}\n  curve, key+edit  ${fmt(bas)}\n  curve + FK       ${fmt(fk)}\n  exact trunk      ${fmt(ex)} (spine ${ex.q[1]!.toFixed(3)}, pelvis ${ex.q[0]!.toFixed(3)})`);
      // the head channel is lerped by the bake as the build spreads it: exact today
      expect(lin.head).toBeLessThan(0.002);
      // today's linear spread is visibly off between the keys
      expect(lin.pel).toBeGreaterThan(2e-3);
      expect(lin.q[2]).toBeGreaterThan(0.5);
      // the curve with the key file's values: the pelvis shift (a location channel) exact
      expect(bas.pel).toBeLessThan(2e-5);
      // the trunk re-keyed from the key file in Blender's channel frames on Blender's curve: exact (float noise)
      for (const q of ex.q) expect(q, `${c.clip} trunk`).toBeLessThan(0.005);
      expect(ex.pel).toBeLessThan(2e-5);
      // the arms composed as the bake's FK: exact at the keys, between them under 0.6 cm (the bake interpolates the
      // shoulder and elbow bones' quaternion and location channels; reproducing that is the open part). Measured 0.57 cm
      // on the 10-21 keys, 0.70 cm on Michael's rebaked jog (4.46.0, where today's linear spread is 1.56 cm: 2.2x):
      // a bound of 1 cm, and at least 2x better than today
      expect(fk.arm).toBeLessThan(1e-2);
      expect(fk.arm).toBeLessThan(lin.arm / 2);
      tuneResetAll();
      tuneKeysSync();
      expect(clip.keyOff).toBeNull();
    }
    if (process.env.S4B_PRINT) console.info(rows.join('\n'));
  });
});

// (marlow-bays item 30e) The preview's own build, the key file loaded: the curve fields on Blender's curve, the trunk
// re-keyed in the bake's channel frames, the arms as FK (tuneKeys.ts `build`, tuneKeysCurve.ts). Runs after the
// measurement above (its "today" is the linear spread before the key file loads).
import { TRUNK_REST_MATS } from '../src/anim/tuneKeysCurve';
import { tuneKeysFilesReady } from '../src/anim/tuneKeys';

describe('marlow-bays item 30e: the exact preview', () => {
  it("the trunk rest frames are the fixture's", () => {
    const rest = (JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'key-curve-blender.json'), 'utf8')) as { rest: Record<string, number[][]> }).rest;
    ['pelvis', 'spine', 'chest', 'neck'].forEach((b, s) => {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(TRUNK_REST_MATS[s]![i]![j]!).toBeCloseTo(rest[b]![i]![j]!, 6);
    });
  });

  it('one key edited: the build matches the Blender rebake (pelvis and trunk exact, arms within 1 cm)', async () => {
    const out: string[] = [];
    for (const c of FIX.cases) {
      const clip = keyedClipByName(c.clip)!;
      for (const [id, v] of Object.entries(c.edit)) tuneSet(keyGroupId(c.clip, c.key), id, v);
      tuneKeysSync();
      await tuneKeysFilesReady();
      tuneKeysSync();
      expect(clip.keyOff).not.toBeNull();
      const e = errors(clip, c.edited);
      out.push(`${c.clip}: ${fmt2(e)}`);
      expect(e.pel, c.clip).toBeLessThan(2e-5);
      for (const q of e.q) expect(q, `${c.clip} trunk`).toBeLessThan(0.005);
      expect(e.arm, `${c.clip} arms`).toBeLessThan(1e-2);
      expect(e.head, `${c.clip} head`).toBeLessThan(0.002);
      // at the keys themselves the arms are exact too (FK at the keys' own values)
      const meta = KEY_CLIPS.find((m) => m.name === c.clip)!;
      const T = meta.mirror ? meta.phases.length * 2 : meta.phases.length;
      const atKeys = errors(clip, c.edited, (f) => {
        for (let k = 0; k < T; k++) if (Math.abs((keyBasePos(meta, k) / 48) * clip.frames - f) < 1e-9) return true;
        return false;
      });
      expect(atKeys.arm, `${c.clip} arms at the keys`).toBeLessThan(2e-4);
      tuneResetAll();
      tuneKeysSync();
      expect(clip.keyOff).toBeNull();
    }
    if (process.env.S4B_PRINT) console.info(out.join('\n'));
  });
});

function fmt2(e: Err): string {
  return `pel ${(e.pel * 100).toFixed(4)} cm, trunk ${e.q.map((q) => q.toFixed(4)).join(' / ')} deg, arm ${(e.arm * 100).toFixed(3)} cm, head ${e.head.toFixed(4)} deg`;
}
