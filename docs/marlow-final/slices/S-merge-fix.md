# S-merge-fix: the two e2e-ctcourse regressions from the master 4.73.0 merge (d32a435a)

Branch `merge/marlow-final-master`, on top of `feature/marlow-final` 6b211fb7. Both passed on 1a47946a (before the merge),
both failed on the laptop GPU run of d32a435a.

## 1. e2e-ctcourse:1, A2: "the lured shunter walks toward cabinet one" (timeout)

- Cause (game): guard-ai S2 (master) replaced the old lights-out rule ("the nearest calm guard within 25 m walks over")
  with the incident board: a light incident goes only to guards who perceived it. `EnemyManager.lightsOut` decides
  that from the light id or circuit it is given; with neither it asks whether a guard saw the switch point itself.
  A course isolator's cut (`CourseMode.isolatorEdge` -> `StealthSystems.isolate`) called `lightsOut(x, z)` with no
  circuit, so only a guard looking at cabinet one (inside the shunter's cabin) counted: the shunter at the neck,
  under the four lamps that went out, was never sent. Wall switches were already updated on master to pass the group
  (`StealthSystems.toggle`: `lightsOut(x, z, y + 2.5, -1, group)`); the course isolator path was missed.
- Fix (game, Marlow wiring only): `src/game/modes/courseMode.ts:748-758` (`isolatorEdge`) sets the group, syncs the
  switches, emits `lightSwitch`, then calls `lightsOut(x, z, NaN, -1, gid)`: the guards who saw the circuit's lamps go out
  are sent (a pair when two did, within `INCIDENT.lightPairR`), as for a wall switch. Master's engine rule is unchanged.
  `StealthSystems.isolate` is now unused; it was not edited (fix 3b owns `stealthSystems.ts`): the lead may delete it
  or give it the group later.
- Side effect to watch: A8's lighting board is a course isolator too (`g-a8-night`): its lure now also follows the
  circuit rule (the night guards who see the night lamps go out), not "who saw the board".

## 2. e2e-ctcourse:2, A4: "the dock reads dark ... with the floor circuit cut (host 0.991, client 0.991)"

- Cause (test): the same guard-ai S2 rule. The floor switch (group 41) is seen going dark by both loaders, D1 and D2,
  within 15 m of each other, so the board sends both (M1: "one or two people should investigate"), and each
  investigating guard in the dark turns his flashlight on (`torchRule`). The dock spot (80, 33) sits between their
  posts (80, 34.4) / (80, 31.6), in a beam: `bodyLevel` includes dynamic lights (flashlights), so it read 0.991 on both
  pages. The lamps are off (the assert before it, all eight floor lamps off on both pages, passed; the main aisle read
  dark). Light parity holds: the beam is really there on both pages. Before the merge only D1 went, his torch pointing
  north at the switch, away from the spot.
- Fix (test): `scripts/e2e-ctcourse/a4GoodsShed.mjs`: a `lampLevel` helper (the baked field at `bodyLevel`'s chest and
  head samples, without `dynamicAt`) for the two "reads dark with the floor circuit cut" checks; the assert message also
  prints the full level and the torch count. The lure comment names the pair. D1's walk check is unchanged (he is one
  of the pair).

## Checks

- `npx tsc --noEmit`: clean. ESLint on `courseMode.ts`: clean (the .mjs is outside the lint set; `node --check` ok).
- Vitest: `tests/ctcourse/` + `marlowN4Hold`, `jammerFixes`, `course`: 12 files, 509 passed.
- e2e (desktop GPU, `E2E_GPU=1 E2E_JOBS=1 E2E_PORT=4191`): see below.
