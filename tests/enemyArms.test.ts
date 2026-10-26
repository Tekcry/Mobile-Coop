/**
 * (J19 S4, R16, G298) Every human guard kind carries a weapon block; every placed or spawned kind is armed or a dog.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES, ENEMY_KINDS } from '../src/ai/enemyDefs';

/** The kinds that walk on two legs and carry no weapon block. */
function unarmedHumans(defs: Record<string, { quadruped: boolean; weapon: unknown }>): string[] {
  return Object.keys(defs).filter((k) => !defs[k]!.quadruped && !defs[k]!.weapon);
}

/** A kind is fit to place: a dog, or a human with a weapon block. */
const fit = (kind: string): boolean => {
  const d = ENEMIES[kind as keyof typeof ENEMIES];
  return !!d && (d.quadruped || !!d.weapon);
};

describe('every guard armed (J19 S4, R16)', () => {
  it('(a) no human kind is unarmed; the check has teeth (an unarmed runner is caught)', () => {
    expect(unarmedHumans(ENEMIES)).toEqual([]);
    const copy = { ...ENEMIES, runner: { ...ENEMIES.runner, weapon: null } };
    expect(unarmedHumans(copy)).toEqual(['runner']);
  });

  it("(b) the runner carries the grunt's weapon block, keeps his melee (BRIEF A7) and has no gun model", () => {
    expect(ENEMIES.runner.weapon).toEqual(ENEMIES.grunt.weapon);
    expect(ENEMIES.runner.melee).not.toBeNull();
    expect(ENEMIES.runner.gun).toBeNull();
  });

  it('(c) every map: every squad slot is a dog or an armed human (the warehouse places a runner)', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    let warehouseRunner = false;
    for (const map of MAPS) {
      const lay = map.build(new LevelBuilder(), 1);
      for (const slot of (lay.rooms ?? []).flatMap((r) => r.squad ?? [])) {
        expect(fit(slot.kind), `${map.id} ${slot.kind}`).toBe(true);
        if (map.id === 'warehouse' && slot.kind === 'runner') warehouseRunner = true;
      }
    }
    expect(warehouseRunner).toBe(true);
  });

  it('(d) every enemy kind quoted in a mode file is a dog or armed (missionMode spawns the runner)', () => {
    const dir = new URL('../src/game/modes/', import.meta.url);
    const re = new RegExp(`'(${ENEMY_KINDS.join('|')})'`, 'g');
    const found: { file: string; kind: string }[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(new URL(file, dir), 'utf8');
      for (const m of src.matchAll(re)) found.push({ file, kind: m[1]! });
    }
    for (const { file, kind } of found) expect(fit(kind), `${file} ${kind}`).toBe(true);
    expect(found.some((f) => f.file === 'missionMode.ts' && f.kind === 'runner')).toBe(true);
  });
});
