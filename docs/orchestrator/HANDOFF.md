# Account handoff

Michael (2026-10-22 ~19:15): "Now, swap back once the next 5h limit is reached on the other account". 22:15: "dont try
save tokens, i will reset usage as soon as you hit 100%": sessions run to 100% (no early stops); at 100% Michael resets
(the swap back to the first account) and pastes the orchestrator prompt below.
Repeat as long as it pays. Earlier handoffs (2026-10-21, 2026-10-22 13:10, 19:25) are in git history.

## State at the switch (refreshed 2026-10-23 ~07:58 for the next swap; newest update block first)
New account live 2026-10-23 ~00:57 (5-hour 0%, resets 05:50); all four sessions resumed ~01:05; full burn to 100% (Michael 01:05). See STATE "Now" top entry for the live state.

**08:12 (swap point, ~97% at ~08:20).**
Train 20 candidates: #185 guard-ai S2 (master merged c8906e22), #186 throw-ko (CT Core spare #3; e2e-ctcourse still to run). CT Core WIP: mocap-on 7144a03c, mt2-guardgate a2ac66b7, partner-seed f289fd29; mocap-strafe and traverse-fix in local worktrees (not pushed). Saved: Character Build, Menu Notes, Guard AI, CT Core. Master v4.67.0 (train 18 #183 = #182 mocap batch 1 default off + #177 camera-range, 6c9b28d4). Train 19 = origin/train/19 51a084f9 (#180 guard-cap report + #184 sector-redesign part 1, protocol 31) on the laptop full run: release 4.68.0 on a pass. #185 guard-ai S2 conflicts with master (Guard AI merging), train 20. In flight: CT Core mocap-on PR (CHECK-6 FIX: gate mocap to the player / partner carrier, e2e-anim M1 notes), spare #8 traverse-fix; Menu Notes sets A2+ (full burn, up to 5 agents); Course Ready slices 2, 3, E1 keypads, E3 pair doors, E4 isolator; Guard AI S3 radio; Character Build guard-render S1 (mesh merge; answers in its BRIEF), train 19. Character Build reconnected ~07:50 (the 04:58 drop was not the laptop or the usage cap).

**04:58: Character Build (laptop) unreachable (bridge HTTP 409, dropped off ListAgents). Morning for Michael: restart Night Shift | Character Build on the laptop (HANDOFF section 5 prompt) and check its last runs in C:/NightShift/scratch/runs. Until then job leads run their own GPU suites on the desktop lanes (heavy.lock 4191 / heavy2.lock 4192, E2E_JOBS=1, CPU under ~60%).**

