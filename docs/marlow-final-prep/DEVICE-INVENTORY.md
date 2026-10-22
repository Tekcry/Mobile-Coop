# Marlow Yard final - co-op device and mechanic inventory

Source: detached master worktree `C:/NightShift/Mobile-Coop-mf-read` (af56ab43), PROTOCOL_VERSION 29. Read-only research
for the marlow-final redesign. Line numbers are at that commit. "Host-auth" = the host decides and the client mirrors.

Michael's ask: "timed isolation of lights, cameras, locks, accessing security room to disable cameras, timed jammer
exercises, hacking devices in sync, and any other coop 'wow thats cool' experience".

Quick verdict: cameras, security room, timed jammer, sync hack (paired scanners), lasers + power panels, pair plates,
timed holds, bolted doors, mains-gated doors and six team moves all exist and are wired for co-op. Missing: a timed
light breaker (switches are plain toggles), any keypad / lock minigame, the optic cable, and most devices are
one-per-map or Marlow-hardcoded in places (see Gaps).

---

## 1. Map placement - the two data paths

Everything a map places comes back from `MapDef.build(b, seed): MapLayout` (`src/world/mapDef.ts:51-96`).

- **World devices** (`MapLayout` fields): `security` (cameras), `lasers`, `laserPanels`, `passZones`, `scanners`,
  `switches` (light switches), `alarms`, `hideSpots`, `medkitWalls`, `course`.
- **Course devices and gates** (`MapLayout.course: CourseLayout`, `src/game/course/courseDef.ts:332-341`):
  `def` (bays, airlocks, gates, radio, objectives), `doors` (gate door id -> `b.door(...).id`), `anchors`, `groups`
  (course light-group name -> `LightDef.group` number), `devices` (switch / hold / pickup positions by id), `squads`,
  `consoles`. `validateCourse` (`courseDef.ts:213`) throws on any unknown id, and every flag read must be set by a
  pickup, a pair gate or `def.externalFlags`.
- Builder calls used: `b.door(x, y, z0, width, yaw)` -> anchor (id), `b.light({x,y,z,radius,intensity,group?,fixture?})`,
  `b.ladder`, `b.duct(path, entryGrate, exitGrate, grates?)` (`src/world/levelBuilder.ts:276`), `b.windowAt(...)`.
- Reference maps: `src/world/maps/ctcourse.ts` (Marlow Yard, every CT device), `src/world/maps/courselab.ts`
  (one door per gate kind, incl. mains + light switch; `?autostart=courselab&mode=course`),
  `src/world/maps/warehouseSectors.ts` (Sector Ops cameras, 5 lasers, 4 panels, alarms).

---

## 2. Devices

### 2.1 Held pistol jammer
- **Play:** pistol drawn, aim (LT / RMB), hold Co-op (RB / F) on a camera, laser power panel or electric lamp with a
  clear static line, standing still (< 0.45 m/s). Gun light: cyan pulse jamming, red cooling, amber target rebooting,
  green aimed. HUD line under the reticle shows seconds left / cooldown. Quiet positional buzz at the jammed device.
- **Code:** rules `src/game/jammer.ts:14` (`JAMMER`), `:43` (`JAM_LIGHT`), `:75` `stepJam`, `:120` `stepDevJam`,
  `:198` `jamOrigin`; runtime `src/game/ctDevices.ts:211` `CtDevices` (`localStep` ~633, host `fixedUpdate` :742,
  `onRemoteJam` :707, `applyJam` :870, `wire` :993, client `apply` :1010).
- **Placement:** nothing to place. Every camera, every laser panel and every fixed electric lamp/spot
  (`LightDef.electric`, default true; kinds `lamp` / `spot`) is a target automatically (`ctDevices.ts:350`).
  Built in course mode and Sector Ops only (`courseMode.ts:215`).
