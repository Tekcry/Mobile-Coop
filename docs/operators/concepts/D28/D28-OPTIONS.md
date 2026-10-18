# D28 Rigid kit stays rigid - survey and options (scratch, 2026-10-17)

Method. The step 09 builders (chest_rig, waist_belt, leg_kit) were re-run on a scratch copy of
`build/operators/wren/wren-leg_kit.blend` with `KC.cbox` / `KC.tube` / `HC.rbox` wrapped (`measure.py`). For every
part the local design shape and the built world shape were recorded; bend = best-fit rigid alignment (Kabsch) of the
assembled item, max deviation in mm, plus the rotation between its two ends in degrees (`analyse.py`, `groups.py`,
`survey-raw.txt`). Weights = what `export_gltf.py` / `bake_lods.py` give today (each vertex copies the nearest body
vertex, up to 4 bones); "spread" = the largest change of any bone's weight across one item (0 = moves rigidly).
Renders: Cycles on the RTX 4090 (OptiX), clay look; red = the built item now, orange = true-size rigid block-in,
blue = the seat / mount that fills the gap between the straight item and the body (`opts.py`, `regions.py`).

## Root causes (all items)

1. **Shape**: `kit_common.cbox` maps every vertex of a part's local box through a conformal map of the surface
   (`HField` on a plate, `RingMap` round the hips or a thigh): u across, v up, h out. A straight box laid that way
   takes the surface's curvature in both directions (and is stretched where the map is not arc length: the plate
   map's v is z). Fine for soft carriers; wrong for anything hard. Hard parts built in one frame (`KC.frame` +
   `HC.rbox`, `mag_buckle.build`, `holster_shell`) are already straight.
2. **Skin**: every vertex takes the nearest body vertex's weights, so a hard part spanning a joint region is blended
   across bones and bends in animation even when its mesh is straight (the holster and buckles included).
3. **Size**: the step 09 magazines and knife are stubs: the rifle pouch is 75 mm tall (a real magazine is 178 mm),
   the pistol pouch 72 mm (real 128 mm), the knife 127 mm overall. Real sizes change where they can sit.

## Survey: every rigid item

Bend: max deviation from the straight design after best-fit alignment / end-to-end rotation. Weights: bones over 2 %.

