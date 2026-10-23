# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Test Runner SAVE 30 (2026-10-24 ~00:50; wins over SAVE 29 where they differ):**
- BLOCKER (needs Michael): at 23:59 ~68 old NightShift-chain-* scheduled tasks (one-shot 2026-10-23T23:59 triggers)
  all ran again. chain-sa-4189 (sectorart226-eb6d63c4) and chain-pc-4192 (coopwalk-0d7f04ce) hold heavy-4189 /
  heavy-4192; the rest wait to race the service for the locks. Train 38 a242c158 was dispatched 13:09Z and sits in
  takeLock. Fix: Stop-ScheduledTask + Disable-ScheduledTask on every NightShift-chain-* (chain scripts only; the two
  active runs finish and free the locks). The auto mode classifier denied it here. Orchestrator told (~00:45).
- ~00:50: train 38 holds heavy-4189; old chain guardais12-f14b93af took 4192 (still racing). Blocker stands.
- DONE: batch (a)(b)(d) pushed to feature/laptop-queue (#252, next train) 8279a48f..64a00d1a, Opus checker PASS,
  vitest 42/42; (c) PR #277 (feature/auto-train-laptop-missing, worktree Mobile-Coop-auto-train-laptop-missing,
  train-ready). The live service self-updates to 64a00d1a at its next idle pass (then it claims trains).
