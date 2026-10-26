/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` G4.6, job PLAN section 6, BRIEF A20) Section 4's v2 sync nodes and Code Relay
 * devices, flag on (`flags.campusV2 = [4]`): the graph `syncs` against SYNC.md 9eb7b9c6 (S4 rows SY:37-42), one case per device with its
 * literal (SY = `docs/sector-redesign/signoff/SYNC.md`, D = `S4-detail.md`, BT = Code Relay `BEAT.md` at 712e3db7), every sync / lead id
 * written in the source, and the live co-op item budget. The map is built undressed with the pure `LevelBuilder`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { LevelBuilder as LB } from '../src/world/levelBuilder';
import { hyp2 } from '../src/core/mathx';
import { INTEL_LINE_MAX } from '../src/game/sectors';
import { MAX_ITEMS, COURSE_MAX } from '../src/net/protocol';

const PI = Math.PI;
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s4 = await import('../src/world/maps/campusV2/s4');
  const s4Data = await import('../src/world/maps/campusV2/s4Data');
  const s4Dress = await import('../src/world/maps/campusV2/s4Dress');
  const security = await import('../src/security/data');
  return { sectors, buildCampus, campusOps, LevelBuilder, s4, s4Data, s4Dress, security };
}

const m = await loadCampus([4]);
const { S4_DOORS } = m.s4;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const S4 = m.sectors.CAMPUS_SECTORS[3]!;

/** The door anchor whose opening centre is (x, z) on floor y (5 cm). */
const doorAt = (x: number, z: number, y = 0) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.05 && hyp2(d.hinge.x + (Math.sin(d.yaw) * d.width) / 2 - x, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2 - z) < 0.05);

const graph = JSON.parse(read('../docs/sector-redesign/graph/v2/campusOps-S4.json')) as { syncs: { id: string; kind: string; space: string; track: string; lead: string }[] };

describe('G4.6 sync nodes (SYNC.md 9eb7b9c6, SY:37-42)', () => {
  it('the graph syncs: ids, kinds, spaces, tracks and leads equal SY:37-42', () => {
    const SY = [
      ['sync-s4-dockboard', 'code_source', 's4-dock', 'B', 's4-dock'], // SY:37
      ['sync-s4-desk', 'camera_loop', 's4-sec', 'A', 's4-nc'], // SY:38
      ['sync-s4-noc', 'code_source', 's4-noc', 'A', 's4-deck'], // SY:39
      ['sync-s4-cagekp', 'code_sink', 's4-cage', 'B', 's4-hall'], // SY:40
      ['sync-s4-ess-board', 'power_cut', 's4-batt', 'B', 's4-batt'], // SY:41
      ['sync-s4-yard-board', 'power_cut', 's4-dock', 'B', 's4-dock'], // SY:42
    ];
    expect(graph.syncs.map((s) => [s.id, s.kind, s.space, s.track, s.lead])).toEqual(SY);
  });

  it('dock board (sync-s4-dockboard, SY:37, DT intel line): at (16, 1.5, 21.85), grants s4-codes, line <= 60 characters', () => {
    // | sync-s4-dockboard | code_source | s4-dock | B | campusS4Data.ts:202 (S4_SECTOR.intel board at (16, 1.5, 21.85), grants s4-codes) | s4-dock |
    const board = S4.intel!.find((n) => n.kind === 'board' && n.grants === 's4-codes')!;
    expect(board).toMatchObject({ kind: 'board', at: [16.0, 1.5, 21.85], grants: 's4-codes', line: 'Dock board: plant doors 2208, battery room the same.' });
    expect(board.line.length).toBeLessThanOrEqual(INTEL_LINE_MAX);
  });

  it('camera desk (sync-s4-desk, SY:38, D:60): desk-sec4 at (-2.8, 44.6) with cam-cage, cam-mantrap, cam-dock4, operator 4 (#5)', () => {
    // | sync-s4-desk | camera_loop | s4-sec | A | campusS4Data.ts:164-166 (S4_DESKS desk-sec4: cam-cage, cam-mantrap, cam-dock4; E6) | s4-nc |
    const d = m.sectors.CAMPUS_SECURITY.desks!.filter((q) => q.section === 3);
    expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ id: 'desk-sec4', at: [-2.8, 44.6], operator: 4 });
    expect([...d[0]!.cameras].sort()).toEqual(['cam-cage', 'cam-dock4', 'cam-mantrap']);
    expect(S4.guards[4]!.role).toBe('operator');
    // its lead, the side door secNc, moved to (8, 43.5) (BT "Nodes needed": s4-nc: the side door (8, 43.5))
    expect(S4_DOORS.secNc).toEqual([8, 43.5]);
  });

  it('ess board (sync-s4-ess-board, SY:41, D:27): at (-5.5, 0, 27.3), groups [76, 77], window 25 s', () => {
    // | sync-s4-ess-board | power_cut | s4-batt | B | planned (BoardDef pattern ...): essential lighting board at (-5.5, 0, 27.3), groups noc 76 + sec 77, timed window 25 s | s4-batt |
    const bd = lay.boards!.filter((q) => q.groups.includes(76));
    expect(bd.length).toBe(1);
    expect([bd[0]!.pos.x, bd[0]!.pos.y, bd[0]!.pos.z]).toEqual([-5.5, 0, 27.3]);
    expect(bd[0]!.groups).toEqual([76, 77]);
    expect(bd[0]!.window).toBe(25);
  });

  it('yard board (sync-s4-yard-board, SY:42): at (33.85, 0, 20.8), group [75], window 20 s, unmoved', () => {
    // | sync-s4-yard-board | power_cut | s4-dock | B | campusS4.ts:164 (S4_BOARDS compound board, window 20 s, group yard 75) | s4-dock |
    const bd = lay.boards!.filter((q) => q.groups.includes(75));
    expect(bd.length).toBe(1);
    expect([bd[0]!.pos.x, bd[0]!.pos.y, bd[0]!.pos.z]).toEqual([33.85, 0, 20.8]);
    expect(bd[0]!.groups).toEqual([75]);
    expect(bd[0]!.window).toBe(20);
  });

  it('keypads (BT:100-102, D:37): kp-batt (-4, 18.5), kp-deck (30.5, 45) and kp-riser (34, 46.5), all on s4-codes, each a door anchor', () => {
    // BT:100 kp-deck (riser side) | BT:102 kp-riser | the dock board's code opens all three
    expect(S4.keypads).toEqual([
      { at: [-4, 18.5], code: 's4-codes' },
      { at: [30.5, 45], code: 's4-codes' },
      { at: [34, 46.5], code: 's4-codes' },
    ]);
    for (const k of S4.keypads!) expect(doorAt(k.at[0], k.at[1]), `keypad door ${k.at}`).toBeTruthy();
  });

  it('CR9 mantrap interlock (D:18, D:130): the desk release (1.3, 21.0) and the door reader (7.7, 21.4) are 6.4 m apart, the default window, on the outer door (8, 20.5)', () => {
    const g = S4.pairGates!.find((q) => q.door[0] === 8 && q.door[1] === 20.5)!;
    expect(g).toBeTruthy();
    expect(g.a.at).toEqual([1.3, 21.0]);
    expect(g.b.at).toEqual([7.7, 21.4]);
    expect(hyp2(g.a.at[0] - g.b.at[0], g.a.at[1] - g.b.at[1])).toBeGreaterThanOrEqual(6.4);
    expect(hyp2(g.a.at[0] - g.b.at[0], g.a.at[1] - g.b.at[1])).toBeLessThan(6.42);
    expect(g.window).toBeUndefined();
    expect(doorAt(8, 20.5), 'outer door').toBeTruthy();
    expect(S4.pairGates!.length).toBe(2);
    expect(S4.pairGates![0]!.door).toEqual([18, 40]);
  });

  it('roster (lead-s4-roster, BT:106, D:93) and deck radio (lead-s4-deckradio, BT:105, P13): both grant s4-noc-duty, lines <= 60, the radio is #13\'s on the deck', () => {
    const roster = S4.intel!.find((n) => n.kind === 'board' && n.grants === 's4-noc-duty')!;
    expect(roster).toMatchObject({ kind: 'board', at: [-3.85, 1.5, 45.2], yaw: PI / 2, line: 'Duty roster: NOC tonight, Dunmore on the west seat.' });
    const radio = S4.intel!.find((n) => n.kind === 'overhear')!;
    expect(radio).toMatchObject({ kind: 'overhear', grants: 's4-noc-duty', box: [11, 33.2, 13, 35.0], floorY: 7.3, talkers: [12], line: "Deck radio: Dunmore, it's chiller three again." });
    expect(S4.guards[12]).toMatchObject({ role: 'patrol', zone: 'deck', y: 7.3 });
    for (const n of S4.intel!) expect(n.line.length, n.line).toBeLessThanOrEqual(INTEL_LINE_MAX);
    // s4-noc-duty opens no keypad (the interrogation reads it, J26)
    expect(S4.keypads!.some((k) => k.code === 's4-noc-duty')).toBe(false);
  });

  it('NOC release console and seat placard (sync-s4-noc, BT:107, P12): visual props on the window ledge in front of the west seat, #14 posted and never dormant', () => {
    const console_ = b.boxes.find((p) => Math.abs(p.c[0] - 1.0) < 1e-6 && Math.abs(p.c[1] - 4.45) < 1e-6 && Math.abs(p.c[2] - 42.35) < 1e-6)!;
    const placard = b.boxes.find((p) => Math.abs(p.c[0] - 1.0) < 1e-6 && Math.abs(p.c[1] - 4.55) < 1e-6 && Math.abs(p.c[2] - 42.3) < 1e-6)!;
    expect(console_.s).toEqual([0.6, 0.08, 0.3]);
    expect(placard.s).toEqual([0.25, 0.08, 0.02]);
    expect(console_.collide).toBe(false);
    expect(placard.collide).toBe(false);
    expect(S4.guards[13]).toMatchObject({ x: 1.0, y: 3.6, z: 43.0, role: 'noc' });
    expect(S4.guards[13]!.dormant).not.toBe(true);
    expect(S4.guards[13]!.route).toBeUndefined();
  });

  it('every sync / lead id string is written in s4.ts or s4Data.ts', () => {
    const src = read('../src/world/maps/campusV2/s4.ts') + read('../src/world/maps/campusV2/s4Data.ts');
    for (const id of ['sync-s4-dockboard', 'sync-s4-desk', 'sync-s4-noc', 'sync-s4-cagekp', 'sync-s4-ess-board', 'sync-s4-yard-board', 'lead-s4-roster', 'lead-s4-deckradio']) expect(src.includes(id), id).toBe(true);
    expect(src.includes("bolt point (Dunmore's spook respawn, Code Relay A11)")).toBe(true);
    expect(src.includes('footage drive')).toBe(true);
  });

  it('the live co-op items of S4 stay under MAX_ITEMS with headroom (tests/sectorItemScope.test.ts pattern)', () => {
    const doors = b.anchors.doors;
    const centre = (d: (typeof doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];
    const connPts: [number, number][] = [];
    for (const s of m.sectors.CAMPUS_SECTORS) {
      const c = s.connector;
      if (!c) continue;
      if (c.nearAt) connPts.push(c.nearAt);
      if (c.farAt) connPts.push(c.farAt);
      for (const p of c.sealUnlocks ?? []) connPts.push(p);
    }
    const isConn = (d: (typeof doors)[number]): boolean => {
      const [x, z] = centre(d);
      return connPts.some((p) => hyp2(p[0] - x, p[1] - z) < 0.6);
    };
    const conn = doors.filter(isConn).length;
    const tagged =
      doors.filter((d) => !isConn(d) && d.section === 3).length +
      (lay.switches ?? []).filter((x) => x.section === 3).length +
      (lay.boards ?? []).filter((x) => x.section === 3).length +
      (lay.alarms ?? []).filter((x) => x.section === 3).length +
      (m.sectors.CAMPUS_SECURITY.desks ?? []).filter((x) => x.section === 3).length +
      (S4.keypads?.length ?? 0) +
      (S4.intel?.filter((n) => n.kind === 'board').length ?? 0) +
      (S4.bolts?.length ?? 0) +
      (S4.pairGates?.length ?? 0) * 2;
    const size = tagged + conn + 1 + COURSE_MAX + m.sectors.CAMPUS_SECTORS.length;
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`S4 co-op items: ${size} (tagged ${tagged})`);
    expect(size).toBeLessThanOrEqual(100);
    expect(size).toBeLessThan(MAX_ITEMS);
  });
});
