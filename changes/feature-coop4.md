# Sector Ops 4-player co-op
kind: minor

- Sector Ops co-op now takes up to 4 players, on both maps (Saltmarsh Park and the Warehouse). Solo, 2, 3 and 4 players
  all start from the lobby. Marlow Yard (the campaign) stays exactly 2 players and plays as before.
- The co-op wire changed (a new player slot on every lobby entry, per-player jammer lists, rounded Sector Ops snapshots).
  The train build bumps `PROTOCOL_VERSION` once for the job; an older build cannot join a newer host.
- Player slots (N0, N1): every player has a fixed slot 0-3 for the match. The host is slot 0 and a joiner takes the
  lowest free slot. Slots never move during a match and close their gaps once, at the start. Late joiners are placed at
  the checkpoint on their slot, or beside the host when the checkpoint cannot be walked to. A player who drops is
  held for 10 minutes and gets the same slot, colour and place back when they rejoin. A room with two or more held
  slots refuses a stranger with "Room is full". Spawns, respawns and revives are placed by slot.
- Bandwidth (N1): the host still sends one snapshot at 15 Hz to everyone. Sector Ops snapshots round their numbers to 1 mm,
  which keeps 4 players with 32 guards near 6 KB (about 2.1 Mbit/s of host upload for 3 clients) and the worst case under
  32 KB. Marlow Yard and the other modes send what they always did.
- Jammers (D1): each player has their own pistol jammer, with its own 5 s use and 5 s cooldown. Up to 4 jams run at once.
  Marlow Yard still sends and shows two.
- Team rules (SM): the syringe pool grows with the team, 1 extra per player beyond 2 (Normal 2, 3, 4 for 2, 3, 4
  players). Each alarm sends 1 extra reinforcement per player beyond 2, never past the 32-guard cap. A synced takedown is
  any two different players within the window. The section rating, marks and grants stay per team. One operator out still
  restarts the section for everyone.
- Team moves (TM): a player offering a move serves one partner at a time. A second player trying the same brace, rope,
  hang-down, throw or relay is denied with "Your partner is busy with someone else". Two pairs can run moves at the same time.
- Teammate colours (H1): the partner beacon is blue for slot 0, red for slot 1, amber for slot 2 and violet for slot 3.
  Minimap teammate dots use the same colours. Slots 0 and 1 look as before.
- Lobby (L1): the lobby shows one seat per player the mode takes (Sector Ops 4, Campaign 2). Start is blocked with "Too many
  players for this mode (2)" if a room with 3 players is switched to Campaign. A refused player sees "Room full" with the
  room's real cap. The host line now says to invite your teammates. `?players=2..4` (dev and tests) makes the same-device
  autostart room wait for that many players.
- Guards (DATA): each Sector Ops section can add up to 2 extra guards for teams of 3 or 4 - 16 in all over the 5 Saltmarsh
  Park sections and the 3 Warehouse sections. They come from the team-door and split routes that 4 players make too easy.
  A team of 1 or 2 faces the same guards as before.
- Tests (E2E): `e2e-sectorops` parts 7 and 8 run 4 pages of one browser. Part 7 (Saltmarsh Park) checks slots, beacons,
  spawns, light, the jam, the crate, a revive, the connector and a pair gate with 4 players. Part 8 (Warehouse) checks a
  drop and rejoin into the same slot, a late fourth player, two team moves at once and the busy-brace denial. `e2e-coop`
  gains a "lobby caps" block. `E2E_LOAD_MS` (default 240 s for 3 or more pages) sets the match load wait. They run alone on
  the laptop.
