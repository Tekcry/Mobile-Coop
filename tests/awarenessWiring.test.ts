import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { CAUTION } from '../src/ai/awareness';
import { ALERT, AlertMachine, emptyAlertInput, SENSITIVITY } from '../src/ai/alertState';
import { PatrolWalker, PATROL } from '../src/ai/patrol';
import { PACE } from '../src/ai/enemy';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S4) Awareness and caution wired into EnemyManager (design 4, M1, M3, A2-A4), on stand-in guards: a body
// found dead holds the finder, his voice hearers and (once his report gets through) the section cautious until every
// one of them is eliminated; a knockout found is woken and the two search, then stay cautious, then calm; a kill seen
// by a calm guard is a body found at once; parked modes keep the old rules.

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  ko: boolean;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: null;
  buff: boolean;
  level: string;
  incident: number;
  caution: number;
  squad: number;
  coverIdx: number;
  roleBound: boolean;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  searchAt: ReturnType<typeof vi.fn>;
  bodySearch: ReturnType<typeof vi.fn>;
  helpSearch: ReturnType<typeof vi.fn>;
  koSearch: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  setCaution: (c: number) => void;
}

let n = 0;
/** A guard at (x, z) facing `yaw` (0 = +z), key `key`. */
function guard(x: number, z: number, key: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9000 + n++;
  const g: FakeGuard = {
    id: `a${num}`,
    num,
    key,
    ko: false,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    buff: false,
    level: 'unaware',
    incident: -1,
    caution: 0,
    squad: -1,
    coverIdx: -1,
    roleBound: false,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    radio: vi.fn(),
    bark: vi.fn(),
    searchAt: vi.fn(),
    // (guard-ai S18) a dead body's search is the body way (`Enemy.bodySearch`): a search round the body all the same
    bodySearch: vi.fn((bx: number, bz: number) => (g.searchAt as unknown as (x: number, z: number, r: null) => void)(bx, bz, null)),
    // (guard-ai S19) sent to a dead body the radio reported: he takes the task, as the real one does
    helpSearch: vi.fn((_x: number, _z: number, inc: number) => {
      g.incident = inc;
    }),
    koSearch: vi.fn(),
    dispose: vi.fn(),
    setCaution(c: number) {
      g.caution = c;
    },
    ...o,
  };
  return g;
}

function body(g: FakeGuard, lethal: boolean): Body {
  return { enemyId: g.id, guardKey: g.key, guard: g, lethal, found: false, present: true, pos: g.pos.clone(), age: 0 } as unknown as Body;
}

const HIT = {} as HitInfo;
const E = (g: FakeGuard) => g as unknown as Enemy;

interface Priv {
  ctx: AiContext;
  radioStep(dt: number): void;
  syncCaution(): void;
  woke(by: Enemy, e: Enemy): void;
  freeKey(): number;
  swapSquad(old: Enemy, e: Enemy): void;
  squads: Map<number, Enemy[]>;
}

/** A manager on a stub world (open floor, light `light` everywhere); `wall(x, z)`: a wall between a guard and that
 *  point. */
function manager(gs: FakeGuard[], light = 1, wall: (x: number, z: number) => boolean = () => false) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { totalAt: () => light },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((a: Vector3, b: Vector3) => !wall(b.x, b.z) && !wall(a.x, a.z));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(E(g));
  const priv = em as unknown as Priv;
  /** Run the 10 Hz radio net for `sec` s. */
  const run = (sec: number): void => {
    for (let k = 0; k < Math.round(sec / 0.1); k++) priv.radioStep(0.1);
  };
  /** The 5 Hz awareness clock for `sec` s (the manager's update ticks it with the board). */
  const tick = (sec: number): void => {
    for (let k = 0; k < Math.round(sec / 0.2); k++) {
      em.awareness.tick(0.2);
      priv.syncCaution();
    }
  };
  /** Guard `g` goes down (`ko`: knocked out), as `Enemy.die` reports it. */
  const down = (g: FakeGuard, ko = false, b: Body | null = null): void => {
    g.alive = false;
    g.ko = ko;
    if (b) em.bodies.push(b);
    priv.ctx.onKilled(E(g), HIT);
  };
  return { em, priv, ctx: priv.ctx, run, tick, down, clear };
}

