# Guard carry: calm guards drawn (stuck body shader recovered)
kind: patch
- New e2e suite `e2e-guard-carry` (full run; `src/ai`, `src/player`, `src/world` quick picks): on Warehouse Infiltration
  at High (no mission, the failing calm sheet's setup: one guard at a time under the strip lamp at 0, -3, the camera 2 m
  in front) a grunt, then an officer, stand calm 16.5 s (S21 holstered carry), then draw; the body effect's light
  defines are logged; each merged smooth body must
  be among the camera's active meshes with its material ready, its effect GPU skinned as the mesh is (never Babylon's
  CPU-skinning fallback served to a GPU-skinned body, which drew 4.77.0's calm guards as a floating gun), and no effect
  may fail to compile (the failure's error line is printed: `Effect.LogShaderCodeOnCompilationError` off). Train 29's
  lamp plugin changes (#232) already make the body's effect compile; this holds it. Run with `E2E_GPU=1`.
- Fix: guards no longer go invisible after a long stall while their body shader compiles. On the laptop GPU a merged
  smooth body's PBR effect could never finish compiling (Babylon's parallel-compile poll then gives up after ~2 min:
  "Operation timed out after maximum retries. - Effect: pbr"); the material kept that effect, so the guard showed only
  his weapons. `src/player/bodyEffectRecovery.ts` (run once per render for each body mesh, no allocation) drops such an
  effect from Babylon's caches and every sub-mesh holding it and compiles it afresh: at once when it timed out, failed
  for good or lost its program, after 8 s / 30 frames when it simply never finishes; at most 3 times per shader
  variant, each with a console warning ("smooth body ...: body shader ..., recompiling"). `e2e-guard-carry` now
  replays the failing sheet first: the 16.5 s calm stepped in one block with no frame rendered, then the body must be
  ready and drawn within 30 s of rendering; the 1 s-step pass follows.
