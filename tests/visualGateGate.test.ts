import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { MIN_REGION_PX, MIN_BLOTCH_PX, METER_TOL, CARD_PATCH, EXIT, planMasks, cardLuma, tolFor, stripThin, nextPatch,
  baselineCutoff, skippedRules, lintRules, scoreShot, cardCheck, meterCheck, knownLines, decide, topFlags, scoreRun,
  summarize, renderBlock, runRecord, shouldRecord, thumbsToPush,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/gate.mjs';
// @ts-expect-error plain .mjs process script without types
import { FLOORS, measure, lumaFromRgba } from '../scripts/visual-gate/metrics.mjs';
// @ts-expect-error plain .mjs process script without types
import { validateRun } from '../scripts/visual-gate/storeLib.mjs';

type Vec3 = [number, number, number];
type Pt2 = [number, number];
type Rule = { min?: number | null; max?: number | null; presets?: ('low' | 'epic')[] };
type Flag = { key: string; region: string; metric: string; base: number | null; cur: number; delta: number | null; tol: number; kind: 'drift' | 'rule'; known: string | null };

const W = 960;
const H = 540;
const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

/** An axis-aligned screen rectangle as a Projection (4 corners round the edge). */
function rect(x: number, y: number, w: number, h: number, behind = false): { pts: Pt2[]; behind: boolean } {
  return { pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], behind };
}

/** A synthetic RGBA image: flat grey `bg`, with `fill(x, y)` overriding a pixel's grey when it returns a number. */
function image(bg: number, fill?: (x: number, y: number) => number | null): Uint8Array {
  const a = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = fill?.(x, y) ?? bg;
      a.set([v, v, v, 255], (y * W + x) * 4);
    }
  }
  return a;
}

const VIEW = {
  id: 'm-test',
  map: 'ctcourse',
  src: 'test',
  feet: [0, 0, 0] as Vec3,
  cam: [0, 1.6, 0] as Vec3,
  target: [0, 1.6, 5] as Vec3,
  regions: {},
  metrics: { wall: ['blotch', 'arc'], upper: ['haze'] },
  rules: { 'whole.mean': { min: 0.2 }, 'wall.blotch': { max: 0.5, presets: ['low'] }, 'upper.veil': { max: null } } as Record<string, Rule>,
  parity: [[1, 1, 1]] as Vec3[],
  targets: ['F6'],
  known: null as string | null,
};

const RIG = {
  id: 'so-corner',
  map: 'warehouseOps',
  src: 'test',
  door: null,
  guard: { pos: [0, 0, 0] as Vec3, yaw: 0 },
  feet: [0, 0, 0] as Vec3,
  cam: [0, 1.6, 0] as Vec3,
  target: [0, 1.2, 2] as Vec3,
  regions: {},
  rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } } as Record<string, Rule>,
  targets: ['F5b'],
  known: 'F5b lr16-8-triage.md:65-87',
};

/** One region's metrics (stats plus extras), hist 32 bins with all weight at `mean`. */
function region(mean: number, extra: Record<string, number> = {}, n = 20000) {
  const hist = new Array<number>(32).fill(0);
  if (n > 0) hist[Math.min(31, Math.floor(mean * 32))] = 1;
  return { n, mean, p5: mean, p50: mean, p95: mean, nearBlack: 0, hist, ...extra };
}

function shotMetrics(mean: number, regions: Record<string, ReturnType<typeof region>> = {}, leak?: { mean: number; p95: number }) {
  return { whole: region(mean, {}, W * H), regions, ...(leak ? { leak } : {}) };
}

function rec(id: string, preset: 'low' | 'epic', rigState: 'on' | 'off' | null, metrics: unknown, extra: Record<string, unknown> = {}) {
  const key = rigState ? `${id}-${rigState}@${preset}` : `${id}@${preset}`;
  return { key, id, map: 'ctcourse', preset, rigState, metrics, skips: [], settle: { meter: 0.3, field: 0.3, simS: 0.3, guards: 1, flickering: 0, alarm: null }, converged: true, aimReady: true, error: null, ms: 1000, ...extra };
}

