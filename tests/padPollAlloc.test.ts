/**
 * player-hygiene S2 (H2, the pad half): the pad poll (`GamepadSource.poll`, every frame) makes no per-frame garbage, and
 * behaves bit-identically.
 *
 * (a) Sweeps against the fixture: `applyRadialDeadzone` / `applyCurve` over a grid of sticks, dead zones, outer edges
 *     and curves (`stick`); `mapPad` over every button, analog values, triggers against their dead zone, an axes grid
 *     (the 0.55 menu threshold, |x| = |y| ties), tunings and two binding tables (`map`); a scripted ~200-poll run of a
 *     `GamepadSource` on a stubbed `window` / `navigator.getGamepads` into a real `InputState` (`poll`: connect, press,
 *     triggers, stick sweeps, the D-pad repeat, the look acceleration, ADS, a rebinding, a second pad taking over, both
 *     disconnecting). After the refactor the `...To` / `mapPadInto` forms are checked against the same hashes as the
 *     wrappers (`mapPadInto` through ONE reused frame for every case: proves the buttons record is cleared).
 * (b) `bytesPerCall` (BRIEF A1: <= `HEAP_NUMBER`, a boxed double at a non-inlined call) on `poll` with a no-allocation
 *     stub `InputState`, per state (at rest, pushed with fire and aim, D-pad held repeating, right stick at full
 *     deflection), and on `mapPadInto` alone. `navigator.getGamepads()` returns one fixed array (A2: the browser's fresh
 *     array is outside the claim). Logged with `console.info`, with a sampling heap profile's allocators when over 16 B.
 * (c) The refactor flag: `REFACTORED` (`gamepadMapping.mapPadInto` exists). Before it the Into checks are skipped and the
 *     readings only logged; the test file and fixture do not change between the parity record and the refactor.
 *
 * Fixture: `tests/fixtures/player-hygiene-s2.json`. `PH_S2_WRITE=1` rewrites it; only ever run that on the pre-refactor
 * code (the parity record). Values are hashed as float64 bit patterns (cyrb53 over the two words, as
 * `tests/helpers/animSkeletonIdentity.ts`) with -0 kept distinct from +0 (the arithmetic is the same, so the signs are).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BUTTON_ACTIONS, type ButtonAction, type Vec2 } from '../src/input/actions';
import * as gm from '../src/input/gamepadMapping';
import { GAME_BINDINGS, mapPad, PAD, type PadFrame, type PadSnapshot, type PadTuning } from '../src/input/gamepadMapping';
import * as sm from '../src/input/stickMath';
import { applyCurve, applyRadialDeadzone, type CurveKind } from '../src/input/stickMath';
import { assignPadBind, defaultPadBinds, padBindTable } from '../src/input/padBinds';
import { InputState } from '../src/input/inputState';
import { GamepadSource } from '../src/input/gamepadSource';
import type { Settings } from '../src/core/settings';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';

const FIXTURE = path.resolve(__dirname, 'fixtures/player-hygiene-s2.json');
const WRITE = !!process.env.PH_S2_WRITE;
/** The refactor is in (the Into form it adds). */
const REFACTORED = typeof (gm as unknown as Record<string, unknown>).mapPadInto === 'function';
const DT = 1 / 60;
const ALLOC = { n: 1000, warm: 20000 };

type Table = ReadonlyArray<readonly [number, ButtonAction]>;
/** The refactor's frame buffer (read through casts so this file compiles on the pre-refactor code too). */
interface FrameBuf extends PadFrame {
  readonly setList: ButtonAction[];
  setCount: number;
}
const gmx = gm as unknown as {
  mapPadInto?: (p: PadSnapshot, t: PadTuning, table: Table, f: FrameBuf) => unknown;
  newPadFrame?: () => FrameBuf;
};
const smx = sm as unknown as {
  applyRadialDeadzoneTo?: (x: number, y: number, inner: number, outer: number, out: Vec2) => Vec2;
  applyCurveTo?: (v: Vec2, curve: CurveKind, out: Vec2) => Vec2;
};

