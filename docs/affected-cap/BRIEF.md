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
- A1 Ranking ("closest"). Per candidate suite: (1) hits = how many changed files reach it (their DIRECT row names it),
  more first; (2) depth = for the files that reach it, the length of the shortest DIRECT_COVERS key that matches the
  file and names the suite (so a suite only a specific row adds, like `e2e-traverse` for `src/player/traversal`, ranks
  above the folder's shared suites); a suite script or helper outside `src/` counts as the deepest; an unmapped path
  (CORE) as 0; deeper first; (3) shorter expected time from `scripts/e2e-times.json` (a parted suite: the sum of its
  parts; a suite with no entry: 60 s); (4) name. Deterministic, file order irrelevant. Undo: another sort key in
  `rankAffected`, one function.
- A2 One place. `affectedPick(files, { max })` in `scripts/e2e-affected.mjs` = DIRECT select, then the GPU / LEGACY
  gate, then the cap. `run-e2e.mjs --affected`, `request.mjs --affected` and the service's automatic requests (both
  through lib `affectedSuites`) all call it, so `--list` names exactly what the laptop runs. Lift: `--affected-max N`
  on run-e2e and request.mjs, env `E2E_AFFECTED_MAX` for all three (the service reads it too); 0 = no cap = today's
  gated DIRECT list, `smoke` included. Undo: set `AFFECTED_MAX` to 0.
- A3 Co-op group. When any changed file's DIRECT row names all three co-op suites (`src/net/`, the save shape
  `src/save/`, `src/save/sectorRecord`, `src/security/data`: today's DIRECT meaning of "src/net, src/save and wire"),
  the pick is exactly e2e-coop + e2e-netmove + e2e-ctcourse, whatever else the PR touches. Files that merge-train's
  `wirePaths` counts as wire for the PROTOCOL_VERSION bump (protocol.ts imports such as `src/player/moveState.ts`,
  `src/core/mathx.ts`, `src/world/mapDef.ts`) are not forced to the group: "keep" means what they get today, and the
  checker gate covers `src/player` / `src/game`. Undo / widen: pass `wirePaths(protocol.ts at the head)` into
  `affectedPick` as extra co-op paths.
- A4 Smoke. Not one of the 3 and no longer added beside them (Michael: "at most 3"; an 8 s boot check every suite
  repeats, and the train runs it). It stays when a changed file reaches it directly (`scripts/smoke.mjs`). Undo: add
  `smoke` back after the cap in `affectedPick`.
- A5 Counting. A suite counts once whether it runs whole or as parts (`e2e-ctcourse` = 4 parts = 1;
  `e2e-sectorops:1` and `:6` from two files = 1 slot, both parts kept). `--wide` is a lead's explicit wide run and is
  not capped unless `--affected-max` is given. Auto-drop (`suiteSetFor`, `coverFolders`) stays uncapped: it must see
  every suite a train member reaches. Undo: count parts as suites in `capAffected`.
- A6 Checker gate kept (the Orchestrator's assumption; recommended): with 3 suites a `src/player` / `src/game` PR has
  even less co-op cover before the train, so the lead's e2e-coop + e2e-netmove request stays the checker's gate. The
  RULES row keeps it in one sentence. Undo: drop the sentence from the row.
- A7 Re-filing is a service step, no session needed: each affected turn (laptop, before `affectedPass`) every open,
  unclaimed affected request (requester `affected-e2e`, or set `affected` from `request.mjs --affected`; kind pr; not
  pinned, not a train rerun, not a laptop rerun) whose suites exceed the cap gets its suites recomputed with
  `affectedSuites(.., { max })` and its file rewritten in place under the same id: it keeps its queue place (the
  ~10:12 "fixed change keeps its old place" spirit) and its pending `affected-e2e` (re-posted with the new count). A
  request already at or under the cap is left alone, so the step is idempotent and costs one filter per turn. Undo:
  `E2E_AFFECTED_MAX=0` stops it (nothing exceeds no cap); the rewritten files keep their old suites in git history.
- A8 laptop-queue-7 (#507, open, edits lib.mjs / service.mjs / tests / testing-tools.md / RULES "Machines"): this PR
  edits no line inside or next to its hunks: lib only the `affectedSuites` body (:976-986) and one new function after
  `affectedRequest` (:1021); service a new function before the task guard (:371), a separate import line, the two
  `affectedPass()` call sites in `main` and `selfUpdate`'s watched paths (:1587); testing-tools only "Choosing suites
  for a change" (:86-112); RULES only the "Test tiers" PR row (:152). Whichever merges second rebases on a clean tree.
- A9 `selfUpdate` (service.mjs:1587) also watches `scripts/e2e-affected.mjs`: today a map or cap change there alone
  never restarts the service, whose cached module keeps the old picks. Undo: remove the path.

## Out of scope
- The full train e2e, auto-drop, `--quick`, `--wide` contents, the DIRECT / WIDE / QUICK maps themselves.
- Queue order (laptop-queue-7 / -8), fixes-first ranking (laptop-queue-8).
