# Step 33 - Training rewritten for the final verbs (Block E)

Model: implementer opus; checker opus. Depends on: 32. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 33: Training teaches the final CT verbs, pad prompts first"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D1 (pad first, touch basic), D7, D9, D10.
- docs/design-bible.md 5.3 "Training mode" line (`grep -n 'Training mode' docs/design-bible.md`).
- docs/story.md writing rules for in-game text (`grep -n -i 'radio\|subtitle\|tone' docs/story.md | head`).
- src/game/training.ts:1-104 (TrainingStepId, TRAINING_STEPS, TrainingStatus, stepDone, TrainingCourse).
- src/game/modes/trainingMode.ts:1-232 (course on Proving Grounds, markers, status feed).
- src/ui/prompts.ts:1-56 (promptHtml, glyph classes, pad / ps / key); src/input/gamepadMapping.ts GLYPHS.
- docs/systems/input-and-loop.md binding table (step 17): `grep -n '^|' docs/systems/input-and-loop.md | head -60`.
- scripts/e2e-training.mjs:1-184; tests for training (`ls tests | grep -i train`).

## Task
1. New step list (ids and order): move (analog speed, gear rocker), sneak (crouch, silent band), stop and quick 180,
   wall (back-to-wall, slide, corner peek), lean-out aim at a right and a left edge (the weapon moves to the open
   side, D9), low-wall aim (side lean at the end and over the top, D10), door peek, vault / mantle, ladder, vision (night, thermal,
   electro), draw and aim (holstered unless aiming), elbow strike, takedown, drag and carry, medkit.
   Remove cover, mark, execute, gadget-free sonar text and any removed verb.
2. Each step: a marker on the target, a one-line objective, the prompt glyph, a done test in `stepDone` from status
   counters the systems already expose (no gameplay reads graphics state).
3. Prompts: pad glyph first (Xbox / PS by body class), then the key; touch shows the context-button text only for the
   D1 basic verbs and skips steps touch cannot do with a short "pad or keyboard" note.
4. Remapped bindings (step 18) show the player's binding, not the default.
5. Text follows docs/story.md rules (short, in-world, no voice); no Splinter Cell names.
6. Course geometry on Proving Grounds reuses existing anchors and walls; add a door and a wall medkit if missing
   (test maps only).
7. Results: the course end screen lists the steps done; no save-shape change (if one is needed: SAVE_VERSION bump,
   migration, literal old-save test).
8. Unit tests for `stepDone` per step; e2e-training walks every step with the pad, then once with keyboard and mouse.
9. Co-op: Training stays solo; state it in docs/systems/modes-and-progression.md.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-training e2e-pad e2e-mouse e2e-touch`
  (pad / touch KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): unchanged.
- Block E has no perf trend requirement here (step 34 runs the full suite).
- PC-PASS: `E2E_GPU=1 node scripts/shot.mjs` of three Training prompts in pad and KBM mode: "glyphs readable".
