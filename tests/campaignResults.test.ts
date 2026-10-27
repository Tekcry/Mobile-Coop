/**
 * (campaign-mode CM5 + CM6, PLAN 3.6 / 6) The campaign mission's autosave, end, records for both players, the prologue
 * record, the `pc` on the wire and the results panel's rows. The real SectorMode on a stub game (node env, the Tallow
 * Wharf sections and missions), `fake-indexeddb` for the kv records.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/save/sectorRecord', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  markCompleted: vi.fn(async () => undefined),
}));

import { flags } from '../src/core/flags';
import { markCompleted } from '../src/save/sectorRecord';
import { dbDelete } from '../src/save/db';
import { CAMPAIGN_PROGRESS_KEY, clearCampaignSave, intelDone, loadCampaignProgress, loadCampaignSave, recordFinish, writeCampaignSave, type CampaignSave } from '../src/save/campaignRecord';
import { PROLOGUE_PCT, prologueFinish, startClearsSave } from '../src/game/mission/campaignOrder';
import { campaignHeadline, campaignResultRows, campaignResultView, continuedLine, optionalDone, parsePct } from '../src/game/mission/campaignRating';
import { packMission, parseMissionWire, rulesKeptCount, type MissionWire } from '../src/game/mission/missionWire';
import { MissionRunner } from '../src/game/mission/missionRunner';
import type { MissionDef } from '../src/game/mission/missionDef';
import { campaignFinishFromWire } from '../src/net/missionMirror';
import { SectorMode } from '../src/game/modes/sectorMode';
import type { GameState, GameOptions } from '../src/game/gameState';
import type { Enemy } from '../src/ai/enemy';
import type { HitInfo } from '../src/game/damage';
import { THREE_GREY_COATS, WHARF_MISSIONS } from '../src/world/maps/tallowWharfMissions';
import { WHARF_SECTORS } from '../src/world/maps/tallowWharfSectors';

const flagSave = { campaign: flags.campaign, missions: flags.missions, mission: flags.mission };
function setFlags(campaign: boolean, missions = true): void {
  flags.campaign = campaign;
  flags.missions = missions;
  flags.mission = null;
}
beforeEach(async () => {
  vi.mocked(markCompleted).mockClear();
  // an earlier test's records still in flight land first (an unknown key is a no-op on the same chain), then both go
  await recordFinish('none', 0, 0);
  await dbDelete('kv', CAMPAIGN_PROGRESS_KEY);
  await clearCampaignSave();
});
afterEach(() => {
  flags.campaign = flagSave.campaign;
  flags.missions = flagSave.missions;
  flags.mission = flagSave.mission;
});

const W = (id: string): number => WHARF_SECTORS.findIndex((s) => s.id === id);
const stepIdx = (def: MissionDef, id: string): number => def.steps.findIndex((s) => s.id === id);
const doneBits = (def: MissionDef, ids: string[]): number => ids.reduce((b, id) => b | (1 << stepIdx(def, id)), 0);
function factBits(def: MissionDef, gives: string[]): number {
  const facts = new MissionRunner(def, 2).facts;
  let f = 0;
  for (const g of gives) f |= 1 << facts.indexOf(g);
  return f;
}

/** Three Grey Coats saved at W3's begin after W1 and W2: a kill and an alarm on the way. */
function tgcSave(over: Partial<CampaignSave> = {}): CampaignSave {
  return {
    v: 1,
    key: 'threeGreyCoats',
    map: 'tallowWharf',
    mission: 'threeGreyCoats',
    difficulty: 'normal',
    section: W('W3'),
    st: [0, 0, doneBits(THREE_GREY_COATS, ['tgc-1', 'tgc-2', 'tgc-3'])],
    f: factBits(THREE_GREY_COATS, ['tgc-courier', 'tgc-chest']),
    revivesUsed: 1,
    breaks: 1,
    alarm: 2,
    tally: { kills: 1, knockouts: 2, alarms: 1, spotted: 3, bodies: 1, optional: 0 },
    time: 300,
    at: 1,
    ...over,
  };
}

