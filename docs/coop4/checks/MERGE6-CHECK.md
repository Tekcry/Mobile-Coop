# coop4 merge check 6 (merge 24b75b79d, origin/master 4.115.0 = a2c778c43)

**FIX** (F1 blocks; F2 small, same area)

Checker: fresh Opus. Scope: the merge only (`git show 24b75b79 --cc`, both one-sided diffs).

## Conflicts (as resolved)
- `src/net/protocol.ts`: PROTOCOL_VERSION 71 (master's train bump), coop4's MAX_PLAYERS comment and `slotFromList`
  import kept. Master's only other wire change, `RETRY_CAUSES` + 'other' (course), merged clean. Correct.
- `src/net/coopClient.ts`: coop4 imports + `CharMates` / `mateOrderInto`; `setPlayerGlow` import correctly dropped
  (no caller left in the client; coop4's `glowBySlot` covers it; master did not touch `playerFigure.ts`). `teamSize()`,
  `slot()` = `selfSlot` and `relistMates()` side by side. Master's S2c never calls `slot()`, so the old "1 + joiner
  index" meaning is not relied on anywhere. Correct.
- `src/game/gameState.ts`: `NO_MATES` / `charMatesInto` beside `refSlot()` / `outIds`. Correct as text.

## 1. char-shadow-meter S2c vs coop4 slots
Overflow / double count: none. A client's `playerRefsInto` is `[localRef]` (it never sets `remotePlayers`, and
`outIds` is host-only: written by `SectorMode.onPlayerOut`, called from `coopHost`), so `nr` = 1 and `CharMates.into`
fills slots 1..3 under `s < max` (`FILL.players` 4); 3 partners fit exactly, a 4th could not exist (capacity 4). A
host has `NO_MATES`, so its slots are only `playerRefsInto` (<= 4, capped by `nr`). Lobby order vs slot order does not
matter for the client's mates: their light is not kept (`s < charRefs.length`) and only slot 0's own key is skipped.

### F1 (FIX) - host local OUT shifts the slots: one partner gets no capsule and a frozen light for the guards
- `src/game/gameState.ts:1177` leaves `localRef` out of `playerRefsInto` while the host is OUT, so `charRefs` =
  `[A, B, C]` (remotes, slot order). `fillChars` (`:1896`-`:1900`) still writes slot 0 from `localSampleInto(0)` (the
  host) and slots 1.. from `refs[1..]` (B, C): remote A, `refs[0]`, gets no capsule. `updateLight` (`:1831`) then
  writes slot 0 to `localRef.light` and slots 1.. to `charRefs[1..]`: A's `PlayerRef.light` is never written again.
- Scenario: Sector Ops, 3-4 players, `charShadowLight` on (/preview/ default). The host goes OUT (down, no syringe).
  Until the next connector, the lowest-slot connected partner's light stays at its last value: guards
  (`enemy.ts` reads `p.light`) see that partner as lit or dark regardless of where they walk (a lit partner can be
  invisible, or a dark one spotted), and the host's picture and the other players' meters lose that partner's capsule.
- Predates this merge (present at ^1 cf86db768: master's S2 `fillChars` beside coop4's OUT `playerRefsInto`), not
  caught by F27-CHECK; S2c keeps the same indexing. Flag off: not reached (the flag-off meter loops `remotePlayers()`).
- Minimal fix (no allocation; keeps the single `charMatesInto` read `tests/charMates.test.ts` pins): in `fillChars`
  take `const k = refs.length > 0 && refs[0] === this.localRef ? 1 : 0;`, fill slot s >= 1 from `refs[s - 1 + k]`
  with `nr = min(1 + refs.length - k, FILL.players)`, keep `k` in a field (`charLead`), and in `updateLight` write
  `s >= 1 && s < nr` to `this.charRefs[s - 1 + this.charLead]!.light`. Test: stub game, local in `outIds` and down,
  three remotes: every remote gets a slot and a light.

### F2 (FIX, small) - a client lists an OUT partner the host leaves out
- `src/net/charMates.ts:117`-`:120` (`mateOrderInto`) skips self and `away` only; `CoopClient.relistMates`
  (`src/net/coopClient.ts:458`) is not re-run when the OUT mask changes (`:1052`). On the host the OUT partner leaves
  `playerRefsInto` (no capsule); on the client it keeps an upright capsule (r 0.22, standing or crouch height) at
  its body for the whole OUT wait.
- Effect: the client's picture draws a round shadow at the lying OUT body that the host's does not, and the client's
  meter dips when that capsule sits between a lamp and its sample while the host's sample (what guards use) does not.
  Small (one thin capsule, only next to the body) but it breaks the same "counts on neither machine" invariant S2c
  states for a held partner, and the light-parity hard rule.
- Minimal fix: pass the OUT mask to `mateOrderInto` and skip `slotOut(mask, p.slot)` (the `PlayerInfo.slot`), and call
  `relistMates()` in `onSector` when `om !== this.outMask` (not hot: only on a mask change). Extend
  `tests/charMates.test.ts` (an OUT partner is skipped, comes back when the mask clears).

## 2. Auto-merged hunks in coop4-touched files
- `src/net/coopClient.ts`: `mates` / `mateOrder` fields, the lobby handler (recolour + relist), the `charMatesInto`
  hook (one closure, restored in `offs`), relist on avatar add (`:445`) and drop: all sit cleanly beside coop4's
  slot-based `recolour`/`glowBySlot`; no 2-player or slot-from-index assumption.
- `src/net/remoteAvatar.ts`: `shown` getter beside coop4's slot beacon. Fine.
- `src/game/gameState.ts`: compile log / compile groups (map-ready S14), `slotInto` refactor, the `s < charRefs.length`
  guard: player-count agnostic apart from F1.
- `src/core/flags.ts`: master's `guardPairs` / `lookouts` / `dogRelease` and coop4's `players`: separate lines.
- `src/player/characterRig.ts`: master removed the tri-lens helmet and the `addGlow` import; coop4's `setBeacon(1..4)`
  and `BEACON` (4 colours) untouched. Fine.
- `scripts/e2e-sectorops.mjs`: master's `pairLanes` helper and pair-check blocks are solo `want(1)` pages; coop4's
  `coop4()` helper and parts 10-12 untouched.
- `TESTING.md`, `docs/systems/testing-tools.md`: unrelated master lines. Fine.

## 3. Hot path
- `CharMates.into` (every sim step): indexed loop, kept records, no allocation. `charMatesInto` closure made once.
  `mateOrderInto` (a `for..of` iterator) and `CharMates.set` run only on a join, drop or lobby change. `fillChars` adds
  nothing. Master's `compilePoll` walks `Object.keys` only on a frame whose program count changed (load time; master's
  own S14 scope). Nothing new allocates per frame.

## Runs
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/charMates.test.ts tests/charOccluderFill.test.ts tests/playerRefsInto.test.ts
  tests/sectorOut.test.ts tests/net.test.ts tests/coopRejoin.test.ts`: 6 files, 154 tests passed (none covers F1/F2).

## Polish
1. With F2 fixed, the host's own OUT body still gets slot 0's capsule on the host (the meter needs slot 0) while
   clients skip it: a picture-only difference at a lying body; acceptable, or skip the capsule (not the sample) when
   the local player is OUT.
2. A downed (not OUT) operator keeps an upright capsule on both machines (master's S2 fill): consistent, but it casts
   a standing shadow from a lying body; master's char-shadow-meter owner, not coop4.
