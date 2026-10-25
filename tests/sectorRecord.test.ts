import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  SECTOR_RECORD_KEY,
  emptySectorOp,
  loadSectorRecord,
  markCompleted,
  markCompletedIn,
  sanitizeSectorRecord,
  starsFor,
  starsOf,
} from '../src/save/sectorRecord';
import { dbPut } from '../src/save/db';

// (feature/sector-ops M7, A11) difficulty stars per op: a kv record, no SAVE_VERSION bump

describe('sector record', () => {
  it('sanitises junk to a valid record', () => {
    expect(sanitizeSectorRecord(null)).toEqual({ v: 1, ops: {} });
    expect(sanitizeSectorRecord('x')).toEqual({ v: 1, ops: {} });
    expect(sanitizeSectorRecord({ ops: [] })).toEqual({ v: 1, ops: {} });
    const r = sanitizeSectorRecord({
      v: 9,
      ops: {
        warehouseOps: { done: ['perfectionist', 'bogus', 'rookie', 'rookie', 3], best: { rookie: 120, perfectionist: -5, normal: 99, junk: 1 } },
        'bad id!': { done: ['rookie'] },
        other: 'nope',
        empty: {},
      },
    });
    expect(r).toEqual({
      v: 1,
      ops: {
        warehouseOps: { done: ['rookie', 'perfectionist'], best: { rookie: 120 } },
        empty: { done: [], best: {} },
      },
    });
  });

  it('marks presets in DIFFICULTIES order and keeps the best time', () => {
    const e = emptySectorOp();
    markCompletedIn(e, 'realistic', 300);
    markCompletedIn(e, 'rookie', 200);
    markCompletedIn(e, 'realistic', 250);
    markCompletedIn(e, 'realistic', 400);
    markCompletedIn(e, 'bogus' as never, 10);
    expect(e).toEqual({ done: ['rookie', 'realistic'], best: { rookie: 200, realistic: 250 } });
  });

  it('stars in DIFFICULTIES order: the hardest tier cleared fills every easier one (G331)', () => {
    const rec = sanitizeSectorRecord({ ops: { warehouseOps: { done: ['normal', 'perfectionist'] } } });
    expect(starsOf(rec, 'warehouseOps')).toEqual([true, true, true, true]);
    expect(starsOf(sanitizeSectorRecord({ ops: { campusOps: { done: ['realistic'] } } }), 'campusOps')).toEqual([true, true, true, false]);
    expect(starsOf(sanitizeSectorRecord({ ops: { campusOps: { done: ['rookie'] } } }), 'campusOps')).toEqual([true, false, false, false]);
    expect(starsOf(rec, 'unknown')).toEqual([false, false, false, false]);
  });

  it('reads and writes the kv record', async () => {
    expect(await starsFor('warehouseOps')).toEqual([false, false, false, false]);
    await markCompleted('warehouseOps', 'normal', 412.5);
    await markCompleted('warehouseOps', 'rookie', 380);
    await markCompleted('bad id!', 'rookie', 1);
    expect(await starsFor('warehouseOps')).toEqual([true, true, false, false]);
    const rec = await loadSectorRecord();
    expect(Object.keys(rec.ops)).toEqual(['warehouseOps']);
    expect(rec.ops.warehouseOps?.best).toEqual({ rookie: 380, normal: 412.5 });
    // a junk value under the key reads as empty
    await dbPut('kv', SECTOR_RECORD_KEY, { ops: 5 });
    expect(await starsFor('warehouseOps')).toEqual([false, false, false, false]);
  });

  it('a Perfectionist clear alone fills all four stars; the best time stays on Perfectionist only (G331)', async () => {
    await dbPut('kv', SECTOR_RECORD_KEY, { v: 1, ops: {} });
    await markCompleted('campusOps', 'perfectionist', 900);
    expect(await starsFor('campusOps')).toEqual([true, true, true, true]);
    const rec = await loadSectorRecord();
    expect(rec.ops.campusOps).toEqual({ done: ['perfectionist'], best: { perfectionist: 900 } });
  });
});
