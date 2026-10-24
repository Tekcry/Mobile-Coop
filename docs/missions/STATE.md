# mission-framework - STATE

## SAVE ~00:25 (orchestrator 85%; no swap, resume at the 03:10 reset)
- EN1 checker FIX (2 must-fix: per-team step budget in sector mode; per-team restart restore(section, now, team?) / resetSection(..., scope?)) + 4 polish; fix round sent to the EN1 builder (feature/mission-en1). If its fix is not on origin at resume: rerun the fix from this line (Opus, worktree -mission-en1). Then merge EN1 into feature/mission-engine and start EN2 (brief items in the 23:55 block: per-team restart, per-area alarm stages, spookStep (not a flag) survives restore, Guard AI events {name, guardTag, postId, via?}, onAlarm on camera stage for CR) + EN3 (Sonnet, objectiveRows(runner, team, hints)).
- Running at save: VAL (WIP 97cbd290 on feature/mission-validator), CMG (no file yet: rerun from PLAN row CMG + the BEAT spaces-needed lists if missing), KIT-PULL, KIT-SHUT (no files yet: rerun from PLAN rows if missing), guard-cap M0 REPORT (feature/guard-cap; rerun if REPORT has no "2026-10 re-measure (M0)" section).

## Now (2026-10-24 ~23:55)
- ~00:15 EN1 DONE d0532377 (36/36; API in its report: MissionRunner snapshot/restore, RuleTracker, objectiveRows, pack/parseMissionWire); Opus checker running. KIT0 DONE 6a202677 (registry src/game/kit/registry.ts, import.meta.glob load; 342 tests green); KIT-PULL + KIT-SHUT running (worktrees -mission-kit-pull / -kit-shut off kit0); batch checker after both. NET must: fold KitKind into TeamKind (teamMoves.ts, one line) + drop the cast in TeamController.kitRequest; tuner moveTune.ts sections + coop.md text later (FRAG / docs). guard-cap M0 REPORT verdict agent running (feature/guard-cap).
- Wave 1 DONE so far: KITS 71977e5d; GSVG 6d731e69 + checker fix 074c55c0 (checker FIX 1 must-fix, done; polish: grid 10 m vs plan-svg 6 m, --base id prefixes, = option form, --dump-rooms needs repo cwd, extent cap); BEAT TGC + TKL 95a23229; BEAT SS + CR 7bb695ad. Running: EN1, KIT0, VAL, CMG.
- PLAN 4c clip list AGREED with Player Build (e3c1eb0c); forwarded to KIT0.
- Sent Sector Ops the SS / CR nodes-needed; Guard AI the two walk-to behaviours (SS facilities officer -> new board; CR supervisor -> cage).
- EN2 brief MUST include (from the BEATs): (1) per-team section restart (M1; sectorMode.ts:1158 restartSection resets all today); (2) per-area alarm stages (one site stage today); (3) the TGC spook flag survives a section restart (exception to the section-facts reset; fallback in TGC BEAT); (4) mission events for Guard AI walk-to hooks. AGREED with Guard AI ~00:05: EN2 raises {name, guardTag, postId, via?}; after Michael signs off, Guard AI adds em.missionOrder(guardTag, 'reset' | 'walk', postId) over Enemy.resetBreaker (src/ai/enemy.ts:1285) / Enemy.sendTo (:1138); spook stays despawn / respawn (A11). Send Guard AI the go at sign-off. VAL told: step budget per team for Sector Ops, solo sum INFO.

## Earlier (~23:25)
- PLAN d80cb783 up (orchestrator told). Michael corrections folded (M1-M5: Marlow keeps its marks; full co-op kit; new campaign map Tallow Wharf, greybox overnight after the sign-off page).
- WAVE 1 RUNNING: EN1 Opus (worktree -mission-en1, feature/mission-en1), KIT0 Opus (-mission-kit0), VAL Opus (-mission-validator, feature/mission-validator off level-validator-v6 220596bc), and in THIS worktree, uncommitted until the lead commits: GSVG Sonnet (scripts/graph-svg.mjs, tests/graphSvg.test.ts), CMG Opus (prototypes/campaign-map/graph.json), KITS Haiku (prototypes/coop-kit/SIGNOFF.md), TGC + TKL BEAT Opus, SS + CR BEAT Opus. feature/mission-engine worktree (-mission-engine) is the merge target for EN / KIT / NET / GB slices.
- Worktrees use node_modules junctions (disk: C: was 1.6 GB free ~23:10; 5.9 GB after clearing finished worktrees' node_modules).
- Sent: Player Build the clip list (PLAN 4c) for KIT-PULL / KIT-SHUT, waiting on agreed or changes. Sector Ops sync contract agreed (A16); their pages on feature/sector-redesign-signoff.
- NEXT: wave 2 per PLAN 6 (EN2 + EN3 after EN1 check; KIT-PULL + KIT-SHUT after KIT0; CMS after CMG + GSVG; TGC / TKL / SS / CR graphs + SVGs). Tell Sector Ops EN2's hook lines (PLAN EN2 row) before EN2 starts.

## Done

## Resume prompt
```
Night Shift | Marlow Build: mission-framework lead (+ level-validator V6, guard-cap). Read docs/missions/STATE.md "SAVE" block first (worktrees -mission-framework, -mission-en1, -mission-kit0, -mission-kit-pull, -mission-kit-shut, -mission-validator, -mission-engine; node_modules junctions). For each running slice listed there, check origin for its commit; rerun missing ones from docs/missions/PLAN.md rows. PLAN section 6 waves. V6: docs/level-validator/STATE.md on feature/level-validator-v6 (V6e-2 on cloud-queue; then Opus checker + PR). guard-cap: docs/guard-cap/STATE.md. Rules: CLAUDE.md Sessions; no desktop e2e (laptop queue); single vitest files; message the orchestrator at PR open / train-ready / blocked only. Michael signs off specs in the morning: PR A (feature/mission-framework) must hold all sign-off pages by then.
```
