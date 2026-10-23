import { describe, expect, it } from 'vitest';
import { CMD_SEND, GuardView, IncidentBoard, KIND, LEVEL, MODE_HELP, type IncidentKind, type PathLen } from '../src/ai/incidents';
import { PACE, paceSpeed, urgentKind } from '../src/ai/response';
import { URGENT } from '../src/ai/gear';
import { AlertMachine, emptyAlertInput, type AlertLevel } from '../src/ai/alertState';
import { P_STANDARD } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';

// (guard-ai S19, Michael's walk of 4.72 G3: "guards should rush to any triggered alarms or bodies reported, they need a
// sense of urgency when it makes logical sense.") Alarm responders (a tripped device, its reinforcements), a reported
// body (a camera's, the radio's), a shots call and a missing man: a jog (run speed x PACE.rush) until they get there.
// Calm checks (a noise, a lure, a light, a breaker) keep their pace.

const WALK = 0.9;
const RUN = 3.2;

describe('who hurries (response.ts)', () => {
  it('alarms, bodies, shots and a missing man are urgent; a noise, a lure, a light and a breaker are calm', () => {
    const urgent: IncidentKind[] = ['device', 'camBody', 'bodyDead', 'bodyKo', 'shots', 'missing', 'witnessKill', 'contact'];
    const calm: IncidentKind[] = ['noise', 'distraction', 'light', 'breaker'];
    for (const k of urgent) expect(urgentKind(k), k).toBe(true);
    for (const k of calm) expect(urgentKind(k), k).toBe(false);
    // every kind is one or the other
    expect([...urgent, ...calm].sort()).toEqual([...KIND].sort());
  });

  it('the rush is a jog off the run speed: more than twice the patrol pace; calm keeps the walk x its pace', () => {
    expect(paceSpeed(true, PACE.investigate, WALK, RUN)).toBeCloseTo(RUN * PACE.rush, 9);
    expect(paceSpeed(true, PACE.investigate, WALK, RUN)).toBeGreaterThan(2 * WALK * PACE.patrol);
    expect(paceSpeed(false, PACE.investigate, WALK, RUN)).toBeCloseTo(WALK * PACE.investigate, 9);
    expect(URGENT.enabled).toBe(true);
  });
});

// ----- the board: a dead body reported over the radio -----

describe('a dead body reported on the radio (board)', () => {
  const straight: PathLen = { len: (ax, ay, az, bx, by, bz) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2) };
  it(`URGENT.bodyHelpers (${URGENT.bodyHelpers}) calm guard in range goes (MODE_HELP), never the searching finder`, () => {
    const b = new IncidentBoard(straight);
    const v = new GuardView(8);
    v.n = 4;
    v.set(0, 1, 1, 0, 0, LEVEL.searching, 0, -1); // the finder, on the body
    v.set(1, 2, 12, 0, 0, LEVEL.unaware, 0, -1);
    v.set(2, 3, 6, 0, 6, LEVEL.cooldown, 0, -1);
    v.set(3, 4, 40, 0, 0, LEVEL.unaware, 0, -1); // out of range
    const id = b.reportBodyCall(0, 0, 0, 5);
    b.tick(0, v);
    const sent: number[] = [];
    for (let k = 0; k < b.out.n; k++) if (b.out.cmd[k] === CMD_SEND && b.out.mode[k] === MODE_HELP) sent.push(b.out.guard[k]!);
    expect(sent).toEqual([3]);
    expect(b.kindOf(id)).toBe('bodyDead');
    // the same body reported again while he is on it: no second guard
    b.out.n = 0;
    expect(b.reportBodyCall(0, 0, 0, 5)).toBe(id);
    b.tick(0, v);
    expect(b.out.n).toBe(0);
  });
});

// ----- on the real Enemy code: the speed of the first walk -----

type Goal = { point: [number, number] | null; speed: number; face: number | null };
type Guard = {
  respondDevice(x: number, z: number, inc: number, room: null): void;
  joinAsResponder(route: null, x: number, z: number, room: null): void;
  helpSearch(x: number, z: number, inc: number): void;
  pairSearch(x: number, z: number, inc: number, lead: boolean): void;
  checkBody(b: Body, inc: number): void;
  sendTo(x: number, z: number, inc: number, calm: boolean): void;
  calmDecide(dt: number): Goal;
  onLevel(a: AlertLevel, b: AlertLevel): void;
  aware: AlertMachine;
  pos: Vector3;
  rushing: boolean;
};

