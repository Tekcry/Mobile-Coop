// (context-prompts S3, PLAN sections 2, 3, 4 and 8) The providers on a fake host: each target kind's rows (the held
// guard, behind / faced / lethal-only / quadruped / knife / the partner's hostage, the closed / sliding / open / locked
// door, the gap with and without a trap, tap / fill items incl. a `vip` and a `charge`, the carry target), the stand-
// asides, KIND_PROMPT_Y over every kind; `ctxPromptStep`: the Y rule judged against the focus kept this step (a guard
// offer taking the focus from a door in the step of a jump press: the press stays traversal's), door / gap / guard
// presses; source guards for the wiring in `gameState.ts` (the flag switch, the jump press kept from traversal, the vent
// start and the peek's end check, and the grab's raw A hold).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flags } from '../src/core/flags';
import { ContextPrompts, CTX_A, CTX_HOLD, CTX_LT, CTX_RT, CTX_Y, ctxText, emptyCtxPromptInput, type CtxPromptInput } from '../src/game/contextPrompts';
import { emptyCtxJumpState, type CtxJumpState } from '../src/game/contextJump';
import {
  CTX_DOOR_Y,
  CTX_DROP_AHEAD,
  CTX_DROP_Y,
  CTX_GUARD_Y,
  CTX_OPT,
  ctxPromptStep,
  ctxRefOf,
  fillContextPrompts,
  KIND_PROMPT_Y,
  type CtxDoorRef,
  type CtxHost,
  type CtxItemRef,
  type CtxOfferRef,
  type CtxP3,
} from '../src/game/contextProviders';
import { KIND_COLOR, type InteractKind } from '../src/game/interactables';
import type { TakedownKind } from '../src/game/takedown';

const DT = 1 / 60;

interface Fake {
  feet: CtxP3;
  yaw: number;
  aside: boolean;
  held: { id: string; pos: CtxP3; def: { scale: number } } | null;
  info: boolean;
  offer: CtxOfferRef | null;
  joint: boolean;
  team: boolean;
  knife: boolean;
  rt: boolean;
  door: number;
  doors: CtxDoorRef[];
  peek: number;
  gap: number;
  gaps: CtxP3[];
  trap: boolean;
  item: CtxItemRef | null;
  items: CtxItemRef[];
  carrying: boolean;
}

function fake(): Fake {
  return { feet: { x: 0, y: 0, z: 0 }, yaw: 0, aside: false, held: null, info: false, offer: null, joint: false, team: false, knife: false, rt: true, door: -1, doors: [], peek: -1, gap: -1, gaps: [], trap: false, item: null, items: [], carrying: false };
}

function host(f: Fake): CtxHost {
  return {
    feet: () => f.feet,
    camYaw: () => f.yaw,
    aside: () => f.aside,
    held: () => f.held,
    heldInfo: () => f.info,
    offer: () => f.offer,
    joint: () => f.joint,
    teamMove: () => f.team,
    knife: () => f.knife,
    rtFree: () => f.rt,
    doorCandidate: () => f.door,
    door: (i) => f.doors[i] ?? null,
    peekOffer: () => f.peek,
    gapCandidate: () => f.gap,
    gapAt: (i) => f.gaps[i] ?? null,
    gapOpenable: () => f.trap,
    item: () => f.item,
    itemRef: (it) => f.items.indexOf(it),
    itemDoor: (it) => (it.id.startsWith('door-') ? Number(it.id.slice(5)) : -1),
    carrying: () => f.carrying,
  };
}

function guard(kind: TakedownKind, o: { lethalOnly?: boolean; quadruped?: boolean; id?: string; z?: number } = {}): CtxOfferRef {
  return { e: { id: o.id ?? 'g1', pos: { x: 0, y: 0, z: o.z ?? 1 }, def: { scale: 1, quadruped: o.quadruped } }, plan: { kind }, lethalOnly: !!o.lethalOnly };
}

function door(target: 0 | 1 = 0, slide = false): CtxDoorRef {
  return { cx: 0, cz: 1.2, target, anchor: { hinge: { x: -0.45, y: 0, z: 1.2 }, yaw: Math.PI / 2, width: 0.9, leaf: slide ? 'slide' : 'swing' } };
}

function item(kind: InteractKind, label: string, holdTime = 0, id = `${kind}-1`): CtxItemRef {
  return { id, kind, pos: { x: 0.5, y: 0, z: 1 }, label, holdTime };
}

