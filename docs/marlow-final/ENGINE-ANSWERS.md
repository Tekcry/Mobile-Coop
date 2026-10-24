# marlow-final - Engine answers (Phase 0, SPEC section 19)

Engine researcher, 2026-10-23. Read-only on code. Answers SPEC.md section 19 (questions 1-13) and re-checks the
section 14 anchors (N1-N8).

**Baselines.** Line numbers are from commit 52632ed6 (master merged, before slice 0) unless marked. Slice 0 is being
built while this was written:
- committed 34cb5b52 (N6 several scanner pairs, `PROTOCOL_VERSION` 30, `PassZone.any`): lines marked "HEAD" are from
  69736ea4;
- uncommitted WIP in `courseDef.ts`, `courseState.ts`, `securityRoom.ts`, `courseMode.ts`, `stealthSystems.ts` (N1-N4):
  lines marked "WT" are the working tree at writing time and will move again.

Probe: `C:/NightShift/scratch/mf-probe/q3-zone.ts` (outside the repo, bundled with esbuild, run with node) for the
ambient zone snapping and the lights-out lure numbers. No repo tests run.

## Summary

| Q | Answer | Spec change |
| --- | --- | --- |
| 1 | Every value confirmed. Some lines moved; 6 claims are wrong or incomplete in substance (below). | Yes: CONSTRAINTS section 2 corrections |
| 2 | Patrol, perception, the lights-out lure and fighting all work. But with `em.stealth` false a spotted guard radios everyone within 22 m at once, chases the players' real positions, never searches or cools down, and detections are never counted. | Yes: flip P7 (set `em.stealth = true` in Course mode, 1 line) |
| 3 | Yes. Zones override the theme level, gameplay and shader read the same 1 m grid. Edges snap to whole metres. | Small: zone edges on whole metres; minY -1, maxY ceiling - 0.1 |
| 4 | Yes, the old squad goes before the new one spawns. But the course removes guards without `em.despawn`, so knocked-out bodies stay (a restarted bay keeps the old bodies, which the new squad can find). | Yes: slice 0 uses `em.despawn` (1 line) |
| 5 | Confirmed. The relay serves hangs up to 4.6 m; the leg-up reaches 4.5 m. `TEAM.ladderGrab` 4.1 has no reader (dead). | Small: drop the 4.1 caveat |
| 6 | Real rule: the revive is an interactable on the downed body, 1.6 m horizontal (the item's reach) and under 1.5 m of height, following the body. | Small: CONSTRAINTS wording |
| 7 | The kit glass stops sight (and jam lines, bullets) but passes baked lamp light. A light-blocking see-through pane does not exist. Torch light is blocked for the meter, not the picture. | Yes: question 7 and register rows F2 / A3-5 are stale |
| 8 | Fence mesh (`b.fence`): the jam line passes. Collide boxes, kit glass and closed doors: it does not. A grille built as a door is opaque to jam, sight and light while closed. | Yes: plan the A7 cage and the A8 grille by build type |
| 9 | The `mains` relock never shuts a door, so it cannot close on a player. But an opened grille stays open after relock, and a calm guard who opened a door shuts it 1.5 s after he is clear, checking only the host player. | Yes: say how the grille gets closed; slice 0 adds remote players to the door-close check |
| 10 | Old rule was absolute `|feet.y| < 1.5`. N6 (34cb5b52) made it per panel floor. Holds for A7 and A8 either way if their floors sit at y 0. | No |
| 11 | Any two takedowns finished by different players within 1.5 s. No squad link, no distance. Banner only, no course hook. | No (an objective on it needs a flag hook) |
| 12 | Only when the host's player holds. A client's hold makes no guard noise. | Yes: N4 needs a client pulse (rides the v30 bump) or drop the noise |
| 13 | By the numbers: the camera now needs 0.31 m beside the spine (scale sheet says 0.78). 3.0 m aisles and the 3.5 m corridor fit along the axis; looking across, the boom pulls in to about 1.3 / 1.6 m. A shot is still owed. | Small: mark camera spaces per set; GPU shot pending |

## 1. CONSTRAINTS section 2 constants

All values confirmed (a full table was checked item by item). Line moves:
- `TEAM.boostMax` 4.5 is `src/config/movement.ts:459` (not :447); `TEAM.ladderGrab` 4.1 is :464 (not :452).
- Nav agent radius 0.32 is `src/ai/navBuild.ts:79`; cell 0.5 :78; headroom :9; step 0.45 :80; normal.y > 0.65 :98.
- `AIRLOCK_SIZE` 6 / tolerance 0.5 are `src/config/course.ts:18`, :20. `validateCourse` starts at
  `src/game/course/courseDef.ts:213` (airlock check :229-233); the bay chain is :247-256 (not :232, :249-256).
- `SECURITY_LIMITS.cameras` 12 is `src/config/security.ts:50`; `validateSecurity` starts at `src/security/data.ts:39`,
  the count check is :61.
- Physics `BUDGET` is `src/physics/groups.ts:35-39`. Laser alarm `ALARM_MAX` 3 / `ALARM_GAP` 5 s are
  `src/game/jammer.ts:343`, :345. Jammed lamp timings are the `JAM_LIGHT` block, `jammer.ts:43-48`.
- Door crack 0.12 is `src/world/doorPeek.ts:13`; `DOOR_SHUT` 0.05 `src/world/lightField.ts:27`. Door noise 2 m / 10 m is
  `src/game/stealthSystems.ts:24`, :30.
- Course squad spawn is `courseMode.ts:634-670` (WT :677-713).

Wrong or incomplete in substance:
- **Guards close doors.** CONSTRAINTS says "guards push doors open and never close them (G41 not built)". Stale: a calm
  guard shuts a door he opened 1.5 s after he is 2.2 m clear (`stealthSystems.ts:22`, :556-571). See question 9.
- **`MAX_ALIVE`.** The cap at `enemyManager.ts:458` is the instance's `maxAlive` (default `MAX_ALIVE` 12, :32). Course
  mode keeps 12; `SQUAD_CAP` does not apply to Course mode.
- **Camera IR.** `irLight` 1 applies only to living players, one ray lens to head (`config/security.ts:45`,
  `security/camera.ts:84`, `securitySystem.ts:51-57`). Guards and the light meter still read the lamps.
- **Nav layers.** No clamp at 8. `NavGrid` takes any count (`navGrid.ts:187`); the sampler casts at most 8 rays per
  column (`navBuild.ts:91`), so more than 8 surfaces are never found. The sampler stops at y -1.5 / casts to -2.
- **Auto lips.** The 1.9 m filter is the box top's world Y, not height over the local floor (`anchors.ts:319-325`). On
  an upper storey every solid visible box passes that first filter: `noLedge` upper-floor furniture and rails.
- **Revive.** The 2.5 s hold is divided by the HQ revive speed (`coopHost.ts:148`); 2 revives is a team total per
  mission (`reviveClock.ts:8-10`). See question 6.
- **Perf doc.** `performance.md` also has a gfx=min CPU line at :18 (main 3.6 ms, sim 1.1 ms) apart from the
  `perf.mjs` check (sim 2.5 ms, :32-34).

## 2. Course guard with a route, `em.stealth` false (N7)

Answer, path by path:
- **Patrol: yes.** `courseMode.ts:666` calls `setPatrol` (`enemy.ts:467`); the walker runs at `enemy.ts:1047`. Points
  are floor points: `goTo` with no height takes the storey nearest the guard (`enemy.ts:998-1000`), so a route stays on
  the storey the guard spawned on (`SquadSlot.y`, `rooms.ts:28`).
- **Perceive: yes** when `passive` is not set (`enemy.ts:538-541`, :562, :923). Nothing in perception reads
  `em.stealth`.
- **Lights-out lure: yes, from three sources only.** `EnemyManager.lightsOut` (`enemyManager.ts:268-282`) picks the
  nearest calm, non-melee guard within 25 m (no wall or storey test) and calls `hear` on him; others within 14 m turn to
  look. Callers: a wall switch turned off (`stealthSystems.ts:427`), a shot-out lamp (:442), an EMP
  (`gadgetSystem.ts:384`). WIP N2 adds `StealthSystems.isolate` (WT `stealthSystems.ts:683-688`, `courseMode.ts:739`).
  **A jammed lamp is no lure** (no call in `jammer.ts` or `ctDevices.ts`). Probe: the heard noise sets the meter to
  0.20-0.27 at any distance up to 25 m, the guard turns suspicious with a sound, and walks over after
  `ALERT.hearLook` 2.4 s (`alertState.ts:16`, :135). He looks 4 s and gives up after 20 s at most. Guards never turn a
  light back on (no code).
- **Fight: yes, but not "alone".** With `em.stealth` false:
  - a guard that goes to combat radios every calm guard within 22 m at once (`enemy.ts:666`, `enemyManager.ts:169-175`,
    `RADIO` :63);
  - he and the chase field go for the players' real positions, never a last known position (`enemy.ts:1160`,
    `enemyManager.ts:588-593`);
  - combat never ends: `seeing` stays true while alerted (`enemy.ts:972`), so `alertState.ts:155` never moves him to
    search or cooldown. In practice it ends when a player is downed and the bay restarts;
  - detections are never counted (`gameState.ts:1829`), so the course's detection stat (`courseMode.ts:475-477`) stays
    0, and the last-known-position ghost is off (`gameState.ts:2510`).

