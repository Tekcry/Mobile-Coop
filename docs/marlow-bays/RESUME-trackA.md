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
| anim-n4b | `feature/anim-n4b`, `C:/NightShift/Mobile-Coop-anim-n4b` | c22b6719 | PR Tekcry/Mobile-Coop#119: PR fix 2 (6f734d3e: ladder top-entry plays no mantle plant / sink; ROLL_CLEAR 0.9, a roll needs ~1.5 m, in the PR body) + master 4.57.0 (c22b6719, 2026-10-22 ~19:50: #122's leftover `i.slide` / SLIDE block dropped in animGraph.ts, PlayerPose keeps traverseH / traverseD without slide / check, the Unreleased block moved to `changes/feature-anim-n4b.md`; no AnimInput / PlayerPose slide / check reads left; tsc clean, 18 related Vitest files 217/217). Earlier desktop e2e-clip 19/19, traverse / move / anim / netmove ok | In train 8 at c22b6719 (orchestrator ~19:52: no separate e2e-anim, train 8's full run covers it); act only on a failure |
| heap-asserts (tests + one menu fix) | `feature/heap-asserts`, `C:/NightShift/Mobile-Coop-heap-asserts` | 66f60318 | PR Tekcry/Mobile-Coop#128 + master 4.56.0 (8 heap files 99/99) | Orchestrator train (e2e-menus in its run) |
| studio-pairs (AUDIT fix 12) | `feature/studio-pairs`, `C:/NightShift/Mobile-Coop-studio-pairs` | c30d3391 | PR Tekcry/Mobile-Coop#134: stageLightKeep drops shared part bases (anim-natural audit.mjs:642 pushed them: white guard), unlight() recompiles; laptop GPU 63ec33ec good; checker PASS; polish in docs/studio-pairs/FIX-GPU.md | In train 7 (orchestrator) |
| sector-fixes R (co-op-only routes) | `feature/sector-fixes-r`, `C:/NightShift/Mobile-Coop-sector-fixes-r` | 8bc0f606 | PR Tekcry/Mobile-Coop#144 (opened 2026-10-22 ~21:48). RE committed (a73ca3a5); checker FIX, fix round d85ce219; laptop GPU run of 2f40ed74 failed sectorops (S1 monorail end stop, S3 climb-up headroom, test take-offs); e2e fix ed2601d2 (S3 roof hoods, S1 empty lane pallet, runner splits named suites into parts) + S2 C2 dispatch landing (Michael M1 "Add another", solo margin 0.85 m); master 4.58.1 merged at 8bc0f606 (S3: R's platforms + slice L's addLampRooms; changelog now changes/feature-sector-fixes-r.md). Desktop GPU at 8bc0f606: sectorops:1-5, coop, netmove, lightbake, levels, anchors all ok (277 s wall); Vitest 211/3 skipped; tsc clean. docs/sector-fixes/r/RE.md has the e2e history (not yet the 8bc0f606 run: it is in the PR body) | Waiting on the orchestrator to put #144 in a train; act only on a failure. Polish: C1b margin 0.05 m; R3S top and the S2 landing clip ~0.1 m into the drawn roof panel |

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

Next (2026-10-22 ~22:15; Michael: no usage stops, he resets at 100%; resume when the orchestrator says so):
1. sector-fixes R: PR Tekcry/Mobile-Coop#144 at 8bc0f606, every touched suite green on the desktop GPU (PR body). Waiting for a train; act only on a failure.
2. #119 (feature/anim-n4b): train 8 fix pushed at e957db2f (73f3d201 brace is not a hold + TeamPoser.jump on paused studio frames; 7068323f merge of master 4.58.1, master's keyed-walk wait kept; e957db2f the matching wait back to procedural). e2e-studio ok 37 s and e2e-anim ok 32 s on the desktop GPU (studio at e957db2f, anim at 6c0e162f). The orchestrator reruns e2e-studio in train 8. Act only on a failure.
3. lamp-plugin-gap (backlog 30, the orchestrator's spare job): PR Tekcry/Mobile-Coop#145 at 3b34b7a3, `feature/lamp-plugin-gap`, `C:/NightShift/Mobile-Coop-lamp-plugin-gap`, patch. `BakedLamps` sets a flag from `onNewMaterialAddedObservable`, and `frame` re-attaches on the flag or a count change. New tests/lampPluginGap.test.ts fails on the old code. e2e-lightbake 26/26 on the desktop GPU (60 s). Waiting for a train; act only on a failure.
4. decisions-fold-2: merged as 4.58.3 (PR Tekcry/Mobile-Coop#146 at 1fed3bc6, `feature/decisions-fold-2`: feature/menu ROADMAP's Decided entries (above the G192-G228 line) folded into DECISIONS.md as G229-G269. The PR body maps each entry; the ~21:20 vent hold-jump review was skipped (still waiting on Michael). The orchestrator trims ROADMAP after the merge.)
4b. gpu-waits-sweep (tests only, patch): PR Tekcry/Mobile-Coop#150 at af1d8045, `feature/gpu-waits-sweep`. 10 condition waits, each with the assert's own condition and a 3 s cap: e2e-studio :720 / :725 / :768 / :1027 / :1041 / :1167, e2e-menus :689 / :692 / :719 / :725. Desktop GPU: e2e-menus ok 57 s, e2e-studio ok 43 s, both ran to completion. Waiting for a train; act only on a failure.
4c. mocap-trial checker (for CT Core): done (~22:45). Verdict FIX at 06e773e1, sent to CT Core with a copy to the orchestrator. Required: (1) clip / planner foot hand-off pops in walking turns (clipOwn is never cleared in beginSwing / land, plus a heel-pitch snap at the turn's end); (2) a 26 deg toe pop on the first clip swing after a start. Decide: start-slot arms out of phase. Switch OFF is bit-identical, with no slide, licence or allocation problems. CT Core owns the fix round; nothing left for track A.
4d. netmove-compare (tests only, patch): `feature/netmove-compare` in `C:/NightShift/Mobile-Coop-netmove-compare` from master cb198a91. The e2e-netmove "drawn: host mode ground, joints within 10 cm" compare (~:245, via the helper ~:65) samples at wall time and read 10.7 cm at JOBS=3. Compare host and client at the same sim tick instead, with the 10 cm limit unchanged and no src change. GPU runs: netmove alone x2, then netmove + coop + menus at JOBS=3, then the PR. An agent was running it at ~22:50 and pushing WIP: check the branch log.
5. #119 (train 8), #144 R and #145 lamp-plugin-gap (train 10), #128, #134: in trains; act only on a failure. Then ask the orchestrator for the next job.
```
