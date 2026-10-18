# Wren stealth concepts (D22 options pass, scratch)

Renders: concept-{A,B,C}-{front,back34,side,rim,chest}.webp. Cycles OptiX on the RTX 4090, 80 spp, 1000x1500 (chest 1200x1400). Script: work/stealth.py (not pipeline code). All three keep Wren's body, the hood and balaclava, the original goggle on its band, the strap-2 head harness, the gloves and the step 06 boots. The suit in every concept is the step 05 base-layer mesh, re-zoned into panels with bonded seam tape. Kit is roughly modelled: plates are rigid shells that bridge hollows, and straps are tension-bridged bands. The comms cable is hidden because it ran to the old carrier's radio.

## A - Infiltration suit
A one-piece fitted stretch suit with:
- stretch zones at the shoulders, underarms, inner elbows and backs of the knees
- lighter abrasion panels on the shoulder tops, forearms, elbows, knees and seat
- a diagonal chest zip

Over it sits a contoured chest plate with three overlapping rib/abdomen segments, a slim back plate on a low webbing harness, and a flat chest rig on the plate (two angled mag slots, one gadget slot). Below that: an integrated climbing sit harness (padded waist belt, leg loops, belay loop, gear loops, locking carabiner with a plate descender), a low thigh holster with a suppressed pistol (right), a slim utility pouch (left), a forearm pouch and a small hard pod low on the back.

How it moves:
- Rope: it climbs and rappels straight off the harness that is always worn, with the descender already clipped.
- Climbing: the segmented front lets the torso bend and reach overhead.
- Crawling: nothing stands more than about 2.5 cm off the chest, and the thigh kit lies on the outer thigh.

Reuses:
- base_layer.py and the cling step for the suit
- torso_common Plate / slab (the step 08 plate-bag code) for the plates
- belt.py strap, buckle and pouch code for the harness, holster straps and pouches
- carrier.Pouch for the mag slots

Needs building:
- a one-piece suit pattern with the panel zones, zip and thumb loops
- the sit harness and its hardware (SPEC 3.4 already describes it)
- the holster and pistol, the back pod and the forearm pouch
- a new comms route to a radio in the pod or the rig

## B - Two-piece stealth
A fitted knit top and fitted dark-olive stretch trousers. The trousers have knee darts and two-piece hard knee shells on an elastic strap. Over the top is a cut-down plate carrier: front and back laminate plate bags, a narrow elastic cummerbund and padded shoulder straps. The rig is built into the front bag (three mag slots and an admin flap). It keeps the same belt-and-harness, the thigh holster and a small back pod.

How it moves:
- Rope and climbing: same as A, and the separate trousers and top are easier to service.
- Crawling: the carrier front stands about 4 cm off the chest with pouches on it. That snags more in vents and crawlspaces, and from a distance it still reads closest to the military look D22 moves away from.

Reuses the most: legwear.py and base_layer.py for the top and trousers, carrier.py's plate bags and cummerbund almost as built (cut down), and belt.py.

Needs building: the knee shells, the harness and hardware, the holster and the pod.

## C - Armoured skin
The A suit with thin armour panels bonded straight onto it:
- one chest panel and two flex segments
- a back panel
- two-segment shoulder caps and upper-arm plates
- three-segment forearm plates (the first over the elbow)
- a knee cap and two shin segments on each leg

All segments have gaps at the joints and there are almost no straps. Storage is flush, bonded zip pockets (thigh, upper arm, ribs, hip) plus a two-mag carrier on the left hip. The thigh holster stays, and a slim rope harness is worn only for rope work.

How it moves:
- Crawling and tight spaces: it has the lowest profile and nothing to snag, so it is the best of the three here.
- Rope: the slim harness carries the rope.
- Limits: it has the least carrying capacity. The limb plates push toward the armoured-superhero look ART-DIRECTION 8 rules out, so they have to stay matte, thin and segmented.

Reuses: the A suit, torso_common slab for every panel, and the A harness and holster.

Needs building: many small conformal panels that have to follow the suit and the rig as it bends (a skinning and deformation risk at the joints), and the bonded pockets.

## Recommendation
A. It matches Michael's words most directly:
- a wetsuit-fitted one-piece, slim segmented armour, flat low-profile storage, a holster on the thigh, and a harness already rigged for ropes
- it keeps the silhouette ART-DIRECTION 2 asks for (head with optic, plate shoulder line, harness straps, thigh holster, low compact pod)
- most of its parts come from code already committed in steps 05 and 08

If Michael wants more armour read on the limbs, C's bonded forearm and shin panels can be added to A later without changing its layout.

Boots: all three use the existing step 06 boots. A lighter approach-style climbing shoe would suit A and C: a sticky rubber rand at the toe, a lower and softer cuff and a flatter edging sole. It is optional and would be a new build.

Known scratch limits:
- the A-pose
- fabric weave only shows at close range
- the leg loops read a little like shorts hems at a distance
- the base layer's chest still shows where no plate covers it (step 05 open item)
- a thin stray line behind the left shoulder in the back three-quarter views
