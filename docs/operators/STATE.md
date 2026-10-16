# Operators run - state (resume point)

**Now:** step 09b (Wren: approach boots), Opus 5.5, High. Step 09 (storage, holster and cables) passed the
independent check after 2 fix rounds (LOG.md "Step 09"; decisions A62-A66); it also closed step 07's OPEN earpiece
cable. Step 08a (suit) is OPEN after 3 fix rounds; retried at the Wren block end after step 11.
**Run style:** unattended (D15), one orchestrator session (D18): implementer, independent Opus checker, up to 3 fix
rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Step 12 starts by asking
Michael (D24).

**Key facts (after 09)**
- `GARMENTS.wren` = suit, gloves, boots, headwear, head_kit, armour, chest_rig, waist_belt, leg_kit (all but the suit
  FITTED). New items' objects `wren-<item>-<lam|poly|rubber|metal|cord|cable|elastic>`; one new material `kit elastic`.
- `kit_common.py`: `HField` (plate faces), `RingMap` (waist / thighs), `cbox`, `cord_loop`, `standoff`, `lane_report`.
  `waist_belt.hip_map` is reused by leg_kit (the belt: z 0.911-0.941, 3 mm, closure u 0.011).
- Empty `pistolHolster` (leg_kit) next to `weaponMount.back*`; the game slot formula is in leg_kit.py (SLOT, A62).
- 09b rebuilds from `boots`: every later item (headwear ... leg_kit) is rebuilt after it (`--from boots`).
- Loop: `npm run operators:build -- wren --from <item> [--render]`, `E2E_GPU=1 npm run operators:check -- wren
  [--only <items>]`; full chain from head_kit about 8 min without renders.
- Near-black renders mid grey in close-ups (OPEN since 05): keep rakes at 5-10 W.

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left hip (A41), sidearms anchored at the holster
mouth (A62).
