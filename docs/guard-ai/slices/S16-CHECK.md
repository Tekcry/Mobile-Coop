# S16 check - armoured fire gate (2026-10-23)

Fresh Opus checker (did not build S16). Checked on the merged head: `feature/guard-ai-s16` 58691dcb = S16 (d6b43740) +
master 4.75.0 (E10, Sector Ops #217, guard-ai S1-S12). Against: STATE.md's S16 request ("before a burst, muzzle-to-aim
on MASK.ENEMY_SHOT; armour first = hold fire, reposition (S8 roles)"; the PLAN.md row on feature/guard-ai only points
there), `slices/S16.md`, BRIEF A80-A87. No e2e, no browser (brief).

## Verdict: PASS

No blocking finding. The merge itself needed three fixes (below, made in 58691dcb), all covered by unit tests.

## The merge (58691dcb)
- `src/ai/enemy.ts:229-237`: S16's fields kept; `pauseT` uses master's seeded `this.rng.range(0.6, 1.4)` (S16 used
  `rand(` nowhere else).
- Name clash: master's S12 added `Enemy.armour: boolean` (body armour gear, `enemy.ts:563`); S16's gate field
  `armour` is now `fireGate` (`enemy.ts:230`), with `tests/armourFireWiring.test.ts` and the e2e block
  (`scripts/e2e-sectorops.mjs:3013`) updated. tsc caught it; it would not have compiled.
- Order in `decide` (`enemy.ts:2176-2202`): S8's `roleStep` first, then the S16 armour check. Reasons: a bound the group
  started or allows is not cut short; in sight `roleStep` returns null (`enemy.ts:2039`), so a role holder still reaches
  the armour check; every role fire path (overwatch `suppressLkp` -> `tryFire('suppress')`, peeks, seekCover fire) goes
  through `tryFire`, so the gate covers it. A reposition calls `ctx.blockCover(coverIdx)` (`TACTICS.blockS` 5 s) on the
  cover it leaves and sets `roleCover = -1`, so the 2 Hz role picks do not send him straight back; `boundTo` clears a
  pending `armourPick` (`enemy.ts:2066`). Off armour nothing changes: the block needs `fireGate.blocked`, the chase
  branch needs `fireGate.moveT > 0`. Recorded in A82 and `slices/S16.md`.
- `tests/incidents.test.ts:765`: the stubbed Enemy lacked the gate (`onLevel` resets it on combat end); stub gains
  `fireGate`. This also failed on the S16 build branch (not in its test list).
- New fire paths on master: none outside `tryFire` (the only `shoot` call is `enemy.ts:2561`; S12 helmets / deflect are
  player -> guard hits; S6 / S10 add no fire).

## What I checked
- **The cast is the real line.** `muzzle()` / `aimAt()` (`enemy.ts:2565`, `:2575`) are what `shoot` uses
  (`enemy.ts:2591-2592`): same origin (eye - 0.2, 0.45 forward, 0.18 right, blind raised), same aim point before spread
  (head when `losHead` or a shield, else `aimPoint`; suppress / blind at `lastKnown`). Mask = the shot's mask
  (`MASK.ENEMY_SHOT`, + `G.ENEMY_HITBOX` against a shield, `enemy.ts:2585` vs `:2605`).
- **`armouredFirst`** (`src/weapons/ballistics.ts:92`) resolves in `ray()`'s order (hit volume, then prop, then the armour
  bit on `r.shape ?? r.body.shape`): identical to `ray().armoured` (`ballistics.ts:116-121`; test
  `armourFireWiring.test.ts:81`).
- **Maps tag armour where #217 places it.** All four `ArmourPiece`s are built armoured: S4 `arm-mantrap`
  (`campusS4.ts:370`, `doorAt(..., armoured: true)` -> `levelBuilder.door` -> `doors.ts:178` `doorMembership(true)`),
  S4 `arm-noc` (`campusS4.ts:405`, `b.glass(..., { armoured: true })` -> `levelBuilder.ts:376-393`: its own container,
  child and container shapes `glassMembership(kind, true)`), S5 `arm-front` (`campusS5.ts:444`) and `arm-ante`
  (`campusS5.ts:512`). No other map sets `armoured`.
