# marlow-bays - tuner coverage audit (BRIEF item 20)

Audit of `feature/marlow-tuner` (master 4.33.0 + slice T, uncommitted, read 2026-10-21). Read only; no code changed.
Paths are under `src/` unless they start with `scripts/`.

## What the columns mean

- **(a) Loop**: an Anim Studio loop shows it (`anim/studio.ts:137-196`, `anim/studioTraversal.ts:63-175`).
- **(b) Sliders**: a state group of its own in a section (Body, Gun, Hands & feet, Weapon, IK, Stepping, Weight,
  Speed, Co-op, Traversal moves). "shares X" = it uses another state's row, so it cannot be tuned apart.
- **(c) Joints**: a Joints row (`joint.<state>`) for it. A row has 21 joints x pitch / yaw / roll
  (`anim/tuneJoints.ts:21-43`): pelvis, spine, chest, neck, head, shoulder, upper arm, elbow (= forearm), wrist, hip,
  knee, ankle, toe (L / R). Never in a row: fingers (see R1) and a real clavicle (see R2). Joint rows exist only for the
  20 Body states (`anim/tune.ts:24-45`); `selectBodyGroup` gives no row for traversal moves (`anim/tune.ts:435-436`).
- **(d) Keys**: per-key editing in the Keys tab (`anim/tuneKeysFile.ts:21-39`). Keyed clips only (28 clips,
  `anim/tuneKeysMeta.ts`). The axes a key has: pelvis, spine, chest, neck pitch / yaw / roll; per arm "arm forward"
  (flex), "arm out" (abd), "elbow bend", "forearm in" (inward), wrist pitch / yaw / roll. No head, shoulder, forearm
  twist, upper arm twist, pelvis offset, legs or fingers. So every keyed row is at best "P".
- **(e) L / R**: left and right set apart. Joints: yes (mirror lock off by default, `anim/tuneV2Sections.ts:32`).
  Hands & feet: yes (per hand / foot fields). Keys on a mirrored clip: no (an edit on key k also writes the other arm
  at k + half a cycle, `anim/tuneKeys.ts:128-131`). Co-op and Traversal moves: no (one "hands out" for both hands,
  `anim/moveTune.ts:66-80`).
- **(f) Bake**: `scripts/anim-tune-bake.mjs` writes it back. Joints, Hands & feet, IK and Weapon are always "manual"
  (no code target, `anim/tuneBakeTable.ts:314-316`); Co-op and Traversal moves too (`anim/tuneBakeTable.ts:327-329`).
  Keys bake into the key JSON, then a Blender rebake by hand (`scripts/anim-tune-bake.mjs:126-129`). Body bakes only
  strideMul, climb knee out / lift and peekLean (`anim/tuneBakeTable.ts:110-127`); Gun, Camera, Speed, Stepping and
  Weight bake in part.

Two facts that hold for every row: Joints, Hands & feet, IK and Weapon act on the local player only
(`player/player.ts:546-549`, `anim/tuneJoints.ts:7-10`); the co-op partner and a pair's role B rig see the defaults.
And as nothing in those sections bakes, every Joints edit today is preview only.

Y = yes, P = partial, N = no.

## Coverage table

### Standing, holstered

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Idle | Y state + idle clip | Y idle | Y | P idle, 12 keys | Y | P keys JSON only |
| 2 | Walk | Y state + clip | Y walk | Y | P 4 keys, mirrored | P Joints yes, Keys no | P keys JSON; strideMul |
| 3 | Jog | Y | Y jog | Y | P mirrored | P | P |
| 4 | Run | Y | Y run | Y | P mirrored | P | P |
| 5 | Sprint / dash (DASH clip, `anim/clips/locomotion.ts:135`) | N | P shares run | P shares run | N procedural | Y | N |
| 6 | Walk back, strafe L / R (`anim/clips/locomotion.ts:153-183`) | N | P shares walk / jog | P shares walk | N | P strafe L is a mirror of R | N |
| 7 | Start, stop, turn, pivot (`anim/clips/actions.ts:217-252`) | N | P Weight start / stop / turn | P the gait's row | N | Y | P Weight rules |