| Item | Module.function (how built) | Where | Bend now | Weights now (spread) | Physical characteristics (real) | Draw / retention / must not snag or press | Cause and fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rifle magazines x2 (+ base plates) | chest_rig.build, `KC.cbox` on the chest plate HField | right of centre on the chest plate, stub z 1.25-1.29, pouch 1.185-1.26 | 4.0 / 6.8 deg and 3.7 / 4.2 deg on a 43 mm stub; pouches 9-14 mm | chest 0.98-1.0 (0.02) | 5.56 x 45 30-round: 178 mm overall, 62 mm fore-aft at the lips to 70 at the base, 24 mm thick; its own forward curve (base ~16 mm forward of the lip line); 0.49 kg loaded | support (left) hand grips the base plate, pulls along the mag's own curve, ~40 mm finger room, 180 mm clear path; shock cord / friction; must not press the bust (cannot lie straight on it), dig into the abdomen when crouching, or snag base plates on ropes | conformal map + stub size: rigid true-size magazine (keep its design curve), seated on a moulded saddle on ONE rigid plate, chest bone only; placement options R1-R3 |
| Pistol magazines x2 (+ base plates) | waist_belt.build, `KC.cbox` on the hip RingMap | left front belt, stub z 0.938-0.958, pouch 0.872-0.944 | 2.4 mm / 5.0-6.9 deg on 25 mm; pouch 4.7 mm | stubs pelvis 0.86-0.92 + hipL/chest <= 0.09 (0.06); pouch pelvis 0.63-0.92 / hipL to 0.37 (0.34) | 9 mm double stack: 128 x 34 x 24 mm, straight; 0.28 kg | left hand, pulls along its axis, ~30 mm finger room; must not jam the thigh at hip flexion (high step, crouch, rope climb) or press the hip bone | as above, pelvis only; options P1-P3 |
| Knife (sheath, guard, grip, pommel, release) | chest_rig.build, 5 x `KC.cbox` on the chest plate HField | left of centre, z 1.163-1.296, laid over the left bust slope | **15.5 mm / 38 deg** (sheath alone 7.6 mm / 25 deg, grip 21.7 deg) | sheath chest 0.97; grip chest 0.80-0.98, spine to 0.13, pelvis to 0.07 (0.18) | compact fixed blade: 85-95 mm blade, 90 mm handle (26 x 22), 190 mm overall in a 100 x 34 x 14 moulded sheath; 0.18 kg. Now 127 mm (about a 60 mm blade: a neck-knife) | strong or weak hand, drawn in its own line, positive sheath lock for inverted carry; grip must not catch rope or harness; cannot lie straight on a curved bust | conformal map: rigid knife on a sheath seat; options K1-K3 |
| Throwable sleeves x3 (2 oval canisters each) | leg_kit.build, `KC.tube` along a thigh-map axis (+ `ovalize`) | left front thigh, z 0.558-0.737 | sleeve axis bowed 6.2-8.2 mm over 181 mm (about 2 mm per 90 mm canister); caps straight | hipL 0.93-1.0, knL to 0.07, pelvis to 0.03 (0.07) | A63 game canisters: oval 25 x 18 x 90 mm, two end to end in a 30 x 21 sleeve, straight | left hand pulls each up out of its sleeve; shock cord over the cap; caps must not reach the hip crease when the knee rises (top 0.76 vs crease about 0.83: OK) | axis follows the thigh: straight sleeve axis per sleeve (or per canister), elastic and panel stay soft; hipL only; options T1-T2 |
| Drone pod (hard shell) | waist_belt.build, `KC.cbox` on the hip RingMap | rear-left hip (D25) | **11.7 mm / 32.9 deg** | pelvis 0.47-0.85 / hipL 0.11-0.53 (0.41) | hard polymer case 84 x 80 x 19 mm, latch and lid seal; about 0.25 kg | either hand behind the hip, latch; must not dig in when lying on the back or side, low snag profile when crawling | wrapped by the map: rigid shell on a saddle (or a fixed design arc); pelvis only; options D1-D2 |
| Medkit (tear-away pouch) | waist_belt.build, `KC.cbox` | rear-right hip (D25) | 11.6 mm / 34 deg (soft) | pelvis / hipR (0.42) | soft clamshell IFAK 90 x 72 x 16, soft contents (bandage, tourniquet) | pulled down by its strap | soft carrier with soft contents may wrap; skin pelvis only. If Michael wants a hard medkit case: as the pod |
| Radio module | chest_rig.build, `KC.cbox` on the back plate HField | back plate recess, upper left | 6.7 mm / 7.8 deg (mostly stretch: the map's v is z on a sloped plate) | chest 0.93-0.97 / shL 0.03-0.07 (0.06) | hard module 52 x 57 x 5.6 mm, never handled (knob, button) | flush in the plate | rigid module in a frame; the recess floor made planar in armour.py; chest only |
| PTT | chest_rig.build, `HC.rbox` in a strap frame (rigid) | left shoulder strap at the collarbone | 0 | chest 0.60-0.86 / shL 0.14-0.40 (**0.27**) | 23 x 18 x 9 mm, thumb press | clipped to the strap | shape OK; skin chest only |
| Holster shell, hood, release, pivot | leg_kit.holster_shell / holster_hood (one frame, rigid) | right thigh, game slot | 0 | hipR 0.95-1.0, knR to 0.05, pelvis to 0.03 (0.05) | moulded to the sidearm, 155 mm, 2.2 mm wall | right hand draws up along the slide | shape OK; skin hipR only (knee blend shears it) |
| Magnetic buckles (all straps) | mag_buckle.build in `KC.frame` (rigid) | belt, hangers, leg bands, shoulders, sides | 0 | belt 0.06; leg bands 0.04; hangers pelvis/hip **0.15-0.17**; shoulder 0.12-0.19; side 0.02-0.12 | 24-44 x 23-34 x 4 mm metal | one pull, silent | shape OK; one uniform weight per buckle (taken at its centre) |
| Gadget slot tab / cam pouch tab (metal) | `KC.cbox` on maps | upper right chest / left hip | 2.6 mm / 11.3 deg; 2.8 mm / 11.4 deg (12-13 mm parts) | chest; pelvis/hipL (0.00) | 12 x 7 x 2 mm metal tabs | flap closures | rigid frame; uniform weight |
| Gadget discs, cam / mine discs | `KC.tube` between two mapped points (rigid) | in their pouches | 0 | chest; pelvis/hipL to 0.21 | discs | in soft pouches | shape OK; uniform weight per disc |
| Rappel D-ring | `KC.tube` on a hip-map polyline | back centre of the belt | bow mapped through the hip map (25 mm wide, near-flat there: small) | pelvis 0.89-0.92, hipL/R to 0.09 | 2.8 mm steel wire D | flush in its tunnel | build the D in a frame; pelvis only |
| Sling socket ring / boss | `FT.ring` in a frame; boss `KC.cbox` (1.3 mm) | left hip | ring 0, boss 1.3 mm | pelvis/hipL (0.16) | metal QD socket | flush | boss in a frame; pelvis only |
| Chest plate | armour.build `plate_solid` (moulded design curve, built once) | chest | design shape (moulded composite) | chest 0.63-1.0, shL/shR to 0.31, spine to 0.23, pelvis to 0.14 (**0.37**) | 8 mm composite shell | n/a | shape is its design; skin chest only |
| Rib segments 1-3 | armour.build | below the chest plate | design shapes | rib 1 **0.70**, rib 2 0.45, rib 3 0.38 (chest / spine / pelvis) | 5 mm shingles on an elastic web | articulate between segments (realistic), never inside one | one bone or one fixed blend per segment (rib 1 chest; rib 2 chest 0.5 / spine 0.5; rib 3 spine) applied to every vertex |
| Back plate + weapon mount bar + keyhole sockets | armour.build | back | design shape | plate 0.24, bar 0.19 (chest / spine / shoulders) | 7 mm composite; gunmetal bar | the game's rifle hangs here | chest only |
| Goggle housing, lens, mounts | head_kit (rigid) | head | 0 | head 1.0 (0.00) | | | OK |
| Head battery pod | head_kit | back of the head | design shape | head 0.73-1.0 / neck to 0.27 (**0.27**) | hard pod | | head only |

Soft carriers that may keep wrapping (no change to shape): pouch fabric, panels, belt, bands, hangers, straps,
shock cord, cables, elastic sleeve fabric, the medkit pouch, the holster platform's back face.

## Decision groups

Seat gap = the largest distance between the straight item's back and the body under it (inner footprint, ray
spikes filtered): what a moulded seat / standoff must fill. Every option keeps the game's carry slots (holster hipR,
rifle on the back, pod rear-left, medkit rear-right, sleeves left front thigh).

