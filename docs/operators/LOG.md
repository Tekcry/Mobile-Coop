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

## Step 05 - Wren: base layer and trousers (Opus 5.5)
- Built: `py/garments/base_layer.py` (kit `baseLayer`: compression top on the shirt block - knit everywhere, flatlock
  seams, mock neck 5.8 cm, about 1 cm above the shirt collar, sleeves 6 mm longer than the shirt's - and leggings on
  the leg block with a gathered elastic waistband the top laps over; flat coverstitched hems), `py/garments/legwear.py`
  (the leg block: front and back per leg, diamond crotch gusset, optional knee darts, waistband with `band_ratio`
  gathering, `rise` at the centre seams), `py/garments/trousers.py` (kit `trousers`: soft-shell, knee darts with the
  front cut longer, knee pad pockets behind Cordura panels (`kneePads`), knit crotch gusset, seat panels, cargo
  pockets angled forward with bound flaps and metal drain grommets (`cargoL` / `cargoR`), 7 belt loops with bar tacks
  at both ends, fly J-stitch with bar tack, waistband snap, ankle tabs, tapered hem at a 34 cm boot-top girth).
- Multi-layer pipeline (A11): `GARMENTS.wren` = base_layer, combat_shirt, trousers; `build.mjs` passes `--under`; each
  garment opens the previous one's blend, is drafted with a per-layer girth allowance (`UNDER_LAYERS`), arranged and
  pushed clear of the skin and the layers, sewn, and resolved against the layers after the simulation (`layer_push`).
  The shirt tucks in by order (sewn before the trousers) and is now cut 6 cm longer (`z_hem` 5 cm under the hip joint).
- `build_garment.py`: leg arrangement (tubes round the leg axis below the crotch, torso contour above, gusset flat
  under the crotch, band like the collar), crotch height, leg and torso girth rows cut from the mesh edges (the shin
  rows are 2-3 cm apart), an inside-out panel check, the worst seam's name per sample.
- `garment_details.py`: per-panel materials reused by name (soft-shell, compression knit added), optional zip and
  collar, band tops, fly, snaps and grommets (`hardware metal`), reinforcement panels and belt loops; body subsurf
  added once; colliders removed before save. `check_garment.py`: two more measuring views (left thigh, waist front).
  `export_gltf.py`: every rendered top-level mesh, new flat materials. `render_garment_test.py`: full-figure framing for
  legwear and per-garment close-ups. Kit: `baseLayer`, `kneePads` (A14); Vitest line for them.
- Tried and dropped (numbers in DECISIONS A13 and the code comments): measuring girths over the simulated layers
  (over-measured 5-10 cm), cloth-on-cloth layer collision in Blender (seam gaps 37-149 mm), -6 % girth ease on the
  leggings (12 % shorter, the waistband fell to the crotch: girth stretch couples into length in the mass-spring cloth).
- Numbers (Wren, seed run 2026-10-16): seam gap before weld base layer 8.6 mm, shirt 5.2 mm, trousers 3.1 mm; vertices
  14,484 / 8,435 / 9,036; after the simulation `layer_push` moved 6,721 shirt and 3,957 trouser vertices clear of the
  layers; stitches 10,629 / 4,844 / 6,071; hero faces before solidify (each blend, cumulative) 453k / 717k / 1,018k;
  trousers 17 patches (1 patch lookup miss). `npm run operators:check`: 3 items, all checks pass (6 measuring views now).
  `npm run check` passes. Renders (RTX 4090, Cycles 384 spp): `docs/operators/mockups/tests/wren-base_layer-*.webp` (5),
  `wren-combat_shirt-*.webp` (4, re-rendered over the base layer), `wren-trousers-*.webp` (6).
- Open (implementer's own read of the renders; for the checker / fix round):
  1. The trousers sit about 8-10 cm low: the waistband settles near the hip (about 0.88 m, drafted at 0.96-1.0 m), so
     the cargo pockets read at the knee and the knee pads sit below the knee, the front bunches under the band and the
     slack stacks at the ankles. Same cause as the leggings (they settle about 6 cm low): the leg block's crotch seam
     is still short for the body's front-to-back crotch path (the `rise` at the centre seams and the gusset size are
     first estimates), and the sewn waist does not grip. Likely fixes: a measured crotch length (front waist under the
     body to the back waist) drafted into `rise` / `centre_lift` / the gusset, or pinning the band during the sew.
  2. The tuck: the shirt hem settles at about 0.88-0.92 m, at the trousers' band rather than well inside it (follows 1).
  3. The trousers close-ups (`c-closeup-knee-cargo`, `e`, `f`) are over-exposed (exposure 1.0 with a 120 W rake at
     about 0.5 m): re-light at lower power before judging materials there; the stealth and neutral views are usable.
  4. Stretch panels behind the knees (SPEC 3.1) are not built (a sewn-on patch is not an inserted panel); follow-up.
  5. Base layer at the collar and cuffs: judged only on the base-layer and shirt renders; the base top shows about
     1 cm above the shirt collar and inside the cuffs.
