# Mocap locomotion: residual pops, review fixes, new clips
kind: minor
- Mocap locomotion (switch on): a stop no longer pops the swinging foot: the clip's step in the air eases its pitch, height
  and place onto the planner's (ankle-toe 40 -> 12-13.5 deg a frame, under master's own stop), and a landing mid-ease no
  longer leaves the toe up.
