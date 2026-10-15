# Operators run - log

Newest at the bottom. Each step appends: what was built, numbers, open items.

## Steps 1-2 (2026-10-15), archived from STATE.md


**Stage:** 2 in progress. RUNBOOK step 2 (rules and pipeline foundation) done 2026-10-15. Next: RUNBOOK step 3 (base
bodies and the first garment test, Opus 5.5). `RUNBOOK.md` holds every step's model and prompt.

**Step 2 done (2026-10-15)**
- Rule text applied (SPEC 7, D8): bible 1.15 (5.14 generated operators and per-operator size, 5.15 Confrontation
  note, 5.16, Section 6), the CLAUDE.md hard rule, story.md Section 4.
- `docs/art-credits.md` created (no external files yet; ANSUR II listed as reference data, not in the repo).
- ANSUR II check (Michael approved the CSV download; kept in the scratchpad, not the repo). SPEC 4.2-4.4 rewritten
  from the real means:
  - shoulder joint 3.5 cm high (A1, now 1.40); arm segments right, so A2 is withdrawn; hand 2 cm short (A3, 0.19);
  - body mass A4 revised (pelvis 0.35, waist 0.30 x 0.215, chest depth 0.24); new A5 head depth 0.20, A6 shoulder
    width 0.49, A7 thigh 0.39 (the rig's straight leg put the ankle 3 cm under its table height);
  - Wren chest 1.03 and hips 1.08 (survey female ratios); Wren is the 79th percentile of women, Moth the 63rd of men;
  - head light sample gap is about 9 cm, not 6 (SPEC 4.1 fixed).
  - A7 touches standing leg IK (`legLen * 0.97`): the locomotion run owns it at integration.
- `src/operators/operatorBody.ts`: per-operator corrected proportions, hit volumes and bind-pose joints (mirrors the
  rig's node offsets), pure, tested.
- `src/operators/kit.ts`: Wren and Moth kit lists as data with `validateKit`; both kits pass. Writing them as data
  added a few cable fixings (SPEC 5 intro).
- Pipeline skeleton `scripts/operators/` (README there): Node launcher pinned to Blender 5.2.2 (refuses others),
  joint export to `build/operators/joints.json`, fixed seed 1015, stage 0 `build_skeleton.py` (armature from the
  joints, round trip under 0.1 mm: measured 4e-8 m). `npm run operators:build` runs it; output in `build/`
  (git-ignored).
- `npm ci` run in the worktree (Michael approved). `npm run check` passes (lint 0 errors, 746 tests, build).

**Done**
- Worktree `C:\NightShift\Mobile-Coop-operators`, branch `feature/operators` from `origin/ct-movement` (DECISIONS S1).
- `docs/operators/`: BRIEF, RULES, STATE, DECISIONS (D1-D11, S1-S2), SPEC (Stage 1):
  - the detail standard;
  - the design language (D5);
  - the reference study;
  - anthropometry and per-operator heights;
  - kit lists;
  - the technique;
  - cost estimates;
  - the approved rule text;
  - risks.
- CLAUDE.md line for this branch.
- Michael's answers:
  - the Blender pipeline on a CC0 base body (D7);
  - the rule text approved (D8);
  - the phone follows bible 1.14 (D9);
  - per-operator heights, Wren about 1.68 m and Moth about 1.78 m. Skeleton, hit volumes and light samples follow the
    body; the capsule, speeds and traversal stay shared (D10, D11).

**Stage 2 work (split into RUNBOOK steps 2-7)**
1. Done (step 2): the approved rule text.
2. Check the tools: Blender (Michael installs it before the session; pin the installed version in the pipeline). Ask
   Michael before installing anything else; a KTX2 encoder can wait until the export step. Create
   `docs/art-credits.md`.
3. Verify the SPEC 4.2 anthropometry table against the ANSUR II report or CSVs (openlab.psu.edu/ansur2). Ask Michael
   before downloading.
4. Pipeline skeleton:
   - `scripts/operators/` (Python, Blender headless) and `npm run operators:build`;
   - the CC0 base body (MPFB / MakeHuman assets) shaped to each operator's proportions;
   - the kit data file with its pure Vitest validator (every strap two anchors, every pouch named contents, every
     cable a source, a device and retention points no more than 15 cm apart).
5. The Operator Lab (`npm run operators`, dev only, never in the production bundle). It reads the rig's pose data
   read-only.
6. `scripts/operator-sheet.mjs` (E2E_GPU=1, E2E_PORT=4191) and the contact sheets of BRIEF Stage 2.2.
7. Three concepts per operator, Splinter Cell inspired and original (D5). Renders go in `docs/operators/mockups/`.
8. The review Artifact with Approve / Reject / Note per card (db capability).
9. `npm run check`, commit, push, STOP.

**Tool check (2026-10-15).**
- Headless Blender works: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, 5.2.2 LTS (Python 3.13).
- OptiX and CUDA see the RTX 4090 Laptop GPU. A cloth drape test simulated and rendered in Cycles on the GPU; the
  glTF exporter is present.
- Pin 5.2.2 LTS in the pipeline.
- The Blender MCP connector (live session, localhost:9876) only answers while Blender is open with the add-on's server
  started. The pipeline does not need it; it is for inspecting scenes live.

**Open items**
- None waiting on Michael.


## Step 3 (2026-10-15): base bodies, art direction, garment method test (Opus 5.5)

- `ART-DIRECTION.md` written from Michael's brief and referenced from SPEC 1; conflicts decided (D13).
- CC0 base body: MPFB2 data fetched (D12) by `scripts/operators/fetch-base-body.mjs` into a git-ignored cache.
- `py/mh.py` (pure numpy MakeHuman loader: macro targets, joint cubes, CC0 weights) and `py/build_body.py`:
  - MakeHuman sliders per operator, then linear blend skinning maps every MakeHuman segment onto the game's bones;
    torso breadth and depth come from a smooth height field (per-bone scales bulged), the head is scaled to A5;
  - measured against the targets: every dimension within 0.1 mm; Wren 1.684 m, Moth 1.775 m; waist 0.93 of A4 (D13);
  - bound in MakeHuman's A-pose on the game skeleton (arms 43 / 41 degrees, elbow bend 39 / 47, legs 8 / 7; D13, S3);
  - skin: the CC0 default weights summed onto the game bones, 4 influences, no unweighted vertices; 40 hero bones
    (3 per finger, 1 per toe) that fold into the hand and toe bones for the in-game levels; an elbow and knee bend
    check.
- Garment method (`pattern.py`, `garments/combat_shirt.py`, `build_garment.py`, `garment_details.py`, `materials.py`,
  `render.py`, `render_garment_test.py`), all in `npm run operators:build [-- wren --render]`:
  - 9 panels (front, back, 2 raglan sleeves with elbow darts and angled cuffs, 2 underarm gussets, collar), 32 seams,
    meshed by constrained Delaunay at 11 mm, the flat pattern as the cloth's rest shape (shape key);
  - arranged on a smoothed body contour and arm tubes, snapped clear and relaxed; sewn without self collision, then
    settled with it (quality 16); seams welded (worst gap before the weld 13.2 mm), the weld neighbourhood relaxed;
  - detail: seam allowance ridges and folded hems; 4,651 thread stitches over 15 m of rows (twin topstitch, flatlock,
    darts, hems); slanted bound-flap pockets with blank loop panels and bar tacks; Cordura elbow panels; cuff tabs;
    a zip with a garage; procedural knit, ripstop, Cordura, loop, thread, polymer and coated-metal materials on the
    pattern UVs, roughness 0.72-0.95.
- Renders (GPU, RTX 4090, OptiX): `docs/operators/mockups/tests/wren-combat_shirt-{a-front-stealth, b-back34-stealth,
  c-closeup-raking, d-front-neutral}.webp`.
- Bugs found and fixed on the way: Blender 5.2 adds shape keys at value 1; the Mix node's colour sockets share their
  names with the float ones; solidify even-offset spikes; relative render paths.
- Open (step 03b): fabric bunching above the hem, crumpled forearms, the mock neck not standing, faint knit banding,
  pockets and the elbow panel copying the sleeve wrinkles. No automatic checks script yet.
- Michael: the method is approved (D14); the run continues as chained small steps (D15); PLAN.md and steps/ written.

## Step 03b (2026-10-15): combat shirt fit, automatic checks (Opus 5.5)

- `npm run operators:check` (`scripts/operators/check.mjs`, `py/check_garment.py`): per built item a JSON report
  (`build/operators/<id>/<id>-<item>-check.json`), non-zero exit on any failure. Checks: seam gap before the weld
  under 10 mm; simulation finite, no runaway seam gap, nothing over 8 cm from the skin (depth inside the skin reported);
  no render-mesh edge over 3 cm; no solidify spike; every garment material tagged fabric or hard; measured albedo
  (fabric 0.02-0.06) and roughness (fabric 0.7-0.95, hard 0.55-0.9) from emission renders of what feeds each
  material's Base Color and Roughness, one sample a pixel against an ID render, four views, 1st-99th percentile;
  every built item names a kit item (`kitCoverage` in `src/operators/kit.ts`, Vitest) and `validateKit` passes.
- Root cause of the step 3 faults: Blender 5.2 ignores the cloth rest shape key, so the shirt simulated with its
  arranged start shape as rest (A1). Fixed with Dynamic Mesh; then the collision layer (A3), the cut and cloth values
  (A4). Also found: near-real vertex masses throw the cloth off the body (A2); a shape-key ramp blends positions, not
  lengths, and collapses the cloth (the rest shape switches at frame 2 instead).
- Garment data: `SIM` table per garment (mass, gravity, stiffness per material and panel, stiffer sewn layers,
  sewing, damping, quality, collision), `--sim` JSON override for tuning runs; `KIT` and per-detail `kit` ids.
- Pockets, flaps, loop panels, tabs and the elbow pads sit on a smoothed copy of the sleeve, pushed clear of the real
  surface, then relaxed with their edges smoothed only along the edge (straight sewn edges, no ripples).
- Knit and ripstop micro bump fades with camera distance (0.5-1.4 m) so it cannot alias into bands.
- Result (wren, combat shirt): seam gap 7.2 mm before the weld, sim 71 s, deepest inside the skin 1.2 mm, longest
  render edge 23 mm (zip slider); albedo knit 0.032, ripstop 0.026, Cordura 0.023; all checks pass. Renders on the
  RTX 4090 (OptiX): `docs/operators/mockups/tests/wren-combat_shirt-{a,b,c,d}-*.webp`.
- Render check: silhouette reads in near-darkness; fabric matte; knit and ripstop distinct at close range; folds
  sewn; nothing off-brief. SPEC 1 items in frame: arm pockets (marker light / spare battery, bound flap, hook-and-loop),
  elbow pad pockets, cuff tabs, zip with garage: each has its job.
- Open (cosmetic, carried): faint 1-2 cm ripples on the back of the upper sleeves under a raking key; soft horizontal
  folds above the hem at the back; the knit spans from the chest in a visible line under a side key (covered by the
  carrier in step 08). Revisit when the carrier and trousers constrain the shirt.


## Step 04 - Operator Lab and the contact sheet script
- Built: `py/export_gltf.py` (`npm run operators:export`, also the last stage of `operators:build`): `<id>-lab.glb` with the
  body and every garment item skinned to the game joint names (weights from the nearest body vertex, modifiers applied,
  procedural materials flattened to their mean albedo and roughness). Wren: 933,504 triangles hero, 19 meshes, 10 materials.
- Operator Lab: `operators.html`, `src/operators/lab/` (`glb.ts` reader, `retarget.ts` skeleton drive, `labData.ts` rigs /
  presets / poses / close-ups / colour-blind matrices, `lab.ts` scene, `main.ts` page), `npm run operators` (builds into
  `build/operators-lab/`, serves it with `build/operators/` at `/__operators`). Not in `dist/` (checked: no match).
  Turntable, free camera, perspective 50 mm or orthographic, LOD selector (lists hero; lod1, lod2, phone appear when built),
  Low / High / Epic / phone look, six lighting rigs, seven poses, wireframe / normals / UV / material ID, bones linked with
  `Bone.linkTransformNode` to nodes driven from a read-only CharacterRig, game operator beside the new one.
- `scripts/operator-sheet.mjs` (`npm run operators:sheet [wren|moth] [--only a,b]`, E2E_GPU=1 E2E_PORT=4191): turnaround,
  11 close-ups with callouts (built items; unbuilt ones listed as pending), menu test with three camera-move strips,
  Hollowmere and darkness context, before / after, LOD and phone look, wireframe / normals / material ID strip, colour-blind
  strip. Output `docs/operators/mockups/<id>/<id>-sheet-*.webp` (Wren: 17 sheets, 1.1 MB). Rendered on the RTX 4090 (ANGLE D3D11).
- Tests: `tests/operatorLab.test.ts` (14: GLB reader frame and winding, skin order, retarget, data lists, colour-blind maths,
  callouts). `npm run check` and `npm run operators:check` pass.
- Open: (1) Moth is not built: its sheets and the two-operator frame are skipped by the script and listed. (2) Lab materials are
  flat factors, no textures or normal maps until step 10 (sheen only under the phone look off). (3) The retarget (rig world
  rotation per joint, arms swung from A-pose to hang) was checked by eye in idle, crouch, sneak: arms read natural, not
  measured; aim and climb poses are not reviewed. (4) The goggle glow is a stand-in box on the head joint until step 07.
  (5) The current game operator shown beside is the game rig built from flat boxes, not the full voxel look. (6) The studio
  light uses exposure 4.5 because the albedo is 0.02-0.06 by design; the rigs, not the garment, carry the brightness.
  (7) No in-game or phone LOD yet, so those sheet tiles repeat hero with the phone look.
