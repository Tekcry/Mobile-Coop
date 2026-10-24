# marlow-polish: polish batch 3 (builder briefs)

Planner: Opus, 2026-10-23, on `feature/marlow-polish` head afefe329. Plan only; no code was changed to write this.
Source: `docs/marlow-final/plans/POLISH-2.md` "Seen, not in this batch".

## Rules for every builder in this batch
- Read `docs/systems/agent-preamble.md` first. Work on your slice branch, cut from **afefe329** (the lead creates it; the desktop
  builder in its own worktree, the cloud builder in its clone). Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = <slice branch>`. Never commit, push, stash, reset or checkout: the lead commits.
- Edit only the files your slice owns. A `tsc` error in a file you do not own: note it, do not fix it.
- Do not touch `changes/feature-marlow-polish.md`; put the draft changes line in your report.
- Must not change: the wire shape, `PROTOCOL_VERSION` 42 (`src/net/protocol.ts:20`), the save shape, grants, cards, top-ups,
  any `*.light.json` (never regenerate a bake). No number in an existing test is edited. An existing assert that must change
  may change only its selection or add a derived term (`+ stairRail.length`, `.filter((p) => !stairRail.includes(p))`); list
  every such edit in the report. Anything else failing: stop and report.
- Unit tests only: `npx tsc --noEmit -p tsconfig.json` and the single vitest files named. No e2e, no `npm run check`, no dev,
  preview or watch mode. A timeout on every command.
- Report: `docs/marlow-final/slices/P3-<n>.md` (built, files and line ranges, tests added, assert edits, check results, skipped,
  draft changes line). Final message: done / not done, results, open items.

## Slice P3-1: the A6 interlock lamp (red until the drive is isolated, green after)
**Model: Opus** (src/game + props render), effort high, desktop. **Branch:** `feature/marlow-p3-interlock-lamp`.

**Goal.** The radio says "The interlock is green" (`a6PumpHouse.ts:344`), but beside the L6 door there is only a housing skin
(`:741-743`). Put a lit status lamp there: red while `a6-drive` (`A6_DRIVE_FLAG`, `:83`) is clear, green once set, red again
after a bay restart clears it. Same on host and client. Visual only: an unlit emissive prop, no light, no collision.

**Why the design** (read before building):
- `PropRender.setDevice` (`propRender.ts:248`) only lights or dims (`PROP_DARK`, `:208-213`). Red / green needs one new
  optional field, `lampOff`: the lamp colour shown, lit, while the device is off.
- No props GLB rebuild. No small lamp prop exists, so use `pushStation`. It is a wall cabinet with a status lamp
  (`scripts/facility-props/build.py:722-729`), 0.6 m wide, hung, no collision box (`facilityProps.ts:308`). It is
  `PROP_OWN_SUPPLY` (`:603`), so the light-parity tests already exempt it.
- Sync is the A5 lens path: `applyJam` runs on both roles (host `fixedUpdate` `ctDevices.ts:850`, client `apply` `:1162` /
  `frame` `:1181`). It reads `shared` = `hooks.hasShared` (`:955`). The client's course state gets its flags from the
  course snapshot (`courseState.ts:924`, `:961-962`; client hooks `courseMode.ts:1097`). **No wire change.**

**Owns:** `src/world/props/facilityProps.ts`, `src/world/props/propRender.ts`, `src/game/ctDevices.ts`,
`src/world/maps/ctcourseSets/a6PumpHouse.ts`, `tests/flagLamp.test.ts` (new), `tests/facilityProps.test.ts`,
`tests/ctcourse/a6PumpHouse.test.ts`, `scripts/e2e-ctcourse/a6PumpHouse.mjs`.

**Change.**
1. `facilityProps.ts`, `PropPlacement` (`:624-647`), and `FacilityProps.add` opts (`:946-954`): `flag?: string` (the shared
   course flag the `device` follows, on = set; `CtDevices` reads it, render never does) and `lampOff?: Rgb` (the `lamp` colour
   while the device is off, lit; unset: dim, as today).
2. `propRender.ts` `paint` (`:215-228`): for a `lamp` draw, a placement whose device is off and that has `lampOff` shows
   `lampOff` at `PROP_LAMP_GAIN`, scaled by its circuit as today (`groupLit`). Every other case is unchanged. Update the
   header (`:11-13`) and the `setDevice` doc (`:246-247`).
3. `ctDevices.ts`:
   - In the constructor, after the lasers / panels (`:376-388`), collect `flagLamps` once from `lay.facilityProps`:
     `{ id: device, flag, on: -1 }` for each placement with both fields, deduped by id.
   - In `applyJam`, after the laser loop (`:988-996`): `const on = !!shared?.(f.flag)`. Only on a change (the first pass
     always, because `on` starts at -1) call `this.g.world.facilityProps?.setDevice(f.id, on)`.
   - Allocation-free; no per-step writes; nothing in gameplay reads it. Add `flagLamps: [{ id, on }]` to `debug()` (`:1222`).
4. `a6PumpHouse.ts`:
   - Export `A6_INTERLOCK = 'a6-interlock'`.
   - In A6-25 (`:786-794`), after `props.write(b)` so it writes no box: `props.add('pushStation', A6_SHELL.east, 64.0,
     -Math.PI / 2, { y: 1.41, device: A6_INTERLOCK, flag: A6_DRIVE_FLAG, lamp: PROP_LAMP_TINT.default, lampOff: [1.0, 0.12, 0.08] })`.
     The lamp's centre then sits at about (63.44, 2.30, 64.0). It fills the gap the east wall's base leaves, z 63.7-64.3 (`:736`).
   - Keep the housing and label skins (`:742-743`; asserted at `a6PumpHouse.test.ts:1110`). They sit behind the cabinet.
   - Update the A6-25 tally, the A6-22 comment and the A6-8 register row (`:285`): "the interlock station's lamp, red /
     green on a6-drive (device emissive, own supply, no collision)".

**Tests.**
- `tests/flagLamp.test.ts` (new): **"(P3-1) the A6 interlock lamp: red until a6-drive, green after, on the host and the client"**.
  - A minimal world on `laserPanels.test.ts:244-290` (no lasers), `layout.facilityProps` = the A6 placement, the
    `setDevice` mock of `laserPanels.test.ts:367`, `hasShared` from a `Set`.
  - Host: step 1/60 gives `['a6-interlock:false']` (red); more steps add no calls; set the flag: `:true` (green); clear it
    (a bay restart): `:false`. Client: the same through `frame(1/60)`. Teeth: no flag placement, no calls.
- `tests/facilityProps.test.ts`, beside `:372-379`: a NullEngine `PropRender` with a `lampOff` pushStation. Green at the
  start. Red at full gain (not `PROP_DARK`) after `setDevice(id, false)`. Green after `true`. A plain device placement still
  dims (bites).
- `tests/ctcourse/a6PumpHouse.test.ts`:
  - New: one `pushStation` with that device / flag / lamp / lampOff. Its lamp is within 2 cm of (63.44, 2.3, 64.0).
    `propCollisionBox` is null. It is in `PROP_OWN_SUPPLY`.
  - Derived edits: `pipes = own.filter((p) => p.prop === 'pipeRun')` replaces `own` at `:812`, `:882`, `:886`, `:937-938`;
    reword the `:933` title ("pipe runs and the interlock station, own supply"). Unchanged and passing: `:1000`, `:1110`.
- `scripts/e2e-ctcourse/a6PumpHouse.mjs`: at step 1 (`:163`) `window.__ctdev.debug().flagLamps` is
  `[{ id: 'a6-interlock', on: false }]` on both pages; after `:256`, `until` it is `on: true` on both (15 s).

**Must not change:** `tests/laserPanels.test.ts` (its `calls` asserts at `:370` and `:386-392` must pass as written), any
laser / panel / camera behaviour, any lamp or circuit, the light bake.

**Verify.**
- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run tests/flagLamp.test.ts tests/facilityProps.test.ts tests/laserPanels.test.ts tests/ctcourse/a6PumpHouse.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts`
- `node --check scripts/e2e-ctcourse/a6PumpHouse.mjs`

