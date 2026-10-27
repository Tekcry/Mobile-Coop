/**
 * (context-prompts S1, `docs/context-prompts/PLAN.md` sections 2, 4 and 5; BRIEF A1-A12) The context prompt model, pure
 * and Babylon-free: the button for each action fades in on the thing it acts on, one press runs it, holding the same
 * button runs its stronger version. Dark behind `flags.contextPrompts` (S3 wires it into `GameState`; P1 adds no caller).
 *
 * Each step the providers (S3, `contextProviders.ts`) refill fixed candidate slots: `begin`, then `add` per target in
 * reach (its kind, a number naming it, its distance and angle off the camera's aim, its prompt anchor) and the rows it
 * offers per button (`tapRow` / `pairRow` / `fillRow`). `step` then
 * - picks the focus (section 4, A11): a held guard, else a takedown offer (the guard or the partner's hostage keeps A),
 *   else the best `dist + CTX_FOCUS.angleW x angle`. It is sticky: a candidate of the same rank takes it only when it
 *   scores better by `CTX_FOCUS.margin` for `CTX_FOCUS.dwell` s; a higher rank takes it at once. It is locked while a
 *   press this model owns is down, or RT is down on a guard; a hold whose target leaves (or whose row changes under the
 *   thumb: a guard turning must not turn Knock out into Kill) cancels with no action (A12);
 * - resolves A and Y (Y only for a press the Y rule gave it, `contextJump.ts`): a row with no hold action runs its tap
 *   on the press; a row with one runs the tap on a release before its hold time and the hold once the time is reached
 *   (`CTX_HOLD` for a tap / hold pair, A3; the item's own time for a plain hold item, A9, which `holdToggle` latches);
 *   a scripted or one-step tap (pressed with the button already up) runs the tap at once. RT and LT rows are labels
 *   only: their own systems run them (A4);
 * - owns the presses (`ctxOwnsA`, `ctxOwnsY`): a press it took is swallowed until let go, so traversal, the door peek,
 *   the vent start and the team-move press never see it; while the focus has an A row, A is the context's.
 * The focused target is copied into this object's model fields for the view (`CtxPromptSink`, S4); `version` bumps only
 * when something the view draws changes (positions are read every frame). Nothing here allocates after construction.
 */
import { flags } from '../core/flags';
import type { ButtonAction } from '../input/actions';
import { STANCE } from '../player/weaponStance';

/** (S5, PLAN 6) A team or kit move prompt: under `flags.contextPrompts` the short move name (G151), its waiting text as
 *  a small second line after '\n' (the world prompt draws it); with the flag off the full line, as today. Constants
 *  in, no allocation. */
export function ctxText(full: string, short: string): string {
  return flags.contextPrompts ? short : full;
}

/** What a candidate is. `held`: the guard held; `guard`: the takedown on offer (behind, faced, lethal-only, hang-down,
 *  knife); `hostage`: the partner's hostage (team takedown, bluff); `door`: a door faced (closed, sliding or open);
 *  `gap`: an optic gap; `item`: an interactable in reach; `carry`: the carry target while carrying a body. */
export type CtxKind = 'none' | 'held' | 'guard' | 'hostage' | 'door' | 'gap' | 'item' | 'carry';

/** The button slots of a prompt, one row each (section 4): A, Y, RT, LT. */
export type CtxSlot = 0 | 1 | 2 | 3;
export const CTX_A: CtxSlot = 0;
export const CTX_Y: CtxSlot = 1;
export const CTX_RT: CtxSlot = 2;
export const CTX_LT: CtxSlot = 3;
export const CTX_SLOTS = 4;

/** (A1, A2, A4, A24) The verb behind each slot (its glyph follows the binding): A the interact verb, Y the jump verb
 *  (the second action rides it under the Y rule), RT the trigger, LT the aim. Undo A1: change the button here. */
export const CTX_SLOT_BUTTON: readonly ButtonAction[] = ['interact', 'jump', 'fire', 'ads'];

/** (A3) One hold time for every tap / hold pair, the RT strike's (s). Starting value, not tuned before Michael plays. */
export const CTX_HOLD: number = STANCE.rtHold;

/** (A11, section 4) Focus numbers, starting values: `angleW` m per radian off the camera's aim; `margin` m a rival of
 *  the same rank must win by, for `dwell` s; `fade` s the focused cluster fades in and out over (the view's CSS). */
export const CTX_FOCUS = { angleW: 1.0, margin: 0.25, dwell: 0.15, fade: 0.15 } as const;

/** Most candidates per step (fixed slots). */
export const CTX_CANDS = 8;

