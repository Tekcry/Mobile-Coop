// (CT prototype G5, AUDIT-ACTIONMENU) the context action menu: none / passive / active, hold A, pick, let go
import { describe, expect, it } from 'vitest';
import { ContextMenu, CTX_BACK, CTX_MAX, emptyCtxInput, type CtxInput } from '../src/game/contextMenu';

const DT = 1 / 60;

/** A door set (latching rows) and an item, or only the item. */
function fill(m: ContextMenu, rows: 'door' | 'item' | 'both' | 'none' | 'hold'): void {
  m.begin();
  if (rows === 'door' || rows === 'both') {
    m.add('door', 'open', 2, 'Open door', 0, true);
    m.add('door', 'stealth', 2, 'Open door stealth', 0, true);
    m.add('door', 'bash', 2, 'Bash door', 0, true);
  }
  if (rows === 'item' || rows === 'both') m.add('item', 'use', -1, 'Lights off');
  if (rows === 'hold') m.add('item', 'use', -1, 'Hack panel', 1.0);
  m.end();
}

function press(i: CtxInput): CtxInput {
  i.down = true;
  i.pressed = true;
  i.released = false;
  return i;
}
function hold(i: CtxInput): CtxInput {
  i.down = true;
  i.pressed = false;
  i.released = false;
  return i;
}
function release(i: CtxInput): CtxInput {
  i.down = false;
  i.pressed = false;
  i.released = true;
  return i;
}
function idle(i: CtxInput): CtxInput {
  i.down = i.pressed = i.released = false;
  i.nav = 0;
  i.cancel = false;
  return i;
}

