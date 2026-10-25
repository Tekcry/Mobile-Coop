# J7 mission-rules: plan (mission-engine rule fixes, dark)

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, 2026-10-25. Plan only (this file is the draft for
`docs/mission-rules/PLAN.md` on `feature/mission-rules`; the lead commits it with a BRIEF before the plan checker).

Code base read: `origin/feature/mission-engine-flg-gb6` c74ce8f5 (engine 00b6cde9 + FLG + GB6 + 2 lines; 00b6cde9 is
its ancestor; the engine is stacked on PR #372 `feature/mission-framework` d93ae66e). Every file:line below is on
c74ce8f5 unless marked. Rules read from origin/master 2148ec969 (RULES, CLAUDE.md, session-method, DECISIONS).
Scope: FOLDED-PLAN (origin/feature/menu) section 4 row J7 and section 3 breaks 10-14, 17, plus C S19 (shield) and
M K3 (cap); detail rows from `origin/master:docs/conformance-campaign/CONFORMANCE.md` S2-S8, S12, S19, MF15, MF21, HG7,
HG8, 1d item 2, Part B; Michael's answers in ROADMAP Decided ("Folded plan SIGNED OFF", "Folded plan, the other 30").

## 0. What Michael decided that binds J7 (verbatim option text)

| Source | Michael picked / said | J7 effect |
| --- | --- | --- |
| G155 | "Adopt CT's way" (no heavies or dogs in co-op missions; narrowed to the campaign by G297 / G307) | dogs out of Tallow; campaign guard check |
| G290 | breaking a mission rule restarts the section, the mission continues | `oneChance` (ends the mission) goes |
| G334 | "Soft windows only" | `window` rule kind (a countdown that restarts) goes |
| G126 | "30-second revive, 2 per mission" | campaign revive cap 2, not syringes |
| G2 | "2 player coop campaign only, unable to be completed solo." | exactly two players at a campaign start |
| G145 + G353 | "Protected until their role is done." + (7) "Section restart" | protected kill / KO restarts the section; no softlock |
| Q8 | "None on Mission 1 (Recommended)" (only named people protected, everyone else an armed guard) | protected list = named people only |
| Q12 | "No, armed only (Recommended)" | no riot-shield lead in a campaign mission |
| Q19 | "None (Recommended)" (optional objectives only raise the rating) | no optional rewards, no section-rating grants in the campaign |
| G359 | "32 alive ..." | campaign cap named (`CAMPAIGN.maxAlive`) |
| G336, G351 | "What and where" | Tallow tgc-2 line with a place; the section banner shows the mission's step, not the other mission's label |
| G343 + HG7 / HG8 | objectives fade in; the full list lives in the field menu | engine side of the popup feed and the field-menu list (J3b owns the popup) |
| Q1 HOLD | "Review all 12 first" | no Tallow geometry, lighting, greybox or sign-off-page work in J7 |
| Q23 | "Force co-op" (throw gaps) | needs geometry or a map decision: waits for the Tallow hold (J8) |
| Q2 | "Never" (dark spots from dead lights) | Tallow lighting: J8, waits for the hold |
| Q9 | "Kill + lose score (Recommended)" | Sector Ops dogs only (J15); none left in the campaign after J7 |

## 1. Claims

```claims
files:
  - src/game/mission/missionDef.ts
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
  - tests/mission/{missionDef,ruleTracker,missionText,sectorMission,campaign,missionFeed,missionHudMount}.test.ts
  - tests/missionHud.test.ts
  - tests/missionNet3.test.ts
  - tests/tallowWharf/sectors.test.ts
  - tests/{campaignGuards,campaignSession,campaignRevives}.test.ts
  - scripts/e2e-sectorops-wharf.mjs
  - scripts/e2e-sectorops-mission.mjs
  - changes/feature-mission-rules*.md
  - TESTING.md
maps: tallowWharf (guard roster kinds and objective text only; no geometry, lights, doors or sign-off pages)
protocol: none (no message shape changes; src/net files change in PR E and PR F)
save: none
```

Not claimed (other jobs own them; J7 stays out): `src/ai/gear.ts` (J15 adds `shieldFrom`), `src/ai/enemyManager.ts`
(the `MAX_ALIVE` comment is Guard AI's J1 doc row), `src/ui/hud/hud.ts`, `src/ui/screens/pauseScreen.ts`,
`src/input/**` (J3b), `src/net/protocol.ts` (J4 coop4 capacity), `scripts/mission-validate.mjs` and
`docs/level-validator/mission-schema.md` on `feature/mission-validator` (J12's mission-validator re-cut drops
`oneChance` / `window`; J7 sends J12 the note), every Tallow geometry / light / SPEC / SIGNOFF / campaign-map graph file
(held: J8, J9, J23).

Claims overlaps for the orchestrator (all on master-shared files; J7's PRs sit on the engine branch, so they meet master
only when PR C goes through the train): J3 / J3b on `gameState.ts`, `sectorMode.ts` (blips gate, HG3), `coopClient.ts`
(HG9 status line), `coopHost.ts` (ally blips); J4 (#317 coop4) on `session.ts` capacity; J6 on `coopHost.ts` /
`coopClient.ts` hot paths. Small, separate hunks; the train's conflict rule settles them.

## 2. Slices

Branches: `feature/mission-rules` (PR D), `feature/mission-rules-net` (PR E, cut from PR D's head),
`feature/mission-rules-hud` (PR F, cut from PR E's head), in `C:/NightShift/Mobile-Coop-mission-rules`; parallel
slices in their own worktrees `feature/mission-rules-<slice>`; the lead merges them. No two slices that run at the same
time touch one file.

| Id | What | Model | Files owned | Est lines / h | PR | Group | Depends |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | Push the flag fix: fast-forward `origin/feature/mission-engine` to c74ce8f5 once the FLG checker passes; cut `feature/mission-rules` from it | lead (no agent) | none | 0 / 0.1 | - | - | FLG PASS |
| R1 | Rules core: drop `oneChance` / `window`; protected-character break (kill or KO = section restart; ends the interrogation softlock); campaign optional objectives carry no reward; Tallow mission data (tgc-2 place, rewards out, TGC protected list) | Opus | `src/game/mission/{missionDef,ruleTracker,missionText,sectorMission}.ts`; `src/world/maps/tallowWharfMissions.ts`; TGC / TKL `graph.json` + `BEAT.md`; `tests/mission/{missionDef,ruleTracker,missionText,sectorMission}.test.ts` | ~550 / 4 | D | P1 | R0 |
| R2 | Campaign profile: `campaign.ts` (cap 32 named, revives 2, no shield lead, no grants, the start gate, the section line); SectorMode uses it (cap, response kinds, zero grants, mission banner); solo autostart gate in `main.ts` | Opus | `src/game/mission/campaign.ts` (new); `src/game/modes/sectorMode.ts`; `src/main.ts`; `tests/mission/campaign.test.ts` (new) | ~350 / 3 | D | P1 | R0 |
| R3 | Dogs out of Tallow (two armed humans on the same posts); W1 sector label with a place; mode-aware guard check (`checkSectors(..., 'campaign')` rejects quadrupeds and `dogs > 0`) | Sonnet | `src/world/maps/tallowWharfSectors.ts`; `src/game/sectors.ts` (`checkSectors`, `checkSectorGuards` only); `tests/tallowWharf/sectors.test.ts`; `tests/campaignGuards.test.ts` (new) | ~200 / 1.5 | D | P1 | R0 |
| FD | PR D docs: fragment, job STATE, `docs/missions/BRIEF.md` A10 / A12 rewritten, `docs/missions/PLAN.md` :37 / :78 / :217 lines, TESTING.md line | Haiku | `changes/feature-mission-rules.md`, `docs/mission-rules/STATE.md`, `docs/missions/{BRIEF,PLAN}.md`, `TESTING.md` | docs | D | after P1 | R1-R3 |
| R4 | Exactly two players: session refuses a campaign start unless 2 are in the room; campaign room capacity 2 (holds after coop4); the lobby shows why; the host's `sectorMission` only with `flags.missions` (FLG leak) | Opus | `src/net/session.ts`; `src/net/coopUi.ts`; `tests/campaignSession.test.ts` (new); `tests/missionNet3.test.ts` (only if a case breaks) | ~300 / 3 | E | P2 | R1, R2 merged on PR D's branch |
| R5 | Campaign revives: cap `CAMPAIGN.revives` (2) at every difficulty, window 30 s; `addSyringes` does nothing in a campaign mission | Opus | `src/net/coopHost.ts` (constructor :203, `addSyringes` :858); `tests/campaignRevives.test.ts` (new) | ~150 / 1.5 | E | P2 | R2 merged |
| R6 | Popup feed and field-menu list (HG7, HG8): `missionFeed.ts`; the always-on mission list removed (host and client); the current objective on the objective line; the full list (rules line + steps) in the field menu; hint via J3b's optional `setObjectiveHint` | Opus | `src/game/mission/missionFeed.ts` (new); `src/game/modes/sectorMode.ts`; `src/net/coopClient.ts`; `src/game/gameState.ts` (`objectiveLines`, `NetAttachment`); delete `src/ui/hud/missionHud.ts`, `src/ui/hud/missionHudMount.ts`, `tests/missionHud.test.ts`, `tests/mission/missionHudMount.test.ts`; `tests/mission/missionFeed.test.ts` (new) | ~800 incl. ~390 deleted / 4 | F | P2 | R1, R2 merged (sectorMode, missionText settled) |
| R7 | PR E e2e: TGC protected KO restarts W2 and tgc-3 reopens; a host alone cannot start a campaign mission; `revivesLeft` is 2 on Realistic; no dog spawned; the W3 banner on TGC is not the ledger line | Sonnet | `scripts/e2e-sectorops-wharf.mjs` | ~200 / 2 | E | after P2 | R4, R5 (and PR D) |
| FE | PR E docs (fragment, STATE, `docs/systems/coop.md` campaign start line) | Haiku | `changes/feature-mission-rules-net.md`, STATE, `docs/systems/coop.md` | docs | E | after R7 | R7 |
| R8 | PR F e2e flips: `.mission-hud` asserts become "objective line = the step text" and "the field menu lists the rules line and the steps" (`e2e-sectorops-mission.mjs` :45-52, wharf `clientHud` :260) | Sonnet | `scripts/e2e-sectorops-mission.mjs`; `scripts/e2e-sectorops-wharf.mjs` | ~150 / 1.5 | F | after R6, R7 | R6, R7 |
| FF | PR F docs (fragment, STATE, `docs/systems/ui.md` mission lines, the J3b interface note) | Haiku | `changes/feature-mission-rules-hud.md`, STATE, `docs/systems/ui.md` | docs | F | after R8 | R8 |

Waves (full burn): **wave 1** R1, R2, R3 together (3 tsc / vitest builders). **Wave 2** as soon as R1 and R2 are merged
on `feature/mission-rules` (R3 may still run): R4, R5, R6 together, each from PR D's head (files disjoint: session /
coopUi; coopHost; sectorMode / coopClient / gameState / missionFeed). **Wave 3** R7 (after R4 + R5), then R8 (after R6
and R7: both edit the wharf e2e). Fragments and STATE close each PR. Checkers: PR D one fresh Opus checker (R1-R3 batch);
PR E two independent Opus checkers (src/net); PR F two independent Opus checkers (src/net). One fix round each.

## 3. Slice detail (what "done" is)

**R1 rules core (Opus).** `RuleKind` (missionDef.ts:68), `RULE_KINDS` (:128) lose `oneChance` and `window`;
`MissionRule.step` comment (:76) says namedTarget only, `seconds` (:78-79) goes, `checkMission`'s window branch
(:326-329) goes. RuleTracker: `RULE_END` (:36), `outcome` RULE_END, `ended` (:84-85), `endsOnRestart` (:97, :116-118),
`onFail` (:255-262), the window read (:286-290) and the end branch (:292-299) go; every break returns `RULE_RESTART`.
Header comments (:10-14) rewritten. New `onProtected(line)`: a built-in break, not a strict rule (A2). SectorMission:
`fail` (:152, binding :637), `MISSION_FAILED_TITLE` (:170), `hasOneChance` (:210, :267), `pendEnd` (:215, :346,
:466-468, :541-544), the one-chance branch of `restarted()` (:353-356) go; a restart it did not ask for only restores
state (the pending team if one waits). New protected check in `tick` (allocation-free, arrays built in the
constructor). `MissionDef.protects?: { guard, name, until? }[]` plus the implicit interrogate target. Campaign
`optional.reward` is an error (Q19); `optional: { reward?: RewardKind }`. Tallow: tgc-2 text names both places (88
characters), `tgc-opt` / `tkl-opt` lose their rewards, TGC protects Teale, Fenn, Garrow until tgc-3. Brief in section 9.
- Done looks like: no `oneChance` / `window` / `RULE_END` / `MISSION_FAILED` / `fail(` left in `src/` (git grep);
  killing or knocking out Teale before tgc-3 restarts W2 with "Teale must not be harmed. Back to the section
  checkpoint." and tgc-3 is open again; after tgc-3 he is fair game; `npx vitest run tests/mission/ tests/tallowWharf/
  tests/missionNet.test.ts tests/missionNet3.test.ts tests/missionFlags.test.ts` green; typecheck clean.

**R2 campaign profile (Opus).** New pure `src/game/mission/campaign.ts`: `CAMPAIGN = { maxAlive: 32, revives:
REVIVES_PER_MISSION, shieldLead: false }`; `isCampaignMission(def)`, `isCampaignMap(missions)`, `campaignStartBlock(...)`,
`campaignReviveCap(def, syringes)`, `campaignGrant(grant)`, `campaignResponseKinds(kinds, n)`, `missionSectionLine(runner,
viewer)`. SectorMode: `start()` (:326-328) cap from `CAMPAIGN.maxAlive` when the bound mission is campaign;
`raised()` after `responseTeam` (:973) rewrites the team kinds to `SECTOR_REINFORCE_KIND`; `rate()` (:1062-1070) zeroes
the grant (marks and the card stay); `beginSection` banner (:771) shows the mission's line for the section. `main.ts`
autostart branch (:458-461): a sector run on a campaign map (or with a campaign mission) is refused with a toast and
the menu (solo is never 2 players; without `?missions=1` the map is not available). Brief in section 9.
- Done looks like: a TGC run on Tallow has `em.maxAlive === CAMPAIGN.maxAlive`, an alarm stage sends no `enforcer`, a
  connector rating grants nothing, entering W3 on TGC shows no "Take the ledger" banner; Sector Ops runs (no mission or a
  sector mission) are unchanged (`e2e-sectorops` 1-6, `e2e-section-rating` green); `?autostart=tallowWharf&mode=sector`
  with or without `?missions=1` opens the menu with the reason toast.

**R3 dogs out, guard check (Sonnet).** `tallowWharfSectors.ts:145-148`: W3 guard 1 becomes an armed `grunt` on the same
running line (a second yard watchman: "Yard watchman's mate: walks the lodge end of the yard"), no `handler`; :146
reason drops "and the dog line". :165-168: W4 guard 1 becomes a yard patrol (role `patrol`, no dog in the reason), guard
2 an armed `grunt` on the same line ("Yard patrol on the shed doors' side"), no `handler`. `dogs: 1` (:366, :390) -> 0.
Slot indexes stay (guard ids `W3:1`, `W4:2` and `WHARF_GUARD_MISSIONS` unchanged). W1 objective label (:310) -> "Take the
warden's tally book from his desk on the fish hall gallery" (67). `sectors.ts`: `checkSectors(defs, nav?, security?,
mode: 'sector' | 'campaign' = 'sector')` passes `mode` to `checkSectorGuards(d, mode)`; campaign: any quadruped is
"`<id>: guard <k> is a dog (G155, campaign)`" and `dogs > 0` is an error; heavies stay an error in both. Brief in
section 9.
- Done looks like: `checkSectors(WHARF_SECTORS, undefined, undefined, 'campaign')` is []; the same check on a section
  with a dog lists it; every MAPS entry whose missions are all campaign passes the campaign check; campus and warehouse
  Sector Ops checks unchanged.

**R4 exactly two (Opus, src/net).** `session.ts`: the host's `sectorMission` (:106) from `missionParam()` (null with
`flags.missions` off: the FLG leak, today it ships `flags.mission` regardless); a `campaignBlock` getter
(`campaignStartBlock(map.missions, sectorMission, players.size, flags.missions)` for a sector match, map from `MAPS`);
`startMatch()` (:361-364) returns null while blocked; capacity reads (:163, :187, :357) use 2 for a campaign mission or
map, else `capacity(mode)`. `coopUi.ts`: the Start button's `blocked` text (:635), the status line (:503) and the
auto-start (:877) honour the block. No message shape change.
- Done looks like: unit tests: 1, 3, 4 players blocked with "Campaign missions need exactly two players"; 2 starts;
  a third join is refused while the host's mission is campaign (also with coop4's capacity 4); no `sm` in `start` with
  `flags.missions` off; campus sector missions and plain Sector Ops unchanged.

**R5 revives (Opus, src/net).** `coopHost.ts:203`: `this.reviveClock.cap = campaignReviveCap(def, syringesFor(...))` with
`def = pickMission(g.world.map.missions, s.sectorMission)` (the builder confirms `g.world.map` is set when CoopHost is
built; else it sets the cap from SectorMode's bind through a `NetAttachment` hook and says so); `addSyringes` (:858)
returns at once for a campaign mission. `REVIVE_WINDOW` stays 30; `checkpoint()` keeps `used` (per mission, G126).
- Done looks like: unit tests at Rookie / Normal / Realistic / Perfectionist: cap 2 on a campaign mission, 3 / 2 / 1 / 1
  on Sector Ops; `addSyringes(2)` leaves a campaign cap at 2.

**R6 popup feed and field-menu list (Opus, src/net).** New pure `missionFeed.ts`: `MissionFeed.update(runner, viewer,
hints): boolean` (true only when the viewer's current objective changes; key = step index and runner `version`;
fills `text` and `hint` in place, no allocation per frame) and `missionObjectiveLines(runner, viewer, hints):
MissionLine[]` (`MissionLine extends ObjectiveLine { note?: true; hint?: string }`: the rules line first with `note`,
then every step of the mission's sections so far, done / current / to do, the hint on the current line when hints are
on). SectorMode (host / solo): `setup()` (:790, :810) and the download line (:1320) do not write the sector label while
a mission runs; `frameUpdate` writes `g.hud.setObjective(feed.text)` on a change and calls
`(g.hud as { setObjectiveHint?(t: string | null): void }).setObjectiveHint?.(feed.hint)`; the `MissionHudMount`
(:278, :366, :1328-1329, dispose) goes; a `missionLines()` method. CoopClient: same feed from its mirror and its own
viewer (Sector Ops teams differ from the host), the snapshot's objective text is ignored while a mission mirror runs,
the mount (:128, :225-230, :1002, :1171-1173) goes, a `missionLines()` on the attachment. GameState `objectiveLines()`
(:1244-1252): mission lines first (`SectorMode.missionLines()` on the host, `net.missionLines?.()` on a client), then
the existing branches. `missionHud.ts`, `missionHudMount.ts` and their two tests are deleted.
- Done looks like: in a mission the old `.mission-hud` panel never appears; the objective line shows the current step
  (both pages); the pause menu lists "Rules: ..." then the steps; the line changes only when a step changes (no
  per-frame rewrite: `hud.objectiveText` stable across frames); the download percent still shows on a mission's
  download section.

**R7 / R8 e2e (Sonnet).** R7 adds to `scripts/e2e-sectorops-wharf.mjs`: (TGC W2) a host knock-out of Teale (W2:6)
before tgc-3 restarts W2 (`mission.ruleRestarts` +1, the "must not be harmed" line, tgc-3 open, Teale alive again);
(both) no live guard of kind `dog`; the host alone (before the client joins) cannot start (`session.startMatch()`
returns null, the Start button blocked text); `net.revivesLeft()` is 2 with the lobby on Realistic; the W3 banner on
TGC does not contain "ledger". R8 flips the HUD list asserts to the objective line and the field-menu list.

## 4. PR split and stacking

| PR | Branch (base) | Slices | Est changed lines | Checkers | Laptop suites (`request.mjs`, `E2E_GPU=1`) |
| --- | --- | --- | --- | --- | --- |
| C (exists as a branch, not J7) | `feature/mission-engine` (on #372) | engine, kit, NET, Tallow greybox | ~14k (the engine plan's own split / `big-pr` call) | engine plan's | engine plan's |
| D | `feature/mission-rules` (base `feature/mission-engine` after R0) | R1, R2, R3, FD | ~1.1k | 1 Opus | affected-e2e + `e2e-sectorops` (1-6, mission, wharf-tgc, wharf-tkl), `e2e-section-rating`, `e2e-coop`, `e2e-netmove` (RULES checker gate for `src/game`), `e2e-menus` (autostart path) |
| E | `feature/mission-rules-net` (base PR D's branch) | R4, R5, R7, FE | ~650 | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops:mission`, `:wharf-tgc`, `:wharf-tkl`, `e2e-sectorops:1`, `e2e-menus` (lobby) |
| F | `feature/mission-rules-hud` (base PR E's branch) | R6, R8, FF | ~950 | 2 Opus (src/net) | affected-e2e + `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops` (all parts), `e2e-menus` (pause list), `e2e-coop-gpu` (objective-text waits, 4189) |

Stacking (A13): D, E, F are reviewed as their own PRs so each diff stays under ~1.5k and gets its own checker statuses
and laptop runs on its own head; each base is the branch below it. After PASS + green laptop, the lead merges D into
`feature/mission-engine`, then retargets E to `feature/mission-engine` and merges it, then F. PR C (engine to master)
carries all three; none of D, E, F enters a train alone. A wire-path member is PR C itself; the train bumps
`PROTOCOL_VERSION` once; nobody edits it by hand. No `SAVE_VERSION` change (no save shape touched).

## 5. Flags (dark until accepted)

| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `missions` (`?missions=1`, src/core/flags.ts:70) | off | Night Shift \| Campaign Build (flags.ts still says Marlow Build: FD fixes the comment) | after the Tallow hold lifts and Michael walks Mission 1 (not before J8 / J9; orchestrator sets the date) | Michael accepts the Mission 1 walk item |
| `coopKit` (`?coopkit=1`, :74) | off | Night Shift \| Campaign Build | with the kit walk (Player Build's clips) | unchanged by J7 |

Everything J7 changes runs only when a mission is bound (`missionParam()` needs `flags.missions`) or on the unlisted
Tallow map, which R2 / R4 now refuse to start without the flag. Default players see no change.

## 6. Acceptance (per PR)

- **PR D:** no rule kind can end a mission or time a step (unit tests; `git grep oneChance\|RULE_END origin/<head> --
  src` empty); a protected kill or KO before the role is done restarts the section and the step reopens, after it does
  not; Tallow spawns no dog and fails the campaign guard check if one is added; a campaign run caps at
  `CAMPAIGN.maxAlive`, sends no shield lead and grants nothing at connectors; the W3 / W4 banners on the wrong mission
  are gone; solo `?autostart=tallowWharf&mode=sector` is refused; every listed laptop suite green; Sector Ops
  unchanged.
- **PR E:** a campaign mission starts only with exactly two; the room holds two; revives are 2 at every difficulty and
  never topped up; laptop co-op group and mission suites green; two Opus checkers PASS.
- **PR F:** no always-on mission list; the objective line carries the current step on host and client; the field menu
  holds the rules line and every step; nothing rewrites the objective line per frame; suites green; two Opus checkers
  PASS. The J3b interface (section 7) is written into `docs/systems/ui.md`.

## 7. Interface with J3b (hud-guidance PR B, planned separately on feature/hud-guidance)

J7 owns the engine side; J3b owns `hud.ts`, `pauseScreen.ts`, `src/input/**` and the popup's look and timing.
1. **Popup trigger.** The engine writes the viewer's current objective through `g.hud.setObjective(text)` only when it
   changes (`MissionFeed.update` true). J3b's popup fades in on a text change and on View / O. A Sector Ops download
   line keeps its `" NN%"` suffix: J3b keys the popup on the text with a trailing `\s\d+%` removed (its HG9).
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

## 8. Assumptions (A-n, each with its undo)

- **A1** Protected = the people a mission names (`MissionDef.protects`; TGC: Teale W2:6, Fenn W2:7, Garrow W2:8, until
  tgc-3 is done, G145 "until their role is done") plus every interrogate target until its step is done (the softlock
  case, G353). A kill or a knock-out restarts the section (the brief's line; a knocked-out target cannot talk). TKL
  protects nobody (Q8: no civilians, no named people). Undo: a decoy KO not a break = drop Fenn / Garrow from the list,
  or `koBreaks: false` per entry. Logged for Michael's next look (stricter, not a loosening).
- **A2** The protected break is built in, not one of the 2 strict rules (CONFORMANCE MF6): it does not count in `rb`,
  `kept()` or `brokenCount`; the radio line goes out by `say` (host and client feed, as today); the banner is RULE
  BROKEN. Undo: count it in `breaks`.
- **A3** `oneChance` and `window` go for every mission mode, not only the campaign (G290 and G334 are general; Sector Ops
  "solo timer fallback" is the sync step's `soloWindow`, which stays). Undo: restore both kinds for `mode: 'sector'`
  from git history (EN1 / EN2 commits).
- **A4** Sync steps keep `window` / `soloWindow` (CT's sync, retryable, never scaled, G131). Undo: none needed.
- **A5** Campaign optional objectives give no reward and campaign sections get no section-rating grants (gadget,
  syringe, medkit) (Q19 "None"); the rating card still shows the marks. Undo: allow `medkit` / `gadget` for campaign in
  `checkMission` and drop `campaignGrant`.
- **A6** Campaign revives: cap 2 at every difficulty, 30 s window, used revives kept across checkpoints, no top-ups.
  Undo: `campaignReviveCap` returns the syringes.
- **A7** Campaign = the bound mission's `mode === 'campaign'`; a campaign map = a map whose missions are all campaign
  (Tallow); no new `MapDef` field. Undo: add `campaignOnly?: boolean` to MapDef and read it in `isCampaignMap`.
- **A8** Exactly two: the host cannot start a campaign mission with 1, 3 or 4 in the room; the room holds 2 even after
  coop4; solo is refused at autostart with a toast; a partner leaving mid-mission falls to today's rejoin hold
  (unchanged). No dev override for solo testing (tests run co-op). Undo: remove the block in `campaignStartBlock`.
- **A9** No shield lead in a campaign mission: the response team is all `grunt`; alarm-stage armour and helmets
  unchanged (G155 "CT's way"). Done in SectorMode after `responseTeam`, so J15's `shieldFrom` in `gear.ts` does not
  conflict. Undo: drop `campaignResponseKinds`.
- **A10** Each dog becomes an armed human on the same post / route (no geometry); slot indexes kept so guard ids and
  mission guard lists stay valid; W3 east yard and W4 shed yard floors hold. The campaign-map SPEC / graph / SIGNOFF dog
  text is corrected by J8's page work after the hold (doc drift until then). Undo: revert the two rows (the campaign
  check then fails, by design).
- **A11** The section banner in a mission shows the viewer's first open required step of that section, or only the
  section title when the mission has none there (TGC crossing W3). The W1 sector label gains its place for non-mission
  runs. Undo: banner back to `s.objective.label`.
- **A12** HG7 / HG8: the always-on mission list is deleted; the current objective goes on the objective line (J3b makes
  it the popup); the full list lives in the field menu (section 7). Undo: restore `missionHud.ts` / `missionHudMount.ts`
  from git history.
- **A13** D, E, F stack on the engine branch and merge into it (section 4); PR C carries them to master. Undo: retarget
  D, E, F to master after PR C merges and let them ride trains (the orchestrator's call).
- **A14** The mission validator's `oneChance` / `window` kinds (`scripts/mission-validate.mjs` :18, :229, :405 and
  `mission-schema.md` :54, :87 @0c62a921) are dropped in J12's mission-validator re-cut; J7 sends the note. Undo: a J7
  slice on `feature/mission-validator`.
- **A15** Campaign results, save and stars stay J22's: `markCompleted` (sectorMode.ts:1033) still writes a Sector Ops
  stars record for Tallow until J22. Undo: none (J22 replaces it).
- **A16** TGC / TKL `graph.json` text and reward fields and their `BEAT.md` lines change with the data (mission data, no
  geometry; `tests/tallowWharf/sectors.test.ts` compares them character for character). The SIGNOFF pages wait for J8
  (held, Q22). Undo: revert the two graph fields.
- **A17** If FLG gets a fix round, R0 cuts from the fixed head; R2 / R4 rely on `flags.missions` existing. Undo: none.

## 9. Blocked or needing Michael

- **Waits for the Tallow hold (J8 / J9 / J23, after Michael's review of the 12 level-rule changes):** Q23 "Force
  co-op" throw gaps (widen gaps or a solo-jump block: a map decision); Q2 "Never" dark spots and the real-site lighting
  re-base; gate reach ERRs; the shutters (so the perfect-run e2e, MF20, waits on J9); hide spots, medkit stations,
  encounter checkpoints; the campaign-map SPEC / graph / SIGNOFF dog and count text; the TGC / TKL SIGNOFF wording.
  Nothing in J7 moves geometry.
- **Needs Michael:** nothing blocks. Logged for his next look: A1 (a knock-out of a named decoy restarts the section)
  and A3 (the two kinds go for Sector Ops missions too).
- **Hand-offs:** J12 (Marlow) drops the validator kinds (A14). Guard AI: G B1 / B7 / B11 / D4 close through R3 / R2 / R1
  / R4; J15's `shieldFrom` must leave a campaign override in SectorMode intact. J3b: section 7.

## 10. Risks

- `sectorMode.ts` is Sector Ops Build's file: R2 and R6 keep to campaign / mission branches; Sector Ops runs are
  covered by `e2e-sectorops` 1-6 and `e2e-section-rating` on every PR. The lead tells Sector Ops Build which lines.
- The protected poll could misfire on a target knocked out at the end of his own interrogation: the tick order is poll,
  `runner.update`, protected check, `tracker.update`, and a unit test covers a KO in the same tick as the intel.
- PR C's size and its master conflicts (HG3's blips gate, J3 / J3b hunks) are the engine plan's; J7 adds small hunks
  only.
- coop4 (#317, "Live now") may land on master first: R4's capacity rule must read whatever `capacity()` returns and
  clamp a campaign room to 2.

---

## 11. Briefs for the first three slices (strict, self-contained)

Each brief goes to a fresh agent with `docs/systems/agent-preamble.md` (origin/master) filled in as below. Common lines:
- Job `mission-rules`; lead "Night Shift | Campaign Build". Base: `origin/feature/mission-rules` (cut by R0 from
  c74ce8f5). Your worktree: `C:/NightShift/Mobile-Coop-mission-rules-<slice>` on `feature/mission-rules-<slice>`
  (the lead creates it with `git worktree add ... -b feature/mission-rules-<slice> origin/feature/mission-rules` and a
  node_modules junction). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-mission-rules-<slice> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-rules-<slice> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-rules-<slice>"`.
- Edit only the files your brief owns. Commit and push each finished sub-step (`git add <your files>`, never `-A`),
  message prefix `mission-rules <SLICE>:`, ending with the attribution line the lead gives. Never merge, rebase,
  stash, reset or force-push; never touch master.
- Checks: `npm run typecheck:fast` and `npx vitest run <files> --maxWorkers=2`. No e2e (the lead queues the laptop),
  no full `npm run check`, no dev server, every command with a timeout.
- Hard rules that bite here: hot paths allocate nothing (the mission tick runs every fixed step: no closures, arrays or
  strings built per tick); strict TS (`noUncheckedIndexedAccess`, `import type`); plain-English comments, hyphens not
  em dashes; no reference-game names.
- Report (your last message): commits, files, test counts, anything you could not do, and every place you deviated
  from this brief with the reason.

### Brief R1: rules core (Opus 5.5)

Owned files: `src/game/mission/missionDef.ts`, `src/game/mission/ruleTracker.ts`, `src/game/mission/missionText.ts`,
`src/game/mission/sectorMission.ts`, `src/world/maps/tallowWharfMissions.ts`,
`docs/missions/prototypes/three-grey-coats/graph.json`, `docs/missions/prototypes/three-grey-coats/BEAT.md`,
`docs/missions/prototypes/two-key-ledger/graph.json`, `docs/missions/prototypes/two-key-ledger/BEAT.md`,
`tests/mission/missionDef.test.ts`, `tests/mission/ruleTracker.test.ts`, `tests/mission/missionText.test.ts`,
`tests/mission/sectorMission.test.ts`. Do not edit `sectorMode.ts`, `sectors.ts`, `tallowWharfSectors.ts`, any
`src/net` file or `tests/tallowWharf/*` (other slices own them; `tests/tallowWharf/sectors.test.ts` must still pass
unchanged).

Read first: `git show origin/master:docs/DECISIONS.md` entries G145, G290, G334, G353 (grep `^\*\*G145\.` etc.);
`origin/master:docs/conformance-campaign/CONFORMANCE.md` rows MF2, MF3, MF6 and "B. A10 / A12 replacements"; the four
owned source files in full.

Why: G290 (a broken rule restarts the section, the mission continues), G334 (soft windows only: no countdown) and G353
(killing a protected character restarts the section; G145 protects story people until their role is done). Today
`oneChance` can end a mission, `window` is a countdown, and killing or knocking out Teale (W2:6) before tgc-3 leaves
the step open forever (softlock).

Do:
1. `missionDef.ts`: remove `'oneChance' | 'window'` from `RuleKind` (:68) and `RULE_KINDS` (:128); `MissionRule.step`
   comment (:76) = "namedTarget: the interrogate step"; delete `seconds` (:78-79) and the `r.kind === 'window'` block of
   `checkMission` (:326-329). Make `optional?: { reward?: RewardKind }` (:52); keep the reward-kind check only when a
   reward is given; add: a campaign mission's optional step with a reward is an error
   `"<p>: campaign optional objectives give no reward (rating only)"`. Add
   `export interface MissionProtect { guard: string; name: string; until?: string }` and `MissionDef.protects?:
   MissionProtect[]` (doc comment: G145 / G353, "named people; kill or knock-out before `until` is done restarts the
   section"). `checkMission` checks each entry: `guard` in `guards`, spawned by the mission (`missionSpawnsGuard`),
   `name` 1-24 characters, `until` (when given) a step id, no guard listed twice. Export a setup-time helper
   `protectedGuards(d): { guard: string; name: string | null; until: number }[]` = the explicit list plus every
   interrogate step's `target` not already listed (name null, until = that step's index); `until` -1 = always.
2. `missionText.ts`: delete `oneChance` / `window` from `RULE_NAME` (:12-22); `ruleName(r)` returns `RULE_NAME[r.kind]`;
   `breakLine(r)` (one argument) = `${ruleName(r)} broken. Back to the section checkpoint.`; add
   `protectedLine(name: string | null)` = `${name} must not be harmed. Back to the section checkpoint.` or, with no name,
   `The man you need is down. Back to the section checkpoint.` (both <= 90).
3. `ruleTracker.ts`: delete `RULE_END` (:36), `ended` (:84-85), `endsOnRestart` (:97, :116-118), `onFail` (:255-262), the
   window read (:286-290) and the end branch (:292-299); `outcome` is RULE_OK or RULE_RESTART; rewrite the header
   (:1-16) without one-chance / window. Add `protectedBreaks = 0`, a private pending line and
   `onProtected(line: string): void` (ignored while the mission scope is held or `tripped`). In `update()`, before the
   rules loop: a pending protected break sets `tripped`, `lastRule = -1`, `outcome = RULE_RESTART`, `line = <that
   line>`, `protectedBreaks++` and returns RULE_RESTART (it does not touch `breaks`, `broken[]` or `kept`).
   `resetSection` clears the pending break. `restartTeam` is undefined when `lastRule < 0` (everyone).
4. `sectorMission.ts`: delete `fail` from `SectorMissionHost` (:152) and the binding (:637), `MISSION_FAILED_TITLE`
   (:170), `hasOneChance` (:210, :267), `pendEnd` and every use (:215, :346, :466-468, :541-544), the one-chance block of
   `restarted()` (:353-356); `broke()` always shows `RULE_BROKEN_TITLE`; `over` is set only by the extraction. Update
   the header (:16-18). Protected check: in the constructor build `protSec` / `protK` / `protUntil` (Int32Array) and
   `protLine` (string[], built once from `protectedLine`) from `protectedGuards(def)` and `parseGuardId(defs, guard)`
   (skip entries that parse to null). In `tick()`, after `this.runner.update(this.now)` and `stepEvents()` and before
   `tracker.update`, loop the entries: skip unless `protSec[p] === host.index()` and (`protUntil[p] < 0` or
   `!runner.isDone(protUntil[p])`); `const e = host.slotGuard(protK[p])`; a non-null `e` with `!e.alive || e.ko` calls
   `tracker.onProtected(protLine[p])` and stops the loop. No allocation in the loop. `kill()` stays as is.
5. `tallowWharfMissions.ts`: tgc-2 `text` (:57) = `Which grey coat is Pell's? The warden's gallery office, the tea stall by
   the canal steps` (88); `tgc-opt` and `tkl-opt` `optional: {}`; `THREE_GREY_COATS.protects = [{ guard: 'W2:6', name:
   'Teale', until: 'tgc-3' }, { guard: 'W2:7', name: 'Fenn', until: 'tgc-3' }, { guard: 'W2:8', name: 'Garrow', until:
   'tgc-3' }]` with a comment citing G145 / G353 and Q8. Mirror the tgc-2 text and the two rewards in the TGC / TKL
   `graph.json` (`"optional": {}`) and the matching `BEAT.md` lines (TGC BEAT objective line and reward line; TKL BEAT
   reward line), word for word, so `tests/tallowWharf/sectors.test.ts` passes unchanged.
6. Tests: `ruleTracker.test.ts` delete the window case (:129) and the one-chance cases (:196-210), drop `RULE_END` from
   the import (:4); add `onProtected` cases (returns RULE_RESTART once; `line`; `lastRule` -1; `breaks` and `kept`
   unchanged; ignored while held; cleared by `resetSection`; `restartTeam` undefined). `sectorMission.test.ts` drop
   `MISSION_FAILED_TITLE` (:5) and the one-chance case (:433-437) and any fake `fail`; add with a fake host: target
   killed before its step -> banner RULE BROKEN, the line said, restart after `MISSION_RESTART_HOLD`, the step open after
   `restarted()`; knocked out -> same; killed after the step is done -> no break; a listed decoy knocked out -> break;
   `slotGuard` null -> no break; target knocked out in the same tick its intel completes the step -> no break; a restart
   the adapter did not ask for only restores. `missionDef.test.ts` (:134): `oneChance` and `window` are unknown kinds;
   protects checks; a campaign reward is an error, a Sector Ops reward is fine. `missionText.test.ts` (:23): no window
   rule; `breakLine` one argument; `protectedLine` <= 90.

Checks: `npm run typecheck:fast`; `npx vitest run tests/mission/ tests/tallowWharf/sectors.test.ts tests/missionNet.test.ts
tests/missionNet3.test.ts tests/missionFlags.test.ts tests/sectorRatingHost.test.ts --maxWorkers=2`; `git grep -n
"oneChance\|RULE_END\|MISSION_FAILED\|'window'" -- src tests` prints only sync-step `window` fields.

Done looks like: the checks above green; the grep clean; the behaviour in section 3 R1.

### Brief R2: campaign profile (Opus 5.5)

Owned files: `src/game/mission/campaign.ts` (new), `src/game/modes/sectorMode.ts`, `src/main.ts`,
`tests/mission/campaign.test.ts` (new). Do not edit any other `src/game/mission/*` file (R1 owns them; import only
existing exports: `MissionDef`, `TeamId` from `missionDef.ts`, `objectiveRows` from `missionText.ts`, `MissionRunner`),
`src/ai/*` (J15 owns `gear.ts`), `src/net/*`, or `sectors.ts`.

Read first: DECISIONS G2, G126, G155, G336, G351, G359 (origin/master); ROADMAP Decided on origin/feature/menu, entry
"Folded plan, the other 30" (Q12 "No, armed only", Q19 "None"); CONFORMANCE rows MF5, MF15, MF21, TW7, TW16 and "B.
Campaign entry size"; `sectorMode.ts` lines 240-270, 300-370, 700-830, 930-1000, 1040-1160 on c74ce8f5;
`src/game/reviveClock.ts`; `src/main.ts` 440-466.

Do:
1. New `src/game/mission/campaign.ts` (pure, Babylon-free, no net imports, header comment citing G2, G126, G155, G359, Q12,
   Q19):
   - `export const CAMPAIGN = { maxAlive: 32, revives: REVIVES_PER_MISSION, shieldLead: false } as const` (comment: G359
     "a ceiling, not a target"; named here so a campaign entry outside SectorMode keeps it).
   - `isCampaignMission(def: MissionDef | null | undefined): boolean` (`def?.mode === 'campaign'`);
     `isCampaignMap(missions: readonly MissionDef[] | undefined): boolean` (non-empty and every mission campaign).
   - `campaignStartBlock(missions, missionId: string | null, players: number, missionsOn: boolean): string | null`: null
     when neither the map is a campaign map nor the picked mission is campaign; else `'Not available yet'` when
     `!missionsOn`, `'Pick a campaign mission'` when no campaign mission of the map has that id, `'Campaign missions need
     exactly two players'` when `players !== 2`, else null.
   - `campaignReviveCap(def, syringes: number): number` (`CAMPAIGN.revives` for a campaign mission, else `syringes`).
   - `campaignGrant(g: Grant): Grant` zeroes `gadget`, `syringe`, `medkit`, `alarmStep` in place and returns it (import
     the `Grant` type from `../rating/sectionRating` where sectorMode gets it).
   - `campaignResponseKinds(kinds: EnemyKind[], n: number): void` sets the first `n` to `SECTOR_REINFORCE_KIND`
     (import type `EnemyKind`; the const from `../sectors`), no allocation.
   - `missionSectionLine(runner: MissionRunner, viewer: TeamId): string`: the text of the first row of
     `objectiveRows(runner, viewer, false)` that is not done and not optional, else `''` (called once per section start;
     allocation there is fine, say so in the comment).
2. `sectorMode.ts` (keep every change inside a campaign / mission branch; Sector Ops runs must not change):
   - `start()` (:326-328): `em.maxAlive = isCampaignMission(this.mission?.def) ? CAMPAIGN.maxAlive : SECTOR.maxAlive`.
   - `raised()`: after `const nt = responseTeam(stage, send, this.teamKinds)` (:973), when the mission is campaign call
     `campaignResponseKinds(this.teamKinds, nt)` (comment: Q12 "No, armed only"; J15's `shieldFrom` stays upstream).
   - `rate()`: after `rewardsFor(...)` (:1062-1067) and the A9 line, `if (isCampaignMission(this.mission?.def))
     campaignGrant(r)` (comment: Q19 "None"; the card still shows the marks).
   - `beginSection` banner (:771): when a mission runs, the subline is `missionSectionLine(this.mission.runner,
     this.mission.viewer())` (title unchanged; an empty line leaves only the title); else `s.objective.label` as now.
   - No other line changes (R6 later changes the objective line and the mission HUD mount: leave them).
3. `src/main.ts` autostart branch (:458-461): for `flags.mode === 'sector'`, compute
   `campaignStartBlock(getMap(flags.autostart).missions, missionParam(), 1, flags.missions)`; when it returns a reason:
   `goToMenu()` and `app.toasts.show(reason, 'warn')` instead of `startGame`. The `?net=local` branch (:447-457) is
   R4's (session gate): do not touch it.
4. `tests/mission/campaign.test.ts`: `CAMPAIGN.maxAlive <= MAX_ENEMIES` (import from `src/net/protocol`) and `===
   SECTOR.maxAlive`; `CAMPAIGN.revives === REVIVES_PER_MISSION`; `isCampaignMap(WHARF_MISSIONS)` true,
   `isCampaignMap` of a campus mission list false, `[]` false; `campaignStartBlock` table (flag off, unknown id, 1 / 3 /
   4 players, 2 players ok, a non-campaign map null, a sector mission null); `campaignReviveCap` both ways;
   `campaignGrant` zeroes; `campaignResponseKinds` rewrites only the first `n` (and `'enforcer'` never survives);
   `missionSectionLine` on a TGC runner at W1 = tgc-1's text, at W3 = '' (TGC has no W3 step), done steps skipped.

Checks: `npm run typecheck:fast`; `npx vitest run tests/mission/campaign.test.ts tests/sectorRatingHost.test.ts
tests/sectorRestart.test.ts tests/sectorStep3.test.ts tests/sectors.test.ts --maxWorkers=2`.

Done looks like: the checks green; a reviewer finds every SectorMode change behind `isCampaignMission` or `this.mission`;
`?autostart=tallowWharf&mode=sector` (with or without `missions=1`, solo) reaches the menu with the reason (the lead
confirms on the laptop through `e2e-menus` / a one-off step).

### Brief R3: dogs out and the campaign guard check (Sonnet 5.5)

Owned files: `src/world/maps/tallowWharfSectors.ts`, `src/game/sectors.ts` (only `checkSectors` and
`checkSectorGuards`), `tests/tallowWharf/sectors.test.ts`, `tests/campaignGuards.test.ts` (new). Do not edit
`tallowWharfMissions.ts`, any section geometry file (`tallowWharfW1-4.ts`, `tallowWharfKit.ts`, `tallowWharf.ts`), any
docs (the SPEC / graph / SIGNOFF text waits for the Tallow hold), or anything else.

Read first: DECISIONS G155 (origin/master: "No heavies or dogs in co-op missions", narrowed to the campaign by
G297 / G307); CONFORMANCE rows TW1, MF4, TW16; `tallowWharfSectors.ts` 60-240 and 300-394; `sectors.ts` 545-600.

Hold rule: Michael holds all Tallow map work (geometry, greybox, lighting, sign-off pages). You change guard kinds,
roles, reasons and one objective label only. No x / z / y / route point, door, light or room may move.

Do:
1. W3 (:145-148): the comment becomes "0 the yard watchman, 1 his mate at the lodge end"; guard 0's reason
   "Yard watchman: the east yard and the gate lodge"; guard 1 = `walker([[112.5, 46], [109.5, 46]], { zone: 'yard', role:
   'patrol', reason: "Yard watchman's mate: walks the lodge end of the yard", yaw: PI / 2 })` (default kind `grunt`, no
   `handler`, same points and yaw, so the takedown spot is computed as before). `dogs: 1` (:366) -> `dogs: 0`.
2. W4 (:165-168): the comment "0 the yard watchman, 1 and 2 the yard patrol, 3 the crane watchman, 4, 5 Pell's
   minders"; guard 1 `role: 'patrol', reason: 'Yard patrol: walks the shed doors end to end'`; guard 2 =
   `walker([[51.5, 20.5], [67.5, 20.5]], { zone: 'shed-yard', role: 'patrol', reason: 'Yard patrol on the canal side of
   the yard, a pace off his mate' })` (kind `grunt`, no `handler`). `dogs: 1` (:390) -> `dogs: 0`.
3. W1 objective label (:310) -> `Take the warden's tally book from his desk on the fish hall gallery` (G336 what and
   where). Coordinates unchanged.
4. `sectors.ts`: `checkSectors(defs, nav?, security?, mode: 'sector' | 'campaign' = 'sector')` passes `mode` to
   `checkSectorGuards(d, mode)` (default `'sector'`, so every existing call is unchanged). In campaign mode: a quadruped
   is `${d.id}: guard ${k} is a dog (G155: no dogs in the campaign)` and `(d.dogs ?? 0) > 0` is
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
