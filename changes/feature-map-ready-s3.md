# Map ready: guards, gear and sound warmed on the loading screen
kind: patch
- Behind the map-ready loading screen (off by default, `?mapready=1`): every guard type's look is prepared on the
  loading screen, so a guard arriving later (a training bay's squad, a reinforcement, a guard who could not appear
  near you at the start) no longer stutters the game when he first shows up.
- The weapon sounds and the first piece of mission music are loaded before play starts (a new "Loading sound" step;
  the weapon sounds only when the game already has sound running), and with the new guard models the dropped helmet
  and the riot shield are loaded too, so no placeholder box shows first.
