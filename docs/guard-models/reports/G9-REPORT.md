# G9 report: tests and docs

Branch `feature/gm-g9` (off feature/guard-models 416915c1). Sonnet. No `src/` edits; no e2e or Blender run.

## What
### Vitest (PLAN G9 list, every file exists)
Existing files were extended, no assert was loosened.
- `tests/guardKit.test.ts` 10 -> 14: PLAN section 5 limits as numbers, shown and buffer budgets at all three LODs (was
  LOD0 only), head / hair cap / piece ceilings, heads per base and the id lists equal the shared contract.
- `tests/guardVariant.test.ts` 30 (unchanged): already covers determinism over 128 seeds x kinds x maps, the 15%
  distribution rule, the archetype matrix and `applyGear`.
- `tests/gearMask.test.ts` 10 -> 11: a head variant swap and a hair cap toggle change only those pieces' vertices; no
  head named leaves only the body.
- `tests/guardLook.test.ts` 13 (unchanged): wire round trip of all 128 seeds, parser clamp, restart, team seeds,
  `PROTOCOL_VERSION - 1` refused.
- `tests/guardFigure.test.ts` 13 -> 14: a head variant swap hides exactly the old head's gvis alpha bytes and index
  triangles and shows the new one's, body and tints untouched, same list = no rewrite. The rest of the PLAN list was
  already there (shared buffers per (base, LOD), gear toggles, culling box, ragdoll world path < 1e-4 m, flash / heat,
  dispose).
- `tests/guardAssets.test.ts` (new): 4 tests always run, 3 skipped (`describe.skipIf` on no `guard-<base>-lod0.glb` in
  `src/operators/assets/guards/`; comment says G4 lands them). The always-run part tests the reader on a synthetic GLB
  (`tests/helpers/guardGlb.ts`): triangles per `_PIECE`, buffer triangles, joints, influences, one mesh / material, the
  KTX2 header, and that the measured-kit helper reproduces `shownTris` from the kit's own numbers.
- Totals: 6 files, 86 passed, 3 skipped. `npx tsc --noEmit -p .` clean; eslint on the four test files clean.

### e2e (`scripts/e2e-coop.mjs`, written, NOT run)
Existing asserts untouched. Both pages get `?guardmodels=1` when `E2E_GUARDMODELS=1` (the flag is default off); the
visible-piece asserts run only when the host's guards have figures (`gbody.shownPieces()` non-null).
1. After "client mirrors host enemies": every host guard has a 7-bit seed, seeds differ, and every client puppet carries
   the host's `look` (and, gated, the same sorted `shownPieces`), matched by id, polled.
2. In the S9 deflect block, after "client helmet falls": the helmet bit (`al & 32`) is gone on the client and
   `Enemy.helmet` on the host, the armour bit stays, and (gated) neither side shows a `helmet_*` piece and both keep
   `vest_soft`.
3. In the course restart loop (client then host holding): the held guard's kind and seed before; after the bay respawn a
   host guard of that kind has the same seed, the client's puppets of the respawned guards carry the host's seeds, and one
   has the old seed. (The "section" restart used is the Course bay restart; Course guards key on the authored point.)
Not verified by a run: asserts 1-3 are untried. `node --check` passes. The seed asserts need no flag.

### Docs
- `docs/systems/world-and-characters.md`: new "Guard figures" bullet (bases, sharing, look, gear, files and seam, tests);
  the old "realistic guards later" line now points to it.
- `docs/systems/performance.md`: the guard figure budget line from PLAN section 5 (triangles, textures, bones, buffers,
  download) and the section 6 fit.
- `docs/systems/coop.md`: the look bits under the G6n bullet (layout, seed rule, how the client builds the same man,
  bodies, tests).
- `docs/art-credits.md`: MPFB2 rows now name the guard bodies and faces.
- `TESTING.md`: one desktop item (variety, faces, helmet knock-off, same looks after a restart, bodies; `?guardmodels=1`
  until G8).
- `changes/feature-guard-models.md` (one fragment, rewritten: player text plus the wire bit and tests / docs).

## Decisions assumed
- `guardAssets.test.ts` budgets: head <= 4,000 (+500 for the LOD0 eyes that sit inside the head piece), hair cap 1,000
  / 300, piece ceilings from the kit, texture widths albedo 4096 / 2048 / 512 and normal / ORM 2048 / 1024 / 256 with
  height half the width (section 5 says "512 / 256" for LOD2; read as width), mips > 1 at every LOD. Piece triangles are
  counted by a triangle's first vertex's `_PIECE` (as `groupByPiece`).
- Texture roles come from the glTF material (baseColor = albedo, normal, metallicRoughness / occlusion = ORM); images may
  be embedded or an external `.ktx2`.
- Section restart in e2e = the Course bay restart already in the suite (no Sector Ops restart exists in `e2e-coop`).

## Asserts that wait on G4's files
- `guardAssets.test.ts` three skipped tests (per-base LOD budgets, shield, download total) run once
  `guard-<base>-lod0.glb` exists in `src/operators/assets/guards/`; they have never run on a real file, so expect a first
  round of reader or budget-interpretation fixes. `E2E_GUARDMODELS=1` piece asserts are meaningful on the stand-in only
  as "tracked", visible only with G4's pieces.

## Open items
- Run on the laptop: `e2e-coop` (without the env: seed asserts and regressions; with `E2E_GUARDMODELS=1 E2E_GPU=1`: pieces
  too) and the rest of PLAN G9's e2e list (`e2e-enemies`, `e2e-combat`, `e2e-takedown`, `e2e-stealth`,
  `e2e-guard-carry`, `e2e-sectorops`, `e2e-ctcourse`, `e2e-netmove`, `e2e-offline`).
- The Sector Ops section restart seed (`slotLook`) is covered by `guardLook.test.ts` only, not e2e.
- `performance.md` still lists no measured guard numbers; G8 fills them.
