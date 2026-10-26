import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ambientDb, type NoisySource } from '../src/ai/hearing';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { CONSOLE_GROUP } from '../src/ai/consoleFault';
import { Vector3, type Scene } from '../src/core/babylon';
import { flags } from '../src/core/flags';
import type { Enemy } from '../src/ai/enemy';
import type { BreakerHost } from '../src/ai/breaker';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai-mission-hooks S4, D8, D9, A11, A14) noise zones wired into the manager: behind `flags.noiseZones` the
// noisy sources mask hearing, a power-linked one only while live (a live mask refreshed once per AI tick from the
// switch state), and `ambientAt` reads the guards' own masking for the HUD meter.

// ----- stand-in guards and manager (copied from `tests/hearing.test.ts`; the manager also takes a layout) -----

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  level: string;
  incident: number;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  hear: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  tell: ReturnType<typeof vi.fn>;
  sendTo: ReturnType<typeof vi.fn>;
  ack: ReturnType<typeof vi.fn>;
  checkLight: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9500 + n++;
  return {
    id: `nz${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    level: 'unaware',
    incident: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    hear: vi.fn(),
    hearTurn: vi.fn(),
    hearGunfire: vi.fn(),
    tell: vi.fn(),
    sendTo: vi.fn(),
    ack: vi.fn(),
    checkLight: vi.fn(),
    pairSearch: vi.fn(),
    bark: vi.fn(),
    ...o,
  };
}

/** A manager with stub world / nav (open floor: every path straight, no walls); `layout`: extra layout fields. */
function manager(layout: object = {}): EnemyManager {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [], ...layout },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn(() => true);
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

function cast(em: EnemyManager, gs: FakeGuard[]): void {
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
}

/** The manager's private noise state (S4). */
interface NoiseView {
  noisy: readonly NoisySource[];
  noiseLive: Uint8Array;
  aiTicks: number;
  noiseStep(): void;
  hearsShout(e: Enemy, o: Enemy): number;
}
const view = (em: EnemyManager): NoiseView => em as unknown as NoiseView;
const tick = (em: EnemyManager): void => view(em).noiseStep();

/** A fake breaker host: the circuits in `off` read off. */
function host(off: Set<number>): BreakerHost & { isOff: ReturnType<typeof vi.fn> } {
  return { switchOf: vi.fn(() => false), isOff: vi.fn((g: number) => off.has(g)), reset: vi.fn(() => false) };
}

const GEN: NoisySource = { id: 'gen', x: 20, z: 0, radius: 8, db: 12 };

/** The footstep check of `hearing.test.ts`: a guard 3 m from a 4 m footstep at (x, 0); true: he turned. */
function hearsStep(em: EnemyManager, x: number): boolean {
  const g = guard(x, 3);
  const was = em.enemies.length;
  cast(em, [g]);
  em.hear(new Vector3(x, 0, 0), 4);
  em.enemies.length = was;
  return g.hearTurn.mock.calls.length > 0;
}

let flagWas = false;
beforeEach(() => {
  flagWas = flags.noiseZones;
  flags.noiseZones = true;
});
afterEach(() => {
  flags.noiseZones = flagWas;
});

describe('noise zones in the manager (guard-ai-mission-hooks S4)', () => {
  it('flag off: neither the map data nor setNoisy masks anything; mapNoisy keeps the data', () => {
    flags.noiseZones = false;
    const noisy = [GEN];
    const em = manager({ guardAi: { noisy } });
    expect(em.mapNoisy).toBe(noisy);
    expect(view(em).noisy.length).toBe(0);
    expect(hearsStep(em, 20)).toBe(true);
    expect(em.ambientAt(20, 0, 0)).toBe(0);
    em.setNoisy([GEN]);
    expect(view(em).noisy.length).toBe(0);
    expect(hearsStep(em, 20)).toBe(true);
    expect(em.ambientAt(20, 0, 0)).toBe(0);
  });

  it('flag on, no power link: the masking of today (a 12 dB source deafens a guard 3 m off); isOff never read', () => {
    const em = manager();
    const off = host(new Set());
    em.breakers = off;
    em.setNoisy([GEN]);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
    expect(hearsStep(em, 0)).toBe(true);
    expect(em.ambientAt(20, 0, 0)).toBeCloseTo(12, 6);
    expect(off.isOff).not.toHaveBeenCalled();
  });

  it('no breaker host: a source on circuit 55 is live; an on: off (standby) source is silent', () => {
    const em = manager();
    expect(em.breakers).toBeNull();
    em.setNoisy([{ ...GEN, group: 55 }]);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
    em.setNoisy([{ ...GEN, group: 55, on: 'off' }]);
    tick(em);
    expect(hearsStep(em, 20)).toBe(true);
    expect(em.ambientAt(20, 0, 0)).toBe(0);
  });

  it('the mask follows a circuit toggle on the next AI tick; an on: off source the other way round', () => {
    const em = manager();
    const off = new Set<number>();
    em.breakers = host(off);
    em.setNoisy([{ ...GEN, group: 55 }]);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
    off.add(55);
    expect(hearsStep(em, 20)).toBe(false); // no tick yet: still masked
    tick(em);
    expect(hearsStep(em, 20)).toBe(true);
    off.delete(55);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
    // a standby generator: silent while the circuit is on, masking once it is cut
    em.setNoisy([{ ...GEN, group: 55, on: 'off' }]);
    tick(em);
    expect(hearsStep(em, 20)).toBe(true);
    off.add(55);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
  });

  it('a console group reads through the console faults; an unknown console reads on', () => {
    const em = manager();
    em.breakers = host(new Set());
    em.consoleState('con', 0, 0, 4, true);
    em.setNoisy([{ ...GEN, group: CONSOLE_GROUP }, { id: 'other', x: -20, z: 0, radius: 8, db: 12, group: CONSOLE_GROUP + 7 }]);
    tick(em);
    expect(Array.from(view(em).noiseLive)).toEqual([1, 1]);
    expect(hearsStep(em, 20)).toBe(false);
    em.consoleState('con', 0, 0, 4, false);
    tick(em);
    expect(Array.from(view(em).noiseLive)).toEqual([0, 1]);
    expect(hearsStep(em, 20)).toBe(true);
    expect(hearsStep(em, -20)).toBe(false);
    em.consoleState('con', 0, 0, 4, true);
    tick(em);
    expect(hearsStep(em, 20)).toBe(false);
  });

  it('ambientAt is the listener sum (the same mask) and refreshes itself when no AI tick ran since its last read', () => {
    const em = manager();
    const off = new Set<number>();
    em.breakers = host(off);
    const src: NoisySource[] = [{ ...GEN, group: 55 }];
    em.setNoisy(src);
    tick(em);
    const mask = view(em).noiseLive;
    expect(em.ambientAt(20, 0, 0)).toBeCloseTo(12, 6);
    expect(em.ambientAt(24, 0, 0)).toBeCloseTo(6, 6);
    expect(em.ambientAt(24, 0, 0)).toBe(ambientDb(src, 24, 0, 0, mask));
    expect(em.ambientAt(40, 0, 0)).toBe(0);
    // cut with no AI tick: the first read after a tick uses that tick's mask, the next one refreshes
    tick(em);
    off.add(55);
    expect(em.ambientAt(20, 0, 0)).toBeCloseTo(12, 6);
    expect(em.ambientAt(20, 0, 0)).toBe(0);
    // back on, still no tick: the read refreshes at once (no tick ran since the previous read)
    off.delete(55);
    expect(em.ambientAt(20, 0, 0)).toBeCloseTo(12, 6);
    // the guards read the mask that read left: masked
    expect(hearsStep(em, 20)).toBe(false);
  });

  it('the voice: a guard beside a live 12 dB source does not hear a shout 4 m off; the circuit cut + a tick: he does', () => {
    const em = manager();
    const off = new Set<number>();
    em.breakers = host(off);
    em.setNoisy([{ ...GEN, group: 55 }]);
    tick(em);
    const a = guard(16, 0) as unknown as Enemy;
    const b = guard(20, 0) as unknown as Enemy;
    expect(view(em).hearsShout(a, b)).toBe(-1);
    off.add(55);
    tick(em);
    expect(view(em).hearsShout(a, b)).toBeCloseTo(4, 6);
  });

  it('the mask is a Uint8Array of the list length, kept over ticks and a same-length setNoisy; a longer list gets a new one', () => {
    const em = manager();
    em.breakers = host(new Set());
    em.setNoisy([{ ...GEN, group: 55 }]);
    const m = view(em).noiseLive;
    expect(m).toBeInstanceOf(Uint8Array);
    expect(m.length).toBe(1);
    for (let i = 0; i < 200; i++) tick(em);
    expect(view(em).noiseLive).toBe(m);
    em.setNoisy([{ ...GEN, id: 'g2', group: 56 }]);
    expect(view(em).noiseLive).toBe(m);
    em.setNoisy([GEN, { ...GEN, id: 'g3', x: -20 }]);
    expect(view(em).noiseLive).not.toBe(m);
    expect(view(em).noiseLive.length).toBe(2);
  });

  it('update runs one noise tick per call', () => {
    const em = manager();
    em.setNoisy([{ ...GEN, group: 55 }]);
    const t0 = view(em).aiTicks;
    em.update(1 / 60);
    em.update(1 / 60);
    expect(view(em).aiTicks).toBe(t0 + 2);
  });
});