function pick(key: string, metrics: unknown, version = '4.97.0', source: 'accepted' | 'green' = 'green', approver: string | null = null, sha = SHA2) {
  return { key, sha, version, source, approver, shot: { key, metrics } };
}

function flag(key: string, over: Partial<Flag> = {}): Flag {
  return { key, region: 'whole', metric: 'mean', base: 0.1, cur: 0.2, delta: 0.1, tol: 0.03, kind: 'drift', known: null, ...over };
}

describe('visual-gate gate: constants', () => {
  it('match the brief', () => {
    expect([MIN_REGION_PX, MIN_BLOTCH_PX, METER_TOL, CARD_PATCH]).toEqual([1500, 400, 0.02, 10]);
    expect(EXIT).toEqual({ clean: 0, flagged: 1, usage: 2, error: 3 });
  });
});

describe('visual-gate gate: planMasks', () => {
  it('skips a behind quad and a small one; drops blotch on a thin wall; keeps blotch and arc on a big wall', () => {
    const p = planMasks(
      {
        back: rect(100, 100, 300, 300, true),
        tiny: rect(10, 10, 30, 30),
        thin: rect(300, 300, 60, 40),
        wall: rect(500, 200, 200, 150),
      },
      { back: ['haze'], tiny: ['blotch'], thin: ['blotch', 'arc'], wall: ['blotch', 'arc'] },
      W,
      H,
    );
    expect(p.skips).toEqual([
      { region: 'back', why: 'behind' },
      { region: 'tiny', why: 'small' },
      { region: 'thin', why: 'blotch-small' },
    ]);
    expect(Object.keys(p.masks).sort()).toEqual(['thin', 'wall']);
    expect(p.want.thin).toEqual(['arc']);
    expect(p.want.wall).toEqual(['blotch', 'arc']);
    // stats kept for the thin wall, blotch never computed (never trusted as 0)
    const img = lumaFromRgba(image(80), W, H);
    const m = measure(img, p.masks, p.want);
    expect(m.regions.thin.n).toBe(2400);
    expect(m.regions.thin.blotch).toBeUndefined();
    expect(typeof m.regions.thin.arc).toBe('number');
    expect(typeof m.regions.wall.blotch).toBe('number');
  });

  it('a region with no metrics asked gets an empty list', () => {
    const p = planMasks({ leak: rect(100, 100, 100, 100) }, {}, W, H);
    expect(p.want).toEqual({ leak: [] });
    expect(p.skips).toEqual([]);
  });
});

describe('visual-gate gate: cardLuma', () => {
  it('flat grey 128 reads 128 / 255', () => {
    expect(cardLuma(lumaFromRgba(image(128), W, H))).toBeCloseTo(128 / 255, 9);
  });

  it('a 10 x 10 white centre on black reads 1 (the e2e-darkness clip)', () => {
    const x0 = W / 2 - 5;
    const y0 = H / 2 - 5;
    const img = lumaFromRgba(image(0, (x, y) => (x >= x0 && x < x0 + 10 && y >= y0 && y < y0 + 10 ? 255 : null)), W, H);
    expect(cardLuma(img)).toBe(1);
    expect(cardLuma(img, 20)).toBeCloseTo(0.25, 9);
  });
});

describe('visual-gate gate: tolerances', () => {
  it('no override -> FLOORS; below a floor keeps the floor; above it wins', () => {
    expect(tolFor('k@low')).toEqual({ ...FLOORS });
    expect(tolFor('k@low', { 'other@low': { meanAbs: 0.5 } })).toEqual({ ...FLOORS });
    const t = tolFor('k@low', { 'k@low': { meanAbs: 0.001, emd: 0.09 } });
    expect(t.meanAbs).toBe(FLOORS.meanAbs);
    expect(t.emd).toBe(0.09);
    expect(t.veil).toBe(FLOORS.veil);
  });
});

