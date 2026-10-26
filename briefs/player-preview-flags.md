status: claimed Night Shift | Cloud Builder 1 2026-10-26T02:47:28Z
priority: top

# Brief: preview-flags - every dark feature flag ON in /preview/ (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. ROADMAP Now 0d. Michael ~13:55 (native multiple choice, picked "All on in
preview"), his words: "why are you hiding all new features until switched on? i trial them all in the preview server".
Small: one source file, one test file, one doc line, one fragment. Sonnet-level builder: follow the steps exactly;
anything the brief does not settle is `status: blocked`, not a guess.

## AMENDMENT 2026-10-26 ~14:10 (orchestrator ruling; supersedes A1 and the mixamo line in Rule)
`mixamo` goes ON in /preview/ too (URL `=0` off). Do this as one more commit:
- Files: add `src/anim/mixamo.ts` to the file list.
- `src/anim/mixamo.ts` :20 change `import { flags } from '../core/flags';` to
  `import { flags, PREVIEW_ON } from '../core/flags';` and :375 `setMixamo(flags.mixamo === true);` to
  `setMixamo(flags.mixamo ?? PREVIEW_ON);`. Nothing else in that file. `flags.mixamo` itself stays `onOffFlag(...)`
  (null when the URL names none), so once PR #494's Animation source setting is on master the player's stored
  setting wins over the preview default.
- Test: the source guard also asserts `src/anim/mixamo.ts` contains `setMixamo(flags.mixamo ?? PREVIEW_ON)`.
- Table row: `mixamo` | `?mixamo=0` off | Player Build | Mixamo traversal captures on Wren (hang, shimmy, climb-up,
  ladder, vent crawl). Fragment: add "the Mixamo climbing moves" to the list.

## Rule
- On the `/preview/` build (`__PREVIEW__` true and `__PREVIEW_ID__ === ''`) every dark FEATURE flag defaults ON; a URL
  `=0` still turns one off; `=1` still turns one on anywhere.
- The live game (root build), the named preview slots (`/ct/`, `__PREVIEW_ID__ !== ''`), dev (`npm run dev`) and the
  unit tests (vitest defines neither constant) keep today's defaults, byte for byte.
- Dev / test / lab flags stay exactly as they are: `coop`, `debug`, `autostart`, `mode`, `mission`, `insertion`,
  `loadout`, `difficulty`, `room`, `net`, `gfx`, `phone`, `baked`, `weather`, `detect`, `renderer`, `gear`, `legacy`,
  `fullbright`, `devDraft`, `spawn`, `musicLab`, `foleyLab`, `weaponLab`, `sectorGuards`, `mocap`, `guardMerge`,
  `animTier`, `animShadow`, `animOff`, `guardSun`, `guardFreeze` (the last six are already on by default).
