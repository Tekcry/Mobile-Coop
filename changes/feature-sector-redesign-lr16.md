# One light model (LR16)
kind: minor
- One light model (Michael: "Disable returning to original lighting system, focus on only the one new system"): every
  lamp now runs the realistic (photometric) falloff and the shadow-accuracy fixes are always on. Settings > Gameplay >
  Lamp falloff and `?falloff=photo` are gone (an old saved choice is ignored); Character shadows Auto / On / Off stay.
  Co-op no longer sends the lamp falloff with a match start (wire change: `start.lf` and the rejoin record's `lf`
  removed; the protocol number is set at the merge).
- Docs name one light model (no Lamp falloff setting).
- Soft light on walls (walk 4.82 item 8, "blotchy, not smooth"): each lamp's bake grid now sits on the lamp itself, so a
  ceiling lamp no longer shadows its own wall from its mount (no dark toothed band above the fittings on any preset).
  Low and phones read depth and HDR colour at full precision and get Medium's surface normals.
- Realistic lamp levels on every map (LR16g / LR16-W): warehouseOps re-lit at night levels with beams and moved rows so
  routes sit in the rim and pockets stay dark; S3 stores cage gets a steel top; campus S4 cage post moved off its lamp.
- One-bounce fill reaches ceilings; no faint bounce glow behind thin walls or between crates and walls.
- Guard torches: the holder no longer shades his own beam; fences, ropes and bullet marks take torch light like the floor.
  Bright maps with no torches build no torch shadows.
- Lamp flicker / stutter drives the night-vision glare and reflections too.
- Performance: the lamp bake uses about a quarter of the memory per worker; per-frame lamp data upload 560 -> 27 KB on
  campusOps; character shadows skip lamps too faint to cast one.
- Fix: the bounce-light shader failed to compile on Windows D3D11 at Epic (lamps unlit, frame stalls); rewritten without
  local arrays.
