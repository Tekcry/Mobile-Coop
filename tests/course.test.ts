import { describe, expect, it } from 'vitest';
import { AIRLOCK_CYCLE, PAIR_WINDOW, RESTART_DELAY, TIMED_HOLD_AFTER } from '../src/config/course';
import { leadOf, validateCourse, type AirlockDef, type BayDef, type CourseDef, type CourseKnownIds, type GateDef } from '../src/game/course/courseDef';
import { CourseState, REFUSE_BOLT, REFUSE_PARTNER, REFUSE_REVIVE, type PackedCourse } from '../src/game/course/courseState';

const DT = 1 / 60;

/** Airlock k (1-based) is a 6 x 6 box at x 100 k, z 0, floor y 0. */
function airlock(k: number): AirlockDef {
  return { id: `A${k}`, box: [100 * k, 0, 100 * k + 6, 6], floorY: 0, nearDoor: `A${k}-near`, farDoor: `A${k}-far` };
}

function bay(k: number, n: number, extra: Partial<BayDef> = {}): BayDef {
  return {
    id: `B${k}`,
    entry: k === 1 ? 'start' : `A${k - 1}`,
    exit: k === n ? 'end' : `A${k}`,
    squad: [`B${k}-G1`, `B${k}-G2`],
    gates: [],
    radio: [{ at: 'enter', text: `Bay ${k}.` }],
    drills: [],
    elements: [],
    ...extra,
  };
}

const GATES: GateDef[] = [
  { kind: 'lever', id: 'g-lever', switchId: 'sw-lever', doorId: 'd-lever' },
  { kind: 'bolt', id: 'g-bolt', doorId: 'd-bolt', side: [0, -1], at: [10, 10] },
  { kind: 'hold', id: 'g-hold', holdId: 'h-hold', doorId: 'd-hold' },
  { kind: 'timedHold', id: 'g-timed', holdId: 'h-timed', doorId: 'd-timed' },
  { kind: 'pair', id: 'g-pair', a: 'sw-pa', b: 'sw-pb', doorId: 'd-pair' },
  { kind: 'egress', id: 'g-egress', switchId: 'sw-egress', doorIds: ['d-eg1', 'd-eg2'] },
  { kind: 'mains', id: 'g-mains', group: 'mains', doorId: 'A1-near' },
  { kind: 'pickup', id: 'g-key', switchId: 'sw-key', flag: 'key', perPlayer: false },
  { kind: 'pickup', id: 'g-card', switchId: 'sw-card', flag: 'card', perPlayer: true },
  { kind: 'flag', id: 'g-flag', flag: 'key', doorId: 'd-flag' },
  { kind: 'anchorLock', id: 'g-fan', anchorId: 'rope-1', flag: 'key' },
];

function course(): CourseDef {
  const n = 6;
  return {
    id: 'test',
    airlocks: [1, 2, 3, 4, 5].map(airlock),
    bays: [1, 2, 3, 4, 5, 6].map((k) =>
      bay(k, n, k === 1
        ? {
            gates: GATES,
            drills: [
              { id: 'd-crouch', verb: 'crouch', who: 'both', text: 'Crouch.', marker: { x: 1, y: 0, z: 1 }, name: 'crouch' },
              { id: 'd-ping', verb: 'ping', who: 'either', text: 'Ping the lamp.', marker: 'lamp-1' },
              { id: 'd-ledge', verb: 'shimmy', who: 'second', text: 'Shimmy the ledge.', marker: 'ledge-1', name: 'ledge shimmy' },
            ],
          }
        : k === 2
          ? { drills: [{ id: 'd-lead2', verb: 'vault', who: 'lead', text: 'Vault.', marker: 'rail' }] }
          : {}),
    ),
  };
}

const KNOWN: CourseKnownIds = {
  doors: ['d-lever', 'd-bolt', 'd-hold', 'd-timed', 'd-pair', 'd-eg1', 'd-eg2', 'd-flag', ...[1, 2, 3, 4, 5].flatMap((k) => [`A${k}-near`, `A${k}-far`])],
  switches: ['sw-lever', 'sw-pa', 'sw-pb', 'sw-egress', 'sw-key', 'sw-card'],
  holds: ['h-hold', 'h-timed'],
  anchors: ['rope-1'],
  groups: ['mains'],
};

function run(s: CourseState, seconds: number): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) s.update(DT);
}

/** Put both players in airlock k (or player p only). */
function enter(s: CourseState, k: number, who: (0 | 1)[] = [0, 1]): void {
  for (const p of who) s.setPlayer(p, 100 * k + 2 + p, 0, 3, false);
}

