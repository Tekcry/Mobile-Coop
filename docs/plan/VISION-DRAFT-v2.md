# Night Shift - Vision (draft v2, 2026-11-01)
Owner: Michael. Status: draft (on hold until Michael rereads it; the planning run turns it into v3).

Built from Michael's answers after the full co-op playthrough, checked against the Chaos Theory co-op research
(`docs/ct-research/`) and the level design research (`docs/research/mission-audit/`, `docs/level-design.md`).

## 1. What it is
A 2-player online co-op stealth campaign, inspired by Splinter Cell: Chaos Theory's co-op campaign, with our own ideas
where they make it more fun. Nothing else: no solo play, no bot partner, no other modes. Desktop browser, pad first,
then keyboard and mouse.

## 2. The one rule
**Forced co-op teamwork is the game.** Marlow Yard proved it. Every area is built so the two players need each other
to get through it. If a feature or a space works just as well solo, it is wrong.

## 3. Pillars (ranked, the higher one wins a tie)
1. **Co-op teamwork** - team moves and coordination are part of every route; players stay together and split only
   where the design means them to.
2. **Light and shadow** - darkness hides you, light exposes you. What you see, the light meter and the guards always
   agree: the picture is lifted so shadows stay readable, but lit areas still look clearly lit.
3. **Readable, fair guards** - few guards, each a puzzle you can learn; every detection can be explained.
4. **Always know where to go** - you are never lost; objectives, the compass and the level itself make the next step
   clear.
5. **Physical, deliberate movement** - weighted, controllable, Chaos Theory style.
6. **Sound** - noise matters; loud places cover you, quiet places punish haste.

## 4. The campaign
- Exactly 2 players, online. First target: **Marlow Yard prologue + Mission 1** (a fresh design), proven fun before
  anything else is built.
- **Marlow Yard teaches each team move on its own, in a fixed order**, each step leaning more on the partner, before
  Mission 1.
- Missions take 20-30 minutes for a good pair.

## 5. Mission design (from the research)
- **One shape for every mission:** a gentle co-op opening; a small team moment every 2-4 minutes; a big set piece every
  6-10 minutes with a calm stretch after; one twist about halfway; a joint climax; a short exit.
- **A mission is 3-5 steps of 2-5 minutes.** At least one step finds intel and uses it (a code, a route, a person). One
  optional goal is found by exploring.
- **Every mission has:** one action both players do at once, one "cover me while I work" moment, one place only two
  bodies can reach, and three planned "wow" moments (a big two-person move, a moment of perfect timing together, a
  story reveal).
- **Light is shared:** one player kills a light or holds a camera off so the other can move, then they swap.
- **Team moves work anywhere there is room**, not only at fixed spots, and each has more than one use (crossing,
  attacking, scouting). A prompt names the move and who starts it.
- **Joint actions are forgiving:** a timing window, a "partner ready" sign, workable with pings alone. Failing raises
  the alarm, never kills.
- **Nobody waits more than a minute, and players swap roles.** Neither player is always the one who boosts or holds.
- **Guided path**; each room or yard offers 2-3 ways across: shadow, high route, team move, or a tool / intel route.
- **Splits end at a clear meeting point within about 3 minutes.**
- **Each area opens on a dark lookout spot** with room for two to plan. The final area is seen early.
- **At every blocked spot, a way past can be seen or worked out within 2 minutes.** The solution is visible from the
  problem.
- Clear level edges and landmarks; you cannot climb out of the playable area.

## 6. Guards
- **Few guards, roughly 2-5 per area**, hand-placed. Each has a real job, a fixed routine and a moment alone; some
  cover each other part of the time, so the players choose who goes first; some walk in pairs for a joint takedown.
- **No guard is ever spawned.** An alarm makes the guards already on the map tougher and more alert (helmets, armour,
  wider searches).
- Guards come to fix lights that go out, which the players can use.
- **When spotted, hiding is the answer.** Guards are deadly in a straight fight. Break line of sight and hide; they
  search where they last saw you. They never know where you are once you are hidden.

## 7. Seeing in the dark
- The picture is lifted so dark areas stay readable. Night vision is for very dim spots and never blows out the
  screen. (Night vision boosts light that is there; a spot with no light at all shows nothing, as with real goggles.)

## 8. Finding your way and talking
- **Compass bar** at the top: the current objective with its distance, and your partner's mark. The level still
  guides on its own (lit exits, landmarks, overheard guard talk, documents); the compass never replaces it.
- Objectives say plainly what to do and where.
- **Pings** show whose they are: the player's colour with their number inside. The same colour marks them on the
  compass.
- Voice chat happens outside the game (Discord or similar).
- A downed partner is impossible to miss.

## 9. Rules, failure and score
- One difficulty, tuned well.
- **Checkpoints at the start of each area and before each big set piece**, in the dark, out of guard view.
- Downed: your partner revives you. Both down: back to the last checkpoint. Alarms never fail a mission on their own,
  but a mission may set its own rules (for example no kills, no alarms).
- Kills are allowed unless a mission forbids them, and always cost rating unless the mission makes them necessary.
- Each mission ends with a Chaos Theory style **percent rating** and its breakdown.
- Players **choose their gear** before each mission: pistol, rifle, non-lethal gadgets (sticky cam, noisemaker,
  flashbang, sleeping gas, EMP) and lethal gadgets (frag grenade, proximity mine). No drone. Nothing else carries over
  between missions.

## 10. Story
Kept from the current story if it makes sense around the new Mission 1: two operators of the deniable unit NIGHT
SHIFT, Wren and Moth, have nine nights to stop SUNDOWN, a staged blackout of the port city Hollowmere. A grounded
techno-thriller with dry humour, told through text radio and found intel. **Wren and Moth talk to each other:** dry
banter runs through every mission, quiet while guards are alert, back when it is calm.

## 11. Look and sound
- Greybox minimum: the **Test Chamber look, lit as the real level** (real lamp positions and real dark areas).
- Dynamic music: main menu, infiltration, caution, alert.

## 12. Not now (revisit later)
Sector Ops, solo play, 3-4 players, other modes, progression and unlocks, cosmetics, in-game voice, more difficulties.

## 13. How we build
Movement, co-op and greybox levels first. Play-test before any polish. One main session, GitHub tests every change,
no automation.

## Open
- Revive limit; what breaking a mission rule does; Moth's colour; per-mission gear limits; the pistol jammer.
- Mission 1 setting, decided in level planning.
- Marlow Yard's final section redesign.
