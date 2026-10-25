import { describe, expect, it, vi } from 'vitest';
import { Enemy, RISE_NONE, RISE_SIGHT, RISE_SOUND } from '../src/ai/enemy';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { BARKS, RADIO_BARKS } from '../src/ai/barks';
import { COMBAT_HEAR } from '../src/ai/hearing';
import { noiseSuspicion, PERCEPTION } from '../src/ai/perception';
import { SEARCH_PLAIN } from '../src/ai/response';
import { P_STANDARD } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';

// (guard-rules S4, A8) Barks by cause: a guard who saw something above the leak in this calm moment never says "I heard
// something."; the rise to investigating barks `investigate` (sight / neutral) or `heard` (a sound alone). The cause is
// kept on the guard (`riseCause`, `riseN`, `stimX` / `stimZ`) for S7's lookout radio and J13's cause log. Stand-in guards
// on Enemy's prototype (no rig, no scene), as bodySearch / guardPolish2; `Object.create` skips field initializers, so
// the S4 fields are set here.

const DT = 0.05;

type Guard = {
  aware: AlertMachine;
  rate: number;
  meter: number;
  riseCause: number;
  riseN: number;
  readonly stimX: number;
  readonly stimZ: number;
  hearBarkT: number;
  bark: ReturnType<typeof vi.fn>;
  hear(x: number, z: number, radius?: number): void;
  hearSearch(x: number, y: number, z: number, mayBark?: boolean): boolean;
  alert(): void;
  updateAwareness(dt: number): void;
};

function guard(): Guard {
  const e = Object.assign(Object.create(Enemy.prototype) as Enemy, {
    aware: new AlertMachine(),
    alertIn: emptyAlertInput(),
    health: { alive: true },
    passive: false,
    taken: false,
    los: false,
    smelled: false,
    rate: 0,
    meter: 0,
    sinceSeen: 99,
    called: 0,
    heard: false,
    gunfire: false,
    loudAlert: false,
    alarm: null,
    state: 'idle',
    target: null,
    incident: -1,
    incMode: 0,
    incCalm: false,
    turnT: 0,
    caution: 0,
    responder: false,
    tacticsProfile: P_STANDARD,
    brkGroup: -1,
    closingIn: false,
    stimulus: [0, 0],
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchKind: SEARCH_PLAIN,
    searchRoom: null,
    reviving: null,
    camBody: null,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    searchK: 0,
    planN: 0,
    planPoint: false,
    heardSpot: false,
    hearBarkT: 99,
    heardT: 99,
    lkpWait: false,
    lkpLate: false,
    hunt: -1,
    pendingHunt: -1,
    calledMask: 0,
    rush: false,
    num: 1,
    buff: false,
    radioT: 0,
    burstLeft: 0,
    windup: 0,
    armourPick: false,
    fireGate: { reset() {} },
    rng: { reseed() {} },
    yaw: 0,
    pos: new Vector3(0, 0, 0),
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1, melee: false },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      lkpValid: () => false,
      searchSlot: () => 0,
      nav: { nearestWalkable: () => -1 },
      diff: { reaction: 1 },
      callAlert() {},
      shout() {},
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    setState() {},
    bark: vi.fn(),
    // (guard-rules S4) the new fields (no initializers run on Object.create)
    sawMoment: false,
    heardMoment: false,
    riseCause: RISE_NONE,
    riseN: 0,
  });
  return e as unknown as Guard;
}

/** The events `bark` was called with, in order. */
function said(g: Guard): string[] {
  return g.bark.mock.calls.map((c) => c[0] as string);
}

/** Step the real `updateAwareness` until `level` (or `max` s); returns the seconds taken. */
function until(g: Guard, level: string, max = 120): number {
  let t = 0;
  while (g.aware.level !== level && t < max) {
    g.updateAwareness(DT);
    t += DT;
  }
  return t;
}

// a loud noise near him (straight to investigating) and a soft one (suspicious, then the sound timer)
const LOUD: [number, number, number] = [1, 0.5, 20];
const SOFT: [number, number, number] = [10, 0, 20];

