# Step 07 - fix list, round 1 (checker: Opus 5.5 High, 2026-10-16)

Verdict: FAIL. Items 1-3 come from Michael's D19 (DECISIONS.md) and are MUST. Items 4-9 are the checker's findings
from the renders. Re-render on the GPU (E2E_GPU=1) and re-run `npm run operators:check` and `npm run check` after.

D19 process first: before building items 1-3, a scratch pass renders about 3 goggle housing options and 2-3 head strap
options, each stowed and in use; Michael picks; the fix round builds the pick (D19, last bullet; the orchestrator runs
that choice).

## MUST (Michael, D19)

1. **No flip mount: two fixed worn positions.**
   - Wrong: `head_kit.py` builds a flip arm, pivot barrel and detent lever (`FLIP` parts, `upDeg` -170); flipped up the
     goggle stands about 10 cm above the forehead (`wren-head_kit-h-closeup-optic-up`, `wren-head_kit-e` side view).
   - Done: no flip arm, pivot or detent. The goggle has two worn positions: stowed, resting on the forehead / brow over
     the hood, within a few cm of the hood surface; in use, pulled down over the eyes with the eyecups sealing the eye
     port (no skin, D4). Both are rendered on the GPU (replace `h-closeup-optic-up` with a stowed view; the in-use view
     is c / g). `render_garment_test.py` no longer reads `flip` / `pivot` / `upDeg`.
   - Update to match: SPEC 3.3 "Mount" bullets, SPEC 5.1 "Flip mount" and "Square goggle housing" rows, SPEC 2 lines
     54 / 60 / 311 where they say mount / square, the SPEC 7 rows; `src/operators/kit.ts` `flipMount` (and the
     `chinStrap` job "stops the harness lifting when the goggle flips", Wren line 74 and Moth line 140); kit data still
     passes `validateKit`. Record the change in DECISIONS (follow D19, not a new A-number unless a judgement call is made).

2. **A more tactical head strap / harness.**
   - Wrong: the harness reads as generic flat bands (`wren-head_kit-c`, `-e`, `-f`).
   - Done: purpose-built webbing and hardware that read tactical at close range: visible webbing weave and edge
     binding, low-profile tri-glides / ladder locks, bar tacks at the anchor points, a shaped padded rear cradle, and a
     front plate that carries the goggle's stowed and in-use positions. Every strap still has two anchors and a job
     (SPEC 1). The option Michael picks in the scratch pass is the one built.

3. **A more futuristic goggle housing.**
   - Wrong: the housing is a plain rounded box with two flat discs (`wren-head_kit-g-closeup-goggle`); Michael: "they
     look very square".
   - Done: an original sculpted, rounded single housing over two optics (no three-lens cluster, no copied product,
     D5), rubber eyecups, the strong green glow kept (D13), tiny muted status emitter kept. SPEC 2 "Wren's square
     single-shroud goggle housing" wording updated to the new form.

## Checker findings

4. **Lens reads as a flat sticker, not coated glass.**
   - Wrong: in `wren-head_kit-g-closeup-goggle` and `-c` both lenses are flat, uniform pastel-mint discs with no depth,
     no specular highlight and no coating reflection. SPEC 3.3 asks for "a coloured reflection at an angle"; SPEC 1
     Physical lists lens coatings among materials that must read at close range. The emission (strength 1.8 over a
     near-white tonemapped result, `materials.py` `lens()`) swamps the glass.
   - Done: in the goggle close-up the lens shows a glossy specular / coating sheen over the glow and a recessed
     objective behind the glass (depth); the glow reads saturated green, not pastel white-green, while `i-darkness-glow`
     still shows a clear glow (D13). The `lens` class (A26) stays; the lens roughness stays inside 0.02-0.3.

