import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_KINDS } from '../src/ai/enemyDefs';

// (guard-ai runner-armed, G298) Every human guard is armed: "why would there be melee only guards they should all have
// weapons" (G295). A melee block makes a kind a melee kind at every `def.melee` read (never the alarm runner, never
// sent by the incident board, never holsters), so a human kind carries a weapon block, a gun model and no melee block.
// Only the dog bites.

describe('(guard-ai runner-armed) every human guard is armed (G298)', () => {
  it('every human kind carries a gun (G298)', () => {
    for (const k of ENEMY_KINDS) {
      const def = ENEMIES[k];
      if (def.quadruped) continue;
      expect(def.weapon, `${k}: a weapon block`).toBeTruthy();
      expect(def.gun, `${k}: a gun model`).not.toBeNull();
      // a melee block would make him a melee kind at every `def.melee` read
      expect(def.melee, `${k}: no melee block`).toBeNull();
    }
  });

  it('only the dog is melee', () => {
    expect(ENEMY_KINDS.filter((k) => ENEMIES[k].quadruped)).toEqual(['dog']);
    expect(ENEMIES.dog.melee).not.toBeNull();
    expect(ENEMIES.dog.weapon).toBeNull();
  });

  it('the runner: the grunt\'s weapon block, the rifle, a 4-18 m band, no cover, still light and fast', () => {
    const r = ENEMIES.runner;
    expect(r.weapon).toEqual(ENEMIES.grunt.weapon);
    expect(r.gun).toBe('rifle');
    expect(r.engageMin).toBe(4);
    expect(r.engageMax).toBe(18);
    expect(r.usesCover).toBe(false);
    expect(r.hp).toBe(55);
    expect(r.runSpeed).toBeGreaterThan(ENEMIES.grunt.runSpeed);
  });
});
