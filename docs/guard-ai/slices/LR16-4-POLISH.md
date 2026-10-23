# LR16-4 polish list (checks A + B PASS, 2026-10-23 ~20:45; no refining until Michael's playtest)

1. Pre-existing S15: a second cut inside 60 s gets the S2 check, then the circuit is marked known
   (`src/ai/enemyManager.ts` ~:2062) and nobody relights it (S22 fixed the same for consoles). A reset walk that ends
   without the flip (walker KO'd in the lure ambush, alerted, or the 30 s give-up) also leaves it dark. Spec row 10.
2. `breakerHost.reset` / `isOff` pick the cut board nearest the world origin, not the walker's
   (`src/game/stealthSystems.ts` ~:529, ~:540): wrong board with two overlapping cut boards (no map data has one).
3. `switchOf` prefers a cut board over a nearer wall switch (`stealthSystems.ts` ~:493).
4. A multi-circuit board reports only its first live circuit at the cut; the 60 s tamper clock is per circuit; a
   duplicate walk to the same board is possible.
5. Pre-existing `follow` quirk: turning on one wall switch of a cut multi-circuit board leaves its other circuits dark.
6. A timed cut sends 1-2 guards with a ring check (S2), not S15's calm one-guard walk: deliberate (the lure); say so in
   ai.md. One ai.md line past the 120-column wrap.
7. No live map has an untimed breaker board, so the new path is unreachable in play until Sector Ops adds one.
