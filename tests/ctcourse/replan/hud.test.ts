/**
 * J14 R2 (PLAN R2, signposting and ratings): the objective list's header names the live step's badge ("step 4 of 18"; A8's
 * 18 is four steps 18a-18d) and a line under it names the bay's retry rule ("Seen or out of time: you go back to the start
 * of this step", level-design 9: in training every failure is a retry, never "fail"). Pure helpers of
 * `src/ui/hud/courseHud.ts` (node, no DOM; the DOM is covered by e2e-section-rating on the PC). Ratings: a set is rated only
 * when a guard can see (A1 and A3 are not), and a station retry never touches the rating (`onStationRetry`).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import type { StationDef } from '../../../src/game/course/stationDef';
import { bayHeader, retryRule, STATION_BADGES, stationBadge } from '../../../src/ui/hud/courseHud';
import { LevelBuilder } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';

const built = buildCtcourse(new LevelBuilder());
const replan = buildCtcourse(new LevelBuilder(), { replan: true });
const bayOf = (id: string) => replan.layout.course!.def.bays.find((b) => b.id === id);

const MARKS: StationDef['marks'] = [{ x: 0, z: 0, y: 0, yaw: 0 }, { x: 1, z: 0, y: 0, yaw: 0 }];
const st = (n: number, retry: StationDef['retry'], drillS?: number): StationDef => ({
  n, id: `s${n}`, lesson: 'x', marks: MARKS, retry, guards: [], gates: [], doneFlag: `f${n}`, ...(drillS !== undefined ? { drillS } : {}),
});

const SEEN = 'Seen: you go back to the start of this step.';
const SEEN_T = 'Seen or out of time: you go back to the start of this step.';
const CAUGHT = 'Caught: you go back to the start of this step.';
const CAUGHT_T = 'Caught or out of time: you go back to the start of this step.';

describe('J14 R2: the station badge and the header', () => {
  it('badges 1-17 as is; A8 n 18-21 are 18a-18d; the player sees 18 badges', () => {
    expect(STATION_BADGES).toBe(18);
    expect([1, 17, 18, 19, 20, 21].map(stationBadge)).toEqual(['1', '17', '18a', '18b', '18c', '18d']);
  });

  it('the header is unchanged with no live station, else names the step of 18', () => {
    expect(bayHeader('A2', 0)).toBe('A2 - objectives');
    expect(bayHeader('A2', 4)).toBe('A2 - objectives - step 4 of 18');
    expect(bayHeader('A8', 20)).toBe('A8 - objectives - step 18c of 18');
  });
});

describe('J14 R2: the retry rule line', () => {
  it('hand lists: none only or empty -> no line; station / caught with and without a drill window', () => {
    expect(retryRule([])).toBeNull();
    expect(retryRule([st(1, 'none'), st(2, 'none')])).toBeNull();
    expect(retryRule([st(1, 'none'), st(3, 'station')])).toBe(SEEN);
    expect(retryRule([st(3, 'station'), st(4, 'station', 15)])).toBe(SEEN_T);
    expect(retryRule([st(18, 'caught')])).toBe(CAUGHT);
    expect(retryRule([st(18, 'caught'), st(20, 'caught', 25)])).toBe(CAUGHT_T);
  });

  it('every text fits COURSE_TEXT_MAX and none says "fail"', () => {
    for (const t of [SEEN, SEEN_T, CAUGHT, CAUGHT_T]) {
      expect(t.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(t.toLowerCase()).not.toContain('fail');
    }
  });

  it('over the re-plan layout: A1 none, A2 / A4 / A5 seen or out of time, A3 / A7 seen, A8 caught or out of time (A6 seen once it has stations)', () => {
    const want: Record<string, string | null> = { A1: null, A2: SEEN_T, A3: SEEN, A4: SEEN_T, A5: SEEN_T, A7: SEEN, A8: CAUGHT_T };
    for (const [id, rule] of Object.entries(want)) expect(retryRule(bayOf(id)!.stations ?? []), id).toBe(rule);
    const a6 = bayOf('A6')!;
    if (a6.stations?.length) expect(retryRule(a6.stations)).toBe(SEEN);
  });

  it('the built ctcourse has no stations: no rule line and the plain header on every bay', () => {
    for (const b of built.layout.course!.def.bays) {
      expect(b.stations ?? [], b.id).toEqual([]);
      expect(retryRule(b.stations ?? [])).toBeNull();
      expect(bayHeader(b.id, 0)).toBe(`${b.id} - objectives`);
    }
  });
});

describe('J14 R2: ratings on the re-plan', () => {
  it('A1 (a passive checker) and A3 (no guard) are unrated; A2, A4, A5, A7 and A8 are rated', () => {
    const want: Record<string, boolean> = { A1: false, A2: true, A3: false, A4: true, A5: true, A7: true, A8: true };
    for (const [id, rated] of Object.entries(want)) expect(bayOf(id)!.rated === true, id).toBe(rated);
  });

  it("a station retry is not a set restart: CourseMode's onStationRetry never touches the rating", () => {
    // CRLF checkouts (core.autocrlf on Windows) would miss the '\n  }\n' end marker
    const src = readFileSync('src/game/modes/courseMode.ts', 'utf8').replace(/\r\n/g, '\n');
    const at = src.indexOf('  private onStationRetry(');
    expect(at).toBeGreaterThan(0);
    const body = src.slice(at, src.indexOf('\n  }\n', at));
    expect(body).toContain('resetStationGuards');
    expect(body).not.toMatch(/rating/);
  });
});
