status: open
# campus-greybox s5 fix 1 (cloud): the three co-op lips must be climbable

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17). The S5 lane checker (Sonnet, code review, 2026-10-25
~23:35) returned FIX with one blocker; this is the one fix round. The same defect hit S4 (brief campus-greybox-s4-fix1).
Read the engine lines yourself before changing anything.

- Base: `origin/feature/campus-greybox-s5` @ 589f9b69d28728bc619ffa70d0c37e1be4174489. Keep building on
  `feature/campus-greybox-s5` (push to it only). Guard: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s5`.
- Only files: `src/world/maps/campusV2/s5.ts`, `tests/campusV2S5Coop.test.ts` (and another `tests/campusV2S5*.test.ts`
  only if a rule test there changes because of the thicker pieces), `changes/feature-campus-greybox-s5.md` (one line), the
  report `docs/campus-greybox/checks/s5-fix1.md` (new).

## The defect
All three co-op lips are hang-only. `src/world/anchors.ts:414` (`generateLedges`): `canClimbUp = depth >= LEDGE.climbDepth`
(0.38), depth = the box's size across the lip. `src/player/attachController.ts:714`: `canClimb = a.canClimbUp && climbRoom(a)`.
- CR8-s5 gutter kerb `s5.ts:654`: z 43.85..44.15 = 0.30 deep.
- CR9-s5 coping `s5.ts:831`: x -32.15..-31.85 = 0.30 deep.
- CR10-s5 smoke hatch west kerb `s5.ts:656`: x -28.7..-28.6 = 0.10 deep.
`tests/campusV2S5Coop.test.ts` asserts `canHang` only (`lipLedges`, :176-188, :266-268).

## The fix (lip faces and lip data unchanged)
1. Thicken each piece to 0.40 deep, keeping the lip face where it is:
   - CR8-s5: `bx(b, -32, -26, L1, L1 + 0.2, 43.75, 44.15, STEEL)` (face z 44.15).
   - CR9-s5: `bx(b, -32.25, -31.85, R, R + 0.2, 30, 33, STEEL)` (face x -31.85; still on the roof slab and wall top, between
     the two parapet pieces: check it).
   - CR10-s5: `bx(b, sh0 - 0.4, sh0, L1, L1 + 0.2, shz0 - 0.1, shz1 + 0.1, STEEL)` (face x -28.6).
   Verify each number against the s5.ts geometry first; if one differs, use the geometry's and log it.
2. Each thicker piece grows a back-face ledge (facing the roof, a 0.2 drop). Keep the test "exactly one canHang ledge per
   lip, none elsewhere" true: preferred, make the test's `extra` filter use the true drop (> 1.9) as the `LD 11.8` test
   already does; or `b.noLedge(x, z, r)` at the back face with r small enough that the lip's ends stay further than r away
   (S4 lost a lip to r 0.5).
3. Tests, per lip: `expect(lipLedges(l)[0]!.canClimbUp).toBe(true)`, and a room check that the body fits 0.6 m inside the
   lip at lip + 0.05 (`climbRoom` / `roomAt`: CR8 z 43.55, CR9 x -32.45, CR10 x -29.2). The new assertions must fail on
   the base 589f9b69 (run once there and record it). Re-run rules 1-5 and the `LD 11.8` test.

## Run (unit tests only)
`npm run typecheck:fast`; `npx vitest run --maxWorkers=2 tests/campusV2S5*.test.ts tests/campusS5*.test.ts
tests/campusRuntimeNav.test.ts tests/campusV2.test.ts`. Pending PC run: E2E-1 climbs on CR8-s5 / CR9-s5 / CR10-s5.

## Done
All three lips climbable in data and test; new assertions fail on the base and pass on the head; listed tests green;
report `docs/campus-greybox/checks/s5-fix1.md`; this brief `status: done feature/campus-greybox-s5 <sha>` with a short
"## Report".
