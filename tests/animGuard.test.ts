// (anim-guard) The guard's side of the rear hold (docs/archive/anim-rework/BRIEF.md "Holding a guard"): four keyed clips baked by
// scripts/anim-keys (keys/guard_*.json -> src/anim/clips/keyed/guard_*.ts). Sampling, joint ranges (design bible 5.12.2),
// continuity, the floor: the one-shots end lying, the stumble's feet stay on the ground (forward kinematics of the keys,
// as scripts/anim-keys/py/key_clip.py builds them; the runtime clip carries no legs yet).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KA, KQ, KW, newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { KEYED_GUARD_HELD_STUMBLE } from '../src/anim/clips/keyed/guard_held_stumble';
import { KEYED_GUARD_HELD_HANDS } from '../src/anim/clips/keyed/guard_held_hands';
import { KEYED_GUARD_CHOKE_SAG } from '../src/anim/clips/keyed/guard_choke_sag';
import { KEYED_GUARD_KNIFE_COLLAPSE } from '../src/anim/clips/keyed/guard_knife_collapse';
import { OPERATORS, operatorJoints, operatorProportions } from '../src/operators/operatorBody';

type V = [number, number, number];
type M = [V, V, V];
interface Seg { yaw?: number; pitch?: number; roll?: number; dx?: number; dy?: number; dz?: number }
interface Arm { flex: number; abd: number; elbow: number; inward?: number; wrist?: { yaw?: number; pitch?: number; roll?: number } }
interface Leg { flex: number; add: number; knee: number; ankle: number }
interface Key { phase: number; pelvis: Seg; spine: Seg; chest: Seg; neck: Seg; armL: Arm; armR: Arm; legL: Leg; legR: Leg }
interface KeyFile { name: string; mirror?: boolean; frames: number; oneShot?: boolean; duration?: number; carry?: number; keys: Key[] }

const CLIPS: Record<string, KeyedClip> = {
  guard_held_stumble: KEYED_GUARD_HELD_STUMBLE,
  guard_held_hands: KEYED_GUARD_HELD_HANDS,
  guard_choke_sag: KEYED_GUARD_CHOKE_SAG,
  guard_knife_collapse: KEYED_GUARD_KNIFE_COLLAPSE,
};
const keyFile = (name: string): KeyFile => JSON.parse(readFileSync(`scripts/anim-keys/keys/${name}.json`, 'utf8')) as KeyFile;

// Wren's bind joints (the bake's armature) and the body frame scale (clips are stored at 1.75 m)
const joints = operatorJoints(operatorProportions(OPERATORS.wren));
const P: Record<string, V> = {};
const PAR: Record<string, string | null> = {};
for (const j of joints) {
  P[j.name] = [j.pos[0]!, j.pos[1]!, j.pos[2]!];
  PAR[j.name] = j.parent;
}
const H = OPERATORS.wren.height;
const K = H / 1.75;
const PELVIS_REST = P.pelvis![1] / K; // the pelvis joint's rest height at 1.75 m

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: V): number => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const mul = (A: M, B: M): M => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[r]![0] * B[0]![c]! + A[r]![1] * B[1]![c]! + A[r]![2] * B[2]![c]!)) as M;
const mv = (A: M, v: V): V => [0, 1, 2].map((r) => A[r]![0] * v[0] + A[r]![1] * v[1] + A[r]![2] * v[2]) as V;
const rx = (a: number): M => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const ry = (a: number): M => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rz = (a: number): M => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const D = Math.PI / 180;
const ypr = (o: Seg): M => mul(mul(ry(D * (o.yaw ?? 0)), rx(D * (o.pitch ?? 0))), rz(D * (o.roll ?? 0)));
const off = (n: string): V => sub(P[n]!, PAR[n] ? P[PAR[n]!]! : [0, 0, 0]);
const DOWN: V = [0, -1, 0];

