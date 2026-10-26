# Mission framework: mission rules, mission text and the Hints setting
kind: minor
- Groundwork for campaign missions: the code that checks a mission's rules (for example no kills or no alarms), writes
  the objective line and the Field Terminal's Objectives list (the rule first, then each step as done, current or to
  do), and packs the mission's state for the co-op partner. Nothing uses it yet.
- New setting Gameplay > Hints: a hint line under the current mission objective (off by default).
- New flags: `missions` (`?missions=1`) and `coopKit` (`?coopkit=1`). Both are off, so the game does not change.
- All of this ships dark behind the `missions` flag (`?missions=1`).
