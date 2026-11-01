// (mixamo-retarget M4) The channel-clip emitter for traversal (scripts/mocap/mixamoChannels.mjs): the game numbers it fits
// read back from their source files, the key reduction's error bound on the game's own curves, the loop clock (the
// cadence's reach starts), the climb-up warp landing its events on the game's constants, a synthetic hang loop end to
// end, the source-row block writer, and every committed trav_<slug>.ts module (built through makeClip at import, header,
// events, its source row and Chamber loop).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as chanMod from '../scripts/mocap/mixamoChannels.mjs';
import type { Clip } from '../src/anim/clip';
import { makeClip } from '../src/anim/clip';
import { curve, evalCurve } from '../src/anim/curves';
import { CH, CHANNELS, type Channel } from '../src/anim/pose';
import { CLIMB_UP, CLIMB_UP_CROUCH_K } from '../src/anim/clips/traverse';
import { MOCAP_SOURCES } from '../src/anim/mocapSources';
import { TRAV_ENTRIES } from '../src/anim/chamberTraversal';

type V = number[];
interface Recipe { slug: string; emit: 'chanLoop' | 'chanPath'; family: string; chamber: string; replaces: string; end?: string }
interface Anchor { name: string; t: number; k: number }
interface Res { ts: number[]; series: Record<string, number[]>; loop: boolean; events: Record<string, number>; seconds: number; reach: { L: number | null; R: number | null } }
interface Red { keys: Record<string, number[]>; err: Record<string, number>; nKeys: number }
interface Take { take: string; frames: number; pos: Map<string, V[]>; quat: Map<string, V[]>; skel: { bones: Map<string, { length: number; dir: V }> }; report?: { file: string } }
const M = chanMod as {
  TOL: { pos: number; ang: number };
  GAME: {
    hang: { drop: number; out: number; hands: V };
    climbHands: V;
    climbUp: { lipDrop: number; k1: number; k2: number; fwd0: number; outK: number; out: number; endIn: number; time: number; crouchK: number; handsK0: number; handsSpan: number; offGripK: number };
    ladder: { standoff: number; topIn: number; time: number };
  };
  EVENT_K: { release: number; onTop: number; crouch: number };
  TRAV_RECIPES: Recipe[];
  CHANNEL_ORDER: string[];
  curveOf: (kv: number[], loop?: boolean, period?: number) => unknown;
  evalCurveJs: (c: unknown, x: number) => number;
  reduceKeys: (ts: number[], vs: number[], tol: number, loop?: boolean, period?: number) => { kv: number[]; err: number };
  loopTime: (ph: number, T: number, tR: number | null, tL: number | null) => number;
  pathTime: (k: number, a: Anchor[]) => number;
  pathK: (t: number, a: Anchor[]) => number;
  pathAnchors: (ev: { onTop: number | null; release: number | null; crouch: number | null }, end: number, endKind?: string) => { anchors: Anchor[]; dropped: string[] };
  standardBody: (take: Take, facing?: V | null) => { n: number; T: number };
  reachStarts: (B: unknown) => { L: number | null; R: number | null };
  loopChannels: (B: unknown, r: Recipe) => Res;
  reduceAll: (res: Res) => Red;
  buildClip: (r: Recipe, take: Take) => { source: string; row: string; res: Res; red: Red };
  sourceRow: (r: Recipe, file: string) => string;
  writeRows: (text: string, rows: string[]) => string;
  titleOf: (file: string) => string;
};

const src = (p: string) => readFileSync(p, 'utf8');
const num = (text: string, re: RegExp): number => {
  const m = text.match(re);
  expect(m, String(re)).not.toBeNull();
  return Number(m![1]);
};

