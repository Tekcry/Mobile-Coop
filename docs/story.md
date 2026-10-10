# Night Shift - Story and world

Version 2.0 - 2026-10-10. Draft for Michael. (2.0: present-day campaign; Mission 1 at a colocation data centre; Mission 5 The Strongroom; Kestrel Exchange retired. 1.2: the Client is Alistair Crane; the operators' real names. 1.1: the traitor finale.)

- This document is the authority on story, setting, characters and in-game text.
- `docs/design-bible.md` wins on anything that affects gameplay.
- All names here are original. No Splinter Cell names, organisations or plot.
- The Mission 1 site name is a placeholder until Michael picks one (Section 9): **Cinder Yard**, run by **Ostler Colocation**.

---

## 1. Premise

**Hook:** someone is going to switch off a whole city. The only people who can stop them are the ones who work best in the dark.

**Logline:**

- A deniable four-person unit, NIGHT SHIFT, slips into a data centre in the old railway district and taps a broker's private fibre. On it they hear one word: SUNDOWN.
- In nine nights someone will black out the port city of Hollowmere, take its emergency systems while the backups fail over to rigged hardware, and sell the demonstration to the highest bidder.
- The team that lives in shadow has to keep the lights on.
- **The last twist:** the Client has been inside Night Shift all along. In the final mission one team-mate (two, with four players) turns on the others.

**The irony at the heart of it:** the gameplay is about darkness - you make it, you use it, you hide in it. The story is about a city that must not go dark.
In the final mission the team turns the lights back on. The last image is Hollowmere lighting up block by block, seen from a rooftop.

---

## 2. Tone and writing rules

**Tone: a grounded techno-thriller with dry humour** (Michael's choice).

- Real stakes, plausible technology, professionals who are good at their jobs.
- Humour comes from character and understatement, never from jokes that break tension.

**Text only.** No voice, no recorded or synthesised audio.

**Radio lines:**

- One or two lines on a phone: 90 characters or less per message.
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

Every mission is at night. Rain is common. Moonlight and street light matter (P1).

---

## 4. Night Shift and the Continuity Office

**The Continuity Office** is a small, quiet government office that watches over critical infrastructure.

- It has no police powers and no public budget line.
- When something cannot be done officially, it calls Night Shift.
- **Its director is Alistair Crane,** Peg's boss: polished, patient, trusted by ministers. He is the Client (Section 5).

**Night Shift** is four operators and a handler.

- Deniable: if caught, they were never there. They prefer nobody gets hurt; the rating rewards that, and so does the story.

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

### The operators

Looks and personality only. Every operator has identical stats and hitboxes (bible 5.14).

#### WREN - team lead

- **Background:** ex-military, thirties. Says as little as possible. Carries the team's conscience without mentioning it.
- **Look:** compact, close-fitting hood, square goggle housing. **Green goggle light.**
- **Voice:** "Moving." "Clear." "Wait." Rarely a full sentence, so when Wren talks at length it matters.

#### MOTH - climber

- **Background:** ex-steeplejack, twenties. Grew up on scaffolding and phone masts. Cheerful, curious, too fond of heights.
- **The running joke:** Moth is drawn to light. It is a terrible trait in this job.
- **Look:** lean, rolled sleeves, climbing harness, round goggle lenses. **Amber goggle light.**
- **Voice:** chatty when it is quiet, quick when it is not.
  - "I can see the whole yard from here. Lovely view. Two guards."

#### TALLY - signals and hacking

- **Background:** ex-telecom network engineer, Peg's protégé, twenties. Thinks in diagrams.
- **Character beat:** takes Peg's capture personally. Mission 6 is Tally's mission.
- **Look:** slim, cable bag on the hip, headset over a cap, narrow visor goggles. **Cyan goggle light.**
- **Voice:** precise, fast, a little nervous, funny without meaning to be.
  - "That's not a server. That's a server pretending to be three servers."

#### SEXTON - surveillance

- **Background:** ex-police surveillance, the oldest, fifties. Patient. Gallows humour. Knows how guards think because he used to stand where they stand.
- **Look:** broad, long coat cut short for movement, flat cap under the hood, heavy goggle frame. **Violet goggle light.**
- **Voice:** slow, deadpan.
  - "Rain's on our side tonight. Nobody looks up in the rain."
  - Moth: "I look up in the rain."
  - Sexton: "Nobody sensible."

**Real names** (decided 2026-10-08). The team uses callsigns. Real names appear only in dossiers found as intel.

| Callsign | Real name | Why the callsign |
| --- | --- | --- |
| Wren | Imogen Hale | Small, quick, hard to spot. Given by her old unit. |
| Moth | Danny Mensah | Drawn to light. The team's running joke. |
| Tally | Priya Tallis | From her surname, and she counts everything. |
| Sexton | Graham Mallory | Ex-police who "digs things up". Gravedigger humour. |

### Dossier secrets: every operator could be the traitor

The traitor is whichever operator another player chose, picked at random when Mission 8 loads (bible 5.15). So every operator has a secret that could be a motive:

| Operator | Secret | Motive |
| --- | --- | --- |
| **Wren** | A past operation went wrong and civilians died. The record was sealed. | The Client has the record. Blackmail. |
| **Moth** | Family debts to people the Client owns. | To keep someone safe. |
| **Tally** | Believes the Continuity Office covered up Peg's old cases. | Ideology: the Client promised to expose the Office. The cruellest version: Peg's protégé. |
| **Sexton** | Framed out of the police years ago. | The Client offers to clear his name, and revenge. |

**Writing rules for the secrets:**

- Intel in Missions 2-7 hints at **all four** equally: a sealed file, a debt letter, a message to a journalist, an old case number.
- The player can never be sure until the reveal.
- When the traitor is revealed, their secret becomes the explanation.
- The other three are revealed as innocent in the epilogue.
- In solo, the traitor is an operator the player did not pick.

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

- The Office holds a dossier on every operator, so Crane knows each one's secret (Section 4). That is how he turns the traitor.
- He knows where Peg will be. That is how she is taken (Mission 6).
- He hears every briefing. That is how SUNDOWN can start early (Mission 7).

**How the reveals land:**

1. Missions 1-5: Crane appears only in passing, as Peg's calm, supportive boss in a briefing or two.
2. **Mission 6:** while rescuing Peg, intel proves Crane authorised her transfer. The Client has a face, and it is their own side.
3. **Mission 7:** Crane, exposed, starts SUNDOWN early.
4. **Mission 8:** the team learns the last secret: Crane's inside man (or two) is one of them.

**In the endings:** in **Lights On** Peg delivers the evidence and Crane is arrested; in **Sundown** his sale goes ahead.

**What SUNDOWN is:**

1. A staged citywide blackout.
2. When the grid fails, the emergency systems (flood barrier control, dispatch, hospital backup) fail over to hardware Halcyon installed.
3. That hardware answers to the Client.
4. For one night, whoever holds it holds the city, and buyers watch.

---

## 6. Campaign outline

Each mission gets a story beat, a gameplay showcase and a co-op highlight. The vertical slice is Mission 1.

| # | Mission | Location | Story beat | Gameplay showcase | Co-op highlight |
| --- | --- | --- | --- | --- | --- |
| 1 | **Dead Line** | Colocation data centre, Kestrel | Tap Pell's cross-connect. Learn SUNDOWN and its date: nine nights. **Ends:** his traffic names failover units "already delivered". | Light and shadow fundamentals; CT movement; modern security: cameras, keycards, mantrap, iris scanner, beams, motion lights | First team moves; light control (one kills the lights, one crosses); one blinds the cameras while another moves |
| 2 | **Cold Storage** | Automated port cold store, the Docks | Track the failover hardware Pell's traffic mentioned. **Ends:** it was shipped weeks ago and is already installed somewhere. The serials point to the Barrier. | Cold store fog, robot crane heights, loud metal floors | Split-and-converge: two manifests at once |
| 3 | **High Water** | Tidal barrier pumping station | The barrier runs on the rigged failover. **Ends:** in a blackout the gates open on a spring tide and the city floods. Halcyon signed it off. | Water noise masks you; pumping machinery; rain | Sync takedowns on a gantry patrol |
| 4 | **Glass House** | Halcyon's tower, Meridian Quay | Inside Halcyon: names, contracts, Pell's double game. **Ends:** Pell keeps his own copy of every order, held in escrow in an old town vault, as his insurance. | Lit offices with motion-sensor lighting: light is the enemy; making darkness | Split floors: one in the server room, one on the executive floor |
| 5 | **The Strongroom** | Victorian bank, old town, now a private vault company | Take Pell's escrow and records from the old vault. Pell sells the team out. **Ends:** the Client learns who Peg is. | Old building meets modern security: the vault, beams, cameras, time locks | Two players on the vault and the alarm at once |
| 6 | **Lantern Out** | Private clinic, old town | Peg has been taken. Rescue her. **Ends:** intel proves Crane, the Office's own director, is the Client. | **No radio.** Objectives come only from intel found in the level. | Coordination by pings alone: the purest co-op mission |
| 7 | **Substation Zero** | Ashgrove substation | Exposed, Crane starts SUNDOWN early, mid-mission. Optional: stop the last failover hardware arriving by rail at the Ashgrove siding. **Ends:** the city is dark and grid control is the only way back. | **The blackout:** lights fail across the map in real time; guards switch to torches and night vision; the main mechanic flips. Optional set piece on the siding. | Holding a dark map against torches; clutch saves |
| 8 | **Sundown** | Ashgrove grid control | Act 1: restore the grid together. **The betrayal:** a team-mate disarms the protagonist and kills the lights. Act 2: the Confrontation. | **The hunt (bible 5.15):** unarmed protagonists against traitors with a loud pistol; restoring breakers turns on lights that expose them. | 1v1, 1v2 or 2v2: the team against itself |

**The leaks in Missions 5-7 are the traitor's doing** (written ambiguously until the reveal):

- Pell knows the team is coming to the vault, and knows whom to sell them to (Mission 5).
- The Client knows where Peg is (Mission 6).
- SUNDOWN starts early (Mission 7).

**Two endings:**

- **Lights On** (protagonists win): the rooftop, the city lighting up block by block, LANTERN and the loyal team. The traitor's last line depends on their secret and on whether they were knocked out or killed.
- **Sundown** (traitors win): the city goes dark; the traitor's closing words with the Client; LANTERN's last line to an empty channel.

**Rules for mission writing:**

- Every mission is fully playable solo. Its co-op highlight is extra, never required (bible 5.9).
- The mission's briefing explains why the team is there in 4-6 lines. Plot details come from found intel and the radio.
- Each mission ends on a reveal or a decision that pulls into the next.

### 6.1 Mission 1 brief: Dead Line (story terms, for the level designers)

**The site and its night.** Cinder Yard, a colocation data centre run by Ostler Colocation on the old goods yard in Kestrel, under the viaduct. It is a normal Tuesday: rain, the hum of the cooling, the generator's weekly test due before dawn. Pell's cage there is rented by Ansell & Crowe Ltd. The name "Dead Line" is Peg's joke: a fibre nobody seems to use.

**The people.**

- **Security:** officers from a contracted guarding firm. They believe they protect a business. 16 on site tonight, because Pell paid for extra cover during a handover.
- **The handover:** a van is being loaded in the yard. Its officers are Pell's extra cover.
- **The civilian:** the night duty engineer, the one Ostler employee on shift. Harmless. Never kill them (bible 5.7).

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

## 7. Radio system rules (for writers and the Phase 4 framework)

**Speakers:** LANTERN, the four operators, and occasionally intercepted enemy radio (guards, Pell). Each speaker has a label and a colour.

**Variants: every line can have a solo and a team version.**

- **Solo:** the player is one operator; the others are elsewhere, on the radio, doing parallel tasks (watching from a roof, working a substation remotely).
- **Team:** lines adapt to who is present. If Moth is in the field, Moth does not radio in from a rooftop.
- **Tokens:** `{player}`, `{team}`, `{lead}` (the first player in the lobby).

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

**Mission 6:** LANTERN is silent. Operator lines only, and fewer of them.

**Mission 8 Act 2:**

- Protagonists hear LANTERN's location pulses. Traitors hear the Client.
- Taunts and replies are per operator and dossier-based, never carrying position.
- No humour.

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
LANTERN (solo): In over the lane fence. Keep to the wall - the yard lights are on sensors.
LANTERN (team): Over the lane fence, all of you. Keep to the wall - the yard lights are on sensors.
[player crosses the lane]
MOTH (if not present): I'm on the depot roof across the lane. Van's being loaded in the yard.
SEXTON: Rain's on our side tonight. Nobody looks up in the rain.
MOTH: I look up in the rain.
[player moves]
SEXTON: Nobody sensible.
LANTERN: Card, cameras, cage. Tap his line, out through the yard. Stay in the dark.
[player is inside the perimeter]
TALLY: Cooling alarm brings the duty engineer running. Just saying.
LANTERN: The carrier entrance is under the yard. My cable's still in it.
[player taps the cross-connect]
TALLY: Tap's on. Light's coming through clean. He'll never know.
...
[player crosses the yard during the generator test]
TALLY (end): Peg... he's not selling data. He's relaying orders. Someone called SUNDOWN.
TALLY (end): Nine nights. And the hardware's already delivered.
LANTERN: Then we've nine nights. Come home.
```

---

## 9. Open story items

Decided on 2026-10-08: the Client (Crane) and the operators' real names.

1. **The Mission 1 site name** (Michael to pick; Cinder Yard / Ostler Colocation until then).
2. **The epilogue lines for both endings,** and each operator's betrayal and last lines.
3. **Mission 6's location detail** and how Peg is held.
4. **The guarding firm's name** in Mission 1 (and whether it recurs in Halcyon's buildings).
5. **What the van in the Mission 1 yard carries** (spares for Pell's cage, or a first glimpse of the failover units).
6. **Whether the Mission 1 optional intel pays off later** (the access log as a lead to Mission 4, the rack labels to Mission 5).
7. **Crane's first appearance:** which early briefing he speaks in, and his one line.
8. **Mission 7's rail set piece:** how the siding connects to the substation story, and what happens if it is skipped.
