/**
 * (LR16-5, Michael M13 "Flicker + stutter") The moving-light model (`src/world/lampFlicker.ts`) and its registry state
 * (`LightRegistry.tickFlicker`): a fire flickers smoothly in 0.75..1 at a few Hz; a failing tube is mostly on with
 * irregular bursts seconds apart (chatter, or a drop-out with the starter's blinks); both are pure functions of the
 * lamp's seed and the sim time (host and client agree), allocate nothing, and never bump the registry's `version`.
 * Every stutter tube in the table matches a live lamp on its map.
 */
import { describe, expect, it } from 'vitest';
import {
  applyMapFlicker,
  FIRE_MAX,
  FIRE_MEAN,
  FIRE_MIN,
  fireFlicker,
  FLICKER_FIRE,
  FLICKER_NONE,
  FLICKER_STUTTER,
  flickerValue,
  lampSeed,
  mapFlickerSeed,
  STUTTER_BLINK,
  STUTTER_BURST_MAX,
  STUTTER_DIM,
  STUTTER_MEAN,
  STUTTER_TUBES,
  STUTTER_WINDOW,
  findTube,
  tubeStutter,
} from '../src/world/lampFlicker';
import { contribution, LightRegistry } from '../src/world/lights';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { warehouse } from '../src/world/maps/warehouse';
import { ctcourse } from '../src/world/maps/ctcourse';
import { LISTED_MAP_IDS } from '../src/world/maps/listed';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const DT = 1 / 60;
const SEED = lampSeed(mapFlickerSeed('warehouseOps', 1), 40);

describe('fire flicker', () => {
  it('stays in 0.75..1, moves smoothly, at a few Hz, around its mean', () => {
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    let maxStep = 0;
    let peaks = 0;
    const n = 60 * 600;
    let a = fireFlicker(0, SEED);
    let b = fireFlicker(DT, SEED);
    for (let i = 2; i < n; i++) {
      const c = fireFlicker(i * DT, SEED);
      lo = Math.min(lo, c);
      hi = Math.max(hi, c);
      sum += c;
      maxStep = Math.max(maxStep, Math.abs(c - b));
      if (b > a && b >= c) peaks++;
      a = b;
      b = c;
    }
    const secs = n * DT;
    console.info(`fire: ${lo.toFixed(3)}..${hi.toFixed(3)}, mean ${(sum / (n - 2)).toFixed(4)}, ${(peaks / secs).toFixed(2)} peaks/s, max step ${maxStep.toFixed(4)}`);
    expect(lo).toBeGreaterThanOrEqual(FIRE_MIN);
    expect(hi).toBeLessThanOrEqual(FIRE_MAX);
    // it uses most of its range, not a near-constant
    expect(hi - lo).toBeGreaterThan(0.15);
    // smooth: no jump over 0.02 between two 60 Hz ticks
    expect(maxStep).toBeLessThan(0.02);
    // a few Hz
    expect(peaks / secs).toBeGreaterThan(1.5);
    expect(peaks / secs).toBeLessThan(8);
    expect(Math.abs(sum / (n - 2) - FIRE_MEAN)).toBeLessThan(0.01);
  });

  it('two fires with different seeds do not move together', () => {
    let same = 0;
    for (let i = 0; i < 600; i++) if (Math.abs(fireFlicker(i * 0.1, 11) - fireFlicker(i * 0.1, 12)) < 0.01) same++;
    expect(same).toBeLessThan(120);
  });
});

/** Runs of one stutter over `secs` (60 Hz): bursts (start, length, values seen). */
function bursts(seed: number, secs: number): { start: number; len: number; first: number; vals: Set<number> }[] {
  const out: { start: number; len: number; first: number; vals: Set<number> }[] = [];
  let cur: { start: number; len: number; first: number; vals: Set<number> } | null = null;
  const n = Math.round(secs * 60);
  for (let i = 0; i < n; i++) {
    const t = i * DT;
    const v = tubeStutter(t, seed);
    if (v < 1) {
      if (!cur || t - (cur.start + cur.len) > 0.2) {
        cur = { start: t, len: 0, first: v, vals: new Set() };
        out.push(cur);
      }
      cur.len = t - cur.start + DT;
      cur.vals.add(v);
    }
  }
  return out;
}

