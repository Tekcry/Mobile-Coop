# camera-cue slice 1 - check (fresh Opus checker, 2026-10-20, diff a57e4076..0d6310f4, shots = `?gfx=min` run)
**Verdict: FIX** (one round). The cue matches detection and the ask in normal view; electro hides it and the client never pulses.

Holds: same `CAMERA` hFov/vFov/range and the same `G.STATIC` ray from the same lens as `securitySystem.think`; `cueEdge` == `inFrame`
(tested). Never a light, nothing gameplay reads it (only `debug()`). Fades follow `mode`; pulse is `sinceSeen === 0` gated by
online. Min look: Yard "off" a faint red lattice on wall and floor, "Always, faint" met; "jammed" gone; Warehouse faint but visible. Tris OK.

## Fix (ranked)
1. **Electro shows nothing** (`src/vfx/cameraCueView.ts`, numbers in `src/security/cameraCue.ts`). The electro post maps luma to
   navy and only luma above `ELECTRO.glowFrom` 0.5 glows; red line x3 = luma ~0.13, so the cue disappears (both electro shots: bare
   navy). Change: in electro write a whiter line colour / strength so the line's luma lands in the glow band (like `deviceEmit`),
   fill kept under it. Done: electro shots show the grid as a clear light lattice, stronger than "off"; a unit test that the
   electro line luma x strength >= `ELECTRO.glowFrom` and the fill stays below.
2. **Co-op client pulse** (`src/game/ctDevices.ts` `frame`, `CameraCueView.update`). Derive it client-side, no wire change: the
   client has the yaw (synced clock), the mode, both bodies (own + remote from `MoveState`: head, crouched, speed), the static
   colliders and `lightAt`. Extract the host think's per-player test (`covers` + `G.STATIC` ray `> dist - 0.2` +
   `seenAt(cameraRate(...))`) into one pure helper used by `SecuritySystem.think` and by the client at `CAMERA.thinkHz`; pass the
   client's per-camera seen flags (preallocated `Uint8Array`) to `update` instead of `camSeesAny`. Done: e2e-ctcourse station 3
   asserts `seen && pulse > 0` on page B too. Fallback only if it drifts: a seen bitmask in `SecWire` + `PROTOCOL_VERSION` bump.
3. **Refresh rays not allocation-free** (small). `Ballistics.hitDistance` builds a `{membership, collideWith}` literal per call and
   Havok's `raycast` builds ~6 arrays + a BigInt per call: 96 rays/step = ~35k short-lived objects/s, and the client casts per
   render frame (more at high fps). Change: hoist the literal; client casts on a fixed-step accumulator; refresh 32/step on every
   preset (or only on a door / breakable change). Cost is otherwise OK (~0.2-0.5 ms/step est.). Done: same rays/s host and client.

## Polish
- Warehouse "inside" seen=false: not a cue bug. The cue reads the camera's own meters; seen needs a clear ray and light over
  `PERCEPTION.leak`. The script teleports 9 m along the yaw blind (the shot shows a solid block filling the frame inside 9 m; the
  yard is dark). Script: stand at min(9, centre-sample dist - 1) on a lit spot, log `lightAt`.
- Warehouse "jammed" shot still shows a grid: most likely another of its 7 cameras; log every cue's `a` and frame the chosen one.
- Brief says pulse "while the player is inside it"; built as "while the camera sees" (light + occlusion). Better feedback: log as an A entry.
- `CameraUnit.repair()` sets `sinceSeen = 0`: one think of false pulse after a Sector Ops restart (use 99 there).
- Door catch-up is ~0.45 s x online cameras (round robin; Warehouse ~3 s), not "~0.7 s". Yard "inside" hides the player behind the parapet.
- **High needs its own run**, with its own suffix (e.g. `slice1-high`): TAAU / bloom / tone mapping can shimmer or soften the
  1-px `fwidth` lines and change the additive look; min shots say nothing about it.
