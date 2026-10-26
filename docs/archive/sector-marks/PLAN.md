# sector-marks - plan

Owner: Night Shift | Sector Ops Build. Status: current.

Opus plan for `docs/archive/sector-marks/BRIEF.md`. One PR, one slice (B1, Sonnet builder from `briefs/B1.md`). Every
file:line below was re-found on origin/master 2148ec96.

## Claims

```claims
files:
  - src/game/interactables.ts
  - src/game/gameState.ts
  - src/net/coopClient.ts
  - src/world/maps/campusSectors.ts
  - src/world/maps/campusS4Data.ts
  - src/world/maps/campusS5Data.ts
  - src/world/maps/campusS4Dress.ts
  - tests/campusObjectivePlace.test.ts
  - tests/exitBeacon.test.ts
  - scripts/e2e-sectorops.mjs
  - TESTING.md
  - docs/systems/modes-and-progression.md
  - docs/archive/sector-marks/**
maps: campusOps
protocol: none
save: none
```

## 1. What changes

| # | File | Line(s) on master | Change |
| --- | --- | --- | --- |
| 1 | `src/game/interactables.ts` | :1-5 imports; :81-84 constructor; :134-137 the default (`extract`) branch | export `drawsExitBeacon(mode: ModeId): boolean` (false for `sector`); constructor gets a third parameter `exitBeacon = true`; `add` draws nothing for `extract` when it is false (`light` stays null, `parts` empty). The item, its zone use and `nearest`'s skip (:162) are unchanged |
| 2 | `src/game/gameState.ts` | :728 | `new Interactables(this.scene, world.parts, drawsExitBeacon(opts.mode))`; :43 import. :839 (free roam) unchanged |
| 3 | `src/net/coopClient.ts` | :247 | `new Interactables(g.scene, g.world.parts, drawsExitBeacon(g.opts.mode))`; :18 import. No wire change |
| 4 | `src/world/maps/campusSectors.ts` | :315 S1, :406 S3 | the new `label` strings (BRIEF A4) |
| 5 | `src/world/maps/campusS4Data.ts` | :180 S4 | new `label` |
| 6 | `src/world/maps/campusS5Data.ts` | :169 S5 | new `label` |
| 7 | `src/world/maps/campusS4Dress.ts` | :176 (`around`), imports :13-21 | `Math.hypot(dx, dz)` -> `hyp2(dx, dz)`; `import { hyp2 } from '../../core/mathx'` |
| 8 | `tests/campusObjectivePlace.test.ts` | new | the place-word data test (BRIEF A5), campusOps only |
| 9 | `tests/exitBeacon.test.ts` | new | `drawsExitBeacon` per mode; on a NullEngine scene an `extract` item draws 2 parts by default and 0 with the switch off; a `terminal` still draws |
| 10 | `scripts/e2e-sectorops.mjs` | after :91 | one assertion: once a section's objective is done its `<id>-exit` item has no parts and no light |
| 11 | `TESTING.md` | insert after :28 | one checklist item (no green pole at any exit; each objective line names its room) |
| 12 | `changes/feature-sector-marks.md` | new | the fragment, `kind: patch` |
| 13 | `docs/systems/modes-and-progression.md` | insert after :74 (before "Team doors", :75) | one bullet: no exit beacon (G290), the exit is a zone only; objective lines name their room, checked by `tests/campusObjectivePlace.test.ts` |

Size: about 130 changed lines (src ~25, tests ~85, e2e 3, docs ~15). Under the ~1.5k cap.

Maps: campusOps data strings only (no geometry, no lamps, no guards); warehouseOps none (frozen); ctcourse none.
Wire paths: none (`NetItem.k` unchanged; `PROTOCOL_VERSION` untouched). Save paths: none. Flags: none (a rule fix to a
shipped feature, G355).

## 2. Why this shape
- The beacon is drawn by `Interactables.add`, which knows the kind but not the mode, and the co-op client builds its
  own `Interactables` (coopClient.ts:247) from the host's item list. A constructor switch, set by both builders, is the
  smallest explicit form; a global or a per-id rule would hide it. Cost: one line in `src/net` (BRIEF A3).
- The S1-S5 place words come from the map's own room tags (`S1_ROOMS`..`S5_ROOMS`, declared at `src/world/maps/campusS1.ts:49`,
  `campusS2.ts:142`, `campusS3.ts:116`, `campusS4.ts:209`, `campusS5.ts:178`), so the test ties each
  line to where the objective really is: S1 (19.3, 0, -76) Gatehouse; S2 (-6.5, 4.4, 4.3) Facilities Office; S3 (51,
  4.5, -3.8) Prototype Store; S4 (18, 0, 38.3) Server Cage; S5 (-43, 0, 43.4) Strongroom. Each point is in exactly one
  room by `inRoom` (`src/world/rooms.ts`, with the height).