describe('mixamoChannels: the game numbers', () => {
  it('match their source files (attachController, moveState, traverse, anchors, attach)', () => {
    const ac = src('src/player/attachController.ts');
    const G = M.GAME.climbUp;
    expect(G.crouchK).toBe(CLIMB_UP_CROUCH_K);
    expect(G.time).toBe(num(ac, /export const CLIMB_UP_TIME = ([\d.]+);/));
    const path = ac.match(/export const CLIMB_UP_PATH = \{([^}]*)\}/)![1]!;
    for (const k of ['lipDrop', 'k1', 'k2', 'fwd0', 'outK'] as const) expect(G[k], k).toBe(num(path, new RegExp(`${k}: ([\\d.]+)`)));
    expect(path).toContain('fwdSpan: CLIMB_UP_CROUCH_K - 0.33');
    expect(ac).toMatch(new RegExp(`Math\\.min\\(1, k / P\\.outK\\)\\) \\* ${G.out}`));
    expect(ac).toContain(`(HANG.out + ${G.endIn})`);
    expect(M.GAME.ladder.time).toBe(num(ac, /export const LADDER_TOPOUT_TIME = ([\d.]+);/));
    expect(M.GAME.ladder.topIn).toBe(num(ac, /export const LADDER_TOPOUT_IN = ([\d.]+);/));
    expect(M.GAME.ladder.standoff).toBe(num(src('src/player/attach.ts'), /export const CLIMB_STANDOFF = ([\d.]+);/));
    const hands = src('src/player/moveState.ts').match(/export const CLIMB_UP_HANDS = \{ k0: ([\d.]+), span: ([\d.]+) \}/)!;
    expect([G.handsK0, G.handsSpan]).toEqual([Number(hands[1]), Number(hands[2])]);
    const hang = src('src/world/anchors.ts').match(/export const HANG = \{[^}]*drop: ([\d.]+),[^}]*out: ([\d.]+),/)!;
    expect([M.GAME.hang.drop, M.GAME.hang.out]).toEqual([Number(hang[1]), Number(hang[2])]);
    // the foot on top's anchor: CLIMB_UP's offGrip rise (0 up to it, rising after it)
    const off = CLIMB_UP.curves[CH.offGrip]!;
    expect(evalCurve(off, G.offGripK)).toBeCloseTo(0, 6);
    expect(evalCurve(off, G.offGripK + 0.02)).toBeGreaterThan(0);
    expect(evalCurve(off, G.offGripK - 0.02)).toBeCloseTo(0, 6);
    expect(M.EVENT_K).toEqual({ release: G.handsK0, onTop: G.offGripK, crouch: CLIMB_UP_CROUCH_K });
  });

  it('every channel a module keys is a pose channel', () => {
    for (const ch of M.CHANNEL_ORDER) expect(CHANNELS as readonly string[], ch).toContain(ch);
  });
});

describe('mixamoChannels: key reduction', () => {
  it('the curve copy is the game curve (curves.ts), open and looped', () => {
    const kv = [0, 0.1, 0.2, 0.5, 0.45, 0.4, 0.7, -0.3, 0.9, 0.2];
    for (const loop of [false, true]) {
      const a = M.curveOf(kv, loop, 1), b = curve(kv, loop, 1);
      for (let x = -0.2; x <= 1.2; x += 0.013) expect(M.evalCurveJs(a, x), `${loop} ${x}`).toBeCloseTo(evalCurve(b, x), 9);
    }
  });

  it('holds every sample within the bound on the game curve, with far fewer keys', () => {
    const N = 400;
    const ts = Array.from({ length: N }, (_, i) => i / N);
    const sigs: [string, (x: number) => number, number, boolean][] = [
      ['smooth pos', (x) => 0.3 * Math.sin(2 * Math.PI * x) + 0.1 * Math.sin(6 * Math.PI * x), M.TOL.pos, true],
      ['step-ish pos', (x) => 0.4 / (1 + Math.exp(-40 * (x - 0.5))), M.TOL.pos, false],
      ['angle', (x) => 1.2 * Math.sin(2 * Math.PI * x) * Math.cos(4 * Math.PI * x), M.TOL.ang, true],
      ['noisy', (x) => 0.2 * x + 0.004 * Math.sin(97 * x), M.TOL.pos, false],
    ];
    for (const [name, f, tol, loop] of sigs) {
      const vs = ts.map(f);
      const { kv, err } = M.reduceKeys(ts, vs, tol, loop, 1);
      expect(err, name).toBeLessThanOrEqual(tol);
      expect(kv.length / 2, name).toBeLessThan(N / 4);
      const c = curve(kv, loop, 1);
      for (let i = 0; i < N; i++) expect(Math.abs(evalCurve(c, ts[i]!) - vs[i]!), `${name} @${ts[i]}`).toBeLessThanOrEqual(tol + 1e-9);
    }
  });

  it('a channel within the bound everywhere is one flat key', () => {
    const ts = [0, 0.25, 0.5, 0.75];
    expect(M.reduceKeys(ts, [0.1, 0.104, 0.098, 0.1], M.TOL.pos).kv).toEqual([0, 0.101]);
  });
});

