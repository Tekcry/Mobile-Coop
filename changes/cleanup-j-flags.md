# Clean-up J: leftover flags, co-op leftovers, tools and checklist
kind: patch
- Removed the feature flags whose feature is permanent (their on behaviour is unchanged): `animTier`, `animShadow`,
  `animOff` (`?animtier=`, `?animshadow=`, `?animoff=`), `guardSun` (`?guardsun=`), `charShadowLight` (`?charlight=`),
  `guardPairs` (`?guardpairs=`), `lookouts` (`?lookouts=`) and `marlowReplan` (`?marlowreplan=`; a room on Marlow Yard
  always opens on the re-planned yard, and "Resume hosting" no longer falls back to the built yard). The Sector Ops,
  campaign, co-op kit, animation-source and comparison switches stay.
- Co-op: the always-empty `mission` field is gone from the `lobby` and `start` messages (and from the session and the
  rejoin record), `NetSession.setSettings` lost its ignored mission argument, and the host's free-roam respawn path is
  removed. Protocol version 92.
- The look tools (`anim-audit`, `anim-sheet`, `anim-video`, `anim-natural`, `anim-skeleton/gpushot`, `anim-keys`,
  `anim-cleanup/traverse-shots`, `weapons/shots`, `perf`) boot the Test Chamber instead of Proving Grounds and the Warehouse.
- `TESTING.md` describes the current game (no Infiltration, Free Roam, Warehouse or Proving Grounds); decisions N22-N27 are
  recorded and backlog item 32 gained the two phone-test lines.
