# 08 - Level design patterns

These are reusable patterns identified in the *Chaos Theory* co-op missions. Each entry gives:
- a short description;
- why it works;
- where it appears in the original (with the confidence of that evidence);
- an abstract text diagram.

**Diagram legend**

| Symbol | Meaning |
|---|---|
| `A` / `B` | The two players |
| `G` | Guard |
| `C` | Camera |
| `L` | Laser / tripwire |
| `D` | Door |
| `S` | Switch / scanner / device |
| `X` | Objective |
| `#` | Wall |
| `~` | Gap or hazard |
| `^` / `v` | Up / down |
| `=` | Route |
| `..` | Darkness |

Evidence tags refer to the 04 mission files. Any route step that rests on a single guide is [SINGLE SOURCE - PRIMA].

---

## A. Two-player structure patterns

### P1. Split-path-and-sync (rendezvous lock)
- **Description.** Two devices that must be worked at the same moment, placed so that each player must reach one by a different path or from a different side. The pair splits and then meets in time at the devices, even if not in space.
- **Why it works.** Splitting creates independence and tension. The sync creates a shared climax, and it is impossible to solve alone. It also has real-world logic: dual control and the two-person rule.
- **Where it appears:**
  - paired retinal scanners in Training, Panama and Chemical Bunker [VERIFIED];
  - laser-linked twin bombs in Train Station [VERIFIED];
  - the warhead wire cut and PS2/GC paired code locks in Chemical Bunker [VERIFIED / SINGLE SOURCE];
  - PS2/GC paired switches [SINGLE SOURCE].
- **Diagram**
```
   A ==== path 1 ====> [S1]
                         |  "3..2..1.." (both act together)
   B ==== path 2 ====> [S2]
                ~~~~ L ~~~~   (laser/barrier keeps them apart)
```

### P2. Hold-and-pass gate (cover relay)
- **Description.** A device such as a camera, laser or turret can be held off only while one player stands still holding it. The other player passes, then holds it from the far side so the first can follow.
- **Why it works.** It is cheap to build and forces turn-taking. Each player is both protector and protected. It also creates small, frequent co-op beats between big set pieces.
- **Where it appears:** every mission. Examples: Training's camera, Panama's laser grid (twice), and turret flanks in Seoul and Train Station. On PS2/GC it is everywhere. [VERIFIED - XBM, PS2M, PRIMA, FAN]
- **Diagram**
```
   A(holds)--->[C]      B ===> past C ===> (B holds) ---> A passes
     stands still, charge draining      swap roles
```

### P3. Throw-across with far-side release
- **Description.** One player is launched over a barrier the pair cannot cross on foot. The launched player then opens the way for the partner: a switch, a door, a laser panel, a rope.
- **Why it works.** It is a spectacular move that leaves the thrower stranded and *dependent*. The release device is a reunion guarantee.
- **Where it appears:**
  - Training: laser and switch; barbed wire and rope [VERIFIED / SINGLE SOURCE];
  - Chemical Bunker: lasers and computer; cryotank and one-way door [SINGLE SOURCE / VERIFIED];
  - PS2/GC Server Room: lasers and scanner [VERIFIED].
- **Diagram**
```
   A,B  |  L L L  |          A throws B over
   A    |  L L L  |  B --> [S]  B kills lasers
   A ===|=========|==> B        regroup
```

### P4. Boost-then-ladder vertical entry
- **Description.** A height only two bodies can reach. One player boosts the other, who then hangs and lets the first climb him. The pair arrives together at a window, hole or ledge.
- **Why it works.** It is a two-step handshake where both players act twice and no one is stranded. It also turns an ordinary façade into an entrance a lone guard would never watch.
- **Where it appears:** the most common move in the mode. Examples: the Panama window and ceiling, Seoul's hotel holes and cafe window, and Train Station's tunnel ledge, phone booth and washroom ceiling. [SINGLE SOURCE for counts - PRIMA; move VERIFIED]
- **Diagram**
```
         [window]   <- B hangs, A climbs B
   #######|######
   #      ^ B       (B boosted by A)
   #  A crouches
```

### P5. Reach-in from above (hang down)
- **Description.** The objective sits in a room whose floor is guarded, lasered or locked. The pair comes in over the ceiling, and one lowers the other head-first to act: hack, grab or take down a guard.
- **Why it works.** It flips the room's defence (the door and floor are watched, the ceiling is not). It also gives the most cinematic co-op image, and life literally depends on the partner.
- **Where it appears:** Training's computer; the Panama duct keypad; the Chemical Bunker anti-virus; the Train Station payphone bug; PS2/GC Panama fuse. [VERIFIED for move; placements SINGLE SOURCE]
- **Diagram**
```
   ===== duct/roof ===== A (holds rope)
                 |
                 B (upside down)
   [ room: G   G  .. X ]   floor route: D (locked/watched)
```

