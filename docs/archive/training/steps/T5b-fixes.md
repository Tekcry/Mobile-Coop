# Step T5b - walk 1 fixes: automatic airlocks, client prompts and doors, objective list (Block C start)

Model: implementer opus, checker opus (src/net: runs e2e-coop and e2e-netmove). Deps: walk 1 (docs/training/WALK-NOTES.md).

## Read
- docs/training/WALK-NOTES.md (all); DECISIONS.md D45, D46, D48; SPEC.md "Course rules" R5, R6
- src/game/course/courseState.ts (airlock phases, `pressCycle` ~:219, the airlock prompt ~:442), courseDef.ts ~:263-280
- src/game/modes/courseMode.ts (interactables it creates; door locks); src/ui/hud/courseHud.ts
- src/net/coopHost.ts `items()` (~:812-860: items sent with `on: it.enabled && !it.done`); src/net/coopClient.ts
  `syncItems` (~:256), `syncDoors` (~:283), the `course` message handling (grep `applyCourseWire`)
- src/world/doors.ts (setOpen, locked); scripts/e2e-course.mjs, scripts/e2e-bunker.mjs

## Task (decisions)
1. Automatic airlocks (R6, D46; supersedes the Cycle button): each airlock gets a marked floor area (visual decal /
   outline, emissive edge); one player on it shows "Waiting for partner" on both screens; both on it, none downed and
   the bay's objectives done: the rear door closes and locks for good, the cycle runs (4 s), the front door opens. Remove
   the Cycle interactable and its prompt everywhere (courselab too). Refusals name the open objectives on the HUD.
2. Rear door bug (D48): on the cycle the rear door must close (leaf swings shut, body back) and lock, on host and client.
   Find why it stayed open; fix; a test proves it on both pages.
3. Client buttons bug (D48): the client sees no course prompts (switches, levers, pickups). Find why (items not sent,
   sent disabled, labels missing, or the client's course HUD missing); fix so every course interactable shows and works
   for the client through `use`.
4. Client doors bug (D48): the client could run through his lane door while the host's stayed locked. Door lock state
   from the host must be applied on the client (the leaf closed and its body present while locked); nothing on the
   client unlocks a course door by itself. Fix; prove it.
5. Objective list (R5, D45): the course HUD's objective list is always on screen for both players from spawn: every
   objective named explicitly ("Open your locker", "Ladder up to the gallery"), ticked per player as done, the current one
   highlighted; it never hides behind a toggle.

## Tests
e2e-course (courselab) and e2e-bunker B1 / B2 sections, two pages: one player on the airlock pad waits (both see
"Waiting for partner"); both seal it; the rear door is shut and locked on both pages; every course prompt shows on the
client and works; a locked door blocks the client (he cannot pass it); the objective list shows on both pages at spawn.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-course e2e-bunker e2e-coop e2e-netmove smoke`.

## Commit
"training T5b: automatic airlocks, client prompts and door locks, objective list". Docs: LOG, STATE, coop.md, ui.md.
