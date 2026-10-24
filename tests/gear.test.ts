import { describe, expect, it } from 'vitest';
import { BREAKER, GEAR, GEAR_BY_STAGE, LATE, MISSING, RESPONSE, RESPONSE_N, SHOTS, SWEEP, gearFromTag, gearHit, mergeGear, responseShape, responseTeam, responseTeamSize, stageGear, type GearHit, type GuardGear, type ResponseShapeOverride } from '../src/ai/gear';
import type { EnemyKind } from '../src/ai/enemyDefs';

// (guard-ai S11) stealth over shooting: the gear tables and what gear does to one hit (research items 2, 4, 13).

const none = (): GuardGear => ({ helmet: false, armour: false });
const helmet: GuardGear = { helmet: true, armour: false };
const vest: GuardGear = { helmet: false, armour: true };
const both: GuardGear = { helmet: true, armour: true };
const hit = (): GearHit => ({ mult: -1, knockOff: true, stagger: -1 });

describe('tables', () => {
  it('match the research numbers', () => {
    expect(GEAR).toEqual({ helmetHits: 1, helmetStagger: 0.9, armourStagger: 0.5, staggerCd: 1.5, armourMult: 0 });
    expect(RESPONSE).toEqual({ shieldLead: true, shieldHelmet: true, liveTeam: 3 });
    expect(SWEEP).toEqual({ enabled: true, thin: 8, dwell: 6, gap: 2.5, stall: 5, stallGain: 0.5, stallJump: 2 });
    expect(MISSING).toEqual({ sectionCaution: true, cautious: 180 });
    expect(SHOTS).toEqual({ sectionCall: true, cautious: 120, pair: true });
    expect(BREAKER).toEqual({ reset: true, resetT: 2, repeatT: 60 });
    expect(LATE).toEqual({ enabled: true, range: 12 });
  });
  it('GEAR_BY_STAGE: none, none, armour, armour + helmet', () => {
    expect(GEAR_BY_STAGE).toEqual([none(), none(), vest, both]);
  });
});

