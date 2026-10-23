# Marlow Yard redesign: eight co-op sets in a luxury training centre
- Marlow Yard (map `ctcourse`, Course mode) is rebuilt as one 15-20 minute co-op run: eight sets A1-A8 inside a luxury
  rehearsal centre (glass instructor gallery, LED coves, sliding doors, dark premium surfaces), each set a mock-up of a
  real-map co-op scenario: A1 Gate (leg-up, relay and bolt), A2 Carriage Shed (timed light isolation), A3 Office Range
  (timed jam relay), A4 Goods Shed (security room camera loop, dual takedown), A5 Substation (partner throw, floodlight
  jam, release), A6 Pump House (rope and hang-down hack), A7 Data Hall (split paths, synced hack), A8 Strongroom (all of
  it under two timers). Seven lit holding rooms join the sets. Every set is lit and the players make the dark.
- No explainer pads. The objective table updates per set and guides both players; where the team splits each player sees
  their own A or B line, and the first player to do a set's A job takes it for both (`CourseObjective` steps, N1).
- New co-op devices: a two-way timed light isolator (N2, 15 s and 25 s windows, re-arm, lights-out lure, restart now
  restores every lamp); a timed security console that loops the cameras for 60 s with a 20 s re-arm (N3); a hold device
  whose noise a joiner makes too (N4, protocol 30 `use.pulse`, `NetItem.hn`); several scanner pairs (N6, protocol 30
  `sec.sc` one entry per pair); one-player pass zones; sliding doors with Open only (N9); the course start list reads the
  course's bay count (N8). Course guards now run stealth rules (shout, search, cooldown, detection stat).
- Co-op wire: `PROTOCOL_VERSION` 42 (this branch's 30 / 33 / 36 wire, scanner pairs and hold pulses, over train 30's 40; 41 reserved for guard-ai S9). Details: `docs/systems/coop.md`.
- Fixes: the character controller no longer reads a stale floor for one step after a hang, climb or teleport
  (`staleSupport`); a client's wall switch press is taken only within the host's reach rule.
- Course tests: one unit file per set (`tests/ctcourse/`), a whole-map light frame (`CTLIGHT_WRITE`), `e2e-ctcourse` now
  runs as four parts (:1 A1-A2, :2 A3-A4, :3 A5-A6, :4 A7-A8), `scripts/shots-ctcourse.mjs` takes one shot per set vantage.
- Old best times: the course record was keyed by bays S1-S8 and the bays are now A1-A8, so the old best times no longer
  show and the record starts again. No save migration (`SAVE_VERSION` unchanged; the record is a sanitised key).
- Proposals built as assumed decisions, each undoable (`docs/marlow-final/SPEC.md` section 15, `STATE.md` MORNING-REVIEW):
  - P1 entry vantages are concealed by occlusion and holding rooms are lit; undo: a dark mixed-zone pocket at each vantage.
  - P2 sets sit at 0.14 standby light, 0.30 in the lounge, holding rooms and dock; undo: keep 0.30 (isolations become lures only).
  - P3 timed device windows only (never a fail, no course clock); undo: held isolators and a permanent console off.
  - P4 new rule LD 5.5 "lit as the real building, the players make the dark" (Marlow Yard only here); undo: lower fitting intensities.
  - P5 an alarm resetting the set is not used; add it only on Michael's word.
  - P6 12 role-players, at most 3 alive per set; undo: drop `a4-dock2` and `a8-night2`, move the A1 checker slot.
  - P7 Course guards run `em.stealth = true`; undo: one line in `courseMode.ts`.
  - P8 occluders on every high route instead of a guard look-up penalty; undo: build G44's penalty in `perception.ts`.
  - P9 new code N1-N4, N6, N8, N9; undo: the per-item fallback in SPEC P9.
  - P10 one new mechanic per space is relaxed in A4 and A6; undo: move A6's rope to A8.
  - P11 two or three ways per guarded set, a secret in A2, A3, A5; undo: a secret per guarded set.
  - P12 set walls stop under the 10 m hall roof; undo: a charcoal panel wall above each to the roof.
  - P13 co-op lip spans are open loading edges (a drop chain); undo: full rails, lips move to a hoist bay.
  - P14 info lines on the A1 checker and the A4 and A8 officers; undo: the A1 checker only.
  - P15 the luxury rehearsal centre replaces the bunker fiction (Michael's word, M5).
  - P16 striped leg-up marks at A1, A2, A6, A8; undo: no marks, the objective line names the spot.
  - P17 all glass stops guard and camera sight and jam lines; undo: build G45's clear-glass sight.
- Open polish (none blocks play): the combined list is in `docs/marlow-final/slices/S3-7-dress-check.md` ("Polish list"),
  with `S34-check.md`, `S567-check.md` and `S8-check.md`. Main items: A5 beam towers and A4 / A8 stair rails have no
  collision, the A6 interlock lamp has no emissive, A3 floor surfaces, the A8 marble `tile` surface, and the lamp-radius
  trim. GPU frame time per set and the perf "after" run are pending a PC run (`docs/marlow-final/slices/S9-perf.md`).
- Slice 10 (Michael's walk 4.72 / 4.73): every Marlow camera (A3 hall, A4, A7, A8) is armoured. A shot ricochets with
  sparks and a ricochet sound, and the camera keeps watching. Jam and power cut still work.
- Slice 10: a checkpoint restart fully resets the set on host and client. Guards, bodies and drones go back to set
  start, with no old incident or alert left. A carried body, gadgets and noise reset. Broken cameras come back online.
  Doors go back as at set start: open ones shut, cracked ones whole, and locked doors shut.
- Slice 10: the A2 locked door has no lamp on the rebuilt set. The old lamp was on the master map only. Michael to
  re-walk A2 to confirm.
