/**
 * (context-prompts S2, `docs/context-prompts/PLAN.md` section 3; Michael's pick 1 "Y at doors and hatches", BRIEF A2,
 * A21-A25) The Y rule, pure: who takes a jump press (pad Y, keyboard Space, or wherever jump is bound, A24), the context
 * system (the second action on the focused target: door peek / optic cable, a hatch's optic cable, the bluff) or
 * traversal / jump (today's path). Behind `flags.contextPrompts` (S3 wires it; with the flag off it is never called).
 *
 * The context system takes the press only when all hold (A2, A21):
 * - the focused target is a door, an optic gap or the partner's hostage, and it has a Y row (a closed door's peek or
 *   optic cable, the gap's optic cable, the bluff with joint information);
 * - the player is on the ground, not attached, not mid-traversal, not on the wall, not carrying, not in a team move or
 *   offer, and no takedown (`takedown.busy`: a hold, the knife kill), strike or door peek is running (during a peek
 *   Y still ends it, today's rule);
 * - no traversal is offered: `traversal.hint` and `traversal.attachHint` both empty as the screen shows them this step,
 *   read before the press re-probes (what the prompt shows is what Y does). An offered vault, climb, drop, ledge, pipe,
 *   ladder, rope, zipline or vent always wins Y.
 * Judged once at the press; a press it takes is owned until release (`ContextPrompts.ctxOwnsY`). The same answer each
 * step is whether the focus's Y row shows (`CtxPromptInput.yLive`), so the prompt always tells the truth. A tap where
 * only the hold is on offer (the peek not on offer) does nothing (A25, the row's empty tap). Allocation-free.
 * Undo (A25): add "not sprinting" or "standing still" here.
 */
import type { CtxKind } from './contextPrompts';

/** 'second': the context system's second action takes the press; 'jump': today's jump / traverse path. */
export type CtxJumpTaker = 'second' | 'jump';

/** What the rule reads (a reused object, filled by the caller each step). */
export interface CtxJumpState {
  /** The focused target's kind (`ContextPrompts.kind`). */
  focus: CtxKind;
  /** The focus has a Y row (the provider's door peek / optic cable, gap optic cable, hostage bluff). */
  yRow: boolean;
  /** On the ground (not in the air). */
  grounded: boolean;
  /** Attached (ladder, pipe, ledge, zipline, rope, fence). */
  attached: boolean;
  /** A traversal move is running (vault, mantle, drop, vent). */
  traversing: boolean;
  /** Back to the wall. */
  onWall: boolean;
  /** Carrying a body. */
  carrying: boolean;
  /** A team move or its offer is under way (`team.active`). */
  team: boolean;
  /** A takedown runs (`takedown.busy`: holding a guard, the knife kill). */
  busy: boolean;
  /** A strike runs. */
  strike: boolean;
  /** A door peek runs (Y ends it, today's rule). */
  peek: boolean;
  /** `traversal.hint` is not null (vault, step, hop, drop, mantle) as shown this step. */
  hint: boolean;
  /** `traversal.attachHint` is not null (ledge, pipe, ladder, rope, zipline, vent) as shown this step. */
  attachHint: boolean;
}

export function emptyCtxJumpState(): CtxJumpState {
  return {
    focus: 'none',
    yRow: false,
    grounded: false,
    attached: false,
    traversing: false,
    onWall: false,
    carrying: false,
    team: false,
    busy: false,
    strike: false,
    peek: false,
    hint: false,
    attachHint: false,
  };
}

/** Who takes this jump press (see the file comment). */
export function ctxJumpTaker(s: Readonly<CtxJumpState>): CtxJumpTaker {
  if (s.focus !== 'door' && s.focus !== 'gap' && s.focus !== 'hostage') return 'jump';
  if (!s.yRow) return 'jump';
  if (!s.grounded || s.attached || s.traversing || s.onWall || s.carrying || s.team || s.busy || s.strike || s.peek) return 'jump';
  if (s.hint || s.attachHint) return 'jump';
  return 'second';
}
