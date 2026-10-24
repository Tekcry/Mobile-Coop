import { describe, expect, it, vi } from 'vitest';
import { emptyMoveState, type MoveState } from '../src/player/moveState';
import { GameState } from '../src/game/gameState';

// (coop4 pol, net-batch P5) `localRef.mv` is built on its first read in a fixed step (host and solo), not every step for
// nobody (single player and course hosts read it nowhere until Guard AI does). A co-op client's is null.

const built = vi.hoisted(() => ({ n: 0 }));
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => undefined }));
vi.mock('../src/game/localMoveState', () => ({
  localMoveState: (_g: unknown, out: MoveState) => {
    built.n++;
    out.m = 'wall';
    return out;
  },
}));

/** The GameState fields `localMvRead` and the fixed step's marker use (constructor not run). */
function game(puppet: boolean) {
  const g = Object.create(GameState.prototype) as GameState;
  Object.assign(g, { puppet, localMv: emptyMoveState(), localMvStale: false, localMvSet: false });
  const ref = { id: 'local', mv: null as MoveState | null };
  Object.defineProperty(ref, 'mv', { get: () => (g as unknown as { localMvRead(): MoveState | null }).localMvRead(), enumerable: true });
  const step = () => Object.assign(g, { localMvStale: !puppet });
  return { ref, step };
}

describe('localRef.mv: built on demand, once per fixed step', () => {
  it('no read, no build; the first read in a step builds it, later reads in the step reuse it', () => {
    built.n = 0;
    const { ref, step } = game(false);
    expect(ref.mv).toBeNull();
    for (let i = 0; i < 100; i++) step();
    expect(built.n).toBe(0);
    const a = ref.mv;
    expect(a?.m).toBe('wall');
    expect(ref.mv).toBe(a);
    expect(built.n).toBe(1);
    step();
    expect(ref.mv).toBe(a);
    expect(built.n).toBe(2);
  });

  it('a co-op client (puppet): always null, never built', () => {
    built.n = 0;
    const { ref, step } = game(true);
    step();
    expect(ref.mv).toBeNull();
    expect(built.n).toBe(0);
  });
});
