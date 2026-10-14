Locomotion run: START.

You are the orchestrator of an unattended cloud run. Michael gives no input until the final review: never ask him anything and never use AskUserQuestion. Run from start to finish, then open a PR to master. Never merge it.

# 0. Branch and brief
- git fetch origin. If origin/feature/ct-locomotion exists: git checkout feature/ct-locomotion && git pull. Otherwise: git checkout -b feature/ct-locomotion origin/feature/kestrel, then git push -u origin feature/ct-locomotion.
- Never commit to feature/kestrel, ct-movement, dev or master. On this branch, ignore the feature/kestrel line in CLAUDE.md; follow docs/locomotion/RULES.md.
- Save this whole message, verbatim, as docs/locomotion/BRIEF.md (the brief). Every session reads it after a resume.

# 1. Goal
Deliver a complete, merge-ready, modern Chaos Theory-inspired movement, animation and player-kit system: bible Phase 3 and Phase 3b, plus decisions D1-D8. Control is instant; the body has weight; the player feels like an elite stealth operative. Every feature works smoothly in solo and in 2-4 player co-op.

Block A - Removals:
- snap cover, cover-to-cover, cover glide and blind fire (src/cover and every caller; enemy cover AI stays, bible 5.3)
- Mark & Execute (bible 5.4 lists the files)
- sonar: every file from `git grep -il sonar src`, with its HUD, input, audio, AI, net and suit hooks
- the regenerating shield (game/health.ts)
- the Ghost / Panther / Assault style tracker and cash; the stealth rating that replaces them is Phase 4, so leave a clean stub
Remove their tests, net messages and docs text. A save-shape change bumps SAVE_VERSION, with a migration and a test that uses a literal old save. Parked ?legacy=1 content must still compile; npm run e2e:legacy is report-only.

Block B - The audit harness:
- scripts/anim-audit.mjs, per bible 5.12.4, measuring the 5.12.2 limits plus D2 and the measurable D5 items (foot slide, overshoot, head stability, pelvis drop on stairs)
- it measures local poses and remote poses (D8)
- baseline numbers recorded in AUDIT.md
- joined to the e2e runner

Block C - Verbs, kit and input (each one networked per D8):
- holstered unless aiming, no hip fire, the elbow strike, ADS spread tuning (bible 5.4, 5.6)
- back-to-wall: slide, corner peek, lean-out aim, SWAT turn, corner takedown (bible 5.3)
- door peek
- thermal and electro vision as post passes; they never change detection; night vision stays as the lighting gain (bible 5.5)
- medkits: health 100, no regeneration, a medkit heals 40 over 1.5 s and damage interrupts it, carry 2 (3 at Rookie), a wall medkit entity placed on test maps only, a HUD health bar (bible 5.13)
- the arsenal: curate the campaign set, give every real-brand gun an original name in data and UI, keep the rest in code unused (bible 5.6)
- input per D1 and D5.12: a binding table for every verb (pad, then keyboard and mouse, then the basic touch scheme) in docs/systems/input-and-loop.md; analog speed with gear snapping; rumble
- D7: full remapping, hold / toggle options and custom difficulty, saved through src/save (never localStorage)
Leave out: loadout kits at the briefing (Phase 4), the multi-tool launcher (Phase 6), and the Phase 5 co-op systems in D8 (only their hooks are built).

Block D - Animation and camera (bible 5.12, all of it, plus D5 and D8):
- first: the dev bot partner (bible 5.9 C20 and the bible 10 Phase 3b row); it is the co-op test partner for every later step
- the seven fix batches, in bible 5.12.4 order, with the D5 items in their stated batches; batch 7 (co-op) includes the D8 avatar-to-avatar work
- the CT camera and collision solver, with D5.13
- quick 180, momentum carry with D5.11, spring layer, drag
- dedicated clips: rappel, fence, brace, back-to-wall, drag
- guard body language, the pose viewer, the known fixes listed in the bible 10 Phase 3b row
- the metrics freeze: the final limits in a config table, with unit tests

Block E - Finish:
- Training rewritten to teach the final verbs, with pad prompts first
- docs, merge prep, the PR (section 7)

# 2. Michael's decisions (2026-10-13)
Apply D1-D8 to docs/design-bible.md as version 1.13, with a changelog line, and copy them into docs/locomotion/DECISIONS.md. They override older bible text. Any other bible change goes to BIBLE-PROPOSALS.md, never into the bible.

