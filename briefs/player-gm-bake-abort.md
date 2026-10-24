status: done feature/gm-bake-abort 5b5bc097

# Brief: gm-bake-abort - the guard bake stops a stage on a lost console instead of failing every job in 0 s (Player Build)

Lead: Night Shift | Player Build, 2026-10-25. Bake tool only (`scripts/operators/guard-bake.mjs`). No game code, no wire
change, no `PROTOCOL_VERSION` change. Unit tests only: NO Blender, NO bake run, no e2e, no GPU.

## The bug
After an account swap the console the bake was started from is dead. The next `blender -b` spawn fails with exit
`0xC0000142` (3221225794, STATUS_DLL_INIT_FAILED), and `runAll` (`guard-bake.mjs:146-170`) keeps starting every
remaining job (`pump`, `:153-166`, picks the next job whenever one finishes, `:161`), each of which fails the same way in
0 s. The stage then reports dozens of failures and deletes their stored hashes (`runJob` `:120`) for nothing.
Where the exit code is learned today: `runJob` (`:116-140`) resolves `{ ok: false, message: \`exit ${code ?? signal}\` }`
on a non-zero close (`:132-133`) and `{ ok: false, message: 'could not start: ...' }` on a spawn throw (`:129`) or
`'error'` event (`:131`); `done` (`:124`) adds `ms`. The numeric `code` is NOT on the result (its doc `:115` says
`{ ok, code, ms, message }`), and nothing records whether the job wrote any output. `runAll` gets each result in the
`.then` at `:157-162`. Its only caller is `main` (`:300`); `scripts/operators/check-guards.mjs:13` imports only
`DEFAULT_OUT`.

## Base and branch
- Base `origin/feature/gm-flip` at `7c0c04562cc50f470d2a2874049ddc03ef125966` (head: "gm-flip fragment: typo"). New
  branch `feature/gm-bake-abort`; push there only. No master merge, no rebase, no other branch. `npm ci` once if needed.

## Files (only these)
- `scripts/operators/guard-bake.mjs`
- `tests/guardBakeAbort.test.ts` (new)
- `docs/guard-models/PLAN.md` (one bullet in section "GB. Bake driver", `:66-79`)
No changelog fragment: this is a bake-tool fix inside the gm-flip PR, whose one player-facing fragment
(`changes/feature-gm-flip.md`) stays as is. Not `guardBakePlan.mjs`, not `check-guards.mjs`, not `package.json`.

## Build: `scripts/operators/guard-bake.mjs`
1. Import `statSync` in the `node:fs` import (`:14`).
2. Constants, directly under `PUSH_BRANCH` (`:23`), exactly:
   ```js
   /** Windows STATUS_DLL_INIT_FAILED (0xC0000142 = 3221225794): the job could not attach to a console. After an account
    *  swap the bake's console is gone and every later spawn fails the same way in 0 s. */
   export const CONSOLE_LOST_CODE = 0xc0000142;
   /** A job that fails faster than this (ms) with an empty log never really ran. */
   export const QUICK_FAIL_MS = 2000;
   /** `main`'s exit code when a stage stopped on a lost console. */
   export const EXIT_CONSOLE_LOST = 5;
   export const ABORT_LINE = 'ABORT: console lost, restart the bake detached';
   ```
