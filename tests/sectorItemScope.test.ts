/**
 * (sector-redesign S4/S5 cap fix, `docs/sector-redesign/checks/s45-cap-fix.md`) The co-op item scope: with all five
 * campus sections built the host registers 196 interactables, over the wire's `MAX_ITEMS` (128). Each section's items
 * carry its index and the host mirrors only the live section's plus the untagged ones (objective / exit, connector
 * doors, revives, crates). These tests hold the rule, the campus tags and the per-section budget.
 */
import { describe, expect, it } from 'vitest';
import { ITEM_SCOPE_OFF, itemInScope } from '../src/game/itemScope';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { S1_ROOMS } from '../src/world/maps/campusS1';
import { S2_ROOMS } from '../src/world/maps/campusS2';
import { S3_ROOMS } from '../src/world/maps/campusS3';
import { S4_ROOMS } from '../src/world/maps/campusS4';
import { S5_ROOMS } from '../src/world/maps/campusS5';
import { CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { MAX_ITEMS, COURSE_MAX } from '../src/net/protocol';
import { hyp2 } from '../src/core/mathx';

describe('itemInScope', () => {
  it('off: every item; a live section: its items and the untagged ones; between sections (-1): the untagged only', () => {
    expect(itemInScope(2, ITEM_SCOPE_OFF)).toBe(true);
    expect(itemInScope(undefined, ITEM_SCOPE_OFF)).toBe(true);
    expect(itemInScope(3, 3)).toBe(true);
    expect(itemInScope(undefined, 3)).toBe(true);
    expect(itemInScope(2, 3)).toBe(false);
    expect(itemInScope(0, -1)).toBe(false);
    expect(itemInScope(undefined, -1)).toBe(true);
  });
});

describe('campus item sections', () => {
  const b = new LevelBuilder();
  const lay = campusOps.build(b, 0);
  const doors = b.anchors.doors;
  const centre = (d: (typeof doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];
  // the connector doors (near, far, seal): the mode untags them (always mirrored)
  const connPts: [number, number][] = [];
  for (const s of CAMPUS_SECTORS) {
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

  it('every door, switch, hide spot, board and alarm carries a section 0-4', () => {
    const ok = (s: number | undefined): boolean => s !== undefined && s >= 0 && s < CAMPUS_SECTORS.length;
    expect(doors.filter((d) => !ok(d.section)).length).toBe(0);
    expect((lay.switches ?? []).filter((s) => !ok(s.section)).length).toBe(0);
    expect((lay.hideSpots ?? []).filter((s) => !ok(s.section)).length).toBe(0);
    expect((lay.boards ?? []).filter((s) => !ok(s.section)).length).toBe(0);
    expect((lay.alarms ?? []).filter((s) => !ok(s.section)).length).toBe(0);
    expect((CAMPUS_SECURITY.desks ?? []).filter((s) => !ok(s.section)).length).toBe(0);
  });

  it('a section-tagged door (not a connector door) stands in its own section\'s rooms only (a player of another section never reaches it)', () => {
    const rooms = [S1_ROOMS, S2_ROOMS, S3_ROOMS, S4_ROOMS, S5_ROOMS];
    const bad: string[] = [];
    for (const d of doors) {
      if (isConn(d)) continue;
      const [x, z] = centre(d);
      const hit = new Set<number>();
      rooms.forEach((rs, j) => {
        for (const r of rs) if (x >= r.minX - 1 && x <= r.maxX + 1 && z >= r.minZ - 1 && z <= r.maxZ + 1) hit.add(j);
      });
      if (hit.size !== 1 || !hit.has(d.section!)) bad.push(`(${x.toFixed(1)}, ${z.toFixed(1)}) S${d.section! + 1} in rooms of ${[...hit].map((j) => `S${j + 1}`).join(',')}`);
    }
    expect(bad).toEqual([]);
  });

  it('every section-tagged switch, board, hide spot, alarm, desk, keypad, intel board, bolt, pair switch and crate stands in its own section\'s rooms only (PR 3: the s45-cap-fix item-scope risk)', () => {
    const rooms = [S1_ROOMS, S2_ROOMS, S3_ROOMS, S4_ROOMS, S5_ROOMS];
    const pts: { what: string; sec: number; x: number; z: number }[] = [];
    const put = (what: string, sec: number | undefined, x: number, z: number): void => {
      if (sec !== undefined) pts.push({ what, sec, x, z });
    };
    for (const v of lay.switches ?? []) put('switch', v.section, v.pos.x, v.pos.z);
    for (const v of lay.boards ?? []) put('board', v.section, v.pos.x, v.pos.z);
    for (const v of lay.hideSpots ?? []) put('hide', v.section, v.pos.x, v.pos.z);
    for (const v of lay.alarms ?? []) put('alarm', v.section, v.pos.x, v.pos.z);
    for (const d of CAMPUS_SECURITY.desks ?? []) put(`desk ${d.id}`, d.section, d.at[0], d.at[1]);
    CAMPUS_SECTORS.forEach((s, i) => {
      s.keypads?.forEach((k, j) => put(`keypad ${j}`, i, k.at[0], k.at[1]));
      s.intel?.forEach((n, j) => {
        if (n.kind === 'board') put(`intel board ${j}`, i, n.at[0], n.at[2]);
      });
      s.bolts?.forEach((b, j) => put(`bolt ${j}`, i, b.at[0], b.at[1]));
      s.pairGates?.forEach((g, j) => {
        put(`pair ${j} a`, i, g.a.at[0], g.a.at[1]);
        put(`pair ${j} b`, i, g.b.at[0], g.b.at[1]);
      });
    });
    // the crates (tagged with their section by sectorMode.findCrates) stand at the section start, which from section 2 on
    // is the previous section's connector: enabled and mirrored only while their section is live (WeaponCrates.setLive)
    const crateBad: string[] = [];
    CAMPUS_SECTORS.forEach((s, i) => {
      const c = s.crate;
      if (!c) return;
      if (hyp2(c.at[0] - s.start.x, c.at[2] - s.start.z) > 3) crateBad.push(`${s.id} crate not at its start`);
      const box = i > 0 ? CAMPUS_SECTORS[i - 1]!.connector?.box : undefined;
      if (i === 0) put('crate', 0, c.at[0], c.at[2]);
      else if (!box || c.at[0] < Math.min(box[0], box[2]) || c.at[0] > Math.max(box[0], box[2]) || c.at[2] < Math.min(box[1], box[3]) || c.at[2] > Math.max(box[1], box[3])) crateBad.push(`${s.id} crate (${c.at[0]}, ${c.at[2]}) outside the connector into it`);
    });
    expect(crateBad).toEqual([]);
    expect(pts.length).toBeGreaterThan(50);
    const bad: string[] = [];
    for (const q of pts) {
      const hit = new Set<number>();
      rooms.forEach((rs, j) => {
        for (const r of rs) if (q.x >= r.minX - 1 && q.x <= r.maxX + 1 && q.z >= r.minZ - 1 && q.z <= r.maxZ + 1) hit.add(j);
      });
      if (hit.size !== 1 || !hit.has(q.sec)) bad.push(`${q.what} (${q.x.toFixed(1)}, ${q.z.toFixed(1)}) S${q.sec + 1} in rooms of ${[...hit].map((j) => `S${j + 1}`).join(',')}`);
    }
    expect(bad).toEqual([]);
  });

  it('each live section\'s mirrored set stays under MAX_ITEMS with headroom (crates, revives)', () => {
    const conn = doors.filter(isConn).length;
    const sizes = CAMPUS_SECTORS.map((s, i) => {
      const tagged =
        doors.filter((d) => !isConn(d) && d.section === i).length +
        (lay.switches ?? []).filter((x) => x.section === i).length +
        (lay.boards ?? []).filter((x) => x.section === i).length +
        (lay.alarms ?? []).filter((x) => x.section === i).length +
        (CAMPUS_SECURITY.desks ?? []).filter((x) => x.section === i).length +
        (s.keypads?.length ?? 0) +
        (s.intel?.filter((n) => n.kind === 'board').length ?? 0) +
        (s.bolts?.length ?? 0) +
        (s.pairGates?.length ?? 0) * 2;
      // untagged: the connector doors, the objective or exit, a revive per player, one crate per section (E9, headroom)
      return tagged + conn + 1 + COURSE_MAX + CAMPUS_SECTORS.length;
    });
    // 24 / 57 / 42 / 64 / 59 with the headroom at 3fc36d79: well under the cap
    for (const n of sizes) expect(n).toBeLessThanOrEqual(100);
    expect(Math.max(...sizes)).toBeLessThan(MAX_ITEMS);
    // and the whole map's would not fit (why the scope exists)
    const all = doors.length + (lay.switches?.length ?? 0) + (lay.boards?.length ?? 0) + (lay.alarms?.length ?? 0) + (lay.hideSpots?.length ?? 0);
    expect(all).toBeGreaterThan(MAX_ITEMS);
  });
});