5. **Chin strap sits on the throat at the collar, not under the chin.**
   - Wrong: `wren-head_kit-e-closeup-head-side` (strap from the side strap runs down the neck to the shirt collar,
     about 6 cm below the chin) and `wren-head_kit-c-closeup-head-front` (crosses the throat at collar level). The
     plane slice in `head_common.py` (around lines 166-172, `_longest_run(... P[:,2] < za ...)` at line 210) runs the
     strap down the neck.
   - Done: the chin strap leaves each side strap in front of the ear, follows the jaw line and cups under the chin
     (at most about 2 cm behind and below the chin point), side-release buckle on the left beside the jaw, visible in
     the e and c views.

6. **Clipping at the nape and behind the ear.**
   - Wrong: small dark triangular slivers poke through the hood skirt where it meets the shirt collar at the back,
     left and right of the nape, and the shirt collar is crumpled/torn there (`wren-headwear-f-closeup-head-back`,
     lower third; same in `wren-head_kit-f`). Dark spikes and smeared knit texture behind the left ear on the hood tent
     (`wren-headwear-e-closeup-head-side`, behind the ear, upper end of the ridge).
   - Done: no geometry of the shirt collar, base layer or balaclava shows through the hood in the f and e views; the
     shirt collar edge at the nape is a clean edge (no torn / crumpled triangles); the texture on the hood behind the
     ear does not stretch or streak.

7. **Hood method (A24) and the hood's folds.**
   - Judgement: A24 is legitimate for the balaclava (a tight knit over the face's concavities, the A18 reason, no
     check threshold changed). It is not shown for the hood: the step file says "sewn and simulated", D14 makes the
     sewn-panel cloth method Michael's method for garments, and the hood lies over the balaclava (convex, already
     bridged), so the A18 reason does not carry over. For fitted items the seam-gap and simulation checks pass by
     construction, so the hood skipped two of the step's checks.
   - Visible result: the hood reads as a smooth moulded shell with one strong tent from the ear down the neck
     (`wren-headwear-e`) and the rear channel's "gathered pleats" render as blurred vertical streaks with small dark
     notches on the channel stitch line (`wren-headwear-f`, upper middle): sculpted, not sewn (ART-DIRECTION render
     check 4, SPEC 1 Physical "fabric drapes").
   - Done: try the hood as sewn panels simulated over the balaclava (A24's own undo: `garments/hood.py` through
     `build_garment.py`), passing the real seam-gap and simulation checks. If it cannot work after real effort, keep
     the fitted hood, put the sim attempt's evidence (numbers, log path) in LOG.md and A24, and at least fix the
     visible faults: the ear-to-neck tent softened to a fold the earpiece cable plausibly makes, and gathers at the
     channel that read as pleats with no dark notches.

8. **Darkness view frames the head small (note-level, cheap to fix).**
   - `wren-head_kit-i-darkness-glow`: the head sits small in the upper half; nothing but the two discs and the amber
     dot is visible. Done: frame the head to fill most of the view so the glow's spill on the eyecups / brow can be
     judged (D13 glow kept).

9. **LOG / STATE.**
   - Done: LOG.md "Step 07" updated with what changed in this round and the results; A25 (base-layer neck flare) stays
     listed as a step 05 follow-up; STATE.md short.

## Notes (not fails)
- A26 (`lens` class in `check_garment.py`): legitimate. Only `materials.lens()` sets it, only `goggle lens` uses it,
  no existing fabric / hard limit changed, and 0.02-0.3 is a sensible band for coated glass. Not a loosened check.
- Close-ups still render near-black materials as mid grey (open since steps 05 / 06); it keeps the material read
  (anodised edges, webbing weave, polymer vs rubber) hard to judge in c / e / f / g.
- The earpiece cable's plug hangs on the chest at the left collar until the PTT arrives in step 09 (`wren-head_kit-a`,
  `-d`); fine for now, it must not stay loose (ART-DIRECTION 2).
- The goggle cable runs straight from the rear crown clip to the battery, bridging the occiput above the cradle
  (`wren-head_kit-f`); plausible under tension, worth a second look when the harness is redone.
