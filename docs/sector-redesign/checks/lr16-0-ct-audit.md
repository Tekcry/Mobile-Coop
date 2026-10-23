# LR16-0 - CT light and shadow audit (Opus, draft 1)

Michael ~18:15: "I want to make sure we emphasis the light/shadow system like chaos theory did, like a showcase no matter
where you look." Michael ~18:20: guard torches still show through walls / doors and need soft edges.
Code read: `C:/NightShift/Mobile-Coop-sector-redesign-lampx` head 1c22b913 (Realistic falloff, shadow accuracy, LR14
character shadows, LR15 torches / 8 door slots, paged atlas). Read-only on code. G6: CT named as the reference only; no
reference-game character, gear or organisation names below.

Sources (cited as file:line): `docs/ct-research/design-kit-digest.md` (DK), `docs/ct-research/moves-mechanics-digest.md`
(MM), `docs/ct-research/kit-design-digest.md` (KD), `docs/ct-research/levels-digest.md` (LV),
`docs/research/night-vision-and-lamps.md` (NV), `docs/lighting-review/PROPOSAL.md` (PR), `docs/systems/lighting.md`
(SL), `checks/lr16-plan.md` (LP). Code paths are under `src/` in -lampx.

## Headline

CT's light is a gameplay surface first: clear pools and clear dark (DK:273), almost every light can be shot, switched
or held off (MM:463), guards come to fix a dead light (MM:464, KD:305), each player reads his own meter (MM:461). Our
model already matches the parity half (one formula for picture, meter and guards). The showcase half has five large
gaps:
1. No bounce: walls lit by N.L of the direct term only, ceilings black (PR:268-270).
2. No per-view framing rule or check that every view holds a pool and a dark; the darkness curve crushes the
   between-pool tails (PR:265-267).
3. Guard torches leak through walls / shut doors outside the 2 shadow-mapped ones, and have hard rims (LR16t, LR16b).
4. Cone rims and wall arcs are hard (Michael 18:08; LR16b-d).
5. Nothing in the world moves its light: no swinging, flickering or relit lamps; guards never relight
   (`game/isolators.ts:98`), so shadows only move when characters do.
