# marlow-final - STATE

## MORNING-REVIEW (for Michael)
Michael ~01:42 (ROADMAP Decided "Overnight"): rule loosenings proposed tonight are "Apply, logged and undoable": the
build uses them as assumed decisions, each listed here with its undo. The text of `docs/level-design.md`, the template,
the bible and DECISIONS is NOT edited: the wording for each LR item is in `docs/lighting-review/PROPOSAL.md` section 3,
ready to fold in if you keep it. Finished and green: the PR goes to the next train for /preview/.

Marlow Yard (SPEC section 15; full rows there with the reason):
| Item | Built as | Undo |
| --- | --- | --- |
| P1 entry vantage / checkpoints dark | Vantages concealed by occlusion; holding rooms lit 0.30, out of guard view | A dark mixed-zone pocket at each vantage |
| P2 G225 open floor 0.30 | Sets at 0.14 standby fill; 0.30 in lounge, holding rooms, dock | Zone ambient back to 0.30 (isolations become lures only) |
| P3 no timers in stealth | Player-started device windows (A2 15 s, A4 / A8 60 s loop, A8 25 s lights, jam 5 s); never a fail | Held isolators (`timedHold`), permanent console off |
| P4 new LD 5.5 lit by default | Every set lit, players make the dark | Lower fitting intensities per set |
| P5 alarm resets the set | Not used | - |
| P6 guard total 9 | 12 role-players, max 3 alive per set | Drop `a4-dock2`, `a8-night2`, move the A1 slot |
| P7 / A8 Course guards em.stealth | `em.stealth = true` (BRIEF A8) | One line in `courseMode.ts` |
| P8 guards do not look up | Occluders on every high route | Build G44's look-up penalty |
| P9 existing systems only | New code N1-N4, N6, N8, N9 | Per item fallback in SPEC P9 |
| P10 one new mechanic per space | A4 console + optional dual takedown; A6 hang-down + one untimed rope | Move A6's rope to A8 |
| P11 three routes + a secret | Two or three ways per set, secrets in A2, A3, A5 | Add a secret per guarded set at dressing |
| P12 walls to ceilings | Set flats stop under the 10 m hall roof | Charcoal panel wall above each set wall |
| P13 1.1 m rails at height | Co-op lip spans are open loading edges with a drop chain | Full rails; lips move to a hoist bay |
| P14 one interrogation guard | Info on the A1 checker, A4 and A8 officers | Info on the A1 checker only |
| P15 bunker fiction | Luxury rehearsal centre (M5, your word) | - |
| P16 no co-op markers | Striped leg-up squares at A1, A2, A6, A8 | No marks; the objective line names the spot |
| P17 G45 clear glass passes sight | All glass stops sight, camera sight and jam lines; light passes | Build G45's clear-glass sight |

All maps (`docs/lighting-review/PROPOSAL.md`; undo per item in its section 6):
| Item | Change | Undo |
| --- | --- | --- |
| LR1 | New LD 5.5 "Lit by default; the players make the dark", mixed zones allowed (= P4) | Lower fittings to the old dark read |
| LR2 | LD 3.1 entry vantage "concealed" (occlusion or dark) (= P1) | Back to "dark" |
| LR3 | LD 3.9 checkpoint may sit in a quiet connector no guard enters | Back to "dark" |
| LR4 | LD 4.4 isolation moment "dark, or darkenable by the players from cover" | Back to "dark" |
| LR5 | LD 5.2 / bible L8 drop the EMP (G152); one way to darken must not be a shot | Restore the EMP wording |
| LR6 | LD 6.3 / bible 6 allow player-started device windows, never a fail clock (= P3) | Held isolators |
| LR7 | G225 0.30 stays for transit and rest; encounter spaces 0.14 standby (= P2) | 0.30 everywhere |
| LR8 | LD 15 darkness acceptance test reworded to match | Old test text |
| LR9 | Bible L7: darkness is the exception, not the default | Remove the note |
| LR10 | Template Theme line and space-sheet Lights field describe the lit default and circuits | Old fields |
| LR11 | Bible 7: light plan per space names what cuts each circuit and for how long | Remove the line |
| LR12 | LD 12.1 engine fact: light sync is Course mode only, named groups only | Remove the fact |

Open for you (found while building; built as below, each undoable):
| Item | Built as | Options |
| --- | --- | --- |
| A5 solo laser crossing (slices/S5.md) | The beams stay off for the laser panel's 1.5 s reboot after a jam, so one player can jam the panel, let go and walk through: the throw is then optional. Accepted for the prototype (walking the beams stays the loud route) | (a) beams back on the moment the jam is released (`src/game/laserPanels.ts`; changes Sector Ops panels and A8's curtain too), (b) move A5's panel to the inner wall's far face (drops the jam route) |

