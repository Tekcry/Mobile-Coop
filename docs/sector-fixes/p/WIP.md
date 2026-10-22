# sector-fixes slice P: laser power panels (WIP)

Branch `feature/sector-fixes-p` (master 4.56.0 + slice C). Michael's ask (item 6, verbatim): "If there's lasers, there
should be panels nearby that power them which can be interrupted using the jammer. Must be hard to access and not in
plain sight. Electro vision should show the panel."

## Plan (built)
1. Data: `LaserPanelDef` (`src/game/laserPanels.ts`) and `MapLayout.laserPanels`; panels in `WAREHOUSE_OPS_PANELS`
   (`warehouseSectors.ts`) and `S4_PANEL` (`ctcourse.ts`). A panel lists the laser ids it powers, its mount point, yaw
   and Sector Ops section.
2. Behaviour (`CtDevices`): each panel is a jam target of kind `'panel'` at its door face; a laser is live only while its
   panel's jam timeline is idle (`laserLive`), so a jam cuts it for the jam and the 1.5 s reboot. Dead sections' panels
   are dark and no target. Trip radio: "... Jam its power panel (electro shows it)."
3. Look: procedural box housing, door plate, seam, hinge, label strip, conduit, status LED (parts library, no
   collision, render only). Electro paints the housing (`PANEL_PART` in gameState `paintElectro`).
4. Co-op: the panel ids ride the `jam` claim and `sec.dv`; the client builds the same panels from the map and mirrors
   the timeline. PROTOCOL_VERSION 28 -> 29.
5. Tests: `tests/laserPanels.test.ts`; e2e-ctcourse station 4 and e2e-sectorops (co-op block) extended.

