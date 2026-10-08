# World, level design pointers and characters
Purpose: maps, the level builder, the Warehouse, and the shared character rig (proportions, animation, foot planner, weapons).
Design authority: docs/design-bible.md (Sections 5.12 and 7)

## Level design
- `docs/level-design.md`: the standard every map follows - architecture first ("why is it here?"), a linear spine of
  encounter spaces, a dark vantage and three routes plus a secret per guarded space, loops not dead ends, guards with
  jobs, isolation moments and overlapping coverage, light from fixtures, sound from materials, teach / test / twist
  pacing, co-op layered on a complete solo level, engine constraints, required design deliverables (section 13),
  phases (section 14) and acceptance tests (section 15).
- `docs/templates/map-spec.md`: the template for a new map's spec (fill it, then run its phases).
- Map specs and their progress logs live in `docs/prompts/<map-id>.md` and `docs/prompts/<map-id>-progress.md`.

## World and player
- Maps (`world/maps/*.ts`) are `MapDef`s: a `build(builder, seed)` that places modular pieces through
  `LevelBuilder` and returns a `MapLayout` (spawns, props, objectives, pickups, optional `rooms`). Register in
  `world/maps/index.ts` (`MAPS`: Warehouse, Proving Grounds; `listed.ts` `LISTED_MAP_IDS` is the pure list that
  content filters on: `MISSIONS` = `ALL_MISSIONS` on listed maps); the first map listing a mode is its default
  (Warehouse for every mode but Training; a mode change on the Play screen starts on its default map). Free Roam
  (`sandbox`) places the training dummies only on Proving Grounds. `LevelBuilder.wallX/wallZ` build walls with door gaps.
- Warehouse (`world/maps/warehouse.ts`): truck yard, loading dock, dispatch, workshop, a 2.2 m service corridor,
  racking aisles, factory floor, a mezzanine deck (stairs) and two offices; roofed (visual only: roof and lights
  do not collide, so the nav sampler sees the floor) with skylight strips. Nine tagged rooms with squads (3.2.0: the
  corridor has a patrol). 3.2.0 Chaos Theory routes: the south roof strip (x -22..21, top 6.275) is a solid walkway
  (`overhead`, metal surface) reached by a drainpipe (west yard) or from the 4.2 m pump house (east lot; co-op boost /
  human ladder), a rappel point over the dispatch window, the corridor's walls at 4 m over x 6.5..11.5 (a 1.86 m split gap), a deck
  pipe from the mezzanine (x 17, 4.4 m) over the floor patrol, the press at 3.3 m (wall jump), a yard fence (x 14.5)
  closing the dark lane off from the east lot (`scripts/e2e-ct-warehouse.mjs`). Proving
  Grounds has a three-room mini set (north west) for tests.
- `LevelBuilder.build` emits thin instances (boxes, cylinders) and one static body with a container shape.
  Use `visible=false` pieces for collision-only helpers (stairs collide as a ramp).
- Characters use `CharacterRig` (see "Characters" below) with a `PartFactory`; `PartLibrary` instances share unit meshes and one
  material with per-instance colour, so any number of characters costs ~5 draw calls.
- `PlayerController` runs in `fixedUpdate`; `Player.frameUpdate` interpolates, updates camera and animation.
- Collision groups/masks/budgets live in `physics/groups.ts`. Shots raycast with membership `PROJECTILE`
  and a `collideWith` mask; hit volumes (`ai/hitboxes.ts`, `game/playerTarget.ts`) are ANIMATED bodies
  registered in the `DamageRegistry`, which maps bodies to `Damageable`s.

## Characters (one rig for player, enemies, coop remotes, dummies and the menu operator)
- `player/proportions.ts` (pure) is the single source of body sizes. Average build at 1.75 m:

  | Landmark | Value | | Limb (len, r0 -> r1) | Value |
  | --- | --- | --- | --- | --- |
  | Head h / w / d | 0.229 / 0.158 / 0.19 (7.5 heads tall) | | Upper arm | 0.30, 0.050 -> 0.038 |
  | Shoulder joint y / outer width | 1.435 / 0.46 (~2 head heights) | | Forearm | 0.26, 0.040 -> 0.028 |
  | Neck base / waist / hip joint y | 1.48 / 1.05 / 0.915 | | Thigh | 0.415, 0.082 -> 0.054 |
  | Knee / ankle y | 0.50 / 0.075 | | Calf | 0.425, 0.057 -> 0.036 |
  | Chest w x d / waist w x d | 0.34 x 0.22 / 0.28 x 0.185 | | Hand / foot | 0.17 / 0.27 long |

  Builds (`average | lean | athletic | broad`) only scale girth (0.88-1.15), shoulders (0.95-1.10), waist and
  chest within that range (`BUILD_MODS`). Enemies: runner lean 1.74 m, grunt average 1.77 m, heavy broad
  1.83 m with plates (`config/enemies.json` `height/build/plated/gun`). `hitVolumes(p)` derives hit capsules.
