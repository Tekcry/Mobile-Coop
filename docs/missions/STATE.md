# mission-framework - STATE

## RESUME 2026-10-25 ~18:25 (Night Shift | Campaign Build; read this block first, older blocks are history)
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
Next: when CPU allows, #372 checker + two FLG checkers + TW23 builder; plan checkers on J3 / J7 / J8-J9; builders.

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
Next: HOLD. If #419 goes red, fix it. On the orchestrator's row 6 sign-off message: restart the #372 spec docs from
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
