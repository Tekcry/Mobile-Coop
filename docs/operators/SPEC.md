# Operators WREN and MOTH - specification (Stage 1 draft)

Status: Stage 1 done and answered (D7-D11). Stage 3 replaces this with the final character detail sheet.
Decisions: `DECISIONS.md` (D1-D11 Michael; S1-S2 setup). Sources read: Section 9.
**Wren re-planned (D22-D24, 2026-10-16):** Wren is the A2 stealth operative (`docs/operators/concepts/A2/A2.md`,
ART-DIRECTION Section 9): one-piece suit, composite plates, slimline storage mapped to the game loadout, no rifle or
pistol modelled. Sections 3.1-3.5 mark what is Wren's and what is now Moth's or history; 5.1 is rewritten. Moth's
sections (3.4, 5.2) are unchanged until step 12, which starts by asking Michael Moth's direction (D24: "Decide at
step 12").

---

## 1. The detail standard (Michael, 2026-10-15; every render is checked against it)

The look itself (identity, silhouette, layers, colour, materials, the combat shirt, what to avoid) is in
`ART-DIRECTION.md`; every render is checked against both. Conflicts between the two: `DECISIONS.md` D13.

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
- **The head is the signature.** A covered head under a hood with goggles on a band, the lenses glowing in the dark.
- **Purposeful kit only.** A thigh holster, a back-carried long gun, a few pouches; everything has a job.

What we never take: the reference's three-lens goggle, its suit's panel layout and patterning, any emblem, name or
logo, its exact harness design, or any real product's shape.

Our signatures: Wren's square single-shroud goggle housing (green), Moth's round twin lenses on short barrels (amber),
Moth's climbing harness and rolled sleeves. Wren's bonded one-piece suit and her composite chest plate with three rib
segments (D22-D24).

---

## 3. Reference study: modern covert night-operations clothing and kit (own words)

### 3.1 Garments

**Stealth suit (Wren, D22-D24; ART-DIRECTION 9).**
- A one-piece suit in a bonded stretch soft-shell, fitted like a wetsuit: it is under tension everywhere, so it shows
  tension lines and compression under straps, not slack folds.
- Panels where the body bends or wears: shoulder yokes, side panels, sleeves, knees, seat. Seams are bonded and sealed
  with a narrow tonal tape; no stitching shows.
- Zones: rubberised micro-pebble grip on the forearms and knees; a denser abrasion weave at the shoulder yokes, elbows
  and seat; stretch knit at the inner elbows and rear shoulders; laser-perforated vents (1.4 mm holes, 3.2 mm pitch)
  at the underarm side panels and the backs of the knees.
- The main shell carries a fine tonal diamond micro-emboss (about 1.6 mm) visible only up close.
- A diagonal chest zip from the left of the collar down to the right ribs, with a zip garage at the collar; a close
  mock neck; thumb loops under the glove cuffs; bonded ankle cuffs worn inside the boot collars.
- Under a chest plate the bust is held by the suit as one smooth form (a compression garment), with no anatomical
  detail.

**Combat shirt** (Moth until step 12; Wren: the stealth suit) (worn under a carrier or harness).
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

**Trousers** (Moth until step 12; Wren: the stealth suit).
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

**Approach boots (Wren, D23 "Lighter approach boots").**
- An approach-shoe last: low volume, a slight toe spring, a close heel.
- A sticky rubber rand round the sole that rises over the toe box (toe jams and edging); a flat edging zone under the
  toes; low lugs (about 3 mm) with a heel brake; a firm, thin midsole.
- A padded collar about 12-13 cm high, a heel pull loop, lacing that runs close to the toe with low eyelets.
- Wear: the rand scuffed at the toe, dust in the lugs, a flex crease across the forefoot.

**Boots** (Moth until step 12; Wren: the approach boots above).
- Mid-height and light: suede and nylon upper, a rubber rand round the toe, a heel counter.
- Laced through eyelets, then speed hooks at the top; a lace garage pocket on the tongue.
- A quiet low-profile lug sole with a heel brake; a heel pull loop.
- Wear: scuffed toe rand, dust packed in the lugs, a crease across the forefoot where it flexes.

### 3.2 Load bearing

