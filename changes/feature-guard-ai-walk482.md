# Guard AI: report, then engage; training cameras
kind: minor
- A guard who spots you takes cover and radios it in, then, once his call is through and a peek shows nothing, leaves
  his cover and moves up on where he last saw you, still in the fight, and searches from there: he no longer sits in
  cover until the fight times out into a search (Marlow Yard walk 4.82, item 2). In a group the caller reports only
  while his call is open, then takes a fighting role. Coordinated modes only; host only, no protocol or save change.
- Training cameras: a camera marked `guardResponse: false` in its map data brings no guard response (no guard sent, no
  radio call, no search; its body sightings are not reported). Its alarm, the course rules and the radio lines are
  unchanged. Off by default: every existing camera behaves as before (walk 4.82, item 6, for Marlow Yard station 3).
