# Mixamo on the co-op kit moves - A8 readings (mixamo-kit slice 1)
Owner: Marlow Build. Status: current (2026-10-26, Opus builder).

Plan: docs/mixamo-kit/PLAN.md on origin/feature/mixamo-kit. Code: src/anim/kitMixamo.ts (KIT_SHOT, KIT_TABLES),
src/anim/clips/team.ts (TeamPoser's kit shot), src/anim/animGraph.ts (`kitShot`, the hang skip), src/player/characterRig.ts
(`keyShot`). Measured headless on Wren's rig by tests/kitMixamo.test.ts (h): each kit scene (local and remote page) run
with the take on and with every kit row off (today's placeholder), 60 Hz.

## Readings (on vs placeholder)
Step: the largest joint step in a frame, the body less its root (cm). Pop: the largest velocity change in a frame (cm).
Wing: elbows outside the shoulders (m). Bow: knees outside the ankles (m).

| Scene | Step (joint) | Pop | Wing | Bow | Row |
| --- | --- | --- | --- | --- | --- |
| pull holder, local / remote (kneeling_pull_up) | 11.32 / 11.23 wristR (8.02 / 8.27) | 11.28 (6.98) | 0.212 (0.212) | 0.032 (0.028) | on |
| shutter holder, local / remote (lifting_heavy_object) | 11.79 wristR (6.74) | 19.36 (6.63) | 0.215 (0.215) | 0.028 (0.028) | on |
| pull partner, local / remote (pulling_up_to_a_ledge) | 28.11 wristL (12.30) | 38.17 (9.36) | 0.204 (0.208) | 0.334 (0.084) | OFF |
| crawler, local / remote (crawling_prone) | 13.07 toeL (5.10) | 15.98 (4.27) | 0.250 (0.249) | 0.131 (0.040) | OFF |

Rule (plan 4 (h), the I2 rule): a take is visibly broken when a joint jumps over 2x the placeholder's (floor 2 cm) or a
limb goes through the body; its row goes false with the reading as its comment (src/anim/mixamo.ts).
- pulling_up_to_a_ledge: off. The take's rise is dropped (the game's root path does it) but its pelvis turn is kept: the
  IK legs bow 0.33 m and a wrist steps 28 cm a frame in the scramble's last 0.15 s (the take fades out before the landing,
  KIT_SHOT.tail). Without the tail fade the landing cut was 56.6 cm.
- crawling_prone: off. The prone pelvis (0.89 m under rest) folds the IK legs under it: a toe steps 13.1 cm a frame
  mid-crawl, the knees bow 0.13 m. (Player Build asked to keep it on; the plan's rule turned it off: one row to flip.)
- Both still play whole in the Anim Studio (mocapSources.ts loops).

## Other readings
- A mid-move source flip (Mixamo -> Hand -> Mixamo through the shutter hold): step 12.08 cm, pop 18.16 cm over the
  0.1 s graph ease (KIT_SHOT.flip); placeholder x 2 = 13.5.
- Palms vs the bar: through the hold 0.00 cm (the bar 0.9 m up, 0.45 m out). Through the lift up to 54.7 cm: the bar
  starts at the floor and the holder's pelvis stays the game's brace crouch (the take's squat depth is dropped, A4), so
  the arms cannot reach it until the gap is near waist height. A Michael tuning item (with the catch reach below).
- Both screens: the shutter's 20 Hz wire gap and the 60 Hz local gap give the same take on / off every frame except up to
  2 frames at a phase edge (the wire is a step late); clip time within 0.194 s at the lift -> hold switch (one wire step
  is 0.129 s; elsewhere under it). The pull and the crawl: identical clip times.
- Allocation: the poser per phase, shot on vs rows off: shutter 31.9 (111.4), crawl 0 (0), catch 63.8 (47.9), haul 48.0
  (47.9), scramble 0 (0) B a frame (the placeholder's curve calls already box doubles); the graph 768.2 vs 736 B (two
  doubles into keyed.ts's sampler / mixer, as the stance shot's).

## Frame dump (segment boundaries)
Pelvis y and the mean wrist y from the shoulder (1.75 m body units) at the KIT_SHOT boundaries (s):
- kneeling_pull_up: 0 (-0.555, -0.542); catch0 0.45 (-0.557, -0.513); catch1 1.2 (-0.593, -0.155); 2.1 (-0.589, -0.109);
  2.7 (-0.603, -0.188); haul1 3.6 (-0.560, -0.272); end 4.483 (-0.557, -0.538). The catch raises the wrists 36 cm (the
  reach), the haul brings them down: boundaries kept.
- pulling_up_to_a_ledge: 0 (-0.006, 0.491); 1.4 (0.509, 0.177); scram0 1.6 (0.490, 0.177); 3.1 (1.794, -0.003); end
  3.817 (1.648, 0.010): the second rise starts after 1.6: kept.
- lifting_heavy_object: offer0 1.5 (-0.476, -0.273); lift0 2.3 (-0.530, -0.348); lift1 4.8 (-0.318, -0.426); hold1 6.6
  (-0.345, -0.390); drop1 7.6 (-0.479, -0.204); end 9.617 (-0.034, -0.530). The pelvis rises 21 cm over the lift, holds
  within 3 cm, sinks 13 cm over the drop: kept.
- crawling_prone: its stride 0.560 (1.75 m units) against KIT_SHOT.crawlCycle 0.54: kept (inside 15 %).
No boundary changed from the plan's table.
