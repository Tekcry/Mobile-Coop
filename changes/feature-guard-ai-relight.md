# Guards relight switched-off breaker boards (guard-ai LR16-4)
kind: minor
- Guards relight (guard-ai LR16-4, the LR16-0 audit's gap row 10): the S15 breaker walk now covers the Sector Ops
  breaker boards as well as wall switches. A breaker board (`MapLayout.boards`, no `window`) cut with a guard watching is
  a fault: one witness says "Breaker's gone again.", walks to the board at patrol pace, works it 2 s and
  `IsolatorBoards.switchBack` puts every circuit of the board back on (the board's label, its wall switches, the
  `lightSwitch` event and the co-op lamp sync follow, as for a player's switch-back). A second cut inside 60 s is the
  S2 light check at the board; a cut nobody saw is found by late discovery; a shot lamp stays dark. A timed isolator's
  running window is the player's: its cut stays the S2 look at the board (the lure), no guard switches it back or turns
  a wall switch of its circuit on while it runs (`switchBack` refuses, the breaker host's `isOff` is false), and the
  timer relights it. Wall switch cuts were already relit by S15. Host only, no wire or save change. Unit tests in
  `tests/guardRelight.test.ts`; `tests/sectorIsolator.test.ts` updated for the refused switch-back.
