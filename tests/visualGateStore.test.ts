import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BRANCH, shotKey, cmpSemver, validateRun, runPaths, acceptRecord, acceptPath, pickBaseline, parseArgs,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/storeLib.mjs';
// @ts-expect-error plain .mjs process script without types
import { readRecords, writeFiles, recordRun, recordAccept, isAncestorFn } from '../scripts/visual-gate/store.mjs';
// @ts-expect-error plain .mjs process script without types
import { main } from '../scripts/visual-gate/baseline.mjs';

// Visual gate baseline store (docs/visual-gate/briefs/VG4.md): the pure record shapes and pickBaseline (A8), the CLI
// parser, and the git plumbing against temp repos (a bare remote and a work repo), never the real origin.

interface Shot { key: string; [k: string]: unknown }
interface Run {
  sha: string; version: string; train: number | null; branch: string; at: string;
  renderer: string; chrome: string; viewport: { width: number; height: number };
  verdict: 'green' | 'flagged' | 'error';
  shots: Shot[]; rigs: Shot[]; parity: Record<string, unknown>[]; flags: Record<string, unknown>[]; ms: number;
}
interface Accept { sha: string; version: string; by: string; why: string; at: string; only: string[] | null }
interface Pick { key: string; sha: string; version: string; source: 'accepted' | 'green'; approver: string | null; shot: Shot }

const sha = (c: string): string => c.repeat(40).slice(0, 40);

function run(over: Partial<Run> = {}): Run {
  return {
    sha: sha('a'), version: '4.97.0', train: 12, branch: 'train/12', at: '2026-10-24T10:00:00.000Z',
    renderer: 'R1', chrome: '130', viewport: { width: 1280, height: 720 }, verdict: 'green',
    shots: [{ key: 'a@low', luma: 0.2 }, { key: 'b@low', luma: 0.3 }], rigs: [], parity: [], flags: [], ms: 1000,
    ...over,
  };
}