### Crouch

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | Crouch idle / kneel | Y state + clip | Y crouchIdle | Y | P 12 keys | Y | P keys JSON |
| 9 | Sneak | Y | Y sneak | Y | P mirrored | P | P |
| 10 | Tense sneak near a guard (TENSE_SNEAK) | N | P shares sneak | P shares sneak | N | Y | N |
| 11 | Crouch walk | Y | Y crouchWalk | Y | P mirrored | P | P |
| 12 | Crouch run | P clip only, no state loop | P shares crouchWalk (Stepping has crouchRun) | P shares crouchWalk | P mirrored | P | P |
| 13 | Crouch back, crouch strafe | N | P shares crouchWalk | P shares crouchWalk | N | P strafe L is a mirror | N |

### Armed: carry, aim, weapon actions

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | Low ready still, rifle | P lowReady / ready_stance with the equipped gun, no gun pick | Y Body lowReady, Gun rifle.lowReady, Hands / Weapon rifle | P one lowReady row for every gun | P trunk only: keyed arms are off with a gun (`anim/animGraph.ts:1525`) | Y | P Gun READY_POSES.low |
| 15 | Low ready still, pistol | P as 14 | Y pistol.lowReady | P shares 14 | P as 14 | Y | P Gun PISTOL_READY |
| 16 | Low ready walk / jog / run (drawn speed set) | N | P shares walk / jog / run + Gun lowReady | P shares the holstered rows | P via walk / jog / run keys, arms off | P | P |
| 17 | Aim standing still, rifle | N (item 19) | Y Body aim, Gun rifle.aim | P one aim row for glides and guns | N no clip | Y | P Gun SIGHT_RAISE |
| 18 | Aim standing still, pistol | N (item 19) | Y pistol.aim | P shares 17 | N | Y | P Gun PISTOL_REACH |
| 19 | Aim glide forward | Y state + clip | Y aim | P shares 17 | P keys exist but the glide's trunk and arms are not applied in play (`anim/animGraph.ts:1525,1536`) | P mirrored | P |
| 20 | Aim glide strafe | Y | Y aim | P shares 17 | P as 19 | N left strafe is the right one mirrored (`anim/animGraph.ts:1782-1785`) | P |
| 21 | Aim glide back | Y | Y aim | P shares 17 | P as 19 | P mirrored | P |
| 22 | Crouch aim still | N (item 19) | Y aimCrouch, Gun rifle / pistol.aimCrouch | Y aimCrouch | N | Y | P Gun |
| 23 | Crouch aim moving | N (item 19) | Y aimCrouch | Y shares 22 | N | Y | P Gun |
| 24 | Wall block (gun pulled in near a wall) | N | N own; the aim rows | P the stance row | N | Y | N |
| 25 | Fire, recoil kick | N | N | P the stance row | N | Y | N |
| 26 | Reload rifle, tactical and empty (`anim/clips/actions.ts:15-62`) | N | P Hands offsets move its targets too | P the stance row | N procedural | Y | N |
| 27 | Reload pistol, tactical and empty | N | P as 26 | P | N | Y | N |
| 28 | Weapon swap, draw, holster | N | N | P | N | Y | N |
| 29 | Weapon changes hands (handSwap) | N | N | P | N | Y | N |
| 30 | Knife in hand | N no weapon pick | P Hands / Weapon knife rows; no Gun group | P | N | Y | N |
| 31 | Launcher in hand | N | P Hands / Weapon launcher rows; no Gun group | P | N | Y | N |
| 32 | Jammer (pistol aimed, `game/jammer.ts`) | N | P = pistol.aim | P aim row | N | Y | P |

