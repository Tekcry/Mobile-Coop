# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Character Build SAVE 6 (2026-10-23 ~10:55, new account; wins over all below):**
- SENT: hang-down 4072e2b9 GREEN (netmove + takedown, 161 s) -> CT Core. Guard AI S7 4052c434 GREEN (stealth-ai x2,
  sectorops) -> Guard AI + PR #196. marlow-final 45a74383 4/7 (ctcourse :2 A3 cleaner, :3 A6 pass 2 cage, :4 A7) -> Menu
  Notes. PR #198 changelog-dedupe open (train 22 with #194).
- LESSON: the old account's chains p / q "ran" s6cap, marlowcap-cc24e992 and s9 shots in 0 s (runner never started,
  no run folder): a chain from a dead session cannot start child powershell. Restart every chain in the new session.
  Re-queued: chain-1023s (s1look-2198d0da, 4189: work/s1-look.mjs, shots runs/s1-look) -> chain-1023t (marlowcap-cc24e992,
  s9shots before / after, guardrender-s6cap-c181002e), both ALONE on 4189.
- 11:05 TRAIN 22 a39d688f (menu docs + #198 + #194 + guard-ai #193 -> #195 -> #196): chain-1023u.ps1 runs it on 4189
  (build;full, JOBS=5, 4192 kept idle), then calls chain-1023t (measures, then s1look2-2198d0da: the s1look shots had
  vision off in all 6 (MODE replace bug, fixed); merged guard renders fine). Verdict -> orchestrator (4.71.0 on pass).
- 11:15 SENT Menu Notes: marlowcap-cc24e992 vs 5100141d table (draws -10..35%, GPU down everywhere) + s9 shots
  (all 25 meter / field rows identical to 0.001). Chain t now holds only s6cap + s1look2 (after train 22).
- 11:20 S3a fix round DONE e704d5f3 (guard-render STATE "S3a fix round"; exceptions: lean wall walk 17 cm, peek walk
  cycle 29 cm, backpedal start 13 cm). Opus checker running: S3a recheck + S6. chain-1023w.ps1 (replaces v; after chain t): 4189 guardais10-88a93584 (Guard AI S10 tip 88a93584 = S6 + talking pairs, replaces 74095d47: stealth-ai sectorops ct-warehouse levels enemies wall takedown, JOBS=3; verdict with full assert lines to Guard AI) then
  guardrender-s3a-e704d5f3 (stealth-ai takedown sectorops enemies coop ctcourse, JOBS=3) + 4192 guardrender-s6-c181002e
  (smoke stealth-ai sectorops ctcourse, JOBS=2).
- 11:15 TRAIN 22 a39d688f GREEN (full GPU JOBS=5, wall 408 s) -> orchestrator (4.71.0). JOBS=5 clean beside an idle 4192.
- 11:40 GUARD-RENDER: S1 look check OK (look-s1/, on = off in all 3 visions) -> PR #204 OPEN (train-ready, orchestrator
  told). S6 measure DONE (work/guardrender-s6-on|off; alert 24: sectorops 8.4 -> 8.1 ms, ctcourse 7.3 -> 6.5, patrol
  noise, no render-CPU regression on baked maps). AGENTS: Opus S3a fix round 2; Sonnet S6 fix round (custom list only
  when baked moon, reach from player, body rigs reach, runs into docs); Sonnet S5 PR prep (merge S1 + master, golden:
  report, no recapture without CT Core). RUNNING chain w: 4189 guardais10-88a93584 then guardrender-s3a-e704d5f3 (stale
  after fix 2: rerun on the new head), 4192 guardrender-s6-c181002e (baseline before the S6 fixes).
- 11:45 PR #205 OPEN guard-render S5 9fc1e66a (stacked on #204, same train; golden passes, no recapture). Runner
  guardrender-s5-9fc1e66a waits on the 4192 lock (e2e-anim e2e-takedown, JOBS=2): message the orchestrator only on a fail.
- 11:50 SENT Guard AI S10 88a93584 9/11 (stealth-ai radio "everyone within the call + 4.5 s"; sectorops:1 panel
  alarmBy radio, sector tags 3.93 m, talking pairs 4.44 m). S6 fix round DONE ec859eeb (cascade lists only under
  the baked moon, reach from the player, body rigs reach, run-s6-on|off in docs); runner guardrender-s6-ec859eeb waits on
  4192 (smoke stealth-ai sectorops ctcourse). Next S6: one Opus checker batch with S3a fix 2, then PR WITHOUT S6d
  unless Michael OKs the ground-shadow look (gain small).
- 11:30 CHECKER (Opus) S3a e704d5f3 PASS WITH NOTES: (1, blocks job PR) fit script has no `free` mode for MOVE + no
  crouch sweep; (2) harness re-implements syncHitboxes emote logic (move to a pure fn, test beginTakedown blindPose clear);
  (3) hostage walk untested (mSx survives held blend, frozen phase); exceptions OK, peek cycle 29 cm = follow-up (smaller
  guard PEEK_HIP or sim foot model). -> Opus fix round 2 running on feature/guard-render-s3a. S6 c181002e PASS WITH NOTES:
  (2) getCustomRenderList re-prepares the list per cascade: check render() CPU on a NON-baked-moon map in the on / off
  measure, else cull only with moving casters; (3) reach measured from activeCamera, use the player / camera target;
  (4) dropped carried bodies have no reach; (7) past 40 m guards lose ground contact in moonlight (blobs off): S6d stays
  off master until Michael sees the look check. Light parity clean. S6 fixes wait for guardrender-s6cap results.
- RUNNING (old, see above for current): chain-1023p.ps1 (waits for no locks, then 4189 ALONE guardrender-s6cap-c181002e), chain-1023q.ps1 (after p),
  chain-1023r.ps1 marlowfinal-45a74383 on 4189 (JOBS=3; verdict per suite to Menu Notes). 4192: guardais7-4052c434
  (Guard AI S7 test fix: build; e2e-stealth-ai x2; e2e-sectorops, JOBS=2; replaces the 62884858 2x rerun) -> verdict
  to Guard AI Build + PR #196 comment (full 'lkp' assert line if it fails).
- AGENTS: Opus S3a fix round on feature/guard-render-s3a (from WIP c8128bdb, checker findings 1-4 in SAVE 5); Sonnet S1
  PR prep on feature/guard-render (merge master, fragment, TESTING, systems doc, shot commands; no PR yet); Haiku chore
  feature/changelog-dedupe (worktree -changelog-dedupe: changelog-assemble skips entries already in CHANGELOG.md).
  Next: S1 look shots on 4189 (after trains) -> S1 PR; one Opus checker S3a recheck + S6; S5 PR after S1.

**Character Build SAVE 5 (2026-10-23 ~10:35, swap at 99%; wins over SAVE 4 and below):**
- SENT since SAVE 4: train 21 b5895388 GREEN 39/39 (JOBS=3, 616 s) -> orchestrator. Guard AI S5 80efb8b4 9/10
  (sectorops:1 posts site assert), S7 084e373c 10/10, chain tip ae1f1895 9/11 (sectorops:1 posts TypeError, stealth-ai
  "the finder searches"), S8 54627243 8/9 (ran though dropped). Course Ready 22e755bf coop + netmove GREEN; c92fc53b
  ops6 FAIL (C2 card-door hack); 07c96701 ops6 VOID (stale dist from S8: ALWAYS build). CT Core hostage-gait c581a9c4
  GREEN; hang-down 0578d554 coop + ctcourse:2 FAIL (real; CT Core fixing, solo reruns dropped).
