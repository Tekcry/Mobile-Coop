# Stealth concept scratch scripts (D22-D24)

Scratch concept scripts from the D22 options pass and the A2 pick (copied from the session scratchpad, 2026-10-16).
They are reference for implementers, not part of the pipeline: nothing in `npm run operators:build` runs them, they
are not linted or tested, and they are not kept working.

- `stealth.py`: frames, helpers and concepts A / B / C (`docs/operators/concepts/D22-options/CONCEPTS.md`).
- `stealth_a2_head.py` + `a2_part.py` = `stealth_a2.py`: concept A2 (`docs/operators/concepts/A2/A2.md`): suit zones
  (`zones_a2`, `apply_suit_a2`), scratch materials (`mat_shell` micro-emboss, `mat_vent` perforation, `mat_grip`,
  `mat_comp` composite), `mag_buckle`, `mag_pouch`, `holster_a2`, `thigh_sleeves`, `back_kit` (pod, medkit, radio
  recess, cable), `rifle` (not built, D24), `boots_a2` (cut-down step 06 boot).
- `patch*.py`, `insp*.py`, `inspect.py`, `sheet.py`: one-off edits and probes made while iterating.
- They ran on a session-only `base.blend` (a full step 07 Wren build) that is not kept: rerun on
  `build/operators/wren/wren-head_kit.blend` or a later blend. A2.md gives the command line.