/** The focus rank of a kind: a held guard, then a takedown offer, then everything else by score. */
export function ctxRank(kind: CtxKind): number {
  return kind === 'held' ? 0 : kind === 'guard' || kind === 'hostage' ? 1 : 2;
}

/** One button's row on a target: "tap label · hold label". */
export interface CtxRow {
  /** Offered this step. */
  on: boolean;
  /** What a tap runs (a constant tag; '' none) and its label. */
  tap: string;
  tapLabel: string;
  /** What the hold runs ('' none) and its label. */
  hold: string;
  holdLabel: string;
  /** Seconds the hold needs: `CTX_HOLD` for a tap / hold pair, the item's own time for a plain hold item; 0: no hold. */
  holdTime: number;
  /** (A9) A plain hold item (a hack, a panel, a revive): its fill shows and `access.holdToggle` latches it. */
  fill: boolean;
}

/** A target in reach this step. */
export interface CtxCand {
  kind: CtxKind;
  /** The number naming it within its kind (a door or gap index, a guard id, an item index; -1 none). */
  ref: number;
  /** Metres from the body, radians off the camera's aim (the provider measures both). */
  dist: number;
  angle: number;
  /** Where the prompt sits (world metres). */
  x: number;
  y: number;
  z: number;
  /** One row per slot (`CTX_A` .. `CTX_LT`). */
  readonly rows: readonly CtxRow[];
}

/** A button as the model reads it this step. */
export interface CtxBtn {
  down: boolean;
  pressed: boolean;
  released: boolean;
}

/** What `step` reads (a reused object). */
export interface CtxPromptInput {
  /** A (the interact verb). */
  a: CtxBtn;
  /** The jump verb. `pressed` only for a press the Y rule gave the context system (`ctxJumpTaker` 'second'). */
  y: CtxBtn;
  /** RT held: it locks the focus on a guard (held, offer or hostage). */
  rtDown: boolean;
  /** Settings > Accessibility "Held interactions: Tap to start" (`access.holdToggle`): plain hold items latch. */
  holdToggle: boolean;
  /** The Y rule would take a press now (`ctxJumpTaker` 'second'): the target's Y row shows. */
  yLive: boolean;
}

export function emptyCtxPromptInput(): CtxPromptInput {
  return {
    a: { down: false, pressed: false, released: false },
    y: { down: false, pressed: false, released: false },
    rtDown: false,
    holdToggle: false,
    yLive: false,
  };
}

/** What a step ran (a reused object; valid until the next `step`). */
export interface CtxRun {
  slot: CtxSlot;
  /** The row's tag (`tap` or `hold`). */
  opt: string;
  hold: boolean;
  kind: CtxKind;
  ref: number;
}

/** What the view draws: the focused target (`kind` 'none': nothing), its anchor and rows, the hold under way. */
export interface CtxPromptModel {
  readonly kind: CtxKind;
  readonly ref: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rows: readonly Readonly<CtxRow>[];
  /** The Y row shows (the Y rule would take a press now). */
  readonly yLive: boolean;
  /** The slot whose hold is under way (-1 none) and its fill 0..1 (the ring). */
  readonly holdSlot: number;
  readonly holdK: number;
  /** Bumped whenever anything above but the anchor changes. */
  readonly version: number;
  /** A row the view lists: offered, and for Y only while the rule would take the press. */
  shows(slot: CtxSlot): boolean;
}

/** (section 5) The view seam: S3 calls it every step through the HUD's optional hook, S4 implements it. */
export interface CtxPromptSink {
  update(model: CtxPromptModel): void;
}

function newRow(): CtxRow {
  return { on: false, tap: '', tapLabel: '', hold: '', holdLabel: '', holdTime: 0, fill: false };
}

function newCand(): CtxCand {
  return { kind: 'none', ref: -1, dist: 0, angle: 0, x: 0, y: 0, z: 0, rows: [newRow(), newRow(), newRow(), newRow()] };
}

/** The rows of no focus (never written). */
const BLANK_ROW: Readonly<CtxRow> = newRow();

function clearRow(r: CtxRow): void {
  r.on = false;
  r.tap = '';
  r.tapLabel = '';
  r.hold = '';
  r.holdLabel = '';
  r.holdTime = 0;
  r.fill = false;
}

function setRow(r: CtxRow, tap: string, tapLabel: string, hold: string, holdLabel: string, holdTime: number, fill: boolean): void {
  r.on = true;
  r.tap = tap;
  r.tapLabel = tapLabel;
  r.hold = hold;
  r.holdLabel = holdLabel;
  r.holdTime = hold === '' ? 0 : holdTime;
  r.fill = fill;
}

