# CT core feel job - state (resume point)

Updated 2026-10-19 15:55 Sydney (clean point: slice A, master merge, scanner rule and slices B+C all on /ct/ at 763a6d0c).

## Resume
New local session, Opus, medium effort. Paste:
```
CT Core Build: RESUME. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Orchestrator", "Machines"), docs/ct-prototype/RULES.md and docs/ct-prototype/STATE.md, then carry on from STATE "Next". Before any heavy run (npm ci / build / npm test / npm run check / e2e / anim sheets), check C:/NightShift/heavy.lock and wait while it exists; write your own line while you run and delete it after. Report to "Night Shift | Orchestrator". No em dashes.
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
  not edit those four scripts; tell the orchestrator first if e2e-ctcourse content must change.
- Versions (G183): master sets the version in each PR; never bump package.json here. The next PR to master is a minor
  step.

## Done today (2026-10-19)
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

## Next
1. Merge origin/master (now has PR #15 process audit 4.6.3, 4.6.4 and menu #16). PR #15 trims e2e-mouse and e2e-pad
   to input mapping: take master's versions, then re-apply the 0.75 m wall standoff only where a wall entry is left.
   Check, e2e:quick + e2e-ctcourse.
2. Slices **D+E** (write `DE-BRIEF.md` from `PLAYTEST-2.md`, re-check each against anim-cleanup first; Michael played
   without it): rifle and pistol holstering ("hand moves up weird with rifle, and pistol floats into position");
   hanging shimmy with wider, slower hands; vertical pipe climb (legs swing upside down, hands backwards); ledge
   climb-up onto the knees, not floating.
3. Then report to the orchestrator and wait for Michael's playtest-2 re-test notes.
4. Later, not now: goggle surround redesign, weapon wheel restyle (bigger, not just boxes, original), menu items.

## Open items to watch (from slices A, B+C)
- Partly judged in B+C: chest pitch spread (sheets are level shots), legs in turns (turnFollow landing limit loosened
  -0.35 -> -0.5, "prototype: revisit"), crouch vs CT footage, bob not measured in cm. Crouched aim keeps the standing
  pivot height: check it under low ceilings / crouch-only gaps (the casts still clamp the camera).
- Corner peek direction and swap feel not verified by eye. Remotes still see the weapon in the right hand on the left
  shoulder (no aim side on the wire; F1a stub).
- e2e-netmove "stacked on one wall" (0.62 m along, 0.41 m apart) fails alone: wall-clock lag, with Character Build.
- e2e-ctcourse needs the 900 s suite cap on SwiftShader; its station 2 wait is Character Build's.
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
