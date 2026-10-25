Menu UI run: START.

You are the orchestrator of an unattended implementation run for the Night Shift menu redesign (sessions 2-4).
Michael gives input only at the three pauses below: never use AskUserQuestion between them. Run step by step, then
open a PR to master. Never merge it.

## 0. Branch and brief
- Precondition: `feature/ct-locomotion` is merged into master (check `git log origin/master --oneline | grep -m1
  "locomotion"` and that `src/ui/screens/controlsScreen.ts` has the step 18 Pad tab). If it is not merged, stop and
  say so in one line.
- Work in the worktree `C:\NightShift\Mobile-Coop-menu-ui`. `git fetch origin`, then create `feature/menu-ui` from
  `origin/master` (or check it out if it exists) and merge `origin/feature/menu-ui-spec` into it (docs only).
  Never touch dev, master, feature/ct-locomotion or other worktrees. Ports: 4195-4199 only (`E2E_PORT=4195`).
- This file is the brief. RULES.md condenses it; the brief wins if they differ.

## 1. Goal
Build the menu redesign in docs/menu-ui/SPEC.md (v1.0) with decisions MD1-MD20 in DECISIONS.md. The prototype
(`docs/menu-ui/prototype/index.html`, open it in Chrome) shows the intended look and behaviour; the spec wins over it.
- Block A (session 2), steps 01-05: font and tokens, the `MenuScreen` template, legend and context panel, input parity
  in FocusNav, title and main menu, settings and remap. Pause A.
- Block B (session 3), steps 06-10: dialogs, toasts and the on-screen keyboard, missions and briefing, loadout, co-op,
  the field terminal with the pause blur, results, controller disconnect. Pause B.
- Block C (session 4), steps 11-13: the shot director, the cinematic menu stage setups and title silhouette, perf and
  the finish. Pause C (final review).
- Leave out: HUD restyle (glyph component only), new gameplay, Phase 4 content (map, intel, radio log data), parked
  systems beyond what the shared template restyles for free (bible 6), save-shape changes.

## 2. Michael's decisions
DECISIONS.md MD1-MD20 are Michael's (or approved with his brief). Bible changes they imply go to
docs/menu-ui/BIBLE-PROPOSALS.md; only MD1 edits CLAUDE.md (step 01, one line).

## 3. Rules
- Authority: Michael > DECISIONS.md > bible > SPEC.md > PLAN.md and step files > other docs > code.
- CLAUDE.md hard rules apply (no runtime network, Babylon only through `src/core/babylon.ts`, no localStorage for
  saves, `src/net` only by dynamic import, strict TS, hot paths do not allocate, gameplay never reads graphics state).
- Read the bible only by line range. Read only the files the step file lists, plus what `grep` finds for its symbols.
- At any choice Michael would make: pick what best fits the spec, the bible and MD1-MD20, log it in DECISIONS.md under
  "Run assumptions" as "A<n> ASSUMED - for review" with the alternatives, and carry on.
- GPU and perf checks run on Michael's PC only (`E2E_GPU=1`); this run is on that PC. If it ever runs in the cloud,
  mark GPU items "pending PC run" in PC-PASS.md and never claim a perf or visual result from SwiftShader.
- Perf trend: `scripts/perf-trend.mjs` after each block; a >25 % rise is a fix.
- Blocked: after 3 failed fix rounds, log the step Blocked in STATE.md with evidence and move to the next step that
  does not depend on it. Scope guard: a block over twice its planned steps stops for Michael.

## 4. No hangs, low tokens
- No dev servers or watch modes in the foreground; every command has a timeout; the full e2e runs in the background
  and is read with `tail -40` / `grep`. The same error twice: stop and rethink.
- About 60 tool calls per subagent. The orchestrator's context holds only STATE.md, the current step file and
  subagent conclusions. One code-changing agent at a time. All agents Opus 5.5.

## 5. Documentation
- Step 0 adds one line under the CLAUDE.md title on `feature/menu-ui`: "On branch feature/menu-ui, follow
  docs/archive/menu-ui/RULES.md and resume from docs/menu-ui/STATE.md (brief: docs/menu-ui/BRIEF.md)." Remove it in the finish.
- STATE.md under 120 lines: Current, Next, Blocked, pauses, baselines. LOG.md: one entry per step.
- Step files are standalone and at most 80 lines; the plan may split a step that grows past about 20 decisions.
- Every step updates CHANGELOG.md (one minor version for the whole run, set in step 01), TESTING.md (phone and
  desktop checklist lines), docs/systems/ui.md and input-and-loop.md where touched, and docs/archive/progress.md at block ends.

## 6. Method
- Step 0: environment check (`npm ci` if needed, `npm run check`, `npm run build && npm run e2e:quick`), record the
  baselines in STATE.md, run `E2E_GPU=1 node scripts/perf.mjs --budget` once for the perf baseline.
- Then for each step NN in PLAN.md:
  1. Implement: one subagent; its prompt is the step file plus "Read CLAUDE.md and docs/archive/menu-ui/RULES.md first. Do
     only this step. Run npm run check and npm run e2e:quick before finishing (plus the suites the step names).
     Return: files changed, check results with numbers, anything left undone. Do not commit."
  2. Check: a fresh subagent that did not implement reads the step file, SPEC.md sections it names and the diff,
     re-runs the checks, runs the SPEC section 9 parity checklist on every screen the step touched (keyboard, mouse,
     pad through the e2e harness), compares with the prototype, cites file:line or script output for every claim, and
     returns PASS or FAIL with a numbered fix list.
  3. On FAIL: a new implementer gets the fix list. At most 3 rounds, then Blocked.
  4. On PASS: commit "menu-ui NN: <summary>" with the attribution line, push, update LOG, STATE and the docs above.
  5. Block end: the full `npm run e2e` (background), perf trend, then the pause.
- Pauses: write the pause into STATE.md, give Michael a summary of 15 lines or fewer with a numbered check list for
  his PC (keyboard, mouse, a real pad, the phone look), and stop. He replies "Menu UI: go" with or without notes;
  notes become M-decisions in DECISIONS.md and step-file changes.

## 7. Finish (after step 13 and pause C)
1. Merge origin/master into the branch if it moved; re-run check and the full e2e.
2. REVIEW.md: the run's ASSUMED decisions as questions with the recommended option first; the parity checklist
   results per screen; a 5-line phone smoke test.
3. PR `feature/menu-ui` to master: "Do not merge until Michael's review is done." Never merge.
4. Final message in 15 lines or fewer with the next prompt.
