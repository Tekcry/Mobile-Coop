# Operators run - runbook (every step, its model and its prompt)

How every step works:
- Each step is one new Claude Code session, opened in the folder `C:\NightShift\Mobile-Coop-operators`.
- Pick the model named in the step, then paste the step's prompt as is.
- Answer the session's questions in the same session.
- When a step finishes it has committed and pushed its work, and it hands you the next prompt. Clear (start a new
  session) before the next step.
- Steps 2-7 build the first round of mockups. You review them in step 7's page. Step 8 repeats until you approve
  both operators. Step 9 writes the final spec.
- Putting the operators into the game happens later, after the locomotion run merges. That is its own run.

| Step | What | Model | You do at the end |
| --- | --- | --- | --- |
| 1 | Research and the technique decision | Opus 5.5 | Done |
| 2 | Rules and pipeline foundation | Opus 5.5 | Approve any downloads it asks for; clear |
| 3 | Base bodies and the first garment test | Opus 5.5 | Look at 3 test renders, answer its question; clear |
| 4 | Operator Lab and the contact sheet script | Sonnet 5.5 | Nothing; clear |
| 5 | Wren: three concepts | Opus 5.5 | Nothing; clear |
| 6 | Moth: three concepts | Opus 5.5 | Nothing; clear |
| 7 | Contact sheets and the review page | Sonnet 5.5 | Review every card on the page; clear |
| 8 | Refine round (repeat until approved) | Opus 5.5 | Review again; clear |
| 9 | Final spec and integration plan | Opus 5.5 | Read the summary; done |

Every prompt starts with the same block, so each session is self-contained:

```
Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.
```

## Step 2 - Rules and pipeline foundation (Opus 5.5)

```
Operators run, step 2 of docs/operators/RUNBOOK.md: rules and pipeline foundation.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. Apply the approved rule text in SPEC Section 7 (bible 5.14, 5.15, 5.16, Section 6, version line 1.15; the CLAUDE.md hard rule; story.md Section 4). Commit.
2. Create docs/art-credits.md (source and licence of every external file; empty table for now).
3. Verify the SPEC 4.2 anthropometry table against ANSUR II (ask me before downloading the public CSVs from openlab.psu.edu/ansur2). Correct SPEC 4.2-4.4 if the real numbers differ.
4. Pipeline skeleton: scripts/operators/ (Python run by Blender headless; a Node launcher that finds the pinned Blender, refuses another version and runs the scripts; fixed seeds), npm run operators:build. A tiny Node script exports each operator's joint positions from src/player/proportions.ts (read only, Wren 1.68 m, Moth 1.78 m, the SPEC 4.4 build mods and the A1-A4 corrections applied in the export, not in proportions.ts) to JSON for the pipeline.
5. The kit as data: a pure Babylon-free module (src/operators/) holding the Wren and Moth kit lists from SPEC 5, with a Vitest validator: every strap has two anchors, every pouch names its contents and closure, every cable has a source, a device and retention points no more than 15 cm apart, every item has a job.
```

## Step 3 - Base bodies and the first garment test (Opus 5.5)

```
Operators run, step 3 of docs/operators/RUNBOOK.md: base bodies and the first garment test.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. The CC0 base body: ask me before downloading the MakeHuman / MPFB base mesh and shape data (CC0 assets only, no GPL code committed). Record source and licence in docs/art-credits.md.
2. A script shapes it to Wren (1.68 m) and Moth (1.78 m) from the step 2 joint JSON and SPEC 4.4 builds, places the game's joints on it, and skins it to them (4 influences), plus visual-only finger and toe bones for the hero level. Bind pose = the game rig's bind pose.
3. The garment method test: one garment only, Wren's combat shirt (SPEC 3.1 and 5.1), built from 2D pattern panels with seam pairs, sewn onto the body by Blender cloth simulation, settled, thickened, with stitch lines along the seams and a ripstop / knit material.
4. Render 3 test images on the GPU (front, 3/4 back, a 0.4 m raking-light close-up of the shoulder and elbow) to docs/operators/mockups/tests/ as WebP, and check them against the SPEC Section 1 standard yourself first.
5. Stop and show me the 3 renders (send them with SendUserFile), say honestly what works and what does not yet, and ask me with the multiple-choice UI whether the method is on the right track before concepts are built on it. Record my answer in DECISIONS.md.
```

## Step 4 - Operator Lab and the contact sheet script (Sonnet 5.5)

```
Operators run, step 4 of docs/operators/RUNBOOK.md: the Operator Lab and the contact sheet script.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do (BRIEF.md Stage 2 items 1-2 are the full list):
1. The Operator Lab: a dev-only standalone page like the Kestrel editor (npm run operators; never in the production bundle; check the build output). It loads the pipeline's glTF operators, links their bones to a CharacterRig built read-only from the existing code (Bone.linkTransformNode), and offers: turntable, free close-up camera, LOD selector (hero / in-game levels / phone), presets (Low / High / Epic / phone look), lighting rigs (neutral studio, raking, the menu scene, Hollowmere night sodium vs moon, darkness with goggle glow only, night vision), the pose list (A-pose, idle, crouch, sneak, aim pistol, aim rifle, Moth's climbing reach) from existing pose data read only, and wireframe / normals / UV / material ID toggles.
2. scripts/operator-sheet.mjs (headless, E2E_GPU=1, E2E_PORT=4191) rendering every sheet in BRIEF Stage 2.2, including the colour-blind strip (deuteranopia / protanopia simulation of the green and amber glows). Test it on the step 3 body and shirt.
3. Babylon only through src/core/babylon.ts; pure logic in Babylon-free modules with Vitest tests.
```

