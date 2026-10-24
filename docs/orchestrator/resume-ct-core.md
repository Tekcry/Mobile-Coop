# Resume - Night Shift | Player Build (updated 2026-10-23 ~21:40 after the swap; live state in docs/guard-models/STATE.md "RESUMED" line)

RESUMED ~23:55 (new account; orchestrator: overnight mode, one slice at a time, testing backlog first, save at 5-hour ~95%):
#247 laptop afp PASS on fd34263e + CI green -> train-ready label added, orchestrator told (joins train 39 with #269).
~15:40: #308 CI test stub fixed (d49097df); laptop 18/19, e2e-stealth-ai "search area / near" FAIL (guard sees the player
0.3 s after a tp): Opus fix running on feature/rig-pose-fix, then e2e-stealth-ai alone on the fix head. Spare jobs #2 #3 #7
#11 #16 all already on master (told orchestrator); #12 = #308. NEW: #15 optic cable rest (co-op MoveState optic + team
pings + non-door anchors), Opus builder in worktree optic-coop (feature/optic-coop off master; docs/optic-coop/REPORT.md);
wire change expected (train bumps PROTOCOL). guard-models: G8 rerun queued 20261024T020601-...-e643.
~15:00: PR #308 rig-pose-fix OPEN (4adf3785; alloc fix merged; checks W1 / S1-A fixed / net B PASS). Laptop 11 suites
20261024T014839-player-build-4adf3785-d290 (status laptop-e2e/rig-pose-fix): pass -> label train-ready + orchestrator;
fail -> Opus triage at once. guard-models G8 shadow-cull builder running (gm-g8cull), then cap rerun sectorops +
campusops, flip decision, guard-models e2e set, guard-models PR.
~14:40: rig-pose-fix ALL 7 slices merged (988869a8; S1 fix round incl.); checks W1 PASS, S1-A FAIL->fixed; checker B on
all src/net running (CHECK-NET-B.md). WAITING for CPU < 80% (93% at 14:40) to start: (a) playerVolumes alloc test fix
(worktree rpf-alloc, branch feature/rpf-alloc: 67.8 B vs 4 x 16 B; find the extra box, do not raise the limit), (b)
guard-models G8 shadow-cull fix (worktree gm-g8cull: G8 HOLD, sectorops CPU +0.6-1.7 ms p95 vs +0.5; lamp shadow draws
24->50: figure culling box vs lightRig.ts fillCasters; then rerun cap sectorops + campusops). Then rig-pose laptop batch run
+ fragment + PR. guard-models e2e set after the flip decision.
~13:30 rig-pose-fix: S1, S2, S5, S6, S7 MERGED (bb750a5b); W1 check PASS (S2/S5/S6/S7). Running: S3 (rpf-s3: guard head,
dog puppet, one sim eye, hand side, body floor probe), checker A on S1 (CHECK-S1-A.md). Then checker B on all src/net,
one laptop batch run, fragment, PR. S1 decisions for the orchestrator: client headshot-able on host (x1.3, legs x0.75),
host uses latest accepted client state (not the 0.1 s drawn copy). guard-models: bake BUNDLED ae211857; checks rerun
20261024T004757-...-e911 + G8 cap 20261024T004923-...-820d queued (Test Runner relays); MPFB2 now on the laptop.
~11:40 NEW JOB rig-pose-fix (Michael ~11:25 approved; on ROADMAP): branch feature/rig-pose-fix (worktree
rig-pose-fix, own npm ci; off master 4.88.1 0fab0afa; docs/rig-pose-audit/ BRIEF / PLAN / STATE / REPORT). Wave 1 Opus
builders running: S1 player body model + wall head (rpf-s1), S2 shot origin (rpf-s2), S5 body pos (rpf-s5), S6 dog head
(rpf-s6). Then merge each into feature/rig-pose-fix, one Opus checker for the wave (+ a second on src/net), laptop suites,
wave 2 (S3 guard head incl. S6's enemyPuppet one-liner, S7 small batch), one batch PR. guard-models: full bake queued.
~08:00: #269 + #282 RELEASED in 4.85.0 (train 42): coop-rejoin done. MPFB2 zip confirmed on the laptop (Michael):
the full bake 20261023T202119-...-a8ff2d45-5e1d can run (not started yet; status laptop-e2e/alone-guard-bake-all).
~07:50 FULL BURN: #269 + #282 laptop coop + netmove 2/2 PASS on 0e65c3eb (post master merge) -> train 42 ready.
guard-models 125b0826 (G9 docs merged). FULL BAKE queued 20261023T202119-player-build-a8ff2d45-5e1d (all stages + sheet;
probe fails fast if MPFB2 still missing). Flag-on e2e-enemies sniper fail: Opus triage = NOT the flag (sniper fires no
round: master AI shooting gates S16 / S21 or stale test; e2e-enemies is a LEGACY suite); A/B flag-off queued
20261023T202045-player-build-a8ff2d45-5437 (if it also fails: report to Guard AI via orchestrator). G7 pre-flip items
were done in G7b. Next: bake verdict -> copy shippables from bake/guard-models into src/operators/assets/guards/, sheet
to Michael, G8 (guard-cap on / off + look check, laptop alone), then the guard-models PR.
RESUMED ~04:50 (window reset): 4.84.0 released (train 40, #247 on master). #285 OPEN train-ready (AF0 numbers test only with
AFP_WRITE_NUMBERS=1; it rewrote tracked docs/anim-fix-pass/before/numbers.md and stopped the 4.84.0 release). #269 a6a792b8 +
#282 0e65c3eb: master merged, conflicts resolved, train-ready for train 42 together; laptop coop + netmove on 0e65c3eb
(20261023T175516-player-build-0e65c3eb-eaed): on fail -> Opus triage at once. Then idle (guard bake waits on MPFB2).
SAVE ~04:20 (orchestrator 90%, resets 04:40, it wakes us ~04:47). All worktrees clean + pushed; no agents running.
#282 coop-rejoin-2 OPEN (stacked on #269, laptop coop + netmove 2/2 PASS on 03a0cf58, train-ready label). NEXT on wake:
when train 39 has released, merge master into feature/coop-rejoin (keep both; drop unused P2_START_DZ; tests joinWatch /
coopRejoin / spawnSlots + tsc), push; merge feature/coop-rejoin into feature/coop-rejoin-2, push; CI green -> both in
train 40. guard-models: one laptop alone bake (all stages + sheet) once Michael copies the MPFB2 zip.
~02:25: laptop coop + netmove queued on 03a0cf58 (20261023T144638-player-build-03a0cf58-edce, status laptop-e2e/coop-rejoin-2):
on pass open the PR (orchestrator: no need to wait for train 39). rig-pose-audit waits for Michael. Idle otherwise.
~02:20: coop-rejoin-2 READY on 03a0cf58 (polish 1, 2, 5 + check A1 / A2 / B3; checkers A 94571062 + B b68bacf1 PASS;
CHECK2-B polish 1-2 left open). After train 39 releases: master into feature/coop-rejoin (resolve), then feature/coop-rejoin
into coop-rejoin-2; laptop coop netmove on the coop-rejoin-2 head; PR coop-rejoin-2 (after #269 merges, or stacked) -> train.
Nothing else unblocked: guard-models waits for MPFB2 on the laptop (one alone bake, all stages + sheet); AF7-AF9 wait for
Michael's walk; rig-pose-audit fix slices need orchestrator / Michael priority.
~01:55: #269 left out of train 39 (conflicts with train members, not master: courseMode.ts vs guard-ai-s22-game /
marlow-polish6 SPOT_HOLD; coopHost.ts imports vs anim-fix-pass / sector-redesign-art ClockSync, CT). Orchestrator agreed:
when train 39 releases, merge master into feature/coop-rejoin (keep both; drop unused P2_START_DZ), tests joinWatch /
coopRejoin / spawnSlots + tsc, push, label stays -> train 40. Then merge feature/coop-rejoin into coop-rejoin-2.
~01:45: guard-models G2, G4 (fix round, re-check PASS), G4s sheet + polish all MERGED (feature/guard-models a8ff2d45).
Pipeline code complete; blocked on ONE laptop alone bake (all stages + sheet) until the MPFB2 zip is on the laptop (Michael).
#269 ct:4 rerun PASS (flake confirmed). coop-rejoin-2 (worktree coop-rejoin-2, stacked on #269): Opus builder on RECHECK
polish 1, 2, 5; then 2 Opus checkers + laptop coop netmove, PR stacked on #269 (same train or next).
#269 ~00:30: laptop 11/12; e2e-ctcourse:4 A8 grille flake (Opus triage: pre-existing, test fix fa95bc8c in #257) ->
train-ready label + orchestrator told (train 39 with #247, ideally #257). Solo ct:4 rerun 20261023T131134-player-build-f13b91e7-b2c2.
guard-models: G2 done d51b5f14 (smoke ok), Opus checker running -> G2-CHECK.md on gm-g2; then merge, LIBS.garments fix,
G4 builder resume (gm-g4 99fee789). Then coop-rejoin follow-up batch (RECHECK polish 1, 2, 5).
~23:35: #247 laptop afp RUNNING on fd34263e (CI green): on pass -> train-ready label + message orchestrator.
#269 coop-rejoin (feature/coop-rejoin, worktree coop-rejoin): checker A FAIL (B1 rejoin race) -> Opus fix round
327e73f4 (JoinWatch) -> re-check PASS (f13b91e7, docs/coop-rejoin/RECHECK.md). Laptop coop netmove ctcourse sectorops
20261023T122212-player-build-327e73f4-35c5 (set coop-rejoin): on pass -> train-ready + message orchestrator.
Follow-up batch (not in #269, keeps the laptop verdict): RECHECK polish 1 (joinWatch.ts:128/134 load-gap state
bypasses the in-flight skip: closes the rare restart-during-reload way back into item 7) + 2 (hold ends an open watch)
+ 5 (coop.md:83 wording). guard-models: STATE "~23:30" (G1 fix, G1h fix, G7, G7b, G9 merged; one bake 816419f7 queued,
needs MPFB2 on the laptop; flag-on run b8ca0a2e queued; G2 / G4 building).
RESUMED ~22:35 (new account): #247 fd34263e CI GREEN; laptop request 20261023T112112-...-fd34263e-d9aa still queued
(queue backed up ~20 deep): on green -> label train-ready + message orchestrator. coop-rejoin: builder cut off with
uncommitted work, saved as WIP d9fcb6be; Opus builder resumed (report docs/coop-rejoin/REPORT.md). guard-models: see
docs/guard-models/STATE.md "RESUMED ~22:35" (G1 fix merged 0356bd58; laptop MPFB2 missing, Michael copies the zip;
bodies rebake queued; G1h / G7 checkers, G2 / G4 builders running). Orchestrator 22:41: CPU 97-100%, no new agents
until it says < 80%.
#247 ~22:25: head fd34263e = real per-frame alloc fixed (AF1 / AF3 non-inlined approach / clamp / smoothstep calls written
inline, bit-identical; mocapStrafe matches master). CI pending on fd34263e; laptop 20261023T112112-player-build-fd34263e-d9aa
(anim clip coop netmove menus, set afp). Both green -> gh pr edit 247 --add-label train-ready + message orchestrator.
HIGH ~22:15 (orchestrator, WALK-4.82-REPORT.md items 7 + 4): coop-rejoin = rejoining / reconnecting client spawns at
the host's current checkpoint or beside the host with section state; two-slot spawn points (Marlow places them). Opus
builder in C:/NightShift/Mobile-Coop-coop-rejoin (feature/coop-rejoin off master 33fff449; docs/coop-rejoin/REPORT.md).
Then 2 Opus checkers (src/net) + laptop coop netmove ctcourse on the same commit, PR, train-ready label, message orchestrator.
SAVE ~22:10 (92%): #247 checker PASS on afea69d3; CI red only on tests/mocapStrafe.test.ts alloc (1930.9 vs 1916.9):
CI rerun 39942525621 + an Opus agent making the measurement robust (no threshold change) on feature/anim-fix-pass; if
it changes only the test file the laptop request on afea69d3 still counts. guard-models live state: STATE.md "SAVE ~22:10"
line (WIP branches gm-g2, gm-g4, gm-g7, gm-g1fix, gm-g1hfix; resume each builder from its head).
~22:40: #247 CI fix afea69d3 (AF3 / AF4b gated to Wren rigs, guards back to master; CI-FIX-REPORT.md): Opus checker
+ laptop request 20261023T105631-player-build-afea69d3-fd4f (anim clip coop netmove menus, set afp) in parallel. On
both green + CI green: gh pr edit 247 --add-label train-ready + message orchestrator. guard-models: P1, G3, G1, G1h, G5
merged (feature/guard-models); laptop bakes bodies / gear / heads queued; G1 + G1h checkers running; G2 building.
RESUMED ~21:40: #247 CI `test` RED on e70951e3 (merge ref with master 4.82.0): 13 unit tests in 8 anim / guard-rig files
(crouch spin, guard pose golden / identity hashes, G1 gait row 7, mocapStrafe alloc). Opus triage + fix agent on
feature/anim-fix-pass (report docs/anim-fix-pass/CI-FIX-REPORT.md); no laptop statuses on e70951e3 yet. Train-ready
only after CI green + laptop pass on the fixed head. guard-models: P1 re-check on 7488d74d, G5 checker on gm-g5 4f51918a,
G1 / G1h / G3 Opus builders resumed (gm-g1 5d9c601a, gm-g1h f4685346, gm-g3 456698c3).

Rules: CLAUDE.md on origin/master "Session titles", "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; Haiku chores; desktop CPU < 80%. e2e always
E2E_GPU=1: laptop (Test Runner) for coop / netmove / ctcourse and batches, one verdict per batch; desktop heavy.lock (4191)
/ heavy2.lock (4192) for single suites. Agent rules: scratch/ctcore/COMMON-27.md. Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

Orchestrator 19:15 ("Pipeline speed-ups"): NO e2e on the desktop (heavy.lock = build / check only); every suite to the
laptop queue; fresh checker + laptop request on the same commit in parallel; fix round reruns only what failed;
train-ready = message + `gh pr edit <n> --add-label train-ready` (auto mode denied the label 19:2x: Michael adds it or
allows it); use `node scripts/run-e2e.mjs --affected origin/master --list` once it lands. Prompts are stateless from the
next swap: this block carries all state.
Orchestrator 19:25 ("Tokens for progress"): lead at high effort (set in the app; a session cannot raise its own);
an Opus agent keeps briefs for the next 2-3 slices ready (scratch/ctcore/briefs/); 2 independent checkers on AI /
src/net changes; Opus triage agent at once on every laptop failure; a checker FAIL gets an Opus fix round and Opus
siblings; questions to Michael carry a decision pack (prototype / shots / GPU sheets). Desktop CPU < ~80%.
Cloud builder ("Night Shift | Cloud Builder 1", one-way): briefs as briefs/<job>-<slice>.md on orphan branch
`cloud-queue`, line 1 `status: open` (format: README.md there); at each check `done <branch> <sha>` -> fetch, review,
check; `blocked <reason>` -> answer in the file, set open. Use it first for CPU-heavy builder slices.
Laptop queue: self-service from feature/laptop-queue (docs/systems/testing-tools.md "Laptop queue"; results as GitHub statuses laptop-e2e/<set>); until it merges, ask Test Runner.
Released: #227 (4.76.0), #207 batch 22 (4.77.0), #214 -> #223 -> #231 stack (4.79.0, train 30, PROTOCOL 40).

## Open (master bbd49206 = 4.81.0; train 33 db14a418 4.82.0 building with #249 stealth-pays, NOT #247)
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #247 anim-fix-pass | feature/anim-fix-pass (anim-fix-pass) | e70951e3 (master 4.81.0 merged, docs/anim-fix-pass/TRAIN-ENTRY-REPORT.md; checker PASS) | Laptop request 20261023T093904-...-e70951e3 (coop netmove anim clip menus), status laptop-e2e* on e70951e3. On pass: gh pr edit 247 --add-label train-ready + message orchestrator (train 34). On fail: Opus triage at once. |
| guard-models (lead since ~20:45, from Marlow) | feature/guard-models (guard-models) | 0c55a103 (G0 + GB + G6 + G6n merged; P1 fix round in it) | docs/guard-models/STATE.md "Now" is the live state: P1 checker on a63e82ca; G6n f9ce1015 checker A PASS, B running -> merge gm-g6n on both PASS; G5 (gm-g5), G1 (gm-g1), G1h (gm-g1h), G3 (gm-g3) Opus builders running in their worktrees (commit WIP there at the save). L0 probe: status laptop-e2e/alone-guard-bake-probe on bbd49206. Rules: briefs/gm-common.md, gm-blender.md. |
| cloud-queue | orphan cloud-queue (a907adb6) | DONE: afp-next-AF0b -> feature/afp-af0b 9507c179 (harness, 50 rows, docs/afp-next/before/numbers.md; merge into afp-next when AF7 starts); player-rig-pose-audit -> feature/rig-pose-audit 4d7b1125 (docs/rig-pose-audit/REPORT.md: 20 gameplay reads, top risks player hit volumes / round origin / client headshot head; ranked 8 fix slices: not started, needs orchestrator / Michael priority). OPEN: player-stealth-pays-client-intel (answered: EnemyState `in` field, host-authoritative), guard-models-G4b (budget check). Note: mocapStrafe heap-per-frame test fails on 48b9b73c under load (pre-existing, load-sensitive). |

## Next
1. #247 laptop verdict -> train-ready (train 34).
2. guard-models: merge G6n after checker B; P1 checker verdict (fix round if FAIL); as G5 / G1 / G1h / G3 land: one Opus checker per group, book each full stage as a laptop alone request (node C:/NightShift/scratch/ctcore/lq/request.mjs --alone --step "node scripts/operators/guard-bake.mjs --stage <s> --push"), then G2 garments, G4 bake + sheet (to Michael, no stop), G7, G8, G9 per PLAN section 7.
3. AF7-AF9 (briefs/afp-next-pass.md) wait for Michael's walk of AF0-AF6 (orchestrator ~20:20: hold).

## Resume prompt
```
Night Shift | Player Build: RESUME after the account swap. Model Opus, effort medium. set_session_title "self" ->
"Night Shift | Player Build". Read CLAUDE.md (origin/master "Sessions"), then docs/orchestrator/resume-ct-core.md on
origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. A heavy.lock /
heavy2.lock naming Player Build with no node / bash process of ours is stale: delete it. Turn off unused connectors.
Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / Michael needed. Work "Next" top down.
e2e always E2E_GPU=1.
```

## History
- 2026-10-23 16:05-18:30: stack #214 -> #223 -> #231 released in train 30 (4.79.0); #207 in 4.77.0; #227 4.76.0; #239 opened;
  AF1, AF4a, AF6, AF3 built, checked, merged into anim-fix-pass; AF4b started.
- 2026-10-23 12:20-14:05: restarted r3 / team-climb / sd-rounds, spare 9, ipad-fit, spare 6; opened #214, #221, #223.