- Fix round 1 (fixer, against `steps/05-fixes-r1.md`):
  - Item 1 (band and crotch): the waistbands are pinned to their arranged ring through the sew and the settle
    (`SIM.pin`, A15; the pinned ring is kept out of the start-shape relaxation, which had shrunk it 32 mm off its
    closing seam and collapsed its height); the leg block's rise is solved from the body's measured crotch path
    (`m['crotch_hull']`, `legwear.crotch_lengths`; `crotch_ease`). Body path from the trouser top (z 0.962): front
    21.9 cm, back 31.6 cm; pattern 24.1 / 35.4 cm (rise -2.0 / +8.0 cm; the old estimates were long at the front, the
    crotch hung 6 cm low). Trousers band top: 1.003 m (front 1.002, back 1.005) vs drafted 1.002 m (was 0.936);
    gusset centroid 0.758 m vs body crotch 0.755 m (was 0.693). Shirt hem top 0.916 m (mean 0.888 front, 0.909 back):
    8.7 cm or more inside the band top. Leggings band top 0.952 m vs drafted 0.952 m (was 0.885).
  - Item 2: knee pad centres 0.491 / 0.484 m vs knee joint 0.482 m (pad 17 cm tall, `knee_up` -0.03: the thigh
    settles about 4 cm shorter than drafted on the spread legs); cargo pockets 13 x 15 cm against the outseam (outer
    edge 1.2 cm off it), centre 0.66 m, mouth about 0.735 m, bottom 1.5 cm above the pad top, tilted 10 degrees.
  - Item 3: base layer drawn onto the skin after the simulation (`SIM.cling`, 14.3k vertices; the top's hem one layer
    out over the band); trousers Taubin-faired between the seams (`SIM.fair`, max move 10.7 mm) before `layer_push`.
  - Item 4: the base top's hem (min 0.880 front, 0.907 back) laps 2-7 cm over the leggings band (0.918-0.954 m).
  - Item 5: close-up rake light 120 W -> 30 W (gusset view 20 W); new views `wren-trousers-g-closeup-gusset`,
    `wren-combat_shirt-e-closeup-collar`, `wren-combat_shirt-f-closeup-cuff` (the base layer under the shirt).
    Partial: `wren-trousers-c-closeup-knee-cargo` still clips to white on the upper thigh nearest the light (the
    grommet, pocket stitching and pad outlines read); the next round should drop that view's rake to about 10 W.
  - Item 6: the pale ellipse at the crotch was the leggings' gusset showing through a gusset hanging 6 cm low; with the
    crotch fitted it is gone from the re-rendered views (judge `c`, `d`, `g`).
  - Item 9: A11 rewritten to what the pipeline does (post-simulation `layer_push`, why, undo); the deviation from
    Do 1 is named there. Garment docstrings corrected.
  - Seam gaps before weld: base layer 7.2 mm, shirt 5.7 mm, trousers 7.4 mm. `npm run operators:check`: 3 items, all
    checks pass. `npm run check` passes. Renders re-made on the RTX 4090 (all three garments).
  - Left (lowest value, no budget): item 7 (belt loops lapping above and below the band need a patch that spans two
    panels; `garment_details` maps a patch onto one panel only) and item 8 (stretch-knit inserts behind the knees need
    a seamed panel in the leg block). Tried: front `crotch_ease` 0.005 (to lose the last fold under the front band)
    pushed the gusset seam gap to 10.1 mm (fails the 10 mm check); reverted to 0.02. Open: a soft horizontal fold under
    the front band remains; the compression top shows the bust's small features (cling `tent` 3 does not bridge them).
