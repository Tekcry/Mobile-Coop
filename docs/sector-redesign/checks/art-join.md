# Campus art join (feature/sector-redesign-art)

Integrator: Opus 5.5, 2026-10-23. Branch `feature/sector-redesign-art`, cut from `feature/sector-redesign-polish` 4a65d692.
Brief: `briefs/ART-PLAN.md` section 5 (batch 3 integrate), the five `checks/art-s<N>-build.md` reports, `checks/art-kit-build.md`,
`checks/art-kit-check.md` (P1 / P4 gate), `checks/gear-sweep.md` / `gear-check.md`.

## ART-S2 finished first
The S2 builder died at an account swap after 7ac5acdf. On `feature/sector-redesign-art-s2`: 4b2324ea deletes the stray
`tests/campusS2Probe.test.ts` (committed in WIP 9859afd5); every brief item (A132-A136) was already built, so only the report was
missing: 761c0034 adds `checks/art-s2-build.md` after tsc + `campusS2Dress` 12 / `campusArtGameplay -t S2` 8 /
`campusArtLight -t S2` 1 / `campusS2` 40, all green. Pushed.

## Merges (no ff, in order)
| Merge | Head merged | Conflicts and resolution |
| --- | --- | --- |
| e71d0b1c | art-kit 31b72d65 (incl. P1 ledge gate, P4 split gaps) | `src/world/levelBuilder.ts` `door()`: polish added `armoured` (E10), the kit `leaf: 'slide'` (marlow-final port). Both kept: one opts type with both fields, both setters. `anchors.ts` auto-merged with both `Door` fields. |
| fbdce51c | art-s1 b66c35aa | none |
| 716a9575 | art-s2 761c0034 | `scripts/operators/py/__pycache__/common.cpython-313.pyc` (binary, tracked, rewritten by every Blender run): removed from the index |
| 79feee41 / 5c60fa55 / 0a7969f1 | art-s3 b645707f / art-s4 ddc8e6a1 / art-s5 1a588f84 | the same .pyc (modify / delete): kept removed |
| d598c1b1 | gear 275502bf (gear tags, sweep points, checker PASS) | none |

`.pyc`: no `__pycache__` / `.pyc` file is tracked now; `.gitignore` already had `__pycache__/`, `*.pyc` added (d5b34b2b).
Dressers own their section files, the kit its shared code: no dresser file conflicted with another.

## Join fixes
- **Greybox pin (8145b451).** `campusArtGameplay` (A119) pinned the greybox at the ART-KIT cut (p3 b26c5925, `1297/171/9e5541f8`).
  The art branch sits on polish, whose greybox differs (glass, posts, armour, the S4 fuel tanks: 1303 boxes, 114 cylinders).
  Verified: `campusOps.build` in a throwaway worktree at 4a65d692 hashes to `1303/114/acb8cfbb`, the same as the art branch's
  `buildCampus(b, { dress: false })`. The pin moved to it (the greybox is unchanged by the art merge, byte for byte).
- **S1 L1 (143dafe2).** `monitorBank` (18.8, -73.15), `keyCabinet` (15.2, -73.15), `visitorBoard` (14.15, -78.0) moved onto the
  gatehouse's inner wall faces; all three now place (rule V passes). `S1_OMITTED` is down to the brief's bikeRack K6 / parkBench K1;
  the S1 test pins the new positions. S1 draws 37 -> 39 (screen, brass).
- **Kit gap: circuit group on skins (bb5fbbd6).** `skin`, `skinHide`, `skinCyl`, `skinRow` take an optional `group` (S1 L5, S2,
  S4, S5 all listed it). Additive: the dressers' post-call `placements[i].group` lines still work and were left as they are.
- **Kit: K2 sweep points (bb5fbbd6).** ART-PLAN 4.3 K2 names `sweep` points; the kit had none to read (`SectorDef.sweep` came with
  the gear lane). K2 now caps each S4 / S5 sweep point at the ground storey (radius `KEEP.patrol`). All of them are route points,
  so K1 already covered them: no placement changed by it.

