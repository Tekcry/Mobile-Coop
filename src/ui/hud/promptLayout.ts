/**
 * (context-prompts S4, `docs/context-prompts/PLAN.md` section 5) The layout of the on-screen prompts, pure: the screen
 * clamp, the sideways push between prompts that would overlap (the old world prompts and the context cluster), the
 * cluster's row text and size, and the two-cluster fade state. No DOM and no Babylon; tested by
 * `tests/promptLayout.test.ts`. Nothing here allocates except `newBox`, `newCtxFade` and `ctxHoldText`.
 */
import { CTX_FOCUS, type CtxKind } from '../../game/contextPrompts';

/** World point to percent of the view (`GameState` matches it structurally: `project` writes `scr`). */
export interface CtxProjector {
  project(x: number, y: number, z: number): boolean;
  readonly scr: { readonly x: number; readonly y: number };
}

/** Today's world-prompt clamp (percent of the view): labels stay readable at the screen edges. */
export const WP_CLAMP = { x0: 8, x1: 92, y0: 10, y1: 97 } as const;
/** Today's overlap estimate: label width per character (vw), the glyph / icon padding (vw), the row height (vh). */
export const WP_OVERLAP = { charVw: 1.25, padVw: 4, minDy: 7 } as const;
/** The cluster: its rows start this far under the marker (vh); each row is this tall (vh). Starting values. */
export const CTX_ROWS_TOP = 1.2;
export const CTX_ROW_VH = 3.2;
/** The ring's fill steps (a hold's 0..1 rounded to 1 / 40, as `Hud.setInteract`). */
export const RING_STEPS = 40;
/** `--p` per ring step, built once ('0deg' .. '360deg'). */
export const RING_P: readonly string[] = (() => {
  const a: string[] = [];
  for (let i = 0; i <= RING_STEPS; i++) a.push(`${i * 9}deg`);
  return a;
})();

export function clampX(x: number): number {
  return Math.max(WP_CLAMP.x0, Math.min(WP_CLAMP.x1, x));
}

export function clampY(y: number): number {
  return Math.max(WP_CLAMP.y0, Math.min(WP_CLAMP.y1, y));
}

/** Today's transform rounding (one decimal). */
export function roundPos(v: number): number {
  return Math.round(v * 10) / 10;
}

/** One prompt on screen for the overlap pass: anchor (vw, vh), extent below it (vh), width in characters. */
export interface PromptBox {
  on: boolean;
  x: number;
  y: number;
  h: number;
  chars: number;
  pinned: boolean;
}

export function newBox(): PromptBox {
  return { on: false, x: 0, y: 0, h: 0, chars: 0, pinned: false };
}

/**
 * Push overlapping prompts apart sideways (today's `WorldPrompts.flush` loop, generalised): each pair of the first `n`
 * boxes that are both on, close enough vertically (the extent below the anchor counts) and closer sideways than their
 * estimated widths, moves apart by the shortfall. A pinned box does not move when the other is not pinned (the other
 * takes the whole gap); two of the same kind split it. No clamp after the push.
 */
export function pushApart(b: readonly PromptBox[], n: number): void {
  const { charVw, padVw, minDy } = WP_OVERLAP;
  for (let i = 0; i < n; i++) {
    const a = b[i]!;
    if (!a.on) continue;
    for (let j = i + 1; j < n; j++) {
      const c = b[j]!;
      if (!c.on) continue;
      if (!(a.y <= c.y + c.h + minDy && c.y <= a.y + a.h + minDy)) continue;
      const dx = c.x - a.x;
      const gap = (a.chars + c.chars) * charVw * 0.5 + padVw;
      if (Math.abs(dx) >= gap) continue;
      const sgn = dx >= 0 ? 1 : -1;
      const need = gap - Math.abs(dx);
      if (a.pinned === c.pinned) {
        a.x -= (need / 2) * sgn;
        c.x += (need / 2) * sgn;
      } else if (a.pinned) c.x += need * sgn;
      else a.x -= need * sgn;
    }
  }
}

/** The hold half of a row: '' with no hold, 'hold X' on a hold-only row, else ' · hold X'. */
export function ctxHoldText(tapLabel: string, holdLabel: string): string {
  if (holdLabel === '') return '';
  return tapLabel === '' ? 'hold ' + holdLabel : ' \u00b7 hold ' + holdLabel;
}

/** A row's width in characters (the lengths of 'hold ' and ' · hold ' included). */
export function ctxRowChars(tapLabel: string, holdLabel: string): number {
  return tapLabel.length + (holdLabel === '' ? 0 : holdLabel.length + (tapLabel === '' ? 5 : 8));
}

/** The cluster's extent under its anchor (vh) for this many shown rows. */
export function ctxClusterH(rows: number): number {
  return rows <= 0 ? 0 : CTX_ROWS_TOP + rows * CTX_ROW_VH;
}

/** The two clusters, so the old target's fades out where it was while the new one fades in. */
export interface CtxFade {
  /** The cluster holding the focus (-1 none). */
  cur: number;
  /** Per cluster (2): the target it shows, and when it began fading out (s, -1 not fading). */
  readonly kind: CtxKind[];
  readonly ref: number[];
  readonly outAt: number[];
}

export function newCtxFade(): CtxFade {
  return { cur: -1, kind: ['none', 'none'], ref: [-1, -1], outAt: [-1, -1] };
}

/** Still drawn: holds the focus, or faded out less than `CTX_FOCUS.fade` s ago (1e-9 s slack: `1 + 0.15 - 1` is not 0.15). */
export function fadeShown(s: CtxFade, i: number, now: number): boolean {
  return i === s.cur || (s.outAt[i]! >= 0 && now - s.outAt[i]! < CTX_FOCUS.fade - 1e-9);
}

/** The focus is (kind, ref) at `now` (s). True when the clusters changed. */
export function fadeFocus(s: CtxFade, kind: CtxKind, ref: number, now: number): boolean {
  if (kind === 'none') {
    if (s.cur < 0) return false;
    s.outAt[s.cur] = now;
    s.cur = -1;
    return true;
  }
  if (s.cur >= 0 && s.kind[s.cur] === kind && s.ref[s.cur] === ref) return false;
  let chosen = -1;
  // take-back: a cluster still fading out on this very target fades back in where it is
  for (let i = 0; i < 2; i++) {
    if (i !== s.cur && s.kind[i] === kind && s.ref[i] === ref && fadeShown(s, i, now)) chosen = i;
  }
  if (chosen < 0) chosen = s.cur >= 0 ? 1 - s.cur : s.outAt[0]! <= s.outAt[1]! ? 0 : 1;
  if (s.cur >= 0) s.outAt[s.cur] = now;
  s.cur = chosen;
  s.kind[chosen] = kind;
  s.ref[chosen] = ref;
  s.outAt[chosen] = -1;
  return true;
}