Build: N7 stays data only. **Spec change:** P7's "Course guards fight alone" is wrong; false is the harsher setting.
Recommend `em.stealth = true` in `CourseMode` (1 line, as `infiltrationMode.ts:55`): the shout to 8 m and a 2.5 s
call-in, the shared last known position, search 60 s, cooldown, the detection stat and the ghost. Radio checks need
squad rosters (Course mode calls no `joinSquad`) and the alarm runner needs alarm panels (none in the course), so
neither starts. Logged as an assumption for the job lead; the flip is P7's own fallback.

## 3. Per-set ambient zone at 0.14 under a 0.30 theme

Yes. The registry's ambient is the theme's `lightLevel` (`world.ts:177`, :241). A zone overrides it; the smallest
containing zone wins (`lights.ts:159-180`). The bake samples zones into the 1 m ambient grid (`lightBake.ts:80-81`,
`ambientGrid.ts:21-33`); the light field (`lightField.ts:183-200`) and the lamp shader read that grid, so meter,
guards and picture agree. `moonLight` is 0 for this theme (`sunIntensity` 0, `lampMath.ts:75-79`), so outside zones
the level stays 0.30.

Probe results: 0.14 stores as 0.141; a cell takes the zone when its centre (whole metre + 0.5) is inside. A zone edge
at x 70.3 starts the zone at 70.0; an edge at 80.3 ends it at 80.0.

