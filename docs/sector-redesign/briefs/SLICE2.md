# Slice 2 brief - S2 HQ atrium and offices (builder: Sonnet 5.5; checker: Opus)

Written by the lead (Opus) 2026-10-23. Build exactly this; anything not covered: pick the simplest option, log it as
L1, L2 ... in your report (the lead renumbers them as A-numbers), never ask. Greybox only. No dressing, no refining.

## Before you start (the lead does this, not you)
The branch has master merged (g44-above #169 = EW13 roof / balcony views). If `git log --oneline -1` does not show a
merge of origin/master after 267b299f, stop and report "master not merged".

## Read first
1. `docs/systems/agent-preamble.md` (job = sector-redesign; you never commit, push, stash, checkout).
2. `docs/sector-redesign/SPEC.md`: "Campus-wide rules", "S2 - HQ atrium and offices", "Unavoidable posted guards
   (M12)" row K2, the "Perf" paragraph (A64).
3. `docs/sector-redesign/BRIEF.md` A60-A68.
4. Slice 1 as the pattern, read in full: `src/world/maps/campusS1.ts`, `src/world/maps/campusSectors.ts`,
   `src/world/maps/campusOps.ts`, `tests/campusS1.test.ts`, the campus part (part 6) of `scripts/e2e-sectorops.mjs`,
   `docs/sector-redesign/checks/slice1-build.md` (what the S1 builder learned: interact reach 1.8 m, takedown reach,
   quarter-turn wall boxes, M8 pair exceptions).

## Files you own
- NEW `src/world/maps/campusS2.ts`: S2 geometry on the S2 footprint x -44..4, z -30..6: G (floor 0, ceiling 4.4), L1
  slab at 4.4, L2 slab at 8.4, roof 12.3, atrium void x -26..-10, z -20..-4 to a 13.2 roof light (look-down only, not
  walkable glass: solid rim, void below). Every room in the SPEC "Rooms" line as greybox boxes. Two enclosed fire
  stairs at the SPEC boxes (SW, NE) with landings at every floor and roof bulkheads; the feature stair in the atrium,
  `noLedge`, >= 6 m from the CR2 gap. Meeting-room glass fronts (EW6 is not built): fence panels with an open top
  band, as SPEC says. Lamps with the SPEC groups (`s2-atrium` + reception panel switch, `s2-l1-bal` / `s2-l2-bal` +
  a switch at each stair door, corridor night level as one lamp per corridor at 0.25 intensity, kitchen, facilities
  office, reception); dark spaces have no lamp. `ambientZone` 0.14 encounter, 0.30 stairs and C2. Replace slice 1's S2
  shell box in `campusOps.ts` with this build (keep the other shells). Export the CR2 lip in the campus co-op lip list
  (the same constant slice 1 used): the L1 slab nose at 4.4 over the café, 6 m gap in the 1.1 m balustrade, the rest
  of the edge `noLedge`.
- EDIT `src/world/maps/campusSectors.ts`: replace the S2 stub (index 1) with the full section: guards #1-#12 exactly as
  the SPEC table (kinds, posts, patrols, waits giving 25-45 s cycles, `role`, `zone`, `reason`; #5-#6 `pair` on each
  other; `dormant: true` only on guards far from every route: at most #10 and #12, never #11 or a pair). Cameras
  cam-turnstile 8, cam-lift 8, cam-bridge 9 with aims and reasons. kp-fac: EW5 keypads are not built, so the
  facilities office door is a plain open door (log it). alarm-rcp, alarm-brg. Objective: hack 3 s at the BMS terminal
  in the facilities office (L1 NE), opens C2. C2 connector door on L1 at x 4. Reinforce points: the goods door (G) and
  the L2 lift lobby. `perStage` 2, `alarmMax` 3, `dogs` 0.
  **K2 (M12):** #11 `role: 'posted'`, `zone: 'c2'`; add `'s2#11': { leash: 5, guards: 'c2-door' }` to `CAMPUS_POSTS`
  (or the slot's `post` field if guard-ai's field exists after the master merge: grep `post?:` in
  src/world/rooms.ts). Leash edge >= 1 m off the C2 door's nav cell.
- NEW `tests/campusS2.test.ts`: the PLAN "Common" list for S2 (12 guards, all humans armed via `checkSectorGuards`,
  route points on the nav grid, cycles 25-45 s, cameras 8-12 with reasons, CR2 passes `soloJumpThreats` +
  `soloTopLandingThreats` with 0.5 m, headroom to 6.2 over the lip, rule 2 within 4 m, the M8 isolation check as
  slice 1 runs it (pair exceptions recorded, not silenced in general), the K2 choke assert (#11's cone as a nav
  blocker: no path from the C1 far door to the C2 door; unblocked: a path), the dormant rule (no posted / pair /
  handler / dog dormant), and the A64 screen count: sample player points on a 2 m grid over every walkable S2 floor
  and assert no point sees more than 6 awake, non-dormant guards with a clear static line within 40 m. If A64 fails
  at a point, do not silence it: report the point and the guards in view, and add a wall, a column or a closed door
  that a real office would have there, then re-run.
- EDIT `scripts/e2e-sectorops.mjs`, campus part 6: after S1 completes and S2 loads, (a) 12 S2 guards alive; (b) a
  scripted nav walk C1 far door -> post room -> SW stair -> L1 north open-plan -> facilities office -> hack completes
  -> C2 opens; (c) solo cannot stand on the L1 slab nose at the CR2 gap from a café table, the feature stair or the
  balustrade (running jumps and wall jumps, the slice 1 probe pattern); (d) the reception pendant panel switch cuts
  `s2-atrium` and #1 walks to it. Co-op leg-up + ladder at CR2: add if the slice 1 part has a co-op helper, else log
  as skipped.
- APPEND one line to `changes/feature-sector-redesign.md`: "Sector Ops campusOps: S2 HQ atrium and offices greybox."

Never edit: `src/ai/*`, `src/net/*`, `src/security/*`, `ctDevices.ts`, `securityRoom.ts`, `warehouse*.ts`,
`campusS1.ts` (except nothing; S1 is done), `missionsScreen.ts`, `docs/level-design.md`, `docs/templates/*`,
`CHANGELOG.md`, `package.json`, BRIEF / SPEC / PLAN / STATE.

## Checks (desktop CPU is busy: nothing heavier)
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/campusS1.test.ts tests/campusS2.test.ts tests/soloJumpReach.test.ts tests/sectors.test.ts tests/voxelFit.test.ts` (timeout 600000).
- `npx eslint` on the changed src / test files; `node --check scripts/e2e-sectorops.mjs`.
- No e2e, no build.

## Report
Append "Slice 2" to `docs/sector-redesign/checks/slice2-build.md` (new): files, values the SPEC left open (posts,
yaws, waits, lamp positions, stair landings), L-numbered assumptions, A64 worst point and count, skipped items, check
results. Final message under 10 lines.
