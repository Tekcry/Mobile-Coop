# marlow-final - STATE

## MORNING-REVIEW (for Michael)
Michael ~01:42 (ROADMAP Decided "Overnight"): rule loosenings proposed tonight are "Apply, logged and undoable": the
build uses them as assumed decisions, each listed here with its undo. The text of `docs/level-design.md`, the template,
the bible and DECISIONS is NOT edited: the wording for each LR item is in `docs/lighting-review/PROPOSAL.md` section 3,
ready to fold in if you keep it. Finished and green: the PR goes to the next train for /preview/.

Marlow Yard (SPEC section 15; full rows there with the reason):
| Item | Built as | Undo |
| --- | --- | --- |
| P1 entry vantage / checkpoints dark | Vantages concealed by occlusion; holding rooms lit 0.30, out of guard view | A dark mixed-zone pocket at each vantage |
| P2 G225 open floor 0.30 | Sets at 0.14 standby fill; 0.30 in lounge, holding rooms, dock | Zone ambient back to 0.30 (isolations become lures only) |
| P3 no timers in stealth | Player-started device windows (A2 15 s, A4 / A8 60 s loop, A8 25 s lights, jam 5 s); never a fail | Held isolators (`timedHold`), permanent console off |
| P4 new LD 5.5 lit by default | Every set lit, players make the dark | Lower fitting intensities per set |
| P5 alarm resets the set | Not used | - |
| P6 guard total 9 | 12 role-players, max 3 alive per set | Drop `a4-dock2`, `a8-night2`, move the A1 slot |
| P7 / A8 Course guards em.stealth | `em.stealth = true` (BRIEF A8) | One line in `courseMode.ts` |
| P8 guards do not look up | Occluders on every high route | Build G44's look-up penalty |
| P9 existing systems only | New code N1-N4, N6, N8, N9 | Per item fallback in SPEC P9 |
| P10 one new mechanic per space | A4 console + optional dual takedown; A6 hang-down + one untimed rope | Move A6's rope to A8 |
| P11 three routes + a secret | Two or three ways per set, secrets in A2, A3, A5 | Add a secret per guarded set at dressing |
| P12 walls to ceilings | Set flats stop under the 10 m hall roof | Charcoal panel wall above each set wall |
| P13 1.1 m rails at height | Co-op lip spans are open loading edges with a drop chain | Full rails; lips move to a hoist bay |
| P14 one interrogation guard | Info on the A1 checker, A4 and A8 officers | Info on the A1 checker only |
| P15 bunker fiction | Luxury rehearsal centre (M5, your word) | - |
| P16 no co-op markers | Striped leg-up squares at A1, A2, A6, A8 | No marks; the objective line names the spot |
| P17 G45 clear glass passes sight | All glass stops sight, camera sight and jam lines; light passes | Build G45's clear-glass sight |

All maps (`docs/lighting-review/PROPOSAL.md`; undo per item in its section 6):
| Item | Change | Undo |
| --- | --- | --- |
| LR1 | New LD 5.5 "Lit by default; the players make the dark", mixed zones allowed (= P4) | Lower fittings to the old dark read |
| LR2 | LD 3.1 entry vantage "concealed" (occlusion or dark) (= P1) | Back to "dark" |
| LR3 | LD 3.9 checkpoint may sit in a quiet connector no guard enters | Back to "dark" |
| LR4 | LD 4.4 isolation moment "dark, or darkenable by the players from cover" | Back to "dark" |
| LR5 | LD 5.2 / bible L8 drop the EMP (G152); one way to darken must not be a shot | Restore the EMP wording |
| LR6 | LD 6.3 / bible 6 allow player-started device windows, never a fail clock (= P3) | Held isolators |
| LR7 | G225 0.30 stays for transit and rest; encounter spaces 0.14 standby (= P2) | 0.30 everywhere |
| LR8 | LD 15 darkness acceptance test reworded to match | Old test text |
| LR9 | Bible L7: darkness is the exception, not the default | Remove the note |
| LR10 | Template Theme line and space-sheet Lights field describe the lit default and circuits | Old fields |
| LR11 | Bible 7: light plan per space names what cuts each circuit and for how long | Remove the line |
| LR12 | LD 12.1 engine fact: light sync is Course mode only, named groups only | Remove the fact |

