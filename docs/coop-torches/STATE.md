# coop-torches - state

## Now
PAUSED 2026-10-21 (account switch). WIP committed and pushed, no PR. Master 4.32.3 merged in. PROTOCOL_VERSION 24 -> 25
(`src/net/protocol.ts`; asserts updated in tests/net.test.ts (5), tests/moveState.test.ts (1), tests/sectorStep3.test.ts (1)).
Elsewhere: PR #80 tuner-ui (8ce854e7) waits on the laptop full e2e, then the orchestrator merges it.

## Done (WIP commits)
- `src/world/torches.ts` (new, pure): FLASHLIGHTS, TORCH values, `addTorchSlots`, `placeTorch`, `beamReach`, `BeamHit`:
  one torch code path for host and client. `world.ts` uses it and re-exports FLASHLIGHTS.
- `src/ai/enemy.ts`: `placeTorch` via the shared function; test hook `torchOverride: boolean | null`; dogs never carry
  one. `src/ai/enemyManager.ts`: `beamReach` via the shared function (allocation-free `beamHit`); `hasTorch(e)`.
- `src/net/protocol.ts`: enemy `al` field gets `AL_SEIZED` 4 and `AL_TORCH` 8; `packAlert(level, seized, torch)`; the
  parse clamp 0..15. `src/net/coopHost.ts`: `alertCode` sets the torch bit from `em.hasTorch(e)`.
- `src/net/torchMirror.ts` (new, pure): the client's copy of the slots (release / acquire / place / beamReach per frame).
  `src/net/enemyPuppet.ts`: `TorchHolder` (torch bit while alive and in the snapshot; crouch from `st` 2; the held
  guard reads the newest buffered state). `src/net/coopClient.ts`: `torches: TorchMirror`, updated in `frameUpdate`
  after the puppets, cleared in `dispose`.
- `scripts/e2e-coop.mjs`: torch block after "client mirrors host enemies" (host hook on, client slot on near his head
  and aimed where he faces, lights the point 2 m along the beam; then off, both pages dark). Not run.
- Aim derived on the client (x, y, z, yaw, st): no extra bytes for most lit guards.

## Next (resume)
1. `tests/coopTorches.test.ts`: 11 pass, 1 fails: "a point receives the same light..." (line ~143), TypeError reading
   'id' of undefined inside `guards.map((g) => holder(wire(em, g)))` while building the client side. Debug and fix.
   There is no hang: the file takes ~80 s to load under load; give vitest a 300 s timeout. Optional: dynamic imports
   for EnemyManager / Enemy in that file.
2. tsc, eslint on the changed files, vitest on coopTorches, net, moveState, sectorStep3, enemyManagerDespawn.
3. Docs are done (coop.md snapshot field v25, lighting.md client torches and parity, CHANGELOG, TESTING, e2e-coop
   header). Write `docs/coop-torches/REPORT.md` (what was built, wire format and cost, files, A1-A6, tests, two-browser
   test steps).
4. Fresh Opus check, one fix round; `npm run check`, e2e-coop, e2e-netmove (desktop heavy.lock, E2E_SUITE_TIMEOUT
   1500, or the laptop runner); PR to master; full e2e (Character Build); message the orchestrator with the head.

## Assumed decisions
- A1 the torch bit in `al` bit 8 (undo: a separate field). A2 aim derived, not sent. A3 the client works out the beam
  reach at once on acquiring a slot (the host uses the previous value up to 4 steps): picture only. A4 client parity
  uses the interpolated position (~120 ms behind, INTERP_DELAY). A5 guards beyond MAX_ENEMIES 32 are not shown on the
  client. A6 `torchOverride` is the test hook.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for coop-torches. Folder C:/NightShift/Mobile-Coop-coop-torches,
branch feature/coop-torches (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-coop-torches && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-torches && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-torches"
Read CLAUDE.md, docs/coop-torches/BRIEF.md and this STATE.md; carry on from "Next". Merge origin/master first. Report to
"Night Shift | Orchestrator". Heavy runs only under C:/NightShift/heavy.lock (create only if absent; delete only your own line).
```
