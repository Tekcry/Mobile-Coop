# Character shadow cues wired into the game (dark)
kind: patch
- (char-shadow-meter S3b-2, J16; dark behind `charShadowLight`) `GameState.shadowCues`: the players' shadow footprints
  for Guard AI's faint cue, built from the gameplay light bake on solo and host (null with the flag off and on a co-op
  client) and filled at 10 Hz right after the light meter; the call allocates nothing past the fill's own residual.
  New `tests/shadowCuesGame.test.ts`.
