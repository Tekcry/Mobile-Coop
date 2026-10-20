# Security camera vision cue (camera-cue) - brief

Job lead: "Night Shift | Menu Notes Build" (desktop), assigned by the orchestrator 2026-10-20 ~22:00, queued after the
wheel-ui PR. Branch `feature/camera-cue` from master b125599e, folder `C:/NightShift/Mobile-Coop-camera-cue`. One slice,
one PR to master (minor); the orchestrator sets the version and merges.

## The ask
Michael 2026-10-20 (verbatim): "i also want to a visible cue of where a cameras vision is but im not sure what it would
look like - a red laser grid that is projected onto the surfaces its monitoring possibly". He chose "Always, faint"
(native multiple choice, through the orchestrator). This is Michael's decision, not CT (G1 exception).

## Goal
- A faint red scan-grid footprint on the floor and walls each security camera currently sees, sweeping with its pan.
- Always visible faintly; stronger in electro vision; the grid edge pulses while the player is inside it; it fades when
  the camera is jammed or off.
- It matches the camera's actual perception volume: the same FOV, range and occlusion source as the camera's detection.

## Limits
- Drawn as a decal / projected material on surfaces (depth-tested), never a real light: light parity (what the player
  sees, the light meter and guard perception) does not change. Gameplay never reads it.
- No hot-path allocation; every graphics preset including `?gfx=min` (cheap fallback allowed).
- Checks: `npm run check`, e2e-stealth, e2e-ctcourse, e2e-sectorops (laptop via the orchestrator when the desktop lock
  is busy); GPU shots in Marlow Yard and the Warehouse when the orchestrator gives a desktop window (movement first).
- Prototype effort (CLAUDE.md "Current goal").

## Michael's answers
- M1 "Always, faint" (2026-10-20, via the orchestrator): the cue is always shown, faintly.

## Assumed decisions (undo in brackets)
