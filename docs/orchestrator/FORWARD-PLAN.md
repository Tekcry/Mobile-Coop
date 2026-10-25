# Night Shift forward plan v2 (2026-10-25 ~12:10, for the orchestrator)

Checked ~12:05: master 4.101.0 (train 85). Docs open: #398, #402, #404 (checker PASS, affected-e2e pending), #400 (lint red).

## 1. Goal (Michael)
- "All three in parallel" (G347): Marlow Yard, Sector Ops campus and Tallow Wharf, each under its own lead.
- First: "All current maps/features should be revised once documentation work has been completed" (G355): a plan-only conformance review per lead; the walk cap limits switch-on only; rule fixes are allowed at the cap.
- "Let finished ones ship" (G346).

## 2. Now (ranked; replaces ROADMAP Now)
| # | Item | Owner | Gate | Depends on |
|---|---|---|---|---|
| **Phase 0** |
| 0a | Land #398, #402, #404; fix #400 lint, land it | Orchestrator | Released | affected-e2e |
| 0b | Ship #387, #385, #403 (train-ready); #384, #389 when affected-e2e is green | Orchestrator | Released | queue |
| **Phase 1: conformance reviews, one session each, in parallel (review-briefs/)** |
| 1 | Player: movement, animation, co-op player, guard models | Player | Docs PR, checker PASS | 0a |
| 2 | Marlow: Marlow Yard + mission-framework; Tallow Wharf + level validator + guard cap | Marlow | as 1 | 0a |
| 3 | Sector Ops: Saltmarsh Park S1-S5; lighting on every map; visual gate | Sector Ops | as 1 | 0a |
| 4 | Guard AI: `src/ai` on every map (G335, G338 / G341 / G350, G348, G352) | Guard AI | as 1 | 0a |
| 5 | Test Runner: suites and queue vs RULES; flake budget | Test Runner | as 1 | 0a |
| 6 | Fold the five gap lists into this plan; one sign-off for Michael | Orchestrator | Michael picks | 1-5 |
| **Phase 2: signed-off builds, dark behind flags** |
| 7 | Rule fixes (allowed at cap): remove compass / blip (hud.ts:34-35, :264; gameState.ts:3634), minimap (hud/minimap.ts), briefing and field-menu maps; objective popup, View / O, ~5 s, what and where (G336, G339, G343, G351) | Marlow | affected-e2e + checker | 6 |
| 8 | Tallow Wharf GB5 / GB6 + 3 gate-reach ERRs (w2-reading-room 20.0 s, w2-clock-loft 28.2 s, w4-jetty 15.8 s); A10 void, A12 re-plan (G339, G334); campaign cap 32 (G359) | Marlow | 0 ERR; plan checker | 6 |
| 9 | Campus greybox S1-S5 lanes (feature/campus-greybox c2f1f131); graphs `players: [1,2,3,4]`, per-count guards (G362), `unavoidable` tags | Sector Ops | Validator; V6 at exit | 6 |
| 10 | light-realism lux bands, S1 car park first (G329; feature/light-realism bd8b843e) | Sector Ops | Lux grid to Michael | 6 |
| 11 | Character shadows read by meter and guards (G352) | Sector Ops (meter), Guard AI (perception) | Opus plan; two checkers | 6, 10 |
| 12 | Stars fill lower tiers (G331; src/save/sectorRecord.ts:14-16) | Sector Ops | affected-e2e | 6 |
| 13 | route-runs (G330; feature/route-runs 9b8ee6ca) + V6 PR (feature/level-validator-v6 8f551e18) | Marlow | Plan checker | 6 |
| 14 | Lookouts + paired patrols (G335), helmets by tier (G350), dogs (G348), #360 redone as shadow-in-view (G327, wip/guard-ai-t1-shadow) | Guard AI | Plan checker; two checkers | 4, 6 |
| 15 | Marlow Yard: downed (G349), drill retry (G361), strict rule late (G357), later sections (G363) | Marlow | Checker | 6 |
| 16 | coop-real (#388), coop4 (#317), gm-flip (#375, after Michael's picks) | Player, Guard AI | As today | 6 |
| 17 | Flake budget + affected-e2e per head; laptop-queue-5 | Test Runner | Plan checker | 5 |

## 3. Close or drop
- ROADMAP Now 2 (#347-#353 merged), 2a (doc-clarity; only 0a left), 11 (disk done), Now 1's sweep note (#373, #377 shipped), Now 3's A10 text (void).
- Now 13 AF7-AF9: to Waiting (needs the AF0-AF6 walk).
- spare-jobs.md Open #9 (#310), #14 (#313), #12 (#308) shipped; #15 partly (#314): move to Done, keep #15's rest.
- Player rig-pose row (stale).
- #360 (HOLD, 53ac2c9b): close when the shadow-in-view PR opens; never label.

## 4. Open PRs
| PR | What | State |
|---|---|---|
| #387 | Guard AI one-mover | train-ready |
| #385 | Section-bake polish 4 | train-ready |
| #403 | Queue locks (process) | train-ready |
| #384 | Co-op lamp shot across restart | checkers x2 PASS; affected-e2e running |
| #389 | Client intel | checkers x2 PASS; affected-e2e running |
| #375 | gm-flip | checker PASS; needs `big-pr`; affected-e2e queued; Michael's look picks |
| #372 | Mission framework PR A | no checker on 5181c9db; needs `big-pr`; sign-off pages |
| #317, #388 | coop4, coop-real | drafts |

## 5. Walk card and Michael
- Walks: AF0-AF6 animation; Marlow Yard full co-op; campus; Guard AI and lighting at cap with no walk item.
- One-clicks: #375 look picks; #372 prototype sign-offs; G157's 12 level-standard changes before Tallow Wharf.
- Tell him: guard-count research (G359; scratch/doc-clarity/GUARD-COUNT-RESEARCH.md: CT co-op ~17-31 per mission, 1-4 per room).
- His commands: watchdog install, desktop queue to master, branch prune.
- Questions (native multiple choice): (1) first walk: "Marlow Yard co-op" / "AF0-AF6" / "Guard AI fights"; (2) campus v1 walk: "Drop it, walk v2 at greybox exit" / "Finish v1 now".
