# J7 mission-rules: plan (mission-engine rule fixes, dark)

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, 2026-10-25; plan check fix round the same day (checker verdict
FIX, `C:/NightShift/scratch/campaign/j7-plan-check.md`, items 1-7 below). This file is the draft for
`docs/mission-rules/PLAN.md` on `feature/mission-rules`; the job's BRIEF is `docs/mission-rules/BRIEF.md` (Michael said /
Michael picked, assumed decisions A1-A19 with their undo); R0 commits both there before the builders start.

Code base read: `origin/feature/mission-engine` 8f40303f (= `origin/feature/mission-engine-flg-gb6`: c74ce8f5 + the
FLG fix f8b06637, PASS from FLG checkers A and B, + this plan; the engine is stacked on PR #372
`feature/mission-framework`, whose head ab90a071 is 10 docs-only commits past the engine's merge base aa762a41). Every
file:line below is on 8f40303f. Rules read from origin/master (RULES "Intake" / "A job" / "Test tiers", CLAUDE.md,
agent-preamble, VISION, DECISIONS). Scope: FOLDED-PLAN (origin/feature/menu) section 4 row J7 and section 3 breaks 10-14,
17, plus C S19 (shield) and M K3 (cap); detail rows from `origin/master:docs/conformance-campaign/CONFORMANCE.md` S2-S8,
S12, S19, MF15, MF21, HG7, HG8, 1d item 2, Part B; Michael's answers in ROADMAP Decided ("Folded plan SIGNED OFF",
"Folded plan, the other 30", "Mission sign-off pages" ~18:05); the signed mission pages on #372
(`docs/missions/prototypes/three-grey-coats/{BEAT,SIGNOFF}.md` and the others).

## 0. What Michael decided that binds J7 (verbatim option text; the quotes are in BRIEF.md)

