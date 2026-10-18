# Step 11b - fix round 1 (checker, round 1)

Verdict: FAIL. The layout, sizes, seats, skinning, D29 removal, pose sheets and renders hold; the `rigidKit` shape check
is vacuous by construction, and two other checks do not measure what they claim. Re-run checks after the fixes:
`npm run operators:check` (only the known `wren lod1 FAIL bakeDiff chest 31 px > 24` may stay) and `npm run check`.

1. **`rigidKit:shape` cannot fail on a part built bent.** `kit_common.py:55` (`Parts.tag`) records the design
   coordinates as `F.local(W)` of the vertices *after* they were placed. `Flat`'s A / U / N are orthonormal, so
   `F.local` is itself a rigid transform and `rigidResidual(design, world)` is 0 for any geometry, straight or bent:
   a magazine laid through the conformal map `Mf` and tagged with `Fmag` passes. Parts tagged with `F=None` (buckles,
   holster) and the plates (`armour.py:502`) store the as-built world shape, so they are 0 by construction too. Every
   item reports `worstMm: 0`. The check only sees deformation after tagging, not the D28 defect it exists for.
   Done looks like: the design coordinates come from before the map: for anything laid on a Flat through `cbox` /
   `mpts` / `cord_loop`, the map-space input (`cu + du, cv + dv, h`, which `cbox` computes before calling `M`, or the
   local `L` it returns plus the offsets); for parts built in one frame (buckles, holster), the local coordinates
   before the frame transform. The plates may keep "as built" (body-shaped by design), stated in A81. Prove it once:
   temporarily lay `rifleMag0` through `Mf` instead of `Fmag`, rebuild chest_rig, record the `rigidKit:shape` FAIL and
   its number in the LOG, revert. Add a Vitest case: a design set mapped through a curved map fails at > 1 mm.

2. **The brow rivets' host gap is the builder's own number, not a check measurement.** head_kit.py registers 502 / 503
   with `hostGapMm` but tags no vertices, so check_garment.py finds no geometry (`check_garment.py:168`, `if not Wp`)
   and also skips its own measurement whenever the registry supplies `hostGapMm` (`check_garment.py:186`). Shape and
   depth are never judged for them (`head_kit: rigidKit:shape parts 0`). Done looks like: head_kit.py tags each
   rivet's vertices `_rigid` 502 / 503 with design coordinates; check_garment.py measures the host gap itself for
   every small hard part (no registry bypass; the builder's number may stay as information); head_kit then reports
   shape, depth and hostGap with `parts: 2`; `rigid_skin.tag_head` keeps 502 / 503 (head bone, BONE_RULE `browRivet`).

3. **`rigidSkin:<lod>` checks the bone set and the spread, not the weights or presence.** A rib 2 skinned chest 1.0
   would pass (one vector, bones a subset of chest + spine); a registry part missing from a file is not reported.
   (Measured now: rib 2 is chest 0.5 / spine 0.5 in hero / LOD0 / LOD1 / LOD2, so this is the check's strength.)
   LOD1 has no vertex tagged 301 (`legBandBuckleL0`) though LOD0 and LOD2 do; LOD2 has none for 105 gadgetTab,
   207 camTab, 208 slingSocket, 214 rappelRing. Done looks like: `rigidSkinCheck` compares each part's weight vector
   with its declared bones within 0.01 and lists registry `hard` parts absent from the file; an absence passes only
   when A82 names it (shell-absorbed below 5 cm, with the weights its shell vertices took); 301's absence in LOD1 is
   explained or fixed. Vitest: rib 2 at chest 1.0 fails; a missing part not in the A82 list fails.

4. **The deep-crouch knife / rifle-magazine interference is accepted on a check LAYOUT.md gives to 11b.** LOG accepts
   "K hits R1 -8 mm, R1 draw blocked 7/9" (`wren-pose-crouch.webp`, both views) as "checked against the game's real
   crouch clip at locomotion integration", but LAYOUT.md "Recommended changes" 4 says 11b checks it against the
   game's real crouch. The game rig's crouch is already in the Lab (`labData.ts` POSES `crouch`, `crouch: 1`; also
   `sneak`). Done looks like: pose_check.py (or a Lab probe) measures K / R1, R1 / thighs and the sleeve caps in the
   game's crouch and sneak poses; the numbers go in the LOG item table; if they are clear, the deep-crouch acceptance
   cites them; if not, move the knife (or its pommel) or put it to Michael in DECISIONS.

Notes (not fails):
- A88's measurement holds: u9 0.2136 to the lane edge 0.331 = 117 mm; the magazines' rear half (64), the socket boss
  (to u 0.308) and the 84 mm pod need about 171-177 mm. The pod at the rear right is clear in every pose.
- Gunmetal (A86) meets the STATE target (F0 0.30-0.33, roughness 0.61), but on `wren-sheet-closeup-buckle.webp` the
  halves read as a flat light silver-grey with no visible satin lobe, lighter than ART-DIRECTION's "dark anodised
  grey"; worth Michael's eye at the block end.
- Prone pistol-magazine contact (-3 / -4 mm "into torso"): pose_prone sets no spine bones, so the flank's motion comes
  from hip-weighted body vertices at 78 deg abduction; the skinning-collapse reason is plausible.
- Stale comment `waist_belt.py` "Drone pod (rear left)" (the code builds it rear right); `labData.ts` keeps a
  `phoneLook` field no preset uses.
