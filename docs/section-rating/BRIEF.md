# section-rating - BRIEF

Job: section rating with real rewards, and co-op synced takedowns that pay more than shooting.
Branch `feature/section-rating`, folder `C:/NightShift/Mobile-Coop-section-rating`, cut from master 3c460923.
Lead: Menu Notes (after marlow-final). Planned 2026-10-23 ~12:05 by a planning subagent (docs only, nothing built).

## Michael's words (verbatim, with dates)
- 2026-10-23 ~10:10 (native multiple choice in Character Build, relayed; docs/ROADMAP.md "Decided"): theme
  "reward stealth over shooting as sections get harder".
- Item (5), added by Michael: section rating (undetected / no kills / no alarms / bodies hidden) with real rewards.
- Item (12), added by Michael: co-op synced takedowns reward more than shooting.
- Not chosen: ghost-run bonus gear.
- ROADMAP "Next: stealth over shooting": "New job section-rating (after marlow-final, Menu Notes): undetected / no kills
  / no alarms / bodies hidden, with real rewards (5); rewards synced takedowns (12)."

## Goal
At the end of every section (Sector Ops) and every rated Marlow Yard set, the game rates how the players did on four
stealth marks: undetected, no kills, no alarms, bodies hidden. Each mark earned gives something the players feel in the
next section. Synced co-op takedowns (two players dropping two guards together) earn more than any shooting does.

## Limits
- Prototype first (CLAUDE.md current goal): ship the smallest playable version, no refining before Michael plays it.
- No parked systems: XP, levels, cash, arsenal, suit, HQ, cosmetics (`?legacy=1`, `src/progression`, `src/cosmetics`)
  stay parked. "Real rewards" here means in-run resources, not progression. Reviving any parked system needs Michael.
- "Not chosen: ghost-run bonus gear": no new gear, weapon or gadget unlocked by a ghost run. Rewards top up what the
  player already carries (a charge, a syringe, a use), never add new kit.
- Do not plan other jobs' work. Interfaces only: guard-ai (alarm stages, missed check-ins, bodies found),
  sector-redesign (weapons-crate refill between sections, bulletproof cameras), CT Core (interrogation, suppressor
  ammo, the dual / synced takedown move if it builds one).
- Hard rules: saves in IndexedDB (`src/save`), a profile shape change bumps `SAVE_VERSION` (now 9) with a migration
  and a literal-old-save test; `src/net` only through dynamic `import()`; any wire change bumps `PROTOCOL_VERSION`
  (now 31); gameplay never reads graphics state; hot paths do not allocate.

## What exists on master (so the job reuses it)
- `src/game/course/courseRating.ts`: a finale-only tier (Ghost / Silent / Loud) and points from `BayStats`.
- `src/game/course/courseState.ts:29` `BayStats` per bay and per player: detections, alarms, knockouts, kills,
  revives, teamMoves, bodies. Already sent to the client in the `course` message (`src/net/protocol.ts:525-548`).
- `src/save/courseRecord.ts`: kv key `course:fallow` with best rating per course, no SAVE_VERSION bump needed (C9).
- `src/game/sectors.ts:585` `sectorResult`: ghost = no kills and never spotted, one end-of-op line. Sector Ops has
  co-op revive syringes per section (`sy` in the sector wire state, `sectors.ts:589-605`).
- No synced / dual takedown exists (G52: the dual takedown waits; teamMoves today are ladder, rope, hang, throw, boost).

## "Real rewards" without parked progression - options
| # | Reward | Cost | Save change | Wire change |
|---|---|---|---|---|
| R1 | Per mark earned, a top-up for the next section: Undetected = +1 gadget charge (jammer / noise maker, capped at the starting count), No alarms = +1 co-op revive syringe (cap +2 over the preset), No kills = suppressor rounds refilled (once CT Core has them; until then +1 medkit), Bodies hidden = the next section's first alarm stage is skipped one step (guard-ai interface) | M (2 slices) | No | Yes: rating + reward grant in the sector / course state (bump) |
| R2 | Rating card at each section end (4 marks, tick or cross, the reward it gave) plus the op-end summary line | S | No | Rides on R1's field |
| R3 | Best rating per section saved and shown on the op / course select (medal per section) | S | No: a new kv key `rating:sections` beside `course:fallow` (C9 pattern) | No (host saves, as course record) |
| R4 | Synced takedown bonus: two takedowns by two players within 1.5 s count as one synced takedown; each gives the team +1 gadget charge or refills one syringe (cap as R1) and shows "Synced" on the card. Shooting kills give nothing and cost the No kills mark | S-M | No | Yes: a `synced` count in the stats (same bump as R1) |

Recommended: R1 + R2 + R3 + R4 (all four, small). No profile change, one protocol bump.

## Questions for Michael (M-candidates) with the default used until he answers
- M-a: Which rewards? A1 = R1 + R2 + R3 + R4 as above. Undo: drop the reward table rows in `rewards` data
  (`src/game/rating/sectionRewards.ts`), the card still shows marks.
- M-b: Does a knock-out break "No kills"? A2 = no: knock-outs are not kills (matches Sector Ops A4 and G146).
  Undo: one flag in the rating rules.
- M-c: "Undetected" - does a camera sighting count? A3 = yes: any guard detection or camera alarm breaks it (matches
  `sectorResult` "spotted"). Undo: one flag.
- M-d: "Bodies hidden" with no bodies made - earned or not? A4 = earned (a clean section with no takedowns earns all
  four). Undo: one flag (`bodiesHiddenNeedsBody`).
- M-e: Marlow Yard: rate every bay or only the finale? A5 = rate only the sets that have guards (drill bays stay unrated,
  D31); the finale keeps its Ghost / Silent / Loud tier beside the marks. Undo: the per-bay `rated` flag in course data.
- M-f: Synced window. A6 = two takedowns by two different players within 1.5 s (no new move, no animation; CT Core's
  dual takedown, if built, counts too). Undo: one constant.
- M-g: Rewards in solo? A7 = yes, the same table; syringe rewards become +1 medkit in solo (no revives solo).
  Undo: the solo column in the reward table.
- M-h: Does a section restart keep the earned reward? A8 = the reward is granted when the next section loads; a
  restart of that next section keeps it (it is part of the checkpoint state); a restart never re-rates. Undo: grant on
  every load instead.

## Assumed decisions logged during the build
- A9 Bodies hidden gives +1 gadget charge instead of alarmStep until guard-ai's stage API is on master. Undo: map
  BODIES_HIDDEN to alarmStep in sectionRating.ts's table and call the stage API in sectorMode.
- A10 Any alarm stage rise (camera, laser, panel) breaks No alarms (PLAN's table had panel alarms only); the card and
  the HUD agree. Undo: drop the alarms++ in cameraAlarm.
