import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { visualPlan, visualEnv, extractBlock, parseSummary, visualVerdict, thumbUrl, visualComment, VISUAL_CONTEXT, BLOCK_CAP,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/laptop-queue/visual.mjs';

// The laptop queue's visual-gate post-step (visual-gate VG6, docs/laptop-queue/visual-gate.md): the pure part in
// scripts/laptop-queue/visual.mjs, plus a static guard on where service.mjs calls it.

const SHA = 'c0ffee12'.repeat(5);
const TRAIN = { n: 71, sha: SHA };

type Summary = Record<string, unknown>;
const summary = (over: Summary = {}): Summary => ({
  v: 1, verdict: 'clean', sha: SHA, version: '4.98.4', train: 71, renderer: 'ANGLE (NVIDIA, D3D11)', shots: 76, flags: 0,
  known: 0, parity: 0, newKeys: 0, warnings: 0, errors: 0, base: { version: '4.97.0', approver: 'orchestrator' }, wallS: 152,
  reason: null, top: [], recorded: true, thumbs: [], ...over,
});
/** A block in VG5's format (the suite's stdout), with some log around it. */
const block = (s: object, body = '| key | region | metric | base | now | tol | kind |', eol = '\n'): string =>
  ['VISUAL-GATE BEGIN', `<!-- visual-gate-summary ${JSON.stringify(s)} -->`, '### visual-gate: clean on c0ffee12 (4.98.4, train 71)', body, 'VISUAL-GATE END'].join(eol);
const log = (...blocks: string[]): string => ['$ node scripts/run-e2e.mjs e2e-visual', 'serving dist on 4189', ...blocks, 'PASS e2e-visual 151.2s'].join('\n');

describe('visualPlan', () => {
  const base = { enabled: true, desktop: false, hasScript: true, trainOk: true, ports: ['4189', '4192'] };
  it('disabled, no script or a failed train: no run, no status', () => {
    expect(visualPlan({ ...base, enabled: false })).toEqual({ run: false, status: null });
    expect(visualPlan({ ...base, hasScript: false })).toEqual({ run: false, status: null });
    expect(visualPlan({ ...base, trainOk: false })).toEqual({ run: false, status: null });
    expect(visualPlan({ ...base, trainOk: false, desktop: true })).toEqual({ run: false, status: null });
  });
  it('desktop: no run, the skipped error status (A20)', () => {
    expect(visualPlan({ ...base, desktop: true, ports: ['4191', '4192'] })).toEqual({
      run: false, status: { state: 'error', description: 'skipped: desktop lane (laptop GPU only)' },
    });
  });
  it('laptop: runs on the first slot, releases the rest', () => {
    expect(visualPlan(base)).toEqual({ run: true, port: '4189', release: ['4192'] });
    expect(visualPlan({ ...base, ports: ['4192'] })).toEqual({ run: true, port: '4192', release: [] });
  });
});

describe('visualEnv', () => {
  it('the five keys', () => {
    expect(visualEnv(TRAIN)).toEqual({ E2E_SUITE_TIMEOUT: '300', VG_RECORD: '1', VG_TRAIN: '71', VG_SHA: SHA, VG_BRANCH: 'train/71' });
  });
});

describe('extractBlock / parseSummary', () => {
  it('none -> null', () => {
    expect(extractBlock(log())).toBeNull();
    expect(extractBlock('')).toBeNull();
    expect(parseSummary(null)).toBeNull();
  });
  it('one block -> it, summary parsed', () => {
    const b = block(summary());
    expect(extractBlock(log(b))).toBe(b);
    expect(parseSummary(b)).toMatchObject({ v: 1, verdict: 'clean', shots: 76 });
  });
  it('two blocks -> the last', () => {
    const a = block(summary({ shots: 1 }));
    const b = block(summary({ shots: 2 }));
    expect(extractBlock(log(a, 'between', b))).toBe(b);
    expect(parseSummary(extractBlock(log(a, b)))).toMatchObject({ shots: 2 });
  });
  it('CRLF -> found, normalised', () => {
    const b = block(summary(), '| a | b |', '\r\n');
    const got = extractBlock(`x\r\n${b}\r\ny`);
    expect(got).toBe(b.replace(/\r\n/g, '\n'));
    expect(parseSummary(got)).toMatchObject({ verdict: 'clean' });
  });
  it('BEGIN without END -> null (also when an earlier block is complete)', () => {
    expect(extractBlock(log('VISUAL-GATE BEGIN', '<!-- visual-gate-summary {"v":1} -->', '| half'))).toBeNull();
    expect(extractBlock(log(block(summary()), 'VISUAL-GATE BEGIN', 'cut off'))).toBeNull();
  });
  it('bad JSON, v 2, unknown verdict -> summary null', () => {
    expect(parseSummary(['VISUAL-GATE BEGIN', '<!-- visual-gate-summary {"v":1,verdict} -->', 'VISUAL-GATE END'].join('\n'))).toBeNull();
    expect(parseSummary(block(summary({ v: 2 })))).toBeNull();
    expect(parseSummary(block(summary({ verdict: 'green' })))).toBeNull();
    expect(parseSummary(['VISUAL-GATE BEGIN', 'no machine line', 'VISUAL-GATE END'].join('\n'))).toBeNull();
  });
});

describe('visualVerdict', () => {
  const verdict = (s: Summary, o?: object) => visualVerdict(log(block(s)), o);
  it('clean', () => {
    expect(verdict(summary())).toMatchObject({ state: 'success', description: 'clean: 76 shots vs 4.97.0, 152 s' });
  });
  it('clean with known and warnings', () => {
    expect(verdict(summary({ known: 1, warnings: 2 })).description).toBe('clean: 76 shots vs 4.97.0, 152 s; 1 known; 2 warn');
  });
  it('clean without a baseline', () => {
    expect(verdict(summary({ base: null })).description).toBe('clean: 76 shots vs no baseline, 152 s');
  });
  it('KNOWN-only run (verdict clean, known 1) -> success', () => {
    expect(verdict(summary({ known: 1 }))).toMatchObject({ state: 'success', description: 'clean: 76 shots vs 4.97.0, 152 s; 1 known' });
  });
  it('flagged by drift', () => {
    const top = ['m-a3-lobby@low wall.blotch', 'm-a3-lobby@epic wall.blotch', 'so-door@low door.mean'];
    const v = verdict(summary({ verdict: 'flagged', flags: 3, top }));
    expect(v.state).toBe('failure');
    expect(v.description).toBe('3 flags: m-a3-lobby@low wall.blotch, m-a3-lobby@epic wall.blotch, so-door@low door.mean vs 4.97.0');
    expect(v.summary).toMatchObject({ flags: 3 });
  });
  it('flagged by parity only', () => {
    const v = verdict(summary({ verdict: 'flagged', parity: 1, top: ['card-m-a3-lobby-1 parity'] }));
    expect(v).toMatchObject({ state: 'failure', description: '1 flag: card-m-a3-lobby-1 parity vs 4.97.0' });
  });
  it('error: no baseline for the renderer', () => {
    const v = verdict(summary({ verdict: 'error', base: null, reason: 'no baseline for renderer ANGLE (NVIDIA, D3D11)' }), { code: 3 });
    expect(v).toMatchObject({ state: 'error', description: 'error: no baseline for renderer ANGLE (NVIDIA, D3D11)' });
    expect(verdict(summary({ verdict: 'error', reason: null }), { code: 3 }).description).toBe('error: unknown');
  });
  it('missing block', () => {
    expect(visualVerdict(log(), { code: 1 })).toEqual({ state: 'error', description: 'no result (exit 1)', summary: null, block: null });
  });
  it('killed: the KILLED line, code 124 or timedOut', () => {
    const want = 'over 300 s (killed), no result';
    expect(visualVerdict(`${log()}\r\nKILLED: e2e-visual ran past 300s\r\n`, { code: 1 }).description).toBe(want);
    expect(visualVerdict(log(), { code: 124 }).description).toBe(want);
    expect(visualVerdict('', { timedOut: true }).description).toBe(want);
  });
  it('unreadable block', () => {
    expect(verdict(summary({ v: 2 }))).toMatchObject({ state: 'error', description: 'unreadable result block', summary: null });
  });
  it('clean block with a non-zero exit -> error', () => {
    expect(verdict(summary(), { code: 1 })).toMatchObject({ state: 'error', description: 'exit 1 with a clean block' });
  });
  it('descriptions never pass 140 chars', () => {
    const top = Array.from({ length: 30 }, (_, i) => `m-view-${i}@epic region.blotch`);
    const flagged = verdict(summary({ verdict: 'flagged', flags: 30, top }));
    expect(flagged.description.length).toBe(140);
    expect(flagged.description.endsWith('...')).toBe(true);
    const err = verdict(summary({ verdict: 'error', reason: `no baseline for renderer ${'R'.repeat(200)}` }), { code: 3 });
    expect(err.description.length).toBeLessThanOrEqual(140);
    expect(err.description.startsWith('error: no baseline for renderer RRR')).toBe(true);
  });
});

describe('thumbUrl', () => {
  it('encodes @, keeps .base', () => {
    expect(thumbUrl(SHA, 'm-a3-lobby@low')).toBe(`https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines/runs/${SHA}/thumbs/m-a3-lobby%40low.webp`);
    expect(thumbUrl(SHA, 'm-a3-lobby@low.base')).toMatch(/\/thumbs\/m-a3-lobby%40low\.base\.webp$/);
  });
});

describe('visualComment', () => {
  const flagged = (over: Summary = {}, body?: string) =>
    visualVerdict(log(block(summary({ verdict: 'flagged', flags: 1, top: ['a@low wall.blotch'], thumbs: ['a@low', 'a@low.base'], ...over }), body)));
  it('null for success and error', () => {
    expect(visualComment(visualVerdict(log(block(summary()))), TRAIN)).toBeNull();
    expect(visualComment(visualVerdict(log(), { code: 1 }), TRAIN)).toBeNull();
  });
  it('a failure: description, block body without the markers, thumbs, the accept line', () => {
    const v = flagged({}, '| a@low | wall | blotch | 0.0100 | 0.0900 | 0.0200 | drift |');
    const c = visualComment(v, TRAIN) as string;
    expect(c.split('\n')[0]).toBe(`visual-gate flagged train 71 (c0ffee12): ${v.description}`);
    expect(c).toContain('| a@low | wall | blotch | 0.0100 | 0.0900 | 0.0200 | drift |');
    expect(c).toContain('<!-- visual-gate-summary ');
    expect(c).not.toContain('VISUAL-GATE BEGIN');
    expect(c).not.toContain('VISUAL-GATE END');
    expect(c).toContain('Thumbs (now | baseline):');
    expect(c).toContain(`- \`a@low\`: [now](${thumbUrl(SHA, 'a@low')}) | [baseline](${thumbUrl(SHA, 'a@low.base')})`);
    expect(c).not.toContain('- `a@low.base`');
    expect(c).toContain(`baseline.mjs accept --sha ${SHA} --by <name> --why <text> [--only k,k]`);
  });
  it('no baseline link when only the key is listed; no thumbs section when none', () => {
    const c = visualComment(flagged({ thumbs: ['a@low'] }), TRAIN) as string;
    expect(c).toContain(`- \`a@low\`: [now](${thumbUrl(SHA, 'a@low')})\n`);
    expect(c).not.toContain('[baseline]');
    expect(visualComment(flagged({ thumbs: [] }), TRAIN)).not.toContain('Thumbs (now | baseline):');
  });
  it('a body over BLOCK_CAP is cut (capTail marker, its tail kept)', () => {
    const body = Array.from({ length: 400 }, (_, i) => `| k${i}@low | wall | blotch | 0.0100 | 0.0900 | 0.0200 | drift |`).join('\n');
    expect(body.length).toBeGreaterThan(BLOCK_CAP);
    const c = visualComment(flagged({}, body), TRAIN) as string;
    expect(c).toContain('...(cut)\n');
    expect(c).toContain('| k399@low |');
    expect(c).not.toContain('| k0@low |');
    expect(c.length).toBeLessThan(BLOCK_CAP + 2000);
  });
});

describe('service.mjs wiring (static)', () => {
  const src = fs.readFileSync(new URL('../scripts/laptop-queue/service.mjs', import.meta.url), 'utf8');
  it('imports visual.mjs', () => {
    expect(src).toMatch(/^import \{[^}]*\bvisualPlan\b[^}]*\} from '\.\/visual\.mjs';$/m);
    expect(VISUAL_CONTEXT).toBe('visual-gate');
  });
  it('runVisual( runs after the laptop-e2e finish and before the finally', () => {
    const fin = src.indexOf("const ok = finish(job, 'laptop-e2e'");
    expect(fin).toBeGreaterThan(0);
    const call = src.indexOf('runVisual(', fin);
    const next = src.indexOf('} finally {', fin);
    expect(call).toBeGreaterThan(fin);
    expect(call).toBeLessThan(next);
    expect(src).toMatch(/async function runVisual\(train, ports, locks, ctl, runDir, prNumber, trainOk\)/);
  });
  it('e2e takes the options parameter; the existing env is unchanged', () => {
    expect(src).toMatch(/async function e2e\(port, suites, jobs, logFile, ctl, \{ env: extra = \{\}, timeoutMs \} = \{\}\)/);
    expect(src).toContain('const SUITE_TIMEOUT_S = 900;'); // laptop-queue-10: the hung cut reads it too
    expect(src).toContain('E2E_SUITE_TIMEOUT: String(SUITE_TIMEOUT_S), ');
  });
});
