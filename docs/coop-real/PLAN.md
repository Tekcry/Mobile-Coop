# coop-real - PLAN

Suite `e2e-coop-real` (two pages, `?net=local&autostart=ctcourse&mode=course`, `E2E_NETSIM=typical`, fixed netseed 1
(localTransport.ts:22)), three parts of <= 120 s each on parallel slots (suite wall time = its longest part): `:1` P6 +
P7 + body, `:2` sweep + S2 + doors / unbolt, `:3` R7 B1-B4. PR A (harness + cases + marks, test-only apart from the A6
transport param and an e2e-lib launch option) after K1 + run 1, so the detector exists; PR B (F slices, each removes its
marks) stacked on A, before #317 coop4. Preamble: `docs/systems/agent-preamble.md`. Plan check applied (PLAN-CHECK.md 1-18).

## Code this builds on (read, do not re-find)
- Real input: `__pad` init script scripts/e2e-lib.mjs:156-187; `onePoll` / `press` / `pressPair` / `stick` :255-356,
  `BTN` :227; game side src/input/gamepadSource.ts:68-100, inputManager.ts:178-180, polled from core/app.ts:410 and
  core/loop.ts:86. Keyboard / mouse: src/input/keyboardMouseSource.ts:66-145 (blur releases keys :68-73),
  `fakePointerLock` e2e-lib.mjs:44-56. `interact` = pad A (gamepadMapping.ts:64) / E (keyBindings.ts:53); `coop` = RB / F
  (gameState.ts:1894).
