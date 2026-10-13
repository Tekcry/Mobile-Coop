# Locomotion run - rules (branch feature/ct-locomotion)

Condensed from BRIEF.md sections 2-4. The brief wins if they differ.

## Resume
1. Read CLAUDE.md, this file, then STATE.md. Read BRIEF.md after any resume or compaction.
2. Read only the current step file (`steps/NN-name.md`) and the line ranges it lists.
3. Ignore the feature/kestrel line in CLAUDE.md and the 'Every session' steps 2-4.

## Authority
DECISIONS.md (D1-D8, then ASSUMED) > docs/design-bible.md (1.13, Section 5.17 holds D1-D8) > PLAN.md > other docs > code.

## Decisions in one line each (full text: DECISIONS.md)
- D1: pad first, then keyboard and mouse; touch is a basic fallback (move, look, aim, fire / elbow, crouch, jump, one context button, vision toggle). e2e-pad and e2e-mouse cover every verb; e2e-touch stays green.
- D2: no bobble. Pelvis p-p: crouch 2.5 cm, walk 4, run 6, sprint 8; one low / one high per step. Head travel <= pelvis, pitch / roll <= 2 deg. Walk sway <= 3 cm. Camera follows the smoothed capsule, vertical osc <= 0.5 cm, landing: one damped dip. Sway settles <= 0.2 s. Idle breathing <= 1 cm. All gears, both stances, flat / stairs / slopes, 60 and 120 Hz, local and remote. Final values frozen in config with unit tests.
- D3: First Playable S3a / S3b absorbed. D4: phone budgets and 0.04 ms per character anim (remotes too) hold. D6: one final review.
- D5: the modern layer (13 items, batches noted). Never motion matching, captured data, root motion driving control, stamina, player ragdoll.
- D7: full remap (pad, KBM) with conflicts and reset; hold / toggle for aim, crouch, back-to-wall, sprint, grab; custom difficulty sliders (perception speed, aim, alarm tolerance), host's applies in co-op; persisted through src/save.
- D8: every new state / verb / clip has a MoveState mode and remotes pose from it. Committed moves are host-approved with a shared start time. Health, medkits, drawn state and weapon are host-authoritative. Vision, camera, rumble, remap, hold / toggle are local only. D5 runs on remotes from MoveState + velocity, no extra bandwidth. Capsule separation, shoulder turn, team-mate look-at, muzzle discipline, two-player wall stacking, team moves get D5 + contact IK. Each new state adds an e2e-netmove case. Rubber-banding or pose error over the limits fails the step.

## Hard rules (CLAUDE.md holds)
- Code-built animation only; Babylon only via src/core/babylon.ts.
- No hot-path allocation; hyp2 / hyp3, never Math.hypot.
- Gameplay never reads graphics state.
- Single player never imports src/net statically.
- Saves only through src/save; never localStorage. Save-shape change: bump SAVE_VERSION, migration, test with a literal old save.
- No Splinter Cell IP, no real gun brands.
- Never edit src/editor/**, src/world/maps/kestrel*, src/security/**, docs/kestrel/** (merge conflicts only). Kestrel-owned failures go to REVIEW.md, not fixed.
- Cloud is software GL: never set E2E_GPU=1; never claim perf, visual or contact-sheet results; list them in PC-PASS.md with command and limit. The audit harness decides animation pass / fail in the cloud.
- Perf trend: `node scripts/perf.mjs` (no --budget) at baseline and each block end; >25% rise in sim or anim time vs this VM baseline: fix before moving on.
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
- Implementers: sonnet. Checkers: sonnet for Blocks A, C (not back-to-wall, vision) and E; opus for B, D, back-to-wall, vision and any network step. Only one code-changing agent at a time.

## Step loop
Implement (subagent, no commit) -> check (fresh subagent: diff, re-run checks, anim-audit local + remote, bible + D1-D8, PC-PASS items, PASS or FAIL list) -> up to 3 fix rounds -> commit "locomotion NN: <summary>", push, update LOG, STATE, AUDIT, CHANGELOG, TESTING, docs/systems (coop.md for network changes). Block end: full `npm run e2e` + perf trend.

## ASSUMED decisions from step files
A6-A32 are already logged in DECISIONS.md. Do not re-log them; a new assumption takes the next free number after the highest in DECISIONS.md.

## Speed (user instruction, 2026-10-13, overrides the step loop in BRIEF section 6 where they differ)
- Implementers run lint, unit tests, build and only the e2e suites their step file names (plus e2e-netmove / e2e-coop when they touch a movement state or src/net). The checker runs the full `npm run e2e:quick`.
- Small Block A steps are batched: 02-04 run as one implement-and-check cycle (one commit per step is not required; the commit names every step it covers).
- This VM has 4 cores, so run-e2e defaults to 1 job. Run e2e with `E2E_JOBS=2`; a timing failure that passes on a serial rerun is logged as flaky, not fixed.
- Block end also merges origin/feature/kestrel into this branch (after the full e2e and perf trend), resolving conflicts per BRIEF 7.1, then reruns `npm run check` and `npm run e2e:quick`. Kestrel-owned failures go to REVIEW-NOTES.md.
- Known pre-existing failures need no proof: tests/kestrelMap.test.ts (kestrel-owned). Checkers never build worktrees or old copies to prove a failure is pre-existing; if a new failure appears outside the step's files, report it with the log line and move on.
