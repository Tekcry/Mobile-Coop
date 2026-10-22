# Guard AI
- S1 hearing: not every guard hears every noise any more. A wall cuts a noise's reach to 0.45 and noisy machinery near a
  guard masks it (map data, none placed yet). Of the guards a noise reaches, only the nearest one close enough walks over
  to check; the others turn to look and stay at their posts. Loud gunfire puts guards in combat only close in (about
  7 m in the open); farther, or behind walls, one guard is sent to look and the rest turn, and a shot behind walls far
  off reaches nobody. Hunter and Mission (parked) keep the old everyone-hears rule.
- S2 incident board: one event, one response. A noise, distant gunfire or a lure sends one guard (the nearest by walking
  distance; an officer sends someone else), says "Checking it out." on the radio, and the others who heard it answer
  "Copy." and look a moment; more noise in the same spot never pulls a second guard. A light shot out or switched off is
  noticed only by guards who can see it go (in their view with a clear line, or the room they stand in goes dark): one
  checks it, two if a second witness is close. They look at the light, sweep the area round it, say "Nothing here.
  Back to it." and return to their routes calm. An investigator taken out (or held) who stays silent for 25 s brings
  two more as a pair. Investigating and searching guards now walk slower than their patrol, not faster. Hunter and
  Mission (parked) keep the old rules.
  Fix: a patrol point with a wait of 0 is now walked straight through; before, the guard stopped there for good.
