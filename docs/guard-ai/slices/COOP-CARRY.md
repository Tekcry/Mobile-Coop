# COOP-CARRY: co-op body carry on the client (spare job #14)

Branch `feature/guard-ai-coop-carry` (off master 6b44efb8). Ask (orchestrator, spare-jobs row 14): "Co-op body carry on
the client: bodies are not in the item mirror (`ITEM_KINDS` has no 'body'; host `items()` never emits them); needs an
item kind, host-authoritative pickup, carry state on the wire". Prototype quality (G4): basic, working, CT-faithful.

## What the host (and solo) does today
- Bodies: `EnemyManager.addBody` makes a `Body` (`ai/body.ts`: ragdoll kept, or laid flat over the ragdoll budget) per
  downed guard, `enemyId` set; `BODY.max` 12 kept (found / hidden first out, never a carried one).
- `StealthSystems` (`game/stealthSystems.ts`) owns the local player's carry: one item `body-<b.id>` (kind `body`,
  "Pick up body", `BODY.reach` 1.4 m) per body; the press runs `pickUp`: a 2.0 s committed lift (`liftCurve`: kneel at
  the chest, crouch cancels to 0.8 s, `beginHoist` (a fresh rig captured from the corpse, `carried` true), hoist to the
  socket, `shoulder` at `CQ.liftRise` 1.6 s, settled at 2.0 s); the shoulder is the side the head lies (`carrySide`).
  Carrying: speed cap `BODY.carrySpeed` 0.8 m/s, bend `CQ.carryBend` 0.38 rad, weapon suspended, no traversal / team
  move / takedown / strike / gadget; the interact is a hide spot (1.5 m), else a door faced, else "Drop body" (0.8 s
  put down, `dropCurve`, the ragdoll takes it at `CQ.dropHand` 0.4 s, noise 3 m). `dropCarried` is the instant drop
  (carrier down, restart). Hide: `Body.hide` (gone, never found), `bodiesHidden`, feed "Body hidden".
- Guards: S4 bodies found (`bodyNotice`, `present` only: a carried or hidden body is never found), S7 cameras the same
  through `present`. No rule reads the carrier (a carrying player is seen as any player).
- GPU skinning (CARRY-FIX / CARRY-FIX2): the carried rig is a fresh `buildBodyRig` (merged smooth mesh); the body
  effect watchdog (`bodyEffectRecovery.ts`) recompiles a stalled body effect and restores GPU skinning. Any new body rig
  built through `buildBodyRig` / `Body` gets it for free.
- Co-op today: the client keeps a bare `Ragdoll` per `kill` event (`CoopClient.kept`) and drops it when the snapshot's
  `bodies` (lying body enemy ids) leaves it out. Host items skip kind `body` (not in `ITEM_KINDS`), the client has no
  `StealthSystems` (no `EnemyManager`), so: a client cannot pick up, and nobody sees a body on a partner's shoulder
  (takedowns.md: "The carry has no MoveState (a partner sees no body on the shoulder, as before)").

## Design
(a) Bodies in the item mirror. Host `items()` emits one item per body that is not hidden (cap order: after the `c-`
devices and crates, before the rest): `{ id: 'body-<b.id>', k: 'body', x, y, z (b.pos), yaw 0, label 'Pick up body',
hold 0, reach BODY.reach, on: lying (present and nobody's), e: <enemy id>, by?: <carrier player id> }`. State:
`on` = down; `by` = carried by that player (the host's own id for its own carry, from the moment its lift starts);
gone from the list = hidden (or removed). The item signature includes `by`, so a change goes at once.

(b) Host-authoritative pickup / drop / hide through the existing `use` (no new message type):
- `use { id: 'body-<id>' }`: pickup. The host checks (pure `net/bodyCarryNet.ts` `pickupOk`): sender alive, not held,
  not already carrying, the body present and nobody's (the host's own lift included), within `inUseReach` (reach +
  0.75 m, |dy| <= 2), MoveState `ground` (or none) - the host's own rule (`!traversal.active`); no takedown of his
  running (no `seized` entry by him). Accepted: `Body.beginHoist` at once (carried: guards stop finding it, nobody
  else can take it) and the body goes on the carrier's shoulder on the host's screen at `CQ.liftRise`.
