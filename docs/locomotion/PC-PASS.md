# PC pass (Michael's PC, E2E_GPU=1)

Everything here is pending a hardware-GPU run. Cloud sessions never claim these results. Final ordered checklist is
built at the end of the run (BRIEF section 7.3). Items are added as steps land.

| # | Item | Command | Pass limit | Added by step |
| --- | --- | --- | --- | --- |
| 1 | HUD tactical row (light, gear, goggles, exposure, noise) lays out with the Execute charge pips gone; no chevrons over guards while aiming | `E2E_GPU=1 node scripts/shot.mjs /tmp/hud01.png "?autostart=warehouse&mode=clear" 120` | Tactical row evenly spaced, no gap where the pips were; nothing drawn over guards | 01 |
| 2 | Phone touch layout (default and claw) with the Mark / Execute buttons removed; Ping keeps its chevron icon | `E2E_GPU=1 node scripts/e2e-touch.mjs` (watch the layout) plus a real phone pass (TESTING.md) | No empty slot or overlap; Ping icon renders in co-op | 01 |
