# guard-ai-mission-hooks S2 check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh: intent and behaviour), branch `feature/guard-ai-mission-hooks-s2`, head 7282bfa70, diff
`f14cb3899..7282bfa70` (4 files, +168 / -20), against `slices/S2-BRIEF.md` (S2-a..e, Lead decision 1), PLAN Design 3,
BRIEF A11 / D8.

## Checks run
- `npm run typecheck:fast`: clean. eslint on the 4 files: clean. vitest on hearing, guardAiData, combatHearing,
  postsWiring, barkCause, campusGear, alarmCall, campusPosts, lookout, sectorGuardTags: 180 pass. No e2e.

## Findings
- Today's numbers: both `ambientDb` callers (enemyManager.ts:2670 voice, :2932 `tierOf`) pass four arguments; with no
  mask the loop is byte-for-byte today's; a test checks the all-live mask equals the four-argument results exactly.
- Mask: `live[i] === 0` skips; any other value, or past a short mask, is live (S2-c); allocation-free.
- `sourceLive` matches A11 / S2-a (no group always live; 'on' live while not off; 'off' live only while off); six cases.
- `validateNoisy`: unique id, db / radius against `NOISY_LIMITS` (unchanged 0-30 / 1-20, Lead decision 1), finite
  x / z / y, integer group >= 0, `on` 'on' / 'off', `on` only with a group; messages word for word; console group ok.
- `validateGuardAi`: old messages kept (now from `validateNoisy`); one error for a non-finite position or bad group.
- Nothing in src reads `group`, `on` or `sourceLive` at runtime yet; no flag, wire or save change; scope = 4 files.

## Fix list
None.

## Polish
- guardAiData.ts:281 `validateGuardAi` doc line ~165 chars: rewrap.
- `validateGuardAi` now lists `validateNoisy` errors first, then bounds / section (dev-only order change).
- Pre-existing unescaped `.` in the radius regexes.
