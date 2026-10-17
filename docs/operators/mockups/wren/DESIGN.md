# Wren - game assets and measured costs (step 10)

Built by `npm run operators:lods -- wren --render` (`scripts/operators/py/bake_lods.py`, about 5 min on the RTX 4090)
from `build/operators/wren/wren-leg_kit.blend` (every Wren item, 2,449,661 render triangles). Report:
`build/operators/wren/export/report.json` and `README.md`. Decisions: D21, A36, A39-A41, A69-A73.

## The levels

| LOD | Used for | Geometry | Atlases (maps: albedo, tangent normal, ORM) |
| --- | --- | --- | --- |
| Hero | Main menu and close-up cameras (D21) | the build collapse-decimated to 230 k, full rig with fingers and toes | cloth 4K, kit 2K, hardware 2K; glow (lens) on factors |
| LOD0 | Gameplay < 8 m, desktop | from the hero; stitches in the maps only | cloth 2K, kit + hardware 2K; glow |
| LOD1 | 8-25 m | closed shell (A74): the hero without stitches, zip teeth and pieces < 12 mm, voxel-remeshed at 2.5 mm, decimated; the lens joined | cloth 1K, kit 1K; glow (A71: own set) |
| LOD2 | > 25 m | closed shell (A74) as LOD1, pieces < 45 mm dropped | one 1K atlas; glow |
| Phone | the phone, in game and menu | LOD2's mesh | the LOD2 atlas at 512; glow |

Every map is baked from the 2.45 M source on the GPU (Cycles, selected to active), so the micro-emboss, perforation,
grip pebble, tape edges, stitches and the simulated folds live in each level's maps. The rib segments are separate
pieces at the hero and LOD0 and part of the shell below (A74). The goggle glow is kept at every level.

## Measured costs vs SPEC 6.4

| LOD | Triangles (SPEC) | Draws = materials (SPEC) | Textures: PNG on disk / GLB (WebP) / BC7-ASTC VRAM | Bones in skin, weighted (SPEC) |
| --- | --- | --- | --- | --- |
| Hero | 229,348 (150-250 k) | 4 (4) | 48.4 MB / 25.3 MB / 96 MB (30-40 MB disk, ~90 MB VRAM) | 63, 57 (~30) **FLAG** |
| LOD0 | 39,809 (35-45 k) | 3 (2-3) | 18.3 MB / 6.4 MB / 32 MB (2K sets, ~8 MB) | 23, 17 (17) |
| LOD1 | 13,484 (12-15 k) | 3: 2 + glow (2 + glow, A75) | 4.5 MB / 1.9 MB / 8 MB (shares LOD0's) **FLAG (A71)** | 23, 17 (17) |
| LOD2 | 5,557 (4-6 k; A77) | 2: 1 + glow (1 + glow) | 2.3 MB / 0.8 MB / 4 MB (1K atlas, ~1.5 MB) | 23, 17 (17) |
| Phone | 5,557 (4-6 k; A77) | 2: 1 + glow | 0.8 MB / 0.5 MB / 1 MB ASTC (512-1K, ~1 MB) | 23, 17 (17) |

- VRAM is 1 byte per texel (BC7 desktop, ASTC 4x4 phone) with mips (x 4/3); uncompressed RGBA8 would be 4x. Step 11
  (A79): the GLBs carry KTX2 (UASTC + Zstd 18), measured below.
- Bones: the game LODs carry the 17 game joints with weights plus the rig's helper nodes (root, body, handL / R, toeL /
  R) as unweighted skin joints; the hero adds 30 finger and 10 toe bones (the rig has three bones per finger), so it is
  over SPEC's ~30. CPU skinning cost is per bone matrix: about 2x the estimate for the 1-2 hero figures on screen.
