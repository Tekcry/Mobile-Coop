# mission-framework - STATE


## RESUME 2026-10-27 ~14:30 SAVE (Night Shift | Campaign Build; account swap ~14:35)
Notes: C:/NightShift/scratch/campaign/lead-notes.md (newest at the end). Worktrees pushed (CM3 as WIP).
1. J22 campaign-mode. PR 1 = #708 (feature/campaign-mode e55873c55: flag, campaignOrder, campaignRating,
   campaignRecord, plan docs; Opus PASS, checker posted): watch CI + affected; train-ready from the watchdog.
2. CM3 (PR 2) building, Opus, on feature/campaign-mode-cm3 (worktree Mobile-Coop-campaign-mode-cm3, from #708's head).
   Brief scratch/campaign/cm/CM3-brief.md; report CM3-report.md says the step reached. If the builder is gone: resume
   from the report's next step (a fresh Opus builder with the same brief). Done -> TWO Opus checkers (src/net) -> PR 2
   (base feature/campaign-mode until #708 lands, then master) -> tell the orchestrator.
3. Then CM4 (lobby Mission row, briefing, Continue; Opus), CM5 + CM6 (save hooks + results; PR 4), CM7 (e2e; PR 5 with
   Job-done). Plan-check polish 3-11 in scratch/campaign/campaign-mode-plan-check.md go into those briefs.
4. Mill / Tallow: all walk fixes on master (#690 skip, #693 roof, #701 storm recordings). Waiting on Michael's storm
   level and other notes; mill polish (knife fist, hero framing, glide light) briefs when he asks.
UPDATE ~15:00: CM3 two Opus PASS -> PR 2 = #711 (feature/campaign-mode-cm3 8bbc61023, base feature/campaign-mode;
   retarget to master when #708 lands, re-post checker). CM5 notes from the checks: sections before a Continue stay
   unrated; the save stays on the match options (a restart reuses them: clear it after the Continue starts); the real
   SectorMode resume wiring has no unit test (stand-in mode): add one in CM5.
CM4 DONE (~15:20) e387efb98 on feature/campaign-mode-cm4 (worktree -cm4, from #711): lobby Mission row, briefing,
   Continue, main-menu "Continue campaign" (CM4-report.md). Opus checker 1 running -> scratch/campaign/cm/CM4-check-1.md
   (prompt CM4-check-prompt.md), then checker 2 -> CM4-check-2.md (rerun any missing). Both PASS -> PR 3 (base
   feature/campaign-mode-cm3) -> tell the orchestrator. Then CM5 + CM6 (PR 4: autosave, end rating, results panel; clear
   the save on another pick; the CM3 notes above), CM7 (PR 5, Job-done). #708 / #711: affected-e2e queued.

## OLD RESUME 2026-10-27 ~11:50 SAVE (Night Shift | Campaign Build; reset 13:50: carry on without waiting)
Notes: C:/NightShift/scratch/campaign/lead-notes.md (newest at the end). All worktrees clean and pushed.
1. On master now: the storm mill (4.127.0, #631), Tallow Mission 1 (#583), the intro skip hint + tap (#690), the mill
   roof frame + lamp chains (#693), the real rain / thunder recordings (#701, CC0 + CC-BY 4.0, WebAudio fallback).
2. Waiting on Michael: the storm level (the new rain may be very faint: he listens once); his other walk notes. Mill
   polish ready to brief when he asks: knife as a fist at the flash, hero framed larger, light through the glide (S8
   worktree -s8, S8-report.md / S8-check-2.md).
3. NEXT: J22 campaign-mode BUILD. PLAN on feature/campaign-mode 7080a46f7 (worktree Mobile-Coop-campaign-mode), plan
   check FIX applied (a Continue keeps kills / alarms / stage: G146); 11 polish items in
   scratch/campaign/campaign-mode-plan-check.md (fold the cheap ones into the slice briefs). Start CM1 (Sonnet: flag,
   order, 0-100% rating) then CM2 (Opus: campaign:progress / campaign:save kv records), PR 1 = CM1 + CM2. One agent at
   a time unless the orchestrator says more. Tallow's ids are on master now (#583): CM7 is unblocked.
   Q1 for Michael by day: the lobby listing of Tallow's two missions (build on "Both as Mission 1, in order").
Next: brief CM1 from the PLAN's CM1 + the check polish; build; checker; then CM2.

## OLD RESUME 2026-10-27 ~07:50 SAVE (Night Shift | Campaign Build; 5-hour reset 08:50)
Notes: C:/NightShift/scratch/campaign/lead-notes.md (newest at the end). All worktrees clean and pushed at this save.
1. Storm mill SHIPPED in 4.127.0 (PR #631; #606 / #616 / #617 / #618 closed). Michael walks ~09:00 (walk lines sent; draft
   scratch/campaign/piano/walk-items.md). HOLD all mill tuning for his walk notes. Ready to brief after them: the knife as
   a closed fist in the lightning frame, the hero shot framed larger, light kept through the glide (S8, worktree -s8;
   S8-report.md / S8-check-2.md). Also the storm sound question (computer-made vs a recording: a download needs his OK).
2. Tallow Mission 1 SHIPPED (#583). Polish waits for Michael to play it (no tuning before).
3. J22 campaign-mode (ROADMAP Now 18): Opus PLAN on feature/campaign-mode e8fc17194 (worktree Mobile-Coop-campaign-mode;
   docs/campaign-mode/BRIEF.md + PLAN.md: CM1-CM7 in 4 PRs). Opus plan checker running -> scratch/campaign/
   campaign-mode-plan-check.md (rerun if missing). Note: #583 is on master (the PLAN's Tallow blocker is gone). PASS ->
   build CM1 (Sonnet) + CM2 (Opus) after the walk. Q1 for Michael by day: the lobby listing of Tallow's two missions.
Next: plan-check verdict -> fix the PLAN or start CM1 / CM2; Michael's walk notes -> the mill fixes.

## OLD RESUME 2026-10-27 ~01:50 SAVE (Night Shift | Campaign Build)
FIRST: the storm mill: the newest block of docs/piano-escape/STATE.md on origin/feature/piano-escape-s4 (PR #631, the walk
build; NOT feature/piano-escape). Tallow #583 152c85c18 (wharf e2e kills fixed, set wharf filed); Tallow paused until
the orchestrator resumes it.

## OLD RESUME 2026-10-26 ~22:20 SAVE (Night Shift | Campaign Build)
FIRST: piano-escape (main focus): the newest block of docs/piano-escape/STATE.md on origin/feature/piano-escape.
Tallow: #522 + #578 merged; #581 retargeted to master ~22:00 (MERGEABLE, checker posted, waiting on affected-e2e);
when it lands retarget #583 -> master and re-post checker. Rest as below.

## OLD RESUME 2026-10-26 ~20:28 SAVE (Night Shift | Campaign Build)
FIRST: piano-escape (Michael ~19:40: main focus): resume from docs/piano-escape/STATE.md on origin/feature/piano-escape
(worktree C:/NightShift/Mobile-Coop-piano-escape). Tallow below uses spare capacity only (max 2 builders in all).
Tallow, changes since the 19:35 block (which still holds for the rest):
1. #522 (a) MERGED to master. #578 (b) retargeted to master ~20:27 (MERGEABLE); train-ready from the watchdog after
   CI + affected-e2e on its head. Then #581 -> master after #578 lands, then #583.
2. S4 + G5 merged into (d) #583 at a84e2ca78 (one Sonnet PASS, tallow-s4-g5-check.md; tsc + 315 tests; fixed G5
   plan + brief replace the pre-fix copies); checker posted, PR comment. Polish: walk card "about 17 s" far corner.
Next: piano first; then #578 train; retarget #581 -> #583 as each lands.

## OLD RESUME 2026-10-26 ~19:35 (Night Shift | Campaign Build, after the ~19:05 swap; read this block first)
Process as in the 18:35 block below (prototype mode; bypass: the lead posts `checker`; low.mjs; junctions only to
Mobile-Coop-menu/node_modules). Notes: scratch/campaign/lead-notes.md "Session after the 19:05 swap".
The engine reaches master as 4 stacked big-pr members (BRIEF A29); each retargets to master once the one below lands (A27):
1. (a) #522 feature/mission-c2-rules e9e01f319, base master: was left out of train 128 on a new master conflict (flags,
   settings); fixed keep-both (missions / coopKit + guard-rules flags; hints + animSourceSet), tsc + settings tests green,
   checker posted, PR comment. train-ready returns from the watchdog after CI + affected-e2e.
2. (b) #578 feature/mission-b-sector b6c57d0ff (merged new (a)), checker posted. Retarget to master after #522 lands.
3. (c) #581 feature/mission-c-net 395576d8e (merged new (b); coopClient.ts keep-both NET2 teamT0 + S2c mates; tsc + net
   tests), checker posted. Retarget after #578.
4. (d) #583 feature/mission-d-wharf 0adfd8dee (merged new (c) + S3 44575348a, Sonnet PASS scratch/campaign/tallow-s3-check.md;
   tsc + 352 tests), checker posted. Retarget after #581. When it lands: Tallow W1 in /preview/; tell the orchestrator
   (walk card as in the 18:35 block, plus the two shutters).
5. A red check on any member: fix on the lowest member it touches and merge upward (b -> c -> d), re-post `checker`.
6. S4 (wharf e2e walks both shutters; scripts/e2e-sectorops-wharf.mjs only) on cloud-queue, base (d) 0adfd8dee, claimed
   by Cloud Builder 6 08:17Z. Done -> merge into (d) with G5 (one Sonnet checker for the S4 + G5 batch), re-post checker.
7. G5 (A30): Michael ~19:25 G5-Q1 answer 1 "Allow this corner" (BRIEF M8). Released on cloud-queue d90ecfaee
   (briefs/campaign-tallow-g5.md + its plan campaign-tallow-g5-plan.md), base (d) 0adfd8dee, branch feature/tallow-g5.
   Done -> the S4 + G5 Sonnet checker -> merge into (d) (or a follow-up PR once (d) lands). Engine's pre-fix docs/tallow-fixes/G5-plan.md
   + briefs/G5.md: replace with the fixed copies in the same merge.
8. Polish lists: as in the 18:35 block. Michael's ~18:47 / ~18:52 / ~19:25 picks are BRIEF M7-M8. Desktop CPU 95-100%
   (orchestrator ~19:25): no new local builders until under 80%; cloud-queue is fine.
   PACE (Michael ~19:22, full burn ended): at most 2 builders at once (S4 + G5 now), Sonnet builders (Opus for engine /
   net / fix rounds), briefs at most one slice ahead, one checker per batch, background waits, no polling.
Next: watch #522 into a train; retarget #578 -> #581 -> #583 in order; pick up S4 and G5 from cloud-queue (checker each, merge into (d)).

## OLD RESUME 2026-10-26 ~18:35 SAVE (Night Shift | Campaign Build; prototype mode; read this block first)
Process: prototype mode (one closest set per change = the automatic affected run only, no extra sets; a red test gets one
fix + one rerun, then note and ship). Bypass: the lead posts `checker` itself. Local checks via scratch/ctcore/low.mjs.
Junctions ONLY to C:/NightShift/Mobile-Coop-menu/node_modules. Notes: scratch/campaign/lead-notes.md "Session after
the 17:05 swap". All worktrees clean and pushed at the save.
The engine reaches master as 4 stacked big-pr members (BRIEF A29); each retargets to master once the one below lands (A27):
1. (a) #522 feature/mission-c2-rules 17e8738ba, base master: TRAIN-READY (CI, checker, affected all green). Rides the next train.
2. (b) #578 feature/mission-b-sector a8bac697b, base (a): CI green, checker posted; affected 20261026T071851 pending.
   When #522 is on master: `gh pr edit 578 --base master`, then train-ready comes from the watchdog.
3. (c) #581 feature/mission-c-net 752e106be, base (b): CI green, checker posted (two Opus src/net PASS); affected pending.
   Retarget after #578 lands.
4. (d) #583 feature/mission-d-wharf cf9fa7e4f, base (c): CI test pending at the save, checker posted; affected pending.
   Retarget after #581 lands. When it lands, Tallow W1 is playable in /preview/ (missions flag): tell the orchestrator
   (walk card: uneven TGC split, gallery reach 16.3 s; 47 Tallow lamps in lampBoxAlign KNOWN_EMBEDDED, a light-pass item).
5. A red check on any member: fix it on the lowest member it touches and merge upward (b -> c -> d), re-post `checker`.
6a. S3 (both shutters placed on Tallow; brief scratch/campaign/cq/campaign-tallow-s3.md, HELD lifted ~19:00) building on the
   desktop: DONE feature/tallow-s3 44575348a (Sonnet, from (d) cf9fa7e4f; tsc 0, 28 files / 677 tests; report
   scratch/campaign/tallow-s3-report.md). Sonnet checker running -> scratch/campaign/tallow-s3-check.md. Then a checker, merge into (d) (or a
   follow-up PR on #583), then S4 (cq/campaign-tallow-s4.md). G5 needs S3 first (G5-plan section 7).
6. Then G5 (A30): docs/tallow-fixes/G5-plan.md + briefs/G5.md on the engine (held; plan check scratch/campaign/tallow-g5-plan-check.md).
7. Polish lists: scratch/campaign/member-{b,c-check-1,c-check-2,d}-check*.md; Player Build's coop-kit A1 adds a kitMoves
   flag (flags.coopKit stays; moving my readers to kitMoves ids is mine, any time).
8. Michael (via orchestrator) ~18:47 "Not yet": the five new co-op move sizes stay out of the level rules (no new map
   plans on them); ~18:52 "Keep it": Tallow C4 Plank Bridge (pie loft to clock loft) stays, Player's Plank Bridge move,
   Marlow a2-plank sizes. No re-plan; no other new co-op-move uses on Tallow for now. (BRIEF "Michael picked" at the next edit.)
Next: watch #522 into a train; retarget #578 -> #581 -> #583 in order as each lands; then G5.

## OLD RESUME 2026-10-26 ~17:20 (Night Shift | Campaign Build, after the ~17:05 swap; read this block first)
Process as in the 16:15 block below (prototype mode, bypass: the lead posts `checker`, low.mjs, junctions to
Mobile-Coop-menu/node_modules only). Newest: scratch/campaign/lead-notes.md "Session after the 17:05 swap".
1. #567 (F28, contains #553) rode train 125, which failed on e2e-ctcourse shards 5-8; the orchestrator triages it.
2. D1 cloud brief closed done (cloud-queue df606035f): merged as is, the TGC split ruled to G5.
3. (a) #522 feature/mission-c2-rules 17e8738ba: master merged in (settings: Hints + Animation source kept; tsc +
   settings tests green); checker status posted; train-ready returns via the watchdog after CI + affected-e2e.
4. (b) PR #578 feature/mission-b-sector 8d4feb8ec (base (a), big-pr): Opus PASS (member-b-check.md), status posted,
   the automatic affected run only (set mb withdrawn: one set per change). Retarget to master after #522 lands (A27). Polish: the check report.
5. (c) PR #581 feature/mission-c-net 3a114fbb0 (base (b), big-pr): Opus PASS x2 (check-2 fix: blips line), status posted.
   (d) PR #583 feature/mission-d-wharf fe062fc02 (base (c), big-pr; restacked on (c) 3a114fbb0): Opus FIX -> fix round
   (wharf blips(), testing-tools 720 budget, lamp note), status posted. 47 Tallow lamps in lampBoxAlign KNOWN_EMBEDDED
   (light-pass item; lamp 92 buried in the clock block). All 4 members are PRs; orchestrator told.
6. CI fix round (orchestrator ~18:10: master guard tests sectorObjectives hook + coopFix showLine count): heads
   #578 a8bac697b, #581 752e106be, #583 cf9fa7e4f; checker statuses re-posted; #578 affected 20261026T071851.
7. G5 after (d) (A30); #549 look-video merged (master).
Next: watch #522 -> #578 -> #581 -> #583 (CI, affected); retarget each to master in order once the one below lands
(A27); Tallow W1 in /preview/ when #583 lands; then G5 (A30).

## OLD RESUME 2026-10-26 ~16:15 SAVE (Night Shift | Campaign Build; prototype mode; read this block first)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 14:21 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Bypass mode: the lead posts `checker` statuses itself. Local checks via scratch/ctcore/low.mjs.
PROTOTYPE MODE (ROADMAP Decided ~16:05, e18f09d2f): the freeze ends once the fix train ships; one closest test set
per change, no proof runs; build toward playable pieces. Goal: Tallow W1 (Three Grey Coats) playable in /preview/.
My old tallow laptop requests are cancelled: re-file one set per change only. Never wait >10 min on a session (15:55).
Michael 16:20: no tuning before he plays; a red test gets one fix + one rerun max, then quarantine / note and ship.
1. F28 #567 (base master, contains #553; checker PASS; label fix). Both conflict with master in scripts/e2e-ctcourse.mjs
   only (#553 part). Asked Marlow 16:10 who resolves; >10 min silent -> orchestrator. CI green -> train-ready +
   no-affected-e2e; rides with #553.
2. Engine feature/mission-engine 321e4eed2 (PR T + NET3 gate). NOT in the engine yet: tallow-fixes-2 05302cc94 (G1-G4,
   E8, D1 as is, each PASS; docs/tallow-fixes/G5-plan.md + briefs/G5.md, D1-report.md) and tallow-shutters b2df51d9a
   (S-a PASS). Merge both in with one closest set each (prototype mode).
3. G5 plan fixed (round 1, on the engine docs/tallow-fixes/G5-plan.md + briefs/G5.md; held until after member (d) and S3;
   Opus plan check (scratch/campaign/tallow-g5-plan-check.md); then a Marlow note (S11 reach message + assist bolt).
4. Engine to master as 4 big-pr members (BRIEF A29, 7c0ddfa48): (a) = #522 2a202c430 (C1 #521 already released; contains #560;
   missions / coopKit on in /preview/; checker PASS x2; CI running). (b) cut by Opus -> scratch/campaign/member-b-cut-report.md
   (branch feature/mission-b-sector on (a)). Then (c) net, (d) Tallow map + tests (G5 after (d), A30).
5. #549 look-video tool (PASS); its first Tallow run was cancelled with the parked requests.
Next: #567 conflict + train-ready; engine <- tallow-fixes-2 + shutters; land the engine for a /preview/ Tallow W1.

## OLD RESUME 2026-10-26 ~15:00 (Night Shift | Campaign Build, after the 14:21 swap)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 14:21 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Fixes first (Michael ~14:00, docs/orchestrator/FIXES.md via the orchestrator). Bypass mode: the lead posts `checker`
statuses itself. Local checks via scratch/ctcore/low.mjs. Desktop CPU 82% at 14:55: no new local builders over ~80%.
FIX FREEZE from 15:20 (FIXES.md "Fix freeze", feature/menu 185328f2f): no feature builders or feature queue requests
until every open fix ships; my tallow requests (prg2-a / -b, look-video) are parked on laptop-queue `parked/`, #522
drafted by the orchestrator (mark ready at the end). Re-file prg2-a / -b only if tallow-fixes-2 moved past ab129b96c.
My fix: F28 (e2e-course + e2e-bunker second tab `&autojoin=1` + boot diagnostic), branch feature/f28-course-bunker in
C:/NightShift/Mobile-Coop-f28-course-bunker, stacked on #553 (feature/ctcourse-flake-fix). Spare time: plans / briefs.
1. Engine feature/mission-engine 321e4eed2 (PR T + NET3 gate merged; claims block 6be3da64b; BRIEF A25-A28: C4 big-pr
   only, wharf as C9-C16, members retargeted to master just before train-ready, NET3 firstPlace behind `missions`).
2. PR G1 c648c5d85: laptop tallow-prg1 ran on the desktop slot 4191 and timed out (exit 124, 0/7 suites, 60 min cap
   at E2E_JOBS=1); the queue posted failure and queued no laptop rerun (queue gap, told the orchestrator). Not rerun:
   G2 below contains G1 with the same suites, so a green tallow-prg2 lands G1 + G2 together.
3. PR G2 feature/tallow-fixes-2 e50cfe7fa = ab129b96c + D1 c8f33dcf3 (as is, Sonnet PASS tallow-d1-check.md; status posted). ab129b96c = 2de5701c0 (G1 + G2 36a207232 + G4 06c1bc4a6, each PASS) + E8 108c8673f
   (cloud, wharf e2e script only; Sonnet PASS tallow-e8-check.md; status posted on both). Old tallow-prg2 withdrawn;
   laptop split to fit the desktop 60 min cap: tallow-prg2-a 20261026T040859 (e2e-sectorops all, incl. wharf parts) +
   tallow-prg2-b 20261026T040907 (coop netmove ctcourse levels anchors lightbake). Both green -> merge into the engine,
   cut C3 (prc-split-refresh.md row C3). Pawn-throw overhang: D1 LEAD NOTE. E8 polish: tallow-e8-check.md.
4. D1 merged as is; its TGC split ERRs (parity, reach) go to G5: caged stair for the gallery ladder + leg b re-cut (scratch/campaign/tallow-g5-plan.md, held brief cq/campaign-tallow-g5.md, base e50cfe7fa). Opus plan check running (tallow-g5-plan-check.md). Re-file the G2 laptop sets on e50cfe7fa after the freeze.
   S3 (cq/) after G2 in the engine and the engine in
   tallow-shutters; S4 after S3 (E8 done).
5. PR S tallow-shutters b2df51d9a (S-a; status posted). Laptop tallow-prs-a 20261026T024857. Green -> engine after G2.
6. PR C split: C1 #521 9419b8f29, C2 #522 29892a271 (both PASS + status). Laptop co-op gate prc-c1 20261026T025035 /
   prc-c2 20261026T025041. Preview flags (Michael 13:55): missions / coopKit via darkFlag(.., PREVIEW_ON) if C2 lands
   after Player's player-preview-flags.
7. PR #549 feature/look-video 8a67136d3 (tool to master; PASS + status). First run: alone 20261026T031806 on run branch
   feature/look-video-tallow dc7bb9342 (engine + 2 script files; webm on the laptop C:/NightShift/scratch/look-video/).
   The W1-W4 videos gate C9 / C10 bodies.
Next: F28 PR #567 (base master, rides with #553; checker PASS; laptop set f28 + affected); after the freeze: tallow-prg2-a / -b verdicts -> G2 into the engine, then S; cut C3; D1 pickup.

## OLD RESUME 2026-10-26 ~14:30 (Night Shift | Campaign Build)
Superseded by the block above (G1 rerun dropped; G2 carries it).

## OLD RESUME 2026-10-26 ~14:15 SAVE (Night Shift | Campaign Build)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 13:00 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
CPU hold released 14:09 ("go: start builders"). Fixes first (Michael ~14:00, docs/orchestrator/FIXES.md via the
orchestrator). Bypass mode: the lead posts `checker` statuses itself. Local checks via scratch/ctcore/low.mjs.
1. Engine feature/mission-engine 321e4eed2 (PR T + NET3 gate merged; claims block 6be3da64b, Q9; BRIEF A25-A28: C4 big-pr only,
   wharf as C9-C16, members retargeted to master just before train-ready, NET3 firstPlace behind `missions`).
2. PR G1 feature/tallow-fixes c648c5d85 (checker PASS), laptop tallow-prg1 running. Green -> merge into the engine,
   then cut C3 (prc-split-refresh.md row C3).
3. PR C split: C1 #521 9419b8f29 (base master), C2 #522 29892a271 (base C1; missionText.test -> C12). Both checker
   PASS + status. Laptop co-op gate only: prc-c1 20261026T025035 / prc-c2 20261026T025041. Preview flags (Michael
   13:55): missions / coopKit read via darkFlag(.., PREVIEW_ON) if C2 lands after Player's player-preview-flags.
4. G2 done (cloud) feature/tallow-fixes-g2 36a207232; G4 06c1bc4a6 checker PASS + status. Opus G2 checker running
   (tallow-g2-check.md). PASS -> merge c648c5d85 + G2 + G4 into tallow-fixes-2, status, laptop set (plan :1078 = PR G1
   set + e2e-coop e2e-netmove); FIX -> Opus fix round. Then E8 brief (cq/), D1 after G1-G4.
5. tallow-shutters b2df51d9a (S-a: S1, S2, S1-late, s1-polish; status posted). Laptop tallow-prs-a 20261026T024857.
   Green -> merge S into the engine after G1 (order T, G1, G2, S). S3 after G2 in the engine; S4 after S3 + E8.
6. DONE NET3 gate f45f17e60 PASS x2 + status, merged into the engine 321e4eed2.
   (co-op e2e rides the C7 / C16 sets).
7. look-video done (cloud) feature/look-video 8a67136d3 (base master): Sonnet checker look-video-check.md. PASS ->
   open its own small tool PR to master; first PC run (4189, --alone) on a temp branch = engine + look-video.
Next: checker reports -> statuses / merges; tallow-prg1 -> G1 into the engine -> cut C3.

## OLD RESUME 2026-10-26 ~13:50 (Night Shift | Campaign Build, after the 13:00 swap)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 13:00 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Orchestrator 13:32: desktop CPU 100%, NO new local builders until it sends "go: start builders"; tsc / vitest builders
go to cloud-queue; local checks via scratch/ctcore/low.mjs.
1. Engine feature/mission-engine 321e4eed2 (PR T + NET3 gate merged; claims block 6be3da64b, Q9) on c213437e9 (= 377e4c608 + BRIEF A25-A28: C4 big-pr only, wharf as C9-C16, stacked
   members retargeted to master just before train-ready, NET3 firstPlace behind `missions`).
2. DONE PR T laptop green, merged into the engine 5760c6deb.
3. PR G1 feature/tallow-fixes c648c5d85 (checker PASS), laptop tallow-prg1 running. Green -> engine after T. Then C3.
4. PR C split: C1 #521 feature/mission-c1-core 9419b8f29 (base master), C2 #522 feature/mission-c2-rules 29892a271
   (base C1; missionText.test moved to C12). Laptop co-op gate only: prc-c1 025035 / prc-c2 025041. Reports prc-c1-check.md /
   prc-c2-check.md: both PASS, statuses posted. Preview flags (Michael 13:55): missions / coopKit read via darkFlag(.., PREVIEW_ON) if C2 lands after Player's player-preview-flags.
5. G4 done (cloud) feature/tallow-fixes-g4 06c1bc4a6: Sonnet checker tallow-g4-check.md. G2 reopened on cloud-queue
   (branch head 3c4aaa4b4 = steps 1-10, 12; tests left). Both done + PASS -> merge c648c5d85 + G2 + G4 into
   tallow-fixes-2 (G2 checker Opus; FIX -> Opus fix round).
6. DONE s1-polish PASS x2 (status posted), tallow-shutters = b2df51d9a. Laptop tallow-prs-a requested.
   S-a green -> merge S into the engine after T, G1 (order T, G1, G2, S).
7. Cloud open: campaign-net3-gate (Opus; done -> two Opus src/net checkers -> engine before C7), campaign-look-video
   (Sonnet, base master; recorder for the W1-W4 videos, PC run on 4189 pending). Held in scratch cq/: E8, D1, S3, S4.
Next: checker reports -> statuses / merges; laptop verdicts -> T then G1 into the engine; G2 / net3 / look-video pickups.

## OLD RESUME 2026-10-26 ~12:35 SAVE (Night Shift | Campaign Build, swap at 100%; read this block first)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 11:25 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Desktop CPU ~90-99%: tsc / vitest builders go to cloud-queue (keep 1-2 open); local checks via scratch/ctcore/low.mjs.
1. Engine feature/mission-engine a2822ab7a = J7 PR D + E + F (laptop green) + FE / FF docs. J7 built; ships with PR C.
2. PR T feature/tallow-throw 34e92c991 (checker status). Laptop 20261026T003610 set tallow-prt (coop netmove ctcourse
   wharf-tgc wharf-tkl). Green -> merge T into the engine FIRST (order T, G1, G2, S).
3. PR G1 feature/tallow-fixes c648c5d85 (checker status). Laptop 20261026T004059 set tallow-prg1 (sectorops all, coop,
   netmove, ctcourse, levels, anchors, lightbake). Green -> merge into the engine after T.
4. PR S feature/tallow-shutters ec1434867 = S1 complete (late hunks PASS x2) + S2 + fix1 + PR T.
5. Cloud (cloud-queue): G2 claimed (elegant-rubin, base tallow-fixes-2 24964a624); G4 open (Sonnet, base tallow-fixes
   c648c5d85, parallel with G2: owns W4 + w4.test only); s1-polish open (Opus, base tallow-shutters ec1434867: restart
   hold-off window + resetKit scope test). G2 / G4 done -> merge tallow-fixes c648c5d85 + G2 + G4 into tallow-fixes-2,
   checkers (G2 Opus; G4 Sonnet greybox). s1-polish done -> two Opus checkers -> merge into tallow-shutters.
6. Held briefs in scratch/campaign/cq/: E8 (after G2 + G4), D1 (after G1-G4; LEAD NOTE: clear the S11 validator's
   parity 23% and w1-tea-stall reach ERRs), S3 (after G4 and PR G2 -> engine -> S), S4 (after S3 + E8; rulings in it).
7. PR C split: plan DONE scratch/campaign/prc-split-refresh.md (16 members; lead rulings in lead-notes). Asked the orchestrator
   big-pr C4 / wharf split / stacked bases / NET3 firstPlace live. Engine 377e4c608 has dbe5e854b. C1 + C2 open on its answer.
Next: laptop verdicts -> T then G1 into the engine; G2 / G4 / s1-polish pickups; read prc-split-refresh.md.

## OLD RESUME 2026-10-26 ~12:45 (Night Shift | Campaign Build, after the 11:25 swap; read this block first)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 11:25 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Desktop CPU ~90%: tsc / vitest builders go to cloud-queue; local checks via scratch/ctcore/low.mjs.
1. Engine feature/mission-engine a2822ab7a = J7 PR D + E + F (all laptop green) + FE / FF docs. J7 is built; it
   reaches master with PR C. cloud-queue campaign-tallow-d0 closed.
2. PR T feature/tallow-throw 34e92c991 (engine merged in; checker status). Laptop 20261026T003610 set tallow-prt
   (coop netmove ctcourse wharf-tgc wharf-tkl). Green -> merge T into the engine FIRST (order T, G1, G2, S).
3. PR G1 feature/tallow-fixes c648c5d85 (engine + FG1; checker status). Laptop 20261026T004059 set tallow-prg1
   (e2e-sectorops all, coop, netmove, ctcourse, levels, anchors, lightbake). Green -> merge into the engine after T.
   Look videos: no recorder exists anywhere; they gate the PR C Tallow member (lead-notes assumption).
4. PR S feature/tallow-shutters ec1434867 = S1 (incl. late hunks, PASS x2) + S2 + fix1 + PR T. Next: S3 brief
   (cq/campaign-tallow-s3.md, held, `<BASE>`) once PR G2 is in the engine and the engine merged into S; then S4
   (cq/campaign-tallow-s4.md, rulings appended) after S3 + E8.
5. Cloud G2 claimed (elegant-rubin, base tallow-fixes-2 24964a624; branch feature/tallow-fixes-g2 exists, not done).
   Done -> merge tallow-fixes c648c5d85 into tallow-fixes-2, merge G2, G2 checker (Opus fix round on FIX); then the G4
   brief (docs/tallow-fixes/briefs/G4.md), then E8 (cq/, PR F gate met) and D1 (cq/) after G1-G4.
6. PR C (engine to master): docs/missions/slices/PRC-split.md is stale (sizes at 533c02a66); refresh after T / G1 /
   G2 / S. Carry to its gate: the Tallow "Resume hosting" PC check, claims-check rerun, W1-W4 look videos.
Next: laptop verdicts -> merge T then G1 into the engine; G2 done -> merge + checker; G4 brief.

## OLD RESUME 2026-10-26 ~11:45 (Night Shift | Campaign Build, after the 11:25 swap; read this block first)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 11:25 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
Desktop CPU 93% at start: tsc / vitest builders go to cloud-queue; local checks via scratch/ctcore/low.mjs.
1. DONE: J7 PR D, E, F all green (j7-prd / j7-pre / j7-prf) and merged into feature/mission-engine -> 5e72f83b0
   (code = PR F head; engine-only diff is docs). Marlow told the sha. cloud-queue campaign-tallow-d0 closed (65f11c018).
2. FE + FF (J7 docs) Haiku on feature/mission-rules-docs (worktree -mission-rules-docs, report j7-fef-report.md) ->
   lead merges into the engine.
3. PR T feature/tallow-throw: engine merged in (local, check log tallow-throw-merge-check.log). Green -> push, checker
   status, withdraw request 20261025T230719 (6c4219cd2, unclaimed), request e2e-coop e2e-netmove e2e-ctcourse
   e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl (set tallow-prt) on the new head. Green -> merge T into the engine
   FIRST (plan section 5 order T, G1, G2, S).
4. PR G1 feature/tallow-fixes: engine merged in; FG1 Haiku (tallow-fg1-report.md) pushes. Then tsc + tallowWharf tests
   (low.mjs), laptop set (wharf-tgc wharf-tkl mission + e2e-coop e2e-netmove + affected list, plan :1069-1080), look
   videos W1 / W3 (Test Runner queue, 4189), claims-check rerun, one PR-level Opus checker. Then merge into the engine.
5. PR S feature/tallow-shutters: next = merge the PR T head in, then S1 late hunks A (teamController update call +
   resetKit + test) and B (gameState armDoors(this.nav) + checkpointReset resetKit): spec tallow-s1-report.md :42-71.
6. Cloud G2 claimed (elegant-rubin, base tallow-fixes-2 24964a624). Done -> merge tallow-fixes (now with the engine)
   into tallow-fixes-2, then the G2 checker; G4 brief next; E8 is unblocked by PR F (needs G2 + G4); D1 after G1-G4.
7. PR C (engine to master): docs/missions/slices/PRC-split.md is stale (sizes at 533c02a66); refresh after T / G1 / G2 / S.
Next: throw check -> PR T laptop; FG1 + tsc -> PR G1 laptop + videos; S1 late hunks; G2 pickup.

## OLD RESUME 2026-10-26 ~10:50 SAVE (Night Shift | Campaign Build, swap at 100%; read this block first)
Process as below. Newest: scratch/campaign/lead-notes.md section "Session after the 09:35 swap". Rerun any agent whose
report file is missing. New junctions point ONLY at C:/NightShift/Mobile-Coop-menu/node_modules. `fix` label on fix PRs.
1. Laptop (wharf-tgc + wharf-tkl only): j7-prd on PR D c2802450a (carries gb6fix2), j7-pre on PR E 162f43204, j7-prf
   on PR F 6c0a42f07, tallow-prt (e2e-coop e2e-netmove) on PR T 6c4219cd2. j7-prd green -> merge PR D into the engine,
   send Marlow the engine sha.
2. Branches: feature/tallow-fixes ce743bc39 = engine + PR D + LP + G0 + D0 + MB (checker PASS); feature/tallow-shutters
   7054bed90 = S2 + S1 + S2 fix1 (PASS x2); feature/tallow-throw 6c4219cd2 = TD-a + TD-b (PASS);
   feature/tallow-fixes-2 24964a624 = tallow-fixes + d0-w2roof + G1 + G3 + tallow-throw (239 tests green).
3. DONE: D0 + E11 (Opus PASS, G2 brief FIX applied), G1 (PASS), G3 (PASS): statuses posted, all merged into
   feature/tallow-fixes db0e068ee (also carries the G2 brief fix). G2 cloud brief has a LEAD NOTE: step 0b builds
   layout.throwSites (G0 skipped it) and throwCheck sites is optional. Polish list: lead-notes D0 / G1 / G3 lines.
4. Cloud: G2 claimed by elegant-rubin (base 24964a624, Sonnet; FIX -> Opus fix round). G2 done -> merge tallow-fixes db0e068ee into tallow-fixes-2 first (fix + G1 / G3 statuses), then the G2 checker. G4 after G2 on tallow-fixes-2. Then D1 / E8.
5. D0 ERR 2 (split leg a) expected until Marlow's validator-port-s11 (J12 A28) lands. Open: map SPEC "Drainpipes" row
   + element register need E11's pipe; E8 needs an e2e row for the pipe climb.
6. Kit-flag fold dropped for Campaign (Player A1 does it later): S1 hunk A + S4 land on `coopKit`.
7. Marlow #490 mixamo-kit: do not merge until their step 8.
Older block below still holds for items not named here.
Next: laptop verdicts -> PR D into engine; G2 done -> checker (Opus fix round on FIX), then the G4 brief on tallow-fixes-2.

## OLD RESUME 2026-10-26 ~09:20 SAVE (Night Shift | Campaign Build, swap at 100%; read this block first)
Process: RULES + VISION from origin/master; BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP "Now" +
FOLDED-PLAN J-rows; Tallow plan = ENGINE copy docs/missions/slices/J8-J9-PLAN.md (the scratch copy is stale). Notes /
reports: C:/NightShift/scratch/campaign/ (lead-notes.md newest last). Rerun any agent below whose report is missing.
1. WHARF e2e (wharf-tgc / wharf-tkl) red on dc2aa9c8, eb231778 (PR D), 62b206d2 (PR E). Opus triage (worktree
   -wharf-triage, feature/mission-engine-gb6fix2) pushed 4 fixes to 820101ecd (holder pull band feet to feet; posted
   pairs drop the S10 tag; e2e waits for Teale's respawn + next-tick events; pull partner waits for the wire offer);
   final 3x runs were in flight (logs wharf-triage-final-*.log). If wharf-triage.md is missing: rerun the 3x desktop
   runs on the head under heavy.lock. Green -> merge into PR D / -net / -hud heads AND the engine, re-request laptop
   sets j7-prd / j7-pre / mission-gb6fix, send Marlow the engine sha (their #490 gate re-adds the wharf suites).
2. J7 PR D feature/mission-rules eb231778: checker PASS; laptop red (wharf). Green -> merge into engine.
3. J7 PR E -net 62b206d2a (checker PASS): laptop red (wharf). Green -> FE docs step, PR E.
4. J7 PR F -hud 9606076bf (checker status posted). Laptop e2e-sectorops (all) + e2e-menus HELD until the wharf fix.
5. #482 J3b PR B: in train 112 (#491).
6. Tallow: LP PASS (adb5503f2); G0 PASS (55514bad6, feature/tallow-g0); PR T feature/tallow-throw 45239952a.
   S1 (Opus, feature/tallow-s1 = engine + S2, worktree -tallow-s1): WIP cc50dc3b9 pushed at the save, report
   tallow-s1-report.md (may be partial); if the builder is gone, finish from the report, then an Opus checker.
   TD-b on cloud-queue (35807c3, base tallow-throw 45239952a, ahead of the kit-flag fold, lead ruling ~09:05).
   Held briefs D0 / MB / D1 / E8 in scratch cq/ (rulings ~09:05 in lead-notes; D0 link 31 = C5 throw, tell Marlow).
   Open: the kit-flag fold (coopKit into kitMoves) is on no branch: plan it as an engine slice after PR D.
   After PR D is in the engine: cut feature/tallow-fixes (merge LP + G0), cut feature/tallow-shutters (merge S1,
   which carries S2), push D0 / MB briefs (scratch cq/) with the engine sha.
7. Mixamo kit moves: Marlow's feature/mixamo-kit (#490); I merge it into the engine after #477 + mixamo-i3 release.
Next: triage report -> merge fix into red heads + engine, re-request laptop sets; S1 report -> checker; PR D green -> engine,
then Tallow branches (item 6).

## OLD RESUME 2026-10-26 ~05:30 SAVE (history) (Night Shift | Campaign Build)
Process: RULES + VISION from origin/master; BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP "Now" +
FOLDED-PLAN J-rows; Tallow plan = ENGINE copy docs/missions/slices/J8-J9-PLAN.md (the scratch copy is stale). Notes /
reports: C:/NightShift/scratch/campaign/ (lead-notes.md newest last). Rerun any agent below whose report is missing.
1. WHARF e2e (wharf-tgc / wharf-tkl) red on dc2aa9c8, eb231778 (PR D), 62b206d2 (PR E): client mission HUD has no
   rows. Opus triage (wharf-triage.md, worktree -wharf-triage): fix bd7f7a997 on feature/mission-engine-gb6fix2 (client
   mission mirror enters the host's live section), local rerun was in flight. Next: read the report; merge the fix into
   every red head (PR D first), re-request laptop sets j7-prd / j7-pre / mission-gb6fix.
2. J7 PR D feature/mission-rules eb231778: checker PASS; laptop red (wharf). Green -> merge into engine.
3. J7 PR E -net 62b206d2a (fix1 PASS x2 + R7 PASS): laptop red (wharf). Green -> FE docs step, PR E.
4. J7 PR F -hud 9606076bf (= -net + R6 + R6 polish + R8; checker status posted). Laptop set e2e-sectorops (all) +
   e2e-menus HELD until the wharf fix is in.
5. #482 J3b PR B: train-ready (affected 29/30, flake e2e-studio). Rides the next train.
6. Tallow: LP PASS (adb5503f2, 3 fix rounds, checker status posted); G0 PASS (55514bad6); S2 PASS x2 (3cc718578);
   PR T feature/tallow-throw 45239952a = engine + TD-a (PASS). After PR D is in the engine: cut feature/tallow-fixes
   (merge LP + G0), cut feature/tallow-shutters (merge S2), push D0 / MB briefs (scratch cq/) with the engine sha.
   TD-b waits for the kit-flag fold. Brief notes for TD-b / S1 / S4 / G builders in lead-notes.
7. Mixamo kit moves: Marlow's feature/mixamo-kit; I merge it into the engine after #477 + mixamo-i3 release
   (test fix dbe5e854b rides with it; merge resolutions approved, lead-notes).
Next: wharf-triage.md -> merge bd7f7a997 (or its final) into PR D / -net / -hud / gb6fix heads, re-request laptop
sets; on green: PR D -> engine, then Tallow branches (item 6).

## OLD RESUME 2026-10-26 ~05:05 (Night Shift | Campaign Build, after the 04:50 reset; history)
Process: RULES + VISION from origin/master; BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP "Now" +
FOLDED-PLAN J-rows. Desktop CPU ~80-100%: tsc / vitest builder slices go to cloud-queue; local checks only through
`node C:/NightShift/scratch/ctcore/low.mjs "<cmd>"` (BelowNormal). Notes / reports: C:/NightShift/scratch/campaign/
(lead-notes.md newest last). Rerun any agent below whose report file is missing.
1. #466 TW23 and #447 J3 PR A: MERGED. B0b done: engine 231bdbfbf (= e37987544 + TW23).
2. J7 PR D feature/mission-rules eb231778: checker PASS; laptop j7-prd queued. Green -> merge into engine, then push
   held briefs MB / D0 (scratch/campaign/cq/) with the merged engine sha.
3. J7 PR E -net 62b206d2a = fix1 (PASS x2) + R7 (PASS); checker status posted; laptop set j7-pre queued. Green ->
   FE docs step, then PR E. Resume-hosting has no e2e yet (lead-notes).
4. PR F -hud 3aa144a2f (= -net + R6). Cloud briefs open: campaign-j7-r6-polish (base d6a5f5b6), campaign-j7-r8
   (base 3aa144a2f). On done: checker(s), merge both into -hud, laptop e2e-sectorops (all) + e2e-menus.
5. Mixamo kit moves (Michael ~00:15 overnight priority): Marlow owns the wiring on feature/mixamo-kit (engine + #477);
   I merge its checked head into the engine. No-touch list sent to Marlow (lead-notes).
6. J3b PR B = #482 (head bcff08a3, checker status posted, Job-done: hud-guidance): waits CI + affected-e2e;
   orchestrator told. Polish list in lead-notes.
7. Laptop: wharf-tgc / wharf-tkl FAIL on dc2aa9c8, eb231778, 62b206d2 -> Opus triage (wharf-triage.md, desktop repro
   under heavy.lock, fix branch). hg-b3 / hg-b4 PASS. #482 train-ready. Cloud done x5: checkers running (lead-notes).
8. Tallow wave 0: cloud briefs tallow-tda / -g0 / -s2 open; MB / D0 held. LP DONE 4dac78cce (picks 9-12 accepted, lead-notes);
   LP check FIX (6 items); LP fix round 1 (Opus, docs) running on -lp (report "Fix round 1" in tallow-lp-report.md),
   then a fresh re-check. PASS + PR D in engine -> cut tallow-fixes, merge LP, push D0 brief.
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~23:30 SAVE (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP "Now" +
FOLDED-PLAN J-rows. Desktop CPU 100%: tsc / vitest builder slices go to cloud-queue; local checks only through
`node C:/NightShift/scratch/ctcore/low.mjs "<cmd>"` (BelowNormal). Notes / reports: C:/NightShift/scratch/campaign/
(lead-notes.md newest last). Rerun any agent below whose report file is missing.
1. #466 TW23: train-ready (labelled). #447 J3 PR A: all green, orchestrator asked to label (~23:10).
2. J7 PR D feature/mission-rules eb231778: checker PASS; laptop j7-prd queued (supersedes 548357d3). Green -> merge into
   engine, then push held briefs MB / D0 (scratch/campaign/cq/) with the merged engine sha.
3. J7 PR E -net 09975841c: cloud briefs campaign-j7-pre-fix1 + campaign-j7-r7 open. On done: Opus re-check x2 of the fix.
4. J7 R6 PASS x2 (status on 0cb3a4d6). PR F branch feature/mission-rules-hud d6a5f5b6 = -net + R6 (worktree
   -mission-rules-hud). Cloud brief campaign-j7-r6-polish (merged-head tsc + polish). R8 brief held: scratch cq/campaign-j7-r8.md.
5. J3b B5 0b98cd7d1: cloud brief campaign-hg-b5-fix1 open; then re-check, merge into -b, fragment, laptop sets.
6. Engine gb6fix dc2aa9c8 laptop set mission-gb6fix queued; hg-b3 / hg-b4 queued.
7. Tallow wave 0: cloud briefs campaign-tallow-tda, -g0, -s2 open; MB / D0 held (scratch cq/; D0 waits for LP + PR D).
   LP builder (Opus, docs) on feature/tallow-fixes-lp (tallow-lp-report.md). Rulings ~23:30 in lead-notes.md.
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.
Opus checkers; laptop verdicts; B0b merge once #466 releases; PR D green -> engine, push MB brief.

## OLD RESUME 2026-10-25 ~22:45 SAVE (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP
"Now" + FOLDED-PLAN J-rows; Michael's "Decided" answers win. Desktop CPU ~100%: new tsc / vitest builder slices go to
cloud-queue briefs (orchestrator ~22:10, Michael); desktop keeps Opus planning, checkers, src/net / AI needing a local
look. Notes, reports, briefs: C:/NightShift/scratch/campaign/ (lead-notes.md, newest section last). Rerun any agent
below whose report file is missing.
1. #372 RELEASED (train 103). TW23 PR #466 (feature/tallow-spec, docs) opened ~22:47; Opus checker running (tw23-check.md).
2. J7 PR D origin/feature/mission-rules eb231778: checker PASS; laptop set j7-prd queued. Green -> merge into engine.
3. J7 PR E origin/feature/mission-rules-net 09975841c (R4 + R5): two Opus checkers FIX, same defect (resume hosting a
   campaign room deadlocks; j7-pre-check-a.md / -b.md). Cloud brief campaign-j7-pre-fix1 -> feature/mission-rules-net-fix1;
   on done: fresh Opus re-check of the fix items x2 (src/net), merge into -net. Cloud brief campaign-j7-r7 (R7 e2e) ->
   feature/mission-rules-r7; then FE docs, laptop set (J7-PLAN section 4 row E).
4. J7 R6 (PR F) origin/feature/mission-rules-r6 42cf1d9a (+ WIP if pushed; report j7-r6-report.md): Opus builder was
   running at the swap. Next: two Opus checkers, cut feature/mission-rules-hud from -net, merge R6, R8 e2e brief.
5. J3b PR B origin/feature/hud-guidance-b d81a3397 (B1-B4). B5 origin/feature/hud-guidance-b5 0b98cd7d1: checker A PASS,
   B FIX (client Notes take camera-desk / bluff radio lines). Cloud brief campaign-hg-b5-fix1 -> -b5-fix1; on done:
   re-check the fix (Opus), merge b5 + fix into -b, add changes/feature-hud-guidance-b.md (kind: minor, Notes line),
   laptop sets e2e-takedown e2e-coop e2e-menus (+ e2e-coop-gpu on 4189). Laptop hg-b3 / hg-b4 queued.
6. J3 PR A #447 ececda7e: checker PASS x2; affected-e2e running -> train-ready -> message the orchestrator.
7. Engine GB6 fix feature/mission-engine-gb6fix dc2aa9c8: laptop set mission-gb6fix queued; green -> merge into engine.
8. J8 / J9 Tallow PLAN: re-check 4 PASS (j8-j9-plan-check4.md, 5 polish); merged into engine e3798754. Wave 0:
   brief writer running (tallow-wave0-report.md): TD / G0 / MB as cloud briefs campaign-tallow-*; D0 brief held in
   scratch until J7 PR D merges into the engine; claims-check rerun; tell Sector Ops MB touches their files.
9. Seams: Marlow #463 (courseStartBlock, addSyringes sector-only) folds with R4 / R5 at the engine's next master pickup;
   Guard AI J15 PR2: keep `s.shieldTeams === true` in sectorMode.ts at that meet (lead-notes.md).
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~21:40 SAVE (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP
"Now" + FOLDED-PLAN J-rows; Michael's "Decided" answers win. Marlow goes first on laptop and desktop CPU (Michael
~20:50); desktop near 100%: at most 2 builders, checkers read-only. Reports / briefs: C:/NightShift/scratch/campaign/
(lead notes: lead-notes.md). Rerun any agent below whose report file is missing.
1. #372 (this branch): train-ready + big-pr. Polish: coop-kit SIGNOFF.md:30 blank line.
2. J7 PR D origin/feature/mission-rules eb231778 = R0 docs + R1 + R2 + R3 + FD + KO fix (Teale KO = section restart,
   kill test `!alive && !ko`): checker PASS posted. Laptop set j7-prd queued on eb231778. Next: merge D into
   feature/mission-engine after green (PLAN section 4 stacking).
3. J7 PR E origin/feature/mission-rules-net = eb231778. Building: R4 two-player start (feature/mission-rules-r4, WIP
   bd08cf4e, report j7-r4-report.md); R5 campaign revives (feature/mission-rules-r5, no commits yet, report
   j7-r5-report.md). Then two Opus checkers each (src/net), merge into -net, R7 e2e (Sonnet), FE docs.
4. J7 R6 (PR F): strict brief being written: j7-r6-brief.md (with B4's names, `lines()`, sectorMode :833 feed line).
5. J3b PR B origin/feature/hud-guidance-b d81a3397 = A fix + B1 + B2 + B3 + B4 (each two Opus checkers PASS). Laptop
   sets hg-b3 (d4c01de7) and hg-b4 (e72c8eab) queued. Next B5 (brief hg-b5-brief.md being written; maybe own PR C).
6. J3 PR A #447 ececda7e: checker PASS x2; affected-e2e queued -> train-ready -> message the orchestrator.
7. Engine GB6 fix feature/mission-engine-gb6fix dc2aa9c8: laptop set mission-gb6fix queued; green -> merge into engine.
8. J8 / J9 Tallow: fix round 2 done + lead rulings (D0 defaults adopted, A29 clock door locked both sides, A30 TKL
   bulkhead bolted from the east-wing side) on origin/feature/mission-engine-j8j9fix2 5a687e75. Plan re-check 3
   running (j8-j9-plan-check3.md). PASS -> merge j8j9fix2 into the engine, then wave 0 (TD, G0, D0). Marlow told: long
   throws at links 28 / 33 (33 becomes 32 after D0), `exception: "long_throw"`, width 4.9.
9. TW23 feature/tallow-spec d42d1596 (stacked on #372): PR after #372 merges.
10. Known: J12 (Marlow) validator must accept tgc-3 `boltText`, drop oneChance / window.
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~20:50 SAVE (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP
"Now" + FOLDED-PLAN J-rows; Michael's "Decided" answers win. Desktop CPU often 80-100%: at most 2 builders; planners /
checkers read-only. Reports, briefs, checks: C:/NightShift/scratch/campaign/. Rerun any agent below with no report.
Michael ~20:25-20:45: Teale knock-out before he talks = section restart at his table (#372 BRIEF M6); closed Tallow
rooms night-lit only (tallow-fixes BRIEF M1); throw gaps "Mix of both" (M2: C4 pawn -> reading room and C5 arcade
roof -> W3 roof = 5.8 m throw over 4.9 m; C4 pie -> clock loft = plank bridge after Player's kit move).
1. #372 (this branch, 67464e03 + STATE; train-ready + big-pr). Polish: coop-kit SIGNOFF.md:30 blank line.
2. Engine origin/feature/mission-engine 6df8f334 = engine + #372 merged (B0) + Q19 rewards out (e4eace3b, tsc + 49
   tests green) + J8 BRIEF picks. GB6 wharf e2e test-bug fix on feature/mission-engine-gb6fix dc2aa9c8 (gb6-triage.md),
   laptop set mission-gb6fix queued: green -> merge into the engine; red further in -> Opus fix round.
3. J3 PR A #447 (ececda7e): checker PASS x2, waits on affected-e2e -> train-ready -> message the orchestrator.
4. J3b PR B feature/hud-guidance-b cac9a0a7 = A fix + B1 + B2; B1 + B2 checker PASS (hg-b12-check.md; polish ui.md:32-33,
   e2e-pad press(), CONFORMANCE HG5 / HG6). Next B3 (Opus, src/net, two checkers) -> B4 -> B5.
5. J7 mission-rules: plan PASS (j7-plan-check3.md). R0 done (e4eace3b). RUNNING: docs step on feature/mission-rules
   (Sonnet; WIP 0c3ba017: docs/mission-rules/{PLAN,BRIEF}.md + M6 polish); R1 rules core (Opus) on
   feature/mission-rules-r1 (worktree -mission-rules-r1, report j7-r1-report.md; brief = J7-PLAN section 11 R1).
   Next R2 (Opus) + R3 (Sonnet), PLAN section 2 waves.
6. J8 / J9 Tallow: re-check FIX (j8-j9-plan-check2.md: fold M1 / M2, pie-gap bypass, level-and-drop reach check, TGC
   stair walk line, D0 split defaults). RUNNING fix round 2 (Opus, report j8-j9-fix2-report.md; lead rulings in it:
   clock-mender door bolted both sides until the plank, flag date 2026-10-27). Then a fresh re-check, then builders.
7. TW23 Tallow SPEC: feature/tallow-spec d42d1596 (stacked on #372): PR after #372 merges.
8. Known gaps: mission-validator optional-without-reward + boltText (J12, Marlow); validator throw-gap row for the two
   5.8 m spots (Marlow, orchestrator told).
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~19:15 save (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: ROADMAP
"Now" + FOLDED-PLAN J-rows; Michael's "Decided" answers win. Desktop builder cap: 2 at once (orchestrator ~18:50) until
it says CPU < 80%. New rule ~19:00: free assets with commercial-sale licences allowed, credited (orchestrator msg).
Working notes, reports, plans: C:/NightShift/scratch/campaign/ (checker reports *-check*.md, builder reports hg-*.md).
1. #372 (this branch, head ab90a071 + this STATE): checker PASS x2 rounds, big-pr on; train-ready follows CI. Polish:
   coop-kit SIGNOFF.md:30 note needs a blank line above it (renders as a table row).
2. J1 docs #434: MERGED.
3. FLG fix: two Opus checkers PASS; engine pushed. origin/feature/mission-engine 08c9e094 = engine + FLG + GB5/GB6 +
   J7 PLAN. Laptop: set mission-flg-fix on f8b06637 queued (wharf-tgc / tkl / mission + coop group). First GB6 run on
   c74ce8f5 FAILED 1/3 in 44 s (wharf-tgc, wharf-tkl; logs on the laptop only): if f8b06637 also fails, Opus triage
   with the laptop log (ask Test Runner for C:/NightShift/scratch/laptop-queue/runs/<id>/).
4. J3 hud-guidance PR A #447 (feature/hud-guidance ececda7e, worktree -hud-guidance): minimap / compass / blips / HQ
   radar out, save v10. Two Opus checkers PASS (one docs fix round), checker status on ececda7e. Waits on
   affected-e2e, then train-ready -> message the orchestrator. Polish for PR B: HUD-present guard on the no-minimap
   checks, delete Grenades.positions(), damage.ts:38 comment, e2e-desktop wp > inset, ui.md:22 wrap, STATE.
5. J3b PR B: branch feature/hud-guidance-b (cut from b28293c1); B1 popup builder (Opus) on feature/hud-guidance-b1
   (worktree -hud-guidance-b1, WIP 9ad0b4f4; brief scratch/campaign/hg-b1-brief.md, report hg-b1-report.md). Next
   B2 (Sonnet) parallel with B1; B3 / B4 / B5 Opus (src/net, two checkers); merge order B1 -> B3 -> B4. Forward-merge
   PR A fix rounds into B. Plan: docs/hud-guidance/PLAN.md (plan check PASS after two fix rounds).
6. J7 (mission rules): BRIEF docs/mission-rules/BRIEF.md, PLAN docs/missions/slices/J7-PLAN.md on the engine
   branch (08c9e094). Lead ruling: a Teale KO / kill before he talks = protected section restart (G353), not a rule
   break, he stays at his table; only a rule break moves him (signed TGC page). Fresh plan re-check running (report
   scratch/campaign/j7-plan-recheck.md); PASS -> R0 then builders per the plan's waves.
7. J8 / J9 Tallow: plan scratch/campaign/J8-J9-PLAN.md (lead answers at its end); plan check running
   (j8-j9-plan-check.md). Michael asked via the orchestrator: closed Tallow rooms night-lit only (A1, assumed).
8. TW23 Tallow SPEC onto the template (G157 template from #443): builder (Opus) on feature/tallow-spec (worktree
   -tallow-spec, stacked on #372, WIP 2ad3ed9b; report scratch/campaign/tw23-report.md). PR after #372 merges.
9. Known gaps: mission-validator still needs an optional reward and must accept `boltText` (J12, Marlow).
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~18:25 (history) (Night Shift | Campaign Build; read this block first, older blocks are history)
Process: `docs/RULES.md` + `docs/VISION.md` from origin/master; start steps `docs/orchestrator/BOOT.md` "Campaign Build"
(origin/feature/menu). Plan: FOLDED-PLAN (feature/menu) signed off ~17:00; Michael's answers in ROADMAP "Decided"
override it. Tallow hold LIFTED ~18:05 ("Build now, walk later"); all six #372 pages signed off; the 12 level-rule
changes (G157) adopted ~18:20 (`docs/orchestrator/G157-12-changes.md` on feature/menu; Marlow edits level-design).
Campaign jobs: J1 docs, J3 / J3b hud-guidance, J7 engine rules, J8 / J9 Tallow greybox + shutters, J22 campaign mode,
J23 Tallow design docs, TW23 (SPEC onto the template), J25 / J26 later.
1. J1 docs PR #434 (feature/campaign-j1-docs, C:/NightShift/Mobile-Coop-campaign-j1-docs): Opus checker PASS on
   d51ef9d2; train-ready when CI is green. Polish (later, J3): tighten the stale-term allowLines; drop the coop.md
   blip exception when J3 removes blips; menu-ui/DECISIONS.md MD7 Map marker.
2. #372 (this branch): picks recorded 4f707252, rewards dropped 16a603ab (Q19), restart notes 26969f6a. Next: fresh
   checker on the head, then the orchestrator adds big-pr. Assumed: a Teale KO / kill restarts the section from its
   checkpoint, he does not then move (undo: add the move in the TGC BEAT).
3. FLG (mission flags): checker FIX (C:/NightShift/scratch/mission-flg-check.md); fix round f8b06637 on
   origin/feature/mission-engine-flg-gb6 (URL gate `mapBootAllowed`, host `sm` gated, owner Campaign); tsc + 2 test
   files green. Needs two Opus checkers (src/net/session.ts), then push the engine (local
   C:/NightShift/Mobile-Coop-mission-engine = feature/mission-engine + FLG + GB6 merges, head f8b06637).
4. Laptop: set mission-flg-gb6 on c74ce8f5 (wharf-tgc, wharf-tkl, sectorops:mission), first GB6 run.
5. Plans running / written to C:/NightShift/scratch/campaign/: J7-PLAN.md, J8-J9-PLAN.md; hud-guidance plan on
   feature/hud-guidance (C:/NightShift/Mobile-Coop-hud-guidance, npm ci done): docs/hud-guidance/{BRIEF,PLAN,STATE}.md.
   Each needs an Opus plan checker, then builders in parallel.
6. Known gaps: mission-validator (origin/feature/mission-validator) still requires an optional reward (now fails TGC /
   TKL graphs: J12 with Marlow); engine code still has oneChance / window, blips, rewards (J7).
7. Co-op kit order (orchestrator ~18:30, Player's J24 plan feature/coop-kit 34cfcad2): Player's part 1 (rope descent,
   shoulder stand) lands first; then the kit branch (feature/mission-engine-flg-gb6) adds wire kind `stand` and folds
   the `coopKit` flag into Player's per-move `kitMoves` list; Player's part 2 (the 5 new moves) starts after the kit
   registry PR is on master. Plan: hud-guidance PLAN pushed 2a702629 (A1 Opus + A3 Sonnet first, after a plan check).
CPU: the orchestrator paused new agents ~18:10 until desktop CPU < 80%.
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.

## OLD RESUME 2026-10-25 ~14:05 (history) save (Night Shift | Campaign Build; read this block first, older blocks are history)
Owner since 2026-10-25 ~12:50: Campaign Build (took Tallow Wharf, mission framework / engine and campaign rules from
Marlow Build; Marlow keeps level-validator V6, route-runs, guard-cap). Process: `docs/RULES.md` and `docs/VISION.md`
from origin/master; start steps: `docs/orchestrator/BOOT.md` "Campaign Build" on origin/feature/menu.

DOCS-FIRST HOLD (G346, G355; ROADMAP Now phase 1 row 2b): until Michael signs off the folded plan (Now row 6), no new
game work here. Finished PRs may ship. Job 1 = the plan-only conformance review
(`docs/orchestrator/review-briefs/campaign.md` on origin/feature/menu): branch feature/conformance-campaign, worktree
C:/NightShift/Mobile-Coop-conformance-campaign. DONE: PR #419 (S1-S25 summary, 7 Michael questions, proposed
jobs). Checkers PASS (c0d8c058 full; fix round 6b2b8635), `checker` success posted on 6b2b8635; orchestrator told.
HOLD (Michael 13:53 "plan comes first"): no doc fixes, no cloud briefs, no PRs until the orchestrator says Michael signed
off row 6. WIP kept, no PR: wip/campaign-doc-fixes 953f198f (HG12 menu SPEC / code inventory);
feature/mission-engine-flg-gb6 c74ce8f5 (local FLG + GB6 merges + 2 e2e lines; feature/mission-engine stays 00b6cde9
until FLG / GB6 checkers pass); cloud brief campaign-tallow-design withdrawn after Cloud Builder 1 claimed it (its WIP,
if any, on feature/tallow-design-docs). Restart notes for the #372 spec docs: GB6-brief.md :85, :113 (blips); PLAN
:38, :72 (window / seconds) with :37, :78, :83-84, :138, :217; coop-kit SIGNOFF has no intent check; TKL page reward
is a syringe (MF5); TGC page: Teale KO / kill softlocks (MF6).
Boot ~16:00 (new account): #419 MERGED. #372 conflicted with master only in CLAUDE.md: fixed by syncing CLAUDE.md
to origin/master (BOOT step 5).
PR A #372 (feature/mission-framework, this branch; code head 5181c9db): open; CI check green on the rerun, affected-e2e green;
no `checker` status, no `big-pr` label yet. ROADMAP Now 0b: the orchestrator ships it (checker on its head, big-pr,
Michael's sign-off pages). STATE-only pushes here restart its CI: batch them.

Parked by the hold (all on origin unless noted; resume after row 6 sign-off, ROADMAP Now 7-8):
1. Engine origin/feature/mission-engine 00b6cde9 = GB5 fix round b0cc988c (report scratch/gb5-fix-report.md; needs a
   fresh checker) + NET3 merged (checkers A + B PASS).
2. LOCAL ONLY in C:/NightShift/Mobile-Coop-mission-engine (HEAD bc9e6981, 8 commits ahead, not pushed): merges of
   feature/mission-flg c6542289 (FLG: flags `missions` / `coopKit`; report scratch/mission-flg-report.md; no checker
   yet) and feature/mission-gb6 cb562510 (GB6 wharf e2e; scratch/mission-gb6-report.md; never run) + 2 uncommitted
   lines (`missions=1` param in e2e-sectorops-mission.mjs, `const NET3 = true` in e2e-sectorops-wharf.mjs). Both
   branches are on origin; push the merge only after their checkers pass.
3. SS / CR hint-length fix merged here 5181c9db (Sonnet sync check FIX is answered; no re-check run).
4. NET4 polish brief on cloud-queue (briefs/mission-framework-net4.md). GBM waits for V6 (Marlow).
5. Phase 2 rows (after sign-off): Now 7 rule fixes (compass / blip / minimap / briefing and field-menu maps removed,
   objective popup View / O ~5 s, G336 G339 G343 G351); Now 8 GB5 / GB6, the 3 gate-reach ERRs (w2-reading-room
   20.0 s, w2-clock-loft 28.2 s, w4-jetty 15.8 s), A10 void, A12 re-plan (G339, G334), campaign cap 32 (G359).

Laptop queue: `node scripts/laptop-queue/request.mjs --sha <full> --pr <n> --suites "<space separated>" --set <name>
--requester "Night Shift | Campaign Build"`. Walk cap, train-ready and locks: RULES "Walk pacing", "Getting to
master", "Machines". Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / needs Michael.
Next: wharf triage fix -> merge into the failing heads, re-request laptop sets; act on 6 check reports + LP fix round; PR D green -> engine, cut tallow-fixes; mixamo-kit after #477 + i3 release.
the restart notes above, then ROADMAP Now 7-8 per CONFORMANCE.md 1d.

## SAVE 2026-10-25 ~09:05 (5-hour save; reset 13:10; read with the block below)
- NET3 550d99c4: checkers A + B PASS (mission-net3-check-{a,b}.md). Merge into engine AFTER the GB5 fix round: conflict only in tests/mission/sectorMission.test.ts (same decoy test as POL1): keep engine's copy, drop NET3's a56ebeab6 hunk; flip GB6 `const NET3 = true` in that merge. NET4 polish brief on cloud-queue (briefs/mission-framework-net4.md: late() uses sectorMission, checkMission id clamp, changelog + coop.md lines).
- WIP pushed: feature/mission-engine d45cdb4a (GB5 fix round in progress: tallowWharfSectors.ts, W2.ts, sectors.test.ts; resume from gb5-check.md must-fix 1-4, report gb5-fix-report.md), feature/mission-flg 3bc6be9c (FLG in progress: flags.ts, sectorMission.ts, teamController.ts, settingsScreen.ts; brief = PRC-split.md FLG). GB6 bdbb124a registered suites only: the script scripts/e2e-sectorops-wharf.mjs is not written yet (brief GB6-brief.md).
- SS / CR sync: Sonnet check FIX (mission-sync-check.md: 5 hints > 90 chars + 4 older overages) -> Opus fix round on feature/mission-sync; then merge feature/mission-sync into feature/mission-framework again.
- Orchestrator answers: C1-C9 stay STACKED (no retarget), label members together once each passes; big-pr for C8 and PR B on open.
- NEW JOB route-runs (ROADMAP Now 16): C:/NightShift/Mobile-Coop-route-runs, feature/route-runs off master 6c3f4a87 (no node_modules: npm ci once before builders). Opus plan running -> docs/route-runs/{BRIEF,PLAN,STATE}.md; if missing at resume, rerun the planner (ROADMAP Now 16 + Decided 2026-10-25 ~09:05 "Bot route-runs + your walk"), then an Opus plan checker, then builders in parallel.

## RESUME 2026-10-25 ~09:20 (new account, full burn; read this block first)
DONE since 08:20: EN4 + NET2 checkers A + B PASS (laptop en4 9/9 on c4a7e58f). GB5 533c02a6. POL1 453bae7b (merged into engine, ff). NET3 550d99c4 (feature/mission-net3: start.sm sector mission id, client follows host, host offSection / firstPlace, team 'end' attempt key, FIXED_DT, decoy test; 331 tests). SS / CR re-synced to Sector Ops SYNC.md 7c021f01 (Michael's S1-S5 picks) 9cb3a627, merged here 79996fd7 (0 mission ERR). Briefs GB6 / GBM / PRC-split 14cebca3 (docs/missions/slices/).
RUNNING (reports in C:/NightShift/scratch/; rerun from the brief if no result on origin):
1. GB5 checker FIX (gb5-check.md: Fenn faces desk, tgc-opt board in stair core, takedown spots, retyped coords) -> Opus fix round in -mission-engine (commits "mission-framework GB5 fix:"; report gb5-fix-report.md). Then a fresh checker on the fix.
2. NET3 checkers A (mission-net3-check-a.md, also covers POL1) + B (wire, -mission-net3-cb detached; -check-b.md); statuses checker-a / checker-b on 550d99c4. Laptop set mission-net3 (coop, netmove, sectorops:mission). Both PASS -> merge NET3 into engine and flip GB6's `const NET3` to true in that merge.
3. GB6 Sonnet (-mission-gb6, feature/mission-gb6; suites e2e-sectorops:wharf-tgc / :wharf-tkl) -> merge into engine -> laptop.
4. FLG Opus (-mission-flg, feature/mission-flg: flags missions 10-27 / coopKit 10-28; no pull offer on Marlow lips with coopKit off) -> checker -> merge into engine before the PR C split.
5. SS / CR sync Sonnet checker (mission-sync-check.md, status on 9cb3a627).
Laptop: mission-engine-gb5 on 533c02a6 (sectorops:mission, coop, netmove). Suites are SPACE separated (a comma-joined request fails).
WAITING: V6 fix on cloud-queue (Cloud Builder 1; fix commits 0410023e / 2ab1fe18 on V6) -> review -> V6 PR -> PR B; GBM after V6 done + greybox checker PASS. PR A #372: orchestrator close / reopen sweep after #378 (do not gh run rerun). Asked the orchestrator: stacked PR bases for C1-C9, big-pr for C8 and PR B.
guard-cap: M1 verdict bbdedebf (caps stay; C1 + C2 triggered; Michael 08:50 "shadow in view = seen"); C2 brief 1f2db1f5 with Test Runner (gate #317 + C1 + Guard AI rule); --query d76b5372; C1 (ours, Opus) waits gm-flip #375 + coop4 #317: ping Test Runner when C1 is on master.
Sector Ops pings when S2 / S4 greybox data lands: re-run SS / CR validate. campusOps.ts: our only lines are the CAMPUS_MISSION_TEST import + `missions:` after `sectors:` (told the orchestrator).

- ~05:15 NET checkers A + B PASS (polish -> later batch: stale pull pair in kitPairs ~3.9 s, host-holder 1-tick catch, attempt id on hangEnd, shutter pair lapse, courseMode gadget kinds, per-kind gused window, behavioural revealIntel test) -> merged into engine aba7dc44 (tsc clean); laptop mission-net set on 5d3f7ae1 pending. GB0 DONE 563b9e6d (shell, kit, W1-W4 stubs; Tallow Wharf shows in the Sector Ops menu / lobby: GB5 adds a listed filter or leaves it unlisted). GB1-GB4 RUNNING (Sonnet, worktrees -mission-gb1..4, branches feature/mission-gb1..4 off 563b9e6d). Then merge all four into engine -> Sonnet greybox checker -> GB5 -> EN4.
- ~04:45 PR A #372 OPEN (specs + six sign-off pages; spec checker FIX -> fix round 83174c38; no big-pr needed); label train-ready on CI green (if auto mode blocks, the orchestrator labels). GB-briefs aa762a41; engine merged mission-framework 286c290c; GB0 RUNNING (Sonnet, engine worktree). BRIEF A19-A23 + PLAN EN4 19d5579b. NET DONE feature/mission-net 5d3f7ae1 (on d1c3ad4c; gused for frag / mine / stickyCam; kitNet.ts verdicts; missionMirror.ts; pull verdictWait 0.25): checkers A (mission wire) + B (kit wire) RUNNING (C:/NightShift/scratch/mission-net-check-{a,b}.md), laptop coop / netmove / sectorops / ctcourse on 5d3f7ae1 (set mission-net). After both PASS: merge mission-net into mission-engine. Kit e2e (pull / shutter in co-op) needs a map that places them: after GB + kit-tick.

- ~05:45 Greybox fix round DONE 09664eda (113 tests; new asserts fail on old maps; climbRoom + ladder top-out tests). Playtest note: W4 north arm end (z 29.4) 3.0 m over shed three roof: check a step-off cannot skip C8-C10. RUNNING: GB5 (Sonnet, engine worktree; + EN4 start/guards, cart gate both leaves, W3_KEY_POSTS, unlisted map filter), EN4+NET2 checkers A (-mission-en4 detached) + B (-mission-net2 detached) -> C:/NightShift/scratch/mission-en4-net2-check-{a,b}.md. NEXT: NET3 (mission id in lobby start -> startSlotPoints), GB6 (wharf e2e) after GB5 + NET3, GBM after V6 fix.

## SAVE 2026-10-25 ~05:25 (orchestrator save, cap ~05:35, resume at the 09:10 reset)
DONE since 04:20: EN2 fix d1c3ad4c; NET 5d3f7ae1 (checkers A + B PASS) merged into engine aba7dc44; GB0 563b9e6d + GB1-4 (8dd371b2, 8fbc33e6, d1c822e5, 9cf0ac43) merged -> engine cf3532f4 (tsc clean; tallowWharf tests pass; ONE FAIL rooms.test.ts:125 w1-tea-stall overlaps w1-market). PR A #372 open: CI red ONLY on pr-size (known CI bug; orchestrator hotfix #378 waits for Michael) -> after #378 merges: gh run rerun 40118368406 --failed, then label train-ready (or ask the orchestrator). V6 fast-forwarded to V6e-2 425c4e20 (feature/level-validator-v6; #346 merged). Cloud done: kit-tick 93ef5c1e, val-dims 0c62a921.
Laptop queued: mission-engine-gb on cf3532f4 (coop, netmove, sectorops, ctcourse, section-rating, menus, levels); mission-net on 5d3f7ae1; mission-engine-en2fix on d1c3ad4c.
RUNNING at save (rerun any whose result is missing; reports in C:/NightShift/scratch/):
1. Greybox checker FIX (greybox-check.md: 3 room overlaps, W3 roof drop / mantle skips C7, C7 / C9 no climb room, W2 hatch ladder tops out in the hole) -> fix round RUNNING (Opus, engine worktree; rerun from the report if no commit "GB: fix round" on origin); then GB5 (Sonnet, GB-briefs.md GB5 + W3 cart-gate both leaves bolted, W3_KEY_POSTS, unlisted map filter) -> GB6 / GBM.
2. V6 checker FIX (v6-check.md: shadow band on non-encounters, reach speed, drop times, guard-band docs) -> fix round POSTED on cloud-queue briefs/level-validator-V6-fix.md (pushes to feature/level-validator-v6). On done: review, then PR (V6, base master); then PR B (feature/mission-validator, now incl. VAL-DIMS 0c62a921) stacked on it.
3. KIT-TICK PASS -> merged into engine 8d4dcb14 (polish later: crawl request timeout run.asked into tick). Campus a2cf369a (S5 rope -> rappel + climb) 0 ERR with kit dims; SS / CR 0 ERR.
4. VAL-DIMS PASS -> merged into feature/mission-validator 0c62a921. Tallow shutters gap 0.9 added. Sector Ops told: S5 s5-arch -> s5-well rope is a descent (1 campus ERR until they flip it).
5. EN4 DONE (2c4ffd0c WIP + 2d49b032 + 5d6ec8c4; 107 tests): MissionDef.start, guards [{section, slots?}], HUD on g.hud.el (host) and coopClient.ts:221-227 / :1162 (client), spawnPlace.ts:101 start points. GAP (NET3): a co-op client learns the sector mission only from its own ?mission= URL (session.ts clears it outside infiltration): carry the mission id in the lobby start message -> startSlotPoints.
MERGED EN4 + NET2 into engine c4a7e58f (tsc clean). NEXT at resume: TWO Opus checkers on EN4 + NET2 (diff 8d4dcb14..c4a7e58f, src/net + sectorMode hooks); laptop coop / netmove / sectorops (incl. mission + HUD assert) on c4a7e58f; then NET3 (mission id in lobby start) + GB5.
6. NET2 DONE 156cd4ff (feature/mission-net2; also touched coopClient.ts :304 / :340 for the attempt key in hangEnd s field; clientRead extracted :1784). NOT yet checked: TWO Opus checkers with EN4 (CPU 100% at the 05:30 cap).
After 5 + 6: merge both into engine; one Opus checker on EN4 + NET2 (+ second Opus on NET2 src/net); laptop coop / netmove / sectorops.

## RESUME 2026-10-25 ~04:20 (window reset; next 09:10)
- PR #365: checker B PASS, A FIX -> fix 0fe98298; CI + laptop 2/2 green. Orchestrator re-checks the fix and labels (self-approval blocked here).
- Engine 9e87b4b3 laptop e2e 13/13 PASS (sectorops 1-6 + mission, section-rating, ctcourse, menus). EN2+EN3 checker FIX (double restart, oneChance end skippable) -> EN2 fix round RUNNING (EN2 builder, feature/mission-engine; also hold-exit during pending restart, objective codes before gate, decoy slot, spook-while-held, namedTarget intel lines, flags.mission, Hints text).
- NET RUNNING (Opus, worktree -mission-net, feature/mission-net off 9e87b4b3): mission wire ms + intel eid + client apply; kit kinds pull / shutter on tmove / tstart, claimsPoint l, teamSide crouch, hangEnd verdicts, pull latency hold, remote poses. Then TWO Opus checkers + laptop e2e-coop / netmove / sectorops:1 + mission / ctcourse.
- Cloud-queue OPEN (Marlow): briefs/mission-framework-kit-tick.md (KitMove tick + kit polish, branch feature/mission-kit-tick off engine 9e87b4b3), briefs/mission-framework-val-dims.md (validator kit dimension checks, feature/mission-validator-dims off 4ea5d26b).
- Resumed after the cap: spec batch checker (C:/NightShift/scratch/mission-spec-check.md) and GB briefs writer (docs/missions/slices/GB-briefs.md, uncommitted until done).
- NEXT: spec PASS -> PR A; GB0 then GB1-4 (Sonnet from GB-briefs.md; greybox may proceed, orchestrator 04:14).

- ~00:40 EN2 DONE (2109b102, 57010ebb, 0f0f8c2a; world restarts whole, mission state per team; MissionTrack.y; missionEvent {name,guardTag,postId,via?}: c1 / c1-door, c2 / c2-door). Merged EN3 + KIT0 + kit-pull + kit-shut into feature/mission-engine -> 9e87b4b3 (tsc clean). Laptop: e2e-sectorops (1-6 + mission) + section-rating + ctcourse + menus on 9e87b4b3 (set mission-engine-en23). RUNNING: EN2+EN3 checker (C:/NightShift/scratch/mission-en23-check.md), spec batch checker (C:/NightShift/scratch/mission-spec-check.md). Graph engine-fit DONE a643558d (rope up only; throws 2.5 m; ladder -> boost; jetty 4.4). NEXT: spec PASS -> PR A; EN23 PASS + laptop green -> NET (Opus, TWO checkers; lists in kit + en23 reports; + KitMove tick fix) and GB0 (Sonnet, Opus brief) -> GB1-4.

## SAVE 2026-10-25 ~00:05 (orchestrator save, cap ~00:15, resume at the 04:10 reset)
DONE this window: EN1 + fix 37247995 (merged into feature/mission-engine, pushed); VAL + fix 6936a6e4 + fragment a8a7f77a; KIT-PULL 830abf69; KIT-SHUT 85189e05; CMG e11b9e06; CMS 99f6f08c; TGC 1e260340; TKL 39b4c933; SS + CR first pass 522533f7. Laptop queued: e2e-levels on a8a7f77a (set mission-val).
RUNNING at save (rerun any whose result is not on origin; WIP pushed where files existed):
1. EN2 (Opus, -mission-engine, commits "mission-framework EN2:" itself). Brief: PLAN EN2 row + 23:55 items + track `y` height band (Split Shift) + per-team restart via tracker.restartTeam (ruleTracker.ts:140) -> runner.restore(section, now, team) (missionRunner.ts:334) / resetSection(now, hold, scope) (ruleTracker.ts:307); spook via keepOnRestore (:294) / spookStep (:49); e2e part scripts/e2e-sectorops-mission.mjs (lead queues on laptop).
2. KIT checker PASS (C:/NightShift/scratch/mission-kit-check.md; 587 tests on the merge): merge KIT0 + kit-pull + kit-shut into feature/mission-engine AFTER EN2 finishes. Before the wiring slice: KitMove `tick?(h, run, dt)` called every fixedUpdate before the !alive return, syncShutters moved there (else a shutter freezes open on a page left behind by a disconnecting holder). NET list (7 items) in the report: kit kinds on the wire, claimsPoint `l`, teamSide crouch, hangEnd verdicts (pullVerdict, only b sends pull), pull latency hold, client apply + poses. Polish for a later batch: underZone 0.3, shutterOffer busy, KitHost hangPoint / health typing, floor probes at catch / crawl ends (map data keeps them level and 0.7 m clear).
3. Graph engine-fit (Opus, this worktree, lead commits; WIP e8396bbe): Tallow Wharf rope descents 8.4 / 8.4 / 10 m vs rope code max 6 m, throw gaps 3.5 / 4 m vs 3.2 m landing, ladder 4.1 m vs 4.5 m lip, jetty lip 4.2 -> 4.3-4.5 (SPEC "Engine questions"); re-validate map + TGC + TKL, regen SVGs.
4. SS + CR re-run over Sector Ops 6b13cd32 (Opus, this worktree split-shift / code-relay; may commit "VAL: tracks.exfil counts as exfil" on feature/mission-validator).
5. Joint interrogation flake = GAME BUG (feature/joint-flake-3, worktree -joint-flake-3 off master bd8920c2): host misses a client read's end when no host frame lands in the read's last 0.3 s (intel.ts:103 interrogationEnded). Fix: count the end once any read was seen and the sub bit drops while the hold continues; check coopHost interPh clears at hold end (:1006 / :1242); tests/intel.test.ts; fragment patch. Then: laptop e2e-coop + Opus checker in parallel -> PR -> train-ready (Orchestrator + Test Runner asked for it).
   -> DONE 2d8f201e, PR #365 open; laptop e2e-coop + e2e-netmove queued (set joint-flake-3); checkers A + B running (reports C:/NightShift/scratch/pr365-check-{a,b}.md; rerun if missing). Both PASS + laptop green + CI -> `gh pr edit 365 --add-label train-ready` + message the orchestrator.
6. EN3 (Sonnet, worktree -mission-en3, branch feature/mission-en3 off mission-engine 37247995): src/ui/hud/missionHud.ts + gameplay.hints setting + Gameplay "Hints" row; tests settings / settingsCover. Then merge into feature/mission-engine; EN2 + EN3 checker (Opus). -> EN3 DONE f7c61a71 (23 tests; title fixed "Objectives", HUD injects its own <style>): merge into mission-engine AFTER EN2 finishes (EN2 agent commits there). PR 365: checker B PASS, checker A FIX (aborted partial read left a stale interPh) -> fix round 0fe98298 (interPh cleared at td start / end / kill, 2 CoopHost tests, 47/47). Laptop e2e-coop + e2e-netmove requeued on 0fe98298 (20261024T131255-...-0388). On laptop green + CI green: label train-ready + message the orchestrator.
7. SS + CR DONE: re-run 3f5cc939 + ids on Sector Ops fe3ef35f 27487ca0 (campus + Split Shift 0 ERR / 0 mission WARN; Code Relay 0 ERR, 2 WARN by design). VAL 4ea5d26b tracks.exfil.
NEXT: spec batch checker (Opus: CMG / CMS / TGC / TKL / SS / CR / KITS vs audit section 4 + M1-M3) after items 3 + 4 -> PR A (feature/mission-framework) for Michael's sign-off; PR B when the V6 PR opens; NET after EN2 + EN3 + kit checker (TWO Opus checkers).
KIT notes for NET / Player / Guard AI: pull catchDrop 1.8 m under edge (Player: catch pose stretch); shutter needs TeamSide.crouch from PF.crouch, `tmove` kinds 'pull' / 'shutter', pull t0 + pullVerdict on hangEnd, remote pull role-a pose (teamPoseOfWire); Guard AI: noticeOpenDoors loops shutter devices (shutterNoticePoint, SHUTTER_NOTICE).

## SWAP RESUME 2026-10-24 ~23:25 (wall clock; new account, 5-hour 0%)
- Found: VAL done 50988ac8 (feature/mission-validator); guard-cap M0 verdict a2c4dd7b; EN1 fix cut off (WIP committed 51101b28 on feature/mission-en1); CMG / KIT-PULL / KIT-SHUT had no files.
- RUNNING (Opus, all relaunched ~23:25): EN1 fix (-mission-en1, from 51101b28), KIT-PULL (-mission-kit-pull), KIT-SHUT (-mission-kit-shut), CMG (this worktree, graph.json only, lead commits), SS + CR graphs / PLAN.svg / SIGNOFF (this worktree, lead commits), VAL checker (report C:/NightShift/scratch/mission-val-check.md). If cut off: rerun from PLAN rows; builders commit + push their own branches.
- ~23:55 VAL DONE: checker FIX (sync key) -> fix round 6936a6e4 (reads `sync` + `syncs`, choke WARN scoped to mission sections; 138/138) + fragment a8a7f77a. PR B opens (base feature/level-validator-v6) when the V6 PR opens (V6e-2 still open on cloud-queue).
- ~23:50 SS + CR graphs / PLAN.svg / SIGNOFF committed 522533f7 (0 mission ERR once Sector Ops' S2 data lands). Sector Ops took all S2 node needs (comms panel, held 55 / 56 cut, sync-s2-atrium, pairdoor solo, two leads, exfil tags, `syncs` key, area boxes, S2-plan svg); they message when pushed -> re-run SS / CR validate + SVG over their data.
- NEXT: EN1 PASS -> merge EN1 into feature/mission-engine (create on origin) -> EN2 (Opus) + EN3 (Sonnet); KIT-PULL + KIT-SHUT -> one Opus batch checker KIT0+PULL+SHUT; CMG -> CMS + TGC / TKL graphs; spec batch checker -> PR A.

## SAVE ~00:25 (orchestrator 85%; no swap, resume at the 03:10 reset)
- EN1 checker FIX (2 must-fix: per-team step budget in sector mode; per-team restart restore(section, now, team?) / resetSection(..., scope?)) + 4 polish; fix round sent to the EN1 builder (feature/mission-en1). If its fix is not on origin at resume: rerun the fix from this line (Opus, worktree -mission-en1). Then merge EN1 into feature/mission-engine and start EN2 (brief items in the 23:55 block: per-team restart, per-area alarm stages, spookStep (not a flag) survives restore, Guard AI events {name, guardTag, postId, via?}, onAlarm on camera stage for CR) + EN3 (Sonnet, objectiveRows(runner, team, hints)).
- Running at save: VAL (WIP 97cbd290 on feature/mission-validator), CMG (no file yet: rerun from PLAN row CMG + the BEAT spaces-needed lists if missing), KIT-PULL, KIT-SHUT (no files yet: rerun from PLAN rows if missing), guard-cap M0 REPORT (feature/guard-cap; rerun if REPORT has no "2026-10 re-measure (M0)" section).

## Now (2026-10-24 ~23:55)
- ~00:15 EN1 DONE d0532377 (36/36; API in its report: MissionRunner snapshot/restore, RuleTracker, objectiveRows, pack/parseMissionWire); Opus checker running. KIT0 DONE 6a202677 (registry src/game/kit/registry.ts, import.meta.glob load; 342 tests green); KIT-PULL + KIT-SHUT running (worktrees -mission-kit-pull / -kit-shut off kit0); batch checker after both. NET must: fold KitKind into TeamKind (teamMoves.ts, one line) + drop the cast in TeamController.kitRequest; tuner moveTune.ts sections + coop.md text later (FRAG / docs). guard-cap M0 REPORT verdict agent running (feature/guard-cap).
- Wave 1 DONE so far: KITS 71977e5d; GSVG 6d731e69 + checker fix 074c55c0 (checker FIX 1 must-fix, done; polish: grid 10 m vs plan-svg 6 m, --base id prefixes, = option form, --dump-rooms needs repo cwd, extent cap); BEAT TGC + TKL 95a23229; BEAT SS + CR 7bb695ad. Running: EN1, KIT0, VAL, CMG.
- PLAN 4c clip list AGREED with Player Build (e3c1eb0c); forwarded to KIT0.
- Sent Sector Ops the SS / CR nodes-needed; Guard AI the two walk-to behaviours (SS facilities officer -> new board; CR supervisor -> cage).
- EN2 brief MUST include (from the BEATs): (1) per-team section restart (M1; sectorMode.ts:1158 restartSection resets all today); (2) per-area alarm stages (one site stage today); (3) the TGC spook flag survives a section restart (exception to the section-facts reset; fallback in TGC BEAT); (4) mission events for Guard AI walk-to hooks. AGREED with Guard AI ~00:05: EN2 raises {name, guardTag, postId, via?}; after Michael signs off, Guard AI adds em.missionOrder(guardTag, 'reset' | 'walk', postId) over Enemy.resetBreaker (src/ai/enemy.ts:1285) / Enemy.sendTo (:1138); spook stays despawn / respawn (A11). Send Guard AI the go at sign-off. VAL told: step budget per team for Sector Ops, solo sum INFO.

## Earlier (~23:25)
- PLAN d80cb783 up (orchestrator told). Michael corrections folded (M1-M5: Marlow keeps its marks; full co-op kit; new campaign map Tallow Wharf, greybox overnight after the sign-off page).
- WAVE 1 RUNNING: EN1 Opus (worktree -mission-en1, feature/mission-en1), KIT0 Opus (-mission-kit0), VAL Opus (-mission-validator, feature/mission-validator off level-validator-v6 220596bc), and in THIS worktree, uncommitted until the lead commits: GSVG Sonnet (scripts/graph-svg.mjs, tests/graphSvg.test.ts), CMG Opus (prototypes/campaign-map/graph.json), KITS Haiku (prototypes/coop-kit/SIGNOFF.md), TGC + TKL BEAT Opus, SS + CR BEAT Opus. feature/mission-engine worktree (-mission-engine) is the merge target for EN / KIT / NET / GB slices.
- Worktrees use node_modules junctions (disk: C: was 1.6 GB free ~23:10; 5.9 GB after clearing finished worktrees' node_modules).
- Sent: Player Build the clip list (PLAN 4c) for KIT-PULL / KIT-SHUT, waiting on agreed or changes. Sector Ops sync contract agreed (A16); their pages on feature/sector-redesign-signoff.
- NEXT: wave 2 per PLAN 6 (EN2 + EN3 after EN1 check; KIT-PULL + KIT-SHUT after KIT0; CMS after CMG + GSVG; TGC / TKL / SS / CR graphs + SVGs). Tell Sector Ops EN2's hook lines (PLAN EN2 row) before EN2 starts.

## Done

## Resume prompt
```
Night Shift | Campaign Build: read docs/missions/STATE.md "RESUME 2026-10-25 ~13:10" block first (docs-first hold; job 1 = conformance review, feature/conformance-campaign). Rules: docs/RULES.md and docs/VISION.md from origin/master; start steps docs/orchestrator/BOOT.md "Campaign Build" on origin/feature/menu.
```
