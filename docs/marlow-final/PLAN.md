# marlow-final - PLAN (slices)

Status: COMPLETE (spec writer, 2026-10-23). The build contract is `SPEC.md`; this file says who builds what, in which
files, in what order, and how each slice is checked. Michael (01:40, via the orchestrator): the job lead builds every
slice with up to 6 parallel Opus agents; Course Ready no longer builds marlow-final slices.

## 1. How a slice runs
- One implementer agent per slice (or per slice part), started from `docs/systems/agent-preamble.md` with
  `<job>` = marlow-final, its owned files from section 2 and its slice rows from section 4. A fresh checker agent after
  the greybox and again after the dressing; at most 1 fix round per slice unless the work is broken (CLAUDE.md
  "Current goal").
- Agents never commit, push, stash, reset or checkout. They edit only their owned files. A type error or failing test
  in a file another agent owns is reported to the job lead, never fixed.
- Inside a step, an agent runs only light checks: its own test files (`npx vitest run tests/ctcourse/<set>.test.ts`),
  `npx eslint <its files>` and `npx tsc --noEmit` (with a timeout).
- At the step's end the job lead runs `npm run check` once (heavy: take `C:/NightShift/heavy.lock` with noclobber,
  delete it only while it names you), commits the slice's files, pushes and sends Character Build the branch, the commit
  and the suites.
- Slice e2e and every GPU check run on the laptop through Character Build (CLAUDE.md "Sessions", the laptop is the main
  test machine): logic suites on 4191 / 4192 (`E2E_JOBS=3`), GPU suites, perf and shots on 4189 with `E2E_GPU=1`. A
  result counts only for the commit it ran on (or a later docs / test-script-only commit).
- Test tiers (CLAUDE.md): a step = `npm run check` + the suites it names; a slice = `npm run e2e:quick` + its
  `e2e-ctcourse` part, plus `e2e-coop` / `e2e-netmove` when `src/net`, `src/player` or `src/game` changed; the PR = the
  full `npm run e2e` (or a merge train).
- Each slice writes its report to `docs/marlow-final/slices/S<n>.md` (SPEC section 22: files, decisions, checks with
  summary lines, undone, manual desktop checks for Michael). The job lead folds them into `STATE.md`, `TESTING.md` and
  the changelog fragment in slice 9.