describe('awareness wired: a body found dead (held caution)', () => {
  it('the finder and his voice hearers are held at once; the section once his report gets through; no alarm (A2)', () => {
    const finder = guard(0, 0, 0);
    const voice = guard(4, 0, 1);
    const far = guard(20, 0, 2);
    const victim = guard(0, 2, 3, { alive: false });
    const { em, ctx, run } = manager([finder, voice, far], 0);
    ctx.bodyFound(E(finder), body(victim, true));
    expect(finder.caution).toBe(2);
    expect(voice.caution).toBe(2);
    expect(far.caution).toBe(0);
    expect(finder.bark).toHaveBeenCalledWith('body');
    expect(finder.searchAt).toHaveBeenCalled();
    // the nearest voice hearer searches with him
    expect(voice.searchAt).toHaveBeenCalled();
    expect(far.searchAt).not.toHaveBeenCalled();
    expect(em.radioLeft(E(finder))).toBeCloseTo(RADIO.callIn, 5);
    run(RADIO.callIn - 0.2);
    expect(far.caution).toBe(0);
    run(RADIO.staggerMax + 0.5);
    expect(far.caution).toBe(2);
    expect(finder.bark).toHaveBeenCalledWith('deadReport');
    // a report, not a contact: nobody goes to combat, no alarm
    for (const g of [voice, far]) expect(g.radio).not.toHaveBeenCalled();
    expect(em.alarmRaised).toBe(false);
    expect(em.awareness.holdCount()).toBe(1);
  });

  it('held until every aware guard is eliminated; time alone never clears it', () => {
    const finder = guard(0, 0, 0);
    const voice = guard(4, 0, 1);
    const far = guard(20, 0, 2);
    const victim = guard(0, 2, 3, { alive: false });
    const { em, ctx, run, tick, down } = manager([finder, voice, far], 0);
    ctx.bodyFound(E(finder), body(victim, true));
    run(RADIO.callIn + RADIO.staggerMax + 0.5);
    tick(3600);
    expect([finder.caution, voice.caution, far.caution]).toEqual([2, 2, 2]);
    down(finder);
    down(voice);
    expect(far.caution).toBe(2);
    down(far);
    expect(em.awareness.holdCount()).toBe(0);
  });

  it('the finder taken out before his report gets through: only he and his voice hearers knew; out with them, calm', () => {
    const finder = guard(0, 0, 0);
    const voice = guard(4, 0, 1);
    const far = guard(20, 0, 2);
    const victim = guard(0, 2, 3, { alive: false });
    const { em, ctx, run, down } = manager([finder, voice, far], 0);
    ctx.bodyFound(E(finder), body(victim, true));
    run(1);
    ctx.radioCut!(E(finder));
    down(finder);
    run(RADIO.callIn + RADIO.staggerMax + 1);
    expect(far.caution).toBe(0);
    expect(voice.caution).toBe(2);
    down(voice, true);
    // A3: knocked out counts as eliminated (until woken)
    expect(em.awareness.holdCount()).toBe(0);
    expect(far.caution).toBe(0);
  });

  it('A3: a knocked-out aware guard woken brings the hold back (he remembers); the waker is only timed', () => {
    const finder = guard(0, 0, 0);
    const waker = guard(30, 0, 1);
    const victim = guard(0, 2, 3, { alive: false });
    const { em, priv, ctx, down } = manager([finder, waker], 0);
    ctx.bodyFound(E(finder), body(victim, true));
    ctx.radioCut!(E(finder));
    const kb = body(finder, false);
    down(finder, true, kb);
    expect(em.awareness.holdCount()).toBe(0);
    // woken: a new Enemy on the same key (`inherit`)
    const back = guard(0, 0, 0);
    em.enemies.push(E(back));
    priv.woke(E(waker), E(back));
    expect(back.caution).toBe(2);
    expect(waker.caution).toBe(1);
    expect(em.awareness.holdCount()).toBe(1);
  });
});