- Connector and extraction labels already name places (`campusSectors.ts:317, :363, :408`, `campusS4Data.ts:182`,
  `campusS5Data.ts:170`); the test holds them to a looser rule (a place word of the map) so a later rename cannot drop
  the place.
- warehouseOps is skipped, not fixed (BRIEF A6): it fails on `warehouseSectors.ts:30` and `:157`.
- Marlow Build's half lives on its own branch with its own test; no shared helper (lead's instruction).

## 3. Tests and checks
- Builder repeat runs: `npm run typecheck:fast`; `npx vitest run tests/campusObjectivePlace.test.ts
  tests/exitBeacon.test.ts tests/campusS4Dress.test.ts tests/sectors.test.ts tests/campusS1.test.ts
  tests/campusS3.test.ts tests/campusS4.test.ts tests/campusS5.test.ts tests/campusArtGameplay.test.ts
  tests/vision.test.ts tests/sectorItemScope.test.ts`.
- e2e (the PR's `affected-e2e`, DIRECT_COVERS in `scripts/e2e-affected.mjs`, rules in `docs/systems/testing-tools.md`):
  computed with `selectSuites` on this file list: `smoke`, `e2e-gadgets`, `e2e-tactics`, `e2e-takedown`, `e2e-park`
  (src/game), `e2e-coop`, `e2e-netmove`, `e2e-ctcourse` (src/net), `e2e-levels`, `e2e-anchors` (src/world),
  `e2e-sectorops` (its script changed). Tests, docs, TESTING.md and the fragment add none. Nothing to request on top:
  the co-op group comes with the src/net line and e2e-sectorops with its script.
- Checkers: two independent Opus checkers (the PR touches `src/net`, RULES "A job"). Each reruns typecheck and the
  vitest list, reads the diff against this PLAN and BRIEF, and passes only with `affected-e2e` green.
- No GPU run: nothing drawn changes except a removed mesh (no lamp, no light, no material).

## 4. Risks
- An e2e or tool that looks for the pole: none found (`grep` over `scripts/` and `tests/` for the colour `4fdc7c`,
  `int-part`, `-exit`). The visual gate's views (origin/feature/visual-gate `scripts/visual-gate/viewpoints.mjs`) pin
  the start of a section, where no exit item exists yet.
- `SectorMode.blips()` (sectorMode.ts:1355-1359) still sends the exit as an objective blip to the compass until J3
  (Campaign) removes the compass. Not this job.
- Cross-job overlap, feature/campus-greybox (same lead, J17): it moves the S1 / S3 sector data out of
  `campusSectors.ts` into `campusS1Data.ts` / `campusS3Data.ts` and keeps v2 copies (`campusV2/s<N>Data.ts`) that a
  test holds equal to live. Lead's order: sector-marks merges first (a small rule fix, G355); campus-greybox then
  carries the four new labels and the `hyp2` change into its split files and its v2 copies (`campusV2/s1Data.ts`,
  `s3Data.ts`, `s4Data.ts`, `s5Data.ts`, `s4Dress.ts:177`) when it next takes master; its BRIEF gets that A-line
  (lead adds it with the J17 revision). `campusV2.test.ts:89` fails until the copies match, so it cannot be missed for
  the labels; `s4Dress.ts` has no such test, so the A-line names it.
  B1 edits master's files as they are on master.
- Other overlaps (`node scripts/claims-check.mjs --plan docs/archive/sector-marks/PLAN.md`, 2026-10-25 ~19:30; file level,
  each a few lines in a big file, no shared lines found; the train merges or the later branch rebases):
  feature/coop-kit and feature/player-batch-j19 (`gameState.ts`, `coopClient.ts`), feature/player-hygiene
  (`coopClient.ts`), feature/hud-guidance (+ -a1, -a3: `gameState.ts`, `coopClient.ts`, `e2e-sectorops.mjs`,
  TESTING.md), feature/guard-rules (`campusS4Data.ts`, `campusS5Data.ts`, `e2e-sectorops.mjs`: guard rows, not the
  objective labels), feature/test-runner-j20 (+ -pra, -prc, -s1, -s2, -s3a, -s3b, -s4, -s5, -s6a, -s6b, -s6c: `e2e-sectorops.mjs`; S6c adds a part-6 check,
  ours is one assertion after :91), feature/map-ready (same lead; it waits on its re-plan, sector-marks goes first).
  feature/sector-batch (same lead, J18) is being planned; its PLAN orders itself after this one.

## 5. Done looks like
No green disc or pole at any Sector Ops exit, on the host and on a co-op client; the four campus lines name their
room; the new test passes and would fail on a line without its room; `campusS4Dress.ts` has no `Math.hypot` and the S4
hero log is unchanged; affected-e2e and both Opus checkers green; PR body has `Job-done: sector-marks`.
