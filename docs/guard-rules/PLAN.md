# guard-rules: plan
Owner: Guard AI Build. Status: current.

Lead: Night Shift | Guard AI Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/guard-rules/BRIEF.md`.
Every file:line below is checked against master 2148ec969. Guard AI's J1 docs PR (`feature/guard-ai-docs-j1`) adds one
comment line at `src/game/sectors.ts:84`: after it lands, `sectors.ts` lines past 84 move down by 1.

## Claims
```claims
files:
  - src/ai/gear.ts
  - src/ai/archetypes.ts
  - src/ai/enemyManager.ts
  - src/ai/enemy.ts
  - src/ai/barks.ts
  - src/ai/alarm.ts
  - src/ai/pairs.ts
  - src/ai/posts.ts
  - src/ai/guardAiData.ts
  - src/core/flags.ts
  - src/game/sectors.ts
  - src/game/sectorStage.ts
  - src/game/modes/sectorMode.ts
  - src/game/modes/score.ts
  - src/game/takedownController.ts
  - src/net/coopHost.ts
  - src/world/maps/campusS4Data.ts
  - src/world/maps/campusS5Data.ts
  - tests/gear.test.ts
  - tests/difficulty.test.ts
  - tests/gearWiring.test.ts
  - tests/responseWiring.test.ts
  - tests/sectors.test.ts
  - tests/helmetRule.test.ts
  - tests/dogTakedown.test.ts
  - tests/killScore.test.ts
  - tests/campusGear.test.ts
  - tests/alarmRepeat.test.ts
  - tests/alarmCall.test.ts
  - tests/radioWiring.test.ts
  - tests/barkCause.test.ts
  - tests/combatHearing.test.ts
  - tests/coopGuardAi.test.ts
  - tests/pairs.test.ts
  - tests/pairsWiring.test.ts
  - tests/posts.test.ts
  - tests/postsWiring.test.ts
  - tests/campusPosts.test.ts
  - tests/lookout.test.ts
  - tests/dogRelease.test.ts
  - tests/sectorStageActions.test.ts
  - scripts/e2e-sectorops.mjs
  - scripts/e2e-enemies.mjs
  - scripts/e2e-takedown.mjs
  - scripts/e2e-stealth-ai.mjs
  - docs/systems/ai.md
  - docs/systems/takedowns.md
  - docs/systems/world-and-characters.md
  - docs/guard-models/SPEC.md
