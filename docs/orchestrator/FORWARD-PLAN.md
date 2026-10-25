# Night Shift forward plan v2 (2026-10-25 ~12:10, for the orchestrator)

Checked ~12:45: master 4.101.1 (train 86). Docs open: #407 (feature/doc-final; supersedes #398 / #402 / #404) and #400 (feature/doc-guard, stacked on #407).

## 1. Goal (Michael)
- "All three in parallel" (G347): Marlow Yard, Sector Ops campus and Tallow Wharf, each under its own lead.
- First: "All current maps/features should be revised once documentation work has been completed" (G355): a plan-only conformance review per lead; the walk cap limits switch-on only; rule fixes are allowed at the cap.
- "Let finished ones ship" (G346).

## 2. Now
Moved to ROADMAP "Now" on origin/feature/menu (rewritten ~12:35 from this plan); that table is the only ranked queue.
Owners (Michael ~12:50, new Campaign Build): Campaign Build owns the campaign rows: its conformance review
(review-briefs/campaign.md; row 6 then folds six gap lists), #372 mission framework A (row 0b), the rule fixes (row 7:
compass / blip / minimap / maps removal, objective popup) and Tallow Wharf (row 8: GB5 / GB6, the 3 gate-reach ERRs,
A10 void, A12 re-plan, campaign cap 32). Marlow Build keeps Marlow Yard (row 15), the validator and route-runs (row 13)
and the guard cap.

## 3. Close or drop
- ROADMAP Now 2 (#347-#353 merged), 2a (doc-clarity; only 0a left), 11 (disk done), Now 1's sweep note (#373, #377 shipped), Now 3's A10 text (void).
- Now 13 AF7-AF9: to Waiting (needs the AF0-AF6 walk).
- spare-jobs.md Open #9 (#310), #14 (#313), #12 (#308) shipped; #15 partly (#314): move to Done, keep #15's rest.
- Player rig-pose row (stale).
- #360 (HOLD, 53ac2c9b): close when the shadow-in-view PR opens; never label.

## 4. Open PRs
| PR | What | State |
|---|---|---|
| #407, #400 | doc-final, doc-guard (stacked) | train together once each has check + checker + affected-e2e |
| #408 | laptop-queue-5 | Test Runner fix round |
| #387 | Guard AI one-mover | released 4.101.1 |
| #385 | Section-bake polish 4 | released 4.101.1 |
| #403 | Queue locks (process) | released 4.101.1 |
| #384 | Co-op lamp shot across restart | train 87 (#409, 4.101.2) |
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
