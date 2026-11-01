/**
 * (context-prompts S3, `docs/context-prompts/PLAN.md` sections 1, 2 and 4; BRIEF A1-A12) The providers: each step they
 * refill the context prompt candidates (`ContextPrompts`, S1) from today's sources, read through a narrow host
 * (`CtxHost`, implemented once by `GameState`), and give each target its rows per button. Pure and Babylon-free, so the
 * tests run it on a fake host. Dark behind `flags.contextPrompts` (with the flag off nothing here is called).
 *
 * The rows (PLAN 2; S3: inventory rows 1-8, 12, 15-23, 25-26 and 28-33; S5: 10-11 hanging, 13 the bluff, 24 carrying,
 * 27 the revive and 42-43 a team move or offer under way):
 * - the held guard: A tap Interrogate (only with information); RT tap Knock out / hold Kill and LT Shield (labels: their
 *   own systems run them, A4, A16);
 * - the takedown on offer: from behind A tap Grab (A5); faced A tap Knock out (or the kind's own name), A hold Kill (A6;
 *   knife-kills: the paired knife kill where the kind has a row); lethal-only A hold Kill; hanging head-first A tap Grab,
 *   RT Choke / Neck snap (row 10); the partner's hostage A tap Team takedown (A17), and with joint information Y tap
 *   Bluff for the player beside the hold (A23, row 13);
 * - the closed door faced: A tap Open, A hold Bash; Y tap Peek (only when the peek is on offer), Y hold Optic cable
 *   (A7); a sliding door A tap Open only; an open door (its own item) A tap Close;
 * - else the optic gap in reach: A tap Open trap (a closed panel covers it), Y tap Optic cable (A8);
 * - the item in reach: A tap, or a fill for the item's own hold time (A9; the partner's revive point too, row 27;
 *   hanging, the item in reach, row 11); carrying, the carry target: Hide body / Open / Close / Drop body, the drop on
 *   the floor ahead (A15, row 24).
 * In a team move or offer under way (rows 42-43, A14) only the takedown on offer and the item in reach are candidates:
 * A keeps today's two direct jobs, now with world prompts, and doors and hatches are not targets (Y as today).
 * The Y rows show only while the Y rule takes a jump press (`ctxPromptStep`, `contextJump.ts`). Allocation-free per step.
 */
import { hyp2 } from '../core/mathx';
import { ctxJumpTaker, type CtxJumpState } from './contextJump';
import { CTX_A, CTX_LT, CTX_RT, CTX_Y, fillRow, labelRow, pairRow, tapRow, type ContextPrompts, type CtxCand, type CtxKind, type CtxPromptInput } from './contextPrompts';
import type { InteractKind } from './interactables';
import { takedownRow } from './knifeKill';
import type { TakedownKind } from './takedown';

/** A world point. */
export interface CtxP3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A guard as the providers read him (`TakedownVictim` fits). */
export interface CtxGuardRef {
  readonly id: string;
  readonly pos: CtxP3;
  readonly def: { readonly scale: number; readonly quadruped?: boolean };
}

/** The takedown on offer (`TakedownController.offer` fits). */
export interface CtxOfferRef {
  readonly e: CtxGuardRef;
  readonly plan: { readonly kind: TakedownKind };
  readonly lethalOnly: boolean;
}

/** A door as the providers read it (`DoorState` fits). */
export interface CtxDoorRef {
  readonly cx: number;
  readonly cz: number;
  readonly target: 0 | 1;
  readonly anchor: { readonly hinge: CtxP3; readonly yaw: number; readonly width: number; readonly leaf?: 'swing' | 'slide' };
}

/** An interactable as the providers read it (`Interactable` fits). */
export interface CtxItemRef {
  readonly id: string;
  readonly kind: InteractKind;
  readonly pos: CtxP3;
  readonly label: string;
  readonly holdTime: number;
}