maps: campusOps
protocol: bark, td
save: none
```
- Wire paths (a change under `src/net` or to what a message means): S2 `src/net/coopHost.ts` (the host refuses a
  client's `td` start on a dog; no message shape change); S4 appends two events to `BARK_EVENTS` (`src/ai/barks.ts:118-126`,
  the `bark` event's `b` index). No other slice touches `src/net` or `src/net/protocol.ts`. Gear rides the existing `al`
  bits (`AL_HELMET`, `src/net/protocol.ts:151`); a locked helmet's bit never clears, so the client's deflect prediction
  (`src/net/puppetGear.ts:34`) is already right. Nobody bumps `PROTOCOL_VERSION`; the train does.
- Save paths: none (no IndexedDB shape, no `SAVE_VERSION`).
- Maps / data: `campusOps` S4 and S5 data only (S3, S9). warehouseOps is frozen (Q26): no data edit; it changes only
  through code defaults (no shield lead, A4).

## Slices
Sizes count code, tests and e2e scripts (docs not counted). Builders follow `docs/systems/agent-preamble.md`, run
`npm run typecheck:fast` and `npx vitest run <files>`, and grep `scripts/` and `tests/` for assertions on every default
they change. Hot paths stay allocation-free (`hyp2` / `hyp3`, scratch objects, no closures in step loops).
`docs/systems/ai.md` is edited by the one slice named per PR below; the other slices of that PR put their ai.md lines in
their report and the lead folds them in.

### PR1 - rule fixes A (ship on, G355)

**S1 Gear rules: helmets by difficulty, stage-2 helmets, shields in later sections, placed-shield check (Opus).**
Rows B2, B8, B13, B16; R1, R2, R3; M8 (code part).
- `src/ai/archetypes.ts:176-193`: `DifficultyDef.helmets: 'stage' | 'always' | 'locked'` (rookie / normal `stage`,
  realistic `always`, perfectionist `locked`).
- `src/ai/gear.ts`: `GEAR.lockHelmets` true (undo switch, line 18); `GEAR_BY_STAGE[2]` = armour + helmet (lines 30-35,
  A3); `GuardGear.helmetLocked?: boolean`; `gearHit` (133-149): head + locked helmet = mult 0, no knock-off, stagger
  `helmetStagger` only when `sinceStagger >= staggerCd`; `responseTeam(stage, perStage, out, shield = RESPONSE.shieldLead)`
  (155-164: the shield lead only when `shield`; `StealthSystems` keeps its call unchanged, `src/game/stealthSystems.ts:594`).
- `src/ai/enemyManager.ts`: `useDifficultyHelmets()` (A1; off by default); `placeSlot` (2012) adds the helmet when the
  rule is `always` / `locked`; every guard placed, revived (1620-1640) or joined to a team (1058-1082) gets
  `helmetLocked` on Perfectionist. `src/ai/enemy.ts`: `helmetLocked` field, copied by `setGear` (857) and kept by
  `inherit` (1082); the damage path (2186) passes it through `gearHit` (the object already is the `GuardGear`).
- `src/game/sectors.ts`: `SectorDef.shieldTeams?: boolean` (after `perStage`, line 129; default false: armed guards
  only); `checkSectorGuards` (581-597) fails a placed `enforcer` ("riot shields only in alert response teams", G307 (3)).
- `src/game/modes/sectorMode.ts`: `em.useDifficultyHelmets()` once when the mode starts; line 951
  `responseTeam(stage, send, this.teamKinds, s.shieldTeams === true)`.
- Tests: `tests/helmetRule.test.ts` (new: each tier at place, revive, team join, stage rise; Perfectionist head hits
  never knock off; a dog never geared), `tests/gear.test.ts` (stage 2 now both; `gearHit` locked; `responseTeam` with
  and without shield), `tests/difficulty.test.ts:10-13` (the new field), `tests/responseWiring.test.ts:152-155` (stage-2
  team: no shield by default, helmets now on), `tests/gearWiring.test.ts`, `tests/sectors.test.ts:248` (enforcer now
  fails). e2e: `scripts/e2e-sectorops.mjs` S13 block (3583-3660, warehouseOps): stage 2 = armour and helmet, teams with
  no shield lead (warehouse sets no `shieldTeams`), plus one check on a `difficulty=realistic` page that every human
  guard of the live section starts helmeted.
- Docs: `docs/systems/ai.md` (Decided direction 26-34, Gear 206-216, Response teams 377-390, Modes 738-742),
  `docs/systems/world-and-characters.md:197-198` and `docs/guard-models/SPEC.md:291-293` (Player-owned docs: the
  stage-2 helmet and the difficulty rule).
- Est. lines: ~450. Flag: none (fix). Done looks like: on Realistic every human guard in a Sector Ops section wears a
  helmet at load; on Perfectionist a head shot deflects and the helmet stays; Rookie / Normal guards are bare-headed
  until alarm stage 2; S1-S3 and warehouseOps response teams have no shield guard.

**S2 Dogs: no takedown, the host refuses one, a kill costs score (Opus).** Rows B4, B5; R4, R5; M9, M10. Player-owned
code: `src/game/takedownController.ts`.
- `src/game/takedownController.ts:278`: skip `e.def.quadruped` in the candidate scan (every takedown kind and the co-op
  assist; puppets carry `def.quadruped`, so the client is covered); 342 becomes redundant (leave or drop). No change to
  `src/game/elbowStrike.ts` (`strikeTargetable` already excludes dogs, 64-65) or `src/game/gameState.ts:1437`.
- `src/net/coopHost.ts:892`: the `start` deny also for `e.def.quadruped`.
- `src/game/modes/score.ts:3-9`: a dog kill scores -120 x the tier factor, no headshot bonus (A5). The kill already
  breaks No kills (`src/game/modes/sectorMode.ts:1311-1318`), so Perfect goes (M1).
- Tests: `tests/dogTakedown.test.ts` (new: no offer on a dog for each attacker state, the `TakedownController.find`
  harness of `tests/hangDownTakedown.test.ts`; the host deny), `tests/killScore.test.ts` (new: dog negative, others as
  before, the sector harness counts a dog kill in `kills`). e2e: `scripts/e2e-enemies.mjs:226` flipped (no offer, the
  dog stays up; legacy, report only); `scripts/e2e-takedown.mjs`: a dog behind the player gets no prompt.
- Docs: `docs/systems/takedowns.md:18-21` (Player-owned).
- Est. lines: ~200. Flag: none (fix). Done looks like: no takedown prompt or menu row on any dog, solo or co-op; killing
  a dog lowers the score and loses No kills.

**S3 Campus gear and shield data (Sonnet, Sector Ops data; after S1).** Rows B3, M8 (data part), B16 (data part).
- `src/world/maps/campusS4Data.ts:191-192` and `src/world/maps/campusS5Data.ts:174-175`: drop the section `gear:
  'helmet'`; `gear: 'both'` -> `'armour'` at S4 47, 61, 62 and S5 36, 37, 38, 40, 47, 48 (late armour stays, G307 (13));
  `shieldTeams: true` on S4 and S5 (A4).
- Tests: `tests/campusGear.test.ts:24-48` (S4 / S5: no section gear, armour tags, `shieldTeams` S4-S5 only).
- Est. lines: ~40. Flag: none (fix). Done looks like: S4 / S5 guards bare-headed before an alarm on Rookie / Normal;
  shield-led teams only in S4 and S5.

### PR2 - rule fix B (ship on)

**S5 Repeat alarms (Opus).** Row D5. A7.
- `src/ai/alarm.ts`: `ALARM_REPEAT = { enabled: true, max: 3, rearm: 60 }`.
- `src/ai/enemyManager.ts`: keep `alarmRaised` (249) sticky for its readers; a new lock gates new raises at 810
  (`raiseAlarm`), 831 (`contactThrough`), 1523 (`assignAlarm`), 2514 (the command caller) and 2550 (`radioAlarm`); it
  opens when the newest response team has a member searching or `rearm` s after the alarm, while fewer than `max` guard
  alarms were raised this load; `resetAlarm` (797-806) clears lock and count; `command` may run again once open.
- `src/ai/enemy.ts:175` (the context) and `:3136` (the panel run aborts when the lock is shut, not when any alarm was
  ever raised): a new `ctx.alarmOpen()`; 1687 keeps `alarmRaised`.
- Tests: `tests/alarmRepeat.test.ts` (new: second and third alarm after the response is in, never a fourth, reset on
  load, stage climbs in the sector harness), `tests/alarmCall.test.ts`, `tests/radioWiring.test.ts` (where they assert
  one alarm per load). e2e: `scripts/e2e-sectorops.mjs` 211 block ("raises the live section's alarm panel"): a second
  guard alarm after the response brings stage 2.
- Docs: `docs/systems/ai.md` (Alarm by radio 355-366, Response teams).
- Est. lines: ~350. Flag: none (fix, bible 5.7 "Each raised alarm adds one level"); undo `ALARM_REPEAT.enabled`.
  Done looks like: after a response team arrives, a guard who sees the player again can raise the next stage.

### PR3 - barks fix, then pairs (S4 ships on; S6 dark)

**F0 Flags (the lead, before S4 / S6 branch).** `src/core/flags.ts`: `guardPairs` (`?guardpairs=1`), `lookouts`
(`?lookouts=1`), `dogRelease` (`?dogrelease=1`), all default off, each with its owner line. ~15 lines.

**S4 Barks by cause (Opus).** Row C4. A8. Wire: `BARK_EVENTS` append.
- `src/ai/barks.ts`: `investigate` (56) loses "I heard something." and gains a sight line; new events `heard` (sound
  lines) and `spotCall` (the lookout's radio line, used by S7) appended to `BARK_EVENTS` (118-126, append only; original
  lines under 90 characters, G82).
- `src/ai/enemy.ts`: `onLevel` (2045) picks `heard` when the rise came from the hearing term (`AlertInput.heard`, the
  step's `heard` flag 462 / 2582) with no sight evidence, else `investigate`; `hearSearch` (1226) says `heard`.
- Tests: `tests/barkCause.test.ts` (new), `tests/combatHearing.test.ts:264,644,652` (`heard`), `tests/coopGuardAi.test.ts:84-88`
  (the event list), `tests/archetypes.test.ts:91-94` if its line set changes.
- Docs: `docs/systems/ai.md` (barks lines 640-642, Co-op 394-397).
- Est. lines: ~180. Flag: none (fix, bible P5). Done looks like: a guard who saw the player never says he heard something.

**S6 Pair checks and posted pairs (Opus).** Rows A4, A5. A10, A11. Flag `guardPairs`.
- `src/ai/pairs.ts`: `PAIRS.togetherR` 4, `notice` 3, `postedPeriod` 40, `postedOpen` 12; `PairDef.watch` and
  `posted`; `PairMeet` (204-420): outside a window a partner who was within `togetherR` and is gone for `notice` s ->
  `missing` (the same outputs as `waiting`, 317-345); a posted pair's window is its own fixed clock. No allocation.
- `src/ai/enemyManager.ts`: `buildPair` (2077-2132) builds a posted pair (two posts or no timed loops, within
  `meetMax`) when the flag is on; `pairWhyNot` (2135-2142) keeps today's skip with the flag off; `watch` set from the
  flag; `pairStep` / `pairMissing` (2167-2220) unchanged in shape.
- Tests: `tests/pairs.test.ts` (watch and posted clocks, flag off = today), `tests/pairsWiring.test.ts:247-265` (a
  non-route pair; today it reads `a.route!`). e2e: `scripts/e2e-sectorops.mjs` "talking pairs" (2716): with the flag,
  take one of a walking pair between meetings and the other looks within ~4 s.
- Docs: `docs/systems/ai.md` (Talking pairs 183-197).
- Est. lines: ~450. Flag: `guardPairs`. Done looks like (flag on): a pair walking together reacts at once to a missing
  partner; two posted guards named as a pair talk and check on each other.

### PR4 - lookouts and dog release (dark)

**S7 Lookouts (Opus).** Row A3 (G335 plan). A9, M3. Flag `lookouts`.
- `src/ai/posts.ts`: `PostDef.lookout?: boolean` (20-29), `POST.lookoutLeash` 1, `LOOKOUT = { callCd: 20 }`;
  `mayLeave` (91-93) false for a lookout.
- `src/ai/guardAiData.ts:204-233` `validatePosts`: a lookout's leash at most `lookoutLeash`, never `free`.
- `src/ai/enemyManager.ts`: `placeSlot` (2018-2019): flag off, a lookout post reads as no post (today's tactics and
  post); flag on, the guard gets it as a high-security post (one load-time copy), so `Enemy.secure` and the board's
  `GV_POSTED` (2384) treat him as posted with no `enemy.ts` change; a lookout who turns suspicious by sight says
  `spotCall` and reports an incident of an existing noise kind at the spot with no perceivers, so the board's fallback
  sends a calm guard within `INCIDENT.callR` (`src/ai/incidents.ts:60-61`); at most every `callCd` s.
- Tests: `tests/lookout.test.ts` (new: never sent, never leaves, a lure turns him in place, the radio sends someone
  else, flag off = today), `tests/posts.test.ts`, `tests/postsWiring.test.ts`. e2e: `scripts/e2e-sectorops.mjs` "posts
  (guard-ai S5)" (2453): with the flag, a lookout turns and someone else comes.
- Docs: `docs/systems/ai.md` (Decided direction 36-40, Posts 147-161; Q13's vent placement rule for map authors).
- Est. lines: ~450. Flag: `lookouts`. Done looks like (flag on): the S5 roof marksman holds the roof, turns to noises,
  radios what he sees and is never sent off it.

**S8 Dog release (Opus).** Row B6. A12. Flag `dogRelease`.
- `src/game/sectorStage.ts`: `raise` (286-300) also returns this raise's `dogs` (edge); `dogsReleased` (262, 293, 342)
  stays; the stub comment (34-38) is replaced.
- `src/game/modes/sectorMode.ts:548-552` `stageActions`: with the flag, each living, free dog of the live section
  gets `Enemy.releaseHeel()`.
- `src/ai/enemy.ts`: `releaseHeel()`: off the heel, to the shared last known position at run pace (none: round its
  handler), the search there, then back to heel on a living handler. No allocation per step.
- Tests: `tests/dogRelease.test.ts` (new), `tests/sectorStageActions.test.ts` (the edge). e2e: `scripts/e2e-stealth-ai.mjs`
  (a handler and a dog, a known position, release: the dog leaves and searches).
- Docs: `docs/systems/ai.md` (Sector tags `handler` 172-175).
- Est. lines: ~250. Flag: `dogRelease`. Done looks like (flag on): at campus S4 stage 2 / S5 stage 1 the dogs run to
  where the players were last seen and search.

**S9 Campus lookout data (Sonnet, Sector Ops data; after S7).** Row A3 (map part).
- `src/world/maps/campusS5Data.ts:64`: the roof marksman gets `post: { leash: 1, lookout: true }` (his 1 m route and
  facings stay inside it).
- Tests: `tests/campusPosts.test.ts` (he validates as a lookout).
- Est. lines: ~15. Flag: `lookouts` (data is inert with it off).

## Parallel groups (file-disjoint) and order
| Wave | Runs in parallel | Files each owns | After |
| --- | --- | --- | --- |
| 1 | S1 / S2 | S1: `src/ai/{gear,archetypes,enemyManager,enemy}.ts`, `src/game/sectors.ts`, `src/game/modes/sectorMode.ts`, S1's tests, `scripts/e2e-sectorops.mjs`, `docs/systems/ai.md`; S2: `src/game/takedownController.ts`, `src/net/coopHost.ts`, `src/game/modes/score.ts`, S2's tests, `scripts/e2e-{enemies,takedown}.mjs`, `docs/systems/takedowns.md` | J1 docs PRs on master |
| 2 | S3 / S5 | S3: campus S4 / S5 data, `tests/campusGear.test.ts`; S5: `src/ai/{alarm,enemyManager,enemy}.ts`, S5's tests, `scripts/e2e-sectorops.mjs`, ai.md | S1 merged into `feature/guard-rules` |
| 3 | F0 first (lead), then S4 / S6 | S4: `src/ai/{barks,enemy}.ts`, S4's tests, ai.md; S6: `src/ai/{pairs,enemyManager}.ts`, S6's tests, `scripts/e2e-sectorops.mjs` | wave 2 merged |
| 4 | S7 / S8, then S9 | S7: `src/ai/{posts,guardAiData,enemyManager}.ts`, S7's tests, `scripts/e2e-sectorops.mjs`, ai.md; S8: `src/ai/enemy.ts`, `src/game/sectorStage.ts`, `src/game/modes/sectorMode.ts`, S8's tests, `scripts/e2e-stealth-ai.mjs`; S9: `campusS5Data.ts`, `tests/campusPosts.test.ts` | wave 3 merged; S9 after S7 |
`src/ai/enemyManager.ts` and `src/ai/enemy.ts` are in nearly every slice, so the waves are serial on them; inside a wave
no two slices share a file. Slice branches: `feature/guard-rules-s<n>`; the lead merges them into `feature/guard-rules`
and cuts each PR. PRs: PR1 = S1 + S2 + S3 (~690 lines), PR2 = S5 (~350), PR3 = F0 + S4 + S6 (~645), PR4 = S7 + S8 + S9
(~715). The changelog fragment `changes/feature-guard-rules.md` is the lead's (kind: minor).

## Tests and e2e per PR
`node scripts/run-e2e.mjs --affected origin/master --list` (DIRECT_COVERS, `scripts/e2e-affected.mjs:230-332`), computed
for each PR's files with `selectSuites` + `affectedGateSuites`:
| PR | affected-e2e (gate) | The lead also requests (`request.mjs`) | Checkers |
| --- | --- | --- | --- |
| PR1 | e2e-anchors, e2e-coop, e2e-ctcourse, e2e-gadgets, e2e-guard-carry, e2e-levels, e2e-netmove, e2e-park, e2e-section-rating, e2e-sectorops, e2e-stealth-ai, e2e-tactics, e2e-takedown, smoke (e2e-enemies report only) | - (src/net already brings the co-op group) | two Opus (AI, `src/net`) |
| PR2 | e2e-guard-carry, e2e-sectorops, e2e-stealth-ai, smoke | e2e-ctcourse, e2e-coop (alarms on every live map; the radio alarm in co-op) | two Opus (AI) |
| PR3 | e2e-anim, e2e-combat, e2e-guard-carry, e2e-move, e2e-sectorops, e2e-stealth-ai, smoke | e2e-coop, e2e-netmove, e2e-ctcourse (the `bark` wire append) | two Opus (AI, wire) |
| PR4 | e2e-anchors, e2e-gadgets, e2e-guard-carry, e2e-levels, e2e-park, e2e-section-rating, e2e-sectorops, e2e-stealth-ai, e2e-tactics, e2e-takedown, smoke | e2e-coop, e2e-netmove (`src/game` gate, RULES "Test tiers") | two Opus (AI) |
Sector Ops data slices (S3, S9) map only to e2e-levels / e2e-anchors; PR1 and PR4 already run e2e-sectorops for them.
Unit files per slice are listed in each slice.

## Coordination (owned code and other jobs)
- Player-owned: S2 `src/game/takedownController.ts:278` and `docs/systems/takedowns.md`; S1 `docs/systems/world-and-characters.md`
  and `docs/guard-models/SPEC.md`. Not touched: `src/game/elbowStrike.ts`, `src/player/**`. Player Build's OK on S2's
  diff before the PR (J6 and J19 also edit takedown code).
- Sector Ops data and files: S3 and S9 (`src/world/maps/campusS4Data.ts`, `campusS5Data.ts`, `tests/campusGear.test.ts`,
  `tests/campusPosts.test.ts`); also `src/game/modes/score.ts` (S2, M10 names Sector Ops for the score),
  `src/game/modes/sectorMode.ts` (S1, S8). J17 (campus greybox v2) edits the same data files: order with Sector Ops or
  hand S3 / S9 to them as their first edits.
- Campaign (feature/mission-engine): S1's `shieldTeams` default removes the campaign shield lead once their branch takes
  master (their `sectorMode.ts:973` will conflict: take the `shieldTeams` call); J7's mode-aware `checkSectorGuards`
  and S1's placed-shield rule edit the same function (`src/game/sectors.ts:581-597`); S6 builds Tallow's four posted
  pairs (their data, `tallowWharfSectors.ts:114-178` on ME) once the flag is on.
- Guard AI's own jobs: J4 (G327 on `src/ai/animTierView.ts`, coop4) and J6's `src/ai` hot-path part (enemyManager /
  enemy) are claims overlaps: the orchestrator orders them against J15's waves. J13 (cause log) can reuse S4's cause
  bit; J26 (per-area alarms) builds on S5's lock.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `guardPairs` (`?guardpairs=1`) | off | Guard AI Build | 2026-10-29 (target; walk cap) | S6 PASS + walk item 5 accepted, Guard AI under the cap |
| `lookouts` (`?lookouts=1`) | off | Guard AI Build | 2026-10-29 (target; walk cap) | S7 + S9 PASS + walk item 6 accepted |
| `dogRelease` (`?dogrelease=1`) | off | Guard AI Build | 2026-10-29 (target; walk cap) | S8 PASS + walk item 7 accepted |
Fixes S1-S5 ship on with undo constants (`GEAR.lockHelmets`, `GEAR_BY_STAGE[2]`, `SectorDef.shieldTeams`,
`KILL_BASE.dog`, `ALARM_REPEAT.enabled`).

## Walk items
1. Sector Ops > Saltmarsh Park, Realistic and Perfectionist: every guard helmeted at the start; on Perfectionist a head
   shot only staggers - accept when it matches Q1's answer.
2. Rookie / Normal, any section: no helmets until alarm stage 2, then helmets and vests - accept when stage 2 shows both.
3. S1-S3 alarms bring armed guards only; S4 / S5 bring a shield guard first - accept when no shield appears before S4.
4. Campus S4 dog: no takedown prompt from any side; shoot it: score drops and No kills is lost - accept when both hold.
5. (`?guardpairs=1`) take one of a walking pair: the other looks within a few seconds - accept when it reads as natural.
6. (`?lookouts=1`) S5 roof: the marksman never leaves the roof, turns to a noise, radios a sighting - accept when
   someone else comes to check.
7. (`?dogrelease=1`) raise S4 to stage 2: the dog runs to the last seen spot and searches.
8. Repeat alarms and barks: a second sighting after the response arrives raises the next stage; a seen player never
   gets "I heard something."

## Risks and open questions
- Q1 (BRIEF): Perfectionist armoured guards become bullet-proof under A2; S1 builds A2, option 2 is a one-line change.
- e2e-enemies is legacy (report only): S2's real gate is `tests/dogTakedown.test.ts` and the e2e-takedown check.
- warehouseOps is frozen (Q26) but loses its shield lead through S1's default: a code-rule fix, no map edit (A4).
- Score below 0 inside a run (A5): the results screen shows it; the stored record clamps at 0.
- Repeat alarms (S5) bring more reinforcements in Marlow Yard (up to 3 per load): e2e-ctcourse is requested for PR2.
- Guard AI is 5 unwalked, AT CAP: the three flags may wait past their target date.