Build:
- Put zone edges on whole metres, on the wall line between set and lounge / holding room.
- `minY` -1 (as every map does), `maxY` = the set's ceiling or roof underside - 0.1 (mansion and embassy use
  `ROOF_TOP - 0.1`).
- An upper level (gallery, A8 office floor) gets its own zone with `minY` = its floor - 0.5. The space under the
  instructor bridge (L4) must stop its zone (or the global) below the bridge floor, since the smallest box wins.

## 4. Squad despawn before spawn

Yes. `spawnSquad` (`courseMode.ts:634-670`) splices and disposes the old squad (:644-648) before the spawn loop
(:652-668). `em.alive` counts live guards in `em.enemies` only (`enemyManager.ts:386-389`), so 3 per set never stacks.
A failed spawn (the cap, or no walkable cell within 8 m at the slot's storey, `enemyManager.ts:458-460`) skips the rest
of that bay's squad (:661).

Gap: the course does not use `em.despawn` (`enemyManager.ts:398-427`). A knocked-out or dead guard's `Body` (with his
rig) stays in `em.bodies` and the scene. After a bay restart the old bodies lie beside the new squad, and a new guard
who sees one runs `bodyFound`: search, plus `searchAt` for guards within 22 m (`enemyManager.ts:237`). Harmless today
(all course guards are passive); live guards (N7) hit it. **Slice 0:** replace the splice + `dispose` with
`em.despawn(e)` (WT `courseMode.ts:686-690`).

