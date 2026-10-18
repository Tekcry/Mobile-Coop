# Step 07 - fix list, round 4 (checker: Opus 5.5 High, 2026-10-16; final check, no fix rounds remain)

Verdict: FAIL, so step 07 is OPEN. Round 3's two MUST items are met (below). The fail is one defect no earlier
checker caught: the earpiece cable runs through the neck. It was there before round 3; round 3's work made it
visible. One item, ranked first; the rest are notes and logged follow-ups.

Checker's own runs: see "Runs" at the end. No forbidden files touched. No threshold loosened in check_garment.py,
check.mjs or tests. No new external files. Head items are in GARMENTS. LOG.md draft present. Renders are newer than HEAD
(16:19-16:21 vs commit 12:30) and were made with E2E_GPU=1 per the fixer.

## MUST

1. **The earpiece cable runs through the neck and out through the hood on the far side.**
   - Wrong: `wren-head_kit-f-closeup-head-back`: a dark cord lies on top of the hood, partway up the right-back of the
     neck (about x 1110-1170, y 1110-1190 in the 1800 px frame), above the skirt hem. Measured in
     `build/operators/wren/wren-head_kit.blend` (object `wren-head_kit-cable`, ring centres every 4 rings, signed
     distance along the nearest face normal):
     - from the left collarbone plug (0.071, -0.080, 1.366) the cable passes 8-38 mm inside the body skin
       (`wren-body`) through the throat at z 1.434-1.448 (rings 24-44, e.g. (0.002, -0.022, 1.439) is 37.8 mm inside);
     - it comes out on the opposite (right, -x) side at the back of the neck, (-0.064, 0.041, 1.46). There it lies
       0.3-5.4 mm OUTSIDE the hood surface (rings 52-64), which is the cord visible in f;
     - it goes back through the neck (rings 72-84, up to 13.8 mm inside the skin) to the left ear.
     The earpiece is at +x (left ear), so the whole loop to -x is wrong.
   - Cause (read from the code, not run): `head_kit.py` ~lines 501-507. `HC.ray_in(sh_tree, (0, neck_y, ct - 0.032 /
     ct - 0.006), cd(...), 0.2)` returns the first shirt hit along -d starting 0.2 m out, and the cast reaches 0.3 m.
     Where the collar at the left front is lower than that height, the ray passes the neck axis and hits the collar on
     the far side, so p1 / p2 (and `p2 + Z * 0.008`) land at the right back. The 0.44 m length in the kit data (A27,
     "was 0.27") is this loop. A direct collarbone-to-ear run is about 0.19 m.
   - Breaks: SPEC 1 Logical ("Cables run from a source to a device along a route real people use, with retention
     points"). Checker list: clipping (the cable passes through the body and pokes out of the hood).
   - Done when:
     - Every cable point stays on the near (+x, left front) side: limit each `ray_in` cast so it cannot pass the neck
       axis (cast distance <= reach), or fall back to the nearest shirt or skin point on that side.
     - Re-measured, no cable ring is inside the body skin or outside the hood above the skirt hem. The run below the
       skirt lies on the shirt collar with the collar clip on it. Run the same signed-distance probe as above.
     - `earpieceCable.length` and its retention points in `src/operators/kit.ts` are re-measured, and A27 is
       corrected.
     - The headwear ridge over the cable (`headwear.py`, same `cable_dir` line) still covers the cable, which shows
       no more than a soft ridge.
     - Re-render headwear and head_kit on the GPU (E2E_GPU=1). In f no cord shows on the neck. In e and c the cable
       goes from the collar clip under the hood skirt and the balaclava edge on the left only.
     - `E2E_GPU=1 npm run operators:check -- wren` and `npm run check` pass.

## Round 3 MUST items: met
- Band (r3 item 1): `wren-head_kit-sim.json` in use `maxStandoffM` 0.002 (mean 0.0002), stowed 0.0025, both <= 3 mm.
  `e`: the band lies on the hood from the face opening to the pod. There is no shadow gap; the only shadow is the
  ordinary one cast below a 22 mm strap. Seen from the side the band's outer face is near straight; for a band round
  a head that is expected in pure profile, not a fault. `g` / `c`: one clean wrap and return at the right lug, with a
  bar tack and stitch rows; the cable leaves over the band's top edge into a plug on the housing side, with no
  crumpled faces. `f`: the band enters the pod channel flat, with the side strap end lying across it. `j` / `h`: the
  stowed band reads; it rides over the side strap as layered webbing. Kit cable 0.29 vs measured 0.288.
- Nape (r3 item 2): `wren-headwear-e` / `f` and `wren-head_kit-e` / `f`: the edge at the nape is the skirt's own clean
  hem lying on the shirt. No notch, pinch or dark sliver.

## Twelfth check view (check_garment.py, right wrist from below): legitimate, not a loosened check
- No limit changed: `minPixels` stays 150 and the albedo and roughness bands are unchanged. The view adds pixels of
  the real material where it really shows (the base layer under the shirt cuff). Albedo and roughness are measured
  from the shader inputs rendered as emission, so they do not depend on the view. A new view cannot hide an
  out-of-band material, and the single-item numbers (P1 / P50 / P99 0.036 / 0.038 / 0.041, roughness 0.9) are
  well inside the band. The knit is checked on its own item (base_layer) as before.
- Record it as an assumed decision (A30): it changes how the check is measured, as A26 recorded the three head
  views. LOG.md says "No A30 needed"; that should change.

## Logged follow-ups (OPEN in LOG.md; not fails)
- 3 behind-ear crease (`wren-headwear-e`), 4 rear channel smear, 6 darkness spill, 7 Moth kit text (step 13):
  unchanged, accepted.
- Note: close-ups still render near-black materials as mid grey (open since steps 05 / 06).

## Runs (checker, 2026-10-16)
- `E2E_GPU=1 npm run operators:check -- wren`: 7 items, all checks pass. Compression knit in headwear and head_kit:
  albedo P1 / P50 / P99 0.0359 / 0.038 / 0.0411, roughness 0.9.
- `npm run check`: exit 0. Lint 0 errors (38 warnings), 73 files / 762 tests pass, build ok.
- Cable probe: headless Blender 5.2.2 on `build/operators/wren/wren-head_kit.blend`, using the signed distance of
  the `wren-head_kit-cable` ring centres to `wren-body`, `wren-headwear-hood` and `wren-headwear-balaclava`. Port
  4191 freed.

## For the orchestrator (stale or unrecorded facts to fix whatever comes next)
- A29 is stale. It says the band "takes the convex hull"; it is now the relaxed strip `_relax_band`. It says cable
  0.26 m with keepers 0.07 / 0.14 / 0.21; they are now 0.29 with keepers 0.07 / 0.14 / 0.22, and the cable plugs
  into the housing side. It says cam buckles 50 mm behind the plate (LOG round 1 PART B); they are now 32 mm. It does
  not mention the chin buckle at the jaw (51 mm below the eye line) or the standoff metric, which is now the band
  underside centre over hood + hem + harness, over the contact run only.
- A27 is stale: "goggle cable 0.28 m ... into the mount shoe"; there is no mount. The earpiece cable at 0.44 m comes
  from the bug in item 1.
- An assumed decision is missing: `SKIRT_BACK` (the hood skirt 10 mm lower at the back) plus `tuck_collar` with
  per-vertex edge height. This extends A25's approach to the shirt collar.
- Add A30 for the twelfth check view (see above).
- LOG.md round 3 says "band 0.564 m, contact 0.332 m" for in use. The sim json has an in-use `contactM` of 0.27;
  0.332 is the stowed value.
- STATE.md "Now" still says "Next: the round 3 re-check of step 07".