interface Stub {
  g: GameState;
  banners: string[][];
}
/** A stub game on Tallow Wharf (no world, no guards): enough for SectorMode's constructor, its tallies, autosave and end. */
function stubGame(opts: Partial<GameOptions> = {}): Stub {
  const banners: string[][] = [];
  const g = {
    world: { map: { id: 'tallowWharf', sectors: WHARF_SECTORS, missions: WHARF_MISSIONS }, layout: {}, doors: { list: [], nearest: () => null } },
    opts: { mode: 'sector', difficulty: 'normal', sectorMission: 'threeGreyCoats', ...opts },
    interactables: { remove: () => undefined, add: () => ({}), setEnabled: () => undefined, items: [] },
    nav: null,
    net: { revivesUsed: () => 1, revivesLeft: () => 1 },
    hud: { banner: (t: string, s: string) => banners.push([t, s]), setObjective: () => undefined, feedItem: () => undefined, barks: { say: () => undefined } },
    events: { emit: () => undefined, on: () => () => undefined },
    stats: { kills: 0, knockouts: 0, score: 0 },
    style: { detections: 0 },
    sectionRatings: [],
    campaignResult: null,
    enemyMgr: null,
    playerRefsInto: (out: unknown[]) => {
      out.length = 0;
      return out;
    },
    slowBeat: () => undefined,
    letterbox: () => undefined,
  } as unknown as GameState;
  return { g, banners };
}

interface ModeInternals {
  autosave(): void;
  freshCounters(): void;
  complete(): void;
  missionWire(m: NonNullable<SectorMode['mission']>): MissionWire;
  practiceFrom: number;
}
const internals = (m: SectorMode): ModeInternals => m as unknown as ModeInternals;
const kill = (m: SectorMode, attackerId: string, ko = false): void =>
  m.onEnemyKilled({ ko, def: { kind: 'grunt' } } as unknown as Enemy, { attackerId, part: 'body' } as unknown as HitInfo);

describe('CM3 check note: the Continue through SectorMode itself (not a stand-in mode)', () => {
  it('the constructor resumes the save: W3, the carried tally, the alarm stage and alarms raised, the breaks', () => {
    setFlags(true);
    const { g } = stubGame({ campaignResume: tgcSave() });
    const m = new SectorMode(g);
    expect(m.campaignKey).toBe('threeGreyCoats');
    expect(m.run.index).toBe(W('W3'));
    expect(m.carried).toEqual({ kills: 1, knockouts: 2, spotted: 3, bodies: 1, time: 300 });
    expect([m.run.alarm, m.run.alarmAtStart, m.run.alarmsRaised]).toEqual([2, 2, 1]);
    expect(m.mission!.tracker.breaks).toBe(1);
    // the tally adds this run's to the carried counts; the alarms are the run's (seeded once, never added again)
    kill(m, 'local');
    expect(m.campaignTally(0)).toMatchObject({ kills: 2, knockouts: 2, alarms: 1, spotted: 3, bodies: 1 });
  });

  it('flag off: no Continue, no campaign key (the mission starts at its own start)', () => {
    setFlags(false);
    const { g } = stubGame({ campaignResume: tgcSave() });
    const m = new SectorMode(g);
    expect(m.carried).toBeNull();
    expect(m.campaignKey).toBeNull();
    expect(m.run.index).toBe(0);
  });
});

