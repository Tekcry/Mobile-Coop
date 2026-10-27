# G10a D4b check: corner_slide (receding temple corner)
Checker: fresh Opus, read-only. Delta `81a1f3b8..591c5c5c` (027a8f51 WIP + 591c5c5c): `build_head.py`,
`py/trials/hairline_selfcheck.py`, G10A-REPORT.md D4b. Spec `scratch/ctcore/briefs/gm-g10a-hairline-fix.md`.
No Blender, no locks, no bake folders touched (no local Python either: code reading only).

## Verdict: PASS
No defect that ships a wrong mesh or a lying check. Matches the brief (step 1 pinchVerts, step 2 CORNER_DEG 65 +
corner_slide after the relax, slides returned through snap_loops / snap_hairline into the JSON; despike, spike_deg,
reserve, budgets and HAIRLINE_LIMITS untouched).

## Findings
- On the line: every moved vertex is `polyline_point(line, s0 + par)`; dev stays 0. None (keptOwn) vertices keep
  `own[i] = X[order[i]]`, the same position `new` writes, so the turns it tests are the turns it ships.
- Order: par enters monotone (increasing_run + in-order fill; the 0.25/0.5/0.25 relax keeps diffs positive, also next to
  a None). A slide moves only i-1 / i+1, halfway into their own gap to i; nothing lies between them and i, so no
  vertex passes another, and i-1 / i+1 never cross (n >= 5).
- Seam: the relax can leave par[0] < 0 or par[n-1] > L; gaps are taken `% L`, so the arc across the seam is right in
  both cases; moved entries are re-wrapped, the return wraps all. polyline_point wraps anyway.
- Windings: snap_loops reverses the loop to the dense loop's direction first, so par rises for either mesh winding;
  the selfcheck covers both fan windings x both contour directions, corner mid-loop and on the seam.
- Degenerate points: no division in the slide; turn_degs_all clamps (1e-18) and returns 0 on an edge < 1e-9 m;
  a zero gap gives q[j] = par[i] (same point), the window test then fails and the loop stops. No new zero edge is made.
- Termination: bounded by 4 n steps; each kept step lowers the window max below the old global max and only i-2..i+2
  turns change (all in the window), so the global max never rises.
- Scope: only cap boundary loops (snap_hairline is called only in run_haircaps). Eye rings, the body seam and interior
  vertices are on other objects or not in `par`; UV seams are made after the snap (LOD0).
- Pinholes / reserve: close_pinholes runs before the snap as before; slides change no topology, so tri counts and the
  reserve are unaffected (LOD0 794 / 796 <= 800; LOD1 239 differs only because it decimates the slid LOD0).
- Measure: `hairline_measure(obj, lines, *snap_hairline(obj, lines))` runs the snap before reading the mesh; nothing
  moves vertices after it (unwrap, material, bake only). The check reads the final geometry.
- Hash: build_head.py is the heads-stage job script and `script` joins every job hash (guardBakePlan.mjs:443), so all
  heads + haircaps jobs (and lods after them) rebake. The selfcheck is a trial, imported by no job: no list needed.
- Fade LOD1 66.1 -> 62.0 (1 slide): the brief expected fade untouched (it read 61.1), but 66.1 > 65 so a slide is
  correct and harmless.

## Face stretch (builder's flag)
- No guard: no minimum gap, no flipped-face or sliver test on caps. k slides on one neighbour move it 1 - 2^-k of its
  gap (3 -> 7/8, 5 -> 31/32 possible at LOD1 receding).
- Risk is low: the move is along the boundary, toward the corner, a few mm on LOD1 edges of ~7-8 mm on a 240-tri
  far LOD; the snap's in-order fill and relax already move boundary vertices by similar amounts. A flip needs an
  interior vertex close to the corner's edge. LOD1 keeps LOD0's UVs, so the hair texture shifts along the slid
  boundary (also pre-existing for the snap). Visual check on the rebaked sheet is the proof, as the report says.

## Polish (not blocking)
1. A failed window test or a None sharpest vertex `break`s the whole loop; receding has two temples. Skip that vertex
   (a done set) instead of stopping, so the other corner still gets slid.
2. Add a minimum gap (e.g. stop when the slid gap < 1/8 of the loop's mean edge) and a diagnostic `minEdgeMm` per LOD
   so slivers are visible in the JSON.
3. Optional cheap cap test: count triangles whose normal flips against the dense source after the snap (catches the
   stretch case without a look).
4. Selfcheck gaps: no case with a None (keptOwn) neighbour, none with two corners in one loop.
5. `n < 5` returns par un-wrapped (harmless; polyline_point wraps).
