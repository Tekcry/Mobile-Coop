# mission-framework - STATE

## Now (2026-10-24 ~23:55)
- Wave 1 DONE so far: KITS 71977e5d; GSVG 6d731e69 + checker fix 074c55c0 (checker FIX 1 must-fix, done; polish: grid 10 m vs plan-svg 6 m, --base id prefixes, = option form, --dump-rooms needs repo cwd, extent cap); BEAT TGC + TKL 95a23229; BEAT SS + CR 7bb695ad. Running: EN1, KIT0, VAL, CMG.
- PLAN 4c clip list AGREED with Player Build (e3c1eb0c); forwarded to KIT0.
- Sent Sector Ops the SS / CR nodes-needed; Guard AI the two walk-to behaviours (SS facilities officer -> new board; CR supervisor -> cage).
- EN2 brief MUST include (from the BEATs): (1) per-team section restart (M1; sectorMode.ts:1158 restartSection resets all today); (2) per-area alarm stages (one site stage today); (3) the TGC spook flag survives a section restart (exception to the section-facts reset; fallback in TGC BEAT); (4) mission events for Guard AI walk-to hooks. VAL told: step budget per team for Sector Ops, solo sum INFO.

## Earlier (~23:25)
- PLAN d80cb783 up (orchestrator told). Michael corrections folded (M1-M5: Marlow keeps its marks; full co-op kit; new campaign map Tallow Wharf, greybox overnight after the sign-off page).
- WAVE 1 RUNNING: EN1 Opus (worktree -mission-en1, feature/mission-en1), KIT0 Opus (-mission-kit0), VAL Opus (-mission-validator, feature/mission-validator off level-validator-v6 220596bc), and in THIS worktree, uncommitted until the lead commits: GSVG Sonnet (scripts/graph-svg.mjs, tests/graphSvg.test.ts), CMG Opus (prototypes/campaign-map/graph.json), KITS Haiku (prototypes/coop-kit/SIGNOFF.md), TGC + TKL BEAT Opus, SS + CR BEAT Opus. feature/mission-engine worktree (-mission-engine) is the merge target for EN / KIT / NET / GB slices.
- Worktrees use node_modules junctions (disk: C: was 1.6 GB free ~23:10; 5.9 GB after clearing finished worktrees' node_modules).
- Sent: Player Build the clip list (PLAN 4c) for KIT-PULL / KIT-SHUT, waiting on agreed or changes. Sector Ops sync contract agreed (A16); their pages on feature/sector-redesign-signoff.
- NEXT: wave 2 per PLAN 6 (EN2 + EN3 after EN1 check; KIT-PULL + KIT-SHUT after KIT0; CMS after CMG + GSVG; TGC / TKL / SS / CR graphs + SVGs). Tell Sector Ops EN2's hook lines (PLAN EN2 row) before EN2 starts.

## Done

## Resume prompt
```
Night Shift | Marlow Build: mission-framework lead (orchestrator ~22:45). Worktree C:/NightShift/Mobile-Coop-mission-framework, branch feature/mission-framework. Read docs/missions/BRIEF.md, PLAN.md, STATE.md "Now". Branch guard before writes. Message "Night Shift | Orchestrator" at PLAN up and PR open.
```
