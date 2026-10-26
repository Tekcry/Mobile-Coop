# Guard models offline warm
kind: patch
- Offline: the main menu now puts every guard model file play uses (three builds, LOD0-2, and the riot shield) into the
  offline cache after Wren's, so the first offline match on a map whose guard builds were never loaded online draws the
  guard models instead of the old merged body. With `?guardmodels=0` nothing is fetched.
