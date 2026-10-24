# Process audit: idea to in-game (2026-10-24 ~21:45)

Michael (~21:15): "run an audit of the entire process, from me giving you a request/idea to it being in game. Find
inefficiencies, points of failure, risky methods, and more. The goal is for me to give you an idea, and you manage it
entirely from planning all the way to completion with minimal failures, efficient token usage, and high quality output,
while remaining fast."

Five Opus audits on measured data (git, gh, logs, docs; 2026-10-21..24): idea -> plan, build loop and tokens, test /
merge / release, sessions and orchestration, quality in game. Scratch data: the orchestrator session's scratchpad.

## The numbers
| Stage | Now |
| --- | --- |
| Idea -> plan -> first slice | plan 2-10 min, first slice 7-32 min later (fast) |
| First commit -> PR | median 0.8 h, p90 4.2 h; big branches 11-21 h, 15-50k lines |
| train-ready -> master | median 43 min (p90 154) since train 47; 0.6 h median on 10-24 |
| master -> /preview/ | median 24 min, p90 49; once 83 min stale with no alert |
| Trains 33-64 | 21 merged, 11 closed: 5 member bugs, 6 process bugs, 4 flakes; ~16 human steps in 26 h |
| e2e first verdicts | 10 / 26 red; laptop run 745 s median, desktop 2421 s (3.3x), desktop 57% red vs laptop 32% |
| Swaps | ~16 in 3 days; save -> all up median ~35 min; ~100k tokens per session per restart; 8+ agents / runs lost |
| Bookkeeping | 31% of commits touch only STATE / HANDOFF / ROADMAP / logs; STATE files 55-107 KB |
| Model split | commit co-authors 2680 Opus, 88 Sonnet, 2 Haiku |
| Quality | ~30 problems found by Michael playing, all past every test and checker: feel / anim 7, visual / GPU 8, layout 6, co-op 5, AI design 6, untested 3 (Marlow restart, guards through doors), stale preview 1 |
| Walk backlog | 47 PRs / 19 releases since Michael's last Marlow walk; full co-op Marlow walk pending since 10-22 |

## What works
Plans are fast; overnight runs without questions; checkers catch real bugs (26% FIX rate); no force pushes, empty
stash; auto-train releases in 0-5 min after green; the 10-24 pipeline is ~2.5x faster than 10-23.

## Findings, ranked (dedupe of the five reports)
1. **Tests do not see what Michael sees.** Green e2e + checker PASS = no crash and systems as specified, not "plays well".
   ~10-12 of his ~30 finds are cheap to automate: picture regressions per map / preset, input-only co-op (real client
   inputs, background tab, rejoin, every prompt changes state, one sound per shot), restart-reset on every map and
   section, perf trend at 24 guards per train, level validator incl. out-of-bounds flood fill and door swing, /preview/
   freshness. Feel, look and AI judgement keep needing Michael, so his walk time is the scarce resource.
   Started 21:35: visual-gate (Sector Ops), coop-real (Player), level-validator (Marlow).
2. **Michael's walks are the limit, and work outruns them.** 47 PRs since the last Marlow walk; AF7-AF9 gated on AF0-AF6
   for 24 h+; "Waiting on Michael" last rewritten 10-22. Animation got 4 negative verdicts in 4 days after ~40 anim PRs
   that passed every numeric check. Fix: cap unwalked features per area, a 10-min walk card per release ranked by risk,
   short look videos for anim / lighting PRs, an acceptance line per walk item.
3. **Intent is checked too late.** No plan review (plan and go the same minute); BRIEF "verbatim" is often the
   orchestrator's option text; assumptions widen Michael's rules (guard-cap A1 lifted no-perf-tuning; 41 assumptions on
   sector-redesign); campus detail art went ahead on an unwalked greybox and S1-S3 now need a re-plan. Fix: fresh Opus
   plan checker (intent, gates, file / map / wire claims); one-page to-scale visual sign-off before greybox for maps and
   looks; BRIEF splits "Michael said" from "Michael picked"; assumptions touching a Michael-only rule become a one-click
   question by day.
4. **The "no refining until Michael playtests the core loop" rule is in name only.** Lifted piecemeal; polish, campus art,
   guard models, coop4 and optic run while the goal level's full co-op walk has not happened. Michael's call.
5. **Regressions surface in trains, not PRs.** 6 of 11 closed trains were member bugs that passed their checker (S23 failed
   4 trains over ~4 h). Fix: #251 affected suites run automatically on every PR head (cloud too) before the label;
   auto-drop #343 (checked, after #251); flake budget per suite with quarantine + owner + expiry instead of "flake
   stands"; a desktop red never final without the laptop.
6. **Swaps are the biggest single cost.** Fix: a swap script (WIP branches on origin per lead, locks, queued runs, meters
   -> "safe"), one short boot line per title, agents commit at each sub-step (no WIP save needed), cloud claims expire
   without a heartbeat, lean resume reads.
