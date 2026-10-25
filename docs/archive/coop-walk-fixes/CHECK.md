# coop-walk-fixes - CHECK

Checker: fresh Opus, read-only. Branch `feature/coop-walk-fixes` at c6b4f4a3 vs base `feature/pose-parity` 19248c01.
Read: BRIEF.md, REPORT.md, the full src / scripts / tests / docs diff, and the surrounding host / client / controller code.

## Verdict: PASS

No blocking findings. Both of Michael's P6 asks and the P7 ask are addressed with host authority, the wire change is
versioned and tested, no hot-path allocation is added, no single-player file imports `src/net`.

## Checks

### P6 team takedown (host-authoritative)
- Offer symmetry is right. Host: `CoopHost.partnerHolds` (src/net/coopHost.ts:714) = a client's `seized` entry with
  `hostage` set and that client's MoveState still `grab` on him. Client: `CoopClient.partnerHolds` (src/net/coopClient.ts:440)
  = the puppet posed by `remoteHeld` (`EnemyPuppet.partnerHeld`, src/net/enemyPuppet.ts:225). Both derive from MoveState
  `grab`, which `localMoveState.ts:47-49` writes only once the hold is established (`takedown.hostage`, past the approach),
  so the two machines agree on when the offer exists.
- `TakedownController.find` (src/game/takedownController.ts:276) lets a partner-held guard through the `taken` / alert
  filter only; `tryVictim` routes him to `assistPlan` (src/game/takedown.ts:198; reach 1.8, dy 0.45, LOS). The attacker
  never calls `beginTakedown` / `holdAt` / `releaseTakedown` on him (start :236, run :656, abort :802).
- Start validation: `onAssist` (coopHost.ts:729) denies unless `assistHolder` finds another player holding him as a
  hostage and the client is within `TD_REACH`; the `!e || !e.alive` guard in `onTakedown` runs first.
- Finish validation: `done` applies only with a matching `assists` entry and the holder / reach re-checked
  (coopHost.ts:740-744). The host's own done re-checks alive + holder (coopHost.ts:720-724).
- Races:
  - Holder releases: client holder's `td abort` deletes `seized` -> host `partnerHolds` false -> the host striker aborts
    (takedownController.ts:634); a client striker's puppet loses `remoteHold` -> aborts; a late `done` finds no holder and
    is a no-op.
  - Guard dies (to anything): `onTakedown` returns before `onAssist`; the striker aborts on `!e.alive`.
  - Both press: holder's finisher and striker's assist are serialised on the host; the first to arrive wins, the second
    finds the guard dead (or `seized` gone) and is a no-op. Holder's local grab ends on the kill event.
  - Disconnect: `removeRemote` releases the leaver's `seized` holds (coopHost.ts:414) and `grabTid` returns '' for a
    missing remote, so no stale holder can be credited; a leaving striker leaves only a harmless `assists` entry (polish 1).
- Credit: `takedownDone(holder)` then the striker (host striker via its own `takedown` done event, coopHost.ts:290), so
  `DualClock` pairs them; `onRemoteTakedown(by, 'assist')` feeds the course mode.
- `tdDenied` no longer resets a puppet still held by the partner (coopClient.ts ~571) - correct, else a denied assist
  would unpose the partner's hostage.

### Single-player imports
- `grep "from '../net"` over src/game, src/weapons, src/audio, src/player: none. The controller reaches the net layer only
  through optional `NetAttachment.partnerHolds?` / `assistTakedown?` (src/game/gameState.ts:213-218). Solo: `g.net`
  undefined -> unchanged behaviour.

### Hot paths
- `RemoteShots` (src/net/remoteShots.ts) is integer state, no allocation; `RemoteAvatar.fireVisuals` adds none.
- `CoopHost.partnerHolds` / `grabTid` (bound once, coopHost.ts:136) are a Map get + field reads; called in `find` only for
  taken / alert guards (short-circuit).
- `assistPlan` returns a fresh plan object per offered frame - the same pattern as the existing `pickTakedown`, not a new
  class of allocation (polish 4).
