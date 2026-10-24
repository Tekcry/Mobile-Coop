# visual-gate - plan

Read BRIEF.md first (ask, limits, A1-A14). Order: this plan -> C0 one fresh Opus checker on the plan -> group A in
parallel -> group B in parallel -> group C (bootstrap, red / green proofs) -> VG8 calibration -> C1 checker -> PR.

## 1. What exists to reuse (file:line)
- Boot + pin + read pixels: `scripts/e2e-darkness.mjs` - `launch({ url, params, viewport })` (:262), `photoFreeze(true)`
  + `body.photo-mode` + rigs hidden (:269-277), guards frozen and parked (`e.update = () => e.prevPos.copyFrom(e.pos)`,
  :217-224), flicker pinned for a sync search (:31-33), grey card `World.addLightProbe` + `photoCamera()` (:103-114),
  convergence (`scene.isReady()` then 30 frames then reads until 3 agree within 0.5%, max 8 s, :115-131), screenshot ->
  decode in page -> Rec. 709 luma (:133-145), probe search over the field (`levelAt`, `lampAt`, `moonAt`, :25-100).
- Views: `scripts/shots-ctcourse.mjs` (Marlow `SHOT_VANTAGES` via the SSR loader, meter vs `lightField.bodyLevel`
  within 0.02, :62-75), `scripts/campus-art-shots.mjs` (35 campus views :24-63, query :20), `scripts/sector-lights-shots.mjs`
  (Sector Ops, Marlow and Warehouse views in one run, :40-69), `scripts/lamps-shots.mjs` (:17-26).
- Map queries: Marlow `autostart=ctcourse&mode=course`; campus `autostart=campusOps&mode=sector&sectorGuards=0`;
  Sector Ops `autostart=warehouseOps&mode=sector&sectorGuards=N`; Warehouse `autostart=warehouse&mode=clear`.
  `?gfx=` pins the governor off (graphics-quality.md:37, :56-57); `?weather=clear` (src/core/flags.ts:116).
- Parity targets: `src/world/darkCurve.ts:86-91` DARK_TARGETS, `bandOf` :126-128 (LIGHT.shadow 0.28, LIGHT.lit 0.6;
  bible L5 design-bible.md:255-266, L7 :270-271).
- Torches: `Enemy.torchOverride` (src/ai/enemy.ts:1880-1882, since v4.34.0) forces a guard's torch on / off.
- Photo mode stops `frameUpdate` only (src/game/gameState.ts:2507); `fixedUpdate` (:1808) still runs flicker / sway
  (:1640-1642), guards and the clock: hence the `shotPin` hook (VG2).
- Train runs: `scripts/laptop-queue/service.mjs` `runTrain` (:618-695; shards on 4189 + 4192, `E2E_GPU=1`, `e2e()`
  :543, `finish()` :597, `postStatus`, `postComment` :141); statuses `laptop-e2e/<set>` (lib.mjs:26-35).
  Suite lists: `scripts/run-e2e.mjs:30-40` (GPU list :37 = e2e-darkness, e2e-desktop:3, e2e-coop-gpu).
- Data-branch writes with git plumbing (temp index, no checkout): `scripts/laptop-queue/request.mjs:63-100`.
- Timings known: e2e-darkness whole suite 11-12 s on the laptop GPU (docs/vol-cone-fix/NOTE.md:37), so a Warehouse boot
  is <= ~6 s. No logged boot or per-view times for Marlow / campus / Sector Ops: ESTIMATED below, M0 measures.

