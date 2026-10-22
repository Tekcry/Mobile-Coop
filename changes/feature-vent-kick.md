# Keyboard vent unscrew
kind: patch
- Keyboard: a closed vent can be unscrewed again. Space starts it as before; while Space is still held it is no kick,
  and the hold carries on into E, so Space then E held (or Space held) unscrews quietly and a Space tap still kicks.
  Before, the kick was decided 33 ms after the press unless E was already down, so Space then E always kicked. The pad
  is unchanged (Y starts, A held unscrews). The tap / hold rule is now a pure module (`player/ventOpen.ts`) with unit
  tests, and e2e-traverse's keyboard vent checks run again (progress shows, letting go early stops it, no kick).
