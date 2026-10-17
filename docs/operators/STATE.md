# Operators run - state (resume point)

**Now:** step 11b - Wren: rigid kit (D28) and desktop only (D29). It waits for Michael's layout pick: options pass 1
(scratchpad d28/D28-OPTIONS.md, copied into steps/11b when the step file is written) and a layout + pose-check pass
(d28/layout/LAYOUT.md). Then the Wren block end (RULES.md), after 11b because 11b changes garments and rebuilds the
LODs: retry step 08a (steps/08a-fixes-r4.md), step 10 (steps/10-fixes-r4.md) and step 11 (steps/11-fixes-r4.md:
callouts for every visible item). Step 07 is closed, step 08 superseded (not retried). Then step 12 (Moth) starts by
asking Michael Moth's direction (D24). Opus 5.5, High.
**Run style:** unattended (D15), one orchestrator session (D18): implementer, independent Opus checker, up to 3 fix
rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md.

**Key facts (after 11)**
- `GARMENTS.wren` = suit, gloves, approach_boots, headwear, head_kit, armour, chest_rig, waist_belt, leg_kit. Rebuild
  chain about 25 min, then `npm run operators:lods -- wren --render` (about 6 min; now ends with `operators:ktx2`).
- KTX2 (A79, D27): every LOD GLB is UASTC + Zstd 18 via `KHR_texture_basisu`; operators:check `ktx2` FAILs otherwise.
  VRAM 96 / 32 / 8 / 4 / 1 MB. Babylon's transcoder is bundled: `@babylonjs/ktx2decoder@9.29.0` (devDependency) on the
  main thread, wasm via `?url`, no network (lab/ktx2.ts); the Lab flips KTX2 in the texture matrix (Babylon cannot at
  upload). core/babylon.ts blanks KhronosTextureContainer2's CDN decoder URL. The game's KTX2 path is step 18's.
- Lab lighting (A80): the reader's winding flip lit every face from inside until step 11 fix round 1; fixed, rigs
  re-aimed (figure faces +Z, right on +X, yaw > 0 views its left). Generated studio environment for the metals (A78).
- The Lab source export flattens every procedural material to its measured albedo / roughness (A78); close-ups render
  the hero LOD under `detail` / `detailRear` (grey card sRGB 0.49, measured each run); turnaround / compare use `figure`.
- Sheets: 33 in docs/operators/mockups/wren/ (22 close-ups incl. buckle and hipL, rim-silhouette, goggle, ktx2-compare). SHEET_CLOSEUPS=a,b
  limits them. Stats use an operator mask (lab.maskShot); each close-up has a +2 EV detail-read panel; `--only diag`
  prints the front / back value diagnosis. Lab shadow bias 0.004 (acne fix, A80); goggle spill never lights her.

**Step 11b list (D28 / D29, after Michael picks the kit layout):** build the picked layout (bent throwable sleeves
and mag pouches), remove the phone LOD and its checks (D29), then rebuild the Wren LODs. Gunmetal (step 11 fix round 2 item 5 / round 3):
at base colour 0.051, metallic, its F0 is about 5 % (dark plastic), so no Lab light gives it a satin hot spot. Target
in materials.py: a metal with base colour (F0) about 0.25-0.45 linear and roughness near 0.55, or a dielectric
coating (Cerakote-like) whose "one metal finish" read comes from the edge wear; recheck on
`wren-sheet-closeup-buckle.webp`.

**Open questions for Michael:** Moth's direction (step 12, D24). Integration items for locomotion step 25: upright back carry vs
A2's diagonal (A36, A39), a slung SMG over the left hip (A41), sidearms anchored at the holster mouth (A62).
