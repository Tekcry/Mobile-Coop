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

## Step 07 - Wren: hood, optic, mount and comms head kit (Opus 5.5)
- Built (DECISIONS A24: fitted, not simulated): `py/garments/head_common.py` (head frame measured by rays: crown
  centre, eye and chin heights, neck axis; the ray grid `capsule`; `membrane`, a knit stretched along fixed rays;
  the harness strap planes `straps` / `strap_spans`; solids `rbox`, `pad`, `taper`, `knurl`; `cable_dir`),
  `py/garments/headwear.py`, `py/garments/head_kit.py`. `GARMENTS.wren` += `headwear`, `head_kit` (both `FITTED`);
  `build_fitted.py` writes each item's extra kit ids (`res['kits']`) as the sim report's patches.
- Headwear (kit hood + balaclava): balaclava 1.6 mm off the skin and the mock neck, bridging the eye sockets and the
  mouth (low cling on the face: no face under it, D4), its neck tucked 16 mm inside the shirt collar (968 vertices held
  inside); two panels with a cover-stitched flatlock seam down the centre line; one eye port (100 x 31 mm) with a turned
  edge, a bound rim and a lining in shadow. Hood 4.5 mm over it (7.5 mm at the back), three panels with topstitched
  seams, rolled stitched hems at the face opening and the skirt (laps 24 mm over the collar), dented 1.4 mm under the
  strap planes, a rear shock-cord channel above the cradle with gathered pleats, two eyelets left of the crown strap,
  cord, cord lock and knotted tail; a soft ridge on the left of the neck over the earpiece cable. 1,591 stitches over
  1.59 m of seam rows; 72.6k faces. The base layer's flared mock neck is drawn in under the collar (A25, 19k vertices).