- Fix round 2 (fixer, against `steps/05-fixes-r2.md`; A16):
  - Item 1 (front waist): cause measured on the round-1 build: the shirt's free hem stood 2-3 cm proud of the base
    layer over the lower belly (z 0.88-0.93) and the trousers, pushed over it, followed it and dropped 2-3 cm at its
    edge (z 0.87): the lip and the recess. Fix: the shirt's hem is drawn onto the base layer below the trousers' band
    (`SIM.tuck`); the trousers' `fair` now fairs seam and hem lines along themselves (band lower edge, fly) and runs
    40 passes. Front `crotch_ease` kept at 0.02. Re-rendered `e`, `d`, `f`: the front lies flat from the band into
    the fly. Left: a small crinkle in the band at the centre-front join beside the snap.
  - Item 2 (trouser legs): `fair` 6 -> 40 Taubin passes (damps dents up to about 7 cm, keeps folds over 14 cm).
  - Item 3 (shirt chest bars): measured a 1 cm horizontal step across the upper chest (z 1.23-1.24, not from the
    layer push) plus per-vertex push steps; `layer_push` now spreads each push as a smooth bump (`push_out`), and the
    shirt's front and back panels are faired (20 passes; sleeves untouched).
  - Item 4 (nipples) LEFT, partial: `cling` draws the knit onto a Taubin-faired skin (`bridge` 25) and only pushes
    it 1.5 mm clear of the real skin (`guard`, a spread bump). The nipples are softer but still read in `d`. Cause: the
    fairing is per edge and the body's mesh is dense round the nipples, so the passes barely reach them. Tried
    `bridge` 40 with a 0.5 mm guard spread as a broad dome (16 rings): no visible gain, and the shirt sewn over that
    base layer settled with a 15 mm seam gap (check fail), so reverted. Next: a scale-aware skin fairing (weights
    1 / edge length, or fair a resampled copy of the torso), or flatten the nipples on the body under the base layer.
  - Item 5 (belt loops): 5.8 cm loops from the band top to 2 cm below the band (extended down the band's slope,
    `band_h` on the patch), 6 mm stand-off over a 4.6 cm flat run, bar tacks at both ends.
  - Item 6 (knee stretch panels): lens-shaped stretch-knit inserts seamed into each back panel behind the knee
    (details `inserts`: knit material and stiffness inside, raised seam allowance, a stitch row either side; A16).
  - Item 7 (gusset view): `g` re-aimed from directly below the crotch, looking up.
  - Item 8 (seat): one Cordura panel per side shaped to the back panel (centre back seam to side seam, from the
    gusset over the seat; patch `outline`, new `pattern.patch_outline`).
  - Item 9: the `build.mjs` and `export-gltf.mjs` comments match A11.
  - Final build (full `operators:build -- wren --render`, RTX 4090): seam gaps base layer 7.24, shirt 5.17, trousers
    5.21 mm; shirt tuck 1798 vertices, shirt fair max 9.0 mm, trousers fair max 12.6 mm, layer push largest 19.9 mm
    (trousers) / 22.2 mm (shirt), spread. `npm run operators:check`: 3 items, all checks pass. A shirt fair with
    seam-line fairing on its body panels only opened the raglan seams to 15 mm; the shirt is faired between the seams.
  - Left / partial: item 4 (above); item 2 partial (the legs are smoother, some broad dents remain on the back of the
    thighs in `b`); item 7 partial (`g` from below shows the knit gusset region and its seams between the thighs, but
    it is crumpled at the front tip); item 1: a small crinkle in the band beside the snap at the centre-front join.
