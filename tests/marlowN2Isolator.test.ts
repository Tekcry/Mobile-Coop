/**
 * marlow-final N2: the timed light isolator gate (two-way, re-arm, the warning, a mains gate on the same circuit, the
 * restart, co-op parity through `PackedCourse.gates[].t` / `tb`), and the StealthSystems door check that counts the
 * co-op partner (ENGINE-ANSWERS Q9).
 */
import { describe, expect, it } from 'vitest';
import { TIMED_WARN, timerLabel, validateCourse, warnKey, type AirlockDef, type BayDef, type CourseDef, type CourseKnownIds, type IsolatorGate } from '../src/game/course/courseDef';
import { CourseState, REFUSE_ISO_REARM, type PackedCourse } from '../src/game/course/courseState';
import { spotOccupied } from '../src/game/stealthSystems';

const DT = 1 / 60;

function airlock(k: number): AirlockDef {
  return { id: `L${k}`, box: [100 * k, 0, 100 * k + 6, 6], floorY: 0, nearDoor: `L${k}-near`, farDoor: `L${k}-far` };
}

function bay(k: number, extra: Partial<BayDef> = {}): BayDef {
  return { id: `A${k}`, entry: k === 1 ? 'start' : `L${k - 1}`, exit: k === 2 ? 'end' : `L${k}`, squad: [], gates: [], radio: [], drills: [], elements: [], ...extra };
}

const ISO: IsolatorGate = { kind: 'isolator', id: 'g-a2-iso', switchIds: ['cab-1', 'cab-2'], group: 'g21', seconds: 15, rearm: 3 };
const KNOWN: CourseKnownIds = { doors: ['L1-near', 'L1-far', 'grille'], switches: ['cab-1', 'cab-2'], holds: [], anchors: [], groups: ['g21'] };

function def(iso: IsolatorGate = ISO): CourseDef {
  return {
    id: 'n2',
    airlocks: [airlock(1)],
    bays: [
      bay(1, {
        gates: [iso, { kind: 'mains', id: 'g-grille', group: 'g21', doorId: 'grille' }],
        radio: [
          { at: 'g-a2-iso', text: 'Fifteen seconds of dark each time.' },
          { at: warnKey('g-a2-iso'), text: 'Lights back in five.' },
        ],
      }),
      bay(2),
    ],
    objectives: [{ id: 'a2-neck', bay: 'A1', text: 'Cut the neck lights and cross.', done: { gate: 'g-a2-iso' }, timer: 'g-a2-iso' }],
  };
}

function run(st: CourseState, s: number): void {
  for (let t = 0; t < s - 1e-9; t += DT) st.update(DT);
}

describe('N2 validateCourse', () => {
  it('accepts an isolator and checks its switches, group and seconds', () => {
    expect(() => validateCourse(def(), KNOWN)).not.toThrow();
    expect(() => validateCourse(def({ ...ISO, switchIds: ['cab-9'] }), KNOWN)).toThrow(/unknown switch 'cab-9'/);
    expect(() => validateCourse(def({ ...ISO, switchIds: [] }), KNOWN)).toThrow(/at least one switch/);
    expect(() => validateCourse(def({ ...ISO, group: 'g99' }), KNOWN)).toThrow(/unknown light group 'g99'/);
    expect(() => validateCourse(def({ ...ISO, seconds: 0 }), KNOWN)).toThrow(/seconds must be above 0/);
    expect(() => validateCourse(def({ ...ISO, rearm: -1 }), KNOWN)).toThrow(/rearm below 0/);
  });
});

