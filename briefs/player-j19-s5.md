status: done feature/player-j19-s5 6a5cc40076aa93b9a0314c27b22f7ea8cd9d6a50

# Brief: player-batch-j19 S5 - Forward lean, sprint anim paths, audit limits, compare flag (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Job J19 player-batch-j19, slice S5, rows R25 (no forward lean below full
speed), R19 anim part (dead sprint paths), R30 (audit limits), R27 flag `mocapRaw`. Animation code: **Opus builder**.
Follow the steps exactly; anything this brief does not settle is `status: blocked`, not a guess.

## Read first
- Plan: `git show origin/feature/player-batch-j19:docs/player-batch-j19/PLAN.md` ("How it works today" R19 / R25 / R26-R27
  / R30, "Design per row" same rows, "Slices" S5, "Flags", "Test plan", "Risks"). Its line numbers are master
  38e92f5d3's: use the lines below.
- Brief: `git show origin/feature/player-batch-j19:docs/player-batch-j19/BRIEF.md` A9 (R19), A14 (R30), M4 (Q37: no R26 /
  R27 value change before the walk).
- Decisions: G217 (no lean below full speed), G31 (no sprint), G33 (0.4 s flick turn), G243 (draw times), G399 (mocap only
  for players). Bible 5.12.2 item 6 (`docs/design-bible.md:820-832` on master: Flick turn 0.4 s `:824`, Weapon raise
  0.75 s pistol / 1.1 s rifle `:828`, Takedown 1.0-1.5 s `:832`).
