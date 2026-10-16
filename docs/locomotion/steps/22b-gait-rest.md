# Step 22b - batch 1b remainder (M17, after Michael's play test)

Model: implementer opus (~100); checker opus. Depends on: 22 and Michael's play-test notes. Commit: "locomotion 22b: ...".

Items moved from step 22 (M17), plus whatever Michael's notes after the play test change:
1. Quick 180: MoveState `quick180` (A14), clip, host / remote, e2e-netmove case.
2. Exertion breathing after a sprint or climb, chest and shoulders only, no stamina (D5.5).
3. Stride warping so the feet always match the capsule (D5.4), including the new start / stop momentum.
4. Plant-and-pivot on sharp direction changes other than the full reversal (D5.4).
5. The aimed-backpedal audit row (A82: D2 one low / high).
6. Remote stairs foot slide (carried from step 21; baseline footSlideL 18.2 / footSink 23 on stairs-stand3).
7. The Inertializer swap trigger and the remote hip drop (carried from step 09, PC-PASS 51).
8. Guard gait check with the new speeds (guards share CharacterRig).
Checks as step 22 (read steps/22-b1-gait.md "Checks").
