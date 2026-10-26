status: claimed Night Shift | Cloud Builder 2 2026-10-26T02:31:23Z

# Brief: mixamo I9 polish - Studio capture refill, retry, pack driver rows (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Polish for PR #514 (`feature/mixamo-i9` 761075de, base
`feature/mixamo-i7-pack`) and PR #501 (`feature/mixamo-i7-pack`, the pack driver it stacks on), from the two checkers'
polish lists. Small fixes plus unit tests; Studio-only and offline-script code, nothing a match runs. Sonnet-level
builder: follow the steps exactly; anything the brief does not settle is `status: blocked`, not a guess.

## Read first (the checkers' findings, verified on 761075de below)
- I9 fix-round check (polish items 1-4): the Loop list refill race at `src/ui/studioPanel.ts:286`, the cached rejected
  load at `src/anim/studio.ts:325`, the `__studio.loadCaptures` hook at `src/ui/studioPanel.ts:213`, no unit test of the
  refill.
- I7 pack check (polish items 1, 4, 5): the recipe title check at `scripts/mocap/mixamoEmit.mjs` ~:100, `--only` kept
  manifest rows without `pack` / `title`, a linked pack folder skipped silently.
- Hard rules: `git show origin/master:CLAUDE.md`. Cloud rules: `git show origin/master:docs/systems/agent-preamble.md`
  ("Cloud sessions").

