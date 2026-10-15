# Operators WREN and MOTH - specification (Stage 1 draft)

Status: Stage 1 done and answered (D7-D11). Stage 3 replaces this with the final character detail sheet.
Decisions: `DECISIONS.md` (D1-D11 Michael; S1-S2 setup). Sources read: Section 9.

---

## 1. The detail standard (Michael, 2026-10-15; every render is checked against it)

**Logical.**
- Every strap has two anchor points and a reason to exist.
- Every buckle, clip and webbing loop does a job: it carries load, adjusts fit or retains an item.
- Every pouch holds something named in the kit list, with a closure that matches what is in it.
- Cables run from a source to a device along a route real people use, with retention points.
- No decorative greebles.

**Construction.**
- Seams where real garments have panels, with stitch lines.
- Bar tacks at stress points, bound edges, zip garages, elastic gathers.
- Reinforced patches at knee, elbow, seat and shoulder (rifle butt). Drain grommets.

**Physical.**
- Fabric drapes and compresses under straps. Straps carry tension and slack. Pouches sag with weight.
- The harness pulls the trousers.
- Materials read correctly at close range and under raking light: soft-shell, ripstop nylon, elastic knit, webbing,
  rubberised grip, anodised and painted metal, matte polymer, leather, rubber soles, lens coatings.

**Lived-in.**
- Plausible, restrained wear: scuffs, abrasion on edges, dust in creases, a rolled sleeve (Moth), worn webbing ends, tape
  on kit. Nothing new out of the box, nothing grimy.

**Two levels.**
- The hero LOD (menus, close cameras) carries full detail.
- The in-game LODs keep the same silhouette and read, with detail moved into normal and texture maps.
- The phone gets the lowest LOD of the same design.

**Render checklist (per close-up, Stage 2 onward).** For every visible item the callout names: what it is, its anchors
(straps), its contents (pouches), its route and retention (cables), its job (hardware). An item with no answer is cut.

---

## 2. Design language (D5: "Splinter Cell inspired models that are original")

What makes the reference game's operator read the way it does, as principles we keep (shapes and details are ours):

- **A human silhouette first.** Close-fitting garments, kit kept tight to the body. Agile and athletic, never bulky.
  The outline at 20 m is a person with a distinctive head shape, not a pile of gear.
- **Dark, matched layers.** Top and trousers in close, desaturated darks so the body reads as one form; texture and
  material changes (knit vs ripstop vs webbing vs polymer) carry the detail, not colour.
- **A harness over the suit.** Load-bearing webbing that shows the body under it, rather than a slab of armour.
- **The head is the signature.** A covered head under a hood with goggles on a mount, the lenses glowing in the dark.
- **Purposeful kit only.** A thigh holster, a back-carried long gun, a few pouches; everything has a job.

What we never take: the reference's three-lens goggle, its suit's panel layout and patterning, any emblem, name or
logo, its exact harness design, or any real product's shape.

Our signatures: Wren's square single-shroud goggle housing (green), Moth's round twin lenses on short barrels (amber),
Moth's climbing harness and rolled sleeves.

---

## 3. Reference study: modern covert night-operations clothing and kit (own words)

### 3.1 Garments

**Combat shirt** (worn under a carrier or harness).
- Torso in a fine elastic knit: it breathes under the load and stretches flat, so it shows few folds; it puckers only
  where a strap crosses it.
- Sleeves in ripstop (a grid of heavier threads woven into light nylon/cotton: a faint square texture at 0.3 m).
- Raglan sleeves: the seam runs from the collar to the armpit, so the shoulder has no seam under a strap.
- Upper-arm pockets with flaps closed by hook-and-loop; the flap edge is bound. (Ours carry no patches.)
- Elbow pad pockets: a double layer with a slot for a foam pad; a reinforced outer panel.
- A short collar with a quarter zip; the zip ends in a fabric "garage" so the puller does not dig into the chin.
- Cuffs with a hook-and-loop tab to close over the glove.

**Soft-shell top** (the outer option). A woven stretch face with a fleece back: smooth, matte, slightly sheened
under raking light. Folds are broad and soft. Pit zips for venting, a fitted hood with a rear volume adjuster
(shock-cord through a cord lock at the back of the head).

**Trousers.**
- Ripstop or soft-shell with a stretch gusset at the crotch and stretch panels behind the knees.
- Articulated knees: darts (stitched tucks) pre-shape the knee so it bends without pulling.
- Knee pad pockets (foam inserts) or slim external pads strapped on.
- Cargo pockets on the thighs angled forward for the hand; a flap with a quiet closure; a drain grommet (a small
  metal eyelet) at the bottom.
- Reinforced seat panel, belt loops wide enough for a duty belt, bar tacks at the pocket corners and belt loops.
- Ankles with a drawcord or bloused over the boot.

