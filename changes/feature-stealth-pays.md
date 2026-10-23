# Stealth pays: interrogation door codes
- Interrogation door codes now open Course gates and Sector Ops keypads. Course: the code is set as a course flag, so a gate
  that lists it in `externalFlags` opens (stealth-pays S1). Sector Ops: a guard's slot `info` is copied onto him at spawn and
  the code is held by the team for that section, opening the matching keypad (dropped by the section's restart; S2). Play is
  unchanged until map owners author guard `info` codes.
