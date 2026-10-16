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

**D19 Goggles: no flip mount, a tactical strap, a futuristic housing (2026-10-16, during step 07).** Michael: "the
goggles shouldn't flip up and down, they should just sit over the forehead, and be over the face when in use. make the
head strap more tactical looking also. the night vision goggles could be more futuristic, they look very square".
Overrides SPEC 3.3 and the SPEC 7 rows for the flip mount and the "square goggle housing", and step 07 Do item 2:
- No flip arm, pivot or detent lever. Two worn positions: stowed, resting on the forehead / brow over the hood; in use,
  pulled down over the eyes (the eye port). Both are rendered (replaces the "optic up" view).
- The head strap / harness reads more tactical: purpose-built webbing and hardware, not a generic strap set.
- The goggle housing is more futuristic and less square: original sculpted, rounded forms (still no three-lens goggle,
  no copied product, D5); the strong glow stays (D13).
- Scope (orchestrator's reading, A28): Moth's head kit (step 13) follows the same no-flip rule; Moth keeps its round
  twin-lens amber look from SPEC.
- Process, Michael: "you can show me scratch renders first with some options if its easier to nail the look". Before
  the step 07 fix round builds it, a scratch pass renders about 3 goggle housing options and 2-3 head strap options
  (stowed and in use); Michael picks; the fix round builds the pick.

**D25 Back layout and the left hip (2026-10-16).** Michael, on the re-plan's two calls: drone pod and medkit - "Hips,
keep game carry" (A39 confirmed: pod rear-left and medkit rear-right on the belt, the back flat for the game's upright
rifle, no game-code change); the game's compact-gun hip slot vs the throwable sleeves - "Sleeves to the front" (A41
replaced: the three throwable sleeves sit on the left FRONT of the thigh; the game's left-hip slot stays clear and keeps
its flush sling socket on the belt).

**D24 Build A2, without the guns (2026-10-16).** Shown the A2 scratch renders (scratchpad stealth/A2, A2.md), Michael:
"yes build a2, but create without the guns, they will be in game anyway"; rifle carry: "no gun needed, it will be in
game"; Moth: "Decide at step 12". So: Wren is built as A2 (one-piece premium suit, composite chest plate with three rib
segments and a slim back plate, magnetic buckles, chest rig with two rifle magazines, a gadget slot, knife and PTT,
thigh holster, left-thigh throwable sleeves, belt with pistol magazines, cam / mine pouch, one flush rappel ring, drone
pod, medkit and radio, lighter approach boots), with NO rifle and NO pistol modelled: the game's weapon models attach
in game. The holster is built empty (shaped for the game's sidearm) and the back plate carries a weapon mount point
where the game's carry slot attaches the long gun; its orientation follows the game's carry slots (assumed A36:
src/weapons carry slots today carry long guns upright on the back; revisit with locomotion step 25). Moth stays open
until step 12.

**D23 Concept A, made logical for the game (2026-10-16).** Shown concepts A (infiltration suit), B (two-piece) and C
(armoured skin), Michael: "I like A, but can you make it more logical based off the requirements of the game, for
example somewhere to holster pistol and store longer rifle on back? not fussed on rope attachment points, should be
tactical storage (pistol mags, rifle mags) and any other suggestions by you. must all be slimline, well designed,
practical for a stealth operative to use. this suit would be very expensive and should look it". Boots: "Lighter
approach boots". So: concept A's one-piece suit and slim segmented armour, with storage mapped to the game's loadout
(rifle on the back, pistol holster, rifle and pistol magazines, the gadget set in game/gadgets.ts, medkits), no
climbing sit harness or rope attachment points, premium materials and finish, new lighter approach boots. The
orchestrator's loadout proposal (A2) is rendered in scratch for Michael to confirm before the re-plan.

**D22 Stealth operative, not military (2026-10-16, after step 08).** Michael: "I'm thinking the current design is more
military style, whereas I want more of a stealth operative design. Wetsuit fitted suit, slim body armour, tactical
ammo storage/holsters. The type of design for someone that would need to remain agile and able to climb in tight
spaces/climb ropes, rappelling etc." Asked how to proceed: "Pause, options first"; Moth: "Decide after Wren's
options". So: the run pauses after step 08 (no step 09); a scratch options pass renders 2-3 whole-figure stealth
concepts for Wren (fitted suit, slim armour, low-profile storage, climbing / rappel harness); Michael picks; then
ART-DIRECTION, SPEC, PLAN and the step files are re-planned and the run continues. Kept from earlier steps unless the
pick says otherwise: hood and balaclava, the original goggle on its band (D20), the strap-2 head harness, gloves, and
every pipeline tool. Expected to be replaced: the combat shirt and cargo trousers (by the suit), the plate carrier and
belt (step 08, by slim armour, storage and a harness), and step 09's plan. Step 08's generators are committed for reuse.

**D21 Hero LOD use confirmed (2026-10-16).** Michael, after the hero / LOD0-2 / phone plan (SPEC 6.3-6.4) was
explained: "i do want hero version for the main menu and for any close up shots". Hero LOD (150-250 k triangles,
budget unchanged) drives the main menu and every close-up camera; gameplay uses LOD0-2; phones never download it.
Step 18's integration plan names the close-up cameras that switch to hero.

**D20 Goggle pick: the original housing, no flip; strap option 2 (2026-10-16, step 07).** Shown the scratch options
(goggles A wraparound visor, B twin pods, C faceted shell; straps 1-3), Michael: goggles - "I don't like any of them, the
original one looked better but it can't flip up, it would be impractical for stealth operative"; strap - "2 - Split
crown, hard pod". So: keep the original step 07 goggle housing (the D19 "more futuristic, less square" point is
withdrawn for now); remove the flip mount (D19 stands: stowed on the brow, over the eyes in use, no flip arm); the head
harness becomes option 2 (two crown straps forking from a hard brow plate to a hard sculpted rear battery pod,
low-profile cam buckles on the side straps). The goggle is held by a wide band through side lugs on the housing,
carrying the power line to the rear pod (from the options pass; assumed, A29). Scratch options and their script:
the session scratchpad `options/` (OPTIONS.md, opts.py), not kept in git.

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

