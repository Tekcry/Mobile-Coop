# A3 - Wall, doors, CT pad layout (CT core feel job)

Branch `feature/ct-prototype`, nothing committed. Prototype only (G4): every number is a starting value (G10). G178: pure CT, if it had it.

## Built

**1. CT pad layout (G96, research layout).** `src/input/padBinds.ts`, `gamepadMapping.ts`, `gamepadSource.ts`, `keyBindings.ts`, `conflicts.ts`; docs table in `docs/systems/input-and-loop.md` (a unit test parses it against the code).

| Verb | Pad (Xbox) | CT original | KBM |
|---|---|---|---|
| Interact / context (doors, takedown, hacks, vents) | A | A | E |
| Crouch | B | B | C, Left Ctrl |
| Jump / traverse | Y | Y | Space |
| Equip: reload (tap), next weapon (hold while aiming) | X | X | R; X = next weapon |
| Back to wall (G18) | L3 | L3 | Left Shift |
| Co-op action (today the ping) | RB | Black | F, PageDown |
| Quick inventory (hold: gadget wheel) | LB | White | Tab (hold) |
| Aim / secondary (knockout comes with A4) | LT | LT | RMB |
| Fire / primary | RT | RT | LMB |
| Shoulder swap (aiming only) | R3 | - | V |
| Vision modes (one button cycles) | D-pad up | D-pad vision | N |
| Gadget / throw-cam (hold aims) | D-pad down | D-pad throw-cam | G |
| Speed gear down / up | D-pad left / right | (CT had no gears) | - / =, wheel |
| Mission device | View | Back | - (no action yet) |
| Pause | Menu | Start | P, Esc |

- Black / White mapped to the nearest free buttons: Black (co-op action) = RB, White (quick inventory) = LB.
- D-pad conflict: CT's D-pad is vision, so the M1 speed-gear rocker moved from D-pad up / down to D-pad left / right (one vision button on up cycles all modes). KBM keeps `=` / `-` and the wheel.
- Y no longer shares jump + interact and A no longer carries the context action: Y = `jump`, A = `interact`. `jump` no longer yields to an interactable or a takedown offer.
- Old saved binds: the pad and key bind ids were renamed (`cover`->`wall`, `traverse`->`jump`, `use`->`interact`, `ping`->`coop`, `speedUp/Down`->`gearUp/Down`, `gadget`->`throwCam`, `wheel`->`quick`, `goggles`->`vision`; new `device`), so a stored layout is dropped by `sanitize` and the CT defaults apply. No `SAVE_VERSION` bump needed (keys of one settings object).
- Removed pad verbs: RB / LB weapon swap (next weapon stays on X-hold while aiming and KBM X / Q), View goggles tap/hold detector, D-pad left tap-ping detector.

**2. Back-to-wall** (`src/player/wallController.ts`, `src/game/gameState.ts` `wallStep`)
- Entry by the L3 button only (stick entry stays off, G34). Only the button, aiming (`ads` leaves the wall, entry is blocked while aiming) or another action (traversal, takedown) leaves it (loco M25): the pull-away leave and the jump leave are gone.
- Shuffle 0.35 m/s standing, 0.3 m/s crouched at full stick, analog below; scaled by the speed gear `0.7 + 0.3 * (gear - 1) / 3` (gear 1 = 0.7, gear 4+ = 1) = "a little slower at the lower settings" (G35). Replaces `WALL_GEAR_CAPS` and the 0.9 / 0.6 m/s pace.
- Peek at once (G36): the stick pushed past `peekPush` 0.4 at an end peeks with no hold (`peekHold` gone), stays on over `peekKeep` 0.25. Looking past the edge still peeks.
- Strict peek camera (G137): head offset (what guards see) `peekOut` 0.25 -> **0.35 m**; camera pivot swing `WALL_CAMERA.peek.offset` 0.6 -> **0.4 m**; view turn 25 -> **12 deg**; blend 0.45 -> 0.3 s. So the camera sees about 0.4 m past the corner, not 1.0-1.5 m.
- Removed (G52): SWAT turn (`WallPhase 'swat'`, all `swat*` state / constants, `swatDuration`, `SWAT_MAX_PACE`, the link-build gap targets `gA/gB/gapA/gapB/gatA/gatB`, `startSwat/swatStep`, `MoveMode 'swat'`, `swatCommitOk`, `traversePath 'swat'`); lean-out and over-the-top (`lean`, `lk`, `leanS`, arc, `LEAN_KIND`, `lowAimKind`, `leanPastEdge`, `leanBodyTurn`, `wallHeadCap`, `remoteWallHeadCap`, `LOW_AIM`, `WALL.lean*`, `WALL_SUB.lean`, `WallInput.aim/moveUp`, camera `wallLean`). `WALL_SUB.low` (64) stays (low faces are always crouched, the takedown attacker state reads it); the rig's `headCap` field is dormant (always NaN now).