class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  n = 0;
  add(v: number): void {
    this.f[0] = v; // -0 kept distinct
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  str(s: string): void {
    this.add(s.length);
    for (let i = 0; i < s.length; i++) this.add(s.charCodeAt(i));
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

interface Sweep {
  n: number;
  hash: string;
  last: number[];
}
interface Run {
  steps: number;
  hash: string;
  last: number[];
}
interface Fixture {
  stick: Record<string, Sweep>;
  map: Record<string, Sweep>;
  poll: Record<string, Run>;
}
const got: Fixture = { stick: {}, map: {}, poll: {} };
const want: Fixture | null = WRITE ? null : (JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture);
/** `last` goes through JSON: -0 as +0 there (the hash keeps the sign). */
const plain = (a: number[]): number[] => a.map((v) => (v === 0 ? 0 : v));

/** Records (write mode, the wrapper pass only) or checks one result against the fixture. */
function check(group: 'stick' | 'map', name: string, v: Sweep, record: boolean): void;
function check(group: 'poll', name: string, v: Run, record: boolean): void;
function check(group: keyof Fixture, name: string, v: Sweep | Run, record: boolean): void {
  if (record) (got[group] as Record<string, Sweep | Run>)[name] = v;
  if (!want) return;
  const w = (want[group] as Record<string, Sweep | Run>)[name];
  expect(w, `${group}.${name} in the fixture`).toBeDefined();
  expect(v.last, `${group}.${name} last`).toEqual(w!.last);
  if ('steps' in v) expect(v.steps, `${group}.${name} steps`).toBe((w as Run).steps);
  else expect(v.n, `${group}.${name} n`).toBe((w as Sweep).n);
  expect(v.hash, `${group}.${name} hash`).toBe(w!.hash);
}

let session: Session | null = null;
afterAll(() => {
  session?.disconnect();
  vi.unstubAllGlobals();
  if (WRITE) writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) stick maths
// ---------------------------------------------------------------------------------------------------------------------

const INNERS = [0, 0.08, 0.15, 0.3];
const OUTERS: (number | undefined)[] = [undefined, 1, 0.9];
const CURVES: CurveKind[] = ['linear', 'classic', 'precise', 'aggressive'];
const V: number[] = [];
for (let k = 0; k <= 40; k++) V.push((k - 20) / 20);
V.push(0, -0, 1e-7, -1e-7);
for (const i of INNERS.slice(1)) for (const d of [0, -1e-9, 1e-9]) V.push(i + d, -(i + d));

describe('(a) stick maths: the wrappers and the To forms equal the recording', () => {
  // every radial output of the sweep (the curves' inputs), then the raw grid (magnitudes over 1)
  const outs: number[] = [];
  const raw: number[] = [];
  for (const x of V) for (const y of V) raw.push(x, y);

  for (const inner of INNERS) {
    for (const outer of OUTERS) {
      const name = `radial i${inner} o${outer ?? 'default'}`;
      it(name, () => {
        const h = new Hasher();
        let last: number[] = [];
        let n = 0;
        for (const x of V) {
          for (const y of V) {
            const r = outer === undefined ? applyRadialDeadzone(x, y, inner) : applyRadialDeadzone(x, y, inner, outer);
            h.add(r.x);
            h.add(r.y);
            outs.push(r.x, r.y);
            last = [r.x, r.y];
            n++;
          }
        }
        check('stick', name, { n, hash: h.digest(), last: plain(last) }, true);
        const to = smx.applyRadialDeadzoneTo;
        if (!REFACTORED || !to) return;
        const o: Vec2 = { x: 9, y: 9 };
        const h2 = new Hasher();
        for (const x of V) {
          for (const y of V) {
            to(x, y, inner, outer ?? 0.98, o);
            h2.add(o.x);
            h2.add(o.y);
          }
        }
        check('stick', name, { n, hash: h2.digest(), last: plain([o.x, o.y]) }, false);
      });
    }
  }

  const curveSweep = (label: string, src: number[]): void => {
    for (const c of CURVES) {
      const name = `curve ${label} ${c}`;
      it(name, () => {
        const h = new Hasher();
        let last: number[] = [];
        for (let k = 0; k < src.length; k += 2) {
          const r = applyCurve({ x: src[k]!, y: src[k + 1]! }, c);
          h.add(r.x);
          h.add(r.y);
          last = [r.x, r.y];
        }
        const n = src.length / 2;
        check('stick', name, { n, hash: h.digest(), last: plain(last) }, true);
        const to = smx.applyCurveTo;
        if (!REFACTORED || !to) return;
        // into a separate out, and in place (out === v: alias-safe)
        const v: Vec2 = { x: 0, y: 0 };
        const o: Vec2 = { x: 9, y: 9 };
        const hs = new Hasher();
        const ha = new Hasher();
        for (let k = 0; k < src.length; k += 2) {
          v.x = src[k]!;
          v.y = src[k + 1]!;
          to(v, c, o);
          hs.add(o.x);
          hs.add(o.y);
          to(v, c, v);
          ha.add(v.x);
          ha.add(v.y);
        }
        check('stick', name, { n, hash: hs.digest(), last: plain([o.x, o.y]) }, false);
        check('stick', name, { n, hash: ha.digest(), last: plain([v.x, v.y]) }, false);
      });
    }
  };
  curveSweep('dz', outs);
  curveSweep('raw', raw);
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) mapPad
// ---------------------------------------------------------------------------------------------------------------------

interface Case {
  s: PadSnapshot;
  t: PadTuning;
}
const BASE: PadTuning = { deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.08, curve: 'classic', invertY: false };
function snapOf(btn: Record<number, number> = {}, axes: number[] = [0, 0, 0, 0]): PadSnapshot {
  return { buttons: Array.from({ length: 17 }, (_, i) => btn[i] ?? 0), axes };
}
const AX = [-1, -0.7, -0.56, -0.55, -0.3, -0.1, 0, 0.1, 0.3, 0.55, 0.56, 0.7, 1];
const AX_SAMPLE = [
  [0, 0, 0, 0],
  [0.2, -0.1, 0.13, -0.4],
  [0.6, 0.6, -0.6, 0.6],
  [-1, 0, 0, 1],
  [0.14, 0.05, 0.31, 0],
  [0.9, -0.9, -0.25, 0.25],
  [-0, 0.5, 0.05, -0.05],
];

function mapGroups(): Record<string, Case[]> {
  const g: Record<string, Case[]> = { single: [], analog: [], triggers: [], axes: [], tunings: [] };
  for (let i = 0; i < 17; i++) g.single!.push({ s: snapOf({ [i]: 1 }), t: BASE });
  g.single!.push({ s: snapOf({ [PAD.LS]: 1, [PAD.RS]: 1 }), t: BASE });
  const all: Record<number, number> = {};
  for (let i = 0; i < 17; i++) all[i] = 1;
  g.single!.push({ s: snapOf(all), t: BASE });
  g.single!.push({ s: snapOf(), t: BASE });
  for (let i = 0; i < 17; i++) for (const v of [0.3, 0.5, 0.51]) g.analog!.push({ s: snapOf({ [i]: v }), t: BASE });
  for (const td of [0, 0.05, 0.2]) {
    const t = { ...BASE, triggerDeadzone: td };
    for (const v of [0.05, 0.35, 0.36, 0.9]) {
      g.triggers!.push({ s: snapOf({ [PAD.LT]: v }), t }, { s: snapOf({ [PAD.RT]: v }), t }, { s: snapOf({ [PAD.LT]: v, [PAD.RT]: v }), t });
    }
  }
  for (const x of AX) for (const y of AX) g.axes!.push({ s: snapOf({}, [x, y, 0, 0]), t: BASE }, { s: snapOf({}, [0, 0, x, y]), t: BASE });
  // a short axes array (missing axes read 0)
  g.axes!.push({ s: { buttons: [1], axes: [0.7] }, t: BASE });
  for (const dz of [0, 0.12, 0.15, 0.3]) {
    for (const curve of CURVES) {
      for (const invertY of [false, true]) {
        const t: PadTuning = { deadzoneLeft: dz, deadzoneRight: dz, triggerDeadzone: 0.08, curve, invertY };
        for (const a of AX_SAMPLE) g.tunings!.push({ s: snapOf({ [PAD.RT]: 0.5 }, a), t });
      }
    }
  }
  return g;
}

function remapped(): Table {
  const b = defaultPadBinds();
  assignPadBind(b, 'draw', 0, PAD.RS);
  assignPadBind(b, 'jump', 1, PAD.LB);
  return padBindTable(b);
}

function hashFrame(h: Hasher, f: PadFrame, keys: string): void {
  for (let i = 0; i < BUTTON_ACTIONS.length; i++) h.add(f.buttons[BUTTON_ACTIONS[i]!] === true ? 1 : 0);
  h.str(keys);
  h.add(f.move.x);
  h.add(f.move.y);
  h.add(f.look.x);
  h.add(f.look.y);
  h.add(f.stick.x);
  h.add(f.stick.y);
  h.add(f.fireAnalog);
  h.add(f.active ? 1 : 0);
}
const frameLast = (f: PadFrame, keys: string): number[] =>
  plain([f.move.x, f.move.y, f.look.x, f.look.y, f.stick.x, f.stick.y, f.fireAnalog, f.active ? 1 : 0, keys.length]);

describe('(a) mapPad: the wrapper and mapPadInto (one reused frame) equal the recording', () => {
  const groups = mapGroups();
  const tables: [string, Table][] = [
    ['game', GAME_BINDINGS],
    ['remap', remapped()],
  ];
  const reused = REFACTORED ? gmx.newPadFrame!() : null;
  for (const [tn, table] of tables) {
    for (const gname of Object.keys(groups)) {
      const name = `${gname}:${tn}`;
      it(name, () => {
        const cases = groups[gname]!;
        const h = new Hasher();
        let last: number[] = [];
        for (const c of cases) {
          const f = mapPad(c.s, c.t, table);
          const keys = Object.keys(f.buttons).join(',');
          hashFrame(h, f, keys);
          last = frameLast(f, keys);
        }
        check('map', name, { n: cases.length, hash: h.digest(), last }, true);
        if (!reused) return;
        const hi = new Hasher();
        for (const c of cases) {
          gmx.mapPadInto!(c.s, c.t, table, reused);
          const keys = reused.setList.slice(0, reused.setCount).join(',');
          hashFrame(hi, reused, keys);
          last = frameLast(reused, keys);
        }
        check('map', name, { n: cases.length, hash: hi.digest(), last }, false);
      });
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) the poll run on stubs
// ---------------------------------------------------------------------------------------------------------------------

interface FakeButton {
  pressed: boolean;
  value: number;
  touched: boolean;
}
interface FakePad {
  index: number;
  id: string;
  connected: boolean;
  timestamp: number;
  buttons: FakeButton[];
  axes: number[];
}
const XBOX_ID = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)';
const DS_ID = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
function fakePad(index: number, id: string, axes: number[] = [0, 0, 0, 0]): FakePad {
  const buttons: FakeButton[] = [];
  for (let i = 0; i < 17; i++) buttons.push({ pressed: false, value: 0, touched: false });
  return { index, id, connected: true, timestamp: 0, buttons, axes };
}
function press(p: FakePad, i: number, value: number, pressed = value > 0): void {
  const b = p.buttons[i]!;
  b.value = value;
  b.pressed = pressed;
  b.touched = pressed;
}

/** What `navigator.getGamepads()` returns: one array, swapped per case (never copied: A2). */
const GP: { list: (FakePad | null)[] } = { list: [null, null, null, null] };
beforeAll(() => {
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('navigator', { getGamepads: () => GP.list });
});

interface Counts {
  connect: number;
  disconnect: number;
  active: number;
}
function settingsStub(): Settings {
  return {
    gamepad: {
      deadzoneLeft: 0.15,
      deadzoneRight: 0.12,
      triggerDeadzone: 0.08,
      curve: 'classic',
      invertY: false,
      lookSensitivityX: 1,
      lookSensitivityY: 0.9,
      adsMultiplier: 0.55,
      vibration: true,
    },
    pad: defaultPadBinds(),
  } as unknown as Settings;
}
function events(c: Counts): ConstructorParameters<typeof GamepadSource>[2] {
  return {
    onConnect: () => void c.connect++,
    onDisconnect: () => void c.disconnect++,
    onActive: () => void c.active++,
  };
}
const STYLES = ['xbox', 'playstation', 'nintendo'];

describe('(a) GamepadSource.poll: a scripted run equals the recording', () => {
  it('poll run', () => {
    const st = new InputState();
    const settings = settingsStub();
    const c: Counts = { connect: 0, disconnect: 0, active: 0 };
    GP.list = [null, null, null, null];
    const gs = new GamepadSource(st, () => settings, events(c));
    const p0 = fakePad(0, XBOX_ID);
    const p1 = fakePad(1, DS_ID);
    const h = new Hasher();
    let last: number[] = [];
    const steps = 200;
    for (let k = 0; k < steps; k++) {
      // the script: the state for poll k
      if (k === 5) {
        GP.list[0] = p0;
        p0.timestamp = k;
      }
      if (k === 10) press(p0, PAD.A, 1);
      if (k === 16) press(p0, PAD.A, 0);
      if (k === 20) {
        press(p0, PAD.RT, 0.9);
        press(p0, PAD.LT, 0.6);
      }
      if (k === 30) press(p0, PAD.RT, 0.3);
      if (k === 40) {
        press(p0, PAD.RT, 0);
        press(p0, PAD.LT, 0);
      }
      if (k >= 40 && k < 70) {
        p0.axes[0] = (k - 55) / 15;
        p0.axes[1] = (55 - k) / 30;
      }
      if (k === 70) {
        p0.axes[0] = 0;
        p0.axes[1] = 0;
        press(p0, PAD.DOWN, 1);
      }
      if (k === 110) {
        press(p0, PAD.DOWN, 0);
        p0.axes[2] = 1;
      }
      if (k === 130) gs.adsActive = true;
      if (k === 150) {
        p0.axes[2] = 0;
        gs.adsActive = false;
        const b = defaultPadBinds();
        assignPadBind(b, 'draw', 0, PAD.RS);
        settings.pad = b;
      }
      if (k === 152) press(p0, PAD.RS, 1);
      if (k === 158) press(p0, PAD.RS, 0);
      if (k === 160) {
        GP.list[1] = p1;
        p1.timestamp = k;
      }
      // pressed with a 0 value (the snapshot's `||`)
      if (k === 165) press(p1, PAD.B, 0, true);
      if (k === 172) p1.axes[3] = -0.8;
      if (k === 180) GP.list[0] = null;
      if (k === 190) p1.connected = false;
      if (k === 195) GP.list[0] = p0;
      // the browser moves a pad's timestamp when its input changes: here every third poll
      for (const p of GP.list) if (p && p.connected && k % 3 === 0) p.timestamp = k;

      gs.poll(10 + k * DT, DT);
      st.tick(DT);
      for (let i = 0; i < BUTTON_ACTIONS.length; i++) {
        const b = st.buttons[BUTTON_ACTIONS[i]!];
        h.add(b.down ? 1 : 0);
        h.add(b.pressed ? 1 : 0);
        h.add(b.released ? 1 : 0);
      }
      const look = st.consumeLook();
      last = [st.move.x, st.move.y, look.x, look.y, st.stick.x, st.stick.y, st.fireAnalog, STYLES.indexOf(gs.style), gs.connected ? 1 : 0, c.connect, c.disconnect, c.active];
      for (const v of last) h.add(v);
      st.consumeEdges();
    }
    check('poll', 'run', { steps, hash: h.digest(), last: plain(last) }, true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// (b) allocations
// ---------------------------------------------------------------------------------------------------------------------

interface HeapNode {
  id: number;
  callFrame: { functionName: string; url: string };
  children: HeapNode[];
}
interface HeapProfile {
  head: HeapNode;
  samples: { size: number; nodeId: number }[];
}
function post<T>(method: string, params: object = {}): Promise<T> {
  return new Promise((res, rej) => session!.post(method, params, (err, r) => (err ? rej(err) : res(r as T))));
}

/**
 * What `fn` allocates under `src/` (V8's sampling heap profiler at an 8 B mean interval, as player-hygiene S1): bytes per
 * call in the three files and elsewhere, and the functions that make an allocation bigger than a boxed double on at
 * least one call in ten.
 */
async function sampled(fn: (n: number) => void, n: number): Promise<{ ours: number; other: number; objects: string[] }> {
  if (!session) {
    session = new Session();
    session.connect();
    await post('HeapProfiler.enable');
  }
  const rounds = 5;
  await post('HeapProfiler.startSampling', { samplingInterval: 8, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true });
  for (let r = 0; r < rounds; r++) fn(n);
  const { profile } = await post<{ profile: HeapProfile }>('HeapProfiler.stopSampling');
  const byId = new Map<number, HeapNode>();
  const parent = new Map<number, HeapNode>();
  const index = (nd: HeapNode): void => {
    byId.set(nd.id, nd);
    for (const ch of nd.children) {
      parent.set(ch.id, nd);
      index(ch);
    }
  };
  index(profile.head);
  let ours = 0;
  let other = 0;
  const objects = new Map<string, number>();
  for (const smp of profile.samples) {
    const leaf = byId.get(smp.nodeId)!;
    let src = false;
    for (let nd: HeapNode | undefined = leaf; nd && !src; nd = parent.get(nd.id)) src = nd.callFrame.url.includes('/src/');
    if (!src) continue;
    const where = `${leaf.callFrame.functionName || '(anonymous)'} ${leaf.callFrame.url.split('/').slice(-2).join('/')}`;
    if (smp.size > HEAP_NUMBER) objects.set(where, (objects.get(where) ?? 0) + 1);
    else if (/gamepadSource\.ts|gamepadMapping\.ts|stickMath\.ts/.test(where)) ours += smp.size;
    else other += smp.size;
  }
  const perCall: string[] = [];
  for (const [where, count] of objects) if (count >= (rounds * n) / 10) perCall.push(`${where} (${count} in ${rounds * n} calls)`);
  return { ours: ours / (rounds * n), other: other / (rounds * n), objects: perCall };
}

/** Logs `fn`'s reading (and, over 16 B, the sampled allocators); after the refactor asserts it <= `limit`. */
async function reading(label: string, fn: (n: number) => void, limit: number | null = HEAP_NUMBER): Promise<number> {
  const per = await bytesPerCall(fn, HEAP_NUMBER, ALLOC);
  let extra = '';
  if (per > HEAP_NUMBER) {
    const s = await sampled(fn, ALLOC.n);
    extra = `; sampled HeapNumbers ${s.ours.toFixed(1)} B in the three files, ${s.other.toFixed(1)} B elsewhere; ${s.objects.length} kinds of object${s.objects.length ? `: ${s.objects.slice(0, 6).join('; ')}` : ''}`;
  }
  console.info(`player-hygiene S2 ${label} (${REFACTORED ? 'refactored' : 'pre-refactor'}): ${per.toFixed(1)} B per call${extra}`);
  if (REFACTORED && limit !== null) expect(per, label).toBeLessThanOrEqual(limit);
  return per;
}

/** A no-allocation stand-in for the `InputState` the pad writes (preallocated fields only). */
class StubState {
  readonly held = {} as Record<ButtonAction, boolean>;
  readonly taps = new Int32Array(1);
  readonly mv = new Float64Array(2);
  readonly lk = new Float64Array(2);
  readonly stick: Vec2 = { x: 0.5, y: 0.5 };
  fireAnalog = 0.5;
  constructor() {
    for (const a of BUTTON_ACTIONS) this.held[a] = false;
  }
  set(_s: string, a: ButtonAction, d: boolean): void {
    this.held[a] = d;
  }
  tap(_a: ButtonAction): void {
    this.taps[0] = (this.taps[0] ?? 0) + 1;
  }
  setMove(_s: string, x: number, y: number): void {
    this.mv[0] = x;
    this.mv[1] = y;
  }
  addLook(dx: number, dy: number): void {
    this.lk[0] = dx;
    this.lk[1] = dy;
  }
  releaseSource(_s: string): void {}
}

describe('(b) the pad poll allocates nothing per frame', () => {
  const NOW = inputs(100000, (k) => 100 + k * DT);
  const clk = new Int32Array(1);
  const settings = settingsStub();
  const c: Counts = { connect: 0, disconnect: 0, active: 0 };

  /** A source on its own fixed pad array, one poll taken (the pad picked, the table built). */
  function source(state: InputState | StubState, setup: (p: FakePad) => void): GamepadSource {
    const p = fakePad(0, XBOX_ID);
    p.timestamp = 1;
    setup(p);
    GP.list = [p, null, null, null];
    const gs = new GamepadSource(state as unknown as InputState, () => settings, events(c));
    gs.poll(NOW[0]!, DT);
    return gs;
  }
  const polls = (gs: GamepadSource) => (n: number): void => {
    for (let k = 0; k < n; k++) {
      const i = clk[0]!;
      clk[0] = i + 1 < NOW.length ? i + 1 : 1;
      gs.poll(NOW[i]!, DT);
    }
  };
  const STATES: [string, (p: FakePad) => void][] = [
    ['at rest', (p) => p.axes.splice(0, 4, 0.05, -0.04, 0.03, 0.02)],
    ['pushed, fire and aim', (p) => {
      p.axes.splice(0, 4, 0.6, -0.5, 0.3, 0.2);
      press(p, PAD.RT, 0.9);
      press(p, PAD.LT, 0.8);
    }],
    ['D-pad down held (repeating)', (p) => press(p, PAD.DOWN, 1)],
    ['right stick full', (p) => p.axes.splice(0, 4, 0, 0, 1, 0)],
  ];
  for (const [label, setup] of STATES) {
    it(`poll ${label}`, async () => {
      clk[0] = 1;
      await reading(`poll ${label}`, polls(source(new StubState(), setup)));
    });
  }

  it('mapPadInto alone (pushed)', async () => {
    const s = snapOf({ [PAD.RT]: 0.9, [PAD.A]: 1 }, [0.6, -0.5, 0.3, 0.2]);
    if (REFACTORED) {
      const f = gmx.newPadFrame!();
      const into = gmx.mapPadInto!;
      await reading('mapPadInto pushed', (n) => {
        for (let k = 0; k < n; k++) into(s, BASE, GAME_BINDINGS, f);
      });
    } else {
      const keep: { f: PadFrame | null } = { f: null };
      await reading('mapPad pushed', (n) => {
        for (let k = 0; k < n; k++) keep.f = mapPad(s, BASE, GAME_BINDINGS);
      });
    }
  });

  it('poll with the real InputState (logged only: its allocators are A3)', async () => {
    clk[0] = 1;
    const gs = source(new InputState(), (p) => {
      p.axes.splice(0, 4, 0.6, -0.5, 0.3, 0.2);
      press(p, PAD.RT, 0.9);
    });
    const per = await reading('poll pushed, real InputState (A3: inputState.ts:98 the setMove literal, :102 the Map iterator)', polls(gs), null);
    expect(per).toBeGreaterThanOrEqual(0);
  });
});
