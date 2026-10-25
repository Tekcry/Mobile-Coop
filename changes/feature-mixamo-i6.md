# Mixamo walking, jogging, starts, stops, turns and strafes on Wren (behind the Mixamo animation source)
kind: minor
- With the Mixamo animation source on (and "Mocap locomotion" on), Wren's walk, jog, start from standing, stop, turn on
  the spot, turns while walking and aimed strafes play Mixamo captures in place of the CMU ones. Speeds and timing are
  the game's own: the clips are fitted to the game's stride and to the CMU clips' seconds or turn angle.
- The Mixamo run and sprint stay off in matches for now (their knees cross at the game's run speed); they and the run
  stop, the left turn on the spot, the crouched side-steps and the backwards walk and run play in the Anim Studio.
- With the default source (CMU) nothing changes.