function outside(s: CourseState, p: 0 | 1): void {
  s.setPlayer(p, -50, 0, -50, false);
}

function finishBay1Drills(s: CourseState): void {
  s.tick(0, 'crouch');
  s.tick(1, 'crouch');
  s.tick(0, 'ping');
  s.tick(1, 'shimmy');
}

describe('validateCourse', () => {
  it('accepts the test course', () => {
    expect(() => validateCourse(course(), KNOWN)).not.toThrow();
  });
  it('rejects an unknown door with the gate id', () => {
    const c = course();
    c.bays[0]!.gates = [{ kind: 'lever', id: 'g-x', switchId: 'sw-lever', doorId: 'nope' }];
    expect(() => validateCourse(c, KNOWN)).toThrow(/g-x.*nope/);
  });
  it('rejects a 91-character radio line and accepts 90', () => {
    const c = course();
    c.bays[1]!.radio = [{ at: 'enter', text: 'x'.repeat(90) }];
    expect(() => validateCourse(c, KNOWN)).not.toThrow();
    c.bays[1]!.radio = [{ at: 'enter', text: 'x'.repeat(91) }];
    expect(() => validateCourse(c, KNOWN)).toThrow(/B2.*91/);
  });
  it('rejects a 5 x 6 airlock', () => {
    const c = course();
    c.airlocks[2] = { ...c.airlocks[2]!, box: [300, 0, 305, 6] };
    expect(() => validateCourse(c, KNOWN)).toThrow(/A3/);
  });
  it('rejects duplicate ids, a broken bay chain, an unknown switch and a flag nobody sets', () => {
    const dup = course();
    dup.bays[1]!.id = 'B1';
    expect(() => validateCourse(dup, KNOWN)).toThrow(/B1.*duplicate/);
    const chain = course();
    chain.bays[2]!.entry = 'A1';
    expect(() => validateCourse(chain, KNOWN)).toThrow(/B3/);
    const sw = course();
    sw.bays[1]!.gates = [{ kind: 'egress', id: 'g-e2', switchId: 'sw-none', doorIds: ['d-eg1'] }];
    expect(() => validateCourse(sw, KNOWN)).toThrow(/g-e2.*sw-none/);
    const flag = course();
    flag.bays[1]!.gates = [{ kind: 'flag', id: 'g-f2', flag: 'ghost', doorId: 'd-flag' }];
    expect(() => validateCourse(flag, KNOWN)).toThrow(/g-f2.*ghost/);
  });
});

describe('drills gate the airlock (D30)', () => {
  it('refuses while one drill is open for one player, names it, and cycles once ticked', () => {
    const s = new CourseState(course());
    s.tick(0, 'crouch');
    s.tick(1, 'crouch');
    s.tick(0, 'ping');
    enter(s, 1);
    s.update(DT);
    expect(s.airlockPrompt('A1')).toBe('Waiting: P2 - ledge shimmy');
    expect(s.press('A1', 0)).toBe('Waiting: P2 - ledge shimmy');
    run(s, AIRLOCK_CYCLE + 1);
    expect(s.airlockPhase('A1')).toBe('ready');
    s.tick(1, 'shimmy');
    expect(s.airlockPrompt('A1')).toBe('Cycle');
    expect(s.press('A1', 1)).toBeNull();
    expect(s.airlockPhase('A1')).toBe('cycling');
    run(s, AIRLOCK_CYCLE);
    expect(s.airlockPhase('A1')).toBe('sealed');
    expect(s.bay).toBe(1);
    expect(s.checkpoint).toBe('A1');
  });
  it('either needs one tick, both needs two, lead and second follow the swap rule', () => {
    const s = new CourseState(course());
    const [crouch, ping, ledge] = s.currentBay.drills as [never, never, never];
    expect(leadOf(0)).toBe(0);
    expect(leadOf(1)).toBe(1);
    s.tick(1, 'ping');
    expect(s.drillComplete(ping)).toBe(true);
    s.tick(0, 'ping');
    expect(s.drillTicks('d-ping', 0)).toBe(0);
    s.tick(0, 'crouch');
    expect(s.drillComplete(crouch)).toBe(false);
    s.tick(1, 'crouch');
    expect(s.drillComplete(crouch)).toBe(true);
    // second in bay 1 is P2: P1's shimmy does not count.
    s.tick(0, 'shimmy');
    expect(s.drillComplete(ledge)).toBe(false);
    expect(s.nextDrill(0)).toBeNull();
    expect(s.nextDrill(1)?.id).toBe('d-ledge');
    s.tick(1, 'shimmy');
    expect(s.drillsDone()).toBe(true);
    // bay 2: lead is P2.
    enter(s, 1);
    s.update(DT);
    s.press('A1', 0);
    run(s, AIRLOCK_CYCLE);
    expect(s.lead).toBe(1);
    s.tick(0, 'vault');
    expect(s.drillsDone()).toBe(false);
    expect(s.nextDrill(0)).toBeNull();
    s.tick(1, 'vault');
    expect(s.drillsDone()).toBe(true);
  });
  it('the solo flag counts one tick for both and lets P1 cycle alone', () => {
    const s = new CourseState(course());
    s.solo = true;
    s.tick(0, 'crouch');
    s.tick(0, 'shimmy');
    s.tick(0, 'ping');
    expect(s.drillsDone()).toBe(true);
    enter(s, 1, [0]);
    outside(s, 1);
    s.update(DT);
    expect(s.press('A1', 0)).toBeNull();
    run(s, AIRLOCK_CYCLE);
    expect(s.airlockPhase('A1')).toBe('sealed');
  });
  it('finish refuses with open drills and ends the course', () => {
    const s = new CourseState(course());
    s.startAt(6);
    expect(s.finish()).toBeNull();
    expect(s.over).toBe(true);
    expect(s.events.some((e) => e.t === 'courseDone')).toBe(true);
    const t = new CourseState({ ...course(), bays: [bay(1, 1, { drills: [{ id: 'x', verb: 'v', who: 'both', text: 'V.', marker: 'm' }] })], airlocks: [] });
    expect(t.finish()).toBe('Waiting: P1 - v; P2 - v');
    expect(t.over).toBe(false);
  });
});

