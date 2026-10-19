declare const __APP_VERSION__: string;
/** (G183) The build's short commit hash (empty when git is unavailable). */
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;
/** Preview build (the `dev` branch, served under /preview/): its own save database and a PREVIEW label. */
declare const __PREVIEW__: boolean;
/** A named preview slot ('' for the live game and the dev preview; 'ct' = the ct-movement branch under /ct/). */
declare const __PREVIEW_ID__: string;
