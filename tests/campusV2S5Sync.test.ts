/**
 * (campus-greybox S5, `docs/campus-greybox/briefs/S5.md` 0.3 and P2) Section 5's sync contract, flag on
 * (`flags.campusV2 = [5]`): the graph's `syncs` equal SYNC.md 9eb7b9c6 (`docs/sector-redesign/signoff/SYNC.md`, S5 rows
 * SY:48-53), each device stands at its SY / D point, every sync id is named in the v2 files, the codes are consistent and
 * S5's live co-op items fit the wire.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { LevelBuilder as LB } from '../src/world/levelBuilder';
import { hyp2 } from '../src/core/mathx';
import { MAX_ITEMS, COURSE_MAX } from '../src/net/protocol';

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const sectorsGame = await import('../src/game/sectors');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  return { sectors, sectorsGame, buildCampus, LevelBuilder, s5 };
}

const m = await loadCampus([5]);
const { S5_BOARDS, S5_GROUPS, S5_L1, S5_DOORS } = m.s5;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const SECTORS = m.sectors.CAMPUS_SECTORS;
const S5 = SECTORS[4]!;
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];
const graph = JSON.parse(readFileSync(new URL('../docs/sector-redesign/graph/v2/campusOps-S5.json', import.meta.url), 'utf8')) as {
  syncs: { id: string; kind: string; space: string; track: string; lead: string }[];
};
const src = ['../src/world/maps/campusV2/s5.ts', '../src/world/maps/campusV2/s5Data.ts'].map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');

describe('S5 v2 sync contract (SYNC.md 9eb7b9c6, SY:48-53)', () => {
  it('the graph syncs: ids, kinds, spaces, tracks and leads equal SY:48-53', () => {
    // SY:48-53 (docs/sector-redesign/signoff/SYNC.md @9eb7b9c6): id | kind | space | track | lead
    const SY = [
      ['sync-s5-fob', 'code_source', 's5-arch', 'A', 's5-gal'], // SY:48 (reserved spare)
      ['sync-s5-strongkey', 'code_sink', 's5-ante', 'B', 's5-ante'], // SY:49 (reserved spare)
      ['sync-s5-rota', 'code_source', 's5-kitchen', 'B', 's5-kitchen'], // SY:50
      ['sync-s5-kparch', 'code_sink', 's5-landing', 'A', 's5-landing'], // SY:51
      ['sync-s5-houseboard', 'power_cut', 's5-landing', 'A', 's5-landing'], // SY:52
      ['sync-s5-gardenboard', 'power_cut', 's5-kitchen', 'B', 's5-kitchen'], // SY:53
    ];
    expect(graph.syncs.map((s) => [s.id, s.kind, s.space, s.track, s.lead])).toEqual(SY);
  });

  it('sync-s5-rota: the rota board at (-26.15, 1.5, 37.0) in the kitchen grants s5-arch (SY:50, DT:185)', () => {
    const it = S5.intel!.filter((n) => n.kind === 'board');
    expect(it.length).toBe(1);
    const r = it[0]!;
    expect(r.kind === 'board' && r.grants).toBe('s5-arch');
    if (r.kind === 'board') expect(r.at).toEqual([-26.15, 1.5, 37.0]);
  });

  it('sync-s5-kparch: kp-arch (-38, 35.5) on L1, code s5-arch, a door anchor there (SY:51, D:39)', () => {
    expect(S5.keypads).toEqual([{ at: [-38, 35.5], code: 's5-arch' }]);
    expect(S5_DOORS.kpArch).toEqual([-38, 35.5]);
    const d = b.anchors.doors.filter((q) => hyp2(doorCentre(q)[0] + 38, doorCentre(q)[1] - 35.5) < 0.1);
    expect(d.length).toBe(1);
    expect(d[0]!.hinge.y).toBe(S5_L1);
  });

  it('sync-s5-houseboard: the house board at (-32.15, 4.2, 35), circuits [83, 88], window 45 s (SY:52, L7 D:45)', () => {
    const h = S5_BOARDS.find((q) => q.groups.includes(S5_GROUPS.hall))!;
    expect([h.pos.x, h.pos.y, h.pos.z]).toEqual([-32.15, 4.2, 35]);
    expect(h.groups).toEqual([83, 88]);
    expect(h.window).toBe(45);
    expect(lay.boards!.some((q) => q.section === 4 && q.groups.join() === '83,88')).toBe(true);
  });

  it('sync-s5-gardenboard: the garden board at (-32.85, 0, 40), circuit [84], window 30 s (SY:53, G7 D:25)', () => {
    const g = S5_BOARDS.find((q) => q.groups.includes(S5_GROUPS.garden))!;
    expect([g.pos.x, g.pos.y, g.pos.z]).toEqual([-32.85, 0, 40]);
    expect(g.groups).toEqual([84]);
    expect(g.window).toBe(30);
  });

  it('sync-s5-strongkey (reserved): the day gate (-43, 38.5) stands open, no door anchor within 0.6 m on floor 0 (SY:49, G5 D:23)', () => {
    expect(S5_DOORS.dayGate).toEqual([-43, 38.5]);
    expect(b.anchors.doors.filter((q) => Math.abs(q.hinge.y) < 0.05 && hyp2(doorCentre(q)[0] + 43, doorCentre(q)[1] - 38.5) < 0.6)).toEqual([]);
    expect(S5.keypads!.some((k) => hyp2(k.at[0] + 43, k.at[1] - 38.5) < 0.6)).toBe(false);
  });

  it('every sync id is named in s5.ts / s5Data.ts; checkSectorCodes is clean; S5\'s live co-op items fit MAX_ITEMS', () => {
    for (const s of graph.syncs) expect(src.includes(s.id), s.id).toBe(true);
    expect(m.sectorsGame.checkSectorCodes(SECTORS)).toEqual([]);
    // the `tests/sectorItemScope.test.ts` count for section 5: its tagged items, the connector doors, the objective, a revive
    // per player and a crate per section
    const doors = b.anchors.doors;
    const connPts: [number, number][] = [];
    for (const s of SECTORS) {
      const c = s.connector;
      if (!c) continue;
      if (c.nearAt) connPts.push(c.nearAt);
      if (c.farAt) connPts.push(c.farAt);
      for (const p of c.sealUnlocks ?? []) connPts.push(p);
    }
    const isConn = (d: (typeof doors)[number]): boolean => connPts.some((p) => hyp2(p[0] - doorCentre(d)[0], p[1] - doorCentre(d)[1]) < 0.6);
    const tagged =
      doors.filter((d) => !isConn(d) && d.section === 4).length +
      (lay.switches ?? []).filter((x) => x.section === 4).length +
      (lay.boards ?? []).filter((x) => x.section === 4).length +
      (lay.alarms ?? []).filter((x) => x.section === 4).length +
      (m.sectors.CAMPUS_SECURITY.desks ?? []).filter((x) => x.section === 4).length +
      (S5.keypads?.length ?? 0) +
      (S5.intel?.filter((n) => n.kind === 'board').length ?? 0) +
      (S5.bolts?.length ?? 0) +
      (S5.pairGates?.length ?? 0) * 2;
    const n = tagged + doors.filter(isConn).length + 1 + COURSE_MAX + SECTORS.length;
    expect(n).toBeLessThanOrEqual(MAX_ITEMS);
    expect(n).toBeLessThanOrEqual(100);
  });
});