### Walls and doors

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | Wall idle | Y clip + trav:wall | Y wallIdle | Y | P 8 keys | P one clip, mirrored for the other wall side (`anim/wallKeyed.ts:4`) | P keys JSON |
| 34 | Wall slide | Y | Y wallSlide | Y | P | P as 33 | P |
| 35 | Wall peek | Y | Y wallPeek | Y | P | P as 33 | P WALL.peekLean |
| 36 | Wall crouch idle | Y clip | P shares wallIdle (`anim/tune.ts:440`) | P shares wallIdle | P | P as 33 | P |
| 37 | Wall crouch slide | Y clip | P shares wallSlide | P shares | P | P | P |
| 38 | Wall crouch peek | Y clip | P shares wallPeek | P shares | P | P | P |
| 39 | Aim at a wall / peek aim | N | P aim gun rows | P wall row | N | Y | N |
| 40 | Door peek | N | N (falls to idle) | P idle row | N | Y | N |
| 41 | Door open, walk through | Y trav:door | P walk | P walk row | N | Y | N |

### Close quarters and bodies

The game's holds are procedural (`game/closeQuarters.ts`). The hold_* and guard_* keyed clips are imported only by the
studio and the Keys table; no game code plays them (grep of `src/`).

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | Grab / seize | N | P hold (guard gap / side) | P one hold row for 42-48 | N | Y | N |
| 43 | Hostage hold still | P pair hold_idle (a studio-only clip) | P hold | P shares hold | P studio-only clip | Y | N in play |
| 44 | Hostage walk forward / back / side | P hold_fwd / back / side, studio only | P hold | P shares hold | P studio-only | Y | N in play |
| 45 | Choke knockout, lowering him | P pair hold_choke, studio only | P hold | P shares hold | P studio-only | Y | N in play |
| 46 | Knife kill | P pair hold_knife, studio only | P hold | P shares hold | P studio-only | Y | N in play |
| 47 | Interrogate | N | P hold | P shares hold | N | Y | N |
| 48 | Body pick-up, carry, drop (bend, `game/closeQuarters.ts:122,144`) | N | P hold | P shares hold | N | Y | N |
| 49 | Elbow strike (melee) | N | N | P the stance row | N | Y | N |

### Traversal: attached

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | Ladder | Y trav:ladder | Y ladder | Y | N procedural (`anim/clips/traverse.ts:56`) | Y Joints, Hands; Body reach one value for both | P CLIMB_KNEE_OUT / UP |
| 51 | Drainpipe climb | Y trav:pipeV | Y pipe | Y | N | Y | P |
| 52 | Pipe legs up, inverted | Y trav:bar | P shares pipe | P shares pipe | N | Y | N |
| 53 | Pipe / bar hang, hand over hand | Y trav:pipeH, bar | Y hang | Y | N | Y | N |
| 54 | Ledge hang, shimmy | Y trav:ledge | Y ledge | Y | N | Y | N |
| 55 | Vent crawl | Y trav:vent | Y crawl | Y | N | Y | N |
| 56 | Vent unscrew, exit (crawlOut, ventDrop) | P in the vent loop | Y vent | Y | N | Y | N |
| 57 | Rappel | Y trav:rappel | P Traversal moves trav.rappel | N | N | N | N |
| 58 | Split brace, brace | N | P trav.split; brace none | N | N | N | N |

### Traversal: one-shots, air

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 59 | Vault | Y trav:vault | P trav.vault + timing | N | N | N | N |
| 60 | Window vault | Y trav:window | P trav.windowVault | N | N | N | N |
| 61 | Mantle | N | P trav.mantle | N | N | N | N |
| 62 | Step up | N | P trav.step | N | N | N | N |
| 63 | Climb up (ledge, ladder, pipe top; climbUpTeam) | P end of the ledge / ladder / pipe loops | P trav.climbUp | N | N | N | N |
| 64 | Drop from a hang | P pipeH / bar loops | P trav.drop | N | N | N | N |
| 65 | Hop | N | P trav.hop | N | N | N | N |
| 66 | Roll | N | P trav.roll | N | N | N | N |
| 67 | Wall kick | N | P trav.wallKick | N | N | N | N |
| 68 | Jump, air, fall | N | N (falls to a gait by speed, `anim/tune.ts:445`) | P a gait row | N | Y | N |
| 69 | Land, deep land | N | P Weight land time | P a gait row | N | Y | P Weight |
| 70 | Dash slide | N | N | P a gait row | N | Y | N |

