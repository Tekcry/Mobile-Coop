# T1-SHADOW: a guard whose shadow can fall in the view counts as seen (guard-cap T1 follow-up)

Builder: Opus. Self-contained: you need nothing from the conversation that wrote this.
Decision: Michael, 2026-10-25 ~08:50, "Yes, shadow in view = seen". This replaces the A183 hold.

## Why
- PR #360 raises the off-screen anim tier from every 4th frame to every 8th frame (`ANIM_TIER_OFFSCREEN` 4 -> 8,
  `src/ai/animTier.ts:28`).
- Both checkers found that "seen" counts only the camera pass:
  - `src/ai/animTierView.ts:30` compares `mesh._renderId` with the camera's render id;
  - `:38` hooks `onAfterActiveMeshesEvaluationObservable`.
  So a guard just outside the frustum whose lamp, moon or torch shadow is in view animates at 7.5 Hz (3.75 Hz at 30 fps),
  and his shadow's feet slide.
- Evidence: `docs/guard-ai/slices/T1-CHECK-A.md` and `T1-CHECK-B.md` on the T1 branch.
- GPU look run: `scripts/t1-shadow-look.mjs` at 2956d8a0, output `C:/NightShift/scratch/t1-shadow-look/2956d8a0/run.json`.
  The ankle-shadow step on solve frames was 25 cm at 60 fps and 49 cm at 30 fps, against 3.5 / 7.3 cm at full rate.
  In that run `hipShadowInView` was false (see "Look rerun").

## Ship criteria (both, or #360 does not ship)
1. **CPU.** The saving at tier 8 with the shadow rule on is real, measured on the GPU ("Measure").
2. **Look.** The shadow foot slide is gone in a look shot that actually stages the case: `hipShadowInView` true
   ("Look rerun").

## Where
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-t1`, branch `feature/guard-ai-t1-anim-tier` (PR #360). The job lead
  calls it "feature/guard-ai-t1"; the remote name is `feature/guard-ai-t1-anim-tier`. Head at brief time: 2956d8a0a.
- Build NOW, on this branch. Do not wait for gm-flip (#375). Guard models are still off by default here
  (`?guardmodels=1` turns them on).
- Branch guard before every write:
  `cd /c/NightShift/Mobile-Coop-guard-ai-t1 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-ai-t1-anim-tier && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-ai-t1"`
- Read `docs/systems/agent-preamble.md` first and follow it. Commits are path-limited: never `git add -A`. Use hyphens,
  not em dashes.
- **Step 0:** `git fetch origin && git merge origin/master`. No conflicts are expected (T1 touches `animTier.ts`, its
  test, the fragment, the look script and `testing-tools.md`). The merge also brings master's `docs/guard-ai/BRIEF.md`,
  which holds A183. The line numbers below are on origin/master 6c3f4a879; the files T1 does not touch are identical on
  both.

## Rule allowed? Yes
- The anim tier is render-side animation LOD. Gameplay never reads a guard's rig: T1-CHECK-B "Evidence" lists every
  reader. CLAUDE.md:255 forbids gameplay reading graphics state, and this is not gameplay.
- The Sector render freeze already reads the camera, the frustum and the scene's shadowing lights for the same kind of
  render-only decision (`src/game/sectorGuardFreezeView.ts:1-25`).
- `docs/systems/lighting.md` "Character silhouette shadows" says what draws a guard's real pose into a shadow map:
  - character-shadow atlas slots (High and above);
  - the moon CSM (guards within 40 m: `src/world/sunCascadeCull.ts:4`);
  - the torch atlas;
  - pooled shadowed lights.
- The capsule shadows on lower tiers come from `rtCapsules`, not from the pose, so they need no test.
- Co-op: the tier runs on the host's `Enemy` only. Clients solve puppets every frame. No wire change.

## Design
Reuse the freeze's exact, allocation-free frustum test instead of writing a new one.
- `guardFrustum(pl, x, y, z, height, cx, cy, cz, lights)` (`src/game/sectorGuardFreeze.ts:143-195`) already answers
  "can his body, his moon shadow (a capsule along the light, `sunShadowLength`) or a lamp's shadow volume of him (a cone
  from the lamp through his caster sphere, bounded by the lamp's reach and cone) be in this frustum?"
