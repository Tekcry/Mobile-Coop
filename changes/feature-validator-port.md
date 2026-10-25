# Level validator: gate core
kind: patch
- Level validator (tooling, no game change): the shared graph helpers move into one library
  (`scripts/level-graph-lib.mjs`) that the level validator, the measure tool and the mission validator all import.
  Each map mode (campaign, training, Sector Ops) now has its own rule profile, with empty check modules ready for the
  measured, training, perfect-run and engine checks that follow. The new co-op kit moves (plank bridge, deadweight,
  vent unlock, chimney pair, swing pass, drop catch) are known link kinds, and `teach:<move>` space tags are accepted.
  Validator output on every map is unchanged.
