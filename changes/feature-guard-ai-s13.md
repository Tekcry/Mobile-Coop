# Guard AI: response teams
- S13 response teams: each Sector Ops alarm stage now brings a response team led by a riot-shield guard (always
  helmeted), the rest armed guards, the same number as before. From stage 2 every guard of the section wears body
  armour at once, from stage 3 a helmet too, and guards that come in later (the next section, a woken guard, the next
  team) wear it as well; a restart drops it with the stage. No camera is added or changed. Once the team has searched
  your last known spot for a minute it sweeps the section point by point, the shield guard leading and the others
  close behind, looking round at each point with torches on in the dark, round and round; a sighting brings a fight,
  then the search, then the sweep again. Teams never leave or calm down until you leave the section or restart. On
  the other live maps the alarm brings a shield guard and two armed guards (no heavy) who sweep the same way.

Tests: the e2e-levels ladder chases wait on sim time (a sim-seconds budget from the design, a hang guard on wall clock) and the sim clock takes over the moment the match exists, so a loaded machine no longer fails "a runner climbs the rack ladder".
