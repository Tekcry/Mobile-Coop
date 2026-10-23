# S3-7-dress-check - fresh check of the dressing of A3-A7 (step 5, "Dressing (M5)")

Date 2026-10-23. Checker: fresh agent (built none of it). Read-only on code. Sources: `DRESS-BRIEF.md`, the dressing sections of
`a3OfficeRange.ts` (227a402b / cb1bf114), `a7DataHall.ts` (3ea78569), `a4GoodsShed.ts`, `a5Substation.ts`, `a6PumpHouse.ts` (cb1bf114,
927ecabe, ea111da9), their tests' dressing blocks, each "## Dressing" section in S3-S7.md, the e2e diffs (`git diff 45458bbc HEAD`),
`S2-check.md` (A1 dressing), `S34-check.md`, `S567-check.md`. CLAUDE.md rule: block only on broken or unplayable work.

## Checks run
- `npx vitest run tests/ctcourse/ tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/voxelFit.test.ts tests/levelFillParity.test.ts`:
  "Test Files 13 passed (13), Tests 469 passed | 1 skipped (470)".
- `node --check` on `scripts/e2e-ctcourse/a4GoodsShed.mjs`, `a5Substation.mjs`, `a6PumpHouse.mjs`: ok. No tsc, no e2e, no GPU.
- Greybox diff: `git diff 45458bbc HEAD` on each set file is additions after the greybox plus imports and header comment, with two
  exceptions (A4 rail group, A5 switchgear run, below). A3, A6, A7 greybox code is byte-identical, so their checksum pins (added in the
  dressing commits) are the true greybox. A4's pin predates the dressing (e36d4b51).

## Verdicts
| Set | Verdict | Must-fix | Should-fix |
| --- | --- | --- | --- |
| A3 Office Range | PASS | none | S1 (shared) |
| A4 Goods Shed | PASS | none | S1 (shared) |
| A5 Substation | PASS | none | S1, S2 |
| A6 Pump House | PASS | none | S1 (shared) |
| A7 Data Hall | PASS | none | S1 (shared) |

Distinct should-fix items: 2.

## Must-fix
None. No broken or unplayable work, no hard-rule breach found.

## Should-fix
| # | Set | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| S1 | A3-A7 (worst A5) | `src/world/props/propRender.ts:189-191`, `PropPlacement` (`facilityProps.ts` about :595-612); `setTint` has no caller outside the renderer | Light parity covers only the kit glows. Prop emissives (`screen`, `lamp`, a sign plate's backlit face) have no circuit group and no device hook, so they stay lit when their circuit is cut or the device is off. Placed: A3 5 sign plates; A4 video wall (108 screen + 24 lamp tris), desk screens, truck beacon; A5 two beam towers, each with a red lens (72 lamp tris), which stay red while the beams are jammed or off (the jam is the set's mechanic, so the lens reads as a lie); A7 37 racks' LEDs, 3 cooling-unit screens, 9+ plates. The brief's "every emissive / LED on its circuit group" is met for kit pieces (all tested), not for props. A1 and A2 passed the same way, and PROPS.md 1 defines prop emissives as accents. The dressers could not fix it (shared file). | Shared change, not the set files: a `group?: number` on `PropPlacement` and a `groupLit` dim in `propRender.ts` (as `kitRender.ts:176-191`), then set it on the towers (51 / 50), racks (70) and plates. Stopgap for A5 only: `lamp: [0.15, 0.03, 0.02]` on the towers. Lead decides whether this waits for the visual pass. |
| S2 | A5 | `scripts/e2e-ctcourse/a5Substation.mjs`, `assert(bandSamples > 0, ...)` in the arc loop (about :134) | Redundant and flake-prone. The new `ownMax` interpolation already makes `ownMax > 1.45` fail when no crossing was seen. `bandSamples` counts polls within 0.3 m of the beam line; the arc crosses that 0.6 m band in about 0.2 s of sim, and under software GL a poll (GB evaluate plus `waitSim(30)`) can miss it. | Drop the `bandSamples` assert and keep `ownMax > 1.45`, or count `prev` / `own` straddles of BEAM_X instead of band samples. |