**3. Doors** (`src/game/doorMenu.ts` new, `gameState.ts`, `src/ui/hud/hud.ts`, `src/styles.css`)
- A at a closed, unlocked door within 1.6 m (facing it) opens the CT door menu in the HUD (`.hud-doormenu`): **Open**, **Stealth open**, **Bash**, **Optic cable (not yet)**. The operator stands still while it is open (the gadget system and the player get a blank input). Select with the left stick up/down, arrow keys or the door-menu nav; A picks; B / crouch (or walking off) cancels. It works without a door item, so sandbox and co-op clients get it too.
- Open = the existing door item's quiet open (host-routed in co-op) else `Doors.open('quiet')`.
- Stealth open = the existing door peek (listed only when the peek is on offer): the crack is the fixed 0.12 (under the 15 % threshold, so light / sound / sight treat it as shut), the right stick looks +-35 deg, the stick pulled back closes it, pushed in opens quietly. **Stub:** the crack is not yet stick-analog (12-18 deg/s slow ... 200 deg/s fast, up to 65 deg); that needs an analog door angle on the host-authoritative `dcr` field. The A / Space door-peek context press is gone (the peek starts from the menu).
- Bash = `Doors.open('bash')` (0.22 s, loud, `DOOR_BASH_NOISE`) and knocks out any guard within 1.3 m behind the leaf and inside its span (`guardBehindDoor`, `e.knockOut`). **Stub for co-op:** a client's bash is a plain host-routed open (bash is not on the wire).
- Running into a door does nothing (G97): the gear-5 run-bash in `StealthSystems.fixedUpdate` is deleted.
- Optic cable: **stub** (feed message "not built yet"); there is no optic code in the repo.
- Lock picking / breaking (G178): **not in the codebase**, so locked doors get no menu (their item is disabled, as before). Noted for the kit job.
- Guards close doors (G41): `StealthSystems` tracks doors a guard opened (`Doors.onSound` `'enemy'`) and shuts them 1.5 s after nobody is within 2.2 m, only while nobody is alerted. **Stub:** guards noticing a door left open that "should be shut" is not built (no AI door-awareness hook).

**4. Co-op wire** (`PROTOCOL_VERSION` 14 -> **15**, once): removed the SWAT mode (`MOVE_MODES` index of `swat` deleted, so `doorPeek` is now 26: reorder allowed by the bump), the SWAT commit, `MoveState.lk` (pack / sanitize / `moveChanged`), `WALL_SUB.lean`, the remote head cap, `moveSpeedCap`'s swat branch. Nothing added: remotes show the wall stance and the peek from the existing `wall` mode (`a`, `s`, `sub` edge / peek / crouch / low / leftHand bits). Doors were already synced (`doors` open list, `dcr` crack list, the `door` crack request, item `use`).

## Files
Edited: `src/input/{padBinds,gamepadMapping,gamepadSource,keyBindings,conflicts}.ts`, `src/core/app.ts`, `src/ui/prompts.ts`, `src/ui/hud/{hud,worldPrompts}.ts`, `src/styles.css`, `src/player/{wallController,moveState,traversePath,shoulderCamera}.ts`, `src/config/camera.ts`, `src/game/{gameState,localMoveState,stealthSystems}.ts`, `src/net/{protocol,remoteAvatar,remotePlayer,validate}.ts`, `docs/systems/input-and-loop.md`. New: `src/game/doorMenu.ts`, `tests/doorMenu.test.ts`. Not touched: `src/ui/screens/**` (menu job).

## Menu-job leftovers (`src/ui/screens/`, not edited)
- `controlsScreen.ts` `fixedRows('pad')` text is stale: "A / B, d-pad, LB / RB: Menus ..." is still right for menus, but there is no row for the new verbs' CT names; the remappable rows come from `PAD_BINDS` / `BINDS` so they already show the new labels ("Interact / context (doors, takedown)", "Back to wall", "Co-op action", "Quick inventory (hold: gadget wheel)", "Vision modes", "Gadget / throw-cam", "Speed gear up / down", "Mission device (not in yet)").
- `fixedRows('kbm')` still lists "Wheel: Speed gear up / down" (still true).
- `settingsScreen.ts`: the "wall toggle / hold" row (`gameplay.wallToggle`) now means L3 / Left Shift; any help text naming A or Space for the wall is stale. The two rows from A2 (aim assist, auto recentre) are still dead.
- Any menu / tutorial text that says "A enters cover", "SWAT", "lean" or "Space peeks a door".

