status: claimed Night Shift | Cloud Builder 1 2026-10-24T11:50Z

# visual-gate VG2 (cloud copy of docs/visual-gate/briefs/VG2.md on feature/visual-gate @ 0b7f46f4)

Lead: Night Shift | Sector Ops Build (2026-10-24 ~23:30, overnight). CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg2` from `origin/feature/visual-gate` @ 0b7f46f4 in your own checkout (ignore the C:/NightShift worktree path and its guard).
- You own that branch: commit and push it (ignore the preamble's 'never commit / push'); end with the report file the brief names and this file's status line.
- Unit tests only (vitest single files, tsc): no e2e, no GPU, no npm run check. Any GPU / laptop run the brief mentions: write the exact request command into your report; the lead sends it.
- Edit only the files the brief lists (VG1 builds on the desktop at the same time; VG2 / VG3 / VG4 share no file).

---

# VG2 - shot harness + M0 timing command (Opus builder; harness-only, zero src diff)

Job visual-gate, group A (parallel with VG1, VG3, VG4). Lead: Night Shift | Sector Ops Build. C0 P1 is adopted: there
is NO `shotPin` hook. The sim is pinned from the page with `__app.loop.timeScale = 0`.

## Where
- Branch `feature/visual-gate-vg2`, cut from the pushed `feature/visual-gate` head; worktree
  `C:/NightShift/Mobile-Coop-visual-gate-vg2` (the lead creates it). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-vg2 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-vg2 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-vg2"`
- Read first: `docs/systems/agent-preamble.md` (never commit, push, stash, reset or checkout); CLAUDE.md "Hard rules";
  `docs/visual-gate/BRIEF.md` (A6, A7, A14), `PLAN.md` sections 1, 3 (the pinning order is the spec) and 7;
  `docs/visual-gate/checks/c0-plan-check.md` M1, P1-P3; `briefs/VG3.md` "Contract" (View, Rig, MapCfg) and
  `briefs/VG1.md` "Contract" (Pt2). The branch base is older than master: read reused code with
  `git show origin/master:<file>` (e2e-darkness.mjs, shots-ctcourse.mjs, e2e-lib.mjs, src/core/loop.ts, app.ts,
  gameState.ts, lights.ts, enemyManager.ts, enemy.ts, doors.ts; line refs in PLAN section 1).

## Files (only these)
- create `scripts/visual-gate/harness.mjs`
- create `scripts/e2e-visual.mjs` (timing skeleton; VG5 grows it into the gate later)
- create `tests/visualGateHarness.test.ts`
- create `docs/visual-gate/checks/vg2-build.md` (your report)
Do NOT touch: anything under `src/` (no hook, no edit at all), `scripts/e2e-lib.mjs`, `scripts/run-e2e.mjs`, any other
script, `viewpoints.mjs` (VG3 creates it in parallel: it is ABSENT on your branch), `metrics.mjs` (VG1), store files
(VG4), `package.json`, `docs/visual-gate/M0.md` (the lead writes it). No Babylon import in node code: Babylon objects
are only touched inside `page.evaluate` callbacks, through the page's own classes (`g.player.position.constructor` etc.).

## Contract (the single definition of the harness's shapes; VG5 codes to it - copy verbatim to the top of harness.mjs)
```js
/** @typedef {import('./viewpoints.mjs').View} View */ // shapes per briefs/VG3.md Contract (Vec3, Quad, MapCfg, Rig, Preset)
/** @typedef {[number, number, number]} Vec3 */
/** @typedef {[Vec3, Vec3, Vec3, Vec3]} Quad */
/** @typedef {[number, number]} Pt2 */ // briefs/VG1.md: screen px, x right, y down, origin top-left
/** @typedef {{ query: string, label: string }} MapCfg */
/** @typedef {{ browser: any, ctx: any, page: any, errors: string[], renderer: string, chrome: string, bootMs: number, torchCount: number }} Boot */
/** @typedef {{ feet: Vec3, rig: null | { guard: { pos: Vec3, yaw: number }, torch: boolean, doorAt: Vec3 | null }, minSimS?: number, wallCapMs?: number }} SettleSpec */
/** @typedef {{ meter: number, field: number, simS: number, ms: number, guards: number, torch: null | { want: boolean, has: boolean }, othersLit: number, door: null | { shut: boolean, dist: number } }} SettleResult */
/** @typedef {{ flickers: number, swayed: boolean }} PinResult */
/** @typedef {{ ok: boolean, frames: number, reads: number, lastDelta: number, ms: number }} ConvergeResult */
/** @typedef {{ pts: Pt2[], behind: boolean }} Projection */ // behind: a corner with clip w <= 0 (VG5 skips that region)
/** @typedef {{ w: number, h: number, rgba: Uint8Array, png: Buffer, ms: number }} Capture */
/** @typedef {{ id: string, rigState: 'on' | 'off' | null, settle: SettleResult, pin: PinResult, converge: ConvergeResult, regions: Record<string, Projection>, capture: Capture, ms: { settle: number, pin: number, aim: number, converge: number, capture: number, total: number } }} ShotRaw */
```