describe('visual-gate gate: stripThin + scoreShot', () => {
  const key = 'm-test@low';

  it('stripThin drops regions under MIN_REGION_PX and keeps whole and leak', () => {
    const m = shotMetrics(0.3, { a: region(0.2, {}, 0), b: region(0.2, {}, 1499), c: region(0.2, {}, 1500) }, { mean: 0, p95: 0 });
    const s = stripThin(m);
    expect(Object.keys(s.regions)).toEqual(['c']);
    expect(s.whole).toBe(m.whole);
    expect(s.leak).toEqual({ mean: 0, p95: 0 });
  });

  it('a base region with n 0 against a normal one gives no hist flag', () => {
    const base = shotMetrics(0.3, { wall: region(0, {}, 0) });
    const cur = shotMetrics(0.3, { wall: region(0.3) });
    const r = scoreShot({ key, item: { ...VIEW, rules: {} }, preset: 'low', rigState: null, metrics: cur, base, tol: FLOORS });
    expect(r.flags).toEqual([]);
  });

  it('a mean drift of +0.05 on base 0.1 flags', () => {
    const r = scoreShot({ key, item: { ...VIEW, rules: {} }, preset: 'low', rigState: null, metrics: shotMetrics(0.15), base: shotMetrics(0.1), tol: FLOORS });
    const means = r.flags.filter((f: Flag) => f.metric === 'mean');
    expect(means).toHaveLength(1);
    expect(means[0]).toMatchObject({ key, region: 'whole', kind: 'drift', known: null });
    expect(means[0].delta).toBeCloseTo(0.05, 9);
  });

  it('rules flag on a view and a rig on shot, never on the off shot', () => {
    const dark = shotMetrics(0.1);
    const v = scoreShot({ key, item: VIEW, preset: 'low', rigState: null, metrics: dark, base: null, tol: FLOORS });
    expect(v.flags).toEqual([expect.objectContaining({ region: 'whole', metric: 'mean', kind: 'rule', tol: 0.2 })]);
    const leaky = shotMetrics(0.1, {}, { mean: 0.01, p95: 0.05 });
    const on = scoreShot({ key: 'so-corner-on@epic', item: RIG, preset: 'epic', rigState: 'on', metrics: leaky, base: null, tol: FLOORS });
    expect(on.flags.map((f: Flag) => `${f.region}.${f.metric}`)).toEqual(['leak.mean', 'leak.p95']);
    expect(on.flags.every((f: Flag) => f.known === RIG.known)).toBe(true);
    const off = scoreShot({ key: 'so-corner-off@epic', item: RIG, preset: 'epic', rigState: 'off', metrics: leaky, base: null, tol: FLOORS });
    expect(off.flags).toEqual([]);
    expect(off.skipped).toEqual([]);
  });

  it('a rule on a missing region is SKIPPED only when calibrated (bound set, preset listed)', () => {
    const m = shotMetrics(0.5); // no wall, no upper
    const skips = [{ region: 'wall', why: 'small' }];
    // wall.blotch is calibrated at low only; upper.veil has no bound
    expect(skippedRules('m-test@low', VIEW, m, 'low', null, skips)).toEqual(['m-test@low wall.blotch (small)']);
    expect(skippedRules('m-test@epic', VIEW, m, 'epic', null, skips)).toEqual([]);
    expect(scoreShot({ key: 'm-test@low', item: VIEW, preset: 'low', rigState: null, metrics: m, base: null, tol: FLOORS, skips }).skipped).toEqual(['m-test@low wall.blotch (small)']);
    // blotch dropped on a thin wall, a behind region, a rig without a leak
    const thin = shotMetrics(0.5, { wall: region(0.3, { arc: 0 }) });
    expect(skippedRules('m-test@low', VIEW, thin, 'low', null, [{ region: 'wall', why: 'blotch-small' }])).toEqual(['m-test@low wall.blotch (blotch-small)']);
    expect(skippedRules('m-test@low', VIEW, m, 'low', null, [{ region: 'wall', why: 'behind' }])).toEqual(['m-test@low wall.blotch (behind)']);
    expect(skippedRules('so-corner-on@epic', RIG, m, 'epic', 'on', [])).toEqual(['so-corner-on@epic leak.mean (leak region missing)', 'so-corner-on@epic leak.p95 (leak region missing)']);
    // nothing skipped when the metric is there
    expect(skippedRules('m-test@low', VIEW, shotMetrics(0.5, { wall: region(0.3, { blotch: 0.1 }) }), 'low', null, [])).toEqual([]);
  });
});

