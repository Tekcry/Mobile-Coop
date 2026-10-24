# campus-greybox - BRIEF

Job: build the signed-off Saltmarsh Park plans (Sector Ops map `campusOps`, sections S1-S5) as greybox, merged dark behind
`flags.campusV2` until Michael accepts each section's walk. Lead: Night Shift | Sector Ops Build. Branch
`feature/campus-greybox` (P0 and integration); five section lanes `feature/campus-greybox-s<N>` in their own worktrees.

## Michael said

The five picks, 2026-10-25 ~08:50, native multiple choice (the option text he chose, verbatim; pages
`docs/sector-redesign/signoff/S<N>.md` on `origin/feature/sector-redesign-signoff`, section "Michael's pick"):

| Section | Question | Michael picked |
| --- | --- | --- |
| S1 gatehouse, car park, forecourt | Build Campus S1 to this plan? | "Go as drawn (15 guards)" |
| S2 HQ atrium and offices (Split Shift) | Build Campus S2 to this plan? | "Go: void 14.5 m, 18 guards" |
| S3 lab block (re-plan) | Rebuild S3 to this plan? | "Re-plan as drawn, 20 guards" |
| S4 data hall (Code Relay) | Build Campus S4 to this plan? | "One 6 m goods-in lobby" (corridor and lobby merged) |
| S5 Old House and extraction | Build Campus S5 to this plan? | "26 guards, inside the 32 cap" (no cap raise) |

The words every page builds on: "I would prefer having as many guards as realistically possible to make it challenging."
(2026-10-24 ~22:00); and "each section should gradually get harder with more guards and more security." (2026-10-23 ~01:20,
quoted in `S1-detail.md` section 6).

## Sources

- Plans (`origin/feature/sector-redesign-signoff`, `docs/sector-redesign/signoff/`): `S<N>.md` (page + pick),
  `S<N>-detail.md` (change list, guards, sync nodes, assumptions AS<n>, section "Greybox build cost" = the slices),
  `S<N>-plan-<y>.svg`, `SYNC.md` (sync nodes; contract agreed with Marlow Build), `README.md`, `checks-signoff.md`.
- Plan graphs: `docs/sector-redesign/graph/plan/campusOps-S<N>.json` on the sign-off branch; validator graphs
  `docs/sector-redesign/graph/campusOps-S<N>.json` on master.
- Live code: `src/world/maps/campusS<N>.ts`, `campusS<N>Dress.ts`, `campusS<N>Data.ts`, `campusSectors.ts`, `campusLips.ts`,
  `campusOps.ts`, `campusDress.ts`; Marlow's missions `origin/feature/mission-framework:docs/missions/prototypes/`
  (`split-shift/BEAT.md` S2, `code-relay/BEAT.md` S4).
- Rules: `git show origin/master:CLAUDE.md` ("Sessions", "Hard rules"), `docs/systems/agent-preamble.md`, `docs/level-design.md`.

## Assumed decisions (logged overnight / by the lead; each undoable)

- **A1 Dark merge per section.** Each section is rebuilt in its own v2 files `src/world/maps/campusV2/s<N>.ts`,
  `s<N>Dress.ts`, `s<N>Data.ts`, picked per section by `flags.campusV2` (`src/core/flags.ts`, default `CAMPUS_V2_ON = []`:
  production unchanged; owner Sector Ops Build; switch-on = the day Michael accepts that section's walk, the lead adds the
  number to `CAMPUS_V2_ON`). The map reads sections only through `CAMPUS_PARTS` (`src/world/maps/campusSections.ts`).
  Undo: delete `campusV2/` and the five V2 imports in `campusSections.ts` (the selector then always returns v1).
- **A2 PR per lane slice group, under ~1.5k changed lines** (PLAN "PR grouping"). Undo: one PR per section.
- **A3 Greybox exit = a measured level-validator pass** (`scripts/level-validate.mjs` V6 `--require-measured`) on the
  section's graph. The flag is not on master yet (2026-10-25): a section's greybox exit, and its walk offer, wait for it.
  Undo: none (CLAUDE.md Intake 5).
