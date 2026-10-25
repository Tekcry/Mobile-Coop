# Menu notes - slice 4d (M4: X5 only; the glow above Wren's goggle)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. No e2e or GPU run here: every visual result is "pending PC
run".

Michael (M4): "X5 only" and "there is also a random glow above wren on her forehead, it doesn't look right."

## What changed
- **X5 is now W3 in the live main-menu deck** (`contexts: ['main']`), named in the weapon-shot series (W1 rifle low
  ready, W2 pistol compressed ready, W3 rifle on the sights). Same camera pass, lens, roll, frame and key / rim as the
  slice 4b mock-up; `hold: 'rifle'`, `pose: { aim: 1 }`. It has no props, so nothing new is built at menu start; it uses
  the same three shared spots and the same rig and weapon meshes as every other void shot, so the slice 2 load gate's
  warm-up already covers its materials and shaders. The deck now has 9 cycling main shots (T2 intro + H1-H6, W1-W3).
- **X1-X4, X6-X8 and their candidate-only code are gone**: `CANDIDATES` (menuShots.ts), `CANDIDATE_HERO_SHOTS`,
  `MenuProp`, the prop colours (menuSets.ts), the lazy `buildProps` / props map and the wall-stance yaw hold
  (menuScene.ts). `MenuPoseExtra` keeps only `aim` (W3's raise); `applyMenuPose` no longer writes crouch / wall / lean /
  look / reload / check (they stay at `menuPoseInput`'s standing values, which only the menu writes). `?menuShot=<id>`
  (the existing general debug lookup) stays and now finds W3 in `SHOTS`.
- **The forehead glow is removed at its source** (GLOW.md: the green goggle-spill spot, light 2, reflecting off the
  goggle housing and helmet plate, bloomed; menu-only, the game has no such light, so there is no in-game change). Chosen
  in data, the cleaner of the two: the `glowLight` field and the `NV` colour are gone, and every face shot's third spot
  is `OFF` (intensity 0, black). The slot stays so the stage always runs three spots (no shader change between shots).
  `menuScene.ts` now scales all three spots by `lit` only. The goggle lens emissive flicker (`setGlow`, the figure's
  glow colour) is unchanged, so the flicker still reads; the dark title stays pure black (all spots 0 there already).
- **`titleLight` read-back**: unchanged shape. `spots` is still the sum of the three intensities: 0 on the dark title and
  through the flicker (previously the spill spot added up to 0.22 during the flicker; e2e-menus only asserts `spots === 0`
  on the dark title and `> 0` once lit, both still true: key 2.7 + rim 9 on T2).

## Files
- `src/world/menuShots.ts`: W3 row in `SHOTS`; `CANDIDATES` and its lookup removed.
- `src/world/menuSets.ts`: W3 hero shot (and the `lit` light helper it uses); `OFF` third spot in `FACE`; `glowLight`,
  `NV`, `MenuProp`, `props`, `CANDIDATE_HERO_SHOTS` and the prop colours removed.
- `src/world/menuPoses.ts`: `MenuPoseExtra` = `{ aim? }`; `applyMenuPose` simplified.
- `src/world/menuScene.ts`: candidate registration, props build / enable and wall yaw removed; spots scale by `lit`.
- `tests/menuShots.test.ts`: deck set and count (8 -> 9) include W3; the candidate test replaced by a W3 test (in the
  deck, rifle raised, forceable, pose reset, no X ids) and a no-spill test (no `glowLight`; T1 / T2 key and rim lit,
  third spot 0).
- `scripts/e2e-menus.mjs`: one regex, `W[12]` -> `W[1-3]` (the shot id check). #18's condition wait untouched.
- `scripts/menu-shots6.mjs`: X1-X8 replaced by `W3` (still captures T1-dark, T1, T2, H1-H6, W1, W2).
- `CHANGELOG.md`: one bullet under "Unreleased - menu-notes".
- Not touched: `scripts/menu-boot-shots.mjs` (it reads `titleLight` and the shot id only; nothing it uses changed), CT
  Core's and Sector Ops' files. `tests/__snapshots__/visionIsolation.test.ts.snap` shows modified (line endings only, as
  before): not mine. The slice 4b stills (`shots/s4b-X*.png`, `sheet-s4b-candidates.png`) stay as history.

## Results
- `npx vitest run tests/menuShots.test.ts tests/menuPoses.test.ts tests/menuGate.test.ts tests/titleSequence.test.ts`:
  42 passed.
- `npm run check`: pass. Lint 0 errors / 41 warnings (the existing script `no-console`), 162 files, 1807 passed /
  1 skipped, build ok.
- Not run: e2e (logic) and GPU.

## Logic e2e for the job lead
`smoke e2e-menus e2e-pad`

## GPU commands (desktop, `C:/NightShift/heavy.lock` held, port 4189 free)
```
cd /c/NightShift/Mobile-Coop-menu-notes
npm run build
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1 &
E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high SHOT_PREFIX=s4d node scripts/menu-shots6.mjs docs/menu-notes/shots T1-dark,T1,T2,W3
E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high node scripts/menu-boot-shots.mjs docs/menu-notes/shots
```
Then stop the preview, free 4189, release the lock. Stills: `s4d-T1-dark.png`, `s4d-T1.png`, `s4d-T2.png`,
`s4d-W3.png`, and the boot set (`s4-title-dark.png`, `s4-flicker-1..4.png`, `s4-flicker-done.png`,
`s4-lights-rising.png`, `s4-menu-in.png`, `s4-menu-first.png`). Check: no glow dot above the lenses in the flicker
frames, T1 / T2, nor on W3's helmet top; the lens flicker still reads in the dark; the dark title is black.

## What Michael should try
1. Cold launch, press: the goggle flickers in the dark with only the two lenses glowing, nothing above them.
2. Let the main menu cycle (or `?menuShot=W3`): Wren on the sights, rifle shouldered, in the rotation with the other
   shots.

## Open / polish
- The face shots lose the faint green tint on the brow and cheeks the spill gave. If wanted back, a far, dimmer green
  fill (0.8-1 m out, so it cannot make a hot specular dot) needs a GPU look (GLOW.md, second choice).
