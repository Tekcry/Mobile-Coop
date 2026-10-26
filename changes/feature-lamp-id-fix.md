# Lamp ids past 255
kind: patch
- (F56) The lamp grid (which lamps reach each 2 m column) holds lamp ids in 16 bits: up to 65535 lamps a map, was 255.
  Saltmarsh Park with every section on the v2 layout (/preview/) has 260 lamps; the last 5 (the S5 service stair) were
  dark in the picture and the light meter. Every lamp is now lit in both, and the guards see it. A map past 65535
  lamps warns at load. The lamp bakes are unchanged (no rebake, no prebake key change); no wire or save change.
