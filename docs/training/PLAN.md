# Fallow training bunker - plan

How the bunker gets built. Under DECISIONS D12, Claude builds the whole map start to finish without Michael's gates;
Michael reviews the finished map. Section 2 answers his question: which systems must exist first.

## 1. Branch plan
- Work branch: `feature/training-bunker`, created 2026-10-13 from `origin/feature/kestrel` (D6). Every bunker session
  commits and pushes only here.
- Never commit to or push `feature/kestrel` (an overnight run pushes there), `feature/ct-locomotion`, `ct-movement`,
  `dev` or `master`. Claude never merges into another branch; Michael merges.
- Feeding features in: when a switch-on session (section 3) needs a feature that has landed on `feature/kestrel`
  (security S1B-S5, toolkit V1-V3, DR) or `feature/ct-locomotion` (locomotion steps), that session merges the source
  branch into `feature/training-bunker` (a merge commit, never a rebase), runs `npm run check` and `npm run e2e:quick`,
  and logs the merge. It never pushes the merge anywhere else.
- Known pre-existing failure on the base: `tests/kestrelMap.test.ts` (kestrel-owned; locomotion STATE.md). Not ours to fix.
- Getting the bunker to Michael: when he wants it on a preview, he merges `feature/training-bunker` himself.

## 2. Systems that must exist before the build (the answer to Michael)
**Blocking (built here first, session T1):**
1. **Course framework** (new; a small slice of bible Phase 4's triggers / actions and checkpoints). Pure logic in
   `src/game/course/` with Vitest tests, a `CourseMode` (`src/game/modes/courseMode.ts`), co-op `NetMode` `course`
   (capacity 2), and a test map `courselab` (MAPS only, modes `[]`, like `seclab`). It provides:
   - course data types (bays, airlocks, gates, squads, radio lines, element switch-on flags, objectives);
   - two-person airlocks (both inside, cycle, near door locked for good, far door open, checkpoint);
   - gates: `lever` (a switch unlocks a door), `bolt` (a door opened from one side only), `hold` (open while held),
     `timedHold` (open while held and N s after), `pair` (two switches within a window: Sync's stand-in), `egress`
     (request-to-exit on the secure side), `mains` (a door unlocked while a light group is off), `flag` (a door unlocked
     by a course flag: a key, a card, a code), `anchorLock` (an anchor unusable until a flag: the B3 fan guard);
   - per-bay squads spawned when the bay's entry airlock cycles, and kept within `MAX_ALIVE`;
   - bay restart when both players are down: both respawn in the bay's entry airlock; the bay's squad, gates, lights and
     breakables reset;
   - course radio lines through the existing barks / subtitles path, with solo / team variants left empty (2 players);
   - a per-player verb log (which player did which verb) for e2e-bunker and the bot run;
   - host authority: the host runs the course state; a `course` message (state, door locks, flags) when changed or every
     2 s; clients mirror door locks and anchor locks; `parseMessage` case and a `tests/net.test.ts` test.
2. **Run-time door lock state on clients** (inside T1 if T0 finds `Door.anchor.locked` changes do not reach clients:
   doors sync open indices only today, coop.md).
3. **Anchor disable at run time** (inside T1: `AttachController` skips anchors in a disabled set; one hook).

**Needed for the full experience (the map is playable without them through placeholders; each switches on later):**
4. **Desk console view** (a player at a security desk watches its feeds and cycles them): not in S0. Recommended as an
   addition to S1 Part B's prompt; until then B6's code gate uses the lit-sign placeholder.
5. **Light state sync to clients** (lamp on / off / destroyed; First Playable S7a, bible L10). T0 checks whether
   switch and shot-lamp changes already reach clients through `items` and events; if not, recommended before T6 so the
   co-op light tests mean something.
6. **Dev bot partner** (locomotion step 20): the automated full course run with the bot as P2.
7. Everything else in FEATURES.md with a status other than `exists`: locomotion steps 09-34, S1B-S5, V1-V3, DR, bible
   Phase 1 (fuse box, emergency lamps), Phase 2 (sound), Phase 5 (co-op set), Phase 6 (civilians, throwables, per-stop
   facing), backlog 23-24. None blocks the build.

## 3. Switch-on map (features landing -> bay elements switched on)
Every element is built in T2-T7 in its final geometry; its gate or drill runs in its "now" form until the feature lands.
A switch-on session merges the feature in (section 1), flips the element's course flag from now to final, extends
`e2e-bunker`, and updates FEATURES.md's status column.
| Session | Trigger (feature landed) | Bays and elements | Check |
| --- | --- | --- | --- |
| SW-L1 | loco 09-15 (holster, elbow strike, wall, corners, edge aim, door peek, vision, medkits) | B1 draw / elbow pad; B6 corners; B7 sandbag lean; B8 draw and ADS; A4 / A6 / A8 medkits; B5 thermal; B6 electro | e2e-bunker B1, B6, B7, B8; e2e-netmove cases |
| SW-L2 | loco 20 (bot partner) | Whole course with the bot as P2; FEATURES section 11 coverage | bot run; per-player verb log |
| SW-L3 | loco 22-29 (quick 180, momentum, drag, guard body language) | B1 / B2 drills; B7 drag; B5-B9 guards | anim-audit; e2e-bunker B2, B7 |
| SW-S1 | S1 Part B (+ console view, item 4) | B6 desk, panel, fault; B9 bridge desk | e2e-seclab; e2e-bunker B6 |
| SW-S2 | S2 | B6 readers, cards, clone, mantrap, iris | e2e-bunker B6 |
| SW-S3 | S3 | B5 PIR; B6 beams, PIR; B9 beam, PIR | e2e-bunker B5, B6, B9 |
| SW-S4 | S4 (+ S5) | Security sync for both players; dormant guards replace T1 spawning if Michael prefers | e2e-bunker 2 players |
| SW-V1 | V1 | B6 / B7 optic cable | e2e-toolkit; e2e-bunker B6 |
| SW-V2 | V2 | B6 locker 7, manager's door, records PC, keypad; B9 key drawers | e2e-bunker B6, B9 |
| SW-V3 | V3 | Course kit; pistol secondary (B5, B6, B8, B9); shocker (B8, B9); interrogation (B7) | e2e-bunker B7, B8 |
| SW-DR | DR | S6 push-bar door | e2e-bunker S6 |
| SW-P1 | Phase 1 fuse box | B5 breaker reset by a guard; maintained emergency lamps | e2e-bunker B5 |
| SW-P2 | Phase 2 | B3 fan and B5 genset masking; sound meter; whistle (B5, B7) | e2e-bunker B5 |
| SW-P5 | Phase 5 | B4 new team moves; Sync (B7 pair, B9 keys); clutch save (B9); drag a downed mate and medkit on a mate (B9); typed pings; outlines; team results | e2e-bunker B4, B7, B9 |
| SW-P6 | Phase 6 / backlog | Throwables (B5, B8); civilian umpire (B7); per-stop facing; knife (B7 dust sheet); airfoil (B8) | e2e-bunker |

## 4. Build order
Priority (D7): T0-T8 run before Dead Line's P03R; the SW sessions interleave with Dead Line stages as features land.
Sessions run back to back without Michael's gates (SPEC E8); each ends with an Opus self-review logged in
`docs/training/progress.md`. "Chain" = the session may start the next one itself when its checks pass.
| Session | Delivers | Where | Chain |
| --- | --- | --- | --- |
| T0 | Progress log; engine questions answered (SPEC); constants re-confirmed; what T1 can reuse; `T0-facts.md` | cloud | stop (T1's prompt may change from its findings) |
| T1a | Course framework pure logic and tests (`src/game/course/`) | cloud | chain to T1b |
| T1b | `CourseMode`, NetMode `course`, `course` message, door / anchor locks, `courselab` map, `scripts/e2e-course.mjs` | cloud | stop (Opus review of the framework) |
| T2 | `bunker.ts` Upper level: B1, A1, B2, A2 geometry and anchors; lips; `plan-svg` render; guard-free section 15 tests | cloud | chain |
| T3 | B3, A3, B4, A4 (shaft galleries, split gap, ropes, fence, duct; cells and co-op lips) | cloud | chain |
| T4 | B5, A5, B6, S6, A6 (gensets, trench, gallery; mock site rooms, duct, mezzanine) | cloud | chain |
| T5 | B7, A7, B8, A8, B9, L9 (cavern and house, range, atrium) | cloud | stop (Opus review against BAYS and 16.10) |
| T6 | Lights (every BAYS light plan), circuits and switches, ambient zones, surfaces, the light checks (section 15 darkness) | cloud; GPU look pending PC | chain |
| T7 | Course data (`bunkerCourse.ts`): bays, airlocks, gates in now form, squads and routes from the guard sheets, devices (S1A cameras now), radio lines, objectives | cloud | chain |
| T8 | `scripts/e2e-bunker.mjs` (two pages `?net=local`: each bay's gate, each airlock, a forced bay restart, the per-player verb log); full `npm run e2e`; perf (software GL numbers only) | cloud | stop |
| T9 | Dressing that tells the story; readability; `TESTING.md` PC checklist; Future recommendations | cloud; PC items pending | stop: Michael's review |
| SW-* | Section 3, as features land | cloud | stop each |
| PC-1 | Michael (and a friend or the bot) plays the course; GPU, perf, look, phone check | PC | - |

## 5. Cloud and PC
- **Cloud (Claude sessions):** every T and SW session: code, data, unit tests, logic e2e on software GL, docs, commits to
  `feature/training-bunker`. Every GPU, visual or performance claim is "pending PC run".
- **PC (Michael):** `E2E_GPU=1` perf budgets on the bunker (desktop and the phone look), the lighting look per bay, the
  phone check, two-player playtests (with a friend, or with the bot once loco 20 lands), and the final review of the map.
- **Editor:** not needed for the build (D12). See section 6.

## 6. Editor second-map part (scope only; optional, for a later PC session)
D12 has Claude build the bunker in code, so the editor is no longer on the critical path. If Michael later wants to tweak
the bunker by pad, the editor needs:
1. A map registry: `scripts/kestrel/editor-server.ts` hard-codes the campus and play files (`CAMPUS` line 14, `PLAY`
   line 21); make them a choice (`?map=kestrel|bunker`) with a sandbox per map.
2. A bunker blocks file in the campus schema (docs/kestrel/schema.md), exported once from `bunker.ts` (rooms, walls,
   openings, stairs, ladders, objects, climb pieces, lamps, circuits, guards, markers), so the editor can load it;
   the bunker then builds from that file, as Kestrel builds from its own (`kestrelCampus.ts` `campusToBuild`).
3. Per-map checks: `check.mjs` and `standards-check.mjs` read Kestrel facts and rules; give the bunker its own rule set
   (or none) so the Checks panel does not flood.
4. The walk test's converter: `campusToBuild` assumes two buildings and Kestrel's levels; generalise it to any blocks file.
5. Not covered by the editor today and needed by the bunker: shafts with galleries, ropes and ziplines as placed pieces,
   course gates and airlocks, security devices (P04S / B4S stage). Those stay in code.
Estimate: one Opus session for items 1, 3 and 4, one for item 2, on the PC (the editor is dev-only and needs the dev
server). Recommendation: skip until Michael asks.

## 7. The first three session prompts

### Prompt 1 - T0 setup and engine facts
```
Training bunker T0 - setup and engine facts (cloud, documents only).
Repo Night Shift. Run `git fetch origin`, then `git checkout feature/training-bunker` and `git pull origin feature/training-bunker`. Commit only to feature/training-bunker. Never commit to or push feature/kestrel, feature/ct-locomotion, ct-movement, dev or master.
Read CLAUDE.md, then docs/training/SPEC.md, DECISIONS.md, PLAN.md, BAYS.md sections 0 and 13, FEATURES.md (status and check keys). Read large files by section (`grep -n '^#'`, then line ranges). Never read docs/archive/.
Do:
1. Create docs/training/progress.md (fields in SPEC rule 6) with this session's entry.
2. Answer SPEC "Engine questions for T0" 1-10 from the code: for each, the file:line, the value, and what BAYS.md or PLAN.md must change. Use a cheap Vitest probe only where reading cannot settle it; delete the probe afterwards.
3. Re-confirm every constant in BAYS.md section 13 by grep; list any that moved.
4. List what the course framework (PLAN section 2) can reuse, one line each with file:line: interactable kinds and holds, Door lock state at run time and whether it reaches clients, light switch and shot-lamp state on clients, anchor disable, NetMode list and capacity, GameMode hooks for all-down and respawn, objectives (ObjectiveChain), TrainingDummy placement height, the barks / radio subtitle path, squad spawning and SQUAD_CAP.
5. Write docs/training/T0-facts.md (under 200 lines). Apply number-only fixes to BAYS.md and log them as Decisions; anything that changes a route, gate or guard job goes under "Spec change requests" with a proposed fix (Michael does not need to approve: DECISIONS D12; the T1a session applies it).
6. Rewrite PLAN.md section 7 prompts 2 and 3 if the findings change them.
No source code changes. No e2e runs. Commit "training T0: engine facts" (docs/training only), push feature/training-bunker, report (bible Appendix B), then STOP.
```

### Prompt 2 - T1a course framework logic
```
Training bunker T1a - course framework, pure logic (cloud).
Repo Night Shift, branch feature/training-bunker only (fetch, checkout, pull). Never commit to or push feature/kestrel, feature/ct-locomotion, ct-movement, dev or master.
Read CLAUDE.md, docs/training/SPEC.md (Scope), PLAN.md section 2, BAYS.md sections 0 (airlock rule) and each bay's "Co-op split and gate", docs/training/T0-facts.md, docs/training/progress.md. Apply any open Spec change requests first and log them.
Build, all Babylon-free with Vitest tests (tests/course.test.ts):
1. src/game/course/courseDef.ts: types for a course (bays, airlocks, gates, squads, radio lines, element flags now / final, objectives) and validateCourse (unique ids, every gate names existing doors / switches / anchors, every bay has an entry and exit airlock).
2. src/game/course/courseState.ts: the host state machine: bay status, airlock phases (open, waiting, cycling 4 s, sealed) with the refusals ("Wait for your partner", "Revive first"), checkpoint index, flags, the gate kinds lever, bolt, hold, timedHold, pair (window 1.0 s), egress, mains, flag, anchorLock; door and anchor lock outputs; bay restart (what resets); the per-player verb log.
3. src/config/course.ts: every number (TUNE) the state uses.
Tests: each gate kind opens and closes as specified; an airlock never cycles with one player or a downed player; the near door never reopens; restart resets the bay's gates, flags and squad list but not earlier bays; pair refuses at 1.1 s; timedHold closes 6 s after release.
Checks: `npm run check` (the known tests/kestrelMap.test.ts failure is pre-existing). Update docs/training/progress.md. Commit "training T1a: course framework logic", push, then continue with docs/training/PLAN.md section 7 prompt 3 in this session if the checks pass and context allows; else STOP and report.
```

### Prompt 3 - T1b course mode, net and test map
```
Training bunker T1b - course mode, co-op sync, courselab (cloud).
Repo Night Shift, branch feature/training-bunker only (fetch, checkout, pull). Never commit to or push feature/kestrel, feature/ct-locomotion, ct-movement, dev or master.
Read CLAUDE.md (Hard rules: src/net only through dynamic import behind flags.coop), docs/systems/coop.md, docs/training/PLAN.md section 2, T0-facts.md, progress.md, and src/game/course/* from T1a.
Build:
1. src/game/modes/courseMode.ts (GameMode): loads a course definition for the map, runs CourseState on the host, wires interactables (existing kinds with labels and holds) to gates, spawns each bay's squad when its entry airlock cycles, restarts the bay when both players are down (respawn both in the entry airlock), shows course radio lines through the existing barks / subtitles path.
2. Co-op: NetMode 'course' (capacity 2; a third player is refused in the lobby), the `course` message (state, door locks, anchor locks, flags) host -> clients when changed or every 2 s, a parseMessage case and a tests/net.test.ts test; clients mirror door and anchor locks; client interactions go through the existing `use` message.
3. Door lock state and anchor disable at run time, if T0 found them missing (one hook each).
4. src/world/maps/courselab.ts (MAPS only, modes []): two small rooms, one airlock between them, and one example of each gate kind; its course data.
5. scripts/e2e-course.mjs: two pages `?net=local&autostart=courselab&mode=course`: the airlock refuses one player, cycles with both, the near door stays locked; each gate kind works for host and client; a forced both-down restarts the bay. Register it in scripts/run-e2e.mjs as REQUIRED, covering src/game/course and courseMode.
Checks: `npm run check`, `npm run build`, `npm run e2e:quick` and `npm run e2e -- e2e-course`, plus e2e-coop (it touches src/net). GPU and visual checks: pending PC run. Update progress.md, docs/systems/coop.md (the course message) and CLAUDE.md (one line in the module map). Commit "training T1b: course mode and co-op sync", push, Opus self-review against PLAN section 2 logged in progress.md, report, then STOP.
```
