/**
 * marlow-final N1: objective steps with per-player lines, the flag drill tick (gap list 6a) and role claims (6b).
 * Co-op parity rides the existing `PackedCourse` (flags, gates): the packed shape does not change.
 */
import { describe, expect, it } from 'vitest';
import { bayObjective, leadOf, registerCourse, registeredBayCount, validateCourse, type AirlockDef, type BayDef, type CourseDef, type CourseKnownIds, type CourseObjective } from '../src/game/course/courseDef';
import { CourseState, ROLE_HOLD, type PackedCourse } from '../src/game/course/courseState';

function airlock(k: number): AirlockDef {
  return { id: `L${k}`, box: [100 * k, 0, 100 * k + 6, 6], floorY: 0, nearDoor: `L${k}-near`, farDoor: `L${k}-far` };
}

function bay(k: number, n: number, extra: Partial<BayDef> = {}): BayDef {
  return { id: `A${k}`, entry: k === 1 ? 'start' : `L${k - 1}`, exit: k === n ? 'end' : `L${k}`, squad: [], gates: [], radio: [], drills: [], elements: [], ...extra };
}

const KNOWN: CourseKnownIds = { doors: ['L1-near', 'L1-far', 'g-door'], switches: ['sw-1', 'sw-2', 'sw-key'], holds: [], anchors: [], groups: ['g21'] };

/** Two bays; bay A1 has a lever gate, a pickup, steps; A2 a final line only. */
function def(objectives: CourseObjective[], extra: Partial<BayDef> = {}, ext: string[] = ['b-past', 'both-past', 'at-t1', 'at-t2']): CourseDef {
  return {
    id: 'n1',
    airlocks: [airlock(1)],
    externalFlags: ext,
    bays: [
      bay(1, 2, {
        gates: [
          { kind: 'lever', id: 'g-lever', switchId: 'sw-1', doorId: 'g-door' },
          { kind: 'pickup', id: 'g-key', switchId: 'sw-key', flag: 'key', perPlayer: true },
        ],
        ...extra,
      }),
      bay(2, 2),
    ],
    objectives,
  };
}

const STEPS: CourseObjective[] = [
  { id: 's-neck', bay: 'A1', text: 'Cut the neck lights and cross.', a: 'Isolate at cabinet one.', b: 'Cross to cabinet two.', done: { flag: 'b-past' } },
  { id: 's-back', bay: 'A1', text: 'Now the other way round.', a: 'Cross behind him.', b: 'Isolate at cabinet two.', done: [{ gate: 'g-lever' }, { flag: 'both-past' }] },
  { id: 's-split', bay: 'A1', text: 'Each to a terminal.', done: { all: [{ flag: 'at-t1' }, { flag: 'at-t2' }] } },
  { id: 's-lock', bay: 'A1', text: 'Both of you into holding room one.' },
];

const at = (st: CourseState, p: 0 | 1, x: number, y = 0, z = 0): void => st.setPlayer(p, x, y, z, false);

