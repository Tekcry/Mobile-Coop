/**
 * marlow-final N3: the timed security console (the loop's seconds, the flag clear, the re-arm, the HUD timer, parity
 * through `PackedCourse.flags` / `gates[]`), and the untimed console unchanged.
 */
import { describe, expect, it } from 'vitest';
import { timerLabel, validateCourse, type AirlockDef, type BayDef, type CourseDef, type CourseLayout } from '../src/game/course/courseDef';
import { CourseState, REFUSE_CONSOLE_REARM, type PackedCourse } from '../src/game/course/courseState';
import { CONSOLE_DONE, CONSOLE_REARM, cameraOff, consoleCamMode, consoleErrors, consoleRefusal, type SecurityConsole } from '../src/game/course/securityRoom';

const DT = 1 / 60;
const CON: SecurityConsole = { id: 'sw-con', guard: 'a4-officer', flag: 'a4-loop', seconds: 60, rearm: 20 };

function airlock(k: number): AirlockDef {
  return { id: `L${k}`, box: [100 * k, 0, 100 * k + 6, 6], floorY: 0, nearDoor: `L${k}-near`, farDoor: `L${k}-far` };
}

function bay(k: number, extra: Partial<BayDef> = {}): BayDef {
  return { id: `A${k}`, entry: k === 1 ? 'start' : `L${k - 1}`, exit: k === 2 ? 'end' : `L${k}`, squad: [], gates: [], radio: [], drills: [], elements: [], ...extra };
}

function def(): CourseDef {
  return {
    id: 'n3',
    airlocks: [airlock(1)],
    bays: [
      bay(1, {
        squad: ['a4-officer'],
        gates: [
          { kind: 'pickup', id: 'g-a4-loop', switchId: 'sw-con', flag: 'a4-loop', perPlayer: false },
          { kind: 'flag', id: 'g-a4-gate', flag: 'a4-loop', doorId: 'a4-door' },
        ],
      }),
      bay(2),
    ],
    objectives: [
      { id: 'a4-room', bay: 'A1', text: 'Loop the floor cameras from his desk.', done: { flag: 'a4-loop' } },
      { id: 'a4-floor', bay: 'A1', text: 'The cameras are blind for sixty seconds.', done: { flag: 'west' }, timer: 'g-a4-loop' },
    ],
    externalFlags: ['west'],
  };
}

function layout(c: SecurityConsole = CON): CourseLayout {
  return { def: def(), doors: {}, devices: { 'sw-con': { x: 0, y: 0.9, z: 0, yaw: 0 } }, squads: { 'a4-officer': { kind: 'grunt', x: 1, z: 1, yaw: 0, passive: true } }, consoles: [c] };
}

function run(st: CourseState, s: number): void {
  for (let t = 0; t < s - 1e-9; t += DT) st.update(DT);
}

const CAMS = [{ id: 'c1', offFlag: 'a4-loop' }];

