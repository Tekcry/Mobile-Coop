# B3 check (commit 48aea549) - read only review

Verdict: PASS (no blockers).

## Blockers
None.

## What was checked
- Station 3 completable by two: the pocket is a blind spot, so once the partner jams, one player walks in; the second then walks in while the first (in the pocket, camera cannot see them) can re-jam from inside or ignore the camera. The alarm stage only escalates (capped at 3, `ctDevices.ts` onCamera) and never ends the run. A drained charge refills at 1.5/s; no dead end.
- Station 4: damage is capped by `laserDamage` (floor 1 HP) with a 2 s per-player cooldown, so it cannot kill or loop per frame. `PlayerTarget` and `RemotePlayer` both carry `health`, so the hp read is valid. Plates still open the door.
- `jam` message: `parseMessage` accepts only an id string or ''; the host checks the id against its target list, reach (range + 3 m), stand-still from host-side speed, 0.7 s staleness, and the client's alive state. It cannot jam an unknown target or one far away. No rate limit on `jam`, but the handler is O(targets).
- Parity: camera state (mode, clock, jam list) is host authoritative and mirrored; perception runs host only; the client only draws. No gameplay read of graphics state.
- EMP removal: `GADGET_IDS` excludes emp; `schema.ts` sanitises saved loadout gadget against `GADGET_IDS`, `opts.gadget` is checked the same way, digit 7 is guarded (`if (id)`), `counts.emp` stays 0. Net gadget types still accept 'emp'.

## Polish (not blocking)
1. `src/game/ctDevices.ts` fixedUpdate pass zone: `zoneSet` is never cleared. If bay 3 restarts (`CourseState.restart()` deletes the `s3-clear` flag), the zone cannot set it again and the door stays shut. Reaching it needs both players downed at station 3, which nothing there can cause today (lasers floor at 1 HP), so it is latent. Fix: clear `zoneSet` for a zone when its flag is cleared (or re-arm on `bayRestart`).
2. `localStep` uses `this.targets.find(closure)` every fixed step while the trigger is held and the aim drifts: a small allocation in a per-step path. Replace with an indexed loop.
3. A pass zone with one player and no solo flag (`Math.max(2, n)`) needs a partner by design; fine for co-op, note for solo play.
4. The client page does not show the partner's jam gun light (documented stub).
5. Client-reported speed (`pstate`) decides stand-still, so a modified client could jam while moving. Acceptable for a co-op prototype.
