# S1 check - A1 the Gate (commit 155fbec0)

Fresh checker, 2026-10-23. Read-only on code. Reviewed against `docs/marlow-final/sets/a1Gate.md` (section 13 over SPEC) and
`docs/marlow-final/slices/S1.md`. Level design standard 16.10 review for one set.

**Verdict: PASS.** No blockers. One should-fix (e2e), the rest polish.

## Tests run
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/ctcourse/a1Gate.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts`: "Test Files 3 passed (3), Tests 66 passed | 1 skipped (67)".
- `node --check scripts/e2e-ctcourse/a1Gate.mjs`: ok. No e2e run (the laptop runs it).
- The commit touches only its five files (`git show --stat`): no `src/ai` edit; the set file reads collision / light data only.

## Co-op only (sound)
- Lips `a1-wall-near` / `a1-wall-far` at 4.4 m, in `COOP_BAND` 4.3-4.5, on `COOP_LIPS` (test lines 95-109).
- `soloJumpThreats` empty over every solid for both lips, with a teeth case (a 1.8 m crate 2.5 m off threatens; one at
  4.7 m does not) (tests 111-120).
- Cabin: every piece `noLedge` (`block` defaults `noLedge: true`, `a1Gate.ts:61-65`); walls / roof 2.5-2.6 m are over the
  1.8 m mantle; the window sill (0.2 m deep) is under `LEDGE.climbDepth`; desk 0.75 m is inside under the roof. No split gap:
  cabin walls 2.6 m are under `SPLIT.minHeight` 3.6.
- Lounge reception desk (front 1.09 m, under the 1.8 m mantle, so climbable): the leap apex is 5.6^2 / 36 = 0.87 m, so feet
  reach 1.96 m < 4.4 - `FALL_GRAB.maxAbove` 2.35 = 2.05 m. Zero reach to any 4.4 m lip at any distance (any top under
  1.18 m is harmless); it also sits in the sealed lounge 10 m off the near face.
- Bolt: `courseState.ts:426-427` opens only when the presser's feet are past x 12 on the yard side; the unit test refuses an
  apron press (`REFUSE_BOLT`) and opens from the yard (tests 197-211).
- Generated lips over 1.9 m in A1 are only the planned two, none at the wall ends (tests 136-149).

## Routes and traps (sound)
- Route 1: leg-up from the mark takes the near lip (`findJumpTarget`, test 151-168); yard-side unbolt opens for good.
- Route 2: relay on the same lip; `a1-yard` pass zone (both players, `floorY` 0, x from 12.6) is in `externalFlags` and ticks
  the step with the wicket bolted.
- No trap: a player in the yard can always unbolt; the cabin and lounge doors are unlocked; the wall top drops either side;
  restart resets the claim, bolt, step and lock (e2e step 7 asserts each).

## Light parity (sound)
- 9 lamps, all grouped, `electric` / `destructible` per circuit row; `p.groups` equals `marlowCourseGroups()` A1 rows; standby
  zone 0.14 over [0, 2, 22, 20], lounge 0.30 under the ceiling. Light spots sit where the doc says (JSON levels: wicket 1.00 /
  1.00, mark 0.70, yard 0.58 on / 0.14 cut, mark cut 0.14).
- Deviations: flood 0.15 m off the cabin corner (outside the cabin) at radius 13 holds the mark at 0.70, so A1-D6 is not
  needed; cabin panel radius 3.2 keeps it out of the lounge's 2 m columns (the 8-lamp shader limit) and the cabin still reads
  0.67; closed lounge ceiling is `noLedge` + `overhead` and sealed by the flats. All sound.

## Course data (sound)
- `a1-over` (shared 56, A 58, B 63 characters; done by gate or flag), `a1-lock` the one closing line; ids within the limit;
  role claim zone on the mark (lead sees A until claimed; first claim stands); checker `grunt`, passive, two info lines;
  radio `enter` (85) and `a1-over` (55). `validateCourse` passes.

## Findings

| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | should-fix | `scripts/e2e-ctcourse/a1Gate.mjs:130` | Step 6 teleports the client to (13.2, 11.4) through the wicket. Route 1's last move (A goes through the unbolted wicket, doc section 11 step 6 "walks through") is never shown: only the lock state is asserted, not that the leaf opens. | Before the teleport, `use(B, <the wicket's door item>)` and assert the door open on both pages (the door list's open state at `doorIndex(WICKET_DOOR)`), then move. |
| 2 | polish | `a1Gate.mjs:114-121` | The refused press is the client's and the opening press the host's: a client press that never reaches the host would also pass the refusal assert. | Also try the host from the apron side once before it drops (or have the client unbolt in the variant). |
| 3 | polish | `a1Gate.mjs:156-160` | Variant: `setDamage` is set on the host page only; the client's health is host-side (the finale sets the remote's `damageMul` at `e2e-ctcourse.mjs:268`), so the client's no-damage assert may hold with damage off. | Set the host's remote `damageMul = 1` for the client's drop, back to 0 after. |
| 4 | polish | `a1Gate.mjs:41` | The wall-top teleport to the yard edge (steps 4 and 7) is not in the doc's route; disclosed in S1.md, same top, 0.6 m reposition. | Accept, or note it in set doc section 11. |
| 5 | polish | `tests/ctcourse/a1Gate.test.ts:270-272` | "standing on the wall top over the mark" runs `runAt` with feet y 0 on the mark: it tests no height and the wall top is not over the mark. | Put the feet at y 1.5 in the zone (`setPlayer(0, 10.8, 1.5, 6)`) and expect no claim, or drop the case. |
| 6 | polish | `a1Gate.test.ts:276-294` | The pass-zone case sets the flag by hand; the zone firing from positions is only proven by the e2e (CtDevices is not pure). | Accept (e2e step 7 covers it), or test `passZones`' box / `floorY` check if a pure helper exists. |
| 7 | polish | `src/world/maps/ctcourseSets/facility.ts:546` | The facility's lounge wall panel (y 3.0, h 7) now sits mostly above the new ceiling slab (3.2-3.4): a 0.2 m strip shows under it. | Dressing step: drop it under the ceiling or trim to y 3.2. |
| 8 | polish | `src/world/lighting/marlowCircuits.ts` | A1 switch plan hints (8.2 / 8.8, 15.4) differ from the built (7.7 / 9.5, 15.1); within 1 m, tests pass. | Update the hints (S1.md request). |
| 9 | polish | `src/world/maps/ctcourseSets/stub.ts` | The `id === 'a1Gate'` branch is dead now. | Remove with the stub. |
| 10 | polish | open (S1.md) | Flood / z 17 bulkhead spill onto the gallery glazing is render only and untested. | Check in the GPU pass. |

Not checked here (laptop / GPU): the real leg-up, relay and hang-drop moves, and the visual read of the lights.
