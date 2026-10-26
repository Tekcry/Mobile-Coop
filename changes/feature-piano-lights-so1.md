# Mains-off blackout (piano SO1)
kind: patch
- Lighting: `LightRegistry.mainsOff(x, y, z, over = 0.8)` cuts every electric light for good, nearest first over 0.8 s;
  torches and window lights stay; no switch, jam end, outage end or section restart turns one back on, and guards never
  walk to reset it. Dark: nothing calls it until the piano scene does.
