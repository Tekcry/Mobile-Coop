# Kept shaders between maps
- Faster repeat map loads (behind the map-ready switch, off for now): the game keeps its compiled shaders when a
  match ends, so loading the next map in the same session does not compile them again. The kept shaders are cut
  loose from the old match, so it is still freed in full, and a graphics driver reset drops them.
