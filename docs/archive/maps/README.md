# Archived map designs

Superseded vertical-slice attempts, archived 2026-10-10 (D0 docs cleanup):

- the 1934 Kestrel Exchange (prompts, layouts, plans, progress)
- the Trunk Annex and Dead Line v1 and v2 designs (checks, bots, validation, renders, gate reports)
- the First Playable milestone prompt

Do not use these for new maps; see `docs/kestrel/`. Design tooling here imports from `docs/design/`, so
its relative imports are broken on purpose; it is history, not a working toolchain.
The files the code still reads stay in `docs/design/`.

Added 2026-10-17 (consolidation, the retired maps' code deleted: `docs/consolidation/deleted-maps.md`), moved from
`docs/design/` into `design/`: the Dead Line v1 and v2 design data and tooling (`map-dead-line.json`, `map-dead-line.png`,
`map-dead-line-v2.json`, `dead-line-v2-area1.svg`, `dead-line-v2-engine-check.md`, `map-dead-line-core.mjs`,
`map-dead-line-engine.mjs`, `map-dead-line-sim.mjs`) and the Trunk Annex design JSON (`map-trunk-annex.json`).
`docs/design/scale-sheet.md` stays (the Kestrel facts and the editor's climb catalogue cite it).
