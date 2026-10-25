# Operators run - subagent preamble (every implementer, fixer and checker)

The orchestrator session starts every subagent with "Read docs/operators/steps/AGENT-PREAMBLE.md first", then the
role, the step, the handover and (fix rounds) the fix list. Modelled on docs/archive/locomotion/steps/PC1-preamble.md.

## Location and branch
- Work only in C:\NightShift\Mobile-Coop-operators (Git Bash: /c/NightShift/Mobile-Coop-operators). Never read,
  write or run anything in C:\NightShift\Mobile-Coop or any other worktree (Mobile-Coop-kestrel, -locomotion,
  -music, -menu-ui, -menu-mock): other sessions use them.
- Before any git command, run the branch guard: `cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators"`.
- Never commit, push, checkout, stash, reset or merge: the orchestrator commits. Never send files to Michael.

## Read
- CLAUDE.md, docs/operators/RULES.md ("Hard rules", "Unattended run", "Step loop"), STATE.md, the step file in
  docs/operators/steps/, then only the files the step file lists (grep and line ranges, not whole large files).
  DECISIONS.md by grep only. Ignore the step file's "Finish" and anything about chaining or starting sessions.

## Environment (Michael's PC, RTX 4090)
- GPU renders: `E2E_GPU=1 E2E_PORT=4189`. Never claim a visual result that was not rendered on the hardware GPU.
- Blender 5.2.2 LTS, headless, from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe via
  scripts/operators/blender.mjs.
- Pipeline: `npm run operators:build [-- wren|moth] [--render]`, then `npm run operators:check`. Lab and sheets:
  `npm run operators`, `E2E_GPU=1 E2E_PORT=4189 npm run operators:sheet -- <id> [--only ...]`; both serve their own
  on 4189, never start a server for them. New garments and kit items go in GARMENTS in scripts/operators/export-gltf.mjs.
- Never install software or download a file: do everything else and record it OPEN in the LOG.md draft with exactly
  what is needed and why.

## NO DESKTOP TAKEOVER (Michael, 2026-10-18)
Never use Claude in Chrome, the browser pane or any computer-use / mouse / keyboard tool; never open a browser window or
tab on Michael's desktop. Browser work is headless only (scripts/e2e-lib.mjs, never HEADED). Spawned processes use
`windowsHide: true` so no terminal windows open.

## PORT 4189 HARD RULE (verbatim, every agent)
Master G94 (since the 4.0.0 merge, step 11c): GPU work (E2E_GPU=1: Lab, sheets, renders, GPU perf) uses port 4189;
software-GL e2e suites use 4191 and never E2E_GPU=1. Free whichever port you used, the same way, before you return.
`npm run operators` ends in `vite preview`, which master's CLAUDE.md bans for agents: never run it; use operators:sheet.
Only one agent uses port 4189 at a time. Never use `npx vite preview`, `npm run preview` or a bare `&` server start.
1. Free the port before any Lab, sheet or preview run, and before you finish:
   `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
2. Check it is free: `netstat -ano | grep ":4189 .*LISTENING"` prints nothing.
3. "Port 4189 is already in use" means step 1 was skipped: run it and retry once.

## No hangs, low tokens
- Every shell command has a timeout. Anything that may pass 10 minutes (`operators:build --render`, `npm run check`,
  sheets) runs in the background; wait for its notification. No dev server, no watch mode, no sleep polling loops.
- A Blender run with no new output for 15 minutes: kill that PID only (never every blender.exe: Michael's Blender GUI
  may be open), note it, change approach.
- Same error twice with no progress: stop and return done / left. Logs: tail -40 or grep, never whole.
- Budget: implementers about 100 tool calls; fix rounds and checkers about 60. Over budget: stop and return done / left.

## Hard rules
- Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion
  touches. No Splinter Cell IP, no three-lens goggle, no real brands. Every external file (CC0) in docs/art-credits.md.
  Babylon only through src/core/babylon.ts; strict TS; pure logic in Babylon-free modules with Vitest tests.
- Never weaken a check to pass it. Judgement calls go in DECISIONS.md as assumed decisions (next free A-number).

## Role: implementer (first pass)
Do the step, render on the GPU, make the step file's checks, `npm run operators:check` and `npm run check` pass.
Draft the "## Step NN - <title>" record in LOG.md (built, numbers, open items) and rewrite STATE.md short (now: the
next step, key facts, open questions). If the tree already holds uncommitted work for this step (a stopped agent),
review it and continue from it. Free port 4189. Return: done / left, the check result lines, the absolute paths of
this step's render PNGs, open items, and a handover of 150 words or fewer (new files, commands, numbers, gotchas).

## Role: fixer (fix round N of 3)
Fix exactly the items in the fix list (`steps/NN-fixes-rN.md`); do not redo finished work (git status, git diff HEAD).
Re-render what changed, re-run the checks, update the LOG.md draft. Return as the implementer.

## Role: checker (fresh, Opus High; you did not build it)
Edit nothing except your fix list file.
1. Read the step file's Checks, ART-DIRECTION.md (its render check, by grep) and SPEC.md Section 1 (by line range).
2. Inspect the uncommitted work: git status -s, git diff HEAD --stat, then the diffs that matter. Fail on: edits to
   forbidden files, any loosened threshold in scripts/operators/check.mjs or tests, real brands or Splinter Cell
   shapes, new external files missing from docs/art-credits.md, new items missing from GARMENTS, no LOG.md draft.
3. Re-run `npm run operators:check` and `npm run check` yourself.
4. Read every render PNG of the step with the Read tool. Confirm they are newer than HEAD and were made with
   E2E_GPU=1. Judge each against the step's Checks, the ART-DIRECTION render check and SPEC 1; cite file and view for
   each verdict. Look hard for clipping, floating parts, stretched or swimming textures, missing seams / stitches /
   hardware the step asks for, wrong materials (plastic sheen on fabric), generic or copied silhouettes.
5. A FAIL is anything the step's Checks, ART-DIRECTION or SPEC 1 require that is missing or wrong; taste beyond them
   is a note, not a fail.
Return PASS, or FAIL with a numbered fix list written to `docs/operators/steps/NN-fixes-rN.md` (each item: what is
wrong, where (file:line or render + view), what done looks like). Free port 4189 before you return.
