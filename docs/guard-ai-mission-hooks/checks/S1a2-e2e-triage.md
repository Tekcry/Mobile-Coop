# guard-ai-mission-hooks S1a-2 e2e triage (mission order, woken K)
Owner: Guard AI Build. Status: current.
VERDICT: TEST bug (scenario staging). Game code unchanged.

## Failure
Laptop e2e, GPU, run and rerun, deterministic on S1a-2 2b9947b9a and S1b 4947ef2c8:
`ASSERT: mission order: the knocked-out tagged guard, woken, is never offered a later order (woken false, order null,
state -1, cause '')` in `scripts/e2e-stealth-ai.mjs` (logs: `scratch/laptop-queue/runs/20261025T220729-...-3a20/`,
`20261025T231529-...-c138/`). Every earlier mission order assert passed.

## Cause
- The scenario's part (a) hides K's body so nobody finds him during the bell walk: `kb.hidden = true`
  (`scripts/e2e-stealth-ai.mjs:3451`).
- A hidden body is not `present` (`src/ai/body.ts:148`: `!hidden && !carried && !!rig`).
- `EnemyManager.revive` returns at once on `!b.present` (`src/ai/enemyManager.ts:1758`): a body in a container never
  wakes. So the scenario's `em.ctx.revive(kb2, null)` did nothing, no woken `Enemy` was built, `K2` was undefined and
  the order block was skipped: `kWoken` false, `kSt` -1, `kCause` ''.
- The woken gate itself is sound: `inherit` sets `woken` (`src/ai/enemy.ts:1124`), `orderRefusal` returns 'woken' right
  after 'down' (`src/ai/enemy.ts:1551`), `ringBell` offers a woken tagged guard heard or not
  (`src/ai/enemyManager.ts` `ringBell`). The vitest stubs the revive, so it never met the hidden-body refusal.

## Fix
`scripts/e2e-stealth-ai.mjs`: set `kb2.hidden = false` just before `em.ctx.revive(kb2, null)`. No sim step runs between,
so nobody can find the body. With K2 built (zone and `woken` from `inherit`, pushed last on `enemies`), the 'e2e-later'
bell order records him `M_DROPPED` (3) with cause 'woken' (he is the last guard the bell loop visits, so the slot's cause
is his).

## Residual risk
- The asserts after this one (bystander turns, walk pace, at post, look time, calm, back on route, phases) and all of
  part (b) (reset order) have never been checked on the laptop: this assert threw first. They may fail on their
  own; triage them separately if so.
- Not run here (no e2e on this machine); `node --check` passes.
