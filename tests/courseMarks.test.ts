/**
 * (section-rating S6) Marlow Yard's rated sets: which bays are rated (A5), a set's rating stats from its bay's stats
 * since it began or restarted (a restart never re-rates, A8), the camera rule (A3), synced takedowns (A6) and the grant
 * (A1, A7, A9).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { CourseMarks, bayRated, bayTitle, courseGrant, setStatsInto } from '../src/game/course/courseMarks';
import { CourseState, newStats } from '../src/game/course/courseState';
import { ALL_MARKS, BODIES_HIDDEN, NO_ALARMS, NO_KILLS, UNDETECTED, coopRating, newSectionStats } from '../src/game/rating/sectionRating';
import type { BayDef } from '../src/game/course/courseDef';

const bay = (id: string, rated?: boolean): BayDef => ({ id, entry: 'start', exit: 'end', squad: [], gates: [], radio: [], drills: [], elements: [], ...(rated === undefined ? {} : { rated }) });

describe('Marlow Yard rated sets (A5)', () => {
  const def = buildCtcourse(new LevelBuilder()).layout.course!.def;
  it('A1 (a passive checker only) is unrated; A2-A8 (guards that see) are rated, with their names', () => {
    expect(def.bays.map((b) => b.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']);
    expect(def.bays.map((b) => bayRated(b))).toEqual([false, true, true, true, true, true, true, true]);
    expect(bayTitle(def.bays[1]!)).toBe('A2 Carriage Shed');
    expect(bayTitle(def.bays[7]!)).toBe('A8 Strongroom');
  });
  it('a bay without the flag (the drill bays) is unrated and titled by its id', () => {
    expect(bayRated(bay('B1'))).toBe(false);
    expect(bayRated(undefined)).toBe(false);
    expect(bayTitle(bay('B1'))).toBe('B1');
  });
});

describe('CourseMarks', () => {
  it('rates a clean rated set with all four marks, once', () => {
    const m = new CourseMarks(3);
    const s = newStats();
    m.begin(1, s);
    expect(m.rate(1, bay('A2', true), s)).toBe(ALL_MARKS);
    expect(m.marks).toEqual([-1, ALL_MARKS, -1]);
    // never re-rated
    s.kills = 3;
    expect(m.rate(1, bay('A2', true), s)).toBe(-1);
    expect(m.marks[1]).toBe(ALL_MARKS);
  });

  it('an unrated bay, or a bay other than the set being counted, is not rated', () => {
    const m = new CourseMarks(3);
    const s = newStats();
    m.begin(0, s);
    expect(m.rate(0, bay('A1', false), s)).toBe(-1);
    expect(m.rate(2, bay('A3', true), s)).toBe(-1);
    expect(m.marks).toEqual([-1, -1, -1]);
  });

  it('reads the rise since the set began: stats from before do not count', () => {
    const m = new CourseMarks(2);
    const s = newStats();
    s.detections = 4;
    s.kills = 2;
    s.alarms = 1;
    s.bodies = 1;
    m.begin(1, s);
    expect(m.rate(1, bay('A2', true), s)).toBe(ALL_MARKS);
  });

  it('each mark breaks on its own stat (A2: knock-outs are not kills)', () => {
    const cases: [Partial<ReturnType<typeof newStats>>, number][] = [
      [{ detections: 1 }, ALL_MARKS & ~UNDETECTED],
      [{ kills: 1 }, ALL_MARKS & ~NO_KILLS],
      [{ knockouts: 2 }, ALL_MARKS],
      [{ alarms: 1 }, ALL_MARKS & ~NO_ALARMS],
      [{ bodies: 1 }, ALL_MARKS & ~BODIES_HIDDEN],
    ];
    for (const [d, want] of cases) {
      const m = new CourseMarks(1);
      const s = newStats();
      m.begin(0, s);
      Object.assign(s, d);
      expect(m.rate(0, bay('A2', true), s)).toBe(want);
    }
  });

  it('a camera or laser alarm breaks Undetected (A3)', () => {
    const m = new CourseMarks(1);
    const s = newStats();
    m.begin(0, s);
    m.camera();
    s.alarms = 1;
    expect(m.rate(0, bay('A2', true), s)).toBe(BODIES_HIDDEN | NO_KILLS);
  });

  it('a restart starts the set again (A8): what happened before it does not count, camera alarms included', () => {
    const m = new CourseMarks(1);
    const s = newStats();
    m.begin(0, s);
    s.detections = 2;
    s.kills = 1;
    m.camera();
    expect(m.live(s).detections).toBe(2);
    m.begin(0, s); // the restart
    expect(m.live(s)).toEqual(newSectionStats());
    expect(m.rate(0, bay('A2', true), s)).toBe(ALL_MARKS);
  });

  it('synced takedowns: two players within the window pair once; the set reads the bay stat', () => {
    const m = new CourseMarks(1);
    const s = newStats();
    m.begin(0, s);
    expect(m.takedown(0, 10)).toBe(false);
    expect(m.takedown(1, 11.5)).toBe(true);
    s.synced++;
    expect(m.takedown(0, 11.6)).toBe(false);
    expect(m.takedown(0, 11.7)).toBe(false); // same player: no pair
    expect(m.rate(0, bay('A2', true), s)).toBe(ALL_MARKS);
    expect(m.synced[0]).toBe(1);
  });

  it('setStatsInto counts bodies made from kills and knock-outs and never goes below zero', () => {
    const base = newStats();
    base.kills = 5;
    const now = newStats();
    now.kills = 6;
    now.knockouts = 2;
    const out = setStatsInto(newSectionStats(), now, base, 0);
    expect(out).toMatchObject({ kills: 1, knockouts: 2, bodiesMade: 3, detections: 0 });
    expect(setStatsInto(newSectionStats(), newStats(), base, 0).kills).toBe(0);
  });
});

describe('courseGrant', () => {
  it('co-op, all marks: +1 gadget (Undetected) +1 (Bodies hidden, A9), a medkit, a syringe; no alarm step', () => {
    expect(courseGrant(ALL_MARKS, 0, true, 2, 2, 4)).toEqual({ gadget: 2, syringe: 1, medkit: 1, alarmStep: 0 });
  });
  it('a synced pair pays a gadget and a syringe more; gadgets capped at the starting carry, syringes at preset + 2', () => {
    expect(courseGrant(ALL_MARKS, 1, true, 2, 2, 4)).toEqual({ gadget: 3, syringe: 2, medkit: 1, alarmStep: 0 });
    expect(courseGrant(ALL_MARKS, 2, true, 2, 4, 2)).toEqual({ gadget: 2, syringe: 0, medkit: 1, alarmStep: 0 });
  });
  it('solo (A7): No alarms gives a medkit instead of a syringe', () => {
    expect(courseGrant(ALL_MARKS, 0, false, 2, 2, 4)).toEqual({ gadget: 2, syringe: 0, medkit: 2, alarmStep: 0 });
    expect(courseGrant(0, 0, false, 2, 2, 4)).toEqual({ gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 });
  });
});

describe('coopRating (S6 fix: co-op means a partner in the match at rating time)', () => {
  it('solo (no net) and a host alone in a co-op room rate solo; a host or client with a partner rate co-op', () => {
    expect(coopRating(false, 1)).toBe(false);
    expect(coopRating(true, 1)).toBe(false);
    expect(coopRating(true, 2)).toBe(true);
    expect(coopRating(false, 2)).toBe(false);
  });
  it('a host alone gets the solo table (medkits, no syringe)', () => {
    expect(courseGrant(ALL_MARKS, 0, coopRating(true, 1), 2, 2, 4)).toEqual({ gadget: 2, syringe: 0, medkit: 2, alarmStep: 0 });
    expect(courseGrant(ALL_MARKS, 0, coopRating(true, 2), 2, 2, 4)).toEqual({ gadget: 2, syringe: 1, medkit: 1, alarmStep: 0 });
  });
});

describe('BayStats.synced (S6)', () => {
  it('counts per bay, sums in the totals and survives pack / apply', () => {
    const def = buildCtcourse(new LevelBuilder()).layout.course!;
    const st = new CourseState(def.def, def.consoles);
    st.record('synced', 1);
    st.record('synced', 1);
    expect(st.stats[st.bay]!.synced).toBe(2);
    expect(st.totals().synced).toBe(2);
    const mirror = new CourseState(def.def, def.consoles);
    mirror.apply(JSON.parse(JSON.stringify(st.pack())));
    expect(mirror.stats[st.bay]!.synced).toBe(2);
  });
});
