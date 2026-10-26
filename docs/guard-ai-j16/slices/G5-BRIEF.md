# guard-ai-j16 G5: e2e shadow cue (brief for the Sonnet builder)
Owner: Guard AI Build. Status: current.

Brief author: Opus 5.5, 2026-10-27, on feature/guard-ai-j16-2 after G4a / G4b / G6. Builder: Sonnet. One file:
`scripts/e2e-stealth-ai.mjs`. No change to `src/`, tests, docs other than your report, or any other script. If the
scenario cannot pass without a src change, stop and report; do not change src.

## Read first
- `docs/guard-ai-j16/PLAN.md` section 1 (the rule) and row G5; `docs/guard-ai-j16/PLAN-CHECK.md` fold-in 7;
  `docs/systems/ai.md` "Shadow cue".
- `scripts/e2e-stealth-ai.mjs:1-140` (launch, the `window.__t` helpers, `scen`) and the `light` scenario (`:181`) for
  the stick / step / arc pattern. `scripts/e2e-lib.mjs` `launch` (returns `ctx`) and `openPage(ctx, url, params)`.

## What the scenario proves (walk item, PLAN "Walk items")
With `charShadowLight` on, a calm guard who cannot see or hear the player, facing away from him, sees the player's
moving cast shadow in his focused cone: he grows suspicious (white arc, no line), looks at it, and never investigates,
fights or barks. Standing still, the player's shadow does nothing. With the flag off, the same walk does nothing.

## Rules (hard)
- Never pin the meter: never call `t.light(...)` and never replace `g.updateLight` on the cue page; that stops the cue
  fill (S3b brief :63-64). Assert `g.updateLight === Object.getPrototypeOf(g).updateLight` and that
  `g.shadowCues.version` grows during the walk.
- No sight: the player stays more than `PERCEPTION.closeRange` 1.8 m from the guard at every step (use >= 2.3 m) and
  at least 120 deg off the guard's facing (behind him: peripheral sight ends near 50 deg + blend).
- No hearing: a standing walk with the stick at <= 0.5 (speed <= 1.2 m/s; silent up to `NOISE_QUIET.stand` 1.65 m/s on
  concrete). Assert `g.noise === 0` at every sample and that the wrapped `em.hear` / `em.noise` were called 0 times
  during the run (fold-in 7). (A walk at this pace is silent on every floor: `noiseRadius` is 0 before the surface
  factor.)
- Settle after every teleport (PR2-CHECK FIX 1): the first cue fill after a `t.tp` reads the jump as footprint speed
  (jump / 0.1 s, far above `moving` 0.3 m/s), so a guard thinking in that 0.1 s window cues on a standing player. Never
  have a guard in the scene during the 0.3 s after a `t.tp`: teleport the player first, `t.step(0.3)` (three fills),
  then spawn the guard.
- The guard must be calm at the start: level `unaware`, `meter` 0, `cueT` Infinity (a fresh spawn), no other guards
  (`em.clear()` first).
- No new `Math.random`; deterministic stepping only (`a.loop.manual = true`, `stepHeadless`).

## Pages
- Change the launch line to `const { browser, ctx, page, errors } = await launch(...)` and import `openPage`.
- Move the body of the existing init `G(() => { ... window.__t = {...} })` into a named function `installT` and call
  it as `await page.evaluate(installT)`: behaviour on the main page is unchanged. Call it again on the new page.
- The cue page: `openPage(ctx, url, 'autostart=warehouse&mode=clear&charlight=1')`, `frames(p2, 10)`, then
  `p2.evaluate(installT)`. Check its own `errors` at the end with the same filter as the main page's.
- The flag-off control: on the main page when its `window.__app.current.charOccluders === null` (the default build);
  otherwise (a /preview/ URL turns the flag on by default) open one more page with `charlight=0` for it. If the
  orchestrator's go-ahead says to add `&charlight=0` to the main launch params (PR2-CHECK, /preview/), do that instead:
  the main page is then always the flag-off control.
- Gate the whole block like `scen`: `if (!only || 'shadowCue'.includes(only))`; name the log line `shadowCue`.

## Debug hooks the block reads (all exist after G4b; read-only use)
- `g = window.__app.current`; `em = g.enemyMgr`; wiring: `em.cues === g.shadowCues`, `em.chars === g.charOccluders`,
  both non-null on the cue page, both null on the flag-off page (assert these first).
- `g.shadowCues` (`src/world/shadowCues.ts`): `slotOf('local')` (0 solo), `count[slot]`, `source[slot * 3 + k]` (light
  registry id, -1 the moon, -2 unused), `speed[slot * 3 + k]` (m/s), `pts` stride 4 (x, y, z, contrast) at
  `((slot * 3 + k) * 3 + j) * 4`, j = 0, 1, 2 at 0.35 / 0.65 / 1.0 of the footprint from the feet; `version`.
- The guard `e` (`t.spawn('grunt', x, z, yaw)`): `cueT` (s since his last cue; Infinity never), `cueX`, `cueZ`,
  `cueSlot`, `cueLook` (new in G4b, `src/ai/enemy.ts`: his look in progress is the cue's own, not a hearing / ack
  look), `turning`, `level`, `meter`, `yaw` (forward = (sin yaw, cos yaw)), `pos`.