describe('airlocks', () => {
  function ready(): CourseState {
    const s = new CourseState(course());
    finishBay1Drills(s);
    return s;
  }
  it('never cycles with one player inside', () => {
    const s = ready();
    enter(s, 1, [0]);
    outside(s, 1);
    s.update(DT);
    expect(s.airlockPhase('A1')).toBe('waiting');
    expect(s.press('A1', 0)).toBe(REFUSE_PARTNER);
    run(s, AIRLOCK_CYCLE + 1);
    expect(s.airlockPhase('A1')).toBe('waiting');
  });
  it('never cycles with a downed player', () => {
    const s = ready();
    enter(s, 1);
    s.setPlayer(1, 102, 0, 3, true);
    s.update(DT);
    expect(s.press('A1', 0)).toBe(REFUSE_REVIVE);
    expect(s.airlockPhase('A1')).not.toBe('cycling');
  });
  it('a player above the floor tolerance is not inside', () => {
    const s = ready();
    enter(s, 1);
    s.setPlayer(1, 102, 1.2, 3, false);
    s.update(DT);
    expect(s.press('A1', 0)).toBe(REFUSE_PARTNER);
  });
  it('aborts when one leaves mid-cycle', () => {
    const s = ready();
    enter(s, 1);
    s.update(DT);
    s.press('A1', 0);
    run(s, AIRLOCK_CYCLE / 2);
    outside(s, 1);
    s.update(DT);
    expect(s.airlockPhase('A1')).toBe('waiting');
    expect(s.events.some((e) => e.t === 'airlockAborted')).toBe(true);
    enter(s, 1);
    run(s, AIRLOCK_CYCLE + 1);
    expect(s.airlockPhase('A1')).toBe('ready');
  });
  it('aborts when a player goes down mid-cycle', () => {
    const s = ready();
    enter(s, 1);
    s.update(DT);
    s.press('A1', 1);
    run(s, 1);
    s.setPlayer(0, 102, 0, 3, true);
    run(s, AIRLOCK_CYCLE);
    expect(s.airlockPhase('A1')).not.toBe('sealed');
  });
  it('seals: far door unlocked, near door locked for good, checkpoint set, next bay started', () => {
    const s = ready();
    expect(s.locked('A1-far')).toBe(true);
    s.setGroup('mains', false);
    expect(s.locked('A1-near')).toBe(false);
    enter(s, 1);
    s.update(DT);
    s.press('A1', 0);
    s.clearEvents();
    run(s, AIRLOCK_CYCLE);
    expect(s.locked('A1-far')).toBe(false);
    expect(s.locked('A1-near')).toBe(true);
    expect(s.checkpoint).toBe('A1');
    expect(s.events).toContainEqual({ t: 'airlockCycled', airlock: 'A1', nearDoor: 'A1-near', farDoor: 'A1-far' });
    expect(s.events).toContainEqual({ t: 'bayStarted', bay: 'B2', squad: ['B2-G1', 'B2-G2'] });
    // nothing reopens the near door: power, presses, restarts.
    s.setGroup('mains', true);
    s.setGroup('mains', false);
    s.press('A1', 0);
    s.restart();
    expect(s.locked('A1-near')).toBe(true);
    expect(s.airlockPhase('A1')).toBe('sealed');
  });
  it('startAt(5) begins in A4 with bays 1-4 done', () => {
    const s = new CourseState(course());
    s.startAt(5);
    expect(s.bay).toBe(4);
    expect(s.currentBay.id).toBe('B5');
    expect(s.checkpoint).toBe('A4');
    expect(s.done.slice(0, 4)).toEqual([true, true, true, true]);
    expect(s.done[4]).toBe(false);
    expect(s.locked('A4-far')).toBe(false);
    expect(s.locked('A4-near')).toBe(true);
    expect(s.locked('A5-far')).toBe(true);
    expect(s.events).toEqual([{ t: 'bayStarted', bay: 'B5', squad: ['B5-G1', 'B5-G2'] }]);
  });
});

