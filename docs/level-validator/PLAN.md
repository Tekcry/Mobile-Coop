# level-validator - plan

Opus plan, 2026-10-24 ~20:05. Read with `BRIEF.md` (the ask, the approval record, the rule mapping table, A1-A12).
Owner of every slice: **Night Shift | Marlow Build** (lead). V1 runs on the **cloud-queue** (needs only node + vitest).
Model rule (Michael): Sonnet builds from strict briefs; Opus writes the graph schema (V0) and the section 11 rewrite (V4);
one fresh Opus checker for the batch; one PR to master. Docs tier: CI `npm run check` only, no e2e (V1 adds one Vitest
file, which CI runs).

## File ownership (two agents never edit the same file)
| File | Owner slice |
| --- | --- |
| `docs/level-validator/graph-schema.md`, `docs/level-validator/example.graph.json` | V0 |
| `docs/templates/map-spec.md` | V0 |
| `scripts/level-validate.mjs`, `tests/levelValidate.test.ts`, `briefs/level-validator-v1.md` | V1 |
| `docs/design/scale-sheet.md` | V2 |
| `docs/level-design.md` | V3 + V4 (ONE Opus agent, V4 first then V3, same file) |
| `docs/sector-redesign/graph/campusOps-S1.json` + `docs/level-validator/campus-run/S1.md` | V5a |
| `docs/sector-redesign/graph/campusOps-S2.json` + `docs/level-validator/campus-run/S2.md` | V5b |
| `docs/sector-redesign/graph/campusOps-S3.json` + `docs/level-validator/campus-run/S3.md` | V5c |
| `docs/level-validator/campus-run/REPORT.md`, `docs/level-validator/campus-run/run.txt` | V5d |
| `docs/systems/testing-tools.md`, `changes/feature-level-validator.md`, `TESTING.md` | DOC |
| `docs/level-validator/STATE.md`, `BRIEF.md`, `PLAN.md` | the lead only |

## Slice table
| Id | What | Model | Parallel now? | Needs | Estimate |
| --- | --- | --- | --- | --- | --- |
| V0 | Graph JSON schema doc + example + template line | Opus | yes | - | 30 min |
| V1 | Validator port: pure module + CLI + Vitest | Sonnet (cloud-queue) | yes (builds on the core schema below) | - | 60-90 min |
| V2 | Room-size-by-type table in the scale sheet | Sonnet | yes | - | 20 min |
| V4 | Section 11 two-player co-op rewrite | Opus | yes | - | 45 min |
| V3 | Numeric targets + the validator gate in level-design | Sonnet rules, written by the V4 Opus agent in the same pass | yes (with V4, same agent) | - | 30 min |
| V5a-c | Campus S1 / S2 / S3 graphs + per-section findings | Sonnet x3 (strict brief per section) | after V0 lands | V0 (V2 for room classes) | 45 min each, parallel |
| V5d | First validator run + REPORT with patch / re-plan verdicts | Opus | after V1 + V5a-c | V1, V5a-c | 30 min |
| DOC | testing-tools entry, changelog fragment, TESTING line | Sonnet (or Haiku) | yes | the CLI interface below | 15 min |
| CHK | One fresh Opus checker over the batch, then one PR | Opus | last | all | 30 min |

Start now in parallel: **V0, V1 (cloud), V2, V3+V4 (one agent), DOC**. Then V5a-c together, then V5d, then CHK + PR.

## Core schema (fixed here so V0 and V1 run in parallel; V0 documents it, it does not change it)
A map's graph is one JSON object, or several files (one per section) the CLI merges: `meta` from the first file,
`spaces` and `links` concatenated, `meta.sections` unioned in file order.

```json
{
  "meta": { "map": "campusOps", "name": "Saltmarsh Park", "mode": "campaign", "players": [2],
            "sections": ["S1", "S2", "S3"] },
  "spaces": [
    { "id": "s1-carpark", "section": "S1", "type": "encounter", "room_class": "car_park",
      "function": "Staff car park, two rows under the deck", "storey": 0, "size": [24, 30, 3.3],
      "tension": 2, "shadow_pct": 0.5, "los_break_s": 4, "vantage": { "from": "s1-verge", "sees_pct": 0.7 },
      "guards": { "2": 4 }, "phase": "early", "tags": ["entry"] }
  ],
  "links": [
    { "from": "s1-verge", "to": "s1-carpark", "kind": "opening", "route": "shadow", "width": 3.0, "height": 2.1,
      "length": 6, "reason": "Pedestrian gap in the verge fence" }
  ]
}
```

