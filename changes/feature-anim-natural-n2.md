# Wren's whole body moves with the gait (anim-natural N2)
kind: minor
- Wren's walk, jog, run, sneak, crouch walk, crouch run and the aimed glides now move the whole body (Michael: "All
  movements must move naturally with twisting/swaying/balancing"): the hips and shoulders turn against each other with
  each step, the hips sway over the standing foot, and the head lets a little of the chest's turn through and nods with
  the steps. Aiming, the hips swing under a steady chest and the head stays on the aim.
- Added on top of the keyed clips and Michael's key edits (never rescaling them), timed onto the gait phase: no pops at
  speed or stance changes, the same at every frame rate. Measured headless (pelvis / shoulders deg peak to peak): walk
  3 / 3 -> 8 / 8, jog 5 / 7 -> 12 / 16, sneak 2 / 2.4 -> 5 / 5.4, crouch walk 4 / 4.8 -> 8 / 8.8; walk hip sway 1.7 ->
  4.4 cm; aimed side-step counter-rotation -0.47 -> -0.99.
- The run no longer pops at each foot strike. The trunk keys (A1) no longer snap the hips ~21 deg twice a stride, and
  the arms no longer jump back to front in one frame (wrist 23.5 -> 6.5 cm per clip frame, peak 17.6 -> 5.5 m/s): Michael's
  2026-10-22 run tune moved the key timings but kept arm values keyed for the old spacing. Only the arm keys were
  retimed: his swing range and elbow bend are kept; the arms now ease out of each extreme and pass mid-swing about 3/48
  of a cycle later than his tune.
- Every Wren rig (the player, the co-op partner, the studio puppets walking a loop); guards are unchanged bit for bit.
  The amounts are per tuner body row (`BODY_MOTION` in `src/anim/bodyMotion.ts`); the stills come in a later step.
- The animation audit's walk sway limit for Wren is 5 cm (Michael approved ~5 cm; guards keep 3 cm).
- With the gun out (low ready walk / jog) the chest stays on the gun: the hips still swing under it, but the layer no
  longer turns the shoulders, which carried the gun arms out (low ready jog elbows 6.0 -> 5.7 cm outside the shoulder,
  limit 6; master's own reading). The low-ready head then follows only the keyed carry (1.1 deg peak to peak).
- Arms (step 3): Wren's walking arms swing wider (wrist range about 23 -> 30 cm), and turns and strafe starts no longer
  whip the hands (the jog 180 turn 14 -> 7 m/s): a per-gait arm gain and a wrist / elbow speed cap in the chest frame
  (the run's cap, 18 m/s, does not engage on its keys). Drawn (low ready) arms are unchanged. Anim Studio's loop player
  is never capped: its keyed loops play exactly as keyed.
- The walk's side-to-side weight shift peaks a little later in each step, with the same size (about 2.9 cm). The stance
  knee no longer bows out past the foot as the hip reaches its widest point (walk knee-out 3.4 -> 3.2 cm, limit 3.5).
- Crouched and still with the gun holstered, each palm now rests on the kneecap, slightly further forward than before. The
  right wrist no longer sinks into the right thigh (up to 2.5 -> 1.9 cm of overlap, limit 3).
