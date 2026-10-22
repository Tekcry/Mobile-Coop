# anim-natural N1 - feet (brief)

Slice N1 of `docs/anim-natural/BRIEF.md` (on `feature/anim-natural`, e3a37ed5). Job lead: Night Shift | CT Core Build
(the footPlanner owner). Branch `feature/anim-natural-n1` from master 4.49.1 (dc4326a6), folder
`C:/NightShift/Mobile-Coop-anim-natural-n1`. Own PR (minor).

## The ask (Michael, 2026-10-22 ~09:00)
"The feet also need to get fixed, it's especially bad when jogging/running and turning at all but review everywhere."
"the legs are sticking to the floor when turning and it's bad".

## Scope
Wren's feet in `src/anim/footPlanner.ts` (and `src/anim/tuneStep.ts` for the sliders):
- A turn-step rule: the body's yaw rate and the planted foot's accumulated twist trigger a step, so a turn never winds
  the legs up and the foot never replants late with a snap.
- The planted foot pivots on the ball before it lifts (heel comes up and round first), no slide.
- Jog / run turns first (worst), then walk turns, turns on the spot, starts, stops, strafes, crouch turns.
- New Stepping sliders for the rule (tuner, per gait), identity defaults 1, and they bake (the "every slider bakes" rule).

## Out of scope
Body motion (N2), weapons (N3, Menu Notes), guards (they share the planner: guard behaviour may change only where the
same rule improves them; e2e-anim's guard metrics must not get worse).

## Done when
- Measured before / after (headless, sim time) on jog and run turns (45, 90, 180 deg, stick sweeps), walk turns, turns
  on the spot: planted-foot twist at lift, time a foot stays planted while the body turns, slide while planted, the
  snap (foot speed at the first swing frame), feet crossing; numbers in REPORT.md.
- e2e-anim metrics no worse (tightened where improved, never loosened); a new e2e-anim check for the turn rule.
- npm run check, e2e-anim, e2e-studio on the desktop; GPU sheets before / after (desktop, E2E_GPU=1); the laptop full e2e.

## N0 audit numbers (orchestrator, 2026-10-22; `feature/anim-natural` 720b1088, docs/anim-natural/AUDIT.md, metrics.json, GPU sheets in docs/anim-natural/audit/)
- Jog / run turns: the body turns 90 deg in 0.18 s on a planted foot; the pelvis trails up to 50 deg; the planted foot
  winds 19-25 deg and scrubs 4-9 cm (limit 1 cm).
- Walk / crouch turns: the foot winds 10-13 deg and scrubs 5-7 cm.
- Holds and carries: the feet slide 9-21 cm (the trunk moves as one block; the trunk part is N2, the feet are N1's).
- Left alone: side sway (SWAY_MAX, with Michael), N2's trunk / head / arms, N3's draws.