- `space.type`: `encounter`, `connector`, `hub`, `safe_room`, `objective`, `reward`, `exterior`, `utility`, `stair_core`, `duct`.
- `space.room_class`: a key of the V2 table, or `custom` (WARN, needs a reason in the design doc).
- `space.function`: required, non-empty (level-design 16.0 reason test; ERR when missing).
- `space.size`: `[w, l, h]` metres, w = short side; h = clear ceiling. `storey`: floor y in metres.
- `space.tension`: 1-5 (the beat chart; spine order = `meta.sections` order, then space order in the file).
- `space.tags`: `start`, `exfil`, `objective`, `checkpoint`, `reward`, `entry` (section entry), `exit` (section exit),
  `split:<id>:a`, `split:<id>:b`, `overwatch:<id>`, `sync_pair` (a dual takedown pair lives here).
- `link.kind`: `door`, `double_door`, `opening`, `roller_door`, `corridor`, `fire_stair`, `open_stair`, `ladder`,
  `duct`, `tunnel`, `window`, `hatch`, `ledge`, `pipe`, `drop`, `wall_jump`, `split_jump`, `coop_boost`, `human_ladder`.
  Co-op kinds (need two players): `coop_boost`, `human_ladder`. No rope / zipline / rappel (G110). One-way by default:
  `drop`.
- `link.route`: `shadow`, `high`, `loud`, `secret`, `spine` (the connector between two sections).
- `link` optional: `width`, `height`, `length` (m, walking length), `level_change` (m), `shared` (both partners move
  through together: width >= 2.0), `one_way`, `assist: "<splitId>"` (this action opens / darkens / disables for the
  other leg), `reason` (one line, 16.9).

