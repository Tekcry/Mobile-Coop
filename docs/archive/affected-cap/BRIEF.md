# affected-cap - brief
Owner: Test Runner. Status: current.

## Source
- ROADMAP "Decided" on origin/feature/menu (e38bf0bf0), top entry "Smaller automatic test per change", recorded by the
  Orchestrator. Relayed to the planner by the Orchestrator ~10:40.
- Size: small, top priority. Test Runner's own PR, not part of laptop-queue-8 (the entry says "its own small PR if
  quicker than laptop-queue-8").

## Michael said (verbatim, binding)
- He asked: "hows the testing queue/progress?" (2026-10-26 ~10:35; the queue held 24 requests / 166 suites, two thirds
  of them automatic affected-e2e runs of 8-18 suites).

## Michael picked (native multiple choice)
- "Cut it down (Recommended)": each change runs only its 1-3 closest test sets; every release still runs the full set.

## The decision as recorded (ROADMAP entry, Orchestrator's words; these win over the relayed message)
- `affected-e2e` on a PR head runs at most 3 suites, the closest to the folders it touches (ranked in
  `scripts/e2e-affected.mjs`); the train's full `npm run e2e` is unchanged and catches the rest (auto-drop removes a
  failing member).
- Assumed by the Orchestrator (undo: restore the full DIRECT tier): `src/net`, `src/save` and wire changes keep the
  co-op group (e2e-coop + e2e-netmove + e2e-ctcourse) as their 3; the `src/player` / `src/game` co-op checker gate
  stays a separate lead request.
- Built by Test Runner first, with the RULES "Test tiers" PR row rewritten in the same PR.
- From the relayed message (~10:40): "Once it is live, re-file the open affected requests at the new size so the
  backlog drops at once."

