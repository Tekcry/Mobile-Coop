status: open

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
