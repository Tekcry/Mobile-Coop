// (guard-rules S2, G348) Dogs get no takedown of any kind: the controller's candidate scan skips a quadruped in every
// attacker state (the co-op team takedown too), so wherever a guard is offered a takedown a dog in his place is not; and
// the host refuses a client's td 'start' on a dog.
import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { AttackerState } from '../src/game/takedown';
import { HANG_HEAD } from '../src/game/teamMoves';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import type { GameState } from '../src/game/gameState';
import { CoopHost } from '../src/net/coopHost';
import { newRewound } from '../src/net/shotHistory';
import type { NetEvent } from '../src/net/protocol';

const DT = 1 / 60;
const GUARD = { quadruped: false, kind: 'grunt' } as unknown as TakedownVictim['def'];
const DOG = { quadruped: true, kind: 'dog' } as unknown as TakedownVictim['def'];

function victim(): TakedownVictim {
  return {
    id: 'e1',
    pos: new Vector3(0, 0, 0),
    yaw: 0,
    alive: true,
    def: GUARD,
    alerted: false,
    level: 'unaware' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown() {},
    holdAt() {},
    releaseTakedown() {},
    setSolid() {},
    holdAsHostage() {},
    holdPose() {},
    applyDamage() {
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {},
  };
}

/** A player at the origin in `state` (the traversal / back-to-wall / window / hang-down inputs `attackerState` reads). */
function stage(state: AttackerState, v: TakedownVictim, partnerHolds = false): TakedownController {
  const pos = new Vector3(0, state === 'hangDown' ? HANG_HEAD : 0, 0);
  const controller = { pos, override: null, speedCap: Infinity, gear: 2, crouched: false, yaw: 0, speed: 0, grounded: true, standUp() {} };
  const attachKind: Partial<Record<AttackerState, string>> = { hang: 'ledge', pipe: 'pipeH', inverted: 'pipeH', split: 'split', rappel: 'rappel', zipline: 'zipline', duct: 'duct', climb: 'ledge' };
  const k = attachKind[state];
  const traversal = {
    attached: k !== undefined,
    attachCtl: { m: { phase: state === 'climb' ? 'up' : 'on', kind: k ?? 'ledge' }, pipe: { mode: state === 'inverted' ? 'inverted' : 'hands', busy: false } },
    hintWindow: state === 'window' ? { yaw: 0 } : null,
  };
  const wall = state === 'wall' || state === 'wallLow';
  const g = {
    player: { alive: true, pose: { melee: -1, traverse: 'none', traverseT: 0 }, controller, position: pos, rig: { reachL: { w: 0 }, reachR: { w: 0 } } },
    events: { emit() {} },
    target: { health: { hp: 100 } },
    traversal,
    strike: { active: false },
    team: { hangActs: state === 'hangDown', hangingDown: state === 'hangDown' },
    weapons: { drawPhase: 0 },
    enemyMgr: null,
    stealth: null,
    // back to a wall facing -Z (the face normal +Z, towards the attacker); no edge
    wallCore: wall ? { phase: 'on', low: state === 'wallLow', seg: 0, edge: 0 } : null,
    world: { level: { coverSegments: [{ nx: 0, nz: 1, ax: -5, az: 0, bx: 5, bz: 0, tx: 1, tz: 0 }] } },
    spottedLocal: false,
    net: partnerHolds ? { partnerHolds: () => true, assistTakedown() {} } : undefined,
    ballistics: { ray: () => ({ hit: false, distance: 0 }), hitDistance: () => Infinity },
    hud: { feedItem() {}, barks: { say() {} } },
    takedownVictims: () => [v],
  } as unknown as GameState;
  return new TakedownController(g);
}

const STATES: AttackerState[] = ['ground', 'wall', 'wallLow', 'window', 'hang', 'climb', 'pipe', 'inverted', 'split', 'rappel', 'zipline', 'duct', 'hangDown'];
const XZ = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
const YS = [-4, -2.5, -1.5, 0, 1.5, 2.5];
const YAWS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** Every placement round the attacker: how many offered a guard a takedown, and how many offered the dog one. */
function sweep(state: AttackerState, partnerHolds = false): { guard: number; dog: number } {
  const v = victim();
  const td = stage(state, v, partnerHolds);
  let guard = 0;
  let dog = 0;
  for (const y of YS) {
    for (const x of XZ) {
      for (const z of XZ) {
        for (const yaw of YAWS) {
          v.pos.set(x, y, z);
          (v as { yaw: number }).yaw = yaw;
          (v as { def: TakedownVictim['def'] }).def = GUARD;
          td.fixedUpdate(DT, false, false);
          if (td.offer) guard++;
          (v as { def: TakedownVictim['def'] }).def = DOG;
          td.fixedUpdate(DT, false, false);
          if (td.offer) dog++;
        }
      }
    }
  }
  return { guard, dog };
}

describe('guard-rules S2: no takedown on a dog', () => {
  it('in every attacker state a guard is offered somewhere, a dog in the same place never is', () => {
    const offered: string[] = [];
    for (const s of STATES) {
      const r = sweep(s);
      expect(r.dog, `${s}: a dog offered`).toBe(0);
      if (r.guard > 0) offered.push(s);
    }
    // the sweep reaches the takedowns it should (a climb in progress and a duct offer none)
    expect(offered).toEqual(expect.arrayContaining(['ground', 'wall', 'wallLow', 'window', 'hang', 'pipe', 'inverted', 'split', 'hangDown']));
  });

  it("the co-op team takedown: the partner's hostage is on offer, never a dog", () => {
    const r = sweep('ground', true);
    expect(r.guard).toBeGreaterThan(0);
    expect(r.dog).toBe(0);
  });

  it('a dog beside a guard does not hide him (the scan skips the dog, the guard is offered)', () => {
    const v = victim();
    v.pos.set(0, 0, 1.2);
    const d = victim();
    (d as { id: string }).id = 'e2';
    (d as { def: TakedownVictim['def'] }).def = DOG;
    d.pos.set(0, 0, 0.8);
    const td = stage('ground', v);
    (td as unknown as { g: { takedownVictims: () => TakedownVictim[] } }).g.takedownVictims = () => [d, v];
    td.fixedUpdate(DT, false, false);
    expect(td.offer?.e).toBe(v);
    expect(td.offer?.plan.kind).toBe('behind');
  });
});

describe('guard-rules S2: the host refuses a dog takedown', () => {
  const seize = (quadruped: boolean) => {
    const h = Object.create(CoopHost.prototype) as CoopHost;
    const e = { id: 'e1', alive: true, taken: false, level: 'unaware', yaw: 0, pos: new Vector3(0, 0, 0), def: { kind: quadruped ? 'dog' : 'grunt', quadruped }, beginTakedown: vi.fn(), releaseTakedown: vi.fn() };
    const em = { enemies: [e] };
    const queue: NetEvent[] = [];
    Object.assign(h, { g: { enemyMgr: em }, queue, seized: new Map(), interPh: new Map(), tallies: new Map(), time: 0, history: new Map(), rw: newRewound(), s: { selfId: 'H' } });
    const r = { id: 'C', alive: true, feet: new Vector3(0, 0, -1), ref: { spotted: false } };
    (h as unknown as { onTakedown(r: unknown, m: unknown): void }).onTakedown(r, { t: 'td', target: 'e1', ph: 'start', lethal: false });
    return { e, queue, seized: (h as unknown as { seized: Map<string, unknown> }).seized };
  };

  it("a client's td start on a dog is denied and nothing is seized; on a guard it seizes", () => {
    const dog = seize(true);
    expect(dog.e.beginTakedown).not.toHaveBeenCalled();
    expect(dog.seized.size).toBe(0);
    expect(dog.queue).toEqual([{ e: 'tdDenied', player: 'C', enemy: 'e1' }]);
    const guard = seize(false);
    expect(guard.e.beginTakedown).toHaveBeenCalledTimes(1);
    expect(guard.seized.has('e1')).toBe(true);
    expect(guard.queue).toEqual([]);
  });
});
