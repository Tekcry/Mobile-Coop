# guard-ai mill-hunt: H3 check A
Checker: Opus 5.5 (checker A of two), 2026-10-27. Scope: `git diff 5a13cc893 5336f4735` (the glue only; the board,
`src/ai/millHunt.ts`, is checked with PR 1). Read: origin/master CLAUDE.md, BRIEF A1-A16, PLAN rev 2 "Glue (H3)",
PLAN-CHECK fold-ins, H3-REPORT, the full diff, the board's `admit` / `tick` / `drop` / `emit` / `settled`.

Verdict: PASS

No broken or off-intent glue found. Polish below; items 2 and 3 are what to look at if the queued laptop e2e-piano run
fails in the hunt window.

## Checks
- **Flag off, same as today.** Every new branch is gated on `mhOn` (false) or `millHunt` (null without the flag or
  without a section `hunt`). `i.hunting` has the same truth value. The searching branch and `aimedMotion` reduce to the
  code as built. `placeSlot` keeps `sweepify` / `buildPair`, `sceneDarkOn` keeps the sweep loop, the board tick keeps
  `glimpseFollow`, and `revive` / `clear` are no-ops. `sceneDarkOff` adds `mhStop` (two field writes on guards already
  off). Glue tests cover it (4 watch-only pairs, `glimpseFollow` 5x/s, `mhTick` never). `E2E_MILLHUNT=0` gives the old
  checks with the same text.
- **Flag on, never calm.**
  - `searching` leaves only to `alert` or, without `hunting`, to `cooldown` (`alertState.ts:194-197`). `|| this.mhOn`
    holds him there for good.
  - Incident board: `incidents.ts:544` `free()` never picks a `searching` guard, so no `sendTo` / `checkLight` lands on
    a hunt guard. A forced `investigating` (a light check, a camera body) ends to `cooldown` / `unaware`, and `mhTick`
    puts him back within 0.2 s.
  - Blackout search (fold-in 7): `searchAt(.., SEARCH_BLACKOUT)` only sets the kind and stimulus. The `mhOn` branch
    wins and `hunting` stops `searchFor` from ending it.
  - Body search (fold-in 11): `bodySearch` resets `aware.t` and the kind. He stays `searching` and the board walks him.
- **Combat.** A full meter goes to `alert` before the switch (`alertState.ts:148`). `decide` sends him to combat
  untouched (`enemy.ts:3933`). The board's `gone()` drops him (`alert`). Losing sight returns him to `searching`, and
  `mhTick` re-admits him at the same member index; his goal is written in that same tick.
- **Exclusions and joins.**
  - Excluded: the dead, the held and dogs (`mhStart`), and the board's `gone`.
  - A woken guard rejoins: `revive` calls `mhStart`, and the next tick admits him.
  - A late spawn joins through `placeSlot`.
  - `sceneDarkOff` sets the board to null and calls `mhStop` on everyone.
  - `clear()` swaps in an empty board. The restart's `spawnBeat` then calls `sceneDark = true`, which builds a new
    board at phase 0 before the spawn (`pianoScene.ts:650-656`, guards at `RESTART_SPAWN_S` 0.4 s; the e2e probes at
    1.5 s).
  - `huntBoard` reads the live section through `radioNet.section` (`enemyManager.ts:1091`). The map cast follows the
    `:2245` precedent for stub worlds.
- **The four additions beyond the PLAN.** All four are right and safe:
  1. The calm put-back in `mhTick`. A1 says "never cooldown or unaware". It covers only `unaware` / `cooldown`;
     `suspicious` / `investigating` run out on their own first.
  2. The woken guard's `mhStart`. Without it a woken guard would search 60 s and then patrol calm, against A1.
  3. `aimedMotion` off on the hunt. It only picks the motion profile (`enemy.ts:4651`). The board's aim holds are timed
     at the calm turn, and `alerted` still gives the aimed motion in combat.
  4. `mhStep` after the revive and entry walks. A waker finishes the revive, then the board drives him. Entry walks
     (device responders) do not occur in the mill.

  `goTo` copies `mhPt` into `routeGoal` (`enemy.ts:3198`), so mutating the shared array at the board tick is safe.
- **The co-op pin hook against `mhTick`.** I agree with the builder: there is no fight that breaks the kill section.
  - The hook runs after each fixed step (`e2e-net-lib.mjs:120`). It sets every guard `unaware`, then `mhTick` sets them
    `searching` once every 12 steps (`onLevel`: no bark).
  - Pinned guards' `update` is a no-op, and the takedown allows any level from behind. In the knife scene `vCalm` is
    always true (`takedownController.ts:472`).
  - Unpinned guards spend 11 of 12 steps `unaware` and walk their map routes (not swept, as with the flag off), which
    is the same route class.
