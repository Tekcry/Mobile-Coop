# Co-op walk fixes: team takedown on a hostage, partner shot audio
kind: minor
- (coop-walk-fixes P6) Co-op: when either player holds a guard as a hostage, the other player beside them gets TEAM
  TAKEDOWN on him (host or joiner holding, either way); it knocks him out (a held direct press kills), ends the hold and
  counts as a dual takedown for both. Before, the joiner's offer on the host's hostage did nothing and the host had no
  offer on the joiner's.
- (coop-walk-fixes P7) Co-op: a partner's shot plays once per round (a single shot played twice) and with their own
  weapon's sound, suppressed when it was (the suppressed pistol sounded like an open pistol); its muzzle flash is small
  when suppressed. Protocol 37: the player state carries the rounds fired (`sc`).
