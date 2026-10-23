# Guard AI: plain walls are not armour (sniper fires again)
kind: patch
- Guard AI fix: guards read every plain level wall as armour, so a guard whose fire line touched his own cover held fire
  and lost his wind-up; the sniper never got his two shots in and never relocated (e2e-enemies "sniper relocates after
  its shots"). Havok reads a container's filter back as all bits and reports no leaf shape for its hit, so armour is now
  a mark on the body (`markArmoured` / `isArmouredBody` in `src/physics/groups.ts`), set where the armoured pane groups
  (`LevelBuilder.buildGlass`) and armoured door leaves (`Doors.addBody`) are built. The S16 fire gate and E10's round
  armour (`Ballistics.ray().armoured`) both read it, so player rounds again penetrate thin plain walls as E10 intended,
  and armoured panes and leaves still stop every round.
- Test: `tests/armourFireStatic.test.ts` (real Havok: a level wall is not armour, an armoured pane / leaf is);
  e2e-enemies prints the sniper's brain trace when he does not relocate.
