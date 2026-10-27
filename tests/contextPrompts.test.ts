// (context-prompts S1, PLAN sections 4 and 8) The context prompt model: focus by rank and score, sticky margin and
// dwell, the lock while a press is held and the cancel when the target leaves, tap on press vs tap on release and hold
// at CTX_HOLD, item fills and early release, holdToggle, scripted taps, ownership of A and of a taken Y press, and slot
// reuse (nothing allocated per step).
import { describe, expect, it } from 'vitest';
import {
  ContextPrompts,
  CTX_A,
  CTX_CANDS,
  CTX_FOCUS,
  CTX_HOLD,
  CTX_LT,
  CTX_RT,
  CTX_SLOT_BUTTON,
  CTX_Y,
  ctxRank,
  emptyCtxPromptInput,
  fillRow,
  labelRow,
  pairRow,
  tapRow,
  type CtxKind,
  type CtxPromptInput,
  type CtxPromptModel,
  type CtxPromptSink,
} from '../src/game/contextPrompts';
import { STANCE } from '../src/player/weaponStance';

const DT = 0.05;

interface T {
  kind: CtxKind;
  ref: number;
  dist: number;
  angle?: number;
  rows?: 'door' | 'doorHoldOnly' | 'guardFaced' | 'guardBehind' | 'lethal' | 'switch' | 'alarm' | 'rtOnly';
}

/** One step: the providers add `ts`, then `step`. */
function frame(m: ContextPrompts, inp: CtxPromptInput, ts: readonly T[], dt = DT): boolean {
  m.begin();
  for (const t of ts) {
    const c = m.add(t.kind, t.ref, t.dist, t.angle ?? 0, t.ref, 1.1, 0);
    switch (t.rows) {
      case 'door':
        pairRow(c, CTX_A, 'open', 'Open', 'bash', 'Bash');
        pairRow(c, CTX_Y, 'peek', 'Peek', 'optic', 'Optic cable');
        break;
      case 'doorHoldOnly':
        pairRow(c, CTX_A, 'open', 'Open', 'bash', 'Bash');
        pairRow(c, CTX_Y, '', '', 'optic', 'Optic cable');
        break;
      case 'guardFaced':
        pairRow(c, CTX_A, 'ko', 'Knock out', 'kill', 'Kill');
        labelRow(c, CTX_RT, 'Knock out', 'Kill');
        break;
      case 'guardBehind':
        tapRow(c, CTX_A, 'grab', 'Grab');
        labelRow(c, CTX_RT, 'Knock out', 'Kill');
        break;
      case 'lethal':
        pairRow(c, CTX_A, '', '', 'kill', 'Kill');
        break;
      case 'switch':
        tapRow(c, CTX_A, 'use', 'Lights off');
        break;
      case 'alarm':
        fillRow(c, CTX_A, 'use', 'Disable alarm', 1.0);
        break;
      case 'rtOnly':
        labelRow(c, CTX_RT, 'Knock out', 'Kill');
        break;
      default:
        tapRow(c, CTX_A, 'use', 'Use');
    }
  }
  return m.step(inp, dt);
}

function setBtn(b: CtxPromptInput['a'], down: boolean, pressed: boolean, released: boolean): void {
  b.down = down;
  b.pressed = pressed;
  b.released = released;
}

/** Real input helpers: press (down this step), hold, release. */
const pressA = (i: CtxPromptInput): void => setBtn(i.a, true, true, false);
const holdA = (i: CtxPromptInput): void => setBtn(i.a, true, false, false);
const releaseA = (i: CtxPromptInput): void => setBtn(i.a, false, false, true);
const idleA = (i: CtxPromptInput): void => setBtn(i.a, false, false, false);

