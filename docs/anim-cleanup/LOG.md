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
