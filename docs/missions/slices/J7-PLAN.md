# J7 mission-rules: plan (mission-engine rule fixes, dark)

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, 2026-10-25; plan check fix round the same day (checker verdict
FIX, `C:/NightShift/scratch/campaign/j7-plan-check.md`, items 1-7); fix round 2 after the re-check (verdict FIX,
`C:/NightShift/scratch/campaign/j7-plan-recheck.md`, items 1-3 and the polish; mapped in section 13). This file is the
draft for `docs/mission-rules/PLAN.md` on `feature/mission-rules`; the job's BRIEF is `docs/mission-rules/BRIEF.md`
(Michael said / Michael picked, assumed decisions A1-A21 with their undo; R0 applies the BRIEF edits in section 8); R0
commits both there before the builders start.

Code base read: `origin/feature/mission-engine` dc8e4681 (its code is identical to 8f40303f = c74ce8f5 + the FLG fix
f8b06637, PASS from FLG checkers A and B; only plan and BRIEF docs changed since). The engine is stacked on PR #372
`feature/mission-framework`, whose head a1696b14 is docs-only commits past the engine's merge base aa762a41; R0 merges
it into the engine (B0, section 2). Every file:line below is on dc8e4681 (the same as on 8f40303f; R0's merge is docs
only and its two code edits keep the line count). Rules read from origin/master (RULES "Intake" / "A job" / "Test tiers", CLAUDE.md,
agent-preamble, VISION, DECISIONS). Scope: FOLDED-PLAN (origin/feature/menu) section 4 row J7 and section 3 breaks 10-14,
17, plus C S19 (shield) and M K3 (cap); detail rows from `origin/master:docs/conformance-campaign/CONFORMANCE.md` S2-S8,
S12, S19, MF15, MF21, HG7, HG8, 1d item 2, Part B; Michael's answers in ROADMAP Decided ("Folded plan SIGNED OFF",
"Folded plan, the other 30", "Mission sign-off pages" ~18:05); the signed mission pages on #372
(`docs/missions/prototypes/three-grey-coats/{BEAT,SIGNOFF}.md` and the others, at a1696b14, which put the TGC page back
to the wording Michael signed at ~18:05 and logged the knock-out case as `docs/missions/BRIEF.md` A24).

## 0. What Michael decided that binds J7 (verbatim option text; the quotes are in BRIEF.md)

