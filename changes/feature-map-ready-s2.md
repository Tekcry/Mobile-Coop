# Map ready gate
- Map ready gate (behind `?mapready=1`, off by default): the loading screen now stays up until the map is fully built
  and warmed - graphics settings applied first, then lights, the player's body and weapons, every shader (player and
  weapons first, then the level, then the nearest guards), the reflection probe and every lamp, plus five quiet frames.
  The game is frozen behind it and starts at the reveal: the letterbox, banners and objective play from then. The wait
  is capped at 20 seconds after the level is built (the live lamps are always waited for); past the cap play starts with
  what is ready and the feedback note records it. Test runs can set `E2E_PARAMS=mapready=1` to turn it on everywhere.
