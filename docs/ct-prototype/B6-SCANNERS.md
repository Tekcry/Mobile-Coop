# B6 - paired scanners (2026-10-19)

## Built
- **Paired retinal scanners at station 6 (CT 1.8 two-key action, G178).** Scanners A (south fence) and B (north fence), 13.2 m apart. Each player presses A / E at their own panel to start a hack; the hack runs 2 s while they stay at the panel (within 2 m). A finished hack is **ready** and waits. Both ready within the forgiving **1.5 s** window: both **done**, the course flag `s6-sync` is set and the door opens (station 6's gate is now a `flag` gate; the old 1.0 s `pair` gate is gone from this map, the `pair` gate kind is unchanged for other maps).
- **One player cannot do both.** A player already on one panel is refused at the other ("You are already on the other scanner"); leaving a hacking panel aborts it; the distance plus the 2 s hack exceed the window. A busy panel refuses the partner. The dev solo flag (`?course=solo`) lets one ready panel open it.
- **Failure (Michael's pick: health hit, CT).** A hack aborted early (walked off, went down) or the window running out resets both panels and costs the failing player 10 HP (never below 1 HP) plus a LANTERN radio line. Never ends the run; retry at once. Who pays: the player whose hack was late (still hacking when the window closed) or who walked off; a lone hack with nobody on the other panel costs the lone hacker.
- **Panel state on both pages.** A glow on each panel: grey idle, amber hacking, cyan ready (waiting for the partner), green done. A small **ready light** above each panel turns green when both players stand at their panels (the cue to count down and start together); it goes dark while A is hacking and stays green once open. Radio on the first start: "Scanner A hacking. Partner: start yours now, both must finish within 1.5 s."
- **Host-authoritative.** The client's A / E goes through the existing `use` message (host checks: alive, the item in reach, enabled); then `CtDevices.scanPress` checks the player stands at THAT panel and may take it. The host steps the pair (hack clocks, presence, window, failure, damage) and sends it as `sc` in the `course` message's `sec` field; the client mirrors phases, presence and progress and draws the same glows. A bay restart that clears the flag re-arms the scanners.

## Numbers (G10 starting values, `SCANNER` in `src/game/scanners.ts`)
Hack 2.0 s, sync window 1.5 s (never scaled by difficulty, G131), cost 10 HP, floor 1 HP, reach 2.0 m (horizontal, feet within 1.5 m of the floor). Panels at bay 6 x +5, z 0.4 and 13.6.

## Wire change (protocol 20 -> 21)
New optional `sc` field in the `course` message's `sec` object: `[phase A, phase B, occupied bits, progress A, progress B (tenths of s)]`, clamped in `protocol.ts`. `PROTOCOL_VERSION` 21; the version assertions in `tests/net.test.ts` / `tests/moveState.test.ts` say 21.

## Files
New: `src/game/scanners.ts` (pure: `scanStart`, `scanStep`, `scanReset`, `scanWindowLeft`, `scanDamage`, `scanPairReady`, `ScannerDef`), `tests/scanners.test.ts`. Edited: `src/game/ctDevices.ts` (scanner runtime, glows, host step, `scanPress`, wire / apply, `debug().scan`), `src/game/modes/courseMode.ts` (scanner devices, press routing), `src/world/mapDef.ts` (`scanners`), `src/world/maps/ctcourse.ts` (`S6_FLAG`, `S6_SCANNERS`, flag gate, panel / radio text), `src/net/protocol.ts` (version 21, `sc` parse), `scripts/e2e-ctcourse.mjs` (station 6), `tests/net.test.ts`, `tests/moveState.test.ts`.
Not touched: `solveArm`, wrists, grips, `AIM_POCKET`, `weaponPivot`, animGraph `READY_HANDS`, `src/security/**`, `src/ui/screens/**`, `src/operators/**`.

## Stubs / not done
- No hack animation or on-screen progress bar / countdown number: the panel glows and the ready light are the only feedback (plus the radio line). Hack progress rides the wire (`debug().scan.t`) but is not drawn.
- No hold-to-hack: one press starts it, staying at the panel keeps it going. No cancel button (walking off is the cancel, and it costs health).
- No alarm elsewhere on a failed hack (CT's story missions did that; training is health only). No Living Key (captives on scanners).
- Only one scanner pair per map is run (`layout.scanners[0]`).

## Tests
Unit `tests/scanners.test.ts` (13): starting values; together opens; 1.4 s late still opens; ready waits with the window counting down; late start (2 s) fails and the late player pays; a lone hack fails and the lone hacker pays; walking off aborts and the walker pays; one player cannot take both panels (solo flag can); retry after a fail opens; damage 10 / floor 1; ready light; the map's scanners are on opposite fences, too far for one player, the flag gate and external flag. Protocol assertions 21. E2E `e2e-ctcourse` station 6: both at their panels light the ready light (both pages); the host hacks, the client page sees hacking then ready; the client starts late: the client loses 10 HP, the door stays shut, both panels reset on both pages; both start together: the door opens and the client page sees both done, no health cost.

## Results
`npm run check`: 0 lint errors (41 pre-existing warnings), 151 test files / 1692 tests pass (1 skipped), build ok. E2E on port 4193, one at a time: smoke ok (18 s); e2e-ctcourse ok (580 s; station 6: late client hack failed "1:late", 70 -> 60 HP, door shut, both reset on both pages; synced hacks opened the door, no cost).

## Try it
`https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course` in two tabs (the first hosts). Get through stations 1-5. At station 6 one player goes to scanner A on the south fence, the other to scanner B on the north fence; when both small lights above the panels are green, count down and both press A / E, then stay put: the panels go amber, then cyan, then green and the door opens. Try it out of sync: one presses, waits until their panel is cyan, then the other presses: both reset, the late player loses 10 health and LANTERN says so. Walk off while amber: the same, the walker pays.
