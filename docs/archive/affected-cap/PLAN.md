# affected-cap - plan
Owner: Test Runner. Status: current.

Goal: an automatic `affected-e2e` run names at most 3 suites, the closest to the change (BRIEF A1-A9). One PR, small
(about 400 changed lines with tests and docs; cap ~1.5k). Line numbers are origin/master 3f0ab7fec (train 116), the
base of feature/affected-cap2; #507 overlap checked by hunk content (BRIEF A8).

## Claims
| File | Where | Change |
| --- | --- | --- |
| `scripts/e2e-affected.mjs` | header (:1-12); after `withWireSuites` (:419), before the auto-drop banner (:421) | times import, `AFFECTED_MAX`, `parseAffectedMax`, `suiteTime`, `rankAffected`, `capAffected`, `affectedPick` (new exports); the maps, `selectSuites`, `withWireSuites`, `wirePaths`, `touchesWire`, the gate, `suiteSetFor`, `coverFolders` unchanged |
| `scripts/laptop-queue/lib.mjs` | :4 import; :969-986 `affectedSuites` doc and body; one new function after `affectedRequest` (:1021) | `{ max }` and the wire read through `affectedPick`; `overCapAffected` |
| `scripts/laptop-queue/service.mjs` | two new import lines after :104 (not the :103 lib import); new `refileOverCap` before `// ---------- task guard` (:368); `main` :1600 / :1611; `selfUpdate` :1587 | re-file step (A7), watched path (A9) |
| `scripts/laptop-queue/request.mjs` | :3-6 usage, :41 usage line, :55-64 `prSuites` | `--affected-max N`, env fallback |
| `scripts/run-e2e.mjs` | :3-17 usage, :23 import, :132-153 `affectedSuites` | `affectedPick` with the HEAD protocol.ts it already reads, `--affected-max=N` / `E2E_AFFECTED_MAX`; the E2E_REPORT / REPORT ONLY code (:157-160 on) untouched |
| `tests/e2eAffected.test.ts` | :4 import; new describe at the end (after :342) | cap tests (the :303-312 lib gate test is `{ wide: true }`, stays uncapped: no edit) |
| `tests/laptop-queue.test.ts` | new import after :7; "affected e2e on every PR head" :1139-1152 and new `it`s after :1153 | `affectedSuites` call list, cap and max 0; `overCapAffected` |
| `docs/RULES.md` | :152 the "A PR" row of "Test tiers" | rewritten as one line (318/318: net zero) |
| `docs/systems/testing-tools.md` | "Choosing suites for a change" :87-122 only | cap bullet, net-zero lines (720/720) |
| `changes/feature-affected-cap.md` | new | `kind: patch` |

Not touched: `scripts/auto-train.mjs`, `scripts/merge-train.mjs`, the DIRECT / WIDE / QUICK maps, lib `affectedNeeds`,
`affectedRequest`, `superseded`, service `affectedPass` and its header comment (all inside or next to laptop-queue-7's
hunks), run-e2e's REPORT ONLY / `E2E_REPORT` handling.

## Slice 1 (Opus): the cap in `scripts/e2e-affected.mjs`
- `import TIMES from './e2e-times.json' with { type: 'json' };` (still pure: no fs call; if vitest refuses the
  attribute, fall back to `readFileSync(new URL('./e2e-times.json', import.meta.url))` in a try, `{}` on failure).
  Header comment (:1-12) gains one line: the cap and `affectedPick`.
- `export const AFFECTED_MAX = 3;`
- `export function parseAffectedMax(v)`: undefined / '' / not a finite integer >= 0 -> `AFFECTED_MAX`; else the number
  (0 = no cap).
- `COOP` (:255, exported) is reused; `const coopRow = (row) => COOP.every((s) => row.includes(s));`
- `export function suiteTime(s, times = TIMES)`: a part token (`a:N`): `times[s] ?? 60`; a whole suite: the sum of its
  `s:N` keys when any exist (preferred: e2e-times.json holds both `e2e-sectorops` 43 and its parts 214), else
  `times[s] ?? 60`.
- `export function rankAffected(files, suites, { map = DIRECT_COVERS, times = TIMES } = {})`: the A1 order, every
  comparison on the suite base `b = s.split(':')[0]`. For each file f (normalised) with row = `suitesForFile(f, map)`:
  hits(b) += 1 when the row names b (whole or part); depth(b) = max over those files of: under `src/`, the length of
  the shortest key k of `map` with `f.startsWith(k)` and `map[k]` naming b (none: 0, the CORE fallback); outside
  `src/`, `f.length` when `HELPERS` / `SUITE_DIRS` / `SCRIPT` gave the row, 0 for `CORE_FILES`. Sort: hits desc, depth
  desc, `suiteTime(s, times)` asc, name asc. Returns a sorted copy of `suites`.
