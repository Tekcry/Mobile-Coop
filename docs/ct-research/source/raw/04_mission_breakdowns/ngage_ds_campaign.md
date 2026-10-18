# Mission breakdown - N-Gage / Nintendo DS co-op campaign (Gameloft, 2005)

**Research basis:** `research_notes/mission_ngage_ds.md`. It holds the full detail and sources, including the game's own text strings extracted from the archived N-Gage build ("NG-TXT").

**Sources and counting:**

| Code | Source | Counting note |
|---|---|---|
| FW | English and Russian Fandom wiki | Counted as one source. Its mission text matches NG-TXT word for word, so it was transcribed from the game |
| NG-TXT | Text strings from the archived N-Gage build | Primary source for briefings, radio lines and role rules |
| SHOCK-25 | DS 100% stealth video description | Probably the same author as the FW trivia, so not independent of FW |

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

**Overall confidence:**
- **High:** briefings and role rules.
- **Medium:** device order in parts 1-3.
- **Low:** layouts and the colonel-carry mechanic.

---

## 1. What this campaign is
- **A separate game with its own co-op campaign.** Gameloft built a separate handheld *Chaos Theory* for N-Gage and DS, with its own two-player co-op story. It is unrelated to the console co-op plot. [VERIFIED - FW + Ubisoft PR + reviews]
- **Story.** A US colonel has been kidnapped and a private military corporation is suspected. The pair raid the corporation's New York headquarters to find where he is held, then rescue him from an old prison in Cuba. [SINGLE SOURCE - FW/NG-TXT briefings]
- **Structure.** Five short parts in two missions:
  - Rooftops → Breakdown → Corruption (headquarters);
  - Prison Rescue → Escape (prison).
  - [VERIFIED - FW + DS video chapters]
  - Internal keys skip numbers 4-6, so three parts may have been cut. [UNCERTAIN]
- **Connection.** Two players, local only:
  - N-Gage over Bluetooth;
  - DS over local wireless, one cartridge each.
  - The session ends if a player drops, and there is no AI partner.
  - [VERIFIED]
- **Camera.** Full 3D third-person on both handhelds. [VERIFIED]
- **Length.** Parts run about 3.5, 4, 10, 9 and 10.5 minutes in a normal run, roughly 37 minutes in total. [SINGLE SOURCE - chaptered video]

## 2. Roles: hard class asymmetry (the defining feature)

| | Hacker | Assault |
|---|---|---|
| Exclusive action | Hack computers | Short-circuit electric panels |
| Cannot | Short-circuit panels | Hack computers |
| Kit | Unlimited stun gun, 3 electronics-disabling grenades, 3 flashbangs, 1 health pack | Rifle 30, pistol 30, 3 frags, 3 sticky cams, 1 health pack |
| Vision | No night or thermal vision (FW) | Night and thermal vision (only this role, per FW) |

**Confidence:**
- Exclusive actions and "cannot" rules: [VERIFIED - NG-TXT pop-ups + FW]. These appear in-game as refusal pop-ups.
- Kit: [SINGLE SOURCE - FW].
- Vision split: [SINGLE SOURCE - FW].

**Other role facts:**
- **Choosing a role.** Players pick the role ("expertise") in the lobby. [VERIFIED - NG-TXT + Ubisoft PR]
- **How the briefing frames them.** The Assault is the fighter; the Hacker is the computer and stealth expert. [VERIFIED]
- **A reviewer's reading.** One review read it as "an unarmed hacker guarded by his partner". [SINGLE SOURCE - Pocket Gamer]

**Other co-op mechanics:**
- **No acrobatic moves.** None appear among the 37 interaction labels. The only partner action is "heal ally" (within 30 s). [SINGLE SOURCE - NG-TXT; absence of evidence]
- **One true sync task.** Two switches pressed together (Breakdown). [VERIFIED]
- **Alarms.** Three alarms abort the mission, with warnings after alarms 1 and 2. The alarm level can drop later. [VERIFIED]

## 3. Part by part

### 3.1 Rooftops
- **Objective:** infiltrate the corporation's building. [SINGLE SOURCE - FW RU]
- **Opening.** The controller introduces the two roles and says the mission only works if they cooperate. [VERIFIED]
- **Route.** One electric panel, then one computer. Each role must act once. What each device controls is unknown. [SINGLE SOURCE - FW/SHOCK; GAP]
- **End.** The part closes by heading "below", into the building. [VERIFIED]

### 3.2 Breakdown
- **Twist.** The lift carrying the pair to the server room loses power. [VERIFIED]
- **Objective chain** [VERIFIED - NG-TXT + FW]:
  1. Find the control room on this floor.
  2. Press two switches **at the same time**. A second radio line repeats this, apparently as a hint after a failed attempt.
  3. Power returns and all cameras in the area shut off.
  4. Go back to the lift.
- **Role forcing.** Two Assault-only panels each drop a set of lasers (a corridor and a lobby) for **15 seconds**. The Assault opens a window and both must cross it. [Lasers VERIFIED; 15 s SINGLE SOURCE]
- **Split and regroup.** The two players are at two switches at once, then regroup at the lift. [Regroup VERIFIED; positions GAP]