/** Copy a row; true when anything changed. */
function copyRow(d: CtxRow, s: Readonly<CtxRow>): boolean {
  const ch = d.on !== s.on || d.tap !== s.tap || d.tapLabel !== s.tapLabel || d.hold !== s.hold || d.holdLabel !== s.holdLabel || d.holdTime !== s.holdTime || d.fill !== s.fill;
  d.on = s.on;
  d.tap = s.tap;
  d.tapLabel = s.tapLabel;
  d.hold = s.hold;
  d.holdLabel = s.holdLabel;
  d.holdTime = s.holdTime;
  d.fill = s.fill;
  return ch;
}

/** A row: a tap that runs on the press (no hold version here). */
export function tapRow(c: CtxCand, slot: CtxSlot, opt: string, label: string): void {
  setRow(c.rows[slot]!, opt, label, '', '', 0, false);
}

/** A row with a stronger version on hold (`CTX_HOLD`): the tap runs on a release before it. `tap` '' = hold only (a
 *  tap does nothing: the lethal-only guard, a door whose peek is not on offer). */
export function pairRow(c: CtxCand, slot: CtxSlot, tap: string, tapLabel: string, hold: string, holdLabel: string): void {
  setRow(c.rows[slot]!, tap, tapLabel, hold, holdLabel, CTX_HOLD, false);
}

/** (A9) A plain hold item: it fills while the button stays down for `seconds` (the item's own time) and runs when full. */
export function fillRow(c: CtxCand, slot: CtxSlot, opt: string, label: string, seconds: number): void {
  setRow(c.rows[slot]!, '', '', opt, label, seconds, true);
}

/** A row only shown, never run here (RT and LT: their own systems run them, A4). */
export function labelRow(c: CtxCand, slot: CtxSlot, tapLabel: string, holdLabel: string): void {
  setRow(c.rows[slot]!, '', tapLabel, '', holdLabel, 0, false);
}

export class ContextPrompts implements CtxPromptModel {
  /** The candidate slots (refilled each step). */
  readonly cands: CtxCand[] = [];
  /** Candidates listed this step. */
  count = 0;
  // the model the view reads (the focused target, copied)
  kind: CtxKind = 'none';
  ref = -1;
  x = 0;
  y = 0;
  z = 0;
  readonly rows: CtxRow[] = [newRow(), newRow(), newRow(), newRow()];
  yLive = false;
  holdSlot = -1;
  holdK = 0;
  version = 0;
  /** This step's action (when `step` returned true). */
  readonly run: CtxRun = { slot: CTX_A, opt: '', hold: false, kind: 'none', ref: -1 };
  /** A is the context's: the focus has an A row, or a press it took is still down. */
  ctxOwnsA = false;
  /** A jump press the Y rule gave the context system is still down (or was taken this step). */
  ctxOwnsY = false;
  /** Seconds the pending press has been held (an item's fill: S3 copies it to the item's progress). */
  holdT = 0;

  /** Past `CTX_CANDS`: a scratch slot that is never listed (the provider writes into it harmlessly). */
  private readonly spare = newCand();
  private rank = 3;
  private score = 0;
  // the rival of the same rank and how long it has scored clearly better
  private rivalKind: CtxKind = 'none';
  private rivalRef = -1;
  private rivalT = 0;
  // the press under way on a row with a hold (-1 none), the row it was made on, a latched fill (holdToggle)
  private pend = -1;
  private pendTap = '';
  private pendHold = '';
  private latched = false;
  private swallowA = false;
  private swallowY = false;

  constructor() {
    for (let i = 0; i < CTX_CANDS; i++) this.cands.push(newCand());
  }

  /** Start refilling the candidates (each step, before the providers). */
  begin(): void {
    this.count = 0;
  }

  /** Add a candidate (all rows off; the provider sets them). Past `CTX_CANDS` it returns an unlisted scratch slot. */
  add(kind: CtxKind, ref: number, dist: number, angle: number, x: number, y: number, z: number): CtxCand {
    const c = this.count < CTX_CANDS ? this.cands[this.count++]! : this.spare;
    c.kind = kind;
    c.ref = ref;
    c.dist = dist;
    c.angle = angle;
    c.x = x;
    c.y = y;
    c.z = z;
    for (let s = 0; s < CTX_SLOTS; s++) clearRow(c.rows[s]!);
    return c;
  }

  /** A row the view lists: offered, and for Y only while the rule would take the press. */
  shows(slot: CtxSlot): boolean {
    return this.rows[slot]!.on && (slot !== CTX_Y || this.yLive);
  }

