# P3-1 check (fresh Opus checker, 2026-10-23)

Branch `feature/marlow-p3-interlock-lamp`, head d7eb3f77, base afefe329. Read only; this file is uncommitted.

## Verdict: PASS

## Blocking
None.

## Findings
- Done criteria met. Host: `CourseMode` builds `CtDevices('host')` with `hasShared` -> `CourseState.hasShared` (`courseMode.ts:283-296`), `fixedUpdate` every step (`:594`) -> `applyJam` (`ctDevices.ts:865`). Client: the mirror builds `CtDevices('client')` with `hasShared` on the mirrored `CourseState` (`courseMode.ts:1097`), whose flags come from the course snapshot (`courseState.ts:961-962`, clear + refill); `clientCourseFrame` -> `ct.frame` (`courseMode.ts:1108`, from `coopClient.ts:929`) -> `applyJam` (`ctDevices.ts:1205`). Same flag, same placement on both pages: parity holds. `a6-drive` is a shared flag (`perPlayer: false`, `a6PumpHouse.ts:296`).
- Restart: a bay restart deletes the bay's flags (`courseState.ts:579-583`); the next `applyJam` sees the change and sets red; the client gets it via the snapshot clear. Unit test models it with the flag set.
- Gameplay never reads it: `flagLamps` is read only by `debug()`; `PropPlacement.flag` is read only by the `CtDevices` constructor; bake, AI and nav do not read `facilityProps`.
- Loop (`ctDevices.ts:1012-1020`): indexed, no allocation, `setDevice` only on change (first pass from -1). Constructor `.some` closure runs once.
- `paint` (`propRender.ts:220-224`): with `lampOff` undefined, `offLamp` is false, so `t` and `lit` reduce to the old expressions. Screens are excluded by `!screen`. Default path is identical. pushStation has one emissive (lamp, `facilityProps.ts:589`).
- `world.facilityProps` is awaited in `World.create` (`world.ts:190-192`) before modes construct `CtDevices`, so the first-pass red is not lost.
- No wire, PROTOCOL, save or `*.light.json` change; `tests/laserPanels.test.ts` untouched. The diff touches only owned files plus the report.
- Tests have teeth: flagLamp fails without the ctDevices change (no `flagLamps`, no calls); facilityProps red-at-gain fails without the paint change; the a6 placement test fails without the placement. Assert edits are derived only (`pipes` filter, title reword); no number changed.
- e2e asserts read sensibly: `until(page, fn, arg, timeout, what)` signature matches (`e2e-net-lib.mjs:48`); step-1 red reads `on: false` even before the first pass (-1 maps to false); green `until` 15 s on both pages after the outfall unlock.

## Should-fix
None.

## Polish list
- A purpose-built small lamp prop instead of the pushStation cabinet (ruling 2).
- `paint`'s off-lamp `lit` repeats `litNow`'s group test; a small `circuitLit(p)` helper would keep them in step.
- `lampOff` without `device` is silently ignored; a doc line or a layout check would catch a mistake.
- No GPU look check yet of the red / green lamp in front of the housing skins.

## Commands
- `npx tsc --noEmit -p tsconfig.json`: exit 0, clean.
- `npx vitest run tests/flagLamp.test.ts tests/facilityProps.test.ts tests/laserPanels.test.ts tests/ctcourse/a6PumpHouse.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts`: 6 files passed, 126 tests passed, 1 skipped (127).
- `node --check scripts/e2e-ctcourse/a6PumpHouse.mjs`: ok.
