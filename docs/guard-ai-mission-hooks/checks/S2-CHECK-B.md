# guard-ai-mission-hooks S2 check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker B (Opus 5.5, fresh: code, hard rules, tests), branch `feature/guard-ai-mission-hooks-s2`, head 7282bfa70, diff
`f14cb3899..7282bfa70` (2 commits, 4 owned files).

## Checks run
- `npm run typecheck:fast`: clean. eslint on the 4 files: clean. vitest on 10 files (hearing, guardAiData and every
  test importing them): 180 pass. No e2e.

## Code and hard rules
- Hot path: `ambientDb` adds one index read and compare; `sourceLive` two field reads; no closure, iterator or
  temporary; `hyp2` / `hyp3` kept, no `Math.hypot`.
- No mask = today (callers enemyManager.ts:2670, :2932 untouched). Short mask reads live (S2-c).
- `validateNoisy` matches the brief (messages, y finiteness, `Number.isInteger` group, console groups S2-e).
  `validateGuardAi` keeps one error for a NaN position; error order changed, nothing depends on it.
- `NOISY_LIMITS` untouched (Lead decision 1). Both files pure; `NoisySource` type-only import; no wire, save, map or
  `PROTOCOL_VERSION` change.

## Tests
- Each fails if the feature breaks (drop the skip, falsy check, broken inversion, dropped checks, `validateGuardAi`
  not calling `validateNoisy`); "no mask = today" checks literal numbers and the four-argument calls; the end-to-end
  case drives `sourceLive` into `hearTier` both ways.

## Fix list
None.

## Polish
1. guardAiData.ts `validateGuardAi` doc second line ~167 chars: rewrap.
2. New `validateNoisy` lines 128-149 chars: could break before `errs.push`.
3. RegExp patterns leave `.` unescaped (cosmetic; exact text pinned by `toEqual`).
4. For S4: pass a `Uint8Array` sized to the source list (reading past a typed array's end is V8's slow path).
