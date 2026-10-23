import { describe, expect, it } from 'vitest';
import {
  ALL_MARKS,
  BODIES_HIDDEN,
  DEFAULT_RULES,
  NO_ALARMS,
  NO_KILLS,
  RATING_LABEL,
  SYNC_WINDOW,
  SyncedDetector,
  UNDETECTED,
  markCount,
  newSectionStats,
  rateSection,
  resetSectionStats,
  rewardsFor,
  type RewardCtx,
  type SectionStats,
} from '../src/game/rating/sectionRating';

const stats = (o: Partial<SectionStats> = {}): SectionStats => ({ ...newSectionStats(), ...o });
const coop: RewardCtx = { coop: true, preset: 2, gadgetsAtStart: 2, syringesAtStart: 2 };
const solo: RewardCtx = { coop: false, preset: 0, gadgetsAtStart: 2, syringesAtStart: 0 };

describe('rateSection', () => {
  it('a clean section earns all four (A4 default)', () => {
    expect(rateSection(newSectionStats())).toBe(ALL_MARKS);
    expect(markCount(ALL_MARKS)).toBe(4);
  });
  it('Undetected on and off', () => {
    expect(rateSection(stats({ detections: 1 })) & UNDETECTED).toBe(0);
    expect(rateSection(stats({ detections: 0 })) & UNDETECTED).toBe(UNDETECTED);
  });
  it('No kills on and off; knock-outs do not break it (A2)', () => {
    expect(rateSection(stats({ kills: 1 })) & NO_KILLS).toBe(0);
    expect(rateSection(stats({ knockouts: 3 })) & NO_KILLS).toBe(NO_KILLS);
  });
  it('No alarms on and off', () => {
    expect(rateSection(stats({ alarms: 1 })) & NO_ALARMS).toBe(0);
    expect(rateSection(stats()) & NO_ALARMS).toBe(NO_ALARMS);
  });
  it('Bodies hidden on and off', () => {
    expect(rateSection(stats({ bodiesMade: 2, bodiesFound: 1 })) & BODIES_HIDDEN).toBe(0);
    expect(rateSection(stats({ bodiesMade: 2 })) & BODIES_HIDDEN).toBe(BODIES_HIDDEN);
  });
  it('A2 flag: knock-outs break No kills', () => {
    const r = { ...DEFAULT_RULES, knockoutsBreakNoKills: true };
    expect(rateSection(stats({ knockouts: 1 }), r) & NO_KILLS).toBe(0);
    expect(rateSection(stats(), r) & NO_KILLS).toBe(NO_KILLS);
  });
  it('A3 flag: camera alarm breaks Undetected by default, not when off', () => {
    expect(rateSection(stats({ camAlarms: 1 })) & UNDETECTED).toBe(0);
    expect(rateSection(stats({ camAlarms: 1 }), { ...DEFAULT_RULES, cameraBreaksUndetected: false }) & UNDETECTED).toBe(UNDETECTED);
  });
  it('A4 flag: Bodies hidden needs a body', () => {
    const r = { ...DEFAULT_RULES, bodiesHiddenNeedsBody: true };
    expect(rateSection(stats(), r) & BODIES_HIDDEN).toBe(0);
    expect(rateSection(stats({ bodiesMade: 1 }), r) & BODIES_HIDDEN).toBe(BODIES_HIDDEN);
    expect(rateSection(stats({ bodiesMade: 1, bodiesFound: 1 }), r) & BODIES_HIDDEN).toBe(0);
  });
  it('resetSectionStats zeroes in place', () => {
    const s = stats({ detections: 1, camAlarms: 2, alarms: 3, kills: 4, knockouts: 5, bodiesMade: 6, bodiesFound: 7, synced: 8 });
    resetSectionStats(s);
    expect(s).toEqual(newSectionStats());
  });
});

