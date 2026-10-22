/**
 * (sw-reload) When a waiting service worker (a new deploy) may take over and reload the page. Pure, no Babylon, no
 * src/net: a reload mid-match drops a co-op walk, so an update only applies on a menu screen (title / main menu) with
 * no match running and no co-op screen open, else it waits; closing every window also applies it (next launch).
 */

/** What the game looks like right now, as far as an update cares. */
export interface UpdateContext {
  /** a new worker is installed and waiting (vite-plugin-pwa `onNeedRefresh`) */
  updateWaiting: boolean;
  /** a match (solo or co-op) is the running state, or one is loading */
  inMatch: boolean;
  /** a co-op screen is open (lobby, connecting, join, browse): a peer may be connected */
  coopConnected: boolean;
  /** the top screen is the title or the main menu */
  onMenu: boolean;
}

export type UpdateDecision = 'none' | 'apply' | 'defer';

export function decideUpdate(c: UpdateContext): UpdateDecision {
  if (!c.updateWaiting) return 'none';
  if (c.inMatch || c.coopConnected || !c.onMenu) return 'defer';
  return 'apply';
}

/** The screen-stack facts main.ts reads (the top screen's classes, whether the menu state runs, the boot hold). */
export interface ScreenFacts {
  /** the running state is the menu stage (MenuState); false while a match runs or loads */
  menuState: boolean;
  /** the boot / load screen is still up (`app.bootHold`) */
  booting: boolean;
  /** the class list of the top screen, empty when none */
  topClasses: readonly string[];
  /** a co-op screen (`.coop-screen`: lobby, connecting, join, browse) is open, on top or under another screen */
  coopOpen: boolean;
}

/** Turn the screen facts into the policy's context. */
export function contextFrom(updateWaiting: boolean, f: ScreenFacts): UpdateContext {
  const top = f.topClasses;
  return {
    updateWaiting,
    inMatch: !f.menuState || f.booting,
    coopConnected: f.coopOpen,
    onMenu: top.includes('main-menu') || top.includes('title-screen'),
  };
}
