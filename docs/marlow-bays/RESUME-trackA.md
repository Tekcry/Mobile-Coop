# Track A (Night Shift | Course Ready Build) - resume

Written 2026-10-22 ~09:10, updated ~19:05 (paused at the 5-hour 98% stop; resumes after the 21:10 reset). Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bays/BRIEF.md (items
24, 29, 30 and "Tracks") and this file. Report to "Night Shift | Orchestrator".

## Open jobs

| Job | Branch / worktree | Head | State | Next |
| --- | --- | --- | --- | --- |
| Item 29 tuner v3 | `feature/tuner-v3` | merged | #97 merged as 4.49.0 (c38feca2). The JOBS=2 e2e-lightbake 16/17 was a timing race (solo 20/20, 26/26); v3 adds no materials | Done. Backlog: e2e-lightbake PBR-plugin assert should wait for the scene to settle |
| Item 24 guard tuning | `feature/guard-tune` | merged | #105 merged in train/2 #112 as 4.53.0 (5220f79c) | Done |
| Item 30 key tools | - | merged | #106 merged as 4.51.0 (d52d37a5); Menu Notes told | Done |
| clip-speed | `feature/clip-speed` | merged | #109 merged in train/2 #112 as 4.53.0 (5220f79c) | Done. Menu Notes N3 splits holster per gun (agreed) |
| anim-natural N4 holds and carries | `feature/anim-n4` | merged | #113 merged in train/3 #114 as 4.54.0 (99f3e488) | Done |
| sector-fixes slice S (security room) | `feature/sector-fixes-s` | merged | #115 in 4.55.0; guardInfo test patch #124 merged as 4.55.1 (master green) | Done (GPU look of the room still owed: scripts/shots-ctcourse.mjs s3-monitors) |
| anim-n4b | `feature/anim-n4b`, `C:/NightShift/Mobile-Coop-anim-n4b` | aee3fd34 | PR Tekcry/Mobile-Coop#119: PR fix 2 (6f734d3e: ladder top-entry plays no mantle plant / sink; ROLL_CLEAR 0.9, a roll needs ~1.5 m, in the PR body) + master 4.56.0. Desktop e2e-clip 19/19, traverse / move / anim / netmove ok | Left out of train 7: src conflicts with master 4.57.0 in src/anim/animGraph.ts and src/player/player.ts (#122 / #123). Merge origin/master, resolve, check + e2e-anim, push: train 8 |
| heap-asserts (tests + one menu fix) | `feature/heap-asserts`, `C:/NightShift/Mobile-Coop-heap-asserts` | 66f60318 | PR Tekcry/Mobile-Coop#128 + master 4.56.0 (8 heap files 99/99) | Orchestrator train (e2e-menus in its run) |
| studio-pairs (AUDIT fix 12) | `feature/studio-pairs`, `C:/NightShift/Mobile-Coop-studio-pairs` | c30d3391 | PR Tekcry/Mobile-Coop#134: stageLightKeep drops shared part bases (anim-natural audit.mjs:642 pushed them: white guard), unlight() recompiles; laptop GPU 63ec33ec good; checker PASS; polish in docs/studio-pairs/FIX-GPU.md | In train 7 (orchestrator) |
| sector-fixes R (co-op-only routes) | `feature/sector-fixes-r`, `C:/NightShift/Mobile-Coop-sector-fixes-r` | e0e50027 | docs/sector-fixes/r/PLAN.md, R1-R3.md, RT.md: 2 routes per section (4.4 m lips, leg-up + relay / rope) + 1 team door per section (bolt, no wire change; coopClient.ts one change). Unit tests S1 10, S2 13, S3 19, sectorBolt; tsc, lint ok. RE agent (e2e-sectorops two-player route walks, solo refusal, bolt; engine proof of lip-to-5.0-pipe jumps and crouch under 1.63 m roofs) was running at the pause: check `git status` and docs/sector-fixes/r/RE.md for its WIP | Finish / rerun RE, one checker (one fix round), then ask Character Build for e2e-coop + e2e-netmove + e2e-sectorops on the checked commit, open the PR, tell the orchestrator (train 7) |

Merged tonight (track A): #81 coop-torches 4.34.0, #82 T 4.35.0, #83 T1a 4.36.0, #86 T2 4.39.0, #87 item 23 4.40.0,
#89 items 26 / 26b 4.41.0, #91 item 25 4.43.0.

## Item 24 PR body (summary)
Guard tuning: a Who list (Wren / Guard) in the v3 what-row (Body, Stepping, Weight tabs); a guard puppet in the studio
(real grunt rig, no AI); rows `guard.joint.<row>`, `guard.step.<gait>`, `guard.weight.<row>` (`src/anim/tuneGuard.ts`);
generated `src/anim/animBaseGuard.ts` baked by `src/anim/tuneBakeGuard.ts`; `src/ai/enemyRig.ts:18`
`rig.guardRows = true;` the one flag line; Wren's Stepping rows no longer reach guards; VIP / dummy / carried body read
an identity stepping table; guards untuned bit-identical. Edits marked "(item 24, track A)" in tuneJoints.ts,
characterRig.ts, tuneStep.ts, footPlanner.ts, player.ts. Checker's two findings fixed.

