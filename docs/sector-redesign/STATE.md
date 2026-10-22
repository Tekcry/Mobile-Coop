# sector-redesign - state

## Now (2026-10-23 ~01:55)
- Branch feature/sector-redesign = sector-fixes-r2 5bfbf85d (nav closures + bolt reach cap) + master 4.63.1 (d21f4eda).
- Research: CT-LEVELS.md (014f611d) and CONCEPT.md (b6c78d01: Saltmarsh Park, 5 sections 8/12/16/20/24 guards) landed; ENGINE.md (engine audit, gaps) still running; SPEC + PLAN writer started ~02:35 (reads ENGINE when it lands). Was: (engine audit,
  gaps), CT-LEVELS.md (CT co-op level lessons, ten rules).
- feature/camera-range (worktree C:/NightShift/Mobile-Coop-camera-range, from master): measure every camera's reach
  vs its zone (docs/camera-range/MEASURE.md), one engine cut, own small PR. Off ctDevices.ts / securityRoom.ts.
- Lighting: the shared proposal docs/lighting-review/PROPOSAL.md lands on origin/feature/marlow-final (Menu Notes'
  lighting agent); add a Sector Ops section there once it lands.
- Questions Q1-Q5 sent to Michael through the orchestrator ~01:50; unanswered by ~02:05 -> assumptions in BRIEF.
- r2 findings for the spec: R2-PATHS.md (origin/feature/sector-fixes-r2-paths ff3442e1: "pair bolt"; pockets do not fit the current halls) and R2-JUMP.md + the green soloTopLandingReach / soloTopLandingThreats helper (origin/feature/sector-fixes-r2-jump 7306dce9; take tests/helpers/soloJumpReach.ts + tests/soloJumpReach.test.ts from there, not the warehouseS2 change).
  "pair bolt" design, pockets do not fit the current halls) and R2-JUMP.md (origin/feature/sector-fixes-r2-jump).

## Next
1. Research hand-backs -> SPEC.md (from docs/templates/map-spec.md) for up to 5 sections + PLAN.md (greybox slices).
2. Greybox slices straight on (Michael reviews spec + greybox in the morning).
3. camera-range PR: CI + area suites via Character Build (E2E_GPU=1), checker, PR.

## Done
- 2026-10-23 ~01:45: branch cut, BRIEF (M1-M5).
- ~02:45 (orchestrator): guard BEHAVIOUR (src/ai: perception, alert, hearing, squads, radio, reinforcement behaviour, posts) belongs to the new job guard-ai (Night Shift | Guard AI Build); sector-redesign owns map data + sectorMode (placement, archetype per guard, dog allowance, post / zone tags as data, restart resets, camera cap). Data requests for guard-ai: end of research/ENGINE.md. Protocol 31 is sector-redesign's (Sector light sync); guard-ai takes 32. Guard-cap perf run requested on the laptop by the orchestrator.

## Resume prompt
```
Night Shift | Course Ready Build: RESUME sector-redesign. Read CLAUDE.md, docs/ROADMAP.md (origin/feature/menu for the
live "Decided"), docs/sector-redesign/BRIEF.md and this STATE (origin/feature/sector-redesign), and
docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays for the other open jobs (sw-reload, g44-above,
camera-range). Carry on from "Next". Full burn to 100%; WIP pushed after every hand-back. Report to
"Night Shift | Orchestrator".
```

## MORNING-REVIEW (Michael ~01:42: "Apply, logged and undoable")
Every loosening and assumed decision built tonight, with its undo. Filled in as the spec and slices land.
- Lighting review LR1-LR12 (docs/lighting-review/PROPOSAL.md, origin/feature/marlow-final since 471c3a98): applied to
  this map as assumed decisions; docs/level-design.md itself is not edited. Undo: per item, see the BRIEF A-number.
- Concept loosenings P1-P10 (research/CONCEPT.md): applied likewise. Undo: per item, see the BRIEF A-number.
- Finished and green slices merge to master in the next train (/preview/).
