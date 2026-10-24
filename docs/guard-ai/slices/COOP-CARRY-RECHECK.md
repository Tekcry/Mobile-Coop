# COOP-CARRY re-check (fix round 9cb311a6)

Checker: fresh Opus, read-only (this file only). Branch `feature/guard-ai-coop-carry`, `git diff 50405e05 9cb311a6`.
Read: agent-preamble, CLAUDE.md "Hard rules", COOP-CARRY-CHECK-A.md, COOP-CARRY-CHECK-B.md, COOP-CARRY.md "Fix round",
`bodyCarry.ts` (solo lift / let-go / drop), `body.ts` (`beginHoist`, `drop`), `carryView.ts`, `clientCarry.ts`, the
host and client carry paths.

## Verdict: PASS

All three findings from checks A and B are closed. Nothing is broken. Two small parity gaps came in with the fix
(findings 1 and 2), each with a one- or two-line fix. Finding 3 is cosmetic.

## Runs
- `npx vitest run tests/coopCarry.test.ts`: 17 / 17 pass.
- No static `src/net` import outside `src/net` (grep of `from '.../net/'`).
- No e2e (as briefed).

## (a) e2e-coop "client carries a body": closed, honest
- `tp()` calls `allowTeleport(3)` (3 s grace) on every remote, teleports the client, then waits until the host's
  `r.feet` is within 0.6 m of the target. This is exactly the hide's precondition, so the 12 m clamp can no longer
  cause a refused hide. Whether the hide and pick up happen is still asserted on the host (`hidden`, `carried`,
  `carries`).
- The freeze covers alive guards with no own `update` only (`Enemy.update` is a prototype method, so the override
  takes). The victim's earlier override is skipped and left alone. The `finally` deletes only what it froze, and it
  runs on every exit, including an `until` throw.
- The freeze cannot mask what the block tests. "Never found" is now asserted structurally: the guard is still down
  and `!b.present`, while carried and 3 s after the hide. Guards and cameras only ever find `present` bodies, so a
  real leak (a body still on the floor list) fails the assert whether guards run or not. What the freeze removes is
  the wake-up race, which is a flake, not a target of this block.
- The `found0` assert is gone (it was meaningless after `beginHoist`). The mirror wait now comes before the first
  teleport.

## (b) Quiet early let-go: closed for the let-go; see finding 1 for the other drop causes
- Solo let-go (`BodyCarry.liftStep`, crouch while `atBody`): the body is never hoisted, there is no noise and no move.
  Host side now: `remoteDrop` takes `letGo()` when the view is not shouldered. That means no impulse, no `hear`, and
  with a ragdoll available the body settles where it lay (the fresh rig is still in the captured lying pose, because
  `CarryView` never calls `hoist`). The behaviour matches solo.
- The window is right for a let-go. The client can only crouch-cancel at client `t <= 0.8 s`. The host view's
  `onShoulder` flips at `CQ.liftRise` (1.6 s) on its own clock, which is about one RTT ahead, so a let-go is heard
  only if RTT is over 0.8 s. The two other early `drop-body` sends (`ClientCarry.begin` refused, `takeUp` with no
  local body) arrive at host `t` of about RTT, and are quiet as intended.
- A real put down from the shoulder is still heard. The client can `beginDrop` only when `!busy` (client
  `t >= 2.0 s`), with the hand-over at +0.6 s, so the host view is long shouldered by then: `drop()` plus
  `hear(at, DROP_NOISE)`, unchanged. A hide is unchanged too.
- Client mirror: a partner's early let-go is now `letGo` (the body lies still), which matches the carrier's page. This
  is cosmetic, because the client has no guards.

## (c) No prompt without a local body: closed
- Item then kill event: the most common order, since the host sends the snap before `ev` in the same tick.
  `syncItems` records `{ it, on }` with the prompt off (no `kept` yet). The `kill` case then sets `kept` and calls
  `bodyPrompt`, which enables it.
- Kill event then item: `kept` is present when `syncItems` runs, so the prompt is on immediately.
- Puppet with no rig (`dying` path): no `Body`, so no prompt. That is correct, because `takeUp` would refuse anyway.
- A late joiner gets no prompt, so neither the noise nor the "body jumps to the client" case from A2 / B3 can start.
- Allocation: `bodyItems.set(..., { it, on })` and the stale sweep run in `syncItems`, which runs only when items are
  sent (on a change or every 2 s), not per frame. `CarryView.letGo` allocates a `Vector3` only per event. Nothing is
  added to a per-frame loop.

## Findings
1. **A client downed (or held or dropped out) during the first 1.6 s of its lift is now silent on the host.**
   - `remoteDrop` is shared by `drop-body`, `onRemoteDeath`, `hold`, `removeRemote` and `carryStep`
     (`!alive || held`). All of them now take the quiet `letGo` branch before `onShoulder`.
   - Solo (`BodyCarry.fixedUpdate`): a carrier who goes down mid-lift always runs `dropCarried`, which makes the
     `DROP_NOISE` (and the push once the body is hoisted). Before this round the host heard it too.
   - This is narrow: the guard that downed him is usually already engaged. It is still a 3 m noise that solo makes.
   - Fix: make only the `drop-body` use path quiet. For example, give `remoteDrop(id, heard = true)` a parameter and
     call `remoteDrop(r.id, v.onShoulder)` from `onUse`, or skip `letGoHeard` when `!r.alive`. Keep the noise on the
     death path.
2. **On the client, the "Pick up body" prompt can stay off for up to 2 s after a partner puts the body down or lets
   it go.**
   - `syncItems` runs before `carryMirror` (coopClient.ts ~472-474). So the item `on: true, by: ''` is evaluated
     while the local copy is still `carried` (the view's `beginHoist`), and `clientBodyPrompt` gives false.
   - `carryMirror` then lays the body down (`letGo` / `drop`), but nothing re-runs `bodyPrompt`. The prompt waits
     for the next items send (the `ITEMS_EVERY` 2 s refresh).
   - Before this round, the prompt came back on that same snapshot. It recovers on its own.
   - Fix: call `this.bodyPrompt(eid)` in `carryMirror` after `this.letGo(eid, prev)`, or after the loop for changed
     ids.
3. Cosmetic, over the ragdoll budget only. `CarryView.letGo` lays the body flat at `b.pos`, which is the hips point,
   with root at hips height plus `chest.d * 0.5`. It also uses the carrier's yaw + 90 degrees instead of the body's
   own heading, so the body can turn and float slightly instead of "lying where it was". This does not matter for
   gameplay: the body is `present` again and can be found at about the same spot.