describe('visual-gate gate: baseline cutoff', () => {
  it('train -> package version; no train -> next patch; override wins', () => {
    expect(nextPatch('4.97.1')).toBe('4.97.2');
    expect(baselineCutoff('4.97.1', { train: 66 })).toBe('4.97.1');
    expect(baselineCutoff('4.97.1', { train: null })).toBe('4.97.2');
    expect(baselineCutoff('4.97.1')).toBe('4.97.2');
    expect(baselineCutoff('4.97.1', { train: 66, override: '4.90.0' })).toBe('4.90.0');
    expect(() => nextPatch('4.97')).toThrow(/malformed/);
  });
});

describe('visual-gate gate: lintRules', () => {
  it('F8 with a veil bound and no contrast bound warns once; with both, none', () => {
    const f8 = { ...VIEW, id: 'cp-s2-b', targets: ['F8'], rules: { 'upper.veil': { max: 0.1, presets: ['epic'] }, 'upper.contrast': { min: null, presets: ['epic'] } } };
    const lines = lintRules([f8, VIEW]);
    expect(lines).toEqual(['cp-s2-b: F1/F8 rule on veil alone; veil (p5) misses partial beams, add upper.contrast']);
    expect(lintRules([{ ...f8, rules: { 'upper.veil': { max: 0.1 }, 'upper.contrast': { min: 0.5 } } }])).toEqual([]);
    expect(lintRules([{ ...f8, rules: { 'upper.veil': { max: null }, 'upper.contrast': { min: null } } }])).toEqual([]);
  });
});

describe('visual-gate gate: parity checks', () => {
  it('cardCheck: a row miss, an edge skip, a band hit', () => {
    // (deviation, vg5-build.md) the brief's example 0.27 -> miss contradicts its own rule (parityRange skip -> 'edge'):
    // 0.27 is 0.01 from the 0.28 band edge, so VG1's parityRange skips it (tests/visualGateMetrics.test.ts). A row miss
    // is shown on row 0.12 (0-0.06) instead.
    expect(cardCheck(0.12, 0.1)).toMatchObject({ min: 0, max: 0.06, ok: false, skip: null });
    expect(cardCheck(0.27, 0.12)).toMatchObject({ min: 0, max: 0.11, ok: true, skip: 'edge' });
    expect(cardCheck(0.29, 0.9)).toMatchObject({ ok: true, skip: 'edge' });
    expect(cardCheck(0.7, 0.6)).toMatchObject({ ok: true, skip: null });
  });

  it('meterCheck: d 0.03 misses, with flicker it is skipped; d 0.01 ok', () => {
    expect(meterCheck(0.33, 0.3, 0)).toMatchObject({ ok: false, skip: null });
    expect(meterCheck(0.33, 0.3, 0).d).toBeCloseTo(0.03, 9);
    expect(meterCheck(0.33, 0.3, 2)).toMatchObject({ ok: true, skip: 'flicker' });
    expect(meterCheck(0.31, 0.3, 0)).toMatchObject({ ok: true, skip: null });
  });
});

