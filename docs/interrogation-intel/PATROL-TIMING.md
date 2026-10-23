# interrogation-intel: patrol timing (batch-23, train 27)

## What
Spec "stealth over shooting" item 9 (interrogation gives door codes, camera routes, patrol timing): the patrol-timing
part now reads each guard's route through the Guard AI getter `Enemy.patrolRoute` (master 4.74.0, `src/ai/enemy.ts`
~651; read only, src/ai not edited). This replaces the stub of the first slice, where `PatrolSource.patrolRoute` was
optional and read as `?? null` until the getter landed (REPORT.md open item 1, now closed).

## Why
Without the getter the "Patrols near: n, loop a-b s" line never showed. It now shows for every standing patroller
within `INTEL.reach` (30 m, same storey) of the held guard.

## Files
- `src/game/intel.ts`: `PatrolSource` is the full shape the intel reads (pos, alive, ko, taken, def.walkSpeed /
  quadruped, `patrolRoute: PatrolRoute | null`, required); new pure `intelGuard(e, pace)`.
- `src/game/intelReveal.ts`: `guards.push(intelGuard(e, PACE.patrol))` per enemy (an `Enemy` is a `PatrolSource`).
- `tests/intel.test.ts`: 3 new cases (route and patrol pace from the getter; post / KO / held / dead / dog give no
  patrol; getter-fed guards through `gatherIntel`: "Patrols near: 2, loop 20-42 s"), plus a tsc-checked
  `(e: Enemy): PatrolSource => e` so a getter rename breaks the build.
- `scripts/e2e-takedown.mjs` `grab-interrogate-intel`: a second guard on a 6 m ping-pong route; asserts the getter
  returns the route and the feed reads "Patrols near: 1, loop 22 s".
- `docs/systems/takedowns.md`, `changes/feature-interrogation-intel.md`: the getter wording.

## Wire / save
No change: the host computes the lines and relays them as `feed` events as before. `PROTOCOL_VERSION` stays 31, no
save-shape change.

## Tests (desktop lane 2, port 4192, E2E_GPU=1, E2E_JOBS=1)
- vitest: intel 16/16 (13 before), guardInfo 6, grabMenu 3, takedown 18: pass. tsc clean; eslint on touched files clean.
- e2e-menus pass (73 s), e2e-studio pass (49 s), e2e-takedown pass (16 s; the new patrol asserts ok).
- e2e-coop (owns the relay) not run here: laptop only.

## Open items
- Part B (BRIEF A5) unchanged: the modes implement `onIntelCode`, map owners author `codes`.
- Loop time is the unaware walk (`PACE.patrol`, authored waits); a cautious guard's shorter waits (`CAUTION.waitMul`) are
  not reflected. Timed loops report their authored period.

## Changelog line
Interrogation's patrol timing now reads the guards' routes through the Guard AI getter (patrol loop times show).
