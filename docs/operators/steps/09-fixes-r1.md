# Step 09 - fix list, round 1 (checker: Opus 5.5 High, 2026-10-17)

Verdict: FAIL. The chest rig, comms routing, belt layout, kit data and step 07's earpiece cable are met (below). Four
parts break the step's own wording or the ART-DIRECTION render check 6-7 (expensive, silent, snag-free): the holster
reads as an open box with a strap, the rappel ring hangs as an open D below the belt, the radio stands 5.3 mm proud
instead of flush, and the medkit's pull handle reads as a crumpled dangling tab. Ranked by impact on the look. Items
5-6 are the standoff judgement asked for (Michael D23 "slimline", ART-DIRECTION 9.1 / SPEC 3.2: 2.5 cm, magazine
pouches about 4 cm).

No forbidden files touched (git diff HEAD: only docs/operators, scripts/operators/py, scripts/operators/export-gltf.mjs,
src/operators/kit.ts, tests/operators.test.ts). check.mjs, check_garment.py and covered.py unchanged; the test edit
only swaps kit ids. No new external files. chest_rig, waist_belt, leg_kit are in GARMENTS.wren and FITTED. LOG.md
"## Step 09" draft present. Renders 02:06-02:25 vs HEAD 01:24, rendered on the GPU per the implementer (Blender 5.2.2).

## MUST

1. **Holster: an open-topped rectangular box with a narrow strap, not a moulded holster with a closed hood.**
   - Wrong: `wren-leg_kit-f-closeup-holster-top`: the mouth is an open rectangle and the cavity's inside shows on
     both sides of the "hood", which is a ~25 mm strap arching over one rim and down into the cavity. `wren-leg_kit-c`:
     the shell is a flat-faced brick (about 16 x 7 x 4.5 cm) with square shoulders, no slide / frame / trigger-guard
     form and no taper toward the muzzle. Breaks the step ("retention hood with a gunmetal release shown closed",
     "slim polymer shell"), render check 6 (nothing lumpy) and 7 (an open mouth and a strap loop snag).
   - Where: `scripts/operators/py/garments/leg_kit.py` holster block (~lines 158-256: shell, hood ~194-214, `delta`
     ~186-188).
   - Done when:
     - The closed hood is a moulded cap over the whole mouth (its full width and depth), pivoting on the outer face
       and latched with the gunmetal release; in f no cavity interior shows from above.
     - The shell section follows a sidearm: the slide section and a frame / trigger-guard step on the forward side,
       tapered toward the open muzzle end, every edge from the A56 radius family; c reads a moulded holster, not a box.
     - The shell moves in toward the thigh using the slot tolerance the check allows: `offsetFromSlotMm` up to 10
       (it is 2.84 now), so `standoffFromSuitM.thighHolster` <= 0.046 (now 0.0522), with the cavity still fitting the
       five-seven (31 mm) and the platform's thinnest point at least band + 3.5 mm (shape the platform's back to the
       thigh, or let the shell's back follow the thigh's curve, rather than thickening the wedge at its edges).
     - Re-render leg_kit c, f, a, i on the GPU.

2. **Rappel ring: an open D hanging below the belt with a gap behind it.**
   - Wrong: `wren-waist_belt-e-closeup-belt-back` (crop x 780-1000, y 560-740): the bow leaves the tunnel and hangs
     about 6.5 mm below the belt's lower edge over the lumbar hollow, with a shadow gap behind it; it reads as an open
     loop, not "a gunmetal D folded flat, only its bow showing". Its standoff is 16.4 mm in the back-carry lane (the
     belt is 11.8 mm). Breaks Do 3 and render check 7 (no open loops, no loose metal, nothing that snags a rope or the
     back gun).
   - Where: `waist_belt.py` ~212-225 (`bow`: y to -0.0215 below Z_MID - 0.002, past the 15 mm half width).
   - Done when: the bow lies on the belt / tunnel face and ends at or within 3 mm of the belt's lower edge; no gap over
     1 mm between the bow and the surface under it; `standoffFromSuitM.rappelRing` <= belt + 4 mm; e shows no shadow
     gap under the bow.

3. **Radio: 5.3 mm proud of the back plate, not set flush.**
   - Wrong: `wren-chest_rig-e-closeup-back-radio-cable` (crop x 680-1160, y 520-840) and `-k`/`waist_belt-b`: the radio
     reads as a box on the plate face with a cast shadow; `radio.proudOfPlateMm` 5.3 (a 10 mm radio in a 4.7 mm
     recess). Do 2 asks for "set flush into the back plate's recess"; A39 allows only the recessed radio in the lane.
   - Where: `chest_rig.py` RADIO_HALF (z 0.005) and the `proudOfPlateMm` formula; the recess depth in `armour.py`.
   - Done when: `proudOfPlateMm` <= 1.5 (a thinner module or a deeper recess, the plate's back face still clear of the
     suit), the radio's face edge rounded / chamfered in the A56 family; e reads the radio face near level with the
     plate. While there: the stub antenna's keeper bridge must read over the antenna in e (it does not read in this
     render); confirm in a close-up.

