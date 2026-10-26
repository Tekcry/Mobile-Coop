# piano-knife: plan
Owner: Night Shift | Player Build. Status: current. Planner: Opus. Base: master 1b58989ed.

Knife kill animations (co-op, quiet, this scene only) and the intro pose (empty pistol, breathing, back to the wall) for
the piano escape scene. Words and assumptions: `BRIEF.md`. Prototype mode: starting values, one closest test set per
slice, no tuning or polish passes. Only S1 is planned in full; S2-S5 are outlines, briefed in full 2-3 slices ahead.

## 1. How it works today (file:line on 1b58989ed)
Takedowns
- Pure geometry `src/game/takedown.ts`: `TakedownKind` :11 (behind, front, side, overCover, corner, above, below,
  window, drop, inverted, hangDown, assist); `TAKEDOWN` :16-56 (reach 1.8 m, standoff 0.55 m :31, approach 0.22 s,
  strike 0.7 s, `lethalHold` 0.3 s); `GRAB` :99-117; plan shape :174-194; `pickTakedownInto` :265.
- `src/game/takedownController.ts` (876 lines): noise radii :24-25 (choke 1.2 m, lethal 3 m); `offer` :93; `start`
  ~:240-290 (grab decided :256, `e.beginTakedown` :269); `find` :289-330 (skips dead, dogs, taken, alert-and-spotted);
  `tryVictim` :332-391; run step :670-760 (tap / hold decides lethal :675-682, damage aborts :684); `finish` :812-846
  (lethal `applyDamage` / `knockOut`, `hear` :844, `takedown` event). Created in `gameState.ts:113`.
- Menu: the takedown is a hold-A row (`gameState.ts:1518-1525`, `TD_LABEL` :334); `ctxRun` :1584-1588. The weapon is
  stowed during a takedown (`gameState.ts:2200`).
- Guard side: `Enemy.beginTakedown` `src/ai/enemy.ts:835-871` (taken, struggle emote `GuardCq`), `die` :2345-2372,
  `knockOut` :2378, `killOutright` :2387. Body / ragdoll: `src/ai/body.ts:105-119`; carry and hide: `game/bodyCarry.ts`
  (`DROP_NOISE` 3 :16), `game/stealthSystems.ts:173-179, 289-305`.
- Attacker pose: procedural `pose.melee = killWarp(...)` (`strikeBody.ts:117-148`, `animGraph.ts` `strikeShot` ~:2441);
  hand IK onto the victim (`takedownController.ts:727-794`). No capture plays in a takedown.
- "Kill blow needs a kill bit first" (`src/anim/mixamo.ts:124-128`, `docs/mixamo-retarget/I5-REPORT.md:70-75`): the
  lethal blow reaches `strikeShot` on the strike's arc, so the Mixamo strike rows stay off until a kill bit exists. The
  knife kill below never sets `pose.melee`, so it does not touch that path.
- Lethal paths already exist everywhere (hold past 0.3 s, grab kill, hang-down neck snap, RT-held strike). G127 is a
  level check (`scripts/level-checks/perfect.mjs`); Perfect is `kills === 0` in `game/sectors.ts:894-899` (kills minus
  knockouts, `sectorMode.ts:1070-1074`). Nothing here touches scoring: the scene has no rating (piano-escape A9).

Knife
- `src/weapons/knifeModel.ts`: render only, on `rig.wristR`; `show(on)` :36-40 sets `rig.holdingKnife`
  (`characterRig.ts:776`, hand shape `tuneHands.ts:197`); built in `playerWeapons.ts:254`; nothing calls `show` (:137).
  `weapons/assets/knife.glb` exists. No knife weapon or verb. Remote avatars have no knife model.

