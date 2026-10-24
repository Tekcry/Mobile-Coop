# VG6 - train wiring: the gate after every green train, `visual-gate` status + PR comment (Opus builder)

Job visual-gate, group B (parallel with VG5). Lead: Night Shift | Sector Ops Build. PLAN section 6 (:145-162), with
A17 (own PR cut from master, new files instead of lib.mjs / laptop-queue.test.ts), A19 (only after a green
laptop-e2e) and A20 (desktop lane: skipped status). Service code is shared infra: keep the service.mjs diff small,
exact and easy to re-apply by hand (the laptop-queue job edits the same file).

## Where (A17)
- Branch `feature/visual-gate-train`, cut from **origin/master** (bd8920c2 at this writing; take the head at start),
  NOT from feature/visual-gate (its base bd54dfcd has a 161-line-older service.mjs and lib.mjs, and the job never
  merges master). Worktree `C:/NightShift/Mobile-Coop-visual-gate-train`, or a cloud builder (unit tests only, which is
  all this slice needs). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-train && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-train && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-train"`
- Worktree mode: never commit, push, stash, reset or checkout (the lead commits). Cloud mode: commit and push this
  branch only.
- Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Sessions" ("Heavy-usage throughput", the "Merge train" row)
  and "Hard rules"; from feature/visual-gate (`git show origin/feature/visual-gate:<file>`): `docs/visual-gate/BRIEF.md`
  (A1, A2, A8, A11, A12, A17-A21), `PLAN.md` section 6 (:145-162), `briefs/VG5.md` "Contract" (the block format and
  `VisualSummary`: your input), `checks/c0-plan-check.md` P9, P10, P17. In your branch: `scripts/laptop-queue/service.mjs`
  (header :1-63, `postStatus` :152-156, `postComment` :161-166, `sh` :474-490, `freePort` :500-505, `releaseLock`
  :545-548, `e2e` :580-587, `finish` :634-644, `runTrain` :669-769 with `finish` at :759 and `finally` at :761,
  `busy` :922, `dispatch` :924-951, `planTrain` :955-963, `selfUpdate` :1188-1198), `lib.mjs` (`capTail` :412-416),
  `scripts/run-e2e.mjs` (named suites run as `node scripts/<s>.mjs <url>`, `E2E_SUITE_TIMEOUT` kill + `KILLED:` line
  :208-224), `scripts/auto-train.mjs` (reads only `check`, `laptop-e2e`, `laptop-e2e/train<n>-rerun`, `auto-train/*`:
  A1 needs no change there), `docs/systems/auto-train.md`. Line refs are origin/master bd8920c2; re-find them if master
  moved.

