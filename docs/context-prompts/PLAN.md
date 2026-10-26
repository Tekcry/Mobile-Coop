# Context prompts - PLAN
Owner: Night Shift | Player Build. Status: current.

Opus plan for `docs/context-prompts/BRIEF.md` (Michael's words, his three picks of 2026-10-27, assumed decisions
A1-A26). Read the brief first. Code facts are from origin/master 593b22c58 (2026-10-27). Everything here ships dark
behind `flags.contextPrompts` until Michael switches it on (section 7).

Today, in one paragraph: A (keyboard E) is the interact button. One context menu (`src/game/contextMenu.ts`, drawn top
right by `src/ui/hud/contextMenuView.ts`) is refilled every fixed step by `GameState.contextMenuStep`
(`src/game/gameState.ts` ~1514-1611) from providers in CT order: the held guard's INTERROGATE (`grabMenu.ts`), the
takedown on offer (`TD_KIND` rows, `TD_LABEL` ~352), the partner's hostage BLUFF (`JOINT_KIND`,
`jointInterrogation.ts`), the door set (`DOOR_KIND`, `doorMenu.ts`), else the optic gap set (`GAP_KIND`, `gapMenu.ts`),
then the item in reach or the carry target (`ITEM_KIND`). Holding A opens the list with BACK TO GAME, the stick / D-pad
up / down / mouse wheel moves the highlight (`CtxNav`, `ctxUp` / `ctxDown`), releasing A runs the row (`ctxRun`
~1625); a tap runs row 1. Separately, world-anchored prompts already exist (`src/ui/hud/worldPrompts.ts`, fed by
`updateCoverHud` ~4134: traversal, team move, takedown label) and a centre "use" prompt (`Hud.setInteract`) serves the
team-move direct path (`updateInteract` ~1444). While `team.active` and not `hangActs` (a move, or a free offer:
`offer`, `hangOffer`, `ropeOffer`, the kit offers), `contextMenuStep` stands aside and A acts directly twice: on the item
in reach (`updateInteract`, centre prompt) and on the takedown on offer (`tdk.fixedUpdate(..., team.active &&
!hangActs && aFree && pressed('interact'), ...)` ~2229, shown by the `takedown` world prompt). Note: the "Y = jump + use + takedown" line in the header of
`src/input/conflicts.ts` is stale since A3 / G96 split Y (jump / traverse) from A (interact); S2 rewrites the comment
(Y = jump / traverse, and the second action at a door, hatch or hostage under the flag).

## 1. Inventory: every interaction today

"Menu" = a row of the hold-A context menu (tap A runs row 1; hold A, scroll, release). "Direct" = a button with no menu.

