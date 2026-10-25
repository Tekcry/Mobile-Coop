/**
 * (campus-greybox S1, lane S1, G6) The sync contract of the v2 section 1 (`docs/campus-greybox/briefs/S1.md` G6; SYNC.md
 * 7c021f01 lines 9-10 and the graph's `syncs`): the two sync nodes and the S1 space ids as signed off, the device positions the
 * nodes name, and the guard keys of the graph against the data. Reads the v2 graph with `fs`; builds the map with section 1 on.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { hyp2 } from '../src/core/mathx';

vi.resetModules();
const { flags } = await import('../src/core/flags');
flags.campusV2 = [1];
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_SECTORS, CAMPUS_SECURITY } = await import('../src/world/maps/campusSectors');
const { S1_GROUPS, C1_BOX } = await import('../src/world/maps/campusV2/s1');

interface GraphSpace {
  id: string;
  section: string;
  tags?: string[];
  note?: string;
  guards?: Record<string, number>;
}
interface Graph {
  meta: { players: number[]; sections: string[] };
  spaces: GraphSpace[];
  links: { from: string; to: string; note?: string }[];
  syncs: { id: string; kind: string; space: string; track: string; lead: string; src: string }[];
}
const graph = JSON.parse(readFileSync(new URL('../docs/sector-redesign/graph/v2/campusOps-S1.json', import.meta.url), 'utf8')) as Graph;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const S1 = CAMPUS_SECTORS[0]!;
const s1Spaces = graph.spaces.filter((s) => s.section === 'S1');

describe('campus v2 S1 sync contract (SYNC.md 7c021f01, SY:9-10)', () => {
  it('sync node ids present: exactly the two S1 nodes with their kind, space, track and lead', () => {
    expect(graph.syncs.map((s) => s.id)).toEqual(['sync-s1-gate-desk', 'sync-s1-yard-board']);
    const [desk, board] = graph.syncs;
    expect([desk!.kind, desk!.space, desk!.track, desk!.lead]).toEqual(['camera_loop', 's1-gatehouse', 'B', 's1-gatehouse']);
    expect([board!.kind, board!.space, board!.track, board!.lead]).toEqual(['power_cut', 's1-dyard', 'A', 's1-dyard']);
    for (const s of graph.syncs) expect(graph.spaces.some((q) => q.id === s.space), s.id).toBe(true);
  });

  it('S1 space ids: exactly the thirteen of the plan graph (GR:5-71)', () => {
    expect(s1Spaces.map((s) => s.id)).toEqual([
      's1-verge', 's1-gatehouse', 's1-gateroof', 's1-lane', 's1-carpark', 's1-carport', 's1-dyard', 's1-plantroom',
      's1-plantroof', 's1-pavilion', 's1-canopy', 's1-forecourt', 's1-lawn',
    ]);
    // no space of another section is in this graph
    expect(graph.spaces.length).toBe(13);
  });

  it('SYNC.md device positions: the desk-gate desk, the fore and canopy switches, the yard board\'s circuits', () => {
    // desk-gate (SY:9): at [18.8, -73.2], section 0, cameras cam-gate / cam-walk, operator 1 (#2)
    const desk = CAMPUS_SECURITY.desks!.find((d) => d.id === 'desk-gate')!;
    expect(desk).toBeTruthy();
    expect(desk.at).toEqual([18.8, -73.2]);
    expect(desk.section).toBe(0);
    expect(desk.cameras).toEqual(['cam-gate', 'cam-walk']);
    expect(desk.operator).toBe(1);
    expect(S1.guards[desk.operator!]!.role).toBe('cctv');
    expect(CAMPUS_SECURITY.desks!.filter((d) => d.section === 0).length).toBe(1);
    // the yard board (SY:10): fore (-29.5, -40.3) and canopy (-29.0, -40.3), both on the plant room's south wall
    const sw = lay.switches!;
    const fore = sw.find((q) => q.group === S1_GROUPS.fore)!;
    const canopy = sw.find((q) => q.group === S1_GROUPS.canopy)!;
    expect([fore.pos.x, fore.pos.z]).toEqual([-29.5, -40.3]);
    expect([canopy.pos.x, canopy.pos.z]).toEqual([-29.0, -40.3]);
    // none of the canopy circuit's switches is inside C1 any more (the breaker moved onto the yard board, AS8)
    const inC1 = (x: number, z: number): boolean => x >= C1_BOX[0] && x <= C1_BOX[2] && z >= C1_BOX[1] && z <= C1_BOX[3];
    expect(sw.filter((q) => q.group === S1_GROUPS.canopy && inC1(q.pos.x, q.pos.z)).length).toBe(0);
    // the board's circuits: the 8 bollards and the dock lamp on fore, the 4 downlights on canopy
    const lit = (g: number) => b.lights.lights.filter((l) => l.group === g && l.intensity > 0);
    expect(lit(S1_GROUPS.fore).length).toBe(9);
    expect(lit(S1_GROUPS.canopy).length).toBe(4);
    const dock = lit(S1_GROUPS.fore).filter((l) => l.y > 2);
    expect(dock.length).toBe(1);
    expect(hyp2(dock[0]!.x + 33, dock[0]!.z + 40.4)).toBeLessThan(0.01);
    // the switches are in reach of the board's face (the south wall of the plant room, z -40)
    for (const q of [fore, canopy]) expect(Math.abs(q.pos.z + 40.3)).toBeLessThan(0.01);
  });

  it('graph guards match the data: every key sums to 15; players 1-4; the section list; the forecourt is unavoidable', () => {
    for (const k of ['1', '2', '3', '4']) {
      expect(s1Spaces.reduce((n, s) => n + (s.guards?.[k] ?? 0), 0), `key ${k}`).toBe(15);
    }
    expect(S1.guards.length).toBe(15);
    // the campus guards do not scale by player count: every guarded space carries the same n at every key
    for (const s of s1Spaces) {
      if (!s.guards) continue;
      expect(new Set(['1', '2', '3', '4'].map((k) => s.guards![k])).size, s.id).toBe(1);
    }
    expect(graph.meta.players).toEqual([1, 2, 3, 4]);
    expect(graph.meta.sections).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    const fc = s1Spaces.find((s) => s.id === 's1-forecourt')!;
    expect(fc.tags).toContain('unavoidable');
    expect(fc.note).toContain('K1 #5 at C1 (LD 4.12, G303)');
    // the five guarded spaces of the plan hold three each
    expect(s1Spaces.filter((s) => s.guards).map((s) => [s.id, s.guards!['1']])).toEqual([
      ['s1-gatehouse', 3], ['s1-carpark', 3], ['s1-dyard', 3], ['s1-forecourt', 3], ['s1-lawn', 3],
    ]);
  });

  it('graph pass: no S1 note still reads PLAN; every rebuilt space note reads BUILT; the declared targets stay declared', () => {
    for (const s of s1Spaces) {
      expect(s.note ?? '', s.id).not.toContain('PLAN');
      expect(s.note ?? '', s.id).toMatch(/^BUILT /);
    }
    for (const l of graph.links) expect(l.note ?? '', `${l.from} -> ${l.to}`).not.toContain('PLAN');
    for (const s of s1Spaces.filter((q) => q.guards)) expect(s.note, s.id).toContain('DECLARED TARGETS');
  });
});
