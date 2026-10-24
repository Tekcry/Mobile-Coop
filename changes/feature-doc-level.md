# Level standard per mode
kind: patch
- Level standard (`docs/level-design.md`) now states its rules per mode: every rule is tagged [All] / [Campaign] /
  [SectorOps] / [Training], with a profile per mode and a rule index (rule, modes, metrics key, validator check,
  owner). Campaign sections each force a co-op traversal move with a way back; Sector Ops keeps solo routes past team
  doors; Marlow Yard is a guided linear course with timed drills. Guards as many as realistically possible (Sector Ops
  32 alive ceiling), real-world light bands replace the shadow share, up to 2 strict rules with section restart,
  objectives name what and where with no maps, measured validator pass and bot route-runs at greybox exit.
- Level validator: `meta.mode` campaign / sector / training profiles (forced co-op gate and gate reach, no softlock and
  the alive ceiling, no route counts for training), a `coop_throw` kind, shadow share as INFO. The scale sheet gets
  `sector_alive_max` and a light-band placeholder; the uploaded stealth skill is reference only.