  /** The candidate index of a target this step, -1 when not listed. */
  find(kind: CtxKind, ref: number): number {
    for (let i = 0; i < this.count; i++) {
      const c = this.cands[i]!;
      if (c.kind === kind && c.ref === ref) return i;
    }
    return -1;
  }

  /** Clear everything (respawn, mode end). */
  reset(): void {
    this.count = 0;
    this.setFocus(-1);
    this.rivalKind = 'none';
    this.rivalT = 0;
    this.cancel();
    this.swallowA = false;
    this.swallowY = false;
    this.ctxOwnsA = false;
    this.ctxOwnsY = false;
    this.yLive = false;
    this.holdSlot = -1;
    this.holdK = 0;
    for (let s = 0; s < CTX_SLOTS; s++) copyRow(this.rows[s]!, BLANK_ROW);
    this.version++;
  }

  /** One step after the providers: the focus, then A and Y. True when an action runs now (read `run`). */
  step(i: CtxPromptInput, dt: number): boolean {
    this.focus(i, dt);
    return this.resolve(i, dt);
  }

  /** (S3) `step`'s first half: pick the focus this step keeps. The caller then judges the Y rule against it (`kind`,
   *  `focusRow`) before `resolve`, so a jump press is never judged against last step's focus (a guard offer taking the
   *  focus from a door in the step of the press). Reads `a.down`, `y.down` and `rtDown`; `y.pressed` and `yLive` only
   *  matter to `resolve`. */
  focus(i: CtxPromptInput, dt: number): void {
    if (!i.a.down) this.swallowA = false;
    if (!i.y.down) this.swallowY = false;
    this.pickFocus(i, dt);
  }

  /** The focused candidate's row on `slot` this step (after `focus`); an off row when nothing is focused. */
  focusRow(slot: CtxSlot): Readonly<CtxRow> {
    const at = this.find(this.kind, this.ref);
    return at >= 0 ? this.cands[at]!.rows[slot]! : BLANK_ROW;
  }

  /** `step`'s second half (after `focus`): the model's rows, then A and Y. True when an action runs now (read `run`). */
  resolve(i: CtxPromptInput, dt: number): boolean {
    let ch = false;
    if (i.yLive !== this.yLive) {
      this.yLive = i.yLive;
      ch = true;
    }
    const at = this.find(this.kind, this.ref);
    const c = at >= 0 ? this.cands[at]! : null;
    for (let s = 0; s < CTX_SLOTS; s++) if (copyRow(this.rows[s]!, c ? c.rows[s]! : BLANK_ROW)) ch = true;
    if (c) {
      this.x = c.x;
      this.y = c.y;
      this.z = c.z;
    }
    // A is taken only on a target with an A row (else it stays free for the other A readers); a Y press only reaches
    // here when the Y rule gave it, so it is always owned
    const tookA = i.a.pressed && this.rows[CTX_A]!.on;
    const tookY = i.y.pressed;
    const pendWas = this.pend;
    let ran = false;
    if (tookA) ran = this.press(CTX_A, i.a, i.holdToggle);
    if (tookY) {
      if (ran) this.swallowY = i.y.down;
      else ran = this.press(CTX_Y, i.y, i.holdToggle);
    }
    // a hold that was under way before this step (not one started or stopped by a press now) advances
    if (!ran && pendWas >= 0 && this.pend === pendWas) ran = this.hold(pendWas === CTX_A ? i.a : i.y, dt);
    this.ctxOwnsA = tookA || this.swallowA || this.rows[CTX_A]!.on;
    this.ctxOwnsY = tookY || this.swallowY;
    const held = ran && this.run.hold;
    const hs = held ? this.run.slot : this.pend;
    const hk = held ? 1 : this.pend >= 0 ? Math.min(1, this.holdT / Math.max(1e-6, this.rows[this.pend]!.holdTime)) : 0;
    if (hs !== this.holdSlot || hk !== this.holdK) {
      this.holdSlot = hs;
      this.holdK = hk;
      ch = true;
    }
    if (ch) this.version++;
    return ran;
  }

