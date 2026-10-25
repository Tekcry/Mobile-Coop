# Locomotion run - rules (branch feature/ct-locomotion)

Condensed from BRIEF.md sections 2-4. The brief wins if they differ.

## Resume
1. Read CLAUDE.md, this file, then STATE.md. Read BRIEF.md after any resume or compaction.
2. Read only the current step file (`steps/NN-name.md`) and the line ranges it lists.
3. Ignore the feature/kestrel line in CLAUDE.md and the 'Every session' steps 2-4.

## Authority
DECISIONS.md (D1-D8, then ASSUMED) > docs/design-bible.md (1.13, Section 5.17 holds D1-D8) > PLAN.md > other docs > code.

## Decisions in one line each (full text: DECISIONS.md)
- D1 (as changed by M21): pad first, then keyboard and mouse; desktop only. Touch is retired (no touch work; e2e-touch report-only). e2e-pad and e2e-mouse cover every verb.
- D2: no bobble. Pelvis p-p: crouch 2.5 cm, walk 4, run 6, sprint 8; one low / one high per step. Head travel <= pelvis, pitch / roll <= 2 deg. Walk sway <= 3 cm. Camera follows the smoothed capsule, vertical osc <= 0.5 cm, landing: one damped dip. Sway settles <= 0.2 s. Idle breathing <= 1 cm. All gears, both stances, flat / stairs / slopes, 60 and 120 Hz, local and remote. Final values frozen in config with unit tests.
- D3: First Playable S3a / S3b absorbed. D4 (as changed by M21): desktop budgets (performance.md, the RTX 4090 laptop) and the per-character animation budget (remotes too) hold; no phone budgets. D6: one final review.
- D5: the modern layer (13 items, batches noted). Never motion matching, captured data, root motion driving control, stamina, player ragdoll.
- D7: full remap (pad, KBM) with conflicts and reset; hold / toggle for aim, crouch, back-to-wall, sprint, grab; custom difficulty sliders (perception speed, aim, alarm tolerance), host's applies in co-op; persisted through src/save.
- D9: at a back-to-wall edge, lean-out and peek use the open side (left edge: pistol left hand, rifle left shoulder, camera follows), switched inside the 0.2-0.3 s draw / lean via the Inertializer; exposure from the real mirrored pose; WALL_SUB leftHand from the edge side.
- D10: at a low-wall end (crouched), aim toward the end = crouched lean-out past the end (D9 rules), head below the wall top; mid-wall or stick up / away = rise over the top; crouched peek around the end; networked as a WALL_SUB bit or lean field.
- D8: every new state / verb / clip has a MoveState mode and remotes pose from it. Committed moves are host-approved with a shared start time. Health, medkits, drawn state and weapon are host-authoritative. Vision, camera, rumble, remap, hold / toggle are local only. D5 runs on remotes from MoveState + velocity, no extra bandwidth. Capsule separation, shoulder turn, team-mate look-at, muzzle discipline, two-player wall stacking, team moves get D5 + contact IK. Each new state adds an e2e-netmove case. Rubber-banding or pose error over the limits fails the step.

