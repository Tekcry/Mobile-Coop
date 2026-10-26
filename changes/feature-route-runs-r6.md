# Route-runs: the points table check
kind: patch
- Route-runs (tooling): a points table is checked against the map graph it plans before a run; a table made on
  another build of the map, with a different link count or with links in another order is refused with a plain
  message, and runs that will be unplannable are noted up front. The table can also be made on the spot with
  level-measure (`scripts/route-run/points.mjs`, unit tests).
