# MPFB2 base body data (offline only)

The operator pipeline's base body (`scripts/operators/py/build_body.py`, `py/mh.py`) reads MakeHuman CC0 data files:
the hm08 base mesh, body shape targets, vertex groups and the default rig weights. Nothing from MPFB is bundled or
shipped; the data lives in `build/operators/cache/mpfb2/` (git-ignored) and only shapes and skins the offline build.

## Sources
- Default: `scripts/operators/fetch-base-body.mjs` fetches the listed files (`scripts/operators/data/mpfb2-files.txt`)
  from the MPFB2 repository at a pinned commit (DECISIONS D12, Michael 2026-10-15).
- Zip route (anim-rig A7, Michael approved the download 2026-10-20 about 14:45: "Yes, download it"): set
  `MPFB2_ZIP=<path>` to take the same files from the official extension zip, nothing fetched.
  - Version: MPFB 2.0.18, `add-on-mpfb-v2.0.18.zip`, from extensions.blender.org as linked from
    makehumancommunity.org. Kept on Michael's desktop in `C:/NightShift/downloads/mpfb2-2.0.18/` (its own folder; nothing
    in it is run, the files are extracted to a temp folder with Windows' `tar` and copied).
  - The zip's `data/` folder is the repository's `src/mpfb/data/`; the repository-root `LICENSE.ASSETS.md` is not in
    the zip.

## Licences
- MPFB add-on code: GPL. Not used: no MPFB code is run or copied (`py/mh.py` reimplements the reading in numpy).
- Body assets (mesh, targets, weights): CC0 1.0 (MakeHuman community). Credited in `docs/art-credits.md`.

## Use
`MPFB2_ZIP=C:/NightShift/downloads/mpfb2-2.0.18/add-on-mpfb-v2.0.18.zip npm run operators:build -- wren` then
`npm run operators:lods -- wren` (Blender `-b`, under the heavy lock). First used for the anim-rig rebake of Wren's LODs
(2026-10-20, `docs/archive/anim-rework/RIG.md`).
