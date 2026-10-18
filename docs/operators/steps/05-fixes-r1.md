# Step 05 - fix list, round 1 (checker, Opus 5.5 High, 2026-10-16)

Verdict: FAIL. `npm run operators:check` passes (3 items, all checks pass) and `npm run check` passes; the diff has no
forbidden-file edits, no loosened thresholds, no new external files, and every new item is in GARMENTS and the kit.
The renders (all newer than HEAD, OptiX enforced by `render.py use_gpu`) fail the step's Checks, ART-DIRECTION 3 / 5 and
the render check, and SPEC 1 / 3.1 on the items below. Renders are in `docs/operators/mockups/tests/`.

1. **Trousers sit 8-10 cm low and the front waist is a crushed shelf.**
   Where: `wren-trousers-d-front-neutral.webp` and `-a-front-stealth` (lumpy horizontal roll of cloth across the front
   under the band, crotch hanging low between the thighs); `-e-closeup-waist` (crumpled, sculpted-looking mass under
   the band, the band's inner edge stands off the shirt); `-f-closeup-seat` (a step / lip under the back band).
   Cause per the implementer: crotch length too short in `garments/legwear.py` (`rise`, `centre_lift`, gusset), band
   does not grip. Fails render check 4 (folds sewn, not sculpted) and SPEC 3.5 Waist.
   Done: the band settles within 2 cm of the drafted height (log the measured band-top z and the target), the front
   below the band shows only the small vertical belt-gather folds of SPEC 3.5, the crotch sits at the body's crotch
   (gusset under it, no drop), and the shirt hem ends at least 5 cm inside the band (log the hem z vs band-top z).
   Suggested: measure the crotch path on the body (front waist, under the crotch, back waist) and draft `rise` /
   `centre_lift` / gusset from it; and/or pin the band ring during the sew and release it for the settle.

2. **Knee pads and cargo pockets are in the wrong place.**
   Where: `wren-trousers-d-front-neutral` and `-c-closeup-knee-cargo`: the flapped cargo pockets sit on the front of
   the thigh directly above the knee pads, at knee height; the knee pad panels sit below the kneecap.
   (`trousers.py:118-121` puts the pocket centre 17 cm below the crotch; with the sag it lands on the knee.)
   Fails SPEC 3.1 (cargo pockets on the thighs angled forward for the hand) and the logical rule of SPEC 1.
   Done: knee pad panel centred on the kneecap (within 2 cm of the knee joint height, logged); cargo pocket on the
   side / front-side of the thigh, its mouth near mid-thigh where the hanging hand reaches, clear of the knee pad,
   angled forward; visible in a re-rendered front and a side or 3/4 view.

3. **Trousers and leggings surfaces are lumpy, not draped.**
   Where: `wren-trousers-b-back34-stealth` (dents and crumples all over both legs), `-f-closeup-seat` (blotchy dents
   on the thighs); `wren-base_layer-d-front-neutral` / `-a-front-stealth` (regular horizontal accordion ripples on
   both shins - a compression legging stretches smooth) and a hard horizontal ledge across the chest under the bust
   (also `wren-base_layer-c-closeup-collar`, the bands at the upper chest) and a ring step at each forearm.
   Fails render check 4 and ART-DIRECTION 3 (thin compression top and leggings, close knit).
   Done: the base layer clings smooth over the torso, arms and legs (no bridging shelf at the bust, no ring steps, no
   periodic ripples); the trousers show soft-shell drape (slight knee bagging, broad soft folds) without small-scale
   dents. Re-render the same views.

4. **Skin shows at the back waist of the base layer.**
   Where: `wren-base_layer-b-back34-stealth` and `wren-combat_shirt-b-back34-stealth`: the leggings band has slid below
   the buttocks and bare skin shows between the top's hem and the leggings. Contradicts A12 ("the top laps over the
   leggings waistband") and ART-DIRECTION 3 (base layer seen only at collar and cuffs).
   Done: no skin between the top and the leggings from any test view; the top laps over the band all round.

5. **Close-ups are over-exposed and cannot be judged.**
   Where: `wren-trousers-c-closeup-knee-cargo`, `-e-closeup-waist`, `-f-closeup-seat`, `wren-base_layer-c-closeup-collar`,
   `-e-closeup-cuff` (large areas clipped to white). Render check 2 and 3 (matte fabric, knit vs ripstop readable)
   cannot be judged; drain grommets, bar tacks and belt-loop tacks cannot be confirmed.
   Done: re-lit close-ups with no clipped fabric areas (the shirt's `c-closeup-raking` exposure is a good reference),
   in which the drain grommet at each cargo pocket bottom, the belt-loop bar tacks, the knee darts, the seat panels
   and the gusset are visible. Add a combined close-up of the collar and one cuff with the shirt over the base layer
   (the implementer's open item 5: show the base layer actually reads at collar and cuff).

6. **Possible clipping at the crotch.**
   Where: `wren-trousers-c-closeup-knee-cargo`, left of the fly at about the crotch (image x 560, y 470): a smooth pale
   ellipse that does not belong to the trouser surface (looks like the leggings or the body through the trousers).
   Done: identified and removed; nothing under the trousers shows through in any view.

7. **Belt loops too short for a duty belt.**
   Where: `trousers.py:148-153` (loop height `hb - 0.004` = 3.6 cm on a 4 cm band); `wren-trousers-e-closeup-waist`
   shows small tabs inside the band rather than loops. SPEC 3.1: belt loops wide enough for a duty belt (SPEC 5.1:
   the inner belt runs through them). Done: loops with a clear opening for a 4.5 cm belt (loop length about 5.5-6 cm,
   lapping above and below the band), stood off the band, bar tacks at both ends visible in the waist close-up.

8. **No stretch panels behind the knees.**
   SPEC 3.1 (stretch panels behind the knees) and ART-DIRECTION 5 (stretch panels at the joints). Done: an inserted
   stretch-knit panel at the back of each knee (its own pattern panel or a seamed insert with a different material,
   not a patch on top), visible in the back 3/4 view.

9. **A11 says the earlier layers are colliders; they are not.**
   `DECISIONS.md` A11: "each is simulated over the body and every earlier garment's welded surface (colliders)", but
   `build_garment.py:595-608, 682` keeps layer collision off by default (`SIM.layer_collision`) and resolves layers
   only after the simulation (`layer_push`). The step's Do 1 asks for the layers as colliders. Done: either the layers
   collide during the settle (e.g. collision on in the settle phase only, with the seams already closed), or A11 is
   rewritten to state exactly what the pipeline does (post-simulation `layer_push`, why, how to undo) and the LOG.md
   draft names the deviation from Do 1 as an assumed decision.

Notes (not fails): the seat reinforcement reads as two jeans-style back pockets (`-f-closeup-seat`); a single seat
panel spanning the centre seam in Cordura would read more like reinforcement. Seat panels are `softshell`, not
`cordura`, unlike the knee panels.
