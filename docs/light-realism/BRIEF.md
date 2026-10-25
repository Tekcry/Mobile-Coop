# light-realism - BRIEF

Owner: Night Shift | Sector Ops Build. Status: current (rewritten 2026-10-25 evening; the 09:08 save's planner output was
lost, CONFORMANCE L14). Branch `feature/light-realism` (worktree `C:/NightShift/Mobile-Coop-light-realism`). Job =
FOLDED-PLAN J10 (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md` section 3 rows 20-21, section 4 row J10).
Sources: `docs/conformance-sector-ops/CONFORMANCE.md` rows L3 L4 L5 L6 L9 L12 L14 V7, section 3 "Per-map lighting",
section 4 notes; Marlow conformance M10 V5 H4; Campaign conformance S10. Citations are origin/master 2148ec96.

## Goal
Every live map is lit as a real site of its kind is lit at night, measured in lux from the light bake: one
engine-to-lux calibration, one band table from the Australian standards, the S1 car park fixed first and shown to
Michael with its lux grid and shots, then every other space and every dark-by-design pocket re-lit. Darkness comes only
from cover, cut circuits and shot lamps.

## Michael said (verbatim)
- 2026-10-25 ~09:05 (G329): "How do you know campus design gameplay flow is good, and that there is a realistic amount
  of light? On the current build the s1 car park is still very dark which is unrealistic, car parks are generally well
  lit"
- 2026-10-23 ~00:45 (G279, Marlow Yard, the training course only): "lit, players cut it, but you can also use mixed
  zones if it ends up being a better result. In game levels are quite dark and not realistic"

## Michael picked (option text he chose)
- G329 (2026-10-25 ~09:05): "Real-world levels". Recorded as: each space type gets a real-world illuminance band
  (outdoor car parks and roads AS/NZS 1158.3.1, interiors AS/NZS 1680 / EN 12464); engine light calibrated to lux once
  and measured from the bake at greybox exit; stealth only from real gaps (between poles, under carports, behind cars,
  cut circuits, shot lamps), never from leaving lit places unlit.
- Q2 (2026-10-25 ~16:40), dark spots from lights left off: "Never" (option: "every light works; darkness only from
  cover, cut circuits and shot lamps"; replaces the "dark by design" pockets on every map).
- Q3 (~16:40), light levels: "Australian standards (Recommended)" (option: "Take the levels from the Australian
  lighting standards, after one test that matches the game's brightness to real light units; you approve the table and
  the car-park light map together").
- Q26 (~16:50), the old warehouse map: "Freeze it" (no more work on warehouseOps).
- Q27 (~16:50), meter-vs-picture: "Yes, every release (Recommended)" (option: "Yes, checked on every release (3-5 min
  more); other picture flags advisory for now").
- Q28 (~16:50), look baseline: "Me, with your OK (Recommended)" (the orchestrator accepts a look change into the
  visual-gate baseline only with Michael's sign-off on record).

## Rules this job carries
- Light parity (CLAUDE.md hard rule): the picture, the light meter and guard perception agree; one lighting system;
  gameplay never reads graphics settings. Every change here is to lamps and fittings in the bake, never to a preset.
- `docs/level-design.md` 5.1 (line 155: every lit pool has a visible source, darkness where nobody works) and 5.5 (line
  166: the band, measured from the bake). The standard and scale sheet section 9 change only with Michael's approval;
  the S1 sign-off (`SIGNOFF.md`) is that approval (Q3).
- Lighting changes to shipped maps are rule fixes (G355): allowed at the walk cap, no feature flag. Each lighting PR
  carries a 1-2 min look video (RULES "Walk pacing").
- Raise lamps, never the ambient fill: guard torch slots exist only where the ambient or a zone is under 0.5
  (`src/world/torches.ts:36`), so a brighter fill would remove guard torches.

## Maps
| Map | In this job | Who re-lights |
| --- | --- | --- |
| campusOps (Saltmarsh Park) v1, S1-S5, every space | yes: S1 car park first (sign-off page), then S1's other spaces and S2-S5 | Sector Ops Build (this job) |
| campusOps v2 (`flags.campusV2`, J17, feature/campus-greybox) | band and fixture rules only, through J17's lane briefs | J17 (Sector Ops), not this job's code |
| warehouse (base map, every mode) | yes: the unlit strips (CONFORMANCE L4) | this job |
| ctcourse (Marlow Yard) | band table and method handed over; its sets (M M10, M V5, pockets M H4) | Marlow Build, with this job's band table |
| Tallow Wharf (campaign) | later, with the band table (C S10, J8) after Michael's review of the 12 level rules (Q1) | Campaign Build |
| warehouseOps (old Sector Ops map) | no: frozen (Q26); keeps its dead fittings (A1) | nobody |
| provingGrounds, kestrel (paused), seclab / courselab (debug), bunker (parked) | no (lit range, paused, debug, parked) | - |

## Assumed decisions (logged; each with its undo)
- **A1** warehouseOps keeps its dead fittings (`src/world/maps/warehouseS1.ts:62`, `warehouseS3.ts:124-131`): Q26
  "Freeze it" outranks Q2 for that map (logged first in PR #433). Undo: add warehouseOps to PLAN L3.
- **A2** The calibration is one curve from lux to the engine's light level, anchored at two points: 1 lux = 0.28 (the
  meter's dark line, `LIGHT.shadow`) and 10 lux = 0.60 (the lit line, `LIGHT.lit`): level = 0.28 + 0.32 x log10(lux),
  clamped 0-1. It fits the engine's existing night floors (the moon 0.104 reads ~0.3 lux, a real full moon 0.05-0.3;
  the standby fill 0.14 reads ~0.4 lux). Tested against one real fitting in L0 (A13); shown on the S1 sign-off page.
  Undo: change the two anchors in the one calibration module and re-run the measures (PLAN L0).
- **A3** Measurement planes follow the standards: car parks, roads and yards are horizontal at the ground (field at y
  0.1); offices, labs, data halls and security rooms at the task plane (y 0.8); corridors, stairs, lobbies, warehouses
  and plant rooms at the floor (y 0.1). The meter's own height (y 1.0) is shown beside each. Undo: change the plane in
  the space list.
- **A4** A band is the standard's maintained average as the floor of the space's mean, up to 2.5x it, plus the
  standard's point minimum (or uniformity) where it gives one. Values not checked against a purchased copy of the
  standard are marked "to verify" in `research/bands.md`; nothing is downloaded or bought without asking Michael.
  Undo: edit the table before Michael's click.
- **A5** The S1 staff car park is AS/NZS 1158.3.1 category P11a (the highest outdoor car-park category: a secure site
  with night staff; Michael: "car parks are generally well lit"). Shown on the S1 sign-off page with P11b as the
  "Changes first" alternative. Undo: re-tune the columns to P11b.
- **A6** The S1 light-point fix is map data, not an engine change: each column lamp moves to a luminaire head on a
  0.8 m outreach arm (a real single-arm column), so its own pole no longer hides it. The test exemption for lamps on top
  of their posts (`tests/lampBoxAlign.test.ts:206-208`) shrinks to nothing. Undo: revert the column block; the engine
  alternative (ignore a lamp's own mount in the march) stays written in PLAN L1.
- **A7** The engine's night floors stay as they are (theme moon, standby fill 0.14, transit fill 0.30): lamps are added
  or raised, never the fill (torch slots, `torches.ts:36`). Undo: none needed.
- **A8** v1 campus is re-lit now (it is the live map); v2 takes the same band and fixture rules through J17's lane
  briefs. This job edits no `src/world/maps/campusV2/` file. Undo: drop the v1 part of PLAN L2 for any section whose v2
  switch-on comes first.
- **A9** "Dark by reason" spaces inside the lit site get fittings lit to their band: open plan, meeting rooms, stairs,
  lobbies, corridors, hot aisles, the archive, the cafe (Q2 "every light works"; "nobody works there at night" and
  "aisle lights off" are retired as reasons). A space with no fitting stays dark only where a real site has none
  (outside the lit site: the marsh verge, behind a fence). Undo: per-space list in PLAN L2.
- **A10** Scale sheet section 9's row "After-hours interior (lights off)" is retired (Q2 "Never"). Undo: restore the
  row with Michael's word.
- **A11** No feature flag (G355 rule fix). Code PRs that change the look of a shipped map stay off the train until
  Michael's click on the S1 sign-off; after it, the band is approved and later PRs train normally. The visual-gate baseline
  takes each look change only with that sign-off on record (Q28). Undo: put the re-light behind a default-off flag.
- **A12** The campus S1 co-op boost point (-13.5, -38) gets a real gap (a canopy column's shadow, the kerb end behind
  the smoking shelter) instead of canopy lamps placed to keep it dark; Sector Ops picks the gap and the lead's checker
  confirms the lip is still a co-op pathway. Undo: keep the A65 lamp layout and log the beat as a Michael question.
- **A13** Q3's "one test that matches the game's brightness to real light units" is L0's reference test (PLAN L0): one
  real 6 m car-park column from its maker's published photometric data, modelled with the engine's lamp terms, engine
  level against real lux at 5 ground distances, fit error reported. The data comes from a datasheet page read by the
  lead, never a downloaded or bought file (A4). If the fit misses (RMS level error over 0.03) or no usable published
  data is found without a download, the A2 anchors stay as a chosen mapping, and calibration.md and `SIGNOFF.md` say
  plainly "the anchors are chosen, not measured", with the fit error when there is one. Undo: Michael supplies a
  datasheet or allows a download, and L0's test is rerun on it.

## Questions for Michael
None now. One question rides the S1 sign-off (`SIGNOFF.md`, PLAN L1): approve the band table and the S1 light map
(Q3). The anchors (A2) and the car-park category (A5) are shown on that page as what "Changes first" leads to.
Overnight the recommended answer is assumed and logged (G358).

## Out of scope
Character shadows in the meter (J16); late-join and failed-lamp parity, the parity suite itself, the 0.27 band and the
flicker pin (J11); the validator reading scale sheet 9 (J12, M V5); warehouseOps (Q26); Marlow's set data (Marlow
Build); Tallow (Campaign); fog / beams (CONFORMANCE L18).
