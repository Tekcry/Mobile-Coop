status: blocked base not set: waits for R4a PASS (lead fills Base, then sets status: open)
# J13 route-runs, slice R5 (Opus-grade brief): link steps, pad only

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 6fab6ef0f). R1-R3 are on master; R4a ships
`steps.mjs` with every kind a stub. This slice makes the solo off-nav links walked with the pad. Sector Ops' campus v2
greybox exit waits on R4a / R4b / R5 / R6.
Builder: Opus (PLAN R5). Recommended home: **cloud**, built as pure step machines tested in vitest; see "Cloud or
local" at the end.

- Base: R4a's done branch head (lead fills on R4a PASS): `feature/route-runs-r4a` @ `<sha>`. If R4a has merged by the
  time this starts, origin/master at or after that merge. R5 does not wait for R4b (they run in parallel; PLAN `:317-320`).
- New branch: `feature/route-runs-r5`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec on `origin/feature/route-runs-2`:
  `docs/route-runs/PLAN.md` slice **R5** (`:221-231`), the R4a seams (`:154-161`) and selftest fixtures (`:162-166`),
  R3 (`:122-133`), order and ownership (`:317-320`), Tests (`:322-327`), Checker gate (`:329-335`);
  `docs/route-runs/BRIEF.md` "Solo off-nav links" `:101-102`, "Dead stops" `:77-82`, A4 `:190-197`, A5 `:199`. Then
  R4a's `scripts/route-run/steps.mjs` and the parts of `driver.mjs` that call it, in full, on the base.

## The R4a seam this fills
`scripts/route-run/steps.mjs` (R4a; R5 owns it next, then R9): a table from link kind to step, every kind `stub` in
R4a. Each step is a Node-side async `step(ctx, link)`; `ctx` carries both pages (`host`, `client`; `client` null at
`--players 1`), the pads, the host clock and the limit (PLAN `:154-158`). Names as R4a's brief and PLAN give them; where
R4a's code names them differently, use R4a's names and say so in the report.
- Key the table as R4a does (R1 gives every link step an `action`, `scripts/route-run/plan.mjs:18-21`, `:65-69`,
  `:342-356`: `door`, `walk`, `ladder`, `drop`, `window`, `hatch`, `duct`, `rappel`, a rare solo kind's own name, or
  `stub` for a co-op kind) and keep `door` and `walk` (fire and open stairs, openings) as R4a ships them.
- Advance the game only through `ctx`'s clock call. R4b makes that call step both pages in lockstep; a step that calls
  `loop.stepHeadless` itself would desync the pair. If R4a's `ctx` has no such call, use what R4a's door step uses and
  note it for the lead (R4b adds the both-pages call).
- Return to the driver in R4a's step-result shape: walked, stub (with `why`), or a dead stop (`step-timeout` with its
  limit, or `locked`); the driver logs it and does the recovery past the link. **No driver edit**: a driver change this
  slice needs goes to the lead as an R4b fix (PLAN `:160-161`).

## What to build
Each step is a **pure step machine** plus a thin page reader, so the logic is unit tested without a browser:
`machine.update(reading, t) -> { stick: [x, y], press: [buttons], hold: [buttons], done, result }`, fed a plain
`reading` each poll (the fields `scripts/e2e-traverse.mjs` `info()` reads, `:103-118`: `x, y, z, yaw, grounded,
attached, kind, phase, s, hint` (`"<anchor kind>:<entry>"` from `attachCtl.hint` or `attachCtl.lower`), `prompt`,
`dropPrompt`, `vent`, `tkind`), plus the robot's path progress. Stick values are the game's (x right, y forward; R3
convention, `progress.mjs:11-12`); buttons are `BTN` from `scripts/e2e-lib.mjs:243` (A 0, B 1, Y 3). The page reader
builds the reading from `window.__app.current` (`player.controller`, `traversal.attachCtl`, `hud.world.label(...)`) and
allocates nothing per poll. Sequences come from the game's own traversal suites (master):
- **ladder** (`scripts/e2e-traverse.mjs:152-218`): steer to the link's `at` at the foot (or the top when walking it
  down: `link.reverse` or the `to` space is the lower storey), until `hint` is `ladder:bottom` / `ladder:top`; tap Y;
  stick forward (up) or back (down) while `attached`; done when detached and grounded on the far storey (y within R3's
  `STOREY_Y_TOL_M` of the `to` floor). A top-out ends crouched (`:183`): the walk after it stays crouched (sneak pace).
- **drop** (one way): steer past the edge toward the `to` side; done when grounded on the lower storey. If the walk-off
  stalls at the edge and the hint is `ledge:above`, hold B to lower into a hang, then tap B to let go
  (`scripts/e2e-traverse.mjs:319-332`). No height threshold of its own: the stall decides.