## Assumed decisions, step 06 (D15 unattended)

**A18 Gloves and boots are fitted, not sewn (step 06).** Neither is cloth-simulated: a glove's fourchettes are a few
  millimetres wide and a boot is a hard, moulded shape, which Blender cloth cannot sew over fingers or hold as a last.
  `py/build_fitted.py` builds both in one stage (no `build_garment.py` / `garment_details.py`), listed in `FITTED` in
  `export-gltf.mjs`. Gloves (`garments/gloves.py`): the body's hand faces, subdivided twice, offset 2.2 mm off the skin
  and pushed clear of the base-layer cuff ("shrink-fitted panels", step 06 Do 1); panels are cut on that surface from
  the hand frame (wrist, knuckle line, palm normal from the finger curl). Boots (`garments/boots.py`): a last lofted
  from the foot's section hulls plus 4.5 mm clearance and 14 mm toe room, flattened onto a moulded sole (step 06 Do 2).
  Both leave the files a sewn garment leaves (`-sim.json` with `method: fitted` and a 0 seam gap - nothing is sewn by a
  simulation; `-sim.npz` with the shell; the item blend), so `operators:check` runs every other check on them unchanged.
  Layer order (A11): base_layer, gloves, boots, combat_shirt, trousers - the shirt cuffs and the trouser hems are
  pushed clear of the gloves' and boots' shells. The check gains a hand and a foot view so their materials are sampled.
  Suede and goatskin are shader-only (no CC0 scan; the step allows one only if a shader cannot reach the look).
  Undo: drop 'gloves' and 'boots' from `GARMENTS`, rebuild the shirt and trousers.
**A19 Panel cutting by level-set slice (step 06 fix round 2; recorded by the orchestrator).** `fitted.level_slice`
  cuts the fitted shell along each panel field's zero contour (boots: counter, toe cap, collar, eyestay, tongue, rand;
  gloves: knuckle, fingertip); crossings within 18 % of a vertex move onto the contour. Replaces the Newton snap, which
  left torn, sawtoothed panel edges. Undo: restore the snap in `boots.py` / `gloves.py`.
**A20 Overlays are stepped panels (step 06 fix round 2).** `fitted.split_step` gives each overlay its own vertices
  and a flat-shaded wall quad to its neighbour, so a panel ends on a real turned edge; stitches and hardware sit on the
  overlay top. Undo: drop `split_step` from the panel blocks.