### Rifle magazines (sheet `d28-rifleMags.webp`)
| Option | Placement | Seat gap | For | Against |
| --- | --- | --- | --- | --- |
| R1 | flat pair, vertical, on the sternum below the bust, side panel on the plate (30 mm proud) | 10-28 mm (top lifts off the plate's lower bust line) | the standard placard carry: left hand straight up, fast; slim; on one rigid plate | lower half rides over rib segments 1-2 and the upper abdomen (presses when crunched forward / crawling); needs the knife and gadget slot to move |
| R2 | flat pair, horizontal, two rows above the belt, bases to the left hand | 23-24 mm | nothing spans the waist fold; clears the chest for knife / gadgets | slow draw (pull sideways, turn 90 deg); 145 mm stack over the abdomen jams the plate bottom when crouching; heavy on the belly |
| R3 | vertical on the left front belt, tops at the belt | 31-35 mm | familiar belt carry | 178 mm bodies cross the hip crease: the thigh hits them at every high step, crouch or rope climb; displaces the pistol mags and cam pouch; fails "agile, climbing" |

**Recommendation R1**, mounted on the chest plate only (a moulded saddle bonded to the plate, the pouch's lower
half soft over the ribs), skinned to chest.

### Pistol magazines (sheet `d28-pistolMags.webp`)
| Option | Placement | Seat gap | For | Against |
| --- | --- | --- | --- | --- |
| P1 | vertical, left front belt (today's spot) at true 128 mm | 30-37 mm | no layout change | mags reach z 0.83 over the hip crease: thigh jams them; the pouch spans pelvis and thigh |
| P2 | horizontal on the left front belt, two rows, base plates toward the buckle | 24-25 mm (needs a straight rigid saddle on the belt) | no hip-flexion conflict, slim, pelvis only, chest stays clear | the two rows straddle the belt (72 mm tall); draw is a forward pull then turn |
| P3 | vertical on the left chest plate, base plates down | 8-25 mm | one rigid plate, quick left-hand reach, nothing on the hip | crowds the chest with R1 (needs the knife off the chest); near the bust |

**Recommendation P2** (pairs with R1: chest = rifle, belt = pistol).

### Knife (sheet `d28-knife.webp`)
| Option | Placement | Seat gap | For | Against |
| --- | --- | --- | --- | --- |
| K1 | same spot, straight, true 190 mm, inverted | 56 mm | no layout change | the spot is the bust slope: a straight knife stands 5-6 cm off it; not realistic |
| K2 | sternum centreline, inverted, right-hand draw | 23 mm | strong-hand draw, on one rigid plate | the sternum is R1's place (works only with R2) |
| K3 | left thigh, outer edge of the sleeve panel, handle up, left-hand draw | 9 mm | the flattest seat found; thigh = one bone (hipL); off the chest; the right hand keeps the weapon | weak-hand draw; sits beside the sleeves |

**Recommendation K3** (with R1 / P2). Michael to confirm the knife's size (true 190 mm vs today's 127 mm).

### Throwable sleeves (sheet `d28-sleeves.webp`)
| Option | Placement | Seat | For | Against |
| --- | --- | --- | --- | --- |
| T1 | same three sleeves, each a straight 180 mm axis (2 canisters) | the thigh bows 6-8 mm under 180 mm: a thin saddle in the panel | same look and count; elastic stays soft | slight air gap at each end (hidden by the panel) |
| T2 | one canister per sleeve, two rows of three (6 x 90 mm) | about 2 mm under 90 mm | follows the thigh closely | twice the parts and edges (snag on crawl), busier silhouette |

**Recommendation T1**. (The seat-gap numbers printed on this sheet's tiles were replaced by the line above: on the
thigh the ray probe hit seams and read 30-60 mm, which the renders do not show.)

### Drone pod (sheet `d28-pod.webp`, back views)
| Option | Shape | Seat gap | For | Against |
| --- | --- | --- | --- | --- |
| D1 | flat hard pod on a moulded saddle | 9 mm | literally straight; simplest rule and check | a flat case stands a little off the hip's curve |
| D2 | pod moulded to a fixed design arc (R 160 mm) | 11 mm | reads as a premium hip case | a designed curve could look "bent" to Michael's rule; the check needs a declared design mesh |

**Recommendation D1.** Medkit: keep the soft tear-away pouch (soft contents may follow the hip), pelvis only;
ask Michael only if he wants it hard (then as D1).

### No decision needed (fix only)
Radio (rigid module, planar recess floor), PTT, holster, buckles, tabs, D-ring, sling socket, plates and the head
pod: rigid shape where needed and the skinning rule below.

## Build plan: step 11b

1. **kit_common.py**: add `rigid(part, V, F, M, cu, cv, rot, carrier, bone, name)` - builds a design mesh in its
   own local frame and places it with ONE transform: frame from the map at the anchor, normal refitted to the
   supporting plane of the surface under the footprint (the seat fit in `opts.py place()`), lifted clear by the
   carrier thickness; returns the seat gap and builds a moulded laminate saddle under it when the gap is over 3 mm
   (soft side may follow the body, hard side flat). Records name, vertex range, design mesh, transform and bone in a
   `RIGID` registry written to the sim report / npz. Writes a per-vertex int attribute `rigid` (part id) on the
   output objects. `cbox` stays for soft parts only.
2. **chest_rig.py**: rifle magazines true size (178 x 62-70 x 24 with the design curve) per the pick, pouches re-cut
   to hold them; knife moved per the pick and true size; gadget tab and radio via `rigid`; PTT bone chest.
   **waist_belt.py**: pistol magazines per the pick (128 x 34 x 24), pod per D1/D2, cam tab, D-ring bow, sling boss
   via `rigid`. **leg_kit.py**: sleeve axes straight per sleeve (T1), knife K3 if picked, holster bone hipR.
   **armour.py**: radio recess floor planar; plates and rib segments get their bone (rule below).
   **head_kit.py**: pod bone head.
3. **Skinning rule** (`export_gltf.py` and `bake_lods.py skin()`): a vertex with `rigid` > 0 takes its part's single
   bone (weight 1.0) or its declared fixed blend, identical on every vertex of the part: chest kit, chest and back
   plates, radio, PTT, rib 1 -> chest; rib 2 -> chest 0.5 / spine 0.5; rib 3 -> spine; belt kit, pod, medkit,
   buckles on the belt -> pelvis; thigh kit, holster, sleeves, leg-band buckles -> hipL / hipR; hanger buckles ->
   pelvis; head hard parts -> head. Soft parts keep the nearest-vertex weights. `bake_lods.py`: every rigid part
   stays a separate piece below LOD0 (extends A77 from `harness polymer` to the `rigid` attribute), decimated on its
   own, skinned uniformly.
4. **New check `rigidKit`** (check_garment.py writes it, check.mjs reports it; thresholds in one table):
   (a) shape: each rigid part vs its design mesh after best-fit alignment, max deviation <= 1.0 mm (blend);
   (b) skin: in the hero GLB and every LOD, every rigid part's vertices share one weight vector (max per-bone
   spread <= 0.001) and use only its declared bone(s);
   (c) seat: no rigid vertex more than 0.5 mm inside the surface under it; a seat gap over 3 mm has a mount;
   (d) sizes: magazines, knife, canisters within 2 mm of their declared real dimensions.
   Pure logic (Kabsch residual, weight spread) in a Babylon-free module with Vitest tests.
5. **Rebuild**: chest_rig, waist_belt, leg_kit (and armour for the recess), `npm run operators:check`; then the
   step 10 LODs and bakes (`operators:lods`, KTX2 repack per D26/D27) and the step 11 sheets re-rendered
   (`operators:sheet -- wren`) on the GPU; `npm run check`.
6. Record in DECISIONS (D28 picks) and the LOG; the SPEC 5.1 and ART-DIRECTION 9.2 rows for the moved items.

## Files (scratch)
- Sheets: `d28-rifleMags.webp`, `d28-pistolMags.webp`, `d28-knife.webp`, `d28-sleeves.webp`, `d28-pod.webp`
  (rows: NOW, options; columns: front / side / 3/4; the pod sheet: back / side / 3/4 back).
- Data: `survey-raw.txt` (every part), `records.pkl`, `gaps-*.json`, `regions.json`.
- Scripts: `measure.py`, `analyse.py`, `groups.py`, `regions.py`, `opts.py`.
