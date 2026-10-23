# Posts move check (e20103d6 vs 2b349d4b)

Verdict: PASS

- Data: all 5 former entries are on the right slots with identical numbers (S1 #5 5/c1-door; S2 #11 5/c2-door; S4 #19 5/c4-gate; S5 #9 and #10 3/highSecurity/token). S3 none. Guards sit at the same lines as the old comments' numbers; tests assert by index.
- Behaviour: diff touches only post fields, the deleted tables and their imports, and tests. Nothing else changed.
- validatePosts: tests/campusPosts.test.ts loops all of CAMPUS_SECTORS (S1-S5) and expects []; also asserts posted set and high-security set. The game also runs it in dev (sectorMode.ts:559).
- Leftovers: grep CAMPUS_POSTS|S4_POSTS|S5_POSTS over src, tests, scripts: none.
- tsc --noEmit: clean. vitest campusPosts + campusS1-S5: 6 files, 195 tests pass.

Polish: none.
