# CT movement prototype - plan (M20 pure CT, M21 desktop only, M22 playable first)

The next build. A PLAYABLE prototype of Chaos Theory movement, built fast, for Michael to play on the laptop before
any fine tuning (M22). Numbers come from Michael's CT footage (docs/locomotion/research/ct-measure-*.md, catalogue in
ct-footage-catalogue.md); where footage could not measure, the research files (ct-locomotion.md, SC1 numbers) fill in
and the value is marked "game value" in the log. Footage was mostly night vision (M24): poses, timings and camera
positions are reliable; colours and hand detail are not.

## How it is built (M22)
- One branch, feature/ct-locomotion. Branch guard and port rules as RULES.md (M9-M11).
- Build in 4 slices, each a commit Michael can play: P1 body, P2 camera, P3 wall and doors, P4 strike and vision.
  One implementer agent per slice (opus, ~100 tool calls), then a short check: `npm run check`, smoke + e2e-move +
  e2e-wall + e2e-netmove (port 4191), and a GPU look at contact sheets. NO anim-audit fix rounds, NO baseline work,
  NO metric polish. Tests that assert old speeds / timings / poses are updated to the new numbers, or marked
  "prototype: revisit" and skipped, never left failing.
- Co-op: remotes must still pose correctly from MoveState (D8); fine detail can wait.
- After P1 Michael plays (M20 Q12: "Also early, after the stop and posture step"). After P4 he plays the whole set.
  Fine tuning, the anim audit, perf budgets and the old step list (22b-34) resume only after he approves.
- Do not touch: kestrel files, src/editor, src/security, docs/kestrel. No Splinter Cell IP (mechanics only).

## P1 - Body: speeds, starts, stops, turns, posture (P1-P4 in PLAY-NOTES)
1. Speeds (M20 Q8: no sprint). 5 analog speeds standing and crouched, the stick picks the speed; D-pad up / down (wheel on KBM) steps the max speed cap, with NO on-screen indicator: remove the HUD gear pips (M25). Standing about 0.2 / 0.75 / 2.0 / 3.0 / 4.0-4.6 m/s,
   crouched about 0.4 / 0.85 / 1.5 / 2.1 / 2.6 m/s (+-20 %, ct-measure-speeds-stops-posture.md; the run is uncertain
   3.5-5: start at 4.2 m/s (SC1) and tune by feel). Remove sprint (L3 / gear 6) and its stop rules. Noise: slow notches
   silent, then rising (CT meter bands: 4 standing, 3 crouched).
2. Starts: the torso leans into the move within ~0.15 s, the first step is a full stride, full run in ~0.4-0.5 s.
3. Stops (M20 Q2): stick released at walk / crouch speeds = still in ~0.15-0.2 s, slide <= 0.3 m from a run, NO
   closing step: the feet freeze where they are mid-stride, the frozen split stance holds ~1.7 s, then blends to idle
   over ~0.3-0.4 s. Torso keeps its lean until the root stops, then comes upright over ~0.15 s. Moving again resumes
   from the held pose. Remove step 22's eased stop, closeStep, the 0.25 s stop spring and stopNoKneel workarounds as
   needed (3.2.0's frozen stop, docs/archive/ct-movement.md Phase 0, is the closest older code).
4. Turns (M20 Q7, ct-measure-turns.md): no stationary turn: any stick input walks, so spinning on the spot is the walk
   cycle on a tiny circle (radius <= 0.2 m, ~1 step per 90 deg, no pivot pose, no leg twist). Max yaw ~450 deg/s at
   walk and crouch, 300-400 deg/s at run; the flick 180 is one smooth ~0.4 s turn while the cycle keeps playing; the
   reversal at a run is one continuous ~0.37 s turn, speed dips and recovers ~0.3 s later: REMOVE step 22's
   brake / plant / pivot. The path follows the facing tightly (no drift). Bank ~10 deg into running turns, none at
   walk. Slowest speed: pulling the stick behind walks BACKWARDS (standing and crouched, M23) at ~0.5 m/s; faster
   speeds turn round (threshold angle ~135 deg, game value). Aiming: the body is locked to the camera.
5. Posture: standing spine ~3-5 deg forward, head ~5-10 deg down, knees straight, arms at the sides (elbow ~10-15
   deg). Remove the HUNCH carriage (spine +28.6 deg) and D5.6's forward carriage. Run lean ~23 deg. Crouch: hips at
   ~0.48 of standing height, head ~0.62, spine ~35-45 deg forward with the gaze level, front knee ~60-70 deg. Idle:
   breathing ~3 s cycle, < 1 cm, no weight shifts. Holstered arms stay as M14 (relaxed, swinging).
6. Crouch toggle ~0.2-0.25 s each way. Roll: from a run, crouch held, ~0.75 s, ~2.3 m, keeps speed, ends in a crouch
   run. Jump: standing 0.27 s wind-up, ~0.7 s air; walking no wind-up, ~0.5 s air (Y stays contextual where it is).

## P2 - Camera (P15, P16, P14; ct-measure-camera.md)
1. Explore: camera ~1.8 m from the operator's head, ~2.3 m high, pitched ~17 deg down, aimed at his head (head top at screen
   centre), lateral offset only ~0.1-0.2 m. Rigid follow: no lag, no settle, no bob. Lead room (M20 Q11): +-12-15 deg
   away from the travel direction, blended over ~1.0-1.2 s, exploring only.
