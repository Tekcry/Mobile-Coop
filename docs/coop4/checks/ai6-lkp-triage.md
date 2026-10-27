# AI6 (1) "last known position within 2 m" triage (desktop run on d0f574cb)

Failure: `AI6 (1): each last known position within 2 m of where its player stood when last seen (worst 10.28 m)`,
`{"n":23,"badSlots":0,"badHunt":0,"lkpMax":"10.28","minPos":"13.76","minKnown":"21.22","dSeen":0,"hunts":[0,0,2,2,1,1],"slots":[0,2,1]}`.
Every earlier (1) assert passed. (2) / (3) results were not in the excerpt.

## What the test compares (scripts/e2e-coop.mjs, the AI6 (1) host step hook)

- Per **player slot**, not per guard: for i in host / B / C, `s[i] = intruders.find(id_i)`, then
  `hypot(b.x[s[i]] - stand[i].x, b.z[s[i]] - stand[i].z)`, where `stand` is the fixed room spot (`R0/R1/R2.player`), max
  over every 0.25 s sample of the 6 s hide (`lkpMax`). The board's x/z are the slot's LKP (`IntruderBoard.report`,
  `src/ai/intruders.ts`), written only by sight (`reportSighting` -> `reportIntruder`, `src/ai/enemyManager.ts:618`),
  a drone, a located shot (`:2699`) or a heard body noise (`reportHeard`, `:2797`). "Where he stood when last seen"
  assumes nobody sees him after the hide teleport.
- `minPos`: least distance from any guard's position to ANOTHER room's slot LKP. `minKnown`: same from the guard's
  `knownPt` (his working point = his hunt's LKP, `src/ai/enemy.ts:2921`). Both are the A148 "never walks to an intruder
  he did not see" check and passed (> 3 m).

## Which pairing gives 10.28 m

Room 3 was the workshop: `minKnown` 21.22 = hypot(21 - 9, -14.5 - 3), C's stand (21, -14.5) against B's LKP (9, 3).
The workshop row had `lane: [20, -24.75]`, which snaps to the nav centre (20.25, -24.75); hypot(21 - 20.25, -14.5 + 24.75)
= **10.28**. No other pairing fits: host stand to host hide 31.8 m, B 27.8 m, the dock lane 11.9 m, any cross-slot
pairing 17 m+. So C's slot LKP moved to C's hide spot: C was reported AT the hide.

Not a slot-vs-index mixup (the test reads `find(id)` per player; `hunts` match `slots` per room, `badHunt` 0), not
`ghostOf`, not the AI5 team-shared hunt (no response team in this block; the board is written only by the paths above,
each with the player's own feet or the noise point).

## Root cause: test staging bug (scripts/e2e-coop.mjs:2430, before this fix)

C's hide (20, -24.75) is in the east lot, east of the x 14.5 chain-link fence (`src/world/maps/warehouse.ts:481`), in
line with the workshop's open facade door (gap x 17..18.1, `warehouse.ts:219`, no door leaf) and its open window
(x 11.5, `:224`). A SightWorld probe (`buildWarehouse` boxes, eye 1.55 / 1.0 m, target 1.0 / 1.3 / 1.6 m) finds **41 of
330** workshop floor points with a line to (20.25, -24.75): x 14.75..17.75 through the door and a diagonal x 6.75..10.75
through the window. The pair spawns at (14, -14.5) / (14, -13.3) (no line), but in combat they close on C's LKP
(21, -14.5) and (16, -14.5) on that walk sees the hide. In combat sight needs no light (`expo = los ? 1 : 0`,
`src/ai/enemy.ts` perceive), and `takeSighting` (`enemy.ts:2361` -> `:1444`) reports C's feet: his LKP becomes the hide.
The AI is right (he was seen); the spot is not hidden. The S24 lane spots for the host (-3.75) and B (8.75) were probed
walled off in S24 (`docs/guard-ai/slices/S24-COOP-TRIAGE.md`); the workshop / mezzanine spot (20, -24.75) never was.

Product bug: none.

## Fix (applied)

```diff
-        { name: 'workshop', player: [21, -14.5], guards: [[14, -14.5], [14, -13.3]], lane: [20, -24.75] },
+        { name: 'workshop', player: [21, -14.5], guards: [[14, -14.5], [14, -13.3]], lane: [2.75, -24.75] },
```

(2.75, -24.75) is in the dark lane between the host's and B's hides (6 m from each), behind the trailer cab: the probe
finds **0 of 4468** interior points (whole building, 0.5 m grid) with a line to it, nor to 2.25 / 3.25 / (2.75, -25.25)
around it; no room's guard spawn or stand sees it. D's lane rule (`R2.lane[0] > 0`) still puts D at (-16, -24.75).
Plus a diagnostic: the hook records `lkpWorst` (player index, LKP, `seenT`, `locT` at the worst sample) into the
failure text, so a next miss says who and whether it was sight (`seenT` ~0) or a heard step (`locT` only).

## Risk

- Test only (no src change). A laptop result on it counts for the same src.
- Residual: every lane spot (host, B and the new C one) is visible from the yard just outside the workshop door
  (probe: 50-53 yard points within 8 m of the door). If a workshop guard leaves the building through that door within
  the 6 s (cover pick or search outside), he sees a lane player and `badHunt` / `lkpMax` fail; `lkpWorst` will show it.
  Unlikely: his LKP (21, -14.5) is inside and no search starts in 6 s.
- The mezzanine row keeps (20, -24.75); it is not picked today (workshop has 0 open lines). If it ever is, it needs the
  same probe.
- (2) / (3) not analysed beyond this: (2) reads `lkpB` (B's LKP, unaffected), (3) does not use C's hide.

## Checks run

- `node --check scripts/e2e-coop.mjs`: OK. No src change, so no tsc / vitest needed.
- The SightWorld probe was a throwaway vitest file (deleted, not committed).

## Reruns

- `e2e-coop` on the fix commit (`E2E_GPU=1`), laptop queue.
- `e2e-sectorops:8` (its AI6 legs (4)-(6) also first ran after the merge; not checked here).
