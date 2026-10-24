# LR13 build - lamp falloff setting (default off)

Opus builder, branch `feature/sector-redesign-lightrev`, 2026-10-23 ~14:40-15:10. Michael ~14:35 "Try it first": ship
the photometric falloff default OFF behind an in-game setting; the meter, the guards and the shaders switch together.
Proposal: `docs/lighting-review/PROPOSAL.md` section 7 (LR13). Base: `origin/master` 4.75.0 merged first (5efc4c87, no
conflicts).

## What was built
- **Setting**: Settings > Gameplay > "Lamp falloff": Classic (default, `linear`) / Realistic (test) (`photometric`).
  `Settings.gameplay.lampFalloff`, sanitized with `pick` (missing or junk -> Classic). Settings live in IndexedDB
  `kv/settings`, outside the save shape (same pattern as `mocapLoco`): **no SAVE_VERSION bump**. Gameplay tab, not
  Graphics: no preset, Auto, governor or quality code reads or writes it. Its Defaults resets it. Help text says it
  takes effect when a map loads and that the co-op host's choice applies to everyone.
- **When it applies**: `GameState.create` calls `setLampFalloff(matchLampFalloff(setting, flags.photoLamps,
  opts.lampFalloff))` before `World.create` (the registry scales the reach at `add`, then the bake, the field and the
  shaders are built). Start and Retry re-read it; it never changes mid-match (a Sector Ops checkpoint restart keeps the
  match's). `GameState.lampFalloff` records the match's mode.
- **Dev override**: `?falloff=photo` kept (`flags.photoLamps`), now through `matchLampFalloff`; the boot-time line in
  `main.ts` is gone.
- **Shaders**: `LampPlugin` adds a `LAMP_PHOTO` define (captured when its code was collected) so a match after one in the
  other mode never reuses the engine's cached compiled effect with the old `nsLampFalloff`.
- **Co-op**: the host's mode rides the `start` message as `lf` (`NetSession.hostLampFalloff`, set in `coopUi.adopt` from
  the host's setting / URL; `StartInfo.lampFalloff`; `coopUi.start` -> `GameOptions.lampFalloff`). The client's own
  setting and URL are ignored; in a co-op match the Settings row is a locked row showing the match's mode, for the host
  too (lrpolish: not only the client's). Rejoin / late
  join re-sends the same start (lf kept). BRIEF A100.

## Protocol / save
- **PROTOCOL_VERSION 35 -> 38** (wire field `start.lf`). 36 and 37 are already taken on open branches
  (`feature/pose-parity` 36, `feature/coop-walk-fixes` 37), so this takes 38. If those merge after this one, or not at
  all, the number needs the orchestrator's look at the train. Tests asserting it updated: `net.test.ts` (6),
  `crateWire`, `jammer`, `jammerFixes`, `moveState`, `rejoin`, `sectorLampSync`, `sectorStep3`.
- **SAVE_VERSION: no bump** (settings are not the save shape).

## Files
`src/world/lampMath.ts` (`matchLampFalloff`, `LAMP_FALLOFFS`), `src/core/settings.ts`, `src/ui/screens/settingsScreen.ts`,
`src/game/gameState.ts`, `src/world/bakedLamps.ts`, `src/core/flags.ts`, `src/main.ts`, `src/net/protocol.ts`,
`src/net/session.ts`, `src/net/coopUi.ts`; tests `tests/lampFalloff.test.ts`, `tests/settings.test.ts`,
`tests/settingsCover.test.ts`, `tests/net.test.ts` + the version asserts above; `scripts/e2e-menus.mjs`; docs
PROPOSAL section 7.2 status, `docs/systems/lighting.md`, `ui.md`, `coop.md`, `TESTING.md`, BRIEF A100, changelog
fragment (now `kind: minor`).

## Tests
- tsc clean; eslint clean on the touched files.
- Vitest (single files): `lampFalloff` 9, `settings`, `settingsCover`, `net` (new: the host's value reaches the client's
  start over the client's own Classic, re-sent on a re-hello; `lf` junk / missing -> linear; a default host starts
  Classic), `crateWire`, `jammer`, `jammerFixes`, `moveState`, `rejoin`, `sectorLampSync`, `sectorStep3`, `lightField`,
  `lights`, `mocapDefault`, `ui`: all green.
- New unit checks in `lampFalloff.test.ts`: precedence (host > URL > setting); the GLSL `nsLampFalloff` of each mode run
  as JS equals the TS formula; in each mode the field's `lampAt` / `levelAt` (what the meter's `bodyLevel` and the guards'
  `levelAt` read) = gain x intensity x the active GLSL formula on the shaders' lamp data (`bakedLights` reach) x cone x
  baked visibility; the same floor point reads 0 Classic, > 0.1 Realistic.
- e2e (`e2e-menus`, desktop, `E2E_GPU=1 E2E_JOBS=1`, port 4191): PASS, 76 s (15:16-15:18). The new leg: Classic by default at a lamp-lit fixed point (warehouse lamp 0, level 0.511); Pause > Settings > Gameplay row on Classic with its help text; a click picks Realistic (test) while the running match stays Classic; Retry loads Realistic, the lamp reach 4.00 -> 6.40 (1.6 x), the field at the fixed point 0.511 -> 0.485. Lock and port released.

## For the laptop (lead's request)
- Logic: `e2e-menus` (the new leg), `e2e-coop`, `e2e-netmove` (protocol 38), `e2e-sectorops`, `e2e-lightbake`.
- GPU (port 4189): `e2e-darkness` and `e2e-lightbake` with `?falloff=photo` (the photometric lamp loop compiles on a real
  GPU, rendered luma against the field), and the perf run of PROPOSAL 7.4 step 4 (bake time / atlas on warehouseOps,
  frame time in the S1 bay, photo against linear).