## harness.mjs functions (exact names; all exported)
Pure (no page, unit-tested):
- `VIEWPORT = { width: 960, height: 540 }` (A6, device scale 1: the Playwright default).
- `mapQuery(map: MapCfg, preset, extra = ''): string` -> `${map.query}&gfx=${preset}&weather=clear` plus `&${extra}`
  when extra is non-empty (proof flags such as `falloff=photo`).
- `settleTarget(torchCount: number, minSimS = 0.3): number` -> max(minSimS, (torchCount + 1) / 60) seconds of sim time
  (the torch round robin, enemyManager.ts:1476-1482).
- `gridMeans(rgba, w, h, cols = 16, rows = 9): number[]` - mean Rec. 709 luma 0..1 per cell (weights as VG1).
  Self-contained (no closure over module scope) so it can also run in the page via `page.evaluate`.
- `gridDelta(a: number[], b: number[]): number` - max |a_i - b_i|.
- `isConverged(deltas: number[], tol = 0.004, need = 3): boolean` - the last `need` deltas all < tol.
- `projectPoint(m: number[] /* 16, Babylon row-vector order: view x projection .toArray() */, p: Vec3, W, H): { x, y, w }`
  - clip = p x M; x = (clip.x / w + 1) / 2 x W; y = (1 - clip.y / w) / 2 x H.
- `projectQuads(m, quads: Record<string, Quad>, W, H): Record<string, Projection>` - `behind` when any corner w <= 1e-6.
Page (Playwright; never imported by the unit test path that runs code: import `../e2e-lib.mjs` LAZILY inside `bootMap`
with `await import('../e2e-lib.mjs')`, so the test does not load playwright):
- `bootMap({ url, map, preset, extra = '' }): Promise<Boot>` - `launch({ url, params: mapQuery(...), viewport: VIEWPORT })`
  (e2e-lib.mjs:87-101; it waits for the match and the section bake but swallows a timeout, :220-224); then assert
  `world.lightBake?.sections` is absent or `done` (else throw `bake not done: <map>@<preset>`; C0 P3); assert
  film grain is off when readable (`__app.settings?.get?.().video?.filmGrain === false`; app.ts:53, default
  settings.ts:159; skip if undefined); `renderer` = `__app.engine.getGlInfo().renderer` (app.ts:51, as app.ts:215);
  `chrome` = `browser.version()`;
  `torchCount` = `g.enemyMgr?.torches?.length ?? 0` (`g = __app.current`). The HUD is not hidden here (`pin` does it).
- `settle(page, spec: SettleSpec): Promise<SettleResult>` - PLAN section 3 steps 1-3, one page evaluate (async, polls
  with `setTimeout(50)` like shots-ctcourse.mjs:63-70):
  1. `__app.loop.timeScale = 1`; `g.photoFreeze(false)`; remove `photo-mode`; `g.team?.end?.(true)`;
     `g.player.controller.teleport(new V(...feet), 0)`; `g.vision.set('off')`; for every alive non-quadruped guard
     (`g.enemyMgr?.enemies`, re-read EVERY call: a section change can spawn new ones): `e.update = () => e.prevPos.copyFrom(e.pos)`;
     the rig guard (the first such guard) at `guard.pos` with `e.yaw = guard.yaw`, `torchOverride = torch`; every other
     at `[bounds.minX + 1 + k x 0.5, feet[1] - 40, bounds.minZ + 1]` with `torchOverride = false`; `prevPos.copyFrom(pos)`
     (e2e-darkness.mjs:222-228). No rig: every guard parked, `torchOverride = false`.
  2. wait until `g.time` advanced >= `settleTarget(torchCount, minSimS)` (wall cap `wallCapMs`, default 20000: throw
     `settle timed out` if hit). Then check: rig -> `has = g.enemyMgr.hasTorch(rigGuard)` must equal `torch`; `othersLit`
     = guards other than the rig guard with `hasTorch` (must be 0); `doorAt` -> the door in `g.world.doors.list` nearest
     `(doorAt[0], doorAt[2])` by `(cx, cz)`: `shut = target === 0 && open === 0`, `dist` = its distance (throw if > 1.5 m
     or not shut); `__app.loop.timeScale === 1`. Any failed check throws an Error naming the check and the values.
  3. `meter = g.lightLevel`, `field = g.world.lightField.bodyLevel(feet[0], feet[1], feet[2], 1.7)` in the same tick.
