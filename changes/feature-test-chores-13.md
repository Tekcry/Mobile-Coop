# Test chores 13
kind: patch
- Tests: `run-e2e` prints a timed-out suite's `KILLED` line in streamed mode (`--serial` / `--jobs=1`) too, as the
  parallel mode does (before, a streamed suite killed for its timeout ended silently).
- Tests: e2e-netmove gets a role-swapped team-move pass: the host braces and the client leads the leg-up onto the
  4.2 m lip; the same checks as the host-led leg-up from the other page, the host's brace on the client's copy and the
  client's hang on the host's copy both within 10 cm. Host waits are Node-side polls of the host clock.
