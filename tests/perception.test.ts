import { describe, expect, it } from 'vitest';
import { fieldFactor, instantDetect, lightFactor, motionFactor, noiseSuspicion, PERCEPTION, sightRate, stepMeter, type SightInput } from '../src/ai/perception';
import { AlertMachine, ALERT, emptyAlertInput, SENSITIVITY } from '../src/ai/alertState';
import { PatrolWalker, searchPoint, PATROL, type Pt } from '../src/ai/patrol';
import { LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';

const lightLevelAt = (r: LightRegistry, x: number, y: number, z: number): number => new LightField(null, r).totalAt(x, y, z);

const base = (o: Partial<SightInput> = {}): SightInput => ({ dist: 10, angle: 0, light: 1, crouched: false, speed: 1.4, exposure: 1, sensitivity: 1, ...o });

/** Seconds to fill the meter from 0 at a constant rate. */
const fillTime = (i: SightInput): number => {
  const r = sightRate(i);
  return r > 0 ? 1 / r : Infinity;
};

describe('perception: sight rate', () => {
  it('distance: nearer fills faster, nothing beyond the focus range', () => {
    expect(sightRate(base({ dist: 5 }))).toBeGreaterThan(sightRate(base({ dist: 10 })));
    expect(sightRate(base({ dist: 10 }))).toBeGreaterThan(sightRate(base({ dist: 20 })));
    expect(sightRate(base({ dist: PERCEPTION.focusRange + 1 }))).toBe(0);
  });
  it('light: a lit walker at 10 m is seen in about a second; in shadow far longer; in darkness never at range', () => {
    const lit = fillTime(base({ light: 1 }));
    expect(lit).toBeGreaterThan(0.5);
    expect(lit).toBeLessThan(1.5);
    expect(fillTime(base({ light: 0.3 }))).toBeGreaterThan(lit * 3);
    // pitch dark, crouched, sneaking at 10 m: slower than the meter drains
    expect(sightRate(base({ light: 0, crouched: true, speed: 0.8 }))).toBeLessThan(PERCEPTION.leak);
    // moonlight (0.3), standing still at 11 m: does not build up
    expect(sightRate(base({ light: 0.3, speed: 0, dist: 11 }))).toBeLessThan(PERCEPTION.leak);
    expect(lightFactor(0)).toBeLessThan(0.1);
    expect(lightFactor(1)).toBeCloseTo(1, 5);
  });
  it('stance and motion: crouched and still are harder to see; a sprint is easiest', () => {
    expect(sightRate(base({ crouched: true }))).toBeLessThan(sightRate(base()));
    expect(motionFactor(0)).toBeLessThan(motionFactor(0.8));
    expect(motionFactor(0.8)).toBeLessThan(motionFactor(1.6));
    expect(motionFactor(1.6)).toBeLessThan(motionFactor(2.8));
    expect(motionFactor(2.8)).toBeLessThan(motionFactor(5));
  });
  it('peripheral vision fills slower and reaches less far; nothing behind', () => {
    const r = [0];
    expect(fieldFactor(0, r)).toBe(1);
    expect(r[0]).toBe(PERCEPTION.focusRange);
    expect(fieldFactor(1.2, r)).toBeCloseTo(PERCEPTION.periphMul, 5);
    expect(r[0]).toBe(PERCEPTION.periphRange);
    expect(sightRate(base({ angle: 1.2, dist: 6 }))).toBeLessThan(sightRate(base({ angle: 0, dist: 6 })) * 0.5);
    expect(sightRate(base({ angle: 1.2, dist: 14 }))).toBe(0);
    expect(sightRate(base({ angle: Math.PI, dist: 6 }))).toBe(0);
  });
  it('exposure: a sliver showing is slower than full view; no line of sight is nothing', () => {
    expect(sightRate(base({ exposure: 0.34 }))).toBeLessThan(sightRate(base({ exposure: 1 })));
    expect(sightRate(base({ exposure: 0 }))).toBe(0);
  });
  it('close by: walking up behind is felt in the dark; sneaking up behind (the takedown) and standing still are not', () => {
    expect(sightRate(base({ dist: 0.8, angle: Math.PI, light: 0, speed: 1.4 }))).toBeGreaterThan(PERCEPTION.leak);
    expect(sightRate(base({ dist: 0.8, angle: Math.PI, light: 0, speed: 0.8, crouched: true }))).toBe(0);
    expect(sightRate(base({ dist: 1, angle: Math.PI, light: 0, speed: 0 }))).toBe(0);
  });
  it('point blank in full light in focus is instant; anything else gives a warning first', () => {
    expect(instantDetect(base({ dist: 1.2 }))).toBe(true);
    expect(instantDetect(base({ dist: 1.2, light: 0.2 }))).toBe(false);
    expect(instantDetect(base({ dist: 3 }))).toBe(false);
    // fairness: outside point blank, even searching at 3 m a lit runner takes > 0.25 s to fill
    expect(fillTime(base({ dist: 3, speed: 5, sensitivity: SENSITIVITY.searching }))).toBeGreaterThan(0.25);
    expect(fillTime(base({ dist: 0.5, speed: 5, sensitivity: SENSITIVITY.alert }))).toBeGreaterThan(0.25);
  });
  it('the meter holds after losing sight, then drains', () => {
    let m = stepMeter(0, 2 + PERCEPTION.leak, 0.25, 0);
    expect(m).toBeCloseTo(0.5, 5);
    m = stepMeter(m, 0, 0.5, PERCEPTION.hold * 0.5);
    expect(m).toBeCloseTo(0.5, 5);
    m = stepMeter(m, 0, 1, PERCEPTION.hold + 0.1);
    expect(m).toBeCloseTo(0.5 - PERCEPTION.decay, 5);
    expect(stepMeter(0.9, 5, 1, 0)).toBe(1);
    // a glimpse below the leak never builds up: it drains slowly
    expect(stepMeter(0.4, PERCEPTION.leak * 0.8, 1, 0)).toBeLessThan(0.4);
    // a lit walker at 10 m fills in about a second even after the leak
    expect(1 / (sightRate(base()) - PERCEPTION.leak)).toBeLessThan(1.6);
  });
  it('noise: faint noises at the edge of hearing are ignored, nearer ones are suspicious, close ones investigated', () => {
    expect(noiseSuspicion(9, 8)).toBe(0);
    expect(noiseSuspicion(7.5, 8)).toBeLessThan(PERCEPTION.suspicious);
    expect(noiseSuspicion(3, 8)).toBeGreaterThanOrEqual(PERCEPTION.suspicious);
    expect(noiseSuspicion(0.5, 8)).toBeGreaterThanOrEqual(PERCEPTION.investigate);
  });
});

describe('alert states', () => {
  const run = (m: AlertMachine, sec: number, set: (i: ReturnType<typeof emptyAlertInput>, t: number) => void, dt = 1 / 60) => {
    const i = emptyAlertInput();
    for (let t = 0; t < sec; t += dt) {
      Object.assign(i, emptyAlertInput());
      set(i, t);
      m.step(dt, i);
    }
  };
  it('a glimpse makes them suspicious, then they calm down', () => {
    const m = new AlertMachine();
    run(m, 0.1, (i) => (i.meter = 0.35));
    expect(m.level).toBe('suspicious');
    run(m, ALERT.suspiciousTime + 0.5, (i) => (i.meter = 0.05));
    expect(m.level).toBe('unaware');
  });
  it('a lingering partial sighting leads to an investigation; a noise too', () => {
    const m = new AlertMachine();
    run(m, ALERT.lingerLook + 0.2, (i) => (i.meter = 0.32));
    expect(m.level).toBe('investigating');
    const n = new AlertMachine();
    run(n, 0.05, (i) => (i.heard = true));
    expect(n.level).toBe('suspicious');
    // one sound is enough: after a moment's look it goes to see
    run(n, ALERT.hearLook + 0.1, () => {});
    expect(n.level).toBe('investigating');
  });
  it('an investigation that finds nothing ends in a cooldown, then back to normal', () => {
    const m = new AlertMachine();
    m.set('investigating');
    run(m, ALERT.investigateLook + 0.2, (i) => (i.arrived = true));
    expect(m.level).toBe('cooldown');
    expect(m.sensitivity).toBeGreaterThan(1);
    run(m, ALERT.cooldownTime + 0.2, () => {});
    expect(m.level).toBe('unaware');
  });
  it('detection, damage, gunfire and a squad call go straight to alert', () => {
    for (const k of ['damaged', 'gunfire', 'called'] as const) {
      const m = new AlertMachine();
      run(m, 0.02, (i) => (i[k] = true));
      expect(m.level).toBe('alert');
      // alerted without a sighting: combat first, a search only after the lost-sight time
      run(m, ALERT.lostSight - 0.5, () => {});
      expect(m.level).toBe('alert');
    }
    const m = new AlertMachine();
    run(m, 0.02, (i) => (i.meter = 1));
    expect(m.alert).toBe(true);
  });
  it('losing sight in combat starts a search; searches end in a cooldown', () => {
    const m = new AlertMachine();
    m.set('alert');
    run(m, 2, (i, t) => {
      i.seeing = t < 1;
      i.sinceSeen = t < 1 ? 0 : t - 1;
    });
    expect(m.level).toBe('alert');
    run(m, ALERT.lostSight + 0.2, (i, t) => (i.sinceSeen = 1 + t));
    expect(m.level).toBe('searching');
    run(m, ALERT.searchTime + 0.2, (i) => (i.sinceSeen = 99));
    expect(m.level).toBe('cooldown');
    // after combat they stay on edge for good
    run(m, ALERT.cooldownTime * 3, () => {});
    expect(m.level).toBe('cooldown');
    expect(m.sensitivity).toBeGreaterThan(1);
  });
  it('found again while searching: alert', () => {
    const m = new AlertMachine();
    m.set('searching');
    run(m, 0.05, (i) => (i.meter = 1));
    expect(m.level).toBe('alert');
  });
  it('a body found (search trigger) starts a search without a sighting', () => {
    const m = new AlertMachine();
    run(m, 0.05, (i) => (i.search = true));
    expect(m.level).toBe('searching');
  });
});

describe('patrols and searches', () => {
  it('walks the route in order, pausing at each point facing the next leg', () => {
    const route = { points: [[0, 0], [4, 0], [4, 4]] as Pt[], wait: 1 };
    const w = new PatrolWalker(route, 0, 0, 0);
    let x = 0;
    let z = 0;
    const visited: number[] = [];
    for (let t = 0; t < 30; t += 1 / 60) {
      const g = w.step(1 / 60, x, z);
      if (visited.at(-1) !== w.idx) visited.push(w.idx);
      if (!g) continue;
      const dx = g[0] - x;
      const dz = g[1] - z;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, 1.2 / 60);
      x += (dx / d) * s;
      z += (dz / d) * s;
    }
    expect(visited.slice(0, 5)).toEqual([0, 1, 2, 0, 1]);
  });
  it('a two-point route goes back and forth', () => {
    const w = new PatrolWalker({ points: [[0, 0], [3, 0]], wait: 0.2 }, 0, 0, 0);
    let x = 0;
    const seen: number[] = [];
    for (let t = 0; t < 20; t += 1 / 60) {
      const g = w.step(1 / 60, x, 0);
      if (g) x += Math.sign(g[0] - x) * Math.min(Math.abs(g[0] - x), 1.2 / 60);
      if (seen.at(-1) !== w.idx) seen.push(w.idx);
    }
    expect(seen.slice(0, 4)).toEqual([0, 1, 0, 1]);
  });
  it('a post faces its direction and glances either side now and then', () => {
    const w = new PatrolWalker(null, 0, 0, 1);
    const yaws = new Set<number>();
    for (let t = 0; t < 20; t += 1 / 60) {
      expect(w.step(1 / 60, 0, 0)).toBeNull();
      yaws.add(Math.round((w.lookYaw - 1) * 10));
    }
    expect(yaws.has(0)).toBe(true);
    expect(yaws.size).toBeGreaterThan(1);
  });
  it('search points widen and fan out per searcher', () => {
    const a = searchPoint(0, 0, 0, 0, [0, 0]);
    const b = searchPoint(0, 0, 3, 0, [0, 0]);
    expect(Math.hypot(a[0], a[1])).toBeCloseTo(PATROL.searchR0, 5);
    expect(Math.hypot(b[0], b[1])).toBeGreaterThan(Math.hypot(a[0], a[1]));
    const c = searchPoint(0, 0, 0, 1, [0, 0]);
    expect(Math.hypot(a[0] - c[0], a[1] - c[1])).toBeGreaterThan(1);
    expect(Math.hypot(...searchPoint(0, 0, 50, 2, [0, 0]))).toBeLessThanOrEqual(PATROL.searchMax + 1e-9);
  });
});

