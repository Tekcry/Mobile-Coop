// (context-prompts S2, PLAN section 3) The Y rule: one test per row of the "Jump at a door or hatch" case table, plus
// the targets it never touches and its purity (no allocation, no input change).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ctxJumpTaker, emptyCtxJumpState, type CtxJumpState } from '../src/game/contextJump';
import { ContextPrompts, CTX_A, CTX_Y, emptyCtxPromptInput, pairRow } from '../src/game/contextPrompts';

/** Standing on the ground facing a closed door with its Y row, nothing offered by traversal. */
function at(over: Partial<CtxJumpState> = {}): CtxJumpState {
  return Object.freeze({ ...emptyCtxJumpState(), focus: 'door', yRow: true, grounded: true, ...over });
}

describe('the case table (PLAN section 3)', () => {
  it('1. running at a closed door, no vault offered: the second action takes Y (peek / optic cable), no jump', () => {
    expect(ctxJumpTaker(at())).toBe('second');
  });

  it('2. a door under or beside a vaultable window (the probe offers the vault): Y vaults', () => {
    expect(ctxJumpTaker(at({ hint: true }))).toBe('jump');
  });

  it('3. a hatch you can climb out of (a mantle or ladder offered): Y climbs', () => {
    expect(ctxJumpTaker(at({ focus: 'gap', hint: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'gap', attachHint: true }))).toBe('jump');
    // on the ladder (attached): today's
    expect(ctxJumpTaker(at({ focus: 'gap', attached: true }))).toBe('jump');
  });

  it('4. a floor hatch: closed, Y feeds the optic cable; opened (the drop offered), Y drops through', () => {
    expect(ctxJumpTaker(at({ focus: 'gap' }))).toBe('second');
    expect(ctxJumpTaker(at({ focus: 'gap', hint: true }))).toBe('jump');
  });

  it('5. crouched at a hatch, nothing offered: Y feeds the optic cable (crouch is not a condition)', () => {
    expect(ctxJumpTaker(at({ focus: 'gap' }))).toBe('second');
  });

  it('6. a door during a team move or offer: Y as today', () => {
    expect(ctxJumpTaker(at({ team: true }))).toBe('jump');
    // doors are not candidates then (rows 42-43): no door focus, no Y row
    expect(ctxJumpTaker(at({ team: true, focus: 'item', yRow: false }))).toBe('jump');
  });

  it('7. the knife scene: the rule as anywhere; during the knife kill (takedown busy) Y is today\'s', () => {
    expect(ctxJumpTaker(at())).toBe('second');
    expect(ctxJumpTaker(at({ busy: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'guard', yRow: false }))).toBe('jump');
  });

  it('8. carrying a body at a door: no Y row, Y as today (A opens or closes the door)', () => {
    expect(ctxJumpTaker(at({ carrying: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ carrying: true, focus: 'carry', yRow: false }))).toBe('jump');
  });

  it('9. holding a guard (takedown busy): Y as today; the holder gets no Y job', () => {
    expect(ctxJumpTaker(at({ focus: 'held', yRow: false, busy: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'held', yRow: true }))).toBe('jump');
  });

  it('10. beside the partner\'s hold with joint information: Y bluffs; a climb on offer there wins', () => {
    expect(ctxJumpTaker(at({ focus: 'hostage' }))).toBe('second');
    expect(ctxJumpTaker(at({ focus: 'hostage', hint: true }))).toBe('jump');
    // no joint information: no bluff row
    expect(ctxJumpTaker(at({ focus: 'hostage', yRow: false }))).toBe('jump');
  });

  it('11. in the air, on the wall, mid-peek (Y ends the peek), mid-traversal, attached, striking: today\'s', () => {
    expect(ctxJumpTaker(at({ grounded: false }))).toBe('jump');
    expect(ctxJumpTaker(at({ onWall: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ peek: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ traversing: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ attached: true }))).toBe('jump');
    expect(ctxJumpTaker(at({ strike: true }))).toBe('jump');
  });

  it('12. the peek not on offer: the rule takes Y, the row is hold-only, a tap does nothing (A25), the hold runs', () => {
    expect(ctxJumpTaker(at())).toBe('second');
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    const fill = (): void => {
      m.begin();
      const c = m.add('door', 4, 1, 0, 0, 1.1, 0);
      pairRow(c, CTX_A, 'open', 'Open', 'bash', 'Bash');
      pairRow(c, CTX_Y, '', '', 'optic', 'Optic cable');
    };
    i.yLive = ctxJumpTaker(at()) === 'second';
    fill();
    m.step(i, 0.05);
    expect(m.shows(CTX_Y)).toBe(true);
    expect(m.rows[CTX_Y]).toMatchObject({ tap: '', hold: 'optic', holdLabel: 'Optic cable' });
    // a tap: owned (no jump), nothing runs
    i.y.down = true;
    i.y.pressed = true;
    fill();
    expect(m.step(i, 0.05)).toBe(false);
    expect(m.ctxOwnsY).toBe(true);
    i.y.pressed = false;
    i.y.down = false;
    i.y.released = true;
    fill();
    expect(m.step(i, 0.05)).toBe(false);
    i.y.released = false;
    fill();
    m.step(i, 0.05);
    expect(m.ctxOwnsY).toBe(false);
    // held: the optic cable
    i.y.down = true;
    i.y.pressed = true;
    fill();
    m.step(i, 0.05);
    i.y.pressed = false;
    let ran = false;
    for (let k = 0; k < 10 && !ran; k++) {
      fill();
      ran = m.step(i, 0.05);
    }
    expect(ran).toBe(true);
    expect(m.run).toMatchObject({ slot: CTX_Y, opt: 'optic', hold: true });
  });
});

describe('everything else falls through to today\'s jump', () => {
  it('no focus, an item, a guard on offer, a door with no Y row (sliding, open)', () => {
    expect(ctxJumpTaker(emptyCtxJumpState())).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'none', yRow: false }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'item' }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'guard' }))).toBe('jump');
    expect(ctxJumpTaker(at({ focus: 'door', yRow: false }))).toBe('jump');
  });

  it('a door\'s A row stays when traversal wins Y (the rule never touches A)', () => {
    const m = new ContextPrompts();
    const i = emptyCtxPromptInput();
    i.yLive = ctxJumpTaker(at({ hint: true })) === 'second';
    m.begin();
    const c = m.add('door', 4, 1, 0, 0, 1.1, 0);
    pairRow(c, CTX_A, 'open', 'Open', 'bash', 'Bash');
    pairRow(c, CTX_Y, 'peek', 'Peek', 'optic', 'Optic cable');
    m.step(i, 0.05);
    expect(m.shows(CTX_A)).toBe(true);
    expect(m.shows(CTX_Y)).toBe(false);
  });
});

describe('purity', () => {
  it('reads a frozen state, changes nothing and returns one of two constants', () => {
    const s = at();
    for (let k = 0; k < 1000; k++) expect(ctxJumpTaker(s)).toBe('second');
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('the rule allocates nothing: no object, array, closure or `new` in its body', () => {
    const src = readFileSync(resolve(__dirname, '../src/game/contextJump.ts'), 'utf8');
    const body = src.slice(src.indexOf('export function ctxJumpTaker'));
    expect(body).not.toMatch(/\bnew\b|=>|\[|\{\s*\w+\s*:/);
  });
});
