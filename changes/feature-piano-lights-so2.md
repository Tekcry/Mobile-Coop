# Thornbeck Mill pre-built lamp bake (piano SO2)
kind: patch
- Lighting: the build's lamp prebake takes a list of maps (`SHIPPED_BAKE_MAPS`: Saltmarsh Park and Thornbeck Mill), one
  cache folder and manifest per map, the same caps and prune; the game reads `bakes/<map>.json` for each (the mill ships
  one file, it has no section split). The campus bake is unchanged (same key, same files).
- Tests: Thornbeck Mill after the EMP: every baked lamp reads off in the picture, the light meter / guard sight and the
  co-op client, under 1 lux at meter height everywhere.