## Base and branch
- Base `origin/feature/mixamo-i9` at `761075de0d90b5d430f00dbd836d6c8ec626cbc6`. New branch
  `feature/mixamo-i9-polish` from it; push `origin feature/mixamo-i9-polish` only (no force, no merge, no rebase, no
  push to `feature/mixamo-i9` or `feature/mixamo-i7-pack`: the lead folds it in). `npm ci` once.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/mixamo-i9-polish`.

## Files (only these)
- `src/anim/studio.ts`
- `src/ui/studioPanel.ts`
- `scripts/mocap/mixamo.mjs`
- `tests/studioCapturesLazy.test.ts`
- `tests/studioCapturesRetry.test.ts` (new)
- `tests/mixamoDriver.test.ts`
Not: `scripts/mocap/mixamoEmit.mjs` (item e is already done, see below), `src/anim/studioCapturesLazy.ts`,
`src/game/studioStage.ts`, `src/ui/animTunePanel.ts`, any clip module, `src/anim/mocapSources.ts`, `docs/**`,
`changes/**` (see Changelog).

## Items (lines on 761075de)
(a) Refill race. `src/ui/studioPanel.ts:285-289` in `sync()`:
```ts
    if (!studioCapturesLoaded() && !this.capWait) {
      this.capWait = true;
      void loadStudioCaptures().then(() => this.refreshEntries());
    }
```
The panel is built at boot with the eager list (`:95`). If the chunk lands before the panel's first Studio `sync`
(`src/ui/animTunePanel.ts:2773`, called from `show()`), `studioCapturesLoaded()` is already true, no refill runs and the
Loop list lacks the 108 lazy rows until a reload. Fix: keep only the `!this.capWait` guard so the first Studio sync
always chains a refill (an already-resolved load still refills once), through the helper of (d).

(b) No retry. `src/anim/studio.ts:323-339` `loadStudioCaptures()`: `lazyCaptures = import('./studioCapturesLazy').then(...)`
with no rejection handler; a failed chunk caches a rejected promise forever and both callers `void` it
(`src/game/studioStage.ts:151`, the panel), an unhandled rejection with no retry. Fix: give that `.then` a second
argument (rejection handler) that sets `lazyCaptures = null` and logs one `console.warn`; the returned promise then
always resolves and `studioCapturesLoaded()` tells success.

(c) Test hook. `src/ui/studioPanel.ts:213` `loadCaptures: () => loadStudioCaptures().then(() => STUDIO_ENTRIES.length)`
does not refresh the panel's options. Fix: refresh them when the captures are in.

(d) Unit test of the refill. The panel needs a DOM (no DOM in vitest here: `environment: 'node'`, no jsdom /
happy-dom), so the seam is a DOM-free helper in `studio.ts` that owns the "refill once, or report a failure" logic; the
panel only calls it. The DOM part (`refreshEntries`, `:258-268`) is covered by e2e-studio on the PC.

(e) Recipe title vs pack folder: ALREADY DONE on 761075de, no change. `scripts/mocap/mixamoEmit.mjs:109` builds `want`
with `titleOf(r.file)`, and `titleOf` (`scripts/mocap/mixamo.mjs:48-50`) takes the basename; `tests/mixamoEmit.test.ts:116`
(a pack recipe's title "Pro Rifle Pack: idle" refused, want "idle") and `:120-123` (the committed `rifle_walk_forward`
recipe validates with `pack: 'pack-rifle'`, `title: 'walk forward'`) cover it. Only run the test and say so in the report.

(f) `--only` kept rows. `scripts/mocap/mixamo.mjs:205-209`: a partial run keeps the old manifest's other entries as
read; rows written before I7 have no `pack` / `title` (`manifestOf` `:167-175` writes both for the dumped ones). Fix:
fill them from the row's own `file`.

(g) Linked pack folder. `scripts/mocap/mixamo.mjs:85-95` `listClips`: a `pack-*` folder that is a symlink or a Windows
junction gives a Dirent whose `isDirectory()` is false (`isDir` `:78`), so it is skipped with no word. Fix: warn.

## Build
Commit 1 "mixamo I9 polish: the Studio's Loop list always refills, a failed capture load retries" (items a-d), push:
1. `src/anim/studio.ts` `loadStudioCaptures` (`:323-339`): the `.then((m) => { ... })` keeps its body unchanged and
   gains the rejection handler:
   ```ts
      }, (e: unknown) => {
        // (I9 polish) a failed chunk is not cached: the next Studio open asks again
        lazyCaptures = null;
        console.warn(`Anim Studio: the batch 2 captures did not load (${e instanceof Error ? e.message : String(e)}); opening the Studio again retries`);
      });
   ```
   The doc comment `:317-322`: replace "Later calls return the same promise." with "Later calls return the same
   promise, unless the load failed (the next call tries again). The promise always resolves; `studioCapturesLoaded()`
   says whether the captures are in."
2. `src/anim/studio.ts`, right after `loadStudioCaptures`, a new export:
   ```ts
   /**
    * (I9 polish) Calls `refill` once the lazy captures are in, also when they already are (the panel's first Studio sync
    * always refills, so a chunk that landed before it is never missed), or `failed` when the load failed.
    */
   export function whenStudioCaptures(refill: () => void, failed: () => void): Promise<void> {
     return loadStudioCaptures().then(() => (lazyLoaded ? refill() : failed()));
   }
   ```
3. `src/ui/studioPanel.ts` `sync()` `:285-289` becomes:
   ```ts
    // (mixamo-retarget I9 fix round; I9 polish) batch 2's captures load once as the Studio opens: the Loop list refills
    // when they land, also when they landed before this first sync; after a failed load the next sync asks again
    if (!this.capWait) {
      this.capWait = true;
      void whenStudioCaptures(() => this.refreshEntries(), () => {
        this.capWait = false;
      });
    }
   ```
   Add `whenStudioCaptures` to the import from `'../anim/studio'` (`:2`, after `studioKey`);
   `studioCapturesLoaded` stays imported (the hook uses it). The `capWait` field comment `:73` becomes
   `/** (I9 fix round) The lazy captures were asked for (the Loop list refills once they land; cleared after a failed load). */`.
4. `src/ui/studioPanel.ts:213` becomes
   `loadCaptures: () => loadStudioCaptures().then(() => { if (studioCapturesLoaded()) this.refreshEntries(); return STUDIO_ENTRIES.length; }),`
   (formatted over lines as the house style needs; same behaviour).
5. `tests/studioCapturesLazy.test.ts`: import `whenStudioCaptures`; a new `it` placed after the "after the lazy fill"
   test (`:33-60`, the captures are loaded by then):
   `'(I9 polish) a refill asked for after the captures landed still runs, once'`: counters `refills` / `fails`;
   `await whenStudioCaptures(() => refills++, () => fails++)` -> `[refills, fails]` is `[1, 0]`; a second call -> `[2, 0]`
   (each caller gets its own refill; the panel's `capWait` keeps it to one per panel); `STUDIO_ENTRIES.length` unchanged
   by the calls (no second splice).
6. `tests/studioCapturesRetry.test.ts` (new; its own module state). Header comment: "(mixamo I9 polish) A failed lazy
   capture chunk is not cached: the next load retries; whenStudioCaptures reports the failure, then refills."
   - `let fail = true; vi.doMock('../src/anim/studioCapturesLazy', () => { if (fail) throw new Error('chunk 404'); return { LAZY_CAPTURE_MODULES: [], LAZY_CAPTURE_FILES: [] }; });`
     then `const S = await import('../src/anim/studio');` and `vi.spyOn(console, 'warn').mockImplementation(() => {})`.
   - Case: `const p1 = S.loadStudioCaptures(); await expect(p1).resolves.toBeUndefined();` `S.studioCapturesLoaded()`
     false; `console.warn` called once with /did not load/; `whenStudioCaptures` with `fail` still true calls `failed`
     once and `refill` never; then `fail = false`; `const p2 = S.loadStudioCaptures()`; `p2` is not `p1`; after `await
     p2`, `studioCapturesLoaded()` is true and a `whenStudioCaptures` call refills once; a further `loadStudioCaptures()`
     returns `p2`.
   - Fallback, only if Vitest does not run the mock factory again after it threw (the retry import keeps failing
     although `fail` is false): drop the `vi.doMock` and add this seam to `src/anim/studio.ts` above
     `loadStudioCaptures`, which then calls `captureImport()` instead of `import('./studioCapturesLazy')`:
     ```ts
     /** (I9 polish) The lazy chunk's import; a test swaps it to fail a load (`setCaptureImport`). */
     const realCaptureImport = (): Promise<typeof import('./studioCapturesLazy')> => import('./studioCapturesLazy');
     let captureImport = realCaptureImport;
     /** (test hook) Swap the lazy chunk's import (null: the real one). */
     export function setCaptureImport(f: (() => Promise<typeof import('./studioCapturesLazy')>) | null): void {
       captureImport = f ?? realCaptureImport;
     }
     ```
     The test then swaps in `() => Promise.reject(new Error('chunk 404'))` for the failing load and `null` for the
     retry (the real 108 load: assert `studioCapturesLoaded()` true after it). Name the fallback and why in the report.

Commit 2 "mixamo I7 polish: --only fills old rows' pack and title; a linked pack folder warns" (items f, g), push:
7. `scripts/mocap/mixamo.mjs`: a new export after `titleOf` (`:47-50`):
   ```js
   /** (I9 polish) A clip's credits title cell: "<pack name>: <title>" in a pack folder, else the title alone. */
   export function clipTitle(file, pack = packOf(file)) {
     return pack ? `${PACK_NAME[pack] ?? pack}: ${titleOf(file)}` : titleOf(file);
   }
   ```
   `listClips` `:104` uses it: `const title = clipTitle(file, pack);` (same result).
8. `scripts/mocap/mixamo.mjs:207` (the kept rows): `.filter(...)` then
   `.map((c) => ({ ...c, pack: c.pack ?? packOf(c.file), title: c.title ?? clipTitle(c.file) }))`; the comment `:206`
   gains `; (I9 polish) rows from before I7 get their pack and title from their file`.
9. `scripts/mocap/mixamo.mjs` `listClips(dir, { readdir = readdirSync, warn = (m) => console.warn(m) } = {})`: in the
   loop, before `if (isDir(e))`, for an entry that is not a string, has `isSymbolicLink` as a function returning true
   and whose name matches `PACK_RE`: `warn(\`mixamo: ${name} is a link (symlink or junction): not followed, its clips are skipped; copy the folder in instead\`)`
   and `continue`. A link whose name is not `pack-*` is skipped silently as today. `dumpAll` passes `warn: deps.warn`
   when given (`...(deps.warn ? { warn: deps.warn } : {})`), else the default. Update the `listClips` doc comment
   (`:80-84`) with one sentence on the warning.
10. `tests/mixamoDriver.test.ts`:
   - In the I7 describe (`:310`): `'(I9 polish) a linked pack-* folder warns and is skipped; another link is silent'`:
     a readdir giving, at `DIR`, `'Walking.fbx'`, `{ name: 'pack-rifle', isDirectory: () => false, isSymbolicLink: () => true }`
     and `{ name: 'old', isDirectory: () => false, isSymbolicLink: () => true }`; `listClips(DIR, { readdir, warn })` lists
     `walking` only; `warn` called once, matching /pack-rifle is a link/.
   - `'(I9 polish) --only fills the kept rows\' pack and title from their file'`: `fakeFs(['Standing Idle.fbx',
     'Walking.fbx', 'pack-rifle/idle.fbx'])`; the old manifest (as `:165`) holds `{ file: 'Standing Idle.fbx', slug:
     'standing_idle' }` and `{ file: 'pack-rifle/idle.fbx', slug: 'rifle_idle' }`; `dumpAll({ ..., only: ['walking'] })`;
     the written manifest's rows give `[file, pack, title]` = `['Standing Idle.fbx', null, 'Standing Idle']`,
     `['Walking.fbx', null, 'Walking']`, `['pack-rifle/idle.fbx', 'pack-rifle', 'Pro Rifle Pack: idle']` (sorted by file
     as the code sorts). A kept row that already has `pack` / `title` keeps them (one more row with `title: 'X'` stays `'X'`).
   - `clipTitle('pack-rifle/walk forward.fbx')` is `'Pro Rifle Pack: walk forward'`; `clipTitle('Standing Idle.fbx')` is
     `'Standing Idle'`. Import `clipTitle` on the existing `// @ts-expect-error` import line `:5-6`.

## Changelog
No fragment change: (a)-(d) fix unreleased Studio code in the same PR (#514's `changes/feature-mixamo-i9.md` already
says the captures load when the Studio opens), and (f)-(g) are an offline script. Append a line to
`changes/feature-mixamo-i9.md` only if you find a change a player would see; then say why in the report.

## Run (unit tests only: no e2e, no GPU, no Blender, no `npm run check`, no dev server; every command with a timeout)
- `npm run typecheck:fast`
- `npx eslint src/anim/studio.ts src/ui/studioPanel.ts scripts/mocap/mixamo.mjs tests/studioCapturesLazy.test.ts tests/studioCapturesRetry.test.ts tests/mixamoDriver.test.ts`
- `npx vitest run tests/studioCapturesLazy.test.ts tests/studioCapturesRetry.test.ts tests/animStudio.test.ts tests/mocapSources.test.ts tests/mixamoDriver.test.ts tests/mixamoEmit.test.ts tests/changesFragments.test.ts`
  (add `--maxWorkers=2` on a small box). Run the studio files after commit 1, the whole line after commit 2.

## Done when
- `git diff --stat 761075de0d90b5d430f00dbd836d6c8ec626cbc6` lists only the six files above.
- `grep -n "studioCapturesLoaded() && !this.capWait" src/ui/studioPanel.ts` finds nothing; the panel's refill goes
  through `whenStudioCaptures`.
- tsc and eslint clean; every vitest file above passes.
- Two commits, each with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, pushed to
  `origin feature/mixamo-i9-polish`.
- Then append `## Report` below and set line 1 to `status: done feature/mixamo-i9-polish <sha>`; commit, push
  `cloud-queue` (rebase on reject).
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.

## Report (fill in)
- Branch, both commit shas.
- Per item (a)-(g): what changed with file:line, or "no change" with the evidence ((e)).
- Tests: names and pass counts per file; tsc / eslint results.
- Deviations from this brief, each with the reason.
- Pending PC run: `e2e-studio` (open the Anim Studio, pick a lazy row such as `keyed:mocap_aa_idle` from the Loop list
  after open; also with the tuner already open before the Studio map loads) and the affected suites for `src/anim` /
  `src/ui` from `scripts/e2e-affected.mjs`; no Blender run needed (the driver changes are covered by the mocked tests).