describe('(guard-rules S4, A8) the noises the cases use', () => {
  it('LOUD reaches investigate, SOFT stays under suspicious', () => {
    expect(noiseSuspicion(Math.hypot(LOUD[0], LOUD[1]), LOUD[2]) - PERCEPTION.decay * DT).toBeGreaterThanOrEqual(PERCEPTION.investigate);
    expect(noiseSuspicion(Math.hypot(SOFT[0], SOFT[1]), SOFT[2])).toBeLessThan(PERCEPTION.suspicious);
    expect(noiseSuspicion(Math.hypot(SOFT[0], SOFT[1]), SOFT[2])).toBeGreaterThan(0);
  });
});

describe('(guard-rules S4, A8) the investigate bark follows the rise cause', () => {
  it('1. a noise alone: straight to investigating, "heard", RISE_SOUND, riseN 1, stimX / stimZ the noise', () => {
    const g = guard();
    g.hear(...LOUD);
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('investigating');
    expect(said(g)).toEqual(['heard']);
    expect(g.riseCause).toBe(RISE_SOUND);
    expect(g.riseN).toBe(1);
    expect([g.stimX, g.stimZ]).toEqual([LOUD[0], LOUD[1]]);
  });

  it('2. a soft noise: suspicious, then after ALERT.hearLook investigating with "heard"; riseN 2', () => {
    const g = guard();
    g.hear(...SOFT);
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('suspicious');
    expect(g.riseCause).toBe(RISE_SOUND);
    expect(g.riseN).toBe(1);
    const t = until(g, 'investigating', 10);
    expect(g.aware.level).toBe('investigating');
    expect(t).toBeCloseTo(ALERT.hearLook, 1);
    expect(said(g)).toEqual(['suspicious', 'heard']);
    expect(g.riseCause).toBe(RISE_SOUND);
    expect(g.riseN).toBe(2);
  });

  it('3. sight only (rate above the leak until the meter passes investigate): "investigate", RISE_SIGHT', () => {
    const g = guard();
    g.rate = 1;
    until(g, 'investigating', 10);
    expect(g.aware.level).toBe('investigating');
    expect(g.meter).toBeLessThan(1);
    expect(said(g)).toEqual(['suspicious', 'investigate']);
    expect(g.riseCause).toBe(RISE_SIGHT);
    expect(g.riseN).toBe(2);
  });

  it('a glimpse at or below the leak is not sight evidence (S4-a): a soft noise then still says "heard"', () => {
    const g = guard();
    g.hear(...SOFT);
    g.rate = PERCEPTION.leak;
    g.updateAwareness(DT);
    until(g, 'investigating', 10);
    expect(said(g)).toEqual(['suspicious', 'heard']);
    expect(g.riseCause).toBe(RISE_SOUND);
  });
});

describe('(guard-rules S4, A8) a seen player never gets "I heard something."', () => {
  it('4a. a noise and a glimpse above the leak in the same moment: "investigate", RISE_SIGHT', () => {
    const g = guard();
    g.hear(...LOUD);
    g.rate = 0.5;
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('investigating');
    expect(said(g)).toEqual(['investigate']);
    expect(g.riseCause).toBe(RISE_SIGHT);
    expect(said(g)).not.toContain('heard');
  });

  it('4b. a glimpse during the suspicious moment, then the sound timer walks him over: still "investigate"', () => {
    const g = guard();
    g.hear(...SOFT);
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('suspicious');
    expect(g.riseCause).toBe(RISE_SOUND);
    // one glimpse above the leak, too short to reach investigate on the meter
    g.rate = 0.5;
    g.updateAwareness(DT);
    g.rate = 0;
    expect(g.aware.level).toBe('suspicious');
    expect(g.meter).toBeLessThan(PERCEPTION.investigate);
    until(g, 'investigating', 10);
    expect(g.aware.level).toBe('investigating');
    expect(said(g)).toEqual(['suspicious', 'investigate']);
    expect(g.riseCause).toBe(RISE_SIGHT);
    expect(g.riseN).toBe(2);
  });
});

