# guard-rules S9: campus lookout data (slice brief)
Owner: Guard AI Build. Status: current.

Re-anchor on the wave 3 merge head before building: S4 changed enemy.ts, S6 changed enemyManager.ts and e2e-sectorops.mjs.

Builder: Sonnet (Sector Ops data). Ships inert: the data is read only with `flags.lookouts` on (S7), so it ships with
the flag off and needs no flag of its own. Rows: A3 (map part). Assumptions: A9 (the S5 roof marksman becomes the first
lookout), M3 (`docs/archive/guard-rules/BRIEF.md`). Source: `docs/archive/guard-rules/PLAN.md` "PR4" S9, "Coordination" (J17 order).
Anchors are quoted by content and checked on 452e23035 and origin/master 2e16b825a (the marksman line is the same on
both, and on `feature/sector-batch*` as of 2026-10-25).

## Goal
The S5 roof marksman holds a lookout post: `post: { leash: 1, lookout: true }`. His 1 m route and his facings stay as
they are and inside the leash. With the flag off he is exactly today's guard (S7 reads a lookout post as no post).

## Location and order
- After S7: `PostDef.lookout` exists only on S7's branch, so this slice does not typecheck before it. Worktree
  `C:/NightShift/Mobile-Coop-guard-rules-s9`, branch `feature/guard-rules-s9`, cut from S7's final pushed head
  (`feature/guard-rules-s7`), or from `feature/guard-rules` once S7 is merged into it (the lead says which).
- Start from `docs/systems/agent-preamble.md` (origin/master); branch guard before every write; commit and push,
  `git add <your files>` only.
- J17 (Sector Ops' campus guards) lands before PR4 if it can (PLAN "Coordination"). If the marksman line has moved
  or changed on your base, tag the moved line (find it by `role: 'marksman', zone: 'roof'`); if J17 removed him, stop
  and report to the lead.

## Files owned (wave 4, after S7; disjoint from S8)
- `src/world/maps/campusS5Data.ts`, `tests/campusPosts.test.ts`. Nothing else.

## Steps
### 1. `src/world/maps/campusS5Data.ts`
The roof marksman (`S5_GUARDS`, comment `// 19 the roof marksman`, ~63-64):
```ts
{ kind: 'grunt', x: -40, y: YR, z: 43.0, yaw: 0, route: [[-40, 43.0], [-39, 43.0]], waits: [12, 12], faces: [-0.6, 0.6], takedownSpot: [-40.4, 42.6], role: 'marksman', zone: 'roof', squad: 4, reason: 'Overwatch of the lake approach' },
```
Add `post: { leash: 1, lookout: true },` after `takedownSpot: [-40.4, 42.6],` (the keyholders put `post` there too,
~47-48). Change nothing else on the line: his `role` stays `'marksman'`, no `highSecurity` (S7's manager makes the
high-security copy at run time, flag on), no `gear`. Update the comment to
`// 19 the roof marksman: a lookout (guard-rules S9, A9; read only with ?lookouts=1)`.
Check by hand: his route's far point (-39, 43.0) is 1.0 m from his slot (-40, 43.0), inside the leash + `POST.arrive`
(1.3 m), so `validatePosts` passes.

### 2. `tests/campusPosts.test.ts`
- `POSTED` (~7): `s5: [9, 10]` -> `s5: [9, 10, 19]`; extend the header comment (~5-6) with "the S5 roof marksman (#19,
  a lookout, guard-rules S9)".
- "the posted guards are the ones the SPEC tables mark as posted" (~18-24): today every posted guard must have
  `role === 'posted'`; the marksman keeps `role: 'marksman'`. Change the inner check to
  `if (!section.guards[n - 1]!.post!.lookout) expect(section.guards[n - 1]!.role, ...).toBe('posted');`.
- "only the keyholders at the token room are high security" (~26-31): unchanged (`HIGH_SECURITY` stays `s5: [9, 10]`:
  the data carries no `highSecurity` for him).
- New case `the S5 roof marksman is the only lookout (A9)`: across `CAMPUS_SECTORS` the guards with `post?.lookout`
  are exactly S5 #19; his post equals `{ leash: 1, lookout: true }`; `validatePosts(s5.guards, 's5')` is `[]` (S7's
  lookout rules: leash <= `POST.lookoutLeash`, not free, route inside the leash).
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/campusPosts.test.ts tests/campusS5.test.ts tests/postsWiring.test.ts tests/lookout.test.ts tests/sectors.test.ts`
  (`campusS5.test.ts` asserts the S5 guard table, ~247-248 the keyholders' posts; `postsWiring.test.ts` "every live
  map's Sector Ops guard-ai data validates" ~273 runs `validateGuardAi` over every section). Never `npm run check`.

## Docs
- None in `docs/systems/ai.md` (S7 writes the line naming the S5 roof marksman as the first lookout).
- Sector Ops' SPEC (`docs/sector-redesign/SPEC.md`, the S5 guard table row 19 "Roof marksman", ~471) is Sector Ops'
  file: do not edit it. Put this line in your report for the lead to hand to Sector Ops: "S5 #19 Roof marksman: a
  lookout post (leash 1 m, guard-rules S9, A9), read with `?lookouts=1`".

## Rules
- Data only; no `src/ai`, `src/game` or other map edit; no layout, look or spot change (no sign-off needed, BRIEF
  "Sign-off needed": No).
- warehouseOps is frozen (Q26): untouched.
- Must NOT touch: any file outside the two owned; `docs/sector-redesign/**`; `src/core/flags.ts`.

## Checks and e2e
- tsc and the vitest command above, green.
- e2e: Sector Ops data maps to e2e-levels and e2e-anchors (plus smoke); PR4 runs them and e2e-sectorops anyway (PLAN
  "Tests and e2e per PR"). The builder runs none; the lead queues PR4's set.

## Done looks like
- `campusS5Data.ts` marksman line carries `post: { leash: 1, lookout: true }`, nothing else changed.
- `tests/campusPosts.test.ts` knows him as a posted lookout; the vitest files above green; tsc clean.
- With `?lookouts=1` he holds the roof, turns to noises and radios a sighting (walk item 6, after S7).

## Est. lines
~15 (data 2, test ~13).

## Assumptions (logged here; closest to PLAN / BRIEF)
- S9-a: his `role` stays `'marksman'` (the SPEC table names him so); the posted-role test exempts lookouts.
- S9-b: no `highSecurity` in the data: the flag decides (S7's `slotPost`), so the flag-off game is today's.

## PLAN pointer drift (PLAN says -> now, 452e23035)
- `campusS5Data.ts:64`: unchanged (also on origin/master 2e16b825a). J17 has not landed on master yet.
- `tests/campusPosts.test.ts`: PLAN says only "he validates as a lookout"; two existing checks need the edit above
  (`POSTED.s5` and the `role === 'posted'` rule) or the file fails.
- PLAN marks S9 "after S7" without saying why: S9 does not typecheck before S7 (`PostDef.lookout`).

## Open questions (for the lead)
- None, unless J17 moves or removes the marksman before PR4 (then re-tag or stop, as above).
