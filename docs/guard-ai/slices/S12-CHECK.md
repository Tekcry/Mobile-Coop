# S11 + S12 - Stealth over shooting data, helmets and body armour (fresh checker, 2026-10-23)

Branch `feature/guard-ai-s12`, head 8ea8e08e (base 74095d47, the stack tip S6; the S11 merge abe39010 brings 8671c9eb).
Reviewed `git diff 74095d47..HEAD` in full: `src/ai/gear.ts`, `helmetDrops.ts`, `enemy.ts`, `enemyManager.ts`,
`guardAiData.ts`, `barks.ts`, `src/game/damage.ts`, `sectors.ts`, `modes/sectorMode.ts`, `src/weapons/playerWeapons.ts`,
`src/ui/hud/hud.ts`, `src/audio/sfx.ts`, `src/styles.css`, `src/world/maps/warehouseSectors.ts`, the tests, both e2e
scripts and the docs. Specs: `research/stealth-over-shooting.md` items 2 and 13, "Shared numbers", "Art"; PLAN rows
S11 / S12; BRIEF A35, A36, A45, A47-A51; `slices/S11.md`, `slices/S12.md` (with "Lead fix").

## Verdict: PASS (one fix applied)

Nothing is broken or unplayable. The rules match the spec, the host sim is sound, nothing in `src/net` changed and
the hot paths do not allocate. I fixed one small bug (finding 1). It does not show in play today, because no data sets
gear yet.

## Findings

1. **Fixed: a dog could wear invisible gear.** `Enemy.setGear` set `helmet` / `armour` on a dog. `showGear` then
   skipped the parts, but `applyDamage` still read the flags (`src/ai/enemy.ts:1343`). A `gear` tag on a dog's room
   slot, a `SectorDef.gear` default, or S13's stage gear ("every living guard") would have made a dog take no damage
   from body rounds and shrug off one head round, with nothing visible on him. Fix at `src/ai/enemy.ts:549`: a dog wears
   nothing. Test: `tests/gearWiring.test.ts` "a dog wears no gear ...". gearWiring now passes 21 / 21.
2. **The rules hold.** (`enemy.ts:1311-1393`)
   - Order inside `applyDamage`: the sleep bolt returns first, then the heavy's plates and the enforcer's frontal
     shield as before. The gear branch runs only for bullets (`h.kind === 'bullet'`) and never for the heavy. Melee,
     takedowns, grabs and explosions never enter it.
   - Head + helmet: 0 dealt, helmet off, a dropped helmet, then `deflect` (`:1371`). Sparks, the LKP and stimulus on the
     shot's origin, the `deflect` bark, `strikeStagger(0.9)` (burst and wind-up dropped, `decide` idles while
     `stagger > 0`), then `alert()`: combat and the contact call. The second head round kills through the old headshot
     line.
   - Body + armour: 0 dealt, with the 0.5 s stagger only when `sinceStagger >= 1.5`. `strikeStagger` resets the clock
     (`:526`) and `update` counts it (`:1435`). No stun-lock: at most 0.5 s staggered in any 1.5 s.
   - `strikeStaggerT` is set by gear staggers, but nothing else in `src` reads `strikeStaggered`. So a gear stagger does
     not open the elbow strike's "second strike knocks out" window.
3. **Revive and placement are safe.**
   - Revive (`enemyManager.ts:831`) builds a new `Enemy` and calls `inherit`, which copies gear as it was at the KO
     (`enemy.ts:779`). No `placeSlot` runs after it.
   - `placeSlot` (`enemyManager.ts:1117`) is only called right after `em.spawn`, in `courseMode.ts:667`,
     `infiltrationMode.ts:96` and `sectorMode.ts:448`. So "setGear on every placeSlot" only ever applies to a fresh
     guard. S6 reinforcements get the section default, which is what the spec wants. Nothing re-places a live guard
     (S5b included).
   - Note for S13: stage gear must be applied after `placeSlot` in `fill`, or merged into its `sectionGear` argument.
     Otherwise `placeSlot` wipes it.
   - Marlow Yard and the early sections have no tags and no default, so no gear and no parts are built.
4. **Co-op is host-only, and nothing breaks the host sim.** `src/net` and `PROTOCOL_VERSION` are untouched. A client's
   shot still resolves on the host's `Enemy`, so the rule holds and the dropped helmet appears on the host. Expected
   until S9: the client sees bare heads and no drop, and gets no hit marker for a deflected round, because
   `coopHost.ts:1018` only confirms when `dealt > 0`. S12.md already lists this for S9.
5. **Hot paths are clean.**
   - Allocation-free: the `GEAR_OUT` scratch, the `tmpN` scratch, the manager's `gearA` / `gearB`, and the
     `HelmetDrops` pool, which is built on the first drop and has a Float64Array scratch.
   - `knockHelmetOff` uses `hyp2`. Babylon types come only through `src/core/babylon.ts`.
   - Part building (closures, `[-1, 1]`) runs once per guard, at spawn or on the first `setGear`.
   - `vfx.sparks` allocates on every call (`normal.scale`). That is existing debt, not S12's (polish 8).
6. **The hit marker compiles and leaves the existing kinds alone.** `HitKind` gains `'deflect'`
   (`playerWeapons.ts:57`) and the marker order is kill, then deflect, then head, then hit (`:1033`). `hud.ts:264` and
   `sfx.ts:114` widen their signatures. The sfx ping is 2600 Hz only for `deflect`, and the CSS rule `.hitmarker.deflect
   i` comes before `.kill` at the same specificity. `gameState.ts:575` and `gameAudio.ts:53` pass the kind through, and
   only `kill` counts a kill.
