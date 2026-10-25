# Objective pop-up, objective list and Notes
kind: minor
- A tap of View (pad) or O (keyboard) shows the current objective for a few seconds; it also shows whenever the
  objective changes (G343).
- Sector Ops: Pause > Objectives lists the full objective list for the operation, on the host and the co-op client
  (G343).
- Pause > Notes: the lines learned from interrogations this match, newest focused, "No notes yet" when empty. A co-op
  client keeps the intel and keypad radio lines only; a client that drops and rejoins starts with empty notes.
- Co-op: connection notices no longer take over the objective line; they show on their own status line.
- Tests: e2e-sectorops, e2e-pad, e2e-mouse, e2e-coop, e2e-takedown and e2e-menus check the pop-up, the binds, the
  objective list and the Notes screen.
