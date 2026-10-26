# campus-greybox - BRIEF

Job: build the signed-off Saltmarsh Park plans (Sector Ops map `campusOps`, sections S1-S5) as greybox, merged dark behind
`flags.campusV2` until Michael accepts each section's walk. FOLDED-PLAN J17 ("Campus greybox v2 (row 9)": signed-off
counts, 3-4 player tags, graph keys 1-4, guard totals, unavoidable tags, splits / assist / overwatch, Rule index errors,
S5 cap, section 15 acceptance tests for campusOps). Lead: Night Shift | Sector Ops Build. Branch `feature/campus-greybox`
(P0 and integration); section lanes `feature/campus-greybox-s<N>` (and S3's sub-lanes, S2's G6a, TAG, E2E) each in its
own worktree `C:/NightShift/Mobile-Coop-campus-greybox-<suffix>` (PLAN section 2 "Worktrees"), PRs to master.

## Michael said

- "I would prefer having as many guards as realistically possible to make it challenging." (2026-10-24 ~22:00)
- "each section should gradually get harder with more guards and more security." (2026-10-23 ~01:20, quoted in
  `S1-detail.md` section 6)
- "the s1 car park is still very dark which is unrealistic, car parks are generally well lit" (2026-10-25 ~09:05)
- Q20, a downed Sector Ops player nobody can reach (2026-10-25 ~16:50): "30 seconds then death and wait until next
  section door"

## Michael picked

The five campus picks, 2026-10-25 ~08:50, native multiple choice (pages `docs/sector-redesign/signoff/S<N>.md` on
`origin/feature/sector-redesign-signoff`, section "Michael's pick"):

| Section | Question | Michael picked |
| --- | --- | --- |
| S1 gatehouse, car park, forecourt | Build Campus S1 to this plan? | "Go as drawn (15 guards)" |
| S2 HQ atrium and offices (Split Shift) | Build Campus S2 to this plan? | "Go: void 14.5 m, 18 guards" |
| S3 lab block (re-plan) | Rebuild S3 to this plan? | "Re-plan as drawn, 20 guards" |
| S4 data hall (Code Relay) | Build Campus S4 to this plan? | "One 6 m goods-in lobby" (corridor and lobby merged) |
| S5 Old House and extraction | Build Campus S5 to this plan? | "26 guards, inside the 32 cap" (no cap raise) |

Later picks that bind this job (ROADMAP "Decided" on origin/feature/menu, 2026-10-25):

