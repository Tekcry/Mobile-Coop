# Diagnostics log: one click to copy what happened on this device
kind: minor
- Every device now keeps a diagnostics log of its last 5 sessions (about 1 MB at most): errors and warnings, the
  device and graphics, menus opened, settings changed, each match (loading, map ready, mission result, player down /
  up, checkpoint restarts), a performance sample every 10 s in a match (frame rate, 1% low, worst frame), and in co-op
  every connection attempt, the connection readout, drops and rejoins and a link line every 10 s (direct or relay,
  round trip, data rates). It keeps no IP addresses, no names and never the relay login.
- Feedback > Diagnostics log: Copy log copies it as text, summary first, ready to paste to Claude; Save as file saves
  it as a .txt when copying is blocked; Clear log empties it (with a confirm).
- The pause menu has a Feedback row that opens the same Feedback screen, so the log can be copied mid-match on both
  the host and the joiner.
