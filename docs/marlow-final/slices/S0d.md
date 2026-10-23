# S0d - the scaffold (merge, contract, facility greybox, stub sets, frames)

Slice 0d (PLAN.md section 4, row 0d). Date 2026-10-23. Not committed (the job lead commits). The client hold-pulse
follow-up in the 0d row was already done (1949764e, `src/net/holdPulse.ts`) and was skipped. No `src/game`, `src/net`,
`src/ai`, kit, lighting, props or greybox-helper file was edited.

## Built
- **`ctcourse.ts` is now the merge.** `buildCtcourse(b)` builds the facility, then each set in route order through
  `SET_BUILDERS`, and merges the parts into one `MapLayout` and one `CourseDef`: bays `A1`-`A8`, airlocks `L1`-`L7`
  (the holding rooms), the chain start -> L1 .. L7 -> end, the exit zone in the cash dock. A duplicate id across parts
  throws at build. `course.groups` = `marlowCourseGroups()` (LIGHTING-PLAN 4 step 1) plus the parts' groups. Each part's
  builder pieces are counted (lights, collidable boxes, doors, anchors) for the register check. N8: one data build at
  module load calls `registerCourse('ctcourse', def)`, so `?course=all` "Start at" counts 8 sets before a run (the slice
  0 check finding 3). Exports: `ctcourse`, `buildCtcourse`, `SET_BUILDERS`, `COOP_LIPS`, `LIGHT_SPOTS`, `SHOT_VANTAGES`.
- **`ctcourseSets/types.ts`: the contract.** `SET_IDS`, `SET_NO`, `SET_NAME`, `SET_BOX` (A4 is three boxes: security
  room, staff passage, goods floor), `HALL_H` 10, `HOLD_IDS`, `HOLD_BOX`, `HOLD_H` 3.2, `HOLD_DOORS` (each holding room's
  near / far door spot and yaw), `HOLD_DOOR_W` 1.8, `SET_LINKS` (entry / exit per set), `setEntryDoor` / `setExitDoor`,
  `DOCK_BOX`, `EXIT_ZONE`, `LOUNGE_BOX`, `SPAWNS`, `CAMERA_BUDGET` (A3 1, A4 3, A7 2, A8 3; map 12), `SET_GUARDS_MAX` 3,
  `OBJECTIVE_ID_MAX` 40; the `SetPart`, `AmbientZoneDef`, `SwitchDef`, `DebugPoint`, `LightSpot`, `ShotVantage`,
  `RegisterRow` types; `emptyPart`, `inBox`, `inSet`, `setBounds`, `boxInSet`, `ownsId`, `pieceCount`, `tally`,
  `registerSum` and `checkSetPart` (the rules as a pure check).
- **`ctcourseSets/facility.ts`: the facility greybox.** Site floor 160 x 78; every set-boundary and outer wall on the
  `SET_BOX` edges with a 10 m hall roof over each set; the instructor gallery as out-of-bounds boxes (floor slab 4.2-4.5
  and roof 7.5-7.8 over the south strip, the bridge over L4 and the north strip, all `overhead`), glazed into the sets
  with `kit.glass` (4.5-7.5 on every set wall under a strip, the A8 end bay at x 106 z 50-52), its own walls where no set
  is, 27 decor lamps (group 90, `electric: false`, `destructible: false`, radius 1.6, stopping 0.3 m short of the glass);
  the service corridors under it (closed void) and the plant room (x 76-100, z 13-20, closed); the A4 staff passage's
  sides (x 101 and x 104: they cut the south service corridor, job lead / A4-C4); holding rooms L1-L7 (side walls, 3.2 m
  lids, a pad plate, two 1.8 m `kit.slidingDoor`s, a clear `kit.glass` slot 0.5 x 1.2 m beside the far door onto the
  next set, two cool `kit.ledSlot` read lamps on groups 91-97 sized to stop 0.35 m short of both door planes); wall
  medkits in L4 and L7; the L7 model plinth (1.6 x 0.6 x 0.9 against its south wall); the cash dock (4.5 m, open west to
  the vault, two warm slots on group 98) with the exit zone x 154-159.4, z 59-65. L4's east door (`L4-near`, A4's dock
  wicket) is built locked (job lead, A4-D3; see D8). Every facility box is `noLedge`.