7. **The S11 pure functions match "Shared numbers".**
   - The tables (`gear.ts:17-52`) match exactly: `GEAR`, `GEAR_BY_STAGE` [none, none, armour, armour + helmet],
     `RESPONSE` (+ `liveTeam` 3 from A38), `SWEEP`, `MISSING`, `SHOTS`, `BREAKER` and `LATE`.
   - Edge cases are handled: `stageGear` clamps (NaN, negatives, fractions), `responseTeam` returns no team for
     NaN / < 1, and `sweepPoints` thins in gather order, sorts stably and handles empty input. `sweepStart` wraps and
     floors.
   - Small gaps are on the polish list (1-4).
8. **The warehouse lead fix is right.** The three patrol `enforcer` slots in `warehouseSectors.ts` (:54, :102, :157)
   are now `grunt`, so S11's validator accepts the Sector Ops data (postsWiring passes). No e2e reads those kinds.
   Embassy, mansion, port, refinery and warehouse still put `enforcer` in room squads. That only matters for a map with
   `MapLayout.guardAi` (a dev warning), and none of those is a live Sector Ops section.

## Polish list (not blocking)
1. `GEAR.helmetHits` is never read (`gear.ts:17`), so A35's undo "`helmetHits` 1 -> 0" does nothing. Either gate the
   helmet branch of `gearHit` on `GEAR.helmetHits > 0`, or change the undo text to "`setGear` never gives a helmet".
2. The validator messages name the slot (`guardAiData.ts:336-337`, "slot 1: kind 'enforcer' ...") but not the section,
   although `opts.section` is passed. The PLAN S11 "done looks like" says the message names the section, and today
   only the test's label does. Prefix with `section ${opts.section}` when it is set. `SectorDef.gear` is checked by its
   type only.
3. `responseTeam(stage, Infinity, out)` throws a RangeError at `out.length = Infinity` (`gear.ts:122`). It is data
   only: clamp `perStage` (for example to `MAX_LIVE`) or validate `SectorDef.perStage`.
4. Docs:
   - The `gear.ts` comments put `MISSING` in S13 and `BREAKER` / `LATE` in S14. BRIEF and PLAN have them in S14 and S15.
   - `sweepPoints` with `thin` 0 keeps identical points too, but the test is named "every distinct point".
5. Guards whose look already has headwear (cap, visor, hood, headset, beret in `config/enemies.json`) get the combat
   helmet on top. After the knock-off their own headwear stays, so a visor guard still looks helmeted. This is
   placeholder art for the visual pass (A45 / A48).
6. With voxel bodies on (`VOXEL_BODY`, detailed style), the gear parts are smooth part instances sitting over the voxel
   body. This is for the visual pass.
7. `deflect` calls `alert()` a second time after `strikeStagger` already did (`enemy.ts:1382`). It is harmless (an early
   return) but redundant.
8. `vfx.sparks` allocates two objects per spark (existing code). Deflects add a caller during firefights.

## e2e flake risk (written, never run)
- `e2e-stealth-ai` `helmet`:
  - Low risk. It seeds `Math.random`, the player is invulnerable (suite setup), the alarm is pre-set so no alarm run
    starts, the scenario reset clears the drops, and the sim time comes from `stepHeadless` (no wall time).
  - Every setup call returns a guard: `t.spawn` on open floor, the same spot as `lkp`.
  - `floor < 0.3` has margin: the rest is about 0.1 m.
  - Watch: if the floor under (0, 5) on that map is not at y 0, he settles during the first `step(0.1)`. The drop uses
    his y at the hit, and the margin covers that.
- `e2e-stealth-ai` `armour`:
  - Low risk. There are five shots 0.4 s apart, so staggers land at clock 0 and 1.6. `sinceStagger` is about 1.6 at
    the fifth shot even if a `step(0.4)` runs one tick short (1.53 >= 1.5).
  - The gap assert uses the test's own clock, and the 1..2 stagger count leaves room.
  - Between staggers the alerted grunt fires at an invulnerable player and may run for cover. Neither changes what is
    asserted.
- `e2e-takedown` `gear: one takedown`:
  - Low risk. It copies the passing front sub-case of `ground` (same `tp`, spawn, `passive`, `press`, `run(1.4)`), and
    the scenario reset clears the bodies, so `ko` means this guard.
  - It is unseeded, like the existing front case.
- First run: the laptop, in the next train or with `node scripts/run-e2e.mjs e2e-stealth-ai e2e-takedown` on
  `E2E_GPU=1`.

## Checks (desktop CPU 55% at each start)
- `npx tsc --noEmit -p .`: exit 0. It was rerun after the fix: exit 0.
- `npx eslint` on the 24 changed `.ts` / `.mjs` files: 0 errors. The two e2e scripts are ignored by the config. After
  the fix, `npx eslint src/ai/enemy.ts tests/gearWiring.test.ts` exits 0.
- `node --check` on `scripts/e2e-stealth-ai.mjs` and `scripts/e2e-takedown.mjs`: ok.
- `npx vitest run`:
  - gear, responseTeam, sweep, guardAiData and gearWiring: 5 files, 69 / 69. gearWiring after the fix: 21 / 21.
  - sectorGuardTags, postsWiring, squadWiring and sectors: 4 files, 81 / 81.
  - awareness, awarenessWiring, takedown, weapons-audio and weapons: 5 files, 86 / 86.
  - Total: 14 files, 237 tests, all pass.
- Not run, as ordered: the full `npm run check`, the full vitest, e2e and `npm run dev`.
