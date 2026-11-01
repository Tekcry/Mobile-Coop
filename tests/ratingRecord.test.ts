import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { RATING_RECORD_KEY, compareBest, loadRatingRecord, sanitiseRatingRecord, updateRatingRecord } from '../src/save/ratingRecord';
import { dbGet, dbPut } from '../src/save/db';

// (section-rating S5) best rating per section: a kv record, no SAVE_VERSION bump

describe('rating record', () => {
  it('sanitises junk to a valid record', () => {
    expect(sanitiseRatingRecord(null)).toEqual({ v: 1, maps: {} });
    expect(sanitiseRatingRecord('x')).toEqual({ v: 1, maps: {} });
    expect(sanitiseRatingRecord({ maps: [] })).toEqual({ v: 1, maps: {} });
    const r = sanitiseRatingRecord({
      v: 9,
      maps: {
        tallowWharf: { s1: { marks: 255, synced: 3.7 }, s2: { marks: -1, synced: 'x' }, 'bad id!': { marks: 1 }, s3: 'no', s4: { marks: NaN, synced: 1e9 } },
        'bad!': { s1: { marks: 1, synced: 0 } },
        other: 5,
      },
    });
    expect(r).toEqual({
      v: 1,
      maps: { tallowWharf: { s1: { marks: 15, synced: 3 }, s2: { marks: 0, synced: 0 }, s4: { marks: 0, synced: 1e4 } } },
    });
  });

  it('best-of: more marks wins, tie goes to more synced', () => {
    expect(compareBest({ marks: 7, synced: 0 }, { marks: 3, synced: 9 })).toBeGreaterThan(0);
    expect(compareBest({ marks: 1, synced: 0 }, { marks: 2, synced: 0 })).toBe(0);
    expect(compareBest({ marks: 3, synced: 2 }, { marks: 5, synced: 1 })).toBeGreaterThan(0);
    expect(compareBest({ marks: 3, synced: 0 }, { marks: 3, synced: 1 })).toBeLessThan(0);
  });

  it('a literal stored record round trips, and updates keep the best', async () => {
    await dbPut('kv', RATING_RECORD_KEY, { v: 1, maps: { opA: { s1: { marks: 5, synced: 1 } } } });
    expect(await loadRatingRecord()).toEqual({ v: 1, maps: { opA: { s1: { marks: 5, synced: 1 } } } });
    await updateRatingRecord('opA', 's1', 1, 9); // fewer marks: ignored
    await updateRatingRecord('opA', 's1', 5, 2); // tie on marks, more synced: wins
    await updateRatingRecord('opA', 's2', 15, 0); // new section
    await updateRatingRecord('opA', 's2', 1, 0);
    await updateRatingRecord('bad id!', 's1', 15, 0); // dropped
    const rec = await loadRatingRecord();
    expect(rec.maps).toEqual({ opA: { s1: { marks: 5, synced: 2 }, s2: { marks: 15, synced: 0 } } });
    expect(await dbGet('kv', RATING_RECORD_KEY)).toEqual(rec);
  });
});
