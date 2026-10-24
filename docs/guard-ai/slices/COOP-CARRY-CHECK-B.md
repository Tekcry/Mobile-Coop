# COOP-CARRY check B (gameplay parity and regressions)

Checker: fresh Opus, read-only. Branch `feature/guard-ai-coop-carry` head 50405e05, diff against master 6b44efb8.
Read: agent-preamble, CLAUDE.md "Current goal" + "Hard rules", takedowns.md (carry), coop.md, COOP-CARRY.md, the full diff.

## Verdict: PASS

No broken or wrong behaviour in the game code that blocks the prototype. Fix finding 1 before the laptop runs the e2e,
or it will probably fail. Findings 2 and 3 are small fixes. The rest is polish.

## Checks run
- `npx vitest run tests/coopCarry.test.ts`: 15 / 15 pass.
- `npx vitest run tests/g7CloseQuarters.test.ts` (the lift, the carry side, the put down): 13 / 13 pass.
- `npm run typecheck:fast`: clean.
- No e2e (as briefed).

## 1. Solo and host carry: unchanged (verified line by line)
- `BodyCarry` (`src/game/bodyCarry.ts`) matches the removed `StealthSystems` code:
  - `pickUp` (the step-in, `CQ.liftStepMax`, the wall ray, `liftYaw`, the shoulder side through `carrySideOf`, which is
    the same expression).
  - `dropCarried`, `beginDrop`, `handOver`, `endMotion`, `holdStill`, `liftStep`, `dropStep`.
  - `fixedUpdate` (the bend / drop / stepping / load reset, drop on death, the speed cap `BODY.carrySpeed`,
    `CQ.carryBend` / `carryDrop`).
  - `frameUpdate` (the hands at the shoulders, then at the knees), `nearSide`, `socketNode`, `dispose`.
- What moved without changing behaviour:
  - Noise goes through `hooks.noise`, which is `StealthSystems.noise`.
  - The crouch let-go re-enables the item through `onLetGo`, as before.
  - `hideCarried` now calls `takeOff`. Its extra `endMotion` does nothing, because a hide is only offered when not busy.
  - The bend reset now runs after the door and body-item loops, which do not read it.
  - The 'body' pickup event now fires just before the item is disabled. Only the audio thud listens to it.
- `StealthSystems` keeps `carry` as a get / set property, plus `carrying`, `busy`, `bend`, `bendDrop`, `stepping`,
  `loadShare`, `liftStepK`, `loadSide`, `dropCarried` and `pickUpBody` (the A4 grab carry). `onBodyRemoved` and
  `reset` both go to `carrier.reset()`, which is the same as the old code.
- `GameState.carrier` is `stealth ?? net?.carry ?? null`:
  - Solo and host get `stealth`. `CoopHost` has no `carry`, so the host's carry is never stepped twice.
  - Every replaced read (`gameState`, `gadgetSystem`, `strikeController`, `takedownController`) is the same expression
    on solo.
- Drop on damage, takedown, ladder and climb are unchanged:
  - Down: `fixedUpdate`, `!alive`, then `dropCarried`.
  - Climb, ladder and traversal: the `carrying` gate in the fixed step and the `pickUp` check `traversal.active`.
- GPU skinning restore: `bodyEffectRecovery.ts` and `smoothBody` are untouched. The watch runs per smooth-body mesh,
  so the client's new `Body` rigs (built through `buildBodyRig`) get it too.

## 2. The client's carry and parity
- Pick up, carry and put down: the client runs the same `BodyCarry` on its own kept `Body`, and gets the same
  2 s lift, 0.8 m/s cap, bend, weapon stow, blocks and 0.8 s put down.
- The host's view: `CarryView` calls `beginHoist` at the accept and shoulders the body at `CQ.liftRise`.
  `RemoteAvatar.carryLoad` / `carrySide` / `carryKnees` give the partner's bend, lean and hands on the knees.
- Guards: a body a client carries is `carried` on the host, so it is not `present`. S4 `bodyNotice` and the S7 camera
  pass never find it.
  - A dropped body (`Body.drop`) is `present` again and can be found. A hidden one never is.
  - The drop noise is `em.hear(at, 3)`, the same `hear` as the host's own put down.
  - No rule reads the carrier, so a carrying client is seen exactly as a carrying host. Light sampling is per present
    body, as before.
