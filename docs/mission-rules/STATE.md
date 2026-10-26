# mission-rules - STATE

Owner: Campaign Build. Status: current.

## RESUME 2026-10-26 (Campaign Build; read this block first, older blocks are history)
Process: RULES + VISION from origin/master; start steps BOOT.md "Campaign Build" (origin/feature/menu). Plan: `docs/mission-rules/PLAN.md` section 2. Reports: `C:/NightShift/scratch/campaign/` (`j7-r4-report.md` to `j7-r8-check.md`, `j7-pre-fix1-check-a.md`, `j7-r6-polish-check.md`).
1. J7 PR D, E and F all passed their checkers and laptop sets (`j7-prd`, `j7-pre`, `j7-prf`) and are merged into feature/mission-engine at 5e72f83b0.
2. FE (`changes/feature-mission-rules-net.md`) and FF (`changes/feature-mission-rules-hud.md`) docs are done on feature/mission-rules-docs.
3. J7 reaches master with PR C (the engine split, `docs/missions/slices/PRC-split.md`).
4. Open items:
   - J12 hand-off to Marlow: the mission validator must accept tgc-3 `boltText` and drop `oneChance` / `window`.
   - `checkSectors(..., 'campaign')` has no runtime call site yet: R3 added the parameter only.
   - `src/editor/missionCatalogue.ts:55` "Dog handler" for campus S1: out of scope (not Tallow).
   - A Teale kill also bumps the kill stat: a `noKills` rule before the `namedTarget` rule would break first. Not on Tallow; for future missions.
   - `docs/missions/STATE.md:56` still names `oneChance` / `window`: left for Campaign Build.
Next: PR C (the engine split) to master; J7 reaches master with it.