3. `runJob` (`:115-140`): every result also carries the exit `code` and the log size `bytes`.
   - Doc (`:115`): `Runs one job to the end; resolves { ok, code, bytes, ms, message }. Never rejects.`
   - `done` (`:124`) becomes: close the fd as now, then
     `let bytes = 0; try { bytes = statSync(log).size; } catch { /* no log */ }` and
     `resolve({ ms: Date.now() - t0, bytes, code: null, ...r });` (a result's own `code` wins).
   - Non-zero close (`:133`): `done({ ok: false, code, message: \`exit ${code ?? signal}\` })`.
   - Success (`:137`): `done({ ok: true, code: 0 })`. The spawn-throw and `'error'` paths stay as they are (`code` null).
4. A pure predicate, directly above `runAll` (`:146`), exactly:
   ```js
   /** A failed job that means the console is gone: exit 0xC0000142 (Node may report it signed, -1073741502), or a failure
    *  in under QUICK_FAIL_MS that wrote nothing to its log (a job that really ran prints at least Blender's banner). */
   export function consoleLost(r) {
     if (!r || r.ok) return false;
     if (typeof r.code === 'number' && (r.code >>> 0) === CONSOLE_LOST_CODE) return true;
     return typeof r.ms === 'number' && r.ms < QUICK_FAIL_MS && r.bytes === 0;
   }
   ```
5. `runAll` (`:146-170`): an injectable runner, the abort rule, and a new return shape `{ results, aborted }`.
   - Signature: `export async function runAll(todo, ctx, { par, maxGpu = 2, run = runJob })`; call `run(byId.get(j.id), ctx)`
     where `:157` calls `runJob(...)`.
   - Doc (`:146`): `Runs the 'run' jobs with at most \`par\` at once and 2 GPU-bound ones; returns { results (by job id),
     aborted }. The first job that fails as \`consoleLost\` stops new starts: the running jobs finish, the rest are
     marked not started.`
   - `let aborted = false;` before the promise. In `pump`, the start loop runs only while `!aborted`
     (`if (!aborted) for (...)`, loop body unchanged).
   - In the `.then` (`:157-162`), after the existing `done` / `FAILED` `console.info` line and before `pump()`:
     ```js
     if (!aborted && consoleLost(r)) {
       aborted = true;
       console.error(`abort   ${j.id}: ${r.message ?? 'failed'} in ${(r.ms / 1000).toFixed(1)} s with ${r.bytes ?? 0} bytes of log: no new job starts, ${running.size} still running, ${pending.length} not started`);
     }
     ```
   - The resolve condition (`:165`) becomes `if (!running.size && (aborted || !pending.length)) resolve();`.
   - After the promise: `if (aborted) for (const j of pending) results[j.id] = { ok: false, message: 'not started: console lost' };`
     then `return { results, aborted };`.
6. A pure exit rule, directly above `main` (`:263`), exactly:
   ```js
   /** `main`'s exit code after a stage ran: EXIT_CONSOLE_LOST on a lost console, 1 if any job failed, else 0. */
   export function stageExit(failed, aborted) {
     return aborted ? EXIT_CONSOLE_LOST : failed ? 1 : 0;
   }
   ```
7. `main` (`:288-307`):
   - `let aborted = false;` next to `let failed = 0;` (`:288`).
   - `:300` becomes `const run = await runAll(todo, { blender, kitPath, outDir }, { par }); Object.assign(results, run.results); aborted = run.aborted;`
   - The stage JSON (`:305`) gains `aborted` after `par`: `{ stage, finished, par, aborted, jobs: results }`.
   - After the summary line (`:306`), replace `if (failed) return 1;` (`:307`) with:
     ```js
     if (aborted) console.error(ABORT_LINE);
     const code = stageExit(failed, aborted);
     if (code) return code;
     ```
     So an aborted stage never pushes. The `--probe`, `--dry-run`, argument-error (2) and push paths are unchanged.
8. Header comment (`:1-11`): add one line after `:4`: `// A lost console (exit 0xC0000142, or a job failing in under 2 s with an empty log) stops the stage: exit 5.`

## Docs: `docs/guard-models/PLAN.md`
In "GB. Bake driver", directly after the "Desktop fallback (A12)" bullet (`:77`), add one bullet (wrap at 120):
"- (gm-bake-abort) A lost console (a job's exit `0xC0000142` after an account swap, or any job failing in under 2 s with
  an empty log) stops the stage: no new job starts, the running ones finish, the rest are marked not started, and the
  driver prints `ABORT: console lost, restart the bake detached` and exits 5 (no push). Restart the bake from a detached
  process."

## Test: `tests/guardBakeAbort.test.ts` (new)
Follow `tests/guardBakePlan.test.ts:1-15`: `// @ts-expect-error plain .mjs build script without types` above
`import * as bake from '../scripts/operators/guard-bake.mjs';`, then typed casts of the exports used. Importing the
module runs nothing (`main` only runs as the entry, `:320`; `paths.mjs` and `blender.mjs` only define constants and
functions). Fake jobs: `{ id, gpuBound: false }` (all `pickNext` reads, `guardBakePlan.mjs:451-455`); `todo` items
`{ job, hash: 'h' }`; `ctx = { outDir: <a path under os.tmpdir() that does not exist> }` (the FAILED line's `tail`
then prints `(no log)`, `:142-144`). Silence `console.info` and spy on `console.error` with `vi.spyOn(...)
.mockImplementation(() => undefined)`; `vi.restoreAllMocks()` in `afterEach`. A fake runner records the ids it starts
and returns a promise the test settles: a small `deferred()` helper per job.
Cases:
- `consoleLost`: true for `{ ok: false, code: 3221225794, ms: 5000, bytes: 900 }`, for `code: -1073741502`, and for
  `{ ok: false, code: 1, ms: 300, bytes: 0 }`, and for `{ ok: false, code: null, ms: 5, bytes: 0, message: 'could not
  start: x' }`; false for `{ ok: false, code: 1, ms: 300, bytes: 120 }`, for `{ ok: false, code: 1, ms: 2500, bytes: 0 }`,
  for `{ ok: true, code: 0, ms: 10, bytes: 0 }`, and for a result with no `bytes`. Also `CONSOLE_LOST_CODE` is
  3221225794, `QUICK_FAIL_MS` 2000, `EXIT_CONSOLE_LOST` 5, `ABORT_LINE` is exactly
  `'ABORT: console lost, restart the bake detached'`.
