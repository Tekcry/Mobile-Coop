declare const __APP_VERSION__: string;
/** (G183) The build's short commit hash (empty when git is unavailable). */
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;
/** Preview build (`VITE_PREVIEW=1`; no longer built or deployed since one-game, 2026-11-01): its own save database and a PREVIEW label. Stage J removes it. */
declare const __PREVIEW__: boolean;
/** A named preview slot ('' for the game; no named slot is built since one-game, 2026-11-01). Stage J removes it. */
declare const __PREVIEW_ID__: string;
