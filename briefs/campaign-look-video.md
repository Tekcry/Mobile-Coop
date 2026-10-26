status: done feature/look-video 8a67136d33c3671108c5fe9a871693e5adfa1b74

# campaign look-video: a look-video recorder for map walk videos (Sonnet)
Owner: Campaign Build. Lead: Night Shift | Campaign Build. Released 2026-10-26 ~13:45. Gate item of the PR C split
(`docs/missions/slices/PRC-split.md` section 5 "Look videos W1-W4"): no recorder exists on master or any branch, and
RULES "Walk pacing" wants a 1-2 min look video for lighting / animation PRs.

Base: origin/master at 29f03b6c004bf8dae66eea9c434160b6b1db061c. New branch: feature/look-video. Cloud: guard on the branch name only
(`test "$(git rev-parse --abbrev-ref HEAD)" = feature/look-video`), per agent-preamble "Cloud sessions"; no CPU wait in
the cloud. Model: Sonnet. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Hard rules
(`git show origin/master:CLAUDE.md`). Never merge, rebase, stash, reset or force-push. No e2e, no browser run: the first
real run is a PC run on the laptop queue ("pending PC run").

## Only these files
- `scripts/look-video.mjs` (new, ~150 lines)
- `scripts/look-video/tallowWharf.json` (new: the W1-W4 waypoint lists)
- `tests/lookVideo.test.ts` (new: the pure parts only)
- `docs/systems/testing-tools.md` (one short entry beside the other look scripts)
- `changes/feature-look-video.md` (`kind: patch`, one line: a tool that records map walk videos for review)

## Do
1. Read `scripts/sector-lights-shots.mjs` (serve `dist/` with `vite preview`, `launch` from `scripts/e2e-lib.mjs`, the
   map params, the photo-freeze / `photo-mode` calls) and `scripts/e2e-darkness.mjs` (~:100-120 `g.photoCamera()`,
   ~:300-345 `photoFreeze`) and `launch`'s `context` option (e2e-lib.mjs ~:87-92). Copy their serve / launch / stop
   pattern; do not invent new page hooks (if a hook you need is missing, use only existing `window` test hooks those two
   scripts use, and note it in the report).
2. `scripts/look-video.mjs <outDir> <file.json> [sections]` (sections: comma list of keys in the JSON, default all).
   JSON: `{ "params": "autostart=...&mode=...", "sections": { "<key>": { "seconds": 75, "path": [[x,y,z, tx,ty,tz, s], ...] } } }`
   - each path point is a camera position, a look target and the seconds to reach it from the previous point. One
   browser context per section with `recordVideo: { dir: <outDir>/tmp-<key>, size: { width: 1280, height: 720 } }`,
   viewport 1280 x 720; boot the map with the params, wait for the operator (`waitOperator`), freeze guards as
   e2e-darkness does, then fly the photo camera along the path, interpolating linearly at the page's frame rate
   (per frame `page.evaluate` is fine; this is a tool, not a hot path). Then `ctx.close()`, move `page.video().path()`
   to `<outDir>/<key>.webm`, delete the tmp folder. Print each file path and its length in seconds.
   Header comment like sector-lights-shots.mjs: what, why, usage (`E2E_GPU=1 E2E_PORT=4189 timeout 1800 node
   scripts/look-video.mjs <dir> scripts/look-video/tallowWharf.json w1,w2`), never headed, port from `E2E_PORT`.
   Videos are never committed (the PR body names their path).
3. Put the pure parts in exported functions the test can import without a browser (`parseLookPlan(json)` validates
   and returns sections; `pathAt(path, t)` returns the interpolated camera [x,y,z,tx,ty,tz] at time t, clamped at both
   ends). Use plain arithmetic (no Math.hypot). Keep the browser code behind `if (import.meta.url === ...)` main guard
   so importing has no side effects.
4. `scripts/look-video/tallowWharf.json`: params `autostart=tallowWharf&mode=sector&missions=1&coopkit=1&mission=threeGreyCoats`;
   one section per W1-W4, ~75 s each, 6-10 points at eye height 1.6-3 m walking the section's main route and one high
   view. Take the coordinates from `git show origin/feature/mission-engine:src/world/maps/tallowWharfW1.ts` (and W2-W4,
   `tallowWharfKit.ts` for `WHARF_BOUNDS` and section boxes): stay inside each section's box, never inside a solid.
   The map exists only on the engine branch; that is fine (data only; the run happens on a branch that has the map).
