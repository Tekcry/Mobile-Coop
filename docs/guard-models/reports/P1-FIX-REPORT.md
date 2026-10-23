# P1 fix round (after the checker FAIL)

Branch `feature/guard-models`. One fix round over the checker's three blocking issues. Lead rulings applied: the
enforcer shows `plate_heavy`; every helmet (`helmet_heavy` too) is drawn only while the gameplay helmet bit is set
(strict A5); droneOp = headset + optional cap (`headwear2`); one cranium / hair cap / head envelope per base. Where the
kit data and G6 disagreed, the kit data won (except the strict-A5 ruling, which changed the data).

## 1. G6 picks only kit ids (`src/operators/guards/guardVariant.ts`)
- The hard-coded `PROFILES` are gone. Every pool is built once at module load from `guards.json` (JSON import):
  base, heads, hair caps, outfit, `headwear` (+ "none" only when `headwearOptional`), `headwear2`, `eyewear`,
  fixed eyewear (from `fixedGear`), fixed kit, `kitPool`, `helmetPiece`, `armourPiece`, and the always-drawn fixed
  gear (plate, shield). `HEADS` and `KIT_CAPACITY` come from the kit too. Per call: no allocation (Map lookups only).
- Only look weights stay in code (headwear, hair cap, hair colour weights; eyewear 8%, `headwear2` 40%, kit-pool
  percentages); they weight kit ids and never add one.
- Results against the kit: runner no glasses (kit `eyewear: []`); heavy and enforcer kit pool `pouch_belt` only;
  droneOp optional `holster_thigh` (not radio); officer always `cap_officer` (`headwearOptional` false); grunt may get
  `glasses_dark`; heavy / enforcer `hairCap` = `bald` (kit `hairCaps: []`, no cap mesh on `broad`).
- `applyGear` is data-driven: a helmet hides only headwear whose `underHelmet` is false (the headset and balaclava
  stay); `hidesHair` decides the hair cap; `armour` or `plated` show the kind's `armourPiece` (vest_soft on the
  open-face kinds, no more plate_heavy on a plated grunt); fixed gear / shield always drawn; the helmet piece only
  with the helmet bit.
- New test: every id `guardVariant` and `applyGear` can emit, for 128 seeds x 7 kinds x 3 maps x 8 gear-bit sets, is
  in that kind's kit lists (and each field in its own list; no bare head when `headwearOptional` is false; fixed kit
  and fixed eyewear always present). Adjusted tests: officer always capped, headset stays under a helmet, grunt dark
  glasses allowed, plated open-face kinds show vest_soft, the 15% combo test runs on the open-face kinds (the covered
  kinds get their own test: bald, all four skin tones).

## 2. Bake plan reads the real kit (`scripts/operators/guardBakePlan.mjs`)
- `normalizeKit`: pieces of kind `outfit` become garment jobs, not gear. Parts per outfit (`OUTFIT_GARMENTS`, a
  piece's own `garments` list overrides): uniform = shirt, trousers, boots, gloves; uniform_rolled = shirt_rolled
  (`combat_shirt.py --variant rolled`), trousers, boots, gloves; work = work_jacket (`field_jacket.py --variant work`),
  work_trousers (`trousers.py --variant work`), boots, work_gloves (`gloves.py --variant work`); uniform_jacket =
  shirt, jacket (`field_jacket.py`), trousers, boots, gloves. Each part is baked on the bases whose kinds wear the
  outfit, once per base. Kits without outfit pieces keep `garments` / DEFAULT_GARMENTS (the fixture tests).
- Gear jobs per base = the union of its kinds' `headwear`, `headwear2`, `eyewear`, `fixedGear`, `gameplayGear`,
  `kitPool` (a kind naming an unknown piece throws). `shield_riot` (`ownGlb`) stays one job.
- Hair caps: one `haircaps-<base>` job in the heads stage (`build_head.py --haircaps --base <b>`, gpu-bound) for each
  base whose kinds wear a cap with a mesh: average and lean. Broad gets none (its kinds' `hairCaps` are empty; all
  balaclava). `lods-<base>` needs it.
- `lods-<base>` needs only that base's jobs (body, heads, hair caps, garments, used gear).
- Gear default script `build_gear.py` (same lines as G3's branch, so that hunk merges as identical).
- Merge care: the gear filter and the hair-cap jobs are added after the stage table, not inside the bodies / heads /
  gear blocks, and the `LIBS` table is untouched, so G1 (bodies), G1h (heads LIBS) and G3 (gear LIBS, script) merge
  cleanly. `git merge-tree` against feature/gm-g1, gm-g1h and gm-g3: see the commit message check below.

### Job counts (real `guards.json`, `guard-bake.mjs --stage <s> --dry-run --kit scripts/operators/data/guards.json`)
| Stage | Jobs | Split |
| --- | --- | --- |
| bodies | 3 | one per base |
| heads | 11 | 9 head variants + haircaps-average, haircaps-lean |
| garments | 16 | average 5 (shirt, trousers, boots, gloves, jacket), lean 7 (shirt_rolled, trousers, boots, gloves, work_jacket, work_trousers, work_gloves), broad 4 (shirt, trousers, boots, gloves) |
| gear | 25 | average 12, lean 8, broad 4 (balaclava, helmet_heavy, plate_heavy, pouch_belt), shield_riot 1 |
| lods | 4 | 3 bases + shield_riot (needs: average 23, lean 21, broad 10, shield 1) |
| check | 4 | 3 bases + shield_riot |
| sheet | 1 | |
Total 64 jobs (was 95: heads 9, garments 13 from DEFAULT_GARMENTS, gear 61 = all 20 per-base pieces, outfits
included as rigid gear, on every base + shield).
The dry run shows every job not yet runnable as blocked (scripts `build_head.py`, `build_gear.py`, `check_guard.py`
come with later slices; upstream stages not built).

## 3. Strict A5 in the data
- `guards.json`: `helmet_heavy` moved from heavy / enforcer `fixedGear` to `gameplayGear`. The shown set is the same
  union, so budgets and `validateGuardKit` are unchanged (no budget edits).
- `SPEC.md` section 3 (matrix rows, the ruling, G6 reads the data) and section 12 (settled) updated.

## Tests
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/guardKit.test.ts tests/guardBakePlan.test.ts tests/guardVariant.test.ts tests/guardLook.test.ts`:
  4 files, 85 tests passed (guardKit 10, guardBakePlan 32, guardVariant 30, guardLook 13).
- `npx eslint` on the changed TS files: clean (the .mjs is outside the lint set).

## Open items
- G2 writes `field_jacket.py` and the `--variant rolled|work` handling in `combat_shirt.py`, `trousers.py`,
  `gloves.py` (the job contract above).
- G1h writes `build_head.py --haircaps --base <b>` (one cap set per base, fitted over the shared cranium).
