import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { ARCHETYPE } from '../src/ai/archetypes';
import { PostLure } from '../src/ai/posts';
import { flags } from '../src/core/flags';
import { hyp2 } from '../src/core/mathx';
import { SectorMode } from '../src/game/modes/sectorMode';
import { SectorStageRun, type SectorStageAction } from '../src/game/sectorStage';
import type { SectorDef } from '../src/game/sectors';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { P2 } from '../src/ai/navGrid';

// (guard-rules S8, A12) The alarm stage lets the dogs off the heel: `Enemy.releaseHeel` sends a free dog hurrying to the
// shared last known position (none: its handler / leader, else where it stands) to search it; once calm, today's heel
// rule brings it back. `SectorMode.stageActions` calls it for the live section's dogs on a `releaseDogs` raise edge,
// with `flags.dogRelease` only, and never on a section start (S8-a).

interface Mate {
  pos: { x: number; y: number; z: number };
  yaw: number;
  alive: boolean;
}

interface Probe {
  aware: AlertMachine;
  health: { alive: boolean };
  passive: boolean;
  taken: boolean;
  dog: object | null;
  handler: Mate | null;
  leader: Mate | null;
  stimulus: P2;
  hasStimulus: boolean;
  searchReq: boolean;
  searchOwn: boolean;
  readonly rushing: boolean;
  readonly level: string;
  releaseHeel(): boolean;
  calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null };
}

const mate = (x: number, z: number, yaw = 0): Mate => ({ pos: { x, y: 0, z }, yaw, alive: true });

/** A bare-prototype dog (the `tests/postsWiring.test.ts` probe, cut down): the fields `releaseHeel`, `searchAt` and the
 *  calm heel branch of `calmDecide` read. */
async function probe(lkp: { x: number; z: number } | null, x = 0, z = 0): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    dog: {},
    handler: null,
    leader: null,
    meter: 0,
    pos: { x, y: 0, z },
    stimulus: [0, 0] as P2,
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchRoom: null,
    searchKind: 0,
    rush: false,
    reviving: null,
    turnT: 0,
    brkGroup: -1,
    lure: new PostLure(),
    spot: [0, 0] as P2,
    spotArrived: false,
    def: { walkSpeed: 1.5, runSpeed: 5, kind: 'dog' },
    ctx: { lkp: { x: lkp?.x ?? 0, y: 0, z: lkp?.z ?? 0 }, lkpValid: () => lkp !== null } as unknown as AiContext,
    // the nav: straight there (null when within `near`)
    goTo(p: P2, _dt: number, near = 0.6): P2 | null {
      return hyp2(p[0] - this.pos.x, p[1] - this.pos.z) < near ? null : p;
    },
  });
  return e as unknown as Probe;
}

