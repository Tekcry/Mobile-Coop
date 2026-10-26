# release-speed - plan (Opus, 2026-10-23)

Ask: Michael 2026-10-23 ~18:25, "Approve as per your recommendations - whichever speed up the process and reduce
bottlenecks to achieve faster progress" (ROADMAP "Decided", "Release speed-ups", items 1-6). One job, one PR, patch.

**Base.** Branch `feature/release-speed` from origin/master (4f6db420 at planning; PROTOCOL_VERSION 40 there, 38 on
feature/menu: always grep master). Lead worktree `C:/NightShift/Mobile-Coop-release-speed`. Each builder works in its
own worktree `C:/NightShift/Mobile-Coop-release-speed-<a|b|c|d>` on branch `release-speed/<a|b|c|d>` cut from
`feature/release-speed`, commits only its own files, pushes; the lead merges the four (no shared files, no conflicts).
The lead writes the one fragment `changes/feature-release-speed.md`. Line numbers are origin/master 4f6db420
(merge-train.mjs and the workflows are identical on feature/menu).

## Builders (run all four in parallel)
| Builder | Items | Files (only these) |
| --- | --- | --- |
| A (Sonnet 5.5, high) | 1, 3, 4, wire bump | `scripts/merge-train.mjs`, `tests/mergeTrain.test.ts` |
| B (Sonnet 5.5, medium) | 2 | the `tests/*.test.ts` with a PROTOCOL_VERSION assert (item 2 list), `src/net/protocol.ts:19`, new `tests/protocolConst.test.ts`, `docs/systems/coop.md:24`, `docs/systems/agent-preamble.md:16` |
| C (Sonnet 5.5, medium) | 5 | `.github/workflows/deploy.yml`, `.github/workflows/preview.yml` |
| D (Haiku 5.5 or the lead) | 6 + rule text for 1-5 | `CLAUDE.md` only |

## Item 1 - `build` makes the version commit; `release` only merges / tags / moves dev
- New usage: `build <n> <version> "<title>" <branch>... [--keep] [--no-test] [--dry-run]`. `main` (293-301): parse
  `a[1]` with `ver()`, `a[2]` title, `a.slice(3)` branches; export a pure `parseArgs(argv)`. Update the header usage
  and exit codes (1-13).
- Split `finish` (222-257) into `versionCommit({ branch, head, checkout, version, title, pr, members, subject })`
  (223-240: assemble CHANGELOG, `npm version`, add, commit, push; returns the new sha; dry run prints) and
  `mergeAndTag({ pr, version })` (249-255). `single` (280-291) calls both with `waitCi` between: behaviour unchanged.
- `build` (166-187), after the member loop: `git checkout -B train/<n> <head>`, push, open the train PR if none (move
  the `gh pr create` block of `release` 269-275 into `ensurePr(n, version, title, members)`, members via
  `membersFromLog` as in 266-267), then the wire bump (below), then `versionCommit(...)` with subject
  `${version}: version at merge, train ${n} (G183)` (as 277), then item 3, then push. The PR number exists before the
  commit, so the CHANGELOG heading gets it (not "NEW"). CI starts on that push, beside the laptop run.
- `--keep`: start from `origin/train/<n>` instead of `origin/master` (item 6 conflict fixes made by hand on the train);
  exit 1 if that head already holds a version commit. Without `--keep`, force-push as today (181).
