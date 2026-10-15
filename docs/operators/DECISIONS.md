# Operators run - decisions

Numbered. Michael's words are quoted. Newest at the bottom of each list.

## Michael's decisions

**D1 Realism (2026-10-15).** "the operators must NOT look code-built. They must look as detailed and realistic as a
modern AAA stealth game character: believable fabric, folds, seams, stitching, wear, straps under tension, hard kit
with real material response. Primitive-assembled "capsule and sphere" looks are rejected outright."

**D2 Close-up scrutiny (2026-10-15).** "they must hold up when used up close in menu animations (loadout, operator
select, briefing). Michael expects intricate, logical, believable detail at a camera distance of 0.3-1 m on desktop at
1440p and 4K."

**D3 Skeleton (2026-10-15).** "identical skeleton, capsule, speeds, hit volumes and light sample heights for both
(bible 5.14 fairness stands). Realistic proportions on that shared skeleton; differences come from build (girth within
the few-percent rule), silhouette, clothing and kit."

**D4 Face (2026-10-15).** "fully covered, full stealth gear (fitted balaclava/hood plus goggles). No visible face or
skin. No face modelling beyond what sits under the gear."
- Consequence: Moth's rolled sleeves (story) show a fitted knit base layer below the roll, never skin.

**D5 Design language (2026-10-15, during Stage 1).** "I am expecting splinter cell inspired models that are original"
- Applied in SPEC Section 2: close-fitting dark layers, a harness over the suit, the covered head and glowing goggles
  as the signature, purposeful kit only. Shapes, patterns and details are all original; nothing is copied from the
  reference game or real products.

**D6 (2026-10-15, during Stage 1).** Michael asked: "What would result in a more accurate vision? Installing blender?"
- Answer given: yes. The scripted Blender pipeline (SPEC 6.3) gives the more accurate result: real sewn garments with
  simulated folds, bevelled kit and baked maps. A TypeScript-only path would have to invent folds. His choice is
  recorded under Q1.

## Setup notes (Claude, for Michael's information)

**S1 Base branch.** The brief said to cut `feature/operators` from `origin/master`.
- `origin/master` (2026-10-10, "Update deploy.yml") is the old "Silent But Deadly" line: it has none of the
  documents the brief lists (`docs/systems/*.md`, bible 5.14 / 5.16 as written, story Section 4 real names).
- Project rule: feature work branches off `ct-movement`.
- The worktree was therefore cut from `origin/ct-movement` (99da75b, bible 1.14). Nothing had been written on the
  master-based branch; it was deleted unpushed.

**S2 Phone target conflict.** The brief asks for 60 fps in the phone menu. Bible 1.14 (P7, Michael 2026-10-14) made
the phone "load and play on Low, no fps gate". Asked as Q3.

## Questions for Michael (Stage 1)

All answered 2026-10-15 through the multiple-choice UI.

- **Q1 Technique.** Recommended: the scripted Blender pipeline on a CC0 base body (SPEC 6.3). Answer below (D7).
- **Q2 Rule changes.** Approve the drafted bible 5.14 / 5.16 / Section 6 and CLAUDE.md text (SPEC Section 7). Answer
  below (D8).
- **Q3 Phone.** Bible 1.14 (lowest LOD, no fps gate) or the brief's 60 fps phone menu. Answer below (D9).
- **Q4 Height.** Keep the shared 1.75 m or lower it. Answer below (D10), with a follow-up on scope (D11).

## Stage 1 answers

**D7 Technique (Q1).** Michael chose "Blender pipeline (Recommended)".
- In-repo Python scripts run Blender headless, on a CC0 base body: sewn garment panels draped by cloth simulation,
  bevelled kit, baked maps, glTF out (SPEC 6.3).