## 5. Ledge relay at 4.4 m

Confirmed. The co-op "ladder" request is the relay (`teamMoves.ts:60-66`): the partner hangs on a ledge with the relay
bit, the climber stands under him, horizontal 1.6 m (`relayReach`) and the hanger's position 0.3-4.6 m above
(`relayReach` / `relayMax`, `movement.ts:475-476`; `teamController.ts:618`). The first player reaches a 4.4 m lip by leg-up (band 2.4-4.5,
`teamMoves.ts:101-103`, :119), as S5 today (`ctcourse.ts:551`, :570). `TEAM.ladderGrab` (`movement.ts:464`),
`ladderFeet` and `ladderPitch` have no reader anywhere in `src`: the shoulder-stand human ladder is gone. Spec: the
"4.1 vs 4.4" caveat in CONSTRAINTS is moot; 4.4 lips are fine for leg-up + relay.

## 6. Revive height rule

The 1.5 m is the generic interact rule. The revive is an interactable placed on the downed player
(`coopHost.ts:401`, :428-433), moved onto the body every step (:1125-1129). It is offered within 1.8 m horizontal and
under 1.5 m of height between the item and the reviver's feet (`interactables.ts:132-140`). The host accepts a client's
use within reach + 0.75 m (2.55 m) and 2 m of height (`coopHost.ts:575`). Spec: replace "not found" with this rule. A
player downed on a ledge or roof edge can only be revived from that level.

## 7. Glass

The spec's current body text (section 5: `kit.glass` stops sight, passes light) matches the engine; question 7's
wording and register rows F2 / A3-5 ("all glass solid, T11") are stale.

What each build does:
- **`kit.glass` / `kit.handrail`** (`facilityKit.ts:352-372`, :376-390): an invisible collide box (`collide` true,
  `visible` false) plus drawn panes. Not in the light shapes (`lightShapes.ts:23`), so baked lamp light passes. In
  the static physics body (`levelBuilder.ts:520-523`), so it stops guard sight (`perception.ts:71`), camera sight,
  jam lines (HEAD `ctDevices.ts:244`, :699), bullets and bodies. Never a lip (`anchors.ts:319`).
- **Torch light through kit glass.** Dynamic lights (guard flashlights) use a physics ray for the meter
  (`gameState.ts:1580-1589`), so the glass blocks them for gameplay while the picture shows the beam (the invisible box
  casts no shadow). A small parity gap; it matters only where a guard's torch shines through a partition (A3).
- **A light-blocking, see-through pane is not possible today.** A visible solid box blocks light and sight but draws
  opaque over the glass mesh. If a pane must block light, it needs a builder flag (an invisible box kept in the light
  shapes: `lightShapes.ts:23`, bump `CANON_VERSION`), about 5 lines. Not needed by the current spec.

## 8. Jammer line through a cage or grille

The jam line is one ray against `G.STATIC` with 0.4 m slack at the target (HEAD `ctDevices.ts:692-700`, `JAMMER.losSlack`
`jammer.ts:29`); the client's eye check uses 0.1 m (HEAD `ctDevices.ts:244`, `eyeSlack` `jammer.ts:38`).
- **`b.fence` mesh** (`levelBuilder.ts:303-318`): its body is `G.FENCE`, stops movement and guards on foot
  (`navBuild.ts:38-39`), but never sight, bullets or the jam line. Its 7 cm posts are in the light shapes; the mesh is
  not. **A fence is climbable** (`attachController.ts:55`, :139): lock it with a course anchor lock or give the cage a
  lid.
