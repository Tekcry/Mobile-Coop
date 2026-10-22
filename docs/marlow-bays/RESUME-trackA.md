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
- After any map change, run the FULL `npm test` (or at least tests/voxelFit.test.ts), not a Vitest subset: R's subset missed a voxelFit cover failure that broke train 11 (orchestrator, 2026-10-22 ~23:55).
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

Next (2026-10-23 ~01:00, refreshed for a context clear; master 4.61.0+):
1. #144 sector-fixes R at 53e72a11: voxelFit fix done. Laptop GPU: sectorops:1-5, coop, netmove, lightbake, levels and anchors all pass; PR CI passes; PR body updated; SHA sent for train 13. Act only on a failure.
2. ct-rattle-sample: PR Tekcry/Mobile-Coop#161 at a8af5535, CI green, train 13. Act only on a failure.
3. lightfield-heap: PR Tekcry/Mobile-Coop#163 at deb5211d, ready. Laptop loaded proof 20/20 inside train 13's JOBS=5 run (levelAt 32.0, bodyLevel 64.8, control 272.0); CI green; sent to the orchestrator for the next train. Act only on a failure.
4. #119 N4b at 560752d1 (train 12), #145 lamp gap (released 4.60.0), #150 gpu-waits + #154 netmove-compare (released train 11): act only on a failure.
5. Mocap-trial: it merges behind its toggle in train 12; residual pops (fast walk turns 1.72-2.51 cm, stop pitch snap 40 deg, start after a 0.3-0.5 s stand 27-36 deg) + a tighter mocapSwitch sweep go in a short CT Core follow-up PR. Be its fresh checker when CT Core sends the SHA: old limits are notes only ("Mocap, as captured"); pops/slides fail; switch OFF byte-identical. Repros: C:/NightShift/scratch/mt-check/repro/ and repro2/ (README.txt).
5b. marlow-final prep: done. MAP-AUDIT.md, DEVICE-INVENTORY.md and SCENARIOS.md are in docs/marlow-final-prep/ on feature/marlow-bays and were sent to Menu Notes, which lists them in docs/marlow-final/STATE.md as spec-writer inputs.
5c. sector-fixes-r2 (orchestrator's review of #144 at 53e72a11, ~01:00): a follow-up PR on a new branch `feature/sector-fixes-r2` cut from master 4.63.0 (train 13, which includes #144 and #161). Do this BEFORE the marlow-final slices.
   STATUS (save at ~01:15, 94%): feature/sector-fixes-r2 plus four item branches feature/sector-fixes-r2-nav, -r2-bolt, -r2-jump and -r2-paths, all pushed at 102e6f41 (4.63.0) in worktrees C:/NightShift/Mobile-Coop-sector-fixes-r2-<item>. The four agents had just started, with no commits yet; if they pushed WIP before the swap, check each branch's log. NEXT: run each item (1) nav, (2) bolt cap, (4) jump top-landing and (3) true 2-player paths as its own agent in its own worktree (up to 4 in parallel; full npm test each, no e2e). Then merge all four into feature/sector-fixes-r2 (watch e2e-sectorops.mjs and warehouseS2.ts overlaps), one GPU e2e run (sectorops all parts, coop, netmove, lightbake, levels, anchors), a fresh checker, and the PR.
   Findings saved at the swap:
   - r2-nav (origin 9f28aff1: an empty commit, the plan is in its message): the nav grid has no runtime blocking (src/ai/navBuild.ts:32-43, boxes / fences / cylinders only). Guards push doors (enemyManager.ts:630) but a locked door refuses (doors.ts:201), so they stall. The grid is host / solo only (gameState.ts:631). Plan: closures in src/ai/navGrid.ts (rect cells collected once; block / unblock by walk[] with a per-cell count; no runtime allocation). sectorMode.ts findBolts ~169 / unbolt ~194 / rebolt ~209: one closure per bolt (door width + 0.5 m, ~0.35 m deep, at floor height), blocked at start, opened on unbolt, re-blocked on re-bolt. Check whether refreshFlow must rerun.
   - r2-paths (no commit): each bolt side is a core area (S1 mess: corridor door x 1.9-3.1 + hatch h2, solo route 3, CCTV operator's kettle (2.6, -9.9); S2 A2 VNA aisle: solo route 3 + the tour guard's loop; S3 fire-exit lobby: the extraction box (21.4..23.7, -8.5..-5.9) via the fire door (16, -6.85)), so the solo ways can't simply be closed. Plan: a small new pocket (store / airlock / cage) on the bolt side behind each door, holding the bolt, a co-op-only entry (4.4 m lip or high hatch), a solo way out (a drop or an inside-only door), and no guard post / patrol / objective / checkpoint. Core rooms unchanged. The onward link must be one-way; check M8 / isolation.
   - r2-bolt (origin d4db822a: an empty commit, the full plan is in its message): sectors.ts SectorBolt.w? + BOLT_SIDE_MARGIN 0.3 / BOLT_DEPTH 1.2; inBoltReach(b, x, z) used by SectorBolts.use (:155); interactables.ts gets optional sideHalf / sideDepth checked in nearest (:138) when side is set; set them in sectorMode findBolts (~181) and coopClient syncItems (~366); w per bolt in warehouseSectors.ts (S1 1.2, S2 1.1, S3 1.1); tests in tests/sectorBolt.test.ts (corridor (7.55, -11.15) refused, front point accepted, just past w/2 + 0.3 refused, for all 3 doors). Don't use python (not installed); use node.
   - r2-jump: no report before the save; check its branch log.
   - Every r2 worktree: rerun `npm ci` (it was interrupted).
   (1) Guards can path into the bolted team doors and stall: navBuild.ts:33-38 builds blockers from boxes only (R1S through-bay, the S1 mess / workshop door, the S3 plant / lobby door). Block the doorway nav cells while the bolt is shut, re-open them on unbolt, and add an e2e guard search across one team door (e2e-sectorops).
   (2) The S1 door unbolts through the z -10.8 wall from the corridor (~(7.55, -11.15), 1.24 m from (8, -10.0)): Interactables.nearest (interactables.ts:138) and SectorBolts.use / onBoltSide have no sideways limit or line of sight. Cap the side offset at about w/2 + 0.3 m in both, with a unit test.
   (4) Probe whether one player can jump from the R2S top (4.0) to the R3S top (4.4) across the 3.0 m gap under the non-colliding roof panel. soloJumpReach never checks a top landing via step-up, and it is marginal at 4.0 m/s. Add the top-landing check to tests/helpers/soloJumpReach.ts and an e2e probe in sectorops part 2; widen or raise the gap if it reaches.
   (6) Polish list only: the drive motor box and hanger rods clip on the S3 drive platform.
   (3) Michael ~00:45: "true 2-player pathways that cannot be used solo, but doesnt break solo play". Rework each of the three team-door routes so the pathway needs one player on each side: close or gate the ordinary solo ways round to the bolt side (the S1 mess door at x 1.9; S2 round R1S's ends; the S3 lobby door at (16, -6.85)). A solo player must still finish each sector by the normal route; the team pathway is an extra, never required. Log it as M2 in docs/sector-fixes/r/PLAN.md; it replaces A2 "extras" for the doors. e2e: a solo probe proves each pathway is unusable alone AND the sector still completes solo.
   Tests: full npm test; GPU e2e-sectorops (all parts), coop, netmove, lightbake, levels, anchors; PR CI green before sending the SHA.
6. When 1-3, 5 and 5c are clear: become the second builder on marlow-final, the Marlow Yard redesign led by Menu Notes. Michael's words and answers are in ROADMAP "Decided" on feature/menu 42ed668b. Menu Notes' PLAN hands over whole slices: read it, ask Menu Notes which slice is yours, and build on its branch rules. Otherwise ask the orchestrator for the next job. Locks: heavy.lock (4191, CPU < 60%) / heavy2.lock (4192, GPU, CPU < 50%), atomic noclobber, no wait loops; if both are held send runs to Character Build (laptop 4192/4189). Always E2E_GPU=1; a GPU failure counts. After any map change run the full `npm test`. Max 3 agents. Check `gh pr checks` before sending a SHA.
```
