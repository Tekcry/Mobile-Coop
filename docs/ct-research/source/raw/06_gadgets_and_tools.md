# 06 - Gadgets, weapons and tools in co-op

Every piece of equipment available in the *Chaos Theory* co-op mode: what it does, how it differs from solo play, and how the levels are built around it.

**Sources:** Xbox manual (XBM), PS2 manual (PS2M), Prima Official eGuide (PRIMA), English and Russian Fandom wikis (FW/RUW), IGN wiki guide (IGNW). Full references are in `research_notes/coop_gadgets_controls_comms.md` and `01_sources.md`.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## 1. Rules that differ from solo

- **No whistle.** The whistle button becomes the Co-op Action button. [VERIFIED - PRIMA, XBM, FW]
- **The pistol's OCP becomes the co-op "jammer".** It works hold-to-jam rather than fire-and-forget (see 3.1). [VERIFIED - XBM, PS2M, PRIMA, FW]
- **The EEV may be unavailable.** The remote scanning/hacking device is not available in co-op according to PRIMA, but the Xbox manual's co-op controller diagram still labels an EEV button. [UNCERTAIN - OPEN_QUESTIONS R-02]
- **Fixed loadouts.** No co-op loadout selection screen is documented. Each mission has a fixed kit per agent. [SINGLE SOURCE - PRIMA gear boxes; absence otherwise UNCERTAIN]
- **Asymmetric on Xbox/PC, symmetric on PS2/GC.**
  - On Xbox/PC, Agent One carries the launcher payloads (sticky cameras in quantity, sticky shockers, ring airfoil rounds) and Agent Two carries hand grenades (flash, smoke, frag). [VERIFIED - RUW tables + PRIMA gear boxes for two missions]
  - On PS2/GC both agents get identical kit per sub-level. [VERIFIED - FW sub-level pages + PRIMA]
- **Sharing.** Items marked with a dot can be handed to the partner. [VERIFIED - XBM, PS2M, PRIMA]
- **Elite mode** (unlocked after Story). Firearm ammo is zero. Sources disagree on whether the knife is still allowed (Xbox manual) or only non-lethal tools are (PRIMA). Elite loadouts swap in gas grenades or reduced shocker/airfoil counts. [Zero ammo VERIFIED - XBM, RUW; the rest UNCERTAIN]

---

## 2. Per-mission loadouts

### Xbox/PC, normal ("Mission") difficulty [VERIFIED - RUW + game-file map settings (PC 1.05, Xbox build, Xbox download packages); consistent with PRIMA for Chemical Bunker and Train Station]

**How the two sources line up.** The map settings list only *spare* items: spare magazines and spare launcher rounds. The wiki counts add the one already loaded. So 2 spare rifle magazines = 30 + 60 = 90 rounds, and 0 spare sticky cameras = 1 in the launcher. On that reading every co-op map matches the wiki, except UN HQ's split of items between agents (see the row). The reading is our inference. [UNCERTAIN for the mechanism; the numbers match on all seven maps]

| Mission | Agent One | Agent Two |
|---|---|---|
| Training Facility | Rifle 30, pistol 20, adrenaline 1 | Same |
| Panama | Rifle 30, sticky cam 2, sticky shocker 1, pistol 60, adrenaline 1 | Rifle 30, sticky cam 1, smoke 2, flash 2, pistol 60, adrenaline 1 |
| Seoul | Rifle 90, sticky cam 1, shocker 3, airfoil 3, pistol 60, flash 2, adrenaline 1 | Rifle 90, sticky cam 4, pistol 60, frag 2, adrenaline 1 |
| Chemical Bunker | Rifle 90, sticky cam 4, shocker 3, airfoil 3, pistol 60, adrenaline 1 | Rifle 90, sticky cam 1, pistol 60, frag 2, flash 2, adrenaline 1 |
| Train Station | Rifle 60, sticky cam 1, shocker 3, airfoil 3, pistol 40, flash 2, adrenaline 1 | Rifle 60, sticky cam 3, pistol 40, frag 2, adrenaline 1 |
| Nuclear Plant | Rifle 30, sticky cam 2, shocker 1, pistol 60, adrenaline 1 | Rifle 30, sticky cam 1, flash 2, smoke 2, pistol 60, adrenaline 1 |
| UN HQ | Rifle 30, pistol 20 (no spare magazines), sticky cam 4, shocker 3, airfoil 3, flash 3, smoke 3, adrenaline 1 | **Identical** (game files give both agents the same kit; the wiki splits shockers/airfoils and flash/smoke between them) |

**Observation.** Ammunition tracks mission tone:
- **Light kit (30 rifle rounds):** the stealth-only missions (Panama, Nuclear Plant, UN HQ, where lethal force is restricted).
- **Heavy kit (90 rounds):** Seoul (a war zone) and Chemical Bunker.

This is the designers using the loadout to tell players how to play. [Analysis based on SINGLE SOURCE data]

