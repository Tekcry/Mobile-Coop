# Saltmarsh Park section bake: stuck workers replaced
kind: patch
- A light-bake worker that stops answering is now shut down and replaced when its lamp gives up on it, so the rest of
  the bake keeps every worker instead of running one short. A silently dead worker holds the load about 90 s at worst
  (the earlier note said about 85 s; the 5 s check counts on both tries).