describe('visual-gate gate: known items', () => {
  it('a known rig with a leak flag prints KNOWN and the flag does not count for decide', () => {
    const f = flag('so-corner-on@epic', { region: 'leak', metric: 'mean', base: null, cur: 0.01, delta: null, tol: 0.004, kind: 'rule', known: RIG.known });
    expect(knownLines({ [RIG.id]: RIG }, [f])).toEqual([`KNOWN so-corner-on@epic leak.mean 0.0100 vs 0.0040 (${RIG.known})`]);
    expect(decide({ errors: [], flags: [f], parity: [], picks: 0, rulesOnly: true, renderers: ['r'], notRun: 0 }).verdict).toBe('clean');
  });

  it('a known item with a calibrated rule evaluated and no flag -> KNOWN PASSES', () => {
    expect(knownLines([RIG], [])).toEqual([`KNOWN PASSES so-corner: ${RIG.known} - remove \`known\` (A10)`]);
    expect(knownLines([RIG], [], { 'so-corner': 0 })).toEqual([]);
    expect(knownLines([RIG], [], { 'so-corner': 2 })).toHaveLength(1);
    expect(knownLines([VIEW], [])).toEqual([]);
  });
});

describe('visual-gate gate: decide', () => {
  const base = { errors: [] as string[], flags: [] as Flag[], parity: [] as { ok: boolean }[], picks: 5, rulesOnly: false, renderers: ['ANGLE (NVIDIA)'], notRun: 0 };

  it('errors, renderer mismatch, no baseline, over budget -> error', () => {
    expect(decide({ ...base, errors: ['boot: no match'] })).toEqual({ verdict: 'error', reason: 'boot: no match' });
    expect(decide({ ...base, renderers: ['a', 'b'] }).reason).toMatch(/^renderer mismatch/);
    expect(decide({ ...base, renderers: ['a b', ' a  b '] }).verdict).toBe('clean');
    expect(decide({ ...base, picks: 0 })).toEqual({ verdict: 'error', reason: 'no baseline for renderer ANGLE (NVIDIA)' });
    expect(decide({ ...base, picks: {} }).verdict).toBe('error');
    expect(decide({ ...base, picks: 0, rulesOnly: true }).verdict).toBe('clean');
    expect(decide({ ...base, notRun: 3 })).toEqual({ verdict: 'error', reason: 'over budget: 3 shots not run' });
    expect(decide({ ...base, notRun: ['a', 'b', 'c'] }).reason).toBe('over budget: 3 shots not run');
  });

  it('a non-known flag or a parity miss -> flagged; only known flags and skipped cards -> clean; error keeps flags', () => {
    expect(decide({ ...base, flags: [flag('k@low')] }).verdict).toBe('flagged');
    expect(decide({ ...base, parity: [{ ok: false }] }).verdict).toBe('flagged');
    expect(decide({ ...base, flags: [flag('k@low', { known: 'F5b' })], parity: [{ ok: true }, { ok: true }] }).verdict).toBe('clean');
    const flags = [flag('k@low')];
    expect(decide({ ...base, flags, errors: ['x'] }).verdict).toBe('error');
    expect(flags).toHaveLength(1);
  });

  it('topFlags: non-known flags then parity misses, at most n', () => {
    expect(topFlags([flag('a@low'), flag('b@low', { known: 'F5b' })], [{ id: 'card-x-1', ok: false }], 3)).toEqual(['a@low whole.mean', 'card-x-1 parity']);
    expect(topFlags([flag('a@low'), flag('b@low'), flag('c@low'), flag('d@low')], [], 3)).toHaveLength(3);
  });
});