describe('mixamoChannels: clocks', () => {
  it('a loop: the right reach at phase 0, the left at 0.5, linear between, wrapping', () => {
    const T = 1.2, tR = 0.9, tL = 0.3;
    expect(M.loopTime(0, T, tR, tL)).toBeCloseTo(tR, 9);
    expect(M.loopTime(0.5, T, tR, tL)).toBeCloseTo(tL, 9);
    expect(M.loopTime(1, T, tR, tL)).toBeCloseTo(tR, 9);
    expect(M.loopTime(0.25, T, tR, tL)).toBeCloseTo((tR + 0.3) % T, 9); // half of the 0.6 s gap R -> L (wrapping)
    expect(M.loopTime(0.75, T, tR, tL)).toBeCloseTo(0.6, 9); // half of the 0.6 s gap L -> R
    // no reaches: its own seconds from the first frame
    expect(M.loopTime(0.25, T, null, null)).toBeCloseTo(0.3, 9);
  });

  it('a climb-up: release, foot on top and crouch land on CLIMB_UP_HANDS.k0, the offGrip rise and CLIMB_UP_CROUCH_K', () => {
    const { anchors, dropped } = M.pathAnchors({ release: 0.6, onTop: 0.9, crouch: 1.4 }, 2.5, 'stand');
    expect(dropped).toEqual([]);
    expect(anchors.map((a) => [a.name, a.k])).toEqual([['start', 0], ['release', M.EVENT_K.release], ['onTop', M.EVENT_K.onTop], ['crouch', M.EVENT_K.crouch], ['end', 1]]);
    expect(M.pathTime(M.EVENT_K.release, anchors)).toBeCloseTo(0.6, 9);
    expect(M.pathTime(M.EVENT_K.onTop, anchors)).toBeCloseTo(0.9, 9);
    expect(M.pathTime(M.EVENT_K.crouch, anchors)).toBeCloseTo(1.4, 9);
    expect(M.pathTime(1, anchors)).toBeCloseTo(2.5, 9);
    for (let k = 0; k <= 1; k += 0.05) expect(M.pathK(M.pathTime(k, anchors), anchors)).toBeCloseTo(k, 9);
    // monotone
    let prev = -1;
    for (let k = 0; k <= 1; k += 0.01) { const t = M.pathTime(k, anchors); expect(t).toBeGreaterThanOrEqual(prev); prev = t; }
  });

  it('a clip ending crouched ends on CLIMB_UP_CROUCH_K; an event out of order (on top before the release) is dropped', () => {
    const c = M.pathAnchors({ release: 0.5, onTop: 0.8, crouch: null }, 1.1, 'crouch');
    expect(c.anchors.at(-1)).toEqual({ name: 'crouch', t: 1.1, k: M.EVENT_K.crouch });
    const d = M.pathAnchors({ release: 0.7, onTop: 0.4, crouch: 1.2 }, 2, 'stand');
    expect(d.anchors.map((a) => a.name)).toEqual(['start', 'release', 'crouch', 'end']);
    expect(d.dropped[0]).toMatch(/^onTop/);
    const e = M.pathAnchors({ release: null, onTop: 0.4, crouch: 1.2 }, 2, 'stand');
    expect(e.dropped).toContain('release (not found)');
  });
});