D1 Controls:
- The controller is the primary design target, then keyboard and mouse.
- Every verb is designed and tuned on the pad first, and is covered in e2e-pad and e2e-mouse.
- Touch is a basic test and fallback scheme only: move and look, aim, fire (elbow strike while holstered), crouch, jump, one contextual action button (it carries back-to-wall, door peek, takedown, interact and traverse), and the vision toggle. No other touch work.
- Keep e2e-touch passing for that basic scheme. Readability is judged on desktop first.
- This replaces the bible's "touch and controller are equal" text and the Phase 3 touch control scheme spec.

D2 No bobble. Starting limits; the audit may refine them only with cited biomechanics sources; the final values are frozen in config with unit tests:
- Pelvis vertical travel, peak to peak per stride: crouch gears 2.5 cm or less, walk 4 cm, run 6 cm, sprint 8 cm. Exactly one low and one high point per step; no double bounce.
- Head: vertical travel no more than the pelvis; pitch and roll oscillation 2 deg or less.
- Lateral pelvis sway at walk: 3 cm or less.
- Camera: no camera bob. The camera follows the smoothed capsule, never the head or pelvis. Vertical oscillation 0.5 cm or less in steady movement. A landing gets one damped dip and no rebound.
- Weapon and kit sway settle within 0.2 s after a stop, with no secondary wobble. Idle breathing 1 cm or less.
- Measured on every gear, in both stances, on flat floor, stairs and slopes, at 60 and 120 Hz, for local and remote poses.

D3: First Playable steps S3a and S3b are absorbed into this run.

D4: The phone perf budgets stay; nothing may regress them. The 0.04 ms per character animation budget holds, for remotes too.

D5 Modern layer. Control stays instant (bible 5.12.1); weight lives in the body.
1. Speed-scaled gait: stride length, pelvis height, arm swing and forward lean scale with speed; gears read as effort levels, never as playback rate (batch 1).
2. Acceleration and turn lean on the upper body, through a damped spring; the root never overshoots (batch 1).
3. Compression and one damped settle on stops, landings, drops and vault exits (batches 1 and 3).
4. Plant-and-pivot steps on sharp direction changes; stride warping so the feet always match the capsule (batch 1).
5. Exertion breathing after a sprint or climb, chest and shoulders only, cosmetic, no stamina (batch 1).
6. Trained posture: soft knees, a stabilised level head, ready hands while holstered; heel-to-toe foot roll at the stealth gears, matching the noise model (batch 1).
7. Weapon discipline when aiming: the muzzle never sweeps team-mates; low-ready in tight spaces (batch 2).
8. Head and eye look-at toward noises, visible guards, nearby team-mates and the aim point, within neck limits (batch 1; guards in batch 5).
9. Hand contact IK on door frames, corners and ledges; ducking under low geometry; turning sideways through tight gaps (batches 3-4).
10. Full-body IK on stairs and slopes: pelvis drop, feet on treads, spine compensation (batch 1).
11. Momentum-scaled traversal: the same input gives a fast, low vault from a sprint and a careful one from a walk.
12. Pad: analog speed with gear snapping and hysteresis; a bumper or the rocker sets the maximum gear; Gamepad API rumble on landings, takedowns, shots and heavy footfalls.
13. Camera: spring-damper follow of the capsule, slight look-ahead, smooth pull-in near walls, automatic shoulder swap at corners, a small field-of-view change by gear and stance, never a bob.
Never: motion matching or captured data, root motion driving control, stamina penalties, player ragdoll beyond hit reactions.

D6: Michael's per-batch sign-off (bible 5.12.4) is replaced by one final review of the whole run.

D7 Input options:
- Full remapping of every action, for the pad and for keyboard and mouse, with conflict warnings and a reset to defaults.
- Every hold action gets a hold or toggle setting (aim, crouch, back-to-wall, sprint, grab).
- Custom difficulty: separate sliders for guard perception speed, guard aim and alarm tolerance, plus the existing presets. In co-op, the host's difficulty applies.
- Settings persist in IndexedDB through src/save; a save-shape change follows the SAVE_VERSION rule.
- Covered in e2e-pad and e2e-mouse (remap, then play) and in unit tests.

D8 Co-op parity. Every feature in this run works smoothly in 2-4 player co-op, to bible 5.9 C11:
- Networking:
  - Every new or changed movement state, verb and clip has a networked MoveState mode, and remotes pose from it, never from position alone. Back-to-wall, door peek, holster / draw, elbow strike, medkit use, the dedicated clips and drag are included.
  - Committed moves (elbow strike, takedowns, team moves, drag) are host-approved with a shared start time; the host decides interruptions.
  - Health, medkit counts, the drawn / holstered state and the weapon in hand are host-authoritative.
  - Vision modes, the camera, rumble, remapping and hold / toggle stay local and are never sent.
  - The D5 layer runs on remotes from MoveState plus velocity, computed locally, with no extra bandwidth. Remote bodies look as weighty as the local one.
