# anim-gear - implementer report (marlow-bays item 22, gear offsets)

Written by the job lead from the implementer's hand-back (2026-10-22 ~00:40; the harness kept the subagent from
writing files here).

> Update (2026-10-22 ~01:10, job lead): the `pouches` and `slingBack` sockets were dropped after this report (nothing
> visible moves with them on Wren; orchestrator: keep it simple for Michael). Five sockets remain (holster, backL,
> backC, backR, slingHip), 10 groups. The checker (CHECK.md) passed before the slingBack drop; e2e-studio was rerun after.

## Built
- `src/anim/tuneGear.ts` (new, pure, Babylon-free, plain-Node loadable): sockets `GEAR_SOCKETS` (holster, backL, backC,
  backR, slingBack, slingHip, pouches); params x / y / z (m), pitch / yaw / roll (deg); rows `GEAR_ROWS` (each socket,
  then `<socket>.crouch`). Delta / base / effective tables: offsets add, angles wrapped, a generation counter,
  `gearAnyLive`. `gearBaseLoad` skips unknown rows / params with one warning and runs at module start from
  `ANIM_BASE.gear`. Per-rig `GearRigState`: `gearRigUpdate(st, crouch)` = standing + crouch x crouched, crouch clamped
  0..1, version bumped on a change. `gearCompose`: p' = p + R (d + v - r v), q' = q r (moved in the slot frame, turned
  about the slot pivot). `gearSocketOfSlot` maps a carry slot to its socket.
- Tuner section "Gear" (G-A1), `tuneV2Sections.ts` `GEAR_SECTION`, registered last: 14 groups, 6 add sliders at identity
  0 (m -0.1..0.1 step 0.001; deg -45..45 step 0.5), no follow. `syncGear` (registry -> deltas, every row, 84 keyed
  reads, setters only on a difference) runs in `tuneV2Frame` and `tuneV2SyncAll`. Track A's panel shows it as its own
  tab `sec:gear` "Gear" after Co-op, no UI change (e2e-confirmed).
- Base table (G-A2): `AnimBaseData.gear?` (row -> param id -> value). `TuneRigState.gear` is composed in `tuneRigBegin`
  from the pose's crouch; `animBaseLoad` loads it; dev hook `__animBase.setGear(row, param, v)`. Read by every Wren rig
  (`tuneRows`), never by guards.
- Bake: `tuneBakeBase.ts` (gear in `BAKE_BASE_SECTIONS`; target `gear.<row>.<param> + (m)` or `+ (deg, wrapped)`;
  adds, wraps, rounds; prints the `gear` key only when a row has an offset, so old tables print identically);
  `tuneBake.ts` unchanged; `anim-tune-bake.mjs`: `gear` in `--only`.
- Hot path: per rig, preallocated, no allocation; nothing live -> no work, version stays 0, nothing re-placed,
  bit-identical.
- `characterRig.ts` (small, local): `gearVer`, `gearPlace(node, socket, pivot)`, `gearNodes` (moves the slingBack /
  slingHip nodes from their own captured places and restores them exactly), one call in `animate`.

## Sockets and where each applies
| Socket | What moves | Pivot |
| --- | --- | --- |
| holster | the thigh pistol (`WeaponModel.place`, the thighMount branch and the generic thigh slot) | the holster's weapon point (generic: the extents' centre) |
| backL / backR | the back mount's guns (`place`, mount branch and the generic side slots) | the back stud (generic: the butt top) |
| backC | the diagonal centre sling | the grip |
| slingHip | the rig's `slingHip` node and the hip-sling gun (`placeSling`, every frame) | the node; the gun's stock end |
| slingBack | the rig's `slingBack` node | the node |
| pouches | composed per rig; nothing drawn on Wren reads it | - |

A gun's frame is its own in the slot (x right, y top, z toward the muzzle); a node's frame is its parent's. The draw /
holster travel places its ghost through `place`, so it aims at the moved slot. Carried guns re-place in
`WeaponModel.follow` when the rig's gear version changes (skipped mid-glide and mid-travel; the carried-gear spring's
base re-taken). Visual only (G-A3).

## Outside the area: `src/weapons/weaponModel.ts` (31 lines added, 2 removed; approval asked of the orchestrator)
`place` reads the mounts once per holster, never per frame, so this file needs the hook: import `gearSocketOfSlot, GS`;
a scratch `gearV`; `holster()` tracks every slot (`this.track(rig, true)`, was `slot === 'sling'`) and records
`gearVer`; one pivot `gearV.set` per `place` branch, a return after the sling branch, one `rig.gearPlace(...)` at the
end; `placeSling` calls `gearPlace(GS.slingHip, ...)`; `follow()` re-places on a version change; a `gearVer` field.
Reverting means dropping those lines; everything else builds.

## carrySlots.ts
No lines changed: the pouches are placed by `grenadePouches.ts` and built with `drawn = false` on every Wren rig
(`playerWeapons.ts`, `remoteAvatar.ts`); her kit draws them.

## Tests
- `tests/animGear.test.ts` (9): the section and its tab; slot -> socket; composition standing / crouched (0, 0.5, 1) /
  clamped / no work on unchanged input; nothing live and switched off; the pivot maths; a literal v2 export bakes to the
  expected base text and a re-run is a no-op; the round trip (bake, load, reset: equal); an old table prints identically
  and a second bake adds; a real NullEngine rig: the holstered pistol moves exactly 2 cm along its slot x, the crouched
  row adds when crouched, slingHip moves its node, a guard rig is bit-identical, a reset is bit-identical.
- Updated for Gear registered last: `tests/tuneV2Sections.test.ts` (section order), `tests/tunerLayout.test.ts`
  (`sec:gear` in the tab list).
- `scripts/e2e-studio.mjs`: Gear listed (own tab, rows); a `gear.holster` base row of x 3 cm moves Wren's holstered
  pistol 3 cm along the holster x (miss 1.7e-17 m); slingHip moves its node 2 cm and the tuner delta adds (4 cm); reset
  exact; role B's boost puppet composes the same rows and its sling node moves; reset exact.

## Results (desktop, 2026-10-21 / 22)
- `npm run check`: lint 0 errors / 41 warnings (none new); Vitest 224 files, 2482 passed, 5 skipped; typecheck ok; the
  vite build cut by the 900 s command timeout (desktop busy), then `npm run build` alone ok (10.5 min).
- Lock 00:21-00:26, port 4191 freed before and after: `run-e2e.mjs e2e-studio e2e-anim e2e-weapons-carry`: e2e-anim ok
  44 s, e2e-weapons-carry ok 19 s, e2e-studio failed at load (the new locals clashed with the suite's `gc`); after
  renaming them `gear*`, e2e-studio ok 105 s. No GPU checks apply; e2e-menus not run.

## Open
- The `weaponModel.ts` approval.
- `gear.pouches` moves nothing on Wren: it needs her kit's pouches as separate parts (an operators change) or the
  GrenadePouches meshes shown.
- The kit's holster, back plate and pouch shells are skinned into Wren's figure: the offsets move the carried guns and
  the sling sockets, not the kit's holster shell (a shell that clips is a model change).
- Goggles after T3.
- No co-op partner gear e2e (the studio's role B puppet covers a second Wren rig, the same `operatorRig` as the
  partner); the full e2e on the laptop at the PR.
