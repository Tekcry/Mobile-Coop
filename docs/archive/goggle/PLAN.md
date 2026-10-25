# Goggle job - plan

## Parked (2026-10-19)
**Michael parked this job (DECISIONS.md M3): Wren keeps her current goggle, no redesign.** He rejected the A / B / C
scratch options. Nothing below is to be built. The one remaining piece, the stowed-on-brow export (G161), moves to the
cleanup job after the core-loop playtest. The plan below is kept as history.

## Resume point (2026-10-19, before parking)
- **State:** Michael answered (DECISIONS.md M1, M2): the surround is the device, not the screen edge (step 2 dropped);
  before picking A / B / C he wanted quick scratch prototypes: `docs/goggle/prototypes/options.html` (rejected, M3).
- **Report to** the Night Shift | Orchestrator session (CLAUDE.md "Orchestrator"): step start / end, PR, Michael needed,
  blocked. It owns `docs/ROADMAP.md` and merges the PR.
- **Laptop = light work only** (Michael, 2026-10-19): docs, planning, small code edits. No e2e, full test runs, builds
  in loops, Blender renders or heavy subagents; those run on the desktop (steps marked "desktop" below).
- **Next:** none (parked, M3).

Read BRIEF.md first. The laptop writes docs and small code edits; the Blender build, the LODs, the KTX2 pass and every
GPU check run on Michael's desktop (Michael, 2026-10-19).

## 1. What reads as CT about the real device
The research (docs/ct-research) records how the goggle is used, not its housing shape: night, thermal and electro modes
(kit-design-digest 1.5), a lamp colour per player as the co-op tell (blue Player A, red Player B; enemies cannot see
it), and overlays that "slide over the HUD like a lens". The bible (5.14) and the operators spec (SPEC 1, 3.3) add the
look we keep. Taken together, what reads as CT at a glance:
- **Optics stand forward of the face.** The goggle is a device on the head, not a visor: lenses sit a few centimetres
  ahead of the eyes, so the head's silhouette has a distinct snout in profile.
- **The glow is the signature.** In the dark the player sees two points of the operator's colour first, then the body.
  The glow is display light leaking through the lens, strongest at the centre (SPEC 3.3, D13).
- **Compact and close.** The housing hugs the brow and cheekbones; nothing wide or helmet-like; the hood and the head
  harness frame it.
- **Worn on the head, not held.** A strap or harness carries it; it changes position between "off" and "on" (ours: brow
  and eyes, G73, G169; no flip arm).
- **Not the screen tunnel.** The CT view is the whole screen in the mode's colours with grain (G101); the research
  records no binocular mask.

Never taken: three lenses, the reference's housing or mount shape, any name (G5, G6, G69). Moth's signature is "round
twin lenses on short barrels" (SPEC 1), so Wren's goggle must not become that.

## 2. Design directions (Michael picks one)
All three keep two lenses, the band and the brow / eyes positions, the per-player glow colour and the existing runtime.

**A. Slim shroud, refined (the current goggle made right).** Keep Wren's square single shroud but cut its depth and
corners: a low, rounded-rectangle housing, the lip round the objectives reduced to a thin bezel, the objectives pushed
forward 10-15 mm so they stand proud of the shroud, the nose notch deeper so it sits closer to the face.
- Pros: least work (the same `head_kit.py` section, the same band, lugs and cable); keeps Wren's documented signature
  (SPEC 1); fixes what most likely "looks weird" (a deep box with a wide lip reads as a mask, not a device).

**B. Brow bridge with forward optics.** A narrow brow bar across the hood carries two short rectangular optic blocks
(not round barrels, to stay clear of Moth) that stand 30-40 mm forward over each eye, joined low by a slim nose bridge;
the eyecups behind them. The glow sits at the front face of each block.
- Pros: the closest to the CT read (a device with optics projecting from the face, a clear snout in profile and two
  glow points well ahead of the head); still original (two blocks, square-cornered, on a bar).