/** Joint positions (Wren's metres, body frame) of one key, as key_clip.py's fk(); `heel` is the sole's back point. */
function fk(k: Key, carry: number): Record<string, V> {
  const X: Record<string, V> = {};
  const W: Record<string, M> = {};
  const pe = k.pelvis;
  W.pelvis = ypr(pe);
  X.pelvis = add(P.pelvis!, sc([pe.dx ?? 0, pe.dy ?? 0, pe.dz ?? 0], 0.01));
  for (const [n, p] of [['spine', 'pelvis'], ['chest', 'spine'], ['neck', 'chest']] as const) {
    W[n] = ypr(k[n]);
    X[n] = add(X[p]!, mv(W[p]!, off(n)));
  }
  X.head = add(X.neck!, mv(W.neck!, off('head')));
  for (const [side, s] of [['L', -1], ['R', 1]] as const) {
    const a = side === 'L' ? k.armL : k.armR;
    const sh = add(X.chest!, mv(W.chest!, off('sh' + side)));
    X['sh' + side] = sh;
    const u = mv(mul(mul(W.chest!, rx(-D * a.flex)), rz(s * D * a.abd)), DOWN);
    X['el' + side] = add(sh, sc(u, len(off('el' + side))));
    const f = mv(mul(mul(mul(W.chest!, ry(-s * D * (a.inward ?? 0))), rx(-D * (a.flex + a.elbow))), rz(s * D * (a.abd + carry))), DOWN);
    X['wr' + side] = add(X['el' + side]!, sc(f, len(off('wr' + side))));
    const g = side === 'L' ? k.legL : k.legR;
    const hip = add(X.pelvis!, mv(W.pelvis!, off('hip' + side)));
    X['hip' + side] = hip;
    const ad = rz(-s * D * g.add);
    const thigh = mul(mul(W.pelvis!, rx(-D * g.flex)), ad);
    X['kn' + side] = add(hip, sc(mv(thigh, DOWN), len(off('kn' + side))));
    const shin = mul(mul(W.pelvis!, rx(-D * (g.flex - g.knee))), ad);
    X['an' + side] = add(X['kn' + side]!, sc(mv(shin, DOWN), len(off('an' + side))));
    const foot = mul(shin, rx(-D * g.ankle));
    X['toe' + side] = add(X['an' + side]!, mv(foot, off('toe' + side)));
    X['heel' + side] = add(X['an' + side]!, mv(foot, [0, -P['an' + side]![1], -0.05]));
  }
  return X;
}

/** The key list the bake uses (mirrored keys added, sorted by phase). */
function bakeKeys(f: KeyFile): Key[] {
  const keys = [...f.keys];
  if (f.mirror) {
    for (const k of f.keys) {
      const m = { ...k, phase: k.phase + 0.5 } as Key;
      for (const seg of ['pelvis', 'spine', 'chest', 'neck'] as const) {
        const e = { ...k[seg] };
        for (const a of ['dx', 'yaw', 'roll'] as const) if (e[a] !== undefined) e[a] = -e[a];
        m[seg] = e;
      }
      m.armL = k.armR; m.armR = k.armL; m.legL = k.legR; m.legR = k.legL;
      keys.push(m);
    }
  }
  return keys.sort((a, b) => a.phase - b.phase);
}

const qAngle = (q: ArrayLike<number>, o: number): number => 2 * Math.acos(Math.min(1, Math.abs(q[o + 3]!))) / D;
const qDot = (a: ArrayLike<number>, b: ArrayLike<number>, o: number): number => Math.abs(a[o]! * b[o]! + a[o + 1]! * b[o + 1]! + a[o + 2]! * b[o + 2]! + a[o + 3]! * b[o + 3]!);
/** Seconds between two baked frames: a one-shot spans its duration over frames - 1 steps; the stumble ~1 s a cycle, the hands 2.4 s. */
const PERIOD: Record<string, number> = { guard_held_stumble: 1.0, guard_held_hands: 2.4 };
function frameDt(name: string, c: KeyedClip, f: KeyFile): number {
  return f.oneShot ? f.duration! / (c.frames - 1) : PERIOD[name]! / c.frames;
}

