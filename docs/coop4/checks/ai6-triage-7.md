# AI6 e2e-coop triage 7 (head 49b2b05b, desktop worker, 1278 s)

The triage 6 crouch fix worked. The run leg then failed:
`AI6 (3): a heard step locates C's slot (locT < 1)` with `tTurn 0.52, turnBy "turn", turnSteps 573, loc null,
sawC true, hostValidSteps 0, cSpd.run 3.07, dMin.run 2.33`. The level log has one entry (unaware, crouch leg), so he
stayed unaware through the whole run.

## Verdict: test bug. The game is right: a calm guard does not locate anyone by ear

- `EnemyManager.hear` (`src/ai/enemyManager.ts:2711-2744`) sends a player's body noise to `hearFight` ->
  `reportHeard` (the only hearing locate, `:2777`) only for an alerted or searching guard (`:2724-2727`). A calm guard
  turns (tier 1, `Enemy.hearTurn`) or is reported to the incident board (tier 2: investigating, still no locate)
  (`:2728-2743`). The spec says the same: "once in a search or fight a heard step locates C" (AI6-E2E-SPEC (3)). The
  test asserted a locate from a calm guard.
- This run was tier 1 only, from the constants:
  - C peaked at 3.07 m/s, not 4.0, because the 3 m leg turns him round before he reaches full speed.
  - That gives a reach of 1.2 + (3.07 - 1.4) * 1.6 = 3.87 m (`noiseRadius`, `src/player/movement.ts:152`;
    `walkSpeed` 1.4).
  - Tier 2 is inside half the reach (`investigateDb` 6, `src/ai/hearing.ts:26`), so 1.94 m. His closest pass was
    2.33 m: tier 1, a turn (turnBy `turn` at 0.52 s). This matches what was measured.
- Moving the leg in (triage 5's 2.2 m plan) would not have fixed it. At the best case, 4.0 m/s (5.36 m reach), tier 2
  only makes him investigate, which is still not a locate. No range a calm guard's hearing tiers allow gives a located
  slot.
- `sawC true` with no level change is also right: `seesIndex` is line of sight at the last think (any body sample,
  `src/ai/enemy.ts:813-818`), not detection. The leg is dark (`lit({})`), so the sight meter rises slowly and C was
  moving.
- A client's body noise does reach the right path: `coopHost.ts:1818-1819` calls `em.hear(r.feet, n, 'noise', null,
  r.ref.id)`, and `slotForId` claims his slot (`enemyManager.ts:2840`). A searching guard's tier 1+ body noise is a
  locate (`combatHearAct`, `hearing.ts:122-127`).

## Fix (`scripts/e2e-coop.mjs` only)

The run leg is split as the spec stages it:
1. Calm run (unchanged): within 2 s the guard turns or investigates (`tTurn`). This passed (0.52 s).
2. New search leg:
   - C's slot is wiped (forget, `seenT` / `locT` 99) and the guard searches round his own feet: `Enemy.searchAt`, the
     plain search a body or a cut light starts. He is `searching` at his next step (`src/ai/alertState.ts:155`).
   - The test waits for `searching` (5 s cap), then C runs the same leg for 8 s of host sim.
   - The locate asserts (locT < 1, within 2.5 m of the path, owner C, seenT 99 unless he saw C) and the host-slot
     assert read this leg.
   - New diagnostics: `searchSteps`, `minHeardAt` (his re-aim clock; 99 means no heard step reached `hearFight`),
     `cSpd` / `dMin` for the search leg, `stealth`, the level log.

Geometry is unchanged. The leg stays 2.6 m behind him: the crouch at 1.64-1.68 m/s is silent (`NOISE_QUIET.crouch` 1.9).
The run already reached tier 1, which is all a search needs.

## Remaining risk

- A searcher walks his ring after the first look. If he walks out of the 3.87 m reach before C's first fast step, the
  locate misses. `minHeardAt 99` together with a large `dMin.search` would show that. The fix would then be to search
  at the leg's middle (`searchAt(mx, mz)`).
- If he sees C first, the slot is placed by sight. That still passes (`sawC`, seenT not asserted).

## Checks

`node --check scripts/e2e-coop.mjs` OK. eslint ignores the file. No src change, so no tsc / vitest needed. No e2e run here.
Rerun: `e2e-coop` on the new head, `E2E_GPU=1`.
