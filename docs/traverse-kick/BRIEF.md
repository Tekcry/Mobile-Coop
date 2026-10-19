# Traverse kick flake - brief

Set by the orchestrator, 2026-10-19 (a filler job between laptop runner requests; runner requests go first). Branch
`feature/traverse-kick` off master 4.6.8 (da93405c), folder `C:/NightShift/Mobile-Coop-traverse-kick`.

## Problem
e2e-traverse "a tap kicks the grate in: quick, loud" fails about 1 run in 3 (desktop, master 4.6.8; laptop, Sector Ops
7a263ecc): the attach comes in 0.07 s but the noise reads 0 instead of 10.

## Cause
The test, not the game. The keyboard vent section just before the kick (its checks skipped, "prototype: revisit") runs
on real frames at the same grate: Space starts the vent and E is held to unscrew. When E's hold is not seen in time,
the release counts as a kick, so the grate opens and the player attaches. The kick check then finds the grate already
open, and `attachFrom` enters an open duct directly (`src/player/attachController.ts`, the `duct` branch), with no kick
and no noise. The failing run's state matches: attached to duct 7 (ducts[0]) in 4 / 60 s, noise 0. On the laptop the
keyboard section opened the grate in 5 of 5 verify runs, so the old check mostly passed by luck: some other noise
(most likely the landing after the teleport, which `eventNoise` keeps on the meter for 0.8 s) was still above 10
when it read `st.noise`. The noise path
itself (`breakables.open(key, 'kick')` -> `GameState.onBreakable` -> `eventNoise(10)`) is not dropped.

## Fix
`scripts/e2e-traverse.mjs`: if the keyboard section left the grate open, load a fresh match before the kick (it logs
a line when it does); assert the grate is closed before the kick. No game change.

## Verify
e2e-traverse 5 times on the laptop (port 4191, `E2E_JOBS=1`, BelowNormal, `C:/NightShift/heavy.lock`).

## Finish
One PR to master; the orchestrator sets the version and merges.
