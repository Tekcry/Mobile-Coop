# Marlow and Sector Ops small fixes
kind: patch
- Sector Ops: a late joiner or reloaded rejoiner now lists every rated section in its results, not only the last. The
  `sector` message carries an optional `rh` (every section's marks and synced takedowns, as the course message's) inside
  protocol 42; the client rebuilds the results lines from it (no card, no top-up, no grant).
- Co-op client: your own round off a bulletproof camera (Sector Ops, Marlow Yard) now shows the ricochet sparks and
  plays the impact sound on your screen, as it does on the host's (local only). `nearestHousing` is the shared pick.
- Docs: the revive reach in the Marlow Yard spec (`docs/marlow-final/SPEC.md`, CONSTRAINTS, ENGINE-ANSWERS) now reads
  1.6 m, the revive item's own reach in code (1.8 m is only the interactables default).
- Tests: e2e-ctcourse A3 step 3 shuts both players in the L2 room behind its far door before the corridor switch goes off
  (the client out only for the dark send-back), so the lure no longer finds them (a step-4 "calm" timeout flake).
- Docs (code): the protocol 42 comment names the `sector` message's `rh`.
- Sector Ops: the per-section synced-takedowns list for `rh` is built with the run, so the two always reset together.
- Co-op results: each section's rating line goes into the op-end results list at most once (`putRating` replaces by section id); e2e-section-rating's rejoin parts now check the client's list equals the host's (Marlow: A2 from `rh`, A3 from `rt`).
- Tests: e2e-ctcourse A3 1b asserts the client's own round off the bulletproof hall camera sparks on the client only (host camera online, host ricochet count unchanged, a ray under the housing does not spark); A3 also asserts the L2 far and L3 near doors unlocked on the host.
- Marlow Yard: A4's two mezzanine stairs (open south side) and A8's public stair (both sides) take an invisible noLedge collision rail from the third tread to the head (A6's staff stair idiom), so a player can no longer step off the flights.
- Tests: the A7 cage clearance and A6 "stays off the marks" dressing checks have teeth: a planted 0.03 m skin in each window must be found (S3-7-dress polish 4); no game change.
- Tests: e2e-ctcourse A8 step 5 waits for N2's grille stop with the client in the dark at the jam spot and only then puts him at the board (a flake under load: standing at the board's west side across a full N2 cycle put him in front of N2's W2 -> TALK leg); the timeout now prints N2's state; no game change.
- Tests: e2e-ctcourse A3 step 3 hides both players in L2's south half (71.5 / 74.5, 8.2): the client's old spot (72.5, 11.5) was in view of the far wall's clear glass slot, where the cleaner's device search and breaker walk saw it and fought through the step-4 calm wait (laptop 3/3); no game change.