describe('ambient zones', () => {
  it('the smallest zone containing a point sets its ambient; lamps add on top', () => {
    const r = new LightRegistry();
    r.ambient = 0.3;
    r.addZone({ minX: -10, maxX: 10, minY: -1, maxY: 6, minZ: -10, maxZ: 10, ambient: 0.12 });
    r.addZone({ minX: 0, maxX: 2, minY: -1, maxY: 6, minZ: 0, maxZ: 2, ambient: 0.05 });
    expect(r.ambientAt(20, 1, 0)).toBeCloseTo(0.3, 5);
    expect(r.ambientAt(-5, 1, 0)).toBeCloseTo(0.12, 5);
    expect(r.ambientAt(1, 1, 1)).toBeCloseTo(0.05, 5);
    expect(lightLevelAt(r, -5, 1, 0)).toBeCloseTo(0.12, 5);
    r.add({ x: -5, y: 3, z: 0, radius: 6, intensity: 0.8 });
    expect(lightLevelAt(r, -5, 1, 0)).toBeGreaterThan(0.5);
  });
});

describe('shooting lights', () => {
  it('a shot passing a bulb hits the nearest one along it; misses, past the end and switched-off lights do not', async () => {
    const { lightOnRay } = await import('../src/world/lights');
    const r = new LightRegistry();
    const a = r.add({ x: 0, y: 3, z: 5 });
    const b = r.add({ x: 0, y: 3, z: 10 });
    expect(lightOnRay(r, 0, 3, 0, 0, 3, 20)).toBe(a.id);
    expect(lightOnRay(r, 0, 3, 0, 0, 3.5, 20)).toBe(a.id);
    expect(lightOnRay(r, 0, 3, 0, 1, 3, 20)).toBe(-1);
    expect(lightOnRay(r, 0, 3, 0, 0, 3, 4)).toBe(-1);
    r.destroy(a.id);
    expect(lightOnRay(r, 0, 3, 0, 0, 3, 20)).toBe(b.id);
    r.setOn(b.id, false);
    expect(lightOnRay(r, 0, 3, 0, 0, 3, 20)).toBe(-1);
  });
});

