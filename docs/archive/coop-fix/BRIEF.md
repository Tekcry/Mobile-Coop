# coop-fix - brief

Job lead: "Night Shift | Course Ready Build" (desktop), started by the orchestrator 2026-10-20. Branch
`feature/coop-fix`, folder `C:/NightShift/Mobile-Coop-coop-fix`, cut from master 4.13.0 (51af5ffb).

## The ask
Michael (2026-10-20 11:00, playtest of /preview/ with host and joiner in two windows on one PC, verbatim): "Note also
that the host character was invisible in coop for the person joining. There was a constant Connecting to host label on
the person joining even in game also."

## Goal
1. The joiner sees the host's character.
2. The "Connecting to host" label clears once the joiner is in the match.
3. e2e-coop asserts both (remote avatar visible in the joiner's scene; the label hidden in game).
Also: whether an unfocused or occluded joiner window (two windows, one PC) throttles the game (rAF) and whether that
matters.

## Limits
- CT Core owns `src/player`, `src/anim`, `src/ui`: minimal edits there only, and tell CT Core in one line.
- Test tier: slice (quick + ctcourse + coop + netmove; laptop via the orchestrator), full e2e on the PR head. PR to
  master (a patch).

## Michael's answers
(none yet)

## Assumed decisions
(none yet)