- LESSONS: TaskStop / killing a chain's bash does NOT stop a powershell runner it already started (S8 ran). A step list
  without "build" serves whatever dist the slot worktree holds: always build.
- CHAIN (10:40, survives the swap: PowerShell, not bash): C:/NightShift/scratch/chain-1023p.ps1, log
  runs/chain-1023p.log (start / end per label). Order: marlowcap-5100141d DONE + SENT to Menu Notes ->
  4192 sectorredesign-3796700d-ops6 SENT (reception panel fail) -> guardaichain-62884858 SENT + PR #196 comment (stealth-ai lkp fail) -> hangdown-4072e2b9 -> wait no locks -> 4189 ALONE
  guardrender-s6cap-c181002e (guard-cap S6 sun rules on: work/guardrender-s6-on; ?guardsun=0: work/guardrender-s6-off).
  ALSO chain-1023r.ps1 (10:50, 4189 JOBS=3 at once): marlowfinal-45a74383 (Menu Notes: build; e2e-ctcourse (all 4 parts)
  e2e-coop e2e-netmove e2e-course). Expected: :2 may stop in A4 "the client gets the refusal" (a4GoodsShed.mjs:177);
  :4 runs unchecked A8 WIP (informative). Reply per suite to Menu Notes. The S6 cap and chain q wait for its lock.
  THEN chain-1023q.ps1 (log runs/chain-1023q.log; starts when chain-1023p.log says "done"), Menu Notes marlow-final,
  ALONE 4189: marlowcap-cc24e992 (perf "after", same spots script as 5100141d; out runs/guardcap-cc24e992-out, -a7) ->
  s9shots-before-5100141d -> s9shots-after-cc24e992 (runs/s9-shots, suffix before / after). Reply Menu Notes: per-cell
  before (work/marlowcap-5100141d*) / after (frame med, CPU, GPU, draws, tris, shadow passes); shots: meter / field rows
  within 0.02, flag f-gallery-from-a1, f-l7-model, f-dock and the a3 / a4 / a7 glass vantages. Their ctcourse :1-:4 /
  coop / netmove / course e2e request on the fix commit goes AHEAD of chain q if q has not started.
  It skips a label that is already DONE. On resume: send each DONE verdict (below); if chain-1023p.log has no "done"
  line and no live powershell runs it, restart it (same file; DONE labels are skipped).
