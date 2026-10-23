# Guard AI - state

## Now
~12:50: laptop GPU on s10 88a93584: 9/11. FAIL e2e-stealth-ai radio "everyone within the call + 4.5 s (8.10 s)"
(passed on S8 alone: S5b / S6 suspect); e2e-sectorops:1 (a) panel scenario alarmBy 'radio' (radio command call beats
the panel walk), (b) S5b sector tags find bound (3.93 m, found true), (c) S10 pairs find bound (4.44 m, found true).
Log C:/NightShift/scratch/runs/guardais10-88a93584/ (laptop). Opus fix agent RUNNING on s10 (desktop lane allowed;
report in slices/S10.md "Stack-tip e2e fix"); then rerun e2e-stealth-ai + e2e-sectorops:1 on the laptop (4189).

~12:30: s10 <- s6 merged (88a93584; patrolRoute duplicate removed from S10; 208 unit tests). PRs OPEN: #200 S8 (base
s7) -> #201 S5b (base s8) -> #202 S6 (base s5b) -> #203 S10 (base s6); orchestrator told (not train-ready yet).
Laptop GPU run moved to the s10 tip 88a935849824 (stealth-ai, sectorops all, ct-warehouse, levels, enemies, wall,
takedown). Green -> train-ready message for #200-#203. Red -> fix on the failing slice's branch, merge up the stack.
S12 implementer RUNNING (Opus) in ...-guard-ai-s12 (off s6 74095d47 + s11); it must merge s10 before its PR.