- Avatar-to-avatar interaction:
  - players never interpenetrate (capsule separation)
  - shoulders turn to pass in tight spaces
  - head look-at includes nearby team-mates
  - muzzle discipline avoids team-mates
  - two players can stack on one wall in back-to-wall
  - every existing team move (boost, human ladder, split-jump boost, back-to-back, pull-up, rappel anchor, dual takedown) gets the D5 layer and contact IK, with no clipping between the two bodies
- Hooks for Phase 5, not built now: drag and medkit use accept any target, including a downed team-mate (record it in PLAN.md as a hook). Sync, clutch saves, typed pings, new team moves and team results stay in Phase 5.
- Tests:
  - every new state adds an e2e-netmove case, with the remote pose error under its limit
  - the bot partner exercises every team move and verb
  - one ?net=local 4-player run covers back-to-wall stacking, takedowns, the elbow strike and medkits
  - the anim-audit harness also runs on remote poses
  - rubber-banding, or pose error above the e2e-netmove limits, fails the step

Decisions D9 and D10 (Michael, 2026-10-13, added after the run started):

D9 Open-side weapon at edges:
- At a back-to-wall edge, lean-out aim and peek always use the open side. At a left edge the pistol goes to the left hand (mirrored two-handed grip) and the rifle to the left shoulder; the camera shoulder follows. Right edges are unchanged.
- The switch happens inside the draw or lean-out step (0.2-0.3 s), blended with the Inertializer, never a pop. Mid-wall aim stays on the normal side.
- Body exposure (perception and the light meter) uses the real mirrored pose, so the open-side lean exposes less of the body.
- Network: WALL_SUB leftHand is set from the edge side; remotes pose from it.
- Checks: harness grips < 2 cm and no weapon through the wall on left and right edges for the pistol and the rifle; an exposure test proving the left-edge lean exposes no more body than the right-edge lean; anim-sheet items (PROVISIONAL in the cloud) for left and right edges with both weapons, local and remote.

D10 Aim around low cover:
- At the end of a low wall (crouched), aim with the stick or look toward the end: the body stays crouched and leans out past the end (same rules as the high-wall lean-out, including D9). Aim mid-wall, or with the stick up or away from the end: rise over the top as planned.
- Crouched peek around the end works like the high-wall peek.
- Exposure feeds perception and the light meter from the real pose, so leaning around the side keeps the head below the top of the wall.
- Network: a new WALL_SUB bit or a field on the existing lean, posed on remotes.
- Checks: e2e-wall cases for side lean and over-the-top on a low wall, both edges, pistol and rifle; an e2e-netmove case under 10 cm; a test that the side lean's head height stays below the wall top; anim-sheet items (PROVISIONAL).

D11 Net check (Michael, 2026-10-14, lite): add step 20b net-check after step 20, before the handover.
1. A network conditions simulator in the local / test transport only (never the shipped path): one-way delay, jitter and loss, set by ?netsim=typical or E2E_NETSIM=typical (80 ms RTT, 20 ms jitter, 1% loss).
2. Run e2e-netmove, e2e-coop and e2e-bot once under typical, in REPORT mode (not a gate). Record pose error, pops, and any committed move that failed or stuck, with numbers, in LOG.md and REVIEW.md.
3. Fix only clear breakages (a stuck or lost committed move, a desync of drawn / holstered, health or medkits, a pop over 25 cm). Leave tuning for Phase 5 and list it in BIBLE-PROPOSALS.md.
4. In the handover (STATE.md), add "Play check before step 21": a 10-line checklist for Michael to try every new verb on the pad, solo and with the bot partner (how to start the bot partner, which map, what to try), so his notes can steer Block D.

Proposals only (write them to BIBLE-PROPOSALS.md; do not build): guards undo player changes (relight lamps, check breakers, close doors); room-clearing searches in pairs; a player-facing last-known-position marker; a digital layer (network tap, camera loop, badge clone, remote unlock, footage wipe); subtitled eavesdropping; lockpicking and bypasses with a skill and noise cost; instant checkpoint retry in under 3 s; an after-action route map; adaptive layered music (Phase 2). Give each one a suggested phase and a one-line reason.

