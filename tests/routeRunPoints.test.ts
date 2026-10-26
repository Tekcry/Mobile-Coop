import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs tool script without types
import { checkPoints, loadPoints, MEASURE_SCRIPT } from '../scripts/route-run/points.mjs';

// route-runs R6 (docs/route-runs/PLAN.md "R6 Points from the V6 port" on feature/route-runs-2): the points table is
// checked against the graph it plans; a stale or re-ordered one is refused with a plain message.
const ROOT = path.resolve(__dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/route-run');
const GRAPH_FILE = path.join(FIX, 'campusOps-S1.graph.json');
const POINTS_FILE = path.join(FIX, 'campusOps-S1.points.json');
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

interface Link { from: string; to: string; kind: string; at?: number[] | null; [k: string]: unknown }
interface Space { id: string; area?: unknown; centre?: number[] | null; [k: string]: unknown }
interface Graph { meta: { measured?: { geom?: string; [k: string]: unknown }; [k: string]: unknown }; spaces: Space[]; links: Link[] }
interface Table { geom: string; spaces: Space[]; links: Link[]; errors?: string[]; notes?: string[] }
interface Check { problems: string[]; notes: string[] }

/** Fresh copies each call (the tests edit them). */
const graph = (): Graph => read<Graph>(GRAPH_FILE);
const table = (): Table => read<Table>(POINTS_FILE);
const check = (t: unknown, g: Graph[] = [graph()]): Check => checkPoints(t, g) as Check;

const tmpDirs: string[] = [];
const tmpFile = (name: string, body: unknown): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-run-points-test-'));
  tmpDirs.push(dir);
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(body));
  return file;
};
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('route-run points table check (R6)', () => {
  it('the campus S1 pair fits: no problems; its link with no point is a note', () => {
    const r = check(table());
    expect(r.problems).toEqual([]);
    const noAt = table().links.filter((l) => l.at === null).length;
    expect(noAt).toBe(1);
    expect(r.notes.filter((n) => /has no point/.test(n))).toHaveLength(noAt);
    expect(r.notes.some((n) => /not measured/.test(n))).toBe(false);
  });

  it('a stale geom is a problem; a graph with no measured geom is a note, not a problem', () => {
    const t = table();
    t.geom = 'aaaaaa-bbbbbb';
    expect(check(t).problems).toEqual([
      'the points table was made on another build of the map (geom aaaaaa-bbbbbb, the graph says y3jl5g-atld8s): run level-measure --points again',
    ]);
    const g = graph();
    delete g.meta.measured;
    const r = check(t, [g]);
    expect(r.problems).toEqual([]);
    expect(r.notes).toContain("the graph is not measured: the points table's geom was not checked");
  });

  it('two links swapped: one problem per index, naming both sides', () => {
    const t = table();
    const g = graph();
    [t.links[0], t.links[3]] = [t.links[3]!, t.links[0]!];
    const r = check(t, [g]);
    expect(r.problems).toEqual([
      `link 0: table ${g.links[3]!.from} -> ${g.links[3]!.to} (${g.links[3]!.kind}), graph ${g.links[0]!.from} -> ${g.links[0]!.to} (${g.links[0]!.kind})`,
      `link 3: table ${g.links[0]!.from} -> ${g.links[0]!.to} (${g.links[0]!.kind}), graph ${g.links[3]!.from} -> ${g.links[3]!.to} (${g.links[3]!.kind})`,
    ]);
    expect(r.problems[0]).toBe('link 0: table s1-verge -> s1-lane (opening), graph s1-verge -> s1-gatehouse (window)');
  });

  it('a dropped link: the count problem (and the shifted indices, at most 5 plus a count)', () => {
    const t = table();
    t.links.splice(0, 1);
    const r = check(t);
    expect(r.problems[0]).toBe('the points table has 21 links, the merged graph 22: same files, same order?');
    const perIndex = r.problems.filter((p) => /^link \d+:/.test(p));
    expect(perIndex.length).toBeLessThanOrEqual(5);
    if (r.problems.length > 1 + perIndex.length) expect(r.problems.at(-1)).toMatch(/^and \d+ more$/);
    // the last link dropped instead: only the count is wrong
    const t2 = table();
    t2.links.pop();
    expect(check(t2).problems).toEqual(['the points table has 21 links, the merged graph 22: same files, same order?']);
  });

  it('many shifted links: the first 5 named, then "and <k> more"', () => {
    const t = table();
    t.links.reverse();
    const g = graph();
    const wrong = g.links.filter((l, i) => l.from !== t.links[i]!.from || l.to !== t.links[i]!.to || l.kind !== t.links[i]!.kind).length;
    expect(wrong).toBeGreaterThan(5);
    const r = check(t, [g]);
    expect(r.problems).toHaveLength(6);
    expect(r.problems.at(-1)).toBe(`and ${wrong - 5} more`);
  });

  it('not a table: the plain problem', () => {
    for (const t of [null, 'x', {}, { spaces: [], links: {} }, { spaces: {}, links: [] }, [1, 2]]) {
      expect(check(t).problems, JSON.stringify(t)).toEqual(['the points file is not a level-measure --points table']);
    }
  });

  it('a missing space, a space with no centre and the table errors are notes only', () => {
    const t = table();
    const gone = t.spaces.shift()!;
    t.spaces[0]!.centre = null;
    t.links[1]!.at = null;
    t.errors = ['ERR shared edge s1-lane / s1-yard has 2 gaps'];
    const r = check(t);
    expect(r.problems).toEqual([]);
    expect(r.notes).toContain(`space ${gone.id} has an area but is not in the points table: runs through it are unplannable`);
    expect(r.notes).toContain(`space ${t.spaces[0]!.id} has no centre in the points table: runs through it are unplannable`);
    expect(r.notes.some((n) => n.startsWith('link 1 ') && /has no point/.test(n))).toBe(true);
    expect(r.notes).toContain('ERR shared edge s1-lane / s1-yard has 2 gaps');
  });

  it('two graph files are merged in the order given', () => {
    const g = graph();
    const a: Graph = { meta: g.meta, spaces: g.spaces, links: g.links.slice(0, 10) };
    const b: Graph = { meta: { sections: [] }, spaces: [], links: g.links.slice(10) };
    expect(check(table(), [a, b]).problems).toEqual([]);
    // the other file order shifts every link
    expect(check(table(), [b, a]).problems.length).toBeGreaterThan(0);
  });
});