describe('visual gate store: pure', () => {
  it('shotKey and BRANCH', () => {
    expect(BRANCH).toBe('visual-baselines');
    expect(shotKey('yard-gate', 'low')).toBe('yard-gate@low');
    expect(shotKey('lamp-3', 'epic', 'on')).toBe('lamp-3-on@epic');
    expect(shotKey('lamp-3', 'epic', 'off')).toBe('lamp-3-off@epic');
  });

  it('cmpSemver orders numerically and throws on a malformed version', () => {
    expect(cmpSemver('4.97.0', '4.97.1')).toBeLessThan(0);
    expect(cmpSemver('4.97.1', '4.100.0')).toBeLessThan(0);
    expect(cmpSemver('4.100.0', '4.97.0')).toBeGreaterThan(0);
    expect(cmpSemver('4.97.0', '4.97.0')).toBe(0);
    expect(() => cmpSemver('4.97', '4.97.0')).toThrow();
    expect(() => cmpSemver('4.97.0', 'v4.97.0')).toThrow();
  });

  it('validateRun', () => {
    expect(validateRun(run())).toEqual([]);
    expect(validateRun(run({ sha: 'abc' })).join(' ')).toMatch(/sha/);
    expect(validateRun(run({ rigs: [{ key: 'a@low' }] })).join(' ')).toMatch(/duplicate key a@low/);
    expect(validateRun(run({ renderer: '' })).join(' ')).toMatch(/renderer/);
    expect(validateRun(run({ version: '4.97' })).join(' ')).toMatch(/version/);
    expect(validateRun({ ...run(), verdict: 'red' }).join(' ')).toMatch(/verdict/);
    expect(validateRun({ ...run(), shots: [{ luma: 1 }] }).join(' ')).toMatch(/key/);
    expect(validateRun(null).length).toBe(1);
  });

  it('validateRun and runPaths refuse keys that leave the run folder (/, \\, ..)', () => {
    expect(validateRun(run({ shots: [{ key: 'x/y@low' }] })).join(' ')).toMatch(/x\/y@low contains a path separator/);
    expect(validateRun(run({ rigs: [{ key: 'x\\y-on@low' }] })).join(' ')).toMatch(/path separator/);
    expect(validateRun(run({ shots: [{ key: '..@low' }] })).join(' ')).toMatch(/\.\.@low contains \.\./);
    expect(validateRun(run({ shots: [{ key: 'a.b@low' }] }))).toEqual([]);
    expect(() => runPaths(run(), { '../evil@low': new Uint8Array([1]) })).toThrow(/thumb key/);
    expect(() => runPaths(run(), { 'a/b@low': new Uint8Array([1]) })).toThrow(/path separator/);
  });

  it('runPaths writes the result and one webp per thumb under the raw key', () => {
    const r = run();
    const thumb = new Uint8Array([1, 2, 3]);
    const files = runPaths(r, { 'a@low': thumb }) as { path: string; data: string | Uint8Array }[];
    expect(files.map((f) => f.path)).toEqual([`runs/${r.sha}/result.json`, `runs/${r.sha}/thumbs/a@low.webp`]);
    expect(files[0]?.data).toBe(`${JSON.stringify(r, null, 2)}\n`);
    expect(files[1]?.data).toBe(thumb);
    expect((runPaths(r) as unknown[]).length).toBe(1);
  });

  it('acceptRecord refusals and a good record', () => {
    const at = '2026-10-24T12:00:00.000Z';
    expect(() => acceptRecord({ run: null, by: 'Michael', why: 'x', at })).toThrow('no recorded run for that sha');
    expect(() => acceptRecord({ run: run(), by: 'Michael', why: '  ', at })).toThrow('--why is empty');
    expect(() => acceptRecord({ run: run(), by: ' ', why: 'x', at })).toThrow('--by is empty');
    expect(() => acceptRecord({ run: run(), by: 'Michael', why: 'x', only: ['zz@low'], at })).toThrow('unknown key zz@low');
    const a = acceptRecord({ run: run({ sha: sha('c'), version: '4.96.2' }), by: 'Michael', why: 'initial', only: ['b@low'], at }) as Accept;
    expect(a).toEqual({ sha: sha('c'), version: '4.96.2', by: 'Michael', why: 'initial', at, only: ['b@low'] });
    expect(acceptPath(a)).toBe('accepted/4.96.2-cccccccc.json');
    expect((acceptRecord({ run: run(), by: 'o', why: 'w', at }) as Accept).only).toBeNull();
  });

  it('acceptRecord refuses a corrupt recorded run (validateRun)', () => {
    const at = '2026-10-24T12:00:00.000Z';
    expect(() => acceptRecord({ run: run({ version: '-p' }), by: 'o', why: 'w', at })).toThrow(/recorded run is invalid: version/);
    expect(() => acceptRecord({ run: run({ sha: `${sha('a').slice(0, 39)}/` }), by: 'o', why: 'w', at })).toThrow(/recorded run is invalid: sha/);
    expect(() => acceptRecord({ run: run({ shots: [{ key: '../x@low' }] }), by: 'o', why: 'w', at })).toThrow(/recorded run is invalid/);
  });

  describe('pickBaseline (A8)', () => {
    const anc = (...shas: string[]) => (s: string): boolean => shas.includes(s);
    const opts = (isAncestor: (s: string) => boolean) => ({ isAncestor, renderer: 'R1', version: '4.98.0' });
    const r96 = run({ sha: sha('1'), version: '4.96.0' });
    const r97 = run({ sha: sha('2'), version: '4.97.0' });

    it('(1) the newest green ancestor wins', () => {
      const p = pickBaseline({ runs: [r96, r97], accepted: [] }, opts(anc(r96.sha, r97.sha))) as Record<string, Pick>;
      expect(p['a@low']?.version).toBe('4.97.0');
      expect(p['a@low']?.source).toBe('green');
      expect(p['a@low']?.approver).toBeNull();
      expect(p['b@low']?.shot).toEqual({ key: 'b@low', luma: 0.3 });
    });

    it('(2) a newer flagged run that is not accepted falls back to the older green', () => {
      const f97 = { ...r97, verdict: 'flagged' as const };
      const p = pickBaseline({ runs: [r96, f97], accepted: [] }, opts(anc(r96.sha, r97.sha))) as Record<string, Pick>;
      expect(p['a@low']?.version).toBe('4.96.0');
      expect(p['b@low']?.version).toBe('4.96.0');
    });

    it('(3) an accept with only covers just its keys', () => {
      const f97 = { ...r97, verdict: 'flagged' as const };
      const acc = acceptRecord({ run: f97, by: 'Michael', why: 'new lamp', only: ['a@low'], at: '2026-10-24T12:00:00.000Z' });
      const p = pickBaseline({ runs: [r96, f97], accepted: [acc] }, opts(anc(r96.sha, r97.sha))) as Record<string, Pick>;
      expect(p['a@low']).toMatchObject({ version: '4.97.0', sha: r97.sha, source: 'accepted', approver: 'Michael' });
      expect(p['b@low']).toMatchObject({ version: '4.96.0', source: 'green', approver: null });
    });

    it('(4) a green run that is not an ancestor (a PR run) is ignored', () => {
      const p = pickBaseline({ runs: [r96, r97], accepted: [] }, opts(anc(r96.sha))) as Record<string, Pick>;
      expect(p['a@low']?.version).toBe('4.96.0');
    });

    it('(5) another renderer is ignored', () => {
      const other = run({ sha: sha('3'), version: '4.97.5', renderer: 'R2' });
      const p = pickBaseline({ runs: [r96, other], accepted: [] }, opts(anc(r96.sha, other.sha))) as Record<string, Pick>;
      expect(p['a@low']?.version).toBe('4.96.0');
    });

    it('(6) a run at the current version or above is ignored', () => {
      const same = run({ sha: sha('4'), version: '4.98.0' });
      const above = run({ sha: sha('5'), version: '4.100.0' });
      const p = pickBaseline({ runs: [r96, same, above], accepted: [] }, opts(anc(r96.sha, same.sha, above.sha))) as Record<string, Pick>;
      expect(p['a@low']?.version).toBe('4.96.0');
    });

    it('(7) no candidate leaves the key absent', () => {
      const withC = run({ sha: sha('6'), version: '4.97.0', shots: [{ key: 'c@epic' }] });
      const p = pickBaseline({ runs: [r96, withC], accepted: [] }, opts(anc(r96.sha))) as Record<string, Pick>;
      expect('c@epic' in p).toBe(false);
      expect(Object.keys(p).sort()).toEqual(['a@low', 'b@low']);
      expect(pickBaseline({ runs: [], accepted: [] }, opts(anc()))).toEqual({});
    });

    it('(8) at the same version an accepted run beats a green one', () => {
      const green = run({ sha: sha('7'), version: '4.97.0', at: '2026-10-24T13:00:00.000Z' });
      const flagged = run({ sha: sha('8'), version: '4.97.0', verdict: 'flagged', at: '2026-10-24T11:00:00.000Z' });
      const acc = acceptRecord({ run: flagged, by: 'orchestrator', why: 'G300', at: '2026-10-24T12:00:00.000Z' });
      for (const runs of [[green, flagged], [flagged, green]]) {
        const p = pickBaseline({ runs, accepted: [acc] }, opts(anc(green.sha, flagged.sha))) as Record<string, Pick>;
        expect(p['a@low']).toMatchObject({ sha: flagged.sha, source: 'accepted', approver: 'orchestrator' });
      }
    });

    it('rig keys are picked too, and an error run never qualifies unaccepted', () => {
      const withRig = run({ sha: sha('9'), version: '4.97.0', rigs: [{ key: 'l1-on@low' }, { key: 'l1-off@low' }] });
      const err = run({ sha: sha('e'), version: '4.97.9', verdict: 'error' });
      const p = pickBaseline({ runs: [withRig, err], accepted: [] }, opts(anc(withRig.sha, err.sha))) as Record<string, Pick>;
      expect(p['l1-on@low']?.sha).toBe(withRig.sha);
      expect(p['a@low']?.sha).toBe(withRig.sha);
    });
  });

  it('parseArgs', () => {
    const base = { sha: null, by: null, why: null, only: null, dryRun: false, replace: false };
    expect(parseArgs(['list'])).toEqual({ ...base, cmd: 'list' });
    expect(parseArgs(['show', 'abc1234'])).toEqual({ ...base, cmd: 'show', sha: 'abc1234' });
    expect(parseArgs(['accept', '--sha', 'abc1234', '--by', 'Michael', '--why', 'new lamp'])).toEqual({ ...base, cmd: 'accept', sha: 'abc1234', by: 'Michael', why: 'new lamp' });
    expect(parseArgs(['accept', '--sha', 's', '--only', 'a@low,b@epic', '--dry-run'])).toMatchObject({ cmd: 'accept', only: ['a@low', 'b@epic'], dryRun: true });
    expect(parseArgs(['frob']).cmd).toBe('help');
    expect(parseArgs([]).cmd).toBe('help');
    expect(parseArgs(['show']).cmd).toBe('help');
    expect(parseArgs(['accept', '--nope', 'x']).cmd).toBe('help');
    expect(parseArgs(['accept', '--sha', 's', '--by', 'b', '--why', 'w', '--replace'])).toEqual({ ...base, cmd: 'accept', sha: 's', by: 'b', why: 'w', replace: true });
    // a value starting with -- is a forgotten value, not the value
    expect(parseArgs(['accept', '--sha', 's', '--by', 'b', '--why', '--dry-run']).cmd).toBe('help');
    expect(parseArgs(['accept', '--sha', '--by', 'b', '--why', 'w']).cmd).toBe('help');
    expect(parseArgs(['accept', '--sha', 's', '--only', '--replace']).cmd).toBe('help');
    expect(parseArgs(['accept', '--sha', 's', '--by', 'b', '--why', '-x']).why).toBe('-x');
  });
});