- **Collide boxes** (greybox mesh panels, kit glass, kick panels) block the line where the ray hits them.
- **A door** (the A8 grille as a maglocked `mains` door) is a `G.STATIC` body while closed (`doors.ts:183-184`):
  opaque to jam, sight and lamp light (`DOOR_SHUT`). There is no see-through door leaf (`anchors.ts:123`: swing /
  slide only). N2 "looking through the bars" sees nothing while it is shut.

Build: A7's cage as `b.fence` on the mesh runs (jam, sight and the ready lamps pass), solid kick panels as low boxes,
the fence anchors locked; no planned jam through the kick-panel band. A8: no planned jam or sight through the closed
grille; plan them after it opens or along another line.

## 9. `mains` relock and a player in the doorway

The relock never shuts a door. When the circuit comes back on, the `mains` gate closes unless both players are in the
exit airlock (`courseState.ts:194-205`), and `applyLocks` only sets the lock; only an airlock's rear door is forced
shut (`courseMode.ts:700-704`). `Doors.setLocked` only flags the anchor (`doors.ts:200-202`). So the grille cannot
close on a player.

Two consequences for A8:
- **An opened grille stays open after the relock.** The lock stops it being opened, not closed. Spec: say who closes
  it (the players, or the design accepts it stays open once a player opened it).
- **Guard auto-close ignores the remote player.** A calm guard shuts a door he opened 1.5 s after it is clear
  (`stealthSystems.ts:556-571`), but `occupied` checks only the host's own player and guards (:539-544). It can shut a
  door onto the client. Same check for the door menu's close (:105). **Slice 0:** add the remote players to
  `occupied` (about 5 lines), or keep guard routes off the grille.

## 10. Scanner panel height rule

At 52632ed6 the rule was `Math.abs(r.feet.y) < 1.5` on world Y (`ctDevices.ts:439`). N6 (34cb5b52) changed it to the
panel's own floor: `Math.abs(r.feet.y - sc.fy[k]) < 1.5` (HEAD `ctDevices.ts:444`). Either way A7 and A8 panels at
ground level (y 0) pass. Reach is 2.0 m horizontal (`scanners.ts`, `SCANNER.reach`). No spec change.

## 11. Dual takedown