describe('awareness wired: a knockout found (timed caution, M3, A4)', () => {
  it('the finder goes to wake him; nobody is cautious until he is woken', () => {
    const finder = guard(0, 0, 0);
    const other = guard(4, 0, 1);
    const victim = guard(0, 2, 2, { alive: false, ko: true });
    const { em, ctx } = manager([finder, other], 0);
    const b = body(victim, false);
    ctx.bodyFound(E(finder), b);
    expect(finder.bark).toHaveBeenCalledWith('koFound');
    expect(finder.searchAt).toHaveBeenCalledWith(b.pos.x, b.pos.z, b);
    expect(other.searchAt).not.toHaveBeenCalled();
    expect(finder.caution).toBe(0);
    expect(em.radioNet.openCalls).toBe(0);
  });

  it('woken: waker and woken search koSearch s, cautious koCautious s, then calm; one "ko" report, acked, nobody else cautious', () => {
    const waker = guard(0, 0, 0);
    const woken = guard(1, 0, 1);
    const other = guard(6, 0, 2);
    const { em, priv, run, tick } = manager([waker, woken, other], 0);
    priv.woke(E(waker), E(woken));
    expect(waker.koSearch).toHaveBeenCalledWith(woken.pos.x, woken.pos.z);
    expect([waker.caution, woken.caution, other.caution]).toEqual([1, 1, 0]);
    run(RADIO.callIn + RADIO.staggerMax + 0.5);
    expect(waker.bark).toHaveBeenCalledWith('koReport');
    expect(woken.bark).toHaveBeenCalledWith('ack');
    expect(other.caution).toBe(0);
    tick(CAUTION.koSearch - 1);
    expect(em.awareness.isSearching(waker.key) && em.awareness.isSearching(woken.key)).toBe(true);
    tick(2);
    expect(em.awareness.isSearching(waker.key)).toBe(false);
    expect([waker.caution, woken.caution]).toEqual([1, 1]);
    tick(CAUTION.koCautious - 2);
    expect([waker.caution, woken.caution]).toEqual([1, 1]);
    tick(2);
    expect([waker.caution, woken.caution, other.caution]).toEqual([0, 0, 0]);
  });
});