- It returns `FREEZE_DRAW` (-1: too near the camera, a lamp at his body, unbounded reach, light overflow), 0, or bits:
  `FREEZE_BODY_IN` 1, `FREEZE_SHADOW_IN` 2, `FREEZE_LAMP_IN` 4.
- The shadowing lights come from `SectorGuardFreeze.readLights` (`sectorGuardFreezeView.ts:371-417`, plus
  `addSpotLight` :421-444). It reads:
  - scene lights with a shadow generator and intensity above 0 (the moon as a direction, spots and points with their
    reach);
  - each active torch-atlas slot (with its holder);
  - each character-atlas slot's lamp.

New rule in `markSeen`, once per camera evaluation. For each tracked guard NOT drawn by the camera this render: if
`guardFrustum` returns `FREEZE_DRAW`, or any `FREEZE_SHADOW_IN | FREEZE_LAMP_IN` bit, he counts as seen this frame.
- `FREEZE_BODY_IN` alone does NOT count: camera culling is the truth for the body.
- Frustum only, no occlusion rays: a shadow behind a wall still counts as seen. That costs saving but is never wrong on
  screen.
- The lights are read at most once per frame id, and only when some tracked guard was not camera-drawn.
- The planes are copied once per evaluation, only when needed.
- Nothing is allocated per frame.

## Changes (exact)

### 1. `src/game/sectorGuardFreezeView.ts`: extract the light reader (behaviour identical)
- Move the body of `private readLights()` (:371-417) into an exported module function:
  `export function readFreezeLights(scene: Scene, L: FreezeLights, torch: FreezeTorchSlots | null | undefined, chars: FreezeCharSlots | null | undefined, slot4: Float32Array): void`.
- Move `private addSpotLight` (:421-444) into a module function `addSpotLight(L: FreezeLights, l: SpotLight, torch = false)`.
- `SectorGuardFreeze.readLights` becomes one line:
  `readFreezeLights(this.scene, this.lights, this.atlas?.torch, this.atlas?.chars, this.slotLamp4)`.
- Keep the comments.
- Guarded by the existing tests, which must pass unchanged: `sectorGuardFreezeView`, `sectorGuardFreezeAtlas`,
  `sectorGuardFreezeLamp`, `sectorGuardFreezeSeeThrough`, `sectorGuardFreeze`.

### 2. `src/ai/animTierView.ts`: shadow-in-view counts as seen
- Imports:
  - `FREEZE_DRAW`, `FREEZE_LAMP_IN`, `FREEZE_SHADOW_IN`, `FreezeLights`, `guardFrustum` from `'../game/sectorGuardFreeze'`;
  - `readFreezeLights` and the types `FreezeTorchSlots`, `FreezeCharSlots` from `'../game/sectorGuardFreezeView'`.
  - `src/ai` already imports `src/game` (enemy.ts:3-19). The view module imports `Enemy` as a type only, so there is no
    runtime cycle. Check with `npx tsc --noEmit` and a test run.
- Export the type
  `export interface AnimTierShadowSource { readonly torchShadows?: FreezeTorchSlots | null; readonly charShadows?: FreezeCharSlots | null }`.
  `World` matches it structurally (`world.ts` `torchShadows` / `charShadows`). Read the fields every frame, never
  cache them: they can be null at load or turned off by quality.
- `SeenTrack` (:12-16) gains:
  - `camFrame: number` (the frame the camera drew it, -1);
  - `shadowFrame: number` (the frame the shadow rule marked it, -1);
  - `x, y, z: number` (his feet at the last `dt`, NaN until then);
  - `h: number` (his height; 0 = no shadow test).
  - `frame` keeps its meaning: seen by either. `tests/guardBody.test.ts:244` writes it directly.
- The per-scene entry in `LIVE` (:18) gains:
  - `lights: FreezeLights`, `planes: Float64Array(24)`, `slot4: Float32Array(4)`;
  - `lightsFrame = -1`, `src: AnimTierShadowSource | null`;
  - `shadowN = 0` (guards marked by the shadow rule in the last frame: debug).
  All are made once in `track` (:34-45).
