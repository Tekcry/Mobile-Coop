# Cover and combat around cover
> Status: scheduled for removal in Phase 3 (back-to-wall replaces it - bible 5.3). Do not extend.
Purpose: the player's snap cover (faces, state machine, controller, prompts) and the combat-around-cover rules.
Design authority: docs/design-bible.md (Section 5.3)

## Cover (`src/cover`)
- `buildCoverSegments(boxes, cylinders)` (called by `LevelBuilder.build`) makes a face per side of every upright,
  visible, colliding piece >= 0.75 m tall: low (0.75-1.45 m, crouch) or high (>= 1.6 m, standing); pillars become
  octagons. Faces carry outward normals, depth and outside-corner links. AI cover points
  (`level.cover`) are sampled from the same faces; enemies peek past the nearest edge of high cover.
- Run-time probing (raycasts) re-checks the real cover height (stacked crates, slopes), the snap point (floor,
  clear path), inside corners/narrow gaps, vault landing, corner swings and that the surface still exists.
- `CoverStateMachine`: none -> enter (glide) -> in <-> peek (aim) / blind (fire without aim) / corner (the cover
  button while pushing against an outside edge, `cornerPush`; never automatic; 0.5 s swing; afterwards the
  still-held stick is not "away" until released) ; vault (traverse at clear low cover) ; dash (cover or sprint with a
  marked target; a push back against it for ~0.15 s cancels) ; exits on cover with no target, sprint with no
  target, traverse at high cover (traversal may then mantle via `exitDir`), a firm push away (sticky: `away >
  0.75` for `AWAY_TIME` 0.25 s), lost surface, death. Crouch never leaves cover: it toggles standing / crouched
  at high cover (`highCrouch`; low cover is always crouched).
- Side-on: the body faces along the face (`faceDir`), shoulder to the wall (`wallSide`); reversing direction is a
  turn-and-swap (`SWAP_TIME` 0.3 s, `swaps` counter); kneels at low cover when still. Snap from up to `SNAP_REACH`
  3 m: a Hermite glide carrying the approach velocity, 0.25-0.42 s by distance (`GLIDE_MIN/MAX`), a slide when
  sprinting. Peeks (`peekKind`): over low cover, or round an edge of low (aiming past it) or high cover, standing
  or crouched, leaning in place (capsule stays in cover). Pushing into an inside corner turns onto the adjoining
  face. `target` (5 Hz, and the moment the stick is pushed / released) is the cover-to-cover destination only on
  intent: the stick held towards it (> `TARGET_STICK`) AND the view looking at it (`TARGET_LOOK_COS`, ~50 deg)
  (routed via a waypoint past the current face's end when the straight line is blocked), or a SWAT turn (low,
  `SWAT_SPEED`) to collinear cover beyond a gap; pushing towards a marked target never counts as backing out of
  cover; the marker is a world prompt on the target.
- `CoverController` (player): standoff `COVER_STANDOFF` (capsule radius + 5 cm, > body depth); strafes along
  the tangent with predictive braking, stopping `EDGE_STOP` 0.45 m short of an edge (peeks / step-out go on from
  there); low cover hides (the rig's `lift` ducks until the head top is
  `HIDE_MARGIN` 7 cm under `coverTop`) and the over-peek stays crouched (`aimOver`: back straightened, weapon at
  the cheek, rising until the eye is `OVER_EYE` above the top, side-on until `rig.overClear`; camera eye >= top + `COVER_EYE`);
  `aimLimit` (`cover/coverAim.ts`, pure: edge / over / wall arcs, pitch floor over low cover) clamps the camera
  so every aimable angle shoots clear, and fire waits until the weapon is out (`player.coverFireBlocked`); while
  the view eases into the arc the body holds side-on with the weapon tucked; edge peeks step out past the edge as
  far as the predicted line of fire needs to clear the cover (`stepOut` <= `STEP_OUT_MAX` 1.4 m along a path round
  the corner, `stepPoint`: along the face, round the edge on the standoff circle, along the side; `neededStep`
  checks the fire line and that the path is free; `EDGE_BACK` lets the aim come 0.7 rad back across the cover), the body
  stays side-on facing the edge and the weapon tucked (`pose.gunClear` -> graph `peekClear`) until the line is
  clear, then turns to the aim; every turn in cover is measured from a safe centre and never wraps through its opposite (side-on / tucked:
  via facing away from the wall, never through it; turning to the aim: within the aim arc), so quick aim and
  direction changes never spin the body; already facing across low cover it leaves the short way; edge peeks lean out past the edge and
  move the camera to that shoulder (restored after); the head leads and the weapon is out in ~0.2 s; at a left
  edge the weapon changes hands (`HAND_SWAP_TIME` 0.18 s, `rig.leftHanded`) before the lean; leaving pushes off
  (`EXIT_PUSH` 0.9 m/s over 0.45 s); blind fire = spread x3 and minimal exposure. Moves are played big (film):
  `COVER_ENTER` slams in with `cam.impact` by approach speed, `COVER_TURN` ducks through turn-and-swap and corner
  swings (`pose.turn`), `COVER_EXIT` pushes off.
  Exposure is physical: the hit volumes follow the posed rig (ducking lowers them); enemies seeing only the
  head aim at it (`Damageable.headPoint`).
- Input: cover is manual only (no auto-snap): action `cover` = controller A, keyboard Space or a tap on the
  take-cover / cover-to-cover / corner prompt; leaving is the cover button (no target) or a firm push away. `dash` (sprint) = L3 / touch sprint button (stick flick optional) / Shift. Setting:
  `gameplay.coverDash` (cover-to-cover, default on).
- World prompts (`WorldPrompts`, layer `.hud-world` above the touch layer, below menus; `GameState.updateCoverHud`):
  `cover` on the candidate face, `vault` on the traversal obstacle (`TraversalController.hintAt`; beside the cover
  prompt when both apply), in-cover `vault` along the face in use (on the low cover's top edge, since the camera
  looks over it), no badge on the face in use (`state` only warns "Flanked"), `corner` on the edge while pushing
  against an outside corner (`CoverController.cornerSide`), `move` on the cover-to-cover target. One height per surface: `seg.y +
  min(PROMPT_Y 0.55, height / 2)`; `flush()` pushes overlapping prompts apart and keeps them on screen. Glyphs by
  pad / keyboard, icons by touch (3.2.0: indicators; the touch action button acts on them).

## Combat around cover
- Player hit volumes are split (`PlayerTarget`: legs, torso, head) and follow crouch and lean; head x1.3, legs
  x0.75. Enemies aim at the torso volume.
- `game/tactics.ts` (pure): `exposureFraction`/`exposurePoints` (GameState samples rays from up to 4 alerted
  threats at 4 Hz), `coverQuality` (badge "flanked" below 0.3), `flanks`, `segPointDist`, `Suppression`
  (near misses / impacts close to the head; holds then decays; spread, aim sway, flinch, vignette).
- Losing the cover being used (`reason === 'gone'`) stumbles the player. HUD `setTactical` shows stamina,
  exposure, noise and the suppression vignette.
