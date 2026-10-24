# coop-real - PLAN

Suite `e2e-coop-real` (two pages, `?net=local&autostart=ctcourse&mode=course`, `E2E_NETSIM=typical`), two parts:
`:1` A1 interactions, `:2` A1 traverse + background + rejoin. Lands in two PRs: PR A (harness + cases + KNOWN BUG marks,
test-only apart from the A6 transport param) as soon as K1 passes, so the detector exists; PR B (fixes F1-F4, each
removes its marks), stacked on A, one train. Preamble: `docs/systems/agent-preamble.md`, port from the laptop queue.

## Code this builds on (read, do not re-find)
- Real input: `__pad` init script scripts/e2e-lib.mjs:156-187; `onePoll` / `press` / `pressPair` / `stick` :255-356,
  `BTN` :227; game side src/input/gamepadSource.ts:68-100, inputManager.ts:178-180, polled from core/app.ts:410 and
  core/loop.ts:86. Keyboard / mouse: src/input/keyboardMouseSource.ts:66-145 (blur releases keys :68-73),
  `fakePointerLock` e2e-lib.mjs:44-56. Action `interact` = pad A (gamepadMapping.ts:64) / E (keyBindings.ts:53);
  `coop` = RB / F (gameState.ts:1894).
- Two pages: `launch` / `openPage` e2e-lib.mjs:87-104 (one context, shared BroadcastChannel); netsim URL :196-197,
  report-mode `assert` :387-406, probe :414; `until` / `waitSim` / `setSimPages` / `LOAD_MS` scripts/e2e-net-lib.mjs:16-167;
  e2e-ctcourse part dispatch and host pump scripts/e2e-ctcourse.mjs:40-76, its A1 route (by teleports) a1Gate.mjs:86-220.
- Prompts: `GameState.contextMenuStep` src/game/gameState.ts:1375-1471, `ctxRun` :1474-1494, `TD_LABEL` :313-328;
  `ContextMenu` (readable `__app.current.ctxMenu`: `count`, `opts[i].{kind,label,hold}`, `sel`, `version`)
  src/game/contextMenu.ts:63-90, input `step` :176-240 (A down opens row 1, nav moves `sel`, release runs it);
  team prompt teamController.ts:85-92; takedown offer takedownController.ts:261-316.
- Net: host `receive` src/net/coopHost.ts:678-757, `onUse` :760-791, `onTakedown` :865-909, `onAssist` / `assistApply`
  :981-1020, `partnerHolds` :919, `onLampShot` :1314-1340, `lampTx` sector-only :202, `late` / `joinStep` / `joinSpot`
  :400-462, `hold` :481-497, `restoreStep` :512; client lamp ray sector-only src/net/coopClient.ts:188-197 and
  `lampRay` :691-705, `partnerHolds` :658, restore :913; course lamp apply src/game/modes/courseMode.ts:1320-1328;
  session drop / held slot src/net/session.ts:142-153, 186-195, 272-302; heartbeat drop 60 s
  src/net/localTransport.ts:74-85; `REJOIN_HOLD_S` src/core/rejoin.ts:12; placement `joinSpawn`
  src/game/spawnSlots.ts:227-238, `courseSlotPoints` / `courseStartCheckpoint` courseMode.ts:109-122, `checkpoint`
  src/game/course/courseState.ts:179, 1241-1245; hidden page `App.onVisibility` src/core/app.ts:164, 319-330,
  co-op `pause` = menu only gameState.ts:1250-1258, bgTick src/net/bgTicks.ts:9-12 (off under webdriver).
- Audio: `WeaponAudio.shot` src/audio/weapons/weaponAudio.ts:85, `remoteShot` :113 (throttle `allow` :116 returns
  true uncounted, so count calls, not `stats`), stats :29-54 (`__app.weaponAudio`, core/app.ts:68); voice choke point
  `AudioEngine.out` src/audio/audioEngine.ts:147 (`__app.audio`); remote rounds src/net/remoteShots.ts:21-33,
  remoteAvatar.ts:353, 842-862, gameAudio.ts:118-121; shooter counter playerWeapons.ts:1012.
- Rejoin rule (no G entry; docs/systems/coop.md:90-110): the current checkpoint (last sealed holding room L1..L7) at the
  client's slot if it can walk to the host, else beside the host; never the level start unless that is the checkpoint.