**Balaclava.** A thin fitted knit hood (synthetic or merino blend), flatlock seams (flat, ridged stitch lines on the
outside), one eye port. Under D4 the goggles' rubber seal covers the eye port fully, so no skin shows.

**Gloves.**
- A thin leather palm (goatskin: fine grain, darker where worn) and a stretch synthetic back.
- Fourchettes (narrow strips between the fingers) with visible seams, reinforced palm and fingertip patches.
- A knuckle panel of thin padded fabric; a wrist tab with hook-and-loop or a pull loop.
- Wear: the trigger finger, the palm heel and the rope hand polish and darken first.

**Boots.**
- Mid-height and light: suede and nylon upper, a rubber rand round the toe, a heel counter.
- Laced through eyelets, then speed hooks at the top; a lace garage pocket on the tongue.
- A quiet low-profile lug sole with a heel brake; a heel pull loop.
- Wear: scuffed toe rand, dust packed in the lugs, a crease across the forefoot where it flexes.

### 3.2 Load bearing

**Low-profile plate carrier.**
- Front and back plate bags (slim plates or soft panels), joined by padded shoulder straps and an elastic cummerbund.
- The cummerbund closes at the front under a flap with hook-and-loop; the shoulder straps adjust by a buckle or a
  webbing tail under a cover.
- The outer faces carry a grid of webbing loops: rows of 25 mm webbing stitched down every 38 mm, so pouches weave
  through. (A generic construction standard, not a brand.)
- A drag handle at the top of the back. The top of the front plate sits at the base of the throat.

