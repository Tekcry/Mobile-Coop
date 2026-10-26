# Context prompts - BRIEF
Owner: Night Shift | Player Build. Status: current.

The job: replace the hold-A interaction box with the context prompt system. Plan: `docs/context-prompts/PLAN.md`.

## Michael said (verbatim, G114)
2026-10-27 ~09:50, typed: "can you update the interaction system to use a contextual system like hitman world of
assassination, where the action button fades in on the surface/person/item that you can interact with? this should
work for all interactions and replace the existing interaction box that shows up. each interaction should be quickly
accessible using a single button for each, instead of selecting through them. also holding on particular actions
should do different things"

## Michael picked
2026-10-27 ~10:15, one native multiple-choice click per question (`cp-SUMMARY` was the decision pack):
1. Which button runs the second action at a door, a hatch or a partner's hostage (peek, optic cable, bluff)?
   Picked: "Y at doors and hatches" (not the recommended D-pad up). The design is A2; its assumed parts are A21-A26.
2. Holding A on a guard you face (not from behind)? Picked: "Tap knocks out, hold kills (Recommended)". A6 confirmed.
3. Other things you can use nearby? Picked: "Only the one you face (Recommended)". A10 confirmed; no faint markers.

## The goal
- The button for each action fades in on the thing it acts on: the door, the guard, the body, the panel, the item, the
  partner. No box in the corner, no list to scroll.
- Every action has its own button, shown next to it; one press runs it. Where an action has a stronger or louder
  version, holding the same button runs that instead (open / bash, knock out / kill).
- It covers every interaction in the game (PLAN 1 lists them), on pad first, keyboard and mouse too, in single player
  and co-op, the knife scene included.
- It replaces the hold-A context menu everywhere. Until Michael switches it on, it ships dark behind the flag
  `contextPrompts` (on in `/preview/`), with the old box kept.

## What this replaces (authority order, G86: Michael's current instruction wins)
At the merge the orchestrator folds these into DECISIONS with Michael's words and picks; until then this brief records
them.
- G198 (the hold-A action menu "identical" to CT, with a return-to-game row), G19 (door actions from a pop-up list) and
  the menu half of G5's AUDIT-ACTIONMENU: replaced. There is no list and no BACK TO GAME row.
- G203 (behind a guard the menu lists only grab and return), G205 (no return row once grabbed), G206 (one KNOCK OUT row
  for ledge, pipe and window takedowns): replaced by the per-button prompts in PLAN 2. Their substance stays: grab first
  from behind (G23, G43), no release (G204), RT tap knocks out and RT hold kills (G210), LT aims the shield.
