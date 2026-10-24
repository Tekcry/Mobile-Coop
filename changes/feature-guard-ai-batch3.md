# Guard AI: one-mover fix
kind: patch
- Guard AI: a guard still walking to his reporter or overwatch cover is no longer made the flank while the point is
  on his own bound, so only one of point and flank is ever on the move at a time (the one-mover rule; e2e-stealth-ai
  'squad roles' was red on 4.100.2). Undo: `ONE_MOVER.roles` false in `src/ai/squadRoles.ts`.
