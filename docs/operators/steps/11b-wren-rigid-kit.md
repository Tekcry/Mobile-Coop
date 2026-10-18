# Step 11b - Wren: rigid kit and desktop only

Model: Opus 5.5, High effort. Unattended (D15), run by the orchestrator's step loop (RULES.md "Step loop", D18).

## Objective

Every rigid item on Wren keeps its true straight shape and true size, sits where a stealth operative can crawl, climb,
crouch and rappel, and is skinned so animation never bends it (D28, Michael's picks). The phone LOD is removed (D29).
Then the LODs, bakes, KTX2 and the step 11 sheets are rebuilt.

## Read (only these, plus the common files)

- DECISIONS.md D28 and D29 (all), D25, A36-A41, A62-A68, A74-A80 (grep).
- `docs/operators/concepts/D28/D28-OPTIONS.md` (survey, causes, build plan) and `LAYOUT.md` (the layout and pose checks).
  Their scratch scripts (`place()`, seats, pose rig, interference probe) are in
  C:/Users/Micha/AppData/Local/Temp/claude/C--NightShift-Mobile-Coop-operators/ee17d8dc-7926-4cff-a57b-386ce6d93dc6/scratchpad/d28/
  (and `layout/`): reuse what helps, but the shipped code lives in `scripts/operators/py/`.
- STATE.md "Step 11b list"; SPEC 6.3 / 6.4 (LODs); the garment modules you change.

## Do

1. **Rigid placement helper** (`kit_common.rigid()` or similar): builds each hard part in its own frame at true size
   and places it with one rigid transform; fits a moulded seat (soft carrier or saddle) between it and the body,
   with a standoff where the gap is over 3 mm; records the design mesh, transform and bone; tags its vertices with a
   rigid part id. `cbox` and the conformal map stay for soft parts only.
2. **Layout (D28 picks):**
   - Rifle mags: 2, vertical, low on the chest plate (R1), true 178 mm with their own design curve, base plates up,
     left-hand draw; slim pouches; bone chest.
   - Pistol mags: 2, horizontal on the left hip side at about 9 o'clock, rows raised about 20 mm (lower row's bottom at
     or above the belt's lower edge), true 128 mm, on a moulded seat; bone pelvis.
   - Compact-gun sling socket: moves back to about 8 o'clock (update the anchor, A41, and the anchors check).
   - Knife: true 190 mm (about 90 mm blade), outer-front left thigh, handle up, left-hand draw; bone hipL.
   - Throwable sleeves: 3, straight, on the outer left thigh, caps up, packed with the knife so nothing reaches the
     calf in a deep crouch (LAYOUT.md "Recommended changes" 2: pose-test the packing); bone hipL.
   - Drone pod: rear-left hip, flat hard pod on a saddle (D1), 20-30 mm higher or 10-15 mm further back than the
     block-in so the knee-up crawl clears it; bone pelvis. Medkit stays soft (rear-right); skin it to pelvis.
   - Cam pouch (soft): to the old front-left pistol spot, clear of the 9 o'clock mags.
   - Also straighten every other hard part the survey found bent: radio (planar recess floor in the back plate), metal
     tabs, rappel D-ring and sling boss.
   - Holster hipR and the rifle mount unchanged.
   - Brow plate rivets (Michael, 2026-10-17: "What are the floating dots on her forehead pad"): `head_kit.py` places
     them on a straight line from the plate's centre (`pf_top + X * ±0.026`), so they float in front of the curved
     plate. Seat them on the plate surface through the side-strap tabs; `rigidKit` also fails any small hardware more
     than about 0.5 mm off its host surface.
3. **Skinning rule** in `export_gltf.py` and `bake_lods.py`: every vertex of a rigid part gets the same weights -
   chest kit, chest and back plates, radio, PTT, rib 1 on chest; rib 2 a fixed chest 0.5 / spine 0.5; rib 3 spine;
   belt kit, pod, medkit, belt and hanger buckles on pelvis; thigh kit, holster, sleeves, leg-band buckles on hipL /
   hipR; head hard parts on head. Rigid parts stay separate pieces in the LODs (extends A77).
4. **`rigidKit` check** in `operators:check` (pure logic in a Babylon-free module with Vitest tests): every rigid part
   within 1.0 mm of its design shape after best-fit alignment; in the hero GLB and every LOD each rigid part has one
   weight vector (spread at most 0.001) on its declared bone(s) only; no hard vertex more than 0.5 mm into the body;
   seats over 3 mm have a mount; true dimensions within 2 mm of the item table.
5. **Pose check** (the D28 proof): pose the built Wren in the four LAYOUT.md poses (prone knee-up crawl, rope climb with
   the knee at hip height, deep crouch, rappel seat) and record per rigid item the clearance or interference and the
   draw path; render each pose (2 views, interferences in red) into `docs/operators/mockups/wren/`
   (`wren-sheet-poses.webp` or one sheet per pose). Nothing may press into a hinge or block a draw except what LOG
   lists as accepted with the reason.
6. **Desktop only (D29):** remove the phone LOD from the pipeline (bake_lods, export, KTX2, report.json, Lab LOD lists,
   sheets, operators:check items and limits, SPEC 6.4 rows); LOD2 stays as the far desktop band. Update SPEC 6.3 /
   6.4, DESIGN.md costs and scripts/operators/README.md.
7. **Gunmetal** (STATE.md 11b list): in `materials.py`, base colour (F0) about 0.25-0.45 linear at roughness near 0.55,
   or a dielectric coating whose metal read comes from edge wear; recheck on `wren-sheet-closeup-buckle.webp`.
8. **Rebuild:** the changed garments and every item after them, `operators:check`, `operators:lods -- wren --render`,
   `operators:ktx2`, then re-render all Wren sheets (E2E_GPU=1 E2E_PORT=4191) with updated callouts (new positions,
   knife, sling socket) and LOG.md verdicts. DESIGN.md: the loadout table and the anchors.

## Out of scope

The step 08a / 10 / 11 block-end retries (they run after this step), Moth, the game-side runtime.

## Checks (all must pass before the commit)

- `npm run operators:check -- wren` passes every item, including `rigidKit` and the anchors (the known step 10 LOD1
  chest bakeDiff may stay open for the block-end retry; record its new value).
- The pose sheets exist on the GPU and show no unaccepted interference.
- `npm run check` passes.

## Finish

As RULES.md "Step loop": the implementer drafts the LOG.md record (with the item table: item, true size, position,
bone, seat gap, pose results) and STATE.md, and returns; the orchestrator commits "operators: step 11b - Wren: rigid
kit and desktop only". Then the Wren block-end retries (08a, 10, 11).
