# G6 report: guard variation

Branch `feature/gm-g6`. Pure module, no Babylon / DOM / `src/net`.

## Files
- `src/operators/guards/guardVariant.ts` (new)
- `tests/guardVariant.test.ts` (new, 28 tests)

## API
- `createVariant()`, `createPieces()`, `hasPiece(p, id)`: allocate once; the caller owns the buffers.
- `guardVariant(seed, kind, mapId, out)`: seed masked to 7 bits; hash = FNV-1a of kind and mapId (cached in a Map,
  hashed once per string) mixed with the seed through a murmur finalizer; one independent draw per decision. No
  `Math.random`, no allocation after the first call per (kind, mapId).
- `applyGear(v, helmet, armour, plated, kind, out: GuardPieces)`: `GuardPieces = { ids: string[16], count }`, reused.
  Output is the visible piece set: head variant, hair cap (unless bald or hidden), headwear, headwear2, eyewear, kit,
  outfit, gear. Piece ids are exactly the contract ids.
- Exported id tables (`HEADS`, `HAIR_CAPS`, ...) for G5's mask and tests.

## Decisions assumed
- Kind strings match `src/config/enemies.json`: grunt, runner, heavy, sniper, enforcer, droneOp, officer. Unknown kind
  (dog) falls back to the grunt profile.
- Extra field `headwear2` (`cap` or null): the matrix says droneOp "headset + cap / hair" and `headwear` holds one id.
  droneOp: headset always, plus a cap 40% of the time. Drop the field if G5 prefers a single slot.
- Pools (weights): grunt cap 4 / beanie 2 / none 4; runner beanie 4 / none 6; sniper boonie 6 / cap 4; officer
  cap_officer 8 / none 2; heavy, enforcer balaclava; droneOp headset. Hair cap weights buzz 3, crop 3, sidepart 3,
  receding 2, fade 3, bald 1. Hair colour black 4, darkbrown 4, brown 3, grey 1. Clear glasses 8% on open-face
  kinds except sniper (fixed glasses_dark). Kit: fixed pieces per matrix (grunt radio + flashlight_mount, droneOp
  pouch_belt, officer radio), optional ones by percent per kind. Jitter uniform in -0.06..0.06.
- Hair cap: hidden under a helmet, a balaclava or a beanie; shown under cap, cap_officer, boonie, headset (art may
  tighten this in G1). Bald is never listed.
- Helmet: helmet_std for `helmet`, replaces headwear and headwear2 (headset included); balaclava stays. Heavy and
  enforcer always show helmet_heavy + balaclava regardless of the `helmet` flag.
- plate_heavy: heavy always; any other kind when `plated`, except the enforcer. enforcer config has `plated: true`,
  but the matrix gives it vest_soft + shield, no carrier. A plate carrier replaces vest_soft. Change: one condition in
  `applyGear` if the orchestrator wants plated enforcers to show the carrier.
- `kit` is a fixed 4-slot array with `kitCount`; unused slots hold the filler `'radio'` (keeps whole-object equality).
- The faction tint (A7) is applied by the renderer from the faction palette; the variant carries only `jitter`.

## Tests (28, all pass; `npx vitest run tests/guardVariant.test.ts`)
Determinism over 128 seeds x 7 kinds x 3 maps (also with a dirty reused `out`); contract ids only; jitter bounds;
no (head, skin, hairCap) combo above 15% per kind; open-face kinds cover all heads / skins / caps / colours; maps and
kinds differ for the same seed; matrix rules (bases, broad-1 only, balaclava, sniper glasses_dark, officer
uniform_jacket, runner work, droneOp headset); applyGear rules (A5, A6, A14, heavy, enforcer, shield enforcer-only,
helmet off restores headwear / hair, reused buffer). `tsc --noEmit -p .` and eslint on both files: clean.

## Open items
- Hot-path allocation is by construction (no allocation in code); no allocation test.
- The hair-hide rule per headwear and the headwear2 slot need G1 / G5 confirmation.
