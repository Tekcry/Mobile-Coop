# artpol + frzpol check (fresh Opus checker, 2026-10-23)

Batch: `feature/sector-redesign-artpol` @ 670788e3 and `feature/sector-redesign-frzpol` @ d1b46acb, both cut from #226
head 2276483a. Each diff read in full (`git diff 2276483a..<head>`), plus the build reports `artpol-build.md` and
`frzpol-build.md`.

## Verdict

| Branch | Verdict | Blocking |
| --- | --- | --- |
| artpol | **PASS** | none |
| frzpol | **PASS** | none |
| Merge of both | clean | no overlapping files |

## A. artpol

1. **Dressing output unchanged: confirmed by my own dump.** The report names no script, so I bundled a dump entry
   (`new LevelBuilder()`, `buildCampus(b, { dress: true })`, then JSON of every box (the new `art` flag stripped),
   the cylinders and `layout.campusArt`) against `git archive` trees of 2276483a and 670788e3 (esbuild, node). Both
   give 1532 boxes, and the two 559,945-byte dumps are byte-identical (`cmp`). The optimisations are pure refactors,
   checked one by one:
   - `segRectDist` corners in place (`geometry.ts:145`): same corner order (-1,-1), (1,-1), (1,1), (-1,1), and the
     same float expressions (`(ux*hx)*±1`), so the results are bit-identical.
   - `BoxGrid.query` stamp (`keepouts.ts:217`): same set, still sorted and unique.
   - `backGap` (`keepouts.ts:584`): every sample is within 0.15 of the middle, so a box more than 0.151 off the middle
     can never come within 1e-4 (triangle inequality). Non-collide boxes were already ignored, and the order is kept.
   - `blocked` circumcircle rejects (`keepouts.ts:686`, `:702`): segRectDist >= centre-to-segment minus the
     circumradius, so a reject implies "not blocked". The tube AABB reject (`keepouts.ts:754`): `minDistToShape` is
     the point-to-OBB distance, which is at least the gap between the AABBs on any one axis.
   - `planRoom` `boxesAt` (`dressRules.ts:267`): the grid covers the section bounds + 16 m with every box below
     `nBoxes` (non-collide boxes included), and the boxes written since are appended. `floorAt` / `ceilingAt` are
     max / min reductions, so order does not matter. `greyOnly` matches the old `slice(0, k.nBoxes)`.
2. **K8 / K9 narrowing hides no real conflict.**
   - K8 (`keepouts.ts:831`): the old code skipped a ray whenever it touched the own piece anywhere. The new code skips
     only when the hull entry is within 2 cm before the piece's entry. That is strictly stricter, so nothing that was
     reported before is hidden now.
   - K9 (`keepouts.ts:849-857`): the footprint skip now holds only in the piece's height band, which is stricter. The
     only relaxation is a piece with listed `parts` out of the band (rods measured at 0.05 off their surface instead
     of the hull at 0.3). I checked it against `hero-s4.glb`: above y 1.0, basketRun's steel mesh has only vertices
     at x ±0.01 and z ±0.47..0.49. Every other material stays at or below y 0.4, inside the band. That matches
     `campusS4Dress.ts:117` (rods x 0, z ±0.48, y 0.4-3.0; r 0.015 covers the 0.0141 half diagonal). There is one
     placement per module (`dresser.ts` `skinRow`), so one rod pair per placement is right.
3. **P7 light parity holds.** `detailPass.ts:50` skips `b.art`. Both the drawn dressing (`levelBuilder.ts:563`) and
   the light shapes (`lightShapes.ts:33`) call `detailPieces` on the same boxes, which carry `art` from
   `writeArtBoxes` (`catalogue.ts:290`) before `prepare`. The campus light hash changes once (fewer dressing boxes).
   The bake key is content-based (`canonicalLightSet`), so the first campus load re-bakes, as expected.
4. **P8 has no double dispose.** `campusArtRender.ts:112-113`: `r.dispose()` disposes its draws, merges and materials,
   then clears its lists (idempotent). The `scene.meshes.slice(n0)` copy is taken after that, so meshes already
   disposed have left `scene.meshes`. Nothing is hidden before the try ends (`hidePieces` comes after it).

Behaviour changes that are by design: P2 (`keepouts.ts:649`) and P3 (`keepouts.ts:328`, segment test, a superset of
the old end test) change the rules, but no placement moved (the dump above).

## B. frzpol

