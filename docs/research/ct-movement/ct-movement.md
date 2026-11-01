# Chaos Theory movement - build spec (3.2.0)

Branch: `ct-movement` (created from `dev`). Never touch master. Merge into `dev` only when Michael says so. Work one
phase at a time. At the end of each phase: run `npm run check` and the listed e2e suites, update `CHANGELOG.md` (one
`## 3.2.0 - Chaos Theory movement` heading, a bullet block per phase), `TESTING.md`, `CLAUDE.md` (Movement, Traversal,
Cover, Takedowns, Coop sections) and `docs/ct-movement-progress.md`, commit and push `ct-movement`, then STOP and
report. Do not start the next phase until Michael says so.

## Rules for this work
- Read before coding (only these, not the whole repo): `CLAUDE.md` sections Hard rules, Input, Movement and camera,
  Traversal anchors and attached states, Cover, Takedowns, Coop (incl. 3.1 crossplay), Audio and quality (Frame
  governor), Performance budget, Conventions; then `config/movement.ts`,
  `anim/motion.ts`, `player/movement.ts`, `player/playerController.ts`, `player/traversal.ts`, `player/attach.ts`,
  `player/attachController.ts`, `world/anchors.ts`, `input/actions.ts`, `input/gamepadMapping.ts`,
  `input/keyBindings.ts`, `input/touchControls.ts`, `net/protocol.ts`, `net/remoteAvatar.ts`, `net/coopHost.ts`,
  `net/coopClient.ts`, `game/takedown.ts`, `game/takedownController.ts`. Open other files only when a step needs them.
- Extend what exists. Ladders, drainpipes, horizontal pipes, ledges, ducts, ziplines, windows, `AttachMachine`,
  `GripStepper`, `TakedownController`, `CoverStateMachine` and the anchor system already work. New moves are new
  `ATTACH` kinds, new anchor types, new takedown kinds and new clips in the existing files, not parallel systems.
