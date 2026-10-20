# anim-rig - brief

Job lead: "Night Shift | Course Ready Build" (desktop), started by the orchestrator 2026-10-20. Branch
`feature/anim-rig` cut from `origin/feature/ct-prototype` (65c5ffcd), folder `C:/NightShift/Mobile-Coop-anim-rig`. PR base:
`feature/ct-prototype` (the orchestrator merges it there; CT Core pulls).

## The ask
Michael (13:50, via the orchestrator): "movement is top priority. any spare bandwidth that can be used to speed it up
should be used". The animation rework brief (`docs/anim-rework/BRIEF.md`, lines 162-163): "Extend the rig where it blocks
believable motion (toe joints, a wrist frame for the knee hand, a sling attachment), and say what it costs." CT Core's
spec: `docs/ct-prototype/G8-PLAN.md` "Rig limits and extensions".

## Scope
- Toe joints (one per foot) in Wren's game LODs; a wrist frame in the key format (the knee hand); a sling attachment
  socket on Wren.
- Files: `scripts/operators/**` (export), `scripts/anim-keys/**` (the bake, new joints in the key format),
  `src/anim/keyed.ts` (sampler), the operator rig map in `src/operators/**`, `src/player/characterRig.ts` bone mapping only
  (no pose code), tests, `docs/anim-rework/RIG.md`.
- Hands off (CT Core's slice 1): `src/input`, `src/core/settings.ts`, `src/player/player.ts`, `playerController.ts`,
  `src/game/gameState.ts`, `takedownController.ts`, grab / context menus, `src/weapons/playerWeapons.ts`, `drawState.ts`,
  `src/ui`, `docs/systems/input-and-loop.md`, CHANGELOG, TESTING.

## Done
Wren's glb loads with the new joints; the keyed walk plays unchanged; the toes follow the planted foot roll; a test
proves the joint map; `npm run check`, e2e-anim and e2e-clip pass; the cost (joints, file size, ms) in
`docs/anim-rework/RIG.md`. Blender headless only (`-b`), under the desktop heavy.lock after CT Core's renders.

## Assumed decisions
A1-A8 with undo: `REPORT.md` "Assumed decisions" (A7: MPFB2 from the official zip; A8: the rebake ships LOD0-2, the hero stays).
