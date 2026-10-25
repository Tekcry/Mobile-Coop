# Level validator: perfect-run checks
kind: patch
- Level validator (tooling, no game change): every map graph is checked for a perfect run. Each objective and the
  run's end (exfil on a campaign map, the last section's exit on Sector Ops and Marlow Yard) must be reachable without
  a link marked `requires_kill` (an error on every mode) and without a loud link (an error on campaign and Sector Ops,
  information on Marlow Yard). `requires_kill` must be true or false, and a `mark` on a space or link is an error on
  campaign and Sector Ops and an information count on Marlow Yard.
- New test: no mission forces a kill. Every Sector Ops objective is a hack, grab or download, and every Marlow Yard
  objective step is completed by a player action (a zone, a scanner pair, a switch or a door), never by a guard's death.
- Validator output on the worked example and the campus graphs is unchanged.
