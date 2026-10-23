# Co-op rejoin follow-ups
kind: patch
- (coop-rejoin-2) A co-op client whose page reloads while the host restarts the checkpoint (or sends it back from a
  camera hallway) is still placed at the checkpoint, not left at the level start; a client that drops a second time
  before reaching its placed spot is placed again on its next rejoin. No wire change.
