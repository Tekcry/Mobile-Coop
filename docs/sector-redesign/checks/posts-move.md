# CAMPUS_POSTS moved onto SquadSlot.post

Every `CAMPUS_POSTS` entry (including `S4_POSTS`, `S5_POSTS`) is now `post:` on its guard slot; the side tables and their readers are deleted.

| Guard | Old key | `post` |
| --- | --- | --- |
| S1 #5 doorman | s1#5 | `{ leash: 5, guards: 'c1-door' }` |
| S2 #11 bridge officer | s2#11 | `{ leash: 5, guards: 'c2-door' }` |
| S4 #19 colonnade sentry | s4#19 | `{ leash: 5, guards: 'c4-gate' }` |
| S5 #9, #10 keyholders | s5#9, s5#10 | `{ leash: 3, highSecurity: true, guards: 'token' }` |

S3 has no posts. Field map: `leash`, `highSecurity`, `guards` map 1:1 onto `PostDef`. Unmapped fields: none.

Tests: `tests/campusPosts.test.ts` (new: `validatePosts` clean for S1-S5; posted set = SPEC posted guards; high security only at the token room) and the S1-S5 tests read `guard.post`.

Checks: tsc clean, lint 0 errors, vitest (campus, sector, posts, guardAi) 25 files / 425 tests pass.