### PS2/GameCube [VERIFIED - FW + PRIMA]

**Base kit (every sub-level, both agents):** Rifle 60, pistol 40, adrenaline 2. On top of that:

| Mission / sub-levels | Extra kit per agent |
|---|---|
| Team Training | Flash 1 |
| Seoul (all sub-levels except Gardens) | Sticky cam 1, flash 1 |
| Seoul: Gardens | Sticky cam 1 (no flash) |
| Chemical Bunker (all five) | Sticky cam 1, flash 1 |
| Train Station (all four) | Sticky cam 2, frag 1 |
| Panama: The Alley | Sticky cam 1, flash 1 |
| Panama: East Wing, Archives, Server Room | Sticky cam 2, flash 1 |

**Level pickups:**
- **Wall mines** can be picked up in several sub-levels. [SINGLE SOURCE - FW]
- **Disarming placed wall mines** is a recurring task on the guide's PS2/GC route. EMF vision helps spot them. [SINGLE SOURCE - PRIMA]

---

## 3. Item-by-item

### 3.1 The co-op jammer (pistol OCP in co-op mode)
- **What it does.** Aim the pistol at an electronic device (light, camera, laser emitter, turret, mobile sensor) and *hold* the secondary trigger.
  - The device stays off only while the trigger is held and charge remains. Moving cancels it.
  - The charge drains while held and refills on its own.
  - The light on the gun is red, and turns green on a valid target.
  - Tapping rapidly stretches the charge.
  - [VERIFIED - XBM, PS2M, PRIMA, FW]
- **Why it matters.** The manuals call it the co-op-only gadget, and it is the most-used co-op tool. Because the jammer holds a device off only while someone stands still holding it, **one player physically cannot get both of them past a camera alone**. Every camera or laser gate becomes a two-person gate. [VERIFIED]
- **Level patterns built on it:**
  - **Jam-and-pass, then swap.** Seen in Training, the Panama camera and laser grid (used in both directions), and throughout PS2/GC.
  - **Turret flank.** One player jams a turret while the partner runs behind it to its switch (Seoul, Train Station).
  - **Light kill.** One player jams an overhead light so the partner can drop unseen (PS2/GC Seoul).
  - **Escort.** Jam a camera while escorting a captive to a scanner (PS2/GC Panama).
  - [VERIFIED - PRIMA, IGNW, FW]

### 3.2 Weapons
| Item | Co-op use | Confidence |
|---|---|---|
| Assault rifle (SC-20K) | Both agents carry it. Agent One's gear includes the launcher attachment for shockers, airfoil rounds and cameras. Other attachments (sniper, shotgun, foregrip) are not documented for co-op. | [SINGLE SOURCE - PRIMA; attachments = gap] |
| Pistol | Both agents carry it. Shoots out lights and carries the jammer. Usable while hanging upside down, rappelling or on a partner's shoulders. | [VERIFIED] |
| Knife | Close-quarters kills, e.g. the infected soldier in Train Station. Possibly the only lethal option in Elite. | [VERIFIED - PRIMA, XBM] |
| Frag grenade | Agent Two on Xbox/PC (Seoul, Chemical Bunker, Train Station); both agents on PS2/GC Train Station. | [VERIFIED] |