- `mixamo` is NOT turned on: the Animation source setting (Settings > Gameplay, PR #494) is Michael's own switch for it,
  and a preview default would override his choice (assumed A1 below).

## The flags this turns on in /preview/ (list them in the PR body exactly like this)
| Flag | URL | Owner | What Michael sees on /preview/ |
| --- | --- | --- | --- |
| `guardModels` | `?guardmodels=0` off | Player Build (guard-models) | guards drawn as the new operator-pipeline figures |
| `charShadowLight` | `?charlight=0` off | Sector Ops Build | character shadows count in the light meter and the guards' light |
| `mapReady` | `?mapready=0` off | Sector Ops Build | the loading screen waits for a built, warmed map; lamps pre-built; lobby preloads |
| `campusV2` | `?campusv2=0` none, `?campusv2=1,3` exactly those | Sector Ops Build | Saltmarsh Park sections 1-5 built from their v2 layouts |

## Base and branch
- Base `origin/master` at `29f03b6c004bf8dae66eea9c434160b6b1db061c`. New branch `feature/preview-flags` from it; push
  `origin feature/preview-flags` only (no force, no merge, no rebase, no other branch). `npm ci` once.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/preview-flags`.
- Open PRs also edit `src/core/flags.ts` (#494 adds `anim`, #522 / #490 add `missions` + `coopKit`, #487
  `marlowReplan`, #488 `sectorStart`, #317 `players`, #375 flips `guardModels` to `!== '0'`). To keep them merging
  cleanly: touch ONLY the lines named in Step 1, add new code only where Step 1 says, reformat nothing.

## Files (only these)
- `src/core/flags.ts`
- `tests/previewFlags.test.ts` (new)
- `docs/systems/deploy.md` (one sentence, Step 3)
- `changes/feature-preview-flags.md` (new, per `changes/README.md`)

## Steps
1. `src/core/flags.ts` (line numbers are 29f03b6c0's):
   a. Directly after `export function onOffFlag(...) { ... }` (ends ~:103) and before `function readParams()` (~:105),
      add, with these doc comments:
      ```ts
      /** (preview-flags, Michael 2026-10-26 ~13:55 "All on in preview") The /preview/ build: every dark feature flag
       *  defaults on there (a URL `=0` still turns one off). Not the named slots (`/ct/`), the live game, dev or tests
       *  (vitest defines neither constant). New feature flags read through `darkFlag(params.get(...), PREVIEW_ON)`. */
      export const PREVIEW_ON: boolean =
        typeof __PREVIEW__ !== 'undefined' && __PREVIEW__ && (typeof __PREVIEW_ID__ === 'undefined' || __PREVIEW_ID__ === '');

      /** (preview-flags) A dark feature flag's URL value: "1" on, "0" off, else the build's default (`preview`: on). */
      export function darkFlag(v: string | null, preview: boolean): boolean {
        return v === '1' || (v !== '0' && preview);
      }

      /** (preview-flags) Every campus section, the /preview/ default for `campusV2`. */
      export const CAMPUS_V2_ALL: readonly number[] = [1, 2, 3, 4, 5];
      ```
   b. `readCampusV2` (~:95-98): add a second parameter `preview = false` and change only the default line to
      `if (v === null || !/^[0-5](,[0-5])*$/.test(v)) return preview ? CAMPUS_V2_ALL : CAMPUS_V2_ON;`. Its doc comment
      (~:94) gets ` On /preview/ (preview-flags) the default is every section.` appended inside the comment.
   c. In `export const flags` change exactly these four lines:
      - `guardModels: params.get('guardmodels') === '1',` -> `guardModels: darkFlag(params.get('guardmodels'), PREVIEW_ON),`
      - `charShadowLight: params.get('charlight') === '1',` -> `charShadowLight: darkFlag(params.get('charlight'), PREVIEW_ON),`
      - `mapReady: params.get('mapready') === '1',` -> `mapReady: darkFlag(params.get('mapready'), PREVIEW_ON),`
      - `campusV2: readCampusV2(params.get('campusv2')),` -> `campusV2: readCampusV2(params.get('campusv2'), PREVIEW_ON),`
      Leave the `// (guard-models G7) default off ...` comment above `guardModels` as it is.
   d. In the `Flags` interface doc comments of those four fields, append one sentence each inside the comment:
      `On /preview/ default on (preview-flags).` (for `campusV2`: `On /preview/ every section (preview-flags).`).
      Nothing else in the file changes.
2. `tests/previewFlags.test.ts` (new), vitest, node env, imports only from `../src/core/flags`:
   - `darkFlag`: for preview false: null -> false, '' -> false, 'x' -> false, '0' -> false, '1' -> true; for preview
     true: null -> true, '' -> true, 'x' -> true, '0' -> false, '1' -> true.
   - `readCampusV2`: (null) and (null, false) -> `CAMPUS_V2_ON` (same reference); (null, true) and ('bad', true) ->
     `[1, 2, 3, 4, 5]`; ('0', true) -> `[]`; ('3,1', true) -> `[1, 3]`; ('1,2,3,4,5', false) -> `[1, 2, 3, 4, 5]`.
   - Live defaults under tests: `PREVIEW_ON` is false, and with no URL `flags.guardModels`, `flags.charShadowLight`,
     `flags.mapReady` are false and `flags.campusV2` equals `CAMPUS_V2_ON`.
   - Source guard (reads `src/core/flags.ts` as text with `node:fs`): the `export const flags` object reads
     `guardmodels`, `charlight`, `mapready` through `darkFlag(` and `campusv2` through `readCampusV2(..., PREVIEW_ON)`,
     and `mixamo` still through `onOffFlag(` (A1).
3. `docs/systems/deploy.md`: at the end of the bullet that starts "- A preview build (`VITE_PREVIEW=1`" (~:28-33), add
   the sentence: "On `/preview/` every dark feature flag in `src/core/flags.ts` defaults on (`PREVIEW_ON`, `darkFlag`;
   Michael 2026-10-26 ~13:55, \"All on in preview\"); a URL `=0` turns one off; the live game and `/ct/` keep them off."
   Keep the line width under 120.
4. `changes/feature-preview-flags.md` per `changes/README.md`, `kind: minor`, one entry: "The preview build turns on every
   feature still behind a switch (new guard figures, character shadows in the light meter, the map-ready loading, the
   new Saltmarsh Park layouts); add `=0` to the link to turn one off. The live game is unchanged."
5. Run `npm run typecheck:fast` and `npx vitest run tests/previewFlags.test.ts tests/campusV2.test.ts
   tests/guardBody.test.ts tests/charOccluders.test.ts`. All must pass. (Unit only: no e2e, no GPU, no npm run check.)
6. Commit each step on the branch (path-limited `git add`, never `-A`), push, write the report below, set
   `status: done feature/preview-flags <sha>`.

## Assumed (log)
- A1: `mixamo` stays off on /preview/ (the Animation source setting is Michael's switch). Undo: `mixamo:
  darkFlag(...)`-style default true on preview in flags.ts.
- A2: the named slot `/ct/` keeps today's defaults (Michael named "the preview server"). Undo: `PREVIEW_ON =
  __PREVIEW__` only.
- A3: flags still in open PRs (`missions`, `coopKit` #522 / #490, `marlowReplan` #487) switch to `darkFlag(...,
  PREVIEW_ON)` in whichever PR lands second (their leads are told by the orchestrator).

## Done when
- tsc clean, the 4 vitest files pass, the diff touches only the 4 files above, `git merge-tree --write-tree --name-only
  origin/master HEAD` is clean.
- e2e: none needed for the default build (tests serve `dist/` at root, `PREVIEW_ON` false); the lead's laptop
  affected-e2e and a /preview/ hand check after the train are "pending PC run".

## Report (builder fills in)
