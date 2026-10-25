# guard-ai-mission-hooks S1a-1 polish recheck
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker (Opus 5.5, fresh), branch `feature/guard-ai-mission-hooks-s1a1`, head 5db49d2ec against 26633b6f5
(src/ai/missionOrders.ts +89 -53, tests/missionOrders.test.ts +171 -53).

## Checks run
- `npm run typecheck:fast`: clean. `npx vitest run tests/missionOrders.test.ts`: 21 pass (was 15). eslint on both
  files: clean. `git diff --check`: clean. No line over 120 chars in either file.
- No caller outside the test yet (only `src/core/flags.ts` names the module), so the signature change breaks nothing.

## The four API rules
1. `add` (missionOrders.ts:242-260): a guard recorded `M_DROPPED` on the slot returns `st === M_DROPPED` and changes
   nothing (never revived, a repeat drop keeps the first cause); `maxMembers` full returns false; a live member offered
   `M_DROPPED` stays live and records no cause (check A polish 1). The S1a-2 pattern holds: a member already walking
   or arrived has `orderRefusal` 'order', so `add(M_DROPPED)` protects him; a fresh or done guard gets
   `add(M_WALKING)`; false skips `takeOrder`. Tested (:99-112).
2. `fail` (:325-331) returns false when `open` returns -1, nothing recorded; true otherwise, a running order keeps
   its members. Tested both ways (:157-167, :181).
3. `OrderLeg.start(b, slot, x, z, yaw)` (:382-390): `syaw` (NaN reads 0) is the arrival heading's fallback for the
   look base and for a reset with no switch and no yaw. Tested for look, NaN and reset (:253-270).
4. NaN stand point (:427-431): gives up on the post leg, after the via if any, instead of arriving at once. Tested
   with and without a via (:311-323).

## Regressions, purity, allocation
- Every pre-polish path is unchanged apart from the documented `add` cases above. Imports unchanged (mathx, hearing,
  posts, a type from world/rooms): no Babylon, no `src/game`. The new field is a number; the new branches allocate
  nothing; strict TS clean.
- Prior polish folded: A1, A2, A5; B1-B6. Not folded (cosmetic): A3, A4, B7, B8.

## Fix list
None.

## Polish
1. missionOrders.ts:240: "False: he is not on the order in state `st`" reads as if true means he is; a live member
   offered `M_DROPPED` returns true and stays live. Say "true: he is on the order (a live member keeps his state)".
2. missionOrders.ts:427: the guard tests x only; a filled x with a NaN z would still "arrive" at once. `px !== px ||
   pz !== pz`.
3. missionOrders.ts:247: a done member offered `M_DROPPED` turns dropped (phase may read 'dropped' over 'done').
   Pre-existing; harmless for S1a-2 (a done guard is not refused 'order'), but a repeat drop could skip done members
   too.
4. Unfolded from before: A3 (tag on a dog / melee slot not flagged), A4 (bell error without the effective reach), B7
   (`wrapPi` duplicates posts.ts), B8 (`x === x` NaN idiom).

## For the lead (S1a-2 handover)
The S1a-BRIEF still states the old API and must be updated (or overridden in the S1a-2 handover) before S1a-2 builds:
- :110 `add` "false: `maxMembers` full" -> also false for a guard already dropped on the slot.
- :114 `fail(name, cause): void` -> `boolean` (false: board full, dev warn as `open` -1).
- :122 and :186 `start(b, slot, x, z)` -> `start(b, slot, x, z, yaw)` with the guard's yaw (tsc would catch this one).
- :254-255 `offer`: takes then adds. With the new `add` the order must be `refusal ? add(M_DROPPED, why) :
  add(M_WALKING)`, then `takeOrder` only on true (false from take -> `set(M_DROPPED)`). Taking first would revive a
  guard dropped on the slot while the board says dropped.
- Every offered slot must have `pt` filled (a NaN stand point now gives up after the via).