- **window**: steer to `at` until the vault prompt shows (`hint` / `prompt`, `scripts/e2e-traverse.mjs:415-431`); tap
  Y; done when grounded on the `to` side of the sill. A glazed window shatters and is loud: that is the route, log
  nothing extra (the noise reaches the guards through R4a's `hear` wrap).
- **hatch**: as window, through the climb-through the game offers at the hatch (`hint` names it). No hatch offered by
  the limit: `step-timeout`.
- **duct** (`scripts/e2e-traverse.mjs:433-502`): at the mouth until `hint` is `duct:side`; Y then A held until
  `attached` with `kind` `duct` (the grate unscrews quietly); stick forward while attached; done when detached and
  grounded past the far end.
- **rappel** (`scripts/e2e-ct-warehouse.mjs:125-146`): at the roof edge until `hint` is `rappel:above`; tap Y; wait for
  `attached`, `kind` `rappel`, `phase` `on` (hook time about 1.8 s); stick back to descend; done when detached and
  grounded on the lower storey. A window kick-through on the way is not part of this step.
- **Limits**: each step's limit is R3's `stepLimit(kind, lengthM)` (`progress.mjs:315-336`: door 5 s, ladder 15 s +
  1 s/m, drop 5 s, window and hatch 8 s, duct 2 s/m) on the link's `limit_s` from R1 when set. A kind with no limit of
  its own (rappel, a duct with no length) runs under R4a's 8 s stall watch on 3D progress. Add no new tolerance
  constant (BRIEF A4: these are named in `progress.mjs` only; R5 does not edit it).
- **The anchor is missing** (the link says ladder, the map has none there): the prompt never shows, the step runs to its
  limit and returns `step-timeout`. Never a stub.
- **Rare solo kinds** (`ledge`, `pipe`, `wall_jump`, `split_jump`): stay `stub`, hold as R4a holds, `why` "no step
  yet: <kind>", listed in the report (BRIEF "Solo off-nav links"). Co-op kinds stay `stub` (R9 takes them).
- **Both robots**: with `ctx.client` set (after R4b), the leader takes the step first; the follower then takes the
  same step on its own page with its own machine and limit; a follower timeout is a dead stop with `robot: "follower"`.
  With `ctx.client` null, the leader only.
- **Code-route climbs** (`--routes code`, `src/game/sectors.ts:66-78`: a `climbs` leg is a ladder, hop, vault, climb or
  cable with no kind given): if R4a routes those legs through `steps.mjs`, classify each from the page's anchors near
  the leg (`world.level.anchors.ladders`, `windows`, `ducts`, `rappels`, `ledges`, as `scripts/e2e-anchors.mjs` reads
  them): a ladder within 1.5 m of either end -> ladder; a window -> window; a duct -> duct; a rappel -> rappel; the
  end more than 1 m below the start and none of these -> drop; else stays `stub` with `why` "code climb: unclassified".
  The classifier is pure and unit tested. If R4a stubs code-route climbs before `steps.mjs`, leave it and write the
  one-line driver change in the report for the lead (an R4b fix).
- **Selftest fixture** `tests/fixtures/route-run/selftest-steps.graph.json`, in R4a's selftest format with its own
  `expect` block (never edit another slice's fixture): a copy of R1's `tests/fixtures/route-run/campusOps-S1.graph.json`
  (and its points from `campusOps-S1.points.json`) plus one fixture-only `ladder` link where the map has no ladder
  (for example `s1-lawn` -> `s1-plantroof`, `level_change` 4.4, its `at` on open lawn), its `meta` note saying so.
  `expect`: the real ladder `s1-dyard` -> `s1-plantroof` (merged index 12) walked; the drops `s1-canopy` /
  `s1-pavilion` -> `s1-forecourt` (19, 20) walked where a run takes them; the windows `s1-verge` -> `s1-gatehouse`
  (0, open, shadow) and `s1-lane` -> `s1-gatehouse` (2, glazed, loud) walked; the fixture ladder a `step-timeout` stop
  at 15 + 4.4 s, then the recovery and the run walks on; the two `coop_boost` links still stubs. Check the runs with
  `--dry-run` first.

## Only files to edit
`scripts/route-run/steps.mjs`, `tests/fixtures/route-run/selftest-steps.graph.json` (new), `tests/routeRunSteps.test.ts`
(new; inside PLAN's `tests/routeRun*.test.ts` claim), `changes/feature-route-runs-r5.md` (new, `kind: patch`: tooling
and tests). Put the step machines in `steps.mjs` (one file, PLAN `:227`); keep it importable without Playwright.

## Forbidden
- Everything under `src/` (no game code, PLAN `:43-45`); no flag.
- `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `pair.mjs` (R4b's), `course.mjs` (R4c), `causes.mjs` (R7),
  `publish.mjs` (R4a), `points.mjs` (R6), `coop.mjs` (R9), R1-R3's `plan.mjs`, `progress.mjs`, `report.mjs`, other
  slices' fixtures and tests. A change you need there goes in the report for the lead.
- `scripts/e2e-*.mjs` (read the patterns, never edit), `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs`,
  `scripts/laptop-queue/**`.
- `docs/level-design.md`, `docs/systems/testing-tools.md` (R8 only), `docs/route-runs/**` (the lead's).
- Hard rules (master `CLAUDE.md`): the page reader and the machines' `update` allocate nothing per poll; `hyp2` /
  `hyp3`, never `Math.hypot`; headless, no pointer lock.

## Unit tests (`tests/routeRunSteps.test.ts`, no browser)
- The table: each R5 kind maps to its step; `ledge`, `pipe`, `wall_jump`, `split_jump` give `stub` with `why` "no step
  yet: <kind>"; co-op kinds stay `stub`; `door` and `walk` unchanged from R4a.
- Each machine on scripted readings: ladder up from the bottom (hint, Y, stick up, top-out, done on the upper storey);
  ladder down from the top; ladder never offered -> `step-timeout` at 15 + 1 s/m and not at 1 poll before; drop
  walked off; drop that stalls at the edge -> B held, hang, B tapped, done on the lower storey; open window (Y, done
  past the sill); hatch never offered -> `step-timeout` at 8 s; duct (Y, A held to attach, stick forward, done past the
  end; limit 2 s/m of `length`); rappel (Y, hook, descend, done grounded); rappel with no limit falls to the stall watch.
- The follower: with a client, the leader's machine runs first, then the follower's; a follower timeout names
  `follower`.
- The code-climb classifier: each anchor case above and the unclassified fallback.

## Checks
- Cloud-safe (tsc + vitest): `npx tsc --noEmit -p .` (`npm run typecheck:fast` on the desktop);
  `npx vitest run tests/routeRunSteps.test.ts tests/routeRunPlan.test.ts tests/routeRunProgress.test.ts
  tests/routeRunReport.test.ts` plus R4a's `tests/routeRunCli.test.ts`; `node scripts/route-run.mjs --dry-run --graph
  tests/fixtures/route-run/selftest-steps.graph.json` lists the ladder, drop and window steps with their limits and
  opens no browser.
- Pending PC run (laptop queue, `E2E_GPU=1`, alone; the lead requests on the PR head):
  - `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
    http://127.0.0.1:4189/ --selftest tests/fixtures/route-run/selftest-steps.graph.json --players 1" --set
    route-run-selftest-steps --requester "Night Shift | Marlow Build"`; verdict `laptop-e2e/alone-route-run-selftest-steps`.
  - code-route runs of campusOps S1 and S2 (`--routes code --section S1`, then `--section S2`, `--players 1`;
    `--set route-run-steps-s1s2`).
  - once R4b is in: the steps selftest again at `--players 2` (both robots take each step).

## Done
PLAN R5's line (`:230-231`): the campus S1 / S2 ladders and drops are walked, not stubbed; the fixture's missing ladder
gives a `step-timeout` stop at its limit. Plus: S1's two windows are walked; every rare solo kind on a run is listed as
a stub with its reason; R4a's selftest still passes. Code parts here; page parts are the pending PC runs.

## Size
About 1,150 lines: `steps.mjs` ~650 (six machines, the reader, the table, the classifier), test ~350, fixture ~150 (copy
+ one link). PLAN estimate 700 + the test. Under ~1.5k.

## Report
Append at the end of this file: what changed, tests with counts, deviations from this brief (any R4a name that
differed, any sequence that differs from the traversal suites and why), the pending PC runs above for the lead, and any
driver change for R4b. Then `status: done feature/route-runs-r5 <sha>`, or `status: blocked <reason>` for a question
the brief cannot settle. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Cloud or local
**Cloud.** The step sequences are already proven in the game's own traversal suites (ladder, drop, window, duct,
rappel), so the builder transcribes them into pure step machines and tests every branch in vitest on scripted readings;
the page reader is small. What tsc and vitest cannot show (a prompt that shows late on a loaded laptop, an `at` point a
little off a ladder foot) is found by the pending PC runs, and that fix round is a local Opus job on the lead's side.
It runs beside R4b (local) without sharing a file.
