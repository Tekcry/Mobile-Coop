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
- Crouch posture: on 507e671 (before this job's changes) the crouch back is near horizontal (about 80-90 degrees),
  far past CT's 40-55 (crouched wall) and CT Core's stated 34-39; reported to CT Core with the repro (posture is theirs).
  The back-mounted rifle goes horizontal with it (the e2e-weapons-carry crouch-walk failure).
- CT Core: the crouch angle is a bug (target 35-45 degrees on open ground), their P1b about 05:30-06:30 Sydney; the back-gun check is rerun after it.
- Slice 3, world grips (traversal contacts measured on Wren, scripts/anim-cleanup/traverse-shots.mjs): before, her palm
  was 74-91 mm off the ladder rungs and the drainpipe and faced away (62-167 degrees); 35-48 mm on ledges, pipes and
  ziplines. The attach grips now carry each hand's grip axis (rung and lip along the wall, drainpipe upright, pipe and
  zipline along their line, `hook` for a lip); a body with its own hands solves its palm onto it (palm on the grip's
  surface, fingers round it, hooked palm-down over a lip) with a non-allocating solve (handHold.holdInto). After: palms
  face their grips (0 degrees settled), the palm centre on the surface (ladder 28 mm = rung radius + palm depth by
  design); e2e-traverse reach 2.7 cm (pass; it measured the old hand-length placement, now rig.gripError).
  e2e-traverse "sprint climbs faster" is on CT Core's T1 stale list (G31 removed sprint moves).
- CT Core P1b also drops the wall-hand contact (arms hang, hands mid-thigh on the wall, per the footage).
- Slice 4, hand shapes: three more morph targets from the hero finger rig on all four Wren files (grip_morphs.py
  re-run on the exported files): `wrapR` (every finger round a rung, pipe, line or knife handle: the trigger shape kept
  its crooked index finger there), `relaxR` / `relaxL` (free hands lightly curled instead of the flat bind pose). The
  figure blends trigger / wrap by `rig.rightTrigger` and relaxed by (1 - grip).
- Independent check of the world grips: maths right, BLOCK on three: the targets were not on the real geometry (palms
  in the ladder rungs, 3 cm off the horizontal pipe), the ledge hand sank into the ledge at full reach, a stale grip
  axis leaked into door handles / a carried body / a choke.
- Fix round 1: each hand solves against the real geometry's point (attachGrips axisPoint from the anchor data:
  rung centre line, pipe and cable axes, the lip edge; a swinging ladder / drainpipe hand keeps its lift-off); the
  ledge hand pivots over the edge until the arm reaches; rungs take a fixed overhand grip (palm to the wall, knuckles
  up: picking it from the arm flipped the palm as the arm passed level); a grip's reach is capped at 96 % of the arm
  (a top rung no longer locks the arm, where the rate-limited elbow lagged); the grip axis is cleared on release and by
  every non-grip reach writer; holdInto tests and a 3-degree degenerate guard. Settled palms sit on the surfaces (skin
  0 mm; the shot script now measures against the anchor geometry). e2e-traverse reach 0.2 cm, with a two-frame settle
  window per plant (arrival + one body pull; documented in the suite).
- Rappel and fence audited (traverse-shots set-ups on Proving): the fence hands sit over the top rail (skin 0); the
  rappel hands were off the rope (70-104 mm, palms away): the rope is now the grip axis (harness to anchor, 12 mm), both
  palms on it (skin 0), feet on the wall. e2e-anim: the draw / holster continuity asserted (0.083 per frame).
- Full software-GL e2e on 31bf4f4: passing apart from suites on CT Core's T1 stale-assertion list from the
  ct-prototype merge (e2e-move gear 1 rocker, e2e-traverse / e2e-ct sprint moves (G31 removed), e2e-combat LB swap,
  e2e-mouse KBM verbs, e2e-modes / e2e-enemies / e2e-ct-warehouse prompt texts, e2e-stealth free orbit), the two that
  fail on master (e2e-kestrel, e2e-camera-bounds) and e2e-weapons-carry's crouch-walk back gun (CT Core's P1b crouch
  angle). The PR's full run follows those fixes.
- Merged CT Core's P1b (feature/ct-prototype 2b67c57): crouch 35-45 degrees, wall arms hang. One conflict
  (gameState.ts openLeft: F1a also put the weapon in the left hand on the left shoulder, local only): combined, their
  condition (left shoulder, not tied to aiming) with this job's gate (handSwitchOk) and wire bit. After it:
  e2e-weapons-carry passes (crouch-walk back gun bore up 0.59), e2e-clip and e2e-anim pass; crouch and wall sheets
  re-shot (natural crouch, arms hanging on the wall). tests/input.test.ts binding-table checks fail on
  feature/ct-prototype itself (their F1a controls in progress; no diff here).
- Merged CT Core's 939fc95 (the F1a binding table): all unit tests pass (1669).
- Merged CT Core's B3 (48aea54, protocol 17 = the held jammer): this branch's left-shoulder bit is now PROTOCOL_VERSION 18 (tests updated); unit tests 1686 pass.
- Merged CT Core's P1c (924b804d: no idle kneel, eased carriage hunch, crouch ready hands lowered); unit tests pass; crouch sheets re-shot. The crouched free-hand placement is on POLISH.md (offered to this job by CT Core).
- Crouched free hands (CT Core handed over READY_HANDS xCrouch / zCrouch / flexCrouch): xCrouch 0, flexCrouch 0.9 (elbow ~52 deg): the hands by the thighs just above the knees, not hanging ahead of them to the ground; the most bend that keeps the forearms clear of the thigh capsules (readyHands test cap 60). e2e-anim, e2e-clip, e2e-weapons-carry pass.
- Merged CT Core's B4 (7191d39, protocol 19 = the partner throw) and their hand-applied crouch hands (a498631): PROTOCOL_VERSION 19 here (17 jammer, 18 this branch's left-shoulder bit, 19 throw); tests updated; unit tests 1694 pass.
- Merged CT Core's B5 (e46a974, protocol 20 = the hang-down): PROTOCOL_VERSION 20 here; unit tests 1701 pass.
- Merged CT Core's B7 (403b287, protocol 22): PROTOCOL_VERSION 22 here (18 stays this branch's left-shoulder bit); unit tests 1721 pass (a first run under load timed out 4 tests at 5 s; the rerun passed). From here on feature/ct-prototype is merged once, in the finishing session.
