# Operators run - state (resume point)

**Now:** step 09 (Wren: chest rig, radio and cables, belt, holster, sleeves, pod, medkit). Step 08b (composite armour
and harness) passed the independent check after 1 fix round: LOG.md "Step 08b", decisions A53-A61. Step 08a (suit) is OPEN after 3 fix rounds (LOG.md "Step
08a", evidence steps/08a-fixes-r4.md); retried at the Wren block end after step 11 with steps 07 and 08a.
**Run style:** unattended (D15), one orchestrator session like the locomotion run (D18): implementer, independent Opus
checker, up to 3 fix rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Start
and resume prompts: OWNER-NOTES.md ("Operators run: RESUME (local)"). Step 12 starts by asking Michael (D24).

**Key facts (after 08b)**
- Layers: `GARMENTS.wren` = `suit`, `gloves`, `boots`, `headwear`, `head_kit`, `armour` (FITTED). Armour objects:
  `wren-armour-plate` (`armour composite`), `-trim` (`armour edge rubber`), `-metal` (`hardware gunmetal`: the suit
  slider's finish under its own name, A59), `-strap` (`armour strap` laminate); empties `weaponMount.backL/.backC/.backR`.
- 08b fix round 1 (A61): `Field(caps=, fair=)` (bust domes, back rows faired), straps laid on the plate faces
  (`strapIntoPlateMm` 0.0 all four; a strap on a sloped face: solve the map z for the world height, extrude along the
  band's own normal), sockets turned by `twist` with gunmetal floors. Follow-ups F1-F6 in LOG.md.
- Reuse for 09: `mag_buckle.build(metal, rubber, O, along, across, n, strap_w)` (every strap closure); armour.py `Field`
  / `Shell` (a conformal map on the suit: `S(x, z, h)`, `normal`), `plate_solid`, `trim`, `bar_mesh`, `pframe` on the
  plate maps; chest rig pouches sit on the chest plate (`sm_ch`, outer face h = 0.008). Left shoulder strap keepers at
  0.07 / 0.20 / 0.30 m from the front buckle (cable route); radio recess x 0.030-0.086, z 1.256-1.317, 5 mm deep;
  antenna keeper on the back plate's top edge at x 0.02. The suit is pressed by `compress` under the armour (A33).
- The back-carry lane (A39) holds only the plate, the recess and the receiver bar inside |x| < 0.09; `backGearM` 0.022.
- Pipeline: `npm run operators:build [-- wren] [--render] [--from <garment>]` (armour stage about 45 s, its render
  about 3 min), `npm run operators:check [-- wren --only <items>]`; outputs in `build/operators/<id>/`.
- Near-black renders mid grey in close-ups (OPEN since 05): keep rakes at 5-10 W.

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left-thigh sleeves (A41).