describe('Enemy.releaseHeel (guard-rules S8, A12)', () => {
  it('a known position: the dog hurries there to search; its level moves on the next think', async () => {
    const d = await probe({ x: 12, z: -7 });
    d.handler = mate(1, 0);
    expect(d.releaseHeel()).toBe(true);
    expect([d.stimulus[0], d.stimulus[1]]).toEqual([12, -7]);
    expect(d.hasStimulus).toBe(true);
    expect(d.searchReq).toBe(true);
    expect(d.searchOwn).toBe(true);
    expect(d.rushing).toBe(true);
    expect(d.aware.level).toBe('unaware');
    // the next think: the request starts the search
    const i = emptyAlertInput();
    i.search = true;
    expect(d.aware.step(0.1, i)).toBe(true);
    expect(d.level).toBe('searching');
  });

  it('no known position: round its handler, else its leader, else where it stands', async () => {
    const a = await probe(null, 3, 4);
    a.handler = mate(-2, 6);
    a.leader = mate(9, 9);
    expect(a.releaseHeel()).toBe(true);
    expect([a.stimulus[0], a.stimulus[1]]).toEqual([-2, 6]);
    expect(a.rushing).toBe(true);
    const b = await probe(null, 3, 4);
    b.leader = mate(9, 8);
    expect(b.releaseHeel()).toBe(true);
    expect([b.stimulus[0], b.stimulus[1]]).toEqual([9, 8]);
    const c = await probe(null, 3, 4);
    expect(c.releaseHeel()).toBe(true);
    expect([c.stimulus[0], c.stimulus[1]]).toEqual([3, 4]);
    expect(c.searchReq).toBe(true);
  });

  it('not a dog, down, alerted, passive or held: left alone', async () => {
    const cases: ((p: Probe) => void)[] = [
      (p) => void (p.dog = null),
      (p) => void (p.health.alive = false),
      (p) => p.aware.set('alert'),
      (p) => void (p.passive = true),
      (p) => void (p.taken = true),
    ];
    for (const set of cases) {
      const p = await probe({ x: 12, z: -7 });
      p.handler = mate(1, 0);
      set(p);
      expect(p.releaseHeel()).toBe(false);
      expect(p.hasStimulus).toBe(false);
      expect(p.searchReq).toBe(false);
      expect(p.rushing).toBe(false);
    }
  });

  it('already searching (a body, a noise): it starts over round the new spot (as bodySearch)', async () => {
    const d = await probe({ x: 12, z: -7 });
    d.aware.set('searching');
    d.aware.t = 30;
    const q = d as unknown as Record<string, unknown>;
    Object.assign(q, { searchK: 3, lkpWait: true, lkpLate: true, planN: 2, planPoint: true, spotSet: true, combatSearch: true });
    expect(d.releaseHeel()).toBe(true);
    expect(d.aware.t).toBe(0);
    expect([q.searchK, q.lkpWait, q.lkpLate, q.planN, q.planPoint, q.spotSet, q.combatSearch]).toEqual([0, false, false, 0, false, false, false]);
    expect([d.stimulus[0], d.stimulus[1]]).toEqual([12, -7]);
    expect(d.searchOwn).toBe(true);
    expect(d.rushing).toBe(true);
    expect(d.level).toBe('searching');
  });

  it('heel-back: once the search ends (cooldown) the dog heads for its heel spot by a living handler', async () => {
    const d = await probe({ x: 12, z: -7 }, 12, -7);
    const h = mate(0, 0, 0.6);
    d.handler = h;
    expect(d.releaseHeel()).toBe(true);
    d.aware.set('searching');
    // the plain search runs out: calm again
    expect(d.aware.step(ALERT.searchTime, emptyAlertInput())).toBe(true);
    expect(d.level).toBe('cooldown');
    const r = d.calmDecide(0.1);
    const s = Math.sin(h.yaw);
    const c = Math.cos(h.yaw);
    const heel = ARCHETYPE.dog.heel;
    expect(r.point).not.toBeNull();
    expect(r.point![0]).toBeCloseTo(h.pos.x + c * heel - s * 0.5, 6);
    expect(r.point![1]).toBeCloseTo(h.pos.z - s * heel - c * 0.5, 6);
    // far off (more than 3 m): its heel run pace
    expect(r.speed).toBeCloseTo(5 * 0.6, 6);
  });
});

// ----- the mode: `SectorMode.stageActions` -> `releaseDogs` -----

/** One section with the given stage actions (the `tests/sectorStageActions.test.ts` helper, minimal). */
function section(stageActions?: SectorStageAction[]): SectorDef {
  return {
    id: 's',
    name: 'S',
    start: { x: -4, y: 0, z: 0, yaw: 0 },
    objective: { kind: 'hack', label: 'Hack', x: 4, y: 0, z: 0, yaw: 0 },
    extract: { label: 'Out', box: [3, 7, 5, 9] },
    guards: [],
    reinforce: [[-5, -8], [-5, 8]],
    perStage: 2,
    routes: [],
    stageActions,
  };
}