### Gadgets

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 71 | Gadget throw: frag, gas, flash, noise, sticky cam, mine (GRENADE clip, `anim/clips/actions.ts:198`) | N | N | P the stance row | N | Y | N |
| 72 | Doorway check sweep | N | N | P the stance row | N | Y | N |

### Co-op team moves (both roles)

Sliders per role: body forward / up / right, turn, lean, crouch, hands and feet (world grips), timing on one-shots,
plus a contact group (`anim/moveTune.ts:63-123`).

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 73 | Leg-up: A climber, B booster | Y pair | P team_boost a / b / contact | N | N | N | N |
| 74 | Ledge relay: A climber, B hanger | Y pair | P team_relay | N | N | N | N |
| 75 | Partner throw: A runner, B thrower | Y pair | P team_throw | N | N | N | N |
| 76 | Hang-down: A hanging, B holder | Y pair | P team_hang | N | N | N | N |
| 77 | Two-person rope: A climber, B holder | Y pair | P team_rope | N | N | N | N |
| 78 | Revive: A reviver, B downed | Y pair | P team_revive | N | N | N | N |

### Hit and death

| # | Animation | (a) Loop | (b) Sliders | (c) Joints | (d) Keys | (e) L / R | (f) Bake |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 79 | Hit flinch (additive, `player/characterRig.ts:1732`) | N | N | P the stance row | N | Y | N |
| 80 | Death / downed (solo: no pose; remote: the root rolled on its side, `net/remoteAvatar.ts:526-528`) | P revive pair role B | N | N | N | N | N |

The four guard clips (guard_held_hands, guard_held_stumble, guard_choke_sag, guard_knife_collapse) are the guard's, not
the player's; they are in the Keys tab and studio only.

## Gaps

Tag "T1 fills" = closed in slice T1 with the change named. Tag "rig change" = needs new bones or rig work.

### T1 fills

1. **Joints, Hands & feet, IK, Weapon never bake** (all rows; `anim/tuneBakeTable.ts:314-316`), and they only act on
   the local player. Change: a generated base table `anim/jointBase.ts` (`JOINT_BASE[state][joint] = [x, y, z]`,
   `HAND_BASE[weapon][state][param]`, `IK_BASE`) that every rig reads in `characterRig.jointOffsets` and
   `handsBegin` (partner, remotes and pair role B included); bake rules in `tuneBakeTable.ts` write it; the tuner
   values become deltas on it, as Body already is.
2. **No Joints row for moves and actions** (rows 24-29, 49, 57-72, 73-79). `tuneJoints` sizes its table by
   `BODY_GROUPS` (`anim/tuneJoints.ts:62`). Change: key the Joints, Hands and IK tables by a row id list, not
   `BodyGroup`, and add rows `joint.trav.<kind>` (moveTune `TRAV_KINDS` plus `brace`), `joint.team.<move>.<a|b>` and
   action rows `joint.air`, `joint.land`, `joint.slide`, `joint.melee`, `joint.reload`, `joint.swap`, `joint.throw`,
   `joint.hit`; `selectBodyGroup` (`anim/tune.ts:418`) and `moveTuneSelect` pick them while the move or action runs,
   blended over the stance row.
3. **Shared rows** (rows 5, 6, 10, 12, 13, 15-18, 20-23, 36-38, 42-48, 52). Change: new `BODY_GROUPS` entries
   (`anim/tune.ts:24`): `crouchRun`, `tenseSneak`, `readyWalk` / `readyJog` / `readyRun`, `aimStill`, `aimStrafe`,
   `aimBack`, `aimCrouchMove`, `wallCrouchIdle` / `Slide` / `Peek`, `pipeInv`, `hostage`, `carry`, `knockout`,
   `interrogate`, `strafe`, `back`; and per-weapon Joints rows `joint.<weapon>.<state>` like the Hands groups
   (`anim/tuneV2Sections.ts:25`). Gun groups for knife and launcher in `GUN_GROUPS` (`anim/tune.ts:47`). Additive save
   keys; old saves load as identity.
