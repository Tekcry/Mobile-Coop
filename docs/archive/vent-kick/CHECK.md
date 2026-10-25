# vent-kick (T1) - check (fresh checker, ef3ee531)

2026-10-22 ~21:25, written by the job lead from the checker's hand-back. Verdict: PASS (no blocker). Scratch:
C:/NightShift/scratch/vk-check/ (harness on git archive copies of 00d7a653 and ef3ee531: the real AttachController and
InputState in the app's loop order, random 1-4 step frames, 50 seeds per case).

## Reproduced
- Keyboard, Space held, E after a gap: 50 ms unscrew 50 / 50 both; 75 / 100 / 125 / 150 ms old kick 39 / 47 / 50 / 50,
  new unscrew 50 / 50 each. E released at 1.0 s: stop, no kick, 50 / 50. Space released before E = a tap: still kicks.
- Pad path bit-identical on ef3ee531: 855 traces (Y / A timings, early releases, pad + keyboard both connected, scripted
  `tap('jump')`), 0 differences in progress (6 decimals) and outcome.
- Side effects: `startHeld` is read only in `ventStep` (a vent exists only after a jump press at a closed grate); no
  other traversal affected. KICK_TAP 0.3 s = INTERACT_HOLD. Taps 0.05-0.32 s kick 50 / 50 (on release, <= 0.267 s for a
  0.2 s tap); 0.36 s 39 stop / 11 kick; 0.5 s stop; held unscrews at ~1.5 s.
- No allocation (`ventStep` returns literals; `downFrom` is a Set.has). e2e-traverse asserts fail loudly; removing #22's
  guard is safe. No wire change. ventOpen 8 / 8 (3x); input, attachGripsG4, moveState, holdToggle, handHold 60 / 60; tsc,
  eslint clean.

## Should-fix (fix round, with M1)
1. Jump bound to a mouse button uses source 'kbmm', so `downFrom('jump', KBM_SOURCE)` is false and the old rule applies
   (mouse jump then E at 100 ms kicks 3 / 3). M1 (`inp.down('jump')` for every held source) covers it.
2. The e2e keyboard block presses Space and E back to back (often the same frame, which also unscrewed on the old code):
   add a 2-3 frame gap before E so the assert catches a regression.
3. Log "Space held alone unscrews" as an assumed decision in BRIEF.

## Polish
- Space tapped and released before E still kicks; the "Kick vent" prompt does not teach "keep Space down into E".
- The keyboard kick lands on release (up to ~0.27 s) instead of a fixed 0.1 s.