- `markSeen(scene, live)` (:20-32), in this order:
  1. The existing loop sets `t.frame = t.camFrame = fid` when `t.mesh._renderId === rid`. Remember whether any live
     track has `t.frame !== fid`.
  2. Return when none, when `!flags.animShadow`, or when there is no `scene.activeCamera`, no `scene.frustumPlanes`,
     or fewer than 6 planes.
  3. If `live.lightsFrame !== fid`, call
     `readFreezeLights(scene, live.lights, live.src?.torchShadows, live.src?.charShadows, live.slot4)`, then set
     `lightsFrame = fid` and `shadowN = 0`.
  4. Copy the 6 planes into `live.planes`, as `sectorGuardFreezeView.ts:200-207` does.
  5. For each track:
     - skip when `t.frame === fid`, `!(t.h > 0)`, `t.x !== t.x`, or `!t.mesh.isEnabled()` (a render-frozen rig: the
       FROZEN tier owns it);
     - else `const b = guardFrustum(live.planes, t.x, t.y, t.z, t.h, c.x, c.y, c.z, live.lights)`, where `c` is
       `scene.activeCamera.globalPosition`;
     - if `b === FREEZE_DRAW || (b & (FREEZE_SHADOW_IN | FREEZE_LAMP_IN)) !== 0`, set `t.frame = t.shadowFrame = fid`
       and `live.shadowN++`.
  - No closures, no array literals, no `for...of` inside `markSeen`.
- `track(scene, mesh, src)`: set `live.src = src` when it was null.
- `GuardAnimTier` constructor (:61-68) gains two optional trailing parameters:
  `height = 0, shadows: AnimTierShadowSource | null = null`. Pass them to `track` and store `h`. Existing callers and
  tests (`new GuardAnimTier(scene, body, 0)`) keep today's behaviour, because height 0 means no shadow test.
- `dt` (:80-112): before the `i.seen` line (:89), write `pos` into the track (`t.x = pos.x; t.y = pos.y; t.z = pos.z`,
  when `this.seen` is set). Also set `i.offPeriod = flags.animOff > 1 ? flags.animOff : ANIM_TIER_OFFSCREEN` (see 3).
- Export `animTierShadowSeen(scene: Scene): number` (`LIVE.get(scene)?.shadowN ?? 0`) for the measure and the look
  script.
- Update the header comment (:6-11): the shadow rule, and why it reads the camera and lights (render LOD, like the
  freeze).

### 3. `src/ai/animTier.ts`: the off-screen period as an input (measure A/B on one build)
- `AnimTierIn` gains `offPeriod: number`. `newAnimTierIn()` sets it to `ANIM_TIER_OFFSCREEN`.
- `animTierPeriod` (:65) returns `i.offPeriod` in place of `ANIM_TIER_OFFSCREEN`.
- In the header rule list (:12-13), add the shadow clause: "drawn in no local view and no shadow of his can be in one".

### 4. `src/core/flags.ts`
- Next to `animTier` (:60-61, :133), add two flags:
  - `animShadow: boolean`, `params.get('animshadow') !== '0'`, with doc "(guard-cap T1) shadow-in-view counts as seen;
    `?animshadow=0` off, for A/B";
  - `animOff: number`, `Number(params.get('animoff')) | 0`, with doc "dev A/B: the off-screen tier's period (0 = the
    constant)".
- Fix the stale ":60 off-screen every 4th frame" text to "every `ANIM_TIER_OFFSCREEN` th" (T1-CHECK-A polish 8).
- Before adding the flags, grep `scripts/` and `tests/` for `animtier` (preamble rule).

### 5. `src/ai/enemy.ts` (one line, :610 on master; :551 before the merge)
Change it to
`this.animTier = new GuardAnimTier(ctx.scene, this.rig.voxel?.meshes[0] ?? null, this.num, def.height, ctx.world);`
(`def` is in scope; `AiContext.world` is `World`, enemy.ts:133.) Touch nothing else in enemy.ts.

### 6. Stale text (T1-CHECK-A polish 8)
`tests/guardLod.test.ts:51` "every 4th frame (the off-screen tier)" becomes "every `ANIM_TIER_OFFSCREEN` th frame".

### 7. Docs
- `changes/feature-guard-ai-t1-anim-tier.md`: add a bullet. "A guard out of view whose shadow (a lamp's, the moon's, a
  torch's) can fall in the view counts as seen and animates at full rate, so his shadow never steps."