4. **Keys: forearm twist** (item 17; every keyed row). Clip arms are elbow and wrist points (`anim/keyed.ts:6-7`), so a
   twist about the forearm cannot ride them; wrist roll turns the hand only. Change: key field `armL.twist` /
   `armR.twist` (deg, roll about the forearm) in `tuneKeysFile.ts` `ARM`; a new optional clip channel `fore` (8 floats a
   frame, L and R quaternions, like `wrist`) in `KeyedClipDef` / `KeyedClip` / `KeyedOffsets` (`anim/keyed.ts:16-68`);
   `scripts/anim-keys/py/key_clip.py` writes it; `characterRig.keyedArm` applies it to the elbow node. The rig already
   has the bone: Joints "elbow turn" (y, along the bone) is this twist.
5. **Keys: upper arm twist** (item 17). "forearm in" is a chest-frame turn of the forearm (`key_clip.py:138`), not a
   twist about the upper arm. Change: key field `armX.twistUpper` (deg); `key_clip.py` turns the elbow and wrist points
   about the upper arm axis. No new runtime channel: the points carry it. Upper arm then has pitch (flex), yaw
   (twistUpper), roll (abd).
6. **Keys: head** (rides the neck, `anim/tuneKeysFile.ts:6`, `key_clip.py:128`). Change: key segment `head`
   (pitch / yaw / roll) in `TRUNK`; clip channel `head` (4 floats a frame) or a fifth quaternion in `q`
   (`KQ`, `anim/keyed.ts:85`); `keyedTrunk` applies it to `headNode`; `keyOff.trunk` grows to 20 a frame.
7. **Keys: shoulder** (no key channel). Change: key fields `armX.shPitch` / `shYaw` / `shRoll`, a clip channel `sh`
   (8 a frame) applied in the chest frame on the shoulder node, as Joints does (`player/characterRig.ts:2206`). Same
   pivot as the upper arm; a real shrug is R2.
8. **Keys: pelvis offset** (key JSON has `pelvis.dx / dy / dz` in cm; no slider). Change: `KEY_FIELDS` add
   `pelvis_dx` / `dy` / `dz` (cm, range +-10) and a `pel` table in `KeyedOffsets`.
9. **Keys: mirrored clips copy edits** (item 18; walk, jog, run, sneak, crouch_walk, crouch_run, glide_fwd,
   glide_back, guard_held_hands, guard_held_stumble). Change: a "Mirror" tick box in the Keys tab (default on). Off:
   registry groups for the mirrored half `key.<clip>.<n .. 2n-1>` (phases + 0.5 in `tuneKeysMeta.ts`), `tuneKeys.build`
   reads them instead of the partner; the bake expands the file to the full key list (the `readKeys` port already
   builds it, `anim/tuneKeysFile.ts:129-151`) and writes `mirror: false`. No new fields: the format already has
   unmirrored 8-key files (glide_strafe.json, wall_*.json).
10. **Runtime mirrors** (rows 6, 13, 20, 33-38: left strafe and the left-side wall clips are the right ones mirrored at
    run time, `anim/animGraph.ts:1782-1785`, `anim/wallKeyed.ts:91-92`). Change: optional left clips
    (`glide_strafe_l`, `wall_*_l` key files); `wallKeyed` and `keyedDrawnSet` use them when present, else mirror.
11. **Keys edits that play nowhere in the game**: arms of ready_stance and the glides (`anim/animGraph.ts:1525`), the
    glides' trunk (`anim/animGraph.ts:1536`), and every hold_* / guard_* clip (studio only). Change: the Keys tab greys
    those fields with a one-line reason and points to the row that does act (Joints / Hands / Weapon for the state,
    Body "hold" for holds).
12. **Procedural clips have no per-key editing** (rows 5-7, 10, 13, 26-29, 50-72, 79). Change: a "Clip keys" section
    `pkey.<clip>.<key>` over the clip's own channels (`anim/pose.ts` CHANNELS: pelvis, spine, head, weapon pose, hand
    targets) with a bake rule writing the key values in `anim/clips/actions.ts`, `locomotion.ts`, `traverse.ts`. These
    clips have no per-joint arm data, so per-joint control for them comes from the rows in gap 2. Large.
