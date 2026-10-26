status: done feature/player-j19-s8a 60b541514a26524f21234e1c3c58ebe0dde1bf9c

# Brief: player-batch-j19 S8a - Look-video recorder (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Job J19 player-batch-j19, slice S8a, row R31 (the tool). A developer
script that records 1-2 minute look videos of scripted scenes, headless, for Michael's walk cards. No game code. The
smoke recording needs a GPU and runs on the laptop later: pending PC run. Sonnet-level builder: follow the spec
exactly; anything it does not settle is `status: blocked`, not a guess.

## Read first
- Plan: `git show origin/feature/player-batch-j19:docs/player-batch-j19/PLAN.md` ("How it works today" R31, "Design per
  row" R31, "Slices" S8a, "Test plan" look videos).
- `scripts/e2e-lib.mjs` (master): `launchOptions` `:31-41` (always headless; `E2E_HEADED=1` is a debug-only window),
  `launch` `:87-100` (`viewport`, `context` passes extra browser-context options: `recordVideo` goes there),
  `openPage` `:103-241` (fake pad `window.__pad` `:157-187`: `connect()`, `set(i, v)`, `axis(i, v)`; adds `gfx=min`
  unless the query names `gfx` `:190`, `gear=4` unless it names `gear` `:193`, `gear=none` keeps the game's default;
  waits for the boot and, with `autostart=`, for the match `:223-239`), `BTN` `:243`, `waitOperator` `:249-257`.
- `scripts/anim-sheet.mjs` (master): HUD hidden with a style tag `:170`; the follow camera wrapped round
  `p.cam.update` `:212-249` (views side / front / back / left / front34, distance 3 m; `ots` = the game camera); the
  teleport `:206-208`; console errors filtered `:369`.
- `scripts/shots-ctcourse.mjs` (master) `:31-46`: serve `dist/` with `vite preview` (`--strictPort`, `127.0.0.1`), wait
  for it, refuse a server that is not this `dist` (`dist/index.html` identity).
- `scripts/shot.mjs` (the smallest user of `launch`). Main-guard pattern: `scripts/changelog-assemble.mjs:166`.
- `docs/RULES.md` (master) "Test tiers": look videos run on the laptop look tier (4189). Hard rules:
  `git show origin/master:CLAUDE.md`; cloud rules: `git show origin/master:docs/systems/agent-preamble.md` ("Cloud
  sessions").

## Base and branch
- Base `origin/master` at `29f03b6c004bf8dae66eea9c434160b6b1db061c`. New branch `feature/player-j19-s8a` from it;
  push `origin feature/player-j19-s8a` only (no force, no master merge, no rebase). `npm ci` once.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/player-j19-s8a`.

## Files (only these)
- `scripts/look-video.mjs` (new)
- `tests/lookVideo.test.ts` (new; outside the PLAN's claims list, which names the script alone: the lead adds it)
- `changes/feature-player-j19-s8a.md` (new)
Not: `scripts/e2e-lib.mjs`, `scripts/anim-sheet.mjs`, `scripts/shots-ctcourse.mjs` (copy the few lines you need, with a
comment naming the source and line), `src/**`, `package.json`, `.gitignore`, `docs/**`. No new dependency (no ffmpeg,
no download: Playwright's own `recordVideo` writes the .webm).

## The script `scripts/look-video.mjs`
Header comment (house style, like `shots-ctcourse.mjs:1-6`): what it does, the usage line, "Never headed; output
outside git; needs a prior `npm run build` unless `--url`", the laptop command (below), the scene-list format.

### Command line
`node scripts/look-video.mjs --scenes <list>[,<list>...] --out <dir> [--gfx <preset>] [--size <W>x<H>] [--url <base>] [--port <n>] [--help]`
- `--scenes`: one or more lists, comma-separated; the flag may repeat (the lists add up, in order). A list is a path to
  a scene-list JSON file, or the built-in name `smoke`. One `.webm` per list.
- `--out <dir>` (required): created if missing; must resolve OUTSIDE the repository (`path.relative(ROOT, abs)` is
  absolute or starts with `..`); inside it (or the repo root itself) is a usage error. `ROOT` = the repo root from
  `import.meta.url` (as `scripts/mocap/mixamo.mjs:17`, one level up here).
- `--gfx` (default `high`): one of `min low medium high ultra epic` (`src/core/flags.ts:145`).
- `--size` (default `1280x720`): `<W>x<H>`, integers 320-3840 and 240-2160; the viewport and the video size.
- `--url <base>` (e.g. `http://127.0.0.1:4189/`): record from that running server; no `dist` check, no server started.
- `--port` (default `E2E_PORT`, else 4189; an integer 1-65535): the port of the `vite preview` the script starts when no `--url`.
- `--help`: the usage text on stdout, exit 0.
- `E2E_HEADED=1` in the environment: usage error ("look videos are always headless").
- Errors: usage and list errors print one line naming the flag / list / scene index / field and exit 2; a run failure
  (server, boot, match, Wren never loaded) exits 1; success exits 0.

### Scene list (JSON)
```json
{
  "name": "walk-gears",
  "params": "autostart=proving",
  "hud": false,
  "scenes": [
    { "name": "Walk, gear 3, side view", "params": "autostart=proving&gear=3", "seconds": 8, "view": "side",
      "place": [0, 0, -14, 1.5708],
      "steps": [ { "t": 0, "move": [0, 1] }, { "t": 6, "move": [0, 0] }, { "t": 6.5, "press": "B" } ] }
  ]
}
```
- List fields: `name` (required; `^[a-z0-9]+(-[a-z0-9]+)*$`, at most 40 characters; the output file
  `<out>/<name>.webm`), `params` (required; no leading `?` or `&`; must contain `autostart=`), `hud` (boolean, default
  false), `scenes` (array, at least one). Unknown fields are an error.
- Scene fields: `name` (required, 1-60 characters; the caption), `seconds` (required, number, 0 < s <= 120), `params`
  (optional; replaces the list's `params` whole for this scene, same rules), `view` (default `ots`; one of `ots side
  front back left front34`), `place` (optional `[x, y, z, yaw]`, four finite numbers: a teleport at the scene start),
  `steps` (optional array, default `[]`). Unknown fields are an error.
- Step fields: `t` (required, number, 0 <= t <= the scene's `seconds`; steps in non-decreasing `t`) and exactly ONE
  action: `move: [x, fwd]` (left stick; each in [-1, 1]; `fwd` +1 is forward), `look: [x, up]` (right stick, same
  ranges), `press: "<BTN>"` (held 0.1 s of match time), `hold: "<BTN>"` with `for` (number > 0, seconds), `js:
  "<code>"` (run in the page with `a` = `window.__app` and `g` = `a.current`, as `anim-sheet.mjs` `setInput`). `<BTN>`
  is a key of e2e-lib's `BTN` (`A B X Y LB RB LT RT SELECT START LS RS UP DOWN LEFT RIGHT`). `for` only with `hold`.
- The list's scenes total at most 120 s (an error past it); under 60 s prints one stderr note ("<name>: N s, shorter
  than a 1-2 min look video") and records anyway.
- Built-in list `smoke` (name `smoke`, `params` `autostart=proving`): "Stand, game camera" 4 s `ots`; "Walk forward,
  side view" 8 s `side`, `place [0, 0, -14, 1.5708]`, steps `move [0, 1]` at 0 and `move [0, 0]` at 6; "Look round" 6 s
  `ots`, steps `look [1, 0]` at 0 and `look [0, 0]` at 3. (18 s: the note prints; it is a smoke run.)

### Exported pure functions (no side effects on import; the run sits behind the main guard)
- `parseArgs(argv, env)` -> `{ lists: string[], out: string, gfx, size: { width, height }, url: string | null, port:
  number, help: boolean }`; throws `Error` with the one-line message on a usage error.
- `outsideRepo(dir, root = ROOT)` -> boolean.
- `parseSceneList(json, label)` -> the normalised list (defaults filled: `hud`, scene `params`, `view`, `steps`);
  throws one `Error` listing every problem, each prefixed `<label>` / `<label> scene <i>` / `... step <j>`.
- `BUILTIN_LISTS` (`{ smoke: {...} }`, the raw JSON form, parsed by `parseSceneList` like a file).
- `pageParams(params, gfx)` -> the query string the page loads: `params`, plus `&gfx=<gfx>` unless it names `gfx=`, plus
  `&gear=none` unless it names `gear=` (so e2e-lib adds neither `gfx=min` nor `gear=4`).
- `padEvents(steps)` -> the scene's timeline `{ t, kind: 'axis' | 'button' | 'js', i?, v?, code? }[]`, stably sorted by
  `t`: `move [x, f]` -> axis 0 = x, axis 1 = -f; `look [x, u]` -> axis 2 = x, axis 3 = -u (the standard pad's up is
  negative, `src/input/gamepadMapping.ts` `mapPad`); `press B` -> button `BTN.B` 1 at t, 0 at t + 0.1; `hold RT for d`
  -> 1 at t, 0 at t + d; `js` -> `{ t, kind: 'js', code }`.
- Node imports only (`node:fs`, `node:path`, `node:os`, `node:url`, `node:child_process`) at the top; `e2e-lib.mjs`
  (it imports `playwright-core`) is imported dynamically inside the run, so the test imports the script cheaply.

### The run (per list, in `--scenes` order; one browser per list)
1. No `--url`: start `vite preview` as `shots-ctcourse.mjs:31-46` (spawn `node_modules/vite/bin/vite.js preview --port
   <port> --strictPort --host 127.0.0.1`, `windowsHide`, readiness loop, own-server exit check, `dist/index.html`
   identity check; "run `npm run build` first" on failure); stop it on exit. Once for all lists.
2. A temp dir (`fs.mkdtempSync(path.join(os.tmpdir(), 'look-video-'))`); `launch({ url, params: pageParams(scene 0
   params, gfx), viewport: size, context: { recordVideo: { dir: tmp, size } } })`.
3. `waitOperator(page)`; a `-1` is a run failure ("Wren not loaded").
4. Unless `hud`: a style tag hiding `body > :not(#game):not(#look-caption), .hud, .screens, .toasts, .toast` (as
   `anim-sheet.mjs:170`, the caption kept). Always: a caption div `#look-caption` (fixed, bottom left, small white
   text on a dark translucent box, `pointer-events: none`, high `z-index`) showing the scene name.
5. Once per page load: wrap `g.player.cam.update` as `anim-sheet.mjs:212-249` does, reading the view from
   `window.__lookView` on every call (`ots`: return after the original update; the other views: the follow camera,
   distance 3 m, heights 1.05 / 0.85 as there). Do not set `a.loop.manual`: the game runs live (the video records
   real frames).
6. Per scene: if its page params differ from the page's, `page.goto(base + '?' + pageParams(...))`, wait for
   `window.__app?.current?.player` (120 s) and `waitOperator`, re-apply 4 and 5 (the boot is in the video; say so in
   the header comment). Then in the page: `__pad.connect()`, every axis and button to 0, `place` teleport if given
   (`g.player.controller.teleport(new V(x, y, z), yaw); g.player.cam.yaw = yaw; g.player.cam.pitch = 0;`), set
   `__lookView`, the caption, and start an in-page driver: `t0 = g.time`; each `requestAnimationFrame`, apply every
   `padEvents` entry with `t <= g.time - t0` not yet applied (`__pad.axis` / `__pad.set` / `new Function('a', 'g',
   code)`), until the scene ends. Node polls every 250 ms until `g.time - t0 >= seconds`; a wall-clock cap of `seconds
   * 4 + 60` s prints a "ran slow" warning (match seconds done in wall seconds) and moves on. At the scene end every
   axis and button goes to 0.
7. After the last scene: `const v = page.video(); await page.close(); await v.saveAs(<out>/<name>.webm); await
   v.delete();` close the browser, remove the temp dir. Print `look-video: <name> -> <file> (<N> s of scenes, <M> s
   wall)` and the page's console errors filtered as `anim-sheet.mjs:369` (printed, not a failure).

## Test `tests/lookVideo.test.ts` (new)
Import with `// @ts-expect-error plain .mjs process script without types` (as `tests/changesFragments.test.ts:4`).
Header comment: what is covered (arguments, lists, the query, the pad timeline) and that the recording itself is a
PC run. Cases:
- `parseArgs`: a full valid line; `--scenes a.json,b.json --scenes smoke` -> three lists in order; missing `--out`;
  missing `--scenes`; an unknown flag; `--gfx ultraepic`; `--size 1280`, `--size 10x10`; `--port abc`, `--port 70000`; `env
  E2E_HEADED=1`; `--help` alone is valid. Each error matched by a regex on its flag name.
- `outsideRepo`: the repo root and `<root>/build/look` -> false; `path.resolve(ROOT, '..', 'look-out')` -> true.
- `parseSceneList`: the `BUILTIN_LISTS.smoke` list parses and totals 18 s; the example above parses with defaults
  filled; errors (one regex each, naming the field): list `name` "Walk Gears", `params` without `autostart=`, `params`
  "?autostart=proving", no scenes, a scene without `name`, `seconds` 0 and 121, a 70 s + 60 s list (total), `view`
  "top", `place` with three numbers, a step `t` past `seconds`, steps out of order, a step with `move` and `press`,
  `press` "Z", `move [0, 1.5]`, `hold` without `for`, `for` on a `press`, an unknown scene field. One bad list with
  three problems throws one error naming all three.
- `pageParams`: `autostart=proving` + `high` -> `autostart=proving&gfx=high&gear=none`; a query naming `gfx=epic` and
  `gear=3` is unchanged.
- `padEvents`: `press A` at 1 -> `[1, button 0, 1]`, `[1.1, button 0, 0]`; `hold RT for 1.2` at 2 -> button 7 at 2 and
  3.2; `move [0.5, 1]` -> axis 0 0.5, axis 1 -1; `look [1, 1]` -> axis 2 1, axis 3 -1; a `js` step kept; mixed steps
  come out sorted by `t` with equal times in step order.

## Run (unit tests only: no e2e, no GPU, no browser, no `npm run check`, no dev server; every command with a timeout)
- `npm run typecheck:fast`
- `npx eslint scripts/look-video.mjs tests/lookVideo.test.ts`
- `npx vitest run tests/lookVideo.test.ts tests/changesFragments.test.ts`
- `node scripts/look-video.mjs --help` (exit 0); `node scripts/look-video.mjs --scenes smoke --out build/look` (exit 2,
  inside the repo); `node scripts/look-video.mjs --out /tmp/x` (exit 2, no lists). None of these opens a browser.
- Never run a recording here (no GPU, no browser download): it is the pending PC run below.

## Done when
- `git diff --stat 29f03b6c004bf8dae66eea9c434160b6b1db061c` lists only the three files above.
- tsc and eslint clean; both vitest files pass; the three `node` lines exit 0 / 2 / 2.
- `changes/feature-player-j19-s8a.md`:
  ```
  # Look videos for the walk cards
  kind: patch
  - A developer tool records 1-2 minute videos of scripted scenes (walks, takedowns, camera views) without opening a
    window, for Michael's walk cards. Nothing in the game changes.
  ```
- Commits (the script + test, then the fragment), each with the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, pushed to `origin feature/player-j19-s8a`.
- Then append `## Report` below and set line 1 to `status: done feature/player-j19-s8a <sha>`; commit, push
  `cloud-queue` (rebase on reject).
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.

## Report spec (from the lead)
- Branch, commit shas.
- What the script does, with file:line for: argument parsing, list parsing, `pageParams`, `padEvents`, the server
  start, the camera wrap, the driver, the save.
- Lines copied from `anim-sheet.mjs` / `shots-ctcourse.mjs` (source file:line each).
- Tests: names and pass counts; tsc / eslint; the three `node` exit codes.
- Deviations from this brief, each with the reason.
- Pending PC run (the lead, laptop GPU tier 4189, or the desktop under `heavy.lock`): `npm run build`, then
  `E2E_GPU=1 E2E_PORT=4189 node scripts/look-video.mjs --scenes smoke --out C:/NightShift/scratch/look/j19-s8a`;
  accept when `smoke.webm` plays about 18 s with Wren standing, walking past a side camera and the view turning, the
  caption on each scene, and no window opened. The `.webm` path goes in the PR body. CI `check` runs on the PR.

## Report (Night Shift | Cloud Builder 1, 2026-10-26)
- Branch `feature/player-j19-s8a` (base 29f03b6c). Commits: de617e3c (script + test), 60b54151 (fragment). Pushed; head 60b541514a26524f21234e1c3c58ebe0dde1bf9c.
- `git diff --stat 29f03b6c` lists only `scripts/look-video.mjs` (466), `tests/lookVideo.test.ts` (167), `changes/feature-player-j19-s8a.md` (4).

### What the script does (scripts/look-video.mjs)
- Header comment `:1-20`: what it does, the usage line, never headed / output outside git / needs `npm run build` unless `--url`, the laptop command, the scene-list format, and the note that each boot is in the video.
- Argument parsing: `parseArgs` `:67-121`. `outsideRepo` `:61-64`. `--help` text `USAGE` `:34-44`.
- List parsing: `parseSceneList` `:138-210` (helper `paramsProblem` `:129-135`). `BUILTIN_LISTS.smoke` `:48-58`. Loading a file or built-in: `loadList` `:236-246`.
- `pageParams` `:214-219`. `padEvents` `:223-233`.
- Server start: `startServer` `:401-431`.
- HUD style and caption: `dress` `:251-261`. Camera wrap: `wrapCamera` `:264-287`. Match and Wren wait: `ready` `:290-296`.
- Driver: `playScene` `:299-352`, with the in-page rAF driver at `:319`, the 250 ms Node poll and the wall-clock cap after it.
- Save: `recordList` `:355-398` (`page.video()`, `page.close()`, `saveAs` at `:381`, `delete`, browser close, temp dir removed, summary line, filtered errors).
- `main` `:434-463`. Main guard `:466`. `e2e-lib.mjs` is only loaded by a dynamic `import()` inside `main`.

### Lines copied (each marked with a source comment)
- `BTN` from `scripts/e2e-lib.mjs:243`.
- Style tag from `scripts/anim-sheet.mjs:171`, with `:not(#look-caption)` added.
- Follow camera from `scripts/anim-sheet.mjs:215-252`, without the `cam` footage view, `fixCam` and the SHEET_* overrides. Uses D = 3 and heights 1.05 / 0.85.
- Teleport from `scripts/anim-sheet.mjs:177,211-213`.
- Error filter from `scripts/anim-sheet.mjs:370-371`.
- Server spawn, readiness loop, own-server exit check and `dist/index.html` identity check from `scripts/shots-ctcourse.mjs:31-45`.
- Main-guard pattern from `scripts/changelog-assemble.mjs:166`.
- The brief's anim-sheet line numbers are one or two lines off on master. The real ones are listed above.

### Tests
- `npx vitest run tests/lookVideo.test.ts tests/changesFragments.test.ts`: 2 files, 18/18 passed (lookVideo 17, changesFragments 1).
  - The lookVideo cases are parseArgs x5, outsideRepo x1, parseSceneList x5 (the field table holds 18 error cases plus the three-problem list), pageParams x1 and padEvents x5.
- `npm run typecheck:fast`: clean.
- `npx eslint scripts/look-video.mjs tests/lookVideo.test.ts`: 0 errors, 1 warning. The warning is "File ignored": `eslint.config.js` ignores `scripts/**/*.mjs`. With `--no-ignore` the script is also 0 errors / 0 warnings.
- `node scripts/look-video.mjs --help`: exit 0.
- `node scripts/look-video.mjs --scenes smoke --out build/look`: exit 2 ("--out must be outside the repository").
- `node scripts/look-video.mjs --out /tmp/x`: exit 2 ("--scenes is required").
- Other exit-2 paths, all without a browser: a bad list file, a missing list file, `E2E_HEADED=1`, `--url ftp://a`.

### Deviations and choices the brief left open
- `--url` must parse as an http(s) URL, otherwise it is a usage error naming `--url`. The brief gave no rule for it.
- Scene and step indices in error messages count from 0, matching the JSON arrays ("scene 0 step 1").
- `outsideRepo` treats a path as outside when it is `..` or starts with `../`, not when it merely starts with `..`. So a folder named `..x` inside the repo still counts as inside.
- Several list problems are joined into one line with "; ".
- The "shorter than a 1-2 min look video" note is printed by the run, after all lists are checked and before recording. `parseSceneList` prints nothing.
- `parseSceneList` also accepts the JSON text. A file is read and passed as text, and a JSON syntax error is a list error (exit 2).
- `params` must match `(^|&)autostart=`, the same regex `e2e-lib` uses to decide whether to wait for the match.
- In `--help` mode the required-flag checks are skipped. Unknown flags and `E2E_HEADED=1` are still errors.
- The vite preview runs with `cwd` = the repo root.
- The readiness loop sleeps 250 ms after a non-OK answer too, not only after a fetch error.
- A server or `dist` failure exits 1, as the brief says ("run failure"), where `shots-ctcourse` exits 2.
- The result and error lines use `console.info` instead of `console.log`, because the repo's `no-console` rule only allows warn / error / info. The output is the same.
- Expect the video to run longer than the scene total. Playwright records from page creation, so it includes the first boot and the wait for Wren before scene 0. The smoke video will be about 18 s of scenes plus that boot.

### Pending PC run
- Who: the lead, on the laptop GPU tier 4189 or the desktop under `heavy.lock`.
- Command: `npm run build`, then `E2E_GPU=1 E2E_PORT=4189 node scripts/look-video.mjs --scenes smoke --out C:/NightShift/scratch/look/j19-s8a`.
- Accept when `smoke.webm` shows the boot, then about 18 s of scenes:
  - Wren standing.
  - Walking past a side camera.
  - The view turning.
  - A caption on each scene.
  - No window opened.
- The `.webm` path goes in the PR body. CI `check` runs on the PR.
- Not run here: no GPU or browser in the cloud session.