describe('context menu (G5)', () => {
  it('nothing in reach: none; something: passive; A down opens it on row 1 in the same step', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'none');
    expect(m.step(i, DT)).toBe(-1);
    expect(m.state).toBe('none');
    fill(m, 'door');
    m.step(i, DT);
    expect(m.state).toBe('passive');
    fill(m, 'door');
    expect(m.step(press(i), DT)).toBe(-1);
    expect(m.state).toBe('active');
    expect(m.sel).toBe(0);
    expect(m.swallow).toBe(true);
  });

  it('release runs the highlighted row; the stick moves it one row per step without wrapping', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'door');
    m.step(press(i), DT);
    hold(i).nav = 1;
    fill(m, 'door');
    m.step(i, DT);
    fill(m, 'door');
    m.step(i, DT);
    fill(m, 'door');
    m.step(i, DT);
    expect(m.sel).toBe(2);
    i.nav = 0;
    fill(m, 'door');
    const r = m.step(release(i), DT);
    expect(m.opts[r]!.opt).toBe('bash');
    expect(m.state).toBe('passive');
  });

  it('BACK TO GAME sits above row 1: releasing on it does nothing', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'item');
    m.step(press(i), DT);
    hold(i).nav = -1;
    fill(m, 'item');
    m.step(i, DT);
    fill(m, 'item');
    m.step(i, DT);
    expect(m.sel).toBe(CTX_BACK);
    i.nav = 0;
    fill(m, 'item');
    expect(m.step(release(i), DT)).toBe(-1);
    expect(m.state).toBe('passive');
  });

  it('a quick tap (press and release between two steps) runs row 1; a press then a release a step later too', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'both');
    i.pressed = true;
    i.released = true;
    expect(m.step(i, DT)).toBe(0);
    idle(i);
    fill(m, 'both');
    m.step(press(i), DT);
    fill(m, 'both');
    expect(m.step(release(i), DT)).toBe(0);
  });

  it('a scripted tap: a door set opens latched (the next tap runs the highlight); other lists run row 1', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'door');
    i.pressed = true;
    expect(m.step(i, DT)).toBe(-1);
    expect(m.state).toBe('active');
    expect(m.latched).toBe(true);
    // A is up: the latched list stays open
    idle(i).nav = 1;
    fill(m, 'door');
    expect(m.step(i, DT)).toBe(-1);
    expect(m.sel).toBe(1);
    idle(i).pressed = true;
    fill(m, 'door');
    expect(m.opts[m.step(i, DT)]!.opt).toBe('stealth');
    // an item alone: the tap runs it
    idle(i);
    fill(m, 'item');
    m.step(i, DT);
    i.pressed = true;
    fill(m, 'item');
    expect(m.step(i, DT)).toBe(0);
  });

  it('the list changing while held keeps the highlight on its row; a lost row goes to BACK TO GAME; nothing in reach closes it unrun', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'both');
    m.step(press(i), DT);
    hold(i).nav = 1;
    fill(m, 'both');
    m.step(i, DT);
    expect(m.opts[m.sel]!.opt).toBe('stealth');
    i.nav = 0;
    // the item leaves the list: stealth keeps the highlight
    fill(m, 'door');
    m.step(i, DT);
    expect(m.opts[m.sel]!.opt).toBe('stealth');
    // the door set goes (the highlighted row with it): BACK TO GAME, never the item that slid into its place
    fill(m, 'item');
    m.step(i, DT);
    expect(m.sel).toBe(CTX_BACK);
    fill(m, 'item');
    expect(m.step(release(i), DT)).toBe(-1);
    // held again, then out of reach: none, and the release runs nothing
    idle(i);
    fill(m, 'item');
    m.step(press(i), DT);
    hold(i);
    // out of reach: none, and the release runs nothing
    fill(m, 'none');
    m.step(i, DT);
    expect(m.state).toBe('none');
    fill(m, 'none');
    expect(m.step(release(i), DT)).toBe(-1);
  });

  it('a hold row fills while A stays on it and runs once full; let go early, nothing', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'hold');
    m.step(press(i), DT);
    hold(i);
    for (let k = 0; k < 30; k++) {
      fill(m, 'hold');
      m.step(i, DT);
    }
    expect(m.holdK).toBeGreaterThan(0.45);
    fill(m, 'hold');
    expect(m.step(release(i), DT)).toBe(-1);
    // a quick tap never runs a hold row
    i.pressed = true;
    i.released = true;
    fill(m, 'hold');
    expect(m.step(i, DT)).toBe(-1);
    fill(m, 'hold');
    m.step(press(i), DT);
    hold(i);
    let ran = -1;
    for (let k = 0; k < 70 && ran < 0; k++) {
      fill(m, 'hold');
      ran = m.step(i, DT);
    }
    expect(ran).toBe(0);
    expect(m.state).toBe('passive');
    // still held after it ran: swallowed, and it does not reopen without a fresh press
    fill(m, 'hold');
    m.step(i, DT);
    expect(m.state).toBe('passive');
    expect(m.swallow).toBe(true);
  });

  it('a list with no BACK TO GAME (a held guard, Michael 08:25): the highlight stops at row 1, B does not close it', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    const held = (): void => {
      m.begin();
      m.add('grab', 'interrogate', 4, 'Interrogate');
      m.noBack = true;
      m.end();
    };
    held();
    m.step(press(i), DT);
    hold(i).nav = -1;
    held();
    m.step(i, DT);
    expect(m.sel).toBe(0);
    i.nav = 0;
    i.cancel = true;
    held();
    m.step(i, DT);
    expect(m.state).toBe('active');
    i.cancel = false;
    held();
    expect(m.step(release(i), DT)).toBe(0);
  });

  it('B closes the held list with no action', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'item');
    m.step(press(i), DT);
    hold(i).cancel = true;
    fill(m, 'item');
    expect(m.step(i, DT)).toBe(-1);
    expect(m.state).toBe('passive');
    i.cancel = false;
    fill(m, 'item');
    expect(m.step(release(i), DT)).toBe(-1);
  });

  it('the version moves only when something shown changes; rows past CTX_MAX are dropped', () => {
    const m = new ContextMenu();
    const i = emptyCtxInput();
    fill(m, 'item');
    m.step(i, DT);
    const v = m.version;
    for (let k = 0; k < 5; k++) {
      fill(m, 'item');
      m.step(i, DT);
    }
    expect(m.version).toBe(v);
    fill(m, 'both');
    expect(m.version).toBeGreaterThan(v);
    m.begin();
    for (let k = 0; k < CTX_MAX + 3; k++) m.add('item', 'use', k, 'x');
    m.end();
    expect(m.count).toBe(CTX_MAX);
  });
});
