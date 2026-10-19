# F1b check (commit 55cd8c9)

Verdict: PASS

Read-only review of the diff. No npm, vitest, builds or e2e were run.

## Blockers
None.

## Checked, no break found
- Station panels: pickup gates have no doors, press() short-circuits panel ids, no gate or exit rule waits on them. Both-in exit rule untouched.
- Grab menu: B / uiBack / Y (jump) always release; jump is not in GRAB_PASS, so Y cannot also act. D-pad speedUp / speedDown pick; stick / arrows pick only when still.
- Strike: begin() gated on pickTarget(); queued re-strike gated too. No loop.
- Doors: held / drive state clears on open / close / crack. A held door can be closed from the Close door interactable. Host and client both treat it as open (no angle on the wire).
- Notice: playerOpened entry is removed on the first notice, so there is no repeat loop. Guard close waits on occupied() and ends once clear. ctcourse has no squad, so no required door is guarded.
- Door ghost, goggles, flip and lens are render-only (post shader, vision.ts timer); gameplay does not read them.

## Polish
1. Hot path: `for (const i of this.playerOpened)` (stealthSystems.ts noticeOpenDoors) allocates a Set iterator every 0.25 s while a player-opened door exists. The existing guardOpened loop does the same. Use an array or index list.
2. Client door angle: a host-held door at up to 0.7 swing shows as full open on a client (known and documented, cosmetic).
3. doors.drive() clamps a fully open door down to 0.7 if a peek starts on it. Visual snap only.
4. Pull-back to a crack re-adds the body even if a guard stands in the doorway (rare).
