# Level validator: mission checks on the shared validator code
kind: patch
- No game change. The mission checks of the level validator (`scripts/mission-validate.mjs`) run on the validator's
  shared code: one-chance and timed-window rules are no longer accepted (soft windows only), strict rules on the Marlow
  Yard training map are an error, and the ghost run (no loud link) and the no-kill run check every required objective.
  The mission schema and its worked example come back with the fixed kind lists; unit tests cover every mission check.
- Docs only. The graph schema points to the mission schema, the mission schema names `vent_unlock` in its two solo
  rules, and the worked example's shutter link uses `height`.
