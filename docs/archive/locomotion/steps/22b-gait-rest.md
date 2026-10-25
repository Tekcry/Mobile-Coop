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

## Carried from the step 22 check (desktop, 2026-10-16)
- flat-stand1 60 vs 120 Hz parityFeet 15.3 cm (the final foot spot differs between rates at gear 1).
- drop09 landing float 29.5 / 30.7 cm (baseline 19.7 / 20.9) with pelvisJump 18.1; drop24 footFloatL 2.8 / 2.2; slope35-stand6@120 pelvisJump 6.26; stairs-stand6@120 footSlideR 1.38; turn180@120 footSlideR 2.03 / selfShanks 2.53 / jointRate 60.7 / 64 (baseline 53.9); flat-crouch3-aim balance 14.1 cm (needs a pelvis weight shift over the stance foot during idle steps, A89).
- Remotes get no quickStop, so closeStep and the rest pin never run on remote copies (characterRig.ts ~:1200): remote stop / idle balance and lowerBody rows (remote stairs / ramp-stand3 balance 10.1 / 16.7).
- motion.ts ~:343: the 0.1 m/s rest snap is a one-frame 6-12 m/s2 acceleration into the lean spring (aimed rootOvershoot 0.50 -> 0.61, 0.76 -> 0.92).
- animGraph.ts ~:1190: the fwdNode doc comment sits above the new LEAN_* constants: move it back.
- e2e-move "body faces the travel direction" reads up to 0.12 rad under load (turn inertia): measure after convergence or allow 0.15.
- Audit method changes in step 22 to tell Michael with A88: weaponSettle timed from rest; lateral sway detrended per stride.
