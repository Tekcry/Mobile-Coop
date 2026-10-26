import { describe, expect, it } from 'vitest';
import { ALARM_REPEAT } from '../src/ai/alarm';
import { AREAS, AreaStages, SITE, areaOf, type AreaBox } from '../src/ai/areaAlarms';

// (guard-ai-mission-hooks S3a, D6, A9, A10) Per-area alarm stages, pure. A guard's area is the first area box (and
// height band) holding the point he was placed at, else -1 (site only); at most `AREAS.max` areas. `AreaStages` holds
// the site stage over two area stages (a guard reads max(site, his area)) and one repeat lock and count per area on
// J15 S5's rule (`ALARM_REPEAT`): independent of each other, sized once, never reallocated.

/** Area 0: two plan boxes, a height band 0..3 m. Area 1: one box, no band. Area 2: ignored (two areas at most). */
const AREA0: AreaBox = {
  boxes: [
    [-10, -10, 0, 10],
    [20, 20, 30, 30],
  ],
  y: [0, 3],
};
const AREA1: AreaBox = { boxes: [[0.01, -10, 10, 10], [-10, -10, 0, 10]] };
const AREA2: AreaBox = { boxes: [[40, 40, 50, 50]] };
const AREAS3: readonly AreaBox[] = [AREA0, AREA1, AREA2];

describe('areaOf (A10)', () => {
  it('a point in area 0 box 0 is area 0', () => {
    expect(areaOf(AREAS3, -5, 0, 1)).toBe(0);
  });

  it('a point in a second box of area 0 is area 0', () => {
    expect(areaOf(AREAS3, 25, 25, 1)).toBe(0);
  });

  it('a point in area 1 is area 1', () => {
    expect(areaOf(AREAS3, 5, 0, 1)).toBe(1);
  });

  it('a point outside every box is the site (-1)', () => {
    expect(areaOf(AREAS3, 15, 15, 1)).toBe(-1);
    expect(areaOf(AREAS3, 5, 11, 1)).toBe(SITE);
  });

  it('box edges are inside', () => {
    expect(areaOf(AREAS3, -10, -10, 0)).toBe(0);
    expect(areaOf(AREAS3, 0, 10, 3)).toBe(0);
    expect(areaOf(AREAS3, 10, -10, 1)).toBe(1);
  });

  it('a point in both areas is the first (area 0)', () => {
    // AREA1's second box overlaps AREA0's first
    expect(areaOf(AREAS3, -5, 5, 2)).toBe(0);
  });

  it('inside the boxes but outside area 0 height band: area 1 if its box holds it, else -1', () => {
    // in AREA0 box 0 and AREA1 box 1, above the band: area 1 (no band)
    expect(areaOf(AREAS3, -5, 5, 3.5)).toBe(1);
    // below the band: area 1 too
    expect(areaOf(AREAS3, -5, 5, -0.5)).toBe(1);
    // in AREA0 box 1 only, above the band: site
    expect(areaOf(AREAS3, 25, 25, 6)).toBe(-1);
  });

  it('an area with no height band holds any height', () => {
    expect(areaOf(AREAS3, 5, 0, -100)).toBe(1);
    expect(areaOf(AREAS3, 5, 0, 100)).toBe(1);
  });

  it('null and [] are the site', () => {
    expect(areaOf(null, 0, 0, 0)).toBe(-1);
    expect(areaOf([], 0, 0, 0)).toBe(-1);
  });

  it('a third area and later are ignored (S3-g)', () => {
    expect(AREAS.max).toBe(2);
    expect(areaOf(AREAS3, 45, 45, 0)).toBe(-1);
    // alone in the list it is area 0
    expect(areaOf([AREA2], 45, 45, 0)).toBe(0);
  });

  it('an area with no boxes holds nothing', () => {
    expect(areaOf([{ boxes: [] }, AREA1], 5, 0, 0)).toBe(1);
  });
});

describe('AreaStages.stageFor (A9: max(site, area))', () => {
  it('site 0, area 1 at 2: area 1 reads 2, area 0 and the site 0', () => {
    const s = new AreaStages();
    s.stage[1] = 2;
    expect(s.stageFor(1)).toBe(2);
    expect(s.stageFor(0)).toBe(0);
    expect(s.stageFor(SITE)).toBe(0);
  });

  it('site 3 over area 1 at 2: 3', () => {
    const s = new AreaStages();
    s.stage[1] = 2;
    s.site = 3;
    expect(s.stageFor(1)).toBe(3);
    expect(s.stageFor(0)).toBe(3);
  });

  it('an area outside 0..max-1 reads the site', () => {
    const s = new AreaStages();
    s.stage[0] = 2;
    s.stage[1] = 2;
    s.site = 1;
    expect(s.stageFor(5)).toBe(1);
    expect(s.stageFor(AREAS.max)).toBe(1);
    expect(s.stageFor(-1)).toBe(1);
  });
});

