status: open
# campus-greybox s4 fix 1 (cloud): CR8 / CR8-west sills must be climbable

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17). The S4 lane checker (Sonnet, code review, 2026-10-25
~23:15) returned FIX with one blocker; this is the one fix round (RULES "A job": the fix round is Opus-grade work: read
the engine lines below yourself before you change anything).

- Base: `origin/feature/campus-greybox-s4` @ 8379670b2b817436876b70e55b64f01f51c5b497. Branch: keep building on
  `feature/campus-greybox-s4` (push to it; nothing else). Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s4`.
- Only files: `src/world/maps/campusV2/s4.ts`, `tests/campusV2S4Coop.test.ts`, `tests/campusV2S4Graph.test.ts`,
  `changes/feature-campus-greybox-s4.md` (one line), and the report `docs/campus-greybox/checks/s4-fix1.md` (new).

## The defect
CR8 and CR8-west can be hung from but never climbed, so nobody enters the plenum by them.
- `s4.ts:565-569`: the sill loop deletes `noLedge` on two wall strips 0.2 m (dock wall P) and 0.3 m (hall wall T) deep.
  CR8 / CR8-west data at `s4.ts:172-187`.
- `src/world/anchors.ts:414`: `canClimbUp = depth >= LEDGE.climbDepth` (0.38). `src/player/attachController.ts:714`:
  `canClimb = a.canClimbUp && climbRoom(a)`. A 0.2 / 0.3 m strip gives a hang with no climb-up prompt.
- `tests/campusV2S4Coop.test.ts:302-313` asserts `canHang` only; no test catches it.

## The fix (keeps every number in briefs/S4.md)
1. Drop the `delete sill.noLedge` loop at `s4.ts:565-569` (both strips stay `noLedge`; this also removes the
   float-equality lookup that throws on a miss).
2. Add manual climbable ledges at the sill tops (y 4.4; `makeLedge` defaults `canHang` and `canClimbUp` true,
   `anchors.ts:441-458`, normal = (tz, -tx)): `b.ledge(14.1, 19.5, 14.1, 21.0, 4.4)` (normal +x, dock side) and
   `b.ledge(-4.15, 21.0, -4.15, 19.5, 4.4)` (normal -x, battery room side). Verify the x of each wall face, the y of
   each sill top and the end order (normal direction) from the s4.ts geometry before you write them; if a number
   differs, use the geometry's and log it in the report.
3. Plenum side: add the matching ledges on the plenum faces (x 13.9 and -3.85, ends reversed) so a hang-drop back out
   works, unless the geometry shows the plenum floor is level with the sill (then say so and skip).
4. Tests: `campusV2S4Coop.test.ts:302-313` and the unplanned-lips check in `campusV2S4Graph.test.ts` read
   `b.anchors.ledges` (manual ledges are not in `generateLedges(b.boxes)`). Add an assertion that the CR8 and CR8-west
   lips have `canHang && canClimbUp`, and that `climbRoom` holds there if the test file already has a helper for it.
   The new assertion must fail on the base 8379670b (run it once there and record the failure).

## Run (unit tests only)
`npm run typecheck:fast`; `npx vitest run --maxWorkers=2 tests/campusV2S4Coop.test.ts tests/campusV2S4Graph.test.ts
tests/campusV2S4.test.ts tests/campusV2S4Guards.test.ts tests/campusRuntimeNav.test.ts tests/campusV2.test.ts`.
Pending PC run: E2E-1 CR8 / CR8-west climb (laptop).

## Done
Both lips climbable in data and test; the new test fails on the base and passes on the head; listed tests green;
`docs/campus-greybox/checks/s4-fix1.md` (what changed, the numbers checked against geometry, test counts); this brief
`status: done feature/campus-greybox-s4 <sha>` with a short "## Report".
