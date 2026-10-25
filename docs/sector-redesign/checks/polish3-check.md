# Sector Ops polish 3 - check (Opus, 2026-10-25)

Branch `feature/sector-redesign-polish3` @ 62aa2320 on fc4dc9ab. Brief: `origin/cloud-queue:briefs/sector-redesign-polish3.md`.
Sources: `fog-wiring-check.md` P1-P3 (fog2), `section-bake-robust-check.md` polish 5 (bake2).

Verdict: PASS

## Scope
- `git diff fc4dc9ab HEAD --stat`: exactly the 5 brief files (changes fragment, `src/vfx/volLights.ts`,
  `src/world/lightBake.ts`, new `tests/lightBakeAbort.test.ts`, `tests/volLightsWiring.test.ts`). No off-limits file.
- Fragment `changes/feature-sector-redesign-polish3.md`: line 1 `# Sector Ops polish 3`, line 2 `kind: patch`, bullets.
- Master has moved to 46a7cf85 (bake3 `sectionJobs.ts` changes landed); `git merge-tree origin/master HEAD` is clean and
  nothing in bake3 touches the `held` / `lampJob` path.

## Items
1. P1 (`tests/volLightsWiring.test.ts:82-94`): reads via `new URL('../src/...', import.meta.url)` inside
   `process.chdir(tmpdir())`, cwd restored in `finally`. Correct.
2. P2 (`:95-102`): both `expect`s carry the brief's message; the two regexes are byte-identical to master's. Correct.
3. P3 (`src/vfx/volLights.ts:81-86`): `k` dropped, writes slot `i`, returns `n`; doc contract unchanged. Only caller
   `src/vfx/postStack.ts:467` stores it in `volCount`; `n = Math.min(volMax, nearest(...))` is never negative, so the
   value is identical to the old `k`. Plain counted loop, no allocation (hot path OK).
4. Polish 5 (`src/world/lightBake.ts:101,106,120`): traced end to end.
   - `lampJob` has one await (`readLampCache`, which never rejects: try/catch inside). From the `held.dead` check to
     `sb.start()` is synchronous, so either the baker was made before the catch (then `held.sb` is set and the catch
     disposes it) or the job sees `dead` and returns before `new SectionBaker`. No window leaves a baker running.
   - `held.dead` is set only in the catch, which always rethrows: the bake has failed anyway, so no good bake can be
     dropped. The success path never reads `dead` as true (Case B proves 1 made / 1 started / 0 disposed, returned as
     `sections`).
   - `GameState.create`'s `disposeSectionBakersSince(mark)` (`gameState.ts:928`) runs as soon as `World.create` rejects,
     i.e. before the cache read resolves - exactly the window the old code leaked; now nothing is made after it.
   - A synchronous throw from `bakeLevelMoon` would also land in the same try / catch. Load-time only, not a hot path.

## Mutations (each restored with `git checkout -- <file>`, tree clean after)
- Remove `if (held.dead) return null;` -> lightBakeAbort A red (`expected 1 to be +0`).
- Remove `held.dead = true;` in the catch -> lightBakeAbort A red (same).
- `postStack.ts:467` `this.opts.lampBeams ?? true` -> `true` -> wiring guard red with the new "wiring guard: postStack.ts
  must pass ... do not loosen it" message.
- `volLights.ts` `return n` -> `return 0` -> volLightsWiring red; slot `i` -> `0` -> volLightsWiring red.
- Wiring guard back to cwd-relative reads under the chdir -> red (ENOENT `...\Temp\src\vfx\postStack.ts`).

## Runs
- `npx tsc --noEmit -p .`: exit 0.
- Brief files plus `grep -rl -E "volLights|lightBake|sectionBake" tests` (30 test files, `--maxWorkers=2`): 306 passed,
  9 skipped, 1 failed under 100% CPU (`ctcourseLight` "bakes in node fast enough" 60.7 s vs a 60 s cap) plus a
  `smoothWorldLight` beforeAll hook timeout. Solo rerun at 23-44% CPU of `ctcourseLight`, `smoothWorldLight`,
  `campusArtLight` (the last killed by my first run's shell timeout): 3 files, 18 passed, 1 skipped. Load-only timing;
  none of them reach the changed lines (non-sector maps take the `!def` path).

## Must-fix
None.

## Polish
- `lightBake.ts:104` (pre-existing, outside the brief): on a non-sector map a moon failure leaves the full
  `bakeLevelLamps` worker bake running to completion (transient CPU, disposes its own pool). Same class as polish 5;
  only worth a `dead` check if load retries become common.
- `tests/lightBakeAbort.test.ts` A could also assert `h.disposed === 0` (nothing was made, so nothing to dispose); cosmetic.

## Laptop suites for the PR
`node scripts/run-e2e.mjs --affected origin/master --list`: smoke, e2e-lightbake, e2e-desktop:1, e2e-desktop:2,
e2e-desktop:4.