- The three known gaps are acceptable for the prototype (all cosmetic):
  - Gap 1 (the lift steps at most 1 m): the report understates it. The client's ragdoll is pushed away from the client
    (`away * 12 + 3 up`), while the host's KO lies where the takedown left it. The two bodies can rest more than 1 m
    apart, so the client's hands and hoist reach for its own body wherever it lies. This is visual only.
  - Gap 2 (a body the client never saw fall): it works, but see finding 3.
  - Gap 3 (the snap at 1.6 s): acceptable.

## 3. The e2e "client carries a body" block
It waits on sim time (`waitHostSim`). It asserts what matters:
- the host lifts the body (`carried` and `carries`);
- the client's lift starts and finishes;
- the host shows the body on the shoulder (`onShoulder`);
- the body is hidden on the host, the client's carry ends, and the body is never found.

Problems:
- **Finding 1: the hide teleport will probably be refused.** The client teleports to the nearest hiding spot. In the
  warehouse mission that is about 12 m or more from the knockout spot at (6, -6): (-6.0, -7.2) or (-3.3, -16.5).
  - The host is never told to allow the teleport (`r.allowTeleport`).
  - `RemotePlayer.accept` then clamps the host's copy of the client's feet to about `gearCap * dt + 0.75` m per state,
    roughly 0.8 m per 50 ms state while carrying.
  - After only `waitHostSim(A, 400)`, the host can still hold the client outside the spot's reach (1.5 + 0.75 m).
    `remoteHide` then refuses the single hide press without telling the client, and
    `until(A, 'host hides the client body')` times out.
  - Fix: before each teleport, call `GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(2); })`.
    Or replace the fixed waits with `until(A, the host's r.feet within 1 m of the target)`.
  - The first teleport, beside the body, is short and low risk, but should get the same treatment.
- **Finding 2: stage out the wake-up flake.** A guard can find the KO'd body and wake him before the lift.
  - The takedown pin (`aware.set('unaware')`) stops at the start of the takedown, and it runs on rAF, which does not
    run on the backgrounded host.
  - Fix: at the top of the block, freeze every other live guard on the host with `e.update = () => {}`, the override
    the script already uses on the victim. Then `delete e.update` after the block.
  - `found0 === false` proves nothing: `Body.beginHoist` resets `found`. Assert instead that the guard is still knocked
    out (not revived) and that `b.present === false` while carried.
- Minor: the first teleport reads the client's mirrored item before the `until(B, 'client mirrors the body item')`
  wait. It is safe in practice (`kept` arrives in the same snapshot), but the wait should come first.

## 4. Docs
- `coop.md`, `takedowns.md`, `TESTING.md` and `changes/feature-guard-ai-coop-carry.md` match the code: the item
  fields, the `use` ids, the `pickupDenied` rules, `carrier`, the drop on down / hold / leave, and no save change.
- Not documented:
  - finding 3;
  - the grab-menu "Carry" pick on a client is still a plain knockout: `takedownController.carryStep` needs
    `g.stealth`, which a client has none of. This was already so before the branch, and is in scope for "carry on the
    client".

## Findings to fix
1. e2e: allow the client's teleports on the host, or wait until the host's feet copy reaches the target. Otherwise the
   hide step is likely refused and the block fails (section 3).
2. e2e: freeze the other guards for the block, and replace the `found0` assert, which proves nothing (section 3).
3. **Finding 3: a cancelled lift makes a noise solo never makes** (`coopHost.remoteDrop`).
   - When the client cancels its lift with crouch before the hoist, `onLetGo` sends `drop-body`.
   - The host has already run `beginHoist`, so it ragdolls the body at the client's side and calls `hear(at, 3)`.
   - In solo the let-go is silent and the body does not move.
   - Gap 2 (a client that never saw the body fall) goes the same way: a 3 m noise, and the body jumps to the client's
     side.
   - Fix: in `remoteDrop`, when `v.t` is still inside the lift's at-body window (`liftCurve` `atBody`, about 0.8 s),
     lay the body back in place with no impulse and no `hear`.

## Polish list
- The client gets no noise-meter spike and no feed line for its own put down or hide. On the host, a client's hide
  emits no 'body' event, so the host's audio plays no thud for it.
- After a put down, the mirrored body item keeps the drop-moment hips position (in the air, at the shoulder's side)
  until the 2 s `ITEMS_EVERY` refresh.
- On the client, a host crouch let-go plays as a small ragdoll drop at the host's side, while the body lies still on
  the host.
- In sandbox the client mirrors only `medkitWall` items (`mirrorOnly`), so it gets no pick-up prompt there.
- Client hide spots ignore the sector `section` scope. The host's `remoteHide` does not check scope either, so the two
  agree.