1. **Render only.** Outside the freeze, `SectorGuardFreeze` state is read only by `sectorMode.ts:1029-1031` (debug).
   `views` (`sectorMode.ts:235`) only reads doors and breakables. `Doors.viewVersion` (`doors.ts:350`) changes only
   its own private `viewClear` / `viewV`. No ray mask, `src/ai`, `src/net` or PROTOCOL change.
2. **Ray budget is bounded.** Tests per evaluation are capped at `tests < TESTS_PER_EVAL` (8). `occluded3` casts at
   most 7 points + 2 probes + 2 landings = 11, each plus at most `SEE_THROUGH_SKIPS` recasts (`seeThroughRay`).
   Urgent verdicts (cut, view bump, re-entry `bits & ~prev`, `sectorGuardFreezeView.ts:206`) that miss the budget are
   drawn. No allocation per frame: kept typed arrays and vectors, `grow8` / `grow16` only when the list grows, and
   the `views` closure is made once. `Doors.viewVersion` allocates only when the door count changes.
3. **viewVersion.**
   - Doors: it bumps on a 0 -> 1 change of `body === null || leafSeeThrough(d)`, the same test `seeThrough` uses for
     the ray, so a crack, ease / ajar, swing or removed body each bumps once, never per frame while swinging. A close
     does not bump. That is correct: a close only hides more, so no hidden verdict goes stale.
   - Breakables: it bumps once per `open` (`breakables.ts:154`).
4. **Knee and shadow.** The knee is the 5th body point (`sectorGuardFreeze.ts:170`). `shadowProbe` / `shadowLanding`
   (`:195`, `:214`) cost 1 ray on flat ground (lands on his floor, then break) and at most 2 + 2 at a roof edge.

## Merge

`git merge-tree --write-tree 670788e3 d1b46acb` -> 0cf752a9 (exit 0, no conflict). The two diffs share no file
(artpol: `src/world/campusArt/*`, `detailPass`, `levelBuilder`, `campusS4Dress`, `facilityProps`; frzpol:
`sectorMode`, `sectorGuardFreeze*`, `doors`, `breakables`).

## Tests (this checker, under sr-slot locks)

- artpol: `npx tsc --noEmit -p .` clean. vitest campusArtKit, campusDressRules, campusArtGameplay, campusArtLight,
  campusArtRender, campusS4Dress and campusS2: 7 files, 155/155 passed.
- frzpol: `npx tsc --noEmit -p .` clean. vitest sectorGuardFreeze, sectorGuardFreezeView,
  sectorGuardFreezeSeeThrough, doors and doorPeek: 5 files, 51/51 passed.
- No e2e (as ordered).

## Polish (not blocking)

1. frzpol `sectorGuardFreezeView.ts:226`: over the budget, any non-urgent hidden verdict up to `STALE` (8)
   evaluations old is kept frozen. That includes a routine RETEST-due verdict (age 5), although the comment says
   "an edge re-test". At 2276483a an over-budget guard was drawn, so in a saturated evaluation (edge guards re-test
   every evaluation and take the 8 slots) a guard who steps into plain view can now stay undrawn for up to 8
   evaluations instead of 4.
   - **Fix:** keep only `memoEdge[i] === 1 && memoAge[i] <= 1`, or set `STALE = RETEST`, or test urgent and due
     verdicts before edge re-tests.
   - **Done looks like:** the test "over budget, a due non-edge hidden guard is drawn".
2. frzpol: `rays` (debug) counts primary casts only, not the see-through recasts. Name it, or count the recasts.
3. artpol: `overhang.parts` is listed only for basketRun. The genset stack is still measured by its hull out of the
   band, which is stricter, so this is fine for now.
4. artpol P8: `slice(n0)` assumes the build removes no pre-existing scene mesh. That is true today, so a comment is
   enough.

## Laptop checks for the merged batch (Test Runner, flag on vs `?guardfreeze=0`)

- Campus loads with the art, and the first load re-bakes the light (the campus hash moved: art boxes lose their
  detail boxes). The art pieces look the same, with no stray detail slabs on them.
- Dressing load time: compare the campus load against #226 (expect a shorter dress pass).
- S4 B-cage: `las-tray` beam under the basket run reads cleanly past the hanger rods.
- Door peek into a patrolled room: guards show from the first cracked frame. Break the S1 window (14, 1.5, -76) with
  a guard behind it: he shows on the break frame.
- A quick 180° turn back onto a guard, and a guard stepping out of a doorway or corner: no pop-in.
- S5 roof guard behind the parapet: his moon shadow on the ground below is drawn.
- S5-worst at 24 guards: CPU p95 A/B, and `__sector.debug().guardFreezeRays` at or under 88 per evaluation (plus
  recasts).