- Abort on exit 0xC0000142: 6 jobs `a`..`f`, `par` 2. `a` resolves at once with `{ ok: false, code: 3221225794, ms: 0,
  bytes: 0, message: 'exit 3221225794' }`; `b` stays pending. After a few awaited ticks (`await new Promise((r) =>
  setTimeout(r, 0))`): started ids are `['a', 'b']` and the `runAll` promise has not settled (a flag set in its
  `.then`). Resolve `b` with `{ ok: true, code: 0, ms: 9000, bytes: 4000 }`: `runAll` settles with `aborted` true,
  `results.a.ok` false, `results.b.ok` true, `results.c`..`results.f` each `{ ok: false, message: 'not started:
  console lost' }`; started ids still `['a', 'b']`; `console.error` called once with a string starting `abort   a:`.
- Abort on a quick silent failure: same shape, `a` resolves `{ ok: false, code: 1, ms: 300, bytes: 0, message: 'exit 1' }`:
  `aborted` true, only `a` and `b` started.
- No abort on a real failure: `a` resolves `{ ok: false, code: 1, ms: 30000, bytes: 5000, message: 'exit 1' }`, every
  other job resolves ok at once: all 6 started, `aborted` false, `console.error` not called (the existing behaviour).
- `stageExit`: `(0, false)` 0, `(3, false)` 1, `(0, true)` 5, `(3, true)` 5.

## Run (unit tests only: no Blender, no bake run, no e2e, no GPU, no `npm run check`)
`npx tsc --noEmit -p .`;
`node --check scripts/operators/guard-bake.mjs` (eslint ignores `scripts/**/*.mjs`, `eslint.config.js:6`);
`npx eslint tests/guardBakeAbort.test.ts`;
`npx vitest run tests/guardBakeAbort.test.ts tests/guardBakePlan.test.ts`;
`node scripts/operators/guard-bake.mjs --stage bodies --dry-run` (plans only, starts nothing; it must still print the
plan and exit 0). Every shell command with a timeout (60 s for the dry run).

## Rules
- `git show origin/master:CLAUDE.md` ("Hard rules") and `docs/systems/agent-preamble.md`: git add only your files
  (never `-A`), never stash, reset, rebase or force-push, Blender never run here.
- Keep the diff to the lines named above; the scheduler (`pickNext`), hashing, `assess`, push and CLI parsing are
  unchanged.

## Stop conditions (`status: blocked <one-line reason>`, evidence under `## Report`, push, move on)
- At the base, `runAll` / `runJob` / `main` differ from the lines quoted above (someone changed them since `7c0c0456`).
- The test cannot import `guard-bake.mjs` without starting a process or touching the network.
- A change outside the three files seems needed.
- `tests/guardBakePlan.test.ts` fails at the base before your change (report which cases).

## Done when
- tsc, `node --check` and eslint clean, both vitest files pass, the dry run exits 0, `git diff --stat 7c0c0456` lists only the three
  files above.
- Commit on `feature/gm-bake-abort` with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, push
  `origin feature/gm-bake-abort`. No master merge, no PR. Then append a `## Report` at the end of this brief and set
  line 1 to `status: done feature/gm-bake-abort <sha>`; commit and push `cloud-queue`.
- Report format: branch @ sha and `git diff --stat 7c0c0456`; per file what changed with file:line; test names and counts
  per vitest file; tsc / node --check / eslint / dry-run results; Deviations (or "none").
- A cloud session cannot message back. A question you cannot settle from this brief: `status: blocked <reason>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/gm-bake-abort` @ 5b5bc097 (base 7c0c0456). `git diff --stat 7c0c0456`: `docs/guard-models/PLAN.md` +4, `scripts/operators/guard-bake.mjs` +51/-14, `tests/guardBakeAbort.test.ts` +137 (new); 3 files. No stop condition: base matched the quoted lines; guardBakePlan 38/38 at the base.
- guard-bake.mjs: header :5, `statSync` import; the four constants :24-31; `runJob` (:126-152) results carry `code` and `bytes` (statSync :135, a result's own `code` wins); `consoleLost` :161; `runAll` :170 injectable `run`, after the first lost-console result no new job starts, running jobs finish, the rest get "not started: console lost", one `abort   <id>:` line to console.error, returns `{ results, aborted }`; `stageExit` :293; `main` adds `aborted` to the stage JSON, prints `ABORT_LINE` :342, exits 5 before the push step.
- PLAN.md "GB. Bake driver": gm-bake-abort bullet after "Desktop fallback (A12)".
- Tests: guardBakeAbort 8/8 (consoleLost x4, abort on 0xC0000142, abort on a quick silent failure, no abort on a real failure, stageExit), guardBakePlan 38/38 (rerun by the builder session: 46/46). typecheck:fast, node --check, eslint clean. `--stage bodies --dry-run` exit 0, no files.
- Deviations: tsc as `npm run typecheck:fast` (same tsc, incremental). Open: none.