- Wire bump (assumption A1, what lets one train carry several wire changes): PRs stop bumping PROTOCOL_VERSION. Pure
  exports: `wirePaths(protocolTs)` = `src/net/` plus every relative `from '../x/y'` import of `src/net/protocol.ts`
  mapped to `src/x/y.ts`; `bumpProtocol(text, masterValue)` sets `export const PROTOCOL_VERSION = <masterValue + 1>;`
  (throws if the line is missing). In `build`: if any member's `git diff --name-only <merge-base origin/master
  origin/b> origin/<b>` touches a wire path, write `bumpProtocol` into `src/net/protocol.ts` and add it to the version
  commit (`git add` list at 238); log `PROTOCOL_VERSION <m> -> <m+1> (wire: <branches>)`. Always master+1, so an
  in-flight PR that already bumped is fine; over-bumping is harmless (both peers run one release). Undo: drop the call.
- `release` (259-278) new path: fetch; `head = origin/train/<n>`; origin/master not an ancestor = STOP exit 3 ("master
  moved since build: rebuild with the next version"); find the version commit with pure `findVersionCommit(subjects,
  n, version)` (first-parent subjects `origin/master..head`); head must be it (else item 4); `package.json` version at
  head == `<version>`; `ensurePr`; `waitCi(branch, head)`; `mergeAndTag`. Fallback: no version commit and no
  `--resume` = the old path (mergeMaster + versionCommit), so a train built by the old script still releases.
- Test (`tests/mergeTrain.test.ts`): `findVersionCommit` (found, absent, other train or version); `wirePaths` on the
  real protocol.ts import lines; `bumpProtocol` (master 40 -> 41; master 41 with head 41 -> 42; missing line throws);
  `parseArgs` for all three commands and flags. Manual: `build 99 4.99.0 "dry" <two green branches> --dry-run` prints
  merges, PR, wire decision, CHANGELOG summary; `release 29 4.78.0 "x" --dry-run` (old-style, merged) takes the
  fallback without error.
- Risk: a second train built before the first releases gets a stale base (release STOP covers it; versions in order).
  A build-time PR makes CI run on the pre-version head too: item 5 concurrency cancels it.

## Item 2 - PROTOCOL_VERSION asserts read the constant
- Delete every bare `expect(PROTOCOL_VERSION).toBe(N)` (master: coopWalkFixes:241, crateWire:12, hangDownNet:15,
  jammer:395, jammerFixes:206, moveState:116, net:401 / 528 / 713 / 758 / 833, poseParity:50, rejoin:53,
  sectorLampSync:54, sectorStep3:54; regrep `git grep -n "PROTOCOL_VERSION).toBe(" origin/master -- tests` first).
  An `it` left empty is deleted; titles naming a number ("PROTOCOL_VERSION is 35 ...", "protocol 7 ...") are renamed
  to what they assert. Drop unused imports (lint).
- `tests/net.test.ts:400-410`: `v: 39` -> `v: PROTOCOL_VERSION - 1`, `v: 40` -> `v: PROTOCOL_VERSION`; title "a peer
  one protocol version behind is refused; the current version joins". Literal `v:` in pure `parseMessage` tests
  (net:43 / 53 / 56, rejoin:56) stay: they test parsing, not the version.
- New `tests/protocolConst.test.ts` (node fs): fails on `/PROTOCOL_VERSION\)\.toBe\(\d/` in any `tests/*.ts`, and on a
  numeric `v:` in a `.send({ t: 'hello'` call; plus PROTOCOL_VERSION is an integer >= 40.
- `src/net/protocol.ts:19`: shorten the history comment to "The wire version. Only this line holds it; tests read it.
  `scripts/merge-train.mjs build` bumps it once per train with a wire change (history: CHANGELOG, docs/systems/coop.md)."
  Move the history into `docs/systems/coop.md:24` (that bullet becomes the rule plus the history).
  `docs/systems/agent-preamble.md:16`: "a wire change does not bump PROTOCOL_VERSION; the train build does".
- Test: `npx vitest run` on the 16 files + the new one; then set the constant to 41 locally (never committed) and
  rerun: all pass.
- Risk: an in-flight PR editing line 19 or an assert conflicts once in its train (resolve keeping this job's side).

## Item 3 - `build` runs vitest on the train head before the laptop run
- In `build`, after `versionCommit`, before the push: unless `--no-test` / `--dry-run`, `npm ci` when
  `package-lock.json` differs from the worktree's previous HEAD or `node_modules` is missing; take the heavy lock
  atomically (`fs.writeFileSync(lock, 'merge-train | train <n> | <iso>', { flag: 'wx' })`, retry every 30 s up to
  5 min (`TRAIN_LOCK_WAIT_MIN`); path `HEAVY_LOCK` env, default `C:/NightShift/heavy.lock`, skipped when its folder is absent);
  `exec('npx vitest run', { timeout: 20 * 60_000 })`; release the lock in `finally` only while it names merge-train.
  On a failure print the last 60 lines, still push (so a fix can go on train/<n>), exit 2: "vitest FAILED on <sha>:
  fix on train/<n> then release --resume, or drop the member and rebuild".
- Test: pure `vitestVerdict(status, out)` unit-tested (pass, fail, timeout -1). Manual: the next real train build,
  timed in STATE.
- Risk: a full vitest is heavy on the desktop (CLAUDE.md "Machines"), hence the lock; `--no-test` when not needed.

## Item 4 - `release --resume` after a CI fix on train/<n>
- `release <n> <version> "<title>" --resume`: item 1's path, but head may descend from the version commit: print
  `resume: <k> commit(s) after the version commit: <subjects>`, require `package.json` == `<version>` at head and no
  `changes/*.md` added after the version commit (else STOP exit 1: rebuild), then `waitCi(head)`, `mergeAndTag`.
  Without `--resume` and head != version commit: STOP exit 1 naming `--resume`. `main` strips `--resume` like
  `--dry-run` (294).
- Test: pure `resumeCheck(subjects, idx, resume)`: head = version commit; fix commits with and without `--resume`.
- Risk: a src fix lands without a laptop rerun; item 6 text says a fix outside tests / docs reruns the failing suite
  on the new head first.

## Item 5 - CI: parallel lint / test / build, node_modules cache, cancel-in-progress per branch
- `deploy.yml:28-40`: replace `check` with `lint`, `test`, `build-check`, each: checkout, setup-node 22 `cache: npm`,
  `actions/cache@v4` (id `nm`) on `node_modules`, key `nm-${{ runner.os }}-node22-${{ hashFiles('package-lock.json') }}`,
  `npm ci` only `if: steps.nm.outputs.cache-hit != 'true'`, then `npm run lint` / `npm test` / `npm run build`; all
  `if: github.event_name == 'pull_request'`. Keep a job named `check` (`needs: [lint, test, build-check]`,
  `if: always() && github.event_name == 'pull_request'`, one step that fails unless all three results are `success`),
  so the status name merge-train, CLAUDE.md and any branch protection use stays. `deploy.yml:22-24`: group
  `pages-${{ github.event_name == 'pull_request' && github.head_ref || 'site' }}` (cancel-in-progress already true).
  Leave the deploy `build` job (42-131) alone.
- `preview.yml`: add `concurrency: { group: preview-${{ github.ref }}, cancel-in-progress: true }` and the cache step.
- Test: this job's own PR: three jobs side by side, `check` green; a second push cancels the first run; the rerun logs
  "Cache restored". Record wall time before / after (`gh run view <id> --json createdAt,updatedAt`).
- Risk: run `gh api repos/{owner}/{repo}/branches/master/protection` first; a required `check` stays valid through the
  aggregate job (a skipped need must not pass it: hence `always()` plus the result test).

## Item 6 - leads stop merging master before train-ready (CLAUDE.md only)
- `CLAUDE.md:86` -> "Never merge master into a job branch: PR CI already runs on GitHub's merge ref, and the train build
  merges master. A conflict is resolved in the train: the orchestrator (or the lead it asks) merges the branch by hand on
  train/<n> with the subject `Merge origin/<b> into train/<n>`, pushes, and reruns `build ... --keep`."
- `CLAUDE.md:148` (merge-train row): "no src conflicts; a PR with one waits for the next train" -> conflicts resolved
  in the train as above; add: `build` makes the version commit, runs vitest and opens the PR (CI beside the laptop
  run); `release` merges on green; `release --resume` after a fix on train/<n>; several wire changes per train.
- `CLAUDE.md:76` and `:239-240` (wire rule): PRs no longer bump PROTOCOL_VERSION or assert its number; the train bumps.
- Test: docs only. Risk: a long-lived branch's train conflict is bigger, but resolved once instead of per release.
- After the merge the orchestrator updates `docs/orchestrator/STATE.md` "Merge procedure" (95-110) and drops the STATE:14
  rule ("after a master / train merge, leads run every PROTOCOL_VERSION assert unit test").

## Lead order
Start A-D at once. Merge the four branches into `feature/release-speed`, write the fragment, run
`npx vitest run tests/mergeTrain.test.ts tests/protocolConst.test.ts` plus the item 2 files, push, open the PR (its CI
shows item 5), run the checker, at most one fix round, then the next train (tier: CI `check` + these unit tests).

## Checker brief (one fresh Opus 5.5, high; read-only except running tests)
Check `feature/release-speed` against this PLAN and ROADMAP "Release speed-ups". PASS only if:
1. `scripts/merge-train.mjs`: `single` behaves as before; `build` runs merge -> checkout -> push -> PR -> wire bump ->
   version commit -> vitest -> push; `--keep`, `--no-test`, `--resume` and the exit codes match the header; nothing
   moves a ref, worktree or remote under `--dry-run`; the heavy lock is created with `wx` and removed only while it
   names merge-train; `release` stops when master moved and falls back for an old-style train.
2. `build 99 4.99.0 "check" <two green branches> --dry-run` and `release 29 4.78.0 "x" --dry-run` run without error
   and print what a real run would do.
3. `git grep -n "PROTOCOL_VERSION).toBe(" -- tests` is empty; with the constant set to 41 locally (reverted after) the
   item 2 files and `tests/protocolConst.test.ts` pass; `npx vitest run tests/mergeTrain.test.ts` passes.
4. The PR's CI shows lint / test / build-check in parallel and an aggregate `check` that fails when any of them fails
   (`if: always()` plus the result test); cache key on the lock hash; concurrency per branch in both workflows.
5. CLAUDE.md says nothing the script does not do. Report PASS / FAIL with file:line for each point.
