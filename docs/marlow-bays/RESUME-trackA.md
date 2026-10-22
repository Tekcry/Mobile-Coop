# Track A (Night Shift | Course Ready Build) - resume

Written 2026-10-22 ~09:10, updated ~12:40 (paused for the 5-hour window, resume on the orchestrator's message after 14:10). Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bays/BRIEF.md (items
24, 29, 30 and "Tracks") and this file. Report to "Night Shift | Orchestrator".

## Open jobs

| Job | Branch / worktree | Head | State | Next |
| --- | --- | --- | --- | --- |
| Item 29 tuner v3 | `feature/tuner-v3` | merged | #97 merged as 4.49.0 (c38feca2). The JOBS=2 e2e-lightbake 16/17 was a timing race (solo 20/20, 26/26); v3 adds no materials | Done. Backlog: e2e-lightbake PBR-plugin assert should wait for the scene to settle |
| Item 24 guard tuning | `feature/guard-tune` | e8cdba4e | PR Tekcry/Mobile-Coop#105; e2e-menus focus fix (part picker keeps first focus, Who one D-pad up); green inside #109 f92747c4 | In train/2 (orchestrator merges) |
| Item 30 key tools | - | merged | #106 merged as 4.51.0 (d52d37a5); Menu Notes told | Done |
| clip-speed | `feature/clip-speed`, `C:/NightShift/Mobile-Coop-clip-speed` | f92747c4 (train/1 + #105 merged) | PR Tekcry/Mobile-Coop#109; checker PASS; laptop check + e2e-menus / studio / anim / weapons-carry ok | In train/2. Menu Notes N3 splits holster per gun after it merges (agreed) |
| anim-natural N4 holds and carries | `feature/anim-n4`, `C:/NightShift/Mobile-Coop-anim-n4` | 082be068 (from master 71ce1bff) | Built: src/anim/cqGait.ts, tuner section `cq` (10 sliders, bake); counterCorr hold +0.85 -> -0.76, carry +0.95 -> -0.91; lift slide 20.9 -> 0 cm; carry-walk 8.7 cm slide left for N1 (slow-walk late-stance toe slide; start-turn pivot). Hooks in animGraph.ts / characterRig.ts marked (anim-n4, track A). tsc, vitest, lint, e2e-anim, e2e-studio pass | After reset: fresh Opus checker, one fix round, merge master, PR, laptop suites; tell CT Core the N1 items |

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
- Tell Menu Notes (track C) when key-file / tuneKeys PRs open and land.

## N4 checker (2026-10-22 ~12:55, verdict FIX) - fix round after the 14:10 reset
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
