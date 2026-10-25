# mixamo-retarget batch 2 B + C - plan (slices I7-I14)
Owner: Player Build. Status: current. (Opus planner 2026-10-26; plan checker PASS 2026-10-26 ~05:25.)
Michael (ROADMAP Decided 2026-10-26 ~00:20): "does mixamo have versions to replace those that cmu covers? i approve
downloading any additional mixamo animations and implemeting into the game, i want to be able to switch between all 3
animation sets in game and animation dev to test."

Read: origin/master CLAUDE.md; origin/feature/mixamo-i6 `docs/mixamo-retarget/PLAN.md`, `STATE.md`, `CLIPS.md`,
`M3-REPORT.md`, `src/anim/mixamo.ts`, `mocap.ts`, `animGraph.ts`, `scripts/mocap/mixamo.mjs`, `data/mixamo-clips.json`;
origin/feature/mixamo-on `src/anim/animSource.ts`, STATE "## Toggle", `docs/art-credits.md`; I4 / I5 STATE; the
owner-source wire rule (d174203e2, `AnimGraph.animSource`); `src/anim/clips/actions.ts`, `traverse.ts`, `wallKeyed.ts`,
`studio.ts`, `studioTraversal.ts`, `src/player/traversal.ts` / `movement.ts` (read only), `src/weapons/weaponDefs.ts`;
the source wire (feature/mixamo-source-wire, worktree `Mobile-Coop-mixamo-retarget-m3`, 4286b7215 + uncommitted):
`animSource.ts` `SourceTables` / `PAGE_TABLES` / `SOURCE_TABLES` / `fillSourceTables`, `animGraph.ts` `sourceTables()` /
`srcTab`.

## Ground rules (every slice)
- Clips play only on a rig whose source is `mixamo`. The default `cmu` and `hand` are byte-identical to today (each
  slice pins it, as `mixamoSwitch.test.ts`). G400 design (the source wire's): every new pick lives as a field of
  `SourceTables` (`animSource.ts`): `drawn` and `wall` (I10), `actions` (I14); I12 extends the existing `trav`
  (`WrenTravTable`). Each field has a `fill*(T, mixamo)` function in its own module, called from `fillSourceTables`, and
  the page's live copy in `PAGE_TABLES` is refilled by a resolver registered with `addMixamoResolver` (so the page's
  overrides and the Studio pick stay on local graphs, and `SOURCE_TABLES` serve remote owners). The graph reads them
  only through `this.srcTab` (`sourceTables()`, re-picked on a source change, a compare a frame); `WallKeyed.sample` is
  handed `this.srcTab.wall`. Nothing reads the module-wide `MIXAMO.on` per frame.
- Every slice from I8 on depends on the source wire landing first (the `SourceTables` type, `srcTab`, the resolver).
- A row is on unless visibly broken (Michael 2026-10-26); each new area keeps its own `*_ON` rows in its own module
  (not I6's `MIXAMO_ON`), each off row with its measured reason, as I1-I5 did.
- Gameplay timing never changes: every game clip plays by progress over the game's own clock (traversal
  `TRAVERSE_TIME` / `MIN_TIME`, the roll and mantle paths, `landT`, `i.reload` / `i.grenade` / swap progress, the
  pipe cadence, the wall blend). Takes are trimmed to their core span first (the I3 lesson: a 2.5 s take over 0.22 s
  jumped 20 cm a frame); the A8 measure is joint speed against the e2e-anim limits.
