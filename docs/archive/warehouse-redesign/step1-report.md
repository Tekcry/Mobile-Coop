# Step 1 report - dogs carry no light (M1)

Implementer, 2026-10-19. Branch `feature/warehouse-redesign`, nothing committed (the job lead commits).

## Cause
- Flashlights are a shared pool: `World` adds `FLASHLIGHTS` (4) cone lights to the light registry on dark maps
  (`src/world/world.ts:169-173`); `EnemyManager.updateTorches` (`src/ai/enemyManager.ts:313-344`) hands a free slot to
  any living enemy whose `torchWanted` is true and places it at the head (`Enemy.placeTorch`).
- `Enemy.torchWanted` (`src/ai/enemy.ts:600-604`, before the fix) checked only the alert level, line of sight and the
  light at the head. It never checked the kind, so a dog investigating or searching in the dark took a slot like a
  guard: a moving cone light at 1.45 m x the dog's scale, in the light registry, lighting the scene, the player's light
  meter (`GameState.updateLight` -> `LightField.bodyLevel`, flashlights via `dynamicAt`) and the light every guard's
  sight reads (`Enemy.perceive`, `targetLight` from the same field).
- No beam mesh exists (the additive cones were removed in 2026-10-09); the light itself was the visible flashlight.
- Co-op client: `EnemyPuppet` (`src/net/enemyPuppet.ts`) and `DogModel` create no light, and the client builds no
  `EnemyManager` (`src/game/gameState.ts:522-530`, puppet branch), so the client never had a dog light of its own; the
  host's dog torch lit the host's view and, through the host-sampled `ref.light`, the client's perception. Fixing the
  host rule fixes both.

## Change
- `src/ai/archetypes.ts` (pure, Babylon-free): `TORCH_DARK` / `TORCH_KEEP` moved here (values unchanged, 0.35 / 0.45),
  `carriesTorch(def)` (false for a quadruped) and `torchRule(def, level, los, headLight, holding)` (the old rule, gated
  by `carriesTorch`).
- `src/ai/enemy.ts`: `torchWanted` calls `torchRule` (a dog skips the field read); `TORCH_DARK` / `TORCH_KEEP`
  re-exported so existing imports keep working. A dog never acquires a slot and a slot a dog held is released on the
  next update, so no dog has a light, a registry entry switched on, a lit player or a flashlight term in any
  perception. The dog's own perception is sight + smell (`smellRate`), unchanged.
- `docs/systems/ai.md` (flashlights paragraph) and `CHANGELOG.md` ("Unreleased - warehouse-redesign") updated.

## Tests
- `tests/archetypes.test.ts`: dog `carriesTorch` false, every other kind true; `torchRule` true for a grunt and false
  for a dog in pitch dark at investigating / searching / alert-unseen (holding or not), plus the guard's thresholds.
- `tests/enemyManagerDespawn.test.ts`: on the real `EnemyManager.updateTorches` with stand-ins on the real `Enemy`
  prototype in pitch dark, a searching grunt takes a torch, a searching dog does not, and a slot forced onto a dog is
  switched off and freed.
- Results: `npx vitest run tests/archetypes.test.ts tests/enemyManagerDespawn.test.ts` 17 / 17 pass;
  `npx tsc --noEmit` clean; ESLint on the 4 changed source / test files clean.
- e2e: no suite asserts a dog torch. `e2e-stealth-ai` "lights" spawns a grunt for its flashlight check (unchanged);
  `e2e-desktop` flashlight checks use alerted guards (pool counts, unaffected). Not run (desktop heavy lock held).

## Skipped / open
- `npm run check` and e2e not run (light commands only); the step tier needs them on the job's commit.
- Out of scope, noted: the co-op client never draws any guard flashlight (torch state is not on the wire), so the
  client's picture misses a human guard's torch that the host's perception counts. A light-parity item for the
  orchestrator, not this step.

## STATE "Done" draft
- 2026-10-19: Step 1, dogs carry no light (M1): `torchWanted` gave the shared flashlight slots to any enemy, dogs
  included; now pure `carriesTorch` / `torchRule` (`ai/archetypes.ts`) keep them for human guards. Vitest 17/17, tsc
  and ESLint clean; `npm run check` and e2e pending.
