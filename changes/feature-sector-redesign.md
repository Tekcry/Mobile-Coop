# Unreleased - sector-redesign
kind: minor
- Sector Ops guards are all armed: the Warehouse Ops runners are rifle guards, alarm reinforcements are rifle guards (no
  heavies), and the section data check rejects melee-only guards and heavies.
- Sector Ops dog rules: a section allows dogs only by its `dogs` count, and every dog names its handler; the palm strike
  never knocks out a dog (every mode).
- Sector Ops restart: a section restart also puts the lights (switched off, shot out, jammed) and the doors back as they
  were when the section began.
- Camera limit: 12 cameras live per Sector section (was 12 per map), at most 16 per map.
- Sector Ops co-op: the host's lights (switched circuits, shot lamps; jams as before) now match on the client's screen, light meter and guard reads; a client can shoot lamps out through the host (protocol 31, slice L).
- Sector Ops: new map campusOps (Saltmarsh Park), S1 greybox playable; not yet listed.
- Sector Ops engine: breaker and timed isolator boards (`MapLayout.boards`): cut light circuits until switched back or for a timed window (default 20 s), a guard comes to look, restart puts them back, co-op lamps follow (no map uses them yet).