- **Co-op:** one player can do it, but the per-player cap makes long holds a two-player relay. Host-auth: client sends
  `jam {tgt, e}` (`protocol.ts:204`) on change + heartbeat 0.25 s (stale after 0.7 s); host re-checks LOS from the
  client's eye (<= 1.5 m from its head) and steps both jammers; state goes out as `sec` (`SecWire`, `ctDevices.ts:82`)
  inside `course` / `sector`. A device is jammed while EITHER player holds it, so B can take over A's target before A's
  5 s run out and the device never reboots.
- **Timers:** use max 5 s; cooldown 5 s after any end (cap, release, move, retarget); camera / panel reboot 1.5 s (no
  re-jam meanwhile); lamp: 0.5 s flicker off, off while held, 4 s off after release, 0.5 s flicker on (so one 5 s jam
  = ~10 s dark). Range 20 m, cone 0.16 rad.
- **Tests:** `tests/jammer.test.ts`, `tests/jammerFixes.test.ts`, `tests/laserPanels.test.ts`; e2e-ctcourse station 3
  and 4, e2e-sectorops, e2e-security.
- **Limits / bugs:** jamming a lamp never counts as its group "off" (mains gates ignore jams, by design,
  `courseMode.ts:536`). A panel whose lasers are released for good stays a no-op target (p/WIP polish 1). Polish: a
  client's `setGroup(gid, true)` can relight a lamp an EMP has out (jammer-fixes STATE).

### 2.2 Security cameras
- **Play:** sweeping CCTV with a faint red scan grid (strong in electro). A per-player meter fills on sight; stage 1
  (0.3) = radio warning, stage 2 (full) = alarm stage +1 (G125, never ends the run). Cameras see in the dark by their
  own IR (G240): lamps out never hide you from a camera; only jamming it, its console, or shooting it does.
- **Code:** `src/security/camera.ts:152` `CameraUnit` (modes online / looped / off / destroyed; `frozen` while jammed),
  meter `:103`; think and shot `src/security/securitySystem.ts:65`, `shotRay` :126; numbers `src/config/security.ts`
  (`CAMERA`: hFov 70, vFov 45, range <= 18, mount 2.4-3.5 m, sweep <= 120 deg at 15 deg/s with 2 s end pauses, 4 Hz
  think); data + validation `src/security/data.ts:7-63` (max 12 per map).
- **Placement:** `security: { devices: [{ id, kind: 'camera', level, at: [x, z], y, facing, sweep?: [a, b], aim?,
  range?, reason, offFlag?, section? }] }`. Example `ctcourse.ts:191`:
  `{ id: 'cam-s3', kind: 'camera', level: 'ground', at: [S3_CAMERA.x, S3_CAMERA.z], y: 2.4, aim: 6.5, facing: 270,
  sweep: [262, 278], reason: '...', offFlag: 'cams-off-s3' }`.
- **Co-op:** host-auth. Clocks (`ck`), jams and alarm stage ride `sec`; console-off rides the course flags (client reads
  `hasShared`). Shot-out cameras are on the wire in Sector Ops only (`sector.dn`).
- **Tests:** `tests/securityCamera.test.ts`, `tests/cameraCue.test.ts`; e2e-security, e2e-ctcourse station 3.
- **Limits / bugs:** in course mode the alarm is only a stat + banner + radio (no guard response); Sector Ops sends
  reinforcements (`sectorMode.ts:329`). Shooting a camera is host-only: the host's `onShot` handles enemies and players
  only (`coopHost.ts:914`), so a client cannot shoot out a camera (unverified in play, read from code). Mode `looped`
  exists in the type but nothing sets it (no "loop the feed" yet).

### 2.3 Camera hallway hard rule (send-back)
- **Play:** a player a camera fully spots inside its hallway (or still "running" in the far lobby) is teleported back to
  the entry lobby with a radio line. Forces the jam handoff: one jams, one runs, then the runner jams from the far end.
