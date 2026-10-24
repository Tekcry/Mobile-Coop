status: open

# Sector Ops: polish batch 3 (fog2 check P1-P3, bake2 check polish 5)

Lead: Night Shift | Sector Ops Build (brief 2026-10-25). Unit tests only: no e2e, no GPU, no build, no `npm run check`.

Base: `origin/master` @ fc4dc9ab (contains fog2 #357 and bake2 #354; bake3 #361 is NOT in master, so nothing here
touches `src/voxel/sectionJobs.ts`). New branch: `feature/sector-redesign-polish3` cut from that sha.
Read first: `git show origin/master:CLAUDE.md` "Hard rules", `docs/systems/agent-preamble.md`,
`docs/sector-redesign/checks/fog-wiring-check.md` ("Polish" P1-P3), `docs/sector-redesign/checks/section-bake-robust-check.md`
("Polish" 5). Line numbers below are on fc4dc9ab; if master moved, find the same text.

## Only files to edit
- `src/vfx/volLights.ts` (only `writeVolLights`, lines 69-89)
- `tests/volLightsWiring.test.ts`
- `src/world/lightBake.ts` (only `bakeLevelLight`, lines 96-120)
- new `tests/lightBakeAbort.test.ts`
- new `changes/feature-sector-redesign-polish3.md` (format: `changes/README.md`; line 1 `# Sector Ops polish 3`, line 2
  `kind: patch`, then `- ` bullets)

Off limits (in-flight work elsewhere): `src/voxel/sectionJobs.ts`, `src/voxel/workerPool.ts`, `src/vfx/postStack.ts`,
`src/game/gameState.ts`, `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/world/maps/campusOps.ts`,
`scripts/laptop-queue/*`, any visual-gate script, `docs/systems/lighting.md`, `CHANGELOG.md`, `package.json`.

## Build (each item: change, then the test that proves it)

1. (fog P1) `tests/volLightsWiring.test.ts:81-85` - the wiring guard reads `src/...` relative to the process cwd. Read
   both files through `new URL('../src/vfx/postStack.ts', import.meta.url)` and
   `new URL('../src/game/gameState.ts', import.meta.url)` (`readFileSync` takes a URL). Proof: in the same test,
   `process.chdir(os.tmpdir())` before the reads and restore the old cwd in `finally` (Vitest 5's default pool is forks,
   so `chdir` works; if it throws `ERR_WORKER_UNSUPPORTED_OPERATION`, drop the chdir and say so in the report). The
   test must fail with the old cwd-relative reads under that chdir (run it once that way, then restore).
2. (fog P2) Same test - the regexes match exact source text, so a harmless rewrite fails them. Give each `expect` a
   message (Vitest `expect(value, message)`): "wiring guard: postStack.ts must pass this.opts.lampBeams ?? true to
   writeVolLights; if you rewrote that line on purpose, update this regex with it, do not loosen it" and the
   gameState.ts equivalent (`lampBeams: mapLampBeams(world.map.theme)`). Keep the two regexes unchanged. Proof: the
   test stays green; mutate `postStack.ts:467` locally (`this.opts.lampBeams ?? true` -> `true`), confirm red with the
   new message in the output, `git checkout -- src/vfx/postStack.ts`.
3. (fog P3) `src/vfx/volLights.ts:81-88` - `writeVolLights` keeps `i` and `k`, always equal. Drop `k`: write slot `i`
   (`writeVolLight(lights[ids[i]!]!, i, pos, dir, col, lampBeams)`) and `return n`. Keep the doc comment's contract
   ("returns the count written"). Hot path (every frame from `PostStack.frame`): plain counted loop, no closure /
   iterator / temp. Proof: `tests/volLightsWiring.test.ts:40-79` unchanged and green (return 3 / 0 / 4, slot 3
   untouched at n = 3, slot values per light) and `tests/volLights.test.ts` green.
