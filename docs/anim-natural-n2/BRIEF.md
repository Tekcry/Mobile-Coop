# anim-natural N2 - body motion (brief)

Slice N2 of `docs/anim-natural/BRIEF.md` (on `feature/anim-natural`). Job lead: Night Shift | CT Core Build. Branch
`feature/anim-natural-n2` from master 4.53.0 (5220f79c), folder `C:/NightShift/Mobile-Coop-anim-natural-n2`. Own PR (minor).

## The ask (Michael, 2026-10-22 ~09:00)
"All movements must move naturally with twisting/swaying/balancing hands and anything else that makes it believable and
realistic." He had been hand-keying shoulder / waist / head twist per key ("Movement twisting/shoulder/waist/head
motion - I have been doing this using keys").

## Scope (orchestrator)
A procedural, phase-locked body layer for every Wren gait, additive on top of the keyed clips and his key edits:
trunk counter-rotation (pelvis / shoulders 3 / 3 deg walk, 5 / 7 jog; target ~8-12 / 7-10), the head following the
chest a little (0 now), arm swing growing with speed (~21 cm always now), wrist whip reduced (13-22 m/s in turns /
strafes), lateral sway and weight shift (Michael approved SWAY_MAX to ~5 cm), the drawn stills breathing and shifting
(low ready, aim, crouch aim are statues), the run pelvis "lag" (audit 50 deg). Per-row sliders (amount, timing) that
bake. Wren only: guards unchanged (their identity fixture stays bit-identical).

## Out of scope
Feet / footPlanner / tuneStep / turnFollow (N1), draws / swap overlay / armed arms (N3, Menu Notes), holds / carries (N4).

## Done when
- Measured before / after headless (sim time) per row: pelvis / shoulder p2p, counter-rotation correlation, pelvis
  lateral, head yaw / pitch, wrist range and peak speed (PLAN.md tables).
- e2e-anim metrics no worse (tightened where improved, never loosened); a new e2e-anim "body motion" block.
- npm run check, e2e-anim, e2e-studio, e2e-netmove on the desktop; GPU sheets before / after (E2E_GPU=1).

## Assumed decisions (job lead 2026-10-22, from the research; undo for each)
- A1 (NEEDS MICHAEL, via the orchestrator): the run's 50 deg "lag" is a key pop in his 2026-10-22 run tune (run.json key
  0 pelvis yaw 25.5 / chest -26 vs his own keys at 0.0208 / 0.0625: 9.5 / -10, 0.5 / 7.5; with the mirror the pelvis
  snaps ~21 deg in one clip frame twice a cycle). Fix: key 0 to pelvis ~10 / chest ~-10.5 and a Blender rebake. Not
  applied until he agrees. Undo: revert run.json and run.ts.
- A2: the sway lift is Wren-only, through the layer: SWAY_MAX and the guards' procedural clips unchanged; anim-audit's
  WALK_SWAY 5 cm for Wren only (Michael approved ~5 cm). Undo: sway amounts 0, WALK_SWAY back.
- A3: head: keep the world stabilisation, let 35% of the chest yaw through when moving and 0 when aiming, nod <= 1.2 deg
  p2p. Undo: headFollow / headNod 0.
- A4: the layer adds; it never rescales keys; trunkTwistMul / armSwingMul / headTurnMul stay (manual bake). Undo: amounts 0.
- A5: a new `motion` section ("Body motion", Weight tab) baking into `BODY_MOTION` code literals. Undo: drop
  tuneMotion.ts and its rule block.
- A6: every Wren rig runs it (player, partner, studio puppets). Undo: gate on the studio entry kind.
- A7: arm gain walk 1.3 / jog 1.6 over his tuned jog arms. Undo: 1.
- A8: wrist speed cap 6 m/s in the chest frame, keyed arms only. Undo: armSpeed at its maximum.
- A9: the 20 deg turn follow (PELVIS_FOLLOW_KEYED) stays N1's.
- A10: the stills breathe on the graph's random idleT clock (remote out of phase, as the idle already is). Undo: a fixed seed.
