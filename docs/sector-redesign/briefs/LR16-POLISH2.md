status: open

# LR16-POLISH2 - one polish batch for this window's checker polish lists

Planner: Opus 5.5, 2026-10-24. Plans only. Sources (`docs/sector-redesign/checks/` on this branch): art-train-entry-check
(polish 1-6), lr16w-batch-check (polish 1-10), lr16-render-batch-check (1-4), lr16pol-cf-check (1-4, M1), lr16p-check
(1-4), lr16-4-check (polish, 4); plus the build reports on `-lr16-entry` (lr16w-int risks 1-4, lr16l-a-build lead calls,
lr16w-{t,s1,s2,s3}-build open items). Every item was checked in the code at `origin/feature/sector-redesign-lr16-entry`
`6e53e036` (LR16 + master 5d1e8e3e; master retired `rtReflections.ts`). Line numbers are at that sha. CLAUDE.md
"Current goal" holds: build only what fixes wrong behaviour, a light-parity or perf leak, a CI flake, or a stale or
misleading doc / test; pure looks stay held.

Counts: 32 items on the polish lists. **7 to build** (3 parts, all Sonnet: tests and map data, no engine / GLSL / AI
code), **18 held**, **7 dropped**. Build-report risks: none is a real bug (table at the end).

## Rules for every part
- Preamble: `docs/systems/agent-preamble.md`. Worktree `C:/NightShift/Mobile-Coop-sector-redesign-pol2-<x>` with a
  node_modules junction to `C:\NightShift\Mobile-Coop-sector-redesign-lr16int\node_modules`; at the end remove it with
  `cmd //c rmdir "<wt>\node_modules"` FIRST, then `git worktree remove --force`. Push WIP per step (explicit refs);
  report `docs/sector-redesign/checks/pol2-<x>-build.md`.
- Re-read each anchor before editing; find it by name if the line moved.
- No wire change, no `PROTOCOL_VERSION` change, no save change, no `LAMP_VERSION` change, no file under `src/` except
  part A's one map file. `hyp2` / `hyp3`, never `Math.hypot`.
- Vitest single files `--maxWorkers=2` under `C:/NightShift/scratch/sr-slot-{1..4}.lock`; wait while CPU > 90%. No e2e,
  no build, no `npm run dev`. Probe files (`zz*`) never committed; delete them.
- Never touch Marlow's LR16-M files (on #291, `feature/marlow-lr16m` 9a79b5a5): `src/world/maps/ctcourse*`,
  `src/world/maps/ctcourseSets/a1-a8*.ts`, `tests/ctcourse/*`, `tests/ctcourseLight*`, `tests/lampBoxAlign.test.ts`,
  `tests/lampBake.test.ts` (part C only, after #291 releases). Nor LR16-6's vision files (running off 6e53e036).

## Parts and order

| Part | Branch | Base | Model | Earliest start | Items |
| --- | --- | --- | --- | --- | --- |
| A | `feature/sector-redesign-pol2-a` | `6e53e036` | Sonnet | **now** | 2 |
| B | `feature/sector-redesign-pol2-b` | `6e53e036` | Sonnet | **now** | 3 |
| C | `feature/sector-redesign-pol2-c` | master after #291 merges | Sonnet | **after #291 releases** (`tests/lampBake.test.ts`: Marlow's INT re-pins `:342`) | 2 |

A and B are file-disjoint from each other, from LR16-M and from LR16-6: start both now. Integration branch
`feature/sector-redesign-pol2` off `6e53e036`: merge A and B after their checker; its PR opens after #291 releases (its
base is inside #291, as the LR16-4 PR). C starts once #291 is on master and joins the pol2 PR at its train entry (or its
own small PR if pol2 is already out). If the lead wants C earlier: base `6e53e036` works too, since C's hunks (`:323-331`
and a new case after `:331`) do not touch `:339-342`; still merge it only after #291.