describe('gearHit', () => {
  it('head + helmet: no damage, knock-off, helmet stagger, at any stagger age', () => {
    for (const since of [0, 0.5, 1.5, 99]) {
      const o = gearHit('head', 'bullet', false, helmet, since, hit());
      expect(o).toEqual({ mult: 0, knockOff: true, stagger: GEAR.helmetStagger });
    }
    expect(gearHit('head', 'bullet', false, both, 0, hit())).toEqual({ mult: 0, knockOff: true, stagger: 0.9 });
  });
  it('head without a helmet is unchanged (the caller kills as today), also in a vest', () => {
    expect(gearHit('head', 'bullet', false, none(), 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
    expect(gearHit('head', 'bullet', false, vest, 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
  });
  it('body + armour: no damage; stagger only when the cooldown has passed (edge: equal counts)', () => {
    expect(gearHit('body', 'bullet', false, vest, 99, hit())).toEqual({ mult: 0, knockOff: false, stagger: 0.5 });
    expect(gearHit('body', 'bullet', false, vest, GEAR.staggerCd, hit())).toEqual({ mult: 0, knockOff: false, stagger: 0.5 });
    expect(gearHit('body', 'bullet', false, vest, GEAR.staggerCd - 0.001, hit())).toEqual({ mult: 0, knockOff: false, stagger: 0 });
    expect(gearHit('body', 'bullet', false, vest, 0, hit())).toEqual({ mult: 0, knockOff: false, stagger: 0 });
    expect(gearHit('body', 'bullet', false, both, 2, hit())).toEqual({ mult: 0, knockOff: false, stagger: 0.5 });
  });
  it('body without armour is unchanged (a helmet alone does not stop body shots)', () => {
    expect(gearHit('body', 'bullet', false, none(), 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
    expect(gearHit('body', 'bullet', false, helmet, 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
  });
  it('melee, explosions and non-lethal hits are never changed, whatever he wears', () => {
    for (const part of ['head', 'body'] as const) {
      for (const kind of ['melee', 'explosion'] as const) {
        expect(gearHit(part, kind, false, both, 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
      }
      expect(gearHit(part, 'bullet', true, both, 99, hit())).toEqual({ mult: 1, knockOff: false, stagger: 0 });
    }
  });
  it('a second head hit on the same guard kills: the caller drops the helmet, so the gear is bare', () => {
    const g: GuardGear = { helmet: true, armour: true };
    const first = gearHit('head', 'bullet', false, g, 99, hit());
    if (first.knockOff) g.helmet = false;
    expect(first.mult).toBe(0);
    expect(gearHit('head', 'bullet', false, g, 99, hit()).mult).toBe(1);
  });
  it('writes into out and returns it', () => {
    const o = hit();
    expect(gearHit('body', 'bullet', false, vest, 99, o)).toBe(o);
  });
});

describe('stageGear', () => {
  it('maps stages 0..3 to the table', () => {
    expect(stageGear(0, none())).toEqual(none());
    expect(stageGear(1, none())).toEqual(none());
    expect(stageGear(2, none())).toEqual(vest);
    expect(stageGear(3, none())).toEqual(both);
  });
  it('clamps: above the last is the last, NaN and negatives are 0, fractions floor', () => {
    expect(stageGear(9, none())).toEqual(both);
    expect(stageGear(Infinity, none())).toEqual(both);
    expect(stageGear(-1, { ...both })).toEqual(none());
    expect(stageGear(NaN, { ...both })).toEqual(none());
    expect(stageGear(2.9, none())).toEqual(vest);
  });
  it('copies: editing out never changes the table', () => {
    const o = stageGear(3, none());
    o.helmet = false;
    expect(GEAR_BY_STAGE[3]).toEqual(both);
    expect(stageGear(3, o)).toBe(o);
  });
});

describe('gearFromTag / mergeGear', () => {
  it('tags', () => {
    expect(gearFromTag('helmet', { ...both })).toEqual(helmet);
    expect(gearFromTag('armour', { ...both })).toEqual(vest);
    expect(gearFromTag('both', none())).toEqual(both);
    expect(gearFromTag(undefined, { helmet: true, armour: true })).toEqual(none());
  });
  it('merge is the OR of both, into out (which may alias an input)', () => {
    expect(mergeGear(helmet, vest, none())).toEqual(both);
    expect(mergeGear(none(), none(), { ...both })).toEqual(none());
    expect(mergeGear(helmet, helmet, none())).toEqual(helmet);
    const a = { ...vest };
    expect(mergeGear(a, helmet, a)).toBe(a);
    expect(a).toEqual(both);
  });
});

// (coop4 AI5, A175) the response's size and teams by player count (Sector Ops calls it at the alarm).
describe('coop4 AI5: responseShape', () => {
  const shape = (stage: number, perStage: number, players: number, headroom: number, over: ResponseShapeOverride | null = null) => {
    const o = responseShape(stage, perStage, players, headroom, { teams: -1, size: -1 }, over);
    return [o.size, o.teams];
  };
  it('1-2 players: perStage guards in one team, today exactly (no headroom clamp: the cap refuses as before)', () => {
    for (const players of [0, 1, 2]) {
      for (const per of [1, 2, 3, 4, 6]) {
        for (const room of [0, 1, 32]) expect(shape(1, per, players, room)).toEqual([per, 1]);
        expect(shape(0, per, players, 32)).toEqual([per, 0]);
      }
    }
    expect(RESPONSE_N).toEqual({ extraPerPlayer: 1, splitAt: 4 });
  });
  it('3 players: one more, one team; 4 players: two more, two teams of 2 (a shield lead each)', () => {
    expect(shape(1, 2, 3, 32)).toEqual([3, 1]);
    expect(shape(2, 2, 4, 32)).toEqual([4, 2]);
    expect([responseTeamSize(0, 4, 2), responseTeamSize(1, 4, 2)]).toEqual([2, 2]);
    expect([responseTeamSize(0, 5, 2), responseTeamSize(1, 5, 2), responseTeamSize(2, 5, 2)]).toEqual([3, 2, 0]);
    expect(responseTeamSize(0, 3, 1)).toBe(3);
    expect(responseTeamSize(0, 0, 0)).toBe(0);
    const kinds: EnemyKind[] = [];
    expect(responseTeam(2, responseTeamSize(1, 4, 2), kinds)).toBe(2);
    expect(kinds).toEqual(['enforcer', 'grunt']);
    expect(shape(1, 3, 3, 32)).toEqual([4, 2]);
    expect(shape(0, 2, 4, 32)).toEqual([4, 0]);
  });
  it('headroom: the extras stop at the live cap; the base is never cut', () => {
    expect(shape(1, 2, 4, 3)).toEqual([3, 1]);
    expect(shape(1, 2, 4, 2)).toEqual([2, 1]);
    expect(shape(1, 2, 4, 0)).toEqual([2, 1]);
    expect(shape(1, 2, 4, -5)).toEqual([2, 1]);
  });
  it("a section's override: extraPerPlayer, splitAt; undo (0, Infinity) is today", () => {
    expect(shape(1, 2, 4, 32, { extraPerPlayer: 2 })).toEqual([6, 2]);
    expect(shape(1, 2, 4, 32, { splitAt: Infinity })).toEqual([4, 1]);
    expect(shape(1, 2, 3, 32, { splitAt: 3 })).toEqual([3, 2]);
    expect(shape(1, 2, 4, 32, { extraPerPlayer: 0 })).toEqual([2, 1]);
    expect(shape(1, 2, 4, 32, { extraPerPlayer: 0, splitAt: 2 })).toEqual([2, 2]);
    expect(shape(1, 2, 2, 32, { extraPerPlayer: 3, splitAt: 2 })).toEqual([2, 1]);
  });
});
