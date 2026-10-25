# light-parity - brief (FOLDED-PLAN J11)

Owner: Night Shift | Sector Ops Build. Status: current.

Job: FOLDED-PLAN J11 (`docs/orchestrator/FOLDED-PLAN.md` on origin/feature/menu, section 3 break 22, section 4 row
J11): "Parity fixes: S1 moonlit and warehouseOps aisle triage; late-join section hint (wire) and failed-lamp sync;
parity cards per map and at Low; 0.27 band; flicker pin". Sources: `docs/conformance-sector-ops/CONFORMANCE.md`
(origin/master) rows L7, L8, V1, V2, V3, V4, V5, V8 and section 3; `docs/conformance-test-runner/CONFORMANCE.md` row
T3. Depends on J10 light-realism (`docs/light-realism/` on feature/light-realism, a parallel plan: not touched here).
Base: origin/master 2148ec969 (train 95). Plan only in this branch's first commits; code comes in the slices.

## Hard rule this job serves
VISION 4 rule 1 (CLAUDE.md "Light parity"): the picture, the light meter and guard perception agree, on any map at any
graphics preset (bible P1, L5). Break 22 lists where they do not today: two measured spots (campus S1 moonlit card,
warehouseOps S2 aisle card) and two co-op gaps (a late joiner sees the wrong light for seconds; a lamp that fails to
bake on one machine stays dark there only). Coverage gaps behind it: one parity test, Warehouse only, Epic only, never
on a train (L8, V3, V4, T3), a blind 0.27 row (V5) and a flicker exemption that hides a stable split (V8).

## Michael said (verbatim)
- G329 (2026-10-25 ~09:05): "How do you know campus design gameplay flow is good, and that there is a realistic amount
  of light? On the current build the s1 car park is still very dark which is unrealistic, car parks are generally well
  lit"
- G316 (2026-10-23 ~18:08): "Must be realistic depiction of light." (~18:15) "I want to make sure we emphasis the
  light/shadow system like chaos theory did, like a showcase no matter where you look"

## Michael picked (option text, ROADMAP "Decided" 2026-10-25 on origin/feature/menu)
- Q27 meter-vs-picture (~16:50): "Yes, every release (Recommended)". Option text in FOLDED-PLAN section 2: "Yes,
  checked on every release (3-5 min more); other picture flags advisory for now".
- Q26 old warehouse map (~16:50), told full campus rules ~2-3 days vs core ~half a day: "Freeze it" (no more work on
  warehouseOps).
- Q2 dark spots from lights left off (~16:40): "Never" (every light works; darkness only from cover, cut power and shot
  lamps; replaces the "dark by design" pockets on every map).
- Q16 4-player Sector Ops (~16:50): "Live now" (#317 coop4 ships on). A late joiner can be any of players 2-4.

## Binding rules used (not Michael's words; cited)
- Bible L5 (docs/design-bible.md:257-266): "A test samples a grid of points per map and compares the gameplay level
  against the rendered band (dark / mid / lit). Any mismatch fails." Targets on a matte 50% grey card after tone
  mapping and grade: 0.12 dark <= 4%, 0.27 dark <= 9%, 0.40 mid 12-35%, 0.70 lit >= 45% (`src/world/darkCurve.ts:86-91`
  `DARK_TARGETS`).
- G316: "meter and perception follow the picture" (docs/DECISIONS.md:1777-1778).
- CLAUDE.md: co-op code only in `src/net` behind the dynamic import; a wire change does not bump `PROTOCOL_VERSION`
  (the train does; tests read the constant).

## Assumed decisions (each with its undo)
- **A1 warehouseOps aisle triage dropped (Q26 "Freeze it").** V2 (`card-so-s2-aisle-1`, level 0.466 renders 0.417
  against 0.10-0.37) stays open and is logged; warehouseOps gets no grey cards in the new suite, so the frozen map cannot
  hold a release. Undo: add `warehouseOps` to the suite's map list (C1) and plan a GPU triage of the S2 aisle pool.
- **A2 Known misses while the suite holds releases.** The suite goes into the train run at once (Q27). A miss that is
  already measured and triaged (a T1 row, an owner and a fix date at most 7 days out) may sit on a `KNOWN` list in the
  suite; it prints on every walk card and fails the run once its date passes. Today only V1 qualifies. This loosens
  bible L5's "Any mismatch fails" for a week at a time, so it goes to Michael (STATE "Question for Michael"). Undo:
  delete the `KNOWN` list (every miss fails the train), or keep the suite report-only until V1 is fixed.
- **A3 A lamp that fails to bake goes dark on every machine.** Today it stays dark on the failing machine only
  (docs/systems/lighting.md:182-184), so that player's picture and meter read dark where the host's guards read lit.
  After N2 any machine's failed lamp is marked failed on the host and on every client (picture, meter, guards, fitting
  glow). This is a fault path, not a design dark spot (Q2): it cannot happen with valid shapes
  (`src/voxel/sectionJobs.ts:375`), it is logged once, and the bake stays uncached so the next match rebakes. No extra
  retry: the section baker already tries the pool twice and then inline. Undo: drop the `lfail` message and the `fl`
  bitset; the lamp stays dark on its own machine as today.