async function guard(): Promise<Guard> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    alertIn: emptyAlertInput(),
    health: { alive: true },
    passive: false,
    taken: false,
    incident: -1,
    incMode: 0,
    incCalm: false,
    turnT: 0,
    caution: 0,
    responder: false,
    tacticsProfile: P_STANDARD,
    brkGroup: -1,
    stimulus: [0, 0],
    hasStimulus: false,
    heard: false,
    searchReq: false,
    searchOwn: false,
    searchKind: 0,
    searchRoom: null,
    rush: false,
    reviving: null,
    camBody: null,
    camBodyT: 0,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    lookBase: 0,
    searchK: 0,
    routePath: [],
    entry: null,
    entryK: 0,
    entryT: 0,
    crew: null,
    hold: null,
    postDef: null,
    post: [0, 0],
    yaw: 0,
    pos: new Vector3(20, 0, 0),
    def: { walkSpeed: WALK, runSpeed: RUN, kind: 'grunt', scale: 1 },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      lkpValid: () => false,
      lkp: new Vector3(),
      searchSlot: () => 0,
      nav: { nearestWalkable: () => -1 },
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    bark() {},
    setState() {},
    goTo: (p: [number, number]) => p,
  });
  return e as unknown as Guard;
}

/** The speed of his walk now, after the board's command put him at `lvl`. */
function speedAt(e: Guard, lvl: AlertLevel): number {
  const from = e.aware.level;
  if (from !== lvl) {
    e.aware.set(lvl);
    e.onLevel(from, lvl);
  }
  return e.calmDecide(1 / 30).speed;
}

/** Walk to the spot at his speed; the speed once he is there and searching on. */
function speedAfterArrival(e: Guard): number {
  const dt = 1 / 30;
  for (let t = 0; t < 60; t += dt) {
    const g = e.calmDecide(dt);
    if (!g.point) {
      // there: look round, then the next point at his search pace
      for (let k = 0; k < 200; k++) {
        const h = e.calmDecide(dt);
        if (h.point) return h.speed;
      }
      return 0;
    }
    const dx = g.point[0] - e.pos.x;
    const dz = g.point[1] - e.pos.z;
    const d = Math.hypot(dx, dz);
    const s = Math.min(d, g.speed * dt);
    if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
  }
  return -1;
}

const JOG = RUN * PACE.rush;

describe('Enemy: urgent responders jog there, calm checks keep their pace', () => {
  it('a tripped device (S17): a jog to the spot, then the search pace once there', async () => {
    const e = await guard();
    e.respondDevice(0, 0, 4, null);
    expect(e.rushing).toBe(true);
    expect(speedAt(e, 'searching')).toBeCloseTo(JOG, 6);
    expect(speedAfterArrival(e)).toBeCloseTo(WALK * PACE.search, 6);
    expect(e.rushing).toBe(false);
  });

  it("an alarm's reinforcement on a device (S17 responder): a jog to the spot", async () => {
    const e = await guard();
    e.joinAsResponder(null, 0, 0, null);
    expect(speedAt(e, 'searching')).toBeCloseTo(JOG, 6);
  });

  it('a body a camera reported (S7): a jog to the body', async () => {
    const e = await guard();
    const b = { pos: new Vector3(0, 0.15, 0), found: false, lethal: true, present: true, carried: false, hidden: false } as unknown as Body;
    e.checkBody(b, 6);
    expect(e.aware.level).toBe('investigating');
    expect(speedAt(e, 'investigating')).toBeCloseTo(JOG, 6);
  });

  it('a dead body reported on the radio (S19 helper): a jog to the body, then its search', async () => {
    const e = await guard();
    e.helpSearch(0, 0, 7);
    expect(speedAt(e, 'searching')).toBeCloseTo(JOG, 6);
    expect(speedAfterArrival(e)).toBeCloseTo(WALK * PACE.search, 6);
  });

  it('a missing man (S14 / S5b pair) and a shots call (S14): a jog there', async () => {
    const lead = await guard();
    lead.pairSearch(0, 0, 8, true);
    expect(speedAt(lead, 'searching')).toBeCloseTo(JOG, 6);
    const cover = await guard();
    cover.pairSearch(0, 0, 8, false);
    expect(speedAt(cover, 'searching')).toBeCloseTo(JOG, 6);
    const shots = await guard();
    shots.sendTo(0, 0, 9, false);
    expect(speedAt(shots, 'investigating')).toBeCloseTo(JOG, 6);
  });

  it('a noise or a lure (calm): the investigate pace, no rush', async () => {
    const e = await guard();
    e.sendTo(0, 0, 3, true);
    expect(e.rushing).toBe(false);
    expect(speedAt(e, 'investigating')).toBeCloseTo(WALK * PACE.investigate, 6);
  });

  it('into combat or back to calm: the hurry is dropped', async () => {
    const e = await guard();
    e.respondDevice(0, 0, 4, null);
    e.aware.set('searching');
    e.onLevel('unaware', 'searching');
    expect(e.rushing).toBe(true);
    e.onLevel('searching', 'cooldown');
    expect(e.rushing).toBe(false);
  });
});