Rejected by you (~01:25): anything that assumes a dark camera is blind (G240 stands, cameras keep IR). Also your
~01:25 rule: every guard armed (SPEC rule 9).
Other assumed decisions tonight: BRIEF A1-A8; PROPS PA1-PA6; LIGHTING-PLAN section 6; slice reports S0-*.md.

## Now (2026-10-23 ~01:20, new account; FULL BURN to 100% per Michael ~01:05 via the orchestrator)
- Art kit CHECKED: tsc clean, eslint clean, tests/facilityKit.test.ts 17/17, neighbouring world tests 8 files green
  (dfff5877). Master a71c8c02 (train 14) merged clean, tsc clean after.
- Running (3 Opus agents, started ~01:20): spec writer (finish SPEC.md, write PLAN.md with Course Ready slices),
  lighting (LIGHTING-PLAN.md + pure modules src/world/lighting/ + tests/marlowLighting*.test.ts), props (build.py
  fixed, facility-props.glb, src/world/props/ helper + renderer, tests/facilityProps.test.ts). If cut off, rerun the
  same agent; each owns only its files.
- Also running (~01:30, 6 agents total): Phase 0 engine answers (SPEC 19 -> ENGINE-ANSWERS.md, read-only); slice 0
  code split by file: N1-N4 + N8 (course files, report slices/S0-course.md) and N6 + PassZone.any (ctDevices,
  scanners, protocol bump; report slices/S0-devices.md). Slice 0 e2e (coop, netmove, ctcourse) goes to Character
  Build once both land.
- Pacing (Michael 01:12 via the orchestrator): this window full burn to 100%. After his reset (phase B, orchestrator
  01:40): at most 3 agents at once in this session (desktop CPU at 100% with 4 sessions; keeps tsc / vitest runnable
  locally), e2e stays on the laptop; pace each 5-hour window to ~97-99% at its reset. Lean windows (Michael ~01:45,
  ROADMAP Decided): each window to 99%, lean, no quality loss; no new agent at 97%, save at 98%, stop by 99%. Models:
  Opus plans, writes strict slice briefs (exact files, line ranges, acceptance, tests), reviews and runs every fresh
  checker; Sonnet builds from those briefs (greybox sets A1-A8, set data, dressing placement, props batches, e2e
  routes); Haiku for chores; engine pieces (course code, devices, lighting modules) stay Opus; a failed Sonnet slice
  gets its fix round from Opus; at 97% start no new agent, save (WIP pushed, STATE current) and idle; the
  orchestrator's cron resumes this session after each reset.
- 03:20 Character Build on 153db3e8: 12 GPU shots on the LAPTOP at C:/NightShift/scratch/runs/marlowfinal-153db3e8/shots/
  (a1-a8 stub halls, f-dock, f-gallery-from-a1, f-l1-holding, f-l7-model; not on the desktop); e2e-ctcourse:1 PASS 153 s.
  Perf: scripts/perf.mjs has no Course-mode path (spawns Warehouse guards; crash at perf.mjs:81). Baseline from
  guard-cap on master 4.64.0 (OLD Marlow, laptop, Epic 1080p): 0 guards 11.3 ms med, CPU 10.7, GPU 6.6, 115 draws,
  sim p95 4.6 ms (budget Epic main p95 5.5, sim p95 2.9: sim already over before guards); 12 guards 29.6 ms. Asked for
  the same guard-cap run on 155fbec0 (new facility) for the delta. Slice 9: a Course-mode path in perf.mjs.
- 03:15 (clock) slice 1 A1 steps 2-4 IN (155fbec0; slices/S1.md): wall + 4.4 m lips via boostWall, wicket bolt
  from the yard, lounge with group-10 coves and closed 3.2 m ceiling, cabin (noLedge), 9 lamps, passive armed checker,
  steps / claim / pass zone, e2e route. 6 map test files 83 pass + 23 neighbours 310 pass. Opus checker running;
  e2e-ctcourse:1 + e2e-coop sent to Character Build. Usage 59%, 3 h 25 left. Then: A1 dressing (Sonnet), then A2.
  Small follow-ups (job lead): e2e-times.json :1 real time; marlowCircuits A1 switch hints (7.7, 15.15), (9.5, 15.15);
  stub.ts a1Gate branch dead.