- Four operators at LOD0: 159 k triangles and 12 draws plus shadow passes (desktop budget 8 M / 600).
- Silhouette (alpha IoU, ortho front / side / back, against the hero; the hero against the source): hero 0.9993 /
  0.9993 / 0.9992; LOD0 0.9956 / 0.9946 / 0.9957; LOD1 0.9954 / 0.9938 / 0.9953; LOD2 and phone 0.9907 / 0.9835 /
  0.9907 (fix round 1; before: LOD1 0.991 / 0.988 / 0.991, LOD2 0.979 / 0.967 / 0.979).
- Open edge length (m, after a 0.2 mm weld): hero 35.1, LOD0 36.0, LOD1 0.18, LOD2 / phone 0.44. Visible back-face
  pixels (six views): LOD1 at most 1, LOD2 / phone at most 5 per view (the hero 2,063-11,385: open cloth edges).
- Every LOD glb carries MikkTSpace TANGENT with its normal maps (GLB sizes above include them).

## Integration anchors (every LOD file; A36, A40, A41)

| Empty | Joint | Frame (Blender world, m) |
| --- | --- | --- |
| `weaponMount.backL` | chest | (0.0738, 0.0842, 1.1775), splay 0.08 rad |
| `weaponMount.backC` | chest | (0.0000, 0.0892, 1.1783) |
| `weaponMount.backR` | chest | (-0.0724, 0.0878, 1.1779), splay 0.08 rad |
| `pistolHolster` | hipR | (-0.2083, 0.0005, 0.5936), 9.76 mm off the game slot |
| `slingSocket` | pelvis | (0.1661, 0.0009, 0.9260) |