/** A raw run and context: one view at both presets, the rig on / off at Epic, a meter row and a card. */
function fixture({ darken = false, miss = false, many = 0 } = {}) {
  const items = { [VIEW.id]: VIEW, [RIG.id]: RIG };
  const shots = [rec(VIEW.id, 'low', null, shotMetrics(darken ? 0.1 : 0.4)), rec(VIEW.id, 'epic', null, shotMetrics(0.4))];
  const rigs = [rec(RIG.id, 'epic', 'on', shotMetrics(0.2, {}, { mean: 0, p95: 0 })), rec(RIG.id, 'epic', 'off', shotMetrics(0.2))];
  const parity = [
    { kind: 'meter', id: 'meter-m-test@low', map: 'ctcourse', view: VIEW.id, at: VIEW.feet, level: null, luma: null, meter: 0.3, field: 0.3, min: null, max: null, ok: true, skip: null, note: null },
    { kind: 'card', id: 'card-m-test-1', map: 'ctcourse', view: VIEW.id, at: [1, 1, 1], level: 0.12, luma: miss ? 0.2 : 0.05, meter: null, field: null, min: 0, max: 0.06, ok: !miss, skip: null, note: null },
  ];
  const picks: Record<string, ReturnType<typeof pick>> = {};
  // the baseline is the normal build: view 0.4, rig 0.2
  for (const s of [...shots, ...rigs]) picks[s.key] = pick(s.key, shotMetrics(s.rigState ? 0.2 : 0.4));
  const flagsExtra = Array.from({ length: many }, (_, i) => rec(`extra-${i}`, 'low', null, shotMetrics(0.9)));
  for (const s of flagsExtra) picks[s.key] = pick(s.key, shotMetrics(0.1));
  const raw = { shots: [...shots, ...flagsExtra], rigs, parity, errors: [], renderers: ['ANGLE (NVIDIA GeForce RTX)'], notRun: [], wallMs: 152340, browsers: [{ preset: 'low', wallMs: 120000 }, { preset: 'epic', wallMs: 152000 }] };
  return { raw, ctx: { items, picks, rulesOnly: false, tolerances: {} } };
}

const SUMMARY_KEYS = ['v', 'verdict', 'sha', 'version', 'train', 'renderer', 'shots', 'flags', 'known', 'parity', 'newKeys', 'warnings', 'errors', 'base', 'wallS', 'reason', 'top', 'recorded', 'thumbs'];

function block(raw: ReturnType<typeof fixture>['raw'], ctx: ReturnType<typeof fixture>['ctx']) {
  const score = scoreRun(raw, ctx);
  const summary = summarize({ score, sha: SHA, version: '4.97.1', train: 66, renderer: raw.renderers[0], picks: ctx.picks, wallMs: raw.wallMs, recorded: false, thumbs: [] });
  return { score, summary, text: renderBlock(summary, score, { browsers: raw.browsers }) as string };
}

