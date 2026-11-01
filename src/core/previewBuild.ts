// (prebake-preview) Which Pages slot a build is, read from the build's environment (`VITE_PREVIEW=1`: /preview/;
// `VITE_PREVIEW_ID=<id>`: a named slot such as /ct/). The one reader for `vite.config.ts` (the game's `__PREVIEW__` and
// `__PREVIEW_ID__`) and the campus prebake (`scripts/prebake/vitest.prebake.config.ts` defines the same two), so the
// prebake builds the shipped maps under the flag defaults the shipped game has (`PREVIEW_ON`, `src/core/flags.ts`). Pure:
// no Node or browser API (vite.config.ts loads it in Node).

export interface PreviewBuild {
  /** `__PREVIEW__`: /preview/ or a named slot. */
  preview: boolean;
  /** `__PREVIEW_ID__`: the named slot's id, '' for /preview/ and the live game. */
  previewId: string;
}

export function previewBuildOf(env: Readonly<Record<string, string | undefined>>): PreviewBuild {
  const id = env.VITE_PREVIEW_ID ?? '';
  const previewId = /^[a-z0-9-]{1,16}$/.test(id) ? id : '';
  return { preview: env.VITE_PREVIEW === '1' || previewId !== '', previewId };
}

/** The build's `define` entries for the two constants. */
export function previewDefines(b: PreviewBuild): { __PREVIEW__: string; __PREVIEW_ID__: string } {
  return { __PREVIEW__: JSON.stringify(b.preview), __PREVIEW_ID__: JSON.stringify(b.previewId) };
}
