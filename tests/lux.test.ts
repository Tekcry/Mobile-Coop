/**
 * (light-realism L0) The lux curve (`src/world/lux.ts`, BRIEF A2), the band check (A4) and the reference test
 * (`scripts/light-realism/calibrate.ts`, Q3 / A13) pinned to its write-up `docs/light-realism/measure/calibration.md`,
 * so a change to `lampMath.ts` or the anchors that moves the match fails here.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BAND_MAX_FACTOR, bandCheck, levelToLux, luxToLevel, LUX_ANCHORS, LUX_CEIL, LUX_FLOOR, LUX_OFFSET, LUX_SLOPE } from '../src/world/lux';
import { LIGHT } from '../src/world/lights';
import { moonLight } from '../src/world/lampMath';
import { campusOps } from '../src/world/maps/campusOps';
import { DISTANCES, ENGINE_COLUMN, FLOOR_LEVEL, NIGHT_FLOOR, PASS, REFERENCE, engineLevel, engineProfile, fitReference, runCalibration } from '../scripts/light-realism/calibrate';

const CAL_MD = readFileSync(join(__dirname, '../docs/light-realism/measure/calibration.md'), 'utf8');

describe('lux curve (A2)', () => {
  it('sits on the meter thresholds: 1 lx = LIGHT.shadow, 10 lx = LIGHT.lit', () => {
    expect(LUX_ANCHORS.lo.level).toBe(LIGHT.shadow);
    expect(LUX_ANCHORS.hi.level).toBe(LIGHT.lit);
    expect(LUX_SLOPE).toBeCloseTo(0.32, 12);
    expect(LUX_OFFSET).toBeCloseTo(0.28, 12);
    expect(luxToLevel(1)).toBeCloseTo(0.28, 12);
    expect(luxToLevel(10)).toBeCloseTo(0.6, 12);
    expect(levelToLux(0.28)).toBeCloseTo(1, 12);
    expect(levelToLux(0.6)).toBeCloseTo(10, 12);
  });

  it('round-trips inside the curve', () => {
    for (const lx of [0.2, 0.77, 1.5, 3, 7, 14, 35, 100, 170]) expect(levelToLux(luxToLevel(lx))).toBeCloseTo(lx, 9);
    for (let v = 0; v <= 1.0001; v += 0.05) expect(luxToLevel(levelToLux(v))).toBeCloseTo(Math.min(1, v), 12);
  });

  it('reads the night floors as research/bands.md section 2', () => {
    expect(levelToLux(0.104)).toBeCloseTo(0.28, 2);
    expect(levelToLux(0.14)).toBeCloseTo(0.37, 2);
    expect(levelToLux(0.244)).toBeCloseTo(0.77, 2);
    expect(levelToLux(0.3)).toBeCloseTo(1.15, 2);
    // the campus theme's moon is the 0.104 the reference test uses
    expect(moonLight(campusOps.theme)).toBeCloseTo(NIGHT_FLOOR.moon, 3);
  });

  it('clamps at 0 and 1', () => {
    expect(luxToLevel(0)).toBe(0);
    expect(luxToLevel(-5)).toBe(0);
    expect(luxToLevel(0.01)).toBe(0);
    expect(luxToLevel(1000)).toBe(1);
    expect(levelToLux(-1)).toBeCloseTo(LUX_FLOOR, 12);
    expect(levelToLux(2)).toBeCloseTo(LUX_CEIL, 12);
    expect(LUX_FLOOR).toBeCloseTo(0.133, 3);
    expect(LUX_CEIL).toBeCloseTo(177.8, 1);
  });
});

describe('bandCheck (A4)', () => {
  const P11A = { avg: 14, min: 3 };
  const at = (lx: number): number => luxToLevel(lx);

  it('passes a grid in band: mean of the cells in lux, point minimum, U0', () => {
    const r = bandCheck([at(20), at(20), at(20), at(3.5)], P11A);
    expect(r.n).toBe(4);
    expect(r.meanLux).toBeCloseTo((3 * 20 + 3.5) / 4, 9);
    expect(r.minLux).toBeCloseTo(3.5, 9);
    expect(r.maxLux).toBeCloseTo(20, 9);
    expect(r.u0).toBeCloseTo(3.5 / r.meanLux, 9);
    expect(r.meanLevel).toBeCloseTo((3 * at(20) + at(3.5)) / 4, 12);
    expect(r.pass).toBe(true);
  });

  it('fails on each rule', () => {
    // mean under the floor
    const low = bandCheck([at(10), at(12), at(8)], P11A);
    expect(low.passMean).toBe(false);
    expect(low.pass).toBe(false);
    // a point under the minimum
    const hole = bandCheck([at(30), at(30), at(30), at(2)], P11A);
    expect(hole.passMean).toBe(true);
    expect(hole.passMin).toBe(false);
    expect(hole.pass).toBe(false);
    // over 2.5 x the average
    const hot = bandCheck([at(40), at(40)], P11A);
    expect(hot.ceilLux).toBeCloseTo(14 * BAND_MAX_FACTOR, 9);
    expect(hot.passMax).toBe(false);
    // uniformity
    const u = bandCheck([at(30), at(30), at(5)], { avg: 14, u0: 0.25 });
    expect(u.passMin).toBe(true);
    expect(u.passU0).toBe(false);
    // no cells
    expect(bandCheck([], P11A).pass).toBe(false);
  });

  it('a band above the curve top passes only where every cell reads fully lit', () => {
    const office = { avg: 320 };
    const full = bandCheck([1, 1, 1], office);
    expect(full.saturated).toBe(true);
    expect(full.floorLux).toBeCloseTo(LUX_CEIL, 9);
    expect(full.pass).toBe(true);
    expect(bandCheck([1, 1, 0.97], office).pass).toBe(false);
  });
});

describe('reference test (Q3, A13): calibrate.ts against calibration.md', () => {
  it('the engine column profile is the one calibration.md shows (within 0.005)', () => {
    const prof = engineProfile();
    expect(prof.map((p) => p.d)).toEqual([...DISTANCES]);
    const rows = new Map<number, number>();
    for (const m of CAL_MD.matchAll(/^\| (\d+) m \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \|/gm)) rows.set(Number(m[1]), Number(m[3]));
    for (const p of prof) {
      const md = rows.get(p.d);
      expect(md, `calibration.md engine row ${p.d} m`).toBeDefined();
      expect(Math.abs(p.level - md!)).toBeLessThanOrEqual(0.005);
    }
    // the fixture: the S1 column today (intensity 0.9) on the campus night floor
    expect(FLOOR_LEVEL).toBeCloseTo(0.244, 9);
    const pinned = [0.52, 0.466, 0.332, 0.258, 0.245];
    prof.forEach((p, i) => expect(Math.abs(p.level - pinned[i]!)).toBeLessThanOrEqual(0.005));
    expect(engineLevel(0, ENGINE_COLUMN.s1Intensity)).toBeLessThan(LIGHT.lit);
  });

  it('the verdict and its line in calibration.md agree', () => {
    const cal = runCalibration();
    expect(CAL_MD).toContain(`Verdict: **${cal.verdict}**`);
    if (!REFERENCE) {
      expect(cal.verdict).toBe('chosen, not measured');
      expect(cal.fit).toBeNull();
      expect(CAL_MD).toContain('the anchors are chosen, not measured');
    } else {
      // the 5 points, the fitted intensity and the RMS error as calibration.md has them (within 0.005)
      const num = (label: string): number => Number(new RegExp(`${label}: \\*\\*([\\d.]+)\\*\\*`).exec(CAL_MD)?.[1]);
      expect(Math.abs(cal.fit!.intensity - num('Fitted intensity'))).toBeLessThanOrEqual(0.005);
      expect(Math.abs(cal.fit!.rms - num('RMS level error'))).toBeLessThanOrEqual(0.005);
      expect(REFERENCE.lux).toHaveLength(DISTANCES.length);
    }
  });

  it('the fit recovers a known column exactly (synthetic: real lux made from the engine through the curve)', () => {
    const floorLux = levelToLux(FLOOR_LEVEL);
    const lux = DISTANCES.map((d) => levelToLux(engineLevel(d, 1.3)) - floorLux);
    const fit = fitReference(lux, 10000);
    expect(fit.intensity).toBeCloseTo(1.3, 9);
    expect(fit.intensityPerKlm).toBeCloseTo(0.13, 9);
    expect(fit.rms).toBeLessThan(1e-9);
    expect(fit.verdict).toBe('measured');
    // the free fit finds the A2 slope again
    expect(fit.free.level1).toBe(LUX_ANCHORS.lo.level);
    expect(fit.free.level10).toBeCloseTo(LUX_ANCHORS.hi.level, 6);
    expect(fit.free.intensity).toBeCloseTo(1.3, 6);
  });

  it('a fitting the engine cannot match fails the pass line', () => {
    // flat 5 lx to 12 m: no single cone and falloff gives that
    const fit = fitReference([5, 5, 5, 5, 5], 10000);
    expect(fit.rms).toBeGreaterThan(PASS.rms);
    expect(fit.verdict).toBe('chosen, not measured');
    expect(() => runCalibration({ maker: 'x', model: 'y', source: 'z', read: 'r', lumens: 5000, mountH: 8, arm: 0.8, method: 'candela', lux: [1, 1, 1, 1, 1] })).toThrow(/mounted at 8/);
  });
});

describe('lux.ts is measurement only', () => {
  it('no gameplay or rendering file imports it', () => {
    const root = join(__dirname, '../src');
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(n)) files.push(p);
      }
    };
    for (const d of ['game', 'ai', 'vfx', 'player', 'voxel']) walk(join(root, d));
    files.push(join(root, 'world/lightField.ts'));
    const bad = files.filter((f) => /(from\s+|import\s*\(\s*)['"][^'"]*\/lux(\.ts)?['"]/.test(readFileSync(f, 'utf8')));
    expect(files.length).toBeGreaterThan(50);
    expect(bad).toEqual([]);
  });
});
