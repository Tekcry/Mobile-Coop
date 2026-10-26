# Marlow Yard re-plan: variant base
kind: minor
- Marlow Yard re-plan, slice S0 (dark behind `?marlowreplan=1`, default off): the re-planned yard builds as its own unlisted
  map `ctcourseReplan` (same set builders, then a per-set `replan/<set>.ts`, the site floor cut round each set's floor
  holes, a re-plan light circuit table where every light works). A bay can now carry numbered stations (`StationDef`).
  With the flag off nothing changes: the built yard, its geometry checksums and light files are untouched.