Mocap
- Mixamo pipeline `scripts/mocap/`: `mixamo.mjs` + `py/mixamo_dump.py` (Blender dump), `mixamoTake.mjs`,
  `mixamoMap.mjs`, `mixamoEmit.mjs` (recipes `scripts/mocap/data/mixamo-clips.json`, kinds gait / loop / timed) to
  `src/anim/clips/mixamo/<slug>.ts` (keyed, 40 fps one-shots), rows in `src/anim/mocapSources.ts` :74-213 (credit
  `MIXAMO_CREDIT` :26) and `docs/art-credits.md` :36-48 (enforced by `tests/mocapSources.test.ts`). Raw FBX in
  `C:/NightShift/scratch/mixamo/clips/`, never committed. Spec: `docs/mixamo-retarget/PLAN.md:30`.
- Already emitted and usable now: `cross_punch`, `elbow_strike` (game folder, `MIXAMO_ON` false), the Pro Rifle Pack
  deaths `studio/rifle_death_from_the_back | _the_front | _right | _front_headshot | _back_headshot |
  _crouching_headshot_front`, `pistol_idle`, `cover_idle`, `crouch_to_stand`. No knife, stab or paired kill exists; no
  CMU fight clip (`docs/mocap-trial/SOURCES.md`).
- Guards never play keyed sets (`AnimInput.keyedOk` off, `characterRig.ts:1817`, `tests/mocapGuards.test.ts`). But a
  drive plays any keyed clip on a real guard rig: the Anim Studio's hold pairs (`studio.ts:367-370`, e.g. `hold_knife`
  + `guard_knife_collapse`, hand-keyed) put Wren's clip and the guard's on one clock (`game/studioStage.ts:515-540`)
  through `AnimGraph.drive` (`animGraph.ts:730`, hook :2119, `studioDrive.ts:66-80`). The game never sets `drive`.

Co-op wire (`src/net/protocol.ts`, `PROTOCOL_VERSION` 71 :21)
- `td {target, ph start|done|abort, lethal, kind?}` :302, parsed :945-949 (`kind` any string); host `onTakedown`
  `coopHost.ts:888-937` (deny rules, `TD_REACH` 3 m :84, `beginTakedown`, `applyDamage` / `knockOut`, `hear` 3 / 1.2 m,
  `mode.onRemoteTakedown(kind)`); `tdDenied` :261. A client runs its own controller on puppets (`coopClient.ts:265`,
  sends `td` :508).
- Attacker pose on other screens: MoveState `takedown` (`localMoveState.ts:61-67`: `tid`, `ph` = blow phase, `sub` bit
  `TAKEDOWN_SUB_BLOW` = 1, `player/moveState.ts:65-67`, decoded :426-439; `remoteAvatar.ts:589`).
- Victim pose on other screens: only for `grab` today: `remoteAvatar.ts:470-472` (`holdTid`) to `coopClient.ts:1188-1200`
  to `EnemyPuppet.remoteHeld` (`enemyPuppet.ts:354-387`); the host poses a client's seized guard at `coopHost.ts:1752-1797`.

Intro pose pieces
- Pistol low ready: `animGraph.ts:575-579` `PISTOL_READY`, Wren's `WREN_PISTOL_READY` :597, blend :1573-1575.
- Back to wall: `player/wallController.ts` (`WallCore` :302, `enter` :430); pose `WALL_READY` :617 (gun tucked),
  `WALL_STANCE` :634, `WALL_BLOCK` :661 (pistol butt / pull :1683-1684); drawn wall path :1612-1624; the keyed wall
  idles (with breaths, `wallKeyed.ts:17-24`) play only holstered (:2032-2034).
- Breathing: procedural `BREATH` :494 (about 4 mm at the head, 3 s cycle, after 2 s still, off when aiming),
  :1514-1541. No breathing audio.
- Empty pistol: the `pistolSd` GLB is two meshes, body + mag (`weaponMesh.ts:43-45`; `build_weapon.py:39` joins all
  parts; the authored parts in `weapons/assets/pistolSd.json` include `slide`). Only the mag moves
  (`weaponModel.ts:194-245`). Dry-fire hook `playerWeapons.ts:70`. No slide lock.
