# S2-check - fresh check of A2 the Carriage Shed (steps 2-4, b92b6077) and A1 dressing (8b260100)

Date 2026-10-23. Checker: fresh agent (built neither). Read-only on code. Sources: `git show b92b6077`, `git show 8b260100 -- src tests`,
`docs/marlow-final/sets/a2CarriageShed.md` (section 13 over SPEC), `slices/S2.md`, `slices/S1.md` "Dressing", `slices/S1-check.md`.
Level design standard 16.10 review per set. CLAUDE.md rule: block only on broken or unplayable work; cosmetic notes are polish.

## Tests run
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse/a1Gate.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts`:
  "Test Files 4 passed (4), Tests 111 passed | 1 skipped (112)" (the skip is the CTLIGHT print / write case).
- `node --check scripts/e2e-ctcourse/a2CarriageShed.mjs`: ok. No e2e run (laptop).

---

## A2 the Carriage Shed (b92b6077)

**Verdict: PASS.** No blockers. Two should-fixes: the e2e's second-lure assert, which will probably fail on the laptop, and the open
underside of the east stair. The rest goes on the polish list.

### What was checked and holds
- **Co-op only.** The one planned lip is `a2-stage-lip` x 31-35 at 4.4. It is in `COOP_BAND` and on `COOP_LIPS`
  (`a2CarriageShed.test.ts:157-168`). `soloJumpThreats` is empty over every axis-aligned solid in the map. Its failing case is real:
  a 1.8 m crate 2.5 m off threatens the lip, one at `GREY_KEEP_CLEAR` does not (`:174-178`).
  - Vans (3.4), cabin pieces, cabinets (1.6) and screens are all `noLedge`. The wheel stops (0.3) are not a solo top under the
    helper's > 0.3 rule. No generated grip above 0.9 m exists in A2, and there is one manual ledge (`:189-200`).
  - Cabinet 2's 1.6 m top is more than 5 m from any lip.
  - The west stair is removed: the 27 risers lie only at x 62-69.7 (`:219-237`). The east stair is a solo way onto the deck only
    from east of the neck, so it bypasses nothing.
- **Isolator.**
  - With group 21 off, the neck's centre, the crossing line, its two ends and both cess ends read 0.14-0.19, under the 0.24 cut band.
    With it on, the centre and crossing read 1.00 / 0.94 (pool).
  - These come from `LightField` (the field the meter and the guards both read), with the lamps switched in the registry. The map-wide
    frame re-checks them (`ctcourseLight.test.ts:96-111`).
  - The spots sit on the real crossing line and at the edges of the shed strips' reach, so they are honest. `resetLights` plus the
    e2e restart check cover the restore.
- **Lure range.** Cabinet 1 to the post is 22.06 m and cabinet 2 to the post is 18.7 m, both inside `lightsOut`'s 25 m. The lure
  measures from the pressed cabinet's device (`courseMode.ts:743-751`). Cabinet 2 covers every loop point. Guards push doors open
  (`enemyManager.ts:629-630`), so a closed cabin door does not stop the lure.
- **Window and re-arm.** The 15 s window and 3 s re-arm are read from circuit 21. Press, no-extend while dark, `REFUSE_ISO_REARM`
  during the re-arm, then ready again: all tested in `CourseState` (`:308-326`). The solo press-and-cross is 28.4 m at 1.7 m/s,
  which is over 15 s.
- **Shunter.** He is an armed `grunt`. Every leg is open floor, and so is the lured walk through the cabin door.
  - The 0.1 s pass-through workaround is sound. In `patrol.ts:98-112` an arrival stores `waits[idx]`, and a 0 never reaches
    `advance()` (`??` keeps 0). The test proves the freeze with the doc's `[4, 0, 3, 0]`.
  - The 0.1 s stops have `faces` NaN, so he keeps facing through them. The loop is 36.8 s (LD 25-45) with stops of 4 s and 3 s.
- **Steps, claim and zones.**
  - Steps: `a2-neck` (flag `a2-east1`, timer), `a2-back` (flag `a2-east`, timer) and `a2-lock`. Lines are within 90 characters, with
    no dashes.
  - Claim: `press: ['a2-iso-1']`. P2 reads A until then, the first claim stands, and cabinet 2 claims nothing.
  - Pass zones: `any` and both, `floorY` 0 (a player on the deck at 4.4 does not count). Both flags are in `externalFlags`.
- **Traps.** None found. The plant wall closes the 0.65 m strip behind the cabin. Every sliver (wheel stop to wall 0.35 m, cabin
  east wall to stop 0.5 m, desk to plant wall 0.4 m) is narrower than a body, so it cannot be entered. The pocket west of the deck
  (x 28.25-30) is open to the south.
- **Deviations.** All sound and each can be undone: plant wall, cabinet bodies, cabinet 2 moved 0.8 m, 0.1 s waits, shed strips
  moved 1 m, bright high-bays, staging switch, 2.25 m usable deck, no hide objects.
- **e2e module.** Not tautological on the whole:
  - Every check reads both pages (lamp registry, `bodyLevel`, HUD line, course wire).
  - The cabin door is opened by `use(A, 'door-<anchor>')` and asserted open on both pages before anyone moves through it.
  - The re-arm refusal is tried atomically in the page and also asserts the lights stayed on.
  - There is no hang in this route, so the "let go only after phase 'on'" rule does not apply. The last step only waits for nobody
    hanging.

### Findings
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | should-fix (e2e, before the laptop run) | `scripts/e2e-ctcourse/a2CarriageShed.mjs:213-214` | "The shunter heads for cabinet two" assumes he is on his loop, but in this route the first press lured him to cabinet 1. When the host presses cabinet 2 (about 19 s after the first press) he is on the west cess near (34, 7.5), about 36 m from cabinet 2, so the lure (25 m) does not reach him. Getting 2 m closer inside the 15 s timeout depends on him finishing the cabinet 1 search and walking back east (about T0+37 s by the doc's timings). It will probably fail, or flake at best. The guard `!s0.alerted` does not cover "investigating". | Gate the wait on range: `if (!s0.alerted && toCab2(s0) < 24.5)`, or drop it. The cabinet 2 lure stays unit-proven (`a2CarriageShed.test.ts:613-624`); Route 1b's live lure needs its own pass with him at the post. |
| 2 | should-fix | `a2CarriageShed.ts:143-145` (east stair via `LevelBuilder.stairs`, `levelBuilder.ts:196-207`) | The stair's visual risers are full-height boxes from the floor, but the collider is a 0.3 m pitched slab. The 0.95 m strip under the flight (x 62-66, z 18.8-19.75, slab underside over 1.8 m) is walkable from the south, inside solid-looking risers. Those risers are visible non-colliding boxes thicker than 5 cm, so they enter the light shapes, and a body in there probably reads dark. The result is an unplanned hide spot inside geometry, with the camera clipping. It does not trap anyone. | Close the underside: one or two `noLedge` collision fillers under the high end (for example x 62-66, z 18.8-19.75, y 0 up to under the slab). Alternatively, a thin `noLedge` collision skirt on the stair's south face z 18.75-18.8 from the floor to under the slab. Keep any filler top under the slab so no new top appears. |
| 3 | polish | `a2CarriageShed.mjs:147` | `t1 <= t0` is nearly always true. It catches a reset only because `t0` is read more than 0.4 s after the press. | Assert `t1 < t0 - 0.2`. |
| 4 | polish | `a2CarriageShed.ts:97-99` | Road 2's east wheel stop (x 68.6-69.4, z 9.2-10.8) sits right in front of the L2 near door (x 70, z 9.1-10.9), with 0.35 m to the wall face. Every player steps over a 0.3 m block (under `maxStep` 0.42, so it is walkable) to reach the exit. The e2e teleports to the pad, so this is unproven. It reads as a blocked doorway. | Pull road 2's east stop back (for example x 66.6-67.4) or drop it. Recheck the doc's A2-10 row. |
| 5 | polish | `a2CarriageShed.ts:166` | The staging switch floats in front of the gallery glazing (disclosed). | Switch box or post in dressing. |
| 6 | polish | `src/world/lighting/marlowCircuits.ts` (hints) | `a2-iso-2`, `a2-sw-*` hints differ from the built points (disclosed; tests allow 1 m). | Update the hints (S2.md request). |
| 7 | polish | `src/ai/patrol.ts:98-112` | A wait of 0 freezes a walker (engine). | The S2.md request: then `A2_PASS_WAIT` goes to 0. |
| 8 | polish | e2e coverage (disclosed) | The leg-up and staging route (Route 2), the east stair walk, the coat-corner takedown and the vantage's full-cycle concealment are not walked. | Playtest / later e2e. |
| 9 | polish | set doc section 4 | The revive row assumes a 2.5 m deck. It is 2.25 m usable (the gallery face is at z 19.75). | Recheck in slice 9. |

---

## A1 dressing (8b260100)

**Verdict: PASS.** No blockers, no should-fixes.

### What was checked and holds
- **No gameplay change to the greybox.** A checksum pins the first 22 boxes. Lamps stay at 9, doors at 3, anchors at 0. The only new
  collision is the props' 6 boxes (`built.counts.sets.a1Gate` solids 21 -> 27). Every other dressing box is a non-colliding skin,
  `noLedge` and thinner than 5 cm, so it stays out of the light shapes, and `ctcourseLight` is unchanged and green.
- **Kit panels and skirting.** These are visual-only kit (`facilityKit.ts:312-330`: no `b.box` collision).
- **`facility.ts:546`.** The lounge panel now starts at y 3.2, which fixes S1-check polish 7.
- **Prop boxes.** All are `noLedge`. Each stands at least `roomSide + radius` from the mark. The 4.7 m keep-clear rule is met: the
  bollards (0.99 m), the counter (0.74 m) and every prop box are `noLedge`.
- **No solo boost.** `soloJumpThreats` was rerun for both lips with the props folded upright and is empty. A 1.3 m crate 2.5 m off
  the near lip still threatens, so the check has teeth.
- **Wicket.** The wicket's hinge swing (1.2 m + radius) and the bolt spot are clear. The bolt prop hangs on the yard face beside the
  opening (z 11.7-12.1), at y 1.05.
- **Routes.** The checker's slot and grab spot are clear. The yard to the L1 door is clear at z 10.4 / 11 / 11.6, and the lounge door
  to the mark and the wicket is open floor.
- **Glows.** Every kit glow is grouped on the plan's A1 rows: the lounge on 10, the hall coves over the wall on 12, never 10 above
  the wall. No lamp was added.
- **Budgets are computed, not asserted by hand.**
  - Kit triangles in the box are at most 60 k.
  - `FacilityProps.check` passes over A1's placements plus the facility's set-side props: 608 triangles and 11 draws, against limits
    of 60 k and 12.

### Findings
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| A1-1 | polish | `a1Gate.ts:433` | The barrier arm is visual only, 6 m along x 6.4 (z about 2.6-8.6) at 1.0-1.08 m. A player walking along the lounge's east flat or the apron's west strip passes through it. It is off the taught route (the route starts at x 7). | Accept, or swing the arm up (raised barrier) or lay it against the shell. |
| A1-2 | polish | `a1Gate.ts:435` | The bolt prop hangs beside the opening (z 11.9), but the bolt press is at the wicket's centre (12, 11). The prompt and the bolt are 0.9 m apart. | Accept (disclosed), or move the press point to the bolt in a later pass. |
| A1-3 | polish | `a1Gate.ts` `BOLLARDS` (11.2, 3.3 / 7.7) | The gate bollards stand 0.5 m off the near face. A player dropping from the near lip at those z lands against a 0.12 m post. | Accept, or move them 0.3 m further off the face. |
| A1-4 | polish | S1.md "Open" | Look check (gate skin layering and z-fight, cove height against the gallery glazing, hut ribs). | GPU pass on the laptop. |