**D8 Rule changes (Q2).** Michael chose "Approve as drafted (Recommended)".
- The bible 5.14 / 5.16 / Section 6 and CLAUDE.md text in SPEC Section 7 is approved.
- It is applied at the start of Stage 2 (bible 1.15), together with the D10 / D11 fairness text (SPEC 7, last
  block), which follows from Michael's own answers.

**D9 Phone (Q3).** Michael chose "Bible 1.14 (Recommended)".
- The phone gets the lowest LOD of the same design and never downloads hero assets.
- No fps gate; phone numbers are information only.
- The brief's "60 fps phone menu" line is superseded.

**D10 Height (Q4).** Michael: "operators can be slightly different sizes, i would prefer realism over fairness. the
games focus is mostly coop"
- This overrides D3's "identical skeleton ... hit volumes and light sample heights" and bible 5.14's fairness bullet.

**D11 Size scope (follow-up to D10).** Michael chose "Hit boxes follow the body (Recommended)": "Each operator's
skeleton, hit volumes and light sample heights match their real size, so shots and light hit the body you see.
Capsule, speeds and every traversal move stay shared, so maps and routes work the same for everyone."
- Heights: Wren about 1.68 m, Moth about 1.78 m (SPEC 4).
- What stays shared: the capsule, speeds, eye and camera rules, and every traversal move and its anchors.

## Stage 2 answers (RUNBOOK step 3, 2026-10-15)

**D12 CC0 base body download.** Michael chose "Download it (Recommended)": the MPFB2 CC0 data only (base mesh, body
targets, vertex groups, default rig weights; 592 files, about 23 MB) from github.com/makehumancommunity/mpfb2 at commit
3af0cd5, into the git-ignored cache `build/operators/cache/mpfb2/`. No MPFB code (GPL). `docs/art-credits.md` lists it.

**D13 Art direction.** Michael's step 3 brief adds `ART-DIRECTION.md`, the look standard beside SPEC Section 1. Conflicts
with SPEC found and decided:
- Waist. Art direction: lean, narrow waist. SPEC A4: survey-average waists. Michael chose "Art direction: leaner
  (Recommended)". Applied: the body's waist breadth and depth are 0.93 of the A4 value (`LEAN_WAIST` in
  `build_body.py`); visual only, hit volumes unchanged.
- Goggles. Art direction: tiny muted emitters only. SPEC 2: glowing lenses are the signature (Wren green, Moth amber).
  Michael chose "Strong lens glow": SPEC 2 stands; the art direction's "muted" rule applies to every other light.
- Bind pose. The brief says bind pose = the game rig's bind pose; the rig's rest pose has the arms hanging straight
  through the hips (about 4 cm overlap). Michael chose "A-pose on the game skeleton (Recommended)": identical joints
  and bone lengths, the mesh bound with the arms about 42 degrees out and MakeHuman's slight elbow bend; the glTF's
  inverse bind matrices carry the A-pose. (Setup note S3.)

**D14 Garment method.** After the first shirt renders Michael answered "stop and reconsider my last detailed prompt"
and pasted the step 3 brief again (follow it as written). After the fit fixes (leaner body, close-fit knit, trimmer
sleeves) he chose "Yes, continue (Recommended)": the sewn-panel cloth method is the method for both operators. The
remaining shirt faults (hem bunching, crumpled forearms, collar not standing) are fixed in a focused step first.

**D15 How the run continues.** Michael: "i would prefer to do smaller steps that keep claude focused and on task. i
want it to run unattended throughout the entire process, resulting in completed characters as per the description".
He chose "Chained small steps (Recommended)": one focused step per session with automatic checks; each session starts
the next itself; he reviews the finished characters at the end.
- Consequences: the three-concepts-per-operator round and the mid-run review page are replaced by one design per
  operator built to ART-DIRECTION.md, checked by script and by the render self-review; Michael's review comes at the
  end (`PLAN.md`).
- Model and effort (Michael asked for them named): Opus 5.5 High for design, garments, kit, bakes and renders; Sonnet
  5.5 Medium for tooling and pages.

