# light-parity - plan (FOLDED-PLAN J11)

Owner: Night Shift | Sector Ops Build. Status: current.

Brief: `docs/light-parity/BRIEF.md` (Michael's picks Q27, Q26, Q2, Q16; A1-A15). Claims re-found on origin/master
2148ec969 (train 95); `path:line` is that commit unless a branch is named. Opus plan; a fresh Opus plan checker passes
it before any build (RULES "Intake" 4).

## 1. Goal and done
Picture, meter and guards agree for every co-op player and on every carded map at Low and Epic, and every release
proves it on the laptop GPU (Q27). Done when:
- a late joiner or rejoiner into a later Saltmarsh Park section bakes that section first (N1);
- a lamp that fails to bake on any machine is dark on every machine, picture, meter and guards alike (N2);
- `e2e-parity` (new, required) cards campusOps S1-S5, ctcourse and the Warehouse at Low and Epic, holds the 0.27 row,
  pins flicker, checks meter = field at every card, and runs in every train (C1, C2);
- each release's `parity` result is on its walk card (Q1 and section 6);
- the S1 moonlit miss (V1) and the S3 meter split (V8) are triaged (T1), fixed (F1) and off the `KNOWN` list (K1).

Not in this job: warehouseOps (A1, Q26), J10's lux work, J16 character shadows.

## 2. Claims (re-found on 2148ec969)
Wire and co-op:
- `PROTOCOL_VERSION = 62` at `src/net/protocol.ts:21`; the train bumps it once when a member touches a wire path
  (`scripts/merge-train.mjs:326` `wirePaths`, `:1095-1107`). No slice edits the number; tests read the constant.
- `start` message type `src/net/protocol.ts:285`, parser `:944-951`; `lamps` type `:341-342`, parser `:1037-1042`.
- `StartInfo` `src/net/session.ts:16-26`; `lateBay` hook `:72`; a late join / rejoin gets `start` from the host at
  `:190-195` (course `bay` from `lateBay`); host-accepted client messages `:205`; client `start` `:251-255`;
  `startMsg` `:380-383`.
- Host sets `lateBay` `src/net/coopHost.ts:240` (cleared `:1971`); lamp sender only in Sector Ops `:207`, sent
  `:1805-1816`. Client applies `lamps` `src/net/coopClient.ts:286-288`; learns the live section from `ls`
  `:992-993` (after it has loaded).
- `CoopUi.start` builds the `GameOptions` from `StartInfo` `src/net/coopUi.ts:188-214`.
- Late-join gap: the client's load waits for section 0 (`src/game/gameState.ts:968-975` waits for `sb.plan.live`,
  which is 0 because `src/world/lightBake.ts:108` builds the `SectionBaker` without `live`; the baker accepts it,
  `src/voxel/sectionJobs.ts:151`). Recorded as open risk 1 in `docs/sector-redesign/checks/section-bake-build.md:80-82`.
  `World.create` gets `WorldOptions` `src/world/world.ts:58-64` and calls `bakeLevelLight` at `:192`; `GameState`
  calls `World.create` at `src/game/gameState.ts:926`; `GameOptions` at `:148`.
- Failed lamp: `SectionBaker.retryInline` lands a lamp with empty visibility when the inline bake throws
  (`src/voxel/sectionJobs.ts:368-380`, `failed` `:98-99`, `incomplete` `:196-198`); "lands dark for this match only"
  (`docs/systems/lighting.md:182-184`). The fitting glow and the other machines still read it lit.
- Light states: `LightDef.on` / `destroyed` `src/world/lights.ts:38`, `:41`; `contribution` returns 0 when off or
  destroyed `:104`; `baseOn` `:342`; `destroy` needs `destructible` `:377-384`; `restore` `:387-399` and `resetTo`
  `:407-424` bring a destroyed lamp back (section restart, course restart). Lamp sync states and wire
  `src/net/lampSync.ts:22-32`, `lampState` `:41-44`, `encodeLamps` `:65-67`, `decodeLamps` `:78-82`, `applyLamps`
  `:91-108`.

Parity tests:
- `scripts/e2e-darkness.mjs:9-18`: Warehouse only, Epic only, the four rows; flicker forced to 1 only inside the probe
  search `:34-37`; card render and read `:100-147` (`measure`, `readLuma`). `DARK_TARGETS` `src/world/darkCurve.ts:86-91`.
- `e2e-darkness` sits in `GPU` (`scripts/e2e-affected.mjs:19`), not in `REQUIRED` (`scripts/run-e2e.mjs:35`), so a
  train skips it (T3); affected picks it for light files (`scripts/e2e-affected.mjs:117-118`, `:228`); affected requests
  drop GPU suites (`affectedGateSuites`, tests `tests/e2eAffected.test.ts:280-290`).
