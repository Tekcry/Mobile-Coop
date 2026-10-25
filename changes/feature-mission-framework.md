# Mission framework: specs and sign-off pages, graph-svg
kind: patch
- Docs: `docs/missions/` holds the mission framework's BRIEF, PLAN and STATE, plus the research behind it. Six sign-off packs sit in `docs/missions/prototypes/`, all signed off by Michael on 2026-10-25; each has a beat chart, a mission graph, a plan image and a one-question sign-off page:
  - the new campaign map Tallow Wharf (4 sections, every section forces a co-op kit move);
  - its two missions, Three Grey Coats and Two-Key Ledger;
  - the Sector Ops missions Split Shift (campus S2) and Code Relay (campus S4);
  - the co-op kit moves.
- Tooling: `scripts/graph-svg.mjs` draws a level graph to scale from its `area` boxes and `at` points: 1 m = 10 px, north up, a scale bar, tracks coloured, objective / sync / lead nodes. `--base <svg>` overlays a plan SVG. Tests: `tests/graphSvg.test.ts`.
