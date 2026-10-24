# VG5 - the gate runner (Opus builder; zero src diff)

Job visual-gate, group B (parallel with VG6). Lead: Night Shift | Sector Ops Build. VG5 turns the VG2 timing skeleton
`scripts/e2e-visual.mjs` into the gate: shoot every viewpoint (VG3) with the harness (VG2), measure each shot (VG1),
compare it with its VG4 baseline, apply the absolute rules and the L5 parity grid, print one verdict block, write a
RunRecord, record it on train runs, and exit 0 / 1 / 3.

## Where
- Branch `feature/visual-gate-vg5`, cut from the pushed `feature/visual-gate` head once VG3 is merged (the gate needs
  `scripts/visual-gate/viewpoints.mjs`; the unit tests never import it, so the build may start earlier on the
  7a235867 head if the lead says so). Worktree `C:/NightShift/Mobile-Coop-visual-gate-vg5`, or a cloud builder from
  `briefs/visual-gate-vg5.md` on cloud-queue (the lead picks; desktop C: is short). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-vg5 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-vg5 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-vg5"`
- Worktree mode: never commit, push, stash, reset or checkout (the lead commits). Cloud mode: commit and push this
  branch only.
- Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Hard rules"; `docs/visual-gate/BRIEF.md` (A1, A2, A6-A11,
  A13, A15, A17-A23), `PLAN.md` sections 2-5 and 7 (:60-176); `briefs/VG1.md`, `VG2.md`, `VG3.md`, `VG4.md` "Contract"
  blocks; the polish this slice owns: `checks/vg1-check.md` polish 2-4, `checks/vg2-check.md` polish 2-4 (and
  `checks/vg2-build.md` "Fix round", polish left for VG5), `checks/vg4-build.md` "Open items". Reused code at
  origin/master: `git show origin/master:scripts/e2e-darkness.mjs` (`findProbes` :25-92, `measure` :95-128,
  `readLuma` :130-146).

## Files (only these)
- create `scripts/visual-gate/gate.mjs` (pure scoring: no `node:` imports, no fs, no git, no page)
- create `tests/visualGateGate.test.ts`
- edit `scripts/e2e-visual.mjs` (the gate mode; the `--time` mode stays as it is for M0)
- edit `scripts/visual-gate/harness.mjs` (additions below; the Contract block changes only on the `SettleResult` line)
- edit `tests/visualGateHarness.test.ts` (only the `e2e-visual parseArgs` describe, :317-334, for the new flags, plus
  tests for the new pure harness helpers if any)
- edit `scripts/run-e2e.mjs` :36-37 only (`GPU` gets `'e2e-visual'`, the comment line names it)
- edit `docs/systems/testing-tools.md`: one `e2e-visual` entry right after the `e2e-darkness` entry (:155-160)
- create `docs/visual-gate/checks/vg5-build.md` (your report)
Do NOT touch: anything under `src/`, `viewpoints.mjs` (VG3, later VG8), `metrics.mjs` (VG1), `storeLib.mjs` /
`store.mjs` / `baseline.mjs` (VG4), `tolerances.mjs` (VG7 creates it), `scripts/laptop-queue/*` (VG6), `package.json`,
other docs. No new dependency. Zero src diff.

