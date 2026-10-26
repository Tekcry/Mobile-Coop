# Context prompts - PLAN
Owner: Night Shift | Player Build. Status: current.

Opus plan for `docs/context-prompts/BRIEF.md` (Michael's words, assumed decisions A1-A20, the three choices). Read the
brief first. Code facts are from origin/master 593b22c58 (2026-10-27). Everything here ships dark behind
`flags.contextPrompts` until Michael switches it on (section 7).

Today, in one paragraph: A (keyboard E) is the interact button. One context menu (`src/game/contextMenu.ts`, drawn top
right by `src/ui/hud/contextMenuView.ts`) is refilled every fixed step by `GameState.contextMenuStep`
(`src/game/gameState.ts` ~1514-1611) from providers in CT order: the held guard's INTERROGATE (`grabMenu.ts`), the
takedown on offer (`TD_KIND` rows, `TD_LABEL` ~352), the partner's hostage BLUFF (`JOINT_KIND`,
`jointInterrogation.ts`), the door set (`DOOR_KIND`, `doorMenu.ts`), else the optic gap set (`GAP_KIND`, `gapMenu.ts`),
then the item in reach or the carry target (`ITEM_KIND`). Holding A opens the list with BACK TO GAME, the stick / D-pad
up / down / mouse wheel moves the highlight (`CtxNav`, `ctxUp` / `ctxDown`), releasing A runs the row (`ctxRun`
~1625); a tap runs row 1. Separately, world-anchored prompts already exist (`src/ui/hud/worldPrompts.ts`, fed by
`updateCoverHud` ~4134: traversal, team move, takedown label) and a centre "use" prompt (`Hud.setInteract`) serves the
team-move direct path (`updateInteract` ~1444). Note: the "Y = jump + use + takedown" line in the header of
`src/input/conflicts.ts` is stale since A3 / G96 split Y (jump / traverse) from A (interact); S2 fixes the comment.

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
| 29 | Infiltration intel "Take the intel", extract | `infiltrationMode.ts` | Menu item row |
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

Rows 34-41 are not in the box today; they stay on their buttons and only rows 34-36 and 38-39 get the new look (A13,
A14). Rows 37, 40 and 41 keep no prompt.

## 2. The new mapping

"Alt" = the new second-action verb `interactAlt` (pad D-pad up, keyboard H or mouse forward button; Michael's choice 1,
A2). "Tap" runs on the press when the button has no hold action on this target, else on a release before `CTX_HOLD`
(0.35 s); "hold" runs when the hold reaches `CTX_HOLD` (A3). Item holds fill for the item's own time (A9). Anchor heights
are starting values (G10).

