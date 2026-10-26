status: claimed Night Shift | Cloud Builder 3 2026-10-26T02:31:38Z
# J14 Marlow re-plan, small data fix (Sonnet): re-plan circuit rows 21 and 23 for A2

Lead: Night Shift | Marlow Build. Brief: Opus. Builder: Sonnet 5.5 (cloud). Est. 60 counted lines. Same kind of fix as
G-A5 fix 2 (`git show origin/cloud-queue:briefs/j14-g-a5-fix1.md`, its report: a re-plan override row for group 50 in
`MARLOW_CIRCUITS_REPLAN`, the built row left as the built yard has it).

## Base and branch
- Base: `feature/marlow-replan-base` @ `b231f75933e2826fb6a7f7c0ecf09c6e9513ed02`.
- New branch: `feature/marlow-replan-a2-rows`. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-a2-rows`. `git add <files>` only. No stash,
  reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions").
- `src/world/lighting/marlowCircuits.ts`: `sw()` `:142` (`sw(id, kind, x, z, by, y = 0)`), the built A2 rows `:158-161`,
  `MARLOW_CIRCUITS_REPLAN` `:196-231` (the group 20, 22 and 50 overrides are the pattern).
- `src/world/maps/ctcourseSets/replan/a2CarriageShed.ts`: `A2_CAB2_REPLAN` `:77-79` (cabinet 2 now at (63.5, 11.6), on
  the road 2 east van's north face by the pit), the device move `:205-212`, the staging switch move `:265-267`
  (`a2-sw-staging` to (40.0, 19.7) on the floor: "on the north wall in the strip west of the closures"; the deck is
  gone on the re-plan, its four strips stay: `a2CarriageShed.ts:287-293`).
- `tests/ctcourse/replan/variant.test.ts:174-181` and `tests/ctcourse/replan/a2CarriageShed.test.ts` (`:385-392`,
  `:720-760`: the device and lamp pins).

## The stale rows (re-plan only)
- Row 21 (`a2-neck`, isolator): `sw('a2-iso-2', 'isolator', 69.4, 14.2, 'cabinet 2, by the east door')`. On the re-plan
  cabinet 2 is at (63.5, 11.6).
- Row 23 (`a2-staging`): `sw('a2-sw-staging', 'wall', 66.5, 18.5, 'at the east stair head', 4.4)` and fitting "Strips
  under the staging roof". On the re-plan the switch is at (40.0, 19.7) on the floor and there is no staging or stair.

## Only these files
- `src/world/lighting/marlowCircuits.ts`: two new branches inside `MARLOW_CIRCUITS_REPLAN`'s `flatMap` (no other
  line; the built `MARLOW_CIRCUITS` rows stay as the built yard has them):
  - group 21: `{ ...c, switches: [c.switches[0]!, sw('a2-iso-2', 'isolator', 63.5, 11.6, 'cabinet 2, by the pit on the
    road 2 east van')] }` (cabinet 1 unchanged; keep `timed`, `lure`, `lamps`).
  - group 23: `{ ...c, fitting: 'Strips high on the north wall, where the staging stood', switches: [sw('a2-sw-staging',
    'wall', 40.0, 19.7, 'on the north wall, west of the neck closures')] }` (key, name, kind, role, lamps 4 unchanged).
  - A one-line comment above each, as the group 50 one has: "(J14 a2-rows) ...".
- `tests/ctcourse/replan/variant.test.ts:180`: the override list `[20, 22, 49, 50, 69]` becomes
  `[20, 21, 22, 23, 49, 50, 69]`. No other line.
- `tests/ctcourse/replan/a2CarriageShed.test.ts`: one new `it` (in the lamps / circuits `describe`): the re-plan rows'
  `a2-iso-2` and `a2-sw-staging` spots equal the part's device / switch spots (x, z within 1e-6), the built rows keep
  (69.4, 14.2) and (66.5, 18.5, y 4.4), and no re-plan row's `by` text says "east door" or "stair head".
- Nothing else (no `replan/a2CarriageShed.ts` change, no changelog fragment: the fix rides the base). Need more:
  `status: blocked <what and why>`.

## Checks (unit only)
```
npx tsc --noEmit -p tsconfig.json
npx vitest run tests/ctcourse/replan/variant.test.ts tests/ctcourse/replan/a2CarriageShed.test.ts tests/marlowLightingCircuits.test.ts tests/ctcourse/a2CarriageShed.test.ts
```
No e2e, no GPU, no light bake, no `npm run check`. Pending PC run: none (table text and switch spots only; the lamps and
the map do not change).

## Done
The re-plan table names cabinet 2 and the staging switch where the re-plan builds them; the built table unchanged;
the four test files green. Push, append the report, set `status: done feature/marlow-replan-a2-rows <sha>`.

## Report (append below)
Commit, file:line of each change, tests with counts, deviations (any other stale A2 row you noticed: list it, do not
fix it). Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
