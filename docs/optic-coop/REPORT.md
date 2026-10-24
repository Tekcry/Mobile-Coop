# optic-coop: report (spare job #15, ct-toolkit 3.2)

From the builder's commit ffd2a3c2 (the agent could not write this file).

optic-coop: partner sees the optic cable (MoveState optic), gaps engine side

ct-toolkit 3.2, the rest of the optic cable after PR #239.

- Wire: MoveState mode `optic` appended to MOVE_MODES. sub = OPTIC_SUBS
  (0 door, 1 hatch, 2 panel, 3 grille), a = door index (sub 0) or the
  level's optic gap index (OPTIC_POINT_MAX 256 on the wire), ph = cable
  fed out 0..1. sanitizeMoveState refuses unknown subs / bad indices;
  dropBadDoorMove covers optic sub 0, dropBadOpticMove drops a gap the
  level lacks (host accept and client snap). PROTOCOL_VERSION untouched.
- Partner pose: remoteAvatar kneels from the crouch bit (moveKneels),
  settles the feet (poseFromMoveState), right hand on the feed point,
  thin cable hand -> tip as far as ph (opticPlaceOf / opticCableEnd, the
  same code as the owner's new local hand and cable; world.ropes radius).
- Pings from the view: confirmed unchanged (sendPing casts from
  cam.gamePos = the tip; message to host, event to all). No ping input
  is bound anywhere yet (open item).
- Gaps other than doors (map field optic): OpticPoint,
  LevelBuilder.opticGap -> BuiltLevel.opticPoints, opticPointPlace,
  opticPointRefusal ('Too far', 'No gap'), OpticSystem.pickPoint with a
  3-D gap check; look pitch limits around a centre pitch.
- Skipped: the F / pad entry (F is the co-op action; spec says ask) and
  any map placement (no spec names a spot).

Assumed decisions (undo):
A1 shaft top sends sub grille (undo: append 'shaft', OPTIC_SUB_MAX 4).
A2 ceiling panel fed standing, 0.3 m off (undo: crouch true).
A3 floor / ceiling gaps look 50 deg down / up at centre, CT trap view
   (undo: OPTIC.vertPitch 0).
A4 cable = one straight segment on the rope instancer, 6 mm, 85 % in the
   owner's view (undo: drop handFrame and the remote block).
A5 host does not holster a client on the cable (hostHandsFree as is).
A6 gaps reachable from code / tests only (pickPoint) until bound.

Tests: tests/opticCoop.test.ts (15); mocks in animN4dKill / poseParity
gain `optic`; 43 related files pass one at a time; tsc and eslint clean.
e2e-netmove gains an "optic cable" section (not run here). Laptop: run
e2e-netmove, e2e-coop, e2e-stealth-ai, e2e-ctcourse.


