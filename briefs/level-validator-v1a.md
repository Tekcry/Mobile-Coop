status: claimed Night Shift | Cloud Builder 1 2026-10-24T09:12Z

# level-validator V1a: scripts/metrics-gen.mjs + tests/metricsGen.test.ts + docs/design/metrics.json (Marlow Build)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator` at 2e5d23e7 or later (V2 merged: scale-sheet sections 7 and 8 exist).
- New branch: `feature/level-validator-v1a`. Edit ONLY `scripts/metrics-gen.mjs` (new), `tests/metricsGen.test.ts`
  (new), `docs/design/metrics.json` (new, generated). Do not edit the scale sheet (V2 owns it) or the validator (V1).

## What to build
Michael's M2 (docs/level-validator/BRIEF.md "M2", PLAN "Michael's changes" M2 -> V1a): every size and timing lives in
ONE metrics JSON generated from `docs/design/scale-sheet.md`; a test fails when the JSON and the sheet differ.
- `scripts/metrics-gen.mjs`: ES module, no dependencies. Exports `parseScaleSheet(markdown) -> metrics` (pure) and,
  when run as the entry (`import.meta.url` vs `process.argv[1]`, as scripts/heavy-lock.mjs does), writes
  `docs/design/metrics.json` (2-space JSON, trailing newline). `--check`: exit 1 if the file on disk differs from a fresh
  generation (CI-style), else 0. Exit 2 on a parse error that names the section and row.
- Parse sections 1 and 3 (the "Thing / Value" and "Item / Size" tables: read the numbers out of the cell text for the
  named rows), section 7 (parameter table + room table: GAME sizes, camera floor, ceilings, encounter) and section 8
  (Key / Value / Unit table, keys verbatim). Shape: the contract below. Never invent a value: a row that is missing is
  omitted.
- `tests/metricsGen.test.ts` (import with `// @ts-expect-error plain .mjs` like tests/heavyLock.test.ts): (1) the
  committed docs/design/metrics.json deep-equals `parseScaleSheet(<the real sheet>)` (the M2 match test);
  (2) spot values: corridor_min_w 3.0, corridor_w [3.5, 4.0], door_w 1.2, door_h 2.1, rules.split_max_s 90,
  rules.reach_max_s 15, rules.shared_min_w_m 2.0, rooms.stair_core.minW 2.6; (3) a changed inline sheet changes the
  output; (4) a malformed section 8 row throws with the row named.

## Shared contract: docs/design/metrics.json shape (fixed by the lead 2026-10-24 ~20:16; V1 reads it, V1a writes it)
```
{
  "source": "docs/design/scale-sheet.md",
  "sizes": {            // from scale-sheet sections 1 and 3 (metres)
    "door_w": 1.2, "door_min_w": 1.0, "door_h": 2.1, "door_double_w": [1.8, 2.0], "opening_w": [2.5, 3.5],
    "corridor_min_w": 3.0, "corridor_w": [3.5, 4.0], "play_space_min_short": 6.0,
    "ceiling_room": 3.0, "ceiling_hall": [4.5, 6.0], "storey_h": 3.3,
    "fire_stair_w": 1.3, "open_stair_w": <from section 3 if listed, else omitted>,
    "step_player": 0.42, "step_nav": 0.45, "nav_cell": 0.5, "agent_radius": 0.32, "headroom": 1.7
  },
  "roomParams": { <section 7 parameter table, keys verbatim: room_scale, room_round_m, camera floors ...> },
  "rooms": { "<class>": { "minW", "minL", "maxW", "maxL", "cameraFloor", "ceilMin", "ceilMax" (number or "open"),
                          "encounter": "yes" | "conditional" | "no" } },   // section 7 GAME sizes (already scaled)
  "rules": { <section 8 table, keys verbatim: split_speed_mps, reach_speed_mps, split_max_s, split_parity_pct,
             reach_max_s, shared_min_w_m, shadow_min_frac, shadow_max_frac, vantage_min_frac, los_break_max_s,
             step_band_min_m, step_band_max_m, grid_m> }
}
```
A key missing from the sheet is omitted (never invented); the validator WARNs once for a missing key and skips that check.

## Checks you run
`npx vitest run tests/metricsGen.test.ts` green; `npx tsc --noEmit` clean; `npx eslint tests/metricsGen.test.ts`;
`node scripts/metrics-gen.mjs --check` exit 0 after generating. Report counts.

## Done
Push `feature/level-validator-v1a` (trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), add a report at
the end of this file (keys produced, anything in the sheet you could not parse) and set
`status: done feature/level-validator-v1a <sha>`.