**04:34:** 81%, on pace (0.15%/min) for ~99% at the 06:40 reset. 4.66.0 out (train 17 #181 guard-ai S1). Active: CT Core only (mocap-trial-2 Opus rounds A / B / C after checker FIX: 53/188 CT-driven plans; default ON waits for the re-check). Paused to the reset: Menu Notes (next: client wall-switch press never reaches the host in Course mode, a co-op light bug; A2), Course Ready (e2e-sectorops:2 regression, #177 pad light, same client-switch check), Guard AI (S2 light pair never stands down), guard-render step 1. At the reset resume all (CT Core, Menu Notes, Course Ready, Guard AI, Character Build).

**Update 2026-10-23 ~03:21 (window since ~01:40 reset, resets 06:40; 62%, ~0.3-0.4%/min vs 0.19 pace; weekly 11%).**
Master v4.65.0 (train 16 #178, 4fb8ea80). Train 17 = origin/train/17 7fb372a9 (#179 guard-ai S1) waits on the laptop
full run; #177 camera-range held (pad light 1.00 -> 0.60 / 0.84 to explain first, Course Ready). Paused for pace:
Course Ready (sector-redesign; e2e-sectorops:2 team-door nav regression to fix first), Guard AI (after S2), guard-render
step 1 (Character Build, new job from guard-cap #180: render-bound, 12 visible awake guards 27 fps at Epic). Running:
CT Core mocap-trial-2 da86e8e7 batch 1 (checker + six GPU suites, then default ON in this PR; strafe / wall -> mocap-trial-3),
Menu Notes marlow-final slice 0 complete 153db3e8, slice 1 (A1) on Sonnet. Contexts: Menu Notes 40% (clear in the
morning, resume block in docs/marlow-final/STATE.md), CT Core 33%, orchestrator 34%. JOBS=5 only while 4192 is idle.

**Update 2026-10-23 ~01:33 (5-hour 73%, ~2.2%/min, 100% about 01:45; weekly 13%).** After Michael's reset: phase B, paced
windows (STATE "Pacing" 01:12; cron 17/37/57 carries it). Master v4.64.0 (train 15 #167 = #159 mocap, ffade187; dev
moved). JOBS back to 3 after train 15's JOBS=5 coop miss (fixed test-only in #170; JOBS=5 trial on the master after it).
- Train 16 (build when CI green, from C:/NightShift/Mobile-Coop-train): #168 decisions G276-G281 (docs, CI pass), #169
  g44-above (laptop GPU suites green, CI pending), #170 load-audit (test-only, CI pending), then the Character Build
  test-only PRs #171 net (contains #170), #172 ui1, #173 ui2 (+ GPU governor check), #174 coop (contains #170), #175
  chores (on #170). Full run on the laptop at JOBS=3 after the guard-cap run; release as 4.65.0 (minor: #169).
- New tonight (Michael 01:08-01:37, ROADMAP Decided): Sector Ops redesign = job sector-redesign (Course Ready lead;
  research campus "Saltmarsh Park", 5 sections 8 / 12 / 16 / 20 / 24 guards, 30-45 min, dogs; protocol 31 for Sector
  light sync; r2 folded in; Course Ready dropped the marlow-final builder role and the mocap checker). Guard AI = job
  guard-ai, NEW session Night Shift | Guard AI Build (prompt in section 6 below; Michael was given it ~01:40; owns src/ai/*;
  protocol 32 if needed). Cameras keep IR (G240). All guards armed on every map. Warehouse kept beside the new map. Mocap
  on by default once mocap-trial-2 + new clips pass the checker. Camera-range cut and lighting review for all maps
  (proposal docs/lighting-review/PROPOSAL.md on feature/marlow-final; Course Ready's camera-range branch).
- marlow-final (Menu Notes, builds alone): SPEC + PLAN done (8 sets A1-A8, proposals P1-P17 for Michael), slice 0 in
  parts 0a-0g running, protocol 30 taken.
- mocap-trial-2 (CT Core): 6 agents (pops 1-3, run turn, fix2, crouch clip 136_09); sprint / strafe / wall next; CT Core
  runs the fresh checker (C:/NightShift/scratch/mt-check/CHECK3-BRIEF.md).
- Character Build: guard-cap on the laptop GPU next (Course Ready needs it for 24 guards), then train 16.
- At 99% (~01:52): CT Core mocap-trial-2 a72668c7 (pop2 in, five agents finishing); Course Ready sector-redesign slice 0 b0b7bc24 (checker + laptop suites owed), slice L + camera-range agents pushing; Menu Notes marlow-final slice 0 1949764e on the laptop; train 16 BUILT 45c9ebf0 (all nine members), full run on the laptop at JOBS=3, release 4.65.0 on a pass. Rules after the reset: Lean windows (ROADMAP Decided 01:45), unavoidable guards (01:50). Clear Course Ready after the reset (Michael has its prompt).
- Orchestrator docs: docs/orchestrator/spare-jobs.md (ranked), marlow-coop-gaps.md, MORNING-WALK.md (refresh before
  Michael wakes).
Master v4.63.0 (train 13 #164 = #144 + #161 + #162, 102e6f41; /preview/ = dev = 102e6f41). 4.62.0 = train 12 #160 (#119 N4b + #158). Tonight: 4.60.0 #153 (train 10),
4.60.1 #155 (train 11), 4.61.0 #157 (train 8: #138 N2 + #135 N1 + #156 strip-light fix), 4.62.0 #160 (train 12).

Rules (CLAUDE.md on feature/menu; STATE "Merge procedure" / "Known"): every e2e E2E_GPU=1; laptop full runs and trains
at JOBS=5 (Michael 00:10 "Yes, if clean"; back to 3 on the first JOBS=5 failure) + a second single-suite slot on 4192;
desktop e2e only when CPU < ~60% at the start, else the laptop (Michael 00:25: "push as hard as possible without causing
failures"). Before a train build: `gh pr checks <n>` green for every member. Docs-only conflicts are resolved in the train
by the orchestrator. A load-only failure that passes solo on the same commit counts as known. Trains: merge-train.mjs from
C:/NightShift/Mobile-Coop-train. CLAUDE.md now allows CMU mocap takes (credited in docs/art-credits.md).

Train 13 RELEASED as 4.63.0 (#164). Load-latent medium fixes planned: docs/orchestrator/load-latent-mediums.md (for Character Build after load-audit). Train 14 RELEASED as 4.63.1 (a71c8c02, dev moved; add its ROADMAP Done row: #163 + #165). Train 15 BUILT (see train/15 head) for the laptop task. Mocap merge review (f4b5b7c1): OFF identical to master, no lost hunks; for mocap-trial-2: (medium) footPlanner.ts:1074 turnOver still counts the ball-pivot budget and :690-699 twistCap still anchors / heel-lifts clip-planted feet, so they yaw-scrub about the ankle (fix: left = 0 and skip that branch when f.clipPlant && i.clipFeet); (low) characterRig.ts:1911 also require clipFeet on the input; footPlanner.ts:740 split the two statements; characterRig.ts:2892-2898 move the elbowOutK field above keyedArm's JSDoc. Two orchestrator research agents (Marlow co-op engine gaps, load-latent mediums plan) may not have reported before the swap: rerun them if their findings are not in STATE. Train 14 (#163 lightfield-heap + #165 e2e-start-order, tests only) releasing as 4.63.1 at the save (log C:/NightShift/scratch/runs/release-train14.log; check it merged). Train 15 = #159 mocap-trial f4b5b7c1 (CI green, six GPU suites pass, review fixes 1 / 2 / 6 in): build it on master after 4.63.1 (`merge-train.mjs build 15 feature/mocap-trial`); the laptop task ns-chain-1022ap starts its full run as soon as origin/train/15 appears; verdict in C:/NightShift/scratch/runs/train15-<sha>/ on the laptop (Character Build reports it). Release 4.64.0 on a pass. An orchestrator review of the merge (d10d68f2) was still running at the save; rerun it if no report. load-audit (Character Build): review found 2 blockers (e2e-move sidePace can hang: no wall cap; e2e-ctcourse station 3 / 4 windows shrink up to 4x) + 2 fixes (coop allowTeleport per frame, desktop crash null unchecked); stress pass 1 green.
requested (JOBS=5). On a pass: `node scripts/merge-train.mjs release 13 4.63.0 "Sector Ops co-op routes and team doors, fence
rattle test, decisions G270-G275"` from C:/NightShift/Mobile-Coop-train. If e2e-desktop:1 or e2e-move fail, they are the
known load-audit pair (solo rerun). Pending review of #144 / #161 (orchestrator agent) - read its findings if it reported.

Open work (each job's resume file has the detail):
- CT Core: #159 mocap-trial (089259be) conflicts with 4.61.0; Opus merge agent running. Fix WITH the merge (orchestrator
  review): N2 bodyMotion / scaleKeyedArms gated by mocapLayerK; N1 turn rules clipFeet-gated; characterRig.ts:1910 pitch
  limit per rig, not global; art-credits CMU entry. Then six GPU suites -> train 14. Then feature/mocap-trial-2: residual
  pops 1-3 (Course Ready CHECK-2), review 3 / 4 / 5 / 8, turn-offset test sweep. Then more clips: crouch walk, sprint,
  strafe, back-to-wall (Michael 00:15 "Yes, download them": named CMU takes, one at a time, SOURCES.md). No sheets.
  Resume: docs/orchestrator/resume-ct-core.md on feature/menu.
- Menu Notes: marlow-final lead (feature/marlow-final, C:/NightShift/Mobile-Coop-marlow-final; BRIEF M1-M5). Step 1
  parallel agents (audit, exercises, route, constraints) -> SPEC.md + PLAN.md, then greybox slices, then dressing straight
  after each slice (luxury training facility, instructor gallery behind glass, LED strips, sliding doors; lighting
  sufficient; rule loosenings proposed, not applied; no explainer pads, objective list guides). Resume:
  docs/anim-natural/RESUME-menu-notes.md on feature/anim-natural.
- Course Ready: feature/sector-fixes-r2 from 4.63.0 (Michael ~00:45 "true 2-player pathways that cannot be used solo, but doesnt break solo play"; plus bolted-door nav blockers, unbolt side cap, solo-jump probe) as four agent branches r2-nav / r2-bolt / r2-jump / r2-paths, then one GPU run, checker, PR; then marlow-final second builder; mocap-trial-2 checker. Resume: docs/marlow-bays/RESUME-trackA.md.
  Menu Notes), then second builder on marlow-final slices; checker for mocap-trial-2. Resume: docs/marlow-bays/RESUME-trackA.md.
- Character Build: train 13 run; load-audit (feature/load-audit: e2e-desktop:1 crash-page hang fix 7d4dbc5f, e2e-move
  game-time windows; PR when proven under load); guard-cap measure (report only, docs/guard-cap/REPORT.md).
  Resume: docs/flake-fix/STATE.md on feature/flake-fix.
Michael's answers tonight: ROADMAP "Decided" (top entries) and DECISIONS G270-G275 (#162, in train 13).

## In the new account
Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
orchestrator prompt into a new session. The new orchestrator gives each next prompt with its session title, model and
effort, one per message, as the last thing in that message. Sessions are new: each prompt stands alone. Swapping back
uses the same table and prompts.

| Order | Session title | Model | Effort | Where |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| 2 | Night Shift \| CT Core Build | Opus 5.5 | high | desktop |
| 3 | Night Shift \| Menu Notes Build | Opus 5.5 | high | desktop |
| 4 | Night Shift \| Course Ready Build | Opus 5.5 | medium | desktop |
| 5 | Night Shift \| Character Build | Opus 5.5 | medium | laptop (Remote Control) |
| 6 | Night Shift \| Guard AI Build | Opus 5.5 | high | desktop |

### 1. Orchestrator
```
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md "State at the switch" (newest update block first) and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md (top "Decided" entries are Michael's words from 2026-10-23). First: check C:/NightShift/heavy.lock and heavy2.lock (a lock with no live node process is stale; ask Michael to delete it), open trains (origin/train/18 = #177 camera-range + #182 mocap batch 1: full GPU run, then `node scripts/merge-train.mjs release 18 4.67.0 "<title>"` from C:/NightShift/Mobile-Coop-train). Then give Michael each session's prompt from HANDOFF "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the cron with the prompt in STATE "Cron prompt" and check get_usage now. Pacing: STATE "Pacing" top entry (lean windows to 99%, Opus plans / checks, Sonnet builds from strict briefs) unless Michael says full burn. Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). State: #182 mocap-trial-2 batch 1 (default OFF) is in train 18; round F (foot-contact pin for clip plants, option a) on feature/mt2-fixF, then the ON-by-default flip in its own PR (Michael: "On by default" once it passes); then mocap-trial-3 (strafe, back-to-wall: a sideways cycle). Spare jobs: docs/orchestrator/spare-jobs.md #2 / #3 / #8 / #16. Every e2e run is E2E_GPU=1 (laptop via Character Build when it is up, else the desktop lanes under heavy.lock / heavy2.lock). Opus plans and checks; Sonnet 5.5 builds from strict briefs. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": marlow-final M1-M6, Overnight, Lean windows), then follow the resume prompt in the last fenced block of docs/marlow-final/STATE.md on origin/feature/marlow-final (git fetch; worktree C:/NightShift/Mobile-Coop-marlow-final). Job: marlow-final lead, building alone (slice 0 done; sets A1-A8 next, dressing straight after each; proposals P1-P17 and LR1-LR12 applied and listed in STATE "MORNING-REVIEW"). One PR to master when slice 9 passes (Michael: "Merge to master"). Every e2e run is E2E_GPU=1. Opus plans and checks; Sonnet 5.5 builds sets from strict briefs. Message "Night Shift | Orchestrator" at each slice and the PR.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": Sector Ops redesign 01:08-01:25, unavoidable guards 01:50), then follow the resume prompt in the last fenced block of docs/sector-redesign/STATE.md on origin/feature/sector-redesign (git fetch). Job: sector-redesign lead (campusOps research campus, 5 sections; slices 0, L, 1 done; sections 4-5 wait on guard-render for 20 / 24 guards; the Warehouse stays selectable). Every e2e run is E2E_GPU=1. Opus plans and checks; Sonnet 5.5 builds sections from strict briefs. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (account swap, laptop, the test runner). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"; JOBS=5 only while the second slot is idle, else 3), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch). The last session dropped ~04:58: check C:/NightShift/scratch/runs for unfinished runs first. Jobs: test runner for every session (GPU, 4189 main + 4192 second slot, one full run at a time), and guard-render (new, Michael's 24 guards per section; guard-cap #180: render-bound, 12 visible awake guards 27 fps at Epic): an Opus report + PLAN (mesh merge, distance LOD, dormant / culled off-screen guards, anim cost) in docs/guard-render/, then build per the plan. Message "Night Shift | Orchestrator" with trains, guard-render slices and any failure; send other verdicts to the job lead directly.
```

### 6. Guard AI Build
```
Night Shift | Guard AI Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": Guard AI 01:30 / 01:35 / 01:37, unavoidable guards 01:50), then follow the resume prompt in the last fenced block of docs/guard-ai/STATE.md on origin/feature/guard-ai (git fetch; worktree C:/NightShift/Mobile-Coop-guard-ai). Job: guard-ai lead (behaviour in src/ai/*, all maps; S1 merged in 4.66.0; S2 incident board in its fix round; then S3-S10 per docs/guard-ai/PLAN.md, each slice its own PR). Every e2e run is E2E_GPU=1. AI behaviour code stays Opus; Sonnet 5.5 for tests and data from strict briefs. Message "Night Shift | Orchestrator" at each slice and PR.
```
