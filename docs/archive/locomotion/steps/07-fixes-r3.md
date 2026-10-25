# Step 07 fix round 3 (last round; harness code only)

1. Deterministic idle phase: in tp() (anim-audit.mjs ~223-234), after the teleport loop, set rig.graph['idleT'] = 0 (and stillT if it resets cleanly). animGraph.ts ~313 seeds idleT = Math.random() * 4, which drives breathing and weapon sway in every state; the checker proved this removes all 30 run-to-run pass / fail flips.
2. Ground under each sole point: in common() / soleLowY, compare heel and toe each against a down-ray at that point's own x / z (record with the existing groundAt on the page: 2 extra columns per foot). Unit test: a horizontal foot on a 35 deg plane fails sink.

Verify: two full runs with zero pass / fail flips outside vault, mantle, drop09, drop24, turn180.
