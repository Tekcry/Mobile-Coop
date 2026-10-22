# Mocap locomotion: residual pops, review fixes, new clips
kind: minor
- Mocap locomotion (switch on): a stop no longer pops the swinging foot: the clip's step in the air eases its pitch, height
  and place onto the planner's (ankle-toe 40 -> 12-13.5 deg a frame, under master's own stop), and a landing mid-ease no
  longer leaves the toe up.
- Mocap locomotion (switch on): fast walking turns no longer sink the hips when the turn clip fades out: the trailing foot
  steps off as the other lands; a leg the joint-speed limit holds back no longer flicks the foot round with it (also the
  jog / run turn foot pops).
- Mocap locomotion (switch on): fast jog and run turns no longer snap the swinging foot across the planted one: a swing
  lifted at a flight gait follows the body round (run 4.0 m/s x 4 rad/s ankle-toe 81 -> 14-22 deg, under the switch-off
  set's 57-59).
- Mocap locomotion (switch on): a start after a short stand no longer pops: the leftover idle step lands first, a late
  clip lift goes to the planner and a foot left behind steps off (worst bone step 37 -> 22 deg, no pelvis sink).
