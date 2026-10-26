# piano-knife: plan
Owner: Night Shift | Player Build. Status: current. Planner: Opus. Base: master 1b58989ed. Fix round 1 applied
(plan check `piano-knife-PLAN-CHECK.md`, Campaign answers ~20:20, Michael's paired-kill words ~19:45).

Knife kill animations (co-op, quiet, paired, this scene only) and the intro pose (empty pistol, breathing, back to the
wall) for the piano escape scene. Words and assumptions: `BRIEF.md`. Prototype mode: starting values, one closest test
set per slice, no tuning or polish passes. Only the next slice (S1, `S1-BRIEF.md`) is briefed in full; the rest are
outlines, briefed one slice ahead only (Michael ~19:22, ROADMAP Decided).

## 1. How it works today (file:line on 1b58989ed)
Takedowns
- Pure geometry `src/game/takedown.ts`: `TakedownKind` :11 (behind, front, side, overCover, corner, above, below,
  window, drop, inverted, hangDown, assist); `TAKEDOWN` :16-56 (reach 1.8 m, standoff 0.55 m :31, approach 0.22 s,
  strike 0.7 s, `lethalHold` 0.3 s); `GRAB` :99-117; plan shape :174-194; `pickTakedownInto` :265.
- `src/game/takedownController.ts` (876 lines): noise radii :24-25 (choke 1.2 m, lethal 3 m); `TakedownVictim`
  :57-82 (`beginTakedown` :70, `holdAt` :71, optional `holdPose?` / `setSolid?` already); `offer` :93; `start` :227
  (grab decided :256, `e.beginTakedown` :268, `takedown` start event :282); `find` :289-330 (skips dead, dogs, taken,
  alert-and-spotted); `tryVictim` :332-391; run step :670-723 (tap / hold decides lethal :675-682, damage aborts
  :684); `frameUpdate` :727 and `grabHands` :761-794 (the hands on a grabbed guard by `rig.reachL` / `reachR` IK,
  `holdHandTargets`); `finish` :812-846 (lethal `applyDamage` / `knockOut`, `killWarp` tail :819-823, `hear` :843,
  `takedown` event); `abort` :849. Created in `gameState.ts:664`.
- Menu: the takedown row (`gameState.ts:1518-1525`, `TD_LABEL` :334); `ctxRun` :1584-1588 (`'ko'` row calls
  `start(false)`). The weapon is stowed during a takedown (`gameState.ts:2200`).
- Guard side: `Enemy.beginTakedown` `src/ai/enemy.ts:835-871` (taken, struggle emote `GuardCq`), `die` :2345-2372,
  `knockOut` :2378, `killOutright` :2387. Body / ragdoll: `src/ai/body.ts:105-119`; carry and hide: `game/bodyCarry.ts`
  (`DROP_NOISE` 3 :16), `game/stealthSystems.ts:173-179, 289-305`.
- Attacker pose: procedural `pose.melee = killWarp(...)` (`strikeBody.ts:117-148`, `animGraph.ts` `strikeShot` ~:2441);
  hand IK onto the victim (above). No capture plays in a takedown. Every rig is one class (`src/player/characterRig.ts`:
  `reachL` / `reachR` :1159-1160, `holdingKnife` :776, `solveArm` :3843), so a guard rig has the same hand IK.
- "Kill blow needs a kill bit first" (`src/anim/mixamo.ts:124-128`, `docs/mixamo-retarget/I5-REPORT.md:70-75`): the
  lethal blow reaches `strikeShot` on the strike's arc. The knife kill never sets `pose.melee`, so it does not touch
  that path.
- Lethal paths already exist everywhere (hold past 0.3 s, grab kill, hang-down neck snap, RT-held strike). G127 is a
  level check (`scripts/level-checks/perfect.mjs`); Perfect is `kills === 0` in `game/sectors.ts:894-899`. Nothing here
  touches scoring: the scene has no rating (piano-escape A9).
- Double: `DUAL_WINDOW` 1.5 s (`game/dualTakedown.ts:2`).

Knife
- `src/weapons/knifeModel.ts`: render only, on `rig.wristR`; `show(on)` :36-40 sets `rig.holdingKnife`; built in
  `playerWeapons.ts:254`; nothing calls `show` (:137). `weapons/assets/knife.glb` exists. No knife weapon or verb, no
  tip point. Remote avatars have no knife model.

Mocap
- Mixamo pipeline `scripts/mocap/`: `mixamo.mjs` + `py/mixamo_dump.py`, `mixamoTake.mjs`, `mixamoMap.mjs`,
  `mixamoEmit.mjs` (recipes `scripts/mocap/data/mixamo-clips.json`) to `src/anim/clips/mixamo/<slug>.ts` (keyed, 40 fps
  one-shots), rows in `src/anim/mocapSources.ts` :74-213 (credit `MIXAMO_CREDIT` :26) and `docs/art-credits.md` (the
  Mixamo table :50, "Used by" column; enforced by `tests/mocapSources.test.ts`). Raw FBX in
  `C:/NightShift/scratch/mixamo/clips/`, never committed.
- In the repo now: `cross_punch` (:98, art-credits :71), `crouch_to_stand`, `elbow_strike`, `pistol_idle`,
  `cover_idle`, `standing_idle`; Studio-only Pro Rifle Pack deaths `studio/rifle_death_from_the_back | _the_front |
  _right | ...` (art-credits :154 "Anim Studio only"). Hand-keyed `keyed/hold_knife` + `guard_knife_collapse` exist but
  are hand-keyed (G399: rollback only), so not used. No knife, stab or paired kill capture; no CMU fight clip.
- Guards never play keyed sets (`AnimInput.keyedOk` off, `tests/mocapGuards.test.ts`), but a drive plays any keyed
  clip on a guard rig: the Studio's hold pairs (`studio.ts:367-370`) put Wren's clip and the guard's on one clock
  (`game/studioStage.ts:515-540`) through `AnimGraph.drive` (`animGraph.ts:730`, hook :2119). The game never sets
  `drive`.

Co-op wire (`src/net/protocol.ts`, `PROTOCOL_VERSION` 71 :21)
- `td {target, ph start|done|abort, lethal, kind?}` :302, parsed :945-949. A client sends `kind` only on `done` and
  only in course mode (`coopClient.ts:208-210` keeps `tdKind` in course mode; sent at :508). Host `onTakedown`
  `coopHost.ts:888-937`: denies or seizes on `start`, applies on `done`, noise `m.lethal ? 3 : 1.2` (:933),
  `mode.onRemoteTakedown(kind)` :935; `tdDenied` :261.
- Attacker pose on other screens: MoveState `takedown` (`localMoveState.ts:61-67`: `tid`, `ph` = blow phase, `sub`
  `TAKEDOWN_SUB_BLOW = 1`, `player/moveState.ts:65-67`, decoded :426-439; `remoteAvatar.ts:589`).
- Victim pose on other screens: only for `grab`: `remoteAvatar.ts:470-472` (`holdTid`) to the held-puppet loop
  `coopClient.ts:1188-1200` (poses one guard, `break`) to `EnemyPuppet.remoteHeld` (`enemyPuppet.ts:354`); the host
  poses a client's seized guard at `coopHost.ts:1752-1797`.
- Open PR #599 (coop-kit K0) edits `coopHost.ts`, `coopClient.ts`, `protocol.ts`, `moveState.ts`.

Intro pose pieces
- Pistol low ready: `animGraph.ts:575-579` `PISTOL_READY`, `WREN_PISTOL_READY` :597, blend :1573-1575.
- Back to wall: `player/wallController.ts` (`WallCore` :302, `enter` :430); `WALL_READY` :617 (gun tucked),
  `WALL_STANCE` :634; the keyed wall idles play only holstered (:2032-2034).
- Breathing: procedural `BREATH` :494 (about 4 mm at the head, 3 s cycle, after 2 s still, off when aiming).
- Empty pistol: the `pistolSd` GLB is body + mag (`weaponMesh.ts:43-45`; `build_weapon.py:39` joins the parts; the
  authored parts in `weapons/assets/pistolSd.json` include `slide`). Only the mag moves (`weaponModel.ts:194-245`).
- Close-up mesh: hero LOD for registered close-ups (`operators/runtime/figure.ts:211, 552`; `world/menuScene.ts:359`).

Campaign's scene (answers ~20:20; `docs/piano-escape/PLAN.md` on origin/feature/piano-escape 04708b842)
- Map `underhollow` (`src/world/maps/underhollow.ts`, `MapDef.scene: 'piano'`), joins `MAPS` only with the flag on;
  dev URL `?piano=1&autostart=underhollow&mode=sector`. Flag `pianoEscape: darkFlag(params.get('piano'), PREVIEW_ON)`
  (Campaign S1).
- Scene switch: `src/game/pianoScene.ts` (Campaign S1 / S2; not on any branch yet) sets it when play starts after the
  EMP and clears it when the scene ends; it is the only caller of `setKnifeScene`.
- 8 guards, all armed standard (no heavies, enforcers, dogs, shields). Approaches: behind standing for all; corners G2
  (dock crate), G4 (corridor door), G7 (spray booth); crouched behind low cover G1, G3, G8 (piano frames 1.0 m,
  pallets, pianos); no drops, ledges or windows; G5 + G6 the co-op double.
- Exit: Sector objective `clear` (every section guard dead or KO, then every living player in the exit zone); bodies
  carry and hide as built.
- Intro: two operators, wall W1 in the loading dock (x 6, z 3-7, 3 m high), players at (5.6, 4.2) and (5.6, 5.6) backs
  to the wall; track 0-38 s, held on the EMP prompt; pose in shot from 3 s, chest close-up 3-16 s, pull-back 16-38 s.
  Campaign S2 uses `wall_idle` + the pistol stance until ours.

## 2. Design
2.1 The gate (BRIEF A1). `knifeSceneOn(flagOn, scene, live)` in `src/game/knifeKill.ts` (pure): `flagOn && live &&
scene === PIANO_SCENE` (`'piano'`; `PIANO_MAP_ID = 'underhollow'` for tests and docs). Campaign's `pianoScene.ts` calls
`takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` when play starts after the EMP and
`setKnifeScene(false)` when the scene ends; nothing else writes it (`TakedownController.knife` defaults false). What
keeps it in: (a) a unit test runs the gate over every `MAPS` and `DEV_MAPS` entry with flag and live on and off (true
only for a `scene: 'piano'` map with both on; Campaign's entry is picked up when it lands); (b) in co-op the host
denies a `td` start with `kind: 'knife'` unless its own switch is on (S3); (c) the knife clips load by dynamic
`import()` from `setKnifeScene(true)`, so other modes never load them. Scoring is untouched.

2.2 The paired knife kill (solo, host; A2, A14). With the switch on every human guard offer is a knife kill on one
press: `start` forces `lethal`, `decided`, no grab; knife shown from the press. Attacker: today's approach (along the
plan), then a captured clip on his graph through `KillDrive` (2.3). Victim, attached for the whole move: from the grab
(the grip hand's reach-in over the last 45% of the approach, as `grabHands`) his root and facing are set every fixed
step and again every render frame from the attacker's current root and yaw plus the row's offset (`standoff`, `side`,
`yawOff`); over the grab the offset eases from where he stood to the row's spot, so a corner kill pulls him round the
corner (Campaign PB3). His clip plays on the same clock. Contacts by hand IK (2.4). At contact a buckle layer folds his
spine and chest. At the row's `limp` mark `finish` kills him (`applyDamage`) with `KNIFE.noise` 1.2 m; his hands and
the grip release over 0.15 s and the ragdoll takes his last pose (A6). The attacker's clip plays to its end and blends
out; then the knife hides and he is free. No `killWarp` tail on a knife row. Damage to the attacker before contact
aborts as today; after contact the kill finishes at once. Rows at -1 (a kind without a row, a victim without
`knifeVictim`, clips not yet loaded): today's move, lethal forced, knife shown.

2.3 `KillDrive` (`src/anim/killDrive.ts`, pure, no allocation): `{ clip, phase, w, mirror, buckle, bucklePitch }` on
a new `AnimGraph.kill` field (null by default), applied right after the studio hook (`animGraph.ts:2119`): the clip
sampled at `phase` into a preallocated scratch pose, mixed into `o.keyed` by `w`, `o.keyW` / `o.keyArmW` raised to `w`,
then `buckle * bucklePitch` added to spine (40%) and chest (60%) pitch. Feet planted (pace 0). It does not read
`keyedOk`, so it plays on guard rigs. The studio drive stays studio-only.

2.4 Contacts (`src/game/knifePair.ts`, render frame, allocation-free; A14). Attacker left hand: the grip (mouth from
behind: head + 0.09 m forward, 0.07 m down, as the interrogation jaw hold :776-781; shoulder at a corner or front),
weight in over the grab, held to `limp`, out over 0.15 s. Attacker right hand (knife): a wind-up point to the row's
target bone (kidney from behind, neck at a corner, chest from the front) over the last 0.12 s before contact, held on
the target to `limp`; the target is the knife tip (`KnifeModel.tipWorld`), not the wrist. Guard's hands: on the
attacker's gripping forearm at 0.40 and 0.75 of elbow to wrist, in from 0.1 s before contact, held to `limp`. The rule:
grip palm, knife tip and each guard palm within 3 cm of their marks at every sample while in contact (bible 5.12.2);
`contactErrors` measures them for tests and the S2 measure script. On other screens S3 drives the same function from
the remote attacker's rendered frame, so the rule holds on host and client.

2.5 Rows `KNIFE_KILLS` (A3, A15), wire-stable order `['behind', 'behindLow', 'corner', 'front']` (3 bits). Each row:
attacker clip, victim clip, `seconds` 1.3, `contact` 0.45, `victimFrom` 0, `limp` 0.8, `standoff` 0.55, `side` 0,
`yawOff` (0, front pi), `grip`, `target`. Starting values only. S1 stand-ins (A8): attacker `mocap_cross_punch`
(behind, corner, front), `mocap_crouch_to_stand` (behindLow); victim `mocap_rifle_death_from_the_back` (behind,
behindLow), `_from_right` (corner), `_the_front` (front). S2 pairs (Campaign answers): Stabbing + Falling Forward Death
(behind), Standing Melee Attack Downward + Falling Back Death (corner), Stabbing + Dying (front and the crouched rise),
or a CMU 18-23 two-person take if one fits. `pickKnifeKill(kind, crouched)`: behind -> 0 / 1, corner and overCover ->
2, front and side -> 3, else -1. No slash row (A10, Michael ~20:05). Palm strike off (S1, outside the pure file):
with the switch on, `gameState.ts:2191-2192` passes no strike start to `StrikeController` (RT tap / hold / altFire do
nothing) and `takedownController` takes no non-lethal path, so the only takedown is the paired knife kill.

2.6 Co-op (S3; G400). No new message. A client with its switch on sends `kind: 'knife'` on `td` `start` and `done` in
every mode (today only `done`, only course). The host denies a knife `start` when its own switch is off, and uses
`KNIFE.noise` for a client's kill only when its switch is on (else today's `m.lethal ? 3 : 1.2`). MoveState
`takedown`: `TAKEDOWN_SUB_KNIFE = 2` (next to `TAKEDOWN_SUB_BLOW = 1`), row `(sub >> 2) & 7`, `ph` the drive phase
0..1. Other screens: the attacker's remote rig plays the same `KillDrive` from `sub` / `ph` with a `KnifeModel`; the
victim: on a client the held-puppet loop (`coopClient.ts:1188-1200`) also takes a knife `takedown` (`EnemyPuppet`
`knifeVictim`), on the host the seized-guard step (`coopHost.ts:1752`) poses a client's victim; both use `knifePair`
from the remote attacker's rendered frame. The held-puppet loop poses one guard (`break`): enough for 2 players.
Double (A4): two kills inside `DUAL_WINDOW` raise `dualTakedown` as today; S3 checks the two victims fall clear. RT in
the scene (A10): the host also refuses a client's RT close strike while its switch is on (no slash, no palm strike).

2.7 Intro pose (S4; A11, A12; Campaign PB6). `introPose(on, variant: 'stand' | 'mirror' | 'crouch')` on the player:
`WallCore.enter` on the given wall spot (Campaign: W1, players at (5.6, 4.2) and (5.6, 5.6), backs flat to it), the
pistol drawn at low ready in both hands, slide locked back, a 4 s breathing cycle on the trunk (the captured
`breathing_idle`, CLIP-LIST I1, through a held drive with the arms left on the gun; until it is downloaded the
on-disk `standing_idle` trunk plus the procedural `BREATH` at a 4 s cycle for this pose only), the hero mesh
(`closeUp`). Campaign's intro turns it on at 3 s and off when play starts. The pistol is rebuilt with a separate
`pistolSd-slide` mesh; `WeaponModel.slideLock(on)` moves it back (start 0.02 m, from `partBounds.slide`).

## 3. Claims
Files (Player Build; files of other owners get one-line hooks only):
- New: `src/game/knifeKill.ts` (S1 writes; afterwards S2 only edits it, S3 reads), `src/game/knifePair.ts` (S1, S3),
  `src/anim/killDrive.ts`, `tests/knifeKill.test.ts`, `tests/killDrive.test.ts`, `tests/knifePair.test.ts`,
  `tests/knifeTakedown.test.ts` (S1), `tests/knifeWire.test.ts` (S3), `tests/introPose.test.ts` (S4b),
  `scripts/mocap/knifePairs.mjs` (S2), `src/anim/clips/mixamo/knife/*.ts` (S2, generated), `docs/piano-knife/*`.
- Edited: `src/game/takedownController.ts`, `src/game/gameState.ts` (menu rows :1518-1525 and the strike start
  :2191-2192, S1), `src/ai/enemy.ts`
  (`knifeVictim` beside `beginTakedown`; Guard AI told), `src/anim/animGraph.ts` (the `kill` field and one hook line),
  `src/weapons/knifeModel.ts` (`tipWorld`), `src/anim/studio.ts` + `src/game/studioStage.ts` (knife pair rows),
  `docs/art-credits.md` ("Used by" for the S1 stand-ins; S2 rows), `src/anim/mocapSources.ts`,
  `scripts/mocap/data/mixamo-clips.json` (S2), `src/player/moveState.ts`, `src/game/localMoveState.ts`,
  `src/net/remoteAvatar.ts`, `src/net/enemyPuppet.ts`, `src/net/coopClient.ts`, `src/net/coopHost.ts`,
  `src/net/protocol.ts`, `src/weapons/weaponMesh.ts`,
  `src/weapons/weaponModel.ts`, `scripts/weapons/py/build_weapon.py`, `src/weapons/assets/pistolSd.glb` (S4a),
  `docs/systems/takedowns.md` ("Knife kills (piano scene)", S1).
- Not touched: `src/core/flags.ts` (Campaign owns `pianoEscape`), `src/game/pianoScene.ts` (Campaign writes the two
  `setKnifeScene` calls), the map, camera, music and EMP files, guard AI.
- Overlaps, named: (1) open PR #599 (coop-kit K0) edits `coopHost.ts`, `coopClient.ts`, `protocol.ts`, `moveState.ts`:
  S3 starts from master after #599 merges (or rebases onto it before its first commit). (2) Campaign S4 edits
  `coopHost.ts`, `coopClient.ts` for the scene's co-op. Split: Campaign S4 does the revive cap (`coopHost.ts:205`), the
  client's intro end on the host's EMP and the two-tab `e2e-piano`; Player S3 does the `td` knife kind, the host gate and
  noise, the MoveState sub bits, the remote attacker and victim poses and the host's refusal, while its switch is on, of a client's RT strike (`cmove` strike) and of any non-knife `td start`. Campaign S4 waits for S3
  (PB4); if they overlap in time, the second to merge rebases.
- Wire: `td.kind` value `'knife'` on `start` and `done`; MoveState `takedown` `sub` bits 1-4 (S3).
  No new message, no `PROTOCOL_VERSION` bump (the train does it). Save paths: none. Maps: none.

## 4. Slices
Campaign's asks mapped (their PLAN "Player Build asks"): PB5 scene switch -> S1; PB1 behind standing -> S1 (paired, on
stand-ins), real clips S2; PB2 crouched rise -> S1 row `behindLow`, clips S2; PB3 corner pull-round -> S1 row
`corner`, clips S2; PB4 double side by side with the remote pose -> S3; PB6 intro pose -> S4a + S4b. PB1, PB4 and PB5
block Campaign S4, so S1 then S3 go first.