- 14:10Z: TRAIN 38 a242c158 FAIL 42/43, ctcourse:2 twice (A3 LANTERN line held, a3OfficeRange.mjs:363). Opus
  triage: culprit guard-ai S23 #254 (fails in every train with it: 35, 37, 38; train 36 without it passed). LANTERN
  holds lines while anyAlerted (courseMode.ts:621); S23 sticky target targetPick.ts:63-74 likely re-alerts the A3
  cleaner. Sent to Orchestrator (drop #254, rebuild; Guard AI diag steps). Service on 64a00d1a since 14:10Z.
- ~02:40: train 40 6e9632d1 claimed 15:22Z, holds 4189, waits on 4192 (stale chain playerstack-d86007b5). Pushed
  cf6f674b + e52b4a79 (Opus checker PASS): a train holding some slots LQ_TRAIN_SOLO_MIN (10) min while the rest stay
  manually locked runs unsharded on them; the live service loads it only at its next idle pass (restart = Michael).

**Test Runner SAVE 29 (2026-10-23 ~23:58, new account; wins over SAVE 28 where they differ):**
- Service live: pid 45828 (started 23:18), holds heavy-4189 / heavy-4192 locks (live). No stale runs or locks; old
  NightShift-chain-* tasks all Ready (idle). One Test Runner session. Laptop CPU 56%, 8.9 GB free.
- Train 37 8cea5195 (#268) FAIL ctcourse:2 (A3 LANTERN line, cameraReach timeout): Orchestrator fixed it in #274 and
  closed #268. Train 38 #275 (4.84.0) building; the service runs it when the version commit lands (open-PR gate).
- SAVE 28 OPEN closed: the 3 superseded requests (6eb6a863, bb47a985, ef44eea5) are gone from origin/laptop-queue.
- Overnight mode (Orchestrator ~23:55, Michael asleep, no swap; window resets 04:40): train 38 first and alone, then
  queued PR requests. At the Orchestrator's ~95% message: save, queue next runs, stop starting work.

**Test Runner SAVE 28 (2026-10-23 ~22:40, new account; wins over SAVE 27 where they differ):**
- Service live: pid 24928 (started 22:13, self-update), log C:/NightShift/scratch/laptop-queue/log.txt (UTC stamps).
  heavy-4189.lock owned by it (live). No stale runs or locks. Old NightShift-chain-* tasks are all Ready (idle).
- Train 36 0348a091 (PR #263) queued 22:34 behind a pr run on 4189; verdict to Orchestrator only on failure.
- SAVE 26 OPEN 2 CLOSED: LR16 triage verdict SENT to Sector Ops (f8008542 vs 273539ec CPU p95 Epic start +0.5,
  s5-worst +1.2; Medium start +1.1, s5 +0.4; guards identical, freeze off both: the cost is LR16 itself).
- Player Build alone-guard-bake-probe bbd49206 FAIL = missing C:/NightShift/downloads/mpfb2-2.0.18 zip (setup, not
  game). Told Player Build; a download needs Michael's OK.
- Still open from SAVE 27: Marlow log-excerpt ask waits on Michael.
- ~23:20: train 36 PASS 42/43 (e2e-pad known flaky). feature/laptop-queue (#252) now bf0059cb, laptop service live on
  it (start 23:18), train 37 8cea5195 running: cc56baed second desktop slot 4192 (heavy2.lock, CPU < 50, one start per
  pass) + request flake reruns stay on their own slot; bf0059cb supersede (same requester + kind, same set or
  descendant sha covering all suites; never different sets / alone / no requester) and newest-first per requester.
  Orchestrator has both shas; it must create the desktop Mobile-Coop-testrun-4192 worktree.
- OPEN: Michael to answer whether 3 superseded requests (Sector Ops 6eb6a863, bb47a985; Guard AI ef44eea5-08d4) are
  dropped by hand (auto mode blocked my claims push); bf0059cb may supersede them itself.

**Test Runner SAVE 27 (2026-10-23 ~22:10, swap save; wins over SAVE 26 where they differ):**
- Service restarted ~21:57 (Michael OK): now e1398df4, pid 30620, "done claim(s) pushed: 11" (desktop lane live; SAVE
  26 OPEN 1 closed). Stop-ScheduledTask does NOT kill the node child: a restart needs the node pid killed (Michael's OK).
- Pushed to feature/laptop-queue (#252): 1c1f8451 + 791337a5 (checker FIX): trains run only at the version commit of
  an OPEN train PR. The service self-updates at its next idle pass; check log for "service start" and no closed-train
  rerun. #252 entered train 36 at e1398df4, so these two ride the next train (Orchestrator told).
- Train 34 4383d8ce FAIL ctcourse:4 A7 = guard-ai-s23 regression (R0 technician picks the client at SPOT2 via
  pickTarget, enemy.ts:1991). Sent to Guard AI (fix) / Marlow (SPOT2 not visible from R0) / Orchestrator, who dropped
  S23 and closed train 35 #261. Closed train 35 aeadaec1 is still running once more (old code started it, ignore).
  Train 36 (#259 #255 #252 #262) is next: verdict to Orchestrator only on failure.
- Marlow polish2-b d0689dd8 ctcourse:2 FAIL (A3 cleaner calm) verdict SENT. Their log-excerpt asks were blocked by the
  auto mode classifier (publishing laptop logs); Michael has not answered yet - do not send excerpts until he does.
- SAVE 26 OPEN 2 (LR16 perf triage alone requests for Sector Ops) still open: alone runs go after trains and PR suites.

**Test Runner SAVE 26 (2026-10-23 ~21:10, swap save; wins over older SAVEs):**
- Service runs headless through the swap: train 33 db14a418 sharded (auto-train releases on green), ~18 requests queued.
- OPEN 1: laptop service still on OLD code (pid 39160, face1711-era) until it goes idle; then it fast-forwards to
  origin/feature/laptop-queue (e1398df4: claims + desktop worker) and logs "done claim(s) pushed". Until then the desktop
  worker (NightShift-desktop-queue, registered by the Orchestrator) waits "no claims on the branch yet" - safe. Michael
  was asked (via Orchestrator) whether to restart NightShift-laptop-queue between runs. Verify the switch in log.txt.
- OPEN 2: LR16 perf triage for Sector Ops: alone requests 20261023T094402-...-273539ec-a3be and 094409-...-f8008542-1994
  (campus guards start + s5-worst, Epic then Medium; out C:/NightShift/scratch/work/lr16tri-<sha>/views-*.json), plus
  Sector Ops' own start-view requests 094112 (41204e30, droppable) / 094116 (f8008542) / 094120 (273539ec). When done:
  ONE verdict message to "Night Shift | Sector Ops Build": CPU p95 per view per preset, 273539ec vs f8008542 delta
  (their triage expects LR16 +0.1-0.3 ms Epic / +0.3-0.7 Medium, the rest = unfrozen campus guards from #226).
- PR #252 (laptop-queue) open, train-ready; Orchestrator has the desktop start commands.
- SENT ~21:20: train 33 e46fb9e5 FAIL ctcourse:4 (A8 N2 grille stop; superseded by db14a418 43/43 PASS). Opus triage:
  test timing under load in a8Strongroom.mjs:278-294 -> fix + N2 dump sent to Marlow Build (owner).

**Test Runner SAVE 25 (2026-10-23 ~20:35; wins over SAVE 24 where they differ):**
- ALL manual chains are finished; NO hand-run chains from now on (Orchestrator 20:26). Alone runs (perf, guard-cap,
  sheets) go through the service: `request.mjs --sha <ref> --alone --step "<cmd>"` (runs after trains and PR suites).
- SENT: #226 verdict as PR comment (at 4f66a5f8; head moved to 2276483a, rerun needed there); LR16 verdict to Sector Ops
  (logic PASS; campus S5-worst CPU p95 13.3 Epic / 12.2 Medium, over 12). Guard AI s22game a74d27e2 2/2 PASS (status).
- TRAIN 32 rerun on fff3b639 (4.81.0 version commit) started 20:30 sharded. Head 8a95a089 differs by 3 vitest files only:
  a monitor copies a success status to 8a95a089 ("carried from fff3b639") so the service skips a second train. If
  the session died first: post that status by hand (gh api statuses, context laptop-e2e).

**Test Runner SAVE 24 (2026-10-23 ~20:10, new account; wins over SAVE 23 where they differ):**
- TRAIN 32 25c712c9 PASS 43/43, status `laptop-e2e` success posted by the service. Sharded 564 s / 560 s (vs 666 s one
  slot JOBS=3); 873 s total incl. flake rerun e2e-ctcourse:4 ("timed out waiting for A8: N2 is at the grille stop
  (route index 2)", passed alone 300 s; owner fixes the test). Orchestrator told.
- laptop-queue PR #252 OPEN (train-ready). Orchestrator told, asked to pass the request command to the leads.
- LR15 verdict POSTED on PR #242 (PASS; photo falloff no slower than classic). lr15c done.
- Running / queued: service has Sector Ops f8008542 (lr16-f800) on 4189, Guard AI a74d27e2 s22game-a4fix on 4192. Manual
  4189 chains ap5 (#226, alone) and l16g (LR16 perf, alone) wait on their chain logs, then take 4189 behind the service.
  Still to send: ONE #226 verdict (ap4 done + ap5) and ONE LR16 verdict (l16 PASS + lr16-f800 + l16g), both as PR
  comments / to Sector Ops. perf.mjs prints `"map":"warehouse"` always (hard-coded label, line 292): the MAP env is used.

**Test Runner SAVE 23 (2026-10-23 ~19:47; wins over SAVE 22 where they differ):**
- TRAIN 32 origin/train/32 25c712c9 (#244 release-speed + auto-train, #246 carry-fix2, #250 agent-cpu, feature/menu
  docs, #237 marlow-final + #248 section-rating, PROTOCOL 42): run by the laptop-queue SERVICE, sharded 4189 + 4192 at
  JOBS=3 each (first sharded train = the laptop-queue measurement; compare wall vs 666 s one slot JOBS=3 train 31).
  Result = GitHub status "laptop-e2e" on 25c712c9 + service log. Verdict to Orchestrator (fail: suite, assert, member
  area, last ~40 lines). The 4189 alone chains (lr15c photo only now, then ap5, then l16g at f8008542) wait for that
  status line in the service log, then resume by themselves.
- SENT: Player #249 stealth-pays bf9445d6 PASS (ctcourse 1-3, sectorops 1-6). Marlow 91b587f2 train32-entry 6/6 PASS
  (685 s); polish 1bde5328 ctcourse:2 FAIL 3/3 (A3 cleaner never calms after the corridor lure; real, not a flake) -
  ONE Marlow verdict SENT ~19:50.
- LR15 classic perf (campusOps) done: runs/lr15c-perf-classic-eb45b0af; photo pending.

**Test Runner SAVE 22 (2026-10-23 ~19:30, swap save):**
Everything below runs headless through the swap (scheduled tasks + the laptop-queue service). A new session only
collects results and sends ONE verdict per batch (fail: assert, log path, last ~40 lines - Michael ~19:25 rule).
- laptop-queue SERVICE (task NightShift-laptop-queue; log C:/NightShift/scratch/laptop-queue/log.txt, results as
  GitHub statuses): (a) DONE + SENT: Guard AI d82f9b6f ctcourse:4 PASS, ctcourse:2 FAIL twice (A4 "back from the
  noise, the officer notices the console off", a4GoodsShed.mjs:223) - first live service run: status, flake rerun and
  done record all worked; (b) Marlow #248/#237 91b587f2 coop netmove
  ctcourse:1-3 section-rating "laptop-e2e/train32-entry"; (c) Marlow polish 1bde5328 ctcourse:2 flake rerun
  "laptop-e2e/polish-ctc2-rerun" -> ONE verdict to Marlow for (b)+(c)+polish 1bde5328 (coop netmove sectorops 1-6 PASS;
  ctcourse:2 FAIL "timed out waiting for A3: the cleaner is calm and back in the offices after the corridor lure",
  runs/marlowpolish-1bde5328, cleaner cycles alert attack / cover). Rerun pass = flake for Marlow to fix.
- Manual chains (rerun a chain .ps1 whose log lacks "done"):
  - 4191 l16 DONE: LR16 c7a26ca7 sectorops 1-6, coop, netmove, ctcourse 1-3, lightbake, darkness, menus, desktop,
    stealth-ai ALL PASS (937 s, JOBS=2; sectorops:6 297 s slowest) -> into the LR16 verdict. Then sp2: Player #249 stealth-pays bf9445d6 ctcourse + sectorops -> verdict to Player.
  - 4192 ap4: #226 4f66a5f8 sectorops coop stealth-ai.
  - 4189 lr15c (LR15 perf, alone) -> ap5 (#226 perf / guard-cap / campus-sheet2, alone) -> l16g (LR16 perf Epic /
    Medium + warehouseOps + lr16-sheet.mjs, alone; MOVED to f8008542 at ~19:42, Sector Ops update) + service request
    "laptop-e2e/lr16-f800" (f8008542 lightbake desktop darkness sectorops coop). LR16 verdict = c7a26ca7 suites PASS +
    f8008542 suites + GPU batch; report any torch-cone shader compile error verbatim (sheet JSON console list). Verdicts to Sector Ops: LR15 (with #242 1c22b913 sectorops 1-6 +
    coop PASS 227 s, lr15b PASS, sheet clean), #226 (ap4 + ap5; budget CPU p95 < 12), LR16 (l16 + l16g, each failing
    assert verbatim; wall-arcs reference png not on the laptop).
- laptop-queue job: see docs/laptop-queue/STATE.md on feature/laptop-queue (live overlap; next: a sharded train, PR).

**Test Runner SAVE 21 (2026-10-23 ~19:20 laptop clock):**
- SENT since SAVE 20: TRAIN 31 PASS (f1864d3f full 666 s + 5ee209d8 guard-carry) -> 4.80.0; Guard AI d7a3b887 /
  master pair, 93bd9db1 PASS; Player afp-af4b 4fe5b3ab PASS.
- Chains running / queued (rerun a chain's .ps1 if its log has no "done" line):
  - 4192 mb2/mb3: section-rating 16caeacd ctcourse:2 + marlow-polish 1bde5328 coop netmove sectorops ctcourse:2 ->
    ONE verdict to Marlow Build (fail: assert + log path + last ~40 lines, Michael ~19:25 rule).
  - 4192 ap4 (after mb2): #226 artpol 4f66a5f8 sectorops 1-6 coop stealth-ai.
  - 4189 lr15c (after mb2): LR15 perf -> LR15 verdict to Sector Ops (with #242 suites PASS, lr15b PASS, sheet clean).
  - 4189 ap5 (after lr15c + ap4, alone): #226 cvp (guards / guardfreeze=0 / guardmerge=0) + guard-cap + campus-sheet2
    (breaker / cars / window pop, ART_FAR 60 m, 58 m back on) -> ONE #226 verdict with ap4 (budget CPU p95 < 12).
  - 4191 l16: LR16 c7a26ca7 sectorops coop netmove ctcourse lightbake darkness menus desktop stealth-ai.
  - 4189 l16g (after ap5 + l16, alone): LR16 cvp start + S5-worst Epic / Medium, warehouseOps perf Epic,
    lr16-sheet.mjs (agent writing it) -> ONE LR16 verdict with l16 (each failing assert verbatim; Michael's
    wall-arcs reference png is NOT on the laptop).
- laptop-queue: S1 + spec change pushed (22342b90); Opus checker FIX (4 blocking: partial-train success, stale
  pending, own stale locks, task settings) -> Opus fix round running. Then live overlap, PR.

**Test Runner SAVE 20 (2026-10-23 ~19:25):**
- Chains (scheduled tasks NightShift-chain-1023<x>-<slot>; logs runs/chain-1023<x>.log, results runs/<label>/summary.txt;
  a chain whose log has no "done" line died: rerun its script C:/NightShift/scratch/chain-1023<x>.ps1):
  - 4189 t31: TRAIN 31 f1864d3f full (JOBS=3) -> then t31b: e2e-guard-carry on train head 5ee209d8 -> ONE verdict to
    Orchestrator (both results; on a fail: suite, assert, member area: menu / #240 carry / #229 S9 + #234 S22 net /
    #243 settings / #239 optic cable). Note: S22-game 08586783 failed ctcourse:2 at A3 "cleaner walks toward office
    1's switch" (also Marlow 053ff212): if train 31 fails there, name A3 lure (Marlow's test fix 16caeacd pending).
  - 4192 gf4: Guard AI carry-fix2 d7a3b887 (guard-carry + stealth-ai, expect PASS "forced fault: injected") + its
    guard-carry file on master 4f6db420 (expect FAIL "(forced)" pass) -> ONE verdict to Guard AI (on "the forced
    fault fired" fail: that line + the "armed ..." line).
  - 4192 mb2 (after gf4): section-rating 16caeacd ctcourse:2 + marlow-polish ecdd7b22 coop netmove sectorops -> ONE
    verdict to Marlow Build.
  - 4189 lr15c (after t31b + s22g + mb2, alone): LR15 perf campusOps sector Epic classic / photo on eb45b0af -> ONE
    LR15 verdict to Sector Ops with: #242 1c22b913 sectorops 1-6 + coop PASS (227 s), lr15b suites PASS, sheet clean.
- SENT this window: #226 perf (Sector Ops), #240 23cf567c PASS (Orch + Guard AI), S22-game verdict (Guard AI), #243 PR.
- OWN JOB laptop-queue (orchestrator ~19:15): docs/laptop-queue/{BRIEF,PLAN,STATE}.md on feature/laptop-queue
  (worktree C:/NightShift/Mobile-Coop-laptop-queue). S1 Sonnet build running from PLAN.md; next: Opus checker, live
  overlap, PR. Its STATE.md has its own next steps.

**Test Runner SAVE 19 (2026-10-23 ~18:55, new account):**
- Runner fix: laptop-runner.ps1 now `git clean -fdq` before checkout (an untracked scripts/e2e-guard-carry.mjs in
  Mobile-Coop-testrun aborted guardcarryfix-48d049ad and the first 23cf567c try).
- RUNNING (scheduled tasks, logs runs/chain-1023<x>.log):
  - 4191 gf2: guardcarryfix-master2-f16600f5 (fix's suite file on master x2; the 18:10 master control PASSED = did not
    reproduce), then gf3: guardcarryfix-23cf567c (e2e-guard-carry + e2e-stealth-ai) -> ONE verdict to Guard AI Build.
  - 4192 s242: lr15pr242-1c22b913 (e2e-sectorops 1-6 + e2e-coop), then sr2: settingsrthide-ad2c6c06 (e2e-menus
    e2e-desktop; message the orchestrator only on FAIL).
  - 4189 lr15c (after gf3 + s242): lr15c-perf-classic / -photo-eb45b0af (MAP=campusOps MODE=sector, Epic, alone; the
    lr15b perf measured the warehouse - discarded) -> ONE LR15 verdict to Sector Ops (with s242 + lr15b results:
    photo / classic suites PASS, sheet clean, 0 texImage3D).
- SENT: #226 2276483a + polish 1d34c348 perf / guard-cap / coop verdict to Sector Ops (CPU p95 < 12 missed).
- OWN: PR #243 settings-rt-hide opened (master merged, ad2c6c06), orchestrator told; train-ready for train 31.
- Next: trains 31 / 32 from the orchestrator on 4189 first (JOBS=5 only if 4192 idle).
- UPDATE ~18:52: #240 23cf567c guard-carry + stealth-ai PASS (SENT Orchestrator + Guard AI; fix's test also passes on
  master f16600f5 3/3 = does not reproduce). #242 1c22b913 sectorops 1-6 + coop PASS (227 s; held for the LR15 verdict).
  #243 ad2c6c06 e2e-menus + e2e-desktop PASS (71 s). lr15c perf task STOPPED to keep 4189 free: rerun
  chain-1023lr15c.ps1 (drop its wait line) after train 31 = #240 #229 #234 #239 #243 (+#244), then send LR15 verdict.

**Test Runner SAVE 18 (2026-10-23 ~18:08, swap ~18:22):**
- TRAIN 30 7e8b8c51: 38/39, e2e-stealth-ai FAIL ("a suppressed shot 10 m off only makes a guard turn to look"; SENT).
  Player says test-only (fix 907bea89); orchestrator rebuilds train 30 on it -> run that train full when it arrives.
  Solo rerun runs/train30-stealthai-7e8b8c51 FAILED again (same assert, 53 s): deterministic, SENT to Orchestrator +
  Player Build. The rebuilt train 30 (on 907bea89) needs its full run before release.
- Still queued: 4192 chain-1023mr Marlow section-rating 053ff212 -> Marlow Build; 4189 chain-1023ap3 #226 perf alone
  (after gs5 done + all locks free; build first) -> Sector Ops. Guard AI carry-fix sha pending (see SAVE 17).
- SENT: invisible-guard split verdict (compile timeout, all 3 passes) to Guard AI.
- OWN JOB in progress: settings-rt-hide (orchestrator ~18:15): hide the dead "Ray traced" option, RT rate and GI rows;
  branch feature/settings-rt-hide off feature/voxel-retire, worktree C:/NightShift/Mobile-Coop-settings-rt-hide,
  notes docs/settings-rt-hide/BRIEF.md + STATE.md (WIP pushed as it goes). Next: finish / check (fresh Opus checker),
  laptop e2e-menus + e2e-desktop, PR after #236 merges (rebase onto master).
  UPDATE ~18:20: built 5e752abd (settingsScreen.ts only; tsc / eslint / 4 vitest / build ok); Sonnet checker running;
  laptop 4192 chain-1023sr: runs/settingsrthide-5e752abd (e2e-menus e2e-desktop) - record result in its STATE.
- SENT: Marlow section-rating 053ff212 6/7 (ctcourse:2 A3 cleaner-to-switch timeout).
- 4191 chain-1023gf (watcher): polls origin/feature/guard-ai-carry-fix every 2 min for a commit "guard-ai carry fix:
  recover guard bodies..." (d704098e is WIP, skipped), then guardcarryfix-<sha> (e2e-guard-carry + e2e-stealth-ai,
  expect PASS) and guardcarryfix-master-f16600f5 (same suite file, expect FAIL) -> ONE verdict to Guard AI Build.
- 4189 chain-1023sx (after #226 perf DONE): Sector Ops (1) LR15 eb45b0af lamp-atlas fix: lr15b-photo (photo darkness
  lightbake desktop sectorops:2), lr15b-classic (lightbake), lr15b-perf-classic / -photo (campusOps Epic, alone),
  lr15b-sheet (work/lr15b-eb45b0af/sheet: confirm the texImage3D warning is gone, guards / atrium lit) -> verdict;
  (2) artpol-1d34c348 e2e-coop + artpol-perf (views freeze on / off + guard-cap campus 24, alone) -> verdict.

**Test Runner SAVE 17 (2026-10-23 ~18:00, 92% save):**
- RUNNING / QUEUED (scheduled tasks, survive the swap; logs runs/chain-1023<x>.log, results runs/<label>/summary.txt):
  - 4189 chain-1023t30: TRAIN 30 7e8b8c51 full (Player #214 -> #223 -> #231 protocol 40 + #236 voxel-retire) ->
    verdict to Orchestrator (if the swap cuts it: read runs/train30-7e8b8c51, send the verdict).
  - 4192 chain-1023mr (after train 30 DONE): Marlow section-rating 053ff212 (protocol 42) coop netmove ctcourse:1-3
    section-rating course -> verdict to Marlow Build.
  - Guard AI will send a carry-fix sha (recompile a timed-out guard-body effect + e2e-guard-carry one-block stall):
    run e2e-guard-carry on it (expect PASS) and on f16600f5 (expect FAIL) ahead of everything except trains.
  - DONE: split found the cause - "Operation timed out after maximum retries - Effect: pbr" on partSkinMat guard
    bodies in all 3 passes (sent to Guard AI). Old line kept below for the record:
  - 4191 chain-1023gs5: invisible-guard split on old master f16600f5 (runs/guardsplit-f16600f5: cmd2 control, cmd3
    --player-far, cmd4 --no-photo; work/guardsplit-f16600f5*/ JSON compileErrors + sheets) -> verdict to Guard AI:
    which pass shows "Unable to compile effect", the owning mesh class (guard body / player / shadow copy), defines.
  - 4189 chain-1023ap3 (after gs5, every lock free): #226 2276483a perf ALONE (build first; work/campus-view-perf2.mjs
    guards + &guardfreeze=0, freeze counts via __sector.freeze; guard-cap campus 24) -> verdict to Sector Ops (budget
    CPU p95 < 12 at start / S3 / S4 / S5-worst). #226 e2e-coop already green (75 s); desktop ran the rest green.
- DONE + SENT this window: trains 27 / 28 / 29 GREEN 39/39 (4.76 / 4.77 / 4.78 released); #236 voxel-retire (my PR):
  merged with 4.78.0 (9985fe55), lightbake + desktop:1 green, in train 30; guard-render CLOSED (M1 in its STATE).
  LR15 0cadd6f3 green (suites Classic 8/8 + photo 6/6, perf table, sheet: Realistic much darker, one texImage3D
  out-of-range warning). Guard AI gates S9 0d1bdffc / S22 18a08619 green. Marlow 64e64ef0 full 39/40 (lightbake:
  lamp plugin 10/11 PBR materials; Marlow fixing). Player stack 0d7f04ce + AF6 b1de49f5 green.
- Invisible calm guards: on master 4.77.0 (bodies not drawn, partSkinMat "Unable to compile effect"), gone on 4.78.0
  (#232 LAMP_CSHADOW define likely masks it). Guard AI's e2e-guard-carry (fe910585) passes on both, so not reproduced
  outside the sheet yet; the split above is to find the path.
- Scripts (scratch): guard-calm-shots.mjs (--player-far, --no-photo, compile-error hook), campus-sheet.mjs (S2 / S3,
  classic vs photo), work/campus-view-perf2.mjs, work/serve-run.mjs (serve dist + run one node script).
- LESSONS: (1) a step that does not start with "build" runs against whatever dist the slot last built: always add
  build when the commit changes. (2) A chain's lock check can pass before a hand-launched run on another slot takes its
  lock: never start a run by hand while a measure chain is gated on "all locks free". (3) Chain gates on "<x> done"
  misfired twice today (passed early); summary.txt '^DONE' gates behaved.

**Test Runner SAVE 16 (2026-10-23 ~17:05):**
- SENT GREEN: train 27 e83f423a 39/39 (merged 4.76.0), train 28 3a2b1e9a 39/39 (JOBS=3); Guard AI S9 #229 3c49981e,
  S16 #228 7f91bf3a, S22 301ade39, A126 267553bf; Sector Ops #226 08af0e9f sectorops:1, #232 273539ec sectorops:6 +
  falloff=photo trio; Player stack 0d7f04ce coop (rest green on d86007b5), AF6 b1de49f5 coop + netmove.
- Guard-render: orchestrator approved closing with #225; write M1 (SAVE 15 numbers) into docs/guard-render/STATE.md +
  polish list in the voxel-retire batch PR after merging master.
- voxel-retire: c8d1b5da built, Opus checker PASS (caa940e2 docs). Batch running runs/voxelretire-c8d1b5da (4191).
- QUEUED (scheduled tasks): 4189 chain-1023mf Marlow full 64e64ef0 (running) -> chain-1023ap #226 2276483a coop, then
  4189 alone: work/campus-view-perf2.mjs (guards + &guardfreeze=0; __sector.debug() guardFreeze* keys) + guard-cap
  campus 24 -> chain-1023lr15 LR15 e60730c4 (suites Classic + photo, perf.mjs MAP/MODE x high/epic x EXTRA=falloff=photo
  alone, scratch/campus-sheet.mjs S2 / S3 sheet). 4191 chain-1023gs2: calm-guard redo 267553bf (fixed
  scratch/guard-calm-shots.mjs: Warehouse infiltration, 16.5 s calm, labels carryCalm()/carry.calmT) after vx.
- First calm sheet (work/guardcalm-267553bf) missed framing; officer draw ok; grunt low ready was the parked mode.

**Test Runner SAVE 15 (2026-10-23 ~16:20, new account):**
- All SAVE 14 runs finished (DONE). SENT: Guard AI S16 fb192d45 FAIL sectorops:6 (armoured-window sight assert), S9
  f2fd1219 GREEN 4/4, walk 906765a4 GREEN 18/18. Sector Ops: art perf 5504e2e3 CPU p95 over at S3/S4/S5 (14.5 / 12.4 /
  15.6; 0 guards 7.0 / 6.7 / 7.4), GPU ok; perf.mjs cmd2 ran map warehouse (wrong flag, ignore); lighting f03bb0ea 6/7,
  sectorops:6 FAIL "C1 cycles". Sector Ops fixing both; sends perf + C1 rerun commits; falloff=photo run needs an
  E2E_FALLOFF hook in their suites first; torch / presets / sheets wait for LR15.
- guard-render M1 (f5912402, work/guardrender-m1-f5912402/RESULTS.md): 24 facing frame CPU p95 sectorops 13.9 / 15.9
  (patrol / alert), ctcourse 12.7 / 13.2 -> CPU OVER 12; GPU p95 8.6 / 10.1 / 7.1 / 7.7 ok. Marlow at its 12 cap: 8.6 /
  9.0 ok. To write into docs/guard-render/STATE.md after train 27 merges #225 (perf tuning waits for the playtest).
- RUNNING / QUEUED (scheduled tasks; logs runs/chain-1023<x>.log):
  - 4189 chain-1023t27: train27-e83f423a full JOBS=5 (started 16:09). Verdict -> Orchestrator.
  - 4189 chain-1023sa (after t27): sectorart226-8521bcbf coop + sectorops:1,3,4,5,6 JOBS=3 -> Sector Ops Build.
  - 4192 chain-1023pb (after t27): playerstack-d9619e51 (#223 on #214 on #207: coop netmove ctcourse anim takedown
    traverse combat weapon-audio) -> Player Build (+ #231 c98005de already green).
  - Agents: Opus voxel-retire plan (worktree Mobile-Coop-voxel-retire, docs/voxel-retire/); Sonnet calm-guard shot
    script C:/NightShift/scratch/guard-calm-shots.mjs (run on 906765a4 at 4189 after sa).
- Bash tool was blocked by the classifier after schtasks; PowerShell / Read / Grep still work.

**Test Runner SAVE 14 (2026-10-23 ~15:15, swap ~15:30):**
- SENT: Guard AI S15 fc249f3f GREEN 9/9 (runs/guardais15-fc249f3f). Sector Ops art 5504e2e3 PART 1: logic 8/9
  (sectorops:6 = the guard panel-walker assert S15 rewrites, not the art), shots + sheets
  (work/campusart-5504e2e3/sheet-s1..5.webp), meter parity ok. Answered Guard AI S21 (rig armed/ready path exists).
- SENT ~15:20: Guard AI S9 1ad04058 GREEN 4/4 (#218-#220 train-ready, orch copied). Player coopwalk c6b4f4a3 1/2:
  e2e-coop FAIL "two takedowns together count as a dual takedown" (after their new step; orch copied). Both DONE.
- RUNNING / QUEUED (scheduled tasks, run through the swap; logs runs/chain-1023<x>.log):
  - 4189 chain-1023r89: coopwalk-c6b4f4a3 (Player Build: coop netmove; verdict -> Player Build + orchestrator) ->
    waits for chain-1023r92 done + both locks free -> sectorart-perf-5504e2e3 (Sector Ops PART 2: perf MAP=campusOps
    MODE=sector, guard-cap campus -> work/campusart-5504e2e3/guard-cap, view probe -> work/campusart-5504e2e3/views.json;
    perf numbers are in runs/sectorart-perf-5504e2e3/cmd2.log). Verdict -> Sector Ops Build (budget p95 CPU < 12,
    GPU < 15 ms at the S3 / S4 / S5 worst views).
  - 4189 chain-1023mw (after coopwalk, before the perf pass): marlowfinal-058156cc (e2e-ctcourse:4) ->
    marlows10-dfee91c3 (ctcourse:1 :2 course). WIP data, not a gate; ONE verdict -> Marlow Build.
  - 4192 chain-1023r92: guardais9-1ad04058 (coop netmove stealth-ai takedown; verdict -> Guard AI Build) ->
    guardaiwalk-2082f96b (S17-S21: stealth-ai sectorops ctcourse course ct-warehouse stealth tactics takedown coop;
    verdict -> Guard AI Build; lowest).
  - 4192 chain-1023s16 (right after r92): guardais16-fb192d45 (Guard AI S16 armour fire gate: sectorops:6
    stealth-ai ct-warehouse ctcourse tactics; verdict -> Guard AI Build). The art perf part now runs from
    chain-1023r89b.ps1 (gated on r92 + s16 done; writes "chain-1023r89 done" to runs/chain-1023r89.log as before).
    Guard AI will send one more: feature/guard-ai-s9 after its 4.75.0 merge (protocol 37): coop netmove stealth-ai takedown.
  - UPDATE ~15:25: walk 2082f96b STOPPED (superseded, no verdict). 4192 chain-1023g2 after s16: guardais9-f2fd1219
    (S9 on 4.75.0, protocol 37: coop netmove stealth-ai takedown) -> guardaiwalk-906765a4 (stealth-ai sectorops ctcourse
    course ct-warehouse stealth tactics takedown coop netmove; body search up to 180 s). ONE verdict -> Guard AI Build
    (S16 + S9 + walk). Art perf part now in chain-1023r89c.ps1 (gated on r92 + g2 done). 4191: coopwalk2-c98005de
    (Player fix round, e2e-coop only; verdict -> Player Build + orch; netmove from c6b4f4a3 still counts).
  - Guard AI GPU sheet on walk 906765a4 (calm guard: rifle slung, officer pistol on thigh, clipping?; draw on suspicion;
    two guards passing in a doorway): needs a shot script; after the perf pass, 4189 free.
  - 4189 chain-1023lr2 (RUNNING since 15:26; replaced LR14 83b22daa, never run): lighting-f03bb0ea = Sector Ops
    combined lighting batch (LR13 + LR14, protocol 38): coop netmove menus sectorops desktop darkness lightbake.
    Quote lightbake's "LR14 character shadows" line (max textures per shader, slot stats; a sampler count of 17 on
    the skinned player = vertex-stage bone / morph samplers: report, not a fail). Writes "chain-1023lr done".
    NOT queued (needs scripts / Settings): darkness + lightbake again with ?falloff=photo (Realistic); Epic console smoke
    campusOps sector + ctcourse course (no errors, world.charShadows.copies rising); torch checks (guard torch on Wren at
    2 / 4 m, guard facing a wall, two torches); perf.mjs --preset=high|epic --budget, 24 guards per section,
    warehouseOps + campusOps, Character shadows Auto vs Off, Classic vs Realistic on warehouseOps (bake time, memory:
    campusOps atlas 48 -> 134 MB expected, S1 bay frame time); contact sheet guard + partner under a lamp Epic vs
    Medium + walk between two lamps. ONE verdict -> Sector Ops Build.
- SENT ~15:30: Player coopwalk2 c98005de e2e-coop GREEN (batch green; orch copied, protocol 37 vs Guard AI S9 37 /
  Sector Ops 38 flagged). Marlow WIP 1/4 (ctcourse:4 A8 grille stop timeout; s10 ctcourse:1 A2 lure timeout, :2 A4 dock 0.991;
  course ok).
  - 4189 chain-1023m1 (after r89 + r92 + lr): guardrender-m1-f5912402 = guard-render M1 check on master 4.75.0
    (work/guardrender-m1-f5912402; load sample runs/guardrender-m1-load.csv). Judge vs BRIEF M1 (24 facing: CPU p95
    <= 12, GPU p95 <= 15), write into docs/guard-render/STATE.md on feature/guard-render-close (PR #225), then close
    the job or re-plan.
- NOT DONE: Guard AI's calm-guard contact sheet (rifle slung, officer pistol on thigh, draw at guard speed) at
  2082f96b: needs a small shot script (start from scripts/campus-art-shots.mjs: teleport + photo camera on a calm
  guard); after the queue above.
- LESSONS: a queue script whose runner calls used `$r[0]` from an ArrayList ran NOTHING (14:41): use literal runner
  calls. In a step for cmd /c, `node -e "..."` must have no spaces inside the JS. A chain re-gated mid-run: stop only
  the waiting chain powershell (Stop-Process its PID), never the runner or node under it.

**Test Runner SAVE 13 (2026-10-23 ~14:40):**
- SENT: train 26 a63e6f4b GREEN 40/40 (466 s, JOBS=5) -> merged 4.75.0. Guard-render PR #225 open (docs only:
  run-s4-on|off + STATE; branch feature/guard-render-close, worktree Mobile-Coop-guard-render-close). Orchestrator told.
- RUNNING (scheduled tasks; logs runs/chain-1023<x>.log):
  - 4192 chain-1023s15: guardais15-fc249f3f (Guard AI #220: stealth-ai sectorops:6 levels ct-warehouse course
    ctcourse; then sectorops:3 alone) -> chain-1023s9: guardais9-1ad04058 (coop netmove stealth-ai takedown).
    ONE verdict for both to "Night Shift | Guard AI Build" (green = #218 -> #219 -> #220 train-ready, train 27).
  - 4189 chain-1023art (Sector Ops batch 3, 5504e2e3): sectorart-5504e2e3 (sectorops coop netmove smoke) -> waits for
    both locks free -> sectorart-before-b26c5925 (before shots) -> sectorart-gpu-5504e2e3 (after shots, --sheet, perf
    MAP=campusOps MODE=sector, guard-cap campus 0/12/24, scratch probe work/campus-view-perf.mjs at the S3/S4/S5 worst
    views + start, with guards and 0 guards). Out C:/NightShift/scratch/work/campusart-5504e2e3 (sheet-s1..5.webp,
    views.json, guard-cap/). ONE verdict to "Night Shift | Sector Ops Build" (budget: draws <= 40 per section, p95
    CPU < 12 / GPU < 15 ms).
- Guard-render: regression A/B (runs/guardrender-regr-*) = no code regression since S1 (laptop load). Last open item:
  M1 guard-cap on master with the laptop quiet: queue it at the ~95% save so it runs in the swap window
  (sectorops,ctcourse counts 0,12,24, out work/guardrender-m1-<sha>), then PR #225 follow-up or close.

**Test Runner SAVE 12 (2026-10-23 ~14:15, new account after the ~14:05 swap):**
- Guard AI Build now also runs on the laptop: its e2e still comes through this queue; laptop CPU under ~80% together.
- RUNNING (scheduled tasks): 4189 chain-1023t26: train26-a63e6f4b full (JOBS=5, 4192 idle, load sampler
  runs/train26-load.csv; started 14:10:36) -> verdict to the orchestrator. Then chain-1023s4off (waits for train26
  DONE + both locks free): guardrender-s4off-5809afe6 = the S4 `?animtier=0` guard-cap pass (out
  C:/NightShift/scratch/work/guardrender-s4-off).
- guardrender-s4cap-5809afe6: the "on" pass is good (C:/NightShift/scratch/work/guardrender-s4-on); the "off" pass
  ran with no flags (unescaped `&` in `cmd /c`: write `^&` unquoted, as the S1 / S6 runs did), so it is rerun above.
  First read of "on" vs S1-on at 24 guards: sectorops patrol/facing 9.4 vs 7.1 ms, ctcourse facing 9.5 vs 6.3 ms
  (worse; Guard AI agents shared the laptop CPU during the run, no load sample). Judge S4 only from on vs off.
- QUEUE after that: Player #207 e2e-clip (feature/ctcore-batch-22 still 99c37251 = not requested yet), Guard AI
  S13-S15 rerun (feature/guard-ai-s15 still 72a5091f WIP = not requested yet). Run on 4192 when the request comes.
- Guard-render: after the off numbers, copy both into docs/guard-render/run-s4-on|off on feature/guard-render-s4 +
  STATE "## S4"; then re-plan (PLAN.md: all slices done except S2 = voxel path only, off by default).

**Test Runner SAVE 11 (2026-10-23 ~13:55, swap ~14:05):**
- SENT since SAVE 10: Sector Ops b3fd1fa3 6/7 (sectorops:6 console warnings from guard-ai talking pairs; they fixed it
  in e57dac61); pose-parity 546b6e41 GREEN 3/3 (Player Build).
- RUNNING / QUEUED (scheduled tasks): 4189 sectorp4-e57dac61 SENT GREEN (PR #217 green);
  4192 marlowmerge-d32a435a SENT 4/6 (ctcourse:1 A2 shunter lure timeout, :2 A4 dock not dark 0.991). chain-1023gb (Guard AI): 4192 guardais9-59c35d7f (coop netmove
  stealth-ai takedown; S9 alone, early e2e-coop verdict) after marlow; 4189 guardais13lv-82ef72bd (e2e-levels under
  load; post on PR #218) after sectorp4. BOTH SENT 14:00 (s9 3/4: stealth-ai breaker from the S13-S15 base; 13lv GREEN, PR #218). Then chain-1023s4m (waits for chain-1023gb done): guardrender-s4cap-5809afe6 starts when both locks
  are gone (out C:/NightShift/scratch/work/guardrender-s4-on|off -> copy to docs/guard-render/run-s4-on|off on
  feature/guard-render-s4, numbers into STATE "## S4"). A new request that arrives while it runs waits on the 4189
  lock: run it on 4192.
- NOT YET REQUESTED (do not run WIP): Player #207 ladder fix (feature/ctcore-batch-22 still 99c37251; add e2e-clip),
  Guard AI S13-S15 rerun (feature/guard-ai-s15 72a5091f is a WIP save, agent running).
- All guard-render worktrees clean and pushed. No agents running.

**Test Runner SAVE 10 (2026-10-23 ~13:45; wins over all below):**
- RUNNING (scheduled tasks, survive the swap; logs C:/NightShift/scratch/runs/chain-1023<x>.log):
  4189 chain-1023q89: guardrender-s4-5809afe6 DONE GREEN 16/16 (SENT, #212 train-ready for train 26) ->
  sectorp4-b3fd1fa3 (Sector Ops: sectorops all parts + coop; verdict -> Sector Ops Build) -> poseparity-546b6e41
  (Player Build: coop netmove takedown; PROTOCOL_VERSION 36; verdict -> Player Build).
  4192 chain-1023mb: marlowmerge-d32a435a (Marlow Build: ctcourse:1-3 coop course netmove; skip :4) -> Marlow Build.
- SENT since SAVE 9: train 24 failed e2e-clip (#207 ladder knees 8.9 cm, deterministic) -> #207 out; rebuilt 44f9aa9e
  e2e-clip GREEN -> 4.73.0. Train 25 a8bb27ab GREEN (e2e-levels ladder flake under load; alone green x3) -> 4.74.0.
  Player Build batch 23 dc8919cd GREEN 10/10. Sector Ops e10 16442ee1 (known :822 only), PR4 ed256ccf GREEN 9/9.
  Guard AI f14b93af GREEN 7/7 (PR #208 comment), 884b89c0 12/15 (stealth-ai breaker, sectorops:6 switch bank; :3 load).
- WAITING ON OTHERS: Player Build sends one request: #207 ladder fix + batch 23 + iPad fit: ADD e2e-clip; it goes
  AHEAD of pose-parity if pose-parity has not started. Guard AI flake owner for e2e-levels told.
- GUARD-RENDER: #209 S6 + #211 S3a released (4.73.0), #213 S7 released (4.74.0 if train 25 merged). #212 S4 train 26.
  Next: S4 measure guard-cap (4189 ALONE, 4192 idle, no train or request queued): chain-1023s4cap.ps1 (label
  guardrender-s4cap-63e8fcd9 ABORTED: use a new label on the current S4 head; out C:/NightShift/scratch/work/
  guardrender-s4-on|off), then copy into docs/guard-render/run-s4-on|off on feature/guard-render-s4 + STATE numbers.
  After that re-plan from PLAN.md section 4 (all slices S0-S7 done except S2 skipped).
- LESSONS: run trains with the other slot idle when possible (train 25 at 908 s beside a JOBS=3 run vs ~620 s; flake).
  Third slot 4191 works for a single quick suite (worktree Mobile-Coop-testrun).

**Test Runner SAVE 9 (2026-10-23 ~13:00; wins over all below):**
- RUNNING: 4189 train24-468167df full (chain-1023t24.ps1, task NightShift-chain-1023t24-4189) -> verdict to the
  orchestrator (4.73.0 on pass; train = menu + #207 + #209 S6 + #211 S3a). 4192 chain-1023sr.ps1: sectore10-16442ee1
  (Sector Ops: sectorops:6 :1 coop; known :1 fail at e2e-sectorops.mjs:822 crate prompt, :526 hearing flake) ->
  guardrender-s7-45fccee5 (smoke stealth-ai sectorops ctcourse coop anim).
- SENT since SAVE 8: train 23 GREEN 41/41 (4.72.0 released, #210). #207 GREEN 8/8 (Player Build + orch). marlow
  1a47946a GREEN 5/5 (Marlow Build). sector-redesign f96924e5 7/8 (sectorops:1 crate prompt; Course Ready, offline).
  Guard AI 0742bd0d sectorops:1 GREEN -> #200-#203 train-ready (train 25 with #208, sectorMode conflict).
- GUARD-RENDER PRs: #209 S6 (in train 24), #211 S3a (in train 24), #212 S4 (stacked on #211; e2e GREEN adcd5fa7 15/15,
  checker PASS WITH NOTES; orchestrator + Player Build (characterRig 1699-1709) not told yet: send with train 24 verdict).
  S7 (feature/guard-render-s7 45fccee5): checker PASS WITH NOTES, finding 4 (context-loss) fixed; e2e queued; then PR.
  Next measures (4189 ALONE, only with no train queued): guard-cap S4 on vs ?animtier=0; S7 GPU memory.
- LESSON: a PowerShell list with ONE run `@(@(...))` flattens to its strings (labels g / a / b ran nothing): use
  an ArrayList (chain-1023sr.ps1). In bash heredocs never write "$runs\chain..." unquoted (\c ate the path).

**Test Runner SAVE 8 (2026-10-23 ~12:35, new account; wins over all below):**
- SENT: guardais10-345fbb91 7/8 (sectorops:1 "S6: they close on it (9.06,10.30 -> 7.21,9.59 m in 7 s)") -> Guard AI +
  PR #203 comment. Train 23 9d4e0cb8 running on 4189 (chain x); verdict -> orchestrator when DONE.
- S6 PR #209 OPEN (52ef9cb3: reverts of S6d c181002e + body reach 063605ff, world.ts addShadowCaster comment, STATE,
  fragment; base master, stacked on #204). Orchestrator not told yet (goes with the train 23 verdict).
- Haiku chore "merge-train drops known fragment entries": already on master (#198 dropKnown; merge-train uses
  assemble / assembleDir). Nothing to do.
- AGENTS (Opus, background): S7 share GPU buffers per cache entry (feature/guard-render-s7 from S1 d53caf0f, worktree
  -guard-render-s7); S4 anim tiers (feature/guard-render-s4 from S3a 220d3cf7, worktree -guard-render-s4). Both wait for
  train 23 DONE before tsc / vitest. Check each branch's newest commit on resume. node_modules are junctions.
- S3a: 3 fix rounds done (goal allows 1): no more rounds. PR when guardrender-s3a-220d3cf7 is green; send Guard AI the
  enemy.ts / hitboxes.ts diff with that verdict.

**Character Build SAVE 7 (2026-10-23 ~12:20, swap at 100%; wins over all below):**
- LAPTOP CHAIN (scheduled tasks NightShift-chain-1023x-4189 / -4192, script scratch/chain-1023x.ps1, log
  runs/chain-1023x.log; DONE labels are skipped, so `Start-ScheduledTask` again to resume a lane):
  4189 JOBS=3: train23-9d4e0cb8 (build;full, started 12:19) -> ctcore207-99c37251 (coop netmove ctcourse anim takedown
  traverse) -> marlowfinal-1a47946a (ctcourse:1 ctcourse:3 coop netmove course).
  4192 JOBS=2: guardais10-345fbb91 (started 12:19: stealth-ai sectorops takedown ct-warehouse) -> sectorredesign-f96924e5
  (sectorops coop netmove) -> guardrender-s3a-220d3cf7 (6 suites) -> guardrender-s6-ec859eeb (DONE, skipped).
- VERDICTS TO SEND (one message each, from runs/<label>/summary.txt + the e2e log's "Error: ASSERT" lines):
  train 23 -> orchestrator (4.72.0 on pass); #207 -> CT Core + copy orchestrator; 345fbb91 -> Guard AI + comment on PR
  #203; marlow 1a47946a -> Menu Notes; f96924e5 -> Course Ready (suites guessed: confirm with them).
- GUARD-RENDER (job lead = this session; detail docs/guard-render/STATE.md on each branch):
  S1 PR #204 and S5 PR #205 are in train 23 (S5 e2e-anim + takedown GREEN 9fc1e66a). S3a: fix rounds 1-3 DONE, head
  220d3cf7; checker on round 2 PASS WITH NOTES (its 60 deg hostage seam fixed in round 3, unchecked); e2e GREEN on
  3dcbb662. Next S3a: diff to Guard AI (S3a carries the guard-ai merge 8f33e44c), then PR once 220d3cf7 is green.
  S6: fixes DONE ec859eeb, checker PASS WITH NOTES, e2e GREEN (c181002e and ec859eeb). MICHAEL 12:15: "Ship S6 without
  S6d": revert S6d (c181002e) and the body.ts reach line from the S6 fix (ec859eeb), fix the world.ts:491 "from the
  camera" comment, then PR. Then re-plan from docs/guard-render/PLAN.md section 4 (S2 skipped; S7 = share GPU buffers).
- MICHAEL 12:15: connectors Gmail / Google Drive / Fergus off for this session (done).
- LESSONS: a chain started with Start-Process dies with its session (child powershell cannot start); use a scheduled
  task. The S1 look shot wrapper needed replaceAll (the comment held the first MODE).

**Character Build SAVE 6 (2026-10-23 ~10:55, new account; wins over SAVE 5 and below):**
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
- 12:00 GREEN: guardrender-s3a-e704d5f3 (6 suites, 308 s), guardrender-s6-c181002e (4 suites, 407 s). S3a fix round 2
  DONE 3dcbb662 (free fit mode + crouch sweep, shared emote fns, walked hostage HELD_MOVE, steady bounds 0.09 / 0.11).
  Opus checker running on S3a r2 (e704d5f3..3dcbb662) + S6 fixes (c181002e..ec859eeb). Runners: 4189
  guardrender-s3a-3dcbb662 (same 6 suites), 4192 guardrender-s6-ec859eeb (running) -> guardrender-s5-9fc1e66a (waiting).
  On checker PASS + green: S3a PR (diff to Guard AI first: S3a carries the guard-ai merge 8f33e44c), S6 PR without S6d.
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
Night Shift | Test Runner (laptop, the MAIN test machine). First call mcp__ccd_session_mgmt__set_session_title with session_id "self" and title "Night Shift | Test Runner" (ToolSearch if deferred). Read CLAUDE.md "Sessions" on origin/master ("Main test machine: the laptop", "Heavy-usage throughput" incl. "Token rules"), then the newest "Test Runner SAVE" block (SAVE 30 or later) at the top of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Do what it lists, in order. If two Test Runner sessions show in ListAgents, close the older one.

The queue is the SERVICE now (no hand-run chains, Orchestrator 20:26): task NightShift-laptop-queue runs scripts/laptop-queue/service.mjs from C:/NightShift/Mobile-Coop-laptop-queue-svc (follows origin/feature/laptop-queue, self-updates when idle); log + state C:/NightShift/scratch/laptop-queue/ (log.txt, runs/<id>/); verdicts are GitHub statuses laptop-e2e[/<set>] + PR comments on failure. Requests: node scripts/laptop-queue/request.mjs --sha <ref> (--suites "a b" | --full | --alone --step "<cmd>" [--env K=V]) --requester "<title>" (alone = perf / sheets, after trains and PR suites). Desktop overflow worker NightShift-desktop-queue (LQ_WORKER=desktop, pr only) claims via claims/<id>.json on the laptop-queue branch. Locks C:/NightShift/heavy-4189.lock / heavy-4192.lock (service lines "laptop-queue | ..."; a lock with no live node is stale). Restarting the service: Stop-ScheduledTask leaves the node child alive, so a restart also needs that node pid killed (needs Michael's OK).

Your job: watch the service log, step in when it is stuck (say why, never kill a run without the user's OK: the classifier blocks taskkill), send ONE verdict per batch only where a status is not enough (perf / sheet results the requester needs read out, as a PR comment or a message to the job lead), and own laptop-queue PR #252 (docs/laptop-queue/STATE.md on feature/laptop-queue, worktree C:/NightShift/Mobile-Coop-laptop-queue). Message "Night Shift | Orchestrator" only on a train failure, PR open / train-ready, blocked, or needs Michael. Laptop CPU under ~80% with Guard AI Build. Then the "Common tail" in docs/orchestrator/PROMPTS.md on origin/feature/menu.

Burn: full burn to 100%; at the orchestrator's ~92% save push WIP, keep this SAVE current, keep working. No polling turns (Monitor / background waits). Native multiple choice only, hyphens not em dashes. Commits end with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
```
