# anim-natural - brief

Top priority (animation). Branch `feature/anim-natural` (C:/NightShift/Mobile-Coop-anim-natural, from master 4.48.0
ea3399ed) holds the docs; each slice works on its own branch from master and ships its own PR.

## The ask (Michael, 2026-10-22 ~09:00, verbatim)
"Can you proceed with these and I will fine tune? All movements must move naturally with twisting/swaying/balancing
hands and anything else that makes it believable and realistic. The feet also need to get fixed, it's especially bad
when jogging/running and turning at all but review everywhere. I want you to do a full pass over all animations and I
will fine tune. Pulling any weapons out also should be believable, and there's a random stop animation when taking out
the weapons before it ends up in its final position which needs investigating."
Context, from the same conversation: he had been hand-keying shoulder / waist / head twist per key ("Movement
twisting/shoulder/waist/head motion - I have been doing this using keys"), and "the legs are sticking to the floor when
turning and it's bad". The orchestrator's read of the feet: the planner keeps a planted foot locked until a twist cap or
full leg stretch, so on turns the legs wind up and the foot replants late (unverified).

## Goal
A believable, natural base for every animation that Michael then fine-tunes in the tuner. Every new control is a tuner
slider that bakes (the "every slider bakes" rule). Wren only; guards unchanged unless a slice says so. Realism standard:
bible 5.12.2; e2e-anim's metrics stay as guards (tighten where the pass improves, never loosen to pass).

## Slices
- **N0 audit (first, read-only + GPU sheets):** every Wren animation (the COVERAGE.md rows: stances, gaits, strafe,
  turns, starts / stops, crouch, walls, holds and carries, traversal, takedowns, co-op moves, draws / holsters, reload,
  hit, land): what looks unnatural (stiff trunk, no counter-rotation, dead hands, head bob, foot slide or stick, pops),
  with GPU contact sheets and the e2e-anim metrics per row. Output docs/anim-natural/AUDIT.md: a ranked fix list, each
  row tagged to the slice that fixes it. The orchestrator sends Michael the summary.
- **N1 feet (CT Core, footPlanner owner):** turning and stepping everywhere, worst at jog / run turns: a turn-step rule
  (yaw rate and accumulated twist trigger a step), the planted foot pivots on the ball before it lifts, no wind-up or
  late snap, no slide; starts, stops, strafes and crouch turns reviewed; Stepping sliders for the new rule.
- **N2 body motion layer (CT Core, after or beside N1 if the files part):** a procedural, phase-locked layer for every
  gait: pelvis / shoulder counter-rotation, chest twist against the swinging arm, lateral sway and weight shift, head
  stabilised to the view, arm swing balance, scaled with speed and stance; per-state sliders (amount, timing) that bake;
  his key edits keep composing on top.
- **N3 weapons (Menu Notes):** believable draw and holster for rifle and pistol (reach, grip, lift, settle); investigate
  and fix the "random stop" mid-draw before the final pose (a blend stall, a second target or a state hand-off); the
  same for swap and low ready to aim.
- **N4 the audit's remaining rows**, split by owner once N0 lands.

## Rules
One checker per slice, one fix round; full e2e on the laptop before each PR; GPU sheets before / after for Michael on
the desktop. Overnight approvals: build on best judgement and log assumed decisions with their undo.