## The generic checks (H1 builds them once)
- State hash, read-only, per page (`hashState(page)`): host = guards (id, alive, ko, taken, alertCode, pos 0.25 m)
  from `enemyMgr.enemies` / `.bodies`, doors (open > 0, locked, cracked) from `world.doors.list`, lamps
  `readLamps(world.level.lights)` (net/lampSync.ts:48), items (id, enabled, label), bodies (hidden, carried), players
  (alive, hp, `mv.m`), `takedown.done.byKind`, `__course.debug()`; client = the same from `net.puppets`, `kept`,
  `items`, doors, its lamp registry. Plus an event tap: a pass-through wrap of `events.emit` (gameState.ts:518) logging
  type + sim time.
- Prompt watchdog: every row the suite runs (route or sweep) must move the host hash, the client hash or the event log
  within `PROMPT_S` = 3 sim s; a row run on the client must move the HOST hash (client actions reach the host). Fail
  text names the row label, page and both hashes' diff keys.
- Sweep: at each route stop, read every row on both pages (`ctxMenu.opts`, `team.prompt`); run each non-destructive
  row (door open / close / peek, switch, unbolt, pick up / drop / hide body, grab, team takedown) by input with the
  watchdog; destructive rows (knock out, kill) once per guard, then the host's pause-menu checkpoint restart by input.
- Audio: pass-through counters on `weaponAudio.shot` / `remoteShot` per page; per shooter `shotCount` step, the shooter
  page counts exactly 1 `shot`, the other exactly 1 `remoteShot` within 0.5 s, `suppressed` matching the gun.
- KNOWN BUG (A5): `knownBug(id, slice, fn)`; summary `KNOWN BUG: n (ids)`; an unexpected pass fails the suite.

## Slices
| Slice | Owner | Files (owned) | Tests | Depends |
| --- | --- | --- | --- | --- |
| H1 harness core | Opus | new `scripts/e2e-coop-real.mjs` (entry, boot pair by URL, part dispatch, host pump as e2e-ctcourse.mjs:52-76), new `scripts/e2e-coop-real/lib.mjs` (closed-loop `walkTo` by stick / keys reading pos + camera yaw, `aimAt` by right stick / mouse reading the camera ray, `pickRow`, `pauseRestart`, `hashState`, event and audio taps, `knownBug`, lifecycle helpers), `src/net/localTransport.ts` (A6 `&netdrop=`) | `node --check`; a smoke run of both pages booting, one `walkTo`, one `pickRow`; the lifecycle probe below | - |
| H2 runner wiring | Sonnet (strict brief) | `scripts/run-e2e.mjs` (REQUIRED, PARTS `e2e-coop-real` 1-2, per-suite env `E2E_NETSIM=typical E2E_NETSIM_GATE=1`, COVERS `src/net/` + course mode, print KNOWN BUG lines), `scripts/e2e-lib.mjs` (`E2E_NETSIM_GATE`, launch arg `--disable-blink-features=AutomationControlled` behind an option), `scripts/e2e-times.json` (120 s per part), docs/systems/testing-tools.md entry | `node scripts/run-e2e.mjs --list`; e2e-coop unchanged under the default | - |
| C1 part 1: A1 interactions | Sonnet (strict Opus brief) | new `scripts/e2e-coop-real/part1.mjs` | the sweep at 3 A1 stops; P6a client holds `a1-checker`, host runs "Team takedown"; restart; P6b host holds, client runs it; S2 client then host shoots the apron flood (host + client lamp state); client door use, client unbolt refusal from the apron; client picks up / drops the body; P7 audio both ways, pistol suppressed | H1, H2 |
| C2 part 2: background + rejoin | Opus | new `scripts/e2e-coop-real/part2.mjs` | A1 by input to L1, both into A2 (host leads); B1 client hidden 5 s (< drop): same session, position kept 0.5 m, pause menu closes by B, walks 2 m; B2 host moves on in A2, client frozen past `netdrop`, resumed; B3 client page reload (tab discard), Rejoin row by pad; B4 client page closed, new page on the boot URL. B2-B4 assert: placed at L1's slot 1 or within 3 m of the host within 30 s, more than 10 m from the lounge spawn, its doors / lamps match the host's | H1, H2 |
| K1 checker batch 1 | Opus (fresh) | none (CHECK-1.md) | rerun `--list`, read the diff against "The input line" (BRIEF), grep the suite for `__app.*=`, `.onUse(`, `teleport`, `applyDamage`, `input.state.set`, `.start(` | C1, C2 |
| M1 marks | lead | part files | each laptop failure becomes `knownBug(<walk id>, '<F slice>')` with the failing line in STATE | K1 + laptop run 1 |
| F1 S2 Course client lamp shots | Opus | src/net/coopClient.ts (hook `onRay` for `course`), src/net/coopHost.ts (`lampTx` / `onLampShot` for `course`), src/game/modes/courseMode.ts:1320-1328 (a client-shot lamp in `lights.dead`), new tests/courseLampShot.test.ts, coop.md :455-465 | vitest file; part 1 S2 mark removed | M1 |
| F2 R7 drop and rejoin | Opus | src/net/session.ts, src/net/localTransport.ts, src/net/coopUi.ts, src/core/rejoin.ts, src/net/joinWatch.ts / src/game/spawnSlots.ts only if B2-B4 show a lounge spawn; tests/rejoin.test.ts | vitest; part 2 marks removed. Candidates to confirm from evidence: a resumed page the host already dropped (hi from a dropped id); a new tab refused "Room full" (coop-rejoin REPORT :62-63); a hidden page's heartbeat starved (keep it on the bgTick worker) | M1 |
| F3 P6 under input | Opus, only if marked | src/game/takedownController.ts, src/net/assistTakedown.ts, tests/coopWalkFixes.test.ts; coopHost / coopClient lines only after F1 lands | vitest; mark removed | M1 (F1 if it touches coopHost) |
| F4 P7 under input | Opus, only if marked | src/net/remoteShots.ts, src/net/remoteAvatar.ts, src/audio/gameAudio.ts, tests/coopWalkFixes.test.ts (RemoteShots cases) | vitest; mark removed | M1 |
| T1 triage | lead | docs/coop-real/TRIAGE.md | sweep failures outside the five: row, set, owner (Marlow = map data / sets, Guard AI = guard reaction), sent in one message | M1 |
| K2 checker batch 2 | Opus (fresh) | CHECK-2.md | F diffs, vitest files, no mark left without a slice | F1-F4 |

