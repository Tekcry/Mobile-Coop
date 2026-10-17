/**
 * 3.5 parked content (pure). Mission and Hunter, the economy (credits, XP, suit,
 * HQ, challenges) and cosmetics are hidden unless the page is opened with `?legacy=1` (`flags.legacy`, URL only, never
 * saved). Nothing is deleted and gameplay is unchanged: `?autostart=...&mode=...` starts any mode regardless.
 * Design bible Section 6 (out of scope / parked).
 */

/** Mode ids (`ModeId` / `NetMode`) that are parked behind `?legacy=1`: Mission and Hunter (`clear`). */
export const PARKED_MODES: readonly string[] = ['mission', 'clear'];

export const isParkedMode = (id: string): boolean => PARKED_MODES.includes(id);

/** The modes to offer: every one with `legacy`, else without the parked ones. */
export function visibleModes<T extends { id?: string; value?: string }>(all: readonly T[], legacy: boolean): T[] {
  return legacy ? [...all] : all.filter((m) => !isParkedMode((m.id ?? m.value) as string));
}

/** The campaign opens every weapon and attachment (nothing is bought or saved): true when legacy is off. */
export const campaignUnlocked = (legacy: boolean): boolean => !legacy;

/** The mode the Play screen and the co-op lobby start on. */
export const defaultMode = (legacy: boolean): 'clear' | 'infiltration' => (legacy ? 'clear' : 'infiltration');

/** Whether the economy and cosmetics (credits, XP, suit, HQ, challenges, appearance, emotes, camos) are shown. */
export const showEconomy = (legacy: boolean): boolean => legacy;
