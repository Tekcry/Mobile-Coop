# tuner-v2 item 2 - hand and foot placement, Weapon group, IK targeting strength
**Data** (`src/anim/tuneHands.ts`, pure): one row of 53 params (`HAND_PARAMS`, index `HP.<id>`) per weapon (`HAND_WEAPONS`:
none / rifle / pistol / launcher / knife) x tuner body group (`BODY_GROUPS`, 20). Placement: hand / foot IK target offsets
`{handL,handR,footL,footR}{Fwd,Up,Out}` (m, body frame, out = away from the midline), hand rotation `{handL,handR}{Pitch,Yaw,Roll}`
(deg). Weapon: `gunScale` (x, default 1), `gun{X,Y,Z}` / `gun{Pitch,Yaw,Roll}` (weapon frame, about the trigger grip point),
`supportSlide` (m along the bore), `support{Out,Up,Fwd}`, `support{Pitch,Yaw,Roll}`, `trigger` (-1 off, 0 auto, 1 on).
Fingers: `<finger><L|R>{Curl,Spread}` for thumb, index, middle, ring, little. IK strength: a separate per-state table,
`IK_LIMBS` handL / handR / footL / footR, 0..1, default 1. Flat typed arrays; a row at defaults is never applied.
**Weapon row** (`handsWeaponOf(rig)`): knife if `holdingKnife`; none if no `heldWeapon`; launcher if the node name has
`launcher` (no launcher weapon exists yet: assumed A, undo: a `def.class` field on the rig); pistol by the `cup` support hold.
**Ease.** `handsBegin(group, weapon, dt)` eases every value toward the row (exponential, `HAND_EASE_TAU` 0.06 s, as item 1;
snaps within 1e-6, so identity and settled rows are exact) on a state or weapon change; the trigger mode switches at once.
**Hooks** (local player only: `player.ts` `handsBegin` / `handsEnd` beside `jointsBegin`; remotes, guards, menus never see it).
`characterRig.ts`, each behind a flag: hand target offset before the shoulder protraction and arm solve; foot target offset
at the top of `solveLegWorld` (the planner untouched); support slide / offset and the gun visual on the support (foregrip,
magazine) point in weapon space; support rotation and the gun's visual turn on the support wrist; hand rotation on the wrist
after the hand pose; finger curl on `handGrip` after it is set; `triggerTune` read by `rightTrigger`; `ikStrengthLimbs` (one
line each, arms before item 1's `jointOffsets(3)`, legs before `jointOffsets(1)`): nlerp of shoulder / elbow / wrist and
hip / knee / ankle local rotations toward rest by 1 - strength (0 = rest + item 1 offsets, pure FK). `weaponModel.ts`:
`hold` and the draw travel set `rig.heldModel`; `tuneVisual(v)` puts the gun transform on the baked mesh and seated magazine
only; `inHand` / `holster` reset it. `footPlanner.ts` not touched. Hot path: no allocation (scratch vectors, index loops).
**API (panel; wired through the registry, see Panel).** `handsGet/Set(weapon, group, param[, v])` (clamp, NaN refused, returns changed), `handsReset`,
`handsResetGroup`, `handsResetAll`, `handsChanged`, `handsGroupChanged`; `ikGet/Set(group, limb[, v])`, `ikReset`, `ikResetGroup`,
`ikResetAll`, `ikGroupChanged`; `HANDS_HOOKS.changed`; `HAND_PARAMS` (label, section place / weapon / fingers, min, max, step,
unit), `IK_RANGE`. Save / export: `handsAttach(tuneSnapshot())` / `handsAttach(tuneExport())` (adds `hands` only when set),
`handsLoadFrom(record)`; shape `{ version: 1, values: { <weapon>: { <group>: { <param>: v } } }, ik?: { <group>: [4] } }`.
**Identity proof** (`tests/tuneHands.test.ts`): real `CharacterRig` walked 90 frames with the window on and values only in
other states / weapons (incl. IK 0 in `run`) is `toEqual` bit-identical to no window; a right hand rotation moves only wristR;
a left foot offset moves only hipL / kneeL / ankleL; a rig outside the window is untouched.
**Gameplay unchanged by gun scale**: real rig holding a real rifle `WeaponModel` (+ a stand-in baked mesh), gun scale 1.6,
z 0.04, pitch 8: `muzzleWorld` and the weapon node's world matrix `toEqual` the untuned run, the trigger wrist too; the mesh
matrix and the support wrist move. The aim ray is built from the camera in `playerWeapons` and never reads the mesh.
**Finger support - gap.** The rig has no finger joints (mitten + thumb); the operator figure has whole-hand morphs only
(`gripR` trigger shape, `wrapR` full wrap, `gripL`, `relaxR/L`). Implemented: curl = mean of the five curls added to that
hand's `handGrip` (0..1); trigger on = trigger shape, off = full wrap (no straight "indexed" finger shape). Stored but not
rendered: per-finger curl differences and all spread. Also not moved: the primitive-parts / voxel gun (no baked mesh), the knife.
**Files.** New `anim/tuneHands.ts`, `tests/tuneHands.test.ts`, this file; hooks `characterRig.ts`, `player.ts`, `weaponModel.ts`.
**Results.** tsc clean; eslint clean on the 5 touched files; vitest tuneHands 11/11, with tuneJoints, animTune, animTunePad,
animRig, readyHands, backDiagTravel, menuPoses 67/67. **Skipped:** `npm run check` and e2e (smoke, e2e-anim, e2e-menus):
`heavy.lock` held by CT Core (S2b, 01:18).
**Panel (wired, `docs/tuner-v2/WIRE.md`).** `src/anim/tuneV2Sections.ts` registers **Hands & feet** (`hand.<weapon>.<state>`,
the 18 `place` params), **IK strength** (`ik.<state>`, handL / handR / footL / footR) and **Weapon**
(`weapon.<weapon>.<state>`, the 35 `weapon` + `fingers` params); 100 groups each for the per-weapon sections. Follow keys
`hand` / `ik` / `weapon` of `TUNE_STATE_BAG`. `tuneV2Frame` copies the active (weapon, state) rows into these tables each
frame where they differ. The `hands` save key (`handsAttach`) is not used by the panel.