| Source | Michael picked / said | J7 effect |
| --- | --- | --- |
| G155 | "Adopt CT's way" (narrowed to the campaign by G297 / G307) | dogs out of Tallow; campaign guard check |
| G290 | a broken rule restarts the section, the mission continues | `oneChance` (ends the mission) goes |
| G334 | "Soft windows only" | `window` rule kind (a countdown) goes |
| G126 | "30-second revive, 2 per mission" | campaign revive cap 2, not syringes |
| G2 | "2 player coop campaign only, unable to be completed solo." | exactly two players at a campaign start |
| G145 + G353 | "Protected until their role is done." + (7) "Section restart" | the interrogation target down before his step restarts the section; no softlock |
| TGC ~18:05 | "He moves (Recommended)" (after a broken rule W2 restarts with Teale in the clock-mender's loft) | the page he signed (SIGNOFF 4, as restored on #372 a1696b14: SIGNOFF.md:41-43, BEAT.md:17-19) says "Questioning a decoy (Fenn or Garrow), or killing Teale before he talks, breaks it" and Teale is then "unalerted in the clock-mender's back loft". So a decoy read or a Teale kill before tgc-3 breaks the rule (breaks +1, RULE BROKEN, the rule's line), the restart puts Teale at his bolt point and tgc-3's line names the loft (A18). A Teale knock-out before tgc-3 is not on that page: it restarts the section with Teale still at his table, uncounted, no move (protected character, G353; `docs/missions/BRIEF.md` A24 at a1696b14 SIGNOFF.md:43-45, BEAT.md:22-25; to confirm with Michael, section 9; mission-rules A2) |
| Q8 | "None on Mission 1 (Recommended)" | no civilians; protected = the interrogation target only (A1); a decoy knock-out never restarts |
| Q12 | "No, armed only (Recommended)" | no riot-shield lead in a campaign mission |
| Q19 | "None (Recommended)" | no optional rewards (R0 drops the two Tallow rewards with the #372 merge), no section-rating grants in the campaign (R2) |
| G359 | "32 alive, ..." | campaign cap named (`CAMPAIGN.maxAlive`, pinned to 32) |
| G336, G351 | "What and where" | Tallow tgc-2 line with a place; the section banner shows the mission's step; tgc-3's moved line |
| G343 + HG7 / HG8 | objectives fade in; the full list lives in the field menu | R6: the popup feed, the mission rows through hud-guidance B4's hook (`GameMode.objectiveLines` / `NetAttachment.objectiveLines`; a mission run shows mission rows, never sector rows), `Hud.setObjectiveHint` and the rules-line / hint rows in the field menu (J3b owns the popup and the hook, section 7) |
| TKL ~18:05 | "Hears and reacts (Recommended)" | no J7 change: the `telltale` event stays, the porter's reaction is Guard AI's |
| Code Relay ~18:05 | "Approve, code re-askable (Recommended)" | consistent with A4 / A5: no countdown rule; the sync step's window is data |
| Map ~18:05 | "approve as drawn, id rather physically walk the map once built and confirm changes" | no map change in J7 |
| Q1, ~18:20, ~18:05 | "Review all 12 first"; then "Adopt all as recommended (Recommended)" and "Build now, walk later (Recommended)" | the hold is lifted; J8 owns geometry, lights and the pages and starts after J7; J7 touches none of them |
| Q23 | "Force co-op" | throw gaps: J8's (geometry or a map decision) |
| Q2 | "Never" | Tallow lighting: J8's |
| Q9 | "Kill + lose score (Recommended)" | Sector Ops dogs only (J15); none left in the campaign after J7 |
| Q16 | "Live now" | R4 clamps a campaign room to 2 whatever `capacity()` returns |

## 1. Claims

```claims
files:
  - src/game/mission/missionDef.ts
  - src/game/mission/missionRunner.ts
  - src/game/mission/ruleTracker.ts
  - src/game/mission/missionText.ts
  - src/game/mission/sectorMission.ts
  - src/game/mission/campaign.ts
  - src/game/mission/missionFeed.ts
  - src/game/modes/sectorMode.ts
  - src/game/modes/gameMode.ts (R6: the one `objectiveLines?` member, hud-guidance B4's text)
  - src/game/sectors.ts
  - src/game/gameState.ts
  - src/ui/hud/hud.ts (R6: `setObjectiveHint` only)
  - src/ui/screens/pauseScreen.ts (R6: `ObjectiveLine` note / hint fields and the Objectives rows only)
  - src/main.ts
  - src/net/session.ts
  - src/net/coopUi.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/ui/hud/missionHud.ts
  - src/ui/hud/missionHudMount.ts
  - src/world/maps/tallowWharfSectors.ts
  - src/world/maps/tallowWharfMissions.ts
  - docs/missions/prototypes/three-grey-coats/{graph.json,BEAT.md}
  - docs/missions/prototypes/two-key-ledger/{graph.json,BEAT.md}
  - docs/missions/BRIEF.md
  - docs/missions/PLAN.md
  - docs/mission-rules/**
  - docs/systems/coop.md
  - docs/systems/ui.md
  - tests/mission/{missionDef,missionRunner,ruleTracker,missionText,sectorMission,campaign,missionFeed,missionHudMount}.test.ts
  - tests/mission/missionWire.test.ts (only if a fact-bit case breaks)
  - tests/missionHud.test.ts
  - tests/missionNet3.test.ts
  - tests/tallowWharf/sectors.test.ts
  - tests/{campaignGuards,campaignSession,campaignRevives}.test.ts
  - scripts/e2e-sectorops-wharf.mjs
  - scripts/e2e-sectorops-mission.mjs
  - changes/feature-mission-rules*.md
  - TESTING.md
maps: tallowWharf (guard roster kinds and objective text only; no geometry, lights, doors or sign-off pages)
protocol: no message shape change; `ms.f` gains one fact bit for an interrogate step with a bolt (A18); src/net files
  change in PR E and PR F; the train bumps PROTOCOL_VERSION once
save: none
```

Not claimed (other jobs own them; J7 stays out): `src/ai/gear.ts` (J15 adds `shieldFrom`), `src/ai/enemyManager.ts`
(the `MAX_ALIVE` comment is Guard AI's J1 doc row), the rest of `src/ui/hud/hud.ts` and `src/ui/screens/pauseScreen.ts`
(the popup, View / O, the net status line and the Notes row are J3b's), `src/ui/hud/objectivePopup.ts`, `src/styles.css`,
`src/game/sectorObjectives.ts` (hud-guidance B4), `src/input/**` (J3b), `src/net/protocol.ts` (J4 coop4 capacity), `src/game/mission/missionWire.ts` (no shape change),
`scripts/mission-validate.mjs` and `docs/level-validator/mission-schema.md` on `feature/mission-validator` (J12's
mission-validator re-cut drops `oneChance` / `window`; J7 sends J12 the note), every Tallow geometry / light / SPEC /
SIGNOFF / campaign-map graph file (J8 owns geometry, lights and the pages and starts after J7; J9 the shutters; J23).

Claims overlaps for the orchestrator (all on master-shared files; J7's PRs sit on the engine branch, so they meet master
only when PR C goes through the train): J3 / J3b on `gameState.ts`, `sectorMode.ts` (blips gate, HG3), `coopClient.ts`
(HG9 status line), `coopHost.ts` (ally blips); hud-guidance B1 on `hud.ts` (the popup: `setObjective`, the `.show`
toggle) and `gameState.ts`; hud-guidance B4 on `gameMode.ts`, `gameState.ts` (`NetAttachment`, `objectiveLines`),
`sectorMode.ts` and `coopClient.ts` (`objectiveLines()`), `pauseScreen.ts` (comment :11): the same declarations, written
once in section 7 and in the hud-guidance PLAN B4, so those hunks are identical; hud-guidance B5 on `pauseScreen.ts`
(Notes row) and `gameState.ts`; J3b on `docs/systems/ui.md` (FF's mission-lines paragraph is its own block); J4 (#317 coop4) on `session.ts` capacity; J6 on `coopHost.ts` /
`coopClient.ts` hot paths; Guard AI's J1 doc row on `src/game/sectors.ts:84-90` comments (R3 edits sectors.ts :129-135
and :549-598 only, separate hunks). Small, separate hunks; the train's conflict rule settles them.

## 2. Slices

Branches: `feature/mission-rules` (PR D), `feature/mission-rules-net` (PR E, cut from PR D's head),
`feature/mission-rules-hud` (PR F, cut from PR E's head), in `C:/NightShift/Mobile-Coop-mission-rules`; parallel
slices in their own worktrees `feature/mission-rules-<slice>`; the lead merges them. No two slices that run at the same
time touch one file.

| Id | What | Model | Files owned | Est lines / h | PR | Group | Depends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | On `feature/mission-engine` (Campaign Build does it): B0, merge #372 (`origin/feature/mission-framework`, a1696b14 or later, docs only) into the engine, plus one commit that drops the two Tallow optional rewards (Q19) so `tests/tallowWharf/sectors.test.ts` stays green; push. Then cut `feature/mission-rules` from the new engine head and commit `docs/mission-rules/{BRIEF,PLAN}.md` with the section 8 BRIEF edits (detail below the table) | lead (no agent) | `feature/mission-engine`: the merge, `src/world/maps/tallowWharfMissions.ts` (:85, :190), `src/game/mission/missionDef.ts` (:52, :247); `feature/mission-rules`: `docs/mission-rules/{BRIEF,PLAN}.md` | ~4 / 0.3 | - (engine branch) | - | plan checker PASS |
| R1 | Rules core: drop `oneChance` / `window`; the interrogation target knocked out before his step restarts the section (a built-in protected restart: uncounted, no move; A2 = #372 A24); a Teale kill before tgc-3 breaks the named-target rule and he moves (the signed page), as a decoy read does; the moved line after the move (`boltText`, spook fact); a campaign optional reward is a check error; Tallow mission data (tgc-2 place, tgc-3 moved line) | Opus | `src/game/mission/{missionDef,missionRunner,ruleTracker,missionText,sectorMission}.ts`; `src/world/maps/tallowWharfMissions.ts`; TGC / TKL `graph.json` + `BEAT.md` (already #372's copy on the base after B0); `tests/mission/{missionDef,missionRunner,ruleTracker,missionText,sectorMission}.test.ts` (+ `missionWire.test.ts` only if a fact case breaks) | ~640 / 4.5 | D | P1 | R0 |
| R2 | Campaign profile: `campaign.ts` (cap 32, revives 2, no shield lead, no grants, the start gate, the section line); SectorMode uses it (cap, response kinds, zero grants, mission banner); solo campaign refusal in `main.ts`'s autostart branch | Opus | `src/game/mission/campaign.ts` (new); `src/game/modes/sectorMode.ts`; `src/main.ts`; `tests/mission/campaign.test.ts` (new) | ~350 / 3 | D | P1 | R0 |
| R3 | Dogs out of Tallow (two armed humans on the same posts); W1 sector label with a place; mode-aware guard check (`checkSectors(..., 'campaign')` rejects quadrupeds and `dogs > 0`) | Sonnet | `src/world/maps/tallowWharfSectors.ts`; `src/game/sectors.ts` (`checkSectors`, `checkSectorGuards` only); `tests/tallowWharf/sectors.test.ts`; `tests/campaignGuards.test.ts` (new) | ~200 / 1.5 | D | P1 | R0 |
| FD | PR D docs: fragment, job STATE, TESTING.md line; `docs/missions/{BRIEF,PLAN}.md` already carry #372's G339 / Q19 / A24 text after B0 (BRIEF A10, A12, A24; PLAN :72-87): FD only greps them for `oneChance` / `window rule` / a required reward and fixes a line R1 made stale, never #372's A24 or the TGC pages | Haiku | `changes/feature-mission-rules.md`, `docs/mission-rules/STATE.md`, `docs/missions/{BRIEF,PLAN}.md`, `TESTING.md` | docs | D | after P1 | R1-R3 |
| R4 | Exactly two players: session refuses a campaign start unless 2 are in the room, before the phase changes; campaign room capacity 2 (holds after coop4); the lobby shows why | Opus | `src/net/session.ts`; `src/net/coopUi.ts`; `tests/campaignSession.test.ts` (new); `tests/missionNet3.test.ts` (the Tallow cases that start alone or with no mission) | ~300 / 3 | E | P2 | R1, R2 merged on PR D's branch |
| R5 | Campaign revives: cap `CAMPAIGN.revives` (2) at every difficulty, window 30 s; `addSyringes` does nothing in a campaign mission | Opus | `src/net/coopHost.ts` (constructor :203, `addSyringes` :858); `tests/campaignRevives.test.ts` (new) | ~150 / 1.5 | E | P2 | R2 merged |
| R6 | Popup feed and field-menu list (HG7, HG8): `missionFeed.ts` (with `missionViewerTeam` moved in); the always-on mission list removed (host and client); the current objective on the objective line; the mission rows (rules line + steps) in the field menu through hud-guidance B4's hook (`GameMode.objectiveLines` / `NetAttachment.objectiveLines`, B4's exact text; no `missionLines` name, no `GameState.objectiveLines()` edit of J7's own); J7's `Hud.setObjectiveHint` and the rules-line / hint rows of the Objectives screen | Opus | `src/game/mission/missionFeed.ts` (new); `src/game/modes/sectorMode.ts`; `src/game/modes/gameMode.ts` (one member, one import); `src/net/coopClient.ts`; `src/game/gameState.ts` (`NetAttachment` member, `objectiveLines` :1244-1252 as B4 writes it); `src/ui/hud/hud.ts` (`setObjectiveHint` after `setObjective` :302-304, one field); `src/ui/screens/pauseScreen.ts` (`ObjectiveLine` :12-16, `ObjectivesScreen` rows :49-58); delete `src/ui/hud/missionHud.ts`, `src/ui/hud/missionHudMount.ts`, `tests/missionHud.test.ts`, `tests/mission/missionHudMount.test.ts`; `tests/mission/missionFeed.test.ts` (new) | ~880 incl. ~390 deleted / 4.5 | F | P2 | R1, R2 merged (sectorMode, missionText settled); hud-guidance B4 merged on `feature/hud-guidance-b` first, or R6 builds against B4's names as written there (section 7) |
| R7 | PR E e2e: a decoy knock-out restarts nothing; Teale knocked out before tgc-3 restarts W2 with Teale back at his table and no break counted (A2 / A24); Teale killed before tgc-3 breaks the rule (RULE BROKEN, breaks 1) and W2 restarts with Teale at his bolt point and the moved line on host and client; a decoy read then breaks it again with Teale still at the bolt point; a host alone cannot start (the lobby stays `lobby`, the match starts once the client is in); `revivesLeft` is 2 on Realistic; no dog spawned; the W3 banner on TGC is not the ledger line | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~240 / 2 | E | after P2 | R4, R5 (and PR D) |
| FE | PR E docs (fragment, STATE, `docs/systems/coop.md` campaign start line) | Haiku | `changes/feature-mission-rules-net.md`, STATE, `docs/systems/coop.md` | docs | E | after R7 | R7 |
| R8 | PR F e2e flips: `.mission-hud` asserts become "objective line = the step text" (the moved line after R7's restart) and "the field menu lists the rules line and the steps" (`e2e-sectorops-mission.mjs` :45-52, wharf `clientHud` :260) | Sonnet | `scripts/e2e-sectorops-mission.mjs`; `scripts/e2e-sectorops-wharf.mjs` | ~150 / 1.5 | F | after R6, R7 | R6, R7 |
| FF | PR F docs (fragment, STATE, `docs/systems/ui.md` mission lines, the J3b interface note) | Haiku | `changes/feature-mission-rules-hud.md`, STATE, `docs/systems/ui.md` | docs | F | after R8 | R8 |

Waves (full burn): **wave 1** R1, R2, R3 together (3 tsc / vitest builders). **Wave 2** as soon as R1 and R2 are merged
on `feature/mission-rules` (R3 may still run): R4, R5, R6 together, each from PR D's head (files disjoint: session /
coopUi / missionNet3; coopHost; sectorMode / coopClient / gameState / missionFeed). **Wave 3** R7 (after R4 + R5), then
R8 (after R6 and R7: both edit the wharf e2e). Fragments and STATE close each PR. Checkers: PR D one fresh Opus checker
(R1-R3 batch; R1 changes what the `ms.f` bits mean, so this checker also reads the wire path: `missionWire.ts`
`packMission` / `applyMissionWire` and `tests/mission/missionWire.test.ts`, `tests/missionNet*.test.ts`); PR E two
independent Opus checkers (src/net); PR F two independent Opus checkers (src/net); PR C two fresh Opus checkers on its
final head (section 4). One fix round each. Guard AI's "(+ Guard AI check)": the lead sends Guard AI R3's diff
(`sectors.ts` check, the two Tallow rows) for a read; the PR D checker is the gate.

**R0 in full (Campaign Build, before wave 1).** B0 runs here, not after PR D (the J8-J9 plan is told the same).
1. In `C:/NightShift/Mobile-Coop-mission-engine` on `feature/mission-engine`: `git fetch`, `git pull --ff-only`, note
   `git rev-parse origin/feature/mission-engine` (dc8e4681 when this was written; later commits are docs only), then
   `git merge --no-ff origin/feature/mission-framework -m "Merge origin/feature/mission-framework (#372) into
   feature/mission-engine (B0)"`. Checked: `git merge-tree` of dc8e4681 and a1696b14 has no conflict; #372 brings docs
   only (the TGC / TKL pages with `"optional": {}`, `docs/missions/BRIEF.md` A24, PLAN, STATE, the CLAUDE.md stub).
2. One commit "mission-engine: Q19 no optional rewards on Tallow (B0 base stays green)":
   `tallowWharfMissions.ts` :85 `optional: { reward: 'gadget' }` -> `optional: {}` and :190 `optional: { reward:
   'syringe' }` -> `optional: {}`; `missionDef.ts` :52 `optional?: { reward: RewardKind }` -> `optional?: { reward?:
   RewardKind }` (without it `optional: {}` does not compile) and :247 checks the kind only when a reward is given
   (`if (s.optional.reward !== undefined && !REWARD_KINDS.includes(s.optional.reward))`). Nothing else (R1 adds the
   campaign-reward error). Then `tests/tallowWharf/sectors.test.ts:150` compares `undefined` with the graph's
   `undefined`, and `checkMission` stays `[]` for both missions.
3. Checks (single files, when desktop CPU allows; else the wave 1 builders' first runs are the check and they report a
   base failure before editing): `npm run typecheck:fast`; `npx vitest run tests/tallowWharf/sectors.test.ts
   tests/mission/missionDef.test.ts --maxWorkers=2`. Push `feature/mission-engine`.
4. `git worktree add C:/NightShift/Mobile-Coop-mission-rules -b feature/mission-rules origin/feature/mission-engine`
   (the new head); copy this PLAN to `docs/mission-rules/PLAN.md`, apply the section 8 BRIEF edits to
   `docs/mission-rules/BRIEF.md`, commit both, push. Write the head into STATE; every "Base" line below means it.

## 3. Slice detail (what "done" is)

**R1 rules core (Opus).** `RuleKind` (missionDef.ts:68), `RULE_KINDS` (:128) lose `oneChance` and `window`;
`MissionRule.step` comment (:76) says namedTarget only, `seconds` (:78-79) goes, `checkMission`'s window branch
(:326-329) goes. RuleTracker: `RULE_END` (:36), `outcome` RULE_END, `ended` (:84-85), `endsOnRestart` (:97, :116-118),
`onFail` (:255-262), the window read (:286-290) and the end branch (:292-299) go; every break returns `RULE_RESTART`.
Header comments (:1-16) rewritten. New `onProtected()` (A2 / A3: the built-in protected restart, not a rule break,
uncounted) and `onTargetKilled(step): boolean` (the named-target rule on that step is hit, as a decoy read hits it).
SectorMission: `fail` (:158, binding :643),
`MISSION_FAILED_TITLE` (:176), `hasOneChance` (:216, :273), `pendEnd` (:221, :352, :472-474, :547-550), the one-chance
block of `restarted()` (:359-362) go; a restart it did not ask for only restores state (the pending team if one waits).
New protected check in `tick` (allocation-free; reuses `targetSec` / `targetK`, :261-271, and a `targetRule` byte per
step built once: 1 when a `namedTarget` rule covers that interrogate step). For an interrogate step not yet done whose
target is in the live section:
- **Killed** (`!e.alive`) and `targetRule[i]`: a rule break, exactly as the page Michael signed says ("killing Teale
  before he talks, breaks it"): `tracker.onTargetKilled(i)` hits the rule (breaks +1, its kept bit cleared, the rule's
  break line, RULE BROKEN) and, when it hit (the scope is not held), `runner.spookStep = i` (a public field; no
  missionRunner.ts edit), so the restart bolts him to the clock-mender's back loft and tgc-3 shows the moved line, as
  after a decoy read. While the scope is held the check retries next tick (he is still down).
- **Knocked out** (`e.ko`), or killed with no rule on the step: `tracker.onProtected()`: a section restart from the
  checkpoint with the SECTION RESTART banner and `PROTECTED_LINE`, never a rule break (no `breaks` +1, `kept`
  untouched, no rule break line) and no spook (`spookStep` neither set nor cleared: an earlier move stays, else he is
  back at his table). This is A2 (= #372 BRIEF A24, to confirm with Michael; undo: the knock-out takes the kill branch).
No `MissionDef.protects` list (A1: decoys and everyone else may be knocked out). The moved line (A18, after a decoy read
or a Teale kill): `MissionStep.boltText`; `spookFact(step)` = `<step id>-spooked`, a fact after the
`gives` facts (`factsOf`), registered as a runner flag (missionRunner.ts:143-144, one line), kept on restore, set by
`spook()` (:593-603) while `spookStep` names the step; `objectiveRows` / `stepLine` show `boltText` while it is held, so
the host and a client (fact bits in `ms.f`) show the same line. Campaign `optional.reward` is an error (Q19; R0 already
made `reward` optional and dropped the two Tallow rewards). Tallow: tgc-2 text names both places (88 characters), tgc-3
gets its `boltText` (74). Brief in section 11.
- Done looks like: no `oneChance` / `window` / `RULE_END` / `MISSION_FAILED` / `fail(` left in `src/` (git grep); Teale
  knocked out before tgc-3 -> SECTION RESTART with "The man you need is down. Back to the section checkpoint.",
  `breaks` 0, `kept(SCOPE_MISSION)` bit 0 still set, W2 restarts after the hold, Teale respawns at his table (not
  bolted), tgc-3 open with its reading-room line; Teale killed before tgc-3 -> RULE BROKEN with "Named target broken.
  Back to the section checkpoint.", `breaks` 1, bit 0 clear, `spookStep` = tgc-3, the respawned Teale bolted to [65,
  4.5, 76.75], tgc-3's row reads the clock-mender's back loft; a decoy read -> the same RULE BROKEN, bolt and moved
  line (host runner and a client runner fed the host's wire, both cases); after tgc-3 he is fair game; a decoy knocked
  out -> nothing; `npx vitest run tests/mission/ tests/tallowWharf/ tests/missionNet.test.ts tests/missionNet3.test.ts
  tests/missionFlags.test.ts` green; typecheck clean.

**R2 campaign profile (Opus).** New pure `src/game/mission/campaign.ts`: `CAMPAIGN = { maxAlive: 32, revives:
REVIVES_PER_MISSION, shieldLead: false }`; `isCampaignMission(def)`, `isCampaignMap(missions)`, `campaignStartBlock(...)`,
`campaignReviveCap(def, syringes)`, `campaignGrant(grant)`, `campaignResponseKinds(kinds, n)`, `missionSectionLine(runner,
viewer)`. SectorMode: `start()` (:326-328) cap from `CAMPAIGN.maxAlive` when the bound mission is campaign;
`raised()` after `responseTeam` (:973) rewrites the team kinds to `SECTOR_REINFORCE_KIND`; `rate()` (:1062-1070) zeroes
the grant (marks and the card stay); `beginSection` banner (:771) shows the mission's line for the section. `main.ts`:
FLG's gate stays as it is (:449-450, `mapBootAllowed`: without `?missions=1` Tallow already goes to the menu); inside
`else if (autostart)` (:461) a `mode=sector` run whose map or mission is campaign is refused with a toast and the menu
(solo is never 2 players). Brief in section 11.
- Done looks like: a TGC run on Tallow has `em.maxAlive === CAMPAIGN.maxAlive` (32), an alarm stage sends no `enforcer`,
  a connector rating grants nothing, entering W3 on TGC shows no "Take the ledger" banner; Sector Ops runs (no mission
  or a sector mission) are unchanged (`e2e-sectorops` 1-6, `e2e-section-rating` green);
  `?autostart=tallowWharf&mode=sector&missions=1` (solo) opens the menu with the reason toast; without `?missions=1`:
  FLG's menu, `tests/missionFlags.test.ts` unchanged.

**R3 dogs out, guard check (Sonnet).** `tallowWharfSectors.ts:145-148`: W3 guard 1 becomes an armed `grunt` on the same
running line (a second yard watchman: "Yard watchman's mate: walks the lodge end of the yard"), no `handler`; :146
reason drops "and the dog line". :165-168: W4 guard 1 becomes a yard patrol (role `patrol`, no dog in the reason), guard
2 an armed `grunt` on the same line ("Yard patrol on the shed doors' side"), no `handler`. `dogs: 1` (:366, :390) -> 0.
Slot indexes stay (guard ids `W3:1`, `W4:2` and `WHARF_GUARD_MISSIONS` unchanged). W1 objective label (:310) -> "Take the
tally book from the warden's gallery office" (52; the same place name as tgc-2). `sectors.ts`: `checkSectors(defs, nav?,
security?, mode: 'sector' | 'campaign' = 'sector')` passes `mode` to `checkSectorGuards(d, mode)`; campaign: any
quadruped is "`<id>: guard <k> is a dog (G155, campaign)`" and `dogs > 0` is an error; heavies stay an error in both.
Brief in section 11.
- Done looks like: `checkSectors(WHARF_SECTORS, undefined, undefined, 'campaign')` is []; the same check on a section
  with a dog lists it; every MAPS entry whose missions are all campaign passes the campaign check; campus and warehouse
  Sector Ops checks unchanged.

**R4 exactly two (Opus, src/net).** `session.ts` (FLG's `sectorMission` line :107 stays as it is): a `campaignBlock`
getter (`campaignStartBlock(map.missions, sectorMission, players.size)` for a sector match, map from `MAPS`, else null);
`startMatch()` (:362-373) returns null while blocked or over capacity BEFORE `this.phase = 'playing'` (today :364 sets
the phase and :365 returns after it, which strands a lone host in `playing`: `autoLocalCourse` then never starts,
coopUi.ts:877); capacity reads (:164, :188, :358) use 2 for a campaign mission or map, else `capacity(mode)`. `coopUi.ts`:
the Start button's `blocked` text (:635), the status line (:503) and the auto-start (:877) honour the block. No message
shape change. `tests/missionNet3.test.ts`: the late-joiner case (:100-108, host alone on Tallow) and the no-mission case
(:110-128) move to two players or to the campus test mission (`mode: 'sector'`); the FLG case (:241-247) passes as is (a
blocked start returns null).
- Done looks like: unit tests: 1, 3, 4 players blocked with "Campaign missions need exactly two players" and
  `session.phase === 'lobby'` after the blocked start; the match starts (phase `playing`) once the second player is in;
  over capacity also leaves `lobby`; a third join is refused while the host's mission is campaign (also with coop4's
  capacity 4); campus sector missions and plain Sector Ops unchanged; `tests/missionNet3.test.ts`, `tests/net.test.ts`,
  `tests/rejoin.test.ts`, `tests/coopRejoin.test.ts` green.

**R5 revives (Opus, src/net).** `coopHost.ts:203`: `this.reviveClock.cap = campaignReviveCap(def, syringesFor(...))` with
`def = pickMission(g.world.map.missions, s.sectorMission)` (the builder confirms `g.world.map` is set when CoopHost is
built: `attach: (g) => new CoopHost(g, ...)` at coopUi.ts:210 runs after the world is built, so it should be; if it is
not, R5 stops and reports to the lead, and never edits `sectorMode.ts` / `gameState.ts`, which R6 owns in the same
wave); `addSyringes` (:858)
returns at once for a campaign mission. `REVIVE_WINDOW` stays 30; `checkpoint()` keeps `used` (per mission, G126).
- Done looks like: unit tests at Rookie / Normal / Realistic / Perfectionist: cap 2 on a campaign mission, 3 / 2 / 1 / 1
  on Sector Ops; `addSyringes(2)` leaves a campaign cap at 2.

**R6 popup feed, field-menu list, hint and rules line (Opus, src/net).**
- **Feed.** New pure `missionFeed.ts`: `missionViewerTeam` moves in from `missionHudMount.ts:19` (same body;
  coopClient.ts:26 and its test import it from here); `MissionFeed.update(runner, viewer, hints): boolean` (true only
  when the viewer's current objective changes; key = step index and runner `version`; fills `text` and `hint` in place,
  no allocation per frame; the text comes from `stepLine(d, i, moved)` as R1 left it, so the moved line shows after the
  move) and `missionObjectiveLines(runner, viewer, hints): ObjectiveLine[]` (the rules line first with `note: true`,
  then every step of the mission's sections so far, done / current / to do, `hint` on the current line when hints are
  on). SectorMode (host / solo): `setup()` (:790, :810) and the download line (:1320) do not write the sector label
  while a mission runs; `frameUpdate` on a feed change writes `g.hud.setObjective(feed.text)` and
  `g.hud.setObjectiveHint(feed.hint)` (a direct call: J7 adds the method, below); the `MissionHudMount` (:278, :366,
  :1328-1329, dispose :1440) goes. CoopClient: the same feed from its mirror and its own viewer (Sector Ops teams differ
  from the host); the snapshot's objective text is ignored while a mission mirror runs; the mount (:128, :225-230,
  :1002, :1171-1173) goes.
- **Field-menu rows through hud-guidance B4's hook (HG8; section 7 has the exact text).** R6 never names a
  `missionLines()` and never writes its own `GameState.objectiveLines()`. It adds B4's three declarations, character for
  character as B4 has them on `origin/feature/hud-guidance-b` (when B4 has merged there), else as section 7 and the
  hud-guidance PLAN B4 write them (the same text): `GameMode.objectiveLines?(): ObjectiveLine[] | null` in
  `gameMode.ts` after `restartCheckpoint?(): boolean;` (:98) with `import type { ObjectiveLine } from
  '../../ui/screens/pauseScreen';` after :8; `NetAttachment.objectiveLines?(): ObjectiveLine[] | null` in
  `gameState.ts` after `onEnd?(...)` (:187); and the first two lines of `GameState.objectiveLines()` (:1244-1252),
  `const own = this.mode?.objectiveLines?.() ?? this.net?.objectiveLines?.(); if (own) return own;`, before today's
  branches. Then the mission's lines go in through the hook: `SectorMode.objectiveLines()` returns
  `missionObjectiveLines(...)` while a mission is bound, else `null` (comment: "hud-guidance B4: the Sector Ops rows
  here"); the client attachment's `objectiveLines()` returns the mirror's mission lines while a mission mirror runs,
  else `null` (comment: "hud-guidance B4: the SectorListMirror rows here"). Each method sits immediately above its
  class's `dispose()` (sectorMode.ts:1438, coopClient.ts:1393), where B4 puts its own (section 7 item 3). The mission
  branch is first in both, so a mission run shows mission rows, never sector rows (HG8), whichever lands first.
- **Hint (J7 owns it).** `src/ui/hud/hud.ts`: a new `setObjectiveHint(text: string | null): void` right after
  `setObjective` (:302-304) and one field `private objHint: HTMLElement | null = null`. The first non-empty call
  creates `h('div', { class: 'hud-objective hud-objective-hint' })` with a smaller inline font and inserts it with
  `this.objective.after(el)` (so :144 / :159, which PR A and hud-guidance B1 rewrite, are not touched); writes go
  through `this.set('objHint', text ?? '', ...)` (cached, no per-frame DOM write); empty or null hides it. It shares the
  `hud-objective` class on purpose: once B1's popup CSS is on the same branch, `.hud-objective` without `.show` is
  hidden, so the hint can never stay stuck on; the PR C / PR B merge adds one line beside B1's toggle
  (`this.objHint?.classList.toggle('show', vis)`, hud.ts B1 :229-234) so it fades with the popup. Before that merge it
  is a static small line under the objective, only while hints are on (`gameplay.hints`, default off) in a mission
  (dark behind `missions`).
- **Rules line and hint in the field menu (J7 owns them).** `src/ui/screens/pauseScreen.ts`: `ObjectiveLine` (:12-16)
  gains `note?: true` (a line with no done / current state: the mission's rule) and `hint?: string` after `current`
  (the :11 comment, which B4 edits, stays as it is); `ObjectivesScreen` (:49-58): a `note` row shows the counter
  "Rule" (class `obj-note`, desc "The mission's rule. Breaking it restarts the section.") instead of Done / Current /
  To do; a row with `hint` adds " Hint: <hint>" to its desc. Pure helper `objectiveRowState(o): { ctr: string; desc:
  string }` exported for the test if `pauseScreen.ts` imports cleanly in vitest's node run; else R8's e2e covers it.
- `missionHud.ts`, `missionHudMount.ts` and their two tests are deleted (the `missionViewerTeam` cases move to
  `missionFeed.test.ts`).
- Done looks like: in a mission the old `.mission-hud` panel never appears; the objective line shows the current step
  (both pages; the moved line after the move); the pause menu lists the rule (counter "Rule") then the steps, and the
  current step's desc carries the hint when hints are on; `window.__app.current.objectiveLines()` in a mission run
  returns mission rows only (no sector label), on host and client; `git grep -n missionLines -- src` is empty; the
  line changes only when a step changes (no per-frame rewrite: `hud.objectiveText` stable across frames); the download
  percent still shows on a mission's download section; Sector Ops runs without a mission show today's field menu
  (until B4 lands, then B4's rows).

**R7 / R8 e2e (Sonnet).** R7 adds to `scripts/e2e-sectorops-wharf.mjs`: (TGC W2, in this order) a knock-out of decoy Fenn
(W2:7) changes no `ruleRestarts` and no `breaks`; a host knock-out of Teale (W2:6) before tgc-3 -> SECTION RESTART, W2
restarts (`mission.ruleRestarts` +1, `breaks` still 0, `spook` -1, the "man you need is down" line, tgc-3 open), Teale
(alive, not knocked out) back at his reading-room table, more than 5 m from the bolt point, and the mission row still the
reading-room line (A2 / A24); then, after the restart hold, a host kill of Teale (through the suite's existing kill or
damage hook on his Enemy id; the builder reads the suite first) -> RULE BROKEN, W2 restarts (`breaks` 1, the "Named
target broken" line, `spook` = tgc-3's index, tgc-3 open), Teale (alive) stands within 1 m of the bolt point [65, 4.5,
76.75], and the mission row on host and client reads "Take the grey coat with the black umbrella in the clock-mender's
back loft"; then a decoy read of Garrow (W2:8, through the suite's interrogation hook or `__mission.intel` with his
Enemy id) -> RULE BROKEN again (`breaks` 2), Teale still within 1 m of the bolt point, the moved line unchanged on both
pages; (both) no live guard of kind `dog`; the host alone (before the client
joins) cannot start: `session.startMatch()` returns null, `session.phase === 'lobby'`, the Start button shows the
blocked text, and the match then starts on its own once the client is in (the rest of the suite runs on it);
`net.revivesLeft()` is 2 with the lobby on Realistic; the W3 banner on TGC does not contain "ledger". R8 flips the HUD
list asserts to the objective line (the moved line included) and the field-menu list.

## 4. PR split and stacking

| PR | Branch (base) | Slices | Est changed lines | Checkers | Laptop suites (`request.mjs`, `E2E_GPU=1`) |
| --- | --- | --- | --- | --- | --- |
| C (exists as a branch, not J7) | `feature/mission-engine` (on #372) | engine, kit, NET, Tallow greybox, then D + E + F | ~14k + ~2.8k | engine plan's, then two fresh Opus (src/net) on the head after F merges | engine plan's, plus the union of D / E / F's suites, on that head |
| D | `feature/mission-rules` (base: the `feature/mission-engine` head after R0's B0 merge and reward commit) | R1, R2, R3, FD | ~1.2k | 1 Opus (also reads the wire path) | affected-e2e + `e2e-sectorops` (1-6, mission, wharf-tgc, wharf-tkl), `e2e-section-rating`, `e2e-coop`, `e2e-netmove` (RULES checker gate for `src/game`), `e2e-menus` (autostart path) |
| E | `feature/mission-rules-net` (base PR D's branch) | R4, R5, R7, FE | ~670 | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops:mission`, `:wharf-tgc`, `:wharf-tkl`, `e2e-sectorops:1`, `e2e-menus` (lobby) |
| F | `feature/mission-rules-hud` (base PR E's branch) | R6, R8, FF | ~1.03k | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops` (all parts), `e2e-menus` (pause list), `e2e-coop-gpu` (objective-text waits, 4189) |

Stacking (A14): D, E, F are reviewed as their own PRs so each diff stays under ~1.5k and gets its own checker statuses
and laptop runs on its own head; each base is the branch below it. After PASS + green laptop, the lead merges D into
`feature/mission-engine`, then retargets E to `feature/mission-engine` and merges it, then F. PR C (engine to master)
carries all three; none of D, E, F enters a train alone. A wire-path member is PR C itself; the train bumps
`PROTOCOL_VERSION` once; nobody edits it by hand. No `SAVE_VERSION` change (no save shape touched).

Forward merges (merge commits; never rebase, never force):
- R6 runs from PR D's head, but PR F is cut from PR E's head: the lead merges R6's branch into
  `feature/mission-rules-hud` right after cutting it.
- A PR D fix round lands on `feature/mission-rules` after E and F are cut: the lead merges `feature/mission-rules` into
  `feature/mission-rules-net`, then `feature/mission-rules-net` into `feature/mission-rules-hud`, and reruns on E's and
  F's heads only the checker items and suites the fix touches (a fix inside `src/net` or the wire: both src/net
  checkers again). The same for a PR E fix round into F.

PR C's gate: D, E and F move PR C's head by ~2.8k lines after its own checks, and the watchdog drops `train-ready`
without a new `checker` success on the new head. So after F merges into `feature/mission-engine` (the last of the
three), PR C gets two fresh, independent Opus checkers (src/net) and its laptop set (the engine plan's suites plus the
union of D / E / F's) on that head, and only then goes train-ready. If PR C has to train before F, the same runs on the
head after each merge it carries.

## 5. Flags (dark until accepted)

| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `missions` (`?missions=1`, src/core/flags.ts:70) | off | Night Shift \| Campaign Build (flags.ts:67) | target 2026-10-27 (flags.ts:68); if the walk moves, the owner updates flags.ts:68 and the ROADMAP row in the same PR | Michael walks Mission 1 (Three Grey Coats / Two-Key Ledger, after J8) and accepts the walk item |
| `coopKit` (`?coopkit=1`, :74) | off | Night Shift \| Campaign Build (flags.ts:71) | target 2026-10-28 (flags.ts:73) | Michael accepts the kit walk (Player Build's clips); unchanged by J7 |

Everything J7 changes runs only when a mission is bound (`missionParam()` needs `flags.missions`) or on the unlisted
Tallow map, which FLG's gates (main.ts:449-450, session.ts:107) keep out without the flag and R2 / R4 refuse to start
with fewer or more than two. Default players see no change.

## 6. Acceptance (per PR)

- **PR D:** no rule kind can end a mission or time a step (unit tests; `git grep oneChance\|RULE_END origin/<head> --
  src` empty); on TGC a decoy read or a Teale kill before tgc-3 breaks the rule and Teale moves to the clock-mender's
  back loft, and tgc-3 says so (the page Michael signed); a Teale knock-out before tgc-3 restarts the section with him
  still at his table, uncounted (A2 = #372 A24, to confirm with Michael); a decoy knock-out restarts nothing; after the
  step he is fair game; Tallow spawns no dog and fails the campaign guard check if one is added; a campaign run caps at 32,
  sends no shield lead and grants nothing at connectors; the W3 / W4 banners on the wrong mission are gone; solo
  `?autostart=tallowWharf&mode=sector&missions=1` is refused; every listed laptop suite green; Sector Ops unchanged.
- **PR E:** a campaign mission starts only with exactly two, and a blocked start leaves the room in the lobby; the room
  holds two; revives are 2 at every difficulty and never topped up; the wharf e2e walks the Teale knock-out restart (no
  move, no break counted), then the Teale kill (RULE BROKEN, the move and the moved line on host and client), then a
  decoy read (a second break, he stays moved); laptop co-op group
  and mission suites green; two Opus checkers PASS.
- **PR F:** no always-on mission list; the objective line carries the current step (the moved line included) on host
  and client; the field menu holds the rules line (counter "Rule") and every step, through B4's hook, mission rows only
  in a mission run; the hint line shows under the objective when hints are on; nothing rewrites the objective line per
  frame; suites green; two Opus checkers PASS. The J3b interface (section 7) is written into `docs/systems/ui.md`.
- **PR C (after F):** two fresh Opus checkers PASS and the laptop set green on its head (section 4).

## 7. Interface with J3b (hud-guidance PR B, `feature/hud-guidance-b`)

Owners (the hud-guidance PLAN says the same in "Engine rebase cost"): J3b owns the popup (B1: `objectivePopup.ts`,
`Hud.setObjective`'s show / hold, `showObjective`, the `.show` CSS), View / O (B2), the net status line (B3), the Sector
Ops field-menu rows and the hook (B4), Notes (B5), `src/input/**` and the popup's look and timing. J7 owns the engine
side, `Hud.setObjectiveHint` and the rules-line / hint rows of the Objectives screen (all in R6, PR F).
1. **Popup trigger.** The engine writes the viewer's current objective through `g.hud.setObjective(text)` only when it
   changes (`MissionFeed.update` true; the moved line is a change). B1's popup fades in on a text change and on View /
   O. A Sector Ops download line keeps its `" NN%"` suffix (hud-guidance A4 keeps the popup on while it climbs).
2. **Hint (J7, R6).** `Hud.setObjectiveHint(text: string | null)` after `setObjective` (hud.ts:302-304 on the engine;
   B1 rewrites `setObjective`'s body, a different hunk): a lazily made `div.hud-objective.hud-objective-hint` placed
   right after the objective. Merge point with B1: one line beside B1's visibility toggle
   (`this.objHint?.classList.toggle('show', vis)`), so the hint fades with the popup; without it the hint stays hidden
   under B1's `.hud-objective` CSS (never stuck on).
3. **Field menu: B4's hook is the merge point (HG8).** The same text in both plans, added by whichever lands first and
   copied character for character by the other, so these hunks are identical and git takes them once:
   - `src/game/modes/gameMode.ts`, after `import type { SlotPoint } from '../spawnSlots';` (:8):
     `import type { ObjectiveLine } from '../../ui/screens/pauseScreen';`; in `GameMode`, after
     `restartCheckpoint?(): boolean;` (:98):
     `/** (hud-guidance B4, G343 / HG8) Field Terminal > Objectives rows; null: none here (GameState asks the net layer). */`
     `objectiveLines?(): ObjectiveLine[] | null;`
   - `src/game/gameState.ts` `NetAttachment`, after `onEnd?(won: boolean, subtitle: string): void;` (engine :187):
     `/** (hud-guidance B4, HG8) Client: Field Terminal > Objectives rows; null: none (GameState shows its own). */`
     `objectiveLines?(): ObjectiveLine[] | null;`
   - `GameState.objectiveLines()` (engine :1244-1252, master :1255-1263), its first two lines:
     `const own = this.mode?.objectiveLines?.() ?? this.net?.objectiveLines?.();` `if (own) return own;`, then
     today's Infiltration and current-line branches unchanged.
   The two method bodies are each written once, immediately above `dispose()` in `SectorMode` (engine :1438) and in
   `CoopClient` (engine :1393), so a second copy shows as a merge conflict there, never as a silent duplicate method.
   Resolved body (whoever merges second writes it this way): `SectorMode.objectiveLines()` returns
   `missionObjectiveLines(...)` when a mission is bound, else B4's `sectorObjectiveLines(...)` rows (before B4: `null`);
   `CoopClient.objectiveLines()` returns the mission mirror's lines while it runs (`this.mission`, coopClient.ts:126),
   else B4's `this.list?.lines(...) ?? null` (before B4: `null`). The mission branch is always first: a mission run
   shows mission rows, never sector rows. Client pages have no mode (`gameState.ts:695`, `puppet`), so the net branch
   is the client's.
4. **Rules line and hint rows (J7, R6).** `ObjectiveLine` (pauseScreen.ts:12-16) gains `note?: true` and `hint?:
   string` after `current`; `ObjectivesScreen` (:49-58) shows a note row with the counter "Rule" and adds the hint to
   the row's desc. B4 edits only the :11 comment and B5 adds the Notes row further down: separate hunks.
5. **Co-op status.** B3 moves "Connecting to host" off the objective line (HG9). PR F's client ignores the snapshot
   objective only while a mission mirror runs, so B3's change and PR F's do not depend on each other.
6. **Order.** B4 lands (merged on `feature/hud-guidance-b`) before R6 starts, or R6 builds against B4's names as the
   hud-guidance-b branch writes them (its PLAN B4 carries the text in item 3 verbatim). Before PR F's checkers the lead
   compares R6's three declarations with `origin/feature/hud-guidance-b` (`git show
   origin/feature/hud-guidance-b:src/game/modes/gameMode.ts | grep -n objectiveLines`, the same for `gameState.ts`);
   any difference is fixed on PR F (J7 follows B4). When PR C and PR B meet on master (either order), the declarations
   merge as identical hunks; the two method bodies and the hint toggle are the only hand merges, done as written here.

## 8. Assumptions

A1-A21, each with its undo, are in `docs/mission-rules/BRIEF.md` (the only copy). The ones the first fix round changed
or added: A1 (protected = the interrogation target only; no `protects` list), A9 (the solo refusal sits behind FLG's
gate), A11 (J8 owns geometry, lights and the pages), A19 (a blocked start stays in the lobby). Fix round 2 changes A2,
A3, A13, A17, A18 and adds A20, A21.

**R0's BRIEF edits** (`docs/mission-rules/BRIEF.md` on `feature/mission-rules`; the lead applies them at R0 step 4, word
for word; nothing else in the BRIEF changes):
- Header "Base:" line: "Base: the `origin/feature/mission-engine` head after R0 (B0: #372 merged, a1696b14 or later;
  the Q19 reward commit), on top of 8f40303f's code (the FLG fix f8b06637)."
- "Michael picked", the Three Grey Coats line, append: "The page he signed says: \"Questioning a decoy (Fenn or
  Garrow), or killing Teale before he talks, breaks it. ... Teale is now unalerted in the clock-mender's back loft\"
  (SIGNOFF 4; #372 a1696b14 SIGNOFF.md:41-43, BEAT.md:17-19)."
- **A2** (replace): "A protected target knocked out before his step is done restarts the section from its checkpoint
  with him in place (G353, Michael ~11:20 \"Section restart\"); it is not a rule break and does not move him. On TGC this
  is #372 `docs/missions/BRIEF.md` A24 (a1696b14 BRIEF.md:98-101, SIGNOFF.md:43-45, BEAT.md:22-25): the page Michael
  signed names only the kill, not the knock-out. A kill is not covered here when a `namedTarget` rule covers his step:
  then it breaks that rule and he moves, as the signed page says (PLAN R1). A kill with no rule on his step is this same
  protected restart. A knock-out never clears an earlier move. Logged for Michael (PLAN 9, Needs Michael). Undo: the
  knock-out takes the kill branch (a rule break, he moves): one condition in SectorMission's protected check."
- **A3** (replace the first sentence): "The protected restart (a knock-out, or a kill with no rule on his step) is built
  in, not one of the 2 strict rules (CONFORMANCE MF6): it does not count in `rb`, `kept()` or `brokenCount`; a Teale
  kill before he talks is a rule break and counts." (the rest of A3 stays).
- **A13** (append): "J7 owns `Hud.setObjectiveHint` and the rules-line / hint rows of the Objectives screen (R6); the
  mission rows reach the field menu only through hud-guidance B4's hook (`GameMode.objectiveLines` /
  `NetAttachment.objectiveLines`; PLAN 7); J3b owns the popup. Lead ruling, plan fix round 2."
- **A17** (replace the R1 sentence): "B0 at R0 merges #372 (a1696b14 or later) into the engine, so the four TGC / TKL
  files are already #372's copy on the base; R1 adds only its own lines, and leaves #372's \"Breaking it\" (the kill)
  and A24 (the knock-out) text as it is."
- **A18** (replace the first parenthesis): "(a decoy read or a Teale kill before he talks; a knock-out never moves him,
  A2)".
- **A20** (new): "B0 (merge #372 into `feature/mission-engine`) runs at J7 R0, done by Campaign Build, with one commit
  that drops the two Tallow optional rewards and makes `MissionStep.optional.reward` optional (Q19 \"None\"), so
  `tests/tallowWharf/sectors.test.ts` stays green on the base. The J8-J9 plan uses the same order. Undo: B0 after PR D
  (then R1 copies the four files from #372 itself)."
- **A21** (new): "The field-menu interface with hud-guidance PR B is B4's hook with the text in PLAN 7 item 3, in both
  plans; B4 lands before R6, or R6 builds against B4's names on the hud-guidance-b branch. Undo: none needed (an
  interface agreement)."

## 9. Blocked or needing Michael

- **J8's work (geometry, lights and the pages; starts after J7; the hold is lifted, "Build now, walk later"):** Q23
  "Force co-op" throw gaps (widen gaps or a solo-jump block: a map decision); Q2 "Never" dark spots and the real-site
  lighting re-base; gate reach ERRs; hide spots, medkit stations, encounter checkpoints; the campaign-map SPEC / graph /
  SIGNOFF dog and count text; the TGC / TKL SIGNOFF wording. J9: the shutters (so the perfect-run e2e, MF20, waits on
  J9). Nothing in J7 moves geometry.
- **Needs Michael** (nothing blocks; J7 builds as written until he answers):
  - **A24 (#372 `docs/missions/BRIEF.md`, = mission-rules A2):** Teale knocked out before he talks restarts W2 with him
    still at his table, not a rule break. His signed page names only the kill (a break, he moves). One-click question
    for the orchestrator to send: "Three Grey Coats: Teale knocked out before he talks - restart with him at his table
    (Recommended)" / "Treat it like a kill: the rule breaks and he moves". Undo if he picks the second: the knock-out
    takes R1's kill branch (one condition) and R1 / R7's knock-out tests flip.
  - Logged for his next look: A4 (the two kinds go for Sector Ops missions too).
- **Hand-offs:** J12 (Marlow) drops the validator kinds (A15) and lets the mission validator pass tgc-3's new
  `boltText` field as it passes `bolt` (a non-validator field). Guard AI: G B1 / B7 / B11 / D4 close through R3 / R2 / R1
  / R4; J15's `shieldFrom` must leave a campaign override in SectorMode intact; TKL's porter reaction ("Hears and
  reacts") is Guard AI's; Guard AI reads R3's diff (section 2). J3b: section 7 (B4's hook text; the hint toggle line at
  the B1 merge).
- **J8 / J9 (`docs/missions/slices/J8-J9-PLAN.md`):** J8's P1 ("TGC: Teale protected (J7)") must not rewrite the TGC
  page: #372 a1696b14's BEAT / SIGNOFF wording stands (a Teale kill before he talks breaks the rule and he moves; the
  knock-out restart is A24, to confirm with Michael); P1 may add only what J8 itself owns. B0 runs at J7 R0 (A20), so
  J8 starts from the merged base. Its plan's J7 references "A10" (map doc text) and "A13" (stacking) are now A11 and
  A14. W3 guard 1 (R3) becomes a man pacing a 3 m line ([112.5, 46] to [109.5, 46]) on the dog's old route: J8 gives
  him a proper beat when it reworks W3 (no geometry change in J7).
- **Walking it (A9):** solo `mode=sector` with `?missions=1` is refused, so Michael's "walk the map once built" uses
  two tabs: `?autostart=tallowWharf&mode=sector&missions=1&net=local` on both (the `?net=local` branch, main.ts:451-460,
  R4's two-player gate), or Play > Co-op with a partner. TESTING.md (FD) names this path.

## 10. Risks

- `sectorMode.ts` is Sector Ops Build's file: R2 and R6 keep to campaign / mission branches; Sector Ops runs are
  covered by `e2e-sectorops` 1-6 and `e2e-section-rating` on every PR. The lead tells Sector Ops Build which lines.
- The protected check could misfire on a target knocked out at the end of his own interrogation: the tick order is poll,
  `runner.update`, `stepEvents`, `spook`, the exit check, the protected check, `tracker.update`; the `intel` event
  completes the step before the check, and a unit test covers a knock-out in the same tick as the intel.
- A bolt (the spooked target despawned and respawned at the bolt point) must not read as a protected break: `spook()`
  runs before the check, and a unit test covers it.
- The kill branch must break the rule once, not every tick he lies dead: after the hit, `tracker.update` trips in the
  same tick and `tick()` returns early during the pending restart (the `pendT` branch); while the rule's scope is held
  (the 2 s hold after a restart) `onTargetKilled` returns false, `spookStep` is not set, and the check retries next tick.
  Unit tests cover both. The kill is told from a knock-out by `!e.alive` (checked first), so a knocked-out Teale who is
  then killed in the same tick takes the kill branch.
- The spook fact adds one bit after the `gives` facts: missions without a bolt keep their bit order; the train bumps
  PROTOCOL_VERSION, so an old client never reads the new bit.
- PR C's size and its master conflicts (HG3's blips gate, J3 / J3b hunks) are the engine plan's; J7 adds small hunks
  only. #372's docs-only head (a1696b14) is merged into the engine at R0 (B0, A20), so R1 edits #372's TGC / TKL lines
  on the base and PR C's later merge of #372 is already done.
- hud-guidance PR B meets PR C on master: the B4 declarations are identical hunks; the two `objectiveLines()` bodies
  and the hint toggle are hand merges written in section 7.
- coop4 (#317, "Live now") may land on master first: R4's capacity rule must read whatever `capacity()` returns and
  clamp a campaign room to 2.

## 11. Briefs for the first three slices (strict, self-contained)

Each brief goes to a fresh agent with `docs/systems/agent-preamble.md` (origin/master) filled in as below. Common lines:
- Job `mission-rules`; lead "Night Shift | Campaign Build". Read `docs/mission-rules/BRIEF.md` (Michael said / picked,
  A1-A21) and this PLAN. Base: `origin/feature/mission-rules` (cut by R0 from the origin/feature/mission-engine head
  after B0: #372 merged and the Q19 reward commit; the code carries the FLG fix f8b06637: do not redo FLG's gates).
  Your worktree:
  `C:/NightShift/Mobile-Coop-mission-rules-<slice>` on `feature/mission-rules-<slice>` (the lead creates it with
  `git worktree add ... -b feature/mission-rules-<slice> origin/feature/mission-rules` and a node_modules junction).
  Guard before every write:
  `cd /c/NightShift/Mobile-Coop-mission-rules-<slice> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-rules-<slice> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-rules-<slice>"`.
- Edit only the files your brief owns. Commit and push each finished sub-step (`git add <your files>`, never `-A`),
  message prefix `mission-rules <SLICE>:`, ending with the attribution line the lead gives. Never merge, rebase,
  stash, reset or force-push; never touch master.
- Checks: `npm run typecheck:fast` and `npx vitest run <files> --maxWorkers=2`. No e2e (the lead queues the laptop),
  no full `npm run check`, no dev server, every command with a timeout.
- Hard rules that bite here: hot paths allocate nothing (the mission tick runs every fixed step: no closures, arrays or
  strings built per tick); strict TS (`noUncheckedIndexedAccess`, `import type`); plain-English comments, hyphens not
  em dashes; no reference-game names.
- Line numbers below are on dc8e4681 (the same code as 8f40303f; R0's edits keep the line count); read the code before
  editing and follow the symbol if a line moved.
- Report (your last message): commits, files, test counts, anything you could not do, and every place you deviated
  from this brief with the reason.

### Brief R1: rules core (Opus 5.5)

Owned files: `src/game/mission/missionDef.ts`, `src/game/mission/missionRunner.ts` (one line, step 2),
`src/game/mission/ruleTracker.ts`, `src/game/mission/missionText.ts`, `src/game/mission/sectorMission.ts`,
`src/world/maps/tallowWharfMissions.ts`, `docs/missions/prototypes/three-grey-coats/graph.json`,
`docs/missions/prototypes/three-grey-coats/BEAT.md`, `docs/missions/prototypes/two-key-ledger/graph.json`,
`docs/missions/prototypes/two-key-ledger/BEAT.md`, `tests/mission/missionDef.test.ts`,
`tests/mission/missionRunner.test.ts`, `tests/mission/ruleTracker.test.ts`, `tests/mission/missionText.test.ts`,
`tests/mission/sectorMission.test.ts` (and `tests/mission/missionWire.test.ts` only if a fact-bit case breaks). Do not
edit `sectorMode.ts`, `sectors.ts`, `tallowWharfSectors.ts`, `missionWire.ts`, any `src/net` file or
`tests/tallowWharf/*` (other slices own them; `tests/tallowWharf/sectors.test.ts` must still pass unchanged).

Read first: BRIEF A1-A3, A17, A18; `git show origin/master:docs/DECISIONS.md` entries G145, G290, G334, G353 (grep
`^\*\*G145\.` etc.); `origin/master:docs/conformance-campaign/CONFORMANCE.md` rows MF2, MF3, MF6 and "B. A10 / A12
replacements"; the TGC sign-off on your base (`docs/missions/prototypes/three-grey-coats/SIGNOFF.md` item 4, :40-45,
and Michael's pick "He moves (Recommended)", :59-60; `BEAT.md` "Rule", :12-25), and `docs/missions/BRIEF.md` A24
(:98-101); the five owned source files in full.

Why: G290 (a broken rule restarts the section, the mission continues), G334 (soft windows only: no countdown) and G353
(killing a protected character restarts the section; G145 protects story people until their role is done). Today
`oneChance` can end a mission, `window` is a countdown, and killing or knocking out Teale (W2:6) before tgc-3 leaves
the step open forever (softlock). The TGC page Michael signed at ~18:05 (SIGNOFF.md:41-43, BEAT.md:17-19) says
"Questioning a decoy (Fenn or Garrow), or killing Teale before he talks, breaks it", and after the break Teale is
"unalerted in the clock-mender's back loft"; he picked "He moves". So a Teale kill before tgc-3 is a rule break with
the move, exactly like a decoy read, and the objective lines name the places (A18). Knocking Teale out before he talks
is not on that page: it restarts the section with Teale still at his table, not a rule break (protected character,
G353; #372 BRIEF A24, to confirm with Michael; mission-rules A2). Decoys (Fenn W2:7, Garrow W2:8) and everyone else
may be knocked out (Q8 "None on Mission 1"; TGC BEAT.md:25 "Knock-outs are allowed on anyone else").

Do:
1. `missionDef.ts`: remove `'oneChance' | 'window'` from `RuleKind` (:68) and `RULE_KINDS` (:128); `MissionRule.step`
   comment (:76) = "namedTarget: the interrogate step"; delete `seconds` (:78-79) and the `r.kind === 'window'` block of
   `checkMission` (:326-329). `optional?: { reward?: RewardKind }` (:52) and the kind check only when a reward is given
   (:247) are already on your base (R0); add: a campaign mission's optional step with a reward is an error
   `"<p>: campaign optional objectives give no reward (rating only)"`. Add `MissionStep.boltText?: string` (beside
   `bolt`, :43; doc comment: "the step's line once the target has bolted: what and where, G336"); `checkMission`: only
   on an interrogate step with a `bolt`, 1-`MISSION.textMax` characters. Export `spookFact(s: MissionStep): string`
   (`${s.id}-spooked`) and make `factsOf` (:405) append `spookFact(s)` for every interrogate step with a `bolt`, after
   all the `gives` (so existing fact bits keep their order); `checkMission`: `factsOf(d).length <=
   MISSION.stepsWireMax`. No `protects` list (A1): the protected people are the interrogate steps' `target`s, which
   SectorMission already parses (`targetSec` / `targetK`).
2. `missionRunner.ts:144`: register every fact as a flag, `this.factFlag = Int32Array.from(this.facts.map((f) =>
   add(f)))` (before `nf` is read at :145, so the arrays are sized with it), so a fact no condition reads (the spook fact)
   still has a flag, rides `factBits` / `applyWire` and can be `keepOnRestore`d. Nothing else in the file changes.
3. `missionText.ts`: delete `oneChance` / `window` from `RULE_NAME` (:12-22); `ruleName(r)` returns `RULE_NAME[r.kind]`;
   `breakLine(r)` (one argument, :59) = `${ruleName(r)} broken. Back to the section checkpoint.`; add
   `PROTECTED_LINE = 'The man you need is down. Back to the section checkpoint.'` (57). `stepLine(d, i, moved = false)`
   (:50) uses `s.boltText` instead of `s.text` when `moved` and the step has one; `objectiveRows` (:85) passes
   `moved = runner.hasFlag(spookFact(s))` for an interrogate step with a `bolt` (built on a change, not per tick: say
   so in the comment). The header (:1-6) says it.
4. `ruleTracker.ts`: delete `RULE_END` (:36), `ended` (:84-85), `endsOnRestart` (:97, :116-118), `onFail` (:255-262), the
   window read (:286-290) and the end branch (:292-299); `outcome` is RULE_OK or RULE_RESTART; `line = breakLine(r)`;
   rewrite the header (:1-16) without one-chance / window, and say a protected restart is not a rule break. Add
   `protectedBreaks = 0`, a private pending flag and `onProtected(): void` (ignored while the mission scope is held
   or `tripped`); in `update()`, before the rules loop, a
   pending protected break sets `tripped`, `lastRule = -1`, `outcome = RULE_RESTART`, `line = PROTECTED_LINE`,
   `protectedBreaks++` and returns RULE_RESTART (it does not touch `breaks`, `broken[]` or `kept`). `resetSection` clears
   the pending break. `restartTeam` is undefined when `lastRule < 0` (everyone). Add `onTargetKilled(step: number):
   boolean`: the target of interrogate step `step` was killed before he talked; `hitRules('namedTarget', TEAM_BOTH,
   step)` (as `onInterrogate` does for a decoy read with the asker unknown) and return whether any rule was hit (make
   `hitRules` return that count or flag; it skips held scopes). The next `update()` then breaks that rule the normal way
   (breaks +1, `broken[i]++`, kept bit cleared, `breakLine(r)`, RULE_RESTART). Header: say a target's kill on a step a
   named-target rule covers is that rule's break (TGC page), a knock-out is the protected restart.
5. `sectorMission.ts`: delete `fail` from `SectorMissionHost` (:158) and the binding (:643), `MISSION_FAILED_TITLE`
   (:176), `hasOneChance` (:216, :273), `pendEnd` and every use (:221, :352, :472-474, :547-550), the one-chance block of
   `restarted()` (:359-362); `broke()` (:544) shows `RULE_BROKEN_TITLE` for a rule's break and a new exported
   `SECTION_RESTART_TITLE = 'SECTION RESTART'` when `tracker.lastRule < 0` (the protected restart); `over` is set only by
   the extraction. Update the header (:16-21: the restart, the move after a decoy read or a target's kill on a ruled
   step, the protected restart after a knock-out).
   Constructor (:250-273): build `spookFlag` (string per step, '' when none, built once from `spookFact`) BEFORE the
   `for (const f of this.runner.flags)` loop (:255-258), and skip the spook facts in that loop (`if
   (this.spookFlag.includes(f)) continue;`, constructor only, so it is fine to search), so a spook fact is never polled
   as a code; call `this.runner.keepOnRestore(spookFlag[i])` for each non-empty one. Build `targetRule` (Uint8Array per
   step, once): 1 when step i is an interrogate step with a target and a `namedTarget` rule has `step` = that step's id
   or no `step`. `spook()` (:593): when `spookStep >= 0` and its fact is not held, `this.runner.setFlag(this.spookFlag[st]!)`
   first (once; before the section-live check). Protected check in `tick()` (:463), after `this.spook()` and the exit /
   extraction block, before `tracker.update` (:506): loop the steps; skip unless `targetK[i] >= 0`, `targetSec[i] ===
   host.index()` and `!runner.isDone(i)`; `const e = host.slotGuard(targetK[i])`; skip a null `e`. Then:
   - `!e.alive && targetRule[i]` (killed before he talked, a rule covers his step; the page Michael signed): `if
     (this.tracker.onTargetKilled(i)) this.runner.spookStep = i;` and stop the loop. The same tick's `tracker.update`
     breaks the rule; the restart then bolts him (`spook()` sets the spook fact and moves the respawned target), as
     after a decoy read. A false return (the scope held) leaves `spookStep` alone; the check runs again next tick.
   - else `!e.alive || e.ko` (a knock-out, or a kill on a step no rule covers): `tracker.onProtected()` and stop. It
     never touches `spookStep` (a knock-out neither moves him nor undoes an earlier move) and never hits the rule (A2 =
     #372 A24).
   No allocation in the loop. `kill()` and `intel()` stay as they are.
6. `tallowWharfMissions.ts`: tgc-2 `text` (:57) = `Which grey coat is Pell's? The warden's gallery office, the tea stall by
   the canal steps` (88); tgc-3 `boltText: "Take the grey coat with the black umbrella in the clock-mender's back
   loft"` (74) with a comment citing Michael's ~18:05 pick "He moves" and G336. (`tgc-opt` / `tkl-opt` are already
   `optional: {}` from R0.)
7. Docs: the four TGC / TKL files are already #372's copy on your base (B0 at R0 merged a1696b14, with `"optional": {}`,
   the Q19 lines and the restored TGC rule text). Add your lines to them, nothing else: TGC `graph.json` tgc-2 `text`
   as step 6 and tgc-3 `"boltText"` (same string); TGC `BEAT.md` the step 2 objective-list line (as tgc-2), under
   "Breaking it" (:17-21) one line "After the move tgc-3 reads: Take the grey coat with the black umbrella in the
   clock-mender's back loft", and the engine note's flag name `tgc-spooked` -> `tgc-3-spooked` (:20, the step's spook
   fact, kept on restore). Leave the "Breaking it" kill wording (:17) and the "Teale knocked out before he talks"
   bullet (:22-25, A24) exactly as #372 has them: the engine follows both. Never touch `SIGNOFF.md`. TKL: nothing.
   `tests/tallowWharf/sectors.test.ts` must pass unchanged (text, optional reward and rules compare).
8. Tests:
   - `ruleTracker.test.ts`: delete the window case (:129) and the one-chance cases (:196-210), drop `RULE_END` from the
     import (:4); add `onProtected` (RULE_RESTART once;
     `PROTECTED_LINE`; `lastRule` -1; `breaks` and `kept` unchanged; ignored while held; cleared by `resetSection`;
     `restartTeam` undefined); `onTargetKilled(step)` on a def with a step-scoped `namedTarget` rule (RULE_RESTART on
     the next `update`, the rule's `breakLine`, `breaks` 1, its kept bit clear, `lastRule` = the rule; returns false and
     hits nothing while held; a different step's rule is not hit).
   - `sectorMission.test.ts`: drop `MISSION_FAILED_TITLE` (:5), the one-chance case (:433-437) and any fake `fail`; add
     with a fake host on THREE_GREY_COATS (the two TGC cases are split, as the page Michael signed and A24 split them):
     - Teale knocked out before tgc-3 -> banner SECTION RESTART, `PROTECTED_LINE` said, `breaks` 0,
       `tracker.kept(SCOPE_MISSION)` bit 0 still set, `spookStep` -1, restart after `MISSION_RESTART_HOLD`, after
       `restarted()` and the next tick the fake host's `bolt` is never called (Teale back at his table), tgc-3 open with
       its reading-room text.
     - Teale killed before tgc-3 -> banner RULE BROKEN, "Named target broken. ..." said, `breaks` 1, bit 0 clear,
       `spookStep` = tgc-3's index, restart after the hold, the next tick bolts the respawned Teale (`bolt` called with
       [65, 4.5, 76.75]), the spook fact held, tgc-3's `objectiveRows` text the `boltText`; one break only, however many
       ticks he lies dead before the restart.
     - Teale killed while the mission scope is held (just after a restart) -> nothing that tick; the break (and the
       move) on the first tick after the hold.
     - A decoy read (Garrow) -> the same RULE BROKEN, bolt and moved row as the kill.
     - A decoy read, then Teale knocked out at the bolt point -> a protected restart (`breaks` stays 1) and the move
       kept (bolted again); a decoy read, then Teale killed at the bolt point -> a second break (`breaks` 2), bolted
       again.
     - Killed or knocked out after tgc-3 is done -> nothing.
     - A def whose interrogate step has no `namedTarget` rule (a copy of the TGC def with `rules: []`): its target killed
       -> the protected restart (SECTION RESTART, `breaks` 0, no move).
     - Fenn or Garrow knocked out or killed -> no protected restart (a kill counts only under the mission's own rules);
       a bolt (the spooked target despawned and respawned) -> no break; `slotGuard` null -> no break; Teale knocked out
       in the same tick his intel completes the step -> no break; a restart the adapter did not ask for only restores;
       the spook fact survives the restore and is not in the poll list.
   - `missionRunner.test.ts`: a fact no condition reads (the spook fact) is in `facts`, `factBits` and `applyWire`, and a
     `keepOnRestore` flag survives `restore`; the existing fact cases keep their bit order.
   - `missionDef.test.ts` (:134): `oneChance` and `window` are unknown kinds; `boltText` checks (non-interrogate, no
     bolt, too long); `factsOf` order (gives first, then spook facts); a campaign reward is an error, a Sector Ops reward
     is fine.
   - `missionText.test.ts` (:23): no window rule; `breakLine` one argument; `PROTECTED_LINE` <= 90; `stepLine(.., true)`
     gives the `boltText`; a client runner that applied the host's wire (`packMission` / `applyMissionWire` after the
     spook, for a decoy read and for a kill) shows the moved row; THREE_GREY_COATS tgc-3 `boltText` equals the TGC
     `graph.json` `boltText`.

Checks: `npm run typecheck:fast`; `npx vitest run tests/mission/ tests/tallowWharf/sectors.test.ts tests/missionNet.test.ts
tests/missionNet3.test.ts tests/missionFlags.test.ts tests/sectorRatingHost.test.ts --maxWorkers=2`; `git grep -n
"oneChance\|RULE_END\|MISSION_FAILED\|'window'" -- src tests` prints only sync-step `window` fields.

Done looks like: the checks above green; the grep clean; the behaviour in section 3 R1.

### Brief R2: campaign profile (Opus 5.5)

Owned files: `src/game/mission/campaign.ts` (new), `src/game/modes/sectorMode.ts`, `src/main.ts`,
`tests/mission/campaign.test.ts` (new). Do not edit any other `src/game/mission/*` file (R1 owns them; import only
existing exports: `MissionDef`, `TeamId` from `missionDef.ts`, `objectiveRows` from `missionText.ts`, `MissionRunner`),
`src/ai/*` (J15 owns `gear.ts`), `src/net/*`, or `sectors.ts`.

Read first: BRIEF A6-A10, A12; DECISIONS G2, G126, G155, G336, G351, G359 (origin/master); ROADMAP Decided on
origin/feature/menu, entry "Folded plan, the other 30" (Q12 "No, armed only", Q19 "None"); CONFORMANCE rows MF5, MF15,
MF21, TW7, TW16 and "B. Campaign entry size"; `sectorMode.ts` lines 240-270, 300-370, 700-830, 930-1000, 1040-1160;
`src/game/reviveClock.ts`; `src/main.ts` 440-470 (FLG's `mapBootAllowed` gate at :449-450).

Do:
1. New `src/game/mission/campaign.ts` (pure, Babylon-free, no net imports, header comment citing G2, G126, G155, G359, Q12,
   Q19):
   - `export const CAMPAIGN = { maxAlive: 32, revives: REVIVES_PER_MISSION, shieldLead: false } as const` (comment: G359
     "a ceiling, not a target"; named here so a campaign entry outside SectorMode keeps it).
   - `isCampaignMission(def: MissionDef | null | undefined): boolean` (`def?.mode === 'campaign'`);
     `isCampaignMap(missions: readonly MissionDef[] | undefined): boolean` (non-empty and every mission campaign).
   - `campaignStartBlock(missions, missionId: string | null, players: number): string | null`: null when neither the map
     is a campaign map nor the picked mission is campaign; else `'Pick a campaign mission'` when no campaign mission of
     the map has that id, `'Campaign missions need exactly two players'` when `players !== 2`, else null. No flag
     argument: both callers sit behind FLG's gates (main.ts:449-450, session.ts:107).
   - `campaignReviveCap(def, syringes: number): number` (`CAMPAIGN.revives` for a campaign mission, else `syringes`).
   - `campaignGrant(g: Grant): Grant` zeroes `gadget`, `syringe`, `medkit`, `alarmStep` in place and returns it (import
     the `Grant` type from `../rating/sectionRating` where sectorMode gets it).
   - `campaignResponseKinds(kinds: EnemyKind[], n: number): void` sets the first `n` to `SECTOR_REINFORCE_KIND`
     (import type `EnemyKind`; the const from `../sectors`), no allocation.
   - `missionSectionLine(runner: MissionRunner, viewer: TeamId): string`: the text of the first row of
     `objectiveRows(runner, viewer, false)` that is not done and not optional; when there is none (at `beginSection`
     the new section's steps may still be locked, since `begin()` snapshots without `runner.update`), the `stepLine` of
     the def's first step of `runner.section` that is required, not done and seen by `viewer` (team `all` or the
     viewer's); else `''` (called once per section start; allocation there is fine, say so in the comment; it shows
     R1's moved line when the step is spooked).
2. `sectorMode.ts` (keep every change inside a campaign / mission branch; Sector Ops runs must not change):
   - `start()` (:326-328): `em.maxAlive = isCampaignMission(this.mission?.def) ? CAMPAIGN.maxAlive : SECTOR.maxAlive`.
   - `raised()`: after `const nt = responseTeam(stage, send, this.teamKinds)` (:973), when the mission is campaign call
     `campaignResponseKinds(this.teamKinds, nt)` (comment: Q12 "No, armed only"; J15's `shieldFrom` stays upstream).
   - `rate()`: after `rewardsFor(...)` (:1062-1067) and the A9 line, `if (isCampaignMission(this.mission?.def))
     campaignGrant(r)` (comment: Q19 "None"; the card still shows the marks).
   - `beginSection` banner (:771): when a mission runs, the subline is `missionSectionLine(this.mission.runner,
     this.mission.viewer())` (title unchanged; an empty line leaves only the title); else `s.objective.label` as now.
   - No other line changes (R6 later changes the objective line and the mission HUD mount: leave them).
3. `src/main.ts`: leave FLG's gate (:449-450) and the `?net=local` branch (:451-460, R4's session gate) as they are.
   Inside `} else if (autostart) {` (:461), when `flags.mode === 'sector'`: `const block =
   campaignStartBlock(getMap(autostart).missions, missionParam(), 1)`; with a reason, `goToMenu()` and
   `app.toasts.show(block, 'warn')` instead of `startGame`; else `startGame` as now.
4. `tests/mission/campaign.test.ts`: `CAMPAIGN.maxAlive === 32` (G359; pinned, not `=== SECTOR.maxAlive`, so a Sector
   Ops cap change never moves the campaign) and `<= MAX_ENEMIES` (import from `src/net/protocol`); `CAMPAIGN.revives ===
   REVIVES_PER_MISSION`; `isCampaignMap(WHARF_MISSIONS)` true, `isCampaignMap` of a campus mission list false, `[]`
   false; `campaignStartBlock` table (unknown id, no id, 1 / 3 / 4 players, 2 players ok, a non-campaign map null, a
   sector mission null); `campaignReviveCap` both ways; `campaignGrant` zeroes; `campaignResponseKinds` rewrites only
   the first `n` (and `'enforcer'` never survives); `missionSectionLine` on a TGC runner at W1 = tgc-1's text, at W3 =
   '' (TGC has no W3 step), done steps skipped, and right after `begin()` of W2 (before any `update`) = tgc-2's text,
   not ''; a Sector Ops test mission with team steps gives each viewer its own team's line.

Checks: `npm run typecheck:fast`; `npx vitest run tests/mission/campaign.test.ts tests/sectorRatingHost.test.ts
tests/sectorRestart.test.ts tests/sectorStep3.test.ts tests/sectors.test.ts tests/missionFlags.test.ts --maxWorkers=2`.

Done looks like: the checks green (`missionFlags.test.ts` unchanged); a reviewer finds every SectorMode change behind
`isCampaignMission` or `this.mission`; `?autostart=tallowWharf&mode=sector&missions=1` (solo) reaches the menu with the
reason, and without `?missions=1` FLG's menu as before (the lead confirms on the laptop through `e2e-menus` / a one-off
step).

### Brief R3: dogs out and the campaign guard check (Sonnet 5.5)

Owned files: `src/world/maps/tallowWharfSectors.ts`, `src/game/sectors.ts` (only `checkSectors` and
`checkSectorGuards`), `tests/tallowWharf/sectors.test.ts`, `tests/campaignGuards.test.ts` (new). Do not edit
`tallowWharfMissions.ts`, any section geometry file (`tallowWharfW1-4.ts`, `tallowWharfKit.ts`, `tallowWharf.ts`), any
docs (the SPEC / graph / SIGNOFF text is J8's), the `sectors.ts:84-90` comments (Guard AI's J1 doc row), or anything
else.

Read first: BRIEF A11, A12; DECISIONS G155 (origin/master: "No heavies or dogs in co-op missions", narrowed to the
campaign by G297 / G307); CONFORMANCE rows TW1, MF4, TW16; `tallowWharfSectors.ts` 60-240 and 300-394; `sectors.ts`
545-600.

Scope rule: J8 owns Tallow geometry, lights and the pages and starts after J7. You change guard kinds, roles, reasons
and one objective label only. No x / z / y / route point, door, light or room may move.

Do:
1. W3 (:145-148): the comment becomes "0 the yard watchman, 1 his mate at the lodge end"; guard 0's reason
   "Yard watchman: the east yard and the gate lodge"; guard 1 = `walker([[112.5, 46], [109.5, 46]], { zone: 'yard', role:
   'patrol', reason: "Yard watchman's mate: walks the lodge end of the yard", yaw: PI / 2 })` (default kind `grunt`, no
   `handler`, same points and yaw, so the takedown spot is computed as before). `dogs: 1` (:366) -> `dogs: 0`.
2. W4 (:165-168): the comment "0 the yard watchman, 1 and 2 the yard patrol, 3 the crane watchman, 4, 5 Pell's
   minders"; guard 1 `role: 'patrol', reason: 'Yard patrol: walks the shed doors end to end'`; guard 2 =
   `walker([[51.5, 20.5], [67.5, 20.5]], { zone: 'shed-yard', role: 'patrol', reason: 'Yard patrol on the canal side of
   the yard, a pace off his mate' })` (kind `grunt`, no `handler`). `dogs: 1` (:390) -> `dogs: 0`.
3. W1 objective label (:310) -> `Take the tally book from the warden's gallery office` (52; G336 what and where; the
   same place name as Three Grey Coats' tgc-2). Coordinates unchanged.
4. `sectors.ts`: `checkSectors(defs, nav?, security?, mode: 'sector' | 'campaign' = 'sector')` (:549) passes `mode` to
   `checkSectorGuards(d, mode)` (:577; default `'sector'`, so every existing call is unchanged). In campaign mode: a
   quadruped is `${d.id}: guard ${k} is a dog (G155: no dogs in the campaign)` and `(d.dogs ?? 0) > 0` is
   `${d.id}: dogs ${d.dogs} in a campaign section (G155)`; heavies stay an error in both modes. Update the doc comments
   (:129-135, :577-581) to say the campaign allows none.
5. `tests/tallowWharf/sectors.test.ts` (:109-111): title "dogs 0 everywhere"; expect `[0, 0, 0, 0]`; add: no guard of
   any section is a quadruped (`ENEMIES[g.kind].quadruped` falsy), none has a `handler`, `W3:1` and `W4:2` are `grunt`
   with a weapon; `checkSectors(WHARF_SECTORS, undefined, undefined, 'campaign')` is `[]`. Every other test in the file
   must pass unchanged (counts W3 10, W4 12; spots, routes, boxes).
6. `tests/campaignGuards.test.ts`: campaign mode rejects a dog (with handler), a heavy and `dogs: 1`; sector mode still
   allows a dog with `dogs: 1` and a handler; every map in `MAPS` whose `missions` are non-empty and all `mode ===
   'campaign'` passes `checkSectors(map.sectors!, undefined, undefined, 'campaign')` (inline the campaign test, do not
   import `campaign.ts`); and per mission, for every campaign mission of any map (a campaign mission on a mixed map is
   caught too): every guard slot its `guards` list spawns (`missionSpawnsGuard`, or the mission's `guards[].slots`
   read inline) is neither a quadruped (`ENEMIES[g.kind].quadruped`) nor `kind === 'heavy'`.

Checks: `npm run typecheck:fast`; `npx vitest run tests/tallowWharf/ tests/campaignGuards.test.ts tests/sectors.test.ts
tests/sectorGuardTags.test.ts tests/campusS1.test.ts tests/campusS2.test.ts --maxWorkers=2`; `git diff --stat` shows
only the four owned files.

Done looks like: the checks green; `git grep -n "'dog'" -- src/world/maps/tallowWharf*` empty; no coordinate changed
(the diff shows kinds, roles, reasons, `dogs` and the W1 label only).

## 12. Polish list (not blocking; from the plan checks)

Applied in fix round 2 (kept here as a record): the per-mission campaign guard check (R3 step 6); the section banner
before `runner.update` (R2 step 1 `missionSectionLine` fallback and its test); Guard AI's read of R3 (section 2); the
walk path for "walk the map once built" (section 9, "Walking it"); the HG7 / HG8 owner (lead ruling: J7 owns the engine
side, the hint and the rules-line rows; J3b the popup and the hook; section 7, A13); R1's spook fact kept out of the
poll loop; R5 stops instead of editing R6's files; R0 from the current engine head; the PR D checker reads the wire
path; J8 gets W3 guard 1's beat and the J8-J9 plan's A-number fix (section 9).

Still open:
- TGC break line: BEAT's "Wrong man. Pell's courier has bolted. Back to the arcade, both of you." vs the generic
  "Named target broken. ..."; an optional per-rule line (a `MissionRule.breakLine?`, story text under G82). Likewise a
  named line for the protected restart ("Teale is down. Back to the arcade.") instead of the generic `PROTECTED_LINE`.
  Both read better; neither blocks a walk.

## 13. Fix round 2 (re-check `C:/NightShift/scratch/campaign/j7-plan-recheck.md`, lead rulings)

| Item | Ruling / ask | Where it is answered |
| --- | --- | --- |
| Fix 1: a Teale kill before he talks follows the signed page | Option (a): a kill breaks the rule, counts, and he moves to the clock-mender's back loft ("He moves"); a knock-out restarts W2 with him at his table, not a break (A24, to confirm with Michael; undo: treat a knock-out like a kill). Cite #372 a1696b14, not 26969f6a | Section 0 TGC row (a1696b14 SIGNOFF.md:41-45, BEAT.md:17-25, BRIEF.md:98-101); slice table R1 / R7; section 3 R1 (kill branch: `onTargetKilled`, `spookStep`; knock-out branch: `onProtected`) and its done lines; section 3 R7 (knock-out, then kill, then decoy read); section 6 PR D / PR E; section 8 BRIEF edits A2, A3, A17, A18 and the Michael-picked quote; section 9 "Needs Michael" (A24 with a one-click question) and the J8 line (P1 must not rewrite the TGC page); section 10 (one break per kill, the hold); section 11 R1 Why, Do 4, 5, 7, 8 (split tests). The old "signed page makes it a protected restart" wording is gone from section 0, the BRIEF's A2 (via R0) and the R1 brief |
| Fix 2: one order for the #372 merge (B0) | B0 runs at J7 R0, by Campaign Build; R0 also drops the Tallow optional rewards (Q19) so `sectors.test.ts` stays green; R1 step 7 adds its lines to the files already on the base | Section 2 R0 row and "R0 in full" (the merge, the reward commit incl. the `reward?` type change :52 / :247 that `optional: {}` needs to compile, checks, the cut); FD row; section 3 R1; section 4 PR D base; section 8 A17, A20; section 9 J8 line; section 10; section 11 common lines and R1 Do 1, 6, 7. The J8-J9 planner is told the same by the lead |
| Fix 3: the field-menu interface with hud-guidance PR B | R6 uses B4's names (`GameMode.objectiveLines` / `NetAttachment.objectiveLines`) and adds the mission's lines through that hook, never its own `GameState.objectiveLines()`; a mission run shows mission rows, never sector rows (HG8); J7 owns `setObjectiveHint` and the rules-line / hint display; order: B4 before R6, or R6 against B4's names on hud-guidance-b | Section 0 G343 row; claims (gameMode.ts, hud.ts, pauseScreen.ts; overlaps name B1, B4, B5 and J3b on ui.md); slice table R6; section 3 R6 (hook, hint with files and lines, rules-line / hint rows); section 6 PR F; section 7 (owners, the exact shared text, method placement above `dispose()`, the resolved bodies, the hint toggle at the B1 merge, the order); section 8 A13, A21; section 10. The hud-guidance PLAN (`feature/hud-guidance-b`) "B4" and "Engine rebase cost" carry the same text and order |
| R0 base | Cut from the current engine head (`git rev-parse origin/feature/mission-engine`), not 8f40303f | Header; section 2 R0; section 4; section 11 common lines |
| Polish: spook fact polled as a code | Skip `-spooked` facts in the :255 loop | Section 11 R1 Do 5 (`spookFlag` built before the loop, skipped in it); R1 test "not in the poll list" |
| Polish: R5 fallback edits R6's files | R5 stops and reports | Section 3 R5 |
| Polish: J8-J9 plan's "A10" / "A13" | Now A11 / A14 | Section 9 J8 line (for the J8-J9 planner; J7 does not edit that file) |
| Polish: PR D changes `ms.f` with one checker | The PR D checker also reads the wire path | Section 2 checkers line; section 4 PR D row |
| Polish: W3 guard 1 paces a 3 m line | J8 gives him a proper beat (no geometry in J7) | Section 9 J8 line |
| Polish: first check's section 12 items | Applied where cheap | Section 12 (record), R2, R3, sections 2 and 9; the per-rule break lines stay open |
