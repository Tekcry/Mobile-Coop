# B5 check (e46a9746): hang-down + station 5 roof hatch (protocol 20)

Read-only review (diff, grep, line ranges). No npm / vitest / e2e run.

## Verdict: PASS

## Blockers
None.

## What was checked (no defect found)
- Station 5 completable by two: leg-up + relay, plates, holder crouches on the striped square (z 1.8-2.55 gives a hit on the 1.0 m probe), hang point inside the 0.55 m hatch, panel reachable at depth > ~2.3, lever latches open (courseState `setOpen(g,true)`). A dropped player can press the panel from the floor, so nobody is stranded in the back room.
- Never-stranded paths: partner gone -> holder ends (runHold); holder gone / dead / not holding -> hanger drops after 1.5 s (runHang); hanger dead -> end(true) clears override + tumble; holder's Co-op / B always sends an end, and a lost reply frees them after 3 s. Both-down restart goes through death, which ends the move.
- Host validation: `hang` request needs the holder's brace + HANG_SUB, hanger within 1.6 m and 0.4 m level, claimed hang point within 1.6 m of the holder at their height. Depth is never sent by a client except the holder's MoveState `s`; the hanger clamps it to 1.0-2.5 and eases it (1.2 m/s). `hangEnd` only acts for a player in a pair.
- Co-op button: a hang offer wins only when crouched AND facing a drop (no floor within 2.2 m); crouched at a wall base or facing flat ground stays leg-up. Throw (standing) and relay (hanging) paths unchanged; a hang-offering holder is refused as a leg-up target ('notBraced').
- Hot paths: `hangPoint` uses reused vectors / `hp2`; no new closures or temp vectors in the step.

## Polish
1. `teamController.ts` hangPoint: floor NaN (no floor within 30 m, e.g. a map edge) still offers the hang; a drop then falls 3 m and releases into free fall. Require a floor (or a fence) before offering, or cap the hang-down offer when floorY is NaN.
2. Host only bounds the claimed hang point (does not re-raycast): a modified client could hang a partner through a wall within 1.6 m. Cheat-only.
3. `teamPairs` entries are not cleared when the pair ends by lost-holder drop, death or disconnect; they are overwritten on the next move and are harmless, but a later `hangEnd` from a stale pair sends a `tend` that clients ignore.
4. A holder whose partner dropped on a lost holder timeout stays frozen until they press Co-op / B (up to 3 s after pressing). Consider ending hangHold when the partner's mode is no longer boost + HANG_SUB.
5. Hatch alignment is strict (about +-0.27 m across the 0.55 m hatch); the striped square helps, but a wider probe would feel better.