| # | Target | Button: tap / hold | Prompt shows | Anchor |
| --- | --- | --- | --- | --- |
| 1 | Guard from behind (two legs) | A tap: Grab. RT tap: Knock out, RT hold: Kill (holstered) | `[A] Grab` / `[RT] Knock out · hold Kill` | above the head (`pos.y + 1.95 x scale`, as today) |
| 2-4 | Guard faced (front, side, over cover, corner, above, drop, below, window, inverted) | A tap: Knock out, A hold: Kill (choice 2, A6). RT as row 1 | `[A] Knock out · hold Kill` (label from `TD_LABEL`: "Drop attack", "Pull over ledge"...) | above the head |
| 5 | Lethal-only offer | A hold: Kill; RT hold: Kill | `[A] hold Kill` | above the head |
| 6 | No guard in reach | RT as today | nothing | - |
| 7-8 | Held guard | A tap: Interrogate (only with information). RT tap / hold, LT shield | `[A] Interrogate` (when listed) / `[RT] Knock out · hold Kill` / `[LT] Shield` | above his head |
| 9 | Carry, force to device | scripts only (`grabMenu.sel`), unchanged | - | - |
| 10 | Hang-down: guard below | A tap: Grab; RT tap: Choke, RT hold: Neck snap | `[A] Grab` / `[RT] Choke · hold Neck snap` | above the guard |
| 11 | Hang-down: item in reach | A as the item (row 20-33) | the item's prompt; `[RB] Pull me up` on the partner | the item |
| 12 | Partner's hostage | A tap: Team takedown | `[A] Team takedown` | above the hostage |
| 13 | Partner's hostage with joint information | Alt tap: Bluff | `[D-pad up] Bluff` under the A row | above the hostage |
| 14 | Knife scene guard | A tap or hold: Knife takedown; holstered RT: Knife takedown | `[A] Knife takedown` / `[RT] Knife takedown` | above the head |
| 15 | Closed unlocked door faced | A tap: Open, A hold: Bash. Alt tap: Peek (only when the peek is on offer), Alt hold: Optic cable | `[A] Open · hold Bash` / `[D-pad up] Peek · hold Optic cable` | the leaf, latch side, 1.1 m up |
| 16 | Sliding door | A tap: Open | `[A] Open` | the leaf, 1.1 m up |
| 17 | Open door | A tap: Close | `[A] Close` | the leaf, 1.1 m up |
| 18 | Door peek in progress | unchanged (stick, A opens); prompt `[A] Open` on the crack | `[A] Open` | the crack |
| 19 | Optic gap | A tap: Open trap (closed panel only). Alt tap: Optic cable | `[A] Open trap` / `[D-pad up] Optic cable` | the gap point |
| 20-21 | Light switch, breaker board | A tap | `[A] Lights off` (the item's label) | the switch face |
| 22 | Alarm panel | A hold (fill) | `[A] hold Disable alarm` + ring | the panel face |
| 23 | Body | A tap: Pick up | `[A] Pick up` | the body's chest, 0.3 m up |
| 24 | Carrying | A tap: Hide body / Open / Close / Drop body; B at the lift lets go | `[A] Hide body` (or the door / drop label) | the hide spot / door / 1 m ahead at the floor |
| 25-26 | Medkit station, weapons crate | A hold (fill) | `[A] hold Medkit` / `[A] hold Weapons crate` | the cabinet / crate lid |
| 27 | Revive the partner | A hold (fill) | `[A] hold Revive <name> (<s>)` | the partner's chest |
| 28-33 | Objectives, intel, keypads, boards, desks, exits, bolts, key switches, course devices, EMP | A tap or A hold as the item's `holdTime` | the item's label (hold: "hold" + ring) | the item, at `KIND_PROMPT_Y[kind]` over `pos` |
| 34-35 | Traversal | Y as today | `[Y] Vault` etc., same look | as today |
| 36 | Closed vent | Y tap: Kick in, Y hold: Unscrew | `[Y] Kick in · hold Unscrew` | the grate |
| 38-39 | Team and kit moves | RB as today | `[RB] Leg-up` etc. (the move named, G151); waiting text as a small second line | the partner (or the ledge / shutter point, as today) |
| 37, 40, 41 | Wall, jammer, ping | unchanged | none | - |

One target has the focus (section 4); A, Alt, RT and LT act on it. The prompt lists only the buttons that do something
there. Stand-asides are today's (`aside` in `contextMenuStep`): down, a team move (except the hang-down rows), a door
peek (its own prompt), the optic view, a remote view, the wheel, a takedown / finisher / lift running.

## 3. Button maps and the conflict check

### Pad (Xbox names; PlayStation and Nintendo glyphs follow the pad style)
| Button | Before | After |
| --- | --- | --- |
| A | Interact: tap runs row 1, hold opens the list, release runs the highlight | Context main action on the focused target: tap, or hold for its stronger version or a hold item |
| B | Crouch; closes the held list | Crouch (no list to close) |
| X | Holster / draw (tap); reload (hold, gun out) | unchanged |
| Y | Jump / traverse (vent: tap kick, hold unscrew) | unchanged |
| LB | Selection wheel (hold) / switch weapon (tap) | unchanged |
| RB | Co-op action (team moves); jammer held while aiming the pistol | unchanged |
| LT | Aim (held); holding a guard: the shield | unchanged |
| RT | Fire (aiming); holstered tap knock out / hold kill; held guard tap / hold; knife scene knife kill | unchanged |
| L3 | Back to wall; swap shoulder while aiming | unchanged |
| R3 | Ping; zoom while aiming a scoped weapon | unchanged |
| D-pad up | The held list's highlight up (fixed `ctxUp`, only while the list is held) | `interactAlt`: second action (peek / optic cable / bluff), tap or hold. Remappable |
| D-pad down | The held list's highlight down (fixed `ctxDown`) | free (removed at switch-on) |
| D-pad left / right | Vision on / off; gadget quick-use | unchanged |
| View / Menu | Show objective / pause | unchanged |

### Keyboard and mouse
| Input | Before | After |
| --- | --- | --- |
| E | Interact (tap / hold list) | Context main action (tap / hold) |
| H, mouse forward (thumb) button | unbound | `interactAlt` second action (tap / hold) |
| Mouse wheel | The held list's highlight | nothing in play (freed at switch-on) |
| W / S, arrows | also move the held list's highlight | movement only |
| Space, C / Ctrl, X, R, Z, F / PgDn, Tab, LMB, RMB, Caps, V, B, T / Q, G, N, middle mouse, O, P / Esc, Shift, Alt, 1-7 | as today | unchanged |

### Conflict check (`findConflicts`, `src/input/conflicts.ts`)
- `interactAlt` pad D-pad up: no remappable verb has D-pad up by default (vision is left, gadget quick-use right). The
  fixed `CTX_BINDINGS` (`ctxUp` on D-pad up) is not in `PAD_BINDS`, so no conflict is reported; with the flag off the
  old list reads `ctxUp` only while it is held open, and `interactAlt` is read only with the flag on, so one press never
  does both. S7 deletes `CTX_BINDINGS`.
- `interactAlt` keys: H and `Mouse4` are bound to nothing, not in `FIXED_KEYS`, `RESERVED` or `MENU_NAV_KEYS`.
- A player who already put a verb on D-pad up, H or Mouse4 gets the normal conflict warning (bindings still save).
- A (E) gains tap / hold meanings on some targets: per G398 such a button gets no hold-or-toggle setting; the plain hold
  items (A9) keep `access.holdToggle`. `gameplay.grabToggle` (A hold keeps the grabbed guard) is untouched: from behind
  A has no hold action (A5).
- Contextual sharing that is by design and stays a single binding row (as today): A = every context main action; Y =
  jump / traverse / vent; X = draw / reload; RB = co-op / jammer while aiming; RT = fire / strike / held-guard finisher.
- The menu group (`uiUp`, `uiConfirm`, ...) never clashes with gameplay verbs (separate group), so H / D-pad up in menus
  are unaffected.
- Tests and scripts that assert bindings: `tests/padBinds.test.ts`, `tests/keyBindings.test.ts`,
  `tests/conflicts.test.ts`, `scripts/e2e-pad.mjs`, `scripts/e2e-mouse.mjs` (S2 greps `scripts/` and `tests/` for
  D-pad up, `KeyH`, `Mouse4` and the bind id lists and updates them in the same change).

## 4. Target choice
- Candidates each step, from today's providers and reaches (A11): the held guard; the takedown offer (the takedown
  system's own plan, unchanged); the partner's hostage; the closed door faced (`doorMenuCandidate`, 1.6 m, within
  90 deg of the camera); else the optic gap (`gapMenuCandidate`, 1.6 m); the interactables in reach
  (`Interactables.nearest`, 1.8 m or the item's `reach`, `side` and `itemScope` rules); the carry target while carrying.
  Up to `CTX_CANDS` = 8, fixed slots.
- Priority, then score: a held guard, then a takedown offer (the guard keeps A, as row 1 did), then the rest scored by
  `distance + CTX_FOCUS.angleW x angle off the camera's forward` (the camera's aim, not the body's). Starting values:
  `angleW` 1.0 m per radian.
- Sticky: the focused target stays until it leaves reach or another candidate scores better by `CTX_FOCUS.margin`
  (0.25) for `CTX_FOCUS.dwell` (0.15 s).
- Locked: while A, Alt or RT (on a guard) is down, the focus does not change; if the target leaves reach mid-hold the
  hold cancels with no action (the old "a guard turning must not turn KNOCK OUT into KILL under the thumb").
- Several actions on one target: one cluster, one row per button (A, Alt, RT, LT), each row "tap label · hold label".
- Faint markers (choice 3, A10): other candidates and interactables within `CTX_FAINT_R` = 3 m, in front of the camera,
  within 1.5 m of the feet's height, at most 6, show a dim marker with no text.
- A press is owned (`ctxOwnsA`, as today): a press the system used is swallowed until released, so the door peek, the
  vent hold and the team-move press never see it.
- Scripted taps (`InputState.tap('interact')`, tests and tools) run the tap action at once (no hold timing); tests drive
  holds with real key / pad holds. `g.ctxPrompts` exposes the focus (kind, ref, rows, labels, hold fill) read-only for
  tests, and `g.grabMenu.sel` keeps working for the scripted held-guard picks.

## 5. The prompt's look
- One layer: the existing `.hud-world` world-prompt layer (`worldPrompts.ts`), so the context prompts, traversal and
  team prompts share one look and one overlap rule. No new image or icon assets: the `.wp-mark` diamond, the pill body
  and the existing button glyphs (`promptHtml` / `verbPromptHtml`, `src/ui/prompts.ts`).
- The focused target: the marker at the anchor and a small stack of rows under it, one per button:
  `[A] Open · hold Bash`, `[D-pad up] Peek · hold Optic cable`. The hold half is dimmer until held; a ring round the
  glyph fills while the button is held (the centre prompt's `.hold-ring` style), the same for item holds.
- Fade: a candidate's marker fades in from 3 m (opacity 0 to 0.35); the focused target's cluster fades to full over
  0.15 s (CSS opacity transition, no per-frame style writes beyond the transform). Off screen: clamped to the screen
  edge as `worldPrompts` does today (8-92 % across, 10-97 % down); behind the camera: hidden.
- Size: text in `vh` units like the old box (about 2.2 vh, the old 11 px at 720 p), times `--hud-scale` (Settings >
  Accessibility, 0.8-1.4); S4 sets `--hud-scale` on the world layer, which today sits outside the HUD element.
- Glyphs per device: all variants are emitted and the body class picks Xbox, PlayStation, Nintendo or the key label, so
  prompts swap at once when the pad connects or disconnects (bible 8). D-pad up gets a glyph entry (`DU`: "D-pad ↑" pill
  on pads); keys show the bound key (H). Remapped buttons show their new glyph (`padButtons` / `keyLabels`).
- DOM: fixed elements (one cluster, 4 rows, 6 faint markers) written only when their text changes (a version counter,
  as `ContextMenuView`); positions as transforms only when they move.
- With the flag on, the top-right box (`.hud-ctx`) and the centre use prompt (`Hud.setInteract`) never show; the old
  `takedown` world prompt id is folded into the cluster.
- The comment in `worldPrompts.ts` that names another game is rewritten (G6) when S4 touches the file.
- Look sign-off: the builder posts three screenshots (door, guard from behind, hold item) in the PR body for the walk
  card; a big look change otherwise needs Michael's one click (G288), which choice 3 and the summary sheet cover.

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
- The partner's hostage: `[A] Team takedown`, `[D-pad up] Bluff` when joint information exists (A17).
- Hang-down: the hanging player's rows 10-11 (`[A] Grab` / `[RT] Choke · hold Neck snap` on the guard; an item in
  reach on A; `[RB] Pull me up` on the holder). The A9 direct path (`updateInteract`) is folded into the provider under
  the flag; the old path stays for the flag off.
- Team move text: `teamController.ts` ~817 ("Hanging: A to use what is in reach, hold A by a guard to grab...") and the
  other "Co-op: ..." lines become the short move names under the flag (the full lines stay for the flag off).
- Key switches and team doors: each player's own A on their own half (unchanged rule, `pairPress.ts`).
- The knife scene (G426, `knifeSceneOn`): every guard row is `[A] Knife takedown` (tap or hold, both the knife kill:
  `start(lethalOnly)` forces it); the holstered attack press stays the knife kill (`knifeAttack`, #682) and the prompt
  names it `[RT] Knife takedown`; no grab, no strike, no free slash; the "Knife ready: get behind or beside a guard" cue
  unchanged. The knife's pair runs host-side as today.

## 7. Rollout
- Flag: `contextPrompts: darkFlag(params.get('ctxprompts'), PREVIEW_ON)` in `src/core/flags.ts` (the `Flags` field with
  its doc line: owner Night Shift | Player Build, switch-on at Michael's walk, target 2026-10-31). Live default off;
  `/preview/` on; `?ctxprompts=1` / `0` override (G416).
- `GameState`: with the flag on, `contextPromptStep` runs where `contextMenuStep` runs now and owns A the same way
  (`ctxOwnsA`); with it off nothing changes. The other readers of `ctxMenu.state === 'active'` (the frame's blank move
  ~3254, the vision toggle ~3319, `knifeAttack` ~2260) read a shared `ctxListOpen` getter that is always false under the
  flag (no list, walking free, A12).
- The old box, its code, its CSS and every test that drives it stay until switch-on (S7). e2e builds are not preview
  builds, so the existing suites keep testing the old box; the new steps pass `?ctxprompts=1`.
- Walk pacing (G288): Player area. The orchestrator counts it against the Player cap at switch-on; it builds dark now.
- Switch-on (S7, after Michael accepts it): the default flips on, the old-menu tests move to the new system, the old
  box is deleted, and the orchestrator folds A1-A20 and Michael's picks into DECISIONS (G198, G203, G205, G206 replaced;
  G96, G77 narrowed) and the bible's 5.4 / 5.10 / controls lines.

## 8. Slices
Claims: no maps, no wire paths, no save paths. Settings gain one bind id per device (`interactAlt`); `sanitizePadBinds`
and `sanitizeBinds` start from the defaults, so old settings load with the default (S2 adds a test with a literal old
settings object; no `SAVE_VERSION` or layout version bump). One PR per row of "PR", each under ~1.5k changed lines.

| Slice | PR | Model | Files (new *) | Size | Depends |
| --- | --- | --- | --- | --- | --- |
| S1 Core model | P1 | Opus | *`src/game/contextPrompts.ts` (targets, fixed slots, focus pick / sticky / lock, tap vs hold resolver, ownership, `CTX_HOLD`, `CTX_FOCUS`, `CTX_SLOT_BUTTON`); *`tests/contextPrompts.test.ts` | ~750 | - |
| S2 Second-action verb | P1 | Opus | `src/input/actions.ts`, `padBinds.ts`, `keyBindings.ts`, `conflicts.ts` (stale header), `gamepadSource.ts` (button list), `gamepadMapping.ts` (`DU` glyph), `src/ui/prompts.ts` (`padButtons` / `keyLabels`), `src/core/app.ts` (labels); `tests/padBinds.test.ts`, `tests/keyBindings.test.ts`, `tests/conflicts.test.ts` | ~300 | - |
| S3 Providers and wiring | P2 | Opus | `src/core/flags.ts`; *`src/game/contextProviders.ts` (rows 1-8, 12, 15-33 of section 2 from a narrow `CtxHost`); `src/game/gameState.ts` (`contextPromptStep`, `ctxListOpen`, the host methods); *`tests/contextProviders.test.ts`; `scripts/e2e-takedown.mjs`, `scripts/e2e-stealth-ai.mjs` (new `?ctxprompts=1` steps) | ~1,200 | S1, S2 |
| S4 Prompt view | P3 | Sonnet (strict Opus brief) | *`src/ui/hud/contextPromptView.ts`; *`src/ui/hud/promptLayout.ts` (pure: fade band, clamp, overlap push); `src/ui/hud/worldPrompts.ts`, `src/ui/hud/hud.ts`, `src/styles.css`; *`tests/promptLayout.test.ts`; `scripts/e2e-pad.mjs` (glyph swap step) | ~800 | S1 (types); parallel with S3 |
| S5 Co-op, hang-down, carry, knife | P4 | Opus | `src/game/contextProviders.ts` (rows 10-11, 13-14, 24, 27, 38-39 anchors), `src/game/gameState.ts` (`updateInteract` under the flag, team prompt anchor), `src/game/teamController.ts`, `src/game/kit/pullUp.ts`, `shutter.ts`, `chimneyPair.ts` (short move names under the flag); `tests/contextProviders.test.ts`; `scripts/e2e-coop.mjs`, `scripts/e2e-piano.mjs` | ~900 | S3 |
| S6 Docs and walk prep | P4 | Haiku | `docs/systems/input-and-loop.md`, `ui.md`, `takedowns.md`, `movement.md`, `ct-toolkit.md`; `TESTING.md`; `changes/feature-context-prompts.md` (kind: minor); `docs/context-prompts/STATE.md` | ~200 | S5 |
| S7 Switch-on (after Michael's yes) | P5, P6 | Opus | P5: flag default on, old-menu asserts moved (`scripts/e2e-takedown.mjs` 15, `e2e-coop.mjs` 7, `e2e-stealth-ai.mjs` 5, `e2e-sectorops.mjs` 3, `e2e-pad.mjs` 2, `e2e-modes.mjs` 1, `e2e-gadgets.mjs` 1, `e2e-ctcourse/a3OfficeRange.mjs`, `a6PumpHouse.mjs`, `route-run/driver.mjs`, `anim-sheet.mjs`, `anim-natural/audit.mjs`; `tests/doorMenu`, `grabMenu`, `guardInfo`, `marlowN9SlideDoor`, `routeRunPair`, `ctcourse/a4GoodsShed`). P6: delete `contextMenu.ts`, `contextMenuView.ts`, `CtxNav`, `CTX_BINDINGS`, `ctxUp` / `ctxDown`, `.hud-ctx` CSS, the flag-off branches | ~1,000 + ~900 | Michael's walk |

Tests per slice (agents: `npm run typecheck:fast` + `npx vitest run <files>`; e2e only through the laptop queue):
- S1: `tests/contextPrompts.test.ts`: focus by priority and score; sticky margin and dwell; lock while held and the
  cancel when the target leaves; tap on press (no hold action) vs tap on release and hold at `CTX_HOLD`; item fill and
  early release; scripted tap; ownership (`ctxOwnsA`) until release; no allocation per step (slot reuse).
- S2: the three binding tests (defaults, sanitize from a literal old settings object, conflicts with D-pad up / H /
  Mouse4 taken). Affected e2e: `e2e-pad`, `e2e-mouse`, `e2e-move`, `e2e-menus`.
- S3: `tests/contextProviders.test.ts` (a fake host: each target kind's rows, the sliding / open / locked door, the gap
  with and without a trap, lethal-only, quadruped, knife on). e2e with `?ctxprompts=1`: `e2e-takedown` (A tap grabs from
  behind; front: tap knocks out, hold kills; RT unchanged; held guard interrogate), `e2e-stealth-ai` (door: tap opens,
  hold bashes and knocks out the guard behind, Alt tap peeks, Alt hold feeds the optic). Gate (src/game):
  `e2e-coop` + `e2e-netmove` green before the checker passes; the old-box steps must stay green (flag off).
- S4: `tests/promptLayout.test.ts`; `e2e-pad` step: the cluster shows on a door with the pad glyph, swaps to the key
  label on a key press; `e2e-desktop` by `affected-e2e`. Three screenshots in the PR body.
- S5: provider tests for the partner rows; `e2e-coop` with `?ctxprompts=1` on both tabs (revive prompt and hold, team
  takedown and bluff on the hostage, hang-down grab, team-move prompt on the partner), `e2e-netmove`, `e2e-ctcourse`
  (the co-op group, `src/game`); `e2e-piano` (A and RT knife takedown, no grab).
- S6: docs only (CI `check`).
- S7: the full suites the moved asserts live in, then the train's full run.

Walk items (for the orchestrator's card, `/preview/`, pad first):
1. At a closed door: the prompt fades in on the door; tap A opens, hold A bashes (a guard behind it drops); D-pad up
   peeks, hold D-pad up runs the optic cable. Keyboard: E and H.
2. Behind a guard: `[A] Grab` on his head; RT tap knocks out, RT hold kills. In front of a guard: tap A knocks out, hold
   A kills. Holding a guard: the rows for interrogate, RT, LT.
3. A light switch (tap), an alarm panel (hold, the ring fills), a body (pick up, carry, hide).
4. Co-op: each player sees only their own prompts; revive a downed partner (hold A on them); a team move named on the
   partner; the partner's hostage: team takedown, bluff.
5. The knife scene: A or the attack button on a guard is the knife takedown.
6. The old box never shows; walking never stops while prompts show.

## 9. Risks and open questions
- Hold delay on taps: on targets with a hold action (doors, faced guards) the tap runs on release, up to 0.35 s later
  than today's tap. Starting value; Michael's walk decides (no tuning before, G421).
- Accidental kills or bashes: a long press on A now kills or bashes where it used to only open the list. The hold
  label and the filling ring show it; choice 2 lets Michael keep kills off A.
- Priority hides the door while a guard is on offer (one focus). Open: if Michael wants both reachable at once, Alt
  could act on the door while A acts on the guard (a later change in the provider table, not built now).
- Faint markers with no line-of-sight test can show an item through a thin wall (height band and facing limit it).
  Open: a raycast per marker if the walk shows leaks.
- Mouse4 is the browser's "forward" button: `keyboardMouseSource.ts` must stop its default (S2 checks; H alone is the
  fallback).
- Tests: about 40 asserts in 12 e2e files and 6 vitest files read the old menu (`ctxMenu`, `doorMenu`, `grabMenu`,
  `.hud-ctx`). They stay green with the flag off and move at S7, a large but mechanical slice.
- `gameState.ts` is 4,339 lines: the providers go in their own file behind a narrow host interface to keep its growth
  to the wiring (~250 lines).
- Co-op: a client's predicted prompt can show an action the host then refuses (a door already opened by the partner);
  the refusal paths are today's, so the result is the same as a refused menu row.
- G6: nothing in code, UI, specs or docs names the game in Michael's quote; reviewers check the diff for it.
- Open for Michael: the three choices in the brief. Everything else is assumed (A1-A20) and logged.