- **Code:** `jammer.ts:389` `HallRule`, `:424` `hallStep`; `ctDevices.ts:811` `stepHall`.
- **Placement:** a `PassZone` with `hall` (`ctDevices.ts:118`); example `S3_PASS` `ctcourse.ts:129-135`:
  `{ id: 'p-s3', box, flag: 's3-clear', hall: { camera: 'cam-s3', box, lobby, back: [x, z, yaw], say } }`, flag read by a
  `flag` gate and listed in `externalFlags`.
- **Co-op:** host-auth; client is moved with the `back` event (`protocol.ts:135`, `coopHost.ts:1268`), positions held
  3 s (`HALL_BACK_HOLD`).
- **Tests:** `tests/jammer.test.ts` (hallStep), e2e-ctcourse station 3 (flaky under load: stale-position assert, fixed
  in the test per p/WIP.md).

### 2.4 Pass zone (both players in a box)
- **Play:** both alive players standing in a plan box set a course flag (solo flag: one). Re-arms on bay restart.
- **Code:** `ctDevices.ts:780-806` (in `fixedUpdate`). **Placement:** `passZones: [{ id, box, flag, floorY? }]`.
- **Co-op:** needs two; host-auth. Generic "rendezvous" trigger, usable for any "both here" beat.

### 2.5 Security room console
- **Play:** a guard watches the monitors; once he is down (KO or kill, any takedown) a player presses the console and
  every camera with that `offFlag` goes off until the bay restarts. Refused while the guard is up. The guard can be
  interrogated first ("The desk console switches the hallway camera off").
- **Code:** `src/game/course/securityRoom.ts` (`SecurityConsole`, `consoleRefusal`, `cameraOff`, `consoleErrors`);
  refusal in `courseMode.ts:328-336`; camera off in `ctDevices.ts` `applyJam`.
- **Placement:** three pieces must agree (checked by `consoleErrors`): camera `offFlag: F`; a shared pickup gate
  `{ kind: 'pickup', id, switchId: CONSOLE, flag: F, perPlayer: false }` in a bay whose `squad` includes the guard;
  `course.consoles: [{ id: CONSOLE, guard: 'slot-id', flag: F }]`; device position in `devices`; guard in `squads`
  (`{ kind: 'grunt', x, z, yaw, passive: true, info }`). Example `ctcourse.ts:167-212, 297-301, 541, 631`.
- **Co-op:** host decides; no wire change (flag rides the course state).
- **Tests:** `tests/securityRoom.test.ts`; e2e-ctcourse `securityRoom`.
- **Limits:** course mode only (not Sector Ops, Michael). Permanent until bay restart: no timed "cameras off for N s".
  Guard is passive in Marlow (A3).

### 2.6 Lasers
- **Play:** IR beam bands (visible only in night vision). Touching one raises the alarm stage (no damage), cooldown 2 s
  per player. Off for good by a far-side release (`offFlag`), or for the duration of a panel jam.
- **Code:** `jammer.ts:277` `LaserDef`, `:300` `LASER`, `:324` `laserTouch`; `ctDevices.ts:943` `touch`.
- **Placement:** `lasers: [{ id, x1, z1, x2, z2, ys: [heights], floorY?, label?, offFlag?, section? }]`. Example
  `ctcourse.ts:149`: three beams 0.35 / 0.9 / 1.45 m across a 6 m gap; standing body 1.75 m, crouched 1.1 m (crouch
  clears a 1.45 top beam? no: 1.1 > 0.9 - choose heights to make crouch / jump matter).
- **Co-op:** host-auth; panel phases in `sec.dv`; `offFlag` via course flags.
- **Tests:** `tests/laserAlarm.test.ts`, `tests/laserPanels.test.ts`; e2e-ctcourse station 4, e2e-sectorops.

