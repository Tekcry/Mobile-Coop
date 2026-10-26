# guard-rules F0: the wave 3-4 flags (slice brief)
Owner: Guard AI Build. Status: current.

Builder: the job lead (Night Shift | Guard AI Build) itself, no subagent. Source: `docs/archive/guard-rules/PLAN.md` "PR3"
(F0), "Flags", "Parallel groups" wave 3. Checked against `feature/guard-rules-s5` at a09495007 (PR1 + S5 = the PR2
base).

## Goal
Add the three dark flags the later slices gate on: `guardPairs` (S6), `lookouts` (S7), `dogRelease` (S8), all off by
default. F0 lands first in wave 3; S4 and S6 both branch from the F0 commit.

## Order and branches
1. Wave 2 (S5) is merged into the wave 3 base (the PR2 head: `feature/guard-rules` once S5 is merged into it, else
   `feature/guard-rules-s5`).
2. The lead commits F0 on that base (one commit, path-limited: `src/core/flags.ts` only) and pushes.
3. Cut `feature/guard-rules-s4` and `feature/guard-rules-s6` from the F0 commit, each in its own worktree
   (`C:/NightShift/Mobile-Coop-guard-rules-s4`, `-s6`). S4 does not read the flags; it branches from F0 only so both
   slices share one base and the PR3 merge is clean.

## Files owned
- `src/core/flags.ts` only. Nothing else (no tests: no test lists the flag keys; checked `tests/` for `keyof Flags` and
  `Object.keys(flags)`: none).

## Changes (anchors on a09495007)
1. `interface Flags` (2-60): append after `guardFreeze` (59), before the closing brace (60):
   ```ts
   /** (guard-rules S6, A10, A11) Pairs that walk together check on each other at once; posted pairs talk and check.
    *  `?guardpairs=1`. DEFAULT OFF until walk item 5 (owner Guard AI Build, switch-on target 2026-10-29). */
   guardPairs: boolean;
   /** (guard-rules S7, A9) Lookout posts: never sent, never leave, radio a sighting. `?lookouts=1`. DEFAULT OFF until
    *  walk item 6 (owner Guard AI Build, switch-on target 2026-10-29). */
   lookouts: boolean;
   /** (guard-rules S8, A12) Alarm stage dogs leave the heel for the last known position. `?dogrelease=1`. DEFAULT OFF
    *  until walk item 7 (owner Guard AI Build, switch-on target 2026-10-29). */
   dogRelease: boolean;
   ```
2. `export const flags` (104-136): append after `guardFreeze` (135):
   ```ts
   // (guard-rules F0) dark until their walk items are accepted (PLAN "Flags"): `=1` turns each on
   guardPairs: params.get('guardpairs') === '1',
   lookouts: params.get('lookouts') === '1',
   dogRelease: params.get('dogrelease') === '1',
   ```
   Parameter names are lower case, as `guardmerge`, `animtier`.

## Rules
- Branch guard before the write (agent preamble). `git add src/core/flags.ts` only, never `-A`.
- The flags are read at load time only by S6 (`EnemyManager.buildPair`), S7 and S8; never per frame in a hot loop.
- Tests flip a flag by assignment (`flags.guardPairs = true`, restored in `afterEach`), as `tests/guardBody.test.ts:64`.

## Checks
- `npm run typecheck:fast` only (nothing reads the new keys yet). No vitest file needed. No e2e (no behaviour change).

## Done looks like
- `src/core/flags.ts` has the three keys in the interface and the object, default false, each with its owner line.
- `feature/guard-rules-s4` and `feature/guard-rules-s6` exist on origin at the F0 commit.

## Est. lines
~15.

## Must NOT touch
Any other file. No default flip (all three stay off until Michael's walk; the PR body and ROADMAP carry owner and date,
which the lead writes at the PR).

## PLAN pointer drift
None (PLAN gives no line numbers for F0). `flags.ts` interface ends at 60, the object at 136 on a09495007.
