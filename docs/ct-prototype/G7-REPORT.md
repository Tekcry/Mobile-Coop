# G7 report: grab, hold, knockout, carry (2026-10-20)

Implementer, Opus. Brief: make Wren's close-quarters moves match the CT footage (Michael: "...grabs, holds, knocks
out", "prototype animations for all of it, with no clipping and must be believable", "Footage wins"). Rows from
`audit/AUDIT-WALLS.md` (5-8, 11, 13, 19-22, 26, 27, "Missing entirely": interrogate, doors while carrying) and
`audit/AUDIT-EXTRA-OLD.md` (row 8, M11). Uncommitted in the working tree of `feature/ct-prototype`.

Sheets (GPU, port 4189, `node scripts/anim-cleanup/sheets.mjs docs/ct-prototype/shots/g7 ...`; new anim-sheet
scenarios `grab holdidle holdwalk holdko interrogate lift carrywalk carrydrop` on the Warehouse): `shots/g7/*.png`.
The first round showed three bugs, fixed before the final sheets: the guard's arms stuck out sideways (the old poses
bent the elbows on the wrong axis), the hero's legs trailed a metre behind on the step-in (no gait under the override),
and the put down threw the legs up. All ten sheets in `shots/g7` are from the final build.

## Per row

| row | item | status | old -> new | files |
| --- | --- | --- | --- | --- |
| W5 | Grab from behind | done | step-in `TAKEDOWN.approach` 0.22 s (snap) -> `GRAB.approach` 0.42 s, rising out of a crouch (override `crouch: false`, `standUp`), the legs stepping (`pose.freeGait`: the gait from the measured speed under the kinematic override); new pull-in `GRAB.pull` 0.6 s (the guard eased from where he stood to the hold, turning from his own facing to the operator's); hold settled ~1.0 s after the press (CT ~1-1.2 s). The struggle starts at the contact (`contactDelay`), not the press. Hero: left forearm across the throat, right hand on his right shoulder (`holdHandTargets`); guard: head back, hands up at the arm, rifle hidden while held | `game/takedown.ts`, `game/takedownController.ts`, `game/closeQuarters.ts`, `ai/enemy.ts`, `net/enemyPuppet.ts`, `player/player.ts`, `game/gameState.ts` |
| W11 | Hostage walk | done | speed cap gear 2 (1.4 m/s) -> `GRAB.speedCap` 0.75 m/s (speed, not gear; e2e measures 0.77); `GRAB.hold` 0.42 -> 0.32 m; the guard now walks with you (his velocity from `holdAt`, gait from it, no frozen motion clock) instead of sliding on planted feet | `takedown.ts`, `takedownController.ts`, `ai/enemy.ts` |
| W19 | Hold idle | done | hero had no hold pose -> hold hands + spine bend 0.08 rad; the pair's sway 2 cm at 0.5 Hz when still (guard hold point + hero pelvis); guard flail 0.4 s every 2-4 s (deterministic per guard, the same on every machine). Pistol hand at the temple: not done (a drawn sidearm keeps its own ready pose) | `closeQuarters.ts` (`GuardCq`, `flailAt`, `holdSway`), `anim/animGraph.ts` (`bend`, `bendDrop`, `sway`) |
| W20 | Knockout from the hold | done | `GRAB_STRIKE` 0.5 s with the guard dropped -> `CQ.koTime` 0.85 s: limp over 15-50 %, lowered through his own crouch 40-100 %, hero bent to 0.5 rad / pelvis -0.1 m, both hands on him, standing again ~0.2 s after (eased). Movement locked during it | `closeQuarters.ts` (`koCurve`), `takedownController.ts` |
| W21 | Kill from the hold | kept | 0.5 s (G43, not in the footage) as `GRAB.killTime`; the struggle now blends from the hold (a fresh seize snapped the arms) | `takedownController.ts` |
| Missing | Interrogate | done (prototype) | stub -> 1.5 s: left hand to his jaw, his head turned 0.35 rad and chin up; the menu closes during it and reopens; a neutral feed line "Interrogated: nothing new" (level lines are story text: not written) | `grabMenu.ts`, `takedownController.ts`, `gameState.ts` |
| W6 | Body pick-up | done | instant teleport -> 2.0 s committed lift: step in (at most 1 m, no wall crossing) to kneel 0.5 m from the chest, crouched and bent 0.55 rad with the hands under its shoulders to 0.8 s (crouch lets go), hoist to the shoulder 0.8-1.6 s (the hips pivot, a 0.3 m bow out in front, joints from straight to draped), settle to 2.0 s. The body goes on the shoulder on the side its head lies (`carrySide`; CT shows the right) | `game/stealthSystems.ts`, `ai/body.ts`, `ai/carryPose.ts` (new), `closeQuarters.ts` (`liftCurve`) |
| W7 | Carry pose and speed | done | `BODY.carrySpeed` 2.2 -> 0.8 m/s (e2e measures 0.78); spine bend 0.38 rad, pelvis -0.04 m; doors: while carrying the interact is a hide spot, else a door in reach you face (open / close only), else Drop body | `ai/bodies.ts`, `stealthSystems.ts` |
| W8 | Body drop | done | instant ragdoll 0.7 m ahead, impulse (25, -8, 25) -> 0.8 s: the body slips off the shoulder to the side (0.32 m out, 0.2 m down) with the shoulder dip 0.2 m, ragdoll at 0.4 s with a push of 3 / -2 m/s (to the carry side); `dropCarried` stays instant for restarts and death (with the small push) | `stealthSystems.ts`, `carryPose.ts` (`slideAt`), `closeQuarters.ts` (`dropCurve`) |
| OLD 8 | Bend over the body | done | the lift's first 0.8 s is the bend (no separate move), as the audit says | as W6 |
| W13 / W22 | Palm strike pose, front takedown turn | not done | the elbow sweep is unchanged (timing already matched); out of time for a new thrust pose. Ground non-grab takedowns now step in with the legs and their victim struggles from the contact | - |
| W26 | Grab camera | done (no change needed) | no takedown camera cut exists; the follow camera stays | - |
| W27 | Carry camera | not done | boom / left shoulder offset not changed (ESTIMATE row, feel 1) | - |
| OLD M11 | Pick up object | not done | no object pick-up in our build | - |

## Co-op parity (no wire change, PROTOCOL_VERSION 24)
- MoveState `grab`: `ph` = the finisher's / interrogation's progress, `sub` bit 1 kill, bit 2 interrogating (existing
  fields, now filled). The host lowers / turns its guard for a client's hold from them; `RemoteAvatar` poses the hold
  hands (`holdHandsLocal`, body frame, within 8 cm of the owner's by test) and the bend; `poseFromMoveState` gives the
  kill's arc.
- The host derives a client's victim's struggle start from where the client stands (`contactDelay`).
- Not synced (no data): the client's pull-in (the host's guard stays where he stood for 0.6 s, then snaps to the hold
  offset, up to 0.23 m), the hold sway and flail timing per machine (cosmetic), the whole carry (a partner still sees no
  body on the shoulder and no lift / bend; as before G7).

## Tests changed and why
- `tests/takedown.test.ts`: `GRAB.maxGear` 2 removed -> `speedCap` 0.5-0.9, `approach` 0.42, `pull` 0.6, `hold` 0.32
  (footage rows 5 / 11); new `contactDelay` case.
- `tests/grabMenu.test.ts`: Interrogate is a working option now (CT offers it held, 052607); the stub case uses Force to
  device.
- `tests/g7CloseQuarters.test.ts` (new): the timelines (hold settled 0.85-1.25 s, carry <= 0.85 m/s, knockout order,
  lift / drop phases, sway, flails 2-4 s apart, the guard pose's fixed joint set and blends) and NullEngine clipping
  checks on the real rigs: the hold still and walking 0.7 m/s (forearm clear of his head, at his throat, heads and
  chests apart, feet >= 0.1 m apart), the remote hands vs the owner's, and the hoist + slide for both lying directions
  (body joints >= 0.17 m from the carrier's head, >= 0.1 m from his trunk axis, never under the floor).
- `scripts/e2e-takedown.mjs`: the hold waits 1.2 s (was 0.5) for the step-in + pull-in; the hostage stays 0.32 m in
  front (was 0.42); new asserts: not held at 0.6 s, the hostage walk 0.3-0.8 m/s, Interrogate closes and reopens the
  menu, the knockout takes its time; Carry waits 3.2 s and checks the lift is over.
- `scripts/e2e-stealth-ai.mjs` `carry`: the 2.0 s lift asserted and waited out; carry speed 0.3-0.85 m/s (was < 2.4).
- `scripts/anim-sheet.mjs`: the G7 scenarios (Warehouse, a calm grunt ahead), `sc.params`, the crouch / kneel flags in
  the frame labels.

Run here (desktop, port 4193 software GL / 4189 GPU, `heavy.lock` held): `npx tsc --noEmit` clean; eslint clean on
the changed files; vitest 16 related files 205 tests pass (anim, committedMoves, elbowStrike, g1Locomotion, moveState,
net, netSim, posture x2, readyHands, rig, menuPoses, g7, takedown, grabMenu x2); `npm run build` ok; e2e-takedown,
e2e-stealth-ai, e2e-stealth, e2e-ct pass; on the final build e2e-takedown, e2e-stealth-ai, e2e-coop and e2e-netmove pass.

## What still differs from CT
- The hoist: the floor ragdoll is swapped for a straight lying rig at 0.8 s (a visible pose pop), and mid-hoist the
  body's feet brush the floor; the step-in can leave the hands stretched to a body lying far off.
- The pistol at the guard's temple (row 19) and the palm-thrust strike pose (rows 13, 22) are not built.
- The guard's hands sit at chin height in front of the forearm, not gripping it (FK only, no hand IK on the guard).
- Hostage legs: in the walking sheet the hero's lead foot and the guard's rear foot pass close in some frames (the
  NullEngine check in phase passes at >= 0.1 m; the live gaits are out of phase). The hostage can still be pushed into
  a wall at 0.32 m (he is not solid to the operator, as before).
- Left-shoulder carries exist (a body lying head to the left); CT only shows the right.
- (Fix round) The carried body now faces Wren with its hips flexed over her shoulder (the 3.2.0 drape faced away in a
  back-bend). Its arms still swing out level for a moment mid-hoist (~1.2 s in `lift-side`) before they hang.
- Black spheres appeared near a settled ragdoll in the `carrydrop` debug sheet after landing (not seen in the final
  sheet; possibly ragdoll or debug geometry): worth a look in a render.
- Carry camera unchanged; the partner sees no carry.

## What Michael should try
1. Behind an unaware guard on the Warehouse, press A: Wren steps in and pulls him back (~1 s) before the menu; walk him
   (slow), stand still (a small sway, a flail now and then).
2. Knock out from the menu: he goes limp and is lowered in front, Wren bent over him. Interrogate: her hand at his jaw
   for 1.5 s, then the menu again.
3. Carry from the menu, or A at a body: the 2 s lift (crouch during the first 0.8 s lets go), the slow bent walk, A
   facing a door opens / closes it, A elsewhere puts the body down beside her.

## Needs a build / e2e / sheets (job lead, after this report)
- Build: done here on the final source (`dist/` is this tree's; rebuild before any other run if the tree changed).
- Sheets to (re-)render on the GPU port: `E2E_GPU=1 node scripts/anim-cleanup/sheets.mjs docs/ct-prototype/shots/g7
  grab:12:0.1:side grab:12:0.1:front34 holdidle:8:0.25:front34 holdwalk:12:0.1:side holdko:12:0.08:side
  interrogate:10:0.16:front34 lift:14:0.15:side lift:14:0.15:front34 carrywalk:12:0.1:side carrydrop:10:0.1:side`
  (all rendered from the final build; re-render only if the tree changes).
- Suites covering the change: e2e-takedown, e2e-stealth-ai, e2e-stealth, e2e-ct, e2e-coop (client grab, dual takedown),
  e2e-netmove (MoveState), plus the slice tier (`e2e:quick`, e2e-ctcourse) and `npm run check` before the commit.
- Checker focus: no allocation added per frame (closures and objects are preallocated; the old per-step `override`
  objects and per-frame emote objects are gone from the grab path), the host / client grab parity, and the stale sheets.

## Fix round (2026-10-20, after the independent check PASS at 1b161338)
All in the takedown / grab / carry files; G6's wall / door edits in the same files were left alone.
1. **Put down** (`carrydrop`): the body slips 0.32 m out to the carry side with its legs kept folded over the shoulder
   (`slideAt`; unfolding them swung the legs out level), then the ragdoll takes it. A crouch toggle left from before the
   lift is cleared at pick-up (`c.standUp()`, as CT stands up with the body); one pressed while carrying stays.
2. **Lift**: no pop at 0.8 s: the carried rig copies the corpse's pose as it lies (`captureLying`, joint by joint). The
   hoist is two halves (`hoistAt`): drawn up off the floor to hang upright against her front, legs down (0-0.5), then
   tipped over her shoulder with the hips folding so the legs go down her front (0.5-1). The feet never go under the
   floor (`hoistAt` lifts the root by any shortfall). The carry drape now faces her with the hips flexed (`SOCKET_YAW`,
   hips -2.37 rad; the 3.2.0 pose faced away in a 136 deg back-bend), its torso hanging ~0.3 rad behind vertical
   (`CARRY_TILT` 0.35 -> 0.08 on top of her 0.38 rad bend; 0.35 laid it out near flat behind her).
3. **Hostage walk**: the guard is held 0.1 m to her left (`GRAB.side`; owner, co-op host and remote hands alike). In the
   NullEngine sweep of 8 gait phases between them, straight in front the shins and feet centre lines met (1-3 mm); offset,
   they stay >= 8.7 cm apart (ankle radii 7 cm). Forward offsets made no difference. The 0.1 m wide soles may still graze
   by about 1.5 cm when they are exactly level.
4. **Client view of a host knockout**: the client's puppet of the host's hostage is posed from the host avatar's
   MoveState (`RemoteAvatar.holdTid / holdPh / holdSub` -> `CoopClient` -> `EnemyPuppet.remoteHeld`). It now shows the
   hostage hold, interrogation and kill, and is lowered with the knockout's own phase. Before, it stood normally and only
   crouched when the snapshot's crouch bit flipped at half way. No wire change.
5. `EnemyPuppet` keeps its rifle and hides it while seized or held, shown again on release or denial (as `Enemy`).
6. Not done: the guard's fists on the forearm (front view). He has FK arms only; putting the hands on her forearm needs
   hand IK on the guard rig plus a guard rifle without hands. His hands stay up at chin height, about 0.1 m ahead of the
   forearm.

Tests: `tests/g7CloseQuarters.test.ts` 13 pass: new leg test over 8 phases; hoist checks for no capture pop (< 2 cm),
ankles never above the pelvis once lifting, Wren's legs >= 0.15 m from its trunk through the hoist and the slide.
`scripts/e2e-takedown.mjs`: the hostage's spot now includes the 0.1 m side offset.
Checks: tsc and eslint clean on these files; vitest g7 / takedown / grabMenu / net / netSim / moveState pass in a G7-only
copy. In the shared tree `tests/grabMenu.test.ts`, `tests/net.test.ts` and `npm run build` fail on the concurrent G5 / G6
menu and wall edits (`doorMenu` / `grabMenu` exports, the wall lean), not on G7. So the build, e2e and sheets ran from a
G7-only copy (HEAD 1b161338 plus these fix-round files, in the scratchpad): build ok; e2e-takedown and e2e-stealth-ai
pass on port 4195. Sheets re-rendered from it: `holdwalk` (side, front34), `holdidle-front34`, `lift` (side, front34),
`carrywalk-side`, `carrydrop` (side, front34). `dist/` in the shared tree is not rebuilt.
Job lead: once G5 / G6 settle, `npm run build` in the shared tree and run e2e-takedown, e2e-stealth-ai, e2e-coop and
e2e-netmove (the puppet and host changes).
