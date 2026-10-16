# Operators run - state (resume point)

**Now:** step 10 (Wren: baked maps, LODs, glTF and costs), Opus 5.5, High. Step 09b (approach boots) passed the
independent check after 1 fix round (LOG.md "Step 09b"; A67-A68). Step 08a (suit) is OPEN after 3 fix rounds; retried
at the Wren block end after step 11 (it also owns the suit's ankle hem, A68). Watch: edgeLength 29.65 mm vs 30.
**Run style:** unattended (D15), one orchestrator session (D18): implementer, independent Opus checker, up to 3 fix
rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Step 12 starts by asking
Michael (D24).

**Key facts (after 09b)**
- `GARMENTS.wren` = suit, gloves, approach_boots, headwear, head_kit, armour, chest_rig, waist_belt, leg_kit (all but
  the suit FITTED). `approach_boots.py` builds kit id `boots` (objects `wren-approach_boots-*`); `boots.py` stays for
  Moth. New items' objects `wren-<item>-<lam|poly|rubber|metal|cord|cable|elastic>`; one new material `kit elastic`.
- A68 (fix round 1): the suit's settled hem rises to 13-14 cm at the back; the collar's top line rises smoothly to a
  low heel tab (top edge 12.8-13.96 cm, `BACK_RISE`) and `press_suit_hem` moves the suit's render objects down and in
  (1.5 mm inside the lining, poke-through probe `suitPokeThrough` 0 / 0). Views `m-boot-medial-back-l/-r` added.
- `kit_common.py`: `HField`, `RingMap`, `cbox`, `cord_loop`, `standoff`, `lane_report`. `waist_belt.hip_map` is reused
  by leg_kit. Empty `pistolHolster` (leg_kit) next to `weaponMount.back*`; the game slot formula in leg_kit.py (A62).
- Loop: `npm run operators:build -- wren --from <item> [--render]`, `E2E_GPU=1 npm run operators:check -- wren
  [--only <items>]`; the chain from approach_boots with renders about 25 min.
- Near-black renders mid grey in close-ups (OPEN since 05): keep rakes at 5-10 W.

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left hip (A41), sidearms anchored at the holster
mouth (A62).