- Fix round 3 (fixer, against `steps/05-fixes-r3.md`; trousers only, base layer and shirt not rebuilt):
  - Blocker 1 (crinkle at the centre-front join): measured, not guessed. The trousers' sim and hero meshes are smooth
    there (no folded faces, no UV jumps, normal fabric strain, no layer poking through), and a crop rendered without
    the fabric bump still showed it; a crop rendered without the stitches object did not. Cause: the stitch threads
    stand about 0.3 mm proud and the close-up's rake is nearly tangent where the band bends into the centre-front
    valley, so each thread throws a 5-10 mm spiky shadow (the same on the fly's J-stitch and the centre back seam in
    `f`). Fix: trousers details `stitchShadows: False` (the threads cast no shadow; render only, glTF unchanged) and
    `offsetSmooth: 3` (the seam plateaus' 1.5 mm step, shorter than the dense mesh edge, becomes a ramp instead of a
    sawtooth). Both are per-garment keys in `garment_details.py`; the base layer and shirt are unchanged.
  - Blocker 2 (seat shrink-wrapped): new `build_garment` step `bridge` (SIM `bridge` on the trousers): the layers
    under the trousers are bridged in a box behind the body from just above the crotch to the band (smoothed, never
    below the real layer, 150 passes: a rubber sheet over the cleft, the sacral dimple and the lumbar groove), and the
    back panels are pushed one layer step off that envelope (eased in 1-5 cm above the crotch, out over 2.5 cm under
    the pinned band; spread bumps), before `fair` and `layer_push`. Front `crotch_ease` untouched.
  - Accepted as follow-ups (OPEN, from the round 3 checker):
    1. OPEN - base-layer nipples still read in `wren-base_layer-d` / `-a`. Reason: seen only at the collar and cuffs
       once dressed, and the shirt over it is smooth. Next: scale-aware skin fairing (weights 1 / edge length) or
       flatten the nipples on the body under the base layer, then rebuild all three garments (the shirt's seam gap
       depends on the base layer).
    2. OPEN - soft dents on the back of the thighs and round the knee pads (`-c` below the right pad, `-b` behind the
       left knee). Reason: much improved; revisit when the legs are re-simulated with the boots (step 06) or in pose.
    3. OPEN - gusset close-up `-g`: the knit gusset crumples at its front tip; the gusset bar-tack zig-zag reads as
       large sawtooth triangles at that range. Reason: not a hero view once dressed; fix with the gusset re-draft.
    4. OPEN (taste) - a short horizontal dent across the shirt's lower back (`wren-combat_shirt-b`), the leggings'
       centre back seam puckers at the top (`wren-base_layer-b`), the `c` rake lets the hands shadow the thigh.
       Reason: notes, not step checks; the shirt and base layer are not rebuilt in this round. Also (round 4
       checker): the right front belt loop's inner edge shows a scalloped shadow along its stitch line (`-e`, puckering),
       and the back band's lower edge has a beaded stitch row with a shadowed groove under it (`-f`, `-b`).
    5. OPEN - one lumbar dimple with a small lump right of the centre back seam above the seat panel (`-f`, image
       x 1100-1160, y 380-420). Reason: a single spot in one close-up after the seat bridge (A17). Next: first check
       whether it is the tucked shirt's hem (about 0.88 m) and the shirt's lower-back dent showing through; else a
       bridge that reaches under the band ramp (`band` (0.0, 0.025)) or a lumbar-only pass. Do not raise the bridge
       passes globally: 250 folded the cloth under the band.
    6. OPEN - stitch relief: trousers threads cast no shadow in renders (`stitchShadows: False`, A17). Next: a
       0.2-0.3 mm stitch channel along each stitch row in the offset map (bakes into the LOD normal maps), then drop
       the flag or apply one policy to all garments.
  - Result (final build, RTX 4090, Cycles 384 spp; renders 07:1x): trousers seam gap before weld 5.2 mm (gusset
    unchanged, front `crotch_ease` 0.02); bridge 932 vertices, largest push 23.4 mm; fair max 12.6 mm; layer push
    largest 19.9 mm. `wren-trousers-e`: the band runs smooth through the centre-front join and round the snap, both
    edges straight (a soft dent remains just above-left of the snap). `wren-trousers-f`: the centre back seam is a clean
    line bridging the cleft between the seat panels, the sacral dimple is gone; LEFT: one lumbar dimple right of the
    centre back seam above the seat panel (image x 1100-1160, y 380-420) and a soft groove under the back band.
    Tried 250 bridge passes: a 39 mm push and a hard fold under the back band, worse; kept 150.
  - `npm run operators:export` OK; `npm run operators:check`: 3 items, all checks pass; `npm run check`: 73 files,
    761 tests, build OK, lint 0 errors / 38 warnings.
- Status: passed the independent check (fix rounds: 3).

## Step 06 - Wren: gloves and boots (Opus 5.5)
- Built (DECISIONS A18: fitted, not sewn): `py/build_fitted.py` (one stage for `FITTED` items; writes the same
  `-sim.json` / `-sim.npz` / blend as a sewn garment, method `fitted`, seam gap 0, a triangulated shell that later
  layers push clear of), `py/fitted.py` (shared geometry: push clear, smoothing, stitch rows, tubes, straps, boxes,
  eyelet rings, panel-boundary chains), `py/garments/gloves.py`, `py/garments/boots.py`; materials `leather`
  (goatskin grain, polishes darker where worn), `suede` (nap, grazing sheen), `nylon` (boot upper), `rubber` (hard;
  AO dust, scuff) reading a per-vertex `wear` attribute.
- Gloves (kit `gloves`): the body's hand faces subdivided twice, 2.2 mm off the skin, pushed 3.2 mm clear of the
  base-layer cuff; panels from the hand frame (palm normal from the finger curl): goatskin palm wrapping the index and
  little-finger edges, stretch-knit back, knit fourchettes, ribbed knit cuff 5.5 cm up the forearm, a padded knuckle
  panel with two flex channels, leather fingertip patches (thumb, index, middle; they wrap the tip), a palm-heel patch,
  a leather wrist tab (box-X where sewn on, hook-and-loop patch under its free end, folded pull loop), a bound cuff
  edge, stitches on every panel boundary. Wear: trigger finger and palm heel polished darker, thumb and middle tips
  less. Skinned by the export (nearest body vertex: the hero finger bones it was cut from).