- **Allocation.**
  - A guard's hunt step (`calmDecide` on the hunt) is 0 B, measured on guards 1, 6 and 10.
  - `mhTick` is 192 B a tick (12 guards). The re-admit loop alone is 0 B; `hb.tick` alone is 192 B. The board with a
    plain test sink is under 16 B a tick (`tests/millHunt.test.ts:763`). So it is one HeapNumber per member at the
    board-to-Enemy handoff (`HuntBoard.emit` -> `out` -> `mhOut` -> `Enemy.mhGoal`). Polish 1 covers whether it is
    cheap to remove.
- **The e2e.**
  - The checks are correct.
  - Blinding restores perception in `finally` (polish 3).
  - `MILL_HUNT_W1` equals `SEARCH_X/Z` (5.5, 5.25), which is the PLAN's start point, and a test pins it.
  - The probe's board fields (`arc`, `lineFirst/End`, `sx/sz`, `lineY`, `roomBox`, `roomLine`, `roomIds`, `nRooms`,
    `phase`) are public readonly, and line 0 is the ground line.
  - The narrowed W1 check is honest in direction (polish 2).
- **Co-op.** The hunt is reached only through the hooks GA6's sweep already used: `sceneDarkOn`, `placeSlot`,
  `revive`, and the host's `update` (the client's spawn path is the host's, `pianoScene.ts:566`). There is no change to
  `src/net`, the wire or saves.
- **Hard rules.** The glue uses `hyp2`. There is no closure per board (`mhOut` is a module function). Strict TS is
  clean. The flag is dark (`darkFlag`, `PREVIEW_ON`), and `tests/previewFlags.test.ts` passes.

## FIX
None.

## Polish
1. **The 192 B per tick cannot be removed cheaply from the glue side.** In one scratch run, replacing `out` with a
   field-writing closure read 544 B and a no-op read 528 B (worse: inlining changes). The cheap removal is in the board
   (`millHunt.ts`, not mine): keep per-member goal arrays (x, z, face) that `mhStep` reads through the member index,
   with no call per member. The cost is about 1 KB/s at 12 guards, and it is a HeapNumber, not an object (the repo's
   `HEAP_NUMBER` bounds accept that). For the lead.
2. **The "closing in" set includes G4, not just G5 and G6.** In a kinematic run of the glue harness (12 set, open nav),
   G4 is still walking east to regroup at G5 at cut + 30 s. His line distance to W1 is about 21-25 m, which puts him
   inside the "> 15 m" set (H3-REPORT note 6 names only G5 and G6). He peaks at 29 m at about EMP + 50 s, then the pair
   walks west. The mean fell (about 29.8 -> 24.9 m) in that run, but a slower regroup on the real nav could invert it.
   If the laptop run fails here, leave out units in `regroup` / `spread` at the 30 s sample (the board's `uState`)
   rather than widen the window.
3. **Perception 0 does not fully blind the guards.** It zeroes the sight and close rates, but `instantDetect`
   (`perception.ts:194`, applied at `enemy.ts:2981`) ignores perception. A torch-lit player within 1.6 m in a guard's
   focus cone is still detected at once. The operator stands about 2.4 m from the start bay loop's nearest leg, so the
   risk is low. If the window shows an `alert`, this is why: add a blind (e.g. `blindT`) or move the operator off the
   loop. The hook mutates the shared `DIFFICULTY` object; that is safe because `finally` restores it.
4. **A calm hunt guard can be sent by the incident board before the put-back.** In the 0.2 s block, `boardStep` runs
   before `mhTick` (`enemyManager.ts:4218` / `:4224`), so for one tick the board can send him. That is harmless: the
   task ends and the put-back follows. Running `mhTick` before `boardStep` would close it.
5. **Woken guards fill the board's member slots.** Member slots are never freed (`cap` 24), and each revive is a new
   `Enemy`. After 12 revives (8 with 16 guards) a woken guard is `mhOn` but not admitted, and he stands searching where
   he woke. This is rare in the knife scene (lethal takedowns). For the lead, with the builder's stale-partner note.
6. **Hunt pairs have no missing-partner watch (H3-REPORT note 5).** This is not in the PLAN: H4 or the lead decides.
   Name it on the walk card if it stays.

## Commands and results (worktree at 5336f4735, then 7295b66e7 PARTIAL save point)
- `npm run typecheck:fast`: exit 0.
- `npx vitest run` on the 80 files matching `ai/enemy'|ai/enemyManager'|sceneSweep|pianoGuards|helpers/sweepGuard|millHunt`
  (78 test files; the other 2 matches are helpers): 78 passed, 1188 passed, 1 skipped.
- `npx vitest run tests/e2eAffected.test.ts tests/changesFragments.test.ts`: 47 passed.
  `tests/previewFlags.test.ts`: 14 passed.
- `node --check scripts/e2e-piano.mjs`: exit 0.
- Scratch measurements: temporary `tests/zzScratchMh.test.ts`, deleted and not committed. It covered allocation by
  part (above) and a 90 s kinematic run of the ground guards' line distance to W1.
- Not run (as briefed): e2e, `npm run check`, `npm run dev`.
