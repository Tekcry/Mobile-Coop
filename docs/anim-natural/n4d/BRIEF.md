# anim-natural N4d - takedown blow and grab kill land on the gameplay moment - brief

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-n4d` (C:/NightShift/Mobile-Coop-anim-n4d, from
feature/anim-n4c 384cd67c, which builds `strikeWarp`). Started 2026-10-22 ~21:10 on the orchestrator's word.

## The ask
Michael (M1, n4c, ~20:05, via the orchestrator): "Faster arm": keep the gameplay timing and speed up the animation so
its contact lands on the gameplay moment (built for the elbow strike in n4c). The orchestrator (~21:00): apply the same
principle to the lethal takedown blow (kill at approach + 0.7 s, visual contact 0.39 s into the blow) and the grab kill
(`GRAB.killTime` 0.5 s, visual contact 0.28 s). Gameplay timing stays; the animation's contact lands on the gameplay
moment. Logged as an assumed decision citing M1, with its undo.
Also in this slice (n4c checker polish 7): on a co-op client the host's accept rewinds the strike clock and the warp
magnifies it into a one-frame hitch at RTT 80-100 ms; the posed phase must not step back.

## Limits
Prototype grade (CLAUDE.md current goal). Wren only; guards unchanged. No wire change unless needed (then
PROTOCOL_VERSION). Keep `animGraph.ts` / `characterRig.ts` edits minimal (N2 and N4b also edit them).

## Test lanes (orchestrator 21:06)
Desktop GPU-only second lane: `C:/NightShift/heavy2.lock` (atomic noclobber create, guarded release), port 4192,
`E2E_GPU=1 E2E_JOBS=1`, start only while desktop CPU < 50%. `heavy.lock` stays for software runs and full checks.

## Assumed decisions (all citing M1)
- **A1** The kill lands at the end of each blow (lethal takedown approach + 0.7 s, grab kill `GRAB.killTime` 0.5 s,
  both unchanged); the arc is warped so its contact lands on the kill (`killWarp`, reusing `strikeWarp` per blow), and
  the follow-through and return run after the kill, pose only (`TakedownController.killTail`); the player is free at
  the same moment as before. Undo: drop the `killWarp` calls in `run` / `runGrab` / `moveState`, the `finish()` block
  and `killTail`, and the `remoteAvatar` block.
- **A2** A single linear warp segment before contact: the arc there runs at about 57% of its old pace (slower wind-up
  and drive). Polish option: a three-segment warp (hold the wind-up, keep the drive's pace).
- **A3** One frame early for the arm's lag (as n4c A8); nominal blow lengths (`TAKEDOWN_BLOW` 0.7 s + 0.308 s
  follow-through, `GRAB_KILL_BLOW` 0.5 s + 0.22 s) for every takedown kind: drop / inverted / below / window kinds land
  within a frame of their kill. Local and remote match (same constants).
- **A4** The co-op partner plays its own follow-through when the last blow phase it saw was >= 0.85 (`KILL_SEEN`); an
  abort after that shows a follow-through on the partner only.
- **A5** Strike accept (n4c polish 7): the pose clock keeps its place (`lead`) and catches up at half pace; the wire
  `ph` uses the pose clock, so neither side steps back; `t` still rewinds to the host's clock. Undo: `ph` back to
  `strikePhase(this.t)`, remove `lead`.

## Numbers (Wren rig, before -> after)
| | Kill (unchanged) | Arc contact | Hand furthest across |
| --- | --- | --- | --- |
| Lethal takedown | approach + 700 ms | 392 -> 683 ms into the blow | 433 -> 717 ms |
| Grab kill | 500 ms | 280 -> 483 ms | 300 -> 517 ms |
Accept hitch (strike, RTT 80 / 100 ms): posed arc stepped back 0.209 / 0.132 -> 0.

## Polish (not checked visually)
- After a takedown the gun is no longer stowed: its draw can overlap the 0.3 s follow-through (the right hand's arc
  over the drawing gun).
