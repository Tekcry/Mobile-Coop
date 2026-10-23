# Before: sheets and quick audits (191c3565 + the aimcrouchstrafep scenario; 2026-10-23 14:36-14:47)
Desktop, `E2E_GPU=1`, port 4189, lane 2 lock (CPU 35-44 %), `npm run build` fresh. Scripts: C:/NightShift/afp-before.sh,
C:/NightShift/afp-remote.sh. Rerun the same commands for the after sheets.

## Sheets (`on-*` = `?mocap=1`, the default; `off-*` = `?mocap=0`)
`E2E_GPU=1 URL="http://127.0.0.1:4189/?mocap=<1|0>" node scripts/anim-sheet.mjs <out> <scenario> <frames> <interval> <view>`
| file | scenario frames interval view | Michael item |
| --- | --- | --- |
| on / off-walkturn | turn 12 0.1 side | P1 control (he says fine) |
| on / off-jog | jog 12 0.06 side (gear 4, ~2.9 m/s) | P1 |
| on / off-run, -run-back | run 12 0.05 side / back (gear 5, ~3.9 m/s) | P1 |
| on / off-sprint | sprint 12 0.05 side | P1 |
| on / off-crouchwalk | crouchwalk 12 0.08 side (gear 3) | P2 |
| on-crouchidle | crouchidle 8 1.0 side | P2 control (he says ok) |
| on-sneak | sneak 12 0.1 side (the gear-1 capture band) | P2 |
| on-crouchstrafe-rifle / -pistol | aimcrouchstrafe / aimcrouchstrafep 12 0.08 front | P4 |
| on-wallcrouchslide | wallcrouchslide 12 0.15 front (holstered; the drawn wall slide has no sheet scenario yet: AF0) | P4 |
What the sheets show: on-run-back plants the feet on / across the midline (0.10, 0.40, 0.45 s); on-sneak carries the
head well ahead of the feet with no hips back (the 43 deg capture trunk, P2); on-crouchstrafe-pistol starts in a kneel
(`K`, 0.00 s) and stands out of it on the first step. The pistol sheet's aim pose should be checked by AF0's numbers.

## Quick audits (`node scripts/anim-audit.mjs <url> --local --quick`; remote `--remote --quick`)
Tables: audit-{on,off,remote}-table.txt; fails: audit-*-fails.txt; `--compare` baselines: audit-*-baseline.json.
| row (60 Hz) | pelvisP2P ON / OFF cm | head ON / OFF | pelvisJump ON / OFF | fails ON / OFF |
| --- | --- | --- | --- | --- |
| flat-stand2 (1.36 m/s) | 4.87 / 1.94 | 5.12 / 2.06 | 2.80 / 2.33 | 10 / 4 |
| flat-stand4 (2.92) | 11.60 / 5.08 | 12.94 / 5.48 | 5.83 / 5.36 | 11 / 8 |
| flat-stand6 (3.88) | 8.38 / 16.14 | 10.00 / 16.89 | 7.28 / 8.36 | 12 / 10 |
| flat-crouch3 (1.65) | 2.19 / 2.19 | 2.18 / 2.18 | 2.82 / 2.82 | 4 / 4 |
Totals: local fails ON 87, OFF 68. ON fails by metric: selfThighs 11, footSink 17, pelvisP2P 8, readyElbow 10,
rootOvershoot 7, head travel / pitch / roll 6 each, jointRate 4, pelvisJump 2, grip 2, wrist 3, selfForearmL 1.
(crouch3 is the audit's stale crouch gear, 1.65 m/s; AF0 fixes anim-audit.mjs:478.)

Remote (host's copy of the client, clean `?net=local`, mocap ON both pages):
| row | pose cm | lowerBody cm | gaitPhase cycle | pops | pelvisJump cm | fails |
| --- | --- | --- | --- | --- | --- | --- |
| flat-stand4 | 25.90 | 53.69 | 0.23 | 13 | 9.85 | 14 |
| flat-crouch3 | 31.95 | 45.12 | 0.30 | 5 | 22.82 | 10 |
Bars (PLAN AF6): pose <= 10, lowerBody <= 10, gaitPhase < 0.1, pops 0. `E2E_NETSIM=typical` remote: the harness timed
out "waiting for everyone ready" twice (8 s, host at 28 fps); not a verdict, an AF0 / AF6 harness item.
