# LR16 perf triage (2026-10-23, Opus, read-only on -lr16int 55e93d14 = f8008542 + docs)

Question: campusOps S5-worst over the CPU budget (p95 < 12 ms) on LR16 f8008542 - LR16's doing, or the known campus
guard CPU cost that #226's guard render freeze (perfg / perfa, `src/game/sectorGuardFreeze*.ts`, `src/ai/animFrozen.ts`)
fixes and LR16 does not contain?

Laptop verdict on f8008542 (Test Runner, GPU, 4189 alone), CPU p95 / GPU p95 ms:

| View | Epic | Medium |
| --- | --- | --- |
| start (S1, 8 guards) | 8.6 / 6.1 | 8.0 / 4.7 |
| S5-worst (24 guards) | 13.3 / 7.3 | 12.2 / 6.2 |

## Verdict: NOT LR16-caused. Inherits #226's fix at train entry.

S5-worst is the unfrozen campus guards. LR16 adds at most ~0.1-0.3 ms CPU at Epic, and ~0.2-0.5 ms at Medium from
LR16-7 (the one character-shadow slot). Neither is the overage.

## Evidence, ranked

1. **Per-guard cost, the same as before LR16 (main cause, ~7 ms of the 13.3).**
   - Start to S5-worst on f8008542: +4.7 ms for +16 guards = **0.29 ms per guard**. `campus-perf-fix.md` ("Cause") measured
     0.28-0.34 ms per guard on the campus art build (5504e2e3), with no freeze: (15.6 - 7.4) / 24 = 0.34 at S5-worst. LR16
     is on the same per-guard line.
   - At the S5-worst view all 24 guards are in the frustum, behind walls (`campus-perf-fix.md`: "S5 0 of 24 outside the
     frustum", 16 hidden by walls). Without the freeze every one pays the full anim, evaluation and shadow-list cost.
   - Epic and Medium differ by only 1.1 ms CPU at S5 (13.3 / 12.2). The cost is per guard, not per lighting tier.
2. **LR16 is not based on #226.** `git merge-base --is-ancestor 72e87171 f8008542`: no (not on master 41204e30 either).
   f8008542 has no `sectorGuardFreeze*.ts`, no `animFrozen.ts`, no perfg merged gun, and no campus art (5504e2e3 is not an
   ancestor). Merge base with master: 273539ec (the charshadow merge). LR16's src diff from there (26 files) touches no
   guard AI, anim or render-tier code. `enemyManager.ts` changes one line only: `bodyOccluder` is always built.
3. **Earlier campus S5-worst numbers (Epic, 24 guards, laptop):**

   | Build | Art | Freeze | S5-worst CPU p95 |
   | --- | --- | --- | --- |
   | 5504e2e3 (`campus-perf-fix.md`) | yes | no | 15.6 (0 guards: 7.4) |
   | 1d34c348 artpol (`perfg-build.md` baseline) | yes | yes | 13.1 |
   | 4f66a5f8 artpol + perfg + perfa | yes | yes | predicted ~11.7 (`perfg-build.md`). Laptop verdict pending (STATE #226) |
   | f8008542 LR16 | no | no | 13.3 |

   LR16 has no art, so its 0-guard base is lower than 7.4 (start view: 8.6 here vs 12.0-13.4 with art, `perfa-build.md`).
   That headroom is what keeps 13.3 below the art build's 15.6. The guards cost ~7 ms either way. The freeze removes
   ~4.3 ms of that at S5 (16 frozen x 0.27), and perfg removes another ~1.4 ms (`perfg-build.md`).

## LR16 per-frame CPU, item by item (diff 273539ec..f8008542, S5 with 24 guards)

| Item | Where | Per-frame CPU at S5 | Allocations |
| --- | --- | --- | --- |
| LR16-7 character shadows on Low / Medium (1 slot, 256 / 512) | `charShadowSet.ts:26-27`, `:102` (every 2nd frame) | Epic: 0 (Epic already had 4 x 1024 on master). Medium: new. The gather over `charCasters` runs every frame (~10 us). The slot's guards (those in the nearest lamp's reach, est. 3-6) are drawn into the map every 2nd frame at ~50-75 us each (shadow lists are not frustum-culled), plus the copy pass ~20-30 us. **~0.2-0.5 ms on refresh frames, so it lands in p95.** | none (`slot.list` reused, indexed loops) |
| LR16f / LR16-3 door leaves and props as casters (cone fit per frame) | `charShadows.ts:364`, `addDynamic` `:389` | campusOps `props: []`, so the prop loop is empty. Doors: ~50 leaves, `open <= 0` skipped first, x 4 slots: < 5 us. When an open leaf is in reach, its one thin-instanced draw goes into that slot: ~20-40 us per slot refresh, <= ~0.15 ms worst at Epic. `fitCone` takes a few more spheres: us. | none (`doorSp` reused, `sp.set`) |
| LR16f contact-hardening PCF, taps per tier | GLSL in `charShadows.ts` | 0 CPU (GPU only). `info[1]` is set once in `configure`. | none |
| LR16b cone feather + 24 lamp slots per 2 m column | `lightField.ts` lamp loop, `lampMath` | A smoothstep per lamp sample, and up to 24 lamps per `totalAt` instead of 8. `totalAt` runs a few dozen times per frame (meter 10 Hz, perception, bodies 1 Hz): < 0.05 ms. The rest is GPU (lamp loop per pixel; GPU p95 7.3 is fine). | none |
| `lights.contribution` / `lightTerm` photometric | `lights.ts` | The same order of flops as the old `lampTerm`: ~0 | none |
| Lamp plugin uniforms (LR15 `lampTorch`, 48 floats) | `bakedLamps.ts:913` | `UniformBuffer.updateUniformArray` (compare + copy, no alloc) per PBR bind: ~0.3 us x ~300 binds = **~0.1 ms** | none |
| shadowAccuracy always on (LR16a) | `enemyManager.ts:835`, `lightField.ts`, `lightRig.ts` | Body light rays: 1 Hz per body, none at S5 start. Trilinear ambient: +7 reads per `totalAt`. Third shadow-pick pass every `PICK_INTERVAL`. All ~0. | none |
| LR15 drawn torches (`followTorches`) | `lightRig.ts` | 4 slot writes per frame: ~0 | none |
| DoorGhosts (LR16v) | `doorGhosts.ts` | Thermal only. The old `crossing()` returned a new object per hit; the new `closedDoorCrossing` writes into `out`, so **one allocation fewer** | fewer |

Allocations: no LR16 path allocates per frame. The warehouseOps Epic "over budget: anim per character, allocations"
lines should be the existing state (`perf.mjs` header: Epic measures anim 0.055 against the 0.04 design target, and the
allocations are V8 boxing and Havok marshalling). The A/B below checks this with the same command on master and on the
merge base.

Estimated LR16 total: **Epic +0.1-0.3 ms, Medium +0.3-0.7 ms CPU p95** at S5. Even with all of it removed, S5-worst would
still be ~13.0-13.2 (Epic) / ~11.5-11.9 (Medium).

## A/B on the laptop (queued, alone, identical steps on every sha)

| Request id | sha | Role |
| --- | --- | --- |
| `20261023T094112-night-shift-sector-o-41204e30-6cb9` | 41204e30 | A: master |
| `20261023T094116-night-shift-sector-o-f8008542-7beb` | f8008542 | B: LR16 head |
| `20261023T094120-night-shift-sector-o-273539ec-0469` | 273539ec | A0: LR16 merge base (added) |

A0 was added because master 41204e30 differs from LR16's base by 168 src files, including guard-ai S22 and the carry fix,
which touch guard CPU directly. 273539ec..f8008542 is LR16 alone, so B against A0 is the clean measure. Cancel A0 if the
laptop is short.

Steps (cmd shell, slot worktree, after the service's `npm run build`). Master and 273539ec have no `MODE` in `perf.mjs`,
so f8008542's `perf.mjs` (blob 2a86dbdf) runs on every sha. `serve.mjs` from feature/laptop-queue (blob 1dea4a4c)
serves dist, because neither sha has `scripts/laptop-queue/`:
1. `git show 2a86dbdf... > scripts/perf-ab.mjs && git show 1dea4a4c... > lq-serve.mjs`
2. `set MAP=campusOps&& set MODE=sector&& node lq-serve.mjs scripts/perf-ab.mjs http://127.0.0.1:%E2E_PORT%/ --desktop --json` (Epic start)
3. The same with `--preset=medium` (Medium start)
4. `set MAP=warehouseOps&& set MODE=sector&& ... --desktop --json` (the allocation / anim flags)

What these runs cannot show: perf.mjs has no view option, so they measure the S1 start, not S5-worst. The S5-worst
numbers come from the Test Runner's view harness (`campus-perf-fix.md` "Laptop rerun": S5 (-50.25, 3.0, 62.25) facing
158, 24 guards). **Ask the Test Runner to run that harness on 273539ec and f8008542** (Epic, Medium) for the S5 A/B.

Reading the result: if B - A0 at start is <= ~0.3 ms (Epic) and <= ~0.7 ms (Medium), the verdict stands. A larger gap
points at LR16-7 or the plugin uniforms (rows 1 and 6 above).

## Proposal

- **No LR16 fix is needed for the budget.** S5-worst is the guard cost that #226 fixes. At train entry, with #226 (art +
  freeze + perfg + perfa) and LR16 both in, the expected S5-worst is #226's ~11.7 (if 4f66a5f8's laptop verdict
  confirms it) plus LR16's ~0.1-0.3 at Epic: **~11.8-12.0, at the budget line**. Re-measure S5-worst on the train build.
