# visual-gate VG2 - build report (shot harness + M0 timing command)

Builder: Opus 5.5 (cloud), 2026-10-24. Branch `feature/visual-gate-vg2` cut at 0b7f46f4 (origin/feature/visual-gate is
3fd594e5 now: a STATE-only commit on top). Reused code read at origin/master fc23ee0d (master moved past 92d0205d; the
reused lines checked are unchanged in substance, refs below are at fc23ee0d). Harness-only: zero src diff, no hook.

## Built
`scripts/visual-gate/harness.mjs` (the Contract block copied verbatim at the top), all exported:
- Pure: `VIEWPORT` (960 x 540), `mapQuery`, `settleTarget`, `gridMeans` (self-contained: also runs in the page from its
  source text), `gridDelta`, `isConverged`, `projectPoint`, `projectQuads`.
- Page: `bootMap`, `settle`, `pin`, `aim`, `converge`, `matrix`, `capture`, `shoot`, `closeBoot`. `../e2e-lib.mjs` is
  imported lazily (`import('../e2e-lib.mjs')`, cached) by `bootMap` and `converge` only.
- PNG decode in the page as e2e-darkness `readLuma` (createImageBitmap + OffscreenCanvas); the decode code is sent as one
  expression string (the page's own `gridMeans` source or a base64 encoder), so nothing closes over node scope and the
  page needs no `eval`.

`scripts/e2e-visual.mjs` (timing skeleton): `parseArgs` exported (pure), `main()` only when run directly
(`import.meta.url === pathToFileURL(process.argv[1]).href`, the repo idiom). `main` dynamic-imports
`./visual-gate/viewpoints.mjs`, runs PRESETS in two browsers at once (`--serial`: one after the other), maps in the order
warehouse, warehouseOps, ctcourse, campusOps; per map `bootMap`, every view `shoot`, every rig `shoot` 'on' then 'off',
at Epic a timing-only card per parity point, `closeBoot`. A thrown harness error is recorded per shot and the run goes
on. Prints the markdown table (map x preset: boot ms, views ok/total, rig shots, cards, settle mean / max, converge mean,
capture mean, converge fails, errors, wall s), per-browser totals and the wall time; `--json` writes timings and
SettleResults (no pixels); `--png` writes `<id>[-on|-off]@<preset>.png`. Exit 1 on any harness error, 2 on usage /
viewpoints.mjs missing.

### Deviations from the brief (and why)
1. `settle` computes its sim-time target in the page with the LIVE torch count, the same formula as `settleTarget`
   (`max(minSimS, (n + 1) / 60)`, commented as its mirror). `SettleSpec` has no torch count and the settle is one
   evaluate; a campus section change can add torches after the boot. `Boot.torchCount` is recorded (JSON row) only.
   `shoot`'s `boot` argument is unused for now (kept per the signature, for VG5).
2. One line added after the verbatim Contract block: `/** @typedef {import('./viewpoints.mjs').Rig} Rig */` (`shoot`'s
   item type).
3. `aim` returns `{ ready, ms }`; a scene not ready after 30 s does not throw (as e2e-darkness `measure`), the converge
   then decides. `ShotRaw` has no field for it (Contract unchanged).
4. `converge`'s 8000 ms cap counts from the first read (after the 30 warm-up frames), as e2e-darkness (`measure`
   t0 after the first read); `ConvergeResult.ms` covers the whole call. Options: `{ tol, need, maxMs, warm, every, cols,
   rows }`, defaults 0.004, 3, 8000, 30, 10, 16, 9.
5. `gridMeans` uses the VG1 weights on unrounded luma (no per-pixel `Math.round`): a convergence measure, not a metric.
6. `settle` throws when a rig is asked and the map has no alive non-quadruped guard (`settle: rig has no guard`), and
   when `doorAt` finds no door at all.