/** Fill, then read the focus candidate's rows by slot (the one candidate listed, or the first). */
function rows(f: Fake): { kind: string; a: string; aHold: string; y: string; yHold: string; rt: string; rtHold: string; lt: string; aFill: boolean; count: number } {
  const cp = new ContextPrompts();
  fillContextPrompts(cp, host(f));
  const c = cp.cands[0]!;
  const r = (s: number): { on: boolean; tapLabel: string; holdLabel: string; fill: boolean } => c.rows[s]!;
  const lab = (s: number, hold: boolean): string => (r(s).on ? (hold ? r(s).holdLabel : r(s).tapLabel) : '-');
  return { kind: cp.count ? c.kind : 'none', a: lab(CTX_A, false), aHold: lab(CTX_A, true), y: lab(CTX_Y, false), yHold: lab(CTX_Y, true), rt: lab(CTX_RT, false), rtHold: lab(CTX_RT, true), lt: lab(CTX_LT, false), aFill: r(CTX_A).fill, count: cp.count };
}

describe('contextProviders: rows per target (PLAN 2)', () => {
  it('lists nothing while the prompts stand aside', () => {
    const f = fake();
    f.offer = guard('front');
    f.item = item('switch', 'Lights off');
    f.aside = true;
    expect(rows(f).count).toBe(0);
  });

  it('a held guard: A Interrogate only with information; RT Knock out / Kill and LT Shield (not aiming); nothing else', () => {
    const f = fake();
    f.held = { id: 'h', pos: { x: 0, y: 0, z: 0.6 }, def: { scale: 1 } };
    f.offer = guard('front');
    f.item = item('switch', 'Lights off');
    let r = rows(f);
    expect(r).toMatchObject({ kind: 'held', a: '-', rt: 'Knock out', rtHold: 'Kill', lt: 'Shield', count: 1 });
    f.info = true;
    r = rows(f);
    expect(r.a).toBe('Interrogate');
    f.rt = false;
    r = rows(f);
    expect([r.rt, r.lt]).toEqual(['-', '-']);
  });

  it('from behind: A tap Grab, no hold (A5); RT Knock out / Kill', () => {
    const f = fake();
    f.offer = guard('behind');
    expect(rows(f)).toMatchObject({ kind: 'guard', a: 'Grab', aHold: '', rt: 'Knock out', rtHold: 'Kill' });
  });

  it('faced: A tap Knock out (or the kind\'s name), A hold Kill (A6)', () => {
    const f = fake();
    for (const [k, lab] of [['front', 'Knock out'], ['side', 'Knock out'], ['overCover', 'Knock out'], ['corner', 'Knock out'], ['above', 'Drop attack'], ['drop', 'Drop attack'], ['below', 'Pull over ledge'], ['window', 'Pull through window'], ['inverted', 'Choke']] as const) {
      f.offer = guard(k);
      expect(rows(f), k).toMatchObject({ kind: 'guard', a: lab, aHold: 'Kill', rt: 'Knock out', rtHold: 'Kill' });
    }
  });

  it('lethal-only: A hold Kill only (a tap does nothing); RT hold Kill', () => {
    const f = fake();
    f.offer = guard('front', { lethalOnly: true });
    expect(rows(f)).toMatchObject({ a: '', aHold: 'Kill', rt: '', rtHold: 'Kill' });
  });

  it('a quadruped from behind is no grab: a takedown with the kill on hold', () => {
    const f = fake();
    f.offer = guard('behind', { quadruped: true });
    expect(rows(f)).toMatchObject({ a: 'Knock out', aHold: 'Kill' });
  });

  it('hang-down: A tap Grab; RT Choke / Neck snap', () => {
    const f = fake();
    f.offer = guard('hangDown');
    expect(rows(f)).toMatchObject({ a: 'Grab', rt: 'Choke', rtHold: 'Neck snap' });
  });

  it('knife on: A Knife takedown (no grab), RT Knife takedown; a quadruped keeps its takedown', () => {
    const f = fake();
    f.knife = true;
    f.offer = guard('behind');
    expect(rows(f)).toMatchObject({ a: 'Knife takedown', aHold: '', rt: 'Knife takedown' });
    f.offer = guard('front', { quadruped: true });
    expect(rows(f)).toMatchObject({ a: 'Knock out', aHold: 'Kill' });
  });

  it('the partner\'s hostage: A tap Team takedown (kind hostage), knife or not', () => {
    const f = fake();
    f.offer = guard('assist');
    expect(rows(f)).toMatchObject({ kind: 'hostage', a: 'Team takedown', aHold: '' });
    f.knife = true;
    expect(rows(f)).toMatchObject({ kind: 'hostage', a: 'Team takedown' });
  });

  it('a closed door faced: A Open / hold Bash; Y Peek / hold Optic cable; the peek not on offer: Y hold only', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    expect(rows(f)).toMatchObject({ kind: 'door', a: 'Open', aHold: 'Bash', y: 'Peek', yHold: 'Optic cable' });
    f.peek = -1;
    expect(rows(f)).toMatchObject({ y: '', yHold: 'Optic cable' });
  });

  it('a door prompt sits on the leaf, latch side, 1.1 m up', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    const cp = new ContextPrompts();
    fillContextPrompts(cp, host(f));
    const c = cp.cands[0]!;
    expect(c.y).toBeCloseTo(CTX_DOOR_Y);
    expect(c.x).toBeGreaterThan(0.2);
    expect(c.z).toBeCloseTo(1.2);
  });

  it('a sliding door: A Open only', () => {
    const f = fake();
    f.doors = [door(0, true)];
    f.door = 0;
    f.peek = 0;
    expect(rows(f)).toMatchObject({ a: 'Open', aHold: '', y: '-' });
  });

  it('an open door (its own item): A Close; a closed faced door\'s own item is not listed twice; a locked door: nothing', () => {
    const f = fake();
    f.doors = [door(1)];
    f.item = item('door', 'Door', 0, 'door-0');
    expect(rows(f)).toMatchObject({ kind: 'item', a: 'Close', count: 1 });
    f.doors = [door(0)];
    f.door = 0;
    expect(rows(f)).toMatchObject({ kind: 'door', count: 1 });
    // locked: no door candidate (`doorMenuCandidate` skips it) and no item
    f.door = -1;
    f.item = null;
    expect(rows(f).count).toBe(0);
  });

  it('the optic gap: A Open trap only with a closed panel; Y tap Optic cable', () => {
    const f = fake();
    f.gaps = [{ x: 0, y: 0, z: 1 }];
    f.gap = 0;
    f.trap = true;
    expect(rows(f)).toMatchObject({ kind: 'gap', a: 'Open trap', y: 'Optic cable', yHold: '' });
    f.trap = false;
    expect(rows(f)).toMatchObject({ a: '-', y: 'Optic cable' });
  });

  it('a door faced wins over a gap (as the menu: the gap only with no door)', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.gaps = [{ x: 0, y: 0, z: 1 }];
    f.gap = 0;
    const cp = new ContextPrompts();
    fillContextPrompts(cp, host(f));
    expect(cp.find('gap', 0)).toBe(-1);
    expect(cp.find('door', 0)).toBe(0);
  });

  it('items: a tap item runs on the press, a hold item fills for its own time (vip, charge, alarm), a body says Pick up', () => {
    const f = fake();
    f.item = item('switch', 'Lights off');
    expect(rows(f)).toMatchObject({ kind: 'item', a: 'Lights off', aFill: false });
    for (const [k, lab, t] of [['alarm', 'Disable alarm', 2], ['vip', 'Free the VIP', 3], ['charge', 'Plant the charge', 4]] as const) {
      f.item = item(k, lab, t);
      expect(rows(f), k).toMatchObject({ a: '', aHold: lab, aFill: true });
    }
    f.item = item('body', 'Pick up body');
    expect(rows(f).a).toBe('Pick up');
  });

  it('the carry target is a carry candidate', () => {
    const f = fake();
    f.carrying = true;
    f.item = item('hide', 'Hide body');
    expect(rows(f)).toMatchObject({ kind: 'carry', a: 'Hide body' });
  });

  it('a guard on offer and an item: both listed, the guard keeps the focus (rank)', () => {
    const f = fake();
    f.offer = guard('front', { z: 1.6 });
    f.item = item('switch', 'Lights off');
    const cp = new ContextPrompts();
    fillContextPrompts(cp, host(f));
    expect(cp.count).toBe(2);
    cp.step(emptyCtxPromptInput(), DT);
    expect(cp.kind).toBe('guard');
    expect(cp.ref).toBe(ctxRefOf('g1'));
    expect(cp.y).toBeCloseTo(CTX_GUARD_Y);
  });

  it('KIND_PROMPT_Y has every InteractKind', () => {
    const kinds = Object.keys(KIND_COLOR).sort();
    expect(kinds.length).toBe(14);
    expect(Object.keys(KIND_PROMPT_Y).sort()).toEqual(kinds);
    for (const k of kinds) expect(KIND_PROMPT_Y[k as InteractKind]).toBeGreaterThan(0);
  });

  it('ctxRefOf: stable, different ids differ', () => {
    expect(ctxRefOf('grunt-3')).toBe(ctxRefOf('grunt-3'));
    expect(ctxRefOf('grunt-3')).not.toBe(ctxRefOf('grunt-4'));
    expect(ctxRefOf('grunt-3')).toBeGreaterThanOrEqual(0);
  });

  it('reuses its slots (nothing allocated per fill)', () => {
    const f = fake();
    f.offer = guard('front');
    f.doors = [door()];
    f.door = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    fillContextPrompts(cp, h);
    const c0 = cp.cands[0]!;
    const r0 = c0.rows[CTX_A];
    fillContextPrompts(cp, h);
    expect(cp.cands[0]).toBe(c0);
    expect(cp.cands[0]!.rows[CTX_A]).toBe(r0);
  });
});