describe('constants (A1, A3, A11)', () => {
  it('one hold time, the RT strike; the slot verbs; the focus numbers', () => {
    expect(CTX_HOLD).toBe(STANCE.rtHold);
    expect(CTX_HOLD).toBe(0.35);
    expect(CTX_SLOT_BUTTON[CTX_A]).toBe('interact');
    expect(CTX_SLOT_BUTTON[CTX_Y]).toBe('jump');
    expect(CTX_SLOT_BUTTON[CTX_RT]).toBe('fire');
    expect(CTX_SLOT_BUTTON[CTX_LT]).toBe('ads');
    expect(CTX_FOCUS).toEqual({ angleW: 1.0, margin: 0.25, dwell: 0.15, fade: 0.15 });
    expect(CTX_CANDS).toBe(8);
    expect(ctxRank('held')).toBeLessThan(ctxRank('guard'));
    expect(ctxRank('guard')).toBe(ctxRank('hostage'));
    expect(ctxRank('guard')).toBeLessThan(ctxRank('door'));
  });
});

describe('focus: rank, then distance + angle off the aim', () => {
  it('the best score wins among the rest; the angle weighs 1 m per radian', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [{ kind: 'door', ref: 1, dist: 1.0, rows: 'door' }, { kind: 'item', ref: 2, dist: 0.5, rows: 'switch' }]);
    expect([m.kind, m.ref]).toEqual(['item', 2]);
    const n = new ContextPrompts();
    frame(n, i, [{ kind: 'item', ref: 1, dist: 1.0, angle: 0.6 }, { kind: 'item', ref: 2, dist: 1.4, angle: 0 }]);
    expect(n.ref).toBe(2);
  });

  it('a takedown offer beats a nearer door; a held guard beats everything; a higher rank takes over at once', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [{ kind: 'door', ref: 1, dist: 0.4, rows: 'door' }]);
    expect(m.kind).toBe('door');
    frame(m, i, [{ kind: 'door', ref: 1, dist: 0.4, rows: 'door' }, { kind: 'guard', ref: 7, dist: 1.5, rows: 'guardFaced' }]);
    expect(m.kind).toBe('guard');
    const n = new ContextPrompts();
    frame(n, i, [{ kind: 'guard', ref: 7, dist: 0.2, rows: 'guardFaced' }, { kind: 'held', ref: 3, dist: 0.9, rows: 'rtOnly' }]);
    expect(n.kind).toBe('held');
  });

  it('nothing in reach: no focus, no rows, A free', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    pressA(i);
    expect(frame(m, i, [])).toBe(false);
    expect(m.kind).toBe('none');
    expect(m.shows(CTX_A)).toBe(false);
    expect(m.ctxOwnsA).toBe(false);
  });
});

describe('sticky focus: margin and dwell', () => {
  const near = (d: number): T => ({ kind: 'item', ref: 2, dist: d, rows: 'switch' });
  const cur: T = { kind: 'item', ref: 1, dist: 1.0, rows: 'switch' };

  it('a rival better by less than the margin never takes it', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [cur]);
    for (let k = 0; k < 20; k++) frame(m, i, [cur, near(0.8)]);
    expect(m.ref).toBe(1);
  });

  it('a rival better by the margin takes it after the dwell (0.15 s), not before', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [cur]);
    frame(m, i, [cur, near(0.6)]);
    frame(m, i, [cur, near(0.6)]);
    expect(m.ref).toBe(1);
    frame(m, i, [cur, near(0.6)]);
    expect(m.ref).toBe(2);
  });

  it('the dwell restarts when the rival drops back', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [cur]);
    frame(m, i, [cur, near(0.6)]);
    frame(m, i, [cur, near(0.6)]);
    frame(m, i, [cur, near(0.9)]);
    frame(m, i, [cur, near(0.6)]);
    frame(m, i, [cur, near(0.6)]);
    expect(m.ref).toBe(1);
    frame(m, i, [cur, near(0.6)]);
    expect(m.ref).toBe(2);
  });

  it('the focus leaving reach hands it to the best at once', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    frame(m, i, [cur, near(1.1)]);
    expect(m.ref).toBe(1);
    frame(m, i, [near(1.1)]);
    expect(m.ref).toBe(2);
  });
});