### 3.3 Corruption
- **Objective.** Reach the heavily guarded server room, hack the main computer, and leave unseen. **The lift door is not to be used; entry is through the vents.** [VERIFIED]
- **Ordered devices** [order SINGLE SOURCE - FW/SHOCK; key strings VERIFIED - NG-TXT]:
  1. **Panel (Assault).** The laser system is reconfigured into a *new pattern*, not switched off.
  2. **Computer (Hacker).** Lasers off.
  3. **Panel (Assault).** Doors open.
  4. **Computer (Hacker).** Doors open.
  5. **Computer (Hacker).** Doors lock and a **6-minute extraction countdown** starts. This is probably the server hack. [UNCERTAIN]
- **Twist.** The controller says the pair has been detected and must leave the server room **through the ceiling**. Then all doors unlock and a new extraction point is given. Whether this is scripted or triggered by detection is unknown. [VERIFIED lines; trigger UNCERTAIN]
- **Design reading.** Panel and computer alternate (A, H, A, H, H), so control keeps handing off between the two players.

### 3.4 Prison Rescue
- **Premise.** Headquarters data located the colonel. The controller's greeting is in Spanish, and he warns that the prison is grim and the colonel's condition unknown. [VERIFIED]
- **Order of events.** Taken from the wiki's list order; no timestamps exist. [SINGLE SOURCE - FW; strings for fuse, key and alarm VERIFIED by NG-TXT]
  1. Mines on the route: shoot them, or stun them temporarily.
  2. An Assault panel is **missing a fuse**. Fetch the fuse from another panel, return, and the corridor lasers go off.
  3. A panel opens doors.
  4. Pick a cell lock (a three-pin stylus pick on DS).
  5. The Block B key lowers the alarm level.
  6. "Don't leave the colonel behind."
  7. A panel turns the lights off for **15 seconds**, a dark window that suits the Hacker, who has no night vision.
- **Who picks locks:** unknown. [GAP]

### 3.5 Escape
- **Premise.** The colonel is badly wounded and must be **carried out**. [VERIFIED]
- **Security.**
  - Mines.
  - **Four automatic machine-gun turrets that can only be switched off by hacking computers** (Hacker-only). Each one lowers the alarm level. [SINGLE SOURCE - FW; turret-off string VERIFIED]
  - A lights panel with a 15-second window (Assault).
  - Two scripted ambush rooms: three guards behind a door beside a switch, and two guards behind courtyard doors. [SINGLE SOURCE - FW]
- **Unknowns.** Who carries the colonel, the carry speed, and the fail rules. [GAP]

## 4. Reception (co-op)
- **"Fine."** The co-op was described as fine, because both players use the same third-person scheme. Versus was close to broken. [SINGLE SOURCE - IGN DS]
- **Highlight.** It was called worth trying as one of the game's highlights. [SINGLE SOURCE - GamesRadar]
- **Main frustration.** Finding a nearby partner with the same game and hardware. The N-Gage online service was not used for co-op. [VERIFIED - NWR + Gaming Target + Gameswelt]
- **No moment-level commentary.** No review describes a specific co-op moment. [GAP]

## 5. Key videos (not watched)
- **arronmunroe**, DS two-player co-op plus versus, with chapters for all five parts (1:05:48): https://www.youtube.com/watch?v=jnQ74p1Klf8
- **SHOCK-25**, DS 100% stealth, parts 1-3 (57:01): https://www.youtube.com/watch?v=-Y6zjZ7oVNM
- **N-Gage co-op beta press footage**, silent (4:46): https://www.youtube.com/watch?v=oozYweL4ASM

## 6. Gaps (OPEN_QUESTIONS R-23)
- **Layouts:** room-by-room layouts for every part.
- **Unknown device effects and rules:**
  - what the Rooftops devices do;
  - where the Breakdown switches are and who presses them;
  - the Corruption detection trigger and timer failure;
  - the carry mechanics;
  - who picks locks.
- **Map differences:** between N-Gage and DS.
- **Structure:** checkpoints, scoring and unlock order.

## 7. Design reading (analysis)
1. **Interdependence through permissions instead of moves.** When two-body acrobatics were impossible on handhelds, Gameloft gated every security layer behind one of two device types, each usable by only one class. It is cheap to build and instantly readable: a lock on the path, and the designer chooses which class holds the key.
2. **Timed windows as soft sync.** A 15-second panel window is a lighter, asynchronous cousin of a simultaneous action. One player opens it and the other uses it.
3. **Complementary information.** Only the Assault sees in thermal or night vision, where lasers show, while only the Hacker can switch systems off. So players must talk.
4. **Short parts with one twist each** suit handheld sessions: lift failure, detection and a ceiling escape, a missing fuse, carrying the colonel.
5. **Risk.** Hard class locks can strand a player ("I can't do anything here") if levels do not give both roles work at the same time. No source shows whether this happened. [UNCERTAIN]