interface StandIn {
  dog: object | null;
  section: number;
  releaseHeel: ReturnType<typeof vi.fn>;
}
const standIn = (dog: boolean, sec: number): StandIn => ({ dog: dog ? {} : null, section: sec, releaseHeel: vi.fn(() => true) });

function mode(defs: SectorDef[], index = 0) {
  const m = Object.create(SectorMode.prototype) as SectorMode;
  const dogA = standIn(true, index);
  const dogB = standIn(true, index);
  const other = standIn(true, index + 1);
  const human = standIn(false, index);
  const stageRun = new SectorStageRun<number>(defs, { groupOn: () => 0, lock() {}, navClosed() {} }, () => null);
  Object.assign(m, { stageRun, run: { index }, g: { enemyMgr: { enemies: [dogA, human, other, dogB] }, stealth: null }, secT: 0 });
  const act = (from: number, to: number, live?: boolean) =>
    (m as unknown as { stageActions(from: number, to: number, live?: boolean): void }).stageActions(from, to, live);
  return { act, stageRun, dogA, dogB, other, human };
}

const DOGS: SectorStageAction[] = [{ stage: 2, releaseDogs: true }];

describe('SectorMode stage actions release the dogs (guard-rules S8, A12)', () => {
  const saved = flags.dogRelease;
  afterEach(() => {
    flags.dogRelease = saved;
  });

  it('flag on, a raise onto the releaseDogs stage: each dog of the live section once; another section and a human not', () => {
    flags.dogRelease = true;
    const { act, dogA, dogB, other, human } = mode([section(DOGS), section(DOGS)]);
    act(1, 2);
    expect(dogA.releaseHeel).toHaveBeenCalledTimes(1);
    expect(dogB.releaseHeel).toHaveBeenCalledTimes(1);
    expect(other.releaseHeel).not.toHaveBeenCalled();
    expect(human.releaseHeel).not.toHaveBeenCalled();
    // the edge: a later raise past it releases no one again
    act(2, 3);
    expect(dogA.releaseHeel).toHaveBeenCalledTimes(1);
  });

  it('flag off: none (the stage is recorded only)', () => {
    flags.dogRelease = false;
    const { act, stageRun, dogA, dogB } = mode([section(DOGS)]);
    act(1, 2);
    expect(stageRun.dogsReleased).toBe(true);
    expect(dogA.releaseHeel).not.toHaveBeenCalled();
    expect(dogB.releaseHeel).not.toHaveBeenCalled();
  });

  it('flag on, a raise that reaches no releaseDogs stage: none', () => {
    flags.dogRelease = true;
    const a = mode([section(DOGS)]);
    a.act(0, 1);
    a.act(1, 1);
    expect(a.dogA.releaseHeel).not.toHaveBeenCalled();
    const b = mode([section([{ stage: 2, lightsFull: [4] }])]);
    b.act(0, 3);
    expect(b.dogA.releaseHeel).not.toHaveBeenCalled();
    const c = mode([section()]);
    c.act(0, 3);
    expect(c.dogA.releaseHeel).not.toHaveBeenCalled();
  });

  it('a section start at a carried stage (live false) replays the stage but releases no one (S8-a)', () => {
    flags.dogRelease = true;
    const { act, stageRun, dogA, dogB } = mode([section(DOGS)]);
    act(0, 2, false);
    expect(stageRun.dogsReleased).toBe(true);
    expect(dogA.releaseHeel).not.toHaveBeenCalled();
    expect(dogB.releaseHeel).not.toHaveBeenCalled();
  });

  it('the section start passes live false; the raise keeps the default (live)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/game/modes/sectorMode.ts', import.meta.url), 'utf8');
    expect(src).toContain('this.stageActions(0, this.run.alarm, false);');
    expect(src).toContain('if (s && stage > from) this.stageActions(from, stage);');
  });
});