describe('N1 validateCourse', () => {
  it('accepts steps whose flags are set somewhere and whose gates exist', () => {
    expect(() => validateCourse(def(STEPS), KNOWN)).not.toThrow();
  });
  it('keeps the old one-line bay objective valid, and bayObjective returns it', () => {
    const d = def([{ id: 'o1', bay: 'A1', text: 'Get over the wall.' }]);
    expect(() => validateCourse(d, KNOWN)).not.toThrow();
    expect(bayObjective(d, 'A1')).toBe('Get over the wall.');
  });
  it('bayObjective is the final line, not a step with a done condition', () => {
    expect(bayObjective(def(STEPS), 'A1')).toBe('Both of you into holding room one.');
  });
  it('rejects a flag nothing sets, an unknown gate, long role lines, an unknown or untimed timer', () => {
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', done: { flag: 'nope' } }]), KNOWN)).toThrow(/x: flag 'nope' is never set/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', done: { gate: 'g-none' } }]), KNOWN)).toThrow(/unknown gate/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', a: 'a'.repeat(91) }]), KNOWN)).toThrow(/A line is 91 characters/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', b: 'b'.repeat(91) }]), KNOWN)).toThrow(/B line/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', timer: 'g-none' }]), KNOWN)).toThrow(/unknown timer gate/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', timer: 'g-lever' }]), KNOWN)).toThrow(/not timed/);
    expect(() => validateCourse(def([{ id: 'x', bay: 'A1', text: 't', done: [] }]), KNOWN)).toThrow(/empty done/);
  });
  it('checks role claims', () => {
    expect(() => validateCourse(def(STEPS, { roles: [{ role: 'a', press: ['sw-none'] }] }), KNOWN)).toThrow(/unknown switch 'sw-none'/);
    expect(() => validateCourse(def(STEPS, { roles: [{ role: 'a' }] }), KNOWN)).toThrow(/names a press or a zone/);
  });
});

describe('N1 steps', () => {
  it('latch in route order from flags and gates; the current step and the final line follow', () => {
    const st = new CourseState(def(STEPS));
    expect(st.stepsOf().map((o) => o.id)).toEqual(['s-neck', 's-back', 's-split', 's-lock']);
    expect(st.currentStep()?.id).toBe('s-neck');
    st.setFlag('b-past');
    st.update(1 / 60);
    expect(st.isStepDone('s-neck')).toBe(true);
    expect(st.currentStep()?.id).toBe('s-back');
    // any of: the lever gate opening is enough
    st.press('sw-1', 0);
    st.update(1 / 60);
    expect(st.isStepDone('s-back')).toBe(true);
    // all of: one terminal is not enough
    st.setFlag('at-t1');
    st.update(1 / 60);
    expect(st.currentStep()?.id).toBe('s-split');
    st.setFlag('at-t2');
    st.update(1 / 60);
    expect(st.currentStep()).toBeNull();
    expect(st.finalStep()?.id).toBe('s-lock');
    expect(st.isStepDone('s-lock')).toBe(false);
    expect(st.events.filter((e) => e.t === 'stepDone').map((e) => (e as { step: string }).step)).toEqual(['s-neck', 's-back', 's-split']);
  });
  it('stay done when the condition clears (a timed window), until the bay restarts', () => {
    const st = new CourseState(def(STEPS));
    st.setFlag('b-past');
    st.update(1 / 60);
    st.clearFlag('b-past');
    st.update(1 / 60);
    expect(st.isStepDone('s-neck')).toBe(true);
    st.restart();
    expect(st.isStepDone('s-neck')).toBe(false);
    expect(st.currentStep()?.id).toBe('s-neck');
  });
  it('a `who` condition reads the per-player flag of that job only', () => {
    const d = def([{ id: 's-key', bay: 'A1', text: 'B takes the key.', done: { flag: 'key', who: 'b' } }], {}, []);
    const st = new CourseState(validateCourse(d, KNOWN));
    // bay 1: P1 is A, P2 is B
    st.press('sw-key', 0);
    st.update(1 / 60);
    expect(st.isStepDone('s-key')).toBe(false);
    st.press('sw-key', 1);
    st.update(1 / 60);
    expect(st.isStepDone('s-key')).toBe(true);
  });
  it('each player gets the line of their job (A = the lead by the swap rule)', () => {
    const st = new CourseState(def(STEPS));
    const o = st.currentStep()!;
    expect(leadOf(0)).toBe(0);
    expect(st.stepLine(o, 0)).toBe('Isolate at cabinet one.');
    expect(st.stepLine(o, 1)).toBe('Cross to cabinet two.');
    // a step without role lines: the shared line for both
    expect(st.stepLine(STEPS[2]!, 1)).toBe('Each to a terminal.');
  });
  it('a step without done is done with its bay', () => {
    const st = new CourseState(def(STEPS));
    st.startAt(2);
    expect(st.isStepDone('s-lock')).toBe(true);
  });
});