- `assistApply` / host `assistTakedown` allocate (Vector3, hit, `enemies.find` closure) but run once per takedown, as the
  existing client-takedown path does.

### Protocol
- `PROTOCOL_VERSION` 37 (src/net/protocol.ts:19) with the history line. All version asserts updated (coopWalkFixes,
  hangDownNet, jammer, jammerFixes, moveState, net x3 incl. the 36-refused / 37-joins hello, poseParity, rejoin,
  sectorLampSync, sectorStep3); no stale 36 assert left in tests/ or scripts/.
- `sc` parse (protocol.ts:270): finite number, clamped 0..255, floored; absent stays absent. Senders mask `& 255`
  (coopHost.ts ~1132, coopClient.ts ~716). Host relays client states by spread (coopHost.ts:1185), so `sc` reaches other
  clients.
- Wrap: `(sc - last) & 255` (remoteShots.ts:27) is correct across 255 -> 0; first value only syncs; > 16 resyncs
  silently; queue capped at 8. Tested 254 -> 2.

### Suppressed flag
- `PF.quiet` = `lastShotQuiet` (netShared.ts:15), read at playback; passed through `onFire` -> `remoteShot.quiet` ->
  `WeaponAudio.remoteShot(..., suppressed)` (existing param) and `stats.remoteSd`. `remoteGun` picks `pistolSd` (Ruger
  shot, `sdPistol`) instead of the class's open 1911. Synth fallback at 0.3 gain. Muzzle flash 0.35x as the owner's.

### e2e
- e2e-weapon-audio new step is sound: emits a partner `remoteShot` with `gun: 'pistolSd', quiet: true` after the sprite is
  proven loaded (s5), asserts `remote` and `remoteSd` both rise.
- e2e-coop new step (scripts/e2e-coop.mjs:823) is sound in design: host placed 1.1 m to the hostage's side (perpendicular
  to the holder's yaw; reach 1.8), the offer is started in the same poll it is seen, then KO on the host, the client's
  hold ends, `duals` rises. Unrun here (laptop rule); it replaces the client grab-menu Knock out assertion (polish 7).

### Tests run here
- `vitest run tests/coopWalkFixes.test.ts tests/net.test.ts tests/takedown.test.ts tests/rejoin.test.ts`: 4 files, 117
  passed.
- `npx tsc --noEmit -p .`: clean. eslint on the changed src / test files: clean.
- No e2e run (not needed; the builder's e2e-takedown and e2e-weapon-audio PASS stand).

### Docs
- coop.md, takedowns.md, audio.md, testing-tools.md, TESTING.md and the changelog fragment match the code.

## Polish list (non-blocking)
1. `CoopHost.removeRemote` (coopHost.ts:405) does not delete the leaver's `assists` entry (coopHost.ts:134). Harmless
   (overwritten on the next start; done is re-validated) but a one-line `this.assists.delete(id)` keeps it tidy.
2. A client striker whose `done` is dropped by the host (holder let go inside the last frame) has already emitted its
   local `takedown` done and counted it, with no knockout and no feedback. Narrow window; a `tdDenied` on a dropped
   assist done would make the client view exact.
3. Host as holder: its own grab ends through `runGrab`'s `!e.alive` abort (takedownController.ts:377), so `grabs.lost`
   rises and a `takedown` abort event fires for a successful team takedown. Stats / feedback only.
4. `assistPlan` allocates a plan per offered frame (existing `pickTakedown` pattern); could reuse a scratch plan.
5. `PlayerWeapons.shotCount` restarts at 0 if the weapons object is rebuilt; a small backward-wrap delta (<= 16) would
   play up to 16 phantom partner rounds once. Rare; resync on a weapons reset would close it.
6. Host's own assist `done` does not re-check reach (relies on the per-frame abort); fine in practice.
7. e2e-coop no longer exercises the client's grab-menu Knock out in co-op (the step now does the team takedown); the
   client `td done` path stays covered by the earlier client takedown step. Run e2e-coop on the laptop before merge.
8. Host per-client shot noise still reads `PF.firing` (REPORT open item; gameplay, not audio).