- Head kit (kit headHarness + crownStrap, sideStraps, chinStrap, flipMount, goggle, batteryPack, batteryStrap,
  goggleCable, earpiece, earpieceCable): polymer front plate, padded Cordura rear cradle (stitched edge), crown strap
  0.24 m, side straps 0.18 m each through ladder locks with doubled-back tails, chin strap 0.43 m on D-rings with a
  side-release buckle on the left; anodised flip mount (shoe on two bolts, pivot barrel, detent lever, flip arm with
  a taped knurled height knob, carriage with the fore-aft knob on the goggle's dovetail rail); the square
  single-shroud goggle (100 x 46 x 48 mm housing with a nose notch, shroud lip round two objectives, bezels, coated
  lenses glowing green (class `lens`, A26), rubber eyecups sealing on the eye port (14 mm eye relief), a mode switch,
  a muted amber status light); flip up -170 deg (largest flip with 5 mm clearance, stored on the flip parts); battery
  pack with screw cap and a retention strap with a hook-and-loop tab; goggle cable 0.28 m over the crown strap, clips
  at 0.09 / 0.18 m, strain relief boots, into the mount shoe; earpiece in the left ear, boom mic 0.12 m under the hood
  edge with a foam windscreen; earpiece cable 0.44 m from a plug at the left collarbone, collar clip, under the hood
  skirt and the balaclava edge (kit data re-measured, A27). 26.9k faces, 184 stitches.
- Pipeline: `build.mjs --from <garment>`; `render_garment_test.py` head views (c front, e side, f back; head kit also
  g goggle, h optic up, i darkness lit by the glow only) and `--quick`; `check_garment.py` class `lens` and three head
  measuring views (A26); `export_gltf.py` flat factors for the new materials; the Lab hides the glow stand-in when the
  model has the `goggle lens` material (step 04 open item 4).
- Results: `npm run operators:check`: 7 items, all checks pass (headwear and head_kit seam gap 0 (fitted), edge length
  29.5 mm each, no solidify spikes, every new material sampled in band; goggle lens roughness 0.06 in the new `lens`
  band). `npm run check`: exit 0 (761 tests, 0 lint errors / 38 warnings, build OK; the Lab change re-typechecked and
  linted on its own after). Renders (RTX 4090, Cycles 384 spp, E2E_GPU=1): `docs/operators/mockups/tests/
  wren-headwear-*.webp` (6), `wren-head_kit-*.webp` (9).
- Open (implementer's own read; for the checker):
  1. The base layer's mock neck flares through the shirt collar at the nape (step 05 build); hidden under the head
     items by A25, the real fix is the base layer's neck band.
  2. The goggle sits forward on a long flip arm (eye relief 14 mm plus a 46 mm housing); flipped up (-170 deg) it
     stands high over the forehead. A shorter arm / lower pivot would read more compact.
  3. The darkness view frames the head small in the upper half (`wren-head_kit-i`); the lenses read clear green, the
     glow throws little light on the face.
  4. Close-ups still render the near-black materials as mid grey (step 06 open item); the hood ridge from the ear
     down the neck (the knit tenting over the ear) is strong in `wren-headwear-e`.
  5. The earpiece cable ends in a plug at the left collarbone until step 09 builds the PTT there.

### Step 07 fix round 1, PART A (fixer, Opus 5.5; items 4-9 of steps/07-fixes-r1.md; items 1-3 are PART B, D19 / D20)
- **4 Lens (done).** New `head_common.lens_assembly` (housing-agnostic, kept by D20): a 7.5 mm barrel out of the
  housing face with a chamfered lip, a retaining ring, the glass seated 6.5 mm below the lip and domed 2.8 mm.
  `materials.lens`: clear coat (0.03) over glass (roughness 0.05, IOR 1.52), thin film 380 nm, deeper green
  (0.004, 1.0, 0.045) at strength 1.1 weighted per vertex (`emit`: 1 at the centre, 0.25 at the rim). The quick render
  shows a saturated green dome with a specular highlight and the barrel's depth (was a flat pastel disc). Export sets
  the lens emission strength to a constant 1 (glTF has no per-vertex weight; the Lab sets its own emissive colour).
- **5 Chin strap (done).** `head_frame` measures the chin point and the skin 13 mm behind it (`chin_pt`,
  `under_chin`); the chin plane passes there (the old target, neck_y - 0.05, lay on the throat; its 12 mm off-plane
  shift is gone). Measured at the centre line: 2.8 mm behind and 11.6 mm below the chin point (`chinStrapBehindChinM`,
  `chinStrapBelowChinM`); the e view shows it along the jaw and under the chin.
- **6 Clipping (partly).** The shirt's render mesh poked up to 1.9 mm through the hood skirt at z 1.433-1.462 (measured
  by ray: shirt hero 22 vertices outside the hood). Now the skirt is pushed 2.6 mm clear of the shirt's render mesh
  (`collar_tree`) and the collar's 126 crumpled vertices at the nape are relaxed (`tame_collar`, like A25). Open: the
  quick f view still shows a rough skirt / collar edge at the nape; judge on the final f render.
- **7 Hood (sim attempt failed; fitted hood kept and tuned).** Trial `scripts/operators/py/trials/hood_sim_trial.py`:
  the hood's three panels (5432 / 3772 / 3815 vertices, 385 seam pairs) flattened (conformal, then minimum stretch)
  as the rest shape by A1's Dynamic Mesh method, sewn, balaclava and shirt as colliders. Six runs: with the skirt
  pinned, rest edges between pinned (arranged) and free (flat) vertices blew the cloth 1.1-1.5 m away at frame 2 (seam
  gap 145-464 mm); vertex mass 0.1 vs 0.004, 12 vs 30 substeps and tension 8-20 changed nothing. Unpinned and stable,
  the flattened dome panels pull short: seam gap 34 mm at frame 2 and 98 mm at frame 40, and 2359 of 2604 sampled hood
  vertices end inside the 1.6 mm balaclava (the A18 failure: a thin collider under strained flat panels). So A24 stays
  for the hood too (evidence added to A24). Fitted hood: behind the ears and down the neck the hood clings to the
  balaclava (cling 0.16 there, 0.04 elsewhere), the cable fold is 1.6 mm and broad (was a 2.6 mm narrow ridge); the
  channel gathers are short crisp pleats at an irregular pitch that die out about 1 cm from the channel and stop at
  its stitch rows (were 18 mm sine streaks across them). Open: the quick f view still has a dark smear on the channel.
- **8 Darkness view (framing done).** Camera at 0.42 m on the face, exposure 1.8. Open: at the lower lens strength
  the glow's spill on the eyecups and brow is barely visible; the lenses themselves glow clearly.
- Quick renders (48 spp, GPU) were the tuning loop; the final renders are the `--render` set in mockups/tests/.

### Step 07 fix round 1, PART B (fixer, Opus 5.5; items 1-3 of steps/07-fixes-r1.md as decided in D19 / D20)
- **1 No flip mount, two positions (done).** Flip arm, pivot, detent lever, height and fore-aft knobs, tape, the
  dovetail rail and the `flip` / `pivot` / `upDeg` data are gone (`head_kit.py`); the original square housing, lenses
  (PART A `lens_assembly`), eyecups, mode switch and amber light are kept (D20). The goggle hangs on a 22 mm elastic
  band through a D-frame lug on each side (A29): in use over the eyes (eyecups on the eye port, the build's pose) and
  stowed on the brow (44 mm up, tipped back 16 degrees, resting on its eyecups 1.6 mm off the hood, housing 4.9 mm
  clear; `stowM`). Band 0.52 m in use, 0.53 m stowed; its cable from the pod outlet to the left lug 0.26 m in use under
  keepers at 0.07 / 0.14 / 0.21 m (kit data updated). `render_garment_test.py` swaps to the stowed pose for h
  (`h-closeup-goggle-stowed`, replaces `h-closeup-optic-up`, deleted) and j (`j-closeup-stowed-side`); c, e, f, g and the
  darkness view i show it in use.
- **2 Harness = options-pass strap 2 (done).** `head_common.straps` gains two fork planes (`forkL` / `forkR`, 18 mm):
  from the hard brow plate's top over the crown, 24 mm either side of the centre line, to the hard rear pod's upper
  corners (0.237 m each). Side straps 20 mm (0.179 m) with low-profile anodised cam buckles 50 mm behind the plate,
  tails doubled back; bar tacks 30 mm from every anchor plus box stitching; rivets through the side strap tabs on the
  plate; a fork junction block. The rear is a hard polymer shell with a sculpted bent battery body (84 x 46 x 14 mm),
  two ribs, a knurled screw cap on the right and a cable outlet boss on the left (no cordura cradle, no retention
  strap). Chin strap as PART A placed it. The hood dents now follow the forks, side straps and chin strap (the old
  centre crown strap dent is gone); the cord lock moved to the centre line between the forks (A29).
- **3 Housing (withdrawn by D20).** The original square housing is kept, as Michael picked.
- Results: `npm run operators:check -- wren` (E2E_GPU=1): 7 items, all checks pass; `npm run check`: lint 0 errors
  (38 warnings), 73 files / 762 tests pass, build ok.
- Docs and data: SPEC 2 / 3.3 / 5.1 (Wren and Moth head rows), the wear line (tape on the mode switch; not modelled
  yet) and the generated-parts line; SPEC 7 has no flip-mount rows (checked). `kit.ts`: Wren `flipMount` -> `goggleBand`
  (strap, anchors on the goggle's lugs), harness, crown / side straps, goggle, battery pod and goggle cable rewritten,
  `batteryStrap` removed; Moth `flipMount` -> `goggleBand`, chin strap job and goggle "where" only. New Vitest
  (`tests/operators.test.ts`): no flip mount, the band is a strap anchored twice on the goggle. README, export comment.
- Renders (E2E_GPU=1, 384 spp): docs/operators/mockups/tests/wren-headwear-{a,b,c,d,e,f}-*.webp and
  wren-head_kit-{a,b,c,d,e,f,g,h,i,j}-*.webp.
- Open: the band's right rear run bunches slightly where it enters the channel under the pod (f view); the in-use band
  bridges about 5 mm off the hood over the ear (by design of the hull, reads stiff); PART A's nape skirt / collar edge
  and the dark smear on the rear channel (view f) were not worked in PART B (budget); the SPEC wear tape on the goggle
  is not modelled; Moth's kit still says "pack to mount" for its goggle cable and keeps `batteryStrap` (step 13).

### Step 07 fix round 2 (fixer, Opus 5.5; items 1-3 of steps/07-fixes-r2.md; items 4-7 logged OPEN)
- **1 Goggle band (partly done).** `head_kit.py`: the band's centre line is now the convex hull of its plane section
  *and the two lugs* (`_band_path`: straight free spans from the lugs to the first contact), pulled back towards the
  head wherever it bridged by more than `BAND_BRIDGE` (1.8 mm), normals leaned to the surface; its edges may press up
  to 2.5 mm into the loose hood (`_lift_clear(edge_clear=)`), and the hood (and its stitches) is pressed in under the
  band (`_dent_field`: 1 mm where it lies on the hood, more where an edge would cut it; 460 hood vertices; not under
  other harness parts). The stowed run's dent is a per-vertex `stow_delta` attribute that `render_garment_test.py`
  applies for h / j (not exported: glTF attributes are off). Cable: a 2.6 mm cord (`CABLE_R`, was 4.2 mm) seated on
  the band's outer face (was 2.4 mm proud); keepers are sewn 8 mm webbing loops arched over the cord with a bar tack at
  each end (were solid 9 x 18 x 6.6 mm blocks). Measured (`wren-head_kit-sim.json`): in use band 0.54 m, cable
  0.272 m, keepers at 0.068 / 0.143 / 0.218 m, `maxStandoffM` 6.9 mm (was 10.9 mm before this round's pull);
  stowed band 0.53 m, cable 0.256 m, `maxStandoffM` 2.8 mm. Kit data (`goggleCable.length` 0.26) kept: within 1.5 cm.
  Left: the in-use band still reads straight in the side view (its plane is seen edge-on; a real band is planar too)
  and stands off over the temple between the face opening and the ear, where the hull runs over the balaclava inside
  the face opening and the hood's face-opening hem (the hem tube is not in the band's surface: it may show through
  the band there); the rear run right of the pod still bunches where it enters the channel (f). Next: build the band
  surface from hood + hem + harness (not the balaclava), solve the band as a relaxed strip (shrink plus collision,
  per edge) instead of a planar hull, and route it under the pod by a guide point.
- **2 Nape (worked).** `headwear.py`: the hood skirt is faired from the collar line down (14 Laplacian rounds; it had
  followed the crumpled collar shell along the rays) and the shirt's render meshes inside the skirt are tucked 2.6 mm
  under it (`tuck_collar`, like A25; 1201 vertices; the shirt is not rebuilt), then the old hero push-out runs as a
  safety. Render: the crumpled flap left of the nape is gone (`wren-headwear-f`), but the shirt collar's own wavy,
  lumpy rim still shows below the skirt edge (f, lower third) and a small notch remains at the back of the neck in e.
  Left: tame the collar rim below the skirt (or extend the skirt a few mm lower at the nape).
- **3 Streak behind the left ear (worked).** The hood's cling now eases in (`smoothstep` on |D.x| and height) instead
  of a hard 0.04 / 0.16 step at |D.x| = 0.45 that creased a jagged line down the hood behind the ear. Render
  (`wren-headwear-e`): the jagged line is softer but a shading crease still follows the back of the ear bulge. Left:
  smooth the hood normals there or lower the cling behind the ear.
- Accepted follow-ups (OPEN, from the round 2 checker):
  4. OPEN - rear channel gathers read as a soft smudge, not pleats (`wren-headwear-f`, above the cord lock). Reason:
     not a fail; the hood stays fitted (A24 holds the sim attempt). Revisit with the torso kit or a hood pass.
  5. OPEN - chin strap side-release buckle sits at cheekbone / ear-top height under the band (`wren-head_kit-j`, `e`).
     Reason: budget went to items 1-3. Next: move the buckle along the chin span to the jaw line (`head_kit.py`, chin
     strap block).
  6. OPEN (note) - darkness view `wren-head_kit-i`: the lenses glow (D13 met) but the spill on the eyecups and brow is
     not visible. Reason: note only.
  Results: `E2E_GPU=1 npm run operators:check -- wren`: 7 item(s), all checks pass; `npm run check`: lint 0 errors
  (38 warnings), 73 files / 762 tests pass, build ok. Renders (E2E_GPU=1, 384 spp):
  docs/operators/mockups/tests/wren-headwear-{a..f}-*.webp and wren-head_kit-{a..j}-*.webp.
  7. OPEN - Moth kit text for step 13 (`src/operators/kit.ts`, Moth): `goggle.attach` "dovetail into the mount" and
     `headHarness.job` "carries the goggle mount" (no mount exists, D19), plus `batteryStrap` and goggle cable "pack to
     mount" (already logged). Reason: Moth is step 13.

### Step 07 fix round 3 (fixer, Opus 5.5; items 1-2 of steps/07-fixes-r3.md; the rest logged OPEN)
- **1 Goggle band (done).** `head_kit.py`: the band is now a relaxed elastic strip (`_relax_band`), not a planar hull.
  It starts from the plane section's hull (`_hull_run`, outside everything) and, coarse (12 mm) then fine (5 mm),
  shrinks (each free point moves halfway to its neighbours' mean: tension) under per-edge collision by rays along its
  normal (`_band_heights`: left edge, middle, right edge) against the hood (it presses `BAND_SINK` 0.8 mm into it), the
  hood's face-opening hem (0.1 mm), the harness without the pod (0.2 mm) and the balaclava (2.5 mm; safety only, not
  the support surface); its normal follows the soft surface under it. Pinned: each end on its lug's bar and 6 mm
  straight off it along the goggle's side, and a guide point on the hood under the pod (it enters the channel there).
  Where it still bridges a hood hollow by more than `BAND_BRIDGE` (2 mm) it pulls the loose hood in with it (never
  closer than 0.2 mm to the harness, 0.1 mm to the hem, 2.4 mm to the balaclava). The hood (and its stitches) is dented
  under it (`_dent_field`: at least 0.2 mm under its underside, a 1.2 mm pulled dent fading 6 mm off each edge). Each
  end is one continuous webbing: the run, round the lug's bar, returned 22 mm under the band (gathered to 19.5 mm for
  the lug's slot), a bar tack through both layers and two stitch rows (`_strip_w`, `LUG_W`, `RET_L`). The cable leaves
  the band 26 mm before the left lug over its top edge into a plug on the housing's side above the lug (it ended in a
  knot at the lug). The band's stitches and keepers' tacks are per pose (`band_st`, `band_s_st`: the stowed set floated
  in front of the face in the in-use renders). Two harness parts the band rode over moved: the chin strap's
  side-release buckle down the left riser to the jaw (51 mm below the eye line; it was at cheekbone height under the
  band, which stood 7.5 mm off beside it: item 5 of round 2 closed) and the side straps' cam buckles to 32 mm behind
  the plate, the nearest point where neither band run crosses them (the stowed band rode over the lever and stood
  4.2 mm off beside it). Measured (`wren-head_kit-sim.json`; standoff = the band underside's centre above the top
  surface of hood + hem + harness, along its normal, over the contact run): in use `maxStandoffM` 2.0 mm (was 6.9),
  mean 0.2 mm, band 0.564 m, contact 0.27 m (0.332 m is the stowed value; corrected by the orchestrator); stowed `maxStandoffM` 2.5 mm (was 2.8 by the old nearest-point metric),
  band 0.588 m; boom mic 8.9 mm clear of the band (`boomBandClearM`, was 0.2 mm); hood dent 357 vertices. Cable in use
  0.288 m, keepers at 0.072 / 0.144 / 0.216 m: kit data updated (`goggleCable.length` 0.29, keepers 0.07 / 0.14 / 0.22,
  "where" says it plugs into the housing side). Renders: in `e` the band lies on the hood from the face opening to the
  pod with no shadow gap and a slight curve over the temple and ear; in `g` the lug end is one clean wrap and return,
  the cable leaves over the band's top edge; `f` enters the channel flat beside the side strap.
- **2 Nape (done).** `headwear.py`: the hood skirt ends `SKIRT_BACK` (10 mm) lower behind the neck (`skirt_cut`, eased
  in from the sides; the capsule grid runs 10 mm lower), and the skirt's back is faired again after the push-out from
  the shirt's render mesh (that push raised two small darts over the collar's crumples), then the shirt is tucked under
  the final skirt (`tuck_collar`, per-vertex edge height; 1251 vertices); the shirt is not rebuilt. Render
  (`wren-headwear-f`): the edge at the nape is the skirt's own clean hem lying on the shirt; `e`: no notch at the back
  of the neck.
- **Check (resolved by an extra measuring view, option (c); no threshold or rule changed).** After item 2 the full
  check failed on headwear and head_kit: `sampled:compression knit: 30 (>= 150 pixels over the views)`. The base
  layer's knit had only shown in those items' views at the back of the neck between the old skirt edge and the shirt
  collar (2547 px at `SKIRT_BACK` 0, 30 px at 10 mm): the "wavy collar rim" was partly the base layer's mock neck.
  Probed 20 candidate views on the full head stack (base-layer px): right wrist from below 855, waist from low front
  210, left wrist from below 175, left wrist outside 13, waist front 7; throat, nape, neck side, ankles, armpit,
  wrists from the front / inside 0. `check_garment.py` gains a twelfth view, the right wrist from below (up the sleeve
  opening: the base layer under the cuff). Single-item checks: headwear and head_kit compression knit 885 px, albedo
  P1 / P50 / P99 0.036 / 0.038 / 0.041, roughness 0.9: pass. Recorded as A30 (orchestrator, after the round 4 checker).
- Results: `E2E_GPU=1 npm run operators:check -- wren`: 7 item(s), all checks pass. `npm run check`: lint 0 errors (38 warnings), 73 files / 762 tests pass, build ok. `npm run
  operators:export` ok. Renders (E2E_GPU=1, 384 spp): docs/operators/mockups/tests/wren-headwear-{a..f}-*.webp and
  wren-head_kit-{a..j}-*.webp.
- Housekeeping: the module global `DBG` and the unused `_band_path` / `_lift_clear` are gone from `head_kit.py`.
- Open follow-ups (not fails; the round 3 checker's list):
  3. OPEN (accepted) - behind-ear crease: a soft shading crease still follows the back of the ear bulge
     (`wren-headwear-e`). Next: smooth the hood normals there or lower the cling behind the ear (`headwear.py`, `side`).
  4. OPEN - rear channel gathers read as a soft smudge (unchanged, see round 2 item 4).
  5. CLOSED - chin strap buckle: moved to the jaw in item 1 (above).
  6. OPEN (note) - darkness view spill on the eyecups and brow not visible (unchanged).
  7. OPEN - Moth kit text for step 13 (unchanged, see round 2 item 7).
- Checker round 4 (final): FAIL - the earpiece cable runs through the neck (steps/07-fixes-r4.md, MUST 1): from the
  left collarbone plug it passes 8-38 mm inside the skin through the throat (z 1.434-1.448), comes out on the right at
  (-0.064, 0.041, 1.46) 0.3-5.4 mm outside the hood, and goes back through the neck (up to 14 mm inside) to the left
  ear. Likely cause: `head_kit.py` ~501-507, `HC.ray_in(sh_tree, ..., 0.2)` casts reach 0.3 m and hit the far collar
  where the left-front collar is low. It predates round 3; round 3's lower skirt made it visible (`wren-head_kit-f`).
  Round 3's MUST items passed (band in use 2.0 mm, stowed 2.5 mm; nape clean); the twelfth check view is legitimate
  (A30). operators:check 7 items pass; npm run check passes.
- Status: OPEN after 3 fix rounds; evidence: steps/07-fixes-r4.md; remaining: the earpiece cable route through the neck
  (MUST); follow-ups 3 (behind-ear crease), 4 (rear channel smear), 6 (darkness glow spill), 7 (Moth kit text for step
  13); near-black materials render mid grey in close-ups. Retried at the Wren block end (after step 11).

## Step 08 - Wren: plate carrier, harness and belt (Opus 5.5)
- Built (DECISIONS A32-A35: fitted, not simulated): `py/garments/torso_common.py` (`Plate` map and `fit`-able rigid
  slab `slab`, laser-cut `perforated` sheet and `slot_mask`, `Ring` - per-row convex hull of the pressed fabric with
  armpit outlier rays dropped - `band_slab`, `padded_strap`, `compress`), `py/garments/carrier.py`, `py/garments/belt.py`;
  `GARMENTS.wren` += `carrier`, `belt` (both `FITTED`); materials `laser-cut laminate`, `cummerbund elastic`, `kit polymer`
  (`materials.py`); kit item `carrierRelease` (`kit.ts`, test line in `tests/operators.test.ts`).
- Carrier: front plate bag 212 x 273 mm with a shooter's cut, top at 1.358 m, rigid slab fitted to the shirt (tilt 3
  deg, radius 0.6 m, bow 0.9 /m; mean gap 24.5 mm, up to 58 mm over the upper chest: it rests on the bust); back bag to
  1.404 m (gap mean 13.7 mm). Laser-cut laminate faces (30 x 5.5 mm slots, 25.4 mm rows, 38 mm pitch), bound rounded
  edges, stitched. Padded 40 mm shoulder straps on the shoulder's convex hull (length 0.37 m), ladder lock on a 25 mm tab
  from the front bag's top edge, tail rolled and banded, box-X at the back; inner edge 98 mm off centre, 7.3-8.4 mm from
  the hood skirt, 13.9 mm from the earpiece plug (left). Elastic cummerbund 140 mm (arc 0.35 m a side), tensioned:
  each row is the hull of the ribs and the bags' inner faces, so it runs straight from under a bag's side edge to the
  ribs (bridging the air gap under the plate resting on the bust); its ends tucked under the bags, closing under the
  front bag's lower flap; quick-release pull loop in a sleeve with its cable into
  grommets. Front: three magazine pouches (magazines 36 mm proud, shock cord, pull tabs, tipped out 4 mm at the bottom),
  trapezoid zipped admin pouch (1.29-1.35 m). Left cummerbund: radio pouch, radio (two knobs, connector boss, antenna
  bent down in an elastic loop). Right: medical pouch (lid strap, quiet buckle, pull tab). Back: flat padded drag
  handle, bungee loop on two anchors with a pull tab, moulded butt cup low right.
- Belt: inner belt 38 mm (hook-and-loop face) over the trouser loops (lifted up to 9.0 mm where a loop stands, eased
  along the row; circumference 0.97 m), outer belt 44 mm with a laminate face and one slot row, bound and stitched; two-part metal quick-release
  buckle at the front (female frame, sprung latch with grip ridges, male tongue, bars); three grenade pouches front left
  (flap, snap; the hip one tipped out 9 mm to clear the hip), double pistol magazine pouch front right, rolled dump pouch
  rear right (two elastic bands), knife sheath along the rear centre (grip to the right, snap strap, two belt straps).
- Fabric under the kit (A33): shirt pressed at 16 840 vertices (max 2.5 mm; 337 vertices where a part sits up to 4.6
  mm into the shirt, under the bags); trousers pressed at 4 864 vertices (max 2 mm; 675 vertices
  where the inner belt sits up to 8.3 mm into the trousers - not located yet, hidden under the belt in the renders).
- Tooling: `npm run operators:check -- wren --only <item,item>` (check.mjs `--only`; README) for the tuning loop.
- Renders: render_garment_test.py views for `carrier` (c front pouches, e shoulder strap and hood / plug clearance, f
  back panel, g / h cummerbund left / right, i silhouette against two rim lights) and `belt` (c front, e back), plus the
  a / b / d full views; docs/operators/mockups/tests/wren-carrier-*.webp, wren-belt-*.webp.
- Checks: `npm run operators:check -- wren` 9 items, all checks pass (carrier, belt included; every material sampled);
  `npm run check` passes (lint 0 errors, 762 tests, build).
- Open / follow-ups: near-black materials still render mid grey in close-ups (OPEN since step 05); the front plate
  stands up to 58 mm off the upper chest (rests on the bust, A32) - judge on the sheet; small ripple in the cummerbund
  where its rows switch from the ribs to a bag's face; the inner belt's 8 mm overlap with the trousers (above) to be
  located; drop-leg hanger, radio cable and PTT are step 09.
- Checker round 1: FAIL (steps/08-fixes-r1.md): front plate stands up to 58 mm off the chest (MUST), shirt shows no
  compression or puff beside the straps and cummerbund (MUST), inner belt up to 8.3 mm into the trousers, cummerbund
  ripple. operators:check 9 items pass; npm run check passes; the `--only` filter is accepted (selects items only).
- Status: OPEN, superseded by D22 (Michael's stealth-operative direction, before any fix round): not fixed, because the
  carrier and belt are expected to be replaced. The generators (`torso_common.py`, `carrier.py`, `belt.py`) and the
  `--only` filter are committed for reuse.


## Step 08a - Wren: stealth suit (Opus 5.5)
- Note (orchestrator): the first record below predates the fix rounds; its waist lap (A43) is superseded by the sewn
  waist (A48) and its seam gap (7.8 mm) is now 9.76 mm. A43-A47 were committed early, in the D25 doc commit (6f1e536).
- Built: `py/garments/suit.py` (kit `suit`; `KIT`, `SIM`, `draft`, `prepare_body`, `finish`): the base layer's top and
  leg blocks in one garment, every seam style `bonded`, zones as pattern-space inserts (A44): grip (forearms, knees),
  abrasion (shoulder yokes, elbows, seat), stretch (inner elbows, rear shoulders), perforated vents (underarm side
  panels front and back, backs of the knees). Waist: lapped and sealed under a 10 mm bonded waist tape (A43; not sewn).
- Pipeline: `build_garment.py` calls a garment's `prepare_body` before the measure (A45: bust relaxed, 174 vertices,
  inward only); `garment_details.py` 'bonded' mode (no stitch rows or plateaus; tapes via new `fitted.tape`, 8 mm x
  0.6 mm rounded, along every seam line, insert outline, hem, cuff and the collar top), 'lapSeal' (1 825 vertices of the
  top's edge drawn down onto the leggings over 12 mm), garment `finish` hook, suit panel materials, no empty stitch
  object. Materials (`materials.py`): `suit_shell` (1.6 mm diamond emboss, near_fade 0.7-1.6 m), `suit_stretch`,
  `suit_abrasion`, `suit_grip` (hard), `suit_vent` (1.4 mm holes, 3.2 mm pitch), `seam_tape`; gunmetal anodised slider.
- Suit numbers: seam gap 7.8 mm before weld (sewing_force 16; 12 gave 10.5-11.3 mm with the longer top); top 3 cm
  longer than the base layer's, hem girth re-measured at its height (hem 0.846 m front, 0.875 m back, over the band
  0.919-0.955 m); cling bridge 50 passes; ankle cuffs 8.2-8.9 cm (lowest point; A38). Tapes 8.26 m on seams, 5.81 m on
  inserts, 0.89 m on edges. Zip 0.385 m, 158 coil elements, slider and flush puller in a garage at the collar top
  (1.445 m); thumb loops 2 (elastic, 0.3 mm off the skin, under the 2.2 mm glove).
- Layers (A37): `GARMENTS.wren` = suit, gloves, boots, headwear, head_kit. gloves.py / boots.py read `suit` as the
  innermost layer; headwear `collar_layer` / `mock_layer` (A46: balaclava inside the suit's mock neck, A25 draw-in on
  the suit with its tapes, zip and garage following); head_kit reads the suit collar; the earpiece cable falls back to
  the skin plus 4 mm where the ray misses the suit collar (route still step 09's). Old base_layer, combat_shirt,
  trousers, carrier and belt outputs moved out of build/operators/wren (they no longer match the layers).
- Kit (`kit.ts`): `suit`, `suitZip`, `thumbLoops` added; baseLayer, combatShirt, elbowPockets, armPocketL/R, softShell,
  buttPatch, trousers, kneePads, cargoL/R removed; hood and earpiece text for the suit collar. Tests updated
  (`operators.test.ts`, `operatorLab.test.ts` callouts now use `carrierShoulders`).
- Views: `render_garment_test.py` suit a / b / d, c collar-zip, e chest-waist, f underarm vent, g forearm-elbow, h knee,
  j knee-back-seat, k ankle cuff, i rim silhouette; on head_kit s1 / s2 collar under the hood (front, nape), s3 glove
  cuff, s4 ankle into the boot. `check_garment.py` +2 views (left underarm side, back of the knee and seat).
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS for gloves, boots, headwear, head_kit (full run) and suit
  (re-run with `--only suit` after the empty-thread fix: the full run failed `sampled:thread` on the suit's empty
  stitch object). `npm run check` PASS (762 tests).
- Open (seen in the renders, not fixed in this pass):
  1. Nape (s2): a short crumpled stretch of the collar-top tape shows just under the hood skirt at the back.
  2. Rear-shoulder stretch zone (s2, b): its outline is clipped by the raglan edge and the yoke line into hook shapes;
     needs a clean ellipse inside the sleeve back, sharing the yoke line.
  3. Yoke line on the front shoulders (c) shows only as short stubs.
  4. The waist lap tape reads as a horizontal line at the hips (front d, e): a sealed lap, but close to a waistband
     line; a sewn waist block (A43 undo) would remove it.
  5. Centre-back top of the leggings: a small dark pinch where the CB seam meets the band (j; partly under the lap).
  6. Abdomen relief still faintly reads through the suit at 0.6 m (e).
  7. Near-black renders mid grey in close-ups (OPEN since step 05); rakes kept at 8-12 W.

### Fix round 1 (fixers, Opus 5.5; two agents, the first ran out of budget)
Full rebuild `E2E_GPU=1 npm run operators:build -- wren --from suit --render` (RTX 4090), `npm run operators:export`,
`E2E_GPU=1 npm run operators:check -- wren` and `npm run check`: results below. Renders in docs/operators/mockups/tests/
(wren-suit-*, wren-head_kit-*), suit-only loop renders in the session scratchpad r1-r4.
- Item 1 waist (A48, A51): no lap, no lapSeal; the top's hem is split at the centre and sewn to the four leg tops
  (bonded, 8 mm tape). The "45-50 mm drift" was not a drop (panel heights within 1-2 cm of the base layer's; the
  centroid figure is the longer legs rising off their hem). The mock-neck collapse had two causes: the straight hem
  sewn to leg tops with a -3.5 cm front / +5.5 cm back rise (pulled the top's front down, folded a pinch at the CB),
  and the knit's ~12 % length shortening once the hem is held. Fix (A51): hem halves drafted on the leg tops' rise
  profile, leg tops on a smoothstep profile (legwear `top_curve`), top `knit_ease_v` +0.04. Collar top 1.447 -> 1.460 m,
  standing (c, r3/r4). Waist seam halves front 21.8 / back 22.3 cm, leg tops equal. d / a: the waist is one flush taped
  seam on a smooth curve, low at the CF; it still reads as a seam line at the hips (a bodysuit leg line, not a band).
- Item 2 nape: done. s2 and head_kit f: the hood skirt (40 mm lap, A49) lies over a smooth mock neck, no crumpled tape.
- Item 3 garage: done. s1: slider, puller and garage are under the hood skirt; the zip runs up under the skirt edge.
- Item 4 zones: partly. Rear-shoulder ellipse closed (s2, b); vent one ellipse across the side seam (f); insert tapes
  stop 0.55 tape widths from a seam (garment_details; was 0.75). LEFT: the yoke's 45-degree flare (suit
  `_yoke_outline`) leaves a bend and a short hook where its lines meet the raglan seams (s1 right shoulder, s2 both
  shoulders). Next: one smooth parabola outline y = y0 + k (x / hw)^2 that crosses the raglan seams steeply.
- Item 5 abdomen: mostly. A45 relax is now plain Laplacian (Taubin kept the 5-7 cm ridges), region up to chest + 2 cm:
  the ridges are gone in e (r4); two small symmetric dimples remain at about z 0.99 (e, 800 / 990, 740).
- Item 6 CB: mostly. Level waist seam at the CB, the pinch is gone; a small notch remains where the CB seam meets the
  waist seam (j, 1130, 185); the lumbar groove fill (prepare_body, outward 10 mm) lightened it but b still shows the
  lumbar hollow in the rake.
- Item 7 view f: done (first fixer).
- New, seen in d: a pale bulge at the crotch (the pinned gusset, A48) - check in round 2.
- Seam gap before weld: 10.5 mm in the full build (loop runs 9.3-10.5 mm; worst seam on the lower legs, outLoR /
  inLoR, not the waist).
- Checks (fix round 1 result): `npm run operators:export` exit 0; `npm run check` exit 0 (73 files, 762 tests, build;
  lint 38 warnings, 0 errors). `E2E_GPU=1 npm run operators:check -- wren` (full) FAILS, 9 checks, none weakened:
  1. suit `seamGap` 10.48 mm (< 10): sim variance (loop runs 9.3-10.5 mm), worst seam on the lower legs
     (outLoR / inLoR). Next: sewing_force 16 -> 18, or more sew frames.
  2. boots, gloves, headwear, head_kit `sampled:suit thumb loop elastic` 93 px (>= 150): the loops sit under the glove
     cuffs; fewer pixels than in the implementer's build. Next: widen the loop (9 -> 12 mm) or a view at the thumb web.
  3. headwear, head_kit `sampled:gunmetal` 0 px: the zip slider (the only gunmetal) is now under the hood skirt, as
     item 3 asks (A49). The check needs a decision (the material is hidden by design in those items' views); not
     changed here.
  4. headwear, head_kit `edgeLength` 36.49 mm (<= 30): new since A49's 40 mm skirt lap (headwear `skirt_lap`); find the
     stretched edge in the skirt and subdivide it or shorten the lap's reach.

### Fix round 2 (fixer, Opus 5.5; items 1-5 of steps/08a-fixes-r2.md; 6-8 not started, OPEN)
Full rebuild `E2E_GPU=1 npm run operators:build -- wren --from suit --render` (RTX 4090), `npm run operators:export`
(exit 0), `E2E_GPU=1 npm run operators:check -- wren` (full) and `npm run check`. Renders in docs/operators/mockups/tests/
(wren-suit-*, -gloves-*, -boots-*, -headwear-*, -head_kit-* incl. s1-s4); probes and crops in the session scratchpad
r2fix/ (crotch.png, skirt.png, tl/).
- Item 1 crotch: NOT DONE. The pinned gusset bridged the crotch past the cling's 25 mm reach; the cling now reaches
  70 mm for the gusset (`SIM['cling']['reach_panels']`, build_garment `cling`; A48 amended). The single rounded bulge
  is gone, but d / a (crop r2fix/crotch.png) still show two small lumps on the centre front seam between the waist seam
  and the crotch, with an under-shadow in a: likely the centre seams' excess length bunching against the pinned gusset.
  Laying the gusset onto the skin before pinning (`snap`) was tried and dropped: its edges no longer met the leg panels
  (gusFR 12.4 mm open). Next: shorten the front centre seam / rise by the bunched length, or release the gusset pin in
  the settle (`'settle': 0.3`) and re-measure the waist height.
- Item 2 thumb loops: DONE. Every ribbon vertex is laid back on the skin at its profile height (0.3 mm + 0.5 mm dome;
  width unchanged 9 mm, glove unchanged). tl_probe on wren-gloves.blend: 0 px in all four views; the check's
  `covered:suit thumb loop elastic` is 0 px in gloves, boots, headwear, head_kit.
- Item 3 seam gap: PARTLY. 9.76 mm in the full build (passes < 10, but not the 9.5 asked). Sewing force 18 made the
  settle worse (11.6 mm, inLoL) and is reverted to 16; the suit keeps 4 rings either side of a seam out of self
  collision (`SIM['seam_self_rings']`, default 2 for every other garment). Frame counts and settle length unchanged.
- Item 4 covered rule: DONE as specified (A52). `scripts/operators/py/covered.py` (COVERED table, pure logic, dry run
  `python scripts/operators/py/covered.py` shows `covered:` failing at 12 px and `ownCheck:` failing on a missing or
  unsampled owner JSON); check_garment.py adds `ownCheck:<name>` and `covered:<name>` from the covering item on. No
  threshold changed. It immediately caught a real fault: `covered:gunmetal` 773 px in headwear and head_kit (below).
- Item 5 edgeLength: DONE for the edges. The stretch was headwear `tuck_collar`: at the back-left shoulder the skirt's
  rays graze the suit's trapezius, so one vertex was tucked 34 mm in and its neighbour not at all. The tuck is now
  spread over the hero mesh (`_ease_tuck`, 60 relax passes within 4 cm of a tucked vertex, then cleared of the skin).
  edge_probe: 0 suit edges over 25 mm in suit, boots, headwear, head_kit; head stack longest suit edge 8.4 mm (suit
  alone 6.2 mm); the worst single edge grows 5.5x (1.2 -> 6.7 mm, back-left collar base). Check: headwear and
  head_kit `edgeLength` 29.5 mm (pass). Skirt front edge (5b): NOT DONE: s1 (r2fix/skirt.png) still shows the flat
  plate with a knife-thin edge standing off the suit.
- Items 6 zones, 7 abdomen dimples, 8 waist notches: not started (budget). The dimples still show in e.
- Checks: `npm run check` exit 0 (73 files, 762 tests, build; lint 0 errors, 38 warnings). `operators:check -- wren`
  FAILS 2 checks, none weakened: headwear and head_kit `covered:gunmetal` 773 px (0 required). The zip slider is the
  only gunmetal part, so it now shows in a check view of the head stack (the suit was re-simulated; the slider was 0 px
  in round 1). Next: `ck-r2/gm_probe.py` on wren-headwear.blend to find the view, then hold the garage and slider under
  the skirt (tuck_collar treats every `-suit-` mesh; the slider and garage are not eased with the hero).
### Fix round 3 (fixer, Opus 5.5; the last round, against steps/08a-fixes-r3.md)
Full rebuild `E2E_GPU=1 npm run operators:build -- wren --from suit --render` (RTX 4090), `npm run operators:export`
(exit 0), `E2E_GPU=1 npm run operators:check -- wren` (full: 5 items, all checks pass) and `npm run check`. Renders in
docs/operators/mockups/tests/ (wren-suit-a..k, -gloves-*, -boots-*, -headwear-*, -head_kit-* incl. s1-s4). Probes in
the session scratchpad r3/ (crotch_probe.py, profile.py, neck_probe.py; quick renders q1/, q2/).
- Item 1 crotch: PARTLY. Profile probe: the lumps were cloth, not skin (suit 12-19 mm off the real skin at z 0.80-0.84
  on the centre line, body monotone there). New membrane zone after the cling (A48 amended again,
  build_garment `membrane_zones`, suit `SIM['cling']['zones']`). crotch_probe (|x| < 6 cm, z 0.80-0.925, front):
  max off the faired skin (Taubin 150) 9.8 mm (was 19.3 / 24.3 below 0.82), 79 vertices over 6 mm, all in the lowest
  band z 0.80-0.82; z 0.82-0.925 at most 5.5 mm. Off the real skin max 13.3 mm (was 20.5). d / a: (crotch still OPEN: a rounded bulge with a cast shadow remains above the gusset in a and head_kit a) the stacked lumps
  and pinch are gone; a small rounded form remains just above the gusset (d 590-610, 790-830). OPEN: the 6 mm probe
  fails in the bottom 2 cm above the gusset. Next: widen the zone's draw-in into the gusset's top (z from z_crotch +
  0.01) or release the gusset pin in the settle (`'settle': 0.3`), re-check the seam gap (9.76 now, limit 10).
- Items 2 and 3 zip and skirt: DONE for the check, part visual. Cause: the suit's collar top is 23 mm lower at the
  front than at the nape, so the 40 mm lap covered 16 mm at the front. Skirt 20 mm lower at the front
  (`SKIRT_FRONT_SUIT`), zip parked higher with a 20 mm garage, the zip / tapes / slider / garage follow the hero's eased
  tuck, the skirt's edge band drawn onto the suit (A49 amended). `covered:gunmetal` 0 in headwear and head_kit (was
  773); gm_probe 0 px in all 120 views on wren-headwear.blend and wren-head_kit.blend. s1: no slider, garage or tape
  end; the left-front lip and gap are gone. OPEN: the lowered front reads as a tab with a corner each side (s1 about
  800, 600 and 1085, 610). Next: ease the front drop over a wider arc (smoothstep 0.0-0.9 of the front cosine).
- Item 5 A52: DONE (A52 amended). check.mjs orders items by their `under` lists (the full run checked suit, gloves,
  boots, headwear, head_kit); covered.py fails `ownCheck:` on an owner JSON older than its sim JSON (dry run case
  "owner JSON older than its sim JSON" fails). No LIMIT changed.
- Item 4 abdomen dimples: NOT DONE. An abdomen membrane zone was tried: held off the cling's faired skin the dimples
  stay (they are in the faired skin); held off the real skin they went but the rectus edges read (q1/e). Dropped.
  Next: in `prepare_body` raise the abdomen's inward clamp (8 mm) or fair the faired-skin copy there.
- Items 6 (collar / shoulder panel lines) and 7 (waist notches): NOT STARTED (budget). F12 not reached.
- Seam gap 9.76 mm (unchanged, < 10). edgeLength: suit 19.4, gloves 23.31, boots / headwear / head_kit 29.5.
- Checker round 4 (final): FAIL (steps/08a-fixes-r4.md). operators:check 5 items pass (seam gap 9.76; covered:gunmetal 0;
  ownCheck from this run's suit report); npm run check passes; check.mjs order and covered.py staleness only tighten.
  Fails on the renders: 1 crotch bulge with a cast shadow above the gusset (a, d, head_kit a; probe 9.8 mm vs 6);
  2 abdomen dimples (e); 3 broken panel lines (collar-base V, shoulder-yoke hooks, right raglan dog-leg: c, s1, s2);
  4 waist seam notches (e, j); 5 hood skirt front reads as a tab (s1); 6 lumbar groove and erector ridges read as
  anatomy (b). Further OPEN: F10 seam gap 9.76 vs 10 (seed risk); F11 5.5x suit edge growth under the skirt; F12 tape
  stubs (f, h, s3); F13 the side seam through the middle of the vent; a small dark sliver on the right boot collar (s4).
- Status: OPEN after 3 fix rounds; evidence: steps/08a-fixes-r4.md; remaining: items 1-6 above and F1-F13. Retried at
  the Wren block end (after step 11).

## Step 08b - Wren: composite armour and harness (Opus 5.5)
- Built: `py/garments/armour.py` (FITTED item `armour` after `head_kit`, A53; kit `chestPlate` + `ribSegments`,
  `backPlate`, `harnessShoulders`, `torsoSideStraps`, `magBuckle`, `weaponMount`) and `py/garments/mag_buckle.py` (kit
  `magBuckle`: two crowned gunmetal halves, 0.7 mm split line across the strap, on a rubber-edged base; `size(strap_w)`
  clamps 20-40 mm; reusable by steps 09 / 09b). `materials.composite` (matte resin, 2.4 mm fibre twill fading out past
  1.6 m, chamfers and the rim scuffed lighter via pointiness and the `edge` attribute; hard, roughness 0.60-0.64).
- Moulding (A54): the suit as a 3 mm height field front and back; features under 2 cm bridged on the ray-facing
  surfaces, row envelopes blended 30 % back, smoothed, never under the fabric's pressable depth; each plate a shell along
  that surface's normal. Chest plate 8 mm (neck scoop between two shoulder tabs), three 5 mm rib segments lapping as
  shingles (A55: 14 mm overlap, 5.8 mm step, internal two-strap web hidden), back plate 7 mm with top tabs. Edges: 2.8 mm
  ledge under a moulded rubber trim, 5 mm chamfer; radii 9 / 18 / 36 mm (A56).
- Back: radio recess x 0.030-0.086, z 1.256-1.317, 5 mm deep (boolean, triangulated); antenna keeper clip on the top
  edge at x 0.02; receiver bar 168 x 34 x 1.6 mm gunmetal on the spine (A57), three keyhole sockets through it (a fine
  snapped grid, `bar_mesh`, no boolean slivers), frames `weaponMount.backL/.backC/.backR` as empties and in the sim report.
- Harness (A58, A60): 25 mm laminate shoulder straps on the suit's convex hull (0.318 m), front magnetic buckle on each
  chest tab, bonded on the back tabs; three flat keepers on the left strap's neck edge at 0.07 / 0.20 / 0.30 m; 22 mm side
  straps (z 1.163-1.185, 0.24 m arcs, rows eased together) from a buckle on the chest plate's side to the back plate's
  side. Four buckles. Suit pressed in under everything (`suitPress`: 3 581 verts, max 2.5 mm, 0 capped, 0 mm into fabric).
- Numbers (`wren-armour-sim.json` measurements): `plateGap` chest mean 2.73 mm, max 10.45 mm (the bottom band that laps
  rib 1, by design 6.8 mm off), max above that band 6.05 mm at the sternum (0.001, 1.221), over the sternum 7.37 mm, into
  the suit 0.09 mm; ribs mean 4.80 / 4.76 / 1.75 mm, max 8.7 mm, 0 into the suit; back mean 3.98 mm, max 15.0 mm (spine
  groove at z 1.186), 0.12 mm into the suit. `ribLaps` 14 mm overlap, clearance 0.78-3.8 mm, each lower segment
  narrower than the one above. `plugClearM` chest plate 41.8 mm, left strap 14.5 mm; `hoodClearM` 32.1 / 7.2 mm.
  `backGearM` 0.022 m (receiver face behind the suit on the spine), plate 13.4 mm at z 1.25. Frames: origins on the bar
  at x +0.0736 / 0 / -0.0725, z 1.176, Z splayed +-0.08 rad, Y = +Y (out from the back).
- Pipeline: GARMENTS.wren += `armour`, FITTED += `armour`; `render_garment_test.py` armour views a / b / d plus c chest
  plate, e back recess and mount, f rib segments, h shoulder buckle, j side strap, g side, k back, i rim silhouette;
  `torso_common.compress` also reports `cappedAt` (additive). Kit (`kit.ts`): the seven items above; `carrier`,
  `carrierShoulders`, `cummerbund`, `backPanel`, `rifleBungee`, `carrierRelease` removed (Moth's untouched); tests updated.
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS, 6 items, all checks pass (armour: seam gap 0 fitted, edge length,
  solidify, every material sampled, albedo and roughness in class, `covered:gunmetal` 0 px, kitItems, validateKit).
  `npm run check` PASS.
- Renders (GPU, 384 samples): docs/operators/mockups/tests/wren-armour-{a,b,c,d,e,f,g,h,i,j,k}-*.webp.
- Open:
  1. The shoulder straps' front ends: a sliver of the strap end shows over the buckle's near half (h, wearer's left).
  2. The two outer keyhole sockets show small dark wall artefacts at close range (e), where the snapped grid walls fold.
  3. The back plate's lower band (under the receiver) reads slightly wavy in the raking close-up (e).
  4. The bust points still read faintly through the chest plate in the raking close-up (c); a plate cannot sit lower
     there without entering the suit (the suit lies on the skin at the bust).
  5. Wren's step 08 pouch items (`magPouches`, `adminPouch`, `radioPouch`, `radio`, `radioCable`, `ptt`, `medPouch`)
     still describe the carrier; step 09 rewrites them for the chest rig.
- Fix round 1 (fixer, against `steps/08b-fixes-r1.md`; armour only, the suit not rebuilt; A61):
  1. Side straps: each row's hull now holds the plates' outer surface every 1 mm (face, the chord over the chamfer to
     the trim, the trim's top out to its outer side), lifted to the row's world height (the face under the bust tilts
     down, so the map's z is corrected); the six easing passes never let a point inside its row's hull (radial clamp);
     the band's slab is extruded along its own surface normal (not the rows' horizontal one); the side buckle sits at
     the map z whose face point is at the band's mid height (it sat 5-8 mm low); the band's end is bonded past the near
     half's centre. `strapIntoPlateMm` added to the sim report (ray parity against the plates and their rim trims,
     buckle footprints left out): shoulderL / R and sideL / R all 0.0 (was 3.2 side, 1.1 shoulder). Renders f and c:
     the band leaves the near half in line with it and runs on the plate over its side edge as one band.
  2. Shoulder straps: from inside the near half (its centre) the strap runs straight up the buckle's axis on the
     face in the face's frame to the chamfer, then eases into the hull path (position 15 mm, frame 25 mm); the back end
     lies flat on the back tab the same way (it dipped 1.5 mm into the tab). Render h: no strap on either half, the
     strap's edges inside the buckle's sides, its end gone into the near half; the same on the right in c. Strap length
     0.315 m, keepers 0.071 / 0.201 / 0.297 m, plugClear 14.2 mm, hoodClear 32.1 / 7.2 mm.
  3. Keyhole sockets: cut upright on the bar's grid and turned whole with their neighbourhood (`twist`, easing out
     13.4-16.5 mm from the centre and 3 mm from the outline); in 2D the outer sockets are exact rigid copies of the
     centre one (0.0 mm). A 0.3 mm gunmetal floor under each socket: the composite no longer shows through, every
     socket is the same even-depth pocket. Render e: the three outlines match, walls continuous; the outer ones show
     their near wall from the oblique view.
  4. Back plate: rows below z 1.205-1.245 faired across x (each row's convex envelope, spine groove bridged, eased,
     lifted clear of the floor per row, rows eased together). Render e / k / b: the bottom band and trim read as one
     smooth even edge, the bar parallel to it. Back mean 3.70 mm (was 3.98), max 11.51 (was 15.0) at the spine, 0.12
     mm into the suit; `backGearM` 0.0222.
  5. Bust: a quadratic dome fitted round each apex (30 mm), lifted clear of the floor (1.74 / 1.91 mm), faded out by
     50 mm, raises the floor the plate rests on (`bustCaps`). Render c / d: one smooth convex form over each breast, no
     point. Chest mean 3.30 mm (was 2.73), max 12.3 mm (was 10.45) at (-0.111, 1.161) on the lap band under the bust (the
     dome's fade may not clear the floor fully there; under 15), over the sternum 7.78, into the suit 0.09 mm.
  - Unchanged: ribs mean 4.86 / 4.76 / 1.75 mm, 0 into the suit; laps 14 mm, clearance 0.76-3.8 mm; `plugClearM` 41.8
    mm; frames at x +0.0738 / 0 / -0.0724, splay +-0.08 rad; `suitPress` 3 172 verts, max 2.5 mm, 0 capped.
  - Renders (GPU, `E2E_GPU=1`): docs/operators/mockups/tests/wren-armour-{a..k}-*.webp, 2026-10-17.
  - Follow-ups accepted by the checker (not fixed here):
    F1. Wren's step 08 pouch items (`magPouches`, `adminPouch`, `radioPouch`, `radio`, `radioCable` "elastic loop,
        cummerbund", `ptt`, `medPouch`) still describe the carrier; step 09 rewrites them (open 5).
    F2. The empty radio recess reads as a bracket glyph at full-figure distance (b, k); step 09's radio fills it.
    F3. Small back tab corners beside the back strap ends (e). The back ends now lie flat on the tabs; the corners
        beside them remain (the 25 mm strap on the tab's chamfer).
    F4. Composite, rubber trim, gunmetal and suit sit close in value under the close-up rigs (near-black reads grey,
        OPEN since 05); the materials still separate by texture and sheen.
    F5. weaponMount handedness (blend +x = wearer's left = game backL at game x -0.07, A57) confirmed at integration
        (A36, locomotion step 25).
    F6. The step 07 earpiece cable still ends in a free plug at the left collarbone (c, h); step 09's PTT takes it.
- Checker round 2: PASS. operators:check 6 items pass; npm run check passes. Re-measured: `strapIntoPlateMm` 0.0 on all
  four straps; 199 of the 205 vertices behind a plate face are the two hidden internal web straps (A55; up to 1.7 mm deep,
  visible from 0 of 7 directions), 6 are rim sign artefacts outside by ray parity; shoulder strap ends bonded inside the
  buckle (20 vertices, up to 1.2 mm), no strap on top of either half. Notes: N1 chest max gap 12.3 mm on the lap band
  under the bust (A61 note); N2 lower the internal web straps' tops about 2 mm if they deform with the rig; N3 socket
  slot bottoms step slightly on the 0.6 mm grid at 2x zoom. F1-F6 stand (F3 tab corners still show in e).
- Status: passed the independent check (fix rounds: 1).


## Step 09 - Wren: storage, holster and cables (Opus 5.5)
- Built (all FITTED, A62-A66): `py/garments/kit_common.py` (conformal maps: `HField` for plate faces, `RingMap` on a
  `TC.Ring`; `cbox` rounded boxes laid on a map, `cord_loop`, standoff and back-lane reports); `chest_rig.py` (kit
  `magPouches` + `gadgetSlot`, `knife`, `ptt`, `radio`, `radioCable`), `waist_belt.py` (`waistBelt` + `pistolMagPouch`,
  `camMinePouch`, `rappelRing`, `slingSocket`, `dronePod`, `medPouch`, `magBuckle`), `leg_kit.py` (`thighHolster` +
  `holsterHanger`, `legBands`, `sleevePanel`, `throwableSleeves`, `sleeveHanger`, `magBuckle`). GARMENTS.wren and
  FITTED += `chest_rig`, `waist_belt`, `leg_kit`; render views added in `render_garment_test.py`.
- Shared edits: `head_common.ray_in(far=)`; `torso_common.Ring(axis_x=)` (limb rings, default unchanged); armour.py: the
  left strap's keepers and the antenna keeper are moulded rubber bridges (`_arch`), the left strap's path stored on
  `wren-armour-strap` (`ls_*`) for the radio cable; head_kit.py: earpiece cable fix (below).
- Step 07 cable MUST (07-fixes-r4) fixed here: every earpiece ray stops at the neck axis, the collarbone-to-collar run
  hugs the suit, each ring 1.4 mm out of the skin, the cable ends on the earpiece's outer face; the plug moved to x
  0.085 and chest_rig re-seats it on the PTT socket (11 mm). Probe (signed distance of the 58 ring centres against
  `wren-body`, the hood and balaclava base surfaces, in `wren-leg_kit.blend`): 0 rings inside the body, 0 outside the
  hood above the skirt hem, min x +0.033 (all near side); length 0.225 m (kit 0.225; A27 corrected). Renders head_kit f
  (no cord on the neck), e (the cable leaves from under the skirt on the left only).
- Numbers (sim reports): standoff off the suit - rifle mag pouches 3.65 / 4.02 cm, gadget slot 2.61, knife 2.76, PTT
  2.1, radio 1.7 (5.3 mm proud of the plate), pistol mag pouch 1.91, cam / mine 2.26, drone pod 2.22, medkit 1.81,
  sling socket 0.56, rappel ring 1.64, sleeves 3.37 (A63), holster 5.22 (A62), platform 1.72 (first pass;
  superseded by the fix rounds: holster 4.62, sleeves 2.48, radio 1.26 / 1.3 mm proud, rappel ring 1.50, medkit 1.95). Radio cable 0.27 m,
  keepers at 0.028 / 0.127 / 0.258 m from the radio (max free span 0.131 m), 9.7 mm clear of the hood. Back lane
  (A39): only the radio, antenna, radio cable (on the plate), the belt and the rappel ring; pod u 0.247-0.331, medkit
  -0.331 to -0.241 (lane edge x 0.105). `pistolHolster` origin (-0.2098, 0.0004, 0.6025) vs the game slot (-0.2126, 0,
  0.6024): 2.8 mm, axis 3.3 degrees off vertical (follows the thigh). Suit press: belt 2.5 mm max (15 capped, 0.6 mm),
  leg kit 2.5 mm max, 0 capped. Leg bands 0.54 / 0.41 m.
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS, 9 items, all checks pass (then leg_kit re-checked after the
  hanger fix: PASS). `npm run check` PASS (exit 0).
- Renders (GPU, E2E_GPU=1, 384 samples): docs/operators/mockups/tests/wren-chest_rig-{a,b,c,d,e,h,j}-*.webp,
  wren-waist_belt-{a,b,c,d,e,f}-*.webp, wren-leg_kit-{a,b,c,d,e,f,g,i,k}-*.webp, re-rendered wren-head_kit-*.webp and
  wren-armour-*.webp.
- Open:
  1. (Fixed in fix round 1 item 7) The leg hangers read weakly in the thigh close-ups (e: a thin line by the groin; the left hanger bridges the hip
     crease up to 17 mm off the suit); check the strap's width and route at close range.
  2. Holster stands 5.2 cm (now 4.6 cm) off the suit (A62: the game's slot and the 31 mm cavity); integration item: sidearms anchored
     at the holster mouth (the game centres each one's extents at the slot).
  3. Sleeves 3.4 cm (now 2.5 cm) and magazine pouches 4.0 cm off the suit (A63; the about-4 cm class).
  4. The radio cable crosses about 2 cm of the back plate's face inside the back-carry lane (flush, A65).
  5. Near-black still renders mid grey in close-ups (OPEN since 05).
- Fix round 1 (09-fixes-r1, Opus 5.5 fixer):
  1. Holster (MUST): `leg_kit.py` `holster_shell` / `holster_hood` - a lofted sidearm section (cavity 31.6 mm across at
     the centre, 31.1 at +-15 mm, outer face crowned 2.5 mm, trigger-guard step 56 mm below the mouth (rear edge 17 mm
     forward), 2.2 mm taper to the open muzzle end, 9 mm corner family, 2.2 mm wall, 155 mm long); a moulded cap closed
     over the whole mouth (1.5 mm wall), its arm down the outer face to a gunmetal pivot, a gunmetal thumb release
     below the cap at the rear edge; the old strap hood and latch lug removed. Shell and frame 9 mm down the thigh
     (`DROP`): offsetFromSlotMm 9.76 (limit 10), back gap 9.77 mm before the platform, platform 6.8-18.9 mm.
     `standoffFromSuitM.thighHolster` 0.0462 (was 0.0522; target 0.046: 0.2 mm short, LEFT). A62 updated.
  2. Rappel ring (MUST): `waist_belt.py` - 2.8 mm wire folded flat on the belt face, legs hidden in a 20 mm tunnel, the
     bow 8 mm below the tunnel ending 0.5 mm above the belt's lower edge. rappelRing 0.0150 (belt 0.0118 + 4 = 0.0158).
  3. Radio (MUST): `chest_rig.py` - a 5.6 mm module in the 4.7 mm recess, face crowned 0.4 mm: proudOfPlateMm 1.3;
     2.4 mm round edges; knob 1.4 mm; the top connector moved onto the face. Antenna: the field's frame normal pointed
     into the plate, so the run is laid 2.3 mm out of the plate face (probe: before, the antenna lay over the keeper;
     armour.py's keeper sits inside the plate, only 0.7 mm proud). chest_rig adds a moulded rubber keeper bridge
     (x 0.016) bonded either side of the antenna, its arch 0.9 mm over it. radio standoff 0.0126 (was 0.017).
     Follow-up for the armour owner: armour.py's antenna keeper is buried in the plate (`pframe(sm_bk, ..., T_BK)`).
  4. Medkit (MUST): the dangling tab replaced by a 30 x 8 mm flat webbing pull strap bonded on the outer face along the
     bottom edge with a bar tack at each end; a dashed moulded tear line across the outer face at the split height
     (the side-wall bead kept). medPouch 0.0195.
  5. Sleeves (SHOULD): oval sleeves 30 x 21 mm, oval canisters and caps (touch codes kept), tabs on the caps.
     throwableSleeves 0.0248 (was 0.0337). A63 rewritten.
  6. A62: the game's thigh slot is about 9 mm outside Wren's detailed thigh; move it in at locomotion step 25 (Michael).
  7. Sleeve hanger (SHOULD): below the belt each point is drawn in to 0.8 mm + half the strap off the suit and the
     strap's normals follow the suit surface; run standoff 0.0060 (was 0.019).
  - Step 07 cable untouched (head_kit not rebuilt).
  - Renders (GPU, E2E_GPU=1, 384 samples, 2026-10-17 03:00-03:10): wren-chest_rig-{a,b,c,d,e,h,j}, wren-waist_belt-
    {a,b,c,d,e,f}, wren-leg_kit-{a,b,c,d,e,f,g,i,k} in docs/operators/mockups/tests/.
- Fix round 2 (09-fixes-r2, Opus 5.5 fixer; the one MUST, option (b)):
  1. Holster hanger (MUST): `leg_kit.py` - the right hanger now runs behind the platform, on the bands behind the
     platform (`bot_R` on the thigh map at H_ON + half the strap + 0.4 mm, 1.6 cm into the platform's top),
     and its normals turn from the radial `d_` to the platform's `n_h` over the last 1.2 cm above the platform top, so
     the end enters through the platform's top edge and sits inside the platform's back, 2-4 mm in, hidden (round 3
     checker; 77 of 98 end vertices inside the platform solid). Island probe (headless Blender on `wren-leg_kit.blend`, holster frame):
     platform front -21.8 mm, hanger s -72.2 to -27.6 mm (5.8 mm behind the front; was -20.0, 1.8 mm through it),
     overlap u 141.4-158.3 mm. holsterHanger runStandoffM 0.0055 (limit 0.012); whole-strap standoff 0.0075.
     Renders f and c: the platform face above the hood is clean, the hanger reads as a strap entering the platform top.
  - Follow-ups done: A62 now says 4.6 cm (measured 0.0462); unused `sleeve_rr` removed. Holster 0.2 mm left as
    measurement noise (checker); hood, arm and head kit untouched.
  - Renders (GPU, E2E_GPU=1, RTX 4090, 2026-10-17 03:40): wren-leg_kit-{a,b,c,d,e,f,g,i,k} in
    docs/operators/mockups/tests/.
- Checker round 3: PASS. operators:check "9 item(s), all checks pass"; npm run check exit 0 (73 files, 762 tests).
  Island probe: no hanger vertex at or past the platform front (ends 5.8 mm behind it). Step 07 cable re-confirmed
  (58 rings, 0 inside the body, 0 outside the hood above the skirt hem, 0.2254 m) - step 07's OPEN item is closed.
  Logged follow-ups: armour.py's buried antenna keeper (remove at the next armour rebuild); the platform's 3 cm flat
  board above the hood (taste); the hanger's rear edge presses about 1.9 mm into the suit mesh (hidden); round 1 open
  items (near-black mid grey; radio cable across the plate, A65; the suit's wavy centre seams, step 08a; sleeve cord
  loops read as thin hoops); A62 integration item for locomotion step 25.
- Status: passed the independent check (fix rounds: 2).

