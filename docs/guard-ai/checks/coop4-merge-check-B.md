# coop4 merge check B
Owner: Guard AI Build. Status: current.
VERDICT: FIX (docs only; applied in 603f23a43)

Checker B (Opus 5.5, fresh), #317 `feature/coop4` head acce9707b: the master-merge conflict fix (6206c9434,
8e8d611cd, 8094af038, acce9707b). Scope: docs, TESTING, lobby text, tests, the PR diff vs master.

## Checks run
- `npm run typecheck:fast`: clean. vitest on coop4's 18 test files plus docLint, changesFragments, coopCarry,
  coopGuardCarry, protocolConst: 613 pass. doc-lint: 0 errors. eslint on coopUi, coopHost, sectorTeamScale: clean.

## Findings
- coop.md keeps both sides' facts (Marlow Yard / campaign exactly 2; Sector Ops 1-4 live, G381; capacity table matches
  protocol.ts); no appended notes, no minimap. testing-tools.md loses nothing of master's. TESTING.md vs master: only
  coop4's item. Fragment parses.
- Lobby: `cap` is `s.cap` (mode capacity or a lower `roomCap`); Course says master's exact "invite your partner" text;
  3-4 seat modes say "teammates" (the legacy modes' wording changes too; nothing asserts it).
- PR diff vs master (77 files) is coop4's own work; every removed master line is intended. sectorTeamScale fake
  (`world: { lightBake: null }`) and `enemyMgr?.intruderLeft(id)` are correct and hide no bug.

## Fix list (applied in 603f23a43)
1. testing-tools.md:300: the Campaign lobby caps text is "Marlow Yard needs two players. Share the code to invite your
   partner.".
2. coop.md:245: the host line ends "invite your partner." at 2 seats and "invite your teammates." at 3-4.
3. changes/feature-coop4.md:36: teammates for 3-4 player modes; Marlow Yard keeps "invite your partner".

## Polish
- coop.md:28 "the train after 54" -> "the train that carries coop4" (applied).
- testing-tools.md: a Part 9 bullet (applied).
