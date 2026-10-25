# guard-ai-mission-hooks S1b: check A (mission order groups, intent and behaviour)
Owner: Guard AI Build. Status: current.

Head checked: `9f81055a1` (base `e138b2a7e`, S1a-2's passed head). Checker A (Opus 5.5), independent of checker B.
Read: S1b-BRIEF, job BRIEF A5 / A6 / A8, PLAN Design 1 (offer table, group row), "Slices" S1b, "Walk items" Split
Shift and the C2 map data, the whole diff (`missionOrders.ts`, `enemy.ts`, `enemyManager.ts`, the two test files,
the e2e scenario), plus the S2 guard data (`campusSectors.ts:85-127`) and `enemies.json` walk speeds.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/missionGroups.test.ts tests/missionOrders.test.ts tests/missionOrdersManager.test.ts`: 3 files,
  68 tests, all green.
- e2e not run (queued separately: `laptop-e2e/mh-s1b-early`).

## Brief against build
Every Goal item is built as briefed: groups by name + via (`group`: via set, 2+ members, not left); members wait at
the via (`LEG_WAIT_VIA`, `markVia`, no walk time); leave when every recorded member has `memVia` or `joinWait` after
the first arrival (`gatherStep`); the first live member in event order leads (`firstLive` each tick); followers walk to
`followGap` from the leader and hold still inside `followGap + FOLLOW_SLACK`; a dropped member leaves and the next
leads (`LEG_FOLLOW` -> `LEG_TO_POST`); a member dropped at the offer is recorded and counts as not there (full
`joinWait`); phase `gathering` then `walking`; a follower near the arrived leader is marked arrived; the leader's
end ends each follower done ('lead'); lone orders and flag off unchanged. Hot path clean: index loops, `hyp2`, one
`atan2` per leg step, no closures or temporaries; the dev log string is built only on leave under `DEV`. The `Map`
in `checkMissionOrders` is data time. All 11 brief test items are present.

Builder departures, judged:
1. `OrderLeg.start(..., yaw, me)`: needed (S1a-2 added `yaw` before S1b). Fine.
2. `missionOrdersManager.test.ts:202` `toEqual`: forced by brief step 3.5 (`orderOf` gains fields). Fine.
3. `FOLLOW_SLACK` exported, follow stop radius `FOLLOW_SLACK * 0.5`: correct. With `ORDER.arrive * 0.8` (0.64 m)
   `goTo` stops him 2.0-2.14 m out, never `near`, never 'arrived'. Fine.
4. Leader's end ends the group only when `gath` or `left` is set: required, else same-name orders without a via (each
   walks alone, brief step 1.6) and S1a multi-member orders would end with their first finisher. Fine.
5. A new leader's arrival heading from where he stands: the brief is silent; sensible. Fine.

Known limits, for Split Shift:
- One pending tag per slot: both `ss-power` tags pending at a replay loses #7's tag (`enemyManager.ts:2655`
  overwrites). Not blocking for Split Shift: the world restart relights 55 / 56, so the replayed reset ends 'on' at once
  whoever takes it. Polish 1.
- Second event after member 1 passed the via: not hit at the cut (both events fire in one step). The same path is
  reachable through a late-placed #1 (`offerPlaced` -> `group`); it resolves (wait, then the leader's end), so not
  blocking. Polish 2.
- No catch-up pace: not blocking (both start at the via; the gap settles near 2.0 m). Polish 4.

## Verdict: FIX (1 item; needs the lead's OK because it amends S1b-d)

### 1. Split Shift: #1 leaves reception 20 s after the cut, long before #7 can get there (`missionOrders.ts:362-388`)
#1 sits at (-20, -24.9), 1.75 m from the via `s2-reception` (-18.5, -24): inside `atVia` 2.5, so he marks the via on
his first step and `waitT` starts at the cut (S1b-d: the first arrival). #7 starts at the facilities desk (-6.5, 2.9,
y 4.4, L1): 29-32 m straight line to reception plus a stair; officer walk 0.85 x patrol 1.1 = 0.94 m/s, so 32 s at the
very least, ~40-50 s by path. At 20 s the group leaves with #7 still upstairs: #1 is not the leader, goes `LEG_FOLLOW`,
walks out to meet #7, then trails him back through reception (#7 passes it, `gath` 0) to the plant. The walk item
says "#7 stops at reception, both walk to the plant room"; that never happens with both eligible. C7's "Two of them
coming" also fires at 20 s, with the two apart. The e2e does not see it (A 10-14 m from V, ~12 s < 20 s).
The build follows the brief; the clock rule plus the map distance make it off-intent for Split Shift.
- Smallest change that keeps both walk items: `joinWait` counts from the leader's arrival at the via (the leader waits
  `joinWait` for the others; "#7 waits joinWait and goes alone" is A6's own wording). `markVia` starts `waitT` only when
  `num === lead[slot]`; `gatherStep` also starts it (`waitT < 0` and the current leader's `memVia` is 1) so a leader
  change counts. A live non-leader at the via waits for the leader (bounded by his `giveUp` 120 s, then he drops and
  the next leads).
- Done looks like: a vitest wiring case with the leader 35 m out and the other at the via: 'gathering' past 20 s, the
  group leaves the step the leader arrives, he leads from the via; the busy case unchanged (#7 waits 20 s, goes alone);
  the board case "only joinWait after the first arrival" reworded to the leader's arrival; S1b-d's text amended; e2e (a)
  may move A to 22-26 m from V so it covers this. Alternative if the lead keeps S1b-d: log that Split Shift's both-come
  case reads "#1 walks out to meet #7" and take it to Michael before the walk.

## Polish
1. One pending tag per slot: a second group tag overwrites the first (`enemyManager.ts:2655`). At least a dev warn on
   overwrite; per-member pending tags when a walk-kind group with replays appears.
2. A late member (late second event or `offerPlaced`) after the leader passed the via: `group` sets `gath` again, the
   phase reads 'gathering' while the leader walks or looks round, and the late member waits at the via until
   `joinWait` or the leader's end. Treat "leader past the via" as left (the late member follows, S1b-h).
3. One event whose tag names 2+ guards (a shared zone tag) with a via now forms a group (`memN >= 2` counts one
   event's members), unlike S1a. Brief-specified, no current mission data hits it; say so in the ai.md lines.
4. Follow at equal pace: the follower toggles walk / stand around the 2.0 m edge. Watch on the walk; a small catch-up
   / match pace would smooth it.
5. `orderOf(...).lead` is true for a lone order's member too (`lead` is set on every slot): harmless, but `lead` could
   read `group && lead` for clarity.