**A21 Glove fit repair (step 06 fix round 3).** `untangle()` relaxes folded vertex fans before and after the overlay
  lift (folded fans pushed the solidify's inner wall out through the glove: the fingertip dot). The last finger segment
  is smoothed and re-cleared 1.3 mm off the skin (no nail print). Every fingertip is capped by leather with a U edge
  (10 mm on the nail, 22 mm on the pad), no seam at the tip; tip step 0.3 mm; overlays lift along smoothed normals.
  Undo: `gloves.py`.
**A22 Trouser hem drafted from the boot (step 06 fix rounds 1-2).** `build_garment.py` reads `-boots-sim.json` and
  drafts the trousers' `hem_circ` to the boot top girth plus one layer (26.5 cm on Wren, was a fixed 34 cm); `z_hem`
  is ankle minus 5.5 cm (was 1.5) so the settled hem laps the boot collar. Couples the trousers to the boots' build
  output. Undo: the fixed `hem_circ` and `z_hem` in `trousers.py`.
**A23 Boot materials and toe (step 06 fix round 2).** Suede albedo 0.027 (nap 0.033), sheen 0.22, tint 0.3, Specular
  IOR Level 0.2; nylon and rubber Specular IOR Level 0.3; rubber scuff 0.038. Reason: the stealth key lit up-facing toe
  caps near-white; closed by measurement (boot shafts 0.07 vs leggings 0.06-0.08; the toe-cap brightness is the key
  light on up-facing surfaces, bare feet light the same way). Toe: `TOE_ROOM` 14 mm, superellipse 2.0 medial / 1.7
  lateral, toe width 2 cm behind the tip 61 % of the ball. Undo: `materials.py`, `boots.py`.
**A24 Head items are fitted, not simulated (step 07).** The step file asks for the balaclava and hood "sewn and
  simulated on the head"; they are built by `build_fitted.py` like the gloves and boots (A18): a ray grid round the
  head and neck (`head_common.capsule`) whose vertices only move along their rays, stretched as a membrane over the
  skin and the layers (`head_common.membrane`: tension bridges the eye sockets, the mouth and behind the ears and tents
  over the nose; low cling on the face, so no face is modelled under the knit, D4), the hood a looser membrane over the
  balaclava, both cut along field contours (`level_slice`). Reason: a knit this tight on a face does not drape, and
  Blender cloth on the face's concavities is the failure the gloves hit (A18); folds that matter (the rear channel's
  gathers, the strap dents) are placed from the kit that makes them. The head kit is hard parts and webbing laid by
  rays on the hood surface. Two items in `GARMENTS`, after the trousers: `headwear` (kit hood + balaclava) and
  `head_kit` (headHarness + the rest). Undo: a sewn `garments/hood.py` through `build_garment.py`.
  Fix round 1 (item 7) tried that undo for the hood (`py/trials/hood_sim_trial.py`, the fitted hood's three panels
  flattened as the rest shape, sewn, balaclava and shirt as colliders, six runs): pinned, it blew apart at frame 2;
  unpinned, the flat dome panels pulled short (seam gap 98 mm at frame 40) and 2359 of 2604 sampled vertices went
  inside the balaclava. The hood stays fitted; LOG.md "Step 07 fix round 1" has the numbers.
**A25 Base-layer mock neck drawn in under the head items (step 07).** The step 05 base layer's mock neck flares up to
  26 mm outside the shirt collar at the nape (through the collar, measured 0.079 vs 0.052 m at z 1.45). The headwear
  stage draws its render mesh, stitches and shell back to 4 mm off the skin above the collar line (blended in over
  25 mm, inside the collar), so the balaclava and hood are not pushed out by it; 19k vertices move. It is covered by
  the balaclava and hood everywhere it moved. Undo: drop `tame_mock_neck` in `headwear.py`; the real fix is the base
  layer's neck band (follow-up).
**A26 Lens material class (step 07).** The goggle lenses are coated glass: glossy (roughness 0.06) with a thin-film
  coating and the emissive glow (D13). The check's fabric/hard classes cannot hold them, so `check_garment.py` gains a
  third class `lens` with its own roughness limit 0.02-0.3 (albedo not judged); no existing limit changes. Three head
  measuring views are added (front left, back left, front low). Undo: tag the lens `hard` and accept a frosted lens.