## 2. Targets: metric that catches each, bad vs fixed build
| # | View(s) | Preset | Metric (region) | Rule idea | Bad -> fixed (proof slice) |
| --- | --- | --- | --- | --- | --- |
| F1 strip fog cones | so-s1-goods-in, so-s1-girder | Epic | haze: `veil` up, `contrast` down (upper) | veil <= X, contrast >= Y | v4.60.1 -> v4.61.0 (P6) |
| F2 bay floor black | so-s1-goods-in | Epic, Low | nearBlack (floor) | floor nearBlack <= X | v4.72.0 -> v4.88.0 (P6) |
| F4 hard arcs | so-s1-workshop | Epic | arc (wall) | arc <= X | v4.78.0 `falloff=photo` -> v4.88.0 (P5) |
| F5 torch through door | rig so-door, rig cp-door | Low, Epic | leak = on - off (door + wall quad) | leak.mean <= 0.004, p95 <= 0.02 | v4.82.0 -> v4.88.0 (P4) |
| F5b haze wedge | rig so-corner | Epic | leak (camera-side wall by the corner) | as F5; `known` until fixed | master stays red (P7) |
| F6 Marlow dark | m-* (9 views) + parity | Epic, Low | whole mean, nearBlack; field at readers | mean >= X, nearBlack <= Y per view | v4.82.0 `falloff=photo` -> v4.88.0 (P3) |
| F7 Low blotch | m-a3-lobby (north wall x 81-96, y 1.8-2.9) | Low | blotch (wall), arc (wall) | blotch <= X | v4.82.0 `falloff=photo&gfx=low` -> v4.88.0 (P2) |
| F8 campus fog | cp-s2-b, cp-s3-a, cp-s2-d | Epic | haze (upper) | veil <= X, contrast >= Y | v4.96.0 -> v4.97.0 (P1) |
X / Y are set in VG8 from the proof numbers: threshold at the geometric midpoint of bad and fixed, and >= 4 sigma
(VG7) from the fixed value; if the gap is under 4 sigma the metric is wrong for that target: VG8 reports it, no rule.
Sources: WALK-4.72-REPORT.md:30,33; WALK-4.82-REPORT.md:5,12; MORNING-WALK.md:37-39 (all on feature/menu);
docs/sector-redesign/checks/fog-triage.md; lr16-8-triage.md:65-87 (feature/sector-redesign-polish).

## 3. Viewpoints (A4; literal data in `scripts/visual-gate/viewpoints.mjs`)
- Marlow Yard (9, from SHOT_VANTAGES): m-a1-lounge (a1-lounge-door), m-a2-vantage, m-a3-lobby (F7), m-a4-aisle
  (a4-main-aisle-east), m-a5-kiosk, m-a6-kerb, m-a7-corridor, m-a8-vestibule, m-f-gallery (f-gallery-from-a1).
- Campus S1-S5 (10, from campus-art-shots ROWS): cp-s1-b, cp-s1-f, cp-s2-b (F8), cp-s2-d (F8), cp-s3-a (F8), cp-s3-c,
  cp-s4-a, cp-s4-e, cp-s5-a, cp-s5-d.
- Sector Ops / warehouseOps (5, from sector-lights-shots ROWS): so-s1-goods-in (F1, F2), so-s1-girder (F1),
  so-s1-workshop (F4), so-s2-aisle, so-s3-hall.
- Warehouse (2): wh-floods-dock, wh-flood-workshop.
- Torch rigs (2 shots each: torch on, torch off): so-door and cp-door (a guard 1.2 m behind a shut hinged door facing
  it, camera 2.2 m on the near side; F5), so-corner (a guard down a side corridor, the beam along it; camera on the
  main corridor facing the corner wall; F5b, `known`).
- Count: 26 views x 2 presets = 52 shots; rigs 3 x 2 states x 2 presets = 12; parity cards at Epic on 12 views
  (3 per map) = 12 more renders. 76 converged renders.
- Pinning (A6) per view: teleport the player to `feet`, `team?.end?.(true)`, `vision.set('off')`, `shotPin(true)`
  (fallback: freeze guards as e2e-darkness, flicker NONE via `setFlicker(id, 0)` where it exists), `photoFreeze(true)`,
  `photo-mode`, player and guard rigs hidden, guards parked 40 m under the map except a rig's guard, all
  `torchOverride = false` except the rig's, `photoCamera()` at `cam` looking at `target`, wait `isReady`, converge.

### Data format (fixed now so VG1-VG4 run in parallel)
```js
// scripts/visual-gate/viewpoints.mjs
export const MAPS = { ctcourse: { query: 'autostart=ctcourse&mode=course' }, campusOps: {...}, warehouseOps: {...}, warehouse: {...} };
export const PRESETS = ['low', 'epic'];
export const VIEWS = [{
  id: 'm-a3-lobby', map: 'ctcourse', feet: [x, y, z], cam: [x, y, z], target: [x, y, z],
  regions: { wall: [[x,y,z],[x,y,z],[x,y,z],[x,y,z]], upper: [...4], floor: [...4] }, // world quads; 'whole' implicit
  metrics: { wall: ['blotch', 'arc'], upper: ['haze'], floor: ['stats'] },            // whole always gets stats
  rules: { 'wall.blotch': { max: null, presets: ['low'] } },                           // null until VG8
  parity: [[x, y, z], ...] | null,     // card points, Epic only
  targets: ['F7'], known: null,        // or 'F5b lr16-8-triage.md:65'
}];
export const RIGS = [{ id: 'so-door', map: 'warehouseOps', guard: { pos: [x,y,z], yaw }, cam, target,
  regions: { leak: [...4] }, rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } }, targets: ['F5'], known: null }];
```
Shot result (one per view x preset; rigs add `leak`):
`{ key: 'm-a3-lobby@low', whole: Stats, regions: { wall: { ...Stats, blotch, arc }, upper: { ...Stats, veil, contrast } },
meter, field, parity: [{ p, level, luma, band, min, max, ok, skip }], ms }` with
`Stats = { n, mean, p5, p50, p95, nearBlack, hist: number[32] }` (luma 0..1).