describe('gates', () => {
  it('lever unlocks for good', () => {
    const s = new CourseState(course());
    expect(s.locked('d-lever')).toBe(true);
    s.press('sw-lever', 1);
    expect(s.locked('d-lever')).toBe(false);
    run(s, 10);
    expect(s.locked('d-lever')).toBe(false);
  });
  it('bolt opens only from the named side (both sides tried)', () => {
    const s = new CourseState(course());
    s.setPlayer(0, 10, 0, 11, false); // north of the door; side is south (0, -1)
    expect(s.press('d-bolt', 0)).toBe(REFUSE_BOLT);
    expect(s.locked('d-bolt')).toBe(true);
    s.setPlayer(1, 10, 0, 9, false);
    expect(s.press('d-bolt', 1)).toBeNull();
    expect(s.locked('d-bolt')).toBe(false);
    expect(s.press('d-bolt', 0)).toBeNull();
    expect(s.locked('d-bolt')).toBe(false);
  });
  it('hold is open only while held (by anyone)', () => {
    const s = new CourseState(course());
    s.hold('h-hold', 0, true);
    s.hold('h-hold', 1, true);
    expect(s.locked('d-hold')).toBe(false);
    s.hold('h-hold', 0, false);
    expect(s.locked('d-hold')).toBe(false);
    s.hold('h-hold', 1, false);
    expect(s.locked('d-hold')).toBe(true);
  });
  it('timedHold closes 6 s after release', () => {
    const s = new CourseState(course());
    expect(TIMED_HOLD_AFTER).toBe(6);
    s.hold('h-timed', 0, true);
    run(s, 3);
    expect(s.locked('d-timed')).toBe(false);
    s.hold('h-timed', 0, false);
    run(s, 5.9);
    expect(s.locked('d-timed')).toBe(false);
    run(s, 0.1 + DT);
    expect(s.locked('d-timed')).toBe(true);
  });
  it('pair refuses at 1.1 s and accepts at 0.9 s, either order', () => {
    expect(PAIR_WINDOW).toBe(1);
    const s = new CourseState(course());
    s.press('sw-pa', 0);
    s.update(1.1);
    s.press('sw-pb', 1);
    expect(s.locked('d-pair')).toBe(true);
    s.update(1.1);
    s.press('sw-pa', 0);
    expect(s.locked('d-pair')).toBe(true);
    s.update(5);
    s.press('sw-pb', 1);
    s.update(0.9);
    s.press('sw-pa', 0);
    expect(s.locked('d-pair')).toBe(false);
  });
  it('egress unlocks all its doors for good', () => {
    const s = new CourseState(course());
    expect(s.locked('d-eg1') && s.locked('d-eg2')).toBe(true);
    s.press('sw-egress', 0);
    expect(s.locked('d-eg1') || s.locked('d-eg2')).toBe(false);
  });
  it('mains unlocks while the group is off and relocks on power back', () => {
    const s = new CourseState(course());
    expect(s.locked('A1-near')).toBe(true);
    s.setGroup('mains', false);
    expect(s.locked('A1-near')).toBe(false);
    s.setGroup('mains', true);
    expect(s.locked('A1-near')).toBe(true);
    // both inside the next airlock when power comes back: stays unlocked.
    s.setGroup('mains', false);
    enter(s, 1);
    s.update(DT);
    s.setGroup('mains', true);
    expect(s.locked('A1-near')).toBe(false);
  });
  it('flag, anchorLock and pickups', () => {
    const s = new CourseState(course());
    expect(s.locked('d-flag')).toBe(true);
    expect(s.anchorLocked('rope-1')).toBe(true);
    s.press('sw-key', 0);
    expect(s.hasFlag('key')).toBe(true);
    expect(s.locked('d-flag')).toBe(false);
    expect(s.anchorLocked('rope-1')).toBe(false);
    s.press('sw-card', 1);
    expect(s.hasFlagFor('card', 1)).toBe(true);
    expect(s.hasFlagFor('card', 0)).toBe(false);
    expect(s.hasFlag('card')).toBe(true);
  });
});

