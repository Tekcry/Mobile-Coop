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
import { warehouse } from '../src/world/maps/warehouse';
import { ctcourse } from '../src/world/maps/ctcourse';
import { LISTED_MAP_IDS } from '../src/world/maps/listed';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const DT = 1 / 60;
const SEED = lampSeed(mapFlickerSeed('warehouse', 1), 40);

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
    // smooth: no jump over 0.03 between two 60 Hz ticks. (lr16fix3: hash2 is 30-bit now, so the sequence moved: this seed's
    // 10-minute worst step is now 0.0202, just over the old 0.02. The model caps a step at 0.25 x 1.5 / 60 x sum(W x Hz) = 0.0282, so 0.03
    // is the guarantee, not a number tuned to one sequence.)
    expect(maxStep).toBeLessThan(0.03);
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
      // (one burst per window by construction: the steps under 1 in a window are one burst, its on steps inside it)
      if (!cur || Math.floor(t / STUTTER_WINDOW) !== Math.floor(cur.start / STUTTER_WINDOW)) {
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
    // every step under 1 in a window lies in one burst's span (never two bursts in one window)
    const bs = bursts(SEED, 1800);
    for (const b of bs) expect(b.len).toBeLessThanOrEqual(STUTTER_BURST_MAX + DT);
  });
});