## Setup notes (step 3)

**S3 Bind pose.** See D13. The skeleton round trip (`build_skeleton.py`) still checks the game's rest pose to 0.1 mm;
the body report (`<id>-body.json`, `bindJoints`) lists the A-pose joints the mesh is bound in.

**D16 Progress screenshots.** Michael: "i still want to see screenshot at end of each step so i can see progress."
Every step ends by sending its renders (or screenshots for tooling steps) with a three-line note before it chains on;
nothing waits for his answer (RULES "Chaining", every step file's Finish).

**D17 Step loop like the locomotion run (2026-10-16).** Michael asked whether the workflow could learn from the
locomotion run, then chose "Restart with all": each step is implement, then an independent Opus High checker (re-runs
the checks, reads every render against ART-DIRECTION and SPEC 1), up to 3 fix rounds, then commit and push only after
PASS (OPEN after 3 failed rounds). Plus the locomotion no-hang rules: tool-call budgets, timeouts, exact port 4191
commands, branch guard. RULES "Step loop"; script `run.workflow.js`.

**D18 Orchestrator session, exactly like the locomotion run (2026-10-16).** Michael: "why is this running a workflow?
the locomotion never did that", then "Orchestrator session", then "do all the prep work with the repo and give me the
prompt, i will put it in another session. must operate exactly like the locomotion session". One orchestrator session
(Opus 5.5 High) runs steps 05-18 with Agent subagents (implementer, Opus checker, up to 3 fix rounds) and commits
itself. Replaces D17's scripted workflow (stopped; the script is kept as history). Prompts: OWNER-NOTES.md.

## Assumed decisions (unattended run, D15)

Judgement calls made inside a step without Michael (RULES "Unattended run"): what, why, how to undo. Numbered A1, A2, ...
(a separate series from SPEC 4.3's proportion corrections A1-A7).

**A1 Cloth rest shape through Dynamic Mesh (step 03b).** Blender 5.2's cloth ignores the rest shape key (a sheet with a
0.6x rest key never shrinks, tested headless), so every garment simulated so far used its arranged start shape as the
rest shape, not the cut pattern: the step 3 bunching, baggy forearms and limp collar came from that. The pipeline now
turns on Dynamic Mesh and keys the pattern shape on at frame 2: the rest lengths and bend angles are the flat cut, and
the cloth keeps its own positions. Undo: set `rest_shape_key` again in `build_garment.py add_cloth` if a later Blender
honours it (the pinned version is 5.2.2).

**A2 Vertex mass 0.1 at full gravity (step 03b).** Near-real vertex masses (a 0.3 kg shirt: ~0.00004 kg a vertex, also
0.0001-0.01) make the solver throw the cloth off the body; 0.1 is stable and, with the true rest shape, drapes right.
Gravity stays 1.0 (`SIM['gravity']`). Undo: the `SIM` table in `garments/combat_shirt.py`.

**A3 Collision layer 3 mm, girths measured on it (step 03b).** The body collider was 4 mm thick and the cloth kept 3 mm
off it: 7 mm round the skin, about 4 cm of girth an 8 % ease never allowed, so the forearm seam could not close (gap
15 mm). Now 1.5 + 1.5 mm, and every measured girth is the girth of that surface, so the ease in a pattern is ease over
the body. Undo: `SIM['collision']` and the `GAP` lines in `build_garment.py`.

**A4 Combat shirt cut and cloth (step 03b).** Within art direction 6 (close fit under armour): the knit torso is cut 3 %
short in length as well as round (vertical slack in a knit buckles into horizontal ripples); the front is 2 cm longer
than the back for the chest (was 3 cm: a crease under the bust); the sleeve gets a forearm control point at its widest
girth; bending 0.3 knit, 3.0 ripstop, 8-12 under pockets, flaps, tabs and the elbow pad (sewn plies); the seam band
(seam vertices and two rings round them) is out of self collision so seams can close. Undo: `combat_shirt.py`.

**A5 Material values for the check limits (step 03b).** Measured albedo must sit in 0.02-0.06 linear (art direction 4):
ripstop 0.025 (was 0.021), Cordura 0.022 (0.016), loop 0.023 (0.019), binding 0.023 (0.020); the Cordura stays darker
than the ripstop round it. Coated metal roughness 0.58-0.68 (was 0.42-0.62: below the hard-part floor 0.55). The
check reads the 1st and 99th percentiles of each material's rendered albedo and roughness (emission renders, four
views), not node values. Undo: `materials.py`, `LIMITS` in `check_garment.py`.

