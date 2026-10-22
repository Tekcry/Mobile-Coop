# mocap-sheets - STATE (stopped 2026-10-23 ~00:40)

Stopped on Michael's word (~00:10: "i dont need sheets for mocap"). Nothing runs; the job lead was Night Shift |
Menu Notes Build. The sheets Michael saw are on feature/mocap-sheets-real (04598e9a all rows on mocap-trial 82f43716;
ce76361a turns + start on CT Core's fix 44d7c2a7).

## Start / stop diff on the placeholder proof: the script, not the game (fixed, 918d7d14)
- The anim graph's free-running clocks also count the boot's real-time frames (`src/anim/animGraph.ts:669-672`,
  `breathPh` :792): `idleT` starts random and runs through the boot; `stillT`, `breathPh`, `breathW` grow with the
  boot length. Stop: the keyed idle's head scan / weight shift run on `idleT`. Start: on a slow boot she has stood
  still past 2 s at t = 0, so the procedural idle overlay (:879) and the breath (:1207) come in at a per-run phase.
- The script now zeroes `idleT`, `stillT`, `breathPh`, `breathW` before t = 0.
- Evidence (e90ddad3, desktop GPU, one run booting 4 s later): without the reset mocap=0 vs mocap=0 start 221 / 7645 px,
  stop 226 / 6993 px; with it mocap=0 vs mocap=1 start 86 / 9 px, stop 38 / 3 px (the cycle rows' level).
- No overlap with CT Core's fix round (start-slot arms, clip-feet hand-offs): capture only.

## On this branch
- 918d7d14 the clock reset + check options (`--sets=0,0`, `--dump`, `--boot-wait=a,b`, `--no-clock-reset`, a check that
  the port serves this worktree's dist/).
- 0cef46ce merge of mocap-trial 82f43716; 8dd14378 start / stop rerun on the real clips (windows 2.2 / 2.4 s to cover
  the 1.95 / 2.1 s clips; `notes.md` carried into index.md, `--index-only`). The other six rows here are still the
  e90ddad3 placeholder proof.

## Left (not needed now)
- Fold feature/mocap-sheets-real and this branch together, rerun all rows on the newest mocap-trial, per-row notes.
