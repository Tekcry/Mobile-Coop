# Unreleased - camera-range
kind: minor
- Cameras have less range (Michael 2026-10-23: "cameras need to have less range (they currently pick the player up
  well outside of the intended area)"), on every map, one engine change: a camera's fill rate now falls off over its
  own range (1 - (d / range)^2) instead of the guard's 25 m, so it is 0 at the zone's edge and nobody is picked up at
  full speed at the range cut; an aimed camera with no range of its own watches the floor patch centred on its aim
  (range 2 x aim); the default range is 12 m (was 18), 14 m at most.
- Marlow Yard station 3's camera reaches 13 m (was 18): it covers the hallway but no longer the entry lobby (before it
  picked a player up 2.6 m into the lobby); fill times in the hallway hold (still standing at bay x 6: 3.0 s, was 2.75).
- Sector Ops cameras keep their zones; their far 5-15 % no longer picks anyone up (reach 0.5-2 m shorter by stance).
  The Security Lab cameras reach their half of the room only (11.5 m, was 17.9).
- Measured per camera before and after: docs/camera-range/MEASURE.md (`tests/cameraReach.test.ts`). No wire change.
