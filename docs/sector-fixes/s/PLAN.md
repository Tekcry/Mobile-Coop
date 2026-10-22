# sector-fixes slice S - security room (plan)

Branch `feature/sector-fixes-s` (from master 5220f79c). Ask (Michael, 2026-10-22, verbatim): "If there are cameras, there
should be a security room with a guard watching the cameras. You can take him out and shut off cameras (but in sector
ops it's not possible)." Brief S: any takedown (non-lethal or lethal) lets a player use the console to switch the
section's cameras off; Michael chose "Not in Sector Ops". Prototype grade (CLAUDE.md current goal): no polish.

## 0. Scope
Maps with cameras: `ctcourse` (Marlow Yard, `cam-s3` only), `warehouseOps` / `warehouseSectors` (Sector Ops: excluded,
Michael), `seclab` (debug, sandbox mode: no course framework, no `CtDevices`), `kestrel` (paused, G53), `bunker*`
(Fallow, parked). **S = Marlow Yard station 3 only** (A1). Seclab gets nothing (A1).

## 1. Where: the security room behind the S3 hallway
Station 3 today (`ctcourse.ts:130-150`, bay x0 = `bayX(2)` = 44): entry lobby x 44-47; the camera hallway x 47-57.6,
z 0.15-3.05 (north wall z 3.2 to the 4.5 m ceiling); far lobby x 57.6-60 (pass zone `p-s3`); `cam-s3` at x 59.6, z 1.6,
y 2.4, looking west. The rest of the cell (x 47.15-57.45, z 3.35-13.85) is sealed void under the bay's slab.

The room takes the void's north-east corner, entered from the **far lobby** (A2):

| Item | Value (absolute; x0 = 44) |
| --- | --- |
| Room interior | x 51.75-57.45, z 8.15-13.85 (5.7 x 5.7 m), ceiling = the S3 slab (4.5 m, already there) |
| New walls (0.3 m, to the ceiling, `noLedge`) | west `wallZ(x0 + 7.6 = 51.6, 8, 14)`; south `wallX(8, 51.6, 57.6)` |
| Door | in the existing cross wall `S3_HALL.x1` (57.6): gap z 9.2-10.4 (1.2 m), lintel 2.1 m to the ceiling, `doorFrame`, `b.door(57.6, 0, 9.2, 1.2, 0)`; an ordinary unlocked door, not a course door |
| Monitor wall (V3 moved here, A8) | west wall face x 51.75, z 9.0-13.0, y 1.0-2.7, 3 x 2 screens (render-only emissive, as now) |
| Desk | centre x 52.35, z 9.9-12.1, 0.6 deep, top 0.73, `collide=false` (A9, as the S1 sentry desk V1) |
| Guard post | x 53.1, z 11.0, yaw `-Math.PI / 2` (faces -x, the monitors; his back to the door) |
| Console (course device) | x 52.55, z 11.6, y 0.9, yaw `Math.PI / 2`, reach 1.4 (the course default) |
| Lamp | flush `PANEL` at (54.6, 4.35, 11.0), intensity 0.8, radius 6, `WHITE` (a ceiling panel on the cell's circuit) |
| Camera space | `{ box: [51.6, 8, 57.6, 14], size: 'tight' }` |

Why there: the camera lesson stays (the first runner still needs the partner's jam); the room is an alternative to the
second jam (the jam handoff J2 / J3, #101, is Michael's approved design and keeps working unchanged, A11), a co-op beat
for whoever got through first. Both players reach it (the second after crossing). The door is behind the
camera (about 76 deg off its axis, out of frame at every sweep angle) and a blast-cell security room off the guarded
side is the CT shape. Level standard: 16.6.2 (a guarded valuable room off the secure side), 16.8.1 (lamp owner and
fitting), 16.8.2 / 4.1 (a guard with a job: the duty officer at the monitors), 16.9 (register rows, part C).

## 2. The guard
- Squad slot `s3-sec-guard`: `grunt`, `passive: true` (A3: the training guard rule of S1: sees and hears nothing, stands
  his post until taken), standing (no seated pose exists), facing the monitors. Bay 3's `squad` = `['s3-sec-guard']`:
  spawned at bay start, respawned fresh on a bay restart, removed when bay 4 starts (existing `spawnSquad`).
- INTERROGATE (`info`, existing `GuardInfo`): one line, "All right! The desk console switches the hallway camera off."
- No reaction of his own to the monitors (A3): a sighting is already handled by the camera (alarm stage, LANTERN line,
  the hallway send-back). "Watching the cameras" is what gates the console.
- "Taken out" = `!enemy.alive` (knockout or kill: takedown, strike, shot; `Enemy.knockOut` / `die` both zero health).
  Held in a grab (alive) is not out (A4).

## 3. The console and "cameras off"
- Course device `sw-s3-console` (interactable `c-sw-s3-console`, label "Security console: cameras off") with a
  `pickup` gate `g-s3-cams` (flag `cams-off-s3`, `perPlayer: false`). Pickup gates gate nothing (as the panels).
- `CourseMode.press(cid, p)` checks first (`consoleFor` / `consoleRefusal`): guard up -> refusal "The guard is watching
  the monitors. Take him out first."; flag already set -> "The cameras are already off."; else `CourseState.press` sets
  the flag. Refusals reach the client by the existing `ref` / `rn`.
- `CameraDevice.offFlag?: string` (as `LaserDef.offFlag`): `cam-s3` gets `offFlag: 'cams-off-s3'`. "The section" = every
  camera whose `offFlag` is the console's flag (A6). In `CtDevices` a camera with its flag set is treated like a
  Sector Ops dead device: `setMode('off')` (meters zeroed: no detection, no alarm, no send-back), LED dark
  (`SecurityView` already shows `LED_OFF` for a non-online camera with `jam` 0), the cue hides (`CameraCueView` reads
  `mode`: no cue file edit), not a jam target, not picked.
- Reversible: no (A5). It stays off until a bay restart, which clears bay 3's flags (`CourseState.restart`) and
  respawns the guard: the camera comes back on (`camOff` path in `applyJam`).
- Text (original; radio and refusals <= 90 chars): gate radio `'g-s3-cams'`: "Cameras off. Your partner can walk the
  hallway."; a second LANTERN line at S3 start (A10): "Security room off the far lobby: down its guard, and his
  console turns the camera off." (86).
- Co-op: the host decides (guard state, flag); course flags already go host -> client in `PackedCourse.flags`, and the
  client's `CtDevices` mirror has `has: (f) => st.hasFlag(f)` and runs `applyJam` every frame. **No wire change,
  `PROTOCOL_VERSION` stays 28** (A7). A client's takedown of the guard is host-approved (`td`), so the host's `Enemy` is
  the truth.

## 4. Files (and nothing else)
New pure module `src/game/course/securityRoom.ts` (Babylon-free):
```ts
/** A security room's console (sector-fixes S): usable once its guard is down; sets `flag`, which switches off every
 *  camera whose `offFlag` is that flag, until the bay restarts. */
export interface SecurityConsole { id: string; guard: string; flag: string }
export const CONSOLE_GUARD_UP = 'The guard is watching the monitors. Take him out first.';
export const CONSOLE_DONE = 'The cameras are already off.';
export function consoleFor(list: readonly SecurityConsole[] | undefined, cid: string): SecurityConsole | null;
export function consoleRefusal(guardUp: boolean, done: boolean): string | null;
export function cameraOff(def: { offFlag?: string }, has: ((f: string) => boolean) | undefined): boolean;
/** Rule violations: device, squad slot and a pickup gate on the console setting `flag` must exist; a flag no camera
 *  names is an error too. Empty = valid. */
export function consoleErrors(lay: CourseLayout, cameras: readonly { id: string; offFlag?: string }[]): string[];
```
Edits: `src/security/data.ts` (`offFlag?` on `CameraDevice`), `src/game/course/courseDef.ts` (`CourseLayout.consoles?:
SecurityConsole[]`, `import type`), `src/game/ctDevices.ts` (camera code only, three hunks: `applyJam`'s camera test
`ph !== DEV_IDLE || this.dead.has(id) || cameraOff(c.def, this.hooks.has)`; `fixedUpdate`'s jam `ok` and `skipPick`
refuse a camera that is `cameraOff`), `src/game/modes/courseMode.ts` (`squadIds: string[]` beside `squad`; public
`squadOf(slot): Enemy | null`; the console check in `press`), `src/world/maps/ctcourse.ts`, `src/world/maps/ctcourseVariety.ts`.

## 5. Split (no shared files)
Pinned ids (everyone uses these exact strings / names, exported from `ctcourse.ts`):
`S3_SEC_GUARD = 's3-sec-guard'`, `S3_CONSOLE = 'sw-s3-console'`, `S3_CAMS_OFF = 'cams-off-s3'`, gate `'g-s3-cams'`,
`S3_SEC_ROOM = { x0: 51.6, x1: 57.6, z0: 8, z1: 14, door: [9.2, 10.4] }` (written as `bayX(2) + 7.6`, `S3_HALL.x1`),
`S3_SEC_POST = { x: 53.1, z: 11.0, yaw: -Math.PI / 2 }`, `S3_ROOM_RADIO`; layout field `course.consoles =
[{ id: S3_CONSOLE, guard: S3_SEC_GUARD, flag: S3_CAMS_OFF }]`; `CourseMode.squadOf`; module names of section 4.

- **A, map (Opus):** `ctcourse.ts` (room walls, door gap + lintel + frame + door, lamp, camera space, squad slot and
  info, bay 3 squad, console device + `g-s3-cams` gate, `GATE_RADIO['g-s3-cams']`, the S3 enter line, `offFlag` on
  `cam-s3`, `consoles`; nav seed in the room only if the guard fails to spawn); `ctcourseVariety.ts` (`monitorWall` moved
  to the room's west wall, the desk); `tests/ctcourse.test.ts`; `tests/ctcourseLight.test.ts`.
- **B, logic (Opus):** `securityRoom.ts` (new), `data.ts`, `courseDef.ts`, `ctDevices.ts` (camera hunks only),
  `courseMode.ts`, `tests/securityRoom.test.ts` (new).
- **C, e2e + docs (Opus or Sonnet):** `scripts/e2e-ctcourse.mjs` (one new `securityRoom(x0)` function, called at the end
  of `station3`), `CHANGELOG.md` (Unreleased - sector-fixes), `TESTING.md` (one checklist line),
  `docs/ct-prototype/CTCOURSE-SPEC.md` (S3 row; register rows SR1 room and door, SR2 desk and monitors (V3 moved), SR3
  lamp L30, SR4 the guard), `docs/systems/coop.md` (one line: camera off rides the course flags, no wire change).

A and B run in parallel; `npm run check` only once both are in (A imports B's type, B's `courseMode` reads A's layout
field). C writes against the pinned ids and runs after A + B.

## 6. Tests
Unit (`npm test`):
- B `tests/securityRoom.test.ts`: `consoleRefusal` matrix (up / down x done / not); `consoleFor` hit and miss;
  `cameraOff` (no flag, flag unset, set, `has` undefined); `consoleErrors` on a hand-built layout (missing device,
  slot, gate, unnamed flag); Sector Ops guard: no `WAREHOUSE_OPS_SECURITY` camera has an `offFlag` (Michael's choice);
  a minimal `CourseState`: pressing the pickup sets the flag, `restart()` clears it and returns the guard slot.
- A `tests/ctcourse.test.ts`: `consoleErrors(lay.course, lay.security.devices)` is empty; the guard slot is passive,
  inside the room, facing -x; the console is inside the room within 1.4 m of a standing spot clear of the guard; the door
  gap exists in the x 57.6 wall and the void south of z 8 has no opening; no new ledges in the room (`generateLedges`);
  radio and refusal lengths; the radio count test +1 for the new enter line.
- A `tests/ctcourseLight.test.ts`: the S3 lamp count 4 -> 5 (the room lamp electric and destructible too); the room
  reads lit at the guard (meter body > the dark band); the tuned spots still hold within 0.08 (door shut); the lamp
  column limit holds.

e2e (C, `securityRoom(x0)` in `e2e-ctcourse.mjs`, part 1): client teleported into the room (x0 + 9.8, 10); `use(B,
'c-sw-s3-console')` with the guard up -> no flag, host `debug().refusal` matches /Take him out/, `cams[0].mode` online on
both pages; host knocks the guard out (`__course.squadOf('s3-sec-guard').knockOut(...)`, HitInfo as `CtDevices.touch`
builds one); `use` again -> `hasFlag('cams-off-s3')`, `cams[0].mode === 'off'` on both pages, `cue[0].shown` false on both,
the client's `rl` radio matches /Cameras off/; client in the hallway (x0 + 6, 1.6) for 3 s -> alarm stage unchanged and
the cue never `seen`; a third press -> refusal /already off/; client back to the far lobby for `throughAirlock(2)`.
Slice tier: `e2e:quick` + `e2e-ctcourse` + `e2e-coop` / `e2e-netmove` (src/game changed).

## 7. Assumed decisions (undo)
- A1 S = Marlow Yard only; seclab nothing (sandbox, no course devices); Kestrel and Fallow no new work. Undo: a seclab
  console once seclab runs `CtDevices`.
- A2 Door from the far lobby, so the first runner still needs the jam. Undo: the door gap on the entry lobby's cross
  wall `S3_HALL.x0` instead (a full bypass of the drill).
- A3 Passive training guard, no monitor reaction of his own. Undo: drop `passive: true` (a real grunt facing the monitors).
- A4 Taken out = not alive; a held guard is still up. Undo: `guardUp` also false while `taken`.
- A5 One-way until a bay restart. Undo: a second press clears the flag (needs `CourseState.clearFlag`).
- A6 Section = cameras sharing the console's `offFlag`. Undo: per-console camera id list in `SecurityConsole`.
- A7 No wire change (course flags). Undo: n/a.
- A8 The S3 monitor wall (V3) moves from the south wall into the room. Undo: keep a copy on the south wall.
- A9 Desk `collide=false` (no vault / mantle, no nav change). Undo: collide with `noLedge`.
- A10 A second LANTERN line at S3 start names the room. Undo: drop the line (the guard's INTERROGATE line stays).
- A11 (orchestrator guard rail, 2026-10-22) The security room is an alternative to the second jam, not a replacement:
  both jams (J2 / J3, #101) work unchanged; a camera the console switched off is simply no longer a jam target. Called
  out in the PR for Michael's walk. Undo: remove the room's door (`S3_SEC_ROOM.door`) or the console's gate; nothing in
  the jam flow changes either way.

## 8. Risks
- `ctDevices.ts` and `e2e-ctcourse.mjs` are also edited by slice C (Menu Notes: laser and cue). S touches camera
  hunks and one new e2e function only; the second to merge resolves small conflicts.
- `hooks.has` -> `CourseState.hasFlag` builds two template strings per call, now per camera per step (the laser does
  the same today). Fine for one camera; cache the result per step if a perf check flags it.
- The passive guard off the nav grid (a sealed-void room) could fail to spawn (`spawn` returns null, the loop breaks):
  A adds a nav seed in the room if the unit or e2e check shows it.
- The room lamp and an open door may move a far-lobby tuned level: the light test holds them within 0.08.
- The body lands at the desk and may hide the console prompt: the console is offset to z 11.6 (1.4 m reach from z 10.2).
- Course rating counts kills / knockouts (`onEnemyKilled`): a lethal takedown here lowers the rating, as at S1. Accepted.