- `use { id: 'drop-body' }`: drop. Sent by the client at its own put down's hand-over (0.4 s in), so both pages ragdoll
  it together. Host: the body off the carrier's shoulder into a ragdoll at his side, the 3 m drop noise to the guards.
- `use { id: 'hide-<i>' }`: hide. Host: the sender carries a body and the hide spot `hide-<i>` is in `inUseReach`;
  `Body.hide`, `bodiesHidden`++, feed "Body hidden". Refused: nothing (the client keeps carrying).
- The client does nothing on a pickup / hide press until the mirror says so (`by` = me: start its own lift; the item
  gone: hidden); the put down runs at once locally (never refused).

(c) Carry state on the wire = the body item's `by`. No MoveState change: each page derives the carrier's pose from the
mirror. The local carrier (host, solo or client) runs the very same carry code: `StealthSystems`' carry is moved
unchanged into `game/bodyCarry.ts` (`BodyCarry`: the lift, carry, put down, hands, bend, speed cap), used by
`StealthSystems` and by the client's `net/clientCarry.ts`. The client keeps its lying bodies as `Body` objects
(was a bare `Ragdoll`), so its own lift hoists the very body it shows. `GameState.carrier` (`stealth` or
`net.carry`) replaces the carry reads of `stealth` (the speed cap, weapon suspend, traversal / takedown / strike /
gadget blocks, the interact target, the pose). A partner carrying (`net/carryView.ts`, both pages): his body item's
`by` -> the body lifted (`beginHoist`) and on his avatar's shoulder at `CQ.liftRise`, the avatar bent (`CQ.carryBend`,
`carryBody`, `carrySide`) with its hands on the body's knees; `by` gone with the item still listed -> a ragdoll drop
at his side; the item gone -> hidden (the rig goes).

(d) Guards: unchanged rules, host only. A body a client carries is `carried` on the host (not `present`): never found
by guards or cameras; a body it drops is found as any lying body; a hidden one never. No carrier rule.

(e) Disconnect / rejoin / death / restart: host drops a client's body where he stood (`Body.drop` at his feet) when he
goes down, is held for rejoin (R2 `hold`) or leaves; the restart removes bodies (the course / section respawn) and the
carry map follows `em.bodies`. The client's own carry: down -> the instant drop (`BodyCarry`), its body item gone or
not his -> the carry ends (rig disposed or dropped as the mirror says).

(f) Save shape untouched (no save field).

## Protocol change (exact)
- `NetItem.k` gains `'body'`; `ITEM_KINDS` appends `'body'`.
- `NetItem.e?: string` (the enemy id the body was; `id()`-sanitised) and `NetItem.by?: string` (the carrier's player id;
  `id()`-sanitised), both only on `body` items; absent / malformed = none.
- `use` unchanged in shape; new id meanings `body-*` (pickup), `drop-body`, `hide-*` from a client.
- PROTOCOL_VERSION: left at master's number. CLAUDE.md "Definition of done" and `docs/systems/auto-train.md`:
  `scripts/merge-train.mjs build` (`planWire`) bumps it to master + 1 once per train when a member's diff touches a wire
  path (`src/net/` + protocol.ts's imports), which this branch does. Every test reads the constant
  (`tests/protocolConst.test.ts` guards it); the new tests do too.

## Tests (unit)
- `tests/coopCarry.test.ts`: protocol encode / decode of a body item (`e`, `by`, junk dropped, kind `body` parsed);
  `pickupOk` / host validity (distance, body taken, carrying, dead, held, mode); `carryViewStep` mirror state
  transitions (down -> carried by me / by partner -> dropped / hidden).

## e2e (written, not run here)
- `scripts/e2e-coop.mjs` block "client carries a body": host knocks a guard out (scripted), the client walks to it,
  picks it up through its mirrored item, both pages show it carried (host: `Body.carried` and on the client avatar;
  client: `carrier.carrying`), the client hides it at a hide spot (or drops when the map has none), the host's guards
  never find a hidden body (`em.bodies` entry hidden, `found` false after sim steps).