## 2. File ownership
### Shared files: only slice 0 parts or the job lead edit these
| File | Owner |
| --- | --- |
| `src/world/maps/ctcourse.ts` (merges the set parts, the course def, the chain, theme, spawns) | 0d, then the job lead |
| `src/world/maps/ctcourseSets/types.ts` (the `SetPart` contract, `SET_BOX`, `HOLD_BOX`, group and id rules) | 0d, then the job lead |
| `src/world/maps/ctcourseSets/facility.ts` (shell and set-boundary walls, gallery, service corridors, holding rooms L1-L7, their pads, doors, glass slots, medkits) | 0d greybox, 0e dressing |
| `src/world/maps/ctcourseGreybox.ts` (Course Ready's helpers) and `tests/ctcourseGreybox.test.ts` | 0g; set agents report a helper bug to the job lead |
| `src/game/course/*`, `src/ui/hud/courseHud.ts`, `src/game/modes/courseMode.ts` | 0a |
| `src/game/ctDevices.ts`, `src/game/passZones.ts`, `src/game/scanners.ts`, `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopUi.ts` (N8 part) | 0b (0a for the `coopUi.ts` N8 line) |
| `src/game/doorMenu.ts`, `src/world/doorOpen.ts` (N9) | 0g |
| `src/world/kit/*`, `scripts/facility-kit/*`, `KIT.md` | the job lead (kit fixes only) |
| `src/world/props/*`, `scripts/facility-props/*`, `PROPS.md` | the props agent (0f) |
| `src/world/lighting/*`, `tests/marlowLighting*.test.ts`, `LIGHTING-PLAN.md`, `docs/lighting-review/PROPOSAL.md` | the lighting agent |
| `tests/ctcourse.test.ts` (whole-map frame), `tests/ctcourseLight.test.ts` (frame), the five map-coupled tests (`guardInfo`, `jammer`, `laserPanels`, `scanners`, `camSpaces` / `smoothWorldLight`) | 0d |
| `scripts/e2e-ctcourse.mjs` (runner, shared helpers, part dispatch), `scripts/run-e2e.mjs`, `scripts/e2e-times.json`, `scripts/shots-ctcourse.mjs` | 0d |
| `docs/marlow-final/plans/facility-*.svg`, `docs/ct-prototype/CTCOURSE-SPEC.md` (pointer header) | 0d |
| `SPEC.md`, `PLAN.md`, `CONSTRAINTS.md`, `STATE.md`, `BRIEF.md`, `TESTING.md`, `docs/systems/*`, `docs/course-ready/WALKTHROUGH.md`, `changes/feature-marlow-final.md`, `package.json` | the job lead (slice 9 for the docs) |

### Per-set files: only that set's slice edits these
For set `<set>` in `a1Gate`, `a2CarriageShed`, `a3OfficeRange`, `a4GoodsShed`, `a5Substation`, `a6PumpHouse`,
`a7DataHall`, `a8Strongroom`:
- `src/world/maps/ctcourseSets/<set>.ts` (everything inside the set box: greybox, lamps, switches, guards, devices,
  kit and props dressing);
- `tests/ctcourse/<set>.test.ts` and `tests/ctcourse/<set>.light.json` (the set's tuned light levels);
- `scripts/e2e-ctcourse/<set>.mjs` (the set's e2e steps, called by the runner);
- `docs/marlow-final/sets/<set>.md` (space sheet, guard sheets, beat chart rows, coverage, tool / problem matrix,
  metrics check, self-critique, playtest checklist) and `docs/marlow-final/plans/<set>-ground.svg`,
  `<set>-gameplay.svg`;
- `docs/marlow-final/slices/S<n>.md` (the report).

### The set-part contract (`ctcourseSets/types.ts`, written by 0d)
Each set file exports `build<Set>(b: LevelBuilder, kit: FacilityKit): SetPart` and its id constants. A `SetPart`
carries everything the merge needs: the bay's gates, radio, objective steps, drills and role claims; course devices,
doors (by course id), squads and consoles; light `groups`, `switches`, `ambientZone`s; cameras, lasers, laser panels,
scanners and pass zones; hide spots and medkit walls; `camSpaces` and `navSeeds`; its `lips` (from the greybox helpers,
for `COOP_LIPS`); its register tags; its light-test spots (`LIGHT_SPOTS`) and shot vantages (`SHOT_VANTAGES`).
Rules that keep parallel sets apart: build only inside `SET_BOX[<set>]` (the box edge walls are `facility.ts`'s); ids
prefixed `a<n>-` (doors `A<n>-...`); light groups 10 x n + k; cameras within the per-set budget (A3 1, A4 3, A7 2, A8 3;
12 per map). The facility exposes each set's entry and exit door ids and the holding-room ids.

## 3. Slice table
Builders: every slice is the job lead's (Night Shift | Menu Notes Build) agents. Size = agent hours, rough, without
waiting for Character Build.

| Slice | Goal | Depends on | e2e part | Size |
| --- | --- | --- | --- | --- |
| 0 | Phase 0: engine answers, section 14 code, scaffold, frames, facility shell, props batch 2 | - | all four (stubs) + coop, netmove, course | 10-12 h over 7 parts (0a-0g) |
| 1 | A1 the Gate | 0d | `:1` | 2.5 h |
| 2 | A2 the Carriage Shed | 0d | `:1` | 4 h |
| 3 | A3 the Office Range | 0d | `:2` | 3 h |
| 4 | A4 the Goods Shed | 0d | `:2` | 5.5 h |
| 5 | A5 the Substation | 0d | `:3` | 4 h |
| 6 | A6 the Pump House | 0d | `:3` | 4.5 h |
| 7 | A7 the Data Hall | 0d | `:4` | 4 h |
| 8 | A8 the Strongroom | 0d | `:4` | 6 h |
| 9 | Verification, docs, PR | 1-8 | all | 3 h + runs |

## 4. Slices

### Slice 0 - Phase 0 and the scaffold (SPEC sections 14, 16, 19, 20)
Parts 0a-0c started ~01:30 (STATE); the gap list's drill `flag:<id>` tick, role claim and timed `looped` console were
sent to 0a / 0b by the job lead.

| Part | Goal | Owns | Depends | Status |
| --- | --- | --- | --- | --- |
| 0a | N1 (objective steps, `flag:<id>` drill tick, role claims), N2 (isolator, `resetLights` fix), N3 (timed console, course side), N4 (hold device, no `holdNoise` yet), N8 (free bays, "Start at"); from ENGINE-ANSWERS: `em.stealth = true` in Course mode (A8, Q2), `em.despawn` in `spawnSquad` (Q4), remote players in `StealthSystems.occupied` and the door-menu close (Q9) | `src/game/course/*`, `courseHud.ts`, `courseMode.ts`, `stealthSystems.ts` (lure call, `occupied`), `coopUi.ts` N8 line; their tests; report `slices/S0-course.md` | - | running (WIP in the working tree) |
| 0b | N6 (every scanner pair, glow from position and yaw, `SecWire.sc` per pair, `PROTOCOL_VERSION` 29 -> 30 and its tests), `PassZone.any`, the `looped` camera setter for N3 | `ctDevices.ts`, `passZones.ts`, `scanners.ts`, `protocol.ts`, `coopHost.ts`; their tests; report `slices/S0-devices.md` | - | N6 and `PassZone.any` DONE (34cb5b52); the `looped` setter open |
| 0c | SPEC section 19 answers with file:line (read-only) | `docs/marlow-final/ENGINE-ANSWERS.md` | - | DONE (Q1-13; Q14-16 go to 0d / 0g) |
| 0d | The scaffold: `ctcourse.ts` rewritten as the merge; `types.ts`; `facility.ts` greybox (shell, gallery as out-of-bounds boxes and `kit.glass`, service corridors, plant room, L1-L7 with 1.8 m `kit.slidingDoor`s, pads, glass slots, L4 / L7 medkits, the L7 model plinth); eight stub set files (an empty lit room, its entry and exit doors open, one objective step "Cross to the next holding room", one lamp group) so the course walks end to end; `ctcourseBunker.ts` / `ctcourseVariety.ts` retired; the test frames (`tests/ctcourse.test.ts`: chain, `validateCourse`, text limits, lips band and unplanned boost targets, every lamp grouped (N12), door widths, register count; `tests/ctcourseLight.test.ts` reading per-set spots and json); the map-coupled cases cut from the five shared tests; the e2e frame (runner with 4 parts, `run-e2e.mjs` `PARTS` `'4'` and the quick-run map for `src/world/maps/ctcourseSets/`, `e2e-times.json` `:4`, eight stub step modules that walk each set); `shots-ctcourse.mjs` reading `SHOT_VANTAGES`; facility plan SVGs; CTCOURSE-SPEC pointer header; per-set ambient zone and `camSpaces` fields in the contract (SPEC sections 7, 13). Follow-up item (small, after the scaffold, owner: the 0d agent or a short agent of its own, files `protocol.ts`, `coopHost.ts`, `coopClient.ts` and a net test, coordinated with 0b): N4's client hold-pulse message so a client's hold reaches guards (`em.hear(pos, holdNoise)` on the host after a reach check, ~15 lines), inside the unmerged `PROTOCOL_VERSION` 30, no second bump | the shared map, test and script files in section 2 (0d rows) | 0a, 0b landed (it builds on their types) | waiting |
| 0e | Facility dressing (M5): clad shell walls (`kit.wall` faces), gallery interior (glazing, balustrade, `galleryConsole`, `galleryScreen`, `galleryChair`, lit slots on group 1), lounge pieces that sit in the shell, holding rooms (cool slots on group 2, `holdingBench`, signage plate stand-ins), the L7 `modelVitrine` | `facility.ts` | 0d checked; the props it uses (0f) | waiting |
| 0f | Props batch 2: every P prop in PROPS.md section 3 (so dressers never wait), the props renderer and helper tests | `scripts/facility-props/*`, `src/world/props/*`, `PROPS.md`, `tests/facilityProps.test.ts` | batch 1 (props agent) | after batch 1 |
| 0g | N9 (slide doors offer Open only: no crack, peek, bash, committed swing), N10 (only if 0c's Q7 says kit glass passes camera sight), the greybox helpers' Vitest tests (GREYBOX-HELPERS.md "Tests to write": `soloJumpThreats`, `COOP_BAND`, boost search, throw arc over the beams, hang reach in and out of the cage, `syncMinGap`, `JAM_HOP`, and `GREY_KEEP_CLEAR` against `soloJumpReach`), helper fixes they expose | `doorMenu.ts`, `doorOpen.ts`, `ctcourseGreybox.ts`, `tests/ctcourseGreybox.test.ts`, a door test | - (can start now) | waiting |

- Checks: each part's own tests; at the end of 0a + 0b the job lead runs `npm run check` and sends Character Build
  `e2e-coop`, `e2e-netmove`, `e2e-course` and `e2e:quick` (the wire bump and `src/game` changes); at the end of 0d,
  `npm run check` and `e2e-ctcourse:1..4` on the stubs (the course walks start to finish on two pages) plus `e2e-coop`
  (the bay-1 guard: 0d's A1 stub keeps a passive grabbable `a1-checker` in the bay-1 squad); after 0e, GPU shots of the
  lounge, a holding room and the gallery from A1 (`E2E_GPU=1`, 4189) and one perf run.
- Done: N1-N4, N6, N8, N9 merged with tests; `PROTOCOL_VERSION` 30; ENGINE-ANSWERS.md Q1-13 answered and Q14-16 answered by 0d / 0g in their reports; the
  stub course runs end to end in e2e on two pages; `npm run check` green; frames ready for the set slices; facility
  dressed under budget; props batch 2 built.

### Slices 1-8 - one per set (SPEC section 9 sheet; same steps for each)
Owns: that set's per-set files only (section 2). Depends on: 0d (the contract, the stubs, the frames); 0a / 0b code;
0f for the dressing step only; 0g's helper tests before the greybox is called done.

Steps (one agent; the fresh checker between 4 and 5):
1. **Set doc.** `sets/<set>.md` and the plan SVGs from the sheet (LD 13), before any geometry.
2. **Greybox.** The set's boxes, rooms and doors on the 6 m grid inside `SET_BOX`; co-op pieces with the greybox
   helpers (`applyGreybox`); `noLedge` on every block 1.9 m or taller that is not a planned lip; register tags.
3. **Lights baked.** Lamps, switches, isolators and groups per the sheet's Lights row and `LIGHTING-PLAN.md`; the
   set's `ambientZone` at the standby level; `<set>.light.json` tuned with `CTLIGHT_PRINT=1`; `lampGridLossless`.
4. **Guards and the e2e route.** Squad slots with routes, waits and facings per the Guards row; devices and gates;
   objective steps, role claim and radio; the set's e2e module drives one full co-op route on two pages (host and
   client roles swapped once where the set has a claim). Checker: the 16.10 review, the register count, the sheet.
5. **Dressing (M5), straight after the greybox passes.** Kit pieces and props per SPEC section 6; prop collision boxes
   written by the builder; budgets: `kitTriangles` 60 k or less, props 60 k triangles and 12 draws or less; accent
   lines on their circuit's group. GPU shots of the set's `SHOT_VANTAGES` and one perf run via Character Build. Checker
   again (block only on broken; cosmetic notes go on the polish list in the report).

Checks: `npx vitest run tests/ctcourse/<set>.test.ts` and the light frame in-step; the job lead's `npm run check` after
steps 4 and 5; slice e2e on the laptop: `e2e:quick` + the set's `e2e-ctcourse:<part>` (logic, 4191); GPU shots and
perf (4189, `E2E_GPU=1`). Set slices change only `src/world/maps/` and tests, so `e2e-coop` / `e2e-netmove` are not
required (slice 1 runs `e2e-coop` once: the bay-1 guard).

Done (each set): the sheet's geometry, lamps, guards, devices and objective lines are built; the set's e2e route passes
on two pages; its unit tests pass (lips in `COOP_LIPS`, no unplanned boost target, door and corridor widths, every lamp
grouped, light bands: lit pools 0.55 or more, cut circuits under 0.28, standby 0.14); the checker's 16.10 review has no
open break; dressing within budget with GPU shots and a perf result recorded (pending runs listed, not claimed);
`slices/S<n>.md` written.

Per-set notes (what is special; sizes are greybox + dressing):
| Slice | Set | Special work | Helpers | e2e route to pin | Size |
| --- | --- | --- | --- | --- | --- |
| 1 | A1 Gate | Arrival lounge (spawns, reception, sliding doors); passive `a1-checker` with info lines (e2e-coop's bay-1 guard) | `boostWall` | leg-up and unbolt; relay variant | 1.5 + 1 h |
| 2 | A2 Carriage Shed | N2 two-way isolators on group 21 with the lure; vans on 5.0 m centres (`noLedge`); ballast surface | `coopDeck` (staging) | isolate, cross, isolate back; shunter lured to cabinet 1 | 2.5 + 1.5 h |
| 3 | A3 Office Range | Hall send-back (`PassZone.hall`), archways, the cleaner's office loop | `jamRelay` (17.5 m, one recess) | four jams with a send-back; the A3 cases cut from `jammer.test.ts` re-added here | 2 + 1 h |
| 4 | A4 Goods Shed | N3 timed loop on C1-C3 (60 s, re-arm 20 s), officer info lines, the dock pair and kettle clock, dual takedown, mezzanine and stairs | - | officer down, loop, cross, dual takedown, wicket; the guard-info cases | 3.5 + 2 h |
| 5 | A5 Substation | Laser, panel and release; floodlight jam; L5 flag gate (no skip) | `throwGateway` | throw, flood jam, release; panel-jam variant; the laser-panel cases | 2.5 + 1.5 h |
| 6 | A6 Pump House | N4 hold on the drive panel (guard noise only after the 0d client pulse); rope from the davit; sump kerb vantage; 5 m bridge over the 4.2 m cage | `coopDeck` (gallery, rope), `hangPlate` | boost, rope, hang-down hold, drop-to-cage fallback | 3 + 1.5 h |
| 7 | A7 Data Hall | Scanner pair `sc-a7` (N6), pod and cage doors on the sync, the cage as `b.fence` mesh over kick-panel boxes with a `noLedge` lid and locked fence anchors, two cameras, grating surface | `syncStation` (scan) | split, sync, both through the cage; the scanner cases | 2.5 + 1.5 h |
| 8 | A8 Strongroom | Gallery and return, office stair, N3 loop, N2 night circuit with the `mains` grille (opaque while shut, stays open until a player closes it; nothing planned through it), inner beam curtain, second scanner pair, exit zone and dock | `coopDeck` (gallery), `throwGateway`, `syncStation` | the full six-step sequence; grille relock with egress; exit both-in | 4 + 2 h |

### Slice 9 - verification and the PR
- Goal: the whole route proven and documented (SPEC sections 12, 15, 20).
- Owns: the job lead's shared docs (`TESTING.md` per-set desktop checks, `docs/systems/testing-tools.md`,
  `docs/systems/coop.md` N1-N9, `docs/course-ready/WALKTHROUGH.md`, `changes/feature-marlow-final.md` with the
  old-best-times note, STATE.md); `scripts/e2e-ctcourse.mjs` for the cross-set checks below.
- Depends on: slices 1-8 done.
- Work: revive on each co-op surface (A1 yard, A2 staging, A6 gallery, A8 gallery); a ghost run with every bonus on a
  two-body zero-failure path (LD 15); the timing table re-estimated from the e2e and the slice reports (SPEC section
  10); the proposals list P1-P17 handed to the orchestrator for Michael; the polish list; master merged.
- Checks: `npm run check`; Character Build: `e2e-ctcourse:1..4`, `e2e-coop`, `e2e-netmove`, `e2e-course`, then the
  full `npm run e2e` on the PR head (or the merge train); `npm run e2e:gpu` subset for the map, perf budgets per area
  and a contact sheet of every set's vantages (4189).
- Done: all of the above pass (or a known-flaky suite fails only under load and passes solo); the PR to master is
  open with the summary, the proposals and the manual checks for Michael.
- Size: about 3 h of agent work plus the Character Build queue.

### Slice 10 - Michael's walk 4.72 / 4.73 (2026-10-23 ~13:55, docs/orchestrator/WALK-4.72-REPORT.md on feature/menu "Marlow Build")
The walk was on master's old Marlow Yard (its "S2" / "S3" = sections there); each item is mapped onto the A-sets and fixed
where the rebuilt yard still has it. One Opus diagnosis (read-only, slices/S10-walk.md: per item, does it reproduce on this
branch, cause file:line, smallest fix), then one implementer after the merge fixes land, one checker, e2e-ctcourse parts.
- W1 (M1) The hallway camera (A3's hall camera) is bulletproof: shots ricochet, no break (also ROADMAP "stealth over
  shooting" (1); early sets keep shootable cameras unless Michael's note covers them).
- W2 (M2) Checkpoint / set restart is a full reset: the set's guards respawn fresh (no caution from the restart, no old
  body left), killed / knocked-out bodies removed, broken cameras repaired; host and co-op client alike.
- W3 (M3) Set restart resets the set's doors (open / closed / locked as at the set start); Marlow only (Sector Ops is fine).
- W4 (M4) The A3 console's "guard still watching" refusal stays (expected); G6's switch-back (a guard who sees the console
  off turns it back on) is Guard AI Build's item, not this job.
- W5 (M5) The A2 locked-door lamp lights both rooms it hangs over (the fitting's falloff / occlusion or its room
  assignment); the all-maps lamp output review is Sector Ops Build's (S1 / LR1-LR12), so fix only Marlow's data here.

## 4c. Michael's walk of 4.82.0 (2026-10-23 ~22:15, docs/orchestrator/WALK-4.82-REPORT.md on feature/menu; Marlow's items)
Walked on 4.82.0 (the rebuilt yard: "s2" / "s3" = sets A2 / A3 unless the planner finds the HUD numbers otherwise).
Follow-ups to #257: one branch off feature/marlow-polish, one batch PR. Plan first (Opus, plans/WALK-4.82.md: per item the
cause file:line, the smallest change, files, tests, the split between Marlow and Guard AI / Player Build), then builders.
- X2 (walk 2, Marlow part) A2: being spotted fails the set (send-back, like A3's camera); more guards; more linear, fewer
  lanes; overwatch guards above the lit crossings who see a player crossing the light. Guard AI owns "report, then attack,
  keep the last known position".
- X3 (walk 3) A2: the door to the airlock exit has a floor obstacle in the way: clear the door's approach.
- X4 (walk 4) Spawn points: the two players spawn at different points in the same start area, no overlap (Player Build
  if the spawn code needs it).
- X5 (walk 5) The start room reads as an armoury / locker room (weapons display cabinet on one side, lockers), not a
  reception; the bench stands off the wall.
- X6 (walk 6) A3: a camera detection still sends back, but the guard does not turn hostile or respond to it (a training
  exercise). Marlow: the exercise rule (the set's camera send-back raises no device alert); Guard AI owns the AI side. This
  changes e2e-ctcourse:2's A3 steps (the 6a168e74 fix relies on the cleaner answering step 2's camera alarm).

## 5. Parallel order (up to 6 Opus agents)
Now (slice 0, already running): 0a, 0b, 0c, the lighting agent, the props agent (batch 1), and this spec writer when
it ends. Start 0g as soon as a slot frees: it touches no file the others own.

After 0a + 0b land: 0d (one agent; it is the gate for every set). Beside it: 0g, 0f, the lighting agent, 0c's
follow-ups.

After 0d is checked (the stub course walks end to end), the eight sets are file-independent and can run in any mix:
- **Wave 1 (4 agents):** A1 + A2 (e2e part `:1`) and A3 + A4 (part `:2`). Pairs finish their part together, so each
  part's e2e lands as a unit. The other 2 slots: 0e (facility dressing) and 0f (props batch 2).
- **Wave 2:** A5 + A6 (part `:3`) and A7 + A8 (part `:4`), each taking a slot as a wave-1 set moves from greybox to
  dressing or ends. A8 is the largest: start it first in wave 2.
- **Greybox beside dressing.** A set's dressing (step 5) runs only after its own greybox passes the checker, and it is
  the same agent and the same file, so a set never has two agents. Once set n is dressing, its slot does not free, but
  a slot freed by any finished set takes the next waiting greybox. So at any time some sets are in greybox and others
  in dressing, never the same set twice.
- **Checkers** are short extra agents; count them in the 6 and run them between a set's steps 4 and 5.
- **Never in parallel:** two agents on one set file; any agent with 0d (it rewrites the shared frames); the job lead's
  `npm run check` while an agent is mid-edit (run it when a batch of agents has stopped). On the laptop, one GPU run
  at a time on 4189 and at most two logic runs (4191, 4192).
- **Shared-file requests.** A set agent that needs a change in a shared file (a contract field, a helper fix, a new
  prop, a kit fix) stops that item, writes it in its report and carries on; the job lead (or the owning agent) makes
  the change and tells the set agents to rebase their use.

Critical path: 0a / 0b -> 0d -> A8 (greybox, dressing) -> slice 9. About 3 + 3 + 6 + 3 h of agent time plus the
Character Build queue.

## 6. Open items
- Slice 0 is in flight from the ~01:30 section 14; 0a / 0b reports must confirm the claim rule and the `looped` console
  match SPEC N1 / N3 as rewritten (the job lead sent them the same items).
- 0c's answers (Q1-13) are folded into SPEC and CONSTRAINTS section 2. Q14-16 (slide-door verbs, claim race, LED
  accent re-read) stay open for 0d / 0g; any change goes into the set sheet before that set's greybox.
- N4 ships without client guard noise until the 0d follow-up pulse lands.
- Q13's GPU shot of the corridor and aisle widths is pending on Character Build (per set, with the dressing shots).
- Greybox helpers: not yet tested (0g); `GREY_KEEP_CLEAR` 3.0 m is unchecked against `soloJumpReach`; no overwatch
  ledge or one-way drop helper (not needed on this route). The A6 bridge vs cage clash is settled in SPEC (5 m bridge,
  4.2 m cage); the plate is 0.55 m.
- `LIGHTING-PLAN.md` and `docs/lighting-review/PROPOSAL.md` are being written; set agents read the per-set sections
  when they land, and SPEC section 7 wins a clash.
- Instructor figures (N14), signage plates and automatic doors are Future items; the gallery ships with empty chairs.
- Proposals P1-P17 wait for Michael; nothing in the standard changes until he answers.