**Composite plates and harness (Wren, D22-D24).**
- A contoured composite chest plate with a neck scoop, and three overlapping rib segments below it on an internal
  elastic web, each lapping the one below so the torso can bend and reach without a gap opening.
- A slim back plate ending at the ribs, with a recess for the radio (upper left) and the weapon mount point (below).
- Matte resin with a faint fibre texture; chamfered edges with a rubber trim; one corner-radius family. The plates are
  moulded to the torso, so they follow it rather than bridging it like a flat slab.
- Slim shoulder straps (plate top to plate top) and 22 mm side straps under the arms (plate side to plate side).
- Every closure is a flush gunmetal magnetic quick-release: two halves with a split line on a rubber-edged base. No
  hook-and-loop, no ladder locks or side-release buckles, nothing that rattles.

**Weapon mount point (Wren, D24, A36).** No gun is modelled. The back plate carries a flush gunmetal receiver where
the game's back carry slots attach the long gun (`carrySlots.ts` / `weaponModel.ts`: upright, muzzle up; backC on the
spine, backL / backR at 7 cm either side splayed 0.08 rad). The back of the torso inside that lane stays flat (A39).

**Wren's belt and leg kit (D22-D24).** A slim laminate waist belt with a flush magnetic front closure; one flush
rappel ring in a low tunnel at the back centre (no sit harness, leg loops or gear loops). The empty thigh holster
(right) and the throwable sleeve panel (left) each hang from the belt on a short hanger and sit on two elastic leg
bands with magnetic buckles.

**Low-profile plate carrier** (Moth / history for Wren).
- Front and back plate bags (slim plates or soft panels), joined by padded shoulder straps and an elastic cummerbund.
- The cummerbund closes at the front under a flap with hook-and-loop; the shoulder straps adjust by a buckle or a
  webbing tail under a cover.
- The outer faces carry a grid of webbing loops: rows of 25 mm webbing stitched down every 38 mm, so pouches weave
  through. (A generic construction standard, not a brand.)
- A drag handle at the top of the back. The top of the front plate sits at the base of the throat.

