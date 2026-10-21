# coop-torches - implementer report

Job lead: "Night Shift | Course Ready Build". Branch `feature/coop-torches`, PR to master.

## What was built
The co-op client now draws the guards' flashlights, and its light meter reads them the way the host's guard
perception does (light parity, bible 5.1).
- Host: `CoopHost.alertCode` sets a torch bit in each guard's enemy `al` from `EnemyManager.hasTorch(e)`.
- Client: `EnemyPuppet.torch` (the bit while the guard is alive and in the latest snapshot) and `torchCrouch` (`st` 2)
  feed `TorchMirror` (`src/net/torchMirror.ts`, pure), which lights one of the client map's own torch slots per lit
  guard and places it every frame from the guard as drawn. `CoopClient.frameUpdate` runs it after the puppets;
  `dispose` clears it.
- One torch code path: `src/world/torches.ts` (pure) holds `FLASHLIGHTS`, the `TORCH` values, `addTorchSlots`,
  `placeTorch` and `beamReach`. The host (`Enemy.placeTorch`, `EnemyManager` beam reach) and the client both call it,
  so the light is the same light, not a lookalike.
- Co-op code stays in `src/net`, reached only through the dynamic import behind `flags.coop`. `src/world/torches.ts`
  imports nothing from `src/net`.

## Wire format and cost
- `PROTOCOL_VERSION` 24 -> 25 (`src/net/protocol.ts`).
- Enemy `al`: bits 0-1 alert level, `AL_SEIZED` 4, `AL_TORCH` 8. `packAlert(level, seized, torch)`. The parser clamps
  `al` to 0..15.
- The aim is not sent: the client derives it from x, y, z, yaw and st, already on the wire.
- Cost: 0 bytes for a guard without a torch (values 0-7 as before), at most 1 JSON byte for a lit guard (8-15).

## Files
`src/world/torches.ts` (new), `src/world/world.ts`, `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/net/protocol.ts`,
`src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/enemyPuppet.ts`, `src/net/torchMirror.ts` (new),
`scripts/e2e-coop.mjs`, `tests/coopTorches.test.ts` (new), protocol asserts in `tests/net.test.ts`,
`tests/moveState.test.ts`, `tests/sectorStep3.test.ts`; docs `docs/systems/coop.md`, `docs/systems/lighting.md`,
`CHANGELOG.md`, `TESTING.md`.

## Assumed decisions
- A1 The torch bit lives in `al` (bit 8). Undo: a separate field.
- A2 The aim is derived on the client, not sent.
- A3 The client works out a new torch's beam reach at once on acquiring a slot (the host reuses the previous value for
  up to 4 steps). Picture only.
- A4 Client parity uses the interpolated guard position (~120 ms behind, `INTERP_DELAY`), so the joiner's meter reads
  the torch where the joiner sees it.
- A5 Guards beyond `MAX_ENEMIES` (32) are not in the snapshot, so not shown on the client.
- A6 `Enemy.torchOverride` (true / false forces the torch rule, null in play) is the test hook.

## Tests
- `tests/coopTorches.test.ts` (12): the `al` bits and a snapshot round trip; a bad `al` clamped; host torch vs client
  torch give the same light, cone, reach and `LightField` totals at a grid of points (standing, crouched, a big guard);
  host switch-off reaches the client; the test hook and dogs; `TorchMirror` slot limits, release / reacquire, round
  robin rays, no reallocation; the puppet's `torch` / `torchCrouch`.
- e2e-coop: a host guard's torch forced on is lit on the client near his head and aimed where he faces, lighting a
  point 2 m along the beam; forced off, both pages are dark there.

## Two-browser manual test
1. `npm run dev`; open two windows, host a co-op match on a dark map, join from the second.
2. Alert a guard on the host until he raises his torch (searching).
3. On the joiner: the cone and its light show on the guard and follow his head; standing in the beam raises the
   joiner's light meter as it does on the host.
4. Let him calm down: the torch goes off on both windows.
