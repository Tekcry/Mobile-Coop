# AI6 e2e-coop triage 5 (desktop worker run on e6d673e3)

Run: `laptop-queue-desktop/runs/20261024T172026-night-shift-guard-ai-e6d673e3-e6c8` (not on this machine; worked from
the assert JSON). The spawn, the 4 s crouch-walk and meter 0.00 pass, then:
`AI6 (3): the guard stays calm over the crouch-walk (31 steps not calm)`, `levels [["crouch",37.17,"unaware",0],
["crouch",41.62,"cooldown",0]]`, maxMeter 0, sawC false, dMin 2.60 m, cSpd 1.68 m/s (silent band, as triage 4 planned).

## Verdict: test bug (the staging leaves the statues' section radio running, and "calm" was read too narrowly)

- The only way from `unaware` to `cooldown` with meter 0 and no search is `AlertInput.cautious`
  (`src/ai/alertState.ts:162`). Sight raises the meter, hearing sets `heard` / the meter, a board send makes him
  investigating; none happened (meter 0, one level change). So his caution (`Enemy.caution`, synced from
  `Awareness` at 5 Hz, `src/ai/enemyManager.ts:1655-1663`) went above 0.
- His key was a clean slate at his spawn (`freeKey` + `awareness.resetKey`, `enemyManager.ts:1872-1873`,
  `src/ai/awareness.ts:148`), and the radio net queues only the guards alive when a call completes (`src/ai/radioNet.ts`
  header, tick step 2). So a call COMPLETED after his spawn and reached him: a `missing` or `shots` call ->
  `radioDeliver` -> `alertHold` -> `timedHold` (180 / 120 s, caution 1; `enemyManager.ts:2414-2477`), or a `body` call
  (held caution 2).
- Who called: only the statues are left besides him. Their `update` is stubbed, but the manager-level section logic still
  runs for them: squad radio checks every 40 +- 8 s (`radioCheckNow`, `enemyManager.ts:2148`, timer `:3426-3433`) and
  the talking pairs (`pairStep` -> `pairMissing`, `:2060-2113`: a partner who never walks to the meet point, which a
  statue never does, is "not answering": a `missing` incident and call). In (2) no grunt was alive long enough after a
  call to show it; in (3) the grunt had been up 4.5 s, longer than a 2.5 s `callIn` plus the stagger. The run gave no
  counters to tell the radio check from the pair (both end in `missingCall`). The new diagnostics name it.
- By design a cautious guard is calm: `AlertMachine.calmNow` is `unaware || cooldown` (`alertState.ts:127`), and
  docs/systems/ai.md ("Caution per guard") says caution "keeps a calm guard in `cooldown` ... and never unaware while it
  lasts". The spec's "`e.level` stays calm" is that. Not a game bug.

## Fix (applied, `scripts/e2e-coop.mjs` only)

1. (3) staging: the statues' section radio goes quiet. It drops open calls and queued receivers
   (`em.radioNet.clear()`), stops the squad radio checks (`radioT` 1e9) and takes out the talking pairs
   (`em.pairs.splice(0)`). All three are restored after (3).
2. "Calm" is now `unaware || cooldown` for the crouch leg (`nonCalm`). Steps in cooldown are counted apart
   (`cautionSteps`), so a stray caution still shows in the text.
3. Run leg, pre-empted: "within 2 s the guard turns / investigates" was `level !== 'unaware'`, so a cooldown from the
   start would have passed it at once, and a real tier-1 turn would never have passed it. `Enemy.hearTurn`
   (`src/ai/enemy.ts:1074-1087`) sets `turnT` but keeps the level: the meter cap `noiseSuspicion` is 0.23-0.27 at
   2.6-3.0 m, under `suspicious` 0.3. Only tier 2 (a board send) changes the level. The check is now
   `!calm || turnT > 0`, with `turnBy` ('turn' or the level) and `turnSteps` in the text.
4. Hold leg, pre-empted: C is teleported to the leg's end and the item is there. Before, the item was 1.6 m past the
   leg's end and C stood wherever the run stopped him, 1.6-4.5 m from it. The guard, alerted by hand, needs no light, so
   if he sees C (then `hearFight` does nothing, `combatHearAct` sees -> 0) the sighting puts C's slot at C's feet and
   `dItem < 2.5` failed. The teleport also outlasts `COMBAT_HEAR.gap` (1.5 s since he last re-aimed). `d5` now carries
   `seenT`, the guard's level, `seesTarget` and `heardAt`.
5. Diagnostics: every level change in `levels` now carries `{caution, alert (1 missing / 2 shots), alertLeft, inc
   (board incident), turnT, checks, misses, pairMisses, calls (open), bodiesFound, cam}`.

## Remaining risk (run leg)

- "A heard step locates C's slot": a calm guard never locates by hearing; only a searching or alerted one does
  (`hearFight` -> `reportHeard`, `enemyManager.ts:2754-2791`). C's 4.0 m/s run (5.36 m reach) is tier 2 only within
  ~0.6 m of the leg's middle (2.6 m, needs d < 2.68). From there the board sends him (investigating) and he walks
  onto C. It passes if he then sees C (`sawC`, seenT not asserted) or goes on to search. If `loc` is null with
  `turnBy: 'turn'` and `levels` never past investigating, move the leg to 2.2 m behind him (tier 2 along all of it at
  the run; the crouch stays silent at 1.64 m/s). That is a test change.
- Not cleared: stale board incidents from the statues (a `missing` incident could still send the grunt as a cover). The
  `inc` field in `levels` will show it.

## Checks

`node --check scripts/e2e-coop.mjs` OK. No src change (no tsc / vitest). No e2e run here.
Rerun: `e2e-coop` on this commit, `E2E_GPU=1`.