- Barks: wrap `em.onBark` (keep and call the original) and record `[e.id, line]`; wrap `em.hear` and `em.noise` the
  same way to count calls. Restore all three in a `finally`.
- Optional, the white arc: after a step, `g.frameUpdate(1 / 60, 1)` then `g.hud.arcs.shown > 0` (as `light`).
- `g.noise`, `g.player.controller.speed`, `window.__app.input.state.setMove('t', x, y)` (forward = (0, +y) along
  `cam.yaw`, set by `t.tp`).

## Picking the spot (in the page, before spawning the guard)
1. Lamps: `g.world.level.lights.lights` with `kind === 'lamp'`, `on`, not `destroyed`, on the ground floor (`y` < 6).
2. For each lamp and 8 directions, try player feet at 3, 4, 5, 6 m (horizontal) from the lamp's floor point, on a
   walkable cell (`em.nav.cellOf(x, z, 0) >= 0`). `t.tp(x, z, 0)`, `t.step(0.25)` (two cue fills), then read the
   footprint `k` with `source === lamp.id`: far point F (j = 2), its contrast `q` and its length
   `L = hypot(F - feet)`. Keep candidates with `q >= 0.5` and `L >= 4`; take the one with the largest `q`, ties by
   larger L. Log the pick (lamp id, feet, F, q, L). None found: fail with that message (J10's re-light may move it;
   PLAN risk 1).
3. Geometry from the pick: `d` = unit (F - feet), `n` = d turned 90 deg. Guard at `G = feet + 2.4 d + 0.6 n`, yaw
   `atan2(d.x, d.z)` (facing along the shadow, away from the lamp and the player). Check before using it: G walkable,
   `hypot(G - feet) >= 2.3`, the player >= 120 deg off his facing, F within 27.5 deg of his facing and 1-10 m from G.
   If a check fails, try `0.4 n` / `0.8 n`, then the next candidate.

## The run (cue page)
- Player to the walk start first: `t.tp(feet - 0.6 n, yaw of +n)`, `t.step(0.3)` (settle; the pick loop left him at
  its last candidate, possibly in the guard's view). Then spawn the guard at G with that yaw; `t.step(1)`; re-set
  `e.yaw` to the pick's yaw; assert calm (rules above).
- Walk: no new teleport; stick `setMove('t', 0, 0.4)` so the player walks along +n until his feet have moved 1.2 m
  along n (cap 4 s), stepping `1 / 60` s; sample each step: `g.noise`, distance and angle to the guard, `e.cueT`, `e.level`,
  `e.meter`, `e.cueLook`, `e.turning`, and when `e.cueT === 0` the cue point against the local slot's `pts` (the same
  step's fill). Then stop (`setMove('t', 0, 0)`) and step on for 20 s, sampling each 0.25 s.
- Asserts:
  1. A notice: some sample with `e.cueT < 1` during the walk, `e.cueSlot === g.shadowCues.slotOf('local')`, and the
     first notice's (`cueX`, `cueZ`) equal to one of that slot's `pts` points within 1e-3 m.
  2. He reaches `suspicious`; the highest level over the walk and the 20 s is `suspicious` (never `investigating`,
     `alert` or `searching`), and he is back to `cooldown` or `unaware` by the end.
  3. He faces the point: within 1.5 s of the first notice, |wrap(atan2(cueX - e.pos.x, cueZ - e.pos.z) - e.yaw)| <=
     0.35 rad. Every sample with `e.turning` true has `e.cueLook` true (no hearing look).
  4. Meter: max <= 0.36 (`SHADOW_NOTICE.meter` 0.35; sight would go past it), never >= 0.6.
  5. Silence: no bark recorded for this guard; `em.hear` / `em.noise` call counts 0; `g.noise === 0` at every sample.
  6. Spacing held: min distance to G >= 2.3 m, min angle off his facing >= 120 deg (both from the samples).
  7. `g.updateLight` is the prototype's and `g.shadowCues.version` grew.
- Control, standing still (cue page, `t.reset()`, the same pick): `t.tp` the player to `feet`, `t.step(0.3)`, then
  a fresh guard at G, no stick, 6 s: `e.cueT === Infinity`, level `unaware`, meter 0.
- Control, flag off (the flag-off page): wiring nulls asserted, then the same order (tp, settle, spawn), walk and 6 s:
  `e.cueT === Infinity`, level `unaware`. (The pick comes from the cue page: pass feet, G, yaw and n into the
  evaluate.)
- Every failing assert prints the pick and the sample that broke it (JSON), as the other scenarios do.

## Size and checks
- About 160-200 lines in `scripts/e2e-stealth-ai.mjs`, one block near the other light scenarios (after `lights`).
- `node --check scripts/e2e-stealth-ai.mjs`; `npx eslint scripts/e2e-stealth-ai.mjs` if the repo lints scripts.
- Do not run the e2e on the PC; the orchestrator queues the laptop run (`--suites "e2e-stealth-ai"`, plus
  `--only=shadowCue`). Do not run npm run dev or a full npm run check.
- Commit `guard-ai-j16 G5: ...` (path-limited add), ending with the Co-Authored-By line; report the pick logic, the
  line count and anything you had to guess.

## Out of scope
The meter block (Sector Ops S4), the parity card, tuning `SHADOW_NOTICE` (a walk call), any src change.
