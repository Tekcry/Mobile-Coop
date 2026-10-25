# Folded conformance plan (ROADMAP Now row 6)

Owner: Orchestrator. 2026-10-25 ~14:45 Sydney. Plan only: the sign-off for Michael (G355). All six reviews are folded.
**Sign-off waits until the five open review PRs land** (#416, #417, #419, #420, #423); any row their checkers change
is folded here first (J0). Already folded: Marlow's checker round (c7bcdc4e5: M13, M14) and Sector Ops' (aca518a59:
C14-C16).
Inputs (`docs/conformance-<lead>/CONFORMANCE.md`): Test Runner (master), Player (#416, 4a819e6a), Marlow (#417,
c7bcdc4e5), Campaign (#419, 6b2b8635), Sector Ops (#420, aca518a59), Guard AI (#423, d5f76240). Source tags: P = Player,
M = Marlow, C = Campaign, S = Sector Ops, G = Guard AI, T = Test Runner, then the lead's row id (P H9 = Player row H9).
Counts are at the leads' summary-row level; a merged row keeps every source tag.

## 1. Summary for Michael

- **27 hard-rule breaks, about 130 other gaps, 39 questions for you, about 40 out-of-date doc notes.** Before
  merging duplicates the six reviews had 50 breaks and 47 questions.
- Only 9 questions need your thought now (section 2, top). The other 30 have a recommended answer: accept them all
  with one click, or change any.

What the breaks mean in the game:
- Minimap, compass and objective dots are still on screen in every mode, and co-op shows your partner's live
  position. All of it goes, in one job.
- Sector Ops marks every exit with a glowing green pole. It goes; doors, signs and light guide instead.
- Some objective lines say what but not where (Marlow Yard, Saltmarsh Park, the old warehouse, Tallow Wharf).
- Character shadows darken the picture but not the light meter or what guards see. Needs its own build.
- A guard just off screen whose shadow is on screen still animates at quarter speed. The fix is mostly built and waits
  on this sign-off.
- Tallow Wharf (Mission 1, not live): two guard dogs (the campaign has none); a rule break can end the mission and one
  rule is a countdown; Sector Ops revives instead of 30 seconds, twice; it can start with 1, 3 or 4 players; it is not
  hidden behind its switch; both shutters are fake walls, so neither mission can be finished; killing the man you must
  question jams the mission; three spots take too long to get back to your partner; it is lit by the training rule,
  not like a real site.
- Lighting: the Saltmarsh Park car park is still mostly dark; some maps keep dark corners by leaving lights off
  (Marlow Yard, both warehouses, one Saltmarsh spot); in two measured spots the picture and the light meter disagree;
  a co-op player who joins late can see the wrong light for a few seconds.
- Marlow Yard: half its sets have 1 guard (the most is 3); it has never been checked against its own level rules.
- Saltmarsh Park in the game today has fewer guards than you signed off (the new rough build adds them).
- The two tools that prove a map is finished (a measured map check and a robot that walks every route) are not in the
  game's code yet, so no map can pass its rough-build check.
- 4-player Sector Ops would switch on for everyone when it merges; it needs an off switch until your campus walk.
- Code tidiness: some movement, takedown, partner and guard-shooting code creates throwaway data every frame, which
  can cause stutter; one developer tool uses a maths shortcut our rules forbid; one doc names the reference game's
  hero; touch look still works in game.

Biggest other gaps:
- No objective pop-up yet (tap View / O; it also fades in on every update).
- Helmets by difficulty not built; dogs can still be taken down; killing a dog adds score.
- Marlow Yard: strict rules in early sets, side routes that skip the taught move, two co-op moves never taught,
  revives can go above 2, no timed drill can fail. Closing routes or adding exercises is a re-plan: one page for your
  one click first.
- The campaign has no menu entry, briefing, save or 100% rating yet (its own job).
- 3-4 player extra guards are not planned yet for Saltmarsh Park.
- No real-world light table yet, so nothing can be measured against it.
- Saltmarsh Park runs less smoothly and uses more memory than our written targets; 32 guards do not meet them yet.
- Guards: no high-route lookouts; Tallow Wharf's guard pairs are skipped; a guard can raise only one alarm per section.

Order you confirmed: the five reviews land, then this plan, your sign-off, then the doc fixes first, then the rule
fixes (allowed even while new features wait for your walks). Nothing new switches on until you walk it.

## 2. Questions for Michael (native multiple choice, recommended option first)

### Answer these first (they hold up the most work)

| # | Question | Options (recommended first) | Sources |
| --- | --- | --- | --- |
| 1 | **Tallow Wharf and your 12 level-rule changes.** You were to review 12 proposed changes to the level rules before Tallow Wharf was built further. | Review them alongside; Tallow stays hidden meanwhile / Review all 12 before any more Tallow work / Skip them for Tallow, review before Mission 2 | C Q1 |
| 2 | **Dark corners from lights left off.** Some maps hide players by leaving lights dead or switched off. | Allowed only where a real site would have one (a failed tube, a lamp tagged out), noted with its reason, never a section's main hiding place / Never: every light works; darkness only from cover, cut circuits and shot lamps / Allowed freely, as Marlow Yard does now | M Q2, S L5 |
| 3 | **Real-world light levels.** How bright each kind of place should be (car park, office, yard). | Take the levels from the Australian lighting standards, after one test that matches the game's brightness to real light units; you approve the table and the car-park light map together / Approve the car park first, other places map by map / Keep tuning by eye (loosens your real-light rule) | S L10 |
| 4 | **How smooth must 32 guards run?** Saltmarsh Park with 32 guards is over today's targets. | Smooth on a normal monitor (60 fps), set after the off-screen animation fix is measured; memory target unchanged on every map / Smooth on your fast monitor (165 fps): a big performance job / In between (120 fps) / A separate memory target per guard count | M Q8, S V10, T T14 |
| 5 | **Marlow Yard's early strict rules.** Set 2 fails you if spotted (your walk asked for it) and set 3 sends you back; the newer rule is one strict rule, taught late. | Set 3 becomes a retry; set 2's spotted rule moves to set 8 as the one late rule / Both become retries, a new late rule in set 8 / Keep set 2 as an exception / Remove set 2's rule, late rule in set 8 | M Q3 |
| 6 | **Where does the Campaign start?** | The co-op lobby lists Campaign, Marlow Yard (training) and Sector Ops / A Campaign item on the main menu / Lobby only, hidden until Mission 1 switches on | C Q4 |
| 7 | **When does a robot test run of a map pass?** Before your walk, a robot walks every route past live guards. | Pass = it never gets stuck; the times it was seen go on your walk card / Pass = never seen and never stuck on any route / Pass = the dark route unseen; high and loud routes may be seen | M Q4 |
| 8 | **Civilians on Tallow Wharf** (the leads differ). | Campaign's pick: none on Mission 1; only the named people are protected, everyone else is an armed guard; civilians come after Mission 1 / Guard AI's pick: build civilians before Tallow's rough build is finished; clerks, porters and couriers become unarmed civilians who flee / No civilians and no protected people on Mission 1 | C Q5, G B12, P R15 |
| 9 | **Penalty for killing a guard dog** (the leads differ). | Sector Ops' pick: it counts as a kill (no Perfect) and costs score / Guard AI's pick: it counts as a kill and scores nothing / Player's pick: it only breaks "no kills" / It also alerts the handler and nearby guards | S M10, G B5, P Q2 |

### The other 30: accept all recommended, or change any

| # | Question | Recommended | Other options | Sources |
| --- | --- | --- | --- | --- |
| 10 | Saltmarsh S5 with 3-4 players: room for extra guards and alarm reinforcements under the 32 cap? | Keep 32; reinforcements fill what is left | No extras in S5 / Raise the cap | S C3 |
| 11 | Marlow sets with 1 guard? | Fill to 3 where routes stay passable | Fill set 7 only / Keep as is | M Q1 |
| 12 | Do campaign alarm teams carry riot shields? | No, armed guards only, as CT | Yes, as Sector Ops | G B7, C MF15 |
| 13 | Where may a "vent" lookout stand? | Where he overlooks the vent run or exit | Pipes, catwalks, roofs only / A crouched in-vent lookout | G A3 |
| 14 | Can a guard notice your cast shadow? | No, shadows only darken, as CT | A faint cue / Counts as seeing you | G C3 |
| 15 | Do guards remember where they last saw each player separately? | Yes, as built | One shared spot | G D10 |
| 16 | When does 4-player Sector Ops switch on? | Merge behind a switch, on after the campus walk | Live now | G D3 |
| 17 | How often does an off-screen guard animate when his shadow is on screen? | Like an on-screen guard | Every frame | G Q3 |
| 18 | Marlow's next-drill mark (screen-edge pointer with metres)? | Keep as built | On-screen only / Drop it | C Q7, M M12 |
| 19 | Rewards in the campaign? | None; optional objectives only raise the rating, as CT | Section rewards without revives / Rewards for optional objectives | C Q6 |
| 20 | Sector Ops: a downed player nobody can reach? | Waits until a syringe or the next connector | 1-2 players restart at once / Keep 30 s, then restart | S M12 |
| 21 | Saltmarsh S2 team doors: can one player turn both keys? | No, they stay two-player; solo goes round | Yes, one-player exception | S C4 |
| 22 | Tallow Wharf's four sign-off pages, asked once corrected? | Approve as specced | With changes / Re-plan | C Q2 |
| 23 | Tallow throw gaps a solo player can jump? | Accept them as optional co-op | Make them force co-op / Replace that exit | C Q3 |
| 24 | Which Marlow side routes close? | Only the ones that skip the move being taught | One path per set / Keep all | M Q6 |
| 25 | Where are holding a shutter and the vent unlock taught in Marlow? | Shutter hold now in sets 3-6, vent unlock later | Both now / A new set | M Q5 |
| 26 | Which rules bind the old warehouse Sector Ops map? | Hard rules, 1-4 players, team doors with a solo way round, an audit; campus-only items exempt | Full campus rules / Freeze it | S C13, G B9 |
| 27 | Should a light-meter-vs-picture mismatch hold a release? | Yes, checked on every release (3-5 min more); other picture flags advisory for now | A daily check on the live build instead / Every flag holds / Never hold | S V6, T T3 |
| 28 | Who may accept a deliberate look change into the picture baseline? | Orchestrator, only with your sign-off on record | Only you / Orchestrator citing a job brief | S V16 |
| 29 | How should the co-op coverage check treat Marlow's teaching sections? | Count synced takedowns and co-op actions | A warning only / Keep the error | M Q7 |
| 30 | A test failing the same check again and again? | A second quarantine in 14 days makes it blocking with a fix job | 3 same failures = a bug / Keep renewing | T T9 |
| 31 | Saltmarsh Park load time? | At most 2x the old warehouse, first and repeat loads | Fixed caps (30 s / 5 s) / No target | S V11 |
| 32 | Must graphics warm-up finish on the loading screen? | Yes, up to a written cap, plus a job to shorten it | May finish in play / Keep today's caps | S V12 |
| 33 | Touch in game? | Keep menu taps and touch look as a recorded exception | Remove touch look and the pause button / Menu taps only | P Q1 |
| 34 | Palm strike recovery? | Back to about 1.4 s | Keep 0.6 s / Tune by hand | P Q3 |
| 35 | Camera moving by itself? | Keep the open-space pull-back, drop the doorway push-in | Keep both / Fixed distance | P Q5 |
| 36 | Hold or toggle settings? | Toggles for plain holds; tap / hold buttons and aim excepted | Toggles for every hold | P Q6 |
| 37 | Animation corrections over the motion capture? | Decide at the animation walk | Keep / Back to as captured | P Q7 |
| 38 | Motion capture switch for players? | Mocap only, developer rollback | Restore the Settings switch | P Q8 |
| 39 | Partner animation data over the network? | Allow small animation fields | Derive locally only | P Q9 |

Player's grab-menu question (P Q4) was dropped by its checker: a recorded decision settles it (fix in J19).

## 3. Hard-rule breaks (27)

| # | Break | Rule | Owner | Job | Size | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Minimap, compass, objective / pickup / partner blips, HQ radar upgrade in every mode; a required e2e asserts the minimap | VISION 4 r5; G339, G135 | Campaign | J3 | M | P H9, M H2, C S1, S M1 M2, T T2 |
| 2 | Sector Ops exit beacon (green disc and lit pole) | r5; G290 | Sector Ops | J5 | S | S M3 |
| 3 | Objectives without "where": Marlow A2 / A3 lines and the "L1" code name; campus S1, S3-S5; warehouseOps x2; Tallow tgc-2 and the wrong section banner | r5; G336, G351 | Marlow, Sector Ops, Campaign (each its lines) | J5, J7 | S | M H5, S M4, C S12 |
| 4 | Character shadows ignored by the meter and guard perception (owner split: G 1d) | r1; G352 | Sector Ops (meter), Guard AI (perception), Player (operator volumes) | J16 | L | P H7, S L1, G C1, T H1 |
| 5 | Off-screen guard whose shadow is in view animates at 1/4 rate | r10; G327 | Guard AI | J4 | M | P H8, M H1 K6, S L2, G C2, T H10 |
| 6 | Hot paths allocate: player step, takedown scan, carry, wheel, pad poll, partner avatar, team moves, guard shots / bites, manager tick | CLAUDE.md hot paths | Player (player, net), Guard AI (ai) | J6 | M | P H2 H3 H4 H10, G D1 D2 |
| 7 | `Math.hypot` in the Operator Lab and campus S4 dressing | CLAUDE.md | Player (Operator Lab), Sector Ops (`campusS4Dress.ts`) | J6 | S | P H5 |
| 8 | Reference-game names in `docs/operators/ART-DIRECTION.md` | G6 | Player | J1 | S | P H6 |
| 9 | Touch look and touch pause button in play | CLAUDE.md desktop only; G182 | Player | J6 (Q33) | S | P H1 |
| 10 | Two dogs on Tallow Wharf; the guard check allows dogs on a campaign map | G155; LD 4.10 | Campaign (+ Guard AI check) | J7 | S-M | C S2, G B1, M 1e |
| 11 | Engine rule kinds that end a mission (`oneChance`) or run a countdown (`window`) | r6; G290, G334, G339 | Campaign | J7 | M | C S3 |
| 12 | Campaign revives are Sector Ops syringes (1-3 plus grants), not 30 s x 2 | G126 | Campaign | J7 | M | C S4, P R37 |
| 13 | A campaign mission starts with 1, 3 or 4 players (4 once coop4 lands) | r7; G2 | Campaign (+ Guard AI for the coop4 cap) | J7, J4 | S-M | C S5, P R37, G D4 |
| 14 | Missions and the co-op kit not behind their flags; Tallow loads as plain Sector Ops by URL | CLAUDE.md flags | Campaign | J7 | S | C S6 |
| 15 | #317 coop4 switches 4-player Sector Ops on when it merges | CLAUDE.md flags; G355 | Guard AI | J4 | S | G D3 |
| 16 | Tallow shutters are stand-in walls: neither mission completes | r3; G146 | Campaign (+ Guard AI notice hook) | J9 | L | C S7, P R39 |
| 17 | Killing or knocking out the interrogation target softlocks the step | G353 | Campaign | J7 | M | C S8, G B11 |
| 18 | Tallow gate-reach ERRs: 20.0 / 28.2 / 15.8 s against 15 s | LD 11.6, 14 | Campaign | J8 | M | C S9, M 1e |
| 19 | Tallow lit by the training rule (G279), not real-site light per space | r2; G329 | Campaign | J8 | M | C S10 |
| 20 | Saltmarsh S1 car park mostly dark (the bake nearly cancels its lamps) | r2; G329 | Sector Ops | J10 | M | S L3 |
| 21 | Dark-by-design pockets: Marlow A2 / A4 / A6 / A8, base warehouse unlit strips, warehouseOps dead fittings, campus S1 boost point | r2; G329 | Sector Ops (lighting), Marlow (its sets) | J10 (Q2) | M each | M H4, S L4 L5 L6 |
| 22 | Picture and meter disagree: two measured spots (campus S1 moonlit card, warehouseOps S2 aisle) and co-op light gaps (late join, a lamp that fails on one machine) | r1 | Sector Ops | J11 | M | S V1 V2 L7 |
| 23 | Marlow Yard sets at 1 guard | r9 | Marlow | J14 (Q11) | M | M H3 |
| 24 | Marlow Yard: no graph on master; the branch graph runs the campaign profile (15 ERR on training) | LD 3, 13 | Marlow | J12 | M | M H6 |
| 25 | Measured validator pass (V6) not on master; three validator branches disagree | VISION 5; G289 | Marlow | J12 | L | M H7, C S13, S C11, T T7 |
| 26 | Bot route-runs do not exist | VISION 5; G330 | Marlow | J13 (Q7) | L | M H8, C S13, S C11, T T7 |
| 27 | Saltmarsh Park v1 short of the signed-off counts (S1-S5 hold 8 / 12 / 16 / 20 / 24 vs 15 / 18 / 20 / 25 / 26) | r9; G328, G362 | Sector Ops | J17 | L | G A1, S C1 |

Counted as gaps, not breaks: the objective pop-up (C S11; a VISION 3 override, not a VISION 4 rule), Marlow's revive
cap (P R35, M M3) and Marlow's solo start (P R36; rule 7 binds the campaign).

## 4. Jobs in order

Order Michael confirmed: the five reviews land (J0), this plan, sign-off, then the doc fixes (phase A) first. Phase B
starts for each owner once its J1 docs PR is open and checker-passed; jobs inside a phase run in parallel (full burn).
"Q" = waits for that answer. New work ships dark behind its flag; rule fixes to shipped features ship as fixes (G355);
switch-on of new features follows the walk cap.

| # | Job | Owner | Covers | Depends on | Gate | Waits for Michael |
| --- | --- | --- | --- | --- | --- | --- |
| **0** | **Before sign-off** | | | | | |
| J0 | Land the five review PRs (#416, #417, #419, #420, #423); fold any row their checkers change into this plan | Each lead, Orchestrator | - | - | checker PASS + train | No |
| **A** | **Docs (after sign-off)** | | | | | |
| J1 | Doc-only fixes (section 5), one docs PR per owner | each owner | section 5, break 8 | sign-off | CI check + checker | No |
| J2 | Fold the answers into DECISIONS + bible + VISION (next G numbers); rewrite ROADMAP rows 7-17 from this plan; tell Michael the guard-count research | Orchestrator | all answers | the picks | docs checker | Yes |
| **B** | **Hard-rule fixes (allowed at the walk cap)** | | | | | |
| J3 | hud-guidance PR A: remove minimap, compass, blips, HQ radar; flip e2e-desktop / e2e-clear / economy tests; a no-minimap check per mode | Campaign | break 1 | J1 | affected-e2e + checker | No |
| J3b | hud-guidance PR B: objective pop-up (~5 s, on update, View / O tap); co-op status off the objective line; field-menu full list and interrogation notes kept there | Campaign (+ Sector Ops lines) | P R12 R24, C S11, S M5 M6 | J3 | affected-e2e + checker | No |
| J4 | Guard AI release: G327 on a fresh PR from the #360 branch (merge master, measure, close #360); #317 behind a default-off `coop4` flag, room cap from the mission, train-side conflicts, full laptop set | Guard AI | breaks 5, 13, 15; G C6, G 1f | J1 (lifts the row 16 pause) | two Opus checkers + laptop e2e | Q17; Q16 (switch-on only) |
| J5 | Text and marker batch: objective lines with a place (Marlow, campus, warehouseOps) plus a place-word data test; no exit beacon in Sector Ops | Sector Ops, Marlow | breaks 2, 3 | J1 | affected-e2e + checker | No |
| J6 | Code hygiene: hot-path allocations, `hyp3` (Operator Lab; campus S4 dressing by Sector Ops), touch | Player (+ Guard AI for `src/ai`, Sector Ops one line) | breaks 6, 7, 9 | J1 | two checkers (`src/net`, `src/ai`) | Q33 (touch only) |
| J7 | Mission-engine rule fixes (dark): push the flag fix first; dogs out and a mode-aware guard check; drop `oneChance` / `window`; revives 2 x 30 s; exactly two players; protected-character restart; no shield lead; campaign cap named; Tallow line and banner | Campaign (+ Guard AI check) | breaks 10-14, 17; C S19 (shield), M K3 | J1 | two Opus checkers (`src/net`) | Q12 (default no) |
| J8 | Tallow greybox fixes (dark): gate reach to 0 ERR, real-site lighting per space, hide spots, medkits, splits, graph drift, roof ladder; then correct the sign-off pages | Campaign | breaks 18, 19; C S16 S22 | J7 | validator 0 ERR + plan checker | Q1, Q23, then Q22 |
| J9 | Shutter wiring: both shutters real, guards notice a held shutter | Campaign (+ Guard AI hook) | break 16, P R39 | J7 | e2e walks both shutters + checker | No |
| J10 | light-realism: rewrite BRIEF / PLAN, fix the S1 light point and re-bake, one lux calibration, the band table; re-light dark pockets on every map; campus SPEC lighting rules | Sector Ops (Marlow for its sets) | breaks 20, 21; S L9 L12 L14 V7, M M10 V5, T H2 | J1 | plan checker; lux grid to Michael | Q3, Q2 |
| J11 | Parity fixes: S1 moonlit and warehouseOps aisle triage; late-join section hint (wire) and failed-lamp sync; parity cards per map and at Low; 0.27 band; flicker pin | Sector Ops | break 22; S L8 V3-V5 V8, T T3 | J10 | two checkers (net); laptop GPU | Q27 |
| J12 | Validator port: V6 onto master's mode profiles (shadow share as INFO, measured co-op targets), mission-validator re-cut, ghost / no-kill / marker checks, Marlow graph on the training profile, engine-fact WARNs, metrics-gen rejects unknown flags, validator in CI | Marlow (+ Campaign for mission kinds) | breaks 24, 25; M V1 V2 V4 V6 V10 V11 V12, T H4 | J1 | one Opus checker | No |
| J13 | Route-runs: BRIEF, Opus PLAN, plan checker, harness; per-detection cause log | Marlow (+ Guard AI cause record) | break 26; M M9, G C5 | J12 | plan checker | Q7 |
| **C** | **Rule gaps** | | | | | |
| J14 | Marlow Yard: revive cap 2, solo start blocked, A2 vantage test, drill-mark guard; LD 13 deliverables (objective and lead plan with `drill_s`, security register); then the M13 re-plan (one-page to-scale plan, 5-line intent check, validator pass, Michael's one click: RULES Intake 5) before strict rules, route closures, guard counts, split after every move; new exercises dark | Marlow | break 23; M M1-M8 M12 M13 M14 V7 V8, P R35 R36, T T6 (ctcourse half: Marlow Yard anchors in e2e-anchors, with Player Build) | J5; J12 | checker + e2e-ctcourse; M13 sign-off before M2 / M4-M6 | Yes: M13 one click; Q5, Q11, Q24, Q25, Q29 |
| J15 | Guard rules: helmets by difficulty (Perfectionist locked; S4 / S5 data), stage-2 helmets, no dog takedowns, dog penalty and release, lookouts, paired-patrol check, posted pairs, repeat alarms, placed-shield check, barks by cause | Guard AI (+ Player takedowns, Sector Ops data) | P R1-R5, S M8-M10, G A3-A5 B2-B8 B13 C4 D5 | J1 | Opus plan; two checkers | Q9, Q13 |
| J16 | Character shadows read by meter and guards (one fixed lamp set; G 1d split, Sector Ops PR first) | Sector Ops, then Guard AI, Player | break 4; S V9 | J10 | Opus plan; two checkers | Q14 |
| J17 | Campus greybox v2 (row 9): signed-off counts, 3-4 player tags, graph keys 1-4, guard totals, unavoidable tags, splits / assist / overwatch, Rule index errors, S5 cap; section 15 acceptance tests for campusOps | Sector Ops (+ Guard AI tag) | break 27; S C2-C10 C14-C16, G A2 B14, M V9, T T6 (campusOps half) | J4; J12 for exit | validator; measured pass at exit | Q10, Q21, Q26 |
| J18 | Sector Ops batch: stars fill lower (row 12), Perfect label, menu stars, solo-route data check, door light at 15%, visual-gate fixes, warehouseOps S3 crawl duct | Sector Ops | S M7 M12 M15-M17 L15 L18 V13-V15 V17, G B10, P R20 | J1 | affected-e2e + checker | Q20 |
| J19 | Player batch: lethal tap / hold, takedowns >= 1 s, carry noise and quiet put-down, grab menu rows (G203), KNOCK OUT label, armed runner, goggle default, dead sprint / hop code, wall slide, camera, hold / toggle, mocap corrections and switch, partner anim fields, forward lean, revive 35%, friendly-fire option, audit limits, AF0-AF6 look video | Player | P R6-R11 R13 R14 R16-R19 R21-R23 R25-R31 R33 R38 | J1 | checker; look video | Q34-Q39 (their rows) |
| J20 | Test Runner batch: wire files run the co-op suites, legacy suites report only, campus suite map, quarantined timeouts fail, flake file, owners, quarantine test, perf with budget; checks for no-timer, alive at start, import boundary, replay | Test Runner | T T1 T4 T5 T8 T10-T14, T H5 H7-H9 | J1 | checker | Q30 |
| J21 | Perf: guard-cap C1 / C2, campus frame and memory churn, load and shader budgets into performance.md | Marlow (cap), Sector Ops (campus), Player (allocators) | M K1 K2, S V10-V12, T T14 | J4 | laptop alone runs | Q4, Q31, Q32 |
| **D** | **Own jobs** | | | | | |
| J22 | campaign-mode: lobby entry, mission in the session, briefing, 0-100% results, save and rejoin | Campaign | C S17 (MF8-MF12) | J7 | Opus plan; two checkers | Q6, Q19 |
| J23 | Tallow design docs, encounter checkpoints, acceptance tests; then greybox exit (measured pass, route-runs, walk card) | Campaign | C S20 S21 S23, T T7 H3 H6 | J8, J12, J13 | exit gate + walk card | No |
| J24 | Co-op kit: shoulder stand, rope descent | Player | P R32 R34 | J1 | Opus plan; two checkers | No |
| J25 | Civilians (archetype and restart) | Guard AI + Campaign | P R15, C S18, G B12 | J7 | Opus plan | Q8 |
| J26 | Prototype support: Sector Ops strict rules, parallel objectives, per-area alarms, guard walk-to hook, noise zones and sound-meter marker | Campaign, Guard AI, HUD | S M13 M14, G D6-D9 | #372 sign-off pages | Opus plan | sign-off pages |

## 5. Doc-only fixes (J1, after sign-off)

| Owner | File | Fix | Source |
| --- | --- | --- | --- |
| Orchestrator | `docs/design-bible.md` | Run starts 4.0 m/s; D7 aim-toggle exception; walk sway ~5 cm; C10 both players Wren until Moth; 5.8 strict-rule list = engine kinds incl. ghost; 5.7 riot-shield timing settled against G307 (3) with Sector Ops; C5 per-player LKP (after Q15) | P S5 S8, C MF19, S M18, G D10 |
| Orchestrator | `docs/level-design.md` LD 13 | Marlow Yard's folder is `docs/marlow-final/`, not `docs/ct-prototype/` (a factual fix to the standard) | M M14 |
| Orchestrator | `docs/ROADMAP.md` (feature/menu) | Briefing map cites G134: use "bible 5.10, replaced by G336"; row 14 carrier and branch for G327; row 7 maps part is docs only | C HG13, G C6 |
| Orchestrator | `docs/DECISIONS.md` G359 | "Research running" -> a reference-free summary; Tallow figure 35 vs 41 | M K5 |
| Player | `docs/systems/movement.md`, `input-and-loop.md`, `takedowns.md`, `world-and-characters.md`, `docs/art-credits.md` | Match code and G356 starting values; Start cancels capture; palm strike built; mocap sets; no player switch | P S1-S4 |
| Player | `docs/mocap-trial/REPORT.md`, `docs/anim-fix-pass/BRIEF.md`, `src/weapons/drawState.ts` link, `docs/operators/STATE.md`, `src/net/protocol.ts:38` comment | Archive or correct; goggle purple; no gun brand; G308 | P S6 S7 S9 |
| Player | `docs/operators/ART-DIRECTION.md`, `docs/design/scale-sheet.md` | Remove reference names; rope descent line | P H6, P R34 |
| Test Runner | `docs/RULES.md` (via orchestrator), `docs/systems/testing-tools.md` | #403 is built (stuck affected-e2e, lock parser, watchdog); #408 spare tier; the 24 h head exception; E2E_HEADED wording; e2e-menus and sectorops part 6; e2e-times is a seed; a tier row for queue / train scripts; triage line | T T15-T21 T23 |
| Test Runner | `TESTING.md` | Archive per-job sections; keep the short desktop and release lists (M) | T T22 |
| Marlow | `docs/marlow-final/SPEC.md` | One hard rule, windows never fail, MAX_ALIVE 12, Routes rows (after Q5, Q24) | M M11 |
| Marlow | guard-cap BRIEF / STATE, `docs/systems/performance.md:86` | A4: any cut below 32 goes to Michael, campaign 32 listed; land run results on master | M K2 K4 K7 |
| Marlow | validator STATE | One live resume block on the port branch | M V11 |
| Campaign | `docs/menu-ui/SPEC.md`, `docs/ct-research/code-inventory.md`, `docs/systems/ui.md`, doc-lint list | Strike briefing and field-menu maps; mark blip rows replaced; stale terms minimap / compass / blip | C HG12 |
| Campaign | Tallow SPEC | Onto the map-spec template (players line, bands, way back per gate); own map folder | C TW23 |
| Sector Ops | `docs/sector-redesign/SPEC.md`, BRIEF, PLAN, campus-run reports | Lighting rules to the band, retire A23; 24-guard counts to G328; header note on 40-60% shadow ERRs | S L12 L13, S notes |
| Sector Ops | `docs/systems/lighting.md`, settings text | Char-shadow lamps 1 on Low / Medium; glass note; one wording for "any preset agrees" vs "fewer lamps' shadows" once J16 lands | S L16 L17, G notes |
| Guard AI | `docs/systems/ai.md`, `src/game/sectors.ts:84-90`, `src/world/maps/campusSectors.ts:22-25` comments | G335 partial state; cap per mode (G359); stale Sector Ops paragraph; glass, 1.8 m, modes, alarm once per load, downed not perceived | G A6 B15 C7 D11, S notes |
| Guard AI | `docs/guard-ai/BRIEF.md`, mission-engine `docs/missions/STATE.md:43` | Close A183 as answered by G327; fix the stale enemy.ts line refs | G C6 D7 |