describe('CM5: op-wide tallies (PLAN risk 2)', () => {
  it("a section restart between a kill and the end still ends <= 99 (the restart's counters are not the rating's)", () => {
    setFlags(true);
    const { g } = stubGame();
    const m = new SectorMode(g);
    kill(m, 'local');
    // what a section restart does to the counts: the section's counters back to zero, the run's stage back
    internals(m).freshCounters();
    m.run.restartSection();
    expect(m.secStats.kills).toBe(0);
    const v = m.campaignEnd()!;
    expect(v.perfect).toBe(false);
    expect(v.pct).toBeLessThanOrEqual(99);
    expect(v.rows.find((r) => r.key === 'kills')!.value).toBe('1');
  });

  it("the partner's kill counts too (G146 is the team's); knock-outs are not kills", () => {
    setFlags(true);
    const { g } = stubGame();
    const m = new SectorMode(g);
    kill(m, 'p2');
    kill(m, 'local', true);
    expect(m.campaignTally(0)).toMatchObject({ kills: 1, knockouts: 1 });
    const clean = new SectorMode(stubGame().g);
    kill(clean, 'p2', true);
    expect(clean.campaignEnd()).toMatchObject({ pct: 100, perfect: true });
  });
});

describe('CM5: autosave at a section begin (A7)', () => {
  it("writes the run's state, the carried + live tally, the alarm stage and revives used", async () => {
    setFlags(true);
    const { g } = stubGame({ campaignResume: tgcSave() });
    const m = new SectorMode(g);
    kill(m, 'local');
    internals(m).autosave();
    const s = await loadCampaignSave();
    expect(s).toMatchObject({ key: 'threeGreyCoats', map: 'tallowWharf', mission: 'threeGreyCoats', difficulty: 'normal', section: W('W3'), alarm: 2, breaks: 1, revivesUsed: 1 });
    expect(s!.st[2]).toBe(doneBits(THREE_GREY_COATS, ['tgc-1', 'tgc-2', 'tgc-3']));
    expect(s!.f).toBe(factBits(THREE_GREY_COATS, ['tgc-courier', 'tgc-chest']));
    expect(s!.tally).toEqual({ kills: 2, knockouts: 2, alarms: 1, spotted: 3, bodies: 1, optional: 0 });
    expect(s!.time).toBe(300);
  });

  it('never on a practice run, never with the flag off (the co-op client runs no mode)', async () => {
    setFlags(true);
    const p = new SectorMode(stubGame().g);
    internals(p).practiceFrom = 2;
    internals(p).autosave();
    expect(await loadCampaignSave()).toBeNull();
    setFlags(false);
    internals(new SectorMode(stubGame().g)).autosave();
    expect(await loadCampaignSave()).toBeNull();
  });
});

describe('CM5: the end', () => {
  it('a campaign end: no Sector stars, MISSION COMPLETE with the percent, the host record, the save cleared, pc on the last ms', async () => {
    setFlags(true);
    const { g, banners } = stubGame({ campaignResume: tgcSave() });
    const m = new SectorMode(g);
    await writeCampaignSave(tgcSave());
    internals(m).complete();
    expect(markCompleted).not.toHaveBeenCalled();
    expect(m.campaignPct).toBe(75);
    expect(banners.at(-1)).toEqual(['MISSION COMPLETE', '75%']);
    expect(g.campaignResult).toMatchObject({ title: 'Three Grey Coats', pct: 75, perfect: false, continuedFrom: W('W3') + 1 });
    expect(internals(m).missionWire(m.mission!).pc).toBe(75);
    // the save is cleared (after any write still pending) and the host's own record keeps the percent
    expect(await loadCampaignSave()).toBeNull();
    await vi.waitFor(async () => expect((await loadCampaignProgress()).done.threeGreyCoats?.best).toBe(75));
  });

  it('flag off: the Sector Ops end as before (stars, SECTORS CLEAR, no pc)', () => {
    setFlags(false);
    const { g, banners } = stubGame();
    const m = new SectorMode(g);
    internals(m).complete();
    expect(markCompleted).toHaveBeenCalledTimes(1);
    expect(banners.at(-1)![0]).toBe('SECTORS CLEAR');
    expect(m.campaignPct).toBe(-1);
    expect(internals(m).missionWire(m.mission!).pc).toBeUndefined();
    expect(g.campaignResult).toBeNull();
  });

  it('a practice run is not a campaign end (no record, no pc)', () => {
    setFlags(true);
    const m = new SectorMode(stubGame().g);
    internals(m).practiceFrom = 3;
    expect(m.campaignEnd()).toBeNull();
    expect(m.campaignPct).toBe(-1);
  });
});