**Chest rig.** An H- or X-shaped harness over the shoulders carrying a front panel of pouches, closed round the ribs
by a side strap. Lighter than a carrier, it leaves the ribs and back free (a climber's choice).

**Belts.** Two layers: a soft inner belt through the trouser loops, the stiff outer belt hook-and-loop to it. A
two-part metal quick-release buckle with a sprung latch closes it (our own shape). The outer belt carries the holster
hanger, grenade pouches, a dump pouch and a knife sheath.

**Thigh holster.** A rigid moulded polymer holster on a drop-leg platform, hung from the belt by a short strap (so the
grip sits at the relaxed hand's height), held to the thigh by two leg straps with elastic sections and side-release
polymer buckles. A retention hood or lever over the pistol. An open muzzle end for a suppressed pistol.

**Back long-gun carry** (`carrySlots.ts`: long guns vertical on the back, muzzle up, splayed a little from the spine).
- Real equivalent: a retention on the back panel.
- A moulded butt cup at the bottom of the back plate bag holds the stock.
- A bungee loop with a pull tab round the handguard at the top holds the gun.
- The swap animation's reach over the shoulder pulls the tab; the gun lifts out of the cup.
- The gun's sling stays clipped to the gun, folded and held by an elastic keeper.

**Pouches.**
- Rifle magazine pouches: open top with a shock-cord retention loop and a pull tab (quiet, fast).
- Pistol magazine pouches: the same, smaller.
- Radio pouch: open top with an adjustable strap and a hole for the antenna; cable exits at the top.
- Admin pouch: a zipped flat pouch on the chest (notebook, marker, multitool, light).
- Medical pouch: a pull-out tab and a quiet buckle (it holds the medkit the game uses).
- Grenade pouches: a flap over each, held by a quiet snap.
- Dump pouch: rolled and held by elastic until it is needed.
- Weight shows: full pouches pull their bottom edge out and down; the webbing above them stretches taut.

### 3.3 Head: mount, goggles, comms

**Head harness.** Without a helmet, goggles ride on a strap cradle: a crown strap, two side straps to a padded rear
cradle, a chin strap, and a firm front plate on the forehead. Worn over the hood, its straps compress the hood fabric
(visible dents and pulled folds).

**Mount.**
- A flip-up arm on the front plate: up (stowed) or down (in use).
- Knobs set fore-aft and height. A detent lever unlocks the flip.
- Anodised aluminium body (fine sheen, edges worn to bright metal), polymer knobs with knurling.

**Goggle housings.**
- A housing holds optics and a display behind each lens; a soft rubber eyecup seals against the face.
- Lens coatings show a coloured reflection at an angle.
- Our glow is the display leaking through the lens: emissive, visual only (5.14).

**Battery pack.** On the rear cradle as a counterweight. Its cable runs over the crown along the crown strap, held by
two or three clips or elastic loops, down to the mount; strain relief at both ends.

**Comms.**
- Radio in a pouch (chest left, or the left side of the carrier).
- A cable from the radio runs up the shoulder strap, held every 10-15 cm by an elastic loop or clip, to a
  push-to-talk (PTT) button mounted on the strap or the chest.
- From the PTT a thin cable runs up the neck, under the hood, to an in-ear piece or bone-conduction pad.
- A short flexible antenna bends down along the body so it does not snag.

### 3.4 Climbing kit (Moth)

**Sit harness.**
- A padded waist belt above the hip bones, closed by an auto-locking buckle.
- Two leg loops with buckles; a sewn belay loop at the front joining waist and legs; four moulded gear loops round the
  waist; a haul loop at the back.
- The leg loops compress the trousers into rings; the belay loop is the most abraded item on the harness.

**Hardware.**
- A locking pear-shaped carabiner on the belay loop with a plate descender of our own design.
- Two or three snap-gate carabiners on the gear loops.
- A sewn sling over the shoulder or clipped to a gear loop; a short friction-hitch cord.
- A compact rope bag on the hip for the rappel.
- Anodised colours are dark (dull bronze, gunmetal) for stealth; edges are worn to bare aluminium.

**The holster on a harness.** With no duty belt, the drop-leg hanger loops round the harness waist belt.

### 3.5 How fabric folds and how kit sits

| Region | Arm or leg straight | Bent or loaded |
| --- | --- | --- |
| Shoulder | Smooth over the deltoid; raglan seam diagonal | Arm raised: fabric bunches into the armpit, a taut diagonal from hip to elbow; the carrier's shoulder strap rides up |
| Elbow | A loose sleeve hangs in soft vertical drape from the deltoid | Inside: stacked compression folds (an accordion); outside: stretched taut over the pad |
| Knee | Slight bagging at the front | Behind: a concertina of folds; front: taut over the pad, diamond-shaped pull lines from the pad to the thigh |
| Waist | The belt gathers the trousers into small vertical folds; the shirt blouses slightly above the belt | Crouched: the belt tips forward, the trouser seat stretches, folds pile at the hip crease |

**Load and sag.**
- Load rides on the shoulders (carrier, chest rig) and the hips (belt, harness).
- Under a strap the fabric pillows out between straps and dents under them.
- A loaded strap runs straight between its anchors; slack tails are folded and held by an elastic keeper.
- Full pouches tip outward at the bottom. The holster platform bows slightly round the thigh.
- The harness waist belt pulls the trouser waistband down at the front where the belay loop hangs.

---

## 4. Anthropometry and the shared skeleton

### 4.1 The rule (D10, D11 override D3's identical skeleton)

**Each operator has their own height.**
- Wren 1.68 m: a tallish woman, about the 75th percentile; compact in build.
- Moth 1.78 m: a little above the average man; lean.

**Per operator (follows the body you see):**
- the skeleton: `proportions(build, height)` already scales every length by height;
- the hit volumes (`hitVolumes(p)` of that operator's proportions);
- the light sample heights (chest and head, from that operator's joints).

**Shared (as today):**
- the controller capsule;
- speeds and gears;
- camera rules;
- every traversal move and its anchors.

**Gameplay effects to carry into integration:**
- Light: Wren's head sample sits about 6 cm lower than Moth's, so she is slightly harder to see over low cover and
  in a low lamp pool.
- Hit volumes: shots that clear Wren's head can hit Moth's.
- Mission 8 (the Confrontation, the only versus content) inherits both effects. Michael accepted this ("realism over
  fairness; the game is mostly co-op").
- Traversal: hands reach the same anchors from the same capsule. The visible body's root offset and IK must take up
  the 10 cm height difference:
  - hangs: a shorter operator hangs with more arm extension, within the 5.12.2 ROM limits;
  - ladders and vaults: the step and hand timing come from the shared move.
- These are verified per operator in the Lab's poses (Stage 2) and in `e2e-traverse` at integration.

### 4.2 Check against real data

Real values are the published averages of the large US Army anthropometric survey (ANSUR II, 2012; men about 1.756 m,
women about 1.629 m tall), as ratios of stature scaled to 1.75 m.

The values are from the published summary as I recall it, to about 1 cm. Stage 2 must check each against the report's
tables (Gordon et al. 2014, NATICK/TR-15/007). Stage 1 could not extract the PDF's tables on this PC: no PDF text
tool is installed.

| Landmark at 1.75 m | proportions.ts | Real, man | Real, woman (scaled) | Verdict |
| --- | --- | --- | --- | --- |
| Head height (vertex to chin) | 0.229 (7.6 heads) | ~0.23 | ~0.23 | Good |
| Head breadth / length | 0.158 / 0.19 | ~0.155 / 0.197 | ~0.157 / 0.20 | Good (the hood adds 8-12 mm a side) |
| Neck base (joint) | 1.48 | cervicale ~1.51 (the joint sits ~3 cm lower) | same ratio | Good |
| Shoulder joint (glenohumeral centre) | 1.435 | acromion ~1.44; joint ~4 cm below it, ~1.40-1.41 | same ratio | **~3 cm high** |
| Fingertip height, arms hanging | 0.705 (1.435 - 0.30 - 0.26 - 0.17) | ~0.66 (0.38 H) | ~0.66 | **Arms ~4 cm short** |
| Hip joint | 0.915 | ~0.91 | ~0.91 | Good |
| Knee joint | 0.50 | ~0.49-0.50 | ~0.49 | Good |
| Ankle joint | 0.075 | ~0.07-0.08 | ~0.07 | Good |
| Hand length | 0.17 | ~0.19 | ~0.19 | **~2 cm short** (fine for a mitten, wrong for fingers at 0.3 m) |
| Foot length | 0.27 | ~0.27 | ~0.26 | Good (boots ~0.29-0.30) |
| Shoulder width (bideltoid) | 0.46 | ~0.50 | ~0.47 | Between the two: fine as a shared base |
| Hip breadth | pelvis 0.31 | ~0.35 | ~0.39 | **Narrow** (visual only) |
| Waist depth | 0.185 | ~0.21-0.24 (lean: ~0.20) | ~0.20 | **Thin** (visual only) |
| Chest w x d | 0.34 x 0.22 | ~0.33 x 0.25 | ~0.31 x 0.25 (with bust) | Depth thin (visual only) |

### 4.3 Proposed corrections to the base proportions (applied at integration, after the locomotion merge)

These fix the base ratios that every height scales from, so they apply to both operators (and to guards, which share
`proportions.ts`). The lengths below are at 1.75 m; each operator's height scales them.

| # | Change | Why | Gameplay effect |
| --- | --- | --- | --- |
| A1 | Shoulder joint y 1.435 -> 1.41 | The joint centre sits under the acromion, not level with it | Body hit capsule top (`hitVolumes.bodyY1`) 2.5 cm lower; the weapon's aim pocket and grip IK 2.5 cm lower; the camera follows the head: none expected (to verify) |
| A2 | Upper arm 0.30 -> 0.31 | With A1, fingertips reach 0.38 H | Hand reach +1 cm: ladder, pipe and ledge contact bars re-run (`e2e-traverse`) |
| A3 | Hand length 0.17 -> 0.185 | Real hands; hero hands have fingers | None: grip offsets (`WRIST_TRIGGER`, `WRIST_SUPPORT`) retuned, weapon hold bars re-run |
| A4 | Pelvis width 0.31 -> 0.33, waist depth 0.185 -> 0.20, chest depth 0.22 -> 0.23 | Real body mass for draping clothes | None: visual mesh only; hit volumes come from the shared base build, not the mesh |

Each operator's hit volumes come from that operator's proportions (height and build), never from the mesh, so they
stay simple capsules and a head sphere.

### 4.4 Builds

Height carries most of the difference (D10, D11). Build mods stay modest so the two still read as fit operators of
the same team:

| | Shoulders | Chest | Waist | Hips | Girth (limbs) |
| --- | --- | --- | --- | --- | --- |
| Wren (thirties, compact, ex-military woman) | 0.97 | 1.00 (bust under the carrier) | 0.96 | 1.04 | 0.98 |
| Moth (twenties, lean, ex-steeplejack man) | 1.03 | 0.98 | 0.96 | 0.97 | 0.96 (long, ropey forearms) |

What tells them apart: height (10 cm), silhouette and kit:
- Wren: square goggle and a close hood; a plate carrier; a compact, upright stance.
- Moth: round lenses; a chest rig plus harness; rolled sleeves; a lean, loose stance (gait differences per 5.12.2.8,
  within fairness).

---

## 5. Kit lists (drive the logical-detail rule; concepts vary the details, not the logic)

Notation: item - where - what it holds or does - how it attaches.

### 5.1 WREN (lead)

**Head**
- Fitted balaclava - head and neck - covers skin; one eye port sealed by the goggle eyecups - worn under everything.
- Close-fitting hood - over the balaclava - part of the soft-shell top; rear shock-cord volume adjuster with a cord lock.
- Head harness - over the hood - carries the mount and battery - crown strap, two side straps, rear cradle, chin strap
  with a side-release buckle.
- Flip mount - front plate - holds the goggle up or down - bolted to the harness front plate; fore-aft and height knobs.
- Square goggle housing (green) - on the mount - one square shroud over two optics, rubber eyecups - dovetail into the
  mount.
- Battery pack - rear cradle - powers the goggle; counterweight - hook-and-loop to the cradle plus a retention strap.
- Goggle cable - pack to mount over the crown - power - two clips on the crown strap, strain relief boots at both ends.
- Earpiece - left ear under the hood - radio audio - cable from the PTT up the neck under the balaclava edge.

**Torso**
- Combat shirt - knit torso, ripstop raglan sleeves - elbow pad pockets with pads, upper-arm pockets with flaps (one
  holds a marker light, one a spare battery for the goggle).
- Soft-shell top (concept option) - over the shirt, hood attached.
- Low-profile plate carrier - slim front and back plates, padded shoulder straps, elastic cummerbund closing under a
  front flap.
- Three rifle magazine pouches - front of the carrier - one magazine each - woven into the webbing; shock-cord
  retention with pull tabs.
- Admin pouch - above the magazine pouches - notebook, marker, multitool, small white/IR light - zip with a pull loop.
- Radio pouch and radio - left side of the cummerbund - the team radio - woven in; antenna bent down and held by an
  elastic loop.
- Radio cable - radio up the left shoulder strap - three elastic loops - to the PTT on the left strap at the
  collarbone.
- PTT button - left shoulder strap - transmits - strap mount; then the earpiece cable up the neck.
- Medical pouch - right side of the cummerbund - the medkit - pull tab, quiet buckle.
- Back panel - back plate bag - rifle retention: moulded butt cup at the bottom, bungee loop with a pull tab at the top;
  drag handle at the top edge.
- Shoulder reinforcement - right shoulder of the shirt - rifle butt patch.

**Belt**
- Inner and outer belt - waist - two-part metal quick-release buckle.
- Three grenade pouches - front left of the belt - one grenade each (`GRENADE_POUCHES`) - flap with a quiet snap.
- Pistol magazine pouch - front right of the belt - two magazines - shock-cord retention.
- Dump pouch - rear right - empty magazines - rolled, held by elastic.
- Knife sheath - rear centre, horizontal - the knife (Phase 6 verb) - two belt straps.
- Drop-leg hanger - right side - carries the holster platform - belt loop plus a short adjustable strap.

**Legs**
- Soft-shell trousers - articulated knees, crotch gusset, reinforced seat, internal knee pads.
- Cargo pockets - both thighs, angled - map card (left), spare gloves (right) - flap with a quiet closure; drain
  grommet at the bottom.
- Thigh holster - right thigh - the pistol (suppressed: open muzzle) - drop-leg platform; two leg straps with elastic
  sections and side-release buckles; retention hood.
- SMG sling (only when an SMG is in the loadout) - left hip (`sling` slot) - clipped to the belt on a quick-detach
  swivel.

**Hands and feet**
- Gloves - leather palm, stretch back, reinforced trigger finger, wrist tab.
- Mid boots - suede and nylon, toe rand, speed hooks, lace garage, quiet lug sole.

**Wear:** a scuffed carrier bottom edge; polished glove palms and trigger finger; worn webbing tails; tape on the
mount knob; dust in the boot lugs and trouser cuffs; an abraded rifle-butt patch.

### 5.2 MOTH (climber)

**Head**
- Fitted balaclava - as Wren.
- Hood - over the balaclava - part of a lighter knit top, a looser fit than Wren's; drawcord at the face opening.
- Head harness - over the hood - as Wren, slimmer straps.
- Flip mount - as Wren, our own different shape.
- Round twin-lens goggles (amber) - on the mount - two round barrels, joined by a bridge with an interpupillary
  slide; rubber eyecups.
- Battery pack and cable - as Wren; the cable routed on the right.
- Earpiece - right ear - from a PTT on the chest rig.

**Torso and arms**
- Combat shirt with outer sleeves rolled to just below the elbow - the roll is three or four bands held by a sleeve
  tab and button. Under D4 a fitted long-sleeve knit base layer covers the forearms below the roll: no skin.
- Chest rig (H-harness) - front panel with two rifle magazine pouches, the radio pouch on the left, an admin pouch on
  top; side strap round the ribs with a side-release buckle.
- Back of the H-harness - a slim back panel - the rifle retention (butt cup and bungee) on the harness's crossing
  point. (A dedicated panel gives the gun two anchors without a plate carrier.)
- Radio cable - radio up the left H-strap to a PTT on the chest - two elastic loops; earpiece cable up the neck.
- Medical pouch - left side of the harness waist belt.

**Climbing**
- Sit harness - padded waist belt (the "belt" for Moth: no duty belt), leg loops, belay loop, four gear loops, haul
  loop.
- Locking carabiner with a plate descender - belay loop - the rappel.
- Three snap-gate carabiners - front gear loops - for anchors.
- Sewn sling - over the left shoulder, across to the right hip - an anchor sling; ends clipped to a gear loop.
- Friction-hitch cord - on a gear loop - rappel backup.
- Rope bag - right hip, on the haul loop and a gear loop - the rappel rope.
- Chalk bag - rear, on the haul loop - chalk (a steeplejack's habit; it explains the dusty gloves).
- Three grenade pouches - front left of the harness waist belt, threaded on.
- Drop-leg hanger - round the harness waist belt, right side.

**Legs**
- Stretch climbing-style trousers - articulated knees, gusset, reinforced knees and seat, thin external knee pads on
  elastic straps.
- One cargo pocket - left thigh - map card - zip.
- Thigh holster - right - as Wren, the leg straps sitting below the harness leg loop.

**Hands and feet**
- Gloves - a thicker leather palm with a rope-wear patch on the brake (right) hand; stretch back.
- Approach boots - lower cut, a sticky rubber rand up the toe for climbing, flat toe edge, speed hooks.

**Wear:** an abraded belay loop; chalk dust on the gloves, sleeves and thighs; a carabiner gate with worn anodising;
tape on the rope bag's buckle and a goggle barrel; scuffed knee pads; rubbed boot rands.

---

## 6. The technique decision

### 6.1 Why the current way cannot reach D1 and D2

- Today's operator is instanced primitives (spheres, pills, rounded boxes) from `smoothMeshes.ts`, voxelised at 2 cm
  on desktop.
- The `character-model` branch blended primitives with a smooth minimum into a 2 cm distance field and meshed it.
  It gave one smooth skin, but:
  - features finer than the voxel aliased, so it drew colour regions instead of shapes;
  - it had no texture maps and no folds, seams or straps.
- At 0.3 m a 2 cm voxel is about 30 pixels wide at 4K: every surface reads as built from blocks or blobs. More
  primitives cannot fix it. Real detail needs:
  - a mesh shaped like a garment;
  - UVs and baked maps (normal, AO, roughness) at millimetre scale;
  - smooth skinning.

### 6.2 Options compared

| | (a) Code-generated in TS (SDF / lofts, baked at build time) | (b) Scripted Blender pipeline in the repo | (c) CC0 base meshes or scans, kitted | (d1) Hybrid: (b) on a CC0 base body | (d2) AI text-to-3D | (d3) Bought or hand-sculpted art |
| --- | --- | --- | --- | --- | --- | --- |
| Realism ceiling at 0.3 m | Medium: forms read as procedural; folds must be faked with noise; no real drape | High: real sewn panels draped by cloth simulation, bevelled hard kit, Cycles-baked maps | Body high; kit low (little CC0 tactical kit of quality, scans copy real products) | **Highest of the allowed ones** | Low-medium: muddy detail, messy topology, not repeatable | Highest |
| Pipeline | Write our own UV unwrapper, high-to-low baker, cloth/wrinkle solver: months of tool work | Python (`bpy`) scripts run headless: generate, simulate, bake, export glTF; deterministic seeds | Import, fit, modify; manual cleanup | As (b), the body from a CC0 parametric human | Prompt and pray | An artist |
| Files | Generated at build time: none committed, slow builds | Committed glTF (.glb) + KTX2 textures | As (b) | As (b) | As (b) | As (b) |
| Phone impact | Same final assets as (b) | Lowest LOD + small textures; never downloads hero | As (b) | As (b) | As (b) | As (b) |
| Skinning to our skeleton | We write weights ourselves | Skinned to the game's joint names in Blender, exported with the skin | Needs re-rigging | Base body already has weights; we retarget to our joints | Needs rigging | Rigged by the artist |
| Licence risk | None | None: generated output is ours (Blender's GPL covers Blender, not what it makes) | Medium: provenance of scans, real-product likeness | Low: CC0 body (MakeHuman / MPFB assets are CC0), our scripts | High: unclear training data and output rights | Rule break (not original / not CC0) |
| Effort | Very high | High, but tooling exists | Medium plus cleanup | High | Low, but fails D1 | Out of scope |
| Fits the rules | Yes as is | Needs the rule change below | Needs a rule change | Needs the rule change below | No | No |

### 6.3 Recommendation: (d1) the scripted Blender pipeline on a CC0 base body

**Body.** A parametric CC0 human (the MakeHuman / MPFB base mesh), shaped by script to the shared skeleton's joints
and the operator's build (Section 4). It is only the form the clothes drape on; D4 hides it completely.

**Garments are sewn, not sculpted.**
- Each garment is a set of 2D pattern panels written as data (sleeve, yoke, front, back, gusset, knee dart ...) with
  seam pairs.
- Blender's cloth simulation sews them round the body in the bind pose and settles them under gravity and under the
  straps.
- Seams land where real garments have panels; folds come from physics, not noise. That is the Construction and
  Physical rules by method.

**Kit is parametric hard modelling.**
- Buckles, holster shell, mount, goggle housings, radio, carabiners and descender are generated by Python with
  bevels and booleans from dimensioned parameters.
- Straps and cables are swept profiles along paths that start and end at named anchor points on the body or on other
  kit, pulled taut (or given slack) by a tension value.

**The kit list is data.**
- A JSON or TS kit file lists every item with its anchors, contents, closure and route.
- A pure Babylon-free module validates it in Vitest:
  - every strap has two anchors;
  - every pouch names its contents;
  - every cable has a source, a device and retention points no more than 15 cm apart;
  - no item lacks a job.
- The logical rule becomes a test.

**Maps.**
- Procedural material shaders (ripstop grid, knit, webbing weave, leather grain, stitch lines along every seam
  curve, bar tacks, anodised wear on edges by curvature, dust by cavity) are baked to texture sets: albedo,
  normal, packed occlusion/roughness/metal.
- Hero detail from the simulated high mesh is baked into the normal maps of each in-game LOD.
- CC0 textures (5.16) only where a scan beats a shader (leather grain, suede).

**LODs.**
- Hero: the full mesh.
- In-game LOD0-2 and phone: the same generators at lower resolution plus decimation, the same silhouette, maps baked
  from the hero.
- Every LOD is skinned to the game's joints (pelvis, spine, chest, neck, head, shoulders, elbows, wrists, hips,
  knees, ankles). The hero adds visual-only finger and toe bones (posed by grip presets: no gameplay).

**Output.** `.glb` per operator per LOD and KTX2 textures (Basis compressed: BC7 on desktop, ASTC on the phone) under
a bundled asset folder. Loaded by platform: phones load only the phone LOD.

**Reproducible.**
- `npm run operators:build` runs Blender headless (pinned version) on the scripts.
- Fixed seeds; the same inputs give the same files.
- Every external input is in `docs/art-credits.md`. Nothing is hand-made.

**Runtime.**
- A Babylon `Skeleton` whose bones are linked to the rig's existing TransformNodes (`Bone.linkTransformNode`), so
  `CharacterRig` stays the authority over the pose.
- GPU skinning, 4 influences.
- Characters with these meshes are not voxelised (the voxel body would erase the detail).

**Why not (a).**
- It reaches the same files only after we build our own unwrapper, baker and cloth solver.
- Even then its folds are invented, not simulated, which is exactly the "code-built" look D1 rejects.

**Limits, stated plainly.**
- Folds are simulated once, in the bind pose, and then deform with the skin like most shipped games.
- At the elbows, knees and shoulders the hero LOD blends corrective wrinkle maps by joint angle so folds respond to
  bending.
- No runtime cloth simulation.
- With no human sculptor in the loop the result relies on construction accuracy and material work rather than
  hand-sculpted storytelling. That is where the reference study (Section 3) and the detail standard carry the weight.

**Needs on the PC.**
- Blender (the current LTS, version pinned in the pipeline) is not installed today.
- The basisu / toktx encoder for KTX2 (a dev tool, offline).

### 6.4 Cost estimates per operator (to be measured in Stage 2)

| LOD | Used for | Triangles | Draws (materials) | Textures (desktop) | Textures (phone) | Skinning |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | Menus, close cameras (1-2 on screen) | 150-250 k | 4 (cloth, kit, head, hardware + glow) | 4K cloth set, 2K x 3 kit sets: ~30-40 MB disk, ~90 MB VRAM | Never downloaded | ~30 bones (game joints + fingers, toes) |
| LOD0 | Gameplay < 8 m, desktop | 35-45 k | 2-3 | 2K sets, ~8 MB | - | 17 game joints |
| LOD1 | 8-25 m | 12-15 k | 2 | shares LOD0's | - | 17 |
| LOD2 | > 25 m; the phone in game and in the menu | 4-6 k | 1 (+ glow) | 1K atlas, ~1.5 MB | 512-1K atlas, ~1 MB | 17 |

**Against the budgets:**
- Four operators at LOD0 cost about 180 k triangles and 12 draws, plus shadow passes.
- That is inside the desktop 8 M triangles and 600 draws, and below today's voxel bodies (two draws per character
  plus shadows).
- Skinning is on the GPU. The CPU cost is about 17-30 bone matrices per character per frame, inside the 0.04 ms
  animation budget (to be measured).

---

## 7. Draft rule changes (for Michael's approval; applied only after "yes")

**Bible 5.14, first bullet.** Replace "**Code-built,** like every character. They differ in head, headgear, kit,
goggle shape and goggle light colour." with:

> - **Generated, not hand-made (Michael, 2026-10-15).** The operators are built offline by the scripted operator
>   pipeline in the repo (Blender run headless from Python scripts), on a CC0 base human body, and bundled as skinned
>   glTF meshes with baked texture maps. Nothing is hand-made or bought; every mesh and map is reproducible from the
>   scripts. The bar is a modern AAA stealth character up close (0.3-1 m at 1440p and 4K), held to the detail standard
>   in `docs/operators/SPEC.md`. Hero LOD for menus and close cameras; in-game LODs keep the silhouette with the detail
>   in texture maps; phones get the lowest LOD and never download hero assets. Splinter Cell inspired in feel, original
>   in every shape. They differ in head, headgear, kit, goggle shape and goggle light colour.

**Bible 5.16.**
- Replace "Geometry, characters and animation stay code-built (5.12)." with:

  > - Geometry and animation stay code-built (5.12). Operators come from the scripted operator pipeline (5.14); guards
  >   and other characters stay code-built until Michael decides otherwise.

- In "Pillars of the look", item 4, replace "detailed code-built silhouettes: fabric folds, straps, pouches, harnesses,
  kit detail" with:

  > sewn garment panels with simulated folds and seams, straps under tension, hard kit with real material response
  > (5.14)

**Bible Section 6, "Never".** Replace "External art files, except CC0 textures for desktop detail (5.16)." with:

> - External art files, except CC0 textures for desktop detail (5.16) and the CC0 base human body the operator
>   pipeline builds on (5.14). Assets generated offline by scripts in the repo are not external art; they are bundled
>   like code.

**CLAUDE.md, hard rules.** Replace "No external art or audio, except CC0 textures for desktop detail (bible 5.16)."
with:

> - No external art or audio, except CC0 textures for desktop detail (bible 5.16) and the CC0 base body of the operator
>   pipeline (bible 5.14). Operator meshes and maps are generated offline by in-repo scripts (Blender, headless) and
>   bundled; phones never download hero assets.

**Fairness (follows from D10 and D11; applied with the rest).**

- **Bible 5.14.** Replace "**Fairness:** identical skeleton, capsule, speeds, hit volumes and light sample heights.
  Visible build differences stay within a few percent." with:

  > - **Size (Michael, 2026-10-15: realism over fairness; the game is mostly co-op).** Each operator has a realistic
  >   height and build (Wren about 1.68 m, Moth about 1.78 m). Their skeleton, hit volumes and light sample heights
  >   follow their own body. The capsule, speeds, camera rules and every traversal move stay identical for all
  >   operators, so maps and routes work the same for everyone.

- **Bible 5.15 "Fairness".** Add:

  > - Operators differ in height (5.14): hit volumes and light samples follow each body. Accepted for the
  >   Confrontation.

- **story.md Section 4.** Replace "Every operator has identical stats and hitboxes (bible 5.14)." with:

  > Every operator has identical stats; each is their own real size (bible 5.14).

The version line goes to 1.15 with a summary of these changes.

---

## 8. Risks to carry into Stage 2 and integration

- **Rig.**
  - No clavicle, one spine joint plus the chest, no fingers or toes.
  - Shoulder shrugs and deep reaches stretch the carrier's shoulder straps; this needs a corrective weight pass and
    the hero finger bones.
  - The rig changes wait for the locomotion merge (Section 4.3).
- **Clipping (5.12.2.3).** To be checked in the Lab's poses:
  - goggle housing vs the rifle's cheek weld when aiming (the rig sets the gun beside the head: `SIGHT_RAISE`);
  - mag pouches vs forearms at full aim;
  - the holster vs the thigh in a deep crouch;
  - the harness leg loops at hip flexion;
  - back-carried guns vs the head when looking up;
  - the rope bag vs the right hand's holster draw (Moth).
- **Voxel world vs smooth characters.**
  - The levels render as 5 cm voxels; detailed meshes will stand out from them.
  - Guards stay as today until a later decision.
  - The Hollowmere night renders in Stage 2 will show whether the mix reads well.
- **Menu spec.** The menu redesign (`feature/menu-ui-spec`) frames the operator medium or wide because "the model is
  low detail". Once the operators pass, closer shots become possible; that is the menu run's call.
- **Repo size.** Only approved outputs are committed. Mockup renders are WebP at sensible sizes.
- **The phone (D9).** The phone gets LOD2 in game and in the menu, never hero assets; no fps gate (bible 1.14).
- **Different heights (D10, D11).**
  - Paired moves (takedowns, team moves, carry, drag) must align hands within 3 cm for a 1.68 m and a 1.78 m
    operator (5.12.2.11).
  - Guards use `proportions.ts` too; changing the base ratios (A1-A4) moves them as well. Check at integration.

---

## 9. Sources read in full for Stage 1

- `CLAUDE.md` (branch `ct-movement`).
- `docs/design-bible.md`:
  - Sections 0-3, 5.1 (L1-L14 including L7 and L11), 5.12 / 5.12.2, 5.14, 5.16, 6, 8, 9;
  - Section 5.17 on `feature/ct-locomotion` by grep.
- `docs/story.md` Section 4.
- `docs/systems/world-and-characters.md` "Characters", `docs/systems/ui.md`, `docs/systems/performance.md`,
  `docs/systems/graphics-quality.md`.
- `src/player/proportions.ts`, `src/world/smoothMeshes.ts`, `src/world/partLibrary.ts`, `src/world/menuScene.ts`,
  `src/weapons/carrySlots.ts`.
- `src/player/characterRig.ts`: the operator torso, the `trilens` helmet, lens glow (lines 120-140, 600-860) and the
  joint list.
- `origin/character-model`: `--stat`, `src/cosmetics/shadeOperative.ts`, `src/voxel/voxelModelBuilder.ts`.
- `scripts/rig-shot.mjs`, `scripts/e2e-lib.mjs`.
- `feature/menu-ui-spec` `docs/menu-ui/SPEC.md` by grep (operator framing).
- The ANSUR II project page (openlab.psu.edu/ansur2); its summary report PDF could not be text-extracted here.
