import { describe, expect, it } from 'vitest';
import { BREAKER, GEAR, GEAR_BY_STAGE, LATE, MISSING, RESPONSE, SHOTS, SWEEP, gearFromTag, gearHit, mergeGear, stageGear, type GearHit, type GuardGear } from '../src/ai/gear';

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