describe('CM5: pc on the wire (optional, parsed safely)', () => {
  const base = (): MissionWire => packMission(new MissionRunner(THREE_GREY_COATS, 2), { breaks: 0, line: '', kept: () => 0 } as never);
  it('valid: kept; junk: dropped with the rest of the wire kept; absent: no pc (the old behaviour)', () => {
    expect(parseMissionWire({ ...base(), pc: 87 })!.pc).toBe(87);
    expect(parseMissionWire({ ...base(), pc: 0 })!.pc).toBe(0);
    for (const pc of ['87', 101, -1, 3.5, null, Number.NaN, {}]) {
      const w = parseMissionWire({ ...base(), pc });
      expect(w, String(pc)).not.toBeNull();
      expect(w!.pc, String(pc)).toBeUndefined();
      expect(w!.id).toBe('threeGreyCoats');
    }
    const plain = parseMissionWire(base())!;
    expect('pc' in plain).toBe(false);
    expect([parsePct(100), parsePct(100.5), parsePct('1')]).toEqual([100, null, null]);
  });
});

describe('CM5: the client records its own progress from pc (bible 5.8, both players)', () => {
  const wire = (pc: number | undefined, done: string[] = ['tgc-1', 'tgc-2', 'tgc-opt']): MissionWire => ({
    id: 'threeGreyCoats',
    st: [0, 0, doneBits(THREE_GREY_COATS, done)],
    f: 0,
    rb: 0,
    rl: '',
    rk: [1, 0, 0],
    ...(pc === undefined ? {} : { pc }),
  });

  it('a pc: the entry, the percent, the panel (PERFECT only at 100) and the intel; then its own record', async () => {
    const f = campaignFinishFromWire(true, 'tallowWharf', wire(85), THREE_GREY_COATS)!;
    expect(f.key).toBe('threeGreyCoats');
    expect(f.pct).toBe(85);
    expect(f.view).toMatchObject({ title: 'Three Grey Coats', pct: 85, perfect: false });
    expect(f.view.rows).toEqual([
      { key: 'optional', label: 'Optional objectives', value: '1 / 1' },
      { key: 'rules', label: 'Rules kept', value: '1 / 1' },
    ]);
    expect(intelDone(f.steps, f.doneBits)).toBe(1);
    expect(campaignFinishFromWire(true, 'tallowWharf', wire(100), THREE_GREY_COATS)!.view.perfect).toBe(true);
    await recordFinish(f.key, f.pct, intelDone(f.steps, f.doneBits));
    expect((await loadCampaignProgress()).done.threeGreyCoats).toMatchObject({ best: 85, intel: 1 });
  });

  it('nothing to record: no pc, the flag off, another map', () => {
    expect(campaignFinishFromWire(true, 'tallowWharf', wire(undefined), THREE_GREY_COATS)).toBeNull();
    expect(campaignFinishFromWire(false, 'tallowWharf', wire(90), THREE_GREY_COATS)).toBeNull();
    expect(campaignFinishFromWire(true, 'campus', wire(90), THREE_GREY_COATS)).toBeNull();
  });
});

describe('CM5: the prologue records with no percent (A6)', () => {
  it('a co-op course finish on Marlow Yard (or its re-plan) with the flag on; solo, flag off or another map: no', async () => {
    expect(prologueFinish(true, true, 'ctcourse')).toBe(true);
    expect(prologueFinish(true, true, 'ctcourseReplan')).toBe(true);
    expect(prologueFinish(true, false, 'ctcourse')).toBe(false);
    expect(prologueFinish(false, true, 'ctcourse')).toBe(false);
    expect(prologueFinish(true, true, 'tallowWharf')).toBe(false);
    await recordFinish('prologue', PROLOGUE_PCT, 0);
    expect((await loadCampaignProgress()).done.prologue?.best).toBe(-1);
  });
});

