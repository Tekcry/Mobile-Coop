import type { PlayerRef } from '../ai/enemy';
import type { AmmoSlot } from '../weapons/loadoutSnapshot';
import { exitZone, inZone, type SectorDef } from './sectors';

/**
 * The piano escape scene's own logic (piano-escape S1), on the Sector Ops runtime. `SectorMode` calls it at three seams
 * only, and only for a map with `scene: 'piano'`: `start` (the kit, before the section's checkpoint is recorded),
 * `porchStep` (the porch line while guards are still up) and `finish` / `leave` (the end: a fade to the menu, no star,
 * record, rating or results screen; `SectorMode.complete`). Pure but for the fade layer and the host it is given.
 *
 * Never imports `src/net` (co-op reaches it through the host and the lobby, S4).
 */

/** The porch line, shown once when a player steps onto the porch while a guard is still up (the door opens from inside). */
export const PORCH_LINE = 'Not yet. Nobody walks away from this.';

/** The end: seconds from the last guard down and the porch reached to the fade being complete (A9). */
export const PIANO_FADE_S = 2;

/** Is this map the piano scene (`MapDef.scene`)? */
export function isPianoScene(map: { readonly scene?: 'piano' } | null | undefined): boolean {
  return map?.scene === 'piano';
}

/**
 * The empty kit (A4): every gun's magazine and reserve (and quiet rounds) at 0, every gadget count at 0. Run before the
 * section's checkpoint is recorded, so a restart gives the empty kit back. Returns the index of the first pistol, or -1.
 */
export function emptyKit(slots: readonly (AmmoSlot & { readonly def: { readonly class: string } })[], gadgets: Record<string, number>): number {
  let pistol = -1;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    s.mag = 0;
    s.reserve = 0;
    if (s.sd !== undefined) s.sd = 0;
    if (pistol < 0 && s.def.class === 'pistol') pistol = i;
  }
  for (const k in gadgets) gadgets[k] = 0;
  return pistol;
}

/** What the scene needs of the match (`GameState` satisfies it): kept narrow so the scene is unit-tested without a world. */
export interface PianoHost {
  readonly weapons: {
    readonly slots: readonly (AmmoSlot & { readonly def: { readonly class: string } })[];
    readonly gadgets: { readonly counts: Record<string, number> };
    index: number;
    switchTo(i: number): void;
  };
  readonly hud: { feedItem(text: string, kind?: string): void };
  /** Co-op attachment (null: solo). */
  readonly net: unknown;
  /** The ordinary end with the results screen: the fallback when there is no way back to the menu hooked. */
  endSession(won: boolean, subtitle: string): void;
  playerRefsInto(out: PlayerRef[]): readonly PlayerRef[];
}

/** The black layer over the picture. `to` fades it in over `seconds`; `dispose` removes it. */
export interface FadeLayer {
  to(alpha: number, seconds: number): void;
  dispose(): void;
}

/** The DOM fade: one fixed black div (a CSS transition, so no per-frame work). */
export function domFade(): FadeLayer | null {
  if (typeof document === 'undefined') return null;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9000';
  document.body.appendChild(el);
  return {
    to(alpha, seconds) {
      el.style.transition = `opacity ${seconds}s linear`;
      // a frame after insertion so the transition runs
      void el.offsetWidth;
      el.style.opacity = String(alpha);
    },
    dispose() {
      el.remove();
    },
  };
}

/** The way back to the menu (solo), set by `main.ts` when the flag is on; none: the scene ends on the ordinary results. */
let leaveToMenu: (() => void) | null = null;

export function setPianoLeave(fn: (() => void) | null): void {
  leaveToMenu = fn;
}

export class PianoScene {
  private shown = false;
  private fade: FadeLayer | null = null;
  private left = false;
  /** The end has begun (the fade runs; `leave` follows `PIANO_FADE_S` later). */
  finished = false;

  constructor(
    private readonly host: PianoHost,
    private readonly makeFade: () => FadeLayer | null = domFade,
  ) {}

  /** Seam 1, the section's start (before `markCheckpoint`): the empty pistol, no gadgets. */
  start(): void {
    const w = this.host.weapons;
    const pistol = emptyKit(w.slots, w.gadgets.counts);
    if (pistol >= 0 && w.index !== pistol) w.switchTo(pistol);
    this.onIntro();
  }

  /**
   * Hook for S2 (the intro and the EMP): called once at the scene's start, after the kit is empty. No logic in S1.
   */
  protected onIntro(): void {
    // S2: pianoIntro / pianoIntroView start here
  }

  /**
   * Hook for S4 (the knife scene): the place `takedown.setKnifeScene(...)` is called after the EMP and cleared on leave.
   * No logic in S1.
   */
  protected onKnifeScene(_on: boolean): void {
    // S4: setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, on))
  }

  /**
   * Seam 2, every tick while the section's objective is open: a player on the porch with a guard still up gets the
   * porch line, once. No allocation.
   */
  porchStep(s: SectorDef, refs: readonly PlayerRef[]): void {
    if (this.shown) return;
    const zone = exitZone(s);
    if (!zone) return;
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i]!;
      if (!inZone(zone, r.feet.x, r.feet.y, r.feet.z)) continue;
      this.shown = true;
      this.host.hud.feedItem(PORCH_LINE, 'warn');
      return;
    }
  }

  /** Seam 3, the extraction: the fade to black begins. Returns the seconds until `leave`. */
  finish(): number {
    if (this.finished) return PIANO_FADE_S;
    this.finished = true;
    this.onKnifeScene(false);
    this.fade = this.makeFade();
    this.fade?.to(1, PIANO_FADE_S);
    return PIANO_FADE_S;
  }

  /**
   * Seam 3, the fade is done: back to the menu (solo), no results screen, nothing written. Co-op, or no hook: the host's
   * ordinary end (S4 gives co-op its lobby). Once.
   */
  leave(): void {
    if (this.left) return;
    this.left = true;
    if (leaveToMenu && !this.host.net) leaveToMenu();
    else this.host.endSession(true, '');
  }

  dispose(): void {
    this.fade?.dispose();
    this.fade = null;
  }
}
