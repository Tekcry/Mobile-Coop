import { describe, expect, it, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STATS, K_SIGMA, sd, spreadOf, tolerancesFrom, selfCompare, noisy, renderTolerances, PROOF_TARGETS, proofRows,
  parityFor, renderProof, expandTargets, idOfKey,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/noiseLib.mjs';
// @ts-expect-error plain .mjs process script without types
import { pushFolder, main as pushMain } from '../scripts/visual-gate/push-results.mjs';
// @ts-expect-error plain .mjs process script without types
import { FLOORS } from '../scripts/visual-gate/metrics.mjs';
// @ts-expect-error plain .mjs process script without types
import { VIEWS, RIGS } from '../scripts/visual-gate/viewpoints.mjs';

// visual-gate VG7 phase 1 (docs/visual-gate/briefs/VG7.md): the noise / proof library on hand-set fixtures (3 runs of
// one build), the proof targets against the real viewpoints, and the results pusher against temp repos (a bare remote
// and a work repo under os.tmpdir()), never the real origin.

type Vec3 = [number, number, number];
interface RM { n: number; mean: number; p5: number; p50: number; p95: number; nearBlack: number; hist: number[]; veil?: number; contrast?: number; blotch?: number; arc?: number }
interface Metrics { whole: RM; regions: Record<string, RM>; leak?: { mean: number; p95: number } }
interface Shot {
  key: string; id: string; map: string; preset: 'low' | 'epic'; rigState: 'on' | 'off' | null; metrics: Metrics | null;
  skips: { region: string; why: string }[]; settle: null; converged: boolean; aimReady: boolean; error: string | null; ms: number;
}
interface Parity {
  kind: 'card' | 'meter'; id: string; map: string; view: string; at: Vec3 | null; level: number | null; luma: number | null;
  meter: number | null; field: number | null; min: number | null; max: number | null; ok: boolean; skip: string | null; note: string | null;
}
interface Run { sha: string; version: string; renderer: string; shots: Shot[]; rigs: Shot[]; parity: Parity[]; summary: Record<string, unknown>; notRun: string[]; runErrors: string[] }
interface Row {
  key: string; metric: string; bad: number | null; fixed: number | null; delta: number | null; sd: number | null; sep: number | null;
  dirOk: boolean | null; separates: boolean | null; mid: number | null; drift: boolean | null; rule: string | null;
  ruleBad: 'red' | 'green' | null; ruleFixed: 'red' | 'green' | null; note: string | null;
}
interface Target { key: string; metric: string; bad: 'high' | 'low'; note?: string }
interface Flag { key: string; region: string; metric: string }

const WHOLE_N = 960 * 540;
const SHA = 'c'.repeat(40);
/** A 32-bin histogram with all mass in one bin (emd between bins a and b = |a - b| / 31). */
const hist = (bin: number): number[] => Array.from({ length: 32 }, (_, i) => (i === bin ? 1 : 0));
const rm = (n: number, mean: number, extra: Partial<RM> = {}): RM => ({ n, mean, p5: 0.05, p50: 0.2, p95: 0.6, nearBlack: 0.1, hist: hist(8), ...extra });

function shot(key: string, metrics: Metrics | null, over: Partial<Shot> = {}): Shot {
  const at = key.lastIndexOf('@');
  const base = key.slice(0, at);
  const rig = /-(on|off)$/.exec(base);
  return {
    key, id: base.replace(/-(on|off)$/, ''), map: 'warehouseOps', preset: key.slice(at + 1) as 'low' | 'epic',
    rigState: rig ? (rig[1] as 'on' | 'off') : null, metrics, skips: [], settle: null, converged: true, aimReady: true,
    error: null, ms: 100, ...over,
  };
}

function parity(kind: 'card' | 'meter', id: string, view: string, over: Partial<Parity> = {}): Parity {
  return { kind, id, map: 'warehouseOps', view, at: null, level: null, luma: null, meter: null, field: null, min: null, max: null, ok: true, skip: null, note: null, ...over };
}

function runOf(shots: Shot[], rigs: Shot[], rows: Parity[], over: Partial<Run> = {}): Run {
  return { sha: SHA, version: '4.97.1', renderer: 'R1', shots, rigs, parity: rows, summary: { verdict: 'flagged', wallS: 190 }, notRun: [], runErrors: [], ...over };
}

/** Run i (0..2) of the noise fixture: a view with whole / floor / upper / wall / a thin region, a rig on key, a key
 * that errors in run 2, two cards (one skipped in run 3) and a meter row. */
function noiseRun(i: number): Run {
  const view = shot('vt@epic', {
    whole: rm(WHOLE_N, [0.1, 0.12, 0.14][i]!),
    regions: {
      floor: rm(4000, [0.02, 0.03, 0.04][i]!),
      upper: rm(3000, 0.3, { veil: 0.05, contrast: [0.1, 0.2, 0.3][i]! }),
      wall: rm(5000, 0.25, { blotch: [0.08, 0.1, 0.12][i]!, arc: 0.01, hist: hist([8, 9, 10][i]!) }),
      thin: rm(900, 0.2),
    },
  });
  const err = i === 1 ? shot('ve@low', null, { error: 'boom' }) : shot('ve@low', { whole: rm(WHOLE_N, 0.4), regions: {} });
  const rig = shot('rt-on@low', { whole: rm(WHOLE_N, [0.2, 0.205, 0.21][i]!), regions: {}, leak: { mean: [0.001, 0.0025, 0.004][i]!, p95: 0.01 } });
  const rows = [
    parity('card', 'card-vt-1', 'vt', { luma: [0.3, 0.31, 0.32][i]!, level: 0.4 }),
    parity('card', 'card-vt-2', 'vt', { luma: 0.5, level: 0.7, skip: i === 2 ? 'edge' : null }),
    parity('meter', 'meter-vt@epic', 'vt', { meter: 0.5, field: [0.49, 0.5, 0.51][i]! }),
  ];
  return runOf([view, err], [rig], rows);
}

const RUNS = [noiseRun(0), noiseRun(1), noiseRun(2)];

describe('visual gate noise: spread and tolerances', () => {
  it('constants and sd', () => {
    expect(STATS).toEqual(['mean', 'p5', 'p50', 'p95', 'nearBlack', 'veil', 'contrast', 'blotch', 'arc']);
    expect(K_SIGMA).toBe(4);
    expect(sd([1, 2, 3])).toBe(1);
    expect(sd([5])).toBe(0);
    expect(sd([])).toBe(0);
  });

  it('spreadOf: whole and the 1500+ regions, thin and errored keys missing, leak, parity, emd', () => {
    const s = spreadOf(RUNS);
    expect(s.n).toBe(3);
    const vt = s.keys['vt@epic'];
    expect(vt['whole.mean'].sd).toBeCloseTo(0.02, 10);
    expect(vt['whole.mean'].mean).toBeCloseTo(0.12, 10);
    expect(vt['whole.mean'].min).toBeCloseTo(0.1, 10);
    expect(vt['whole.mean'].max).toBeCloseTo(0.14, 10);
    expect(vt['whole.mean'].n).toBe(3);
    expect(vt['floor.mean'].sd).toBeCloseTo(0.01, 10);
    expect(vt['upper.contrast'].sd).toBeCloseTo(0.1, 10);
    expect(vt['upper.veil'].sd).toBe(0);
    expect(vt['wall.blotch'].sd).toBeCloseTo(0.02, 10);
    expect(vt['wall.arc'].sd).toBe(0);
    expect(vt['thin.mean']).toBeUndefined();
    expect(vt['floor.veil']).toBeUndefined();
    expect(Object.keys(vt).some((a) => a.startsWith('leak.'))).toBe(false);
    expect(s.missing).toContain('vt@epic thin: thin');
    expect(s.missing).toContain('ve@low: error in run 2: boom');
    expect(s.keys['ve@low']).toBeUndefined();
    expect(s.keys['rt-on@low']['leak.mean'].sd).toBeCloseTo(0.0015, 10);
    expect(s.keys['rt-on@low']['leak.p95'].sd).toBe(0);
    expect(s.parity['card-vt-1']).toMatchObject({ what: 'card-luma', n: 3 });
    expect(s.parity['card-vt-1'].sd).toBeCloseTo(0.01, 10);
    expect(s.parity['meter-vt@epic'].what).toBe('meter-d');
    expect(s.parity['meter-vt@epic'].sd).toBeCloseTo(0.01, 10);
    expect(s.parity['meter-vt@epic'].mean).toBeCloseTo(0, 10);
    expect(s.parity['card-vt-2']).toBeUndefined();
    expect(s.missing).toContain('card-vt-2: skipped (edge) in run 3');
    expect(s.emd['vt@epic'].whole).toBe(0);
    expect(s.emd['vt@epic'].wall).toBeCloseTo(1 / 31, 10); // RMS of 1/31, 2/31, 1/31 = sqrt 2 / 31, / sqrt 2
  });

  it('tolerancesFrom: 4 sd above floor, guards, cap, rounding up, quiet keys absent, never leak or parity', () => {
    const tol = tolerancesFrom(spreadOf(RUNS));
    expect(tol['vt@epic']).toEqual({ meanAbs: 0.08, meanRel: 0.6667, emd: 0.1291, contrastDrop: 0.9, blotchRatio: 1.8, blotchAbs: 0.08 });
    // meanRel: whole 4 x 0.02 / 0.12; the floor region (m 0.03, 4 x 0.01 / 0.03 = 1.33) is under the 0.05 guard
    expect(tol['rt-on@low']).toBeUndefined(); // mean sd 0.005 -> 0.02 under 0.03; leak sd never makes a field
    expect(Object.keys(tol)).toEqual(['vt@epic']);
    for (const t of Object.values(tol) as Record<string, number>[]) for (const f of Object.keys(t)) expect(Object.keys(FLOORS)).toContain(f);
    const cell = (sdv: number, mean: number) => ({ n: 3, mean, sd: sdv, min: mean, max: mean });
    const hand = (cells: Record<string, ReturnType<typeof cell>>) => ({ n: 3, keys: { 'k@low': cells }, emd: {}, parity: {}, missing: [] });
    expect(tolerancesFrom(hand({ 'whole.mean': cell(0.0200000025, 0.5) }))).toEqual({ 'k@low': { meanAbs: 0.0801 } });
    expect(tolerancesFrom(hand({ 'whole.mean': cell(0.005, 0.01) }))).toEqual({});
    expect(tolerancesFrom(hand({ 'whole.blotch': cell(0.01, 0.05) }))).toEqual({ 'k@low': { blotchRatio: 1.8, blotchAbs: 0.04 } });
    expect(tolerancesFrom(hand({ 'whole.arc': cell(0.001, 0.001) }))).toEqual({}); // arc mean under the 0.002 guard, 0.004 under 0.01
    expect(tolerancesFrom(hand({ 'whole.contrast': cell(0.05, 0.04) }))).toEqual({}); // contrast mean under the 0.05 guard
    expect(tolerancesFrom(hand({ 'leak.mean': cell(0.5, 0.5) }))).toEqual({});
  });

  it('selfCompare: the floors flag the fixture noise, the tolerances of the same runs flag nothing', () => {
    const tol = tolerancesFrom(spreadOf(RUNS));
    const sc = selfCompare(RUNS, tol);
    expect(sc.pairs).toBe(6);
    expect(sc.floors.some((f: Flag) => f.key === 'vt@epic' && f.region === 'whole' && f.metric === 'mean')).toBe(true);
    expect(sc.floors.some((f: Flag) => f.region === 'upper' && f.metric === 'contrast')).toBe(true);
    expect(sc.tol).toEqual([]);
    expect(selfCompare(RUNS, {}).tol.length).toBe(sc.floors.length);
  });

  it('noisy: fields over 2 x floor, leak and parity 4 sd over their rules', () => {
    const s = spreadOf(RUNS);
    const lines = noisy(s, tolerancesFrom(s));
    expect(lines).toContain('vt@epic meanAbs 0.08 (floor 0.03, x2.7)');
    expect(lines).toContain('vt@epic contrastDrop 0.9 (floor 0.25, x3.6)');
    expect(lines).toContain('rt-on@low leak.mean 4sd 0.0060 > rule 0.004');
    expect(lines.some((l: string) => l.startsWith('rt-on@low leak.p95'))).toBe(false);
    expect(lines).toContain('card-vt-1 4sd 0.0400 > 0.02 (A15 pad)');
    expect(lines).toContain('meter-vt@epic 4sd 0.0400 > 0.02 (METER_TOL)');
  });

  it('renderTolerances: a module node accepts, equal to its inputs, keys sorted, deterministic', () => {
    const spread = spreadOf(RUNS);
    const tolerances = tolerancesFrom(spread);
    const source = { sha: SHA, version: '4.97.1', renderer: "ANGLE (Vendor's GPU, D3D11)", runs: 3, at: '2026-10-25T06:00:00.000Z' };
    const text = renderTolerances({ spread, tolerances, source });
    expect(renderTolerances({ spread, tolerances, source })).toBe(text);
    expect(text).toMatch(/noise\.mjs spread/);
    expect(text).toMatch(/never hand-edit/);
    expect(text).toContain(`shots/visual-gate-vg7/${SHA.slice(0, 8)}/run1..3`);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-noise-'));
    try {
      const file = path.join(dir, 'tolerances.mjs');
      fs.writeFileSync(file, text);
      execFileSync(process.execPath, ['--check', file], { timeout: 30_000 });
      const out = execFileSync(process.execPath, ['--input-type=module', '-e',
        `const m = await import(${JSON.stringify(pathToFileURL(file).href)}); console.log(JSON.stringify({ S: m.SOURCE, T: m.TOLERANCES, P: m.SPREAD }));`],
      { encoding: 'utf8', timeout: 30_000 });
      const m = JSON.parse(out) as { S: unknown; T: unknown; P: { keys: Record<string, Record<string, number>>; emd: Record<string, Record<string, number>>; parity: Record<string, number> } };
      expect(m.S).toEqual(source);
      expect(m.T).toEqual(tolerances);
      expect(Object.keys(m.P.keys)).toEqual(['rt-on@low', 'vt@epic']);
      expect(Object.keys(m.P.keys['vt@epic']!)).toEqual([...Object.keys(m.P.keys['vt@epic']!)].sort());
      expect(m.P.keys['vt@epic']!['whole.mean']).toBe(0.02);
      expect(m.P.keys['vt@epic']!['upper.veil']).toBe(0); // every sd kept, not only the noisy ones
      expect(m.P.keys['rt-on@low']!['leak.mean']).toBe(0.0015);
      expect(m.P.emd['vt@epic']!.whole).toBe(0);
      expect(m.P.emd['vt@epic']!.wall).toBe(0.03226);
      expect(m.P.parity).toEqual({ 'card-vt-1': 0.01, 'meter-vt@epic': 0.01 });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

const ITEMS = [...VIEWS, ...RIGS] as { id: string; regions: Record<string, unknown>; guard?: unknown }[];

describe('visual gate noise: proof targets and rows', () => {
  it('PROOF_TARGETS: every finding, every key and region real in viewpoints.mjs', () => {
    const fns = ['F1', 'F2', 'F4', 'F5', 'F5b', 'F6', 'F7', 'F8'];
    expect(Object.keys(PROOF_TARGETS).sort()).toEqual([...fns].sort());
    const byId = new Map(ITEMS.map((i) => [i.id, i]));
    for (const fn of fns) {
      const list = expandTargets(fn, ITEMS) as Target[];
      expect(list.length, fn).toBeGreaterThan(0);
      for (const t of list) {
        expect(['high', 'low']).toContain(t.bad);
        const item = byId.get(idOfKey(t.key));
        expect(item, `${fn} ${t.key}`).toBeDefined();
        const region = t.metric.slice(0, t.metric.lastIndexOf('.'));
        if (region === 'leak') expect(item!.guard, `${fn} ${t.key} leak on a rig`).toBeDefined();
        if (region !== 'whole') expect(Object.keys(item!.regions), `${fn} ${t.key} ${t.metric}`).toContain(region);
      }
    }
    const f6 = expandTargets('F6', ITEMS) as Target[];
    const mViews = ITEMS.filter((i) => i.id.startsWith('m-') && !i.guard).length;
    expect(f6.length).toBe(mViews * 2 * 2);
    expect(f6.every((t) => t.key.startsWith('m-'))).toBe(true);
    expect(f6.map((t) => t.key)).toContain('m-a3-lobby@low');
    expect(() => expandTargets('F9', ITEMS)).toThrow(/unknown proof target/);
  });

  const Q = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
  const PITEMS = [
    { id: 'so-s1-goods-in', regions: { floor: Q, upper: Q }, rules: { 'upper.veil': { max: 0.1, presets: ['epic'] }, 'upper.contrast': { min: 0.3, presets: ['epic'] }, 'floor.nearBlack': { max: null } } },
    { id: 'so-s1-girder', regions: { upper: Q }, rules: {} },
    { id: 'so-corner', guard: { pos: [0, 0, 0], yaw: 0 }, regions: { leak: Q }, rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } } },
    { id: 'so-door', guard: { pos: [0, 0, 0], yaw: 0 }, regions: { leak: Q }, rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } } },
  ];
  const BAD = runOf([
    shot('so-s1-goods-in@epic', { whole: rm(WHOLE_N, 0.5), regions: { upper: rm(3000, 0.3, { veil: 0.12, contrast: 0.5 }), floor: rm(4000, 0.2) } }),
    shot('so-s1-goods-in@low', { whole: rm(WHOLE_N, 0.3), regions: {} }, { skips: [{ region: 'floor', why: 'small' }] }),
  ], [
    shot('so-corner-on@epic', { whole: rm(WHOLE_N, 0.2), regions: {}, leak: { mean: 0.01, p95: 0.05 } }),
    shot('so-corner-on@low', { whole: rm(WHOLE_N, 0.2), regions: {}, leak: { mean: 0.001, p95: 0.01 } }),
  ], [
    parity('meter', 'meter-so-s1-goods-in@epic', 'so-s1-goods-in', { meter: 0.3, field: 0.31 }),
    parity('meter', 'meter-m-a1-lounge@epic', 'm-a1-lounge', { meter: 0.2, field: 0.2 }),
  ]);
  const FIXED = runOf([
    shot('so-s1-goods-in@epic', { whole: rm(WHOLE_N, 0.3), regions: { upper: rm(3000, 0.3, { veil: 0.05, contrast: 0.4 }), floor: rm(4000, 0.2) } }),
    shot('so-s1-goods-in@low', { whole: rm(WHOLE_N, 0.3), regions: { floor: rm(4000, 0.2) } }),
  ], [], []);
  const SPREAD = { keys: { 'so-s1-goods-in@epic': { 'upper.veil': 0.005, 'upper.contrast': 0.01, 'whole.mean': 0 } } };
  const find = (rows: Row[], key: string, metric: string): Row => rows.find((r) => r.key === key && r.metric === metric)!;

  it('proofRows: separation, direction, sd floor, mid, drift, rules, missing values', () => {
    const rows = proofRows('F1', BAD, FIXED, { spread: SPREAD, tolerances: {}, items: PITEMS }) as Row[];
    expect(rows.length).toBe(6);
    const veil = find(rows, 'so-s1-goods-in@epic', 'upper.veil');
    expect(veil.bad).toBe(0.12);
    expect(veil.fixed).toBe(0.05);
    expect(veil.delta).toBeCloseTo(0.07, 10);
    expect(veil.sd).toBe(0.005);
    expect(veil.sep).toBeCloseTo(14, 6);
    expect(veil).toMatchObject({ dirOk: true, separates: true, drift: true, rule: 'max 0.1', ruleBad: 'red', ruleFixed: 'green', note: null });
    expect(veil.mid).toBeCloseTo(Math.sqrt(0.006), 10);
    const contrast = find(rows, 'so-s1-goods-in@epic', 'upper.contrast');
    expect(contrast).toMatchObject({ dirOk: false, separates: false, drift: false, rule: 'min 0.3', ruleBad: 'green', ruleFixed: 'green' });
    const mean = find(rows, 'so-s1-goods-in@epic', 'whole.mean');
    expect(mean.sep).toBeCloseTo(0.2 / 1e-4, 4); // sd 0 -> 1e-4
    expect(mean).toMatchObject({ separates: true, drift: true, rule: null, ruleBad: null });
    const girder = find(rows, 'so-s1-girder@epic', 'upper.veil');
    expect(girder).toMatchObject({ bad: null, fixed: null, delta: null, sep: null, separates: null, drift: null });
    expect(girder.note).toContain('not in run');
    expect(girder.note).toContain('no sd');
    // a drift that the tolerances absorb: veil 0.07 under an override of 0.08
    const tolRows = proofRows('F1', BAD, FIXED, { spread: SPREAD, tolerances: { 'so-s1-goods-in@epic': { veil: 0.08 } }, items: PITEMS }) as Row[];
    expect(find(tolRows, 'so-s1-goods-in@epic', 'upper.veil').drift).toBe(false);
  });

  it('proofRows: no fixed build (F5b) and a skipped region', () => {
    const rows = proofRows('F5b', BAD, null, { spread: null, tolerances: {}, items: PITEMS }) as Row[];
    const epic = find(rows, 'so-corner-on@epic', 'leak.mean');
    expect(epic).toMatchObject({ bad: 0.01, fixed: null, delta: null, sep: null, separates: null, mid: null, drift: null, rule: 'max 0.004', ruleBad: 'red', ruleFixed: null });
    expect(find(rows, 'so-corner-on@low', 'leak.mean').ruleBad).toBe('green');
    expect(find(rows, 'so-corner-on@epic', 'leak.p95').ruleBad).toBe('red');
    const control = find(rows, 'so-door-on@epic', 'leak.mean');
    expect(control.note).toContain('not in run');
    expect(control.note).toContain('control: expected green');
    const f2 = proofRows('F2', BAD, FIXED, { spread: SPREAD, tolerances: {}, items: PITEMS }) as Row[];
    const low = find(f2, 'so-s1-goods-in@low', 'floor.nearBlack');
    expect(low.bad).toBeNull();
    expect(low.fixed).toBe(0.1);
    expect(low.note).toContain('region skipped: small');
  });

  it('parityFor: the finding views only', () => {
    expect((parityFor('F1', BAD, PITEMS) as Parity[]).map((p) => p.id)).toEqual(['meter-so-s1-goods-in@epic']);
    expect(parityFor('F5', BAD, PITEMS)).toEqual([]);
    expect((parityFor('F6', BAD, ITEMS) as Parity[]).map((p) => p.id)).toEqual(['meter-m-a1-lounge@epic']);
    expect(parityFor('F6', null, ITEMS)).toEqual([]);
  });

  it('renderProof: header row, parity table and the summary counts', () => {
    const rows = proofRows('F1', BAD, FIXED, { spread: SPREAD, tolerances: {}, items: PITEMS }) as Row[];
    const md = renderProof(rows, { bad: parityFor('F1', BAD, PITEMS), fixed: [] }, { fn: 'F1', badLabel: 'v4.60.1', fixedLabel: 'v4.61.0' }) as string;
    expect(md.split('\n')[0]).toBe('### F1 proof: v4.60.1 (bad) vs v4.61.0 (fixed)');
    expect(md).toContain('| key | metric | v4.60.1 | v4.61.0 | delta | sd | sep | dir | separates | mid | drift | rule | rule bad | rule fixed | note |');
    expect(md).toContain('| so-s1-goods-in@epic | upper.veil | 0.1200 | 0.0500 | 0.0700 | 0.0050 | 14.0 | ok | yes |');
    expect(md).toContain('| run | id | level | luma | range | meter | field | ok | skip | note |');
    expect(md).toContain('| v4.60.1 | meter-so-s1-goods-in@epic | - | - | - | 0.3000 | 0.3100 | yes | - | - |');
    expect(md.trim().split('\n').at(-1)).toBe('F1: 2/6 rows separate, 2 drift, rule red on bad 1, green on fixed 2');
  });
});

describe('visual gate noise: push-results on temp repos', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-push-'));
  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  const g = (cwd: string, args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000 }).trim();
  const quiet = <T>(fn: () => T): T => {
    const info = console.info;
    const error = console.error;
    console.info = () => {};
    console.error = () => {};
    try { return fn(); } finally { console.info = info; console.error = error; }
  };
  const BR = 'shots/visual-gate-test';

  it('dry run, orphan first push, child commits per prefix, replace, refusals, work repo untouched', () => {
    const bare = path.join(root, 'remote.git');
    const work = path.join(root, 'work');
    g(root, ['init', '-q', '--bare', bare]);
    g(root, ['init', '-q', '-b', 'master', work]);
    for (const repo of [bare, work]) {
      g(repo, ['config', 'user.name', 'VG Test']);
      g(repo, ['config', 'user.email', 'vg@test.local']);
      g(repo, ['config', 'commit.gpgsign', 'false']);
    }
    fs.writeFileSync(path.join(work, 'README.md'), 'work\n');
    g(work, ['add', 'README.md']);
    g(work, ['commit', '-q', '-m', 'init']);
    g(work, ['remote', 'add', 'origin', bare]);
    g(work, ['push', '-q', '-u', 'origin', 'master']);
    const head = g(work, ['rev-parse', 'HEAD']);
    const status = g(work, ['status', '--porcelain']);

    const d1 = path.join(root, 'res1');
    fs.mkdirSync(path.join(d1, 'png'), { recursive: true });
    fs.writeFileSync(path.join(d1, 'a.json'), '{"a":1}\n');
    const png = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    fs.writeFileSync(path.join(d1, 'png', 'b.png'), png);
    const remoteHas = (): string => g(bare, ['for-each-ref', `refs/heads/${BR}`]);

    const dry = quiet(() => pushFolder({ dir: d1, branch: BR, prefix: 'p1', dryRun: true, cwd: work }));
    expect(dry.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(dry).toMatchObject({ files: 2, bytes: 8 + 256 });
    expect(remoteHas()).toBe('');

    const c1 = quiet(() => pushFolder({ dir: d1, branch: BR, prefix: 'p1', cwd: work })).commit;
    expect(g(bare, ['rev-parse', `refs/heads/${BR}`])).toBe(c1);
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c1])).toBe(c1); // orphan
    expect(g(bare, ['ls-tree', '-r', '--name-only', c1]).split('\n')).toEqual(['p1/a.json', 'p1/png/b.png']);
    expect(g(bare, ['log', '-1', '--format=%s', c1])).toBe('visual-gate results p1 (2 files)');
    expect(execFileSync('git', ['cat-file', 'blob', `${c1}:p1/png/b.png`], { cwd: bare, timeout: 30_000 }).equals(png)).toBe(true);

    const d2 = path.join(root, 'res2');
    fs.mkdirSync(d2);
    fs.writeFileSync(path.join(d2, 'c.json'), '{"c":1}\n');
    const c2 = quiet(() => pushFolder({ dir: d2, branch: BR, prefix: 'p2/', message: 'second', cwd: work })).commit;
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c2])).toBe(`${c2} ${c1}`);
    expect(g(bare, ['ls-tree', '-r', '--name-only', c2]).split('\n')).toEqual(['p1/a.json', 'p1/png/b.png', 'p2/c.json']);
    expect(g(bare, ['log', '-1', '--format=%s', c2])).toBe('second');

    fs.writeFileSync(path.join(d1, 'a.json'), '{"a":2}\n');
    const c3 = quiet(() => pushFolder({ dir: d1, branch: BR, prefix: 'p1', cwd: work })).commit;
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c3])).toBe(`${c3} ${c2}`);
    expect(g(bare, ['show', `${c3}:p1/a.json`])).toBe('{"a":2}');
    expect(g(bare, ['ls-tree', '-r', '--name-only', c3]).split('\n')).toEqual(['p1/a.json', 'p1/png/b.png', 'p2/c.json']);

    for (const branch of ['shots/other', 'visual-baselines', 'master', 'shots/visual-gate-UP', 'shots/visual-gate-a..b']) {
      expect(() => pushFolder({ dir: d1, branch, prefix: 'p1', cwd: work }), branch).toThrow(/refused branch/);
    }
    for (const prefix of ['../x', '/abs', 'a/../b', '', 'a\\b']) {
      expect(() => pushFolder({ dir: d1, branch: BR, prefix, cwd: work }), prefix).toThrow(/refused prefix/);
    }
    const empty = path.join(root, 'empty');
    fs.mkdirSync(path.join(empty, 'sub'), { recursive: true });
    expect(() => pushFolder({ dir: empty, branch: BR, prefix: 'p1', cwd: work })).toThrow(/empty folder/);
    expect(() => pushFolder({ dir: path.join(root, 'nope'), branch: BR, prefix: 'p1', cwd: work })).toThrow(/no such folder/);
    expect(g(bare, ['rev-parse', `refs/heads/${BR}`])).toBe(c3);

    // CLI: usage 2, refusal 1, ok 0
    expect(quiet(() => pushMain([], { cwd: work }))).toBe(2);
    expect(quiet(() => pushMain(['--dir', d1, '--branch', 'master', '--prefix', 'p1'], { cwd: work }))).toBe(1);
    expect(quiet(() => pushMain(['--dir', d2, '--branch', BR, '--prefix', 'p3', '--dry-run'], { cwd: work }))).toBe(0);
    expect(g(bare, ['rev-parse', `refs/heads/${BR}`])).toBe(c3);

    expect(g(work, ['rev-parse', 'HEAD'])).toBe(head);
    expect(g(work, ['status', '--porcelain'])).toBe(status);
    expect(g(work, ['diff', '--cached', '--name-only'])).toBe('');
    expect(g(work, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('master');
  });
});
