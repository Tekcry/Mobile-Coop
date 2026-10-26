# affected-cap - plan
Owner: Test Runner. Status: current.

Goal: an automatic `affected-e2e` run names at most 3 suites, the closest to the change (BRIEF A1-A9). One PR, small
(about 350 changed lines with tests and docs; cap ~1.5k). Line numbers are origin/master a02784f7.

## Claims
| File | Where | Change |
| --- | --- | --- |
| `scripts/e2e-affected.mjs` | top (:1-20), after `selectSuites` (:384) | times import, `AFFECTED_MAX`, `parseAffectedMax`, `rankAffected`, `capAffected`, `affectedPick` (new exports); the maps, `selectSuites`, `suiteSetFor`, `coverFolders` unchanged |
| `scripts/laptop-queue/lib.mjs` | :976-986 `affectedSuites` body and doc; one new function after `affectedRequest` (:1021) | `{ max }` option through `affectedPick`; `overCapAffected` |
| `scripts/laptop-queue/service.mjs` | new import line after :104 (not the :103 lib import); new `refileOverCap` before `// ---------- task guard` (:371); `main` :1599 / :1608; `selfUpdate` :1587 | re-file step (A7), watched path (A9) |
| `scripts/laptop-queue/request.mjs` | :4-5 usage, :41 usage line, :56-62 `prSuites` | `--affected-max N`, env fallback |
| `scripts/run-e2e.mjs` | :3-12 usage, :21 import, :131-144 `affectedSuites` | `affectedPick`, `--affected-max=N` / `E2E_AFFECTED_MAX` |
| `tests/e2eAffected.test.ts` | new describe at the end; :300-308 expectation | cap tests; `smoke` no longer in the gated pick |
| `tests/laptop-queue.test.ts` | "affected e2e on every PR head" (:1135-1180) | `affectedSuites` max, `overCapAffected` |
| `docs/RULES.md` | :152 the "A PR" row of "Test tiers" | rewritten (text below) |
| `docs/systems/testing-tools.md` | "Choosing suites for a change" :86-112 only | one cap bullet, net-zero lines (budget 720) |
| `changes/feature-affected-cap.md` | new | `kind: patch` |