### 2.7 Laser power panels
- **Play:** each laser has exactly one panel, hidden and high; jamming it cuts every band it powers for the jam + 1.5 s.
  LED: green / cyan blink / amber / dark. Electro paints it.
- **Code:** `src/game/laserPanels.ts` (`PANEL` :31, `laserLive` :55, `checkPanels` :84).
- **Placement:** `laserPanels: [{ id, lasers: ['laser-id', ...], x, y, z, yaw, section?, label? }]`. Example
  `ctcourse.ts:157` (`panel-s4`, 4 m up, jammed from `S4_PANEL_JAM`); `warehouseSectors.ts:239` `panel-mezz` powers two
  bands. `tests/laserPanels.test.ts` traces visibility and a vantage line per map.
- **Co-op:** jam via `jam` claim naming the panel id (protocol 29).

### 2.8 Paired scanners (the sync hack) - EXISTS
- **Play:** two panels; each player presses A / E at one and stays within 2 m; each hack runs 2.0 s; both must finish
  within 1.5 s of each other. Leaving early or finishing late resets both and costs the failing player 10 HP (never
  below 1); a partner who never started resets both at no cost (G193). Ready lights show both players in place.
- **Code:** `src/game/scanners.ts` (`SCANNER` :12, `scanStep` :99, `ScannerDef` :157); `ctDevices.ts:446` `scanPress`,
  `:465` `stepScan`.
- **Placement:** `scanners: [{ id, a: 'dev-a', b: 'dev-b', flag }]` + both ids in `course.devices` + a `flag` gate on
  the flag + flag in `externalFlags`. Example `ctcourse.ts:140, 307-308, 580-585`.
- **Co-op:** needs two (solo flag aside); host-auth; state rides `sec.sc` ([phA, phB, occupancy bits, progress]).
  Sync window never scales with difficulty (G131).
- **Tests:** `tests/scanners.test.ts`; e2e-ctcourse station 6.
- **Limits / bugs:** only ONE pair per map (`lay.scanners?.[0]`, `ctDevices.ts` constructor). The glow placement is
  Marlow-hardcoded: panel face z is `z < 7 ? 0.3 : 13.7` (`buildScan`, ~ctDevices.ts:425), so scanners elsewhere draw
  their lights in the wrong place. Hack time is fixed (2.0 s) per pair, not per map.

### 2.9 Course gates (locks, team doors, timed doors) - `courseDef.ts:47-77`, logic `courseState.ts`
| Gate | Data | Behaviour | Timer |
| --- | --- | --- | --- |
| lever | `{kind:'lever', id, switchId, doorId}` | press unlocks for good | - |
| bolt | `{kind:'bolt', id, doorId, side:[nx,nz], at:[x,z]}` | "Unbolt" works only with feet on the `side` of the plane through `at` (course-ready F7: `at` = door plane); else "Bolted from the other side". Item turns off once unbolted (F8), back on restart | - |
| hold | `{kind:'hold', id, holdId, doorId}` | open while anyone holds (stands within reach 1.4 m + slack) | - |
| timedHold | `{..., after?}` | open while held + `after` s (default 6) | `TIMED_HOLD_AFTER` 6 s |
| pair | `{kind:'pair', id, a, b, doorId? or flag?, window?}` | two DIFFERENT players press a and b within window, either order | `PAIR_WINDOW` 1.0 s (per gate `window`) |
| egress | `{kind:'egress', id, switchId, doorIds}` | request-to-exit, unlocks all for good | - |
| mains | `{kind:'mains', id, group, doorId}` | unlocked while light group `group` is off; relocks when it comes back unless both players are in the bay's exit airlock | follows the switch |
| flag | `{kind:'flag', id, flag, doorId}` | unlocked once flag set | - |
| anchorLock | `{kind:'anchorLock', id, anchorId, flag}` | a ladder / ledge is unusable until flag | - |
| pickup | `{kind:'pickup', id, switchId, flag, perPlayer}` | press sets flag (per player when `perPlayer`) | - |