Any two takedowns finished (phase `done`) by different players within 1.5 s (`coopHost.ts:57-58`, :255-271; host's
own :250, client's :657). No squad, no distance test. It shows a banner and counts `duals`; nothing reaches the course
state. The A4 / A8 pairs need nothing new while the dual takedown stays optional (P10). To gate an objective on it,
add a course flag set from `takedownDone` (about 5 lines). Note the window is on finish times, so a slower takedown
(front, lethal vs knockout) must start earlier.

## 12. `holdNoise` on a course hold device (N4)

Only the host's player is heard. The hold pulses (start, then every 0.5 s, `config/noise.ts:15-30`) call
`enemyMgr.hear` (`gameState.ts:1231-1233` direct use, :1324-1326 context menu). `hear` is muffled to 0.45 through
walls (`enemyManager.ts:536-551`) and has no Course-mode or stealth gate; calm, non-passive guards react. A client has
no `EnemyManager` (`gameState.ts:624-628`), and the host's `remoteNoise` covers client footsteps and shots only
(`coopHost.ts:1096-1117`). So a client's hold is silent to guards.

Build: N4 either adds a client pulse message (host checks reach, then `em.hear(it.pos, it.holdNoise)`; about 15
lines and a net test, inside this job's single `PROTOCOL_VERSION` 30 bump), or ships without `holdNoise` and logs it.
A6's hanging hacker can be either player, so a host-only noise would be unfair.

## 13. Corridor and aisle widths under the shoulder camera

The scale sheet's camera row is stale (boom 2.2, shoulder 0.62, padding 0.16; `scale-sheet.md:11`, :24). Today
(`config/camera.ts`):
- tight-space boom 1.8 m (`boomHip`), open-space boom 2.8 m, crouched 2.2 m;
- shoulder offset 0.15 m hip, 0.30 m aiming; sphere cast 0.12 m + 0.04 m pad.

So the camera needs 0.15 + 0.16 = 0.31 m beside the spine (the sheet says 0.78). Looking along a 3.0 m aisle or the
3.5 m corridor, the camera stays out. Looking across from the middle, the boom pulls in to about 1.34 m (3.0 m) and
1.59 m (3.5 m), a short pull from 1.8 m. With no camera spaces, the probe (`openSide` 2.0 m each side) calls both
spaces tight. Build: mark `camSpaces` per set (halls open, corridor, aisles and offices tight), as `ctcourse.ts:635`
does. The visual re-measure is a GPU shot on Character Build (port 4189): pending.

## N1-N8 anchor check (SPEC section 14)

| Id | Anchor in the spec | Current state | Correction |
| --- | --- | --- | --- |
| N1 | `CourseObjective`, `PassZone`, `PackedCourse.gates[].t`, `validateCourse`, `courseHud.ts` | `CourseObjective` `courseDef.ts:122` (`{ id, bay, text }`), `objectives` :128, `validateCourse` :213 (objective check :305-310); `PackedCourse.gates[].t` `courseState.ts:60`; `src/ui/hud/courseHud.ts` exists; text limit `config/course.ts:30` | `PassZone` moved to `src/game/passZones.ts` and `PassZone.any` is built (34cb5b52, test `tests/marlowPassAny.test.ts`); the step list is WIP |
| N2 | `resetLights` early return; lure via `stealthSystems.ts` | `resetLights` `courseMode.ts:679-689`, early return :682 (WT :748); it also restores only lamps in course groups (:684), so a shot lamp outside a group stays dead | WIP adds `StealthSystems.isolate` (WT :683-688) and the call (WT `courseMode.ts:739`) |
| N3 | `SecurityConsole.seconds?`, flags set-only | `SecurityConsole` `securityRoom.ts:12` (id, guard, flag); `setFlag` `courseState.ts:207`; flags only deleted on restart (:381) | WIP adds `seconds` / `rearm` (WT `securityRoom.ts:19-24`) and a flag clear |
| N4 | `ints.add(..., holdTime)` at `courseMode.ts:251` | Correct at 52632ed6 (hold time 0 there); `NetItem.hold` HEAD `protocol.ts:115` | WIP passes `holdT` (WT :275). Add question 12's client pulse or drop `holdNoise` |
| N5 | none | not built | none |
| N6 | `lay.scanners[0]` only, glow at z 0.3 / 13.7, `SecWire.sc`, `PROTOCOL_VERSION` 29 | Were `ctDevices.ts:358`, :426, `protocol.ts:443-466`, :18 | **Built** in 34cb5b52: loop HEAD `ctDevices.ts:363`, panel rule :444, `PROTOCOL_VERSION` 30 (HEAD `protocol.ts:18`), test `tests/marlowN6Scanners.test.ts`. Mark N6 done |
| N7 | `SquadSlot.route` in `rooms.ts`, `courseMode.ts:666` | `SquadSlot` `rooms.ts:21-44`, `route` :30; `setPatrol` at :666 correct (WT :709) | Add the `em.despawn` fix (question 4) and the P7 flip (question 2) |
| N8 | `bayX(i) = 22 i`, `coopUi.ts:595` | `bayX` `ctcourse.ts:43` (`CT_PITCH` :26); `coopUi.ts:595` correct (`map ? 9 : 0`) | Importers to rewrite: `tests/camSpaces.test.ts`, `tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`, `tests/jammer.test.ts`, `tests/smoothWorldLight.test.ts`, and `src/world/maps/ctcourseVariety.ts` |

Section 14's closing note ("the one wire change is N6 ... bump once to 30") still holds; if question 12's client pulse
is added, it rides the same unmerged 30.

## Assumptions logged (Michael asleep)
- E1: P7 recommendation flips to `em.stealth = true` in Course mode (question 2). The job lead decides; it is P7's own
  fallback, so no new proposal.
- E2: Slice 0 should take the two small fixes found here: `em.despawn` in `spawnSquad` (question 4) and remote players
  in `StealthSystems.occupied` (question 9).
- E3: Question 13 is answered by the numbers; the GPU shot stays pending on Character Build.