- Cons: more geometry and a new stow check (the blocks must clear the hood's brow when slid up).

**C. Single wide window.** One low housing across both eyes with a single wide, slightly curved front window; the two
displays glow behind it as two soft pools.
- Pros: the most original and the cleanest silhouette; the glow reads as one band in the dark, easy to see at range.
- Cons: the furthest from CT (reads as a visor, not optics standing forward); two glow points become one shape.

Recommendation: **A** for the prototype (smallest change, keeps the spec), **B** if Michael wants it to read more like
CT's device in profile.

## 3. The screen surround (reading 2)
`src/vfx/cinematicPost.ts` night branch: the eyepiece factor darkens the screen to 6 % outside a rounded window. Change to
the full screen in night vision with a light corner falloff (about the cinematic vignette's 0.35, not a tunnel), and on
toggle a short lens slide-in of the mode's picture (CT: "slide over the HUD like a lens"). Thermal and electro keep
their branches. Small, Babylon-free constants, a unit test on them; e2e-stealth-ai `vision-detect` and the darkness
suite still pass. Laptop-safe (no GPU run); the look check is "pending PC run".

## 4. Files the build touches
Offline pipeline (Blender 5.2.2, headless, desktop):
- `scripts/operators/py/garments/head_kit.py`: the goggle section (housing, nose notch, objectives, eyecups, mode
  switch, status light), the stowed pose (`STOW_DEG`, `STOW_DZ`, `stowM`), band lugs and the cable plug. `H_HALF` and
  `CUP_L` hold the housing size.
- `scripts/operators/py/garments/head_common.py`: `lens_assembly` (the objective barrel, the coated glass, the glow).
- `scripts/operators/py/materials.py`: the lens glow and housing materials.
- `scripts/operators/py/check_garment.py`, `rigid_skin.py`: clearance checks and one-bone skinning (G170).
- `scripts/operators/py/bake_lods.py`, `scripts/operators/py/export_gltf.py`, `scripts/operators/export-gltf.mjs`:
  both positions exported, the `_GOGGLE` vertex class (0 body, 1 in use, 2 stowed) on every LOD.
- `scripts/operators/py/grip_morphs.py`: must be re-run after every Wren re-export (weapons A8: it refuses an already
  patched file, so the finger morphs are lost if skipped).
- Outputs: `src/operators/assets/wren/wren-hero.glb`, `wren-lod0.glb`, `wren-lod1.glb`, `wren-lod2.glb` (then
  `npm run operators:ktx2`).
Runtime (laptop-safe edits):
- `src/operators/runtime/goggle.ts` (`GoggleState`, `partitionGoggle`, `GOGGLE_GLOW`): already swaps in use / stowed
  index ranges; once the stowed set is exported G161's "over the eyes in both states" ends with no code change.
- `src/operators/runtime/figure.ts` (glow colour per player, G135), `src/operators/lodChecks.ts`,
  `src/operators/runtime/manifest.ts`.
- `src/player/goggleGlow.ts`: the old rig's glow points; its comment still says "tri-lens" (fix the wording, G6 / G69).
- `src/vfx/cinematicPost.ts`: the screen surround (section 3).
- The menu's original goggle symbol (G69, second half) is a UI asset; separate small step, after the device.

## 5. Build steps
1. (laptop) Michael picks the direction and confirms which surround he meant (the orchestrator's dashboard).
2. Dropped: the screen surround (section 3); Michael chose the device (M1).
3. (laptop) Write the chosen direction into `head_kit.py` as code with its measurements (housing size, objective
   stand-off, stow pose); no render here. Record it as a decision in `docs/goggle/DECISIONS.md` and the operators SPEC 3.3.
4. (desktop) `npm run operators:build` for the head kit, the garment check (clearance to the hood, eyecup seal, stowed
   gap), close-up render sheet of both positions, sent to Michael.
5. (desktop) One independent check (blocks only on broken, clipping, three-lens look or a copied shape), at most one
   fix round.
6. (desktop) Export the hero and LODs with both positions (`npm run operators:export`, `npm run operators:lods`), re-run
   `grip_morphs.py`, `npm run operators:ktx2`, `npm run operators:check`.
7. (desktop) In game: vision off (brow, dim) and on (eyes, full), player 1 green and player 2 cyan, the menu hero;
   `E2E_GPU=1` screenshots, perf budgets; full e2e before the PR.
8. Docs: CHANGELOG ("Unreleased - goggle"), TESTING.md, bible 5.14, SPEC 3.3, `docs/systems/graphics-quality.md` if the
   surround changes; then the PR to master.

## 6. Open for Michael
- Which surround: the device on her face, the night-vision screen edge, or both.
- Direction A, B or C. G169 says "the original housing stays"; A keeps it refined, B and C replace it (his new note
  would then supersede that part of G169).