describe('route-run loadPoints (R6)', () => {
  it('a path: reads it, checks it, returns the notes on the table', () => {
    const file = tmpFile('s1.points.json', table());
    const t = loadPoints({ graphs: [graph()], files: [GRAPH_FILE], src: file }) as Table;
    expect(t.geom).toBe('y3jl5g-atld8s');
    expect(t.links).toHaveLength(22);
    expect(Array.isArray(t.notes)).toBe(true);
    expect(t.notes!.some((n) => /has no point/.test(n))).toBe(true);
  });

  it("'auto': runs level-measure --points on the files in order, then reads its table", () => {
    const calls: { cmd: string; args: string[] }[] = [];
    const run = (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      fs.writeFileSync(args[args.indexOf('--points') + 1]!, fs.readFileSync(POINTS_FILE, 'utf8'));
    };
    const files = [GRAPH_FILE, path.join(FIX, 'other.json')];
    const t = loadPoints({ graphs: [graph()], files, src: 'auto', run }) as Table;
    expect(t.geom).toBe('y3jl5g-atld8s');
    expect(calls).toHaveLength(1);
    const { cmd, args } = calls[0]!;
    expect(cmd).toBe(process.execPath);
    expect(MEASURE_SCRIPT).toBe('scripts/level-measure.mjs');
    expect(args.slice(0, 4)).toEqual(['scripts/level-measure.mjs', ...files, '--points']);
    expect(args).toHaveLength(5);
    // the temp file is gone after the read
    expect(fs.existsSync(args[4]!)).toBe(false);
  });

  it('a stale table is refused: the message lists the problems', () => {
    const t = table();
    t.geom = 'old-geom';
    [t.links[0], t.links[3]] = [t.links[3]!, t.links[0]!];
    const file = tmpFile('stale.json', t);
    let msg = '';
    try {
      loadPoints({ graphs: [graph()], files: [GRAPH_FILE], src: file });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/does not fit the graph/);
    expect(msg).toContain('geom old-geom, the graph says y3jl5g-atld8s');
    expect(msg).toContain('link 0: table');
    expect(msg).toContain('link 3: table');
    // also when level-measure made it ('auto')
    const run = (_cmd: string, args: string[]) => fs.writeFileSync(args[args.indexOf('--points') + 1]!, JSON.stringify(t));
    expect(() => loadPoints({ graphs: [graph()], files: [GRAPH_FILE], src: 'auto', run })).toThrow(/geom old-geom/);
  });

  it('an unreadable or non-table file is refused plainly', () => {
    expect(() => loadPoints({ graphs: [graph()], files: [GRAPH_FILE], src: path.join(FIX, 'no-such.points.json') })).toThrow(/could not be read/);
    const file = tmpFile('graph-not-table.json', { spaces: 3 });
    expect(() => loadPoints({ graphs: [graph()], files: [GRAPH_FILE], src: file })).toThrow(/not a level-measure --points table/);
  });
});
