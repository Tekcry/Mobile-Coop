# G5 - the hold-A context action menu (CT prototype)

Michael (2026-10-19 23:20): "quick note that the action menu that shows up requires holding A and selecting which
option you would like to proceed with, including returning to game (no action). I want it to be identical."
Spec: `docs/ct-prototype/audit/AUDIT-ACTIONMENU.md`.

## What was built
- One menu for everything in reach (`src/game/contextMenu.ts`, Babylon-free, a state machine none / passive / active
  with fixed row slots: nothing allocated per step). It replaces the press-to-open door menu, the always-open grab menu
  and the centre "use" prompt.
- Providers, refilled every fixed step in CT order (`GameState.contextMenuStep`, first in the step):
  1. a held guard: Knock out, Kill, Carry, Force to device (stub), Interrogate (alone, as before);
  2. else the takedown on offer: GRAB CHARACTER from behind; KNOCK OUT / KILL for the other takedowns (front, side,
     corner, drop, above, below, window, inverted); KILL alone where only a lethal one is allowed;
  3. the closed, unlocked door faced: OPEN DOOR, OPEN DOOR STEALTH (when the peek is on offer), BASH DOOR, OPTIC CABLE
     (stub);
  4. the item in reach or the carry target (its own label; a door's own item reads OPEN DOOR / CLOSE DOOR, so an open
     door offers CLOSE DOOR).
- Behaviour: passive = the list top right under INTERACT, dim, no highlight, walking free. Hold A = the header turns
  into BACK TO GAME and row 1 is highlighted in the press step (no hold threshold, no fade); the operator stands still,
  the camera stays free. Stick / D-pad / mouse wheel / W S move the highlight one row per step, no wrap; BACK TO GAME
  is a row above row 1. Release A = the highlighted row runs; on BACK TO GAME nothing. A quick tap runs row 1. B closes
  the held list with no action; B or Y still lets a held guard go.
- Hold items (hack terminals, medkit stations, alarm panels, revive): their row fills while A stays on it (a fill line
  on the row) and runs once full; let go early and nothing happens.
- Every row runs the same call as before G5 (`takedown.start`, `takedown.menuPick`, `doorMenuPick`, the item's
  `onUse`): co-op is unchanged, no wire change (PROTOCOL_VERSION 24).
- HUD (`src/ui/hud/contextMenuView.ts`, `.hud-ctx` in `src/styles.css`): header box over the options box inside a dim
  corner-tick frame; DOM writes only when the menu's `version` changes.

## Measured values used (fractions of the frame, AUDIT-ACTIONMENU; all starting values)
| Item | CT | Ours |
|---|---|---|
| Right edge, width | x 0.694-0.970 W | right 3.0 % W, width 27.6 % W |
| Header | y 0.107-0.139 H, text at 0.706 W | top 10.7 % H (see below), 3.2 % H tall, text inset 1.2 % W |
| Gap header / options | 7 px = 0.4 % H | 0.4 % H |
| Options box | 38 px + 55.7 px per row (2.3 % H + 3.34 % H x N) | padding 1.15 % H top and bottom, rows 3.34 % H |
| Type | cap height 2.0 % H, uppercase, wide squared sans | Barlow Condensed (bundled) 2.86 % H (cap ~0.7 em), uppercase, letter-spacing 0.08 em |
| Highlight | outline 0.698-0.965 W, 2.9 % H tall, bright end marks, brighter text, no fill | outline inset 0.4 % W, 2.9 % H tall, corner ticks, brighter text, no fill |
| Fill | translucent black ~65 % | rgba(8, 11, 14, 0.62) |
| Header text | INTERACT / BACK TO GAME | same |
| Show / hide | instant | instant (display toggle) |
| Stick idle before it scrolls | not measurable | 0.25 (`CTX_STICK_IDLE`) |

## What differs from CT
- Art is our own (IP rule): steel-blue borders instead of CT's pale green, corner ticks instead of CT's "[" "]" ends,
  a corner-tick outer frame instead of CT's full bracket, a fill line for hold rows.
- The box sits under our minimap where the two would overlap (top = max(10.7 % H, minimap bottom + 10 px); at 1080p
  that is about 12.6 % H). CT has no minimap there. (History: the minimap is removed in every mode, G339.)
- KNOCK OUT / KILL rows for the non-grab takedowns: CT does these on the triggers (LT / RT). Our A takedowns had tap =
  knock out, hold = kill; hold is the menu now, so the choice moved into the list (a tap still knocks out). The
  holstered RT / LT palm strikes are unchanged.
- The held-guard set keeps our five options (CT footage shows INTERROGATE; the other picks came from G23 / G43).
- Not built: locked doors still list nothing (no PICK LOCK / BREAK LOCK), a body reads PICK UP BODY (CT: BODY), no
  traversal rows (rope, rappel, climb: Y does those), no passive row-1 highlight at an object, no reach hysteresis.