- `docs/systems/performance.md` "What keeps the frame inside the budget": one bullet with the tier rule, the shadow
  clause, the `?animtier=0` / `?animshadow=0` / `?animoff=N` flags and the measured saving (from "Measure").
- `docs/guard-ai/BRIEF.md`:
  - rewrite A183 as "DECIDED (Michael 2026-10-25): shadow in view = seen; T1 ships with it if the measure and look pass";
  - add **A195** with this rule and its undo (`?animshadow=0` per page; code undo: `flags.animShadow` default false).
  - The A-numbers A184-A194 are taken by PR #377. If another PR took A195, use the next free number and tell the lead.
- `docs/systems/testing-tools.md`: update the t1-shadow-look line with the new options (see "Look rerun").

## Unit tests

### New `tests/animTierShadow.test.ts` (NullEngine, pattern of `tests/sectorGuardFreezeView.test.ts:7-30`)
- **Setup:**
  - `B.Scene(new NullEngine())`;
  - a `FreeCamera` at (0, 1.6, 0) aimed at (0, 1.6, 10), set as `scene.activeCamera`;
  - a 0.6 x 1.8 x 0.6 box body at (0, 0.9, z);
  - `flags.animTier = flags.animShadow = true` and `flags.animOff = 0`, saved and restored after each test;
  - `tier = new GuardAnimTier(scene, body, 0, 1.8, src)`;
  - `pos = new Vector3(0, 0, z)`.
- **Frame helper:** `tier.dt(1/60, pos, [], false)`, then `scene.render()`. Read `seen` with
  `(tier as unknown as { seen: {...} }).seen`.
- **Cases** (each would fail without the change; check this by hand: comment out the shadow block):
  1. **No shadowing light, body at z -15:** never seen, and `camFrame` / `shadowFrame` stay -1. Over 16 frames after
     the first, `dt` solves 2 times (period 8).
  2. **Spot lamp behind him aimed into the view.** `SpotLight` at (0, 1, -20), direction (0, 0, 1), angle 1.2, with
     `shadowMaxZ = 30` and `new ShadowGenerator(256, lamp)`, the freeze test's lamp at `sectorGuardFreezeView.test.ts:68-71`.
     - Seen every frame: `shadowFrame === scene.getFrameId()` and `camFrame !== frame`.
     - 16 of 16 updates solve.
     - `animTierShadowSeen(scene) === 1`.
  3. **The same lamp at intensity 0:** off-screen again (period 8). Then restore the intensity and dispose the
     generator: off-screen again.
  4. **Moon, body at z -6:** a `DirectionalLight` with its own `ShadowGenerator`.
     - direction normalize(0, -0.5, 1) (his shadow runs into the view): seen;
     - direction normalize(0, -0.5, -1): not seen.
     - Why z -6: at -4 the near rule returns `FREEZE_DRAW` (4.06 m < r 2.2 + near 2), which would make the case pass
       for the wrong reason.
  5. **Character atlas slot.** `src = { torchShadows: null, charShadows: { slotCount: 1, slotLamp: (s, o) => { o[0] = 0; o[1] = 3; o[2] = -17; o[3] = 25; return true; } } }`,
     body at z -15.
     - Seen.
     - With `slotLamp` returning false: not seen.
     - An intensity-0 `SpotLight` with a generator aimed into the view, like the atlas's own slot spots: not seen.
       `readFreezeLights` skips intensity 0.
  6. **`flags.animShadow = false` with case 2's lamp:** not seen (camera only).
  7. **No height, no position, frozen:**
     - `new GuardAnimTier(scene, body, 0)` (height 0) with case 2's lamp: not seen.
     - A render before any `dt` (x NaN): no throw, not seen.
     - `body.setEnabled(false)`: `shadowFrame` does not move.
  8. **Overflow:** 17 shadowing spots far away and out of the view make `FreezeLights.overflow` true, so
     `FREEZE_DRAW`: seen (conservative, documented).
  9. **Period override:** `flags.animOff = 4` with no light: every 4th frame solves.

### `tests/animTier.test.ts`
- Add: `animTierPeriod(base({ seen: false, offPeriod: 4 }))` is 4.
- `newAnimTierIn().offPeriod === ANIM_TIER_OFFSCREEN`.