### P6. Single-entrant room (asymmetric access)
- **Description.** The fiction allows only one player into a space: one antidote dose, one disguise, one key card. The other covers, waits or does a parallel task.
- **Why it works.** Roles are assigned by the story, not by an arbitrary rule. It is a brief solo moment with the partner as safety net.
- **Where it appears:** Train Station, contaminated washroom. [VERIFIED]
- **Diagram**
```
   A (has dose) ===> [ hazard room: X ]
   B ----- waits / guards corridor ---- (enters only after X done)
```

### P7. Captive as key
- **Description.** A biometric lock is opened by forcing a captured person to it. With two scanners, each player must capture one person, usually in different places.
- **Why it works.** Infiltration, capture, escort and sync collapse into one beat. Non-lethal play becomes useful, because a dead person cannot open the door. It is grounded in real biometrics.
- **Where it appears:** Panama (a guard and the official); Chemical Bunker (two guards); PS2/GC Panama finale. [SINGLE SOURCE - PRIMA per instance; pattern VERIFIED across missions]
- **Diagram**
```
   A --> grabs G1 (security office) --\
                                       >==> [S1][S2] both scan together
   B --> grabs VIP (office, far end) --/
```

### P8. Operator and spotter (asymmetric information)
- **Description.** One player controls a machine but cannot see the target. The other sees the target but cannot control the machine. Voice (or pings) is the only link.
- **Why it works.** Communication itself becomes the mechanic. It is perfect co-op: neither can succeed alone and both are busy.
- **Where it appears:** Chemical Bunker crane. [SINGLE SOURCE - PRIMA; crane VERIFIED - XBM]
- **Diagram**
```
   [control room] A at lever  ---- "left... lower... stop" ---- B at target
        (no view)                                              (no control)
```

### P9. Leapfrog relay
- **Description.** A chain of obstacles where each player opens the next stage for the other in turn: duct gates, throw-and-rope, turret leapfrog.
- **Why it works.** It gives rhythm and equal agency, and the turns alternate who leads.
- **Where it appears:** PS2/GC East Wing duct gates; PS2/GC Hydro Tunnel throw and rope; turret leapfrogs in PS2/GC Seoul and Train Station. [SINGLE SOURCE - PRIMA]
- **Diagram**
```
   A opens G1 -> B passes, opens G2 -> A passes, opens G3 -> ...
```

### P10. Parallel routes that re-merge
- **Description.** The pair is separated by geometry: a train, an elevator stopping on two floors, a high route vs a street route. Each crosses a different mini-challenge, and they meet at a defined merge point.
- **Why it works.** Each player gets a personal mission ("your own game") without losing the partnership. The merge point is a natural checkpoint.
- **Where it appears:** Train Station platform (either side of a train, regroup through the car) [SINGLE SOURCE]; PS2/GC Train Repair Station (elevator split, two tunnels) [SINGLE SOURCE]; PS2/GC Seoul Streets (high/low); PS2/GC Fish Market (beam vs walkway). [SINGLE SOURCE - PRIMA]
- **Diagram**
```
         /== route A (dark side, guards) ==\
   start <                                  > merge (car / ladder)
         \== route B (narrow gap, mines) ==/
```

### P11. Protect-while-act
- **Description.** One player performs a slow interaction (search, hack, interrogate). A predictable interrupter is scripted to arrive, and the other player handles him.
- **Why it works.** It gives the non-acting player a real job, which avoids "watch your partner hack".
- **Where it appears:** Panama archive (the guard comes to fix the lights); Seoul officer (escorts); Train Station locker room (bodyguard); PS2/GC Archives (the guard enters as the hack runs). [SINGLE SOURCE - PRIMA]
- **Diagram**
```
   A: [X] searching....   B: ..hidden by door.. G enters -> KO
```

### P12. Escort extraction
- **Description.** A captured, unconscious target must be carried out. The carrier is slow and cannot fight; the partner opens doors and clears the route.
- **Why it works.** A clear role split under pressure, and a high-stakes finale that reverses the infiltration route.
- **Where it appears:** Seoul, carrying the target to the truck. [VERIFIED]

---

## B. Space and route patterns

### P13. Light/shadow lanes (make your own dark)
- **Description.** Rooms are lit by lights that can be shot, switched or jammed. Players create shadow lanes; guards notice and come to investigate.
- **Why it works.** Players shape the space themselves. It also creates lures, because a guard who goes to fix a light can be ambushed.
- **Where it appears:** every co-op route; Panama light switches as guard lures. [VERIFIED as pervasive]
- **Diagram**
```
   [lit]  [lit]  [lit]      ->  [..]  [..]  [lit]   lane A/B moves in ..
     G walks to dead light <- ambush point
```

### P14. Lure and ambush
- **Description.** One player creates a stimulus (noise, a dead light, a sticky-camera click) that draws a guard to where the other waits. This includes the throw that lands a partner on the lured guard.
- **Where it appears:** Train Station bomb pair 1 (light lure plus a partner thrown onto the guard); Seoul (light and ledge-pull); PS2/GC Cyber-Cafe (light switch decoy and grab). [SINGLE SOURCE - PRIMA]
- **Diagram**
```
   A shoots light (far) --> G walks --> under B's ledge / B's landing --> KO
```