// one step of the wiring as `GameState.contextPromptStep` runs it: fill, set the buttons, `ctxPromptStep`
interface Pads {
  a: boolean;
  aWas: boolean;
  y: boolean;
  yWas: boolean;
}
function stepCtx(cp: ContextPrompts, h: CtxHost, inp: CtxPromptInput, js: CtxJumpState, p: Pads, dt = DT): boolean {
  fillContextPrompts(cp, h);
  inp.a.down = p.a;
  inp.a.pressed = p.a && !p.aWas;
  inp.a.released = !p.a && p.aWas;
  inp.y.down = p.y;
  inp.y.released = !p.y && p.yWas;
  const ran = ctxPromptStep(cp, inp, js, p.y && !p.yWas, dt);
  p.aWas = p.a;
  p.yWas = p.y;
  return ran;
}
function groundJs(): CtxJumpState {
  const js = emptyCtxJumpState();
  js.grounded = true;
  return js;
}

describe('contextProviders: ctxPromptStep (the Y rule wired, PLAN 3 and 4)', () => {
  it('a door with nothing offered: Y is the second action (owned), a tap peeks on release; yLive shows the Y row', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: false, aWas: false, y: false, yWas: false };
    stepCtx(cp, h, inp, js, p);
    expect(cp.kind).toBe('door');
    expect(cp.yLive).toBe(true);
    expect(cp.shows(CTX_Y)).toBe(true);
    p.y = true;
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
    expect(cp.ctxOwnsY).toBe(true);
    p.y = false;
    expect(stepCtx(cp, h, inp, js, p)).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_Y, opt: CTX_OPT.stealth, kind: 'door', ref: 0, hold: false });
  });

  it('a door: Y held to CTX_HOLD feeds the optic cable', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: false, aWas: false, y: true, yWas: false };
    let ran = false;
    for (let t = 0; t < CTX_HOLD + 0.05 && !ran; t += DT) ran = stepCtx(cp, h, inp, js, p);
    expect(ran).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_Y, opt: CTX_OPT.optic, hold: true });
    expect(cp.ctxOwnsY).toBe(true);
  });

  it('a vault offered at the door: Y stays the jump (not owned), the Y row hidden, the A row kept', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    js.hint = true;
    const p: Pads = { a: false, aWas: false, y: true, yWas: false };
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
    expect(cp.ctxOwnsY).toBe(false);
    expect(cp.shows(CTX_Y)).toBe(false);
    expect(cp.shows(CTX_A)).toBe(true);
  });

  it('CHECK-P1 note 1: a guard offer takes the focus from a door in the step of a Y press: the press stays the jump', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: false, aWas: false, y: false, yWas: false };
    stepCtx(cp, h, inp, js, p);
    expect(cp.kind).toBe('door');
    expect(cp.yLive).toBe(true);
    // the same step: a guard comes on offer and Y goes down
    f.offer = guard('front');
    p.y = true;
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
    expect(cp.kind).toBe('guard');
    // judged against the guard (no Y row): not the context system's, traversal sees the press
    expect(cp.ctxOwnsY).toBe(false);
    expect(cp.yLive).toBe(false);
    // and nothing runs on its release
    p.y = false;
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
  });

  it('the reverse: a press on the step a door becomes the focus is judged against the door', () => {
    const f = fake();
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: false, aWas: false, y: false, yWas: false };
    stepCtx(cp, h, inp, js, p);
    expect(cp.kind).toBe('none');
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    p.y = true;
    stepCtx(cp, h, inp, js, p);
    expect(cp.kind).toBe('door');
    expect(cp.ctxOwnsY).toBe(true);
  });

  it('the gap: a Y tap feeds the optic cable on the press (no hold there)', () => {
    const f = fake();
    f.gaps = [{ x: 0, y: 0, z: 1 }];
    f.gap = 0;
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: false, aWas: false, y: true, yWas: false };
    expect(stepCtx(cp, h, inp, js, p)).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_Y, opt: CTX_OPT.optic, kind: 'gap', hold: false });
    expect(cp.ctxOwnsY).toBe(true);
  });

  it('in the air, on the wall, carrying, in a team move: Y is the jump at a door', () => {
    const f = fake();
    f.doors = [door()];
    f.door = 0;
    f.peek = 0;
    for (const k of ['grounded', 'onWall', 'carrying', 'team', 'busy', 'peek', 'attachHint'] as const) {
      const cp = new ContextPrompts();
      const js = groundJs();
      if (k === 'grounded') js.grounded = false;
      else js[k] = true;
      const p: Pads = { a: false, aWas: false, y: true, yWas: false };
      stepCtx(cp, host(f), emptyCtxPromptInput(), js, p);
      expect(cp.ctxOwnsY, k).toBe(false);
    }
  });

  it('a faced guard: A tap knocks out on release, A held to CTX_HOLD kills', () => {
    const f = fake();
    f.offer = guard('front');
    const h = host(f);
    const js = groundJs();
    let cp = new ContextPrompts();
    let inp = emptyCtxPromptInput();
    const p: Pads = { a: true, aWas: false, y: false, yWas: false };
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
    expect(cp.ctxOwnsA).toBe(true);
    p.a = false;
    expect(stepCtx(cp, h, inp, js, p)).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_A, opt: CTX_OPT.ko, kind: 'guard', hold: false });
    cp = new ContextPrompts();
    inp = emptyCtxPromptInput();
    p.a = true;
    p.aWas = false;
    let ran = false;
    for (let t = 0; t < CTX_HOLD + 0.05 && !ran; t += DT) ran = stepCtx(cp, h, inp, js, p);
    expect(ran).toBe(true);
    expect(cp.run).toMatchObject({ opt: CTX_OPT.kill, hold: true });
  });

  it('from behind: A grabs on the press and stays owned while held (the grab keeps reading the raw A, below)', () => {
    const f = fake();
    f.offer = guard('behind');
    const cp = new ContextPrompts();
    const h = host(f);
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: true, aWas: false, y: false, yWas: false };
    expect(stepCtx(cp, h, inp, js, p)).toBe(true);
    expect(cp.run).toMatchObject({ opt: CTX_OPT.grab, hold: false });
    // the takedown starts: the prompts stand aside, A is still the press the grab took
    f.aside = true;
    expect(stepCtx(cp, h, inp, js, p)).toBe(false);
    expect(cp.ctxOwnsA).toBe(true);
  });
});

