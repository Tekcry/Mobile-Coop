# Takedown search and body pick-up make no per-step garbage
kind: patch
- No behaviour change: the takedown offer scan reuses one plan and one offer and the shorter sight check, and a started
  takedown keeps its own copy of the plan; the pick-up of a knocked-out body no longer builds a closure every step.