- Mesh rules: bodies, gear and weapons use only smooth shapes from `world/smoothMeshes.ts` via `PartLibrary`
  (`sphere, capsule, limbA, limbL, torso, dome, helmet, rcyl, rbox, pill, torus`): surfaces of revolution or
  superellipsoids with shared vertices and computed normals (no seams). Hard shapes (`box, cyl, cone, hex`) are
  for world props only. Each smooth shape has a hi and lo tessellation (`LOD_DISTANCE` 16 m, per-instance LOD).
  Joints are spheres sleeved into tapered limbs (limbs hang along -Y from their joint) so no pose opens gaps.
  Patterns/camos are procedural with smoothstep edges. One material, instanced: ~20 draw calls for all characters.
- Rig: root -> body (tumble pivot) -> pelvis(`hips`) -> spine -> chest(`torso`) -> neck -> head(`headNode`, head
  centre); chest -> shoulder -> elbow -> wrist; pelvis -> hip -> knee -> ankle; sockets `weaponPivot` (aim
  pocket), `backSocket`, `hipSocket`. Joints use `rotationQuaternion` (root uses Euler `rotation.y`).
- Avatar style (`video.avatarStyle`, `setAvatarStyle`): `detailed` (default since 2.0; `avatarStyleV` 2 moves older
  settings once) or `stick` (capsule limbs, sphere joints and head, pill feet on the same skeleton). Saves and
  cosmetics are unchanged (colours apply to both). The default look is the operator (`torso: 'operator'`: suit,
  carrier, pouches, pads, gloves; `helmet: 'trilens'`: balaclava + tri-lens, `rig.setLensGlow` from the vision
  mode). Enemy looks get the map's faction colours (`ai/factions.ts` `factionLook`, `MapTheme.faction`).
- Rendering extras: `LightRig` light cones (additive, thin-instanced, `CONE_*`), `vfx/blobShadows.ts` contact
  shadows (`GameState.drawShadows`, `NetAttachment.shadows`), `CinematicPost.setGrade(MapTheme.grade)`.
- Animation: callers pass a `RigPose` (speed, local move dir, grounded, crouch, kneel, aim = weapon raise 0..1,
  carry = ready-position weights, weight, aimPitch/aimYaw, kick, dash, slide, landing, reload/reloadEmpty, swap,
  grenade, cover/wallSide/lean/peekOver/blind/edgeLook, traverse/traverseT, check, melee, gait phase, motion
  state, acceleration, root velocity, goal yaw, stop point, stick intent, swap from/to slots) to
  `rig.animate(dt, pose)` every render frame (120 Hz). `rig.onPosed` callbacks run after each solved pose.
- Clips (`anim/clips/*.ts`) are keyed curves over named pose channels (`anim/pose.ts`: pelvis, spine, head,
  weapon, hand targets and weights, foot offsets), monotone cubic, cycles keyed over the gait phase with duty and
  lift, timed clips in seconds with events (`magOut`, `magIn`, `charge`, `holstered`, `release`, ...).
  `addClip` (additive vs neutral) / `overClip` (override); `mirrorClip` for left/right.
- `AnimGraph` builds a source pose per frame: locomotion 2D blend space (`FORWARD_NODES` creep / walk / jog /
  sprint, `CROUCH_NODES` sneak / crouch walk / crouch run x forward/back/strafe), start / stop / pivot clips from
  the `MotionDriver` state, a first-order stick-intent lean (visible on the first frame), acceleration lean and
  roll (leans into turns, <= 8 deg), cover enter/exit and tuck (reload / swap / grenade in cover), traversal,
  slide, land, reloads, per-slot swaps (`swapClipFor(from, to)`), grenade, ready positions blended to the aim
  pose, head-first lean (head ~60 ms ahead, body/weapon out ~0.2 s, back ~0.2 s; gated by the 0.18 s hand swap),
  breathing, recoil, heel-strike compression (`HEEL_KICK`), hit flinch (`rig.hit`, recovers 0.3-0.6 s). State
  switches trigger the `Inertializer` (offset decays critically damped per channel group, 120-250 ms).
