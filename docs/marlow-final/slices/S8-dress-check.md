# S8 dressing and S1 prop emissives - fresh check

Checked: committed HEAD 75d70466 (working tree clean at the start). Scope: A8 dressing (63e3e892 + 75d70466) and prop emissives S1 (0aa53f12 + the WIP parts of 63e3e892).

## Checks run
- `npx tsc --noEmit`: exit 0, no output.
- `npx eslint src/world/props/*.ts src/game/ctDevices.ts`: exit 0, no output.
- `npx vitest run tests/ctcourse/a8Strongroom.test.ts tests/facilityProps.test.ts tests/laserPanels.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/voxelFit.test.ts tests/levelFillParity.test.ts tests/facilityKit.test.ts`: "Test Files  8 passed (8), Tests  169 passed | 1 skipped (170)".
- No npm run check, no e2e, no source or test edits.

## Verdict
| Part | Verdict |
| --- | --- |
| 1. A8 dressing | PASS |
| 2. Prop emissives S1 | PASS |

Must-fix count: 0.

### Part 1 against DRESS-BRIEF RULES
- Visual over greybox: every hand-built piece goes through `skin` / `slope`, which `b.box(..., collide false)`, `noLedge`, and throw if no side is under `THIN` 0.05 (below `CANON_MIN_THICK`, so out of the canonical light shapes). The greybox is pinned in the test (138 boxes, checksum, 81 solid, 16 lamps, 5 doors, 1 anchor); the dressing is appended after it.
- Collision: only the 6 `depositWall` boxes (`PROP_COLLISION`: 1.19 x 2.39 x 0.56, `noLedge`), at z 58.15-58.71 and 65.29-65.85. The vault stays 6.58 m wide at the narrowest (test asserts at least 6.5). The door axis is z 61.3-62.7, clear. The box top is 2.39 under the 3.0 roof (0.61 m gap, nothing stands there), and 1.9 m or taller is `noLedge`. `soloJumpThreats` is empty in the test over all solids, including these six.
- Door and corridor widths: bank counters and the desk props are 2 / 3 cm proud of their boxes, no box written. The tests walk N1, N2's five points, the jam spot, the leg-up mark, the board lane and the grille approach with a 0.3 m body (5 cm to 2.1 m) and find no skin.
- Camera, guard and jam lines: skins are not canonical shapes, so sight and camera lines read the greybox. The tests also check no skin touches a lamp fixture, a device place, a lens, a switch or a door's clear opening.
- Budgets: kit 30 824 tris (limit 60 000); props 3 616 tris, 3 640 tris and 12 draws with the facility's set-side plate (limit 60 000 / 12); `FacilityProps.check(SET_BOX.a8Strongroom)` is `[]`; 1 748 skins (under 2 500).
- Light parity: no lamp added (16). Kit panels and slots carry groups 81-84 (`light:false` on the slots); every glowing prop (night desk, 5 sign plates) carries a circuit with a lamp (test). `ctcourseLight` and `a8Strongroom.light.json` are green.
- Structure matches A1 / A2 (register rows A8-16 to A8-31 through `tally`, per-row skins with bare holes for devices, the same test families: greybox pin, skin audit, inside-set-box, routes, budgets, groups). The deviations (no `vaultDoor` / `bankGrille` / `timeLockPanel` / `lightingBoard` as props, because the 12 draws are used up) are written in S8.md with an undo.

### Part 2 against the hard rules
- Babylon: `propRender.ts` imports only `../../core/babylon`; `LightRegistry` is a type import.
- Frame path: `frame()` compares `reg.version` with `regVersion` and repaints only on a change. `groupLit` is an index loop with no allocation. The observer closure is made once in `fromModel`, not per frame. `setDevice` allocates only on a state change (`Set` add / delete). `paint` writes a typed array and calls `thinInstanceBufferUpdated`. The `[...draws.map]` in `meshes` is a test / overlay getter, not a frame path.
- Gameplay never reads graphics state: `applyJam` only calls `facilityProps?.setDevice(id, on)` after it has derived `on` from `laserLive`; nothing reads back. The sensor still reads `l.on`.
- Co-op client: `applyJam` is documented "(both roles)" and is called from the tick (583, 599, 796), the snapshot apply (1086, 1105) and others, with no host gate. The laser `on` change and the `setDevice` call therefore run on the client, so its lens follows (the phase `dv.d.ph` comes from the snapshot). `laserPanels.test.ts` covers host only (a mock `facilityProps`); the client case is by reading, not tested.
- `reg.version` bumps on every `setOn`, `setGroup`, `destroy`, `restore`, `resetTo`, `disrupt` and EMP end (lights.ts), so a cut, a shot and a re-power all repaint.
- A group with no lamp paints dark (documented, as the kit's). Every grouped prop's circuit is shown to have a lamp in the per-set tests (A1-A8). The group 10 lounge props are lit only once A1 builds its group-10 lamps (A1's test checks this).
- Tests: `facilityProps.test.ts` covers a cut group, a switch back on, a shot lamp, a device on / off, tint still wins, no registry means lit, thin-instancing kept, and `PROP_EMISSIVE_PARTS` against the GLB. `laserPanels.test.ts` covers the jam and the reboot end. Sets A1-A8 each assert that every lit prop has a group, a device, or the `PROP_OWN_SUPPLY` reason.

## Must-fix
None.

## Should-fix
None.

## Polish list
1. `docs/marlow-final/slices/S8.md` "## Dressing": still says "Not committed" and quotes "153 passed" for the old run; both are stale after 75d70466 (now committed; the same suites give 169 with `laserPanels`).
2. The A8 header comment says the vault stays "6.5 m wide"; the number is 6.58 m (6.5 is the test floor). Both are true, the wording could say 6.58.
3. The A8 props are at exactly 12 / 12 draws with the facility plate: no headroom for a later prop (the doc says so). Raise the cap before adding `bankGrille` or a prop vault leaf.
4. Client-side lens follow has no test of its own (a `CtDevices` built with role `'client'` and a snapshot phase calling `setDevice`). Safe by reading; one small case in `laserPanels.test.ts` would pin it.
5. `repaintGroups` / `paint` call `litNow` per instance, so a registry change costs placements x lamps (A7: 37 racks + 3 + 9 plates). Fine at the A7 size and only on a change; revisit only if a set gets hundreds of grouped props.

## What only GPU shots or e2e can prove
- Look of the hall (oak, stone, brass, marble under the charcoal kit panels; the join at 9.2 m), skin layering and z-fighting between pilasters, dado, windows and picture rail, and the board cabinet and knob.
- Frame time with 1 748 skins plus the kit.
- 0.06 of the colour reading as dark against bloom: sign plates, desk screen and coves going dark with the board (81) while 82-84 stay lit; A7 racks with 70 cut; the A5 lenses with the panel jammed.
- Co-op: the client's beam-tower lenses going dark and returning with the host's jam and reboot (e2e or a two-window check).
- Deposit walls with two players in the vault, the vault door swing, and the stair rails read as open sides (feel, not geometry).