13. **Missing studio loops** (rows 5-7, 10, 12-13, 16-18, 22-32, 39-40, 42, 47-49, 58, 61-62, 65-72, 79-80). Change:
    `anim/studio.ts` BASE_ENTRIES `state('aimStill')`, `state('crouchAimStill')`, `state('crouchAimFwd')` (item 19),
    `state('crouchRun')`, `state('readyWalk')`, strafe / back states, start / stop / pivot loops; action loops that
    press a button on a timer like `TravStep.press` (reload, swap, throw, melee, fire, hand swap); new trav entries with
    props in `anim/studioProps.ts` and `world/maps/studio.ts` for mantle, step, hop, roll, wall kick, split, jump / land.
14. **No weapon pick in the studio** (rows 14-32). Change: `STUDIO.weapon` (rifle, pistol, knife, launcher, none) set
    from the View tab and the playback bar; `game/studioStage.ts` equips it before every armed loop (item 19).
15. **Co-op and Traversal moves: no L / R, no Joints on role B.** `roleSliders` has one hands / feet value for both
    (`anim/moveTune.ts:66-80`); pairs pose role B outside the tuner window (`jointsBegin` is only in
    `player/player.ts:548`). Change: split into `handLUp` / `handRUp` etc. (`TuneTunable` ids in `roleSliders` and
    `tuneBakeTable.roleDeclared`), and `anim/studioPairs.ts` opens the Joints / Hands window for rig B with its row.
16. **Joint names hide the twist** (item 17). Elbow "turn" (y) is the forearm twist (the elbow node's y runs along the
    bone, `player/characterRig.ts:932-935`). Change: `ui/tunerLayout.ts` per-joint axis words: upper arm y "Upper arm
    twist", elbow y "Forearm twist", wrist z "Wrist roll", hip y "Thigh twist", and so on.
17. **Hit and death have no pose control** (rows 79-80). Change: a `joint.hit` row (gap 2) and a studio loop that
    calls `rig.hitReact` on a timer; a downed / death pose for the local player is new animation work, then a
    `downed` row.

### Rig change

- **R1 Fingers.** Hands & feet has a curl and a spread per finger, but the figure has one closure shape per hand: the
  rig uses the mean of the five curls (`player/characterRig.ts:2145-2149`) and nothing reads spread. Per-finger control
  needs finger bones (3 x 5 x 2) or per-finger morph targets on the figure. Until then T1 should label curl "Hand close"
  and hide spread.
- **R2 Clavicle.** The Joints "shoulder" turns the arm's own node in the chest frame (`player/characterRig.ts:2206`):
  same pivot as the upper arm. A shrug or a shoulder pushed forward moves the shoulder joint itself, which needs a
  clavicle node between `chest` and `shL` / `shR` (`player/characterRig.ts:930-931`).
- **R3 Legs per key.** Key files carry legL / legR, but they drive only the Blender preview and the track: the game's
  feet come from the foot planner and the legs are IK-solved (`scripts/anim-keys/keys/jog.json` note,
  `anim/keyed.ts:3-13` has no leg data). Per-key hip / knee / ankle / toe needs an FK leg mode or a planner override
  channel in the rig. Joints already offsets the legs per state on top of the IK (`player/characterRig.ts:2189-2197`).

### Where BRIEF items 15-19 land

- 15 (Keys plays the clip paused on the key, key stepping, readout naming the mirror key): makes column (d) usable on
  rows 1-4, 8-9, 11-12, 14, 19-21, 33-38, 43-46; with gap 11 it says which edits act in play.
- 16 (every pick plays, a playback bar on every tab): column (a) from every tab; needs gaps 13 and 14 for the rows
  that have no loop.
- 17: gaps 4, 5, 6, 7 (new key fields `armX.twist`, `armX.twistUpper`, `head.*`, `armX.sh*`; new clip channels
  `fore`, `head`, `sh`) and gap 16 (names).
- 18: gap 9 (Mirror tick box, groups for the mirrored half, the bake writes `mirror: false`; no new fields); gap 10
  for the runtime mirrors.
- 19: gaps 13 and 14 (aim still, crouch aim still and moving, the weapon pick).

## Counts

80 rows. 17 gaps "T1 fills", 3 gaps "rig change".