describe('guard hold clips: sampling and ranges', () => {
  for (const [name, c] of Object.entries(CLIPS)) {
    const f = keyFile(name);
    it(`${name}: imports, frames as keyed, samples without NaN, unit quaternions, a keyed wrist frame`, () => {
      expect(c.name).toBe(name);
      expect(c.frames).toBe(f.frames);
      expect(c.wrist).not.toBeNull();
      const o = newKeyedPose();
      for (let i = 0; i <= 200; i++) {
        const ph = f.oneShot ? (i / 200) * ((c.frames - 1) / c.frames) : i / 200;
        sampleKeyed(c, ph, 1, o);
        for (const v of [...o.pel, ...o.q, ...o.arm, ...o.wrist]) expect(Number.isFinite(v)).toBe(true);
        for (let s = 0; s < 16; s += 4) expect(Math.hypot(o.q[s]!, o.q[s + 1]!, o.q[s + 2]!, o.q[s + 3]!)).toBeCloseTo(1, 5);
        expect(o.hasWrist).toBe(1);
      }
    });

    it(`${name}: joints within the realism standard's ranges (bible 5.12.2 item 4)`, () => {
      const N = c.frames;
      for (let fr = 0; fr < N; fr++) {
        const q = c.q.subarray(fr * 16, fr * 16 + 16);
        // spine, chest and neck relative to their parents: the trunk bends, it does not fold
        expect(qAngle(q, KQ.spine)).toBeLessThan(40);
        expect(qAngle(q, KQ.chest)).toBeLessThan(40);
        expect(qAngle(q, KQ.neck)).toBeLessThan(80);
        const a = c.arm.subarray(fr * 12, fr * 12 + 12);
        for (const [e, w] of [[KA.elbowL, KA.wristL], [KA.elbowR, KA.wristR]] as const) {
          const el: V = [a[e]!, a[e + 1]!, a[e + 2]!];
          const fa: V = sub([a[w]!, a[w + 1]!, a[w + 2]!], el);
          const cos = (el[0] * fa[0] + el[1] * fa[1] + el[2] * fa[2]) / (len(el) * len(fa));
          const flex = Math.acos(Math.max(-1, Math.min(1, cos))) / D;
          expect(flex).toBeLessThanOrEqual(150);
          // segment lengths as Wren's (the arm points are scaled to 1.75 m)
          expect(len(el)).toBeCloseTo(len(off('elL')) / K, 2);
          expect(len(fa)).toBeCloseTo(len(off('wrL')) / K, 2);
        }
        // the wrist swings the hand at most 70 deg off the forearm's line (the twist about it is the forearm's)
        const wq = c.wrist!.subarray(fr * 8, fr * 8 + 8);
        for (const o of [KW.wristL, KW.wristR]) {
          const [x, y, z, w] = [wq[o]!, wq[o + 1]!, wq[o + 2]!, wq[o + 3]!];
          // (0, -1, 0) rotated by q: its y component
          const hy = -(1 - 2 * (x * x + z * z));
          const hx = -2 * (x * y - w * z);
          const hz = -2 * (y * z + w * x);
          const swing = Math.acos(Math.max(-1, Math.min(1, -hy / Math.hypot(hx, hy, hz)))) / D;
          expect(swing).toBeLessThan(70);
        }
      }
    });

    it(`${name}: continuous (no joint over 25 deg, the pelvis under 4 cm, per 60 Hz frame)`, () => {
      const N = c.frames;
      const k = 1 / 60 / frameDt(name, c, f);
      const last = f.oneShot ? N - 1 : N;
      for (let fr = 0; fr < last; fr++) {
        const g = (fr + 1) % N;
        for (let s = 0; s < 16; s += 4) {
          const d = 2 * Math.acos(Math.min(1, qDot(c.q.subarray(fr * 16), c.q.subarray(g * 16), s))) / D;
          expect(d * k).toBeLessThan(25);
        }
        const dp = Math.hypot(c.pel[g * 3]! - c.pel[fr * 3]!, c.pel[g * 3 + 1]! - c.pel[fr * 3 + 1]!, c.pel[g * 3 + 2]! - c.pel[fr * 3 + 2]!);
        expect(dp * K * k).toBeLessThan(0.04);
      }
    });

    it(`${name}: no joint below the floor at any key (1 cm)`, () => {
      for (const key of bakeKeys(f)) {
        const X = fk(key, f.carry ?? 5);
        for (const [n, p] of Object.entries(X)) {
          if (p[1] < -0.01) throw new Error(`${name} phase ${key.phase}: ${n} at ${p[1].toFixed(3)} m`);
        }
      }
    });
  }
});