| When | Question | Michael picked |
| --- | --- | --- |
| ~09:05 | Light levels | "Real-world levels" (each space lit to its real-world band; stealth from real gaps only) |
| ~09:05 | Proving flow | "Bot route-runs + your walk" (route-runs at greybox exit, then a 10-minute walk card) |
| ~11:55 | Who the campus counts are for | "Two players" (1 player the same, no scale-down; 3-4 players add the tagged extras) |
| ~16:40 | Q2 dark spots from lights left off | "Never" (every light works; darkness only from cover, cut power and shot lamps) |
| ~16:40 | Q4 32 guards | "60 fps (Recommended)" |
| ~16:40 | Q7 route-runs | "Never stuck (Recommended)" |
| ~16:50 | Q10 S5 extras with 3-4 players | "Keep 32, fill rest (Recommended)" |
| ~16:50 | Q14 guards and your cast shadow | "A faint cue" (J16's build, not this job) |
| ~16:50 | Q16 4-player Sector Ops | "Live now" (#317 coop4 ships on, no off switch) |
| ~16:50 | Q21 S2 team doors | "No, two players (Recommended)" |
| ~16:50 | Q26 old warehouse map | "Freeze it" (no more work on warehouseOps) |
| ~16:50 | Q27 meter vs picture | "Yes, every release (Recommended)" |
| ~18:05 | Split Shift (S2 mission page) | "Approve as drawn" |
| ~18:05 | Code Relay (S4 mission page) | "Approve, code re-askable" (an expired 30 s code can be asked for again; no hard countdown) |

The mission pages: `origin/feature/mission-framework:docs/missions/prototypes/split-shift/SIGNOFF.md` and
`.../code-relay/SIGNOFF.md` (their device lists: `BEAT.md` "Nodes needed from Sector Ops").

## Sources

- Plans (`origin/feature/sector-redesign-signoff` @9eb7b9c6, `docs/sector-redesign/signoff/`): `S<N>.md`, `S<N>-detail.md`,
  `S<N>-plan-<y>.svg`, `SYNC.md`, `README.md`, `checks-signoff.md`; plan graphs `docs/sector-redesign/graph/plan/`.
- Conformance (origin/master): `docs/conformance-sector-ops/CONFORMANCE.md` C1-C16 and section 4; Guard AI A1, A2, B14;
  Marlow V9; Test Runner T6 (campusOps half). FOLDED-PLAN (origin/feature/menu) section 3 break 27, section 4 J17.
- SPEC lighting: `docs/sector-redesign/SPEC.md` S1-S5 "Lighting." paragraphs on `origin/feature/sector-ops-docs` (#433, the
  Q2 rewrite), not master.
- Live code: `src/world/maps/campusS<N>*.ts`, `campusSectors.ts`; coop4 on `origin/feature/coop4` (#317): `minPlayers`,
  `guardForTeam`, `capReinforce`, `tests/sectorGuardTags.test.ts`.
- Rules: `git show origin/master:CLAUDE.md`, `docs/RULES.md`, `docs/systems/agent-preamble.md`, `docs/level-design.md`
  (4.9, 4.12, 5.5, 9.4, 11, 14, 15).

## Assumed decisions (each undoable)

Status per entry: kept, CHANGED (with the answer that changed it) or REPLACED (no longer in force).

- **A1 Dark merge per section** (kept). Each section is rebuilt in its own v2 files `src/world/maps/campusV2/s<N>.ts`,
  `s<N>Dress.ts`, `s<N>Data.ts`, picked per section by `flags.campusV2` (`src/core/flags.ts`, default `CAMPUS_V2_ON = []`;
  owner Sector Ops Build; switch-on = the day Michael accepts that section's walk). Q16 "Live now" concerns coop4 (1-4
  players), not this flag. Undo: delete `campusV2/` and the five v2 imports in `campusSections.ts`.
- **A2 PR per lane slice group, under ~1.5k changed lines** (kept; PLAN "PRs"). Undo: one PR per section.
- **A3 Greybox exit = measured validator pass + bot route-runs + walk card** (CHANGED: was the measured pass only; RULES
  Intake 5, G289, G330, "Bot route-runs + your walk", Q7 "Never stuck"). The measured pass waits for J12 (V6 port), the
  route-runs for J13. Until both are on master each section merges dark and does not exit. Undo: none (a rule).
- **A4 P0 copies the live code verbatim** (kept) into `campusV2/` (~4.6k lines); the P0 PR is over ~1.5k because of the
  copy; `tests/campusV2.test.ts` proves every copy builds the same campus. Undo: `export *` re-exports.
- **A5 Section data split out of `campusSectors.ts`** (kept). Undo: inline back (revert the P0 data commit).
- **A6 Joins stay live** (kept). A v2 file imports another section's constants only from the live file. Undo: a shared
  `campusV2/joins.ts`.
- **A7 Shared items have one owner, the lead** (kept; PLAN "Shared, one owner"). Undo: a lane owner per item.
- **A8 Engine lane** (REPLACED by Q21 "No, two players"). The only engine item was ENG-1, a solo window on the S2 team
  doors (one player turns both keys within 8 s). Team doors stay two-player; solo goes round (the comms door into the
  landing, the exec east door, `S2-detail.md` AS6). No `src/game` change is left in this job: tags and the spawn filter
  come from #317 (J4), mission wiring from J26. Undo: if Michael picks the Split Shift page's "solo line" over Q21 (PLAN
  "Needs Michael" 1), restore ENG-1 from `briefs/S2.md` section 7 (kept there, marked dormant).
- **A9 `?campusv2=1,3` works in production builds** (kept). Undo: read it only under `import.meta.env.DEV`.
- **A10 Walk** (rewritten 2026-10-25 ~22:40). Michael ~22:25 "Drop old, walk new": the v1 walk is dropped and he walks
  v2 S1-S5 at greybox exit (all five on one card, not 3 at a time). Builds go on dark; switch-on waits for his walk
  (RULES "Walk pacing"). Exit inputs: `EXIT.md`. Undo: none (Michael's pick).
- **A11 Live assets stay live** (kept). Undo: none needed.
- **A12 Live tests stay live** (kept). v2 tests live in `tests/campusV2S<N>*.test.ts`; the SW-<N> PR retires the live
  section tests and updates `tests/sectorGuardTags.test.ts` (PLAN "Switch-on"). Undo: none needed.
- **A13 Validator graphs** (CHANGED 2026-10-25, plan check 1: was the live path; widened by A16-A18). J12's campus drift
  test (`tests/levelMeasureCampus.test.ts`, validator-port S10) re-measures the five live graph files against the campus
  built with every flag off, so a v2 graph on the live path fails it while the section is dark. The lead seeds
  `docs/sector-redesign/graph/v2/campusOps-S{1..5}.json` with the five signed plan graphs (PLAN V2-SEED); each lane edits
  only its own v2 file; EXIT-<N> measures it with the section's flag on; SW-<N> moves it over the live path. V6 stores
  one whole-map `geom` (light-set hash + nav hash) on every graph, so switching any section on stales all five live
  graphs: SW-<N> then runs `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S1.json ... campusOps-S5.json
  --write` (all five files, spelled out in PLAN section 9) on all five live graphs with the new `CAMPUS_V2_ON`, and the
  drift test `tests/levelMeasureCampus.test.ts` is green in the same PR (CHANGED 2026-10-25, plan check 2). The live
  graph files stay J12's until SW-<N>; from SW-<N> on, each switch-on re-writes their `measured` values (J12 told).
  Undo: write the live path once J12's drift test builds each section with the flag its graph names.
- **A14 Two tagged extras per section** (new; G331, G362, "Two players", C2, Guard AI A2). Each section's base list is the
  signed-off count, spawned for 1 and 2 players; it appends one guard tagged `minPlayers: 3` and one `minPlayers: 4`
  (coop4's pattern and its test: at most 2 per section, appended, each with a reason, never a desk operator, dog, handler,
  post or pair partner, at least 7 m from the start). Totals at 1 / 2 / 3 / 4 players: S1 15 / 15 / 16 / 17, S2 18 / 18 /
  19 / 20, S3 20 / 20 / 21 / 22, S4 25 / 25 / 26 / 27, S5 26 / 26 / 27 / 28. Retires the plans' "campus guards do not
  scale" (S2-detail AS13, S3-detail AS13, S5-detail AS3). Undo: drop the tagged rows (coop4's test then needs 1 per
  section: keep one).
- **A15 Q10 applies wherever tags meet the cap** (new). Michael's Q10 answer names S5; S4 also passes 32 at 4 players with
  its reinforcements (27 + 6 = 33). Both keep the 32 live cap: the section's own guards always spawn, the base
  reinforcements (`perStage`) always go (pending until there is room), the 3-4 player reinforcement extras fill only the
  room left (`capReinforce`, #317). The hard check becomes base + `alarmMax` x `perStage` <= 32 and every spawned list
  (with tags) <= 32. Undo: S4 keeps one tag (26 + 6 = 32).
- **A16 Graph keys "1".."4" on every guarded space** (new; C8, M V9). Key "1" = key "2" (no scale-down); "3" and "4" add the
  tagged extras in the space they stand in. Undo: none (level-design 4.9 asks for it).
- **A17 Every spawned guard counts in some space's `guards`** (new; C9). Posted chokes, connector, hub and utility
  guards and dormant guards included (they spawn), so each section's graph sums to its spawned count at every key. This
  replaces counting them in `note` (campus-run CONVENTIONS "count in their space's guards" agrees). Undo: a section total
  field the alive check reads (needs J12).
- **A18 `unavoidable` tags** (new; C10, G B14, LD 4.12). The space of each K guard: S1 `s1-forecourt` (K1), S2
  `s2-l1-landing` (K2), S4 `s4-cc` (K3), S5 `s5-ante` (K4); S3 none (its plan has no K guard). S2's and S4's spaces are
  connectors, so the validator WARNs "not a guarded encounter space": justified in the graph note and asked of J12
  (accept a guarded exit connector). Undo: retag only `s5-ante` (one tag satisfies the map-level check).
- **A19 Light per Q2 "Never" and G329** (new; replaces S1 A24 and any plan line that removes, dims or leaves off a fitting
  for a shadow target). Every lamp of a section lives in one data block `S<N>_LIGHTS` marked PROVISIONAL (J10, light-realism,
  supplies the band values; until then today's engine values). No fitting is built off or dead, and no as-built fitting
  is removed or dimmed for a shadow target; a plan "replace" keeps the as-built fitting unless the new one lights the same
  space at least as much. Every room with a fitting is lit on a cuttable circuit (SPEC on #433); a place is dark only with
  no fitting (nobody works there at night) or behind an occluder. Plan or SPEC lines that call a lit room "dark" are
  read "lit; dark once the players cut its circuit". Shadow-share targets stay INFO (LD 5.5). Undo: J10's band table
  replaces the values; never by switching fittings off.
- **A20 Mission devices as greybox data and props, wiring by J26** (new; "Approve as drawn", "Approve, code re-askable").
  Every device the two mission pages list is placed by the S2 / S4 lanes with its sync id in a `// sync-...` comment: as
  real data where the engine has it (desks, boards, keypads, intel), as a visual prop plus a reserved id where it does not
  (the NOC release console, the cage code prompt, the footage drive, the seat placard, the post-room note). The mission
  engine (FOLDED-PLAN J26, Campaign) supplies the named interrogation, the release window (re-askable, no hard
  countdown), the footage action, per-team restarts and per-area alarms; Guard AI supplies the twist walks and guards
  passing keypad doors (PLAN "Hooks for J26"). Undo: delete the props; the ids stay reserved in SYNC.md.
- **A21 warehouseOps is out of scope** (new; Q26 "Freeze it"). No graph, tag or audit work on the old map here (C13 closed
  by the answer). Undo: none.
- **A22 Downed rule is J18's** (new; Q20). "30 seconds then death and wait until next section door" changes the engine (J18,
  `reviveClock`, `coopHost`, `sectorMode`), not the maps. The greybox keeps LD 11.6 (every co-op surface also reached
  without a co-op move, partner reach targets); S4's accepted ~25 s basket reach stays inside the 30 s. Undo: none.
- **A23 P0 and coop4 order** (CHANGED 2026-10-25, plan check 1: all five data files). #317 appends two tagged rows per
  section to five files: S1-S3 in `campusSectors.ts` (which P0 splits into `campusS1Data.ts`, `campusS2Data.ts`,
  `campusS3Data.ts`), S4 in `campusS4Data.ts` and S5 in `campusS5Data.ts` (both also edited by P0: `S4_PARTS` / `S5_PARTS`).
  Whichever lands second carries the other's change, into the live files and into every v2 copy whose `S<N>_V2_COPY` is
  still true (`tests/campusV2.test.ts` holds those copies equal to live; a section whose lane has cleared its marker skips
  that check and needs nothing). #317 first (expected): at P0's master take the lead moves its S1-S3 rows into
  `campusS1Data.ts` .. `campusS3Data.ts`, keeps its S4 / S5 rows in `campusS4Data.ts` / `campusS5Data.ts`, and copies the
  ten rows into `campusV2/s1Data.ts` .. `s5Data.ts` before P0 trains. P0 first: #317 puts its S1-S3 rows in the split
  files and all ten rows in the still-marked v2 copies. In v2 the rows live only while the copy marker holds: each lane's
  guard slice writes the signed base list with no `minPlayers` row and TAG-<N> appends the v2 rows (PLAN section 5,
  TAG-<N>). Undo: none.
- **A24 S5 CR7 hoist door is a pair gate** (new; `briefs/S5.md` P1). The signed page says "the hoist door becomes a pair bolt".
  An E3 pair bolt draws only while the partner pushes the leaf from the far side of the door (`sectors.ts` `partnerAtDoor`), and
  the far side of the hoist door is the open light well 4.2 m down, so nobody could open it. A pair gate (two key switches in
  the archive, 6.5 m apart, 1.0 s) keeps the page's intent: two players only, never one (G280). Undo: a pair bolt once the
  engine allows a same-side partner.
- **A25 S5 CR7 way down is the hang-drop, not a rappel anchor** (new; `briefs/S5.md` P2). The rappel reach (0.9 m) has no door
  test (`anchors.ts:762-768`), so an anchor on the hoist sill could be used through the shut door. Behind the pair gate the
  4.2 m drop is under the 4.5 m safe drop; the way back up stays the two-person rope. Undo: add the anchor when the engine's
  rappel query checks doors.
- **A26 sector-marks first, campus-greybox carries** (new; same lead's order, `origin/feature/sector-marks`
  `docs/archive/sector-marks/PLAN.md` "Risks"). sector-marks (a G355 rule fix) merges first and edits master's files as they are:
  the four objective `label` strings (S1 and S3 in `campusSectors.ts`, S4 in `campusS4Data.ts`, S5 in `campusS5Data.ts`)
  and `Math.hypot(dx, dz)` -> `hyp2(dx, dz)` in `campusS4Dress.ts` `around` (with `import { hyp2 } from
  '../../core/mathx'`). At its next master take campus-greybox carries them: the S1 / S3 labels into `campusS1Data.ts` /
  `campusS3Data.ts` (where P0 moved them), all four labels into `campusV2/s1Data.ts`, `s3Data.ts`, `s4Data.ts`,
  `s5Data.ts`, and the `hyp2` change into `campusV2/s4Dress.ts:177` (its import too). `tests/campusV2.test.ts:89` fails
  until the label copies match; `s4Dress.ts` has no such check, so this line names it. A lane that has already re-laid
  its section keeps the label text and the `hyp2` call in its own file. A lane that re-lays or renames rooms keeps the
  objective label naming a room of its v2 `S<N>_ROOMS` that holds the objective point (and moves the room word with a
  rename; G336, G351): sector-marks' `tests/campusObjectivePlace.test.ts` reads the live `CAMPUS_SECTORS`, so it checks the
  v2 label once the section is on, against the room list SW-<N> points at v2 (PLAN section 9). Undo: none (a rule fix).
- **A27 Guard AI J15 PR1 first** (new; the orchestrator's order, 2026-10-25; guard-rules `docs/archive/guard-rules/PLAN.md` PR1
  and "J17 order"). Guard AI's guard-rules PR1 lands on master before any J17 edit to `campusS4Data.ts` /
  `campusS5Data.ts`: P0 (it adds `S4_PARTS` / `S5_PARTS` there), any carry of A23 / A26 into those files train after PR1,
  and every lane PR (S1-S5) while it still carries P0's commits trains after PR1. PR1 drops the S4 / S5 section `gear: 'helmet'`, turns `gear: 'both'` into `'armour'` and sets `shieldTeams: true`;
  its `checkSectorGuards` then fails a `'helmet'` / `'both'` tag. At P0's master take the lead carries PR1's S4 / S5 data
  into `campusV2/s4Data.ts` / `s5Data.ts` (copies = live). The S4 / S5 lanes write no `'helmet'` and use `'armour'` where
  their briefs say `'both'`. guard-rules S9 (its PR4) puts `post: { leash: 1, lookout: true }` on the live S5 roof
  marksman; the S5 lane (S5-b) or, if PR4 lands later, SW-5 carries it to the v2 roof marksman. Undo: none (an order).
- **A28 Start-at-section link for the walk** (new 2026-10-25 ~22:40, Sector Ops Build). A 10-minute card cannot reach
  S3-S5 from the menu (play starts at S1). A dev / test URL argument that starts a campusOps run at section N (with
  `?campusv2=N`) is planned as a small lane before EXIT; it reads only URL data, never a save. Undo: Michael plays through
  from S1 (a longer card).
- **A29 Exit waits for the v2 light measure** (new 2026-10-25 ~22:40). ROADMAP Decided ~09:05 measures light from the bake
  at greybox exit; the v2 lamp blocks are PROVISIONAL (A19) and J10 L1 / L2 light the v1 files. So J10 also measures each
  v2 section (`lux-grid` with `?campusv2=N`) and sets its lamps before that section's EXIT. Undo: none (higher source).
