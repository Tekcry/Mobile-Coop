# Stealth pays: client intel
kind: minor
- Co-op: the client can interrogate any guard the host says still has intel (Sector Ops keypad intel, revived guards,
  after a rejoin), and a guard the host interrogated no longer offers INTERROGATE on the client. Wire change: an
  optional `EnemyState.in` flag (absent for guards without intel).
