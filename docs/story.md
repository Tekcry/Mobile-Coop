# Night Shift - Story and world

> **Status (2026-10-25).** Maps that exist now: Marlow Yard (co-op training, `ctcourse`), Saltmarsh Park (Sector Ops,
> `campusOps`) and Tallow Wharf, the new small campaign map (mission-framework, `docs/missions/`, G293). Tallow Wharf is
> campaign Mission 1 (2026-10-25 ~10:45); "Dead Line" on the Kestrel map is paused (G53). The mission list below is the
> story plan, not the build order.

Version 2.1 - 2026-10-18. (2.1: two-player campaign with Wren and Moth in the field and Tally and Sexton on the radio
(G2, G71, G112); no traitor and no player-versus-player finale (G9); text now, voiced later (G82); Wren stays 1.68 m
(G74). 2.0, 2026-10-10: present-day campaign; Mission 1 at a colocation data centre; Mission 5 The Strongroom. 1.2: the
Client is Alistair Crane; the operators' real names.)

- This document is the authority on story, setting, characters and in-game text.
- `docs/DECISIONS.md` and `docs/design-bible.md` win on anything that affects gameplay.
- All names here are original. No reference-game names, organisations or plot (G6).
- The Mission 1 site **Cinder Yard** and its operator **Ostler Colocation** are working names, made final with the
  missions (STORY-03).

---

## 1. Premise

**Hook:** someone is going to switch off a whole city. The only people who can stop them are the ones who work best in the dark.

**Logline:**

- A deniable unit, NIGHT SHIFT, sends two operators into a data centre in the old railway district to tap a broker's private fibre. On it they hear one word: SUNDOWN.
- In nine nights someone will black out the port city of Hollowmere, take its emergency systems while the backups fail over to rigged hardware, and sell the demonstration to the highest bidder.
- The team that lives in shadow has to keep the lights on.
- **The twist:** the Client is the director of the office that sends Night Shift in.

**The irony at the heart of it:** the gameplay is about darkness - you make it, you use it, you hide in it. The story is about a city that must not go dark.
In the final mission the team turns the lights back on. The last image is Hollowmere lighting up block by block, seen from a rooftop.

---

## 2. Tone and writing rules

**Tone: a grounded techno-thriller with dry humour** (Michael's choice).

- Real stakes, plausible technology, professionals who are good at their jobs.
- Humour comes from character and understatement, never from jokes that break tension.

**Text now, voice later (G82).** Radio and subtitles are text. Every line is written so it can be voiced later
(backlog item 6). Sound effects and music may use CC0 recordings (G58); this rule is about voices.

**Radio lines:**

- One or two lines on screen: 90 characters or less per message.
- Never more than three messages in a row without player action.
- No exposition dumps:
  - the briefing carries the plot;
  - the radio carries texture, warnings and character;
  - found intel carries the secrets.
- No humour while guards are alert or searching. Humour returns when it is quiet.

**Language:**

- British setting, British spelling in all game text.
- Mild language only ("bloody" is about the limit).

**What to avoid:**

- Real brands, real politics, real agencies.
- Cartoon villains. The antagonists are business people selling a capability.

---

## 3. Setting: Hollowmere, the present day

A rain-soaked northern British port city, 2026 onwards. Old infrastructure, sold off piece by piece, run by contractors. Everyone has a phone; nobody knows where their data lives.

**The city grid:**

- The city's power grid, flood barrier and emergency dispatch are run under one contract by **Halcyon Grid Services**.
- Halcyon runs all three from software. Its control systems sit on servers in rented data centre space, talk to the sites over fibre, and fall back to radio links when the fibre fails.
- That single point of control is what makes SUNDOWN possible.

**The technology, in plain words** (for writers; keep it this simple in game text):

- **Data centre:** a windowless building full of other people's computers, with its own power, cooling and guards.
- **Colocation:** companies rent space there by the rack (a tall metal cabinet) or the cage (a locked mesh room of racks).
- **Cross-connect:** a fibre cable the data centre runs between two customers so they can talk privately, without the internet in between.
- **Meet-me room:** where the cross-connects and the carriers' lines meet. Whoever reads its records knows who talks to whom.
- **Passive fibre tap:** a small splitter clipped onto a fibre. It copies the light without breaking the line, so nobody notices.
- **Failover:** the backup that takes over when the main system dies. SUNDOWN's trick is to own the backup.

**Districts used by the campaign:**

| District | Character | Mission |
| --- | --- | --- |
| **Kestrel** | The old railway and industrial district, now data centres, depots and the viaduct; narrow lanes | 1 |
| **The Docks** | Automated cold stores, cranes, container stacks | 2 |
| **The Barrier** | The tidal flood barrier and its pumping stations on the estuary | 3 |
| **Meridian Quay** | New glass business district; Halcyon's tower | 4 |
| **The old town** | Victorian streets; the old bank (now a private vault company) and a private clinic | 5, 6 |
| **The Cutting** | The freight line and tunnels under the old town, out to the Ashgrove sidings | 7 |
| **Ashgrove** | The city's main substation and grid control centre | 7, 8 |

Every mission is at night. Rain is common. Moonlight and street light matter.

---

## 4. Night Shift and the Continuity Office

**The Continuity Office** is a small, quiet government office that watches over critical infrastructure.

- It has no police powers and no public budget line.
- When something cannot be done officially, it calls Night Shift.
- **Its director is Alistair Crane,** Peg's boss: polished, patient, trusted by ministers. He is the Client (Section 5).

**Night Shift** is a handler, two field operators and two radio crew.

- Deniable: if caught, they were never there. They prefer nobody gets hurt; the rating rewards that, and so does the story.
- The two players are the field operators, **Wren** and **Moth** (G71). **Tally** and **Sexton** stay off the map:
  radio and briefing characters, never playable (G112).

### The handler: Margaret "Peg" Ashdown, callsign LANTERN

- **Background:** fifties. Started as a fibre jointer for a phone carrier in the 1990s, splicing cable in the ducts under Kestrel.
  - In 2003 she pulled the first fibre into the Mission 1 data centre, through the carrier entrance under its yard.
  - Moved into signals intelligence and never left. Knows every tunnel, duct and substation in Hollowmere by heart.
- **Voice:** dry, warm, unflappable. Treats the operators like gifted but untidy apprentices. Never wrong about wiring.
- **Role in play:** briefings; radio guidance; warnings on detection, bodies and alarms; praise at checkpoints, rationed.
- **Mission 6:** she is taken and the radio goes silent. The team has to do without her.

**Sample lines:**

- "Evening, Night Shift. Cinder Yard. I pulled the first fibre into that building."
- "They've seen you. Break line of sight. Don't argue with them."
- "Good. Breathe."
- "That's the battery room. Don't lick anything."

### The field operators (the players)

Looks and personality only. Both move the same; they differ in look and height (G109). Both are realistic characters
(G68); their art is built on `feature/operators` (G75).

#### WREN - team lead

- **Background:** ex-military, thirties. Says as little as possible. Carries the team's conscience without mentioning it.
- **Look:** 1.68 m (G74), close-fitting hood. **Green goggle light.**
- **Voice:** "Moving." "Clear." "Wait." Rarely a full sentence, so when Wren talks at length it matters.

#### MOTH - climber

- **Background:** ex-steeplejack, twenties. Grew up on scaffolding and phone masts. Cheerful, curious, too fond of heights.
- **The running joke:** Moth is drawn to light. It is a terrible trait in this job.
- **Look:** lean, rolled sleeves, climbing harness. **Amber goggle light.**
- **Voice:** chatty when it is quiet, quick when it is not.
  - "I can see the whole yard from here. Lovely view. Two guards."

### The radio crew

#### TALLY - signals and hacking

- **Background:** ex-telecom network engineer, Peg's protégé, twenties. Thinks in diagrams. Works the networks remotely.
- **Character beat:** takes Peg's capture personally. Mission 6 is Tally's mission.
- **Voice:** precise, fast, a little nervous, funny without meaning to be.
  - "That's not a server. That's a server pretending to be three servers."

#### SEXTON - surveillance

- **Background:** ex-police surveillance, the oldest, fifties. Patient. Gallows humour. Knows how guards think because he used to stand where they stand. Watches from rooftops and camera feeds.
- **Voice:** slow, deadpan.
  - "Rain's on our side tonight. Nobody looks up in the rain."
  - Moth: "I look up in the rain."
  - Sexton: "Nobody sensible."

**Real names** (decided 2026-10-08). The team uses callsigns. Real names appear only in dossiers found as intel.

| Callsign | Real name | Why the callsign |
| --- | --- | --- |
| Wren | Imogen Hale | Quick, quiet, hard to spot. Given by her old unit. |
| Moth | Danny Mensah | Drawn to light. The team's running joke. |
| Tally | Priya Tallis | From her surname, and she counts everything. |
| Sexton | Graham Mallory | Ex-police who "digs things up". Gravedigger humour. |

---

## 5. The antagonists

**Aldous Pell, "the Switchboard"** - a broker who sells connections, not data.

- He rents cages in Hollowmere's data centres through shell companies. Tonight's is in the name of **Ansell & Crowe Ltd**.
- Inside each cage are a few plain servers and a lot of cross-connects. Parties who must never be seen talking each run a fibre to Pell, and he passes messages between them.
- He doesn't steal data; he relays. His cage carries SUNDOWN's orders between the Client and Halcyon insiders.
- Mission 1 taps his cross-connect. Mission 4 shows his double game. In Mission 5 he sells Night Shift out to save himself.

**Halcyon Grid Services** - the contractor.

- Most staff are honest. The guards in their buildings are contracted security who believe they are protecting a business.
- A few senior people are in on it. They installed the compromised failover hardware.

**The Client: Alistair Crane, director of the Continuity Office** (decided 2026-10-08).

**Motive:**

- He sells "a city switched off on demand" to buyers who want that capability. Hollowmere is the showroom.
- He also uses the disaster to prove the city needs his Office, to win more power and budget.

**Why it fits:**

- He knows where Peg will be. That is how she is taken (Mission 6).
- He hears every briefing. That is how SUNDOWN can start early (Mission 7).

**How the reveals land:**

1. Missions 1-5: Crane appears only in passing, as Peg's calm, supportive boss in a briefing or two.
2. **Mission 6:** while rescuing Peg, intel proves Crane authorised her transfer. The Client has a face, and it is their own side.
3. **Mission 7:** Crane, exposed, starts SUNDOWN early.
4. **Mission 8:** Open, decided with missions (STORY-04, G9): no traitor; replacement plot to be written.

**What SUNDOWN is:**

1. A staged citywide blackout.
2. When the grid fails, the emergency systems (flood barrier control, dispatch, hospital backup) fail over to hardware Halcyon installed.
3. That hardware answers to the Client.
4. For one night, whoever holds it holds the city, and buyers watch.

---

## 6. Campaign outline

Each mission gets a story beat, a gameplay showcase and a co-op highlight. The missions follow the CT co-op research
(G3); the Kestrel map (Mission 1) is paused until after it (G53).

| # | Mission | Location | Story beat | Gameplay showcase | Co-op highlight |
| --- | --- | --- | --- | --- | --- |
| 1 | **Dead Line** | Colocation data centre, Kestrel | Tap Pell's cross-connect. Learn SUNDOWN and its date: nine nights. **Ends:** his traffic names failover units "already delivered". | Light and shadow fundamentals; CT movement; modern security: cameras, keycards, mantrap, iris scanner, beams, motion lights | First team moves; light control (one kills the lights, one crosses); one blinds the cameras while the other moves |
| 2 | **Cold Storage** | Automated port cold store, the Docks | Track the failover hardware Pell's traffic mentioned. **Ends:** it was shipped weeks ago and is already installed somewhere. The serials point to the Barrier. | Cold store fog, robot crane heights, loud metal floors | Split-and-converge: two manifests at once |
| 3 | **High Water** | Tidal barrier pumping station | The barrier runs on the rigged failover. **Ends:** in a blackout the gates open on a spring tide and the city floods. Halcyon signed it off. | Water noise masks you; pumping machinery; rain | Sync takedowns on a gantry patrol |
| 4 | **Glass House** | Halcyon's tower, Meridian Quay | Inside Halcyon: names, contracts, Pell's double game. **Ends:** Pell keeps his own copy of every order, held in escrow in an old town vault, as his insurance. | Lit offices with motion-sensor lighting: light is the enemy; making darkness | Split floors: one in the server room, one on the executive floor |
| 5 | **The Strongroom** | Victorian bank, old town, now a private vault company | Take Pell's escrow and records from the old vault. Pell sells the team out. **Ends:** the Client learns who Peg is. | Old building meets modern security: the vault, beams, cameras, time locks | Both players on the vault and the alarm at once |
| 6 | **Lantern Out** | Private clinic, old town | Peg has been taken. Rescue her. **Ends:** intel proves Crane, the Office's own director, is the Client. | **No radio.** Objectives come only from intel found in the level. | Coordination by pings alone: the purest co-op mission |
| 7 | **Substation Zero** | Ashgrove substation | Exposed, Crane starts SUNDOWN early, mid-mission. Optional: stop the last failover hardware arriving by rail at the Ashgrove siding. **Ends:** the city is dark and grid control is the only way back. | **The blackout:** lights fail across the map in real time; guards switch to torches and night vision; the main mechanic flips. Optional set piece on the siding. | Holding a dark map against torches; clutch saves |
| 8 | **Sundown** | Ashgrove grid control | Open, decided with missions (STORY-04, G9): no traitor; replacement plot to be written. | Open (Section 9) | Decided with the missions (Section 9) |

**The leaks in Missions 5-7** (Pell knows the team is coming to the vault and whom to sell them to, Mission 5; the
Client knows where Peg is, Mission 6; SUNDOWN starts early, Mission 7) were the traitor's doing. Who leaks now:
Open, decided with missions (STORY-04, G9): no traitor; replacement plot to be written.

**The ending:** Open, decided with missions (STORY-04, G9): no traitor; replacement plot to be written.

**Rules for mission writing:**

- Every mission is played by two players and cannot be completed solo (G2). Its co-op highlight is the heart of it.
- The mission's briefing explains why the team is there in 4-6 lines. Plot details come from found intel and the radio.
- Each mission ends on a reveal or a decision that pulls into the next.

### 6.1 Mission 1 brief: Dead Line (story terms, for the level designers)

Numbers here (guards, objectives) are story intent; the map's numbers are set when Kestrel is decided after the
research (G53, G118).

**The site and its night.** Cinder Yard, a colocation data centre run by Ostler Colocation on the old goods yard in Kestrel, under the viaduct. It is a normal Tuesday: rain, the hum of the cooling, the generator's weekly test due before dawn. Pell's cage there is rented by Ansell & Crowe Ltd. The name "Dead Line" is Peg's joke: a fibre nobody seems to use.

**The people.**

- **Security:** officers from a contracted guarding firm. They believe they protect a business. 16 on site tonight, because Pell paid for extra cover during a handover.
- **The handover:** a van is being loaded in the yard. Its officers are Pell's extra cover.
- **The civilian:** the night duty engineer, the one Ostler employee on shift. Harmless. Never kill them.

**The objectives, as LANTERN briefs them:**

1. Get inside the perimeter.
2. Get a keycard.
3. Blind the security room, so nobody watches the cameras.
4. Find Pell's cage number in Ostler's own records.
5. Get into the secure zone. It wants a card and an iris scan: borrow an authorised person, or come in my way, through the carrier entrance.
6. Tap his cross-connect with a passive fibre tap. He must never know.
7. Leave through the yard while the generator runs its weekly test. Nobody hears anything over that.

**Optional:** copy his cage access log (who visits him, and when); photograph his rack's labels (who he connects).

**The lure:** trip the data hall cooling and the staff go to it. Peg: "Nothing empties a room faster than a warm server."

**The twist on the way out.** The tap's first capture arrives as the team crosses the yard. Pell is not selling data; he relays orders. One word, SUNDOWN, and a date: nine nights. One order confirms failover units "already delivered". The van in the yard was never the point.

---

## 7. Radio system rules (for writers and the mission framework)

**Speakers:** LANTERN, Tally and Sexton on the radio, Wren and Moth in the field, and occasionally intercepted enemy
radio (guards, Pell). Each speaker has a label and a colour.

**Two players are always in the field.** Lines are written for both operators present.

- Tally and Sexton radio in from elsewhere (working a network remotely, watching from a roof or a camera feed).
- **Tokens:** `{player}`, `{team}`, `{lead}` (the first player in the lobby). Which callsign each player carries is
  open (TRAIN-09).

**Event lines, from a pool with cooldowns:**

- spotted
- suspicious guard
- body found
- alarm raised
- checkpoint reached
- objective done
- teammate down and revived
- sync success
- clutch save

**Mission 6:** LANTERN is silent. Operator and crew lines only, and fewer of them.

**Every line respects the rules in Section 2.**

---

## 8. Sample opening: Dead Line

Briefing (screen text, before the mission):

```
Cinder Yard. Ostler Colocation's data centre in Kestrel, under the viaduct.
Aldous Pell rents a cage there under another name. Something big goes through it.
Tonight he's paid for extra guards. A van is loading in the yard.
Find his cage, tap his fibre, and leave him none the wiser.
Nobody gets hurt. The duty engineer is a civilian. They go home tonight.
```

Radio (lines in brackets are player action):

```
LANTERN: Evening, Night Shift. Cinder Yard. I pulled the first fibre into that building.
LANTERN: Over the lane fence, both of you. Keep to the wall - the yard lights are on sensors.
[players cross the lane]
SEXTON: I'm on the depot roof across the lane. Van's being loaded in the yard.
SEXTON: Rain's on our side tonight. Nobody looks up in the rain.
MOTH: I look up in the rain.
[players move]
SEXTON: Nobody sensible.
LANTERN: Card, cameras, cage. Tap his line, out through the yard. Stay in the dark.
[players are inside the perimeter]
TALLY: Cooling alarm brings the duty engineer running. Just saying.
LANTERN: The carrier entrance is under the yard. My cable's still in it.
[a player taps the cross-connect]
TALLY: Tap's on. Light's coming through clean. He'll never know.
...
[players cross the yard during the generator test]
TALLY (end): Peg... he's not selling data. He's relaying orders. Someone called SUNDOWN.
TALLY (end): Nine nights. And the hardware's already delivered.
LANTERN: Then we've nine nights. Come home.
```

---

## 9. Open story items

Decided with the missions (Michael: "Decide with missions", STORY-03, STORY-04):

1. **The site and company names** Cinder Yard and Ostler Colocation (working names until then).
2. **The epilogue lines** for the ending (once the ending is written, item 9).
3. **Mission 6's location detail** and how Peg is held.
4. **The guarding firm's name** in Mission 1 (and whether it recurs in Halcyon's buildings).
5. **What the van in the Mission 1 yard carries** (spares for Pell's cage, or a first glimpse of the failover units).
6. **Whether the Mission 1 optional intel pays off later** (the access log as a lead to Mission 4, the rack labels to Mission 5).
7. **Crane's first appearance:** which early briefing he speaks in, and his one line.
8. **Mission 7's rail set piece:** how the siding connects to the substation story, and what happens if it is skipped.

Opened by dropping the traitor finale (G9) and the solo route (G2), for the missions:

9. **Mission 8 and the ending** (Sections 5 and 6): Open, decided with missions (STORY-04, G9): no traitor;
    replacement plot to be written. Its story beat, gameplay showcase, co-op highlight and ending are all open.
    Nothing after the Mission 7 blackout is decided.
10. **The leaks in Missions 5-7** (Section 6): Open, decided with missions (STORY-04, G9): no traitor;
    replacement plot to be written. Who leaks to Pell (Mission 5) is open;
    Crane knowing where Peg is (Mission 6) and starting SUNDOWN early (Mission 7) stand from Section 5.
11. **The operators' dossier secrets** (a sealed file, a debt letter, a message to a journalist, an old case number)
    were motives for the traitor: keep them as found intel or drop them.