- A train runs `run-e2e.mjs --list` from the train head (`scripts/laptop-queue/service.mjs:1003`) with `E2E_GPU=1`
  (`:810`): a suite in `REQUIRED` runs in every train on the laptop GPU.
- Flicker: `LightRegistry.tickFlicker` `src/world/lights.ts:278`, called once per fixed step before the meter
  `src/game/gameState.ts:1663`; `flickering` `lights.ts:246`, `flickerVersion` `:170`. Meter
  `src/game/gameState.ts:1690` (`bodyLevel`, `src/world/lightField.ts:240`); perception reads it (CONFORMANCE section 2).
- Visual gate (unmerged): campus cards `feature/visual-gate@07eefea0 scripts/visual-gate/viewpoints.mjs:292` (view
  `cp-s1-f`; card 1 `(-24.5, 1, -47.9)` is V1's `card-cp-s1-f-1`); edge skip `metrics.mjs:581`; `cp-s3-c` meter point
  `viewpoints.mjs:355-358` (feet `(46, 0, -24)`); results pusher `scripts/visual-gate/push-results.mjs`.

## 3. Slices

| # | Slice | Files (main) | Lines | Model | Depends | PR |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | Late-join section hint: `start.ls`, the client bakes the host's live section first | `src/net/{protocol,session,coopHost,coopUi}.ts`, `src/game/gameState.ts`, `src/world/{world,lightBake}.ts`, tests, `scripts/e2e-sectorops.mjs` | ~230 | Opus | - | A |
| N2 | Failed-lamp sync: a failed lamp is dark on every machine (`lfail` up, `lamps.fl` down) | `src/world/lights.ts`, `src/voxel/sectionJobs.ts`, `src/world/lightBake.ts`, `src/net/{lampSync,protocol,session,coopHost,coopClient}.ts`, tests, `docs/systems/lighting.md` | ~400 | Opus | N1 (same branch, after it) | A |
| C1 | `e2e-parity`: per-map, per-section grey cards at Low and Epic, 0.27 row, flicker pin, meter rows, `KNOWN`, summary line; Warehouse cards move from e2e-darkness | `scripts/parity-lib.mjs` (new), `scripts/e2e-parity.mjs` (new), `scripts/e2e-darkness.mjs`, `tests/parityLib.test.ts` (new) | ~700 | Sonnet (Opus brief) | - | B |
| C2 | Train wiring: `e2e-parity` in `REQUIRED` with parts, affected for light files, docs | `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs`, `tests/e2eAffected.test.ts`, `scripts/e2e-times.json`, `docs/systems/testing-tools.md` | ~80 | Sonnet | C1 (same branch) | B |
| Q1 | Laptop queue posts the `parity` status on each train head from the `PARITY-SUMMARY` lines | `scripts/laptop-queue/{lib,service}.mjs`, its test | ~100 | Sonnet (Test Runner) | C1's summary format | Test Runner's |
| T1 | GPU triage: S1 moonlit card (V1), S3 meter split (V8), the provingGrounds moonlit miss as a second sample; which side is wrong and why | `scripts/light-parity/triage.mjs` (new), `scripts/light-parity/push-results.mjs` (copied), `docs/light-parity/checks/T1-triage.md` | ~350 | Opus | - | C |
| F1 | The fix T1 names (moon / ambient side: J11; lamp side: from J10) | per T1 | <= 600 | Opus | T1; from J10 (S1 re-bake) when T1 says lamp side | C or D |
| K1 | Clear the `KNOWN` list, re-run 3 proofs | `scripts/e2e-parity.mjs` | ~20 | Sonnet | F1; from J10 (S1 relit) | D |

Briefs written now (they do not wait on J10): `briefs/N1.md`, `briefs/N2.md`, `briefs/C1.md`, `briefs/C2.md`,
`briefs/Q1.md`, `briefs/T1.md`. F1 is briefed from T1's report; K1 after F1.

Parallel now: N (one Opus builder, N1 then N2 on `feature/light-parity-net`), C (one Sonnet builder, C1 then C2 on
`feature/light-parity-suite`), T1 (one Opus builder on `feature/light-parity-triage`), Q1 (Test Runner). No two share
a file. Slice branches are cut from `feature/light-parity`; only the lead edits `docs/light-parity/{BRIEF,PLAN,STATE}.md`
(on `feature/light-parity`); builders write only their own `docs/light-parity/checks/<slice>.md`.

PRs (each under ~1.5k lines): A = N1 + N2 (~630), B = C1 + C2 (~780), C = T1 (+ F1 when J11-side and small), D = K1
(+ F1 when it waits on J10). Each carries its fragment `changes/<branch-with-dashes>.md` (`kind: patch`). The last PR
carries `Job-done: light-parity`.

## 4. The wire change (PR A: N1 + N2)
Messages (all optional fields, parsed and clamped in `src/net/protocol.ts`):
- `start` gains `ls?: number` (integer 1..63): the host's live bake section, sent only to a late joiner / rejoiner
  (`session.ts:190-195`) when the host's map bakes per section and its live section is above 0 (A9). Host source: a
  `lateSection` hook on `NetSession` beside `lateBay`, set by `CoopHost` to the bake's live section
  (`g.world.lightBake?.sections?.plan.live`). Client path: `StartInfo.ls` -> `GameOptions.sectionStart` (`CoopUi`) ->
  `WorldOptions.liveSection` -> `bakeLevelLight` input `live` -> `new SectionBaker({ ..., live })`. `GameState.create`
  already waits for `sb.plan.live`, so the client's load now waits for the host's section. Single player never sets it.
- `lfail` (client -> host, new): `{ t: 'lfail', ids: number[] }`, 1-8 registry ids each `< LAMP_MAX`. Sent once per
  newly failed lamp (batched, at most once a second). Host: validates, caps 8 per client per match (A15), marks each
  failed.
- `lamps` gains `fl?: string`: a 6-bit bitset of failed lamps, present only when one is failed. Decode order: failed,
  then shot, then off.
Light side (`src/world/lights.ts`): `LightDef.failed`; `fail(id)` sets failed, `destroyed`, `on = false`, bumps
`version` for any fixed light (no `destructible` check, no shot cue); `restore` and `resetTo` leave a failed lamp dark
(a section or course restart cannot relight it). Every reader that already treats a destroyed lamp as dark (field,
contribution, baked lamp texel, pools, glow, haze) then treats a failed one the same way with no further change.
`SectionBaker` reports a lamp that failed every way (`onFailed` listener); `bakeLevelLight` maps the lamp index to its
registry id (`baked.ids[i]`) and calls `reg.fail(id)`, in every mode. The host's own failures reach clients through
`fl`; a client's reach the host through `lfail`.

Protocol note for the PR body: "Wire change: `start.ls`, `lfail`, `lamps.fl`. PROTOCOL_VERSION is not edited; the
train bumps it."

Checks: `npm run typecheck:fast`, the vitest files named in the briefs. Laptop: the PR head's `affected-e2e` runs the
co-op group by itself for `src/net` (`e2e-coop` + `e2e-netmove` + `e2e-ctcourse`, plus `e2e-sectorops` and the light
suites for `src/voxel` / `src/world`); `src/game/gameState.ts` is also touched, so the lead requests the co-op group
explicitly too (RULES "Test tiers" checker gate):
`node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites "e2e-coop e2e-netmove e2e-ctcourse" --set coop --requester "Night Shift | Sector Ops Build"`.
Two independent Opus checkers on the head (RULES "A job": `src/net`), each posting the `checker` status.

## 5. The parity suite (PR B: C1 + C2)
What it measures (bible L5): for each carded map, at Low and at Epic, a matte 50% grey card at a point whose field
level matches a `DARK_TARGETS` row, facing that point's strongest light, read as display luma after tone mapping,
grade and post, against the row's band; and at every card point, the light meter (`g.lightLevel`) against the field's
`bodyLevel` at the same feet with flicker pinned (tolerance 0.02, V8).
- Maps and parts (A5): `e2e-parity:1` campusOps S1-S2, `:2` campusOps S3-S5, `:3` ctcourse, `:4` warehouse. Each
  section of campusOps (`src/world/maps/campusBake.ts` regions) gets at least 3 cards (V4); ctcourse at least 8 across
  the map; the Warehouse its four rows. A section that has no point for a row prints `no point` for it (not a miss);
  fewer than 3 cards in a campus section fails.
- Presets (A4): `gfx=low` and `gfx=epic`, one browser each per part.
- The 0.27 row (A6, V5): `|level - 0.27| <= 0.02` and `level < 0.28`; 0.28-0.31 gets no card.
- Flicker pin (A7, V8): before any search, render or meter read, stub `tickFlicker`, set every `flickering` light to 1,
  bump `flickerVersion`; undo after.
- `KNOWN` (A2): `{ map, section, near: [x, z], r, row, conf, owner, until }`; a miss inside it prints `KNOWN MISS` and
  passes until `until`; after `until` it fails. Starts empty; the lead adds an entry only from a T1 row.
- Output: one line per part `PARITY-SUMMARY {"part":n,"cards":{"ok":a,"total":b},"meter":{"ok":c,"total":d},"known":[...],"misses":[...]}`.
- GPU only: without `E2E_GPU=1` the suite exits 1 with "e2e-parity reads final pixels: E2E_GPU=1 only". Every queue
  run sets it (`service.mjs:810`); CI runs no e2e; cloud never runs it.
- Budget (Q27 "3-5 min more"): each part <= 150 s on the laptop GPU; sharded in a train the run grows <= ~3 min. The
  3 proof runs record the times in `scripts/e2e-times.json`.
- In trains (C2): `e2e-parity` joins `REQUIRED` with its four parts (`run-e2e.mjs` `PARTS`); light, lamp, darkness and
  voxel files pick it in `DIRECT_COVERS`. Proof before train-ready: three laptop runs on the PR head
  (`--suites "e2e-parity" --set parity-proof-<k>`, k = 1..3), all green apart from `KNOWN` entries, times inside the
  budget. One Opus checker (it changes the release gate).

## 6. The per-release parity card (Q27)
- Measures: section 5's cards and meter rows on the train head, laptop GPU (`E2E_GPU=1`), as part of the train's full
  run. Script: `scripts/e2e-parity.mjs` (helpers `scripts/parity-lib.mjs`), suite `e2e-parity`, parts 1-4.
- Where the number goes: the laptop queue posts commit status `parity` on the train head (Q1), description
  `<ok>/<total> cards, <ok>/<total> meter, known <k>`. A red part already fails `laptop-e2e`, so the train does not
  release (Q27 "every release").
- Walk card: the orchestrator adds this section under "Items" in `docs/templates/walk-card.md` (template owner: the
  orchestrator; text handed over in STATE) and fills it from the `parity` status of the release's train head:

  ```
  ## Light parity (every release, Michael Q27)
  | Check | Result | Known misses (owner, fixed by) |
  | --- | --- | --- |
  | Grey cards and light meter, laptop GPU, train <n> | <ok>/<total> cards at Low and Epic (Saltmarsh Park S1-S5, Marlow Yard, Warehouse); meter <ok>/<total> | <none, or: place, owner, date> |
  ```
  Michael walks nothing for it unless a known miss is listed; then one item: "Saltmarsh S1 forecourt: the picture is
  darker than the meter says until <date>".

## 7. Triage and fix (T1, F1, K1)
- T1 (Opus, GPU): at V1's card `(-24.5, 1, -47.9)` and the other two `cp-s1-f` cards, the `cp-s3-c` meter feet
  `(46, 0, -24)` and one provingGrounds moonlit ground point, it splits the field into ambient, moon, lamps (top 3 by
  id) and bounce, renders the card four ways (full, lamps off, moon off, both off) at Low and Epic with flicker pinned,
  and reports per component the field share vs the luma share. Verdict per spot: which side is wrong (render or field),
  which component, the fix with file:line, and whether J10's S1 re-bake changes it. Runs as a laptop alone request;
  its last step pushes results to `shots/light-parity-t1` (pusher copied from the visual gate's).
- F1: briefed by the lead from T1. By G316 the meter and guards follow the picture when the picture is right (A12).
  A moon or ambient fix is J11's; a lamp-side cause (the light point in its pole head, CONFORMANCE L3) is fixed from
  J10 and only verified here.
- K1: once F1 and J10's S1 re-bake are on master, empty `KNOWN`, three proof runs green.

## 8. Risks
1. The suite finds more misses than V1 (S2-S5, ctcourse, Low). Each goes to T1's method; `KNOWN` only with a T1 row and
   a date, and Michael's answer on A2 may forbid it (then the suite stays report-only until fixed).
2. Campus cold bake per part (~22 s at 4 workers) eats the budget: parts 1-2 wait for all sections
   (`sections.whenReady(k)` for each k) once; if over budget, cut to 3 cards a section.
3. J10 relights every map: cards move with the light (they are found by level, not fixed), so J10's PRs run
   `e2e-parity` as affected and must pass it.
4. `lfail` lets a client darken lamps: capped (A15), host-validated ids, logged.
5. A cache hit on the client skips the section bake: the hint is harmless there (A9).

## 9. Handoffs
- Orchestrator: the A2 question; the walk card template section (section 6); the plan checker.
- Test Runner: Q1 (brief `briefs/Q1.md`); C2 changes `REQUIRED` (approved by Q27).
- Visual gate (Sector Ops, when VG work resumes): drop parity cards and meter rows (A8).
- J10 planner: J10's PRs touching light files will run `e2e-parity`; V1's lamp-side part (if T1 finds one) is J10's.