- S1 Paired knife kill core, solo / host, on stand-ins (Opus, ~1200 lines with tests; `src/ai/enemy.ts` is an AI file,
  so two independent Opus checkers). PB5 + PB1 (+ PB2, PB3 rows). Full brief: `S1-BRIEF.md`. Depends: nothing.
- S3 Co-op (Opus, ~800; `src/net`, two independent Opus checkers): 2.6. Starts after S1 merges and
  after #599 merges. Reads `knifeKill.ts`, never edits it. Tests: `tests/knifeWire.test.ts` (sub bits round trip;
  host denies knife `start` with its switch off; host noise 1.2 only with it on; both bodies sampled from one phase
  within 3 cm; two kills inside `DUAL_WINDOW` on guards 1-2 m apart end with bodies at least 0.5 m apart; switch on: the host
  ignores a client's `cmove` strike and refuses a non-knife `td start`, so no client knockout; switch off: unchanged),
  `tests/moveState.test.ts`, `tests/protocolConst.test.ts`, `tests/elbowStrike.test.ts`. Laptop: exactly `e2e-coop` +
  `e2e-netmove` + `e2e-ctcourse`; the scene's two-page run is Campaign S4's `e2e-piano`. Must land before Michael walks
  the scene (A10).
- S2 Knife clips (Opus, ~450): when Michael has signed in to Mixamo and the CLIP-LIST clips are downloaded. Owns
  `knifeKill.ts` edits (table only). Also checks CMU two-person subjects 18-23 for a grab-from-behind / struggle take
  (both sides from one capture, retargeted onto Wren and the guard rig, G406; credited); if one fits it replaces the
  `behind` pair. The CLIP-LIST rows through `mixamoEmit.mjs` into `clips/mixamo/knife/`, rows in `mocapSources.ts` and
  `art-credits.md`, `KNIFE_KILLS` pointed at them; `scripts/mocap/knifePairs.mjs` measures each pair headless with
  `contactErrors` and writes `standoff` / `contact` / `victimFrom`. Tests: `tests/knifeKill.test.ts`,
  `tests/knifePair.test.ts` (3 cm at every sample per row), `tests/mocapSources.test.ts`. Laptop: `affected-e2e`, and
  the lead requests `e2e-coop` + `e2e-netmove` (src/game) as the checker gate. Can run parallel with S3.