Not touched: `scripts/auto-train.mjs`, `scripts/merge-train.mjs`, the DIRECT / WIDE / QUICK maps, lib `affectedNeeds`,
`affectedRequest`, `superseded`, service `affectedPass` and its header comment (all inside laptop-queue-7's hunks).

## Slice 1 (Opus): the cap in `scripts/e2e-affected.mjs`
- `import TIMES from './e2e-times.json' with { type: 'json' };` (still pure: no fs call; if vitest refuses the
  attribute, fall back to `readFileSync(new URL('./e2e-times.json', import.meta.url))` in a try, `{}` on failure).
  Header comment (:1-12) gains one line: the cap and `affectedPick`.
- `export const AFFECTED_MAX = 3;`
- `export function parseAffectedMax(v)`: undefined / '' / not a finite integer >= 0 -> `AFFECTED_MAX`; else the number
  (0 = no cap).
- `const COOP` (:229) is reused; `const coopForced = (row) => COOP.every((s) => row.includes(s));`
- `suiteTime(s)`: `TIMES[s]`, else the sum of `TIMES[s:N]` keys, else 60.
- `export function rankAffected(files, suites, map = DIRECT_COVERS)`: the A1 order. For each file f (normalised) with
  row = `suitesForFile(f, map)`: hits(s) += 1 when the row names s; depth(s) = max over those files of: under `src/`,
  the length of the shortest key k of `map` with `f.startsWith(k)` and `map[k]` naming s (no such key: 0, the CORE
  fallback); outside `src/`, `f.length` when `SCRIPT` / `HELPERS` / `SUITE_DIRS` gave the row, 0 for `CORE_FILES`.
  Sort: hits desc, depth desc, `suiteTime` asc, name asc. Returns the sorted copy of `suites`.
- `export function capAffected(files, suites, max = AFFECTED_MAX, map = DIRECT_COVERS)`: max 0 -> `suites` unchanged.
  Any file whose row is `coopForced` -> `[...COOP].sort()`. Else drop `smoke` unless some file's row names it; rank;
  take suites in rank order until `max` distinct bases are taken (a second part of a taken base rides along, A5);
  return sorted.
- `export function affectedPick(files, { max = AFFECTED_MAX, wide = false } = {})`: `const map = wide ? WIDE_COVERS :
  DIRECT_COVERS; const all = affectedGateSuites(selectSuites(files, map));` `wide && max === AFFECTED_MAX` by default
  means no cap: callers pass `max` explicitly for `--wide` only when `--affected-max` is given (A5); so the signature
  is `{ max, wide }` with `max` undefined -> wide ? 0 : AFFECTED_MAX. Returns `capAffected(files, all, max, map)`.
- Expected picks (seed times at a02784f7; put these in the tests):
  `src/player/traversal.ts` -> clip, stealth, traverse; `src/player/foo.ts` -> clip, move, stealth;
  `src/game/ctDevices.ts` -> ctcourse, gadgets, park; `src/net/x.ts` + `src/ui/y.ts` -> coop, ctcourse, netmove;
  `src/ai/a.ts` + `src/ai/b.ts` + `src/game/team.ts` -> guard-carry, sectorops:1, stealth-ai;
  `src/weapons/w.ts` -> combat, stealth-ai, weapons-carry; `src/player/smoothBody.ts` -> clip, guard-carry, stealth;
  `src/world/maps/bunker.ts` -> course; `src/save/ratingRecord.ts` -> section-rating; `src/save/schema.ts` -> the
  co-op group; `src/net/remoteAvatar.ts` -> the co-op group (coop-gpu gated out first); `scripts/smoke.mjs` -> smoke;
  `scripts/run-e2e.mjs` -> anim, combat, move; docs only -> [].

## Slice 2 (Sonnet from this brief): callers
- lib `affectedSuites(run, sha, { base, wide, max })`: `suites: affectedPick(files, { wide, max })`. Doc: the cap.
  Import `affectedPick` instead of `selectSuites, affectedGateSuites, DIRECT_COVERS, WIDE_COVERS` if unused after.
- request.mjs: value option `--affected-max N` (needs `--affected`); `max = parseAffectedMax(opts['affected-max'] ??
  process.env.E2E_AFFECTED_MAX)`, but for `--wide` with neither given pass `undefined` (A5). The stderr line names the
  cap: `affected: N file(s), K suite(s) (cap 3): ...`.
- run-e2e.mjs `--affected`: `affectedPick(files, { wide, max })` with `--affected-max=N` (opt) or `E2E_AFFECTED_MAX`;
  then `orderPicked` as today. `--list` now prints what the service requests (GPU / LEGACY gated, cap applied).

## Slice 3 (Opus): re-file the open requests (A7) and the watched path (A9)
- lib `export function overCapAffected(requests, max)`: open requests r with `r.kind === 'pr'`, (`r.requester ===
  AFFECTED_REQUESTER || r.set === 'affected'`), not `pin`, not `trainRerun`, not `laptopRerun`, and more distinct
  suite bases than `max` (max 0 -> []). Pure; returns the requests.
- service `refileOverCap()` (laptop only, never throws): `const max = parseAffectedMax(process.env.E2E_AFFECTED_MAX)`;
  for each r of `overCapAffected(openListed.filter((r) => !claimed.has(r.id) && !activeReqs.has(r.id)), max)`:
  `got = affectedSuites((a) => git(a), r.sha, { max })`; skip (log once per id) on null or `[]`; skip when the suites
  equal; DRY: log only; else `pushFile('requests/' + r.id + '.json', JSON of { ...r, suites: got.suites, note:
  `${r.note ?? ''} (re-filed at cap ${max})`.trim() }, 're-file ' + r.id)`; on success log "<id>: re-filed at cap N:
  old count -> suites" and, for requester `affected-e2e`, `postStatus(r.sha, 'pending', AFFECTED_CTX, 'queued: K
  suite(s), laptop-e2e/affected (re-filed at the cap)')`. Same id: the queue place, the claim key and the withdrawal
  tracking stay valid; the next listing reads the new file.
- `main`: both `if (affectedDue()) affectedPass();` become `if (affectedDue()) { refileOverCap(); affectedPass(); }`.
  It runs right after `pass()`, whose listing it reads; a request claimed by the desktop in between runs its old list
  (harmless).
- `selfUpdate` (:1587): add `'scripts/e2e-affected.mjs'` to the watched paths.
- The service's own affected requests need no other change: `affectedPass` calls lib `affectedSuites` with no max,
  which now caps at `AFFECTED_MAX`. The env lift for them: the service passes nothing, so set the cap with
  `E2E_AFFECTED_MAX` read inside lib? No: lib stays pure. Slice 3 adds `max: parseAffectedMax(process.env
  .E2E_AFFECTED_MAX)` only in `refileOverCap`; the automatic requests take the default 3. Lifting them needs a code
  change of `AFFECTED_MAX` (A2 undo), which is the intended single switch.

## Tests (vitest, Babylon-free)
- `tests/e2eAffected.test.ts`, new describe "affected-cap: at most 3 closest suites":
  every expected pick above; any file order gives the same list (reverse and shuffle); a PR of 30 files over 8
  folders returns at most 3; max 0 equals `affectedGateSuites(selectSuites(files))` (smoke included); max 5 keeps up
  to 5; `parseAffectedMax` cases (undefined, '', '0', '5', 'x', '-1'); co-op forced beats hits (1 `src/net` file + 10
  `src/ui` files -> the group); GPU / LEGACY never take a slot; two sectorops parts take one slot; `--wide` (no max)
  is uncapped; `suiteSetFor` still returns every suite (auto-drop unchanged).
- Update :300-308 (lib gate test) and lq tests :1139-1147: `smoke` is no longer in a capped pick.
- `tests/laptop-queue.test.ts`: `affectedSuites` returns <= 3 by default and today's list with `{ max: 0 }`;
  `overCapAffected`: auto over cap yes, lead set affected over cap yes, pinned / train rerun / laptop rerun / alone /
  other set / at cap -> no, max 0 -> [].
- Commands: `npm run typecheck:fast`, `npx vitest run tests/e2eAffected.test.ts tests/laptop-queue.test.ts
  tests/autoTrain.test.ts tests/mergeTrain.test.ts`, `npm run lint` (doc-lint budgets).
- Manual: `node scripts/run-e2e.mjs --affected origin/master --list` on 3 open PR heads (detached) and
  `node scripts/laptop-queue/request.mjs --sha <head> --affected --dry-run`: both print the same <= 3 suites.
  After release, Test Runner runs `node scripts/laptop-queue/service.mjs --once --dry-run` on the laptop and checks the
  "would re-file" lines before the live service restarts.

## Docs
- RULES "Test tiers", the "A PR" row (:152), whole new cell text:
  "CI `check` + `affected-e2e`: at most 3 suites, the closest to the folders the PR touches (`affectedPick` in
  `scripts/e2e-affected.mjs`: most changed files reached, then the most specific `DIRECT_COVERS` row, then the shorter
  time; `node scripts/run-e2e.mjs --affected origin/master --list` names them; `E2E_AFFECTED_MAX` / `--affected-max`,
  0 = no cap). `src/net`, `src/save` and wire changes run exactly the co-op group `e2e-coop` + `e2e-netmove` +
  `e2e-ctcourse`. The train's full run catches the rest. A checker gate on top: for `src/player` or `src/game` the
  lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`) and the checker passes only when they are green".
- testing-tools.md "Choosing suites for a change" (:86-112): first bullet gains "capped at 3 suites (RULES "Test
  tiers"; `affectedPick`, ranking in its comment)"; trim an equal number of lines in the same section (the
  "Every LEGACY and GPU suite is reachable" sentence can shorten: those suites never reach an affected request now).
  Net-zero against the 720 budget. Do not touch :560-630 (laptop-queue-7).
- `changes/feature-affected-cap.md`: `# Smaller automatic test per change`, `kind: patch`, two bullets: the 3-suite
  cap with the co-op group rule, and the queue's re-file of open affected requests.
- Job-done: this is the job's only PR: its body carries `Job-done: affected-cap`.

## Test tier and gates
- Scripts and docs only. CI `check` (unit tests, doc lint). The selector maps `scripts/e2e-affected.mjs` and
  `scripts/run-e2e.mjs` to CORE, so this PR's own `affected-e2e` runs e2e-anim, e2e-combat, e2e-move (3, under the new
  cap once the laptop has it; the old service runs 4 with smoke). One Opus checker (queue code). No flag: a process
  change, live at release.

## After release (Test Runner, no session needed for the re-file)
- The laptop's `selfUpdate` sees `scripts/laptop-queue` changed and restarts; the first affected turn re-files every
  open affected request over 3 suites. Report the before / after suite count to the Orchestrator (queue was 166).
