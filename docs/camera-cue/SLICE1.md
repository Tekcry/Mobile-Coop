# camera-cue slice 1 - the projected scan grid (implementer, 2026-10-20)

## Approach and why
Per camera one world-space "visibility surface" mesh, built from rays out of the lens on a fixed angular grid that spans
the whole sweep plus half a field each side and the vertical field. The rays are `Ballistics.hitDistance` against
`G.STATIC`: the same colliders as the detection ray in `securitySystem.ts`. The mesh is drawn with a small ShaderMaterial:
additive (ONEONE), depth-tested, no depth write, z-offset. Its fragment shader keeps only the part inside the current
yaw's frame (`cueEdge`, the GLSL mirror of `inFrame`) and draws a thin grid in the camera's own angles, so the lines
slide over the surfaces as it pans. Why not a surface-shader plugin: the level shader already uses 15 of WebGL's 16
texture units (quality.ts), so an occlusion sampler there would break the high presets. Why not a GPU depth pass per
camera: up to 12 extra scene renders, and depth is only an approximation of the detection ray. Rays cost CPU only, so
`?gfx=min` gets the same cue with occlusion (no fallback needed).

## Numbers (`CUE` in src/security/cameraCue.ts; field, range from `CAMERA`, never copied)
Samples every 1.5 deg (~0.26 m at 10 m, 0.47 m at 18 m); rays to range x 1.08, cut at the range in the shader. Neighbours
join when 1/d changes by at most 1.6 steps per 1 m (grazing floors stay joined, an 8 m crate in front of a 12 m wall
breaks). Grid cell 2.5 deg; line 0.16, fill 0.025 additive; electro x3; edge pulse 0.5 at 1.6 Hz while seen (eased
0.2 s); fade out 0.35 s, in 0.8 s. Rays: 512 per fixed step for the first bake (~8 steps per camera), then a 96 (min 32)
per step refresh of online cameras only, so doors and breakables (static colliders that move) catch up in ~0.7 s per camera.

## State sources (read, never computed)
On / off: `CameraUnit.mode` ('online' shows; jammed and section-dead are 'off', plus looped and destroyed: all fade).
Seen: the camera's own meters, any `sinceSeen === 0` (seen at the last think).

## Files
New: src/security/cameraCue.ts (pure), src/vfx/cameraCueView.ts (Babylon), tests/cameraCue.test.ts,
scripts/camera-cue-shots.mjs. Changed: src/game/ctDevices.ts (builds, updates (host fixedUpdate, client frame), disposes the
cue; `debug().cue`), scripts/e2e-ctcourse.mjs station 3 (the suite that owns the jammed camera), CHANGELOG.md.

## Tests and results
- `npx tsc --noEmit` clean; eslint on touched src/tests clean (scripts are lint-ignored; `node --check` ok).
- Vitest cameraCue (10) + securityCamera: 29 passed. Covers the span, `cueEdge` == `inFrame` on every sample at 4 sweep
  times, floor mesh fully joined, silhouettes not bridged, vertex lift, fades per mode, electro, pulse only when seen.
- e2e-ctcourse station 3 asserts on both pages: cue drawn when online, pulses while the camera sees (host), fades to 0
  when jammed, back to full when released.

## Skipped
`npm run check` and the e2e runs (smoke, e2e-stealth, e2e-ctcourse, e2e-sectorops): heavy.lock held by CT Core S4.
Shader compile is therefore untested in a browser. The shot script was not run (as asked).

## Mismatches and parity
Light parity is unchanged: the cue is a material, not a light, and nothing reads it (meter, bake, AI). Mismatches with
detection: 1.5 deg sampling (edges jag up to ~0.5 m at range); concave corners show a sample-sized bevel; on a co-op
client the cameras keep no meters, so the client never pulses (fades and sweep do match); electro's post turns the red
into its glow colour.

## What Michael should try
Marlow Yard station 3: watch the grid sweep over the floor, step into it in the light (edge throbs), jam the camera (it fades),
toggle electro. Then a Warehouse section camera, and `?gfx=min`.