describe('guard hold clips: what each one does', () => {
  it('the stumble: feet on or skimming the ground, one foot always planted, knees soft and apart, weight behind the feet', () => {
    const f = keyFile('guard_held_stumble');
    for (const key of bakeKeys(f)) {
      const X = fk(key, f.carry ?? 5);
      const sole = (s: string) => Math.min(X['toe' + s]![1], X['heel' + s]![1]);
      const lo = Math.min(sole('L'), sole('R'));
      const hi = Math.max(sole('L'), sole('R'));
      expect(lo).toBeGreaterThan(-0.01);
      expect(lo).toBeLessThan(0.01); // a planted foot
      expect(hi).toBeLessThan(0.035); // the other drags or skims
      for (const s of ['L', 'R'] as const) {
        const g = s === 'L' ? key.legL : key.legR;
        expect(g.knee).toBeGreaterThanOrEqual(0);
        expect(g.knee).toBeLessThan(60);
      }
      expect(Math.abs(X.knL![0] - X.knR![0])).toBeGreaterThanOrEqual(0.09);
      expect(X.pelvis![2]).toBeLessThan((X.anL![2] + X.anR![2]) / 2);
    }
    // the trunk arched back onto the holder through the whole cycle
    const o = newKeyedPose();
    for (let i = 0; i < 16; i++) {
      sampleKeyed(KEYED_GUARD_HELD_STUMBLE, i / 16, 1, o);
      expect(o.pel[2]).toBeLessThan(-0.04);
    }
  });

  it('the hands: both hands up in front of the throat at chin height, elbows below and outside the hands', () => {
    const c = KEYED_GUARD_HELD_HANDS;
    for (let fr = 0; fr < c.frames; fr++) {
      const a = c.arm.subarray(fr * 12, fr * 12 + 12);
      for (const [e, w, s] of [[KA.elbowL, KA.wristL, -1], [KA.elbowR, KA.wristR, 1]] as const) {
        expect(a[w + 1]!).toBeGreaterThan(-0.1); // the wrist near shoulder height (chin and chest), not at the waist
        expect(a[w + 2]!).toBeGreaterThan(0.05); // in front of the shoulder line
        expect(a[e + 1]!).toBeLessThan(a[w + 1]! - 0.1); // the elbow down
        expect(s * a[e]!).toBeGreaterThan(s * a[w]!); // and out
      }
    }
  });

  for (const name of ['guard_choke_sag', 'guard_knife_collapse']) {
    it(`${name}: starts in the hold, ends lying still with the pelvis near the floor`, () => {
      const c = CLIPS[name]!;
      const f = keyFile(name);
      expect(f.oneShot).toBe(true);
      const N = c.frames;
      const o = newKeyedPose();
      sampleKeyed(c, (N - 1) / N, 1, o);
      expect(PELVIS_REST + o.pel[1]!).toBeLessThan(0.15); // the pelvis joint ~10 cm off the floor at 1.75 m
      // held still over the last second
      const lastS = Math.floor(1 / frameDt(name, c, f));
      for (let fr = N - 1 - lastS; fr < N; fr++) {
        for (let k = 0; k < 3; k++) expect(c.pel[fr * 3 + k]).toBeCloseTo(c.pel[(N - 1) * 3 + k]!, 3);
      }
      // the first frame is the hold: standing, hands up as in the held clip
      expect(Math.abs(c.pel[1]!)).toBeLessThan(0.05);
      const h = KEYED_GUARD_HELD_HANDS;
      expect(Math.abs(c.arm[KA.wristR + 1]! - h.meanArm[KA.wristR + 1]!)).toBeLessThan(0.04);
    });
  }

  it('the sag lowers him (no drop): the pelvis never falls faster than 1.2 m/s; the collapse goes forward, the sag back', () => {
    const c = KEYED_GUARD_CHOKE_SAG;
    const dt = frameDt('guard_choke_sag', c, keyFile('guard_choke_sag'));
    for (let fr = 1; fr < c.frames; fr++) expect(((c.pel[(fr - 1) * 3 + 1]! - c.pel[fr * 3 + 1]!) * K) / dt).toBeLessThan(1.2);
    expect(c.pel[(c.frames - 1) * 3 + 2]!).toBeLessThan(-0.2);
    const k = KEYED_GUARD_KNIFE_COLLAPSE;
    expect(k.pel[(k.frames - 1) * 3 + 2]!).toBeGreaterThan(0.3);
    // brief: lying by 2 s of its 3
    const kd = frameDt('guard_knife_collapse', k, keyFile('guard_knife_collapse'));
    const at2 = Math.ceil(2 / kd);
    expect(PELVIS_REST + k.pel[at2 * 3 + 1]!).toBeLessThan(0.15);
  });
});
