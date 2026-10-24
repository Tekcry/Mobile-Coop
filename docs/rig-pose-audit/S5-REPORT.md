# rig-pose-fix S5: body position and lie from sim (report)

Slice 5 of `REPORT.md` (items G8, G9, P8, P9, P13; ranked fix 5). Branch `feature/rpf-s5` off `feature/rig-pose-fix`
63f22ad2 (master 4.88.1). Lines re-found on this base.

## What

- `Body.pos` (the pelvis) and a new `Body.lie` (pelvis, chest point, head yaw) are sim state:
  - At death: the guard's sim feet and yaw (`Enemy.pos`, `Enemy.yaw`) plus a pure settle offset. The head points along
    the death impulse's horizontal way (backward from his facing when it has none). The pelvis settles
    `LIE.settle` 0.5 x hip height (~0.47 m for a 1.8 m guard) along it, at `LIE.lift` 0.55 x chest depth off the floor
    (the ragdoll torso capsule's radius). A static wall on the fall line holds the pelvis back so the body fits
    (one `Ballistics.hitDistance` ray on `G.STATIC` at death: collision, allowed).
  - On a put down: the pelvis at the drop point `at`, the head toward a given yaw.
  - `Body.update` no longer copies the rig hips into gameplay state (`sync` removed). Everything that reads `Body.pos`
    (guards noticing bodies, its light, searches and calls, the pick-up prompt, a revived guard's spawn) now reads sim.
- The ragdoll is visual. `Ragdoll.snapTo(lie)`: when a kept ragdoll settles (3.5 s, 2.2 s after a drop) it eases onto the
  lie in `SNAP_EASE` 0.3 s (pelvis onto the lie's pelvis, turned about the vertical so its head points the lie's way).
  Out of ragdoll budget the rig is laid straight on the lie (`carryPose.layAt`, was rotated flat where it stood).
- Pick-up (G9): the step-in target is the lie's chest point and head yaw (`Body.lieChest`). The carry shoulder comes from
  the lie's head yaw (`bodyLie.carrySide`, same formula as before). The carry hand IK keeps reading the drawn shoulders
  (`Body.shoulders`, P8 presentation).
- Co-op client (P13): the wire has no body position (`kill` event: enemy, kind, by, head; `snap.bodies`: ids only). As
  briefed, the client computes the host's lie from the puppet's last host state (`buf.latest()` feet and yaw, else the
  drawn pos) with the fall away from the killer (local player or the partner avatar). The client ragdoll eases onto it.
  No wire change, `PROTOCOL_VERSION` untouched.

## Files

- New `src/ai/bodyLie.ts` (Babylon-free): `deathLie`, `dropLie`, `lieAt`, `carrySide`, `LIE`, dimension helpers.
- `src/ai/body.ts`: `deathLieOn` (the room ray + `deathLie`), `Body.lie`, the lie in the constructor and `drop`,
  `lieChest` / `shoulders` replace `liftPoints`, `sync` removed, `lay` lays on the lie.
- `src/ai/ragdoll.ts`: `snapTo`, `headYaw`, the settle ease (`SNAP_EASE`).
- `src/ai/enemyManager.ts` (`ctx.addBody`): computes the death lie from `e.pos` / `e.yaw` / the impulse. The death hook
  in `src/ai/enemy.ts` (S6's file) was not touched: `addBody` already hands over the guard, so the lie is computed there.
- `src/game/stealthSystems.ts`: step-in and carry side from the lie; hands from `Body.shoulders`; drop head yaws.
- `src/net/coopClient.ts`: the kill event places the client ragdoll on the lie.
- Docs: `docs/systems/ai.md`, `docs/systems/takedowns.md`, `docs/systems/coop.md` (one line each).

## Decisions (assumed; undo by reverting the slice)

- D1 The settle offset is a fixed share of the hip height, not scaled by the impulse size, so the client (which knows no
  impulse size) computes the same lie. Undo: add an impulse term in `deathLie`.
- D2 The client's fall direction is "away from the killer" (`e.by`); the host's is the impulse direction. They agree for
  rounds and takedowns (both point from the attacker to the guard); an explosion kill can differ (host: from the blast).
  Exact parity would need the lie (x, z, head yaw) on the `kill` event: a wire change, not made.
- D3 Drop head yaws: the put down (`handOver`) lies along the carrier's side, head toward his back (`c.yaw + PI`: the torso
  hung down his back); the instant drop (`dropCarried`) lies across in front, head to his right (`c.yaw + PI/2`). The old
  out-of-budget lay at `c.yaw + PI/2` put the feet at `at` and the body through the carrier.
- D4 The ragdoll eases onto the lie only after it settles (physics free while it falls); an out-of-budget body is laid
  straight (joints `carryJoints(0)`, the spine keeps its death bend).

## Tests

- New `tests/bodyPos.test.ts` (12, real Havok on a NullEngine): pure lie cases (same inputs same lie, impulse size
  ignored, settle and chest, backward fall, wall hold-back, drop lie, carry side); same lie -> the same `Body.pos` and lie
  for two ragdolls from different rig poses and one laid body through 5 s of physics, the ragdoll off the lie mid-fall
  and on it after the ease; the step-in chest from the lie; the static wall ray; drop sets pos and lie (ragdoll and laid).
- `tests/bodySearch.test.ts`: + a guard sent to a body walks to and searches round its sim lie (8 pass).
- Run one at a time, all pass: g7CloseQuarters 13, carry 9, carryState 17, coopGuardCarry 8, camBodyWiring 13,
  securityBodies 12, enemyManagerDespawn 4, sectorRestart 9, cqGait 19. `npx tsc --noEmit -p .` clean; eslint on the
  changed files clean.
- e2e (laptop queue, not run here): e2e-stealth-ai (`bodies`, `carry`), e2e-guard-carry, e2e-stealth.

## Open items

- A client out of ragdoll budget still drops the dead puppet's rig (no body drawn), as before.
- The ease turns a settled ragdoll up to 180 degrees about its pelvis in 0.3 s when it fell the other way from the lie
  (visible if watched); a wall-side death may lay the head into the wall visually (the pelvis is held back, the head is
  not folded). Polish list.
- No changelog fragment written (the batch lead's fragment for `feature/rig-pose-fix`).