/** What the providers read of the game (`GameState` implements it once; the tests fake it). */
export interface CtxHost {
  /** The body's feet. */
  feet(): CtxP3;
  /** The camera's yaw (its plan forward is (sin, cos)). */
  camYaw(): number;
  /** Today's stand-asides (`contextMenuStep`'s `aside`): down, a team move, a door peek, the optic view, a remote view,
   *  the wheel, a takedown / finisher / lift running. Nothing is listed. */
  aside(): boolean;
  /** The guard held while a pick may run (`takedown.menuReady`), else null. */
  held(): CtxGuardRef | null;
  /** The held guard has information (Interrogate is listed). */
  heldInfo(): boolean;
  /** The takedown on offer (null: none, or a strike or takedown already running). */
  offer(): CtxOfferRef | null;
  /** (S5, G148) The offer is the partner's hostage and he has joint information: this player may bluff him. */
  joint(): boolean;
  /** (S5, rows 42-43) A team move or offer is under way, not hanging (`team.active && !team.hangActs`): only the
   *  takedown on offer and the item in reach are candidates. */
  teamMove(): boolean;
  /** RT is the strike or the held guard's finisher now (holstered or holding, not aiming): its row shows. */
  rtFree(): boolean;
  /** The closed, unlocked door faced in reach (`doorMenuCandidate`), else -1. */
  doorCandidate(): number;
  /** Door `i`, else null. */
  door(i: number): CtxDoorRef | null;
  /** The door the peek is on offer at (`peekOffer`), else -1. */
  peekOffer(): number;
  /** The optic gap in reach (`gapMenuCandidate`), else -1. */
  gapCandidate(): number;
  /** Gap `i`'s point, else null. */
  gapAt(i: number): CtxP3 | null;
  /** A closed panel covers gap `i` (Open trap is listed). */
  gapOpenable(i: number): boolean;
  /** The item in reach with today's rules (the carry target first while carrying), else null. */
  item(): CtxItemRef | null;
  /** The number naming the item (its index in the list; -1 the carry's drop target). */
  itemRef(it: CtxItemRef): number;
  /** A door's own item: the index of the door it opens or closes, else -1. */
  itemDoor(it: CtxItemRef): number;
  /** Carrying a body (the item is the carry target). */
  carrying(): boolean;
}

/** The row tags (`CtxRun.opt`): the takedown's, the held guard's, the door's (`DoorOpt`), the gap's (`GapOpt`), an item's. */
export const CTX_OPT = {
  grab: 'grab',
  ko: 'ko',
  kill: 'kill',
  interrogate: 'interrogate',
  open: 'open',
  stealth: 'stealth',
  bash: 'bash',
  optic: 'optic',
  trap: 'trap',
  use: 'use',
  bluff: 'bluff',
} as const;

/** (PLAN 2 rows 2-4) A faced takedown's tap label by kind (A6: the hold is Kill). */
export const CTX_TD_TAP: Readonly<Record<TakedownKind, string>> = {
  behind: 'Knock out',
  front: 'Knock out',
  side: 'Knock out',
  overCover: 'Knock out',
  corner: 'Knock out',
  above: 'Drop attack',
  drop: 'Drop attack',
  below: 'Pull over ledge',
  window: 'Pull through window',
  inverted: 'Choke',
  hangDown: 'Knock out',
  assist: 'Team takedown',
};

/** (PLAN 2 rows 20-33) Where an item's prompt sits over its `pos`, per kind (m; starting values, G10: the greybox's own
 *  heights, `Interactables.add`). Every `InteractKind` has one. */
export const KIND_PROMPT_Y: Readonly<Record<InteractKind, number>> = {
  terminal: 1.2,
  cache: 0.6,
  extract: 1.0,
  switch: 1.3,
  alarm: 1.4,
  hide: 1.0,
  body: 0.3,
  door: 1.1,
  vip: 1.6,
  intel: 0.15,
  charge: 0.9,
  revive: 0.6,
  medkitWall: 1.25,
  crate: 0.55,
};

