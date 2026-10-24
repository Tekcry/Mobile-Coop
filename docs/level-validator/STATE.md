# level-validator - state

Job from Michael (2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras"; ROADMAP Decided top entry on
feature/menu 58d61ed9). Lead: Night Shift | Marlow Build. Branch feature/level-validator, worktree
C:/NightShift/Mobile-Coop-level-validator. Michael's uploaded skill (reference, not our rules): docs/level-validator/source/
(SKILL.md, validate_level.py, example_level.json; copied from C:/NightShift/scratch/stealth-level-design/).

## Now (2026-10-24 ~22:45)
- ~22:05 MICHAEL (via orchestrator, ROADMAP Decided ~22:00): (1) campus S1-S5 fixes / S3 re-plan WAIT for the mission design audit (C:/NightShift/scratch/mission-audit/), then planned with its rules + his sign-off. (2) "Yes, require it": `--require-measured` goes into level-design.md's greybox exit IN THE V6 PR. (3) Guards "as many as realistically possible": NO upper band; WARN only BELOW 3-6 early / 6-10 late; remove `guards_max` (scale-sheet row 153, metrics.json, level-validate.mjs:635-638, tests levelValidate.test.ts:441-445 + :455-468, metricsGen.test.ts:49); REPORT guard section -> his decision; level-design 4.9 wording. DO THIS IN #346 BEFORE train-ready (not started at the 22:06 save). Post a `checker` commit status when a checker passes.
- SAVE 22:06: v6a WIP ed695881; v6b / v6d no files yet (agents running; rerun from V6-PLAN.md if cut off).
- PR #346 OPEN (feature/level-validator 2de3b69a): V0-V5 + V1b + fix round; checkers V1 PASS, CHK PASS, V5 spot-check PASS. CI pending; on green add `train-ready` (no laptop suites: no src). Orchestrator told (PR open).
- V6 (next PR, stacked on #346): base feature/level-validator-v6 (2de3b69a), plan docs/level-validator/V6-PLAN.md. RUNNING: V6a Opus (-v6a, schema doc + example), V6b Opus (-v6b, src/world/levelMeasure.ts + test), V6d Sonnet (-v6d, checkMeasured in level-validate.mjs). Then V6c (CLI, Sonnet from V6b's API), V6e (campus run), one Opus checker, PR. Merge each slice into feature/level-validator-v6 on hand-back. If cut off: rerun the slice from V6-PLAN.md in its worktree (C:/NightShift/Mobile-Coop-level-validator-v6<x>).
- Michael decisions at #346 / V6 PR: guard bands INFO only (recommended); `--require-measured` in the greybox exit (V6 PR).
- guard-cap: gates gm-flip / guard-render-2 / coop4 not on master; M0 / M1 laptop results not pushed (origin/feature/guard-cap-results absent at 22:45).

## Merged so far
- DOC 2282fcd4 (4b0cae74), V2 6a697f49 (2e5d23e7), V4 0e0362ce + V3 3ef64512 (6b8fb90a). V1 + V1a OPEN on cloud-queue (contract for metrics.json in both briefs, 1531ff0f).
- For the checker / Michael (V4/V3 clashes, resolved additions-only): 11.6 states the 30 s REVIVE_WINDOW (src/game/reviveClock.ts:8, G126; old text said no bleed-out); 11.8 cites G151 (replaced G81) but 12.2 still names G81 marked spots (left: additions only outside 11); 11.1 "no fewer than two" scoped to campaign maps (G280 Sector Ops solo play); 6.2 pacing line added beyond PLAN V3 (the validator checks pacing). V2: 8 room classes use "Marlow estimate" real sizes.
- V0 merged (036b39b6) + lead decisions on its gaps in graph-schema.md (46f09d60): pair_gate, team_rope, rappel, spine link = release, middle-to-middle length, time_s WARN, open ceilings skip. Sent to V1 as an Answer on its cloud brief (9f1003f0).
- V1a MERGED (f72e640c, Sonnet checker PASS; should-fix for later: a --check WARN when a contract key goes missing, tests for section 7 / 3 parse errors). V1 claimed by Cloud Builder 1 (09:12Z).
- ~21:40: V5a S1 (b0853eef), V5d S4 (3d58a6dc), V5e S5 (c59c4a71), V5c S3 (78fc01ac) MERGED; V5b S2 running. V1 DONE on cloud (feature/level-validator-v1 e869ea92): Opus checker running (report scratchpad V1-check.md). V5f worktree C:/NightShift/Mobile-Coop-level-validator-v5f (feature/level-validator-v5f = job head + V1 merged ca1070d3): the CLI merges the five files as one map, so V5f starts when S2 lands. V5f owns the five graph files + REPORT: fix spine ids (S1 guessed s2-reception; S3 left spine links out, entry s3-c2 exit s3-dock; S4 owns s4-cc -> s5-lobby; S5 entry s5-lobby exit s5-lawn), one 'start' tag, and ONE encounter rule for all five (S4 typed every guarded room an encounter).
- ~22:05: V5b S2 merged (f832af4d); V1 MERGED (checker PASS, docs/level-validator/V1-check.md; vitest not run locally, builder 48/48, CI runs it). V5f (Opus) RUNNING in -v5f: spine reconcile, one start, one encounter rule, run.txt + REPORT.md. V1b POSTED OPEN on cloud-queue (briefs/level-validator-V1b.md, 961fc6a7): 16 keys + should-fixes 1-5. After V5f + V1b: merge both, rerun the CLI on S1-S5 (V5f's run.txt with all keys), CHK (one Opus checker on the whole job diff), PR.
- (superseded by the cloud brief) V1b Sonnet = the 17 metrics keys V1 reads that metrics.json lacks (scale-sheet section 8 + metrics-gen + its test; list in the V1 brief report on cloud-queue).
- 2026-10-24 ~20:50 (swap resume): V5a-e were cut off with no files; RERUN, worktrees ff'd to c7784fc9 (V2 room classes + metrics.json in), shared brief C:/Users/Micha/AppData/Local/Temp/claude/C--NightShift/144be1af-f27a-4147-a617-b2f381a3e5a9/scratchpad/v5-brief.md (S1-S5 now; S4 / S5 from campusS4.ts / campusS4Data.ts, campusS5.ts / campusS5Data.ts). V1 reopened on cloud-queue at the swap (Cloud Builder 1 running). guard-cap: gates gm-flip / guard-render-2 / coop4 not on master; M0 / M1 results not pushed yet.
- RUNNING (~20:28, CPU 10%): V5a-e Sonnet, worktrees C:/NightShift/Mobile-Coop-level-validator-v5s1..5, branches feature/level-validator-v5s1..5; each writes docs/sector-redesign/graph/campusOps-S<n>.json + docs/level-validator/campus-run/S<n>.md only. If cut off: rerun that section from PLAN V5 + graph-schema.md.
- Next: merge V1a (on PASS), V5a-e, V1 (after an Opus checker) -> V5f run on all five + REPORT -> CHK -> PR.

## Running (2026-10-24 ~20:11; orchestrator: start now, cap ~21:00)
- V0 Opus: C:/NightShift/Mobile-Coop-level-validator-v0, feature/level-validator-v0
- V2 Sonnet: -v2, feature/level-validator-v2 (scale-sheet.md only)
- V4 then V3 Opus: -v34, feature/level-validator-v34 (level-design.md only)
- DOC Sonnet: -doc, feature/level-validator-doc (testing-tools, changelog fragment, TESTING line)
- V1: cloud-queue briefs/level-validator-v1.md (open, 276f32ff), branch feature/level-validator-v1
Each slice branch is off b89a2a67 and touches only its own files: merge each into feature/level-validator after its hand-back (no conflicts expected). If cut off: rerun the slice from PLAN with the same worktree / branch.
Then: V1a (cloud, after V2), V5a-e (after V0; M5 all five sections), V5f, CHK, PR.

## PLAN DONE 96d03285 (20:07): BRIEF M1-M4 + PLAN "M1-M4 (override the slice text below)" block; ready to build
- Start now, in parallel (PLAN slice + ownership tables): V0 graph schema (Opus), V1 validator port + Vitest (Sonnet,
  cloud-queue brief; builds against a test metrics object until V1a), V2 scale-sheet room table x1.4 + section 8
  "Validator numbers" (Sonnet), V4 then V3 in level-design.md (one Opus agent, same file), DOC (Sonnet / Haiku).
- Then: V1a metrics-gen + metrics.json + test (Sonnet, cloud, after V2); V5a-e campus S1-S5 graphs (M5, Sonnet x5,
  after V0); V5f first run on all five + REPORT (Opus, after V1 + V1a + V5a-e); one Opus checker; one PR. V6 (greybox measurement,
  src/) is the step after this PR.
- Known gap: BRIEF mapping-table rows and V1's constant list still show the old rules; the M block wins (V1's brief
  writer follows it). Safe-drop height constant TODO (V1 greps; WARN above 3.5 m fallback).

## Michael's approval changes (~20:08, via the orchestrator; full text ROADMAP Decided top entry, feature/menu)
- M1 (a) Room-size table scaled ~1.3-1.5x real (like corridors / doors), tuned in greybox; no room passes that the camera cannot work in.
- M2 (b) ONE metrics JSON generated from docs/design/scale-sheet.md (generator script + a test that the JSON matches the sheet); nothing hardcoded in the validator.
- M3 (c) Route redundancy per section: every space has a `section`; 2+ independent routes from each section's entry to its exit.
- M4 (d) Declared values (shadow %, 70% vantage, 5 s LOS break, 15 s revive reach) are targets only in the JSON check; a greybox measurement step (light bake sampling, navmesh path distance / time) measures them and the map fails on a mismatch. Split parity = traversal time on links, not room length.
- Guard counts (3-6 early, 6-10 late): compare with our guard sheets before making them rules. Arena mode parked.
- Michael offered his own Node port: reference only if it arrives (we build here: repo tests, CI, our metrics).

## Next
1. Opus PLAN (BRIEF with Michael's words + A1.., PLAN slices: validator port + tests (cloud-queue), graph JSON schema,
   scale-sheet room table, level-design numeric targets, section 11 co-op rewrite, campus S1-S3 graphs as first run).
2. Sonnet builders per slice (validator code + tests to cloud-queue), one Opus checker, one PR.

## Planner prompt (rerun)
Opus, plan only, docs only on feature/level-validator: read docs/systems/agent-preamble.md, CLAUDE.md "Hard rules",
the ROADMAP Decided entry "Level standard extras" (git show origin/feature/menu:docs/ROADMAP.md), docs/level-validator/source/*,
docs/level-design.md (esp. section 11, 12, 16, the SVG format), docs/design/scale-sheet.md, nav limits (src/ai nav grid
cell / step / climb constants), docs/campus-audit/BRIEF.md (paused audit: its goal is done through the validator's first
run on campus S1-S3). Write BRIEF.md and PLAN.md here; push WIP early.

## Resume prompt
```
Night Shift | Marlow Build: level-validator. PR #346 (feature/level-validator, worktree C:/NightShift/Mobile-Coop-level-validator) is the validator + campus S1-S5 run: on green CI add `train-ready` and message "Night Shift | Orchestrator"; never merge master into it. V6 (greybox measurement, next PR) on feature/level-validator-v6 (worktree C:/NightShift/Mobile-Coop-level-validator-v6), plan docs/level-validator/V6-PLAN.md: read STATE "Now" for which of V6a / V6b / V6d are merged; rerun any missing slice in its worktree -v6a / -v6b / -v6d from V6-PLAN.md; then V6c CLI (Sonnet, from V6b's exported API), V6e campus run, one Opus checker, PR (CI check only, node-only tooling). guard-cap beside it: docs/guard-cap/STATE.md on origin/feature/guard-cap (results on origin/feature/guard-cap-results; gated slices wait for gm-flip / guard-render-2 / coop4 on master).
Rules: CLAUDE.md "Sessions" / token rules; no desktop e2e; single vitest files --maxWorkers=2, desktop CPU < 80; Opus plans / checks, Sonnet builds from strict briefs; cloud-queue (C:/NightShift/scratch/cq) for heavy builder slices.
```