- Two pages: `launch` / `openPage` e2e-lib.mjs:87-104 (`hideAutomation` H2), background flags :21; netsim URL :196-197;
  `until` / `waitSim` / `setSimPages` / `LOAD_MS` scripts/e2e-net-lib.mjs:16-167 (use only these: #317 edits the file);
  host pump as scripts/e2e-ctcourse.mjs:52-76. Never import scripts/e2e-ctcourse/* (a1Gate routes teleport).
- Prompts: `contextMenuStep` src/game/gameState.ts:1375-1471, `ctxRun` :1474-1494, `TD_LABEL` :313-328; `ContextMenu`
  (`__app.current.ctxMenu`: `count`, `opts[i].{kind,label,hold}`, `sel`, `version`) src/game/contextMenu.ts:63-90, input
  `step` :176-240; world prompts 'takedown' ("Takedown" / "Grab" / "Held") gameState.ts:3423-3435, 'drop', 'jumpTo',
  'coop', 'state', 'vault' src/ui/hud/worldPrompts.ts:5 (reader `label()` :115); team prompt teamController.ts:85-92;
  takedown offer takedownController.ts:261-316.
- Net: host `receive` src/net/coopHost.ts:678-757, `onUse` :760-791, `onTakedown` :865-909, `onAssist` / `assistApply`
  :981-1020, `partnerHolds` :919, `onLampShot` :1314-1340, `lampTx` sector-only :202, `late` / `joinStep` / `joinSpot`
  :400-462, `hold` :481-497, `restoreStep` :512; client lamp ray sector-only src/net/coopClient.ts:188-197, `lampRay`
  :691-705, `partnerHolds` :658, restore :913; course lamp apply src/game/modes/courseMode.ts:1320-1328; session drop /
  held slot src/net/session.ts:142-153, 186-195, 272-302; heartbeat drop 60 s src/net/localTransport.ts:74-85;
  `autoLocalCourse` src/net/coopUi.ts:855-881, menu "Rejoin <code>" :892, record in sessionStorage src/core/rejoin.ts:5,
  30, `REJOIN_HOLD_S` :12; `joinSpawn` src/game/spawnSlots.ts:227-238, `courseSlotPoints` / `courseStartCheckpoint`
  courseMode.ts:109-122, `checkpoint` src/game/course/courseState.ts:179, 1241-1245; `App.onVisibility`
  src/core/app.ts:164, 319-330; co-op `pause` = menu only gameState.ts:1250-1258; bgTick src/net/bgTicks.ts:9-12 (off
  under webdriver; :11 yields to `stepHeadless`).
- Audio: `WeaponAudio.shot` src/audio/weapons/weaponAudio.ts:85, `remoteShot` :113 (throttle `allow` :116 returns true
  uncounted: count calls, not `stats`), `__app.weaponAudio` (core/app.ts:68); voice choke point `AudioEngine.out`
  src/audio/audioEngine.ts:147; remote rounds src/net/remoteShots.ts:21-33, gameAudio.ts:118-121; shooter counter
  playerWeapons.ts:1012.
- A1 has no placed corpse (a1Gate.ts:250-257 'body' entries are light probes): the body case makes its own.
- Rejoin rule (docs/systems/coop.md:90-110): the current checkpoint (last sealed holding room L1..L7) at the client's slot
  if it can walk to the host, else beside the host; never the level start unless that is the checkpoint.

## The generic checks (H1b builds them once)
- Input line enforced: every `page.evaluate` goes through lib `read(page, fn)` (read-only) or a `drive*` helper (pad /
  keys / mouse / lifecycle); `stepHeadless` only in the pump.
- State hash per page (`hashState`): host = guards (id, alive, ko, taken, hostage, alertCode), doors (open, target,
  locked, cracked), lamps `readLamps` (net/lampSync.ts:48), items (id, enabled, label), bodies (hidden, carried), players
  (alive, hp), `takedown.done.byKind`, `__course.debug()`; client = the same from `net.puppets`, `kept`, `items`, doors,
  its lamp registry. Positions and `mv.m` are not in the pass keys.
- Expected-change table (row kind -> key): door -> that door's open / target; grab / ko / team takedown -> that guard's
  ko | taken | hostage on the host; body -> carried / hidden; unbolt -> gate / lock; switch -> lamp group; local-only kinds
  (peek, optic) -> the acting page's own flag. A shared kind run on the client must move its key on the HOST hash. An
  unlisted kind: diff keys minus the keys that moved in an equal control window just before the row (pre-window
  baseline). The event tap (pass-through `events.emit`, gameState.ts:518) counts only types listed for the kind.
- Window: starts after the row's hold time or the takedown's finishing strike; `PROMPT_S` 3 sim s, takedown kinds 6 s.
  Fail text: row label, page, expected key, both hashes' diff keys.
- Prompt sources: `ctxMenu.opts` + every WorldPrompts label + `team.prompt`, each run with its bound input.
- Sweep (one stop): per page, yaw scan in 8 camera headings by stick; partner variants idle / holding the checker /
  carrying a body / crouched offering; presence asserts for rows that must exist (host "Team takedown" while the client
  holds); non-destructive rows by input; destructive rows once per guard, then `pauseRestart` by input.
- Audio: pass-through counters on `shot` / `remoteShot` per page; per shooter `shotCount` step the shooter counts 1
  `shot` and 0 `remoteShot` (echo), the other page 1 `remoteShot` within 0.5 s, `suppressed` matching the gun. Optional:
  `AudioEngine.out` sfx voices in that window.
- `knownBug(id, slice, { expect: /<assert text>/ }, fn)`: only an assert matching `expect` prints
  `KNOWN BUG <id> -> <slice>`; any other throw (timeout, harness error, new regression) fails the run; setup runs outside
  `fn` with its own asserts; a pass prints `UNEXPECTED PASS <id>` and fails the run. Summary `KNOWN BUG: n (ids)`.

## Slices
| Slice | Owner | Files (owned) | Gate | Depends |
| --- | --- | --- | --- | --- |
| H1a boot + input + lifecycle | Opus (feature/cr-h1, running) | new `scripts/e2e-coop-real.mjs` (boot pair by URL, part dispatch 1-3, host pump), `scripts/e2e-coop-real/lib.mjs` boot / pump / `read` / `drive*` (`walkTo` closed loop by stick / keys, `aimAt` by right stick / mouse, `pickRow`, `pauseRestart`, lifecycle), `src/net/localTransport.ts` (A6 `&netdrop=`), `scripts/e2e-lib.mjs` (launch option dropping the three background flags, A7) | probe table in STATE; smoke: both pages boot under netsim, client `walkTo` 6 m to <= 0.3 m in <= 8 s | - |
| H1b checks | Opus (feature/cr-h1, running) | lib: `hashState`, expected-change table + pre-window baseline, prompt sources (world prompts, `team.prompt`), sweep (headings, partner variants, presence asserts), taps, `knownBug` with `expect`, windows | one `pickRow` moves its expected key; a control row with no effect fails the watchdog; `knownBug` self-check (matching assert = KNOWN, other throw = fail) | H1a API |
| H2 runner | done e735dc8a | run-e2e.mjs, e2e-lib.mjs, e2e-times.json, testing-tools.md | - | - |
| H2b part 3 | lead (small edit) | `scripts/run-e2e.mjs` PARTS `e2e-coop-real: ['1','2','3']` + its comment, `scripts/e2e-times.json` `e2e-coop-real:3` 120, testing-tools.md entry line | `node scripts/run-e2e.mjs --list` | - |
| C1 parts 1-2 | Sonnet (strict Opus brief: coordinates, row labels, expected keys) | new `scripts/e2e-coop-real/part1.mjs`, `part2.mjs` | part 1: P6a host holds `a1-checker`, client runs the takedown (host guard ko / taken within 6 s); restart; P6b client holds, host is offered "Team takedown" (presence) and runs it (effect); restart; body: host knocks out the checker himself (solo grab + knock out by input), client picks up / drops / hides it (host carried / hidden); P7 both ways, pistol suppressed. Part 2: sweep at 3 A1 stops; S2 client shoots the apron flood (group 11), host a yard bulkhead (12), `readLamps` of that lamp on both pages within `PROMPT_S`; client door use; client unbolt refusal from the apron. Gate: one laptop run, every case reaches its final assert, no setup timeout, part <= 120 s | H1b |
| C2 part 3 | Opus | new `scripts/e2e-coop-real/part3.mjs` | A1 by input to L1, both into A2 (host leads). Before any drop: host `__course.debug().checkpoint` is L1 and host > 10 m into A2. B1 client hidden 5 s (< drop): same session, pos kept 0.5 m, pause menu closes by B, walks 2 m. B2 host moves on, client frozen past `netdrop`, resumed. B3 reload `?net=local&netsim=typical&netdrop=8` (no autostart), "Rejoin <code>" row by pad. B4 page closed, new page, main menu Join by code by pad. B2-B4: placed at L1 slot 1 or within 3 m of the host within 30 s, > 10 m from the lounge spawn, doors / lamps match the host's; then the client walks 2 m by stick (host puppet within 0.5 m) and a client door row moves the host's door. Gate as C1 | H1b |
| K1 checker 1 | Opus (fresh) | CHECK-1.md | `--list`; diff vs BRIEF "The input line"; grep `.evaluate(` outside lib.mjs, `moveHost|moveClient|setDamage`, `stepHeadless` outside the pump, imports from scripts/e2e-ctcourse/*, `__app.*=`, `.onUse(`, `teleport`, `applyDamage`, `input.state.set`, `.start(` | C1, C2 |
| M1 marks | lead | part files | a failure seen on both run-1 runs (netseed 1) that maps to one of the five: `knownBug(<walk id>, '<F slice>', { expect })`, failing line in STATE | K1 + run 1a/1b |
| T1 triage | lead | part files, docs/coop-real/TRIAGE.md | sweep finds outside the five (both runs): `knownBug('T1-<row>', '<owner>:<ROADMAP item>', { expect })` + a TRIAGE line (row, set, owner: Marlow = map data / sets, Guard AI = guard reaction), one message per owner | as M1 |
| F1a S2 course apply | Opus | courseMode.ts:1320-1328 (a client-shot lamp in `lights.dead`), new tests/courseLampShot.test.ts | vitest file; F = its mark removed (with F1b), other marks unchanged | M1 |
| F1b S2 course wire | Opus | src/net/coopClient.ts (`onRay` for `course`), src/net/coopHost.ts (`lampTx` / `onLampShot` for `course`), coop.md:455-465 | vitest; S2 mark removed, other marks unchanged | M1 |
| F2a R7 transport / placement | Opus | src/net/localTransport.ts, src/core/rejoin.ts, src/game/spawnSlots.ts (only if B2-B4 show a lounge spawn), tests/rejoin.test.ts | vitest; with F2b, part 3 marks removed, others unchanged | M1 |
| F2b R7 session / UI | Opus | src/net/session.ts, src/net/coopUi.ts, src/net/joinWatch.ts | as F2a. Candidates from evidence: a resumed page the host already dropped (hi from a dropped id); a new tab refused "Room full" (coop-rejoin REPORT :62-63); a hidden page's heartbeat starved (keep it on the bgTick worker) | M1 |
| F3 P6 under input | Opus, only if marked | src/game/takedownController.ts, src/net/assistTakedown.ts, tests/coopWalkFixes.test.ts; coopHost / coopClient lines only after F1b | vitest; mark removed, others unchanged | M1, F1b |
| F4 P7 under input | Opus, only if marked | src/net/remoteShots.ts, src/audio/gameAudio.ts, tests/coopWalkFixes.test.ts (RemoteShots cases) | as F3 | M1 |
| K2 checker 2 | Opus (fresh) | CHECK-2.md | F diffs, vitest files; no mark without a slice or owner item; F2 not transport-only | F slices |

F2 feasibility: the suite drops through localTransport, not Trystero, so F2's fix must not be localTransport-only (it
lives in session / rejoin / coopUi paths both transports share; F2a's transport edit is the test seam only).

## Parallel groups (no two agents on one file)
1. H1a then H1b (feature/cr-h1, builder running); H2 done; H2b (lead) any time.
2. C1 ∥ C2 (own part files; a lib change goes to the lead, who applies it between agents).
3. K1 ∥ laptop run 1a ∥ run 1b (same sha).
4. M1 + T1 (lead), then F1a ∥ F1b ∥ F2a ∥ F2b ∥ F4; F3 after F1b.
5. K2 ∥ laptop run 2.

## Order vs #317 coop4 (PLAN-CHECK "File claims")
#317 also edits coopClient / coopHost / coop.md (F1b, F3), session / coopUi / joinWatch (F2b), remoteAvatar (dropped
from F4). PR B and #317 never share a train; PR B goes first and coop4 rebases onto it; the lead tells the Guard AI lead
which hunks PR B touches. If #317 is train-ready first, F1b / F2b / F3 rebase onto feature/coop4. F1a, F2a, F4 are free
of #317 and may ride any train.

## Lifecycle probe (H1a, first, ~20 min)
On the client page, record `document.visibilityState`, rAF count, a `setInterval` count, worker ticks and
BroadcastChannel arrivals over 5 s for each: CDP `Page.setWebLifecycleState` `frozen` then `active` (also after the host
page `bringToFront`); CDP `Emulation.setFocusEmulationEnabled false` + host `bringToFront` (and a host page opened by
`Target.createTarget` `newWindow`); the e2e-offline fallback (scripts/e2e-offline.mjs:108-121). Run each both ways:
with and without the three background flags (e2e-lib.mjs:21). With `hideAutomation`, also check whether the bgTick
worker alone drives the hidden host with the pump paused (bgTicks.ts:11 yields to `stepHeadless`). Pick: B1 = the most
real "hidden" (visibility hidden, rAF stopped, timers alive); B2 = `frozen`. Record in STATE and testing-tools.md.

## Machines
- Desktop dev lane (orchestrator OK ~22:20): heavy2.lock per run, CPU < ~60% at start, 1 pair, E2E_GPU=1, port 4189, BelowNormal; development only, verdicts via the laptop queue.
- Laptop requests (`node scripts/laptop-queue/request.mjs --sha <sha> --requester "Night Shift | Player Build"`):
  run 1a and 1b (after group 2, same sha): `--set coop-real-1 --suites "e2e-coop-real e2e-coop e2e-netmove"` (e2e-lib and
  localTransport changed); netsim from the runner's per-suite env (`--env` is for alone runs, request.mjs:56-59). Run 2
  (after F slices, `src/net` tier): `--set coop-real-2 --suites "e2e-coop-real e2e-coop e2e-netmove e2e-ctcourse:1
  e2e-course"`. Every e2e `E2E_GPU=1` (CLAUDE.md:66-68); slot and jobs are the queue's (pr kind).

## Wall time
Per part ~110-120 s (pair boot 20-25, restarts 8-10 each, reloads ~20 + up to 30 s placement). Part 3 over 120 s: B4
moves to a part 4 (lead registers it as H2b). Reset e2e-times.json from run 1. Job: group 1 ~2 h, group 2 ~2 h, K1 +
runs 1a / 1b ~1 h, fixes ~2 h, K2 + run 2 ~45 min: ~8 h.