- G96 (exact CT pad layout): narrowed (Michael's pick 1). No new button and no new verb: Y (keyboard: the jump key)
  also runs the second action at a door or hatch you face, and at a partner's hostage, when no climb is offered there
  (A2). Everywhere else Y jumps and climbs as before. D-pad up and down (the old list's highlight) are free after
  switch-on.
- G77 / bible 5.10 (the in-game HUD follows CT's layout): narrowed. The top-right box goes; the prompts sit on the
  world. Every other HUD element stays where it is.
- G97 (the CT door menu): narrowed. The same four door actions stay, reached by buttons instead of rows; running into a
  door still does nothing special.
- VISION rule 5 / G290 (no markers in the campaign and Sector Ops), G339 and G135 (no partner marker): kept (Michael's
  pick 3, A10).

## Assumed decisions (each with how to undo it)
- **A1. A stays the main action button.** A press runs the plain action (open, grab, knock out, pick up, use); a hold
  runs the stronger one where there is one. Keyboard: E. Undo: change the button in the action table
  (`CTX_SLOT_BUTTON` in `src/game/contextPrompts.ts`).
- **A2. Y runs the second action at doors and hatches (Michael's pick 1).** No new verb: the existing jump verb (pad Y,
  keyboard Space) gets a context rule. Y is the second action (tap: door peek, optic cable at a hatch, bluff; hold:
  optic cable under a door) only when a door, a hatch or the partner's hostage is the focused target (the one you face,
  in reach, you on the ground) and the traversal probe offers nothing there (no vault, mantle, step, drop, ledge, pipe,
  ladder or vent: both traversal hints are empty). If a traversal is offered, Y jumps or climbs as today and the
  target's Y row is hidden; the A row stays. Everywhere else Y is exactly today's jump and climb. PLAN 3 lists the
  jump-at-a-door cases. Undo: give the second action its own verb again (the D-pad up design: `interactAlt` in
  `src/input/padBinds.ts` / `keyBindings.ts`, the old S2 claims) and drop the rule in `src/game/contextJump.ts`.
- **A3. One hold time, 0.35 s, for every press / hold pair** (the RT strike's `STANCE.rtHold`). On a button whose action
  has a hold version, a tap runs on release; on one without, it runs on the press. A ring fills round the glyph while
  the button is held. Starting value, not tuned before Michael plays (G421). Undo: `CTX_HOLD`.
- **A4. RT and LT keep their jobs.** Holstered RT tap knocks out and RT hold kills (G210); holding a guard, RT tap knocks
  him out, RT hold kills, LT aims the pistol over his shoulder; the knife scene's attack press is the knife kill (#682).
  The prompt on the guard now names them. Undo: nothing changes here.
- **A5. From behind, A grabs (G23, G43) and A has no hold version there.** The grab's own setting (`grabToggle`: hold
  to keep the guard) already uses A's hold. Undo: give the `behind` row a hold option in the provider table.
- **A6. A guard you face (front, side, over cover, corner, from above or below, through a window, hanging inverted):
  tap A knocks out, hold A kills (Michael's pick 2, confirmed).** This restores G43's tap / hold on the takedown button
  for every non-grab takedown. A guard where only a lethal takedown is allowed shows only "hold: Kill". Undo: drop the
  hold option from those rows (kills stay on RT hold).
- **A7. Doors.** A closed, unlocked door faced: tap A opens (the quiet open, as OPEN DOOR today), hold A bashes (loud;
  knocks out a guard right behind it); tap Y peeks (the stealth open: a crack, the stick pushes it; only when the peek
  is on offer), hold Y feeds the optic cable, both under A2's rule. A sliding door: tap A opens, nothing else. An open
  door: tap A closes. A locked door: no prompt. Undo: the door rows in the provider table.
- **A8. Gaps (hatches, ceiling panels, grilles, shaft tops).** Tap A opens the trap where a closed panel covers it; tap
  Y feeds the optic cable (A2's rule; no hold on Y here, so it runs on the press). Undo: the gap rows.
- **A9. Items keep their own timing.** A tap item (switch, bolt, extract, intel, key switch, EMP) runs on the press; a
  hold item (hack, keypad, alarm panel, medkit station, crate, revive, desk, board) fills while A is held, as now.
  "Held interactions: Tap to start" (`access.holdToggle`) keeps working for these plain holds (G398). Undo: none needed.
- **A10. What you see (Michael's pick 3, confirmed).** Only the thing you will act on shows its prompt; nothing else
  near you is marked. This keeps VISION rule 5 / G290 (in-world guidance, no markers), G339 and G135. No faint markers
  are built (`CTX_FAINT` is dropped from the plan). Undo: none needed.
- **A11. Target choice.** Each kind keeps today's reach (door 1.6 m and faced, gap 1.6 m, items 1.8 m, the takedown
  offer as the takedown system makes it). Among those in reach the focus is the one nearest the camera's aim and the
  body; it is sticky (another must score clearly better for 0.15 s), and it is locked while any context button (A, a Y
  press taken as the second action, RT on a guard) is down. The focused prompt fades in over 0.15 s. Undo: the numbers
  in `CTX_FOCUS`.
- **A12. Walking stays free.** The old held list stood the operator still; prompts never do. A hold in progress
  cancels if its target leaves reach. Undo: none needed.
- **A13. Traversal keeps Y.** Vault, climb, ledge, pipe, zipline, rope and the vent (tap Y kicks it in, hold Y unscrews
  it) keep their buttons and their world prompts, restyled into the same look; an offered traversal always wins Y over
  the second action (A2). Undo: none needed.
- **A14. Team moves keep RB** and their current choice (stand or crouch picks the move); the prompt sits on the partner
  or the ledge. No RB hold version (RB held while aiming the pistol is the jammer). While a team move or its offer is
  under way (not hanging), A keeps today's two direct jobs, now with world prompts: it starts the takedown on offer, else
  it uses the item in reach. Doors and hatches are not targets then, so Y does what it does today. Undo: none needed.
- **A15. Bodies.** Tap A picks a body up; carrying, tap A hides it at a hiding spot, opens or closes a door faced, else
  puts it down; B at the lift lets go (unchanged). Carrying, there is no second action (the peek and traversal are off
  while carrying today). Undo: none needed.
- **A16. A held guard.** Tap A interrogates when he has information; RT tap / hold and LT as A4; nothing lets him go
  (G204). Undo: none needed.
- **A17. The partner's hostage (co-op).** Tap A is the team takedown; tap Y bluffs when there is joint information
  (G148), under A2's rule (A23). Undo: the hostage rows.
- **A18. Co-op.** No wire change and no protocol bump: every action runs through today's calls (`takedown.start`,
  `menuPick`, the door picks, the item's `onUse`), host-approved as now. Each player sees only their own prompts and
  runs A2's rule on their own traversal hints. The partner is a target for revive (hold A) and for team moves (RB).
  Undo: none needed.
- **A19. The knife scene** (piano escape, G426): A (tap or hold) on every guard on two legs in reach, except the
  partner's hostage, is the knife takedown; the hostage stays the team takedown (`takedownController.start` exempts
  `assist`); no grab there; the holstered attack press stays the knife kill. Y is unchanged by the scene (A2's rule as
  anywhere). Undo: the knife rows.
- **A20. Rollout.** A new flag `contextPrompts` in `src/core/flags.ts` (`?ctxprompts=1` / `0`; on in `/preview/` by the
  preview rule, G416). With the flag off Y and the jump key do exactly what they do today and the controls screen is
  unchanged (there is no new row to hide). The old box, its code and its tests stay until switch-on; the switch-on
  slice removes them. Owner: Night Shift | Player Build; switch-on when Michael accepts it at a walk (target
  2026-10-31). Undo: the flag.
- **A21. How the Y rule decides (part of pick 1).** It judges each Y press once, at the press, against the traversal
  hints the screen shows that step (what the prompt shows is what Y does), and only when you are on the ground, not
  attached, not mid-traversal, not on the wall, not carrying, not in a team move, and no takedown or peek is running. A
  press it takes is owned until release (`ctxOwnsY`, as `ctxOwnsA`): traversal, the vent start and the door peek's
  "jump ends the peek" check never see it. During a peek, Y still ends the peek (today's rule). Undo: the conditions in
  `src/game/contextJump.ts`.
- **A22. The keyboard matches the pad (part of pick 1).** One rule on both devices: the jump key (Space) is the second
  action at doors, hatches and the hostage under the same rule. The planned H / mouse-forward-button binding is dropped.
  Undo: bring back H (a keyboard-only `interactAlt` verb on H / `Mouse4`, with its row, settings default and tests).
- **A23. The bluff (part of pick 1).** The bluffer is the player standing beside the partner's hold, not the holder:
  tap Y on the partner's hostage, under A2's rule. The holder's own Y has no job today (a hold is a running takedown,
  so `takedown.busy` keeps the jump press from traversal) and gets none: the holder's actions stay on A, RT and LT.
  Undo: move the bluff to another button in the hostage rows.
- **A24. A remapped jump carries the second action (part of pick 1).** One verb, one binding row: whoever moves jump to
  another button moves the peek, the optic cable and the bluff with it, and the prompt shows the bound glyph. Undo: as
  A2 (a separate verb).
- **A25. No plain jump at a faced door or hatch (part of pick 1).** Facing a closed door or a hatch in reach with no
  climb on offer, Y peeks or feeds the optic cable instead of jumping (today it jumps on the spot). A tap where only the
  hold is on offer (the peek not on offer: the door is cracked by the partner, say) does nothing. Running into a door
  without a press still does nothing special (G97). Undo: add "not sprinting" or "standing still" to the rule in
  `contextJump.ts`.
- **A26. Labels (part of pick 1).** While dark, the controls screen's jump row keeps "Jump / traverse" and no start-up
  note changes. At switch-on (P6) the label becomes "Jump / traverse / peek" with the matching row in
  `docs/systems/input-and-loop.md`. Undo: keep the old label.

## Out of scope
- New actions: lock picking, body dragging, forcing a guard to a device ("not built yet" stays as it is), new team
  moves. Only today's actions get new buttons.
- New art: no new images or icons; the prompts use the existing HUD style and button glyphs.
- Tuning the feel (hold time, fade distance, sizes) before Michael plays (G421, G422).
- The selection wheel (LB), the vision toggle, the gadget quick-use and the objective button: unchanged.
- Faint markers on nearby usable things (Michael picked "Only the one you face").
- Removing the old box before switch-on.
- The parked modes and the Kestrel editor (no new work).
