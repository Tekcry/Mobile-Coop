# S3 R3 build report - three fire stairs (cloud builder, sub-lane r3)

Branch `feature/campus-greybox-s3-r3`, base 3a8c6893 (R1a frame). Brief: `docs/campus-greybox/briefs/S3.md` section 4 R3, lead answers (a), (b) to A-J17-S3-2 / -3.

## Slice R3 - files changed
- `src/world/maps/campusV2/s3Stairs.ts` (filled: was an empty stub)
- `tests/campusV2S3Stairs.test.ts` (new)
- `changes/feature-campus-greybox-s3-r3.md`, this report

## What was built (all derived from the `S3_BOX` core boxes; numbers from the brief R3 table)
- Three cores (`S3_CORES`, `S3_CORE_GEOMETRY`): walls on the box centre lines, G to 9.0 (north core to 7.5), one door anchor per stair door of `S3_DOORS` with the kit swing (wStairG, wStairL1, nStairW, nStairE, nStairL1, eStairG, eStairL1, staff).
- `S3_FLIGHTS` (6, with `steps`): flight 1 13 risers (rise 2.1667), flight 2 14 (2.3333), w 1.4, len 3.4, goings 0.262 / 0.243 (P1). Table positions reproduced exactly (west 16.65 / 14.85 at z -17.75; north 30.85 / 32.65 and east 58.85 / 60.65 at z -3.75).
- L1 landings, half landings (top 2.1667), 0.4 spine walls 0..5.4 (noLedge), 1.1 rails over flight 1's well at the L1 landing edge, north core lid at 7.5 (0.1, noLedge), ambient 0.30 per core (north core below its lid).
- Lead answer (a): north walls of the north and east cores centred on z -0.15 (wall z -0.3..0, overlapping the shell wall): no 0.2 m slot behind either core.
- Lead answer (b): HUD rooms `S3_ROOMS_STAIRS` = `s3-wstair`, `s3-nstair`, `s3-estair` (core boxes, full height, no squad). The west core is enclosed, so `s3-wstair` exists.
- Exports for R5 / R6: `S3_CORES`, `S3_CORE_GEOMETRY` (clear box, flights, `l1Landing`, `halfLanding`, spine, rail) so routes read landings and flight ends from one table.

## Tests - `tests/campusV2S3Stairs.test.ts`: 25 passed (with `tests/campusV2S3Frame.test.ts`: 29 passed). `npm run typecheck:fast`-equivalent (`tsc --noEmit -p .`) clean.
Flights and table, slope normal.y > 0.65, NCC, step / ramp counts, spine; wall rings sampled gap-free except door holes; door holes 1.2 x 2.1 with one anchor each and the kit swing, leaf sweeps the core side; north / east slot closed; no piece pokes past its wall; door rule; landings, rails, lips, lid, ambient, rooms; headroom >= 1.7 under landings; three-stairs reach on an analytic nav grid at the campus's own cell phase (also green at three shifted phases): G <-> L1 through each core alone with the other two blocked, and no path with all three blocked; the campus builds with `flags.campusV2 = [3]` and `dress: false` with one anchor per stair door.