- Team moves: while a co-op team move runs (the partner hanging head-first at the station 5 panel) the menu stands
  aside and A uses the item directly, as before (the off-limits e2e-ctcourse holds A there until the grid opens).
  Also aside: down, the door peek, a remote view, the wheel, a running takedown, finisher or lift.
- `access.holdToggle` does not latch the menu (it still works on the team-move direct path).
- KBM: E while aiming opens the list (the pad's A reloads when drawn, so the pad does not).

## Files
- New: `src/game/contextMenu.ts`, `src/ui/hud/contextMenuView.ts`, `tests/contextMenu.test.ts`.
- Rewritten: `src/game/doorMenu.ts` (door options, `addDoorRows`, `DoorMenuView`), `src/game/grabMenu.ts` (grab
  options, `addGrabRows`, `GrabMenuView`; `DoorMenu`, `GrabMenu` and `menuNavDir` are gone).
- `src/game/gameState.ts`: `contextMenuStep` + `ctxRun` replace `doorMenuStep`, `grabMenuStep` and the door branch of
  `updateInteract` (now the interactables' update plus the team-move direct path); the step's A readers (door peek,
  traversal's held use, the takedown press) see A up while the menu owns it; the held list blanks the step input.
- `src/ui/hud/hud.ts` (the old `.hud-doormenu` / `setDoorMenu` removed), `src/styles.css` (`.hud-ctx`),
  `src/input/keyboardMouseSource.ts` (a fresh W / S press in live play also taps `uiUp` / `uiDown`).
- Docs: `docs/systems/input-and-loop.md` ("The context action menu (G5)", the A row), `docs/systems/ui.md` (HUD).

## Tests changed and why
- `tests/doorMenu.test.ts`, `tests/grabMenu.test.ts`: the classes became rows of the one menu; the option lists and the
  bash test are unchanged, the selection tests now drive `ContextMenu` through the views.
- `tests/grabMenuNav.test.ts`: `menuNavDir` replaced by `CtxNav` (D-pad always, the stick once back at the centre).
- `tests/contextMenu.test.ts` (new): press opens on row 1 in the same step; release runs it; nav one row per step, no
  wrap; BACK TO GAME runs nothing; quick tap runs row 1; scripted tap latches a door set, runs other lists; the list
  changing keeps the highlight by id, losing reach closes unrun; hold rows fill and run, early release runs nothing;
  B cancels; the version moves only on a change; rows past `CTX_MAX` dropped.
- `scripts/e2e-takedown.mjs`: "front, held: lethal" is now "front, the menu's Kill" (hold A, one down, let go; asserts
  the rows read Knock out / Kill). Everything else in it passes unchanged.
- `scripts/e2e-stealth-ai.mjs`: the door check read the old centre prompt "Door options"; it now reads the context
  menu (header Interact over Open door ... Bash door).
- Kept working unchanged: e2e-ctcourse, e2e-coop, e2e-netmove (door taps, `grabMenu.open` / `.sel`, `onUse`,
  `takedown.start`), anim-sheet's G7 scenarios (`grabMenu.sel = i` + a tap).

## Checks run
Desktop, 2026-10-20, on the shared working tree (G6 and G7 edits in progress alongside), `heavy.lock` held for the
build, e2e and GPU shot.
- `npx tsc --noEmit` clean; eslint clean on every touched file; vitest `contextMenu`, `doorMenu`, `grabMenu`,
  `grabMenuNav`: 16 / 16.
- `npm run build` ok. e2e on port 4196, one at a time: e2e-takedown, e2e-ct, e2e-pad, e2e-mouse, e2e-stealth,
  e2e-stealth-ai, e2e-wall, e2e-gadgets, e2e-sectorops, e2e-traverse, e2e-ctcourse (633 s), e2e-coop: all pass.
- e2e-netmove FAILS in its "back to a wall" section (wall crouch: the host's copy's wrists 0.19 / 0.44 m off the
  client's), before it reaches its door-peek taps. That is the wall pose sync G6 is editing now (wallController,
  characterRig, `pose.wallStepX`), not the menu; e2e-coop runs the same door-peek tap flow and passes. Rerun netmove once
  G6 lands.
- GPU shots (E2E_GPU=1, port 4189, Proving door): `docs/ct-prototype/shots/g5/ctx-door-passive.png` (INTERACT, four
  rows), `ctx-door-held.png` (A held, BACK TO GAME, OPEN DOOR STEALTH highlighted), `ctx-door-backtogame.png` (the
  header highlighted); releasing there left the door shut.
- Not run: the full `npm run e2e`, perf budgets (the menu writes the DOM only on a change).
- Left to the job lead: CHANGELOG / TESTING entries; `docs/systems/takedowns.md` still says tap / hold decides
  lethality (now KNOCK OUT / KILL rows).

## What Michael should try
1. Walk up to a closed door: the list appears top right (INTERACT, OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC
   CABLE). Hold A: BACK TO GAME, row 1 lit. Push the stick down twice, let go: the bash. Hold A, push up past row 1
   to BACK TO GAME, let go: nothing happens.
2. Tap A at a door: it just opens. Open door: the list reads CLOSE DOOR.
3. From behind a guard: GRAB CHARACTER; while holding him the list is Knock out / Kill / Carry / ... ; walk with him
   (list passive), hold A to choose (he stands still while you choose).
4. From the front of an unaware guard: KNOCK OUT / KILL (tap = knock out).
5. A medkit station or a hack terminal: hold A on its row until the line fills.
6. Keyboard: E held, mouse wheel or W / S to move, release E.

## Fix round (after the independent check, commit d2bb25db)
1. A highlighted row that leaves the list while A is held (a guard turning, a door opening) now sends the highlight
   to BACK TO GAME (`ContextMenu.end`), never onto the row that slid into its place: a turning guard can no longer turn
   KNOCK OUT into KILL under the thumb. `tests/contextMenu.test.ts` asserts `CTX_BACK` and that the release runs nothing.
2. `addDoorRows` (runs every step while a door is faced): an indexed loop, no iterator (hot-path rule).
3. Pause while A is held: `GameState.pause` resets the menu (closed, unrun); the release lost under the pause menu no
   longer runs the row on resume.
4. B with a held guard's list held open only closes the list (as BACK TO GAME); the guard stays held. B / Y with the
   list not held still let him go. e2e-takedown "grab-kill-carry-letgo" asserts both.

Checks: `npx tsc --noEmit` clean, eslint clean, vitest contextMenu / doorMenu / grabMenu / grabMenuNav 16 / 16; after `npm run build` (heavy.lock held) on port 4196: e2e-ct, e2e-takedown (with the new B check) and e2e-pad pass. Not committed.

## Michael 08:10 (with 08:20 and 08:25)
Verbatim: 08:10 "The action menu behind guard should only show grab or return, once they are grabbed it can show
interrogate (if they have information), and rt or Lt to either knock out or kill, and aim button to aim pistol while
holding them. It shouldn't have kill/knock out/carry in the list." 08:20 "The guard cannot be let go either, only
knocked out. Killed, or used as human shield (aiming pistol)". 08:25 "There is no back to game option once the grab is
initiated."
- Behind a guard: GRAB CHARACTER (and BACK TO GAME). Other takedowns on offer: one named row, a knockout (Takedown,
  Drop attack, Pull over ledge, Pull through window, Choke); no KNOCK OUT / KILL rows anywhere; the lethal close attack
  is RT's palm strike (unchanged); a guard who only falls to a lethal takedown gets no row. Assumed (A, undo: drop the
  rows in `GameState.contextMenuStep`): the non-grab takedowns keep one A row so the drop / pipe / window / corner moves
  stay reachable.
- Held: hold-A lists only INTERROGATE, only for a guard with information (`grabMenu.hasInfo`). No guard data carries
  information yet, so today every guard has none and there is no menu at all while holding. No BACK TO GAME and no B
  cancel on that list (`ContextMenu.noBack`); the HUD header stays INTERACT.
- Triggers while holding, not aiming: RT (KBM LMB) kills, LT (KBM Z) knocks out (`grabTriggerPick`, CT: RT lethal, LT
  non-lethal). Aiming (X / RMB) already drew the pistol over his shoulder (F1b): that is the human shield.
- No let-go: the B / Y / back shove is removed (`GameState` no longer sets it, `TakedownController.shovePressed` and its
  branch are gone). Interrogating keeps the hold. Clean ends kept: the holder dies, the guard dies to something else
  (`abort`, also a co-op `kill` event), respawn / restart (`reset`), the co-op host freeing a client's guard when that
  client drops out or the section restarts. The approach (before the hold) still breaks off if the attacker is hurt.
- Carry is never a row: a knocked-out body is lifted by its own PICK UP BODY row (unchanged). Carry and the Force to
  device stub stay reachable for scripts only: `g.grabMenu.sel = i` arms a pick and the next A press runs it (keeps
  e2e-coop's `sel = 0` + tap, e2e-pad's `sel = 0` + A and the anim-sheet G7 scenarios working unchanged).
- Tests: `tests/grabMenu.test.ts` (Interrogate only with information; the triggers; the armed pick),
  `tests/contextMenu.test.ts` (a no-BACK list: the highlight stops at row 1, B does not close it), e2e-takedown (front:
  one Takedown row knocks out; behind: only Grab character; held: no rows and no menu; LT knocks out; RT kills; B, Y and
  back never let go, then LT ends it).
- Docs: `docs/systems/takedowns.md`, `docs/systems/input-and-loop.md`, CHANGELOG's G5 entry, TESTING's action-menu line.

Checks: `npx tsc --noEmit` clean; eslint clean; vitest contextMenu / doorMenu / grabMenu / grabMenuNav / holdToggle / g7CloseQuarters 35 / 35; after `npm run build` (heavy.lock held) on port 4196: e2e-takedown, e2e-ct, e2e-pad, e2e-mouse pass. Not run this round: e2e-coop, e2e-ctcourse, e2e-netmove (their calls are kept; worth one run before the merge). Not committed.