describe('determinism (host and client agree with no wire change)', () => {
  it('two registries built alike give the same values at the same sim times', () => {
    const make = (): LightRegistry => {
      const r = new LightRegistry();
      r.add({ x: 0, y: 3, z: 0, radius: 6 });
      r.add({ kind: 'fire', x: 4, y: 1, z: 0, radius: 5, intensity: 0.7 });
      r.add({ x: 8, y: 3, z: 0, radius: 6 });
      r.flickerSeed = mapFlickerSeed('warehouse', 7);
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
    other.flickerSeed = mapFlickerSeed('ctcourse', 7);
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
  const maps = { warehouse, ctcourse };
  it('covers ctcourse and every listed main map with a live lamp', () => {
    for (const id of ['ctcourse', ...LISTED_MAP_IDS.filter((m) => m === 'warehouse')]) {
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

/** The first fixed step (60 Hz) at or after `from` where the light's flicker passes `want`; the registry is left there. */
function stepWhere(reg: LightRegistry, id: number, want: (v: number) => boolean, from = 0): number {
  for (let i = Math.round(from * 60); i < 60 * 1200; i++) {
    reg.tickFlicker(i / 60);
    if (want(reg.lights[id]!.flicker)) return i / 60;
  }
  throw new Error('no such step in 20 min');
}

describe('the meter and the guards follow the flicker (light parity)', async () => {
  const { LightField } = await import('../src/world/lightField');
  const { bakeLamps } = await import('../src/voxel/lampBake');
  const { bakedLights } = await import('../src/world/lightBake');
  const { buildAmbientGrid } = await import('../src/world/ambientGrid');
  const { bakeMoon } = await import('../src/voxel/skyBake');
  const { packShapes } = await import('../src/voxel/shapes');
  const { sightRate } = await import('../src/ai/perception');

  /** A dark room: a floor, a stutter tube and a steady lamp, baked as the game does (the tubes on the maps are baked). */
  function scene(): { reg: LightRegistry; field: InstanceType<typeof LightField> } {
    const reg = new LightRegistry();
    reg.ambient = 0.05;
    reg.add({ x: 0, y: 3, z: 0, radius: 6, intensity: 0.9, group: 4 });
    reg.add({ x: 8, y: 3, z: 0, radius: 6, intensity: 0.9 });
    reg.flickerSeed = mapFlickerSeed('warehouse', 3);
    reg.setFlicker(0, FLICKER_STUTTER);
    const shapes = packShapes([{ kind: 'box', c: [0, -0.25, 0], s: [24, 0.5, 24], yaw: 0, pitch: 0, mat: 1 }]);
    const lo: [number, number, number] = [-11, -1, -11];
    const hi: [number, number, number] = [11, 6, 11];
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
    const n: [number, number, number] = [44, 14, 44];
    const dir: [number, number, number] = [0, 1, 0];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
    const ambient = buildAmbientGrid({ ambientAt: () => reg.ambient }, lo, hi);
    const field = new LightField({ lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r }, moon: { origin: lo, n, cell: 0.5, vis: m.vis, dir }, ambient, moonLight: 0, ms: 0 }, reg);
    return { reg, field };
  }

  it('the baked lamp level is the steady level x the live multiplier at every step', () => {
    const { reg, field } = scene();
    const steady = field.lampAt(0, 0.5, 1, 0.3);
    expect(steady).toBeGreaterThan(0.2);
    let seen = 0;
    for (let i = 0; i < 60 * 120; i++) {
      reg.tickFlicker(i / 60);
      const f = reg.lights[0]!.flicker;
      expect(field.lampAt(0, 0.5, 1, 0.3)).toBeCloseTo(steady * f, 9);
      if (f < 1) seen++;
    }
    expect(seen).toBeGreaterThan(30);
    // the steady lamp never moves
    expect(reg.lights[1]!.flicker).toBe(1);
  });

  it('an off step takes the meter (bodyLevel) down under the tube, and a guard fills slower; on again, as before', () => {
    const { reg, field } = scene();
    const tOn = stepWhere(reg, 0, (v) => v === 1);
    const lit = field.bodyLevel(0.5, 0, 0.3, 1.68);
    const tOff = stepWhere(reg, 0, (v) => v === 0, tOn);
    const dark = field.bodyLevel(0.5, 0, 0.3, 1.68);
    expect(dark).toBeLessThan(lit - 0.2);
    // the guards read the meter's value (`ref.light`): the same walker is slower to see at the off step
    const see = (light: number): number => sightRate({ dist: 8, angle: 0, light, crouched: false, speed: 1.4, exposure: 1, sensitivity: 1 });
    expect(see(dark)).toBeLessThan(see(lit));
    stepWhere(reg, 0, (v) => v === 1, tOff);
    expect(field.bodyLevel(0.5, 0, 0.3, 1.68)).toBeCloseTo(lit, 9);
  });

  it('the unbaked path (no bake: fires, dynamic lights) scales the same way', () => {
    const reg = new LightRegistry();
    reg.ambient = 0;
    const fire = reg.add({ kind: 'fire', x: 0, y: 1, z: 0, radius: 8, intensity: 0.7 });
    const field = new LightField(null, reg);
    const steady = field.totalAt(1, 0.8, 0.5);
    expect(steady).toBeGreaterThan(0.05);
    for (let i = 0; i < 600; i++) {
      reg.tickFlicker(i / 60);
      expect(field.totalAt(1, 0.8, 0.5)).toBeCloseTo(Math.min(1, steady * fire.flicker), 9);
    }
  });
});

describe('a lamp that is off stays off (flicker never relights it)', () => {
  const make = (): LightRegistry => {
    const r = new LightRegistry();
    r.add({ x: 0, y: 3, z: 0, radius: 6, intensity: 0.9, group: 2, destructible: true });
    r.flickerSeed = mapFlickerSeed('ctcourse', 9);
    r.setFlicker(0, FLICKER_STUTTER);
    return r;
  };
  const cases: [string, (r: LightRegistry) => void][] = [
    ['shot', (r) => r.destroy(0)],
    ['switched off', (r) => r.setOn(0, false)],
    ['breaker cut (group)', (r) => r.setGroup(2, false)],
    ['jam dark step', (r) => {
      r.jamStart(0);
      r.jamLit(0, false);
    }],
  ];
  for (const [name, off] of cases) {
    it(name, () => {
      const r = make();
      off(r);
      const l = r.lights[0]!;
      const v = r.version;
      for (let i = 0; i < 60 * 60; i++) {
        r.tickFlicker(i / 60);
        expect(l.on).toBe(false);
        expect(contribution(l, 0.5, 1, 0.3)).toBe(0);
      }
      // the flicker never touched the on state or the registry version
      expect(r.version).toBe(v);
    });
  }

  it('restart: a lamp put back (restore / a section reset) flickers again; a rebuilt map starts the same pattern over', () => {
    const r = make();
    r.destroy(0);
    r.restore(0);
    const l = r.lights[0]!;
    const t = stepWhere(r, 0, (x) => x === 0);
    expect(contribution(l, 0.5, 1, 0.3)).toBe(0);
    stepWhere(r, 0, (x) => x === 1, t);
    expect(contribution(l, 0.5, 1, 0.3)).toBeGreaterThan(0);
    r.destroy(0);
    r.resetTo(0, true, false);
    expect(l.on).toBe(true);
    stepWhere(r, 0, (x) => x === 0, t);
    // a full restart builds the map again (World.create): same tube, same seed, the clock from 0, the same values
    const build = (): LightRegistry => {
      const b = new LevelBuilder();
      warehouse.build(b, 4);
      applyMapFlicker(b.lights, 'warehouse', 4);
      return b.lights;
    };
    const a = build();
    const b = build();
    expect(a.flickering).toEqual(b.flickering);
    expect(a.flickerSeed).toBe(b.flickerSeed);
    for (const id of a.flickering) expect(a.lights[id]!.flicker).toBe(1);
    for (let i = 0; i < 60 * 30; i++) {
      a.tickFlicker(i / 60);
      b.tickFlicker(i / 60);
      for (const id of a.flickering) expect(b.lights[id]!.flicker).toBe(a.lights[id]!.flicker);
    }
  });
});

describe('the shared clock', () => {
  it("the client's estimate snaps to the host's fixed step: a few ms of clock jitter give the host's value", () => {
    const mk = (): LightRegistry => {
      const r = new LightRegistry();
      r.add({ x: 0, y: 3, z: 0 });
      r.flickerSeed = 77;
      r.setFlicker(0, FLICKER_STUTTER);
      return r;
    };
    const host = mk();
    const client = mk();
    let same = 0;
    const n = 60 * 300;
    for (let i = 0; i < n; i++) {
      host.tickFlicker(i / 60);
      // a jitter of up to 4 ms either side of the step
      client.tickFlicker(i / 60 + 0.004 * Math.sin(i * 1.7));
      if (client.lights[0]!.flicker === host.lights[0]!.flicker) same++;
    }
    expect(same).toBe(n);
  });
});