| # | Interaction | Offered where (code) | Today's input path |
| --- | --- | --- | --- |
| 1 | Grab from behind (`behind`, `hangDown`) | takedown offer, `TD_KIND` 'grab' "Grab character" (`takedownRow`, `knifeKill.ts`) | Menu row 1 (A tap) |
| 2 | Front / side / over cover / corner takedown | `TD_KIND` 'ko' "Takedown" | Menu row 1 |
| 3 | Drop attack (`above`, `drop`) | `TD_KIND` 'ko' "Drop attack" | Menu row 1 |
| 4 | Pull over ledge (`below`), through window (`window`), choke (`inverted`) | `TD_KIND` 'ko' (`TD_LABEL`) | Menu row 1 (G206: one row) |
| 5 | Lethal-only offer (`offer.lethalOnly`) | no row | Direct: RT hold (lethal strike) |
| 6 | Palm strike / lethal strike, holstered, any side | `strikeController.ts`, `rtTap` | Direct: RT / LMB tap knock out, hold kill; KBM Z knock out. No prompt |
| 7 | Held guard: interrogate | `GRAB_KIND` row only when `hasInfo` (`grabMenu.ts`) | Menu (no BACK TO GAME, G205) |
| 8 | Held guard: knock out, kill, human shield | `grabTriggerPick` | Direct: RT tap / hold, Z; LT aims the shield. World prompt "Held" |
| 9 | Held guard: carry, force to device (stub) | `GrabMenuView.sel` (scripts only) | Scripts / tools only |
| 10 | Hang-down (co-op, head-first): guard below | `TD_KIND` 'grab' (`hangDown`); RT tap choke / hold neck snap | Menu + direct RT |
| 11 | Hang-down: item in reach, no guard | `updateInteract` (A9 direct path) | Direct A with the centre prompt |
| 12 | Team takedown on the partner's hostage (`assist`) | `TD_KIND` 'ko' "Team takedown" | Menu row |
| 13 | Bluff (joint interrogation, G148) | `JOINT_KIND` 'bluff' above team takedown | Menu row 1 |
| 14 | Knife scene: knife takedown | `TD_KIND` 'ko' "Takedown" (knife forced, `td.knife`) | Menu row 1; direct holstered RT / LMB (`knifeAttack`, #682) |
| 15 | Closed unlocked door faced (1.6 m) | `DOOR_KIND` OPEN DOOR, OPEN DOOR STEALTH (peek on offer), BASH DOOR, OPTIC CABLE (`doorMenuCandidate`) | Menu (latched list for scripted taps) |
| 16 | Sliding door | `DOOR_KIND` OPEN DOOR only (marlow-final N9) | Menu |
| 17 | Open door | the door's own item, "Close door" | Menu (item row) |
| 18 | Door peek in progress | `doorPeekStep` | Direct: stick in opens, stick back closes, A opens, jump / aim / sprint ends |
| 19 | Optic gap (hatch, panel, grille, shaft top) | `GAP_KIND` OPEN TRAP (closed panel), OPTIC CABLE (`gapMenuCandidate`) | Menu |
| 20 | Light switch "Lights off" | item `switch-*` (`stealthSystems.ts`) | Menu item row, tap |
| 21 | Breaker / fuse board | item `board-*` | Menu item row, tap |
| 22 | Alarm panel "Disable alarm" | item, hold `ALARM.disableTime` | Menu hold row (fill) |
| 23 | Body "Pick up body" | item `body-*` | Menu item row |
| 24 | Carrying: hide spot "Hide body", door faced open / close, else "Drop body" | `carryTarget` (`stealthSystems.ts` ~295) | Menu item row; B at the lift lets go |
| 25 | Medkit station | item `medkit-*`, hold `MEDKIT.wallHold` | Menu hold row |
| 26 | Weapons crate | item, hold `CRATE_HOLD` (`weaponCrates.ts`) | Menu hold row |
| 27 | Revive the partner (co-op) | item `revive-*` (host `coopHost.ts` ~639; client mirrors, `coopClient.ts` ~663) | Menu hold row |
| 28 | Mission objectives: terminal (3 s), cache, extract | `missionMode.ts` | Menu item / hold row |
| 29 | Infiltration (the default mode): "Start the upload" (`terminal`, tap), plant / sabotage (`terminal` / `charge`, hold `o.time`), rescue (`vip`, hold, at the VIP), "Take the intel" (`intel`), extract | `src/game/modes/infiltrationMode.ts` 105-160 | Menu item / hold row |
| 30 | Sector Ops: keypad (hold), board "Read" (hold), desk (hold), objective / hack (hold or tap), exit (tap) | `sectorMode.ts` | Menu item / hold row |
| 31 | Sector Ops: team door "Unbolt" (one side), key switch "Turn key" (two players) | `sectorTeamDoors.ts`, `pairPress.ts` | Menu item row |
| 32 | Training course devices (`c-*` switches, tap or hold) and gates "Unbolt" | `courseMode.ts` | Menu item / hold row |
| 33 | Piano scene "Set off the EMP" | `pianoScene.ts` | Menu item row |
| 34 | Vault, step up, climb, drop down, jump (traversal hint) | `traversal.hint`, world prompt `vault` | Direct Y / Space |
| 35 | Attach moves: ladder, pipes, ledges, zipline, rope, fence, split / wall jump, kick out / through, flip over, unhook | `anchorPrompts` (`ATTACH_LABEL`) | Direct Y / Space (B / C drop) |
| 36 | Closed vent: kick in / unscrew | `ventOpen.ts` | Direct: Y tap kicks, Y (then A) held unscrews |
| 37 | Back to wall | `wallStep` | Direct L3 / Caps Lock, no prompt (G34) |
| 38 | Team moves: leg-up, relay, partner throw, hang-down, rope down, two-person rope | `teamController.ts`, world prompt `coop` | Direct RB / F (stand or crouch picks the move) |
| 39 | Kit moves: pull-up, shutter lift / crawl, chimney pair | `kit/*.ts` (`h.prompt`) | Direct RB / F |
| 40 | Jammer (aiming the pistol) | `ctDevices` | Direct RB held while aiming, no prompt |
| 41 | Ping | `sendPing` | Direct R3 / middle mouse, no prompt |
| 42 | Team move or offer under way (`team.active`, not `hangActs`): the item in reach or the carry target | `updateInteract` ~1444 | Direct A with the centre prompt (`Hud.setInteract`) |
| 43 | Team move or offer under way: the takedown on offer | `tdk.fixedUpdate` ~2229 (A press) | Direct A; `takedown` world prompt |
| 44 | A owned by another system: the wheel's vision slot (`gadgetSystem.ts` 194), the sticky-cam remote view's gas (575), the piano intro's EMP press (any A press while the intro prompt is up, `pianoScene.ts` 546-556; a client has no EMP item and shows no world prompt, as today) | as listed | Direct A, no world prompt |

Rows 34-44 are not in the box today. Rows 34-36 and 38-39 stay on their buttons and get the new look (A13, A14); rows
42-43 move into the provider (section 2). Rows 37, 40, 41 and 44 are unchanged and keep no world prompt.

## 2. The new mapping

"Y" in the second-action rows (13, 15, 19) = the existing jump verb (pad Y, keyboard Space) taken as the second action
by the rule in section 3 (Michael's pick 1, A2, A21-A25): only on that focused target with no traversal on offer, else
Y jumps or climbs and the Y row is hidden. "Tap" runs on the press when the button has no hold action on this target,
else on a release before `CTX_HOLD` (0.35 s); "hold" runs when the hold reaches `CTX_HOLD` (A3). Item holds fill for
the item's own time (A9). Anchor heights are starting values (G10).

| # | Target | Button: tap / hold | Prompt shows | Anchor |
| --- | --- | --- | --- | --- |
| 1 | Guard from behind (two legs) | A tap: Grab. RT tap: Knock out, RT hold: Kill (holstered) | `[A] Grab` / `[RT] Knock out · hold Kill` | above the head (`pos.y + 1.95 x scale`, as today) |
| 2-4 | Guard faced (front, side, over cover, corner, above, drop, below, window, inverted) | A tap: Knock out, A hold: Kill (pick 2, A6). RT as row 1 | `[A] Knock out · hold Kill` (label from `TD_LABEL`: "Drop attack", "Pull over ledge"...) | above the head |
| 5 | Lethal-only offer | A hold: Kill; RT hold: Kill | `[A] hold Kill` | above the head |
| 6 | No guard in reach | RT as today | nothing | - |
| 7-8 | Held guard | A tap: Interrogate (only with information). RT tap / hold, LT shield | `[A] Interrogate` (when listed) / `[RT] Knock out · hold Kill` / `[LT] Shield` | above his head |
| 9 | Carry, force to device | scripts only (`grabMenu.sel`), unchanged | - | - |
| 10 | Hang-down: guard below | A tap: Grab; RT tap: Choke, RT hold: Neck snap | `[A] Grab` / `[RT] Choke · hold Neck snap` | above the guard |
| 11 | Hang-down: item in reach | A as the item (row 20-33) | the item's prompt; `[RB] Pull me up` on the partner | the item |
| 12 | Partner's hostage | A tap: Team takedown | `[A] Team takedown` | above the hostage |
| 13 | Partner's hostage with joint information (the bluffer, not the holder, A23) | Y tap: Bluff | `[Y] Bluff` under the A row | above the hostage |
| 14 | Knife scene guard (every guard on two legs except the partner's hostage, which stays row 12: `takedownController.start` exempts `assist`) | A tap or hold: Knife takedown; holstered RT: Knife takedown | `[A] Knife takedown` / `[RT] Knife takedown` | above the head |
| 15 | Closed unlocked door faced | A tap: Open, A hold: Bash. Y tap: Peek (only when the peek is on offer), Y hold: Optic cable | `[A] Open · hold Bash` / `[Y] Peek · hold Optic cable` | the leaf, latch side, 1.1 m up |
| 16 | Sliding door | A tap: Open | `[A] Open` | the leaf, 1.1 m up |
| 17 | Open door | A tap: Close | `[A] Close` | the leaf, 1.1 m up |
| 18 | Door peek in progress | unchanged (stick, A opens); prompt `[A] Open` on the crack | `[A] Open` | the crack |
| 19 | Optic gap | A tap: Open trap (closed panel only). Y tap: Optic cable | `[A] Open trap` / `[Y] Optic cable` | the gap point |
| 20-21 | Light switch, breaker board | A tap | `[A] Lights off` (the item's label) | the switch face |
| 22 | Alarm panel | A hold (fill) | `[A] hold Disable alarm` + ring | the panel face |
| 23 | Body | A tap: Pick up | `[A] Pick up` | the body's chest, 0.3 m up |
| 24 | Carrying | A tap: Hide body / Open / Close / Drop body; B at the lift lets go | `[A] Hide body` (or the door / drop label) | the hide spot / door / 1 m ahead at the floor |
| 25-26 | Medkit station, weapons crate | A hold (fill) | `[A] hold Medkit` / `[A] hold Weapons crate` | the cabinet / crate lid |
| 27 | Revive the partner | A hold (fill) | `[A] hold Revive <name> (<s>)` | the partner's chest |
| 28-33 | Objectives, upload, plant / sabotage, rescue (VIP), intel, keypads, boards, desks, exits, bolts, key switches, course devices, EMP | A tap or A hold as the item's `holdTime` | the item's label (hold: "hold" + ring) | the item, at `KIND_PROMPT_Y[kind]` over `pos`; the table covers all 14 `InteractKind`s (`interactables.ts` 9, incl. `vip`, `charge`, `hide`) |
| 34-35 | Traversal | Y as today (an offered traversal always wins Y over rows 13, 15, 19) | `[Y] Vault` etc., same look | as today |
| 36 | Closed vent | Y tap: Kick in, Y hold: Unscrew | `[Y] Kick in · hold Unscrew` | the grate |
| 38-39 | Team and kit moves | RB as today | `[RB] Leg-up` etc. (the move named, G151); waiting text as a small second line | the partner (or the ledge / shutter point, as today) |
| 37, 40, 41 | Wall, jammer, ping | unchanged | none | - |
| 42 | Team move or offer under way, item in reach | A as the item (rows 20-33, carry row 24) | the item's prompt (replaces the centre prompt) | the item |
| 43 | Team move or offer under way, takedown on offer | A as rows 1-5 (the guard keeps A over the item, as today) | as rows 1-5 | above the head |
| 44 | Vision slot, sticky-cam gas, piano intro EMP press | unchanged | none | - |

One target has the focus (section 4); A, Y (only as the rule in section 3 gives it), RT and LT act on it. The prompt lists only the buttons that do something
there. Stand-asides are today's (`aside` in `contextMenuStep`): down, a door peek (its own prompt), the optic view, a
remote view, the wheel, a takedown / finisher / lift running. A team move is not a stand-aside: while `team.active` and
not `hangActs` the provider runs with only rows 42-43 (as it runs with only rows 10-11 while hanging), in every state
today's direct paths run in. `updateInteract` and the ~2229 press are not gated on `team.busy`, so the provider is not
either (parity; the takedown system's own offer rules decide whether a guard is on offer).

## 3. Button maps, the Y rule and the conflict check

### Pad (Xbox names; PlayStation and Nintendo glyphs follow the pad style)
| Button | Before | After |
| --- | --- | --- |
| A | Interact: tap runs row 1, hold opens the list, release runs the highlight | Context main action on the focused target: tap, or hold for its stronger version or a hold item |
| B | Crouch; closes the held list | Crouch (no list to close) |
| X | Holster / draw (tap); reload (hold, gun out) | unchanged |
| Y | Jump / traverse (vent: tap kick, hold unscrew) | Jump / traverse as today; at a faced door, hatch or partner's hostage with no traversal on offer: the second action (tap peek / optic cable at a hatch / bluff, hold optic cable under a door) |
| LB | Selection wheel (hold) / switch weapon (tap) | unchanged |
| RB | Co-op action (team moves); jammer held while aiming the pistol | unchanged |
| LT | Aim (held); holding a guard: the shield | unchanged |
| RT | Fire (aiming); holstered tap knock out / hold kill; held guard tap / hold; knife scene knife kill | unchanged |
| L3 | Back to wall; swap shoulder while aiming | unchanged |
| R3 | Ping; zoom while aiming a scoped weapon | unchanged |
| D-pad up / down | The held list's highlight (fixed `ctxUp` / `ctxDown`, only while the list is held) | not read under the flag; free after switch-on (S7 deletes `CTX_BINDINGS`) |
| D-pad left / right | Vision on / off; gadget quick-use | unchanged |
| View / Menu | Show objective / pause | unchanged |

### Keyboard and mouse
| Input | Before | After |
| --- | --- | --- |
| E | Interact (tap / hold list) | Context main action (tap / hold) |
| Space | Jump / traverse | Jump / traverse; the second action under the same rule as pad Y (A22) |
| Mouse wheel | The held list's highlight | nothing in play (freed at switch-on) |
| W / S, arrows | also move the held list's highlight | movement only |
| C / Ctrl, X, R, Z, F / PgDn, Tab, LMB, RMB, Caps, V, B, T / Q, G, N, H, mouse side buttons, middle mouse, O, P / Esc, Shift, Alt, 1-7 | as today | unchanged (no new binding) |

### The Y rule (`src/game/contextJump.ts`, S2; wired by S3)
One pure function decides, once per jump press, who takes it: the context system (the second action) or traversal /
jump (today's path). The context system takes the press only when all hold (A2, A21):
- the focused target (section 4) is a closed door with a Y row, an optic gap, or the partner's hostage with a bluff;
- the player is on the ground, not attached, not mid-traversal, not on the wall, not carrying, not in a team move or
  offer (`team.active`), and no takedown (`takedown.busy`), strike or door peek is running;
- `traversal.hint` and `traversal.attachHint` are both null (no vault, mantle, step, hop, drop, ledge, pipe, ladder,
  rope, zipline or vent offered), read as the screen shows them this step, before the press re-probes.

A press it takes is owned until release (`ctxOwnsY`); traversal gets `jumpPressed` false and `startHeld` false for it,
and the door peek's end check (`pressed('jump')`, gameState ~3626) does not see it. The focused target's Y row shows
exactly when the rule would take a press now, so the prompt always tells the truth. Everything not listed falls through
to today's jump. With the flag off the function is never called.

Jump at a door or hatch, case by case:
| Case | Today | With the rule |
| --- | --- | --- |
| Running at a closed door, no vault offered | Y jumps (a leap into the door) | Y tap peeks (on release, if the peek is on offer), hold feeds the optic cable; no jump. Running into the door without a press still does nothing special (G97) |
| A door under or beside a vaultable window (the probe offers the vault) | Y vaults (through the glass if glazed, loud) | the same: Y vaults; the door's Y row is hidden, its A row stays. To peek, step or turn so the window is not offered |
| A hatch you can climb out of (a mantle or ladder offered at it) | Y climbs | the same: Y climbs; the optic row is hidden, `[A] Open trap` stays. On the ladder (attached) Y is today's |
| A floor hatch, closed / opened | closed: Y jumps; opened: Y drops through (drop offered) | closed: Y tap feeds the optic cable; opened: the drop is offered, Y drops through |
| Crouched at a hatch, nothing offered | Y stands and jumps | Y tap feeds the optic cable; you stay crouched |
| A door during a team move or offer (`team.active`) | traversal gets no jump press | the same: doors and hatches are not candidates (rows 42-43), no Y row, Y as today |
| The knife scene | Y jumps / climbs | A2's rule as anywhere (the scene adds nothing on Y); during the knife kill (`takedown.busy`) Y does nothing, as today |
| Carrying a body at a door | traversal and peek off | the same: no Y row; A opens or closes the door (A15) |
| Holding a guard | `takedown.busy`: Y does nothing | the same; the holder gets no Y job (A23) |
| Beside the partner's hold, joint information | Y jumps | Y tap bluffs (A17, A23); a climb on offer there wins |
| In the air, on the wall, mid-peek | today's (split brace / grab; no traverse; Y ends the peek) | the same |
| The peek not on offer (the partner's crack, the door moving) | Y jumps | the Y row shows only `hold Optic cable`; a tap does nothing (A25) |

### Conflict check (`findConflicts`, `src/input/conflicts.ts`)
- No new verb, no new bind id, no default change: `PAD_BINDS`, `BINDS`, `GAME_BINDINGS`, the settings shape and the
  controls screen are untouched while dark, so `findConflicts` reports nothing new and there is no row to hide.
- Contextual sharing that is by design and stays a single binding row (as today): A = every context main action; Y =
  jump / traverse / vent / the second action at a door, hatch or hostage (the rule above); X = draw / reload; RB =
  co-op / jammer while aiming; RT = fire / strike / held-guard finisher. A remapped jump carries the second action
  (A24); the prompt shows the bound glyph.
- A (E) gains tap / hold meanings on some targets, and Y on doors: per G398 such a button gets no hold-or-toggle
  setting; the plain hold items (A9) keep `access.holdToggle`. `gameplay.grabToggle` (A hold keeps the grabbed guard)
  is untouched: from behind A has no hold action (A5).
- The menu group (`uiUp`, `uiConfirm`, ...) never clashes with gameplay verbs (separate group); unchanged.
- Tests and scripts that assert bindings (`tests/padBinds.test.ts`, `keybinds.test.ts`, `conflicts.test.ts`,
  `settings.test.ts`, `input.test.ts`, `scripts/e2e-pad.mjs` `PADV`, `e2e-mouse.mjs`) need no change: no binding
  changes. S2 greps `scripts/` and `tests/` for `'jump'` press asserts near doors and hatches; e2e builds are not
  preview builds, so with the flag off they stay as they are.
- The jump row's label "Jump / traverse" stays while dark; P6 renames it "Jump / traverse / peek" with the matching row
  in `docs/systems/input-and-loop.md` (the `tests/input.test.ts` table check reads ids, keys and actions, not labels)
  (A26).

## 4. Target choice
- Candidates each step, from today's providers and reaches (A11): the held guard; the takedown offer (the takedown
  system's own plan, unchanged); the partner's hostage; the closed door faced (`doorMenuCandidate`, 1.6 m, within
  90 deg of the camera); else the optic gap (`gapMenuCandidate`, 1.6 m); the interactables in reach
  (`Interactables.nearest`, 1.8 m or the item's `reach`, `side` and `itemScope` rules); the carry target while carrying.
  Up to `CTX_CANDS` = 8, fixed slots. In a team move or offer (rows 42-43) only the takedown offer and the item in
  reach are candidates; hanging, only rows 10-11.
- Priority, then score: a held guard, then a takedown offer (the guard keeps A, as row 1 did), then the rest scored by
  `distance + CTX_FOCUS.angleW x angle off the camera's forward` (the camera's aim, not the body's). Starting values:
  `angleW` 1.0 m per radian.
- Sticky: the focused target stays until it leaves reach or another candidate scores better by `CTX_FOCUS.margin`
  (0.25) for `CTX_FOCUS.dwell` (0.15 s).
- Locked: while A, a Y press taken as the second action, or RT (on a guard) is down, the focus does not change; if the
  target leaves reach mid-hold the hold cancels with no action (the old "a guard turning must not turn KNOCK OUT into
  KILL under the thumb"). A traversal hint that appears mid-hold does not take the press back (the rule judged it at the
  press, A21).
- Several actions on one target: one cluster, one row per button (A, Y, RT, LT), each row "tap label · hold label".
  The Y row is present only while the Y rule (section 3) would take a press.
- Only the focused target shows anything (Michael's pick 3, A10): no marker on other candidates, which keeps VISION
  rule 5 / G290, G339 and G135. No faint markers are built.
- A press is owned (`ctxOwnsA`, as today, and `ctxOwnsY` for a Y press the rule took): a press the system used is
  swallowed until released, so the door peek, the vent start, traversal and the team-move press never see it.
- Scripted taps (`InputState.tap('interact')`, tests and tools) run the tap action at once (no hold timing); tests drive
  holds with real key / pad holds. `g.ctxPrompts` exposes the focus (kind, ref, rows, labels, hold fill) read-only for
  tests, and `g.grabMenu.sel` keeps working for the scripted held-guard picks.

## 5. The prompt's look
- One layer: the existing `.hud-world` world-prompt layer (`worldPrompts.ts`), so the context prompts, traversal and
  team prompts share one look and one overlap rule. No new image or icon assets: the `.wp-mark` diamond, the pill body
  and the existing button glyphs (`promptHtml` / `verbPromptHtml`, `src/ui/prompts.ts`).
- The focused target: the marker at the anchor and a small stack of rows under it, one per button:
  `[A] Open · hold Bash`, `[Y] Peek · hold Optic cable`. The hold half is dimmer until held; a ring round the
  glyph fills while the button is held (the centre prompt's `.hold-ring` style), the same for item holds.
- Fade: the focused target's cluster fades to full over 0.15 s when it gains the focus and out when it loses it (CSS
  opacity transition, no per-frame style writes beyond the transform). Nothing else is drawn (A10). Off screen: clamped to the screen
  edge as `worldPrompts` does today (8-92 % across, 10-97 % down); behind the camera: hidden.
- Size: text in `vh` units like the old box (about 2.2 vh, the old 11 px at 720 p), times `--hud-scale` (Settings >
  Accessibility, 0.8-1.4); S4 sets `--hud-scale` on the world layer, which today sits outside the HUD element.
- Glyphs per device: all variants are emitted and the body class picks Xbox, PlayStation, Nintendo or the key label, so
  prompts swap at once when the pad connects or disconnects (bible 8). The second-action row uses the jump verb's
  existing glyph (pad Y, key Space: `keyLabels.traverse`); no new glyph entry. Remapped buttons show their new glyph
  (`padButtons` / `keyLabels`), so a remapped jump moves the Y row's glyph with it (A24).
- One Y prompt at a time: when a traversal is on offer the target's Y row is hidden and the traversal prompt shows (the
  Y rule, section 3), so the screen never shows two meanings for Y.
- DOM: fixed elements (one cluster, 4 rows) written only when their text changes (a version counter,
  as `ContextMenuView`); positions as transforms only when they move.
- With the flag on, the top-right box (`.hud-ctx`) and the centre use prompt (`Hud.setInteract`) never show; the old
  `takedown` world prompt id is folded into the cluster. Their jobs in a team move or offer (rows 42-43) move to the
  cluster with them, so no A action runs without a prompt.
- The seam (S1 / S3 / S4): S1 defines the view interface in `contextPrompts.ts` (`CtxPromptSink { update(model):
  void }`, the model being the focus, its anchor and rows); S3 calls it every step through an optional `hud` member of
  that type (a no-op when absent, as in the provider tests); S4 implements it in `hud.ts` / `contextPromptView.ts`.
- The comment in `worldPrompts.ts` that names another game is rewritten (G6) when S4 touches the file.
- Look sign-off: the builder posts three screenshots (door, guard from behind, hold item) in the PR body for the walk
  card; a big look change otherwise needs Michael's one click (G288), which his three picks and the summary sheet cover.

## 6. Co-op and the knife scene
- No wire change, no `PROTOCOL_VERSION` touch, no save change (A18). Actions run through today's calls: the client's
  takedowns through its puppets and `takedown.start`, the door picks (a client's bash is a plain open through the host,
  as today), `pickOpenTrap` via the host's `panel` request, the item's `onUse` (host-approved where it was).
- Each player computes their own prompts from their own position and camera; the client sees the host's interactables
  through the snapshot mirror (`coopClient.ts` ~663), so revives, keypads and objectives prompt on both screens.
- The partner as a target: downed, `[A] hold Revive <name>` on their chest (the host's `revive-*` item); standing, the
  team-move prompt anchored on them (`team.prompt` / `team.promptAt`, the move named, G151; "waiting for your partner"
  states as the small second line). The partner who is offered a move sees `[RB] Take the leg-up` (etc.) on the
  offering player.
- The partner's hostage: `[A] Team takedown`, `[Y] Bluff` when joint information exists and no climb is on offer there
  (A17, A23). The bluffer is the player beside the hold; the holder's Y stays without a job (a hold is a running
  takedown, `takedown.busy`, so traversal never sees the press today).
- The Y rule runs on each player's own traversal hints (the client's own `traversal`, as its prompts today), so it needs
  nothing from the wire.
- Hang-down: the hanging player's rows 10-11 (`[A] Grab` / `[RT] Choke · hold Neck snap` on the guard; an item in
  reach on A; `[RB] Pull me up` on the holder). The A9 direct path (`updateInteract`) is folded into the provider under
  the flag; the old path stays for the flag off.
- A team move or offer under way (rows 42-43): the provider runs with the takedown offer and the item in reach only, so
  A keeps today's direct jobs with a world prompt (for example, offering a leg-up next to a panel: `[A] Lights off`
  on the panel, the team-move prompt as today).
- Team move text: `teamController.ts` ~817 ("Hanging: A to use what is in reach, hold A by a guard to grab...") and the
  other "Co-op: ..." lines become the short move names under the flag (the full lines stay for the flag off).
- Key switches and team doors: each player's own A on their own half (unchanged rule, `pairPress.ts`).
- The knife scene (G426, `knifeSceneOn`): every guard on two legs shows `[A] Knife takedown` (tap or hold, both the
  knife kill: `start(lethalOnly)` forces it), except the partner's hostage, which stays `[A] Team takedown`
  (`takedownController.start` exempts `assist`); the holstered attack press stays the knife kill (`knifeAttack`, #682) and the prompt
  names it `[RT] Knife takedown`; no grab, no strike, no free slash; the "Knife ready: get behind or beside a guard" cue
  unchanged. The knife's pair runs host-side as today. Y follows the Y rule as anywhere (section 3).

## 7. Rollout
- Flag: `contextPrompts: darkFlag(params.get('ctxprompts'), PREVIEW_ON)` in `src/core/flags.ts` (the `Flags` field with
  its doc line: owner Night Shift | Player Build, switch-on at Michael's walk, target 2026-10-31). Live default off;
  `/preview/` on; `?ctxprompts=1` / `0` override (G416).
- `GameState`: with the flag on, `contextPromptStep` runs where `contextMenuStep` runs now (~2071, before the door peek
  step ~2100 and traversal ~2138, so the hints it reads are the ones on screen) and owns A the same way (`ctxOwnsA`); it also asks the Y rule about this step's jump press and, when it takes it,
  owns it (`ctxOwnsY`): `traversal.fixedUpdate` gets `jumpPressed` false, `ti.startHeld` false, and the peek's end
  check does not see it. With the flag off nothing changes.
  The other readers of `ctxMenu.state === 'active'` (`ctxWas` / `ctxHeld`
  ~2070-2072, which blank the input; the frame's blank move ~3254, the vision toggle ~3319, `knifeAttack` ~2260) read a shared `ctxListOpen` getter that is always false under the
  flag (no list, walking free, A12).
- The old box, its code, its CSS and every test that drives it stay until switch-on (S7). e2e builds are not preview
  builds, so the existing suites keep testing the old box; the new steps pass `?ctxprompts=1`.
- Walk pacing (G288): Player area. The orchestrator counts it against the Player cap at switch-on; it builds dark now.
- Switch-on (S7, after Michael accepts it): the default flips on, the old-menu tests move to the new system, the old
  box is deleted, and the orchestrator folds A1-A26 and Michael's three picks (BRIEF "Michael picked", his option text
  verbatim) into DECISIONS and the bible:
  - Replaced: G198, G203, G205, G206, G19, G5 (the menu half of AUDIT-ACTIONMENU).
  - Narrowed: G96 (no new button or verb; Y also runs the second action at a faced door, hatch or partner's hostage
    with no climb on offer, pick 1; D-pad up / down freed), G77, G97. Kept: G290 / VISION rule 5, G135, G339 (pick 3).
  - Bible lines: the Doors row ("A CT door list"), the Interaction table's optic row ("a door-list choice"), the 5.4
    bullets (the hold-A menu, G203, G205, the positional takedowns' "one KNOCK OUT row"), 5.10 and the controls lines.

## 8. Slices
Claims: no maps, no wire paths, no save paths, no settings change (no new verb or bind id, no default change; Michael's
pick 1 puts the second action on the existing jump verb). One PR per row of "PR", each
under ~1.5k changed lines. Before S1 starts, the lead (Haiku may write it) puts `docs/context-prompts/STATE.md` on the
branch (RULES "A job").

| Slice | PR | Model | Files (new *) | Size | Depends |
| --- | --- | --- | --- | --- | --- |
| S1 Core model | P1 | Opus | *`src/game/contextPrompts.ts` (targets, fixed slots, focus pick / sticky / lock, tap vs hold resolver, ownership of A and of a taken Y press (`ctxOwnsA`, `ctxOwnsY`), `CTX_HOLD`, `CTX_FOCUS`, `CTX_SLOT_BUTTON` (A, Y, RT, LT), the view interface `CtxPromptSink`); *`tests/contextPrompts.test.ts` | ~800 | - |
| S2 The Y rule and the flag | P1 | Opus | `src/core/flags.ts` (the `contextPrompts` flag, so P1 stays dark; recheck FIX A); *`src/game/contextJump.ts` (pure, no allocation: who takes this step's jump press, `'second'` or `'jump'`, from the focus kind, whether it has a Y row, grounded / attached / traversing / wall / carrying / team / busy / peek, and `traversal.hint` / `attachHint` as shown; section 3); `src/input/conflicts.ts` (the stale header comment only); *`tests/contextJump.test.ts` (every row of section 3's case table) | ~280 | - |
| S3 Providers and wiring | P2 | Opus | (reads the flag S2 added); *`src/game/contextProviders.ts` (rows 1-8, 12, 15-23, 25-26, 28-33 of section 2 from a narrow `CtxHost`); `src/game/gameState.ts` (`contextPromptStep`, `ctxListOpen`, the host methods, the Y rule's wiring: the step runs before traversal and a taken jump press is kept from `traversal.fixedUpdate`, `ti.startHeld` and the peek's end check; it calls the HUD's optional `ctxPrompts?: CtxPromptSink` hook, which S3 declares on the HUD type and S4 fills in); *`tests/contextProviders.test.ts`; `scripts/e2e-takedown.mjs`, `scripts/e2e-stealth-ai.mjs` (new `?ctxprompts=1` steps) | ~1,180 | S1, S2 |
| S4 Prompt view | P3 | Sonnet (strict Opus brief) | *`src/ui/hud/contextPromptView.ts` (implements `CtxPromptSink`); *`src/ui/hud/promptLayout.ts` (pure: fade, clamp, overlap push); `src/ui/hud/worldPrompts.ts`, `src/ui/hud/hud.ts`, `src/styles.css`; *`tests/promptLayout.test.ts`; `scripts/e2e-pad.mjs` (glyph swap step; no binding rows change) | ~740 | S1 (types); built in parallel with S3; its e2e runs on a head that contains P2 (the lead merges S3 into S4's branch first) |
| S5 Co-op, hang-down, carry, knife, team states | P4 | Opus | `src/game/contextProviders.ts` (rows 10-11, 13-14, 24, 27, 38-39 anchors, 42-43), `src/game/gameState.ts` (`updateInteract` and the ~2229 press under the flag, team prompt anchor), `src/game/teamController.ts`, `src/game/kit/pullUp.ts`, `shutter.ts`, `chimneyPair.ts` (short move names under the flag); `tests/contextProviders.test.ts`; `scripts/e2e-coop.mjs`, `scripts/e2e-piano.mjs` | ~1,050 | S3 |
| S6 Docs and walk prep | P4 | Sonnet 5.5 (strict Opus brief); Haiku only the fragment | `docs/systems/input-and-loop.md` (prose only: the Y rule; the binding table is unchanged until P6), `ui.md`, `takedowns.md`, `movement.md`, `ct-toolkit.md`; `TESTING.md`; `changes/feature-context-prompts.md` (kind: minor, Haiku) | ~200 | S5 |
| S7 Switch-on (after Michael's yes) | P5, P6 | Opus | P5: flag default on, old-menu asserts moved (`scripts/e2e-takedown.mjs` 15, `e2e-coop.mjs` 7, `e2e-stealth-ai.mjs` 5, `e2e-sectorops.mjs` 3, `e2e-pad.mjs` 2, `e2e-modes.mjs` 1, `e2e-gadgets.mjs` 1, `e2e-ctcourse/a3OfficeRange.mjs`, `a6PumpHouse.mjs`, `route-run/driver.mjs`, `anim-sheet.mjs`, `anim-natural/audit.mjs`; `tests/doorMenu`, `grabMenu`, `guardInfo`, `marlowN9SlideDoor`, `routeRunPair`, `ctcourse/a4GoodsShed`). P6: delete `contextMenu.ts`, `contextMenuView.ts`, `CtxNav`, `CTX_BINDINGS`, `ctxUp` / `ctxDown`, `.hud-ctx` CSS, the flag-off branches; the jump row label "Jump / traverse / peek" in `padBinds.ts` / `keyBindings.ts` and the doc table (A26) | ~1,000 + ~890 | Michael's walk |

PR totals: P1 ~1,080, P2 ~1,180, P3 ~740, P4 ~1,250, P5 ~1,000, P6 ~890. All under ~1.5k.

Tests per slice (agents: `npm run typecheck:fast` + `npx vitest run <files>`; e2e only through the laptop queue). Gate
(RULES "Test tiers"): every PR that touches `src/game` or `src/player` (P1, P2, P4, P5 when it does, P6) needs
`e2e-coop` + `e2e-netmove` green before the checker passes; the old-box steps stay green with the flag off.
- S1: `tests/contextPrompts.test.ts`: focus by priority and score; sticky margin and dwell; lock while held and the
  cancel when the target leaves; tap on press (no hold action) vs tap on release and hold at `CTX_HOLD`; item fill and
  early release; scripted tap; ownership (`ctxOwnsA`, `ctxOwnsY`) until release; no allocation per step (slot reuse).
  Gate: P1.
- S2: `tests/contextJump.test.ts`: each row of section 3's case table (door with nothing offered: second; door with a
  vault or attach hint: jump; hatch with a climb: jump; closed floor hatch: second, opened (drop offered): jump;
  crouched at a hatch: second; team move, carrying, holding a guard, busy, mid-peek, in the air, attached, on the wall:
  jump; the hostage with a bluff: second; a door whose Y row is hold-only: second, the tap does nothing); no allocation.
  The existing binding tests are untouched (no binding change); `tests/input.test.ts` and `tests/conflicts.test.ts`
  still pass as they are. Affected e2e: by `affected-e2e` (`src/game`: the P1 gate). Gate: P1.
- S3: `tests/contextProviders.test.ts` (a fake host: each target kind's rows, the sliding / open / locked door, the gap
  with and without a trap, lethal-only, quadruped, knife on, a `vip` and a `charge` item; `KIND_PROMPT_Y` has all 14
  kinds). e2e with `?ctxprompts=1`: `e2e-takedown` (A tap grabs from behind; front: tap knocks out, hold kills; RT
  unchanged; held guard interrogate), `e2e-stealth-ai` (door: tap opens, hold bashes and knocks out the guard behind,
  Y tap peeks, Y hold feeds the optic; Y away from the door still jumps). Gate: P2.
- S4: `tests/promptLayout.test.ts`; `e2e-pad` step (on a head with P2): the cluster shows on a door with the pad glyph,
  swaps to the key label on a key press; `e2e-desktop` by `affected-e2e`. Three screenshots in the PR body.
- S5: provider tests for the partner rows and rows 42-43; `e2e-coop` with `?ctxprompts=1` on both tabs (revive prompt
  and hold, team takedown and bluff on the hostage, hang-down grab, team-move prompt on the partner, and: offer a leg-up
  next to an item, the item's prompt shows and A uses it), `e2e-netmove`, `e2e-ctcourse` (the co-op group, `src/game`);
  `e2e-piano` (A and RT knife takedown, no grab). Gate: P4.
- S6: docs only (CI `check`).
- S7: the full suites the moved asserts live in, then the train's full run. Gate: P5 if it touches `src/game`, P6.

Walk items (for the orchestrator's card, `/preview/`, pad first):
1. At a closed door: the prompt fades in on the door; tap A opens, hold A bashes (a guard behind it drops); tap Y
   peeks, hold Y runs the optic cable. At a hatch or grille the optic cable is a Y tap (no hold there). Where a climb or
   vault is offered (a window by the door, a hatch you can climb through), Y climbs and the door's Y row is gone; away
   from doors Y jumps as always. Keyboard: E and Space.
2. Behind a guard: `[A] Grab` on his head; RT tap knocks out, RT hold kills. In front of a guard: tap A knocks out, hold
   A kills. Holding a guard: the rows for interrogate, RT, LT.
3. A light switch (tap), an alarm panel (hold, the ring fills), a body (pick up, carry, hide).
4. Co-op: each player sees only their own prompts; revive a downed partner (hold A on them); a team move named on the
   partner; the partner's hostage: team takedown, bluff; offering a leg-up beside a switch, A still uses the switch.
   A co-op client's door shows "hold Bash" but gets a plain open through the host, as today.
5. The knife scene: A or the attack button on a guard is the knife takedown (the partner's hostage stays a team
   takedown).
6. The old box never shows; walking never stops while prompts show; nothing near you is marked except the thing you
   face.

## 9. Risks and open questions
- Hold delay on taps: on targets with a hold action (doors, faced guards) the tap runs on release, up to 0.35 s later
  than today's tap. Starting value; Michael's walk decides (no tuning before, G421).
- Accidental kills or bashes: a long press on A now kills or bashes where it used to only open the list. The hold
  label and the filling ring show it; Michael picked kills on hold A (pick 2), so the walk tells whether it misfires.
- Priority hides the door while a guard is on offer (one focus). Open: if Michael wants both reachable at once, Y
  could act on the door while A acts on the guard (a later change in the provider table, not built now).
- Y changes job by place (pick 1): facing a door or hatch with nothing to climb, Y no longer jumps (A25). The Y row on
  the target shows it, and an offered climb always wins. If the walk finds the lost jump at doors annoying, the
  undo is one condition in `contextJump.ts` (A25).
- The traversal probe re-reads every 0.2 s: right after the player turns, the shown hint can be up to 0.2 s old. The
  rule reads the hint the screen shows, so Y does what the prompt says; the cost is a peek where a just-turned-to vault
  would have been (one more press).
- Tests: about 40 asserts in 12 e2e files and 6 vitest files read the old menu (`ctxMenu`, `doorMenu`, `grabMenu`,
  `.hud-ctx`). They stay green with the flag off and move at S7, a large but mechanical slice.
- `gameState.ts` is 4,339 lines: the providers go in their own file behind a narrow host interface to keep its growth
  to the wiring (~250 lines).
- Co-op: a client's predicted prompt can show an action the host then refuses (a door already opened by the partner);
  the refusal paths are today's, so the result is the same as a refused menu row.
- With "Only the one you face" (pick 3, A10), a usable thing just off your aim shows nothing until you turn to it.
  That is the no-markers rule as it stands (VISION rule 5 / G290); the walk tells whether it is enough.
- G6: nothing in code, UI, specs or docs names the game in Michael's quote; reviewers check the diff for it.
- Nothing open for Michael before the build: his three picks are in the brief; everything else is assumed (A1-A26) and
  logged.
