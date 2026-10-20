# Security camera vision cue - state

## Now (2026-10-20 23:30)
Slice 1 built, 0d6310f4 (SLICE1.md): per camera a mesh from `Ballistics.hitDistance` rays against `G.STATIC` (the
detection ray's colliders) over the whole sweep; additive depth-tested shader shows only the current yaw (sweeps); field
and range from `CAMERA`; fade from `CameraUnit.mode`; pulse from the camera's own `sinceSeen`. Same cue on `?gfx=min`.
tsc, lint, 29 vitest pass; e2e-ctcourse station 3 asserts the cue on / pulse / jam fade / re-show. Shader never compiled
yet. Laptop check + smoke, e2e-stealth, e2e-ctcourse, e2e-sectorops on 0d6310f4 requested via the orchestrator. GPU
shots (high, min) queue in the combined script with wheel-ui (see wheel-ui STATE).
Open: the co-op client never pulses (client cameras keep no meters); the orchestrator wants it derived client-side from
the camera's synced state if possible, else listed open. Electro's post shows the cue in its glow colour, not red; up
to about 0.5 m edge jag at range; about 96 rays per step refresh online cameras.

## Next
1. Laptop result; GPU shots; a fresh Opus checker (diff + shots); the one fix round includes the co-op client pulse.
2. PR to master (minor); message the orchestrator; shots to Michael.

## Open

## Polish list (non-blocking)

## Done
- 2026-10-20: slice 1 built (0d6310f4).
- 2026-10-20: worktree, BRIEF, STATE.

## Resume prompt
```
Night Shift | camera-cue: RESUME. Folder C:/NightShift/Mobile-Coop-camera-cue, branch feature/camera-cue (git pull
--ff-only; branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then
docs/camera-cue/BRIEF.md and STATE.md, and continue from "Now" / "Next" with docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort; lean tokens.
```