describe('CM5: the save cleared on another entry (A7, CM4 check note)', () => {
  it('a host start of a campaign entry that is not a Continue clears it; a Continue or a plain room keeps it', () => {
    expect(startClearsSave('course', 'ctcourse', '', false)).toBe(true);
    expect(startClearsSave('sector', 'tallowWharf', 'twoKeyLedger', false)).toBe(true);
    expect(startClearsSave('sector', 'tallowWharf', 'threeGreyCoats', true)).toBe(false);
    expect(startClearsSave('sector', 'campus', '', false)).toBe(false);
    expect(startClearsSave('clear', 'ctcourse', '', false)).toBe(false);
  });

  it("the slot's clear and the new run's first save land in call order", async () => {
    await writeCampaignSave(tgcSave());
    void clearCampaignSave();
    void writeCampaignSave(tgcSave({ key: 'twoKeyLedger', mission: 'twoKeyLedger', section: W('W2') }));
    expect((await loadCampaignSave())?.key).toBe('twoKeyLedger');
  });
});

describe('CM6: the results panel rows (pure)', () => {
  const tally = { kills: 1, knockouts: 3, alarms: 2, spotted: 4, bodies: 1, optional: 1 };
  it('every category in order; the optional and rules rows as done of total, absent with none', () => {
    const rows = campaignResultRows({ tally, optional: { done: 1, total: 2 }, rules: { kept: 0, total: 1 } });
    expect(rows.map((r) => [r.key, r.label, r.value])).toEqual([
      ['kills', 'Kills', '1'],
      ['knockouts', 'Knock-outs', '3'],
      ['alarms', 'Alarms raised', '2'],
      ['spotted', 'Times spotted', '4'],
      ['bodies', 'Bodies found', '1'],
      ['optional', 'Optional objectives', '1 / 2'],
      ['rules', 'Rules kept', '0 / 1'],
    ]);
    expect(campaignResultRows({ tally, optional: { done: 0, total: 0 }, rules: { kept: 0, total: 0 } }).map((r) => r.key)).toEqual(['kills', 'knockouts', 'alarms', 'spotted', 'bodies']);
    expect(campaignResultRows({ tally: null, optional: { done: 0, total: 1 }, rules: { kept: 1, total: 1 } }).map((r) => r.key)).toEqual(['optional', 'rules']);
  });

  it('the headline (PERFECT at 100) and the Continue line', () => {
    const perfect = campaignResultView('Three Grey Coats', { pct: 100, perfect: true }, []);
    expect(campaignHeadline(perfect)).toBe('100%  PERFECT');
    expect(continuedLine(perfect)).toBeNull();
    const cont = campaignResultView('Two-Key Ledger', { pct: 64, perfect: false }, [], 3);
    expect(campaignHeadline(cont)).toBe('64%');
    expect(continuedLine(cont)).toBe('Continued from section 3: the sections before it have no section rating');
    expect(campaignResultView('x', { pct: 1, perfect: false }, [], 0).continuedFrom).toBeUndefined();
  });

  it('optional steps and rules kept from the bits', () => {
    expect(optionalDone(THREE_GREY_COATS.steps, doneBits(THREE_GREY_COATS, ['tgc-opt']))).toEqual({ done: 1, total: 1 });
    expect(optionalDone(THREE_GREY_COATS.steps, 0)).toEqual({ done: 0, total: 1 });
    expect(rulesKeptCount({ rk: [0b101, 0b10, 0] })).toBe(3);
    expect(rulesKeptCount({ rk: [0, 0, 0] })).toBe(0);
  });
});