- ~03:15 SLICE 0 COMPLETE: 0e checker PASS (S0e-check.md, polish P1-P5 only; P1 prop emissives on no circuit, P2 L7
  vitrine 16 cm float). Orchestrator told. Slice 1 (A1 the Gate, steps 2-4) started on Sonnet from a strict brief
  (owns a1Gate.ts, tests/ctcourse/a1Gate.test.ts, a1Gate.light.json, scripts/e2e-ctcourse/a1Gate.mjs, slices/S1.md).
  Then: Opus checker, laptop e2e-ctcourse:1, dressing (Sonnet), then A2.
- ~03:05 0e IN (153db3e8; slices/S0e.md): shell clad (visual), gallery (circuit 90, drawn only), lounge (group 10:
  dark until A1 builds its lamps), holding rooms, dock; 140 props; gallery 53.6 k kit tris; gallery and lounge at the
  12-draw limit; detail pass off. 57 map tests pass. Opus checker on 0e running; GPU shots + perf + e2e-ctcourse:1 sent
  to Character Build. Known flake: marlowLightingLevels "bodyEstimate does not allocate" failed once under load (2.63 MB
  vs 2 MB), passes alone. Next after the 0e check: slice 1 A1 on Sonnet from a strict Opus brief.
- ~02:45 0d scaffold e2e GREEN on the laptop GPU (3e41b859): smoke, e2e-ctcourse :1-:4, coop, course, netmove all
  PASS (logs C:/NightShift/scratch/runs/marlowfinal-3e41b859/). Slice 0 left: 0e (running), then its check.
- ~02:35 (clock) bounds test IN (stubs add no geometry yet, so it bites from the first real set). 0e facility
  dressing started on Sonnet (facility.ts + tests/ctcourse/facility.test.ts; report slices/S0e.md). Usage 43% at
  02:32, 4 h 08 left: one agent at a time.
