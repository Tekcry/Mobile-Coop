/**
 * Replay determinism (J20 S6b, hard rule 8 / H7 / G143): the same seed and inputs give the same patrol positions and
 * detections. Runs the pure layer (`PatrolWalker`, `sightRate`, `stepMeter`) twice per guard with `Math.random` poisoned
 * differently each run, plus a static count of `Math.random(` in `src/ai` (the full-guard replay waits on Guard AI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PatrolWalker, type PatrolRoute } from '../src/ai/patrol';
import { sightRate, stepMeter, seenAt } from '../src/ai/perception';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import type { SectorDef } from '../src/game/sectors';
import type { SquadSlot } from '../src/world/rooms';

const DT = 1 / 60;
const STEPS = 180 * 60;
const WALK = 1.4;
const LIGHT_LEVEL = 0.8;

type Trace = number[];

function routeOf(s: SquadSlot): PatrolRoute {
  return { points: s.route!, wait: s.wait, waits: s.waits, faces: s.faces, start: s.start, loop: s.loop };
}

/** Walk one guard 180 s with a simple mover; returns x, z, yaw per step. */
function walk(s: SquadSlot, seed: number): Trace {
  const w = new PatrolWalker(routeOf(s), s.x, s.z, s.yaw, seed);
  let x = s.x;
  let z = s.z;
  let yaw = s.yaw;
  const out: Trace = new Array(STEPS * 3);
  for (let i = 0; i < STEPS; i++) {
    w.tick(DT);
    const t = w.step(DT, x, z);
    if (t) {
      const dx = t[0] - x;
      const dz = t[1] - z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-9) {
        const m = Math.min(d, WALK * DT);
        x += (dx / d) * m;
        z += (dz / d) * m;
        yaw = Math.atan2(dx, dz);
      }
    } else if (Number.isFinite(w.lookYaw)) yaw = w.lookYaw;
    out[i * 3] = x;
    out[i * 3 + 1] = z;
    out[i * 3 + 2] = yaw;
  }
  return out;
}

/** Scripted intruder around a point: a slow Lissajous through the guard's area. */
function intruder(cx: number, cz: number, t: number): [number, number] {
  return [cx + 7 * Math.sin(t * 0.21), cz + 7 * Math.sin(t * 0.13 + 1)];
}

function detect(trace: Trace, cx: number, cz: number): { meter: number[]; first: number } {
  const meter: number[] = new Array(STEPS);
  let m = 0;
  let sinceSeen = 99;
  let first = -1;
  let [px, pz] = intruder(cx, cz, 0);
  for (let i = 0; i < STEPS; i++) {
    const [ix, iz] = intruder(cx, cz, i * DT);
    const speed = Math.hypot(ix - px, iz - pz) / DT;
    px = ix;
    pz = iz;
    const gx = trace[i * 3]!;
    const gz = trace[i * 3 + 1]!;
    const gyaw = trace[i * 3 + 2]!;
    const dx = ix - gx;
    const dz = iz - gz;
    let angle = Math.abs(Math.atan2(dx, dz) - gyaw);
    angle = angle > Math.PI ? 2 * Math.PI - angle : angle;
    const rate = sightRate({ dist: Math.hypot(dx, dz), angle, light: LIGHT_LEVEL, crouched: false, speed, exposure: 1, sensitivity: 1 });
    sinceSeen = seenAt(rate) ? 0 : sinceSeen + DT;
    m = stepMeter(m, rate, DT, sinceSeen);
    meter[i] = m;
    if (first < 0 && m >= 1) first = i;
  }
  return { meter, first };
}

/** Run `fn` with Math.random poisoned by a run-specific sequence. */
function poisoned<T>(run: number, fn: () => T): T {
  let k = run * 7919 + 1;
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    k = (k * 16807) % 2147483647;
    return k / 2147483647;
  });
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

function maxDiff(a: number[], b: number[]): number {
  let d = a.length === b.length ? 0 : Infinity;
  for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i]! - b[i]!));
  return d;
}

const SETS: [string, SectorDef[]][] = [
  ['campus', CAMPUS_SECTORS],
  ['warehouse', WAREHOUSE_SECTORS],
];

afterEach(() => vi.restoreAllMocks());

describe('replay determinism: patrol walkers and detections', () => {
  for (const [name, sectors] of SETS) {
    sectors.forEach((sec, si) => {
      const routed = sec.guards.map((g, gi) => ({ g, gi })).filter((e) => e.g.route && e.g.route.length > 0);
      it(`${name} ${sec.id}: ${routed.length} routed guards replay to 1e-9`, () => {
        for (const { g, gi } of routed) {
          const a = poisoned(1, () => walk(g, gi));
          const b = poisoned(2, () => walk(g, gi));
          expect(maxDiff(a, b), `${name} S${si + 1} guard ${gi}`).toBeLessThan(1e-9);
        }
      });
      it(`${name} ${sec.id}: detections past the first guard replay`, () => {
        const first = sec.guards[0]!;
        if (!first.route || first.route.length === 0) return;
        const run = (r: number) => poisoned(r, () => detect(walk(first, 0), first.x, first.z));
        const a = run(1);
        const b = run(2);
        expect(maxDiff(a.meter, b.meter)).toBeLessThan(1e-9);
        expect(a.first).toBe(b.first);
      });
    });
  }

  it('the comparison discriminates: a shifted route gives a different trace', () => {
    const g = CAMPUS_SECTORS[0]!.guards.find((e) => e.route && e.route.length > 0)!;
    const a = walk(g, 0);
    const slow = walk({ ...g, route: g.route!.map((p) => [p[0] + 1, p[1]] as [number, number]) }, 0);
    expect(maxDiff(a, slow)).toBeGreaterThan(1e-3);
  });

  it('the detection scenario exercises the meter (some section raises it)', () => {
    let peak = 0;
    for (const [, sectors] of SETS) {
      for (const sec of sectors) {
        const g = sec.guards[0]!;
        if (!g.route || g.route.length === 0) continue;
        peak = Math.max(peak, ...detect(walk(g, 0), g.x, g.z).meter);
      }
    }
    expect(peak).toBeGreaterThan(0);
  });
});

describe('replay determinism: Math.random in src/ai (static count)', () => {
  /** Allowlist: Guard AI owns the fixes (fix request J20 S6b, G143); it shrinks as they land. */
  const ALLOW: Record<string, number> = {
    'enemy.ts': 2, // :389 think-cadence start, :2336 think cadence
    'enemyManager.ts': 2, // :650, :661 radio delays
    'reconDrone.ts': 1, // :34 start angle
  };

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
    });
  }
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('matches the allowlist (a new Math.random fails)', () => {
    const found: Record<string, number> = {};
    for (const p of files(join(__dirname, '..', 'src', 'ai'))) {
      const n = strip(readFileSync(p, 'utf8')).split('Math.random(').length - 1;
      if (n > 0) found[p.replaceAll('\\', '/').split('/src/ai/')[1]!] = n;
    }
    expect(found).toEqual(ALLOW);
  });

  it.todo('full guard replay once Guard AI seeds the think cadence and radio delays (fix request: J20 S6b)');
});