### 3.3 Non-lethal and utility
| Item | Co-op use | Confidence |
|---|---|---|
| Sticky camera | Launched onto surfaces for scouting. It can also make a noise to lure guards and release knockout gas, which destroys the camera. The partner can watch the feed through Share View. A wiki tip says a camera plus thermal or night vision can read the keypad codes guards type in UN HQ. | [VERIFIED - PS2M, XBM, PRIMA, FW] |
| Sticky shocker | Agent One only (Xbox/PC). One-shot knockout, e.g. stunning Jong through a cafe window in Seoul. | [VERIFIED - RUW, PRIMA] |
| Ring airfoil round | Agent One only (Xbox/PC). A blunt projectile that knocks out in one hit. | [VERIFIED - RUW, PRIMA, FW] |
| Flash grenade | Blinds. On the PS2/GC route, flash two guards, then each agent grabs one and walks him to a retinal scanner. | [VERIFIED] |
| Smoke grenade | Agent Two in Panama, Nuclear Plant and UN HQ. | [SINGLE SOURCE - RUW] |
| Gas grenade | Elite loadouts only; one pickup in UN HQ. | [SINGLE SOURCE - RUW] |
| Wall mine | A pickup, and a hazard to disarm. | [VERIFIED - FW, PRIMA] |
| Explosive charge | Placed from a partner's shoulders on the Seoul anti-aircraft vehicles and the PS2/GC Panama elevator, then detonated remotely. | [VERIFIED - PRIMA, IGNW, RUW] |
| Adrenaline syringe | The revive item. Restores about half health within a 30-second window. | [VERIFIED] |
| Medical kits | Wall cabinets, as in solo (one in Training's laser room, three in Seoul). | [VERIFIED - RUW, IGNW] |

### 3.4 Vision, sensing, access
| Item | Co-op use | Confidence |
|---|---|---|
| Multi-vision goggles (night, thermal, electromagnetic) | Thermal reveals which bomb wire is live (Chemical Bunker missile, Train Station bombs). Electromagnetic vision spots cameras, turrets and mines. Each agent's goggle lamps glow a different colour (blue for Agent One, red for Agent Two), so a partner can be identified in the dark. | [VERIFIED - PRIMA, XBM; lamp colours SINGLE SOURCE - FW] |
| Optic cable | Peek under doors. | [SINGLE SOURCE - IGNW] |
| Lock pick / breaking locks | Pin-sequence lock picking; breaking a lock is faster but noisy. UN HQ uses 6-pin locks, the hardest tier. | [VERIFIED - FW, PRIMA, IGNW] |
| Hacking (computers, keypads, retinal scanners) | Done by touch. Failure can trip alarms, and in training a failed scanner hack costs health. Hacking is harder on Expert. An agent can hack while hanging upside down. | [VERIFIED - PS2M, FW/RUW, PRIMA] |
| Binoculars | Not in the co-op kit (Versus spies only). | [VERIFIED - FW, XBM] |
| Rope | Not an inventory item. Ropes exist only at the placed rappel and hang spots. | [VERIFIED - XBM, PRIMA] |
| Mission items | Antidote vials: only one agent can carry the antidote in Train Station, so only he can enter the contaminated room. Also the anti-virus sample, the viral sample, and bugs for phones. | [VERIFIED - RUW, PRIMA] |

---

## 4. How levels are built around equipment

1. **Two-person gates through a "hold" mechanic.** The jammer turns every camera, laser or turret into a gate that needs one player holding and one player moving. It is the cheapest way to force cooperation without scripting. [VERIFIED pattern]
2. **Complementary kits.** On Xbox/PC one agent is the precise single-target shooter and the other is the area-effect thrower. Combined with sharing, this nudges players to plan together ("you shock the near guard, I'll flash the pair"). [VERIFIED data; interpretation is analysis]
3. **Goggle-gated information.** Live wires appear only in thermal, and mines and cameras show best in electromagnetic vision. Information is hidden in plain sight for players who switch vision modes, and players can share it by voice ("left wire is hot"). [VERIFIED]
4. **Loadout as tone-setter.** Low ammunition and non-lethal emphasis in the infiltration missions; more ammunition and frags in the war-zone mission. [Analysis based on SINGLE SOURCE data]
5. **Mission items that create role asymmetry.** One antidote means only one player enters the contaminated room. The other covers or waits, so the mission writes the role split for the players. [VERIFIED]
6. **Knockout tools as alarm control.** Gas cameras, shockers and airfoil rounds let a pair neutralise two guards at once. That supports the simultaneous-takedown tactic used across the guide's routes. [SINGLE SOURCE - PRIMA]

---

## 5. Gaps

- EEV in co-op (R-02).
- Rifle attachments other than the launcher in co-op.
- Whether Elite allows the knife.
- Adrenaline counts: closed for Xbox/PC (§6); the PS2/GC count is unchecked.
- Whether the OPSAT map shows the partner.

## 6. Gap-closing update (primary game files)

Source: map settings files from an installed PC 1.05 copy and the original Xbox Live download packages, both on archive.org. See `research_notes/gap_closing_gamefiles.md`.

- **Loadouts cross-checked against the game's map settings files** (see the note above §2's table). Results:
  - The wiki table is confirmed for all seven maps.
  - UN Headquarters gives **both** agents the same kit: the largest non-lethal stock in the campaign and no spare magazines at all. The kit signals the mission's no-kill rule. [VERIFIED - identical Xbox and PC files]
  - Elite mode cuts each agent to one or two non-lethal items. [VERIFIED - game files]
  - Training gives each agent one gas grenade, which the wiki omits. [SINGLE SOURCE - game files]
  - *Correction note:* an earlier draft of this file read "0 spare magazines" as "no ammunition". That was wrong and has been reverted.
- **Adrenaline.** The in-game training text says each agent carries one syringe, so a team can revive twice per mission. The guide's "two each" is wrong for Xbox/PC. [VERIFIED - Xbox build + PC 1.05 text; matches both manuals]
- **Share Equipment shipped.** Its training note was deliberately left unused, per a designer comment. [SINGLE SOURCE - Xbox build level file]
- **Remote scan/hack device.** It is still bound to a key in the co-op controls, and no co-op file disables it. Whether it works in co-op stays open (R-02).
- **Friendly fire.**
  - Xbox match creation includes a friendly-fire option. [SINGLE SOURCE]
  - The PC co-op menu has no friendly-fire option, and the PC settings default it to on. [SINGLE SOURCE; UNCERTAIN until checked in-game]
