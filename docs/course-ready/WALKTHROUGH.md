# Marlow Yard walkthrough (marlow-final route)

Build: the /preview/ slot once marlow-final merges. Hard refresh (Ctrl+Shift+R) if an old build shows.
Two players. "A" and "B" are jobs, not host and client: either player can take either job in every set. The course
cannot be finished solo. A first run takes 15-20 minutes.

## 1. How to start (from the main menu)
Both players, each in their own browser tab or PC (two tabs of one browser work; two PCs work):
1. Title screen: press any button or key ("Press ... to start").
2. Main menu: **Co-op**.
3. Co-op screen: the host picks **Host a room**; the joiner picks **Join with code**.

| Step | Host | Joining player |
| --- | --- | --- |
| 1 | **Host a room**. The lobby opens, titled "Room XXXXX" (5 characters). | - |
| 2 | Tell the joiner the code, or press **Share code** (copies an invite link). | **Join with code**, type the 5 characters (keys A-Z, Enter or **Join**). |
| 3 | Lobby rows are preset: Mode **Campaign**, Map **Marlow Yard**, **Difficulty** (host's choice). Only the host can change them. | Sees the same rows, read only. |
| 4 | Optional **Start at** row: **A1** only on a fresh save. Set N ("A2") lists once set N-1 was finished. | - |
| 5 | Wait for the joiner to show **Ready**. | Press **Ready** (it flips to **Not ready**). |
| 6 | **Start mission** (blocked with "Waiting for players to ready up" until the joiner is ready). | - |

- "Room full" or "No host found" dialogs: check the code and that the host is still in the lobby.
- The Co-op row shows "Offline" with no internet: co-op connects through a room code and needs it.
- With two tabs, keep the one you are playing in the foreground: a hidden tab throttles its game loop.
- Quick start for testing: two tabs on `?net=local&autostart=ctcourse&mode=course`.

## 2. Version label
- Bottom of the title screen and the main menu: `v<version> PREVIEW · <commit>` on /preview/ (`v<version>`, `PREVIEW`, then the
  short commit hash after a dot).
- Quote the commit hash with any note: it names the exact build.

## 3. Controls used here
| Action | Pad | Keyboard and mouse |
| --- | --- | --- |
| Move / camera | left stick / right stick | W A S D / mouse |
| Co-op action (leg-up, throw, hang-down, rope) | RB | F (or Page Down) |
| Interact (doors, switches, cabinets, consoles, scanners, revive) | A | E |
| Crouch | B | C (or Left Ctrl) |
| Jump / climb / pull up | Y | Space |
| Draw / holster | X | X (or right mouse button) |
| Switch weapon (tap) | LB tap | Tab tap (or T next, Q previous) |
| Selection wheel (hold) | LB hold | Tab hold |
| Jammer: hold on a camera, a light or a laser's power panel (pistol drawn, stand still) | LT hold | Z hold |
| Fire | RT | left mouse button |
| Back to wall | L3 | Left Shift |
| Pause | Menu | Esc or P |

- Interact is the action menu: with something in reach a list shows top right under INTERACT. A quick tap of A / E runs
  the top row; hold A / E, move to a row, release to run it (BACK TO GAME does nothing). Hold rows (hacks, medkit stations,
  the isolate key, revive) fill while A / E stays held. Sliding doors show one row, Open.
- With a gun drawn, A / E reloads: holster (X) before using doors.
- You start with the rifle on slot 0; the pistol is one tap of LB / Tab away.

## 4. Reading the screen
- **No explainer pads.** The objective table (top right) lists the set's steps; the current one is highlighted and ticks for
  both of you when done. Under it, the step line shows your own job: the A line or the B line. Until someone takes a job,
  the lead (player 1 in odd sets, player 2 in even sets) sees the A line. The first player to do a set's A thing (press its
  device or stand in its zone) becomes A, and both screens follow until the set restarts.
- **Timed windows** show in the step line ("Lights back in 9 s", "Cameras back in 40 s") and in a radio line at 5 s left. They
  never fail the run; the device re-arms after a short wait.
- **Holding rooms** join the sets (L1-L7). **A holding room's pad cycles only when both players stand on it:** the door
  behind you locks and the far door opens. Medkits in L4 and L7.
- Every set is lit. You make the dark: switches, isolators, jams and shots.