## Per set

### A3 the Office Range - PASS
- **Visual over collision.** Every hand-built box is a skin (`skin()` throws at 5 cm or more; the test asserts `< CANON_MIN_THICK` on all
  300+ skins, `noLedge`, no collision). The only new collider is the cleaner's trolley (invisible, noLedge, 1.0 m, one box via
  `writePropBoxes`), parked in office 2's south-west corner. The test walks every loop leg and every lured walk past it (`dressWalk`),
  keeps both pockets open (`blockedAt`, `walkBlocked`) and has a teeth case (a trolley parked in the bay would close the pocket). The four
  desk props sit inside the greybox desk boxes (their boxes are not written). Corridor, recess and door widths and both jam-post lines to
  the lens are re-walked with every solid. The camera range, hide spot and unseen offices are re-asserted.
- **Greybox.** 33 boxes pinned by checksum; code unchanged; solids 30 -> 31 (the trolley) is asserted.
- **Budgets.** Kit triangles from `kitTriangles` over the lay's instances in the box (12.5 k); props from `FacilityProps.check`,
  `propTriangles`, `propDraws` with the facility's plate counted: 12 draws exactly, no headroom (S3 request 4).
- **Light.** Kit glows only in the two lobbies, all on 34, floor to slab; the L2 / L3 frames and the corridor switch are left clear
  (tested). No lamp added (14). Ceiling skins sit above every lamp's bottom (tested against each lamp). Floor paint stays under the 2 cm
  greybox marks. The hall over A3 is a sealed void, so no panels (reasoned in the doc).
- **Tests can fail.** Presence tests need the dressing (`near(...)` counts, a back plate per switch, lift and cupboard skins, kit panel counts).
- **Polish items.** A3-3 row filled and asserted; lift doors, cupboard and inlay (lobby use) built; switch back plates built; the
  panel-radius trim is listed as the lighting owner's (correct: it is a lamp change); set-doc updates listed as requests.

### A4 the Goods Shed - PASS
- **Visual over collision.** 667 skins, same rules. Four written boxes: the video wall's plinth and frame, the truck's chassis and
  see-through envelope, all noLedge. Racking (24 bays, 8 end frames) and the desk write nothing: a 2000+ sample test proves each prop
  box lies inside a greybox solid within 5 cm, with a teeth case on the truck. The truck stands at the east lane's south end: 1.95 m of
  lane stays beside it (>= 1.9 asserted, from 3.75 m), 0.5 m is sealed behind it, and the east lane path and the officer's approach are
  re-walked. `soloJumpThreats` is empty on the deck edge and every rack face with the boxes in (crate teeth case).
- **Sight lines.** C1, C2 and C3 frames, the three jam lines, the loaders' pair and the officer's desk and door are sampled every 5 cm
  against the written boxes, with a teeth case. Standing points (crouch spots, posts, console, push bar, hide spots) have no skin within 0.2 m.
- **Greybox.** The one edit inside it is the three mezzanine rails' `group: G_MEZZ` (no box moved; asserted: 17 rail modules, all on 43).
- **Budgets.** Kit 41.4 k computed. Props are budgeted per area (room 11 draws, floor 12, asserted with `toBe`; the test also asserts the
  two together exceed 12). Total 21 draws for the set. The brief and the lead allow "per area where the test splits it"; see the GPU list.
- **Light.** Panels from 7.5 m, 41 / 43 asserted per wall run; no lamp, and dead row 49 has none (the dead fittings are skins). S34 polish:
  stair rails are drawn as pitched skins (no collision, so a body can still step off: polish); the S34 e2e fixes were already in.