Plus one tier gap: on Low / Medium (likely the laptop's default) character shadows are capsule blobs, not shapes.

## Gap table

| # | Feature | CT behaviour (source) | Ours (file:line) | Gap | Slice / fold |
|---|---|---|---|---|---|
| 1 | Character shadows from key lights | Lamps nearest the player throw the real shape of guard / partner (SL:124-126 "as in CT") | LR14 `world/charShadows.ts`; `world/charShadowSet.ts` `CHAR_SHADOW_PRESET`: High 2 x 512, Ultra 3 x 1024, Epic 4 x 1024; Low / Medium 0 slots = capsule blobs; meter has none by design (SL:147) | small at High+, large at Low / Medium | LR16-7 (new); softness LR16f |
| 2 | Prop / door shadows | Scenery shadows in every pool; "move in shadow" (LV:224, LV:250) | Static dressing >= 5 cm baked (`voxel/lightShapes.ts`, SL:27); char casters exclude props (`world/charShadows.ts:143`); an open door leaf casts nothing from lamps, only shut doors cut a lamp (`world/lightField.ts:28` `DOOR_SHUT`, `:411`) | medium | LR16-3 (new) |
| 3 | Shadow length / direction read | Shape shadow points away from its lamp, longer further out | Per-slot spot maps (`fitCone`), moon cascades (`world/world.ts:113`); 2x2 PCF, no contact hardening | small | LR16e, LR16f |
| 4 | Cone and spill shape | Pools with soft rims; no visible beam in clean air (NV:71-77) | Cosine cone cut hard at the outer angle (`world/lampMath.ts:80` `lampCone`); hard wall arcs (LP diagnosis) | large | LR16b (feather), LR16c / d (placement) |
| 5 | Bounce / ambient on walls and ceilings | Real rooms return 1/5-2/5 of direct light to walls and ceiling (PR:268-270); CT digests silent | Walls N.L only; ceilings none (hemisphere stops 3 deg short, `world/lampMath.ts:11`); fill = flat zone ambient (`world/ambientGrid.ts`) | large | LR16-1 (new) |
| 6 | Dark-by-default framing | "Light is staged like a theatre (clear pools, clear dark)" (DK:273); every critical-path lit area darkenable (DK:363 F3) | `world/darkCurve.ts:39` `DARK_DESKTOP`: 0.186 -> 0.056, near black (PR:265-267); no per-view check | large | LR16-2 (new); level LR16g |
| 7 | Shootable lights | Lampposts, chandeliers, room lights shot out (KD:82, LV:224, LV:247) | `game/stealthSystems.ts:528` `shootLight` (sparks, noise, guard sent; bark `ai/barks.ts:63`) | none | GPU sheet only |
| 8 | Switchable lights | Wall switches kill hall lights (LV:226, LV:230) | switches + isolators (`game/isolators.ts`, `game/ctDevices.ts:890`) | none | - |
| 9 | Hold-off (jammer) | Hold one light off while the partner passes (MM:227-238) | jam bits + flicker `world/lights.ts:111`, `:201` | none | - |
| 10 | Guards fix dead lights | Guard leaves the office to switch the hall lights back on (LV:230, KD:426, MM:464) | guard comes to look (`ai/enemy.ts:913`) but never relights: `game/isolators.ts:98` | medium | LR16-4 (new) |
| 11 | Moving / flickering lights | Not in the CT digests; CT solo had lightning windows (MM:465) | `world/lights.ts:11` `LightKind` has no moving lamp; motion lights decided, not built (SL:23, G47); `fire` (`world/maps/refinery.ts:331`) has no flicker; no lightning | large (showcase) | LR16-5 (new, Michael decides scope) |
| 12 | Guard torches: occlusion | Torches are the guards' search tool (MM:506); light stops at walls | 2 shadow-mapped torches correct (`world/lightRig.ts:412` `torchShadowPass`); the rest `LAMP_TORCH` reach cut (`world/bakedLamps.ts:908`, `:1092`): leak past corners, < 1 m sliver behind walls, no shut-door test | large | LR16t |
| 13 | Guard torches: beam softness | Soft pool rim | same hard cone as lamps (`lampCone`) | large | LR16b |
| 14 | Guard torches: character shadows | Torch throws the body ahead of it | only the 2 shadow-mapped torches cast characters | medium | LR16t (acceptance item) |
| 15 | Volumetric beams | Visible shaft only in haze / dust (NV:76) | `vfx/volLights.ts`: long beam for torches / floods, short haze under fittings (SL:181-183) | none | GPU sheet only |
| 16 | Night vision | Fixed-angle halo, bloom, auto-gain (NV:21-45) | `vfx/nightVision.ts`, `vfx/nightBloom.ts`, `vfx/nightAutoGain.ts` (SL:185-211) | small: 0.2 s flip vs G100 instant cut (SL:211) | LR16-6 (new) |
| 17 | Thermal / electro | Thermal shows the live wire, bodies behind doors (KD:144, MM:520) | `vfx/visionLook.ts` (SL:213-218); G102 dim silhouette through shut doors not built (SL:17) | small | LR16-6 (new) |
| 18 | Light meter feedback | Own meter per player; far left = invisible; the meter decides (MM:461-463) | `game/gameState.ts:1547` `bodyLevel` -> `ui/hud/hud.ts:344` `setLight`; parity rule fixes CT's readability gap (MM:467) | none; LR16b / e / 1 must feed the field too | parity probe in each slice |
| 19 | Partner beacon light | Per-player goggle lamp, readable at ~20 m in the darkest zone (DK:275, DK:532) | `player/goggleGlow.ts`, emissive only (SL:220) | small (no 20 m test) | LR16-8 |
| 20 | Lit windows both ways | D-21: a lit window exposes anyone in it; dark rooms hide (MM:468, DK:458) | `LightKind` 'window' exists, no map uses it; moon through openings baked (`voxel/skyBake.ts`) | small (level design) | outside LR16 |
| 21 | Cameras beaten by dark / glare | DK:183, KD:147 | security gameplay, not audited here | n/a | - |

## New slices

- **LR16-1 one-bounce fill** (Opus). Files: `src/world/ambientGrid.ts` or new pure `src/world/lampBounce.ts`,
  `src/world/lightBake.ts`, `src/world/lampMath.ts` (upward share for ceilings). Per lamp, splat a low-frequency
  indirect term into the 1 m ambient grid: about 0.25 x the lamp's lit floor irradiance into the wall / ceiling cells
  its pool sees (baked visibility), plus a small upward lobe so the ceiling over a pendant is not black. A switched,
  shot or jammed lamp drops its bounce (per-lamp bounce weight in the data texture, or per-group grid layers). Parity:
  the field already reads the grid trilinearly, so meter and guards follow. Acceptance: wall 1 m from a pool >= 0.2 x
  the pool floor level; ceiling over a lit pendant > 0; dark rooms stay under the shadow line; a shot lamp's bounce
  goes with it; parity probe passes; bake time and MB logged. GPU: wall + ceiling in campus S1, warehouseOps Goods-in
  Bay, ctcourse station 2, before / after. After LR16b, before LR16g (g re-levels with bounce in).
- **LR16-2 showcase framing audit** (Opus writes, Haiku runs). Files: `scripts/lamp-audit.mjs` extension or new
  `scripts/view-audit.mjs`; output `checks/lr16-view-audit.md`. Per map, a grid of player spots x 4 yaws; from the
  field's levels on visible floor / wall points report the share lit (> 0.45), dim and dark (< 0.28). Flag views with
  no pool ("nothing to read") or no dark ("nowhere to hide"). Acceptance: table per map; flagged views go to LR16d as
  lamp moves, added pools or trimmed spill. GPU: none (CPU); LR16-8 sheets confirm. Folds into LR16c (same script
  family, same runner).
- **LR16-3 dynamic occluders** (Sonnet). Files: `src/world/charShadows.ts` (caster list: door leaves and movable props /
  carried crates within a slot's reach); `src/world/lightField.ts` only if Michael wants the field to see an open leaf
  (render-only first, as LR14). Acceptance: an open door leaf throws its shape from a mapped lamp; a pushed crate's
  shadow follows it; shader textures <= 16. GPU: a door at 90 deg under a lamp, every map with doors.
- **LR16-4 guards relight** (Sonnet, guard-ai files). Files: `src/ai/enemy.ts`, `src/game/isolators.ts:98` (wire the
  relight sink), `src/game/stealthSystems.ts`. A guard sent to a switched-off group walks to its switch / isolator
  and turns it on after his look; a shot lamp stays dead (`isolators.ts:172`). Acceptance: switch off a hall, the
  guard relights it; the lure ambush works (LV:230); co-op host-authoritative. GPU: relit pool appears and the char
  shadow slot picks it. Gameplay, may ride outside the LR16 train.
- **LR16-5 moving lights** (Opus; Michael decides scope). Files: `src/world/lights.ts` (swing / flicker state, driven
  in the registry as the jam is, `lights.ts:201`, so the meter follows), `src/world/charShadows.ts` (a swinging lamp
  holds a slot), `src/world/bakedLamps.ts` (shader evaluates the lamp at its swung position; visibility stays the
  rest-pose bake, error acceptable for < 0.3 m swing). Uses: a hanging pendant sways when shot near or bumped; fire
  flickers (`refinery.ts:331`); a failing tube stutters. Acceptance: one sway, one flicker, one stutter per main map;
  meter tracks the flicker; frame time within budget. GPU: sway on warehouseOps and campusOps.
- **LR16-6 vision polish** (Sonnet). Files: `src/game/vision.ts`, `src/vfx/cinematicPost.ts`, `src/vfx/visionLook.ts`.
  G100 instant cut (drop the 0.2 s flip); G102 thermal dim silhouette through shut doors. Acceptance: unit
  (`tests/nightVision.test.ts`), `scripts/e2e-darkness.mjs`. GPU: thermal behind a shut door.
- **LR16-7 character shadows on every tier** (Opus). Files: `src/world/charShadowSet.ts` (`CHAR_SHADOW_PRESET`: Medium
  1 x 512, Low 1 x 256, nearest lamp only, every 2nd frame), `src/world/charShadows.ts`. Acceptance: on the laptop's
  default tier a guard under the nearest lamp throws his shape; frame p95 within the governor budget; textures <= 16
  (`scripts/e2e-lightbake.mjs`). GPU: char shadow at 1 m / 4 m on Low and Medium. After LR16f (same files).
- **LR16-8 showcase sheets** (Haiku, laptop). The sheets below plus a 20 m partner-beacon read in each map's darkest
  spot (DK:532). Extends LP "Laptop GPU checks" item 2.

Folds into existing slices: torch occlusion for all 4 slots + torch character shadows (rows 12, 14) -> **LR16t**;
torch and lamp cone feather (rows 4, 13) -> **LR16b**; contact hardening (row 3) -> **LR16e / LR16f**; wall arcs from
placement -> **LR16c / LR16d**; between-pool level (row 6) -> **LR16g**, after LR16-1.

## GPU sheets per map ("showcase no matter where you look")

Maps: campusOps (Workshop + S1..S5), warehouseOps, ctcourse, and every `LISTED_MAP_IDS` map (`world/maps/listed.ts:6`:
warehouse, proving, kestrel, campusOps). Realistic only; character shadows Auto on the laptop tier, then Epic.
1. 4-way spin (N / E / S / W) from 3 fixed spots per sector: each frame holds a lit pool and a readable dark.
2. Wall behind a lamp (arc check) and the ceiling over it (bounce, LR16-1).
3. Character at 1 m and 4 m from the nearest lamp: shape shadow, direction, sharp feet, soft head.
4. Crate / rack contact shadow and an open door leaf under a lamp (LR16-3).
5. Guard torch behind a wall, behind a shut door, round a corner; 4 torches on at once; soft rim (LR16t / b).
6. Shot lamp and switched-off group: pool and bounce go, meter drops; guard relight (LR16-4).
7. Night vision and thermal in the darkest room: halo, auto-gain, thermal through a shut door (LR16-6).
8. Partner beacon at 20 m in the darkest zone.
9. One moving light (sway / flicker) if LR16-5 is in.
10. Meter vs shader readback at 5 seeded points (parity probe, LP item 3).
Count: campusOps 6 sectors x 10 = 60; warehouseOps 10; ctcourse 10; warehouse 10; proving 10; kestrel 10 (110 shots).
