# S-e2e-fix4: e2e-ctcourse:1 (A2 lure) and :2 (A4 dock light) after the master 4.73.0 merge

Branch `feature/marlow-final-fix4` (off 058156cc + fix 3c a48aae2b). One test change, no game change.

## Cause
1. **A2 (e2e-ctcourse:1), "the lured shunter walks toward cabinet one".** Master's guard-ai coordinated `EnemyManager.lightsOut`
   only lures guards who saw the light go (the fixture in their view with one ray, or in their room). The course isolator
   (`StealthSystems.isolate`) passed only the cabinet point, which is inside the cabin, 21 m from the shunter: no witness, no incident.
   Fix 3b already passes the circuit's group (`src/game/stealthSystems.ts:813`, in 3d6aa95b, on `feature/marlow-final`). The
   failing logs (s10-d1) came from the slice 10 worktree, which lacks 3d6aa95b (`isolate` still calls `lightsOut(x, z)`).
   Probe on this branch: the shunter sees neck lamps 52 and 54 (in view, ray clear), the `light` incident (key 100021) is
   reported with 1 perceiver, he walks to the cabinet. No change needed here.
2. **A4 (e2e-ctcourse:2), "the dock reads dark ... (host 0.991, client 0.141)".** Game behaviour, not a bug: with the
   coordinated lights-out both dock loaders (D1, D2, at the dock) see the floor circuit go and check it with their torches
   on. `bodyLevel` includes those torches (dynamic lights). The host has them at once; the client's `TorchMirror` follows a
   snapshot later. Probe (300 ms steps): host torches at (80.1, 33.9) and (80.4, 32.1) at once, client the same one step
   later, both pages 0.991 / 1.000, then 0.141 on both once the loaders walk off. Torch parity holds; the test read the
   whole field where it meant the circuit.

## Fix
- `scripts/e2e-ctcourse/a4GoodsShed.mjs:68`: `lampLevel` (ambient, moon, baked lamps: `lightField.levelAt` at bodyLevel's
  chest and head heights, no `dynamicAt`).
- `scripts/e2e-ctcourse/a4GoodsShed.mjs:158`: the floor-cut dark checks (main aisle, dock) use `lampLevel`.

## Results (desktop, E2E_GPU=1, E2E_JOBS=1)
- `npx tsc --noEmit`: pass. No vitest file touched.
- e2e-ctcourse:1 (heavy2, port 4192, with a temporary probe): pass, 215 s wall (suites 212 s), 16:09-16:15, build included (A2 restart check and route green).
- e2e-ctcourse:2 (heavy.lock, port 4191, fix + temporary probe): pass, 314 s wall, 16:33-16:38 (same dist build). Probes removed before commit.

## Open
- None for these two. Any branch that runs A2 must contain 3d6aa95b's `isolate` group (feature/marlow-final does).
