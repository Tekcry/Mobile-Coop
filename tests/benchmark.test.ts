import { describe, expect, it } from 'vitest';
import { BENCH, benchPlan, benchResult, benchText, pathAt, sustainedDrift } from '../src/game/benchmark';

describe('benchmark', () => {
  it('the flight passes through every room point and loops', () => {
    const pts = [{ x: 0, y: 2, z: 0 }, { x: 10, y: 2, z: 0 }, { x: 10, y: 2, z: 10 }, { x: 0, y: 2, z: 10 }];
    for (let i = 0; i < 4; i++) {
      const p = pathAt(pts, i / 4);
      expect(p.x).toBeCloseTo(pts[i]!.x);
      expect(p.z).toBeCloseTo(pts[i]!.z);
    }
    expect(pathAt(pts, 1).x).toBeCloseTo(0);
  });
  it('average and 1% low', () => {
    const iv = [...Array.from({ length: 990 }, () => 5), ...Array.from({ length: 10 }, () => 20)];
    const r = benchResult(iv);
    expect(r.frames).toBe(1000);
    expect(r.avgFps).toBeCloseTo(1000 / 5.15, 1);
    expect(r.low1Fps).toBeCloseTo(50, 5);
    expect(r.p50Ms).toBe(5);
    expect(r.p99Ms).toBe(20);
    expect(benchText(r, 'Warehouse, Epic')).toMatch(/average 194 fps, 1% low 50 fps/);
    expect(benchResult([]).frames).toBe(0);
  });
});

describe('benchmark plans', () => {
  it('every preset, one run each', () => {
    const p = benchPlan('presets', 2560, 1600);
    expect(p.map((r) => r.preset)).toEqual(['low', 'medium', 'high', 'ultra', 'epic']);
    expect(benchPlan('presets', 2560, 1600, ['low', 'medium', 'high', 'ultra']).map((r) => r.label)).toEqual(['Low', 'Medium', 'High', 'Ultra']);
    expect(p.every((r) => r.seconds === BENCH.seconds && !r.sustained)).toBe(true);
  });
  it('resolutions: the monitor\'s own (3.2.1)', () => {
    const p = benchPlan('resolutions', 7680, 2160);
    expect(p.map((r) => r.label)).toEqual(['7680x2160', '5120x1440', '3840x1080']);
    expect(p.map((r) => r.scale)).toEqual([1, 1440 / 2160, 0.5]);
    expect(benchPlan('resolutions', 2560, 1600).map((r) => r.label)).toEqual(['2560x1600', '1920x1200', '1680x1050', '1440x900', '1280x800']);
  });
  it('the sustained run and its drift', () => {
    const [r] = benchPlan('sustained', 1920, 1080);
    expect(r!.sustained && r!.seconds === BENCH.sustained).toBe(true);
    expect(sustainedDrift([150, 148, 140, 135])).toBeCloseTo(-0.1, 6);
    expect(sustainedDrift([150])).toBe(0);
  });
});

describe('feature costs (3.1.1)', () => {
  it('the player settings, then each costly feature off in turn; features already off are skipped', async () => {
    const { GRAPHICS_PRESETS } = await import('../src/core/quality');
    const { FEATURE_SECONDS, featureRuns } = await import('../src/game/benchmark');
    const ultra = GRAPHICS_PRESETS.ultra;
    const p = benchPlan('features', 2868, 1320, undefined, ultra);
    expect(p[0]).toMatchObject({ label: 'current settings', seconds: FEATURE_SECONDS });
    expect(p[0]!.gfx).toBeUndefined();
    expect(p.length).toBe(4 + featureRuns(ultra).length);
    // (3.2: then the same at 75% of the render resolution: GPU bound or not)
    expect(p[1]).toMatchObject({ label: 'render scale 75%', scale: 0.75 });
    expect(p.find((r) => r.label === 'anti-aliasing FXAA')?.gfx).toEqual({ aa: 'fxaa' });
    expect(p.find((r) => r.label === 'detail Medium')?.gfx).toEqual({ detail: 'medium' });
    // (3.1.4: then the settings rebuilt mid-match - the post stack in a new match, the shadows in the same one)
    expect(p.at(-2)).toMatchObject({ rebuild: 'post' });
    expect(p.at(-2)!.gfx).toBeUndefined();
    expect(p.at(-2)!.sameMatch).toBeUndefined();
    expect(p.at(-1)).toMatchObject({ rebuild: 'shadows', sameMatch: true });
    expect(p.find((r) => r.label === 'without ambient occlusion')?.gfx).toEqual({ ao: false });
    expect(p.find((r) => r.label === 'shadows Low')?.gfx).toEqual({ shadows: 'low' });
    const low = featureRuns(GRAPHICS_PRESETS.low).map((r) => r.label);
    expect(low).not.toContain('without ambient occlusion');
    expect(low).not.toContain('shadows Low');
  });
  it('counts hitches (frames over 50 ms)', () => {
    const r = benchResult([16, 16, 70, 16, 120, 16]);
    expect(r.long).toBe(2);
    expect(benchText(r, 'x')).toContain('2 frames over 50 ms');
    expect(benchText(benchResult([16, 16]), 'x', 3)).toContain('3 shaders compiled');
  });
});