# 3. Rules
- Authority: DECISIONS.md > docs/design-bible.md > PLAN.md > other docs > code.
- Read the bible only by line range (grep -n '^#' first): 5.3-5.7, 5.9, 5.12, 5.13, 6, 9, 10, Appendices A-C. Read docs/systems/coop.md by section when a step touches the network.
- Every CLAUDE.md hard rule holds:
  - code-built animation only; Babylon only through src/core/babylon.ts
  - no hot-path allocation; hyp2 / hyp3
  - gameplay never reads graphics state
  - single player never imports src/net statically; co-op code stays behind the dynamic import and flags.coop
  - saves only through src/save, never localStorage
  - no Splinter Cell IP and no real gun brands
- Never edit src/editor/**, src/world/maps/kestrel*, src/security/** or docs/kestrel/**, except to resolve a merge conflict. If tests owned by that work fail after merging origin/feature/kestrel, list them in REVIEW.md as "kestrel-owned, pre-existing" and do not fix them.
- Cloud = software GL only. Never set E2E_GPU=1. Never claim a perf, visual or contact-sheet result; add each to PC-PASS.md with its command and pass limit. Software-GL contact sheets are PROVISIONAL, for pose shape only. In the cloud, the audit harness decides animation pass / fail.
- Perf trend: run node scripts/perf.mjs (no --budget) at the baseline and at the end of each block. A rise of more than 25% in sim or animation time against this VM's own baseline: investigate and fix before moving on. This is a trend only, never a pass claim.
- At any choice Michael would make: pick the option that best fits the bible and D1-D8, log it in DECISIONS.md as "ASSUMED - for review" with the alternatives, and carry on.
- Blocked after 3 fix rounds: log the evidence in STATE.md under Blocked, move to the next independent step, and retry blocked steps once at the end of their block.
- Scope guard: if a block needs more than twice its planned steps, stop adding to it. Defer the rest to REVIEW.md with reasons.
- Never add secrets, tokens or network dependencies to the game.

# 4. No hangs, low tokens (hard rules for you and every subagent)
- Never run npm run dev, preview servers, or any watch mode. Unit tests: npm test (single run).
- Every shell command gets a timeout. Run the full npm run e2e with run_in_background and wait for its notification; never poll with sleep loops.
- Read logs with tail -40 or grep, never whole. Read source files by line range after grep.
- The same error twice in a row with no progress: stop and report it; do not try a third variation.
- Per-step subagent budget: about 60 tool calls. Over budget: stop and return what is done and what is left.
- Your own context holds only STATE.md, the current step file and subagent conclusions. After any context compaction, re-read STATE.md before acting.
- Model use:
  - from step 06 on (Michael, 2026-10-13): every subagent uses opus, implementers and checkers, in all blocks
  - (until step 05: implementers sonnet; checkers sonnet for Blocks A, C (except back-to-wall and vision) and E, opus for Block B, Block D, back-to-wall, vision and every step with a network change; the audit: up to 4 parallel Explore agents on sonnet)
  - only one code-changing agent at a time

# 5. Documentation (the only memory between sessions; keep current)
docs/locomotion/:
- BRIEF.md: this message, verbatim
- RULES.md: sections 2-4, condensed
- PLAN.md: blocks and steps, each with deliverable, files, checks (including its co-op check) and dependencies
- STATE.md: under 120 lines: current step, last commit, done / blocked / pending PC, open ASSUMED decisions, next action
- LOG.md: one short entry per step: what changed, numbers, commit
- DECISIONS.md, AUDIT.md (bible 5.12.4 columns), BIBLE-PROPOSALS.md, PC-PASS.md, REVIEW.md (built at the end)
- steps/NN-name.md: standalone, 80 lines or fewer: model; files and line ranges to read; task with at most about 20 decisions (split if larger); checks (including the D8 checks when the step adds or changes a state); commit message; numbers precomputed with their source lines
Add one line under the title of CLAUDE.md: "On branch feature/ct-locomotion, follow docs/locomotion/RULES.md and resume from docs/locomotion/STATE.md (brief: BRIEF.md)."

# 6. Method
Step 0:
- Check the branch. Run npm ci.
- Check that a browser works: npm run build, then node scripts/run-e2e.mjs --quick --list, then run the smoke suite. If no browser is found: npx playwright install chromium, then retry once. If it still fails: record it as Blocked in STATE.md, commit and push, and stop with a message saying the environment needs network access for the Chromium download.
- Run npm run check as the baseline (record failures as pre-existing). Record the perf trend baseline and the current e2e-netmove pose errors.
- Write BRIEF.md and the other docs, including the BIBLE-PROPOSALS.md entries from section 2. Apply D1-D8 to the bible. Commit and push.

Step 1, the audit (read-only):
- 4 parallel Explore agents:
  (a) src/anim and the rig
  (b) src/player movement, attach, traversal and camera
  (c) cover, takedowns, Mark & Execute, health, the style tracker, and their callers
  (d) sonar and vision, weapons data, input bindings and settings, src/net (MoveState modes, host approval, team moves, remote posing) for everything above
- Each returns inventory rows (item, owner, trigger, duration, contacts, interrupts, networked yes/no with MoveState mode, file:line), every bob source (pelvis, head or camera offsets, procedural sway, springs), and where each D5, D7 and D8 item would hook in.
- One checker agent spot-checks 20% of the rows against the code and drops any row without a valid file:line.
- Write AUDIT.md. No code changes.

Step 2:
- Write PLAN.md and all step files, in the order A, B, C, D, E (reorder only for a real dependency the audit found).
- The bot partner opens Block D; any Block C step that needs it for its co-op check records that check as "rerun after the bot partner", and the bot partner step reruns those checks. Training and the PR are always last.

Then loop over each step:
1. Implement: one subagent; its prompt is the step file plus: "Read CLAUDE.md and docs/locomotion/RULES.md first. Do only this step. Run npm run check and npm run e2e:quick before finishing; if the step touches a movement state or src/net, also run e2e-netmove and e2e-coop. Return: files changed, check results with numbers, anything left undone. Do not commit."
2. Check: a fresh subagent that did not implement. It:
   - reads the step file and git diff
   - re-runs the checks itself, plus scripts/anim-audit.mjs once it exists (local and remote poses)
   - compares against the bible and D1-D8, including co-op parity, and confirms no earlier step regressed
   - adds GPU and visual items to PC-PASS.md
   - cites file:line or script output for every claim
   - returns PASS, or FAIL with a numbered fix list
3. On FAIL: a new implementer gets the fix list. At most 3 rounds, then Blocked.
4. On PASS: commit "locomotion NN: <summary>" with your attribution line, and push. Update LOG.md, STATE.md, AUDIT.md, CHANGELOG.md, TESTING.md and the docs/systems/*.md files touched (coop.md for every network change); delete the text about removed systems; update CLAUDE.md's module map (the cover row).
5. At the end of each block: run the full npm run e2e and the perf trend check. Fix regressions before starting the next block.

# 7. Finish
1. Merge origin/feature/kestrel, then origin/master, into this branch. Resolve conflicts without losing the editor or map work; if a conflict is unclear, keep both behaviours and log it. Run npm run check and the full npm run e2e; fix until green, apart from known-flaky suites and kestrel-owned failures.
2. Versions: two minor versions above the highest version in any merged branch, one for Phase 3 and one for Phase 3b, each with a CHANGELOG.md entry; package.json gets the higher one. In docs/progress.md: Phase 3 and 3b done, GPU checks pending a PC run, First Playable S3a / S3b absorbed, the Phase 5 hooks listed.
3. PC-PASS.md: one ordered checklist. Commands with E2E_GPU=1: perf.mjs --budget, perf.mjs --phone --budget, anim-sheet contact sheets (side / front / ots) for every gear, stance, new verb and D5 item, local and remote, and the vision mode looks. Each item has its pass limit.
4. REVIEW.md, in plain English:
   - what changed, per block
   - every ASSUMED decision as a question, with the recommended option first
   - the bible proposals
   - a numbered desktop checklist (pad first, then keyboard and mouse): movement feel and weight, stops, turns, stairs, back-to-wall, door peek, elbow strike, takedowns, medkits, vision modes, the arsenal, remapping and hold / toggle, custom difficulty, Training
   - a numbered co-op checklist at 2 players (with the bot partner and with two browser tabs, ?net=local): every verb seen from the other player, team moves, avatars passing and stacking, host-approved moves, and a 4-player local run
   - a 5-line phone smoke test
   - blocked, deferred and kestrel-owned items, the Phase 5 hooks, and known issues
5. Open a PR feature/ct-locomotion -> master (gh pr create, or your built-in PR tool). Body: a summary, the REVIEW.md link, "Do not merge until the PC pass and Michael's review are done", and your PR attribution line. Then wait once for the PR checks (20-minute limit) and fix any failure. If you cannot open a PR, write the body to docs/locomotion/PR.md.
6. Final message, 15 lines or fewer: done / blocked / deferred / pending-PC counts, the PR link, the REVIEW.md path, and the next prompts "Locomotion: PC pass" and "Locomotion: feedback".

Begin with Step 0.
