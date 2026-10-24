# LR16-M INT (Marlow Build, 2026-10-24)

Brief: docs/sector-redesign/briefs/LR16-M.md (origin/feature/sector-redesign-polish f075b01b). Base f85ef736.
Branch feature/marlow-lr16m: M1 2e301fd9, M2 e062010c, M4 9b10301a, M3 be7fbb5b merged (no conflicts), then
origin/feature/sector-redesign-lr16-entry 6e53e036 (Sector Ops: marlowLightingLevels to the LR16 formula, 2f719ac9 campus re-pin).
Part reports: LR16M-M1-build.md ... LR16M-M4-build.md (every touched line old -> new, red points, edges, re-takes).

- tests/ctcourseLight.test.ts: all cases green (print case skipped).
- tests/lampBake.test.ts:342 Marlow scratch-cut hash 6efdcc4965ad2745 -> 67a42d8a9767ff7d (lamp data change only; the
  scratch-cut equivalence stays proven by the fixture hashes).
- Green, single files --maxWorkers=2: ctcourseLight, lampBake, marlowLightingLevels (7/7 after 6e53e036), ctcourse,
  ctcourseGreybox, tests/ctcourse/* (all nine), marlowLightingCircuits, marlowLightingSchedule, lampBoxAlign, lampBounce,
  lightField, lampFalloff, lampAtlasFit, lampFlicker, sectorLampSync: 23 files, 731 tests.
- npx tsc --noEmit clean; npm run lint 0 errors (42 warnings, none in the 15 touched .ts files).

Re-takes (six floor pins, band `any`): A1 apron floor 0.81 -> 1, A3 corridor floor 0.41 -> 0.56, A4 floor 0.35 -> 0.59,
A6 pump floor 0.39 -> 0.64 (mid -> lit), A7 hall floor 0.34 -> 0.43, A8 hall floor 0.23 -> 0.40 (dark -> mid).
Edges to watch: A2 coat corner 0.20 (pocket 0.22); A3 office 2 / 3 cut 0.21, A7 R1 cut 0.206 (cut 0.24).

Follow-up docs (Sector Ops note, not blocking): LIGHTING-PLAN.md lines 90 / 260 / 310 say 8 lamps per column (now
LAMP_GRID_SLOTS 24); the gallery glazing rule (lines 80 / 276) now reads on the reach: authored radius <= (distance to
glazing - 0.3) / 1.6.