- **e2e (cb1bf114).** The roles are swapped: the host presses first and `roleOf` is asserted `["b","a"]` after the first press and again
  after the client's later press (a real assert that fails if the claim moves). Step 4 and the step-line expectations are swapped to match
  (stack N = A = client, near the office: checked against stack N z 35.1-35.9 beside the office wall z 37.9). The officer now stays passive
  for the knock-out (`knockOut` calls `e.knockOut` directly), which removes the awake-in-front race. Coverage grows: one S34 polish item
  (roles never swapped) is closed.

### A5 the Substation - PASS
- **Greybox edit (disclosed, accepted).** The switchgear run now ends at z 44.6 (S567-check polish 3) and an invisible `noLedge` filler
  keeps the old footprint to z 45. This is the one deliberate change inside a greybox in A3-A7. The test pins the 25-box checksum with
  the changed box, asserts run + filler equal the old run (x 40.3-41.1, z 37-45, 2.3 m), that both door leaves clear every visible
  piece over their whole swing (`leafHits`), and has teeth (the old run and a dropped skin are hit). Standing is unchanged; the visible
  box is 0.4 m shorter in the light shapes, and `ctcourseLight` is green.
- **Visual over collision.** 955 skins; the only collider is that filler. The two beam towers write no box (their 0.26 m skin stands 7 cm
  off each post end; `voxelFit` green, reason documented): the throw arc from every start passes the tower skins by more than 0.5 m; the
  beam line, `beamThreats` and the 6 m gap are the greybox's (asserted). Skin clearance windows on the doors, glass slot, plate, beam
  panel, flood and kiosk lamp fixtures are asserted empty with `skinsIn`.
- **Budgets.** Kit 35.6 k computed; props 13 placements, 7 draws with the facility's plate (`check` plus the caps; the `> 4` floor is weak
  but the cap is what matters).
- **Light.** All panels on 50 / 51 by position (west wall from 4.4 m on 51, east on 50, south and north split at the security wall x 58);
  never 52 / 53; no lamp added (9).
- **e2e (927ecabe).** Both S567-check polish items are in. Item 2: `bandSamples` plus an interpolated crossing, and `ownMax === 0` no longer
  passes (a stronger assert; flake risk S2). Item 1: `leftKiosk` before the variant's press (it resolves while the walker index is 1, so
  the press can land late on the K -> R2 leg or at R2; acceptable, because the damage-proof client means a sighting cannot down it) and
  `noDamageClient` (same idiom as `scripts/e2e-coop.mjs`). The route is unchanged. The unit test for these edits only greps the script's
  text, so it proves the lines exist, not that they bite (polish).

### A6 the Pump House - PASS
- **Collision added.** 12 invisible `kit.handrail` rail boxes on the staff stair's open side and 5 `pipeRun` modules (10 boxes) on the
  east wall, all noLedge, pipes 0.7 m tall. The rail is the S567-check polish 2 option (the checker suggested an invisible rail). Tests:
  spacing, heights over the walking line, no gap, flight and edge lane open to 0.3 m off the edge, foot open (starts at the third tread),
  step-off blocked with a no-rail teeth case; 5 m from the rope, leg-up, holder and mark. `soloJumpThreats(withNew, LIP)` is empty with
  every new box in, and the crate case bites. `GREY_KEEP_CLEAR` holds for every new floor collider. Pipes are 2.5 m from the L6 door and
  clear of the switch, kerb opening, exit route and every attendant loop leg. No generated grip above 0.9 m.
- **Budgets and light.** Kit 29.5 k computed; props 5 pipes, 4 draws. Panels on 60 / 61 / 69; 69 is the dead circuit with no lamp, and
  `kitRender.groupLit` treats a lampless group as dark, so the west cove stays dark (asserted: no lamp on 69, the plan excludes it). No
  lamp added.
