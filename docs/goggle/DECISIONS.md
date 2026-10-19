# Goggle job - decisions

Michael's answers (M1, M2, ...) as relayed by the orchestrator, and assumed decisions (A1, A2, ...) with how to undo
them. At the merge Michael's answers move into master's `docs/DECISIONS.md` with the next free G numbers (G89).

## Michael

**M1 The surround is the device (2026-10-19).** Michael, on the orchestrator's dashboard (relayed): the goggle surround
he meant is the device, the 3D housing round the lenses, not the night-vision screen edge. PLAN step 2 (the screen
surround in `cinematicPost.ts`) is dropped; the eyepiece tunnel stays as it is.

**M2 Scratch prototypes before the pick (2026-10-19).** Michael (relayed): he wants quick scratch prototypes of A, B and
C before he picks, "quick only". Made on the laptop without Blender, renders or LODs:
`docs/goggle/prototypes/options.html`.

## Assumed

**A1 The prototypes page is inline SVG from measured shapes.** One self-contained HTML file (no libraries, nothing
fetched): flat-shaded primitives projected to front, side and 3/4 views, all at one scale, with the current goggle from
`head_kit.py`'s numbers as the reference row. The head is an ellipsoid from SPEC's head proportions plus the hood, not
Wren's mesh. Undo: delete `docs/goggle/prototypes/`.