/** A guard's prompt height over his feet (x his scale), as today's takedown prompt. */
export const CTX_GUARD_Y = 1.95;
/** A door's prompt: this far up the leaf (m) and this share of its width from the hinge (the latch side). */
export const CTX_DOOR_Y = 1.1;
export const CTX_DOOR_LATCH = 0.85;
/** (S5, row 24) Carrying with nothing to hide in or open: the drop's prompt this far ahead (m), on the floor. */
export const CTX_DROP_AHEAD = 1.0;
export const CTX_DROP_Y = 0.05;

/** A stable number for a guard id (allocation-free; the focus compares it, so a new guard is a new target). */
export function ctxRefOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h & 0x7fffffff;
}

// the last `measure`: plan distance from the feet and the angle off the camera's forward
let mDist = 0;
let mAngle = 0;
function measure(f: CtxP3, yaw: number, x: number, z: number): void {
  const dx = x - f.x;
  const dz = z - f.z;
  mDist = hyp2(dx, dz);
  if (mDist < 1e-4) {
    mAngle = 0;
    return;
  }
  const a = Math.atan2(dx, dz) - yaw;
  mAngle = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

function addGuard(cp: ContextPrompts, kind: CtxKind, e: CtxGuardRef, f: CtxP3, yaw: number): CtxCand {
  measure(f, yaw, e.pos.x, e.pos.z);
  return cp.add(kind, ctxRefOf(e.id), mDist, mAngle, e.pos.x, e.pos.y + CTX_GUARD_Y * e.def.scale, e.pos.z);
}

/** Refill the candidates for this step (before `ctxPromptStep`). */
export function fillContextPrompts(cp: ContextPrompts, h: CtxHost): void {
  cp.begin();
  if (h.aside()) return;
  const f = h.feet();
  const yaw = h.camYaw();
  const rt = h.rtFree();
  // (rows 42-43) a team move or offer under way: the takedown on offer and the item in reach only
  const team = h.teamMove();
  // (rows 7-8, A16) a held guard: only his rows (as today's held list)
  const held = team ? null : h.held();
  if (held) {
    const c = addGuard(cp, 'held', held, f, yaw);
    if (h.heldInfo()) tapRow(c, CTX_A, CTX_OPT.interrogate, 'Interrogate');
    if (rt) {
      labelRow(c, CTX_RT, 'Knock out', 'Kill');
      labelRow(c, CTX_LT, 'Shield', '');
    }
    return;
  }
  // (rows 1-5, 12, 14) the takedown on offer: the guard keeps A over the rest (rank)
  const o = h.offer();
  if (o) {
    const k = o.plan.kind;
    const quad = !!o.e.def.quadruped;
    const assist = k === 'assist';
    const c = addGuard(cp, assist ? 'hostage' : 'guard', o.e, f, yaw);
    if (assist) {
      tapRow(c, CTX_A, CTX_OPT.ko, CTX_TD_TAP.assist);
      // (row 13, A17, A23) the bluff: a Y tap under the Y rule, for the player beside the hold
      if (h.joint()) tapRow(c, CTX_Y, CTX_OPT.bluff, 'Bluff');
    } else if (o.lethalOnly) {
      pairRow(c, CTX_A, '', '', CTX_OPT.kill, 'Kill');
      if (rt) labelRow(c, CTX_RT, '', 'Kill');
    } else if (takedownRow(k, quad) === 'grab') {
      tapRow(c, CTX_A, CTX_OPT.grab, 'Grab');
      if (rt) labelRow(c, CTX_RT, k === 'hangDown' ? 'Choke' : 'Knock out', k === 'hangDown' ? 'Neck snap' : 'Kill');
    } else {
      pairRow(c, CTX_A, CTX_OPT.ko, CTX_TD_TAP[k], CTX_OPT.kill, 'Kill');
      if (rt) labelRow(c, CTX_RT, 'Knock out', 'Kill');
    }
  }
  // (rows 15-16) the closed door faced, else (row 19) the optic gap in reach
  const di = team ? -1 : h.doorCandidate();
  const d = di >= 0 ? h.door(di) : null;
  if (d) {
    const a = d.anchor;
    const along = a.width * CTX_DOOR_LATCH;
    measure(f, yaw, d.cx, d.cz);
    const c = cp.add('door', di, mDist, mAngle, a.hinge.x + Math.sin(a.yaw) * along, a.hinge.y + CTX_DOOR_Y, a.hinge.z + Math.cos(a.yaw) * along);
    if (a.leaf === 'slide') tapRow(c, CTX_A, CTX_OPT.open, 'Open');
    else {
      pairRow(c, CTX_A, CTX_OPT.open, 'Open', CTX_OPT.bash, 'Bash');
      // (A7, A25) the peek only when on offer here; else the row is hold-only (a tap does nothing)
      const peek = h.peekOffer() === di;
      pairRow(c, CTX_Y, peek ? CTX_OPT.stealth : '', peek ? 'Peek' : '', CTX_OPT.optic, 'Optic cable');
    }
  } else if (!team) {
    const gi = h.gapCandidate();
    const g = gi >= 0 ? h.gapAt(gi) : null;
    if (g) {
      measure(f, yaw, g.x, g.z);
      const c = cp.add('gap', gi, mDist, mAngle, g.x, g.y, g.z);
      if (h.gapOpenable(gi)) tapRow(c, CTX_A, CTX_OPT.trap, 'Open trap');
      tapRow(c, CTX_Y, CTX_OPT.optic, 'Optic cable');
    }
  }
  // (rows 17, 20-33) the item in reach, or the carry target
  const it = h.item();
  if (it) {
    const idoor = it.kind === 'door' ? h.itemDoor(it) : -1;
    // a door's own item: the faced closed door's rows cover it; else it opens or closes its door
    if (idoor >= 0 && idoor === di) return;
    const id = idoor >= 0 ? h.door(idoor) : null;
    const carry = h.carrying();
    // (row 24, A15) carrying: the carry target's own label (Hide body, Drop body); a body on the floor is picked up
    const label = id ? (id.target !== 0 ? 'Close' : 'Open') : it.kind === 'body' && !carry ? 'Pick up' : it.label;
    const ref = h.itemRef(it);
    let c: CtxCand;
    if (carry && ref < 0) {
      // the drop (no item of its own in the list, no place): on the floor ahead, where the body goes
      const x = f.x + Math.sin(yaw) * CTX_DROP_AHEAD;
      const z = f.z + Math.cos(yaw) * CTX_DROP_AHEAD;
      c = cp.add('carry', ref, CTX_DROP_AHEAD, 0, x, f.y + CTX_DROP_Y, z);
    } else {
      const p = it.pos;
      measure(f, yaw, p.x, p.z);
      c = cp.add(carry ? 'carry' : 'item', ref, mDist, mAngle, p.x, p.y + KIND_PROMPT_Y[it.kind], p.z);
    }
    if (it.holdTime > 0) fillRow(c, CTX_A, CTX_OPT.use, label, it.holdTime);
    else tapRow(c, CTX_A, CTX_OPT.use, label);
  }
}

/**
 * One context step after `fillContextPrompts`: the focus this step keeps, then the Y rule judged against that focus
 * (CHECK-P1 note 1: never last step's, so a jump press is not swallowed on the step a guard offer takes the focus from
 * a door), then A and Y. `js` is filled by the caller except `focus` and `yRow`; `inp` except `y.pressed` and `yLive`
 * (`jumpPressed`: this step's raw jump press). True when an action runs (read `cp.run`); `cp.ctxOwnsY` tells whether
 * the jump press is the context system's (kept from traversal, the vent start and the peek's end check).
 */
export function ctxPromptStep(cp: ContextPrompts, inp: CtxPromptInput, js: CtxJumpState, jumpPressed: boolean, dt: number): boolean {
  cp.focus(inp, dt);
  js.focus = cp.kind;
  js.yRow = cp.focusRow(CTX_Y).on;
  const second = ctxJumpTaker(js) === 'second';
  inp.yLive = second;
  inp.y.pressed = jumpPressed && second;
  return cp.resolve(inp, dt);
}