- Boots (kit `boots`): a last lofted from the foot's section hulls plus 4.5 mm clearance (vertical sections to the
  throat, a fan pivoting in front of the throat round the heel, horizontal up the shaft), a rounded toe box with
  10 mm toe room built from the ball section, smoothed, pushed clear of the skin and the leggings, flattened onto the
  sole; padded collar rolled over a lining. Panels snap onto smooth outlines (Newton steps on each overlay's field):
  rubber rand rising over the toe and heel, suede toe cap, heel counter and eyestays (twin stitch rows), nylon
  quarters, recessed tongue, padded collar. Four eyelets and two speed hooks a side, criss-crossed laces over the
  tongue into a lace garage pocket, a webbing heel pull loop (box-X). Cupped rubber sole: toe spring, heel bevel,
  midsole groove, 55 chevron lugs 3.6 mm deep, a recessed arch and a transverse heel-brake bar. Wear: toe rand and
  cap scuffed, heel scuffed, two flex creases across the forefoot, dust in the lugs (AO).
- Pipeline: `GARMENTS.wren` = base_layer, gloves, boots, combat_shirt, trousers; `build.mjs` runs `build_fitted.py`
  for `FITTED` items. The shirt cuffs and the trouser hems are pushed clear of the glove and boot shells. The check
  gains a left-hand and a left-foot measuring view (eight views); `export_gltf.py` flat values for the new materials;
  `render_garment_test.py` views for gloves (c back, e palm), boots (c side, e laces, f heel and sole) and a trousers
  hem-over-boot close-up (h).
- Numbers (Wren): hand length 18.2 cm, knuckle breadth 6.0 cm, glove cuff girth 17.1 cm; gloves 1,230 stitches over
  3.9 m of rows, 87k faces before solidify. Foot 22.8 cm, boot 24.5 cm long, ball 10.1 cm wide, top 15.5 cm high,
  top girth 24.0 cm (the trouser hem was drafted for 34 cm; since fix round 1 it is the boot top girth plus one layer, 26.5 cm, A22), girth at the hem height (10.4 cm) 22.3 cm; 81 rings of 84;
  about 1,000 stitches; 53k faces.
- Rebuilt over the gloves and boots: shirt seam gap before weld 4.5 mm (layer push largest 28.4 mm, the cuffs over
  the glove cuffs), trousers 6.0 mm (largest push 20.9 mm). `npm run check` passes. `npm run operators:check`: see the
  result line in the implementer's report (eight measuring views). Renders (RTX 4090, Cycles 384 spp, E2E_GPU=1):
  `docs/operators/mockups/tests/wren-gloves-*.webp` (5), `wren-boots-*.webp` (6), `wren-combat_shirt-*.webp` (6),
  `wren-trousers-*.webp` (7, new `h-closeup-hem-boot`).
- Open (implementer's own read of the renders; for the checker / fix round):
  1. The trouser hem does not lap over the boot top (`wren-trousers-h-closeup-hem-boot`): it ends at about the boot
     collar (15.5 cm) with the leggings showing in a thin gap, so "the trouser hem seals over the boot top" is not yet
     met. Fix: cut the trouser legs about 4-5 cm longer (`trousers.py` `z_hem`; the hem settles about 4 cm above its
     drafted height) or lower the boot top (`boots.py` `z_top`), then rebuild the trousers and re-check the seam gap.
  2. The boot toe box is boxy and square-ended (`wren-boots-c-closeup-boot-side`, `-e-closeup-boot-laces`): round the
     plan view further (`boots.py` toe box: `gw` exponent, `TOE_ROOM`) and taper the toe height.
  3. The test close-ups render the near-black materials as mid grey (exposure +1 with a close fill), as in step 05;
     material separation (suede vs nylon vs rubber, goatskin vs knit) is hard to judge there. The stealth views (a, b)
     are the honest read; the Lab / operator sheet should be used to judge materials.
  4. Glove fingers are as smooth as the mannequin's (no fabric slack at the knuckle creases); the fourchettes are thin
     strips (the body's fingers nearly touch).
  5. Speed hooks are small and read as eyelets from the front; the lace bow is hidden in the garage by design.
- Fix round 1 (checker list `steps/06-fixes-r1.md`):
  1. Trouser hem: `build_garment.py` reads the boots' measured top girth (`-boots-sim.json`) and adds one layer's
     allowance (`m['boot_top_girth']`, 26.5 cm on Wren); `trousers.cut` drafts `hem_circ` from it (was a fixed 34 cm,
     which stood 1.7 cm off the boot all round and read as a dark gap). The leg still settles about 4 cm from its
     drafted height, so the hem laps over the boot collar (OPEN 1).
  2. Boot toe: the nose sections are the ball section (with its clearance) mapped onto a rounded, slightly asymmetric
     toe (superellipse plan round a toe point a third of the way to the medial edge, elliptical side profile falling
     toward the tip), 40 rings dense at the tip; the vamp is raised 8 mm from the throat forward (`TOE_RAISE`; the bare
     foot is only 3.6 cm high at the ball) so the toe box is domed, not a wedge; a section grows where a toe point
     would poke through. The rand's toe bumper edge is a curve in plan across the nose (a height line on the toe's
     near-flat crown snapped into tears) (OPEN 2).
  3. Panel edges (boots and gloves): a boundary edge is snapped only when its own field changes sign between the two
     faces (the eyestay ends at the lacing rings and the collar rolls, not at |w| = 26 mm: snapping those onto the
     wrong outline tore the spikes); steps are clamped to 2 mm and skipped where the outline runs along the normal.
  4. Eyelets are raised grommets (1.4 mm, rolled rim) that read at a grazing angle; the two speed hooks a side are a
     riveted base, a 4.5 mm post and a lip bent up the boot, open toward the top, with the lace round the post (OPEN 5).
  5. Glove knuckle pad: a rounded rectangle (18 mm x hand width less 1 cm, 5 mm corners) from a field on the hand frame,
     edges snapped; 2.4 mm proud with a 1.3 mm rolled edge and two 1.2 mm flex channels, each stitched along its bottom.
  6. Glove fingertip patches: a sewn cap 6 mm over the nail and 22 mm down the pad, its edge curving between them
     (the old edge was a ring across the finger and read as a cut-off end), snapped and stitched; 0.6 mm proud.
- Fix round 1 result (full rebuild `E2E_GPU=1 npm run operators:build -- wren --render`, RTX 4090, 384 spp):
  `npm run operators:check -- wren` 5 items, all checks pass; `npm run check` exit 0. Own read of the renders:
  - Done: glove knuckle pad reads as a distinct stitched rounded panel (`wren-gloves-c-closeup-glove-back`); boot toe
    rounder in plan and domed (`wren-boots-e-closeup-boot-laces`).
  - Still open for round 2: (1) the narrower hem (26.5 cm) now settles higher and ends ABOVE the boot collar with the
    leggings showing (`wren-trousers-h-closeup-hem-boot`): the hem must also be cut longer (`trousers.cut` `z_hem`,
    about 4 cm lower) or the leg's settle-up handled; (2)/(3) boot panel edges (rand at the heel and toe, eyestay
    outer edge, toe-cap) still ragged and the vamp shows patchy translucent-looking fragments although the upper has
    no small label islands and no folds above 3 cm (diagnosed in Blender): next suspect the per-face UVs / AO dust
    (`materials.py` `g.wear(ao_dist=0.02)`) and why the Newton snap leaves the stair steps (count snapped verts per
    field); (4) speed hooks still read as small knobs at 0.42 m; (6) fingertips still show a dark dot at the end
    (no hole in the mesh: checked boundary edges; likely a dimple at the tip from the fit); (7) a small dark piece
    still hangs under the right-leg hem (`h`, about x 210, y 560).
- Fix round 2 (checker list `steps/06-fixes-r2.md`):
  1. Boot panel edges (MUST): `fitted.level_slice` cuts the shell along each panel field's zero contour (counter,
     toe cap, collar, eyestay, tongue, rand) before labelling - every face the field changes sign across is split at
     the interpolated zero, crossings within 18 % of a vertex move that vertex onto the contour (no slivers), local
     coordinates, ring UV angle and the fields are interpolated with the positions. Faces are labelled from the field
     signs (the discrete lacing / collar-row / ring-distance limits from the parent face). The Newton snap is gone.
     `fitted.split_step` gives each lift group its own vertices and joins them with a wall quad, so an overlay ends
     on a real turned edge; the walls are flat-shaded with sharp edges (with smooth walls the panel normals tilted
     into a sawtooth band along the edge). Stitches and hardware sit on the overlay-top surface. 8,821 -> about 9,930
     verts a boot after the slice.
  2. Trouser hem (MUST): `trousers.cut` `z_hem` = ankle - 5.5 cm (was 1.5): the hem now laps over the boot collar on
     both legs (quick render, 64 spp).
  3. Boot toe (MUST): `TOE_ROOM` 14 mm (was 10), plan superellipse exponents 2.0 medial / 1.7 lateral (was 2.6 /
     2.0): width 2 cm behind the tip 58.2 mm against the ball 94.9 mm = 61 % (printed by the build, `toeWidthRatio`
     in the boots report); the sole follows the upper's outline.
  4. Boots too bright (MUST, partly): suede sheen 0.22 / tint 0.3 (was 0.6 / 0.6), Specular IOR Level 0.2 suede,
     0.3 nylon and rubber, suede albedo 0.027 (nap 0.033), rubber scuff 0.038 (was 0.055). The quick stealth render
     (a) barely changed: the upward-facing toe caps take the stealth key (2.2, -0.9, 2.3) almost head-on while the
     leggings are lit at grazing, so they stay the lightest part of the legs at the same albedo. OPEN if the full
     render still reads near-white: next step is a value check in the stealth light (measure boot vs trouser
     luminance in a) and, if the art direction wants it, a lower boot albedo inside the 0.02-0.06 band or a
     render-light change agreed with Michael (not a check change).
  5. Fingertips (MUST, not fixed): tips re-formed as half ellipsoids through the section 7.5 mm back (blended over
     4.5 mm, pushed clear), and finger faces never take the along-the-hand UV projection. The dark dot and the flat
     disc in `gloves-c` did not change in the quick renders. Diagnosed: no boundary or non-manifold edge within 2 cm of
     any tip, all tip normals point out. Still unexplained; next suspects: the body's rendered fingertip (subsurf
     level 1, armature) poking through the 2.2 mm gap at the nail (a test needs an inside / outside test against the
     solidified glove, not the nearest-face normal), or the solidify's inner shell at the tight tip. OPEN.
  6. Speed hooks (FOLLOW-UP): not done (budget). OPEN: `boots.py` speed-hook block, lip about 8 mm proud and 6 mm
     long, open toward the top, lace wrapped round it.
  7. Dark piece under the far-leg hem (FOLLOW-UP): not identified (budget); with the longer leg the quick `h` render
     still shows a small dark shape below the far hem. OPEN.
  8. Glove knuckle outline (FOLLOW-UP): not done; `fitted.level_slice` is ready to cut `gloves.py` along `g_knuckle`
     and `gt` the same way as the boots. OPEN.
