import { describe, expect, it } from 'vitest';
import { ratingLines, sectionLine, type RatingView } from '../src/ui/hud/ratingCard';
import { ALL_MARKS, NO_KILLS, UNDETECTED, emptyGrant } from '../src/game/rating/sectionRating';

const view = (o: Partial<RatingView> = {}): RatingView => ({ sectionId: 's1', title: 'Dock', marks: ALL_MARKS, synced: 0, grant: emptyGrant(), ...o });

describe('ratingLines', () => {
  it('ticks and crosses follow the marks', () => {
    const l = ratingLines(view({ marks: UNDETECTED | NO_KILLS }));
    expect(l.marks.map((m) => m.ok)).toEqual([true, true, false, false]);
    expect(l.marks[0]!.label).toBe('Undetected');
  });
  it('grant strings, generic and named gadget', () => {
    const grant = { gadget: 1, syringe: 2, medkit: 1, alarmStep: 0 };
    expect(ratingLines(view({ grant })).grant).toEqual(['+1 gadget charge', '+2 syringes', '+1 medkit']);
    expect(ratingLines(view({ grant }), 'jammer').grant[0]).toBe('+1 jammer charge');
  });
  it('empty grant and no synced', () => {
    const l = ratingLines(view());
    expect(l.grant).toEqual([]);
    expect(l.synced).toBe('');
  });
  it('synced text', () => {
    expect(ratingLines(view({ synced: 2 })).synced).toBe('Synced x2');
  });
});

describe('sectionLine', () => {
  it('all marks', () => {
    expect(sectionLine(view())).toBe('Dock: 4/4 (all marks)');
  });
  it('partial with synced', () => {
    expect(sectionLine(view({ marks: UNDETECTED, synced: 1 }))).toBe('Dock: 1/4 (Undetected), synced x1');
  });
  it('none', () => {
    expect(sectionLine(view({ marks: 0 }))).toBe('Dock: 0/4 (no marks)');
  });
});
