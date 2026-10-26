# Kept model files and textures between maps
kind: patch
- Faster repeat map loads (behind the map-ready switch, off for now): the game keeps the model files and textures it
  has already read, so loading the next map in the same session does not read and decode them again. The old match is
  still freed in full.
