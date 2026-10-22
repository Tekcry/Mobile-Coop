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
- Mocap locomotion (switch on): a spin on the spot that reverses, slows or walks off plays on smoothly; the clip's short
  jog / run stance eases in and out at every clip-feet edge (switch on mid-jog, a crouch or a draw); the switch turned
  off mid-stop no longer leaves a foot toe up; the switch turned on mid-walk, or a partner first seen walking, plays no
  start.
- Mocap locomotion (switch on): the crouched sneak plays the CMU crouch walk (136_09) as Wren's body over the usual
  steps; the faster crouch walk / run stay hand-keyed and are blended into. Crouched spins no longer hold the keyed pose.
- Mocap locomotion (switch on): crouching, standing up or drawing while walking no longer snaps a foot as the clip's feet
  hand the steps to the planner (ankle-toe 57 -> 17 deg a frame at worst, switch off 16.5).
- Mocap locomotion (switch on): a CMU sprint cycle (127_07) fades in over the run between 4.2 and 5.0 m/s.
- Mocap locomotion (switch on): a sudden stop from a jog, run or sprint eases the body down to the walk instead of
  dropping the pelvis in a frame (5 m/s one-frame stop 10.5 -> 2.1 cm, switch off 8.9).
- Mocap locomotion (switch on): speeding up or slowing down through the walk / run bands, also while turning, no longer
  pins a foot for a walk-length stance (the pelvis dropped up to 14 cm in a frame); a start after a short stand no longer
  skims a foot along unplanted.
- Mocap locomotion (switch on): fast flick turns while walking no longer lurch the hips or snap the feet as the turn
  ends; turning the switch on or off mid-move cross-fades the pose over 0.25 s instead of snapping it.