### Run (preamble: the changed modules and their direct importers, `--maxWorkers=2`, chunks of about 20 files)
- `npx vitest run --maxWorkers=2 tests/animTierShadow.test.ts tests/animTier.test.ts tests/guardBody.test.ts tests/guardLod.test.ts tests/thermalThroughDoor.test.ts tests/sectorGuardFreeze.test.ts tests/sectorGuardFreezeView.test.ts tests/sectorGuardFreezeAtlas.test.ts tests/sectorGuardFreezeLamp.test.ts tests/sectorGuardFreezeSeeThrough.test.ts`
- Then every test file importing `src/ai/enemy.ts`, `src/core/flags.ts` or `src/ai/animTier.ts`
  (`git grep -l "ai/enemy'\|core/flags'\|ai/animTier'" -- tests`), in chunks.
- `npx tsc --noEmit -p .` and `npx eslint src/ai/animTierView.ts src/ai/animTier.ts src/game/sectorGuardFreezeView.ts src/core/flags.ts tests/animTierShadow.test.ts`.

## Measure (ship criterion 1)
Why `scripts/guard-cap.mjs` as it is cannot answer this:
- Its sim buckets (`ai.anim`) run `loop.stepHeadless`. No render happens there, so `rendered` is false and every guard
  "counts as seen" (`animTier.ts:46`). The tier never acts in the sim cells.
- That also means guard-cap M0's "ai.anim 55-59% of sim growth" was measured at full rate. T1's real saving has never
  been measured.
- The tier acts only in the render sample, which has no anim timer today.

### `scripts/guard-cap.mjs`: add an anim tally to the counted render sample
`pageRender` :312; the counted block starts at :373 and the per-frame push is the `o3` observer at :401-408.
- In the counted block, wrap `em.frameUpdate` with a `performance.now()` accumulator (`animMs`, reset per frame in
  `o3`). The pageInstall wrapper is gated by `S.on`, which is off here, so wrapping on top is safe. Restore it in the
  `finally`.
- Per frame in `o3`, push `[animMs, solves, offscreen, shadowSeen]`:
  - `solves`: alive guards with `e.animTier && !e.animTier.skipped`;
  - `offscreen`: alive guards whose `e.animTier.seen` has `camFrame !== scene.getFrameId()`;
  - `shadowSeen`: count the tracks with `shadowFrame === scene.getFrameId()`, or read `window.__app` for
    `animTierShadowSeen`, whichever is reachable from the page (the bundle does not expose module exports, so the track
    count is the safe way).
- Return `anim: { ms: summary(...), solvesPerFrame, offscreenPerFrame, shadowSeenPerFrame }` from `pageRender`.
- Add CSV columns `anim_ms_mean`, `anim_ms_p95`, `anim_solves_per_frame`, `anim_offscreen_per_frame`,
  `anim_shadow_seen_per_frame`, and the same numbers in the log line (:709-style) and the RESULTS table.
- Keep the per-frame eval ms (`evalMs`, already counted). `markSeen` runs in the after-evaluation observer, which is
  registered before the script's `o2`, so the shadow test's own cost lands in `evalMs`. Report it beside `anim`.
- Header comment: one line for the new numbers.

### Runs
One laptop alone request (GPU, both slots idle, `E2E_GPU=1`) on the pushed slice sha. Three steps, all on one build;
the URL flags select the variant:
```
node scripts/laptop-queue/request.mjs --sha <full sha> --pr 360 --set t1-shadow-measure --requester "Night Shift | Guard AI Build" --alone --env E2E_GPU=1 \
  --step "node scripts/guard-cap.mjs --maps=ctcourse,sectorops,campusops --counts=0,24 --cells=patrol,away --secs=10 --query=animoff=4&animshadow=0 --out=C:/NightShift/scratch/t1-shadow-measure/<sha8>/t4cam" \
  --step "node scripts/guard-cap.mjs --maps=ctcourse,sectorops,campusops --counts=0,24 --cells=patrol,away --secs=10 --query=animshadow=0 --out=C:/NightShift/scratch/t1-shadow-measure/<sha8>/t8cam" \
  --step "node scripts/guard-cap.mjs --maps=ctcourse,sectorops,campusops --counts=0,24 --cells=patrol,away --secs=10 --out=C:/NightShift/scratch/t1-shadow-measure/<sha8>/t8shadow"
```
- The variants:
  - `t4cam` = master's behaviour (tier 4, camera only);
  - `t8cam` = #360 as held;
  - `t8shadow` = this slice.