// a synthetic hanging loop (1 s, 120 fps, the last frame the first): a standard-ish body facing +z, arms overhead; the
// right arm reaches out to +x fast from 0.2 s (0.1 s) and back slowly, the left to -x from 0.7 s
const SLOTS = ['root', 'lhipjoint', 'rhipjoint', 'lfemur', 'rfemur', 'ltibia', 'rtibia', 'lfoot', 'rfoot', 'ltoes', 'rtoes', 'lclavicle', 'rclavicle', 'lhumerus', 'rhumerus', 'lradius', 'rradius', 'lhand', 'rhand', 'thorax', 'head'];
const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const reachUp = (t: number, t0: number) => {
  const u = (((t - t0) % 1) + 1) % 1;
  return u < 0.1 ? 0.15 * smoothstep(u / 0.1) : u < 0.6 ? 0.15 * (1 - smoothstep((u - 0.1) / 0.5)) : 0;
};
function hangTake(): Take {
  const n = 121;
  const pos = new Map<string, V[]>(SLOTS.map((s) => [s, []]));
  const quat = new Map<string, V[]>(SLOTS.map((s) => [s, []]));
  for (let i = 0; i < n; i++) {
    const t = i / 120;
    const put = (s: string, p: V) => pos.get(s)!.push(p);
    put('root', [0, 1.0, 0]);
    for (const [sd, x] of [['l', -0.09], ['r', 0.09]] as const) {
      put(`${sd}hipjoint`, [x, 1.0, 0]);
      put(`${sd}femur`, [x, 0.6, 0.02]);
      put(`${sd}tibia`, [x, 0.18, 0]);
      put(`${sd}foot`, [x, 0.05, 0.12]);
      put(`${sd}toes`, [x, 0.04, 0.18]);
      const out = 2 * reachUp(t, sd === 'r' ? 0.2 : 0.7) * Math.sign(x);
      put(`${sd}clavicle`, [x * 2, 1.5, 0.05]);
      put(`${sd}humerus`, [x * 2 + out, 1.8, 0.1]);
      put(`${sd}radius`, [x * 2 + out, 2.06, 0.15]);
      put(`${sd}hand`, [x * 2 + out, 2.14, 0.16]);
    }
    for (const s of SLOTS) quat.get(s)!.push([0, 0, 0, 1]);
  }
  const bones = new Map<string, { length: number; dir: V }>([
    ['lfemur', { length: 0.4, dir: [0, -1, 0] }], ['rfemur', { length: 0.4, dir: [0, -1, 0] }],
    ['ltibia', { length: 0.42, dir: [0, -1, 0] }], ['rtibia', { length: 0.42, dir: [0, -1, 0] }],
    ['lfoot', { length: 0.15, dir: [0, -0.5, 0.866] }], ['rfoot', { length: 0.15, dir: [0, -0.5, 0.866] }],
  ]);
  return { take: 'synthetic hang', frames: n, pos, quat, skel: { bones }, report: { file: 'Synthetic Hang (test).fbx' } };
}
const SHIMMY: Recipe = { slug: 'synthetic_hang', emit: 'chanLoop', family: 'hang', chamber: 'trav:ledge', replaces: 'HANG' };

