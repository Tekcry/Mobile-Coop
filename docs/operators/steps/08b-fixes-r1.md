# Step 08b - fix round 1 (checker, round 1)

Verdict: FAIL. `E2E_GPU=1 npm run operators:check -- wren` (full run, no --only): 6 items (suit, gloves, boots,
headwear, head_kit, armour), all checks pass. `npm run check`: PASS (73 files, 762 tests, build; lint 0 errors). A first run alongside the GPU check
timed out 4 unrelated tests at 5 s; the re-run on an idle machine passed.
No check was weakened. check.mjs is unchanged; `torso_common.compress` only adds `cappedAt` to its report; the test
edits swap the removed carrier ids for the seven new ones (now asserting `errors: []`) and assert the six removed ids
are gone. No forbidden files, brands, Splinter Cell shapes, IR strobe (A42) or new external files. `armour` is in
GARMENTS.wren and FITTED. The LOG.md draft exists. The 11 renders are GPU (384 spp), dated 2026-10-17 00:23-00:24,
after HEAD (2026-10-16 23:40).

What passes: the plate fit numbers (chest mean 2.73 / max 10.45 mm, ribs 4.8 / 4.76 / 1.75 mm, back mean 3.98 mm,
nothing in the suit beyond the pressed depth), the rib laps (14 mm, every lower segment narrower), `plugClearM`
41.8 mm, the three `weaponMount` frames (0.08 rad splay, 7 cm) in the blend and the sim report, `backGearM` 0.022.
The neck scoop, the one corner-radius family, the rubber trims, the recess and the antenna keeper all read correctly.
No hook-and-loop, ladder locks or side-release buckles. The side straps lie 1-3 mm off the suit round the ribs
(measured in the blend; the rim-light stub in i is the strap on the body's outline, not a standoff).

The failures are at the strap-to-buckle and strap-to-plate joins and on the back plate's receiver area. The step's
Checks ask for "straps flat and tensioned with flush buckles" and "the mount point reads as a deliberate flush
receiver, not a greeble"; ART-DIRECTION render check 6 asks for "nothing lumpy". Ranked by impact on the look.
Re-render the armour set (`npm run operators:build -- wren --from armour --render`) after the fixes.

1. **The side straps sink into the chest plate between their buckle and the plate's side edge.** Measured in
   wren-armour.blend: about 150 side-strap vertices per side lie behind the chest plate's outer face, up to 3.2 mm
   deep, at x 0.10-0.126 m, z 1.163-1.185 m (deepest at (+-0.109, -0.142, 1.179)). The 8 mm plate's surface cuts
   through the 2.2 mm strap. Where: render f (the strap fades into the plate face beside the buckle, and its run to
   the plate edge starts about 30 px from the buckle instead of leaving it) and c (both side buckles). Likely cause:
   the section "pinned straight on the plate under and out of the buckle" (armour.py, about lines 655-657 for the
   shoulder strap, and the side strap's equivalent) runs straight while the plate face curves outward round the bust
   side and over the chamfer. Fix: lay the strap's on-plate run on the plate's outer face (`sm_ch.S(x, z, T_CH + LIP
   + clearance)` per sample, chamfer included) from the buckle's near half to the plate edge, then hand it to the hull
   path. Done: no strap vertex lies more than 0.3 mm behind any plate or trim face except the bonded ends inside a
   buckle half or a tab. Add `strapIntoPlateMm` (max per strap) to the sim report, under 0.3. In f and c the side
   strap leaves the buckle and runs on the plate over its side edge as one continuous flat band.

2. **The shoulder straps' front ends show over the buckle and meet it at an angle** (LOG open 1). Measured: 19 strap
   vertices per side lie within 1.5 mm outside the buckle metal, plus 7 strap vertices up to 1.1 mm into the chest
   plate at x 0.078 m, z 1.315-1.323 m. Where: h (wearer's left; the strap's corner folds over the near half's top
   face, and its outer edge overhangs the buckle) and c (both tabs). Fix: run the strap's last 20-25 mm straight
   along the buckle's `along` axis, centred on it, and end it inside the near half (or under a flush lip of it).
   Done: in h at 0.4 m no strap shows on top of either half. The strap's edges line up with the buckle's sides, and
   its end disappears into the near half with no corner or sliver. The same holds for the right strap in c.

3. **The two outer keyhole sockets in the receiver bar have broken, jagged walls** (LOG open 2). Where: e, the backL
   and backR sockets (dark wall streaks, a ragged outline on the right socket, a lighter floor showing through). The
   centre socket is clean. The splayed sockets do not snap to `bar_mesh`'s grid as the upright one does. Fix: build
   each socket in its own splayed frame, so the grid is aligned to the socket, or cut it as a separate clean
   extruded keyhole ring inlaid in the bar. Done: in e all three sockets have the same clean outline and continuous
   walls of even depth, with no dark streaks or see-through floors. The bar reads as one machined part.

4. **The back plate's lower band under the receiver bar reads wavy** (LOG open 3). Where: e (the band and its trim
   undulate along their whole width, and the bar's lower edge is not parallel to it), also visible in k and b. Fix:
   fair the bottom band and trim so they follow one smooth curve, for example by smoothing the shell's lower rows
   along x or taking the band from a lower-order fit, and keep the bar's lower edge at a constant distance above it.
   Done: in e the band and trim read as one straight, even-width moulded edge with no ripple, and the bar sits
   parallel to it. Back plate mean gap still under 6 mm, with nothing in the suit beyond the pressed depth.

5. **The bust points read through the chest plate** (LOG open 4). Where: c (two small apex points under the raking
   light) and, faintly, d. The LOG says the plate cannot sit lower, but it can sit higher: a rigid moulded shell
   bridges the apex. Fix: bridge the bust apex in the faired surface (a wider window or a local convex fill over the
   apex region only), so the plate face over each breast is one smooth convex form. Done: in c no point or dimple
   shows on the plate at the bust. Chest plate mean gap still under 6 mm and max under 15 mm, with `maxIntoSuitMm`
   still at or under the pressed depth.

## Logged follow-ups (acceptable now; record in LOG.md, do not fix in this round)
- F1. Wren's step 08 pouch items (`magPouches`, `adminPouch`, `radioPouch`, `radio`, `radioCable` retention "elastic
  loop, cummerbund", `ptt`, `medPouch`) still describe the carrier. Step 09 rewrites them (LOG open 5).
- F2. The empty radio recess reads as a bracket glyph at full-figure distance (b, k). Step 09's radio fills it.
  Re-check there.
- F3. Two small tab corners peek out beside the back strap ends (e, the left strap at the plate's top edge). Minor.
  Tidy them if the strap ends are touched for item 2.
- F4. Composite, rubber trim, gunmetal and suit sit close in value under the close-up rigs (the near-black-reads-grey
  issue, OPEN since 05). The materials still separate by texture and sheen.
- F5. The weaponMount handedness (blend +x = wearer's left = game backL at game x -0.07, A57) is to be confirmed at
  integration (A36, locomotion step 25).
- F6. The step 07 earpiece cable still ends in a free plug at the left collarbone (c, h). Step 09's PTT takes it.
