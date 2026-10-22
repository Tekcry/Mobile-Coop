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
- A1 (Michael, 2026-10-22 ~14:20, via the orchestrator: "Only fix it if it will result in a more believable,
  realistic, less rigid run"): the run's 50 deg "lag" is a key pop in his 2026-10-22 run tune (run.json key 0 pelvis
  yaw 25.5 / chest -26 vs his own keys at 0.0208 / 0.0625: 9.5 / -10, 0.5 / 7.5; with the mirror the pelvis snaps ~21
  deg in one clip frame twice a cycle). Fix on its own branch (`feature/anim-n2-runkey`, merged into N2 if kept): key 0
  to pelvis ~10 / chest ~-10.5, a Blender rebake, then judged before / after (GPU run sheet side by side, pelvis /
  shoulder p2p, wrist peak, no snap frames). Kept only if the run reads more natural and less rigid; otherwise reverted
  with the reason logged here. The before / after sheet goes in the PR. Undo: revert run.json and run.ts.
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
- A11 (job lead, step 2 fix round, CHECK-2 finding 1): the gated crab track and knee-out are read in the facing frame
  through the hip midpoint (a frame fix, as METRICS.md uses for turns: the body layer's added hip yaw must not rotate the
  measuring line); undo: back to the pelvis frame. Built as `src/anim/audit/crabFacing.ts` (N1's metrics.ts untouched),
  used by scripts/e2e-anim.mjs crabRow on every crabRecord row except the turn sub-states (turn round, 90 / 180 deg
  change: the root yaw sweeps ahead of the pelvis, they keep the pelvis frame) and the wall rows (no root yaw recorded,
  layer off); limits unchanged. With it the sway is cut to 0.7x (walk 1.4 -> 0.98, jog / sneak / crouch walk / crouch
  run 0.8 -> 0.56 cm; the run keeps 0.6) so the knee-out stays <= 2.9 cm.
- A12 (job lead, after the master 4.54.1 merge): master's Body base (#103, Michael's 2026-10-22 trackMul 0.05: the feet
  near one line) widens the knee-out on its own (walk 3.1, idle 3.4 cm headless), and master's e2e-anim widened its limits
  for it per row (BODY_GAIT walk 3.5 / jog 3.4, BODY_STATE straight 3.7 / idle 9.3, BODY_DRAWN rifle readyWalk 3.5 /
  readyJog 3.4 cm). tests/crabFacing.test.ts now checks the game (base + layer) against those same limits, read from
  scripts/e2e-anim.mjs (rows with no widened limit keep 3 cm), and the walk's sway is cut just enough for a ~0.1 cm
  margin: BODY_MOTION.walk.sway 0.98 -> 0.6 (headless facing knee-out walk 3.6 -> 3.41, walk 2.1 m/s 3.66 -> 3.47, low
  ready walk 3.51 -> 3.33 cm; walk lateral 3.6 -> 2.9 cm, e2e-anim's walk lateral band 3.2-4.2 -> 2.5-3.5 cm). Jog, run
  and crouch rows unchanged. Master's limits and the base table untouched. Undo: revert the A12 commit (sway 0.98, the
  crabFacing rows back on the audit limits, the lateral band 3.2-4.2).
- A13 (job lead, 2026-10-22 ~18:20, after the desktop e2e-anim "rifle low ready jog: elbows in" 6.0 cm vs limit 6): with
  the gun out the chest stays on the gun: bodyMotionStep scales the chest yaw by (1 - drawn) (PASS2 item 7's intent);
  the pelvis still swings under it. Headless low ready jog elbows 6.01 -> 5.69 cm (master 5.7), low ready walk 5.17 ->
  4.89; low ready walk shoulders = layer off (2.7 deg), head yaw 1.08 deg p2p (bodyMotion.test band 2-6 -> <= 2).
  tests/crabFacing.test.ts gates the elbow wing on low ready walk / jog at e2e's 6 cm. Undo: drop the (1 - drawn) factor
  (416184da).
- A14 (#138 fix round 4, 2026-10-22 ~23:30, after the GPU run of 362359a4: e2e-anim walk knee-out 3.5+ cm, e2e-clip
  crouched holstered -3.0 cm): the walk's sway 0.6 cm at 0.75 -> 1.2 cm at 0.98 (the same lateral, its peak a fifth of a
  cycle later, off the stance knee's widest bow; headless walk knee-out 3.44 -> 3.22 cm, lateral 2.88 -> 2.93 cm), and
  the keyed squat's palm on the kneecap (`KNEE_REST.fwd` 0.01 -> 0.03 m, the wall knee hand's value; headless crouched
  holstered -2.43 / -2.54 -> -1.87 / -1.92 cm). Undo: sway 0.6 / swayTime 0.75; KNEE_REST.fwd 0.01.
