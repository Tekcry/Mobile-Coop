import { describe, expect, it } from 'vitest';
import type { AirlockDef, BayDef, CourseDef, CourseLayout } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { CONSOLE_DONE, CONSOLE_GUARD_UP, cameraOff, consoleErrors, consoleFor, consoleRefusal, type SecurityConsole } from '../src/game/course/securityRoom';

const CON: SecurityConsole = { id: 'sw-con', guard: 'sec-guard', flag: 'cams-off' };

function airlock(k: number): AirlockDef {
  return { id: `A${k}`, box: [100 * k, 0, 100 * k + 6, 6], floorY: 0, nearDoor: `A${k}-near`, farDoor: `A${k}-far` };
}

function bay(k: number, extra: Partial<BayDef> = {}): BayDef {
  return { id: `B${k}`, entry: k === 1 ? 'start' : `A${k - 1}`, exit: k === 2 ? 'end' : `A${k}`, squad: [], gates: [], radio: [], drills: [], elements: [], ...extra };
}

/** Two bays: bay 1 has the security room (guard, console pickup), bay 2 nothing. */
function def(): CourseDef {
  return {
    id: 'sec',
    airlocks: [airlock(1)],
    bays: [bay(1, { squad: ['sec-guard'], gates: [{ kind: 'pickup', id: 'g-cams', switchId: 'sw-con', flag: 'cams-off', perPlayer: false }] }), bay(2)],
  };
}

function layout(d: CourseDef = def()): CourseLayout {
  return {
    def: d,
    doors: {},
    devices: { 'sw-con': { x: 0, y: 0.9, z: 0, yaw: 0 } },
    squads: { 'sec-guard': { kind: 'grunt', x: 1, z: 1, yaw: 0, passive: true } },
    consoles: [CON],
  };
}

const CAMS = [{ id: 'cam-1', offFlag: 'cams-off' }, { id: 'cam-2' }];

describe('securityRoom', () => {
  it('consoleRefusal: guard up first, then already done, else none', () => {
    expect(consoleRefusal(true, false)).toBe(CONSOLE_GUARD_UP);
    expect(consoleRefusal(true, true)).toBe(CONSOLE_GUARD_UP);
    expect(consoleRefusal(false, true)).toBe(CONSOLE_DONE);
    expect(consoleRefusal(false, false)).toBeNull();
    expect(CONSOLE_GUARD_UP.length).toBeLessThanOrEqual(90);
    expect(CONSOLE_DONE.length).toBeLessThanOrEqual(90);
  });

  it('consoleFor: hit and miss', () => {
    expect(consoleFor([CON], 'sw-con')).toBe(CON);
    expect(consoleFor([CON], 'sw-other')).toBeNull();
    expect(consoleFor(undefined, 'sw-con')).toBeNull();
    expect(consoleFor([], 'sw-con')).toBeNull();
  });

  it('cameraOff: no flag, flag unset, set, has undefined', () => {
    const set = new Set<string>();
    const has = (f: string): boolean => set.has(f);
    let calls = 0;
    const counted = (f: string): boolean => {
      calls++;
      return set.has(f);
    };
    expect(cameraOff({}, has)).toBe(false);
    expect(cameraOff({}, counted)).toBe(false);
    expect(calls).toBe(0);
    expect(cameraOff({ offFlag: 'cams-off' }, has)).toBe(false);
    set.add('cams-off');
    expect(cameraOff({ offFlag: 'cams-off' }, has)).toBe(true);
    expect(cameraOff({ offFlag: 'other' }, has)).toBe(false);
    expect(cameraOff({ offFlag: 'cams-off' }, undefined)).toBe(false);
  });

  it('consoleErrors: a valid layout is clean', () => {
    expect(consoleErrors(layout(), CAMS)).toEqual([]);
    const none = layout();
    delete none.consoles;
    expect(consoleErrors(none, [])).toEqual([]);
  });

  it('consoleErrors: missing device, slot, gate and an unnamed flag', () => {
    const noDev = layout();
    noDev.devices = {};
    expect(consoleErrors(noDev, CAMS).join('|')).toMatch(/no course device/);
    const noSlot = layout();
    noSlot.squads = {};
    expect(consoleErrors(noSlot, CAMS).join('|')).toMatch(/no squad slot 'sec-guard'/);
    const d = def();
    d.bays[0]!.gates = [];
    expect(consoleErrors(layout(d), CAMS).join('|')).toMatch(/no shared pickup gate/);
    // a per-player pickup is not the console's (the flag would be keyed per player)
    const pp = def();
    pp.bays[0]!.gates = [{ kind: 'pickup', id: 'g-cams', switchId: 'sw-con', flag: 'cams-off', perPlayer: true }];
    expect(consoleErrors(layout(pp), CAMS).join('|')).toMatch(/no shared pickup gate/);
    expect(consoleErrors(layout(), [{ id: 'cam-2' }]).join('|')).toMatch(/no camera has offFlag 'cams-off'/);
    // the guard must be the gate's bay's squad (a restart brings him back with the cameras)
    const away = def();
    away.bays[0]!.squad = [];
    away.bays[1]!.squad = ['sec-guard'];
    expect(consoleErrors(layout(away), CAMS).join('|')).toMatch(/not in the squad of bay 'B1'/);
  });

  it('CourseState: the console pickup sets the flag; a bay restart clears it and returns the guard slot', () => {
    const s = new CourseState(def());
    s.clearEvents();
    expect(s.hasFlag('cams-off')).toBe(false);
    expect(s.press('sw-con', 1)).toBeNull();
    expect(s.hasFlag('cams-off')).toBe(true);
    expect(s.isGateOpen('g-cams')).toBe(true);
    // the client's mirror reads the flag from the packed state (no wire change)
    const mirror = new CourseState(def());
    mirror.apply(JSON.parse(JSON.stringify(s.pack())));
    expect(mirror.hasFlag('cams-off')).toBe(true);
    expect(cameraOff(CAMS[0]!, (f) => mirror.hasFlag(f))).toBe(true);
    s.clearEvents();
    const squad = s.restart();
    expect(squad).toEqual(['sec-guard']);
    expect(s.events.some((e) => e.t === 'bayRestart')).toBe(true);
    expect(s.hasFlag('cams-off')).toBe(false);
    expect(s.isGateOpen('g-cams')).toBe(false);
    mirror.apply(JSON.parse(JSON.stringify(s.pack())));
    expect(cameraOff(CAMS[0]!, (f) => mirror.hasFlag(f))).toBe(false);
  });

  it('CourseState.hasShared: the shared flag only (the console flag reads the same as hasFlag), not a per-player key', () => {
    const s = new CourseState(def());
    expect(s.hasShared('cams-off')).toBe(false);
    s.press('sw-con', 0);
    expect(s.hasShared('cams-off')).toBe(true);
    expect(s.hasShared('cams-off')).toBe(s.hasFlag('cams-off'));
    const mirror = new CourseState(def());
    mirror.apply(JSON.parse(JSON.stringify(s.pack())));
    expect(mirror.hasShared('cams-off')).toBe(true);
    expect(cameraOff(CAMS[0]!, (f) => mirror.hasShared(f))).toBe(true);
    // a per-player key counts for hasFlag but not for the shared check
    s.setFlag('mine@1');
    expect(s.hasFlag('mine')).toBe(true);
    expect(s.hasShared('mine')).toBe(false);
    s.restart();
    expect(s.hasShared('cams-off')).toBe(false);
  });
});