**A6 Kit mapping of sewn details (step 03b).** The combat shirt builds kit item `combatShirt`; its elbow pads build
`elbowPockets`, the arm pockets and their flaps `armPocketL` / `armPocketR`; the blank loop panels, cuff tabs and zip
garages are parts of `combatShirt` (they hold nothing of their own). Undo: the `kit` keys in `combat_shirt.py`.

## Assumed decisions, step 04 (D15 unattended)
**A7** The Lab is a production-style build served by `vite preview`, not the dev server. Why: Babylon loads its shaders by
  dynamic import and the dev server returned the HTML page for them (black screen). Undo: none needed; the build takes 16 s.
**A8** The Lab reads the GLB with its own small reader (`glb.ts`), not `@babylonjs/loaders`. Why: no package install without
  asking Michael (RULES), and the export is one skin of plain triangle meshes. Undo: add the loader and drop `glb.ts`.
**A9** Lab materials are flat albedo and roughness factors (the means of the procedural materials) until baked maps exist
  (step 10); `export_gltf.py` flattens them. Undo: remove the FLAT table when step 10 exports textures.
**A10** The Lab's lighting rigs use high exposure (2-4.5) rather than bright lights, because the fabric albedo is 0.02-0.06.

## Assumed decisions, step 05 (D15 unattended)
**A11 Layer order and the tuck (deviation from step 05 Do 1).** Wren's garments build in the order base layer, combat
  shirt, trousers (`GARMENTS` in `export-gltf.mjs`). Step 05 Do 1 asks for the earlier layers as colliders in the
  simulation; the pipeline does not do that. Each garment is simulated against the body only; the earlier layers are
  resolved after the simulation: the garment is drafted over them with a fixed girth allowance per layer
  (`UNDER_LAYERS`, `build_garment.py` `allowance`), arranged clear of them, and after the sew and settle every vertex
  closer than one layer step (`LAYER_T`) to an earlier layer's outer face is pushed out and the region relaxed
  (`layer_push`). Why: Blender's cloth against a thin cloth collider broke the seams in test runs (colliding while
  sewing, the shirt's seams could not meet across the armpits, gaps 7-15 cm; colliding only in the settle, the
  push-out stretched sewn seams to 37 mm; gaps up to 149 mm on the trousers); girths measured over the simulated
  layers over-measured by 5-10 cm. The collider objects are still built; `SIM.layer_collision: true` (settle phase
  only) turns them on - that is the undo, once a solver handles cloth on cloth. The shirt is sewn before the trousers
  so its hem ends inside the trousers' pinned waistband (A15): the tuck comes from the order and the layer push.
**A12 One base-layer garment.** The compression top and the leggings are one garment (`base_layer`, kit `baseLayer`), two
  pieces in one simulation; the top is the shirt's block re-cut (negative ease, knit everywhere, flatlock seams, a mock
  neck about 1 cm taller than the shirt collar), and its hem laps over the leggings' waistband. Undo: split into two
  garment modules in `GARMENTS`.
**A13 Legwear gravity.** Leggings and trousers simulate at reduced gravity (0.3) and higher friction (4): the
  pipeline's vertex mass (0.1, kept for solver stability, A1) is far heavier than fabric, and legwear hangs from the
  hips - at full gravity the leggings slid 15 cm down the legs. Undo: the `SIM` tables of the two garments.