~11:45: S4 / S5 / S7 in train 22 (origin/train/22, with #194, #198; laptop full run, 4.71.0 on a pass).
- Planner DONE (d693ae73): research/stealth-over-shooting.md, PLAN rows S11-S15 + S9 widened (protocol 32 now
  needed), BRIEF A35-A46 (morning review: A36 armour body shots deal no damage; A40 "raise alert" = section caution).
  Order S11 (data, Sonnet) -> S12 helmets / armour -> S13 response teams -> S14 section alert (missed check-in,
  shots call; edits coopHost: e2e-coop) -> S15 breaker / late discovery -> S9; S12-S15 and S9 Opus.
  Course Ready (sector-redesign data: gear / sweep / no enforcer) and CT Core (deflect hit kind, patrolTiming on
  request) told.
- S10 check PASS ac4cf9a0 (slices/S10-CHECK.md; fix: buildPair rebuilt from the live walkers on a re-place, pairFace
  cleared; e2e lower bound open+6-0.45). Ready for s10 <- s6 once the stack merge hands back.
- S11 BUILT 8671c9eb (Sonnet; slices/S11.md; tsc, eslint, 69 unit tests): src/ai/gear.ts, GuardSlot gear / kind,
  validator rejects bad gear and `enforcer`, SectorDef gear / sweep. Heads-up: warehouseSectors.ts has 3 enforcers in
  section lists (S13 swaps them when it wires the validator over sections). One Opus checker for S11 + S12 later.
  NEXT: S12 (Opus) in a new worktree off the stack tip (s10 after s10 <- s6), merging s11 first.
- Stack merge DONE (~12:10; each slice report has a "Stack merge" section): s8 caa59027 (S7 tip + master 4.70.0 +
  `Enemy.patrolRoute` at enemy.ts:546), s5b 29020c5a (S5b `role` -> `job`), s6 74095d47 (must-dos 2-4; e2e edits:
  e2e-sectorops:261 `alarmBy === 'panel'`, e2e-stealth-ai:851 'alarm' part 1 panel first). tsc / eslint / ~826 unit
  tests green. Laptop GPU run REQUESTED on s6 74095d47 (stealth-ai, sectorops all, ct-warehouse, levels, enemies, wall,
  takedown). Risk: panel scenario fails if the guard needs > ~6.5 s to the panel (radio wins).
- NEXT (waiting for desktop CPU < 75%, it sat at 100%): s10 <- s6 (Opus merge agent; S10 check fix ac4cf9a0), and
  S12 (Opus) in C:/NightShift/Mobile-Coop-guard-ai-s12 (branch feature/guard-ai-s12 = s6 74095d47, pushed): merge
  s11 first, then items 2 + 13; S12 merges s10 before its PR. PRs: S8 (base s7 #196), S5b (base s8), S6 (base s5b),
  S10 (base s6) once the laptop run is green; then S11 + S12 with one Opus checker.

TRAIN-READY sent (~11:20): laptop GPU on s7 4052c434 GREEN (e2e-stealth-ai x2, e2e-sectorops all). s7 then merged
s5 (master 4.70.0, clean) = 12911d86 (tsc, 200 AI / security unit tests); #193 / #195 / #196 told to the orchestrator
as one stacked series. Stack merge agent told to take s7 12911d86 into s8 too.

RESUMED ~11:05 (new account, session Night Shift | Guard AI Build [3f221b]). Swap rule (orchestrator 10:55): at 95%
no new agents, save by 98%, small work to 100%; Michael swaps at 100%.
- 'lkp' FIX (test only) s7 4052c434: Math.random seeded (4242) in the 'lkp' scenario, detection window 900 frames,
  a detection assert first, the ghost assert prints the first frame of each show condition. Laptop GPU run requested
  from Character Build (e2e-stealth-ai 2x + e2e-sectorops all; replaces the 62884858 rerun). Green -> one
  "train-ready" message (S4 #193 / S5 #195 / S7 #196). Red -> read the printed state, fix the test or the game.
- RUNNING (Opus, background): (a) stealth-over-shooting planner (docs only, this worktree: PLAN.md S11+,
  research/stealth-over-shooting.md, BRIEF A35+); (b) stack merge agent: s8 <- s7 4052c434 + CT Core's
  `Enemy.patrolRoute` getter (CT Core spare 9; told it rides on the S8 PR), then s5b <- s8 (role -> job), then
  s6 <- s5b (must-dos 2-4, e2e assert edits), stops before s10; (c) S10 fresh checker (writes slices/S10-CHECK.md in
  ...-guard-ai-s10). After (b) + (c): s10 <- s6 (role -> job in S10 too), one laptop GPU run on the s10 tip
  (e2e-stealth-ai, e2e-sectorops, e2e-levels, e2e-enemies, e2e-wall, e2e-takedown), one PR each (S8 on #196, S5b on
  S8, S6 on S5b, S10 on S6), one message to the orchestrator.
- If any agent is cut off: its WIP is on its branch; check `git log` / the slice report and finish with a fresh Opus.

(Before, ~10:50:) USAGE LIMIT (~10:50). s7 62884858 laptop GPU: e2e-sectorops 1-5 PASS (posts block green); e2e-stealth-ai FAIL at the
OLD 'lkp' scenario "the LKP ghost shows once they lose sight" (passed on ae1f1895 and the S8 tip; only the 'bodies'
scenario changed): likely timing-flaky; rerun 2x requested from Character Build. If it repeats, diagnose (ghost =
g.ghost.visible during the 25 s lost-sight loop, scripts/e2e-stealth-ai.mjs ~485). Then train-ready message.
Stopped at the limit: the stealth-over-shooting planner (rerun it first, brief in "Next") and the S8 stack merge
(S8 <- s7, S5b rename, S10, S6 must-dos; wait for CPU < 80%) and the S10 fresh checker were NOT started.

SAVED ~10:30 (98% window). Top items for the resume:
- Chain 'bodies' FIXED (test only, s7 62884858: bodiesFound baseline + finder must be w; cause in S7.md "Chain fix"); laptop run requested on 62884858 (stealth-ai + sectorops all; verdict also as a PR #196 comment). Green -> train-ready message. (old:) s7 head 8094c5b1 =
  WIP diagnostic logs ("DBG bodies": who found the body, levels) in e2e-stealth-ai; laptop run requested (stealth-ai
  2x + sectorops all; verdict to Guard AI Build and, if possible, a comment on PR #196). From the DBG lines: make the
  scenario deterministic (or fix the game if the finder truly never searches), REMOVE the DBG logs, push, then the
  chain tip laptop GPU run -> one train-ready message. The chain fix agent's own diagnosis, if it handed back, is in
  slices/S7.md "Chain fix (bodies)" (else lost: redo from the DBG output).
- S8 tip 54627243 laptop run: 8/9 (sectorops:1 = the old posts site bug, fixed on s7); stealth-ai, ct-warehouse,
  wall, takedown, sectorops 2-5 PASS.
- Built and checked, not yet merged: S8 (check PASS), S5b (PASS), S6 (PASS); S10 built (no checker yet). Merge
  must-dos below. Stealth over shooting planner: "Next".

RESUMED (~09:40, new account; session Night Shift | Guard AI Build [4656d4]). Orchestrator: train 21 = #191 S3 on
4.69.0; S4 -> S5 -> S7 enter train 22 together once their PRs are open and the chain tip's E2E_GPU=1 pass is green;
S4 PR based on feature/guard-ai, each PR retargeted to master after train 21.
- PRs: S4 #193 (base feature/guard-ai, 0cb0db2c); S5 #195 (base feature/guard-ai-s4; b2d170de merge S4, 4d78a92a
  revived guard keeps his post, 47347f4c fix round: posts e2e site search over the whole nav grid); S7 #196 (base
  feature/guard-ai-s5; 958838a0 merge S5, ae1f1895 merge S5 fix = CHAIN TIP). Orchestrator told (one message).
- Chain tip ae1f1895 laptop GPU result: 9/11. FAIL e2e-sectorops:1 posts block (my fix passed `site` not `site.at`;
  fixed 39853abf in s5, merged e4af7da5 in s7; S7 camera block PASSED). FAIL e2e-stealth-ai 'bodies' "the finder
  searches (unaware)" (passes on S4 alone and S7 alone: an S4 x S5 / S7 interaction). Chain fix agent RUNNING (Opus)
  in s7: diagnose on the desktop lane (heavy.lock, 4191), fix, rerun stealth-ai + sectorops:1; report in S7.md. S8 e2e
  request to Character Build dropped until then. S8 fresh checker RUNNING (writes slices/S8-CHECK.md).
- (old) Chain tip ae1f1895 E2E_GPU=1 queued with Character Build (laptop): e2e-sectorops all, e2e-stealth-ai, e2e-takedown,
  e2e-ctcourse, e2e-ct-warehouse. Green -> one message to the orchestrator "train-ready" (train 22). Open note: A20 /
  S7.md still say "the squad within 22 m searches until S4" (wording only).
- Orchestrator token rules (10:05, origin/feature/menu CLAUDE.md "Token rules"): message only at PRs open /
  train-ready / blocked / Michael needed; progress here; save + tell at ~25-30% context; no polling; merge master into
  the chain only when it enters a train; parallel slices (S5b / S6 / S10 beside S8) up to the CPU cap.
- Character Build solo e2e (laptop GPU): S7 084e373c ALL 10 PASS (log C:/NightShift/scratch/runs/guardais7-084e373c/).
  S5 80efb8b4 9/10: FAIL e2e-sectorops:1 setup assert "posts: an open stretch near section 1 for the test guards"
  (the new S5 posts block never ran before; its site search returns null) -> S5 fix round after the chain merge.
- S8 BUILT 42d9b447 (slices/S8.md; tsc, lint, 169 unit tests; `Enemy.tacticsProfile` numeric, S5's string `profile`
  kept; 4-guard roles e2e scenario NOT added, sketch in S8.md). Merge agent RUNNING: s8 merges origin/feature/guard-ai-s7
  + placeSlot sets tacticsProfile (post -> P_POST, 'aggressive' -> P_AGGRESSIVE), posted guards keep the leash in
  combat. Then fresh Opus checker, e2e (e2e-stealth-ai 'radio' / 'radio stagger' / 'shots' / 'alarm' at risk: role
  guards wait out of sight; plus e2e-ct-warehouse, e2e-sectorops, e2e-wall), PR stacked on #196.
- ~11:00: 4.70.0 released (train 21 #197 with #191 S3). #193 retargeted to master; master merged into s4 (49ff29fe,
  fragment keeps S4 only) and s4 into s5 (22c89012); s7 gets s5 once the chain fix agent hands back, then s8 gets s7.
  Train 22 = S4 / S5 / S7 + #194 once the chain tip laptop GPU run is green (ONE message to the orchestrator then).
- S8 fresh check PASS (e22e6cff, slices/S8-CHECK.md): polish: reinforcements P_STANDARD (S6 sets 'aggressive'),
  no 4-guard e2e, role guard frozen in the open <= 12 s; e2e-levels LADDER_SEED may shift (Enemy ctor draws 1 not 4).
- S5b BUILT 6c214068 (A26-A28), S6 BUILT 88ce08dd (A29-A31; RADIO_ALARM on, command call, aggressive reinforcements;
  three profile reads in the combat branch that S8 must carry). Batch checker S5b + S6 RUNNING (Opus; writes
  S5b-CHECK.md / S6-CHECK.md + the merge plan with S8). S10 implementer RUNNING (Opus) in ...-guard-ai-s10, branch off
  S5b 6c214068 (A32-A34).
- Batch check PASS: S5b (2d363f3e, S5b-CHECK.md) and S6 (4712a713, S6-CHECK.md). MERGE MUST-DOS (git will not flag):
  (1) S5b x S8: both add `Enemy.role` (S5b string, S8 number) -> rename S5b's to `job` (enemy.ts:937, :646,
  enemyManager.ts:927, stubs in tests/sectorGuardTags.test.ts; S10 is built on S5b, so rename there too).
  (2) S6 x S8: restore `const ADVANCE_HOLD = 2.5`; advance hold = (roled || tacticsProfile === P_AGGRESSIVE) ?
  profileOf(..).advanceHold : ADVANCE_HOLD. (3) S6 `joinAsReinforcement` also sets tacticsProfile = P_AGGRESSIVE.
  (4) S6 `get behaviour()` / `i.hunting` read profileOf(this.tacticsProfile); take S8's three combat lines; update
  tests/alarmCall.test.ts. Order: S5b (rename) -> S8 -> S6 (-> S10). S5b x S6: union the enemyManager import; in
  sectorMode.fill S5b's placeSlot(.., gs, gs.indexOf(slot)) first, then S6's joinReinforcement; barks union.
  e2e fixes: e2e-sectorops panel scenario (~208-258) assert alarmBy === 'panel'; S6 'alarm' part 1 panel beats the
  radio by ~2.5 s. New e2e blocks never run: S5b sectorops, S6 'alarm call' + sectorops.
- S10 BUILT b8104ecf (slices/S10.md, A32-A34; tsc, lint, 118 unit tests; e2e block "talking pairs (guard-ai S10)"
  in e2e-sectorops part 1 never run). Needs a fresh Opus checker (none yet) and the `role` -> `job` rename at the S8
  merge. Open: pair lines have no earshot range; PairDef.lines needs a data field agreed with Course Ready.
- Planned order after checks: s8 <- s7; then S5b, S6, S10 stacked on S8 (merge each into the next), one laptop GPU
  run on that tip (e2e-stealth-ai, e2e-sectorops, e2e-levels, e2e-enemies, e2e-wall, e2e-takedown), one PR each.
- (done) S5b and S6 implementers (Opus, ~10:20) in worktrees ...-guard-ai-s5b / -s6, branches off the chain tip
  ae1f1895 (pushed empty). A-numbers reserved: S8 A23-A25, S5b A26-A28, S6 A29-A31, S10 from A32. Each writes
  slices/S<n>.md; then commit, one checker for S5b + S6 (batch), PRs stacked on #196 after S8. S10 next when CPU allows.
- Then the chain tip e2e (E2E_GPU=1: e2e-stealth-ai, e2e-takedown, e2e-sectorops, e2e-ctcourse, e2e-ct-warehouse).

(Before, at the swap:)
SAVED at the account swap (~09:45, 2026-10-23; orchestrator: window 91%). Branch heads, all pushed:
- feature/guard-ai (S3 radio) = PR #191, OPEN, train 21 after train 20 (#185 S2 + #186) releases. Checker PASS
  (slices/S3-CHECK.md); e2e GPU desktop 4192 all green (e2e-stealth-ai, e2e-sectorops 1-5, e2e-ct-warehouse,
  e2e-stealth, e2e-ctcourse 1-3). Code head 7a4167b2; later commits are STATE only.
- feature/guard-ai-s4 (S4 awareness / caution) fd3a0018, worktree C:/NightShift/Mobile-Coop-guard-ai-s4. Built
  (slices/S4.md, A14-A16). Fresh checker was RUNNING at the swap: if slices/S4-CHECK.md is missing in the worktree /
  branch, run a fresh Opus checker (brief = the S7 checker's shape; diff 7a4167b2..fd3a0018; focus revive / inherit,
  keys, held caution clearing). e2e desktop 4192 GPU on fd3a0018: e2e-stealth-ai, e2e-takedown, e2e-sectorops 1-5 ALL PASS (09:31). (old note:
  RUNNING at the swap: log C:/NightShift/scratch/runs/guardai-s4-fd3a0018/e2e.log; if no run is alive and
  C:/NightShift/heavy2.lock still says "guard-ai S4 e2e", delete the lock and rerun.
- feature/guard-ai-s5 (S5 posts + map data) 63047d27 (code 80efb8b4), worktree ...-guard-ai-s5. Built (slices/S5.md with the note for
  the map teams; A17-A19). Checker PASS (S5-CHECK.md, head 63047d27; polish: no time limit on the walk back, edge point behind a wall, K4 two-keyholder e2e once Course Ready data lands). e2e queued with Character
  Build [06fe56] on the laptop (4192, GPU: e2e-sectorops all, e2e-ctcourse, e2e-stealth-ai, e2e-ct-warehouse).
  Known: a revived guard loses his post (Enemy.inherit from S4 must carry postDef / postYaw / section / profile; fix it
  at the chain merge below).
- feature/guard-ai-s7 (S7 cameras see bodies) 38345438 (code 084e373c), worktree ...-guard-ai-s7. Checker PASS
  (slices/S7-CHECK.md). e2e queued with Character Build (4189, GPU, same 4 suites; the result counts for 38345438).
- feature/guard-ai-s8 (S8 tactics) 2d3dfc51 = WIP commit of the implementer cut off by the swap, worktree
  ...-guard-ai-s8. Read slices/S8.md if present and `git show --stat HEAD`, then a fresh Opus implementer finishes it
  (brief: slices/S8-module.md wiring list, PLAN row S8, design 7-8; combat code only; A23-A25), then a checker.
Worktrees have a node_modules junction to C:/NightShift/Mobile-Coop/node_modules (remove it with `cmd /c rmdir
node_modules` before `git worktree remove`).

CHAIN ORDER (orchestrator agreed): #191 -> S4 -> S5 -> S7 (-> S8). They all edit enemy.ts / enemyManager.ts, and
trains take no src conflicts, so once each is checked: in s5 merge feature/guard-ai-s4 (dry run: conflicts only in
TESTING.md and changes/feature-guard-ai.md; add the S4 inherit fields for posts), in s7 merge feature/guard-ai-s5
(conflicts: enemy.ts, enemyManager.ts, e2e-sectorops.mjs, BRIEF.md, ai.md, TESTING.md, fragment), in s8 merge s7.
Rerun tsc + the AI unit files, then ONE e2e pass on the chain tip (e2e-stealth-ai, e2e-takedown, e2e-sectorops,
e2e-ctcourse, e2e-ct-warehouse, E2E_GPU=1) covers the chain. Open one PR per slice (base master; body says "stacked
on #<prev>"), message the orchestrator per PR. Then S5b + S6 (+ S10 pairs) off the chain tip, each its own worktree,
branch and PR (S6 sets RadioNet.section to the Sector index before RADIO_ALARM goes on, S3-CHECK note). S9 only if
needed (protocol 32; registry: master 31, marlow-final 33).

Pacing (orchestrator, Michael 09:00): hit the cap but efficiently: AI behaviour code and checkers Opus, Sonnet 5.5 for
tests / data from strict briefs, Haiku 5.5 chores; no new agent while desktop CPU > 90%; desktop GPU lanes for single
suites when CPU allows (heavy.lock 4191 / heavy2.lock 4192, E2E_JOBS=1), else Character Build on the laptop. Push WIP
and refresh this file after every hand-back.
Other jobs in enemy.ts: Character Build's guard-render S3a (head hitboxes from the sim; fields ~185, ctor, blind,
beginTakedown, syncHitboxes, aimWeight, frame) on feature/guard-render-s3a; told to merge from feature/guard-ai and send
the diff before its PR.

(~08:40, account swap 2) #185 S2: master 4.68.0 merged (a0554459; conflict stealthSystems.shootLight = S2's
`lightsOut(x, z, y, id)` before the noise + master's `return true`); no wire change, so no protocol (registry: master
31, guard-ai 32 if S9 needs it, marlow-final 33); CI running, then train 20 with #186. S3: the integration agent had
finished its code (no S3.md): committed as eb1f71de (tsc, lint, 92 unit tests green), feature/guard-ai merged with
origin/feature/guard-ai-s2 (98cf4552; conflict sectors.ts = our noisy / entries + master's perStage comment; 214 AI /
sector unit tests green), pushed. Fresh S3 checker RUNNING (writes slices/S3-CHECK.md); e2e requested from
Character Build [06fe56] on 98cf4552 (E2E_GPU=1: e2e-stealth-ai, e2e-sectorops, e2e-ct-warehouse, e2e-stealth,
e2e-ctcourse). S3 PR after both: its own PR from feature/guard-ai (carries S2 until #185 merges).

Older (history):
PAUSED at the orchestrator's TRIM 4 (usage pace) until it messages (~04:00). S2 incident board built (slices/S2.md,
check green), e2e queued on the laptop; its fresh checker NOT run yet. S1 is PR #179 (feature/guard-ai-s1 5e019d9c,
train 17).

S2 e2e (laptop GPU, 661c258a): 7 suites PASS; e2e-stealth-ai FAIL in the new 'light pair' scenario: "both stand down
after the check (at -1.00, 29.80 s)": guard a (first investigator) stays 'investigating' for the whole 120 s window,
guard b stands down at 29.8 s (sim-stepped, so not load). Log C:/NightShift/scratch/runs/guardai-s2-661c258a/ (laptop).

S2 FIX ROUND done (~03:45, slices/S2.md "Fix round"): light-check ring point behind a wall sent guard a on an endless
detour while the hold flag froze his alert timer -> new pure src/ai/lightCheck.ts (nav-line test per ring point, halfway
fallback, timeout fires mid-path, RING_WALK 12 s, every stage bounded, 86 s worst case); patrol wait 0 = pass-through
(src/ai/patrol.ts:113; side effect: warehouse Sector runner / officer no longer freeze at their 0-wait points). check
green. Laptop bridge down (Character Build gone ~03:50), so e2e ran on the desktop second lane (heavy2.lock, 4192,
GPU, JOBS=1; logs C:/NightShift/scratch/runs/guardai-*): 977cf0f5 e2e-sectorops, e2e-ct-warehouse, e2e-ctcourse,
e2e-coop, e2e-netmove PASS; e2e-stealth-ai FAIL in the OLD 'lkp' scenario (:444 "they converge on the last known
position", closest 4.44 / 4.95 m vs < 2.5) - so 'light pair' was not reached. Bisect on the desktop: S1 cd37c3e8 PASS
(closest 0.91 m), S2 661c258a FAIL (4.43 m), fix 977cf0f5 FAIL: an S2 regression on the desktop (the laptop passed
'lkp' on 661c258a, so it is timing-sensitive). Suspects: search pace 0.75 / calm turn rate while searching slowing the
alerted guard's walk to the LKP, or the scenario's `t.light(0)` opening a light incident that grabs him.

S2 FIX ROUND 2 (~07:30, slices/S2.md "Fix round 2"): root cause = every coordinated search walked 0.75 with the calm
turn, including the search after combat, so the alerted guard could not reach the LKP; fix `Enemy.combatSearch`
(post-combat search keeps 1.3 + aimed turn; calm searches keep A9). Desktop GPU: e2e-stealth-ai PASS x2 (lkp 0.91 m,
light pair both stand down 32.3 s), e2e-sectorops PASS. Full `npm run check` not yet run (heavy.lock was held).

Full burn (orchestrator ~07:55, up to 5 agents): in parallel with the S2 checker, four Opus agents build the pure
modules (new files only, no wiring): S3 radioNet.ts, S4 awareness.ts, S5 posts.ts + guardAiData.ts, S8 squadRoles.ts
(+ coverGrid.ts), each with tests/ and a slices/S<n>-module.md report. Integration of each stays sequential (S3, S4,
S5/S5b, S6, S7, S8) because they share enemy.ts / enemyManager.ts.

S2 fresh check PASS (~08:30, slices/S2-CHECK.md; npm run check green, 3199 tests); 9 polish items, top: a new
`missing` incident can evict the one being followed when all 16 slots are open (incidents.ts:599/:607); noise
investigators still end in the 45 s cooldown. Pure modules built and pushed, unwired: S3 radioNet (ccb249eb), S4
awareness (095b0451), S5 posts + guardAiData (e57a30b5), S7 security body pass (027ca979), S8 squadRoles + coverGrid
(851eba39), S10 pairs (f10dcaf8); each has slices/S<n>-module.md with its wiring list.

S1 merged to master (train, #179). S2 = PR #185 (feature/guard-ai-s2): master 4.67.0 merged in at c8906e22 (~08:20;
conflicts: changes/feature-guard-ai.md re-added with S2+ entries only, src/security/securitySystem.ts = our lensRay
helper + master's per-camera range `cameraRate(..., c.range)`); tsc clean, security tests 42/42; full npm run check
started in the background in C:/NightShift/Mobile-Coop-guard-ai-s2 (temp worktree, node_modules junction; remove it
with `git worktree remove` only after deleting the junction: `cmd /c rmdir node_modules`). Joins train 20.
Map data fields on feature/guard-ai (971711c4; both teams told). S3 radio integration agent RUNNING at the account
swap (~08:20): its WIP is uncommitted in this worktree if it did not finish - read slices/S3.md if present, review
`git status`, then either finish it with a fresh S3 implementer (brief: slices/S3-module.md wiring list) or commit.
feature/guard-ai itself still needs origin/master merged (same two conflicts) before its next PR.

## Next
- STEALTH OVER SHOOTING (Michael, via orchestrator ~10:15; ROADMAP Decided + "Next: stealth over shooting" on
  origin/feature/menu 31a4cee2). Guard AI owns items 2 helmets, 3 riot shields (response teams only), 4 alarm stages
  add armour / helmets + a response team (no extra cameras), 6 missed check-ins / found bodies raise alert, 7 gunfire
  alerts the section, 8 shot lamps investigated / breaker cuts cleaner, 11 response teams stay and sweep, 13 body armour
  torso stagger. First thing next window: an Opus planner (docs only, allowed above the CPU cap) reads that ROADMAP
  section, checks each item against what S2 / S3 / S4 / S5b / S6 / S7 already do (overlap: 6 vs S4 + S5b missing
  partner, 7 vs S1 / S3, 8 vs S2 light check, 4 / 11 vs S6 reinforcements), and adds the remaining work as slices
  S11+ to PLAN.md ordered after S8 (and S9 if needed); then build them in the usual loop.
S3 integration finish + fresh checker, e2e-stealth-ai / e2e-sectorops on the desktop second lane; then S4, S5/S5b
(+ glass sight read), S6, S7, S8, S10 wiring in order; (slices/S2.md, review the S2 commit diff), then S2 as its own PR when green; then S3 radio net, then
S4-S10 in PLAN order.

## Open
- Data shapes: Course Ready AGREED ~02:25: placeSlot reads squad / handler / zone / role / pair / reason; `post` and
  `profile` on SquadSlot; guard-ai adds `noisy?` / `entries?` to SectorDef in sectors.ts (only those two lines + the
  import). Their posted guards (sector-redesign SPEC "Unavoidable posted guards (M12)", A60-A63), role 'posted':
  K1 S1 #5 doorman leash 5 'c1-door'; K2 S2 #11 bridge officer leash 5 'c2-door'; K3 S4 #19 colonnade sentry leash 5
  'c4-gate'; K4 S5 #9-10 keyholders leash 3 each, highSecurity, 'token'. Lures that must pull them to the leash edge:
  noise, thrown item, a light cut in their area (K4: noise + anteroom light only). Promised (A12): a lured posted guard
  looks toward the lure >= 5 s at the leash edge, sweep <= +-0.6 rad (facing away from the choke) before walking back
  (K4 solo: two single takedowns). Melee tour guards resolved on their side (A46). Protocol 31 theirs, 32 ours.
  Menu Notes AGREED ~02:15: `MapLayout.guardAi` yes (Marlow fills zones = one section per set A1-A8, noisy = A5
  transformers / A6 pumps, once our types reach master); `SquadSlot.post` fine (A1 checker `post: { leash: 0 }`;
  high-security posts in A4 security room, A8 strongroom); Course mode already sets `em.stealth = true` on their branch:
  do NOT set it in a hook; body callback in src/security beside onEvent fine. Their branch also touches mapDef.ts
  (`MapLayout.props`, kit), spawnSquad uses `em.despawn`, `StealthSystems.isolate()` (timed light isolators = a
  lights-out lure), sliding doors (`leaf: 'slide'`): expect small merges.
- Bug from Menu Notes (~03:05): `PatrolWalker.step` (src/ai/patrol.ts) freezes on a `waits` entry of 0 (waitT 0 never
  reaches `advance`; the guard stands there for good). Fix in the S2 fix round: a wait of 0 = pass-through, + a unit
  test (theirs: tests/ctcourse/a2CarriageShed.test.ts on feature/marlow-final; they use 0.1 s waits meanwhile).
- Glass (Course Ready ~08:10, DEC G45, their E2): guard-ai adds optional `glass?: 'clear' | 'frosted'` on collision
  pieces + the sight ray read (clear = see-through, frosted = opaque; hearing = wall for both; the S7 camera body ray
  too) as a small step after S3 integration; they fill the data. Piece type: `BoxPiece` in src/world/levelBuilder.ts:45
  (campus maps src/world/maps/campusS1-3.ts on their branch). Light pass through glass
  is lighting's (Menu Notes), not ours.
- Protocol 32 only if S9 is needed (marlow-final 30, sector-redesign 31).
- A11: Sector Ops melee tour guards vs "every guard armed" (Course Ready's data).

## Pacing (lean windows, ROADMAP Decided ~01:45)
Each 5-hour window to 99%: no new agent at 97%, save at 98% (WIP pushed, this file current). At most 3 agents. AI
behaviour code Opus; Sonnet only for tests / e2e scenarios / data from a strict brief; checkers Opus.

## Done
- 2026-10-23 ~02:45: S1 hearing cd37c3e8 (check, tsc, lint, unit 70/70); fresh checker PASS (slices/S1-CHECK.md, 5e019d9c),
  4 non-blocking fixes folded into S2. e2e GREEN on the laptop (GPU): e2e-stealth-ai, e2e-sectorops 1-5, e2e-stealth,
  e2e-gadgets, e2e-ctcourse 1-3, e2e-coop, e2e-netmove (Character Build ~02:50).
- 2026-10-23 ~02:00: worktree off master ffade187, g44-above merged (e5e66e5e); BRIEF.md (a9ab3a29).
- 2026-10-23 ~02:10: research (research/audit.md, ct-behaviour.md, tactics-design.md); PLAN.md; BRIEF A2-A11.

## Resume prompt
```
Night Shift | Guard AI Build - guard-ai: RESUME. Model Opus, effort high; clear context first.
Folder C:/NightShift/Mobile-Coop-guard-ai, branch feature/guard-ai (git fetch; git status; branch guard before every
write: CLAUDE.md "A job"). Read CLAUDE.md, docs/ROADMAP.md (origin/feature/menu if newer), docs/guard-ai/BRIEF.md,
PLAN.md and this STATE.md. Continue from "Now" (top entry first): per slice worktree
C:/NightShift/Mobile-Coop-guard-ai-s<n> (branch feature/guard-ai-s<n>, its own guard). Agents cut off by a swap leave
WIP commits "WIP at the swap" on their branch: review `git show --stat HEAD` and the slice's report, then finish with a
fresh Opus agent. Order: "Now" top entry first: laptop GPU verdict on s7 4052c434 ('lkp' seeded) -> one
"train-ready" message (S4 #193 / S5 #195 / S7 #196) -> stack merge (s8 <- s7, s5b <- s8, s6 <- s5b, s10 <- s6; check
each branch's slice report "Stack merge" section for what is done) -> one laptop GPU run on the s10 tip -> one PR per
slice (S8 stacked on #196) -> build the stealth-over-shooting slices S11+ from PLAN.md. Token rules: CLAUDE.md "Heavy-usage
throughput" on master (message the orchestrator only at PRs / train-ready / blocked; no new tsc / vitest agent while
desktop CPU >= 80%; at 95% no new agents, save by 98%, small work to 100%). The loop in docs/systems/session-method.md (implementer, fresh
checker, at most 1 fix round per slice; subagents start from docs/systems/agent-preamble.md; slice detail in
research/tactics-design.md and slices/S<n>-module.md). AI behaviour code and checkers Opus; Sonnet 5.5 only for tests /
data from strict briefs. Every e2e run E2E_GPU=1: desktop lane (heavy2.lock, 4192, E2E_JOBS=1) when CPU allows, else
message Night Shift | Character Build (branch, commit, suites). Message Night Shift | Orchestrator at each slice, hand-back
and PR; push WIP and refresh this file after every hand-back. Log assumptions (BRIEF A-numbers, next free after the
slices' A14-A25), no question dialogs.
```