describe('lock while held; cancel when the target leaves or its row changes (A11, A12)', () => {
  it('A held on a door: a clearly better target does not take the focus; let go, it does after the dwell', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const door: T = { kind: 'door', ref: 1, dist: 1.2, rows: 'door' };
    const sw: T = { kind: 'item', ref: 2, dist: 0.3, rows: 'switch' };
    frame(m, i, [door]);
    pressA(i);
    frame(m, i, [door, sw]);
    holdA(i);
    for (let k = 0; k < 4; k++) frame(m, i, [door, sw]);
    expect(m.kind).toBe('door');
    expect(m.holdSlot).toBe(CTX_A);
    releaseA(i);
    expect(frame(m, i, [door, sw])).toBe(true);
    expect(m.run.opt).toBe('open');
    idleA(i);
    for (let k = 0; k < 3; k++) frame(m, i, [door, sw]);
    expect(m.kind).toBe('item');
  });

  it('the target leaves mid-hold: no action, and the press stays swallowed until let go', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardFaced' };
    const sw: T = { kind: 'item', ref: 2, dist: 0.5, rows: 'switch' };
    frame(m, i, [g]);
    pressA(i);
    frame(m, i, [g]);
    holdA(i);
    frame(m, i, [g]);
    expect(frame(m, i, [sw])).toBe(false);
    expect(m.holdSlot).toBe(-1);
    expect(m.kind).toBe('item');
    for (let k = 0; k < 10; k++) expect(frame(m, i, [sw])).toBe(false);
    expect(m.ctxOwnsA).toBe(true);
    releaseA(i);
    expect(frame(m, i, [sw])).toBe(false);
  });

  it('a guard turning mid-hold (Knock out / Kill becomes Grab) cancels: Knock out never turns into Kill', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const faced: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardFaced' };
    const behind: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardBehind' };
    frame(m, i, [faced]);
    pressA(i);
    frame(m, i, [faced]);
    holdA(i);
    frame(m, i, [faced]);
    for (let k = 0; k < 10; k++) expect(frame(m, i, [behind])).toBe(false);
    releaseA(i);
    expect(frame(m, i, [behind])).toBe(false);
  });

  it('RT down on a guard locks the focus', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1.5, rows: 'guardFaced' };
    const h: T = { kind: 'hostage', ref: 9, dist: 0.3, rows: 'switch' };
    frame(m, i, [g]);
    i.rtDown = true;
    for (let k = 0; k < 6; k++) frame(m, i, [g, h]);
    expect(m.kind).toBe('guard');
    i.rtDown = false;
    for (let k = 0; k < 3; k++) frame(m, i, [g, h]);
    expect(m.kind).toBe('hostage');
  });
});

describe('tap vs hold (A3, A6, A7)', () => {
  it('no hold action: the tap runs on the press; held on, nothing more; owned until let go', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardBehind' };
    frame(m, i, [g]);
    pressA(i);
    expect(frame(m, i, [g])).toBe(true);
    expect(m.run).toMatchObject({ slot: CTX_A, opt: 'grab', hold: false, kind: 'guard', ref: 7 });
    holdA(i);
    for (let k = 0; k < 20; k++) expect(frame(m, i, [g])).toBe(false);
    expect(m.ctxOwnsA).toBe(true);
    releaseA(i);
    expect(frame(m, i, [g])).toBe(false);
  });

  it('a pair: released before CTX_HOLD runs the tap on the release', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardFaced' };
    frame(m, i, [g]);
    pressA(i);
    expect(frame(m, i, [g])).toBe(false);
    holdA(i);
    for (let k = 0; k < 5; k++) expect(frame(m, i, [g])).toBe(false);
    expect(m.holdK).toBeGreaterThan(0.6);
    expect(m.holdK).toBeLessThan(1);
    releaseA(i);
    expect(frame(m, i, [g])).toBe(true);
    expect(m.run).toMatchObject({ opt: 'ko', hold: false });
  });

  it('a pair: held to CTX_HOLD runs the hold once; the release after it runs nothing', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    pressA(i);
    frame(m, i, [d]);
    holdA(i);
    const steps = Math.round(CTX_HOLD / DT);
    for (let k = 1; k < steps; k++) expect(frame(m, i, [d])).toBe(false);
    expect(frame(m, i, [d])).toBe(true);
    expect(m.run).toMatchObject({ slot: CTX_A, opt: 'bash', hold: true, kind: 'door', ref: 4 });
    expect(m.holdK).toBe(1);
    for (let k = 0; k < 10; k++) expect(frame(m, i, [d])).toBe(false);
    releaseA(i);
    expect(frame(m, i, [d])).toBe(false);
  });

  it('a hold-only pair (lethal-only guard): a tap does nothing, the hold kills', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'lethal' };
    frame(m, i, [g]);
    pressA(i);
    frame(m, i, [g]);
    releaseA(i);
    expect(frame(m, i, [g])).toBe(false);
    idleA(i);
    frame(m, i, [g]);
    pressA(i);
    frame(m, i, [g]);
    holdA(i);
    let ran = false;
    for (let k = 0; k < 10 && !ran; k++) ran = frame(m, i, [g]);
    expect(ran).toBe(true);
    expect(m.run.opt).toBe('kill');
  });

  it('works at the fixed step (1/60 s): the hold lands after 0.35 s', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d], 1 / 60);
    pressA(i);
    frame(m, i, [d], 1 / 60);
    holdA(i);
    let n = 0;
    while (!frame(m, i, [d], 1 / 60)) n++;
    expect((n + 1) / 60).toBeGreaterThanOrEqual(CTX_HOLD - 1e-9);
    expect((n + 1) / 60).toBeLessThan(CTX_HOLD + 1 / 60);
  });
});

