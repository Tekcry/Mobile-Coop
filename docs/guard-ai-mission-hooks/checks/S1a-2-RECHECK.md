# guard-ai-mission-hooks S1a-2: fix round re-check
Owner: Guard AI Build. Status: current.

Re-checker: fresh Opus 5.5. Head checked: `2b9947b9a` (fix round `7e9300090..2b9947b9a`: `src/ai/enemy.ts`,
`src/ai/enemyManager.ts`, `tests/missionOrdersManager.test.ts`, `scripts/e2e-stealth-ai.mjs`, +97 / -9). Against:
S1a-2-CHECK-A / -B item 1, the lead ruling on PLAN Design 1 ("A woken guard ... is never offered an order", absolute),
check B polish 1.

## Verdict: PASS

## Runs on 2b9947b9a
- `npm run typecheck:fast`: clean.
- `npx vitest run` missionOrders, missionOrdersManager, enemyGunMerge, enemyLightsOut, enemyManagerDespawn, breaker,
  guardRelight: 7 files, 95 passed.
- Mutation: with `trackCut` moved back after the hold return, the new "order first, then the order drops" case fails
  (restored; tree clean). e2e not run (queued on the laptop).

## The three items
1. `circuitOut` (`enemyManager.ts:1329`): `trackCut(group)` now runs after `n === 0` and before the `holdsCircuit`
   return. `trackCut` is idempotent and side-effect free for the tamper logic; while the order holds, `relightStep`
   sees `circuitBusy` true (the hold) and keeps `cutGoneT` NaN; after a drop with the circuit off it unmarks the group
   `BREAKER_WALK.retry` s later, as polish B1. Flag off: `holdsCircuit` is false, so the call order is the old one.
   The vitest case holds through `retry + 5` s (no incident, lamps known), drops the walker ('down'), then checks
   nothing at `retry - 0.5` s and one incident plus one `resetBreaker` after `retry`: it pins the timing both ways.
2. `Enemy.woken` (default false) is set only in `inherit`; `orderRefusal` returns 'woken' right after 'down'.
   `ringBell` offers a tagged woken guard whether he heard or not, so he is recorded 'woken', never 'unheard'. Leaks
   checked: `inherit` is called only by `revive` (host / solo), always on a `new Enemy`; `placeSlot` guards are new
   Enemies (field default false); no Enemy pooling or slot reuse of instances; `clear()` disposes every Enemy; co-op
   clients run no AI and never call `inherit`. A woken guard knocked out again is woken again (intended: absolute).
   The vitest case goes through the real `inherit` and the real `missionOrder`: phase
   'dropped', cause 'woken', 0 members, no slot, no bark.
3. e2e `kOn` replaced: K is revived through `em.ctx.revive`, the woken K2 is found by `e.woken`, a fresh
   'e2e-later' event is raised, and the assert needs K2 present, not on any order, his own member state
   `M_DROPPED` (3) and cause 'woken'. A build without the field fails `kWoken`; one without the gate puts him on
   'e2e-later' (`kOrd` non-null, state 0). It can now fail. Board fields read (`find`, `per`, `mem`, `memSt`, `memN`,
   `cause`) are public.

Nothing else changed behaviour. Hot paths: `trackCut` is event rate (allocates only when its list grows, as before),
the gate is one boolean read; nothing new per step. Strict TS clean.

## Polish (not blocking)
1. e2e `kCause` reads the slot's last cause; it is 'woken' only because `revive` pushes K2 last on `em.enemies`, so
   `ringBell` offers him last. `kSt` (his own member state) is the robust part; say so in the comment or drop `kCause`.
2. e2e: the 'e2e-later' event also offers P and O (same tag); P, near the post, may take it and walk until (b)'s
   `t.reset()`. Harmless now; note it if a later step is added between (a) and (b).
3. Check A polish 6 is closed by item 2; CHECK-A's line "a woken guard keeps his zone / slot tags ... offers him once
   he is calm" no longer holds (he is refused 'woken').