describe('gap list 6a: flag drills', () => {
  const drills = (): Partial<BayDef> => ({
    drills: [
      { id: 'd-both', verb: 'flag:both-past', who: 'both', text: 'Both past the camera.', marker: { x: 0, y: 0, z: 0 } },
      { id: 'd-key', verb: 'flag:key', who: 'both', text: 'Each take a key.', marker: 'sw-key' },
    ],
  });
  it('a shared flag ticks every player the drill is open for', () => {
    const st = new CourseState(def([], drills()));
    st.setFlag('both-past');
    expect(st.drillTicks('d-both', 0)).toBe(1);
    expect(st.drillTicks('d-both', 1)).toBe(1);
    expect(st.events.some((e) => e.t === 'drillDone' && e.drill === 'd-both' && e.complete)).toBe(true);
  });
  it('a per-player flag (a perPlayer pickup) ticks that player only', () => {
    const st = new CourseState(def([], drills()));
    st.press('sw-key', 1);
    expect(st.drillTicks('d-key', 1)).toBe(1);
    expect(st.drillTicks('d-key', 0)).toBe(0);
    expect(st.nextDrill(0)?.id).toBe('d-both');
  });
  it('a verb tick does not match a flag drill', () => {
    const st = new CourseState(def([], drills()));
    st.tick(0, 'flag');
    st.tick(0, 'both-past');
    expect(st.drillTicks('d-both', 0)).toBe(0);
  });
});

describe('gap list 6b: role claims', () => {
  it('the first press of a claim device takes its job; later claims change nothing; a restart clears it', () => {
    const st = new CourseState(def(STEPS, { roles: [{ role: 'a', press: ['sw-1'] }, { role: 'b', press: ['sw-2'] }] }));
    expect(st.lead).toBe(0);
    st.press('sw-1', 1);
    expect(st.lead).toBe(1);
    expect(st.roleOf(1)).toBe('a');
    expect(st.stepLine(st.currentStep()!, 1)).toBe('Isolate at cabinet one.');
    st.press('sw-2', 1);
    expect(st.lead).toBe(1);
    st.restart();
    expect(st.lead).toBe(0);
    // a B claim makes the other player A
    st.press('sw-2', 0);
    expect(st.lead).toBe(1);
  });
  it('a zone claims for the first player standing in it (feet height range too); a player not there never claims', () => {
    const st = new CourseState(def(STEPS, { roles: [{ role: 'a', zone: { box: [10, 0, 14, 4], y0: 4 } }] }));
    at(st, 0, 0, 0, 0);
    st.update(1 / 60);
    expect(st.roleClaimed()).toBe(false);
    at(st, 0, 12, 0, 2); // under the gallery: too low
    st.update(1 / 60);
    expect(st.roleClaimed()).toBe(false);
    at(st, 1, 12, 4.4, 2);
    st.update(1 / 60);
    expect(st.roleClaimed()).toBe(true);
    expect(st.lead).toBe(1);
    expect(st.events.some((e) => e.t === 'roleClaimed' && e.a === 1)).toBe(true);
  });
  it('a restart clears a zone claim and holds the zone ROLE_HOLD s, so feet still in it before the respawn do not re-claim', () => {
    const st = new CourseState(def(STEPS, { roles: [{ role: 'a', zone: { box: [10, 0, 14, 4] } }] }));
    at(st, 1, 12, 0, 2);
    st.update(1 / 60);
    expect(st.lead).toBe(1);
    st.restart();
    expect(st.roleClaimed()).toBe(false);
    for (let t = 0; t < ROLE_HOLD - 0.1; t += 1 / 60) st.update(1 / 60);
    expect(st.roleClaimed()).toBe(false);
    for (let t = 0; t < 0.2; t += 1 / 60) st.update(1 / 60);
    expect(st.roleClaimed()).toBe(true);
  });
  it('a claim moves lead / second drills with it', () => {
    const st = new CourseState(def([], { roles: [{ role: 'a', press: ['sw-1'] }], drills: [{ id: 'd-lead', verb: 'boost', who: 'lead', text: 'Boost.', marker: { x: 0, y: 0, z: 0 } }] }));
    expect(st.drillIsFor(st.currentBay.drills[0]!, 0)).toBe(true);
    st.press('sw-1', 1);
    expect(st.drillIsFor(st.currentBay.drills[0]!, 0)).toBe(false);
    expect(st.drillIsFor(st.currentBay.drills[0]!, 1)).toBe(true);
  });
});