| Source | Michael picked / said | J7 effect |
| --- | --- | --- |
| G155 | "Adopt CT's way" (narrowed to the campaign by G297 / G307) | dogs out of Tallow; campaign guard check |
| G290 | a broken rule restarts the section, the mission continues | `oneChance` (ends the mission) goes |
| G334 | "Soft windows only" | `window` rule kind (a countdown) goes |
| G126 | "30-second revive, 2 per mission" | campaign revive cap 2, not syringes |
| G2 | "2 player coop campaign only, unable to be completed solo." | exactly two players at a campaign start |
| G145 + G353 | "Protected until their role is done." + (7) "Section restart" | the interrogation target down before his step restarts the section; no softlock |
| TGC ~18:05 | "He moves (Recommended)" (after a broken rule W2 restarts with Teale in the clock-mender's loft) | after the rule's break (a decoy read) the restart puts Teale at his bolt point and tgc-3's line names the loft (A18); a Teale kill or knock-out before tgc-3 is not a rule break: the signed page (#372 BEAT.md:22-25, SIGNOFF.md:42-43) makes it a protected-character section restart, uncounted, no move, Teale back at his table (A2) |
| Q8 | "None on Mission 1 (Recommended)" | no civilians; protected = the interrogation target only (A1); a decoy knock-out never restarts |
| Q12 | "No, armed only (Recommended)" | no riot-shield lead in a campaign mission |
| Q19 | "None (Recommended)" | no optional rewards, no section-rating grants in the campaign |
| G359 | "32 alive, ..." | campaign cap named (`CAMPAIGN.maxAlive`, pinned to 32) |
| G336, G351 | "What and where" | Tallow tgc-2 line with a place; the section banner shows the mission's step; tgc-3's moved line |
| G343 + HG7 / HG8 | objectives fade in; the full list lives in the field menu | engine side of the popup feed and the field-menu list (J3b owns the popup) |
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
  - src/game/sectors.ts
  - src/game/gameState.ts
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
(the `MAX_ALIVE` comment is Guard AI's J1 doc row), `src/ui/hud/hud.ts`, `src/ui/screens/pauseScreen.ts`,
`src/input/**` (J3b), `src/net/protocol.ts` (J4 coop4 capacity), `src/game/mission/missionWire.ts` (no shape change),
`scripts/mission-validate.mjs` and `docs/level-validator/mission-schema.md` on `feature/mission-validator` (J12's
mission-validator re-cut drops `oneChance` / `window`; J7 sends J12 the note), every Tallow geometry / light / SPEC /
SIGNOFF / campaign-map graph file (J8 owns geometry, lights and the pages and starts after J7; J9 the shutters; J23).

Claims overlaps for the orchestrator (all on master-shared files; J7's PRs sit on the engine branch, so they meet master
only when PR C goes through the train): J3 / J3b on `gameState.ts`, `sectorMode.ts` (blips gate, HG3), `coopClient.ts`
(HG9 status line), `coopHost.ts` (ally blips); J4 (#317 coop4) on `session.ts` capacity; J6 on `coopHost.ts` /
`coopClient.ts` hot paths; Guard AI's J1 doc row on `src/game/sectors.ts:84-90` comments (R3 edits sectors.ts :129-135
and :549-598 only, separate hunks). Small, separate hunks; the train's conflict rule settles them.

## 2. Slices

Branches: `feature/mission-rules` (PR D), `feature/mission-rules-net` (PR E, cut from PR D's head),
`feature/mission-rules-hud` (PR F, cut from PR E's head), in `C:/NightShift/Mobile-Coop-mission-rules`; parallel
slices in their own worktrees `feature/mission-rules-<slice>`; the lead merges them. No two slices that run at the same
time touch one file.

| Id | What | Model | Files owned | Est lines / h | PR | Group | Depends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | Cut `feature/mission-rules` from origin/feature/mission-engine 8f40303f (the FLG fix f8b06637 is in; nothing to push); commit `docs/mission-rules/{BRIEF,PLAN}.md` | lead (no agent) | `docs/mission-rules/{BRIEF,PLAN}.md` | 0 / 0.1 | - | - | plan checker PASS |
| R1 | Rules core: drop `oneChance` / `window`; the interrogation target down before his step restarts the section (a built-in protected restart: uncounted, no move); the moved line after a decoy read (`boltText`, spook fact); campaign optional objectives carry no reward; Tallow mission data (tgc-2 place, rewards out, tgc-3 moved line) | Opus | `src/game/mission/{missionDef,missionRunner,ruleTracker,missionText,sectorMission}.ts`; `src/world/maps/tallowWharfMissions.ts`; TGC / TKL `graph.json` + `BEAT.md`; `tests/mission/{missionDef,missionRunner,ruleTracker,missionText,sectorMission}.test.ts` (+ `missionWire.test.ts` only if a fact case breaks) | ~600 / 4.5 | D | P1 | R0 |
| R2 | Campaign profile: `campaign.ts` (cap 32, revives 2, no shield lead, no grants, the start gate, the section line); SectorMode uses it (cap, response kinds, zero grants, mission banner); solo campaign refusal in `main.ts`'s autostart branch | Opus | `src/game/mission/campaign.ts` (new); `src/game/modes/sectorMode.ts`; `src/main.ts`; `tests/mission/campaign.test.ts` (new) | ~350 / 3 | D | P1 | R0 |
| R3 | Dogs out of Tallow (two armed humans on the same posts); W1 sector label with a place; mode-aware guard check (`checkSectors(..., 'campaign')` rejects quadrupeds and `dogs > 0`) | Sonnet | `src/world/maps/tallowWharfSectors.ts`; `src/game/sectors.ts` (`checkSectors`, `checkSectorGuards` only); `tests/tallowWharf/sectors.test.ts`; `tests/campaignGuards.test.ts` (new) | ~200 / 1.5 | D | P1 | R0 |
| FD | PR D docs: fragment, job STATE, `docs/missions/BRIEF.md` A10 / A12 and `docs/missions/PLAN.md` :37 / :78 / :217 (only what #372's 26969f6a did not already rewrite: take #372's lines verbatim), TESTING.md line | Haiku | `changes/feature-mission-rules.md`, `docs/mission-rules/STATE.md`, `docs/missions/{BRIEF,PLAN}.md`, `TESTING.md` | docs | D | after P1 | R1-R3 |
| R4 | Exactly two players: session refuses a campaign start unless 2 are in the room, before the phase changes; campaign room capacity 2 (holds after coop4); the lobby shows why | Opus | `src/net/session.ts`; `src/net/coopUi.ts`; `tests/campaignSession.test.ts` (new); `tests/missionNet3.test.ts` (the Tallow cases that start alone or with no mission) | ~300 / 3 | E | P2 | R1, R2 merged on PR D's branch |
| R5 | Campaign revives: cap `CAMPAIGN.revives` (2) at every difficulty, window 30 s; `addSyringes` does nothing in a campaign mission | Opus | `src/net/coopHost.ts` (constructor :203, `addSyringes` :858); `tests/campaignRevives.test.ts` (new) | ~150 / 1.5 | E | P2 | R2 merged |
| R6 | Popup feed and field-menu list (HG7, HG8): `missionFeed.ts` (with `missionViewerTeam` moved in); the always-on mission list removed (host and client); the current objective on the objective line; the full list (rules line + steps) in the field menu; hint via J3b's optional `setObjectiveHint` | Opus | `src/game/mission/missionFeed.ts` (new); `src/game/modes/sectorMode.ts`; `src/net/coopClient.ts`; `src/game/gameState.ts` (`objectiveLines`, `NetAttachment`); delete `src/ui/hud/missionHud.ts`, `src/ui/hud/missionHudMount.ts`, `tests/missionHud.test.ts`, `tests/mission/missionHudMount.test.ts`; `tests/mission/missionFeed.test.ts` (new) | ~800 incl. ~390 deleted / 4 | F | P2 | R1, R2 merged (sectorMode, missionText settled) |
| R7 | PR E e2e: Teale knocked out before tgc-3 restarts W2 with Teale back at his table and no break counted; a decoy read breaks the rule and W2 restarts with Teale at his bolt point and the moved line on host and client; a decoy knock-out restarts nothing; a host alone cannot start (the lobby stays `lobby`, the match starts once the client is in); `revivesLeft` is 2 on Realistic; no dog spawned; the W3 banner on TGC is not the ledger line | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~220 / 2 | E | after P2 | R4, R5 (and PR D) |
| FE | PR E docs (fragment, STATE, `docs/systems/coop.md` campaign start line) | Haiku | `changes/feature-mission-rules-net.md`, STATE, `docs/systems/coop.md` | docs | E | after R7 | R7 |
| R8 | PR F e2e flips: `.mission-hud` asserts become "objective line = the step text" (the moved line after R7's restart) and "the field menu lists the rules line and the steps" (`e2e-sectorops-mission.mjs` :45-52, wharf `clientHud` :260) | Sonnet | `scripts/e2e-sectorops-mission.mjs`; `scripts/e2e-sectorops-wharf.mjs` | ~150 / 1.5 | F | after R6, R7 | R6, R7 |
| FF | PR F docs (fragment, STATE, `docs/systems/ui.md` mission lines, the J3b interface note) | Haiku | `changes/feature-mission-rules-hud.md`, STATE, `docs/systems/ui.md` | docs | F | after R8 | R8 |

Waves (full burn): **wave 1** R1, R2, R3 together (3 tsc / vitest builders). **Wave 2** as soon as R1 and R2 are merged
on `feature/mission-rules` (R3 may still run): R4, R5, R6 together, each from PR D's head (files disjoint: session /
coopUi / missionNet3; coopHost; sectorMode / coopClient / gameState / missionFeed). **Wave 3** R7 (after R4 + R5), then
R8 (after R6 and R7: both edit the wharf e2e). Fragments and STATE close each PR. Checkers: PR D one fresh Opus checker
(R1-R3 batch); PR E two independent Opus checkers (src/net); PR F two independent Opus checkers (src/net); PR C two fresh
Opus checkers on its final head (section 4). One fix round each.

## 3. Slice detail (what "done" is)

**R1 rules core (Opus).** `RuleKind` (missionDef.ts:68), `RULE_KINDS` (:128) lose `oneChance` and `window`;
`MissionRule.step` comment (:76) says namedTarget only, `seconds` (:78-79) goes, `checkMission`'s window branch
(:326-329) goes. RuleTracker: `RULE_END` (:36), `outcome` RULE_END, `ended` (:84-85), `endsOnRestart` (:97, :116-118),
`onFail` (:255-262), the window read (:286-290) and the end branch (:292-299) go; every break returns `RULE_RESTART`.
Header comments (:1-16) rewritten. New `onProtected()` (A2 / A3: the built-in protected restart, not a rule break,
uncounted). SectorMission: `fail` (:158, binding :643),
`MISSION_FAILED_TITLE` (:176), `hasOneChance` (:216, :273), `pendEnd` (:221, :352, :472-474, :547-550), the one-chance
block of `restarted()` (:359-362) go; a restart it did not ask for only restores state (the pending team if one waits).
New protected check in `tick` (allocation-free; reuses `targetSec` / `targetK`, :261-271): an interrogate step's target
down (`!alive || ko`) while the step is not done calls `onProtected()`: a section restart from the checkpoint with the
SECTION RESTART banner and `PROTECTED_LINE`, never a rule break (no `breaks` +1, `kept` untouched, no rule break line)
and no spook (a KO neither sets nor clears `spookStep`: an earlier decoy read's move stays, else he is back at his
table). No `MissionDef.protects` list (A1: decoys and everyone else may be knocked out). The moved line (A18, after a
decoy read only): `MissionStep.boltText`; `spookFact(step)` = `<step id>-spooked`, a fact after the
`gives` facts (`factsOf`), registered as a runner flag (missionRunner.ts:143-144, one line), kept on restore, set by
`spook()` (:593-603) while `spookStep` names the step; `objectiveRows` / `stepLine` show `boltText` while it is held, so
the host and a client (fact bits in `ms.f`) show the same line. Campaign `optional.reward` is an error (Q19);
`optional: { reward?: RewardKind }`. Tallow: tgc-2 text names both places (88 characters), `tgc-opt` / `tkl-opt` lose
their rewards, tgc-3 gets its `boltText` (74). Brief in section 11.
- Done looks like: no `oneChance` / `window` / `RULE_END` / `MISSION_FAILED` / `fail(` left in `src/` (git grep); Teale
  killed or knocked out before tgc-3 -> SECTION RESTART with "The man you need is down. Back to the section
  checkpoint.", `breaks` 0, `kept(SCOPE_MISSION)` bit 0 still set, W2 restarts after the hold, Teale respawns at his
  table (not bolted), tgc-3 open with its reading-room line; a decoy read -> RULE BROKEN with "Named target broken. Back
  to the section checkpoint.", `breaks` 1, bit 0 clear, the respawned Teale bolted to [65, 4.5, 76.75], tgc-3's row
  reads the clock-mender's back loft (host runner and a client runner fed the host's wire); after tgc-3 he is fair game;
  a decoy knocked out -> nothing; `npx vitest run tests/mission/
  tests/tallowWharf/ tests/missionNet.test.ts tests/missionNet3.test.ts tests/missionFlags.test.ts` green; typecheck
  clean.

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
built; else it sets the cap from SectorMode's bind through a `NetAttachment` hook and says so); `addSyringes` (:858)
returns at once for a campaign mission. `REVIVE_WINDOW` stays 30; `checkpoint()` keeps `used` (per mission, G126).
- Done looks like: unit tests at Rookie / Normal / Realistic / Perfectionist: cap 2 on a campaign mission, 3 / 2 / 1 / 1
  on Sector Ops; `addSyringes(2)` leaves a campaign cap at 2.

**R6 popup feed and field-menu list (Opus, src/net).** New pure `missionFeed.ts`: `missionViewerTeam` moves in from
`missionHudMount.ts:19` (same body; coopClient.ts:26 and its test import it from here); `MissionFeed.update(runner,
viewer, hints): boolean` (true only when the viewer's current objective changes; key = step index and runner `version`;
fills `text` and `hint` in place, no allocation per frame; the text comes from `stepLine(d, i, moved)` as R1 left it,
so the moved line shows after a spook) and `missionObjectiveLines(runner, viewer, hints): MissionLine[]` (`MissionLine
extends ObjectiveLine { note?: true; hint?: string }`: the rules line first with `note`, then every step of the mission's
sections so far, done / current / to do, the hint on the current line when hints are on). SectorMode (host / solo):
`setup()` (:790, :810) and the download line (:1320) do not write the sector label while a mission runs; `frameUpdate`
writes `g.hud.setObjective(feed.text)` on a change and calls `(g.hud as { setObjectiveHint?(t: string | null): void
}).setObjectiveHint?.(feed.hint)`; the `MissionHudMount` (:278, :366, :1328-1329, dispose) goes; a `missionLines()`
method. CoopClient: same feed from its mirror and its own viewer (Sector Ops teams differ from the host), the snapshot's
objective text is ignored while a mission mirror runs, the mount (:128, :225-230, :1002, :1171-1173) goes, a
`missionLines()` on the attachment. GameState `objectiveLines()` (:1244-1252): mission lines first
(`SectorMode.missionLines()` on the host, `net.missionLines?.()` on a client), then the existing branches.
`missionHud.ts`, `missionHudMount.ts` and their two tests are deleted (the `missionViewerTeam` cases move to
`missionFeed.test.ts`).
- Done looks like: in a mission the old `.mission-hud` panel never appears; the objective line shows the current step
  (both pages; the moved line after a spook); the pause menu lists "Rules: ..." then the steps; the line changes only
  when a step changes (no per-frame rewrite: `hud.objectiveText` stable across frames); the download percent still
  shows on a mission's download section.

**R7 / R8 e2e (Sonnet).** R7 adds to `scripts/e2e-sectorops-wharf.mjs`: (TGC W2, in this order) a knock-out of decoy Fenn
(W2:7) changes no `ruleRestarts` and no `breaks`; a host knock-out of Teale (W2:6) before tgc-3 -> SECTION RESTART, W2
restarts (`mission.ruleRestarts` +1, `breaks` still 0, `spook` -1, the "man you need is down" line, tgc-3 open), Teale
(alive, not knocked out) back at his reading-room table, more than 5 m from the bolt point, and the mission row still the
reading-room line; then a decoy read of Garrow (W2:8, through the suite's interrogation hook or `__mission.intel` with
his Enemy id) -> RULE BROKEN, W2 restarts (`breaks` 1, the "Named target broken" line, tgc-3 open), Teale stands within
1 m of the bolt point [65, 4.5, 76.75], and the mission row on host and client reads "Take the grey coat with the black
umbrella in the clock-mender's back loft"; (both) no live guard of kind `dog`; the host alone (before the client
joins) cannot start: `session.startMatch()` returns null, `session.phase === 'lobby'`, the Start button shows the
blocked text, and the match then starts on its own once the client is in (the rest of the suite runs on it);
`net.revivesLeft()` is 2 with the lobby on Realistic; the W3 banner on TGC does not contain "ledger". R8 flips the HUD
list asserts to the objective line (the moved line included) and the field-menu list.

## 4. PR split and stacking

| PR | Branch (base) | Slices | Est changed lines | Checkers | Laptop suites (`request.mjs`, `E2E_GPU=1`) |
| --- | --- | --- | --- | --- | --- |
| C (exists as a branch, not J7) | `feature/mission-engine` (on #372) | engine, kit, NET, Tallow greybox, then D + E + F | ~14k + ~2.8k | engine plan's, then two fresh Opus (src/net) on the head after F merges | engine plan's, plus the union of D / E / F's suites, on that head |
| D | `feature/mission-rules` (base `feature/mission-engine` 8f40303f) | R1, R2, R3, FD | ~1.15k | 1 Opus | affected-e2e + `e2e-sectorops` (1-6, mission, wharf-tgc, wharf-tkl), `e2e-section-rating`, `e2e-coop`, `e2e-netmove` (RULES checker gate for `src/game`), `e2e-menus` (autostart path) |
| E | `feature/mission-rules-net` (base PR D's branch) | R4, R5, R7, FE | ~670 | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops:mission`, `:wharf-tgc`, `:wharf-tkl`, `e2e-sectorops:1`, `e2e-menus` (lobby) |
| F | `feature/mission-rules-hud` (base PR E's branch) | R6, R8, FF | ~950 | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops` (all parts), `e2e-menus` (pause list), `e2e-coop-gpu` (objective-text waits, 4189) |

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
  src` empty); the interrogation target down before his step restarts the section (TGC: a protected restart, not a
  rule break, Teale back at his table); a decoy read breaks the rule and Teale moves to the clock-mender's back loft,
  and tgc-3 says so; a decoy knock-out restarts nothing; after the step he
  is fair game; Tallow spawns no dog and fails the campaign guard check if one is added; a campaign run caps at 32,
  sends no shield lead and grants nothing at connectors; the W3 / W4 banners on the wrong mission are gone; solo
  `?autostart=tallowWharf&mode=sector&missions=1` is refused; every listed laptop suite green; Sector Ops unchanged.
- **PR E:** a campaign mission starts only with exactly two, and a blocked start leaves the room in the lobby; the room
  holds two; revives are 2 at every difficulty and never topped up; the wharf e2e walks the Teale knock-out restart (no
  move, no break counted), then the rule's break, the move and the moved line on host and client; laptop co-op group
  and mission suites green; two Opus checkers PASS.
- **PR F:** no always-on mission list; the objective line carries the current step (the moved line included) on host
  and client; the field menu holds the rules line and every step; nothing rewrites the objective line per frame; suites
  green; two Opus checkers PASS. The J3b interface (section 7) is written into `docs/systems/ui.md`.
- **PR C (after F):** two fresh Opus checkers PASS and the laptop set green on its head (section 4).

## 7. Interface with J3b (hud-guidance PR B, planned separately on feature/hud-guidance)

J7 owns the engine side; J3b owns `hud.ts`, `pauseScreen.ts`, `src/input/**` and the popup's look and timing.
1. **Popup trigger.** The engine writes the viewer's current objective through `g.hud.setObjective(text)` only when it
   changes (`MissionFeed.update` true; a spook's moved line is a change). J3b's popup fades in on a text change and on
   View / O. A Sector Ops download line keeps its `" NN%"` suffix: J3b keys the popup on the text with a trailing
   `\s\d+%` removed (its HG9).
2. **Hint.** J3b adds `Hud.setObjectiveHint(text: string | null)` (a second line under the popup that fades with it).
   J7 calls it through an optional structural type, so PR F compiles before and after J3b lands; until then the hint
   shows only in the field menu.
3. **Field menu.** `GameState.objectiveLines()` returns the mission's `MissionLine[]` first when a mission runs (host:
   `SectorMode.missionLines()`, client: `net.missionLines?.()`), else J3b's Sector Ops section list, else today's
   branches. `MissionLine` adds `note?: true` (the rules line: no done / current state) and `hint?: string` (under the
   current line). J3b renders both; until it does, the rules line reads "To do" (dark, acceptable).
4. **Co-op status.** J3b moves "Connecting to host" off the objective line (HG9). PR F's client ignores the snapshot
   objective only while a mission mirror runs, so J3b's change and PR F's do not depend on each other.
5. **Order.** Either may land first. If J3b reaches master first, PR C's train merge brings it under PR F's calls; if
   PR F's base sees no `setObjectiveHint`, the optional call is a no-op.

## 8. Assumptions

A1-A19, each with its undo, are in `docs/mission-rules/BRIEF.md` (the only copy). The ones the fix round changed or
added: A1 (protected = the interrogation target only; no `protects` list), A2 (the target down before his step = a
protected section restart, not a rule break, no move; lead decision on #372's signed TGC page), A3 (how that restart
stays out of the rule counts), A9 (the solo refusal sits
behind FLG's gate), A11 / A17 (J8 owns geometry, lights and the pages; R1 starts the TGC / TKL docs from #372's copy),
A18 (the moved line and its fact bit), A19 (a blocked start stays in the lobby).

## 9. Blocked or needing Michael

- **J8's work (geometry, lights and the pages; starts after J7; the hold is lifted, "Build now, walk later"):** Q23
  "Force co-op" throw gaps (widen gaps or a solo-jump block: a map decision); Q2 "Never" dark spots and the real-site
  lighting re-base; gate reach ERRs; hide spots, medkit stations, encounter checkpoints; the campaign-map SPEC / graph /
  SIGNOFF dog and count text; the TGC / TKL SIGNOFF wording. J9: the shutters (so the perfect-run e2e, MF20, waits on
  J9). Nothing in J7 moves geometry.
- **Needs Michael:** nothing blocks. Logged for his next look: A4 (the two kinds go for Sector Ops missions
  too).
- **Hand-offs:** J12 (Marlow) drops the validator kinds (A15) and lets the mission validator pass tgc-3's new
  `boltText` field as it passes `bolt` (a non-validator field). Guard AI: G B1 / B7 / B11 / D4 close through R3 / R2 / R1
  / R4; J15's `shieldFrom` must leave a campaign override in SectorMode intact; TKL's porter reaction ("Hears and
  reacts") is Guard AI's. J3b: section 7.

## 10. Risks

- `sectorMode.ts` is Sector Ops Build's file: R2 and R6 keep to campaign / mission branches; Sector Ops runs are
  covered by `e2e-sectorops` 1-6 and `e2e-section-rating` on every PR. The lead tells Sector Ops Build which lines.
- The protected check could misfire on a target knocked out at the end of his own interrogation: the tick order is poll,
  `runner.update`, `stepEvents`, `spook`, the exit check, the protected check, `tracker.update`; the `intel` event
  completes the step before the check, and a unit test covers a knock-out in the same tick as the intel.
- A bolt (the spooked target despawned and respawned at the bolt point) must not read as a protected break: `spook()`
  runs before the check, and a unit test covers it.
- The spook fact adds one bit after the `gives` facts: missions without a bolt keep their bit order; the train bumps
  PROTOCOL_VERSION, so an old client never reads the new bit.
- PR C's size and its master conflicts (HG3's blips gate, J3 / J3b hunks) are the engine plan's; J7 adds small hunks
  only. #372's docs-only head (ab90a071) has TGC / TKL doc lines R1 also touches: R1 starts from #372's copy (A17).
- coop4 (#317, "Live now") may land on master first: R4's capacity rule must read whatever `capacity()` returns and
  clamp a campaign room to 2.

## 11. Briefs for the first three slices (strict, self-contained)

Each brief goes to a fresh agent with `docs/systems/agent-preamble.md` (origin/master) filled in as below. Common lines:
- Job `mission-rules`; lead "Night Shift | Campaign Build". Read `docs/mission-rules/BRIEF.md` (Michael said / picked,
  A1-A19) and this PLAN. Base: `origin/feature/mission-rules` (cut by R0 from origin/feature/mission-engine 8f40303f,
  which already carries the FLG fix f8b06637: do not redo FLG's gates). Your worktree:
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
- Line numbers below are on 8f40303f; read the code before editing and follow the symbol if a line moved.
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
replacements"; the TGC sign-off (`git show origin/feature/mission-framework:docs/missions/prototypes/three-grey-coats/SIGNOFF.md`,
Michael's pick "He moves (Recommended)"); the five owned source files in full.

Why: G290 (a broken rule restarts the section, the mission continues), G334 (soft windows only: no countdown) and G353
(killing a protected character restarts the section; G145 protects story people until their role is done). Today
`oneChance` can end a mission, `window` is a countdown, and killing or knocking out Teale (W2:6) before tgc-3 leaves
the step open forever (softlock). Michael's signed TGC page (#372 ab90a071, BEAT.md:22-25, SIGNOFF.md:42-43) makes a
Teale knock-out or kill before he talks a protected-character section restart (G353), listed apart from the strict
rule: it is not a rule break and he does not move (A2). "He moves" applies only after a broken rule (a decoy read): W2
restarts with Teale in the clock-mender's back loft, and the objective lines name the places (A18). Decoys
(Fenn W2:7, Garrow W2:8)
and everyone else may be knocked out (Q8 "None on Mission 1"; TGC BEAT "Knock-outs are allowed on anyone else").

Do:
1. `missionDef.ts`: remove `'oneChance' | 'window'` from `RuleKind` (:68) and `RULE_KINDS` (:128); `MissionRule.step`
   comment (:76) = "namedTarget: the interrogate step"; delete `seconds` (:78-79) and the `r.kind === 'window'` block of
   `checkMission` (:326-329). Make `optional?: { reward?: RewardKind }` (:52); keep the reward-kind check only when a
   reward is given; add: a campaign mission's optional step with a reward is an error
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
   the pending break. `restartTeam` is undefined when `lastRule < 0` (everyone).
5. `sectorMission.ts`: delete `fail` from `SectorMissionHost` (:158) and the binding (:643), `MISSION_FAILED_TITLE`
   (:176), `hasOneChance` (:216, :273), `pendEnd` and every use (:221, :352, :472-474, :547-550), the one-chance block of
   `restarted()` (:359-362); `broke()` (:544) shows `RULE_BROKEN_TITLE` for a rule's break and a new exported
   `SECTION_RESTART_TITLE = 'SECTION RESTART'` when `tracker.lastRule < 0` (the protected restart); `over` is set only by
   the extraction. Update the header (:16-21: the restart, the spook after a decoy read, the protected restart).
   Constructor (:260-273): build `spookFlag` (string per step, '' when none, built once from `spookFact`); call
   `this.runner.keepOnRestore(spookFlag[i])` for each. Confirm the spook fact is
   not in `reads`, so it is never polled as a code (:255-258). `spook()` (:593): when `spookStep >= 0` and its fact is
   not held, `this.runner.setFlag(this.spookFlag[st]!)` first (once; before the section-live check). Protected check in
   `tick()` (:463), after `this.spook()` and the exit / extraction block, before `tracker.update` (:506): loop the steps;
   skip unless `targetK[i] >= 0`, `targetSec[i] === host.index()` and `!runner.isDone(i)`;
   `const e = host.slotGuard(targetK[i])`; a non-null `e` with `!e.alive || e.ko` calls `tracker.onProtected()` and
   stops the loop. It never touches `spookStep` (a knock-out neither moves him nor undoes an earlier decoy read's move)
   and never hits the named-target rule. No allocation in the loop. `kill()` and `intel()` stay as they are (the decoy
   read in `intel()` is the only path that spooks).
6. `tallowWharfMissions.ts`: tgc-2 `text` (:57) = `Which grey coat is Pell's? The warden's gallery office, the tea stall by
   the canal steps` (88); `tgc-opt` and `tkl-opt` `optional: {}`; tgc-3 `boltText: "Take the grey coat with the black
   umbrella in the clock-mender's back loft"` (74) with a comment citing Michael's ~18:05 pick "He moves" and G336.
7. Docs: start each of the four TGC / TKL files from #372's copy (`git show
   origin/feature/mission-framework:<path> > <path>`, ab90a071: it already has `"optional": {}` and the Q19 reward
   lines), then add only: TGC `graph.json` tgc-2 `text` as step 6 and tgc-3 `"boltText"` (same string); TGC `BEAT.md`
   the step 2 objective-list line (as tgc-2), under "Breaking it" one line "After the move tgc-3 reads: Take the grey
   coat with the black umbrella in the clock-mender's back loft", and the engine note's flag name `tgc-3-spooked` (the
   step's
   spook fact, kept on restore). Leave the "Teale knocked out or killed before he talks" bullet as #372 has it (the
   engine follows it: a protected restart, no move). TKL: nothing beyond #372's copy.
   `tests/tallowWharf/sectors.test.ts` must pass unchanged (text, optional reward and rules compare).
8. Tests:
   - `ruleTracker.test.ts`: delete the window case (:129) and the one-chance cases (:196-210), drop `RULE_END` from the
     import (:4); add `onProtected` (RULE_RESTART once;
     `PROTECTED_LINE`; `lastRule` -1; `breaks` and `kept` unchanged; ignored while held; cleared by `resetSection`;
     `restartTeam` undefined).
   - `sectorMission.test.ts`: drop `MISSION_FAILED_TITLE` (:5), the one-chance case (:433-437) and any fake `fail`; add
     with a fake host on THREE_GREY_COATS: Teale knocked out before tgc-3 -> banner SECTION RESTART, `PROTECTED_LINE`
     said, `breaks` 0, `tracker.kept(SCOPE_MISSION)` bit 0 still set, `spookStep` -1, restart after
     `MISSION_RESTART_HOLD`, after `restarted()` and the next tick the fake host's `bolt` is never called (Teale back at
     his table), tgc-3 open with its reading-room text; killed -> the same; killed after tgc-3 is done -> nothing; a
     decoy read (Garrow) -> banner RULE BROKEN, "Named target broken. ..." said, `breaks` 1, bit 0 clear, restart, the
     next tick bolts the respawned Teale (`bolt` called with [65, 4.5, 76.75]), tgc-3's `objectiveRows` text the
     `boltText`; a decoy read, then Teale knocked out at the bolt point -> a protected restart (`breaks` stays 1) and the
     move kept (bolted again); Fenn or Garrow knocked out -> no break, no restart; a bolt (the spooked target despawned
     and respawned) -> no break; `slotGuard` null -> no break; Teale knocked out in the same tick his intel completes the
     step -> no break; a restart the adapter did not ask for only restores; the spook fact survives the restore.
   - `missionRunner.test.ts`: a fact no condition reads (the spook fact) is in `facts`, `factBits` and `applyWire`, and a
     `keepOnRestore` flag survives `restore`; the existing fact cases keep their bit order.
   - `missionDef.test.ts` (:134): `oneChance` and `window` are unknown kinds; `boltText` checks (non-interrogate, no
     bolt, too long); `factsOf` order (gives first, then spook facts); a campaign reward is an error, a Sector Ops reward
     is fine.
   - `missionText.test.ts` (:23): no window rule; `breakLine` one argument; `PROTECTED_LINE` <= 90; `stepLine(.., true)`
     gives the `boltText`; a client runner that applied the host's wire (`packMission` / `applyMissionWire` after the
     spook) shows the moved row; THREE_GREY_COATS tgc-3 `boltText` equals the TGC `graph.json` `boltText`.

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
     `objectiveRows(runner, viewer, false)` that is not done and not optional, else `''` (called once per section start;
     allocation there is fine, say so in the comment; it shows R1's moved line when the step is spooked).
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
   '' (TGC has no W3 step), done steps skipped.

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
   import `campaign.ts`).

Checks: `npm run typecheck:fast`; `npx vitest run tests/tallowWharf/ tests/campaignGuards.test.ts tests/sectors.test.ts
tests/sectorGuardTags.test.ts tests/campusS1.test.ts tests/campusS2.test.ts --maxWorkers=2`; `git diff --stat` shows
only the four owned files.

Done looks like: the checks green; `git grep -n "'dog'" -- src/world/maps/tallowWharf*` empty; no coordinate changed
(the diff shows kinds, roles, reasons, `dogs` and the W1 label only).

## 12. Polish list (not blocking; from the plan check)

- R3's campaign check keys on maps whose missions are all campaign (A8). Also check per mission: the guards a campaign
  mission spawns (`missionSpawnsGuard`) are neither quadrupeds nor heavies, so a campaign mission on a mixed map is
  caught.
- `missionSectionLine` at `beginSection`: `begin()` snapshots without `runner.update`, so the new section's steps may
  still be locked and the banner empty (objectiveRows lists only open and done rows); confirm in R2's test, or read the
  section's first required step from the def. Filter by the viewer's team for Sector Ops.
- J7 row says "(+ Guard AI check)": have Guard AI look at R3's check, or say the PR D checker covers it.
- TGC break line: BEAT's "Wrong man. Pell's courier has bolted. Back to the arcade, both of you." vs the generic
  "Named target broken. ..."; an optional per-rule line. Likewise a named line for the protected restart
  ("Teale is down. Back to the arcade.") instead of the generic `PROTECTED_LINE`.
- A9: the solo refusal is `mode=sector` only; name the path Michael uses for his "walk the map once built" (two tabs
  over `?net=local`, or a dev switch) so it is not blocked.
- HG7 / HG8 (R6, PR F) are not in the signed J7 row (J3b holds C S11 "field-menu full list"); CONFORMANCE 1d puts them in
  the engine job. Fine, but the orchestrator confirms the owner (A13).
