# guard-ai-j16 PR 2 (G4a, G4b, G6, G5 brief): check
Owner: Guard AI Build. Status: current.

Checker: Opus 5.5 (fresh), 2026-10-27. Branch `feature/guard-ai-j16-2`, scope `git diff 24273a00c 6a203cbba` (24273a00c
= the local merge of Sector Ops #665 onto G3's head).

Verdict: **PASS** (after the checker's fix commit 2791859f4 to the G5 brief; FIX 1 below is applied, nothing is left
for the builder).

## FIX items
1. Applied in 2791859f4 (`docs/guard-ai-j16/slices/G5-BRIEF.md`, "The run" and the controls). The brief let a guard be
   in the scene during the first cue fill after a teleport. `ShadowCues.fillSlot` (`src/world/shadowCues.ts`, the
   speed block) takes the far point's move since the last fill over 0.1 s, so a `t.tp` reads as a footprint at
   (jump / 0.1 s) m/s, far above `SHADOW_NOTICE.moving` 0.3, for one fill. Concrete failure: the standing-still control
   (`t.reset()`, the player at `feet`, a fresh guard) puts the far point about 20 deg off his facing and 1.6+ m away,
   contrast >= 0.5 by the pick; his first think comes at `senseRng * 0.25` s (`enemy.ts:476`), so about 40% of seeds
   cue on a standing player and `cueT === Infinity` fails. Also, the old order spawned the guard and stepped 1 s with
   the player still at the pick loop's last candidate (possibly in front of him, lit), so "assert calm" could fail.
   The fix: teleport, `t.step(0.3)`, then spawn, in the run and both controls; a rule line says why; the walk starts
   with no teleport.

## Checked
- **Flag off.** `charOccluders` null (field initialiser on `flags.charShadowLight`), so `shadowCuesFor` returns null,
  `enemyMgr.chars` / `.cues` are set to null (G3's 4-argument light reads and no `shadowLook`), and `fillChars` returns
  before `fillOccluders` (`gameState.ts:1903-1904`). Client: the puppet branch builds no manager, `fillChars` takes
  `fillVictims(this.takedownVictims())` (CoopClient's `puppetList`) exactly as before; `shadowCues` null on a puppet;
  no `src/net` change, nothing on the wire. Sandbox: no manager, `NO_VICTIMS`, as before.
- **G4a.** One switch: `em ? em.fillOccluders(...) : fillVictims(...)` replaces the interim guard fill (the only other
  fill sites are `fillPlayers` for the operators and S2c's `charMatesInto`), so nothing is double-filled. Shapes and
  keys are G1 / G3's (`putGuard` / `putDog` / `putBody`, `occKey(kind, num)`); `pictureInto` is kind-agnostic for
  non-players, so the picture takes the new shapes. A carried body: `Body.present` is `!hidden && !carried && !!rig`,
  so it writes nothing (A8). Overflow: the manager's -1 count goes to `charFull` (tested). `chars` and the switch land
  in one commit (5e82f6b56), as PLAN G4a / PR 1 check B polish 5 require.
- **Set once, never rebuilt.** `charOccluders` is a readonly field initialiser, `shadowCues` readonly (constructor
  `:632`, before the manager), `enemyMgr` is assigned only at `:790` (no other writer in `src`). A checkpoint restart
  is `EnemyManager.resetMemory` -> `despawnAll` on the same manager; a new match or a results-screen restart is a new
  GameState (`GameState.create`). Sector Ops section loads use `despawnAll` too. The getters stay valid.
- **G4b.** `enemyMgr.cues = this.shadowCues` live with the flag on (solo / host); the guards read it through G3's
  `cues: () => this.cues` getter (`enemyManager.ts:719`), and the late-set case is G3's test. `cueLook` is a getter
  (`turnT > 0 && cueTurn`), read nowhere in `src` (grep: only its definition). No field, no per-step cost.
- **Hot path.** The only per-step change is one branch in `fillChars`; `fillOccluders` loops without closures or
  iterators. `guardShadowGame` measures `bytesPerCall` < one heap number over `fillChars` with 10 guards / dogs and 2
  bodies.
- **Tests are real.** `guardShadowGame` runs GameState's own `fillChars` (prototype stub) against a real
  `EnemyManager`: keys by number, bit-equal to `fillPlayers` + `fillOccluders`, overflow, 0 B, client bit-equal to
  `fillVictims`, flag off never asks the manager. The constructor checks are source regexes over comment-stripped
  code (order, one set each, `shadowCues` before the manager, manager only off the puppet branch): brittle to a reflow,
  but they pin exactly the wiring the plan asked for. `shadowNoticePerceive`'s new case covers `cueLook` true after a
  cue, false after `hearTurn`, after the look runs out and with null cues.
- **ai.md** (G6): accurate against the code (focus half 27.5 deg `perception.ts:18`, 10 Hz `LIGHT.playerHz`, the gate
  list, 0.35 / 0.366, the record); short; doc-lint 0 errors, nothing on ai.md or this job's docs.
- **G5 brief.** Exact page (`openPage(ctx, url, '...&charlight=1')`; `launch` does return `ctx`, `openPage` exists in
  `e2e-lib.mjs:103`), spot picked from live footprints with stated thresholds, guard geometry checked (min distance
  2.4 m, >= 153 deg behind him over the whole walk: fold-in 7's 1.8 m and "unheard"), hooks all exist (`cueT`,
  `cueX`, `cueZ`, `cueSlot`, `cueLook`, `turning`, `ShadowCues.slotOf / count / source / speed / pts / version`,
  `em.nav.cellOf`, `em.onBark`, `em.hear`, `em.noise`), asserts and both controls named. Hearing: footsteps reach the
  guards only through `em.hear` (`gameState.ts:2299`, `steps > 0`), so "`em.hear` called 0 times" is exact. Assert 1's
  "same step's fill" holds: `fillChars` -> `updateLight` (cue fill) -> `enemyMgr.update` in one step
  (`gameState.ts:2306-2313`), and `cueT += dt` runs before the think. With FIX 1 applied it is strict enough for Sonnet.

## /preview/ recommendation: add `charlight=0` to the main page
The queue's `run-e2e.mjs` serves a normal build (no `VITE_PREVIEW`), where the flag is off: today's queue runs are
unchanged either way. A hand run against /preview/ turns cues on for the main page, and these scenarios can change:
- `shadow` (`e2e-stealth-ai.mjs:147`) asserts meter < 0.3 twice; a cue floors the meter at 0.35. Behind: a crouch-walk
  in a dim aisle behind a guard is the cue's own case if a lamp throws the footprint ahead of him. In front: `t.tp` to
  (-14.5, 17.5) in his cone, crouched still in the dark (sight rate under `leak` by design), and the teleport's one
  fast fill (FIX 1's mechanism) can cue on his first think.
- Every `t.light(v)` scenario: pinning replaces `updateLight`, which stops the cue fill, but `em.cues` keeps the last
  fill's points and speeds. A guard in a `t.light(0)` scenario (sight rate 0 opens the gate) can cue on a stale
  footprint for the whole scenario (noise, lkp, patrol, bodies, lights, breaker, alarm, ...): a stray 0.35 meter and a
  turn where levels and paths are asserted.
- Low risk: `light` / `vision-detect` (the player is seen at once; the cue is gated off by sight), `vision-dog` (dogs
  are excluded), `vision` (no AI assert).
Recommendation: add `&charlight=0` to the main page's launch params (G5's builder, in the same launch-line edit; the
brief now carries it as an option). It matches Sector Ops' own plan (`docs/char-shadow-meter/PLAN.md:177-178`: "Every
other card and scenario reads as before (the new blocks open their own `charlight=1` pages)"), so S4's meter block is
not affected, and the main page becomes the flag-off control on any URL. The orchestrator's call.

## Polish (not blocking)
1. ai.md "It never escalates" -> "It never escalates on its own": PLAN section 1 allows a cue's raised sensitivity to
   let a sub-leak glimpse turn into a real one (investigate by sight).
2. For Sector Ops (`ShadowCues`, not PR 2): the teleport spike also happens in the game (a respawn, a checkpoint
   teleport, a co-op respawn). A cap on the per-fill jump (e.g. speed 0 when the far point moved more than ~1 m in one
   fill) would keep a teleport from reading as a moving shadow. Walk call.
3. `guardShadowGame`'s constructor checks are source regexes; fine as a wiring pin, but a reflow of those lines fails
   them. Keep in mind when S3b-2 or Player touches the constructor.
4. Applied with FIX 1 (same commit): the brief's walk now ends at 1.2 m along n (cap 4 s) instead of "about 2-3 s",
   and its "metal or grate floor" line (no hook named) is replaced by the fact that a walk is silent on every floor.
5. `tests/consoleNoticeA4.test.ts` failed once in the 71-file batch (157 s under load) and passed alone (2 / 2): a
   load timeout, not PR 2's.

## Commands
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16-2.
- `npm run typecheck:fast`: clean.
- `npx vitest run` on the 71 test files importing `src/game/gameState`, `charOccluderFill`, `shadowCues` or
  `src/ai/enemyManager` (includes `guardShadowGame`, `shadowNoticePerceive`): 70 passed, 1 failed (Polish 5);
  1048 / 1049 tests. `npx vitest run tests/consoleNoticeA4.test.ts` alone: 2 / 2 passed.
- `node scripts/doc-lint.mjs`: 0 errors, 82 warnings, none on ai.md or `docs/guard-ai-j16/`.
- Not run, as instructed: npm run dev, e2e, a full npm run check.