- `pin(page): Promise<PinResult>` - ONE synchronous evaluate (no await inside): `__app.loop.timeScale = 0`; for each id in
  `reg.flickering ?? []`: `reg.lights[id].flicker = 1`, then `reg.flickerVersion++` once if any; if `reg.sway`: every light
  with a non-zero `swx / swy / swz` -> 0 (record `swayed`), then `reg.swayVersion++`; `g.photoFreeze(true)`; add
  `photo-mode`; `g.player.rig.setEnabled(false)`; every guard `e.bodyRig?.setEnabled(false)` (e2e-darkness.mjs:311-318).
  `reg = g.world.level.lights`.
- `aim(page, cam: Vec3, target: Vec3)` - `const c = g.photoCamera(); c.position.set(...cam); c.setTarget(new V(...target))`;
  then wait `scene.isReady()` (250 ms polls, max 30 s, e2e-darkness.mjs:117).
- `converge(page, opts?)` - `frames(page, 30)` (e2e-lib.mjs:248), then every 10 frames: screenshot (full viewport) ->
  decode in the page (createImageBitmap + OffscreenCanvas, as readLuma :130-145) -> `gridMeans` in the page -> delta to the
  previous read; stop when `isConverged(deltas, 0.004, 3)` or after 8000 ms (`ok: false`, VG5 reports it). Full-frame grid,
  not a centre patch: TAAU jitters every frame even when pinned (taau.ts:22-23; C0 P3).
- `matrix(page): Promise<number[]>` - `c.getViewMatrix(true).multiply(c.getProjectionMatrix(true)).toArray()` of the
  photo camera.
- `capture(page): Promise<Capture>` - one full-viewport `page.screenshot()` (PNG), decoded in the page to RGBA bytes,
  returned as base64 and turned into a `Uint8Array` in node.
- `shoot(page, item: View | Rig, rigState: 'on' | 'off' | null, boot: Boot): Promise<ShotRaw>` - settle (with the rig
  spec when `rigState`), pin, aim, converge, assert `__app.loop.timeScale === 0` still (a `slowBeat` restore,
  gameState.ts:3304, would have unpinned: throw), `projectQuads(await matrix(page), item.regions, 960, 540)`, capture;
  `ms` per phase. A rig is shot as `shoot(.., 'on')` then `shoot(.., 'off')`: the second settle unpins, so on -> off is a
  full redo of steps 1-4 (C0 M1), never a toggle under the pin.
- `closeBoot(boot)` - closes the browser.
Old builds (A14): read everything that may be missing with `?.` / `??` (`reg.flickering`, `reg.sway`, `g.team`,
`world.lightBake`, `enemyMgr.torches`); `loop.timeScale`, `photoFreeze`, `photoCamera`, `hasTorch`, `torchOverride`,
`lightField.bodyLevel`, `lightLevel` exist from v4.60.1 (PLAN section 1, C0 "Verified").

## e2e-visual.mjs (timing skeleton)
`node scripts/e2e-visual.mjs <url> --time [--json <file>] [--png <dir>] [--only id,id] [--maps a,b] [--serial]`
- Export `parseArgs(argv: string[])` (pure) and run `main()` only when executed directly
  (`import.meta.url === pathToFileURL(process.argv[1]).href`), so the test can import `parseArgs`.