describe('visual gate store: git I/O on temp repos', () => {
  let root = '';
  let bare = '';
  let work = '';
  let masterSha = '';
  const g = (cwd: string, args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000 }).trim();
  const io = () => ({ cwd: work, remote: 'origin' });
  const quiet = <T>(fn: () => T): T => {
    const info = console.info;
    console.info = () => {};
    try { return fn(); } finally { console.info = info; }
  };

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'vg-store-'));
    bare = path.join(root, 'remote.git');
    work = path.join(root, 'work');
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
    masterSha = g(work, ['rev-parse', 'HEAD']);
  });

  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it('dry run, orphan first commit, parented second, read back, accept, ancestry, worktree untouched', () => {
    const remoteHas = (): string => g(bare, ['for-each-ref', `refs/heads/${BRANCH}`]);
    const dry = quiet(() => writeFiles([{ path: 'x.txt', data: 'x\n' }], 'dry', { ...io(), dryRun: true })) as string;
    expect(dry).toMatch(/^[0-9a-f]{40}$/);
    expect(remoteHas()).toBe('');

    const r1 = run({ sha: masterSha, version: '4.96.0' });
    const thumb = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 255, 10, 13]);
    const c1 = recordRun(r1, { 'a@low': thumb }, io()) as string;
    expect(g(bare, ['rev-parse', `refs/heads/${BRANCH}`])).toBe(c1);
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c1])).toBe(c1);
    const blob = execFileSync('git', ['cat-file', 'blob', `${c1}:runs/${masterSha}/thumbs/a@low.webp`], { cwd: bare });
    expect([...blob]).toEqual([...thumb]);

    const r2 = run({ sha: sha('f'), version: '4.97.0', verdict: 'flagged' });
    const c2 = recordRun(r2, {}, io()) as string;
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c2])).toBe(`${c2} ${c1}`);
    expect(() => recordRun(run({ sha: 'nope' }), {}, io())).toThrow(/bad run record/);

    let recs = readRecords(io()) as { runs: Run[]; accepted: Accept[] };
    expect(recs.runs.map((r) => r.sha).sort()).toEqual([masterSha, sha('f')].sort());
    expect(recs.runs.find((r) => r.sha === masterSha)).toEqual(r1);
    expect(recs.accepted).toEqual([]);

    const acc = acceptRecord({ run: r2, by: 'Michael', why: 'initial', at: '2026-10-24T12:00:00.000Z' }) as Accept;
    const c3 = recordAccept(acc, io()) as string;
    expect(g(bare, ['rev-list', '--parents', '-n', '1', c3])).toBe(`${c3} ${c2}`);
    recs = readRecords(io()) as { runs: Run[]; accepted: Accept[] };
    expect(recs.accepted).toEqual([acc]);
    expect(recs.runs.length).toBe(2);

    const isAnc = isAncestorFn(io()) as (s: string) => boolean;
    expect(isAnc(masterSha)).toBe(true);
    expect(isAnc(c1)).toBe(false);
    expect(isAnc(sha('d'))).toBe(false);

    const picks = pickBaseline(recs, { isAncestor: isAnc, renderer: 'R1', version: '4.98.0' }) as Record<string, Pick>;
    expect(picks['a@low']).toMatchObject({ sha: sha('f'), source: 'accepted', approver: 'Michael' });

    expect(g(work, ['status', '--porcelain'])).toBe('');
    expect(g(work, ['rev-parse', 'HEAD'])).toBe(masterSha);
    expect(g(work, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('master');
    expect(g(work, ['ls-files'])).toBe('README.md');
  });

  it('a second record or accept of the same run is refused unless replace / --replace', () => {
    const cli = (argv: string[]): { code: number; out: string; err: string } => {
      const out: string[] = [];
      const err: string[] = [];
      const [info, error] = [console.info, console.error];
      console.info = (...a: unknown[]) => { out.push(a.join(' ')); };
      console.error = (...a: unknown[]) => { err.push(a.join(' ')); };
      try {
        const code = main(argv, io()) as number;
        return { code, out: out.join('\n'), err: err.join('\n') };
      } finally { [console.info, console.error] = [info, error]; }
    };
    const head = (): string => g(bare, ['rev-parse', `refs/heads/${BRANCH}`]);
    const accOf = (s: string): Accept[] => (readRecords(io()) as { accepted: Accept[] }).accepted.filter((a) => a.sha === s);

    // recordRun: the same sha is refused (remote unchanged, dry run too); replace: true overwrites
    const r3 = run({ sha: sha('3'), version: '4.97.1', verdict: 'flagged' });
    quiet(() => recordRun(r3, {}, io()));
    const h1 = head();
    expect(() => quiet(() => recordRun({ ...r3, ms: 2 }, {}, io()))).toThrow(/run 33333333 is already recorded; pass replace: true/);
    expect(() => quiet(() => recordRun({ ...r3, ms: 2 }, {}, { ...io(), dryRun: true }))).toThrow(/already recorded/);
    expect(head()).toBe(h1);
    quiet(() => recordRun({ ...r3, ms: 2 }, {}, { ...io(), replace: true }));
    expect(head()).not.toBe(h1);
    expect((readRecords(io()) as { runs: Run[] }).runs.find((r) => r.sha === r3.sha)?.ms).toBe(2);

    // accept CLI: the first accept passes; a second exits 1 naming the first and leaves it intact; --replace overwrites
    const first = cli(['accept', '--sha', sha('3').slice(0, 8), '--by', 'Michael', '--why', 'first', '--only', 'a@low']);
    expect(first.code).toBe(0);
    expect(first.out).toMatch(/^accepted\/4\.97\.1-33333333\.json/);
    const firstAt = accOf(sha('3'))[0]?.at;
    const h2 = head();
    for (const extra of [[], ['--dry-run']]) {
      const second = cli(['accept', '--sha', sha('3'), '--by', 'orchestrator', '--why', 'second', ...extra]);
      expect(second.code).toBe(1);
      expect(second.err).toBe(`already accepted by Michael at ${firstAt}; pass --replace to overwrite`);
    }
    expect(head()).toBe(h2);
    expect(accOf(sha('3'))).toMatchObject([{ by: 'Michael', why: 'first', only: ['a@low'] }]);
    const third = cli(['accept', '--sha', sha('3'), '--by', 'orchestrator', '--why', 'widen', '--replace']);
    expect(third.code).toBe(0);
    expect(third.err).toMatch(/replacing the accept by Michael/);
    expect(accOf(sha('3'))).toMatchObject([{ by: 'orchestrator', why: 'widen', only: null }]);

    // recordAccept (library) refuses an existing accept path even without the CLI's check
    const again = acceptRecord({ run: r3, by: 'x', why: 'y', at: '2026-10-24T14:00:00.000Z' }) as Accept;
    expect(() => quiet(() => recordAccept(again, io()))).toThrow('accepted/4.97.1-33333333.json already exists; pass --replace to overwrite');

    // accept of a corrupt record read off the branch exits 1 (validateRun), nothing written
    const bad = { ...run({ sha: sha('4') }), version: '-p' };
    quiet(() => writeFiles([{ path: `runs/${bad.sha}/result.json`, data: JSON.stringify(bad) }], 'corrupt', io()));
    const h3 = head();
    const corrupt = cli(['accept', '--sha', sha('4'), '--by', 'b', '--why', 'w']);
    expect(corrupt.code).toBe(1);
    expect(corrupt.err).toMatch(/recorded run is invalid: version is not x\.y\.z: -p/);
    expect(head()).toBe(h3);
    expect(g(work, ['status', '--porcelain'])).toBe('');
  });

  it('readRecords on a remote without the branch is empty', () => {
    expect(readRecords({ cwd: work, remote: 'nowhere' })).toEqual({ runs: [], accepted: [] });
  });
});