- Close-up mesh: the hero LOD only for registered close-ups (`operators/runtime/figure.ts:211, 552`; set like
  `world/menuScene.ts:359` `g.closeUp`). No scripted camera or gameplay pose override exists (`letterbox`
  `gameState.ts:3827` is the nearest).

Flags / maps: `darkFlag(.., PREVIEW_ON)` (`core/flags.ts:135-142`, e.g. :99 / :219); `MAPS` / `DEV_MAPS` / `getMap`
(`world/maps/index.ts:22-31`). Campaign's flag is `pianoEscape` (piano-escape BRIEF A1); the map id is not chosen yet.

## 2. Design
2.1 The gate (BRIEF A1). `knifeSceneOn(flagOn, mapId)` in `src/game/knifeKill.ts` (pure): `flagOn && mapId ===
PIANO_MAP_ID`. Campaign's scene start calls `takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.id))` once (the
only caller); `TakedownController.knife` defaults false and nothing else writes it. What keeps it in:
(a) a unit test runs the gate over every `MAPS` and `DEV_MAPS` id with the flag on and off (true only for the piano map
with the flag on); (b) the host denies a `td` with `kind: 'knife'` unless its own controller has `knife` on, so a
modified client cannot kill this way elsewhere; (c) the knife clips load by dynamic `import()` from
`setKnifeScene(true)`, so other modes never load them. Scoring is untouched: kills in the scene count as kills; the
Perfect / G127 code and the level check stay as they are.

2.2 The knife kill (solo, host, a client's own). In the scene every human guard offer becomes a knife kill: the hold-A
row keeps its label, `start` forces `lethal` and skips the grab (A2). Attacker: the existing approach (kinematic along
`approachPoint`, unchanged), then a captured attacker clip played by a game drive (`KillDrive`, 2.3) on the attacker's
graph, the knife shown for the move (`knife.show`), the weapon stowed as today. Victim: the struggle as today during the
approach, then the victim clip on the guard's graph on the same clock, placed by the plan's alignment; at the row's
`limp` mark `finish` kills him (`applyDamage`, hit `takedown: 'knife'`) and the body becomes the ordinary dead body
(ragdoll), so carry, hide and discovery are as built (A6). Noise `KNIFE.noise` 1.2 m (A5). The attacker clip plays to its
end, then the drive blends out and the knife hides. Damage or the victim dying mid-move aborts as today. Kinds with no
knife row yet (above, drop, hangDown, window, below, inverted) keep today's lethal move with the knife shown (S5 adds
clips). Dogs: no takedown, as built.

2.3 `KillDrive` (`src/anim/killDrive.ts`, pure, no allocation): `{ clip, phase, w, mirror }` on a new `AnimGraph.kill`
field (null by default), applied right after the studio hook (`animGraph.ts:2119`): the clip sampled at `phase` with
`MOCAP_LAYERS` into a preallocated scratch pose, mixed into `o.keyed` by `w` (`mixKeyed`), `o.keyW` / `o.keyArmW` raised
to `w`. Feet: pace 0, the planner keeps both planted (as a held studio pair). It works on guard rigs because it does not
read `keyedOk` (the studio drive does not either). The studio drive stays studio-only.