- **Ordinary glass is not blocked.** `G.GLASS` / `G.GLASS_FROSTED` are not in `MASK.ENEMY_SHOT`
  (`physics/groups.ts:41`): the cast reaches the player's hit volume -> false -> he fires (test
  `armourFireWiring.test.ts:62`). A wall first is not armour either (he fires into the wall, as before).
- **No hot-path allocation.** `armourBlocks` writes `fireFrom` / `fireTo`; `eye`, `aimPoint(out)`, `headPoint(out)`,
  `nav.cellOf`, `ArmourGate.gate/check/plan/step` and `armouredFirst` allocate nothing; the cover-pick cast reuses the
  same vectors. (`decide`'s return literals are the existing pattern.) `hyp2` only; no `Math.hypot` in the S16 code.
- **The 0.25 s cache** (`armourFire.ts:68`): recast when the time runs out or either nav cell (muzzle, aim; `cellOf`
  takes y, so the NOC mezzanine and the hall differ) changes; `reset()` on combat end (`enemy.ts:1362`); a clear line
  zeroes `held` and ends a move (`armourFire.ts:84-86`).
- **Reposition cannot loop.** `plan` starts a move only after 1 s held and with `cool <= 0`; a start sets `cool` 14 s
  (`moveT` 8 + `retry` 6): at most one move per 14 s per guard. A move ends on a clear line or after 8 s; no clear-line
  spot -> chase (`enemy.ts:2273-2277`) on the flow field (`chasePoint`, leash-clamped by `leashed()`); held to a room or
  a post leash with the target outside it -> hold only (`plan(!outside)`). Cover pick casts are capped at 6 per pick.
- **Co-op host only.** No `src/net` change, `PROTOCOL_VERSION` 35 and `SAVE_VERSION` 9 untouched (diff vs master: only
  `src/ai`, `src/weapons/ballistics.ts`, tests, docs, the e2e block); client players are `PlayerRef`s on the host.
- **Docs.** BRIEF A80-A87 match the code (A82 gains the role order); `docs/systems/ai.md:282`, `combat.md:63`,
  `TESTING.md` (S16 line after master's S8 / S12 / S10 lines), changelog fragment `changes/feature-guard-ai-s16.md`
  current; `slices/S16.md` line pointers refreshed to the merged file, the S8 note updated.

## Tests run (merged head)
- `npx tsc --noEmit -p .`: clean. eslint on `src/ai/enemy.ts`, `src/ai/armourFire.ts`, `src/weapons/ballistics.ts`,
  `tests/armourFire*.test.ts`, `tests/incidents.test.ts`: clean. `node --check scripts/e2e-sectorops.mjs`: OK.
- vitest, 38 files, 0 failures: armourFire (9), armourFireWiring (11, one new: role order, `blockCover`, `boundTo`),
  squadRoles, squadWiring, gear, gearWiring, armour, glass, campusGlass, posts, postsWiring, campusPosts, tactics,
  tactical, archetypes, perception, losParity, corners, enemyLightsOut, enemyManagerDespawn, awarenessWiring,
  radioWiring, camBodyWiring, pairsWiring, alarmCall, polishBatch, incidents, hearing, sectorGuardTags, coopTorches,
  securityBodies, securityCamera, securityCameraE8, laserAlarm, laserPanels, sectorRestart, speedGears.

## Polish list (not blocking)
1. The cache key is the cell pair only, not the fire mode: a switch aim -> suppress / blind inside 0.25 s reuses the last
   verdict, and a player who steps behind armour inside the same two cells can draw up to 0.25 s of rounds (A81 accepts
   this).
2. The gate casts to the aim point before spread; a round that misses the player can still fly on and spark on armour
   behind him (shoot's ray runs to weapon range). Cosmetic.
3. The muzzle sits 0.45 m ahead of the eye (unchanged from `shoot`): a guard pressed to a pane could start his round
   past it. Pre-existing E10 geometry, needs a guard within ~0.45 m of the glass facing it; watch in e2e.
4. Where no clear-line spot exists and the nav round is long (the NOC pair), a guard repeats a move every ~14 s. Bounded,
   by design (A82); tune `retry` after a playtest if it looks restless.
5. The chase probe (`enemy.ts:2207`) goes through `gate()`, so `held` / `heldTicks` also count ticks where he was moving,
   not wanting to fire. Debug counters only.
6. A role guard who repositions may be sent to another role cover with an armoured line at the next roles tick (the role
   picks do not test armour, only skip the cover he left for 5 s): he then holds there until the next move. Could
   teach `scoreCover` the armour line later.

## e2e the lead must request (all `E2E_GPU=1`; none run here)
- `e2e-sectorops --part=6` (the new "guards hold fire at armour" block at `scripts/e2e-sectorops.mjs:2967`, plus S4 / S5)
- `e2e-stealth-ai`
- `e2e-ct-warehouse` (combat and cover off armour unchanged)
- `e2e-ctcourse`
- `e2e-tactics` (S8 roles with the new `decide` order)

## Fix round (2026-10-23, after Test Runner's GPU run on fb192d45)
- Failure: `e2e-sectorops:6` "a NOC guard sees the player on the hall floor through the armoured window"; the five
  other suites passed. Root cause in the test (`scripts/e2e-sectorops.mjs`, the old spot loop): spots (2, 31), (0, 30)
  and (2, 27) are inside pod P1 (racks under its 3.0 roof), (4, 29) is under basket B1 for #15, and the pair were
  alerted before the search, so with no sight they left the window for the stairs while the first spots ran; by the
  one clear spot (-1.5, 32) the sill (4.6) hid the floor from where they stood. The game is right: `MASK.SIGHT` omits
  the armour bit, the pane is built with `glassMembership('clear', true)`, `los` is the raw ray (`Enemy.perceive`).
- Fix (A88): the spot is picked with the AI frozen by each NOC guard's own `perceive`, at hall west-aisle spots clear
  of the pods and baskets; then the AI goes on, the pair are alerted and the same `los` assert runs through the update
  path. The rest of the block (fire gate, no round into the glass, stay alerted) is unchanged.
- New `tests/campusS4NocSight.test.ts` (3 tests): the spots are clear from both posts +-0.3 m at chest / head 0.9-1.6,
  each line is blocked when arm-noc is made solid (the pane is on the line), the old in-pod spots have no line.
- `npx tsc --noEmit -p .`: clean. vitest `tests/campusS4NocSight.test.ts`: 3 / 3. `node --check scripts/e2e-sectorops.mjs`: OK.
- Rerun: `e2e-sectorops:6` (`E2E_GPU=1`). No `src/` change, so stealth-ai / tactics / ct-warehouse / ctcourse stand.

## Fix 2 (2026-10-23, after Test Runner's GPU rerun on 2e51e7e6)
- The new spot passed: sight through arm-noc, the gate cast and held (e51 5 casts / 29 held ticks), 0 rounds into the
  window. Then FAIL "the pair stay in combat": both `alerted` false after the hold.
- Root cause in the test: the block never set `window.__app.loop.manual`, so rAF stepped the sim in real time between
  the e2e's round trips and the nominal 1.5 + 10 s ran past `ALERT.lostSight` 12 s (src/ai/alertState.ts:181;
  `Enemy.sinceSeen` starts at 99, so `min(sinceSeen, t)` is the time since the alert for a guard who never sees again).
  e50 (0 casts) and e51 were out of sight in their cover and timed out to searching: the pre-existing combat timeout, not
  the gate (A85: the gate never touches the level; `onLevel` resets it only on leaving alert).
- Fix (A89): `loop.manual = true` before the alert; the final assert prints level, time in level and time unseen.
- Polish (not blocking): e50 never wanted to fire (0 casts): with the 0.85 cover-first roll a NOC guard takes cover in
  the NOC, and crouched (eye 1.0 x scale, 4.6) he is at the sill and loses the hall. Pre-existing cover choice; could
  teach the cover pick to keep a sight line on the target.
- Checks: `node --check scripts/e2e-sectorops.mjs` OK; no TS change. Rerun: `e2e-sectorops:6` (`E2E_GPU=1`).
