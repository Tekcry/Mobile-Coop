# Operators run - state (resume point)

**Now:** step 08b (Wren: composite armour and harness), Opus 5.5, High. Step 08a (suit) is OPEN after 3 fix rounds
(LOG.md "Step 08a", evidence steps/08a-fixes-r4.md: crotch bulge, abdomen dimples, panel lines, waist notches, skirt
tab, lumbar); retried at the Wren block end after step 11 with steps 07 and 08a. All checks pass on the current build.
**Run style:** unattended (D15), one orchestrator session like the locomotion run (D18): implementer, independent Opus
checker, up to 3 fix rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Start
and resume prompts: OWNER-NOTES.md ("Operators run: RESUME (local)"). Step 12 starts by asking Michael (D24).

**Key facts (after 08a)**
- Layers (A37): `GARMENTS.wren` = `suit`, `gloves`, `boots`, `headwear`, `head_kit`. The suit is
  `py/garments/suit.py` (base layer blocks, bonded: garment_details 'bonded' / garment `finish`; waist sewn, no lap (A48); body bust
  relaxed by `prepare_body`, A45). Objects: `wren-suit-hero`, `-tape`, `-zip`, `-zip-tape`, `-zip-slider`,
  `-zip-garage`, `-thumb-loops`; materials `suit shell`, `suit stretch knit`, `suit abrasion weave`, `suit grip rubber`,
  `suit vent panel`, `suit seam tape`, `gunmetal`.
- 08b builds plates and harness over the suit (FITTED, `torso_common.py`, `compress` A33); carrier.py / belt.py still
  read `combat_shirt`: point them at `wren-suit-hero` (the collar layer helpers are in headwear.py).
- Pipeline: `npm run operators:build [-- wren] [--render] [--from <garment>]`, `npm run operators:check [-- wren
  --only <items>]`; outputs in `build/operators/<id>/`. Suit sim 3 min; full `--from suit --render` about 25 min, the
  full check about 25 min (background). Gloves and boots read `suit` as the innermost layer.
- Near-black renders mid grey in close-ups (OPEN since 05): keep rakes at 8-12 W.

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left-thigh sleeves (A41).
