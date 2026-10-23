# artnext check (Opus checker, 2026-10-23)

Batch: `feature/sector-redesign-artnext` @ 3ebc5e1e (lane A 389b63bf, lanes B + D) and
`feature/sector-redesign-artnext-c` @ 56557b58 (lane C, C1-C6), both on `feature/sector-redesign-artpol` @ 72e87171.
Worktree: `C:/NightShift/Mobile-Coop-sector-redesign-artnext-chk` (detached; local merge commit ca75a327, not pushed).
Briefs read in full: `cloud-queue:briefs/sector-redesign-artnext-ABD.md`, `...-artnext-C.md` (lead notes included).

## Verdict: PASS

No blocking items.

## Join
`origin/feature/sector-redesign-artnext-c` merges into 3ebc5e1e with no conflicts (no file shared: lane C touches only
`src/game/sectorGuardFreezeView.ts`, its two tests and its report). All runs below are on the joined head ca75a327.

## Runs (joined head, `--maxWorkers=2`, slot lock sr-slot-3 taken and released)
- `npx tsc --noEmit -p .`: clean (exit 0).
- Batch 1, 12 files / 149 tests pass: sectorGuardFreeze, sectorGuardFreezeView, sectorGuardFreezeSeeThrough,
  campusArtKit, campusDressRules, campusArtRender, campusArtLight, campusS1Dress..campusS5Dress.
- Batch 2, 14 files / 287 tests pass, none skipped: campusArtGameplay (all sections, incl. A1 order test),
  campusRuntimeNav, campusS1..campusS5, campusGlass, campusPosts, campusGear, campusArtPerfProbe, kestrelCampus,
  sectorRestart, warehouseDress.
- Total 26 files / 436 tests, all pass. Not run (name matches only, unrelated): voxelArt, g7CloseQuarters, mocapShortStart.

## File sets
- Lanes A/B/D: `src/world/campusArt/{campusArtRender,campusKit,catalogue,dressRules,dresser,keepouts}.ts`,
  `src/world/maps/campusDress.ts`, `campusS1..S5Dress.ts`, their tests, TESTING.md, world-and-characters.md, fragment,
  report. `campusKit.ts` / `dressRules.ts` are outside lane A's header list but cited by A8 / A6 in the brief: in scope.
  No freeze, AI, lighting (`lampMath`, `lightField`, `bakedLamps`, `lightRig`, `charShadows`) or `src/voxel` file.
- Lane C: `src/game/sectorGuardFreezeView.ts` + 2 tests + report. No `campusArt/*`, `campusDress.ts`, `campusS*Dress.ts`.

## Items
- A1 already done on base (gaps from bare greybox); tagged guard + test-only `DressOrder` added; order test passes.
- A2 `skinFace`: `skin` class (writes no box, `writesBoxes` false; renderer hides only `skin-hide` boxes, so the wall
  stays drawn). Rotation matches `artToWorld`; `blocked` runs `skinFit` (face branch: within face, front <= ART_PROUD,
  back not through far face) then the wall rules. Correct.
- A3 `fitRange` per piece, default 0.8 / 1.25; `checkScale` reads it. Correct.
- A4 `ArtRuleError { rule, msg }`, `tryAdd` returns index or -1, logs refusals, rethrows non-rule errors. `add` now also
  refuses greybox / placement box overlap (as `checkDressing`); no current placement changed by it.
- A5 already done on base; B7 removed the post-call group writes (S4, S5).
- A6 decals: visual, no box, hull < 0.05, within 0.05 of the floor; exempt only from NAV_RULES (K1-K6, K13) and greybox
  overlap; C, K7-K12 still apply. Visual only, so nav / cover / light unaffected.
- A7 frame exemption: visual only; jambs/head as shapes. No catalogue has a `frame` entry yet, so no production use.
- A8, A9 (docs), A10 (comment): done.
- B1-B9 as reported (B4 dropped rule S, vault frame / monitor wall / leaf / deposit dropped with rule ids, S5_OMITTED
  asserted). artCounts within 40 draws in every section (tests assert).
- Side effect, by design and reported: the A6 decal exemption lets `F:glandPlate` take its first base-pass spot, which
  moves the S2 `F:switchgearPanel` row 0.8 m south (4 solid art boxes, `art: true`). Gameplay gate S2 and campusArtLight
  pass; the campus light hash moves 1mqg481 -> vnqe3i (not pinned anywhere in code). No new collide box.
- C1-C3 already done on base (verified: `sectorGuardFreezeView.ts:213-216`, `sectorGuardFreeze.ts:138,170`,
  `:190-226`). C4 test, C5 STALE = RETEST + test, C6 recast counter: render-only debug counter, read only by
  `sectorMode` debug(); no per-frame allocation (`?.` / `??` on a number field, no closure or vector per frame). Host and
  client unchanged (same construction path as before). C7-C9 deferred by the lead note, untouched.

## Polish list (non-blocking)
1. `TESTING.md` "Campus art (artnext)": "S1 and S2 at 39 of 40" is stale (now S1 35, S2 33); the "no greybox showing"
   line names S3 lockers, S5 vault frame and monitor wall, which were dropped.
2. `docs/systems/world-and-characters.md` "Campus art kit": Budget line stale (S1 39 / S2 39 / S3 29 / S4 25 / S5 30,
   1852 placements; now 35 / 33 / 27 / 19 / 29, 1921); "Not built yet" still says lane B is not built.
3. `changes/feature-sector-redesign-artnext.md`: "Freeze polish C1-C6" - only C4-C6 are new (C1-C3 were on base); C7-C9
   pending.
4. `dresser.ts` `refusal()`: each solid / see `add` walks every earlier placement and allocates `shapesOf` arrays - load
   time only, not a hot path; worth a look if GPU checklist item 4 (campus load time vs #226) shows a regression.
5. `campusS5Dress.ts` B8: removes the base pass's portraits after `base()` by a literal filter (z 18.15, y > floor + 0.05)
   and decrements `report.placed`; brittle if the hall wall moves. A pre-`base()` reservation would be cleaner.
6. A7 frame code is dead until a catalogue lists a `frame` piece (S5 vault frame open item).
7. S4 floor tiles now run under racks and pod ends (72 tiles): check the GPU shots for z-fighting / hidden tiles.
8. C4 test drives both rigs with `animate` directly, so it proves the rig, not the in-game frozen tier (that is C7).
9. Lead options already listed by the builder: thin-panel depth for `meshPanel`, per-call `proud` for `monitorWall`, a
   <= 0.35 m locker piece for S3.