describe('awareness wired: a kill seen (witnessed)', () => {
  it('a calm guard facing it in the light sees the kill: he finds the body at once, held, and radios it', () => {
    const victim = guard(0, 0, 0);
    const witness = guard(0, 8, 1, { yaw: Math.PI });
    const away = guard(0, -8, 2, { yaw: Math.PI });
    const { em, run, down } = manager([victim, witness, away], 1);
    down(victim, false, body(victim, true));
    expect(em.killsWitnessed).toBe(1);
    expect(em.lastWitnesses).toBe(1);
    expect(witness.caution).toBe(2);
    expect(witness.searchAt).toHaveBeenCalled();
    // (the real finder is searching now: never sent anywhere by the board)
    witness.level = 'searching';
    expect(away.caution).toBe(0);
    expect(em.radioLeft(E(witness))).toBeGreaterThan(0);
    run(RADIO.callIn + RADIO.staggerMax + 0.5);
    expect(away.caution).toBe(2);
    // (guard-ai S19, G3) the report got through: the calm guard in range hurries over to help search the body
    expect(away.helpSearch).toHaveBeenCalledTimes(1);
  });

  it('take the witness out before his report gets through: the section stays calm and the hold clears', () => {
    const victim = guard(0, 0, 0);
    const witness = guard(0, 8, 1, { yaw: Math.PI });
    const away = guard(0, -15, 2, { yaw: Math.PI });
    const { em, run, down } = manager([victim, witness, away], 1);
    down(victim, false, body(victim, true));
    run(1);
    down(witness, false, body(witness, true));
    run(RADIO.callIn + RADIO.staggerMax + 1);
    expect(away.caution).toBe(0);
    expect(em.awareness.holdCount()).toBe(0);
  });

  it('every witness is held, the nearest finds it; in the dark, behind a wall or facing away: no witness', () => {
    const victim = guard(0, 0, 0);
    const near = guard(0, 6, 1, { yaw: Math.PI });
    const second = guard(3, 9, 2, { yaw: Math.PI });
    const { em, down } = manager([victim, near, second], 1);
    down(victim, false, body(victim, true));
    expect(em.lastWitnesses).toBe(2);
    expect([near.caution, second.caution]).toEqual([2, 2]);
    expect(near.bark).toHaveBeenCalledWith('body');
    // dark, at 8 m
    const v2 = guard(0, 0, 0);
    const w2 = guard(0, 8, 1, { yaw: Math.PI });
    const m2 = manager([v2, w2], 0);
    m2.down(v2, false, body(v2, true));
    expect(m2.em.killsWitnessed).toBe(0);
    expect(w2.caution).toBe(0);
    // a wall between them
    const v3 = guard(0, 0, 0);
    const w3 = guard(0, 8, 1, { yaw: Math.PI });
    const m3 = manager([v3, w3], 1, (_x, z) => z > 4);
    m3.down(v3, false, body(v3, true));
    expect(m3.em.killsWitnessed).toBe(0);
  });

  it('a knockout seen: the witness goes to wake him (M1), nobody held', () => {
    const victim = guard(0, 0, 0);
    const witness = guard(0, 8, 1, { yaw: Math.PI });
    const { em, down } = manager([victim, witness], 1);
    const b = body(victim, false);
    down(victim, true, b);
    expect(witness.searchAt).toHaveBeenCalledWith(b.pos.x, b.pos.z, b);
    expect(witness.caution).toBe(0);
    expect(em.awareness.holdCount()).toBe(0);
  });

  it('busy guards are no witnesses: in combat, held, passive', () => {
    const victim = guard(0, 0, 0);
    const fighting = guard(0, 8, 1, { yaw: Math.PI, alerted: true });
    const held = guard(1, 8, 2, { yaw: Math.PI, taken: true });
    const passive = guard(-1, 8, 3, { yaw: Math.PI, passive: true });
    const { em, down } = manager([victim, fighting, held, passive], 1);
    down(victim, false, body(victim, true));
    expect(em.killsWitnessed).toBe(0);
  });
});

describe('awareness wired: keys, squads, sections, parked modes', () => {
  it('a new guard takes the lowest key not held by a guard or a knocked-out body (a dead one frees his)', () => {
    const a = guard(0, 0, 0);
    const b = guard(1, 0, 2);
    const { em, priv } = manager([a, b], 0);
    expect(priv.freeKey()).toBe(1);
    em.bodies.push(body(guard(0, 0, 1), false));
    expect(priv.freeKey()).toBe(3);
    em.bodies.length = 0;
    em.bodies.push(body(guard(0, 0, 1), true));
    expect(priv.freeKey()).toBe(1);
  });

  it('a woken guard takes his old self\'s place on the squad roster (radio checks)', () => {
    const old = guard(0, 0, 0, { squad: 4 });
    const mate = guard(2, 0, 1, { squad: 4 });
    const { em, priv } = manager([mate], 0);
    em.joinSquad(E(old), 4);
    em.joinSquad(E(mate), 4);
    const back = guard(0, 0, 0, { squad: 4 });
    priv.swapSquad(E(old), E(back));
    expect(priv.squads.get(4)).toEqual([E(back), E(mate)]);
  });

  it('clear (a Sector unload / restart): every caution and hold goes', () => {
    const finder = guard(0, 0, 0);
    const victim = guard(0, 2, 3, { alive: false });
    const { em, priv, ctx } = manager([finder], 0);
    ctx.bodyFound(E(finder), body(victim, true));
    expect(em.awareness.holdCount()).toBe(1);
    em.awareness.clear();
    priv.syncCaution();
    expect(finder.caution).toBe(0);
    em.clear();
    expect(em.awareness.holdCount()).toBe(0);
    expect(em.lastHold).toBe(-1);
  });

  it('coordinated off (Hunter, Mission): the old rule (the squad within RADIO searches), no caution, no call', () => {
    const finder = guard(0, 0, 0);
    const mate = guard(15, 0, 1);
    const victim = guard(0, 2, 3, { alive: false });
    const witness = guard(0, 8, 2, { yaw: Math.PI });
    const { em, ctx, down } = manager([finder, mate, witness], 1);
    em.coordinated = false;
    ctx.bodyFound(E(finder), body(victim, true));
    expect(mate.searchAt).toHaveBeenCalled();
    expect(finder.caution + mate.caution).toBe(0);
    expect(em.radioNet.openCalls).toBe(0);
    const v2 = guard(0, 0, 4);
    em.enemies.push(E(v2));
    down(v2, false, body(v2, true));
    expect(em.killsWitnessed).toBe(0);
    expect(witness.caution).toBe(0);
  });

  it('deterministic: the same events give the same cautions and report times', () => {
    const mk = () => {
      const finder = guard(0, 0, 0);
      const os = [guard(4, 0, 1), guard(9, 3, 2), guard(-12, 1, 3), guard(2, -18, 4)];
      const victim = guard(0, 2, 5, { alive: false });
      const m = manager([finder, ...os], 0);
      m.ctx.bodyFound(E(finder), body(victim, true));
      const at = os.map(() => -1);
      for (let k = 0; k < 80; k++) {
        m.run(0.1);
        os.forEach((g, i) => {
          if (at[i]! < 0 && g.caution === 2) at[i] = k;
        });
      }
      return at;
    };
    expect(mk()).toEqual(mk());
  });
});

