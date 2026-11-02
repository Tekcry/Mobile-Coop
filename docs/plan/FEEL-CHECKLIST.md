# Night Shift - feel checklist (Phase 3 sign-off)
Owner: the orchestrator. Status: current, provisional (N48): the targets are tuned by feel in Phase 3.

What Michael and his partner tick in the Phase 3 stealth gym, on the Mixamo character. The numbers are Chaos Theory
measurements from `docs/research/ct-movement/` (footage measured 2026-10-17): targets to tune by feel, not a copy
(C17). Low-confidence numbers are marked "rough". Each line: what to look for, then the target.

## Moving
- [ ] Speeds feel right at every stick position. Standing about 0.2 / 0.75 / 2.0 / 3.0 / 4.6 m/s (the run is rough:
      ±0.9); crouched about 0.4 / 0.85 / 1.5 / 2.1 / 2.6 m/s. (`ct-measure-speeds-stops-posture.md`)
- [ ] Starting is quick: lean within about 0.15 s, full speed in 0.4-0.5 s, first stride full length.
- [ ] Stopping is crisp: still in about 0.18 s from any speed, at most 0.25-0.35 m of slide from a run; feet stop
      mid-stride with no closing step, the torso settles about 0.15 s after.
- [ ] Turning: up to about 450 deg/s walking or crouched, a little less at a run; a 180 while moving off in about
      0.4 s; no spin on the spot from rest (a tight walking circle instead); a run reversal is one smooth turn of about
      0.7 s. (`ct-measure-turns.md`)
- [ ] Posture: standing upright (spine 3-5 deg forward), crouched about 40 deg with the gaze level, run lean about
      23 deg; idle breathing barely visible, no sway.
- [ ] Crouch toggle 0.2-0.25 s; roll about 0.75 s over 2.3 m into a crouch run.

## Camera
- [ ] Explore camera about 1.8 m from the head, about 2.3 m high, about 17 deg down, head top on the frame centre,
      slightly to one side; follows rigidly (no bob, no settle). (`ct-measure-camera.md`)
- [ ] Aiming: the camera moves in over the shoulder (about 0.4 m) with no zoom; in about 0.6 s, out in 0.5-0.6 s;
      shoulder swap about 0.4 s.
- [ ] Field of view: 86 horizontal (CT's framing; C9). FOV option works.

## Walls, doors, strikes
- [ ] Wall: snap into place in 0.3-0.45 s from about 0.5 m; slide about 0.35 m/s (rough); edge peek shows the head
      and shoulder 0.15-0.25 m past the corner; the camera swings out at corners in 0.3-0.4 s.
      (`ct-measure-walls-doors-combat-vision.md`)
- [ ] Doors open as far and as fast as the stick says (slow crack to about 200 deg/s); close in about 0.8 s.
- [ ] Strike: about 1 m reach, lands at about 0.15 s, one hit knocks out, free again after about 1.4 s.
- [ ] D28 answered (wall lean-out and turn-and-aim from a wall: keep or remove).

## Seeing
- [ ] Dark areas readable without night vision; lit areas clearly lit; the light meter and the guards agree with what
      you see (vision 3, 7).
- [ ] Night vision is for very dim spots, never blows out, grain about 1%.
- [ ] Thermal: heat-only, soft and blurred; D27 (through doors) and D29 (palette) answered.
- [ ] Vision modes switch instantly.

## Guards and bounds
- [ ] Hiding works: a guard who loses sight searches the last place he saw you, never where you are.
- [ ] No unexplained detection in 20 minutes of play.
- [ ] Nobody can climb out of the gym.

## Co-op
- [ ] Both players see the same thing on both machines (partner animations correct on the joining side).
- [ ] Partner colours told apart at about 20 m in the darkest spot.
