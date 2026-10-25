# Kit, audio and design findings - digest (scrubbed)

A working digest of the Chaos Theory (CT) co-op research for Night Shift: the kit, what the prototype needs from audio and
atmosphere, the design findings, which open questions block a prototype, and a CT check of the nine movement-run ideas
(G11). It turns the raw research into proposals for Michael. Nothing here is decided until Michael says so.

**Sources.** `docs/ct-research/source/04-kit.md`, `07-audio-and-atmosphere.md`, `08-reception-and-design-findings.md`,
`06-open-questions.md`, `03-mechanics.md` (guard senses, medkits, scoring), `00-index.md` (conventions), and Michael's
decisions D-01 to D-25 in `docs/ct-research/source/raw/OPEN_QUESTIONS.md`. Night Shift context: `docs/DECISIONS.md`
(G2, G11, G49, G63, G66, G67, G76, G82, G98, G99, G100, G113, G119), `docs/archive/locomotion/BIBLE-PROPOSALS.md` (1-9),
`src/game/gadgets.ts`, `src/game/gadgetSystem.ts`, `src/config/arsenal.ts`, `src/weapons/weaponDefs.ts`,
`src/game/vision.ts`.

**Scrubbed.** No reference-game character, gear or organisation names (G6, G114). Gear is named generically. The two CT
co-op agents are called **Player A** (the host; blue goggle lamp in CT) and **Player B** (the client; red lamp). Missions
keep their place labels: Training, Panama, Seoul, Chemical Bunker, Train Station, Nuclear Plant (download 1) and
**International HQ** (download 2, the no-kill finale).

**Reference build.** Xbox/PC ("Version 1") unless marked. PS2/GameCube ("Version 2") had a cut-down co-op with
symmetric kits; it is noted only where it adds something.

**Confidence.** As in `00-index.md`: CONFIRMED (several sources), ONE SOURCE, INFERRED / UNCERTAIN, UNKNOWN,
ANALYSIS (the researchers' or this digest's reading). Where this digest proposes something, it says **Proposal**.
Section references like "04 §7.4" point into the source files.

---

## 0. The five findings that matter most

1. **The co-op kit is small and fixed.** Every CT co-op mission hands each player a fixed loadout (no selection
   screen): the rifle with the launcher always fitted, the pistol with its jammer, an adrenaline syringe, and a handful
   of launcher rounds and grenades. Sniper and shotgun attachments are never issued in co-op. (04 §1, §3, §7)
2. **The pistol jammer is the most-used co-op tool, and it is a hold, not a throw.** Hold the secondary trigger on one
   electronic device (light, camera, laser emitter, turret, sensor); it drains while held, refills on its own, and
   moving cancels it. That turns every camera, laser and turret into a two-person gate. Night Shift today has a thrown
   area EMP instead, which is the wrong shape. (04 §2.2)
3. **Kits are complementary per mission.** Player A is the precise shooter (sticky cameras, shock rounds, ring airfoil
   rounds); Player B is the thrower (frag, flash, smoke). Ammo level states the mission's rule: 30 rifle rounds on the
   stealth missions, 90 on the war zones, identical heavy non-lethal kits and no spare magazines on the no-kill finale.
   This matches D-11. (04 §7.4, §8.2)
4. **What made it great was physical teamwork plus talk, and what hurt was unreadable shared devices and long
   restarts.** Players remember throwing the partner, the rope dangle, simultaneous wire cuts, jam-and-run and guards
   hearing real voices. They complain about the bomb and mixing screens with no input prompts, no automatic
   checkpoints, losing each other and "press button, watch animation" moves. (08 §2.4, §2.5, §5.1)
5. **Of the nine movement-run ideas (G11), five are CT and stay (guards undo light changes, impromptu paired searches,
   eavesdropping, lock picking with a noise cost, adaptive music); four are not CT and go (a player-facing
   last-known-position marker, the remote digital layer, the under-3-second retry target, the after-action route
   map).** (Section 5)

---

## 1. Kit

### 1.1 The rules of the CT co-op kit

| Rule | Confidence |
|---|---|
| Fixed loadout per mission and per player; no co-op loadout screen. Map settings hold one Mission kit and one Elite kit per player | ONE SOURCE (gear boxes); no screen INFERRED |
| Asymmetric kits on Xbox/PC: Player A carries the launcher payloads, Player B most hand grenades. Exception: International HQ gives both an identical kit | CONFIRMED (wiki tables + game files + guide) |
| Symmetric kits on PS2/GC: both players identical per sub-level | CONFIRMED |
| The launcher is fitted on both players on all seven maps (`StartupAttach=Launcher`) | CONFIRMED (game files, three builds) |
| No whistle: the whistle button becomes the Co-op Action button | CONFIRMED |
| The pistol's solo fire-and-forget disruptor becomes a hold-to-jam co-op tool | CONFIRMED |
| Share Equipment: items marked with a dot can be handed to a nearby partner (Interaction menu). Which items carry the dot is not listed | CONFIRMED (shipped); dot list UNKNOWN |
| Share View: the partner can watch your sticky-camera feed at any distance (off in split-screen) | CONFIRMED |
| Revive: one adrenaline syringe per player per mission (two revives per team), about 30 s window, restores about half health | CONFIRMED (in-game training text) |
| Remote hack/scan device: bound to a key but the guide says unusable in co-op | INFERRED / UNCERTAIN (R-02); Night Shift decided none (D-19) |
| Binoculars: not in co-op. Rope: not an item, only placed rappel and dangle spots | CONFIRMED |
| Elite mode (unlocked by finishing co-op): firearms start empty, a reduced non-lethal set | CONFIRMED |
| Difficulty (Normal / Hard / Expert) does not change the kit; only Mission and Elite blocks exist | ANALYSIS |