- Code: `press` `courseState.ts:234`, `hold` :281, `setGroup` :194, `update` (timedHold countdown) ~395, `pressPair`
  :687, `boltUsable` :477; devices made in `courseMode.ts:247` / `addGate` :265; hold release on walk-off / down
  `courseMode.ts:480-492`; door locks `applyLocks` :696.
- Co-op: host-auth. Client presses through `use {id}` (`protocol.ts:164`); host replies via `course` (locks, anchors,
  light groups, refusal `ref` / `rn`, radio `rl`), at once on change, else every 2 s (`COURSE_SEND`). Course items
  are sent first in the item list so the cap never drops them (`coopHost.ts:1001`).
- Airlocks: both players on the 6x6 pad, 4 s cycle, rear door locks behind (`AIRLOCK_CYCLE`). Bay restart after both
  down 2 s.
- Tests: `tests/course.test.ts` (each gate kind incl. "timedHold closes 6 s after release", "pair refuses at 1.1 s",
  "mains ... relocks"), `tests/courselab.test.ts`, `tests/ctcourse.test.ts`; e2e-course (every gate on courselab, both
  pages), e2e-ctcourse.
- Limits: a hold / timedHold door is never forced shut on a player in the doorway (only locks). No keypad, code, card
  reader or lockpick: "locks" are these gates only. Sector Ops locks are connector doors only (no team doors yet;
  sector-fixes R, "co-op routes", not built).

### 2.10 Light switches and light groups
- **Play:** a wall switch toggles a lamp circuit (`group`); all switches on that circuit follow; a guard comes to look
  (`lightsOut`). Darkness hides from guards and the meter (light parity), NOT from cameras.
- **Code:** `src/game/stealthSystems.ts:68-75` (setup), `toggle` ~412; `LightRegistry` `src/world/lights.ts`
  (`setGroup`, `groupBaseOn` :334, `disrupt` = timed EMP outage ~289).
- **Placement:** lamps `b.light({..., group: N})`; `switches: [{ pos: Vector3, yaw, group: N }]`; for a course gate or
  co-op sync also `course.groups: { name: N }`. Example `courselab.ts:13, 46, 122, 131` (mains gate on group 7).
- **Co-op:** client uses through `use`; host toggles. Sync to the client ONLY in course mode and only for groups listed
  in `course.groups` (`courseMode.ts:726-734`, mirror ~912). Marlow Yard lists no groups and has no switches today.
- **Timers:** none - a toggle. (The registry's EMP `disrupt(radius, seconds)` is a ready timed-outage primitive; the EMP
  gadget itself is removed, G152.)
- **Tests:** `tests/lights.test.ts`, `tests/course.test.ts` (mains); e2e-course "mains" (client sees the group off).
- **Bugs:** Sector Ops / other modes: switched lamps are not mirrored to the client at all (no light field in the
  `sector` message or snapshots), so the client's lights, meter and picture disagree with the host's. A client
  shooting a lamp: the host never hears it (`onShot` is enemies / players only) and the course mirror restores lamps
  the host lists as alive (`courseMode.ts:910`), so it relights within <= 2 s (read from code).

### 2.11 Alarm panels (guard-raised)
- **Play:** an alerted guard runs to the nearest working panel (<= 30 m), holds it 1.6 s x difficulty tolerance ->
  reinforcements (3). A player can disable a panel with a 1.2 s hold.
- **Code:** `src/ai/alarm.ts:8` (`ALARM`), panels in `stealthSystems.ts:76-89`.
- **Placement:** `alarms: [{ pos: Vector3, yaw, section? }]`, `reinforce: Vector3[]`. Example
  `warehouseSectors.ts:248-251`.
- **Co-op:** items mirror; client hold via `use`. Course: none placed in Marlow; course mode guards are passive.