describe('rewardsFor', () => {
  it('no marks, no synced: nothing', () => {
    expect(rewardsFor(0, 0, coop)).toEqual({ gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 });
  });
  it('each mark gives its row (co-op)', () => {
    expect(rewardsFor(UNDETECTED, 0, coop)).toEqual({ gadget: 1, syringe: 0, medkit: 0, alarmStep: 0 });
    expect(rewardsFor(NO_KILLS, 0, coop)).toEqual({ gadget: 0, syringe: 0, medkit: 1, alarmStep: 0 });
    expect(rewardsFor(NO_ALARMS, 0, { ...coop, syringesAtStart: 1 })).toEqual({ gadget: 0, syringe: 1, medkit: 0, alarmStep: 0 });
    expect(rewardsFor(BODIES_HIDDEN, 0, coop)).toEqual({ gadget: 0, syringe: 0, medkit: 0, alarmStep: 1 });
  });
  it('solo column: syringe becomes a medkit', () => {
    expect(rewardsFor(NO_ALARMS, 0, solo)).toEqual({ gadget: 0, syringe: 0, medkit: 1, alarmStep: 0 });
    expect(rewardsFor(ALL_MARKS, 0, solo)).toEqual({ gadget: 1, syringe: 0, medkit: 2, alarmStep: 1 });
  });
  it('synced pays more than a mark and shooting pays nothing', () => {
    const g = rewardsFor(0, 1, coop);
    expect(g.gadget + g.syringe).toBe(2);
    expect(rewardsFor(0, 0, coop)).toEqual({ gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 });
  });
  it('synced paid count is capped', () => {
    expect(rewardsFor(0, 10, { ...coop, gadgetsAtStart: 9, syringesAtStart: 0 })).toEqual({ gadget: 2, syringe: 2, medkit: 0, alarmStep: 0 });
  });
  it('gadgets never above the starting count', () => {
    expect(rewardsFor(UNDETECTED, 2, { ...coop, gadgetsAtStart: 2 }).gadget).toBe(2);
    expect(rewardsFor(UNDETECTED, 0, { ...coop, gadgetsAtStart: 0 }).gadget).toBe(0);
  });
  it('syringes at most +2 over the preset', () => {
    const c = (syringesAtStart: number): RewardCtx => ({ coop: true, preset: 2, gadgetsAtStart: 2, syringesAtStart });
    expect(rewardsFor(NO_ALARMS, 2, c(2)).syringe).toBe(2);
    expect(rewardsFor(NO_ALARMS, 2, c(3)).syringe).toBe(1);
    expect(rewardsFor(NO_ALARMS, 2, c(4)).syringe).toBe(0);
    expect(rewardsFor(NO_ALARMS, 2, c(9)).syringe).toBe(0);
  });
});

describe('SyncedDetector', () => {
  it('two players inside the window sync', () => {
    const d = new SyncedDetector();
    expect(d.onTakedown(0, 10)).toBe(false);
    expect(d.onTakedown(1, 10.5)).toBe(true);
    expect(d.synced).toBe(1);
  });
  it('exactly the window syncs, just over does not', () => {
    const a = new SyncedDetector();
    a.onTakedown(0, 10);
    expect(a.onTakedown(1, 10 + SYNC_WINDOW)).toBe(true);
    const b = new SyncedDetector();
    b.onTakedown(0, 10);
    expect(b.onTakedown(1, 10 + SYNC_WINDOW + 0.001)).toBe(false);
    expect(b.synced).toBe(0);
  });
  it('same player twice is not synced', () => {
    const d = new SyncedDetector();
    expect(d.onTakedown(0, 10)).toBe(false);
    expect(d.onTakedown(0, 10.2)).toBe(false);
    expect(d.synced).toBe(0);
  });
  it('a takedown is used once', () => {
    const d = new SyncedDetector();
    d.onTakedown(0, 10);
    expect(d.onTakedown(1, 10.5)).toBe(true);
    expect(d.onTakedown(0, 11)).toBe(false);
    expect(d.onTakedown(1, 11.2)).toBe(true);
    expect(d.synced).toBe(2);
  });
  it('a paired takedown cannot be re-used by a third', () => {
    const d = new SyncedDetector();
    d.onTakedown(0, 10);
    d.onTakedown(1, 10.5);
    expect(d.onTakedown(1, 10.8)).toBe(false);
  });
  it('addSynced and reset', () => {
    const d = new SyncedDetector();
    d.addSynced();
    expect(d.synced).toBe(1);
    d.onTakedown(0, 1);
    d.reset();
    expect(d.synced).toBe(0);
    expect(d.onTakedown(1, 1.1)).toBe(false);
  });
});

describe('labels', () => {
  it('has a label per mark', () => {
    expect(RATING_LABEL[UNDETECTED]).toBe('Undetected');
    expect(RATING_LABEL.synced).toBe('Synced');
  });
});
