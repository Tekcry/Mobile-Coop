# Operators run - state (resume point)

**Now:** the Wren block is complete (08a, 10 and 11 retries passed). Next D30 step 11c: merge Michael's merged base
branch into feature/operators - waiting for him to name it (ask with the native multiple-choice UI). Then 11d game
runtime (steps/11d-wren-game-runtime.md), 11e Wren in the game behind ?operator=wren (steps/11e-wren-in-game.md). Then
ask Michael whether to switch Wren on by default and Moth's direction (D24) before step 12. Opus 5.5, High.
**Run style:** unattended (D15), one orchestrator session (D18): implementer, independent Opus checker, up to 3 fix
rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md.

**Key facts (after 11)**
- `GARMENTS.wren` = suit, gloves, approach_boots, headwear, head_kit, armour, chest_rig, waist_belt, leg_kit. Rebuild
  chain about 25 min, then `npm run operators:lods -- wren --render` (about 11 min since A95; ends with `operators:ktx2`); `operators:check -- wren` about 55 min.
- KTX2 (A79, D27): every LOD GLB is UASTC + Zstd 18 via `KHR_texture_basisu`; operators:check `ktx2` FAILs otherwise.
  VRAM 96 / 32 / 8 / 4 MB (hero / LOD0 / LOD1 / LOD2). Babylon's transcoder is bundled: `@babylonjs/ktx2decoder@9.29.0` (devDependency) on the
  main thread, wasm via `?url`, no network (lab/ktx2.ts); the Lab flips KTX2 in the texture matrix (Babylon cannot at
  upload). core/babylon.ts blanks KhronosTextureContainer2's CDN decoder URL. The game's KTX2 path is step 18's.
- Lab lighting (A80): the reader's winding flip lit every face from inside until step 11 fix round 1; fixed, rigs
  re-aimed (figure faces +Z, right on +X, yaw > 0 views its left). Generated studio environment for the metals (A78).
- The Lab source export flattens every procedural material to its measured albedo / roughness (A78); close-ups render
  the hero LOD under `detail` / `detailRear` (grey card sRGB 0.49, measured each run); turnaround / compare use `figure`.
- Sheets: 33 in docs/operators/mockups/wren/ (22 close-ups incl. buckle and hipL, rim-silhouette, goggle, ktx2-compare). SHEET_CLOSEUPS=a,b
  limits them. Stats use an operator mask (lab.maskShot); each close-up has a +2 EV detail-read panel; `--only diag`
  prints the front / back value diagnosis. Lab shadow bias 0.004 (acne fix, A80); goggle spill never lights her.

**After the 08a retry:** suit membrane zones crotch / abdomen / lumbar (A90; `support: 'subdiv'` = the cage with a
light Taubin, `support: 'fit'` = an MLS-fitted, lifted support for the abdomen, A93), joined tape runs (`D['bonded']['join']`, A92), suit `seam_self_rings` 6 (seam gap 9.6 mm).

**After 11b (D28 / D29):** rigid parts on `KC.Flat` frames with `_rigid` ids (chest 1xx, belt 2xx, legs 3xx, armour
4xx, head 5xx), skinned by `py/rigid_skin.py` (one weight vector per part), `_RIGID` in every GLB; operators:check
`rigidKit:*` per item and `rigidSkin:<lod>`; pose check `py/pose_check.py` (wren-pose-*.webp, wren-poses.json). No
phone LOD. Gunmetal is a metal (A86: F0 0.15-0.165, roughness 0.60; reads dark grey, satin on bevels only). LOD1 target
13,600 (A89). Rigid design coordinates are recorded before the map (cbox / mpts input, KC.Frame + Parts.place). Drone pod rear right, medkit right side (A88).

**Open questions for Michael:** A88 (pod rear right, medkit right side: the left rear has no room). A86 gunmetal look
(dark grey, no satin lobe on the buckle's flat faces). Moth's direction (step 12, D24). Integration items for locomotion step 25: upright back carry vs
A2's diagonal (A36, A39), a slung SMG over the left hip (A41), sidearms anchored at the holster mouth (A62).
