# optic-coop: brief (spare job #15)

## The ask
Night Shift spare job #15: the rest of the optic cable, `docs/systems/ct-toolkit.md` 3.2, after PR #239 (the door
optic). The partner sees the kneel and the cable (MoveState mode `optic`), the gaps other than doors (floor hatches,
ceiling panels, vent grilles, shaft tops) engine side, and pings from the view reach the team. Prototype first (G4): no
map placement in this job (no spec names a spot).

Built in feature/optic-coop (ffd2a3c2, f32aaf17; `REPORT.md`). Follow-up in feature/optic-coop-2 (Michael's answers
below, plus checker A's polish items 2 and 5, `CHECK-A.md` on origin/feature/optic-coop).

## Michael's answers (2026-10-24 ~14:10, as relayed by the lead)
- **M1** "the optic at a non-door gap starts from the CT action menu at the gap (OPEN TRAP / OPTIC CABLE), the same as
  doors". The gap lists OPEN TRAP only where it is a hatch / trap that opens; where nothing opens, OPTIC CABLE only. The
  door menu's prompt and selection on pad and keyboard; refusals ("Too far", "No gap") as the door path shows them.
- **M2** "Bind ping: middle mouse on keyboard, R3 on pad; it works from the optic view too". If one is taken, keep
  Michael's binding, move nothing silently, and report the conflict.
  - **M2 R3 (2026-10-24 ~14:55, relayed)** "contextual: R3 pings normally and zooms only while aiming a scoped weapon
    (no ping while scoped). Keyboard: middle mouse pings." Built: `['zoom', 'ping']` in `ALLOWED_PAIRS`
    (`input/conflicts.ts`), so the default R3 pair is no conflict (a player's own remap of another verb onto their
    input still is); `contextPing` / `contextZoom` pick one per press: aiming a scoped weapon (`PlayerWeapons.scopedAim`)
    R3 zooms and does not ping, otherwise it pings and does not zoom. Middle mouse (Ping alone) pings in any state.
    Replaces A9.

Gap placement on the maps goes to the map leads later.

## Assumed decisions (follow-up; undo)
- A7 "Openable" = the gap names the breakable panel covering it (`OpticPoint.trap`, a `Breakables` key) and that panel is
  still closed. OPEN TRAP opens it at once and quietly (as an unscrewed grate), locally (duct grates are not on the
  wire either). Undo: drop `trap` / the `trap` row in `game/gapMenu.ts`.
- A8 The gap set is offered within 1.6 m of the gap (the door set's reach; the cable's own 1.0 m reach still refuses
  with "Too far" from the pick, as at a door), in the cable's height band, in front of the camera unless the gap is
  within 0.5 m (a hatch at the feet, a panel overhead). A faced door's set wins over a gap's. Undo: `GAP_MENU`.
- A9 (superseded by Michael's M2 R3 answer, 2026-10-24 ~14:55: contextual, an allowed pair) R3 stayed on Zoom and also
  pinged by default as a reported conflict.
- A10 (check A 2) Past 256 gaps `LevelBuilder.opticGap` refuses the gap with a console warning (the wire's bound).
