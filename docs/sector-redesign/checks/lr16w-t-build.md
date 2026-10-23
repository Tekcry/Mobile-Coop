# LR16-W part T - campus #81, the audit lists, the lint error (build report)

Builder: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w-t` off `67f3661a`. Brief:
`docs/sector-redesign/briefs/LR16-W.md` "Part T" (lead decisions 1, 2, 5).

## Built
1. Campus #81 (lead decision 2), `src/world/maps/campusS4.ts:418` (was `:416`; two comment lines added above it): the
   B-cage basket support moved from (18, 37), where it ran through the cage downlight (18, 2.8, 37) and down its beam, to
   **(17.55, 38.5)**: the basket's west rail as the brief says, but 1.5 m north of the lamp instead of level with it
   (brief: (17.55, 37)). Reason, measured (below): at (17.55, 37) the post stands 0.45 m beside the lamp and shadows the
   west third of the cage floor (x 16.5: 1.00 -> 0.45). At z 38.5 it casts only a short wedge behind itself and the cage
   reads within 0.004 (mean) of no post at all. z 39 was as good for the light but the rear gate's 1.2 m leaf (hinge
   (17.4, 40), swinging into the cage) would sweep through it; at z 38.5 the post is 1.51 m from the hinge. The post stays
   0.1 x 4.0 x 0.1, non-colliding, visual only; the lamp is untouched.
2. The lists (lead decisions 1, 2), `tests/lampBoxAlign.test.ts`: `warehouseOps:34` and `warehouseOps:53` moved from
   `KNOWN_EMBEDDED` to `ON_ITS_POST` with "exit sign, a wall bulkhead 0.09 m off the wall face (warehouseS1.ts:83 / :92):
   wall-mounted, accepted (lead, LR16-W)"; `campusOps:81` deleted (fixed). `campusOps:16` stays. The `known` check equals
   the remaining key (`campusOps:16`).
3. Lint (lead decision 5), `tests/torchOcclusion.test.ts`: `import type { AiContext } from '../src/ai/enemy';` added to the
   imports, the inline `type AiContext = import(...)` line deleted. The type import is erased, so the test's dynamic
   `await import('../src/ai/enemy')` loads the module where it did.

## Light parity: the cage floor (campusOps light field, doors shut, `bodyLevel(x, 0, z, 1.7)`)
Brief's point (18, 0, 37.5): **0.292 before -> 1.000 after** (clamped; the post cut the cone right under the lamp).
Cage floor grid x 14.5..21.5, z 34.5..39.5 (1 m, 48 points):
| post | (18, 0, 37.5) | cage mean | min | points < 0.28 | west side (16.5, 36.5) |
| --- | --- | --- | --- | --- | --- |
| (18, 37) base | 0.292 | 0.244 | 0.14 | 32 / 48 | 0.42 |
| (17.55, 37) brief | 1.000 | 0.415 | 0.15 | 26 / 48 | 0.45 |
| **(17.55, 38.5) built** | **1.000** | **0.445** | 0.15 | 25 / 48 | 1.00 |
| none (reference) | 1.000 | 0.449 | 0.15 | 24 / 48 | 1.00 |
The cage centre is now a lit pool under its downlight (1.00 over x 16.5-19.5, z 35.5-38.5), the corners stay dark
(0.15-0.17): a clear pool, clear dark. The post is in the bake, so the picture, the meter and the guards move together.

## Collision, nav and cover
The post is `collide = false`: no Havok body, not in the nav grid's blockers, skipped by `coverData` (`!b.collide`). No
route point, takedown spot or switch is near it. Covered by `campusS4` (nav, route legs, the 0.6 m body-height box rule,
door separation, sealing, sight) and `campusRuntimeNav`, both green.

## Tests (vitest single files, `--maxWorkers=2`, slot lock)
| file | result |
| --- | --- |
| `lampBoxAlign` | 6 passed (embedded audit over every map: no new entry, `known` = `campusOps:16`) |
| `campusS4` | 41 passed |
| `campusPosts` | 3 passed |
| `campusRuntimeNav` | 3 passed |
| `torchOcclusion` | 6 passed |
| `lampAtlasFit` | 6 passed |
`npm run lint`: 0 errors (42 warnings, all pre-existing `no-console` in scripts / docs). `npx tsc --noEmit`: clean.

## Skipped
- Laptop: `e2e-sectorops` campus part rides on the integrated head's run (brief).

## Lead call
- The post position differs from the brief by 1.5 m in z (reason and numbers above). Undo: `[17.55, 38.5]` -> `[17.55, 37]`
  in the `:418` list; then the cage's west third reads ~0.45 instead of 1.00.

## For Michael to try
Campus S4, the cable cage at night: the downlight over the cage centre now lights the floor under it (it used to sit
inside a steel post); the support hangs from the basket's west edge a step towards the rear gate.