4. **Medkit pull handle reads as a crumpled dangling tab; tear seam does not read.**
   - Wrong: `wren-waist_belt-e` (crop x 1100-1320, y 540-780) and the top left of `wren-leg_kit-c`: at the medkit's
     bottom edge a short wavy sliver curls off the corner; it reads as a torn or dangling tab (render check 7). The tear
     seam (a 0.7 mm rubber bead at 58 % height round the side walls) is not visible in e or b, so "a visible tear seam"
     is not shown.
   - Where: `waist_belt.py` ~196-210 (`hand` deform, the handle box; the `loop` bead).
   - Done when: the handle is a flat webbing strap about 30 mm long, bonded flush along the bottom edge at both ends
     (no wave, no free corner), legible in e; the tear seam reads in e or b as a line on the outer face or the
     rear-facing wall (a stitched or moulded tear line, not hidden on the inner side).

## SHOULD (standoff judgement; fix, or log for Michael with numbers)

5. **Throwable sleeves 3.37 cm off the suit (the 2.5 cm pouch rule).** The magazine allowance (about 4 cm) is for
   magazine pouches; A63 reads the sleeves into it. Michael's "slimline" and A63's own undo point the other way.
   Done when: oval canisters (for example 30 x 22 mm, cap and pull tab kept) bring `standoffFromSuitM.throwableSleeves`
   to <= 0.028; A63 updated. If not done, it goes to Michael as an open question with the numbers.
   Mag pouches (3.65 / 4.02 cm) are inside the magazine allowance: accepted.

6. **Holster standoff beyond item 1.** Even at the 1 cm slot tolerance the holster stands about 4.5 cm off: the game's
   thigh slot sits CARRY_GAP outside a capsule thigh about 9 mm fatter than Wren's (`backGapNoPlatformMm` 8.84). Log
   for Michael / locomotion step 25 in A62: move the game's thigh slot in by about 9 mm (or size it from the detailed
   thigh) so the holster can sit at about 3.5 cm.

7. **Sleeve hanger stands 19 mm off the suit across the hip crease and reads as a thin line** (`wren-leg_kit-e`, the
   straight vertical edge at x ~895, y 0-390; implementer open item 1). Done when its run lies within 6 mm of the suit
   (pressed into the crease or routed down the panel side) and reads as a strap in e.

## Met
- Step 07 cable MUST (checker probe on `build/operators/wren/wren-leg_kit.blend`, evaluated meshes): 58 ring centres,
  0 inside `wren-body` (min 0.27 mm out), x 0.0315-0.0873 (all on the near side). Rays outward from each ring: rings
  0-19 (z 1.380-1.420) are on the chest and collar below the hood hem (hem 1.41-1.42 there); rings 20-56 are under the
  hood; the end rings 54-57 at the earpiece are inside the hood (5 of 6 rays hit it, 4-8 mm in). Kit 0.225 vs measured
  0.225. `wren-head_kit-f`: no cord on the neck; `-e`: the cable leaves from under the skirt on the left only. A27
  corrected.
- Chest rig (`wren-chest_rig-c`, `-h`, `-j`): two open-top mag pouches right of centre with shock cord and tabs, the
  flapped gadget slot with a magnetic tab, the knife left of centre handle down with guard, pommel and release, the PTT
  on the left strap at the collarbone with both cables on its top; the radio cable along the strap's inner edge under
  three keeper bridges (longest free span 0.131 m).
- Belt (`wren-waist_belt-c`, `-f`, `-e`): flush magnetic front closure, pistol mag pouch left front, cam / mine pouch
  left hip with a magnetic tab, flush sling socket, drone pod (rubber seal, gunmetal latch) rear left and medkit rear
  right outside the lane; no gear loops or leg loops.
- Left thigh (`wren-leg_kit-e`): three double sleeves, knurled ring / dome / two-ridge caps, cord loops with tabs.
- Kit data: ids added and removed as the step lists; contents match gadgets.ts; `pistolHolster` 2.84 mm from the slot,
  3.3 deg.

## Logged follow-ups (not fails)
- Near-black still renders mid grey in close-ups (open since steps 05 / 06).
- The radio cable crosses about 2 cm of the back plate face inside the lane, flush (A65): accepted.
- The suit's centre-front seam below the belt reads wavy in `wren-leg_kit-e` (x 620-660, y 130-420): step 08a's suit,
  not this step; note for the suit owner.
- The sleeves' cord loops read as thin wire hoops standing over the caps in e; consider lying them flatter on the caps.

## Checker's runs
- `E2E_GPU=1 npm run operators:check -- wren`: 9 item(s), all checks pass (exit 0).
- `npm run check`: exit 0. Lint 0 errors (38 warnings), 73 files / 762 tests pass, build ok.
- Probes: headless Blender 5.2.2 on wren-leg_kit.blend (cable vs body / hood / balaclava, evaluated and base). Port 4191
  freed.