| A3 solo relay crossing (slices/S34-check.md should-fix 1) | One player can get past the hall camera alone (a self-jam from office 3's door then a run inside the 1.5 s reboot, or a crouched sprint at 14 m), so the relay is optional for a crossing; the set still needs both players in the east lobby. Accepted for the prototype | (a) send back at camera stage 1 in the hall (a rule change), (b) lock office 3's corridor door (cuts one way only; the corridor stays soloable) |
| Camera range 14 m (master camera-range cut, all maps) | A3's camera 17 -> 14 m, A4's three 18 -> 14 m, A7's cam2 18 -> 14 m; each exercise re-checked at 14 m (S34 / S567 checks). A3's corridor floor west of x 83.5 is now out of range (the jam post's floor) | Per-map `rangeMax` (your call) |

Rejected by you (~01:25): anything that assumes a dark camera is blind (G240 stands, cameras keep IR). Also your
~01:25 rule: every guard armed (SPEC rule 9).
Other assumed decisions tonight: BRIEF A1-A8; PROPS PA1-PA6; LIGHTING-PLAN section 6; slice reports S0-*.md.

## Now (2026-10-23 ~01:20, new account; FULL BURN to 100% per Michael ~01:05 via the orchestrator)
- ~18:10. train/30 merged: marlow-final b83a27fd, section-rating 053ff212, both PROTOCOL 42 (tsc clean; 831 / 891 unit
  tests). section-rating desktop GPU on 568e7301: e2e-section-rating 69 s, e2e-course 169 s, e2e-ctcourse:1 204 s PASS.
  Laptop asked for the train suites on 053ff212. Desktop GPU on b83a27fd: e2e-lightbake PASS 135 s, :4 PASS 304 s.
- ~17:55. Desktop GPU on 0ead059c: e2e-coop PASS 87 s, e2e-netmove PASS 183 s. section-rating: S6 fix round done (b81d57dc:
  coopRating helper, `rh` rated-sets history inside 37), co-op Marlow rating e2e added (53017c9b), merged 568e7301;
  running there: e2e-section-rating, e2e-course, e2e-ctcourse:1 (desktop). Then wait for train 30.
- ~17:45. PR #237 opened (laptop 39/40 + lightbake test fix 7257b141 desktop PASS 137 s). Master 4.77.0 merged (0ead059c;
  TESTING.md + gameState.ts conflicts, tsc clean). section-rating S6 check PASS; fix round running. Orchestrator: train 31, protocol 41.
- ~16:50. Fix 4 merged (d8c232fa; test-only A4 dock read, A2 needed fix 3b only). Master 4.76.0 merged 64e64ef0
  (protocol 36; camera field unified on master `bulletproof`; ricochet wiring is master's). Laptop full e2e requested.
- ~16:35. Merged head 7d13e391 (desktop GPU): :3 PASS 417 s, :4 PASS 344 s. Slice 10 changelog / TESTING lines
  67794f95. Waiting: fix 4 (:1 / :2).
- ~16:20. :4 PASS on a48aae2b (desktop GPU, 308 s; fix 3c done). Slice 10 check PASS (slices/S10-check.md), its
  should-fix done (916703a5), merged in (f7720e9a, tsc clean). Desktop CPU 94% (orchestrator trim, no heavy2). Waiting:
  fix 4 report, then merge -fix4, then ONE laptop request :1-:4 coop netmove course on the head.
- ~16:10 (swap resume, fresh). Fix 3c committed as found (a48aae2b, test-only, no report section; agent died at the
  swap). Running: :4 on a48aae2b (desktop lane 4191, log C:/NightShift/scratch/mf-s4h.log); fix 4 (Opus, worktree
  -fix4 ff'd to a48aae2b; A2 shunter ignores the cut, A4 host dock lit 0.991; slice 10 diag in scratch/s10-d1.log,
  s10-ct2b.log; lane 2 runner scratch/mf-run2.sh 4192); slice 10 checker (Sonnet, slices/S10-check.md). s10 diag
  edits reverted. NEXT: merge s10 + fix4 into feature/marlow-final, merge master, ONE laptop full e2e, PR.
- ~15:12 SAVE (orchestrator 82%). WIP pushed: feature/marlow-final 3d6aa95b (fix 3c mid-work: a8Strongroom.mjs,
  stealthSystems.ts; no "Fix 3c" verdict yet), feature/marlow-final-s10 dfee91c3 (slice 10 W1-W5 mid-work, 16 files;
  W1 done: every Marlow camera armoured, S10-A1; no wire change so far; desktop lane jammed at CPU 97%). Laptop asked
  for :4 on 3d6aa95b and :1 :2 course on dfee91c3 (data only, both unchecked WIP).
- ~14:15 (swap resume). :4 on fix 3b (uncommitted stealthSystems.ts:811 hunk) FAIL 252 s, same step (a8Strongroom.mjs:320;
  log C:/NightShift/scratch/mf-s4g.log). Running: fix 3c (Opus, main worktree; owns a8Strongroom.mjs, stealthSystems.ts,
  A8 data; appends S-e2e-fix3.md) and slice 10 W1-W5 (Opus, worktree C:/NightShift/Mobile-Coop-marlow-final-s10, branch
  feature/marlow-final-s10 off 6b211fb7; report slices/S10-walk.md; merge back after its checker). Desktop e2e runner:
  C:/NightShift/scratch/mf-run.sh <worktree> <suite> <log> [build] (heavy.lock, CPU < 80%, GPU, 4191).
- ~13:55 SAVE (orchestrator ~90%). Master 4.73.0 merged (d32a435a; conflicts run-e2e / courseState / ctDevices /
  world / laserPanels test; protocol stays 33; 6 ctcourse "teeth" asserts flipped for guard-ai wait-0 pass-through) and
  pulled into feature/marlow-final (e3b9fcc0). Fix 3b WIP 0dd54d0f (src/game/stealthSystems.ts: a relocked open door can
  still be shut by hand, A8 grille pass 2) - UNCHECKED, :4 not yet green; the agent is rerunning :4 on the merged code.
  Laptop request sent ~13:45 on d32a435a: :1 :2 :3 coop course netmove (verdict pending). 4.74.0 out since (train 25):
  merge master again only if the PR conflicts.
- ~13:30 (Marlow Build, resumed ~12:25 fresh). Laptop GPU on 1a47946a: :1 / :3 / coop / netmove / course PASS (393 s
  wall). Fix 3 (25ed4646, test-only: A4 cue filter to cam-a4-*, client presses for its own refusal; A8 reads the host
  light registry): desktop GPU :2 PASS 346 s; :4 FAIL later at "A8: N2 walks away from the grille" (a8Strongroom.mjs:320,
  N2 alerted before N1 reaches the board; test vs game open). Running: fix 3b (Opus, same agent; appends S-e2e-fix3.md).
  NEXT: :4 green -> merge master -> ONE full e2e (laptop, E2E_GPU=1) -> PR -> message the orchestrator.
  section-rating (other worktree): S1-S5 + integration + S7 e2e built, check PASS (fda0ed1c), fix round running; S6 waits
  for this PR (courseMode.ts overlap).
- ~12:05 SAVE POINT (window caps ~12:22). Since 11:15: A8 dressing + S1 check PASS (2220e245), perf after measured
  (906065e4). Running at the save: e2e fixer 2 (Opus; uncommitted work in a3 / a6 / a7 set files, their .mjs, maybe
  doors / ai; scratch tests/zz-scratch-nav.test.ts), section-rating planner (Opus, docs only, in the section-rating
  worktree). ON RESUME: if either report is missing, rerun it from the working tree (same brief, continue from WIP);
  then the resume prompt below.
- ~11:15 Done since the resume: S1 prop emissives (0aa53f12), slice 9 docs (15fb489a), A8 dressing (75d70466), revive
  per co-op surface e2e (041eee07, not run yet). Assumed (A9, undo: build it): the ghost-run e2e stays a design
  (S9-e2e.md: needs a `t.ghost` switch in all eight set modules; prototype first), listed for Michael in the PR.
  Doc / code mismatch: SPEC revive reach 1.8 m, code 1.6 m (polish list). Character Build on 45a74383 (GPU, laptop):
  :1 / netmove / course / coop PASS; FAIL :2 "A3 cleaner walks toward office 1's switch", :3 "A6 pass 2 exit release:
  cage door unlocks", :4 "A7 technician leaves R0" (sims x1.00, not load). Running: Opus e2e fixer 2 (A3 / A6 / A7 +
  doors / ai; report slices/S-e2e-fix2.md; scratch tests/zz-scratch-nav.test.ts is its file), Sonnet checker on A8
  dressing + S1 (slices/S8-dress-check.md). Laptop: perf after (cc24e992) + s9 shots queued alone (chain-1023t).
  NEXT: both reports -> one fix round -> ONE Character Build request on the head (:1-:4, coop, netmove, course).
- ~10:50 RESUMED after the second swap (fresh session). The 10:45 agents died at ~10:44; their files committed as WIP
  63e3e892 (tsc clean, map tests 554 / 554 + 1 skipped). e2e fixer's work is in 45a74383 + the A4 client-refusal e2e
  fix (a4GoodsShed.mjs, in 63e3e892). No heavy.lock, no zz scratch tests. Running (Sonnet, continue from the WIP):
  (a) A8 dresser (DRESS-BRIEF N 8 + A8 prop groups 80-89), (b) prop emissives S1 finish (world.ts registry, A5 lens
  setDevice hook, groups A1-A7, report appended to S3-7-dress-check.md), (c) slice 9 docs (TESTING, testing-tools,
  coop.md N1-N9, WALKTHROUGH, changes/feature-marlow-final.md, report slices/S9-docs.md).
  ON RESUME: rerun any of (a)-(c) whose report section is missing; then ONE Sonnet checker on A8 dressing + S1
  (slices/S8-dress-check.md), one fix round; then ONE Character Build request (bridge in docs/orchestrator/STATE.md)
  on the head: e2e-ctcourse :1-:4, e2e-coop, e2e-netmove, e2e-course (E2E_GPU=1), guard-cap after (S9-perf.md),
  shots-ctcourse; then merge master, full e2e, PR.
- ~10:45 kept working past the save (orchestrator: to 99%). Running: e2e fixer (told to hand back), A8 dresser,
  prop emissives on circuits A1-A7 (Sonnet, appends to S3-7-dress-check.md), slice 9 docs draft (Sonnet,
  slices/S9-docs.md). Laptop queue (survives the swap): guard-cap after on cc24e992, shots before / after.
  PERF BASELINE 5100141d (laptop alone, Epic 1080p; frame / CPU / GPU ms, draws): N0 facing 4.4 / 4.1 / 5.30 / 375;
  N0 A7 hall 4.6 / 4.4 / 4.58 / 207; N0 A8 hall 3.3 / 3.0 / 3.13 / 95; N12 facing 7.6 / 7.4 / 7.19 / 393; N12 alert
  9.2 / 8.5 / 8.02 / 407 (GPU over 7.5 only at N12 alert). 155fbec0's 03:45 times were 3-4x high (machine load): not a
  time baseline. Files C:/NightShift/scratch/work/marlowcap-5100141d/ (laptop).
- 10:30 SAVED FOR THE ACCOUNT SWAP (orchestrator: 80% at 10:28). Done this window: A4-A6 dressing (ea111da9), A3-A7
  dressing check PASS (S3-7-dress-check.md; should-fix 2 done d6c68cc6), A8 greybox check (S8-check.md) + its
  must-fix (2e58f265), facility perf pass (cc24e992, S9-perf.md: skins drawn before level boxes, static merge 126 -> 59
  draws, glass culled; estimates only). Commit "WIP e2e fixes + A8 dressing" holds two agents' files mid-work, UNCHECKED:
  (a) the e2e fixer (Opus): scripts/e2e-ctcourse/a1Gate / a3OfficeRange / a6PumpHouse.mjs, src/player/playerController.ts,
  tests/marlowStaleSupport.test.ts, report slices/S-e2e-fix.md (draft; it was running e2e on the desktop lock);
  (b) the A8 dresser (Sonnet, DRESS-BRIEF.md slots N 8 / a8Strongroom / S8-check.md, EXTRA = S8-check "Polish" D
  items, stale request-to-exit text, the two e2e should-fix in a8Strongroom.mjs, S8's C2 pier text): a8Strongroom.ts,
  its test, a8Strongroom.mjs, S8.md (no Dressing section yet).
  Laptop (Character Build): guard-cap baseline on 5100141d queued (A8 + A7 hall cells); no ctcourse rerun sent yet.
  ON RESUME: (0) if C:/NightShift/heavy.lock still says "Menu Notes Build | marlow-final e2e-fix", delete it (the agent
  died with the swap); delete tests/ctcourse/zz*.test.ts scratch files. (1) Read S-e2e-fix.md: rerun the e2e fixer
  (Opus) to finish from the WIP if it is not final (playerController.ts touched: tier adds e2e-coop / e2e-netmove);
  (2) rerun the A8 dresser (Sonnet) from the WIP if S8.md has no Dressing section; (3) tsc + vitest map files
  (tests/ctcourse/ ctcourse ctcourseLight voxelFit facilityProps facilityKit levelFillParity marlowN1Objectives), commit,
  push; (4) ONE Character Build request on the head: e2e-ctcourse :1-:4, e2e-coop, e2e-netmove, e2e-course (E2E_GPU=1),
  guard-cap "after" (S9-perf.md command) and shots-ctcourse before / after (S9-perf.md vantages; glass now single
  layer, clearer); (5) A8 dressing checker (Sonnet) + prop emissives on circuits (S3-7-dress-check should-fix 1:
  PropPlacement.group + dim in propRender.ts, groups set in A1-A8; A5 tower lenses follow the beams) one Sonnet agent;
  (6) slice 9 docs (PLAN slice 9: TESTING.md, testing-tools.md, coop.md N1-N9, WALKTHROUGH.md,
  changes/feature-marlow-final.md), merge master right before the train, full e2e, PR, message the orchestrator.
- 09:40 (clock) RESUMED after the swap (fresh session; throughput rules origin/feature/menu CLAUDE.md "Heavy-usage
  throughput": desktop CPU < ~80%, <= 3 tsc / vitest agents). The dressers' last edits committed (927ecabe), tsc
  clean (5e7cc587); map tests 496 / 497, the fail is voxelFit: A5's dressing beam-tower poles (cover in air at x 58,
  z 33 / 39). Running: (1) Sonnet finishes A4-A6 dressing (A5 voxelFit fix, Dressing sections S4 / S5 / S6);
  (2) Opus fixes the three e2e fails (report slices/S-e2e-fix.md); (3) Opus A8 greybox checker (slices/S8-check.md).
  ON RESUME: if a report is missing, rerun that agent (same brief: owned files above). Then: dressing checkers (Opus,
  A3-A4 and A5-A7), A8 fix round, A8 dressing (Sonnet), Character Build ctcourse :1-:4 / coop / netmove / course on
  the head, slice 9.
  ~10:05: A4-A6 dressing DONE (ea111da9; voxelFit fixed: A5 towers visual only). A8 check FAIL -> must-fix done by
  the job lead (2e58f265: other gates on a door all open, an egress gate releases alone; Fallow L9 safe). Running:
  e2e fixer (Opus), facility perf pass (Opus, slices/S9-perf.md; laptop guard-cap baseline on 5100141d queued),
  A3-A7 dressing checker (Sonnet, slices/S3-7-dress-check.md), A8 dressing + its 2 e2e should-fix (Sonnet).
  Token rules (orchestrator 10:05): message it only at the PR / blocked / Michael needed; one checker per batch
  (Sonnet for greybox / dressing, Opus for ctcourse / net fixes); save at ~25-30% context; merge master only right
  before the train.
- ~09:55 SAVED FOR THE ACCOUNT SWAP (window 91%). Commit "WIP A3-A6 dressing" holds the A3-A6 dressers' files as they
  were mid-work (A3 dressing then FINISHED in the next commit; A4-A6 UNCHECKED, may not compile or pass; tests/ctcourse/a5Substation.scratch.test.ts left out, untracked,
  delete it). A7 dressing complete (3ea78569, unchecked). A8 greybox complete (3dfc6e9a + d3ec16c3, unchecked). The
  dressing brief is in the repo: docs/marlow-final/DRESS-BRIEF.md (fill the <N> / <SET> / <NAME> / <PROPS HEADING> /
  <CHECK> / <EXTRA> slots per set; extras: S34-check.md / S567-check.md polish lists), and docs/marlow-final/mf-e2e.sh
  (desktop single suites only; all e2e goes to Character Build).
  Character Build verdict on 45458bbc (GPU): ctcourse:4 PASS, coop PASS, netmove PASS, course PASS. FAILS:
  - :1 "A1 variant host: feet on the yard floor past the wall (12.52, 2.52, 7.00)": the host still at y 2.52 in the
    relay variant (the main A1 leg passed). Probably the master merge (movement / traversal changes): investigate in
    scripts/e2e-ctcourse/a1Gate.mjs's variant and the hang-drop.
  - :2 timed out "A3: the pass zone sets a3-far1 (one player in the east lobby)" at 60 / 120 fps (not load). A solo :2
    rerun (JOBS=1) FAILED earlier: "timed out waiting for A3 relay jam 1: the host jams the camera" (60 / 120 fps, not
    load; laptop log runs/marlowfinal-45458bbc-ct2solo/e2e-ctcourse_2.err): the relay's first jam after the 3.5 s wait
    I added - check the host's jam post / aim vs the 14 m camera and the jammer cooldown. Check the a3-far1 zone box vs the e2e's east
    lobby spot after the 14 m camera change (SEEN moved; the relay's waits).
  - :3 "A6: the holder's spot reads lit again (host 0.524, client 0.188)": a host / client light parity break after the
    hold panel restores (light parity is a hard rule): check the client's group restore path for A6's held isolator.
  ON RESUME: (1) for A3-A6 read slices/S<n>.md: if its "Dressing" section is missing or unfinished, rerun the dresser
  (Sonnet, DRESS-BRIEF.md) telling it to continue from the committed WIP; (2) tsc and vitest on tests/ctcourse/,
  tests/ctcourse.test.ts, tests/ctcourseLight.test.ts, tests/voxelFit.test.ts (voxelFit failed on A5 cover points at
  x 58, z 33 / 39 mid-dressing); commit, push; (3) the three e2e fails above (Opus, one agent: e2e scripts and, for A6,
  the client light path); (4) Opus checker on A8 greybox (S8-check.md) and dressing checkers (A3-A4, A5-A7), one fix
  round; (5) A8 dressing (Sonnet, DRESS-BRIEF.md, N 8, props heading "A8 - The Strongroom (Victorian banking hall,
  security office, vault)", extras: S8.md Undone, stair rails); (6) Character Build: ctcourse :1-:4, coop, netmove,
  course on the head; (7) GPU shots + perf per set, the facility GPU perf pass (Opus, scripts/guard-cap.mjs), slice 9,
  the PR.
- ~09:45 (window 88%): A8 greybox IN (3dfc6e9a, slices/S8.md, 58 A8 tests, unchecked); its engine requests done by the job lead
  (d3ec16c3: a door with several gates is locked only while none is open, the grille request-to-exit on; camera levels merged
  from the set parts so C2 hangs over the gallery). Dressers A3-A7 still running. NEXT WINDOW FIRST: Opus checker on A8
  greybox (slices/S8-check.md; the A3-A7 checker briefs are the model), dressing checks, A8 dressing; Character Build on
  the newest commit (ctcourse :1-:4, coop, netmove, course).
- ~09:25 (window ~65%+, 100% near ~09:30). Done this window: master 4.68.0 merged (42af9795, protocol 33); A3 + A4
  check (S34-check.md) and A5-A7 check (S567-check.md): A5, A6 PASS; A3, A4, A7 fixed by the job lead (45458bbc:
  cameras to the 14 m cap, claim zones hold ROLE_HOLD 2 s after a bay restart, A3 relay waits out the send-back hold, A4
  e2e camera filter + passage door + host L4 check); shared requests folded (c23d8314, S-shared-fold.md). Character
  Build on 9876f439: :1 PASS, :2 / :3 / :4 FAIL (the three findings fixed in 45458bbc); rerun of ctcourse :1-:4, coop,
  netmove, course on 45458bbc queued after train 20 (verdict pending). IN FLIGHT (uncommitted in the working tree if
  cut off): A8 greybox (Sonnet, slices/S8.md), dressing A3-A7 (Sonnet x5, Dressing sections in S3-S7.md; brief in the
  session scratchpad dress-brief.md, same text as the A1 / A2 dressing step + checker polish). The A7 dresser was told
  to change tests/ctcourse/a7DataHall.test.ts ~547 to `toBe(circuitOf(70)!.lamps)` (group 70 is 7 lamps now).
  ON RESUME: `git status`; for each set file with uncommitted work read its S<n>.md Dressing / S8.md; if the section is
  missing or says unfinished, rerun that agent (Sonnet) telling it to continue from the working tree; then light checks
  (tsc + `npx vitest run tests/ctcourse/ tests/ctcourse.test.ts tests/ctcourseLight.test.ts`), commit, push, send
  Character Build the commit. Then: Opus checker on A8 greybox, Opus checkers on the A3-A7 dressing (two agents: A3-A4,
  A5-A7), A8 dressing (Sonnet), GPU shots + perf per set (Character Build; scripts/guard-cap.mjs measures Marlow), the
  facility GPU perf pass (Opus), slice 9, PR.
- ~08:40 (clock; account swap, new window 2%, resets ~13:30 Sydney). Resumed by a fresh session. A1-A2 built,
  dressed, checked; A3-A7 greybox committed, unchecked; A8 stub. Running (3 agents, lean windows): (1) master 4.68.0
  merge in the side worktree C:/NightShift/Mobile-Coop-marlow-final-merge, branch merge/marlow-final-master (Opus;
  PROTOCOL_VERSION 33 per the orchestrator: guard-ai #185 takes 32 in train 20); the job lead merges that branch into
  feature/marlow-final once green; (2) A8 greybox (Sonnet, report slices/S8.md); (3) A3 + A4 checker (Opus,
  slices/S34-check.md). Next: A5 + A6 and A7 checkers, then Sonnet dressing per checked set. e2e: Character Build
  [06fe56] (live) runs e2e-ctcourse :1-:4 as one request, coop and netmove (E2E_GPU=1); asked :1-:4 on 9876f439.
  Desktop only quick single suites (heavy.lock, E2E_JOBS=1, port 4189, script mf-e2e.sh in the session scratchpad:
  detaches the clean run worktree at a ref, builds, runs).
- Art kit CHECKED: tsc clean, eslint clean, tests/facilityKit.test.ts 17/17, neighbouring world tests 8 files green
  (dfff5877). Master a71c8c02 (train 14) merged clean, tsc clean after.
- Running (3 Opus agents, started ~01:20): spec writer (finish SPEC.md, write PLAN.md with Course Ready slices),
  lighting (LIGHTING-PLAN.md + pure modules src/world/lighting/ + tests/marlowLighting*.test.ts), props (build.py
  fixed, facility-props.glb, src/world/props/ helper + renderer, tests/facilityProps.test.ts). If cut off, rerun the
  same agent; each owns only its files.
- Also running (~01:30, 6 agents total): Phase 0 engine answers (SPEC 19 -> ENGINE-ANSWERS.md, read-only); slice 0
  code split by file: N1-N4 + N8 (course files, report slices/S0-course.md) and N6 + PassZone.any (ctDevices,
  scanners, protocol bump; report slices/S0-devices.md). Slice 0 e2e (coop, netmove, ctcourse) goes to Character
  Build once both land.
- Pacing (Michael 01:12 via the orchestrator): this window full burn to 100%. After his reset (phase B, orchestrator
  01:40): at most 3 agents at once in this session (desktop CPU at 100% with 4 sessions; keeps tsc / vitest runnable
  locally), e2e stays on the laptop; pace each 5-hour window to ~97-99% at its reset. Lean windows (Michael ~01:45,
  ROADMAP Decided): each window to 99%, lean, no quality loss; no new agent at 97%, save at 98%, stop by 99%. Models:
  Opus plans, writes strict slice briefs (exact files, line ranges, acceptance, tests), reviews and runs every fresh
  checker; Sonnet builds from those briefs (greybox sets A1-A8, set data, dressing placement, props batches, e2e
  routes); Haiku for chores; engine pieces (course code, devices, lighting modules) stay Opus; a failed Sonnet slice
  gets its fix round from Opus; at 97% start no new agent, save (WIP pushed, STATE current) and idle; the
  orchestrator's cron resumes this session after each reset.
- 08:40 SAVED for the account swap (window ~79%+). After the save: A7 (slices/S7.md, 40 tests), A5 (S5.md, 44 tests), A6 (S6.md, 37 tests; host use-slack note for the cage: 2.08 m vs 2.15 m accepted, only a forced client press) and A4 (S4.md, 42 tests) greybox COMPLETE, not yet Opus-checked; A5 solo laser crossing in MORNING-REVIEW. WIP commit "WIP A4-A7 greybox (agents mid-work, UNCHECKED)" holds
  a4GoodsShed / a5Substation / a6PumpHouse / a7DataHall .ts + tests + light.json as the agents left them; A8 had not
  written yet. On resume: for each of A4-A8 read the set file and its test; if the agent's report (slices/S4-S8.md) is
  missing, rerun that set's builder with the SET BRIEF below (A4 Sonnet ok; A5-A8 Opus), telling it to continue from
  the WIP. Then per set: Opus checker (S<n>-check.md), dressing (Sonnet, A1 / A2 dressing as the example), e2e parts
  :2-:4 via the scratchpad-style script in the clean run worktree C:/NightShift/Mobile-Coop-marlow-final-run (heavy.lock,
  port 4191, E2E_GPU=1; recreate the script from the 07:40 note if the scratchpad is gone).
  SET BRIEF (copy into each builder): owned files = src/world/maps/ctcourseSets/<set>.ts, tests/ctcourse/<set>.test.ts,
  tests/ctcourse/<set>.light.json, scripts/e2e-ctcourse/<set>.mjs, docs/marlow-final/slices/S<n>.md; the spec is
  docs/marlow-final/sets/<set>.md (section 13 overrides SPEC); worked examples A1-A3 (set files, tests, e2e modules,
  S1-S3.md, S1-check / S2-check / S-switch.md); API S0d.md 128-168, types.ts, S0-course.md, S0-devices.md; co-op pieces
  via ctcourseGreybox.ts (GREYBOX-HELPERS.md); lights marlowCircuits.ts + LIGHTING-PLAN 3; rules: armed guard kinds,
  no src/ai edits, cameras IR, waits never 0 (0.1 s until guard-ai PR #185 lands), at most 3 guards, every lamp grouped;
  e2e lessons: hang let-go only at attach.phase 'on'; doors opened by use('door-<anchor>') and asserted open on both
  pages; client presses within reach; lure waits only within 25 m; asserts that can fail; checks: tsc, eslint, vitest
  on the set test + ctcourse, ctcourseLight, facility, voxelFit, levelFillParity (never loosen a test).
- 08:35 A3 greybox IN (7286d6c6; slices/S3.md; 43 A3 tests). Job lead: tests/ctcourse.test.ts lets house lamps stand
  in A3's lobbies (group 34; LIGHTING-PLAN's own rows; A3-C4 table change is the undo). A3 moved office 3's corridor
  door to x 91.4-92.6 (the camera's vertical frame missed a crouched head at the doc's x 94: simulated, tested).
  Open for the A3 checker: a lone creeping jam from office 3's door (the set still needs both players to finish).
  A8 greybox started on Opus. Running: A4, A5, A6, A7, A8. Known: voxelFit floor-air points in A7's hall (A7 agent).
- 08:20 Guard AI: `MapLayout.guardAi` (zones / noisy / entries / squads) and `SquadSlot.post` / `profile` types are on
  feature/guard-ai 971711c4 (src/ai/guardAiData.ts, posts.ts); the PatrolWalker wait-0 freeze is fixed in PR #185. Both
  reach master with the next guard-ai PR: after merging master, fill guardAi per set (zones per set, A5 / A6 noisy
  machinery, A4 / A8 posts, A1 checker leash 0) and set the 0.1 s waits back to 0 (A2, others).
- 08:15 e2e-ctcourse:1 GREEN on the desktop (clean run worktree, 12919c85, E2E_GPU=1): A1 (leg-up, hang-drop, bolt,
  restart, relay variant, client yard switch) and A2 (isolator crossings, re-arm, restart) pass on two pages. A2's
  dressing (4827cc7d) came after: rerun :1 with the next batch.
- 08:10 FULL BURN (Michael ~07:55: "Increase usage to hit 5 hour window ASAP, and I will swap account once it hits."):
  up to 5 agents. Running: A3 + A4 greybox (Sonnet), A5 + A6 + A7 greybox (Opus), each in its own set files (reports
  slices/S3-S7.md). Next: A8 greybox, then dressing per set as each lands, checkers, e2e parts :2-:4 on the desktop.
  At 97%: start nothing new, save, reply "saved".
- 08:05 A2 dressing IN (4827cc7d; 47 A2 tests, 140 map tests; stair underside filled, staging switch post; 685 skins
  but boxes are thin instances in one mesh, levelBuilder.ts:525, so ~8 k tris and no extra draws). Its check folds into
  the A3 checker. A4 greybox started on Sonnet beside A3 (slices/S4.md). Resume prompt below is current.
- 07:40 back to 2 agents (orchestrator): A2 dressing + A3 greybox (Sonnet, slices/S3.md). e2e now runs in a CLEAN
  run worktree C:/NightShift/Mobile-Coop-marlow-final-run (detached at origin/feature/marlow-final, node_modules is a
  junction to this worktree's) via the scratchpad script mf-e2e1.sh <suites> (heavy.lock, port 4191, E2E_GPU=1), so
  builders' in-progress edits never reach a run. e2e-ctcourse:1 (A1 + A2) queued behind train 18.
- 07:20 client switch: NOT an engine bug (slices/S-switch.md): the host's reach rule refused a client press from 8.8 m;
  the A1 e2e now stands the client at the switch; reach unit test added. e2e-ctcourse:1 (A1 + A2) still to run on the
  desktop (both locks held now: train 18 to ~07:35, Course Ready heavy2.lock). Orchestrator trim: 1 agent (A2 dressing).
- 07:05 A2 greybox checker PASS + A1 dressing PASS (S2-check.md). A2 should-fix 1 (lure wait out of range) fixed by
  the job lead (78589aac); should-fix 2 (walkable strip under the east stair) and the floating staging switch go into
  A2 dressing, started on Sonnet. Course Ready: ours is the one switch fix; their Sector lamp sync (protocol 31,
  feature/sector-redesign) touches the same net files, so our fix stays local to the use / switch path.
- 06:45 NEW WINDOW (reset ~06:40, ends ~11:40): up to 2 agents; e2e on the DESKTOP lanes (Character Build down until
  Michael restarts it), heavy.lock + port 4191. Running: (1) Opus client wall-switch fix (stealthSystems / coopClient /
  coopHost; report slices/S-switch.md; it runs e2e-ctcourse:1 on the desktop), coordinated with Course Ready (they
  check Sector Ops after); (2) Opus checker on A2 greybox + A1 dressing (slices/S2-check.md). Michael may clear this
  session after ~07:00: the resume block below is current.
- 04:35 slice 2 A2 greybox / lights / guard / e2e IN (slices/S2.md): 4 circuits, neck isolator 15 s / 3 s, armed
  shunter loop (waits 0.1 s: PatrolWalker freezes on a 0 wait, reported to Guard AI), 35 A2 tests, 128 map tests.
  Its e2e is in part :1 after A1, which still stops at A1's client-switch step: run e2e-ctcourse:1 after the switch fix.
  Next window: (1) the client switch fix (Opus), (2) e2e-ctcourse:1 on the laptop, (3) Opus checker on A2 + A1
  dressing, (4) A2 dressing (Sonnet; S2.md has the list incl. a post for the staging switch), (5) A3.
  IDLE now per the orchestrator (pace) until its message (~05:30) or the 06:40 reset.
- 04:25 42a9b295 laptop: the restart fix holds (step clears, bolt shuts, relay variant ok); e2e-course PASS, e2e-coop
  PASS; all 13 shots pass parity. e2e-ctcourse:1 FAIL at "A1: light": `use(B, 'switch-0')` (the client's yard switch)
  never turns group 12 off on the host or the client (15 s, not load). NEXT WINDOW FIRST TASK (Opus, engine): a client
  wall-switch press in Course mode must reach the host. Suspect: the client also builds StealthSystems
  (gameState.ts:667), so its local `switch-0` (stealthSystems.ts:94) shadows the host-mirrored `switch-0` item and only
  toggles the client's own registry; check how the client's use of a mirrored item is forwarded (coopClient) and whether
  e2e-coop / netmove ever press a switch from the client. Core to M6 ("players cut it") in every set.
- 04:10 8b260100 laptop: e2e-course PASS, e2e-coop PASS, e2e-ctcourse:1 FAIL again at the restart step-clear: the
  pause-menu restartCheckpoint() path ran the next device step (zones) before handle() saw bayRestart; fixed 42a9b295
  (holdZones in restartCheckpoint). Shots on the laptop (C:/NightShift/scratch/runs/marlowfinal-8b260100/shots/):
  f-gallery-from-a1 "FAIL" was a stale vantage inside the new A1 wall (moved). Rerun on 42a9b295 requested.
- 04:00 A1 e2e restart failure was a REAL bug: a pass zone re-fired on the players' old positions during the respawn
  delay and re-ticked the step; fixed in course code (944adbcb: pass zones hold 2 s after a bay restart; 108 tests
  pass; unit test for holdZones still to add). A1 dressing IN (8b260100; 42 A1 tests, 93 map tests; budgets and the
  no-solo-jump check re-proved with props). Lounge panel polish done. Laptop: ctcourse:1, course, coop + a1 / f shots
  on 8b260100. Usage 70% at 03:43, 2 h 57 left: lean. The A1 dressing check is folded into the A2 checker. Slice 2 A2
  greybox started on Sonnet (S1 as the worked example).
- 03:45 PERF (guard-cap, laptop RTX 4090 alone, Epic 1080p, 155fbec0 = facility + A1 greybox, results on the laptop
  C:/NightShift/scratch/runs/guardcap-155fbec0-out/RESULTS.md). frame med / CPU / GPU / draws / sim p95 ms:
  0 guards facing 4.64.0 11.3 / 10.7 / 6.6 / 115 / 4.6 -> 12.7 / 11.9 / 10.9 / 224 / 2.9; 12 guards 29.6 / 28.8 /
  17.9 / 133 / 9.1 -> 30.5 / 29.8 / 22.8 / 242 / 6.8. The facility adds ~+1.2 ms CPU, ~+4 ms GPU (now OVER the 7.5 ms
  Epic GPU budget), ~+110 draws (fine). Frame CPU was already over the 5.5 ms main budget on master. DoD needs the
  budgets for a rendering job: before the PR, an Opus perf pass on the facility GPU cost (suspects: gallery glass /
  spill, kit and prop materials, lamp count per column, shadow casters) - queued after the sets are greyboxed.
  A1 e2e: failed at the hang let-go (test helper: the drop press is an edge spent during the lowering); fixed e00f1d64,
  rerun running. e2e-coop PASS on da79b984.
- 03:25 slice 1 checker PASS (S1-check.md); its should-fix done by the job lead (da79b984: e2e opens the wicket by
  hand). A1 dressing started on Sonnet (a1Gate.ts dressing section + tests + S1.md "Dressing"). Laptop: A1 e2e on the
  newest commit, then guard-cap perf on 155fbec0. Usage 62% at 03:22, 3 h 18 left.
- 03:20 Character Build on 153db3e8: 12 GPU shots on the LAPTOP at C:/NightShift/scratch/runs/marlowfinal-153db3e8/shots/
  (a1-a8 stub halls, f-dock, f-gallery-from-a1, f-l1-holding, f-l7-model; not on the desktop); e2e-ctcourse:1 PASS 153 s.
  Perf: scripts/perf.mjs has no Course-mode path (spawns Warehouse guards; crash at perf.mjs:81). Baseline from
  guard-cap on master 4.64.0 (OLD Marlow, laptop, Epic 1080p): 0 guards 11.3 ms med, CPU 10.7, GPU 6.6, 115 draws,
  sim p95 4.6 ms (budget Epic main p95 5.5, sim p95 2.9: sim already over before guards); 12 guards 29.6 ms. Asked for
  the same guard-cap run on 155fbec0 (new facility) for the delta. Slice 9: a Course-mode path in perf.mjs.
- 03:15 (clock) slice 1 A1 steps 2-4 IN (155fbec0; slices/S1.md): wall + 4.4 m lips via boostWall, wicket bolt
  from the yard, lounge with group-10 coves and closed 3.2 m ceiling, cabin (noLedge), 9 lamps, passive armed checker,
  steps / claim / pass zone, e2e route. 6 map test files 83 pass + 23 neighbours 310 pass. Opus checker running;
  e2e-ctcourse:1 + e2e-coop sent to Character Build. Usage 59%, 3 h 25 left. Then: A1 dressing (Sonnet), then A2.
  Small follow-ups (job lead): e2e-times.json :1 real time; marlowCircuits A1 switch hints (7.7, 15.15), (9.5, 15.15);
  stub.ts a1Gate branch dead.
- ~03:15 SLICE 0 COMPLETE: 0e checker PASS (S0e-check.md, polish P1-P5 only; P1 prop emissives on no circuit, P2 L7
  vitrine 16 cm float). Orchestrator told. Slice 1 (A1 the Gate, steps 2-4) started on Sonnet from a strict brief
  (owns a1Gate.ts, tests/ctcourse/a1Gate.test.ts, a1Gate.light.json, scripts/e2e-ctcourse/a1Gate.mjs, slices/S1.md).
  Then: Opus checker, laptop e2e-ctcourse:1, dressing (Sonnet), then A2.
- ~03:05 0e IN (153db3e8; slices/S0e.md): shell clad (visual), gallery (circuit 90, drawn only), lounge (group 10:
  dark until A1 builds its lamps), holding rooms, dock; 140 props; gallery 53.6 k kit tris; gallery and lounge at the
  12-draw limit; detail pass off. 57 map tests pass. Opus checker on 0e running; GPU shots + perf + e2e-ctcourse:1 sent
  to Character Build. Known flake: marlowLightingLevels "bodyEstimate does not allocate" failed once under load (2.63 MB
  vs 2 MB), passes alone. Next after the 0e check: slice 1 A1 on Sonnet from a strict Opus brief.
- ~02:45 0d scaffold e2e GREEN on the laptop GPU (3e41b859): smoke, e2e-ctcourse :1-:4, coop, course, netmove all
  PASS (logs C:/NightShift/scratch/runs/marlowfinal-3e41b859/). Slice 0 left: 0e (running), then its check.
- ~02:35 (clock) bounds test IN (stubs add no geometry yet, so it bites from the first real set). 0e facility
  dressing started on Sonnet (facility.ts + tests/ctcourse/facility.test.ts; report slices/S0e.md). Usage 43% at
  02:32, 4 h 08 left: one agent at a time.
- ~03:05 0d fresh checker PASS (S0d-check.md). Its should-fix (no test that a set's geometry stays in its SET_BOX) is
  being built by a Sonnet agent (ctcourse.ts ranges + tests/ctcourse.test.ts + checkSetPart tag checks). Then 0e.
- ~02:55 0d scaffold IN (3e41b859; slices/S0d.md): ctcourse merges set parts, facility greybox, 8 stub sets walk end
  to end, test / e2e frames (4 parts), registerCourse at load, map tests (scanner pairs <= 8, objective id <= 40).
  tsc clean, 34 test files green, npm run build ok. Decisions: facility groups 90-98 (SPEC says 1 / 2: fix in SPEC),
  walls 0.5 m, voxelFit allowance for the 160 x 78 site. e2e (ctcourse :1-:4, coop, course, netmove) sent to Character
  Build. Fresh Opus checker on 0d running (the one agent). Old shot scripts with stale ids (nv-shots,
  sector-lights-shots, sector-fixes-c-shots, camera-cue-shots, wheel-shots): slice 9. Next: 0e facility dressing
  (Sonnet brief) after the 0d check.
- ~02:40 set docs A1-A8 + plan SVGs IN (sets/*.md, plans/*.svg). Spec contradictions logged per doc (section 13,
  ids A<n>-C<k>); the set docs win over SPEC for their set. Follow-ups for set slices: MARLOW_POCKETS /
  MARLOW_CIRCUITS rows for A5 / A6 / A8 (lighting file, src/world/lighting/marlowCircuits.ts); coopDeck `gaps` and
  slab `solid: false` options (A6, A8); facility.ts south corridor break x 101-104 + L4 east door locked (sent to 0d);
  refused press must not claim a role (A4-C9, slice 0 polish). Trim: orchestrator messages only at slice ends / PRs /
  blockers; 1 agent (Sonnet from a strict brief) after 0d finishes.
- ~02:25 0f IN (30b89647): props batch 2, 55 props / 11420 tris; the facilityProps hang was an infinite loop in
  `propRow` (fixed, 11/11 in 1.4 s); hook `MapLayout.facilityProps` + `World.facilityProps` (PA7: `props` names were
  taken). A4 dressing: check the security room and warehouse floor as separate areas (26 draws together vs 12).
  Props GPU look pending (with the first dressed set). Running: 0d, set docs x2 (3; trim cap 2: no new agent).
- ~02:15 slice 0 CODE GREEN: e2e-ctcourse :1-:3 PASS on 5920cce5 (security room looped feed ok); with 1949764e,
  8/8 suites green on the laptop GPU. Remaining slice 0: 0d (running), 0e (after 0d checked), 0f (running).
- ~02:05 TRIM (orchestrator): window 11% after ~11 min; at most 2 agents until the orchestrator loosens; in-flight
  ones finish; no new agent until under 2; sets / dressing / props on Sonnet 5.5 from strict Opus briefs; checkers
  Opus. facilityProps.test.ts hangs at collection on the laptop too (12 / 13 unit files pass, 117 tests): 0f fixes.
- ~02:00 slice 0 e2e on 1949764e (Character Build, GPU, JOBS=3): smoke, e2e-ctcourse:2, :3, e2e-course, e2e-coop,
  e2e-netmove, e2e-stealth-ai PASS; e2e-ctcourse:1 FAIL at the security room 'off' assert (the by-design failure
  fixed in 5920cce5, test script only). Rerun of e2e-ctcourse on 5920cce5 and the 13 unit files on f315434f running.
- 01:50 Guard AI Build (feature/guard-ai) data shapes agreed: optional `MapLayout.guardAi` (zones per set, noisy
  machinery in A5 / A6) and `SquadSlot.post` (A4, A8 high-security posts; A1 checker `leash: 0`) are filled by the set
  slices once those types reach master; until then omitted. They do not set em.stealth (ours, A8) and keep out of
  courseMode / course / ctDevices / securityRoom / scanners; their camera body callback lives in src/security.
- ~01:55 Sydney: Michael reset the 5-hour window (2% at resume; resets 2026-10-23 ~06:40 Sydney). PHASE B: lean,
  at most 3 agents, 97 / 98 / 99% rule, Sonnet builds sets from Opus briefs (Pacing above). Four agents carried
  over (0d, set docs x2, 0f): no new agent until 2 or fewer run. (Note: earlier "~0x:xx" times in this file are
  session estimates; the machine clock reads about 02:00 Sydney now.)
- ~03:10 slice 0 fresh checker: PASS (slices/S0-check.md). Fixed its should-fix 1 (e2e-ctcourse expects 'looped',
  5920cce5); Character Build reruns e2e-ctcourse on 5920cce5. Slice 0 follow-ups (Opus, small, next free slot):
  unit test for ctDevices camera mode transitions (console -> looped, jam during loop -> off -> looped, flag clear ->
  online, dead Sector Ops camera stays off); prune holdPulseAt on client leave; a refused press should not claim the
  role; isolator lure point (cabinet vs lamps: SPEC wording). 0d takes registerCourse at load + map tests for scanner
  pairs <= 8 and objective id length <= 48.
- ~03:00 greybox helper tests IN (77 pass). Helper fixes override SPEC numbers (fold into SPEC at the next spec pass):
  A1 leg-up mark x 10.8; A3 first hop 10.0 m, hide x 88.6; A5 drum stack >= 2.8 m off the beam line or >= 1.9 m
  noLedge; A6 5 m bridge, overhang 0.4, exit release on the cabinet, panel 3 s hold; GREY_KEEP_CLEAR 4.7 m. Sent to
  the set-doc agents. Props batch 1 committed, test not run (desktop 97% CPU): sent to Character Build with the slice 0
  unit files. MORNING-REVIEW written. 0f props batch 2 + World props hook started.
- ~02:45 slice 0 CODE ALL IN: 0a course (N1-N4, N8, A8 em.stealth, despawn, door occupancy), console loop sets
  'looped', client hold-noise pulse (inside protocol 30), 1949764e. SPEC rules 9-10 (Michael ~01:25: armed guard
  kinds only, no src/ai edits; cameras keep IR). Slice 0 e2e queued on Character Build 4189 (GPU): smoke,
  ctcourse :1-:3, course, coop, netmove, stealth-ai on 1949764e. Running: fresh slice 0 checker (slices/S0-check.md),
  0d scaffold (slices/S0d.md), greybox helper tests, set docs A1-A4 / A5-A8, props (status unclear: files on disk,
  no hand-back yet). SPEC N4 / PLAN 0d text still says N4 ships without holdNoise: now built, fix in the next pass.
- ~02:30 0g N9 slide doors IN (slices/S0g-doors.md; 6 files 43 tests). Engine answers folded into SPEC /
  CONSTRAINTS / PLAN. Set docs (slice step 1) started: A1-A4 and A5-A8 agents (docs/marlow-final/sets/, plans/*.svg).
  Still running: 0a course code, greybox tests, props, client hold noise.
- ~02:20 lighting IN (471c3a98): LIGHTING-PLAN.md, shared docs/lighting-review/PROPOSAL.md (LR1-LR12 for Michael,
  none applied), src/world/lighting/ (levels, circuitSchedule, marlowCircuits) + 23 tests. Integration (map groups,
  switches, zones, isolator timings, ctcourseLight rewrite) is 0d / set slices: LIGHTING-PLAN section 4. Client
  hold-noise agent started (protocol.ts, coopHost, coopClient; slices/S0-holdnoise.md).
- ~02:10 0c ENGINE-ANSWERS.md in. Routed: 0a also builds em.stealth true in Course mode (BRIEF A8), em.despawn in
  spawnSquad, remote players in StealthSystems.occupied(); the spec writer folds the answers into SPEC / CONSTRAINTS.
  Later small item: client holdNoise pulse (inside protocol 30), in PLAN 0d.
- ~02:00 SPEC COMPLETE + PLAN.md written (slices 0a-0g, 1-8, 9; parallel waves). Running: 0a course code, 0c engine
  answers, 0g N9 slide doors (slices/S0g-doors.md), greybox helper tests, lighting, props. Next: 0d scaffold (one
  agent, gate for every set) once 0a lands; then waves per PLAN "Parallel order".
- ~01:50 slice 0 devices IN (34cb5b52): N6 scanner pairs, PROTOCOL_VERSION 30, PassZone.any (src/game/passZones.ts);
  tsc, eslint, 2 new test files 15 passed, 10 related files 226 passed. Report slices/S0-devices.md. Set builders:
  every new zone / scanner flag goes in `def.externalFlags`. e2e for slice 0: e2e-coop, e2e-netmove, e2e-ctcourse
  (after the course half lands). Greybox-helper tester started (tests/ctcourseGreybox.test.ts).
- Gap list landed (COOP-GAPS.md), routed to the spec, slice 0 course and lighting agents (~01:40).
- Michael 01:40 (via the orchestrator): Course Ready leads the Sector Ops redesign and is NO LONGER our second builder;
  marlow-final builds every slice (up to 6 agents). Lighting for ALL maps: "review lighting also, i think the rules
  may be too strict and the levels are very dark and unrealistic. there shouldnt always be shadows, the player may
  have to make shadows (disabling lights etc)": the lighting agent writes the shared docs/lighting-review/PROPOSAL.md
  (proposals only, never applied). Course Ready's camera-range cut (feature/camera-range) stays off ctDevices.ts /
  securityRoom.ts or sends us the hunk. Their greybox helpers arrived later (8ae26f6a): src/world/maps/ctcourseGreybox.ts +
  GREYBOX-HELPERS.md now on this branch, unwired, NO tests yet (slice 0 writes them; list in the doc).
- After the spec: slice 0 (scaffold + section 14 code), then sets in parallel with Course Ready, dressing after each.

### At the swap (~01:10, history)
In, committed: AUDIT.md, COOP-INVENTORY.md, CONSTRAINTS.md, ROUTE-DRAFT.md (all 4 step-1 reports), BRIEF M1-M6.
WIP, committed partial (the agents may have been mid-work at the swap; check each file's last section):
- SPEC.md (spec writer): partial; rerun the spec writer to finish SPEC.md and write PLAN.md (Next 1).
- KIT.md + scripts/facility-kit/ + src/world/kit/ + tests/facilityKit.test.ts + hooks in levelBuilder / doors /
  anchors / mapDef / world.ts + package.json (architecture kit agent, commit 93d1eab1): UNCHECKED. First run
  `npx tsc --noEmit` and `npx vitest run tests/facilityKit.test.ts`; if broken, fix or revert the hooks.
- LIGHTING-PLAN.md (lighting agent): partial.
- PROPS.md + scripts/facility-props/ + src/world/props/ (props agent): may be missing or partial.
Any of these missing or cut short: rerun that agent from "Agent briefs" (the props and lighting briefs are in the
RESUME of the session, summarised here: props = Blender headless props per set + placement helper + PROPS.md;
lighting = M6 rule review, per-set lit default / light groups / timed breakers / dark pockets, code and tests).
Course Ready's prep notes: origin/feature/marlow-bays docs/marlow-final-prep/ (MAP-AUDIT, DEVICE-INVENTORY, SCENARIOS).

## Next
1. Spec writer (one Opus agent): merges AUDIT, COOP-INVENTORY, ROUTE-DRAFT, CONSTRAINTS AND Course Ready's independent
   second opinions in `C:/NightShift/scratch/course-ready/marlow-final/` (MAP-AUDIT.md, DEVICE-INVENTORY.md with
   placement APIs / wire hooks, SCENARIOS.md; committed on origin/feature/marlow-bays docs/marlow-final-prep/,
   489d7c04 or newer: SCENARIOS has a 37-entry CT set-piece catalogue, an 8-area route proposal and the rule clashes for
   Michael - bible 5.8 no timers in stealth, G240 cameras see in the dark, G110 no rope climb) into `SPEC.md` (from `docs/templates/map-spec.md`) and `PLAN.md`
   (slices; whole slices marked for Course Ready, separate files). The spec must carry:
   - M4: no explainer pads; the objective list updates per area and guides both players (per-player lines on splits).
   - M5 + A5-A7: a facility look section (luxury training facility, instructor gallery behind glass, LED coves, sliding
     doors) and a lighting section (sufficient light to read the space; review the darkness rules; any loosening is a
     proposal for Michael, never applied).
   - Every standard item in CONSTRAINTS.md, with any loosening listed for Michael.
   Commit, push, message the orchestrator.
2. Build slices: greybox, lights baked, guards, one e2e route per slice; then dressing with the kit as each greybox
   passes (M5); checker + 1 fix round per slice; GPU suites (e2e-ctcourse :1-:3, course, coop, netmove), perf budgets
   and GPU shots per area via Character Build. Desktop e2e only when CPU < ~60% at the start.
3. Course Ready joins as the second builder (whole slices from PLAN.md).

## Open
- (done ~01:15) master merged at a71c8c02.

## Done
- 2026-10-23 ~00:20 job started: BRIEF.md (Michael's words, M1-M5, A1-A7), STATE.md; npm ci done in the worktree.
- ~00:30 step 1 agents and the art-kit agent started (max burn, 6 Opus agents allowed).

## Agent briefs (for a rerun)
- AUDIT: read-only; the current ctcourse map as built (areas in route order with coordinates, props, lights, guards,
  cameras, doors, anchors, ASCII plan), per area KEEP / REWORK / CUT with file:line, flow problems against
  docs/level-design.md, co-op actions used and unused, timings, ids the e2e suites and code rely on.
- COOP-INVENTORY: read-only; co-op mechanics in code (team moves, lights / breakers, cameras + security room, locks /
  hacks, jammer, laser panels, scanners, sync windows) with file:line and net sync; gaps vs Michael's list with the
  smallest prototype; 10-15 CT co-op scenarios from docs/ct-research; 8-12 proposed exercises (A / B jobs, sync, fail
  and retry, observe-then-plan, light parity, time).
- ROUTE-DRAFT: read-only; fiction frame (original names), 7-10 areas each a mock-up of a real site with its co-op
  exercises, escalation to a graduation area, connections without backtracking, ASCII plan, timing table 15-20 min.
- CONSTRAINTS: read-only; the level-design / template MUST and SHOULD checklist with sources, engine limits with
  numbers, the template section list, clashes with Michael's ask (solo-first vs G2 etc.), current map compliance.
- KIT: implementer; in-repo Blender (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, `-b` only, CC0
  textures only) generator for reusable luxury pieces (wall panel with LED cove, gallery glazing, double sliding door
  leaf + frame on the existing door logic, LED strip cove, floor trim, column cladding, handrail), a placement helper
  with a Vitest test, KIT.md; visual over the level builder's collision.

## Resume prompt
```
Night Shift | Marlow Build (Opus 5.5 high, desktop). Rules: docs/RULES.md + docs/VISION.md from origin/master; boot: docs/orchestrator/BOOT.md "Marlow Build" (origin/feature/menu).
Area: Marlow Yard, level validator, route-runs, guard cap, level standard (docs/level-design.md, docs/templates/map-spec.md).
Row 6 SIGNED OFF: no hold. Plan = origin/feature/menu docs/orchestrator/FOLDED-PLAN.md (Marlow: J1, J5, J12, J13, J14, J21); ROADMAP "Decided" overrides it.
Marlow first (Michael ~20:50): Marlow laptop requests first, desktop CPU priority; walk-ready Tue 27 Oct evening, kit stations 29 Oct. Tell the orchestrator each time requests are filed.
Michael ~21:42: Marlow Yard needs 2 players everywhere. Michael ~22:10: desktop load to the cloud - new tsc + vitest-only builder slices go to cloud-queue briefs; desktop keeps Opus plans / checks, src/net / AI code, GPU / e2e. All node work at BelowNormal, one at a time.
State at ~21:55, 2026-10-26 (SAVE before the ~22:41 swap; node work via C:/NightShift/scratch/marlow/node1.sh = one at a time, BelowNormal). Agents die at a swap: read each report in C:/NightShift/scratch/marlow/; a missing or PARTIAL report = rerun that check; resume a stopped builder from its branch head + its report. Node at BelowNormal, one at a time, agents never wait for CPU. Orchestrator 14:09: builder hold released. Michael ~14:00: FIXES FIRST (tracker docs/orchestrator/FIXES.md on feature/menu): fix rows before feature work, fix PRs first in the queue, message the orchestrator at fix PR open. Session is in bypass permissions (Michael ~14:00): post own checker statuses. Michael ~13:55 "All on in preview": dark flags default ON at /preview/ via darkFlag(params.get(x), PREVIEW_ON) in src/core/flags.ts (Player brief player-preview-flags); marlowReplan / coopKit read through it if they land after it.
- Michael ~19:22: full burn ended (max 2 builders, Sonnet where allowed, one slice ahead). Michael ~19:40: main focus = piano scene (Campaign, ROADMAP Now 20); a Campaign ask for a level validator pass on its map goes first.
- PROTOTYPE MODE (Michael ~16:05, ROADMAP Decided e18f09d2f; replaces the fix freeze, which ends when the fix train ships): reviewed fixes ship in one train with no-affected-e2e; ONE closest test set per change, no proof runs; every feature on in /preview/ (#560); next priority is Michael's playthrough (Marlow Yard, Saltmarsh S1, co-op); build playable pieces, not tooling. No open Marlow queue requests (F7 proofs withdrawn ~16:50).
- LQ9 = PR #571 (fix, Job-done laptop-queue-9; F12 F16 F18 F19 F20 F23 F34 + S4 docs), head 457e2948c, Opus PASS x3 (lq9-check-s12/s3/s6.md), checker posted; #552 one-line conflict in service.mjs (keep labels,isDraft; in the body). S5 = orchestrator re-registers auto-train after release. Labelled train-ready + no-affected-e2e ~16:50.
- F29: fix on #520 = 64dd56820 (fixture points, stop-record phase, guard tests/routeRunSelftestPoints.test.ts; 176 unit; f29-fix-report.md). One test set filed: route-run-selftest-steps (1 player). The 2-player follower stalls on links 2 / 20 are not fixed (report item 6).
- F7: PR #553 head 4a554b1d9 (master merge; #567 Campaign merged it, 293c12e3b, rides the same train) labelled train-ready + no-affected-e2e ~16:50; checker posted. Proof runs withdrawn (prototype mode).
- Mixamo kit (#490 draft): head 313a983f0 Opus checker PASS (mixamo-kit-check-2.md, no fix list; orchestrator asked to post); laptop kitmix2 filed on it; PR body refreshed. HELD: ships as its own PR after Campaign's engine split C1-C5 is on master, then merge #498's newer head 7f851b274 (keep 68c15083d until then). Polish: `?mixamo=1` local vs wire pick (kitMixamo.ts:110; keep it off walk cards), test (a) loop Hand too.
- J13 (parked by the freeze; j13-pickup-report.md): #520 R5 draft = de87a94d4 (seams merged, 171/171; body still lacks the seams line); R6 draft #564 51e0f1978 (71/71); R4c draft #566 727f914a9 (149/149, ~1,319 lines). #520 vs #566 conflict in course.mjs: take R4c's file whole (in #566 body). Course selftest needs #520 + R4c in one head (combined test head or wait for #520). After the freeze: one fresh Opus checker for #520 + #564 + #566 (focus list in the report), #520 out of draft.
- J14: #487 (R1) checker posted, affected-e2e queued on 000c61b55. Base feature/marlow-replan-base b231f7593 (S0 + R1 + a1-retry + A3 + A8 + A4 + A2 + A5, all Opus PASS, 264/264). G-A6 merged into the base 00d90d254 (clean, 314/314; j14-g-a6-merge-report.md). Opus check FIX x2 (j14-g-a6-check.md): station 16 line must name the cage ladder; A26-style trap retry in a6Ticks.ts -> cloud brief j14-g-a6-fix1 DONE 15c50fd28; pickup agent merging g-a6-fix1 + a2-rows (+ r2 per its brief) into the base -> j14-pickup-report.md (missing / PARTIAL = rerun), then a fresh Opus recheck. Light tests (CTLIGHT_VARIANT=replan + built) time out at 120 s on a loaded desktop (hook timeout hard-coded tests/ctcourseLight.test.ts:61): run on a quiet machine; A6 e2e walk pending PC run. Docs owed DONE 6bc3d0a21 on feature/marlow-replan (j14-docs-owed-report.md; office stair 1.2 vs 1.3 m left as polish A30). Cloud DONE: j14-r2 8c6f7f259, j14-a2-rows 685f4566a (a master merge into the base is still owed before R2's PR; the pickup report lists its conflicts). Sizes A4 1,645, A2 1,697, A5 2,175 -> big-pr or split. Open: a8-office validator ERRs -> G1. Polish: replan ctcourseLight bake-time test on a quiet machine.
- J14 = PR #574 MERGED (2026-10-26 ~18:54, dark; e2e-ctcourse:5, :7, :8 quarantined to 2026-10-29). #596 (first three walk fixes) shipped in train 134. Triage 2 (quar-triage-2.md): four more TEST ONLY stops (A1 client door item race, A5 / A6 per-player step lines, A7 tech2 look timing) -> PR #610 (fix, feature/marlow-walkfix-2, head 2359a51ca, Sonnet PASS posted; worktree C:/NightShift/Mobile-Coop-marlow-walkfix-2, node_modules junction to -validator-port-c2). walkfix2 run on 2359a51ca 0/3 (logs C:/NightShift/scratch/marlow/walkfix2-logs/): three more TEST ONLY stops (quar-triage-3.md: A6 anchor path, A2 re-plan revive spot, A8 console guards back after the retry) -> fixed on #610 head 2c2b972bc (walkfix3-report.md), Sonnet PASS posted; laptop request walkfix3 (e2e-ctcourse:5,7,8, --fix) filed ~22:30. Green -> lift the quarantine; a new stop -> Opus triage 4 (laptop log via Test Runner: logs/<set>/ on origin/laptop-queue). Worktree upstream now origin/feature/marlow-walkfix-2.
- J12 #530 MERGED.
- J21 guard-cap: C1 / C2 gated on coop4 #317 + gm-flip #375 on master (docs/guard-cap/STATE.md on origin/feature/guard-cap).
- `fix` label on any fix PR (Michael ~10:12). `checker` posting: send head + report to the orchestrator, it posts (auto mode blocks self-posting).
- #591 (marlow-play) and #594 (marlow-play-2) MERGED. Worktrees -marlow-play / -marlow-play-2 have node_modules junctions: delete the junction before any forced worktree remove.
- Kit wiring: Player K0 = PR #599 (API: addKitSpot, onKitDone, KIT_BUILT; ids deadweight, dropCatch, chimneyPair, swingPass, plankBridge; Player order K5a plank, K1, K3/K4, K2). Base feature/marlow-kit-base db7ef88fd (#594 + #599 merged). Cloud brief marlow-kit-wire DONE d3e2e747b, Opus PASS (kit-wire-check.md); lead merged #608 into it and moved a5-swing to A5_SWING_BAR.z (c377f4e65, checker posted) = DRAFT PR #612 (stacked on #599 + #608; ready when both are on master). Head 5f6b70b31: client kit reset on a kit station retry (Player K5b ask; mirrorKitRetry in courseMode.ts mirrorApply), Opus PASS kit-wire-check-2.md, checker posted. Player K5b plank = PR #622 (on #601 / #599); spot a2-plank matches. Player K1 Deadweight = PR #653 (on #599): A4 spot matches, kitDone tolerates repeat passes (credit once), no #612 change. Player K3 Chimney Pair (feature/coop-kit-k3): A5 station 11 marks moved to z 32.3 / 33.7 (1.4 m, inside the 1.5 m join reach) on #612 head d4e5113ed (unit, STATIONS.md, e2e ST11 pins), checker posted. Player K4 Swing Pass = PR #658: A5 spot matches; #612 head 8d24db1f2 pins the anchor brace spots clear (tight: hoarding z 42.1, drums 43.9); asked Player to fix the rider step passing through the plates hoarding (move code). Worktree C:/NightShift/Mobile-Coop-marlow-kit-wire (local branch check/marlow-kit-wire, push HEAD:feature/marlow-kit-wire). Tell Player: A4 spot passes the grille door id as text (K1 must compare the same). Geometry owed before each move ships (else a soft-lock in /preview/), desktop slice with a validator pass, not cloud (brief A7): Q1 A2 plank landing slot (before plank), Q2 A5 swing landing (before K4), Q3 A5 chimney east face (looks); options in the brief "Q1-Q3". Q1-Q3 DONE on feature/marlow-kit-geo 3ad76f361 (geo-report.md: Q1 raised barrier panel the board slides under + vault, Q2 swing bar z 43.0, Q3 not needed; tsc clean, 148 unit, validator unchanged 2 ERR / 78 WARN). = PR #608 (fix, stacked on #594), Sonnet PASS posted; Player told (K5b ray past x 69.04).
- Player Build builds the kit moves (Plank Bridge, Deadweight, Chimney Pair, Swing Pass, Drop Catch) with a kitMoves list flag; it sends each kit id + done API; Marlow wires kitMoveOn (courseState.ts:152-154) + the station kit field and turns the stand-in off. Stand-in table: play-blockers.md "Co-op stand-ins".
- Boot 2026-10-26 ~22:55 (new account): fix freeze over (#553 #567 #571 merged); #608 MERGED. J13 #520 / #564 / #566 stay parked (prototype mode: no tooling). Kit wiring waits on Player #599 / #622.
- Michael walked the re-plan two-player (4.119 item 1) PASS: "the objectives are a bit confusing ... lights were blinding on epic". Told the orchestrator: full yard with the five kit stations ~30 Oct (plank ~28 Oct). PR #627 (fix, feature/marlow-lines, worktree C:/NightShift/Mobile-Coop-marlow-lines): 77 step lines plainer (lines-report.md) + `lampBeams: false` on the ctcourse theme (Sector Ops' trace; branch feature/marlow-epic-beams merged in). Head 2b45a2b99 (master merged for an A5 / A6 walk conflict, quarantine lift, tests/volLightsWiring.test.ts:37 Marlow beams off), checker posted; waits on CI + affected-e2e. Walk-card line sent to the orchestrator ~04:00. GPU look unchecked.
- 2026-10-27 ~04:00 after the 03:50 reset: #612 shows CONFLICTING on GitHub but merges master cleanly here: re-check once #599 lands. Guard-cap still gated (#317, #375 open).
- J13 polish = PR #649 (feature/route-runs-holdrestart, worktree C:/NightShift/Mobile-Coop-route-runs-holdrestart). Opus check FIX 1 (rr-holdrestart-check.md: restart during course.onLockedDoor lost) fixed by the lead on head 3688ab8b5 (+1 test, fails on the old code; seams 23/23), checker posted. Laptop alone set route-run-selftest-course filed on 3688ab8b5. Polish (check): follower split-leg and pair placement-settle tests; drill log hold time after a cut.
- #610 + #632 MERGED; walkfix4 2/2 green. Quarantine on e2e-ctcourse:5/7/8 LIFTED on #627 (scripts/e2e-quarantine.json, backlog entry removed).
- J13: #564 and #566 (contains #520) MERGED; #520 closed. Polish for #520 before a Marlow gate run: a restart during a ladder / drop / stub hold is missed; #564 level-measure output mixing + absolute graph paths.
- #612 MERGED (kit stations on master, dark). Was: READY 2026-10-27 (K0 on master via #631): master merged on head 0b3dd3794 (conflicts: A2 row, STATIONS row 16), kit-on lines shortened to the #627 style, kit-off test pins follow master; replan 361/361; checker posted (lead re-verify on kit-wire-check-2). Waits on CI + affected-e2e. Player K stack now targets master: #601 K5a, #653 K1, #656 K3, #658 K4, #622 K5b (on #601).
- #627 and #649 MERGED. ~07:45 (orchestrator: up to 2 agents): route-runs R9 (Opus, real co-op boost / ladder moves; brief rr-r9-brief.md, worktree C:/NightShift/Mobile-Coop-route-runs-r9-new, branch feature/route-runs-r9, report rr-r9-report.md) RUNNING (no commits yet at the ~07:50 save); R8 docs DONE = PR #674 (feature/route-runs-r8 9b5da3544, lead review checker posted; LD 14 (2) / 15 = approved Q7 rule; testing-tools budget 720 -> 780 in doc-lint.json, flagged to the orchestrator in the body). Missing / PARTIAL report = rerun from the brief. R7 waits on Guard AI G1 (src/ai/detectionCause.ts not on master). Plan copy: C:/NightShift/scratch/marlow/route-runs-PLAN.md (from origin/feature/route-runs-2).
- SAVE ~07:50 2026-10-27 (meter 83%, reset 08:50): at most 1 agent (R9). Every other worktree pushed.
- R9 DONE = PR #675 (big-pr, feature/route-runs-r9 8e4ad2cbe, rr-r9-report.md: real coop_boost / human_ladder, 243/243). Laptop alone set route-run-selftest-coop filed. Opus check FIX 1 (rr-r9-check.md: the course selftest fixture needed expect.coop "stub") fixed by the lead on head 45848794b (+ guard test, bites on the old fixture; 90/90), checker posted. R8 docs follow-up: list R9 limit constants + the coop stub setting in testing-tools "Route-runs" (on #674 or after). Old yard graph docs/marlow-final/graph/ctcourse.json mislabels 2 throws as coop_boost (re-plan graph fine).
- #674 MERGED (with budget 780). Orchestrator ask: guide moved to docs/systems/route-runs.md (owner Marlow Build) = PR #680 (feature/route-runs-docs-move 584f47c6d, testing-tools 720 / budget 720, LD pointers, INDEX row), checker posted. #675 laptop coop selftest 1/1 green.
- 2026-10-27 ~14:00 after the 13:50 reset (1 agent; weekly meter 83%, save at ~92% weekly): #675 MERGED (R9 on master). Gate dry run on master 03a82e58d (gate-dry.log): every Marlow re-plan run UNPLANNABLE (no floor cell on a1-walltop / a5-walltop / a6-pit, 10 links without a point, a7 / a8 split legs with no solo link back). Gate graph = PR #710 (feature/marlow-gate-graph 84f3dfb8c; gate-graph-report.md): graph map -> ctcourseReplan (it named the OLD yard), walk points from station marks, a7-cage objective, plan.mjs split-starts-once fix (+ test, 245/245). full and A8-loud plan; A8-high still UNPLANNABLE (split entered by a co-op boost: bigger planner change, open). Sonnet checker RUNNING (gate-graph-check.md). Laptop gate run route-run-marlow-replan filed on 84f3dfb8c.
Next: #710 checker -> post; gate run result -> dead stops = triage, none = REPORT to the orchestrator for Michael's walk card; A8-high planner change (split forked from a co-op boost) as its own slice; #680 to a train, then R9 constants in docs/systems/route-runs.md; (alone: serve scripts/route-run.mjs http://127.0.0.1:4189/ docs/marlow-replan/graph.json --players 2; check flags with --help first); Player kit PRs land -> check each station on /preview/; Michael walk card for the kit stations when all five are on master.
```
