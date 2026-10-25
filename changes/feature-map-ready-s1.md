# Map load measure
kind: patch
- Load timing record: each map load now records how long it takes to appear and what still builds in the 10 seconds
  after (shaders, lamps, pop-ins, frame times). A new measure script reads it for cold, cached, repeat and
  map-to-map loads. Measurement only: play is unchanged.