## 4. Metrics (VG1; `scripts/visual-gate/metrics.mjs`, plain ESM, no Babylon, no DOM)
Input: `{ w, h, luma: Uint8Array }` (Rec. 709 from sRGB bytes) and a `Uint8Array` mask (0/1).
- `lumaFromRgba(rgba, w, h)`, `maskFromPolygon(w, h, pts2d)` (scanline fill; off-screen points clipped), `erode(mask, r)`.
- `stats(img, mask)`: n, mean, p5, p50, p95, `nearBlack` = share <= 0.04 (bible L5 dark target; 10/255), 32-bin hist.
- `emd(histA, histB)`: 1-D earth mover's distance on normalised histograms (0..1).
- `haze(img, mask)`: `veil` = p5 (lifted blacks), `contrast` = mean |Laplacian| of a 3 px box blur / (mean + 0.03).
  A fog veil raises veil and lowers contrast.
- `blotch(img, mask)`: std of (box blur r 3 - box blur r 24) over the mask eroded by 24 px, / (mean + 0.03): mid-frequency
  lumps (lobes, toothed bands) on a wall that should be smooth; fine texture and the big falloff both cancel.
- `arc(img, mask)`: Sobel magnitude of a 2 px blur; `arc` = share of mask pixels whose gradient > max(6/255, 4 x the
  mask's median gradient) and that sit in a run of >= 12 such pixels along the gradient's normal (a ridge, not noise).
- `leak(on, off, mask)`: per pixel max(0, on - off); mean and p95.
- `parityRange(level)`: the DARK_TARGETS min / max interpolated piecewise-linearly on level, +-0.02; `skip` when level is
  within 0.03 of 0.28 or 0.6 (band edges). A test asserts the mirror equals `src/world/darkCurve.ts` DARK_TARGETS.
- `compare(base, cur, tol)` -> flags `[{ key, metric, base, cur, delta, tol }]`; `checkRules(item, cur)` -> flags.
Spec tolerance floors (A13; final = max(floor, 4 x spread)): whole / region mean |d| >= 0.03 and >= 20% relative;
nearBlack |d| >= 0.08; emd >= 0.03; veil d >= 0.02; contrast drop >= 25%; blotch x1.4 and +0.02; arc x1.5 and +0.01;
leak absolute rules only; parity: any non-skipped card outside its range.
Tests (`tests/visualGateMetrics.test.ts`, synthetic images built in the test): flat grey (blotch ~0, arc 0, veil =
grey); linear ramp (blotch ~0: large-scale falloff cancels); ramp + 40 px lumps (blotch up); a fog overlay (veil up,
contrast down); a hard-edged circle on flat (arc > 0) vs a smoothstep-feathered one (arc ~0); noise only (arc ~0);
on / off pair with a lit patch (leak); histogram / emd identities; mask fill of a rotated quad; parityRange at the 4
table levels and the skip edges; compare / checkRules on hand-made results.

## 5. Baselines (VG4; data branch `visual-baselines`, orphan, written with git plumbing like request.mjs)
- `runs/<sha>/result.json`: { sha, version, train, branch, at, renderer, chrome, viewport, verdict (green | flagged |
  error), shots[], rigs[], parity[], flags[], ms }. Written by train runs (`--record`), never by PR runs.
- `runs/<sha>/thumbs/<key>.webp` (320 px): flagged shots and the matching baseline shot only (A11). All thumbs of every
  run stay in laptop scratch `C:/NightShift/scratch/visual-gate/<sha>/` (pruned after 60 days).
- `accepted/<version>.json`: { sha, version, by, why, at, only: null | [keys] }.
- `storeLib.pickBaseline(records, { isAncestor, renderer, version })` (pure): per key, the newest (by semver below the
  current version) of an accepted record covering the key or a green run whose sha is an ancestor of origin/master,
  same renderer (A8). No baseline -> the shot reports `new`, never flags.
- CLI `node scripts/visual-gate/baseline.mjs list | show <sha> | accept --sha <sha> --by <name> --why <text> [--only k,k]`
  (A9). `accept` refuses a run that is not recorded or an empty `--why`.
- First baseline: VG7 records master 4.97.x and the orchestrator accepts it as "initial" (F5b known).

## 6. Train wiring (VG6)
- Suite `e2e-visual` (`scripts/e2e-visual.mjs`) joins the GPU list in `scripts/run-e2e.mjs:37`, so `npm run e2e:gpu`
  and `request.mjs --sha <head> --suites e2e-visual --set visual` work for any PR that touches rendering
  (status `laptop-e2e/visual`).
- `runTrain` (laptop worker only; the desktop skips with status "skipped: desktop"), after `finish()`: if the train
  head has `scripts/e2e-visual.mjs`, run it on `ports[0]` (4189, `E2E_GPU=1`, `VG_RECORD=1`, `VG_TRAIN=<n>`, timeout
  300 s) through the existing `e2e()` helper. The suite prints one block between `VISUAL-GATE BEGIN` / `VISUAL-GATE END`
  (markdown: verdict line, baseline version and approver, flags table key | metric | base | now | tol, KNOWN lines,
  parity misses, wall time). Pure `visualVerdict(text)` in lib.mjs reads it ->
  status context `visual-gate`: success "clean: 64 shots vs 4.97.0, 152 s", failure "3 flags: m-a3-lobby@low blotch
  ...", error "no result / over 300 s"; on failure a PR comment with the block (capTail 8000) and thumb links
  (`https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines/runs/<sha>/thumbs/<key>.webp`).
- auto-train ignores `visual-gate` (A1). The orchestrator's cron reads it; a flag goes to the job that owns the change
  (fix) or to Michael / the orchestrator (accept, A9).
- Deploy: the service runs from the laptop's own checkout; after the merge Test Runner restarts
  `NightShift-laptop-queue` (docs/laptop-queue).

## 7. Runtime budget (ESTIMATED, M0 in VG2 replaces it)
Two browsers (Low | Epic) at once (A7), each: 4 boots (Warehouse ~6 s measured-ish, Sector Ops ~10, Marlow ~15,
campus ~20 est.) ~51 s + 38 renders x ~1.5 s ~57 s; Epic adds 12 parity renders ~18 s -> ~126 s; GPU sharing x1.2
~150 s; serve + metrics + record ~10 s. **~160 s per train (estimate)**. If M0 is over 180 s: A7's in-page preset
switch (-4 boots, ~-40 s), then drop to 1 parity view per map, then trim campus to 1 view per section.

## 8. Slices
Owner model: Opus = metrics, engine hook, gate runner, train wiring, calibration, checkers; Sonnet = data, store tooling,
runs from strict briefs; Haiku = chores. Every slice: the preamble (`docs/systems/agent-preamble.md`), branch guard,
owned files only, `npx vitest run <its test files>` + `npm run typecheck:fast`; GPU runs only through the laptop queue
(`request.mjs --alone --step ...` on the pushed sha, port 4189).

| Slice | Model | Group | Owns (only these files) | Acceptance |
| --- | --- | --- | --- | --- |
| C0 plan check | Opus (fresh) | 0 | `docs/visual-gate/checks/C0.md` | PASS / list of plan fixes; lead applies them |
| VG1 metrics | Opus | A | `scripts/visual-gate/metrics.mjs`, `tests/visualGateMetrics.test.ts` | section 4 API; all synthetic tests pass; no Babylon / DOM import |
| VG2 pin hook + harness + M0 | Opus | A | `src/game/gameState.ts` (`shotPin` only, inert by default), `scripts/visual-gate/harness.mjs`, `scripts/e2e-visual.mjs` (skeleton, `--time`), `tests/shotPin.test.ts` if a pure part exists | `shotPin(true)` stops sim time, flicker, sway, guards, doors; old-build fallback; M0 laptop run on master prints boot / converge / capture ms per map and preset; runtime table in `docs/visual-gate/M0.md` |
| VG3 viewpoints | Sonnet | A | `scripts/visual-gate/viewpoints.mjs`, `tests/visualGateViewpoints.test.ts` | section 3 list and format; coords copied with source file:line comments; regions as world quads from the map files (walls, ceilings); rigs placed at a real shut door / corner (map file:line); shape test: unique ids, 4-point quads, known maps, F1-F8 each covered |
| VG4 store + baseline CLI | Sonnet | A | `scripts/visual-gate/storeLib.mjs`, `store.mjs`, `baseline.mjs`, `tests/visualGateStore.test.ts` | section 5; pickBaseline tests (accepted vs green, ancestor, renderer, `only`, no baseline); `--dry-run` prints the commit, pushes nothing |
| VG5 gate runner | Opus | B (after A) | `scripts/e2e-visual.mjs`, `scripts/run-e2e.mjs` (GPU list line), `docs/systems/testing-tools.md` (one entry) | views x presets in 2 browsers, rigs, parity grid + meter = field (0.02), rules, compare vs baseline, report block, `VG_RECORD`, `--only`, `--extra <params>` (proof flags), `--url` or self-serve dist; exit 1 on flags; laptop run on master green or flags explained; <= 180 s |
| VG6 train wiring | Opus | B (parallel to VG5) | `scripts/laptop-queue/service.mjs`, `scripts/laptop-queue/lib.mjs`, `tests/laptop-queue.test.ts`, `docs/systems/auto-train.md`, `docs/laptop-queue/` note | `visualVerdict` tests on sample blocks (clean, flagged, KNOWN only, missing, over time); runTrain post-step behind "head has the script"; desktop skip; dry run of the service passes |
| VG7 noise + bootstrap | Sonnet | C | `scripts/visual-gate/tolerances.mjs`, `docs/visual-gate/VG7.md` | 3 laptop runs on master; per key and metric spread; tolerances = max(floor, 4 x spread); record run; orchestrator accepts "initial" |
| P1 F8 campus fog | Sonnet | C (parallel) | `docs/visual-gate/proofs/P1.md` | gate `--only cp-s2-b,cp-s2-d,cp-s3-a` at v4.96.0 and v4.97.0: numbers table |
| P2 F7 Low blotch | Sonnet | C | `proofs/P2.md` | `--only m-a3-lobby --extra falloff=photo` at v4.82.0 (Low) vs v4.88.0 |
| P3 F6 Marlow dark | Sonnet | C | `proofs/P3.md` | Marlow views + parity at v4.82.0 `falloff=photo` vs v4.88.0 (coords checked on 4.82; overrides noted) |
| P4 F5 torch leak | Sonnet | C | `proofs/P4.md` | rigs so-door, cp-door at v4.82.0 vs v4.88.0, Low and Epic |
| P5 F4 arcs | Sonnet | C | `proofs/P5.md` | so-s1-workshop at v4.78.0 `falloff=photo` vs v4.88.0 |
| P6 F1 / F2 | Sonnet | C | `proofs/P6.md` | so-s1-goods-in, so-s1-girder at v4.60.1 vs v4.61.0 (F1) and v4.72.0 vs v4.88.0 (F2) |
| P7 F5b | Sonnet | C | `proofs/P7.md` | rig so-corner on master: red, kept `known` |
| VG8 calibrate rules | Opus | D (after C) | `scripts/visual-gate/viewpoints.mjs` (`rules`, `known` only), `docs/visual-gate/RULES.md` | each rule's threshold with its bad / fixed / sigma numbers; one laptop request reruns all pairs: every Fn red on bad, green on fixed |
| C1 checker | Opus (fresh) | E | `docs/visual-gate/checks/C1.md` | reads the diff and the proof table; PASS / one fix round |
| VG9 chores | Haiku | E | `changes/feature-visual-gate.md`, `TESTING.md` line, docs index line in CLAUDE.md "Doc index" if one exists for jobs | fragment + lines only |

Parallel safety: group A slices own disjoint files; VG5 and VG6 disjoint; P1-P7 only write their own proof docs and run
on the laptop queue (one alone request each; they queue serially there, so start them together and let the queue
order them); VG8 is the only later writer of viewpoints.mjs. The lead commits; agents never commit.
Proof mechanics (P1-P7): one `request.mjs --alone` per pair, steps: checkout the bad sha into the slot, `npm ci` if
the lockfile differs, `npm run build`, copy `scripts/e2e-visual.mjs` + `scripts/visual-gate/` from
`origin/feature/visual-gate` untracked, run with `--only ... --extra ... --no-record --json <file>`; then the fixed sha.

## 9. Questions for Michael (ask later, native multiple choice; defaults stand meanwhile)
1. When the picture check flags a train: release anyway and report (A1, default), or hold the release until fixed or
   accepted?
2. Who may accept a deliberate look change: the orchestrator when the job's brief names the look change (A9, default),
   or only you?
3. Presets: Low and Epic only (default), or add Medium (where volumetric haze and torch shadows first change)?
