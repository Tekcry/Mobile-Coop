# Stealth pays: client intel
kind: minor
- Co-op: the client can interrogate any guard the host says still has intel (revived guards, after a rejoin, and
  Sector Ops guards once their slots carry intel), and a guard the host interrogated no longer offers INTERROGATE on the client. Wire change: an
  optional `EnemyState.in` flag (absent for guards without intel).
