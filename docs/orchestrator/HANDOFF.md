# Account handoff

Michael (2026-10-22 ~19:15): "Now, swap back once the next 5h limit is reached on the other account". 22:15: "dont try
save tokens, i will reset usage as soon as you hit 100%": sessions run to 100% (no early stops); at 100% Michael resets
(the swap back to the first account) and pastes the orchestrator prompt below.
Repeat as long as it pays. Earlier handoffs (2026-10-21, 2026-10-22 13:10, 19:25) are in git history.

## State at the switch (refreshed 2026-10-23 ~07:58 for the next swap; newest update block first)
New account live 2026-10-23 ~00:57 (5-hour 0%, resets 05:50); all four sessions resumed ~01:05; full burn to 100% (Michael 01:05). See STATE "Now" top entry for the live state.

**~10:52: 92%, sessions keep working to 99% (saved already). Laptop runs headless through the swap: chain-1023p.ps1 then chain-1023q.ps1 (logs runs/chain-1023p.log / -q.log, ~1 h 15 min: marlow baseline, sectorops:6 3796700d, Guard AI 62884858, hang-down 4072e2b9, guard-render S6 guard-cap, Menu Notes perf after + shots). Train 22 sha jumps that queue: send it to Character Build. guard-render S1 saves ~3 ms a frame at 24 guards.** **~10:35 efficiency fixes for the next orchestrator (apply at the resume): (1) desktop heavy.lock is taken per suite run, never held across a fix loop (Menu Notes held it 09:51-10:33+ for e2e-fix while heavy2 queued); (2) laptop: guard-cap measures that need 4189 ALONE run only when no train is queued, trains first; (3) merge-train.mjs build: drop changes/ fragment entries already in CHANGELOG.md (train 21 kept the released S2 entry), a Haiku chore; (4) Character Build: close the duplicate laptop session (two in ListAgents); (5) e2e-stealth-ai bodies is timing-sensitive (Guard AI diagnostic 8094c5b1): fix the test, not reruns.** **~10:35: ALL FIVE SAVED (CT Core e5b447c3, Menu Notes 4a8945f4, Course Ready 92ece78c, Guard AI c2d27d82, Character Build 256ea351 + guard-render S1 f1bdb3ba). Michael ~10:40: full detail-art lift of campus "as efficiently as possible" (ROADMAP Decided + Next: campus detail art); Course Ready plans it after S4 / S5 greybox.** **~10:30: 98% save sent (80% at 10:28, 98% ~10:43). Guard AI SAVED c2d27d82 (S4-S7 chain not train-ready: stealth-ai bodies, diagnostic 8094c5b1). Prompts below refreshed. Michael decisions ~10:10-10:25 in ROADMAP Decided (stealth over shooting, ammo crate, Sector Ops 4 players after redesign).**

