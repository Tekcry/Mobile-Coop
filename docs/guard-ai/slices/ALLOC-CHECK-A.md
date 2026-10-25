# ALLOC-CHECK-A: PR #446 feature/guard-ai-alloc @ 864520c4c (Opus checker A, behaviour identity)

Verdict: FIX (one blocker: tsc fails on the new manager test). The runtime refactor itself is behaviour-identical.

## Checks run
- `npm run typecheck:fast`: 1 error, `tests/guardAiAllocManager.test.ts(34,174)` TS2322 `FakePlayer[]` not assignable
  to `readonly PlayerRef[]` (missing `speed`, `crouched`). CI `build-check` on the PR is red with it.
- vitest, 26 files (the 3 named + bodySearch, carryState, coopGuardAi, deviceTrip, guardHeadParity, guardPolish2,
  guardPolishA, lockedDoorPath, pairsWiring, postsWiring, responseWiring, s6CloseOn, searchAreaWiring,
  sectorGuardTags, squadWiring, urgency, combatHearing, fourIntruders, twoIntruders, enemyManagerDespawn, nav,
  campusS5, sectorRestart): 544 pass, 1 skipped.

## Fix list
1. tsc: `tests/guardAiAllocManager.test.ts` line 34 passes `() => ps` (FakePlayer[]) as the players getter.
   Done looks like: cast at the boundary (`() => ps as unknown as PlayerRef[]`) or give FakePlayer `speed: 0,
   crouched: false`; `npm run typecheck:fast` clean; CI build-check green.

## Behaviour identity, hunk by hunk (all confirmed identical)
- shoot: `aim.subtractToRef(origin, SHOT_DIR)` = old `aim.subtract(origin)` (this - other into result); three
  distinct scratches, so no in-place aliasing. End `dir*range + origin` equals `origin + dir*range` bit for bit
  (IEEE add commutes). `SHOT_IMP = dir*3` as before. RNG draws unchanged (2 in sampleSpread). muzzle / aimAt /
  eye / every headPoint / aimPoint impl write all 3 components (copyFrom first), so a dirty scratch cannot leak.
- bite: point / dir / source copied into BITE_* at the call; normalize of a zero vector is a no-op in both.
  Argument evaluation order matches the old literal's field order.
- HitInfo reuse: every field the old literals set is rewritten per hit; `shieldHit` is reset (undefined vs absent:
  only `!h.shieldHit` reads it, no `in` / spread / keys anywhere). takedown / weapon / nonLethal are never set on
  HIT_OUT and no receiver writes any HitInfo field (grepped). Receivers read at once: PlayerTarget / RemotePlayer
  (onDamaged: gameState bearing, gameAudio, coopHost copies sourcePos.x/z), Enemy as shield (die builds a fresh
  `imp`, knockHelmetOff reads dir.x/z, onKilled chain: gameState stats, all 5 modes, coopHost onKill, e2e kill logs
  copy fields). vfx tracer / muzzleFlash / sparks / hit, impactFx, props.impulse (Havok), coopHost tracer push,
  lamp sway, gameState suppress all copy or read during the call. No path re-enters another guard's shoot.
- enforcer sparks `tmpN.copyFrom(h.dir).scaleInPlace(-1)` = `h.dir.scale(-1)`; tmpN is only ever a sparks normal.
- grenade: THROW_FROM read by throwGrenade (velocity) and copied by Grenades.throw (`node.position.copyFrom`).
- goals: GOAL_OUT is only returned from decide / calmDecide / lightStep; the sole consumer is `update`
  (`move(goal.point, goal.speed, goal.face)` at once); move never stores the point. role / breaker / entry / sweep
  / lure / pair goals keep their own objects; no caller holds two results; no goalPt / goal call sits between a
  scratch fill and its return. KNOWN_TP / CHASE_ME / CHASE_CAND: goTo copies into routeGoal, pickAdvance reads,
  chasePoint may return tp / cand as the goal (read at once), leashed uses its own leashTmp. Old fresh arrays had
  no `.link`; the scratches never get one.
- blind pose: rig sets `lastFk = fk` whenever the emote returns, and only applies lastFk for the fade after emote
  is cleared; only blindEmote writes the per-guard pose, so the fade holds the last values as before. Same keys.
- index loops (findLeader, suppress, callAlert, shout, searchSlot, body-found, canRagdoll, alive): all over plain
  arrays; the array iterator re-checks length per step exactly like the index loop, so mutation mid-loop behaves
  the same. assignFlanker `break` = `some` short-circuit (one `alive` read per player, same order).
- refreshFlow: same live filter, order, heights; navGrid.flowField only reads goals / ys (no reference kept);
  `if (goals.length)` unchanged; flowPairs grows contiguously.

## Polish (non-blocking)
- `type Goal` duplicates the inline `{ point; speed; face }` used by roleGoal and friends; could reuse it.
- Stand-in guards built on `Object.create(Enemy.prototype)` lack the new `blind*` fields; harmless today (no
  test calls `blind()`), worth a one-line note if one ever does.
