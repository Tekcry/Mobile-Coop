// (knife-kills, owner decision) The scene-only knife attack is gone: the holstered attack press is the palm strike on
// every map (tap the knockout, hold the lethal strike), never a knife kill; the co-op host refuses no strike or throw
// knockout for knife reasons. (Was knife-attack, Michael's walk 2026-10-27 ~09:15, piano scene only.)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (f: string): string => readFileSync(f, 'utf8');

describe('knife-kills: the attack press is the strike again', () => {
  it('GameState passes the holstered attack press to the strike, no knife attack', () => {
    const gs = src('src/game/gameState.ts');
    expect(gs).toContain("this.strike.fixedUpdate(dt, atk, rt === 'hold');");
    expect(gs).not.toMatch(/knifeAttack|Knife ready/);
  });

  it('the co-op host has no knife switch: strikes, throw knockouts and takedown starts are not refused for it', () => {
    const h = src('src/net/coopHost.ts');
    expect(h).not.toMatch(/takedown\.knife\b/);
    // a knife start must be a lethal start
    expect(h).toContain("if (m.ph === 'start' && knife && !m.lethal) {");
  });
});
