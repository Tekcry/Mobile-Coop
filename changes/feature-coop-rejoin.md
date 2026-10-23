# Co-op rejoin at the checkpoint, two spawn slots
- (coop-rejoin, walk item 7) A co-op client that joins, rejoins or reconnects while a run is in progress is placed by
  the host: in Course mode (Marlow Yard) and Sector Ops at the current checkpoint on its own slot, or beside the host
  when that checkpoint cannot reach the host (no path, or a locked door on it); never back at the level start. A
  course client's match loads at the current bay, and the host sends the course / sector state, items, doors and lamps
  at once. Other modes: back where its slot was held, else beside the host. No wire change (the existing `restore`
  event and the `start` message's `bay`).
- (coop-rejoin, walk item 4) Two spawn slots per spawn area: the host takes slot 0, the partner slot 1, at the match
  start, a "Start at" bay, a checkpoint respawn and a set or section restart. Map data may place slot 1 (Marlow
  airlocks `spawns`, Sector Ops `start2` / `checkpoint2`); without it the partner gets a spot beside slot 0 that is clear
  of the level, on a floor and in an open line from it (`game/spawnSlots.ts`).
