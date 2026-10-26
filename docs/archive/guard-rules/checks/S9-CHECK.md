# guard-rules S9 check
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker (Sonnet 5.5, fresh: data slice), branch `feature/guard-rules-s9`, head 2900160cb, diff `d8caa5c2d..2900160cb`,
against `docs/archive/guard-rules/slices/S9-BRIEF.md`.

## Checks run
- Two files changed: `src/world/maps/campusS5Data.ts`, `tests/campusPosts.test.ts`.
- The marksman line gains only `post: { leash: 1, lookout: true },` after `takedownSpot`; role, zone, squad, reason,
  route, waits and faces unchanged; no `highSecurity`, no `gear`; the comment is the brief's text.
- Route: far point (-39, 43) is 1.0 m from the slot, inside leash + `POST.arrive` (1.3 m); leash 1 <= `POST.lookoutLeash`.
- Flag off: `slotPost` (enemyManager.ts ~2207) returns null for a lookout post; he is today's guard.
- Tests: `POSTED.s5` = `[9, 10, 19]`; the posted-role check skips lookouts; new case "the S5 roof marksman is the only
  lookout (A9)" (exactly `['s5#19']`, his post, `validatePosts` empty).
- `npm run typecheck:fast`: clean. vitest on campusPosts, campusS5, postsWiring, lookout, sectors, posts: 105 pass.

## Fix list
None.

## Polish
- The `POSTED` header comment's second line is ~150 characters; wrap it.
- For Sector Ops (SPEC S5 guard table row 19): "S5 #19 Roof marksman: a lookout post (leash 1 m, guard-rules S9, A9), read
  with `?lookouts=1`".
