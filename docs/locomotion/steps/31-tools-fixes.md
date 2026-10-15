# Step 31 - pose viewer and the known fixes (bible 5.12.3, bible 10 Phase 3b row)

Model: implementer opus; checker opus. Depends on: 30. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 31: pose viewer; fixes: thigh pistol vs elbow, brace prompt, human ladder by touch, thin fence"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D1 (touch scheme), D8.
- docs/design-bible.md 5.12.3 (`grep -n 'Pose viewer' docs/design-bible.md`, +6); :1493 (Phase 3b row).
- docs/ct-movement-progress.md:61 (thigh pistol), :145 (brace prompt, ladder by touch), :146 (thin fence).
- src/ui/debugOverlay.ts (359 lines): `grep -n 'button\|panel\|class'`, read the panel builder only.
- src/anim/animGraph.ts (LOWER_STATES :43, `activeClips()`), src/anim/clip.ts (clip sampling API).
- src/game/teamController.ts:28-70 (Y tap / hold, prompts); src/ui/prompts.ts:1-56.
- src/input/touchControls.ts (context button from step 17): `grep -n 'context\|hold'`.
- scripts/e2e-weapons-carry.mjs: `grep -n 'gear\|elbow\|box'`.
- The fence builder: `grep -rn "fence" src/world --include=*.ts -l`, then `grep -n 'mesh\|panel\|chain'` in it.

## Numbers
- Thigh pistol touches the right elbow pad at a slow crouch walk ~1 m/s (crouch gear 3 = 1.3 m/s cap, movement.ts:160);
  the suite runs gear 4 to dodge it (ct-movement-progress.md:61). Self-intersection limit <= 2 cm (bible :807).
- Pose viewer scrub down to 0.1x (bible 5.12.3).

## Task
1. Pose viewer (dev only: `import.meta.env.DEV || flags.debug`, lazy `import()`): a debug screen on phone and desktop.
   Pick any clip, lower state, transition, operator or guard; scrub, 0.1x-1x, loop, orbit camera.
2. Overlays: joint limits (red over limit), contact points, centre of mass and support area, clipping points; reads the
   same pure metric functions as the harness (no second implementation).
3. Remote preview: pose a second rig from a recorded MoveState stream (from an e2e-netmove or e2e-coop page B) side by side.
4. Pad and KBM drive the viewer (D1); touch gets scrub and play only.
5. Thigh pistol vs elbow: move the right-arm carry or holster offset so the elbow pad clears the thigh pistol by >= 2 cm
   at every crouch gear; e2e-weapons-carry runs at crouch gears 2, 3 and 4.
6. Brace prompt: show the contextual prompt (pad glyph first) when a team-mate is near and a wall is behind.
7. Human ladder by touch: on the D1 context button, hold = ladder, tap = boost, with the prompt showing the hold ring;
   no new touch button.
8. Thin fence: give the chain-link panel visible depth from the side (frame posts and a double-sided mesh or thin
   voxel strip), collision unchanged (graphics only; gameplay never reads it).
9. e2e: a viewer smoke case (open, pick clip, scrub, close) in e2e-desktop or a new small suite in the quick map.

## D8
- Viewer is local only. Fixes 6-7 change no protocol (prompts are local; the move request is the existing tmove).
- Anim per character <= 0.063 ms trend gate; the viewer adds nothing when closed.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-weapons-carry e2e-touch e2e-pad e2e-desktop e2e-coop`
  (coop, touch, pad KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): nothing regresses. `node scripts/perf-trend.mjs`.
- PC-PASS: pose viewer on the phone (`npm run build`, served, phone on LAN): "scrub, overlays readable";
  `E2E_GPU=1 node scripts/shot.mjs` side view of the fence: "reads as a fence, not a sheet" (PROVISIONAL).
