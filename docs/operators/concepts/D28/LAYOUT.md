# D28 pass 2 - full layout and movement checks (scratch, 2026-10-17)

Method. Scratch copy of `build/operators/wren/wren-leg_kit.blend` (`wren-all.blend`). Today's rigid kit removed (first
pass regions), true-size straight block-ins placed with the first pass's `place()` (orange; blue = the seat that fills
the gap to the body; brown = soft). Garments copy the body's weights (nearest vertex); every rigid item is parented to
ONE bone, so it never bends. Four poses built on the rig (`layout.py`), each item measured against the posed body (per
region: torso, thighs, shins, arms), the other rigid items, the ground (prone) and the harness (rappel), plus a draw
check (9 rays along the draw path from the grip end, and free room for the hand). Cycles OptiX on the RTX 4090, clay.
Two variants: sleeves FRONT thigh (D25) and sleeves OUTER thigh. Pistol mags rendered at PA (10 o'clock); PB (9 o'clock,
horizontal) and PV (vertical, about 9:45) measured in the same runs, not rendered. A higher rifle pair (RH, +53 mm)
measured too.

Reading the numbers: linear-blend skin collapses at hinges in extreme poses, so a depth of -20 to -40 mm means "the
body part reaches the item" (contact), not a real depth. "-8 mm" is the sign floor for item vs item / harness: contact
or within 8 mm.

## Layout (as built in the block-in)

Blender frame: figure faces -y, its left is +x. Clock: 12 = belt front centre, 9 = left side.

| Item | Position | Orientation | Draw hand / path | Bone | Seat gap | Physical characteristics that drove it |
| --- | --- | --- | --- | --- | --- | --- |
| Rifle mags x2 (R1) | chest plate, centred pair x +-37 mm, z 1.02-1.20 (lips 80 mm above the belt top) | vertical, base plates UP, side panel on the plate | left hand grips the base plate, pulls up and 15 deg out | chest | 20-32 mm | 178 x 62-70 x 24 mm, own forward curve, 0.49 kg; on one rigid plate near the centre of mass; slim (24 mm) |
| Pistol mags x2 (PA, proposed) | belt ~10 o'clock (60 deg from front), rows z 0.89-0.92 and 0.93-0.97, in front of the sling socket | horizontal, base plates forward | left hand, pull forward along the axis | pelvis | 23-34 mm | 128 x 34 x 24 mm straight, 0.28 kg; a straight 128 mm body across the hip's tight side curve needs a thick saddle |
| Knife | left thigh outer-front (K3, -15 deg) | handle up, true 190 mm | left hand, straight up | hipL | 11 mm | 190 mm in a 100 x 34 x 14 sheath, 0.18 kg; flattest thigh seat |
| Throwable sleeves x3 (T1) | FRONT: thigh -100 / -72 / -44 deg; OUTER: -46 / -24 / -2 deg (knife then at +26 deg); z 0.56-0.75 | straight, caps up | left hand pulls each canister up | hipL | 13-15 (front), 10-14 (outer) | 2 x 90 mm canisters per straight 180 mm sleeve |
| Drone pod (D1) | rear-left hip on the belt | flat hard shell on a saddle | either hand behind the hip, lid out | pelvis | 9 mm | 84 x 80 x 19 mm hard case |
| Cam / mine pouch (soft) | moved from 10 o'clock to the old pistol spot (front-left, u 72 mm) | flat | left hand, flap | pelvis | soft | displaced by the pistol mags; it overlaps PA's lower row by ~14 mm |
| Medkit, holster, rifle mount | unchanged (rear-right soft pouch, hipR, back) | | | | | game carry |

## Pose checks

Poses: (a) prone crawl, left knee drawn up to the side (hip abducted 78 deg, externally rotated, knee 100 deg - the
inner knee on the ground, the outer thigh facing up); (b) climb, left knee to hip height (95 deg), arms overhead;
(c) deep crouch (thighs 20 deg above horizontal, trunk 30 deg forward, pelvis tucked); (d) rappel seat (hips 82 deg,
knees 55 deg, trunk back 20 deg) with leg loops, a belay ring and descender at the belt front centre, rope up-front and
the brake strand to the right hand.