## Rules carried
- One checker per slice, one fix round; full e2e on the laptop first (Character Build, E2E_JOBS=2); the desktop runs a
  full e2e only at E2E_JOBS=1 when the laptop is busy; named suites wherever free. Version set at merge (G183).
- Desktop heavy lock: take it atomically, `( set -o noclobber; echo "<session> | <job> | <time>" > C:/NightShift/heavy.lock )`,
  retry if it exists, never overwrite, delete only if it still names you; each e2e its own `E2E_PORT`.
- Usage: check `get_usage` before each agent; pause at 97% at a clean commit and tell the orchestrator; the orchestrator
  sets how many agents run at once.
- Track A owns `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`, `scripts/anim-keys/*`.
  Keep at merge: CT Core's `key_clip.py:481` ankle-frame fix (feature/anim-run-half), padGroup / backStep / fillLevels,
  `.debug-tune[hidden]` style, Reset baked (button under More), Menu Notes' `studio.ts` skeleton_test lines. New sliders
  from CT Core / Menu Notes (naturalness pass, docs/anim-natural/BRIEF.md) arrive through the registry and must bake.
- Michael's tuner rules: one layout for every input (only hint glyphs follow the input), layout from viewport size only,
  no search / recent / pins / body map, plain-English labels, subtle highlight with an off switch.
- Load rule (orchestrator 17:45): e2e-coop / e2e-netmove / e2e-ctcourse run on the laptop only; desktop e2e at E2E_JOBS=1 while agents run; GPU stays on the desktop.
- Laptop is the main test machine, GPU included (Michael 17:50): full runs, co-op suites and GPU work (shots, anim-audit, studio audits) go to Character Build with branch, commit, script and output place; the desktop runs only quick single suites at E2E_JOBS=1. A checker-passed PR joins the next train with CI only, except src/net / PROTOCOL_VERSION / save-shape PRs, which pass their area suites first; a result stands for later commits that change only docs / CHANGELOG / test scripts.
- Tell Menu Notes (track C) when key-file / tuneKeys PRs open and land.

## N4 checker (2026-10-22 ~12:55, verdict FIX) - fixed in a65a9496 (13:40)
1. (required) Carry lean / hip shift applied with nothing on the shoulder: `src/game/gameState.ts:1754` sets `carryBody`
   from `st.bend > 0 || st.bendDrop > 0` (true for the whole lift and put-down), so `src/anim/cqGait.ts:166-168` eases
   `carryK` / `side` to 1 within ~0.3 s of the lift start: she rolls 6 deg toward an empty shoulder while kneeling
   (t < liftReach 0.8 s), and keeps leaning after the ragdoll takes the body on the drop (dropHand 0.4 s). Fix: pass a
   load share 0..1 (`RigPose.carrySide = loadSide * k`, k = `lc.hoist` in the lift, 1 carrying,
   `1 - ease(t/dropHand)` on the drop), scale `spRoll` and `pelX` by it; test: no lean at lift t = 0.4.
2. (decide in the fix round) `src/game/stealthSystems.ts:362` reads `rig.planner` foot contact inside the 60 Hz sim step
   to time the controller crouch (frame-rate dependent; stale if the rig is not animated); the controller crouch now
   starts ~0.42 s instead of 0 (`closeQuarters.ts:131`, stealth profile). Preferred fix: keep the controller crouch on
   the sim's fixed lift timeline and make "stay down until a foot lands" animation-only.
3. (note) Remote carries get no N4 effect (body carry not on the wire, pre-existing); reword the tuner note "read by
   every rig holding or carrying". Minor: `cqRows()` once per frame rather than per rig; no bake re-run no-op test.

## Resume prompt (new session, no history)

```
Night Shift | Course Ready Build (track A). Read CLAUDE.md, docs/ROADMAP.md (origin/master) and
docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays ("Open jobs" and "Rules carried"). Report to
"Night Shift | Orchestrator" at each slice and PR. Full burn: parallel agents where work splits; check get_usage before
each agent (97% of the 5-hour window: start none; 98%: commit, push, update RESUME-trackA.md; 99% stop). Desktop heavy
work (full vitest, build, e2e, GPU) takes C:/NightShift/heavy.lock atomically
`( set -o noclobber; echo "<session> | <job> | <time>" > C:/NightShift/heavy.lock )`, never in a wait loop that could jump
the orchestrator's lock queue, deleted only if it still names you; the laptop ("Night Shift | Character Build") runs
area suites and train e2e on request.

Next (2026-10-22 ~19:05, after the 21:10 reset when the orchestrator says resume):
1. sector-fixes R: look at the worktree (RE's e2e WIP, docs/sector-fixes/r/RE.md); finish RE, then a fresh checker
   (one fix round), then Character Build runs e2e-coop + e2e-netmove + e2e-sectorops on the checked commit (no
   separate full run: train 7 has it), then the PR; tell the orchestrator.
2. #119: merge origin/master (4.57.0) into feature/anim-n4b, resolve animGraph.ts / player.ts, check + e2e-anim, push, tell the orchestrator (train 8). #128, #134: in trains; act only on a failure.
3. Then ask the orchestrator for the next job.
```