- Fix round 2 result (full rebuild `E2E_GPU=1 npm run operators:build -- wren --render`, RTX 4090; then
  `operators:export`): `E2E_GPU=1 npm run operators:check -- wren` "5 item(s), all checks pass" (boots edge length
  29.5 mm <= 30; seam gap trousers 5.1, shirt 8.4 mm worst frame); `npm run check` exit 0 (761 tests, 0 lint errors /
  38 warnings). Own read: boot panel edges are clean curves with a stitched turned edge in `wren-boots-c`, `-e`, `-f`
  and `wren-trousers-h`; the near-leg hem laps over the boot collar with no leggings showing (`h`), though it bunches
  a little over the tongue top (x 860-920, y 600-640); the toe still reads broad-nosed from the low `h` angle at 61 %;
  the fingertip dot (item 5), the boot brightness in `a` (item 4, partly) and items 6-8 stay OPEN as above.
- Fix round 3 (checker list `steps/06-fixes-r3.md`, last round):
  1. Fingertips (MUST): diagnosed with quick 64 spp renders of view c (scratchpad `rc.py`): hiding the body changed
     nothing (no poke-through); hiding the stitches did not remove the dot; turning the hero's solidify off did. A
     test of the solidified mesh found 149 inner-shell vertices 0.9 mm OUTSIDE the outer surface: folded vertex fans
     (inverted vertex normals) on the nail side about 14 mm back and at the little-finger web, so the solidify pushed
     its inner wall out through the glove - the dark dot / spike. The ringed disc and crescent were the body's nail
     plate printing through the fit (the push off the skin lifts the glove over the nail's U outline) plus the patch
     edge and the fourchette wrapping the ring and little finger ends. Fixed in `gloves.py`: `untangle` relaxes
     folded fans (before and after the overlay lift) until no face normal opposes the smoothed vertex normal; the
     last segment of every finger is ironed (12 Laplacian passes blended into the fixed hand) and re-cleared by
     1.3 mm (the 0.9 mm wall plus margin); every finger end is capped by leather with a smooth U edge 10 mm back on
     the nail and 22 mm down the pad (tip patch on thumb, index, middle; the palm wraps the ring and little finger
     ends, so no knit disc and no seam or stitch row at the extreme point); tip step 0.3 mm (was 0.6). Quick render:
     closed rounded tips, no dot, no rimmed disc; a soft stitched U edge on the nail.
  5. Knuckle panel edge (FOLLOW-UP, same fix): the knuckle and fingertip panels are now cut with `fitted.level_slice`
     along their fields (the knuckle field limited to the back of the hand by `0.3 - sidev`) instead of the Newton
     snap, which slid vertices past their neighbours. Found the cause of the wavy edge: the label loop's `lc` (a
     normal component) overwrote the knuckle pad's centre line `lc` that `g_knuckle` and the flex-channel rows read;
     renamed `lcf`. The pad now spans all four knuckles with straight edges; overlays lift along smoothed normals.
     OPEN: the full-width pad shows a crumpled patch over the ring / little knuckle (quick `c` render x 840-900,
     y 780-840) and about 30 inner-shell vertices still invert near the little-finger base (`untangle` stops with
     10-18 left after the lift). Next: lower the pad lift at its little-finger end (taper `pad` by `latp`), or
     untangle with more rounds on the knuckle region only, and re-test with the scratchpad `inner.py` probe.
  2. Toe blunt at close range (FOLLOW-UP): OPEN, not started (budget, last round). Next: less sole flare and a
     thinner rand round the toe, more toe spring, the toe-cap top falling to the tip (`boots.py` rand_g, sole
     outline); done when `wren-boots-c` and `wren-trousers-h` read as a low-profile tactical toe.
  3. Trouser ankle at the boot (FOLLOW-UP): OPEN, not started. The near-leg ankle tab balloons (h, x 940-1060,
     y 470-610), the hem bunches over the tongue top (x 860-920, y 600-640), the small dark piece under the far hem
     (x 205-220, y 555-575) is still unidentified. Next: sew the tab flat (pin its vertices to the leg surface in
     `trousers.py`), lower the hem's front over the tongue, find the piece by object / face index at that pixel.
  4. Speed hooks (FOLLOW-UP): OPEN, not started. Next as r2 item 6 (`boots.py` speed-hook block: lip about 8 mm proud,
     6 mm long, open toward the top, lace round the post); `wren-boots-e` top stations.
  - Round 2 item 4 (boot brightness in `a`): CLOSED by measurement (round 3 checker): in `wren-boots-a` the boot
    shafts read 0.07 against the leggings' 0.06-0.08 (mean display value); only the upward-facing toe caps are bright
    (0.23-0.24), darker than the floor beside them (0.49) whose albedo is 0.012 against the suede's 0.027. The bare
    clay feet in `wren-gloves-a` light the same way: the stealth key on upward faces is the cause, not the material.
