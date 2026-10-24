# Saltmarsh Park section bake: live lamps first
kind: patch
- A lamp of the section you are in whose bake failed twice now bakes at once during play instead of waiting for every
  other lamp, so that spot is no longer dark for the rest of the background bake. Lamps elsewhere still wait for the
  workers to go idle, or bake as soon as their section goes live. A stuck second try now gives up after 20 s, so a
  silently dead worker holds the load about 85 s at worst instead of about 125 s.
