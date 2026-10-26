# COOP-CARRY check A (wire and authority)

Checker A, fresh Opus, read-only (this file only). Branch `feature/guard-ai-coop-carry` head 50405e05, against master
6b44efb8 (`git diff 6b44efb8 HEAD`, 21 files).

## Verdict: PASS

No broken or wrong behaviour found on the wire or in the host's authority. Four minor items below (none blocks).

## Runs
- `npx vitest run tests/coopCarry.test.ts tests/crateWire.test.ts`: 2 files, 23 tests pass.
- `npm run typecheck:fast`: clean.
- No e2e (as briefed).

## What was checked

### Static imports (hard rule)
- No file outside `src/net` imports `src/net` by value: the only hit is `main.ts`'s dynamic `import('./net/coopUi')`.
- `src/game/bodyCarry.ts` imports nothing from `src/net`; `gameState.ts` takes `LocalCarry` / `NetCarry` as
  `import type` from `./bodyCarry` (src/game). The direction is net -> game only (`carryView.ts`, `clientCarry.ts`,
  `coopHost.ts` import `bodyCarry`). The test's source check covers the three game files.

### Host authority (`coopHost.onUse` -> `remotePickUp` / `remoteDrop` / `remoteHide`)
- `body-*`, `drop-body`, `hide-*` are caught before the generic item path. This also closes an old hole: before, a
  client's `use body-x` / `hide-i` reached the host's own StealthSystems items and made the HOST pick up / hide.
  No other interactable id starts with `body-` / `hide-` (grep).
- Pick up (`pickupDenied`): alive, not held, not already carrying, no guard seized by him, MoveState `ground` (or none),
  body `present` and not taken (host's own `stealth.carry` included, so the host's pre-hoist window where the body is
  still `present` is covered), reach + 0.75 m / |dy| <= 2, `far` counts a violation like the generic path. Matches the
  host's own `BodyCarry.pickUp` (`!carry && !busy && present && !traversal.active`) plus stricter co-op checks.
- Two players on one body: requests are serialised on the host; the accept runs `Body.beginHoist` at once (`carried`,
  so `present` false) and the host's own item is disabled by `setEnabled(it, b.present)`; the host's own press then
  fails `present`. The reverse (host lifting first) fails `taken`.
- Stale / replayed: `drop-body` without a carry is a no-op; a second `body-*` is `carrying`; `hide-*` without a carry
  fails `hideOk`; every request is re-validated against current state.
- Carrier down / hold / leave: `onRemoteDeath`, `hold`, `removeRemote` call `remoteDrop`; `carryStep` also drops on
  `!alive || held`; avatar disposed only after the drop. Client side: hostDrop (quiet, no echo) or the local death
  drop's `drop-body` lands on a no-op.
- Rejoin: the hold drops the body; a reconnecting client sees `by` gone and drops locally (`hostDrop`).
- S4 revive while carried: `EnemyManager.revive` returns on `!b.present`; carried and hidden bodies are never found
  by guards or cameras (both read `present`). `BODY.max` never evicts a carried body (host and client).
- Restart / cap removal: `carryStep` clears a view whose body left `em.bodies`; the client treats an unlisted carried
  body as hide, then the `bodies` sweep disposes it.

### Wire
- `NetItem.k` + `ITEM_KINDS` append `body`; `e` / `by` parsed only for `k === 'body'`, through `id()` (player ids and
  `body-b<n>` / enemy ids pass the regex); junk drops the field only; an unknown kind drops the item. Round trips
  tested both ways.
- Old-item compatibility: other kinds never gain `e` / `by` (tested); a v48 peer would drop `body` items as an
  unknown kind, but the version bump keeps mixed versions apart anyway.
- `crateWire.test.ts` change is honest: "crate is last" became "crate directly after medkitWall, before body"
  (append order), which is what the old assertion protected.
- Bandwidth: body items ride `items`, sent only when the signature changes (`id`, `on`, `label`, and now `by`) or on
  the 2 s refresh; body position is not in the signature, so a carried / settling body does not re-send per snapshot.
- Order / ids: ids are `body-<Body.id>` (host counter, stable for the body's life); bodies go at the start of pass 1
  (after `c-` devices and crates). The client keys everything by id / enemy id, so order only matters for the cap.

### PROTOCOL_VERSION
- Left at master's 48. `merge-train.mjs planWire` bumps to master + 1 when a member's diff touches `src/net/` (or
  protocol.ts's imports): this branch changes `src/net/protocol.ts` and adds `src/net/*.ts`, so it is bumped.
- No test asserts a literal version (grep over tests / scripts); `coopCarry.test.ts` only checks it is an integer.

### Allocation
- Per tick: `carryStep` (only while a client carries) and the client's `kept.values()` / `views.values()` frame loops
  use Map iterators, the same style the rest of `coopHost` / `coopClient` already use per frame (`avatars.values()`,
  `remotes.values()`); `CarryView.step` and `RemoteAvatar` carry hands use preallocated vectors. `bodyItems` /
  `carrierOf` run inside the snapshot builder, which already allocates every item object. Vector3 `new` only on
  drop events. Nothing new outside the existing pattern.

## Findings (minor, no FAIL)
1. A client's lift that ends before the hoist (crouch cancel, or `ClientCarry.begin` / `takeUp` refusing locally:
   traversal started in the RTT window, or a late joiner with no local body) sends `drop-body`; the host's
   `remoteDrop` then plays the 3 m `DROP_NOISE` to the guards. The host's own crouch let-go makes no noise
   (`BodyCarry.liftStep` -> `onLetGo`, no `noise`). Parity gap: a cancelled client lift is audible. A `let-go`
   distinction (or skipping the noise when the view was never shouldered: `!v.onShoulder`) would fix it.
2. Late joiner (risk 2 in the Built report): the mirror offers "Pick up body" at a body the client never saw fall;
   pressing it gets an accept, then the auto `drop-body` (with finding 1's noise, and over the ragdoll budget the body
   is laid flat at the client's side, i.e. moved).
3. Cap: bodies (up to `BODY.max` 12) are emitted before the rest of pass 1, so on a map whose in-scope items near
   `MAX_ITEMS` 128 they would push tail items (doors, terminals) off the mirror. Not seen as a real risk on current
   maps; worth knowing.
4. A refused pick up or hide is silent on the client (Built risk 6); the host counts `far` as a violation, as the
   generic `use` path does.