- S4a Empty pistol slide (Sonnet from an Opus brief, ~200 + a GLB rebuild on the desktop under `heavy.lock`, Blender
  `-b`): separate slide mesh, `slideLock(on)`. Tests: a weapon mesh unit test; laptop `e2e-weapons-carry`. Parallel
  with S1 (the lead's second builder).
- S4b Intro pose (Opus, ~400): 2.7 `introPose(on, variant)` for Campaign. Tests: `tests/introPose.test.ts` (pose set
  and cleared, both variants, 4 s breath, no allocation); look video from a Studio row, then in the scene. Laptop:
  `affected-e2e` + `e2e-coop` + `e2e-netmove` (src/player). Depends: S4a (I1 optional, swapped in when downloaded).
- Dropped: the old S5. Ledge, drop, hang-down and window rows are gone (the map has none); the RT slash is dropped (Michael ~20:05: "no slashing").

Order: S1 and S4a now (2 builders). Then S3 (after #599) and S2 (when the clips land) in parallel: S2 alone edits
`knifeKill.ts`. Then S4b. The walk cap counts the scene as one feature with Campaign's.

## 5. Campaign: answered and still to send
- Answered (~20:20): Q-C1 map `underhollow`, switch in `pianoScene.ts`; Q-C2 `pianoEscape`; Q-C3 8 armed standard
  guards; Q-C4 approaches (section 1); Q-C5 intro (section 1, A11); Q-C6 knife only press to free (A2, A13); Q-C7
  `clear` counts dead or KO, bodies carry and hide.
- Sent back with this round (via the orchestrator): the timings (A15: contact about 0.8 s, limp about 1.26 s, free
  about 1.67 s, inside the bible's 1.0-1.5 s takedown, which wins over PB1-PB3's numbers); the gate call for
  `pianoScene.ts` (2.1); the co-op split (section 3); the corner row pulls the guard to the attacker's side of the
  corner (PB3).