describe('AreaStages locks (J15 S5 rule, one per area)', () => {
  it('both areas open at first; nothing raised', () => {
    const s = new AreaStages();
    expect(s.open(0)).toBe(true);
    expect(s.open(1)).toBe(true);
    expect(s.any()).toBe(false);
  });

  it('raise(0) shuts area 0 only and counts 1', () => {
    const s = new AreaStages();
    s.raise(0, 4);
    expect(s.open(0)).toBe(false);
    expect(s.open(1)).toBe(true);
    expect(s.count[0]).toBe(1);
    expect(s.count[1]).toBe(0);
    expect(s.any()).toBe(true);
    expect(s.team0[0]).toBe(4);
    expect(s.teamN[0]).toBe(4);
    expect(s.ago[0]).toBe(0);
  });

  it('raise(1) shuts area 1 only', () => {
    const s = new AreaStages();
    s.raise(1, 0);
    expect(s.open(0)).toBe(true);
    expect(s.open(1)).toBe(false);
    expect(s.any()).toBe(true);
  });

  it('waiting only with repeats on, and only after a raise', () => {
    const s = new AreaStages();
    expect(s.waiting(0, true)).toBe(false);
    s.raise(0, 0);
    expect(s.waiting(0, false)).toBe(false);
    expect(s.waiting(0, true)).toBe(ALARM_REPEAT.enabled);
    expect(s.waiting(1, true)).toBe(false);
  });

  it('tick is true at ALARM_REPEAT.rearm (within dt), not before', () => {
    const s = new AreaStages();
    s.raise(0, 0);
    // dt exact in binary: the clock fires on the step that reaches `rearm`, not the one before
    const dt = 0.25;
    let t = 0;
    let fired = -1;
    for (let i = 0; i < 2000 && fired < 0; i++) {
      t += dt;
      if (s.tick(0, dt)) fired = t;
    }
    expect(fired).toBe(ALARM_REPEAT.rearm);
    // area 1's clock did not run
    expect(s.ago[1]).toBe(0);
    // a frame-like dt (Float32 clock): within one dt of `rearm`
    s.raise(1, 0);
    const dt1 = 1 / 60;
    t = 0;
    fired = -1;
    for (let i = 0; i < 10000 && fired < 0; i++) {
      t += dt1;
      if (s.tick(1, dt1)) fired = t;
    }
    expect(fired).toBeGreaterThan(ALARM_REPEAT.rearm - dt1);
    expect(fired).toBeLessThan(ALARM_REPEAT.rearm + dt1);
    // area 0's clock did not move while area 1's ran
    expect(s.ago[0]).toBe(ALARM_REPEAT.rearm);
  });

  it('rearm(0) opens area 0 and it stops waiting', () => {
    const s = new AreaStages();
    s.raise(0, 0);
    s.rearm(0);
    expect(s.open(0)).toBe(true);
    expect(s.waiting(0, true)).toBe(false);
    // a new raise shuts it again and restarts its clock
    s.tick(0, 5);
    s.raise(0, 2);
    expect(s.open(0)).toBe(false);
    expect(s.ago[0]).toBe(0);
    expect(s.count[0]).toBe(2);
    expect(s.team0[0]).toBe(2);
  });

  it('after ALARM_REPEAT.max raises waiting is false (never one more)', () => {
    const s = new AreaStages();
    for (let i = 0; i < ALARM_REPEAT.max; i++) {
      expect(s.open(0)).toBe(true);
      s.raise(0, i);
      if (i < ALARM_REPEAT.max - 1) {
        expect(s.waiting(0, true)).toBe(ALARM_REPEAT.enabled);
        s.rearm(0);
      }
    }
    expect(s.count[0]).toBe(ALARM_REPEAT.max);
    expect(s.waiting(0, true)).toBe(false);
    expect(s.open(0)).toBe(false);
    // area 1 is untouched
    expect(s.open(1)).toBe(true);
    expect(s.count[1]).toBe(0);
  });

  it('resetLocks clears every lock and count and keeps the stages', () => {
    const s = new AreaStages();
    s.site = 1;
    s.stage[0] = 2;
    s.stage[1] = 3;
    s.raise(0, 3);
    s.raise(1, 5);
    s.rearm(1);
    s.tick(0, 7);
    s.resetLocks();
    for (let a = 0; a < AREAS.max; a++) {
      expect(s.raised[a]).toBe(0);
      expect(s.rearmed[a]).toBe(0);
      expect(s.count[a]).toBe(0);
      expect(s.ago[a]).toBe(0);
      expect(s.team0[a]).toBe(0);
      expect(s.teamN[a]).toBe(0);
      expect(s.open(a)).toBe(true);
    }
    expect(s.any()).toBe(false);
    expect(s.site).toBe(1);
    expect(s.stage[0]).toBe(2);
    expect(s.stage[1]).toBe(3);
  });

  it('clearStages clears the site and area stages and keeps the locks', () => {
    const s = new AreaStages();
    s.site = 2;
    s.stage[0] = 1;
    s.stage[1] = 3;
    s.raise(1, 0);
    s.clearStages();
    expect(s.site).toBe(0);
    expect(s.stage[0]).toBe(0);
    expect(s.stage[1]).toBe(0);
    expect(s.stageFor(1)).toBe(0);
    expect(s.open(1)).toBe(false);
    expect(s.count[1]).toBe(1);
  });

  it('the typed arrays keep their identity (no reallocation)', () => {
    const s = new AreaStages();
    const refs = [s.stage, s.raised, s.rearmed, s.count, s.ago, s.team0, s.teamN] as const;
    for (const r of refs) expect(r.length).toBe(AREAS.max);
    for (let i = 0; i < 200; i++) {
      s.raise(i & 1, i);
      s.waiting(i & 1, true);
      s.tick(i & 1, 0.5);
      s.rearm(i & 1);
      s.stageFor(i & 1);
      s.any();
      if (i % 50 === 0) {
        s.resetLocks();
        s.clearStages();
      }
    }
    expect(s.stage).toBe(refs[0]);
    expect(s.raised).toBe(refs[1]);
    expect(s.rearmed).toBe(refs[2]);
    expect(s.count).toBe(refs[3]);
    expect(s.ago).toBe(refs[4]);
    expect(s.team0).toBe(refs[5]);
    expect(s.teamN).toBe(refs[6]);
  });
});
