# Folded conformance plan (ROADMAP Now row 6)

Owner: Orchestrator. 2026-10-25 ~14:10 Sydney. Plan only: the sign-off for Michael (G355). **Status: partial, Guard AI
pending** (its draft page and parts A-D are folded; its checker has not passed yet).
Inputs (`docs/conformance-<lead>/CONFORMANCE.md`): Test Runner (master), Player (#416), Marlow (#417), Campaign (#419),
Sector Ops (#420), Guard AI (feature/conformance-guard-ai d5f76240, draft for its checker). Source tags: P = Player, M = Marlow,
C = Campaign, S = Sector Ops, G = Guard AI, T = Test Runner, then the lead's own row id (P H9 = Player row H9).
Counts are at the leads' summary-row level; a merged row keeps every source tag.

## 1. Summary for Michael

- **27 hard-rule breaks, about 130 other gaps, 40 questions for you, about 38 out-of-date doc notes.** Before
  merging duplicates the six reviews had 50 breaks and 48 questions.
- Guard AI's review is not checked yet: its findings are in; its checker may change a few rows.

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
  (Marlow Yard, both warehouses, one Saltmarsh spot); three measured spots where the picture and the light meter
  disagree; a co-op late joiner can see the wrong light for a few seconds.
- Marlow Yard: half its sets have 1 guard (cap 3); it has never been checked against its own level rules.
- Saltmarsh Park in the game today has fewer guards than you signed off (the new greybox adds them).
- The two tools that prove a map is finished (measured validator pass, bot route-runs) are not in the game's code
  yet, so no map can pass greybox exit.
- 4-player Sector Ops would switch on for everyone when it merges; it needs an off switch until your campus walk.
- Code tidiness: some movement, takedown, partner and guard-shooting code makes garbage every frame (hitch risk); one
  dev tool uses a banned maths call; one doc names the reference game's hero; touch look still works in game.

Biggest other gaps:
- No objective pop-up yet (tap View / O, fades in on every update).
- Helmets by difficulty not built; dogs can still be taken down; killing a dog adds score.
- Marlow Yard: strict rules in early sets, side routes that skip the taught move, two co-op moves never taught,
  revives can go above 2, no timed drill can fail.
- The campaign has no menu entry, briefing, save or 100% rating yet (its own job).
- 3-4 player extra guards are not planned yet for Saltmarsh Park.
- No real-world light table yet, so nothing can be measured against it.
- Saltmarsh Park is over the written frame-time and memory budgets; 32 guards do not meet them yet.
- Guards: no high-route lookouts; Tallow Wharf's guard pairs are skipped; a guard can raise only one alarm per section.

What happens at sign-off:
- Doc fixes and hard-rule fixes start at once (allowed at the walk cap). Nothing new switches on until you walk it.
- Answer first (they hold up the most work): Q17, Q23, Q24, Q2, Q14, Q27, Q12, Q5. The rest hold up single rows.

## 2. Questions for Michael (native multiple choice, recommended option first)

### Guards
1. What penalty for killing a dog? - Counts as a kill (no Perfect) and costs score / Counts as a kill, scores nothing
   / Also alerts the handler and nearby guards / The section restarts, as for a civilian (P Q2, S M10, G B5)
2. Which frame-time target must 32 guards and Saltmarsh Park meet? - A 60 fps floor for Sector Ops and the campaign,
   set after the off-screen animation fix is measured; memory budget unchanged on every map / Today's 165 fps budget
   (a big perf job) / A 120 fps line (M Q8, S V10, T T14)
3. Saltmarsh S5 with 3-4 players has no room under the 32 cap for extra guards and alarm reinforcements. - Keep 32;
   extras spawn, reinforcements fill what is left / No 3-4 player extras in S5 / Raise the cap above 32 (S C3)
4. Marlow Yard sets A3, A5, A6, A7 have 1 guard (cap 3). - Fill to 3 where routes stay passable / Keep 1 in teaching
   sets, fill A7 only / Keep as is (M Q1)
5. Civilians on Tallow Wharf? (leads differ) - None on Mission 1: only the named people are protected; build
   civilians after Mission 1 / Build civilians before Tallow's greybox exit; clerks and porters become civilians /
   Clerks, porters and couriers are civilians now (C Q5, G B12, P R15)
6. Do campaign alarm teams carry riot shields? - No: armed guards only, as CT / Yes, as Sector Ops (G B7, C MF15)
7. Where may a "vent" lookout stand (guards cannot stand in a crawl vent)? - Where he overlooks the vent run or exit /
   Pipes, catwalks and roofs only / Build a crouched in-vent lookout (G A3)
8. Can a guard notice a player's cast shadow? - No, shadows only darken, as CT / Faint cue: suspicion only, never
   detection / Full cue: counts as seeing the body (G C3)
9. Guards keep one last-known position per player, as built? - Yes, per player / No, one shared (G D10)
10. When does 4-player Sector Ops switch on? - Merge behind a switch, on after the campus walk / Merge live now (G D3)

### HUD and guidance
11. Marlow Yard's next-drill mark sits on the screen edge with metres when off screen. - Keep as built / On-screen
    mark only, no edge pointer or metres / Drop the mark, list only (C Q7, M M12)

### Mode rules
12. Where does the Campaign start? - Co-op lobby lists Campaign, Marlow Yard (training), Sector Ops / A main menu
    Campaign item / Lobby only, hidden until Mission 1 switches on (C Q4)
13. Rewards in the campaign? - None: optional objectives only raise the rating, as CT / Section rewards but no revive
    syringes / Rewards only for optional objectives (C Q6)
14. Marlow's early strict rules (A2 "spotted fails the set" from your walk, A3 send-back) vs "one rule, taught late".
    - A3 becomes a retry; A2's spotted rule moves to A8 as the one late rule / Both become retries, a new late rule in
    A8 / Keep A2 as an exception / Remove A2's rule, late rule in A8 (M Q3)
15. Sector Ops co-op: a downed player nobody can revive. - Waits downed until a syringe or the next connector; only the
    whole team down restarts / 1-2 players restart at once, 3-4 wait for the connector / Keep today: 30 s, then the
    section restarts for all (S M12)
16. Can one player open the S2 team doors alone (both keys within 8 s), as the signed page shows? - No: team doors stay
    two-player, solo goes round / Yes, a one-player exception (S C4)

### Maps
17. Your review of the 12 level-standard changes before Tallow Wharf resumes. - Review in parallel, Tallow stays dark
    / Review all 12 first / Skip it for Tallow, review before Mission 2 (C Q1)
18. Tallow Wharf's four sign-off pages, asked once corrected. - Approve as specced / Approve with changes / Re-plan,
    per page (C Q2; ask later)
19. Tallow's 2.5 m throw gaps can be jumped solo. - Accept throws as optional co-op (another move still forces co-op
    there) / Make throws force co-op (engine work) / Replace that exit with another forced move (C Q3)
20. Early Marlow sets have side routes, some skipping the move being taught. - Close only the bypasses of the taught
    move / One path per set / Keep the alternatives (M Q6)
21. Holding a shutter or door, and the vent unlock, are never taught in Marlow Yard. - Shutter hold now in A3-A6, vent
    unlock later / Both into A3-A6 / A new set before A7 (M Q5)
22. Which rules bind the old warehouse Sector Ops map? - Hard rules, 1-4 players, team doors with a solo way round, a
    level-check audit; campus-only items (counts, dogs, armour) exempt / The full campus rules / Freeze it as is
    (S C13, G B9)

### Lighting
23. Are dead or tagged-out lights an allowed "real gap"? - Only where a real site has one, logged with its reason,
    never a section's main hiding place / No: every fitting works; darkness only from cover, cut circuits and shot
    lamps / Yes, freely (training's mixed zones) (M Q2, S L5)
24. How are real-world light levels set and approved? - From the Australian lighting standards after one calibration;
    you approve the table and the car-park light grid together / Car park first, other places per map / Keep
    hand-tuned levels (loosens your real-light rule) (S L10)
25. Should a light-meter-vs-picture mismatch hold a release? - Yes: the check runs on every release (3-5 min more);
    other picture flags stay advisory for ~10 clean releases / Every flag holds / Never hold, flag only (S V6, T T3)
26. Who may accept a deliberate look change into the picture baseline? - Orchestrator, only with your one-click
    sign-off or your words on record / Only you / Orchestrator citing any job brief (S V16)

### Tooling, tests and performance
27. What must a bot route-run do to pass greybox exit? - No dead stop; detections logged for your walk card / No
    detection and no dead stop on any route / Shadow route unseen; high and loud routes may be seen (M Q4)
28. Marlow teaching sections fail "every section has a co-op climbing link". - Count synced takedowns and co-op
    actions in Marlow / Warning, not error, on training maps / Keep the error (M Q7)
29. A test that fails the same check again and again. - A second quarantine in 14 days makes it blocking and opens a
    fix job / The same failure 3 times is a bug: fail, no quarantine / Keep renewing 48 h (T T9)
30. Saltmarsh Park load time? - Cold at most 2x the old warehouse, cached at most 2x, measured on the laptop / Fixed
    caps (30 s cold, 5 s cached) / No budget (S V11)
31. Must shader compiles finish on the loading screen? - Yes, up to a written cap, plus a job to cut compile time /
    No, may finish in play within a set time / Keep today's 6 s warm-up and 90 s watchdog (S V12)

### Player controls and animation
32. Touch in game. - Keep menu taps and touch look, recorded as an exception / Remove touch look and the pause button,
    touch only in the tuner / Keep menu taps only (P Q1)
33. Palm strike recovery. - Back to about 1.4 s / Keep 0.6 s / Tune by hand (P Q3)
34. Grab menu behind a guard. - Only GRAB CHARACTER and BACK TO GAME / Keep the door and item rows, as CT (P Q4)
35. Camera moving by itself. - Keep the open-space pull-back, drop the doorway push-in / Keep both, as CT / Fixed
    1.8 m, wall pull-in only (P Q5)
36. Hold or toggle settings. - Toggles for plain holds only; tap / hold buttons and aim excepted / Toggles for every
    hold except tap / hold pairs (P Q6)
37. Animation corrections over the motion capture. - Decide at the animation walk / Keep / Back to as captured (P Q7)
38. Motion capture switch for players. - Mocap only, developer rollback (as now) / Restore the Settings switch (P Q8)
39. Partner animation data over the network. - Allow small animation fields / Revert to derived only (P Q9)

### Added from Guard AI's draft page
40. A guard off screen whose shadow is on screen: how often does he animate? - Like an on-screen guard (every 2nd
    frame past 22 m) / Every frame (G Q3)

## 3. Hard-rule breaks (27)

| # | Break | Rule | Owner | Job | Size | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Minimap, compass, objective / pickup / partner blips, HQ radar upgrade in every mode; a required e2e asserts the minimap | VISION 4 r5; G339, G135 | Campaign | J3 | M | P H9, M H2, C S1, S M1 M2, T T2 |
| 2 | Sector Ops exit beacon (green disc and lit pole) | r5; G290 | Sector Ops | J5 | S | S M3 |
| 3 | Objectives without "where": Marlow A2 / A3 lines and the "L1" code name; campus S1, S3-S5; warehouseOps x2; Tallow tgc-2 and the wrong section banner | r5; G336, G351 | Marlow, Sector Ops, Campaign (each its lines) | J5, J7 | S | M H5, S M4, C S12 |
| 4 | Character shadows ignored by the meter and guard perception | r1; G352 | Sector Ops (meter), Guard AI (perception) | J16 | L | P H7, S L1, G C1, T H1 |
| 5 | Off-screen guard whose shadow is in view animates at 1/4 rate | r10; G327 | Guard AI | J4 | M | P H8, M H1 K6, S L2, G C2, T H10 |
| 6 | Hot paths allocate: player step, takedown scan, carry, wheel, pad poll, partner avatar, team moves, guard shots / bites, manager tick | CLAUDE.md hot paths | Player (player, net), Guard AI (ai) | J6 | M | P H2 H3 H4 H10, G D1 D2 |
| 7 | `Math.hypot` in the Operator Lab and campus S4 dressing | CLAUDE.md | Player | J6 | S | P H5 |
| 8 | Reference-game names in `docs/operators/ART-DIRECTION.md` | G6 | Player | J1 | S | P H6 |
| 9 | Touch look and touch pause button in play | CLAUDE.md desktop only; G182 | Player | J6 (Q32) | S | P H1 |
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
| 21 | Dark-by-design pockets: Marlow A2 / A4 / A6 / A8, base warehouse unlit strips, warehouseOps dead fittings, campus S1 boost point | r2; G329 | Sector Ops (lighting), Marlow (its sets) | J10 (Q23) | M each | M H4, S L4 L5 L6 |
| 22 | Measured parity misses: campus S1 moonlit card, warehouseOps S2 aisle; co-op late join and failed lamps | r1 | Sector Ops | J11 | M | S V1 V2 L7 |
| 23 | Marlow Yard sets at 1 guard | r9 | Marlow | J14 (Q4) | M | M H3 |
| 24 | Marlow Yard: no graph on master; the branch graph runs the campaign profile (15 ERR on training) | CLAUDE.md level standard; LD 13 | Marlow | J12 | M | M H6 |
| 25 | Measured validator pass (V6) not on master; three validator branches disagree | VISION 5; G289 | Marlow | J12 | L | M H7, C S13, S C11, T T7 |
| 26 | Bot route-runs do not exist | VISION 5; G330 | Marlow | J13 (Q27) | L | M H8, C S13, S C11, T T7 |
| 27 | Saltmarsh Park v1 short of the signed-off counts (S1-S5 hold 8 / 12 / 16 / 20 / 24 vs 15 / 18 / 20 / 25 / 26) | r9; G328, G362 | Sector Ops | J17 | L | G A1, S C1 |

Counted as gaps, not breaks: the objective pop-up (C S11; a VISION 3 override, not a VISION 4 rule), Marlow's revive
cap (P R35, M M3) and Marlow's solo start (P R36; rule 7 binds the campaign).

## 4. Jobs in order

Phases run in order; jobs inside a phase run in parallel (full burn). "Q" = waits for that answer. Every job ships
dark behind its flag; switch-on follows the walk cap.

| # | Job | Owner | Covers | Depends on | Gate | Waits for Michael |
| --- | --- | --- | --- | --- | --- | --- |
| **A** | **Docs** | | | | | |
| J1 | Doc-only fixes (section 5), one docs PR per owner | each owner | section 5, break 8 | sign-off | CI check + checker | No |
| J2 | Fold the answers into DECISIONS + bible + VISION (next G numbers); rewrite ROADMAP rows 7-17 from this plan; tell Michael the guard-count research | Orchestrator | all answers | the picks | docs checker | Yes |
| **B** | **Hard-rule fixes (allowed at the walk cap)** | | | | | |
| J3 | hud-guidance PR A: remove minimap, compass, blips, HQ radar; flip e2e-desktop / e2e-clear / economy tests; a no-minimap check per mode | Campaign | break 1 | sign-off | affected-e2e + checker | No |
| J3b | hud-guidance PR B: objective pop-up (~5 s, on update, View / O tap); co-op status off the objective line; field-menu full list | Campaign (+ Sector Ops lines) | P R24, C S11, S M5 M6 | J3 | affected-e2e + checker | No |
| J4 | Guard AI release: G327 on a fresh PR from the #360 branch (merge master, measure, close #360); #317 behind a default-off `coop4` flag, room cap from the mission | Guard AI | breaks 5, 13, 15; G C6 | sign-off (lifts the row 16 pause) | two Opus checkers + laptop e2e | Q40; Q10 (switch-on only) |
| J5 | Text and marker batch: objective lines with a place (Marlow, campus, warehouseOps) plus a place-word data test; no exit beacon in Sector Ops | Sector Ops, Marlow | breaks 2, 3 | - | affected-e2e + checker | No |
| J6 | Code hygiene: hot-path allocations, `hyp3`, touch | Player (+ Guard AI for `src/ai`) | breaks 6, 7, 9 | - | two checkers (`src/net`, `src/ai`) | Q32 (touch only) |
| J7 | Mission-engine rule fixes (dark): push the flag fix first; dogs out; drop `oneChance` / `window`; revives 2 x 30 s; exactly two players; protected-character restart; no shield lead; campaign cap named; Tallow line and banner | Campaign | breaks 10-14, 17; C S19 (shield), M K3 | - | two Opus checkers (`src/net`) | Q6 (default no) |
| J8 | Tallow greybox fixes (dark): gate reach to 0 ERR, real-site lighting per space, hide spots, medkits, splits, graph drift, roof ladder; then correct the sign-off pages | Campaign | breaks 18, 19; C S16 S22 | J7 | validator 0 ERR + plan checker | Q17, Q19, then Q18 |
| J9 | Shutter wiring: both shutters real, guards notice a held shutter | Campaign (+ Guard AI hook) | break 16, P R39 | J7 | e2e walks both shutters + checker | No |
| J10 | light-realism: rewrite BRIEF / PLAN, fix the S1 light point and re-bake, one lux calibration, the band table; re-light dark pockets on every map; campus SPEC lighting rules | Sector Ops (Marlow for its sets) | breaks 20, 21; S L9 L12 L14 V7, M M10 V5, T H2 | sign-off | plan checker; lux grid to Michael | Q24, Q23 |
| J11 | Parity fixes: S1 moonlit and warehouseOps aisle triage; late-join section hint (wire) and failed-lamp sync; parity cards per map and at Low; 0.27 band; flicker pin | Sector Ops | break 22; S L8 V3-V5 V8, T T3 | J10 | two checkers (net); laptop GPU | Q25 |
| J12 | Validator port: V6 onto master's mode profiles (shadow share as INFO, measured co-op targets), mission-validator re-cut, ghost / no-kill / marker checks, Marlow graph on the training profile, validator in CI | Marlow (+ Campaign for mission kinds) | breaks 24, 25; M V1 V2 V4 V6 V11, T H4 | sign-off | one Opus checker | No |
| J13 | Route-runs: BRIEF, Opus PLAN, plan checker, harness; per-detection cause log | Marlow (+ Guard AI cause record) | break 26; M M9, G C5 | J12 | plan checker | Q27 |
| **C** | **Rule gaps** | | | | | |
| J14 | Marlow Yard: revive cap 2, solo start blocked, A2 vantage test, drill-mark guard; then strict rules, routes, guard counts, split after every move; new exercises dark | Marlow | break 23; M M1-M8 M12 V7 V8, P R35 R36 | J5; J12 | checker + e2e-ctcourse | Q4, Q14, Q20, Q21, Q28 |
| J15 | Guard rules: helmets by difficulty (Perfectionist locked; S4 / S5 data), stage-2 helmets, no dog takedowns, dog penalty and release, lookouts, paired-patrol check, posted pairs, repeat alarms, placed-shield check, barks by cause | Guard AI (+ Player takedowns, Sector Ops data) | P R1-R5, S M8-M10, G A3-A5 B2-B8 B13 C4 D5 | sign-off | Opus plan; two checkers | Q1, Q7 |
| J16 | Character shadows read by meter and guards (one fixed lamp set) | Sector Ops, then Guard AI | break 4; S V9 | J10 | Opus plan; two checkers | Q8 |
| J17 | Campus greybox v2 (row 9): signed-off counts, 3-4 player tags, graph keys 1-4, guard totals, unavoidable tags, S5 cap | Sector Ops (+ Guard AI tag) | break 27; S C2-C10, G A2 B14, M V9 | J4; J12 for exit | validator; measured pass at exit | Q3, Q16, Q22 |
| J18 | Sector Ops batch: stars fill lower (row 12), Perfect label, menu stars, solo-route data check, door light at 15%, visual-gate fixes | Sector Ops | S M7 M12 M15-M17 L15 L18 V13-V15 V17, G B10 | - | affected-e2e + checker | Q15 |
| J19 | Player batch: lethal tap / hold, takedowns >= 1 s, carry noise and quiet put-down, KNOCK OUT label, armed runner, goggle default, dead sprint / hop code, wall slide, forward lean, revive 35%, friendly-fire option, audit limits, AF0-AF6 look video | Player | P R6-R11 R14 R16-R21 R25 R26 R30 R31 R33 R38 | - | checker; look video | Q33-Q39 (their rows) |
| J20 | Test Runner batch: wire files run the co-op suites, legacy suites report only, campus suite map, anchors on both maps, quarantined timeouts fail, flake file, owners, quarantine test, perf with budget; checks for no-timer, alive at start, import boundary, replay | Test Runner | T T1 T4-T6 T8 T10-T14, T H5 H7-H9 | - | checker | Q29 |
| J21 | Perf: guard-cap C1 / C2, campus frame and memory churn, load and shader budgets into performance.md | Marlow (cap), Sector Ops (campus), Player (allocators) | M K1 K2, S V10-V12, T T14 | J4 | laptop alone runs | Q2, Q30, Q31 |
| **D** | **Own jobs** | | | | | |
| J22 | campaign-mode: lobby entry, mission in the session, briefing, 0-100% results, save and rejoin | Campaign | C S17 (MF8-MF12) | J7 | Opus plan; two checkers | Q12, Q13 |
| J23 | Tallow design docs, encounter checkpoints, acceptance tests; then greybox exit (measured pass, route-runs, walk card) | Campaign | C S20 S21 S23, T T7 H3 H6 | J8, J12, J13 | exit gate + walk card | No |
| J24 | Co-op kit: shoulder stand, rope descent | Player | P R32 R34, M V10 | - | Opus plan; two checkers | No |
| J25 | Civilians (archetype and restart) | Guard AI + Campaign | P R15, C S18, G B12 | J7 | Opus plan | Q5 |
| J26 | Prototype support: Sector Ops strict rules, parallel objectives, per-area alarms, guard walk-to hook, noise zones and sound-meter marker | Campaign, Guard AI, HUD | S M13 M14, G D6-D9 | #372 sign-off pages | Opus plan | sign-off pages |
| J27 | Guard AI checker on its draft page; fold any changed rows here | Guard AI, Orchestrator | - | - | checker PASS | No |

## 5. Doc-only fixes (J1)

| Owner | File | Fix | Source |
| --- | --- | --- | --- |
| Orchestrator | `docs/design-bible.md` | Run starts 4.0 m/s; D7 aim-toggle exception; walk sway ~5 cm; C10 both players Wren until Moth; 5.8 strict-rule list = engine kinds incl. ghost; 5.7 riot shields per G307; C5 per-player LKP (after Q9) | P D5 D8, C MF19, S M18, G D10 |
| Orchestrator | `docs/ROADMAP.md` (feature/menu) | Briefing map cites G134: use "bible 5.10, replaced by G336"; row 14 carrier and branch for G327; row 7 maps part is docs only | C HG13, G C6 |
| Orchestrator | `docs/DECISIONS.md` G359 | "Research running" -> a reference-free summary; Tallow figure 35 vs 41 | M K5 |
| Player | `docs/systems/movement.md`, `input-and-loop.md`, `takedowns.md`, `world-and-characters.md`, `docs/art-credits.md` | Match code and G356 starting values; Start cancels capture; palm strike built; mocap sets; no player switch | P D1-D4 |
| Player | `docs/mocap-trial/REPORT.md`, `docs/anim-fix-pass/BRIEF.md`, `src/weapons/drawState.ts` link, `docs/operators/STATE.md`, `src/net/protocol.ts:38` comment | Archive or correct; goggle purple; no gun brand; G308 | P D6 D7 D9 |
| Player | `docs/operators/ART-DIRECTION.md`, `docs/design/scale-sheet.md` | Remove reference names; rope descent line | P H6, P R34 |
| Test Runner | `docs/RULES.md` (via orchestrator), `docs/systems/testing-tools.md` | #403 is built (stuck affected-e2e, lock parser, watchdog); #408 spare tier; the 24 h head exception; E2E_HEADED wording; e2e-menus and sectorops part 6; e2e-times is a seed; a tier row for queue / train scripts; triage line | T T15-T21 T23 |
| Test Runner | `TESTING.md` | Archive per-job sections; keep the short desktop and release lists (M) | T T22 |
| Marlow | `docs/marlow-final/SPEC.md` | One hard rule, windows never fail, MAX_ALIVE 12, Routes rows (after Q14, Q20) | M M11 |
| Marlow | guard-cap BRIEF / STATE, `docs/systems/performance.md:86` | A4: any cut below 32 goes to Michael, campaign 32 listed; land run results on master | M K2 K4 K7 |
| Marlow | validator STATE | One live resume block on the port branch | M V11 |
| Campaign | `docs/menu-ui/SPEC.md`, `docs/ct-research/code-inventory.md`, `docs/systems/ui.md`, doc-lint list | Strike briefing and field-menu maps; mark blip rows replaced; stale terms minimap / compass / blip | C HG12 |
| Campaign | Tallow SPEC | Onto the map-spec template (players line, bands, way back per gate); own map folder | C TW23 |
| Sector Ops | `docs/sector-redesign/SPEC.md`, BRIEF, PLAN, campus-run reports | Lighting rules to the band, retire A23; 24-guard counts to G328; header note on 40-60% shadow ERRs | S L12 L13, S notes |
| Sector Ops | `docs/systems/lighting.md`, settings text | Char-shadow lamps 1 on Low / Medium; glass note | S L16 L17 |
| Guard AI | `docs/systems/ai.md`, `src/game/sectors.ts:84-90`, `src/world/maps/campusSectors.ts:22-25` comments | G335 partial state; cap per mode (G359); stale Sector Ops paragraph; glass, 1.8 m, modes, alarm once per load, downed not perceived | G A6 B15 C7 D11, S notes |
| Guard AI | `docs/guard-ai/BRIEF.md` | Close A183 as answered by G327 | G C6 |