describe('mixamoChannels: a synthetic hang loop end to end', () => {
  it('finds each hand reach start, keys the loop on the cadence and holds the bound on the game curve', () => {
    const take = hangTake();
    const B = M.standardBody(take);
    expect(B.T).toBeCloseTo(1, 9);
    const reach = M.reachStarts(B);
    expect(reach.R!).toBeGreaterThanOrEqual(0.2);
    expect(reach.R!).toBeLessThan(0.22);
    expect(reach.L!).toBeGreaterThanOrEqual(0.7);
    expect(reach.L!).toBeLessThan(0.72);
    const c = M.buildClip(SHIMMY, take);
    expect(c.res.events).toEqual({ rReach: 0, lReach: 0.5 });
    // the cadence: phase 0 is the right reach's start (the right palm still in, out to +x just after); 0.5 the left's
    const hRY = c.res.series.hRY!, hLY = c.res.series.hLY!, hRX = c.res.series.hRX!, hLX = c.res.series.hLX!;
    const N = hRY.length;
    expect(hRX[Math.round(N * 0.1)]! - hRX[0]!).toBeGreaterThan(0.1);
    expect(hLX[Math.round(N * 0.6)]! - hLX[N / 2]!).toBeLessThan(-0.1);
    // placed by the hands: their mean on HANG's grip height and depth
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect((mean(hLY) + mean(hRY)) / 2).toBeCloseTo(M.GAME.hang.hands[1]!, 6);
    expect((mean(c.res.series.hLZ!) + mean(c.res.series.hRZ!)) / 2).toBeCloseTo(M.GAME.hang.hands[2]!, 6);
    // every keyed channel through the game's own clip builder within the bound at every dense sample
    const clip = makeClip({ name: 'mocap_synthetic_hang', duration: 1, loop: true, keys: c.red.keys as Partial<Record<Channel, number[]>> });
    for (const [ch, vs] of Object.entries(c.res.series)) {
      const tol = /Pitch|Roll|Yaw/.test(ch) ? M.TOL.ang : M.TOL.pos;
      const cv = clip.curves[CH[ch as Channel]]!;
      for (let i = 0; i < vs.length; i++) expect(Math.abs(evalCurve(cv, c.res.ts[i]!) - vs[i]!), `${ch} @${i}`).toBeLessThanOrEqual(tol + 1e-9);
    }
    // the module text: the generated header first, the clip name, a loop
    expect(c.source.split('\n')[0]).toMatch(/^\/\/ GENERATED by scripts\/mocap\/mixamoChannels\.mjs .*Do not edit/);
    expect(c.source).toContain("name: 'mocap_synthetic_hang'");
    expect(c.source).toContain('loop: true');
    expect(c.source).toContain('"Synthetic Hang"');
  });
});

describe('mixamoChannels: the source rows', () => {
  it('rewrites only the @mixamo-trav block, the markers kept', () => {
    const text = ['a', '  // @mixamo-keyed-begin', '  k1', '  // @mixamo-keyed-end', '  // @mixamo-trav-begin (M4)', '  old', '  // @mixamo-trav-end', 'z'].join('\n');
    const out = M.writeRows(text, ['  r1', '  r2']);
    expect(out).toBe(['a', '  // @mixamo-keyed-begin', '  k1', '  // @mixamo-keyed-end', '  // @mixamo-trav-begin (M4)', '  r1', '  r2', '  // @mixamo-trav-end', 'z'].join('\n'));
    expect(() => M.writeRows('no markers', [])).toThrow(/marker block/);
  });

  it('a row names the Mixamo title, the file, the credit and the Chamber loop', () => {
    expect(M.titleOf('Kneel Down (lay body).fbx')).toBe('Kneel Down');
    expect(M.sourceRow(M.TRAV_RECIPES[0]!, 'Hanging Idle.fbx')).toBe(
      "  mocap_hanging_idle: { source: 'mixamo', title: 'Hanging Idle', take: 'Hanging Idle.fbx', credit: MIXAMO_CREDIT, chamber: { kind: 'trav', loop: 'trav:ledge' } },",
    );
  });
});