**A14 Knee pad pockets as a kit pouch.** `kneePads` (pouch, contents "knee pad", opening inside at the top) is added to
  Wren's kit for the internal knee pad pockets SPEC 5.1 names under the trousers; `baseLayer` is added as a garment.
  Undo: the two entries in `src/operators/kit.ts`.
**A15 Waistbands pinned; compression knit drawn on; soft-shell faired (step 05 fix round 1).** The leggings' and the
  trousers' waistbands are pinned to their arranged ring (drafted height, round the body and the layers) through the
  sew and the settle (`SIM.pin`): without colliding layers (A11) a band drafted over them rode on the bare skin with a
  layer allowance of slack and slid 6-7 cm. The pin stands in for the elastic's and the duty belt's grip. The leg
  block's rise is solved from the measured crotch path (front waist, under the crotch, back waist; `crotch_ease`),
  which replaced estimates that were 3-4 cm long at the front. The base layer is drawn onto the skin after the
  simulation (`SIM.cling`: projected to 3.5 mm off the skin and relaxed between the seams; the top's hem one layer out
  over the band): a mass-spring cloth bridges and ripples where a compression knit clings. The trousers' surface is
  Taubin-smoothed between the seams after the simulation (`SIM.fair`) to remove solver dents. Undo: remove `pin`,
  `cling`, `fair` and `crotch_ease` from the garments' tables.
**A16 Smooth layer push, bridged knit, tucked hem, inserts (step 05 fix round 2).** `layer_push` (A11) and the cling
  guard spread each push into a smooth bump (`build_garment.push_out` / `spread`: a decayed ring average, about 8 rings)
  instead of snapping vertices one by one, which left a stepped edge (dark dashes on the shirt front in raking light).
  The base layer's `cling` draws the knit onto a Taubin-faired copy of the skin (`bridge` 25) and then only pushes it
  1.5 mm clear of the real skin (`guard`), to bridge small features (the nipples are softened, not yet gone). The
  combat shirt's hem is drawn onto the base layer below the trousers' band (`SIM.tuck`): the free hem stood 3 cm proud
  of the lower belly and the trousers, pushed over it, showed its edge as a lip under the front band. The trousers'
  `fair` runs 40 Taubin passes and fairs the seam and hem lines along themselves (corners held), so the band edge and
  the fly are clean lines. The stretch-knit panels behind the knees are seamed-in inserts (details `inserts`: the
  region inside the seam takes the knit's material and stiffness, a raised seam allowance and a stitch row either side)
  rather than separate pattern panels in the leg block: the same look and stretch, without re-cutting the back panels
  and their seams. The seat reinforcement is one Cordura panel per side shaped to the back panel (patch `outline`).
  Undo: `tuck` / `bridge` / `guard` / the `fair` iterations in the garments' `SIM` tables; `inserts` in `trousers.py`.
**A17 Seat bridge and stitch shadows off (step 05 fix round 3; recorded by the orchestrator).** The trousers' back
  panels are pushed one layer step off a smoothed envelope over the under-layers (`SIM.bridge`, 150 passes) so the seat
  bridges the cleft and the sacral hollow instead of shrink-wrapping them. The trousers' stitch threads cast no shadow in
  renders (`stitchShadows: False` in the details): 0.36 mm threads on an ungrooved surface threw 5-10 mm spiky shadows
  under the grazing rake (the waistband "crinkle"). Render only; the glTF is unchanged, and the game's shadow maps
  cannot resolve sub-millimetre casters. Seam plateaus are ramped (`offsetSmooth: 3`, exported). Proper fix (LOG
  step 05 OPEN 6): a stitch channel in the offset map. Undo: `SIM.bridge`, `stitchShadows`, `offsetSmooth` in
  `trousers.py`.