## 5. Set by set
Sets run A1-A8 in order. Each set ends in a holding room.

### Start: the arrival lounge
Both spawn in the clients' lounge. Walk through the sliding doors onto the apron (A1).

### A1 Gate - the handshake
| Step | Player A | Player B |
| --- | --- | --- |
| "Get over the yard wall together: one boosts, one climbs." | Crouch at the striped mark by the wall and press Co-op: a leg-up. | Take the leg-up (Co-op, then Y / Space), drop into the yard and unbolt the wicket gate (A / E at the bolt). Refused from the apron side ("Bolted from the other side"). |
| Variant | Climb on B while B hangs on the lip (ledge relay). | Hang on the lip and let A climb you. |
| "Both of you into holding room one." | Onto the pad. | Onto the pad. |

- The gate checker sits in his cabin and sees and hears nothing. Hold A at his back for GRAB and INTERROGATE if you like.
- The cabin switches turn the yard lamps and cabin panel off.

### A2 Carriage Shed - timed light isolation
| Step | Player A | Player B |
| --- | --- | --- |
| "Cut the neck lights and cross while the shunter checks." | Press ISOLATE at cabinet one (in the cabin): the neck is dark 15 s. Hide in the cabin's coat corner and take the shunter when he comes to look. | Wait at the van ends, then cross the dark neck to cabinet two. |
| "Now the other way round." | Cross behind the shunter. | Press ISOLATE at cabinet two. |
| "Both of you into holding room two." | Pad. | Pad. |

- Press while the shunter stands at the neck, or he will not come to look. A press while the neck is dark does nothing;
  the cabinets re-arm after a short wait. Radio: "Lights back in five."
- Other ways: leg-up onto the staging deck (slow, silent crouched), round the west rake, or shoot the lamps.

### A3 Office Range - the timed jam relay
| Step | Player A | Player B |
| --- | --- | --- |
| "Jam the camera for each other. If it sees you, you start again." | Pistol out (LB / Tab, X). Aim at the corridor camera, hold LT / Z and stand still (5 s, then a 5 s cooldown). | Move on the jam: the recess hide spot first, then the east lobby. |
| "Swap: the far player jams now." | Move on your partner's jam. | Jam the camera from the east lobby. |
| "Both of you into holding room three." | Pad. | Pad. |

- If the camera sees you, you go back to the west lobby (LANTERN says so). It sees in the dark: the lights will not save you.
- An office switch lures the cleaner away. Holster (X) before using doors.

### A4 Goods Shed - the security room and the dual takedown
| Step | Player A | Player B |
| --- | --- | --- |
| "Take the duty officer quietly, then loop the floor cameras from his desk." | Take the officer from behind (hold him for INTERROGATE if you like). | Use the console once he is down (refused while he is up): the cameras loop for 60 s. |
| "The cameras are blind for sixty seconds. Cross to the dock." | Main aisle: move fast while the cameras are looped. | Back aisle or mezzanine: keep out of the lit rows. |
| "Two at the dock desk. Take one each, together, or wait for the kettle." | Take the man nearest the office when your partner is set. | Take the man nearest the racking when your partner is set. |
| "Both of you into holding room four. There is a medkit there." | Pad. | Pad. |

- The console re-arms 20 s after the loop ends; a press inside it is refused. Radio at 5 s: "Cameras back in five."
- Both takedowns inside 1.5 s give the dual takedown banner. The kettle break or the floor switch also split the pair.
- The dock wicket (push bar) opens towards L4.

### A5 Substation - the partner throw
| Step | Player A | Player B |
| --- | --- | --- |
| "Throw one of you over the beams. The release is at the kiosk." | Stand by the drums at the gateway and press Co-op, facing the beams: throw your partner over. Do it while the patrol's back is turned. | Press Co-op to be thrown and land in the dark behind the transformer. Wait for the jam. |
| "Kill the floodlight so the kiosk can be reached unseen." | Jam the floodlight through the gateway for your partner. | Cross under the jam and key the release at the kiosk: the beams go off for good. |
| "Beams are off. Both of you into holding room five." | Walk through. | Pad. |