- Hard rules: `git show origin/master:CLAUDE.md` (hot paths allocate nothing, no closures, `hyp2` / `hyp3`, never
  `Math.hypot` in src). Cloud rules: `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions").

## Base and branch
- Base `origin/master` at `29f03b6c004bf8dae66eea9c434160b6b1db061c`. New branch `feature/player-j19-s5` from it; push
  `origin feature/player-j19-s5` only (no force, no merge of master or any branch, no rebase, no other branch). `npm ci`
  once.
- Guard before every write (file edit, commit, push): `test "$(git rev-parse --abbrev-ref HEAD)" = feature/player-j19-s5`.

## Stay clear of the open Mixamo PRs (#494 `feature/mixamo-on` e39da5fd9, #498 `feature/mixamo-source-wire` df214492f)
Measured with `git merge-tree --write-tree origin/master origin/feature/mixamo-source-wire` (clean today). Their hunks
on S5's files, in master 29f03b6c0 lines:
- `src/anim/animGraph.ts`: the import block `:45-66` (they rewrite `:48`, the `./mocap` import, and `:53`, `:57`, `:58`,
  `:63`); `:941-950`; `:977-981`; `:1122-1131`; `:1330-1336`; `:2031-2081`; `:2268-2272`; `:2339-2345`; `:2366-2440`;
  `:3187-3191`; a 31-line insert after `:3326`. Do NOT edit any of these lines or the line next to them. In particular do
  not touch the `./mocap` import at `:48`: S5's import is a NEW line after `:71` (Step 3).
- `src/anim/mocap.ts`: `:212-260` (`MOCAP_SET_MX`, `setMocapMixamo`). S5 edits only `:36` (one import after it),
  `:106-122` and a new block after `:125`.
- `src/core/flags.ts`: after `mixamo` (`:54-56` interface, `:161` object) they add `anim`. S5 adds `mocapRaw` after
  `fullbright` (`:38`, `:152`) only. (Other flag branches append after `guardFreeze` or at the end: keep out of both.)
- `src/player/characterRig.ts`: no S5 edit at all (S4 and #498 edit it).
- Default animation source byte-identical except R25's chest pitch (Step 1); the Mixamo source, its rows, `mixamo.ts`,
  `animSource.ts`, `nowPlaying.ts`, `studio.ts`, `mocapSources.ts` are out of scope.

## Files (only these)
Edited:
- `src/anim/mocap.ts`
- `src/anim/animGraph.ts` (Step 3 items 2-4 only: one import line, one const, three lines in `crouchSet`)
- `src/anim/audit/limits.ts`
- `scripts/anim-audit.mjs`
- `src/core/flags.ts`
- `tests/mocapRunPose.test.ts`
- `tests/animAudit.test.ts`
- `tests/mocapGuards.test.ts`
- `changes/feature-player-j19-s5.md` (new; format `changes/README.md`)

In the PLAN's S5 list but NOT edited by this brief (kept, reasons in Step 2): `src/anim/clips/mocap/sprint.ts`,
`tests/mocapSprint.test.ts`, `tests/animFixPass.test.ts`, `tests/helpers/afpMeasure.ts`. Any edit there, or to any
other file, is a deviation: stop, `status: blocked`. Not: `src/player/**`, `src/anim/mixamo.ts`, `src/anim/nowPlaying.ts`,
`src/anim/studio.ts`, `src/anim/mocapSources.ts`, `src/game/**`, `src/config/**`, `src/weapons/**`, any fixture, `docs/**`.

## What is there now (master 29f03b6c0; re-found)
R25:
- `src/anim/mocap.ts:122` `MOCAP_RUN_POSE = { from: 2.0, to: 3.0, tau: 0.25, bob: 0.35, lift: 0.05, liftFrom: 3.0,
  liftTo: 4.0, pitch: 0.26, pitchSprint: 0.32, pitchFrom: 4.0, pitchTo: 5.0, bankLag: 0.06, armTau: 0.08, armLead: 0.7,
  elbowRate: 4 }`, doc `:106-121`. Read only by `src/player/characterRig.ts`: `mocapRunPose` `:3065-3120` (the run share
  `runShare = smoothstep((v - from) / (to - from)) * keyMocap` `:3112-3116`; `runPitch = pitch + (pitchSprint - pitch) *
  clamp01((v - pitchFrom) / (pitchTo - pitchFrom))` `:3117-3118`, v = `input.speed`, unfiltered); `mocapRunTrunk`
  `:3128-3145` replaces the capture's mean chest pitch with `runPitch` on the share (`:3140`, gated by
  `MOCAP_LAYERS.trunkMean`); the same share drives the pelvis height (`:2433-2438`), the bank (`:3132`) and the arm
  follower (`:3276-3304`, `:3790`).
- So today the jog (3.0 m/s, full share) gets the 0.26 rad CT run chest pitch: measured trunk (hips to neck) walk 1.4 =
  3.7 deg, jog 3.0 = 13.7, run 4.0 = 14.8, sprint 5.0 = 22.5 (`docs/archive/anim-fix-pass/after-af2/numbers.md`); as
  captured, before AF2, the jog was 12.2 (`.../before/numbers.md`). So moving `from` / `to` alone (the PLAN's words) would
  put the jog back to the capture's own 12.2 deg lean: it cannot meet the PLAN's own bar "jog within 1 deg of the walk".
- `POSTURE` (`src/anim/animGraph.ts:3536`, `runFrom 1.6`, `runTo 3.0`, `runLean 0.37`; read `:1472`, `:1479`, `:1481`,
  `:1751`): the procedural lean. Wren's holstered free gait takes its trunk from the keyed pose (characterRig
  `keyedTrunk` `:3147-3173`, slerp by `keyW`), so this lean is overwritten there; it also poses guards
  (`tests/guardPoseGolden.test.ts`: "Never re-capture") and is pinned by `tests/fixtures/anim-skeleton-identity.json`
  (`partner:moves` runs armed at 3.5 m/s). S5 does NOT change `POSTURE` (deviation from the PLAN's R25 wording, for the
  lead; say so in the report).
- Stride swell: the player's root speed swings +-2.5 % through a stride (`MOVEMENT.rootDip` 0.025,
  `src/config/movement.ts:51`; `src/anim/motion.ts:550`): the run at 4.0 m/s reads 3.9-4.1.

R19 (anim):
- Dead (removed in Step 2): the audit's sprint band. `src/anim/audit/limits.ts:121` `PELVIS_P2P.sprint 0.08`,
  `:124-128` `gaitBand` "6 sprint", `:149-158` `READY_ELBOW.sprint` / `readyElbowBand` `gear >= 6`. Proof no live path
  reaches them: they need gear 6; `GEARS.count` is 5 (`src/config/movement.ts:152`, `stand` has 5 speeds `:160`),
  `clampGear` caps every gear at 5 (`src/player/speedGears.ts:14-17`, `MAX_ROCKER_GEAR` 5 `:170`), `?gear=` takes 1-5
  only (`src/core/flags.ts:150`). The only gear-6 producer is `scripts/anim-audit.mjs` itself: its `stand6` rows call
  `c.gears.set(6)` (clamped to 5: they run the gear-5 run under the looser sprint band, and
  `pelvisJumpByGear('stand', hz)[5]` is `undefined` for them, `:1106`) and hold the `dash` action, which has no reader in
  free movement (its readers are `src/game/gameState.ts:1912` ladder / rope `sprintHeld`, `:2844` wall leave, `:2942`
  peek end; S6 deletes those; nothing binds `dash`).
- Kept (readers remain, list them in the report): the clip `src/anim/clips/mocap/sprint.ts` and `MOCAP_SET.sprint`
  (`mocap.ts:33`, `:182`): the Anim Studio lists every clip module (`src/anim/studio.ts:216` `import.meta.glob`;
  `src/anim/mocapSources.ts:64` row `mocap_sprint`, pinned by `tests/mocapSources.test.ts:58`), and
  `tests/mixamoLoco.test.ts:64` pins `S.sprint === MOCAP_SET.sprint`. The `speedSet` sprint branch
  (`animGraph.ts:2628-2637`) and `KEYED_GAITS.sprintFrom` (`:3396`): the Mixamo `fast_run` row hands its capture to that
  slot (`src/anim/mixamo.ts:273`), a remote copy poses from its measured pace (no 4.2 m/s cap), and
  `tests/nowPlaying.test.ts:92`, `:134` pin `MOVE_IDS.sprint` at 6.0 m/s. `MOCAP_RUN_POSE.pitchSprint` (characterRig reads
  the name). The graph's `dash` / `dashS` and `READY_HANDS` sprint fields (`animGraph.ts:537-551`, `:1207`, `:1751`): live
  for guards (`src/ai/enemy.ts:4179` sets `rp.dash`; the Studio's guard run `studio.ts:311`).

R30:
- `src/anim/audit/limits.ts:95-107` `MIN_DURATION`: `turn180: 0.25` `:98`, `raise: 0.2` `:102`, `takedown: 1.0` `:106`
  (read by nothing; S1 will read it for its takedown floor, keep the key).
- `scripts/anim-audit.mjs`: turn180 row `:1141-1150` (`':826'`), raise row `:1151-1155` (`col(rec, 'raise')`, the carry
  raise: the shoulder raise, which F6 starts during a long gun's draw, so it is not the draw), raise drive `:547-555`
  (ADS held 0.8 s: shorter than the rifle's 1.1 s draw). No takedown row. Draw times: `src/weapons/drawState.ts:25-26`
  `DRAW_TIME_SIDEARM 0.75`, `DRAW_TIME_PRIMARY 1.1`; `drawTimeFor(cls)` `:69-71` (`'pistol'`, else the rifle's); the
  phase `PlayerWeapons.drawPhase` getter (`src/weapons/playerWeapons.ts:377-379`; `DRAW_DRAWN` 2, `drawState.ts:11`).
- Takedown finish: `src/game/takedownController.ts:652-678` (`finish()` at `approach + strike`, `e.knockOut` `:793`:
  the victim's `alive` goes false). Setup to copy: `scripts/e2e-takedown.mjs` "ground" front case (a `passive` grunt
  facing the player 1.2 m ahead, 0.4 s settle, one `interact` tap).

R27 flag:
- AF2 corrections: `MOCAP_LAYERS` `pelHeight` / `trunkMean` / `bankWipe` / `armSmooth` = 0 (`mocap.ts:99-102`; 1 = as
  captured, "Undo" `:120`). The object is mutable and read every frame by the rig (`:2435`, `:3131-3132`, `:3291`,
  `:3790`); every Animation source's mocap set shares it (`MOCAP_SET.layers`).
- AF3 crouch re-pose of the capture: `animGraph.ts:3453` `MOCAP_CROUCH_POSE = { lean: -0.19, leanD: -0.19, drop: 0.05,
  back: 0.1, sway: 0.5 }`, used in `crouchSet` `:2497` (p0 when `mc !== null`) and `:2515` (`* MOCAP_CROUCH_POSE.sway`).
  Before AF3 (b5151f47a) it was `{ lean: 0, drop: 0 }` (no back) and the whole sway (`- mc.meanPel[0]` unscaled).
- Flag precedents: `fullbright` (`flags.ts:37-38`, `:152`); `mixamo.ts:20` already imports `flags` into `src/anim`.
- S8b records the option video with `scripts/look-video.mjs` (S8a) against the BUILT game (`vite preview` of `dist/`), so
  "dev only" here means a developer URL flag in every build (never a setting, never saved, not on the wire), not an
  `import.meta.env.DEV` gate (that would make the video impossible).

## Build
Commit 1 "J19 S5: no forward lean below 3.5 m/s, the run as before (R25, G217)", push:
1. Measure first (a throwaway script or test file, never committed; delete it, `git status` clean of it before `git add`):
   on the headless rig (`tests/helpers/afpMeasure.ts` `runGait`, `trunkPitch`, mode `'on'`): W = `trunkPitch(runGait(1.4,
   0).R).mean`; J0 = jog 3.0 trunk with today's values; J1 = jog 3.0 trunk with `pitch` set to 0.0 at run time (cast
   `MOCAP_RUN_POSE as unknown as Record<string, number>`, restore after). P = 0.26 x (W - J1) / (J0 - J1), rounded to
   0.01. P must lie in [-0.15, 0.20]; outside: `status: blocked` with W, J0, J1.
2. `src/anim/mocap.ts:122`: `pitch: P, pitchSprint: 0.26, pitchFrom: 3.5, pitchTo: 3.8`; every other field unchanged
   (`from 2.0`, `to 3.0` stay). Result: below 3.5 m/s the chest takes P (upright, the walk's trunk) on the run share; it
   rises linearly to 0.26 (the run's CT carriage, as today at 4.0) by 3.8 m/s and stays there; 3.8 sits under the run's
   4.0 m/s less its 2.5 % stride swell, so the run never leaves 0.26 (a ramp ending at 4.0 would wobble the chest about
   2 deg each stride). Above 4.0 the old rise to 0.32 is gone (no sprint, G31). The arm follower, pelvis height, bank
   and share timing are untouched (byte-identical below 2.0 m/s and everywhere outside the chest pitch).
3. The doc `:106-121`: replace the `pitch` / `pitchSprint` bullet with:
   `- \`pitch\` / \`pitchSprint\` (rad): the chest's forward pitch in place of the capture's mean on the run share:`
   `  \`pitch\` below \`pitchFrom\` m/s (J19 S5, R25, G217 "no lean until full speed": upright, the jog's trunk within 1 deg`
   `  of the walk's), \`pitchSprint\` from \`pitchTo\` on (the full run's CT carriage, run 10-20 deg; the name kept, characterRig`
   `  reads it: there is no sprint, G31), linear between. \`pitchTo\` 3.8 sits under the run's 4.0 m/s less its stride swell`
   `  (MOVEMENT.rootDip 2.5 %), so the full run never leaves it.`
   (wrapped at the file's 120 columns, `*` prefixed as the block).
4. `tests/mocapRunPose.test.ts`: imports `MOCAP_RUN_POSE` (with `MOCAP_LAYERS`) from `../src/anim/mocap`, `runGait` and
   `pelvisLateral` added to the `./helpers/afpMeasure` import, `MOVEMENT` from `../src/config/movement`. New
   `describe.skipIf(!!process.env.AFP_BEFORE)('(J19 S5, R25, G217) no forward lean below 3.5 m/s, the run as before', ...)`
   after the AF2 describe:
   - (a) `'the trunk at 2.1, 3.0 and 3.3 m/s within 1 deg of the walk, the 2.4 / 2.7 blend within 1.5'`: W =
     `trunkPitch((await gait(1.4, 0)).R).mean`; for v of [3.0, 3.3]: `Math.abs(mean - W) <= 1.0`; for v of [2.1, 2.4,
     2.7]: `mean - W <= 1.5`; log every row (`log(...)`, as the file does). Timeout 300000.
   - (b) `'the run at 4.0 m/s within 0.3 deg and 2 mm of the pre-S5 carriage'`: new = `trunkPitch((await gait(4,
     0)).R)`; old = the same through `runGait(4, 0)` called directly (not the cache) with `{ from: 2.0, to: 3.0, pitch:
     0.26, pitchSprint: 0.32, pitchFrom: 4.0, pitchTo: 5.0 }` assigned at run time and restored in `finally`;
     `Math.abs(new.mean - old.mean) <= 0.3`, `Math.abs(new.hipY - old.hipY) <= 0.002`.
   - (c) `'a start to the run and a hard stop from it: no bone step over max(25, OFF + 1)'`: `runGait(0, 0, { warm: 0.5,
     sec: 3.5, target: (t) => ({ v: t < 1 ? 0 : 4, yr: 0 }) })` and the stop `target: (t) => ({ v: t < 2.5 ? 4 : 0, yr: 0
     })`, each `'on'` and `'off'`; `pops(on.R).maxStepDeg <= Math.max(25, pops(off.R).maxStepDeg + 1)`; log both.
   - (d) `'the carriage numbers'`: `MOCAP_RUN_POSE.pitchFrom >= 3.5`; `MOCAP_RUN_POSE.pitchTo <= 4.0 * (1 -
     MOVEMENT.rootDip)`; `MOCAP_RUN_POSE.pitchSprint === 0.26`; `MOCAP_RUN_POSE.from === 2.0` (or 2.0 / 2.6 after the
     fallback below).
   - Fallback, only if (a)'s 2.4 or 2.7 row fails while 3.0 / 3.3 pass (the jog clip's own lean showing before the share
     is full): set `to: 2.6` (`from` stays 2.0; the share then leads the walk-to-jog clip blend), change (d) to `to ===
     2.6`, re-run; still failing: `status: blocked` with the rows. Name the fallback in the report.
   - The existing AF2 tests stay as they are (the sprint trunk only drops; the 2.0-2.6 and 4.2-5.0 blends keep a constant
     pitch).

Commit 2 "J19 S5: the audit's sprint band and gear 6 rows go; bible turn, draw and takedown minimums (R19 anim, R30)",
push:
5. `src/anim/audit/limits.ts`:
   - `:20` doc: `per gear 1..5 (index 0 = gear 1; GEARS.count: there is no gear 6, J19 S5)`.
   - `:94` `/** :822-832 - minimum action durations (s) (bible 5.12.2 item 6). */`.
   - `MIN_DURATION`: `turn180: 0.4,` with the line above it `/** :824 flick turn (G33; J19 S5 R30: was 0.25). */`;
     delete `raise: 0.2,` and put in its place
     `/** :828 weapon raise = the draw (G243, A14): pistol, every other class the rifle's (drawState.ts drawTimeFor). */`
     `raisePistol: 0.75,` `raiseRifle: 1.1,`; above `takedown: 1.0,` the line
     `/** :832 press to the victim down (approach + strike, 5.4): the anim-audit takedown row (J19 S5 R30). */`.
     Other keys unchanged.
   - After `MIN_DURATION`, a new export:
     `/** (J19 S5, R30, A14) The draw's minimum for a weapon class, split as drawState.ts drawTimeFor: 'pistol', else the rifle's. */`
     `export function raiseMin(cls: string): number { return cls === 'pistol' ? MIN_DURATION.raisePistol : MIN_DURATION.raiseRifle; }`
     (formatted over lines as the file does).
   - `:121` `PELVIS_P2P = { crouch: 0.025, walk: 0.04, run: 0.06 } as const;`.
   - `:124-128` doc `/** D2 gear mapping (A7): stand 1-3 walk, 4-5 run; crouch 1-5 crouch (J19 S5: no gear 6, no sprint band, G31). */`;
     body `return gear <= 3 ? 'walk' : 'run';` after the crouch line.
   - `:149-158`: the doc drops "pumping at the sprint (A76)" (the sentence ends "softly bent crouched (never straight:
     PC1 measured 5.1)."); `READY_ELBOW = { stand: { min: 8, max: 30 }, crouch: { min: 15, max: 50 } } as const;`;
     `export function readyElbowBand(stance: string): { min: number; max: number } { return stance === 'crouch' ?
     READY_ELBOW.crouch : READY_ELBOW.stand; }` (formatted as the file does).
6. `scripts/anim-audit.mjs` (master lines):
   - `:25` `--quick   flat only, stand 2 / 4 / 5 and crouch 3 at 60 and 120 Hz, plus stop / idle (< 60 s; steps 21-31)`.
   - `:128` `names.push('raise', 'drawPh', 'swapping', 'traverse', 'attached', 'ladderS', 'tgt');`.
   - `:296` after `f[o++] = p.carry.raise;` add `f[o++] = g.weapons?.drawPhase ?? NaN; // (J19 S5) the draw phase (2 drawn), the raise row's end`.
   - `:1733` after `f[o++] = NaN; // raise (the copy has no carry clock)` add `f[o++] = NaN; // drawPh (the copy has no draw state)`.
   - `run()` `:365-367`: delete the two comment lines and `st.set('anim-audit', 'dash', !!inp.sprint);`; `:373` delete
     `if (!inp.sprint) st.set('anim-audit', 'dash', false);`; `reset()` `:402` delete `st.set('anim-audit', 'dash', false);`.
   - `:460` QUICK list `[['stand', 2], ['stand', 4], ['stand', 5], ['crouch', 3]]`; `:462` comment
     `// (J19 S5, G31) five gears standing and crouched (GEARS.count): the old stand6 rows ran the gear-5 run under a sprint band`;
     `:463` and `:464` loop bound `g <= 5` (both stances); `:466` list `[['stand', 2], ['stand', 4], ['stand', 5], ['crouch', 2]]`.
   - Takedown rows: after `:480` add `const takedowns = [];` and
     `if (!QUICK) for (const hz of [60, 120]) takedowns.push({ name: 'takedown', kind: 'takedown', hz });` with the comment
     `// (J19 S5, R30) last: the guard it spawns never shares the page with an earlier row`; `:481` becomes
     `const scenarios = [...gaits, ...transitions, ...aimGaits, ...takedowns].filter((s) => !ONLY || s.name.includes(ONLY));`.
   - `drive()` `:495` cap arrays `[0.85, 1.3, 1.7, 2.15, 2.6]` and `[0.65, 1.1, 1.65, 2.3, 3.15]` (the 6th entries go;
     the other values stay, see Report); `:515-519` delete the comment and `const sprint`, the two runs become
     `t.run(accel, { y: 1, ads }, hz);` and `t.run(steady, { y: 1, ads }, hz);`.
   - `drive()` raise `:547-555`: after `t.tp(-26, -26, 0);` add `m.cls = g.weapons?.current?.def?.class ?? 'rifle';`;
     `t.run(0.8, { ads: true }, hz);` becomes `t.run(2.0, { ads: true }, hz);` with the comment
     `// (J19 S5) held past the rifle's 1.1 s draw (drawState.ts)`.
   - `drive()`: a new branch after the `tunnel` branch (before `return m;`):
     ```js
     } else if (sc.kind === 'takedown') {
       // (J19 S5, R30, bible 5.12.2 item 6 / 5.4) a front knockout on a calm grunt 1.2 m ahead (as e2e-takedown's "front"):
       // from the frame before the interact tap until the victim is down (`alive` false), stepped one sim step at a time
       const em = g.enemyMgr;
       em.clear();
       t.stance(false, 3);
       t.tp(-26, -26, 0);
       const e = em.spawn('grunt', new g.player.position.constructor(-26, 0, -24.8), false, Math.PI);
       e.passive = true;
       t.run(0.4, {}, hz);
       m.offer = g.takedown.offer?.plan.kind ?? 'none';
       t.begin(halt);
       t.run(0.3, {}, hz);
       m.press = t.mark();
       t.run(1 / 60, { taps: { 1: 'interact' } }, hz);
       for (let k = 0; k < 180 && e.alive && !t.halted(); k++) t.run(1 / 60, {}, hz);
       m.down = e.alive ? -1 : t.mark();
       t.run(1.0, {}, hz);
       m.end = t.mark();
       g.takedown.reset();
       em.clear();
     }
     ```
   - `:1034` comment: `the sprint framing` becomes `the run framing`.
   - `analyze()` `:1116` `const eb = L.readyElbowBand(sc.stance);`.
   - `analyze()` `:1133` the moving list gains `'takedown'`: `['turn180', 'vault', 'mantle', 'drop09', 'drop24', 'ladder', 'wall', 'takedown']`.
   - `:1150` the turn row's line `':826'` becomes `':824'` (the limit reads `L.MIN_DURATION.turn180`, now 0.4).
   - `:1151-1154` (up to, not including, `} else if (sc.kind === 'swap') {`) the raise row becomes:
     ```js
     } else if (sc.kind === 'raise') {
       // (J19 S5, R30, A14: the bible's "Weapon raise" is the draw, G243) from the last frame before the ADS press until the
       // draw state reads drawn (DRAW_DRAWN 2, a sim-rate signal), against the class's minimum (pistol 0.75, rifle 1.1 s)
       const lim = L.raiseMin(m.cls ?? 'rifle');
       const d = col(rec, 'drawPh');
       res(out, 'raiseTime', { ...M.reachTime(d.slice(0, m.lower), m.raise - 1, dt, lim, 2, 0, 1 / 60), extra: { cls: m.cls ?? null } }, lim, ':828', 's');
     ```
   - `analyze()`: a new branch after the strike branch:
     ```js
     } else if (sc.kind === 'takedown') {
       // (J19 S5, R30) press to the victim down >= MIN_DURATION.takedown (1.0 s); never down in 3 s: a fail at the run's end
       const down = m.down >= 0;
       const td = ((down ? m.down : rec.n) - m.press) * dt;
       res(out, 'takedownTime', { worst: td, frame: down ? m.down - 1 : -1, pass: down && td >= L.MIN_DURATION.takedown - 1e-9, extra: { offer: m.offer, down } }, L.MIN_DURATION.takedown, ':832', 's');
     ```
   - `remoteScenarios()` `:1276` flat list `[['stand', 2], ['stand', 4], ['stand', 5], ['crouch', 3]]`.
   - `remoteSegments()` `:1305` cap arrays as `:495`; `:1315-1317`: delete the comment and `const sprint`; return
     `[{ d: 0.3 }, { d: accel, y: 1 }, { d: steady, y: 1 }, { d: sc.idleTail ? 1.5 : 1.2 }]`.
   - B's input loop: `:1849` delete `st.set('anim-audit', 'dash', false);`; `:1861` delete `st.set('anim-audit', 'dash', !!s.sprint);`.
   - `:1943` comment `(stand 6 covers about 11 m)` becomes `(stand 5 covers about 11 m)`.
   - `:2107` cap arrays as `:495`.
   - Nothing else in the file. `node --check scripts/anim-audit.mjs` must pass. A `\bsprint\b` (any case) or `'dash'`
     left anywhere in the file: remove it (Step 7's test fails on it).
7. `tests/animAudit.test.ts`:
   - `:30-33` 'D2 gait bands (A7)': keep the 1-5 line; `L.gaitBand('crouch', 6)` becomes `L.gaitBand('crouch', 5)`; add
     `expect(Object.keys(L.PELVIS_P2P)).toEqual(['crouch', 'walk', 'run']);`.
   - `:284` `L.MIN_DURATION.raise` becomes `L.MIN_DURATION.raisePistol` (the `worst` 0.2 expectation unchanged).
   - `:473-482`: comment `// M14: relaxed at the sides standing (8-30), softly bent crouched (15-50)`;
     `L.readyElbowBand('stand')`, `L.readyElbowBand('crouch')` (twice); delete the `('stand', 6)` sprint line; add
     `expect(Object.keys(L.READY_ELBOW)).toEqual(['stand', 'crouch']);`.
   - New `it('(J19 S5, R30) bible 5.12.2 item 6: the flick turn, the draw per class and the takedown')` in the limits
     describe: `L.MIN_DURATION.turn180` is 0.4; `L.raiseMin('pistol')` is 0.75 and equals `DRAW_TIME_SIDEARM`;
     `L.raiseMin('rifle')` and `L.raiseMin('smg')` are 1.1 and equal `DRAW_TIME_PRIMARY`; `L.MIN_DURATION.takedown` is
     1.0; `'raise' in L.MIN_DURATION` is false. Import `DRAW_TIME_PRIMARY`, `DRAW_TIME_SIDEARM` from
     `../src/weapons/drawState`.
   - New `it('(J19 S5, R19 / R30) anim-audit: no gear 6, sprint or dash rows; the takedown row; the draw row per class')`:
     `const src = readFileSync('scripts/anim-audit.mjs', 'utf8')` (`node:fs`); `src` does not match `/\bsprint\b/i`,
     `/'dash'/`, `/\['stand', 6\]/`, `/MIN_DURATION\.raise\b/`; matches `/kind: 'takedown'/`,
     `/L\.MIN_DURATION\.takedown/`, `/L\.raiseMin\(/`, `/'drawPh'/`.

Commit 3 "J19 S5: ?mocapraw=1 shows the capture as recorded, for the Q37 video (R27 compare, dev only)", push:
8. `src/core/flags.ts`: after `:38` (`fullbright: boolean;`):
   ```ts
     /** (J19 S5, R26 / R27, Q37; owner Night Shift | Player Build) Dev compare only (`?mocapraw=1`): the motion capture as
      *  recorded (the AF2 MOCAP_LAYERS corrections pelHeight / trunkMean / bankWipe / armSmooth at 1, the AF3 crouch walk
      *  re-pose off; `src/anim/mocap.ts` setMocapRaw) for the option video. A URL flag in every build (the video records
      *  the built game), never a setting, never saved, not on the wire. DEFAULT OFF; never switched on: removed with the
      *  option Michael picks at the Q37 walk, 2026-10-29. */
     mocapRaw: boolean;
   ```
   after `:152` (`fullbright: ...`): `mocapRaw: params.get('mocapraw') === '1',`.
9. `src/anim/mocap.ts`: after `:36` `import { flags } from '../core/flags'; // (J19 S5) ?mocapraw=1`. After `:125`
   (`void _LAYERS_FIT;`), before the `LocoClipSet` doc:
   ```ts
   /**
    * (J19 S5, R26 / R27, Q37) The capture as recorded, for the option video only (`?mocapraw=1`, `flags.mocapRaw`; dev
    * compare, default off, owner Night Shift | Player Build; removed at the Q37 walk 2026-10-29 with the option Michael
    * picks): the AF2 corrections off (MOCAP_LAYERS pelHeight / trunkMean / bankWipe / armSmooth at 1, as captured: the
    * R25 chest pitch goes with trunkMean) and the AF3 crouch walk re-pose off (animGraph `crouchSet`: no lean, drop or
    * hips-back, the whole sway). Every source's mocap set shares MOCAP_LAYERS. `on` is read by the graph every frame.
    */
   export const MOCAP_RAW = { on: false };
   /** The four AF2 corrections as shipped (read once, at load), put back when the compare goes off. */
   const AF2_SHIPPED = { pelHeight: MOCAP_LAYERS.pelHeight, trunkMean: MOCAP_LAYERS.trunkMean, bankWipe: MOCAP_LAYERS.bankWipe, armSmooth: MOCAP_LAYERS.armSmooth };
   /** (J19 S5) The `?mocapraw=1` compare on / off (at load from the flag; tests). Once per change, never per frame. */
   export function setMocapRaw(on: boolean): void {
     MOCAP_RAW.on = on;
     MOCAP_LAYERS.pelHeight = on ? 1 : AF2_SHIPPED.pelHeight;
     MOCAP_LAYERS.trunkMean = on ? 1 : AF2_SHIPPED.trunkMean;
     MOCAP_LAYERS.bankWipe = on ? 1 : AF2_SHIPPED.bankWipe;
     MOCAP_LAYERS.armSmooth = on ? 1 : AF2_SHIPPED.armSmooth;
   }
   if (flags.mocapRaw) setMocapRaw(true);
   ```
   (`AF2_SHIPPED` wrapped as the file wraps.) Nothing else bypassed: the other 15 layers (0 already means "off the
   capture", the two limiters and `turnStep` stay), AF1's clip-feet rules, AF3's step line (`motion.ts`) and the
   hand-keyed `KEYED_CROUCH_POSE` stay as shipped.
10. `src/anim/animGraph.ts` (exactly these, nothing else):
    - After `:71` (`import { BodyRecoil, RECOIL_SIGHT_ARM } from './recoil';`) a new line:
      `import { MOCAP_RAW } from './mocap'; // (J19 S5) ?mocapraw=1: the crouch walk capture as recorded (own line: #498 rewrites :48)`.
    - After `:3453` (`const MOCAP_CROUCH_POSE = ...`):
      ```ts
      /** (J19 S5, R27, `?mocapraw=1` only: MOCAP_RAW) The mocap crouch walk as captured, as before AF3: no lean, drop or
       *  hips-back, the whole lateral sway (the Q37 option video; removed with the flag). */
      const MOCAP_CROUCH_RAW = { lean: 0, leanD: 0, drop: 0, back: 0, sway: 1 } as const;
      ```
    - `crouchSet`: after `:2496` (`const P = KEYED_CROUCH_POSE;`) add
      `const mcp: { lean: number; leanD: number; drop: number; back: number; sway: number } = MOCAP_RAW.on ? MOCAP_CROUCH_RAW : MOCAP_CROUCH_POSE;`;
      `:2497` `... = mc !== null ? mcp : P.sneak;`; `:2515` `* MOCAP_CROUCH_POSE.sway` becomes `* mcp.sway`.
    Off, the same objects and numbers as today (byte-identical); a property read a frame, no allocation, no closure.
11. `tests/mocapRunPose.test.ts`: import `MOCAP_RAW`, `setMocapRaw` from `../src/anim/mocap`, `flags` from
    `../src/core/flags`, `afterEach` from `vitest`. New `describe.skipIf(!!process.env.AFP_BEFORE)('(J19 S5, R27) ?mocapraw=1: the capture as recorded', ...)`
    with `afterEach(() => setMocapRaw(false))`:
    - `'off by default: the AF2 corrections on'`: `flags.mocapRaw` false; `MOCAP_RAW.on` false; `[MOCAP_LAYERS.pelHeight,
      MOCAP_LAYERS.trunkMean, MOCAP_LAYERS.bankWipe, MOCAP_LAYERS.armSmooth]` toEqual `[0, 0, 0, 0]`.
    - `'setMocapRaw: the four AF2 layers at 1, the rest untouched; off restores every entry'`: `before = { ...MOCAP_LAYERS }`;
      on: `MOCAP_RAW.on` true and `MOCAP_LAYERS` toEqual `{ ...before, pelHeight: 1, trunkMean: 1, bankWipe: 1, armSmooth: 1 }`;
      off: `MOCAP_LAYERS` toEqual `before`, `MOCAP_RAW.on` false.
    - `'headless: the run as captured, the crouch walk not re-posed'` (timeout 600000): default `run = (await gait(4,
      0)).R`, `crouch = (await runGait(0.85, 0, { crouch: true })).R`; then `setMocapRaw(true)` and, uncached,
      `rawRun = (await runGait(4, 0)).R`, `rawCrouch = (await runGait(0.85, 0, { crouch: true })).R`, `setMocapRaw(false)`
      in `finally`. Assert `Math.abs(pelvisRollMean(rawRun)) >= Math.abs(pelvisRollMean(run)) + 2` (as captured -4.6 deg
      vs |x| <= 1); `trunkPitch(rawRun).hipY <= trunkPitch(run).hipY - 0.04`; `wristJerk(rawRun).max >
      wristJerk(run).max`; `trunkPitch(rawCrouch).mean >= trunkPitch(crouch).mean + 6` (AF3 lean -0.19 rad off);
      `pelvisLateral(rawCrouch).p2p >= 1.5 * pelvisLateral(crouch).p2p` (sway 0.5 off). Log all six numbers.
12. `tests/mocapGuards.test.ts`: import `setMocapRaw` from `../src/anim/mocap`. New `it('(J19 S5) ?mocapraw=1 leaves a guard bit-identical, switch on')`
    in the describe (timeout 600000): for kind of `['grunt', 'heavy']`, for the scenarios `'jog 3.0 then stop'`,
    `'run 5.0 then stop'` (from `SCENARIOS`) and a crouched sneak `[(_k, p) => { facing(p, 0.85); p.crouch = 1; return 0; }, 180]`:
    `base = await drive(kind, sc, n, 'on')`; `setMocapRaw(true)`; `raw = await drive(kind, sc, n, 'on')` with
    `setMocapRaw(false)` in `finally`; `raw.vals.length` toBe `base.vals.length`; `diff(base.vals, raw.vals).n` toBe 0.

Commit 4 "J19 S5: changelog fragment", push:
13. `changes/feature-player-j19-s5.md`:
    ```
    # No forward lean below a full run; the animation audit holds the bible's minimums
    kind: minor
    - The operator no longer leans forward at a jog: the forward lean comes in only near the full run (3.5-3.8 m/s), and
      the run itself looks as before.
    - The animation audit holds the bible's minimums: a 0.4 s flick turn, 0.75 s pistol and 1.1 s rifle draws, and a new
      takedown row of at least 1 s; its old sprint rows are gone.
    - Developers: `?mocapraw=1` shows the motion capture as recorded, without the corrections, for comparison videos.
    ```
    (If Step 4's fallback ran, the first bullet still holds.)

No hot-path allocation anywhere: no new per-frame object, closure, iterator or temporary vector in `src`; any distance in
new `src` code uses `hyp2` / `hyp3` (none is expected). Comments in the file's own style, "(J19 S5 ...)" tags.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server, no anim-audit run; every command with a timeout of at most 600000 ms)
- `npm run typecheck:fast`
- `npx eslint src/anim/mocap.ts src/anim/animGraph.ts src/anim/audit/limits.ts scripts/anim-audit.mjs src/core/flags.ts tests/animAudit.test.ts tests/mocapRunPose.test.ts tests/mocapGuards.test.ts`
- `node --check scripts/anim-audit.mjs`
- vitest, in these batches (add `--maxWorkers=2` on a small box):
  - `npx vitest run tests/animAudit.test.ts tests/e2eAffected.test.ts tests/changesFragments.test.ts`
  - `npx vitest run tests/mocapRunPose.test.ts`
  - `npx vitest run tests/mocapGuards.test.ts tests/animSkeletonGuardIdentity.test.ts tests/guardPoseGolden.test.ts`
  - `npx vitest run tests/mocapSprint.test.ts tests/mocapRunFeet.test.ts tests/mocapCrouch.test.ts tests/crouchStrafe.test.ts tests/mocapPlayer.test.ts`
  - `npx vitest run tests/mocapSwitch.test.ts tests/mocapDefault.test.ts tests/mixamoSwitch.test.ts tests/mixamoLoco.test.ts tests/mocapSources.test.ts tests/nowPlaying.test.ts tests/animSkeletonIdentity.test.ts tests/bodyMotion.test.ts tests/animStudio.test.ts tests/animFixPass.test.ts`
  Run Commit 1's file after Commit 1, the first batch after Commit 2, all batches after Commit 3.
- A failing file you did not touch: re-run it once on the base sha; failing there too: list it as pre-existing and go
  on. Failing only on the branch: fix within this brief's files and steps, else `status: blocked` with the numbers.
- Pending PC run (the lead runs them on the laptop queue; write each as "pending PC run" in the report): `anim-audit`
  (full, local + remote, `--compare` against `docs/archive/locomotion/audit/anim-baseline.json`; expect new fails reported,
  limits kept per A14: `turn180Time` at ~0.25 s vs 0.4, `takedownTime` at ~0.92 s vs 1.0 until S1, any `raiseTime`
  under its class minimum), `e2e-anim`, `e2e-clip`, `e2e-weapons-carry`, `e2e-move`, `e2e-takedown`, `e2e-park` + CORE
  (`e2e-combat`), and the requested `e2e-coop` + `e2e-netmove`. Look video (S8a's `scripts/look-video.mjs`): walk, jog,
  run side views at each gear, master vs this branch; and one jog / run / crouch-walk pass with `?mocapraw=1`.

## Done when
- `git diff --stat 29f03b6c004bf8dae66eea9c434160b6b1db061c` lists only the nine edited files above.
- `git diff 29f03b6c004bf8dae66eea9c434160b6b1db061c -- src/anim/animGraph.ts` has exactly Step 10's hunks (one import
  line after `:71`, the `crouchSet` lines, the `MOCAP_CROUCH_RAW` const); `src/player/characterRig.ts` unchanged.
- `git merge-tree --write-tree --name-only origin/feature/mixamo-source-wire HEAD` and the same with
  `origin/feature/mixamo-on` exit 0 with no conflicted file (re-run on their current heads; a conflict: `status: blocked`
  with the hunk).
- tsc, eslint and `node --check` clean; every vitest file above passes.
- Four commits, each with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, pushed to
  `origin feature/player-j19-s5`.
- Then append `## Report` below and set line 1 to `status: done feature/player-j19-s5 <sha>`; commit, push `cloud-queue`
  (rebase on reject).
- Anything not settled here is `status: blocked <one-line reason>`, evidence under `## Report`, push, move on. The lead
  answers by editing this brief.

## Report spec (from the lead)
- Branch, the four commit shas.
- R25: W, J0, J1 and the chosen P; every row of Step 4 (a)-(c) with its number; whether the `to: 2.6` fallback ran.
- What changed, file:line per Step item.
- Tests: names and pass counts per file; tsc / eslint / node --check results; any pre-existing failure with its base-sha
  run.
- Kept sprint code and its readers (as listed under R19 "Kept"), and the deviation: `POSTURE.runFrom / runTo` unchanged
  (reason above; the lead decides a follow-up).
- Polish list (not fixed): the audit's gear caps (`scripts/anim-audit.mjs:495`, `:1305`, `:2107`: 0.65 / 1.1 / 1.65 / 2.3
  / 3.15 standing) are not `GEARS.stand` (0.75 / 1.4 / 2.1 / 3.0 / 4.0, exported as `L.GEAR_CAPS`), so `rootOvershoot`
  reads every standing gear against too low a cap; the other `MIN_DURATION` bible line tags (`:824`-`:831` in the
  audit) are two lines off the bible's table; `tests/animFixPass.test.ts` writes `docs/anim-fix-pass/before/numbers.md`
  (the folder moved to `docs/archive/`).
- Deviations from this brief, each with the reason.
- Pending PC run: the suites, anim-audit and look video listed under Run.

## Report (Night Shift | Cloud Builder 1, 2026-10-26)
Branch `feature/player-j19-s5` from 29f03b6c0, pushed, head `6a5cc40076aa93b9a0314c27b22f7ea8cd9d6a50`. Built in full;
the Step 4 fallback (`to: 2.6`) ran and one dictated anim-audit comment was reworded (Deviations).

### Commits
1. 65d4bc848 no forward lean below 3.5 m/s, the run as before (R25, G217)
2. 1723aee56 the audit's sprint band and gear 6 rows go; bible turn, draw and takedown minimums (R19 anim, R30)
3. 75c62ad0a `?mocapraw=1` shows the capture as recorded, for the Q37 video (R27 compare, dev only)
4. 6a5cc4007 changelog fragment

### R25 numbers (headless rig, mode 'on', 60 Hz)
- Measured (throwaway test, not committed): W = 3.710, J0 = 13.677, J1 = 3.132 deg. P = 0.26 x (W - J1) / (J0 - J1)
  = 0.0143, rounded to 0.01 (inside [-0.15, 0.20]).
- Fallback ran: with `to` 3.0, row (a) at 2.4 m/s was 6.16 deg (+2.45 over the walk, bar 1.5) while 3.0 and 3.3 passed.
  With `to: 2.6` all rows pass; (d) checks `to === 2.6`.
- (a) walk 3.71 deg; trunk vs walk: 2.1 m/s 3.54 (-0.17), 2.4 3.66 (-0.05), 2.7 3.41 (-0.30), 3.0 3.42 (-0.29),
  3.3 3.52 (-0.19).
- (b) run at 4.0 m/s: trunk 14.78 deg (pre-S5 14.78), hipY 86.34 cm (pre-S5 86.34).
- (c) start 0 to 4: worst bone step 24.6 deg (OFF 24.4); hard stop 4 to 0: 19.8 deg (OFF 31.6).
- AF2 rows: run trunk 14.8; the 5.0 m/s ("sprint") trunk 19.9 (was 22.5); every other AF2 row unchanged and passes.
- R27 `?mocapraw=1` vs default: run pelvis roll mean -0.07 -> -4.64 deg; run hipY 86.3 -> 75.1 cm; run wrist jerk max
  1.44 -> 2.06 cm; crouch walk trunk 32.2 -> 43.1 deg; crouch walk sway 4.2 -> 8.4 cm p2p.

### What changed, per step
- Steps 2-3 `src/anim/mocap.ts`: :126 `MOCAP_RUN_POSE` `to: 2.6, pitch: 0.01, pitchSprint: 0.26, pitchFrom: 3.5,
  pitchTo: 3.8` (rest unchanged); :115-119 the `pitch` / `pitchSprint` doc bullet replaced with the brief's text.
- Step 4 `tests/mocapRunPose.test.ts`: imports :12-18; R25 describe :132-182, tests (a)-(d).
- Step 5 `src/anim/audit/limits.ts`: docs :20, :94; `MIN_DURATION` :95-111 (`turn180` 0.4 :99; `raisePistol` 0.75 and
  `raiseRifle` 1.1 :104-105 replace `raise`; takedown comment :109); `raiseMin` :113-116; `PELVIS_P2P` :130 (no sprint
  entry); `gaitBand` doc and body :133-137; `READY_ELBOW` and `readyElbowBand(stance)` :160-167.
- Step 6 `scripts/anim-audit.mjs`: :25 `--quick` help; :128 `drawPh` column; :297 local `drawPh`; :1759 remote
  `drawPh` NaN; `dash` writes removed from `run()`, `reset()` and B's input loop; :455-461 gear lists and loops capped
  at gear 5; :477-480 takedown scenarios added to `scenarios`; gear cap arrays 5 entries at :494, :1332, :2131; the
  `sprint` input gone from `drive()` and `remoteSegments()`; raise drive :546 `m.cls`, :551 `t.run(2.0, ...)`;
  :693-713 takedown drive branch; :1054 "run framing" comment; :1136 `readyElbowBand(sc.stance)`; :1153 moving list
  gains `takedown`; :1170 turn row tagged `':824'`; :1172-1177 raise row reads `drawPh` against `L.raiseMin`;
  :1203-1207 `takedownTime` analysis; :1296 remote flat list; :1967 "stand 5" comment.
- Step 7 `tests/animAudit.test.ts`: imports :1, :5; gait bands :31-34; two new tests :37-58; `raisePistol` line;
  `READY_ELBOW` block (sprint line removed, keys check added).
- Step 8 `src/core/flags.ts`: interface entry with doc :39-44; :159 `mocapRaw: params.get('mocapraw') === '1'`.
- Step 9 `src/anim/mocap.ts`: :37 `flags` import; :131-154 `MOCAP_RAW`, `AF2_SHIPPED`, `setMocapRaw`, load-time switch.
- Step 10 `src/anim/animGraph.ts`, the three hunks: :72 import; `crouchSet` :2498 `mcp`, :2499 `p0`, :2517
  `* mcp.sway`; :3456-3458 `MOCAP_CROUCH_RAW`.
- Step 11 `tests/mocapRunPose.test.ts` :184-229, R27 describe, three tests.
- Step 12 `tests/mocapGuards.test.ts`: import :12; new test :149-170.
- Step 13 `changes/feature-player-j19-s5.md`, text as given (its first bullet still holds after the fallback).

### Checks
- `npm run typecheck:fast` clean; eslint 0 errors on the eight listed files (only warning: `scripts/anim-audit.mjs` is
  on the repo's eslint ignore list); `node --check scripts/anim-audit.mjs` OK.
- `git diff --stat 29f03b6c0` lists only the nine files; `src/player/characterRig.ts` unchanged.
- `git merge-tree --write-tree --name-only` clean against origin/feature/mixamo-source-wire df214492f,
  origin/feature/mixamo-on e39da5fd9 and origin/master 99fbd37fd.
- vitest, all 22 listed files in one run: 233 passed, 0 failed, 7 skipped (existing gated tests: fixture captures,
  report-only measures, the mid-move switch case). animAudit 29, e2eAffected 31, changesFragments 1, mocapRunPose 11,
  mocapGuards 6, animSkeletonGuardIdentity 1 (+1 skip), guardPoseGolden 1 (+1), mocapSprint 10, mocapRunFeet 6 (+1),
  mocapCrouch 7, crouchStrafe 16, mocapPlayer 10 (+1), mocapSwitch 13, mocapDefault 6, mixamoSwitch 10, mixamoLoco 16,
  mocapSources 5, nowPlaying 21, animSkeletonIdentity 1 (+1), bodyMotion 13 (+1), animStudio 19, animFixPass 0 (+1).
  No pre-existing failures.

### Sprint code kept, with its readers
- `src/anim/clips/mocap/sprint.ts` and `MOCAP_SET.sprint`: the Studio's `import.meta.glob` (`studio.ts:216`); the
  `mocap_sprint` row (`mocapSources.ts:64`, pinned by `tests/mocapSources.test.ts:58`); `tests/mixamoLoco.test.ts:64`.
- The `speedSet` sprint branch and `KEYED_GAITS.sprintFrom`: Mixamo `fast_run` row (`mixamo.ts:273`); a remote posed
  from its measured pace; `tests/nowPlaying.test.ts:92`, `:134` (`MOVE_IDS.sprint` at 6.0 m/s).
- `MOCAP_RUN_POSE.pitchSprint`: characterRig reads the name.
- The graph's `dash` / `dashS` and the `READY_HANDS` sprint fields: live for guards (`enemy.ts:4179`, the Studio's
  guard run `studio.ts:311`).

### Deviations
1. `POSTURE.runFrom` / `runTo` / `runLean` unchanged (the brief's own deviation from PLAN R25): on Wren's holstered
   free gait the keyed trunk overwrites that lean, and changing it would move the guard golden and identity fixtures.
   Lead decides any follow-up.
2. Step 4 fallback ran: `to` is 2.6, not 3.0; test (d) checks `to === 2.6`.
3. One anim-audit comment reworded: the brief's Step 6 comment ended "...ran the gear-5 run under a sprint band", but
   the Step 7 test forbids `\bsprint\b` in the file. It now ends "...under the old gear-6 band" (`anim-audit.mjs:458`).
4. Import timing only: `pelvisLateral` added to the `tests/mocapRunPose.test.ts` import in commit 3 (first use), not
   commit 1 (`noUnusedLocals`). The final file is as specified.

### Polish list (not fixed)
- The audit's gear caps (`anim-audit.mjs:494`, `:1332`, `:2131`; standing 0.65 / 1.1 / 1.65 / 2.3 / 3.15) are not
  `GEARS.stand` (0.75 / 1.4 / 2.1 / 3.0 / 4.0, exported as `L.GEAR_CAPS`), so `rootOvershoot` reads every standing gear
  against too low a cap.
- The other `MIN_DURATION` bible line tags in the audit (`:824`-`:831`) are two lines off the bible's table.
- `tests/animFixPass.test.ts` writes `docs/anim-fix-pass/before/numbers.md`; that folder moved to `docs/archive/`.

### Pending PC run
- anim-audit full, local and remote, `--compare` against `docs/archive/locomotion/audit/anim-baseline.json`. Expected new
  fails, limits stay per A14: `turn180Time` ~0.25 s vs 0.4, `takedownTime` ~0.92 s vs 1.0 until S1, any `raiseTime`
  under its class minimum. The `stand6` rows are gone, so the compare shows them missing.
- e2e: `e2e-anim`, `e2e-clip`, `e2e-weapons-carry`, `e2e-move`, `e2e-takedown`, `e2e-park` plus CORE (`e2e-combat`),
  and the requested `e2e-coop` and `e2e-netmove`.
- Look video (`scripts/look-video.mjs`): walk, jog and run side views at each gear, master vs this branch; one jog / run
  / crouch-walk pass with `?mocapraw=1`.
