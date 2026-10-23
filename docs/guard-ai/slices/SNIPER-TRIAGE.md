# Sniper triage: e2e-enemies "sniper relocates after its shots" (2026-10-24)

Branch `feature/guard-ai-sniper` off master cacd0c7e. Verdict: **game bug** (S16 fire gate fed a wrong armour verdict),
not a stale test. S21 is not involved (the sniper never holsters: `carry=2`, drawn, throughout).

## Evidence
- Last pass: `C:/NightShift/scratch/runs/voxelretire-c8d1b5da` (c8d1b5da, before S16 / S21 merged): relocates (1, moved
  4.5 m). First fail: Player's flag-off run `20261023T202045-player-build-a8ff2d45` (guard-models, flag off): "(0, moved
  3.0 m)". Guard-models' `enemy.ts` changes are render-only with the flag off.
- Diagnostic trace (this branch de2a51f5, desktop worker; the scenario now prints it when he does not relocate):
  in cover 740, `los=1`, his fire gate HELD (`heldTicks` 0 -> 16 -> 31 -> 61) for one 0.25 s verdict at the start of
  each peek, each hold dropping his wind-up (`wu` 0.70 -> 0.00 at t7.0); first round only at t8.3, no second before he
  left for cover 741 (moved 3.1 m), so `shotsHere` never reached 2 and `postT` never reached 9 s inside the window.
- There is no armour in the Warehouse. Real Havok (`tests/armourFireStatic.test.ts`, failed before the fix):
  `Ballistics.armouredFirst` returned true for a plain level wall.

## Cause
`src/weapons/ballistics.ts:103-110` (and `ray()` at :132, E10) read armour from the hit shape's filter bits
(`(r.shape ?? r.body?.shape).filterMembershipMask`). The level's static body is one `PhysicsShapeContainer`
(`src/world/levelBuilder.ts:605-673`); Havok reports no leaf shape for a container hit (`r.shape` undefined), and the
container's filter reads back as Havok's default `-1` (every bit, the armour bit included) even after
`filterMembershipMask = G.STATIC`. So every plain wall was armour. A guard whose muzzle line touched his own cover (the
start of a peek, `enemy.ts` inCover cycle) got `armourBlocks` true: `tryFire` dropped his wind-up and burst
(`enemy.ts:3199-3203`) and the S16 reposition logic could fire too. The sniper (1.1 s wind-up, peeks 1.8 s of 4.2 s)
lost his wind-up every peek and never fired twice in the window.

Side effect of the same read since E10: `ray().armoured` was true for every plain wall, so player rounds never
penetrated thin plain walls (`playerWeapons.ts:1017`), against E10's stated intent.

## Fix (minimal, S16 / E10 intent kept)
- `src/physics/groups.ts`: `markArmoured(body)` / `isArmouredBody(body)` (a `WeakSet`, no allocation per read).
- Marked where armour is built: `LevelBuilder.buildGlass` (an armoured pane group's body), `Doors.addBody` (an armoured
  leaf). The collision bits are unchanged (rounds still stop on armour through the shot masks).
- `Ballistics.armouredFirst` and `ray()` read `isArmouredBody(r.body)`. A sniper with a clear line (or one into plain
  cover) fires as before S16; at real armour he still holds and repositions (S16 A80-A86 unchanged).
- Player rounds again penetrate thin plain walls (E10's design); armoured panes / leaves still stop every round.

## Files
`src/physics/groups.ts`, `src/weapons/ballistics.ts`, `src/world/levelBuilder.ts`, `src/world/doors.ts`,
`tests/armourFireStatic.test.ts` (new, real Havok), `tests/armourFireWiring.test.ts` (stand-in bodies marked like the
game), `scripts/e2e-enemies.mjs` (sniper brain trace on failure), `changes/feature-guard-ai-sniper.md`.

## Tests run (laptop)
- `npx vitest run` armourFireStatic (new: failed before the fix on the level-wall case, passes now), armourFireWiring,
  armourFire, armour, polishBatch, sectorGuardFreezeSeeThrough, warehouseCoopS2, changesFragments: all pass.
- `npx tsc --noEmit -p .`: clean. eslint on the changed files: clean.
- No local e2e (rule). Queued: set `sniper-fix`, suites e2e-enemies, e2e-stealth-ai, e2e-combat (combat added: player
  penetration through plain walls comes back). Request id: 20261023T225704-night-shift-guard-ai-63c7a676-b450 (on 63c7a676).

## Open
- Timing risk: if the sniper's seeded dice still leave the second round late, the e2e window (9 s + walk) could still
  be tight; the trace prints on failure for the next triage.
- Bodies built outside LevelBuilder / Doors (e.g. a future armoured prop) must call `markArmoured`.
