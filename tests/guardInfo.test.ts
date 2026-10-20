import { describe, expect, it } from 'vitest';
import { GUARD_INFO_LINE_MAX, GUARD_INFO_NEAR, hasInfo, infoAtSpawn, takeInfo, type GuardInfo } from '../src/ai/guardInfo';
import { addGrabRows } from '../src/game/grabMenu';
import { ContextMenu } from '../src/game/contextMenu';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse, GUARD_INFO, GUARD_SLOT } from '../src/world/maps/ctcourse';

// (CT prototype PR 3, Michael 2026-10-20 08:40: "Add one in Marlow Yard") one training guard with information, so a held
// guard can show INTERROGATE (08:10: "once they are grabbed it can show interrogate (if they have information)").
const rows = (v: { info?: GuardInfo | null }): string[] => {
  const m = new ContextMenu();
  m.begin();
  addGrabRows(m, hasInfo(v));
  m.end();
  const out: string[] = [];
  for (let i = 0; i < m.count; i++) out.push(`${m.opts[i]!.kind}:${m.opts[i]!.opt}`);
  return out;
};

describe('guard information (PR 3)', () => {
  const info: GuardInfo = { lines: ['One.', 'Two.'] };

  it('a guard with information lists INTERROGATE; spent, or without, no menu', () => {
    const g: { info?: GuardInfo | null } = { info };
    expect(hasInfo(g)).toBe(true);
    expect(rows(g)).toEqual(['grab:interrogate']);
    expect(takeInfo(g)).toEqual(['One.', 'Two.']);
    expect(hasInfo(g)).toBe(false);
    expect(rows(g)).toEqual([]);
    // interrogated once, never again
    expect(takeInfo(g)).toBeNull();
    expect(rows({})).toEqual([]);
    expect(rows({ info: null })).toEqual([]);
    expect(rows({ info: { lines: [] } })).toEqual([]);
  });

  it('a co-op puppet finds the slot it appeared at (no wire data), and only within reach of it', () => {
    const slots = { a: { x: 10, z: 3 }, b: { x: 10.5, z: 3.2, info } };
    expect(infoAtSpawn(slots, 10.6, 3.3)).toBe(info);
    expect(infoAtSpawn(slots, 10.5 + GUARD_INFO_NEAR + 0.1, 3.2)).toBeNull();
    expect(infoAtSpawn(undefined, 10.5, 3.2)).toBeNull();
    expect(infoAtSpawn({}, 10.5, 3.2)).toBeNull();
  });
});

describe('Marlow Yard training guard (PR 3)', () => {
  const lay = ctcourse.build(new LevelBuilder(), 0);
  const course = lay.course!;
  const slot = course.squads[GUARD_SLOT]!;

  it('is one passive guard with information, spawned by station 1 only', () => {
    expect(Object.keys(course.squads)).toEqual([GUARD_SLOT]);
    expect(slot.kind).toBe('grunt');
    expect(slot.passive).toBe(true);
    expect(slot.info).toBe(GUARD_INFO);
    expect(hasInfo(slot)).toBe(true);
    course.def.bays.forEach((b, i) => expect(b.squad).toEqual(i === 0 ? [GUARD_SLOT] : []));
  });

  it('stands in bay 1, clear of the door, the panel and the airlock pad, facing away from the start', () => {
    expect(slot.x).toBeGreaterThan(8);
    expect(slot.x).toBeLessThan(14);
    // the airlock door gap (z 6.4-7.6) and the pad (z 4-10) are not his; he is by the south fence
    expect(slot.z).toBeLessThan(4);
    // east, the way the players start facing: they come up behind him
    expect(slot.yaw).toBeCloseTo(Math.PI / 2, 5);
  });

  it('the lines are one or two, short (radio length), original, no dash', () => {
    expect(GUARD_INFO.lines.length).toBeGreaterThanOrEqual(1);
    expect(GUARD_INFO.lines.length).toBeLessThanOrEqual(2);
    for (const l of GUARD_INFO.lines) {
      expect(l.length).toBeGreaterThan(0);
      expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(l).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('what he says is true: the two wall medkits are where the lines say (the annex north wall, before the last wall)', () => {
    const med = lay.medkitWalls ?? [];
    expect(med).toHaveLength(2);
    // north wall: z next to the 14 m fence; the first is in station 5's annex (x 88-104), the second in station 8's bay
    for (const k of med) expect(k.pos.z).toBeGreaterThan(13);
    expect(med[0]!.pos.x).toBeGreaterThan(22 * 4 + 9);
    expect(med[0]!.pos.x).toBeLessThan(22 * 4 + 16);
    expect(med[1]!.pos.x).toBeGreaterThan(22 * 7);
    expect(med[1]!.pos.x).toBeLessThan(22 * 7 + 9);
    expect(GUARD_INFO.lines[0]).toMatch(/annex/);
    expect(GUARD_INFO.lines[1]).toMatch(/last wall/);
  });
});
