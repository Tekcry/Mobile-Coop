import { describe, expect, it } from 'vitest';
import { ARCHETYPE, DIFFICULTY, fromFront, glint, grabRule, heavyMult, parseDifficulty, radioCheck, shieldBlocks, smellRate, sniperRelocate } from '../src/ai/archetypes';
import { BARK, BarkVoice, BARKS } from '../src/ai/barks';
import { ENEMIES, ENEMY_KINDS, emptyKinds } from '../src/ai/enemyDefs';
import { waveComposition } from '../src/game/modes/waveLogic';
import { mulberry } from '../src/core/rng';

// a character facing +z (yaw 0); a shot from in front travels along -z
const FRONT = { x: 0, z: -1 };
const BACK = { x: 0, z: 1 };

describe('heavy', () => {
  it('plates in front, an exposed back, a weak face plate', () => {
    expect(fromFront(0, FRONT.x, FRONT.z, ARCHETYPE.heavy.frontHalf)).toBe(true);
    expect(fromFront(0, BACK.x, BACK.z, ARCHETYPE.heavy.frontHalf)).toBe(false);
    expect(heavyMult(0, FRONT.x, FRONT.z, 'body')).toBeLessThan(heavyMult(0, BACK.x, BACK.z, 'body'));
    expect(heavyMult(0, FRONT.x, FRONT.z, 'head')).toBeGreaterThan(heavyMult(0, BACK.x, BACK.z, 'head'));
    expect(heavyMult(0, FRONT.x, FRONT.z, 'head')).toBeGreaterThan(2);
  });
  it('is immune to frontal non-lethal grabs; from behind anything goes', () => {
    expect(grabRule('heavy', 'front')).toBe('lethal');
    expect(grabRule('heavy', 'overCover')).toBe('lethal');
    expect(grabRule('heavy', 'behind')).toBe('ok');
    expect(grabRule('heavy', 'above')).toBe('ok');
    expect(grabRule('grunt', 'front')).toBe('ok');
  });
});

describe('enforcer', () => {
  it('the shield stops rounds from the front only', () => {
    expect(shieldBlocks(0, FRONT.x, FRONT.z)).toBe(true);
    expect(shieldBlocks(0, BACK.x, BACK.z)).toBe(false);
    // from the side (shot travelling along -x: the shooter is at +x, 90 deg off the facing)
    expect(shieldBlocks(0, -1, 0)).toBe(false);
    expect(grabRule('enforcer', 'front')).toBe('no');
    expect(grabRule('enforcer', 'behind')).toBe('ok');
  });
});

describe('sniper', () => {
  it('relocates after its shots per post or its time there', () => {
    expect(sniperRelocate(0, 100)).toBe(false);
    expect(sniperRelocate(1, 1)).toBe(false);
    expect(sniperRelocate(ARCHETYPE.sniper.shotsPerPost, 0)).toBe(true);
    expect(sniperRelocate(1, ARCHETYPE.sniper.postTime)).toBe(true);
  });
  it('glints only when the scope points at the viewer', () => {
    expect(glint(0, 0, 0, 1.5, 0, 0, 1.5, 30)).toBeCloseTo(1, 5);
    expect(glint(0, 0, 0, 1.5, 0, 30, 1.5, 0)).toBe(0);
    expect(glint(0.1, 0, 0, 1.5, 0, 0, 1.5, 30)).toBeGreaterThan(0);
  });
});

describe('dog', () => {
  it('smells within its radius whatever the light; crouching shrinks it', () => {
    const r = ARCHETYPE.dog.smell;
    expect(smellRate(r + 0.1, false)).toBe(0);
    expect(smellRate(r - 1, false)).toBeGreaterThan(0);
    expect(smellRate(r * ARCHETYPE.dog.crouchMul + 0.1, true)).toBe(0);
    expect(smellRate(1, false)).toBeGreaterThan(smellRate(4, false));
  });
  it('is a quadruped with a bite', () => {
    expect(ENEMIES.dog.quadruped).toBe(true);
    expect(ENEMIES.dog.melee).not.toBeNull();
    expect(ENEMIES.dog.height).toBeLessThan(1);
  });
});

describe('squads and barks', () => {
  it('a radio check finds the silent members', () => {
    const out: string[] = [];
    expect(radioCheck([{ id: 'a', up: true }, { id: 'b', up: false }, { id: 'c', up: false }], out)).toEqual(['b', 'c']);
    expect(radioCheck([{ id: 'a', up: true }], out)).toEqual([]);
  });
  it('a voice waits between lines; urgent lines cut in', () => {
    const v = new BarkVoice(3);
    expect(v.say('suspicious')).not.toBeNull();
    expect(v.say('investigate')).toBeNull();
    expect(v.say('contact')).not.toBeNull();
    v.tick(BARK.cooldown + 0.1);
    expect(BARKS.investigate).toContain(v.say('investigate'));
  });
});

describe('roster and difficulty', () => {
  it('every kind has a def and a tally slot', () => {
    const t = emptyKinds();
    for (const k of ENEMY_KINDS) {
      expect(ENEMIES[k]).toBeDefined();
      expect(t[k]).toBe(0);
    }
  });
  it('tiers scale perception and damage; Perfectionist has no Mark & Execute or sonar', () => {
    expect(DIFFICULTY.rookie.perception).toBeLessThan(DIFFICULTY.normal.perception);
    expect(DIFFICULTY.perfectionist.perception).toBeGreaterThan(DIFFICULTY.realistic.perception);
    expect(DIFFICULTY.realistic.damage).toBeGreaterThan(DIFFICULTY.normal.damage);
    expect(DIFFICULTY.perfectionist.execute).toBe(false);
    expect(DIFFICULTY.perfectionist.sonar).toBe(false);
    expect(DIFFICULTY.normal.execute && DIFFICULTY.normal.sonar).toBe(true);
  });
  it('reads the old difficulty names', () => {
    expect(parseDifficulty('easy')).toBe('rookie');
    expect(parseDifficulty('hard')).toBe('realistic');
    expect(parseDifficulty('perfectionist')).toBe('perfectionist');
    expect(parseDifficulty('???')).toBe('normal');
  });
  it('later waves bring the archetypes in', () => {
    const w8 = waveComposition(8, mulberry(3));
    for (const k of ['enforcer', 'dog', 'sniper', 'officer', 'droneOp'] as const) expect(w8).toContain(k);
    expect(waveComposition(3, mulberry(3))).not.toContain('enforcer');
  });
});
