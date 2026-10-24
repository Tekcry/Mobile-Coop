# Guard models: spec (slice G0)

The guard figure's contract for every later slice. Data: `scripts/operators/data/guards.json` (read by the bake scripts
and the runtime), validated by `validateGuardKit` in `src/operators/guards/guardKit.ts` (`tests/guardKit.test.ts`).
Where this file and the JSON disagree, the JSON wins and this file is fixed. Brief: `BRIEF.md` (A2-A15, M1-M3); plan:
`PLAN.md` (sections 2-6).

## 1. Bases (A2)
| Base | Ref height | Build | MakeHuman macro (gender / muscle / weight / proportions) | Kinds (height in `enemies.json`) |
| --- | --- | --- | --- | --- |
| `average` | 1.77 m | average | 1 / 0.60 / 0.50 / 0.60 | grunt 1.77, droneOp 1.75, officer 1.80 (athletic, folded in) |
| `lean` | 1.76 m | lean | 1 / 0.55 / 0.32 / 0.70 | runner 1.74, sniper 1.78 |
| `broad` | 1.825 m | broad | 1 / 0.75 / 0.68 / 0.50 | heavy 1.83, enforcer 1.82 |
- Macro values are `py/mh.py` `macro(gender, muscle, weight, proportions)` sliders (gender 1 = male; Moth is 1 / 0.6 /
  0.28 / 0.8). All guards are larger than Wren (1.68 m): G1 raises shoulder and chest girth and the neck on top.
- Every figure scales uniformly from its base's reference height to its kind's height: within +-2% (checked).
- Per-base carry offsets (`mounts`: `weaponMount.backL/.backC/.backR`, `pistolHolster`, `slingSocket`) are 0
  placeholders; G7 sets them from the S21 carry poses (PLAN 8, first risk).
- Kind strings are the game's (`src/config/enemies.json`); they match the contract. The dog keeps its model.

## 2. Ids (the shared contract)
Bases `average`, `lean`, `broad`. Heads `average-1`..`-4`, `lean-1`..`-4`, `broad-1`. Skin tones 0-3. Hair caps `buzz`,
`crop`, `sidepart`, `receding`, `fade`, `bald` (no mesh). Hair colours `black`, `darkbrown`, `brown`, `grey`. Outfits
`uniform`, `uniform_rolled`, `work`, `uniform_jacket`. Headwear `cap`, `cap_officer`, `beanie`, `balaclava`, `headset`,
`boonie`. Eyewear `glasses_clear`, `glasses_dark`. Gameplay gear `helmet_std`, `helmet_heavy`, `vest_soft`,
`plate_heavy`, `shield_riot` (own GLB). Small kit `radio`, `pouch_belt`, `holster_thigh`, `flashlight_mount`.
`validateGuardKit` refuses any other id set.

## 3. Archetype matrix (PLAN 4, with the lead's corrections)
| Kind | Base | Face | Outfit (tint) | Headwear (variation) | Fixed gear | Gameplay gear (A5) | Kit pool |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grunt | average | 4 heads, hair cap | uniform (faction) | cap / beanie / none; eyewear clear / dark / none | radio, flashlight_mount | helmet_std, vest_soft | pouch_belt, holster_thigh |
| runner | lean | 4 heads, hair cap | work (kind colour, A11) | beanie / none | - | helmet_std, vest_soft | pouch_belt |
| heavy | broad | broad-1 under balaclava | uniform (faction) | balaclava (always) | plate_heavy | helmet_heavy (strict A5) | pouch_belt |
| sniper | lean | 4 heads, hair cap | uniform_rolled (faction) | boonie / cap | glasses_dark | helmet_std, vest_soft | pouch_belt, holster_thigh |
| enforcer | broad | broad-1 under balaclava | uniform (faction) | balaclava (always) | plate_heavy, shield_riot | helmet_heavy (strict A5) | pouch_belt |
| droneOp | average | 4 heads, hair cap | uniform (faction) | headset (always) + `headwear2` cap / none; eyewear clear / none | pouch_belt | helmet_std, vest_soft | holster_thigh |
| officer | average | 4 heads, hair cap | uniform_jacket (kind colour) | cap_officer (always, no bare head); eyewear clear / none | radio | helmet_std, vest_soft | holster_thigh |
Changes against PLAN section 4, and why:
- Enforcer: `plate_heavy`, not `vest_soft` (lead correction). He is `plated: true` in `enemies.json`, so by A5 what
  stops a round is what is drawn.