7. **Rules sprawl and drift.** CLAUDE.md 39 KB with 5+ "overrides the wording below" pairs and stale machine / GPU /
   co-op-size rules; each job reads its own frozen branch copy (feature/menu is 1,228 commits behind master; leads never
   merge master); STATE "Pacing" 20 bullets, ~18 superseded; HANDOFF 87 KB; ROADMAP 82 KB with two "Now" sections.
   ~50k tokens per start x 6 sessions x ~7 swaps a day. Fix: one current rulebook on master (~150 lines), read via
   `git show origin/master:`; history to an archive; STATE "Now" <= 40 lines and HANDOFF newest block only, enforced by
   queue-audit; ROADMAP rewritten as one ranked queue + Inbox + Waiting; Decided folded into DECISIONS daily.
8. **The orchestrator is a single point of failure doing code's job.** Labels, culprit picks, locks, orphans, conflicts,
   deploy checks, claim reopen, resume pings all stop while it is mid-turn or swapping; the 10-min cron re-reads a
   655-word prompt 144x a day. Example tonight: a "hold until train 64" message idled three leads ~30 min. Fix: a
   watchdog task beside auto-train (PID + heartbeat locks, orphan reaper, queue-audit, CONFLICTING / unlabelled-green PRs,
   label only on a checker-verdict status, Pages freshness, idle sessions with work) writing alerts JSON; the LLM cron
   reads alerts every 20-30 min.
9. **Release path gaps.** Release headings name members that were left out (3 of 22); build pushes and opens the PR before
   validating (3 trains died after opening); the tail (merge, tag, dev, close members) is not repaired if it dies
   midway; deploy re-runs lint + vitest (~18 min per release) and nothing checks /preview/ shows the release; the live
   auto-train checkout was stale for ~24 h on train 56 code and is shared with agents; laptop-e2e statuses have no
   provenance. Fix: derive title / kind / changelog from merged members; validate on git objects, push once; per-tick
   repair of dev / tag / members; one deploy dispatched after release without re-testing + version check; a dedicated
   auto-train checkout that self-updates at every tick start; release needs a matching done record on laptop-queue.
10. **Big-bang branches.** guard-models 25k lines / 21 h, section-rating 50k / 19 h; checkers cannot review that; 14 master
    merges into job branches after the ban; #313 CONFLICTING 227 min. Fix: PRs capped at ~1.5k lines or ~4 h, unfinished
    work dark behind a flag, each flag with an owner and a switch-on date.
11. **Token spend not where it should be.** All five leads Opus high (CLAUDE.md says Player / Marlow medium); cloud builders
    Opus on Sonnet-grade briefs; bookkeeping by Opus leads; two Opus checkers on AI PRs. Fix: align PROMPTS with
    CLAUDE.md, Haiku for STATE / log chores, Sonnet cloud builders for data / greybox, two checkers only on src/net.
12. **Wasted laptop runs.** ~30 requests withdrawn as stale; 21 of 63 labelled PRs got commits after the label. Fix: the
    queue drops older requests of the same branch; a commit after the label removes the label.
13. **Permissions broad, Michael the manual gate.** Allow `Stop-Process *`, `gh pr close *`, label add with 0 deny rules;
    11 auto-mode blocks, 68 laptop chains disabled by hand, stale locks "on Michael's word". Fix: script wrappers (kill
    by PID with a NightShift command line, close only PRs whose head is in master, label only with a verdict status);
    deny force-push, branch delete, `gh pr merge`; laptop allow list = desktop; one MICHAEL-TODO list.
14. **Pipeline churn during the burn.** 44% of 10-24 PRs were pipeline / flake work; 5 trains closed on process bugs. Fix:
    pipeline changes ride one batch PR per train with a dry run.
15. **Clutter.** 340 worktrees (228 idle 24 h+), 593 remote branches, cloud output stranded (AF0b, G4b, stealth-pays-client-intel
    done 24 h+ unmerged). Fix: prune worktrees of merged branches (branch deletion stays Michael's call); a lead picks up
    a done brief within 1 h or closes it.

## Target process (idea -> in game)
1. Michael's words -> Inbox line (any session, at once) -> orchestrator triage each cron.
2. BRIEF (quote vs picked) -> Opus PLAN with claims (files, maps, wire) -> fresh plan checker -> maps / looks: one-page
   visual sign-off (one click) -> build.
3. Slices <= ~1.5k lines, dark behind a flag; Sonnet builds from Opus briefs; agents commit each sub-step.
4. PR head: checker + affected suites automatically -> label set by the watchdog when both are green.
5. Overlapping trains + auto-drop -> release -> one deploy -> /preview/ version check.
6. Walk card for Michael (10 min, risk-ranked, look videos) -> acceptance per item -> flag on.
7. Watchdog + auto-train own the path; the orchestrator reads alerts, plans, and brings Michael decisions.

## Already running from this audit (21:00-21:45)
auto-train 1-min ticks; desktop queue on master, 1 min, CPU 80 / backlog 0 restored; #343 auto-drop (PASS, waits for
#251); #344 stacked trains (in train 65); #342 queue overlap + 5 audit fixes (train-ready); auto-train checkout moved to
master; visual-gate, coop-real jobs; desktop G10a bake.