**~10:06: 4.70.0 RELEASED (train 21 #197, 8e5dbd83; dev moved; laptop 39/39 616 s). Train 22 = #193 S4 -> #195 S5 -> #196 S7 (after the chain tip laptop GPU run) + #194 hostage-gait (ready). CT Core hang-down in a fix round (batch PR).**

**~09:44: 4.69.0 RELEASED (train 20 #192, 8d2ce6ed; dev moved). Train 21 = origin/train/21 b5895388 (feature/menu docs + #189 + #190 + #191; S2 fragment dup dropped) on the laptop 4189 full run; release 4.70.0 on a pass. Train 22 candidates: guard-ai #193 S4 -> S5 -> S7 (stacked, one train), #194 hostage-gait (after laptop coop + netmove). Token rules applied (CLAUDE.md, ROADMAP Decided 09:40), all five sessions told. Swap at 99%.**

**~09:30: swap back live (5-hour 0%, resets 14:30; weekly 0%, resets 2026-10-24 15:00). Locks clear, no node. Cron 7/27/47 recreated. Train 20 lightbake verdict not in yet (Character Build not resumed); release 4.69.0 when it reports a pass, then train 21. Prompts going out: CT Core, Menu Notes, Course Ready, Character Build, Guard AI.**

**~09:55: ALL FIVE SAVED** (CT Core resume acea433f; Menu Notes 227a402b; Course Ready 4b8d6048; Guard AI 99eb1349 + s4 fd3a0018 / s5 80efb8b4 / s7 38345438 / s8 2d3dfc51 WIP; Character Build 9303f363). New rules: CLAUDE.md "Heavy-usage throughput" (Michael 09:50). guard-render S1 e2e GREEN on 70470c30 (head 668d623d adds a dispose fix); next guard-cap merge on vs off, then its PR. **~09:40 save for the swap (Michael: saved by 98%).** Character Build SAVED (flake-fix 9303f363, guard-render 668d623d). Train 20 lightbake solo reruns (runs/train20-cbff3050-lightbake, -lightbake2) run through the swap: get the verdict from Character Build, then release 4.69.0. Laptop verdicts: sector-redesign 4def7d24 all PASS except e2e-sectorops:6 (S3 guard count 16, three S3 route legs with no nav path); marlow-final 45458bbc ctcourse :1 / :2 / :3 FAIL (A1 variant host y 2.52; A3 relay jam / a3-far1 timeouts, solo too; A6 light parity host 0.524 vs client 0.188), :4 coop netmove course PASS. Laptop queue: 4189 lightbake x2 -> guard-ai S7 -> hostage-gait; 4192 guard-render S1 -> guard-ai S5 -> sector-redesign 22e755bf; guard-ai S4 not yet requested.

**09:12 (5-hour 65%, ~1.8%/min, 100% ~09:30; weekly 11%).** Full burn (Michael 09:00, ROADMAP Decided). Master 4.68.0. Train 20 = origin/train/20 cbff3050 (#185 guard-ai S2 + #186 throw-ko + #188 mocap ON default): laptop full GPU 38/39, only e2e-lightbake (known load flake) failed; solo reruns x2 on 4189; on a pass `node scripts/merge-train.mjs release 20 4.69.0 "Guard AI incident board, partner throw KO, mocap on by default"` from C:/NightShift/Mobile-Coop-train. Train 21 (build on master after 4.69.0): #189 traverse-fix, #190 partner-seed (checker PASS), #191 guard-ai S3 radio (stacked on #185). Sector-redesign: slices 2-3 + E1/E3/E4/E5 merged b550cc2a / 4def7d24 (run-e2e part 6 fix), laptop coop/netmove/ctcourse/sectorops:6 queued, then PR 2; S4/S5 building. marlow-final: sets 3-7 checked 45458bbc, dressing running, A8 next, laptop reruns after train 20. Guard AI: S4/S5/S7 in parallel. CT Core: strafe, traverse-fix-2, hang-down (protocol 34), spare #5 / #10. Character Build [06fe56]: guard-render S1 70470c30 suites queued on 4192.

**08:35: account swap live (5-hour 0%, resets 13:30; weekly 0%, resets 2026-10-30 04:00).  All five resumed ~08:45; Character Build = ListAgents "Night Shift | Character Build [06fe56]" (an offline duplicate [d57b71] remains). Protocol registry: 31 sector-redesign (master), 32 reserved guard-ai (S9 if needed; S2 none), 33 marlow-final, 34 hang-down (CT Core). Train 20 = origin/train/20 cbff3050 (#185 + #186 + #188 mocap-on ON default), full GPU run queued on the laptop after marlow-final ctcourse; release 4.69.0 on a pass. 08:50: 25% in 15 min (1.7%/min, 100% ~09:35 vs 13:30 reset): every session capped at 1 agent, no new agents until the orchestrator says. Locks clear, no node. Cron 7/27/47 recreated (lean windows). #185 CONFLICTING with 4.68.0 again (Guard AI merges master); #186 green CI, e2e-ctcourse owed. Prompts going out.**

**08:12 (swap point, ~97% at ~08:20).**
4.68.0 RELEASED (train 19 #187, 3950f3f8, ~08:30; dev moved). Next merges after it bump protocol past 31 (marlow-final, guard-ai).
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
Michael (2026-10-23 ~10:45: "all at once. also tell me when its safe to log out of the desktop/laptop accounts without distrupting work. must hit 99% usage on each"): at 99% with every session saved the old orchestrator says "Safe to log out" and gives ONLY the orchestrator prompt; the new orchestrator then gives the other five in one message (Michael ~10:50: "send only orcehstrator prompt, then once in the new account send all at once"). Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
orchestrator prompt, then the other five back to back from the new orchestrator's one message. (Old rule, replaced: the new orchestrator gave each next prompt with its session title, model and
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
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md "State at the switch" (newest update block first) and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" (incl. "Heavy-usage throughput" / "Token rules") and docs/ROADMAP.md (top "Decided" entries are Michael's words from 2026-10-23: stealth over shooting, ammo crate, Sector Ops 4 players, token rules). First: check C:/NightShift/heavy.lock and heavy2.lock (a lock with no live node process is stale; ask Michael to delete it). Master 4.70.0. Train 22 (build at 3+ ready or a 2-hour wait, from C:/NightShift/Mobile-Coop-train with scripts/merge-train.mjs, gh pr checks green first): #194 hostage-gait (ready), guard-ai #193 S4 -> #195 S5 -> #196 S7 stacked (after the e2e-stealth-ai 'bodies' diagnostic 8094c5b1 on the laptop), sector-redesign PR 2 when open; after the build, check changes/ fragments for entries already released. Then give Michael the other five prompts from HANDOFF "In the new account" ALL IN ONE message (title, model, effort each), as the last thing in the message; check ListAgents that all five come up. At the next swap: at 99% with every session saved, tell Michael "Safe to log out of the desktop and laptop" and give ONLY this orchestrator prompt. Recreate the cron with the prompt in STATE "Cron prompt" and check get_usage now. Full burn to 100%, sessions save by 98%, Michael swaps at 99%. Character Build may show twice in ListAgents: use the one that answered last (bridge session_01HVFKDvRCTbTDNhJKQP1oaa). Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided" and "Next: stealth over shooting"), then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Open: #194 hostage-gait (train 22). In flight per the resume file: mocap-strafe, traverse-fix-2, hang-down fix round (laptop coop hang-down section + ctcourse:2 station 5), strike-pops; spare jobs ride ONE batch PR per train. New spare jobs (Michael): interrogation gives door codes / camera routes / patrol timing, co-op synced takedowns rewarded, limited suppressor ammo. Every e2e run is E2E_GPU=1 (laptop via Character Build, or the desktop lanes). Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules" (on master since 4.70.0): message the orchestrator only at PR open / train-ready / blocked / needs Michael, progress in STATE; save at ~25-30% context; one checker per batch; no polling turns; merge master only when entering a train; desktop CPU under ~80%, at most 3 tsc / vitest agents. Full burn to 100% (Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores); save by 98%, Michael swaps at 99%.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": marlow-final M1-M6, stealth over shooting), then follow the resume prompt in the last fenced block of docs/marlow-final/STATE.md on origin/feature/marlow-final (git fetch; worktree C:/NightShift/Mobile-Coop-marlow-final). Job: marlow-final lead (A4-A6 dressing + A5 voxelFit fix, ctcourse :1 / :2 / :3 fixes, A8 greybox checker, dressing checkers, A8 dressing, then slice 9: GPU perf pass, docs, full e2e, PR; protocol 33). One PR to master when slice 9 passes. Next job after it: section-rating (ROADMAP "Next: stealth over shooting"). Every e2e run is E2E_GPU=1. Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules" (on master since 4.70.0): message the orchestrator only at PR open / train-ready / blocked / needs Michael, progress in STATE; save at ~25-30% context; one checker per batch; no polling turns; merge master only when entering a train; desktop CPU under ~80%, at most 3 tsc / vitest agents. Full burn to 100% (Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores); save by 98%, Michael swaps at 99%.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": Sector Ops redesign, unavoidable guards, stealth over shooting, the ammo crate ~10:20, Sector Ops 4 players later), then follow the resume prompt in the last fenced block of docs/sector-redesign/STATE.md on origin/feature/sector-redesign (git fetch). Job: sector-redesign lead (campusOps, 5 sections, greybox): PR 2 after the laptop part 6 rerun; S4 / S5 builders -> one Sonnet checker -> merge; E9 between-section weapons crate (once per player, ask the orchestrator for a protocol number if needed), E8 bulletproof / thermal cameras, E10 armoured routes with a quiet bypass; 20 / 24 guards wait on guard-render. Then the campus full detail-art lift (Michael ~10:40, ROADMAP "Next: campus detail art"): Opus plans a shared kit + rule-based base dressing + bespoke hero sets, Sonnet dressers in parallel, one Opus checker per batch, GPU perf pass. Every e2e run is E2E_GPU=1. Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules" (on master since 4.70.0): message the orchestrator only at PR open / train-ready / blocked / needs Michael, progress in STATE; save at ~25-30% context; one checker per batch; no polling turns; merge master only when entering a train; desktop CPU under ~80%, at most 3 tsc / vitest agents. Full burn to 100% (Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores); save by 98%, Michael swaps at 99%.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (account swap, laptop, the test runner). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"; JOBS=5 only while the second slot is idle, else 3), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch). Check C:/NightShift/scratch/runs and the laptop heavy.lock for runs left from the old account first. Jobs: test runner for every session (GPU, 4189 main + 4192 second slot, one full run at a time; queue in STATE; one verdict message per batch), and guard-render (Michael's 24 guards per section): S1 PR after the guard-cap on / off measure, S3a fix round, S5 / S6 checks, then the next slices per docs/guard-render/PLAN.md. Message "Night Shift | Orchestrator" with trains, guard-render PRs and failures that block a train; other verdicts to the job lead. Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules" (on master since 4.70.0): message the orchestrator only at PR open / train-ready / blocked / needs Michael, progress in STATE; save at ~25-30% context; one checker per batch; no polling turns; merge master only when entering a train; desktop CPU under ~80%, at most 3 tsc / vitest agents. Full burn to 100% (Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores); save by 98%, Michael swaps at 99%.
```

### 6. Guard AI Build
```
Night Shift | Guard AI Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided": Guard AI, unavoidable guards, stealth over shooting), then follow the resume prompt in the last fenced block of docs/guard-ai/STATE.md on origin/feature/guard-ai (git fetch; worktree C:/NightShift/Mobile-Coop-guard-ai). Job: guard-ai lead (src/ai/*, all maps). #193 S4 -> #195 S5 -> #196 S7 open, one train together once the e2e-stealth-ai 'bodies' diagnostic 8094c5b1 settles; S8 building; S5b / S6 / S10 built or checked; then the stealth-over-shooting planner first (helmets, riot shields in response teams, alarm stages, body checks, gunfire alerts, lamp investigations, response sweeps, body armour); protocol 32 reserved for S9. Every e2e run is E2E_GPU=1. AI code and checkers stay Opus; Sonnet 5.5 for tests and data. Rules: CLAUDE.md "Sessions" and "Heavy-usage throughput" incl. "Token rules" (on master since 4.70.0): message the orchestrator only at PR open / train-ready / blocked / needs Michael, progress in STATE; save at ~25-30% context; one checker per batch; no polling turns; merge master only when entering a train; desktop CPU under ~80%, at most 3 tsc / vitest agents. Full burn to 100% (Opus plans / checks / AI and anim code, Sonnet 5.5 builds from strict briefs, Haiku 5.5 chores); save by 98%, Michael swaps at 99%.
```