## Step 5 - Wren: three concepts (Opus 5.5)

```
Operators run, step 5 of docs/operators/RUNBOOK.md: Wren, three concepts.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. Three distinct Wren concepts (about 1.68 m, compact ex-military woman, square green goggle housing), Splinter Cell inspired and original (D5, SPEC 2). Each: silhouette idea, full kit from the kit data (SPEC 5.1; the validator passes), materials, a night-adapted palette of desaturated darks (charcoal, dark olive, blue-black, worn black; no pure black), an original square goggle housing and mount, wear per the Lived-in rule.
2. Build them through the pipeline: sewn garments, parametric kit, straps and cables on their anchors and routes, baked maps, hero + in-game LODs + phone LOD, glTF out. Measure each concept's cost per level (triangles, draws, materials, texture MB desktop / phone / hero, bones).
3. Render each with scripts/operator-sheet.mjs into docs/operators/mockups/wren/ (WebP, sensible sizes). Check every close-up against SPEC Section 1 and fix what fails before stopping.
4. Write each concept's design notes and cost table into docs/operators/mockups/wren/CONCEPTS.md.
```

## Step 6 - Moth: three concepts (Opus 5.5)

```
Operators run, step 6 of docs/operators/RUNBOOK.md: Moth, three concepts.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. Three distinct Moth concepts (about 1.78 m, lean ex-steeplejack man, round amber twin lenses, climbing harness and hardware, rolled sleeves over a knit base layer so no skin shows), Splinter Cell inspired and original (D5, SPEC 2). Each: silhouette idea, full kit from the kit data (SPEC 5.2; the validator passes), materials, a night-adapted palette of desaturated darks (no pure black), an original round goggle design and mount, wear (chalk dust, abraded belay loop).
2. Build them through the pipeline as in step 5 (garments, kit, straps, cables, bakes, all LODs, glTF) and measure each concept's cost per level.
3. Render each with scripts/operator-sheet.mjs into docs/operators/mockups/moth/ (WebP). Check every close-up against SPEC Section 1, including the harness, leg loops on the trousers and hardware, and fix what fails before stopping.
4. Write each concept's design notes and cost table into docs/operators/mockups/moth/CONCEPTS.md.
```

## Step 7 - Contact sheets and the review page (Sonnet 5.5)

```
Operators run, step 7 of docs/operators/RUNBOOK.md: the shared sheets and the review page.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. Render the shared sheets into docs/operators/mockups/shared/: both operators side by side, each beside the current operator (before / after), the 20 m darkness identity test, and the colour-blind strip of the goggle glows.
2. Build the review page and publish it as a private claude.ai Artifact: one card per concept (3 Wren, 3 Moth) and per sheet, each with Approve / Reject / Note controls saved with the artifact db capability so they can be read back; clicking a render opens it full size for zooming. Include each concept's design notes and cost table from the CONCEPTS.md files.
3. Write the Artifact URL into docs/operators/STATE.md.
4. Tell me how to review, in plain English: open the link, look at each card, press Approve or Reject, write a Note on anything to change, then come back and start step 8.
```

## Step 8 - Refine round (Opus 5.5; repeat until both operators are approved)

```
Operators run, step 8 of docs/operators/RUNBOOK.md: a refine round.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do:
1. Read my verdicts and notes from the review Artifact (its URL is in STATE.md; read its db). Log this round in DECISIONS.md with my notes quoted.
2. Apply them: drop rejected concepts, change what my notes ask for, keep approved ones as they are. Ask me with the multiple-choice UI only where a note is unclear.
3. Re-render only what changed, check it against SPEC Section 1, and republish the same Artifact (same URL) with the new cards; approved cards stay approved.
4. If both operators now have one approved concept, say so and give me the step 9 prompt; otherwise give me this step 8 prompt again.
```

## Step 9 - Final spec and integration plan (Opus 5.5)

```
Operators run, step 9 of docs/operators/RUNBOOK.md: the final spec.

Common rules for this session: work only in C:\NightShift\Mobile-Coop-operators on branch feature/operators. First read CLAUDE.md, docs/operators/RULES.md, docs/operators/STATE.md and docs/operators/DECISIONS.md; read the docs/operators/SPEC.md sections the work needs (grep and line ranges). This is Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191. Blender 5.2.2 LTS runs headless from C:\Program Files\Blender Foundation\Blender 5.2\blender.exe (OptiX GPU, cloth and glTF export tested); the pipeline never needs Blender open. Ask me with the multiple-choice UI before installing software or downloading any file. Never claim a visual result that was not rendered on the hardware GPU. Do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. At the end: run npm run check, update docs/operators/STATE.md, commit, push, then STOP and tell me in plain English what you did, what I need to do, and give me the next step's prompt from docs/operators/RUNBOOK.md inline in one code block with its model and when to clear.

Do (BRIEF.md Stage 3 is the full list): rewrite docs/operators/SPEC.md as the final spec for the two approved operators: the character detail sheet (bible 5.16), parts, kit and materials list, LOD rules (hero, in-game, phone), phone vs desktop differences, measured budgets, animation and clipping risks (straps, harness, pouches, goggles vs the rig's joint limits and the 5.12.2 clipping rules, the 10 cm height difference in paired moves and traversal), and the integration plan for after feature/ct-locomotion merges (which files change, the A1-A4 proportion fixes, the e2e and visual checks, CHANGELOG / TESTING / docs updates). Then STOP: tell me the run is complete and what the integration run needs to start.
```