describe('bodies and alarms', () => {
  it('a body in a lamp pool is seen from far; in shadow only up close; never behind beyond arm reach', async () => {
    const { bodyNoticed, BODY } = await import('../src/ai/bodies');
    expect(bodyNoticed(12, 0, 0.9)).toBe(true);
    expect(bodyNoticed(6, 0, 0.12)).toBe(false);
    expect(bodyNoticed(BODY.close - 0.2, Math.PI, 0)).toBe(true);
    expect(bodyNoticed(5, Math.PI, 1)).toBe(false);
    expect(bodyNoticed(BODY.range + 1, 0, 1)).toBe(false);
  });
  it('alarm runners pick the nearest working panel in range and stand off the wall', async () => {
    const { nearestPanel, alarmStandPoint, ALARM } = await import('../src/ai/alarm');
    const ps = [
      { id: 'a', x: 0, y: 0, z: 0, yaw: 0, disabled: false },
      { id: 'b', x: 10, y: 0, z: 0, yaw: Math.PI / 2, disabled: false },
    ];
    expect(nearestPanel(ps, 8, 0)?.id).toBe('b');
    ps[1]!.disabled = true;
    expect(nearestPanel(ps, 8, 0)?.id).toBe('a');
    expect(nearestPanel(ps, ALARM.range + 5, 0)).toBeNull();
    const out: [number, number] = [0, 0];
    alarmStandPoint(ps[1]!, out);
    expect(out[0]).toBeCloseTo(10 + ALARM.standoff, 5);
    expect(nearestPanel(ps, 0, 0, 2, 5)).toBeNull();
  });
});