- Gait style: `GAIT_STYLE` (`clips/locomotion.ts`) keeps height smooth (small loading dip and rise, smaller still at
  jog / sprint) and shows the weight in hip sway and twist; armed, the body carries a tactical `HUNCH` (chest well
  forward over the hips, knees bent, head up; deeper along cover; `crouch`: bent over the knees, half of it
  straightening into a raised weapon). Footfalls: a small `MOVEMENT.rootDip` speed check, `HEEL_KICK` and a tiny
  camera footstep kick.
- `FootPlanner` (world space): contacts from the gait clock while moving (landing spot = where the hip will be
  mid-stance; distance-matched to the stop point), locked while planted (< 1 cm), swing arcs with toe-off and
  heel pitch, no crossing (a swing passing the planted foot bows out to `PLANNER.swingGap`; a controller teleport
  resets the planner and the gait clock), error-driven idle steps (turning on the spot plants steps). Side-steps are 60% length
  (`stepLength(..., lateral)`). Two-bone IK puts feet on it and hands on the weapon's `grip`/`foregrip`/magazine
  well (wrists offset behind / under the palm points in weapon space, `WRIST_TRIGGER` / `WRIST_SUPPORT`, so the
  elbows bend) or the cover surface; the pelvis drops so both feet stay reachable (each leg measured from its own hip
  joint; a growing need is met at once, release eases); leg IK twist references stay defined in a deep sneak
  (kneecap away from the shin); planted feet measure reach from under the hip and toe off early at speed; a
  relaxed stance tolerates a front-back stagger (one settling step); the head is world-stabilised; the
  weapon's orientation lags by its mass. Legs solve (and are rate limited) before the head and weapon: knees never go under
  `KNEE_FLOOR` (the hips rise), knees closer than `KNEE_GAP` bow outward (steeper pole), and low cover hiding
  curls the back (`rig.curl`, graph `duck`) instead of crushing the legs. The weapon blends from the body to the
  aim by `aimW`, sits beside the head when aimed (`SIGHT_RAISE`, `NECK_WELD`), and `clearBody()` pushes it out
  of the trunk, head and leg capsules (`rig.gunSpan` from `WeaponModel.hold`). Kneeling in cover mirrors
  (`KNEEL_M`) so the gun is on the open side. A per-joint angular rate limit (`JOINT_RATE`) is the safety net
  (`rig.limited`). The rig refreshes world matrices top-down once per node (`fresh`), never
  `computeWorldMatrix(true)` per joint (it re-forces the whole chain). Emotes return an `FkPose` slerped over the
  result. Rigs beyond `ANIM_LOD_DISTANCE` (22 m) animate at half rate; `animate` is a no-op after `dispose`.
- Weapons (`config/weapons.json`, real sizes: rifle 0.84 m, SMG 0.60, shotgun 1.00, sniper 1.15, pistol 0.19;
  parts carry a `role`: barrel, receiver, grip, mag, ...; `modelExtents`): `WeaponModel.hold(rig)` (aim pocket,
  hands IK'd to `grip` / `foregrip` within 2 cm, magazine well from the mag part) / `holster(rig, slot)` /
  `inHand(rig)` (mid-swap). `weapons/carrySlots.ts` (pure) gives every loadout weapon its own slot: long guns
  vertical on the back (`backL/backC/backR`, muzzle up, thin side to the back, splayed from the butt, standing
  off `rig.backGear` = vest / hood / backpack depth measured from the parts), compact guns on the left-hip
  `sling` (pushed out by the thigh after each pose via `rig.onPosed`), the pistol low on the right `thigh`
  (standing off `rig.thighOuter`); `GrenadePouches` on the belt. Swaps: holster at 38%, take the next from its
  slot at 58%, in the aim pocket at 80% (0.9 s). Co-op remotes build the same from the lobby `loadout`. Deaths: `Ragdoll` = 5 Havok bodies (torso, legs, arms) with ball-and-socket joints at hips
  and shoulders, limbs never collide with their own torso, capped by `BUDGET.maxRagdolls`.