- ~03:05 0d fresh checker PASS (S0d-check.md). Its should-fix (no test that a set's geometry stays in its SET_BOX) is
  being built by a Sonnet agent (ctcourse.ts ranges + tests/ctcourse.test.ts + checkSetPart tag checks). Then 0e.
- ~02:55 0d scaffold IN (3e41b859; slices/S0d.md): ctcourse merges set parts, facility greybox, 8 stub sets walk end
  to end, test / e2e frames (4 parts), registerCourse at load, map tests (scanner pairs <= 8, objective id <= 40).
  tsc clean, 34 test files green, npm run build ok. Decisions: facility groups 90-98 (SPEC says 1 / 2: fix in SPEC),
  walls 0.5 m, voxelFit allowance for the 160 x 78 site. e2e (ctcourse :1-:4, coop, course, netmove) sent to Character
  Build. Fresh Opus checker on 0d running (the one agent). Old shot scripts with stale ids (nv-shots,
  sector-lights-shots, sector-fixes-c-shots, camera-cue-shots, wheel-shots): slice 9. Next: 0e facility dressing
  (Sonnet brief) after the 0d check.
- ~02:40 set docs A1-A8 + plan SVGs IN (sets/*.md, plans/*.svg). Spec contradictions logged per doc (section 13,
  ids A<n>-C<k>); the set docs win over SPEC for their set. Follow-ups for set slices: MARLOW_POCKETS /
  MARLOW_CIRCUITS rows for A5 / A6 / A8 (lighting file, src/world/lighting/marlowCircuits.ts); coopDeck `gaps` and
  slab `solid: false` options (A6, A8); facility.ts south corridor break x 101-104 + L4 east door locked (sent to 0d);
  refused press must not claim a role (A4-C9, slice 0 polish). Trim: orchestrator messages only at slice ends / PRs /
  blockers; 1 agent (Sonnet from a strict brief) after 0d finishes.
- ~02:25 0f IN (30b89647): props batch 2, 55 props / 11420 tris; the facilityProps hang was an infinite loop in
  `propRow` (fixed, 11/11 in 1.4 s); hook `MapLayout.facilityProps` + `World.facilityProps` (PA7: `props` names were
  taken). A4 dressing: check the security room and warehouse floor as separate areas (26 draws together vs 12).
  Props GPU look pending (with the first dressed set). Running: 0d, set docs x2 (3; trim cap 2: no new agent).
- ~02:15 slice 0 CODE GREEN: e2e-ctcourse :1-:3 PASS on 5920cce5 (security room looped feed ok); with 1949764e,
  8/8 suites green on the laptop GPU. Remaining slice 0: 0d (running), 0e (after 0d checked), 0f (running).
- ~02:05 TRIM (orchestrator): window 11% after ~11 min; at most 2 agents until the orchestrator loosens; in-flight
  ones finish; no new agent until under 2; sets / dressing / props on Sonnet 5.5 from strict Opus briefs; checkers
  Opus. facilityProps.test.ts hangs at collection on the laptop too (12 / 13 unit files pass, 117 tests): 0f fixes.
- ~02:00 slice 0 e2e on 1949764e (Character Build, GPU, JOBS=3): smoke, e2e-ctcourse:2, :3, e2e-course, e2e-coop,
  e2e-netmove, e2e-stealth-ai PASS; e2e-ctcourse:1 FAIL at the security room 'off' assert (the by-design failure
  fixed in 5920cce5, test script only). Rerun of e2e-ctcourse on 5920cce5 and the 13 unit files on f315434f running.
- 01:50 Guard AI Build (feature/guard-ai) data shapes agreed: optional `MapLayout.guardAi` (zones per set, noisy
  machinery in A5 / A6) and `SquadSlot.post` (A4, A8 high-security posts; A1 checker `leash: 0`) are filled by the set
  slices once those types reach master; until then omitted. They do not set em.stealth (ours, A8) and keep out of
  courseMode / course / ctDevices / securityRoom / scanners; their camera body callback lives in src/security.
- ~01:55 Sydney: Michael reset the 5-hour window (2% at resume; resets 2026-10-23 ~06:40 Sydney). PHASE B: lean,
  at most 3 agents, 97 / 98 / 99% rule, Sonnet builds sets from Opus briefs (Pacing above). Four agents carried
  over (0d, set docs x2, 0f): no new agent until 2 or fewer run. (Note: earlier "~0x:xx" times in this file are
  session estimates; the machine clock reads about 02:00 Sydney now.)
- ~03:10 slice 0 fresh checker: PASS (slices/S0-check.md). Fixed its should-fix 1 (e2e-ctcourse expects 'looped',
  5920cce5); Character Build reruns e2e-ctcourse on 5920cce5. Slice 0 follow-ups (Opus, small, next free slot):
  unit test for ctDevices camera mode transitions (console -> looped, jam during loop -> off -> looped, flag clear ->
  online, dead Sector Ops camera stays off); prune holdPulseAt on client leave; a refused press should not claim the
  role; isolator lure point (cabinet vs lamps: SPEC wording). 0d takes registerCourse at load + map tests for scanner
  pairs <= 8 and objective id length <= 48.
- ~03:00 greybox helper tests IN (77 pass). Helper fixes override SPEC numbers (fold into SPEC at the next spec pass):
  A1 leg-up mark x 10.8; A3 first hop 10.0 m, hide x 88.6; A5 drum stack >= 2.8 m off the beam line or >= 1.9 m
  noLedge; A6 5 m bridge, overhang 0.4, exit release on the cabinet, panel 3 s hold; GREY_KEEP_CLEAR 4.7 m. Sent to
  the set-doc agents. Props batch 1 committed, test not run (desktop 97% CPU): sent to Character Build with the slice 0
  unit files. MORNING-REVIEW written. 0f props batch 2 + World props hook started.
- ~02:45 slice 0 CODE ALL IN: 0a course (N1-N4, N8, A8 em.stealth, despawn, door occupancy), console loop sets
  'looped', client hold-noise pulse (inside protocol 30), 1949764e. SPEC rules 9-10 (Michael ~01:25: armed guard
  kinds only, no src/ai edits; cameras keep IR). Slice 0 e2e queued on Character Build 4189 (GPU): smoke,
  ctcourse :1-:3, course, coop, netmove, stealth-ai on 1949764e. Running: fresh slice 0 checker (slices/S0-check.md),
  0d scaffold (slices/S0d.md), greybox helper tests, set docs A1-A4 / A5-A8, props (status unclear: files on disk,
  no hand-back yet). SPEC N4 / PLAN 0d text still says N4 ships without holdNoise: now built, fix in the next pass.
- ~02:30 0g N9 slide doors IN (slices/S0g-doors.md; 6 files 43 tests). Engine answers folded into SPEC /
  CONSTRAINTS / PLAN. Set docs (slice step 1) started: A1-A4 and A5-A8 agents (docs/marlow-final/sets/, plans/*.svg).
  Still running: 0a course code, greybox tests, props, client hold noise.
- ~02:20 lighting IN (471c3a98): LIGHTING-PLAN.md, shared docs/lighting-review/PROPOSAL.md (LR1-LR12 for Michael,
  none applied), src/world/lighting/ (levels, circuitSchedule, marlowCircuits) + 23 tests. Integration (map groups,
  switches, zones, isolator timings, ctcourseLight rewrite) is 0d / set slices: LIGHTING-PLAN section 4. Client
  hold-noise agent started (protocol.ts, coopHost, coopClient; slices/S0-holdnoise.md).
- ~02:10 0c ENGINE-ANSWERS.md in. Routed: 0a also builds em.stealth true in Course mode (BRIEF A8), em.despawn in
  spawnSquad, remote players in StealthSystems.occupied(); the spec writer folds the answers into SPEC / CONSTRAINTS.
  Later small item: client holdNoise pulse (inside protocol 30), in PLAN 0d.
- ~02:00 SPEC COMPLETE + PLAN.md written (slices 0a-0g, 1-8, 9; parallel waves). Running: 0a course code, 0c engine
  answers, 0g N9 slide doors (slices/S0g-doors.md), greybox helper tests, lighting, props. Next: 0d scaffold (one
  agent, gate for every set) once 0a lands; then waves per PLAN "Parallel order".
- ~01:50 slice 0 devices IN (34cb5b52): N6 scanner pairs, PROTOCOL_VERSION 30, PassZone.any (src/game/passZones.ts);
  tsc, eslint, 2 new test files 15 passed, 10 related files 226 passed. Report slices/S0-devices.md. Set builders:
  every new zone / scanner flag goes in `def.externalFlags`. e2e for slice 0: e2e-coop, e2e-netmove, e2e-ctcourse
  (after the course half lands). Greybox-helper tester started (tests/ctcourseGreybox.test.ts).
- Gap list landed (COOP-GAPS.md), routed to the spec, slice 0 course and lighting agents (~01:40).
- Michael 01:40 (via the orchestrator): Course Ready leads the Sector Ops redesign and is NO LONGER our second builder;
  marlow-final builds every slice (up to 6 agents). Lighting for ALL maps: "review lighting also, i think the rules
  may be too strict and the levels are very dark and unrealistic. there shouldnt always be shadows, the player may
  have to make shadows (disabling lights etc)": the lighting agent writes the shared docs/lighting-review/PROPOSAL.md
  (proposals only, never applied). Course Ready's camera-range cut (feature/camera-range) stays off ctDevices.ts /
  securityRoom.ts or sends us the hunk. Their greybox helpers arrived later (8ae26f6a): src/world/maps/ctcourseGreybox.ts +
  GREYBOX-HELPERS.md now on this branch, unwired, NO tests yet (slice 0 writes them; list in the doc).
- After the spec: slice 0 (scaffold + section 14 code), then sets in parallel with Course Ready, dressing after each.

### At the swap (~01:10, history)
In, committed: AUDIT.md, COOP-INVENTORY.md, CONSTRAINTS.md, ROUTE-DRAFT.md (all 4 step-1 reports), BRIEF M1-M6.
WIP, committed partial (the agents may have been mid-work at the swap; check each file's last section):
- SPEC.md (spec writer): partial; rerun the spec writer to finish SPEC.md and write PLAN.md (Next 1).
- KIT.md + scripts/facility-kit/ + src/world/kit/ + tests/facilityKit.test.ts + hooks in levelBuilder / doors /
  anchors / mapDef / world.ts + package.json (architecture kit agent, commit 93d1eab1): UNCHECKED. First run
  `npx tsc --noEmit` and `npx vitest run tests/facilityKit.test.ts`; if broken, fix or revert the hooks.
- LIGHTING-PLAN.md (lighting agent): partial.
- PROPS.md + scripts/facility-props/ + src/world/props/ (props agent): may be missing or partial.
Any of these missing or cut short: rerun that agent from "Agent briefs" (the props and lighting briefs are in the
RESUME of the session, summarised here: props = Blender headless props per set + placement helper + PROPS.md;
lighting = M6 rule review, per-set lit default / light groups / timed breakers / dark pockets, code and tests).
Course Ready's prep notes: origin/feature/marlow-bays docs/marlow-final-prep/ (MAP-AUDIT, DEVICE-INVENTORY, SCENARIOS).

## Next
1. Spec writer (one Opus agent): merges AUDIT, COOP-INVENTORY, ROUTE-DRAFT, CONSTRAINTS AND Course Ready's independent
   second opinions in `C:/NightShift/scratch/course-ready/marlow-final/` (MAP-AUDIT.md, DEVICE-INVENTORY.md with
   placement APIs / wire hooks, SCENARIOS.md; committed on origin/feature/marlow-bays docs/marlow-final-prep/,
   489d7c04 or newer: SCENARIOS has a 37-entry CT set-piece catalogue, an 8-area route proposal and the rule clashes for
   Michael - bible 5.8 no timers in stealth, G240 cameras see in the dark, G110 no rope climb) into `SPEC.md` (from `docs/templates/map-spec.md`) and `PLAN.md`
   (slices; whole slices marked for Course Ready, separate files). The spec must carry:
   - M4: no explainer pads; the objective list updates per area and guides both players (per-player lines on splits).
   - M5 + A5-A7: a facility look section (luxury training facility, instructor gallery behind glass, LED coves, sliding
     doors) and a lighting section (sufficient light to read the space; review the darkness rules; any loosening is a
     proposal for Michael, never applied).
   - Every standard item in CONSTRAINTS.md, with any loosening listed for Michael.
   Commit, push, message the orchestrator.
2. Build slices: greybox, lights baked, guards, one e2e route per slice; then dressing with the kit as each greybox
   passes (M5); checker + 1 fix round per slice; GPU suites (e2e-ctcourse :1-:3, course, coop, netmove), perf budgets
   and GPU shots per area via Character Build. Desktop e2e only when CPU < ~60% at the start.
3. Course Ready joins as the second builder (whole slices from PLAN.md).

## Open
- (done ~01:15) master merged at a71c8c02.

## Done
- 2026-10-23 ~00:20 job started: BRIEF.md (Michael's words, M1-M5, A1-A7), STATE.md; npm ci done in the worktree.
- ~00:30 step 1 agents and the art-kit agent started (max burn, 6 Opus agents allowed).

## Agent briefs (for a rerun)
- AUDIT: read-only; the current ctcourse map as built (areas in route order with coordinates, props, lights, guards,
  cameras, doors, anchors, ASCII plan), per area KEEP / REWORK / CUT with file:line, flow problems against
  docs/level-design.md, co-op actions used and unused, timings, ids the e2e suites and code rely on.
- COOP-INVENTORY: read-only; co-op mechanics in code (team moves, lights / breakers, cameras + security room, locks /
  hacks, jammer, laser panels, scanners, sync windows) with file:line and net sync; gaps vs Michael's list with the
  smallest prototype; 10-15 CT co-op scenarios from docs/ct-research; 8-12 proposed exercises (A / B jobs, sync, fail
  and retry, observe-then-plan, light parity, time).
- ROUTE-DRAFT: read-only; fiction frame (original names), 7-10 areas each a mock-up of a real site with its co-op
  exercises, escalation to a graduation area, connections without backtracking, ASCII plan, timing table 15-20 min.
- CONSTRAINTS: read-only; the level-design / template MUST and SHOULD checklist with sources, engine limits with
  numbers, the template section list, clashes with Michael's ask (solo-first vs G2 etc.), current map compliance.
- KIT: implementer; in-repo Blender (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, `-b` only, CC0
  textures only) generator for reusable luxury pieces (wall panel with LED cove, gallery glazing, double sliding door
  leaf + frame on the existing door logic, LED strip cove, floor trim, column cladding, handrail), a placement helper
  with a Vitest test, KIT.md; visual over the level builder's collision.

## Resume prompt
```
Night Shift | Menu Notes Build: resume marlow-final (top priority). Read CLAUDE.md, docs/ROADMAP.md (feature/menu),
then C:/NightShift/Mobile-Coop-marlow-final/docs/marlow-final/BRIEF.md and STATE.md (git pull first). Check which
step-1 files exist (AUDIT, COOP-INVENTORY, ROUTE-DRAFT, CONSTRAINTS, KIT); rerun any missing agent from "Agent briefs",
then run "Next" 1 (the spec writer), commit, push, message "Night Shift | Orchestrator", and build the slices.
Max burn: parallel Opus agents. Message the orchestrator at the spec and each slice.
```
