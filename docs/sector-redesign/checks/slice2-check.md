# Slice 2 check - S2 HQ atrium and offices (checker: Opus, 2026-10-23)

Commit checked: f5422070 (diff 95097957..f5422070, `src` + `tests` + `scripts/e2e-sectorops.mjs`). Read-only: nothing
edited but this report.

## Verdict: PASS

Nothing is broken or unplayable in S2. tsc and the four campus / sector test files pass. S2 plays from the C1 far door
to the hack and into C2. The C2 dead end starts in the S3 stub, not in S2, and is unreachable while campusOps is unlisted.
Two items must land with the S2 + S3 merge (1, 2). The rest is for the lead to decide, or polish.

## Blocking findings
None.

## Owed items (A69 and the lead's notes)

**CR2 on the void's east edge (A69): reachable, coherent, no fall or softlock.**
- **Lip**: lip x -10, z -11..-5 at 4.4. The boost point (-10.6, 0, -8) is in the hall, dark (the test checks it against
  `LIGHT.shadow`).
- **Top**: the top is the L1 east strip (x -10..-7.5). It joins the north and south rings and is 4 m from the wing's north
  door (-7.5, -3), the shortest way to the facilities office. That is a real payoff.
- **Solo-proof**: rules 2, 3, 5 and 6 and the jump and landing threats pass with 0.5 m of margin. There is no wall below
  the nose. The east plant-room wall at x -8 is flush under the 0.4 slab. The tables are 0.75 and the feature stair is
  6.9 m away.
- **Planter**: the planter (0.45, x -9.3..-8.7) sits 0.7 m behind the nose, outside the headroom box. You step or vault
  over it.
- **No softlock**: falling back through the 6.6 m balustrade gap is a 4.4 m drop into the cafe. The SW stair and the
  feature stair lead back up.
- **Design note (not a break)**: the hall can only be entered by the turnstile gates (#1, cam-turnstile) or the
  mail-room door (-30, -16). That door is in #12's focus cone and lit by the G corridor night lamp 58
  (`campusS2.ts:566`), which has no switch. So CR2 skips the SW stair and the L1 west, but not a guarded entry to the
  hall. The SPEC says "skips reception". Either accept that (the lamp can be shot) or see recommendation 4.

**Co-op lip list pushed at module load (`campusS2.ts:140`).**
- **No double push**: the push is guarded by id, so CR2 cannot go in twice.
- **No order bug today**: campusS2 imports campusS1, so the push always runs after the list exists. Every consumer
  (campusS1 and campusS2 tests) also loads campusOps or campusSectors, so it sees [CR1, CR1-south, CR2].
- **Fragile**: the list's contents depend on which modules were imported, and the code casts away `readonly` to change
  an exported constant. S3's branch builds `[...CAMPUS_COOP_LIPS, ...S3_COOP_LIPS]` (66287baa `campusS3.ts:134`). That
  only works because the S2 side effect has already run.
- **Recommendation 1 (at the S2 + S3 merge)**: join the lists in one place. Details below.

**Item #9 (L6): clocking only the SW door and the lift lobby is enough.**
- **Why**: "both L2 fire doors in 44 s" cannot be walked (45 m apart, about 120 m a round). The builder's stealth and
  high routes never step onto L2: the high route stays inside the SW core up to the roof, and the exit is by the L1
  wing.
- **What #9 still does**: he covers the SW L2 landing and overlaps #10, which matches the SPEC's "first to a report on L2".
- **Do**: log L6 as an A-number and correct the SPEC row. The SPEC stealth line "out by L2 to the NE stair" is also not
  built; the exit is the L1 wing corridor. Correct that sentence too.

**Items #5-6 (L7): the M8 exception is justified, but only logged in the build report.**
- **Justified**: the pair walk one master-clock loop a row apart, facing each other, so neither is ever alone. That
  matches the S1 car-park pair precedent.
- **Optional**: the kitchen is on no route. Its door opens on the SW lobby, 9.5 m off the stealth line, and the lobby is
  dark. Solo never has to engage them.
- **Test**: the test excludes only #5 and #6 by number and still asserts every other guard holds 3 s (not silenced in
  general).
- **What was dropped**: the SPEC's refill trip (the planned isolation moment) was not built.
- **Do**: BRIEF has only A69. Log L7 as an A-number ("pair without a refill trip; isolation comes with GA2 conversations
  or a refill leg later"). Do the same for the other SPEC deviations: L3 (goods door west), L4 (reinforce on G), L5 (C2 on
  L1, the ground stub gone), L8 (facilities glass on the corridor), L12 (roof light lid) and L15 (kp-fac plain door).

