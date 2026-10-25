import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoopClient } from '../src/net/coopClient';
import type { GameState } from '../src/game/gameState';
import type { NetSession } from '../src/net/session';
import { Vector3 } from '../src/core/babylon';

// (coop-real F1c) The real CoopClient constructor builds the `g.weapons.onRay` chain: in Course mode the lamp hook
// (`lampRay`) runs first, then the pendant sway hook (only with pendants), then the camera ricochet hook. The heavy
// collaborators are stubbed; the chain itself is the real constructor's.

vi.mock('../src/net/torchMirror', async (orig) => ({
  ...(await orig<object>()),
  TorchMirror: class {
    clear(): void {}
  },
}));
vi.mock('../src/net/clientCarry', async (orig) => ({
  ...(await orig<object>()),
  ClientCarry: class {
    dispose(): void {}
  },
}));
vi.mock('../src/game/course/courseFeed', async (orig) => ({
  ...(await orig<object>()),
  CourseFeed: class {
    dispose(): void {}
  },
}));
vi.mock('../src/game/interactables', async (orig) => ({
  ...(await orig<object>()),
  Interactables: class {
    items: unknown[] = [];
    dispose(): void {}
    remove(): void {}
  },
}));
vi.mock('../src/net/bgTicks', async (orig) => ({
  ...(await orig<object>()),
  keepSimInBackground: () => () => undefined,
}));

type Proto = { placeStart(): void; recolour(): void; lampRay(a: Vector3, b: Vector3): void; swayRay(a: Vector3, b: Vector3): void };
type Ray = (a: Vector3, b: Vector3) => void;

let order: string[] = [];
let lampSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  order = [];
  const p = CoopClient.prototype as unknown as Proto;
  vi.spyOn(p, 'placeStart').mockImplementation(() => undefined);
  vi.spyOn(p, 'recolour').mockImplementation(() => undefined);
  lampSpy = vi.spyOn(p, 'lampRay').mockImplementation(() => void order.push('lamp'));
  vi.spyOn(p, 'swayRay').mockImplementation(() => void order.push('sway'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The plain fake `g` / `s`: only what the constructor and `dispose` read. */
function make(mode: string, sway: { n: number } | null) {
  const g = {
    opts: { mode },
    world: { level: { lights: { sway } }, parts: null },
    ballistics: { hitDistance: () => 1e9, clear: () => true },
    weapons: { onRay: null as Ray | null, markCheckpoint(): void {} },
    events: { on: () => () => undefined },
    explosions: { onLocalBlast: null },
    strike: { authority: true },
    gadgets: { onLocal: null },
    takedownVictims: null,
    bodyStamp: null,
    interactables: null,
    scene: null,
    hud: { setObjective(): void {} },
    ctDev: null as { ricochetRay: Ray } | null,
  };
  const s = { events: { on: () => () => undefined }, toHost: vi.fn(), selfId: 'C', players: new Map() };
  const client = new CoopClient(g as unknown as GameState, s as unknown as NetSession);
  g.ctDev = { ricochetRay: () => void order.push('ricochet') };
  return { g, client };
}

const A = new Vector3(0, 1.6, 4);
const B = new Vector3(0, 3, 0);

describe('coop-real F1c: the Course mode onRay chain (real CoopClient constructor)', () => {
  it('Course mode, no pendants: the lamp hook first, then the ricochet hook', () => {
    const { g } = make('course', null);
    g.weapons.onRay!(A, B);
    expect(order).toEqual(['lamp', 'ricochet']);
    expect(lampSpy).toHaveBeenCalledTimes(1);
    expect(lampSpy).toHaveBeenCalledWith(A, B);
  });

  it('Course mode with pendants: lamp, then sway, then ricochet', () => {
    const { g } = make('course', { n: 2 });
    g.weapons.onRay!(A, B);
    expect(order).toEqual(['lamp', 'sway', 'ricochet']);
  });

  it('Infiltration: no lamp hook (outside Sector Ops and Course mode), sway then ricochet', () => {
    const { g } = make('infiltration', { n: 2 });
    g.weapons.onRay!(A, B);
    expect(order).toEqual(['sway', 'ricochet']);
    expect(lampSpy).not.toHaveBeenCalled();
  });

  it('Course mode: dispose clears the chain', () => {
    const { g, client } = make('course', { n: 2 });
    expect(g.weapons.onRay).not.toBeNull();
    client.dispose();
    expect(g.weapons.onRay).toBeNull();
  });
});
