# S8-check - fresh check of A8 the Strongroom (3dfc6e9a greybox, d3ec16c3 engine requests)

Date 2026-10-23. Checker: fresh agent (built none of it). Read-only on code. Branch `feature/marlow-final` at 5e7cc587 (the A8 files
unchanged since d3ec16c3). Sources: the set doc `sets/a8Strongroom.md` (section 13 over SPEC), `slices/S8.md`, `a8Strongroom.ts`, its
test, light json and e2e module, the d3ec16c3 diff, `docs/level-design.md` 16.10, BRIEF. CLAUDE.md rule: block only on broken or
unplayable work; cosmetic notes are polish. Other agents' in-progress diffs (a5Substation, e2e scripts) ignored.

## Tests run
- `npx vitest run tests/ctcourse/a8Strongroom.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/marlowN1Objectives.test.ts`:
  "Test Files 4 passed (4), Tests 112 passed | 1 skipped (113)" (the skip is the CTLIGHT write case). `marlowN1Objectives` holds
  d3ec16c3's unit case for the two-gate door.
- `node --check scripts/e2e-ctcourse/a8Strongroom.mjs`: ok. No e2e run.
- Probes (scratchpad, esbuild bundles of the repo modules, nothing written to the repo):
  - the built `ctcourse`: every door named by more than one gate (only `A8-grille`: `egress g-a8-rte`, `mains g-a8-grille`);
    `security.levels` = `{ a8-gallery: 4.4 }`, every other camera on `ground` (floor 0, unchanged);
  - the game's `inFrame` / `camPitch` / `camRange` for C2 and C3 at the route's spots;
  - `cameraRate` / `stepCamMeter` / `cameraReach` for a body waiting at the gallery pier under C2.
- Static read of `src/world/maps/bunker.ts` (Fallow) for doors with several gates (must-fix 1).

---

**Verdict: FAIL (one must-fix: d3ec16c3's lock rule breaks Fallow's lift door).** The A8 greybox itself is sound, complete and co-op
only; with must-fix 1 done it is a PASS. Two should-fixes, both in the e2e: one probable failure (the grille step meets N2), one missing
doc assert (the request-to-exit).

## What was checked and holds
- **Contract.** Inside `SET_BOX`, ids `a8-` / `A8-`, register A8-1..15 with the builder's counts (16 lamps, 5 doors, 1 ledge anchor),
  `checkSetPart` clean, the stub gone. Commits touch only A8's files plus the two requested shared files; no `src/ai` edit.
- **Co-op only.** The one lip in the band is `a8-gallery-lip` (4.4, x 109, z 66-70.5, normal +x), in `COOP_LIPS`, one manual ledge,
  no generated lip; `soloJumpThreats` empty with teeth; the main counter 5.0 m off (A8-D2); columns moved off the span (A8-D9); every
  block 1.9 m or taller `noLedge` (slab, balustrade, office block, stair fillers, closed areas). The hard co-op gates hold: the throw
  (beam gaps under a crouch, `beamThreats` empty, nothing over 0.3 m in the keep-clear) and the paired hack (T1 outer zone, T2 inner
  zone, 12.0 m > `syncMinGap('scan')`, `scanStart` refuses one player, no floor point reaches both). The panel-jam crossing of the beams
  (`panel-a8`, A8-D11) is A5's open item for Michael and is not re-raised.
- **Flow, no dead ends.** Steps `a8-split` (`a8-gal1`, any) -> `a8-office` (`a8-loop`) -> `a8-grille` (`a8-lobby`, both) -> `a8-beams`
  (`a8-inner1`, any) -> `a8-sync` -> `a8-out`; every done flag is set by a zone or device the route reaches. Ways back: the public stair,
  the office stair (the foot door stays open once barred), the request-to-exit, the beams drop with the sync. The cash dock (exit zone)
  is reached only through the vault (flag gate `a8-sync`); the facility closes it on its other three sides.