**Done looks like:** red at A6's start, green after `a6-drive`, on both roles; `git diff --stat` shows only the owned files;
no wire, protocol or bake change.

## Slice P3-2: collision rail on A2's east stair (open south side)
**Model: Sonnet** (world data + tests), effort medium, cloud queue. **Branch:** `feature/marlow-p3-a2-stair-rail`.

**Goal.** The east stair's drawn rails (A2-17, `a2CarriageShed.ts:383-399`, visual skins) also hold a body, the same way
P2-3 did A4 / A8. Read first: `git show 097eb946` (the A4 build at `a4GoodsShed.ts` A4-17, `A4_STAIR_RAIL`) and
`docs/marlow-final/slices/P2-3.md` (its assert-edit list is the model). Undo: drop the new `kit.handrail` calls.

**Owns:** `src/world/maps/ctcourseSets/a2CarriageShed.ts`, `tests/ctcourse/a2CarriageShed.test.ts`.

**Geometry** (`flight = deck.stairs[0]`, `:369-374`).
- The flight runs x 62 (head, 4.4 m) to 69.7 (foot), z 18.8-19.75 against the north wall. It rises toward -x; the open side is
  south (`zStairS` 18.8).
- The foot is 0.05 m from the east wall (`SHELL.east` 69.75, `:84`). So the only way onto the flight is from the side,
  across the bottom treads. That side entry must stay open.
- **Start the rail at x 68.6, not at the third tread.** At the third tread (about 69.15) the gap to the wall is 0.6 m, one body
  width, so the side entry would close. At 68.6 the walking line is 0.63 m up, a harmless drop; A6's rail also starts 1.1 m up.