### 2.12 Device alarm stage (cameras, lasers)
- `deviceAlarm` `jammer.ts:356`: +1 stage per trip, at most one per 5 s (`ALARM_GAP`), max 3 (`ALARM_MAX`). Course: a
  stat, banner, radio. Sector Ops: `cameraAlarm` sends `perStage` guards (2) per stage. Rides `sec.al`.

### 2.13 Doors and the door menu
- Hold-A menu: Open, Open stealth (crack peek), Bash (loud; KOs a guard right behind the door), Optic cable (STUB:
  "Optic cable: not built yet", `gameState.ts:1422`). Locked doors list nothing. `src/game/doorMenu.ts:11`,
  `src/world/doors.ts:195` `setLocked`.
- Co-op: open state in snapshots (`doors`), crack `dcr`. Bash KO runs where `enemyMgr` exists, i.e. the host
  (`gameState.ts:623-631`: clients have none), and has no wire message, so a client's bash likely KOs nobody (read
  from code, not tested).

### 2.14 Vents / ducts
- Crawl ducts with grates (wall / ceiling / floor); tap Y kicks a grate (noise 10 m), hold A unscrews (silent); peek
  grates along the path. `src/world/anchors.ts:89` `Duct`; `player/ventOpen.ts`; `tests/ventOpen.test.ts`.
- Placement: `b.duct([{x,y,z},...], {pos, nx, ny, nz, where}, {pos, ...}, grates?)`; example `warehouse.ts:336`.
- Co-op: movement only (positions / MoveState). Grate and glass states (`world/breakables.ts`) are not on the wire:
  each page keeps its own. Marlow Yard has no ducts.

### 2.15 Hidden-from-play stubs
- Grab menu "Force to device (not yet)" (`src/game/grabMenu.ts:25`). Optic cable (above). Camera mode `looped`.

---

## 3. Team moves (`src/game/teamMoves.ts`, `src/game/teamController.ts:79`, numbers `src/config/movement.ts:438` `TEAM`)

All start with Co-op (RB / F), anywhere with room (G151), host-checked by `checkTeamRequest` (`teamMoves.ts:55`).
Wire: client `tmove {kind, partner, target, s, gy, lx?, lz?}` (`protocol.ts:171`) -> host `onTeamMove`
(`coopHost.ts:715`) -> `tstart` / `tdeny` / `tend`; MoveState modes `brace` / `boost` + sub bits. Rate 1 request / s.
Offers time out after 20 s; B cancels. Tests: `tests/teamMoves.test.ts`; e2e-netmove (leg-up, relay, throw, rope,
denials), e2e-ctcourse stations 2, 4, 5, 7.

| Move | Offer | Reach / limits | Timing | Co-op beat |
| --- | --- | --- | --- | --- |
| Leg-up (`boost`) | crouch + Co-op | partner within 1.2 m; ledge 2.4-4.5 m; 2.6 m air over the booster, 1 m run-in side | 0.9 s | one gets over a wall; the bolt rule makes them open the door |
| Ledge relay (`ladder`) | hanging + Co-op | climber under hanger within 1.6 m, hang <= 4.6 m | climb 1.4 s | second player up after a leg-up |
| Partner throw (`throw`) | stand + Co-op | runner within 1.6 m; lands 3.2 m past the thrower, apex 1.7 m, +-1 m floor | 1.0 s flight | over a laser band / gap; the thrown one hits the far release |
| Hang-down (`hang`) | crouch at edge (>= 2.2 m drop) + Co-op | holder's stick lowers 1.0-2.5 m at 0.8 m/s | lower 0.8 s, pull 0.9 s, let go if holder lost 1.5 s | hanger presses a device through a hatch (interact stays free) |
| Two-person rope (`rope`) | on top, face down + Co-op | 2.2-6.0 m drop, climber within 2 m | up 1.0 m/s, top-out 0.9 s, slide 3 m/s | last player up a wall with nobody below |
| Dual takedown | none (implicit) | two takedown finishes by different players within 1.5 s | `DUAL_WINDOW` 1.5 s (`coopHost.ts:58`) | banner + non-lethal style credit only |