describe('tube stutter', () => {
  it('is mostly on, with irregular bursts seconds apart that start off and stay short', () => {
    const secs = 3600;
    const bs = bursts(SEED, secs);
    let on = 0;
    let sum = 0;
    const n = secs * 60;
    for (let i = 0; i < n; i++) {
      const v = tubeStutter(i * DT, SEED);
      if (v === 1) on++;
      sum += v;
    }
    const gaps = bs.slice(1).map((b, i) => b.start - bs[i]!.start);
    const mg = gaps.reduce((p, q) => p + q, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((p, q) => p + (q - mg) * (q - mg), 0) / gaps.length);
    const longest = Math.max(...bs.map((b) => b.len));
    console.info(`stutter: on ${((100 * on) / n).toFixed(1)} %, mean ${(sum / n).toFixed(4)}, ${bs.length} bursts / h, gap ${mg.toFixed(2)} +- ${sd.toFixed(2)} s, longest ${longest.toFixed(2)} s`);
    expect(on / n).toBeGreaterThan(0.85);
    expect(Math.abs(sum / n - STUTTER_MEAN)).toBeLessThan(0.01);
    // about one burst every 8 s on average, seconds apart, irregular
    expect(bs.length).toBeGreaterThan(secs / 12);
    expect(bs.length).toBeLessThan(secs / 5);
    expect(mg).toBeGreaterThan(4);
    expect(sd).toBeGreaterThan(1.5);
    expect(longest).toBeLessThanOrEqual(STUTTER_BURST_MAX + 0.05);
    // a burst always starts off (the read is a drop, not a dim)
    for (const b of bs) expect(b.first).toBe(0);
  });

  it('chatters between off, dim and on, and a drop-out shows the starter blinks', () => {
    const bs = bursts(SEED, 3600);
    const vals = new Set<number>();
    for (const b of bs) for (const v of b.vals) vals.add(v);
    expect([...vals].sort()).toEqual([0, STUTTER_DIM, STUTTER_BLINK].sort());
    // a drop-out: long, mostly off, with blinks
    expect(bs.some((b) => b.len > 0.6 && b.vals.has(STUTTER_BLINK) && !b.vals.has(STUTTER_DIM))).toBe(true);
    // a chatter: dim steps
    expect(bs.some((b) => b.vals.has(STUTTER_DIM))).toBe(true);
  });

  it('never stutters twice in one window, and every value is one of the four levels', () => {
    for (let i = 0; i < 60 * 600; i++) {
      const v = tubeStutter(i * DT, SEED);
      expect([0, STUTTER_DIM, STUTTER_BLINK, 1]).toContain(v);
    }
    const bs = bursts(SEED, 1800);
    const win = bs.map((b) => Math.floor(b.start / STUTTER_WINDOW));
    expect(new Set(win).size).toBe(win.length);
  });
});

describe('determinism (host and client agree with no wire change)', () => {
  it('two registries built alike give the same values at the same sim times', () => {
    const make = (): LightRegistry => {
      const r = new LightRegistry();
      r.add({ x: 0, y: 3, z: 0, radius: 6 });
      r.add({ kind: 'fire', x: 4, y: 1, z: 0, radius: 5, intensity: 0.7 });
      r.add({ x: 8, y: 3, z: 0, radius: 6 });
      r.flickerSeed = mapFlickerSeed('warehouseOps', 7);
      r.setFlicker(2, FLICKER_STUTTER);
      return r;
    };
    const host = make();
    const client = make();
    for (let i = 0; i < 2000; i++) {
      const t = 12.5 + i * 0.0371;
      host.tickFlicker(t);
      client.tickFlicker(t);
      for (let k = 0; k < 3; k++) expect(client.lights[k]!.flicker).toBe(host.lights[k]!.flicker);
    }
    // a different map or match seed is a different pattern
    const other = make();
    other.flickerSeed = mapFlickerSeed('campusOps', 7);
    let diff = 0;
    for (let i = 0; i < 400; i++) {
      host.tickFlicker(i * 0.1);
      other.tickFlicker(i * 0.1);
      if (host.lights[1]!.flicker !== other.lights[1]!.flicker) diff++;
    }
    expect(diff).toBeGreaterThan(300);
  });

  it('the value is a function of the time only: ticking order and step size do not matter', () => {
    const t = 1234.567;
    const a = flickerValue(FLICKER_STUTTER, t, SEED);
    for (let i = 0; i < 50; i++) flickerValue(FLICKER_STUTTER, i * 0.3, SEED);
    expect(flickerValue(FLICKER_STUTTER, t, SEED)).toBe(a);
    expect(flickerValue(FLICKER_NONE, t, SEED)).toBe(1);
  });
});