describe('the flight follows the walking routes (3.2.5)', () => {
  it('goes through the doorways, never through a wall, circles a dead end, holds its height and turns smoothly', async () => {
    const { NavGrid } = await import('../src/ai/navGrid');
    const { benchFlight, flightAt, FLIGHT, FLIGHT_STRIDE } = await import('../src/game/benchmark');
    const wall = (cx: number, cz: number, hx: number, hz: number) => ({ cx, cz, hx, hz, yaw: 0, bottom: 0, top: 3 });
    // hall A (x 0..12) | wall at x 12, door z 9..10.6 | hall B (x 12..30, z 6..20); office C (x 20..30, z 0..6) off B
    // through a door at x 24..25.6; a beam 1.8 m up across hall A at x 5..6
    const blockers = [
      wall(12, 4.5, 0.1, 4.5),
      wall(12, 15.3, 0.1, 4.7),
      wall(17, 6, 5, 0.1),
      wall(22, 6, 2, 0.1),
      wall(27.8, 6, 2.2, 0.1),
    ];
    const nav = new NavGrid({ minX: 0, maxX: 30, minZ: 0, maxZ: 20, cell: 0.5, sample: () => ({ h: 0, ok: true }), blockers, agentRadius: 0.32, stepHeight: 0.4 });
    const fn = {
      snap: (x: number, y: number, z: number) => {
        const c = nav.nearestWalkable(x, z, 12, y);
        const [cx, cz] = nav.center(c);
        return { x: cx, y: 0, z: cz };
      },
      path: (a: { x: number; z: number }, b: { x: number; z: number }) => nav.findPath([a.x, a.z], [b.x, b.z], 100000)?.map((p) => ({ x: p[0], y: 0, z: p[1] })) ?? null,
      floor: (x: number, z: number) => (nav.isWalkable(nav.cellOf(x, z)) ? 0 : Number.NaN),
      clear: (a: { x: number; z: number }, b: { x: number; z: number }) => nav.lineClear([a.x, a.z], [b.x, b.z]),
      headroom: (x: number, _y: number, _z: number, max: number) => (x > 5 && x < 6 ? 1.8 : max),
    };
    const rooms = [
      { x: 6, y: 0, z: 10 },
      { x: 21, y: 0, z: 13 },
      { x: 25, y: 0, z: 3 },
    ];
    const f = benchFlight(rooms, fn);
    expect(f.n).toBeGreaterThan(100);
    const P = f.pts;
    const at = (i: number) => ({ x: P[(i % f.n) * FLIGHT_STRIDE]!, y: P[(i % f.n) * FLIGHT_STRIDE + 1]!, z: P[(i % f.n) * FLIGHT_STRIDE + 2]!, yaw: P[(i % f.n) * FLIGHT_STRIDE + 3]! });
    let crossA = false;
    let crossC = false;
    for (let i = 0; i < f.n; i++) {
      const a = at(i);
      const b = at(i + 1);
      // never through a wall: every step is a walkable line, the samples evenly spaced
      expect(nav.lineClear([a.x, a.z], [b.x, b.z])).toBe(true);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(FLIGHT.step * 1.6);
      // no jumps: height and heading change smoothly
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.03);
      // (turns under 100 deg/s at the flight's pace)
      expect((Math.abs(Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw))) / FLIGHT.step) * FLIGHT.speed).toBeLessThan(1.75);
      expect(a.y).toBeGreaterThanOrEqual(FLIGHT.minEye - 1e-6);
      expect(a.y).toBeLessThanOrEqual(FLIGHT.eye + 1e-6);
      if (a.x > 5 && a.x < 6) expect(a.y).toBeLessThanOrEqual(1.8 - FLIGHT.overhead + 1e-6);
      if ((a.x - 12) * (b.x - 12) <= 0) {
        crossA = true;
        expect(a.z).toBeGreaterThan(9);
        expect(a.z).toBeLessThan(10.6);
      }
      if (a.x > 20 && (a.z - 6) * (b.z - 6) <= 0) {
        crossC = true;
        expect(a.x).toBeGreaterThan(24);
        expect(a.x).toBeLessThan(25.6);
      }
    }
    expect(crossA && crossC).toBe(true);
    // every room is visited; the dead-end office is circled, not reversed on the spot
    for (const r of rooms) expect(Array.from({ length: f.n }, (_, i) => Math.hypot(at(i).x - r.x, at(i).z - r.z)).some((d) => d < 3)).toBe(true);
    // looping: the camera at the route's length is where it started
    const s = flightAt(f, 0, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    const e = flightAt(f, f.length, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    expect(Math.hypot(s.x - e.x, s.z - e.z)).toBeLessThan(1e-3);
  });
});