describe('visual-gate gate: scoreRun -> summarize -> renderBlock', () => {
  it('a clean run: KNOWN PASSES for the quiet known rig, the block markers and the summary line', () => {
    const { raw, ctx } = fixture();
    const { score, summary, text } = block(raw, ctx);
    expect(score.verdict).toBe('clean');
    expect(score.known).toEqual([`KNOWN PASSES so-corner: ${RIG.known} - remove \`known\` (A10)`]);
    const lines = text.split('\n');
    expect(lines[0]).toBe('VISUAL-GATE BEGIN');
    expect(lines[lines.length - 1]).toBe('VISUAL-GATE END');
    const m = /^<!-- visual-gate-summary (.*) -->$/.exec(lines[1]!);
    expect(m).not.toBeNull();
    const j = JSON.parse(m![1]!);
    expect(Object.keys(j).sort()).toEqual([...SUMMARY_KEYS].sort());
    expect(j).toEqual(summary);
    expect(j).toMatchObject({ v: 1, verdict: 'clean', shots: 4, flags: 0, parity: 0, newKeys: 0, base: { version: '4.97.0', approver: null }, wallS: 152.3 });
    expect(lines[2]).toBe(`### visual-gate: clean on ${SHA.slice(0, 8)} (4.97.1, train 66)`);
    expect(lines[3]).toBe('baseline 4.97.0 (green release), renderer ANGLE (NVIDIA GeForce RTX), 4 shots, wall 152.3 s (low 120.0 s, epic 152.0 s)');
  });

  it('a flagged run: rule + drift rows, a parity line, top at most 3', () => {
    const { raw, ctx } = fixture({ darken: true, miss: true });
    const { score, summary, text } = block(raw, ctx);
    expect(score.verdict).toBe('flagged');
    expect(summary.flags).toBeGreaterThanOrEqual(2);
    expect(summary.parity).toBe(1);
    expect(summary.top.length).toBeLessThanOrEqual(3);
    expect(summary.top[0]).toBe('m-test@low whole.mean');
    expect(text).toContain('| key | region | metric | base | now | tol | kind |');
    expect(text).toContain('| m-test@low | whole | mean | - | 0.1000 | 0.2000 | rule |');
    expect(text).toContain('PARITY card-m-test-1 level 0.1200 luma 0.2000 range 0.0000-0.0600');
    expect(text.split('\n')[2]).toMatch(/^### visual-gate: \d+ flags on aaaaaaaa \(4\.97\.1, train 66\)$/);
  });

  it('45 flags -> 40 rows and "... 5 more"', () => {
    const { raw, ctx } = fixture();
    const flags = Array.from({ length: 45 }, (_, i) => flag(`k${i}@low`));
    const score = { ...scoreRun(raw, ctx), flags };
    const summary = summarize({ score, sha: SHA, version: '4.97.1', train: null, renderer: 'r', picks: ctx.picks, wallMs: 1000, recorded: false, thumbs: [] });
    const text = renderBlock(summary, score, {});
    expect(text.split('\n').filter((l: string) => /^\| k\d+@low \|/.test(l))).toHaveLength(40);
    expect(text).toContain('... 5 more');
    expect(summary.flags).toBe(45);
    expect(summary.top).toHaveLength(3);
  });

  it('new keys, warnings, errors and the accepted approver', () => {
    const { raw, ctx } = fixture();
    delete (ctx.picks as Record<string, unknown>)['m-test@epic'];
    ctx.picks['m-test@low'] = pick('m-test@low', shotMetrics(0.4), '4.97.0', 'accepted', 'orchestrator');
    raw.shots[0] = { ...raw.shots[0]!, converged: false, aimReady: false, settle: { ...raw.shots[0]!.settle, alarm: { before: { stage: 0, reinforced: 0 }, after: { stage: 1, reinforced: 2 }, raised: true } as never } };
    raw.parity.push({ kind: 'meter', id: 'meter-m-test@epic', map: 'ctcourse', view: VIEW.id, at: VIEW.feet, level: null, luma: null, meter: 0.4, field: 0.3, min: null, max: null, ok: true, skip: 'flicker', note: null } as never);
    raw.shots.push(rec('m-boom', 'epic', null, null, { error: 'settle timed out' }) as never);
    const { score, summary, text } = block(raw, ctx);
    expect(score.newKeys).toEqual(['m-test@epic']);
    expect(summary.base).toEqual({ version: '4.97.0', approver: 'orchestrator' });
    expect(score.verdict).toBe('error');
    expect(text).toContain('NEW 1 key(s) without a baseline: m-test@epic');
    expect(text).toContain('WARN m-test@low: unsteady (converge not settled)');
    expect(text).toContain('WARN m-test@low: scene not ready');
    expect(text).toMatch(/WARN m-test@low: alarm raised in the settle/);
    expect(text).toMatch(/WARN meter-m-test@epic: meter 0\.4000 vs field 0\.3000 with flickering lights/);
    expect(text).toContain('ERROR m-boom@epic: settle timed out');
    expect(text.split('\n')[2]).toBe(`### visual-gate: error: m-boom@epic: settle timed out on ${SHA.slice(0, 8)} (4.97.1, train 66)`);
  });

  it('rulesOnly: no picks needed, no new keys, no drift', () => {
    const { raw, ctx } = fixture({ darken: true });
    const score = scoreRun(raw, { ...ctx, picks: {}, rulesOnly: true });
    expect(score.newKeys).toEqual([]);
    expect(score.verdict).toBe('flagged');
    expect(score.flags.every((f: Flag) => f.kind === 'rule')).toBe(true);
  });
});

describe('visual-gate gate: runRecord, shouldRecord, thumbsToPush', () => {
  it('runRecord passes validateRun, maps clean to green and rounds numbers', () => {
    const { raw } = fixture();
    const shots = [rec(VIEW.id, 'low', null, shotMetrics(0.123456789))];
    const r = runRecord({ sha: SHA, version: '4.97.1', train: 66, branch: 'train/66', at: '2026-10-24T10:00:00Z', renderer: '  ANGLE  (x) ', chrome: '140', verdict: 'clean', shots, rigs: raw.rigs, parity: raw.parity, flags: [flag('k@low', { cur: 0.1234567 })], ms: 1234.4 });
    expect(validateRun(r)).toEqual([]);
    expect(r.verdict).toBe('green');
    expect(r.renderer).toBe('ANGLE (x)');
    expect(r.viewport).toEqual({ width: 960, height: 540 });
    expect((r.shots[0] as { metrics: { whole: { mean: number } } }).metrics.whole.mean).toBe(0.12346);
    expect((r.flags[0] as Flag).cur).toBe(0.12346);
    expect(r.ms).toBe(1234);
    expect(runRecord({ sha: SHA, version: '4.97.1', train: null, branch: '', at: 'x', renderer: 'r', chrome: '', verdict: 'flagged', shots: [], rigs: [], parity: [], flags: [], ms: 0 }).verdict).toBe('flagged');
  });

  it('shouldRecord: each refusal and the ok case', () => {
    const ok = { record: true, noRecord: false, only: null, maps: null, extra: '', sha: SHA, measured: 5 };
    expect(shouldRecord(ok)).toEqual({ ok: true, why: 'ok' });
    expect(shouldRecord({ ...ok, noRecord: true })).toMatchObject({ ok: false, why: '--no-record' });
    expect(shouldRecord({ ...ok, record: false }).ok).toBe(false);
    expect(shouldRecord({ ...ok, only: ['m-a1-lounge'] }).why).toMatch(/--only/);
    expect(shouldRecord({ ...ok, maps: ['ctcourse'] }).why).toMatch(/--maps/);
    expect(shouldRecord({ ...ok, extra: 'falloff=photo' }).why).toMatch(/--extra/);
    expect(shouldRecord({ ...ok, sha: 'abc1234' }).why).toMatch(/40 hex/);
    expect(shouldRecord({ ...ok, measured: 0 }).why).toBe('nothing measured');
  });

  it('thumbsToPush: a flagged key and its base thumb; known flags and missing base thumbs skipped', () => {
    const t = new Uint8Array([1]);
    const b = new Uint8Array([2]);
    const picks = { 'a@low': pick('a@low', {}), 'c@low': pick('c@low', {}) };
    const out = thumbsToPush(
      [flag('a@low'), flag('a@low', { metric: 'hist' }), flag('b@low', { known: 'F5b' }), flag('c@low')],
      picks,
      (key: string) => (key === 'b@low' ? t : t),
      (sha: string, key: string) => (sha === SHA2 && key === 'a@low' ? b : null),
    );
    expect(Object.keys(out).sort()).toEqual(['a@low', 'a@low.base', 'c@low']);
    expect(out['a@low.base']).toBe(b);
  });
});

describe('visual-gate gate: static guard', () => {
  const gate = fs.readFileSync('scripts/visual-gate/gate.mjs', 'utf8');
  const runner = fs.readFileSync('scripts/e2e-visual.mjs', 'utf8');

  it('gate.mjs is pure: no node: import, no game source; the runner has no Babylon', () => {
    expect(gate).not.toMatch(/import[^;]*from\s+['"]node:/);
    expect(gate).not.toContain('/src/');
    expect(gate).not.toMatch(/from\s+['"]\.\/(store|harness|viewpoints)\.mjs['"]/);
    expect(runner).not.toContain('@babylonjs');
  });
});
