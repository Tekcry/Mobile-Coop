# Sector Ops guard render freeze
- Sector Ops guards whose body and shadows cannot reach the screen (outside the view, or behind walls, floors and
  closed doors; never glass or fences) skip the render: no mesh evaluation, skeleton or shadow draws for them. Render
  only; the brains, perception and light are untouched. `?guardfreeze=0` turns it off (sector-redesign perf).
