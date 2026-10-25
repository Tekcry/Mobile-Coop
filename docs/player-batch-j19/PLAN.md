# player-batch-j19: plan
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/player-batch-j19/BRIEF.md`.
Rows: `docs/conformance-player/CONFORMANCE.md` 1b (its line numbers re-found on 2148ec969 below).

## Claims
```claims
files:
  - src/game/gameState.ts
  - src/game/takedown.ts
  - src/game/takedownController.ts
  - src/game/contextMenu.ts
  - src/game/elbowStrike.ts
  - src/anim/strikeBody.ts
  - src/game/strikeController.ts
  - src/game/committedMoves.ts
  - src/game/playerTarget.ts
  - src/game/health.ts
  - src/game/bodyCarry.ts
  - src/game/stealthSystems.ts
  - src/net/protocol.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/remotePlayer.ts
  - src/net/session.ts
  - src/net/coopUi.ts
  - src/net/clientCarry.ts
  - src/net/validate.ts
  - src/core/rejoin.ts
  - src/core/flags.ts
  - src/core/settings.ts
  - src/config/enemies.json
  - src/config/movement.ts
  - src/config/camera.ts
  - src/cosmetics/avatarLook.ts
  - src/cosmetics/catalog.ts
  - src/progression/suit.ts
  - src/player/characterRig.ts
  - src/player/traversal.ts
  - src/player/attach.ts
  - src/player/attachController.ts
  - src/player/wallController.ts
  - src/player/shoulderCamera.ts
  - src/world/camSpaces.ts
  - src/input/actions.ts
  - src/input/gamepadSource.ts
  - src/input/keyBindings.ts
  - src/audio/gameAudio.ts
  - src/anim/mocap.ts
  - src/anim/animGraph.ts
  - src/anim/audit/limits.ts
  - src/anim/clips/mocap/sprint.ts
  - src/anim/cqGait.ts
  - scripts/anim-audit.mjs
  - scripts/anim-natural/audit.mjs
  - scripts/look-video.mjs
  - scripts/e2e-takedown.mjs
  - scripts/e2e-coop.mjs
  - tests/takedown.test.ts
  - tests/hangDownTakedown.test.ts
  - tests/contextMenu.test.ts
  - tests/elbowStrike.test.ts
  - tests/strikePops.test.ts
  - tests/animN4cStrike.test.ts
  - tests/animN4dKill.test.ts
  - tests/committedMoves.test.ts
  - tests/protocolConst.test.ts
  - tests/coopRejoin.test.ts
  - tests/revive35.test.ts
  - tests/friendlyFire.test.ts
  - tests/carry.test.ts
  - tests/carryState.test.ts
  - tests/coopCarry.test.ts
  - tests/enemyArms.test.ts
  - tests/economy.test.ts
  - tests/wallController.test.ts
  - tests/cameraRigid.test.ts
  - tests/camSpaces.test.ts
  - tests/traverse*.test.ts
  - tests/animAudit.test.ts
  - tests/animFixPass.test.ts
  - tests/mocapRunPose.test.ts
  - tests/mocapSprint.test.ts
  - tests/mocapGuards.test.ts
  - tests/helpers/afpMeasure.ts
  - docs/player-batch-j19/**
maps: none
protocol: cmove, revive (event), lobby, start, use (new item id put-body)
save: none (settings.gameplay.sprintHold dropped, an old stored value ignored; a stored avatar helmet "trilens" read as "headset")
```

## How it works today (origin/master 2148ec969)
| Row | Today |
| --- | --- |
| R6 | The menu's takedown row always starts a knockout (`gameState.ts:1438`, `ctxRun` `td.start(false)` `:1502`). The palm strike (RT) needs ground, holstered, not attached (`strikeController.ts:68-83`; `gameState.ts:2046` `!this.team.hangingDown`). Only the hang-down has an RT tap / hold takedown (`gameState.ts:2015-2020`); RT's tap / hold classifier only runs holstered or hanging (`gameState.ts:1853-1857`). `TakedownController.start(lethal?)` already takes the kill (`takedownController.ts:217`). |
| R7 | Approach + strike: front / side / corner 0.22 + 0.7 = 0.92 s (`takedown.ts:33-34`, `:226-228`), over cover 1.12 (`:259`), inverted 0 + 0.9 (`:276-278`), below 0.9 (`:304-306`), window 0.95 (`:333-335`), above / drop 0.56 strike after the fall / 0.5 s (`:356-358`, `:371-373`), assist 0.7 (`:202`), hang-down quick 0.6 (`:72`, `:291`). Gloves divide time by 0.92-0.78 (`suit.ts:70`; `takedownController.ts:376`, `:426`, `:529`, `:565`, `:626`; set at `gameState.ts:636`). `MIN_DURATION.takedown` 1.0 (`limits.ts:106`) is read by nothing. |
| R8 | `STRIKE.recover` 0.6 (`elbowStrike.ts:16`), `STRIKE_DUR` = 0.68 s (`:35`). The pose runs on phase over `STRIKE_DUR` (`strikeBody.ts:42-49`). The host times a client's strike from the same constants (`coopHost.ts:1234`, `:1244`). |
| R9 | `cmove` is `{kind, id, target}` (`protocol.ts:317`, parse `:907-912`); `commitRequest` (`coopClient.ts:320-321`); the host records `{id, target, t0, hp0, hit}` (`coopHost.ts:1164`, `:1226`) and calls `applyHit` (`:1247`), which kills only for `this.lethal && by === 'local'` (`strikeController.ts:240`). |
| R10 | Carry caps speed at `BODY.carrySpeed` (`bodyCarry.ts:323`), under the silent band (`NOISE_QUIET.stand` 1.65, `config/movement.ts:273-276`; `noiseRadius`, `player/movement.ts:148-153`); step noise `gameState.ts:2078` has no carry term; the own-steps sound `gameAudio.ts:159`; the host's estimate of a client's steps `net/validate.ts:180-193`. Pick-up stands once (`bodyCarry.ts:125-127`); a crouch pressed while carrying stays. |
| R11 | One row, "Drop body" (`stealthSystems.ts:181`; client `clientCarry.ts:48`, sent as `use` `drop-body`, `protocol.ts:229`, host `coopHost.ts:769`): 0.8 s, 3 m noise (`bodyCarry.ts:16`, `:176-200`); the instant drop also 3 m (`:157-174`). |
| R13 | Behind a guard the list is GRAB CHARACTER, then the faced door's rows, the optic gap and the item in reach (`gameState.ts:1431-1459`). |
| R14 | `TD_LABEL` (`gameState.ts:315-330`): Takedown / Drop attack / Pull over ledge / Pull through window / Choke; head prompt `:3452`; e2e asserts "Takedown" (`scripts/e2e-takedown.mjs:167`). |
| R16 | Runner `"weapon": null`, melee only (`src/config/enemies.json:48-65`); placed `src/world/maps/warehouse.ts:96`, spawned by the default mission mode (`src/game/modes/missionMode.ts:47`, `:108`); only Sector Ops checks arms (`sectors.ts:578-594`). |
| R17 | `defaultLook().helmet = 'trilens'` (`avatarLook.ts:69`); catalog "Tri-lens goggles" (`catalog.ts:65`); rig case `characterRig.ts:1572`, `:1629`; `suit.ts:95`; `tests/economy.test.ts:68`; remap table `avatarLook.ts:11-17`. |
| R18 | Running over 3.5 m/s at a gap hops 1.4-3.2 m (`traversal.ts:218-227`). |
| R19 | `LADDER_SPRINT_RATE` / `PIPE_SPRINT` (`attach.ts:61`, `:66`; `attachController.ts:25`, `:685`), `RAPPEL.descendSprint` (`config/movement.ts:375`; `attachController.ts:775`), fed by `inp.down('dash')` (`gameState.ts:1908`); `dash` also leaves the wall / peek (`:2843`, `:2941`); nothing binds `dash` (`input/actions.ts:33`, `gamepadSource.ts:145`). `gameplay.sprintHold` is read by nothing (`core/settings.ts:98`, `:372`). Anim: mocap sprint clip (`mocap.ts:33`, `:181`; `animGraph.ts:2335-2340`, `KEYED_GAITS.sprintFrom` 5.0 `:2966`), audit sprint band (`limits.ts:121`, `:124-127`). |
| R21 | `slideCrouch` 0.55 m/s, `slideStand` 0.39 (`wallController.ts:48-49`); tests `wallController.test.ts:149-157`, `:389`, `:407`. |
| R22 | Boom 1.8 tight / 2.8 open on a spring (`config/camera.ts:13-30`); doorway push-in to 0.8 m (`camera.ts:95-102`, `shoulderCamera.ts:80-81`, `:404-407`), set each step from `doorPassing` (`gameState.ts:1996`; `world/camSpaces.ts:59`); tests `cameraRigid.test.ts`, `camSpaces.test.ts`. |
| R23 | Toggles: crouch, wall, grab, held interactions (`settings.ts:98`, `:118`, `:161-162`). `access.holdToggle` works on the team-move path only since G5 (`gameState.ts:1320`, `:1361`): the context menu's hold rows (hacks, medkits, revives, `gameState.ts:1478-1486`, `contextMenu.ts:73`, `:127`, `:152`) ignore it although Settings says it covers "Downloads, panels and revives" (`settingsScreen.ts:193`). The pistol jammer is a plain hold of RB while aiming (`gameState.ts:2006`). |
| R25 | The AF2 run carriage eases in from 2.0 to 3.0 m/s, chest pitch 0.26 rad (`mocap.ts:121`; read `characterRig.ts:3064`, `:3287`); `POSTURE.runLean` 0.37 eases from 1.6 to 3.0 m/s (`animGraph.ts:3104`, used `:1385`). |
| R26 / R27 | AF targets from CT footage (`docs/anim-fix-pass/BRIEF.md:27-28`, `PLAN.md:88`; `mocap.ts:113-114`; `animGraph.ts:3021` crouch pose); `MOCAP_LAYERS` corrections `pelHeight` / `trunkMean` / `bankWipe` / `armSmooth` = 0 (`mocap.ts:82-101`). No change here before the walk (Q37). |
| R28 | No Settings row (`settingsScreen.ts:158-159`); a stored `mocapLoco: false` is ignored; `?mocap=0` and the tuner box (`app.ts:135-147`). Q38: stays so. |
| R29 | AF6 fields `t`, `gph`, `qs`, `hs`, `mo`, `mt`, `ax`, `az` (`protocol.ts:80-95`). Q39: stay. |
| R30 | `turn180` 0.25, `raise` 0.2 (`limits.ts:98`, `:102`), audited at `scripts/anim-audit.mjs:1150`, `:1154`; bible 5.12.2 item 6: 0.4 s, 0.75 / 1.1 s. |
| R31 | ROADMAP "Waiting on Michael": "Walk AF0-AF6" since 2026-10-23 ~20:45, no video. No look-video script on master (`scripts/` has shots only: `shot.mjs`, `shots-ctcourse.mjs`). |
| R33 | `PlayerTarget.revive()` -> `health.reset()` = max (`playerTarget.ts:90-93`, `health.ts:30-31`); host `reviveOne` (`coopHost.ts:621-638`), remote `remotePlayer.ts:262-263`; the `revive` event (`protocol.ts:255`, `:522-527`) is also the restart's (`coopHost.ts:1915-1919`); client `coopClient.ts:909-919`. |
| R38 | `this.ff = mode === 'course'` (`coopHost.ts:168`, `:202-203`, used `:268`, `:384`, `:706`); the client's partner targets in course only (`coopClient.ts:377-384`); `lobby` / `start` carry no ff (`protocol.ts:283`, `:285`, `:820`); lobby rows `coopUi.ts:518-526`; rejoin record `core/rejoin.ts:16`. |

## Design per row
- **R6** (A4): one RT block replaces the hang-down one at `gameState.ts:2015-2020`: with a takedown on offer whose kind is
  above / drop / below / window / inverted / hangDown, or a `lethalOnly` offer, not aiming, RT tap starts it as a
  knockout and RT hold (`STANCE.rtHold`) as a kill (`tdk.start(p === 'kill')`; KBM Z the knockout). The RT classifier's
  `free` (`:1853`) also holds while attached with such an offer (the gun is suspended there, G210). The palm strike stays
  off while attached. Co-op: `td` already carries `lethal` (`protocol.ts:302`): no wire change.
- **R7** (A3): `TAKEDOWN_MIN` 1.0 s in `takedown.ts`, read from `MIN_DURATION.takedown` (`limits.ts:106`, one owner).
  Each plan's `strike` is raised so `approach + strike >= TAKEDOWN_MIN`; the controller's glove factor becomes
  `max(handsMul, TAKEDOWN_MIN / total)` so gloves never take it under the floor. The poses run on the plan's phase, so
  they stretch; the Opus builder checks the strike beats (contact, choke hold) still land on the victim's reaction.
- **R8** (M1): `STRIKE.recover` 1.4 s (`STRIKE_DUR` 1.48). `strikeBody.ts` is re-timed in seconds, not phase: the wind-up
  and contact keep today's absolute times (contact at 0.08 s), the extra 0.8 s is the follow-through and a guarded
  settle back to rest (no frozen hold). The host follows `STRIKE_DUR` by itself.
- **R9**: `cmove` gains optional `l: 1` (strike only, parsed as a boolean); `commitRequest(kind, id, target, lethal)`;
  the host keeps it in its strike record and `applyHit(..., lethal)` takes it as a parameter (the host's own strike
  passes `this.lethal`). A client's RT hold then kills on the host as solo does.
- **R10** (A5): `CARRY_STEP_NOISE` 2.5 m in `bodyCarry.ts`; the carry exposes `stepNoise` (0 when not carrying) and the
  step noise at `gameState.ts:2078` becomes `max(noiseRadius(...), carrier.stepNoise)` when moving; the same term in
  `gameAudio.ts:159` (own steps) and `net/validate.ts` (the host's estimate for a carrying client). Carrying, a crouch
  press is swallowed and the controller held standing (bible 5.3 "standing").
- **R11** (A6, dark): `BodyCarry.beginPutDown()`: about 1.6 s committed, kneel and lay the body along the side with the
  hands on it to the ground, no `noise` call. A "Put down" row above "Drop body" when `flags.putDown`; the client sends
  `use` with a new id `put-body` (`protocol.ts` beside `DROP_BODY_ID`), the host's `onUse` lays it down quietly.
- **R13** (A2): with a `behind` offer `contextMenuStep` adds only GRAB CHARACTER (and the joint BLUFF row for an assist,
  unchanged): no door, optic-gap or item rows; B / BACK TO GAME as today.
- **R14** (A1): `TD_LABEL` non-grab kinds read "Knock out" (assist "Team takedown"); the head prompt (`:3452`) uses the
  same words (Grab / Knock out; `lethalOnly` stays "Lethal takedown").
- **R16** (A7): the runner gets the grunt's weapon block; a unit test walks `ENEMIES` and fails on any human kind without
  a weapon, and on any map in `MAPS` or mode spawn list naming one.
- **R17** (A8): default `headset`; `LEGACY_LOOK_IDS.helmet.trilens = 'headset'`; drop the catalog row, the rig's
  `trilens` case and mask, and `suit.ts:95`'s exception; update `economy.test.ts:68`.
- **R18**: delete the hop trigger (`traversal.ts:218-227`); the `hop` kind stays for the wire and the anim (tests
  `moveState`, `foley`, `playerBodyHarness` keep it); `scripts/anim-natural/audit.mjs` drops its hop scene.
- **R19** (A9): delete the sprint rates, `RAPPEL.descendSprint`, `sprintHeld`, the `dash` reads, `gameplay.sprintHold`;
  anim side in S5 (the sprint clip, `sprintFrom`, the audit sprint band) only where no reader is left.
- **R21**: `slideCrouch` 0.35 (G35 starting value, G356); tests updated from the table.
- **R22** (M2): delete the doorway push-in (`doorPass*` in `camera.ts`, `shoulderCamera.ts`, the setter at
  `gameState.ts:1990-1996`, `doorPassing` if nothing else reads it) and its tests; the open-space pull-back stays.
- **R23** (M3, A10): (1) an inventory of every held input in `docs/player-batch-j19/HOLDS.md`: plain hold / tap-hold
  pair / aim, with its toggle; (2) the context menu's hold rows honour `access.holdToggle` (release on the row latches
  it, the next A press or leaving reach stops it) in `contextMenu.ts` + `gameState.ts:1478-1486`; (3) the pistol jammer
  latches on an RB tap while aiming when the toggle is on; (4) any other plain hold the inventory finds in the files S1
  owns is wired the same way; one found elsewhere goes on the polish list.
- **R25**: the run carriage and `POSTURE.runLean` ease in from 3.5 to 4.0 m/s (run 4.0 m/s, G217 "no lean until full
  speed"); re-measure with `tests/helpers/afpMeasure.ts` (jog trunk pitch within 1 deg of the walk; run unchanged).
- **R26 / R27** (M4): no value change. S5 adds a developer flag `?mocapraw=1` that applies the capture as recorded
  (`MOCAP_LAYERS` corrections and the AF3 crouch re-pose off) for the comparison video only; S8b writes the options.
- **R28 / R29** (M5, M6): recorded in this BRIEF for the J2 fold; no code.
- **R30** (A14): `turn180` 0.4; `raise` per weapon class 0.75 / 1.1 (from `drawState.ts`'s classes); the audit gains a
  takedown row (press to victim down >= `MIN_DURATION.takedown`).
- **R31**: `scripts/look-video.mjs` (S8a): headless Playwright `recordVideo` on a scripted route (`?autostart`), one
  scene list per video; the AF0-AF6 video and the option videos (S8b).
- **R33** (A11): `Health.reset(frac = 1)`, `PlayerTarget.revive(frac = 1)`, `RemotePlayer.revive(at, protect, frac = 1)`;
  `REVIVE_HEALTH` 0.35 beside the revive rules; `reviveOne` passes it for a partner revive; the `revive` event gains
  optional `hp` (0..1) for the revived client; restarts send no `hp` (full).
- **R38** (A12): a host lobby row "Friendly fire: On / Off" (default On); `session` keeps `ff`; `lobby` and `start`
  carry it; `CoopHost.ff` and the client's partner targets follow it in every mode; the rejoin record keeps it.

## Slices
Each slice is one PR to master. Parallel slices never share a file (the claims above split per slice). Waves: W1 runs at
once; W2 waits for S1 (`gameState.ts`); W3 waits for S6 (`gameState.ts`), S3 (`coopHost.ts`, `protocol.ts`) and S5
(`flags.ts`). Sizes are counted lines incl. tests (docs not counted).

**S1 Takedowns and the action menu (Opus). W1. R6, R7, R13, R14, R23.**
- Files: `src/game/gameState.ts`, `src/game/takedown.ts`, `src/game/takedownController.ts`, `src/game/contextMenu.ts`,
  `scripts/e2e-takedown.mjs`, `tests/takedown.test.ts`, `tests/hangDownTakedown.test.ts`, `tests/contextMenu.test.ts`,
  `docs/player-batch-j19/HOLDS.md`.
  Est. ~800 lines.
- Checks: tsc fast; vitest on the takedown and context-menu files (new: every kind's approach + strike >= 1.0 at the
  best glove tier, read from `limits.ts`; RT tap / hold on each attached kind; behind-offer rows; labels; hold-row
  latch); affected-e2e (`e2e-gadgets`, `e2e-tactics`, `e2e-takedown`, `e2e-park`) plus `e2e-coop` + `e2e-netmove`
  requested (`src/game`), `e2e-anim`; look video: one takedown of each kind, knockout and kill.
- Done looks like: from a pipe, ledge, window or a drop, RT hold kills and a tap knocks out; no takedown ends under 1 s
  with the best gloves; behind a guard the list is GRAB CHARACTER only; every other takedown row says Knock out;
  "Tap to start" fills a hack from the menu.
- Flag: none (rule fixes, ship on).

**S2 Palm strike recovery (Opus). W1. R8.**
- Files: `src/game/elbowStrike.ts`, `src/anim/strikeBody.ts`, `tests/elbowStrike.test.ts`, `tests/strikePops.test.ts`,
  `tests/animN4cStrike.test.ts`, `tests/animN4dKill.test.ts`. Est. ~350.
- Checks: vitest on those; affected-e2e (GAME + `e2e-anim`, `e2e-clip`, `e2e-move`), `anim-audit`; `e2e-coop` +
  `e2e-netmove` requested; look video: strikes from four sides, a whiff.
- Done looks like: contact as quick as today, free 1.4 s after it, the arm settles with no pop or freeze.
- Flag: none (Q34, ships on).

**S3 Co-op rules on the wire (Opus; two Opus checkers). W1. R9, R33, R38.**
- Files: `src/game/strikeController.ts`, `src/game/committedMoves.ts`, `src/game/playerTarget.ts`, `src/game/health.ts`,
  `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/remotePlayer.ts`, `src/net/session.ts`,
  `src/net/coopUi.ts`, `src/core/rejoin.ts`, `scripts/e2e-coop.mjs`, `tests/committedMoves.test.ts`,
  `tests/protocolConst.test.ts`, `tests/coopRejoin.test.ts`, `tests/revive35.test.ts` (new), `tests/friendlyFire.test.ts`
  (new). Est. ~900.
- Checks: vitest (parse of `cmove l`, `revive hp`, `lobby` / `start` `ff`; host applies a client's lethal strike; revive
  to 35% vs restart full); the co-op group (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops`, `anim-audit`,
  `e2e-park`) + GAME; an `e2e-coop` case: client RT hold kills, ff Off stops partner damage, revive lands at 35%.
- Done looks like: a client's held strike kills; a revived partner has 35%; the host's lobby shows Friendly fire, On,
  and Off works in Sector Ops and Marlow Yard.
- Flag: none (rule fixes G210 parity, bible C6, G141).

**S4 Guard arms and goggle default (Sonnet). W1. R16, R17.**
- Files: `src/config/enemies.json`, `src/cosmetics/avatarLook.ts`, `src/cosmetics/catalog.ts`,
  `src/player/characterRig.ts` (the tri-lens case only), `src/progression/suit.ts`, `tests/economy.test.ts`,
  `tests/enemyArms.test.ts`. Est. ~200.
- Checks: vitest on both; affected-e2e (CORE, `e2e-park`, `e2e-cosmetics`, `e2e-progression`, `e2e-move`, `e2e-anim`,
  `e2e-stealth`, `e2e-clip`); `e2e-coop` + `e2e-netmove` requested (`src/player`).
- Done looks like: no guard kind without a gun; no tri-lens anywhere in the look menu or on a default operator.
- Flag: none (G298, G69 / G195).

**S5 Forward lean, sprint anim paths, audit limits, compare flag (Opus). W1. R25, R19 (anim), R30, R27 flag.**
- Files: `src/anim/mocap.ts`, `src/anim/animGraph.ts`, `src/anim/audit/limits.ts`, `src/anim/clips/mocap/sprint.ts`,
  `scripts/anim-audit.mjs`, `src/core/flags.ts`, `tests/animAudit.test.ts`, `tests/animFixPass.test.ts`,
  `tests/mocapRunPose.test.ts`, `tests/mocapSprint.test.ts`, `tests/mocapGuards.test.ts`, `tests/helpers/afpMeasure.ts`. No `characterRig.ts` edit (S4 owns it in W1). Est. ~600 (a deleted clip is data).
- Checks: vitest; affected-e2e (`e2e-anim`, `e2e-clip`, `e2e-move`, `anim-audit`, `e2e-park` + CORE for flags);
  `e2e-coop` + `e2e-netmove` requested; `e2e-studio` if a tuner reader of the sprint slot is touched; look video: walk,
  jog, run side views at each gear, before / after.
- Done looks like: no forward lean below 3.5 m/s, the run lean as today; the audit holds 0.4 s turns, 0.75 / 1.1 s draws
  and a takedown row; `?mocapraw=1` shows the capture as recorded; no sprint code a live path never reaches.
- Flag: `mocapRaw` (dev only, below).

**S6 Hop, sprint paths, wall slide, camera push-in (Sonnet from a strict Opus brief). W2 (after S1). R18, R19
(gameplay), R21, R22.**
- Files: `src/player/traversal.ts`, `src/player/attach.ts`, `src/player/attachController.ts`, `src/config/movement.ts`,
  `src/player/wallController.ts`, `src/config/camera.ts`, `src/player/shoulderCamera.ts`, `src/world/camSpaces.ts`,
  `src/game/gameState.ts`, `src/input/actions.ts`, `src/input/gamepadSource.ts`, `src/input/keyBindings.ts`,
  `src/core/settings.ts`, `scripts/anim-natural/audit.mjs`, `tests/wallController.test.ts`, `tests/cameraRigid.test.ts`,
  `tests/camSpaces.test.ts`, `tests/traverse*.test.ts`. Est. ~500 (mostly deletions).
- Checks: vitest; affected-e2e (`e2e-move`, `e2e-anim`, `e2e-stealth`, `e2e-clip`, `e2e-traverse`, `e2e-wall`,
  `e2e-pad`, `e2e-mouse`, `e2e-menus`, `e2e-desktop`, `e2e-lightbake`, `e2e-guard-carry`, `e2e-levels`, `e2e-anchors`,
  `e2e-ctcourse`, GAME, CORE); `e2e-coop` + `e2e-netmove` requested.
- Done looks like: running at a gap drops or stops, never hops; crouched wall slide 0.35 m/s; walking through a doorway
  the camera holds its distance; open spaces still pull back.
- Flag: none (G31, G35, Q35).

**S7 Carry noise, standing carry, quiet put-down (Opus). W3 (after S6, S3, S5). R10, R11.**
- Files: `src/game/bodyCarry.ts`, `src/game/stealthSystems.ts`, `src/game/gameState.ts`, `src/net/clientCarry.ts`,
  `src/net/coopHost.ts`, `src/net/protocol.ts`, `src/net/validate.ts`, `src/audio/gameAudio.ts`, `src/core/flags.ts`,
  `src/anim/cqGait.ts` (only if the lay-down pose needs it), `tests/carry.test.ts`, `tests/carryState.test.ts`, `tests/coopCarry.test.ts`. Est. ~800.
- Checks: vitest (carry step noise > 0 while moving; crouch swallowed; put-down makes no noise, drop makes 3 m); the
  co-op group + GAME + `e2e-guard-carry`, `e2e-weapons-carry`, `e2e-foley`; look video: carry, drop, put down (`?putdown=1`).
- Done looks like: a guard hears a carrier's steps at 2.5 m; no crouch with a body up; with `?putdown=1` "Put down"
  lays the body quietly, host and client.
- Flag: R10 none (rule fix); R11 `putDown` (dark).

**S8a Look-video recorder (Sonnet). W1. R31 tool.**
- Files: `scripts/look-video.mjs`. Est. ~300. Checks: CI `check`; one smoke recording on the laptop GPU tier (or the
  desktop under `heavy.lock`). Nothing headed; output outside git, path in each PR body.
- Done looks like: `node scripts/look-video.mjs --scenes <list> --out <dir>` writes one 1-2 min `.webm` per list.

**S8b Walk pack: AF0-AF6 video and the R26 / R27 options (Opus). After S5, S8a. R31, R26, R27, R28, R29.**
- Files: `docs/player-batch-j19/AF-OPTIONS.md`, `docs/player-batch-j19/STATE.md`. Docs only; the PR body carries
  `Job-done: player-batch-j19` if it is the last.
- Content: the AF0-AF6 video (walk, jog, run, starts / stops, turns, crouch, wall, partner view, as live); the options
  video, live vs `?mocapraw=1` side by side; a table of each AF target taken from CT footage, the trained-operator value
  (G210, bible 5.12) where it differs and the proposed value; one native multiple choice for the walk card (keep the
  corrections / back to as captured / the proposed values). R28 / R29 lines for the J2 fold.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `putDown` (`?putdown=1`, `src/core/flags.ts`) | off | Night Shift \| Player Build | 2026-10-29 (next Player walk card) | S7 passed + Michael accepts the walk item; Player / animation under the cap |
| `mocapRaw` (`?mocapraw=1`) | off, dev only | Night Shift \| Player Build | never (comparison only) | removed after Michael's Q37 walk decision |

## Test plan
- Each slice: `npm run typecheck:fast` + its vitest files; CI `check` on the PR; `affected-e2e` from the laptop queue.
- `src/net` / wire slices (S3, S7): the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (+ `e2e-sectorops`,
  `anim-audit` from `DIRECT_COVERS`); two Opus checkers on S3.
- `src/game` / `src/player` slices (S1, S2, S4, S5, S6): the lead requests `e2e-coop` + `e2e-netmove`
  (`node scripts/laptop-queue/request.mjs ... --suites "e2e-coop e2e-netmove"`); the checker passes only when green.
- Before changing a value (takedown times, strike recovery, slide, labels, ff default) the builder greps `scripts/` and
  `tests/` and updates the assertions in the same PR, reading the number from the game's table.
- Look videos: S1, S2, S5, S7 PR bodies; S8b for the walk card. Recorded on the laptop look tier (4189) or the desktop
  under `heavy.lock`.

## Walk items
- Takedowns from a pipe, ledge, window and a drop: RT tap knocks out, RT hold kills, each about 1 s - accept when they
  read as quick, committed and not rushed.
- Palm strike: 1.4 s to free - accept when the recovery reads as a real follow-through, not a pause.
- AF0-AF6 pass (the waiting walk) and the mocap-correction options (Q37) - accept one option.
- Forward lean only at full run - accept when the jog stands as upright as the walk.
- `?putdown=1`: put a body down quietly vs drop it - accept to switch `putDown` on.
- Doorways: no camera push-in - accept when the camera holds its distance through a door.
- Co-op: a revived partner at 35%, Friendly fire Off in the lobby works.

## Risks and open questions
- Claims overlap (`claims-check`, 2026-10-25 ~18:20; the orchestrator orders them): `feature/player-hygiene` J6
  (`traversal.ts`, `characterRig.ts`, `gamepadSource.ts`, `takedown.ts`, `takedownController.ts`, `coopHost.ts`,
  `coopClient.ts`, `protocol.ts`, `mocap.ts`, `animFixPass.test.ts`); `feature/guard-rules` J15 (`takedownController.ts`,
  `coopHost.ts`, `flags.ts`, `e2e-takedown.mjs`; wire `td`, `bark`); `feature/coop-kit` J24 (`gameState.ts`,
  `config/movement.ts`, `flags.ts`, `protocol.ts`, `coopHost.ts`, `coopClient.ts`; wire `tmove`, `tstart`);
  `feature/map-ready` (`gameState.ts`, `gameAudio.ts`, `protocol.ts`, `session.ts`, `coopHost.ts`, `coopClient.ts`,
  `flags.ts`; wire `mr`, `go`). Not yet claimed: J3's map HUD removal and J7's revives also edit `gameState.ts` /
  `coopHost.ts`. The overlaps are shared big files, not shared lines, except J6's allocation rewrite of the takedown
  scan and the hop probe (`takedown.ts`, `traversal.ts:205-235`). Proposed: J6 lands first in those two files (hard-rule
  fixes); S1 and S6 cut from the master after it; every other overlap merges in train order with the later PR rebased.
- Takedown and strike timing changes stretch phase-driven poses: the Opus builders re-check the beats; look videos.
- New audit limits (R30) may fail a live move: reported with the value, polish list, limit kept (A14).
- Friendly fire On in Sector Ops with 4 players (Q16 live) can change `e2e-sectorops` co-op cases: covered in S3.
- R19's anim side: the tuner's move list reads the sprint slot (`animGraph.ts:2310`) and guards run on mocap clips
  (`tests/mocapGuards.test.ts`); the sprint clip stays if any reader, guards included, can still reach it (A9).
- R25 changes an AF2 value while Q37 waits: G217 is Michael's own rule, so it ships; the AF0-AF6 and option videos are
  recorded after S5 so the walk sees what is live.