## Assumed decisions
- **A1** The panel is the laser's jam point; the beams are no longer jam targets. Undo: in the `CtDevices` constructor
  re-add an `addDev` per laser (kind `'laser'`, at the band's middle) and read that device's phase in `applyJam` (as
  before slice P); the `'laser'` kind is kept in `JamTarget` for this.
- **A2** Protocol bumped 28 -> 29 although the wire shape is the same: the jam ids now name panels, so a 4.56 peer and a
  slice P peer would refuse each other's jams. Undo: back to 28 if the job lead prefers shape-only bumps.
- **A3** The Sector Ops mezzanine's two deck lasers (stair head, deck west) share one panel (one group); the other
  bands have one each (the workshop and plant deck bands are far apart and on different floors).
- **A4** A panel whose bands are all released for good (station 4's release) shows a dark LED (power cut).
- **A5** Panels are not added to the warehouse dressing's keep-clear points (that would move dressing and could shift
  the pinned light levels); a dressing piece overlapping a panel is a polish item.

## Placement (traced in `tests/laserPanels.test.ts` through the level's pieces)
| Panel | Powers | Where | Hidden by | Jammed from |
| --- | --- | --- | --- | --- |
| `panel-workshop` | laser-workshop | office void north wall (3.5, 3.5, -8.95), facing south, 6 m from the band | the void's east wall: unseen from the whole workshop floor | the catwalk (east ladder climb) through the void opening, (10.5, 3.0, -9.55), 7.1 m; or inside the void (a crawl) |
| `panel-deck` | laser-deck | facade inner face behind the AHU (2.5, 4.3, -17.85), facing north | the AHU: unseen from the open deck north of it, both sides of the band | round the AHU's corner from the deck's south-west corner (-3.6, 3.3, -17.2; was -3.2, -17.3 before R1's sill took it), 6.1 m |
| `panel-vna` | laser-north-aisle | on R2N's top at its north end (-14.9, 4.33, 14.3), facing west | the 4 m rack: unseen from the VNA aisle and the gangway | R1N's top across the aisle (its ladder at the aisle's north end), (-18.75, 4.0, 12.5), 4.3 m |
| `panel-mezz` | laser-deck-stairs, laser-deck-west | under the deck, north wall behind the parts store's back shelf (12, 1.4, 18), facing south | the deck slab and the 2 m shelf: unseen from the deck strip and the hall floor south of the deck | along the slot behind the shelf from under the deck's east half, (19, 0, 17.4), 7.0 m |
| `panel-s4` | laser-s4 | Marlow Yard station 4, far side's south wall (bay x + 12, 4.0, 0.15), facing north | the obstacle wall beside the gap: unseen from the near side's south half | diagonally through the gap from the near side's north half, `S4_PANEL_JAM` (bay x + 5.5, 10.5), 12.4 m |

Station 4 stays as the training intends: the throw and the far-side release are the taught route (panel text, HUD
step, radio unchanged); the panel jam replaces the old "jam the laser" alternative (one player jams from the near side,
the partner walks through within the jam, then presses the release for the other). WALKTHROUGH and CTCOURSE-SPEC
updated.

## Verified
- `npx tsc --noEmit -p .` clean; `npx eslint` on the changed files clean.
- Vitest: laserPanels, laserAlarm, jammer, jammerFixes, sectors, sectorStep3, ctcourse, securityRoom, net, moveState,
  rejoin, scanners, vision, visionIsolation, warehouseDress, detailPass: all pass.
- Not run here (laptop): e2e-ctcourse, e2e-sectorops, e2e-coop, e2e-netmove. GPU look of the panel mesh: pending PC run.

## Status and next steps
- Done: everything in the plan above; uncommitted on `feature/sector-fixes-p`.
- Not done: e2e runs, the GPU look of the panel mesh.
- Next: the job lead commits; the laptop runs e2e-ctcourse, e2e-sectorops, e2e-coop, e2e-netmove; desktop GPU look.

## Checker (fresh Opus, 2026-10-22 ~19:50, on 66995a22): PASS
tsc clean; eslint 0 errors on the 16 changed src / tests files; Vitest 10 related files / 240 tests pass. e2e on the
laptop (queued after train 7).

## Polish list (checker, non-blocking)
1. A panel whose bands are all released for good (station 4 after the release) stays a jam target that does nothing;
   drop it from the targets as `flagOff` does for cameras (`src/game/ctDevices.ts` ~754).
2. The four Sector Ops vantages are traced with a 1.6 m eye, not the aim camera, and e2e-sectorops forces the host's
   jam intent (skips the LOS check): confirm each vantage picks its panel in the first playtest.
3. e2e-ctcourse station 4 adds two waits inside the 5 s jam cap: watch it under load.
4. panel-s4 is the least hidden panel (seen from the near side's north half, by design: it is the vantage).
5. Look (GPU pending): LED glow, proportions, the conduit by the mezzanine shelf, dressing overlap (A5).
6. Older text: TESTING.md says the jammer is RB / F, WALKTHROUGH.md says LT / Z.

## Open items
- The panel look (proportions, LED glow strength, the conduit poking over the mezzanine shelf) is a prototype: polish list.
- The vantage spots are traced statically (eye 1.6 m); the real third-person aim camera sits about 0.5 m off the head;
  the station 4 e2e checks the real aim, the Sector Ops e2e forces the host's intent (the aim is covered by the unit test).

## Laptop suites and the station 3 flake (2026-10-22 ~21:05)
- Laptop, 66995a22 (software GL, solo): check PASS 360 s, e2e-sectorops / coop / netmove PASS, e2e-ctcourse FAIL at
  station 3 "stale far-lobby positions reached the host (0 reports)".
- Diagnosis (desktop, b57c2fbf = P + master 4.58.0): a test-timing flake, not P. The stale-position window was a fixed
  0.8 s of host wall time; the client sends `pstate` only from its frame loop (20 Hz), which on software GL under load
  runs ~3 frames/s, so 0-1 reports arrive. The same assert failed on anim-bake-targets today. No page errors.
  e2e-ctcourse GPU: PASS 264 s (full) and 193 s (:1); software GL: the assert passed with n = 1.
- Fix (test only): the window lasts at least 0.8 s AND until 3 client reports were seen in the far lobby, capped at
  10 s (`scripts/e2e-ctcourse.mjs` station 3).