describe('contextProviders: the wiring in gameState.ts (source guards)', () => {
  const src = readFileSync(resolve(__dirname, '../src/game/gameState.ts'), 'utf8');
  it('the prompts replace the menu step only with the flag on', () => {
    expect(src).toMatch(/if \(flags\.contextPrompts\) this\.contextPromptStep\(dt, real\);\s*else this\.contextMenuStep\(dt, real\);/);
  });
  it('a jump press the Y rule took is kept from traversal, the vent start and the door peek\'s end check', () => {
    expect(src).toContain("ti.startHeld = inp.down('jump') && !this.ctxOwnsY;");
    expect(src).toMatch(/this\.traversal\.fixedUpdate\(dt, inp\.pressed\('jump'\) && !this\.ctxOwnsY && /);
    expect(src).toContain("(inp.pressed('jump') && !this.ctxOwnsY && !interact)");
  });
  it('CHECK-P1 note 2: the grab\'s hold reads the raw A (never one gated on ctxOwnsA)', () => {
    const m = /tdk\.fixedUpdate\(dt, ([^\n]*)\);/.exec(src);
    expect(m).not.toBeNull();
    const args = m![1]!;
    expect(args.endsWith(", inp.down('interact')")).toBe(true);
    const held = args.slice(args.lastIndexOf(','));
    expect(held).not.toContain('ctxOwnsA');
    expect(held).not.toContain('aFree');
  });
  it('the old list readers go through ctxListOpen (always false under the flag): its body is the only one left', () => {
    expect(src).toContain("return !flags.contextPrompts && this.ctxMenu.state === 'active';");
    expect(src.match(/this\.ctxMenu\.state === 'active'|this\.ctxMenu\.state !== 'active'/g)?.length).toBe(1);
  });
});

// (context-prompts S5, PLAN 2 rows 10-11, 13-14, 24, 27, 38-39, 42-43; PLAN 6) co-op, hanging, carrying, the knife scene
// and a team move or offer under way
describe('contextProviders S5: co-op, hang-down, carry, knife, team states', () => {
  it("the partner's hostage with joint information: Y tap Bluff under the A row (row 13); none without it", () => {
    const f = fake();
    f.offer = guard('assist');
    expect(rows(f)).toMatchObject({ kind: 'hostage', a: 'Team takedown', y: '-' });
    f.joint = true;
    expect(rows(f)).toMatchObject({ kind: 'hostage', a: 'Team takedown', y: 'Bluff', yHold: '' });
    // the knife scene keeps the hostage a team takedown, with the bluff (A19)
    f.knife = true;
    expect(rows(f)).toMatchObject({ kind: 'hostage', a: 'Team takedown', y: 'Bluff' });
  });

  it('the bluff: Y tap beside the hold runs it on the press and owns Y; a climb on offer or a running hold keeps Y the jump', () => {
    const f = fake();
    f.offer = guard('assist');
    f.joint = true;
    const h = host(f);
    let cp = new ContextPrompts();
    const p: Pads = { a: false, aWas: false, y: true, yWas: false };
    expect(stepCtx(cp, h, emptyCtxPromptInput(), groundJs(), p)).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_Y, opt: CTX_OPT.bluff, kind: 'hostage', ref: ctxRefOf('g1'), hold: false });
    expect(cp.ctxOwnsY).toBe(true);
    for (const k of ['hint', 'busy', 'team'] as const) {
      cp = new ContextPrompts();
      const js = groundJs();
      js[k] = true;
      const q: Pads = { a: false, aWas: false, y: true, yWas: false };
      expect(stepCtx(cp, h, emptyCtxPromptInput(), js, q), k).toBe(false);
      expect(cp.ctxOwnsY, k).toBe(false);
      expect(cp.shows(CTX_Y), k).toBe(false);
      expect(cp.shows(CTX_A), k).toBe(true);
    }
  });

  it('a team move or offer under way (rows 42-43): only the takedown on offer and the item in reach are listed', () => {
    const f = fake();
    f.team = true;
    f.held = { id: 'h', pos: { x: 0, y: 0, z: 0.6 }, def: { scale: 1 } };
    f.doors = [door()];
    f.door = 0;
    f.gaps = [{ x: 0, y: 0, z: 1 }];
    f.gap = 0;
    f.items = [item('switch', 'Lights off')];
    f.item = f.items[0]!;
    let r = rows(f);
    expect(r).toMatchObject({ kind: 'item', a: 'Lights off', y: '-', count: 1 });
    f.offer = guard('behind', { z: 1.6 });
    const cp = new ContextPrompts();
    fillContextPrompts(cp, host(f));
    expect([cp.count, cp.find('door', 0), cp.find('gap', 0), cp.find('held', ctxRefOf('h'))]).toEqual([2, -1, -1, -1]);
    r = rows(f);
    expect(r).toMatchObject({ kind: 'guard', a: 'Grab', rt: 'Knock out' });
  });

  it('a team offer next to an item: A uses the item (its prompt, not the centre one); a guard on offer keeps A (row 43)', () => {
    const f = fake();
    f.team = true;
    f.items = [item('switch', 'Lights off')];
    f.item = f.items[0]!;
    const h = host(f);
    let cp = new ContextPrompts();
    const js = groundJs();
    js.team = true;
    const p: Pads = { a: true, aWas: false, y: false, yWas: false };
    expect(stepCtx(cp, h, emptyCtxPromptInput(), js, p)).toBe(true);
    expect(cp.run).toMatchObject({ slot: CTX_A, opt: CTX_OPT.use, kind: 'item', ref: 0 });
    expect(cp.ctxOwnsA).toBe(true);
    f.offer = guard('front', { z: 1.6 });
    cp = new ContextPrompts();
    const q: Pads = { a: true, aWas: false, y: false, yWas: false };
    stepCtx(cp, h, emptyCtxPromptInput(), js, q);
    expect(cp.kind).toBe('guard');
    q.a = false;
    expect(stepCtx(cp, h, emptyCtxPromptInput(), js, q)).toBe(true);
    expect(cp.run).toMatchObject({ kind: 'guard', opt: CTX_OPT.ko });
  });

  it('hanging head-first (rows 10-11): the guard below A Grab, RT Choke / Neck snap; no guard, the item in reach on A', () => {
    const f = fake();
    f.offer = guard('hangDown');
    expect(rows(f)).toMatchObject({ kind: 'guard', a: 'Grab', rt: 'Choke', rtHold: 'Neck snap' });
    f.offer = null;
    f.items = [item('terminal', 'Hack the terminal', 3)];
    f.item = f.items[0]!;
    expect(rows(f)).toMatchObject({ kind: 'item', a: '', aHold: 'Hack the terminal', aFill: true });
  });

  it('carrying (row 24): Hide body at a hide spot, Open / Close at a door, else Drop body on the floor ahead', () => {
    const f = fake();
    f.carrying = true;
    f.items = [item('hide', 'Hide body')];
    f.item = f.items[0]!;
    expect(rows(f)).toMatchObject({ kind: 'carry', a: 'Hide body' });
    f.doors = [door(0)];
    f.items = [item('door', 'Door', 0, 'door-0')];
    f.item = f.items[0]!;
    expect(rows(f)).toMatchObject({ kind: 'carry', a: 'Open', count: 1 });
    f.doors = [door(1)];
    expect(rows(f).a).toBe('Close');
    // the drop: an item of its own outside the list (`dropIt`, kind body): its label, never "Pick up", 1 m ahead
    f.items = [];
    f.item = item('body', 'Drop body', 0, 'drop-body');
    f.feet = { x: 2, y: 0.5, z: -1 };
    f.yaw = Math.PI / 2;
    const cp = new ContextPrompts();
    fillContextPrompts(cp, host(f));
    const c = cp.cands[0]!;
    expect([cp.count, c.kind, c.ref, c.rows[CTX_A]!.tapLabel]).toEqual([1, 'carry', -1, 'Drop body']);
    expect(c.x).toBeCloseTo(2 + CTX_DROP_AHEAD);
    expect(c.y).toBeCloseTo(0.5 + CTX_DROP_Y);
    expect(c.z).toBeCloseTo(-1);
    // not carrying, a body on the floor is still picked up
    f.carrying = false;
    f.items = [item('body', 'Pick up body')];
    f.item = f.items[0]!;
    expect(rows(f)).toMatchObject({ kind: 'item', a: 'Pick up' });
  });

  it("the partner's revive (row 27): hold A fills for the revive time and runs; the countdown in its label never cancels it", () => {
    const f = fake();
    const rv: { id: string; kind: InteractKind; pos: CtxP3; label: string; holdTime: number } = { id: 'revive-1', kind: 'revive', pos: { x: 0.5, y: 0, z: 1 }, label: 'Revive Ash (24)', holdTime: 0.5 };
    f.items = [rv];
    f.item = rv;
    expect(rows(f)).toMatchObject({ kind: 'item', a: '', aHold: 'Revive Ash (24)', aFill: true });
    const h = host(f);
    const cp = new ContextPrompts();
    const inp = emptyCtxPromptInput();
    const js = groundJs();
    const p: Pads = { a: true, aWas: false, y: false, yWas: false };
    let ran = false;
    let t = 0;
    for (; t < 1 && !ran; t += DT) {
      // the host rewrites the label each second (the same item, as `Interactable.label`)
      if (t > 0.2) rv.label = 'Revive Ash (23)';
      ran = stepCtx(cp, h, inp, js, p);
      if (!ran && t > 0.1) expect(cp.holdSlot).toBe(CTX_A);
    }
    expect(ran).toBe(true);
    expect(t).toBeGreaterThan(0.45);
    expect(cp.run).toMatchObject({ slot: CTX_A, opt: CTX_OPT.use, kind: 'item', hold: true });
  });

  it('the knife scene (row 14): A runs the knife takedown on the press, tap or hold, on any guard on two legs; no grab', () => {
    const f = fake();
    f.knife = true;
    for (const k of ['behind', 'front', 'side', 'above'] as const) {
      f.offer = guard(k);
      expect(rows(f), k).toMatchObject({ kind: 'guard', a: 'Knife takedown', aHold: '', rt: 'Knife takedown' });
      const cp = new ContextPrompts();
      const p: Pads = { a: true, aWas: false, y: false, yWas: false };
      expect(stepCtx(cp, host(f), emptyCtxPromptInput(), groundJs(), p), k).toBe(true);
      expect(cp.run, k).toMatchObject({ slot: CTX_A, opt: CTX_OPT.knife, hold: false });
    }
  });

  it('team and kit prompts (PLAN 6): the full line with the flag off, the short move name with it on', () => {
    const was = flags.contextPrompts;
    try {
      flags.contextPrompts = false;
      expect(ctxText('Co-op: take the leg-up', 'Take the leg-up')).toBe('Co-op: take the leg-up');
      flags.contextPrompts = true;
      expect(ctxText('Co-op: take the leg-up', 'Take the leg-up')).toBe('Take the leg-up');
    } finally {
      flags.contextPrompts = was;
    }
    const read = (f: string): string => readFileSync(resolve(__dirname, '../src/game/', f), 'utf8');
    const team = read('teamController.ts');
    for (const s of ["ctxText('Co-op: take the leg-up', 'Take the leg-up')", "ctxText('Leg-up offered: waiting for your partner', 'Leg-up offered\\nwaiting for your partner')", "'Pull me up')", "ctxText('Co-op: be lowered head-first (hang-down)', 'Hang down')"]) expect(team).toContain(s);
    // the hanger's "Pull me up" sits on the holder under the flag
    expect(team).toContain('if (flags.contextPrompts && m) this.promptAt.set(m.pos.x, m.pos.y + 1.5, m.pos.z);');
    // every "Co-op: ..." line is wrapped (its short name under the flag)
    const wrapped = (f: string, src: string): void => {
      for (const m of src.matchAll(/'Co-op: [^']*'|"Co-op: [^"]*"/g)) expect(src.slice(m.index - 8, m.index), `${f} ${m[0]}`).toBe('ctxText(');
    };
    wrapped('teamController.ts', team);
    for (const f of ['kit/pullUp.ts', 'kit/shutter.ts', 'kit/chimneyPair.ts']) {
      const src = read(f);
      expect(src, f).toContain("import { ctxText } from '../contextPrompts';");
      wrapped(f, src);
    }
  });
});

describe('contextProviders S5: the wiring in gameState.ts (source guards)', () => {
  const src = readFileSync(resolve(__dirname, '../src/game/gameState.ts'), 'utf8').replace(/\r\n/g, '\n');
  const body = (name: string): string => {
    const at = src.indexOf(`  private ${name}(`);
    expect(at, name).toBeGreaterThan(0);
    return src.slice(at, src.indexOf('\n  }\n', at));
  };
  it("a team move or offer and hanging are no stand-asides under the flag; the item in reach is the prompts' there", () => {
    const b = body('contextPromptStep');
    expect(b).not.toContain('this.team.active && !hangActs');
    expect(b).not.toContain('hangDirect ?');
    expect(b).toContain('if (it !== this.interactTarget) {');
  });
  it("today's direct A paths stand down under the flag: the item (`updateInteract`) and the team press", () => {
    expect(body('updateInteract')).toContain('if (flags.contextPrompts || !this.team.active ||');
    expect(src).toMatch(/tdk\.fixedUpdate\(dt, !flags\.contextPrompts && this\.team\.active && /);
  });
  it("the bluff runs the menu's call; the old takedown prompt never shows under the flag", () => {
    expect(body('ctxPromptRun')).toContain('if (r.opt === CTX_OPT.bluff) this.net?.jointBluff?.(o.e);');
    expect(src).toContain("if (flags.contextPrompts) w.set('takedown', null, 0, 0);");
  });
});