## Not applied (bigger than kit / dressing data; for the checker or a later slice)
- S1 L4: cars in 2 of 4 colours (four colours = 53 draws of 40; needs merged car meshes or fewer car materials).
- S2 L7: F `greenWall` refused by rule V at both spots (a 1.2 m visual part in the body band): needs a see box or a flush-depth
  allowance in the kit; left out.
- S3 kit gaps: no `skinFace` (thin panel on one face of a box), fixed 0.8 fit floor, `add` errors have no rule id, no `tryAdd`.
  S3 also dropped the gowning bench and gown lockers (K5 / K2 everywhere in that room).
- S4 L1 / L2: fit limit 1.25 rejects `batteryRack` (1.0 deep) and `meshPanel` (3.0 high) - worked round with H4 pieces.
  S4 L3: floor decals (`floorTileGrid`) are kept out like boxes and `add` snaps y to 1 cm, so 5 tiles instead of the hall.
- S5: no door-frame exemption under K1 (vault frame and leaf left out), `kitchenRun` / `wallCupboards` not `fit` (S5 kitchen
  counter 0.8 deep would still be 1.33 over the 0.6 module), rule C refuses floor rows in route rooms (deposit wall, monitor wall).
- Gear report says `campusGear` has 10 tests; this branch runs 8 (all pass): a report miscount or two tests elsewhere, not checked.

## Gates (desktop, slot lock `C:/NightShift/scratch/sr-slot-1.lock`, one file at a time)
- `npx tsc --noEmit`: clean.
- vitest, single files, at the join head: campusArtGameplay 53 / 53 (all five sections: legs, protected nav cells, patrols, cover,
  lips, cameras / lasers, reach, `checkDressing` + budgets, **P1 ledges** and **P4 split gaps**, self-tests); campusArtKit 13;
  campusArtLight 5 (real bakes, every protected point within 0.02); campusArtRender 3; campusDressRules 25; campusGear 8;
  campusGlass 4; campusPosts 3; campusRuntimeNav 3; campusS1 51; campusS1Dress 13; campusS2 40; campusS2Dress 12; campusS3 32;
  campusS3Dress 12; campusS4 41; campusS4Dress 13; campusS5 29; campusS5Dress 6. All green; no dressing blocked a route, cover,
  nav, ledge or lip, so no dressing was moved for the gates.
- Not run (the lead queues them): `npm run check`, e2e (`e2e-sectorops:6`, `e2e-coop`, `e2e-netmove`, smoke), GPU shots and perf.

## Draws per section at the join (`artCounts`, budget 40 draws / 150 k tris / 2500 placements)
| Section | Draws | Triangles | Placements |
| --- | --- | --- | --- |
| S1 | 39 | 13.1 k | 76 |
| S2 | 39 | 50.9 k | 777 |
| S3 | 29 | 16.0 k | 189 |
| S4 | 25 | 78.1 k | 563 |
| S5 | 30 | 25.1 k | 247 |
| Campus | 162 | 183 k | 1852 |

(S2 777 vs 781 and S3 189 vs 190 standalone: the polish greybox's glass / posts move a few base-pass spots; base pass only.)

## Open items for the checker
- Fresh checker over the join (A127-A152): diff each slice branch against its ownership list (A157); the levelBuilder `door()` merge.
- Batch 3 (lead, laptop GPU): `campus-art-shots` 35 views before / after, guard-cap and `perf.mjs` budgets (ART-PLAN 6; S1 and
  S2 sit at 39 of 40 draws), `e2e-sectorops:6`, `e2e-coop`, `e2e-netmove`, smoke; `npm run check` on CI.
- A156 docs not done here: `TESTING.md` "Campus art" checklist, `docs/systems/world-and-characters.md` "Campus art kit",
  `docs/sector-redesign/STATE.md` (the lead's).
- The not-applied kit gaps above.