**The C2 bridge dead end: temporary, and not a softlock in S2.**
- **S2 finishes normally**: the hack unlocks the card door (4, 4.4, -14). The connector cycle then runs inside C2_BOX at
  `floorY` 4.4.
- **The trap is in the S3 stub**: the far-door lookup (`sectorMode.ts:164`, `Doors.nearest` in plan, `DOOR_FIND` 1.2)
  finds the S3 shell's GROUND door at (10, 0, -14). The bridge's east end is that shell's solid head wall at 4.4..7.4
  (`campusOps.ts` `shell`, gap head 2.1..9.5).
- **Result**: after the cycle the player stands in a sealed bridge, and the S3 stub objective (24, 0, -14) cannot be
  reached.
- **Exposure**: only `?autostart=campusOps` gets there (the list filter in missionsScreen.ts). No e2e walks into C2: part 6
  stops at "the hack opens C2".
- **Recommendation 2**: this must be closed at the merge. Details below.

## Other checks
- **M12 unavoidable guard (K2): holds.**
  - **Geometry**: #11 stands at (1, 4.4, -14) facing west, in the 6 x 4 m bridge landing. Its only entries are the W
    doorway (x -2, z -14, straight ahead at 3 m) and the N doorway (x 1, z -12, 90-98 degrees off, about 2 m).
  - **Test**: the A63 assert is real. More than 50 L1 cells are blocked, there is no path from the C1 far door to the card
    door, the pocket by the door stays free, and the path comes back unblocked.
  - **Leash**: the leash edge is 1 m or more off the door cell.
  - **Caveat**: the landing is unlit (0.14) and the test cone ignores light. A crouched slip through the N doorway's east
    edge passes about 1.6-1.9 m from him, which `closeRange` 1.8 mostly catches. A player hugging the wall is at its edge.
    See recommendation 3.
- **Every guard armed**: 12 humans (7 officers with pistolSd, 5 grunts with rifles), no dogs. `checkSectorGuards` passes.
  Peak is 12 + 3 x 2 = 18 against the cap of 32.
- **Cameras**: three cameras, each protecting a stated thing, with ranges 8 / 8 / 9 in the band and reasons.
  `validateSecurity` is clean. The map has five cameras and three are live in S2. There are no lasers in S2 (correct: they
  start in S3). Two cameras fall short of what they protect (Polish 2).
- **A64 (6 or fewer awake guards on screen)**: met.
  - **Test**: it samples a 2 m grid over every S2 floor, the stairs and the roof. A guard counts if any point of his post
    or route has a clear eye-height line within 40 m, which is conservative (no FOV, the whole route).
  - **Result**: worst 5 at (-8.25, 4.4, -4.25), and 7 or fewer with #10 and #12 awake.
  - **Dormant**: only on #10 and #12. Neither is posted, in a pair or a handler.
- **Solo completability**: there are three solo routes (stealth SW stair, high roof, loud turnstiles plus feature stair).
  Each leg has a path on the analytic nav, stairs included, and the floors connect. The real Havok grid was not run: the e2e
  part checks it (L16). The co-op route (CR2) is never the only way.
- **Hot paths and imports**: the change is pure map data and a build-time builder; nothing runs per frame. The only
  module-load code is the `.some` / push line. There is no static `src/net` import, and Babylon comes in through
  `core/babylon`.
- **Out-of-brief edits**: `tests/campusS1.test.ts` filters to section 0 (L19). Justified: the map now carries S2's
  cameras, alarms, hide spots and parapet-height boxes.
  - Also changed: `e2e-sectorops.mjs:111` (the Warehouse chain loop) `sim(3.2)` became 3.7. The build report does not
    mention it. It is harmless (more slack), but the lead should know.

## Recommendations (lead decides; 1 and 2 at the S2 + S3 merge)

1. **Join the co-op lips in one place** (`campusS2.ts:140`, `campusS1.ts:81`). Rename S1's list to `S1_COOP_LIPS`. Export
   `CAMPUS_COOP_LIPS = [...S1_COOP_LIPS, ...S2_COOP_LIPS, ...S3_COOP_LIPS]` from `campusSectors.ts`, or a new
   `campusLips.ts`, either of which already imports every section file. Do not put it in campusS1: the import would be
   circular. Delete the push and the cast. Point the imports in `tests/campusS1.test.ts:12`, `tests/campusS2.test.ts:11`
   and S3's test at the joined list.
   - **Done looks like**: there is no module-load mutation, `grep -n "as CoopLip\[\]" src` prints nothing, and the three
     campus tests loop one list holding CR1, CR1-south, CR2 and the S3 lips.