## Parallel groups (no two agents on one file)
1. H1 ∥ H2 (disjoint files). Lifecycle probe inside H1 (below).
2. C1 ∥ C2 (own part files; a lib change goes to the lead, who applies it between agents).
3. K1 ∥ laptop run 1 on the same commit.
4. F1 ∥ F2 ∥ F4 (disjoint). F3 after F1 if it needs coopHost / coopClient; T1 any time after M1.
5. K2 ∥ laptop run 2.

## Lifecycle probe (H1, first, ~20 min)
On the client page, record `document.visibilityState`, rAF count, a `setInterval` count, worker ticks and
BroadcastChannel arrivals over 5 s for each: CDP `Page.setWebLifecycleState` `frozen` then `active`; CDP
`Emulation.setFocusEmulationEnabled false` + the host page `bringToFront` (and a host page opened by `Target.createTarget`
`newWindow`); the e2e-offline fallback (redefine `document.hidden`, dispatch `visibilitychange`,
scripts/e2e-offline.mjs:108-121). Pick: B1 = the most real "hidden" (visibility hidden, rAF stopped, timers alive);
B2 = `frozen` (timers and workers stopped, as a phone app switch). Record the result in STATE and testing-tools.md.

## Laptop queue requests (`node scripts/laptop-queue/request.mjs --sha <sha> --requester "Night Shift | Player Build"`)
- Run 1 (after group 2): `--set coop-real-1 --suites "e2e-coop-real e2e-coop"` (e2e-lib changed). Netsim comes from
  the runner's per-suite env (`--env` is for alone runs only, request.mjs:56-59). Expect KNOWN BUG candidates.
- Run 2 (after F slices, `src/net` tier): `--set coop-real-2 --suites "e2e-coop-real e2e-coop e2e-netmove e2e-ctcourse:1 e2e-course"`.
- GPU per CLAUDE.md:66-68 (every e2e `E2E_GPU=1`); slot and jobs are the queue's (pr kind).

## Wall time
Suite: part 1 ~110 s (load 20, route 30, sweep ~15 rows, 2 restarts), part 2 ~120 s (traverse 40, B1 5, B2 drop 8,
two reloads 20 each): ~4 min serial. Over 4 min: B4 moves to a REPORT-only part 3. Job: group 1 ~1.5 h, group 2 ~2 h,
K1 + run 1 ~45 min, fixes ~2 h, K2 + run 2 ~45 min: ~7 h.