- `export function capAffected(files, suites, { max = AFFECTED_MAX, map = DIRECT_COVERS, times = TIMES, wire = false }
  = {})`: max 0 -> `suites` unchanged. `wire` or any file whose row is `coopRow` -> `[...COOP].sort()` (A3). Else drop
  `smoke` unless some file's row names it; rank; take suites in rank order until `max` distinct bases are taken (a
  second part of a taken base rides along, A5); if that leaves nothing and `suites` held `smoke`, return `['smoke']`
  (A4); return sorted.
- `export function affectedPick(files, { max, wide = false, protocolTs = '', times = TIMES } = {})`: `map = wide ?
  WIDE_COVERS : DIRECT_COVERS`; `all = affectedGateSuites(withWireSuites(selectSuites(files, map), files, protocolTs))`
  (master's wire rule kept, before the gate); `wire = typeof protocolTs === 'string' && protocolTs !== '' &&
  touchesWire(files.map(norm), wirePaths(protocolTs))`; `max` undefined -> wide ? 0 : AFFECTED_MAX (A5). Returns
  `capAffected(files, all, { max, map, times, wire })`.
- Expected picks, `affectedPick(files, { times: T })` with T a frozen copy of today's `scripts/e2e-times.json` in the
  test file and no protocolTs (put these in the tests):
  `src/player/traversal.ts` -> clip, stealth, traverse; `src/player/foo.ts` -> clip, move, stealth;
  `src/game/ctDevices.ts` -> ctcourse, gadgets, park; `src/game/sectors/a.ts` -> gadgets, park, sectorops;
  `src/net/x.ts` + `src/ui/y.ts` -> coop, ctcourse, netmove;
  `src/ai/a.ts` + `src/ai/b.ts` + `src/game/team.ts` -> guard-carry, sectorops:1, stealth-ai;
  `src/weapons/w.ts` -> combat, stealth-ai, weapons-carry; `src/player/smoothBody.ts` -> clip, guard-carry, stealth;
  `src/world/maps/campusS4.ts` -> anchors, levels, sectorops:6; `src/world/lightBake.ts` -> desktop, lightbake
  (darkness gated); `src/world/maps/bunker.ts` -> course; `src/save/ratingRecord.ts` -> section-rating;
  `src/save/schema.ts` -> the co-op group; `src/net/remoteAvatar.ts` -> the co-op group (coop-gpu gated out first);
  `src/audio/x.ts` -> smoke (A4); `scripts/smoke.mjs` -> smoke; `scripts/run-e2e.mjs`, `scripts/e2e-verdict.mjs` ->
  anim, combat, move; docs only -> [].
  With protocolTs (the wire, A3): a protocol text importing `'../player/moveState'` plus a change to
  `src/player/moveState.ts` -> the co-op group (without protocolTs: clip, move, stealth); with the real
  `src/net/protocol.ts` (read as the J20 tests do) `src/game/ctDevices.ts` and `src/game/sectors.ts` -> the co-op group.

## Slice 2 (Sonnet from this brief): callers
- lib `affectedSuites(run, sha, { base, wide, max })`: after the diff, `let protocolTs = ''; try { protocolTs =
  String(run(['show', `${sha}:src/net/protocol.ts`]) ?? ''); } catch { /* no protocol.ts: no wire rule */ }`; `suites:
  affectedPick(files, { wide, max, protocolTs })`. Doc: the wire rule and the cap. The :4 import becomes `affectedPick`
  only (`selectSuites`, `affectedGateSuites`, `DIRECT_COVERS`, `WIDE_COVERS` are unused after; check with grep).
- request.mjs: value option `--affected-max N` (needs `--affected`; it already falls through to the value branch of
  :27); `max = parseAffectedMax(opts['affected-max'] ?? process.env.E2E_AFFECTED_MAX)`, but for `--wide` with neither
  given pass `undefined` (A5). The stderr line names the cap: `affected: N file(s), K suite(s) (cap 3): ...` (`no cap`
  for 0 / wide). `parseAffectedMax` imported from `../e2e-affected.mjs` on its own line.
- run-e2e.mjs `--affected`: keep the HEAD protocol.ts read (:143-149) and replace :150 with `affectedPick(files, { wide,
  max, protocolTs })`, `max` = `parseAffectedMax(opt('affected-max') ?? process.env.E2E_AFFECTED_MAX)`, or `undefined`
  for `--wide` with neither given; the :151 line names the cap; then `orderPicked` as today. Import (:23): add
  `affectedPick`, `parseAffectedMax`; drop `withWireSuites`, `DIRECT_COVERS`, `WIDE_COVERS` if unused (`selectSuites`
  stays for `--quick`). Usage (:12-16): the cap and `--affected-max=N`. `--list` now prints what the service requests
  (GPU / LEGACY / AUDIO gated, cap applied); `E2E_REPORT` and the REPORT ONLY rule are unchanged.

## Slice 3 (Opus): re-file the open requests (A7) and the watched path (A9)
- lib `export function overCapAffected(requests, max)`: open requests r with `r.kind === 'pr'`, `r.requester ===
  AFFECTED_REQUESTER` (only: set `affected` alone is a lead's hand-filed request, never narrowed), not `pin`, not
  `trainRerun`, not `laptopRerun`, and more distinct suite bases than `max` (max 0 -> []). Pure; returns the requests.
- service: new lines after :104: `import { overCapAffected } from './lib.mjs';` and `import { AFFECTED_MAX } from
  '../e2e-affected.mjs';`.
- service `refileOverCap()` (laptop only, never throws): for each r of `overCapAffected(openListed.filter((r) =>
  !claimed.has(r.id) && !activeReqs.has(r.id)), AFFECTED_MAX)`: `got = affectedSuites((a) => git(a), r.sha)` (the
  default cap); skip (log once per id) on null or `[]`; skip when the suites equal; DRY: log "would re-file" only; else
  `pushFile('requests/' + r.id + '.json', JSON of { ...r, suites: got.suites, note: `${r.note ?? ''} (re-filed at cap
  ${AFFECTED_MAX})`.trim() }, 're-file ' + r.id)`; on success log "<id>: re-filed at cap N: old count -> suites" and
  `postStatus(r.sha, 'pending', AFFECTED_CTX, 'queued: K suite(s), laptop-e2e/affected (re-filed at the cap)')`. Same
  id: the queue place, the claim key and the withdrawal tracking stay valid; the next listing reads the new file.
  (`openListed` already leaves out requests the desktop holds.)
- `main`: both `if (affectedDue()) affectedPass();` (:1600, :1611) become `if (affectedDue()) { refileOverCap();
  affectedPass(); }` (keep :1600's trailing comment). It runs right after `pass()`, whose listing it reads; a request
  claimed by the desktop in between runs its old list (harmless).
- `selfUpdate` (:1587): add `'scripts/e2e-affected.mjs'` to the watched paths.
- The service passes no max anywhere and never reads `E2E_AFFECTED_MAX`: `affectedPass` calls lib `affectedSuites` with
  no max (now `AFFECTED_MAX`), and `refileOverCap` uses the same constant, so the two always agree. Changing the
  automatic size is a code change of `AFFECTED_MAX` (A2), the single switch.

## Tests (vitest, Babylon-free)
- `tests/e2eAffected.test.ts`, import `affectedPick`, `capAffected`, `rankAffected`, `suiteTime`, `parseAffectedMax`,
  `AFFECTED_MAX`, `COOP` (cast as the file does), new describe "affected-cap: at most 3 closest suites" at the end:
  every expected pick above (all with `times: T`, the frozen table); any file order gives the same list (reverse and
  shuffle); a PR of 30 files over 8 folders returns at most 3 bases; max 0 equals
  `affectedGateSuites(withWireSuites(selectSuites(files), files, protocolTs))` (smoke included); max 5 keeps up to 5;
  `parseAffectedMax` cases (undefined, '', '0', '5', 'x', '-1', '2.5'); co-op beats hits (1 `src/net` file + 10
  `src/ui` files -> the group); the wire pick (protocol importing `'../player/moveState'` + `src/player/moveState.ts`
  -> the group; same file with '' -> clip, move, stealth); GPU / LEGACY / AUDIO never take a slot; two sectorops parts
  from two files take one slot (both kept); `rankAffected` with a small fixed table: hits beat depth, depth beats time,
  time beats name, a part token's hits count for its base; `suiteTime` with `{ 'e2e-x': 43, 'e2e-x:1': 57, 'e2e-x:2':
  24 }` -> 81, a part -> its key, unknown -> 60; `--wide` (no max) is uncapped; `suiteSetFor` still returns every suite
  (auto-drop unchanged).
- `tests/laptop-queue.test.ts` (new `it`s after :1153, away from #507's :1182 insertion; `overCapAffected` on its own
  import line after :7): the :1139-1152 test's call list gains `['show', `${SHA('1')}:src/net/protocol.ts`]` after the
  diff (the stub answers it with the file list: no imports, no wire), `toContain('smoke')` becomes
  `toEqual(['e2e-gadgets', 'e2e-park', 'e2e-sectorops'])`; a protocol read that throws still returns the suites
  (wire rule skipped); `{ max: 0 }` returns today's gated list (smoke included); `overCapAffected`: auto over cap ->
  yes; lead set affected over cap -> no; pinned / train rerun / laptop rerun / alone / at cap -> no; two parts of one
  suite count once; max 0 -> [].
- Commands: `npm run typecheck:fast`, `npx vitest run tests/e2eAffected.test.ts tests/laptop-queue.test.ts
  tests/autoTrain.test.ts tests/mergeTrain.test.ts`, `npm run lint` (doc-lint budgets).
- Manual: `node scripts/run-e2e.mjs --affected origin/master --list` on 3 open PR heads (detached) and
  `node scripts/laptop-queue/request.mjs --sha <head> --affected --dry-run`: both print the same <= 3 suites.
  After release, Test Runner runs `node scripts/laptop-queue/service.mjs --once --dry-run` on the laptop and checks the
  "would re-file" lines before the live service restarts.

## Docs
- RULES "Test tiers", the "A PR" row (:152), replaced as one line, whole new cell text:
  "CI `check` + `affected-e2e`: at most 3 suites, the closest to the folders the PR touches (`affectedPick` in
  `scripts/e2e-affected.mjs`: most changed files reached, then the most specific `DIRECT_COVERS` row, then the shorter
  time; `node scripts/run-e2e.mjs --affected origin/master --list` names them; `E2E_AFFECTED_MAX` / `--affected-max`,
  0 = no cap). `src/net`, `src/save` and wire changes (a file `src/net/protocol.ts` imports) run exactly the co-op
  group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`. The train's full run catches the rest. A checker gate on top: for
  `src/player` or `src/game` the lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`) and the checker passes only
  when they are green".
- testing-tools.md "Choosing suites for a change" (:87-122): the first bullet's last two sentences (:92-94, "Without
  `--list` it runs them like `--quick` ... after the map).") become: the list is `affectedPick`: the map, the wire rule
  (unchanged wording), the gate (GPU, LEGACY and AUDIO left out, so `--affected` no longer lists LEGACY / AUDIO as
  REPORT ONLY; today's code lists them REPORT ONLY because :150 does not gate), then the cap: at most 3 suites, the
  closest (RULES "Test tiers"; ranking in `rankAffected`'s comment; `--affected-max=N` / `E2E_AFFECTED_MAX`, 0 = no
  cap; `--wide` uncapped unless given); without `--list` it runs them like `--quick`. The :106 sentence ("Every
  LEGACY and GPU suite is reachable ... (LEGACY and AUDIO run REPORT ONLY ...)") shortens its parenthesis to "(an
  affected pick gates them out at any size and with `--wide`; `--quick` runs LEGACY / AUDIO REPORT ONLY, GPU only
  `--gpu`)" or similar, and the last bullet
  (:121-122) can drop "the runner orders it (REQUIRED first) and drops GPU suites and suites without a script" to
  "`affectedPick` gates and caps it". Trim until net zero against the 720 budget. Do not touch :569-627
  (laptop-queue-7).
- `changes/feature-affected-cap.md`: `# Smaller automatic test per change`, `kind: patch`, two bullets: the 3-suite
  cap with the co-op group rule, and the queue's re-file of open affected requests.
- Job-done: this is the job's only PR: its body carries `Job-done: affected-cap`.

## Test tier and gates
- Scripts and docs only. CI `check` (unit tests, doc lint). The selector maps `scripts/e2e-affected.mjs` and
  `scripts/run-e2e.mjs` to CORE (`scripts/laptop-queue/*` reaches no suite), so this PR's own `affected-e2e` runs
  e2e-anim, e2e-combat, e2e-move (3, under the new cap once the laptop has it; the old service runs 4 with smoke). One
  Opus checker (queue code). No flag: a process change, live at release.

## After release (Test Runner, no session needed for the re-file)
- The laptop's `selfUpdate` sees `scripts/laptop-queue` changed and restarts; the first affected turn re-files every
  open automatic affected request over 3 suites. Report the before / after suite count to the Orchestrator (queue was
  166).