describe('item fills (A9)', () => {
  it('fills while held and runs when full; the fill shows as holdK and holdT', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const al: T = { kind: 'item', ref: 3, dist: 1, rows: 'alarm' };
    frame(m, i, [al]);
    expect(m.rows[CTX_A]).toMatchObject({ hold: 'use', holdLabel: 'Disable alarm', holdTime: 1.0, fill: true, tap: '' });
    pressA(i);
    frame(m, i, [al]);
    holdA(i);
    for (let k = 0; k < 10; k++) frame(m, i, [al]);
    expect(m.holdT).toBeCloseTo(0.5, 6);
    expect(m.holdK).toBeCloseTo(0.5, 6);
    let ran = false;
    for (let k = 0; k < 10 && !ran; k++) ran = frame(m, i, [al]);
    expect(ran).toBe(true);
    expect(m.run).toMatchObject({ opt: 'use', hold: true, kind: 'item', ref: 3 });
  });

  it('let go early: nothing runs and the fill resets', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const al: T = { kind: 'item', ref: 3, dist: 1, rows: 'alarm' };
    frame(m, i, [al]);
    pressA(i);
    frame(m, i, [al]);
    holdA(i);
    for (let k = 0; k < 8; k++) frame(m, i, [al]);
    releaseA(i);
    expect(frame(m, i, [al])).toBe(false);
    expect(m.holdT).toBe(0);
    expect(m.holdK).toBe(0);
    expect(m.holdSlot).toBe(-1);
  });

  it('holdToggle: a tap starts the fill, it runs on with the button up; a second press stops it', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    i.holdToggle = true;
    const al: T = { kind: 'item', ref: 3, dist: 1, rows: 'alarm' };
    frame(m, i, [al]);
    pressA(i);
    frame(m, i, [al]);
    releaseA(i);
    frame(m, i, [al]);
    idleA(i);
    for (let k = 0; k < 5; k++) frame(m, i, [al]);
    expect(m.holdT).toBeGreaterThan(0.25);
    pressA(i);
    expect(frame(m, i, [al])).toBe(false);
    expect(m.holdSlot).toBe(-1);
    releaseA(i);
    frame(m, i, [al]);
    idleA(i);
    // started again, it runs to the end by itself
    pressA(i);
    frame(m, i, [al]);
    releaseA(i);
    let ran = false;
    for (let k = 0; k < 25 && !ran; k++) {
      ran = frame(m, i, [al]);
      idleA(i);
    }
    expect(ran).toBe(true);
    expect(m.run.hold).toBe(true);
  });

  it('holdToggle leaves the tap / hold pairs alone (G398)', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    i.holdToggle = true;
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    pressA(i);
    frame(m, i, [d]);
    releaseA(i);
    expect(frame(m, i, [d])).toBe(true);
    expect(m.run.opt).toBe('open');
  });
});