- If the request tool takes no `&` inside `--query`, make it two `--query` values, or quote them per the tool's
  `--dry-run`. Run `--dry-run` first.
- Optional fourth step: `--maps=ctcourse --counts=24 --cells=away --query=guardmodels=1 --out=.../t8shadow-gm` (the
  figures, which become the default when gm-flip merges).
- Never `--out=docs/guard-cap`: that would overwrite the committed M0 report.

### Report: `docs/guard-ai/slices/T1-SHADOW-REPORT.md` on the T1 branch
- **Table per map x cell at 24 guards:**

  | variant | anim ms/frame mean / p95 | solves / frame | off-screen / frame | shadow-seen / frame | eval ms | frame CPU med / p95 | CPU per 1/60 s sim |
  | --- | --- | --- | --- | --- | --- | --- | --- |
- **Saving left** per map x cell:
  - `t4cam - t8shadow` on anim ms/frame (absolute and %);
  - the share of T1's raw saving it keeps: `(t4cam - t8shadow) / (t4cam - t8cam)`;
  - the frame CPU p95 delta.
- **Expected:**
  - Sector maps (sectorops, campusops) save almost nothing. The freeze already sends every guard whose shadow cannot
    reach the view to the FROZEN tier (`sectorGuardFreeze.ts:9-17`), and the guards left off-screen are mostly the ones
    this rule now counts as seen.
  - The saving that is left lives on ctcourse (Course / Infiltration maps).
- **Pass** (criterion 1):
  - on ctcourse away at 24 guards, `t8shadow` anim ms/frame mean is below `t4cam` by at least 10% and at least
    0.05 ms/frame;
  - no cell's anim + eval ms is worse than `t4cam` by more than 0.05 ms.
  - Otherwise report FAIL with the numbers. The lead then decides between closing T1 and the fallback below.
- **Fallback if the saving is gone (a follow-up slice, not this one):** tighten the moon term.
  - `guardFrustum` extrudes the moon shadow up to `(h + 9) / 0.2` = 54 m, while the cascades draw guards only within
    `GUARD_SUN_REACH` 40 m (+3 hysteresis) of the player (`sunCascadeCull.ts:4-6`) and cap the length at
    `SHADOW_LEN_CAP` 16 m (`moonShadowLen`, :50-55).
  - A guard further than that from the player casts no moon shadow at all.

## Look rerun (ship criterion 2)
Why the last run did not stage the case:
- `pageSelect` (`scripts/t1-shadow-look.mjs:88-260`) slides the camera until the guard's culling box (`BOX` 1.9 m
  half-width, :143) is out of view.
- The hip shadow lands `R x 0.95 / (lh - 0.95)` beyond his feet (`shadowAt`, :149-153).
- Lamp #48 (lh 3.6, R 4.5) puts it 1.61 m out, inside the culled box, so `hip` (:200) is false.
- For the hip shadow to be in view while he is culled it needs about 2.3 m: `R x 0.95 / (lh - 0.95) >= 2.3`, so lh <=
  3.22 at R 5.5, lh <= 2.81 at R 4.5, lh <= 2.52 at R 3.8. Low lamps and long legs.

### Script changes (`scripts/t1-shadow-look.mjs`)
1. **`--need=hip` option.**
   - Pass `NEED_HIP` into `pageSelect` (5th arg; the call at :608).
   - After `hip` is computed (:200), skip the candidate when `NEED_HIP && !hip`.
   - Add 6.5 to the leg lengths (:173, `[6.5, 5.5, 4.5, 3.8, 3.2, 2.6]`). The `rMax` reach check (:172) still applies.
   - When no candidate is left, the error at :233 must print the best hip offsets tried: the top 5 values of
     `R x 0.95 / (lh - 0.95)` with lamp ids.
2. **A third pass `cam`** (`${BASE}&animshadow=0`).
   - In `pass` (:579-580): `mode === 'full' ? '&animtier=0' : mode === 'cam' ? '&animshadow=0' : ''`.
   - Run order: tier, full, cam, all with the tier pass's camera, warm-up and choice (:657-659).
   - Contact sheets and compare: add the cam row.
   - The cam pass proves the spot reproduces the defect.
