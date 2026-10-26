# Part D: hearing, radio, response and alarms, co-op AI, open PRs, Tallow Wharf AI

Base: origin/master 829a9332 (4.102.0). "ME" = read on origin/feature/mission-engine (00b6cde9), "MF" = origin/feature/mission-framework,
"C4" = origin/feature/coop4 (#317 head 24ba2e51), "CR" = origin/feature/coop-real (#388 head 80b9a0ad). Plan only.

### Gaps
| ID | Item | Rule (doc + section / G) | Current state (file:line) | Gap | Size | Needs Michael? |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Guard shots and bites allocate (hard rule) | CLAUDE.md "Hot paths allocate nothing (no closures, iterators or temporary vectors in AI ... loops)"; `docs/systems/conventions.md:31-34` | Per shot: `src/ai/enemy.ts:3721-3722` two `new Vector3()`, `:3724` `subtract().normalize()`, `:3733` `origin.add(dir.scale(..))`, `:3740` `for (const p of this.ctx.players())`; per bite `:3178-3187` `clone()` x2 + `subtract().normalize()` in a fresh damage object | Every armed guard in a fight allocates 4-6 vectors and an iterator per round (several rounds a second per guard). Reuse scratch vectors and an index loop | S | No |
| D2 | Manager tick closures and temp arrays (hard rule) | as D1 | `src/ai/enemyManager.ts:3499` `players().some((p) => ..)` every 0.5 s (`:3565-3571`, live modes whenever no group is engaged); `:3533-3536` `filter` + 2 `map` arrays every 0.5 s (non-stealth: parked modes and Free Roam only); `:695` `for (const o of this.enemies)` in the `searchSlot` callback, called per search ring point (`src/ai/enemy.ts:2793`) | Closure, iterator and array allocation on the manager's update path. Index loops and a reused goals buffer | S | No |
| D3 | #317 coop4 ships live, not dark (hard rule, open PR) | CLAUDE.md "Unfinished work ships dark behind its flag"; G355 ("signed-off builds ... resume dark behind flags; the walk cap limits switch-on only"); G308 ("after the redesigned map is completed") | C4 `src/net/protocol.ts:42-44` `capacity('sector')` = `SECTOR_MAX` 4 unconditionally; the only new flag is dev / test `players` (C4 `src/core/flags.ts:51-52,131`, `?players=2..4`, default undefined); co-op is reached only through `flags.coop` (default on, `src/core/flags.ts:102`) | Merging #317 switches 4-player Sector Ops on for everyone. Add a `coop4` flag (default off) that keeps `capacity('sector')` at 2; Michael switches it on | S | Yes: When does 4-player Sector Ops switch on? Options: (1) Merge dark behind a flag, switch on after the campus walk (Recommended) (2) Merge live now, treating the redesign as complete |
| D4 | Campaign room takes 4 once #317 lands | G2 ("exactly two players"); VISION 2 Players row; VISION 4 rule 7; bible 5.9 C1 | Tallow Wharf runs in sector mode (ME `src/world/maps/index.ts:17`, `?mode=sector&mission=<id>`); C4 `capacity('sector')` 4 (C4 `protocol.ts:44`); the mission's `players: [2]` is a data check only (ME `src/game/mission/missionDef.ts:185`); the runner takes any count (ME `src/game/mission/sectorMission.ts:323-325`) | With both branches on master a campaign mission admits 1, 3 or 4 players (and the AI's 3-4 player rules, `src/ai/intruders.ts:20-22`, would run in the campaign). The room cap must come from the mission (`players`), not the net mode | M | No |
| D5 | A guard raises at most one alarm per section load | bible 5.7 "Mission alarm level 0-3. Each raised alarm adds one level"; G125 ("Alarms raise a shared alert tier that escalates") | `alarmRaised` set once (`src/ai/enemyManager.ts:809-811`), blocks panels (`:1523`), the radio command (`:831`, `:2550`) and the caller pick (`:2514`); cleared only by `resetAlarm` on a Sector Ops section load (`src/game/modes/sectorMode.ts:689`) or a full restart (`resetMemory`, `courseMode.ts:921`, `sectorMode.ts:1178`) | After the first guard alarm in a section no guard can raise the next level (only cameras can, `sectorMode.ts:921-928`); in Marlow Yard a radio alarm in one set blocks guard alarms in every later set until a restart. Allow a new alarm once the last one's response is in (up to level 3) | M | No |
| D6 | Per-area alarm response for the mission prototypes | G291 (strict rules per team / split); MF `docs/missions/prototypes/split-shift/BEAT.md:61-68`, `code-relay/BEAT.md:67-73` (per-area stages: one area's stage brings its own lights, reinforcement and walks) | One stage and one alarm for all guards: `src/ai/enemyManager.ts:1022-1028` (`setAlarmStage`), `:249` (`alarmRaised`), one radio net `:364` ticked with no section lane `:2511`; ME tracks two area stages (`sectorMission.ts:546-550`) but nothing reaches `src/ai` | Split Shift and Code Relay need gear, response and radio per area. Add an area id to the stage, alarm and response calls (owner Guard AI, with Campaign Build's EN2) | M | No |
| D7 | `em.missionOrder` walk-to hook missing | MF `docs/missions/prototypes/split-shift/BEAT.md:95,145` (#7 walks to the plant room), `code-relay/BEAT.md:105` (#20 walks to the cage); ME `docs/missions/STATE.md:43` (agreed `em.missionOrder(guardTag, 'reset' \| 'walk', postId)` after sign-off) | ME raises `missionEvent` (`src/game/gameEvents.ts:13`, `sectorMission.ts:157,661`); no listener and no `missionOrder` in `src/ai` on master or ME (grep empty). The building blocks exist: `Enemy.sendTo` `src/ai/enemy.ts:1260`, `Enemy.resetBreaker` `:1407`, `despawn` / `spawn` / `placeSlot` (`enemyManager.ts:1809,1971,2002`; the spook bolt uses them, ME `sectorMission.ts:643-658`). STATE.md:43 cites stale lines (enemy.ts:1285 / :1138) | The prototypes' twist walks cannot run. Build `missionOrder` (tag lookup, post / via resolution, a restart re-raise) when Michael signs the prototypes off | M | No |
| D8 | Ambient masking exists in code only | G299 ("depending on whether they are near something noisey"); bible P2 ("Loud places (machinery, rain) let you move faster"); bible 5.2 S2 (`MapLayout.noiseZones`, a zone "can be tied to a switch") | Masking is built (`src/ai/hearing.ts:67-86`, `enemyManager.ts:2728-2745`) and read from `MapLayout.guardAi.noisy` / `SectorDef.noisy` (`enemyManager.ts:557-560`, `sectorMode.ts:693-697`), but no map defines either (grep of `src/world/maps` and ME Tallow Wharf: no `noisy`, no `guardAi`); `NoisySource` has no switch link (`hearing.ts:38-52`); the bible's field name `noiseZones` does not exist in code | No live map has a loud place, so G299's masking never happens. Add noisy sources per map (campus plant, Marlow substation and pump house, wharf cranes), a switch / light-group link, and rename the bible field | M | No |
| D9 | Sound meter has no ambient marker | bible 5.2 S4 ("a marker for the local ambient level; above the marker means guards can hear"); bible P2 test; G61 ("the sound meter shows what guards hear") | Fixed bars from the step radius alone: `src/game/gameState.ts:3460` (0 / under 3 m / under 8 m / more), drawn by `src/ui/hud/hud.ts:336-349`; nothing reads `ambientDb` at the player | The meter cannot show what guards hear once D8 adds masking. Owner: HUD (to assign), reading `hearing.ts` `ambientDb` at the player | M | No |
| D10 | Per-player last known position: built, still "open" in the bible | bible 5.9 C5 "Whether the LKP becomes per player is open (Section 11)" (`docs/design-bible.md:680`), Section 11 (`:1199`); G139 | Built per player since guard-ai S24: `src/ai/intruders.ts:1-18` (`INTRUDERS.split` true), up to 4 (coop4 AI1-AI5 on master, #319 merged) | Doc-vs-code conflict: an open decision the code already took (as an assumption) | S | Yes: Should guards keep one last known position per player? Options: (1) Yes, per player, as built (Recommended) (2) No, one shared position (`INTRUDERS.split` false) |
| D11 | `docs/systems/ai.md` stale for modes and alarms | CLAUDE.md authority (systems docs follow code) | `docs/systems/ai.md:276` "stealth (on in Hunter, Mission and Infiltration; off in Free Roam)" misses course and sector (`courseMode.ts:68`, `sectorMode.ts:315`); `:727` `ModeId` and `:735` autostart list miss `sector` (`src/game/modes/gameMode.ts:11`); `:353-355` alarms omit the once-per-section-load rule (`enemyManager.ts:807-811`); no line says a downed player is not perceived (`enemy.ts:2394-2396`) | Stale or missing text | S | No |

### #317 coop4 readiness
- State: OPEN, draft, label `big-pr`, head 24ba2e51, GitHub `mergeable` CONFLICTING; 73 commits ahead, 595 behind the review base 829a9332 (merge base
  d91d0e00, 4.95.0). Statuses on the head: only `laptop-e2e/coop4-fix7` success ("desktop: 1/1 pass, 388 s"). The full regular set
  (14/14) and the alone set are recorded on the older head 3f1c946f (C4 `docs/coop4/STATE.md` "Now"), before the 4.95.0 master merge
  1b04e5bd and the AI6 e2e fixes.
- G308: Marlow Yard stays 2 (`capacity('course')` = `COURSE_MAX` 2, C4 `protocol.ts:40,44`); Sector Ops 4 (`:42,44`); legacy modes
  `COOP_MAX` 4. Campaign: see D4 (campaign missions run in sector mode, so they would take 4).
- Flag: none gates it (D3). New flag `players` (C4 `src/core/flags.ts:51-52,131`): dev / tests only, `?players=2..4`, default
  undefined, owner coop4 lead (Sector Ops Build). The AI side (#319, merged 2026-10-24) gates itself by player count: 1-2 players run the
  old rules (`src/ai/intruders.ts:20-22` `COOP4.from` 3).
- src/net rule: holds. No static import of `src/net` outside `src/net` on C4 or master (git grep, value imports); co-op is reached by
  `import('./net/coopUi')` behind `flags.coop` (`src/main.ts:326-327`). `src/ai` imports nothing from `src/net` (master, C4, ME).
  C4 adds `src/net/protocol.ts` -> `../game/playerSlots` (net importing game: allowed). #317 changes no file in `src/ai`.
- `src/net/protocol.ts` vs master (read-only trial merge, `git merge-tree`): 1 conflict hunk, `PROTOCOL_VERSION` (master 59, C4 54)
  and the room-cap comment (C4 `protocol.ts:22-23`): keep 59 (the train bumps once), take C4's comment. Master's `EnemyState.in` /
  `markIntel` merge cleanly; C4's `snapEnemyState` does not round `in` (fine: it is 1 or absent). Other conflicts vs master:
  `src/net/coopHost.ts` 2 hunks, `docs/systems/coop.md` 3, `docs/systems/testing-tools.md` 1.
- `src/net/protocol.ts` vs #388 coop-real: none. CR does not touch protocol.ts (CR changes `src/net/localTransport.ts` only in src).
  #317 vs #388 overlap: `scripts/run-e2e.mjs` 1 hunk, `docs/systems/testing-tools.md` 1 hunk; `src/game/modes/sectorMode.ts` changed
  in both but merges cleanly. #388 is draft (STATE: triage 2 running).
- Verdict: not ready for row 6 release - blocked by D3 (no dark flag: merging switches 4-player Sector Ops on) and D4 (campaign room
  cap); then a train-side conflict resolution (4 files above) and a full laptop set on the resolved head before the two Opus checkers.

### Conforms
- Hearing from the noise model only (G299; CLAUDE.md gameplay reads only the noise model): `src/game/gameState.ts:2078-2079` (step radius -> `enemyMgr.hear`), audio is cosmetic `src/audio/foley/steps.ts:11`, walls by collision ray `src/ai/enemyManager.ts:2738-2741`
- Guards hear only within range, walls and masking per listener (G299): `src/ai/hearing.ts:83-95`, `src/ai/enemyManager.ts:2844-2848`
- Voice first, then the own section staggered, never all at once (G300): `src/ai/enemyManager.ts:2448-2461`, `src/ai/radioNet.ts:315-339`, `:93-97`
- Killing the caller first stops the call and the alarm (G300): `src/ai/radioNet.ts:221-231`, `src/ai/alarm.ts:106-126`
- Reinforcements only after a raised alarm (panel or radio command) and aggressive (G299, G300): `src/ai/enemyManager.ts:809-823`, `:897-930`
- KO caution timed, then normal (G300): `src/ai/awareness.ts:37-41`
- Death caution clears only when every aware guard is eliminated (G299): `src/ai/awareness.ts:28`, `:197`
- Broken light: one or two investigate, then return (G299): `src/ai/incidents.ts:58-59`, `:68-75`
- High-security posts are distracted, not sent (G299): `src/ai/enemyManager.ts:2852`
- Cameras report downed guards to nearby guards (G300): `src/ai/enemyManager.ts:2662-2690`
- Lasers search the laser spot and room, urgency to alarms and bodies (G312): `src/ai/enemyManager.ts:996-1005`, `src/ai/response.ts:47-58`
- No AI countdown closes a route or forces a fail (VISION 4 rule 6, G334): no timer or fail in `src/ai` (the alarm is a state machine with no limit, `src/ai/alarm.ts:75-147`; teams stay, `src/ai/sweepTeam.ts:8-9`); stage lockdown doors are alarm-driven and checked against softlocks (`src/game/sectorStage.ts:110-111`, `:189`)
- "Alarm" is one rated state (G146): a guard alarm event (`src/game/stealthSystems.ts:546`) or a device stage rise (`src/game/modes/sectorMode.ts:927-928`, ME `sectorMission.ts:391-408`), read by No alarms (`src/game/rating/sectionRating.ts:84`)
- Ghost / detection (G290): a guard going to combat on a player (`src/game/gameState.ts:2095-2096`), rated Undetected (`src/game/rating/sectionRating.ts:82`)
- Downed players (G126, G349, G188): guards drop a downed player from perception and never finish him (`src/ai/enemy.ts:2394-2396`; downed = not alive, `src/net/coopHost.ts:1209`); he makes no step noise (`src/game/gameState.ts:2078`)
- Checkpoint restart is a full AI reset (G312, G188): `src/ai/enemyManager.ts:1876-1902` + `clear` `:3789-3862`, called by `src/game/modes/courseMode.ts:921` and `src/game/modes/sectorMode.ts:1178`
- No bot partner in the AI (G48): grep of `src/ai` and `src/game/modes` finds none
- Targeting per player (G139, bible 5.9 C5): `src/ai/targetPick.ts:63-86`, per-player `spotted` `src/ai/enemy.ts:123-125`
- Team doors as the AI sees them (G280): a locked shut door is a wall on the guards' grid, so guards never use a bolted team door (`src/ai/lockedDoors.ts:36-39`, `:64-74`)
- `src/ai` never imports `src/net` (CLAUDE.md): grep empty; `src/ai/targetPick.ts:11`
- No `Math.hypot` in `src/ai`: grep empty
- Hearing and radio hot paths allocate nothing: `src/ai/hearing.ts:16`, `src/ai/enemyManager.ts:2360-2367`, `src/ai/radioNet.ts:41`
- Barks shown as text (bible 5.7): `src/ai/barks.ts:1-4`
- Response teams stay and search; missed check-ins raise alert (bible 5.7, G307): `src/ai/sweepTeam.ts:1-9`, `src/ai/sectionAlert.ts:5-12`

### Notes
- Alarm-stage source for part B: `src/ai/enemyManager.ts:1016-1035` (`setAlarmStage` / `giveStageGear`), called only by Sector Ops (`src/game/modes/sectorMode.ts:700` load, `:941` rise); Marlow Yard stays stage 0. Tallow Wharf (sector mode) gets stages.
- Tallow Wharf dogs (ME `tallowWharfSectors.ts:148,168`, `dogs: 1` `:366,390`) and shield-led responses are part B's B1 and B7; `src/game/sectors.ts:131-133` itself says dogs are Sector Ops only.
- Tallow Wharf in sector mode also gets Sector Ops' downed rule (syringes, G188) instead of the campaign's 30 s / twice (G126): Campaign Build.
- ME `sectorMission.ts:150` `fail` ("one chance: the op ends") vs section restart (G290, G353): Campaign Build, ROADMAP row 8 (A12 re-plan).
- Code Relay's stage 2-3 door locks are alarm-driven, not countdowns (G334 holds); the softlock check must cover them (Sector Ops).
- Parked modes keep `Math.random` in alert timing (`src/ai/enemyManager.ts:650,662`): Hunter / Mission only, not live.
- Not verified: e2e results beyond the GitHub statuses; whether C4's commits after 3f1c946f change runtime src (the log names e2e and test fixes plus the 4.95.0 merge).