4. (bake2 polish 5) `src/world/lightBake.ts:99-119` - if `bakeLevelMoon` rejects while `lampJob` is still awaiting
   `readLampCache` (`:104`), the catch (`:115-118`) runs with `held.sb` still null; the job then resumes, makes and
   starts a `SectionBaker` nobody stops. Fix: add `dead: false` to the `held` holder; the catch sets `held.dead = true`
   before `held.sb?.dispose()`; `lampJob` returns `null` right after the `readLampCache` await when `held.dead` (before
   `new SectionBaker`). Load-time only (not a hot path); keep the comment style (`(section-bake robust, polish3)`).
   Proof: new `tests/lightBakeAbort.test.ts`:
   - `vi.mock('../src/voxel/lampJobs', ...)`: `readLampCache` returns a promise the test resolves by hand (with
     `null`, a cache miss); `bakeLevelMoon` rejects with `new Error('moon')`; keep `LAMP_VERSION` / `MOON_VERSION`
     (spread `importOriginal`).
   - `vi.mock('../src/world/sectionBake', ...)`: spread `importOriginal`, override `sectionBakeFor` to return one
     region covering the test box (check the `PlanRect` shape in `sectionBake.ts`).
   - `vi.mock('../src/voxel/sectionJobs', ...)`: a fake `SectionBaker` class that counts constructions and
     `start()` calls, with `result`, `dispose()`.
   - Input: a `LightRegistry` with one fixed spot lamp (as in `tests/volLightsWiring.test.ts:16`), `reg.ambient` set,
     a small `lo` / `hi` box (e.g. [-4,0,-4] / [4,4,4]), `shapes = new Float32Array(0)`, any `shapesHash`, `sunDir`
     [0,-1,0], `moonLight` 0.1.
   - Case A: `bakeLevelLight(...)` rejects with 'moon'; then resolve the `readLampCache` promise with `null`, flush
     microtasks (`await new Promise((r) => setTimeout(r, 0))`); expect 0 constructions and 0 starts. Must fail on
     master's `lightBake.ts` (run it once without the fix and note it in the report).
   - Case B (no regression): `bakeLevelMoon` resolves (`{ vis: new Uint8Array(n) }`, whatever `MoonResult` needs),
     `readLampCache` resolves `null`: one construction, one start, the returned bake's `sections` is that baker.

## Run
- `npx tsc --noEmit -p .`
- `npx vitest run tests/volLightsWiring.test.ts tests/volLights.test.ts tests/lightBakeAbort.test.ts tests/sectionBake.test.ts tests/sectionBakeRobust.test.ts tests/lampBake.test.ts tests/changesFragments.test.ts --maxWorkers=2`

## Done
Branch `feature/sector-redesign-polish3` pushed (one or more commits on fc4dc9ab, `git add` named files only, trailer
"Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"); tsc exit 0; every file above green with counts in the
report; the two "fails without the fix" checks (items 1 and 4) and the item 2 mutation done and restored, `git status`
clean; only the listed files changed (`git diff --stat origin/master...HEAD`); status line set to
`status: done feature/sector-redesign-polish3 <sha>`. No PR needed (the lead opens it).

## Report (builder fills in below)
Branch / sha; per item what changed (file:lines); tests run with pass counts; the fail-without-fix and mutation results;
deviations (e.g. chdir unsupported); anything left open.

## Left for Michael / GPU (not in this brief)
- bake2 polish 1, 2, 4: done in bake3 (#361, train-ready, not yet in master).
- bake3 check polish (Math.min retry cap, held-order test, worst-case wording) and the bake3 follow-up in
  `docs/systems/lighting.md` "Failures": wait for #361 in master (they edit `sectionJobs.ts` / its tests).
- bake2 polish 3 (cap clock starts at queue entry; a hung worker never replaced): needs `workerPool.ts` and the
  `sectionJobs.ts` cap code bake3 changed; behaviour choice, not a unit-test polish.
- bake2 polish 6 (a lamp failing every way on one peer only): practically unreachable, needs a co-op design call.
- bake2 polish 7 (`GameState.create` try / catch fault injection): e2e only.
