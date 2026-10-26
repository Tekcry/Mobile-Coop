# Missions and the co-op kit in co-op
kind: minor
- Co-op: the host's mission reaches the partner. The partner sees their own team's step on the objective line, the
  Field Terminal's mission list and the radio line when a rule is broken.
- Co-op: the pull-up and the roller shutter work between two players, with the host judging the catch.
- Campaign missions start only with exactly two players; with one the lobby says why. "Resume hosting" a campaign match
  waits for the partner, then starts on its own when they rejoin. Campaign missions give 2 revives at every difficulty.
- All of this is behind the `missions` and `coopKit` flags: off in the live game, on in /preview/. Nothing changes in
  the live game.