- IN FLIGHT at the save (session-bound bash chains die in the swap; a runner already started keeps going). On resume
  read each summary.txt; no DONE = rerun with the same steps:
  4189 ALONE (queue-1023f.sh): guardrender-s0cap-0b4805a4 DONE (4.68.0 baseline: build; scripts/guard-cap.mjs --counts=0,12,16,24
  --cells=patrol,away,alert --maps=sectorops,ctcourse --out=C:/NightShift/scratch/work/guardrender-s0-base) -> then
  marlowcap-5100141d (Menu Notes "before" baseline: build; node C:/NightShift/scratch/work/guard-cap-spots.mjs
  --maps=ctcourse:course --counts=0,12 --gfx=epic --viewport=1920x1080 --warm=5 --secs=10 --spots=a8hall:112,0.05,69,90
  --out=C:/NightShift/scratch/work/marlowcap-5100141d; same with --cells=none --spots=a7data:77.5,0.05,61.5,90
  --out=...-a7). Reply Menu Notes with the table vs runs/guardcap-155fbec0-out/RESULTS.md (draws, tris, shadow passes /
  maps, active meshes per cell). Both ALONE on 4189 (4192 idle).
  4192 after marlowcap: sectorredesign-3796700d-ops6 (Course Ready PR 2 head: build;e2e-sectorops:6, JOBS=1) ->
  guardaichain-62884858 (Guard AI posts + bodies fix: build;e2e-stealth-ai e2e-sectorops, JOBS=2; send the pass / fail
  and the "posts site" line, to the Guard AI session AND as a comment on PR #196).
  -> hangdown-4072e2b9 (CT Core fix: build;e2e-netmove e2e-takedown, JOBS=2; verdict to CT Core Build, copy the
  orchestrator; coop + ctcourse already pass on the desktop).
- GUARD-RENDER:
  S1 668d623d DONE + measured (f1bdb3ba docs/guard-render/run-s1, run-s1-off): 24 facing sectorops frame 9.7 -> 7.1 ms,
  render CPU 7.6 -> 4.9, GPU 6.7 -> 5.5, active 1429 -> 493; ctcourse 9.2 -> 6.3. S0 base 4.68.0 DONE (e46693de
  run-s0-base: sectorops 10.1 ms, ctcourse 9.5 = merge-off, so the off path is the true baseline). Next: look
  check shots (normal / thermal / NV, one guard on vs off), changelog fragment, TESTING.md, systems doc, PR (merge
  origin/master first).
  S5 1b895175: checker PASS WITH NOTES (L2 dropped), CT Core OK. PR after S1 (stacked): merge master, rerun
  animSkeletonGuardIdentity + footPlanner + guardPoseGolden (golden may need a re-capture on master base if mocap-on
  changed guard poses: ask CT Core).
  S3a: checker FIX (walking wall peek 30-39 cm, strafe not modelled, blind+seized keeps blind pitch, impossible lean
  signs in tests). Opus fix round was running at the save on feature/guard-render-s3a (from 994e8405): check its
  newest commits; if unfinished, restart the fix round from the checker findings (probe harness in this session's
  scratchpad is lost; the findings are in the fix commits / re-derive). Then one Opus checker batch: S3a recheck + S6.
  S6 c181002e (feature/guard-render-s6, brief briefs/S6.md): built, unchecked. Rule 2 (guards drop out of the sun
  beyond 40 m) is a look change in its own commits S6c/S6d: decide after the checker + guardsun on/off guard-cap.
  S2 skipped (only the dev-only ?voxels=1 path).
- TOKEN RULES (orchestrator 10:05): one verdict message per request batch; orchestrator only for trains, guard-render
  PRs, train-blocking failures, Michael; no polling turns; save at ~25-30% context; one checker per batch of slices.

**Character Build SAVE 4 (2026-10-23 ~09:50, new account; wins over all below):**
- SENT: train 20 cbff3050 GREEN (lightbake solo x2 PASS 129 / 127 s) -> orchestrator releases 4.69.0, train 21 full run
  comes next (jumps the 4189 queue). marlow-final 45458bbc ct2 solo FAIL (A3 relay jam 1 timeout; Menu Notes fixing
  :1-:3, one request on the fixed commit: ctcourse :1-:4 coop netmove course).
- RUNNING (chain scratch/queue-1023e.sh, log runs/queue-1023e.log; guardais5/7 runners outside it): 4192 guardais5-80efb8b4
  -> sectorredesign-22e755bf (coop netmove) -> guardrender-s1-668d623d (smoke stealth-ai). 4189 guardais7-084e373c
  (rerun, died in the swap) -> hangdown-0578d554 (coop ctcourse netmove; takedown/anim on the desktop lane) ->
  hostagegait-c581a9c4 (coop netmove). Guard AI S5/S7 verdicts go to the NEW Guard AI session (bridge
  session_01EgR14anUWaNAFhnNEsPs71); results count for 63047d27 / 38345438 (docs-only diff).
- GUARD-RENDER: Sonnet builders restarted on S5 (from 8d32c718 + WIP) and S3a (push the local guard-ai merge 8f33e44c,
  finish guardHead.ts WIP). Then Opus checkers. guard-cap S1 on/off ALONE on 4189 after the queue, then S1 PR.

**Character Build SAVE 3 (2026-10-23 ~09:30, account swap at ~91-98%; wins over all below):**
- Runs are session-bound background chains; on resume, read each C:/NightShift/scratch/runs/<label>/summary.txt: DONE =
  finished (send the verdict if not yet sent, below); no DONE = died in the swap (rerun it, same slot / JOBS / steps).
  A lock C:/NightShift/heavy-<slot>.lock with no live node is stale: delete it. Runner: scratch/laptop-runner.ps1
  (RUN_GPU=1 always; `-Steps "build;<suites>"`).
- SENT (done): mocap-on 1673e924 GREEN; #186 throw-ko 4ff5f19e ctcourse GREEN; partner-seed 5fa702d2 GREEN; marlow-final
  9876f439 1/4 and 45458bbc (ctcourse :1 :2 :3 FAIL, :4 coop netmove course PASS); sector-redesign 4def7d24 (all PASS
  but e2e-sectorops:6: 5-section guard counts s3 16, S3 route legs without nav path). guard-ai 98cf4552 STOPPED (orch.).
- TRAIN 20 cbff3050 (#185 + #186 + #188): full GPU JOBS=3 38/39, 851 s; only e2e-lightbake FAIL "gfx=epic&voxels=1: the
  lamp plugin is on every PBR material (18 / 22)" (known GPU-load flake). Solo reruns runs/train20-cbff3050-lightbake and
  -lightbake2 (4189, queued behind marlow) -> verdict to the ORCHESTRATOR (releases 4.69.0 on pass). If not DONE: rerun
  `build;e2e-lightbake` twice on 4189 at cbff3050.
- QUEUE at the save (verdict to the requester, copy the orchestrator):
  4189: marlowfinal-45458bbc-ct2solo (solo :2, Menu Notes) -> train20 lightbake x2 -> guardais7-084e373c (Guard AI S7:
  e2e-sectorops e2e-ctcourse e2e-stealth-ai e2e-ct-warehouse, JOBS=3; flag the security-room camera sending a guard)
  -> hostagegait-c581a9c4 (CT Core spare #10: e2e-coop e2e-netmove) -> hangdown-0578d554 (CT Core spare #2: e2e-coop
  [new hang-down section] e2e-ctcourse e2e-netmove e2e-takedown e2e-anim, JOBS=3; CT Core may be swapping: verdict also
  to the orchestrator).
  4192: [DONE 09:29: guardrender-s1-70470c30 GREEN 14/14 GPU JOBS=2, wall 500 s; smoke ok = shader compiles] (own job: smoke e2e-stealth-ai e2e-sectorops e2e-ctcourse e2e-coop e2e-netmove e2e-anim
  e2e-takedown, JOBS=2; first real-GPU shader check: missing guards in smoke = compile error) -> guardais5-80efb8b4
  (Guard AI S5, same 4 suites as S7, JOBS=2) -> sectorredesign-22e755bf (Course Ready: e2e-coop e2e-netmove).
  Guard AI S4: no request received yet.
- GUARD-RENDER (job lead = this session; docs/guard-render/ on feature/guard-render):
  S1 DONE in code 668d623d (a-f + checker PASS WITH NOTES, leak fix applied; STATE.md "S1 checker"). CT Core OK'd the hook.
  Next S1: e2e on the final head (668d623d differs from 70470c30 by a 2-line src fix), then guard-cap ALONE on 4189
  (both slots idle): merge on vs off (`--maps='warehouseOps:sector&sectorGuards=0&guardmerge=0,ctcourse:course&guardmerge=0'`,
  see STATE "S1 doubts") + the 4.68.0 S0 baseline, then changelog fragment, TESTING.md, systems doc, PR.
  S3a (sim-side head): Sonnet builder on feature/guard-render-s3a (worktree -guard-render-s3a, brief briefs/S3a.md), told
  to merge origin/feature/guard-ai first and keep Guard AI's radioCut / callContact lines; diff to Guard AI before PR.
  S5 (anim cost): Sonnet builder on feature/guard-render-s5 (brief briefs/S5.md; L4 at 250fc330 when saved); CT Core OK'd
  L2 gated on !this.carrier, L3 only the listed footPlanner loops; diff to CT Core before PR.
  Builders were mid-work at the save: check each branch's newest commit; restart an unfinished builder from its brief
  ("continue from the newest commit"), then a fresh Opus checker per slice (Sonnet builds, Opus checks: orchestrator 09:00).

**Character Build SAVE 2 (2026-10-23 ~01:15; FULL BURN to 100% per orchestrator 01:05, no early stop; wins over all below):**
- RULE (orchestrator ~01:12): full runs and trains back to E2E_JOBS=3 (train 15 coop miss = the first JOBS=5 failure); stress
  proofs stay JOBS=5 by design; one JOBS=5 trial full run on master after the coop offer-wait fix merges, 5 again if clean.
- Train 15 GREEN on code (coop solo PASS x2 56 / 72 s), released as 4.64.0.
- PROGRESS ~01:20: load-audit 72ffda53 stress GREEN (9 suites JOBS=5, 334 s; runs/loadstress1-72ffda53). load-audit
  5f03d938: master merged, item (3) grab token + try/finally, takedown-offer retry settle (Node poll on host g.time; the
  train 15 coop miss), checker fixes; coop solo x2 PASS on db7b24f2. Agent now on the orchestrator's review M1-M3, L2, L3
  (ctcourse own-clock latches, 3 re-jam tries, waitHostSim returns elapsed + asserts, grab 4.5 s, sidePace > 2.15).
  Then: stress on the new head, PR.
- Mediums: feature/load-latent-net 20c8602f, -ui1 2582e49a, -ui2 35bf88d1 (checker PASS WITH NOTES, note applied),
  merged as feature/load-latent-mediums d9ef1f0d (proof branch) -> running runs/loadlatent-mediums-d9ef1f0d (12 suites
  JOBS=5). feature/load-latent-coop c0ce5862 (#7, #9, spare #13 strike denied; on load-audit db7b24f2) -> coop solo x2
  runs/loadlatent-coop-c0ce5862. Checker on net/ui1/coop running.
- feature/test-chores-13 (spare #13: run-e2e KILLED line in streamed mode, role-swapped netmove pass): agent running.
- Guard-cap agent also has the orchestrator's G1-G6.
- PROGRESS ~01:35: PR #170 load-audit OPEN (40f7aa79; stress 11/11 JOBS=5 231 s). Pacing (Michael 01:12): full burn to
  100% now; after each reset pace to ~97-99% at the reset, save at 97% and idle.
- Mediums final heads: net f69dffec (includes load-audit 40f7aa79), ui1 cff39539, ui2 35bf88d1, coop 6f4e6905 (all checker
  PASS WITH NOTES, notes applied). Proof branch feature/load-latent-mediums da58a7f5 = all four -> runs/loadlatent-mediums-
  da58a7f5 (15 suites JOBS=5). First proof d9ef1f0d: 11/12, e2e-desktop:4 governor wait (:614) timed out = GPU latent flake
  (needs real missed frames; a 4090 rarely misses) -> fix proposal sent to the orchestrator, waiting for its decision.
  coop c0ce5862 solo: 1 fail (log lost: runner now keeps a log per repeated step), 1 pass -> rerun x3 runs/loadlatent-coop-c0ce5862-r2.
  PRs after proof: one PR per branch (net / ui1 / ui2 / coop), net and coop after #170.
- feature/test-chores-13 df0e2775 (on load-audit db7b24f2): netmove x2 PASS (role-swapped leg-up), KILLED line OK -> PR after #170.
- Requests on 4192 (Course Ready): sw-reload 890e8a05 (smoke offline coop netmove), g44-above d004c53d (stealth-ai stealth
  takedown ct-warehouse coop); verdicts to Course Ready + orchestrator.
- Guard-cap c707f7e4 (G1-G6 in): queued alone on 4189 when both slots idle (queue-1023b.sh) -> outputs copied to
  scratch/work/guardcap-c707f7e4; then fill docs/guard-cap/REPORT.md on feature/guard-cap and PR.
- PROGRESS ~01:45: PRs OPEN #171 net, #172 ui1, #173 ui2 (+ GPU governor check, orchestrator-approved, 3d48eafc),
  #174 coop, #175 chores 13 (net / coop / chores merge after #170). Mediums proof da58a7f5 17/17 JOBS=5 370 s.
  g44-above d004c53d GREEN (reported). sw-reload 890e8a05 = baseline only (Course Ready is fixing pwa.ts; rerun the same 4
  suites on their fixed commit). Guard-cap rebased on 4.64.0 -> e2123367, runs on 4189 when both slots idle
  (runs/guardcap-e2123367, outputs scratch/work/guardcap-e2123367) -> numbers to orchestrator + Course Ready (Sector Ops
  redesign, up to 24 guards per section), then REPORT.md + PR. Train 16 (#168 + #169 + #170) next: full JOBS=3, then the
  JOBS=5 trial on the next master.
- PACING NOW (Michael 01:45, "Lean windows", after the ~01:55 reset): every 5-hour window to 99%: no new agent at 97%,
  save at 98%, stop by 99%; laptop runs already started may finish. Opus plans / checks / real test fixes; Sonnet 5.5 or
  Haiku 5.5 agents for log reading, triage, mechanical chores from strict briefs. Laptop = the only e2e lane; slot order:
  Marlow slice suites, trains, mocap GPU suites, guard-ai and sector-redesign suites, guard-cap ALONE.
- ~02:00: train 16 45c9ebf0 (#168-#176) full GPU JOBS=3 running on 4189 (runs/train16-45c9ebf0) -> verdict to the
  orchestrator (4.65.0 on pass); then the JOBS=5 trial on the next master. marlow-final slice 0 1949764e: 7/8 (ctcourse:1
  security room = by design, fixed 5920cce5) -> e2e-ctcourse on 5920cce5 running on 4192 (runs/marlowfinal-5920cce5-ctcourse).
  Menu Notes unit files on f315434f: 12/13 PASS (117 tests); tests/facilityProps.test.ts ran past 600 s -> rerun alone
  (30 min cap). sw-reload 0a34662b GREEN (reported). Guard-cap e2123367 stopped twice for priority; rerun ALONE after train 16
  and the Marlow suites.
- ~02:25: train 16 45c9ebf0 GREEN 39/39 (JOBS=3, 559 s) -> 4.65.0 (4fb8ea80). JOBS=5 trial on 4fb8ea80 CLEAN 39/39 but
  621 s (4192 busy) -> RULE (CLAUDE.md feature/menu): JOBS=5 for full runs only while 4192 is idle, else 3. Verdicts go
  to the job lead only; copy the orchestrator only on trains, the JOBS=5 trial, guard-cap and failures.
  marlow-final slice 0 8/8 GREEN (reported). Menu Notes facilityProps.test.ts hangs at collection (their bug; fixed
  commit to come). sw-reload 0a34662b GREEN. sector-redesign d9a27c4f: all PASS except e2e-sectorops:2 team-door
  asserts (reported, likely real). Running: camera-range 8fda08b9 (4192), guard-ai S1 cd37c3e8 (4189, JOBS=3); queued
  marlow-final 3e41b859 (4189, JOBS=3); then guard-cap e2123367 ALONE (watcher waits for all three DONE + no locks).
- ~03:05: GUARD-CAP DONE: PR #180 (e2123367 + results d610c609): render-bound, ~2.2 ms frame CPU + 1.1 ms GPU per
  awake guard, AI ~0.03 ms; 12 facing = 27.5 fps, 24 = 17 fps (Epic, 4090). Numbers sent to orchestrator + Course Ready.
  Also green and reported: guard-ai S1 cd37c3e8, marlow-final 3e41b859, camera-range 9f3a5b6f e2e-security (master reads
  1.00, branch 0.84). Running chain scratch/queue-1023c.sh: marlow-final 153db3e8 ALONE on 4189 (shots to
  runs/marlowfinal-153db3e8/shots, perf via scratch/work/perf-with-server.mjs MAP=ctcourse STEALTH=1 --desktop --budget,
  e2e-ctcourse:1) -> then train 17 7fb372a9 (JOBS=3, 4189; verdict to orchestrator) + guard-ai S2 661c258a (4192, JOBS=2).
  Waiting: sector-redesign fix commit (sectorops:2 team doors), Menu Notes facilityProps fix commit.
- ~03:45: train 17 7fb372a9 GREEN 39/39 (reported). mocap-trial-2 da86e8e7 GREEN (reported). guard-ai S2 661c258a:
  stealth-ai 'light pair' stand-down FAIL (deterministic; Guard AI fixes after ~04:00, then e2e-stealth-ai solo).
  marlow-final: 153db3e8 shots done (runs/marlowfinal-153db3e8/shots), perf.mjs cannot run ctcourse; guard-cap ctcourse
  on 155fbec0 alone done (facility +1.2 ms CPU, +4 ms GPU, +110 draws; reported); e00f1d64 ctcourse:1 FAIL at the A1
  relay restart assert (reported; waiting for their fix). sector-redesign sectorops:2 fix pending (Course Ready paused).
  GUARD-RENDER job assigned (orchestrator): worktree C:/NightShift/Mobile-Coop-guard-render (feature/guard-render from
  4fb8ea80, nothing written yet); step 1 = one Opus agent, report + docs/guard-render/BRIEF/PLAN/STATE only, START AT
  ~05:30 (token pace) or when the orchestrator says. Both laptop slots idle at 03:45.
- SESSION DROP: this session was cut off ~04:58 and came back ~07:50 (2026-10-23). Not the laptop (no sleep / restart /
  network events, AC sleep + hibernate = never; Claude app updated 07:20, not 04:58) and not the usage cap (83% at 04:54)
  -> likely the Remote Control link. Note the exact time of any further drop here.
- ~07:55: train 18 0a269684 (#177 + #182) full GPU JOBS=5 on 4189 (runs/train18-0a269684) -> verdict to the orchestrator.
  guard-render step 1 agent started (report + docs/guard-render/BRIEF, PLAN, STATE on feature/guard-render). marlow-final
  42a9b295: restart fixed, ctcourse:1 now fails "A1: the client sees the yard group off" (reported); shots all pass.
  Swap expected at ~97% (~08:35); save at 97%.
- SAVE ~08:15 (window ~80%+, swap ~08:20): train 18 0a269684 GREEN 39/39 (JOBS=5 alone, 403 s; reported). TRAIN 19 51a084f9
  (#180 guard-cap + #184 sector-redesign part 1) DONE: GREEN 39/39 (JOBS=5, 394 s; reported) - ignore the rerun note: if summary.txt
  has no DONE, rerun it first (build;full, GPU, JOBS=5 if 4192 idle) and send the verdict to the orchestrator.
  GUARD-RENDER: step 1 done (4d964e85: BRIEF / PLAN / STATE). Orchestrator answers: target 60 Hz Epic on the 4090,
  frame CPU p95 <= 12 ms, GPU p95 <= 15 ms at 24 facing (+ desktop default preset report); S3a (hit volumes from the
  sim); Marlow headroom at 12, alive cap per map (Marlow 12, campusOps 24); #180 merges first (train 19); partLibrary.ts
  ours, world.ts hunks go to Menu Notes. S1 (merge each guard into one rigidly skinned mesh, src/player/smoothBody*.ts,
  ?guardmerge=0 to A/B) implementer stopped at the save: design only, NO code yet, bf5c9a31 (docs/guard-render/STATE.md
  has the S1 design). Run `npm ci` in C:/NightShift/Mobile-Coop-guard-render first (no node_modules; a junction was refused).
  CT Core agreed the characterRig hook: own private method (build at rig creation + one per-frame skin update after the
  final pose), outside ~1850-2010 and ~2600-2700, no per-frame allocation, nothing in src/anim; first PR ready merges
  first; send CT Core the hook line range + diff. Then measure S1 with guard-cap (alone, 4189; ?guardmerge=0 vs default)
  + e2e (stealth-ai sectorops ctcourse coop netmove anim takedown smoke), then S3a, S4, S5.
  Open with job leads: marlow-final A1 "client sees the yard group off" (42a9b295), guard-ai S2 light pair, both await
  fixed commits.
- schtasks creation is BLOCKED in this session (auto mode): runs are session-bound background commands and die on a swap.
  On resume check runs/<label>/summary.txt for DONE; a run without DONE died: rerun it.
- Train 15 e1050e14: 38/39 GPU JOBS=5, 349 s; e2e-coop FAIL "client takedown offered on the host's guard (offer none)"
  (host found:false spotted:false). Sent to the orchestrator. Solo x2 on 4192: runs/train15-e1050e14-coop (verdict pending).
- loadstress1/2-0067b5f5 GREEN. loadaudit-full-0067b5f5 VOID (chain ap ran it on train 15's dist, no build step; stopped).
- Running on 4189: loadstress1-72ffda53 (build + 9-suite stress set JOBS=5, no burner).
- Agents (Opus, background; each pushes its branch): (a) load-audit item (3) coop grab token + merge master + look at the
  takedown-offer miss -> feature/load-audit; (b) guard-cap rebase on master + dry review of scripts/guard-cap.mjs ->
  feature/guard-cap (then run it on 4189); (c) load-latent mediums from docs/orchestrator/load-latent-mediums.md
  (origin/feature/menu), split from 72ffda53: feature/load-latent-net (#10-#15 + onHostStep), feature/load-latent-ui1
  (#17-#24), feature/load-latent-ui2 (#25-#31); coop #7/#9 after (a). Then prove each under load (JOBS=5) and PR.

**Character Build SAVE (2026-10-23 ~00:45, account swap at ~97%):**
- RUNNING through the swap: scheduled task ns-chain-1022ao = load-audit stress proof on feature/load-audit 0067b5f5
  (GPU, 4189): loadstress1-0067b5f5 and loadstress2-0067b5f5 (JOBS=5 over e2e-desktop:1 e2e-move e2e-coop e2e-mouse
  e2e-ctcourse e2e-netmove e2e-course e2e-menus smoke, a 4-core burner), then loadaudit-full-0067b5f5 (clean full run
  JOBS=5). Results in C:/NightShift/scratch/runs/<label>/ (summary.txt DONE; the suite log), load
  runs/load-stress-0067b5f5.csv. FIRST THING on resume: read those three and tell the orchestrator. Any failure that
  passes solo is a load miss to fix (tests only, never a weaker limit); if all green, open the load-audit PR.
- ALSO SCHEDULED (ns-chain-1022ap, started 00:49): polls origin/train/15 (#159 mocap-trial on 4.63.1) every 30 s for
  up to 90 min; when it appears it stops the stress chain ao and its burner, runs train15-<sha> (build + full, GPU,
  JOBS=5, 4189, load runs/load-train15.csv), then the stress remainder on 0067b5f5 (loadstress2b-0067b5f5 with a 4-core
  burner, then loadaudit-full-0067b5f5) unless ao finished them. FIRST on resume: send train 15's per-suite verdict to
  the orchestrator (runs/train15-*/summary.txt + full.log). Stress pass 1 (loadstress1-0067b5f5) was GREEN: 9 suites at
  JOBS=5 + burner, CPU avg 52%, every fixed check passed (crash report, coop grab, move 2.88 m/s, mouse look, ctcourse
  lamp / laser windows).
- LOAD-AUDIT REVIEW (orchestrator, on 0067b5f5) - must be done before the PR:
  (1) BLOCKING e2e-move sidePace: no wall cap -> FIXED 887c7d4d (30 s real-time cap resolving 0 m/s).
  (4) e2e-desktop: assert the crash wait (null on timeout was unchecked) -> FIXED 887c7d4d.
  (5) fragment covers only the nav-timeout commits -> FIXED 887c7d4d (all fixes listed).
  (2) BLOCKING e2e-ctcourse station 4 (~466-472) and station 3 (~288-292): the windows shrink to min(nominal, left - 0.3 s)
      with floors 500 / 200 ms = a weaker check. Keep the original 2000 / 800 ms windows on the host clock; if too little
      jam time is left, RE-JAM before measuring. -> FIXED 72ffda53 (original 800 / 2000 ms windows on the host clock;
      re-jam when under 1.1 / 2.3 s left, the client steps off the beam during the station 4 re-jam). Syntax-checked only;
      assumes no jammer cooldown blocks an immediate re-jam.
  (3) RECOMMENDED, NOT DONE, e2e-coop grab (~625-655): allowTeleport(2) once per attempt in its own GA before
      moveClient; keep spotted=false + awareness reset + statue per frame; replace __grabPinOn with a token
      (const gen = ++window.__grabPinGen; stop when stale or the guard is taken); try/finally around moveClient + the GB
      grab wait with window.__grabPinGen++ in the finally.
  After (2)/(3): rerun the stress set on the new head (the remaining stress steps of ns-chain-1022ap run on 0067b5f5,
  so they do NOT cover these fixes), then open the PR.
- LOAD-AUDIT branch (worktree C:/NightShift/Mobile-Coop-load-audit), 7 commits on master af56ab43:
  4da742ce / 777a056e / 2746f123 (context-level 120 s navigation default, smoke's own context, 60 s menu waits on the
  crash-log page; fresh checker PASS WITH NOTES, applied), 7d4dbc5f (crash step waits for the 'crash' event and closes
  the dead page: the desktop:1 hang), de5df759 (e2e-move sideways pace on a game-time window), da629375 (e2e-coop grab
  latch + per-frame host pin; e2e-mouse waits for frame-applied yaw / weapon swap / pace), 0067b5f5 (e2e-ctcourse jam /
  lamp windows on the host clock, new waitHostSim in e2e-net-lib.mjs). move + desktop:1 PASS solo on de5df759; the rest
  syntax-checked only. Source list: docs/load-latent/REPORT.md on feature/load-latent e1368ac6 (59 findings: 6 high, 26
  medium, 27 low); mediums left in e2e-ctcourse: #10, #11, #12, #13, #15, #35, #36, #38 (see that report). The PR body
  should list the audit failures (desktop:1 hang, move 0.00 m/s) and each fix with its proof.
- PR #165 e2e-start-order OPEN (feature/e2e-start-order, fresh scripts/e2e-times.json from train 13 + a median default
  for unknown suites; expected 15-22 s off each JOBS=5 full run). Orchestrator order after the swap: (1) #165 done,
  (2) load-audit stress proof -> PR (goes into train 14 with #163 lightfield-heap), (3) guard-cap measure on 4.62.0+.
  JOBS=6 later, measured. load-latent report c6437901 has the deferred medium fixes planned.
- Train 13 d2be5f6c GREEN 39/39 (JOBS=5, 357 s) - reported. Lightfield #163 deb5211d loaded proof 20/20 - reported.
- Agent branches pushed (no PRs yet): feature/slow-suites aa271739 (docs/slow-suites/REPORT.md: stale
  scripts/e2e-times.json start order costs 15-22 s per JOBS=5 run, a no-risk fix; JOBS=6 est. 30-40 s, needs measured
  runs), feature/load-latent e1368ac6 (the scan), feature/guard-cap 7d93f064 (scripts/guard-cap.mjs WIP, never run: rebase
  on master 4.62.0, npm run build, then E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse
  --counts=0,12,16,24 --warm=3 --secs=10 --out=docs/guard-cap; fix cell errors; fill docs/guard-cap/REPORT.md; PR).
  Open docs PRs for slow-suites and load-latent when the orchestrator wants them.
- Tonight's rules: E2E_GPU=1 for every run; full runs and trains JOBS=5 (back to 3 the first time 5 causes a failure);
  laptop CPU under ~90% while any requested run is going (stop the burner first); slots 4189 full runs, 4192 singles;
  runs that may outlive a session go through scheduled tasks (schtasks); never tail -F a file a chain appends to;
  untracked files a target commit tracks block the runner's checkout (move them to scratch/work first).

**Character Build now (2026-10-22 ~21:50, stopped for the ~22:04 account swap; this block wins over the older ones):**
- RULES (Michael): every e2e run is `E2E_GPU=1` (runner `RUN_GPU=1`); a GPU failure counts (fix the test or the game);
  software reruns only to tell a test timing bug from a game bug. TRIAL (Michael ~21:50 "trial 3 browsers + 2nd slot"; failed (b) at 22:25; Michael ~22:32 "Keep 3, fix the test": JOBS=3 and the 2nd slot stay, see DECISION below): full runs JOBS=3 on 4189 (heavy-4189.lock); a second slot for single GPU suites JOBS=1 on
  4192 (heavy-4192.lock); the load sampler on for every run (`C:/NightShift/scratch/load-sampler.ps1 -Out <csv>`, see
  chain-1022v.ps1). Passes only if (a) suite times in both slots stay within ~15% of today's (train 9 JOBS=2 numbers
  below, solo times in runs/*/summary.txt), (b) no new timeouts or load failures, (c) CPU under ~90% outside short
  spikes. Any miss: back to one slot, JOBS=2, tell the orchestrator with the numbers; write the result here. The
  runner now keeps the slot's port for GPU runs (was forced to 4189).
- SURVIVE A SWAP: the account swap kills processes started from the session (train 7 died at 19:32). A run that may
  still be going when a session ends goes through a scheduled task (`schtasks /create /sc once /st <hh:mm> /tn
  ns-<label> /tr "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File <chain.ps1>"`), not
  Start-Process.
- Results today since 20:45 (logs C:/NightShift/scratch/runs/<label>/, chain log runs/chain-1022.log):
  - #140 gpu-tests MERGED (studio keyed-walk + lightbake GPU timing). Backlog 30 (BakedLamps add + dispose in one frame).
  - Train 8 4cc73665 RED (32/35, GPU 827 s); same in software. Narrowed: e2e-studio :468 reset pose (role B "hold",
    bones 120-130 deg) = #119 N4b c22b6719; e2e-anim "run 90: the feet never cross (-17.4 cm)" and e2e-clip
    "crouched holstered ... (min -3.2 cm)" = #135 N1 08023227 (also in #138 e6274d36, which carries N1).
  - Train 9 b0cb16b6 (#136 P, #139 N4c, #141 T1): full GPU JOBS=2 740 s; e2e-menus "a tap on the pause button
    pauses ((none))" REAL (fails solo too; master and train 8 pass; member not narrowed); e2e-studio GPU timing at a
    shifting spot (:854 full, :755 solo) -> feature/gpu-tests-2 6703e99a (panel() waits 300 ms before the tuner
    panel's throttled reads); e2e-pad known flaky (passes solo). Per-suite: ctcourse:1/2/3 198/168/168, course 179,
    netmove 132, coop 112, desktop:1 71, menus 52, sectorops 37, mouse 36.
  - Load (train 9, runs/load-train9.csv): idle CPU 19-23%; build max 48%; full GPU JOBS=2 CPU avg 35%, max 100% (one
    10 s sample), GPU 3D avg 9% max 20%, RAM free min 7.6 of 31.7 GB.
  - Sector-fixes R 2f40ed74 (Course Ready): sectorops FAIL (route geometry, S1 monorail stop, S3 headroom); Course
    Ready fixes on the desktop. P 66995a22 RED earlier; train 9's #136 P passed ctcourse.
- #143 gpu-tests-2 MERGED (4.58.2). PR #148 gpu-tests-3 OPEN (be8e2027): e2e-menus' touch-pause failure on the laptop
  was a TEST bug: the look drag (8 CDP touchMoves in ~80 ms on a fast GPU) became a Chrome fling and the next touch only
  cancelled it, so the pause tap was lost (not late: still unpaused 1 s later; a 2nd tap pauses). The desktop is slower,
  no fling. Fix: hold still before the lift. Proof: cherry-picked on train 9 b0cb16b6 (local ae620095) e2e-menus PASS 40
  s twice (GPU). #147 (3 s wait for the pause screen) does NOT fix it. Diagnostic suite kept at
  C:/NightShift/scratch/work/e2e-touchdiag.mjs (copy into a worktree's scripts/ untracked, run as a suite name).
  Narrowing: #136 P passes menus alone, #141 T1 fails alone (laptop only), N4c skipped.
- DECISION (Michael ~22:32 "Keep 3, fix the test"): laptop full runs STAY at E2E_GPU=1 JOBS=3 on 4189, and the second
  slot (single GPU suites, JOBS=1, 4192) stays. Course Ready fixes e2e-netmove's compare (sample on sim time) as a test
  PR; until it lands, a netmove ankle-compare miss under JOBS=3 that passes solo counts as KNOWN (rerun it solo on 4192).
- TRIAL RESULT (2026-10-22 22:25): the 3-browser trial failed criterion (b) on its first run (overruled by the decision
  above). Train/9 765162a6 at JOBS=3: 34/35,
  wall 443 s (JOBS=2 train 9: 740 s); e2e-netmove :245 "drawn: host mode ground, joints within 10 cm" ankleL 0.107
  under load, PASS solo twice on the same commit (ankleL 0.078; 135 / 137 s). (a) times within 15% or faster: pass;
  (c) CPU avg 40%, max 93% one sample, GPU 3D avg 9% max 18%, RAM free min 5.8 GB: pass. Train 9 765162a6 is GREEN on
  its code (e2e-menus solo PASS 40 s). Runs: runs/train9c-765162a6 (+ -menus, -netmove), load runs/load-train9c.csv.
- 4.59.0 merged (train 9, #151). Train 10 train/10 0c6bf0bd (#142 n4d, #145 lamp-plugin-gap): GREEN 35/35 (GPU, JOBS=3,
  wall 465 s; CPU avg 35%, GPU 3D avg 37% max 84%, RAM free min 7.4 GB; runs/train10-0c6bf0bd, load-train10.csv).
  #149 touch-fling-note: master merged in (1afdcd54), clean, waits for a later train. Slot 4192 free.
- ~22:45-23:15: ffmpeg 9.0.2 INSTALLED on the laptop (Michael approved in this session; winget Gyan.FFmpeg; the path
  scripts/mocap-sheets.mjs checks). Mocap sheets 8cb4d26c pushed to feature/mocap-sheets-real 04598e9a (VP9 webms
  encoded after the run; Menu Notes fixed a stray index.md line in f0504588). vol-cone-fix round 1 pushed e4bd85ad on
  e6e70b48 (before 533a1f30 / after db0ffadf + 3 reshot views; e2e smoke, darkness, desktop:3 pass). Train 11 d4290357
  GREEN on code (38/39 JOBS=3, 507 s; e2e-ct fence "climbing at gear 4 rattles (0.00 m)" under load, PASS solo twice
  at 4.00 m: a second load-sensitive check after netmove). #149 resolved against 4.60.0 (61301b1a), merged into train 11.
  Running: vol-cone-fix round 2 (LED-only) 72102b7e on 4189 (ns-chain-1022af; runs/volcone2-*), then commit the after
  files + sheet on 72102b7e. Round-1 untracked shots from the 4189 worktree: scratch/work/vol-cone-fix-4189-untracked.
  Runner note: a shot script with a different version than the commit runs as an untracked copy (the runner reverts
  tracked files); an untracked file that the target commit tracks blocks the checkout (move it aside first).
- ~23:15-23:45: vol-cone-fix round 2 (LED-only 72102b7e) pushed 3135a783 (first pass spoiled: tracked after files reverted by
  a later runner invocation; redone as ONE runner step via the untracked scripts/vc-round.mjs in -4189). CT Core #138
  fix round 4 7667b681: 6 suites PASS (run 90 feet 8.0 cm, crouched holstered -2.0, walk knees 3.4 of 3.5). Mocap 4-row
  rerun f027fc98 pushed ce76361a (webms from the script). #119 N4b 560752d1: studio + anim PASS. Train 8 fc2e8bd3
  (#138 + #156) GREEN 35/35 (JOBS=3, 490 s). Gap job: PR #158 coop-offer-load (e2e-coop takedown offer on the client's
  match clock + per-frame host pin), green solo x2 and at JOBS=3 with netmove + menus. Both slots free.
- RULES (2026-10-23 ~00:20, Michael via the orchestrator): full runs and trains at E2E_JOBS=5 (back to 3 the first time 5
  causes a failure); keep laptop CPU under ~90% while any run is going (pause an agent or a burner, never the run); max
  token burn with up to 6 parallel Opus agents; WIP committed and pushed after each hand-back.
- ~23:45-00:30: train 12 1ff138e8 (#119 N4b + #158) GREEN 35/35 (JOBS=3, 530 s; N4b x N2 watch items fine). Load audit
  on master af56ab43 (3 full runs JOBS=5; runs 2-3 + 6-core burner): ONE load-only failure, e2e-desktop:1 crash-log
  page page.goto 30 s timeout (passes solo twice) -> feature/load-audit 2746f123 (context-level 120 s navigation default,
  smoke's own context too, 60 s menu waits on the crash-log page; checker PASS WITH NOTES, notes applied). Proof: full
  run JOBS=5 on 4da742ce (burner stopped at 00:23 for the 90% rule) + smoke/desktop:1 on 2746f123; PR next.
  ct-rattle-sample a8af5535 (Course Ready) green solo x2 + JOBS=3 trio. #144 R 53e72a11 green (10 suites, 398 s).
  Agents running: guard-cap script (feature/guard-cap, report-only tooling: scripts/guard-cap.mjs, docs/guard-cap/),
  slow-suite audit (feature/slow-suites, docs/slow-suites/REPORT.md), latent load-sensitive check scan
  (feature/load-latent, docs/load-latent/REPORT.md). Guard-cap measure runs on master 4.62.0 once it lands (12/16/24
  awake guards, Sector Ops warehouseOps + Marlow ctcourse; MAX_ALIVE 12 needs em.maxAlive raised; flashlight shadows
  capped at 4 by design).
- MONITOR RULE: never `tail -F` a file a chain appends to (it locks chain-1022.log; Add-Content fails and the chain
  dies; expired monitors leave the tail running). Poll summary.txt files instead.
- NEXT (ask the orchestrator first): train 8 rebuild once the #119 / #135 fixes land (full GPU JOBS=3 on 4189,
  the trial); d7571102 test-speed-2 proof (now on the GPU, re-ask). Worktrees: Mobile-Coop-gpu-tests (merged),
  Mobile-Coop-gpu-tests-2, Mobile-Coop-test-speed-2 (master merged, 36b5a270).

**Character Build update 2 (2026-10-22 ~20:45): GPU is the default for logic e2e** (Michael approved; orchestrator
puts it in CLAUDE.md on feature/menu). Laptop full runs: `RUN_GPU=1` (E2E_GPU=1), JOBS=2, slot 4189.
- GPU trial gpufull-00d7a653 (master 4.58.0, JOBS=2): 33/35, wall 842 s (software today: 2025 s at JOBS=3). GPU-only
  fails, both PASS in software on the same commit: e2e-studio :732 keyed walk (deterministic; the panel's 250 ms
  wall-clock mode refresh vs 20 fast frames) and e2e-lightbake :93 lamp plugin 7/10 (load only; passes solo). Fixed
  in tests on feature/gpu-tests 130cf522 (PR not opened yet; proof gputests-130cf522 queued in chain-1022r).
  Possible real bug left alone: `BakedLamps.frame` attaches new materials only when `scene.materials.length` changes.
- P 66995a22: RED, e2e-ctcourse station 3 (:263, 0 client reports in 800 ms after the send-back); sent to Menu
  Notes, who rerun it on the desktop.
- Running: chain C:/NightShift/scratch/chain-1022r.ps1: sectorfixesr-2f40ed74 (Course Ready, software JOBS=2, 4192, as
  requested), then gputests-130cf522 (GPU). Next: train 8 full on the GPU (orchestrator sends the sha; no polling),
  then the d7571102 test-speed-2 proof in software (the desktop lane, now also GPU: re-ask). test-speed-2 code levers
  held (GPU makes them small).
- Worktree note: the -4189 worktree had an untracked scripts/anim-natural copy blocking checkout; moved to
  C:/NightShift/scratch/work/untracked-4189. Fetch in a worktree before a run on a new commit.

**Character Build update (2026-10-22 ~19:50, after the account swap):**
- RULE CHANGE (orchestrator 19:55): laptop full runs use E2E_JOBS=2, not 3. Two JOBS=3 runs showed shifting ctcourse /
  menus timeouts, and the laptop crawled. ONE slot only for now (4192).
- Michael ~19:30 "Finish train 7 only", then ~19:45 "Yes, queue them": job-area suites one request at a time. No GPU
  experiment, anim-natural GPU audit or test-speed-2 (all dropped from the queue below).
- The account swap killed chain n at ~19:32: train7-9ff4542d (full, JOBS=3; ctcourse:1 and :2 failed with the openPage
  60 s timeout, 15 ok, rest unrun) and sectorfixesp-db839845 (void). The rerun train7-9ff4542d-r2 was stopped by the
  orchestrator: train 7's src diff is studio-only, so it gets the studio tier, not a full run. r2's valid results were
  course, netmove and ctcourse:1 ok. Its ctcourse:2 / :3 / menus fails were caused by the stop, so they are void.
- Running: train7-9ff4542d-studio (4192, JOBS=1: build; e2e-studio e2e-anim e2e-tuner-phone; ctcourse:1 solo;
  ctcourse:2 solo). Then chain C:/NightShift/scratch/chain-1022o.ps1 runs sectorfixesp-66995a22 (Menu Notes: check +
  ctcourse sectorops coop netmove, JOBS=1, 4192). Next: R and N2 requests as they arrive. Verdicts go to the job lead,
  copied to the orchestrator.
- Orphan check 19:45: none. Idle at 10% CPU, 12.6 GB of 31.7 GB free.

**Character Build earlier (2026-10-22 ~19:05, paused at the 5-hour limit; superseded where the update above differs):**
- Done today since 18:00: train 6 (6551afe9) GREEN (33/35 in the full run, solo reruns ctcourse:1 268 s, course 190 s,
  lightbake GPU 46 s all PASS) -> orchestrator released 4.57.0. Studio-pairs sheets pushed (shots/studio-pairs-8091de94
  ef7fd5d2, shots/studio-pairs-63ec33ec 00d66c1d; 63ec33ec: thin orange hand rim left, hold_idle guard body missing
  0-1.67 s). Sector-fixes L GPU shots pushed to feature/sector-fixes 985b0916. CT Core N2 53e6dc03 all PASS. N1 1135bc41
  dropped (train 7 covers it).
- Rules: laptop = main test machine incl. GPU; slots 4191 / 4192 / GPU 4189 (runner -Slot; worktrees Mobile-Coop-testrun,
  -testrun-4192, -testrun-4189; locks C:/NightShift/heavy-<slot>.lock); at most ONE full run at a time, other slots
  single suites; full runs and trains at JOBS=3; a result also stands for a later commit whose only diff is docs /
  CHANGELOG / fragments / test scripts.
- UNATTENDED QUEUE: C:/NightShift/scratch/chain-1022n.ps1 (log C:/NightShift/scratch/runs/chain-1022.log). It polls
  origin/train/7 (60 min); when seen it stops gpufull-79216e49 (GPU experiment, summary gets "STOPPED for train 7") and
  runs train7-<sha> (build + full, JOBS=3, 4192); then gpufull-79216e49-r2 (full e2e, E2E_GPU=1, alone; or waits for the
  first one if it was not stopped); then animnatural-81102f93-gpu (Menu Notes: audit.mjs proving --only=wall-edge-left,
  wall-edge-right,wall-edge-low,hand-swap-shoulder,elbow-strike-guard; outputs copied to
  C:/NightShift/scratch/work/animnatural-81102f93); then testspeed2-base-79216e49, testspeed2-d7571102-a / -b
  (software GL, JOBS=3, 4191).
- Also running (19:07, outside the chain): sectorfixesp-db839845 on 4191 (Menu Notes: check + e2e-ctcourse
  e2e-sectorops e2e-coop e2e-netmove, JOBS=1; touches src/net PROTOCOL_VERSION 29). Report it to Menu Notes after train 7.
- On resume, report in this order: (1) train 7 to the orchestrator (pass / fail per suite; solo-rerun failures on the
  same commit, single suites on 4192; name the likely member for real fails). (2) GPU experiment: wall time and
  per-suite times vs a software-GL run, any GPU-only failures. (3) anim-natural: commit the copied outputs to
  feature/anim-natural under docs/anim-natural/audit/ only, push, send Menu Notes the per-row lines (ev / gap fields,
  from runs/animnatural-81102f93-gpu/cmd2.log). (4) test-speed-2: per-suite times base vs a / b; if green, open the PR
  (tests-only tier), then the levers (docs/test-speed-2/STATE.md "Next" (1)-(3), plus GPU if the experiment wins).
- Own PR #126 (pad-wheel-wait) went into train/5. feature/test-speed-2 d7571102 (Opus implementer, ~90-135 s saving
  estimated; master 79216e49 merged).

## Done
- 2026-10-22 ~15:20: PR #117 merged (4.54.1).
- 2026-10-22 ~13:45: lint, vitest, checker FIX, fix rounds 1 (bd8e5ebf) and 2 (e5211e02); proof on 2b05f423.
- 2026-10-22: BRIEF, STATE; implementer 1 (stopped for usage) -> WIP 58bb1b31; implementer 2 -> WIP commit.

## Resume prompt
```
Night Shift | Character Build (laptop, the MAIN test machine, GPU for every e2e run). Read CLAUDE.md "Sessions" on origin/master ("Main test machine: the laptop"), then the newest "Character Build SAVE" block (SAVE 5 at the time of writing) at the top of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). It names the runs (C:/NightShift/scratch/runs/<label>/summary.txt; no DONE line = it died in the swap, rerun it) and the agent branches (check each branch's newest commit to see what landed; restart unfinished work from there). Message "Night Shift | Orchestrator" that you are back with any results, then continue the SAVE block's list: send any finished verdicts (train 20 lightbake solo first, to the orchestrator), keep both slots busy with the queue, and run the guard-render job (S1 e2e + guard-cap ALONE + PR; S3a / S5 Sonnet builders, Opus checkers; docs/guard-render/STATE.md). Sonnet 5.5 builds from strict Opus briefs, Opus checks. At most one full run at a time (4189), singles on 4192; a lock with no live node process is stale (taskkill /T /F).

Runner: C:/NightShift/scratch/laptop-runner.ps1 (header explains; results C:/NightShift/scratch/runs/<label>/summary.txt, DONE at the end). Every run RUN_GPU=1. Slots: full runs RUN_JOBS=3 on -Slot 4189 (the trial in STATE: keep the load sampler C:/NightShift/scratch/load-sampler.ps1 on and check the pass criteria); single suites RUN_JOBS=1 on -Slot 4192. Fetch in the slot's worktree before a new commit. Launch hidden; a run that may outlive the session goes through a scheduled task (schtasks, see STATE), never only Start-Process. Chain several runs in one script (C:/NightShift/scratch/chain-*.ps1 are examples). Reply to the requester with pass / fail per suite, the failing assert lines, times and commit; copy the orchestrator. Order: orchestrator, CT Core, Menu Notes, Course Ready, then own jobs (gpu-tests-2 PR, test-speed-2).

Pacing: docs/orchestrator/STATE.md "Pacing" on origin/feature/menu (get_usage before each agent; 97% no new agent, 98% commit + push + STATE, stopped by 99%). Branch guard before every write. Native multiple choice only, hyphens not em dashes.
```