Old human ladder / brace / stack: gone (G52's brace removed; `ladder` is now the relay). Known flake: e2e-ctcourse
"station 4: the client is thrown" (backlog.md ~104, suspected press swallowed by gates).

## 4. Takedowns, grab, carry, revive

- Takedowns `src/game/takedown.ts:15` / `pickTakedown` :146 (behind / front / side / corner / overCover / above /
  below / window / drop / inverted); client takedowns host-approved (`td`), committed strike via `cmove`.
- Grab `GRAB` `takedown.ts:53`: hold, human shield (pistol over the shoulder), interrogate (guard with `info`; 1.5 s;
  lines as subtitles), KO, kill. Info placement: squad slot `info: { lines: [...] }` (`ctcourse.ts:203-212`).
- Carry: 2.0 s lift, 0.8 m/s (`src/ai/bodies.ts:21`), hide spots `hideSpots: [{ pos }]`. Co-op: the partner does not
  see the body on the shoulder (no MoveState); bodies listed in `snap.bodies`. Tests `tests/carry.test.ts`,
  `tests/g7CloseQuarters.test.ts`.
- Revive: 30 s window, 2 per mission (`src/game/reviveClock.ts`); Sector Ops syringes by difficulty.
- Elbow strike: `src/game/elbowStrike.ts` (0.9 s), `tests/elbowStrike.test.ts`.

## 5. Other timers worth building on
- Sector Ops: objective hack hold 3 s, download 10 s within 4 m, connector hold 1 s + 3 s cycle, extract 0.5 s
  (`src/game/sectors.ts:97`). Interactable hold times are generic (`ints.add(id, kind, pos, label, holdTime)`).
- Course: airlock 4 s, timed hold 6 s, pair 1.0 s, scanner 2.0 s + 1.5 s, restart after both down 2 s.
- Gadgets: sleeping gas 6 s cloud, flashbang 4 s, noisemaker 6 s pulses, sticky cam (remote view, lure ping, one gas
  release), prox mine arms 1.5 s (`src/game/gadgets.ts:31-38`). EMP removed (carry 0).
- Guard torches synced (`al` torch bit), so a dark room plus a searching guard reads the same on both pages.

---

## 6. Combos that work today (existing code + map data only)

1. **Jam relay down a long camera hall.** Two cameras or one long hall; A jams 5 s, B starts jamming the same camera
   before A's runs out (device stays jammed), A cools 5 s and retakes. Continuous blind for a third leg (a runner moving
   while the jammers stand still), or each covers the other in turn (station 3 pattern with `hall` send-back).
2. **Security room vs. jam race.** Hallway camera with `hall` rule + console room off the far lobby: runner 1 crosses
   under partner's jam, takes the duty guard (interrogate for the hint), kills the cameras for partner 2. Two routes,
   same outcome (station 3 today); scale up with several cameras sharing one `offFlag`.
3. **Panel-and-runner laser crossing.** Laser band + a high panel visible only from a far vantage: A jams the panel
   (5 s + 1.5 s reboot = 6.5 s window), B crosses; the band is back, B finds the far release (`offFlag`) for A, or B
   throws ... (throw over the band is the alternative). One panel can power two bands (`panel-mezz`).
4. **Thrown into the dark.** Lamp jam (one jam = ~10 s dark) on the landing zone, then the partner throw over a laser
   gap into it, then the thrown player presses the release / unbolts.
