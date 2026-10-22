# Track A (Night Shift | Course Ready Build) - resume

Written 2026-10-22 ~09:10, updated ~17:50 (full burn; stop new agents at 97% of the 5-hour window). Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bays/BRIEF.md (items
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
| anim-n4b | `feature/anim-n4b`, `C:/NightShift/Mobile-Coop-anim-n4b` | 1e442236 | PR Tekcry/Mobile-Coop#119. Desktop 149003aa: vitest / lint / build / e2e-anim / studio / traverse ok; e2e-clip ladder drop failed (fixed in 1e442236: no legs-ahead fall straight off a wall hold), netmove / coop killed at 600 s and ctcourse station 3 setup check failed (load: same on other branches today), split breath now on a shared split-entry clock. GPU audit posted. Laptop asked: check + e2e-clip, netmove, coop, ctcourse SOLO on 1e442236 | Laptop verdict; then train 5 (orchestrator) |
| heap-asserts (tests only) | `feature/heap-asserts`, `C:/NightShift/Mobile-Coop-heap-asserts` (from master 9287a095) | - | Assigned 16:30: heapUsed "never allocates" asserts (animSkeletonRows.test.ts:127, animSkeletonClip, keyCurve, animWeight) pass only when a GC lands in the window; move to the lightField gc() + new-space method with a per-call limit, or find the vitest-only boxing. Implementer agent started 16:38 (uncommitted work in the worktree if this session was cleared) | Review its diff, 5x stable runs, commit, PR (tests-only tier) |
| studio-pairs (AUDIT fix 12) | `feature/studio-pairs`, `C:/NightShift/Mobile-Coop-studio-pairs` | 8091de94 | Stage lights only on Wren's own meshes (hold-pair guard no longer white); pair puppets hold LOD0 through the loop; `__studioStage.puppets()` readiness hook; boost vanish not reproduced on the CPU (likely a shader not ready on a fresh page). GPU script ready: `bash C:/NightShift/sp-gpu.sh` (audit.mjs copied untracked) | When the orchestrator gives the desktop lock (after Menu Notes): run sp-gpu.sh, read the pair sheets, PR (merge after #119 lands; both edit studioPairs.ts / studioStage.ts, dry-run merge clean) |

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

Next (2026-10-22 ~17:50):
1. heap-asserts (feature/heap-asserts, worktree C:/NightShift/Mobile-Coop-heap-asserts): if an agent is not running and
   the worktree has uncommitted changes, review the diff, run each changed test file 5x, commit, PR (tests-only tier),
   and send CT Core the bodyMotion.test.ts patch for feature/anim-natural-n2 using the new helper.
2. #119: act on the laptop verdict for 1e442236 (Open jobs row).
3. studio-pairs: GPU look when the lock is handed to you, then PR.
4. Then ask the orchestrator for the next job.
```