`backGearM` for `rig.backGear`: **0.0222 m** (the back plate's standoff, from the armour sim report).

## Renders (Cycles, OptiX on the RTX 4090; columns: source, hero, LOD0, LOD1, LOD2, phone)

- `docs/operators/mockups/tests/wren-lods-a-silhouettes.webp` - front, side, back (orthographic).
- `docs/operators/mockups/tests/wren-lods-b-closeups-chest-head.webp` - chest rig and head kit, 85 mm.
- `docs/operators/mockups/tests/wren-lods-c-closeup-boot.webp` - left boot, 85 mm.

Studio light (key 450 W): the near-black fabric reads mid grey in these Cycles comparisons; they compare levels, not
the stealth look. The Lab close-ups are calibrated (A78, step 11).

## KTX2 textures (step 11, D26, A79)

`npm run operators:ktx2 -- wren` (also the last stage of `operators:lods`): UASTC quality 2 + Zstd 18, full mips,
albedo sRGB, normal and ORM linear; every GLB carries `KHR_texture_basisu` (required) and no WebP / PNG.

| LOD | Textures | PNG MB | KTX2 MB on disk | VRAM BC7 / ASTC MB | VRAM if RGBA8 (WebP) MB | GLB MB WebP -> KTX2 | Lowest PSNR dB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hero | 9 | 48.4 | 38.3 | 96 | 384 | 25.3 -> 55.3 | 35.5 |
| LOD0 | 6 | 18.1 | 14.5 | 32 | 128 | 6.6 -> 18.0 | 36.0 |
| LOD1 | 6 | 4.5 | 3.6 | 8 | 32 | 1.9 -> 4.7 | 37.2 |
| LOD2 | 3 | 2.2 | 1.8 | 4 | 16 | 0.8 -> 2.2 | 38.6 |
| Phone | 3 | 0.7 | 0.55 | 1 | 4 | 0.6 -> 1.0 | 37.4 |

UASTC is larger on disk than q92 WebP (the hero's WebP textures were about 8 MB); the gain is 4x less VRAM and no
image decode on load. RDO (`--uastc_rdo_l 1`) would cut about 21 % on disk: a step 18 choice. The phone downloads
only its 1.0 MB GLB. Babylon's transcoder is bundled (D27, A79): `@babylonjs/ktx2decoder@9.29.0`, run on the main
thread from the package's own wasm via `?url`, no network. The Lab draws every baked LOD from the real KTX2 (BC7 on the
RTX 4090), flipped in the texture matrix because Babylon cannot flip a compressed texture at upload; it matches the
reference decode (`wren-sheet-ktx2-compare.webp`, mean difference under 1 / 255 per LOD).

## Design notes (step 11; A2, D22-D25)

- Silhouette: a fitted one-piece in near-black soft-shell; under a rim the read is the head with the square goggle,
  the plate's shoulder line and slim straps, the narrow belt, the empty holster on the right thigh and the three
  sleeves on the left front thigh (wren-sheet-rim-silhouette.webp).
- Materials (albedo / roughness): suit shell 0.032 / 0.80, abrasion weave 0.035 / 0.92, stretch knit 0.035 / 0.90,
  vents 0.034 / 0.84, grip rubber 0.024 / 0.72, seam tape 0.029 / 0.74; composite 0.032 / 0.64; rubber trim
  0.021 / 0.78; gunmetal 0.051 / 0.62, the one metal.
- Review lighting: the Lab close-ups use the calibrated `detail` rig (A78): near-black reads near-black (her masked
  sRGB medians about 0.05-0.13 per close-up, printed on each sheet) and each close-up adds a +2 EV detail-read panel of
  the same view, where the zones separate by value step, relief and sheen. The `buckle` close-up uses `detailFront`.

## Kit callouts and the loadout (ART-DIRECTION 9.2)

| Game item | Carry | Where on Wren | Close-up |
| --- | --- | --- | --- |
| Long gun (game model, not modelled) | back slots | weapon mount receiver on the back plate, on the spine (A36, A40); anchors weaponMount.backL / C / R on chest | backPlate |
| Sidearm (game model, not modelled) | thigh slot | the empty holster, right thigh (A40, A62); anchor pistolHolster on hipR | thighR |
| Compact gun (game model, not modelled) | sling slot | flush sling socket on the belt, left hip (A41); anchor slingSocket on pelvis | hipL |
| Rifle magazines | 2 | two open-top pouches, chest plate right of centre, shock cord and pull tabs | chestFront |
| Pistol magazines | 2 | belt, left front | beltFront |
| Frag, sleeping gas, flashbang | 2 each | three double sleeves, left front thigh; caps knurled / dome / two ridges (D25) | thighL |
| EMP, noisemakers | 1, 2 | gadget slot, chest plate upper right, magnetic tab flap | chestFront |
| Sticky cams, prox mine | 2, 1 | flat pouch, left hip, magnetic tab flap | beltFront, hipL |
| Tri-rotor drone | 1 | hard pod, rear left of the belt (A39) | beltBack, hipL |
| Medkit | 1 | tear-away pouch, rear right of the belt (A39) | beltBack |
| Knife | 1 | moulded sheath, chest plate left of centre, handle down | chestFront |

Comms: the radio in the back plate's upper-left recess, its cable over the left shoulder strap (three keepers) to the
PTT at the left collarbone, the earpiece cable from the PTT up the left of the neck to the left ear (backPlate, ptt,
collar); the earpiece itself sits in the ear under the hood and balaclava, never visible, so no close-up calls it
out. Nothing else is carried. Not modelled (D24): every gun and its sling; the game attaches them at the anchors
above.

## Render set (step 11, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren`, RTX 4090, ANGLE D3D11)

`docs/operators/mockups/wren/wren-sheet-*.webp`: turnaround, menu, context, compare, lods, lods-closeups, wireframe,
colourblind, rim-silhouette, goggle, and the close-ups head, neckRear, collar, chestFront, chestRear, ribsSide,
backPlate, shoulder, ptt, underarm, forearm, handPalm, handBack, belt, beltFront, hipL, beltBack, buckle, thighR,
thighL, knee, boots, and ktx2-compare (33 sheets; hipL added in step 11 fix round 3).