## Contract (copy verbatim to the top of gate.mjs; VG6 reads the summary JSON, VG7 / VG8 / P1-P7 read the result JSON)
```js
/** @typedef {[number, number, number]} Vec3 */
/** @typedef {import('./metrics.mjs').ShotMetrics} ShotMetrics */
/** @typedef {import('./metrics.mjs').MetricName} MetricName */
/** @typedef {import('./metrics.mjs').Flag} Flag */
/** @typedef {import('./metrics.mjs').Tolerances} Tolerances */
/** @typedef {import('./metrics.mjs').Mask} Mask */
/** @typedef {import('./harness.mjs').Projection} Projection */
/** @typedef {import('./storeLib.mjs').RunRecord} RunRecord */
/** @typedef {import('./storeLib.mjs').BaselinePick} BaselinePick */
/** @typedef {{ stage: unknown, reinforced: number | null }} AlarmState */
/** @typedef {{ before: AlarmState, after: AlarmState, raised: boolean }} AlarmDelta */
/** @typedef {{ region: string, why: 'behind' | 'small' | 'blotch-small' }} RegionSkip */
/**
 * One measured shot: RunRecord.shots (views) / .rigs (rig on / off). Key = storeLib.shotKey(id, preset, rigState).
 * metrics null when the shot threw (error set). Numbers rounded to 5 decimals.
 * @typedef {{ key: string, id: string, map: string, preset: 'low' | 'epic', rigState: 'on' | 'off' | null,
 *   metrics: ShotMetrics | null, skips: RegionSkip[],
 *   settle: { meter: number, field: number, simS: number, guards: number, flickering: number, alarm: AlarmDelta | null } | null,
 *   converged: boolean, aimReady: boolean, error: string | null, ms: number }} ShotRecord
 */
/**
 * One L5 parity row: a grey card (kind 'card', Epic only) or a view's meter vs light field (kind 'meter', every view
 * and preset). id: `card-<view id>-<k>` (k from 1) / `meter-<view id>@<preset>`. ok true when skipped.
 * @typedef {{ kind: 'card' | 'meter', id: string, map: string, view: string, at: Vec3 | null, level: number | null,
 *   luma: number | null, meter: number | null, field: number | null, min: number | null, max: number | null,
 *   ok: boolean, skip: null | 'edge' | 'no-camera' | 'flicker' | 'error', note: string | null }} ParityRow
 */
/**
 * The block's machine line (`<!-- visual-gate-summary <json> -->`, line 2 of the block). VG6 reads only this.
 * flags = non-known flags (drift + rule); parity = misses (ok false); top = up to 3 of `<key> <region>.<metric>` then
 * `<parity id> parity`; base = the newest baseline version among the picks and the approver of an accepted pick of it.
 * @typedef {{ v: 1, verdict: 'clean' | 'flagged' | 'error', sha: string | null, version: string, train: number | null,
 *   renderer: string, shots: number, flags: number, known: number, parity: number, newKeys: number, warnings: number,
 *   errors: number, base: { version: string, approver: string | null } | null, wallS: number, reason: string | null,
 *   top: string[], recorded: boolean, thumbs: string[] }} VisualSummary
 */
```
Block format (stdout, exactly these marker lines, nothing else of the gate's output between them):
```
VISUAL-GATE BEGIN
<!-- visual-gate-summary {"v":1,...} -->
### visual-gate: <clean | N flags | error: reason> on <sha8> (<version>[, train <n>])
baseline <version> (<approved by X | green release>), renderer <r>, <shots> shots, wall <s> s (low <s> s, epic <s> s)
| key | region | metric | base | now | tol | kind |     (non-known flags; 4 decimals, '-' for null; max 40 rows, then "... N more")
KNOWN <key> <region>.<metric> <now> vs <tol> (<known>)          one line each
KNOWN PASSES <id>: <known> - remove `known` (A10)               when every calibrated rule of a known item passed
PARITY <id> level <l> luma <y> range <min>-<max>                 one line per card miss; meter misses: meter <m> field <f>
NEW <n> key(s) without a baseline: <first 10 keys>
SKIPPED <key> <rule> (<why>)                                     calibrated rules not evaluated
WARN <text>                                                      one line each
ERROR <text>                                                     one line each
VISUAL-GATE END
```

## Rules (numbers)
- Regions (VG1 polish 3 and 4): a region is skipped `behind` when its Projection is behind; `small` when its mask has
  < 1500 px (`MIN_REGION_PX`) on screen; `blotch` is dropped (`blotch-small`) when `erode(mask, 24)` keeps < 400 px
  (`MIN_BLOTCH_PX`), never computed and trusted as 0. Before `compare`, both sides lose regions with n < 1500
  (`stripThin`), so no `hist` emd is taken against an empty region.
- Rules: `checkRules` on every view shot and on a rig's `on` shot (its `leak.mean` / `leak.p95`); never on the `off`
  shot. A calibrated rule (non-null min or max, preset listed or no `presets`) whose region / metric is missing is
  listed SKIPPED with the why (behind, small, blotch-small, leak region missing) and counted as a warning, not a flag.
- `lintRules` (VG1 polish 2): an item with target F1 or F8 whose `upper.veil` has a bound while `upper.contrast` has
  none prints `WARN <id>: F1/F8 rule on veil alone; veil (p5) misses partial beams, add upper.contrast`.
- Leak: `leak(onLuma, offLuma, mask of the on shot's 'leak' Projection)` (same camera both states).
- Drift: `compare(key, stripThin(base.metrics), stripThin(cur.metrics), tolFor(key, TOLERANCES))`. Tolerances: when
  `scripts/visual-gate/tolerances.mjs` exists (VG7) it exports `TOLERANCES: Record<string, Partial<Tolerances>>` keyed
  by shot key; each field = max(FLOORS field, override) (A13: the floor always holds); absent file -> FLOORS (C0 P8).
  Load it with a dynamic import inside try / catch.
- Baseline (A8, A18): `fetchStore()`, `readRecords()`, `pickBaseline(records, { isAncestor: isAncestorFn(), renderer,
  version: cutoff })` with cutoff = `--version`, else the package.json version when `VG_TRAIN` is set, else the next
  patch of the package.json version (a PR or proof run compares with its own base release). A key without a pick is
  `new` (listed, never a flag).
- Parity (A2, A15, A22): per view and preset, `meter-<id>@<preset>`: miss when |meter - field| > 0.02 from the same
  settle; when the settle saw flickering lights (`flickering > 0`) a miss is `skip: 'flicker'` plus a WARN, not a miss
  (VG2 polish 3). Cards, Epic only: per view with `parity`, a fresh `settle(view.feet)` and `pin` first (VG2 polish 4),
  then per point: `cardSpot` (e2e-darkness's direction rule at that point), probe, aim, converge, capture, card luma =
  mean of the centre 10 x 10 px (`CARD_PATCH`), card level = `lightField.levelAt(x, y, z)` read AFTER the pin (flicker
  1, the same state as the image); `parityRange(level)`: `skip` -> `skip: 'edge'`; no camera spot -> `skip:
  'no-camera'` + WARN; otherwise miss when luma is outside min..max. `--cards <n>` keeps the first n points per map
  (the PLAN 7 ladder knob; default all).
- Alarm (VG2 polish 2): `settle` records `{ stage: g.mode?.run?.alarm, reinforced: g.mode?.reinforced }` before and
  after; `raised` when either changed. A raised alarm is a WARN on that shot.
- Converge `ok: false` or `aimReady: false`: the shot is scored as usual and gets a WARN (`unsteady` / `scene not ready`).
- Verdict (A21), first match: **error** when any shot or card threw, a boot failed, the two browsers report different
  renderers, no pick at all for the renderer (`no baseline for renderer <r>`, C0 P10; not under `--rules-only`), or the
  deadline stopped shots (`over budget: N shots not run`); **flagged** when any non-known flag or any parity miss;
  else **clean**. Error keeps the flags listed. Exit: clean 0, flagged 1, usage 2, error 3 (`EXIT`).
- Deadline: `--deadline <s>` or `VG_DEADLINE_S`, default 285 (the train step kills at 300 s, A12 / PLAN 6): checked
  before every shot in both browsers; past it no new shot starts, the rest are listed as not run.
- Known (A10): flags with `known` set print as KNOWN and never count; `KNOWN PASSES` when an item with `known` had at
  least one calibrated rule evaluated and none flagged.
- Record (A8, A11, A23): when `--record` or `VG_RECORD=1`, not `--no-record`, sha is 40 hex, no `--only` / `--maps` /
  `--extra` (a partial or proof run never becomes a baseline), and at least one shot measured: `recordRun(rec,
  thumbs)` with `rec` = `runRecord(...)` (verdict clean -> `green`; error runs are recorded too, A8 keeps them out
  unless accepted). Thumbs pushed: for every non-known flagged key its 320 px webp as `<key>` and, when the baseline
  run's scratch thumb exists, `<key>.base`. A failed record is a WARN (`record failed: ...`), never a verdict change.
  `recorded` and `thumbs` in the summary say what landed.
- Scratch (A11): `--scratch <dir>` or `VG_SCRATCH`, default `C:/NightShift/scratch/visual-gate` on win32, else
  `<os.tmpdir()>/visual-gate`; per run `<scratch>/<40-hex sha>/result.json` (RunRecord + summary + parity + warnings)
  and `thumbs/<key>.webp` for every shot. Prune at the end: dirs under scratch whose name is 40 hex and whose mtime is
  over 60 days old (no other dir is ever removed: m0/, proofs/ stay).

## gate.mjs (pure, all exported, exact names)
Constants: `MIN_REGION_PX = 1500`, `MIN_BLOTCH_PX = 400`, `BLOTCH_ERODE = 24`, `METER_TOL = 0.02`, `CARD_PATCH = 10`,
`DEADLINE_S = 285`, `EXIT = { clean: 0, flagged: 1, usage: 2, error: 3 }`. Imports only `./metrics.mjs` and
`./storeLib.mjs` (both pure).
- `planMasks(projections: Record<string, Projection>, want: Record<string, MetricName[]>, w, h): { masks: Record<string, Mask>, want: Record<string, MetricName[]>, skips: RegionSkip[] }`
- `cardLuma(img: LumaImage, size = CARD_PATCH): number` - centre patch `x0 = floor(w / 2) - size / 2` (e2e-darkness
  `readLuma` clip), mean 0..1.
- `tolFor(key, overrides = {}): Tolerances`; `stripThin(m: ShotMetrics): ShotMetrics`.
- `nextPatch(v)`, `baselineCutoff(pkgVersion, { train, override }): string` (A18).
- `skippedRules(key, item, metrics, preset, rigState): string[]`; `lintRules(items): string[]`.
- `scoreShot({ key, item, preset, rigState, metrics, base, tol }): { flags: Flag[], skipped: string[] }`.
- `cardCheck(level, luma): { min, max, ok, skip: null | 'edge' }`; `meterCheck(meter, field, flickering): { d, ok, skip: null | 'flicker' }`.
- `knownLines(items, flags): string[]` (KNOWN and KNOWN PASSES lines).
- `decide({ errors, flags, parity, picks, rulesOnly, renderers, notRun }): { verdict, reason }`.
- `topFlags(flags, parity, n = 3): string[]`.
- `scoreRun(raw, ctx)` - the whole scoring from measured shots (used by `main` and `--rescore`): raw = `{ shots, rigs,
  parity, errors, renderers, notRun, wallMs, browsers }`, ctx = `{ items: Record<string, View | Rig>, picks:
  Record<string, BaselinePick>, rulesOnly, tolerances, preset per shot from the record }` -> `{ flags, skipped,
  known, newKeys, warnings, verdict, reason }`.
- `summarize({ score, sha, version, train, renderer, picks, wallMs, recorded, thumbs }): VisualSummary`.
- `renderBlock(summary, score, details): string` - the block above, BEGIN to END inclusive.
- `runRecord({ sha, version, train, branch, at, renderer, chrome, verdict, shots, rigs, parity, flags, ms }): RunRecord`
  - must pass `validateRun`; rounded numbers.
- `shouldRecord({ record, noRecord, only, maps, extra, sha, measured }): { ok: boolean, why: string }`.
- `thumbsToPush(flags, picks, cur: (key) => Uint8Array | null, base: (sha, key) => Uint8Array | null): Record<string, Uint8Array>`.
- `round5(x)`, `roundMetrics(m)`.

## harness.mjs additions (page code self-contained as today; `?.` for old builds, A14)
- `settle`: the result gains `flickering` (`reg.flickering?.length ?? 0` at the read) and `alarm` (AlarmDelta; null
  when `g.mode` has neither field). Update the `SettleResult` Contract line to add `flickering: number, alarm: null |
  { before: { stage: unknown, reinforced: number | null }, after: { stage: unknown, reinforced: number | null },
  raised: boolean }`; nothing else in the Contract changes. Existing harness tests stay green.
- `thumb(page, png: Buffer, width = 320): Promise<Buffer | null>` - decode in the page, draw scaled to `width` x
  `round(width * h / w)`, `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.8 })`; null when the blob
  type is not `image/webp` (WARN once).
- `cardSpot(page, at: Vec3): Promise<null | { dir: Vec3, cam: Vec3, light: 'lamp' | 'moon' | 'fill' }>` - called after
  the pin; e2e-darkness `findProbes` :52-83 at that one point: the strongest lamp by `f.lampAt(i, x, y, z)` over
  `w.lightBake?.lamps?.baked` (lights stride 10), the moon if stronger (`w.lightBake.moonLight * f.moonAt`, direction
  from `w.map.theme.sunDir` negated), else the first of 8 horizontal directions walkable at 0.4 and 0.8 m
  (`g.nav.cellOf`, `isWalkable`, |height| < 0.3); camera `at + dir x 0.8`, refused when its y > 2.2, its cell is not
  walkable or |levelAt(cam) - levelAt(at)| > 0.25; on refusal try the 8 horizontal directions; none -> null.
- `card(page, at: Vec3, spot): Promise<{ level: number, aimReady: boolean, converge: ConvergeResult, capture: Capture, ms: number }>`
  - `w.addLightProbe(x, y, z, ...spot.dir)`, `aim(page, spot.cam, at)`, `converge`, `capture`, `level =
  w.lightField.levelAt(x, y, z)`, dispose the probe in a `finally`.

## e2e-visual.mjs (the gate)
`node scripts/e2e-visual.mjs <url> [--json f] [--png d] [--only id,id] [--maps a,b] [--serial] [--extra <params>]
[--record | --no-record] [--rules-only] [--cards n] [--version x.y.z] [--deadline s] [--scratch d] [--rescore <result.json>]`;
`--time` keeps the VG2 timing mode unchanged. `parseArgs` returns the VG2 fields plus `extra: ''`, `record: false`,
`noRecord: false`, `rulesOnly: false`, `cards: null`, `version: null`, `deadline: null`, `scratch: null`, `rescore: null`
(update the two `toEqual` asserts in `tests/visualGateHarness.test.ts`; add one for the new flags; a bad number for
`--cards` / `--deadline` or a bad `--version` throws).
- Gate run (no `--time`): load `viewpoints.mjs` (as today); `lintRules`; Low and Epic in two browsers at once
  (`--serial` one after the other), maps in `MAP_ORDER`; per map `bootMap({ ..., extra })`, every view: `shoot` ->
  `lumaFromRgba` -> `planMasks(regions, view.metrics)` -> `measure` -> `thumb` -> ShotRecord + meter row; every rig:
  `shoot` on, `shoot` off, leak from the on shot's `leak` mask; at Epic the cards; `closeBoot` in a `finally`. Free each
  capture's RGBA once measured (keep the on luma until its off shot is done). A thrown shot: ShotRecord with `error`,
  the run goes on.
- Then: renderers (normalised: trimmed, inner whitespace collapsed), baseline picks (skipped under `--rules-only`),
  tolerances, `scoreRun`, sha (`VG_SHA`, else `git rev-parse HEAD`, 5 s), version (`package.json` in cwd), train
  (`VG_TRAIN` -> number), branch (`VG_BRANCH`, else `train/<n>` when a train, else ''), scratch result + thumbs,
  `--json` copy, record (rules above), print the block, prune scratch, exit `EXIT[verdict]`.
- `--rescore <result.json>`: no browser, no record: score a saved result (its shots, rigs and parity rows) against the
  current viewpoints rules and baseline (or `--rules-only`), print the block, exit by verdict (VG8 calibrates with it).
- run-e2e calls it as `node scripts/e2e-visual.mjs <url>` (no flags): that is the gate mode with record off unless
  `VG_RECORD=1` (the train step sets it, VG6).

## Unit tests (`tests/visualGateGate.test.ts`, vitest, node env; no browser, no git, no fs)
```ts
import { describe, expect, it } from 'vitest';
import { MIN_REGION_PX, MIN_BLOTCH_PX, METER_TOL, CARD_PATCH, EXIT, planMasks, cardLuma, tolFor, stripThin, nextPatch,
  baselineCutoff, skippedRules, lintRules, scoreShot, cardCheck, meterCheck, knownLines, decide, topFlags, scoreRun,
  summarize, renderBlock, runRecord, shouldRecord, thumbsToPush,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/gate.mjs';
// @ts-expect-error plain .mjs process script without types
import { FLOORS, measure, lumaFromRgba } from '../scripts/visual-gate/metrics.mjs';
// @ts-expect-error plain .mjs process script without types
import { validateRun } from '../scripts/visual-gate/storeLib.mjs';
```
Fixtures in the test (a View, a Rig, synthetic 960 x 540 images and projections, BaselinePicks; never viewpoints.mjs):
- planMasks: a behind quad -> skip 'behind'; a 30 x 30 px quad -> 'small'; a 60 x 40 px wall asking blotch -> blotch
  dropped, 'blotch-small', stats kept; a 200 x 150 px wall keeps blotch and arc.
- cardLuma: flat grey 128 -> 128/255; a 10 x 10 white centre on black -> 1.
- tolFor: no override -> FLOORS; override below a floor keeps the floor; above it wins.
- stripThin + scoreShot: a base region with n 0 against a normal one gives no `hist` flag; a mean drift of +0.05 on
  base 0.1 flags; rig `off` gets no rule flags; a rule on a missing region is SKIPPED only when calibrated.
- baselineCutoff: train -> pkg version; no train -> next patch; override wins; nextPatch('4.97.1') = '4.97.2'.
- lintRules: F8 view with veil max and contrast null -> one WARN; with both -> none.
- cardCheck: level 0.27 luma 0.12 -> miss (row 0-0.11); level 0.29 -> skip 'edge'; meterCheck: d 0.03 no flicker ->
  miss, with flicker -> skip 'flicker'; d 0.01 -> ok.
- knownLines: a known rig with a leak flag -> KNOWN line, flag not counted by decide; a known item with a calibrated
  rule and no flag -> KNOWN PASSES.
- decide: errors -> error; renderers ['a', 'b'] -> error 'renderer mismatch'; picks 0 -> error 'no baseline for
  renderer'; picks 0 with rulesOnly -> not error; notRun 3 -> error 'over budget: 3 shots not run'; a non-known flag ->
  flagged; a parity miss -> flagged; only known flags + skipped cards -> clean; error keeps flags.
- scoreRun -> summarize -> renderBlock: the block starts `VISUAL-GATE BEGIN`, line 2 parses as JSON with every
  VisualSummary key, ends `VISUAL-GATE END`; flagged top has at most 3 entries; 45 flags -> 40 rows + `... 5 more`.
- runRecord: passes `validateRun`; verdict clean -> 'green'; numbers rounded.
- shouldRecord: each refusal (`--no-record`, `--only`, `--maps`, `--extra`, short sha, nothing measured) and the ok case.
- thumbsToPush: a flagged key with a base thumb -> `k` and `k.base`; known flags and missing base thumbs skipped.
- Static guard: `gate.mjs` text has no `import ... from 'node:` and no `/src/`; `e2e-visual.mjs` has no `@babylonjs`.

## Acceptance (builder; paste outputs in the report)
- `npx vitest run tests/visualGateGate.test.ts --maxWorkers=2` and `npx vitest run tests/visualGateHarness.test.ts
  --maxWorkers=2` all pass; `tests/visualGateMetrics.test.ts` and `tests/visualGateStore.test.ts` still pass (single
  files, `--maxWorkers=2`).
- `npm run typecheck:fast` clean (or `npx tsc --noEmit -p tsconfig.json` when node_modules is shared, as VG2 / VG4);
  `npx eslint tests/visualGateGate.test.ts tests/visualGateHarness.test.ts` clean; `node --check` on `gate.mjs`,
  `harness.mjs`, `e2e-visual.mjs`, `run-e2e.mjs`.
- `node scripts/run-e2e.mjs --gpu --list` is refused without `E2E_GPU=1` (unchanged) and, with `E2E_GPU=1`, lists
  `e2e-visual` (the list path never starts a server).
- `--rescore` on a fixture result JSON written by the test helper (or a scratch file you build with `runRecord`)
  prints a block and exits 1 for a flagged fixture, 0 for a clean one (no browser).
- `git diff --stat origin/feature/visual-gate -- src` empty.
- No e2e, no GPU, no build, no `npm run check`, no full `vitest run`. You do NOT run the gate against a browser.

## Laptop run (the LEAD sends it after committing and pushing this branch; you write it into the report)
Rules-only on master (no baseline exists before VG7; all view rules are still null, so only parity and meter = field
can flag), framing PNGs for the lead:
`node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-vg5 --requester "Night Shift | Sector Ops Build" --note "visual-gate VG5 gate run" --step "git fetch -q origin feature/visual-gate-vg5 && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record --json C:/NightShift/scratch/visual-gate/vg5/vg5.json --png C:/NightShift/scratch/visual-gate/vg5/png"`
(after the merge into feature/visual-gate, fetch `feature/visual-gate` instead). Pass: exit 0, or exit 1 with every
parity / meter miss explained in `checks/vg5-build.md` by the lead (a real L5 miss is a finding for VG8 / the
orchestrator, not a gate bug); wall <= 180 s, else the PLAN 7 ladder (`--cards 1` first). The full baseline path is
first exercised by VG7's recorded runs.

## Report `docs/visual-gate/checks/vg5-build.md`
Built (functions, deviations and why), the verdict rules as implemented, test list with pass counts, the acceptance
outputs, the laptop request line, files touched, open items for VG6 (block format as built), VG7 (`TOLERANCES` shape,
`recordRun` with `replace: true` for a deliberate re-record) and VG8 (`--rescore`). Final message: done / not done,
test results, open items (short).