- Sniper and officer also list `helmet_std` as gameplay gear. `GEAR_BY_STAGE[3]` (`src/ai/gear.ts`) gives every guard a
  helmet, and A5 says a helmet that stops a round must be drawn.
- `helmetPiece` / `armourPiece` per kind name the piece that `Enemy.helmet` / `Enemy.armour` (`AL_HELMET` /
  `AL_ARMOUR`) show. Heavy and enforcer: `helmet_heavy` and `plate_heavy`.
- Strict A5 (lead ruling, P1 fix): every helmet, `helmet_heavy` too, is drawn only while the gameplay helmet bit
  (`Enemy.helmet`) is set, so `helmet_heavy` is heavy / enforcer `gameplayGear`, not fixed gear. A knock-off (A6) drops
  it. `plate_heavy` stays fixed: both kinds are `plated` in `enemies.json` and always show it.
- G6 (`guardVariant`, `applyGear`) reads every pool from this data at module load; a test checks every id it can emit
  is in that kind's lists. Picks: `headwearOptional` false means the headwear is always worn (the officer never shows a
  bare head); eyewear in `fixedGear` (the sniper's `glasses_dark`) is always worn, else a rare pick from `eyewear`
  (grunt: clear or dark); a kind with no `hairCaps` (heavy, enforcer) is `bald` (no cap mesh on `broad`).

Headwear rules (G6 `applyGear`; the data flags are per headwear piece):
| Piece | `hidesHair` | `underHelmet` |
| --- | --- | --- |
| cap, cap_officer, boonie, headset | false (hair cap shows) | cap, cap_officer and boonie: false (a helmet replaces them); headset: true |
| beanie | true | false |
| balaclava | true | true |
- A helmet hides the hair cap and every headwear piece whose `underHelmet` is false.
- `headwearOptional` true means "none" is a valid pick. `headwear2` (droneOp only) is a second layer that is always
  optional.
- A14: `faceCovered` is true only for an always-worn balaclava (heavy, enforcer). A grunt who gains gear keeps his face.

## 4. Pieces (original designs, generic ids)
Triangles are LOD0 / LOD1 / LOD2. Texels are the LOD0 atlas rectangle; LOD1 halves it and LOD2 quarters it. "Face
tile" means the piece is drawn in one of the base's 1024 face tiles (section 7).
| Id | Kind | Design (original; no brand, text or insignia) | Tris | Texels | Tint | Bones | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (body) | - | Skin left visible once the outfit is on: neck, collar gap, wrists (hands are inside gloves) | 1,200 / 400 / 150 | 512 x 512 | skin | all | - |
| (head) | - | Head and neck to the seam, ears, closed mouth (section 7) | 4,000 / 1,200 / 400 | face tile | skin | head, neck | - |
| (eyes) | - | Two generated eyeballs with a cornea bulge (2 x 250), merged into the head below LOD0 | 500 / 0 / 0 | 256 x 256 | none | head | - |
| uniform | outfit | Field shirt (sleeves down, two chest pockets with plain flaps), cargo trousers, laced boots, plain gloves | 5,500 / 1,800 / 700 | 1024 x 1024 | uniform | skinned | cloth |
| uniform_rolled | outfit | The uniform with sleeves rolled above the elbow (bare forearms on the skin slot) | 5,500 / 1,800 / 700 | 1024 x 512 | uniform | skinned | cloth |
| work | outfit | Zip-front work jacket with hip pockets, plain work trousers, boots, work gloves | 5,000 / 1,700 / 650 | 1024 x 512 | uniform | skinned | cloth |
| uniform_jacket | outfit | Short field jacket (stand collar, two lower patch pockets, plain shoulder straps) over the shirt | 6,500 / 2,100 / 800 | 1024 x 1024 | uniform | skinned | cloth |
| cap | headwear | Soft six-panel peaked cap, plain front, short curved brim | 600 / 200 / 80 | 256 x 256 | headwear | head | headEnvelope |
| cap_officer | headwear | Structured peaked cap: stiff rounded crown, short hard visor, plain cord band, no badge | 600 / 200 / 80 | 256 x 256 | headwear | head | headEnvelope |
| beanie | headwear | Rib-knit watch cap with a rolled cuff above the ears | 500 / 180 / 60 | 256 x 256 | headwear | head | headEnvelope |
| balaclava | headwear | Dark knit balaclava, one wide eye opening, flatlock seams, collar tucked in | 600 / 200 / 80 | face tile (broad) | none | head, neck | membrane |
| headset | headwear | Single-band headset, two closed ear cups, short boom mic on the left | 400 / 150 / 50 | 256 x 256 | none | head | headEnvelope |
| boonie | headwear | Soft wide-brim field hat, sewn crown band, two side vents, chin cord | 600 / 200 / 80 | 256 x 256 | headwear | head | headEnvelope |
| glasses_clear | eyewear | Thin wire-frame glasses with clear lenses | 300 / 100 / 20 | 128 x 128 | none | head | face |
| glasses_dark | eyewear | Wrap-around shooting glasses, dark lenses, plain arms | 300 / 100 / 20 | 128 x 128 | none | head | face |
| helmet_std | gear | Rounded shell, low side cut, side rails, rear pad, two-point chin strap (also the dropped helmet, A6) | 1,200 / 400 / 150 | 512 x 256 | headwear | head | headEnvelope |
| helmet_heavy | gear | The same shell with a thicker brow edge and a raised clear visor on side pivots | 1,200 / 400 / 150 | face tile (broad) | headwear | head | headEnvelope |
| vest_soft | gear | Slim soft carrier: front and back panels, side straps, two small front pouches | 1,800 / 600 / 250 | 512 x 512 | kit | chest, spine, clavL, clavR | torsoShell |
| plate_heavy | gear | Thick plate carrier with collar guard, shoulder guards, three front pouches | 2,600 / 900 / 350 | face tile (broad) | kit | chest, spine, clavL, clavR, shL, shR | torsoShell |
| shield_riot | shield | Curved polymer shield, small view port, two inner handles, plain face | 800 / 300 / 120 | own 512 x 512 | none | elL, wrL | held (own GLB) |
| radio | kit | Compact radio in an open-top pouch on the left chest, short stub antenna | 300 / 100 / 30 | 256 x 256 | kit | chest | rigid |
| pouch_belt | kit | Plain duty belt with two small closed pouches | 400 / 150 / 30 | 256 x 256 | kit | pelvis | rigid |
| holster_thigh | kit | Drop-leg holster on two thigh straps (the pistol carry slot, `weaponModel.holster`) | 350 / 100 / 30 | 256 x 256 | kit | hipR | rigid |
| flashlight_mount | kit | Clip mount on the right shoulder strap holding a short torch | 250 / 80 / 30 | 256 x 256 | none | chest | rigid |

Fit rules:
- `cloth`: drafted and sewn per base (G2, `combat_shirt.py` / `trousers.py` / `boots.py` / `gloves.py`), skinned like
  the body (4 influences).
- `membrane`: stretched over the head and the layers (`headwear.py`).
- `headEnvelope`: rigid on `head`, fitted over the base's head envelope (section 7) with one per-base fit scale.
- `face`: rigid on `head`, seated on the nose bridge and the ears of the widest head of the base.
- `torsoShell`: rigid plates (`torso_common.py`, `compress` presses the shirt in under them), one weight vector per
  rigid part on its declared bones.
- `rigid`: `rigid_skin.py` on the declared bone.
- `held`: the shield's own 3-LOD GLB, rigid on the left forearm.

Per-piece LOD0 caps (PLAN 5; checked): headwear 600, helmet 1,200, vest 1,800, plate 2,600, shield 800, head 4,000 /
1,200 / 400, eyes 500, hair cap 1,000 / 300 / 0.

## 5. Budget totals (worst allowed piece set, from the data)
"Shown" is conservative. It adds the body, the outfit, the largest head, the eyes, the largest hair cap, the largest
pick from each headwear and eyewear pool, every fixed and gameplay piece and the whole kit pool. The shield is included.
"Buffer" is every head (+ eyes), cap and piece the base's kinds can show; the shield's own GLB is not in it.
| Kind | Shown LOD0 / 1 / 2 (limit 20,000 / 7,000 / 2,800) |
| --- | --- |
| grunt | 17,400 / 5,430 / 1,870 |
| runner | 15,600 / 4,930 / 1,690 |
| heavy | 16,000 / 5,050 / 1,860 |
| sniper | 16,850 / 5,250 / 1,810 |
| enforcer | 16,800 / 5,350 / 1,980 |
| droneOp | 17,250 / 5,400 / 1,860 |
| officer | 17,750 / 5,500 / 1,910 |

| Base | Buffer LOD0 / 1 / 2 (limit 45,000 / 14,000 / 5,000) |
| --- | --- |
| average | 42,000 / 12,710 / 4,080 |
| lean | 39,250 / 11,880 / 3,800 |
| broad | 16,000 / 5,050 / 1,860 |
- Every base's left atlas half (2048 x 2048) holds the body, eyes, outfits, caps and the pieces its kinds use, with
  room to spare. This is checked by area; G4 does the packing.

## 6. Bones
- LOD0: 33 bones, the 23 rig joints of `RIG_JOINTS` (`src/operators/runtime/pose.ts`, tested equal) plus 10 fingers.
  The rig joints are `root body pelvis spine chest neck head shL elL wrL shR elR wrR hipL knL anL hipR knR anR toeL toeR
  clavL clavR`. The fingers use Wren's joint names `finger<S>_<f>_<seg>` (`src/anim/fingers.ts` `FINGER_RE`) with one
  segment each: `fingerL_1_1..fingerL_5_1` and `fingerR_1_1..fingerR_5_1` (f 1 = thumb .. 5 little), MCP (thumb: CMC)
  to the fingertip, parent `wrL` / `wrR`.
- Finger axes are Wren's, so `fingers.ts` and the runtime's `fingerRig` drive them unchanged: local +Y along the bone;
  local Z is the curl axis, a turn about +Z (right hand) or -Z (left hand) in the game frame closes the finger toward
  the palm; the splay axis is local X. The thumb is rolled so `THUMB_AXES[0]` (its base, opposition across the palm) is
  Wren's (G1 bake: dot 0.995). In Blender's bone frame the game frame is mirrored: a curl there is about -Z on the right
  hand and +Z on the left (axis (lx, -ly, -lz) for a game-local axis l). The bodies job checks both and the report's
  `fingerAxes` and `deformCheck.fingerCurl` record it. One segment per finger: `fingers.ts` turns only segment 1 (MCP
  80 deg, thumb 35 deg at curl 1); a one-segment fallback there is G5 / G7's (G1-REPORT "Fix round").
- LOD1 and LOD2: the 23 rig joints; finger weights fold into the wrist.
- Influences 4 / 4 / 2. No face bones (A15).

## 7. Faces (M1)
**Head variants.** One recipe per head in `guards.json` `heads[].targets`: MakeHuman face targets by their exact path
under MPFB2 `data/`, with weights in (0, 1]. Facial hair is fixed per variant and painted into the face tile. The
iris colour picks a cell of the shared eye block.
| Head | Read | Facial hair | Iris |
| --- | --- | --- | --- |
| average-1 | square jaw, straight nose, level brows | clean | brown |
| average-2 | fuller cheeks, broad nose, short chin, slight eye bags | stubble | darkbrown |
| average-3 | long chin, hooked nose, lean cheeks, larger ears | short beard | hazel |
| average-4 | heavy brow, compressed nose, cleft chin, narrow eyes | stubble | bluegrey |
| lean-1 | narrow face, thin sharp nose, narrow chin | clean | bluegrey |
| lean-2 | high cheekbones over hollow cheeks, straight bridge, close-set eyes | stubble | brown |
| lean-3 | angular jaw, wide mouth, convex nose, ears set out | short beard | darkbrown |
| lean-4 | deep-set eyes, long nose, low brows, receding chin | clean | hazel |
| broad-1 | the eye region under the balaclava: heavy brow, deep-set eyes, slight bags | clean | darkbrown |
- Recipes use the face regions only: `targets/{cheek,chin,ears,eyebrows,eyes,forehead,mouth,nose}/`. They never use
  `targets/head/`, so every head of a base keeps the base's cranium (checked). That gives one hair cap mesh per base
  and one head envelope per base. Jaw and face shape come from `chin-*` and `cheek-*`.
- The 53 target files the recipes use are appended to `scripts/operators/data/mpfb2-files.txt` (same pinned zip
  `add-on-mpfb-v2.0.18.zip`, nothing new downloaded). Each path was checked against the zip's listing, and the test
  checks that each one is listed.
- Faces are generated from CC0 targets and never modelled on a real person. Each recipe is a mix of five to nine
  targets at moderate weights.

**Neck seam.** The head is cut on the hm08 neck edge loop nearest 45% of the way up the neck, from the `neck` joint
toward the `head` joint (`face.neckSeam`). The topology is shared, so every head of a base welds to that base's body by
vertex index. Skin weights blend `neck` to `head` over 2 loops each side. The seam sits under the collar of every
outfit; the balaclava covers it on `broad`.
- Frame: heads are built in the base body's frame (G1's fit, `guard_body.GuardFit`: the head part's vertices `V[hv]`,
  the same 42 seam vertices as the body, hm08 index `_mh`). The body report's `seamTransforms` gives the map from the
  MakeHuman frame (`makeHuman`: x negated, x 0.1 K, y from the hm08 floor) to the body frame: the `neck` and `head` bone
  maps (3x3 + translation, floor lift folded in), and the best uniform scale + translation over the seam and over the
  head part with residuals. The body blend's `guard-<base>-headref` is the head part in the body frame.
