# Wren - game assets and measured costs (step 10; numbers from the step 10 block-end retry)

Built by `npm run operators:lods -- wren --render` (`scripts/operators/py/bake_lods.py`, about 11 min on the RTX 4090,
ending with `operators:ktx2`) from `build/operators/wren/wren-leg_kit.blend` (every Wren item, 2,522,132 render
triangles). Report: `build/operators/wren/export/report.json` and `README.md`. Decisions: D21, D29, A36, A39-A41,
A69-A75, A79, A89, A95.

## The levels

| LOD | Used for | Geometry | Atlases (maps: albedo, tangent normal, ORM) |
| --- | --- | --- | --- |
| Hero | Main menu and close-up cameras (D21) | the build collapse-decimated to 230 k, full rig with fingers and toes | cloth 4K, kit 2K, hardware 2K; glow (lens) on factors |
| LOD0 | Gameplay < 8 m | from the hero; stitches in the maps only | cloth 2K, kit + hardware 2K; glow |
| LOD1 | 8-25 m | closed shell (A74): the hero without stitches, zip teeth and pieces < 12 mm, voxel-remeshed at 2.5 mm, decimated; the lens joined | cloth 1K, kit 1K; glow (A71: own set) |
| LOD2 | > 25 m | closed shell (A74) as LOD1, pieces < 45 mm dropped | one 1K atlas; glow |

Desktop only (D29, step 11b): no phone LOD; LOD2 is the far band.

Every map is baked from the 2.52 M source on the GPU (Cycles, selected to active), so the micro-emboss, perforation,
grip pebble, tape edges, stitches and the simulated folds live in each level's maps. The rib segments are separate
pieces at the hero and LOD0 and part of the shell below (A74). The goggle glow is kept at every level.
Rigid kit (D28, step 11b, A81, A82): every rigid item rides one bone or one fixed blend (identical weights on every
vertex), carries its part id as the `_RIGID` attribute and stays a separate piece below LOD0 (5-25 cm pieces); shell
vertices within 4 mm of a rigid part take its weights.

## Measured costs vs SPEC 6.4

| LOD | Triangles (SPEC) | Draws = materials (SPEC) | Textures: PNG on disk / GLB with WebP / BC7 VRAM | Bones in skin, weighted (SPEC) |
| --- | --- | --- | --- | --- |
| Hero | 229,391 (150-250 k) | 4 (4) | 43.5 MB / 25.2 MB / 96 MB (30-40 MB disk, ~90 MB VRAM) | 63, 57 (~30) **FLAG** |
| LOD0 | 39,809 (35-45 k) | 3 (2-3) | 16.6 MB / 6.5 MB / 32 MB (2K sets, ~8 MB) | 23, 17 (17) |
| LOD1 | 13,578 (12-15 k; target 13,600, A89) | 3: 2 + glow (2 + glow, A75) | 4.5 MB / 2.0 MB / 8 MB (shares LOD0's) **FLAG (A71)** | 23, 17 (17) |
| LOD2 | 5,964 (4-6 k; A77) | 2: 1 + glow (1 + glow) | 2.3 MB / 0.96 MB / 4 MB (1K atlas, ~1.5 MB) | 23, 17 (17) |

- VRAM is 1 byte per texel (BC7) with mips (x 4/3); uncompressed RGBA8 would be 4x. The GLBs carry KTX2 (UASTC + Zstd
  18, A79), measured below.
- Bones: the game LODs carry the 17 game joints with weights plus the rig's helper nodes (root, body, handL / R, toeL /
  R) as unweighted skin joints; the hero adds 30 finger and 10 toe bones (the rig has three bones per finger), so it is
  over SPEC's ~30. CPU skinning cost is per bone matrix: about 2x the estimate for the 1-2 hero figures on screen.
- Four operators at LOD0: 159 k triangles and 12 draws plus shadow passes (desktop budget 8 M / 600).
- Silhouette (alpha IoU, ortho front / side / back, against the hero; the hero against the source): hero 0.9993 /
  0.9993 / 0.9992; LOD0 0.9955 / 0.9932 / 0.9956; LOD1 0.9955 / 0.9924 / 0.9954; LOD2 0.9888 / 0.9831 / 0.9886.
- Open edge length (m, after a 0.2 mm weld): hero 34.6, LOD0 35.9, LOD1 0.64, LOD2 0.67. Visible back-face pixels
  (seven views): LOD1 at most 17, LOD2 at most 54 per view, both in the chest view (0.01 / 0.02 % of her pixels); the
  hero 2,032-11,591 (open cloth edges).