describe('surfaces', () => {
  it('the highest marked area at the feet wins; elsewhere the default; louder on metal, quieter on carpet', async () => {
    const { surfaceAt, SURFACE_NOISE } = await import('../src/world/surfaces');
    const areas = [
      { kind: 'metal' as const, minX: 0, maxX: 4, minZ: 0, maxZ: 4, top: 2.6 },
      { kind: 'carpet' as const, minX: -2, maxX: 2, minZ: -2, maxZ: 2, top: 0 },
    ];
    expect(surfaceAt(areas, 1, 2.6, 1, 'concrete')).toBe('metal');
    // under the deck: the floor there
    expect(surfaceAt(areas, 1, 0, 1, 'concrete')).toBe('carpet');
    expect(surfaceAt(areas, 3, 0, 3, 'concrete')).toBe('concrete');
    expect(surfaceAt(areas, 9, 0, 9, 'gravel')).toBe('gravel');
    expect(SURFACE_NOISE.metal).toBeGreaterThan(SURFACE_NOISE.concrete);
    expect(SURFACE_NOISE.carpet).toBeLessThan(SURFACE_NOISE.concrete);
  });
});

describe('light fixtures', () => {
  it('a lamp strip is hit anywhere along its fixture box, not only at the bulb', async () => {
    const { lightOnRay, rayBox } = await import('../src/world/lights');
    const r = new LightRegistry();
    const l = r.add({ x: 0, y: 5, z: 0, fixture: { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15 } });
    // a shot up at the end of the strip (1.2 m from the light centre)
    expect(lightOnRay(r, 0, 1, 1.2, 0, 9, 1.2)).toBe(l.id);
    expect(lightOnRay(r, 0, 1, 1.6, 0, 9, 1.6)).toBe(-1);
    expect(rayBox(-1, 0, 0, 2, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5)).toBeCloseTo(0.25, 5);
    expect(rayBox(-1, 2, 0, 2, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5)).toBe(-1);
  });
});