- **A4 P0 copies the live code verbatim** into `campusV2/` (~4.6k lines) so each lane's PR shows only its real changes.
  The P0 PR is over ~1.5k lines because of the copy; `tests/campusV2.test.ts` proves every copy builds the same campus.
  Undo: replace the copies with `export *` re-exports; each lane then copies its own files in its first slice.
- **A5 Section data split out of `campusSectors.ts`.** S1-S3 guards, routes, cameras, alarms and sector defs moved
  verbatim into `campusS1Data.ts` .. `campusS3Data.ts` (like the existing S4 / S5 data files); every data file exports
  `S<N>_PARTS` (`campusParts.ts` type). `campusSectors.ts`, `campusLips.ts`, `campusOps.ts`, `campusDress.ts` only
  combine the parts in section order. Undo: inline them back (git revert of the P0 data commit).
- **A6 Joins stay live.** A v2 file imports another section's constants only from the live (v1) file: `C1_GAP` and the
  `CoopLip` type (`campusS1.ts`), `C2_FLOOR` (`campusS2.ts`), the `ArmourPiece` type (`campusS4Data.ts`). No plan moves
  C1, C2, C3 or C4, so the live values are the truth. A lane never imports another lane's `campusV2` file. Undo: a shared
  `campusV2/joins.ts`.
- **A7 Shared items have one owner, the lead** (PLAN "Shared, one owner"): `CAMPUS_SCREEN_CAP` (12; S5's pick keeps the 32
  live cap), the C3 / C4 stub connectors and `STUB_NAV_SEEDS` (`campusOps.ts`), `BOARD_ORDER`, `campusBake.ts`,
  `campusParts.ts`, `campusSections.ts`, the combiners, `tests/campusV2.test.ts`. A lane that needs one changed asks
  the lead; the lead lands it on `feature/campus-greybox`. Undo: name a lane owner per item.
- **A8 Engine work is its own Opus lane** (`feature/campus-greybox-engine`): S2 C18, the solo window on pair gates
  (`src/game/sectors.ts`, `SectorPairGate`, two players only today), and any engine check a lane trips (S2's rappel onto a
  1.2 m ledge into a window anchor). Everything else in the five plans is data on existing devices (E1 keypads, E3 pair
  gates and bolts, E4 boards with `window`, E6 desks, intel). Marlow's mission-framework edits `sectors.ts` /
  `sectorMode.ts` too: the engine lane rebases on master after Marlow's merge. Undo: S2 builds without C18 (solo takes the
  comms door past K2, S2-detail AS6).
- **A9 `?campusv2=1,3` works in production builds** so Michael can walk a dark section on `/preview/` before switch-on
  (`?campusv2=0`: none). The layout is not on the wire: every co-op peer opens the same link. Undo: read it only under
  `import.meta.env.DEV`.
- **A10 Walk cap.** Each section plan is +1 unwalked campus feature (the pages say so). The lead offers at most 3 unwalked
  campus sections at a time (CLAUDE.md "Walk pacing"); building dark continues meanwhile. Undo: count the campus as one
  feature (ask Michael).
- **A11 Live assets stay live.** The v2 dress files read the live hero reports (`campusArt/assets/hero-s<N>.json`). A
  lane that needs a new or changed asset writes it under a `-v2` name and points its own dress file at it; it never
  overwrites a live asset. Undo: none needed.
- **A12 Live tests stay live.** `tests/campusS<N>*.test.ts` keep testing the live map until switch-on; each lane writes its
  v2 tests in `tests/campusV2S<N>*.test.ts`. The lead's switch-on PR retires the section's live tests. Undo: none needed.
- **A13 Validator graphs.** A lane updates `docs/sector-redesign/graph/campusOps-S<N>.json` from its plan graph
  (`graph/plan/campusOps-S<N>.json` on the sign-off branch) as its v2 greybox lands, and writes `measured` at V6. The
  file then describes the v2 layout while the live map is still v1. Undo: keep the v2 graph under `graph/v2/` until switch-on.
