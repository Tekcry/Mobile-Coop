# Slice L check - Sector Ops co-op light-state sync (protocol 31)

Checker: fresh, read-only. Range `93496451..536c1355` (worktree HEAD 536c1355), branch `feature/sector-redesign-light`.

## Verdict: PASS

No blocking findings.

## What was checked

- **Bitset encode / decode** (`src/net/lampSync.ts`): n = 0 gives `''` / `''` and decodes to 0 states; n not a multiple
  of 6 packs a partial last char and `bitAt` stops at the string end (reads "on"); `n` larger than the strings' bits
  reads the rest as on; non-alphabet or code >= 128 chars read 0 (and the parser rejects them first via `LAMP_BITS`
  and `LAMP_CHARS`); `n` is clamped to `[0, LAMP_MAX]` in the parser and again to `out.length` in `decodeLamps`;
  `applyLamps` clamps to the client registry length. No throw, no out-of-range index from peer input.
- **Join / rejoin / restart**: `lampForce` set on a new remote in `lobby`, on `rejoin`, and when `SectorMode.restarts`
  moves (field exists, `sectorMode.ts:96`, bumped at :506); a dropped first message (client world not up yet) is
  corrected by the 2 s keepalive. Host restart path (`sectorReset` -> `resetTo`) bumps the registry version, so the
  change path would send anyway.
- **Jam end on the same base**: the snapshot carries `baseOn` (jam bits left out); the client's `resetTo` writes the
  jam base bit under a running jam and keeps the flicker, so `jamEnd` on both pages lands on the host's base. A stale
  client base at `jamStart` self-heals on the next snapshot (lampState compares `baseOn`).
- **Light parity**: ids match across pages (fixed lamps from the level builder, torch slots from `addTorchSlots` on
  both; no runtime `add`). The client picture and meter read its registry (mirrored); guard perception is host-side on
  the host registry; client torch mirror untouched. Flashlights are skipped on both sides.
- **Host authority / cheat surface** (`coopHost.ts` `onLampShot`): draw phase, weapon (held or loadout), per-client
  4/s bucket (`TickLimiter`, `CTICK_RATE = 4`), alive, origin within 2 m of feet + 1.2 m, host `lightOnRay` along the
  claimed ray within the weapon's range must find that exact id (destructible, on, not destroyed), then a static
  line-of-sight with 0.6 m slack. The client never shoots a lamp out locally (it is a puppet: no `stealth`, `onRay` was
  null before). Remaining freedom equals aiming from where you stand. `lt-` targets never reached `onShot` usefully
  before (enemy lookup), so routing them away loses nothing.
- **Hot path**: `LampSender.step` returns on an unchanged `reg.version` with no work; a changed version runs a typed
  array loop; strings only on a send. `sendLamps` reads `mode.restarts` without allocating. Client `lampRay` allocates
  only when it sends.
- **Single player never imports `src/net` statically**: no value import of `src/net` outside `src/net`
  (`sectorReset.ts` only names `lampSync.ts` in a comment).
- **Version tests**: every `PROTOCOL_VERSION` assertion in `tests/` reads 31 (jammer, jammerFixes, moveState, net x5,
  rejoin, sectorLampSync, sectorStep3); no script asserts the number.

## Tests run

- `npx vitest run tests/sectorLampSync.test.ts tests/net.test.ts tests/rejoin.test.ts tests/jammer.test.ts tests/jammerFixes.test.ts tests/moveState.test.ts tests/sectorStep3.test.ts`
  - 7 files, 167 tests, all passed (3.3 s).
- `npx tsc --noEmit -p .` - exit 0, no errors.
- Not run (per brief): full suite, e2e (`e2e-sectorops` lamp block unverified here), build.

## Polish

1. Honest clients inflate `RemotePlayer.violations` on the lamp path: a shotgun's later pellets, or a second rifle
   round before the next `lamps` arrives, hit a lamp the host already destroyed (`lampShotOk` false); a penetration
   exit ray (`playerWeapons.ts:1008`) starts beyond the wall, often > 2 m from the chest. Only a counter today (read by
   `e2e-lib.mjs` NETSIM-STAT `clamps` logging), so no effect on play. Consider not counting a destroyed lamp as a
   violation, and skipping `lampRay` for penetration segments on the client.
2. `LightRegistry.setGroup` on a jammed lamp the flicker has dark changes only the jam base bit and does not bump
   `version` (pre-existing), so `LampSender` sees that switch only at the next flicker change or the 2 s keepalive.
   Short delay, self-correcting.
3. A late joiner / rejoiner's first `lamps` applies every already-shot lamp through `kill` with the sparks cue, so it
   gets a burst of sparks at every dead lamp on join. Cosmetic; a "first snapshot: no cue" flag in `LampMirror` fixes it.
4. On join, the forced send can land before the client's match exists and be dropped; the keepalive covers it within
   2 s. Fine for the prototype.
5. Host-side `onLampShot` does not hear the impact (`IMPACT_NOISE`) as the host's own `onRay` does; `shootLight`'s
   shot-light noise covers the main cue.