## Tests changed
- Unit: `wallController.test.ts` (shuffle numbers, peek at once, no pull-away, SWAT / lean / arc / low-lean tests deleted, `wallPeekWanted` and `wallSlideSpeed` new signatures), `net.test.ts` (lean / swat / headCap tests replaced by the A3 wire block, protocol 15), `moveState.test.ts`, `doorPeek.test.ts` (doorPeek index 26), `rig.test.ts` (headCap test uses a plain number), `input.test.ts` + the doc binding table, `padBinds.test.ts` (CT layout), `keybinds.test.ts`, `conflicts.test.ts` (Jump / Interact now conflict), `settings.test.ts`, `feedback.test.ts`; new `doorMenu.test.ts`.
- E2E: `e2e-wall` (shuffle 0.35, pull never leaves, peek at once, strict camera pivot <= 0.4, aim leaves; lean / SWAT / open-side / mid-switch sections deleted), `e2e-pad` (L3 wall, A interact, LB wheel, D-pad up vision, left / right gears, door menu replaces the door-peek press, edge section = peek + aim leaves), `e2e-mouse` (new key table, Shift wall, door menu by E + ArrowDown, edge section), `e2e-netmove` (peek 0.35 m, lean / SWAT / 12b sections replaced by a peek + leftHand check, door peek through the menu, close by stick back), `e2e-stealth-ai` (door menu, no sprint bash, bash KO behind the door, wall peek without the lean), `e2e-coop` (door peek through the menu), `e2e-modes` (hold A hacks), `e2e-traverse` (Space grabs ladders / ledges, A unscrews vents). Not updated (report only): `anim-audit.mjs` and `anim-sheet.mjs` still drive the removed edge verbs / `tap('cover')` wall entry (the wall entry still works); `e2e-ct.mjs` line ~367 (pad Y kick-out on a pipe).

## Results
- `npm run lint`: 0 errors (41 pre-existing warnings). `npx vitest run`: 131 files, 1457 tests pass (one run under e2e load timed out 6 tests, clean on the solo rerun). `npm run build`: ok.
- E2E on port 4193, one runner at a time, all pass: smoke, e2e-wall, e2e-pad, e2e-mouse, e2e-netmove (one run failed the known-flaky "host stows within 0.1 s" timing check, passed on the solo rerun), e2e-stealth-ai (was a pre-existing failure on the door-bash assert; now passes in full with the menu bash, the guard knocked out behind the door and the wall peek).
- Not run: e2e-coop, e2e-modes, e2e-traverse, e2e-ct, e2e-tactics, e2e-takedown (scripts edited for the new pad / door flow but not executed; e2e-coop's door-peek block goes through the menu on a client and is unverified).
- Fixed during the run (mine): a door menu pick fired a second `interact` in the same step and shut the door again (now swallowed until the edge clears); the menu needs no door item (sandbox and co-op clients have none).

## What Michael should try (`?autostart=proving&mode=sandbox`, or `?autostart=warehouse&mode=clear` for guards)
1. Pad: L3 near a wall enters it (A does nothing there); shuffle along it slowly (0.35 m/s); push to the end: the head peeks out at once, the camera slides only about 0.4 m past the corner; pulling the stick away does not leave; L3 again or aiming (LT) leaves.
2. Walk at a door and press A: the menu appears. Stealth open cracks it (right stick looks, stick back closes, forward opens quietly), Open swings it, Bash is loud and drops a guard standing right behind it (Warehouse: put a guard behind a door), Optic cable says not yet. Running into a door does nothing.
3. Y jumps / traverses, A takes the hold-to-use things (hack, vent, takedown), RB is the co-op action (ping), LB held opens the gadget wheel, D-pad up cycles the goggles, D-pad left / right change the speed gear, D-pad down aims the gadget.
4. Tune in `src/player/wallController.ts` `WALL` (`slideStand`, `slideCrouch`, `slideGear1`, `peekOut`, `peekPush`) and `src/config/camera.ts` `WALL_CAMERA.peek` (`offset`, `yaw`, `blend`); bash reach `DOOR_BASH` in `src/game/doorMenu.ts`; guards close doors after `DOOR_GUARD_CLOSE` in `src/game/stealthSystems.ts`.
