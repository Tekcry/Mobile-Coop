# Bible proposals (not built, not in the bible)

Michael decides each. Suggested phase and a one-line reason.

| # | Proposal | Suggested phase | Reason |
| --- | --- | --- | --- |
| 1 | Guards undo player changes: relight lamps, check tripped breakers, close opened doors | 6 | Makes light and shadow (P1) a contested resource rather than a one-time fix, using the existing light registry and door state. |
| 2 | Room-clearing searches in pairs | 6 | Pairs read as trained security and create flanking windows the player must time, without new perception rules. |
| 3 | A player-facing last-known-position marker | 4 | Shows the player what the guards believe, which supports readable, fair AI (P5) and fits the mission HUD work. |
| 4 | A digital layer: network tap, camera loop, badge clone, remote unlock, footage wipe | 6 | The data-centre slice already has CCTV and keycards; these give a non-lethal, light-independent route (P3). |
| 5 | Subtitled eavesdropping on guard conversations | 4 | Delivers story and intel through text radio and subtitles only (no voice rule), using the mission trigger system. |
| 6 | Lockpicking and bypasses with a skill and noise cost | 6 | Ties traversal choices to the noise model (P2) and is already in the Phase 6 verb list in rough form. |
| 7 | Instant checkpoint retry in under 3 s | 4 | Failure must be cheap for stealth to be fun; checkpoints arrive in Phase 4. |
| 8 | An after-action route map | 4 | Shows the route, detections and lights used next to the stealth rating, rewarding authored approaches (P3). |
| 9 | Adaptive layered music | 2 | Music that tracks alert state supports sound (P2); it belongs with the audio work and its A/B test. |
- M12 (Michael, 2026-10-15): the dev bot partner (5.9 C20, Phase 3b row) was skipped in the locomotion run. Proposal: move C20's bot partner to Phase 5 (co-op), where the bible already lists "the bot partner extended", or drop it; solo co-op testing meanwhile uses two browser tabs with `?net=local`.
- Step 20b (D11) Phase 5 net tuning, measured under `E2E_NETSIM=typical`:
  - Interpolation delay: keep INTERP_DELAY 0.1 s on the host (coopHost.ts:42) and 0.12 s on the client (coopClient.ts:29) for now; re-measure with a 150 ms RTT / 40 ms jitter preset (add `poor`) before changing it, since typical showed no extra pops at 0.1 s.
  - ClockSync: the fast-pull / slow-release offset tracks the fastest packet, so jitter adds up to ~20 ms of lag; consider a percentile window if a worse preset shows stutter.
  - Holster on remotes: tighten the 10-370 ms receipt-to-stow spread (REVIEW-NOTES 20b) so a holster reads within one frame of receipt on every host frame rate.
  - Add a `poor` preset and run e2e-netmove / e2e-coop under it in the Phase 5 co-op work, with the probe's pop and clamp counts as the bar.
- M21 (Michael, 2026-10-17): the game is desktop only (pad, then keyboard and mouse). Proposal: rewrite the bible's platform pillar, Section 8 (performance: desktop budgets only), the touch / phone control and phone-look sections as history, and the First Playable / phase rows that name the iPhone target.