describe('scripted taps (tests and tools: pressed with the button up)', () => {
  it('run the tap at once on a pair; nothing on a fill or a hold-only row', () => {
    const i = emptyCtxPromptInput();
    const m = new ContextPrompts();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    setBtn(i.a, false, true, false);
    expect(frame(m, i, [d])).toBe(true);
    expect(m.run).toMatchObject({ opt: 'open', hold: false });
    expect(m.ctxOwnsA).toBe(true);
    const n = new ContextPrompts();
    const al: T = { kind: 'item', ref: 3, dist: 1, rows: 'alarm' };
    idleA(i);
    frame(n, i, [al]);
    setBtn(i.a, false, true, false);
    expect(frame(n, i, [al])).toBe(false);
    const k = new ContextPrompts();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'lethal' };
    idleA(i);
    frame(k, i, [g]);
    setBtn(i.a, false, true, false);
    expect(frame(k, i, [g])).toBe(false);
  });

  it('a real press and release within one step is a tap', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const g: T = { kind: 'guard', ref: 7, dist: 1, rows: 'guardFaced' };
    frame(m, i, [g]);
    setBtn(i.a, false, true, true);
    expect(frame(m, i, [g])).toBe(true);
    expect(m.run.opt).toBe('ko');
  });
});

describe('ownership (ctxOwnsA, ctxOwnsY)', () => {
  it('A: owned while the focus has an A row or a taken press is down; free otherwise', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const sw: T = { kind: 'item', ref: 2, dist: 1, rows: 'switch' };
    frame(m, i, [sw]);
    expect(m.ctxOwnsA).toBe(true);
    pressA(i);
    expect(frame(m, i, [sw])).toBe(true);
    holdA(i);
    // the switch used, the item gone: the press stays owned until let go
    frame(m, i, []);
    expect(m.ctxOwnsA).toBe(true);
    releaseA(i);
    frame(m, i, []);
    expect(m.ctxOwnsA).toBe(false);
    // a held guard with no A row (no information): A is not the context's
    idleA(i);
    frame(m, i, [{ kind: 'held', ref: 3, dist: 0.5, rows: 'rtOnly' }]);
    expect(m.ctxOwnsA).toBe(false);
    pressA(i);
    expect(frame(m, i, [{ kind: 'held', ref: 3, dist: 0.5, rows: 'rtOnly' }])).toBe(false);
    expect(m.ctxOwnsA).toBe(false);
  });

  it('Y: a press the rule gave is owned until release; tap peeks on the release, hold feeds the optic cable', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    i.yLive = true;
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    expect(m.ctxOwnsY).toBe(false);
    setBtn(i.y, true, true, false);
    expect(frame(m, i, [d])).toBe(false);
    expect(m.ctxOwnsY).toBe(true);
    expect(m.ctxOwnsA).toBe(true);
    setBtn(i.y, true, false, false);
    frame(m, i, [d]);
    expect(m.ctxOwnsY).toBe(true);
    setBtn(i.y, false, false, true);
    expect(frame(m, i, [d])).toBe(true);
    expect(m.run).toMatchObject({ slot: CTX_Y, opt: 'peek', hold: false });
    setBtn(i.y, false, false, false);
    frame(m, i, [d]);
    expect(m.ctxOwnsY).toBe(false);
    setBtn(i.y, true, true, false);
    frame(m, i, [d]);
    setBtn(i.y, true, false, false);
    let ran = false;
    for (let k = 0; k < 10 && !ran; k++) ran = frame(m, i, [d]);
    expect(m.run).toMatchObject({ slot: CTX_Y, opt: 'optic', hold: true });
    expect(m.ctxOwnsY).toBe(true);
  });

  it('Y never owns a jump press the rule did not give it (yLive alone takes nothing)', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    i.yLive = true;
    setBtn(i.y, true, false, false);
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    for (let k = 0; k < 3; k++) frame(m, i, [d]);
    expect(m.ctxOwnsY).toBe(false);
  });

  it('a second button pressed during a hold runs nothing and leaves the hold running', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    pressA(i);
    frame(m, i, [d]);
    holdA(i);
    frame(m, i, [d]);
    setBtn(i.y, true, true, false);
    expect(frame(m, i, [d])).toBe(false);
    expect(m.ctxOwnsY).toBe(true);
    setBtn(i.y, true, false, false);
    let ran = false;
    for (let k = 0; k < 10 && !ran; k++) ran = frame(m, i, [d]);
    expect(m.run).toMatchObject({ slot: CTX_A, opt: 'bash' });
  });
});

