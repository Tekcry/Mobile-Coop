# P3-2 check (A2 east stair rail), Sonnet 5.5 checker, head 9a9191a7 on base afefe329

Verdict: PASS.

Blocking: none.
Should-fix: none.

Done criteria (POLISH-3 "Slice P3-2"):
- A2_STAIR_RAIL = {z 18.75, seg 0.55, h 1.1, from 68.6, to 62} exported beside STAIR_FILL (a2CarriageShed.ts:107-112), all on the 0.05 snap; 12 kit.handrail segments built in A2-17 after the visual rails (:407-414), formula exactly as briefed; visual rails kept; header (:28-32) and tally text (:390) updated.
- Rail is kit.handrail = invisible, noLedge, 0.1 thick box on z 18.75 (face at 18.80 = open edge, never inside the 1.2 m flight). Starts at x 68.6: 1.15 m from the east wall face, so the side step-on over the bottom treads stays open.
- Diff = 3 files only (a2CarriageShed.ts, its test, docs/marlow-final/slices/P3-2.md). No *.light.json, wire, PROTOCOL_VERSION or save change.
- Assert edits are derived only: stairRail filter + fillers exclusion (test :670-672), title :698, +stairRail.length at :706/:708, kit-glow lip assert skips the rail modules (:849-851) and asserts them separately (count = stairRail, group 23, :854-857). No literal edited; soloJumpThreats asserts untouched and pass.
- New tests (3, :1004/:1042/:1071) have teeth: geometry asserts exactly 12 rail boxes, register solids and kit module counts (fail with no rail); step-off asserts a hit with rail and null without it at every 0.1 m from x 62 to 68.6; crate still bites in soloJumpThreats. Weak spot only: the step-on probes at x 69.45 / 69.2 cannot touch a rail that ends at 68.6; the real guard is the xWall - from > 2r assert (1.15 > 0.6), which is fine.
- Step-on deviation (69.44 vs 69.45): sound. xWall = 69.75, radius 0.3, so 69.45 puts the body edge exactly on the wall face and walkBlocked reports it as touching by float error; 69.44 is 1 cm clear and the rail-only check still runs at 69.45 as briefed.

Drop judgement (deck east face x 62, z 17.6-18.7, 4.4 m): a gap, not a route.
- Sets doc/spec: screens are on "the rest of the edge" with ends screened ("no unplanned lip", sets doc A2 lip table); the only deliberate drop is the loading edge x 31-35 (co-op lip) and the way down is stated as the east stair only (sets doc "down the east stair", spec route "down the east stair"). Nothing names a walk-off at the deck's east end; the open 1.3 m beside the 1.2 m stair is a coopDeck stair:'end' side effect (deck 2.5 deep, stair 1.2).
- Fix (one line, in A2-17 after the rail loop; sits on the deck at x 61.95 so it does not narrow the flight, ends at 18.75 so the stair mouth z 18.8+ stays open, starts at the screen's back face z 17.6):
  kit.handrail(xHead - 0.05, 17.6, xHead - 0.05, zRail, { y: A2_DECK.lip, h: 1.1, group: G_STAGING });
  Test note: its centre z is 18.175, so the existing stairRail filter (z 18.75) counts it as a filler; the fix needs its own derived edits (a third filter, +1 on :706/:708, A2-17 solids) and a deck-end walk-off test.

Polish list:
- P3-2.md "Deviations: Not pushed" is stale (branch is on origin).
- Rail group G_STAGING means the kit balustrade follows the staging switch circuit; fine, as briefed.

Commands (detached checkout at 9a9191a7):
- npx tsc --noEmit -p tsconfig.json: exit 0, no errors.
- npx vitest run a2CarriageShed a4GoodsShed ctcourse ctcourseLight facilityKit: 5 files passed, 160 passed, 1 skipped, 0 failed (matches builder).