### 1.2 Weapons

**The rifle** (04 §2.1)
- Both players, every map. 30-round magazine. Launcher fitted from the start.
- Load per mission: 30 (Training, Panama, Nuclear Plant, International HQ), 60 (Train Station), 90 (Seoul, Chemical
  Bunker). Elite: 0.
- Use: shooting out lights (the pistol is the usual tool) and lethal force where allowed.

**The pistol and its jammer** (04 §2.2)
- Both players, every map. 20-round magazine. Load 20 to 60 per mission.
- Shoots out lights (lampposts, chandeliers, neon, room lights, a lit billboard). Usable while hanging upside down, on a
  dual rappel and on the partner's shoulders.
- **The jammer** (the pistol's secondary function in co-op):
  - Aim at an electronic device (light, camera, laser emitter, turret or its control, mobile sensor) and HOLD the
    secondary trigger.
  - The effect lasts only while held and while charge remains. Moving cancels it.
  - Charge drains while held and refills automatically. Tapping stretches the charge (ONE SOURCE).
  - A light on the gun is red and turns green on a jammable target: a visual cue, not audio.
  - Use is silent, but some devices crackle when disabled, which can lure guards (ONE SOURCE).
  - Charge length is not documented. One fan memory: about 20 s on a drone (INFERRED / UNCERTAIN).
  - Why it matters: one player cannot get both past a camera alone. Every camera, laser or turret becomes a two-person
    gate. The most-used co-op tool (CONFIRMED).
- **Level patterns built on the jammer** (CONFIRMED, guide routes):
  - Jam-and-pass, then swap (camera corridors, a laser grid whose breaker sits inside the grid).
  - Turret flank: one jams a turret while the partner runs behind it to its control panel.
  - Light kill: one holds an overhead light off so the partner can drop unseen (a soft timer: the charge).
  - Escort: jam a camera while the partner walks a captive to a scanner.
  - Turret or sensor leapfrog: alternate jamming and moving.
  - Jam-and-hack: one jams the camera watching a laptop while the other hacks.

**The knife** (04 §2.3)
- Close-quarters kills. One scripted lethal beat (Train Station: the player who took the single antidote kills an
  infected soldier; perfect-score runs exist, so the beat is exempt from scoring).
- Elite: the manual says the knife becomes the kill tool; the guide says Elite is non-lethal only. The manual wins, but
  this stays INFERRED / UNCERTAIN.
- The close non-lethal option in CT is the unarmed knockout, not the knife (03 §13.2: knockouts are free).

### 1.3 Rifle attachments (04 §3)

| Attachment | In CT co-op | Confidence |
|---|---|---|
| Launcher | Fitted on both players on every map. Fires sticky cameras, shock rounds, ring airfoil rounds. Starts with one sticky camera loaded | CONFIRMED (game files); loaded camera ANALYSIS |
| Sniper | Never issued. Engine carry keys exist (5 magazines) but no map issues any | ONE SOURCE (game files) |
| Shotgun | Never issued. Same as sniper | ONE SOURCE (game files) |
| Foregrip | No key at all | ANALYSIS |

### 1.4 Gadgets and items

| Item | What it does | Who carries it (Xbox/PC Mission) | Co-op uses | Source |
|---|---|---|---|---|
| Sticky camera (launcher round) | Sticks to surfaces for scouting; makes a clicker noise to lure; releases knockout gas (gassing destroys it) | Both, 1-4 each; both 4 on the finale | Gas a lone guard; lure two guards together and gas both; watch round a corner; spotter for the partner; read a keypad code as a guard types it (with thermal or night vision); simultaneous takedown with a partner's grab | 04 §4.1 CONFIRMED |
| Share View | Partner watches your sticky camera at any distance | Co-op function, not an item | Spotter play | 04 §4.1 CONFIRMED |
| Shock round (launcher) | One-shot knockout; sticks and shocks | Player A only, 1-3; both 3 on the finale | Knock a target out through a window from outside; single guard at a choke | 04 §4.2 CONFIRMED |
| Ring airfoil round (launcher) | Blunt projectile, one-hit knockout | Player A, 3, on Seoul, Chemical Bunker, Train Station; both 3 on the finale; both 1 in Elite on three maps | Ranged non-lethal knockout | 04 §4.3 CONFIRMED |
| Gas grenade | Area knockout gas | Training 1 each (files only); Elite Player A 4 on three maps; +1 pickup on the finale | Rare. The common co-op gas source is the sticky camera | 04 §4.4 |
| Frag grenade | Lethal area | Player B, 2, on Seoul, Chemical Bunker, Train Station; never in Elite | War-zone missions | 04 §4.5 CONFIRMED |
| Flash grenade | Blinds | 0-3 per player, mostly Player B (Player A on Seoul and Train Station); both 3 on the finale | Flash two guards and rush; flash as doors open, then both grab a stunned guard for twin scanners | 04 §4.6 CONFIRMED |
| Smoke grenade | Smoke screen | Player B, 2, on Panama and Nuclear Plant; both 3 on the finale; 2 in a Seoul pickup | Door bash plus smoke to breach a room; avoiding forced fights | 04 §4.7 CONFIRMED |
| Explosive charge | Placed (often from the partner's shoulders), detonated remotely | Contextual, at authored spots | Anti-aircraft vehicles, a trapdoor, an iron gate | 04 §4.12 CONFIRMED |
| Wall mine | A hazard to disarm (green or red light; Expert: green only); electro vision spots it | Never issued; level pickups on PS2/GC | Hazard, pickup | 04 §4.9 CONFIRMED |
| Optic cable | Look under doors | Always carried (verb) | Check a room before entering | 04 §4.14 ONE SOURCE each |
| Lock pick / break lock | Pin-sequence pick (2-6 pins seen), or break: faster but noisy | Verb | Quiet slow entry vs fast noisy entry | 04 §4.15 CONFIRMED |
| Hacking | By touch: computers, keypads, retinal scanners. Intel from a computer updates both players' devices | Verb | Jam-and-hack; captive to scanner | 04 §4.16 CONFIRMED |
| Adrenaline syringe | Revive a downed partner within about 30 s; restores about half health | 1 per player per mission (PS2/GC: 2 per sub-level) | Soft failure; rescue moments | 04 §4.17 CONFIRMED |
| Wall medkit cabinet | Heals: full on Normal, 50% Hard, less on Expert (general CT values) | Placed, not carried | Rest beats after peaks | 03 §3.2 CONFIRMED values; reuse UNKNOWN |
| Mission items | Single-use items that assign roles (one antidote: only that player may enter a room; a fuse; samples) | Per mission | Forced split roles | 04 §4.19 CONFIRMED |
| Not in co-op | Binoculars, chaff grenade (handhelds only), IR stress generator (key only), remote hack device (R-02) | - | - | 04 §4.8, §4.10, §4.20 |

### 1.5 Goggle modes (04 §5)

- **Night, thermal and electro** (the CT electromagnetic mode). All used in co-op. Night Shift already settled these
  (G99) and an instant switch in CT order: thermal, electro, night, off (G100).
- **Thermal** shows the live bomb wire (it pulses and changes); both players cut together. Also reads keypad codes
  through a sticky camera. PS2/GC: controller vibration also shows the live wire (CONFIRMED).
- **Electro** spots cameras, turrets and wall mines; the standard partner of the jammer on the guide routes.
- **Darkness alone** beats ordinary (non-thermal) cameras (ONE SOURCE).
- **Goggle lamps tell the players apart:** blue for Player A, red for Player B. Enemies cannot see the glow in the
  fiction. No partner marker is documented. Night Shift: D-12 (partner beacon in a distinct colour, no marker).
- Overlays slide over the HUD like a lens (ONE SOURCE). The night-vision whine is remembered as iconic (ONE SOURCE).

### 1.6 Ammunition (04 §6)

- Magazines: rifle 30, pistol 20 (derived from game files against wiki totals; consistent on all seven maps).
- Map settings count **spare** magazines; the loaded one is extra. 0 spare = one loaded magazine, not no ammo (an
  early misreading was reverted).
- The launcher starts with one sticky camera loaded; shock and airfoil counts are as issued.
- Pickups: Panama +60 rifle, +40 pistol; Seoul +30 rifle, +2 smoke, 3 medkits; Chemical Bunker none listed; Train
  Station +60 / +40; Nuclear Plant +120 / +80; International HQ +60 / +40, +1 gas grenade. Pickups match 30- and
  20-round magazines.

### 1.7 Loadouts per level (Xbox/PC Mission mode, totals per player)

Every player also has: the launcher fitted, the pistol jammer, 1 adrenaline syringe. (04 §7.4; totals CONFIRMED by
wiki tables and game files, except where noted.)

| Level | Rifle / pistol rounds | Player A extras | Player B extras | Pickups | Kit tone (ANALYSIS) |
|---|---|---|---|---|---|
| Training | 30 / 20 | Gas grenade 1 (files only) | Same as A | Medkit (laser room) | Teaching kit |
| Panama | 30 / 60 | Sticky cam 2, shock 1 | Sticky cam 1, flash 2, smoke 2 | +60 rifle, +40 pistol | Light, stealth |
| Seoul | 90 / 60 | Sticky cam 1, shock 3, airfoil 3, flash 2 | Sticky cam 4, frag 2 | +30 rifle, +2 smoke, 3 medkits | Heavy, war zone |
| Chemical Bunker | 90 / 60 | Sticky cam 4, shock 3, airfoil 3 | Sticky cam 1, frag 2, flash 2 | None listed | Heavy |
| Train Station | 60 / 40 | Sticky cam 1, shock 3, airfoil 3, flash 2 | Sticky cam 3, frag 2 | +60 / +40 | Middle |
| Nuclear Plant | 30 / 60 | Sticky cam 2, shock 1 | Sticky cam 1, flash 2, smoke 2 | +120 / +80 | Light (same kit as Panama) |
| International HQ | 30 / 20 | Sticky cam 4, shock 3, airfoil 3, flash 3, smoke 3 | **Identical to A** | +60 / +40, +1 gas | No-kill rule: most non-lethal stock, no spare magazines |

**Elite** (Xbox/PC only; 04 §7.5): firearms 0 rounds, sticky cam 1 each, then one of two patterns:
- Seoul, Chemical Bunker, Train Station: Player A gas grenade 4; Player B flash 4.
- Panama, Nuclear Plant, International HQ: Player A shock 1 + airfoil 1; Player B airfoil 1 + flash 2.
- 100% no-knockout, no-kill Elite runs exist on all seven maps (ONE SOURCE: video descriptions).

**PS2/GC** (04 §7.7): both players identical: rifle 60, pistol 40, syringe 2, plus sticky cam 1-2 and flash 1 (frag 1
on Train Station, R-18). No shock, airfoil, smoke or gas.

**Reading** (04 §7.4, §11, ANALYSIS): "the kit states the rules". A reviewer shown only the loadout should be able to
guess a mission's special rule.

### 1.8 What is shared and what is per player

| Per player | Shared or team-level |
|---|---|
| Weapons, ammo, launcher rounds, grenades, syringe | Intel: reading a computer updates both players' devices |
| Light and noise meters (each player has his own; the partner's meters are not shown) | Share Equipment: dot-marked items can be handed over (Interaction menu, both near) |
| Goggle mode and lamp colour | Share View: watch the partner's sticky camera |
| Individual rating percentage (team stats compiled per player) | Alarm counter and alert tier (one per mission) |
| Mission items that assign a role (one antidote) | Revive: either player's syringe can revive the other |

### 1.9 CT solo vs co-op kit (04 §8)

- Solo has, co-op lacks: the whistle, the fire-and-forget disruptor, remote hacking, a loadout choice screen, the rifle
  attachments other than the launcher, automatic checkpoints.
- Co-op has, solo lacks: the hold-to-jam jammer, Share Equipment, Share View, the adrenaline revive, goggle-lamp
  colours, asymmetric kits, role-assigning mission items, proximity voice heard by guards, Elite.

### 1.10 How it compares with Night Shift today

G76 (Michael, 2026-10-17): "CT kit only". One rifle with attachments (sniper, shotgun, launcher), one pistol with a light
/ electronics disruptor, and the knife; gadgets and attachments settled by this research.

| Item | CT co-op | Night Shift code today | Gap |
|---|---|---|---|
| Rifle | Both players; launcher always fitted | `rifle`, suppressed carbine (`src/config/arsenal.ts`, `weaponDefs.ts`) | Launcher not built; attachments open |
| Sniper / shotgun attachments | Never issued in co-op | Not built; listed in G76 | Proposal: drop (1.11) |
| Pistol | Both; shoots lights; hold-to-jam | `pistolSd`; comments say it "carries the light disruptor" | The jammer itself is not built on the pistol |
| Light disruption | Single-target hold beam; drains, refills, moving cancels | Thrown `emp` gadget: 9 m radius, 8 s, all electric lights out, nearby enemies dazed (`gadgets.ts`, `gadgetSystem.ts` `emp()`, `lights.ts` `disrupt()`) | Wrong shape: area and fire-and-forget remove the two-person gate |
| Knife | Close lethal; scripted beat; Elite (disputed) | Not built (`arsenal.ts`: "the CT knife is not built") | Role open (1.11) |
| `frag` | Player B, 2, on three heavy maps | carry 2, max 4, thrown | Keep; per-mission counts |
| `gas` | Grenade rare (Training, Elite); gas mostly via sticky camera | carry 2, max 4, thrown | Keep as minor; move most gas to the sticky camera |
| `flash` | 0-3 per player | carry 2, max 4 | Keep |
| `emp` | Not in the console co-op kit (chaff exists only on the handhelds) | carry 1, max 3 | Proposal: remove; the jammer replaces it |
| `noise` (noisemaker) | Not CT. Lures come from the sticky-camera clicker, shot lights, thrown objects, voice | carry 2, max 4 | Proposal: remove; fold the lure into the sticky camera |
| `stickyCam` | Launcher-fired; clicker lure; knockout gas; Share View | Thrown `stick` gadget, carry 2, max 3 | Rework: launcher round, clicker, gas, Share View |
| `mine` (prox mine, lethal, placed) | Wall mines never issued; level hazards to disarm | carry 1, max 3 | Proposal: remove as a carried gadget; wall mine later as a level hazard |
| Smoke grenade | Player B on two maps; both on the finale | Not built | Add (not in the prototype) |
| Shock round | Player A, 1-3 | Not built | Add (prototype) |
| Ring airfoil round | Player A, 3, on three maps; both on the finale | Not built | Add later (1.11) |
| Adrenaline syringe | 1 per player, 30 s, about half health | Co-op down / revive exists from the old modes (`gameState.ts` `reviveAll`), not the CT syringe | Build the CT revive (D-03) |
| Goggles | Thermal, electro, night | `vision.ts`: off, night, thermal, electro; cycle `off -> night -> thermal -> electro` | Cycle order differs from G100 (thermal, electro, night, off) |
| Wall medkits | Cabinets; heal by difficulty | Stations, +40 single-use placeholder (G98, G119) | Values: 1.13 |
| Loadout | Fixed per mission and per player | One inventory with default carry for every gadget | Per-mission, per-player loadout data |

### 1.11 Proposal for Michael: settling G76

**Proposal** (each line is one decision; ANALYSIS from 04 unless marked):

1. **Rifle attachments: the launcher only.** It is fitted from the start on both players and fires three rounds: sticky
   camera, shock round, ring airfoil round. Sniper and shotgun are CT solo attachments that the co-op never issues
   (game files), so under "pure CT co-op" they are not built. Alternative: keep them in G76 as unbuilt data.
2. **Pistol: one tool, two uses.** Primary fire shoots out lights (and people). Secondary is the hold-to-jam jammer on
   one device at a time: lights, cameras, laser emitters, turrets, sensors. Drains while held, refills on its own,
   moving cancels it, red-to-green aim light. This replaces the thrown EMP gadget.
3. **The ring airfoil: keep, as the second launcher knockout round.** It is in four of seven Mission loadouts and three
   Elite ones, carried by Player A (both on the finale), and gives the "precise shooter" role a ranged non-lethal
   option beside the shock round. CT gives no co-op difference between the two rounds beyond the projectile, so Night
   Shift can treat them as two counts of one behaviour at first. Not in the prototype.
4. **The knife: the close lethal option, not an inventory slot.** Always carried; it is the lethal outcome at close
   range (from a grab or a close attack), where the unarmed strike is the non-lethal one. Kills are scored (D-04). No
   mission requires a knife kill unless the beat is exempt from scoring and the players are told (anti-pattern A13).
   Elite's knife rule is uncertain in CT and not needed. Not in the prototype.
5. **Grenades: frag, flash, smoke and gas.** All four stay in the full kit with CT's per-mission counts. Gas grenades
   stay rare; the sticky camera is the main gas source.
6. **Remove:** the thrown EMP, the noisemaker, the carried proximity mine (the wall mine returns later as a level
   hazard to spot with electro vision and disarm).
7. **Items and verbs:** adrenaline syringe (1 per player, D-03), optic cable, lock pick and break lock, hands-on hacking
   (D-19), Share Equipment, Share View, mission items that assign roles.
8. **Loadouts: fixed per mission and per player, complementary** (D-11): Player A the launcher specialist, Player B the
   thrower, the finale identical. No loadout screen. The kit should state each mission's rule (light ammo for stealth
   missions, no spare magazines for a no-kill rule).

### 1.12 Prototype kit (the smallest set that makes the co-op beats work)

The prototype tests the co-op core (G4, G113). The beats it must carry, from the research: jam-and-pass at a camera or
light, shooting out a light so the partner can move, a sticky-camera lure and gas with Share View, a simultaneous
takedown, and a revive. Boost, ladder and throw are moves, not kit.

**Proposal: both players get the same prototype kit, with one asymmetric item to test the role split.**

| Item | Per player | Why it is in | Starting value (tune after play, G10) |
|---|---|---|---|
| Pistol, 20 + 20 rounds | Both | Shoots out lights; the core light verb | CT 20-round magazine |
| Pistol jammer (hold) | Both | The two-person gate; the most-used co-op tool | Charge about 20 s of hold (the one fan memory), refills when released; moving cancels. Refill rate is not documented: start at full in about 10 s (this digest's guess) |
| Rifle, 30 rounds, launcher fitted | Both | Lethal option; carries the launcher | CT Panama load |
| Sticky camera (launcher) | Both, 1 loaded + 1 spare | Scout, clicker lure, knockout gas, Share View | Gas destroys the camera |
| Shock round (launcher) | Player A only, 2 | Ranged one-shot knockout; tests the asymmetric kit | One hit, one knockout |
| Flash grenade | Player B only, 2 | The thrower role; flash-and-rush a pair | CT counts |
| Adrenaline syringe | Both, 1 | Revive (D-03) | 30 s window, about half health |
| Goggles: night, thermal, electro | Both | Already built; electro pairs with the jammer | G100 order |
| Goggle lamp colour | Both | Partner beacon (D-12) | Blue A, red B (CT) |

Not in the prototype: knife, ring airfoil, smoke, frag, gas grenade, wall mines, optic cable, lock-pick minigame (open
and break are enough), Share Equipment, Elite, pickups.

### 1.13 Wall medkit values (G119)

CT: medkit cabinets heal full on Normal, 50% on Hard and less on Expert (general CT values; co-op use assumed). No
source says whether a cabinet is reusable or heals both players; a save bug that destroys the kit suggests one kit per
cabinet (INFERRED). A revive restores about half health, and a medkit is the only way to top up afterwards.
**Proposal:** single use per cabinet, heal by difficulty (full / 50% / 30% on Expert, the Expert value being this
digest's guess for CT's "less"), one player per use. This fits D-08 (resources scale with difficulty).

---

## 2. Audio and atmosphere: what the prototype needs

### 2.1 Prototype items

| Need | CT fact | Night Shift rule | Prototype action |
|---|---|---|---|
| Partner voice | Online co-op used headsets; the partner was "constant contact" | D-17: always clear, earpiece model, no distance fade. D-06: guard hearing of voice is an opt-in modifier, off by default | Use the players' own voice (or an external voice app) as-is; no in-game proximity voice in the prototype |
| Callouts when there is no voice | Canned lines when a player starts a co-op move ("waiting"), when it completes, and when a player's health empties ("needs help"); directional calls on rope moves (left, right, up, down, stop) | G82: text now, voice later | A text line plus a short sound for "partner waiting" and "partner down"; the Co-op Action icon on the HUD |
| Sync without voice | Online without headsets, two-person actions sync automatically once both press (relaxed timing) | D-08: sync windows do not scale with difficulty | Two-person actions accept both presses within a generous window |
| Alert music | Silence is the default; music arrives on a placed trigger or a state change; detection raises it at once; layered intensity (four layers, roughly three states) | G63, G67: Cautious after 0.6 s of suspicion, Alert at once, holds 10 s, Evasion 12 s, Cautious 8 s, one step down at a time | Keep G67 as is. Add the CT lesson: music follows the real AI state with short tails and ducks under guard barks (anti-pattern A17: CT's music lingered about a minute and left players unsure whether they were seen) |
| Noise vs ambient | The noise meter shows player noise against an ambient marker; noise above the marker is heard | G61 | Already the model; place one masking source (a machine or radio) in the prototype room to test it |
| Jammer feedback | Red-to-green aim light (visual); disabled devices may crackle and lure guards | - | Aim light colour; a crackle on the jammed device that guards can hear |
| Light changes | Guards notice shot or switched-off lights and come to fix them | Light parity (bible 5.1) | Guards investigate a dead light (see 5, idea 1) |
| Alarm escalation | No game over on alarm; four escalating stages | D-02 | Use the existing alert tiers |
| Partner identification | Blue and red goggle lamps, readable in the dark and on split-screen; enemies cannot see them | D-12 | Lamps on both characters |

### 2.2 Everything else (after the prototype)

CT co-op reused solo music stem sets on a shared common set (no dedicated co-op score; one map ran on the common set
and ambience alone), with bespoke ambience banks for each base co-op map; menu music is not identified. The wider game
made the ambient noise floor part of level design (fountains, generators, radios, weather that masks noise, guards who
avoid rain and lightning that exposes), turned guard barks into a system of stress stages and calls to each other,
used eavesdropping, a cross-campaign radio beat and briefing tone for story, warned with sound before hidden state
returned (a laser grid coming back on), and gave each mission voiced guidance (the two downloads shipped text-only
guidance and players missed the voice). Positional 5.1 and room acoustics were praised. All of this waits for the
sound order in G66 (guards' footsteps, then ambience, then the rest) and the music job (G113).

---

## 3. Design findings

### 3.1 What made the co-op great (08 §2.4, §3.5, §4.1)

- **A separate campaign built for two**, not the solo game with a second body. Critics called it a highlight on about
  24 of 27 professional pieces (CONFIRMED).
- **Physical teamwork as the fantasy.** The design intent was reaching out and pulling a friend up a ledge. The
  remembered moves: throwing the partner over a laser or into a guard, the rope dangle to hack or knock out, boost and
  human ladder, dual rappel (CONFIRMED).
- **Objectives impossible alone**: simultaneous wire cuts, jam-and-run, twin scanners, captive escort (CONFIRMED).
- **Coordinated double takedowns** (CONFIRMED).
- **Voice as a stealth system**: guards heard the real microphone, so players whispered or lured on purpose. The most
  praised systems idea after the moves (CONFIRMED). Night Shift keeps it opt-in (D-06).
- **Soft failure**: the revive window and the rescue it creates ("one fell in front of a guard, the other cleared the
  room and revived him") is a named memory (CONFIRMED).
- **A parallel story** seen from the side (ONE SOURCE for critics; nine Steam reviews).
- **Developer view of the hard part**: synchronising two characters' actions; "you got to trust a partner" (ONE
  SOURCE).

### 3.2 Anti-patterns turned into rules (08 §4.4, §5.1)

| # | CT problem | Rule for Night Shift |
|---|---|---|
| A1 | No automatic checkpoints; a weak partner meant full restarts | Encounter checkpoints (D-03) |
| A2 | Losing each other; no partner marker | Partner beacon and world pings (D-12); regroup at two-person gates |
| A3 | Solutions placed above the problem with no tell (a keypad reached from a vent above) | Visible cause and effect: cable runs, a lit panel, a sound when state changes |
| A4 | Unreadable machine state (the fan puzzle) | Every machine shows its state in sight and sound; its control is near or visibly linked |
| A5 | Lethal precision sync puzzle (chemical mixing) | Forgiving timing, feedback per input, non-lethal failure |
| A6 | Two-person inputs failed on PC | Test every two-person action on pad and keyboard; always a fallback |
| A7 | Skipped optional intel caused a hard fail | Two or more cues before any hard fail; prefer recoverable failure |
| A9 | Fixed-spot moves felt like "press button, watch animation" | Mix free moves with authored spots; give each move more than one use; let players choose where and when |
| A13 | A scripted lethal beat in a game that rewards no kills | Non-lethal alternative, or exempt and tell the players |
| A14 | Hidden countdown (warnings only) | Show timers |
| A15 | Stacked instant-fail rules on the finale | At most one signposted hard rule per mission (D-02) |
| A17 | Music lingered, was ambiguous, drowned barks | Music follows real AI state, short tails, ducks under barks |
| A20 | The tutorial assumed solo knowledge; input ambiguity at the first wall | Teach the handshake and context rules explicitly; the co-op tutorial stands alone |
| - | Shared device screens (the bomb, the laser grid) had no input prompts | On-screen prompts, visible timer, a visible and audible live-wire cue |

### 3.3 Pacing numbers (08 §8.1, §8.7)

| Measure | CT evidence | Target (research pack, ANALYSIS) |
|---|---|---|
| Mission length, average pair | Stealth runs 13-45 min; casual 30-108 min; ghost runs 11-23 min | 30-60 min |
| Primary objectives | 2-6 per mission, about one per 5-10 min | 3-6, plus 1-3 optionals |
| Small co-op beat (hold-and-pass, boost) | Every 2-3 min | Every 2-4 min |
| Major co-op set piece | Every 5-8 min | Every 6-10 min |
| Signature set piece | Once per mission | 1-2, never repeated |
| Objective twist | At about 1/3 to 2/3 | One, at 40-60% |
| Rest beat | Dark service spaces after peaks | After each major set piece |
| Idle limit | - | No player idle for more than about 60 s |
| Campaign length | 4-6 hours; the most common criticism was too short | Scope to expectations |

Mission shape: soft co-op move at the entry (boost into a window, rappel down a silo), denser devices as it goes, a twist
that re-scopes the objective, a dark rest after each peak, a synchronised climax, a short exit.

### 3.4 Quality checks for each planned "wow" (08 §4.3)

Each mission plans one body moment (a two-body move that solves a real problem), one sync moment (a countdown where each
protects the other) and one story moment delivered in-world. Each must pass: a spectator understands it; players trigger
it and can fail it; each player has a real job; both can read the danger first; it can be retold in one sentence; it is
not repeated in the same mission.

---

## 4. Open questions: blockers vs ones that can wait

**No research gap blocks the prototype.** The gaps that would have (R-02, R-06, R-08, R-09, R-16, R-17, R-20, R-22, R-07,
R-15) were settled by Michael's D-15 to D-25. What is left before the kit is built are Night Shift decisions and starting
values, not research.

### 4.1 Needed before or during the prototype

| Item | Status | What unblocks it |
|---|---|---|
| G76 attachments, knife, ring airfoil, gadget removals | Open (G76 deferred to this research) | Michael answers 1.11 |
| Jammer charge length and refill rate | UNKNOWN in CT (one fan memory: about 20 s) | Starting value in 1.12, tuned in play |
| Co-op move timings (how long an initiator can wait, ranges) | UNKNOWN (06 checklist 7) | Starting values (G10) |
| Camera numbers in co-op | UNKNOWN (06 checklist 1) | D-14 plus starting values |
| Guard perception per difficulty | R-10 OPEN in CT | D-08 already says perception scales; numbers are tuning |
| Wall medkit heal and reuse | CT reuse UNKNOWN | Michael answers 1.13 (G119) |
| Vision cycle order | Code (`vision.ts`) cycles off, night, thermal, electro; G100 says thermal, electro, night, off | Align the code with G100 when the kit is built |

### 4.2 Can wait (mission builds, polish or history)

- R-11 partner marker: decided by D-12; only the CT presentation detail is unknown.
- R-03 remainder (both down on PS2/GC): decided by D-03 (both down reloads the checkpoint).
- R-10 detail, R-15 rating caps (D-23), R-16 serum (D-20), R-17 informant (D-22, D-25), R-19 and R-20 download routes
  (D-21 for lit windows): matter only when those missions are built.
- R-21 co-op menu music: the music job (G113).
- Share View presentation, objective notifications, quick save with two players, per-map palette and weather (06
  checklist 10, 11, 15, 20): HUD and mission work.
- Which items carry the Share Equipment dot; knife in Elite; meaning of the carry-limit block; Chemical Bunker pickups:
  kit detail for later.
- R-01, R-04, R-05, R-12, R-13, R-14, R-18, R-23: closed or purely historical (R-05, R-18, R-23 have no bearing on the
  new game, per OPEN_QUESTIONS).

---

## 5. G11: the nine movement-run ideas against CT

G11 (Michael, 2026-10-17): "Keep only CT ones." The nine are `docs/archive/locomotion/BIBLE-PROPOSALS.md` 1-9.

| # | Idea | Does CT have it? | Verdict |
|---|---|---|---|
| 1 | Guards undo player changes: relight lamps, check tripped breakers, close opened doors | **Partly.** Guards come to fix lights: a security-office guard leaves to switch the hall lights back on, an archive guard tries to turn the lights back on, server-hall guards investigate shot-out lights (03 §7.1, ONE SOURCE each: guide, wiki; used as a lure on the guide route, 01 and 02). Searching guards notice open doors, shot lights and missing colleagues (03 §7.7, CONFIRMED). Guards revive knocked-out colleagues (03 §7.8). Closing doors is not documented | **Keep**: guards come to switch lights back on and investigate dead lights; they notice open doors. Drop "close opened doors" as a behaviour unless found later |
| 2 | Room-clearing searches in pairs | **Yes, as impromptu teams.** Guards call to each other ("did you hear that?"), a second guard joins, they form impromptu search teams and call for cover (03 §7.9, 07 §3B.3, CONFIRMED: bonus-disc documentary, AI diary). Guard pairs chat on patrol | **Keep**, as CT's impromptu search team (a guard calls a buddy), not as a fixed pair rule. Works with D-16 (guards know only what they saw) |
| 3 | A player-facing last-known-position marker | **No.** CT shows no marker; the HUD is meters, partner health, an action icon, an alarm counter and a text box (08 §8.4). The marker belongs to a later game in the series (08 §3.9, ONE SOURCE). CT guards do go straight to a noise source and aim where the player's noise last exceeded ambient (07 §3B.1, ONE SOURCE: guide), which is AI behaviour, not UI | **Drop** the marker. Keep the AI behaviour (guards head for the last noise) |
| 4 | A digital layer: network tap, camera loop, badge clone, remote unlock, footage wipe | **Mostly no.** CT hacking is hands-on: computers, keypads, retinal scanners (with a captive), codes from intel, interrogation or watching a guard type (03 §8.3-8.5). In-world computers can switch devices elsewhere (a vent, ceiling sensors). The remote hack device is out (D-19). No camera loop, badge clone, network tap or footage wipe in the research | **Drop** the digital layer. CT's hands-on hacking, codes and in-world control computers stay (they are CT already) |
| 5 | Subtitled eavesdropping on guard conversations | **Yes.** Overhearing technicians from a crawlspace, bugging a payphone to hear the villain's call, server-room guards chatting with three random variants (07 §3A.7, CONFIRMED for the first two) | **Keep**, as subtitles (G82). Mind A17: no music over it |
| 6 | Lockpicking and bypasses with a skill and noise cost | **Yes.** Pin-sequence picking (2-6 pins seen) or breaking the lock, faster but noisy; door bashing (03 §8.2, 8.6, CONFIRMED) | **Keep** |
| 7 | Instant checkpoint retry in under 3 s | **No.** Xbox/PC co-op had no automatic checkpoints, only manual saves that wait for the partner; PS2/GC saved between sub-levels (03 §11, R-07 CLOSED) | **Drop** the under-3-second target. Note: Michael's later D-03 (2026-10-18) already adds encounter checkpoints capping lost play at about 10 min; that stands as his decision |
| 8 | An after-action route map | **No.** CT ends with an objective review (completed or failed), mission statistics (alarms, kills, knockouts, civilians) and a percentage per player (03 §13.1, CONFIRMED). No route map | **Drop** the route map. The CT statistics screen and rating (D-23) stay |
| 9 | Adaptive layered music | **Yes.** Each piece is written as stacked intensity layers the engine adds and removes; engine states idle, exploration, stress A and B, fight, death, failure, success (07 §1.3, §2.2, CONFIRMED) | **Keep** (G63, G67 already define the steps) |

Result: **keep 1 (lights part), 2, 5, 6, 9; drop 3, 4, 7, 8.**

---

## 6. Decisions this digest asks of Michael

1. G76 rifle attachments: launcher only, or keep sniper and shotgun as unbuilt data (1.11 item 1).
2. Pistol jammer replaces the thrown EMP (1.11 item 2).
3. Ring airfoil kept as a second launcher knockout round, after the prototype (1.11 item 3).
4. Knife as the always-carried close lethal option, no slot, not in the prototype (1.11 item 4).
5. Remove the noisemaker and the carried proximity mine (1.11 item 6).
6. The prototype kit in 1.12, including the one asymmetric pair (shock rounds on Player A, flash on Player B).
7. G119 medkit: single use, heal by difficulty (1.13).
8. G11 verdicts in Section 5.

---

## Sources used for this digest

- `docs/ct-research/source/00-index.md` (method, confidence marks, source codes)
- `docs/ct-research/source/03-mechanics.md` (§3 medkits, §7 guard senses, §8 doors and locks, §11 saving, §13 scoring)
- `docs/ct-research/source/04-kit.md` (all sections)
- `docs/ct-research/source/06-open-questions.md` (§1 status, R-06, R-10, R-11, §2.4, §2.9, §3, §4, §5)
- `docs/ct-research/source/07-audio-and-atmosphere.md` (§1, §2.2, §3A, §3B.1-3B.6, §4A.1-4A.3, §5A, §6, §7)
- `docs/ct-research/source/08-reception-and-design-findings.md` (§1.1, §1.4, §2.4, §2.5, §3.5, §4.1, §4.3, §4.4,
  §5.1, §5.2, §8.1, §8.2, §8.4-8.7)
- `docs/ct-research/source/01-coop-levels.md` and `02-coop-moves.md` (grep only: guards switching lights back on,
  jammer timing)
- `docs/ct-research/source/raw/OPEN_QUESTIONS.md` (R-01 to R-23 status; D-01 to D-25)
- `docs/DECISIONS.md` (vision summary, G2, G4, G11, G49, G52, G58-G67, G76, G82, G95, G98-G100, G113-G122)
- `docs/archive/locomotion/BIBLE-PROPOSALS.md` (proposals 1-9)
- Code: `src/game/gadgets.ts`, `src/game/gadgetSystem.ts`, `src/world/lights.ts`, `src/config/arsenal.ts`,
  `src/weapons/weaponDefs.ts`, `src/game/vision.ts`, `src/game/gameState.ts`