2. Aim (rifle and pistol same framing): camera ~0.4 m from the head, 0.35-0.45 m behind, ~0.16 m to the weapon side,
   eye height; NO FOV zoom (drop today's x0.75). Raise ~0.6 s (pistol) / ~0.75 s (rifle with a body turn), the camera
   moves before the gun; lower 0.5-0.6 s, half the motion in the first 0.1 s. Turning while aiming slower (body
   locked to camera).
3. Shoulder swap while aiming (M20 Q1: this replaces wall shooting): 0.40 s pistol, 0.42-0.45 s rifle; the camera
   pulls back to ~0.85 m behind the spine and moves in on the mirrored side; the weapon crosses in front of the chest
   and reaches the new shoulder ~0.3 s in, two-handed mirrored grip (reuse D9's mirrored grips). MoveState carries
   the aim side (protocol bump). Prototype quality: no pop, hands on the gun; fine IK later.

## P3 - Back to wall and doors (P6-P10; ct-measure-walls-doors-combat-vision.md)
1. Remove (M20 Q1): the lean-out aim at wall edges, D9 / D10 side leans, the low-wall over-the-top rise, and the SWAT
   turn. Aiming on the wall LEAVES the wall (camera to aim view in ~0.27 s, rifle up ~0.4 s).
2. Entry: one button press; facing the wall the operator spins 180 deg in place in 0.3-0.45 s (no glide).
3. Stance standing (M20 Q3 says sideways; the footage shows CT standing is flat back, square to the wall): flat back
   square to the wall, chest ~10 deg forward, shoulders rolled forward, head off the wall, dropped and turned 45-70
   deg toward travel, knees 25-35 deg, feet 0.5-0.6 m apart, hands at mid-thigh. Crouched: sideways, torso turned
   60-90 deg toward travel, hip and shoulder on the wall, spine 40-55 deg forward, trailing knee near the floor, head
   ~0.9-1.0 m. (Michael confirms at the P3 play test whether standing stays flat as in CT.)
4. Slide: ~0.35 m/s standing (+-0.1), ~0.25-0.35 crouched, 1.1 s shuffle cycle, no lean.
5. Wall end: stop at the edge; peek = head turns 80-90 deg, head and shoulder lean out 0.15-0.25 m; the camera moves
   in 0.3-0.4 s past the corner line to ~1.0-1.5 m from the head and turns 40-60 deg into the hidden space; returns in
   0.25 s. Wall camera: on the room side facing the wall and the operator's front, whole body in frame.
6. Low cover: no special pose; crouch beside it, aim crouched (no rise).
7. Doors (M20 Q10): stealth open = the door angle follows the stick: slow push ~12-18 deg/s, fast up to ~200 deg/s
   (~75 deg in 0.75 s, drifts to 85-90); the operator steps to the latch side first (0.4-0.65 s) and keeps his palm on the door
   to ~65 deg; close camera at the crack while slow; back on the stick closes. Past ~15 % open the door passes light,
   sound and guard sight, and guards notice doors left open (host-owned angle in co-op). Normal open, optic cable and
   lockpick stay as they are for the prototype.

## P4 - Strike and vision (P5, P11)
1. Palm strike (M20 Q4 / Q4b): offered only with a guard within ~0.8-1.0 m in front; 0.10-0.15 s wind-up to contact,
   a 0.3-0.5 m lunge, one-hit knockout from any side (front: face, behind: back of the head); the guard is down
   1.2-1.4 s after contact; the operator is free ~1.4 s after contact (M25). No strike without a target.
2. Vision (M20 Q5 "CT-pure"): thermal = CT colour ramp (indigo background, blue rim, cyan, green, yellow, red core),
   the room nearly invisible at any range, people full brightness at 15 m with no fade, heavy grain only on warm areas
   (clean background), soft bodies with a blue glow. Night vision: green-grey, ~1 % grain, bloom on lights. EMF: flat
   navy, no grain, devices as white glowing blobs. Mode switch is an instant cut. Render only (perception unchanged).
   Thermal shows people behind closed doors as a dim blue silhouette (M25), never through walls.

## Answered (M25, 2026-10-17)
Thermal: CT colour ramp. Thermal through closed doors: a dim blue silhouette like CT (A26 reversed for doors). Leaving the wall: the button (or aiming) only, not pulling away. Wall stance: as CT (flat back standing, sideways crouched). Strike recovery: CT ~1.4 s. Run speed: start 4.2 m/s, tune by feel. Rocker kept as a max-speed cap without an indicator.

## Not in the prototype (later, after Michael approves)
Quick 180 as a separate move (the flick covers it), exertion breathing, guard body language, traversal polish,
contact IK, co-op body contact, the Wren model work (M18 still gates step 25), knife / interrogation / whistle /
ledge throw (backlog), anim-audit and metrics freeze, perf budgets (desktop, M21).