describe('N3 timed console', () => {
  it('validates (the steps read flags the console and a pass zone set)', () => {
    expect(() => validateCourse(def(), { doors: ['L1-near', 'L1-far', 'a4-door'], switches: ['sw-con'], holds: [], anchors: [], groups: [] })).not.toThrow();
    expect(consoleErrors(layout(), CAMS)).toEqual([]);
  });
  it('consoleErrors: seconds above 0, rearm not below 0', () => {
    expect(consoleErrors(layout({ ...CON, seconds: 0 }), CAMS)).toEqual(['sw-con: seconds must be above 0']);
    expect(consoleErrors(layout({ ...CON, rearm: -1 }), CAMS)).toEqual(['sw-con: rearm below 0']);
  });
  it('loops the cameras for `seconds`, then clears the flag (cameras back, flag gates relock); the step stays done', () => {
    const st = new CourseState(def(), [CON]);
    st.press('sw-con', 1);
    const has = (f: string): boolean => st.hasShared(f);
    expect(cameraOff(CAMS[0]!, has)).toBe(true);
    expect(st.locked('a4-door')).toBe(false);
    expect(st.gateTimer('g-a4-loop')).toBe(60);
    st.update(DT);
    expect(st.isStepDone('a4-room')).toBe(true);
    // the next step shows the loop's seconds left
    expect(st.stepTimer(st.currentStep()!)).toBeCloseTo(60 - DT, 3);
    expect(timerLabel(def().bays[0]!.gates[0])).toBe('Cameras back in');
    st.clearEvents();
    run(st, 60);
    expect(st.hasShared('a4-loop')).toBe(false);
    expect(cameraOff(CAMS[0]!, has)).toBe(false);
    expect(st.locked('a4-door')).toBe(true);
    expect(st.events.some((e) => e.t === 'flagCleared' && e.flag === 'a4-loop')).toBe(true);
    expect(st.events.some((e) => e.t === 'gateWarn' && e.gate === 'g-a4-loop')).toBe(true);
    expect(st.isStepDone('a4-room')).toBe(true);
  });
  it('one loop at a time, then the re-arm refuses until it ends', () => {
    const st = new CourseState(def(), [CON]);
    st.press('sw-con', 0);
    run(st, 10);
    expect(st.press('sw-con', 0)).toBeNull();
    expect(st.gateTimer('g-a4-loop')).toBeCloseTo(50, 1);
    run(st, 50.1);
    expect(st.press('sw-con', 0)).toBe(REFUSE_CONSOLE_REARM);
    expect(st.hasShared('a4-loop')).toBe(false);
    run(st, 20);
    expect(st.press('sw-con', 0)).toBeNull();
    expect(st.hasShared('a4-loop')).toBe(true);
  });
  it('the mode refusal order: guard up, cameras already off, re-arming', () => {
    expect(consoleRefusal(true, true, true)).toContain('Take him out');
    expect(consoleRefusal(false, true, true)).toBe(CONSOLE_DONE);
    expect(consoleRefusal(false, false, true)).toBe(CONSOLE_REARM);
    expect(consoleRefusal(false, false)).toBeNull();
  });
  it('a restart clears the loop and the re-arm', () => {
    const st = new CourseState(def(), [CON]);
    st.press('sw-con', 0);
    run(st, 61);
    st.restart();
    expect(st.gateRearm('g-a4-loop')).toBe(0);
    expect(st.press('sw-con', 0)).toBeNull();
  });
  it('an untimed console keeps the old behaviour: the flag stays until the restart', () => {
    const st = new CourseState(def(), [{ id: 'sw-con', guard: 'a4-officer', flag: 'a4-loop' }]);
    st.press('sw-con', 0);
    run(st, 120);
    expect(st.hasShared('a4-loop')).toBe(true);
    expect(st.gateTimer('g-a4-loop')).toBe(0);
  });
  it('the cameras show recorded footage while looped (the mode for the device owner)', () => {
    expect(consoleCamMode()).toBe('looped');
  });
});

describe('N3 co-op parity', () => {
  it('the flag, the window and the clear reach the mirror through the packed state', () => {
    const host = new CourseState(def(), [CON]);
    const mirror = new CourseState(def(), [CON]);
    host.press('sw-con', 1);
    run(host, 30);
    mirror.apply(JSON.parse(JSON.stringify(host.pack())) as PackedCourse);
    expect(mirror.hasShared('a4-loop')).toBe(true);
    expect(mirror.gateTimer('g-a4-loop')).toBeCloseTo(30, 1);
    expect(mirror.isStepDone('a4-room')).toBe(true);
    run(host, 30.1);
    mirror.apply(JSON.parse(JSON.stringify(host.pack())) as PackedCourse);
    expect(mirror.hasShared('a4-loop')).toBe(false);
    expect(mirror.isStepDone('a4-room')).toBe(true);
  });
});