5. **Lights-out door (mains).** A pulls a switch on circuit G (lights out in B's room: guards investigate the switch);
   the mains door unlocks while G is off; B slips through; when A turns the lights back on the door relocks unless both
   are already in the exit airlock. Needs `switches` + `course.groups` (courselab pattern). Isolation is "held" by
   leaving it off, not timed.
6. **Hold-the-door / timed door.** A on a `hold` or `timedHold` plate (after N s per gate) while B goes through and
   works a lever / pickup on the far side that opens a permanent route for A (`egress` or `lever`).
7. **Leg-up then bolt.** Leg-up / relay over a wall, far side `bolt` gate: only the boosted player can unbolt.
8. **Sync plates on a roof.** Leg-up + relay both onto a roof, `pair` plates within 1.0 s (custom `window`), then
   hang-down through a hatch to a `lever` hack panel only the lowered player can reach.
9. **Scanner sync under watch.** Paired scanners placed inside a camera's sweep: one partner jams the camera (5 s) while
   both run the 2 s hacks within 1.5 s - jam budget forces the start on a count.
10. **Rope and overwatch.** Leg-up one, the top player drops the rope; while the climber climbs (1 m/s) the top player
    can't shoot, so a third timing element (guard patrol / camera sweep) makes it tense.
11. **Dual takedown.** Two passive or patrolling guards facing each other: both take one within 1.5 s (banner), else
    the second sees the first fall (guards perceive bodies).

## 7. Gaps against Michael's list (size: S < 1 day slice, M 1-2 slices, L multi-slice)

| Need | State | Gap | Size |
| --- | --- | --- | --- |
| Timed light isolation (breaker / fuse box) | switches toggle; jam = ~10 s per lamp | a `breaker` gate / device: press = group off for N s then back (timer in `CourseState` like timedHold, `setGroup` on expiry), group wired via `course.groups`; optional "hold to keep off" | S |
| Light sync outside course | not mirrored in Sector Ops / other modes | add light groups + dead lamps to `sector` / snapshot (wire bump) | S-M |
| Client shoots lamps / cameras | host-only | `shot` handling for lamps (`lightOnRay`) and cameras (`securitySystem.shotRay`) on host + mirror `dn` in course | S-M |
| Timed camera isolation (console "off for N s", camera loop) | console = off until bay restart; `looped` mode unused | `offFor` seconds on the console / a timed flag; optional loop-the-feed mode | S |
| Timed locks (time lock, door open for N s from a remote panel) | `timedHold` needs a holder present | a `timed` gate: press -> door unlocked N s, then relocks (and a visible countdown) | S |
| Sync hack: more than one pair, any map | one pair per map; glow position hardcoded for Marlow z | iterate `lay.scanners`, place glows from the device yaw; per-pair `hack` / `window` | S |
| Hacking devices in sync (3+ step / simultaneous different devices, e.g. hack + hold) | scanners = same device twice | generalise to N panels / mixed (hack + jam + plate) with one window | M |
| Keypads / codes (G143 randomised, read in the world) | none (Kestrel editor only) | keypad device + code flag; code shown on a monitor / guard info / sticky cam; per-run random | M |
| Lock picking / hacking minigame (ct-toolkit: minigames only, G142 hands-on) | none | lockpick + hack minigames | L |
| Optic cable | menu stub | remote view under the door (reuse sticky-cam remote view) | M |
| Force guard to device (retinal scanner with a held guard) | grab menu stub | grab -> walk to scanner -> scanner accepts | M |
| Timed jammer exercises as a drill (scored windows, countdown HUD on both pages) | jammer + HUD line exist | a course drill / gate reading jam phases (e.g. "keep cam X jammed 15 s") + shared countdown | S |
| Alarm consequences in the course | stat + banner only | reinforce hook like Sector Ops (`cameraAlarm`) or a radio-driven guard wake | S |
| Bash KO and grate state for the client | host-only / unsynced | wire messages | S each |
| Team doors in Sector Ops (sector-fixes R) | not built | reuse course gates in Sector Ops | M |
| Dual takedown as a real paired move | banner on two finishes within 1.5 s | committed synced dual takedown (prompt both, one start) | M |
