# Step 08 fix round 3 (last round; harness code and docs only)

1. After place(), wait until the host's copy has settled before __ar.begin(): copy speed < 0.05 and head, wrists and ankles still within 1 cm for 0.3 s (e2e-netmove's rule), timeout ~3 s with a warning; replace the fixed 800 ms wait. Then regenerate the baseline (two runs, --band), rewrite AUDIT.md section 4 finding 3 (the copy needs > 1.2 s to recover from a placement teleport, whole body, at 60 and 120 Hz; cause is placement, not the pump) and update the poseError numbers (AUDIT.md ~248).
2. Lag fit with fewer than 20 moving frames: fall back to INTERP_DELAY (0.1 s) instead of keeping the first tied shift (~:931).
3. settledB: use the 0.3 s still window (e2e-netmove.mjs ~27-34), matching the comment.
4. AUDIT.md section 4: add the braceboost finding (the copy's brace pose holds a constant 31 cm head / 36 cm wrist offset from the owner's: brace stand-in clip, N01).
Verify: one --compare run against the new baseline prints no regression (rerun rule for remote), local deterministic.
