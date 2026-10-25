# Guard AI - state

## Now
~20:05 2026-10-25: a withdraw plumbing script with an empty commit pushed `:refs/heads/laptop-queue` and DELETED the
branch for ~1 min; restored to the same tip 4b521512 (the service ignores an empty listing, so nothing ran or was
withdrawn). Withdraw only with a temp index + `[ -n "$c" ]` guard (scratchpad recipe), never `$c:` unchecked.
~00:20: QUEUE RULE (lib.mjs pick): the queue runs a requester's NEWEST request first, so newer requests starve an
older one (fix3 waited 70 min). Keep one open request at a time in priority order. Withdrawn (request file deleted on
laptop-queue): polish b226 (stale) + T1 e7f2 (held). #317 fix3 6504 is now the only open request.
#360 T1 HELD by the orchestrator (ROADMAP Decided, assumed): keep tier 4; after gm-flip try shadow-in-view = seen in
animTierView.ts + measure; GPU look clip for Michael's morning pack (Opus writing scripts/t1-shadow-look.mjs on the T1
branch, then an alone request). #363 polish: check A PASS, check B FIX 1 (B2 two movers after a mid-bound re-pick);
Opus fix round RUNNING (roleBound flag; enemy.ts / enemyManager.ts / e2e-stealth-ai.mjs / guardPolishB); then requeue
set polish on the fix head. Batch 2: Opus planner RUNNING -> docs/guard-ai/POLISH2-PLAN.md (Deferred list + check A
polish 1-4), stacked on feature/guard-ai-polish.
~23:50: #317 CONFLICTING with master 4.98.3 (one hunk src/net/protocol.ts: master PROTOCOL_VERSION 55 next to coop4's
MAX_PLAYERS comment). Orchestrator agreed: NO master merge. fix3 green -> `gh pr ready 317` + train-ready; if
auto-train leaves #317 out, by-hand train merge: keep master's `PROTOCOL_VERSION = 55` + coop4's comment and
`slotFromList` import; build bumps to 56. PR #363 polish (4ea3f562: 96 files 1507 tests, tsc / eslint clean; big-pr
labelled) laptop set laptop-e2e/polish queued + Opus checkers -> slices/POLISH-CHECK-A/B.md. T1 #360: check B FIX 1
(off-screen guard's on-screen shadow limbs at 7.5 Hz; seen = camera pass only, animTierView.ts:30,38): decide after
check A.
~23:35 (swap 23:20, new account, laptop; OVERNIGHT). #317 fix3 52e3dc13 request ...-6504 still unclaimed (train 70
on both laptop slots); background wait on laptop-e2e/coop4-fix3. T1 DONE by Cloud Builder 1 (bbbfbecf, 54 files
750/750): worktree C:/NightShift/Mobile-Coop-guard-ai-t1, fragment 3871722d, PR #360, laptop e2e-sectorops +
e2e-enemies queued (laptop-e2e/t1), Opus checkers A / B -> docs/guard-ai/slices/T1-CHECK-A/B.md (lead commits).
After merge: guard-cap M0 away cells A/B rerun (Marlow). Polish A / B: Opus finishers RUNNING from WIP 1c9fafd9 /
63fbb29d (+ B's uncommitted tests), pushing as they go. Then merge a/b/c into feature/guard-ai-polish.

~23:20: #317 e2e-coop on bc96ecee FAIL #3 (AI6 (1) LKP 27.75 m + AI6 (3) spawn). Opus triage 3: both TEST bugs, one
cause: AI6 staging left the radio alarm on, a yard response team (spawn ~18, -24.5) saw B at his hide and filled the
guard cap. Fixed 52e3dc13 (alarmRaised staged, (3) starts clean, per-player LKP / report diagnostics;
docs/coop4/checks/ai6-triage-3.md). Laptop e2e-coop on 52e3dc13 queued (set coop4-fix3), background wait.
4p (alone-coop4-4p) PASS on 1b04e5bd. Green -> gh pr ready 317 + train-ready.
M0 read (guard-cap-results 6b9efc8f): T1 OPEN on cloud-queue 3e3f38a3 (ai.anim 55-59% of sim growth, sim p95 3.4-4.4);
D1-D2 CLOSED (ai.manager 15-24% < 40%). Orchestrator told (Marlow writes the guard-cap REPORT verdict).
Polish batch: POLISH-PLAN fda75ca8 (3 groups, 31 items, 28 dropped). Opus builders RUNNING in worktrees
C:/NightShift/Mobile-Coop-guard-ai-polish-a / -b / -c (branches feature/guard-ai-polish-a/b/c, node_modules junction to
-polish). Next: #450 merges -> merge -s5 into feature/guard-rules, open PR2 (body per item 5) + affected; S1a-1 / S2 builders ->
2 Opus checkers each, then S1a-2 and S3 briefs.
```
Guard AI Build resume (laptop). Rules: docs/RULES.md + docs/VISION.md from origin/master; BOOT.md "Common start" and
"Guard AI Build" on origin/feature/menu. Read this block only. Branch guard before every write. Never merge master
into a branch. 2 Opus checkers on AI / src/net PRs; Opus triage on every laptop failure. Laptop runs: cd
C:/NightShift/Mobile-Coop-laptop-queue-svc && node scripts/laptop-queue/request.mjs --sha <sha> --pr <n> --set <name>
--requester "Night Shift | Guard AI Build" --suites "a b" (or --alone --step "<cmd>" --env K=V); verdict = status
laptop-e2e/<set>. Withdraw = delete requests/<id>.json on origin/laptop-queue (plumbing commit, never in the svc
worktree). Background wait: scratchpad wait-status.sh "<sha>:<context>" ... Laptop auto mode blocks labels: tell the
orchestrator at train-ready. Walk cap: Guard AI AT CAP (new behaviour dark; rule fixes ship on, G355).
Open (2026-10-26 ~05:40, resumed after the 04:50 reset; full burn; order J4, J6, J15, J26, J16). Checker statuses: a LONE
`gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f ...`. Local tsc / vitest builders only while laptop CPU < ~80%.
File every gate request WITH the head push; post the checker the moment it passes (orchestrator 23:05: #446 missed
train 106 by 2 min). One affected run per head covers its suites: no duplicate requests.
1. J4 G327 #438 MERGED (train 105). #414 (T1 look script) still draft: undraft is Michael's (auto mode).
2. J4 #317 coop4 603f23a43: TRAIN-READY (checker, affected 24/25 known-flaky ctcourse:4; labelled). Merge check A
   PASS, B docs FIX applied (docs/guard-ai/checks/coop4-merge-check-A/B.md). Polish -> coop4-pol after it lands:
   snapBudget fake guards `in: 1`, main.ts:332 Co-op card text, duplicate "(coop4 A4)" comment, sectorMode OUT slot,
   run-e2e.mjs:152 comment.
3. J6 #446 MERGED.
4. J15 PR1 #450 b718293df: TRAIN-READY (checker, affected 22/22; labelled). A background loop watches for its merge.
5. J15 PR2 = feature/guard-rules-s5 e18039094 (S5 + PR1 polish, checks A + B PASS). Early run GREEN:
   laptop-e2e/rules-pr2-early 13/13. After PR1 merges: merge -s5 into feature/guard-rules, PR2 + affected.
   PR body lists the skipped polish (PR1-A2 wire bit, PR1-A4 J17, PR1-B e2e names, S5-A3 walk note) and the merge
   note: mission-engine calls responseTeam without `shield`; keep sectorMode's `s.shieldTeams === true`.
6. J15 PR3 = feature/guard-rules-f0 48394def2 (~23:55): F0 flags + S4 barks (fix 479b938d2; `saw` appended at 39) +
   S6 pairs + fragment. All checks PASS (S4/S6 A + B, PR3-RECHECK-A/B); checker posted on 48394def2. Laptop set
   laptop-e2e/rules-pr3 on e3df84001 GREEN 18/18 (48394def2 is a docs-only delta). PR3 opens after PR2 merges (base master).
   Polish list: checks/S6-CHECK-A/B.md, PR3-RECHECK-A/B.md polish.
   J15 PR4 = feature/guard-rules-pr4 b111c9aa1 (PR3 + S7 fa848bcbb + S8 c74ad59e8 + S9 e3237a514, fragment, TESTING).
   Checks: S7 A + B, S8 A + B, S9, PR4-RECHECK-A/B all PASS; checker posted on d9c4d0e8c and b111c9aa1. Laptop set
   laptop-e2e/rules-pr4 GREEN 18/18 on d9c4d0e8c (b111c9aa1 is a docs-only delta). PR4 opens after PR3 merges (base
   master). Polish: e2e-sectorops.mjs:2749 stale comment, both-flags test, lookoutN live count, restartSearch(),
   dead leader enemy.ts:1690, S8 e2e margin 20 m. node_modules: junctions -> guard-ai-s24.
7. J26 mission hooks: plan PASS (044258624). Briefs S1a + S2 on feature/guard-ai-mission-hooks (50dcab309; lead
   decisions: S1a SPLIT into S1a-1 pure flags + missionOrders.ts + unit, S1a-2 wiring + e2e; S2 keeps NOISY_LIMITS).
   Full burn, stacked on PR4 (their base): Opus builders S1a-1 (worktree -mission-hooks-s1a1, branch
   feature/guard-ai-mission-hooks-s1a1) and S2 (-mission-hooks-s2) running from b111c9aa1 + job docs. Then 2 Opus
   checkers each; S1a-2 from S1a-1's head; S1b after S1a-2; S3 after S2... (PLAN "Slices"). PRs open after PR4 merges.
   Campaign Build has C1-C7. A9 per-area stages dark: Michael's click at his walk.
8. Test Runner request (J20 S6b): seed the 5 Math.random sites in src/ai (enemy.ts think cadence x2, enemyManager
   radio delays x2, reconDrone start angle) after J6 lands and PR-C (tests/replayDeterminism.test.ts) is on master.
9. J16 perception half (Q14 cast shadow = faint cue): plan after Sector Ops' J16 PR. Later: coop4-pol (134f6abe),
   snapBudget headroom, coopHost.ts:589 comment, TODO sectorMode.ts:201.
Next: wait (background) on #450 / #317 affected, rules-pr2-early, rules-pr3, rules-pr4; green -> tell the orchestrator
train-ready; then J26 S1a briefs (after PR4).
```
