# Operators run - state (resume point)

**Now:** step 11 (Wren: full render set and self-review), Opus 5.5, High. Its FIRST task is step 10's carry-over KTX2
(D26: toktx 4.4.2 installed; A73 open). Step 10 is OPEN after 3 fix rounds (LOG.md "Step 10", steps/10-fixes-r4.md:
LOD1 chest notch, LOD0 toe streaks). Step 08a (suit) is OPEN. Both are retried at the Wren block end after step 11.
**Run style:** unattended (D15), one orchestrator session (D18): implementer, independent Opus checker, up to 3 fix
rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Step 12 starts by asking
Michael (D24).

**Key facts (after 10)**
- `GARMENTS.wren` = suit, gloves, approach_boots, headwear, head_kit, armour, chest_rig, waist_belt, leg_kit. The chain
  from approach_boots with renders is about 25 min; then `npm run operators:lods -- wren --render` (about 5 min) bakes
  the game assets into build/operators/wren/export/ (report.json, README.md, <lod>/<id>-<lod>.glb, textures/) and the
  Lab copies `<id>-lab-<lod>.glb`. Rebuilding any item means re-running operators:lods.
- LODs (A69-A71, A74-A75): hero 229 k / 4 draws, LOD0 40 k / 3, LOD1 13.5 k / 3 (closed shell), LOD2 and phone 5.6 k
  / 2 (closed shell, edges over 30 deg split, A76; rigid polymer pieces separate, A77); every glb has tangents; operators:check FAILs back faces / open edges over the hero's and bakeDiff (largest new-dark patch per view against the hero's render, A76; src/operators/bakeDiff.ts); anchors on chest /
  hipR / pelvis in every file; backGearM 0.0222; costs in docs/operators/mockups/wren/DESIGN.md. `operators:check` now
  also checks every LOD file (anchors, game joints) and FLAGs SPEC 6.4 overruns.
- Lab LOD ids: source (the unbaked build), hero, lod0, lod1, lod2, phone; the default is source.
- `kit_common.py`, `waist_belt.hip_map`, the A62 holster slot formula: as before. Near-black renders mid grey in
  close-ups (OPEN since 05).

**Open questions for Michael:** Moth's direction (asked at step 12, D24). Integration items for locomotion step 25:
upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left hip (A41), sidearms anchored at the holster
mouth (A62).