- The crown (top of the head, feet on y = 0) is the body report's `crownY`; the head joint is `bindJoints.head`. Both
  include the bind floor lift (about -5 mm).
- Body frame (G1h fix round, lead ruling Fix A): each heads job runs G1's own fit (`guard_body.GuardFit`, from prep's
  joints and MakeHuman data) and builds the head at G1's head-part positions, so the seam loop is G1's
  `neckSeam.mhVerts` at the body's own seam positions (gap 0 mm, same perimeter). A recipe's face-target offsets go
  through G1's skin (fit.K and the head bone's breadth / depth scale, e.g. width x 0.912).
- Seam lock: recipes never move the seam or the 2 edge rings above it (lock = max(cranium lock, 1 - smooth(2, 4, ring))),
  so every head of a base has the same seam positions. Head share of the neck + head weight: seam 0.5, rings 1 / 2
  above it 0.7 / 0.9 (G1's `headShare`), 1.0 from ring 3.

**Head envelope.** Per base: the shared cranium plus the union of the base's head variants (ears included), offset
outward by `face.envelopeOffset` = 15 mm. The thickest hair cap is `sidepart` at 12 mm, plus 3 mm clearance. G1h exports
the envelope mesh. G3 fits cap, cap_officer, beanie, boonie, headset, helmet_std and helmet_heavy over it, so G3 does
not wait for the heads. Helmets stop at the brow line and over the ears. The envelope (`heads/<base>/envelope.json`) is in
G1's body frame; its `landmarks.headJoint` / `neckJoint` are G1's bind joints (the rig the headwear rides). The gear jobs
of the `headEnvelope` pieces need the job that writes it (`haircaps-<b>`, or `heads-broad-1`).

**Hair caps (A13).** Opaque offset scalp shells with strand normals, one hair tint slot. The data gives the triangles
and the offset for each:
- `buzz`: even ~3 mm clipper cut.
- `crop`: short textured crop, soft fringe.
- `sidepart`: short back and sides, longer top combed to a left part.
- `receding`: short cut, hairline 25 mm back at the temples.
- `fade`: sides faded to skin at the ears.
- `bald`: no mesh; the scalp and a light shave shadow are in the face tile.

Brows, lashes and stubble are painted into the face tile. LOD2 hair is in the albedo.

**Skin tones** (linear RGB tints over a neutral skin albedo with mean 0.75, slot `skin`):
| Tone | Tint | Reads as |
| --- | --- | --- |
| 0 | 0.75, 0.444, 0.329 | light |
| 1 | 0.75, 0.355, 0.197 | medium |
| 2 | 0.42, 0.17, 0.08 | brown |
| 3 | 0.17, 0.07, 0.035 | dark |
Every target is at or under its slot's neutral (a tint above 1 clamps and greys the colour). G10a D2 scaled tones 0
and 1 so their largest channel equals the neutral (hue kept); `guardKit.ts` rejects a channel over the neutral.
The neutral albedo carries redness (nose, cheeks, ears) as relative variation. The head report's
`faceTile.faceIslandAlbedoMeanLinear` is the face skin's mean; the whole-tile mean (~0.69) is lower only because the
scalp's shave shadow is in it, so G4 does not divide the tints by it. PLAN 8 lists the risk that the darkest
tone reads flat; G4's 1.5 m crops are the check.

**Hair colours** (linear RGB tints over a neutral hair albedo with mean 0.6, slot `hair`):
| Colour | Tint |
| --- | --- |
| black | 0.035, 0.03, 0.025 |
| darkbrown | 0.10, 0.058, 0.033 |
| brown | 0.27, 0.15, 0.075 |
| grey | 0.58, 0.57, 0.55 |

**Atlas and face tiles.** The LOD0 atlas is 4096 x 2048:
- Left 2048 square: body skin, outfits, hair caps, the eye block (256 x 256: four iris cells of 128 x 128) and every
  headwear, eyewear, gear and kit piece the base uses.
- Right 2048 square: four 1024 x 1024 face tiles, at (2048, 0), (3072, 0), (2048, 1024) and (3072, 1024), in
  `faceTiles` order.

Each base has its own atlas, so the 9 head variants share 4 tiles per base like this:
| Base | Face tiles |
| --- | --- |
| average | one tile each for its 4 heads |
| lean | one tile each for its 4 heads |
| broad | broad-1 (eye region), then balaclava (knit), plate_heavy, helmet_heavy (the PLAN's "balaclava, eye region and plate detail") |

At LOD1 (2048 x 1024) the tiles are 512 x 512, and at LOD2 (512 x 256) they are 128 x 128, in the same order and
positions. A face tile holds albedo, tangent normal and ORM, with lower roughness on the lips and the eye's wet line.

## 8. Tint slots (A7)
Slots are `uniform`, `kit`, `headwear`, `hair`, `skin` and `none`. A static per-vertex `_TINT` gives the slot, and the
atlas mask says which texels take it. Per guard, `gvis` rgb carries the slot's tint. Tint = the linear target colour
divided by the slot's neutral mean (`tintNeutral`: fabric 0.4, skin 0.75, hair 0.6), clamped to [0, 1]. Per-guard
jitter is +-6% value (`tintJitter`).

Faction palette (`src/ai/factions.ts` `FACTIONS`):
| Slot | Source |
| --- | --- |
| `uniform` | `torso`. Trousers are baked at 0.78 of the shirt's neutral, so the same tint lands near each faction's `legs` (urban 0.75, desert 0.80, maritime 0.78 of torso). |
| `kit` | `backpack` |
| `headwear` | `helmet`. Heavy and enforcer use `#14161a`, as `factionLook` does. |

Example: urban torso `#3b4048` is linear (0.044, 0.051, 0.065), so its tint is (0.11, 0.13, 0.16).

Kinds with `uniformTint: 'kind'` take the `uniform` slot from their own `enemies.json` `look.colors.torso`:
- runner (A11: work clothes, no faction tint);
- officer (the jacket keeps the officer's colour; the trousers follow it at 0.78 in this one-slot prototype).

Their `kit` and `headwear` slots still take the faction. `cap_officer` takes the officer's own `look.colors.helmet`.

The `none` slot covers the balaclava, headset, glasses, shield, torch, eyes, boots and gloves: their colours are
baked.

## 9. LODs (A8)
- LOD0 < 8 m, LOD1 8-25 m, LOD2 > 25 m, 10% hysteresis (`lod` in the data).
- No hero LOD and no close-up LOD.

## 10. Look seed (M3)
- A 7-bit per-guard seed, set at spawn from the section's spawn slot: PLAN section 2 and slice G6n (`Enemy.look`,
  `AL_LOOK` in `al`).
- `guardVariant(seed, kind, mapId)` (G6) picks from this data's pools for that kind: head, skin tone, hair cap and
  colour, headwear, `headwear2`, eyewear, the kit-pool subset and the colour jitter.
- Gameplay gear overrides the picks (A5).
- Nothing in this file depends on the seed's bit layout.

## 11. IP check list (G5, G6; every slice ticks it before its PR)
- No reference-game character, gear, unit or organisation names in code, data, file names, docs or commit messages.
- No real brands, product names or product copies: the designs in section 4 are generic and drawn from function.
- No text, numbers, logos, insignia, rank badges, flags or patches on any piece. The officer's cap has a plain cord
  band, and the shield has a plain face.
- Faces are generated from the CC0 MakeHuman targets in section 7 and never modelled on, or tuned toward, a real
  person. Skin, eyes and hair are procedural in-repo bakes, with no external skin, eye or hair assets.
- MPFB2 is credited in `docs/art-credits.md` (G9 adds "also shapes the guards and their faces").
- Gear ids stay generic (`helmet_std`, `vest_soft`, `plate_heavy`, `shield_riot`, `cap`, `beanie`, `balaclava`).

## 12. Open items for later slices
- Settled (lead, P1 fix): heavy and enforcer `helmet_heavy` is `gameplayGear`, shown only while `Enemy.helmet` (strict
  A5), like every helmet. `Enemy.helmet` is true by alarm stage or response role, so a calm heavy shows the balaclava
  and plate without the visor helmet.
- `applyGear` with `plated` (or `armour`) shows the kind's `armourPiece` (plate_heavy for heavy and enforcer), not
  plate_heavy on `plated` alone.
- Officer trousers follow the jacket colour (one `uniform` slot). Splitting them needs a sixth slot (a `gvis` value per
  slot; cheap) if Michael flags it at G10.
