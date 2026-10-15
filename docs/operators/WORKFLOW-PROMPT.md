# Operators run - the workflow prompt (steps 05-18)

Why: a session cannot start another session (found at the end of step 04, 2026-10-16: the app refuses `start_session`
on a turn started by another session). Session chaining (RULES.md "Chaining") therefore stops after one step. Michael
chose (2026-10-16) to run the remaining steps as one workflow: one agent per step, each with fresh context, chained by
the workflow script. Agents are not sessions, so the refusal does not apply.

How: open a new session in `C:\NightShift\Mobile-Coop-operators`, Opus 5.5, effort High, paste the prompt below. To
resume after a stop, paste it again: it starts from the first step without a "## Step NN" record in LOG.md.

```
Use a workflow to run the operators run, steps 05 to 18, fully automated. I (Michael) am asleep and will not answer anything. Do not start other sessions (the app refuses them); the workflow is the whole chain.

## Before the workflow (you, the orchestrator, keep your own work minimal)
1. Call mcp__ccd_host__request_keep_awake.
2. Confirm `git -C C:\NightShift\Mobile-Coop-operators branch --show-current` prints feature/operators and the tree is clean. Never switch branches in C:\NightShift\Mobile-Coop. If the branch is wrong, STOP.
3. Read only docs/operators/STATE.md and the "## Step NN" headings in docs/operators/LOG.md to find the first step not yet done. Start there. Load the workflow-authoring skill and write the script.

## Workflow design
- Strictly sequential, one step agent at a time (one writer on feature/operators). Each step agent starts with fresh context.
- Steps, model and effort (from docs/operators/PLAN.md; pass both to each agent where the API allows):
  05 Wren base layer and trousers (Opus 5.5, high); 06 Wren gloves and boots (Opus, high); 07 Wren hood, optic, mount and comms head kit (Opus, high); 08 Wren plate carrier, harness and belt (Opus, high); 09 Wren thigh holster, pack, cables and strobe (Opus, high); 10 Wren baked maps, LODs, glTF and costs (Opus, high); 11 Wren full render set and self-review (Opus, high); 12 Moth shirt with rolled sleeves, base layer, trousers (Opus, high); 13 Moth gloves, boots, hood and round optic (Opus, high); 14 Moth climbing harness, chest rig, hardware, pack, comms (Opus, high); 15 Moth baked maps, LODs, glTF and costs (Opus, high); 16 Moth full render set and self-review (Opus, high); 17 Shared sheets and the review page (Sonnet 5.5, medium); 18 Final spec and integration plan (Opus, high; the run ends).
- Each step agent's prompt = the COMMON BRIEF below + "Step NN: <title>. Follow docs/operators/steps/NN-*.md." + the HANDOVER from the previous step (the previous agent's returned JSON, verbatim).
- Each step agent returns JSON only: {step, passed, commit, checks: {operatorsCheck, npmCheck}, renders: [paths], openItems: [..], handover: "<=150 words: facts the next step needs (new files, commands, numbers, gotchas)"}.
- After each step agent: a cheap verifier agent (Sonnet 5.5, low effort) runs `git -C C:\NightShift\Mobile-Coop-operators log -1 --format=%H%n%s`, `git status -sb` (must be clean and not ahead of origin), `npm run operators:check` and `npm run check`, and returns {ok, failures}. If not ok: re-run the same step once with the failures appended to its prompt ("fix these, do not redo finished work"). If still not ok: append the step to docs/operators/LOG.md as OPEN with the evidence, commit and push, and continue with the next step (its handover says what is broken).
- Resumable: if the workflow stops, a re-run resumes from the last completed agent (resumeFromRunId), or from STATE.md.
- At the end, one Sonnet agent writes docs/operators/RUN-SUMMARY.md (per step: passed/open, commit, open items, where the renders are), commits and pushes it, and sends it with SendUserFile (status proactive).

## COMMON BRIEF (give to every step agent verbatim)
You are one step of the Night Shift operators run (building the Wren and Moth operator characters; pre-production only, no game integration). Michael is asleep: decide everything yourself, never wait for an answer.
- Work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Never switch branches; never touch C:\NightShift\Mobile-Coop; never merge into ct-movement, dev or master.
- Read, in this order and nothing more: CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, your step file in docs/operators/steps/, then only the files the step file lists (grep and line ranges, not whole large files). Use DECISIONS.md by grep only. Ignore the "Chaining" and "start the next step" parts of RULES.md and the step file: the workflow chains; you start no sessions.
- Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191 (RTX 4090). Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe via scripts/operators/blender.mjs. Never claim a visual result that was not rendered on the hardware GPU.
- Pipeline: `npm run operators:build [-- wren|moth] [--render]`, then `npm run operators:check` (must pass after every build). Lab and sheets: `npm run operators`, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- <id> [--only ...]`. Add every new garment or kit item to GARMENTS in scripts/operators/export-gltf.mjs so the Lab and the sheets show it. Before starting a server on 4191, kill whatever listens there.
- Decide within the step file, ART-DIRECTION.md and SPEC.md (DECISIONS D15). Record each judgement call in DECISIONS.md as an assumed decision, numbered after the highest A-number in the file. Never weaken a check to pass it.
- Hard rules: do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. No Splinter Cell IP, no three-lens goggle, no real brands. Every external file (CC0) goes in docs/art-credits.md. Babylon only through src/core/babylon.ts; strict TS; pure logic in Babylon-free modules with Vitest tests.
- Never install software or download a file: if the step needs one, do everything else, log it as OPEN in LOG.md with exactly what is needed and why, and add it to "Open questions for Michael" in STATE.md.
- A check that cannot pass after real effort: keep the best result, log it OPEN in LOG.md with the evidence, carry on.
- Finish: the step's checks, `npm run operators:check` and `npm run check` pass; append the step record to docs/operators/LOG.md (built, numbers, open items); rewrite docs/operators/STATE.md short (now: next step, key facts, open questions); commit (message "operators: step NN - <title>", ending with the Co-Authored-By line for your model) and `git push -u origin feature/operators`. Send Michael the step's renders (or screenshots for tooling steps) with SendUserFile (status proactive, display render) and a three-line note: built, passed, open. Then return the JSON result.
```