describe('N2 isolator', () => {
  it('a press isolates for `seconds` (gateOpened), presses while dark do nothing, then it closes (gateClosed)', () => {
    const st = new CourseState(def());
    expect(st.press('cab-1', 0)).toBeNull();
    expect(st.isGateOpen('g-a2-iso')).toBe(true);
    expect(st.gateTimer('g-a2-iso')).toBe(15);
    expect(st.events.some((e) => e.t === 'gateOpened' && e.gate === 'g-a2-iso')).toBe(true);
    run(st, 4);
    // two-way: the other cabinet while dark does nothing (no refusal, the window keeps running)
    expect(st.press('cab-2', 1)).toBeNull();
    expect(st.gateTimer('g-a2-iso')).toBeCloseTo(11, 1);
    st.clearEvents();
    run(st, 11.1);
    expect(st.isGateOpen('g-a2-iso')).toBe(false);
    expect(st.events.some((e) => e.t === 'gateClosed' && e.gate === 'g-a2-iso')).toBe(true);
  });
  it('warns once as the window crosses its last TIMED_WARN s', () => {
    const st = new CourseState(def());
    st.press('cab-1', 0);
    st.clearEvents();
    run(st, 15 - TIMED_WARN - 0.1);
    expect(st.events.some((e) => e.t === 'gateWarn')).toBe(false);
    run(st, 0.2);
    expect(st.events.filter((e) => e.t === 'gateWarn' && e.gate === 'g-a2-iso')).toHaveLength(1);
  });
  it('re-arms after `rearm` s: a press in between is refused, then either cabinet works again', () => {
    const st = new CourseState(def());
    st.press('cab-1', 0);
    run(st, 15.1);
    expect(st.gateRearm('g-a2-iso')).toBeGreaterThan(2.5);
    expect(st.press('cab-2', 1)).toBe(REFUSE_ISO_REARM);
    expect(st.isGateOpen('g-a2-iso')).toBe(false);
    run(st, 3.1);
    expect(st.gateRearm('g-a2-iso')).toBe(0);
    expect(st.press('cab-2', 1)).toBeNull();
    expect(st.isGateOpen('g-a2-iso')).toBe(true);
  });
  it('no rearm: works again at once', () => {
    const st = new CourseState(def({ ...ISO, rearm: undefined }));
    st.press('cab-1', 0);
    run(st, 15.1);
    expect(st.press('cab-1', 0)).toBeNull();
  });
  it('the circuit back on by other means (a wall switch) ends the window early', () => {
    const st = new CourseState(def());
    st.press('cab-1', 0);
    st.setGroup('g21', false);
    run(st, 1);
    st.setGroup('g21', true);
    expect(st.isGateOpen('g-a2-iso')).toBe(false);
  });
  it('a mains gate on the circuit opens with the isolation (the mode turns the group off) and relocks after', () => {
    const st = new CourseState(def());
    expect(st.locked('grille')).toBe(true);
    st.press('cab-1', 0);
    st.setGroup('g21', false);
    expect(st.locked('grille')).toBe(false);
    run(st, 15.1);
    st.setGroup('g21', true);
    expect(st.locked('grille')).toBe(true);
  });
  it('a bay restart ends the window and the re-arm (gateClosed: the mode turns the circuit back on)', () => {
    const st = new CourseState(def());
    st.press('cab-1', 0);
    run(st, 2);
    st.clearEvents();
    st.restart();
    expect(st.isGateOpen('g-a2-iso')).toBe(false);
    expect(st.events.some((e) => e.t === 'gateClosed' && e.gate === 'g-a2-iso')).toBe(true);
    expect(st.gateRearm('g-a2-iso')).toBe(0);
    expect(st.press('cab-1', 0)).toBeNull();
  });
  it('N1: the step on the isolator latches and shows its timer with the isolator words', () => {
    const st = new CourseState(def());
    const o = st.currentStep()!;
    expect(st.stepTimer(o)).toBe(0);
    st.press('cab-1', 0);
    expect(st.stepTimer(o)).toBe(15);
    expect(timerLabel(ISO)).toBe('Lights back in');
    st.update(DT);
    expect(st.isStepDone('a2-neck')).toBe(true);
  });
});

describe('N2 co-op parity', () => {
  it('the window and the re-arm ride gates[].t / tb; the mirror runs the window down between messages', () => {
    const host = new CourseState(def());
    host.press('cab-1', 0);
    run(host, 5);
    const wire = JSON.parse(JSON.stringify(host.pack())) as PackedCourse;
    const mirror = new CourseState(def());
    mirror.apply(wire);
    expect(mirror.isGateOpen('g-a2-iso')).toBe(true);
    expect(mirror.gateTimer('g-a2-iso')).toBeCloseTo(10, 1);
    mirror.advanceMirror(1);
    expect(mirror.gateTimer('g-a2-iso')).toBeCloseTo(9, 1);
    // display only: the mirror never closes it on its own
    mirror.advanceMirror(20);
    expect(mirror.gateTimer('g-a2-iso')).toBe(0);
    expect(mirror.isGateOpen('g-a2-iso')).toBe(true);
    run(host, 10.1);
    mirror.apply(JSON.parse(JSON.stringify(host.pack())) as PackedCourse);
    expect(mirror.isGateOpen('g-a2-iso')).toBe(false);
    expect(mirror.gateRearm('g-a2-iso')).toBeGreaterThan(2.5);
  });
});

describe('ENGINE-ANSWERS Q9: a guard never shuts a door onto the partner', () => {
  const enemies = [{ alive: false, pos: { x: 0, z: 0 } }];
  it('counts the local player, every remote player and live enemies', () => {
    expect(spotOccupied(0, 0, 2.2, 10, 10, [], enemies)).toBe(false);
    expect(spotOccupied(0, 0, 2.2, 1, 0, [], enemies)).toBe(true);
    expect(spotOccupied(0, 0, 2.2, 10, 10, [{ feet: { x: 0.5, z: 0.5 } }], enemies)).toBe(true);
    expect(spotOccupied(0, 0, 2.2, 10, 10, [{ feet: { x: 5, z: 5 } }], [{ alive: true, pos: { x: 0, z: 1 } }])).toBe(true);
  });
});