- The beams show only in night vision. A beam touch raises the alarm stage (no health cost).
- Other way: jam the beam panel (high on the switchroom's south face, seen through the gateway) and walk through its window.

### A6 Pump House - the hang-down
| Step | Player A | Player B |
| --- | --- | --- |
| "Get both of you onto the motor gallery at the dark west end." | Boost your partner up (leg-up at the striped mark), then climb the rescue line. | Drop the rescue line from the davit box for your partner. |
| "Lower one of you through the gland plate to the drive panel." | Crouch at the gland plate and press Co-op to lower your partner head-first. Watch the attendant. Pull up if he turns back. | Hold the isolate key at the drive panel (A / E, 3 s) while the attendant is away. The buzzer is noise: he can hear it. |
| "The interlock is green. Out by the outfall door." | Pad. | Pad. |

- The staff stair at the east end is another way up (timed on the attendant). Its open side holds you from the third tread.
- A dropped hanger finishes the hold from the cage floor and leaves by the push-bar door.

### A7 Data Hall - split paths and a synced hack
| Step | Player A | Player B |
| --- | --- | --- |
| "Split up: one through the hall, one through the plant corridor." | Hall route: slip past the technician's round to terminal one. | Plant corridor: quiet on the grating, past the sweeping camera in its blind windows, to terminal two. |
| "Hack both terminals together. Start on the ready lamps." | Hack terminal one on your partner's count (A / E, 2 s). | Hack terminal two within 1.5 s of your partner. |
| "The cage and the east door are open. Both of you into holding room seven." | Pad. | Pad. |

- Each terminal's ready lamp shows through the cage mesh. A late or abandoned hack costs 10 HP (never below 1; none if your
  partner never started). Either player can take either path.
- Cooling-unit lees hide you in the corridor. L7 has a medkit and 30 s to rest before the finale.

### A8 Strongroom - everything, in sync
| Step | Player A | Player B |
| --- | --- | --- |
| "Split up: one onto the gallery, one stays on the floor." | Take the boost to the gallery at the dark west end (the mark at the vestibule). | Boost your partner up, then keep to the counters. |
| "Get to the security office unseen and loop the cameras." | Reach the office on your partner's jam, then take the officer and use his console (60 s loop). | Jam the gallery camera from the floor, behind the counters, for your partner. |
| "Kill the hall lights to open the grille. Sixty seconds on the loop." | Come down the office stair into the vault lobby (the push bar at the stair's foot). | Isolate the hall lights at the board (25 s, the grille opens while it is dark), then slip through and shut the grille. |
| "Over the beam curtain to the second time lock." | Throw your partner over the beams. | Land by the vault door and take time lock two. |
| "Both time locks together, on the ready lamps." | Hack time lock one on your partner's count. | Hack time lock two within 1.5 s. The beams drop and the vault opens. |
| "The vault is open. Both of you out to the cash dock." | Walk to the exit zone. | Walk to the exit zone. |

- The grille's request-to-exit button on the lobby side frees a player left inside when the lights return.
- Radio: "Lights back in five", "Grille's locking again", "Cameras back in five".
- Both inside the exit zone ends the course (time, alarms and revives show).
- A8 dressing: see S8.md Dressing (`docs/marlow-final/slices/S8.md`).

## 6. Health and revive
- Costs: late or abandoned scanner hack 10 HP (A7, A8). A beam touch raises the alarm stage and costs no health. Failing
  never ends the run.
- A downed player is revived by the partner: hold A / E next to them within 30 s, from the same level (a player downed on a
  deck or gallery is revived there). Twice per run.
- Both down, or the 30 s up, or revives spent: the set restarts and both players come back at its entry holding room, with
  its guards, devices and lamps reset.

## 7. If you get stuck
- Pause (Esc / P / Menu) > **Quit to menu** > **Quit**. Then **Co-op**, host again, and pick **Start at** if the set is listed.
  Both players leave; the host opens a new room.
- The host can use Pause > **Restart at checkpoint**. The joiner's Restart rows are greyed "Host only".
- A thrown, boosted or lowered player always has a way back: a release, a push-bar door, a stair, or the hang-down drop.
- Old best times (bays S1-S8) do not carry over: the record starts again at A1.
- Known open (none block play): one player can jam the A5 beam panel, let go and walk through its 1.5 s reboot; the A5 beam
  towers have no collision; stair rails in A4 and A8 are drawn only (a body can step off the flight); the A6 interlock lamp
  has no emissive yet.