7. e2e-visual extras (additive): exports `MAP_ORDER` and `timingTable`; JSON adds `browsers: [{ preset, wallMs }]`, per
   row `consoleErrors` (first 20 page console lines), per shot `behind` (region names behind the camera) and `kind`
   (view / rig / card); `sha` from `VG_SHA` or `git rev-parse HEAD` (5 s timeout), omitted when neither works. Without a
   url `parseArgs` defaults to `http://localhost:4173/` (the suites' default); without `--time` main exits 2 ("only
   --time is built"). Card ids are `card-<view id>-<k>` (k from 1), run only for views kept by `--only`; `pin` is called
   once more before the card loop (in case the last shot threw before its pin).
8. Type check: `npx tsc --noEmit -p tsconfig.json` instead of `npm run typecheck:fast` (other builders share
   node_modules by symlink: no shared incremental cache). Same check.

## Pin order as implemented (PLAN section 3; C0 M1)
`settle(page, spec)` - one async evaluate (`g = __app.current`, `V = g.player.position.constructor`):
1. Sim running: `__app.loop.timeScale = 1`; `g.photoFreeze(false)`; `document.body.classList.remove('photo-mode')`;
   `g.team?.end?.(true)`; `g.player.controller.teleport(new V(...feet), 0)`; `g.vision.set('off')`. Guards re-read every
   call: `(g.enemyMgr?.enemies ?? []).filter(e => e.alive && !e.def?.quadruped)`; each `e.update = () =>
   e.prevPos.copyFrom(e.pos)`; the rig guard (the first one) `e.pos.set(...guard.pos)`, `e.yaw = guard.yaw`,
   `e.torchOverride = torch`; every other `e.pos.set(bounds.minX + 1 + k * 0.5, feet[1] - 40, bounds.minZ + 1)`,
   `e.torchOverride = false` (`bounds = g.world.level.bounds`); then `e.prevPos.copyFrom(e.pos)`. No rig: all parked.
2. Settle: wait (50 ms `setTimeout` polls) until `g.time` advanced >= `max(minSimS ?? 0.3,
   ((g.enemyMgr?.torches?.length ?? 0) + 1) / 60)`; wall cap `wallCapMs ?? 20000` -> `settle timed out: ...`.
3. Read in the same tick: `meter = g.lightLevel`, `field = g.world.lightField.bodyLevel(feet[0], feet[1], feet[2], 1.7)`,
   `simS`. Then the checks, each throwing an Error naming the check and values: `__app.loop.timeScale === 1`; rig ->
   `has = g.enemyMgr.hasTorch(rigGuard)` equals `torch`; `othersLit` = alive enemies other than the rig guard with
   `hasTorch` (must be 0); `doorAt` -> nearest door in `g.world.doors.list` by `(cx, cz)`, `shut = target === 0 &&
   open === 0`, throws if `dist > 1.5` or not shut.

`pin(page)` - ONE synchronous evaluate, no await: `__app.loop.timeScale = 0`; `reg = g.world.level.lights`; for each id in
`reg.flickering ?? []`: `reg.lights[id].flicker = 1`, then `reg.flickerVersion++` once if any; if `reg.sway`: every light
with non-zero `swx / swy / swz` -> 0 (`swayed = true`), then `reg.swayVersion++`; `g.photoFreeze(true)`; `photo-mode` on;
`g.player.rig.setEnabled(false)`; every `e.bodyRig?.setEnabled(false)`. Returns `{ flickers, swayed }`.

`shoot`: settle (rig spec `{ guard, torch: rigState === 'on', doorAt: item.door?.at ?? null }` when `rigState`) -> pin
-> `aim` (`c = g.photoCamera()`, `c.position.set(...cam)`, `c.setTarget(new V(...target))`, `scene.isReady()` 250 ms
polls, max 30 s) -> `converge` -> assert `__app.loop.timeScale === 0` (`unpinned after converge: ...`) -> `projectQuads(
await matrix(page), item.regions, 960, 540)` -> `capture`; `ms` per phase. A rig is `shoot(.., 'on')` then
`shoot(.., 'off')`: the second settle unpins (full redo).

## Old-build `?.` / `??` list (A14)
`reg.flickering ?? []`, `reg.sway` (truthy check), `g.team?.end?.(true)`, `world.lightBake?.sections`,
`g.enemyMgr?.torches?.length ?? 0`, `g.enemyMgr?.enemies ?? []`, `em.hasTorch?.(e)` (others count), `e.def?.quadruped`,
`e.bodyRig?.setEnabled`, `g.world.doors?.list ?? []`, `__app.settings?.get?.()?.video` (film grain skipped when
undefined), `__app.engine?.getGlInfo?.()?.renderer`. Used directly (exist from v4.60.1, PLAN 1 / C0 "Verified"):
`loop.timeScale`, `photoFreeze`, `photoCamera`, `hasTorch` (rig guard), `torchOverride`, `lightField.bodyLevel`,
`lightLevel`, `vision.set`, `controller.teleport`, `world.addLightProbe` (cards).

## Test results
- `npx vitest run tests/visualGateHarness.test.ts --maxWorkers=2`: 1 file, 13 tests, 13 passed (294 ms).
  Covers VIEWPORT; mapQuery (low, extra, empty extra); settleTarget (0, 40, minSimS); gridMeans (flat grey 128 within
  1e-9, left-half white cols 2 -> [1, 0] per row, cell counts, and the function rebuilt from its own source gives the
  same grid: the page path); gridDelta / isConverged (both brief cases plus short lists); projectPoint / projectQuads
  with a row-vector view x PerspectiveFovLH matrix (fov 90, 16:9: axis -> (480, 270), +x right, +y up, frame edges, a
  moved camera, behind -> w <= 0 and the quad `behind`); parseArgs (every flag, defaults, unknown flag, missing value);
  static guard (no `@babylonjs`, no `/src/` import, no top-level e2e-lib import in the harness, `timeScale = 0`
  present, no `shotPin`).
- `npx tsc --noEmit -p tsconfig.json`: exit 0, no output.
- `npx eslint tests/visualGateHarness.test.ts`: exit 0, no output.
- `node --check scripts/visual-gate/harness.mjs` and `node --check scripts/e2e-visual.mjs`: ok.
- `git diff --stat origin/feature/visual-gate -- src` and `git diff --stat 0b7f46f4 -- src`: empty.
- Extra node-only sanity (scratch script, not in the repo): the in-page base64 encoder round-trips a 960 x 540 RGBA
  buffer exactly, and the page-path `gridMeans` expression gives 144 cells in 0..1.
- No browser, e2e, GPU, build or `npm run check` was run (brief).

## M0 request (the LEAD sends it, after group A is merged into feature/visual-gate)
```
node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-m0 --requester "Night Shift | Sector Ops Build" --note "visual-gate M0" --step "git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --time --json C:/NightShift/scratch/visual-gate/m0/m0.json --png C:/NightShift/scratch/visual-gate/m0/png"
```
(origin/master is fc23ee0d at this writing; use the head at send time. This is the brief's line, with `--png`; the PLAN
section 7 copy lacks `--png`.)

## Local step-line check (no browser)
- Archive + extract: a temporary tree of HEAD plus the new files (temporary index in scratch, `git write-tree`; no
  commit, the branch untouched), then `git archive <tree> scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - -C
  <scratch>/x`: exit 0 0; both files extracted; `node --check` ok on the extracted copies; `node scripts/e2e-visual.mjs
  http://127.0.0.1:4189/ --time --json ... --png ...` from the extracted copy reaches the viewpoints load and exits 2
  ("cannot load scripts/visual-gate/viewpoints.mjs (VG3)", expected: VG3 is absent here); `--bogus` exits 2 with usage.
- cmd.exe: not runnable in this Linux cloud session. By reading: the service runs each alone step as one line through
  `spawn(line, { shell: true })` (origin/master `scripts/laptop-queue/service.mjs:480`, step line :868, env `E2E_PORT` =
  the slot and `E2E_GPU: '1'` :870), i.e. `cmd.exe /d /s /c`; `&&` and `|` are cmd operators; the line has no quotes or
  `%`; `tar` is Windows' bsdtar (`C:\Windows\System32\tar.exe`) or Git's GNU tar, both read `-f -` from stdin; `git
  archive` writes tar by default. The first real cmd.exe run is M0 itself.
- `serve.mjs` passes the trailing arguments through: `spawn(process.execPath, process.argv.slice(2), ...)`
  (origin/master `scripts/laptop-queue/serve.mjs:16`), so the script gets `<url> --time --json ... --png ...`, and its
  exit code is passed on.
- The step needs BOTH `scripts/e2e-visual.mjs` and `scripts/visual-gate/viewpoints.mjs` on feature/visual-gate: before
  the group A merge `git archive` fails on the missing path (pathspec error) and the step fails fast.

## Files touched
- `scripts/visual-gate/harness.mjs` (new)
- `scripts/e2e-visual.mjs` (new)
- `tests/visualGateHarness.test.ts` (new)
- `docs/visual-gate/checks/vg2-build.md` (new, this report)

## Open items (VG5 must know)
- Quadrupeds are neither stubbed nor parked (brief: non-quadruped guards only). Any live enemy pushes a shut door open
  within `DOOR.enemyReach` (`enemyManager.ts:3490` `doors.pushOpen(e.pos.x, e.pos.z)` for every alive enemy); the rig
  door assert catches it, and a dog can walk into frame. Park them too if a map has dogs.
- The player and guard rigs hidden by a pin stay hidden through later settles (nothing re-enables them); the meter does
  not read the rig, so it is harmless, but a VG5 view that wants a body visible must re-enable it.
- The player is teleported with yaw 0 every settle (brief); `aim` moves only the photo camera.
- `aim.ready === false` is not recorded in `ShotRaw`; VG5 may want it (a shot taken on an unready scene).
- Cards are timing only: rendered under the last shot's pin, the player at that shot's feet, the card facing +x
  (`addLightProbe(x, y, z, 1, 0, 0)`); VG5 owns the real card direction search and the meter = field / parity reads.
- Convergence tolerance 0.004 on 16 x 9 cell means: if Epic's TAAU jitter keeps deltas above it, shots report `ok:
  false` at 8 s each; M0's converge-fail column and converge ms will show it.
- The cloud-queue brief's status line (`origin/cloud-queue:briefs/visual-gate-vg2.md`) was not edited: the caller commits.
