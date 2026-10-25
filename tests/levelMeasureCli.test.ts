/**
 * (validator-port S2) The pure parts of `scripts/level-measure.mjs`: the argument parser (`--doors`, `--points`,
 * `--flags`, usage errors exit 2), the JSON text patcher (the rest of a graph file stays byte-identical; a second
 * write of the same values changes no byte, so a re-measure diffs only what moved), `--flags` typing, and the
 * merged-map offsets the write-back splits by. The map build itself is run by hand (`--map proving`), not here.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flags } from '../src/core/flags';
// @ts-expect-error plain .mjs process script without types
import * as cliModule from '../scripts/level-measure.mjs';

interface FlagSpec {
  key: string;
  values: string[];
}
interface CliArgs {
  files: string[];
  write: boolean;
  check: boolean;
  doors: 'open' | 'shut';
  map: string | null;
  metrics: string;
  points: string | null;
  flags: FlagSpec[];
}
interface Edit {
  kind: 'spaces' | 'links' | 'meta';
  index?: number;
  value: unknown;
}
interface MapFile {
  graph: { spaces: unknown[]; links: unknown[] };
  spaceOff?: number;
  linkOff?: number;
}
const cli = cliModule as unknown as {
  parseArgs(argv: string[]): CliArgs;
  patchGraph(text: string, edits: Edit[]): string;
  applyFlags(target: Record<string, unknown>, specs: FlagSpec[]): [string, unknown][];
  mergeMap(files: MapFile[]): { spaces: unknown[]; links: unknown[] };
  main(argv: string[]): Promise<number>;
};

describe('level-measure parseArgs', () => {
  it('an unknown option throws, and main exits 2 before it builds anything', async () => {
    expect(() => cli.parseArgs(['g.json', '--bogus'])).toThrow(/unknown option --bogus/);
    expect(() => cli.parseArgs([])).toThrow(/no graph file/);
    expect(await cli.main(['g.json', '--bogus'])).toBe(2);
    expect(await cli.main(['g.json', '--points'])).toBe(2);
  });

  it('--doors takes shut or open, as two words or with =; anything else throws; default open', () => {
    expect(cli.parseArgs(['g.json']).doors).toBe('open');
    expect(cli.parseArgs(['g.json', '--doors', 'shut']).doors).toBe('shut');
    expect(cli.parseArgs(['g.json', '--doors=shut']).doors).toBe('shut');
    expect(cli.parseArgs(['g.json', '--doors', 'open']).doors).toBe('open');
    expect(() => cli.parseArgs(['g.json', '--doors', 'ajar'])).toThrow(/'shut' or 'open'/);
    expect(() => cli.parseArgs(['g.json', '--doors'])).toThrow(/needs a value/);
  });

  it('--points takes an output path; without one (last, or before another option) it throws', () => {
    expect(cli.parseArgs(['g.json']).points).toBeNull();
    expect(cli.parseArgs(['g.json', '--points', 'out.json']).points).toBe(resolve('out.json'));
    expect(cli.parseArgs(['g.json', '--points=out.json']).points).toBe(resolve('out.json'));
    expect(() => cli.parseArgs(['g.json', '--points'])).toThrow(/--points needs a value/);
    expect(() => cli.parseArgs(['g.json', '--points', '--check'])).toThrow(/--points needs a value/);
  });

  it('--points combines with --check and not with --write', () => {
    const a = cli.parseArgs(['g.json', '--points', 'out.json', '--check']);
    expect(a.check).toBe(true);
    expect(a.write).toBe(false);
    expect(() => cli.parseArgs(['g.json', '--points', 'out.json', '--write'])).toThrow(/not with --write/);
  });

  it('--flags is repeatable and splits key=value[,value]; a malformed one throws', () => {
    const a = cli.parseArgs(['a.json', 'b.json', '--flags', 'guardSun=0', '--flags=loadout=1,2,3']);
    expect(a.files).toHaveLength(2);
    expect(a.flags).toEqual([
      { key: 'guardSun', values: ['0'] },
      { key: 'loadout', values: ['1', '2', '3'] },
    ]);
    expect(() => cli.parseArgs(['g.json', '--flags', 'guardSun'])).toThrow(/--flags takes/);
    expect(() => cli.parseArgs(['g.json', '--flags', '=1'])).toThrow(/--flags takes/);
    expect(() => cli.parseArgs(['g.json', '--flags', 'k='])).toThrow(/--flags takes/);
  });
});

describe('level-measure patchGraph', () => {
  // Odd spacing on purpose: the patcher must leave every byte outside the `measured` members alone.
  const text = [
    '{',
    '  "meta": { "map": "m",   "mode": "campaign", "sections": ["S1"] },',
    '  "spaces": [',
    '    { "id": "a", "area": [[0, 0, 4, 4]],  "tags": ["x"] },',
    '    {"id":"b","measured":{"cells":1},"storey":0}',
    '  ],',
    '  "links": [',
    '    { "from": "a", "to": "b", "kind": "door" }',
    '  ]',
    '}',
    '',
  ].join('\n');

  const edits: Edit[] = [
    { kind: 'spaces', index: 0, value: { shadow_pct: 0.5123, cells: 9 } },
    { kind: 'spaces', index: 1, value: { shadow_pct: null, cells: 12 } },
    { kind: 'links', index: 0, value: { time_s: 3.14159, path_m: 4 } },
    { kind: 'meta', value: { tool: 't 1', splits: {}, ways_back: [{ from: 'a', to: 'b', kind: 'coop_boost', back_s: 1.234, path_m: 2 }] } },
  ];

  it('adds and replaces only measured members; the rest of the file is byte-identical', () => {
    const expected = [
      '{',
      '  "meta": { "map": "m",   "mode": "campaign", "sections": ["S1"],',
      '    "measured": {',
      '      "tool": "t 1",',
      '      "splits": {},',
      '      "ways_back": [',
      '        { "from": "a", "to": "b", "kind": "coop_boost", "back_s": 1.23, "path_m": 2 }',
      '      ]',
      '    } },',
      '  "spaces": [',
      '    { "id": "a", "area": [[0, 0, 4, 4]],  "tags": ["x"],',
      '      "measured": { "shadow_pct": 0.51, "cells": 9 } },',
      '    {"id":"b","measured":{ "shadow_pct": null, "cells": 12 },"storey":0}',
      '  ],',
      '  "links": [',
      '    { "from": "a", "to": "b", "kind": "door",',
      '      "measured": { "time_s": 3.14, "path_m": 4 } }',
      '  ]',
      '}',
      '',
    ].join('\n');
    expect(cli.patchGraph(text, edits)).toBe(expected);
  });

  it('leaves every byte outside the patched spans alone (prefix and suffix around each edit match the original)', () => {
    const one = cli.patchGraph(text, [{ kind: 'links', index: 0, value: { time_s: 2, path_m: 3 } }]);
    const at = text.indexOf('"kind": "door"') + '"kind": "door"'.length;
    expect(one.slice(0, at)).toBe(text.slice(0, at));
    expect(one.slice(one.length - (text.length - at))).toBe(text.slice(at));
    expect(one.slice(at, one.length - (text.length - at))).toBe(',\n      "measured": { "time_s": 2, "path_m": 3 }');
  });

  it('a second write of the same values changes no byte; changed values change only their own span', () => {
    const once = cli.patchGraph(text, edits);
    expect(cli.patchGraph(once, edits)).toBe(once);
    const moved = cli.patchGraph(once, edits.map((e) => (e.kind === 'links' ? { ...e, value: { time_s: 7, path_m: 4 } } : e)));
    expect(moved).not.toBe(once);
    expect(moved).toBe(once.replace('"time_s": 3.14', '"time_s": 7'));
  });

  it('keeps CRLF line endings', () => {
    const crlf = text.replace(/\n/g, '\r\n');
    const out = cli.patchGraph(crlf, edits);
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
    expect(cli.patchGraph(out, edits)).toBe(out);
  });

  it('refuses an edit it cannot place', () => {
    expect(() => cli.patchGraph(text, [{ kind: 'links', index: 5, value: { time_s: 1 } }])).toThrow(/cannot place measured on links5/);
  });
});

describe('level-measure --flags', () => {
  it('sets an existing key by its current type', () => {
    const target: Record<string, unknown> = { sun: true, gear: 3, loadout: [1], pick: null, name: 'a' };
    const done = cli.applyFlags(target, [
      { key: 'sun', values: ['0'] },
      { key: 'gear', values: ['5'] },
      { key: 'loadout', values: ['1', '2.5', '3'] },
      { key: 'pick', values: ['4'] },
      { key: 'name', values: ['x', 'y'] },
    ]);
    expect(target).toEqual({ sun: false, gear: 5, loadout: [1, 2.5, 3], pick: 4, name: 'x,y' });
    expect(done.map(([k]) => k)).toEqual(['sun', 'gear', 'loadout', 'pick', 'name']);
  });

  it('works on the real flags object: guardSun (boolean) is set, a made-up key is refused and not added', () => {
    const copy: Record<string, unknown> = { ...flags };
    expect(copy.guardSun).toBe(true);
    cli.applyFlags(copy, [{ key: 'guardSun', values: ['false'] }]);
    expect(copy.guardSun).toBe(false);
    expect(() => cli.applyFlags(copy, [{ key: 'notAFlag', values: ['1'] }])).toThrow(/unknown key 'notAFlag'/);
    expect('notAFlag' in copy).toBe(false);
  });

  it('refuses a value of the wrong type, and an unknown key stops the whole run', () => {
    const target: Record<string, unknown> = { sun: true, gear: 3, loadout: [1] };
    expect(() => cli.applyFlags(target, [{ key: 'sun', values: ['maybe'] }])).toThrow(/takes 1\/0/);
    expect(() => cli.applyFlags(target, [{ key: 'gear', values: ['1', '2'] }])).toThrow(/one number/);
    expect(() => cli.applyFlags(target, [{ key: 'gear', values: ['x'] }])).toThrow(/not a number/);
    expect(() => cli.applyFlags(target, [{ key: 'loadout', values: ['1', ''] }])).toThrow(/not a number/);
    expect(() => cli.applyFlags({ spawn: { x: 1 } }, [{ key: 'spawn', values: ['1'] }])).toThrow(/holds an object/);
    expect(() => cli.applyFlags(target, [{ key: 'gear', values: ['2'] }, { key: 'nope', values: ['1'] }])).toThrow(/unknown key/);
  });
});

describe('level-measure mergeMap', () => {
  it('concatenates in file order and records where each file starts', () => {
    const files: MapFile[] = [
      { graph: { spaces: [{ id: 'a' }, { id: 'b' }], links: [{ from: 'a', to: 'b' }] } },
      { graph: { spaces: [{ id: 'c' }], links: [{ from: 'b', to: 'c' }, { from: 'c', to: 'a' }] } },
    ];
    const merged = cli.mergeMap(files);
    expect(merged.spaces).toHaveLength(3);
    expect(merged.links).toHaveLength(3);
    expect([files[0]!.spaceOff, files[0]!.linkOff]).toEqual([0, 0]);
    expect([files[1]!.spaceOff, files[1]!.linkOff]).toEqual([2, 1]);
  });
});
