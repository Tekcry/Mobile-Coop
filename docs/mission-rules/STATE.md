# mission-rules - STATE

Owner: Campaign Build. Status: current.

## RESUME 2026-10-25 (Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: `docs/mission-rules/PLAN.md` section 2. Reports: `C:/NightShift/scratch/campaign/j7-r1-report.md`, `j7-r2-report.md`, `j7-r3-report.md`.
Branch `feature/mission-rules` (PR D), worktree `C:/NightShift/Mobile-Coop-mission-rules`. Everything ships dark behind `flags.missions`.
1. Merged on feature/mission-rules, head b5368311b: R0 docs 43677f61c (base e4eace3bd on feature/mission-engine, #372 in via 925fa3784); R1 rules core 66c35a754 (merge 4f4d6e073); R2 campaign profile 844024e32 (merge 45630c7b0); R3 dogs out and campaign guard check 0354fb2f2 (merge b5368311b).
2. Checks so far: tsc clean; vitest per builder (R1 84 tests in tests/mission/, R2 66, R3 283). No e2e yet (laptop queue, lead's call).
3. PR D checker running: one fresh Opus, R1-R3 batch, also reads the wire path (`missionWire.ts`). Report: `C:/NightShift/scratch/campaign/j7-prd-check.md`.
4. PR D docs (FD): `changes/feature-mission-rules.md`, this file, `docs/missions/PLAN.md:84-86` (stale code note fixed), `TESTING.md` (Three Grey Coats line after the Sector Ops rating bullet). `docs/missions/BRIEF.md` had nothing stale.
5. Open items:
   - Client banner for the Teale knock-out restart: the client gets only the radio line (`PROTECTED_LINE`); the SECTION RESTART banner is host-local. Fix is in src/net, so R4-R7; R7 e2e checks it.
   - J12 hand-off to Marlow: the mission validator must accept tgc-3 `boltText` and drop `oneChance` / `window`.
   - Campaign revives (2) are not enforced yet: R5.
   - R3 only adds the `checkSectors(..., 'campaign')` parameter; the runtime call site is still to add.
   - `src/game/modes/sectorMode.ts:828` feed line `${s.objective.label} - done` uses the sector label in a mission: R6.
   - `src/editor/missionCatalogue.ts:55` "Dog handler" for campus S1: out of scope (not Tallow).
   - A Teale kill also bumps the kill stat: a `noKills` rule before the `namedTarget` rule would break first. Not on Tallow; for future missions.
   - `docs/missions/STATE.md:56` still names `oneChance` / `window`: not in FD's list, left for Campaign Build.
Next: wave 2 (R4, R5, R6) from feature/mission-rules head b5368311b per PLAN section 2 (R1 and R2 are merged); R7 after R4 and R5.
