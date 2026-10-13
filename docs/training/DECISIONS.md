# Training bunker - decisions

Authority: Michael > this file > `docs/design-bible.md` > `docs/training/SPEC.md` > `docs/level-design.md` > other docs > code.
Every answer below is Michael's, given on 2026-10-13 in the design session (cloud, documents only), through the
multiple-choice tool. His own words are quoted where he typed them; otherwise the option he picked is quoted.

## Michael's vision (relayed at the start of the session, his words)
- One linear co-op training map. Two players start together and follow a linear training course.
- The course forces them to use every system: all locomotion, co-op traversal, weapons, equipment, enemy attacks,
  grabbing and dragging, and security.
- Co-op gates along the way keep it interesting by splitting the team route so the players help each other: one player
  has to disable something so the other can pass, and so on. Locked doors behind them stop backtracking.
- It is a vertical slice and a thorough test map of every available feature and of co-op sync.
- Setting: a high-tech training facility in a concrete underground bunker. All lighting is artificial, showcasing light
  and darkness.
- It does not have to be perfectly designed, but it must vary enough to stay interesting: not one long room. Basically a
  large linear training course.
- He may prioritise it over the full Kestrel map build (Dead Line), because it forces everything into one session and
  shows whether the gameplay is fun.

## Answers (2026-10-13)
| # | Question | Michael's answer | Where it applies |
| --- | --- | --- | --- |
| D1 | Co-op only, or a solo fallback? | "Co-op only" | SPEC exceptions E1-E3; no solo routes are built. Solo testing uses the dev bot partner (locomotion step 20); solo teaching stays in Training mode. |
| D2 | 2 players, or 2-4? | "Exactly 2" | Every gate is a pair task. The course mode refuses a third player in the lobby. |
| D3 | Target length and number of bays | "30-40 min, 9 bays" | BAYS.md beat chart: about 3.5 minutes a bay plus 9 airlock cycles. |
| D4 | In-story frame and opposing force | "Night Shift rehearsal site": a Continuity Office bunker under Hollowmere; guards are role-players firing marking rounds; downed = revive; both down restarts the bay at its airlock | SPEC building brief and mission; BAYS failure rules. |
| D5 | Lock-behind rule | "Two-person airlocks": each bay ends in an airlock that cycles only with both players inside, then seals behind them; a guaranteed regroup, a checkpoint and a sync check | BAYS airlock sheet; the course framework (PLAN T1). |
| D6 | Branch for the map code | "feature/training-bunker", off feature/kestrel; merges kestrel and ct-locomotion in as features arrive | PLAN branch plan. |
| D7 | Priority against Dead Line (P03R onward) | "Bunker greybox first": the bunker before P03R, then bays switch on alongside Dead Line stages as features land | PLAN build order. |
| D8 | Changes to the draft bay list | Picked: "Add a CT acrobatics shaft", "Merge corners into security", "Add a sound bay" | BAYS: bay 3 is the shaft; corners teach on the way into security (bay 6). |
| D9 | The 10 bays that D8 gives against the 9 of D3 | "Merge sound into light": one "Light and sound" bay, 9 bays | BAYS bay 5. |
| D10 | Exceptions to the standard and the bible for this map | "Approve for this map": only the listed rules are loosened; each guarded bay keeps two routes, a loop, a dark vantage and the light rules; every rule kept is enforced in full | SPEC section "Approved exceptions" (E1-E9). This row is Michael's written approval required by `docs/level-design.md` (preamble) and CLAUDE.md hard rules. |
| D11 | How the training guards behave | "Real AI, marking rounds": full perception, patrols and alerts; damage is real, so downs and revives happen; takedowns knock out | BAYS guard sheets; SPEC mission. |
| D12 | Living test map and the editor second-map part | "Claude must create the whole map as detailed as possible, start to finish, without consulting me. I will review once completed. If any systems should be created prior, let me know." | PLAN: Claude builds the whole map in code (no editor greybox by Michael); build sessions run back to back with Claude self-review and no Michael gate until the final review (SPEC E9); prerequisite systems listed in PLAN section 2. The editor part is kept only as optional later scope (PLAN section 6). This design session also ran without further questions or summary rounds. |

## Decisions Claude made under D12 (Michael reviews them at the end)
| # | Decision | Reason |
| --- | --- | --- |
| C1 | Map id `bunker`, display name "Fallow", the Continuity Office training site under Fallow Hill, north of Hollowmere. Role-players employed by "Cresset Training Ltd". | Original names (story 2, bible 0). A cresset is a fire basket: light, the game's theme. |
| C2 | The course descends: bays 1-2 at y 16, bays 3-6 at y 6, bays 7-9 at y 0. Nothing is below y 0. | Nav sampler casts down to y -2 only (level-design 12): an underground map is built above ground and roofed. |
| C3 | Operator roles swap at every airlock (P1 = host, P2 = client; "lead" and "second" alternate), so across the course each player performs every verb at least once. | Vision: "forces them to use every system"; FEATURES.md proves it per player. |
| C4 | Every gate has a "now" form built from existing systems and a "final" form that switches on when its feature lands. | D12 plus the living-map approach: the whole course is playable from the first build. |
| C5 | A course framework system (new: course mode, airlocks, gates, per-bay checkpoints) is built before the map, on this branch. | It is the one thing no existing system does (PLAN section 2, item 1). |
| C6 | `MapDef.navLayers` 5 for the bunker. | The shaft (bay 3) stacks galleries over one column; the atrium (bay 9) has three floors. |
| C7 | LANTERN runs the exercise on the radio; text radio and subtitles only. | Story 4 and 7; no voice (CLAUDE.md). |
| C8 | Timed holds appear only in bays with no guards (bays 2 and 4). | Bible 6 "never: forced timers in stealth sections". |
