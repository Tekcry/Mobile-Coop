import { describe, expect, it, vi } from 'vitest';

// gameState pulls in the settings screen, which imports the PWA plugin's virtual module (absent under vitest)
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => undefined }));
import { GameState } from '../src/game/gameState';
import type { PlayerRef } from '../src/ai/enemy';

/** A ref as `playerRefsInto` reads it (id, slot, alive). */
function ref(id: string, slot: number, alive = true): PlayerRef {
  return { id, slot, target: { alive } } as unknown as PlayerRef;
}

/** The real `GameState.playerRefsInto` on a stub game: the local ref plus `remotes`, `outIds` the OUT set. */
function game(local: PlayerRef, remotes: PlayerRef[]) {
  const g = {
    localRef: local,
    player: { controller: { speed: 0, crouched: false } },
    outIds: new Set<string>(),
    remotePlayers: () => remotes,
  };
  const into = (out: PlayerRef[]) => GameState.prototype.playerRefsInto.call(g as unknown as GameState, out);
  return { g, into };
}

describe('GameState.playerRefsInto (F27: refilled in place)', () => {
  it('fills the same array in slot order, and trims it when a player leaves the list', () => {
    const remotes = [ref('c', 2), ref('b', 1)];
    const { g, into } = game(ref('local', 0), remotes);
    const out: PlayerRef[] = [];
    expect(into(out)).toBe(out);
    expect(out.map((r) => r.id)).toEqual(['local', 'b', 'c']);
    expect(into(out).map((r) => r.id)).toEqual(['local', 'b', 'c']);
    // an OUT player (down, in outIds) leaves the list; the array shrinks with no stale tail
    (remotes[0]!.target as { alive: boolean }).alive = false;
    g.outIds.add('c');
    expect(into(out).map((r) => r.id)).toEqual(['local', 'b']);
    expect(out.length).toBe(2);
    remotes.length = 0;
    expect(into(out).map((r) => r.id)).toEqual(['local']);
  });
});