describe('the view model (CtxPromptSink)', () => {
  it('the Y row shows only while the Y rule would take the press', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    expect(m.shows(CTX_A)).toBe(true);
    expect(m.shows(CTX_Y)).toBe(false);
    i.yLive = true;
    frame(m, i, [d]);
    expect(m.shows(CTX_Y)).toBe(true);
    expect(m.rows[CTX_Y]).toMatchObject({ tapLabel: 'Peek', holdLabel: 'Optic cable', holdTime: CTX_HOLD });
  });

  it('version bumps on a focus, row, Y or hold change only, not on a moving anchor', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const v0 = m.version;
    frame(m, i, [{ kind: 'door', ref: 4, dist: 1, rows: 'door' }]);
    const v1 = m.version;
    expect(v1).toBeGreaterThan(v0);
    m.begin();
    const c = m.add('door', 4, 0.9, 0.1, 3, 1.1, 2);
    pairRow(c, CTX_A, 'open', 'Open', 'bash', 'Bash');
    pairRow(c, CTX_Y, 'peek', 'Peek', 'optic', 'Optic cable');
    m.step(i, DT);
    expect(m.version).toBe(v1);
    expect([m.x, m.z]).toEqual([3, 2]);
    frame(m, i, [{ kind: 'door', ref: 4, dist: 1, rows: 'doorHoldOnly' }]);
    expect(m.version).toBeGreaterThan(v1);
    // the model is what the sink reads (S4)
    let seen: CtxPromptModel | null = null;
    const sink: CtxPromptSink = { update: (mm) => void (seen = mm) };
    sink.update(m);
    expect(seen).toBe(m);
  });

  it('reset clears the focus and the presses', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const d: T = { kind: 'door', ref: 4, dist: 1, rows: 'door' };
    frame(m, i, [d]);
    pressA(i);
    frame(m, i, [d]);
    m.reset();
    expect([m.kind, m.ctxOwnsA, m.ctxOwnsY, m.holdSlot]).toEqual(['none', false, false, -1]);
  });
});

describe('fixed slots: nothing allocated per step', () => {
  it('the candidates, their rows, the model rows and the run are the same objects every step', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const cands = [...m.cands];
    const rows = cands.map((c) => [...c.rows]);
    const mrows = [...m.rows];
    const run = m.run;
    for (let k = 0; k < 50; k++) {
      if (k % 7 === 0) pressA(i);
      else if (k % 7 === 3) releaseA(i);
      else idleA(i);
      frame(m, i, [{ kind: 'door', ref: k % 3, dist: 1, rows: 'door' }, { kind: 'item', ref: 9, dist: 0.5 + (k % 5) * 0.2, rows: 'alarm' }]);
    }
    expect(m.cands).toHaveLength(CTX_CANDS);
    m.cands.forEach((c, j) => {
      expect(c).toBe(cands[j]);
      c.rows.forEach((r, s) => expect(r).toBe(rows[j]![s]));
    });
    m.rows.forEach((r, s) => expect(r).toBe(mrows[s]));
    expect(m.run).toBe(run);
  });

  it('past CTX_CANDS a candidate goes to an unlisted scratch slot', () => {
    const m = new ContextPrompts();
    m.begin();
    for (let k = 0; k < CTX_CANDS + 3; k++) tapRow(m.add('item', k, 1 + k, 0, 0, 0, 0), CTX_A, 'use', 'Use');
    expect(m.count).toBe(CTX_CANDS);
    expect(m.find('item', CTX_CANDS + 1)).toBe(-1);
    m.step(emptyCtxPromptInput(), DT);
    expect(m.ref).toBe(0);
  });
});
