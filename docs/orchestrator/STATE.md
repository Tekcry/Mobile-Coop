# Orchestrator - resume point (2026-10-22 ~10:05 Sydney)

2026-10-22 ~13:10: account handoff prepared: docs/orchestrator/HANDOFF.md has the open work and every session's prompt
(it supersedes the "Sessions" table below).
2026-10-22 ~13:20: new account live. All five sessions resumed from HANDOFF prompts: CT Core (local_f21a4036, #103
ctcourse:1 solo rerun on d487495b), Menu Notes (local_ec5ab600, N3 fix round), Course Ready, Character Build (laptop,
Remote Control; address it by title via ListAgents). Usage 5-hour 2%, weekly 2%. Cron 17/37/57 recreated.
Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first (its "Decided" list holds Michael's answers verbatim).
Work folder C:/NightShift/Mobile-Coop-menu, branch feature/menu (orchestrator docs; merge origin/master before each
docs batch; a docs PR when convenient). Scratch worktree for version / merge steps: C:/NightShift/Mobile-Coop-phone-native
(detached checkouts; reset --hard there is safe).

## Master
v4.60.1 (train 11 #155 = #150 + #154 + #149, 62d80c02, ~23:30; /preview/ = dev = 62d80c02). #144 R out (voxelFit: 8 cover points in the air on its S2 C2 landing; Course Ready fixing). Train 8 = #119 + #138 7667b681 (six GPU suites on the laptop). Mocap-trial 44d7c2a7: suites + checker running.
v4.60.0 (train 10 #153 = #142 n4d + #145 lamp gap, d01300d3, ~22:50; /preview/ = dev = d01300d3; laptop GPU 35/35, 465 s at JOBS=3). Train 11 = #144 R (running its suites), #150 (50c5f5e9 ready), #149 (1afdcd54). Train 8 = #119 + #138 (fix round: e2e-anim knees, e2e-clip crouched holstered).
v4.58.1 (#140 gpu-tests, 2016e063, ~21:25; /preview/ = dev = 2016e063).
Train 8 = train/8 4cc73665 (#119 N4b c22b6719, #135 N1 08023227, #138 N2 e6274d36 which contains N1), built 20:50, laptop GPU full run after R's run (known GPU-only test bugs: studio keyed walk, lightbake 7/10, fixed on feature/gpu-tests 130cf522 -> train 9). P #136 red (ctcourse station 3, Menu Notes diagnosing). R 2f40ed74 suites on the laptop. CT Core's new top job: mocap-trial (CMU, toggle, side-by-side; ROADMAP Decided 20:45). Laptop GPU full run on 4.58.0: 842 s at JOBS=2 (vs 2025 s software at JOBS=3).
v4.58.0 (train 7 #137 = #132 + #134, 00d7a653, ~20:05; /preview/ = dev = 00d7a653; studio tier, laptop solo suites green). Train 8 candidates: #119 N4b (c22b6719, master merged), #135 N1, #136 P (area suites on the laptop), R (fix round), N2 (checker), N4c (feature/anim-n4c, checker; Michael "Faster arm" for the strike timing).
v4.57.0 (train 6 #133 = #122 + #123 + #127 + #128 + #129 + #131 + docs, 703b5063, ~19:25; /preview/ = dev = 703b5063). Train 7 = train/7 9ff4542d (#132, #134) on the laptop; #119 left out (src conflicts, Course Ready merges master).
v4.56.0 (train 5 #130 = #118 + #120 + #125 + #126, 79216e49, ~18:15; /preview/ = dev = 79216e49). Train 6 candidates: #119, #122, #123, #127, #128, #129.
v4.55.1 (#124 guardInfo test fix, 170ee701, ~16:35; /preview/ = dev = 170ee701; master CI green). v4.55.0 (train 4 #121 = #110 + #115 + #116, 9287a095; merged with CI red, fixed by #124). Merge rule: gate gh pr merge on the CI exit code.
Train 5 candidates: #118 N3, #119 N4b, #120 idle-shins, #122 N3b, #123 anim-bake-all; N1, sector-fixes C / L, pad-wheel-wait, heap-asserts next.
v4.54.1 (#117 flake-fix, 6c2d50a4, ~15:20; /preview/ = dev = 6c2d50a4). v4.54.0 (train 3 #114 = #103 + #113, 99f3e488, ~14:30).
Train 4 = train/4 4e1bbec1 (#110 16b1a044, #115 a070e504, #116 b8022c1f): full e2e on the laptop since ~15:10; merge master
(4.54.1, test-only + CHANGELOG) at the version commit. Train 5 lead: #118 N3 (9c31355c); then N4b, N1, idle-shins, N3b, sector-fixes C.
v4.53.0 (train 2 #112 = #105 + #109, 5220f79c, ~13:05). 4.52.0 (train 1 #111 = #99 + #108, protocol 28, b1f13b19, ~12:30). 4.51.1 (#107, 71ce1bff, ~11:25). 4.51.0 (#106 key tools, d52d37a5, ~11:10). 4.50.0 (#92 rejoin, 1a2c60ca, ~11:00; protocol 27 taken: #99 -> 28, #108 -> 29 at their merges). /preview/ = dev = 5220f79c (4.53.0). Michael 2026-10-22 ~11:20: "Yes I'll allow it" (pushing master merges to dev and editing ROADMAP after auto mode blocked them). Menu Notes cleared and resumed ~11:20. Earlier today: 4.49.0 #97 tuner v3; see ROADMAP Done for the full list.

## Pacing (Michael)
- 2026-10-22 ~22:20: "make 99% a save point and we can run a clear on all sessions again". Full speed to 99%; at 99% every session saves (WIP pushed, resume file current), replies "saved" and idles; the orchestrator updates HANDOFF.md, then gives Michael the clear plus each paste-in prompt (HANDOFF "In the new account", one at a time, with title, model and effort), orchestrator first. It replaces the overflow-to-100% rule.
- 2026-10-22 ~22:15 (overrides the 97 / 98 / 99% stops below): "dont try save tokens, i will reset usage as soon as you hit 100%". Every session runs full speed to 100%; nobody pauses early. Because 100% cuts off mid-step, every session commits and pushes WIP and refreshes its resume file after each agent hand-back, and the orchestrator keeps HANDOFF.md current after each event (it is the resume point when Michael resets).
- 5-hour window: use as much as possible, never hit it; trim in order (cloud, laptop job, one agent per session).
  Michael 2026-10-22 ~12:50: "Hard stop at 99% to allow saving work": sessions start no new agent at 97%, save (commit,
  push, STATE) at 98%, and are stopped by 99%. A recurring cron (17, 37, 57 past) checks it in this session; recreate it after a clear.
- Weekly: "Full speed, swap account" (09:20): at weekly ~98% pause everything at clean commits, save, and hand off with
  docs/orchestrator/HANDOFF.md (prompts one at a time). Weekly 65% at 10:02 (pace slowed to ~3%/h with one agent per session).
- Full burn (Michael 2026-10-22 ~13:30, new account): "using this account, i want to use all available weekly tokens
  before the reset. make sure each 5 hour token window hits 99%". Weekly resets 2026-10-24 15:00 Sydney. Every session
  runs full speed: parallel agents where the work splits, spare jobs pulled in when idle (sector-fixes, N0 pass 2, N2).
  The 97 / 98 / 99% thresholds stay; the cron resumes every paused session after each 5-hour reset (day and night).
  At weekly ~98%: save and hand off (HANDOFF.md) as before.
- Overflow session (Michael 2026-10-22 ~15:25: "Make sure one session still runs after 97% and uses up to 100%. Hitting
  the session limit should not affect it and allow resuming once it resets."): CT Core ignores the 97 / 98 / 99% stops
  and runs to 100%. It commits and pushes a WIP after every agent hand-back and keeps its resume file current, so a
  cutoff loses at most the step in flight; scripts it started keep running (no tokens). After each reset the cron
  messages it first to resume. The other sessions keep 97 / 98 / 99%.
- Pace before 13:30 (history): one agent per session (since 09:45). 12:25: 5-hour 82% rising ~0.5%/min: flake-fix agent paused, desktop
  leads start no new agent and pause at 97% or their current agent's end; a one-shot cron at 14:13 resumes everyone.
- Overnight: never leave a question dialog open (it blocks the turn and the cron); log assumed decisions instead.
- Context: sessions over ~60% get cleared at clean points (Michael approved 09:30): save STATE, clear, send resume.
  2026-10-22 13:40 (Michael asked for the best clear times): clear at ~40% context (1M windows) at the next clean point
  (PR opened, slice done, or the 98% save before a reset, the best point since the session idles anyway). The cron
  reads each session's context (get_usage session_id). Desktop sessions have Remote Control on, so the orchestrator
  cannot clear them: it tells the session to save and refresh its resume prompt, then gives Michael the clear and the
  paste-in resume prompt (title, model, effort).

## Sessions (titles are the message addresses)
| Session | Owns now | Next |
| --- | --- | --- |
| CT Core Build (desktop, local_164e4c5a; cleared + resumed 10:00 from docs/orchestrator/resume-ct-core.md) | anim-run-half (option c approved, walk pin 0.053), #103 bake-targets (laptop solo reruns of e2e-stealth-ai / e2e-clip), anim-bake-all (PR after #103), e2e-coop-takedown (PR) | anim-natural N1 feet, then N2 body motion |
| Course Ready Build (desktop, local_7cc5a94a; cleared + resumed 09:45 from docs/marlow-bays/RESUME-trackA.md) | #105 guard tuning, #106 item 30 key tools (both queued on the laptop) | idle; N4 rows after the audit |
| Menu Notes Build (desktop, local_b81e3537) | anim-natural N0 audit (AUDIT.md), N3 weapon draws paused as WIP (feature/anim-n3 786f993f; animGraph / tuneBakeTable edits approved, tell CT Core) | clear at a clean point after the audit; sector-fixes parked (L c436f677, C abc24880, W 3f048e43) |
| Character Build (laptop, bridge:session_01Argkzi1eYdbWRrGaWyozTe) | test runner: #103 solo reruns, #92 (6d42d9ee), #99 (98ffe573), #105, #106; jammer-fixes (review items 1-4; item 5 withdrawn: IR stays everywhere) | - |
| Bays Cloud (cloud, one-way) | done: #92 rejoin, #99 server browser | - |
Open PRs: #92, #99, #103, #105, #106 (#67 parked for Michael). Protocol: #92, #99 and jammer-fixes all claim 27: the first merged keeps 27, the orchestrator renumbers the others (28, 29) at their merge (one constant + its test).

## Decisions to remember (also in ROADMAP Decided)
- Michael's bake: bake all as exported, widen only the tripped limits, each marked "Michael's 2026-10-22 tune".
- Cameras see in the dark everywhere (IR), Sector Ops included.
- Slice J: J2 seen = sent back, J3 join a jam approved; J4 (unjammable lamp) rejected.
- Security room everywhere with cameras except Sector Ops; lasers visible in night vision, alarm only.
- Every tuner slider must bake (anim-bake-all).
- Phones: tuner and Anim Studio only (exception to M21); game touch = menus + camera.

## Merge procedure
From train 6 (2026-10-22): use `scripts/merge-train.mjs` (PR #131; until it is on master, run it from
C:/NightShift/Mobile-Coop-merge-tools): `build <n> <branch>...` (src conflicts leave a branch out), the laptop's full
run, then `release <n> <version> "<title>"` (assembles changes/ fragments and legacy Unreleased blocks, versions,
opens the train PR, waits for CI, merges ONLY on a pass, tags, moves dev; exit 2 = CI failed, nothing merged).
`single <branch> <version> "<title>"` for a lone PR. `--dry-run` first when unsure. The manual steps below are the fallback.
2026-10-22 23:20 (#144 entered train 11 with its own PR CI already red, a voxelFit unit test; the train CI caught it 25 min later): before `build`, run `gh pr checks <n>` for every member; a red or missing check keeps the PR out.
2026-10-22 23:00 (#149 left out twice on docs/backlog.md): a conflict only in docs/** or *.md is not a reason to leave a PR out; the orchestrator resolves it in the train worktree (keep both sides), commits, and pushes train/<n>. merge-train.mjs still stops on it, so finish such a PR by hand after `build`.
Check the PR head equals the tested commit (or the delta is docs only). In the scratch worktree: checkout --detach the
branch, merge origin/master resolving only CHANGELOG / package conflicts (on any src conflict abort and send it back to
the job lead), npm version <v> --no-git-tag-version, rename the top "## Unreleased - <job>" heading to
"## <v> - <title> (<date>, PR #<n>)", commit "<v>: version at merge (G183)", push HEAD:<branch>, watch CI in the
background (gh run watch <id> --exit-status), gh pr merge <n> --merge, then tag v<v> and push <merge>:refs/heads/dev as
separate commands; update this file's Master line and the ROADMAP Done table.
Merge train (Michael 2026-10-22 ~11:25, CLAUDE.md test tiers): in the scratch worktree, `git checkout -B train/<n> origin/master`,
merge each ready PR head in order (CHANGELOG / package / PROTOCOL_VERSION conflicts resolved there; abort a PR on any
other src conflict), push train/<n>, run one full e2e on it (desktop lock or the laptop runner). On a pass (Michael
2026-10-22 "One PR per batch"): one commit on train/<n> sets the version (npm version, one CHANGELOG heading
"## <v> - Train <n>: <short list> (<date>, PR #<train PR>; #a, #b, ...)" with each member's entries under it), push,
open a PR train/<n> -> master listing the members, CI, gh pr merge --merge, tag, move dev once. The member PRs show as
merged because their heads are in master; close any that don't with a comment naming the train PR.
Train 1 merged as #111 (#99 + #108; #105 left on a real e2e-menus failure, fixed e8cdba4e). Train 2: #105 + #109
(f92747c4 contains #105) + #110 after #103 merges and #110 re-captures. CHANGELOG resolver: docs/orchestrator/cl-resolve.mjs
(`node <it> CHANGELOG.md`, incoming block first); drop stray "Unreleased - <job>" headings a member already released.

## Known
- 2026-10-22 21:30 (train 8 red): N1 #135 entered a train with a checker PASS although its e2e-anim never ran past jog 180 (the desktop run threw there) and e2e-clip read -2.9 cm. Rule from now: a PR enters a train only when every suite it touches ran to completion and passed on the GPU (a crash or timeout mid-suite is not a pass). The job lead lists them in the PR body; the orchestrator checks before each build.
- 2026-10-22 21:00: on Windows a "stopped" background runner can survive, wait on heavy.lock and run later (CT Core's N2 rerun took the lock 30 min after its stop). Stop runners with taskkill /T /F on the PID and confirm the tree is gone.
- 2026-10-22 ~17:30 (full burn load): the desktop sits at ~99% CPU with every session's agents; e2e-coop / e2e-netmove /
  e2e-ctcourse die at 600 s there. Rule until load drops: those three go to the laptop only; desktop e2e at JOBS=1 while
  agents run; GPU work stays on the desktop.
- e2e-netmove doorPeek fails on master-based branches until CT Core's remote-feet fix (e4d85253, on ct-prototype)
  reaches master with the anim-rework PR: count it as known.
- Co-op suites time out under load; accept a full run where the load failures pass solo on the same commit (test-speed
  fixes this).
- The co-op client never draws guards' flashlights (torch state not on the wire): later, a protocol bump.

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- ALWAYS state the session title, the model and the effort next to every prompt you give Michael (Michael 2026-10-20 18:30: "You should be showing me exactly which model and effort alongside any prompt, make sure you always do that."). One prompt at a time; he does not remember earlier ones.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, reviewed PRs without asking (CLAUDE.md, and his 23:55 / 08:45 go-aheads). If auto mode blocks a merge,
  ask him in chat for permission.
- Never trace CT animation frame by frame (IP; he accepted pose matching, then dropped CT references for movement).
- Start new sessions only from his own words in the desktop app; a session cannot start one from a peer message. When the app refuses a start (an answer from a question dialog does not count as his words), propose a card (own_initiative) and tell him to click it.
- A paste-in prompt is the turn's LAST message, never paired with a question dialog in the same turn.
- Check the usage meter (mcp__ccd_session_mgmt__get_usage) when pacing.
- 2026-10-22 ~17:55 (Michael: "if the desktop is a problem, why haven't you mentioned it? These issues keep happening -
  you should take initiative to identify bottlenecks and make recommendations"): I saw the desktop timeouts all afternoon
  and fixed each run instead of questioning the machine split (the batching mistake again). Every cron check now names
  the longest wait of the last period and its cause; when the cause is a rule or a setup choice (machine, port, tier,
  model, tooling), bring Michael a concrete change with the time it saves, unasked.
- 2026-10-22 ~18:05 (Michael): "Do not let these bottlenecks compound. You are the orchestrator. Any issues or patterns
  causing failures/delays/problems should be identified by you and fixed. If you need my input you can ask, so long as
  it's not an overnight session where a question prevents progress as I won't respond." So: fix patterns myself
  (rules, routing, tooling, assigning fix jobs); ask him only by day and only when his answer changes the outcome;
  overnight, decide, log the assumption, carry on.
- 2026-10-22 ~20:25 (Michael, after the software-GL rule cost ~20 min per full run all day): "Make sure you question rules and ask me if needed, you should be picking up these things earlier". Each cron check asks of the slowest step: which rule or setup makes it slow, when was that rule last measured, and what would a cheaper one cost? Bring him the measurement and a proposal the same check.
- Bottlenecks (Michael 2026-10-22 ~10:45: "You must review constantly for bottlenecks and advise if there's more efficient ways to progress"): every cron check also reviews idle sessions, the laptop queue, the desktop lock and waiting PRs; fix what is in my authority, advise Michael on the rest. The cron prompt carries this. Michael (~11:45) asked why batching was not proposed earlier: I treated CLAUDE.md's test and merge rules as fixed and only optimised inside them. The review now also questions the rules: where work waited longest, which rule caused it, and a cheaper rule to propose.
- 10:45: Menu Notes cleared after N0 pass 1 (resume: C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md, plus N3 draw-time research). Course Ready got clip-speed (baked per-clip speed slider). CT Core got the N1 / N2 findings and the SWAY_MAX lift. Laptop order: #92 solo ctcourse, #103 solos, #106 (studio + anim), #107 (coop x2), #105 full, #99 full, #108 full.

## Now (19:00)
- 23:00: train 11 = train/11 d4290357 (#144 R, #150 gpu-waits, #154 netmove-compare) queued for the laptop full run; #149 left out twice on docs/backlog.md (Character Build re-merges). Michael chose "Mocap, as captured" (ROADMAP Decided). 5-hour 15% at 22:59 (~0.7%/min, 100% about 01:00), weekly 3%. Course Ready free: lightField heap check, then mocap checker.
- 22:50: 4.60.0 released (train 10 #153). Orchestrator cleared ~22:50, cron 17/37/57 recreated; 5-hour 6% at 22:58 (resets 03:30), weekly 1% (resets 04:00). Desktop CPU 100%, both desktop locks Course Ready's (netmove-compare, R): Menu Notes' vol-cone-fix shots moved to the laptop main slot (4189, before 533a1f30 running), mocap-sheets on laptop 4192 (feature/mocap-sheets-real 8cb4d26c; videos via laptop ffmpeg 9.0.2, installed on Michael's direct OK). #138 failed 2/6 GPU (e2e-anim walk knees 3.5 cm, e2e-clip crouched holstered -3.0 cm): CT Core fix round. Mocap-trial master-merged 82f43716, fix round on the checker's CHECK.md.
- 22:45: usage reset by Michael (5-hour 0%). Clears: CT Core and Menu Notes cleared and resumed from their resume files; Course Ready (26% context) and Character Build kept running; orchestrator cleared last. Live: train 10 train/10 0c6bf0bd (#142 n4d, #145 lamp gap) on the laptop (JOBS=3, ns-chain-1022aa); #138 N2 six GPU suites (detached, /c/NightShift/n138-e2e.out) then train 8 (#119 e957db2f + #138); mocap-trial FIX round (CT Core); Course Ready: netmove-compare, #144 R and #150 master merges -> train 11 with #149 (1afdcd54); Menu Notes: vol-cone-fix (#152 sector-look notes), mocap-sheets. HANDOFF.md "State at the switch" has the detail.
- 21:35: swap back prepared (HANDOFF.md "State at the switch ~22:00": train 9 on the laptop, train 8 red and being fixed, mocap-trial, n4d, R, rules). 5-hour 65% at 21:27, ~0.9%/min: 98% about 22:04. All sessions told to save by 98%; Menu Notes saved (RESUME 3490966a, n4d 018e3c77).
- 19:30: account swap live (other account; HANDOFF.md). Train 6 done (all members merged), train 7 = train/7 9ff4542d (#132, #134) waits on the laptop full run. Usage 5-hour 0% (resets 00:20), weekly 0% (resets 2026-10-23 04:00). Cron 17/37/57 recreated. Prompts going out: CT Core, Menu Notes, Course Ready, Character Build. Swap back when this window reaches ~98%.
- 19:45: train 7 run died at ~19:32 with the old account (15/17 ok; ctcourse:1/:2 openPage timeout "walk URL: host and client on Marlow Yard"); rerun r2 started 19:35 alone on 4192, verdict ~20:15 (ctcourse solo reruns if they fail again). Chain-1022n dead, not relaunched. Michael (~19:45) chose "Yes, queue them": after train 7 the laptop runs job area suites one request at a time (P 66995a22 first, then R, N2); GPU experiment, GPU audit, test-speed-2 still off.
- 19:45: train 7 moved to the tuner / Anim Studio tier (its only src change is src/anim/studio.ts + src/game/studioStage.ts): r2 full run stopped; e2e-studio, e2e-anim, e2e-tuner-phone, then ctcourse:1 / :2 solo (ctcourse:1 failed once, passed once at JOBS=3). Laptop: one slot only (Michael: "I don't think it has capacity for a second slot. It's running very slow"); full runs at E2E_JOBS=2 from now (no orphans found; the JOBS=3 run itself was the load). Stale heavy.lock deleted on Michael's word. #119 N4b merged with 4.57.0 (c22b6719): train 8. #136 P open (checker PASS): train 8 after its area suites. Slice S done by #115. Menu Notes: feature/anim-n4c (N4 look notes). Added load: 5-hour 5% at 19:42 projected ~70%.
- 20:05: 4.58.0 released (train 7 #137). Michael: "I dont mind using all 5 hour token usage quickly, so long as desktop/laptop performance is maintained." Desktop was idle (CPU 5%, no node / chrome), so it is a test lane again: job leads run their own area suites under the atomic heavy.lock (4191, E2E_JOBS=2, coop / netmove / ctcourse included) when CPU is under ~60% at the start; the laptop takes P, then train 8's full run (JOBS=2), and only overflow. Sessions may run up to 3 parallel agents. Spare jobs: T1 keyboard vent kick (CT Core after the N2 PR), test-speed-2 code (Character Build, no laptop timing runs beside a run). 5-hour 18% at 20:04.
- 20:15: test-speed-2 finding: the laptop GPU full run (E2E_GPU=1, JOBS=3, 79216e49) took 585 s wall vs 2025 s software (3.4x; menus 54 vs 865 s, pad 31 vs 731 s). Wait cuts save at most 1-2 min, because the time goes to software-GL rendering. Approved trial: after P, a GPU full run at JOBS=2 on 4.58.0 00d7a653. If it is green (or its failures also fail in software), GPU becomes the laptop default for logic e2e and train 8 runs on it; CI stays software GL; GPU-only failures are rerun in software and fixed as test bugs. Then update CLAUDE.md "Main test machine" / test tiers.
- 20:25 (Michael: "Why haven't we already been using gpu instead of software for testing?"): the software-GL rule came from CI / cloud parity and "GPU is Michael's PC only"; nobody re-measured it. Also try the desktop GPU: when the desktop lock is free, time one suite (e2e-menus or e2e-coop) with E2E_GPU=1 vs software on the same commit; if faster and green, the desktop lane goes GPU too. Then CLAUDE.md: logic e2e on GPU on both machines, software as the rerun check for GPU-only failures; CI unchanged.
- 19:00: 5-hour 94% rising ~0.6%/min (reset 21:10), weekly 34%. All sessions told: no new agent, save at 98%, stop by 99% (CT Core overflow to 100%). After the reset, resume CT Core first, then Menu Notes, Course Ready, Character Build.
- 19:00: train 6 passed on the laptop (full 33/35, the 2 load timeouts and lightbake GPU passed solo). Releasing as 4.57.0 with merge-train.mjs from Mobile-Coop-phone-native (CI run 39744259308 on 54b92b62). Then: ROADMAP Done row, Master line.
- Train 7 (next, build right after train 6 merges): #119 (aee3fd34), #132 N0 leftovers (docs + scripts), #134 studio-pairs (c30d3391), + N1 if its PR is open. Laptop runs it first on 4192 as the only full run. Train 8: N2 (run arm pop fix inside), sector-fixes R (area suites first: coopClient.ts), P.
- 19:10: Course Ready and Menu Notes saved and paused at 98%. P pass 1 = feature/sector-fixes-p db839845 (unchecked; panels in 4 warehouse spots + Marlow station 4; A1 beams no longer jam targets; A2 PROTOCOL_VERSION 28 -> 29, the only claim on 29). Its area suites are queued on the laptop; after the reset: checker, PR, train 8.
- 18:45: orchestrator cleared and resumed; cron 17/37/57 recreated. 5-hour 83% (resets 21:10), weekly 32%. Contexts: CT Core 28%, Course Ready 23%, Menu Notes 15%. Laptop chain: train/6 full on 4192 alone -> lightbake GPU solo -> studio-pairs audit -> GPU full run on master -> test-speed-2.
- 18:50: sector-fixes R built (feature/sector-fixes-r e0e50027; 6 co-op routes, 3 team doors, coopClient.ts change; A3: downed on a co-op-only top respawns at the checkpoint). Told Course Ready: checker, then only e2e-coop / netmove / sectorops on the laptop, PR, train 7 (no separate full run).
- 18:55: Menu Notes N0 leftovers done (feature/anim-natural 81102f93, scripts + docs): PR -> train 7. N4 look notes: hand swaps swing the rifle muzzle-up over the shoulder; elbow strike arm-only. Menu Notes next: sector-fixes P in Mobile-Coop-sector-fixes-p.
- 19:00: CT Core N2 step 3 arms (feature/anim-natural-n2-s3 4e974ea1). Told: fix the run arm 22 cm one-frame pop inside N2; laptop area suites only; N1 / N2 PRs into train 7.
- Train 6 = train/6 6551afe9 (#122, #123, #127, #128, #129, #131, feature/menu docs): full e2e on the laptop (4192); GPU lightbake solo rerun queued. On a pass: `node C:/NightShift/Mobile-Coop-merge-tools/scripts/merge-train.mjs release 6 4.57.0 "<title>"` from C:/NightShift/Mobile-Coop-phone-native (merges only on green CI).
- Train 7 lead: #119 (aee3fd34); then N1, N2 (CT Core), studio-pairs (Course Ready), sector-fixes R (Course Ready), P (Menu Notes).
- Laptop experiments queued after train 6, one full run at a time: GPU full run on master with E2E_GPU=1 (if faster and green, make GPU the laptop default for logic e2e; CI keeps software GL), then test-speed-2 timings.
- Bridge address of Character Build: bridge:session_01HVFKDvRCTbTDNhJKQP1oaa (check ListAgents after a reconnect).
- Weekly ~32% at 18:40; at this pace it runs out about midday 2026-10-23; at weekly ~98% follow HANDOFF.md.

## Resume prompt
```
Night Shift | Orchestrator (after a clear). Resume from docs/orchestrator/STATE.md ("Now" top entry) and docs/orchestrator/HANDOFF.md "State at the switch" on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" (newest on feature/menu, incl. "GPU for logic e2e") and docs/ROADMAP.md. Recreate the usage and bottleneck cron (17, 37, 57 past) with the prompt in STATE "Cron prompt", and check get_usage now. Then carry on: train 10 verdict and release, train 8 when #138 passes, train 11 (#144, #150, #149), the mocap side-by-side for Michael, bottlenecks and rules (STATE "How Michael works"). Trains are built and released from C:/NightShift/Mobile-Coop-train with scripts/merge-train.mjs. Short replies, native multiple choice only, hyphens not em dashes.
```

## Cron prompt
```
Night Shift | Orchestrator usage and bottleneck check (FULL BURN; Michael 22:15: "dont try save tokens, i will reset usage as soon as you hit 100%": no early stops, every session to 100%). 1) get_usage: 5-hour and weekly; keep HANDOFF.md current (it is the resume point at 100%). 2) RESUME: if the 5-hour window reset since sessions paused, message every session (CT Core first, Menu Notes, Course Ready, Character Build) to resume from its STATE. 3) FILL: if the window will end under ~97%, add load (parallel agents, spare jobs from the roadmap), while desktop CPU stays usable. 4) CONTEXT: get_usage per desktop session; at ~40% tell it to save and refresh its resume prompt at its next clean point, then give Michael the clear plus its paste-in prompt with title, model and effort. 5) Weekly ~98%: pause, save, hand off via HANDOFF.md. 6) Bottlenecks AND RULES (Michael 20:25: "Make sure you question rules and ask me if needed, you should be picking up these things earlier"): name the longest wait since the last check and its cause; name the rule or setup choice behind it (machine, GL mode, port, tier, JOBS, model, tooling), when it was last measured, and what a cheaper rule would cost; fix it if in my authority, else bring Michael the numbers and a proposal now (by day). Check desktop CPU, the laptop queue and the laptop 3-browser + second-slot trial (keep only if times within ~15%, no new load failures, CPU under ~90%). Never leave a question dialog open overnight. Short reply, hyphens not em dashes; one line if nothing changed.
```