3. **Camera-drawn, not seen.**
   - In `pageCapture` (:468-474), `drawn` becomes `seen.camFrame === fid`, falling back to `seen.frame` when
     `camFrame` is undefined.
   - Add `shadowSeen: seen.shadowFrame === fid` per frame in `run.json`, and a log line "shadow-seen on [frames]".
   - In `pageDummy` (:282), `seen` stays camera-drawn the same way.
4. **Header:** update the usage block (:5-13) and the `testing-tools.md` line.

### Run (laptop alone, GPU)
```
node scripts/laptop-queue/request.mjs --sha <full sha> --pr 360 --set t1-shadow-look2 --requester "Night Shift | Guard AI Build" --alone --env E2E_GPU=1 \
  --step "node scripts/t1-shadow-look.mjs C:/NightShift/scratch/t1-shadow-look/<sha8>-hip/ 24 --fps=60,30 --need=hip"
```
- If Marlow has no lamp that fits, rerun the same step with
  `--map=autostart=warehouseOps&mode=sector&sectorGuards=0 --query=guardfreeze=0`. Then try another map with low
  lamps; say which in the report.
- `--select-only` first (cheap) shows whether a spot exists.

### Pass (criterion 2)
- `pick.hipShadowInView` is true.
- In all three passes his body is drawn on no frame (`drawn` empty, `inFrustum` 0).
- **tier pass:** solved on every frame, shadow-seen on every frame. `shadowStepOnSolve` and `slideMax` are within 1.5x
  of the full pass at both 60 and 30 fps.
- **cam pass:** solved every 8th frame, and its `shadowStepOnSolve` is at least 3x the full pass's. This proves the spot
  stages the slide.
- Put the 60 / 30 `-compare.png` sheets (tier / full / cam rows) in the report, for Michael's pack via the lead.

## e2e
One laptop pr request on the final sha: `--suites "e2e-sectorops e2e-enemies e2e-ct-warehouse"`, as T1's set. Before
pushing, run `npm run build`.

## Risks
- **The saving may mostly go.**
  - The moon capsule is long (54 m).
  - Any 17th shadowing light or second sun returns `FREEZE_DRAW` for every guard.
  - A guard holding a pooled shadowed torch near his body reads `FREEZE_DRAW`.
  - The measure's shadow-seen and off-screen counts show which. The fallback is above.
- **Late by one frame:** the rule reads the previous render, like the camera rule. A shadow entering the view shows
  one pose up to 7 frames old, then full rate (T1-CHECK-A polish 1, unchanged).
- **The guard models' culling box** differs from the merged body's. The look script's `BOX` 1.9 and its nudge loop
  were tuned with models off. With `--query=guardmodels=1` the nudge may need more steps (`start.nudged` in
  `run.json`).
- **Ownership:**
  - `animTierView.ts` was gm-perf's (guard-render S4);
  - `sectorGuardFreezeView.ts` is Sector's. The extraction only: behaviour identical, guarded by its 5 test files;
  - `flags.ts` is shared (append only);
  - `guard-cap.mjs` is guard-cap's and gm's: append inside the counted block. gm-flip (#375) also edits it (render.figure
    timers), so expect a small merge when one of the two lands. Keep the anim tally in its own lines.
  - Tell the lead before touching anything else.
- **Babylon internals:** `_renderId` (already used), `scene.frustumPlanes` in the after-evaluation observer (the
  current camera's).
- **Co-op:** host only. Nothing on the wire.

## Size
- About 8 files changed + 2 new. Production code about +110 / -45 lines; the test about 200 lines; scripts about +90
  lines; docs about 30 lines.
- About 5-6 h of build, plus the GPU queue time (measure about 25 min, look about 15 min).

## Done when
- The code, tests and docs above are committed on `feature/guard-ai-t1-anim-tier` (path-limited) and pushed.
- vitest, tsc and eslint are clean.
- `T1-SHADOW-REPORT.md` shows criterion 1 PASS (numbers table) and criterion 2 PASS (`hipShadowInView` true; tier
  equals full; cam reproduces the slide).
- The e2e set is green on the final sha.
- The lead then gets two fresh checkers on the diff, and #360 goes train-ready.
- If either criterion FAILs: the report says so with the numbers, #360 stays held, and the lead decides.