describe('registry flicker state', () => {
  it('a fire enrols itself; tickFlicker moves flicker and flickerVersion, never version', () => {
    const r = new LightRegistry();
    const lamp = r.add({ x: 0, y: 3, z: 0, radius: 6 });
    const fire = r.add({ kind: 'fire', x: 3, y: 1, z: 0, radius: 6, intensity: 0.7 });
    expect(r.flickerMode(fire.id)).toBe(FLICKER_FIRE);
    expect(r.flickerMode(lamp.id)).toBe(FLICKER_NONE);
    r.setFlicker(lamp.id, FLICKER_STUTTER);
    const v = r.version;
    let fv = r.flickerVersion;
    let moves = 0;
    for (let i = 0; i < 600; i++) {
      r.tickFlicker(i * DT);
      if (r.flickerVersion !== fv) moves++;
      fv = r.flickerVersion;
    }
    expect(r.version).toBe(v);
    expect(moves).toBeGreaterThan(100);
    expect(fire.flicker).toBeGreaterThanOrEqual(FIRE_MIN);
    // the gameplay contribution follows the multiplier exactly
    const steady = contribution({ ...fire, flicker: 1 }, 3, 0.5, 1);
    expect(contribution(fire, 3, 0.5, 1)).toBeCloseTo(steady * fire.flicker, 12);
    // off the list: steady again
    r.setFlicker(lamp.id, FLICKER_NONE);
    expect(lamp.flicker).toBe(1);
    expect(r.flickering).toEqual([fire.id]);
  });

  it('tickFlicker allocates nothing', async () => {
    const r = new LightRegistry();
    for (let k = 0; k < 6; k++) r.add({ kind: k % 2 ? 'fire' : 'lamp', x: k, y: 3, z: 0, radius: 6 });
    r.setFlicker(0, FLICKER_STUTTER);
    r.setFlicker(2, FLICKER_STUTTER);
    const T = inputs(2000, (k) => 100 + k * DT);
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        r.tickFlicker(T[i]!);
        sink[0] = r.lights[1]!.flicker;
      }
    }, HEAP_NUMBER);
    console.info(`bytes per tickFlicker (5 lamps): ${per.toFixed(1)}`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  });
});

describe('stutter tubes per main map', () => {
  const maps = { campusOps, warehouseOps, warehouse, ctcourse };
  it('covers campusOps, warehouseOps, ctcourse and every listed main map with a live lamp', () => {
    for (const id of ['campusOps', 'warehouseOps', 'ctcourse', ...LISTED_MAP_IDS.filter((m) => m === 'warehouse')]) {
      const m = maps[id as keyof typeof maps];
      const b = new LevelBuilder();
      m.build(b, 0);
      const tube = applyMapFlicker(b.lights, id, 1);
      expect(tube, `${id}: no stutter tube candidate matched a lamp`).toBeGreaterThanOrEqual(0);
      const l = b.lights.lights[tube]!;
      expect(l.kind).not.toBe('flashlight');
      expect(l.intensity).toBeGreaterThan(0);
      expect(b.lights.flickerMode(tube)).toBe(FLICKER_STUTTER);
      // exactly one stutter tube on the map
      expect(b.lights.flickering.filter((i) => b.lights.flickerMode(i) === FLICKER_STUTTER)).toEqual([tube]);
      // the first matching candidate is the one used
      const first = STUTTER_TUBES[id]!.find((t) => findTube(b.lights, t) >= 0)!;
      expect(findTube(b.lights, first)).toBe(tube);
    }
  });

  it('a map without a table entry gets the seed and no tube', () => {
    const r = new LightRegistry();
    r.add({ x: 0, y: 3, z: 0 });
    expect(applyMapFlicker(r, 'proving', 3)).toBe(-1);
    expect(r.flickerSeed).toBe(mapFlickerSeed('proving', 3));
    expect(r.flickering.length).toBe(0);
  });
});
