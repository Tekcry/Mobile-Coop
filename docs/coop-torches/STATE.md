# coop-torches - state

## Now
RESUMED 2026-10-21 13:30 (new account). Master 4.32.3 is current (nothing newer to merge). The parity test failure
was the test's guard id `grunt-3.25`: the wire's id rule rejects '.', so the guard was dropped (test fix only,
`tests/coopTorches.test.ts:93`); 12/12 pass. REPORT.md written. `npm run check` passed. Fresh Opus checker: no code
defects (noted a small e2e-coop risk: the lit sample 2 m along the beam reads 0 if a closed door lies within 2 m; switch
to 1 m only if it flakes). e2e-coop + e2e-netmove: see "Next". PROTOCOL_VERSION 24 -> 25.

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
PR Tekcry/Mobile-Coop#81 open (head 6a26ad1b, master 4.33.0 merged; check passes). e2e-coop ok 453 s (torch asserts
pass), e2e-netmove ok 502 s. Full e2e requested from "Night Shift | Character Build" (copy to the orchestrator), who
merges. A fix only if the full e2e finds something.

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
