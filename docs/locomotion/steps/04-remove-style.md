# Step 04 - remove the style tracker and cash; SAVE_VERSION 8

Block A. Deps: none (01 and 02 leave parked HQ keys for this migration). Bible 6; audit c 2d, 4; AUDIT 1i V06.

## Model
Implementer: sonnet. Checker: opus (touches src/net and src/save).

## Read
- docs/locomotion/audit/c-removals.md 2d and 4 (lines 55-60, 66-69); docs/systems/saves.md (migrations section, grep -n 'v7').
- src/game/playstyle.ts (all, 80); src/game/modes/gameMode.ts:20-65; src/game/gameState.ts:93, 283-287, 488-496, 740-748, 1215-1218.
- src/game/stealthSystems.ts:165-170, 208-214; src/game/modes/infiltrationMode.ts:160-235; src/net/coopHost.ts:236-242.
- src/ui/screens/resultsScreen.ts:35-80; src/ui/screens/playScreen.ts:105-160; src/styles.css (grep -n 'style-bar'); src/progression/rewards.ts:1-10, 55-65; src/progression/suit.ts:105-150, 186-250; src/progression/profile.ts:95-115.
- src/save/schema.ts:1-40, 60-105, 150-231; src/save/migrations.ts (all, 111); tests/save.test.ts (all); tests/economy.test.ts:85-100; tests/missions.test.ts:1-20.

## Task
1. Replace playstyle.ts with a `StealthRating` stub (keep the file, rename the class): fields `alarms`, `kills`, `knockouts`, `detections`;
   `record(ev: StealthEvent, detected: boolean)` only counts (detected / alarm / kill / takedownLethal / knockout / takedownNonLethal).
   No points, no `PlayStyle`, no `PLAY_STYLES`. Comment: "stealth rating hook (bible 6); scoring is Phase 4".
2. gameState.ts:93 import, :285-286 `readonly style = new StealthRating()` (field name `style` kept so infiltrationMode reads
   `g.style.alarms / kills / detections` unchanged, :207, :229). Drop `this.style.record('headshot' | 'explosion')` lines :494-495.
3. gameState.ts:743 `stats.style = ...` removed; `MatchStats.style` (gameMode.ts:28, :60) removed; :744-745 stay.
4. infiltrationMode.ts:171 records `objective` only (no `objectiveUnseen`); :197 `ghostExtract` removed. stealthSystems.ts:168 `bodyHidden` record
   removed; :212 alarm stays. coopHost.ts:240 stays (event `takedownNonLethal` still counted).
5. Style cash: `styleLines`, `STYLE_PAY` (suit.ts:223-243) and preset-name style text deleted; rewards.ts:4 import and :60-61 removed.
6. resultsScreen.ts:41-78 style bars and their `.style-bar*` CSS removed (parked `?legacy=1` screen must still compile and render);
   playScreen.ts:155-156 legacy split text and :107 comment removed; profile.ts:102-111 stops writing ghost / panther / assault.
7. schema.ts: `MissionRecord` = `{ rating, score, plays, wins }` (:28-37); sanitize :154-162 follows; `SAVE_VERSION = 8` (:10).
8. Parked HQ / challenges: remove `HqId` 'sonar' and 'marks' (suit.ts:109-110, :122-123, :131) and challenge `executes` (:190, :202, :216).
   Fix coopHost.ts:128 hq literal to `defaultHq()`.
9. migrations.ts: add `7: (s) => ...` -> version 8: for each `missions[id]` delete `ghost`, `panther`, `assault`; delete `hq.sonar`,
   `hq.marks`; delete `challenges.progress.executes`; filter 'executes' out of `challenges.done`. Pure, no throw on missing fields.
10. HQ credits already spent on sonar / marks levels are not refunded (parked economy); note it in saves.md and CHANGELOG.
11. tests/save.test.ts: new test 'v7 -> v8' with a literal v7 save object written out in the test (version: 7, a mission
    `{ rating: 2, score: 1200, ghost: 800, panther: 300, assault: 100, plays: 3, wins: 2 }`, `hq: { radar: 1, sonar: 2, marks: 1,
    restock: 0, revive: 0 }`, `challenges: { progress: { executes: 4, knockouts: 3 }, done: ['executes'] }`); asserts migrate() gives
    version 8, the mission keeps rating / score / plays / wins with no style keys, hq has no sonar / marks, progress has knockouts 3 and no
    executes, done is []. Existing tests using `SAVE_VERSION - n` step counts updated; save.test.ts:90-91 literal drops `ghost`.
12. tests/economy.test.ts:85-100 style cash tests removed; tests/missions.test.ts uses `StealthRating` counters.
13. Docs: modes-and-progression.md:10-12, :46 style text deleted; saves.md schema v8 row + migration line.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-coop.mjs` (results), `node scripts/e2e-missions.mjs`, `node scripts/e2e-park.mjs`,
  `node scripts/e2e-offline.mjs`; `npm run e2e:legacy` report only (e2e-progression / cosmetics / clear must still load).
- Co-op check (PLAN): e2e-coop results screen passes.
- Grep proofs (print nothing): `git grep -n -i "panther\|PLAY_STYLES\|styleLines\|STYLE_PAY\|StyleTracker" -- src tests`;
  `git grep -il sonar -- src scripts tests` (step 02 leftovers gone); `git grep -n "'marks'\|extraMarks" -- src`.
- `grep -n "SAVE_VERSION = 8" src/save/schema.ts` prints one line.

## Commit
`locomotion 04: StealthRating stub, style cash gone, MissionRecord style dropped, SAVE_VERSION 8 + migration + literal v7 test`

## Numbers
- SAVE_VERSION 7 at src/save/schema.ts:10 -> 8. Last migration is `6:` (migrations.ts:78-84); add `7:` after it.
- Removed HQ prices: sonar 1000 / 2000 (suit.ts:122), marks 2500 (:123); challenge executes goal 15, 700 credits (:190).
