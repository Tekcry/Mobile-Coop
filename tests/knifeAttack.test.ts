// (knife-attack, Michael's walk 2026-10-27 ~09:15 "pressing attack button holstered in piano map doesnt use knife") With
// the knife switch on, the holstered attack press is the knife kill on the guard on offer (the takedown row's `start`);
// with no guard in reach a short cue and nothing else (no free slash, Michael ~20:05).
import { describe, expect, it, vi } from 'vitest';
// the real GameState module pulls the PWA register (a Vite virtual module): stub it
vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }));
import { GameState } from '../src/game/gameState';

function stub(offer: { lethalOnly: boolean } | null, busy = false, strikeActive = false) {
  const start = vi.fn();
  const feedItem = vi.fn();
  const g = { takedown: { busy, offer, start }, strike: { active: strikeActive }, hud: { feedItem } };
  const run = (aFree = true): void => (GameState.prototype as unknown as { knifeAttack(this: unknown, a: boolean): void }).knifeAttack.call(g, aFree);
  return { start, feedItem, run };
}

describe('knife-attack: the holstered attack press in the knife scene', () => {
  it('a guard on offer: the knife kill starts (as the takedown row), no cue', () => {
    const s = stub({ lethalOnly: false });
    s.run();
    expect(s.start).toHaveBeenCalledWith(false);
    expect(s.feedItem).not.toHaveBeenCalled();
  });

  it('a lethal-only offer starts it lethal', () => {
    const s = stub({ lethalOnly: true });
    s.run();
    expect(s.start).toHaveBeenCalledWith(true);
  });

  it('no guard in reach: the cue only, no start', () => {
    const s = stub(null);
    s.run();
    expect(s.start).not.toHaveBeenCalled();
    expect(s.feedItem).toHaveBeenCalledTimes(1);
    expect(s.feedItem.mock.calls[0]![0]).toMatch(/Knife ready/);
  });

  it('busy (a kill or its tail running) or the menu owning A: nothing starts', () => {
    for (const s of [stub({ lethalOnly: false }, true), stub({ lethalOnly: false }, false, true)]) {
      s.run();
      expect(s.start).not.toHaveBeenCalled();
      expect(s.feedItem).not.toHaveBeenCalled();
    }
    const m = stub({ lethalOnly: false });
    m.run(false);
    expect(m.start).not.toHaveBeenCalled();
  });
});