- **e2e (cb1bf114).** The pass-2 waits (`waitAttendant` near the desk or east of x 55) and the client's remote `damageMul = 0` are wait
  and immunity edits only; no assert was loosened or removed. `r.protectT = 0` clears spawn protection, harmless beside `damageMul = 0`.

### A7 the Data Hall - PASS
- **No new collision at all** (asserted: `dressing.filter(collide) == []`, solids 36 unchanged). Racks and units are props over the greybox
  runs, 5 cm proud and 1 cm up, boxes not written; rack-box containment is asserted for all 37 racks. Rack ends, unit flanks and rears
  are skinned over the prop's whole depth. `anchors.ledges` and `splits` in the set are empty.
- **Sight and clearance.** Skin windows are empty at the ready-lamp line, both hack spots (0.5 m), all five door openings, the L6 / L7
  doors, both camera lenses, the lee feet, the tech's route (every 10 cm, 0.3 m wide) and the corridor lane. These are negative tests
  with no teeth case (polish); the same `skinsIn` helper is used in positive assertions, so the helper works.
- **Budgets and light.** Kit 30.8 k; props 15.4 k tris, 12 draws asserted. Panels on 70 (hall, from 4.2 m) and 72 (over the gallery
  glazing, from `GAL_TOP`); slots on 70 / 72 / 73, all with lamps on those groups. No lamp added (15).
- **Polish items.** The riser block as a services core (S567-check polish 4) is built with a face-by-face test; `a7DataHall.test.ts:473`
  range 14 (polish 2) is done. 1109 skins: the highest of any set.

## Polish list
1. A5 beam towers have no collision, so a body passes through the 0.26 m base (the doc discloses it). Visual only.
2. A4 stair rails are skins with no collision: a body can step off the flights (S34 item 4 asked for a rail; it is now drawn).
3. A6 interlock lamp (red / green by `a6-drive`) still has no device emissive (S6 request, shared file).
4. The A5 e2e polish test greps script text; A7 clearance cases and A6 "stays off the marks" have no teeth cases (`skinsIn` finds nothing
   if the window is wrong). Add one planted skin per test that must be found.
5. A3 props are at exactly 12 draws; any added prop breaks the cap.
6. A6 e2e: drop `r.protectT = 0` (`damageMul = 0` is enough).
7. A4 set-doc note 9 (a chair behind the officer) is a skin in A4-14; the engine still stands him.
8. Open and listed in each Dressing section, none belongs in the dressing files: A3 floor surfaces for carpet and vinyl (S3 request 3),
   the lamp-radius trim, the set-doc updates and the shared-file requests.

## What only GPU shots or e2e can prove
GPU (laptop, Character Build; none run here):
- Skin counts, each one thin-instance mesh per set: **A7 1109 (highest; not in the brief's list)**, A5 955, A6 725, A4 667, A3 380 (A2
  had 685). Frame time per set; the docs name the first trims (A7 floor seams about 130 and cage plates, A5 pens 210 and switchroom 242,
  A6 pumps 273, A4 sheeting stanchions and roof ties 148, A3 ceiling grids 52 and carpet seams 30).
- A4 total prop draws 21 (room 11 + floor 12): fine only if the room and the floor are never drawn together at depth. Confirm from the
  passage mouth and the room door in a shot, or against the yard-wide draw budget in `docs/systems/performance.md`.
- Z-fighting and layering: 3 cm skin layers, floor paint 1.2-1.4 cm over greybox marks at 2 cm, props 1 cm up and 5 cm proud (A3 desks'
  white tops against the brown box, A7 racks against rack caps, the A4 desk), the A5 towers 7 cm in front of the jamb plates, the A5
  filler seam at z 44.6 against the end panel, A6 crane beams at 7.9 m against the 7.5 m cove line, hall panel cove heights against the
  gallery glazing (A3 none, A4 7.5, A5 4.4 / 7.5, A6 4.4, A7 4.2 / 7.5).
