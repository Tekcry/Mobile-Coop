# LR16h part 1 - docs edit table (build report)

Branch `feature/sector-redesign-lr16h` at base `f8008542`. Docs and one script line only. No `src/` file touched.

## Files changed
| File | Change |
|---|---|
| `docs/systems/lighting.md` | Dropped the Classic / `?falloff=photo` / `start.lf` sentences (line ~36-38). Added a one-model list above the `lampMath.ts` bullet: LR16b `world/lampMath.ts`, LR16e `world/lightBake.ts`, LR16-1 `world/ambientGrid.ts`, LR16t (no file), LR16-7 / LR16f / LR16-3 `world/charShadows.ts`, `world/charShadowSet.ts`. |
| `docs/systems/ui.md` | Deleted the "Lamp falloff" Settings item (LR13). Character shadows item kept. |
| `docs/systems/testing-tools.md` | Deleted the "## Lamp falloff (lightrev LR13)" section (`E2E_FALLOFF=photo`). |
| `docs/lighting-review/PROPOSAL.md` | Appended "## 8. LR16 (2026-10-23): one light model" (Michael quotes ~18:08 and ~18:12, LR16a removal, LR16b / e / 1 / t / g, pointer to `lr16-plan.md`). Section 7.x untouched. |
| `scripts/lamp-audit.mjs` | Deleted line 34 `lampMath.setLampFalloff?.('photometric');`. |
| `changes/feature-sector-redesign-lr16.md` | Added bullet "Docs name one light model (no Lamp falloff setting)." |
| `docs/sector-redesign/checks/lr16h-build.md` | This report. |

Skipped (already fixed at `f8008542`, per lead): `docs/systems/coop.md:24`, `docs/systems/coop.md:34`, `TESTING.md:49`.

## Grep: before
Command: `grep -rni "lampFalloff\|lamp falloff\|classic\|falloff=photo\|E2E_FALLOFF" docs/systems TESTING.md docs/level-design.md scripts/*.mjs` (15 hits, saved at `/tmp/claude-0/-home-user/5780e2cf-9117-5cf8-8f9d-878de1e00773/scratchpad/grep-before.txt`):
- `docs/systems/ui.md:53,55`
- `docs/systems/testing-tools.md:323,324`
- `docs/systems/lighting.md:36,37,38,40`
- `docs/systems/coop.md:24,34`
- `TESTING.md:49`
- `scripts/e2e-menus.mjs:672,679,680`
- `scripts/lamp-audit.mjs:34`

## Grep: after (7 hits, saved at `.../scratchpad/grep-after.txt`)
- `docs/systems/lighting.md:44`: `tests/lampFalloff.test.ts` (test file path; the file exists). Not in the brief's acceptable list. Left as is.
- `docs/systems/coop.md:24`, `docs/systems/coop.md:34`, `TESTING.md:49`: the already-fixed rows, left as shipped at base. Not in the acceptable list.
- `scripts/e2e-menus.mjs:672,679,680`: acceptable (asserts the row is gone).

No hit under `docs/archive` or `docs/sector-redesign/checks` was edited.

## tsc
`timeout 580 npx tsc --noEmit -p tsconfig.json`: exit 0, no output.

## Open items
1. Docs ahead of code. LR16e, LR16-1, LR16t and LR16g have no commits in `f8008542` (only briefs). Branches `feature/sector-redesign-lr16-1`, `-lr16e`, `-lr16t` sit at `c7a26ca7`. `lighting.md` and PROPOSAL section 8 describe them as current. Merge this branch after those land, or accept the ahead-of-code wording. LR16t has no file named because no code exists at base.
2. The file names for LR16e (`world/lightBake.ts`) and LR16-1 (`world/ambientGrid.ts`) are the likely homes, not verified against code.
3. `docs/sector-redesign/checks/lr16-plan.md` does not exist in this tree. PROPOSAL section 8 and `lr16a-build.md` both point to it.
4. `scripts/lamp-audit.mjs:33` comment ("until LR16a makes it the only one") now describes a deleted call. Not edited (outside the table).
5. Quotes in PROPOSAL section 8 are taken verbatim from `lr16b-build.md:3` (~18:08) and `lr16a-build.md:3` (~18:12).
