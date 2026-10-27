import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_PROGRESS_KEY,
  CAMPAIGN_SAVE_KEY,
  clearCampaignSave,
  emptyCampaignProgress,
  intelDone,
  loadCampaignProgress,
  loadCampaignSave,
  recordFinish,
  recordFinishIn,
  sanitizeCampaignProgress,
  sanitizeCampaignSave,
  writeCampaignSave,
  type CampaignSave,
} from '../src/save/campaignRecord';
import { dbGet, dbPut } from '../src/save/db';
import { SAVE_VERSION } from '../src/save/schema';
import { THREE_GREY_COATS, TWO_KEY_LEDGER } from '../src/world/maps/tallowWharfMissions';

// (campaign-mode CM2, PLAN 3.3, A7 / A8) kv records `campaign:progress` and `campaign:save`: no SAVE_VERSION bump

/** A literal v1 progress record, as written by this version. */
const V1_PROGRESS = {
  v: 1,
  done: {
    prologue: { best: -1, plays: 2, intel: 0, at: 1761500000000 },
    threeGreyCoats: { best: 85, plays: 1, intel: 1, at: 1761550000000 },
  },
};

/** A literal v1 save record, as written by this version. */
const V1_SAVE = {
  v: 1,
  key: 'threeGreyCoats',
  map: 'tallowWharf',
  mission: 'threeGreyCoats',
  difficulty: 'normal',
  section: 2,
  st: [0, 0, 15],
  f: 3,
  revivesUsed: 1,
  breaks: 0,
  alarm: 1,
  tally: { kills: 1, knockouts: 2, alarms: 1, spotted: 3, bodies: 0, optional: 1 },
  time: 512.5,
  at: 1761560000000,
};

const save = (over: Record<string, unknown> = {}): Record<string, unknown> => ({ ...structuredClone(V1_SAVE), ...over });

describe('campaign progress', () => {
  it('a literal v1 record round-trips through the sanitiser unchanged', () => {
    expect(sanitizeCampaignProgress(structuredClone(V1_PROGRESS))).toEqual(V1_PROGRESS);
  });

  it('sanitises junk to empty: garbage, a future v, unknown keys, huge numbers', () => {
    const empty = emptyCampaignProgress();
    for (const raw of [null, undefined, 'x', 5, [], { done: [] }, { v: 1 }, { v: 1, done: 'x' }]) expect(sanitizeCampaignProgress(raw)).toEqual(empty);
    // a future (or missing) version is not read
    expect(sanitizeCampaignProgress({ ...structuredClone(V1_PROGRESS), v: 2 })).toEqual(empty);
    expect(sanitizeCampaignProgress({ done: V1_PROGRESS.done })).toEqual(empty);
    // unknown entry keys and entries with a field out of range are dropped
    const r = sanitizeCampaignProgress({
      v: 1,
      done: {
        bogus: { best: 50, plays: 1, intel: 0, at: 1 },
        prologue: { best: 1e9, plays: 1, intel: 0, at: 1 },
        threeGreyCoats: { best: 70, plays: Number.POSITIVE_INFINITY, intel: 0, at: 1 },
        twoKeyLedger: { best: 70, plays: 1, intel: 1e12, at: 1 },
      },
    });
    expect(r).toEqual(empty);
    expect(sanitizeCampaignProgress({ v: 1, done: { twoKeyLedger: { best: 70.5, plays: 1, intel: 0, at: 1 } } })).toEqual(empty);
    expect(sanitizeCampaignProgress({ v: 1, done: { twoKeyLedger: { best: 70, plays: 1, intel: 0 } } })).toEqual(empty);
  });

  it('recordFinishIn keeps the best, counts the plays and keeps the most intel', () => {
    const rec = emptyCampaignProgress();
    recordFinishIn(rec, 'threeGreyCoats', 70, 1, 100);
    recordFinishIn(rec, 'threeGreyCoats', 90, 0, 200);
    recordFinishIn(rec, 'threeGreyCoats', 60, 1, 300);
    expect(rec.done.threeGreyCoats).toEqual({ best: 90, plays: 3, intel: 1, at: 300 });
    // the prologue has no percent (A6)
    recordFinishIn(rec, 'prologue', -1, 0, 400);
    recordFinishIn(rec, 'prologue', -1, 0, 500);
    expect(rec.done.prologue).toEqual({ best: -1, plays: 2, intel: 0, at: 500 });
    // junk is ignored or clamped
    recordFinishIn(rec, 'bogus', 50, 0, 1);
    recordFinishIn(rec, 'twoKeyLedger', Number.NaN, 0, 1);
    expect(Object.keys(rec.done)).toEqual(['threeGreyCoats', 'prologue']);
    recordFinishIn(rec, 'twoKeyLedger', 140, -2, 1);
    expect(rec.done.twoKeyLedger).toEqual({ best: 100, plays: 1, intel: 0, at: 1 });
  });

  it('intelDone counts the done intel steps by step index', () => {
    // Three Grey Coats: one intel step (tgc-2, index 1)
    expect(THREE_GREY_COATS.steps.filter((s) => s.kind === 'intel')).toHaveLength(1);
    expect(intelDone(THREE_GREY_COATS.steps, 0)).toBe(0);
    expect(intelDone(THREE_GREY_COATS.steps, 0b1)).toBe(0);
    expect(intelDone(THREE_GREY_COATS.steps, 0b10)).toBe(1);
    expect(intelDone(THREE_GREY_COATS.steps, -1 >>> 0)).toBe(1);
    // Two-Key Ledger: tkl-1 (index 0)
    expect(intelDone(TWO_KEY_LEDGER.steps, 0b1)).toBe(1);
    expect(intelDone(TWO_KEY_LEDGER.steps, 0b110)).toBe(0);
  });

  it('recordFinish reads, folds and writes the kv record', async () => {
    expect(await loadCampaignProgress()).toEqual(emptyCampaignProgress());
    await Promise.all([recordFinish('threeGreyCoats', 80, 1), recordFinish('threeGreyCoats', 95, 0), recordFinish('bogus', 50, 0)]);
    const rec = await loadCampaignProgress();
    expect(Object.keys(rec.done)).toEqual(['threeGreyCoats']);
    expect(rec.done.threeGreyCoats).toMatchObject({ best: 95, plays: 2, intel: 1 });
    // a literal v1 record under the key reads as itself; a junk one as empty
    await dbPut('kv', CAMPAIGN_PROGRESS_KEY, structuredClone(V1_PROGRESS));
    expect(await loadCampaignProgress()).toEqual(V1_PROGRESS);
    await dbPut('kv', CAMPAIGN_PROGRESS_KEY, { v: 9, done: 5 });
    expect(await loadCampaignProgress()).toEqual(emptyCampaignProgress());
  });
});

