import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { MANIFEST, run, runSet } from '../scripts/level-graphs.mjs';
// @ts-expect-error plain .mjs process script without types
import { run as runValidateCli } from '../scripts/level-validate.mjs';

// validator-port S5: every committed graph set (docs/level-validator/graph-sets.json) keeps the counts its manifest
// pins, and its saved run says the same. `node scripts/level-graphs.mjs --write` refreshes both after a graph change.
const ROOT = path.resolve(__dirname, '..');

interface GraphSet {
  name: string; files: string[]; flags: string[]; errors: number; warns: number; run: string | null;
}
type Run = (argv: string[], opts: { log: (s: string) => void; root: string }) => number;
type RunSet = (set: GraphSet, root?: string) => { errors: number; warns: number; text: string };

const sets = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8')) as GraphSet[];
const COUNTS = /(\d+) error\(s\), (\d+) warning\(s\)\.$/;

describe('graph-sets manifest', () => {
  it('lists the example and the five campus graphs, files that exist', () => {
    expect(sets.map((s) => s.name)).toEqual(['example', 'campus']);
    expect(sets[1]?.files.length).toBe(5);
    for (const s of sets) {
      for (const f of s.files) expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
    }
  });

  describe.each(sets)('set $name', (set) => {
    const result = (runSet as RunSet)(set, ROOT);

    it('counts equal the manifest', () => {
      expect({ errors: result.errors, warns: result.warns }).toEqual({ errors: set.errors, warns: set.warns });
    });

    it('the saved run says the same counts', () => {
      if (!set.run) return; // the examples keep counts only
      const text = fs.readFileSync(path.join(ROOT, set.run), 'utf8');
      const last = text.trimEnd().split('\n').pop() ?? '';
      const m = COUNTS.exec(last);
      expect(m, `${set.run} last line: ${last}`).not.toBeNull();
      expect({ errors: Number(m?.[1]), warns: Number(m?.[2]) }).toEqual({ errors: set.errors, warns: set.warns });
    });

    it('the saved run is the level-validate CLI text for the set', () => {
      if (!set.run) return;
      const lines: string[] = [];
      runValidateCli([...set.files, ...set.flags], { log: (l: string) => lines.push(l), root: ROOT });
      expect(result.text).toBe(`${lines.join('\n')}\n`);
      // a Windows checkout (core.autocrlf) gives the saved .txt CRLF line ends
      expect(fs.readFileSync(path.join(ROOT, set.run), 'utf8').replace(/\r\n/g, '\n')).toBe(result.text);
    });
  });
});

describe('level-graphs runner', () => {
  /** A temp repo root holding the real metrics, the example graph and a one-set manifest. */
  const tempRoot = (set: Partial<GraphSet>): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'level-graphs-'));
    fs.mkdirSync(path.join(root, 'docs/design'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs/level-validator'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'docs/design/metrics.json'), path.join(root, 'docs/design/metrics.json'));
    fs.copyFileSync(path.join(ROOT, 'docs/level-validator/example.graph.json'),
      path.join(root, 'docs/level-validator/example.graph.json'));
    const entry = { name: 'tmp', files: ['docs/level-validator/example.graph.json'], flags: [], errors: 0, warns: 0,
      run: 'out/run.txt', ...set };
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify([entry]));
    return root;
  };
  const go = (argv: string[], root: string) => {
    const lines: string[] = [];
    const code = (run as Run)(argv, { log: (l) => lines.push(l), root });
    return { code, lines };
  };

  it('exits 0 and prints one line per set when the counts match', () => {
    const { code, lines } = go([], tempRoot({}));
    expect(code).toBe(0);
    expect(lines).toEqual(['tmp: 0 error(s), 0 warning(s) ok']);
  });

  it('exits 1 on a count that differs, and --write fixes the manifest and writes the run', () => {
    const root = tempRoot({ errors: 3, warns: 9 });
    const bad = go([], root);
    expect(bad.code).toBe(1);
    expect(bad.lines[0]).toContain('DIFFERS');
    expect(go(['--write'], root).code).toBe(0);
    const [set] = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), 'utf8')) as GraphSet[];
    expect(set).toMatchObject({ errors: 0, warns: 0 });
    expect(fs.readFileSync(path.join(root, 'out/run.txt'), 'utf8')).toBe('\n0 error(s), 0 warning(s).\n');
    expect(go([], root).code).toBe(0);
  });

  it('exits 2 on a bad argument, an unknown flag or a missing graph', () => {
    const root = tempRoot({});
    expect(go(['--nope'], root).code).toBe(2);
    expect(go([], tempRoot({ flags: ['--bogus'] })).code).toBe(2);
    expect(go([], tempRoot({ files: ['missing.json'] })).code).toBe(2);
  });
});
