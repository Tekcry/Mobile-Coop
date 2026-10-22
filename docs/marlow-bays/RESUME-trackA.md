# Track A (Night Shift | Course Ready Build) - resume

Written 2026-10-22 ~09:10, updated ~14:45 (new account; full burn per the orchestrator). Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bays/BRIEF.md (items
24, 29, 30 and "Tracks") and this file. Report to "Night Shift | Orchestrator".

## Open jobs

| Job | Branch / worktree | Head | State | Next |
| --- | --- | --- | --- | --- |
| Item 29 tuner v3 | `feature/tuner-v3` | merged | #97 merged as 4.49.0 (c38feca2). The JOBS=2 e2e-lightbake 16/17 was a timing race (solo 20/20, 26/26); v3 adds no materials | Done. Backlog: e2e-lightbake PBR-plugin assert should wait for the scene to settle |
| Item 24 guard tuning | `feature/guard-tune` | merged | #105 merged in train/2 #112 as 4.53.0 (5220f79c) | Done |
| Item 30 key tools | - | merged | #106 merged as 4.51.0 (d52d37a5); Menu Notes told | Done |
| clip-speed | `feature/clip-speed` | merged | #109 merged in train/2 #112 as 4.53.0 (5220f79c) | Done. Menu Notes N3 splits holster per gun (agreed) |
| anim-natural N4 holds and carries | `feature/anim-n4` | e3f63c4f | PR Tekcry/Mobile-Coop#113: desktop vitest / build / e2e-anim / e2e-studio pass; laptop check pass; train/3 2680c766 (#103 + #113) full e2e 35/35 pass; GPU re-measure after the fix: counterCorr hold -0.76, carry -0.91, lift slide 5.4 / 0 cm | Orchestrator merges train/3 |
| sector-fixes slice S (security room) | `feature/sector-fixes-s`, `C:/NightShift/Mobile-Coop-sector-fixes-s` | a070e504 | PR Tekcry/Mobile-Coop#115; checker PASS, notes applied; unit tests pass; A11 (jam handoff unchanged). docs/sector-fixes/s/STATE.md | Laptop check + full e2e (queued after CT Core N1); GPU look of the room (shots-ctcourse s3-monitors) |
| anim-n4b (N4 pass 2 rows 3, 4, 6, 8) | `feature/anim-n4b` (`C:/NightShift/Mobile-Coop-anim-n4b`; items 4+6 traverse.ts, 8 holds) + `feature/anim-n4b-team` (`C:/NightShift/Mobile-Coop-anim-n4b-team`; item 3 co-op holders), both from feature/anim-n4 e3f63c4f | - | Assigned 14:10 (orchestrator, from Menu Notes N0 pass 2: feature/anim-natural docs/anim-natural/PASS2.md). Three implementers building. Stay out of animGraph.hitReact (CT Core) and playerWeapons.ts (Menu Notes) | Merge -team into anim-n4b, merge master (after train/3), checker, one fix round, GPU audit rows (scripts/anim-natural/audit.mjs from feature/anim-natural: mantle, drop-ledge, drop-hang, roll, hold-still, pair-*), PR |

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
Night Shift | Course Ready Build (track A), resuming after an account handoff. Read CLAUDE.md, docs/ROADMAP.md and
docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (its "Open jobs", "N4 checker" and "Rules carried"
sections). Report to "Night Shift | Orchestrator" at each PR; one agent at a time; check get_usage before each agent
(97%: start none; 98%: commit, push, update RESUME-trackA.md; stopped by 99%). Desktop: full vitest / check / e2e
take C:/NightShift/heavy.lock atomically `( set -o noclobber; echo "<session> | <job> | <time>" > C:/NightShift/heavy.lock )`,
delete only if it still names you; the laptop (Character Build) runs train / full suites.

State (2026-10-22 ~14:45): see Open jobs. #113 in train/3 (passed). #115 (slice S) waits on the laptop's check + full
e2e. anim-n4b: if the implementers' work is uncommitted in the two worktrees, review it (git diff), run light checks,
commit, then merge feature/anim-n4b-team into feature/anim-n4b, merge master, one Opus checker, one fix round, GPU audit
under the desktop lock (copy scripts/anim-natural/audit.mjs from origin/feature/anim-natural; E2E_GPU=1, port 4189;
remove the copy and docs/anim-natural/audit after), full vitest / build / e2e-anim / e2e-studio, PR, laptop full e2e.
```