describe('N1 co-op parity (no wire shape change)', () => {
  it('the mirror shows the same steps, roles and lines from the packed state; the packed keys are unchanged', () => {
    const d = def(STEPS, { roles: [{ role: 'b', press: ['sw-2'] }] });
    const host = new CourseState(d);
    const keys = Object.keys(host.pack()).sort();
    host.press('sw-2', 0);
    host.setFlag('b-past');
    host.update(1 / 60);
    const wire = JSON.parse(JSON.stringify(host.pack())) as PackedCourse;
    expect(Object.keys(wire).sort()).toEqual(keys);
    const mirror = new CourseState(d);
    mirror.apply(wire);
    expect(mirror.isStepDone('s-neck')).toBe(true);
    expect(mirror.currentStep()?.id).toBe('s-back');
    expect(mirror.lead).toBe(1);
    expect(mirror.stepLine(mirror.currentStep()!, 0)).toBe('Isolate at cabinet two.');
  });
});

describe('N8: registered course bays', () => {
  it('counts the registered course, 0 before one registers', () => {
    expect(registeredBayCount('n8-map')).toBe(0);
    registerCourse('n8-map', def(STEPS));
    expect(registeredBayCount('n8-map')).toBe(2);
  });
});

describe('marlow-final A8: a door named by two gates', () => {
  it('is locked only while neither gate is open (the grille: a lever here, the request-to-exit there)', () => {
    const st = new CourseState(def([], { gates: [
      { kind: 'lever', id: 'g-lever', switchId: 'sw-1', doorId: 'g-door' },
      { kind: 'egress', id: 'g-rte', switchId: 'sw-2', doorIds: ['g-door'] },
    ] }));
    expect(st.locked('g-door')).toBe(true);
    st.press('sw-2', 0);
    expect(st.locked('g-door')).toBe(false);
    expect(st.locked('L1-near')).toBe(false);
  });
  it('the lever alone opens it too, with the request-to-exit shut', () => {
    const st = new CourseState(def([], { gates: [
      { kind: 'lever', id: 'g-lever', switchId: 'sw-1', doorId: 'g-door' },
      { kind: 'egress', id: 'g-rte', switchId: 'sw-2', doorIds: ['g-door'] },
    ] }));
    st.press('sw-1', 0);
    expect(st.locked('g-door')).toBe(false);
  });
  it("two non-egress gates on one door must both open (Fallow's L9 lift door: every key)", () => {
    const st = new CourseState(def([], { gates: [
      { kind: 'pickup', id: 'g-key-a', switchId: 'pk-a', flag: 'key-a', perPlayer: false },
      { kind: 'pickup', id: 'g-key-b', switchId: 'pk-b', flag: 'key-b', perPlayer: false },
      { kind: 'flag', id: 'g-lift-a', flag: 'key-a', doorId: 'g-door' },
      { kind: 'flag', id: 'g-lift-b', flag: 'key-b', doorId: 'g-door' },
    ] }));
    expect(st.locked('g-door')).toBe(true);
    st.press('pk-a', 0);
    expect(st.locked('g-door')).toBe(true);
    st.press('pk-b', 1);
    expect(st.locked('g-door')).toBe(false);
  });
});
