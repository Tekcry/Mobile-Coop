# Selection wheel ring updated in place
kind: patch
- No behaviour change: the open selection wheel updates its slots (ammo, gadget counts) in place instead of rebuilding
  the ring every step (rebuilt only when its shape changes); a stale "time slows" comment corrected (G181).
