# marlow-jammer - brief (marlow-bays slice J)

Job lead: Night Shift | Character Build (laptop). Branch `feature/marlow-jammer` in `C:/NightShift/Mobile-Coop-marlow-jammer`,
from master 4.35.0 (8577e69c). Parent job: marlow-bays (`docs/marlow-bays/BRIEF.md` on `origin/feature/marlow-bays`
d3ab0b75), slice J. Test runs for other job leads always come before this job (Orchestrator, 2026-10-21).

## The ask (Michael, 2026-10-21, verbatim from the marlow-bays list)
5. "bay 3 the camera view is inside the airlock once door opens, it needs to be in that bay area only and it should be
   impossible to pass without one player jamming in to walk past, then the second player jamming it for the first player
   to walk past. Should be more of a hallway."
7. "the jammer doesnt seem to work. when it does work, it should make a quiet buzzing/interference noise both players can
   hear, and the red grid should disappear as it cant see anymore. when releasing, there should be a 1.5 second delay
   where the camera comes back online. this cannot be interrupted by another jam until its back online. the camera
   should also stop moving and the camera light should flash during jamming. limit jammer to 5 second use, with a 5
   second cooldown."
8. "when jamming lights, the light should flicker then turn off. once jammer is released, the light should remain off
   for 4 seconds, then flicker back on"

Slice J on the laptop (Michael, ~17:50, "Yes"): Character Build builds it between test requests; own branch and PR;
logic e2e on the laptop; the bay 3 GPU look runs on the desktop before the merge.

Added (Michael, 2026-10-21, via the orchestrator; marlow-bays BRIEF c2421115): "Don't show the red lines painted on the
floor, that's the point of the red laser overlay to show the cameras view area." Bay 3's painted sweep-edge lines
(`docs/ct-prototype/CTCOURSE-SPEC.md` M2) go in the hallway rebuild, and the spec row says so.

Michael's answers (2026-10-22 ~04:10, through the orchestrator):
- M1: J2 approved (seen in the hallway = sent back to the start).
- M2: J3 approved (a player may join the partner's jam).
- M3: J4 NOT approved (no unjammable hallway lamp). Instead: the security camera sees in the dark - it has its own IR
  illuminator, so its detection ignores lamp light inside its range and cone (fits lasers showing in night vision).
  Lights matter for guards and the meter, not for cameras. Keep the regression test: with every bay 3 lamp out, a
  runner is still caught.

## Goal
Michael can replay bay 3 of Marlow Yard in co-op: a hallway the camera covers, passable only by a jam handoff, with a
jammer that visibly and audibly works. Prototype quality (G4): no polish beyond the list.

## Assumed decisions (from marlow-bays BRIEF; undo by telling the orchestrator)
- A3: Jammer limits (5 s use, 5 s cooldown, a 1.5 s camera reboot that cannot be re-jammed) apply to every jam target;
  the light timing (flicker off, 4 s off after release, flicker back on) applies to lights.
- A4: The buzz is a quiet WebAudio synth voice at the jammed device, heard by both players through the normal
  positional mix.
- A5: Bay 3 becomes a narrow hallway the camera covers end to end; the camera's view stays inside the bay (no view into
  the airlock); one jam cannot cover both players: player A jams while B passes, then B jams for A (the 5 s limit and
  the 1.5 s reboot make it a real handoff).
- J1 (this job): the 5 s use / 5 s cooldown replace the old 20 s charge model (drain / refill / minStart) for every
  player; the HUD charge readout shows use left and cooldown. Undo: restore the charge constants in `src/game/jammer.ts`.
- J2 (checker fix 1): bay 3 is a hard rule (G125 allows one per mission): a player the camera detects in the hallway is
  sent back to the entry lobby with a radio line, and only players who reached the far lobby unseen count for the gate.
  Makes item 5's "impossible to pass without jamming" literal. Undo: back to alarm-only (the gate counts anyone in the
  far lobby).
- J3: player B may join A's jam on the same camera, so it stays jammed past A's 5 s with no reboot between (a valid
  handoff). Undo: block a second jammer on a target that is already jammed.
- J4 (fix round 2): the bay 3 hallway lamp at bay x 6 (`S3_HARD_LAMP_X`) cannot be jammed, EMPed or shot out. With all
  four station 3 lamps out the hallway fell to 0.30 light and a runner was never caught (meter 0.63 at the far lobby),
  so the camera could be beaten without a jam. Undo: make the lamp jammable again and find another way to keep the
  hallway lit enough (or make the station 3 camera independent of light, which breaks light parity).

## Limits
- CLAUDE.md hard rules. Gameplay never reads graphics state; light parity holds (the meter and guards see a jammed
  light off, including during the 4 s off and the flicker's off frames as the sim defines them).
- Co-op synced: the jam state crosses the wire, `PROTOCOL_VERSION` goes past 25 (26); if the cloud B + M PR
  (`feature/marlow-bays`) also bumps it, whichever merges second takes the next number.
- Do not touch the animation tracks' files: `src/ui/tuner*`, `src/ui/studio*`, `src/anim/*`, `scripts/anim-keys/*`,
  `scripts/anim-tune-bake.mjs`, `src/player/*`, the rig / skin / clips.
- Overlap risk: the cloud slice B (item 6) removes the camera's flashing surround and the bay 3 floor red lines
  (`sweepLines` in `src/world/maps/ctcourse.ts`). This job rebuilds bay 3, so it may remove those lines too; the second
  PR to merge resolves the conflict.
- Tests: `npm run check`, logic e2e `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-sectorops` on the laptop (port
  4191); the full e2e before the PR; the bay 3 GPU look on the desktop (ask the orchestrator).
- One implementer, one fresh checker, one fix round.
