# Night Shift - roadmap

Owned by the orchestrator (the only editor). Rules: CLAUDE.md "Sessions" on origin/master. Sections: Now (one ranked
queue), Inbox (Michael's new ideas, untriaged), Waiting on Michael, Decided (today only), Done (last 10 releases).
History: `docs/orchestrator/archive/` (ROADMAP-history.md: the old Waiting / Now / Next / Later and the full Done
table; ROADMAP-decided-history.md: Decided before 2026-10-24).

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level (Marlow Yard) with Wren, all co-op
moves, lights and shadows, pure CT except Michael's decisions. Refining is allowed (no-refining rule lifted 2026-10-24
~21:50), paced by the walk cap (3 unwalked features per area) and gated by the one-click visual sign-off.

Last rewritten: 2026-10-24 ~22:15 Sydney (master 4.96.0, train 64 #341; train 65 #345 open).

## Now
Ranked. Gate = what must be true before the next step. A lead at the walk cap takes only tests, fixes and automation.

| # | Item | Owner | Gate |
| --- | --- | --- | --- |
| 1 | Train 65 #345 (4.97.0): #344 stacked builds (overlapping trains), #339 campus fog fix, #333 per-section campus bake, #251 e2e `--affected` | auto-train / Orchestrator | CI + laptop full e2e on the train head |
| 2 | Train 66: #342 queue overlap + alone preemption (train-ready), #343 auto-drop (after #251 lands) | Test Runner, Orchestrator | label on CI + checker + suites |
| 3 | Package "one rulebook, lean docs": PR #347 (CLAUDE.md rulebook, master) + branch docs/lean-orchestrator (this file, STATE, HANDOFF, PROMPTS, BOOT) | Orchestrator | CI on #347; merge docs/lean-orchestrator into feature/menu |
| 4 | Package "watchdog + release path" (audit findings 8, 9): watchdog beside auto-train (PID locks, orphans, queue-audit, conflicting / unlabelled green PRs, Pages freshness, idle sessions -> alerts JSON); release derives its title from members, validates before push, repairs its tail, one deploy + /preview/ version check | Orchestrator assigns (Opus plan) | plan checker |
| 5 | Package "cheap swaps" (finding 6): swap script (locks, queued runs, meters -> "safe"), cloud claims expire without a heartbeat; boot lines done in docs/lean-orchestrator | Orchestrator | plan checker |
| 6 | Package "intake gates + small PRs" (findings 3, 10): rules in #347; tooling: PR size check (~1.5k lines), flag owner / switch-on date check, queue-audit doc-size limits | Orchestrator assigns | plan checker |
| 7 | coop4 #317: Sector Ops up to 4 players (Marlow Yard stays 2); then the feature/coop4-pol follow-up | Guard AI | laptop sets coop4 + coop4-4p green on the head, then label |
| 8 | coop-real: input-only co-op e2e (plan origin/feature/coop-real 436ecaf4, suite e2e-coop-real, fixes F1-F4, ~7 h) | Player | plan checker; `src/net` slices after #317 |
| 9 | visual-gate: picture check per map x Low / Epic vs the last release + light-parity grid per map | Sector Ops | Opus plan, plan checker |
| 10 | level-validator: V5f run on campus S1-S5, V1b metrics keys, CHK, one PR | Marlow | checker + CI |
| 11 | Guard models on by default (feature/gm-flip): G10a hairline fix + desktop bake, flag flip, flag-on suites, contact sheet to Michael (no stop) | Player | flag-on suites (enemies coop ctcourse combat guard-carry) |
| 12 | guard-cap: M0 / M1 laptop measures, then C1 / N1 / K1 / M2 (Guard AI's T1 / D1-D2 cloud briefs wait on M0) | Marlow | guard-models + gm-perf merged; M0 verdict |
| 13 | Test Runner next job: affected e2e in the queue + a flake budget per suite (quarantine, owner, expiry) | Test Runner | after trains 65 / 66; plan checker |
| 14 | Campus S1-S3 re-plan (rooms, hall sizes, door swing, out-of-bounds) | Sector Ops | level-validator merged + Michael's campus walk notes + one-click visual sign-off |
| 15 | AF7-AF9 animation pass (briefs/afp-next-pass.md) | Player | Michael walks AF0-AF6 (walk cap) |

Parked ideas (co-op modes and levels, dev tools menu + level editor, Moth as player 2, WebGPU, Wren cleanup, more co-op
player characters after all levels): `docs/orchestrator/archive/ROADMAP-history.md` "Later". Spare jobs:
`docs/orchestrator/spare-jobs.md`.

## Inbox
Michael's new ideas, verbatim, with the time; the orchestrator triages each cron run onto Now, Waiting or Decided.
- (empty)

## Waiting on Michael
| Item | Since | Blocks |
| --- | --- | --- |
| Walk AF0-AF6 (animation fix pass, 4.84.0) | 2026-10-23 ~20:45 | AF7-AF9; any new animation feature (cap) |
| Full co-op walk of Marlow Yard (two players, end to end) | 2026-10-22 | the goal's sign-off; Marlow polish list; W5 A2 re-walk |
| Campus walk S1-S5 on 4.95.1+ (started ~20:12; the fog fix lands in 4.97.0) | 2026-10-24 ~20:12 | campus S1-S3 re-plan (Now 14) |
| Laptop allow rule for `gh pr edit --add-label` (laptop leads cannot label; the orchestrator labels for them) | 2026-10-24 ~18:52 | nothing hard; one extra hop per laptop PR |
| Branch / worktree prune (~340 worktrees, ~590 remote branches; deleting branches is his call) | 2026-10-24 | clutter only |
| Non-blocking answers: joint interrogation A1 / A2 (Marlow); Guard AI S23 client arcs / LKP ghost, S25 searchers' flares; Sector Ops look notes (dark ceilings over cone fittings, NV in S3 / S4) | 2026-10-24 | nothing (assumed, logged) |
| Older walk items from the 2026-10-22 list (vents T1, landing roll room, wall block muzzle) | 2026-10-22 | nothing; they ride the next walk card |

Unwalked features per area (cap 3; estimated from the CHANGELOG since each area's last walk, the orchestrator
confirms at the next walk card):
| Area | Last walk | Unwalked since | Count |
| --- | --- | --- | --- |
| Player / animation | 4.72-4.73 (2026-10-23 ~13:55) | AF0-AF6 pass, rig-pose fix, optic cable partner view, client body carry | 4: AT CAP |
| Marlow Yard | 4.82.0 solo (2026-10-23 ~22:15) | training cameras, LR16 re-light, joint interrogation | 3: AT CAP |
| Sector Ops | campus walk in progress | campus S1-S5 art + lighting, coop4 AI, per-section bake | 3: AT CAP until the walk lands |
| Guard AI | 4.72-4.73 | report-then-engage, hearing in fights, cover lines, response sweep, sight rays | 5: AT CAP |
| Lighting | 4.78.0 (2026-10-23 ~18:08) | LR16 on every map, moving lights LR16-5, thermal through doors | 3: AT CAP |

## Decided
Today only (2026-10-24), newest first. Older entries: `docs/orchestrator/archive/ROADMAP-decided-history.md`; the
orchestrator folds entries into `docs/DECISIONS.md` daily.
- Process audit decisions (2026-10-24 ~21:50, native multiple choice on docs/orchestrator/PROCESS-AUDIT-2026-10-24.md): (1) start all four fix packages: watchdog + release path, one rulebook + lean docs, cheap swaps, intake gates + small PRs; (2) the "no refining until Michael playtests the core loop" rule is LIFTED formally (CLAUDE.md to match); (3) walk pacing "Cap 3 + walk card": at most 3 unwalked features per area (a lead at the cap works on tests / fixes / automation), each release gets a 10-min risk-ranked walk card with look videos for animation and lighting; (4) "Yes, one-click sign-off": before greybox or art on a map, or a big look change, Michael gets a one-page to-scale plan + 5-line intent check to approve with one click.
- coop-real (2026-10-24 ~21:35, orchestrator under the 15:10 idle-lead rule, from the process audit: 5 of Michael's ~30 walk finds were co-op bugs every test passed): Player Build plans an input-only co-op e2e (real client inputs, no state pokes, background tab, rejoin after the host moved, every offered prompt changes state, one sound per shot, client actions reach the host, E2E_NETSIM=typical). A test job, not refining. Plan up ~21:50: origin/feature/coop-real 436ecaf4 (suite e2e-coop-real, 2 parts ~2 min; then fixes F1 S2 client lamp shots in Course mode, F2 backgrounded tab drop, F3-F4; ~7 h; overlaps #317 coop4 in src/net). Player's G10a guard rebake runs on the idle desktop under heavy.lock.
- visual-gate (2026-10-24 ~21:32, orchestrator under the 15:10 idle-lead rule, from the process audit: ~8 of Michael's ~30 walk finds were visual / GPU and passed every test): Sector Ops plans an automated picture check (fixed viewpoints per map x Low / Epic, luma / near-black / haze / blotch metrics vs the last release, flagged in the train) and a light-parity grid per map (meter vs pixel luma) extending e2e-darkness beyond the Warehouse. A test job, not refining.
- Train speed-ups (2026-10-24 ~21:00, native multiple choice, all three picked after the orchestrator measured label -> master median ~43 min, 5 of 20 trains failed): (1) auto-drop on failure: auto-train drops the member whose suites failed and rebuilds at once (feature/auto-train-autodrop, Opus); (2) 1-minute ticks: the NightShift auto-train task set to every 1 min by the orchestrator, Michael runs the #335 install-task commands for the desktop and laptop queue workers; (3) overlapping trains: train N+1 built on train N and tested on the other machine while N runs (Opus plan first, builds after auto-drop since both touch scripts/auto-train.mjs).
- Level standard extras (2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras", after the orchestrator's review of Michael's uploaded stealth-level-design skill, files in C:/NightShift/scratch/stealth-level-design/): keep docs/level-design.md and ADD (1) a connectivity-graph JSON per map before any geometry plus a Node validator (port of its validate_level.py: reachability, solo / co-op completability, 3+ approaches of 2+ kinds, dead ends, room-class sizes, opening minimums, 0.5 m grid, ceilings, 2+ independent routes, co-op coverage, split parity, beat pacing) with OUR metrics (scale sheet: corridors 3.5-4.0 m, doors 1.2 x 2.1, nav limits); (2) a room-size-by-type table in the scale sheet (camera-adjusted); (3) numeric targets: routes cross at least once, vantage sees ~70% of the space, 40-60% floor in shadow, line of sight breakable within ~5 s anywhere, guard counts per space early / late and per player count; (4) co-op rules for the section 11 rewrite: splits <= 90 s, path parity within 20%, partners act for each other, an overwatch spot per split, a downed partner reachable within 15 s, shared routes >= 2.0 m wide. Keep the linear spine between sections (CT research), loops inside them. Every map passes the validator before greybox; campus is its first run (~20:12 Michael: "Do the entire campus": all five sections S1-S5, not only S1-S3). Job level-validator (Marlow Build, Opus plan, Sonnet build, one checker, one PR). ~20:18 Michael approved with four changes: (a) scale the ROOM table too (start ~1.3-1.5x real, matching our corridor / door scaling, tuned in greybox) so the camera works in every room; (b) every size comes from one metrics JSON generated from docs/design/scale-sheet.md (one source of truth; no hardcoded sizes in the script); (c) route redundancy per SECTION: each space carries `section`, check 2+ independent routes from each section's entry to its exit (chain between sections, loops within); (d) declared numbers (shadow %, 70% vantage view, 5 s line-of-sight break, 15 s revive reach) are targets in the layout check and are MEASURED in greybox (light sampling, navmesh distances): the map fails if measured differs; split parity uses traversal TIME on links, not room length. Also: guard counts (3-6 early, 6-10 late) are checked against our guard sheets before they become rules; arena mode parked for the later co-op modes idea.
- 2026-10-24 ~15:10 (standing rule): "if you ever run out of tasks, start making progress on the next feature/task." An idle lead with no PLAN slice left starts the next roadmap feature in its area (Opus plan first), instead of idling; the orchestrator assigns it. First use: Sector Ops 4-player co-op (Sector Ops plans, Marlow takes slices).

## Done
Last 10 releases; the full list is `CHANGELOG.md` on master (the old table: archive/ROADMAP-history.md).
| Version | PR | What |
| --- | --- | --- |
| 4.96.0 | #341 | Train 64: guard rendering phase 2, 24 guards (#323) |
| 4.95.3 | #340 | Train 63: laptop queue alone starvation, desktop CPU gates, faster restart (#335) |
| 4.95.2 | #338 | Train 62: Pages deploys queue instead of cancelling, Player batch 24, train fragment fallback (#337, #331, #330) |
| 4.95.1 | #334 | Train 60: allocation-free sight rays (#326) |
| 4.95.0 | #332 | Train 59: laptop queue audit fixes, joint interrogation flake, lightField retry, optic cable partner view, client body carry (#329, #328, #327, #314, #313) |
| 4.94.0 | #325 | Train 58: e2e-lightbake shader wait; guard models behind a flag (#322, #318) |
| 4.93.0 | #321 | Train 56: guards against up to 4 intruders, coop4 AI (#319) |
| 4.92.0 | #320 | Train 55: gameplay reads game state, not the animated body (#308) |
| 4.91.0 | #315 | Train 53: joint interrogation check fixes (#311) |
| 4.90.0 | #312 | Train 52: joint interrogation G148 (#310) |

## Previews
Live game, `/preview/` (master via `dev`), `/ct/` (via `ct-movement`): `docs/systems/deploy.md`.