- Prop emissives against a cut circuit (S1): the A4 video wall in the dark, the A5 tower lenses with the beams jammed, A7 rack LED glow.
- A3: ceiling tile at 2.97-3.0 against the lamp panels and the camera plate; the lobby coves on the never-switched 34.

e2e / playtest (laptop; not run here):
- A4 swapped-role route end to end (host B, client A), the passive-officer knock-out, the 20 s re-arm re-press.
- A5 variant press timing with `leftKiosk`, the throw-arc assert with `bandSamples`, the back door leaf against the shortened run.
- A6 pass 2 with the waits (150 s timeouts), the stair walk with the invisible rail (feel; nav for the 61 lure up the stair), the pipes
  on the L6 route.
- A3 cleaner nav through the 1.2 m doors with the trolley in the corner (unit-tested on the leg lines, not on the nav grid); A4 D2's
  office door walk; A7 tech loop at walking pace with 1109 skins in view.

## S1 done (prop emissives)
Prop emissives now follow their light circuit and their powered device, as the kit's LED lines do (`kitRender.ts` ~:176-191).

**What was wired**
- `PropPlacement.group` (a `LightDef.group`) and `.device` (a laser id); `FacilityProps.add` / `propRow` carry them.
- `PropRender.create(scene, placements, doors, reg)` takes the `LightRegistry`. `src/world/world.ts` now passes `level.lights`.
- A grouped emissive is dim (`PROP_DARK` 0.06 of its colour) while no lamp of the group is `on` and not shot out (cut, jammed, destroyed). A frame observer repaints only when `reg.version` changes. Emissives stay thin-instanced (colour per instance); no allocation per frame.
- `PropRender.setDevice(id, on)`: dark while the device is off. Hook: `src/game/ctDevices.ts` `applyJam`, where a laser's `on` changes (`laserLive`: panel jammed or rebooting, release switch, dead section), one call `world.facilityProps?.setDevice(l.def.id, on)`. Render side only; the sensor still reads `l.on`.
- `PROP_EMISSIVE_PARTS`, `PROP_OWN_SUPPLY` (the A2 push stations: the lamp is the isolator's own status indicator, tinted by its state, on no lighting circuit) and `propGlows` in `facilityProps.ts`.

**Per-set counts (lit props)**
| Set | Props | Circuit / device |
| --- | --- | --- |
| A1 | 0 (checker desk screen is dark) | - |
| A2 | 2 push stations | own supply (written reason) |
| A3 | 5 sign plates | 30 (2), 34 (3); desk screens dark |
| A4 | video wall, console desk, reach truck beacon | 40, 40, 41 |
| A5 | 2 beam towers | `device` `laser-a5`, no group |
| A6 | 0 (pipe runs only) | - |
| A7 | 37 racks, 3 cooling units, 9 plates | 70, 72, plates 70 / 72 / 73 by the side they face |
| Facility | lounge desk and case wall (10), 3 gallery plus bridge screens and consoles (90), hold and dock plates (hold group, 98) | house circuits |
A8 (vault leaf lamp, plates) is set in `a8Strongroom.ts` by the A8 dresser.

**Tests**
- `tests/facilityProps.test.ts`: dim on a cut group, back on a switch, dim on a shot-out lamp, device on / off, explicit tint still wins, no registry means lit, thin-instancing kept; `PROP_EMISSIVE_PARTS` matches the GLB; `add` / `row` carry group and device.
- `tests/laserPanels.test.ts`: a jam of the panel calls `setDevice(laser, false)` for each band, the reboot's end calls `true`.
- `tests/ctcourse/a1-a7`: each set asserts every lit prop has a group (or device, or the own-supply reason).

**Only GPU shots can show**: the video wall in the dark, the A5 lenses with the beams jammed, A7 rack LED glow with 70 cut; that 0.06 of the colour reads as dark against the bloom.