- Insurance if the train build lands at 12.0 or above (both are LR16-side, each small):
  1. Medium / Low slot refresh every 3rd frame instead of every 2nd: `charShadowSet.ts:102` `CHAR_SHADOW_EVERY` low / medium
     2 -> 3. Expected Medium -0.1-0.2 ms p95 (fewer refresh frames, though a refresh frame still costs the same). Visual
     cost: the guard shadow lags 1 frame more at 60 Hz.
  2. `lampTorch` only when it changed: keep a version in `LightRig` (bumped in `writeTorchDraw` / `followTorches` when a
     value moves) and skip `ubo.updateFloatArray('lampTorch', ...)` at `bakedLamps.ts:913` when the material's last bound
     version matches. Expected ~-0.05-0.1 ms Epic (most frames have no moving torch at S5).
- Merge note for the train (render only, no perf effect): #226's freeze reads shadow lights with `intensity > 0`
  (`sectorGuardFreezeView.ts` `readLights`). The character-shadow slot spots have `intensity = 0` (`charShadows.ts:264`),
  so the freeze ignores them, and a frozen guard (root disabled) drops out of `gather` and keeps his capsule shadow.
  After the merge this also cuts LR16-7's slot cost, because frozen guards are not drawn into the slot map. Look for it
  in the train's S5 shadow look: a lamp shadow of a guard behind a wall becomes a capsule.
