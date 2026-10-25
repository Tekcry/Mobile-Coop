# Code inventory for a two-player CT co-op prototype

Branch feature/ct-research, code = master 4.0.0 (6f81c83), checked 2026-10-18. Read-only inventory: what the game can do
today, so the prototype plan reuses it instead of rebuilding. Sources: docs/systems/*.md and
docs/archive/locomotion/PROTOTYPE-PLAN.md, with the key claims checked in `src/` (file paths below).

Status words:
- **Co-op**: exists and works with two players (host + client), with an e2e suite.
- **Solo**: exists, but only on one page or the host (the client cannot do it, or does not see it).
- **Partly**: exists with a known gap, or differs from the decided CT design.
- **Missing**: not in code (decided or specced only).

"Decided, not built yet" items come from docs/DECISIONS.md (G-numbers) and the locomotion decisions (M-numbers).

---

## 1. Co-op session (`src/net`)

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| Host a room / join by 5-character code or `?room=CODE` link | Co-op | `net/coopUi.ts` (`hostRoom`, `JoinScreen`, `openJoinLink`), `net/session.ts` `NetSession` | e2e-coop, e2e-park |
| Transport: two tabs on one PC | Co-op | `net/localTransport.ts` (BroadcastChannel, `?net=local`) | every two-page suite |
| Transport: online (internet) | Co-op | `net/trysteroTransport.ts`: WebRTC data channels, public Nostr relays for signalling, no game server | manual only |
| Transport: LAN | Partly | Same WebRTC path; signalling still needs the internet (Nostr). No TURN or custom ICE config in `src/net`, so strict NATs may fail. No LAN-only signalling | none |
| Network conditions simulator | Co-op | `net/netSim.ts` (`?net=local&netsim=typical`: 40 ms, +-20 ms jitter, 1% loss as retransmits) | `E2E_NETSIM=typical` report mode |
| Player cap | Partly | `net/protocol.ts`: `MAX_PLAYERS` 4, `COOP_MAX` 4, `COURSE_MAX` 2, `capacity(mode)`. Decided (G2, G50): 2 in every mode; not built (lobby still says "Co-op for 2-4") | e2e-course (cap 2) |
| Host authority | Co-op | Host runs AI, modes, doors, items, damage; client is a puppet (`GameState.puppet`, no AI, health from snapshots). Clients accept lobby / start / snap / ev / end only from the host. No host migration | e2e-coop |
| Protocol | Co-op | `PROTOCOL_VERSION` 13; every inbound message through `parseMessage` (clamps, caps) | `tests/net.test.ts` |
| Latency handling | Co-op | Client: `SnapshotBuffer` + `ClockSync` interpolation (`net/interp.ts`), teleport detection (`SNAP_MIN` 2 m). Host: 15 Hz snapshots, enemy position history for lag-compensated shot checks (`net/validate.ts`), movement speed cap check (`moveSpeedCap` x1.15). Client sends `pstate` at 20 Hz | e2e-netmove, NETSIM probe |
| Committed moves (predict, host approves) | Partly | `game/committedMoves.ts` `checkCommitted`; `cmove` / `cstart` / `cdeny`. Only kind `strike` is parsed | e2e-netmove (`strike`, `denied`) |
| Pause | n/a | Co-op never pauses the sim | - |
| Leave / offline | Co-op | Host leaving ends the client's match | e2e-coop (known flaky) |

### What the host syncs (`snap` and events, `net/protocol.ts` line 139, `net/coopHost.ts`)
- **Players**: `PlayerState` with `MoveState` (`player/moveState.ts`): mode, anchor, phase, gear, raise, aim, draw phase,
  grips, committed path. Remotes pose from it (`net/remoteAvatar.ts`). Partners collide (`net/partnerBlocker.ts`).
- **Guards**: position, pose, alert level (`al`), seized flag; client draws `EnemyPuppet`s (`net/enemyPuppet.ts`).
- **Doors**: open indices (`doors`), cracked doors (`dcr`).
- **Items** (interactables, every change or 2 s): `ITEM_KINDS` = terminal, cache, switch, alarm, door, intel, charge,
  revive, medkitWall. Client sends `use`; host checks reach.
- **Bodies**: lying bodies (`snap.bodies`).
- **Events**: tracer, boom, kill, banner, feed, pickup, hitConfirm, hurt, revive, tdDenied, ping, gadget.
- **NOT synced outside the training course**: light state (switch groups, shot-out lamps) and door locks. They travel
  only in the course wire (`game/course/courseWire.ts` `lights`, `Doors.setLocked`). In Infiltration a client's light
  field can differ from the host's after a lamp is shot or a switch thrown: a light-parity gap for co-op (bible 5.1).
- **NOT mirrored**: `body` (carry) and `hide` interactables (`coopHost.items()` comment: they "stay with whoever is
  carrying"), and the `vip` rescue item. A client cannot carry or hide a body today.
- **Security cameras** (`src/security`, Kestrel-owned): host side only, "never on a co-op client" (`gameState.ts` line 275).

---

## 2. Movement (`src/player`, `src/anim`, `src/config/movement.ts`)

The CT prototype (PROTOTYPE-PLAN.md P1-P4) is **not built**. No code has changed since locomotion step 22 (last
player / anim commit is the consolidation's deletion commit 3c7c2a5). Everything below is the pre-prototype build.

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| 6 speed gears, stick picks speed under the gear cap; D-pad / wheel steps the cap | Co-op | `player/speedGears.ts`, `GEARS` in `config/movement.ts`: stand 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 (gear 6 = sprint), crouch 0.42 / 0.75 / 1.08 / 1.5 / 1.9 / 2.3 m/s | e2e-move |
| P1 CT speeds (5 speeds, no sprint, run ~4.2), CT starts / frozen stops / walking turns / CT posture | Missing | Decided (M20, G25-G27, G32, G62); code still has sprint, planted pivot, closing step, HUNCH posture, gear pips | - |
| Crouch, forward roll | Partly | Roll = crouch tap at gear >= 5 (`CT.rollTime` 0.7 s, 3 m). Decided: roll = crouch held from a run (G32) | e2e-move |
| Noise from movement | Partly | `NOISE_QUIET`: standing gears 1-2, crouched 1-4 silent; `surfaces.ts` scales. Decided G40: 2 standing / 3 crouched | e2e-stealth-ai |
| P2 CT camera (1.8 m boom, rigid, no aim zoom, shoulder swap only while aiming) | Missing | Code: `config/camera.ts` free orbit, boom 2.2 / ADS 1.5, springs, x0.75 aim FOV | e2e-stealth (camera) |
| Back-to-wall (button entry, slide, edge peek, stacking) | Co-op | `player/wallController.ts` `WallCore`; MoveState `wall`; host stack clamp | e2e-wall, e2e-netmove (wall, wall crouch, stack) |
| P3 CT wall (spin entry, 0.35 m/s shuffle, flat-back standing, CT peek camera) | Missing | Code: 0.9 / 0.6 m/s slide, 0.25 s push to peek, lean-out aim and SWAT turn still exist (to be removed) | - |
| Door crack peek | Co-op | `world/doorPeek.ts`, MoveState `doorPeek`, `door {i, crack}` | e2e-netmove, e2e-coop |
| P3 CT door menu (stealth open on the stick, bash, optic cable), 15% light / sound / sight threshold | Missing | Decided G97, G41. Code: `DOOR_SHUT` 0.05, crack never passes light | - |
| Ladders, drainpipes, horizontal pipes (hands / legs up / inverted), ledges (hang, shimmy, corners, climb up, jump across), ducts, ziplines, windows | Co-op | `world/anchors.ts`, `player/attach.ts`, `player/attachController.ts`, `player/traversal*` | e2e-traverse, e2e-ct, e2e-netmove |
| Step / vault / mantle | Co-op | `player/movement.ts` `pickTraversal` (step <= 0.65, vault <= 1.25, mantle <= 1.8 m) | e2e-move, e2e-netmove (roll) |
| Split jump, wall jump | Co-op | `player/splitJump.ts`, auto-found from cover segments (`findSplitGaps`) | e2e-ct, e2e-netmove |
| Rappel (kick out, window kick-through), chain-link fence climb | Co-op | `LevelBuilder.rappel` / `fence`, MoveState `rappel`, `fence` | e2e-ct, e2e-netmove |
| Manual jump | Co-op | `LEAP`, `TraversalController.leap` | e2e-ct |
| Body carry | Solo | `game/stealthSystems.ts` (carry, hide spots); see section 1 | e2e-stealth-ai |
| Remote pose from MoveState (D8) | Co-op | `anim/motionDerive.ts`, `net/remoteAvatar.ts`; audit `node scripts/anim-audit.mjs --remote` | e2e-netmove |

---

## 3. Team moves (`game/teamMoves.ts`, `game/teamController.ts`, `TEAM` in `config/movement.ts`)

| Move | Status | How it works today | Covered by |
| --- | --- | --- | --- |
| Brace | Co-op | Hold Y 0.4 s with a mate within 3 m and a wall within 1 m behind | e2e-netmove |
| Boost | Co-op | Tap Y at a braced mate (within 1.2 m): tossed 0.9 s to a lip / pipe / split up to 4.5 m (`boostMax`) | e2e-netmove, e2e-ct-warehouse (pump house) |
| Human ladder | Co-op | Hold Y at a braced mate: top player stands on shoulders (feet 1.45 m), grabs a lip up to 4.1 m, climbs 0.8 s; top player can aim (60 deg band) | e2e-netmove |
| Dual takedown | Partly | Not a synced move: two ordinary takedowns by different players finished within `DUAL_WINDOW` 1.5 s show a banner (`coopHost.ts` line 229) | e2e-coop |
| The other four loco D8 moves (CT co-op set) | Missing | Wait for the co-op phase (G52) | - |

- Where: anywhere a wall is behind the bracer and `findJumpTarget` finds an anchor (generated box-top ledges, pipes,
  splits). No marked spots. Decided (G81): boosts only at marked spots; one co-op ledge band 4.3-4.5 m (G57). Not built.
- Net: `tmove` -> host `CoopHost.onTeamMove` checks both sides (`teamSide`, 1 s rate) -> `tstart` / `tdeny` / `tend`.
  MoveState modes `brace`, `boost`, `stacked`. Partners pass through each other during boost / ladder (`partnerPassable`).
- Y priority: takedown > team move > traversal > interact (`GameState`).

---

## 4. Health, down / revive, fail, checkpoints

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| Health 100, no regeneration | Co-op | `game/health.ts`; client health is host-authoritative | e2e-combat |
| Wall medkit station (hold 0.6 s, +40, single use) | Co-op | `game/medkit.ts`, `MapLayout.medkitWalls`, `CoopHost.healAtStation`. Only Proving Grounds has one (G98: every map, not built) | e2e-mouse, e2e-coop |
| Downed and revive | Co-op | `CoopHost.onRemoteDeath` / `addRevive`: a `revive` interactable on the body, reach 1.6 m, `REVIVE_TIME` 2.5 s hold | e2e-coop, e2e-course |
| Everyone down | Co-op | Mode's `onPlayerDeath`. Infiltration: `lives` 3; each wipe respawns both at the checkpoint after 3 s ("DOWN"); the third fails the mission | e2e-missions (three downs), e2e-coop (team wipe) |
| Checkpoints | Partly | Infiltration: the checkpoint is the player's position when the last objective completed (`infiltrationMode.ts` line 173), else the first spawn. Course: the bay's airlock. No mid-mission save | e2e-missions, e2e-course |
| Friendly fire | Partly | Course mode only (`validate.ts` `playersHostile`, `net/partnerTarget.ts`). Off in Infiltration. G49: the CT research decides | e2e-course |
| Mission fail rules | Solo + co-op | `game/missions.ts` `evaluateRules` (no alarms / no kills / undetected as `bonus` or `fail`) | e2e-missions |
| Saves | n/a | IndexedDB profile only (`src/save`); no mission progress saved | e2e-park |

---

## 5. Stealth

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| Light meter (body light level, shadow flag) | Co-op | `GameState` line 1798 `hud.setLight`; `World.lightField`; each page reads its own light field (see the light-sync gap, section 1) | e2e-stealth-ai |
| Guard perception (sight cone, light, stance, motion, exposure of chest / head / hips, close sense) | Co-op | `ai/perception.ts`, `ai/enemy.ts`; host perceives clients from their MoveState pose (`posedHead` / `posedChest`) | e2e-stealth-ai, e2e-coop |
| Alert states (unaware -> suspicious -> investigating -> alert -> searching -> cooldown), shout 8 m, radio 22 m after 2.5 s | Co-op | `ai/alertState.ts`, `EnemyManager.stealth`, shared LKP | e2e-stealth-ai |
| Hearing (footsteps, shots, doors, muffled through walls) | Co-op | `EnemyManager.hear`; host hears clients (`PF.firing`, `PF.quiet`, `noiseRadius`) | e2e-coop |
| Alarms (guard runs to a panel, reinforcements; player disables with a hold) | Co-op | `ai/alarm.ts`, `MapLayout.alarms`, `reinforce`; `alarm` item mirrored | e2e-missions |
| Bodies found -> search, KO revived | Co-op | `ai/body.ts`, `bodyNoticed` | e2e-stealth-ai |
| Shoot out lamps, light switches, flashlights on guards | Partly | `StealthSystems.shotRay`, `MapLayout.switches`; works for the host's world; not mirrored to the client outside the course | e2e-stealth-ai, e2e-course (lamp group) |
| Doors (open / bash / guards push open) | Co-op | `world/doors.ts` `Doors`; door sync | e2e-coop |
| Locked doors | Partly | `b.door(..., { locked })`, `Doors.setLocked`; lock sync course only; no lockpick (ct-toolkit 3.3, spec only) | e2e-course |
| Guards close doors / notice open doors (G41), poor sight above (G44), glass rules (G45) | Missing | Decided only | - |
| Takedowns (behind, front, side, corner, over cover, above, below, window, drop, inverted), tap = KO / hold = kill | Co-op | `game/takedown.ts`, `game/takedownController.ts`; client asks host (`td`) | e2e-takedown, e2e-coop |
| Grab and hostage (sidearm while holding, guards hesitate) | Co-op | `TakedownController` grab; MoveState `grab`; host holds the guard at the client's offset | e2e-takedown |
| CT grab menu (KO / kill / interrogate) | Missing | Decided G43, G23 | - |
| Close strike | Partly | Elbow strike (`game/strikeController.ts`, `game/elbowStrike.ts`; aware facing guards only stagger). P4 palm strike (one-hit KO any side) not built | e2e-takedown, e2e-netmove |
| Enemy archetypes: grunt, runner, heavy, sniper, enforcer, dog, droneOp, officer | Co-op | `ai/archetypes.ts`, `config/enemies.json` | e2e-enemies |
| Difficulty (Rookie / Normal / Realistic / Perfectionist), host's level runs | Co-op | `DIFFICULTY` in `ai/archetypes.ts` | e2e-coop |
| Security cameras | Solo | `src/security` (Kestrel-owned), host only; maps with `layout.security` (seclab, Kestrel) | e2e-security |

---

## 6. Kit

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| Rifle (Heron Carbine, suppressed) and pistol (Hush 9 SD) | Co-op | `config/weapons.json`, `config/arsenal.ts`; client shots validated by the host (`takeShot`, lag compensation) | e2e-combat, e2e-weapons-carry, e2e-coop |
| Holstered unless aiming, no hip fire, draw timing | Co-op | `weapons/drawState.ts`; host forces `dw` 0 while hands are busy | e2e-anim, e2e-netmove |
| CT draw timings, no aim zoom, rifle attachments (sniper / shotgun / launcher), pistol disruptor, knife | Missing | G76, G103, G104; ct-toolkit 3.5-3.10 spec only | - |
| Gadgets: frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, proximity mine; wheel | Co-op | `game/gadgets.ts`, `game/gadgetSystem.ts`; host relays client effects (`gadget`, 1 s rate, <= 40 m). Wheel slow-mo off in co-op | e2e-gadgets, e2e-coop (client gas cloud) |
| Goggles: night, thermal, electro | Co-op | `game/vision.ts`; render-only, local per page | e2e-stealth-ai (`vision-detect`), `tests/visionIsolation.test.ts` |
| P4 CT vision look (CT thermal ramp, instant cut, people behind closed doors) | Missing | G100-G102 | - |
| Optic cable, lockpick, hacking minigame | Missing | `docs/systems/ct-toolkit.md` 3.2-3.4 (spec only, Kestrel V1) | - |

---

## 7. Maps, missions and level authoring

### Maps (`world/maps/index.ts`, listed in `world/maps/listed.ts`)
| Map | Modes | Co-op relevance |
| --- | --- | --- |
| `warehouse` (443 lines + art) | clear, sandbox, mission, infiltration | The only map with Infiltration missions (4: Ledger, Courier, Blackout, Cold Storage). Nine guard rooms, CT routes (roof drainpipe, rappel over dispatch, split corridor, pump house boost / human ladder at 4.2 m, deck pipe, fence). e2e-missions, e2e-ct-warehouse |
| `proving` (214 lines) | sandbox | Test bed: traversal course, CT course, rappel house, fence, shed door, medkit station, three-room mini set with a grunt each (reachable with `?autostart=proving&mode=clear`). e2e-netmove runs here |
| `courselab` (126 lines) | course | Debug course: two rooms, airlock, a strip of gated cells (lever, bolt, hold, timed hold, **pair**, egress, mains, flag, anchorLock). Shows how cheap a small TS map is |
| `bunker` (Fallow, ~2,800 lines over 5 files) | course, sandbox | Co-op tutorial with guards in its bays. Drills to be rebuilt on CT moves (G79) |
| `kestrel` | sandbox | Built from `kestrel.blocks.json` (editor output). Paused (G53); no guards or mission wired |
| `seclab` | none (autostart only) | Security camera debug map |

### Mission framework
- Infiltration (`game/modes/infiltrationMode.ts`, `game/missions.ts`, `config/missions.json`): insertions (choose one),
  an `ObjectiveChain` of `download`, `plant`, `rescue` (VIP follows by A*), `sabotage`, `intel` (any order), `extract`
  (radius + optional alternates, held `EXTRACT_HOLD`), rules (no alarms / no kills / undetected as bonus or fail),
  rating, 3 lives. Co-op: any live operator near an objective counts; extract needs **one** operator in the zone, not
  both. Objectives run on the host; the client sees and uses them (e2e-coop "Infiltration objectives on the client").
- Only missions on listed maps load (`MISSIONS` filters by `LISTED_MAP_IDS`). A new test map needs an entry in
  `missions.json` and a line in `listed.ts` (or a test-only path) for `?autostart=<map>&mode=infiltration`.
- The campaign mission framework (two players required, objectives in the menu, G2, G108, G111) is not built.
- Course framework (`game/modes/courseMode.ts`, `game/course/*`): two-player-only gates already exist: `pair` (two
  devices within a window), `hold` / `timedHold` (one holds while the other passes), airlocks that cycle only with both
  players on the pad, `pickup` per player, `anchorLock` (a climb opened by a flag). Checkpoint restart per bay, per-player
  drill ticks, course HUD. The ready-made toolbox for "needs both players" level beats.

### Authoring a level
- **TypeScript builder (cheapest)**: a `MapDef` with `build(b: LevelBuilder)` returning a `MapLayout`.
  `world/levelBuilder.ts` offers `floor`, `box`, `wallX` / `wallZ` (with door gaps), `door` (swing, `locked`,
  `breachable`), `ladder`, `pipeV`, `pipeH`, `ledge`, `duct`, `zipline`, `rappel`, `fence`, `light`, `mark` (overhead /
  noLedge). Box tops over 1.9 m become ledges automatically (`generateLedges`); split gaps are found from opposed walls.
  `MapLayout` takes `playerSpawns`, `rooms` (`RoomDef` with `squad` slots: kind, post, `route`, `waits`, `faces`),
  `switches` (light groups), `alarms`, `reinforce`, `hideSpots`, `medkitWalls`, `pickups`, `course`, `security`. Register
  in `world/maps/index.ts`. Nav grid and light bake are built at load. Courselab is 126 lines: a small CT test level is
  roughly 150-300 lines plus a `missions.json` entry.
- **Kestrel editor** (`npm run editor`, `src/editor`, docs/kestrel/editor.md): a dev-only 3D editor for the Kestrel
  campus blocks JSON only (walls, openings, climbs, lights, security, mission objects). Not a general map editor; tied to
  `kestrel*.ts` and paused. Not the fast path.
- Standard: every new map follows `docs/level-design.md` and starts from `docs/templates/map-spec.md` (hard rule); a
  throwaway test level should be framed as a debug map (like courselab / seclab) or get Michael's say on the standard.

---

## 8. HUD and partner awareness

| Item | Status | Where | Covered by |
| --- | --- | --- | --- |
| Pings (D-pad left tap / Z): aim-ray mark, follows a pinged guard, edge arrows off screen, host rate 0.8 s | Co-op | `GameState.sendPing`, `ping` msg / event, `ui/hud/pings.ts` | e2e-coop (both ways) |
| Partner on the minimap (blue `ally` blip) (replaced by G339 and G135: no minimap and no live partner position; to remove) | Co-op | `coopHost.blips` / `coopClient.blips`, `ui/hud/minimap.ts` | e2e-coop |
| Partner name tag / outline through walls / off-screen partner arrow | Missing | Nothing in `ui/hud` or `src/net` | - |
| "X is down" feed, revive prompt with hold ring | Co-op | `hud.feedItem`, interactable prompt | e2e-coop |
| World prompts (takedown, team move, traversal, use) | Co-op | `ui/hud/worldPrompts.ts` | e2e-pad, e2e-mouse |
| Awareness arcs, LKP ghost | Co-op | `ui/hud/awareness.ts`, `vfx/lkpGhost.ts` | e2e-stealth-ai |
| Objective list always on (course) / objectives in menu (CT, G108) | Partly | Course HUD (`ui/hud/courseHud.ts`) has per-player ticks and "Waiting for partner"; Infiltration shows mode info only | e2e-bunker |
| Beacons / waypoints for objectives (replaced by G339: none in any mode; Marlow Yard keeps its guidance marks, G292) | Partly | Course next-drill marker (`PingView.marker`); Infiltration objective blips on the minimap (to remove) | e2e-course |
| Text radio / subtitles | Co-op | `ai/barks.ts`, `ui/hud/barks.ts`; LANTERN course radio mirrored | e2e-bunker |

---

## 9. Test tools

| Tool | What it gives | Where |
| --- | --- | --- |
| `?autostart=<map>&mode=<mode>` | Boots straight into a solo match (`&mission=`, `&insertion=`, `&difficulty=`, `&loadout=`, `&gear=`, `&weather=`) | `src/main.ts`, `core/flags.ts` |
| Two-tab auto co-op | **Course mode only**: `?net=local&autostart=<map>&mode=course`, the first tab hosts, the next joins and the match starts (`coopUi.ts` `autoLocalCourse`). Other modes go through the lobby | `src/main.ts` line 211 |
| `?course=solo` / F3 | One player works both course halves (dev, G48) | course mode |
| Two-page e2e helpers | `hostAndJoin(url, n)` (opens host + clients over `?net=local`, joins by code), `startMode(pages, mode, map)` (sets mode / map, readies, starts, damage off), `until()` (Node-side polling), `localJoints` / `remoteJoints`, `allowTeleport` | `scripts/e2e-net-lib.mjs` |
| Single-page helpers | `launch`, `openPage`, fake pad `press` / `stick` (`BTN`), `frames`, `stepHeadless` / `__ff` fast-forward, `assert` | `scripts/e2e-lib.mjs` |
| Runners | `npm run e2e:quick` (smoke + touched folders), `npm run e2e`, `node scripts/run-e2e.mjs <suite>`; `E2E_NETSIM=typical` | `scripts/run-e2e.mjs` |
| Co-op suites | e2e-coop (lobby, Hunter with `legacy=1`, door sync, client takedown, pings, gas, dual takedown, revive, wipe, Infiltration objectives, medkit), e2e-netmove (traversal + team moves mirrored), e2e-course, e2e-bunker. e2e-coop, e2e-netmove and e2e-bunker are KNOWN FLAKY (G51: fix job decided) | docs/systems/testing-tools.md |
| Debug overlay | F3 or `?debug=1`: skeleton / capsules / hit volumes / foot contacts, Tune sliders (`MOVEMENT`, `CAMERA`, `CARRY`, CT momentum), slow motion, frame pacing, anim layer weights | `ui/debug*` |
| Window hooks | `window.__app` (`current` = GameState, `loop.stepHeadless`), `window.__coop.session`, `window.__missions`, `window.__netsim.stats` | `src/main.ts`, `src/net` |
| Anim audit (remote) | `node scripts/anim-audit.mjs --remote`: remote pose vs local, pair alignment for brace / boost | testing-tools.md |
| Plans | `node scripts/plan-svg.mjs <mapId>` top-down SVG per storey; `scripts/shot.mjs` screenshots | scripts/ |

---

## Fastest path

### The 10 cheapest things to reuse or change
1. **Two-tab auto start for every mode.** Generalise `autoLocalCourse` (`net/coopUi.ts`) and its `main.ts` guard so
   `?net=local&autostart=<map>&mode=infiltration` hosts in tab one and joins in tab two. About 20 lines; removes the
   lobby from every play test and e2e.
2. **A small TS test level** modelled on `courselab.ts` (126 lines): two or three guarded rooms (`RoomDef.squad` with
   routes), a dark lane, a 4.2 m lip for the boost / human ladder (box top -> auto ledge), a ladder or pipe, a rappel
   point, one door, a light switch group, an alarm panel, a medkit station, an extract zone. Register in `maps/index.ts`.
3. **Infiltration as the mission runner.** Add one `missions.json` entry (insertion, 2-3 objectives, extract) and list
   the map; objectives, rules, lives, checkpoint and results already work for both players.
4. **Course gates for "needs both" beats.** Reuse `pair`, `hold` / `timedHold` and the two-player airlock from
   `game/course/*` (either run the level in course mode, or lift the gate checks into Infiltration).
5. **Team moves as they are.** Brace, boost and human ladder work anywhere with a wall behind and an anchor up to
   4.5 m; only the target lip needs placing. Add a "marked spot" filter later (G81).
6. **Downed / revive and 3 lives.** Already co-op and tested; just place medkit stations in the new map.
7. **Stealth core unchanged.** Perception, alert states, radio, alarms, bodies found, takedowns and grab all run on the
   host and see the client's real pose; nothing to build for a first play.
8. **Traversal set.** Ladders, pipes, ledges, ducts, split / wall jump, rappel and fence are all mirrored to the remote
   and covered by e2e-netmove: build the level from these pieces.
9. **Pings** cover basic partner awareness for a first test; no new HUD needed to start (the minimap ally blip is
   replaced by G339 and G135: no minimap, no live partner position).
10. **Test harness.** `hostAndJoin` + `startMode` + `until` give a two-player e2e for the new level in one short file
    (copy the e2e-coop pattern), run under `E2E_NETSIM=typical` for a latency report.

### The 5 biggest missing pieces
1. **The CT movement itself (P1-P4)**: speeds without sprint, starts / frozen stops / walking turns, CT posture and
   camera, CT wall and door menu, palm strike, CT vision. None is built; the co-op prototype feels like the pre-CT game
   until these land (MoveState fields change with them: aim side, door angle, removed `swat` / `lk`).
2. **World-state sync outside the course**: light groups, shot-out lamps and door locks reach the client only in course
   mode; body carry / hide and the VIP item are host-page only. Without this the client's light meter and view can
   disagree with what the host's guards see (light parity), and a client cannot hide bodies.
3. **The CT co-op move set and rules**: the four further team moves (G52, loco D8), a real synced dual takedown (today it
   is a banner on two independent takedowns), marked boost spots (G81), the co-op ledge band (G57), friendly fire and
   heavies per the research (G49), and a both-players extract.
4. **Campaign / mission framework for two players**: missions that require two players (G2, G111), objectives in the
   menu (G108), mid-mission checkpoints beyond "last objective", the 2-player cap (`COOP_MAX` still 4), and no
   LAN-only or TURN path for networks where WebRTC via public signalling fails.
5. **CT toolkit and door play**: CT door menu (stealth open, bash, optic cable), lockpick, hacking, pistol disruptor,
   rifle attachments, grab menu with interrogation, guards closing and noticing doors (G41). All spec only
   (`docs/systems/ct-toolkit.md`).
