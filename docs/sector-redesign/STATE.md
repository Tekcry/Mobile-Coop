# sector-redesign - state

## Now (2026-10-23 ~03:10, 5h window 91%)
- Branch feature/sector-redesign = sector-fixes-r2 5bfbf85d (nav closures + bolt reach cap) + master 4.63.1.
- Research done: research/CT-LEVELS.md (ten rules), CONCEPT.md (Saltmarsh Park, 5 sections 8 / 12 / 16 / 20 / 24
  guards), ENGINE.md (gaps G1-G25; "Requests for guard-ai" at its end, written by slice 0).
- SPEC.md + PLAN.md done (c806bac4): one map campusOps, 5 SectorDef sections; loosenings applied as A23-A45
  (MORNING-REVIEW below). Slices: 0 (engine smalls), L (light sync, protocol 31), 1 (S1 greybox), 2-5, E1-E7.
- IN FLIGHT (check each branch log on resume; if an agent died, rerun its slice from PLAN.md):
  - Slice 0 agent in THIS worktree (uncommitted at 03:10: warehouseSectors.ts, tests/sectors.test.ts,
    tests/sectorSlice0.test.ts): arm everyone as data, reinforcement kind / count from SectorDef, dog allowance per
    section, restart resets lamps / doors, camera cap per section, guard-ai data requests in ENGINE.md. No src/ai
    behaviour (guard-ai owns it).
  - Slice L agent: feature/sector-redesign-light (worktree C:/NightShift/Mobile-Coop-sector-redesign-light), Sector
    light-state co-op sync, PROTOCOL_VERSION 31 (marlow-final takes 30; keep protocol.ts edits to the version line +
    appended types).
  - camera-range agent: feature/camera-range (worktree C:/NightShift/Mobile-Coop-camera-range), docs/camera-range/
    MEASURE.md + one engine cut; off ctDevices.ts / securityRoom.ts (hunks for Menu Notes go to FOR-MENU-NOTES.md).
- Guard-cap perf run (24 awake) requested on the laptop by the orchestrator; slice 4 waits on it.

## Rules after the reset (Michael 01:45 "Lean windows", via the orchestrator)
- Each 5-hour window to 99%, lean, no quality loss: no new agent at 97%, save at 98%, stop by 99%; a cron resumes the
  session after each reset. Max 3 agents (desktop CPU).
- Opus plans, writes strict slice briefs (exact files, line ranges, acceptance, tests), reviews, and runs every fresh
  checker. Sonnet 5.5 builds from those briefs (section greyboxes, guard / camera / laser placement data, e2e routes);
  Haiku 5.5 for chores. Engine work (slice L protocol 31, camera-range, slice-0 engine items) stays Opus. A failed
  Sonnet slice gets its fix round from Opus.

## Next
1. Slice 0 hand-back -> commit, merge slice L branch when done, full npm test (desktop at 100% CPU: send the full run
   to Character Build instead), checker.
2. Slice 1 (S1 greybox, PLAN.md) on this branch; after the reset at most 3 agents per desktop session (orchestrator).
3. camera-range: checker, laptop suites (e2e-ctcourse, e2e-sectorops, e2e-coop; E2E_GPU=1), PR.
4. Green slices merge to master in the next train (Michael: "Merge to master").

## Done
- 2026-10-23 ~01:45: branch cut, BRIEF (M1-M5).
- ~02:45 (orchestrator): guard BEHAVIOUR (src/ai: perception, alert, hearing, squads, radio, reinforcement behaviour, posts) belongs to the new job guard-ai (Night Shift | Guard AI Build); sector-redesign owns map data + sectorMode (placement, archetype per guard, dog allowance, post / zone tags as data, restart resets, camera cap). Data requests for guard-ai: end of research/ENGINE.md. Protocol 31 is sector-redesign's (Sector light sync); guard-ai takes 32. Guard-cap perf run requested on the laptop by the orchestrator.

## Resume prompt
```
Night Shift | Course Ready Build: RESUME sector-redesign. Read CLAUDE.md, docs/ROADMAP.md (origin/feature/menu for the
live "Decided"), docs/sector-redesign/BRIEF.md and this STATE (origin/feature/sector-redesign), and
docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays for the other open jobs (sw-reload, g44-above,
camera-range). Carry on from "Next". Follow "Rules after the reset" above; WIP pushed after every hand-back. Report to
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