- Every LOD glb carries MikkTSpace TANGENT with its normal maps (GLB sizes above include them).

## Integration anchors (every LOD file; A36, A40, A41)

| Empty | Joint | Frame (Blender world, m) |
| --- | --- | --- |
| `weaponMount.backL` | chest | (0.0727, 0.0744, 1.1725), splay 0.08 rad |
| `weaponMount.backC` | chest | (0.0000, 0.0794, 1.1747) |
| `weaponMount.backR` | chest | (-0.0726, 0.0744, 1.1725), splay 0.08 rad |
| `pistolHolster` | hipR | (-0.2083, 0.0005, 0.5936), 9.76 mm off the game slot |
| `slingSocket` | pelvis | (0.1349, 0.0690, 0.9274), about 8 o'clock behind the pistol magazines (D28, step 11b) |

Frames read from the LOD0 GLB's empties in the bind pose (step 11 retry). `backGearM` for `rig.backGear`: **0.0103 m**
(report.json; the back plate's standoff).

## Renders (Cycles, OptiX on the RTX 4090; columns: source, hero, LOD0, LOD1, LOD2)

- `docs/operators/mockups/tests/wren-lods-a-silhouettes.webp` - front, side, back (orthographic).
- `docs/operators/mockups/tests/wren-lods-b-closeups-chest-head.webp` - chest rig and head kit, 85 mm.
- `docs/operators/mockups/tests/wren-lods-c-closeup-boot.webp` - left boot, 85 mm.
- `docs/operators/mockups/tests/wren-lods-d-closeup-holster.webp` - the empty holster, 85 mm.

Studio light (key 450 W): the near-black fabric reads mid grey in these Cycles comparisons; they compare levels, not
the stealth look. The Lab close-ups are calibrated (A78, step 11).

## KTX2 textures (step 11, D26, A79)

`npm run operators:ktx2 -- wren` (also the last stage of `operators:lods`): UASTC quality 2 + Zstd 18, full mips,
albedo sRGB, normal and ORM linear; every GLB carries `KHR_texture_basisu` (required) and no WebP / PNG.

| LOD | Textures | PNG MB | KTX2 MB on disk | VRAM BC7 MB | VRAM if RGBA8 (WebP) MB | GLB MB WebP -> KTX2 | Lowest PSNR dB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hero | 9 | 43.5 | 35.1 | 96 | 384 | 25.2 -> 52.9 | 35.5 |
| LOD0 | 6 | 16.6 | 13.7 | 32 | 128 | 6.5 -> 17.5 | 37.1 |
| LOD1 | 6 | 4.5 | 3.6 | 8 | 32 | 2.0 -> 4.8 | 36.8 |
| LOD2 | 3 | 2.3 | 1.8 | 4 | 16 | 0.96 -> 2.4 | 38.4 |

UASTC is larger on disk than q92 WebP; the gain is 4x less VRAM and no image decode on load. RDO
(`--uastc_rdo_l 1`) would cut about 21 % on disk: a step 18 choice. Babylon's transcoder is bundled (D27, A79):
`@babylonjs/ktx2decoder@9.29.0`, run on the main thread from the package's own wasm via `?url`, no network. The Lab
draws every baked LOD from the real KTX2 (BC7 on the RTX 4090), flipped in the texture matrix because Babylon cannot
flip a compressed texture at upload; it matches the reference decode (`wren-sheet-ktx2-compare.webp`, mean absolute difference 0.10-0.12 / 255 per LOD, step
11 retry).

## Design notes (step 11; A2, D22-D25)

- Silhouette: a fitted one-piece in near-black soft-shell; under a rim the read is the head with the square goggle,
  the plate's shoulder line and slim straps, the narrow belt, the empty holster on the right thigh, the knife and
  the three sleeves on the outer left thigh (D28) (wren-sheet-rim-silhouette.webp).
- Materials (albedo / roughness): suit shell 0.032 / 0.80, abrasion weave 0.035 / 0.92, stretch knit 0.035 / 0.90,
  vents 0.034 / 0.84, grip rubber 0.024 / 0.72, seam tape 0.029 / 0.74; composite 0.032 / 0.64; rubber trim
  0.021 / 0.78; gunmetal a real metal, base colour (F0) 0.15-0.165 / 0.60, dark anodised grey with satin only on the bevels and worn
  edges (step 11b, A86; D28: Michael "Keep dark anodised"), the one metal.
- Review lighting: the Lab close-ups use the calibrated `detail` rig (A78): near-black reads near-black (her masked
  sRGB medians about 0.05-0.13 per close-up, printed on each sheet) and each close-up adds a +2 EV detail-read panel of
  the same view, where the zones separate by value step, relief and sheen. The `buckle` close-up uses `detailFront`.

## Kit callouts and the loadout (ART-DIRECTION 9.2)

| Game item | Carry | Where on Wren | Close-up |
| --- | --- | --- | --- |
| Long gun (game model, not modelled) | back slots | weapon mount receiver on the back plate, on the spine (A36, A40); anchors weaponMount.backL / C / R on chest | backPlate (also chestRear) |
| Sidearm (game model, not modelled) | thigh slot | the empty holster, right thigh (A40, A62); anchor pistolHolster on hipR | thighR (also belt, knee, beltFront, beltBack) |
| Compact gun (game model, not modelled) | sling slot | flush sling socket on the belt at about 8 o'clock, behind the pistol magazines (D28, A41); anchor slingSocket on pelvis | hipL (also beltBack) |
| Rifle magazines | 2 | true 178 mm, vertical, base plates up, low on the chest plate on one placard and a moulded saddle (D28 R1, A83) | chestFront (also shoulder, ribsSide, underarm, belt, beltFront, hipL) |
| Pistol magazines | 2 | true 128 mm, two horizontal rows at 9 o'clock on the left hip, base plates forward, on a moulded seat (D28) | hipL (also chestFront, chestRear, backPlate, beltFront, beltBack, forearm) |
| Frag, sleeping gas, flashbang | 2 each | three straight double sleeves, outer left thigh, caps up; caps knurled / dome / two ridges (D28, A85) | thighL (also beltFront, beltBack) |
| EMP, noisemakers | 1, 2 | gadget slot, chest plate upper right, magnetic tab flap | chestFront (also shoulder) |
| Sticky cams, prox mine | 2, 1 | flat pouch, front left of the belt, magnetic tab flap (D28) | beltFront, hipL (also belt, buckle) |
| Tri-rotor drone | 1 | flat hard pod on a saddle, rear right of the belt (A39, A88) | beltBack |
| Medkit | 1 | soft tear-away pouch, right side of the belt in front of the holster hanger (A88) | belt (also beltFront, ribsSide, buckle) |
| Knife | 1 | true 190 mm, moulded sheath on a seat, outer front of the left thigh, handle up, left-hand draw (D28) | thighL (also belt, thighR) |

Comms: the radio in the back plate's upper-left recess, its cable over the left shoulder strap (three keepers) to the
PTT at the left collarbone, the earpiece cable from the PTT up the left of the neck to the left ear (backPlate, ptt,
collar); the earpiece itself sits in the ear under the hood and balaclava, and the thumb loops sit under the glove
cuffs (handPalm, handBack, forearm); neither is ever visible, so no close-up calls them
out. Nothing else is carried. Not modelled (D24): every gun and its sling; the game attaches them at the anchors
above.

Callout rule (SPEC 1, 11-fixes-r4; all 22 close-ups audited by eye in the step 11 retry): every kit item and suit zone
clearly identifiable in a close-up's frame is called out, not only the frame's subject (labData `include` / `suit`);
items cut by the frame edge past recognition stay out (`exclude`). The brow rivets (A87) are called out with the
harness side straps they fasten to the brow plate (head).

## Render set (step 11, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren`, RTX 4090, ANGLE D3D11)

`docs/operators/mockups/wren/wren-sheet-*.webp`: turnaround, menu, context, compare, lods, lods-closeups, wireframe,
colourblind, rim-silhouette, goggle, and the close-ups head, neckRear, collar, chestFront, chestRear, ribsSide,
backPlate, shoulder, ptt, underarm, forearm, handPalm, handBack, belt, beltFront, hipL, beltBack, buckle, thighR,
thighL, knee, boots, and ktx2-compare (33 sheets; hipL added in step 11 fix round 3). All re-rendered in the step 11
retry (2026-10-18) on the final assets (step 10 retry bakes, 08a retry suit, 11b rigid kit).
The wireframe sheet labels the source "2,628,557 triangles": the Lab's count of the source export, not report.json's
2,522,132 render triangles above (two different counts, not an error).