// every committed module (generated by the script from the real dumps)
const MODULES = import.meta.glob('../src/anim/clips/mixamo/trav_*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
const TEXT = import.meta.glob('../src/anim/clips/mixamo/trav_*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('mixamoChannels: the committed modules', () => {
  it('one module per traversal recipe, nothing else', () => {
    const files = Object.keys(MODULES).map((p) => p.replace(/^.*\/trav_(.*)\.ts$/, '$1')).sort();
    expect(files).toEqual(M.TRAV_RECIPES.map((r) => r.slug).sort());
  });

  for (const r of M.TRAV_RECIPES) {
    it(`${r.slug}: built through makeClip, its header, clock, events, row and Chamber loop`, () => {
      const path = `../src/anim/clips/mixamo/trav_${r.slug}.ts`;
      const mod = MODULES[path]!;
      const text = TEXT[path]!;
      expect(text.split(/\r?\n/)[0]).toMatch(/^\/\/ GENERATED by scripts\/mocap\/mixamoChannels\.mjs .*Do not edit/);
      const C = `MOCAP_${r.slug.toUpperCase()}`;
      const clip = mod[C] as Clip;
      expect(clip.name).toBe(`mocap_${r.slug}`);
      expect(clip.duration).toBe(1);
      expect(clip.loop).toBe(r.emit === 'chanLoop');
      expect(mod[`${C}_SECONDS`]).toBeGreaterThan(0.3);
      // makeClip: every key a pose channel with a curve, ascending times inside the clip
      expect(clip.keyed.length).toBeGreaterThanOrEqual(20);
      for (const i of clip.keyed) {
        expect(Number.isInteger(i), `${r.slug} channel ${i}`).toBe(true);
        const c = clip.curves[i]!;
        for (let j = 1; j < c.t.length; j++) expect(c.t[j]!).toBeGreaterThan(c.t[j - 1]!);
        expect(c.t[0]).toBeGreaterThanOrEqual(0);
        expect(c.t[c.t.length - 1]!).toBeLessThanOrEqual(1);
        for (let x = 0; x <= 1; x += 0.05) expect(Number.isFinite(evalCurve(c, x))).toBe(true);
      }
      // the hands stay within an arm of the body on the 1.75 m frame
      for (let x = 0; x <= 1; x += 0.05) {
        const hy = evalCurve(clip.curves[CH.hLY]!, x);
        expect(hy, `${r.slug} hLY @${x}`).toBeGreaterThan(-0.5);
        expect(hy, `${r.slug} hLY @${x}`).toBeLessThan(2.6);
      }
      if (r.emit === 'chanPath') {
        // the warp's anchored events on the game's constants; every event inside the clip
        expect(clip.events.release).toBe(M.EVENT_K.release);
        expect(clip.events.crouch).toBe(M.EVENT_K.crouch);
        if (clip.events.onTop !== undefined) {
          const anchored = clip.events.onTop === M.EVENT_K.onTop;
          expect(anchored || /dropped: onTop/.test(text), `${r.slug}: on top anchored or listed as dropped`).toBe(true);
        }
        // the hand-over to the game's crouch / stand: hands back on the gun and the pelvis home at the end
        expect(evalCurve(clip.curves[CH.offGrip]!, 1)).toBe(1);
        if (r.end === 'crouch') expect(clip.curves[CH.pelY]!.t.at(-1)!).toBeLessThanOrEqual(M.EVENT_K.crouch + 1e-9);
      } else if (r.slug !== 'hanging_idle') {
        expect(clip.events).toEqual({ rReach: 0, lReach: 0.5 });
      }
      // the source row (M5's table, the M4 block) and its Chamber loop
      const row = MOCAP_SOURCES[`mocap_${r.slug}`]!;
      expect(row.source).toBe('mixamo');
      expect(row.chamber).toEqual({ kind: 'trav', loop: r.chamber });
      expect(TRAV_ENTRIES.some((t) => t.id === r.chamber)).toBe(true);
    });
  }
});