**Change.**
1. Export `A2_STAIR_RAIL = { z: 18.75, seg: 0.55, h: 1.1, from: 68.6, to: 62 }` beside `STAIR_FILL` (`:105`), with a doc
   comment in the `A4_STAIR_RAIL` style. The rail is 12 segments; 6.6 m / 0.55 is a whole number. All values are on the kit's
   0.05 m snap.
2. In A2-17, after the visual rails, add the segments as in P2-3. For `k = 0..11`: `xa = from - k * seg`, `xb = xa - seg`,
   `kit.handrail(xa, z, xb, z, { y: lineAt(xa), h: h + lineAt(xb) - lineAt(xa), group: G_STAGING })`.
   - The visual rails stay.
   - Measure the head (x 62, z 18.75) against the deck's east end and its edge screens (`ctcourseGreybox.ts:336-337`). Report
     any open drop beside the head; do not fix it.
3. Update the A2-17 tally text and the header (`:24-31`, "the only new collision ..."): name the open side's collision rail
   (kit.handrail, invisible noLedge, 12 stepped segments from x 68.6 to the head; the bottom treads stay open from the side).

**Existing asserts that need derived edits** (add `stairRail = dressing.filter((p) => p.collide && Math.abs(p.c[2] - A2_STAIR_RAIL.z) < 1e-6)` near `:669`):
- `fillers` (`:669`) excludes `stairRail`. Otherwise the filler geometry checks at `:735-745` fail.
- `:703` solids and `:705` collider count add `+ stairRail.length`.
- The kit glow test: the `i.y >= A2_DECK.lip` line (`:847`) skips the stair rail's modules (z 18.75). Assert those
  modules separately: on group 23, `G_STAGING`.
- The `:695` title ("the only new collision is the stair fillers and the permit gate's box") may be reworded.
- `:126-129` is derived already. Leave `:183-190` / `:900-914` (`soloJumpThreats`) as written; they must pass with the rail in.

**Tests to add** (in the dressing describe, as P2-3's `a4GoodsShed.test.ts` pair):
- Geometry: 12 segments of 0.55 m on z 18.75, the face never inside the flight (z >= 18.8 clear), each top >= 1.1 m over the
  line at its high end, no gap, ends at x 62, invisible, `noLedge`, kit modules on group 23.
- Walkable: a body (`MOVEMENT.radius`) clears the centre line and an edge lane 0.3 m in for the whole flight; the side
  step-on walks from z 18.0 to 19.3 at x 69.45 and 69.2 are clear.
- Step-off blocked: a body 0.1 m outside the open edge at the walking line hits the rail from x 68.6 to the head. The same
  probe without the rail boxes hits nothing (teeth).
- Lanes: the floor strip south of the flight (z 17.0-18.2, x 62-69.4) stays walkable. The shunter's route
  (`A2_SHUNTER_ROUTE`, `:51`) and the debug points (`:641-647`) are unchanged.

**Verify.**
- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`
- If `ctcourseLight` or a `*.light.json` check fails, stop and report.

**Done looks like:** no step-off from x 68.6 up; the side entry, the flight and the strip south of it stay open; every existing
A2 assert passes with only the derived edits listed.

## P3-3: left out
The e2e honesty items stay out. The A3 host presses office 1's switch from 18.8 m (`a3OfficeRange.mjs:394` / `:423`) and the
A4 host presses the floor switch from about 26 m. Both sit next to timing-sensitive lure steps in suites that only just went
green. Moving them now risks new flakes for no player-visible gain.

## Parallel groups and order
- **P3-1 and P3-2 run at once.** Their files do not overlap:
  - P3-1: `facilityProps.ts`, `propRender.ts`, `ctDevices.ts`, `a6PumpHouse.ts`, `tests/flagLamp.test.ts`,
    `tests/facilityProps.test.ts`, `tests/ctcourse/a6PumpHouse.test.ts`, `scripts/e2e-ctcourse/a6PumpHouse.mjs`.
  - P3-2: `a2CarriageShed.ts`, `tests/ctcourse/a2CarriageShed.test.ts`.
  - P3-2's test imports `PROP_OWN_SUPPLY` from `facilityProps.ts`. P3-1 does not change it.
- Checkers: one Opus checker for P3-1 (`src/game`, render). One Sonnet checker for P3-2. One fix round each; a failed
  Sonnet slice gets its fix round from Opus.
- After both merge into `feature/marlow-polish`, one laptop request on the merged head (E2E_GPU=1): `e2e-ctcourse:1` (A2's
  stair), `e2e-ctcourse:3` (A6: the lamp asserts and the L6 exit), `e2e-coop` and `e2e-netmove` (`src/game` changed).

## Lead rulings (Marlow Build, 2026-10-23 ~20:15)
1. P3-1 may add the optional `lampOff` field to `setDevice` (colour while the device is off).
2. P3-1's lamp is a `pushStation` cabinet for now (prototype); a purpose-built lamp prop goes on the polish list.
3. P3-2 measures the A2 deck's east-end drop beside the stair head and reports it; no fix in this slice.
4. Cloud builder (P3-2): push your branch yourself per the cloud-queue README (overrides "the lead commits").