**Chest rig.** An H- or X-shaped harness over the shoulders carrying a front panel of pouches, closed round the ribs
by a side strap. Lighter than a carrier, it leaves the ribs and back free (a climber's choice).

**Belts** (Moth / history for Wren). Two layers: a soft inner belt through the trouser loops, the stiff outer belt hook-and-loop to it. A
two-part metal quick-release buckle with a sprung latch closes it (our own shape). The outer belt carries the holster
hanger, grenade pouches, a dump pouch and a knife sheath.

**Thigh holster.** (Wren: built empty, shaped for the game's sidearm, on leg bands with magnetic buckles; A40.) A
rigid moulded polymer holster on a drop-leg platform, hung from the belt by a short strap (so the
grip sits at the relaxed hand's height), held to the thigh by two leg straps with elastic sections and side-release
polymer buckles. A retention hood or lever over the pistol. An open muzzle end for a suppressed pistol.

**Back long-gun carry** (`carrySlots.ts`: long guns vertical on the back, muzzle up, splayed a little from the spine;
Wren: the weapon mount point above, nothing below modelled).
- Real equivalent: a retention on the back panel.
- A moulded butt cup at the bottom of the back plate bag holds the stock.
- A bungee loop with a pull tab round the handguard at the top holds the gun.
- The swap animation's reach over the shoulder pulls the tab; the gun lifts out of the cup.
- The gun's sling stays clipped to the gun, folded and held by an elastic keeper.

**Pouches.**
- Rifle magazine pouches: open top with a shock-cord retention loop and a pull tab (quiet, fast).
- Pistol magazine pouches: the same, smaller.
- Radio pouch: open top with an adjustable strap and a hole for the antenna; cable exits at the top. (Wren: the radio
  sits in a recess in the back plate.)
- Admin pouch: a zipped flat pouch on the chest (notebook, marker, multitool, light).
- Medical pouch: a pull-out tab and a quiet buckle (it holds the medkit the game uses).
- Grenade pouches: a flap over each, held by a quiet snap.
- Dump pouch: rolled and held by elastic until it is needed.
- Weight shows: full pouches pull their bottom edge out and down; the webbing above them stretches taut.
- Wren's pouches (D23): slim moulded or laminate shells, open-top with shock cord and pull tabs, or flaps with a
  magnetic tab; no hook-and-loop; nothing more than about 2.5 cm proud (magazine pouches about 4 cm).

### 3.3 Head: harness, goggles, comms

**Head harness (D20, split crown).** Without a helmet, the goggles and battery ride on a harness: a hard polymer brow
plate on the forehead, two 18 mm crown straps forking from the plate over the top of the head to a hard, sculpted rear
battery pod (no soft cradle), two side straps above the ears (plate to pod) set by low-profile cam buckles, and a chin
strap under the chin. Worn over the hood, its straps compress the hood fabric (visible dents and pulled folds).

**Goggle band and positions (D19, D20; no flip mount).**
- A wide elastic band through a lug on each side of the goggle housing runs round the back of the head over the
  harness (through a channel under the pod) and carries the goggle's power line (A29).
- Two worn positions: in use, pulled down over the eyes, the eyecups sealing on the eye port; stowed, slid up onto the
  brow over the hood, above the eye port. No flip arm, pivot or detent.

**Goggle housings.**
- A housing holds optics and a display behind each lens; a soft rubber eyecup seals against the face.
- Lens coatings show a coloured reflection at an angle.
- Our glow is the display leaking through the lens: emissive, visual only (5.14).

**Battery pod.** The harness's hard rear pod is the battery and the counterweight. Its cable runs from an outlet on the
pod along the goggle band's outer face, held by webbing keepers, to the left lug; strain relief at both ends.

**Comms.**
- Radio in a pouch (chest left, or the left side of the carrier). Wren: set into a recess in the back plate's upper
  left; its cable runs over the left shoulder along the strap edge to the PTT at the left collarbone.
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
- Wren's suit is under tension, so it does not fold at the waist or knee in the bind pose: straps, bands and the belt
  dent it, and it shows short tension lines where a strap pulls it.

---

## 4. Anthropometry and the shared skeleton

### 4.1 The rule (D10, D11 override D3's identical skeleton)

**Each operator has their own height.**
- Wren 1.68 m: a tallish woman, the 79th percentile of ANSUR II women; compact in build.
- Moth 1.78 m: a little above the average man (63rd percentile); lean.

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
- Light: Wren's head sample sits about 9 cm lower than Moth's (1.571 m against 1.664 m in the step 2 export), so she is slightly harder to see over low cover and
  in a low lamp pool.
- Hit volumes: shots that clear Wren's head can hit Moth's.
- Mission 8 (the Confrontation, the only versus content) inherits both effects. Michael accepted this ("realism over
  fairness; the game is mostly co-op").
- Traversal: hands reach the same anchors from the same capsule. The visible body's root offset and IK must take up
  the 10 cm height difference:
  - hangs: a shorter operator hangs with more arm extension, within the 5.12.2 ROM limits;
  - ladders and vaults: the step and hand timing come from the shared move.
- These are verified per operator in the Lab's poses (Stage 2) and in `e2e-traverse` at integration.

### 4.2 Check against real data (verified against ANSUR II, 2026-10-15)

Source: the ANSUR II public CSVs (US Army anthropometric survey 2012; 4,082 men, mean stature 1.756 m; 1,986 women,
mean 1.629 m), downloaded from openlab.psu.edu/ansur2 with Michael's approval and kept out of the repo. Each value is
the mean of every subject's landmark divided by their stature, scaled to 1.75 m. The survey is military: its waist and
chest means include heavier soldiers, so fit operators sit a little below them.

Joint centres are not surface landmarks. The offsets used: the shoulder joint sits about 3.5 cm below the acromion and
about 1.5-2 cm inside it; the elbow axis is at the radiale; the wrist joint at the stylion; the hip joint at the
trochanterion; the knee axis at the lateral femoral epicondyle; the ankle at the lateral malleolus.

| Landmark at 1.75 m | proportions.ts | ANSUR II, men | ANSUR II, women (scaled) | Verdict |
| --- | --- | --- | --- | --- |
| Head length / breadth | 0.19 / 0.158 | 0.199 / 0.154 | 0.204 / 0.159 | Length **1 cm short** (A5) |
| Head height (vertex to chin) | 0.229 (7.6 heads) | not in the public CSVs | - | Kept (the 7.5-head canon) |
| Neck base (joint) | 1.48 | cervicale 1.512 | 1.500 | Good (the joint sits ~3 cm below cervicale) |
| Acromion | - | 1.435 | 1.435 | proportions.ts puts the **joint** at the acromion |
| Shoulder joint | 1.435 | ~1.40 | ~1.40 | **3.5 cm high** (A1) |
| Upper arm (joint to elbow) | 0.30 | acromion-radiale 0.334, joint ~0.30 | 0.334, ~0.30 | Good |
| Forearm (elbow to wrist) | 0.26 | radiale-stylion 0.267 | 0.259 | Good |
| Hand length | 0.17 | 0.193 | 0.195 | **2 cm short** (A3) |
| Elbow axis to fingertip | 0.43 | forearm-hand 0.479 less ~2 cm olecranon = ~0.46 | ~0.45 | Short by the hand (A3) |
| Fingertip height, arms hanging | 0.705 | ~0.64 (from the landmarks) | ~0.65 | **6 cm high**: shoulder high and hand short (A1, A3) |
| Hip joint | 0.915 | trochanterion 0.897 | 0.908 | Good |
| Knee joint | 0.50 (the rig's leg chain puts it at 0.47) | epicondyle 0.490 | 0.501 | Table good; **chain 2.5 cm low** (A7) |
| Ankle joint | 0.075 (straight-leg chain: 0.045) | malleolus 0.073 | 0.067 | Table good; chain long (A7) |
| Foot length | 0.27 | 0.270 | 0.265 | Good (boots ~0.29-0.30) |
| Shoulder width (bideltoid) | 0.46 | 0.509 | 0.484 | **3-5 cm narrow** (A6) |
| Shoulder joint half-spacing | 0.175 | biacromial / 2 = 0.207, joint ~0.19 | 0.197, ~0.18 | Narrow, follows A6 |
| Hip breadth | pelvis 0.31 | 0.345 | 0.380 | **Narrow** (A4, visual only) |
| Waist w x d | 0.28 x 0.185 | 0.325 x 0.237 | 0.322 x 0.229 | **Thin** (A4, visual only) |
| Chest w x d | 0.34 x 0.22 | 0.289 x 0.253 | 0.290 x 0.266 | Width is the arm-to-arm hit span, not chest breadth; depth **thin** (A4) |

The Stage 1 guess "arms 4 cm short" was wrong: the arm segments are right; the shoulder joint is too high and the hand
too short. A2 (upper arm 0.31) is withdrawn.

Heights: Moth 1.78 m is the 63rd percentile of the survey's men; Wren 1.68 m the 79th percentile of its women.

### 4.3 Proposed corrections to the base proportions (applied at integration, after the locomotion merge)

These fix the base ratios that every height scales from, so they apply to both operators (and to guards, which share
`proportions.ts`). The lengths below are at 1.75 m; each operator's height scales them. The step 2 joint export
(`scripts/operators/export-joints.mjs`, through `src/operators/operatorBody.ts`) already applies them for the pipeline; `proportions.ts` is unchanged.

| # | Change | Why (ANSUR II) | Gameplay effect |
| --- | --- | --- | --- |
| A1 | Shoulder joint y 1.435 -> 1.40 | The acromion is at 1.435 in both sexes; the joint centre sits ~3.5 cm below it | Body hit capsule top (`hitVolumes.bodyY1`) 3.5 cm lower; the aim pocket and grip IK 3.5 cm lower; hand reach 3.5 cm lower: ladder, pipe and ledge contact bars re-run (`e2e-traverse`); the camera follows the head: none expected (to verify) |
| A2 | Withdrawn | Upper arm 0.30 matches (acromion-radiale 0.334 less the A1 offset) | - |
| A3 | Hand length 0.17 -> 0.19 | 0.193 men, 0.195 women | Fingertips 2 cm further; grip offsets (`WRIST_TRIGGER`, `WRIST_SUPPORT`) retuned, weapon hold bars re-run |
| A4 | Pelvis width 0.31 -> 0.35, waist 0.28 x 0.185 -> 0.30 x 0.215, chest depth 0.22 -> 0.24 | Real body mass for draping clothes; fit operators a little below the survey means | `bodyDepthHalf` +1 cm (cover standoff uses the broad build: re-check `COVER_STANDOFF`); otherwise visual only |
| A5 | Head depth 0.19 -> 0.20 | 0.199 men, 0.204 women | Head hit sphere radius +6 mm |
| A6 | Shoulder width 0.46 -> 0.49 | Bideltoid 0.509 men, 0.484 women; joint half-spacing 0.175 -> 0.19 matches biacromial | Shoulder joints 1.5 cm wider each side: aim pocket and grip IK; body hit radius unchanged (it comes from chest width) |
| A7 | Thigh 0.415 -> 0.39 | The rig hangs the knee from the hip joint at `y.hip - 0.03` = 0.885: 0.885 - 0.415 puts the knee axis at 0.47 (epicondyle 0.490 men, 0.501 women) and the straight-leg ankle at 0.045 (malleolus 0.07). With 0.39 the straight leg lands on `y.knee` and `y.ankle` | Legs 2.5 cm shorter: the standing stance today relies on the extra length (leg IK `legLen * 0.97` bends the knees slightly at rest). The locomotion run's foot planner and leg IK own this: re-tune the rest bend or the pelvis height at integration; `e2e-move`, `e2e-traverse` and the anim sheets re-run |

Each operator's hit volumes come from that operator's proportions (height and build), never from the mesh, so they
stay simple capsules and a head sphere. The controller capsule is `MOVEMENT.radius`, shared, and never follows
`proportions.capsuleRadius`.

### 4.4 Builds

Height carries most of the difference (D10, D11). Build mods are relative to the corrected base (A4, A6), which sits
near the survey's men; ANSUR II women at the same stature have 0.95 the shoulder width, 1.05 the chest depth, 0.97
the waist and 1.10 the hip breadth of the men. The mods stay modest so the two still read as fit operators of the same
team:

| | Shoulders | Chest | Waist | Hips | Girth (limbs) |
| --- | --- | --- | --- | --- | --- |
| Wren (thirties, compact, ex-military woman) | 0.97 | 1.03 (bust under the chest plate) | 0.96 | 1.08 | 0.98 |
| Moth (twenties, lean, ex-steeplejack man) | 1.03 | 0.98 | 0.96 | 0.97 | 0.96 (long, ropey forearms) |

Changed after the ANSUR II check: Wren's chest 1.00 -> 1.03 and hips 1.04 -> 1.08 (the survey's female ratios, a
little leaner).

What tells them apart: height (10 cm), silhouette and kit:
- Wren: square goggle and a close hood; a one-piece suit with a composite chest plate; a compact, upright stance.
- Moth: round lenses; a chest rig plus harness; rolled sleeves; a lean, loose stance (gait differences per 5.12.2.8,
  within fairness).

---

## 5. Kit lists (drive the logical-detail rule; concepts vary the details, not the logic)

Notation: item - where - what it holds or does - how it attaches.

The lists are data in `src/operators/kit.ts` (`WREN_KIT`, `MOTH_KIT`), checked by `validateKit` in
`tests/operators.test.ts`: every item has a job, every strap two anchors, every pouch its contents and closure, every
cable a source, a device and no free span over 15 cm. Writing them as data added cable fixings this text left open:
- Wren's earpiece cable: a clip on the suit collar, then tucked under the balaclava edge (shirt collar before D22).
- Moth's goggle cable: two clips on the right side strap.
- Moth's earpiece cable: an elastic loop on the right H-strap, a collar clip, then under the balaclava edge.
- Routed lengths (estimates, checked against the base body in step 3): goggle cables 0.40 / 0.42 m, Wren's radio
  cable 0.45 m (three loops), Moth's 0.30 m (two loops), earpiece cables 0.27 / 0.36 m. Wren after D22: radio cable
  about 0.40 m from the back-plate recess over the left shoulder (three keepers), earpiece cable about 0.19-0.22 m
  from the PTT to the left ear; both measured in step 09.

### 5.1 WREN (lead)

**Head**
- Fitted balaclava - head and neck - covers skin; one eye port sealed by the goggle eyecups - worn under everything.
- Close-fitting hood - over the balaclava - a fitted hood whose skirt laps over the suit's mock neck; rear shock-cord
  volume adjuster with a cord lock.
- Head harness (split crown, D20) - over the hood - carries the battery pod, seats the goggle band - hard brow plate,
  two crown straps, two side straps with cam buckles, hard rear battery pod, chin strap with a side-release buckle.
- Goggle band - round the back of the head over the harness - holds the goggle in use (over the eyes) or stowed (on
  the brow), carries the goggle cable - through a lug on each side of the housing (D19, A29).
- Square goggle housing (green) - over the eyes in use, on the brow when stowed - one square shroud over two optics,
  rubber eyecups - the goggle band through its side lugs.
- Battery pod - rear of the harness - powers the goggle; counterweight - the harness's hard shell; screw cap.
- Goggle cable - pod to the left lug along the band - power - webbing keepers on the band, strain relief boots at both
  ends.
- Earpiece - left ear under the hood - radio audio - cable from the PTT at the left collarbone up the left of the neck,
  a clip on the suit collar, then under the balaclava edge (step 09 fixes the route: steps/07-fixes-r4.md).

**Suit (D22-D24, A37)**
- Stealth suit - whole body under the head items, gloves and boots - one-piece bonded soft-shell, no base layer under
  it - diagonal chest zip with a zip garage at the collar, mock neck under the hood skirt, thumb loops under the glove
  cuffs, bonded ankle cuffs inside the boot collars (A38).
- Suit zones - bonded panels with tonal seam tape, no visible stitching - grip (forearms, knees), abrasion (shoulder
  yokes, elbows, seat), stretch (inner elbows, rear shoulders), perforated vents (underarm side panels, backs of the
  knees); the main shell micro-embossed.

**Armour and harness**
- Composite chest plate - chest, its neck scoop clear of the PTT and the earpiece plug - protection; the platform for
  the chest rig - shoulder and side straps.
- Rib segments (three) - below the chest plate, each lapping the one below - protection that bends with the torso - on
  an internal elastic web under the chest plate.
- Back plate - upper back, ending at the ribs - protection; carries the radio recess (upper left) and the weapon mount
  point - shoulder and side straps.
- Shoulder straps (two) - chest plate top to back plate top - carry the plates; the left one carries the radio cable
  keepers and the PTT - magnetic buckle at the front.
- Side straps (two, 22 mm) - under the arms, chest plate side to back plate side - close the plates round the ribs -
  magnetic buckle.
- Magnetic quick-release buckle - every strap closure on Wren - opens with one pull, silent - two flush gunmetal halves
  with a split line on a rubber-edged base.
- Weapon mount point - back plate, on the spine - where the game's back carry slots attach the long gun (backL / backC
  / backR frames, upright, muzzle up; A36, A40) - a flush gunmetal receiver plate; no gun modelled (D24).

**Chest rig (on the chest plate)**
- Rifle magazine pouches (two) - right of centre - one rifle magazine each, tops leaning toward the left hand - open
  top, shock cord with a pull tab.
- Gadget slot - upper right - EMP (one) and noisemakers (two): flat stick-on discs - flap with a magnetic tab.
- Knife - left of centre, handle down - the knife (Phase 6 verb); the right hand draws it across the body, pulling
  down - moulded sheath with a gunmetal release; rubber handle, gunmetal guard and pommel.
- PTT button - left shoulder strap at the collarbone - transmits; the earpiece cable plugs into it - strap mount.

**Comms**
- Team radio - set flush into the back plate's recess, upper left - team comms - held by the recess; a short stub
  antenna along the plate's top edge in a keeper.
- Radio cable - radio over the left shoulder along the strap edge to the PTT - radio to the PTT - three elastic
  keepers (no free span over 15 cm).
- Earpiece cable - see Head (PTT up the left of the neck to the left ear).

**Belt**
- Waist belt - waist - carries the belt kit and the two leg hangers - slim laminate belt, flush magnetic front
  closure.
- Pistol magazine pouch - left front - two pistol magazines - open top, shock cord.
- Cam and mine pouch - left hip - two sticky cams, one prox mine - flat, flap with a magnetic tab.
- Rappel ring - back centre, in a low tunnel on the belt - the rope work Wren needs without a sit harness - one
  gunmetal D folded flat, only its bow showing.
- Sling socket - left hip - the anchor of the game's compact-gun sling slot (A41) - a flush quick-detach socket; no
  sling modelled.
- Drone pod - rear left on the belt, outside the back-carry lane (A39) - the folded tri-rotor and its battery - small
  hard pod with a rubber lid seal and a gunmetal latch.
- Medkit pouch - rear right on the belt, outside the back-carry lane (A39) - the medkit - flat tear-away pouch with a
  webbing pull handle at the bottom edge and a visible tear seam.

**Legs**
- Thigh holster - right thigh, at the game's thigh slot - empty: the game's sidearm sits in it (D24); shaped for the
  largest thigh-slot sidearm in `weaponDefs.ts`, open muzzle end (A40) - slim polymer shell, retention hood with a
  gunmetal release, a short hanger from the belt.
- Leg bands (two per thigh) - round each thigh - hold the holster (right) and the sleeve panel (left) to the thigh -
  elastic with a magnetic buckle.
- Throwable sleeves (three double sleeves) - left front of the thigh (D25), on a laminate panel hung from the belt - frag two,
  sleeping gas two, flashbang two, one type per sleeve - a shock-cord loop and pull tab over each cap; the caps differ
  by touch: knurled ring (frag), dome (gas), two ridges (flash).

**Hands and feet**
- Gloves - leather palm, stretch back, reinforced trigger finger, wrist tab (step 06, unchanged); the cuff over the
  suit's thumb loop.
- Approach boots - feet - light, climbing-capable footing (D23) - approach-shoe last, sticky rubber rand rising over
  the toe, flat edging zone under the toes, low lugs with a heel brake, padded collar about 12-13 cm, heel pull loop,
  lacing close to the toe.

**Wear:** scuffed plate and rib-segment trims; polished grip panels on the forearms and knees; dust on the knee grips,
the boot rands and in the lugs; polished glove palms and trigger finger; worn shock-cord pull tabs; a bright edge on
the rappel ring's bow; tape on the goggle mode switch.

**Not modelled (D24):** the rifle (any long gun), the pistol, any SMG and its sling. The game's weapon models attach
at the weapon mount point, the holster and the sling socket.

**Removed by D22-D24 (history):** base layer, combat shirt (elbow and upper-arm pockets, butt patch), soft-shell top,
trousers (knee pad pockets, cargo pockets), plate carrier (cummerbund, admin, radio and medical pouches, back panel
with the butt cup and bungee, quick-release cable), battle belt (grenade and dump pouches, knife
sheath, drop-leg hanger), SMG sling, mid boots, IR strobe (A42).

### 5.2 MOTH (climber)

Unchanged by D22-D24: step 12 starts by asking Michael Moth's direction (D24: "Decide at step 12"), then this list
is re-planned if needed.

**Head**
- Fitted balaclava - as Wren.
- Hood - over the balaclava - part of a lighter knit top, a looser fit than Wren's; drawcord at the face opening.
- Head harness - over the hood - as Wren, slimmer straps.
- Goggle band - as Wren (no flip mount, D19).
- Round twin-lens goggles (amber) - over the eyes in use, on the brow when stowed - two round barrels, joined by a bridge with an interpupillary
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
- Buckles, holster shell, harness plate and pod, goggle housings, radio, carabiners and descender are generated by Python with
  bevels and booleans from dimensioned parameters. Wren adds the composite plates and rib segments, the magnetic
  buckle, the empty holster shell, the drone pod and the weapon mount receiver.
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
  - Shoulder shrugs and deep reaches stretch the carrier's shoulder straps (Wren: the harness shoulder straps); this
    needs a corrective weight pass and the hero finger bones.
  - Wren's rib segments must keep overlapping (never gap) when the torso bends; they ride on the chest joint.
  - The rig changes wait for the locomotion merge (Section 4.3).
- **Clipping (5.12.2.3).** To be checked in the Lab's poses:
  - goggle housing vs the rifle's cheek weld when aiming (the rig sets the gun beside the head: `SIGHT_RAISE`);
  - mag pouches vs forearms at full aim;
  - the holster vs the thigh in a deep crouch;
  - the harness leg loops at hip flexion;
  - back-carried guns vs the head when looking up;
  - Wren: the game's back guns vs the back plate, drone pod and medkit (A39: the lane is kept flat; `rig.backGear`
    from the measured back-plate standoff);
  - Wren: the slung compact gun keeps the left hip; the sleeves moved to the left front thigh (D25);
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
  - Guards use `proportions.ts` too; changing the base ratios (A1, A3-A7) moves them as well. Check at integration.

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
