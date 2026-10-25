# Validator port S4: training checks (taught_by, teach, side routes)
kind: patch
- Level validator, training maps (`scripts/level-checks/training.mjs`): a new `meta.taught_by` names the section where
  the last co-op kit move is taught on its own (an error when missing or not one of `meta.sections` on a training map,
  and on any other mode). Up to and including that section each section is one guided route: an error for a side route
  (2+ routes), for a `split:` tag, for no teach element, and for a teach element some entry-to-exit path avoids.
- Teach elements: a link field `teach: "<move>"` or a space tag `teach:<move>` (free text from the map's teach list, so
  moves with no link kind, such as the jam relay or the console loop, count).
- Routes are counted on the section's own spaces and links (no spine link), entry to exit, never entering a space
  twice; links between the same two spaces in the same direction are one step, and a split's legs are one route. So a
  drop back beside a boost, or an objective loop that returns to its space, is still one route. Exported as
  `sectionRoutes(graph, section)` -> `{ count, paths }` (count stops at 10; a merged split is `split:<id>` in `paths`)
  for the route-run harness.
- After `taught_by`, a section with 2+ routes needs a guarded encounter space (a side route only when training against
  enemies), and then the campaign route rules run on it: three approaches of two kinds with shadow, high and loud, and
  routes that cross. A section whose only second way is a split needs neither.