- `main` loads `./visual-gate/viewpoints.mjs` with a DYNAMIC import (absent on your branch; present after the lead
  merges group A) and runs Low and Epic in two browsers at once (`Promise.all` over PRESETS; `--serial` one after the
  other) (A7): per map (order warehouse, warehouseOps, ctcourse, campusOps): `bootMap`, every view `shoot`, every rig
  `shoot` on then off, and at Epic a timing-only card render per parity point (`world.addLightProbe(x, y, z, 1, 0, 0)`
  as e2e-darkness.mjs:105, camera 0.8 m along +x from the card looking at it, converge, capture, dispose; the real card
  direction search is VG5's); `closeBoot`. A thrown harness error is recorded per shot and the run goes on.
- `--png <dir>`: writes every capture's PNG as `<dir>/<id>[-on|-off]@<preset>.png` (the lead eyeballs VG3's framing).
- Prints a markdown table (map x preset: boot ms, views, rig shots, cards, mean / max settle, converge, capture ms,
  converge failures, errors) plus per-browser totals and the wall time; `--json` writes all timings and SettleResults
  (no pixels) with `{ sha?, renderer, chrome, wallMs, rows }` (mkdir -p the file's folder). Exit 1 if any error.
- No metrics, baselines, rules, parity checks or report block (VG5).

## Unit tests (`tests/visualGateHarness.test.ts`, vitest, node env)
```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { mapQuery, settleTarget, gridMeans, gridDelta, isConverged, projectPoint, projectQuads, VIEWPORT,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/harness.mjs';
// @ts-expect-error plain .mjs process script without types
import { parseArgs } from '../scripts/e2e-visual.mjs';
```
- mapQuery: `{ query: 'autostart=warehouse&mode=clear' }`, 'low' -> `autostart=warehouse&mode=clear&gfx=low&weather=clear`;
  with extra `falloff=photo` appended; empty extra adds nothing.
- settleTarget: (0) 0.3; (40) 41/60; minSimS respected.
- gridMeans: flat RGBA grey 128 -> every cell 128/255 (within 1e-9); a left-half white image with cols 2 -> [1, 0] row
  pattern; cell count cols x rows.
- gridDelta / isConverged: [0.01, 0.003, 0.002, 0.001] converged (need 3, tol 0.004); [0.003, 0.005, 0.001] not.
- projectPoint / projectQuads: build a row-vector view x perspective matrix in the test (camera at origin looking down
  +z, fov 90 deg, aspect 16:9, Babylon LH convention): a point on the axis lands at (480, 270); a point at +x lands right
  of centre, +y above (smaller y); a point behind the camera has w <= 0 and its quad is `behind`.
- parseArgs: url, `--time`, `--json f`, `--png d`, `--only a,b` -> ['a', 'b'], `--maps`, `--serial`.
- Static guard: the text of `scripts/visual-gate/harness.mjs` and `scripts/e2e-visual.mjs` (fs.readFileSync) contains no
  `@babylonjs` and no `/src/` import; `harness.mjs` has no top-level `import ... from '../e2e-lib.mjs'` (lazy only);
  the text contains `timeScale = 0` and no `shotPin`.

## Acceptance (run all; paste outputs in the report)
- `npx vitest run tests/visualGateHarness.test.ts --maxWorkers=2` all pass.
- `npm run typecheck:fast` clean; `npx eslint tests/visualGateHarness.test.ts` clean; `node --check` both scripts.
- `git diff --stat origin/feature/visual-gate -- src` is empty (zero src diff).
- No e2e, no GPU, no build, no `npm run check`, no full `vitest run`. Single vitest files only, `--maxWorkers=2`. You do
  NOT run the harness against a browser. Any GPU / timing run (M0) is requested via the laptop queue by the LEAD, not
  you: write the request command into the report, exactly (PLAN section 7):
  `node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-m0 --requester "Night Shift | Sector Ops Build" --note "visual-gate M0" --step "git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --time --json C:/NightShift/scratch/visual-gate/m0/m0.json --png C:/NightShift/scratch/visual-gate/m0/png"`
  Check the step line's pieces locally WITHOUT a browser and say so in the report: `git archive HEAD scripts/visual-gate
  | tar -xf - -C <scratch dir>` works in `cmd.exe` (the service runs steps with `shell: true`, service.mjs:474-480), and
  `scripts/laptop-queue/serve.mjs` passes the trailing arguments to the script (read it at origin/master).

## Report `docs/visual-gate/checks/vg2-build.md`
Built (functions, deviations from this brief and why), the pin order as implemented (step by step, with the page
fields used), the old-build `?.` list, test results, the M0 request command, the local step-line check, files touched,
open items (anything VG5 must know). Final message: done / not done, test results, open items (short).
