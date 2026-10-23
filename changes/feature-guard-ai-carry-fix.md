# Guard carry: calm guards drawn (regression check)
kind: patch
- New e2e suite `e2e-guard-carry` (full run; `src/ai`, `src/player`, `src/world` quick picks): on Warehouse Infiltration
  at High (no mission, the failing calm sheet's setup: one guard at a time under the strip lamp at 0, -3, the camera 2 m
  in front) a grunt, then an officer, stand calm 16.5 s (S21 holstered carry), then draw; the body effect's light
  defines are logged; each merged smooth body must
  be among the camera's active meshes with its material ready, its effect GPU skinned as the mesh is (never Babylon's
  CPU-skinning fallback served to a GPU-skinned body, which drew 4.77.0's calm guards as a floating gun), and no effect
  may fail to compile (the failure's error line is printed: `Effect.LogShaderCodeOnCompilationError` off). Train 29's
  lamp plugin changes (#232) already make the body's effect compile; this holds it. Run with `E2E_GPU=1`.
