import { describe, expect, it } from 'vitest';
import { putRating } from '../src/game/rating/sectionRating';
import { ratingViewFromWire, ratingViewsFromRh } from '../src/net/validate';
import { packRated } from '../src/game/course/courseWire';
import type { SectorRatingWire } from '../src/game/sectors';
import type { RatingView } from '../src/ui/hud/ratingCard';

/** (marlow-polish P2-1) One results line per section, by construction: `putRating` and the rejoin's first message. */

const nil = { gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 };
const view = (id: string, marks: number, synced = 0, gadget = 0): RatingView => ({ sectionId: id, title: id.toUpperCase(), marks, synced, grant: { ...nil, gadget } });

const defs = [
  { id: 's0', name: 'S0' },
  { id: 's1', name: 'S1' },
  { id: 's2', name: 'S2' },
];
// s0 and s1 rated on `rh`; `rt` carries s1 (the last rating)
const rh = packRated([7, 15, -1], [0, 1, 0]);
const rt: SectorRatingWire = { sec: 1, marks: 15, synced: 1, gadget: 2, syringe: 1, medkit: 0, alarmStep: 0 };

/** The client's first-message sequence (`coopClient.onSector`, `courseMode.mirrorRating`): `rh` history, then `rt`. */
function firstMessage(list: RatingView[], put: (l: RatingView[], v: RatingView) => void): void {
  for (const v of ratingViewsFromRh(rh, rt.sec, defs)) put(list, v);
  const v = ratingViewFromWire(rt, defs);
  if (v) put(list, v);
}
const push = (l: RatingView[], v: RatingView): void => {
  l.push(v);
};

describe('putRating', () => {
  it('appends new ids in order', () => {
    const list: RatingView[] = [];
    putRating(list, view('a', 1));
    putRating(list, view('b', 2));
    putRating(list, view('c', 3));
    expect(list.map((r) => r.sectionId)).toEqual(['a', 'b', 'c']);
  });

  it('a repeated id replaces the entry in place: same length, same index, the new marks / synced / grant', () => {
    const list: RatingView[] = [view('a', 1), view('b', 2), view('c', 3)];
    const next = view('b', 15, 2, 3);
    putRating(list, next);
    expect(list.length).toBe(3);
    expect(list.map((r) => r.sectionId)).toEqual(['a', 'b', 'c']);
    expect(list[1]).toBe(next);
    expect(list[1]).toMatchObject({ marks: 15, synced: 2, grant: { gadget: 3 } });
  });
});

describe('a rejoin without a reload', () => {
  it('the first-message sequence applied twice gives the one-pass list: [s0, s1], index order', () => {
    const once: RatingView[] = [];
    firstMessage(once, putRating);
    expect(once.map((r) => r.sectionId)).toEqual(['s0', 's1']);
    expect(once[0]).toEqual({ sectionId: 's0', title: 'S0', marks: 7, synced: 0, grant: nil });
    expect(once[1]).toMatchObject({ sectionId: 's1', marks: 15, synced: 1, grant: { gadget: 2, syringe: 1 } });

    const twice: RatingView[] = [];
    firstMessage(twice, putRating);
    firstMessage(twice, putRating);
    expect(twice).toEqual(once);
  });

  it('teeth: the same sequence twice with a plain push gives 4 lines', () => {
    const list: RatingView[] = [];
    firstMessage(list, push);
    firstMessage(list, push);
    expect(list.map((r) => r.sectionId)).toEqual(['s0', 's1', 's0', 's1']);
  });
});
