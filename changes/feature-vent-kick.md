# Vent unscrew on keyboard and pad
kind: minor
- Keyboard: a closed vent can be unscrewed again. Space starts it as before; while Space is still held it is no kick,
  and the hold carries on into E, so Space then E held (or Space held) unscrews quietly and a Space tap still kicks.
  Before, the kick was decided 33 ms after the press unless E was already down, so Space then E always kicked. A jump
  bound to a mouse button works the same.
- Pad (Michael: "Yes, match keyboard"): the same rule. Holding Y is no kick and the hold carries on into A, so Y then A
  held (or Y held) unscrews and a Y tap still kicks. Before, A had to be down within 33 ms of Y.
- The tap / hold rule is a pure module (`player/ventOpen.ts`) with unit tests; e2e-traverse's keyboard vent checks run
  again (Space, then E a few frames later: progress shows, letting go early stops it, no kick) and e2e-pad checks the
  pad vent (Y then A held unscrews, a Y tap kicks).