## Assumed decisions (planner; each with how to undo)
- A1 Ranking ("closest"). Per candidate suite, compared by its base (`e2e-sectorops:1` counts as `e2e-sectorops`):
  (1) hits = how many changed files reach it (their DIRECT row names the base), more first; (2) depth = for the files
  that reach it, the length of the shortest DIRECT_COVERS key that matches the file and names the base (so a suite only
  a specific row adds, like `e2e-traverse` for `src/player/traversal`, ranks above the folder's shared suites); a suite
  script or helper outside `src/` counts as the deepest; an unmapped path (CORE) as 0; deeper first; (3) shorter
  expected time from `scripts/e2e-times.json` (a parted suite: the sum of its part keys whenever they exist, even when a
  whole-suite key exists too, as for `e2e-sectorops`; a part token: its own key; no entry: 60 s); (4) name.
  Deterministic, file order irrelevant. Undo: another sort key in `rankAffected`, one function.
- A2 One place. `affectedPick(files, { max, wide, protocolTs })` in `scripts/e2e-affected.mjs` = DIRECT (or WIDE)
  select, master's wire rule (`withWireSuites`), the GPU / LEGACY / AUDIO gate, then the cap. `run-e2e.mjs --affected`,
  `request.mjs --affected` and the service's automatic requests (both through lib `affectedSuites`) all call it, so
  `--list` names what the laptop runs (the time tie-break reads each checkout's `scripts/e2e-times.json`). Lift:
  `--affected-max N` and env `E2E_AFFECTED_MAX`, read by run-e2e and request.mjs only; 0 = no cap = today's gated list,
  `smoke` included. The service never reads the env: its automatic requests and the re-file (A7) both use
  `AFFECTED_MAX`. Undo: set `AFFECTED_MAX` to 0 (stops the cap everywhere and the re-file).
- A3 Co-op group (the decision: "src/net, src/save and wire changes keep the co-op group as their 3"). The pick is
  exactly e2e-coop + e2e-netmove + e2e-ctcourse, whatever else the PR touches, when (a) any changed file's DIRECT row
  names all three (`src/net/`, `src/save/` (the shape), `src/save/sectorRecord`, `src/security/data`), or (b) a
  changed file is on the wire: `touchesWire(files, wirePaths(protocolTs))`, protocol.ts as committed at the tested
  head (today `src/net/` plus the 14 files beyond it that protocol.ts imports, 15 paths in all, e.g. `src/player/moveState.ts`, `src/game/ctDevices.ts`,
  `src/game/sectors.ts`, `src/weapons/weaponDefs.ts`, `src/core/mathx.ts`). `affectedPick` applies `withWireSuites`
  before the gate, so the uncapped list is run-e2e's list of today, gated. Lib `affectedSuites` reads protocol.ts at the
  sha (`git show <sha>:src/net/protocol.ts`, '' on failure = no wire rule), so the service and request.mjs gain the
  wire rule run-e2e already has. The `src/player` / `src/game` checker gate stays separate (A6). Undo: drop (b) in
  `capAffected` (a wire file then ranks like any other).
- A4 Smoke. Not one of the 3 and no longer added beside them (Michael: "at most 3"; an 8 s boot check every suite
  repeats, and the train runs it). It stays when a changed file reaches it directly (`scripts/smoke.mjs`), and when the
  cap would leave nothing else (an audio-only change: its suites are gated, so it keeps today's lone smoke run instead
  of passing with no browser run). Undo: add `smoke` back after the cap in `capAffected`.
- A5 Counting. A suite counts once whether it runs whole or as parts (`e2e-ctcourse` = 4 parts = 1;
  `e2e-sectorops:1` and `:6` from two files = 1 slot, both parts kept). `--wide` is a lead's explicit wide run and is
  not capped unless `--affected-max` is given. Auto-drop (`suiteSetFor`, `coverFolders`) stays uncapped: it must see
  every suite a train member reaches. Undo: count parts as suites in `capAffected`.
- A6 Checker gate kept (the Orchestrator's assumption; recommended): with 3 suites a `src/player` / `src/game` PR has
  even less co-op cover before the train, so the lead's e2e-coop + e2e-netmove request stays the checker's gate. The
  RULES row keeps it in one sentence. Undo: drop the sentence from the row.
- A7 Re-filing is a service step, no session needed: each affected turn (laptop, before `affectedPass`) every open,
  unclaimed automatic affected request (requester `affected-e2e` only; kind pr; not pinned, not a train rerun, not a
  laptop rerun) whose distinct suite bases exceed `AFFECTED_MAX` gets its suites recomputed with lib `affectedSuites`
  (the default cap) and its file rewritten in place under the same id: it keeps its queue place (the ~10:12 "fixed
  change keeps its old place" spirit) and its pending `affected-e2e` (re-posted with the new count). A lead's own
  request is never narrowed: request.mjs `--affected` writes no set and the lead's requester, and set `affected` on a
  non-automatic request marks a lead's hand-filed request. A request at or under the cap is left alone, so the step is
  idempotent and costs one filter per turn. Undo: `AFFECTED_MAX = 0` in code stops both the cap and the re-file
  (nothing exceeds no cap); the rewritten files keep their old suites in git history.
- A8 laptop-queue-7 (#507, open; cut from 2a937eb6b, whose lib, service, request.mjs, lq test and RULES equal master
  3f0ab7fec line for line, and whose testing-tools differs only above :121 with net zero lines). This PR edits no line
  inside or next to #507's hunks: lib the import (:4), the `affectedSuites` doc and body (:969-986; #507's nearest
  change is :990, the `affectedNeeds` doc) and one new function after `affectedRequest` (:1021; #507 inserts before its
  doc, after :1013); service two new import lines after :104 (#507 rewrites the :103 lib import), a new function before
  `// ---------- task guard` (:368; #507's nearest hunks :199 and :438), the two `affectedPass()` calls in `main`
  (:1600, :1611) and `selfUpdate`'s watched paths (:1587; #507's last hunk is :1560 in `pass`); lq test a new import
  after :7 (#507 rewrites :3), edits in :1139-1152 and new `it`s after :1153 (#507 inserts after :1182 and :1388);
  testing-tools only "Choosing suites for a change" (:87-122; #507: :569-627); RULES only the "Test tiers" PR row
  (:152; #507: :167-171). Whichever merges second rebases on a clean tree.
- A9 `selfUpdate` (service.mjs:1587) also watches `scripts/e2e-affected.mjs`: today a map or cap change there alone
  never restarts the service, whose cached module keeps the old picks. Undo: remove the path.

## Out of scope
- The full train e2e, auto-drop, `--quick`, `--wide` contents, the DIRECT / WIDE / QUICK maps themselves.
- Queue order (laptop-queue-7 / -8), fixes-first ranking (laptop-queue-8).