**A27 Head cable data measured (step 07; partly superseded: see the note at its end).** Kit data cable lengths follow the routed builds: goggle cable 0.28 m (was
  0.4) with clips at 0.09 and 0.18 m; it runs into the mount shoe and the mount carries power to the goggle through its
  contacts (so flipping the goggle never pulls the cable). Earpiece cable 0.44 m (was 0.27) from a plug at the left
  collarbone (the PTT arrives in step 09): collar clip 0.03, under the balaclava edge 0.17, held under the balaclava up
  the neck 0.3 (every free span under MAX_CABLE_SPAN). The hood rides over it (a soft ridge on the left of the neck).
  Undo: `kit.ts`.
  Note (round 4 checker): the goggle cable no longer runs to a mount shoe (no mount since D19 / D20; see the A29 update);
  the earpiece cable's 0.44 m comes from a routing bug - it passes through the neck to the right side and back (step 07
  OPEN, steps/07-fixes-r4.md); a direct collarbone-to-ear run is about 0.19 m.

**A29 Goggle band, hard pod and the two positions (step 07 fix round 1, PART B; D19, D20).** The band is assumed from
the scratch options pass (D20): a 22 mm elastic band (1.8 mm) through a D-frame lug on each side of the original square
housing runs round the back of the head over the harness; it takes the convex hull of the head section (an elastic
band under tension bridges hollows) and passes through a channel under the battery pod. It carries the goggle cable:
pod outlet (left, top) along the band's outer face under three webbing keepers to the left lug, 0.26 m in use
(keepers 0.07 / 0.14 / 0.21 m; kit data). Two positions: in use (the build's pose, exported and checked) and stowed
(the goggle slid up 44 mm onto the brow, tipped back 16 degrees, resting on its eyecups 1.6 mm off the hood; a rigid
transform `stowM` on the goggle parts, the band and cable rebuilt for that pose and hidden from export and checks).
Further calls: the battery pod is the harness's hard rear shell (D20 "no soft cradle"), so the battery retention strap
and its hook-and-loop tab are gone (`batteryStrap` removed from Wren's kit; Moth's untouched until step 13); the
dovetail rail on the housing top went with the mount; the hood's cord lock moved to the centre line between the two
crown straps (CORD_X 0.0, channel 6 mm higher above the pod). Undo: `garments/head_kit.py` (`band`, `STOW_*`),
`head_common.straps` (forks), `kit.ts`.
Updated after fix rounds 2-3 (recorded by the orchestrator from the round 4 checker): the band is no longer a convex
hull but a relaxed strip (`_relax_band`: shrinks onto hood + face-opening hem + harness, per-edge ray collision, may
press 0.8 mm into the hood, pinned at the lug bars and a guide point under the pod, the hood dented under it); each end
is one wrap-and-return webbing with a bar tack; the goggle cable is 0.29 m with keepers at 0.07 / 0.14 / 0.22 m and
plugs into the housing side above the left lug; the cam buckles sit 32 mm behind the brow plate (was 50); the chin
buckle sits on the left riser at the jaw, 51 mm below the eye line. Standoff metric: the band underside centre over
the contact run only, measured over hood + hem + harness (in use 2.0 mm, stowed 2.5 mm).
**A30 Twelfth check view (step 07 fix round 3; recorded by the orchestrator).** `check_garment.py` gains a view of the
  right wrist from below, looking up the sleeve: the longer hood skirt (A31) hid the base layer's compression knit in
  the head items' views (2547 px at SKIRT_BACK 0, 30 px at 10 mm, limit 150); this view sees 855-885 px of it under the
  shirt cuff. No limit changed; albedo and roughness are sampled from the shader inputs, so an added real view cannot
  hide an out-of-band value (round 4 checker). Undo: drop the view and shorten the skirt.
**A31 Hood skirt lower at the nape (step 07 fix round 3; extends A25).** The hood skirt ends 10 mm lower at the back
  (`SKIRT_BACK`, `skirt_cut`), is re-faired after the push-out from the shirt mesh, and `tuck_collar` draws the shirt's
  render mesh inside the skirt to a per-vertex edge height (1251 vertices; the shirt is not rebuilt), so the nape shows
  the skirt's clean hem. Undo: `SKIRT_BACK` 0 and drop `tuck_collar` in `headwear.py`.
**A32 Carrier and belt are fitted items (step 08; extends A18, A24).** `carrier` and `belt` are `FITTED` items after
  `head_kit` (`py/garments/carrier.py`, `belt.py`, shared geometry in `torso_common.py`): rigid and tensioned parts laid
  on the shirt and the trousers by rays, not cloth-simulated. Each plate bag is a rigid curved slab whose tilt,
  horizontal radius and vertical bow are searched to rest on the shirt's high points with the least mean gap (the plate
  bridges the hollows: front tilt 3 deg, bow 0.9 /m, gap up to 58 mm over Wren's upper chest, which is real for a
  plate resting on the bust). Straps and bands follow the convex hull of the pressed surface (a loaded strap runs
  straight between its anchors). Undo: drop the two items from `GARMENTS`.