- **A4 Presets carded: Low and Epic.** They bracket the presets; Medium, High and `?gfx=min` (a test path) get no
  cards. Undo: add rows to the suite's `LOOKS`.
- **A5 Maps carded: campusOps (each of S1-S5), ctcourse, warehouse.** Not carded: warehouseOps (A1), provingGrounds
  (lit range, no stealth), kestrel (paused, G53), seclab / courselab (debug), bunker (parked), Tallow Wharf (no map on
  master; Campaign adds its row when the map lands). Undo: add a map row.
- **A6 The 0.27 row.** A card within 0.02 of 0.27 and under the 0.28 meter threshold is held to <= 9%. Levels from 0.28
  to 0.31 (just over the threshold) get no grey card; the meter rows still run there. This replaces the visual gate's
  edge skip (`feature/visual-gate@07eefea0 scripts/visual-gate/metrics.mjs:581`). Undo: widen or narrow the window in C1.
- **A7 Flicker pinned for every read.** Before a card search, a card render or a meter row the suite holds every
  flickering light at multiplier 1 (the page stubs `LightRegistry.tickFlicker`, `src/world/lights.ts:278`) and restores
  it after. Gameplay code is unchanged. A meter / field split that survives the pin is a real miss (V8). Undo: drop the
  pin and skip cards within reach of a flickering light.
- **A8 One parity check.** The new suite is the release gate for picture vs meter. The visual gate (feature/visual-gate,
  unmerged) drops its parity cards and meter rows when it lands, so V5 and V8 are fixed once, here. Undo: port A6 and A7
  into `metrics.mjs:581` and the gate BRIEF A22.
- **A9 Late-join hint scope.** The `start` message to a late joiner carries `ls` (the host's live Sector Ops section)
  only when that section is above 0. A client on a map that does not bake per section, or with a full cache hit,
  ignores it (it has every lamp). Course `bay`
  is unchanged. Undo: drop the field; the client bakes section 0 first as today.
- **A10 e2e-coop-gpu stays off the train run.** T3's option 1 named it; Q27 covers meter vs picture only. Undo: add it
  to `REQUIRED` in C2.
- **A11 Where the per-release result goes.** The suite prints one `PARITY-SUMMARY` line; the laptop queue posts it as
  the `parity` commit status on the train head (Q1, Test Runner); the orchestrator copies it into a "Light parity"
  section of each walk card (PLAN section 6 gives the text). Undo: the orchestrator reads the train log instead.
- **A12 Which side moves for V1.** By G316 the meter and guards follow the picture: if T1 shows the render is right,
  the field moves; if the render is wrong (a moon shadow or exposure bug), the render is fixed. T1 decides from numbers.
- **A13 e2e-darkness keeps night vision and thermal.** Its four Warehouse grey cards move into the new suite's
  Warehouse part (Low and Epic). Undo: keep both copies.
- **A14 Rule fixes ship on.** N1, N2 and the suite fix a hard rule on shipped features: no flag, allowed at the walk
  cap (G355). Undo: put N2's host side behind a flag.
- **A15 Client failure reports are capped.** The host accepts at most 8 failed lamp ids per client per match; more are
  ignored and logged (a real fault is rare; a flood is a bug or abuse). Undo: raise or drop the cap in N2.

## Out of scope
- J10's work: lux calibration, band table, the S1 light point and re-bake, re-lighting dark pockets on every map. Where
  J11 needs a J10 result the PLAN says "from J10".
- warehouseOps changes of any kind (Q26).
- Character shadows in the meter and guards (J16) and a character-shadow card rig (V9).
- The visual gate's other rows (V13-V17, J18).
