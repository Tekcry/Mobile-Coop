# guard-rules PR4 re-check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Re-checker A (Opus 5.5, fresh), branch `feature/guard-rules-pr4`, head d9c4d0e8c, base PR3 48394def2. Scope: the S7
polish commit fa848bcbb, the two slice merges and the fragment / TESTING commit (each slice passed its own checks).

## Checks run
- `npm run typecheck:fast`: clean. vitest on lookout, posts, postsWiring, dogRelease, sectorStageActions, campusPosts,
  campusS5, changesFragments, barkCause: 125 pass. `node --check` on both e2e scripts: ok. No e2e.

## Polish commit
- (c) stays bounded and inside the 20 s cooldown: starts at >= 10 s, calm wait ends by ~16.1 s, glimpse cap
  min(6, 19.5 - at2) >= 3.4 s, ends by ~19.55 s; ~0.45 s of cooldown left at the latest rise.
- No false pass: `rose` plus `cause === 1` means `lookoutStep` saw a sight rise; only `lookCd > 0` can suppress the
  call; URGENT barks always reach `onBark`; a rise straight to alert is a failure.
- The moved glimpse spot (px + 8, pz + 4) is on the lane `postSite` checks; the sight line passes ~3.6 m from F2's spot.
- (b) retry via `em.despawnAll()` resets lookout state, board, radio, command, awareness, `lkpValid`, `sightT`;
  `placeSlot` counts the lookout again.
- Unit test fails if `spotCall` leaves `URGENT`. S7-f matches the code. ai.md wording matches the board's noise rule.

## Merges
- Both recomputed with `git merge-tree`: identical trees; clean automatic merges. Slice file sets disjoint (S8 does not
  touch ai.md); every slice file byte-identical to its slice tip; nothing outside the three slices.

## Fragment and TESTING
- Fragment format per changes/README.md; flags `lookouts` / `dogrelease` named right; content accurate (S5 #19 leash 1,
  20 s, best-placed calm guard, S4 stage 2 / S5 stage 1, rush, search, heel).

## Fix list
None.

## Polish
1. ai.md:179 206 characters: rewrap. (Applied.)
2. e2e-sectorops.mjs:2749 comment "over the 15 s after the call (and the second glimpse)" is stale; the perch is not
   tracked during glimpse 2.
3. TESTING "Huh?" is one of four lines: "a startled line (e.g. 'Huh?')". (Applied.)
4. TESTING "(nobody saw you)" for a camera alarm: "(no guard has seen you)". (Applied.)
5. "each calm dog": `releaseHeel` takes any dog not alerted, down, held or passive: "each free dog". (Applied, TESTING
   and fragment.)
6. Triage note: `postSite` does not check the diagonal sight line to (px + 8, pz + 4); a (c) failure with `rose` false
   shows in `r.c.gl2`.