5. `tests/lookVideo.test.ts`: parseLookPlan rejects a bad point and an unknown section; pathAt at 0, at a point, between
   two points, past the end; every Tallow point lies inside WHARF_BOUNDS (hard-code the bounds numbers from the kit in
   the test with a comment naming the source line, since the kit is not on master).
6. `node --check scripts/look-video.mjs`, `npx vitest run tests/lookVideo.test.ts`, eslint on the new files,
   `npx tsc --noEmit -p tsconfig.json`. Commit each step on the branch, push.
7. Report at the end of this file (files, tests with counts, any hook you could not find, deviations), then line 1 =
   `status: done feature/look-video <sha>`.

## Report (Night Shift | Cloud Builder 3, 2026-10-26)
- Branch `feature/look-video` from 29f03b6c, pushed. Commits `c07e07ca` (script, plan, test), `8a67136d` (docs, fragment).
  5 files, +371 / -2.
- `scripts/look-video.mjs` (180 lines): exports `parseLookPlan(json, only)` -> `[{ key, seconds, path }]` (rejects bad
  points, unknown sections, a first time not 0, a path longer than `seconds`), `pathAt(path, t)` (linear, clamped; a 0 s
  segment is a cut), `pathSeconds(path)`. Main guard (`import.meta.url` vs argv[1]): importing starts nothing (checked).
  Main: sector-lights-shots' serve / verify / stop pattern; per section `launch(..., viewport 1280x720, context:
  { recordVideo: { dir: <out>/tmp-<key>, size 1280x720 } })`, `waitForFunction(__app.current.player && world)`,
  `waitOperator`, then e2e-darkness' freeze (`vision.set('off')`, `photoFreeze(true)`, `photo-mode`, the player rig
  hidden), `photoCamera()` on the first point, `scene.isReady()` wait, then one in-page rAF loop flies the path (the same
  `pathAt` source runs in the page) for `seconds` of wall time; `ctx.close()`, the video moved to `<out>/<key>.webm`, tmp
  removed. `GFX` env (default epic) as sector-lights-shots.
- `scripts/look-video/tallowWharf.json`: the brief's params; w1-w4, `seconds` 75, 10 points each (path times 74 / 71 / 70
  / 75 s), eye height 1.6-3 m, one high view each (W1 gallery deck 6.3, W2 arcade roof 10.2, W3 counting house roof
  10.2-10.6 looking down into the coal yard, W4 over the crane gantry 12.8: above its 2.2 m drop-guard screens). Points
  from tallowWharfW1-W4.ts / Kit on origin/feature/mission-engine: every segment checked by hand against the solids it
  passes (doors and the fish-hall arch crossed at their openings, below their heights); where a straight line would cross
  a wall or the W4 closed sliding loading door, the path cuts (0 s segment) instead.
- `tests/lookVideo.test.ts`: 12 passed (parser: order / picks, unknown section, bad points, bad plans; pathAt: total, at 0
  and before, at a point, between, a cut, past the end; Tallow: W1-W4 at 75 s with 6-10 points and the brief's params,
  every camera and target inside WHARF_BOUNDS (hard-coded from tallowWharfKit.ts:20, named in the test) and every camera in
  its SECTION_BOX (:27-32), one high view and eye height otherwise). `node --check` OK, eslint clean (the .mjs is
  eslint-ignored by the repo config), `tsc --noEmit` clean, changesFragments 1 passed, doc-lint 0 errors.
- Hooks: none missing; only `__app.current` (`photoFreeze`, `photoCamera`, `vision`, `player.rig`, `scene`) and
  `waitOperator`, all used by sector-lights-shots / e2e-darkness.
- Deviations: (1) the video also holds the boot (Playwright records from the page's start): each section writes
  `<key>.json` `{ start, seconds }` and prints "the flight starts N s into the video"; trimming needs ffmpeg, not added.
  (2) A plan point's `s` of 0 after the first is a cut (needed to avoid flying through walls); `seconds` must cover the path
  and the camera holds the last view for the rest. (3) testing-tools.md sat exactly on its 720-line doc-lint budget: the
  entry is one line and the soak bullet's two lines were joined into one (same words) to stay at 720. (4) Commit trailer is
  the Opus one (the session's model), not the brief's Sonnet one.
- Pending PC run: `npm run build` on a branch with the Tallow map, then
  `E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/look-video.mjs <dir> scripts/look-video/tallowWharf.json`; check each
  video for clipping (camera inside a solid) and that the views read; the params assume `missions=1&coopkit=1&mission=
  threeGreyCoats` boot Tallow in sector mode as the brief says (not verifiable from master).
