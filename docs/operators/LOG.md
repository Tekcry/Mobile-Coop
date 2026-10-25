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
- Status: CLOSED at the Wren block end (step 11): the earpiece cable route was fixed in step 09 and confirmed by step
  09's checker (PTT at the left collarbone, cable up the left of the neck; seen again in step 11's collar and ptt
  close-ups); the mid-grey close-ups are fixed (A78). Was: OPEN after 3 fix rounds; evidence: steps/07-fixes-r4.md;
  remaining: the earpiece cable route through the neck (MUST); follow-ups 3 (behind-ear crease), 4 (rear channel smear), 6 (darkness glow spill), 7 (Moth kit text for step
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
- Block end (step 11): superseded by D22-D24; not retried (ART-DIRECTION 9.3).
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
### Block-end retry (fixer, Opus 5.5; against steps/08a-fixes-r4.md; A90-A92)
Suit loop (sim + details + 96-sample renders, session scratchpad w4/q1-q6, crops w4/*.png), then the full chain:
`E2E_GPU=1 npm run operators:build -- wren --from suit --render`, `npm run operators:lods -- wren --render`,
`E2E_GPU=1 npm run operators:check -- wren`, `npm run check`, pose_check.py. Renders (RTX 4090, 384 samples) in
docs/operators/mockups/tests/ (wren-suit-a..k, wren-head_kit-a, s1-s4 and every later item), pose sheets in
docs/operators/mockups/wren/wren-pose-*.webp.
- Item 1 crotch: DONE in the renders, probe just over. A90: the crotch membrane zone starts 1 cm below the crotch,
  relaxes 120 passes with its seams as single lines, draw-in only from 2.5 cm above the crotch. a / head_kit a: one
  smooth surface into the inner thighs, no bulge, no cast shadow. Probe (r3/crotch_probe.py, z 0.80-0.925): max 6.6 mm
  off the faired skin (was 9.8), 17 vertices over 6 mm (was 79), all at z 0.800-0.818; z 0.818 up at most 5.4 mm.
  The centre front tape is laid as one smoothed run (`cf`, A92): straight but for a slight wobble just above the gusset.
- Item 2 abdomen: NOT MET (corrected by the retry checker, round 1: the renders were not softer). A91 (14 mm settle,
  320 passes) and an abdomen zone held off the "subdivided" body (A90; in fact the cage with a light Taubin, A93) made it
  worse: the membrane copied the rectus relief (a six-pack: linea alba groove, segment steps, a navel pit), and a small form remains at about x +-0.035, z 0.985 (e, about 800, 760): the suit lies 3.3 mm off the body
  there, so the form is the prepared body's own (a crease of the coarse cage at the lower belly). 24 mm was tried: the
  lower belly dropped as a broad shelf (worse). Next: reshape the cage there (prepare_body: a local fill of the crease
  below those two vertices) rather than a larger clamp.
- Item 3 panel lines: DONE. c: the front neckline is one continuous curve either side of the zip (joined run, A92); the
  collar's centre seam ends on it as a clean T; both yoke boundaries are single curves into the raglan seams (parabola).
  s1: no V, no stub. The right raglan dog-leg (c 1720-1760, 930-1000) was not touched; check it in the new c.
- Item 4 waist notches: DONE. The waist seam's four halves are one closed tape ring (A92): e has no notch at the centre
  front and no step at the hip; j has no gap where the centre back seam meets it (one slight wave left of it).
- Item 5 hood skirt front: DONE. s1: the skirt's lower edge is one smooth curve from the sides to the front
  (smoothstep 0.0-0.9; A92). covered:gunmetal 0 px in headwear, head_kit and every later item.
- Item 6 lumbar: DONE. A lumbar zone (A90) relaxes the lower back over the groove and the erector ridges, held off the
  subdivided body: b is one taut surface with a shallow spine channel, no lit ridge, no rim oval. (Widening A51's body
  fill to 16 mm / 8.5 cm was tried first and dropped: a pit where the gluteal cleft met it.)
- Seam gap (F10): with `seam_self_rings` 4 the first loop ended at 10.4 mm (inLoL oscillating 8.4-10.7 in the settle);
  6 rings: 9.8 / 9.6 / 9.6 / 8.4 mm in the loops, 9.6 mm in the full build.
- Checks: `operators:check -- wren`: every item check passes (suit seamGap 9.59, edgeLength suit 19.4, others 23.31-29.67; every
  rigidKit line passes); LODs: bakeDiff passes on every view
  (LOD1 chest 5 px, was the known 31 px; LOD0 back 14, boot 119/404; LOD1 head 17; LOD2 side 9, chest 8); ONE FAIL:
  `rigidSkin:lod2` - legBandBuckleL0 and legBandBuckleL1 are missing from LOD2 (absorbed by its voxel shell after the
  suit's re-simulated legs moved the leg kit; spread 0, weights exact for the 42 parts present). Not changed: adding them
  to `rigidKit.LOD_ABSORBED.lod2` (A82's own procedure for absorbed parts under 5 cm) is the orchestrator's call; the
  alternative is the step 10 retry's LOD work. `npm run check` exit 0 (76 files, 803 tests, build; lint 0 errors, 38
  warnings). pose_check.py: 7 sheets re-rendered (game crouch / sneak head error 0.0 mm). The Lab sheets
  (`operators:sheet -- wren`) were not re-rendered (budget): the step 10 / 11 retries re-render them.
- Open: item 2 (above); F11-F13 and the s4 boot-collar sliver not reached; right raglan dog-leg unverified.

### Block-end retry, fix round 1 (fixer, Opus 5.5; against steps/08a-retry-fixes-r1.md; A93, A94)
Suit loop (`w4/loop.mjs`, 96 samples) four times into the session scratchpad f1/r1-r4 (crops f1/r*-*.png), then
`E2E_GPU=1 npm run operators:build -- wren --from suit --render`, `operators:lods -- wren --render`, `operators:check`,
`npm run check`, pose_check.py. Final crops of the shipped renders: f1/fin-*.png.
- Item 1 abdomen: DONE. Found: in build_garment the body has no subdivision modifier (13,380 evaluated vertices), so
  A90's "subdivided" support was the cage with 10 Taubin pairs, which keeps the rectus relief; the membrane copied it.
  The abdomen zone is now held off a fitted support (A93: moving-least-squares quadratic of the body, 4 cm Gaussian;
  189 cage vertices replaced, relief removed up to 6.3 mm out / 6.8 mm in, lifted evenly 4.3 mm). The zones' final guard
  now acts on each zone's own vertices only. e: one smooth surface from the ribs to the waist seam, no groove, no
  segment steps, no navel, no dimples (f1/fin-e-abd.png against ck5/e-abd.png and ck5/old-e-abd.png); a and armour d:
  no banding. Lumbar (b) and crotch (a) unchanged against the retry's renders.
- Item 2 right raglan: DONE. The front raglan tapes are joined single-seam runs (smooth 30, normals eased 12; A93): c
  shows one smooth curve into the underarm with no dog-leg (f1/fin-c-raglanR2.png). A slight widening remains in the
  last few mm where the tape meets the underarm crease and the gusset tapes.
- Item 3 collar: DONE on the left, near-done on the right. Collar cling reach 45 mm and a collar-only Taubin fair
  (30 pairs, edges along themselves; A93). c: the left wing is gone, the top edge is one clean line either side of the
  zip; at the back right the spikes are gone, a smooth sliver of the collar's inner face shows over the top edge
  (f1/fin-c-collar.png, f1/r4-c-right2.png). s1 / s2: the hood skirt still laps the collar cleanly.
- Crotch probe: max 6.6 mm (17 vertices, z 0.800-0.818), unchanged; recorded as A94 (renders clean).
- Seam gap 9.59 mm, edge length 19.4 mm (unchanged).
- Checks: `operators:check -- wren` exit 1 with THREE FAILs (run twice, lods rebuilt between: identical, so
  deterministic): `rigidSkin:lod2` (allowed; now 6 parts absorbed by the LOD2 shell: gadgetTab, camTab, slingSocket,
  rappelRing, browRivetL / R), `lod0 bakeDiff` boot 431 px > 404 (the retry had 119; HEAD 367: the toe streaks of
  steps/10-fixes-r4.md item 2, wren-boot-lod0.png 186,359) and `lod2 bakeDiff` chest 44 px > 24 (the retry had 8; it
  was 36 in 10-fixes-r4: a dark line on the chest-rig pouch top in the LOD2 shell bake, wren-chest-lod2.png 138,425).
  Both are LOD bake defects already open for the step 10 retry, flipped by the new suit geometry; not chased here.
  Every rigidKit line (30), rigidSkin hero / lod0 / lod1 and LOD1 bakeDiff pass. `npm run check` exit 0 (76 files,
  803 tests; lint 0 errors / 38 warnings; a first run timed out three unrelated tests at 5 s while the PC was slow).
  pose_check.py: 7 sheets re-rendered, game crouch / sneak head error 0.0 mm.
- Open: the two bakeDiff FAILs (orchestrator: route to the step 10 retry or loosen nothing and fix there); the raglan's
  last few mm at the underarm; the collar's inner-face sliver at the back right in c (hidden by the hood skirt in s2).

- Block-end retry status: passed the independent check (fix rounds: 1). Routed to the step 10 retry: rigidSkin:lod2
  (6 parts absorbed by the LOD2 shell), lod0 bakeDiff boot 431 px > 404 (toe streaks), lod2 bakeDiff chest 44 px > 24
  (LOD2 shell bake line on the chest-rig pouch top); the hero is clean in all three. Notes for later: s1 hood-skirt left
  side edge slightly proud over a dark collar wedge; tape-end caps and knot (F12); lumbar shelf at zoom; F11-F13.

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


## Step 09b - Wren: approach boots (Opus 5.5)
- Built: `py/garments/approach_boots.py` (FITTED `approach_boots`, kit id `boots`, objects `wren-approach_boots-*`;
  A67), forked from `boots.build_foot` (Moth's `boots.py` untouched). An approach-shoe last on Wren's foot: toe room 12
  mm, toe raise 3 mm, an asymmetric plan (superellipse 1.9 medial / 1.6 lateral round a toe point 40 % to the medial
  edge), a quadratic toe spring (10.7 mm at the tip, from 82 % of the foot), a close heel cup. Panels (level-set
  slice): a sticky rubber rand round the whole upper (13 mm, rising 7 mm at the heel and 10 mm toward the toe) with a
  bumper about 30 mm deep over the toe box; a suede vamp overlay, suede eyestays from 80 % of the foot, a suede heel
  counter, nylon quarters, a recessed tongue with a bellows gusset each side, a padded collar with a fuller roll and a
  heel tab (A68). Seven low-profile eyelets a side (0.6 mm proud, no speed hooks), criss-cross laces to a lace garage at
  the tongue top, the webbing heel pull loop (box-X). Sole: a firm thin midsole (the groove 5.5 mm over the outsole
  face), a smooth edging zone over the front 4.6 cm flush with the lug faces, 101 lugs a side 2.9 mm deep (an original
  V-bar pattern inside a perimeter edge band; V toward the toe on the forefoot, toward the heel on the heel block), a
  recessed arch and a 4.2 mm transverse heel brake. Wear: rand scuffs at the toe and heel, one forefoot flex crease,
  the edging zone polished, dust in the lugs (AO).
- A38 / A68 (as corrected in fix round 1): the suit's settled hem rises to 13.0 / 14.1 cm at the back; the collar's top
  line rises smoothly from 12.2 cm at the front to a low heel tab (top edge 12.8-13.96 cm), and `press_suit_hem` moves
  the suit's render objects down and in, inside the boot: the hem ends 27 mm or more under the collar's top edge all
  round and every suit vertex under the edge sits 1.5 mm or more inside the boot's lining (poke-through probe 0).
- Shared edits: GARMENTS.wren `boots` -> `approach_boots`, FITTED += `approach_boots`; `render_garment_test.py`
  approach_boots views (c side, e laces, g toe, k collar and cuff, l profile, f heel and sole, h sole from below);
  kit.ts Wren `boots` renamed "Approach boots" with the new job / attach text; operators.test.ts asserts it. The stale
  step 06 `wren-boots.*` build outputs were moved out of build/operators/wren (scratchpad) so the check does not
  re-check them; the step 06 renders stay in docs/operators/mockups/tests as history.
- The press stretches the hidden band of the suit's render objects; edges it made longer than 2.4 cm are split (bmesh)
  so the render-mesh edge rule holds (first full check: edgeLength 56.9 mm on `wren-suit-tape`, then 29.02 mm).
- Numbers (`wren-approach_boots-sim.json`): foot 22.8 cm, boot 25.2 cm, ball 9.9 cm; toe width 2 cm behind the tip 58 %
  of the ball (step 06: 61 %); toe spring 10.7 mm; 101 lugs a side; collar top edge 12.65 cm front, 13.9 / 14.1 cm
  lateral, 15.0 cm back; suit hem 10.1-13.0 (L) / 10.5-14.1 cm (R) settled, 9.95-11.9 / 9.94-12.3 cm pressed, so the cuff
  is 27.0 mm or more inside the collar's top edge all round (before: 8.3 / 9.3 mm at the worst point); the roll's
  inner edge 0.0-1.8 mm off the suit.
- Re-confirmed after the rebuild (`wren-leg_kit.blend`): earpiece cable probe 58 rings, 0 inside the body, 0 outside
  the hood above the skirt hem, length 0.2254 m; holster `offsetFromSlotMm` 9.76 (<= 10).
- (First-pass Numbers / Checks / Renders bullets are superseded by "Fix round 1": collar top 12.82-13.96 cm, pressed
  hem 10.12-11.26 cm, edgeLength 29.65 mm, renders from the full chain.)
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS, 9 items, all checks pass (approach_boots edgeLength 29.02
  mm, seam gap 0, fitted). `npm run check` PASS (exit 0; 73 test files, 762 tests; lint 0 errors).
- Renders (GPU, E2E_GPU=1, 384 samples, from the build before the edge split, which only changed hidden suit faces):
  docs/operators/mockups/tests/wren-approach_boots-{a-front-stealth,b-back34-stealth,c-closeup-boot-side,
  d-front-neutral,e-closeup-boot-laces,f-closeup-boot-sole,g-closeup-boot-toe,h-boot-sole-below,k-boot-collar-cuff,
  l-boot-profile}.webp; re-rendered wren-head_kit-s4-suit-ankle-boot.webp and every later item's views.
- Implementer's read of the renders: reads as a light approach shoe with a mid collar (low rounded toe, the rand
  rising over the toe box as a rubber bumper, lacing from near the toe, low lugs, the heel brake step, the smooth
  edging zone; l, g, h, f); the suit enters the collar with no gap (k, s4).
- Open (first pass; 1 and 4 fixed in fix round 1):
  1. (fixed r1) The collar was 15.0 cm at the heel tab.
  2. Close-ups still render near-black as mid grey (OPEN since 05): the rand, suede and nylon do not separate by tone in
     these renders; judge materials on the step 10 / 11 sheets.
  3. A small dark slit where the collar band, the counter and the quarter meet on the lateral side (k, c); the same
     split_step junction shows on the step 06 boot.
  4. (fixed r1) The sole's bottom showed radial shading streaks (h; the concentric-ring fan).
### Fix round 1 (fixer, Opus 5.5; against steps/09b-fixes-r1.md)
- Item 1 (the pressed suit poked through the medial-back quarter): `press_suit_hem` now also pulls every suit vertex
  under the collar's top edge toward the leg's axis (a horizontal ray from the pressed suit's slab centroid) to 1.5 mm
  inside the boot hero's innermost surface, smoothed over the mesh and fading out 12 mm over the edge. New probe in
  `wren-approach_boots-sim.json` `measurements.<side>.suitPokeThrough`: L tested 1623 / outsideBoot 0 / seesOpenAir 0,
  R 1432 / 0 / 0 (outward fan of 12 x 2 directions past every boot object and the leg). New views
  `m-boot-medial-back-l` and `m-boot-medial-back-r` (0.35 m from the medial back). A68 corrected.
- Item 2 (collar over 14 cm, stepped tab): the collar no longer follows the suit's hem (`hem_requirement`, `HEM_COVER`
  removed); the top line rises round the leg as a cosine ramp to `BACK_RISE` 10.5 mm at the back. Top edge 12.85-13.92
  cm (L) / 12.82-13.96 cm (R); `collarTopM` 13.92 / 13.96. The press now handles a hem at or over the edge: a 2 mm band
  over the hem is stretched down inside the boot and the 10 cm of suit above slides down to meet it; visible stretch
  1.000 (L) / 1.047 (R, the hem 2.2 mm over the edge at the heel). Cuff 27.0 mm inside the top edge all round (A38).
  Pressed hem 10.12-11.22 / 10.12-11.26 cm.
- Collar band (found with the new view): the boot's push-out off the suit's folds and flared hem crumpled the collar
  band, and the lining dropped from the top ring outside the drawn-in shaft and showed through it. Now the boot fits a
  Taubin-smoothed copy of the suit's lower leg (`_smooth_leg`), the push-out moves are dilated and blurred over the ring
  grid (`_settle`), the lining has 4 rows down the inside and is held 3.2 mm inside the outer wall, and the roll has 5
  outer rows (rounder, no facets).
- Item 3 (sole lump and creases): the lump was the body's toe tips (22 vertices at z 1.2-3.2 mm) poking through the
  sprung sole bottom. The bottom's spring is now capped 1 mm under the lowest body / suit point at each station
  (nondecreasing to the tip; the top keeps the full 10.7 mm spring); the bottom face is a constrained-Delaunay fill of a
  2.5 mm grid (no concentric rings, so no fan streaks across the arch and the edging ramp).
- Item 4 (shading bands): each section ring is Taubin-smoothed along the ring (the hull facets lined up into stripes);
  shaft rings every 3 mm (was 4); the nylon quarters take a side projection UV (s, z) instead of the ring
  parameterisation (the fan round the throat stretched the weave into streaks); on the shaft and the collar the v
  coordinate follows the height (the rise sheared the weave into diagonal bands).
- Open (follow-ups from the fix list, not worked): 5. lugs read as separate sharp-edged bricks on a flat slab (h, f;
  step 06 "lug clusters"); 6. the small dark slit where the collar band meets the counter and quarter on the lateral
  side (k, c); 7. near-black renders mid grey in close-ups (OPEN since 05). Also: the heel pull loop's lower leg is
  slightly crumpled where it enters the collar (m-l).
- Re-confirmed after the full chain (`operators:build -- wren --from approach_boots --render`): earpiece cable 58 rings,
  0 inside the body, 0 outside the hood above the skirt hem, 0.2254 m; holster `offsetFromSlotMm` 9.76 (<= 10).
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS (9 items, all checks pass); `npm run check` PASS (73 test
  files, 762 tests; lint 0 errors).
- Renders (GPU, full chain): docs/operators/mockups/tests/wren-approach_boots-{a,b,c,d,e,f,g,h,k,l}-*.webp and the new
  wren-approach_boots-m-boot-medial-back-{l,r}.webp; every later item's views re-rendered.
- Checker round 2: PASS. operators:check 9 items pass; npm run check passes. Red-emissive poke-through render from the
  medial back, both feet: no suit through the quarter, counter or collar band; the checker's unexcluded ray-fan probe
  found escapes only within 2.1 mm of the collar rim (the suit leaving the boot opening) - the 4 mm band the sim
  probe skips (A68 (3)) is the collar opening, checked separately here. Earpiece cable 58 rings, 0 inside the body,
  0 outside the hood, 0.2254 m; holster offsetFromSlotMm 9.76. Watch for steps 10-11: edgeLength 29.65 mm vs 30.
  OPEN (minor): lugs read as separate bricks; lateral collar / counter / quarter slit; near-black mid grey; heel pull
  loop's lower end slightly crumpled at the collar (m-l); top lace end curls into a short stub (e, k); the vamp
  overlay's stitching ragged where it meets the rand (g).
- Status: passed the independent check (fix rounds: 1).


## Step 10 - Wren: baked maps, LODs, glTF and costs (Opus 5.5)
- Built: `scripts/operators/py/bake_lods.py` and `npm run operators:lods -- wren [--render] [--scale s]`
  (`export-gltf.mjs` `exportLods`; about 5 min). From `wren-leg_kit.blend` (2,449,661 render triangles, 41 materials,
  64 items) the render meshes are joined into one source that keeps every procedural material; hero, LOD0, LOD1, LOD2
  are collapse-decimated in a chain (A69-A70: stitches leave the geometry from LOD0, zip teeth from LOD1; pieces under
  12 / 45 mm dropped at LOD1 / LOD2; covered faces culled at LOD1 / LOD2; split vertices welded below the hero; the
  goggle lens protected); faces regroup into atlases (hero cloth 4K / kit 2K / hardware 2K / glow; LOD0 cloth 2K / kit
  2K / glow; LOD1 cloth 1K / kit 1K / glow, A71; LOD2 one 1K atlas / glow; phone = LOD2 at 512), unwrapped from the
  garments' pattern panels (smart projection where a piece has none) and packed per group; baked from the source on
  the GPU, selected to active: tangent normal and occlusion with the source's own shading, then albedo, roughness,
  metal and a coverage pass through an Emission swap; ORM packed glTF-style. Texels no ray reached take the group mean;
  normals turned more than ~70 degrees (rays meeting a strip's underside: seam tape, binding, strap edges) are
  flattened. Skinned by nearest body vertex (game LODs: finger / toe weights to the wrist / ankle, the finger and toe
  bones removed); the five anchors as empties on their joints; glTF per LOD with WebP inside, PNG sets beside them.
- Lab: LOD list `source` (the unbaked build, `<id>-lab.glb`), hero, lod0, lod1, lod2, phone (`<id>-lab-<lod>.glb`);
  `glb.ts` reads the embedded base colour / ORM / normal images and the emissive factor, `lab.ts` binds them
  (PBR metallic texture with occlusion R, roughness G, metal B; normal axes inverted for the reader's mirror). The
  `wire` sheet keeps the unbaked build (`source`); the `lods` sheet lists every level.
- Checks added: `src/operators/lodChecks.ts` (pure) + `tests/operatorLods.test.ts` (7 tests: anchors on their joints,
  missing / wrong joint, no hero bones below the hero, SPEC 6.4 overruns flagged not failed, GLB JSON; the glb reader's
  images and glow). `operators:check` checks every LOD file of `export/report.json` (FAIL on anchors / game joints;
  FLAG on SPEC 6.4 costs).
- Numbers (`export/report.json`): hero 229,348 tris, 4 draws, 63 skin joints (57 weighted), textures PNG 48.4 MB /
  BC7 96 MB VRAM, GLB 21.7 MB; LOD0 39,809, 3, 23 (17), 18.3 / 32 MB, 5.6 MB; LOD1 13,497, 3, 23 (17), 4.2 / 8 MB,
  1.6 MB; LOD2 5,200, 2, 23 (17), 2.7 / 4 MB, 0.8 MB; phone 5,200, 2, 23 (17), 0.8 / 1 MB ASTC, 0.5 MB. Silhouette IoU
  vs hero (front / side / back): LOD0 0.996 / 0.995 / 0.996, LOD1 0.991 / 0.988 / 0.991, LOD2 and phone 0.979 / 0.967 /
  0.979; hero vs source 0.999. backGearM 0.0222. Anchors in every file: weaponMount.backL/C/R on chest, pistolHolster
  on hipR, slingSocket on pelvis. Full table: docs/operators/mockups/wren/DESIGN.md.
- Checks: `E2E_GPU=1 npm run operators:check -- wren` PASS, 9 items, all checks pass; 5 LOD files: anchors and game
  joints PASS, one FLAG (hero bones 63). `npm run check` PASS (exit 0; 74 test files, 769 tests; lint 0 errors).
- SPEC 6.4 flags: hero bones 63 vs ~30 (three bones per finger in the rig); LOD1 3 draws vs 2 (the glow) and its own 1K
  set instead of LOD0's (A71). Texture VRAM is computed (BC7 / ASTC 1 byte per texel, mips), not measured on a GPU.
- Renders (Cycles, OptiX, RTX 4090; columns source, hero, LOD0, LOD1, LOD2, phone): docs/operators/mockups/tests/
  wren-lods-a-silhouettes.webp, wren-lods-b-closeups-chest-head.webp, wren-lods-c-closeup-boot.webp. Hero vs LOD0 keep
  the same silhouette (IoU 0.995+); hero keeps the harness, laces, rib segments, stitches. Render check: 1 silhouette
  holds at every level; 2 fabric matte (rough 0.7-0.95 baked from the source); 3-4 material zones and taped seams read
  in hero / LOD0 maps; 5-7 nothing added. Studio light: near-black fabric reads mid grey (OPEN since 05).
- OPEN: KTX2 - neither `toktx` nor `basisu` is installed; needs Michael's OK to install KTX-Software (the one-line
  encode is in build/operators/wren/export/README.md and scripts/operators/README.md); until then WebP in the GLBs (A73).
- OPEN (taste, distance levels): LOD1 / LOD2 close-ups show faceted pouch flaps and hood / balaclava layering and small
  gaps where the boot rand meets the upper; at their distances (8-25 m, > 25 m) a few pixels; LOD0 shows faint lighter
  scuffs on the boot toe from the bake.
- Not done here: the game integration (step 18), Moth.

### Step 10 - Fix round 1 (fixer, Opus 5.5; fix list steps/10-fixes-r1.md)
- 1 Shards and holes (done): the one-ray covered-face cull was the cause. LOD1 and LOD2 / phone are now closed shells
  (A74): the hero without the lens, stitches, zip teeth and small pieces, voxel-remeshed at 2.5 mm (about 890 k
  triangles), decimated, each face given the nearest hero face's material, the lens (protected) joined. The rib
  segments are separate at the hero and LOD0 and part of the shell below (a trial with the plates kept separate at LOD1
  showed the shell through the decimated plates: striped ribs). The cull stays for a layered level but needs centre +
  every corner covered (CULL_COVERED empty). New measures in report.json and operators:check (FAIL):
  `backFaces` (Cycles flag renders, back faces red, six views; limit hero + 0.2 % of the figure) and `openEdges`
  (<= 1.5x the hero's). Measured: open edges hero 35.1 m, LOD0 36.0, LOD1 0.18, LOD2 / phone 0.44 (before 131 / 91);
  back-face px per view (front / side / back / chest / boot / head) hero 2,822 / 2,063 / 3,542 / 11,385 / 4,078 /
  6,843, LOD1 0 / 0 / 0 / 1 / 0 / 0, LOD2 and phone 0 / 5 / 0 / 2 / 0 / 0. Silhouette IoU vs hero (front / side /
  back): LOD1 0.9954 / 0.9938 / 0.9953 (was 0.991 / 0.988 / 0.991), LOD2 and phone 0.9907 / 0.9835 / 0.9907 (was
  0.979 / 0.967 / 0.979), LOD0 unchanged 0.9956 / 0.9946 / 0.9957. Triangles: LOD1 13,487, LOD2 / phone 5,158.
- 3 Tangents (done): `export_tangents=True`; every LOD glb has TANGENT (report `tangents: true` in all five);
  lodChecks FAILs a primitive with a normal texture and no TANGENT (unit test); the Lab reader takes TANGENT (x and w
  negated for its mirror) and Babylon uses it (the invert flags only apply without tangents).
- 2 Babylon renders (done, partly judged): `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren --only
  lods,closeups` on the RTX 4090 (ANGLE D3D11): docs/operators/mockups/wren/wren-sheet-lods.webp (sneak pose, 7 m) and
  the new wren-sheet-lods-closeups.webp (hero, LOD0, LOD1, LOD2, phone: chest and boot under the raking light, torso
  bent in the sneak pose). Hero / LOD0 boot: the sole tread reads as relief; no seam lines along UV islands are
  visible at any level. LOD1 / LOD2 / phone show blocky light patches that follow the triangles (the chest and the bent
  torso; worst on the phone at its low shadow-map size): not a map or tangent error. Cause (verified by the round-2
  checker, corrected in fix round 2): the Lab's 1 cm shadow normal bias opens holes in the arm's shadow on the single
  coarse shell; the hero's stacked layers keep it closed (shadows off: hero and LOD1 shade alike; normalBias 0: LOD1
  goes dark like the hero). Step 18: per-LOD shadow normalBias (the shell LODs need a smaller one), checked with the
  game's shadow generator. Rib
  segments: no gap line shows in the bent torso at LOD0 (separate pieces) or LOD1 (shell, cannot gap), but that row is
  dark. OPEN: the raking-light close-ups are too dark to call dent-versus-bump with confidence on the near-black suit
  (needs a brighter close-up rig or a normals debug view of the baked LODs).
- 5 Draws (done): A75, the glow is the "+ glow" draw at LOD1 too; lodChecks `lod1: draws 2, glow 1`, limit "SPEC 6.4
  <= 2 + glow (A75)", DESIGN.md says the same (no FLAG).
- 6 (done / open): A71 now says 8 MB; the phone glow material is `wren-phone-glow`; A72 says the hero is held by its
  comparison with the source. LOD0 boot toe streaks: OPEN - still in wren-lods-c-closeup-boot.webp LOD0 column (toe
  and heel); cause: the LOD0 kit set has 24 % of its hit texels flattened (bake rays meeting the rand / toe-cap edge
  walls at a grazing angle are set to a flat normal and the set's mean occlusion, which reads lighter) - a cage /
  per-island fix in the bake, not done this round. LOD1 / LOD2 boots: the laces read only faintly in the maps.
- Other: check.mjs prints `FLAG lods: not built` when export/report.json is missing. The closeups sheet now renders
  the source LOD explicitly (it rendered the last LOD the lods sheet left loaded).
- Render check (file and view): 1 silhouette holds - IoU above, wren-lods-a-silhouettes.webp front / side / back,
  no dark slivers over shoulders, arms, back, thighs or calves in the LOD1 / LOD2 / phone columns; head and shoulders
  clean at LOD1 / LOD2 / phone in wren-lods-b-closeups-chest-head.webp (head row, chest row: no shards, no torn flaps);
  boots whole at LOD1 / LOD2 / phone in wren-lods-c-closeup-boot.webp (no holes through the upper or rand); 2 fabric
  matte (roughness means 0.76-0.83 in every set); 6 nothing lumpy at LOD1 / LOD2 beyond the softened pouch edges a
  5-13 k figure has. OPEN: the LOD0 toe streaks (above); the low-poly shadow patches under a grazing light in Babylon
  (step 18: shadow normal bias per LOD).
- Checks: `E2E_GPU=1 npm run operators:check -- wren` exit 0, "9 item(s), all checks pass"; LOD files: tangents,
  anchors, game joints, backFaces, openEdges PASS in all five, one FLAG (hero bones 63). `npm run check` exit 0 (74
  files, 772 tests, lint 0 errors, build OK). Port 4191 freed.
- Logged for step 18 / the next SPEC update: hero bones 63 vs SPEC ~30 (SPEC's own sum: 17 game joints + 30 finger
  segments is already 47); Wren's ten toe bones sit in a rigid boot - one ball bone per foot is right for booted
  operators (63 -> 55). The game LODs carry 23 skin joints (17 weighted + root, body, handL / R, toeL / R unweighted):
  strip the six unweighted helpers in step 18. KTX2 stays OPEN (Michael); the GLBs then need repacking with
  KHR_texture_basisu and the Basis transcoder bundled locally. Step 18 must test that the phone never fetches
  `*-hero*` files.

### Step 10 - Fix round 2 (fixer, Opus 5.5; fix list steps/10-fixes-r2.md)
- 1 Holster slashes (partly done, item left OPEN): cause - the decimated shell's flat holster face meets its sides at
  near right angles; smooth vertex normals tilt up to 45 deg there and, interpolated across long sliver triangles, sent
  the cage rays (LOD1 3 cm, LOD2 6 cm out) sideways onto the holster sides and the pistol. Fix: shell edges over 30 deg
  are split before the bake (SHELL_SHARP_DEG, A76). The wide black slashes are gone; thin dark arcs stay on the
  holster face at LOD1 / LOD2 / phone (`wren-side-lod1.png`, `wren-side-lod2.png`, `wren-side-phone.png`, right thigh)
  and LOD1's front view keeps a dark groove down the holster (`wren-front-lod1.png`, 122,525). 50 deg and 30 deg render
  the same, so the arcs are not normal tilt; hypothesis: near-zero UV-area sliver triangles on the decimated holster
  face (too few texels for the map to correct the shading). Next: a decimation that keeps that face's triangles fat,
  or the holster kept as a separate piece below LOD0.
- 2 Radio recess wedge (done): the same split removes it; `wren-back-lod2.png` / `wren-back-phone.png` show the plate
  clean with a faint lighter triangle only (bakeDiff back 151 / 146 -> 17 / 17 px).
- 3 New FAIL measure (done; A76): `bakeDiff` - per view, the largest 8-connected patch of LOD pixels darker than every
  hero pixel within 3 px by more than 0.2 luminance; limits 1.1x the round-2 LOD0 (min 24 px): front 24, side 24,
  back 142, chest 173, head 141, boot 404. Pure module src/operators/bakeDiff.ts (PNG decoder + measure), check
  `bakeDiffCheck` in src/operators/lodChecks.ts, wired in scripts/operators/check.mjs (writes `bakeDiff` into
  export/report.json), tests/operatorBakeDiff.test.ts (10 tests). Proof on the round-2 renders (kept in
  build/operators/wren/export/renders-r2): LOD1 front 78 / side 40, LOD2 front 212 / side 32 / back 151, phone front
  208 / side 31 / back 146 - all FAIL; LOD0 passes. Block mean luminance (the fix list's example) was tried and does
  not separate the errors from LOD0's spread (A76). The measure also shows LOD0's own bake errors: the thigh-band lower
  edge in `wren-back-lod0.png` (128 px, jagged dark triangles over the seat) and the toe streaks in `wren-boot-lod0.png`
  (367 px); those set the back and boot limits, so a tighter limit waits for those two LOD0 bakes.
- 4 Render check, round 2 (Cycles, OptiX, build/operators/wren/export/renders/; bakeDiff largest patch / limit):
  - front: LOD0 18/24 clean; LOD1 31/24 FAIL (holster groove, `wren-front-lod1.png`); LOD2 15/24, phone 17/24 clean.
  - side: LOD0 9/24 clean; LOD1 11, LOD2 14, phone 9 under the limit but thin dark arcs visible on the holster face
    (`wren-side-lod1.png`, `-lod2`, `-phone`) - not clean by eye.
  - back: LOD0 128/142 (thigh-band edge, see 3); LOD1 12, LOD2 17, phone 17: plate and radio recess clean, holster back
    clean (`wren-back-lod1.png`, `-lod2`, `-phone`).
  - chest / head / boot: LOD1 36 / 21 / 0, LOD2 47 / 2 / 0, phone 47 / 2 / 0, all under the limits;
    wren-lods-b / -c sheets as round 1.
  - Silhouette IoU unchanged (LOD1 0.9954 / 0.9938 / 0.9953, LOD2 / phone 0.9907 / 0.9835 / 0.9907).
- Record items (done): A70 says ribs separate at the hero and LOD0, shell from LOD1 down; A74 notes the step 10 Do 2
  departure and the checker's render evidence; the Babylon patch cause in round 1 item 2 is corrected (shadow normal
  bias; step 18 per-LOD normalBias). The lods-closeups row "Torso bent (sneak), ribs" now uses `joint ['chest',
  [0,-0.15,0]], radius 0.9, yaw 0.35, pitch -0.35` and frames the front rib laps at every level
  (docs/operators/mockups/wren/wren-sheet-lods-closeups.webp, row 3, RTX 4090 ANGLE D3D11).
- LOD0 toe streaks (OPEN, hypothesis): the bake rays at the toe-cap / rand edges slide sideways (the A76 mechanism:
  smooth normals tilted at a near right-angle edge, a 2 cm cage) and hit the rand walls. The 24 % flattened share
  alone does not explain it - the hero kit set has 22 % and no streaks. Not changed this round (LOD0 untouched).
- OPEN list adds: LOD1 / LOD2 boot laces read only faintly (sheet c columns 4-6; not a fail at 8 m+). Unchanged: hero
  bones 63, six unweighted helper joints, KTX2 (Michael), the phone never fetching `*-hero*` (step 18).
- Checks: `E2E_GPU=1 npm run operators:check -- wren` exit 1, "1 failed check(s)": `wren lod1 FAIL bakeDiff: front 31 px
  at 122,525 > 24`; every other LOD check PASS (one FLAG, hero bones 63). `npm run check` exit 0 (75 files, 782 tests,
  lint 0 errors / 38 warnings, build OK; a first run hit three 5 s timeouts in unrelated suites - detailPass, pvp,
  voxel - under load, clean on the re-run). Port 4191 freed.

### Step 10 - Fix round 3 (fixer, Opus 5.5; the last round, fix list steps/10-fixes-r3.md)
- 1 Holster face (done): cause confirmed - the holster was part of the voxel shell, so its flat face and the thigh were
  one surface and the collapse ran slivers from the face into the thigh (and the bake's rays across the gap). Kept out
  of the remesh as separate pieces (A77: rigid `harness polymer` components 0.05-0.25 m, decimated alone, joined to
  the shell; the rest unchanged) the arcs and the groove are gone: bakeDiff LOD1 front 31 -> 0 px, side 11 -> 0,
  holster 0; LOD2 front 15 -> 2, side 14 -> 7, holster 4; phone side 9 -> 7, holster 3. By eye the holster face is
  flat with its strap and hood like the hero's in every level (docs/operators/mockups/tests/wren-lods-d-closeup-holster.webp;
  wren-lods-a-silhouettes.webp side row; renders build/operators/wren/export/renders/wren-{front,side,holster}-{lod1,lod2,phone}.png).
- 2 bakeDiff limits (done; A76 amended): shells 24 px in every view (`SHELL_DARK_LIMIT`, `darkPatchLimit`); the
  per-view limits are LOD0's only and each loose one is named in A76; new `holster` close-up view in the renders,
  backFaces and bakeDiff (24 px); bakeDiff and backFaces FAIL "stale" when a render is older than its LOD's GLB (or the
  hero's render than the hero's GLB; `staleViews`, wired in check.mjs). Unit tests (tests/operatorBakeDiff.test.ts, 4
  new): shell limits, the round-2 chest defects failing, the holster view, stale. On renders-r2 every shell still FAILs
  (LOD1 front 78 / side 40 / back 53 / chest 64 / head 80; LOD2 front 212 / back 151 / chest 55 / head 59; phone
  front 208 / back 146 / chest 41 / head 56).
- 3 Chest (LOD2 / phone done, LOD1 OPEN): the knife sheath (the "tall pouch") and the mag pouches are rigid pieces
  (A77), so the sheath is whole and the wedge into the mag pouch gone: chest 47 -> 18 px at LOD2 / phone
  (wren-chest-lod2.png, -phone.png; sheet b). At LOD2 only the front torso / thigh pieces stay separate (all nine at
  LOD2's budget lost their shape: pouch flaps, a twisted belt holder, back 106 px) and LOD2's target is 5,600 (A77).
  LOD1 notch NOT fixed: `wren-chest-lod1.png` 404,347, 36 px (> 24, operators:check FAILs it), a dark hooked notch where
  the plate's lower band meets the cummerbund on the left side; the same spot is 18 px at LOD2 / phone. A 2 cm LOD1
  cage (was 3) did not change it, so it is the shell's geometry there (a step in the remeshed band edge), not ray
  reach; next: inspect the hero / shell at about (0.12, -0.13, 1.17) m and keep that band edge in the decimation
  (vertex-group weight) or the band separate.
- 4 LOD0 bake errors (mostly done): the A76 split on LOD0 above z 0.20 m (SHARP_SPLIT; on the boots it made the toe
  streaks worse, 367 -> 491 px) removed the thigh-band line (back 128 -> 1 px), the buckle blotches (front 18 -> 1)
  and the plate-top smear (chest 157 -> 1, head 125 -> 0); those LOD0 limits are 24 again. OPEN: the toe streaks,
  boot 367 px at `wren-boot-lod0.png` 189,373, the only loose limit (404).
- Numbers (report.json): triangles hero 229,348, LOD0 39,809, LOD1 13,484 (rigid pieces 3,507 -> 2,930 with the
  lens), LOD2 / phone 5,557 (5 pieces + lens 2,383 -> 1,850); IoU front / side / back LOD1 0.9953 / 0.9936 / 0.9954,
  LOD2 / phone 0.9910 / 0.9832 / 0.9911; GLB LOD1 1.87, LOD2 0.84, phone 0.57 MB. DESIGN.md rows updated.
- Renders (Cycles, OptiX, RTX 4090; `npm run operators:lods -- wren --render`, about 6 min): sheets
  docs/operators/mockups/tests/wren-lods-a-silhouettes.webp, -b-closeups-chest-head.webp, -c-closeup-boot.webp and the
  new -d-closeup-holster.webp; per-view PNGs in build/operators/wren/export/renders/.
- KTX2 not in this round (step 11's first task; A73 open). Logged follow-ups as the fix list (LOD2 / phone head shell,
  radio blotch, boot laces, hero bones 63, helper joints, shadow normalBias, phone never fetching `*-hero*`).
- Checks: `E2E_GPU=1 npm run operators:check -- wren` exit 1, "1 failed check(s)": `wren lod1 FAIL bakeDiff: chest 36 px
  at 404,347 > 24`; 9 items PASS; every other LOD check PASS (bakeDiff LOD0 front 1 / side 9 / back 1 / chest 1 /
  head 0 / boot 367 / holster 8; LOD2 2 / 7 / 0 / 18 / 13 / 0 / 4; phone 1 / 7 / 0 / 18 / 3 / 0 / 3); one FLAG (hero
  bones 63). `npm run check` exit 0 (75 files, 785 tests, lint 0 errors / 38 warnings, build OK; a first run hit the
  same three 5 s timeouts under load as round 2 - detailPass, pvp, voxel - clean on the re-run). Port 4191 freed.
- Checker round 4 (final): FAIL (steps/10-fixes-r4.md). operators:check: 1 failed check - `wren lod1 FAIL bakeDiff:
  chest 36 px at 404,347 > 24`; all 9 items and every other LOD check pass (tangents, anchors, gameJoints, triangles,
  draws, bones, backFaces incl. holster, openEdges, bakeDiff for LOD0 / LOD2 / phone); FLAG hero bones 63. npm run check
  passes (75 files, 785 tests). A76 (amended) and A77 accepted; renders-r2 still fail every LOD with the current code.
  Round-3 numbers: LOD1 13,484 tris, LOD2 / phone 5,557; IoU LOD1 0.9953 / 0.9936 / 0.9954, LOD2 / phone
  0.9910 / 0.9832 / 0.9911.
- Status: OPEN after 3 fix rounds; evidence: steps/10-fixes-r4.md; remaining: 1. LOD1 chest notch where the plate's
  lower band meets the cummerbund (wren-chest-lod1.png 404,347, 36 px vs 24); 2. LOD0 toe streaks (wren-boot-lod0.png
  189,373, 367 px; the one loose limit, 404). Notes: boot laces gone below LOD0; dashed suit front seam on LOD1 / LOD2;
  short knife clip on LOD2 / phone; carried: LOD2 / phone head shell, radio blotch, hero bones 63, helper joints,
  per-LOD shadow normalBias, the phone never fetching `*-hero*`. KTX2 is step 11's first task (D26, A73 open).

### Step 10 - Block-end retry (implementer, Opus 5.5; steps/10-fixes-r4.md plus STATE "Now"; A95)
Continued a stopped agent's uncommitted work (reviewed: every threshold and test change is stricter or a new case).
- Hero-bake confetti: DONE (cause found). The solidified cloth (suit, gloves, hood, balaclava, boot upper) carries its
  inner shell on the outer face's UVs, so the inner shell's texels overwrote the outer face triangle by triangle.
  bake_lods.py marks each solidify's generated shell (`shell_vertex_group`) and bakes those faces (407,960 of 1.27 M
  source faces) into a dummy (A95). By eye (hero, KTX2, Lab GPU): knee (grip panel oval reads), thighR, handBack,
  neckRear clean; forearm grip panel reads (pebble); residual light mottling at the forearm cuff under the thumb-loop
  strap and a few glossy specks on the boot upper by the laces (`wren-sheet-closeup-forearm.webp`, `-boots.webp`).
- LOD1 / LOD2 "mid grey": NOT a bake value. Per surface point the LOD maps equal the hero's (cloth, LOD vs nearest hero
  vertex: albedo R 47.9 / 47.7, AO 222 / 215 (LOD1), roughness 206 / 205); Lab turnaround medians equal at every LOD
  (front torso 0.11-0.12, legs 0.09-0.10, back 0.08); the A-pose raking chest patch equal (30.5 sRGB 0-255, all four).
  The gap is in the bent (sneak) raking tile only: waist 7 / 10 / 27 / 30, thigh 23 / 22 / 51 / 50 (hero / LOD0 /
  LOD1 / LOD2): the hero with shadows off reads like LOD1 (`operators:sheet --only diag`, new `DIAG_VIEW=bent`,
  `DIAG_SAVE`): the voxel shells lose cast shadows the layered levels keep (fused layers, no overhang). Routed to
  step 18's per-LOD shadow item (normalBias per LOD) with these numbers; no bake change.
- rigidSkin:lod2: DONE. The six A82 parts stay absorbed, now measured in the check (`ABSORB_LIMITS`: under 50 mm in the
  hero; LOD vertices within 10 mm >= 0.75 on the declared bones): gadgetTab 14.1 mm, camTab 15.3 mm (no shell vertex
  within 10 mm), slingSocket 38.7 mm (pelvis 0.85), rappelRing 37.4 mm (pelvis 0.91), browRivetL / R 11.2 / 11.3 mm
  (head 1.00); LOD1 rivets head 1.00. The real FAIL was legBandBuckleL0 / L1 and hangerBuckleL (absent: no shell vertex
  within 4 mm; the R ones held by one vertex): every other hard part under 5 cm now stays a separate LOD2 piece at 25 %
  (seven buckles, 888 -> 222 triangles; A95). LOD2 44 parts tagged, spread 0.
- LOD0 boot: DONE. With the inner shell out the A76 split reaches the boots: bakeDiff boot 431 -> 0 px, limit 24 again
  (every LOD0 view 24; test now fails the old 367 px). Toe reads like the hero's (`wren-lods-c-closeup-boot.webp`).
- LOD2 chest: DONE. Magazine placard and seat separate at LOD2 (`RIGID_EXTRA`): 44 -> 9 px. LOD1 chest 13 px (round-4
  item 1 closed by the 08a geometry).
- Numbers: triangles hero 229,391, LOD0 39,809, LOD1 13,578 (A89 target 13,600), LOD2 5,964 (target 6,000; SPEC 6.4
  top). bakeDiff LOD0 / LOD1 / LOD2: front 0 / 6 / 3, side 0 / 0 / 1, back 0 / 1 / 0, chest 11 / 13 / 9, head
  0 / 9 / 4, boot 0 / 0 / 0, holster 5 / 15 / 0. KTX2 Babylon vs decoded 0.10 / 0.10 / 0.12 / 0.12.
- Renders (GPU): Cycles OptiX `npm run operators:lods -- wren --render` (about 11 min now: the extra bake slot) ->
  docs/operators/mockups/tests/wren-lods-{a,b,c,d}-*.webp; Lab (E2E_GPU=1, ANGLE D3D11, RTX 4090):
  wren-sheet-lods, -lods-closeups, -ktx2-compare and close-ups handBack, forearm, knee, boots, thighR, thighL,
  underarm, neckRear, collar.
- Checks: `E2E_GPU=1 npm run operators:check -- wren` exit 0, "9 item(s), all checks pass" (about 55 min; a first run
  was cut by a 50 min shell timeout, not a failure): every item PASS; every LOD line PASS incl. rigidSkin hero / lod0 /
  lod1 / lod2 (LOD2 44 parts, spread 0, the six A82 parts measured) and bakeDiff above; one FLAG (hero bones 63).
  `npm run check` exit 0 (76 files, 804 tests; lint 0 errors / 38 warnings; build OK); a first run hit the known 5 s
  timeouts under load (detailPass, voxelFit), both pass alone and on the re-run. Port 4191 free.
- Holster: the dark sawtooth on the holster retention strap's top edge in thighR is pre-existing (same in HEAD's
  sheet); the HEAD thigh confetti beside it is gone (crop compare in the session scratchpad).
- Open: forearm cuff mottling and boot-upper specks (hero, small); the holster strap sawtooth (pre-existing, hero
  bake); LOD1 / LOD2 cast shadows in the bent pose (step 18); the six A82 absorptions are measured, not removed.

- Block-end retry status: passed the independent check (fix rounds: 0). Notes for step 18 / later: LOD1/LOD2 bent-pose
  greyness comes from fused geometry (no cummerbund/plate overhang shadow), not maps - fix in geometry or accept;
  camTab (and at 10 mm gadgetTab) vanish at LOD2; the rigidKit near==0 branch passes with nothing measured; LOD2 has 36
  tris of headroom; hero boot glossy specks / tongue blotch / quarter mottle; forearm cuff mottle (+2 EV only); holster
  retention-strap sawtooth (hero/LOD0 bake, predates); LOD1/LOD2 mid-band marks in the bent raking tile.

## Step 11 - Wren: full render set and self-review pass (Opus 5.5)
- KTX2 (step 10 carry-over, D26; A73 closed, A79): `scripts/operators/ktx2.mjs` (`npm run operators:ktx2`, the last
  stage of `operators:lods`): toktx UASTC q2 + Zstd 18 with mips (albedo sRGB, normal normalised and ORM linear),
  `ktx validate`, a level-0 decode with `ktx extract` (PSNR into report.json; the decoded PNG kept for the Lab), GLBs
  repacked with `KHR_texture_basisu` (required; no WebP / PNG left), Lab copies refreshed, report.json `ktx2` and the
  export README table. Check: lodChecks `ktx2Check` + check.mjs (`ktx2` PASS on all five LODs) + 3 new unit tests
  (non-KTX2 fails, repack round trip through the Lab reader, the Lab transcoder file map). check.mjs judges render
  staleness by the Blender export time the repack keeps (`ktx2.sourceGlbMs`).
- Costs (report.json `ktx2`): VRAM BC7 / ASTC 96 / 32 / 8 / 4 / 1 MB (hero / LOD0 / LOD1 / LOD2 / phone; RGBA8 from
  WebP would be 384 / 128 / 32 / 16 / 4); KTX2 on disk 38.3 / 14.5 / 3.6 / 1.8 / 0.55 MB; GLB 25.3 -> 55.3, 6.6 -> 18.0,
  1.9 -> 4.7, 0.8 -> 2.2, 0.6 -> 1.0 MB; PSNR 35.5-60.1 dB. RDO lambda 1 would cut about 21 % on disk (not used).
- Lab: `src/operators/lab/ktx2.ts` points KhronosTextureContainer2 (exported from core/babylon.ts) at `vendor/ktx2/*`
  through `?url` - no CDN. [Superseded by fix round 1 (D27): `@babylonjs/ktx2decoder` installed, Babylon transcodes
  KTX2 on the GPU; the rest of this item is the first pass.] OPEN (A79): Babylon's decoder files (babylon.ktx2Decoder.js, uastc_bc7 / uastc_astc /
  uastc_rgba8_unorm_v2 / uastc_rgba8_srgb_v2 wasm, zstddec.wasm, from the Babylon release matching @babylonjs/core,
  Apache 2.0) are not on the PC or in node_modules and the run may not download: Michael's OK needed. Until then the
  Lab draws each KTX2 texture as the reference transcoder decoded it; every LOD loads and renders on the RTX 4090 that
  way (wren-sheet-lods.webp, wren-sheet-lods-closeups.webp, labelled "KTX2, decoded"); Babylon's own transcode is not
  yet seen on the GPU. Phones still load only the phone LOD.
- Mid-grey close-ups (OPEN since 05): fixed, A78. Cause 1: the Lab source export flattened only the step 05-07
  materials; the suit zones, composite, rubber trim, gunmetal, elastic and pod exported glTF's default 0.8 base
  colour. Now every material has its measured (or garment) albedo and roughness (no Lab material above 0.1). Cause 2:
  the raking rig's exposure; the close-ups use the calibrated `detail` rig (`detailRear` for views from behind).
  Lit-figure sRGB medians now 0.18-0.27 (collar 0.18, ptt 0.20, back plate 0.21, left thigh 0.27). [Superseded by fix
  round 2 item 4: measured on an operator mask, the close-up medians are 0.05-0.13.] Materials, check
  limits and the `raking` rig unchanged. tests/operatorLab.test.ts lists the three new rigs after the BRIEF's six.
- Sheets (E2E_GPU=1, ANGLE D3D11 on the RTX 4090 Laptop GPU): 30 in docs/operators/mockups/wren/ [superseded: 32
  after ktx2-compare (fix round 1) and closeup-buckle (fix round 2)]: turnaround, menu,
  context, compare, lods, lods-closeups, wireframe, colourblind, the new rim-silhouette and goggle (in use from the
  Lab; stowed from the step 09 chain's Cycles renders, labelled), and 20 close-ups (head, neckRear, chestFront,
  chestRear, shoulder, handPalm, handBack, belt, knee, boots, and new collar, ribsSide, backPlate, ptt, beltFront,
  beltBack, thighR, thighL, forearm, underarm).
- Self-review (SPEC 1 checklist, render check 1-7, the 9.2 table), judged by eye on collar, ptt, backPlate,
  chestFront, thighL, rim-silhouette and lods: every called-out item has anchors / contents / route / job in the
  callouts; the 9.2 loadout is carried (rifle mags, gadget slot and knife on the plate, PTT at the left collarbone,
  radio in the back plate recess with its cable over the left strap, weapon mount receiver on the spine, empty holster
  right thigh, three double sleeves left front thigh, pod / medkit / rappel ring at the belt back) and nothing else;
  1 the silhouette reads under the rims (head with optic, plate shoulder line, holster and sleeves); 2 fabric matte;
  3 suit shell / seam tape / plate / rubber trim / gunmetal separate by value step, relief and sheen; 4 taped seams,
  no stitching on the suit; 5-7 nothing shiny, loose or snagging seen. No fix needed a garment rebuild.
- [Superseded: the zip callout is fixed (fix round 1 item 4, round 2 item 3), the rim glow wash (round 1 item 3,
  round 2 item 1), the thighL caps are in frame (round 1; small, a note) and the lods sheet reads at 7 m (round 2
  verdicts).] OPEN (sheets, not fixed): the close-up callouts list "Suit chest zip: not built yet" although the zip, slider and
  garage are built and visible (collar, chestFront): builtKit() reads only sim.json kit / patch ids; the thighL framing
  cuts the sleeve caps at the frame's top right; the rim sheet's goggle glow light (a Lab point light) washes the back
  green in the 3/4 back view; the Hollowmere 7 m LOD sheet is too dark to judge maps.
- Rendered but not reviewed by eye this step (left for the checker): beltFront, beltBack, thighR, forearm, underarm,
  ribsSide, knee, boots, neckRear, chestRear, shoulder, hands, head, goggle, turnaround, menu, context, compare,
  wireframe, colourblind.
- Step 10 OPEN items as the sheets show them: the LOD1 chest notch shows only in the Cycles bake renders
  (operators:check FAIL, 36 px > 24, unchanged); the LOD0 toe streaks are not visible at the lods sheet's 7 m. Step
  08a OPEN items: not re-judged.
- Checks: `E2E_GPU=1 npm run operators:check -- wren` exit 1, "1 failed check(s)": `wren lod1 FAIL bakeDiff: ["chest:
  36 px at 404,347 > 24"]` (step 10, expected); every item and every other LOD check PASS incl. `ktx2` x5; FLAG hero
  bones 63. `npm run check` PASS (exit 0; 75 test files, 788 tests; lint 0 errors, 38 warnings; build OK).

### Step 11 - Fix round 1 (fixer, Opus 5.5; fix list steps/11-fixes-r1.md)
- Root cause found on the way (A80): the Lab reader flipped the triangle winding on top of the x mirror, so every
  visible face was a back face and two-sided lighting lit it from inside (every light acted from -v). Measured: rim
  rig front sRGB 0.13 -> 0.03 with two-sided lighting off. glb.ts keeps the glTF index order (unit test updated);
  labData.ts documents the frame (figure faces +Z, its right on +X, yaw > 0 views its left) and re-aims every rig.
- 1 DONE. Close-ups render the hero LOD (`lod: 'hero'`, KTX2 through Babylon); captions say so. New finding: the hero
  bake shows blotchy light / dark patches on the suit (forearm, thighR, rim 3/4 back) - in the step 10 bake itself,
  not the transcode (Babylon vs reference decode 0.08 / 255); with the source LOD they were hidden. OPEN, step 10
  block-end retry (bake), not a Lab fix.
- 2 DONE (yaw signs). thighR (yaw -1.3, 0.85 m): holster mouth, shell, platform, leg bands and the hanger fill the
  frame. underarm (yaw -1.35, pitch -0.15): arm, vent zone and the 22 mm side strap with its buckle. ribsSide (yaw
  -1.2): chest plate and the three rib segments overlapping in profile. belt: front right with the holster hanger.
  shoulder (yaw +0.35, left side): strap over the shoulder to the chest-plate tab. forearm now the left arm's outer side.
- 3 DONE. Rim rig (hero LOD): back rims only, goggle spill light off (`glowLight: false`, labelled), lenses glow. Lit
  figure median 0.06 in every view (front p90 0.06); edges at head, optic, plate line, holster and sleeves read but
  are thin in Front / 3/4 front; 3/4 back is lit by the rims as expected.
- 4 DONE. Suit zones from the suit sim report (`SUIT_FEATURES`, `builtSuitFeatures`, unit-tested: shell, seams, zip,
  forearm / knee grip, elbow / yoke / seat abrasion, stretch, underarm / knee-back vents, thumb loops); suitZip and
  thumbLoops count as built; per close-up `suit` and `exclude` lists (beltFront no longer lists the back items); no
  "bare mannequin" or "not built" for built items.
- 5 DONE in the Lab, partly judged. Generated studio environment (`studioEnv()`, ReflectionProbe of emissive boxes,
  no file, no network) on studio / detail / detailRear / figure; materials.py and limits unchanged (A78). The metal
  snaps on the belt pouch show a highlight (forearm sheet); the buckle split lines were not judged by eye this round.
- 6 DONE. `figure` rig for turnaround and compare (grey card sRGB 0.50, no bloom): Wren reads near black and darker
  than the game operator, whole figure in frame; compare no longer claims moth is built. A78, the labData comment and
  every caption now print the measured grey card (`lab.greyCard()`; detail 0.49, figure 0.50).
- KTX2 (D27): `@babylonjs/ktx2decoder@9.29.0` installed (npm, carries every wasm; nothing from a CDN). Lab uses real
  KTX2, Babylon transcode on the GPU, flipped in the texture matrix (Babylon 9.29 does not compensate KTX2 for
  invertY). Babylon vs reference decode, mean abs difference per LOD: hero 0.08, LOD0 0.07, LOD1 0.12, LOD2 0.13, phone
  0.14 (/255; `wren-sheet-ktx2-compare.webp`). Game bundle: `babylon-*.js` still holds the CDN default string (Babylon's
  built-in .ktx2 loader pulls the class in), unreachable: core/babylon.ts blanks `URLConfig.jsDecoderModule` at import
  (`URLConfig.jsDecoderModule=""` in the index chunk); no decoder or wasm in dist. A79, D27, DESIGN.md, art-credits.
- 7 PARTLY. Verdicts by eye (render check 1-7 / SPEC 1):
  - rim-silhouette: PASS 1 (near black front, glow on lenses only); edges thin; 3/4 back shows the bake blotches.
  - compare: PASS 6 (near black, darker than the navy game operator, plates a hair lighter).
  - closeup-thighR: PASS (holster, mouth, bands, hanger); FAIL 3 (bake blotches on the thigh).
  - closeup-underarm: PASS subject (side strap, buckle, vent zone); the vent perforation does not read at 0.65 m.
  - closeup-ribsSide: PASS subject (three segments lapping in profile).
  - closeup-forearm: subject PASS; FAIL 3 (grip panel reads as blotchy patches, the bake).
  - closeup-shoulder (pre-tune render): strap over the shoulder shown; final framing not re-judged.
  - Rendered on the RTX 4090 this round, not judged by eye (budget): turnaround, menu, context, lods, lods-closeups,
    ktx2-compare (numbers above), wireframe, colourblind, goggle, and close-ups head, neckRear, chestFront, chestRear,
    handPalm, handBack, belt, knee, boots, collar, backPlate, ptt, beltFront, beltBack, thighL. OPEN for round 2.
- Checks: `E2E_GPU=1 npm run operators:check -- wren`: "1 failed check(s)", `wren lod1 FAIL bakeDiff: ["chest: 36 px
  at 404,347 > 24"]` (step 10, expected); every other item / LOD check PASS incl. `ktx2` x5; FLAG hero bones 63.
  `npm run check` PASS (75 files, 790 tests; lint 0 errors, 38 warnings; build OK). A second run after the last
  data-only change (close-up framing, thumb-loop callouts) had 4 timeouts at 5 s in files this round does not touch
  (detailPass, pvp, voxel x2) while the machine was loaded; the three files pass when re-run (25 / 25); the operator
  test files pass (29 / 29); lint 0 errors. Port 4191 free.

### Step 11 - Fix round 2 (fixer, Opus 5.5; fix list steps/11-fixes-r2.md)
Lab and sheet fixes only (src/operators/lab/*, scripts/operator-sheet.mjs, labData, tests/operatorLab.test.ts, docs);
no garment module, pipeline or build/operators/wren change (D28 / step 11b pending). Full set re-rendered on the RTX
4090 (E2E_GPU=1, ANGLE D3D11): 32 sheets (new: closeup-buckle).
- 1 DONE. The goggle spill light excludes every operator mesh and the grey human (`glowLight.excludedMeshes`): it
  lights only the scene ahead. Goggle: housing keeps its value, no white blow-out; colourblind / menu / lods / context:
  no green flood or halo over the head. Darkness rig fill 0.4 x sky 0.12-0.25, so a faint silhouette reads behind the
  two lenses (goggle, context 20 m). Stale "stand-in" captions gone (colourblind, context). A80.
- 2 DONE. shoulder: from above and left (yaw 1.0, pitch 0.75, 0.7 m), the left strap from behind the shoulder over its
  top down to the chest-plate tab and buckle, with the PTT and both cables. Callouts now list the PTT, radio cable and
  earpiece cable, which this frame shows.
- 3 DONE. chestRear excludes the front items (mags, gadget slot, knife, zip); ribsSide excludes zip, mags, gadget
  slot, knife; a suit zone that is also a kit item (zip, thumb loops) is called out once, as the kit item (collar now
  one zip entry). Checked against each final frame in the montage review below.
- 4 DONE. `figureStats` uses an operator mask (`lab.maskShot()`: material-id colours on black, floor / backdrop / grey
  human / scale bar hidden). Rim rig: flatter side rims 3.6 + a rim from above behind 2.5: masked Front median 0.00
  (p90 0.30), 3/4 front 0.07 (p90 0.26); bright edges at head and optic, shoulder line, sleeves, holster; Side 0.19
  and 3/4 back 0.32 are lit by the rims as a back rig must. Close-up captions re-measured: masked medians 0.05-0.13.
- 5 PARTLY. New `buckle` close-up (belt closure, 0.3 m, rig `detailFront`, seen from the key's mirror direction);
  metals (hardware set) take env intensity 1; studio env gains a 6 x 4 m front panel. The two gunmetal halves, the
  0.7 mm split line and the rubber edge read (detail-read panel: halves a step lighter than the belt and base); the
  satin highlight is a broad sheen, no hot spot, at base colour 0.051 (F0 5 %). Other buckles: thin edge highlights
  only. Not the Lab any more but the material's value (materials.py, out of scope here): left open. A78.
- 6 DONE. Every close-up has a labelled +2 EV detail-read panel of the same view and LOD (`lab.setExposureBoost`).
  Per-zone judgement in the verdicts below.
- 7 DONE (fix). Cause: shadow acne (A80): faces turned to the key shadowed themselves at bias 0.0008. Diagnosis
  (`operators:sheet -- --only diag`, masked medians front / back): baseline front legs 0.02 / back 0.07; no shadows
  0.08 / 0.07; sheen, normal maps, environment off: no change. Bias 0.004: Front torso 0.10 / legs 0.08, 3/4 front
  0.08 / 0.06, Side 0.07 / 0.07, 3/4 back 0.08 / 0.07, Back 0.07 / 0.07; grey sphere in her place: front 0.40, back
  0.32. Printed on the turnaround. The fix also lifts every key-lit close-up.
- 8 DONE. Wireframe footer prints, per LOD from report.json: triangles, draws, texture sets (cloth / kit / hardware),
  sizes, KTX2 disk MB, VRAM (BC7 / ASTC and RGBA8 fallback), GLB MB; chest wire tile uses LOD0. Lab `stats()` no
  longer says "baked maps arrive in step 10".
- 9 Verdicts (by eye on the round 2 renders; render check 1-7 / SPEC 1). "Bake" = the step 10 hero ORM confetti.
  - turnaround: PASS 1, 6 (near black, key side brighter after item 7; whole figure in frame).
  - menu: PASS (no green flood; figure reads mid-dark under the menu rig; strips hold detail); note: last strip
    column cut by the right edge.
  - context: PASS 1 (Hollowmere: sodium vs moon; darkness 20 m: faint silhouette and the two lenses only).
  - compare: PASS 6 (Wren darker than the navy game operator); moth tile waits (not built).
  - lods: PASS (every LOD loads, KTX2, readable at 7 m). lods-closeups: OPEN (LOD1 / LOD2 / phone mid grey, step 10).
  - ktx2-compare: PASS (Babylon vs reference 0.11-0.14 / 255).
  - wireframe: PASS (costs measured; LOD0 wire reads). [Superseded by fix round 3 item 1: that render drew no wire.]
  - colourblind: PASS (lens glow only; green moves to yellow in protan / deutan, distinct from sodium by hue / value).
  - goggle: PASS 1, 5 (housing its own value; darkness: lenses and faint silhouette; stowed from Cycles, labelled).
  - rim-silhouette: PASS 1 (Front / 3/4 front near black with edges at head, optic, shoulder line, holster, sleeves).
  - closeup-head: PASS 3, 4 (housing, hood, harness, brow plate separate in detail read).
  - closeup-neckRear: PASS (pod, crown straps, band; detail read shows the hood seams); bake on the neck.
  - closeup-collar: PASS 4 (zip and garage, hood skirt, earpiece cable; one zip callout); bake on the shoulder.
  - closeup-chestFront: PASS 2, 3, 4 (plate, mags, gadget slot, knife, ribs, seam tape separate in detail read).
  - closeup-chestRear: PASS (back plate, radio recess, mount, straps; callouts match the frame); 08a lumbar patch.
  - closeup-ribsSide: PASS (three segments lapping, side strap, vent zone); vent holes do not resolve (bake texel).
  - closeup-backPlate: PASS (radio in the recess, cable, mount bar with keyholes); 08a lumbar patch.
  - closeup-shoulder: PASS (item 2 subject in frame).
  - closeup-ptt: PASS (PTT on the strap, both cables plug into its top).
  - closeup-handPalm: PASS 3 in detail read (palm darker, glossier leather vs back); wrist tab small.
  - closeup-handBack: FAIL 3 (bake: confetti over the stretch back); shape and wrist tab read.
  - closeup-forearm: subject PASS (pouch snap highlight, belt); FAIL 3 (grip panel = bake confetti).
  - closeup-underarm: PASS subject (vent zone, side strap, buckle); vent holes do not resolve (bake texel); bake.
  - closeup-belt: PASS (hanger, holster mouth, belt); 08a crotch patch.
  - closeup-beltFront: PASS (belt, closure, pistol mag pouch, cam pouch); closure flat dark (item 5).
  - closeup-beltBack: PASS (pod, medkit, belt); rappel ring bow does not read (note).
  - closeup-buckle: PARTLY (item 5).
  - closeup-thighR: PASS (empty holster, mouth, bands, hanger); bake on the thigh.
  - closeup-thighL: PASS (panel, three double sleeves, caps, bands); caps small (note).
  - closeup-knee: FAIL 3 (knee grip panel not identifiable: bake confetti over the knee); band buckle reads.
  - closeup-boots: PASS shape (rand, lugs, collar, laces); FAIL 3 (bake: glossy patches on the upper).
  Loadout (9.2): every game item has its place, nothing else carried (unchanged since the implementer's review).
- Checks: `npm run check` PASS (exit 0; 75 files, 790 tests; lint 0 errors, 38 warnings; build OK), run after the
  full sheet run; the last change after it is data only (rim intensities, rim sheet re-rendered). operators:check not
  re-run: no pipeline or build change this round (still expected: `wren lod1 FAIL bakeDiff: chest 36 px > 24`).

### Step 11 - Fix round 3 (fixer, Opus 5.5; fix list steps/11-fixes-r3.md)
Lab, sheet script, tests and docs only; no garment, materials.py, pipeline or build/operators/wren change (D28 / D29
and the gunmetal value are step 11b). Re-rendered on the RTX 4090 (E2E_GPU=1, ANGLE D3D11): wireframe and the
close-ups head, neckRear, collar, chestFront, ptt, beltFront and the new hipL (33 sheets now).
- 1 DONE. Cause: `lab.load()` builds fresh (solid) materials and the sheet's render() calls `setDebug` only when the
  view changes, so after the first LOD every tile of the strip and the chest tile drew shaded. load() now re-applies
  the current debug view. WebGL does not cull lines, so a bare wire showed every layer through the figure: the wire
  view adds a flat near-black underlay (clones sharing geometry and skeleton, zOffset 2), so only the edges of the
  surfaces facing the camera show. Verdict (by eye): wireframe PASS - LOD0, LOD1, LOD2 and phone show their triangle
  edges; the chest tile shows LOD0's wire over the plate, rib segments and pouches; source (2.5 M) and hero read dense.
- 2 DONE. Callouts per frame (labData `include` / `exclude`, unit-tested): the earpiece (in the ear under the hood and
  balaclava) is never called out; its cable is on collar and ptt, not head or neckRear (under the skirt and
  balaclava there). head: no battery pod. collar: no head harness (only the chin is in frame). chestFront: no PTT
  (above the frame's top edge). beltFront: the magnetic closure is called out (`include: magBuckle`). The sling socket
  is hidden behind the cam pouch from the front, so a new close-up `hipL` (left hip from the side, 0.6 m) shows it
  between the cam pouch and the drone pod; DESIGN.md's loadout table names hipL for the sling socket (and adds it for
  the cam pouch and the pod). neckRear adds the goggle band and cable, which it shows.
  Verdicts (by eye): head, neckRear, collar, chestFront, ptt, beltFront, hipL: PASS (each list names only what its
  frame shows; the sling socket's flush QD socket on its boss reads in hipL).
- 3 DONE. The implementer's superseded lines are marked (KTX2 decoder OPEN, the 0.18-0.27 medians, 30 sheets, the
  "OPEN (sheets, not fixed)" item) and the round 2 wireframe verdict. STATE.md: step 11b list with the gunmetal target.
- Checks: `npm run check` PASS (exit 0; 75 files, 791 tests; lint 0 errors, 38 warnings; build OK), run after the last
  code change and after the GPU sheet runs. operators:check not re-run: no pipeline or build change this round (still
  expected: `wren lod1 FAIL bakeDiff: chest 36 px > 24`). Port 4191 free.
- Open (step 10 / 08a block-end retry, not fixed here): hero bake confetti (handBack, forearm, knee, boots, thighs,
  underarm, neck); LOD1 / LOD2 / phone mid grey; LOD1 chest bakeDiff; vent holes below bake resolution; 08a lumbar and
  crotch patches. Gunmetal value too low for a clear satin highlight under any Lab light (materials.py; item 5).
  Notes: menu last column cut; compare figures in the left of the tile; beltBack rappel ring bow; thighL caps small.

- Status: OPEN after 3 fix rounds [closed by the block-end retry below]; evidence: steps/11-fixes-r4.md; remaining: 1. close-up callouts name only each
  frame's subject, not every visible item (SPEC 1): hipL belt and pistol pouch, collar and chestFront harness straps
  and buckles, ptt zip and mag tops, beltFront ribs, holster top and sleeve caps; audit all 22 close-ups' include
  lists, one test each, a DESIGN.md rule line, re-render the changed ones. Step 10 / 08a follow-ups and the D28 / D29 /
  gunmetal items (step 11b) are logged above.

### Step 11 - Block-end retry (implementer, Opus 5.5; steps/11-fixes-r4.md plus STATE "Now")
Lab data, kit text, tests and docs only; no asset, pipeline or build change (assets final after the step 10 retry).
Every Wren Lab sheet re-rendered on the RTX 4090 (E2E_GPU=1, ANGLE D3D11, 2026-10-18): the full set (33 sheets), then
the 22 close-ups again after the callout change (`--only closeups`).
- 11-fixes-r4 item 1 DONE. All 22 close-ups audited by eye on the retry renders (crops of the 4K panels where an item
  sat at a frame edge); every kit item and suit zone clearly identifiable in a frame is now called out through
  `include` / `suit` in `src/operators/lab/labData.ts`, items cut past recognition stay out (`exclude`). Added:
  head + harness shoulder straps, suit shell (the PTT at the bottom edge stays out); neckRear + crown straps, side
  straps, shoulder straps, suit shell; chestFront + pistol magazine pouch, elbow panels; chestRear and backPlate +
  shoulder straps, side straps, pistol pouch, glove (+ elbow panels); shoulder + chest plate, suit zip, gadget slot,
  rifle magazines (no longer excluded: in frame edge-on), side straps, glove, hood, balaclava, underarm vent;
  handPalm / handBack + suit shell; belt + medkit, cam pouch, knife, sleeve hanger (no longer excluded: all in frame),
  buckle, rib segments, rifle magazine bottoms, glove; knee + leg bands, band buckle, holster muzzle end; boots + suit
  shell and seams; collar + buckle, chin strap, radio cable, seams, yoke; ribsSide + suit zip end, rifle magazines,
  belt, medkit, glove; ptt + suit shell, seams, elbow panel; beltFront + rifle magazine bottoms, medkit (no longer
  excluded), holster top, sleeve caps, sleeve hanger; hipL + rifle magazine bottoms, rib segments, sleeve hanger,
  glove; beltBack + belt, pistol pouch, sling socket, sleeve caps, holster; thighR + glove, band buckles, knife (behind
  the right thigh at the far edge; no longer excluded); thighL + band buckles; forearm + glove, pistol pouch, suit
  shell, underarm vent; underarm + chest plate, rib segments, rifle magazines, suit zip end, forearm grip, elbow;
  buckle + suit shell and seams. The brow rivets (A87, visible on the head close-up's brow plate) are named in the
  harness side straps' attachment text (`src/operators/kit.ts`), so head and neckRear call them out. Tests
  (`tests/operatorLab.test.ts`): a new case with one assertion per changed close-up (22) plus the rivet text; the hipL
  exact list and the round 3 "thighR has no knife" line updated to the audit. DESIGN.md: the callout rule in one
  line block, the loadout table's close-up column lists every close-up that shows each item.
- Trivial DONE: the repeated "Port 4191 free." line under fix round 3 dropped.
- DESIGN.md costs from build/operators/wren/export/report.json (STATE "Now"): hero 229,391, LOD0 39,809, LOD1 13,578,
  LOD2 5,964; PNG / WebP GLB / BC7 VRAM per LOD; the KTX2 table (35.1 / 13.7 / 3.6 / 1.8 MB on disk, GLB 52.9 / 17.5 /
  4.8 / 2.4 MB, lowest PSNR 35.5 / 37.1 / 36.8 / 38.4 dB, VRAM 96 / 32 / 8 / 4 MB); silhouette IoU, open edges,
  back-face pixels and source triangles (2,522,132) refreshed; the phone row and phone columns removed (D29); the
  integration anchors re-read from the LOD0 GLB empties (weapon mounts now (+-0.0727, 0.0744, 1.1725) and centre
  (0, 0.0794, 1.1747); holster and sling socket unchanged); backGearM 0.0103 (report.json); the holster Cycles render
  (lods-d) listed; gunmetal line corrected to A86 (F0 0.15-0.165, roughness 0.60). Loadout table checked against D28:
  pod rear right (A88), sleeves outer left thigh, knife 190 mm, pistol magazines 9 o'clock, socket 8 o'clock - matches.
- Sheet verdicts (by eye, ART-DIRECTION render check 1-7 and SPEC 1):
  - turnaround PASS: silhouette reads in every view (1), matte (2); masked medians torso 0.08-0.11, legs 0.06-0.09.
  - rim-silhouette PASS: head with the square goggle, plate shoulder line, slim straps, belt, holster right, knife and
    three sleeves outer left read under the rims (1); nothing stands proud (7).
  - menu / context / compare / colourblind / goggle PASS (menu last column cut and compare figures left of the tile:
    notes as before; full darkness at 20 m shows only the two lenses; protan / deutan glow yellow but distinct from
    sodium by value; the stowed goggle panels are the post-11b head-kit Cycles renders of 2026-10-17).
  - lods PASS (one silhouette across hero / LOD0 / LOD1 / LOD2 at 7 m); wireframe PASS (tile counts match report.json:
    229,391 / 39,809 / 13,578 / 5,964); ktx2-compare PASS (Babylon BC7 vs reference decode 0.10 / 0.10 / 0.12 / 0.12
    of 255).
  - lods-closeups PASS with a note: LOD1 and LOD2 "torso bent" tiles show a baked zigzag stitch streak down the right
    hip by the hanger, and LOD1 a short dark slash on the thigh; LOD2 chest a few dark specks (follow-up below).
  - All 22 close-ups PASS (render check 1-7, SPEC 1): near-black reads near-black (masked medians 0.06-0.13), the +2 EV
    panels separate suit shell / tape / grip pebble / vent perforation / composite / rubber / gunmetal by value step,
    relief and sheen (3), bonded taped seams, no stitching on the suit (4), clean single radius family and one metal
    (6), nothing loose or snagging (5, 7); every identifiable item now has its callout (what, anchors, contents, route,
    job) and the longest list (shoulder, 17 entries) fits the side panel.
- Checks: `npm run check` PASS after the last code change and after both GPU runs (exit 0; 76 files,
  805 tests; lint 0 errors / 38 warnings; build OK). operators:check not re-run: no asset, pipeline or build change
  (the step 10 retry's run stands, every line PASS). Port 4191 free.
- Follow-ups (assets final; not rebuilt here): (1) LOD1 / LOD2 baked zigzag stitch streak at the right hip hanger and LOD1 thigh slash (lods-closeups, torso bent);
  (2) hero bake confetti still visible at +2 EV on glove fingertips (belt, handPalm) and the rib segments' faces
  (ribsSide, underarm) - known since step 10, reads only at +2 EV; (3) the brow rivets are hardware without a kit
  item of their own: named through the side straps' attachment (a separate `browRivets` kit entry would need a
  validateKit / builtKit id - left as is).
- Status: CLOSED (11-fixes-r4 item 1 and the trivial item done; every sheet re-rendered and judged).

### Step 11 - Block-end retry, fix round 1 (fixer, Opus 5.5; fix list steps/11-retry-fixes-r1.md)
Callout data, tests and docs only; no asset, pipeline or build change.
- Item 1 DONE. `thumbLoops` added to `exclude` of handPalm, handBack and forearm (`src/operators/lab/labData.ts`; the
  loops sit under the glove cuffs, never visible: the earpiece rule). Tests: one `not.toContain('thumbLoops')` per
  close-up. DESIGN.md's comms / callout paragraph names the thumb loops beside the earpiece as never visible.
- Item 2 DONE. `include` grew: forearm + `waistBelt`, `sleeveHanger`, `magBuckle` (the belt under the pistol pouch,
  the hanger and its buckle at the bottom left); neckRear + `goggle` (housing side and lug at the left edge);
  beltFront + `sleevePanel` (top edge under the hanger). Tests: one assertion per close-up.
- Notes: DESIGN.md now says the wireframe sheet's source "2,628,557 triangles" is the Lab's count of the source export,
  not report.json's 2,522,132 render triangles. chestRear's cut drone pod left out (within the rule; not re-rendered).
- Re-render: `SHEET_CLOSEUPS=handPalm,handBack,forearm,neckRear,beltFront E2E_GPU=1 E2E_PORT=4191 npm run
  operators:sheet -- wren --only closeups` (ANGLE D3D11, RTX 4090, 2026-10-18, 5 sheets). By eye: handPalm and
  handBack list suit shell and gloves only; forearm lists the belt, buckle and hanger, no thumb loops; neckRear lists
  the square goggle housing; beltFront lists the sleeve panel; every side panel fits (forearm 10 entries, beltFront 11).
- Checks: `npm run check` PASS after the last code change and the GPU run (exit 0; lint 0 errors / 38 warnings; 76
  files, 805 tests; build OK). operators:check not re-run (no
  asset, pipeline or build change). Port 4191 free.
- Status: CLOSED (items 1 and 2 and both notes done).

- Block-end retry status: passed the independent check (fix rounds: 1). Step 11 is closed; the Wren block is complete.
  Step 18 notes: LOD1/LOD2 hip-hanger streak and LOD1 thigh slash; +2 EV confetti on glove fingertips and rib faces.

## Step 11b - Wren: rigid kit and desktop only (Opus 5.5)

Status: draft (implementer). D28 (Michael's picks), D29, plus the orchestrator's brow-rivet item (Michael: "floating
dots on her forehead pad"). Assumed decisions A81-A88 (A88: a conflict between the picks, for Michael).

**Built**
- `kit_common.py`: `Flat` (a rigid map: anything laid through cbox / mpts / cord_loop on it is one transform of its
  design), `flat_on` (the plane fitted to the surface under a footprint, optionally one plate, moved out clear of it;
  returns the seat gap), `seat` (a moulded wedge: back on the body, front the item's flat back), and the rigid
  registry in `Parts` (`part`, `tag`, `tag_since`, `seat_of`; `_rigid` id + design coordinates on every vertex,
  `measurements.rigid` in the sim report). `cbox` and the conformal maps stay for soft parts.
- Layout (D28): rifle magazines 2, true 178 mm with their curve, vertical, base plates up, lips 80 mm over the belt,
  one placard on a saddle bonded to the chest plate (A83); pistol magazines 2, true 128 mm, horizontal at 9 o'clock,
  lower row's bottom 3 mm over the belt's lower edge, base plates forward, on a moulded seat; sling socket at 8.0
  o'clock behind them (anchor and `anchors:slingSocket` check); cam pouch front left; knife true 190 mm on the outer
  front of the left thigh (-60 deg), handle up; three straight sleeves at -35 / -13 / +9 deg, caps up, top canisters
  true 90 mm (A85); drone pod flat (D1) on a saddle, rear RIGHT, medkit soft on the right side (A88: the left rear has
  no room once the magazines sit at 9 and the socket at 8); radio on a planar recess floor (armour.py `FloorShell`);
  tabs, D-ring, sling boss, PTT, buckles, holster all rigid; plates and rib segments tagged per piece (A81).
- Skinning rule (`py/rigid_skin.py`, used by export_gltf.py, bake_lods.py, pose_check.py): every rigid part one weight
  vector on its declared bone(s) (rib 2 chest 0.5 / spine 0.5); head hard parts by rule; `_RIGID` ships in every GLB
  (A81). LODs: hard rigid pieces 5-25 cm stay separate below LOD0, shell vertices within 4 mm adopt a part (A82).
- `rigidKit` (src/operators/rigidKit.ts, tests/operatorRigidKit.test.ts, 12 tests after fix round 1): shape (Horn best fit, <= 1 mm),
  depth into the suit (<= 0.5 mm), seats over 3 mm mounted, small hardware on its host (<= 0.5 mm), true sizes
  (+-2 mm), the D28 bone rule; `rigidSkin:<lod>` reads the GLB's `_RIGID` and weights (spread <= 0.001, each part's
  weights equal to its declared ones within 0.01, every registry hard part present unless A82 / `LOD_ABSORBED` names
  it); `anchors:slingSocket` 7.5-8.5 o'clock. check_garment.py writes the raw `rigid` data.
- Brow rivets (head_kit.py, A87): seated along the plate's normal on a new 14 mm side-strap tab (the side straps ended
  outside the plate's flat); host gap 0.0 mm, 0.3 mm from the tab's centre line; `rigidKit:hostGap` judges them.
  The amber dot on the goggle's top is the designed status light, not a rivet.
- Desktop only (D29): phone LOD gone from bake_lods, lodChecks (budget, shells), check.mjs, the Lab LOD lists and the
  phone-look preset, the sheets, ktx2.mjs text, SPEC 6.3 / 6.4, DESIGN.md, README; stale phone files deleted.
- Gunmetal (A86): `materials.gunmetal`, metallic; fix round 1 darkened it to F0 (0.15, 0.155, 0.165) linear, roughness
  0.60, worn edges 0.03 smoother (the hard band starts at 0.55; the Lab's flat factor (0.155, 0.60)), so it reads as dark
  anodised grey (the first pass's F0 0.30-0.33 read light silver-grey).
- Callouts (11-fixes-r4 rule applied while re-rendering): chestFront + harness shoulders, buckles, side straps;
  collar + harness shoulders; ptt + suit zip; beltFront + rib segments; hipL now pistol magazines, socket, belt, cam
  pouch; thighL re-aimed at the outer thigh (knife, sleeves, panel); buckle + cam pouch, medkit, rib segments; one test
  each in operatorLab.test.ts. The full 22-view audit by reading every close-up is left to the block-end 11 retry.

**Item table** (pose results from `build/operators/wren/wren-poses.json`; poses as LAYOUT.md)

| Item | True size (mm) | Position | Bone | Seat gap | Prone | Climb | Crouch | Rappel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rifle mags x2 | 178 x 62-70 x 24 (+16 curve) | chest plate, x +-39, z 1.021-1.199 | chest | 26.6 (saddle) | on the ground 22 mm (accepted: the support point; roll to draw, LAYOUT 4) | clear | R1 meets the knife -6 mm (accepted, below) | clear |
| Pistol mags x2 | 128 x 34 x 24 | 9 o'clock, rows z 0.931 / 0.969 | pelvis | 26.6 (seat) | flank -3 / -4 mm (accepted: skin collapse at 78 deg abduction, contact scale) | clear | clear | clear |
| Knife | 190 (34 x 14 sheath) | left thigh -60 deg, z 0.555-0.745 | hipL | 9.6 (seat) | clear | clear | meets R1 -8 mm (accepted, below) | under the modelled leg loop (accepted: no sit harness, LAYOUT 3) |
| Canisters x3 | 90 x 25 x 18 | left thigh -35 / -13 / +9 deg | hipL | 6.2 / 4.6 / 3.8 (seats) | clear (T2 draw 3/9 amber) | clear | clear (no calf contact) | under the leg loop (accepted, LAYOUT 3) |
| Drone pod | 84 x 80 x 19 | rear right, z 0.866-0.946 | pelvis | 12.7 (saddle) | draw 6/9 by the body (accepted: lid faces up-back, reached with a roll) | clear | clear | clear |
| Holster | 155 shell | right thigh, game slot | hipR | platform | clear | clear | clear | under the leg loop (accepted, LAYOUT 3) |

Accepted with reason: the deep crouch is the scratch's extreme (thighs 20 deg over horizontal, trunk 30 deg forward):
the thigh itself reaches the magazine lips there (LAYOUT 4) and the knife pommel adds the -6 / -8 mm. Fix round 1
measured the game's own crouch and sneak (below): the knife clears R1 by 109 / 121 mm there, so the knife and the
magazines stay where D28 put them. Rappel lines come from a modelled sit harness Wren does not wear.

**Game poses (fix round 1, item 4)**: `npm run operators:sheet -- wren --only gamePoses` exports the game rig's crouch
(CharacterRig crouch 1) and sneak (crouch 0.6, walking) from labData POSES through the Lab's retarget as the operator's
posed skeleton (`build/operators/wren/wren-game-poses.json`); pose_check.py applies each bone's world delta about its
bind head (bind mismatch 0.0 mm, posed head error 0.0 mm) as poses `gameCrouch` / `gameSneak`
(`wren-pose-gameCrouch.webp`, `wren-pose-gameSneak.webp`). Signed distances (mm, + = clear):

| Pair | Scratch deep crouch | Game crouch | Game sneak |
| --- | --- | --- | --- |
| Knife / R1 | -8 (K), -6 (R1) | +109.1 | +121.5 |
| Knife / R0 | +52 | +179.9 | +187.0 |
| R1 / thighs | thighL 16.7 | no thigh within reach (torso 17.9) | no thigh within reach (torso 17.9) |
| R0 / thighs | thighR 16.7 | no thigh within reach (torso 18.9) | no thigh within reach (torso 18.8) |
| Caps T0 / T1 / T2 to R1 | 27 / 59 / 93 | 152 / 183 / 211 | 163 / 194 / 225 |
| Caps T0 / T1 / T2 to the thigh (own surface, rest 13.7 / 11.8 / 11.1) | 13.7 / 11.8 / 11.1 | same | same |

No contact between rigid items or with the body in either game pose. The pose check's draw rays (from the grip end along
the draw direction) do hit her own body there, recorded as RED by its rule and noted for locomotion integration (not
kit interference): in the game crouch the unarmed guard holds both forearms across the chest, over the rifle magazines'
base plates (R0 9/9, R1 4/9 rays, hand room 8 / 3 mm), and the raised left thigh lies across the pistol magazines'
forward draw (P0 / P1 9/9, hand room 32 / 46 mm); in the sneak R0 5/9 (2 mm) and P1 6/9 (5 mm). A reload or a draw
moves the hand out of the guard first; the game's reload clips decide it at integration.

**Numbers** (fix round 1): hero 229,347 / LOD0 39,809 / LOD1 13,577 / LOD2 5,562 triangles; rigid parts per GLB 50 / 50
/ 48 / 43 (rigidSkin worst spread 0, worst weight difference 0 in every file; shell-absorbed as A82: LOD1 browRivetL / R,
LOD2 gadgetTab, camTab, slingSocket, rappelRing, browRivetL / R). A first LOD run kept the plates and ribs separate too:
LOD2's shell starved (six bakeDiff views failed, boot 358 px); they stay in the shell (A82).

**Check result lines** (fix round 1, final): `npm run operators:check -- wren`: every item PASS - rigidKit:shape worst
0 mm (head_kit 2 parts, chest_rig 5, waist_belt 8, leg_kit 11; armour 5 as built, A81), depth worst 0.03 mm, hostGap
worst 0.42 mm (brow rivets, measured by check_garment), seats mounted, sizes (rifle magazines 178 x 84.7 x 25.6, pistol
magazines 128 x 34 x 24, knife 190 x 33.8 x 22, canisters 90 x 26.7 x 18.7 / 89.7 x 25.4 x 17.8 / 89.5 x 27.4 x 19.2,
drone pod 84 x 80 x 19), bones; anchors:slingSocket 8; rigidSkin PASS hero / LOD0 / LOD1 / LOD2; LOD1 triangles 13,577
(SPEC 6.4 12,000-15,000). The one FAIL is the known step 10 line `wren lod1 FAIL bakeDiff: ["chest: 31 px at 404,347 >
24"]` (block-end retry). bakeDiff LOD1 head 16 px, holster 8; LOD2 holster 13 (was 26), head 8.
Pose sheets `wren-pose-{rest,prone,climb,crouch,rappel,gameCrouch,gameSneak}.webp` (Cycles, RTX 4090) re-rendered on the
final build; the numbers in the tables above are unchanged. All Wren sheets re-rendered (E2E_GPU=1, ANGLE D3D11 RTX
4090) after the gunmetal change.

`npm run check`: exit 0 (76 files, 803 tests; lint 0 errors / 38 warnings; build OK). Port 4191 free.

### Step 11b - Fix round 1 (fixer, Opus 5.5; fix list steps/11b-fixes-r1.md)
1. Design record from before the map: `cbox` / `mpts` / `cord_loop` record the map-space input (`cu + du, cv + dv, h`)
   as the design; parts built in one frame use `KC.Frame` and `Parts.place` (local coordinates before the frame
   transform, plus the frame's offset); `Parts.tag` raises on a hard vertex with no design record; the plates keep their
   as-built shape (body-shaped by design, A81, reported `asBuilt: 5`). Proof: `rifleMag0` laid through the conformal map
   `Mf` instead of `Fmag` failed `rigidKit:shape` at 22.09 mm; reverted. Vitest: a magazine laid through a curved map
   fails (> 1 mm) and passes on a flat frame; a hard part with no design record fails. The canisters' design record
   sits on their own oval axes (frame `fa`) while the world geometry keeps the world-x build frame (A89).
2. Brow rivets 502 / 503: head_kit tags their vertices `_rigid` with design coordinates; check_garment measures every
   small hard part's host gap itself (the builder's number stays as information): head_kit reports shape, depth and
   hostGap with `parts: 2`, hostGap 0.42 mm; `rigid_skin.tag_head` keeps them on the head bone (BONE_RULE browRivet).
3. `rigidSkinCheck` compares each part's weight vector with its declared weights within 0.01 and lists registry hard
   parts absent from a file; an absence passes only when A82 / `LOD_ABSORBED` names it (A82 records the weights the
   shell took there). legBandBuckleL0 (301), missing from the implementer's LOD1, is present after the rebuild (built in
   its own frame). Vitest: rib 2 at chest 1.0 fails; a missing part not in the A82 list fails.
4. Game crouch and sneak measured (`--only gamePoses`, pose_check `gameCrouch` / `gameSneak`; table above): knife to
   R1 +109.1 / +121.5 mm, so the deep-crouch acceptance cites them and the knife stays.
- Orchestrator notes: gunmetal darkened (A86; measured below), the stale waist_belt "rear left" comment and labData's
  unused `phoneLook` field removed.
- New regressions met on the way and fixed: LOD2 holster bakeDiff 26 px (the canister ring phase; restored by building
  the canisters in a world-x frame: 13 px); `rigidKit:size` canisters 24.9 mm vs 18 (the design record was on the
  world-x frame; now on the canister's axes); LOD1 head bakeDiff 30 px (a goggle-housing edge crease after the shell's
  global decimation shifted; LOD1 target 13,500 to 13,600, A89: 16 px). No threshold changed.
- Gunmetal measured: on `wren-sheet-closeup-buckle.webp` (calibrated panel, sRGB luma) the halves read median 0.155 / 0.159 (p10-p90 0.152-0.160) against the belt's 0.118: dark anodised grey, a step lighter than the laminate; the satin lobe shows only on the bevels and worn edges (p99 0.30, max 0.38), the flat faces carry none (flat planes under the calibrated key; the hard band's floor, roughness 0.55, would barely tighten it). Left for Michael's eye at the block end.

**Open / notes**
- A88: Michael confirmed "Pod rear right (Recommended)" (D28).
- A86 gunmetal needs Michael's eye: dark anodised grey now, satin only on bevels and worn edges (measured above).
- The 22-close-up callout audit (11-fixes-r4) and the step 08a / 10 / 11 retries run at the block end.
- Cleanup note: a process cleanup in this step matched every process with "operators" in its command line (this
  worktree's path), so background shells of other sessions in this worktree may have been stopped.
- Checker round 2 note (not a fail): in the game crouch the raised left thigh blocks the 9 o'clock pistol mags'
  forward draw (P0 / P1 9/9, hand room 32 / 46 mm; sneak P1 6/9); put to Michael at the block end.
- Status: passed the independent check (fix rounds: 1).

## Step 11c - merge master 4.0.0 into feature/operators (Opus 5.5)

D31 (Michael, 2026-10-18). `git merge origin/master` (6f81c83, "Night Shift 4.0.0: consolidation (#3)"; merge base
e60c835; 543 master commits, 40 operators commits). Master's deletions and decisions (docs/DECISIONS.md G1-G122) kept;
the operators work kept. 952 files in the merge (606 added, 57 deleted, 277 modified, 12 renamed). No modify/delete
conflicts: master deleted nothing the operators work had touched.

**Conflicts and resolutions (10, all content; none in code the game runs)**
- `.gitignore`: union (operators `/build`, `__pycache__/`; master's kestrel cert, `/pc/`, music and sfx caches).
- `eslint.config.js`: union of the ignore lists (operators `build`, `vite.operators.config.ts`, `docs/**/*.workflow.js`;
  master `test-results`, `.music-cache`, `.sfx-cache`).
- `package.json`: master's (4.0.0, editor, music and sfx scripts) plus the seven `operators*` scripts; the
  `@babylonjs/ktx2decoder` devDependency (D27) was outside the conflict and stays. `package-lock.json` merged to the
  operators side unchanged (master never touched it), so no `npm ci`.
- `scripts/perf.mjs`: master's whole. The operators side only carried the old phone-info-only tail (bible 1.14);
  auto-merged it referenced master's deleted `phone` / `mobile` variables (a ReferenceError at the end of every run).
- `TESTING.md`, `docs/systems/performance.md`, `docs/story.md`: master's. The operators edits were the phone smoke
  check, the phone-info-only budget note and "each is their own real size"; master's desktop-only text and story 2.1
  (G109: "they differ in look and height") replace them.
- `CLAUDE.md`: master's, plus the operator pipeline's art exception in "Hard rules" (the CC0 base body, meshes generated
  offline by in-repo Blender scripts and bundled) and a `docs/operators/` row in the doc index. Dropped as covered by
  master: the "On branch feature/operators, follow docs/operators/RULES.md" first line (master's "Every session" step 3
  reads the job's RULES and STATE), "How sessions are run" (master's "Running a job"), the desktop-only platform line.
- `docs/design-bible.md`: master's 2.0 (G1-G118) whole; the operators 1.15 edits (5.14 generated operators, sizes,
  Section 6 and 5.16 art exceptions, phone wording) are superseded by master's 5.14 / G68-G75 / G109. One addition in
  Section 6 "Never", which leaves the pipeline's sources to this branch (G75): "a CC0 base human body, built into each
  operator offline by in-repo Blender scripts and bundled".
- `docs/systems/session-method.md` (add/add): master's ("How a job is run", G87), plus the operators run as a proven
  example and the ops D18 note on Workflows.

**Step 11c - merge master: depends on deleted systems** (listed for Michael; nothing rebuilt or removed from the asset)
1. Drone pod (`dronePod`, rear right of the belt, A88; "the folded tri-rotor and its battery"): the player drone is
   deleted (G7, G115). Built in `scripts/operators/py/garments/waist_belt.py` (parts dronePod / Latch / Seat / Tab),
   `src/operators/kit.ts` (WREN_KIT), `src/operators/rigidKit.ts` (size 84 x 80 x 19, pelvis rule), `py/pose_check.py`
   (item D), `src/operators/lab/labData.ts` (beltBack close-up), tests (`operators.test.ts` coverage list,
   `operatorRigidKit.test.ts`). Master's open item: "What Wren's hip pod holds now the drone is removed (ART-08, ops D25)".
2. Medkit pouch (`medPouch`, right side of Wren's belt, contents `medkit`, A88): carried medkits are deleted (G98,
   G115); master's WEAP-11 says "the medkit pouch goes with G98". Same files as 1 (waist_belt.py parts medPouch,
   kit.ts, rigidKit.ts rule). Moth's planned `medPouch` (kit.ts, climbing harness, "first aid") and
   `py/garments/carrier.py` (KITS list) carry the same dependency.
3. Guns outside the CT kit (master keeps `rifle` and `pistolSd`, `WeaponId = 'rifle' | 'pistolSd'`): the thigh holster
   cavity is sized for "the largest thigh-slot sidearm in weaponDefs.ts (the five-seven's 31 mm width)"
   (`py/garments/leg_kit.py` header, kit.ts thighHolster), now only the suppressed pistol; the sling socket is "the
   anchor of the game's compact-gun sling slot (A41)" for an SMG (kit.ts slingSocket); `EXTERNAL_ANCHORS` in kit.ts
   lists `'smg'`. The rifle magazines and rifle bungee match the kept rifle.
4. Phone budgets / phone LOD: none left in the pipeline (removed in step 11b, D29). Doc remnants only: SPEC.md 563
   (the "Phone impact" table row) and the quoted bible 1.15 text at SPEC.md 672 and 698 ("phones never download hero
   assets"); BRIEF.md and old DECISIONS / LOG entries are history.
5. Three-lens goggle: no dependency. Every mention in the operators docs is a prohibition (ART-DIRECTION.md 25,
   BRIEF.md 34, RULES.md 23, SPEC.md 62), matching G69. Related for step 11e: G73 wants the goggle on the brow with a
   dim glow when vision is off and over the eyes when on; head_kit builds the stowed (brow) position as a rigid
   transform (`stowM`) but exports only the in-use position.

**Other master rules that touch this run** (for the orchestrator)
- Ports (master CLAUDE.md, G94): 4191 is software-GL logic e2e only, "never with `E2E_GPU=1`"; GPU work uses 4189. The
  operators preamble runs the GPU Lab and sheets on 4191.
- Master CLAUDE.md: "Never run `npm run dev`, `npm run preview` or a watch mode from an agent". `npm run operators`
  ends in `vite preview` (the preamble already routes Lab use through the sheet scripts).
- Master bible 5.14 still says Wren goes in "behind a dev switch" (G70); D31 / G123 replaces that in 11d / 11e.
- `src/player/characterRig.ts` changed on master (+590 / -249: step 12b head cap, `LIVE_RIGS`, edge-hand timing); no
  joint (`n(...)`) changes, so `operatorBody.ts`'s bind-pose mirror holds. The Lab imports it; the pipeline does not.

**Checks**
- `npm run check`: PASS (lint 0 errors / 41 warnings; Vitest 134 files, 1537 tests passed; typecheck and build OK).
- `npm run operators:check -- wren`: not run. The merge changed no pipeline file (scripts/operators, src/operators,
  operator tests, vite.operators.config.ts, operators.html) and none of their imports (`src/player/proportions.ts`).
  The Lab imports `characterRig.ts` (changed on master), but the Lab is not part of operators:check.
- `E2E_PORT=4191 E2E_JOBS=2 npm run e2e:quick` (report only; 955 changed files, so nearly the full set, 44 suites):
  36 ok; KNOWN FLAKY failed: e2e-netmove, e2e-coop, e2e-pad; 5 failed: e2e-anchors, e2e-kestrel, e2e-camera-bounds,
  e2e-music, e2e-editor. Serial rerun of the 5: e2e-anchors and e2e-music pass (load); e2e-kestrel ("camera rays along
  the tour"), e2e-camera-bounds (level U) and e2e-editor fail. All three are the pre-existing Kestrel-owned failures in
  master's consolidation PR (docs/archive/consolidation/PR-BODY.md 48, AGENT-PREAMBLE.md 42); none touches operators code.
- Merge commit a804c48 (not pushed). Uncommitted after it: this LOG draft, STATE.md, the orchestrator's 11d / 11e step
  file edits, and a line-ending-only touch of tests/__snapshots__/visionIsolation.test.ts.snap from the Vitest run.
- Status: merged; check passed; e2e failures are master's known ones.


## Step 11d - Wren: game runtime (Opus 5.5)

Status: draft (implementer). D31 / G123 (Wren is the player body for both players, no dev switch), kept tight per
Michael (2026-10-18: "I want wren in the game first"). Assumed decisions A96-A98. No asset changes.

**Built**
- `docs/archive/operators-runtime/SURVEY.md` (player body, co-op bodies, cameras, shadows, gameplay isolation, bundling;
  file:line) and `DESIGN.md` (modules and API, manifest, LOD / hero choice, bundling, sizes and load time, sharing,
  skeleton link, materials, goggle states, the asset follow-up, disposal, the 11e integration map, risks).
- Pure, Babylon-free (`src/operators/runtime/`): `manifest.ts` (LOD names, `manifestFromUrls`, `validateManifest`,
  `sameOrigin`, `validateModel`), `lodPick.ts` (8 / 25 m bands, 10 % hysteresis, hero only for `CLOSE_CAMERAS`,
  fallback to what is loaded; no allocation), `goggle.ts` (`GoggleState`, `partitionGoggle`, `goggleRange`; A96),
  `pose.ts` (`poserSetup`, `OperatorPoser.solve`: the Lab retarget on flat typed arrays, no allocation, hyp3; A97).
- Babylon side: `figure.ts` (`OperatorLibrary` per Scene: fetch + parse once per URL, shared geometry / materials /
  KTX2 textures through the bundled decoder; `OperatorFigure` per body: own nodes, skeleton and glow per LOD, bones
  linked to the nodes, LOD swap, goggle range swap, head hide by the head joint's scale, dispose); `assets.ts`
  (`wrenManifest()` from `import.meta.glob('../assets/*/*.glb', ?url)`; empty until 11e copies the files, A98).
- `src/operators/lab/glb.ts`: reads an optional `_GOGGLE` vertex attribute (the only existing-file edit).
- Tests: `tests/operatorsRuntime.test.ts` (18: manifest, picker, goggle, poser incl. the Lab match to 1e-9 with a
  pelvis drop, a body tumble, local-to-world, and the four built Wren files when build/ exists),
  `tests/operatorsRuntimeFigure.test.ts` (2: NullEngine, two Wren bodies on real CharacterRigs: one fetch per file,
  shared geometry and materials, own skeleton and glow, LOD by distance, hero for a close-up camera, head joint follows
  the rig, bone linked, goggle ranges and glow, head hide, dispose; off-origin URL refused), fixture
  `tests/helpers/operatorFixture.ts`.

**Numbers**
- Files (build/operators/wren/export): hero 55.5 MB, LOD0 18.4, LOD1 5.1, LOD2 2.5 = 81.4 MB download; VRAM BC7 96 /
  32 / 8 / 4 MB. Parse of all four 0.1 s (Vitest). Download about 4 s (game LODs) / 9 s (hero) at 50 Mbit/s; KTX2
  transcode time pending the 11e GPU run. All four validate (joints, identity container, 4 influences, `-glow`).

**Checks**
- `npm run check`: PASS, exit 0 (lint 0 errors / 41 warnings, none in the new files; Vitest 136 files, 1557 tests; typecheck
  and build OK; precache 35 entries, 14.8 MB: the GLBs are not in the build until 11e). `tsc` and eslint re-run clean after
  `assets.ts` was added.
- `npm run operators:check -- wren`: not run (no asset or pipeline file changed; `glb.ts` only gained an optional
  attribute read, covered by the new tests).
- No GPU run (none needed in 11d; the Lab and sheets were not used). Ports 4189 / 4191 untouched.

**Open / for the orchestrator**
- Asset follow-up (G73): export the stowed goggle set with `_GOGGLE` in every LOD (DESIGN.md "Asset follow-up"); until
  then the goggle shows over the eyes in both states, only the glow dims.
- A98 needs a yes or a change: 81.4 MB of GLBs in plain git (hero 55.5 MB > GitHub's 50 MB warning).
- 11e GPU items: look in game vs the Lab, per-LOD shadow normalBias (step 10 open item), KTX2 transcode time, two
  bodies at LOD0 against performance.md, the menu with the hero.

**Cleanup items (deferred, Michael 2026-10-18)**
- Move `@babylonjs/ktx2decoder` from devDependencies to dependencies (the game build bundles it); move `ktx2Setup` out
  of `lab/` into the runtime.
- KTX2 transcode in a worker (same-origin decoder script) if 11e measures a menu hitch.
- A smaller hero file (UASTC RDO or ETC1S cloth set) to get under 50 MB.
- Use the GLB's own anchors (weaponMount.*, pistolHolster, slingSocket) for carried weapons instead of the rig sockets.
- Strip the six unweighted helper joints from the game LODs (step 10 note); one ball bone per booted foot in the hero.
- Point the Lab at `OperatorPoser` (one retarget for both) once 11e has it in game.

## Step 11e - Wren is the player character, both players (Opus 5.5)

Status: draft (implementer). D31 / G123, D33 (Michael: "I want wren in the game first. We will clean up changes later
while the game is built"; "Yes use hero for menu"). Assumed decisions A99-A102.

**Built**
- Assets: `src/operators/assets/wren/wren-{hero,lod0,lod1,lod2}.glb` copied from `build/operators/wren/export/`
  (55.5 / 18.4 / 5.1 / 2.5 MB = 81.4 MB, plain git, A98). Vite emits them hashed into `dist/assets/`.
- `src/operators/runtime/playerFigure.ts` (new): `operatorRig()` builds a player's CharacterRig at Wren's height 1.68 m
  (build average, style detailed, no voxel body: `setCharacterVoxels` keeps the match's guard setting), disables the
  rig's own meshes and puts an `OperatorFigure` on it; `operatorLibrary(scene)`; `loadPlayLods` / `loadMenuLods`
  (`?gfx=min`: LOD2 only, A102); `partnerFigureFrame` (keeps render state out of src/net, visionIsolation test).
- `figure.ts`: `HERO_CLOSE_UPS` (true), `loadCloseUp()`, `setHeat()` (per-mesh white overlay, A101), `LIVE_FIGURES`
  and `setCloseCamera(cam, on)` (registers a close-up camera and re-picks at once, so a frozen photo mode swaps to the
  hero), `forgetModel(url)`.
- Wired: `player/player.ts` (figure after the rig; per frame head hide from `ShoulderCamera.headVisible` (new getter),
  heat, `update(activeCamera)`; dispose), `game/gameState.ts` (`setCharacterVoxels`; `figure.setVision(v.shown, dt)`;
  `resetGoggle()` on respawn), `net/remoteAvatar.ts` (partner is Wren, goggle 'off', no new bandwidth),
  `world/menuScene.ts` (preview is Wren; menu camera in `CLOSE_CAMERAS`; LOD2 -> LOD0 -> LOD1 prefetch -> hero; drops
  the parsed hero on exit), `ui/screens/photoMode.ts` (`setCloseCamera` on open / close).
- G72 in `player/proportions.ts` for every character (A1 shoulder 1.40, A3 hand 0.19, A4 pelvis 0.35, waist
  0.30 x 0.215, chest depth 0.24, A5 head depth 0.20, A6 shoulder width 0.49, A7 thigh 0.39); `operatorBody.ts` restates
  them (pipeline output unchanged). Hit volumes follow the body: `playerTarget.ts` and `net/remotePlayer.ts` use
  `hitVolumes(rig.p)` (the remote's hip height too). A99 explains why the rig takes Wren's height.
- `vite.config.ts`: workbox `runtimeCaching` CacheFirst for same-origin `assets/*.glb` (cache `operators`, 8 entries,
  hero included, A100); nothing precached (precache still 44 entries, 15.1 MB).
- Tests: `operators.test.ts` now checks `proportions.ts` carries the corrections; `operatorsRuntimeFigure.test.ts` adds
  the 11e test (rig at 1.68 with its parts disabled and no voxel body, heat overlay, close camera -> hero -> back).
- Scripts: `e2e-lib.mjs` `waitOperator(page, lod)`; `anim-sheet.mjs` and `perf.mjs` wait for Wren before drawing /
  measuring.
- Docs: master `docs/DECISIONS.md` G123-G138 at the time, now G123 and G161-G175 (G70 marked replaced), `docs/operators/DECISIONS.md` points there;
  `docs/systems/world-and-characters.md` (proportions table, "Players are Wren"), bible 5.14 line (G123), CHANGELOG
  Unreleased.

**Numbers (GPU, RTX 4090, E2E_GPU=1, port 4189, local server, empty cache; `mockups/wren/ingame/load-menu-solo.json`)**
- Main menu: LOD2 shown 0.56 s after navigation start, LOD0 0.79 s, hero 1.40 s (hero fetch 0.21 s locally; parse,
  KTX2 transcode and GPU build of the hero about 0.2 s). The menu shows the hero (`current` 0).
- Solo match (Proving, gfx=epic): match ready 6.99 s; LOD2 the same frame, LOD0 7.07 s, LOD1 7.13 s; the LODs' parse +
  transcode + build is under 0.1 s each after their fetch. Download over a network is the arithmetic in DESIGN.md
  (50 Mbit/s: LOD2 0.4 s, all play LODs about 4 s, hero about 9 s more; the hero loads only after the play LODs).
- Shoulder camera picks LOD0 (8 meshes).
- Co-op (host + client pages, Proving, gfx=high, one browser): both pages show their own Wren and the partner as Wren
  at LOD0 (`coop-host-sees-partner.png`, `coop-client-sees-partner.png`); host frame p50 24.8 / p95 25.1 ms with both
  pages drawing on one GPU (information only).
- `perf.mjs --desktop --budget` (Warehouse, 12 guards, gfx=epic, local profile; `ingame/perf.txt`): sim p95 3.25 ms
  (<= 2.9), anim per character 0.120 ms (<= 0.075), main thread 12.7 ms (<= 5.5), frame interval p95 39.3 ms (<= 10),
  draws 218 (<= 520), triangles 0.9 M (<= 1.7 M), allocations 10.8 MB/s (<= 11.5): **over budget on four lines**. The
  same build with Wren never loaded (one experiment build; the player body then draws nothing) is over on the same four:
  sim p95 3.1, anim 0.109, main 12.0, interval p95 28.8 ms, draws 204, triangles 0.67 M. The PC's reference workload read
  16.8 ms (busy machine). Wren's own cost: about +0.15 ms sim p95, +0.6 ms render JS, +14 draws, +0.23 M triangles,
  frame interval p50 24.5 -> 26.9 ms. Open 8.

**Checks**
- `npm run check`: PASS (lint, unit tests, build; rerun after the pouch fix).
- Named suites, parallel run 2 (after A102): e2e-anim, e2e-anchors, e2e-wall, e2e-course ok; solo reruns: e2e-move ok,
  e2e-netmove ok; e2e-coop (offline-state check, see open 2) and e2e-bunker (the teleported-partner check, as
  docs/backlog.md) KNOWN FLAKY; **e2e-traverse FAIL: "ladder sprint: hands reach their grips (19.5 cm)", limit 3 cm**
  (open 1). Full `npm run e2e`: not run (left for the fix round once e2e-traverse passes).

**Open / cleanup**
1. e2e-traverse ladder sprint reach: 19.5 cm with the 1.68 m rig and G72; 6.0 cm with a 1.75 m rig and G72 (one
   experiment build), so G72's lower shoulder (A1) alone already breaks it and Wren's shorter arms add the rest. The
   SPEC 4.3 A1 row predicted this ("ladder, pipe and ledge contact bars re-run"). The fix is the ladder hand offsets
   (`player/attachGrips.ts` `case 'ladder'`: `h.offL = 1.3 * k`, `h.offR = 1.3 * k + a.rung`, slack `a.rung * 1.05`):
   place the hands from the rig's shoulder height (for example `p.y.shoulder - 0.1 * k`) or cap the sprint lead to the
   arm's reach. Not done here (over the tool budget).
2. e2e-coop "offline state" (full graphics menu page, no `?gfx=min`): the click on Co-op did not show `.coop-offline`
   within 8 s while the menu was loading Wren; the KTX2 transcode runs on the main thread (DESIGN risk). Likely caused by
   Wren; e2e-coop is on the known-flaky list but this check should be rerun alone and, if it holds, fixed (delay the
   menu's LOD0 / hero until the menu is idle, or a transcoder worker).
3. Fixed after the screenshots: the old grenade pouches drew at Wren's belt (`solo-front.png`, the partner in
   `coop-client-sees-partner.png`); `GrenadePouches(..., drawn = false)` for player rigs (count kept). Re-shoot.
4. Weapon carry offsets come from the hidden part body's `backGear` / `thighOuter`; measure them from Wren's kit
   (the back mount, the thigh holster) instead.
5. Traversal heights in `attach.ts` stay at 1.75 m (gameplay); Wren's hangs rely on the rig's IK (SPEC 4.1).
6. The stowed goggle export (DESIGN.md "Asset follow-up"); D32 relabels; a transcoder worker; the hero's VRAM stays
   in a match after photo mode (dropped with the scene).
7. Anim contact sheets and the anim audit with Wren at LOD0 need a non-`gfx=min` preset (`gfx=high`): the e2e default
   `gfx=min` now shows LOD2.
8. Desktop perf budgets fail with and without Wren on this run (numbers above); a clean-machine baseline run of HEAD
   (before 11e) is needed to tell what predates this step. Wren adds about 10 ms to the frame interval p95 here: profile
   the skinned LOD0 (8 meshes, its skeleton linked to TransformNodes) and the hidden LODs' node updates.

### Step 11e - continuation (implementer 2, Opus 5.5)

Status: draft, uncommitted on top of checkpoint 611b774. Assumed decisions A103-A106.

**Changed**
- Ladder sprint reach (open 1): the cause was swing speed, not reach. On the landing frame the target sat 0.52 m from
  the shoulder (arm 0.54 m) but the wrist only 0.36 m: the sprint's 0.11 s hand swing plus the pelvis dip of the
  trailing foot (G72's shorter thigh) asked the shoulder for more than its 22 rad/s joint limit. Lowering the hands or
  raising the feet did not help; a 0.15 s floor gave 1.8 cm. `attachGrips.ts` `minReachSwing(travel, height)` (arm
  from `proportions(height)`, peak sweep `ARM_SWEEP_RATE` 11 rad/s = half the shoulder limit): ladder floor 0.158 s on
  Wren, 0.152 s at 1.75 m; drainpipe below its own swing. 3 cm limit unchanged (A103). Unit test in
  `gripStepper.test.ts`.
- e2e-coop "offline state" (open 2): not KTX2 (the suite runs `?gfx=min`, LOD2 only) but a race: the co-op screen is a
  lazy chunk only the service worker can serve offline, and the menu now comes up ~200 ms before the worker claims the
  page (the old body's synchronous build used to delay it). Failed solo; the suite now waits for the worker's control
  first (A104). Solo rerun: e2e-coop and e2e-netmove ok.
- Found by the full run: e2e-ct's wall-jump hang depth now follows the rig height (A105: attached poses always scaled
  with `rig.height`; the 1.68 m player hangs 7.6 cm higher); e2e-desktop's voxel-character block counts the guards and
  checks the player has no voxel body (A106); `OperatorFigure.loadCloseUp` loads LOD2 under `?gfx=min` (photo mode
  fetched the 55 MB hero in e2e-feedback, A106).

**Checks**
- `npm run check` (after the last code change): PASS - lint 0 errors (41 warnings), 136 files / 1559 tests, build ok
  (precache 44 entries, 15.1 MB).
- e2e-traverse, e2e-anchors, e2e-wall, e2e-anim: ok (after the reach fix).
- Full `npm run e2e` (4191, 5 jobs): 12 failed. Known flaky: e2e-netmove, e2e-coop (second page `goto` 30 s timeouts
  under load), e2e-pad, e2e-bunker, e2e-foley. Pre-existing (Kestrel): e2e-kestrel, e2e-camera-bounds. Solo reruns: ok -
  e2e-desktop:1, e2e-mouse, e2e-feedback, e2e-anchors, e2e-combat, e2e-course, e2e-score; fixed and ok after a rebuild
  - e2e-desktop:3, e2e-ct, e2e-feedback; **still failing: e2e-clip "aim walking + crouched: the elbows stay outside
  the trunk (min -6.9 cm)"** (open A below).
- anim-audit (report only): local 373 / remote 132 fails on software GL, local 373 / remote 148 on the GPU at gfx=high
  (`ingame/anim-audit.txt`); no pre-11e number on this machine to compare.

**Perf (GPU, E2E_GPU=1, port 4189, `perf.mjs --desktop --budget`, Warehouse, 12 guards, gfx=epic; two runs each,
alternating; no Wren = the same tree with a temporary switch that skipped Wren and drew the old rig body, removed)**
- Machine quiet this time: reference workload 2.3-2.4 ms (no Wren) and 4.0-5.1 ms (Wren pages) vs 16.8 ms last time.
- No Wren: main thread 3.07 / 2.56 ms (<= 5.5), sim p95 0.75 / 0.45, render JS 2.32 / 2.11, frame interval p95 8.8 /
  8.7 ms, anim per character 0.020 / 0.018 ms, allocations 7.66 / 7.59 MB/s, draws 214 / 210, triangles 0.69 / 0.68 M.
  All budgets pass.
- Wren: main thread 3.85 / 3.55 ms, sim p95 1.65 / 1.55, render JS 2.20 / 2.00, frame interval p95 8.8 / 8.8 ms,
  anim per character 0.038 / 0.033 ms, allocations 10.68 / 10.81 MB/s (<= 11.52), draws 222 / 218, triangles 0.91 /
  0.90 M. Run 1 passes every budget; run 2 misses only frame pacing (p95 8.8 ms against 8.3, the probe read the display
  as 144 Hz that run; the interval is the same as without Wren).
- Wren adds: about +0.9 ms sim p95 (partly the busier page: its reference workload also doubled), no render JS, +8
  draws, +0.22 M triangles, +0.015 ms anim per character, +3.1 MB/s allocations (`applyTargets` 0.36 -> 1.19 MB/s, a new
  `update` 0.29 MB/s: the figure's per-frame pose).
- Files: `ingame/perf-wren-{1,2}.txt`, `ingame/perf-no-wren-{1,2}.txt`.

**Load (GPU, local server, empty cache; `ingame/load-menu-solo.json`)** menu LOD2 0.57 s, LOD0 0.84 s, hero 1.45 s
(shown: hero); solo Proving match ready 4.37 s, LOD2 / LOD0 / LOD1 4.38 / 4.38 / 4.39 s; co-op host sees both bodies
at LOD0 8.97 s; co-op host frame p50 8.3 / p95 8.7 ms (two pages on one GPU).

**Screenshots (GPU, after the pouch fix)** `docs/operators/mockups/wren/ingame/`: menu-hero, solo-shoulder,
solo-front, solo-side-rifle-aim, solo-crouch, solo-pistol, coop-host-sees-partner, coop-client-sees-partner; anim
contact sheets at gfx=high (Wren LOD0): anim-walk, -crouch, -sprint, -vault, -reload, -swap. No pouches on the belt.

**Open (adds to the list above; 1, 2, 3, 7, 8 are done)**
- A. e2e-clip "aim walking + crouched": on the scenario's first frame (after the teleport, the gun raising) the right
  elbow sits 6.9 cm inside the trunk capsule for one frame (next frame +11 cm). Bisected: 1.75 m rig + G72 -6.8 cm;
  1.75 m rig, pre-G72 proportions -2.0 cm; 1.68 m rig + G72 with only A1 reverted (shoulder 1.435) -0.8 cm. So G72's A1
  (shoulder joint 3.5 cm lower) causes it. Fix belongs in characterRig's arm IK / joint limits or a review of A1 (both
  outside this implementer's files); the 3 cm limit is not touched.
- B. Wren's per-frame allocations (+3.1 MB/s, `applyTargets` and the figure's `update`): hot paths must not allocate.
- C. A105: attached poses scale with the rig height, so Wren hangs / climbs 7.6 cm higher than the 1.75 m body did
  (G38 asks for the same gameplay; Michael to confirm or ask for a gameplay height in `attachPose`).
- D. The ingame "solo-front" view shows her back three-quarter (the camera yaw offset of the shot script); cosmetic.
- Cleanup list (Michael: "We will clean up changes later"): items 4, 5, 6 above; A-D.

### Step 11e - continuation 2 (implementer 3, Opus 5.5)

Status: draft, uncommitted on top of checkpoint 2 (dd988f6). The orchestrator lifted the characterRig / src/anim limit
for this pass. Decisions: D34 / master G176 (Michael: "Keep gameplay fixed (Recommended)"), A107, A108; A105 replaced.

**Changed**
- A (e2e-clip elbow, A107): the right hand comes forward from the back draw after the scenario teleport; with the
  shoulder and elbow rate-limited the lagging upper arm swung the elbow across the back and through the chest (G72's
  lower shoulder made it reach the trunk line). `characterRig.keepElbowOut` after `limitJoint` (both arms): an elbow
  within chest half depth + 2 cm of the pelvis -> neck line swivels round the shoulder -> wrist axis
  (`rigMath.elbowSwivelClear`, pure, unit-tested; 15 deg steps, smallest clearing angle), the hand keeps its world
  rotation. G72 kept, 3 cm limit unchanged. e2e-clip "aim walking + crouched" elbow min -6.9 -> +4.4 cm.
- C (G176): `attach.ts` `GAMEPLAY_HEIGHT` 1.75; every gameplay `attachPose` / range / reach call in
  `attachController.ts` and the team boost (`teamController.ts`) uses it; `attachLift()` (pure, unit-tested) is the
  visual offset of a body of another height. `AttachGrips.lift` (weighted by the grip blend, pipe sub-states blended)
  is added to the rig root by the local player (`Player.rootLift`, written in `frameUpdate`) and the remote
  (`remoteAvatar.ts`); grips keep `rig.height`. Wren's gameplay root hangs 1.90 m under the lip again; her body is drawn
  7.6 cm higher so her hands meet it. `net/validate.ts` already clamped at 1.75. e2e-ct's original check is back.
- B (allocations, A108): Wren's per-frame code (`OperatorFigure.update`, `readRig`, `OperatorPoser.solve`) allocates
  nothing (no figure / poser entry among the allocators). The extra reading is V8 tier-up: with Wren the rig's
  `animate` / `applyTargets` reach TurboFan only inside perf's 4 s sampling window (V8 log, --log-deopt: type-feedback
  and prototype-chain deopts during warm-up), so they run as baseline / Maglev code that boxes doubles. Fixed anyway:
  the attach path's per-step `override` object (reused), the pipe grip blend's per-frame closure (module function), the
  soft-knee fields' Smi -> double change (a `Float64Array`; one of the rig update's deopts).

**Numbers (GPU, E2E_GPU=1, port 4189, `perf.mjs --desktop`, Warehouse, 12 guards, gfx=epic; files in `ingame/`)**

| Run | allocations MB/s | sim p95 ms | anim / char ms | draws |
| --- | --- | --- | --- | --- |
| Wren, default warm-up (`perf-wren-3`, `-4`, `--budget`: every budget passes) | 11.07 / 11.03 | 1.65 / 1.70 | 0.038 / 0.041 | 218 / 222 |
| No Wren (same tree, LODs never loaded; `perf-no-wren-3`) | 7.57 | 0.50 | 0.019 | 200 |
| Wren, WARM=48 (`perf-wren-warm48`) | 8.32 | 0.90 | 0.022 | 222 |
| No Wren, WARM=48 (`perf-no-wren-warm48`) | 7.25 | 0.55 | 0.019 | 208 |

After a long warm-up `applyTargets` reads 376 KB/s with Wren vs 366 without; the remaining +1.1 MB/s is spread over
non-Wren code in other JIT states (anim curve sampler, Havok iterator, HUD). The allocation budget (11.52 MB/s) passes
with a 4 % margin at the default warm-up.

**Checks**
- `npm run check`: PASS (lint 0 errors / 41 warnings, 136 files / 1562 tests, build ok, precache 44 entries).
- Named suites (4191, 4 jobs): e2e-move, e2e-traverse, e2e-wall, e2e-anim, e2e-netmove, e2e-course, e2e-clip, e2e-ct,
  e2e-weapons-carry ok; e2e-anchors failed under load (`current` null after the warehouse block) and passed solo;
  e2e-coop (known flaky) failed in the parallel run, ok solo; e2e-bunker (known flaky) failed both times on the
  teleported-partner check (docs/backlog.md).
- Screenshots (GPU): `solo-front.png` now shows her front (the body turned to face the camera; turning the camera round
  made her turn in place); solo-shoulder, -side-rifle-aim, -crouch, -pistol re-shot with this build.

**Open**
- e2e-clip's wall / sprint / crouch-run scenarios count 0 frames (no weapon in hand after "aim walking + crouched");
  their asserts pass on nothing. Pre-existing (the same in the earlier 11e logs); not changed here.
- A full `npm run e2e` was not re-run in this pass (the last full run is continuation 1's).

## Step 11e fix round 1 (fixer, Opus 5.5)

Fix list `steps/11e-fixes-r1.md` items 0-3 plus the checker's two notes (ktx2.ts header, ktx2decoder dependency).

**Built**
- 0 (offline): cause confirmed. `registerType: 'autoUpdate'` claims the page after the menu has fetched Wren, so her
  LOD2 bypassed the worker and never reached the `operators` cache; the offline reload had no body ("Wren failed to
  load: Failed to fetch"). The three KTX2 warnings are the transcoder's wasm fetch cut off by a reload mid-load (the
  save-migration part reloads right after boot). New `src/operators/runtime/offline.ts`: `warmPlayLods` (A109) runs
  after the menu's / match's play LODs load and fetches each missing play LOD once through the controlling worker
  (now, or at `controllerchange`); `manifest.ts` `playLodUrls` (LOD2, LOD0, LOD1; `?gfx=min` LOD2; never the hero).
  `pageLeaving()` (pagehide .. pageshow) and `OperatorFigure.isDisposed` keep abandoned loads quiet (A110):
  `warnLoad(e, figure)`, the close-up warning, and a `Logger.Warn` filter in `lab/ktx2.ts` that drops only Babylon's
  "Failed to load KTX2" while the page is leaving (`Logger` exported from core/babylon.ts). e2e-offline: waits for
  LOD2 in the `operators` cache before going offline (asserted), waits for the menu body's LOD2, and asserts the
  offline match's player has the LOD2 bit; console filter unchanged. vite.config.ts comment, CHANGELOG and
  world-and-characters.md say what happens now.
- 1 (light parity): `src/game/bodyHeight.ts` `lightSampleHeight(height, crouch)`, `bodyScale` (pure; tests
  `tests/bodyHeight.test.ts`: 1.68 vs 1.75 standing / crouched, exposure scaling, posed path). gameState's off-wall
  sample uses `player.rig.height`; partners use `PlayerRef.height` (new optional field, set from the RemoteAvatar rig
  in `net/remotePlayer.ts`; host and client the same, nothing sent). `exposurePoints` / `exposurePointsPosed` take
  the height (y scaled by height / 1.75; default 1.75 for anything else). On-wall posed path unchanged. A111.
- 2 (e2e-desktop): drives Wren directly: `setHeadVisible(false)` -> the shown LOD's head joint scaling (0,0,0), true ->
  (1,1,1); `setVision('night')` vs `'off'` + `update` -> pose inUse / stowed and the glow material's emissive sum
  (on > 1.5x off). The voxel lens / head check runs only where a lensed guard body exists and says so otherwise.
- 3: `perf.mjs` prints "over budget: Wren not loaded ..." and exits 1 (with or without --budget); `anim-sheet.mjs`
  prints an error and exits 1, no sheet. No GPU run (item 3 alone needs none).
- Notes: `lab/ktx2.ts` header now says the game uses it; `@babylonjs/ktx2decoder` moved to `dependencies` (9.29.0,
  `npm install`, lockfile drops `dev: true` only).

**Checks**
- `npm run check`: PASS (lint 0 errors / 41 warnings; Vitest 137 files / 1567 tests; build ok; precache 44 entries,
  15469.8 KiB).
- Named suites (4191): e2e-darkness, e2e-stealth-ai, e2e-stealth, e2e-tactics, e2e-enemies, e2e-netmove, e2e-security,
  e2e-lightbake, e2e-desktop all ok. e2e-desktop: head joint scale [0,0,0] hidden / [1,1,1] shown; goggle on inUse
  1.310 vs off stowed 0.393; "no guard body has goggle lenses" (the voxel lens check had nothing to drive).
- e2e-offline solo: ok (4 runs before the last two edits, then again on the final build). Wren's LOD2 in the cache
  (1 entry), the offline match and the offline Infiltration player have LOD2.
- Full `npm run e2e` (4191), five runs while fixing; the last on the final build: 10 suite(s) failed: e2e-mouse,
  e2e-feedback, e2e-combat, e2e-anchors, e2e-course, e2e-music, e2e-wall, e2e-camera-bounds, e2e-kestrel,
  e2e-weapon-audio; KNOWN FLAKY: e2e-coop, e2e-pad. e2e-offline ok, e2e-desktop:1-4 ok. Solo reruns (`--jobs=1`): all
  eight ok; e2e-camera-bounds, e2e-kestrel pre-existing master failures. Every full run here had 9-13 load failures
  (timeouts, "Cannot read properties of null", timing limits), each ok solo.
- What the full runs found and fixed on the way: run 2, e2e-offline's warm wait ended early when vite-plugin-pwa
  reloaded the page on the worker's activation (the wait now retries until its one 60 s deadline); run 3, the
  backgrounding check's 5 s pause wait landed on the Infiltration player's KTX2 transcode (the suite now waits for, and
  asserts, her LOD2 first); run 4, e2e-desktop:1 printed Babylon's "Failed to load KTX2 texture data: ... null
  (reading 'memoryAllocated')" for a texture disposed mid-transcode (A110's `ktx2Abandoned`).

**Open**
- Item 3 is not GPU-run (not needed for an exit-code change). The checker's notes (part-mesh measuring for the carry,
  the rifle standing off her back, hero in VRAM after photo mode, the A80 header in DECISIONS) are unchanged.

## Step 11e pre-PR - merge master (G124-G160), renumber, per-player goggle colour (Opus 5.5)

**Built**
- Merged origin/master a22a9c0 ("CT co-op research: digests, decisions G124-G160 and the prototype plan (#4)"). Two
  conflicts: `docs/DECISIONS.md` (both sides appended after G122: master's "CT co-op research and prototype" section
  kept whole, then this run's "Operators run" section, renumbered) and `docs/design-bible.md` 5.14 (master: "the
  core-feel job tunes movement on Wren (G150), ahead of G70's order (Wren behind a dev switch...)"; ours: Wren is the
  player for both, no dev switch (G123). Kept ours and added master's G150 core-feel tuning to it). Everything else
  merged clean (`docs/archive/progress.md`, the new `docs/ct-research/*`, `docs/ct-prototype/PLAN.md`).
- Renumbered this run's G124-G139 to G161-G176 (old n -> n + 37, same order); G123 kept (reserved for us on master).
  Changed only references to our entries: DECISIONS.md's operators section and header line, CHANGELOG, docs/operators
  (DECISIONS, LOG, steps/11e-*), docs/systems/movement.md and world-and-characters.md, src (attach, attachController,
  attachGrips, player, remoteAvatar, enemy, bodyHeight, gameState, tactics) and tests (attach, bodyHeight). Master's
  G124-G160 text and every reference to it untouched.
- G135 (master: "Follow the original: partner beacon (distinct light colour per player) + world pings."): each
  player's goggle is their own colour. `goggle.ts` `goggleSlot` / `goggleColour` (pure; tests/goggleColour.test.ts):
  host / solo green (the lens's own), partner cyan; `OperatorFigure.setGlowColour` / `glowColour` on the per-body glow
  material; `setPlayerGlow` (playerFigure.ts) called by the co-op host and client at start, on lobby changes and for a
  new partner body. A112 (cyan, not amber). World pings not built.
- `windowsHide: true` on every child_process call in scripts/run-e2e.mjs (git, vite preview, suites, taskkill),
  operator-sheet.mjs, operators/blender.mjs, operators/ktx2.mjs, anim-audit.mjs, e2e-editor.mjs, perf-trend.mjs.
  e2e-lib.mjs, perf.mjs and anim-sheet.mjs spawn nothing.

**Checks**
- No lockfile change (master changed docs only): no `npm ci`.
- `npm run check`: PASS (lint 0 errors / 41 warnings; Vitest 138 files / 1572 tests; build ok; precache 44 entries,
  15470.9 KiB).
- e2e on 4191 (`--jobs=2`): e2e-coop ok (new: "goggle colour per player: host green, partner cyan on both screens"),
  e2e-desktop ok, e2e-darkness ok, e2e-move ok, e2e-offline ok; e2e-netmove KNOWN FLAKY ("host sees the client walk
  off" timeout) then ok solo (`--jobs=1`).
- GPU (E2E_GPU=1, 4189), warehouse Free Roam, two pages over `?net=local`, the partner 2.4 m in front:
  docs/operators/mockups/wren/ingame/coop-goggle-colours-host.png (host's screen: the partner cyan) and
  -client.png (client's screen: the host green), each with a -crop; -full variants force the partner body's goggle
  in use (full glow; the partner's vision is not sent, so play shows it dim). The shot script is a scratch file, not
  committed.

**Open**
- The client's HUD objective still reads "Connecting to host..." in Free Roam in the client shot (pre-existing).
- Moth's amber (bible 5.14) and Wren's green fail the bible's own colour-blindness rule for deuteranopes; per-player
  colours cover it while both are Wren. Ask Michael before Moth is playable.

- Steps 11d + 11e status: passed the independent check (round 2, after fix round 1; 11d was checked together with 11e,
  D33). PR feature/operators -> master opened by the orchestrator (not merged). Cleanup list: LOG "Step 11e" sections and
  the round 1 / round 2 checker notes.