2. **Give C2 a real L1 far door, and make sure it is the only door at (10, -14)** (S3's `campusS3.ts:322-325` on its
   branch; `S2_DOORS.c2Far`). Build the far door in S3's west wall at L1 (floor 4.5, a 0.1 step up from the bridge's 4.4).
   Remove or move the ground door at (10, 0, -14). `Doors.nearest` reads plan only and keeps the first door it finds, so a
   stacked ground door would be the one locked and unlocked.
   - **Done looks like**: e2e part 6 goes on past the hack. The player enters C2, the cycle seals the card door, S3 loads,
     and `doors[1].far` is the L1 door (`hinge.y` about 4.5) and unlocked. The player walks from the checkpoint
     (7, 4.4, -14) onto S3's L1.
3. **K2: light the bridge landing** (`campusS2.ts` lamps block, about line 566). This one is optional.
   - **Problem**: the choke relies on `closeRange` in a 0.14 room.
   - **Fix**: add one 0.6 downlight over the card door on its own circuit, with no switch inside the landing (a lit
     card-reader landing is believable), so the pocket behind him reads above the shadow line. A thrown-item lure from the
     NE stair door still works.
   - **Done looks like**: the light test shows the pocket (2.5, 4.4, -13) above `LIGHT.shadow`, and the N doorway east
     edge is lit.
4. **CR2 approach** (`campusS2.ts:566`), optional. Give the G corridor night lamp 58 a switch in the mail room, or the
   hall, by its door. Real offices have one, and A33 asks for "a switch where a real one would be". Then the co-op pair
   can darken the mail-room door and slip #12 on the way to the cafe.
   - **Done looks like**: a `S2_SWITCHES` entry on group 58, on the nav grid, and the lighting test updated.

## Polish (not blocking)
1. **Stacked fire-stair doors share a plan position** (four per core).
   - **What breaks**: `Doors.nearest` (`doors.ts:329`) returns the G door. So on L1, L2 and the roof the door menu
     (stealth open, peek, bash) never offers (`gameState.ts:1379-1380`, the hinge-y check fails). The item label reads the
     G door's state (`gameState.ts:1299`), and a guard's `pushOpen` (`doors.ts:345`) opens all four at once.
   - **Still playable**: the per-door item (`stealthSystems.ts:101`, y-filtered) opens the right door, so the stair routes
     work.
   - **Later**: make `nearest` y-aware, or offset each floor's door 0.1 m in plan.
2. **Two cameras stop short of what they protect.**
   - **cam-turnstile** (range 8 from x -29.7) ends at x -21.7. The gates at x -20 and -16, the loud route's gate, are
     outside it.
   - **cam-lift** (range 8) ends 2.4 m short of the lift doors at x -40.9.
   - **Fix**: range 10-11, or remount (`campusSectors.ts` S2 camera rows).
3. **The roof-light lid has no collision** (`campusS2.ts:527`). Vaulting the 0.9 rim drops a player 13 m into the
   atrium. That is death and a section restart, not a softlock. Make the lid collide (`noLedge`), or raise the rim to the
   parapet's 1.1.
4. **The BMS desk sits half inside the wall**: x -8..-5 (`campusS2.ts:460`) puts it 0.5 m into the wing wall at x -7.5.
5. **e2e (b) teleports the player onto #7's post**: the stealth route's objective point (-6.5, 2.9) is #7's slot, and
   the guards are frozen. Expect a capsule push-out at the BMS desk. If `near2 < 1.8` fails on the laptop, offset the
   objective point to (-5.6, 3.0).
6. **The second reinforce point spawns on G** (no `y` on `reinforce`, L4). The SPEC says the L2 lift lobby. Add `y`
   when the sector shape takes it.
7. **cam-bridge's code comment says "14 m"** (`campusSectors.ts`): the NE stair door is about 14 m off in this layout,
   but the SPEC register says 6 m. Fine; sync the SPEC.

## Tests run (light only; no build, no e2e)
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/campusS1.test.ts tests/campusS2.test.ts tests/sectors.test.ts tests/soloJumpReach.test.ts`:
  4 files, 121 tests pass.
- Not run: e2e part 6 (written by the builder, never run). It goes to the laptop with the slice tier.