- **Devices and reach.** Board, console (refused with the officer up, pickup gate, 60 s / 20 s), stair bar (egress, 2.25 m from a hall
  body), request-to-exit (2.75 m from a hall body, out of the stairs' reach), T1 2.18 m from the foot landing (over the 2.15 m host
  slack), T2 inner only: the through-wall reach cases in the test have teeth. The foot door's 0.8 m clear between the jamb and the
  block corner passes a 0.3 m body (tested walk).
- **Doors.** Five, 1.2-1.8 m wide, 5 m apart; the grille and the foot door swing into the lobby, the open leaves have no body.
- **Guards.** Three armed `grunt`s (3 = the set cap), none passive. N1 a two-point post, waits [6, 6] (turns every 6 s, walker-tested);
  N2 waits [5, 0.1, 5, 0.1, 0.1] (zero-wait freeze teeth), nav loop 35-45 s; the officer static at y 4.4 (`em.spawn` takes `y`), back to
  the door, info lines 85 / 69. Sight: the grille is a shut door (opaque, LD 2.5 / Q8); the balustrade hides a crouched A; walls round
  the office and stairwell; no glass in the set (the facility gallery glazing has no guard). The lure: N1 nearest at every point of
  N2's loop, the board in `LURE_RANGE`.
- **Cameras.** Three (the A8 budget), fixed, `offFlag a8-loop`, ranges 14 / 10 / 14 (the range cut), IR (`cameraRate` reads
  `CAMERA.irLight`, not the lamps). C2 over the gallery (lens 7.4 with d3ec16c3's levels) frames the deck x 126.5-133.4 and the office
  door approach, not the hall floor nor B's lane (132.25, 72-74.5); the jam line 17.8 m, no box. C3 frames T1, T2 and the throw spot,
  not the grille's inside spots (135.4, 62) / (134.6, 62) nor the hall.
- **Lights.** 16 lamps on 81-84, every one grouped, `electric`, `destructible`; tuned bands: front 0.77 / cut 0.14, grille approach
  0.64 / 0.22, pockets 0.14, office 0.82, T1 / T2 0.79 / 0.83, standby 0.14. The mains gate reads group 81 (host), the client gets the
  group and the lock list: both asserted on both pages in the e2e. The status lamps over the locks (A8-D12) keep the lobby panels off
  the grille.
- **d3ec16c3, levels merge.** `security.levels` now carries `a8-gallery`; `ground` is not a key, so every other camera keeps floor 0
  (`ctDevices.ts:327`, `securitySystem.ts:79`); `validateSecurity` and the frame tests pass.
- **e2e module.** It walks every core exercise on two pages: the split (real leg-up and pull-up, claim and lines), the cross-level jam
  (C2 blind and frozen on both pages), the officer's refusal and the loop (cameras `looped` on both, timer line), the board (group 81
  off on both, levels dark and equal, grille unlocked on both, N1's lure), the grille and the stair bar, the throw (real buttons, landing
  within 0.5 m, no hit or alarm), the sync (a late hack fails with 9-10 HP, then 0.5-1.5 s apart), the vault, pass 2 (restart resets,
  claim swap, the relock leaves the door open, Q9). Doors are opened by `use(P, 'door-<anchor>')` and asserted open on both pages.

## Must-fix
| # | Where | Failure | Smallest fix |
| --- | --- | --- | --- |
| 1 | `src/game/course/courseState.ts:641-653` (d3ec16c3) | **Regression in another map.** S8 request 1 says "no existing door has two gates": false. Fallow's lift door `L9-door` (`src/world/maps/bunker.ts:162-165`) carries four gates that AND by design (training DECISIONS A41, BAYS R2: key A, key B, the case and the K-A / K-B pair). Under "locked only while none is open" one key pickup now opens the course's last door; no unit test or required e2e catches it (`bunkerMap.test.ts:1184` checks the data only). Fallow is parked behind `?legacy=1`, but it ships and this change broke it. | Keep AND for every gate kind and let only an open `egress` gate release the door (a request-to-exit is a release by nature): in the loop, `if (g.def.kind === 'egress') { if (this.gateOpen(g)) return false; egress = true; } else if (!this.gateOpen(g)) shut = true;` and return `shut \|\| (egress && !other)` (track `other` for a non-egress gate on the door), allocation-free. The A8 grille (mains OR rte), A4's wicket and A6's cage (egress only) behave as now. Add a case to `marlowN1Objectives.test.ts`: two `flag` gates on one door stay locked until both flags are set. Note it in `docs/systems/` where the course gates are described. |