**A33 The shirt and trousers are pressed, not re-simulated (step 08 "re-settle the shirt with the carrier as a
  collider").** `torso_common.compress` moves every shirt vertex that lies above a part's underside in to 0.3 mm under
  it, at most 2.5 mm (2 mm for the trousers under the belt) and never closer than 1.6 mm to the layer below, the dent
  eased over 10 mm; the shirt's stitches and zip follow. Why: Blender cloth-on-cloth collision tore the seams (A11), and
  re-simulating the shirt would mean rebuilding the trousers and head items over it. The pressed area and the few
  vertices where a part sits deeper than the fabric can give (under the bags' tucked cummerbund ends) are in the sim
  report (`shirtPress`, `trouserPress`). Undo: skip `compress` (the parts then sit on the unpressed fabric).
**A34 Wren's harness is the carrier's shoulder straps plus the belt; carrier layout (step 08).** The kit has no
  separate belt harness for Wren, so none is built (a strap needs two anchors and a job, SPEC 1). The front plate's top
  is at 1.354 m (cut high, about 5 cm under the throat): the step 07 earpiece plug at the left collarbone sits just
  above its shooter's cut and must stay clear (measured `plugClearM`). The straps run 94 mm off the centre line at the
  plates and 118 mm over the shoulder, so their inner edges clear the hood skirt (`hoodClearM`) and the plug. The
  cummerbund's ends pass under the front bag's sides and close on hook-and-loop under its lower flap (the "front flap").
  Undo: move the plate top and strap lines in `carrier.py` (`fit` arguments, `x_f`, `x_t`, `x_b`).
**A35 Kit additions and hand-overs (step 08).** New kit item `carrierRelease` (the quick-release cable: SPEC 3.2 /
  ART-DIRECTION 3 ask for it and every built part needs a kit entry). The radio's antenna (bent down, elastic loop) is
  built here with the radio; step 09 adds the radio cable and the PTT to the radio's top connector. The drop-leg hanger
  (kit `dropHanger`) is left to step 09 with the holster. Undo: remove the item from `kit.ts` and the loop from
  `carrier.py`.

## Assumed decisions, the A2 re-plan (D22-D24; planner, recorded by the orchestrator)
**A36 Weapon mount orientation (from D24).** The back plate's mount follows the game's carry slots: long guns upright,
  muzzle up, backC on the spine, backL / backR 7 cm either side, splayed 0.08 rad (carrySlots.ts, weaponModel.ts).
  Revisit with locomotion step 25. Undo: re-aim the mount frames.
**A37 The suit replaces the base layer (step 08a).** One garment, `suit`, first in GARMENTS, built from base_layer.py's
  top and leg blocks with `cling`. Gloves and boots are rebuilt over it: thumb loops and sleeve cuffs under the glove
  cuffs, ankle cuffs inside the boots. Why: no base layer would ever show (the suit has its own mock neck and cuffs),
  and it is one layer fewer to simulate and push. base_layer, combat_shirt, trousers, carrier and belt leave GARMENTS;
  their modules stay for Moth and for reuse. Undo: put base_layer back first and build the suit over it with one more
  UNDER_LAYERS allowance (4.1 mm girth).
**A38 Suit cuff inside the boot (step 08a).** A bonded ankle cuff about 9 cm above the ground, at least 25 mm inside
  both the step 06 collar and the 09b collar (12-13 cm). A22 (trouser hem over the boot collar) no longer applies, and
  09b rebuilds from the boots on, not the suit. Undo: a gaiter cuff over the collar, which needs the suit after the
  boots in GARMENTS.
**A39 Back-carry lane.** The game's upright back guns (BACK_X 0.07, butt 0.40 m below the chest joint, CARRY_GAP 12 mm,
  `rig.backGear`) need the back flat at about |x| <= 0.10 m from the belt to the shoulders. Only the plate, the
  recessed radio, the mount receiver and the flush rappel ring sit in it. The drone pod moves to rear left on the belt
  and the medkit to rear right (A2 had both low on the centre-left back, placed round its diagonal rifle). Undo: if
  Michael chooses a diagonal back carry (a game change), put them back where A2 had them.
**A40 Weapon anchors and the empty holster.** The mount is a flush gunmetal receiver with frames `weaponMount.backL /
  .backC / .backR`. The holster cavity fits the largest thigh-slot sidearm in weaponDefs.ts (pistol, fiveseven,
  pistolSd), open at the muzzle, retention hood shown closed, frame `pistolHolster` at the game's thigh slot. All frames
  go in the sim reports and, from step 10, into every LOD as glTF empties; the back-plate standoff `backGearM` is
  reported for `rig.backGear`. Undo: drop the empties.
**A41 Sling slot vs the throwable sleeves (superseded by D25: sleeves on the left front thigh).** The game hangs a compact gun at the left hip, 3.5 cm outside the thigh,
  where A2's sleeves sit. Built as A2, with a flush quick-detach sling socket on the belt at the left hip as the slot's
  anchor. The overlap is an integration item for step 18 and locomotion step 25. Undo: move the sleeves to the left
  front thigh.
**A42 No IR strobe on Wren.** It is not in A2 or in D24's list. ART-DIRECTION 3's strobe stays for Moth. Undo: a flush
  strobe on the back plate's top edge (kit item `strobe`).

## Assumed decisions, step 08a (stealth suit; implementer)
**A43 The suit's waist is a sealed lap, not a sewn seam.** The top and leg blocks keep the base layer's lap (the top's
  hem over the leggings' inner band, which stays pinned and hidden), and the lap is sealed under a 10 mm bonded waist
  tape: garment_details `lapSeal` draws the top's edge down onto the leggings over 12 mm so the tape lies flat over a
  feathered edge. Why: the pipeline sews equal runs, and the top's hem and the leggings' top differ in length round the
  body; sewing them needs a new waist block. Undo: draft a waist block whose top run matches the top's hem and sew it.
**A44 Suit zones as pattern-space inserts on the existing block.** The raglan block has no separate yoke or side panel,
  so the shoulder yoke is the sleeve cap above half the raglan length, and each underarm vent is two inserts (front and
  back panels) meeting at the side seam; elbow, inner-elbow, rear-shoulder and forearm zones sit on the sleeves, knee
  grip and the back-of-knee vent on the leg panels, the seat on the back leg panels (trousers' `seat_outline`). Undo:
  split the panels into real yoke and side panels in a new suit block.
**A45 The bust is relaxed on the body under the suit (step 05 OPEN 1).** `suit.prepare_body` smooths the skin inside
  5.5 cm of each breast's most forward point (25 passes, inward only) before the suit is measured, so the compression
  suit holds one smooth form. The changed body is saved in the suit's blends and every layer after it is built over
  it; the body build itself is untouched. Undo: drop `prepare_body` from suit.py.
**A46 The balaclava tucks inside the suit's mock neck.** With no base layer and no shirt, the suit is both the mock
  neck the A25 draw-in acts on and the collar the hood skirt laps over (`headwear.collar_layer`, `mock_layer`); the
  suit's tapes, zip and garage follow the collar's draw-in at their nearest collar vertex. Undo: build the balaclava over
  the suit collar and drop the draw-in for the suit.
**A47 Material classes on the suit.** The seam tape is fabric (a cloth-backed laminate tape, roughness 0.74); the grip
  print is hard (rubber, roughness 0.64-0.72); the zip slider and puller are the gunmetal anodised finish. Undo: re-tag
  `operators_class` in materials.py.
