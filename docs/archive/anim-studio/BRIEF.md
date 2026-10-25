# anim-studio - brief

Job lead: "Night Shift | Course Ready Build" (desktop), from the orchestrator 2026-10-21. Branch `feature/anim-studio`
cut from feature/tuner-camera 2287d5b7 (PR #65); master merged in after #65 lands. Folder
`C:/NightShift/Mobile-Coop-anim-studio`. PR 1 of 2 to master (minor).

## The ask
Michael (2026-10-21, via the orchestrator): "I want freedom to manipulate the body/animation as needed ... Possibly
even a basic stage similar to the old main menu that allows me to make all the adjustments on the spot using
controller or k&m".

PR 1 (this one):
- A) Stage: a dev entry in the main menu and Pause opens a plain stage like the old menu void (floor grid, neutral key
  / rim lights, Wren on a turntable, an optional guard for holds), the tuner panel docked, every control on pad and K&M.
- B) Loop player: pick any clip or state (idle, walk, jog, run, the crouch set, sneak, low ready, aim glide fwd /
  strafe / back, the wall set, holds, traversal clips) and play it continuously in place or on a small circle; speed
  0.1-2x, pause, scrub, step frame, mirror, root motion on / off.
- C) Viewing aids: free view (orbit / fly, from #65), skeleton overlay, foot-contact markers and foot trails, onion
  skin (ghost of the previous / next key), the F3 anti-crab readout, front / side / top camera snaps.
- D) Snapshots: undo / redo for every tuner change, A/B compare of two settings, presets saved by name. Copy state to
  state: not wanted (Michael).

PR 2 (later): two-character co-op moves (both operators synced, role A / B sections, contact offsets, the guard for
holds) and a traversal prop rig at the level-design Section 12 sizes, tuned per move. Then the bake script.

## Limits
Defaults identity; gameplay never reads studio-only state; the studio is a dev aid reachable in any build. Uses the
section registry (`docs/anim-tuner/STATE.md`). Prototype loop: one Opus implementer, one Opus check, one fix round.