## Should-fix
| # | Where | Finding | Smallest fix |
| --- | --- | --- | --- |
| 1 | `scripts/e2e-ctcourse/a8Strongroom.mjs:291-314` | **Probable e2e failure: the client is teleported onto N2.** `walker.idx` is the target point, held through the wait (`src/ai/patrol.ts:95-139`), so `idx === 2 && dist < 1.3` (`:291`) fires up to 1.3 s before N2 arrives at G (133.2, 62.0); he then stands there 5 s facing the gate. The asserts between the press and the move (isolator, lamps, levels, both unlocks, the second press, N1's walk: hearLook 2.4 s + 1.2 m) take about 4 s of sim, so the client lands at `GRILLE_AT` (133.0, 62.0), 0.2 m behind a calm N2 (bodies overlap; close range). Expect a sighting, a push, or `closeDoor` refused with N2 in the doorway (`:314`); the client's damage is not off. The doc's route has B walk 11.5 s and arrive after N2 has left. The client also waits at the board while N1 walks at it (`:307`). | Right after the press, move the client off the board to the lane (132.25, 66.0) (dark in the cut, behind N2 at G and N1's walk). Assert N1's walk on the host. Then `until(A, () => squadOf('a8-night2').walker.idx === 4)` (the SE -> W2 leg, his back to the gate: about press + 10 s, inside the 25 s) before `moveClient(GRILLE_AT)`. In pass 2 (`:432-437`) wait for the same `idx === 4` before the host's board press. |
| 2 | `a8Strongroom.mjs:447-454` | **The request-to-exit check cannot fail, and the doc's assert is missing.** The host presses `c-a8-rte` from (135.4, 66.5), 10.4 m from the device at (136.3, 56.15); the host's `use` skips reach (`e2e-ctcourse.mjs:106-113`). The set doc (11, step 10) asks to "Assert `c-a8-rte` cannot be used from the hall side". `hasRte \|\| locked` (`:454`) is always true now. | Before the host's press: `moveClient(133.4, 57.0)` (hall side, about 2.9 m from the device), `use(B, RTE)`, `waitSim(1000)`, assert `lockedOnHost(grille)`. Then `moveHost(136.3, 57.0)` and press; also assert the client sees the grille unlocked. Drop the `hasRte` branch (the rte is on). |

