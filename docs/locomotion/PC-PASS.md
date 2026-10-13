# PC pass (Michael's PC, E2E_GPU=1)

Everything here is pending a hardware-GPU run. Cloud sessions never claim these results. Final ordered checklist is
built at the end of the run (BRIEF section 7.3). Items are added as steps land.

| # | Item | Command | Pass limit | Added by step |
| --- | --- | --- | --- | --- |
| 1 | HUD tactical row (light, gear, goggles, exposure, noise) lays out with the Execute charge pips gone; no chevrons over guards while aiming | `E2E_GPU=1 node scripts/shot.mjs /tmp/hud01.png "?autostart=warehouse&mode=clear" 120` | Tactical row evenly spaced, no gap where the pips were; nothing drawn over guards | 01 |
| 2 | Phone touch layout (default and claw) with the Mark / Execute buttons removed; Ping keeps its chevron icon | `E2E_GPU=1 node scripts/e2e-touch.mjs` (watch the layout) plus a real phone pass (TESTING.md) | No empty slot or overlap; Ping icon renders in co-op | 01 |
| 3 | Night vision look unchanged with sonar gone: green gain, bloom, flip housing, lens glow; no orange pulse ring or enemy marks | `E2E_GPU=1 node scripts/e2e-darkness.mjs` plus `E2E_GPU=1 node scripts/shot.mjs /tmp/nv02.png "?autostart=warehouse&mode=clear" 120` (press goggles) | Same image as before step 02 in a dark room; nothing orange drawn | 02 |
| 4 | HUD vitals with the shield bar gone: health bar alone, no gap above it; screen-edge damage vignette still reddens (no-hbar mode) | `E2E_GPU=1 node scripts/shot.mjs /tmp/hud03.png "?autostart=warehouse&mode=clear" 120` | Health bar sits flush, no empty bar slot; vignette at <35% hp | 03 |
| 5 | Results screen (normal and `?legacy=1`) without the style bars: grid, mission rating and rewards stack with no gap | `E2E_GPU=1 node scripts/e2e-missions.mjs` and `LEGACY=1 E2E_GPU=1 node scripts/e2e-missions.mjs` (watch the results) | Rating row directly above rewards; no empty block | 04 |
| 6 | World prompts and touch action button with snap cover gone: no "Take cover" / "Round corner" / "Move to cover" / "Flanked" badges; vault / climb / grab prompts still sit on the obstacle and the action button reads them | `E2E_GPU=1 node scripts/e2e-touch.mjs` and `E2E_GPU=1 node scripts/shot.mjs /tmp/wp05.png "?autostart=proving&mode=sandbox" 120` at the low crate | Only traversal / use prompts drawn; action button idle (dimmed) at a wall with nothing to vault | 05 |
| 7 | Weapon ready position at doorways and corners without the corner controller: no compressed-ready snap or check sweep at a doorway, no contextual lean at a wall end; the carry stays low-ready and does not clip the frame | `E2E_GPU=1 node scripts/e2e-clip.mjs` plus a walk through the Proving doorway (x=-20, z=8) on desktop and phone | No weapon through the door frame; no pose pop at the doorway plane | 05 |