describe('cautious behaviour (the knobs)', () => {
  const run = (m: AlertMachine, sec: number, cautious: boolean): void => {
    const i = emptyAlertInput();
    for (let t = 0; t < sec; t += 0.1) {
      i.cautious = cautious;
      m.step(0.1, i);
    }
  };

  it('cautious: calm he goes on edge (cooldown: sight x CAUTION.sens) and stays there; cleared, he goes back to normal', () => {
    expect(SENSITIVITY.cooldown).toBe(CAUTION.sens);
    const m = new AlertMachine();
    run(m, 0.2, true);
    expect(m.level).toBe('cooldown');
    run(m, ALERT.cooldownTime * 4, true);
    expect(m.level).toBe('cooldown');
    run(m, 0.2, false);
    expect(m.level).toBe('unaware');
    // a guard who has fought keeps his cooldown either way
    const f = new AlertMachine();
    f.fought = true;
    run(f, 0.2, true);
    run(f, ALERT.cooldownTime * 2, false);
    expect(f.level).toBe('cooldown');
  });

  it('cautious pauses: route waits and post glances x CAUTION.waitMul; a timed loop keeps its schedule', () => {
    const route = { points: [[0, 0], [10, 0]] as [number, number][], wait: 5 };
    const w = new PatrolWalker(route, 0, 0, 0);
    w.waitMul = CAUTION.waitMul;
    w.step(0.1, 0, 0);
    expect(w.waiting).toBeCloseTo(5 * CAUTION.waitMul, 5);
    const plain = new PatrolWalker({ points: [[0, 0], [10, 0]], wait: 5 }, 0, 0, 0);
    plain.step(0.1, 0, 0);
    expect(plain.waiting).toBeCloseTo(5, 5);
    const loop = { points: [[0, 0], [10, 0]] as [number, number][], loop: { period: 20, leave: [4, 14], t0: 0 } };
    const a = new PatrolWalker(loop, 0, 0, 0);
    const b = new PatrolWalker(loop, 0, 0, 0);
    b.waitMul = CAUTION.waitMul;
    a.step(0.1, 0, 0);
    b.step(0.1, 0, 0);
    expect(b.waiting).toBeCloseTo(a.waiting, 5);
    expect(PATROL.wait * CAUTION.waitMul).toBeLessThan(PATROL.wait);
  });

  it('the cautious patrol pace sits between the investigate pace and the patrol pace (A9)', () => {
    expect(PACE.cautious).toBeLessThan(PACE.patrol);
    expect(PACE.cautious).toBeGreaterThan(PACE.investigate);
  });
});
