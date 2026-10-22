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
00. M12 (unavoidable posted guards, BRIEF): log the chokes as A-numbers, fold them into SPEC (which sections, which
   guard, solo clear, co-op option, e2e nav-with-view-cone assert) and PLAN, and send Guard AI Build the posted-guard
   data shape (ENGINE.md section 7: `role: 'posted'`, `zone`, allowed distractions).
0. (99% stop, ~03:45) Slice 0 DONE at b0b7bc24 (A46-A51 in BRIEF; ENGINE.md section 7 = guard-ai requests;
   docs/sector-redesign/FOR-CAMERA-RANGE.md = one hunk for camera-range). Owed: a fresh Opus checker, the full npm
   test + e2e-sectorops (all parts), coop, netmove, lightbake, levels, anchors at E2E_GPU=1 via Character Build.
   Open: co-op client lamps not reset on restart until slice L.
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
Night Shift | Course Ready Build: RESUME (cleared session). Job: sector-redesign (lead), branch feature/sector-redesign,
worktree C:/NightShift/Mobile-Coop-sector-redesign. git fetch, then read: CLAUDE.md and docs/ROADMAP.md (origin/feature/menu
for the live "Decided"); docs/sector-redesign/BRIEF.md (Michael M1-M11, assumptions A1-A45), STATE.md (this file: Now,
Rules after the reset, Next, MORNING-REVIEW), PLAN.md and SPEC.md, all on origin/feature/sector-redesign. Other open
items are in docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (PRs #169 g44-above and #176 sw-reload in
the orchestrator's train 16: post the laptop rerun of sw-reload 0a34662b on #176 when Character Build replies).
In flight at the save (check each branch's log; an agent from the old session is gone, so rerun its slice from PLAN.md
if its work is not committed): slice 0 (this branch), slice L (feature/sector-redesign-light, protocol 31),
camera-range (feature/camera-range). Carry on from "Next" under "Rules after the reset" (99% windows, max 3 agents,
Opus briefs / checks, Sonnet 5.5 builds greyboxes, Opus for engine work). Michael is asleep: log assumptions, no
question dialogs. Every e2e is E2E_GPU=1 and goes to Night Shift | Character Build on the laptop. Report to
"Night Shift | Orchestrator" at each slice and PR.
```
