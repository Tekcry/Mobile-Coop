# guard-rules S6 check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh: AI behaviour, intent, the flag-off guarantee), branch `feature/guard-rules-s6`, head
69664ef8e, diff `452e23035..69664ef8e` (5 files, +627 / -26), against `docs/guard-rules/slices/S6-BRIEF.md`, PLAN
"PR3" S6 and "Flags", BRIEF A10 / A11 and G335 ("paired patrols that check on each other").

## Checks run
- `npx vitest run tests/pairs.test.ts tests/pairsWiring.test.ts tests/squadWiring.test.ts`: 3 files, 70 pass.
- `npx vitest run tests/responseWiring.test.ts tests/gearWiring.test.ts` (fakes through `placeSlot`, flag off): 42 pass.
- `npm run typecheck:fast`: clean.
- Scope: only `src/ai/pairs.ts`, `src/ai/enemyManager.ts`, `tests/pairs.test.ts`, `tests/pairsWiring.test.ts`,
  `scripts/e2e-sectorops.mjs` changed. No `enemy.ts`, `flags.ts`, `src/net`, map data or ai.md edit.
- e2e not run (the lead runs e2e-sectorops `--part=1`).

## Flag off: identical to today
- `flags.guardPairs` is read in `buildPair` only (enemyManager.ts:2225, 2257), which runs from `placeSlot` (load,
  respawn), never per frame. `pairs.ts` does not import the flag.
- Skip branch: with the flag off `pw` stays `''`, so the message is byte-for-byte today's text (enemyManager.ts:2236);
  `postedWhyNot`, `postDef` and `postPoint` are not touched (the other test files' fakes do not need them).
- Timed-loop path: `watch: false`, so `this.def.watch && ...` (pairs.ts:327) short-circuits and `step` runs today's
  code. The new fields are only written by `watch` / `reset`; `reset` zeroing them changes nothing when watch is off.
- The existing talking pairs e2e (a) / (b) stays on `PARAMS` (no `guardpairs`); the lane finder moved into
  `pairLanes` with the same body.

## Flag on: behaviour
- Walking together: `together` is re-measured every step both are up (`hyp2` <= 4 m), so pairs on separate loops only
  count as together while actually within 4 m (A10's "separate loops keep the window check" holds). One gone, the
  other calm: request after 15 steps (`goneT` reaches 3.0000000000000004 at step 15), same outputs as `waiting`.
- Calm-only timer (S6-c): busy resets `goneT`, keeps `together`; it fires 3 s after he calms. Matches the brief.
- One request per absence: whichever of the watch and the window `grace` fires first sets `missing`; the other is then
  skipped (watch is gated on `state !== 'missing'`, the switch returns on `missing`).
- Edge cases: dogs refused by both `pairWhyNot` and `postedWhyNot`; both down clears `together` (no request); partner
  revived or released before 3 s zeroes `goneT`, after it `pairStep` calls `reset` (clears both fields); section alarm
  makes both not calm (no count); a guard sent on a board task walks off and `together` goes false at the next step;
  despawn reads as absent (A10 names "despawned"); a new section list clears `pairs`; respawn rebuilds the pair. Host
  only, no player reads, so co-op 4 is unaffected.
- Posted pairs: `postedDef` is fixed (period 40, window 0-12 s, `t0` 0), no randomness (G143); meet points are the
  posts, so the calm branch's `pairFace` / `pairPt` hold works for a guard with no route (enemy.ts:2715-2727).
- Hot path: `watch` uses fields and `hyp2` only, no closures, arrays or strings; `pairStep` and the manager tick are
  unchanged. No `Math.hypot` in `src`.

## Builder deviations
1. e2e (d) posts 3.4 m apart: accepted. Within `BODY.close` 2.5 m a body is always noticed (bodies.ts:34), a stronger
   reaction than the watch, so 1.2 m would test the body path, not this one; 3.4 m is still within `togetherR`.
2. Timing bounds 2.75-4.0 s: accepted. The first pair step after the knock-out counts a whole 0.2 s, so the request
   lands 2.8-3.0 s after it (as the window's `grace` does today); read at 0.1 s.
3. (c) and (d) on separate pages: accepted (a missing call makes the section cautious; cautious guards do not talk).
5. Wiring case 6 takes B at 27 s: accepted (the brief gives no time; 27 s is between meetings, window closed, state
   `idle`, gap < 4 m all asserted).

## Blocking
None.

## Polish
1. Cautious pairs do not check (S6-c + `pairCalm` needs `caution === 0`; `CAUTION.koCautious` is 180 s). After the
   first missing call a section's pairs stop checking for minutes. Today's window path skips cautious pairs too, so it is
   consistent, but G335 reads stronger. Ask at walk item 5; option: reset `goneT` only on suspicious or worse, a board
   task or held, and let cautious guards count (pairs.ts:407).
2. Dog skip with the flag on reads "a dog does not talk (posted pair: a dog does not talk)" (enemyManager.ts:2236,
   2276). Skip the suffix when `pw === why`.
3. Every posted pair opens at build (pairs.ts:228), so all posted pairs built at load (Tallow's four) talk in lockstep
   every 40 s. A fixed per-id offset (`t0` from `id`) keeps G143 and spreads them. Brief-specified; design note.
4. Test gaps: no case for A down (`lookFor === 1`), both down with watch on, B down mid-meeting with watch on (fires at
   3 s, before `grace`). e2e (c) knocks B out before either leaves his first stop, so the mid-leg case (look point = B's
   next stop, S6-d, possibly a leg ahead of the body) is only in the wiring test, which does not check A finds him.
   Worth watching on walk item 5.
