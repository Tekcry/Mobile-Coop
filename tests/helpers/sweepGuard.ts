/**
 * (guard-ai piano GA6b) A guard on the real `Enemy` class without a scene (no meshes, no rig): the calm patrol
 * (`calmDecide`), the walk (`move`: the motion driver, the steering, the spacing), the level side effects (`onLevel`),
 * the sweep calls, on a flat open nav. As tests/guardSpacing.test.ts and tests/postsWiring.test.ts build theirs.
 * Used by tests/pianoGuards.test.ts and tests/guardAiAllocManager.test.ts.
 */
import { vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { hyp2 } from '../../src/core/mathx';
import { AlertMachine, type AlertLevel } from '../../src/ai/alertState';
import { PostLure } from '../../src/ai/posts';
import { PatrolWalker, type PatrolRoute } from '../../src/ai/patrol';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { Enemy as EnemyClass, type AiContext, type Enemy } from '../../src/ai/enemy';
import { MotionDriver, emptyMotionInput } from '../../src/anim/motion';
import type { P2 } from '../../src/ai/navGrid';

export interface Goal {
  point: P2 | null;
  speed: number;
  face: number | null;
}

/** The real class's members the tests drive (several private: reached as the class runs them). */
export interface SweepGuard {
  calmDecide(dt: number): Goal;
  move(dt: number, goal: P2 | null, speed: number, face: number | null): void;
  onLevel(from: AlertLevel, to: AlertLevel): void;
  startSweep(clock: number, side: number): void;
  stopSweep(): void;
  followGlimpse(x: number, z: number): void;
  sendTo(x: number, z: number, incident: number, calm?: boolean): void;
  readonly sweeping: boolean;
  readonly level: AlertLevel;
  readonly stimX: number;
  readonly stimZ: number;
  aware: AlertMachine;
  walker: PatrolWalker;
  motion: MotionDriver;
  pos: Vector3;
  def: { walkSpeed: number; runSpeed: number };
  sweepMate: Enemy | null;
  sweepSide: number;
  riseN: number;
  riseCause: number;
  sawMoment: boolean;
  heardMoment: boolean;
  stimulus: P2;
  hasStimulus: boolean;
  rush: boolean;
  spotSet: boolean;
  spot: P2;
  taken: boolean;
  health: { alive: boolean };
  slotIdx: number;
  pairSlot: number;
  section: number;
  bark: ReturnType<typeof vi.fn>;
  searchAt: ReturnType<typeof vi.fn>;
  setGear: ReturnType<typeof vi.fn>;
}

export const asEnemy = (g: SweepGuard): Enemy => g as unknown as Enemy;

/** A flat open floor: every step allowed, height 0. */
const NONE: never[] = [];
const NAV = { cellOf: () => 0, cellNear: () => 0, canStep: () => true, isWalkable: () => true, heightAt: (_x: number, _z: number, y: number) => y, nearestWalkable: () => -1, sliceFree: () => true, sliceCancel: () => {}, sliceTick: () => {} };

let num = 9100;

/**
 * A grunt at (x, z) facing `yaw` on `route` (null: a post there). `list` is the enemy list his spacing reads (push him
 * into it yourself). `o` overrides fields.
 */
export function sweepGuard(list: Enemy[], x: number, z: number, yaw: number, route: PatrolRoute | null, o: Record<string, unknown> = {}): SweepGuard {
  const ctx = { nav: NAV, enemies: () => list, players: () => NONE, coordinated: () => true, stealth: () => true, lkpValid: () => false } as unknown as AiContext;
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    num: num++,
    health: { alive: true },
    aware: new AlertMachine(),
    taken: false,
    passive: false,
    caution: 0,
    incident: -1,
    incMode: 0,
    incCalm: false,
    camBody: null,
    meter: 0,
    rate: 0,
    pos: new Vector3(x, 0, z),
    vel: new Vector3(),
    desired: new Vector3(),
    tmp: new Vector3(),
    sepOut: { x: 0, z: 0 },
    motion: new MotionDriver(yaw),
    motionIn: emptyMotionInput(),
    navCell: 0,
    // (guard-ai play A, #588 on master) the walk home's fields, as the constructor sets them
    routeGoal: [Number.NaN, Number.NaN] as P2,
    routePart: false,
    homeY: 0,
    homeG: null,
    homeX: x,
    homeZ: z,
    homeT: 0,
    homeLong: false,
    homeSlicing: false,
    // (piano polish 1) the sweep's stranding, as the constructor sets them
    swNoPath: 0,
    swRetryT: 0,
    walkX: x,
    walkZ: z,
    walkT: 0,
    meP: [0, 0] as P2,
    yaw,
    target: null,
    sepFree: 0,
    sepStall: 0,
    sepHit: false,
    def: ENEMIES.grunt,
    ctx,
    post: [x, z] as P2,
    postYaw: yaw,
    postDef: null,
    stimulus: [0, 0] as P2,
    hasStimulus: false,
    heard: false,
    turnT: 0,
    lure: new PostLure(),
    dog: null,
    routePath: [],
    routeNear: false,
    pairFace: Number.NaN,
    pairPt: [0, 0] as P2,
    pairGoal: { point: null, speed: 0, face: null },
    sweepMate: null,
    sweepSide: 1,
    sweepCache: null,
    quietRise: false,
    riseN: 0,
    riseCause: 0,
    sawMoment: false,
    heardMoment: false,
    slotIdx: -1,
    pairSlot: -1,
    handlerSlot: -1,
    handler: null,
    section: 0,
    squad: -1,
    reviving: null,
    entry: null,
    crew: null,
    lc: { active: false, stop() {} },
    spot: [0, 0] as P2,
    spotSet: false,
    spotLookT: 0,
    spotArrived: false,
    rush: false,
    searchK: 0,
    searchOwn: true,
    combatSearch: false,
    brkGroup: -1,
    responder: false,
    hunt: -1,
    pendingHunt: -1,
    calledMask: 0,
    planPoint: false,
    planN: 0,
    heardSpot: false,
    searchRoom: null,
    lkpWait: false,
    lkpLate: false,
    helmet: false,
    armour: false,
    walker: new PatrolWalker(route, x, z, yaw, 0),
    bark: vi.fn(),
    searchAt: vi.fn(),
    setGear: vi.fn(),
    // the nav: straight there (null within `near`)
    goTo(this: { pos: Vector3 }, p: P2, _dt: number, near = 0.6): P2 | null {
      return hyp2(p[0] - this.pos.x, p[1] - this.pos.z) < near ? null : p;
    },
    ...o,
  });
  Object.defineProperty(e, 'aimedMotion', { value: false });
  return e as unknown as SweepGuard;
}

/** One sim step of a calm guard: his walker's clock, his calm decision, the walk. Returns the goal. */
export function calmStep(g: SweepGuard, dt: number): Goal {
  g.walker.tick(dt);
  const goal = g.calmDecide(dt);
  g.move(dt, goal.point, goal.speed, goal.face);
  return goal;
}
