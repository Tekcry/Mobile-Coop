# G0 report: guard spec and kit data

Branch `feature/gm-g0` (off feature/guard-models 6b5c4319). Done.

## What
- `docs/guard-models/SPEC.md` covers:
  - bases, the id contract and the archetype matrix (with the lead's corrections);
  - pieces with original one-line designs and tri / texel budgets, and the budget totals;
  - bones (23 `RIG_JOINTS` + 10 fingers) and tint slots with the faction mapping;
  - the face spec: 9 recipes, neck seam, head envelope, hair caps, skin and hair tints, the 4096 x 2048 atlas and its
    face tiles;
  - LODs, the look seed reference, the IP check list and open items.
- `scripts/operators/data/guards.json`: bases, heads, hair caps, hair colours, skin tones, pieces and kinds. All ids
  are the contract's.
- `src/operators/guards/guardKit.ts` (pure): types, `GUARD_CONTRACT`, `GUARD_LIMITS`, `shownTris`, `bufferTris` and
  `validateGuardKit`.
- `tests/guardKit.test.ts`: 10 tests.
- `scripts/operators/data/mpfb2-files.txt`: appended the 53 face targets the recipes use, under a comment line, CRLF
  like the file. Every path was checked against the zip listing (read-only; nothing extracted).

## Decisions assumed
- Data format: JSON, not TS. The Python bake scripts read it directly, and the TS validator and tests import it
  (`resolveJsonModule`). `src/operators/kit.ts` is Wren's TS kit, but its rules are prose for a checker, not bake
  input.
- Macro key `gender` (1 = male), matching `py/mh.py` `macro(gender, muscle, weight, proportions)`, so G1 can pass it
  straight through.
- Lead correction applied: the enforcer's fixed gear is plate_heavy, helmet_heavy, balaclava and shield_riot (he is
  `plated: true`). The droneOp is headset always plus an optional `headwear2` cap. `hidesHair` is true only for beanie
  and balaclava, and helmets hide hair.
- Sniper and officer gameplay gear includes `helmet_std`. `GEAR_BY_STAGE[3]` gives every guard a helmet, so A5 needs it
  drawn.
- Kind data carries `helmetPiece` / `armourPiece`: the piece the gameplay bits show.
- Face recipes use face-region targets only (no `targets/head/`), so a base's heads share one cranium. That allows one
  hair cap mesh and one envelope per base. This replaces G1h's "shrink-wrapped per variant" and keeps the buffer
  inside 45 k.
- Every outfit includes gloves. The body piece is the visible neck, collar and wrist skin only.
- Eyes use a shared 256 x 256 eye block with 4 iris cells in the left atlas half; skin stays in the face tiles.
- Broad's 4 face tiles hold broad-1, balaclava, plate_heavy and helmet_heavy.
- Tint = linear target colour / slot neutral mean (fabric 0.4, skin 0.75, hair 0.6). This keeps RGBA8 precision for the
  +-6% jitter.
- Officer trousers follow the jacket colour (one `uniform` slot).
- Kind strings in `enemies.json` match the contract; no renames.

## Numbers (worst-case, conservative)
- Shown LOD0 is 15,600-17,750 per kind against a 20,000 limit. LOD1 is at most 5,500 / 7,000 and LOD2 at most 1,980 /
  2,800.
- Buffer LOD0 per base: average 42,000, lean 39,250, broad 16,000, against a 45,000 limit. LOD1 is at most 12,710 /
  14,000 and LOD2 at most 4,080 / 5,000.

## Tests
- `npx vitest run tests/guardKit.test.ts`: 10 / 10 pass. They cover:
  - the real data validates with 0 problems;
  - kinds and heights equal `enemies.json`;
  - bones equal `RIG_JOINTS` + 10;
  - every face target is in `mpfb2-files.txt`;
  - totals are within the limits;
  - five broken copies, each giving its expected problem: dangling headwear id, kind over the LOD0 shown budget, base
    buffer over 45 k, missing kind + wrong head count + duplicate id, and a cranium target refused.
- `npx tsc --noEmit -p .`: exit 0. There is no `typecheck:fast` script.
- `npx eslint` on both TS files: clean.

## Open items
- Heavy and enforcer `helmet_heavy` is fixed gear while `Enemy.helmet` is stage- or role-driven. G6/G7 choose between
  strict A5 (show it only with the bit) and the always-shown visor with knock-off (SPEC 12).
- G6 `applyGear` should key the plate on the kind's `armourPiece`, not on `def.plated` alone.
- Carry mount offsets per base are 0 placeholders until G7.
