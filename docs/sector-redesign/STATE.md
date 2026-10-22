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
Applied for campusOps only: docs/level-design.md, the template and the bible are NOT edited. Each row and its undo
is in SPEC.md "Applied loosenings" and BRIEF "Assumed decisions".
- A23-A32 = CONCEPT P1-P10:
  - A23: vantages may be safe by occlusion.
  - A24: cuttable lights count as stepping stones.
  - A25: lit default with standby fill.
  - A26: a lit chokepoint may be darkened one way, or crossed by timing.
  - A27: an isolation moment may be darkened from cover.
  - A28: lit vantages are tested for out-of-sight.
  - A29: co-op verbs gain rope / hang-down / jam-and-pass / pair gate; CR4-CR7 rest on it.
  - A30: dual-control doors and a padlocked ladder guard are allowed; CR3 / CR5 / CR6 rest on it.
  - A31: the Warehouse loosenings L1-L15 carry over.
  - A32: patrol mix is judged per section.
- A33-A44 = lighting review LR1-LR12 (docs/lighting-review/PROPOSAL.md on feature/marlow-final):
  - A33: lit by default, the players make the dark.
  - A35: dark checkpoints are allowed; connectors are lit at 0.30.
  - A37: ways to darken include at least one that is not a shot.
  - A38: player-started windows are allowed, with no area clock that fails the run.
  - A39: standby fills of 0.14 / 0.30.
  - A40: a cut circuit drops below 0.28 on host and client.
  - A41: when darkness happens it is true dark.
  - A42 and A43: the build sheets record the light plans.
  - A44: the light-sync engine fact (slice L closes it).
  - A34 and A36 repeat A23 and A27.
- A45: the template's "existing systems only" rule is lifted for this job (it builds engine items EW1-EW16).
- Other assumptions to review (BRIEF A1-A22):
  - A2: dogs in S4-S5 only, at an armed handler's heel (an exception to G155 for Sector Ops).
  - A3 and A12: no runners, heavies, snipers or drone operators.
  - A8: a new map id, campusOps, so a new stars record and a menu line to repoint.
  - A9: the Warehouse map stays until S1-S3 play, then is delisted and kept for regression.
  - A11: breakers are wall switches until EW8.
  - A15: no lifts, hatches or roller doors.
  - A16: talking pairs are faked with timed loops until guard-ai's GA2.
  - A20: load under 2x Warehouse Ops, else the chunk or compact fallback.
  - A21: no plain team doors.
- Finished and green slices merge to master in the next train (/preview/).
