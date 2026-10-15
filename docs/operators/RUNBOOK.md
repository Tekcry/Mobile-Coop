# Operators run - runbook (every step, its model, effort and prompt)

How the run works (DECISIONS D15, "Chained small steps"):
- Each step is one fresh Claude Code session in `C:\NightShift\Mobile-Coop-operators`, scoped by its file in
  `steps/`. The plan and the order are in `PLAN.md`.
- The run is unattended: when a step has passed its checks and pushed, it starts the next step's session itself
  (RULES.md "Chaining"). Michael reviews the finished characters at the end (step 17's page).
- If a chained start is refused, or Michael wants to start a step by hand: open a new session in the folder above,
  pick the model and effort below, paste the step's prompt.
- Steps 1-3 are done (research, foundation, base bodies and the garment method test).

| Step | What | Model | Effort | Step file |
| --- | --- | --- | --- | --- |
| 1 | Research and the technique decision | Opus 5.5 | High | done |
| 2 | Rules and pipeline foundation | Opus 5.5 | High | done |
| 3 | Base bodies, art direction, garment method test | Opus 5.5 | High | done |
| 03b | Wren combat shirt fit, and the automatic checks | Opus 5.5 | High | `steps/03b-shirt-fit-and-checks.md` |
| 04 | Operator Lab and the contact sheet script | Sonnet 5.5 | Medium | `steps/04-lab-and-sheets.md` |
| 05 | Wren: base layer and trousers | Opus 5.5 | High | `steps/05-wren-base-trousers.md` |
| 06 | Wren: gloves and boots | Opus 5.5 | High | `steps/06-wren-hands-feet.md` |
| 07 | Wren: hood, optic, mount and comms head kit | Opus 5.5 | High | `steps/07-wren-head.md` |
| 08 | Wren: plate carrier, harness and belt | Opus 5.5 | High | `steps/08-wren-carrier-harness.md` |
| 09 | Wren: thigh holster, pack, cables and strobe | Opus 5.5 | High | `steps/09-wren-holster-pack-comms.md` |
| 10 | Wren: baked maps, LODs, glTF and costs | Opus 5.5 | High | `steps/10-wren-bake-lod-export.md` |
| 11 | Wren: full render set and self-review pass | Opus 5.5 | High | `steps/11-wren-final.md` |
| 12 | Moth: shirt with rolled sleeves, base layer, trousers | Opus 5.5 | High | `steps/12-moth-garments.md` |
| 13 | Moth: gloves, boots, hood and round optic | Opus 5.5 | High | `steps/13-moth-hands-feet-head.md` |
| 14 | Moth: climbing harness, chest rig, hardware, pack, comms | Opus 5.5 | High | `steps/14-moth-climbing-kit.md` |
| 15 | Moth: baked maps, LODs, glTF and costs | Opus 5.5 | High | `steps/15-moth-bake-lod-export.md` |
| 16 | Moth: full render set and self-review pass | Opus 5.5 | High | `steps/16-moth-final.md` |
| 17 | Shared sheets and the review page | Sonnet 5.5 | Medium | `steps/17-shared-and-review.md` |
| 18 | Final spec and integration plan (the run ends) | Opus 5.5 | High | `steps/18-final-spec.md` |

## Step 03b - Wren combat shirt fit, and the automatic checks (Opus 5.5, High effort)

```
Operators run, step 03b of docs/operators/RUNBOOK.md: Wren combat shirt fit, and the automatic checks. Follow docs/operators/steps/03b-shirt-fit-and-checks.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 04 - Operator Lab and the contact sheet script (Sonnet 5.5, Medium effort)

```
Operators run, step 04 of docs/operators/RUNBOOK.md: Operator Lab and the contact sheet script. Follow docs/operators/steps/04-lab-and-sheets.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 05 - Wren: base layer and trousers (Opus 5.5, High effort)

```
Operators run, step 05 of docs/operators/RUNBOOK.md: Wren: base layer and trousers. Follow docs/operators/steps/05-wren-base-trousers.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 06 - Wren: gloves and boots (Opus 5.5, High effort)

```
Operators run, step 06 of docs/operators/RUNBOOK.md: Wren: gloves and boots. Follow docs/operators/steps/06-wren-hands-feet.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 07 - Wren: hood, optic, mount and comms head kit (Opus 5.5, High effort)

```
Operators run, step 07 of docs/operators/RUNBOOK.md: Wren: hood, optic, mount and comms head kit. Follow docs/operators/steps/07-wren-head.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 08 - Wren: plate carrier, harness and belt (Opus 5.5, High effort)

```
Operators run, step 08 of docs/operators/RUNBOOK.md: Wren: plate carrier, harness and belt. Follow docs/operators/steps/08-wren-carrier-harness.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 09 - Wren: thigh holster, pack, cables and strobe (Opus 5.5, High effort)

```
Operators run, step 09 of docs/operators/RUNBOOK.md: Wren: thigh holster, pack, cables and strobe. Follow docs/operators/steps/09-wren-holster-pack-comms.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 10 - Wren: baked maps, LODs, glTF and costs (Opus 5.5, High effort)

```
Operators run, step 10 of docs/operators/RUNBOOK.md: Wren: baked maps, LODs, glTF and costs. Follow docs/operators/steps/10-wren-bake-lod-export.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 11 - Wren: full render set and self-review pass (Opus 5.5, High effort)

```
Operators run, step 11 of docs/operators/RUNBOOK.md: Wren: full render set and self-review pass. Follow docs/operators/steps/11-wren-final.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 12 - Moth: shirt with rolled sleeves, base layer, trousers (Opus 5.5, High effort)

```
Operators run, step 12 of docs/operators/RUNBOOK.md: Moth: shirt with rolled sleeves, base layer, trousers. Follow docs/operators/steps/12-moth-garments.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 13 - Moth: gloves, boots, hood and round optic (Opus 5.5, High effort)

```
Operators run, step 13 of docs/operators/RUNBOOK.md: Moth: gloves, boots, hood and round optic. Follow docs/operators/steps/13-moth-hands-feet-head.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 14 - Moth: climbing harness, chest rig, hardware, pack, comms (Opus 5.5, High effort)

```
Operators run, step 14 of docs/operators/RUNBOOK.md: Moth: climbing harness, chest rig, hardware, pack, comms. Follow docs/operators/steps/14-moth-climbing-kit.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 15 - Moth: baked maps, LODs, glTF and costs (Opus 5.5, High effort)

```
Operators run, step 15 of docs/operators/RUNBOOK.md: Moth: baked maps, LODs, glTF and costs. Follow docs/operators/steps/15-moth-bake-lod-export.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 16 - Moth: full render set and self-review pass (Opus 5.5, High effort)

```
Operators run, step 16 of docs/operators/RUNBOOK.md: Moth: full render set and self-review pass. Follow docs/operators/steps/16-moth-final.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 17 - Shared sheets and the review page (Sonnet 5.5, Medium effort)

```
Operators run, step 17 of docs/operators/RUNBOOK.md: Shared sheets and the review page. Follow docs/operators/steps/17-shared-and-review.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```

## Step 18 - Final spec and integration plan (the run ends) (Opus 5.5, High effort)

```
Operators run, step 18 of docs/operators/RUNBOOK.md: Final spec and integration plan (the run ends). Follow docs/operators/steps/18-final-spec.md.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. Read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md, docs/operators/PLAN.md and this step's file in docs/operators/steps/, then only the files that step file lists (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191; Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. The run is unattended (DECISIONS D15): decide within the step file, ART-DIRECTION.md and SPEC; record any judgement call in DECISIONS.md as an assumed decision (A-numbered) and carry on. Stop and ask Michael (multiple-choice UI) only before installing software or downloading a file, or when a hard constraint blocks the step. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. Finish: the step file's checks pass, npm run check passes, LOG.md and STATE.md updated, commit, push; send Michael the step's renders or screenshots with SendUserFile (status proactive, display render) and a three-line progress note; then start the next step's session as docs/operators/RULES.md "Chaining" says and end your turn.
```
