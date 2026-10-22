# Baked lamps: a material added in the frame another is disposed gets the lamp plugin
kind: patch
- Fix (backlog 30): `BakedLamps` now also attaches the baked-lamp plugin on the frame after the scene's new-material
  event, not only when `scene.materials.length` changes, so a material made in the same frame another is disposed
  is lit by the baked lamps (light parity). The observer is removed on dispose. Test: `tests/lampPluginGap.test.ts`.