- **Eight stub sets** (`a1Gate.ts` ... `a8Strongroom.ts`, each `build<Set>(b, kit)` calling `stub.ts`): an empty lit
  hall (a lamp grid at y 5, radius 8, at most 8 m apart on the set's first switched read circuit: A1 12, A2 20, A3 30, A4
  42, A5 50, A6 60, A7 70, A8 81), its standby zone from `MARLOW_ZONES` (A1 also the lounge's 0.30), one closing step
  "Cross to the next holding room." (A8: "Both of you out to the cash dock."), an entry radio line, camera spaces (halls
  open, small boxes tight), nav seeds, debug points `A<n>-entry` / `A<n>-mid`, five light spots and one shot vantage.
  A1 adds `a1-checker`: a passive grunt at (10.5, 16.5) facing +x with one information line (e2e-coop's bay-1 guard).
- **Retired:** `ctcourseBunker.ts`, `ctcourseVariety.ts`, `tests/ctcourseLight.tuned.json` (deleted).
- **Test frames:** `tests/ctcourse.test.ts` (26 cases) and `tests/ctcourseLight.test.ts` (7 + 1 print / write case),
  per-set tuned files `tests/ctcourse/<set>.light.json` (8, from the stubs).
- **e2e frame:** `scripts/e2e-ctcourse.mjs` rewritten (runner, shared helpers, 4 parts), 8 stub step modules
  `scripts/e2e-ctcourse/<set>.mjs`, `run-e2e.mjs` (`PARTS` `'4'`, the quick-run map), `e2e-times.json` (`:1`-`:4`).
- **`scripts/shots-ctcourse.mjs`** reads `SHOT_VANTAGES` through Vite's SSR loader (optional name prefix argument).
- **Plans:** `docs/marlow-final/plans/facility-ground.svg`, `facility-gallery.svg` (drawn from the built map).
- **`docs/ct-prototype/CTCOURSE-SPEC.md`:** a "Superseded" header pointing at SPEC / PLAN / the new files.

## Files
- `src/world/maps/ctcourse.ts` (rewritten); `src/world/maps/ctcourseSets/types.ts`, `facility.ts`, `stub.ts`, `a1Gate.ts`,
  `a2CarriageShed.ts`, `a3OfficeRange.ts`, `a4GoodsShed.ts`, `a5Substation.ts`, `a6PumpHouse.ts`, `a7DataHall.ts`,
  `a8Strongroom.ts` (new); `ctcourseBunker.ts`, `ctcourseVariety.ts` (deleted).
- `tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts` (rewritten); `tests/ctcourse/*.light.json` (8, new);
  `tests/ctcourseLight.tuned.json` (deleted).
- Map-coupled cases cut: `tests/guardInfo.test.ts`, `tests/jammer.test.ts`, `tests/laserPanels.test.ts`,
  `tests/scanners.test.ts`, `tests/camSpaces.test.ts`; retargeted: `tests/smoothWorldLight.test.ts`. Also touched (see D10):
  `tests/marlowN6Scanners.test.ts`, `tests/marlowPassAny.test.ts`, `tests/levelFillParity.test.ts`, `tests/voxelFit.test.ts`.
- `scripts/e2e-ctcourse.mjs` (rewritten), `scripts/e2e-ctcourse/*.mjs` (8, new), `scripts/run-e2e.mjs`,
  `scripts/e2e-times.json`, `scripts/shots-ctcourse.mjs`.
- `docs/marlow-final/plans/facility-ground.svg`, `facility-gallery.svg` (new), `docs/ct-prototype/CTCOURSE-SPEC.md`
  (header), this report.

## Decisions and assumptions (Michael asleep; each can be undone)
- D1 **Facility circuits 90-98, not SPEC's groups 1 / 2.** `MARLOW_CIRCUITS` (the lighting agent's table, which the
  frames validate) numbers the gallery 90, L1-L7 91-97, the dock 98, and LIGHTING-PLAN 4 says to use it. SPEC 7 / F3 / F4
  still say 1 / 2. Undo: renumber the table rows.
- D2 **Facility walls 0.5 m, not 0.45.** 0.45 m faces at x 106.6 / z 19.6 (the A4 security room's box) fell off the voxel
  path's 5 cm grid and failed `tests/voxelFit.test.ts`; 0.5 puts every face on it. Holding rooms are 5.5 m clear.
  Undo: `FAC_T` (and fix the voxel fit).
- D3 **Hall roof at 10 m over every set box** (SPEC 5 "10 m clear"); the A4 passage has none (the gallery slab is its
  ceiling at 4.2). Sets build their own ceilings under it.
- D4 **Id rule widened to the set tag:** an id starts `a<n>-` or carries `-a<n>-` / ends `-a<n>`, so SPEC's own names
  (`g-a1-wicket`, `sc-a7`, `laser-a5`, `panel-a5`) pass `checkSetPart`. Course doors start `A<n>-`.
- D5 **Ambient zones are checked against the set's bounds** (`setBounds`, 0.5 m slack for whole-metre edges), so
  `MARLOW_ZONES`' A4 box (76-112, 13-48, which also covers the closed plant room) is used as written. The facility adds
  a 0.30 zone for the south gallery strip (y 4.0-7.5) because it sits inside A4's 0.14 box (LIGHTING-PLAN 6, zone
  overlap).
- D6 **A `props` field in the contract** (`SetPart.props`, `FacilityPart.props`: `PropPlacement[]`, merged into the new
  `MapLayout.facilityProps` from 0f). The set writes the gameplay boxes itself (`FacilityProps.write(b)`).
- D7 **A `stub.ts` helper** (not in PLAN's file list): the shared stub builder the eight set files call; it goes once no
  set uses it.
- D8 **L4's east door built locked** (job lead, A4 doc A4-D3). The course drives every course door's lock from its state
  each step (`CourseMode.applyLocks`), so the door's lock at run time is A4's `egress` gate on it (and the airlock's
  seal); with the stub (no gate) the course unlocks it. A4 adds `{ kind: 'egress', id: 'g-a4-wicket', switchId:
  'a4-pushbar', doorIds: ['L4-near'] }` (`L4_EAST_DOOR` in facility.ts).
- D9 **Stub objective for A8:** "Both of you out to the cash dock." (no next holding room). Stub radio lines say the set
  is not built yet.
- D10 **Tests outside the five shared files.** Two slice 0 tests imported the old station exports: `marlowN6Scanners`
  now keeps the old station 6 pair as data (same z 0.3 / 13.7 glow guarantee, no map); `marlowPassAny` drops its
  "station 3 zone is a both-players zone" line (A3 re-adds it). Two map-generic tests failed for real on the new site:
  `levelFillParity` pinned old bunker coordinates (now facility points: holding rooms, the dock, an A8 floor point);
  `voxelFit` capped any voxel grid at 110 x 110 m (Marlow Yard's site is 160 x 78: a `ctcourse` allowance like the
  bunker's). `laserPanels`' total laser count now leaves Marlow Yard out (its lasers come and go with A5 / A8).
- D11 **Light frame bands:** pools use `MARLOW_LEVEL.poolMin` 0.60 (LIGHTING-PLAN L-A1), not SPEC's suggested 0.55;
  pockets are read as a crouched body (`MOVEMENT.crouchHeight`). `CTLIGHT_WRITE=<set>|all` writes a set's json (new;
  `CTLIGHT_PRINT=1` prints all).
- D12 **e2e-times:** the four parts start at 150 s each (estimate; the first full run replaces them).

## Tests (summary lines)
- `npx tsc --noEmit`: clean.
- `npx eslint` on `src/world/maps/ctcourse.ts`, `src/world/maps/ctcourseSets/` and the 14 touched test files: clean.
  (`scripts/**/*.mjs` is outside eslint; `node --check` on the runner, the 8 modules, `run-e2e.mjs`, `shots-ctcourse.mjs`.)
- `npx vitest run tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/guardInfo.test.ts tests/jammer.test.ts
  tests/laserPanels.test.ts tests/scanners.test.ts tests/camSpaces.test.ts tests/smoothWorldLight.test.ts`:
  "Test Files 8 passed (8), Tests 107 passed | 1 skipped (108)" (the skip is the CTLIGHT print / write case).
- `npx vitest run tests/marlow* tests/lampGridLossless.test.ts tests/levelFillParity.test.ts tests/voxelFit.test.ts
  tests/rooms.test.ts tests/rejoin.test.ts tests/roomDirectory.test.ts tests/course.test.ts tests/courselab.test.ts
  tests/courseTutorial.test.ts tests/securityRoom.test.ts tests/facilityKit.test.ts tests/facilityProps.test.ts
  tests/ctcourseGreybox.test.ts`: "Test Files 26 passed (26), Tests 336 passed (336)".
- The light bake of the whole map in node: about 9 s; 149 lamps (facility 43, sets 106), worst 2 m column within 8.
- `npm run build` (under `C:/NightShift/heavy.lock`, taken with noclobber, released): "built in 36.35s", PWA 77 entries.
- Not run: any e2e (the job lead sends `e2e-ctcourse:1..4` and `e2e-coop` to the laptop), `npm run check`.

What the frame tests guard (old cases kept where they still apply): registration, course-only, unlisted; 8 bays / 7
holding rooms 6 x 6; the chain; `validateCourse`; spawns in the lounge; no panels (M4); the exit zone both-in rule;
`checkSetPart` on every part; entry / exit doors exist; cameras <= 12 and valid; scanner pairs <= 8 (`SEC_SCANS`); one
panel per laser; the register count per part (facility and each set); the bay-1 passive guard with information; armed
guard kinds only (rule 9); text <= 90, no em / en dash, objective ids <= 40 (the 48-character wire flag); every lamp
grouped and on its own set's circuits, house lamps out of the sets; gallery lamps decor; switches on live groups; built
sets light every planned circuit; holding-room doors 1.8 m slide doors on their spots; doors >= 1.2 m; lids, pads, glass
slots, tight cameras, nav seeds; medkits in L4 / L7; the gallery out of bounds; the co-op lips band and no unplanned
3.8-4.5 m lip; the shell offers no lip; no two set / room boxes overlap. Light frame: bake time; every lamp baked; spot
bands (pool / read / pocket / cut / standby / house); no house or gallery lamp reaches a set spot (doors open and shut);
8 lamps per column; no moon; each set's tuned json. Moved to the set slices (SPEC 16): the A1 / A4 / A8 guard
information, the A3 corridor and camera, the A5 laser and panel, the A7 / A8 scanner placement, the A3 "both players"
zone, the station-specific light cases (camera IR in the dark, the security-room lamp).

## The API a set slice fills in
A set file keeps its export name and signature and returns a `SetPart` (`ctcourseSets/types.ts`). The stub is the
example (`stub.ts` `buildStub`, called by `a2CarriageShed.ts`):

```ts
export function buildA2CarriageShed(b: LevelBuilder, kit: FacilityKit): SetPart {
  const p = emptyPart('a2CarriageShed');               // no `stub: true` once built
  tally(b, p.register, 'A2-3', 'Neck high-bays group 21', () => {
    for (const [x, z] of NECK) b.light({ x, y: 6.6, z, radius: 6, intensity: 1, group: 21, electric: true, destructible: true });
  });                                                   // every light / solid / door / anchor sits in a register row
  p.groups['a2-neck'] = 21;                             // = marlowCourseGroups() row
  p.devices['a2-iso1'] = { x: 30.6, y: 0, z: 1.6, yaw: 0, label: 'Isolate neck lights' };
  p.bay.gates.push({ kind: 'isolator', id: 'g-a2-iso', switchIds: ['a2-iso1', 'a2-iso2'], group: 'a2-neck', seconds: 15, rearm: 3 });
  p.bay.roles = [{ role: 'a', press: ['a2-iso1'] }];
  p.bay.radio.push({ at: 'enter', text: 'The neck is on two isolators. Fifteen seconds of dark each time. Use them well.' });
  p.squads['a2-shunter'] = { kind: 'grunt', x: 51, z: 10, yaw: -Math.PI / 2, route: [[66, 10], [51, 10]], wait: 4 };
  p.bay.squad.push('a2-shunter');
  p.passZones.push({ id: 'a2-p-neck', box: [56, 1, 69, 19], flag: 'a2-b-past', any: true });
  p.externalFlags.push('a2-b-past');
  p.objectives.push(
    { id: 'a2-neck', bay: 'A2', text: '...', a: '...', b: '...', done: { flag: 'a2-b-past' }, timer: 'g-a2-iso' },
    { id: 'a2-lock', bay: 'A2', text: 'Both of you into holding room two.' },   // the closing line: no `done`
  );
  p.ambientZones.push({ id: 'A2', box: [28, 0, 70, 20], ambient: 0.14, minY: -1, maxY: 9.9 });
  p.camSpaces.push({ box: [28, 0, 70, 20], size: 'open' });
  p.navSeeds.push({ x: 49, y: 0, z: 10 });
  p.debugPoints.push({ id: 'A2-entry', label: 'Set 2 entry', pos: { x: 30.5, y: 0, z: 11 }, yaw: Math.PI / 2 },
                     { id: 'A2-mid', label: 'Set 2 middle', pos: { x: 49, y: 0, z: 10 }, yaw: Math.PI / 2 });
  p.lightSpots.push({ name: 'A2 neck pool', kind: 'body', x: 51, y: 0, z: 10, band: 'pool' },
                    { name: 'A2 neck cut', kind: 'body', x: 51, y: 0, z: 10, band: 'cut', off: [21] });
  p.shotVantages.push({ name: 'a2-neck', feet: [30, 0, 11], cam: [29, 1.9, 9], target: [51, 1.5, 10] });
  return p;
}
```
Rules (`checkSetPart`, run by the frame on every part): build only inside `SET_BOX[set]`; ids carry the set tag; light
groups 10 n .. 10 n + 9 and each a `MARLOW_CIRCUITS` row; cameras within `CAMERA_BUDGET`; at most 3 guards; objective
steps in the set's bay, ids <= 40, one closing line; zones within the set's bounds; light spot names start `A<n> ` and
shot names `a<n>-`; register rows `A<n>-k`. Holding-room doors, glass slots and the dock are the facility's: a set
names them by id (`setEntryDoor`, `setExitDoor`, `L4_EAST_DOOR`). Co-op pieces go through `applyGreybox` and their
`lips` into `p.lips` (the map's `COOP_LIPS`). Light: re-tune with `CTLIGHT_WRITE=<set> npx vitest run
tests/ctcourseLight.test.ts`, then rerun without it. Per-set cases go in `tests/ctcourse/<set>.test.ts`.

## What the e2e stub walk does
`node scripts/run-e2e.mjs e2e-ctcourse` runs `:1`-`:4` (A1-A2, A3-A4, A5-A6, A7-A8), each two pages over
`?net=local`; a part after the first starts at its first set through the host session's `courseBay`. Each part: the
join checks (both avatars drawn on the other page, the "Connecting" label gone); part 1 the host-only pause restart at
A1 (the client's rows disabled "Host only", the confirm on Stay, the client brought back). Per set, the module's
`walk(t, n)` runs; every stub calls `t.stubWalk(n)`: both pages show the step line, both players teleport to
`A<n>-entry` then `A<n>-mid`, and both pages read the same baked light there (within 0.01, at least 0.40). Then the
runner puts both on the exit holding room's pad and waits for the course to move on, and checks the client sees the
near door locked and the far door unlocked. Part 4 ends in the cash dock: the client downed and revived by the host
inside the 30 s window (one of two revives used), one player in the exit zone does not end the course, both do, and the
end stats carry the time and the revive. The old bunker stations' steps (camera hallway, security room with the
`looped` feed, laser and panel, throw, hang-down, scanners, rope) are in git at 5920cce5 for the set slices to adapt;
each stub module names the ones its set should re-add (A4: the console's `'looped'` feed, the job lead's 5920cce5 fix).

## Open items
- e2e not run here: `e2e-ctcourse:1..4` and `e2e-coop` (the bay-1 guard is now `a1-checker` in A1) go to Character
  Build. The four parts are new; `e2e-times.json` holds estimates.
- GPU and shot scripts still on old ids / coordinates (not in 0d's files): `nv-shots.mjs`, `sector-lights-shots.mjs`,
  `sector-fixes-c-shots.mjs` (`cam-s3`, `laser-s4`), `camera-cue-shots.mjs`, `wheel-shots.mjs`. They need the sets'
  devices; until then they point at nothing on this map.
- Docs for slice 9: `docs/systems/testing-tools.md:42-44` still describes three station groups; TESTING.md's Marlow
  checks; SPEC 7 / F3 / F4 group numbers (D1) and 0.45 m walls (D2).
- Not built in the greybox: locked staff doors and fire exits into the service corridors (F7; a plate and a red sign in
  the 0e dressing, no anchor), set signage plates (KIT.md 6).
- The stub hall lamps reach the gallery through its glass (set -> gallery spill is not tested; only house -> set is).
  Out of bounds and render-only; the set slices' real lamps should keep 0.3 m short of the glazing (`spillsPast`).
- The map is built once at module load (N8 registry and the shot / spot lists): about 2 ms in node.
- The detail pass (`MapDef.detail`) is still on for Marlow Yard: its generated skirting and conduits will sit on the
  kit's charcoal walls; 0e decides (`detail: false` turns it off in the light shapes too).

## Michael should try
`?autostart=ctcourse&mode=course` (or co-op from the lobby): the lounge spawn, eight empty lit halls in route order, each
holding room's sliding doors (Open only), the pad cycling both doors, the glass slot beside the far door, the instructor
gallery's glazing and warm lamps above the sets, the medkits in L4 and L7, the plinth in L7, the cash dock's exit zone.
