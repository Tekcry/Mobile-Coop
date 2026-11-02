# The automated run
kind: patch
- `npm run auto-run`: one quick hidden check of the playable game (`docs/RULES.md` rule 7), run on the laptop's graphics
  card before a game change merges. It builds the game, two players join through the co-op menus, Marlow Yard starts,
  each sees the other, the partner gives the host a leg-up onto the A1 wall, then at A2 a guard sees the partner, the
  station retries and the retry plays on. It saves screenshots of both players' views, checks that lights and shadow maps
  are on, records the frame rate in A1 and A2 and compares it with the last run. The report (`report.md`, ready for the
  pull request) and the screenshots go to `auto-run/` beside the checkout.
