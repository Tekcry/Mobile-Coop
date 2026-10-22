# Mocap locomotion: residual pops, review fixes, new clips
kind: minor
- Mocap locomotion (switch on): a stop no longer pops the swinging foot: the clip's step in the air eases its pitch, height
  and place onto the planner's (ankle-toe 40 -> 12-13.5 deg a frame, under master's own stop), and a landing mid-ease no
  longer leaves the toe up.
- Mocap locomotion (switch on): fast walking turns no longer sink the hips when the turn clip fades out: the trailing foot
  steps off as the other lands; a leg the joint-speed limit holds back no longer flicks the foot round with it (also the
  jog / run turn foot pops).
