# flake-fix - state

**Done (2026-10-22):** PR #117 merged as 4.54.1 (6c2d50a4, ~15:20). Proven on 2b05f423 (check + netmove, mouse,
ctcourse, stealth-ai twice at JOBS=2). This file now also carries Character Build's resume (the last fenced block).

**Character Build now (2026-10-22 ~21:50, stopped for the ~22:04 account swap; this block wins over the older ones):**
- RULES (Michael): every e2e run is `E2E_GPU=1` (runner `RUN_GPU=1`); a GPU failure counts (fix the test or the game);
  software reruns only to tell a test timing bug from a game bug. TRIAL from the next full run (Michael ~21:50 "trial
  3 browsers + 2nd slot"): full runs JOBS=3 on 4189 (heavy-4189.lock); a second slot for single GPU suites JOBS=1 on
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
- RUNNING through the swap as scheduled task ns-chain-1022y (C:/NightShift/scratch/chain-1022y.ps1): train/9 6536111d
  (master 4.58.3 + P + N4c + T1 + #147): e2e-menus alone (runs/train9b-6536111d-menus; expect FAIL unless #148 is in),
  then the FULL run E2E_GPU=1 JOBS=3 on 4189 = the first 3-browser trial run (runs/train9b-6536111d, load
  runs/load-train9b.csv). On resume: send the orchestrator the verdict per suite plus the trial check against the train 9
  JOBS=2 numbers below (wall 740 s, CPU avg 35%) and write the trial result here.
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
Night Shift | Character Build (laptop, the MAIN test machine, GPU for every e2e run). Read CLAUDE.md "Sessions" on origin/feature/menu, then the "Character Build now" block at the top of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Check C:/NightShift/scratch/runs (chain-1022.log, newest folders; gputests2-6703e99a may have finished) before starting anything, then message "Night Shift | Orchestrator" that you are back, with any results, and ask for the queue.

Runner: C:/NightShift/scratch/laptop-runner.ps1 (header explains; results C:/NightShift/scratch/runs/<label>/summary.txt, DONE at the end). Every run RUN_GPU=1. Slots: full runs RUN_JOBS=3 on -Slot 4189 (the trial in STATE: keep the load sampler C:/NightShift/scratch/load-sampler.ps1 on and check the pass criteria); single suites RUN_JOBS=1 on -Slot 4192. Fetch in the slot's worktree before a new commit. Launch hidden; a run that may outlive the session goes through a scheduled task (schtasks, see STATE), never only Start-Process. Chain several runs in one script (C:/NightShift/scratch/chain-*.ps1 are examples). Reply to the requester with pass / fail per suite, the failing assert lines, times and commit; copy the orchestrator. Order: orchestrator, CT Core, Menu Notes, Course Ready, then own jobs (gpu-tests-2 PR, test-speed-2).

Pacing: docs/orchestrator/STATE.md "Pacing" on origin/feature/menu (get_usage before each agent; 97% no new agent, 98% commit + push + STATE, stopped by 99%). Branch guard before every write. Native multiple choice only, hyphens not em dashes.
```