- Drawn captures: the arms always come from the gun IK (`clearKeyedArms`). The trunk: aiming, it is not applied
  (`keyTrunk = 1 - dS * raiseS`, the procedural gun platform); at low ready it is applied (`keyTrunk` 1, as the
  hand-keyed speed set's trunk today), so a rifle / pistol take's carry trunk shows. If a row's trunk fights the gun
  platform (measured: gun clip into the chest, elbow reach), its recipe drops the trunk channels for that row; `keyTrunk`
  itself is not changed.
- Every clip, game or Studio only, has its Studio row ("motion capture (Mixamo): ..."), tunable as today (keyed: Body >
  Joints, Hands & feet, Limb reach on the mocap share; drawn: the gun groups too; channel clips: the attached rows).
- Weapons in the game: `rifle` and `pistolSd` only (`weaponDefs.ts` `WEAPON_IDS`); no smg or shotgun, so the pistol
  pack serves `pistolSd` and the rifle pack `rifle`. Pick rule: the drawn table's weapon is `pistolW >= 0.5` ? pistol :
  rifle (`pistolW = clamp((0.85 - mass) / 0.15, 0, 1)`, `animGraph.ts`), re-picked only while the drawn share `dS` is
  under 1e-3 or at the swap's hand-over (the gun out of the hands), so the clips never switch mid-cycle; a test pins no
  joint step across a rifle <-> pistol swap. A weapon row that is null or off falls back to the CMU / hand-keyed clip.
- A4 travel rule holds: the packs keep their travel (no In Place), as CLIP-LIST asked for every moving clip. Recipes
  gain travel `-z` (backward) and `auto` (the measured mean heading: diagonals, strafes whose side is unknown by name,
  arcs flagged); `inPlace: 'auto'` (hips under 5 cm) is unchanged.
- The pack files were exported with the same 65-bone `mixamorig:` skeleton (checked: FBX 7700, 66 `mixamorig:` names
  in pistol, rifle, shooter, AA files); they may be on Y Bot rather than Wren's auto-rig: M2 measures each rest pose
  anyway; the I9 report lists the leg scale per pack.

## (1) Clip table (123 files: 106 in packs, 17 singles; the 38 root files of batch 1 and I6 batch 2 A are skipped)
Slug rule (I7): root files as today; a pack file gets `<prefix>_` (pistol / rifle / shooter / aa) unless its slug
already starts with it; a digits-only note `(2)` gives `_2`. Simulated on the folder: 161 files, 0 collisions (without
the rule: 13 `(n)` twins collide, and 7 AA names collide with I6's root files).
Kinds: `gait` / `loop` / `timed` (M3, keyed); `chanLoop` / `chanPath` (M4, channel); `chanShot` (new, I11: a channel
one-shot by the game's action progress with event warps). "Drop?" = dropped if the I7 duplicate check finds the same
motion as an I6 file (joints within 1 cm after alignment); else Studio only.

### pack-pistol = Pistol/Handgun Locomotion Pack (20) - 6 in game
| File | Slug | Game slot / Studio only | Kind | Notes |
| --- | --- | --- | --- | --- |
| pistol idle.fbx | pistol_idle | drawn still (ready stance), pistol | loop | in place; legs and hips only |
| pistol walk.fbx | pistol_walk | drawn walk band + aimed glide forward, pistol | gait (z) | one clip, two slots |
| pistol run.fbx | pistol_run | drawn jog + run bands, pistol | gait (z) | band by measured speed |
| pistol walk backward.fbx | pistol_walk_backward | aimed glide back, pistol | gait (-z) | |
| pistol strafe.fbx | pistol_strafe | aimed strafe, side by measured travel, pistol | gait (auto) | the two strafes are left and right; through I6's SL / SR path (`stSk`, `stHip`, `stAmp`) |
| pistol strafe (2).fbx | pistol_strafe_2 | aimed strafe, the other side | gait (auto) | keep both even if mirrors; the pair falls back to I6's unarmed strafes if either row is off |
| pistol run backward.fbx | pistol_run_backward | Studio only (the aimed glide is walk pace) | gait (-z) | |
| pistol walk arc.fbx | pistol_walk_arc | Studio only (the planner turns the body) | gait (auto) | curved travel, flagged |
| pistol walk arc (2).fbx | pistol_walk_arc_2 | Studio only | gait (auto) | other side |
| pistol run arc.fbx | pistol_run_arc | Studio only | gait (auto) | |
| pistol run arc (2).fbx | pistol_run_arc_2 | Studio only | gait (auto) | |
| pistol walk backward arc.fbx | pistol_walk_backward_arc | Studio only | gait (auto) | |
| pistol walk backward arc (2).fbx | pistol_walk_backward_arc_2 | Studio only | gait (auto) | |
| pistol run backward arc.fbx | pistol_run_backward_arc | Studio only | gait (auto) | |
| pistol run backward arc (2).fbx | pistol_run_backward_arc_2 | Studio only | gait (auto) | |
| pistol kneeling idle.fbx | pistol_kneeling_idle | Studio only | loop | knee on the floor needs a leg channel (none yet); the drawn kneel stays procedural |
| pistol stand to kneel.fbx | pistol_stand_to_kneel | Studio only | timed | same |
| pistol kneel to stand.fbx | pistol_kneel_to_stand | Studio only | timed | same |
| pistol jump.fbx | pistol_jump | Studio only (no jump; J19 R18 deletes the hop) | timed | own path |
| pistol jump (2).fbx | pistol_jump_2 | Studio only | timed | |

### pack-rifle = Pro Rifle Pack (49) - 9 in game (+4 optional turns)
| File | Slug | Game slot / Studio only | Kind | Notes |
| --- | --- | --- | --- | --- |
| idle.fbx | rifle_idle | drawn still (ready stance), rifle | loop | in place |
| idle aiming.fbx | rifle_idle_aiming | drawn aimed still, rifle (the still share while raised) | loop | in place |
| walk forward.fbx | rifle_walk_forward | drawn walk band + aimed glide forward, rifle | gait (z) | |
| run forward.fbx | rifle_run_forward | drawn jog band, rifle | gait (z) | |
| sprint forward.fbx | rifle_sprint_forward | drawn run band, rifle | gait (z) | the drawn set has no sprint (dash gates it off) |
| walk backward.fbx | rifle_walk_backward | aimed glide back, rifle | gait (-z) | |
| walk left.fbx | rifle_walk_left | aimed strafe left, rifle | gait (-x) | fed through I6's SL / SR path (`stSk`, `stHip`, `stAmp`); I6's unarmed strafes stay the fallback when this pair is off |
| walk right.fbx | rifle_walk_right | aimed strafe right, rifle | gait (+x) | same |
| walk crouching forward.fbx | rifle_walk_crouching_forward | drawn crouched move (`kCrD` sneak band), rifle | gait (z) | the pistol table's `crouchWalk` is null (no pistol take): the hand-keyed drawn crouched legs stay |
| turn 90 left.fbx | rifle_turn_90_left | drawn turn in place, rifle (I10 optional, else Studio only) | timed | in place, 90 deg |
| turn 90 right.fbx | rifle_turn_90_right | same, right | timed | |
| crouching turn 90 left.fbx | rifle_crouching_turn_90_left | drawn crouched turn (optional, else Studio only) | timed | |
| crouching turn 90 right.fbx | rifle_crouching_turn_90_right | same, right | timed | |
| idle crouching.fbx | rifle_idle_crouching | Studio only (drawn crouched still is the procedural kneel) | loop | |
| idle crouching aiming.fbx | rifle_idle_crouching_aiming | Studio only | loop | |
| walk forward left.fbx | rifle_walk_forward_left | Studio only (the glide blends forward + side) | gait (auto) | diagonal |
| walk forward right.fbx | rifle_walk_forward_right | Studio only | gait (auto) | |
| walk backward left.fbx | rifle_walk_backward_left | Studio only | gait (auto) | |
| walk backward right.fbx | rifle_walk_backward_right | Studio only | gait (auto) | |
| walk crouching backward.fbx | rifle_walk_crouching_backward | Studio only (the crouched drawn legs are forward cycles) | gait (-z) | |
| walk crouching left.fbx | rifle_walk_crouching_left | Studio only | gait (-x) | |
| walk crouching right.fbx | rifle_walk_crouching_right | Studio only | gait (+x) | |
| walk crouching forward left.fbx | rifle_walk_crouching_forward_left | Studio only | gait (auto) | |
| walk crouching forward right.fbx | rifle_walk_crouching_forward_right | Studio only | gait (auto) | |
| walk crouching backward left.fbx | rifle_walk_crouching_backward_left | Studio only | gait (auto) | |
| walk crouching backward right.fbx | rifle_walk_crouching_backward_right | Studio only | gait (auto) | |
| run forward left.fbx | rifle_run_forward_left | Studio only (low ready runs face travel) | gait (auto) | |
| run forward right.fbx | rifle_run_forward_right | Studio only | gait (auto) | |
| run left.fbx | rifle_run_left | Studio only | gait (-x) | |
| run right.fbx | rifle_run_right | Studio only | gait (+x) | |
| run backward.fbx | rifle_run_backward | Studio only | gait (-z) | |
| run backward left.fbx | rifle_run_backward_left | Studio only | gait (auto) | |
| run backward right.fbx | rifle_run_backward_right | Studio only | gait (auto) | |
| sprint forward left.fbx | rifle_sprint_forward_left | Studio only | gait (auto) | |
| sprint forward right.fbx | rifle_sprint_forward_right | Studio only | gait (auto) | |
| sprint left.fbx | rifle_sprint_left | Studio only | gait (-x) | |
| sprint right.fbx | rifle_sprint_right | Studio only | gait (+x) | |
| sprint backward.fbx | rifle_sprint_backward | Studio only | gait (-z) | |
| sprint backward left.fbx | rifle_sprint_backward_left | Studio only | gait (auto) | |
| sprint backward right.fbx | rifle_sprint_backward_right | Studio only | gait (auto) | |
| jump up.fbx | rifle_jump_up | Studio only (no jump) | timed | |
| jump loop.fbx | rifle_jump_loop | Studio only | loop | |
| jump down.fbx | rifle_jump_down | Studio only | timed | |
| death from the front.fbx | rifle_death_from_the_front | Studio only (guard deaths are the ragdoll, `src/ai`; Wren has no death clip) | timed | own path; G1 / Guard AI note |
| death from the back.fbx | rifle_death_from_the_back | Studio only | timed | |
| death from right.fbx | rifle_death_from_right | Studio only | timed | |
| death from front headshot.fbx | rifle_death_from_front_headshot | Studio only | timed | |
| death from back headshot.fbx | rifle_death_from_back_headshot | Studio only | timed | |
| death crouching headshot front.fbx | rifle_death_crouching_headshot_front | Studio only | timed | |

### pack-shooter = Shooter Pack (15) - 0 in game (the rifle pack fills every drawn slot from one consistent take set)
| File | Slug | Game slot / Studio only | Kind | Notes |
| --- | --- | --- | --- | --- |
| walking.fbx | shooter_walking | Studio only | gait (z) | role of rifle_walk_forward |
| rifle run.fbx | shooter_rifle_run | Studio only | gait (z) | role of rifle_run_forward |
| rifle aiming idle.fbx | shooter_rifle_aiming_idle | Studio only | loop | role of rifle_idle_aiming |
| walking backwards.fbx | shooter_walking_backwards | Studio only | gait (-z) | rifle take, not I6's Walking Backwards |
| run backwards.fbx | shooter_run_backwards | Studio only | gait (-z) | |
| strafe.fbx | shooter_strafe | Studio only | gait (auto) | |
| strafe (2).fbx | shooter_strafe_2 | Studio only | gait (auto) | |
| start walking.fbx | shooter_start_walking | Studio only (the drawn set has no start / stop slot) | timed | |
| stop walking.fbx | shooter_stop_walking | Studio only | timed | |
| start walking backwards.fbx | shooter_start_walking_backwards | Studio only | timed | |
| walk backwards stop.fbx | shooter_walk_backwards_stop | Studio only | timed | |
| firing rifle.fbx | shooter_firing_rifle | Studio only (recoil is procedural, `recoil.ts`) | timed | |
| jump forward.fbx | shooter_jump_forward | Studio only | timed | |
| jump backward.fbx | shooter_jump_backward | Studio only | timed | |
| walking to dying.fbx | shooter_walking_to_dying | Studio only | timed | |

### pack-action-adventure = Action Adventure Pack (22) - 4 in game (+1 conditional), up to 7 dropped
| File | Slug | Game slot / Studio only | Kind | Notes |
| --- | --- | --- | --- | --- |
| left cover sneak.fbx | aa_left_cover_sneak | wall slide left, standing, holstered (`WallKeyed` STAND.slide) | gait (-x) | facing measured against back-to-wall; else Studio only |
| right cover sneak.fbx | aa_right_cover_sneak | wall slide right | gait (+x) | the hand-made slide is one clip mirrored; here both sides |
| falling idle.fbx | aa_falling_idle | air pose in a fall (`AIR_POSE` / `airPoseW`) | chanLoop | in place, on air time |
| hard landing.fbx | aa_hard_landing | heavy landing (`LAND_DEEP`, over `landT`) | chanShot | trimmed from ground contact |
| falling to roll.fbx | aa_falling_to_roll | landing roll (2.5-4.5 m fall) if the graph can tell it from the forward roll (`i.landing` at roll start, no `src/player` edit); else Studio only | chanPath (roll path) | trimmed from contact |
| stand to cover.fbx | aa_stand_to_cover | Studio only (the wall entry is a 0.1 s blend: about 10x) | timed | |
| stand to cover (2).fbx | aa_stand_to_cover_2 | Studio only | timed | |
| cover to stand.fbx | aa_cover_to_stand | Studio only | timed | |
| cover to stand (2).fbx | aa_cover_to_stand_2 | Studio only | timed | |
| idle.fbx | aa_idle | Studio only (idle choices: section 5) | loop | |
| idle (2).fbx | aa_idle_2 | Studio only | loop | |
| idle (3).fbx | aa_idle_3 | Studio only | loop | |
| idle (4).fbx | aa_idle_4 | Studio only | loop | |
| idle (5).fbx | aa_idle_5 | Studio only | loop | |
| jumping up.fbx | aa_jumping_up | Studio only (no jump) | timed | |
| walking.fbx | aa_walking | Drop? (I6 Walking) | gait | |
| running.fbx | aa_running | Drop? (I6 Running) | gait | |
| left turn.fbx | aa_left_turn | Drop? (I6 Left Turn) | timed | |
| right turn.fbx | aa_right_turn | Drop? (I6 Right Turn) | timed | |
| run to stop.fbx | aa_run_to_stop | Drop? (I6 Run To Stop) | timed | |
| crouched sneaking left.fbx | aa_crouched_sneaking_left | Drop? (I6 Crouched Sneaking Left) | gait | |
| crouched sneaking right.fbx | aa_crouched_sneaking_right | Drop? (I6 Crouched Sneaking Right) | gait | |

### Singles (17) - 15 in game
| File | Slug | Game slot / Studio only | Kind | Notes |
| --- | --- | --- | --- | --- |
| Vault Over Box.fbx | vault_over_box | vault (`VAULT`, 0.6-0.7 s, the vault path) | chanPath | trimmed plant-to-land; the hand plant warped onto VAULT's off-hand plant; pelvis placement kept (`MIXAMO_KEEP` rule) |
| Box Jump.fbx | box_jump | mantle (crates, 0.9-1.0 s, `MANTLE_PATH`) | chanPath | no hand plant in the take: hands kept on the edge by `mantlePlant` |
| Stand To Roll.fbx | stand_to_roll | forward roll (`ROLL`, 0.55-0.62 s) | chanPath | the rig's `rollBody` pitch / spin stays the game's; the capture gives limbs and curl only |
| Climbing A Rope.fbx | climbing_a_rope | drainpipe climb `pipeClimb` (no pipe climb on the site) | chanLoop (pipe cadence) | feet stay on the rig's wall plants; travel taken out |
| Climbing Up Wall.fbx | climbing_up_wall | `wallKick` or the hang climb-up (both climb-up rows are off today): decided by its dump's start pose; else Studio only | chanPath | |
| Grenade Throw.fbx | grenade_throw | grenade (`GRENADE`, release at 0.68) | chanShot | mirror: the game throws with the left (off) hand; the gun hand and weapon channels kept |
| Reloading (rifle).fbx | reloading | rifle reload, tactical and empty (by `i.reload`) | chanShot | trunk, pelvis, head only; hands, mag and weapon channels kept (the take's hands miss the game's mag well) |
| Pistol Aim (aim to holster).fbx | pistol_aim | pistol put-away half of the swap (thigh reach) | chanShot | trunk and head only; the reach stays `swapClipFor`'s |
| Crouch Look Around Corner.fbx | crouch_look_around_corner | wall crouched peek (`WallKeyed` CROUCH.peek) | loop | in place; facing measured; mirrored for the other edge as the hand-made peek |
| Looking Around.fbx | looking_around | Studio only | loop | guard search candidate: hand-off to Guard AI (G1, `mixamoGuards`) |
| Cover Idle (standing cover against object).fbx | cover_idle | wall STAND.idle (standing, holstered; `WallKeyed`) - I13 | loop | in place; facing measured against back-to-wall |
| Stand Cover To Look.fbx | stand_cover_to_look | wall STAND.peek (standing corner peek) - I13 | timed | played by the game's peek amount (progress = peek), never its own seconds; mirrored for the other edge |
| Taking Cover Idle (rifle).fbx | taking_cover_idle | Studio only (a drawn weapon at a wall keeps the procedural `WALL_READY` pose; the keyed wall set is holstered only) | loop | candidate for a later drawn-wall slot |
| Falling To Landing.fbx | falling_to_landing | soft landing (`LAND`, over `landT`) - emit I11, wire I12 | chanShot | trimmed from ground contact |
| Rifle Pull Out.fbx | rifle_pull_out | rifle draw: the draw half of `swapClipFor(from, rifle reach)` - emit I11, wire I14 | chanShot | trunk and head; the hand reach stays the game's (the diagonal back sling) |
| Rifle Put Away.fbx | rifle_put_away | rifle put-away: the holster half of the swap - emit I11, wire I14 | chanShot | same; if its hand path misses the back carry, see section 5 |
| Drawing Gun (pistol from lower back).fbx | drawing_gun | pistol draw: the draw half of the swap to the pistol - emit I11, wire I14 | chanShot | the take draws from the lower back, the game from the thigh: trunk and head only, reach `REACH.thigh` kept |

Totals: 34 game rows (+4 optional turns, +1 conditional landing roll), up to 7 dropped, the rest (77) Studio only.

## (2) Driver change (I7)
- `scripts/mocap/mixamo.mjs` `listClips(dir)`: the root `*.fbx` plus one level of `pack-*` subfolders
  (`readdirSync(..., { withFileTypes: true })`); `file` becomes the path relative to the clip folder
  (`pack-rifle/walk forward.fbx`), passed as one argument as today; `pack` added to each entry.
- `slugOf(file, pack)`: today's rule, plus a digits-only note -> `_<n>` (the Mirror rule stays), plus the pack prefix
  (`PACK_PREFIX = { 'pack-pistol': 'pistol', 'pack-rifle': 'rifle', 'pack-shooter': 'shooter', 'pack-action-adventure':
  'aa' }`, an unknown `pack-<x>` -> `<x>` with `-` -> `_`), skipped when the slug already starts with it. Root slugs are
  unchanged (no batch 1 or I6 module renames). Any collision still stops the run, naming both files.
- Manifest rows gain `pack` and the relative `file`; `--only` and the skip-by-hash logic unchanged; dumps stay flat
  (`raw/<slug>.json`).
- Duplicate check (`scripts/mocap/mixamoDup.mjs`, run after a dump): per pair with the same slug tail (`aa_walking` vs
  `walking`), after aligning the start root, the max joint distance over the resampled frames; under 1 cm -> listed as
  duplicate in the manifest (`dupOf`) and never emitted.
- `tests/mixamoDriver.test.ts`: the 161 real names (literal list) slug uniquely to the table's slugs; prefix, `(n)`,
  Mirror; subfolder listing with a mocked readdir; `dupOf` on synthetic dumps.


## (3) Slices (Opus builders, counted lines exclude generated modules; branch guard, path-limited commits,
`npm run typecheck:fast` + `npx vitest run <its files>`, fresh checker, its own `changes/feature-mixamo-iN.md`)
Order: I6 merged -> Toggle (#485 stack) -> source wire (feature/mixamo-source-wire: `SourceTables`, `srcTab`,
`AnimGraph.animSource`) landed -> I7 ... I14. I7 is scripts only and may start before the wire lands; I8 onwards wait
for it.

**I7 Pack driver and recipe options (~650).** `scripts/mocap/mixamo.mjs`, `scripts/mocap/mixamoDup.mjs` (new),
`scripts/mocap/mixamoEmit.mjs` (recipe `pack`, travel `-z` / `auto`, `mirror`, `place: 'game' | 'studio'`),
`scripts/mocap/mixamoTake.mjs` (travel `auto`: measured heading, arcs flagged), `tests/mixamoDriver.test.ts`,
`tests/mixamoEmit.test.ts`. Depends: I6 merged (it edits slugOf and the emitter). Parallel with the Toggle / wire work.

**I8 Lazy capture loading (~800).** The Studio imports every clip eagerly (`studio.ts:216-217`, 587 KB of TS for 21
clips today; about 115 more would add some 2.5-3.5 MB).
- `src/anim/mixamoLoad.ts` (new): `ensureMixamo(): Promise<void>` loads the game captures as one chunk once, fills the
  registry, then reruns the Mixamo resolvers (`resolveMixamo`, which calls every `addMixamoResolver` resolver, so
  `PAGE_TABLES` and `SOURCE_TABLES` refill). Until loaded a rig keeps its CMU clips.
- When the page's own source is `mixamo` (`?anim=mixamo` or the saved setting), `src/core/app.ts` awaits
  `ensureMixamo()` before a match or the Studio starts (the settings-apply path at `app.ts:143`); a later switch to
  Mixamo in Options or the Studio awaits it before applying. A remote owner's `mixamo` source starts the load; that rig
  draws CMU until it lands (a short visible delay on a partner only, never on the local player).
- `src/anim/animGraph.ts`: the `animSource` setter starts the load only when the value changes to `mixamo` and the
  chunk is not loaded (a flag test; allocates nothing per call).
- `src/anim/mixamo.ts` (clip imports -> registry filled by the loader), `src/anim/studio.ts` (Studio-only captures in
  `src/anim/clips/mixamo/studio/` by a non-eager glob, loaded when the motion-capture group or Set "Mixamo" opens),
  `src/anim/animSource.ts` (apply awaits `ensureMixamo` for `mixamo`).
- Tests: `tests/helpers/mixamoReady.ts` (new: a top-level `await ensureMixamo()`), imported first by the tests that
  read clips synchronously: `tests/mixamoSwitch.test.ts`, `tests/animSource.test.ts`, `tests/mixamoTraverse.test.ts`,
  `tests/mixamoStance.test.ts`, `tests/mixamoLoco.test.ts` (I6), `tests/tunerReach.test.ts`,
  `tests/tunerReachProbe.test.ts`, `tests/climbHands.test.ts` (one import line each); `tests/mixamoLoad.test.ts` (cmu
  byte-identical before and after a load; the setter allocates nothing; a build check that the entry chunk holds no
  `mocap_` Mixamo name).
- Size: loader ~150, mixamo.ts ~150, studio.ts ~80, app.ts / animSource.ts ~60, animGraph setter ~15, helper ~20,
  eight test imports ~10, mixamoLoad.test ~250, report / changelog ~60: about 800.
Depends: Toggle + source wire landed.

**I9 Dump and emit the keyed clips, Studio rows, credits (~750).** Blender run under the heavy lock (123 files);
`scripts/mocap/data/mixamo-clips.json` (one recipe line per keyed clip, as today's file: about 101 lines with kind,
travel, mirror, place and the Studio row with body group and drawn / aim / crouch flags), emitted modules (generated,
not counted), the keyed marker block of `src/anim/mocapSources.ts` (about 101 rows; labels carry the pack: "Mixamo,
Pro Rifle Pack: walk forward"), `docs/mixamo-retarget/CLIPS.md` (generated keyed section; leg scale per pack),
`docs/art-credits.md` (about 101 rows, below), `TESTING.md` (one line), `tests/mixamoEmit.test.ts` /
`tests/mocapSources.test.ts` additions (~200), I9 report (~120). About 101 + 101 + 101 + 200 + 120 + changelog = ~650-750.
Channel clips wait for I11. Depends: I7, I8.

**I10 Drawn set per weapon (~950).** `src/anim/animSource.ts` (`SourceTables` gains `drawn` and `wall`; their fills in
`fillSourceTables` and `newTables`), `src/anim/mixamoDrawn.ts` (new: the `drawn` table, rifle and pistol rows: still,
aimStill, walk, jog, run, glideFwd, glideBack, strafeL, strafeR, crouchWalk (pistol: null), optional turnL / turnR;
`DRAWN_ON`; `fillDrawn(T, mixamo)` and its page resolver via `addMixamoResolver`), `src/anim/mixamoWall.ts` (new:
`fillWall(T, mixamo)` filling the hand-made trios only, I13 adds the Mixamo rows), `animGraph.ts` (`keyedDrawnSet` and
the crouched drawn legs read `this.srcTab.drawn`, weapon by the pick rule above; the pack strafes go into the existing
`SL` / `SR` locals ahead of the loco set's, so `stSk`, `stHip`, `stAmp` and `stIdle` run unchanged and I6's unarmed
strafes stay the fallback when a pack pair is off; `this.wallKeys.sample(..., this.srcTab.wall)`; the Now playing
capture field), `src/anim/wallKeyed.ts` (the `sample` parameter, the hand-made trio by default), `src/anim/nowPlaying.ts`,
`tests/mixamoDrawn.test.ts` (two rigs, `cmu` and `mixamo`, in one process; the swap step; the strafe fallback),
`tests/tunerReachMixamoDrawn.test.ts`. Laptop: affected-e2e (src/anim), e2e-anim, e2e-weapons-carry, e2e-studio,
anim-audit; look video. Depends: I9, source wire. Parallel with I11.

**I11 Channel emitter for moves and actions (~1,000).** `scripts/mocap/mixamoChannels.mjs` (`chanPath` on the
traversal paths read from `src/player/traversePath.ts` / `traversal.ts`, read only: vault, mantle, roll; `chanShot` by
progress with event warps: grenade release 0.68, reload mag out / in onto the `offMag` keys, hard and soft landing
contact, the draw and put-away halves onto the swap's hand-over; `mirror`; `chanLoop` for the rope on the pipe cadence
and the falling idle on air time), the channel marker block of `mocapSources.ts`, CLIPS.md channel section,
art-credits rows for these 15, `tests/mixamoChannels.test.ts`. Scripts and data only. Depends: I9. Parallel with I10.

**I12 Traversal, air and landing on Wren (~1,000).** `src/anim/mixamo.ts` (`WrenTravTable` and `fillWrenTrav` gain
vault, mantle, roll, rollLand, pipeClimb, wallKick / climbUp, air, land, landDeep; their ON rows and `MIXAMO_KEEP`; the
`trav` field of `SourceTables` carries them, no new field), `animGraph.ts` (traverse pick, the air and landing block,
all through `this.srcTab.trav`), `src/anim/studioTraversal.ts` (roll and drop-and-land entries),
`tests/mixamoMoves.test.ts`, `tests/tunerReachMixamoMoves.test.ts`, `tests/climbHands.test.ts` (Mixamo-source cases).
Laptop: affected-e2e, e2e-traverse, e2e-ctcourse, e2e-anim, e2e-clip; look video. Depends: I10 (animGraph), I11.

**I13 Wall set (~550).** `src/anim/mixamoWall.ts` (the Mixamo rows of `fillWall`: STAND.idle `cover_idle`,
STAND.slide L / R, STAND.peek `stand_cover_to_look` by the peek amount, CROUCH.peek; `WALL_ON`), `src/anim/wallKeyed.ts`
(sampling the handed table's trios), `tests/mixamoWall.test.ts`, `tests/tunerReachMixamoWall.test.ts`. Laptop:
e2e-anim, e2e-stealth, e2e-studio. Depends: I10 (the `wall` field and the hook). Parallel with I11 and I12 (no shared
file).

**I14 Actions: grenade, reload, draw and put-away (~800).** `src/anim/animSource.ts` (`SourceTables.actions`, its
fill), `src/anim/mixamoActions.ts` (new: `fillActions(T, mixamo)` and its page resolver; rows grenade, reload (rifle),
swap halves per weapon: rifle put-away / draw, pistol put-away (`pistol_aim`) / draw (`drawing_gun`); ON rows),
`animGraph.ts` (the reload / swap / grenade `overClip` block through `this.srcTab.actions`; a swap plays the outgoing
weapon's put-away up to the hand-over and the incoming weapon's draw after it, each half falling back to `swapClipFor`
when null or off), `src/anim/studioTraversal.ts` (Studio action loops pressing reload / throw / swap),
`tests/mixamoActions.test.ts`. Laptop: e2e-weapons-carry, e2e-anim, e2e-studio. Depends: I12 (animGraph,
studioTraversal).

Parallel pairs: I7 with Toggle / wire; I10 with I11; I13 with I11 and I12. `animSource.ts` is touched by I8, I10, I14
only, never in parallel. Everything else in order. Each slice's switch-off identity test runs two rigs in one process
(one `cmu`, one `mixamo`) to prove the per-rig pick.

## (4) Art-credits rows (`docs/art-credits.md`, "Motion capture (Mixamo, mixamo-retarget)")
- Header: raw files "in `C:/NightShift/scratch/mixamo/clips/` and its `pack-*` subfolders"; a line naming the packs as
  the site does: "Pistol/Handgun Locomotion Pack" (`pack-pistol/`, 20), "Pro Rifle Pack" (`pack-rifle/`, 49), "Shooter
  Pack" (`pack-shooter/`, 15), "Action Adventure Pack" (`pack-action-adventure/`, 22).
- One row per committed module, before its commit: up to 116 (123 less dropped duplicates): I9 the keyed ones (about
  101), I11 the 15 channel ones (12 singles, 3 AA). Columns as today; the title cell is "<pack name>: <title>
  (`pack-rifle/walk forward.fbx`)", e.g. "Pro Rifle Pack: walk forward (`pack-rifle/walk forward.fbx`)", singles as
  today; clip name `mocap_<slug>`; source https://www.mixamo.com/; terms "Adobe Mixamo, royalty-free for commercial use
  (licence sentence above)"; date added; used by = the game slot, or "Anim Studio only (Animation source: Mixamo)".
- `tests/mocapSources.test.ts` already proves every Mixamo row has its credits row; it gains a check that a pack clip's
  title cell starts with its pack name.

## (5) To ask Michael
- The idle choice: five Action Adventure idles (`aa_idle` .. `aa_idle_5`) are in the Studio; if he names one, it takes
  the Mixamo standing idle (in place of `standing_idle`); until then all stay Studio only.
- Only if `rifle_put_away`'s hand path misses the game's back carry (the diagonal sling over the right shoulder):
  "Put Back Rifle Behind Shoulder". The other offered clips (Standing Cover Turn, Emerge From Cover, Landing (from jump),
  Standing Land To Standing Idle) have no game slot and are not needed.
- Known missing on the site: pipe climb (the rope stands in), pistol reload (stays hand-made), running jump (not
  needed, R18). The kneels wait for a leg channel in the emitter (a later item, no clip needed).
