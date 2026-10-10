# Dead Line v2 - engine check: walk-in tunnels, crouch ducts, low-ceiling camera

Stage D0, 2026-10-10. Read from the code at `ct-movement` 57d2ae0; nothing was changed. The camera numbers are computed from `src/player/shoulderCamera.ts` and `src/config/camera.ts` (script below), not rendered: no greybox with a low ceiling exists yet, and building one is code. A rendered check is the first task of the build stage.

## 1. Verdict

| Question | Answer |
| --- | --- |
| Walk-in tunnels (2.1 m and up) as normal spaces | **Supported.** Ordinary geometry; free movement, normal camera. A 1.8 m walkway between cable bearers is above the 1.6 m at which the camera never compresses (scale sheet 2). |
| Crouch-height ducts as normal spaces, no auto-crawl | **Supported with limits.** A low ceiling is plain geometry: the player crouches by choice (toggle or hold) and walks at any crouched gear. Auto-crawl only happens where a map places a `Duct` traversal anchor; this design places none. |
| Camera at 1.2 to 1.5 m ceilings | **1.5 m works, 1.4 m is usable, 1.3 m and 1.2 m fail.** Details in section 3. Set crouch ducts to **1.5 m clear, 1.2 m wide**. |
| Missing pieces | Seven items, section 4. Two are bugs that a crouch duct will expose (sprint under a low ceiling; the near plane through the ceiling). |

## 2. What the code does today

| Fact | Value | Where |
| --- | --- | --- |
| Capsule | 1.75 m standing, 1.15 m crouched, radius 0.30 | `config/movement.ts` |
| Crouch | Toggle by default, or hold; no auto-crouch at a low opening | `playerController.ts` 405-435 |
| Standing up | Blocked while a single upward ray from the capsule top hits static geometry within 0.65 m (needs 1.80 m clear) | `hasHeadroom()`, `playerController.ts` 351 |
| Crouched speeds | 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8 m/s; silent at gears 1-4 | scale sheet, `noiseRadius` |
| Auto-crawl | Only the `Duct` attach anchor (crawl pose, `duct` camera preset boom 0.9, pivot 0.55) | `config/camera.ts` `ATTACH_FRAMING.duct`, `attachController.ts` |
| Camera | Crouched pivot 1.18, height -0.08 (shoulder point 1.10 above the feet), boom 2.2 (2.13 at a sneak), shoulder 0.62, padding 0.16 along the boom ray, min boom 0.28, near plane 0.05, FOV 75 horizontal (46.7 vertical at 16:9) | `config/camera.ts`, `shoulderCamera.ts` 118, 197-278 |
| Camera collision | Two rays only: pivot to shoulder point (pulled to 75% of a hit), then shoulder point back along the view; padding is subtracted along the ray | `shoulderCamera.ts` 262-277 |
| Guards and low spaces | Nav headroom 1.7 m: guards never enter a 1.5 m duct; they can walk a 2.4 m tunnel. Perception has no vertical limit (they see into a duct mouth if the ray is clear) | `navBuild.ts`, validation section 8 |
| Ladders through floor openings | Ladder top exit exists (`REACH.ladderTop`); the Warehouse has a ladder through an open hatch | `world/anchors.ts` 221, 690; `world/maps/warehouse.ts` 178 |
| Nav layers | Default 3 walkable surfaces per column when sampling layers (the grid supports more through `layers`) | `navGrid.ts` 182 |

## 3. Camera under low ceilings (computed)

Crouched, hip, sneak pace, flat ceiling, unlimited length ahead and behind. Pitch + is looking up. "Clearance" is the gap from the camera to the ceiling; the near plane's top edge sits about 0.02 m above the camera, so under about 0.02 m the ceiling cuts into the top of the frame.

| Ceiling | Pitch +10 | 0 (level) | -5 | -10 | -15 | -20 | -30 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.2 m | boom 2.13 | 2.13, clearance 0.10 | 0.99, **clips** | 0.42 | 0.28, head hidden | 0.28, head hidden | **camera above the ceiling** |
| 1.3 m | 2.13 | 2.13, clearance 0.20 | 2.13, clearance 0.015, **clips** | 0.99 | 0.61 | 0.42 | 0.28, head hidden |
| 1.4 m | 2.13 | 2.13, clearance 0.30 | 2.13 | 1.57 | 1.00 | 0.72 | 0.44 |
| 1.5 m | 2.13 | 2.13, clearance 0.40 | 2.13 | 2.13 | 1.39 | 1.01 | 0.64 |