  // the focus: sticky, locked while a press is owned, a higher rank at once, a same-rank rival after the dwell
  private pickFocus(i: CtxPromptInput, dt: number): void {
    const cur = this.find(this.kind, this.ref);
    if (cur >= 0 && this.pend >= 0) {
      const r = this.cands[cur]!.rows[this.pend]!;
      // the row changed under the thumb: the hold cancels with no action
      if (!r.on || r.tap !== this.pendTap || r.hold !== this.pendHold) this.cancel();
    }
    if (cur < 0) {
      // the target left reach: a hold under way cancels with no action (A12)
      this.cancel();
      this.setFocus(-1);
    } else {
      const k = this.cands[cur]!.kind;
      const rtLock = i.rtDown && (k === 'held' || k === 'guard' || k === 'hostage');
      if (this.pend >= 0 || this.swallowA || this.swallowY || rtLock) {
        this.rivalKind = 'none';
        this.rivalT = 0;
        return;
      }
    }
    let best = -1;
    let bRank = 3;
    let bScore = 0;
    for (let j = 0; j < this.count; j++) {
      const c = this.cands[j]!;
      const rk = ctxRank(c.kind);
      const sc = c.dist + CTX_FOCUS.angleW * c.angle;
      if (best < 0 || rk < bRank || (rk === bRank && sc < bScore)) {
        best = j;
        bRank = rk;
        bScore = sc;
      }
    }
    if (cur >= 0) {
      const cc = this.cands[cur]!;
      this.rank = ctxRank(cc.kind);
      this.score = cc.dist + CTX_FOCUS.angleW * cc.angle;
    }
    if (best < 0 || best === cur) {
      this.rivalKind = 'none';
      this.rivalT = 0;
      if (best < 0) this.setFocus(-1);
      return;
    }
    if (cur < 0 || bRank < this.rank) {
      this.setFocus(best);
      return;
    }
    const b = this.cands[best]!;
    if (bScore + CTX_FOCUS.margin < this.score) {
      if (b.kind !== this.rivalKind || b.ref !== this.rivalRef) {
        this.rivalKind = b.kind;
        this.rivalRef = b.ref;
        this.rivalT = 0;
      }
      this.rivalT += dt;
      if (this.rivalT >= CTX_FOCUS.dwell - 1e-9) this.setFocus(best);
    } else {
      this.rivalKind = 'none';
      this.rivalT = 0;
    }
  }

  private setFocus(j: number): void {
    const c = j >= 0 ? this.cands[j]! : null;
    const kind = c ? c.kind : 'none';
    const ref = c ? c.ref : -1;
    if (kind !== this.kind || ref !== this.ref) {
      this.kind = kind;
      this.ref = ref;
      this.version++;
    }
    this.rank = c ? ctxRank(c.kind) : 3;
    this.score = c ? c.dist + CTX_FOCUS.angleW * c.angle : 0;
    this.rivalKind = 'none';
    this.rivalT = 0;
  }

  // a press this model took on the focus's row `s`
  private press(s: CtxSlot, b: CtxBtn, toggle: boolean): boolean {
    if (s === CTX_A) this.swallowA = b.down;
    else this.swallowY = b.down;
    // a press on the other slot while a hold is under way: owned, nothing runs
    if (this.pend >= 0 && this.pend !== s) return false;
    const r = this.rows[s]!;
    if (this.pend === s) {
      // (A9) a latched fill: the next press stops it
      this.cancel();
      return false;
    }
    if (!r.on) return false;
    if (r.holdTime <= 0) return r.tap !== '' && this.fire(s, r.tap, false);
    if (r.fill && toggle) {
      this.start(s, r);
      this.latched = true;
      return false;
    }
    // a scripted tap or a press and release within one step: the tap at once (no hold timing)
    if (!b.down) return r.tap !== '' && this.fire(s, r.tap, false);
    this.start(s, r);
    return false;
  }

  // a press under way on a row with a hold
  private hold(b: CtxBtn, dt: number): boolean {
    const s = this.pend as CtxSlot;
    const r = this.rows[s]!;
    if (b.down || this.latched) {
      this.holdT += dt;
      if (this.holdT < r.holdTime - 1e-9) return false;
      const opt = r.hold;
      this.cancel();
      return this.fire(s, opt, true);
    }
    // let go before the hold time: the tap (nothing on a hold-only row or an item fill)
    const opt = r.tap;
    this.cancel();
    return opt !== '' && this.fire(s, opt, false);
  }

  private start(s: CtxSlot, r: CtxRow): void {
    this.pend = s;
    this.pendTap = r.tap;
    this.pendHold = r.hold;
    this.holdT = 0;
    this.latched = false;
  }

  private cancel(): void {
    this.pend = -1;
    this.pendTap = '';
    this.pendHold = '';
    this.holdT = 0;
    this.latched = false;
  }

  private fire(s: CtxSlot, opt: string, hold: boolean): boolean {
    const u = this.run;
    u.slot = s;
    u.opt = opt;
    u.hold = hold;
    u.kind = this.kind;
    u.ref = this.ref;
    return true;
  }
}
