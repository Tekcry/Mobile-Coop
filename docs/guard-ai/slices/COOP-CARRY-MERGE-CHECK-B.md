# COOP-CARRY merge check B (gameplay parity)

Merge 1d2f3e1d = origin/master 6e8a450b (4.93.0, rig-pose-fix S5 / S3 / P8) into PR #313 b1daa9a1. Read-only check;
targeted tests only.

## Verdict: PASS

Master's S5 carry changes are ported line for line into `BodyCarry`; the client kill body lies where the host's `Body`
lies (same `deathLieOn`, same floor probe); A1 is correct. One parity gap on instant drops (below) is cosmetic: the body
stays findable on the host where the host draws it, play continues.

## Checks

| Master change (`git diff 6b44efb8 6e8a450b -- src/game/stealthSystems.ts`) | Branch | Result |
|---|---|---|
| Pickup yaw from `b.lieChest` (sim lie, not ragdoll) | `src/game/bodyCarry.ts:131` | same |
| `carrySide(yaw, liftYaw)` from `ai/bodyLie` | `bodyCarry.ts:152` (local `carrySideOf` removed, identical formula) | same |
| Instant drop: in front, `c.yaw + PI/2` | `bodyCarry.ts:166-168` | same |
| Hand-over: at his side, `c.yaw + PI` | `bodyCarry.ts:192-195` | same |
| Crouched hands from `b.shoulders()` (P8) | `bodyCarry.ts:349` | same |
| Host / solo path | `stealthSystems.ts` delegates to `BodyCarry` with `em.canRagdoll`, its noise, `onLetGo` re-enables the item | same behaviour |

- Partner view `src/net/carryView.ts:32-33`: side from `lieChest` + `carrySide`, seen from the avatar's feet. The sign
  depends only on which side of the body's axis he stands, so it equals the owner's (which uses the stepped-in point on
  the same side). `drop` (`carryView.ts:58-68`) uses the hand-over formula with `a.yaw + PI`: matches the owner's put
  down on every page.
- A1, `CarryView.letGo` (`carryView.ts:72-80`): correct. `at.y = pos.y - lieLift(p)` and `dropLie` adds `lieLift` back,
  so pelvis, chest and `headYaw` come back bit-identical (the floor-probed y included). This equals the owner's own
  crouch let-go, where the body was never hoisted and never moved. Old `avatar.yaw + PI/2` would have turned it.
  Let-go is only possible before `CQ.liftReach` (0.8 s), `onShoulder` flips at `liftRise` (1.6 s): 0.8 s margin against
  mirror lag.
- Client kill body (`src/net/coopClient.ts:797-802`): same `deathLieOn(…, g.ballistics, …)` call as master's client
  ragdoll (inputs `buf.latest()`, yaw, away-from-killer), so the S3 ledge-lip floor probe runs on the same static
  collision as the host's (`src/ai/enemyManager.ts:677`). `Body` constructor copies the scratch lie (`setLie`) and snaps
  the ragdoll / lays the rig on it, as the host's. Input gap (snapshot feet vs sim feet, killer direction vs impulse) is
  master's P13 approximation, unchanged. Over the ragdoll budget the body is now laid on the lie (master disposed it):
  better, carryable.
- Perception: a client's carry calls `beginHoist` at accept (`carried = true`, `present = false`) so guards
  (`enemy.ts:1209/1214/2337`, `enemyManager.ts:733/2543/2576`, light sample `3488`) skip it at once; hide sets
  `hidden`. After any drop `Body.pos` = the lie pelvis the ragdoll snaps to, so it is findable where the host draws it.
- Tests: `tests/coopCarry`, `bodyPos`, `g7CloseQuarters`, `carry`: 4 files, 52 passed. `npm run typecheck:fast` clean.

## Polish list (not blocking)

1. Instant drop shown as a hand-over. When the carrier goes down (or the host's own `dropCarried`: restart, host down),
   the owner runs `dropCarried` (`bodyCarry.ts:304`, 0.7 m in front, head `yaw + PI/2`) but the other pages run
   `CarryView.drop` (`coopHost.ts:1507` via `onRemoteDeath` 545 / held / gone; `coopClient.ts:1225`): 0.5 m at his
   side, head `yaw + PI`. Result: the carrier's own page draws that body ~0.9 m off and turned 90 degrees from where the
   host's guards find it. Pre-merge the position already differed; the merge added the 90 degree turn (master moved only
   the hand-over to `+ PI`). Fix: a `CarryView.dropFront` with the `dropCarried` formula for the not-asked drops.
2. Mid-lift drop not asked (carrier down before `liftRise`): host side-drops it (`letGoHeard` true), a third page lays it
   back (`coopClient.ts:1225`, `!onShoulder` -> `letGo`), the carrier's own page front-drops it. Three lies for one rare
   case; pre-existing in the PR, not from the merge.
3. Client kill `Body` is built `lethal = false` (`coopClient.ts:802`); nothing on the client reads it today, but pass the
   real value if the kill event carries it.