- Cover stays exactly as it is (Blacklist cover replaces CT's back-to-wall). Camera framing stays as it is.
- Pure logic (detection, state machines, speed maths, net packing) goes in Babylon-free modules with unit tests in
  `tests/`. Every new constant goes in a named table in `config/movement.ts` and, if a feel value, in
  `MOVEMENT_RANGES` for the debug Tune panel.
- Enemies must not change. Make `ENEMY_MOTION` and `ENEMY_CALM_MOTION` standalone literals holding today's resolved
  values (not `...MOVEMENT`) before changing `MOVEMENT`. Add a test that pins them.
- Parked maps: no work on them.
- If this spec conflicts with the code or is ambiguous: pick the option closest to existing patterns, note it under
  "Decisions" in your phase report, and carry on. Do not invent APIs; if a function you need does not exist, write it.
- Before coding each phase, print a short plan: files and functions you will change, one line each.
- Every move in every phase must work for the local player, co-op clients, the co-op host and PvP (see Phase 1).

## 3.1 constraints (graphics ladder, governor, crossplay)
- Gameplay never reads graphics. Move detection (split gaps, wall-jump lips, rappel points, fences, team-move
  walls) uses collision geometry, cover faces and anchors only, never voxel layers, LOD or anything the preset or
  the frame governor (`core/governor.ts`) changes. Same result on Low and Epic, on phone and PC.
- Fairness: new poses, ropes and fences look the same on every preset and device. Rope and fence visuals are
  thin-instanced meshes outside the voxel layers, drawn on every preset. A chain-link fence never blocks sight lines
  (player camera, AI perception, `tests/losParity.test.ts` lines); add a parity case for it.
- PvP: new aim cones (split, inverted, rappel, human ladder) work inside the PvP field of view from `matchFov`
  (`Player.pvp`); no move gives a wider view in PvP than standing aiming does.
- New attach states get an `ATTACH_FRAMING` preset in `config/camera.ts`; framing does not change with FOV or aspect.
- Budgets (CLAUDE.md Performance budget): animation <= 0.04 ms per character including the new clips; no new
  per-frame allocations in hot paths; the new map content stays inside the phone draw budgets (Low 120 / Medium 170 /
  High 230 / Ultra 250). Run `node scripts/perf.mjs --budget` and `node scripts/perf.mjs --preset=ultra --mobile
  --budget` at the end of every phase that adds clips or map content.

## Controls (all phases)
| Action | Pad | Keyboard / mouse | Touch |
| --- | --- | --- | --- |
| `speedUp` / `speedDown` (new) | D-pad up / down | Wheel up / down (fixed), plus bindable keys `=` / `-` | Speed rocker (new control: up / down buttons with a 6-pip readout) |
| `grenade` (moved) | D-pad right (hold aims, release throws, as before) | unchanged (G) | unchanged |
| `gadgetWheel` (moved) | D-pad left hold (`WHEEL_HOLD`) | unchanged (Tab) | unchanged |
| `ping` (moved) | D-pad left tap (released before `WHEEL_HOLD`) | unchanged (Z) | unchanged |
| emote (moved) | View hold (`SWAP_HOLD` 0.35 s); View tap stays goggles | unchanged | unchanged |
| weapons | RB / LB unchanged | Q / X only (wheel no longer swaps) | unchanged |
- Phones are first class (iPhone 17 Pro Max target): every move must be doable on touch through world prompts and
  the existing buttons, plus the speed rocker. Add each new prompt to `e2e-touch.mjs` as it lands.
- Update `gamepadMapping.ts`, `keyBindings.ts` defaults, `ui/prompts.ts` labels, the Controls screen list, and
  `e2e-mouse.mjs` (wheel now changes speed). Touch: add `speed` to `TOUCH_CONTROL_IDS`, bump `TOUCH_LAYOUT_VERSION` to
  4 with a migration that keeps every stored placement and adds the rocker at its default spot (right of the move
  stick zone), in every preset and the layout editor.
- Y stays contextual (no free jump). Priority when several apply: takedown > co-op team move > CT move
  (split / wall jump / rappel / fence / pipe sub-state) > existing traversal > interact.

## Phase 0 - CT locomotion: speed gears, instant stop, roll
Speed gears (pure `player/speedGears.ts`):
- 6 gears, default 3 at spawn and respawn, kept through stance changes. `speedUp` / `speedDown` step one gear.
- Gear caps (m/s), crouched: 0.5, 0.9, 1.3, 1.8, 2.3, 2.8. Standing: 0.8, 1.3, 2.0, 2.8, 3.8, 5.0.
- Target speed = gear cap x stick curve(magnitude) (curve: 0 inside the dead zone, linear to 1 at the rim). Touch and
  keyboard (full deflection) give the gear cap.
- Replace the stick bands (`sneakBand`, `walkBand`, `crouchWalkBand`) for the player. `SprintGate` stays: sprint held
  or toggled = gear 6 standing while active (cover-to-cover dash and marked-target dash unchanged). Aiming caps at
  `adsSpeed` / `adsCrouchSpeed` as now.
- Noise: keep `noiseRadius(speed, ...)`; check its bands still give silent for crouched gears 1-4 and standing 1-2;
  adjust thresholds, not the gear table. Unit tests.
- HUD: gear pips (6) near the stance indicator, shown 1.5 s after a change then fade; always visible on touch next to
  the rocker.

Instant stop / start (CT feel; player only, via a `ct` flag in the `MotionDriver` params, enemies untouched):
- Stick released: velocity is zero by the next fixed step. The gait clock freezes; the pose blends from the frozen
  mid-stride pose to idle over `CT.stopBlend` 0.12 s. Planted feet stay planted (FootPlanner keeps contacts, foot
  slide < 2 cm). No finishing the step, no overshoot.
- Start: 95% of target speed within `CT.startTime` 0.08 s. Direction changes re-target at once; no planted pivots
  for the player (`pivotTime` path disabled when `ct`); travel turn rate `CT.turnRate` 720 deg/s.
- Gear change mid-move re-targets within 0.08 s.
- Roll: crouch tap while moving standing at gear 5-6 = committed forward roll (`kind 'roll'`, reuse `ROLL` clip),
  0.7 s, ~3 m, ends crouched, noise 2 m.

Done when: unit tests for gear maths, stop / start timing (60, 90 and 120 Hz parity, matching the target frame
rates), enemy tuning pin; `e2e-move.mjs`
updated to measure each gear's speed both stances, zero velocity one step after release, foot slide < 2 cm on stop,
roll; `npm run e2e` green.

## Phase 1 - Networked movement state (foundation for every later phase)
Today `pstate` sends only position, yaw, pitch, speed, flags and weapon, so remotes cannot show cover, climbing or
hanging correctly. Fix that first, for the existing moves:
- Pure `net/moveState.ts`: `MoveState { m: mode enum (u8), a: anchor index into `anchors.all` or -1, s: position
  along the anchor (m), sub: sub-state (u8), ph: committed-move phase 0-1, tid: target id (enemy / player, '' if
  none), g: gear }`. Modes now: ground, cover (sub: side / crouched / peek kind), each existing `ATTACH` kind,
  committed traversal (step / vault / mantle / drop / hop / roll / landing), takedown. Later phases add their modes
  to this enum only.
- One function `moveStateOf(local player)` and one `applyMoveState(rig, anchors, mv)` that both the local player and
  `RemoteAvatar` use, so a remote is posed by the same code path, never a separate approximation.
- `PlayerState` gets `mv`. `parseMessage` validates it (enum range, anchor index range, clamps, string caps). Add
  cases to `tests/net.test.ts`.
- Send `pstate` immediately on a mode or sub-state change (not just on the 20 Hz tick). Continuous values (`s`, `ph`)
  interpolate through the existing `SnapshotBuffer`. Committed moves send their start (kind, start, target) once and
  the remote plays the same deterministic clip locally from that start instead of interpolating positions.
- Host: `RemotePlayer` hitboxes follow the posed remote rig in every mode, and `RemotePlayer.history` stores the
  mode so lag-compensated PvP hits rewind the right pose. Host sanity checks in `validate.ts`: speed within the
  gear cap (+15% tolerance), attached position within 0.5 m of `anchor at s`; violations are clamped, not kicked.
- Footstep / climb noise for remotes keeps coming from the host's `noiseRadius` and `PF.silent`.

Done when: unit tests for pack / parse / validate round trips; a new `scripts/e2e-netmove.mjs` using `?net=local`
(two pages: host and client) puts the client in cover (high, low, peek), on a ladder, drainpipe, pipe, ledge, duct
and zipline, and checks on the host that the mode matches and the remote's hand / foot / head positions are within
10 cm of the client's own rig after interpolation settles; PvP: a host shot at a client hanging on a ledge hits the
posed head hitbox.

## Phase 2 - Split jump, wall jump, pipe legs-up and inverted hang
Split jump (pure detection in `player/splitJump.ts` from the cover faces in `coverData`):
- Valid gap: two high faces with opposed normals (dot < -0.95), 0.9-1.7 m apart, both >= 2.6 m tall over the player's
  floor, player between them facing within 40 deg of the corridor axis. Prompt "Split jump" (world prompt on the gap).
- Y: committed jump (0.45 s) into the split: feet planted on each wall at 1.9 m above the floor (`plantL/R`), hips
  centred, hands braced on the walls until aiming. New `ATTACH` kind `split` (axis none).
- In the split: LT aims the sidearm (sidearm only; two-handed guns stay stowed), body yaw within +/-100 deg of the
  corridor axis, pitch -85..+30. B drops (registered landing). Y with a lip / pipe / ledge in reach above (use
  `findJumpTarget`, reach measured from the split feet) jumps up to it. Quiet: no footstep noise; light level counts
  as normal (no special stealth bonus).
- Enemies under a split do not get a free look up; leave perception unchanged.
Wall jump:
- Facing a wall within 1.0 m with a hangable lip 2.7-3.8 m above the floor (above `REACH.grabMax`): prompt "Wall jump";
  Y = committed run-up kick (0.6 s) ending in a ledge hang on that lip. Also off an inside corner (kick from one face
  to a lip on the adjoining face).
Horizontal pipe sub-states (extend the existing `pipeH` attach, `sub` in MoveState):
- `hands` (today's hang): shimmy as now. Y (when no jump target is under the stick) = pull legs up.
- `legsUp`: legs crossed over the pipe, body under it facing up; shimmy along at `PIPE.legsUpSpeed` 0.5 m/s
  (this is "climbing pipes upside down"); feet clear 0.6 m higher than `hands`, so it passes over things `hands` hits.
  Y = flip to `inverted`; B = back to `hands`.
- `inverted`: hanging by the knees, head down, no travel. LT aims the sidearm, RT fires; yaw +/-120 deg from the body
  facing, pitch -80..+30, spread x1.3. Camera stays upright; the rig is rotated about the pipe axis using the
  existing root `tumble` path, arms IK to the aim point. Y = curl back up to `legsUp`; B = drop and flip to the feet
  (landing rules apply).
- Transitions 0.4-0.6 s, interruptible only by damage (falls to `hands`).
- New clips in `anim/clips/traverse.ts`: split brace, split aim, wall-jump kick, pipe legs-up, pipe inverted, inverted
  aim. Hands and feet locked on contacts (< 1 cm).
Map content: Proving Grounds CT course (new area next to the traverse course): a split corridor with a lip above, a
wall-jump wall, a horizontal pipe over a walkway. Warehouse: at least one split gap, one wall-jump route, one pipe
over a guard patrol.
Net: modes `split`, `wallJump`, pipe subs through MoveState; host hitboxes for split and inverted.
Done when: unit tests (gap detection incl. too narrow / too wide / too short / angled walls, wall-jump lip window,
pipe sub-state machine); `scripts/e2e-ct.mjs` covers every move here incl. aiming and firing from split and inverted;
`e2e-netmove.mjs` extended to every new mode; `e2e-anchors.mjs` covers the new placements.

## Phase 3 - Rappel and fences
Rappel (new anchor `RappelPoint {top, n, length}` in `world/anchors.ts`, `LevelBuilder.rappel(...)`, new `ATTACH` kind
`rappel`, axis vertical):
- At a roof / mezzanine edge with a rappel point: prompt "Rappel"; Y hooks on, turns to face the wall and steps
  over. Stick up / down: ascend 1.0 m/s, descend 1.6 m/s (sprint held: 3.0 down). Y = kick out and swing back
  (1.2 m arc, lateral with the stick up to 1.5 m). LT aims the sidearm (yaw +/-110 deg from the wall normal, pitch
  -80..+40). B at <= 2 m above the floor unhooks to a landing; at the bottom it unhooks automatically.
- Beside a `WindowAnchor` on the rope: traverse = kick through (reuse the window vault and glass break).
- Rope: thin procedural mesh from the point to the harness (no collision).
Fences (new anchor `Fence {a, b, height}`, `LevelBuilder.fence(...)`, chain-link visual, new `ATTACH` kind `fence`,
axis auto):
- Y at a fence: grab and climb (0.9 m/s), shimmy sideways (0.6 m/s); at the top, Y = committed flip over (0.9 s)
  down the other side; B drops. Fence rattle noise 4 m while moving above gear 3, 0 at gears 1-3.
Map content: Proving Grounds CT course: one rappel wall with a window, one fence. Warehouse: rappel off the roof
or mezzanine into the yard, fence in the yard.
Net: modes `rappel` (s = rope length out, swing state in `sub` / `ph`), `fence`; rope drawn on remotes.
Done when: unit tests for both attach specs and anchor reach; `e2e-ct.mjs` and `e2e-netmove.mjs` extended;
`e2e-anchors.mjs` covers the new anchors.

## Phase 4 - CT takedowns and grab
New kinds in `game/takedown.ts` (`pickTakedown` input gains the attached / split state):
- `drop`: from a ledge hang, pipe (any sub), split, zipline or a high edge onto an enemy within 1.0 m horizontally of
  the landing point and 1.2-5 m below. Prompt "Drop attack". Tap = knockout, hold = lethal (existing `lethalHold`).
- `ledgePull`: hanging on a lip with an enemy standing within 1.0 m of that lip above: pull him over (lethal fall,
  or knockout on tap).
- `inverted`: in `inverted` on a pipe with an enemy within 0.9 m horizontally beneath: neck snap / choke up.
- Grab (replaces the instant `behind` takedown): Y from behind = grab and hold the enemy in front.
  While holding: move at gears 1-2 only (crouched 0.5 / 0.9, standing 0.8 / 1.3); LT raises the sidearm one-handed
  over his shoulder, RT fires (spread x1.2); tap Y = knockout, hold Y = lethal; B = shove (enemy staggers 1.0 s then
  alerts). Human shield: enemies who see you hesitate `SHIELD.hesitate` 1.5 s, then aim at the exposed head /
  shoulder only; hits on the hostage's hit volumes damage him first. The hostage dies at 0 hp and drops.
  Mark & Execute charges are earned on knockout / kill from the grab, as takedowns earn them now.
- Use the existing seize path (`Enemy.beginTakedown` / `holdAt` / `releaseTakedown`) for every kind.
Net: client takedowns already use `td start / done / abort`; add the new kinds and a held `grab` state where the
host keeps the seized enemy posed at the grabbing player's offset (from MoveState) each snapshot until done / abort.
PvP: drop / ledgePull / inverted work on players only if `PvpScore.hostile`; grab is disabled against players.
Done when: unit tests for each `pickTakedown` kind's window (extend `tests/takedown.test.ts`); `e2e-takedown.mjs`
extended with each new kind and the grab (walk, aim, fire, shove, knockout, kill, hostage takes hits); `e2e-coop.mjs`
extended: a client performs each and the host's enemy matches.

## Phase 5 - Co-op team moves (co-op and TDM teammates only)
- Brace: with a teammate within 3 m and a wall within 1.0 m behind you, hold Y 0.4 s = brace (back to the wall,
  hands cupped). B leaves.
- Boost: a teammate taps Y at your braced hands: committed step-up and toss to a lip / pipe / split up to 4.5 m above
  the floor (`findJumpTarget` from the toss apex), ending attached.
- Human ladder: a teammate holds Y at your braced hands: climbs onto your shoulders (feet at 1.45 m). On top: LT / RT
  aim and fire with any weapon (yaw 360, pitch -60..+60), Y grabs a lip in reach (<= 4.1 m) and climbs off, B hops
  down. The bottom player cannot move; their B ends it (top hops down).
- Handshake: requester sends `team {kind, partner}`; the host checks both players' MoveStates (partner braced, within
  1.2 m, wall clear, target lip valid), then broadcasts `teamStart {kind, a, b, t0, target}` (or `teamDenied`). Both
  clients play the same committed sequence from `t0` (host clock via `ClockSync`). After launch each player's own
  controller owns their pose; the stacked state is MoveState mode `stacked` (sub: top / bottom, tid: partner).
- Protocol: types in `Msg`, cases in `parseMessage`, tests in `tests/net.test.ts`. Host rate limit 1 per 1 s per player.
Map content: Warehouse and Proving Grounds: one boost wall with a lip at ~4.2 m and a human-ladder window / lip.
Done when: unit tests for the handshake validation; `e2e-netmove.mjs` runs boost and human ladder between two pages,
host and client in both roles; denial when the partner moves away mid-request.

## Report format (end of each phase)
Files changed (one line each), Decisions (spec conflicts and choices), test results (unit counts, e2e suites),
anything left undone, and the manual device checks I should do (add the same to `TESTING.md`).