Reading it:
- **1.2 m**: the capsule clears by 0.05 m; looking even slightly down collapses the boom to its 0.28 m floor and the camera ends up in or above the ceiling slab. Not usable.
- **1.3 m** (the scale sheet's old duct height): level view is fine, but at -5 deg the boom ray just misses the ceiling, so no padding applies and the camera sits 1.5 cm under it: the slab cuts the frame. From -10 deg the boom halves. Not usable without engine work.
- **1.4 m**: usable down to about -5 deg; looking further down pulls the boom in to 1.0-1.6 m. Tight but readable.
- **1.5 m**: full boom to -10 deg; the operative stays framed at every normal pitch. **Recommended.**
- At any height, the top of the frame is ceiling (at 1.5 m the slab is 0.4 m above the lens). That is the intended claustrophobic look, not a fault.
- Width: in a 1.2 m duct the pivot-to-shoulder ray hits the side wall at 0.6 m and pulls the shoulder point to 0.45 m; the boom behind is straight and clear. Bends need the scale sheet's 2.4 m straight before a turn or the boom shortens.

## 4. Missing or to verify

| # | Item | Kind | Effect in a crouch duct | Suggested fix (build stage, needs Michael's go) |
| --- | --- | --- | --- | --- |
| 1 | No free-movement framing for low headroom; padding is measured along the boom ray, so at grazing angles the camera sits about 0.02 m under the ceiling and the near plane can cut through it | Missing | Ceiling slab cuts the top of the frame at shallow downward pitches (1.3 m and below always; 1.4 to 1.5 m only at extreme pitch) | Clamp the camera at least 0.10 m below any ceiling hit by a short upward ray from the camera, or lower the shoulder point when headroom is under 1.7 m |
| 2 | Sprint under a low ceiling: sprint sets the stance to `sprint` (5.0 m/s, 9 m noise) while `applyCrouch(false)` cannot stand the capsule up | Bug | Sprinting inside a duct moves at standing sprint speed with the crouched capsule, and the standing sprint pose would push through the ceiling | Do not start (and end) a sprint while `hasHeadroom()` is false |
| 3 | No cue at a low opening: a standing player walks into the lintel and stops | Missing (readability) | Touch players get no prompt; P7 says every action is possible through contextual prompts | A crouch hint when the player is pressed against a lintel under 1.75 m (no auto-crouch: Chaos Theory makes you crouch yourself) |
| 4 | Standing-up check is one ray from the capsule centre | Verify | At a duct mouth the player may stand while the front of the capsule is still under the lintel | Test in the greybox; if it pops, check four points round the capsule |
| 5 | Guards searching a last-known position inside a duct they cannot enter | Verify | A guard may stand at the mouth or fail to path | Test: get seen at a duct mouth, retreat inside |
| 6 | Nav layers: default 3 per column | **Done (D1, 2026-10-10)** | Area 1 has at most 3 (tunnel, lane, lean-to roof never overlap the tunnel). A block has basement, ground, first, second and roof over the same columns: 5 | `MapDef.navLayers` (Dead Line 5), passed to `buildNavGrid`; unit tests in `tests/nav.test.ts`; `level-design.md` Section 12 updated |
| 7 | Hold interactions with noise (manhole covers, gate padlock) | Built as a constant only | `HOLD_NOISE_RADIUS` 4 m exists; the hold runtime for these objects is mission-framework work | Already planned for the mission build |
| 8 | Nav sampler depth: `sampleLayers` casts from the top down to y -2 and stops above -1.5 | Limit (found at D1) | The tunnel floor (-4.4) and A block's basement (-4.0) are not on the guards' grid at all. No Area 1 guard goes below ground, so Area 1 is unaffected; Area 3's basement guards are | Cast down to the map's lowest level (a map value, like `navLayers`) before Area 3's build |

Not needed: an auto-crawl. The `Duct` anchor stays unused on this map.

## 5. Sizes this design uses

| Space | Clear size | Camera | Guards |
| --- | --- | --- | --- |
| Walk-in tunnel | 2.4 high x 2.6 wide (1.8 m walkway) | Normal | Could enter; none do (no keys) |
| Crouch duct, trench, subway | 1.5 high x 1.2 wide | Full boom to -10 deg | Cannot enter |
| Shafts | 1.2 x 1.2, ladder 0.5 wide | Ladder preset | n/a |

The scale sheet's duct row was changed from 1.3 x 0.9 to 1.5 x 1.2 (Michael, D0 approval).

## 6. How the numbers were made

A scratch script reproduced `ShoulderCamera.update`'s boom maths for a crouched player (pivot 1.18, height -0.08, boom 2.2 minus the sneak pace term, padding 0.16 along the ray, min boom 0.28, near plane 0.05, vertical FOV from 75 deg horizontal at 16:9) against a flat ceiling at 1.2, 1.3, 1.4 and 1.5 m and pitches +10 to -30 deg. It does not model the shoulder-swap arc, cover framing or springs (they only shorten the boom further). The rendered check (screenshots crouched in a 1.5 m and a 1.3 m test duct, level and at -10 deg) is pending the first greybox and runs on Michael's PC (`E2E_GPU=1`).
