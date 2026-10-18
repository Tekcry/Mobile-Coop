# Animation clean-up - log

- 2026-10-19 02:50 (Sydney): job set up after the weapons PR (#7); CT Core's posture fix merged in.
- 03:00-03:30: slice 1 audit (contact sheets on Wren, `scripts/anim-cleanup/sheets.mjs`, close views added to
  anim-sheet.mjs): the swap / draw / holster order was right but the gun stayed in the aim pocket (pitching up through
  her face) while the hand went to the slot, then teleported; the draw handed the gun to the palm by its grip; the
  support hand flailed; the reload has no magazine at all.
- Equip / holster rebuilt: the gun travels between the aim pocket and its mount on a path (WeaponModel.beginTravel /
  travel: beside the head over the right shoulder for the back, down the right side for the thigh), carried by the
  trigger hand on its grip; the empty hand goes round the outside of the body between slots; the support hand hangs
  relaxed; a holster reversed mid-way travels back. REACH back points moved to the back mount's grip.
- 03:30-04:15: reload with real magazines. The magazine is its own mesh (the pipeline tags `mag*` parts and writes
  `<id>-mag`; the pistol gained a magazine body inside its grip). The support hand grips it like a grip (palm on its
  left side), strips it at `magOut`, takes it to Wren's pouch (rifle: low on the chest plate; pistol: the left hip,
  its own clips) where it is swapped (`pouch`), brings it back and seats it (blended into the well, no snap); the empty
  reload then runs the left side charging handle (rifle) or racks the slide (pistol) with the hand on it
  (weapons.json `magHold`, `charge`, `chargePull`). Fingers stay closed on the magazine (`rig.holdingMag`). A reload cut
  short reseats the magazine.
- 04:15-04:35: shoulder swap (Michael: "shoulder swap should change weapon between arms/shoulders"): aiming from the
  left shoulder (G17, aiming only) moves the weapon to the left hand and shoulder through the rig's eased hand switch
  (the open-left wall edge's), the holds mirrored per hand; the partner sees it through ground mode's sub bit 128
  (PROTOCOL_VERSION 16 -> 17).
- Independent check of slice 1: right-shoulder handling believable; BLOCK on three edge cases no sheet covered: a
  reload from the left shoulder (magazine in the trigger hand), draw / holster / swap with the gun in the left hand
  (paths crossing her face), a reload cut short (magazine left in the hand). e2e-clip also found the back draw lifting
  the rifle through the back of her head (the trunk check then a pistol draw frame).
- Fix round 1: the weapon changes hands only settled in the aim pocket (no draw, holster, swap or reload in the left
  hand: the gun eases back to the right first, the swap waits for it); one `cancelReload` reseats the magazine for a
  swap, a stow and a throw; the back path steps out to the right of the spine before it rises (a cubic with TRAVEL_OUT),
  the thigh path comes up in front of the body; left-shoulder motion sheets (swapleft, reloadleft, holsterleft); the
  pistol report's holster fit restored (rebuilt with renders). e2e-clip head 2.1 cm, trunk -1.8 cm (pass).
- Baseline (507e671, before slice 1): e2e-move (gear 1 standing speed), e2e-combat ("LB swaps to previous weapon")
  and e2e-weapons-carry (crouch walk back gun bore) already fail there: from the ct-prototype merge, not this slice.
- CT Core (2026-10-19): e2e-move gear 1 and e2e-combat LB swap are stale assertions on feature/ct-prototype (their
  test slice T1); their controls slice F1a rebinds LB (tap swap, hold wheel), D-pad speed and the CT aim scheme (X
  draws, LT knockout). This job's travel follows the weapon's draw state, not buttons. F1a avoids a wire change, so
  PROTOCOL_VERSION 17 (ground sub bit 128) stays this job's; whoever merges second renumbers if needed.