## Assumptions (each with its undo)
- A1 Half landings of the north and east cores run to z -0.3 (the new wall's inner face), not the table's -0.65, so no gap between landing and wall (LD 16.2.4). Undo: end at -0.65 and add a fill piece.
- A2 North / east core HUD rooms end at z -0.15 (shell inner face), not the box's -0.5, so the strip behind the half landing reads the stair room. Undo: maxZ -0.5.
- A3 North core lid built here (x 30..33.5, z -7..0, 0.1 thick, top 7.5, the void deck's top): brief R3 lists it and R2 step 9 says "over the north core it is the core's lid". Undo: delete the `core.id === 'n'` lid line; R2's deck must then cover x 30..33.5.
- A4 Core walls: x walls run the full length (z0 - 0.15 .. north wall + 0.15), z walls fit between them; the north core's walls stop at 7.5 so the void crawl (P11) is not cut at x 30 / 33.5. Undo: 9.0.
- A5 The staff door is a plain `doorAt` (the keypad attaches by position: `S3_KEYPADS` kp-store at [58, -6]; as built, S3 has no locked keypad door). Undo: `locked: true`.
- A6 I build the whole core ring, including the L1 south walls (z -7) with their L1 doors (nStairL1, eStairL1) and the core walls at x 30 / 33.5 / 58 at L1, because the brief gives "stair doors" and "core walls" to R3. Ownership guess; see F2.

## Deviations
- D1 Nav lip 0.2 high x **0.15** deep (brief: 0.2 x 0.2), at all six flight tops. The runtime grid (campus bounds -70 / -84, cell 0.5) puts cell centres 0.2 and 0.7 from every flight end here. A 0.2-deep lip ends exactly on a centre, lifts that cell 0.14 over the ramp and makes a 0.48 step to the next cell (nav step limit 0.45): the north and east cores failed the reach test before the change. 0.15 never catches those centres and still covers a centre within 0.15 of an end (the part-6 case). Undo: `S3_LIP_DEPTH = 0.2` (then re-run the reach test; expect north and east to fail).
- D2 Door rule (SS 4) tested as its substance, not the literal "no door within 1.5 m of a flight end": the floor rises < 0.4 m across each door opening and 0.6 m either side. The literal rule cannot hold with 1.4 landings. Door centre to flight foot along the wall: west doors 0.6 (P2), north-core x-wall doors 0.55, east staff door 0.55; the z -7 doors have the 1.4 flat landing in front.

## Findings for the lead
- F1 (wiring, outside my files) `s3.ts` builds `S3_ROOMS = [...S3_ROOMS_G, ...S3_ROOMS_L1]` and does not include the stair rooms. One line is needed in the frozen `s3.ts`: import `S3_ROOMS_STAIRS` from `./s3Stairs` and append it to `S3_ROOMS`. The stair rooms overlap `s3-hall` / `s3-dock` / `s3-control` by design (smallest room wins in `roomAt`): a merged "rooms do not overlap" test must exempt them.
- F2 (door ownership, merge risk) R2 step 3 says the z -7 line x 10..64 carries "doors of 3.2", and R1 / R2 may also build the x 30 / x 33.5 partitions. Mine: the core rings and the doors nStairW, nStairE, nStairL1, eStairG, eStairL1, staff, wStairG, wStairL1. If R2 also builds nStairL1 / eStairL1 on the z -7 line, or a wall piece across x 31.0..32.2 / 59.1..60.3, the anchor duplicates and the hole is blocked. My campus-build test asserts exactly one anchor per stair door, so it catches a duplicate after the merge.
- F3 R2's L1 slab must leave holes exactly at the three core boxes (x 14..17.5 z -21..-14.5; x 30..33.5 z -7..0; x 58..61.5 z -7..0); my landing slabs fill x 14.15..17.35, z -20.85..-19.45 (west) and z -6.85..-5.45 (north, east).
- F4 LD 16.2.4 asks balustrades on every open side: the half landing has no open side (flights and walls) and the L1 landing's only open edge is the rail over flight 1's well. No mid-flight rail is built (the brief lists none).
- F5 R4's stair lamps (wStair 163, nStair 164, eStair 165): centres from `S3_CORE_GEOMETRY[i].halfLanding` and `.l1Landing`; the north and east half-landing centre z is -1.175 (extended landing), not the table's -1.35.

## Pending PC runs
- e2e / GPU: none run. Stairs walked by a real player (door swing sweep, flight feel, rail sight) in `?campusv2=3` once r1-r5 are merged.
- R5's nav test (lead's answer b): a core point reads its stair room, not `s3-control` (my unit test covers the `roomAt` logic against a copy of R1's box table; the merged build is R5's).
- Three-stairs reach on the full build with guards (R6) and on the runtime nav build (the analytic grid here is a proxy at the campus cell phase).
- `e2e-sectorops:1..6` flag-off regression (the default build is untouched: my file is only reached with `campusV2` on).
