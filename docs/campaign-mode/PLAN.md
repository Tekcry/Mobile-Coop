# campaign-mode (J22) - PLAN

Owner: Night Shift | Campaign Build. Status: current.

Opus planner, 2026-10-27, on master 4de6aab97 (4.128.0). The ask, Michael's words and the assumptions A1-A11:
`BRIEF.md`. Every `file:line` below is at that head. Plan checker: a fresh Opus pass before any build (RULES Intake 4).

## 1. Goal
The campaign gets its front door. In the co-op lobby the host picks Campaign, then an entry in order: Prologue (Marlow
Yard, training) and Mission 1 (Tallow Wharf's two missions, A1). Both players read the briefing in the lobby. The match
starts only with exactly two players (G2, G48). The end shows a 0-100% rating where 100% is exactly G146. The host's
mission is saved at each section's begin, and any partner can join a Continue (G147). Everything ships dark behind
`flags.campaign` (A10). No tuning: the rating numbers are starting values (G422).

## 2. What exists (master) and what J22 adds

| Area | On master | J22 adds |
| --- | --- | --- |
| Campaign rules | `src/game/mission/campaign.ts` (J7 R2 / R4): `campaignStartBlock` (exactly two), `CAMPAIGN.revives` (G126), `campaignGrant` (no rewards, G384), the 32 cap | nothing: reused |
| Lobby | `src/net/coopUi.ts:388-415`: modes Campaign (= Course mode on `ctcourse`, `CAMPAIGN_MAP`) and Sector Ops; campaign maps are `unlisted`, so Tallow is never offered | a Mission row under Campaign: Prologue and the Mission 1 entries, a briefing panel, "Story spoilers ahead", Continue (A2-A4, A9) |
| Mission in the session | `NetSession.sectorMission` is only the host's own `?mission=` (`src/net/session.ts:132`); `start.sm` carries it (NET3); the lobby message does not; `bindSectorMission` reads the URL only (`src/game/mission/sectorMission.ts:651`) | the host's lobby pick sets it; the lobby message carries it; the mode binds it from `GameOptions` |
| Exactly two | `NetSession.campaign` / `cap` / `campaignBlock` (`src/net/session.ts:396-413`); "Resume hosting" waits for the partner (`src/net/coopUi.ts:834`) | nothing: reused |
| Briefing | `MissionDef.briefing`, `briefingLines()` (`src/game/mission/missionText.ts`) with no caller (MF12) | the lobby panel shows it to both players (A4) |
| Results | `sectorResult` (`src/game/sectors.ts:942`): time, kills, spotted, PERFECT; a campaign clear writes Sector Ops stars (`src/game/modes/sectorMode.ts:1191`) | a campaign rating 0-100% and its panel; no Sector stars for a campaign mission (MF11) |
| Save | none for the campaign; `src/save/sectorRecord.ts`, `courseRecord.ts`, `ratingRecord.ts` are kv records (no `SAVE_VERSION` bump) | `campaign:progress` and `campaign:save` kv records (A7, A8) (MF10) |
| Rejoin | 10-minute "Resume hosting" record in tab storage (`src/core/rejoin.ts`), no mission field; a Sector Ops resume restarts at section 1 (no `resumeBay`) | the record keeps the mission; Sector Ops resumes at its section (A11) |
| Tallow Wharf | not on master: PR #583 (dark, on feature/mission-d-wharf) | its entries appear once #583 is on master and `flags.missions` is on |

MF8 needs no code: G371 makes Marlow Yard the prologue, so "Campaign" opening Marlow Yard is now right (BRIEF).

## 3. Design

**3.1 The campaign order** (a new pure module `src/game/mission/campaignOrder.ts`, no net or Babylon imports). One table:
`{ key, label, title, map, mode, mission? }`:
- `prologue`: "Prologue", "Marlow Yard (training)", map `ctcourse` (through `roomMap`), mode `course`.
- `threeGreyCoats`: "Mission 1", "Three Grey Coats", map `tallowWharf`, mode `sector`, mission `threeGreyCoats`.
- `twoKeyLedger`: "Mission 1", "Two-Key Ledger", map `tallowWharf`, mode `sector`, mission `twoKeyLedger`.

`campaignEntries(maps, missionsOn)` drops an entry whose map is not in `MAPS` or whose mission is missing, and every
sector entry while `flags.missions` is off. `entryForRoom(mode, map, sm)` maps a room back to its entry (the lobby's
selected row, the records). `spoiler(key, progress)` is true past the first entry not done (A3).

**3.2 The rating** (a new pure module `src/game/mission/campaignRating.ts`). `campaignRating({ kills, alarms, optional })`
returns `{ pct, perfect }` by A5. Kills and alarms are op-wide and survive a section restart already (`SectorRun.alarmsRaised`,
`src/game/sectors.ts:775`; kills `:774`). The view type `CampaignResultView` (pct, perfect, rows: kills, knock-outs,
alarms, times spotted, bodies found, optional objectives, rules kept) lives here so CM5 and CM6 build in parallel.

**3.3 The records** (a new `src/save/campaignRecord.ts`, the `sectorRecord.ts` pattern: `dbGet` / `dbPut` on `kv`,
sanitised on read, never throws):
```
campaign:progress  { v: 1, done: { [entryKey]: { best: number /* -1: no % (prologue, A6) */, plays: number, intel: number, at: number } } }
campaign:save      { v: 1, key, map, mission, difficulty, section /* run index */, st: number[], f: number,
                     revivesUsed: number, breaks: number, tally: { kills, knockouts, alarms, spotted, bodies, optional }, time: number, at: number }
```
`st` / `f` are the runner's done and fact bits, the same packing as `MissionWire` (`src/game/mission/missionWire.ts:11-23`).
One save slot per host (A7). `recordFinish(key, pct, intel)` keeps the best. `SAVE_VERSION` stays (A8).

**3.4 The mission in the session** (`src/net`, Opus, two checkers).
- `NetSession.setSettings` gains the campaign mission: the host's lobby pick sets `sectorMission` (only with
  `flags.campaign` and `flags.missions`, as the constructor's URL path at `src/net/session.ts:132`). A new pick cancels a
  pending auto start, as a map change does today.
- The `lobby` message gains an optional `sm` (parsed with `sectorMissionId`), so the partner's lobby shows the picked
  entry and its briefing. A client still takes its start mission only from `start.sm` (NET3 unchanged).
- A sector campaign `start` uses the existing `bay` field as the section to start at (1-based; course keeps its bay).
  No new field. The client's start slots follow it (`CoopClient.placeStart`, `src/net/coopClient.ts:513`).
- `GameOptions` gains `sectorMission?` and `sectorStart?` (and on the host `campaignResume?`: the save). `CoopController.start`
  (`src/net/coopUi.ts:203-225`) fills them. `bindSectorMission` reads `g.opts.sectorMission`, falling back to `missionParam()`
  for URL boots.
- A resume at section i: `applyMissionStart(run, i)` (EN4, already used by Two-Key Ledger's W2 start), then
  `runner.applyWire(st, f)` (`src/game/mission/missionRunner.ts:450`) so the earlier sections' required steps read as
  done. Without that the extraction never opens. The tracker's breaks and the revive clock's used count come back from
  the save (G126: two per mission, not per session; `matchRevives`, `src/net/coopHost.ts:104`).
- `SectorMode.resumeBay()` returns `run.index + 1`, so the 10-minute "Resume hosting" record resumes at the current
  section too (A11). `RejoinRecord` gains `sm` (tab storage, not a save).

**3.5 The lobby** (`src/net/coopUi.ts`, Opus; pure helpers in `campaignOrder.ts` for the tests). With `flags.campaign`
on and the mode Campaign, the host's options show a Mission row (`campaignEntries`). Picking the prologue sets
`course` + `ctcourse` (its bay row stays). Picking a Mission 1 entry sets `sector` + `tallowWharf` + the mission. The
difficulty row stays (G106). The context panel shows the briefing (A4) on both peers: title, `briefingLines()`, the
rules line, "Needs exactly two players", and "Story spoilers ahead" past the host's progress (A3). With a save the row
starts with "Continue: <title>, <section name>" (difficulty locked to the save's). The status line uses the existing
`campaignBlock` text. Flag off: the lobby is as today. The main menu's Co-op entry gets "Continue campaign" (`src/main.ts`
near :348, hidden with no save; it opens hosting through the existing dynamic import of `src/net/coopUi.ts`).

**3.6 Save, end and results** (Opus for the mode hooks and the wire; Sonnet for the screen).
- Autosave: at each campaign section's begin (`SectorMode` section begin, `src/game/modes/sectorMode.ts:821-830`), the
  host writes `campaign:save` (not on a practice run, not on the client). A section restart reloads the same point, so
  the save never needs guard or door state (A7).
- End (`SectorMode.complete`, `:1171-1194`): for a campaign mission, skip `markCompleted` (no Sector stars), compute
  `campaignRating`, banner "MISSION COMPLETE" with the percent, `recordFinish` on the host, clear the save, and send
  the percent in the last `MissionWire` as a new optional `pc`. The client records its own progress from `pc` at the
  end (`src/net/missionMirror.ts` or `coopClient.ts`): "records it, with its rating, for both players" (bible 5.8).
- Prologue: Marlow Yard's finish (`src/game/modes/courseMode.ts`, the course-complete path) records `prologue` done with
  no percent (A6), with the flag on.
- Results: `ResultsNav` (`src/ui/screens/resultsScreen.ts:37`) gains `campaign?: CampaignResultView`; the screen shows
  the percent, PERFECT at 100, and each category row (bible 5.8 "Each category is shown"). Its Next goes to the lobby.

## 4. Claims
**Files** (one slice owns each at a time):
- New: `src/game/mission/campaignOrder.ts`, `src/game/mission/campaignRating.ts`, `src/save/campaignRecord.ts`, new tests
  `tests/campaignOrder.test.ts`, `tests/campaignRating.test.ts`, `tests/campaignRecord.test.ts`, `tests/campaignSession.test.ts`,
  `tests/campaignResults.test.ts`.
- Changed: `src/core/flags.ts` (the flag), `src/core/rejoin.ts`, `src/net/protocol.ts` (lobby `sm` parse only),
  `src/net/session.ts`, `src/net/coopUi.ts`, `src/net/coopHost.ts` (revives on resume), `src/net/coopClient.ts` /
  `src/net/missionMirror.ts` (start section, client record), `src/game/gameState.ts` (GameOptions fields, results nav),
  `src/game/mission/sectorMission.ts`, `src/game/mission/missionRunner.ts` (none expected: `applyWire` exists),
  `src/game/mission/missionWire.ts` (`pc`), `src/game/modes/sectorMode.ts` (hooks only), `src/game/modes/courseMode.ts`
  (prologue record), `src/ui/screens/resultsScreen.ts`, `src/main.ts` (Continue item, Co-op text), `scripts/e2e-coop.mjs`,
  `docs/systems/coop.md` (wire notes), `TESTING.md` (one line), the fragment `changes/feature-campaign-mode.md`.
- Not touched: `src/ai`, maps (Tallow is #583's), `src/game/mission/campaign.ts` (J7's, read only).

**Wire** (optional fields; no `PROTOCOL_VERSION` bump and no test asserts its number; the train bumps it once):
- `lobby.sm?: string` (the host's campaign mission).
- `start.bay` also carries the campaign section to start at for a sector campaign start (field exists, parse unchanged).
- `MissionWire.pc?: number` (0-100, set once at the end).

**Save**: `campaign:progress`, `campaign:save` in the existing `kv` store (3.3). No `SaveData` change, no `SAVE_VERSION`
bump (A8). Tab storage: `RejoinRecord.sm`.

**Flag**: `campaign` in `src/core/flags.ts`, `?campaign=1` on / `=0` off, owner Campaign Build, default off in the live
game, on in /preview/ (G416, the preview-flags list), switch-on at Michael's walk of Mission 1 (after #583 and J23).

## 5. Slices
Sizes are changed lines with tests. Each slice: tsc (`npm run typecheck:fast`) and its vitest files on the desktop,
then a fresh checker; one fix round. Agents commit and push each sub-step on their branch.

| # | Slice | Model | Files | Size | After |
| --- | --- | --- | --- | --- | --- |
| CM1 | Flag, campaign order, rating (pure) | Sonnet (strict Opus brief) | `src/core/flags.ts`, `campaignOrder.ts`, `campaignRating.ts`, their tests | ~350 | - |
| CM2 | Campaign records (kv progress + save) | Opus | `src/save/campaignRecord.ts`, its test | ~400 | - |
| CM3 | Mission in the session, resume at a section, rejoin field | Opus | `protocol.ts`, `session.ts`, `coopHost.ts`, `coopClient.ts`, `rejoin.ts`, `gameState.ts` (options), `sectorMission.ts`, `sectorMode.ts` (`resumeBay`), `tests/campaignSession.test.ts` | ~800 | CM1, CM2 |
| CM4 | Lobby Mission row, briefing panel, spoilers, Continue, main menu item | Opus | `coopUi.ts`, `main.ts`, `campaignOrder.ts` (row helpers) | ~600 | CM3 |
| CM5 | Autosave, end rating, records for both players, prologue record, `pc` | Opus | `sectorMode.ts` (hooks), `courseMode.ts`, `missionWire.ts`, `missionMirror.ts` / `coopClient.ts`, `tests/campaignResults.test.ts` | ~600 | CM3 |
| CM6 | Results screen campaign panel | Sonnet | `resultsScreen.ts`, `gameState.ts` (results nav) | ~250 | CM1 |
| CM7 | e2e: the campaign in the co-op lobby | Sonnet | `scripts/e2e-coop.mjs` (a campaign part) | ~350 | CM4, CM5, #583 on master |

PRs (each its own checker set): PR 1 = CM1 + CM2 (~750); PR 2 = CM3 (~800); PR 3 = CM4 (~600); PR 4 = CM5 + CM6 + CM7
(~1.2k, `Job-done: campaign-mode`). CM1 and CM2 build in parallel; CM5 and CM6 build in parallel (CM6 on CM1's view
type). Two Opus checkers on PR 2, PR 3 and PR 4 (`src/net`); one Opus checker on PR 1.

## 6. Checks per slice
- CM1: `tests/campaignOrder.test.ts` (order, map / mission / flag filters, `entryForRoom`, spoilers),
  `tests/campaignRating.test.ts` (0 kills 0 alarms = 100 and perfect; any kill or alarm caps at 99; optional cannot lift
  a kill to 100; clamp at 0). PR: CI `check` + affected-e2e.
- CM2: `tests/campaignRecord.test.ts` on `fake-indexeddb`: literal v1 records round-trip; garbage, unknown keys, huge
  numbers and a future `v` sanitise to empty; best kept; save cleared. `src/save` runs the co-op group.
- CM3: `tests/campaignSession.test.ts` (host pick sets `sectorMission` only with both flags; lobby `sm` parse; a sector
  campaign start carries the section in `bay`; resume restores `st` / `f`, breaks and revives used; Two-Key Ledger's W2
  start unchanged), plus `tests/missionNet3.test.ts`, `tests/coopRejoin.test.ts`, `tests/rejoin.test.ts`,
  `tests/mission/missionRunner.test.ts`. Laptop: the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`.
- CM4: `tests/campaignOrder.test.ts` (row text, Continue row, locked difficulty), the CM3 test file. Laptop: the co-op
  group; `e2e-menus` if the affected pick names it (main.ts).
- CM5: `tests/campaignResults.test.ts` (a campaign end writes no Sector stars, records the host's best, clears the save,
  packs `pc`; the client records from `pc`; the prologue records with no percent), `tests/mission/missionWire.test.ts`,
  `tests/sectorRatingHost.test.ts`. Laptop: affected-e2e (`e2e-sectorops`) plus `e2e-coop` + `e2e-netmove` (the
  `src/game` gate).
- CM6: results screen through CM7's e2e; affected-e2e for `src/ui`.
- CM7 (`e2e-coop` owns the co-op lobby): two tabs with `?campaign=1&missions=1`. The lobby lists Prologue and both
  Mission 1 entries in order; the client's lobby shows the host's pick and its briefing text; Start is refused with one
  player; with two, Three Grey Coats starts at W1 on both; the host's `campaign:save` holds W1. The host leaves, a fresh
  host tab offers "Continue", a different fresh tab (no rejoin token) joins (G147), and the match starts at the saved
  section. The run ends through the existing `__mission` test hook: results show 100% and PERFECT with no kills, and
  both tabs' `campaign:progress` hold the mission. One fix and one rerun at most (G422).

## 7. Order and dependencies
J7 is on master (`campaign.ts`). PR 1 to PR 3 need nothing else and merge dark. Mission 1 shows in the lobby only once
#583 (Tallow Wharf, on feature/mission-d-wharf) is on master; CM7 waits for that and runs on its first green master. J23
(Tallow's greybox exit) and Michael's walk gate the switch-on, not this build.

## 8. Risks
1. Resume without the earlier steps: a mission started at section i needs `applyWire(st, f)` before the first update, or
   the required steps of sections 0..i-1 stay open and the extraction never opens. CM3's test resumes Three Grey Coats
   at W3 and finishes it.
2. Mission-wide tallies: the rating must read op-wide counts (kills, `alarmsRaised`), never the per-section counters
   that `freshCounters` resets on a restart. CM5's test restarts a section between a kill and the end.
3. A8 against the save rule: a checker may read the new kv keys as a save-shape change. The three kv precedents hold
   (`sectorRecord.ts` header); if the checker still fails it, the undo in A8 is about 150 more lines in CM2.
4. Reusing `start.bay` for sectors: a sector start always sent 1 before, so an older client ignores it; `coop.md` gets
   the one-line note. If a checker wants a named field, `sec?` is a small change inside CM3.
5. Revives on resume: G126 counts per mission, so a Continue must not refill them (the save's `revivesUsed`).
6. Single player import boundary: the three new pure modules never import `src/net`; the main menu item reaches
   `src/net/coopUi.ts` only by the existing dynamic import behind `flags.coop`.
7. #583 slips: PR 1-3 still merge dark; the lobby lists the prologue only; CM7 holds.

## 9. Questions for Michael (native multiple choice, by day; assumed overnight)
- Q1 (A1) Tallow Wharf has two missions, Three Grey Coats and Two-Key Ledger. How does the lobby list them? "Both as
  Mission 1, in that order (Recommended)" / "Three Grey Coats is Mission 1, Two-Key Ledger is Mission 2" / "Only Three
  Grey Coats for now". The build goes ahead on the first; the answer changes one table row.