## Hard rules (CLAUDE.md holds)
- Code-built animation only; Babylon only via src/core/babylon.ts.
- No hot-path allocation; hyp2 / hyp3, never Math.hypot.
- Gameplay never reads graphics state.
- Single player never imports src/net statically.
- Saves only through src/save; never localStorage. Save-shape change: bump SAVE_VERSION, migration, test with a literal old save.
- No Splinter Cell IP, no real gun brands.
- Never edit src/editor/**, src/world/maps/kestrel*, src/security/**, docs/kestrel/** (merge conflicts only). Kestrel-owned failures go to REVIEW.md, not fixed.
- Software GL (cloud): never set E2E_GPU=1; never claim perf, visual or contact-sheet results from it. On Michael's PC (M6, below) GPU checks are allowed and expected.
- Perf trend: `node scripts/perf-trend.mjs` at baseline and each block end; >25% rise in sim or anim time vs this machine's baseline (PC baseline in STATE.md): fix before moving on.
- Michael-level choices: pick the best fit to bible + D1-D8, log "ASSUMED - for review" in DECISIONS.md with alternatives.
- 3 failed fix rounds: Blocked in STATE.md with evidence, move on, retry once at block end.
- Scope guard: a block over 2x its planned steps stops; the rest goes to REVIEW.md.
- No secrets, tokens or network dependencies in the game.

## No hangs, low tokens
- Never run npm run dev, preview servers or watch modes. Unit tests: `npm test`.
- Every shell command has a timeout. The full `npm run e2e` runs in the background; never poll with sleep loops.
- Logs: tail -40 or grep. Source: grep, then line ranges.
- Same error twice with no progress: stop and report.
- Subagent budget: about 60 tool calls per step; over budget, return done / left.
- Models (Michael, 2026-10-13, from step 06): every subagent uses opus, implementers and checkers, all blocks. Only one code-changing agent at a time; about 60 tool calls per subagent. (Steps 01-05 used sonnet implementers.)

## Step loop
Implement (subagent, no commit) -> check (fresh subagent: diff, re-run checks, anim-audit local + remote, bible + D1-D8, PC-PASS items, PASS or FAIL list) -> up to 3 fix rounds -> commit "locomotion NN: <summary>", push, update LOG, STATE, AUDIT, CHANGELOG, TESTING, docs/systems (coop.md for network changes). Block end: full `npm run e2e` + perf trend.

## ASSUMED decisions from step files
A6-A48 are already logged in DECISIONS.md. Do not re-log them; a new assumption takes the next free number after the highest in DECISIONS.md.

## Speed (user instruction, 2026-10-13, overrides the step loop in BRIEF section 6 where they differ)
- Implementers run lint, unit tests, build and only the e2e suites their step file names (plus e2e-netmove / e2e-coop when they touch a movement state or src/net). The checker runs the full `npm run e2e:quick`.
- Small Block A steps are batched: 02-04 run as one implement-and-check cycle (one commit per step is not required; the commit names every step it covers).
- (Cloud VM, 4 cores: `E2E_JOBS=2`.) On the PC run-e2e's default jobs apply. A timing failure that passes on a serial rerun is logged as flaky, not fixed.
- Block end also merges origin/feature/kestrel into this branch (after the full e2e and perf trend), resolving conflicts per BRIEF 7.1, then reruns `npm run check` and `npm run e2e:quick`. Kestrel-owned failures go to REVIEW-NOTES.md.
- Known pre-existing failures need no proof: e2e-editor, e2e-kestrel and e2e-camera-bounds level U (kestrel-owned, REVIEW-NOTES); tests/kestrelMap.test.ts now passes. Checkers never build worktrees or old copies to prove a failure is pre-existing; if a new failure appears outside the step's files, report it with the log line and move on.
- anim-audit `--compare`: a remote gated regression counts only if it reproduces on one rerun (same rule as e2e flakes; A39 gate noise). Local regressions count at once (local is deterministic).

## On Michael's PC (M6, 2026-10-15; overrides the cloud rules above where they differ)
- Location: only C:\NightShift\Mobile-Coop-locomotion (worktree), branch feature/ct-locomotion. Never touch C:\NightShift\Mobile-Coop (feature/training-bunker), Mobile-Coop-kestrel or Mobile-Coop-music.
- Branch guard before every git command that writes (every subagent too): `cd /c/NightShift/Mobile-Coop-locomotion && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-locomotion && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-locomotion"`. Push only with `git push origin feature/ct-locomotion`.
- Bash (Git Bash) for scripts, always inside the worktree. `E2E_PORT=4189` on every e2e, perf, perf-trend, anim-audit, shot and anim-sheet run (other sessions use 4173 / 4179).
- GPU: `E2E_GPU=1` for perf.mjs, anim-sheet.mjs, shot.mjs and the visual suites. Re-baseline perf-trend and the anim audit on this PC (STATE.md). Block ends also run `perf.mjs --budget` and `perf.mjs --phone --budget` against docs/systems/performance.md.
- Each step's checker runs that step's GPU items itself (contact sheets local and remote; perf when the step touches anim, camera, vfx or render). An opus checker reads the sheets with the Read tool and judges them against bible 5.12.1, 5.12.2 and D2, D5, D8-D11. PC-PASS.md keeps only items that need Michael's eyes or a phone.
- Full e2e: run_in_background and wait for the notification. Every shell command has a timeout.
- Order: PC1 GPU catch-up (PC-PASS 01-14), steps 15-19, 20b, Block C end (step 20 bot partner dropped, M12), play-check checklist, the single pause for Michael, then 21-34 unattended.
- Keep docs/locomotion/OWNER-NOTES.md current: project knowledge lives in git, never only in Claude memory.

## On the secondary desktop (M7, 2026-10-15; overrides M6 where they differ)
- Same folder, branch, branch guard, E2E_PORT=4189 and M6 rules. GPU visual checks (contact sheets, visual suites, anim-sheet, shot, anim audit) run here with `E2E_GPU=1`.
- Never run `perf.mjs --budget` (any profile) here and never claim a budget pass: record each budget item "pending target laptop" in PC-PASS.md section 0. Perf trend only, against the desktop baseline in STATE.md (>25% rise: fix).
- M8: this desktop GPU has no ray tracing (the target laptop has it). Ray-traced checks (e2e-desktop "ray traced + TAAU + Panini" with E2E_GPU=1) are not run or fixed here; they are PC-PASS section 0 item L5.
- Pauses: the play-check pause after the Block C end (M6), then "Ready for the Block D laptop check" after step 32, then "Ready for the target laptop pass" before step 34. Each waits for "Locomotion: go".

## Port 4189 (and 4191, M10) (M9, Michael, 2026-10-15: hard rule for the orchestrator and every agent, verbatim in every agent prompt)
Only one agent uses port 4189 at a time. Never use `npx vite preview`, `npm run preview` or a bare `&` server start.
1. Free the port (before starting a server, before any run-e2e / anim-audit / perf-trend / perf run, and before you finish):
   `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
2. Start a server only for shot.mjs / anim-sheet.mjs / perf.mjs / single suites, as a background Bash task:
   `cd /c/NightShift/Mobile-Coop-locomotion && node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1`
   then `URL=http://127.0.0.1:4189/`. run-e2e, anim-audit and perf-trend start their own: do not start one for them.
3. Check it is free: `netstat -ano | grep ":4189 .*LISTENING"` prints nothing.
4. When done: step 1 again, then step 3. "Port 4189 is already in use" means step 1 was skipped: run it and retry once.

## Speed on the desktop (M10, Michael, 2026-10-15; overrides "Speed" above where they differ)
- Implementers run lint, unit tests, `npm run build` and only the single suites their step file names (plus e2e-netmove / e2e-coop when they touch a movement state or src/net), each once. Never `npm run e2e:quick` or the full `npm run e2e` in an implementer. A second run only to judge a flake (A39).
- The checker runs `npm run e2e:quick` exactly once per round, with `E2E_JOBS=3`. The full `npm run e2e` (block ends) also uses `E2E_JOBS=3`. A failure counts as flaky only if the suite is already on the known-flaky list, or it passes in 2 solo reruns; a newly flaky suite is logged in LOG.md with the failing line and both rerun results. Otherwise it is a fail.
- Two ports, one per job type, both under the M9 commands (replace 4189 with 4191 for the second):
  - 4191: software-GL logic e2e only (`E2E_PORT=4191 E2E_JOBS=3 npm run e2e:quick`, the full e2e), never with E2E_GPU=1.
  - 4189: GPU work (anim-audit, anim-sheet, shot, perf-trend, E2E_GPU=1 single suites).
  - Inside one checker, while the 4191 quick suite runs in the background, only deterministic GPU work runs on 4189: anim-sheet, shot and `anim-audit --local`. perf-trend, `anim-audit --remote` (real-time rows) and E2E_GPU=1 netmove / coop wait until the quick suite has finished (load skews their numbers). Free and check each port with its own number.
- Not overlapped: a step's checker and the next step's implementer. They share the working tree and dist/ (the checker's diff and served build would change under it). One code-changing agent at a time is unchanged.

## Desktop tuning (M11, Michael, 2026-10-15; overrides M10 where they differ)
- Quick and full e2e: `E2E_JOBS=2` (default on this 8-thread desktop), port 4191, run alone: no GPU work overlaps it. GPU items (audit local and remote, sheets, shots, perf-trend) run on 4189 after it finishes. (M10's JOBS=3 plus overlap caused extra load-only failures, each costing 2 solo reruns.)
- Implementer budget: about 100 tool calls on the big steps (16 arsenal, 18 remap, 20 bot partner); about 60 elsewhere. Checkers stay about 60.
- Implementers grep scripts/ and tests/ for assertions on any default they change (settings, HUD, bindings, carry counts) and update them before handing over.