2.4 Approaches as `KNIFE_KILLS` rows (A3): `behind` (standing), `behindLow` (attacker crouched: the clip rises into the
kill), `corner` (also `overCover`), `front` (also `side`). Each row: attacker clip, victim clip, `seconds` 1.3 (bible
1.0-1.5 s), `contact` 0.45 (attacker phase of the stab), `victimFrom` (victim clip phase at contact), `limp` 0.8,
`standoff` (m, attacker to victim at contact; start 0.55 = `TAKEDOWN.standoff`), `mirror` by the side the guard faces.
Starting values only. S1 placeholders (A8): attacker `mocap_cross_punch`; victim `rifle_death_from_the_back` (behind,
behindLow), `rifle_death_from_right` (corner), `rifle_death_from_the_front` (front). S2 swaps in the CLIP-LIST clips and
measures `standoff` / `contact` so the knife tip meets the victim within 3 cm (bible 5.12.2 #11).

2.5 Co-op (S3; G400). No new message. `td.kind = 'knife'` (host gate, 2.1b). MoveState `takedown`: `sub` bit 2
`TAKEDOWN_SUB_KNIFE`, bits 3-5 the `KNIFE_KILLS` row index, `ph` the drive phase 0..1 (not the blow). Other screens: the
attacker's remote rig plays the same `KillDrive` from `sub` / `ph` and shows a knife (a `KnifeModel` on the remote rig);
the victim: on a client, the held-puppet loop (`coopClient.ts:1188-1200`) widens from `grab` to a knife `takedown`
(`EnemyPuppet.knifeHeld(row, ph)`); on the host, the seized-guard step (`coopHost.ts:1752`) poses a client's victim from
the client's MoveState and kills him on the client's `td done` as today. Both bodies sample one clock (the attacker's
`ph`), so contact holds within 3 cm on host and client (the interp delay applies to both alike). Double kill (A4): two
kills inside `DUAL_WINDOW` already raise `dualTakedown`; nothing new.

2.6 Intro pose (S4; A11, A12). `introPose(on)` on the player: wall stance (`WallCore.enter` on the scene's wall spot),
pistol drawn at `WALL_READY`, slide locked back, a captured breathing idle (`breathing_idle`, CLIP-LIST I1) on the trunk
through a held drive with the arms left on the gun (the studio drive's `drawn` rule), the hero mesh (`closeUp`).
Campaign's intro camera turns it on and off; play starts with it off. The pistol is rebuilt with a separate
`pistolSd-slide` mesh (as the mag is); `WeaponModel.slideLock(on)` moves it back (start 0.02 m, from `partBounds.slide`).

## 3. Claims
Files (Player Build; files of other owners get one-line hooks only):
- New: `src/game/knifeKill.ts`, `src/anim/killDrive.ts`, `tests/knifeKill.test.ts`, `tests/killDrive.test.ts`,
  `tests/knifeWire.test.ts` (S3), `tests/introPose.test.ts` (S4), `scripts/mocap/knifePairs.mjs` (S2),
  `src/anim/clips/mixamo/knife/*.ts` (S2, generated), `docs/piano-knife/*`.
- Edited: `src/game/takedownController.ts`, `src/game/gameState.ts` (menu rows :1518-1525 only), `src/ai/enemy.ts`
  (`knifeVictim` beside `beginTakedown`; Guard AI told), `src/anim/animGraph.ts` (the `kill` field and one hook line),
  `src/anim/studio.ts` (knife pair rows for the look video), `src/weapons/playerWeapons.ts` (knife show),
  `src/anim/mocapSources.ts`, `scripts/mocap/data/mixamo-clips.json`, `docs/art-credits.md` (S2 rows),
  `src/player/moveState.ts`, `src/game/localMoveState.ts`, `src/net/remoteAvatar.ts`, `src/net/enemyPuppet.ts`,
  `src/net/coopClient.ts`, `src/net/coopHost.ts` (S3), `src/game/strikeController.ts` and `protocol.ts` `cmove` (S5),
  `src/weapons/weaponMesh.ts`, `src/weapons/weaponModel.ts`, `scripts/weapons/py/build_weapon.py`,
  `src/weapons/assets/pistolSd.glb` (S4), `docs/systems/takedowns.md` (a "Knife kills (piano scene)" section, S1).
- Not touched: `src/core/flags.ts` (Campaign owns `pianoEscape`), the scene, map, camera, music and EMP files, guard AI.
- Wire: `td.kind` value `'knife'`; MoveState `takedown` `sub` bits 2-5 (S3); `cmove` strike lethal bit (S5). No new
  message, no `PROTOCOL_VERSION` bump (the train does it). Save paths: none. Maps: none (Campaign's).

## 4. Slices
- S1 Knife kill core, solo (Opus, ~850 lines). Full brief in section 5. Depends: nothing (placeholder clips).
- S2 Knife clips (Opus, ~450): the CLIP-LIST K and V rows through `mixamoEmit.mjs` into `clips/mixamo/knife/`, rows in
  `mocapSources.ts` and `art-credits.md`, `KNIFE_KILLS` pointed at them; `scripts/mocap/knifePairs.mjs` measures each pair
  headless (knife tip to the victim's target bone at contact) and writes `standoff` / `contact` / `victimFrom`. Tests:
  `tests/knifeKill.test.ts` (+ contact under 3 cm per row), `tests/mocapSources.test.ts`. Laptop: `affected-e2e`; look
  video from the Studio pair rows. Depends: S1, the downloads.
- S3 Co-op (Opus, ~750; two independent Opus checkers): 2.5. Tests: `tests/knifeWire.test.ts` (sub bits round trip, host
  denies `knife` with the gate off, both bodies sampled at one phase), `tests/moveState.test.ts`,
  `tests/protocolConst.test.ts`. Laptop: `e2e-coop` (regression) and, once Campaign's map exists, the scene's two-page
  run (a client knife kill seen on the host and the reverse; look video). Depends: S1 (not S2).
- S4a Empty pistol slide (Sonnet from an Opus brief, ~200 + a GLB rebuild on the desktop under `heavy.lock`, Blender
  `-b`): separate slide mesh, `slideLock(on)`. Tests: a weapon mesh unit test; laptop `e2e-weapons-carry`. Parallel
  with S1.
- S4b Intro pose (Opus, ~400): 2.6 `introPose(on)` for Campaign. Tests: `tests/introPose.test.ts` (pose set and
  cleared, no allocation); look video from a Studio row, and in the scene once it exists. Depends: S4a, download I1.
- S5 More approaches + RT knife slash (Opus, ~700; wire, so two Opus checkers): `above` / `drop` / `hangDown` / window
  rows with clips (K2, V rows), RT in the scene = a knife slash kill (K3), a `cmove` lethal bit so a client's slash kills
  on the host. Tests: `tests/knifeKill.test.ts`, `tests/elbowStrike.test.ts`, `tests/hangDownTakedown.test.ts`; laptop
  `e2e-takedown`, `e2e-coop`. Depends: S2, S3, Campaign's approach list (only the kinds the map affords).

Order: S1 and S4a now, in parallel; S2 when the clips land; S3 after S1 (parallel with S2: different files except
`knifeKill.ts`, where S2 edits only the table); S4b after S4a and I1; S5 last. Switch-on is Campaign's scene flag; the
walk cap counts the scene as one feature with Campaign's.

## 5. S1 brief (Opus builder, Opus checker)
Goal: in the piano scene (gate on), a solo player's or the host's takedown on a human guard is a knife kill: knife in
hand, the attacker clip and the victim clip on one clock, a dead body, 1.2 m of noise. With the gate off every takedown
is exactly today's.
1. `src/game/knifeKill.ts` (pure, Babylon-free): `PIANO_MAP_ID` (placeholder `'piano'` until Campaign names it; one
   constant), `knifeSceneOn(flagOn, mapId)`, `KNIFE = { forceKill: true, noise: 1.2, blendIn: 0.12, blendOut: 0.15 }`,
   `KNIFE_KILL_IDS = ['behind', 'behindLow', 'corner', 'front'] as const` (order is wire-stable for S3), `KNIFE_KILLS`
   rows per 2.4, `pickKnifeKill(kind, crouched): number` (row index, or -1 for kinds without a row; overCover maps to
   corner, side to front), `loadKnifeClips(): Promise<void>` (dynamic imports of the placeholder clips into a module
   table; the hot path reads resolved clips by row, no lookup).
2. `src/anim/killDrive.ts` (pure): `KillDrive`, `newKillDrive()`, `killDriveTargets(d, o)` per 2.3; the scratch pose is
   allocated once per drive. `AnimGraph.kill: KillDrive | null = null` and the one hook line after :2119. Guards and
   players alike; `notePlaying` unchanged.
3. `TakedownController`: `knife = false`, `setKnifeScene(on)` (sets it, starts `loadKnifeClips`), per active `kr` (row,
   -1 off) and `kt` (s since the clip started). `start`: when `knife` and the victim is human: `kr = pickKnifeKill(kind,
   crouched)`; `lethal` and `decided` true at once; no grab; `beginTakedown(false, approach)`; `weapons.knife.show(true)`.
   Run step: after the approach (`a.t >= plan.approach`), `kt += dt`, the attacker's `kill` drive phase `kt / seconds`,
   `w` eased in over `KNIFE.blendIn`; the victim `e.knifeVictim(clip, victimFrom + phase mapped)` on the same phase;
   `holdAt` keeps him at `standoff` along the plan's facing; `blowPh` stays -1 (never `pose.melee`, so `strikeShot` and
   the kill-bit note are untouched). At `limp`: `finish()` with `takedown: 'knife'` and `KNIFE.noise`; the attacker drive
   plays to 1, then blends out over `blendOut`, knife hidden. `abort`: drives cleared, knife hidden. Rows at -1: today's
   code path, lethal forced, knife shown.
4. `Enemy.knifeVictim(clip | null, ph)` (`enemy.ts` beside :835): sets or clears his rig graph's `kill` drive, his emote
   off while it plays; cleared in `die` once the ragdoll takes the pose.
5. `gameState.ts:1523`: with `takedown.knife` on, no grab row; the single `TD_KIND 'ko'` row is offered (label
   `TD_LABEL[kind]`); `ctxRun` unchanged (the controller forces the kill).
6. `studio.ts`: one `holdPair`-style row per `KNIFE_KILLS` row (`pair: knife <id>`) for the look video (the Studio
   loads the clips the same way).
7. `docs/systems/takedowns.md`: a short "Knife kills (piano scene)" section: gate, rows, noise, body.

Checks: `npm run typecheck:fast`; `npx vitest run tests/knifeKill.test.ts tests/killDrive.test.ts tests/takedown.test.ts
tests/takedownAlloc.test.ts tests/mocapGuards.test.ts tests/grabMenu.test.ts`. New tests: the gate truth table over every
`MAPS` / `DEV_MAPS` id; the `pickKnifeKill` mapping; every row's `seconds` in 1.0-1.5 and its clips named in
`mocapSources`; `killDriveTargets` allocates nothing and is identity at `w` 0; a headless controller run with `knife`
off matches today's event sequence, and with it on ends in a lethal `takedown` event of kind `knife` with noise 1.2.
Laptop: the PR head's `affected-e2e` (takedown, anim rows); look video: the Studio rows, behind and corner.
Done looks like: the four Studio pairs play attacker and victim together, knife in hand; gate off = no change.

## 6. Needs from Campaign (answers come from the piano-escape PLAN)
- Q-C1 The map id (`PIANO_MAP_ID`) and where the scene's start hook calls `setKnifeScene`.
- Q-C2 The flag name confirmed as `pianoEscape`, added by Campaign (S1 reads it only through that hook).
- Q-C3 Guard count and types: human only? Any enforcer or heavy (their frontal rules differ)? Any dog (no takedown, so
  it would block "every guard taken down")?
- Q-C4 Approach types the map affords: corners and low cover, crouch routes, drop points (1.1-4.6 m), hang-down lips,
  windows. S5 builds only those.
- Q-C5 Intro: which operator(s) appear (host only or both), the wall spot, the intro length (for the breathing loop),
  and that the intro camera registers a close-up (hero LOD) and calls `introPose(on)`.
- Q-C6 In play: pistol holstered with the knife out only during a kill (this plan's default), or the knife held for the
  whole escape?
- Q-C7 Bodies: does the exit's "every guard down" read `alive` (as here), and may bodies be carried and hidden as built
  (default yes)?