### P15. Noise-mask zones
- **Description.** Areas where ambient noise (machines, fountains, rain, war, radios) lets players move faster or talk. Quiet zones (generators off, tile floors) punish haste.
- **Why it works.** Sound becomes terrain, and players read the soundscape as a map.
- **Where it appears:** a game-wide system [VERIFIED]; the war ambience in co-op Seoul [SINGLE SOURCE]; the loud turbine halls of Nuclear Plant (pitched in PR, mechanic undocumented) [UNCERTAIN].
- **Diagram**
```
   [quiet: tile, no hum]  slow!   |   [generator room: fast OK]  |  [rain yard: talk OK]
```

### P16. Earned vantage point (overlook)
- **Description.** A safe, dark spot with a sightline over a future challenge: a balcony, catwalk, crawlspace window or temple balcony. Players plan from it.
- **Why it works.** Scouting enables planning, and planning is the core of co-op stealth.
- **Where it appears:** Chemical Bunker crawlspace over the missile storage room [SINGLE SOURCE]; PS2/GC lab walkway (also an eavesdrop) [VERIFIED]; Seoul temple, where the balcony watcher is a *hostile* overlook [VERIFIED].
- **Diagram**
```
   [crawlspace ..] ---> window ---> [ big room: G G X C ]   (plan, then enter later)
```

### P17. Foreshadow and return
- **Description.** Players see (and can even prepare, for example by killing lights in) a space early, then enter it at the climax.
- **Why it works.** It is a landmark and a promise, and preparation pays off.
- **Where it appears:** Chemical Bunker missile storage room. [SINGLE SOURCE - PRIMA]

### P18. Hub room
- **Description.** A central room revisited between wings. It anchors orientation.
- **Where it appears:** Chemical Bunker operating theatre (between the lab wing and cryo). [SINGLE SOURCE]

### P19. One-way drop / commitment door
- **Description.** A drop through a floor hole, a trapdoor or a one-way door that prevents backtracking after a key beat.
- **Why it works.** It keeps the pair moving forward and simplifies navigation. It also signals "the next act starts".
- **Where it appears:** the Chemical Bunker one-way door after the throw [VERIFIED]; floor holes in the Seoul hotel [VERIFIED]; the Train Station ticket-booth trapdoor and washroom duct drop [SINGLE SOURCE].
- **Diagram**
```
   A,B --throw--> B opens [one-way D] --> A joins --> (no return)
```

### P20. Entry-equals-exit loop
- **Description.** The infiltration point is also the extraction point, but the return path differs.
- **Why it works.** Players know where to go at the end. The second traversal is fresh, and the mission feels round.
- **Where it appears:** Panama (window → interior loop → same window by another staircase). [SINGLE SOURCE - PRIMA]
- **Diagram**
```
   [truck]--window--> 2F -> 3F -> roof/duct -> balcony -> GF -> server
     ^                                                         |
     +------- window <- 2F <- reception stairs <---------------+
```

### P21. Top-down infiltration
- **Description.** Enter from the roof or the top of a shaft and work downward. The ground floor (the most guarded) comes last or not at all.
- **Where it appears:** UN HQ (roof, top floor, down) [SINGLE SOURCE]; Chemical Bunker silos [VERIFIED].

### P22. Two buildings and a bridge
- **Description.** The objective is split across two structures joined by an exposed crossing.
- **Why it works.** A clear midpoint, an outdoor exposure beat, and a change of architecture and mood.
- **Where it appears:** Nuclear Plant (plant → laser corridor → footbridge → lab). [SINGLE SOURCE - FAN notes]

### P23. Machine-state route
- **Description.** Machinery has states (fans on or off, a platform up or down, a crane position, an elevator). Changing state opens or closes routes.
- **Where it appears:** Nuclear Plant fans [VERIFIED]; Chemical Bunker silo platform [VERIFIED] and crane [SINGLE SOURCE]; PS2/GC missile lowered by a panel [SINGLE SOURCE].
- **Lesson.** The state must be readable (fans visibly or audibly running), or players stall (Nuclear Plant forum threads).

### P24. Moving-target tail
- **Description.** Follow a moving NPC through populated space to discover a destination, without being seen.
- **Where it appears:** Train Station, following the agent to the locker. [VERIFIED objective]

### P25. Event wait (eavesdrop beat)
- **Description.** Players must hold position while a conversation or call plays out. Story is delivered in-world, and it doubles as a rest beat.
- **Where it appears:** Train Station call [SINGLE SOURCE content; wait VERIFIED]; Chemical Bunker technicians. [VERIFIED for PS2/GC]

---

## C. Pattern frequency (analysis of the guide routes)

- **P2 hold-and-pass:** all missions. **P4 boost-ladder:** all but Chemical Bunker. **P13 light lanes:** all.
- **P1 sync:** in every story mission on Xbox/PC except Seoul, and in every PS2/GC mission.
- **P5 reach-in:** about one per mission.
- **P3 throw-release:** 0-2 per mission.
- The **set-piece patterns** (P7 captive key, P8 operator-spotter, P6 single entrant, P12 escort) appear once each, in different missions. They are what makes each mission memorable.
