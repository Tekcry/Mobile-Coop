# No minimap, compass or blips
kind: patch
- The minimap, the compass strip and every objective, pickup, partner and enemy dot are gone from every mode (G339,
  G135): Sector Ops, Marlow Yard, free roam and co-op. The Marlow Yard drill pointer, world pings and the partner's
  goggle colour stay. The context menu moves up to its CT spot now nothing sits above it.
- The legacy HQ "Minimap radar" upgrade is gone; saves move to version 10 (an old radar level is dropped, credits are
  not refunded).
- Tests: every suite that read the minimap or blips is flipped; Sector Ops, Marlow Yard, free roam and the co-op
  client now each check that no minimap or compass is on screen.