describe('campaign save', () => {
  it('a literal v1 record round-trips through the sanitiser unchanged', () => {
    expect(sanitizeCampaignSave(save())).toEqual(V1_SAVE);
  });

  it('sanitises junk to no save', () => {
    for (const raw of [null, 'x', 3, [], {}, { v: 1 }]) expect(sanitizeCampaignSave(raw)).toBeNull();
    const bad: Record<string, unknown>[] = [
      { v: 2 },
      { v: undefined },
      // not a sector entry, or a map / mission that is not the entry's
      { key: 'prologue', map: 'ctcourse', mission: '' },
      { key: 'bogus' },
      { map: 'warehouseOps' },
      { mission: 'twoKeyLedger' },
      { difficulty: 'godlike' },
      // huge or broken numbers
      { section: 1e9 },
      { section: -1 },
      { section: 1.5 },
      { f: 2 ** 31 },
      { st: [0, 0] },
      { st: [0, 0, -1] },
      { st: [0, 0, 'x'] },
      { st: 'nope' },
      { revivesUsed: 3 },
      { breaks: Number.NaN },
      { alarm: 4 },
      { time: Number.POSITIVE_INFINITY },
      { at: -5 },
      { tally: { kills: 1, knockouts: 0, alarms: 0, spotted: 0, bodies: 0 } },
      { tally: { kills: 1e9, knockouts: 0, alarms: 0, spotted: 0, bodies: 0, optional: 0 } },
      { tally: null },
    ];
    for (const over of bad) expect(sanitizeCampaignSave(save(over)), JSON.stringify(over)).toBeNull();
    // unknown extra fields are dropped, not kept
    expect(sanitizeCampaignSave(save({ junk: 1 }))).toEqual(V1_SAVE);
  });

  it('writes, loads and clears the save slot', async () => {
    expect(await loadCampaignSave()).toBeNull();
    const s = save({ key: 'twoKeyLedger', mission: 'twoKeyLedger', section: 0, difficulty: 'perfectionist' }) as unknown as CampaignSave;
    expect(await writeCampaignSave(s)).toBe(true);
    expect(await loadCampaignSave()).toEqual(s);
    // one slot: a new write replaces it
    expect(await writeCampaignSave(save() as unknown as CampaignSave)).toBe(true);
    expect(await loadCampaignSave()).toEqual(V1_SAVE);
    // a record that would read back as no save is not written
    expect(await writeCampaignSave(save({ section: -3 }) as unknown as CampaignSave)).toBe(false);
    expect(await loadCampaignSave()).toEqual(V1_SAVE);
    await clearCampaignSave();
    expect(await loadCampaignSave()).toBeNull();
    expect(await dbGet('kv', CAMPAIGN_SAVE_KEY)).toBeUndefined();
    // clearing an empty slot is fine
    await clearCampaignSave();
  });

  it('a literal v1 record stored under the key loads as itself; junk loads as none', async () => {
    await dbPut('kv', CAMPAIGN_SAVE_KEY, save());
    expect(await loadCampaignSave()).toEqual(V1_SAVE);
    await dbPut('kv', CAMPAIGN_SAVE_KEY, { v: 1, key: 'threeGreyCoats' });
    expect(await loadCampaignSave()).toBeNull();
    await clearCampaignSave();
  });

  it('no SAVE_VERSION bump: the records are kv keys, not the profile (A8)', () => {
    expect(SAVE_VERSION).toBe(10);
  });
});
