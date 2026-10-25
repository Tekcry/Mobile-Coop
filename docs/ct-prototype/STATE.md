# CT core feel job - state (resume point)

Updated 2026-10-20 17:10 Sydney. The CT prototype job is superseded by the anim-rework job on the same branch (Michael 13:30: "Can you ignore CT movement references"): its resume point is docs/archive/anim-rework/STATE.md. This file keeps the CT history (slices A to F, G1-G8, PRs #31 / #32 / #34 merged as 4.10.0 / 4.11.0 / 4.13.0).

## Resume
New local session, Opus, medium effort. Paste:
```
CT Core Build: RESUME. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/ct-prototype/RULES.md and docs/ct-prototype/STATE.md, then carry on from STATE "Next". CT Core has first claim on the desktop lock (ask Sector Ops to hand over); when the desktop is busy, push and send named logic suites with the exact commit to "Night Shift | Character Build" (laptop). Before any heavy run (npm ci / build / npm test / npm run check / e2e / anim sheets), check C:/NightShift/heavy.lock and wait while it exists; write your own line while you run and delete it after. Report to "Night Shift | Orchestrator". No em dashes.
```
Job plan: `FEEL-PLAN.md`. Decisions: `DECISIONS.md` (job) and `docs/DECISIONS.md` G179-G183. Log of every slice:
`LOG.md`. Polish list (not worked on until Michael says): `POLISH.md`.

## Rules that bind now (details in RULES.md)
- Current goal (master CLAUDE.md): a fully playable 2-player co-op training level, pure CT except Michael's decisions;
  no refining before Michael playtests; checkers block only on broken / unplayable work.
- Report to **"Night Shift | Orchestrator"**: when a slice starts, finishes (with /ct/ pushed), a PR opens, Michael is
  needed, or you are blocked. Only it edits `docs/ROADMAP.md`; it forwards Michael's answers. Don't hold for Michael's
  playtest between slices (orchestrator, 2026-10-19): his notes come through the orchestrator and fold into the next
  slice.
- **Heavy slot** on the desktop (`C:\NightShift\heavy.lock`, shared with the orchestrator and Sector Ops Build): npm ci,
  build, `npm test`, `npm run check`, e2e, anim sheets and any subagent running them. Typecheck, lint and one or two
  small vitest files are light. Never kill another session's process; ask Michael.
- Per slice: implementer (Sonnet medium, from a brief saved in this folder; Opus if network-sync-heavy or stuck),
  independent read-only check (Sonnet), at most 1 fix round, `npm run check`, then e2e on port 4193, one suite at a
  time: `E2E_PORT=4193 E2E_SUITE_TIMEOUT=900 node scripts/run-e2e.mjs --serial <suites>`. Test tier after PR #15:
  e2e:quick + e2e-ctcourse, plus e2e-coop and e2e-netmove when src/net, src/player or src/game change. Commit after
  the off-limits check, push feature/ct-prototype, then `git push origin feature/ct-prototype:ct-movement` (/ct/).
- **Character Build** (laptop) owns the waits in e2e-ctcourse, e2e-coop, e2e-netmove and e2e-net-lib (untilSim). Do
  not edit those four scripts; tell the orchestrator first if e2e-ctcourse content must change. Since #17 (4.6.5) a
  solo e2e-ctcourse failure is a ct-prototype regression to fix in the slice (orchestrator, 2026-10-19).
- Versions (G183): master sets the version in each PR; never bump package.json here. The next PR to master is a minor
  step.

## Done today (2026-10-19)
- **Slice F** (980a9695, 637d41d5 and the verify commit, `F-REPORT.md`, sheets `shots/f/`): shoulder always right
  holstered, crouched ADS camera follows the body (`aimCrouchShare` 0.68), crouch idle kneels, corner lean from the
  edge with a camera slide (0.55 s), climb-up knees then stand, rifle draw raises with its travel (0.45 s, G103), pad
  D-pad migration (`padV`). Check green (1798); e2e tier green; check PASS.
- **Slice A** (e9fd03c6, `A-PLAYTEST2.md`): speeds re-spaced from the old speed 2 (D-pad sets them; stick full push from
  0.9), ADS look 0.3, corner peek side in the camera frame, wall side becomes the shoulder and the last swap is saved as
  the default shoulder, swap flick +13 -> +4 cm, wall entry reach 0.5 m, own footsteps follow the noise radius,
  NOISE_QUIET stand 1.65 / crouch 1.9.
- **Master merged** (bccc96cf: anim-cleanup #12, phone-launch #13, menu #11) and wall-entry test teleports moved 0.85
  -> 0.75 m in e2e-netmove, e2e-mouse, e2e-stealth-ai, anim-audit, anim-sheet (1cb88756).
- **Scanner rule** (fd963a1c): partner never started = both reset, no cost ('alone'); late or abandoned = 10 HP.
- **Slices B+C** (763a6d0c, `BC-BRIEF.md`, `BC-ANIM.md`, sheets `shots/bc/`): ADS framing the same standing and
  crouched; chest takes 0.75 of the aim pitch and more yaw; stock closer, elbows tucked; pistol reach pulled in; stance
  half-width capped at 1.1 hip half-widths; crouched armed push-out halved; pelvis drop released slower while walking
  (bob). Independent check: no blockers. Check green (1751 unit tests); smoke, e2e-anim, e2e-move, e2e-weapons-carry,
  e2e-pad, e2e-ctcourse passed (implementer's run).
- **Master merged** twice: 2b8179af (#15 process audit, #16 menu; took #15's e2e-mouse / e2e-pad, 0.75 m standoff
  re-applied to e2e-pad's WALL_HARNESS) and 82c8c6cb (#17 co-op test fix, 4.6.5).
- **Slices D+E** (0f91b0f0, `DE-BRIEF.md`, `DE-ANIM.md`, sheets `shots/de/`): grip held on the gun through draw /
  holster, rifle path lowered; ledge shimmy hands +-0.24 with 9 cm lift and 8 cm arc; drainpipe knee pole up, planted
  foot lift capped; ledge climb-up 1.1 s in three phases with a knee plant (team climb-ups keep `CLIMB_UP_TEAM`).
  Independent check blocked on a drainpipe regression (new tie rule froze limbs with all-positive offsets); fix round 1
  fixed it, plus the travel flag and the team clip. Check green (1753 tests); solo e2e-anim, e2e-clip,
  e2e-ct-warehouse, e2e-netmove, e2e-ctcourse (647 s, station 2 ledge passes), e2e-coop, e2e-menus pass.
- **Slice D2b** (e5fc5870, Michael: shimmy about 0.7 m/s): `ATTACH.ledge.speed` 0.7; ledge hands +-0.26, 0.28 s
  reaches one at a time (about 1.8 a second per hand), `leadTime` / `alternate` on ledges only, first reach after a
  grab at double pace. e2e-traverse shimmy grip reach 3.3 -> 1.6 cm (limit kept at 3); e2e-traverse reads the speed
  from the table. Independent check PASS. Check green (1753); solo e2e-traverse, e2e-clip, e2e-ctcourse (649 s),
  e2e-netmove, e2e-coop pass.

## Next
0. **Resume from docs/archive/anim-rework/STATE.md** (its fenced resume prompt). The CT walk rounds (G8) stopped at round 3b
   (288585e7); their keyed-clip pipeline is the base for the anim-rework clips. Parked: park/ct-h1-wip (local, unverified).
1. **Overnight footage job** (Michael 23:15 / 23:20, verbatim in DECISIONS.md; lifts the no-refining rule for movement
   only; both machines at full power, the desktop lock ours all night, long logic suites to Character Build at
   E2E_JOBS=2). Order: (a) **catalogue** all 90 clips in `pc/ct-work/` (64 from 2026-10-17, of which 62 are in
   `docs/archive/locomotion/research/ct-footage-catalogue.md`: check those against the footage; 26 new
   `clip_13570_20261019_*`, 6-77 s, 16 min): mp4s are in `pc/ct-work/clips/` (`scripts/ct-ref/convert-clips.sh`), contact
   sheets next; report to the orchestrator. (b) **audit** our movement against the footage (animations, camera angles and
   follow, speeds, timing, transitions; measured, with numbers); report. (c) **slices** closing the biggest visible gaps
   first (legs, ADS upper body, shimmy, drainpipe, pistol aim, camera), each with the usual loop and onto /ct/; report
   after each. (d) the **hold-A action menu** (CT: hold A opens it, pick an option, one returns to the game with no
   action; find it in the footage) as its own slice. Unattended: assumed decisions as A-numbers. Do not open the PR.
   Footage files stay in `pc/` (gitignored); only docs and small sheets are committed.
   **Progress (13:30):** #31 4.10.0, #32 4.11.0, #34 4.13.0 merged. G8 (Michael: "Yes, keyframed clips", "Tight pose
   matching"): keyed walk (hand-set keys, `scripts/anim-keys/keys/walk.json`, baked headless in Blender, `src/anim/clips/
   keyed/walk.ts`), rounds 1-3b, plan `G8-PLAN.md`, measurements `G8-WALK.md`, sheets `shots/g8/`; door-peek remote feet
   parity fixed (e4d85253). Head 288585e7 on /ct/; laptop asked for netmove / coop / ctcourse. Waiting for Michael: walk good
   enough, or another round on the contact knee (33 vs 56 deg)? Then jog, run, crouch walk, crouch idle, knee hand the
   same way (matched camera, per-phase measured targets, own keys, overlay checks). H1 parked on park/ct-h1-wip (the walk
   head-travel part is superseded by G8; the crouch-run roll may still apply). Not yet in a PR: G8 commits since 4.13.0.
   **Michael 23:55 (via the orchestrator):** everything in one build on master by morning: at 04:30 merge origin/master and
   feature/course-ready, full `npm run e2e` on the PR head, update `PR-BODY.md`, `gh pr create`, message the orchestrator
   by 06:00 (no version bump). After that, slices go to /ct/ only, not into the PR.
2. **Slice F done** (2026-10-19 23:45, `F-REPORT.md`): F1-F7 built, check green, e2e tier green (laptop: ctcourse,
   coop, netmove on 637d41d5), sheets in `shots/f/`, independent check PASS. On /ct/. Polish in POLISH.md.
3. Master 4.7.2 merged at 8882261b (#22 traverse kick, #23 build sha). Earlier: master 4.7.0 merged (7d0310cc: #21 Sector Ops, protocol 24; a wire change here takes 25): check green (desktop);
   laptop runner smoke, e2e-ctcourse, e2e-coop, e2e-netmove, e2e-traverse all pass. e2e-traverse "a tap kicks the
   grate in" is a master flake (Character Build, feature/traverse-kick): ignore it.
   PR prep done (fcfc433c, master 4.6.8 merged at 75b789ab): CHANGELOG "Unreleased - ct-prototype" covers A to D2b,
   TESTING.md "Playtest 2 changes", docs/systems movement / input-and-loop / audio / world-and-characters, and
   `PR-BODY.md` (draft). After Michael's notes and their slice: full `npm run e2e` on the PR head (`E2E_JOBS=2`,
   nothing else running), fill the e2e line in PR-BODY.md, then
   `gh pr create --base master --head feature/ct-prototype --body-file docs/ct-prototype/PR-BODY.md` when the
   orchestrator says.
4. Later, not now: goggle surround redesign, weapon wheel restyle (bigger, not just boxes, original), menu items.
   Menu notes are the "Menu Notes Build" session's (feature/menu-notes): stay out of src/ui and the menu hero.
5. Protocol: Sector Ops took co-op protocol 24; whoever merges to master second takes the next number (no wire
   change here so far).

## Open items to watch (from slices A, B+C, D+E, D2b)
- e2e-pad "stick speeds 2/4/5" known flaky, same on the clean head.
- D2b: the shimmy sheets' camera hides the left hand (move it about 1.5 m along the lip in traverse-shots.mjs to show
  the alternation); a hand clamped at the lip end falls through to the other hand (untested).
- D+E: rifle draw clearance -1.5 cm vs the -2 cm e2e-clip limit; rifle holster hand still about chin height mid
  travel; climb-up hands let go as the knee comes on, not after; drainpipe hands at chest height (judge live); check a
  team boost climb-up on /ct/.
- Partly judged in B+C: chest pitch spread (sheets are level shots), legs in turns (turnFollow landing limit loosened
  -0.35 -> -0.5, "prototype: revisit"), crouch vs CT footage, bob not measured in cm. Crouched aim keeps the standing
  pivot height: check it under low ceilings / crouch-only gaps (the casts still clamp the camera).
- Corner peek direction and swap feel not verified by eye. Remotes still see the weapon in the right hand on the left
  shoulder (no aim side on the wire; F1a stub).
- e2e-netmove "stacked on one wall" (0.62 m along, 0.41 m apart) fails alone: wall-clock lag, with Character Build.
- e2e-ctcourse needs the 900 s suite cap on SwiftShader; it is ours since #17 (passes solo; timed out once at station 7
  with the sim at 5 fps under load).
- Corner-takedown loops in e2e-wall / e2e-pad skip a guard spawn the level moved more than 0.5 m (appeared with the
  0.5 m reach; root cause not found).

## Michael's answers so far (DECISIONS.md)
- Playtest 2 plan: "Yes, go" (slices A, B+C, D+E; menu and visual items later).
- Walkthrough (2026-10-19, via the orchestrator): wheel stays LB hold; no lethal / non-lethal switch (LT / RT enough);
  gun drawn, A reloads (kept); scanners: no cost when the partner never started, 10 HP for late or abandoned (built).

## Known issues worth remembering
- T1 possible bugs: ledge-grab / ledge "Hang" / rappel world prompts read empty; keyboard Space then hold E does not
  start a vent unscrew in the harness.
- e2e-kestrel and e2e-camera-bounds level U pre-existing.
- Throw, hang-down and rope have no bespoke animations; goggle looks need a GPU review.