describe('restart and stats', () => {
  it('both downed for RESTART_DELAY restarts only the current bay; drills stay ticked', () => {
    // bay 2 gets a lever and a pickup to check they reset while bay 1's stay.
    const t = new CourseState({
      ...course(),
      bays: course().bays.map((b, i) => (i === 1 ? { ...b, gates: [{ kind: 'lever', id: 'g2', switchId: 'sw-lever2', doorId: 'd2' }, { kind: 'pickup', id: 'p2', switchId: 'sw-p2', flag: 'k2', perPlayer: false }] } : b)),
    });
    t.press('sw-lever', 0);
    t.press('sw-key', 0);
    finishBay1Drills(t);
    enter(t, 1);
    t.update(DT);
    t.press('A1', 0);
    run(t, AIRLOCK_CYCLE);
    expect(t.bay).toBe(1);
    t.press('sw-lever2', 1);
    t.press('sw-p2', 1);
    t.tick(1, 'vault');
    expect(t.locked('d2')).toBe(false);
    t.setPlayer(0, 0, 0, 0, true);
    t.setPlayer(1, 0, 0, 0, true);
    t.clearEvents();
    run(t, RESTART_DELAY - 0.1);
    expect(t.events.some((e) => e.t === 'bayRestart')).toBe(false);
    run(t, 0.2);
    expect(t.events).toContainEqual({ t: 'bayRestart', bay: 'B2', squad: ['B2-G1', 'B2-G2'] });
    expect(t.locked('d2')).toBe(true);
    expect(t.hasFlag('k2')).toBe(false);
    expect(t.locked('d-lever')).toBe(false);
    expect(t.hasFlag('key')).toBe(true);
    expect(t.drillTicks('d-lead2', 1)).toBe(1);
    expect(t.drillsDone()).toBe(true);
    expect(t.done[0]).toBe(true);
    expect(t.checkpoint).toBe('A1');
    expect(t.restart()).toEqual(['B2-G1', 'B2-G2']);
  });
  it('per-bay stats add up', () => {
    const s = new CourseState(course());
    s.record('detections');
    s.record('kills', 2);
    run(s, 2);
    finishBay1Drills(s);
    enter(s, 1);
    s.update(DT);
    s.press('A1', 0);
    run(s, AIRLOCK_CYCLE);
    s.record('detections', 3);
    s.record('revives');
    s.record('teamMoves');
    s.record('knockouts');
    s.record('alarms');
    run(s, 1);
    const tot = s.totals();
    expect(s.stats[0]!.detections).toBe(1);
    expect(s.stats[1]!.detections).toBe(3);
    expect(tot.detections).toBe(4);
    expect(tot.kills).toBe(2);
    expect(tot.revives + tot.teamMoves + tot.knockouts + tot.alarms).toBe(4);
    expect(tot.time).toBeCloseTo(s.stats[0]!.time + s.stats[1]!.time, 9);
    expect(tot.time).toBeCloseTo(s.clock, 6);
  });
});

describe('pack / apply', () => {
  it('round trips through JSON', () => {
    const s = new CourseState(course());
    s.press('sw-lever', 0);
    s.press('sw-card', 1);
    s.hold('h-timed', 0, true);
    s.hold('h-timed', 0, false);
    s.press('sw-pa', 1);
    s.setGroup('mains', false);
    s.record('kills');
    finishBay1Drills(s);
    enter(s, 1);
    s.update(DT);
    s.press('A1', 0);
    run(s, 1);
    const packed = JSON.parse(JSON.stringify(s.pack())) as PackedCourse;
    const c = new CourseState(course());
    c.apply(packed);
    expect(c.pack()).toEqual(s.pack());
    expect(packed.locks).toContain('A1-far');
    expect(packed.locks).not.toContain('d-lever');
    expect(packed.anchors).toEqual(['rope-1']);
    expect(c.airlockPhase('A1')).toBe('cycling');
    enter(c, 1); // feet are per-step inputs, not packed state
    run(c, AIRLOCK_CYCLE);
    run(s, AIRLOCK_CYCLE);
    expect(c.pack()).toEqual(s.pack());
  });
});