Checker: one Sonnet checker for A + B (C: the same checker, or the lead's read, when it lands). Laptop: none, unless
part A's nav probe shows a change (then `e2e-sectorops`).

---

## Part A - warehouse map data and a stale test key (Sonnet, start now)

Files (only these): `src/world/maps/warehouseS3.ts` (`:338-346` only), `tests/warehouseLamps.test.ts` (`LR16D_MOVED`
`:115-121` and the grid test that reads it).

| Item | Change |
| --- | --- |
| lr16w-batch polish 1 (S3 stores side panel marked `overhead`) | `warehouseS3.ts:342-346` marks both the stores top and the 2.4 m side panel `overhead` (`ov(p0)` after both boxes), so `navBuild.ts:67` skips the panel; only the cage fence on the same line (`:334`, x 0, z -8.65..-4.0) keeps nav out. Reorder to: `p0 = b.boxes.length;` top box (`:343`); `ov(p0);`; side panel box (`:344`); `nl(p0);` (both stay `noLedge`). Comment (`:338-341`): add "only the top is overhead; the side panel is a wall on the fence line". |
| lr16w-batch polish 3 = lr16w-int risk 3 (stale plantDeck keys) | `warehouseLamps.test.ts:119`: delete the four `'S1 plantDeck ceiling *,-15.15'` entries (S1 moved that row to z -16.9, `warehouseS1.ts:81`; they match no fitting). Guard against the next stale key: record each key `cell()` looks up in a `Set`, and after the room loop assert `Object.keys(LR16D_MOVED).filter((k) => !hit.has(k))` is `[]`. If another key turns out unused, delete it too and name it in the report. |

Acceptance
1. `npx tsc --noEmit` clean; `npx eslint` on both files clean.
2. Nav unchanged: a probe (not committed) builds `warehouseOps` and its nav grid on the base and on the branch and
   compares the walkable cells (or a hash of the grid bytes). Expect identical (the fence already blocks the line). If
   anything moves: stop, report the cells, do not commit the map change.
3. Vitest: `warehouseLamps`, `sectors`, `warehouseCoopS3`, `warehouseS3Light` (the bake ignores `overhead`: its print
   must be identical), `lampAudit`.

---

## Part B - lamp shader parity tests (Sonnet, start now)

Files (only these): `tests/bounceGrid.test.ts` (`:208-229`), `tests/helpers/bounceRead.ts` (`:65-83`), NEW
`tests/bounceReachMask.test.ts`, `tests/lampDataUpload.test.ts`. No `src` change.

| Item | Change |
| --- | --- |
| lr16p-check polish 1 (anchor lines skip the mask and blend statements) | `bounceGrid.test.ts:213-226`: add to the anchor list, copied character for character (no leading spaces) from `src/world/bakedLamps.ts` at the base: `int mx = ...` (`:969`), `int my = ...` (`:970`), `int mz = ...` (`:971`), `int g = c \| ...` (`:973`), `vec4 wa = ...` (`:979`), `vec4 wb = ...` (`:980`), `float sv = ...` (`:982`). A GLSL-only edit there then fails the parity test. |
| lr16p-check polish 2 (the exhaustive flood check is not committed) | `bounceRead.ts`: move `:65-83` (the reach set) into `export function reachMask(ea: readonly number[], eb: readonly number[], h: number): number`, same statements; `nsGrid2` calls it (the existing parity test must pass unchanged). NEW `bounceReachMask.test.ts`: corners k = x + 2y + 4z; `ea[k]` / `eb[k]` (k = x + 2y) hold the z = 0 / z = 1 corners; a set bit = a closed edge: bit 1 the +x edge (corners with x 0), bit 2 the +y edge (y 0), bit 4 the +z edge (`ea` only). For every one of the 4096 closed-edge sets of the 12 edges, every start corner h 0..7, and twice (clean; with junk bits set on the positions no axis reads: bit 1 on k 1 / 3, bit 2 on k 2 / 3, bit 4 on `eb`): `reachMask` equals the BFS component of h over the open edges (all open: 255). Assert the case count (65536). |
| lr16p-check polish 3 (upload test header claims the pendant t0 and slot id, the test drives neither) | `lampDataUpload.test.ts` second case: add a pendant step: a `SwaySet` on the registry as `tests/lampSway.test.ts:35-36` builds it, `reg.swayImpulse(...)`, `reg.tickSway(t)`, `lamps.frame()`; assert the lamp's t0 texels changed, every changed float index >= `y0 * w * 4`, one sub upload, no whole upload. Slot id: set `lamps.charShadows` (public, `bakedLamps.ts:193`) to a stub (`on: true`, `lampSlot: Int8Array` with lamp a at slot 0, `covers: () => false`, cast for the uniform members) and assert `buf[lamp a's lo + 28]` is 1 and lands >= `y0 * w * 4`. If the stub needs more than a cast, drop the slot step and make the header (`:1-5`) name exactly what is covered. |

Acceptance
1. `npx tsc --noEmit` clean; `npx eslint` on the four files clean.
2. Vitest: `bounceGrid`, `bounceReachMask`, `lampDataUpload`, `lampSway`, `lampFalloff`. `bounceReachMask` runs in under
   1 s.
3. Sanity, in the report: break one mask bit in a scratch copy of `reachMask` (not committed) and show the new test
   fails; change one anchor line's text in a scratch run and show `bounceGrid` fails.

---

## Part C - lamp bake hash test: comment and a cone (Sonnet, after #291 releases)

Base: master after #291 merges (it holds `6e53e036` + LR16-M; LR16-M's INT re-pinned `:342`). Files (only these):
`tests/lampBake.test.ts` (`:323-325` and a new case after `:331`).

| Item | Change |
| --- | --- |
| lr16pol-cf-check polish 1 (the comment says the blocker distance is reused as the band index) | `:323-325`: "the penumbra scratch was cut from 21 B per cell of the largest lamp box to the blocker distance (4 B a cell), rings of planes (the box sums, the band widths `hRing`, the filter) and the band's own cells. The bytes must not move: ..." (keep the rest). |
| lr16pol-cf-check polish 2 (no cone in the committed hashes) | New `it` after `:331`, the two existing hashes untouched: the `:327` shapes and three cones in the `lamp()` layout (`[x, y, z, r, dx, dy, dz, cos, sx, sz]`, as `:114`): a wall pack at (0.3, 2.5, 4) tilted 45 degrees down and away from the x 0 wall `box([0, 1.5, 5.6] ...)` (`t, -t, 0`, cos 30 degrees), a 45 degree downlight, and a 0.3 m-radius cone (box nz <= R). Penumbra on. Expected hash from the code before the scratch cut: `git show e7cec732:src/voxel/lampBake.ts > src/voxel/zzLampBakeOld.ts` (untracked), a scratch test bakes the fixture with both and asserts equal bytes; pin that value, delete the zz files. If old and new differ: stop and report (a part C defect, not a re-pin). |

Acceptance: `npx tsc --noEmit` clean; vitest `lampBake` whole file green (incl. Marlow's `:342` hash and the 600 s case),
`lampBounce`; the report names the old-vs-new comparison result.

---

## Held (18) - open, not built

| Item | At 6e53e036 | Why held / trigger |
| --- | --- | --- |
| art-train-entry 1 (C9 death solve is 0.1 + carry, brief said 0.1) | `src/ai/enemy.ts:1779` passes `ANIM_TIER_FROZEN_CARRY_MAX`; `animTierView.ts:119-123` adds the carry | Pose timing only (up to 0.2 s of one solve), camera-independent as C9 wants; a `src/ai` edit (two checkers). Fold into the next `enemy.ts` change: pass `0` as `thawPose` does (`:3263`). |
| art-train-entry 2 (C9 wiring covered by a mimic) | `tests/sectorGuardFreezeView.test.ts:372` fakes `thawPose` | Coverage, not a stale test: the comment says it mimics. Build with the next guard-render test pass. |
| art-train-entry 3 (`dispose` solves every frozen guard) | `src/game/sectorGuardFreezeView.ts:345-350` | Harmless (teardown, once). |
| art-train-entry 4 (frozen guard still loops players / cameras) | `src/ai/animTierView.ts:65-96` | Perf tuning: a few compares per frozen guard per frame; only if a campus profile shows it. |
| art-train-entry 6 (ragdoll seeded from the render pose) | `src/ai/enemyManager.ts:565-571` | Pre-existing; no doc claims otherwise. A line for the next guard-render doc pass. |
| lr16w-batch 2 (S3 stores side panel = new cover / sight wall) | `warehouseS3.ts:344` | Look / Guard AI walk on the GPU sheet. |
| lr16w-batch 4 = lr16w-int risk 1, s2 / s3 open 1 (points pass by TOL) | `tests/warehouseS{1,2,3}Light.test.ts` (TOL 0.02) | Nothing to change; deterministic. Re-check on any later lamp / bake change. |
| lr16w-batch 7 (`lampBoxAlign` misses a sideways-embedded lamp) | `tests/lampBoxAlign.test.ts:224-263` | A new guard, not a stale one (the cell-under check is live and the header says so); a 6-neighbour rule needs a lit-side rule for wall bulkheads. Marlow's file on #291. |
| lr16w-batch 8 (S4 cage centre lit 1.00) | `campusS4.ts:418` | Lead decision 2 (cage stays lit); confirm on the GPU sheet. |
| lr16w-batch 9 = lr16l-a lead call 5 (0.2 m bake is grid-phase sensitive) | `lampBake.ts` `lampBox` | A light-model change (finer `LAMP_CELL` or exact thin edges): after Michael's playtest. |
| lr16-render 2 (`paintFlicker` sees a list change by length only) | `src/world/lightRig.ts:784-799` | `setFlicker` is load-time only (`lights.ts:257`, callers `lights.ts:202`, `lampFlicker.ts:229`). Build when a runtime caller appears (a list version). |
| lr16-render 4 (note at `placeTorch` that the holder score inverts it) | `torches.ts:44`, `torchShadowSet.ts:143` | Missing note, not stale. |
| lr16pol-cf 4 (hull rule also fires on the neighbour's own centre) | `src/voxel/lampBounce.ts:249-260` | The comment is not wrong (the centre sub-cell is a second solid run); a word, no behaviour. |
| lr16p 4 (capsules in list order, not nearest) | `src/world/bakedLamps.ts:654-661` | "Watch the GPU sheet"; ranking by distance only if it shows. |
| lr16-4 polish 1-4 (`campusS2Board` real rooms; double assert; SPEC.md wrap; board greybox look) | on `-lr16-4` eb2c62c2, not on 6e53e036 | Test tidy / cosmetic / a look; the LR16-4 PR opens after #291. |


(lr16-4 polish counts 4 of the 18.) Also held, from a build report (not counted): lr16l-a A2 campusOps #16, the bike
shelter fitting flush with the roof (`campusS1.ts:249-254`, `lampBoxAlign.test.ts:217`): tagged out (radius 0, off), bakes
nothing; cosmetic, and its fix touches Marlow's test file.

## Dropped (7)

| Item | Why |
| --- | --- |
| art-train-entry 5 (`GuardAnimTier.thawing` read only by tests) | A harmless test observation getter. |
| lr16w-batch 5 (LR16g Marlow re-level and `ctcourseLight.tuned.json`) | Obsolete: the entry took master's Marlow map and dropped the tuned json; LR16-M re-tunes it (#291). |
| lr16w-batch 6 (brief deviations accepted) | No action: the checker accepted them as realistic. |
| lr16w-batch 10 (S4 basket supports walk-through) | As before, by design: non-colliding dressing (`campusS4.ts:418`, `collide` false). |
| lr16-render 1 (`rtReflections.ts` highp samplers) | Moot: master retired `rtReflections.ts` (not in the tree at 6e53e036). |
| lr16-render 3 (look-shot expectation for PBR fences / ropes / decals) | A note for the GPU sheet, not code. |
| lr16pol-cf 3 (0.2 m gap test accepts 0.04) | Accepted by the checker (explained in the F report). |

lr16pol-cf **M1** (the Marlow hash at the C + F merge) is done: `tests/lampBake.test.ts:339-342` re-pinned at the entry
(`6efdcc4965ad2745`), re-pinned again by LR16-M's INT on #291.

## Build-report risks: no real bug

| Risk | Status |
| --- | --- |
| lr16w-int 2 (`ctcourseLight` S7 stair red) | Moot: master's map; LR16-M makes `ctcourseLight` green (#291). |
| lr16w-int 3 | = lr16w-batch 3: part A. |
| lr16w-int 4, s1 3, s2 3, s3 4 (route moves unproven until `e2e-sectorops`; GPU sheet rows) | Laptop runs, not code (queued with the LR16 sha). |
| lr16l-a lead calls 1-4 (#34 / #53, #81, wall guard 3.0, S3 C3 far doorway) | Resolved: T moved #34 / #53 to `ON_ITS_POST` and moved the #81 post; 3.0 kept; W / INT cleared the S3 red. |
| lr16w-t lead call (post at z 38.5) | Accepted (lr16w-batch 6). |
| lr16w-s1 1 (C2 far door 0.37), s2 2 (stale S2 cage key) | Fixed in INT (#56 beam 0.62; key deleted, `warehouseLamps.test.ts` has no S2 cage entry). |
| lr16w-s1 2 (corridor pool by the security door) | Michael's call (WORK door spot band); on the "For Michael" list. |
| lr16w-s3 2, 3 (#131 radius 1.5; hall strip raises x1.06-1.30) | Accepted (lr16w-batch 6), realistic levers. |
