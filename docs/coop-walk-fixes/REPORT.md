# coop-walk-fixes - REPORT

Branch `feature/coop-walk-fixes` from `feature/pose-parity` 19248c01. Brief: `BRIEF.md` (Michael's 4.72 walk, A1-A3).

## P6 - team takedown on a partner's hostage (A1, A2)

Cause:
- A1: on the client the host's hostage is a puppet that is not `taken` locally, so `TakedownController.find` offered an
  ordinary takedown. The press sent `td start`; the host refused it (`e.taken`, the host's own grab) and the client
  aborted. Nothing happened.
- A2: on the host a client's hostage is a host `Enemy` with `taken` set, so `find` skipped him. No offer.

Fix (host-authoritative, no new wire field):
- `NetAttachment.partnerHolds(v)`: host = a client's `seized` entry that is a hostage hold and whose MoveState is still
  `grab` on him; client = `EnemyPuppet.partnerHeld` (posed from a partner's `grab`, `remoteHeld`).
- `TakedownController`: such a guard is a candidate even when taken or in combat. `assistPlan` (pure, `takedown.ts`)
  gives plan kind `assist`: ground or wall, `TAKEDOWN.reach` / `dy`, line of sight, any side, approach 0. Row
  "Team takedown". The attacker stays put facing him for `TAKEDOWN.strike`. The guard is never seized, posed or
  released by the attacker. The holder letting go first aborts it.
- `NetAttachment.assistTakedown(v, ph, lethal)`: the host's own applies at done. A client sends `td` with kind `assist`.
  The host checks start (`assistHolder` in `net/assistTakedown.ts`: held as a hostage by another player, `TD_REACH`) and
  applies done only when that still holds. `CoopHost.assistApply` ends a client holder's `seized` entry (the host's own
  grab sees him down and ends), knocks him out (kill on a held press), plays the takedown noise, and credits holder and
  striker: a dual takedown banner (`DualClock`), `onRemoteTakedown(by, 'assist')` for the course feed.
- `tdDenied` on the client no longer resets a puppet that the partner still holds.

## P7 - partner shot audio (A3)

Cause:
- Doubling: `RemoteAvatar.fireVisuals` fired a round every fire interval while `PF.firing` was set. `PF.firing` means
  "fired within the last 0.2 s" (`firingRecently`). A single pistol shot spans two intervals, so it played twice, and
  bursts ran long.
- Not suppressed: `remoteShot` carried only the weapon class. `CLASS_GUN.pistol` is the open 1911, and `remoteShot` was
  never passed `suppressed`.

Fix (wire change, PROTOCOL_VERSION 37):
- `PlayerState.sc` = rounds fired mod 256 (`PlayerWeapons.shotCount`), sent by host and client and validated (0..255).
- `net/remoteShots.ts` `RemoteShots` (pure): one round per counter step, spaced at the weapon's fire interval. The first
  counter only syncs. A jump over 16 resyncs silently (a rejoin). At most 8 rounds queue.
- `onFire` passes the weapon id and `PF.quiet`. `gameAudio` plays `remoteGun(cls, gun)` (the partner's `pistolSd`, not
  the class's pistol) with `suppressed` (the synth fallback at 0.3 gain). The suppressed muzzle flash is 0.35x, as the
  owner's. `WeaponAudioStats.remoteSd` counts suppressed remote rounds.

## Files

`src/game/takedown.ts`, `src/game/takedownController.ts`, `src/game/gameState.ts`, `src/game/gameEvents.ts`,
`src/net/assistTakedown.ts` (new), `src/net/remoteShots.ts` (new), `src/net/coopHost.ts`, `src/net/coopClient.ts`,
`src/net/enemyPuppet.ts`, `src/net/remoteAvatar.ts`, `src/net/protocol.ts`, `src/weapons/playerWeapons.ts`,
`src/audio/gameAudio.ts`, `src/audio/weapons/guns.ts`, `src/audio/weapons/weaponAudio.ts`; tests
`tests/coopWalkFixes.test.ts` (new) and the PROTOCOL_VERSION asserts (36 -> 37) in hangDownNet, jammer, jammerFixes,
moveState, net (the version 36 refused / 37 joins case), poseParity, rejoin, sectorLampSync, sectorStep3;
`scripts/e2e-coop.mjs`, `scripts/e2e-weapon-audio.mjs`; docs `systems/coop.md`, `systems/takedowns.md`,
`systems/audio.md`, `systems/testing-tools.md`, `TESTING.md`.

## Tests

- `tests/coopWalkFixes.test.ts` 15/15: assistPlan reach / dy / LOS; assistHolder both ways (host holds, client holds,
  the holder itself, not a hostage, holder out of the grab); the dual pair; TakedownController with a stub game (solo no
  offer; partner hold offered while taken and alert; press does not seize or move him; done / kill / abort calls; holder
  lets go aborts with no release; out of reach); RemoteShots (one round once, burst spacing, 254 -> 2 wrap, resync, cap,
  clear); remoteGun; pstate `sc` parse and clamp; PROTOCOL_VERSION 37; td kind assist parse.
- Single files passing: hangDownNet 6, jammer 39, jammerFixes 10, moveState 16, net 72, poseParity 12, rejoin 12,
  sectorLampSync 11, sectorStep3 7, takedown 18, g7CloseQuarters 13, hangDownTakedown 7, dualTakedown 7, weapons-audio
  16, grabMenu 3.
- `npx tsc --noEmit -p .` clean. eslint clean on every changed file.
- e2e, desktop lane 2 (port 4192, `E2E_GPU=1`, `E2E_JOBS=1`) after `npm run build`: e2e-takedown PASS (11 s);
  e2e-weapon-audio PASS (28 s), including the new step "a partner's suppressed round plays suppressed".
- Not run here (laptop): e2e-coop, e2e-netmove. e2e-coop has a new step: after the client's grab, the host is teleported
  1.1 m beside the hostage, must be offered the team takedown and start it, the guard is knocked out on the host, the
  client's hold ends, and the dual count goes up. It replaces that step's client grab-menu knock-out; the client's td
  done path stays covered by the earlier client takedown step.

## Assumed decisions

- A4: "coop takedown" read as the team takedown on the held guard, credited as a dual takedown for holder and striker
  (the existing co-op takedown reward). Undo: drop the `takedownDone(holder)` call in `CoopHost.assistApply`.
- A5: the menu row is a knockout (as every ground takedown row); a kill needs the held direct press. Undo: TD_LABEL /
  ctxRun.

## Open items

- e2e-coop and e2e-netmove on the laptop (the new e2e-coop step is unrun).
- The host's per-client shot noise still reads `PF.firing` (gameplay noise, not audio; unchanged).

## Changelog

`changes/feature-coop-walk-fixes.md` (minor): the team takedown both ways; one sound per partner round with the
weapon's own sound, suppressed when it was; protocol 37.

## Fix round 1 (laptop e2e-coop FAIL on c6b4f4a3)

Failing assert: "two takedowns together count as a dual takedown", the step right after the new team takedown step
(which passed). e2e-netmove passed.

Cause: test state, not a game bug. The old dual step asserted absolute counts (`net.duals === 1`, `style.duals === 1`):
before P6 it was the first dual of the match. The new team takedown is itself a dual takedown (holder + striker,
`assistApply` -> `takedownDone(holder)` then the host's own done), so the counters stood at 1 when the old step began and
reached 2. The game credits exactly one dual per team takedown and the old step's `dualClock.reset()` already clears any
pending pairing, so nothing else leaks.

Fix (`scripts/e2e-coop.mjs` only):
- The dual step takes its baselines (`net.duals`, `style.duals`, knockouts) after the clock reset and asserts exactly +1;
  the event count (listener added there) stays `=== 1`, and the pair ids are unchanged. Same strength as before.
- The team takedown step now asserts exactly `d0 + 1` (was `> d0`): a double credit would fail it.
- The team takedown step empties the client's `.hud-banner` at its end: the banner's text stays in the DOM after it hides,
  so without this the old "client sees the dual takedown" check would pass on the team takedown's banner.

Tests: `npx tsc --noEmit -p .` clean; `node --check` on the script (eslint ignores scripts/); `tests/coopWalkFixes.test.ts`
15/15; e2e-takedown PASS on a desktop lane (GPU, JOBS=1, 14 s, dist current with src). No unit test added: no game logic changed. e2e-coop not run here (laptop).
