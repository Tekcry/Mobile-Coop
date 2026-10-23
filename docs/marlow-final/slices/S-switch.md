# S-switch: the client's yard switch press (A1 e2e)

Laptop e2e `scripts/e2e-ctcourse/a1Gate.mjs` step 8: `use(B, 'switch-0')` returned 'ok' but group 12 never went off on
the host or in the client's `course.wire.lights.groups`.

## Cause: the e2e pressed out of reach (not an engine bug)
- The suspected shadowing does not exist. A client builds no `StealthSystems`: `GameState` takes the `if (this.puppet)`
  branch (`src/game/gameState.ts:624`) and only the host branch builds the enemy manager, interactables and
  `StealthSystems` (`:655`, `:667`). On a client `window.__app.current.stealth` is null.
- A client's `interactables` is a fresh list owned by `CoopClient` (`src/net/coopClient.ts:136-138`); `switch-0` there is
  the host's item mirrored by `syncItems` (`coopClient.ts:366`: `onUse` sends `{ t: 'use', id }`). The press does reach
  the host.
- The host drops it: `CoopHost.onUse` (`src/net/coopHost.ts:577-579`) takes a client's `use` only within the item's
  reach + 0.75 m of where the host has the client (`inUseReach`, `src/net/holdPulse.ts:29`); a switch has reach 1.3
  (`src/game/stealthSystems.ts:95`), so 2.05 m. The e2e left the client in the yard at (14, 9) after step 7 and pressed
  the switch at (7.7, 15.15), 8.8 m away: a silent drop plus one `violations` count. This reach rule has been on the host
  since before slice 0 (slice 0 only moved it into `inUseReach`).
- Doors work in e2e-coop / A2 because those steps move the client next to the door first (`a2CarriageShed.mjs:17`); they
  use the same mirrored-item `use` path.
- A host press, once accepted, does everything a host press does: `toggle` sets the circuit, the indicators, the
  registry group and `lightsOut` (the lure); the registry version bump marks the course wire dirty
  (`src/game/modes/courseMode.ts:540-544`) and `wire()` sends `lights.groups` (`:817`), which the client applies (`:1000`).

## Fix
- `scripts/e2e-ctcourse/a1Gate.mjs`: `SWITCH_STAND = [7.7, 15.8]` (inside the cabin, 0.65 m from the switch); the client
  is moved there (`moveClient`) before the first press and back to (14, 9) after the last light check, so step 9 and the
  runner start where they did.
- No src change, no wire change (keeps Course Ready's protocol 31 rebase clean).
- Assumption A-sw1 (Michael asleep): the e2e script was not on this task's owned list; it is edited because the cause is
  there and an engine change would weaken the host's anti-cheat reach rule. Undo: revert the three lines in `a1Gate.mjs`.

## Sector Ops impact
- Same press path: Sector clients also build no `StealthSystems`; a wall switch is a mirrored item and a press in reach
  toggles the host's group (lights, lure). Nothing to fix for the press.
- Sector does not sync light groups: the `sector` message carries no light state and the Sector client has no
  `setGroup` path, so a Sector client neither sees nor meters a switch change (host's or its own) until a light sync
  lands (Course Ready's `lamps` sync, protocol 31, if it covers groups; else a `groups` list like `course.wire.lights`).
  Not built here.

## Tests
- New `tests/marlowClientSwitch.test.ts` (4 cases): switch-0 is the yard switch (group 12) in the cabin with reach 1.3
  (read from `stealthSystems.ts`); the host's reach rule drops a press from (14, 9) and takes one from the standpoint;
  the standpoint is inside the cabin and clear of every colliding box and prop box; the press is the plain `use`.
- `npx tsc --noEmit`: clean. ESLint on the new test: clean (`scripts/` is lint-ignored; `node --check` passes).
- `npx vitest run tests/marlowClientSwitch.test.ts tests/marlowHoldNoise.test.ts tests/ctcourse/a1Gate.test.ts`: 3 files, 55 passed.

## e2e
- Not run: `C:/NightShift/heavy.lock` held by "Orchestrator | train 18 full e2e | 06:56" for the whole 20 min retry
  window (2026-10-23 ~07:00-07:20). Pending: `E2E_PORT=4191 E2E_JOBS=1 E2E_GPU=1 node scripts/run-e2e.mjs e2e-ctcourse:1`
  after `npm run build` (or the laptop runner on the pushed commit).