## Polish (D = for the A8 dressing step)
| # | Where | Note |
| --- | --- | --- |
| 1 | playtest / Michael | **The board is optional.** (a) Doc 5 lists the request-to-exit as a tool for the shut grille: A comes down the office stair and presses it, the grille opens for good and B walks in on N2's 24 s away; no board press. (b) With the loop running, B can also take the public stair (C2 looped; only N1 / N2's timing) and follow A through the office and down the stair. Both routes stay co-op (the throw and the sync gate the vault). If the night circuit must be a required beat: put the stair foot on the night circuit (a `mains` gate on `A8-stair-foot` in place of the push bar, so A's way down opens with B's cut) and drop the rte or move it into the inner zone. Michael's checklist already asks "can one player do any step alone". |
| 2 | `S8.md` A8-C15 | "The pier (125) is just outside its range" is not true: the pier is 9.5 m from C2's lens, in frame and in range 10. It is harmless: crouched or standing still there the rate is 0.056 / 0.123 per s, so the meter never reaches stage 2 in 60 s (crouched reach 8.36 m). A crouched walk is seen from about 9.1 m (x 125.4 east). Fix the sentence in the doc. |
| 3 | `a8Strongroom.ts:88` (`A8_RTE_AT`) | The rte's standing spot (136.3, 57.0) is in C3's frame (a crouched head is not). A lone player using it after the loop is seen. Fine for a way out; note it in the doc or move the button 1 m east. |
| 4 | `a8Strongroom.ts:339` (A8-13 register text), `S8.md` "Undone" | Stale: they say the request-to-exit is off; d3ec16c3 turned it on. |
| 5 | `a8Strongroom.mjs:306` | "A second press does nothing" passes even if the press resets the window to 25 s (`> 15`). Read the timer before and assert it did not rise. |
| 6 | `a8Strongroom.mjs:13`, `:256-257` | The header promises "a press while it loops does nothing" (not done; the unit test covers it). The pier meter check under a blind C2 cannot fail (no control without the jam; unit-tested by frames). |
| 7 | `a8Strongroom.mjs:195` | `ownMax > 1.45 \|\| ownMax === 0` can stay silent (same as A5 polish 2); the hit / alarm assert still bites. |
| 8 | `a8Strongroom.mjs` pass 1 timing | About 45 s of sim from the console press to the sync with should-fix 1, plus the late-hack fail case, against the 60 s loop (asserted at `:371`, `:395`). Under load the loop may end first. If it flakes, run the late-hack case in pass 2 or press the console one N2 cycle later. |
| 9 | lure edge | With N1 and N2 down and the officer still up (off the taught route), the board's lure (25 m) reaches the officer upstairs (16.2 m plan). Playtest only. |
| 10 | D | Both stairs have no side rails (16.10 item 4; the 4.4 m public flight has open sides). Visual rails, and a thin invisible `noLedge` rail if stepping off should be blocked (A2-17 idiom). |
| 11 | D | The grille's bars on the gate and the brass panelling of the fixed panels (A8-C12), the balustrade cornice, the drop chain at the loading edge (P13), the counters as `bankCounter` modules, the vault interior, the hall coves on 81 (doc 7 parity line). |
| 12 | job lead | S8 requests 3-7: `marlowCircuits` A8 rows (84 lamps 2 -> 4, switch hints, 81's `lure.from`), a `restore:<gate>` radio key, a `tile` surface (A8-D10), `e2e-times.json` part :4, the set doc's numbers (A8-C14/C15, A8-D9..D17). |

## 16.10 review (A8)
1. Forced path: none (the hall is open round the counters; the stairs are the building's).
2. Purposeless space: none on the route; the back offices and plant are named closed blocks (A8-12).
3. Ladders: none. 4. Stairs without handrails: both stairs (polish 10, dressing).
5. Roof access: none (office roof, lobby ceiling and vault roof are unreachable). 6. Roof objects: none.
7. Floor / roof not covered: none (hall ceiling 9.0, office roof 7.4, lobby 5.5, vault 3.0).
8. Unnamed block / blocked door: none (the block south of the flight is A8-6's, named for T1's reach; no swing hits a solid).
9. Barrier in front of a room: none (the grille is the bank's real gate). 10-11. Ladder in hole, vents: none.
12. Invented side entrance: none (an enclosed staff stair from the CCTV office to the vault lobby, A8-C1).
13. Register rows A8-1..15; counts equal the builder's. 14. Recognisable: yes (banking hall, public gallery, counters, night desk,
    grille, vault lobby with time locks, vault).

## What only the e2e run (or GPU shots) can prove
- The leg-up onto the return and the pull-up on the built map; the throw's settle and landing in the lobby.
- N1's lure walk with his torch in the cut, and whether B at the board or on the east lane is seen (the ghost route passes N1's line
  at 2-4 m, doc self-critique 3); N2's periphery on the jam spot and the lane; the officer's takedown in the lit office (e2e knocks
  him out).
- The grille closing with the client inside the leaf's arc (the door menu's doorway rule).
- The pass 1 timing inside the 60 s loop under load (polish 8).
- Light parity on real pages (asserted; the e2e reads the bake on both), and the GPU look of the cut, the pockets and the lobby's
  small pools (shots `a8-vestibule`, `a8-pier`, `a8-outer`): GPU run on Michael's PC.
- Fallow's lift after must-fix 1: `e2e:legacy` if the job lead wants the runtime proof (not in the required run).