## V0 - graph schema (Opus)
- Files: `docs/level-validator/graph-schema.md` (the field table above with every rule each field feeds, ERR / WARN per
  BRIEF mapping table, the merge rule, how to estimate `shadow_pct` / `sees_pct` / `los_break_s` before geometry, A8);
  `docs/level-validator/example.graph.json` (two small sections joined by one `spine` link, one split with an
  overwatch and an assist; must pass V1 with 0 errors: it is V1's CLI smoke fixture);
  `docs/templates/map-spec.md`: under "Phases (fixed)" one line: "Before Phase 3 (build): the map's connectivity graph
  (`docs/level-validator/graph-schema.md`) passes `node scripts/level-validate.mjs` with 0 errors; WARNs are justified
  in the design doc. (Michael 2026-10-24, "Add 1-4 as extras".)"
- Gate: the checker reads the schema against BRIEF's mapping table: every row has a field or is marked "design doc".
- Tests: none of its own; V1's test loads `example.graph.json` once V0 lands (CHK runs it).

## V1 - validator port (Sonnet, cloud-queue)
- Files: `scripts/level-validate.mjs`, `tests/levelValidate.test.ts`, brief `briefs/level-validator-v1.md` (the lead
  writes it from this section + BRIEF's mapping table before queueing).
- Shape: ES module, no dependencies, no Babylon, no `src/` import. Exports pure functions; the CLI part runs only when
  the file is the entry (`import.meta.url` vs `process.argv[1]`, as `scripts/heavy-lock.mjs` does).
  - `mergeGraphs(graphs[]) -> graph`
  - `parseRoomTable(markdown) -> { [room_class]: { minW, minL, maxW, maxL, minH, maxH, encounterOk } }` (reads the V2
    table under the heading "Room sizes by type"; A7)
  - `validate(graph, { rooms }) -> { errors: string[], warns: string[] }`, built from small exported checks:
    `checkStructure`, `checkDimensions` (rooms, openings, grid, ceilings, 0.40-0.45 level changes, corridor widths),
    `checkReach` (2-player reach of every space, objectives and exfil; no softlock: spaces reached by a co-op link also
    reached without one), `checkSpine` (every start -> exfil path passes each section in order: removing a section's
    spaces disconnects start from exfil; a `spine` link joins only consecutive sections), `checkEncounters` (3+
    approaches of 2+ kinds; shadow + high + loud each; secret in half; routes cross; dead ends; shadow 0.4-0.6; vantage
    >= 0.7; LOS <= 5 s; guards early 3-6 / late 6-10, ERR > 10, non-decreasing by player count),
    `checkRedundancy` (per section, edge-disjoint entry -> exit routes >= 2; unit-capacity max flow, port of
    `edge_disjoint_paths`), `checkCoop` (coverage: half of encounter spaces + every section; per split: legs <= 117 m
    (90 s at 1.3 m/s), parity within 20%, an `overwatch:<id>` space, >= 1 `assist`, partner reach <= 45 m (15 s at
    3.0 m/s); `shared` links >= 2.0 wide), `checkPacing` (no 3 tensions >= 4 in a row; open at 1-2; WARN no 1-2 after a
    peak).
  - Constants at the top with their source comment: `SPLIT_SPEED = 1.3`, `REACH_SPEED = 3.0`, `SPLIT_MAX_S = 90`,
    `REACH_MAX_S = 15`, `SHARED_MIN_W = 2.0`, corridor `3.0 / 3.5 / 4.0`, door `1.0 / 1.14 / 1.2`, height `2.0 / 2.2`,
    duct `1.2 x 1.5`, fire stair `1.3`, open stair `2.4`, ceiling `2.4 / 3.0`, step band `0.40-0.45`, grid `0.5`.
    Path lengths: sum of link `length` + half of each passed space's long side (A5).
  - Safe drop: grep `src/config/movement.ts` / `src/player` for the landing or fall-damage height; if one exists, add
    a `drop` `level_change` ERR above it; if none, a WARN above 3.5 m (the skill's number) and a comment saying so.
- CLI: `node scripts/level-validate.mjs <graph.json> [more.json ...] [--rooms docs/design/scale-sheet.md]`; prints
  `ERROR: ...` / `WARN:  ...` lines then `N error(s), M warning(s).`; exit 1 on any error, 2 on bad usage. Default
  `--rooms` is `docs/design/scale-sheet.md`; if its table is missing (V2 not merged yet) room-class checks are skipped
  with one WARN.
- Tests (`tests/levelValidate.test.ts`, import with `// @ts-expect-error plain .mjs` like `tests/heavyLock.test.ts`):
  one inline minimal valid graph (0 errors), then one failing fixture per check (each asserts the exact ERR text
  fragment): unreachable space, co-op-only space with no other route, a section skipped on the spine, encounter with 2
  approaches, missing loud route, 1 independent route, dead end on a route, corridor 2.9, door 0.9, step 0.42, ceiling
  2.3, off-grid 3.3, split 120 m, split parity 30%, no overwatch, no assist, partner 50 m, shared 1.8, 3 high beats,
  guards 11, coop guards below 2-player count, room-class too small (table from an inline markdown string), merge of
  two files, `parseRoomTable` on the real `docs/design/scale-sheet.md` once V2 is in (skip if the heading is absent).
- Gate: `npx vitest run tests/levelValidate.test.ts` green; `npx eslint scripts/level-validate.mjs
  tests/levelValidate.test.ts` clean; `npx tsc --noEmit` clean. CI `check` on the PR.

## V2 - room table (Sonnet)
- File: `docs/design/scale-sheet.md`: new section "7. Room sizes by type" (after 6), one markdown table, columns
  exactly `| Class | Min w x l | Max w x l | Ceiling | Encounter? | Note |` (V1 parses it: class key in backticks).
- Rule for "camera-adjusted" (from sections 2-3 of the sheet): an encounter space is at least 6 m on the short side
  (play space); any room a player walks through is at least 3.5 m on the short side unless it is a corridor (3.0 floor),
  a stair core, a duct or a recess, because the boom needs 0.78 m shoulder clearance each side and 2.4 m behind; rooms
  under 6 m are never encounter spaces. Ceilings: 3.0 rooms, 4.5-6.0 halls.
- Draft values (the builder copies them; the checker confirms each against the rule; real-world floor from the skill's
  3.5 table, raised where the camera needs it):

| Class | Min w x l | Max w x l | Ceiling | Encounter? |
| --- | --- | --- | --- | --- |
| `private_office` | 3.5 x 4.5 | 4.5 x 6 | 3.0 | no |
| `open_office` | 12 x 15 | 30 x 40 | 3.0-3.3 | yes |
| `meeting_room` | 4.5 x 6 | 6 x 10 | 3.0 | only at 6+ short side |
| `restroom` | 3.5 x 5 | 6 x 8 | 3.0 | no |
| `break_room` | 6 x 6 | 8 x 10 | 3.0 | yes |
| `server_room` | 6 x 8 | 15 x 20 | 3.0-4.5 | yes |
| `security_room` | 4.5 x 5 | 6 x 8 | 3.0 | only at 6+ short side |
| `gatehouse` | 4 x 6 | 8 x 12 | 3.0 | only at 6+ short side |
| `lobby` | 12 x 12 | 25 x 30 | 4.5-9 (atrium) | yes |
| `lab` | 6 x 8 | 12 x 24 | 3.0-4.5 | yes |
| `warehouse` | 25 x 40 | 60 x 120 | 6-12 | yes |
| `loading_dock` | 15 x 20 | 30 x 40 | 4.5-8 (or open) | yes |
| `plant_room` | 6 x 8 | 20 x 30 | 4.0-6.0 | yes |
| `storage` | 3.5 x 4 | 15 x 25 | 3.0-6.0 | only at 6+ short side |
| `corridor` | 3.0 x 3 (target 3.5-4.0) | 4.0 x 80 | 3.0 | no |
| `stair_core` | 2.6 x 5.6 (fire stair) | 6 x 8 | storey 3.3 | no |
| `car_park` | 15 x 20 | 60 x 80 | 2.4-3.3 deck, open | yes |
| `yard` | 15 x 15 | 80 x 120 | open | yes |

- Gate: Sonnet checker (in CHK batch): every row obeys the rule; the stair core matches the sheet's fire stair (1.3
  flights + landing) and `SW_CORE` 2.6 x 5.6 in `campusS2.ts:90`. Tests: V1's `parseRoomTable` test reads it.

## V4 - section 11 rewrite (Opus) then V3 - numeric targets (same agent, same file)
- File: `docs/level-design.md` only.
- V4 replaces section 11's body (keeps the heading "## 11. Co-op layering"; the old text moves to a short "Replaced
  2026-10-24" note at the end of the "Open items" entry 1, which is marked resolved). New rules, numbered 11.1-11.9:
  1. Two players, always (G2, G50): every map is completable by two players and by no fewer; no solo fallback is
     required (Open items 1, Michael 2026-10-22 "Co-op only"). Sector Ops may list 3-4 players (A2).
  2. Linear spine between sections (CT co-op research), loops inside them; no route skips a section.
  3. Splits <= 90 s per leg at stealth pace (1.3 m/s, about 117 m), legs within 20% of each other.
  4. Partners act for each other: every split has at least one assist (a door opened, lights cut, a camera disabled
     for the other leg).
  5. An overwatch spot per split: one partner can see and cover the other's leg.
  6. A downed partner is reachable within 15 s (3.0 m/s, about 45 m of path) from anywhere in a split; no softlock:
     every surface a co-op route reaches has another route (old 11.4's revive clause kept: reviver within 1.5 m of height).
  7. Shared routes (both partners together) >= 2.0 m wide; corridors stay 3.5-4.0 (scale sheet).
  8. Co-op reach: keep old 11.3 (lip 0.5 m above solo reach 3.8, band 4.3-4.5) and 11.5 with the G81 marked-spot note.
  9. Co-op verbs: keep old 11.6 (boost, human ladder, dual takedown; no rope, G110); co-op routes in at least half the
     encounter spaces and in every section; guard counts recorded per player count (A2).
  Each rule names its validator check (`checkCoop`, `checkReach`, `checkSpine`).
- V3 adds the numeric targets where they belong (additions, nothing removed): 3.1 a vantage sees ~70% of the space
  (plus the existing every-guard-in-one-cycle rule); 3.2/3.3 the routes cross at least once inside the space; 3.4 line
  of sight breakable within ~5 s from any point of a stealth route; 4.9 guard counts per encounter space 3-6 early /
  6-10 late (by spine half), never > 10, rising with player count, inside the 12.1 caps; 5.5 (new) 40-60% of an
  encounter space's floor in shadow; section 13: a new deliverable "Connectivity graph" (link to
  `docs/level-validator/graph-schema.md`) listed first, before the floor plans; section 14: Phase 2 ends with the
  validator run (0 errors, WARNs justified) as the gate to Phase 3 (greybox); 15: "the map's graph passes the
  validator" as an acceptance line. Every addition carries "(Michael 2026-10-24, 'Add 1-4 as extras')".
- Gate: the Opus checker diffs the file: additions only outside section 11 and the Open items entry 1; no number
  loosened; every Michael number present (90 s, 20%, 15 s, 2.0 m, 70%, 40-60%, 5 s, 3-6 / 6-10).

## V5 - campus S1-S3 first run (replaces the paused campus-audit)
- V5a / V5b / V5c (Sonnet, parallel, one per section, after V0 lands): write
  `docs/sector-redesign/graph/campusOps-S<n>.json` by hand (A9) from `docs/sector-redesign/SPEC.md` (S1 line 186, S2
  273, S3 327; the element register, the co-op routes table line 516, the posted-guards table line 499) and the built
  map data: room boxes `S1_ROOMS` (`campusS1.ts:49`), `S2_ROOMS` (`campusS2.ts:142`), `S3_ROOMS` (`campusS3.ts:116`),
  `C1_BOX` / `C1_GAP` / `S1_DOORS`, `C2_BOX` / `S2_DOORS` / `S2_FLOORS` / `S2_CORES` / `FEATURE_STAIR`, `S3_DOORS` /
  `S3_L1`, co-op lips (`S1_COOP_LIPS`, `S2_COOP_LIPS`), guards per zone from `campusSectors.ts`. The graph describes the
  map AS BUILT (sizes measured from the boxes, door widths from the gaps), not as intended: the point is to find the
  faults. Every value they could not measure is marked in a `"note"` field and listed in their `S<n>.md`.
  `docs/level-validator/campus-run/S<n>.md`: the space list with sources (file:line), estimates used (shadow, vantage,
  LOS) and why, and the hand findings the graph cannot carry (door swings into corridors, out-of-bounds reach from the
  campus-audit brief's list: only when proven from collision / nav data, with coords).
- V5d (Opus, after V1 + V5a-c): run `node scripts/level-validate.mjs docs/sector-redesign/graph/campusOps-S1.json
  ...-S2.json ...-S3.json`, save the output to `docs/level-validator/campus-run/run.txt`, and write
  `docs/level-validator/campus-run/REPORT.md`: counts per section (ERR / WARN by rule), each error tied to a place
  (space id, coords from the boxes), a verdict per section: **patch** (fixes inside the current shell: widen doors,
  move partitions, add a route) or **re-plan** (the shell or the section's topology fails: spine skip, < 2 routes,
  rooms under class minimums across the section), with a rough effort, and 5-10 lines for Michael. Michael's
  campus-audit complaints (rooms randomly placed, hallways too small, no space when doors open, out-of-bounds reach,
  poor flow) are each answered by named findings or "not found".
- Gate: the Opus checker spot-checks 5 graph sizes against the source boxes per section and reruns the CLI.
- Estimate: V5a-c 45 min each in parallel; V5d 30 min.

## DOC (Sonnet or Haiku)
- `docs/systems/testing-tools.md` "Helper scripts": `level-validate.mjs` (usage line, exit codes, the graph schema
  link, "every map passes before greybox"). `changes/feature-level-validator.md` (format: `changes/README.md`): one
  "Added" entry for the validator + graph schema, one "Changed" entry for the level standard / scale-sheet additions.
  `TESTING.md`: one line in the map checklist, "the map's graph passes `node scripts/level-validate.mjs`".
- Gate: in the CHK batch. Tests: none (docs).

## CHK and PR
One fresh Opus checker over V0-V4 + DOC + V1 code (V5 rides the same PR if done, else a second docs-only PR): reads the
diff against BRIEF's mapping table and this plan's gates, runs `npx vitest run tests/levelValidate.test.ts` and the CLI
on `example.graph.json` (cloud or desktop single file, not heavy). At most one fix round (Opus for a failed Sonnet
slice). Then one PR to master; the orchestrator records Michael's "Add 1-4 as extras" in `docs/DECISIONS.md` at the
merge.

## Risks
- V0 and V1 in parallel can drift: the core schema above is binding; V0 may add descriptive text, not fields. Any
  field V0 needs that is not here goes to the lead, who updates V1's brief before it is queued.
- Campus sections are bigger than one "space": S1 holds several encounter spaces (gatehouse, car park, forecourt), so
  guard counts and the 3-route rule are per encounter space, not per section (A2, A3).
- Estimates in the graph (A8) can hide faults; V5 lists every estimate so Michael sees what was measured and what was
  guessed.
