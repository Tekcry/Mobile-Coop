# Night Shift - roadmap

Owned by the orchestrator (the only editor). Rules: docs/RULES.md on origin/master; the game: docs/VISION.md on
origin/master. Sections: Now (one ranked queue), Inbox (Michael's new ideas, untriaged), Waiting on Michael, Decided
(today only), Done (recent releases). History: `docs/orchestrator/archive/` (ROADMAP-history.md: the old Waiting / Now
/ Next / Later and the full Done table; ROADMAP-decided-history.md: Decided before 2026-10-25).

Goal: docs/VISION.md section 1 (Marlow Yard, Sector Ops campus and Tallow Wharf in parallel, each under its own lead,
after a conformance review of every map and feature against the new docs; G347, G355). Docs first: no new game work
until Michael signs off the folded plan; finished PRs ship (G346).

Last rewritten: 2026-10-25 ~12:35 Sydney from docs/orchestrator/FORWARD-PLAN.md v2 (master 4.101.1, train 86 #406).

## Now
Ranked. Gate = what must be true before the next step. The walk cap limits switch-on only; rule fixes are allowed at
the cap (G355).

| # | Item | Owner | Gate | Depends on |
| --- | --- | --- | --- | --- |
| **Phase 0** | | | | |
| 0a | Land #407 doc-final (level standard per mode, archive sweep, G344-G363; supersedes #398 / #402 / #404), then #400 doc-guard (stacked on #407: doc lint in CI, auto-archive, weekly prune; fix its pr-size / checker reds) and #408 laptop-queue-5 | Orchestrator (#407, #400), Test Runner (#408) | Released | checker + affected-e2e per head |
| 0b | Ship finished PRs (G346): #384 co-op lamp shot across restart (train-ready), #389 client intel (checkers x2 PASS); #375 gm-flip after Michael's look picks + `big-pr`; #372 mission framework A after a checker on its head, `big-pr` and the sign-off pages. #387, #385, #403 released in 4.101.1 | Orchestrator | Released | queue |
| **Phase 1** | **Conformance reviews, plan only, one per lead, in parallel** (brief: `docs/orchestrator/review-briefs/<lead>.md` on origin/feature/menu; output `docs/conformance-<lead>/CONFORMANCE.md`; the briefs' "#398, #402, #404" = #407) | | | |
| 1 | Player: movement, animation, co-op player, guard models | Player | Docs PR, checker PASS | 0a |
| 2 | Marlow: Marlow Yard + mission-framework; Tallow Wharf + level validator + guard cap | Marlow | as 1 | 0a |
| 3 | Sector Ops: Saltmarsh Park S1-S5; lighting on every map; visual gate | Sector Ops | as 1 | 0a |
| 4 | Guard AI: `src/ai` on every map (G335, G338 / G341 / G350, G348, G352) | Guard AI | as 1 | 0a |
| 5 | Test Runner: suites and queue vs RULES; flake budget | Test Runner | as 1 | 0a |
| 6 | Fold the five gap lists into one plan; one sign-off for Michael | Orchestrator | Michael picks | 1-5 |
| **Phase 2** | **Signed-off builds, dark behind flags** (only after Michael signs off row 6) | | | |
| 7 | Rule fixes (allowed at cap): remove compass / blip (hud.ts:34-35, :264; gameState.ts:3634), minimap (hud/minimap.ts), briefing and field-menu maps; objective popup, View / O, ~5 s, what and where (G336, G339, G343, G351) | Marlow | affected-e2e + checker | 6 |
| 8 | Tallow Wharf GB5 / GB6 + 3 gate-reach ERRs (w2-reading-room 20.0 s, w2-clock-loft 28.2 s, w4-jetty 15.8 s); A10 void, A12 re-plan (G339, G334); campaign cap 32 (G359) | Marlow | 0 ERR; plan checker | 6 |
| 9 | Campus greybox S1-S5 lanes (feature/campus-greybox c2f1f131); graphs `players: [1,2,3,4]`, per-count guards (G362), `unavoidable` tags | Sector Ops | Validator; V6 at exit | 6 |
| 10 | light-realism lux bands, S1 car park first (G329; feature/light-realism bd8b843e) | Sector Ops | Lux grid to Michael | 6 |
| 11 | Character shadows read by meter and guards (G352) | Sector Ops (meter), Guard AI (perception) | Opus plan; two checkers | 6, 10 |
| 12 | Stars fill lower tiers (G331; src/save/sectorRecord.ts:14-16) | Sector Ops | affected-e2e | 6 |
| 13 | route-runs (G330; feature/route-runs 9b8ee6ca) + V6 PR (feature/level-validator-v6 8f551e18) | Marlow | Plan checker | 6 |
| 14 | Lookouts + paired patrols (G335), helmets by tier (G350), dogs (G348), #360 redone as shadow-in-view (G327, wip/guard-ai-t1-shadow; close #360 when that PR opens, never label it) | Guard AI | Plan checker; two checkers | 4, 6 |
| 15 | Marlow Yard: downed (G349), drill retry (G361), strict rule late (G357), later sections (G363) | Marlow | Checker | 6 |
| 16 | coop-real (#388), coop4 (#317), gm-flip (#375, after Michael's picks) | Player, Guard AI | As today | 6 |
| 17 | Flake budget + affected-e2e per head; laptop-queue-5 follow-ups | Test Runner | Plan checker | 5 |

Not ranked yet (process, re-ranked at row 6): overlap slice 4 (scripts/auto-train.mjs;
`docs/orchestrator/overlap-trains-PLAN.md` "Slice 4 carry-overs"). Parked ideas (co-op modes and levels, dev tools menu
+ level editor, Moth as player 2, WebGPU, Wren cleanup, more co-op player characters after all levels):
`docs/orchestrator/archive/ROADMAP-history.md` "Later". Spare jobs: `docs/orchestrator/spare-jobs.md`.

## Inbox
Michael's new ideas, verbatim, with the time; the orchestrator triages each cron run onto Now, Waiting or Decided.
- (empty)

## Waiting on Michael
| Item | Since | Blocks |
| --- | --- | --- |
| Walk AF0-AF6 (animation fix pass, 4.84.0) | 2026-10-23 ~20:45 | AF7-AF9 (briefs/afp-next-pass.md); switch-on of animation features |
| Full co-op walk of Marlow Yard (two players, end to end) | 2026-10-22 | the goal's sign-off; Marlow polish list; W5 A2 re-walk |
| Campus walk: v1 S1-S5 (started ~20:12 on 4.95.1); question: drop it and walk v2 at greybox exit, or finish v1 now | 2026-10-24 ~20:12 | Sector Ops switch-on |
| #375 gm-flip look picks (lean sleeve skin, hem shards, weld puckers), then one-click OK | 2026-10-25 ~05:20 | guard models on by default; guard-cap C1 |
| #372 one-click sign-off pages: mission prototypes (Three Grey Coats, Two-Key Ledger, Split Shift, Code Relay) | as each lands | their greybox (the new campaign map's greybox may proceed overnight) |
| G157 level-standard review: the 12 proposed level-standard changes, item by item (level-design.md open item 3) | 2026-10-18 | Tallow Wharf greybox (row 8) |
| Commands: (1) watchdog install now #403 is on master (4.101.1): `powershell -NoProfile -ExecutionPolicy Bypass -File C:\NightShift\Mobile-Coop-autotrain\scripts\watchdog-task.ps1 -Fix "labels"`, plus the desktop queue task moved to origin/master; (2) after #400 releases, the weekly prune task: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prune-task.ps1` from a master checkout (G345); (3) plain checkout C:/NightShift/Mobile-Coop back to master (it is on feature/operators, gone) | 2026-10-25 ~08:50 | auto-labelling; weekly prune; branching from a clean master |

Unwalked features per area (cap 3; the cap limits switch-on only, G355; estimated from the CHANGELOG since each area's
last walk, confirmed at the next walk card):
| Area | Last walk | Unwalked since | Count |
| --- | --- | --- | --- |
| Player / animation | 4.72-4.73 (2026-10-23 ~13:55) | AF0-AF6 pass, optic cable partner view, client body carry | 3: AT CAP |
| Marlow Yard | 4.82.0 solo (2026-10-23 ~22:15) | training cameras, LR16 re-light, joint interrogation | 3: AT CAP |
| Sector Ops | campus walk in progress | campus S1-S5 art + lighting, coop4 AI, per-section bake | 3: AT CAP until the walk lands |
| Guard AI | 4.72-4.73 | report-then-engage, hearing in fights, cover lines, response sweep, sight rays | 5: AT CAP |
| Lighting | 4.78.0 (2026-10-23 ~18:08) | LR16 on every map, moving lights LR16-5, thermal through doors | 3: AT CAP |

## Decided
Today only (2026-10-25), newest first; folded as G324-G343 (4.101.0) and G344-G363 (#407). Older entries:
`docs/orchestrator/archive/ROADMAP-decided-history.md`; the orchestrator folds entries into `docs/DECISIONS.md` daily.
- Level-standard follow-ups (2026-10-25 ~11:55, native multiple choice): (1) a failed Marlow timed drill: "Retry the drill only" (the drill resets in place; no checkpoint reload); (2) the signed-off campus counts S1 15 / S2 18 / S3 20 / S4 25 / S5 26 are for "Two players" (1 player uses the same, no scale-down; 3-4 players add the tagged extras); (3) Marlow "later sections": "After every move taught" (once each co-op kit move has been taught on its own).
- Re-audit answers (2026-10-25 ~11:20-11:35, native multiple choice). (1) Goal: "All three in parallel" (Marlow Yard, Sector Ops campus and Tallow Wharf each move under their own lead). (2) Sector Ops dogs: "Penalty for killing, can be knocked out with gas, no takedown, or can be distracted". (3) Marlow Yard downed: "Campaign rule" (30 s revive, at most twice, both down = checkpoint). (4) Helmets: harder = "Realistic + Perfectionist" (Rookie / Normal: alarm-stage helmets only; Perfectionist: cannot be shot off). (5) Objective popup: "What and where". (6) Character shadows: "Meter and guards read them" (light parity holds for character shadows; a build job). (7) Killing a civilian or protected character: "Section restart". (8) Tallow Wharf story: "Decide with missions". (9) Walk cap, Michael: "What do you recommend? All current maps/features should be revised once documentation work has been completed"; recommendation adopted "Yes (Recommended)": once the doc PRs are on master each lead runs a plan-only conformance review of every map / feature in its area against VISION, RULES and level-design (gap list with fix sizes), the orchestrator folds them into the forward plan for Michael; then signed-off builds (campus greybox, Tallow Wharf) resume dark behind flags; the walk cap limits switch-on only; rule fixes to shipped features (e.g. G339 compass / blip) are fixes, allowed at the cap. (10) CT footage numbers G25-G36: "Starting values" (Michael tunes by hand). (11) Marlow strict rules: "Taught late" (none early; one taught in a late section). (12) Overnight loosening of a Michael-only rule: "Assume and log". (13) Campaign guard cap: "32 alive, but also research how many guards are normally active in splinter cell series missions and tell me" (research running). (14) map-spec template: "Yes, update it" to the current rules.
- Docs first (2026-10-25 ~11:05). Michael: "Full 100% burn completing these tasks. I want to use the 5 hour limit before it runs out, but I don't want to proceed with game updates until this documentation and clarity is fixed moving forward". Native multiple choice on the six finished, checked game PRs (#373, #377, #384, #385, #387, #389): "Let finished ones ship" (they train when green; only NEW game work waits). Leads stay unbooted until the doc PRs land, the re-audit is fixed and the forward plan is agreed.
- Doc drift prevention (2026-10-25 ~11:00, native multiple choice; Michael: "how do we prevent this from happening again? Documentation going stale, duplicate information, redundant information, old branches etc"): picked "Doc lint in CI" (scripts/doc-lint.mjs in npm run check: stale-term list, replaced G numbers cited as current, broken links, key numbers outside their owner file, size budgets, owner / status header per doc), "Auto-archive job docs" (a released job's docs/<job>/ moves to docs/archive/ in the train), "Fold rewrites in place" (the daily fold updates DECISIONS + bible + VISION together; checkers fail appended notes and missed owner files), and "I would like to carry out drift audit more often to prevent straying from vision." (ASSUMED, undoable: an Opus drift audit daily with the fold and after every batch of Michael decisions, on top of doc-lint in CI). Branches: "Yes, weekly": the orchestrator deletes branches fully merged into master and older than 7 days, weekly, logging the list; unmerged branches are never touched; clean merged worktrees are pruned in the same pass.
- Campaign and objectives (2026-10-25 ~10:45, native multiple choice). (1) Mission 1: Michael asked "Which is better and faster to adapt into campaign mission 1? Kestrel and redesign for today's standards, or new tallow wharf map?"; told Tallow Wharf is already specced to today's rules (from the 2026-10-24 mission research, incl. 3-popular-missions.md) while Kestrel would be a re-plan: "Tallow Wharf". Tallow Wharf is campaign Mission 1; Kestrel stays paused. (2) Campaign helmets: "Same rule" (harder difficulties always have helmets, hardest cannot be shot off; CT alarm-stage helmets on easier). (3) Marlow timed drills: "Marlow can use timed drills, it must force players into situations as a way of training them." (soft-windows-only binds campaign and Sector Ops). (4) Objectives: "Objectives can fade in/out in game, must be a short, plain English objective. Can we bind to a button to show temporarily? Should also should up when updating objective"; binding "View (Select) + O": a tap on View / Select (pad, CT's Back) or O (keyboard) shows the current objective ~5 s; it also shows on every objective update. Owner: menu / HUD (to assign).
- Docs audit follow-ups (2026-10-25 ~10:20, native multiple choice after the 5-agent docs audit): fixes A (rule loading), B (VISION.md), C+E (clean docs, one owner per rule) and D (level standard per mode + validator) all approved. Michael: "Once this has been completed, I want another audit run and review the rules/vision/level design and anything to make sure the vision is clear." Helmets (G307 first-headshot helmet vs the ~09:45 "Keep CT way"), Michael: "Base it off difficulty, harder difficulties always have helmets, and hardest difficulty you can't shoot the helmet off." (asked for Sector Ops; campaign assumed CT alarm-stage helmets plus the same difficulty rule, undoable). Minimap: "Remove it too": no minimap, compass or objective blip in any mode (mission-framework A10 void; its A12 one-chance mission end and window rule kinds conflict with section restart and soft windows only: Marlow re-plans them).
- Level-design framework conflicts (2026-10-25 ~09:45, native multiple choice, after Michael pasted a level-designer framework prompt and asked "How does this compare to our current design?"; matches already in force: campaign strict 2p with forced co-op, linear spine with braided loops, connector gates, Sector Ops solo past team doors, up to 2 strict rules, no markers). (1) Sector Ops difficulty, Michael: "Fixed difficulties per op, keep star system. Completing a higher difficulty also considers the lower tiers completed also." (G189 stays; a clear on tier N fills every star below N). (1b) Player-count scaling: "Keep scaling" (coop4 as built). (2) Guard density: "Keep current" (32 is a ceiling, G190 spacing first, campus counts as signed off). (3) Hardened lit choke points: "Everywhere": un-shootable fixtures and guarded / locked breakers are allowed at choke points in the campaign and Sector Ops (loosens level-design "every lit chokepoint can be darkened at least two ways" and bible L8; route-around stays). (4) Helmets: "Keep CT way" (G155). (5) Timed lockdowns, after two examples (hard route-closing lockdown vs soft shift-change window): "Soft windows only": predictable windows (shift changes, fixed patrol cycles, signposted in the world) are allowed; no countdown that closes a route; the no-forced-timers rule stays. (6) "Add both": static lookouts on some high routes (pipes, catwalks, vents) and paired patrols that check on each other; G44 (poor sight above) stays the base rule; replaces G11's cut of paired behaviour for this. (7) Objectives, Michael: "Objectives must name what and where, but no map, level design must flow naturally towards each objective." (7b) "No maps at all": the briefing's annotated map (G134) and the field-menu map of known intel (bible 5.10) are removed. Owners: (7b) menu / briefing owner to be assigned at the next plan; (1) and (3) Sector Ops (stars, lighting on every map; level-design.md text change with the light-realism job); (6) Guard AI (plan first); (3) and (7) validator rules Marlow.
- Realistic light and played flow (2026-10-25 ~09:05). Michael: "How do you know campus design gameplay flow is good, and that there is a realistic amount of light? On the current build the s1 car park is still very dark which is unrealistic, car parks are generally well lit". Native multiple choice: (1) "Real-world levels": each space type gets a real-world illuminance band from the lighting standards (outdoor car parks AS/NZS 1158.3.1, interiors AS/NZS 1680 / EN 12464), engine light calibrated to lux once, measured from the bake at greybox exit; stealth comes only from real gaps (between poles, under the carport, behind cars, cut circuits, shot lamps), never from leaving lit places unlit; the 40-60% shadow-share target (level-design 5.5) yields to the real band. (2) "Bot route-runs + your walk": at greybox exit a scripted run walks every declared route (dark / high / loud) against live guards, logging time, detections and dead stops, then a 10-min walk card for Michael. Owners: light-realism Sector Ops (lighting on every map; S1 car park first), route-runs Marlow (level validator).
- Campus S1-S5 sign-off (2026-10-25 ~08:50, native multiple choice on the sign-off pages, feature/sector-redesign-signoff fe3ef35f, drawings shown): S1 "Go as drawn (15 guards)"; S2 "Go: void 14.5 m, 18 guards" (3.9 m balcony strips); S3 "Re-plan as drawn, 20 guards"; S4 "One 6 m goods-in lobby"; S5 "26 guards, inside the 32 cap" (no cap raise, no protocol bump). Sector Ops greyboxes all five (then V6 --require-measured at greybox exit).
- Off-screen anim tier (2026-10-25 ~08:50, native multiple choice): "Yes, shadow in view = seen": a guard whose shadow falls in view animates at full rate. Replaces the overnight assumption (G294 / A183): Guard AI implements it in animTierView.ts (#360 T1) and measures the CPU saving left; it also governs guard-cap C1 (same ANIM_TIER_OFFSCREEN).
- Labels (2026-10-25 ~08:45, native multiple choice): "Watchdog labels": the watchdog's `--fix labels` adds train-ready on CI `check` + `checker` + `affected-e2e`, no session needed (replaces the orchestrator-relabels-everything hop; auto mode still blocks self-approval by sessions). Install command given to Michael.
- Disk (2026-10-25 ~08:45): "delete them, and ask laptop to review nightshift size also and remove redundant files". Desktop scratch copies deleted 08:47 (14.3 GB freed, C: 38.1 GB free; top-level notes kept in scratch/archive-notes); Test Runner reviews the laptop.
- Full burn (2026-10-25 ~08:25): "100% full burn until I say to slow down. I want to hit the 5 hour cap as quick as possible as the weekly reset soon".
- #378 pr-size hotfix (2026-10-25 ~08:30): Michael labels it himself ("Labelling it now").

## Done
Releases 4.98.0 onward; the full list is `CHANGELOG.md` on master (the old table: archive/ROADMAP-history.md).
| Version | PR | What |
| --- | --- | --- |
| 4.101.1 | #406 | Train 86: laptop queue dead-pid slot locks, watchdog allowlist, affected-e2e never stuck; Guard AI one-mover fix; section bake replaces stuck workers (#403, #387, #385) |
| 4.101.0 | #405 | Train 85: design bible rewritten, decisions fold G324-G343, rules in docs/RULES.md, Guard AI polish batch 2, co-op e2e boot wait (#396, #394, #377, #373) |
| 4.100.9 | #401 | Train 84: system docs match the current rules (#395) |
| 4.100.8 | #399 | Train 83: docs/VISION.md one-page vision (#393) |
| 4.100.7 | #397 | Train 82: decisions fold G283-G323 (#386) |
| 4.100.6 | #392 | Train 81: Sector Ops polish 3 (#379) |
| 4.100.5 | #391 | Train 80: pr-size loads its script from the base branch (#378) |
| 4.100.4 | #390 | Train 79: dead-pid heavy.lock broken at the desktop gate, "CI running" status (#374) |
| 4.100.3 | #383 | Train 78: guard bake stops on a lost console (#380) |
| 4.100.2 | #381 | Train 76: Marlow Yard client lamp shots (walk bug S2); visual-gate after green trains (#371, #367) |
| 4.100.1 | #376 | Train 75: lightField allocation test deterministic; section bake live lamps first (#369, #361) |
| 4.100.0 | #370 | Train 74: release hold, desktop failures rechecked on the laptop, co-op interrogation under load, Guard AI polish, intake gates and PR size cap (#366, #365, #363, #351) |
| 4.99.1 | #368 | Train 73: watchdog pipeline alerts (#350) |
| 4.99.0 | #364 | Train 72: auto affected-e2e and flake budget, swap tools, rulebook (#356, #349, #347) |
| 4.98.3 | #359 | Train 70: release path hardening (#353) |
| 4.98.2 | #358 | Train 69: Saltmarsh Park fog fix wiring test (#357) |
| 4.98.1 | #355 | Train 68: section bake hardening (#354) |
| 4.98.0 | #352 | Train 67: level validator (graph, metrics, room table, standard); auto-train auto-drop (#346, #343) |

## Previews
Live game, `/preview/` (master via `dev`), `/ct/` (via `ct-movement`): `docs/systems/deploy.md`.