describe('(guard-rules S4, A8) back to calm clears the moment', () => {
  it('5a. cooldown: seen, investigated, given up; a later noise alone says "heard"', () => {
    const g = guard();
    g.rate = 1;
    until(g, 'investigating', 10);
    g.rate = 0;
    expect(g.riseCause).toBe(RISE_SIGHT);
    until(g, 'cooldown', ALERT.investigateMax + 5);
    expect(g.aware.level).toBe('cooldown');
    g.bark.mockClear();
    g.hear(...LOUD);
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('investigating');
    expect(said(g)).toEqual(['heard']);
    expect(g.riseCause).toBe(RISE_SOUND);
  });

  it('5b. unaware: a glimpse that comes to nothing; a later noise alone says "heard"', () => {
    const g = guard();
    g.rate = 1;
    until(g, 'suspicious', 5);
    g.rate = 0;
    expect(g.riseCause).toBe(RISE_SIGHT);
    until(g, 'unaware', ALERT.suspiciousTime + 5);
    expect(g.aware.level).toBe('unaware');
    g.bark.mockClear();
    g.hear(...LOUD);
    g.updateAwareness(DT);
    expect(g.aware.level).toBe('investigating');
    expect(said(g)).toEqual(['heard']);
    expect(g.riseCause).toBe(RISE_SOUND);
  });
});

describe('(guard-rules S4, A8) hearSearch and the rise counter', () => {
  it('6. hearSearch while searching barks "heard", at most once per COMBAT_HEAR.bark (A185 unchanged)', () => {
    const g = guard();
    g.aware.set('searching');
    expect(g.hearSearch(3, Number.NaN, 4)).toBe(true);
    expect(said(g)).toEqual(['heard']);
    expect(g.hearSearch(3, Number.NaN, 5)).toBe(false);
    expect(said(g)).toEqual(['heard']);
    g.hearBarkT = COMBAT_HEAR.bark;
    expect(g.hearSearch(3, Number.NaN, 6)).toBe(true);
    expect(said(g)).toEqual(['heard', 'heard']);
    // mayBark false (a nearer searcher said it): no line
    g.hearBarkT = COMBAT_HEAR.bark;
    expect(g.hearSearch(3, Number.NaN, 7, false)).toBe(false);
    expect(said(g)).toEqual(['heard', 'heard']);
    expect(g.riseN).toBe(0);
  });

  it('7. riseN does not move on alert, searching or calm transitions; riseCause is kept after calm', () => {
    const g = guard();
    g.hear(...LOUD);
    g.updateAwareness(DT);
    expect([g.aware.level, g.riseCause, g.riseN]).toEqual(['investigating', RISE_SOUND, 1]);
    g.alert();
    expect(g.aware.level).toBe('alert');
    expect(g.riseN).toBe(1);
    until(g, 'searching', ALERT.lostSight + 5);
    expect(g.aware.level).toBe('searching');
    expect(g.riseN).toBe(1);
    until(g, 'cooldown', ALERT.searchTime + 5);
    expect(g.aware.level).toBe('cooldown');
    expect(g.riseN).toBe(1);
    expect(g.riseCause).toBe(RISE_SOUND);
    // and an investigation that ends calm keeps them too
    const h = guard();
    h.rate = 1;
    until(h, 'investigating', 10);
    h.rate = 0;
    until(h, 'cooldown', ALERT.investigateMax + 5);
    expect(h.aware.level).toBe('cooldown');
    expect([h.riseCause, h.riseN]).toEqual([RISE_SIGHT, 2]);
  });
});

describe('(guard-rules S4, A8) the lines', () => {
  it('8. investigate has no "I heard something."; heard and spotCall exist, each line <= 90; spotCall is radio', () => {
    expect(BARKS.investigate).not.toContain('I heard something.');
    expect(BARKS.investigate.length).toBe(4);
    expect(BARKS.heard).toContain('I heard something.');
    expect(BARKS.heard.length).toBeGreaterThan(0);
    expect(BARKS.spotCall.length).toBeGreaterThan(0);
    for (const l of [...BARKS.heard, ...BARKS.spotCall]) expect(l.length).toBeLessThanOrEqual(90);
    expect(RADIO_BARKS.has('spotCall')).toBe(true);
    expect(RADIO_BARKS.has('heard')).toBe(false);
  });
});