## Files (only these)
- create `scripts/laptop-queue/visual.mjs` (pure: no `node:` imports, no fs, no git, no gh; may import `./lib.mjs`)
- create `tests/laptopQueueVisual.test.ts`
- edit `scripts/laptop-queue/service.mjs`: exactly the 6 changes below, nothing else
- edit `docs/systems/auto-train.md`: one line (below)
- create `docs/laptop-queue/visual-gate.md` (the operator note)
- create `changes/feature-visual-gate-train.md` (fragment: `# Laptop queue: visual-gate after green trains`, `kind: patch`, 2-4 bullets)
- create `docs/visual-gate/checks/vg6-build.md` (your report; the lead may copy it byte-identical to feature/visual-gate)
Do NOT touch: `lib.mjs`, `tests/laptop-queue.test.ts`, `request.mjs`, `run-e2e.mjs`, `auto-train.mjs`,
`merge-train.mjs`, anything under `src/` or `scripts/visual-gate/`, `docs/laptop-queue/STATE.md` / `PLAN.md` /
`BRIEF.md` (the laptop-queue job's), `package.json`. No new dependency.

## Contract (copy verbatim to the top of visual.mjs; VisualSummary is VG5's, copied because gate.mjs is not on master)
```js
/**
 * @typedef {{ v: 1, verdict: 'clean' | 'flagged' | 'error', sha: string | null, version: string, train: number | null,
 *   renderer: string, shots: number, flags: number, known: number, parity: number, newKeys: number, warnings: number,
 *   errors: number, base: { version: string, approver: string | null } | null, wallS: number, reason: string | null,
 *   top: string[], recorded: boolean, thumbs: string[] }} VisualSummary
 */
/** @typedef {{ state: 'success' | 'failure' | 'error', description: string }} StatusPost */
/** @typedef {{ run: false, status: StatusPost | null } | { run: true, port: string, release: string[] }} VisualPlan */
/** @typedef {{ state: 'success' | 'failure' | 'error', description: string, summary: VisualSummary | null, block: string | null }} VisualVerdict */
```
The block (VG5, stdout of the suite, so in the run-e2e log; jobs 1 streams it): a line `VISUAL-GATE BEGIN`, line 2
`<!-- visual-gate-summary <json> -->`, markdown lines, a line `VISUAL-GATE END`.

## visual.mjs (pure, all exported, exact names)
- `VISUAL_CONTEXT = 'visual-gate'`, `VISUAL_SUITE = 'e2e-visual'`, `VISUAL_TIMEOUT_S = 300`, `VISUAL_SH_TIMEOUT_MS =
  360_000` (run-e2e's own kill at 300 s plus the server start and teardown), `BLOCK_CAP = 8000`, `THUMB_BASE =
  'https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines'`.
- `visualPlan({ enabled, desktop, hasScript, trainOk, ports }): VisualPlan`, first match: `!enabled` (env
  `LQ_VISUAL=0`, the kill switch) -> no run, no status; `!hasScript` (the train head has no `scripts/e2e-visual.mjs`:
  inert until the visual-gate PR is in master) -> no run, no status; `!trainOk` (A19) -> no run, no status; `desktop`
  (A20) -> no run, status `{ state: 'error', description: 'skipped: desktop lane (laptop GPU only)' }`; else `{ run:
  true, port: ports[0], release: ports.slice(1) }`.
- `visualEnv({ n, sha }): Record<string, string>` -> `{ E2E_SUITE_TIMEOUT: '300', VG_RECORD: '1', VG_TRAIN: String(n),
  VG_SHA: sha, VG_BRANCH: 'train/' + n }`.
- `extractBlock(text): string | null` - CRLF normalised; the LAST `VISUAL-GATE BEGIN` line to the next `VISUAL-GATE END`
  line, both included; a BEGIN without an END -> null.
- `parseSummary(block): VisualSummary | null` - the line `^<!-- visual-gate-summary (\{.*\}) -->$`, JSON.parse; null
  unless `v === 1` and `verdict` is one of the three.
- `visualVerdict(text, { code = 0, timedOut = false } = {}): VisualVerdict`, first match:
  1. no block and (`timedOut` or code 124 or a `^KILLED: e2e-visual ran past` line) -> error `over 300 s (killed), no result`;
  2. no block -> error `no result (exit <code>)`;
  3. block, summary null -> error `unreadable result block`;
  4. summary clean but code != 0 -> error `exit <code> with a clean block`;
  5. clean -> success `clean: <shots> shots vs <base.version | no baseline>, <wallS> s` + `; <known> known` when known
     > 0 + `; <warnings> warn` when warnings > 0 (PLAN 6: "clean: 64 shots vs 4.97.0, 152 s");
  6. flagged -> failure `<n> flag(s): <top joined by ', '>` + ` vs <base.version>` when base, n = flags + parity
     ("3 flags: m-a3-lobby@low wall.blotch ...");
  7. error -> error `error: <reason | unknown>` (C0 P10: "no baseline for renderer <r>", "over budget: ...").
  Every description is cut to 140 chars (`...` at 137, as service `finish`), never longer.
- `thumbUrl(sha, key): string` -> `${THUMB_BASE}/runs/${sha}/thumbs/${encodeURIComponent(key)}.webp` (C0 P17: `@` ->
  `%40`).
- `visualComment(v: VisualVerdict, { sha, n }): string | null` - null unless `v.state === 'failure'` (PLAN 6: a comment
  on flags only; an error lives in the status). Body: `visual-gate flagged train <n> (<sha8>): <description>`, a blank
  line, the block WITHOUT its two marker lines, cut with `capTail(.., BLOCK_CAP)` from lib.mjs, then when
  `summary.thumbs` is non-empty: `Thumbs (now | baseline):` and one line per key without the `.base` suffix:
  `` - `<key>`: [now](<thumbUrl key>) `` plus ` | [baseline](<thumbUrl key.base>)` when `<key>.base` is listed; then
  `Accept a deliberate look change: node scripts/visual-gate/baseline.mjs accept --sha <sha> --by <name> --why <text> [--only k,k] (A9)`.

## service.mjs (exactly these 6 changes; a resolver must be able to re-apply them on a moved master by reading this list)
1. Header: after the "Orchestrator audit 2026-10-24 (train 64 ...)" paragraph (:55-63) add 3-4 comment lines: the
   visual-gate post-step (after a green train on the laptop, if the head has `scripts/e2e-visual.mjs`; the other slots
   are released first; status `visual-gate`; PR comment on flags; desktop posts "skipped"; `LQ_VISUAL=0` turns it off;
   `docs/laptop-queue/visual-gate.md`).
2. Import: one new line after the lib.mjs import (:68): `import { visualPlan, visualEnv, visualVerdict, visualComment,
   VISUAL_CONTEXT, VISUAL_SUITE, VISUAL_SH_TIMEOUT_MS } from './visual.mjs';`
3. `e2e` (:580-587) gains a 6th parameter `{ env: extra = {}, timeoutMs } = {}`: the env object becomes `{ E2E_PORT:
   port, E2E_JOBS: String(jobs), E2E_GPU: '1', E2E_SUITE_TIMEOUT: '900', ...extra }` and `sh` gets `timeoutMs` only when
   given (its default stays 3600 s). Every existing call is unchanged (C0 P9: the env is fixed today).
4. A new `async function runVisual(train, ports, locks, ctl, runDir, prNumber, trainOk)` placed right after `runTrain`
   (~30 lines): plan = `visualPlan({ enabled: process.env.LQ_VISUAL !== '0', desktop: DESKTOP, hasScript:
   fs.existsSync(path.join(SLOTS[ports[0]].dir, 'scripts', 'e2e-visual.mjs')), trainOk, ports })`; no run -> post
   `plan.status` (when set) on `VISUAL_CONTEXT` and return; else for each `plan.release` port: `releaseLock(p, locks[p])`
   when held, `freePort(p)`, `locks[p] = null`, `busy[p] = null` (C0 P9: 4192 goes back to the queue, the same move as
   the TRAIN_SOLO branch :704); post `pending` `running on <port>`; `run = await e2e(plan.port, [VISUAL_SUITE], 1,
   path.join(runDir, 'visual.log'), ctl, { env: visualEnv(train), timeoutMs: VISUAL_SH_TIMEOUT_MS })`; read the log
   file (try / catch -> ''); `v = visualVerdict(text, { code: run.code, timedOut: run.code === 124 })`; post `v.state` /
   `v.description` on `VISUAL_CONTEXT`; `body = visualComment(v, { sha: train.sha, n: train.n })`, posted when `body &&
   prNumber && !DRY`; `log` one line with the verdict.
5. `runTrain`: right after `state.trains[train.sha] = { result: ok ? ... }` (:760), still inside the `try`:
   `saveState();` then `try { await runVisual(train, ports, locks, ctls[ports[0]], runDir, prNumber, ok); } catch (e) {
   log(...); postStatus(train.sha, 'error', VISUAL_CONTEXT, 'service error, see log'); }`. The verdict for
   `laptop-e2e` is already posted (auto-train may release meanwhile: A1), the void watch is already cleared (:757-762),
   and the `finally` still releases what `locks` holds, saves state and pushes the done claim (the heartbeat keeps the
   claim fresh during the ~3 min).
6. `planTrain` (dry run, :955-963): one more `log` line after the two status lines: `dry-run: then e2e-visual on
   <ports[0]> when laptop-e2e passes and the head has scripts/e2e-visual.mjs (env <visualEnv json>), status
   visual-gate` (desktop: `dry-run: visual-gate would post error "skipped: desktop lane (laptop GPU only)"`).
Nothing else in service.mjs changes (no reformatting, no reordering).

## Docs
- `docs/systems/auto-train.md`: one line where it lists what it reads (or at the end of "Running it"): "`visual-gate`
  (the laptop's picture gate after a green train, `docs/laptop-queue/visual-gate.md`) is never read: a flag never holds
  a release (visual-gate BRIEF A1)."
- `docs/laptop-queue/visual-gate.md` (new, ~30 lines): what runs and when (A19, A20), the env, the slot release, the
  timeouts (300 s suite kill, 360 s shell cap, 285 s gate deadline), the statuses and their descriptions, the PR
  comment and thumb links, the kill switch `LQ_VISUAL=0`, the log (`<LQ_STATE>/runs/train-<n>-<sha8>/visual.log`) and
  the scratch folder (`C:/NightShift/scratch/visual-gate/<sha>/`), what to do on "no baseline for renderer <r>" (a GPU
  driver or Chrome change: the orchestrator accepts the newest recorded run, `baseline.mjs accept --sha <run> --by
  orchestrator --why "renderer change"`, A9), deploy (below), and that auto-train ignores the context (A1).

## Unit tests (`tests/laptopQueueVisual.test.ts`, vitest, node env)
```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { visualPlan, visualEnv, extractBlock, parseSummary, visualVerdict, thumbUrl, visualComment, VISUAL_CONTEXT, BLOCK_CAP,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/laptop-queue/visual.mjs';
```
Sample blocks built in the test by a helper `block(summary: object, body = '| key | ...')` (the VG5 format, CRLF variant
too). Cases:
- visualPlan: disabled -> no run / no status; no script -> no run / no status; train failed -> no run / no status;
  desktop -> no run + the skipped error status; laptop `['4189', '4192']` -> run on 4189, release ['4192']; single port
  `['4192']` (TRAIN_SOLO) -> run on 4192, release [].
- visualEnv: the five keys and values.
- extractBlock / parseSummary: none -> null; one -> it; two -> the last; CRLF -> found; BEGIN without END -> null; bad
  JSON / v 2 / unknown verdict -> summary null.
- visualVerdict (each with its exact description): clean ("clean: 76 shots vs 4.97.0, 152 s"); clean with 1 known and
  2 warnings; clean with base null ("vs no baseline"); flagged by drift ("3 flags: ... vs 4.97.0"); flagged by parity
  only; KNOWN-only run (verdict clean, known 1) -> success; error no baseline ("error: no baseline for renderer ANGLE
  (...)"); missing block exit 1 ("no result (exit 1)"); `KILLED: e2e-visual ran past 300s` in the text, and code 124 ->
  "over 300 s (killed), no result"; unreadable block; clean block with code 1 -> error; a 30-key top list and a
  200-char renderer both give a description of length <= 140.
- thumbUrl: `m-a3-lobby@low` -> `.../runs/<sha>/thumbs/m-a3-lobby%40low.webp`; `.base` kept.
- visualComment: null for success and error; for a failure: contains the description, the block body without the
  marker lines, a cut marker when the body is over BLOCK_CAP, `now` and `baseline` links for `a@low` / `a@low.base`, no
  baseline link when only `a@low` is listed, and the accept line.
- Static guard on service.mjs (`fs.readFileSync`): imports from `./visual.mjs`; `runVisual(` is called after `const ok =
  finish(job, 'laptop-e2e'` and before the next `} finally {`; the `e2e` function takes the options parameter; the text
  `E2E_SUITE_TIMEOUT: '900'` is still there (existing calls unchanged).

## Acceptance (run all; paste outputs in the report)
- `npx vitest run tests/laptopQueueVisual.test.ts --maxWorkers=2` all pass; `npx vitest run tests/laptop-queue.test.ts
  --maxWorkers=2` and `npx vitest run tests/changesFragments.test.ts --maxWorkers=2` still pass.
- `npm run typecheck:fast` clean (or `npx tsc --noEmit -p tsconfig.json`); `npx eslint tests/laptopQueueVisual.test.ts`
  clean; `node --check scripts/laptop-queue/service.mjs scripts/laptop-queue/visual.mjs`.
- Service dry run where `gh` is logged in (the desktop; on a cloud builder write "not run" and the lead runs it):
  `LQ_STATE=<scratch dir> LQ_TASK_GUARD_MIN=0 node scripts/laptop-queue/service.mjs --dry-run` exits 0 and its shard
  preview prints the visual-gate line; paste the lines. It reads GitHub only (no claim, status, push or run).
- `git diff --stat origin/master -- src` empty; `git diff origin/master --stat` lists only the files above.
- No e2e, no GPU, no build, no `npm run check`, no full `vitest run`.

## Rollout (the lead; nothing to send to the laptop for this slice)
- The lead opens the PR `feature/visual-gate-train` -> master after a fresh Opus checker (service code: Opus checks),
  label train-ready; it rides the next train with CI `check` only (no suite reaches it: tooling + docs). It is inert
  until a train head carries `scripts/e2e-visual.mjs`, so it may merge before or after the visual-gate PR (A17).
- Deploy: the laptop and desktop services fast-forward to master when idle and restart themselves when
  `scripts/laptop-queue` changed (`selfUpdate` :1188-1198), so no manual restart is needed; the lead tells Test Runner
  in its next message (PLAN 6 said "restart NightShift-laptop-queue": only if the service runs with `LQ_FOLLOW` off).
- First live run: the first green train after the visual-gate PR merges; the lead checks its `visual-gate` status
  and `visual.log` (Test Runner) and logs it in STATE.

## Report `docs/visual-gate/checks/vg6-build.md`
Built (functions; the 6 service.mjs changes with their final line numbers so a train-time resolver can re-apply
them), deviations and why, test list with pass counts, the dry-run lines, files touched, open items. Final message:
done / not done, test results, open items (short).
