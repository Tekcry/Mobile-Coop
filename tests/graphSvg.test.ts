/**
 * scripts/graph-svg.mjs on a synthetic two-space graph: the expected rects, labels, scale bar, link tags and pins, byte
 * determinism, a box-list area, a RoomDef-id area through a rooms dump, a space with no area (skipped, no crash), and `--base`.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs script without types
import { buildSvg, COOP_KINDS, mergeGraphs, normaliseRooms } from '../scripts/graph-svg.mjs';

const graph = {
  meta: { map: 'synth', name: 'Synthetic Plan', mode: 'sector', players: [2], sections: ['S1'] },
  mission: { id: 'm-test', mode: 'sector', players: [2], start: 'a-yard' },
  spaces: [
    { id: 'a-yard', section: 'S1', type: 'exterior', area: [[0, 0, 20, 10]], storey: 0, tags: ['start'] },
    { id: 'a-hall', section: 'S1', type: 'encounter', area: 'hall', storey: 0, tags: [], vantage: { from: 'a-yard', sees_pct: 0.8, at: [5, 0, 5] } },
    { id: 'a-roof', section: 'S1', type: 'connector', area: [[20, 0, 30, 10], [30, 0, 35, 5]], storey: 4.4, tags: ['split:x:a'] },
    { id: 'a-ghost', section: 'S1', type: 'utility', storey: 0, tags: [] },
  ],
  links: [
    { from: 'a-yard', to: 'a-hall', kind: 'door', route: 'loud', at: [20, 0, 15] },
    { from: 'a-yard', to: 'a-roof', kind: 'coop_boost', route: 'high' },
    { from: 'a-yard', to: 'a-ghost', kind: 'door', route: 'shadow' },
  ],
  objectives: [{ id: 'o1', space: 'a-hall', kind: 'download', team: 'ghost', lead: 'a-yard' }],
  syncs: [{ id: 'sync-s1-x', kind: 'pair_door', space: 'a-roof', src: 'a-yard' }],
};
const rooms = { hall: [20, 10, 40, 30] };

describe('graph-svg', () => {
  const r = buildSvg({ graphs: [graph], names: ['synthetic.json'], rooms });

  it('draws each area box to scale (1 m = 10 px), the room-id area through the rooms dump', () => {
    // plan origin = min x/z minus 5 m padding snapped to the 10 m grid -> x -10, z -10; max x 40 + 5 -> 50, z 30 + 5 -> 40
    expect(r.svg).toContain('<rect width="600" height="500" fill="#fbfaf6"'); // plan rect: 60 m x 50 m
    // yard 0..20 x 0..10 -> x 100, width 200, height 100; y from the top: (40 - 10) * 10 = 300
    expect(r.svg).toContain('<rect x="100" y="300" width="200" height="100"');
    // hall (rooms dump) 20..40 x 10..30 -> x 300, y (40 - 30) * 10 = 100, 200 x 200
    expect(r.svg).toContain('<rect x="300" y="100" width="200" height="200"');
    // the roof has two boxes (a box list)
    expect(r.svg.match(/data-space="a-roof"/g)).toHaveLength(2);
  });

  it('labels spaces, marks the start, scale bar, grid, links, eye, pins and legend rows', () => {
    for (const id of ['a-yard', 'a-hall']) expect(r.svg).toContain(`>${id}</text>`);
    expect(r.svg).toContain('>a-roof @4.4</text>');
    expect(r.svg).toContain('>START</text>');
    expect(r.svg).toContain('>10 m</text>');
    expect(r.svg).toContain('x1="10" y1="'); // scale bar tick
    expect(r.svg).toContain('stroke-dasharray="4 2"'); // upper storey edge
    expect(r.svg).toContain('>door</text>');
    expect(r.svg).toContain('>boost</text>'); // co-op tag
    expect(r.svg).toContain('fill="#d0198c"'); // co-op highlight
    expect(r.svg).toContain('<ellipse'); // eye mark
    expect(r.svg).toContain('>80%</text>');
    expect(r.svg).toContain('north up');
    // objective 1, sync 2, the objective's lead 3: numbered in the table
    expect(r.svg).toMatch(/>1<\/text><text x="26" y="\d+" font-size="9">objective</);
    expect(r.svg).toMatch(/>2<\/text><text x="26" y="\d+" font-size="9">sync</);
    expect(r.svg).toMatch(/>3<\/text><text x="26" y="\d+" font-size="9">lead</);
    expect(r.svg).toContain('Synthetic Plan');
    expect(r.svg).toContain('synthetic.json');
    expect(COOP_KINDS.has('pair_gate')).toBe(true);
  });

  it('skips a space with no area and its links, without crashing', () => {
    expect(r.skippedSpaces).toEqual(['a-ghost']);
    expect(r.skippedLinks).toBe(1);
    expect(r.svg).not.toContain('data-space="a-ghost"');
    expect(r.svg).toContain('not drawn (no usable area): a-ghost');
  });

  it('skips a RoomDef id when no rooms dump is given', () => {
    const none = buildSvg({ graphs: [graph], names: ['synthetic.json'] });
    expect(none.skippedSpaces).toEqual(['a-hall', 'a-ghost']);
    expect(none.svg).not.toContain('data-space="a-hall"');
  });

  it('is deterministic: the same input gives byte-identical output', () => {
    const again = buildSvg({ graphs: [JSON.parse(JSON.stringify(graph))], names: ['synthetic.json'], rooms: { ...rooms } });
    expect(again.svg).toBe(r.svg);
  });

  it('embeds a --base svg, stretched to data-bounds when present', () => {
    const base = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" data-bounds="0 0 40 20"><rect id="basemark" width="100" height="50"/></svg>';
    const b = buildSvg({ graphs: [graph], names: ['synthetic.json'], rooms, base });
    expect(b.svg).toContain('id="basemark"');
    expect(b.svg).not.toContain('<?xml');
    // bounds 0..40 x 0..20 -> x 100, y (40 - 20) * 10 = 200, 400 x 200 px
    expect(b.svg).toContain('<svg x="100" y="200" width="400" height="200" viewBox="0 0 100 50"');
  });

  it('merges graph files and reads the three rooms shapes', () => {
    const m = mergeGraphs([{ meta: { sections: ['S1'] }, spaces: [{ id: 'a' }] }, { meta: { sections: ['S1', 'S2'] }, spaces: [{ id: 'b' }], objectives: [{ id: 'o' }] }]);
    expect(m.spaces.map((s: { id: string }) => s.id)).toEqual(['a', 'b']);
    expect(m.meta.sections).toEqual(['S1', 'S2']);
    expect(m.objectives).toHaveLength(1);
    const a = normaliseRooms({ r1: [5, 6, 1, 2], r2: { minX: 0, maxX: 2, minZ: 0, maxZ: 3 } });
    const b = normaliseRooms([{ id: 'r1', minX: 1, maxX: 5, minZ: 2, maxZ: 6 }]);
    expect(a.get('r1')).toEqual([1, 2, 5, 6]);
    expect(a.get('r2')).toEqual([0, 0, 2, 3]);
    expect(b.get('r1')).toEqual([1, 2, 5, 6]);
  });

  it('CLI writes the same svg to --out', () => {
    const dir = mkdtempSync(join(tmpdir(), 'graphsvg-'));
    writeFileSync(join(dir, 'g.json'), JSON.stringify(graph));
    writeFileSync(join(dir, 'rooms.json'), JSON.stringify(rooms));
    const out = join(dir, 'out.svg');
    const run = spawnSync(process.execPath, ['scripts/graph-svg.mjs', join(dir, 'g.json'), '--rooms', join(dir, 'rooms.json'), '--out', out], { encoding: 'utf8', timeout: 30000 });
    expect(run.status).toBe(0);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('<svg ');
    expect(svg).toContain('>a-hall</text>');
    expect(run.stderr).toContain('a-ghost');
  });
});