- Fix round 3 result (full rebuild `E2E_GPU=1 npm run operators:build -- wren --render`, RTX 4090, renders 12:04-12:11;
  then `operators:export`): `E2E_GPU=1 npm run operators:check -- wren` "5 item(s), all checks pass" (edge length
  gloves 23.29, boots / shirt / trousers 29.5 mm <= 30; seam gap 0 to 7.24 mm < 10; gloves deepestInsideSkinMm 0);
  `npm run check` exit 0 on the second run (761 tests, 0 lint errors / 38 warnings; the first run timed out three
  unrelated tests at 5 s - detailPass, pvp, voxel - under load). Own read: `wren-gloves-c` and `-e` show closed,
  rounded fingertips with no dot, disc or dark ring; the tip patches end in a stitched U on the nail and pad; the
  knuckle pad spans the four knuckles with straight edges but crumples over the ring / little knuckle (OPEN above).
- Checker round 4 (final): PASS. `operators:check`: 5 items, all pass (seam gap base_layer 7.24, gloves 0, boots 0,
  shirt 5.9, trousers 5.0 mm; edge length base_layer 7.68, gloves 23.29, boots / shirt / trousers 29.5 mm, limit 30; no
  solidify spikes; albedo and roughness in band). `npm run check`: 761 tests, 0 lint errors, build OK. Further OPEN:
  7. OPEN - check gap: the solidify check only catches an inner shell more than 2 x thickness from the outer, not
     inverted inner-shell vertices pushed outside the outer surface (the cause of the fingertip dot); about 30 remain
     near the little-finger base. Next: fix the glove there, then add an "inner shell outside the outer" test to
     `check_garment.py` (adds a check, loosens nothing).
  8. OPEN - sole lugs are two brick clusters with no distinct heel-brake bar (`wren-boots-f`); on both legs the hem
     sits behind the top of the laces / tongue instead of over it (`wren-trousers-h`).
- Status: passed the independent check (fix rounds: 3).