| Item | Prone | Climb | Deep crouch | Rappel seat |
| --- | --- | --- | --- | --- |
| Rifle mags R1 | RED on the ground: 27-30 mm below the body line (lifts the chest 3 cm on a flat face); draw blocked (roll to draw) | clear | RED lips reach both thighs (contact) and the abdomen fold (-8 mm) | clear (12 mm from torso, amber) |
| Rifle mags higher (RH, measured) | RED 44-49 mm below (worse: the plate bulges higher up) | clear | RED thighs still reach them (-21 mm) | clear |
| Pistol mags PA (10 o'clock, horizontal) | clear of the body; face the ground, draw blocked by the ground | RED raised thigh jams both rows; hits the sleeves / knife tops; draw blocked | RED thigh jams the lower row; hits the knife and sleeve tops | RED thigh presses the lower row; draw blocked |
| Pistol mags PB (9 o'clock, horizontal, measured) | upper row clear; lower row RED pressed by the abducted thigh | clear | clear (upper row 3 mm from the flank, amber) | clear |
| Pistol mags PV (vertical ~9:45, measured) | front mag clear, rear RED thigh | RED thigh | RED thigh | RED thigh |
| Knife, outer-front (-15 deg, front variant) | clear | clear (draw path grazes PA) | RED hits PA, draw blocked by PA | RED top under the leg loop; draw blocked by PA |
| Knife, outer-rear (+26 deg, outer variant) | amber 7 mm from the folded shin | amber 7 mm from shin | RED blade tip into the calf (-10 mm) | RED top under the leg loop |
| Sleeves FRONT | clear (front of the thigh faces the head, not the ground, in a real crawl) | RED inner sleeve into the groin / abdomen (-25); tops hit PA; draws blocked by the body | RED inner sleeve into the abdomen (-24), next one (-7); caps hit the rifle mag lips; draws blocked | RED tops under the leg loop; draws blocked by the body / PA |
| Sleeves OUTER | clear | RED only against PA (tops hit it, draws blocked by it) | RED only against PA; 4-5 mm from a rifle mag | RED tops under the leg loop; draws partly blocked by PA |
| Drone pod | RED abducted thigh reaches it (-24, likely contact at the rear hip) | clear | clear | clear |
| Belt front centre (belay ring, descender, rope) | | | | clear of every rigid item |

Sleeves front vs outer: OUTER wins. Front sleeves (the inner one most) press into the groin / abdomen in the climb and
the crouch and block their own draw; outer sleeves touch nothing on the body in any pose - their only conflicts are
PA and the leg loop, both fixed below. Neither touches the ground prone: in a real knee-up crawl the hip turns out, so
the inner knee is on the ground, the outer thigh faces up and the front faces the head.

## Recommended changes to the orchestrator's layout

1. **Pistol mags: move them back to 9 o'clock (PB), not 10.** At 10 o'clock (PA) the raised thigh jams them in the
   climb, crouch and rappel, and they block the thigh kit's draw. At 9 o'clock they clear every pose except the lower
   row in the prone knee-up. So: horizontal at 9 o'clock with the rows raised about 20 mm (lower row bottom at the
   belt's lower edge, z 0.91 or higher). Two problems for Michael: (a) 9 o'clock is the game's compact-gun sling slot
   (D25 keeps it clear, the socket at u 224 mm): the socket must move behind the mags (about 8 o'clock) or the mags
   cannot go there; (b) a straight 128 mm mag across the hip side stands 36-37 mm off the body at its ends: a thick
   moulded saddle (the blue wedge). Vertical mags (PV) fail every flexed pose.
2. **Sleeves on the OUTER thigh, knife on the outer-FRONT (-15 deg, K3), sleeves just behind it.** The outer-rear knife
   spot (+26 deg) puts the blade tip into the calf in a deep crouch. Packing: knife at about -60 deg (outer-front, the
   draw stays in front of the hip), sleeves at -35 / -13 / +9 deg - or keep the knife at -15 and run the sleeves
   +5 / +27 / +49 deg; check the rear one against the calf in 11b.
3. **Thigh kit tops lower by 40-50 mm if a seat harness is ever modelled.** Leg loops sit at z 0.70-0.74; the knife
   pommel (0.741) and sleeve caps (0.754) sit under them. Today Wren has no sit harness (waist_belt.py: "No sit
   harness, leg loops"; the rappel D-ring is at the back centre), so this is a note, not a change. If loops are added,
   lower the thigh kit or shorten the sleeves (one canister per sleeve).
4. **Rifle mags: keep R1 low** (lips at z 1.02, 80 mm above the belt). Higher is worse prone (44-49 vs 27-30 mm lift)
   and still meets the thighs in a full squat. Contact with the thighs only happens in the deepest crouch; 11b checks
   it against the game's real crouch clip. Prone, any chest mag is the support point; draw needs a roll (normal).
5. **Drone pod: 20-30 mm higher (top above the belt) or 10-15 mm further back,** so the knee-up crawl does not bring
   the rear thigh into it.
6. **Cam pouch:** wherever it goes, not under the pistol mags; the old pistol spot (front-left) works once the mags
   move to 9 o'clock.

## Files
- Renders: `layout-front-PA-rest.webp`, `layout-outer-PA-rest.webp` (front, left, right, back, 3/4 front);
  `pose-{front,outer}-PA-{prone,climb,crouch,rappel}.webp` (2 views each; red = interference, amber = tight).
  Tiles in `tiles/`.
- Data: `results-front-PA.json`, `results-outer-PA.json` (every item, region distance, item, ground, harness and draw
  numbers, rest and posed). Script `layout.py` (`blender -b wren-all.blend --python layout.py -- <front|outer> <PA|PB|PV>`),
  `summ.py`.
