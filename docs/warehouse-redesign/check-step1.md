# Check - step 1, dogs carry no light (M1)

Fresh checker, 2026-10-19. Commit `a3664216` on `feature/warehouse-redesign` (HEAD). Light checks only (desktop
`heavy.lock` held by CT Core Build).

## Verdict: PASS

## Commands and results
| Command | Result |
| --- | --- |
| `npx tsc --noEmit -p .` | exit 0 |
| `npx eslint src/ai/archetypes.ts src/ai/enemy.ts tests/archetypes.test.ts tests/enemyManagerDespawn.test.ts` | exit 0 |
| `npx vitest run tests/archetypes.test.ts tests/enemyManagerDespawn.test.ts tests/difficulty.test.ts tests/sectorStep3.test.ts tests/sectors.test.ts tests/lightField.test.ts tests/nightVision.test.ts` | 7 files, 76 / 76 pass |

The vitest set is every test importing `src/ai/enemy` or `src/ai/archetypes`, plus the two other tests that mention
flashlights / torches (`lightField`, `nightVision`). Not run: `npm run check`, e2e (lock held; step tier still needs
them on this commit).

## Findings
1. Cause is right. The only enemy light is the shared pool: `World` adds `FLASHLIGHTS` (4) `kind: 'flashlight'`
   cone lights on dark maps (`src/world/world.ts:170-174`, the only `reg.add` of a flashlight in `src/`);
   `EnemyManager.updateTorches` (`src/ai/enemyManager.ts:313-344`) gave a slot to any living enemy whose
   `torchWanted` was true, and the old `torchWanted` never checked the kind.
2. No other path lights a dog. `DogModel` and `src/net/enemyPuppet.ts` create no light; the only other per-enemy
   extras are the enforcer shield and the sniper laser / glint meshes (kind-gated, `enemy.ts:305-321`); `lightRig`
   only places registry flashlights; the co-op client builds no `EnemyManager` (`gameState.ts:522-526`) and the wire
   syncs only light groups and dead lights (`courseMode.ts:839-842`), and flashlights have no group, so the client
   never switches one on. Only `dog` is `quadruped` in `src/config/enemies.json`.
3. Human guards unchanged. `TORCH_DARK` 0.35 / `TORCH_KEEP` 0.45 moved to `archetypes.ts` with the same values and are
   re-exported from `enemy.ts`; `torchRule` is the old expression gated by `carriesTorch`; for a human `headLight` is
   the same `field.levelAt(x, y + 1.4, z)`. Slot logic in `updateTorches` untouched (release on `torchWanted(field,
   true)` false, acquire first free slot).
4. Light parity holds. With no slot a dog's flashlight entry is never on, so `LightField.dynamicAt` (player meter via
   `bodyLevel`, guard perception via `totalAt` / host-sampled `ref.light`) and the rendered rig agree: no dog light in
   any of them. A slot a dog held (stale state) is released on the next tick.
5. Tests assert the right thing. `archetypes.test.ts` covers `carriesTorch` for every kind and `torchRule` for dog vs
   grunt at all three looking levels, plus the guard thresholds and hold. `enemyManagerDespawn.test.ts` drives the
   real `updateTorches` with the real `Enemy.prototype.torchWanted`: with the old code the dog would take a slot and
   `expect(owner).not.toContain(dog)` would fail, so it is a genuine regression test.
6. Hot path: no allocation added (`torchRule` takes primitives and the def; no closures, arrays or vectors).

## Blocking fixes
None.

## Polish (not blocking)
1. `torchWanted` now samples `field.levelAt` for every calm human guard every tick on dark maps (the old `&&`
   short-circuited before the field read when not looking). `levelInto` is a cheap grid lookup, so this is minor;
   done looks like: the field is read only when the guard is looking (e.g. a `torchLooking(level, los)` check before
   the sample, or pass the field read lazily), behaviour identical.
2. Pre-existing, noted by the implementer: the co-op client never draws a human guard's flashlight (torch state is
   not on the wire) while the host's perception counts it. A light-parity item for the orchestrator, outside this step.
3. e2e pending: `e2e-stealth-ai` "lights" (grunt torch) and `e2e-desktop` "alerted guards' flashlights take the
   shadow pool" should still pass; run them with the step tier on this commit.
