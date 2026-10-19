# Marlow Yard walkthrough (course-ready test)

Build: the /preview/ slot (master). Hard refresh (Ctrl+Shift+R) if an old build shows.
Two players. Either player can take either role at every station. The course cannot be finished solo.

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
| 4 | Optional **Start at** row: **Bay 1** only on a fresh save. Bay N ("Bay 2 (S2)") lists once bay N-1 was finished. | - |
| 5 | Wait for the joiner to show **Ready**. | Press **Ready** (it flips to **Not ready**). |
| 6 | **Start mission** (blocked with "Waiting for players to ready up" until the joiner is ready). | - |

- "Room full" or "No host found" dialogs: check the code and that the host is still in the lobby.
- The Co-op row shows "Offline" with no internet: co-op connects through a room code and needs it.
- With two tabs, keep the one you are playing in the foreground: a hidden tab throttles its game loop.

## 2. Version label
- Bottom of the title screen and the main menu: `v4.11.0 PREVIEW · <commit>` on /preview/ (`v<version>`, `PREVIEW`, then the
  short commit hash after a dot).
- Expect "4.11.0 or later". The commit hash names the exact build; quote it with any note.

## 3. Controls used here
| Action | Pad | Keyboard and mouse |
| --- | --- | --- |
| Move / camera | left stick / right stick | W A S D / mouse |
| Co-op action (leg-up, throw, hang-down, rope) | RB | F (or Page Down) |
| Interact (doors, switches, scanners, revive) | A | E |
| Crouch | B | C (or Left Ctrl) |
| Jump / climb / pull up | Y | Space |
| Draw / holster | X | X (or right mouse button) |
| Switch weapon (tap) | LB tap | Tab tap (or T next, Q previous) |
| Selection wheel (hold) | LB hold | Tab hold |
| Jammer: hold on a camera or laser (pistol drawn, stand still) | LT hold | Z hold |
| Fire | RT | left mouse button |
| Back to wall | L3 | Left Shift |
| Pause | Menu | Esc or P |

- With a gun drawn, A / E reloads: holster (X) before using doors.
- You start with the rifle on slot 0; the pistol is one tap of LB / Tab away.

## 4. Station by station
Stations run 1-8 in order, each ending in an airlock. **An airlock cycles only when both players stand on its pad (the marked
square at the end of the bay), and both need to be on the pad.** The HUD step line names the task; an optional panel at each
station repeats it (A / E).

| Station | Player 1 | Player 2 |
| --- | --- | --- |
| 1 Panels | Read the panel if you like. Walk to the airlock pad. | Same: both onto the pad. |
| 2 Leg-up wall | Crouch at the square by the wall, press Co-op: you boost your partner. | Run in and press Co-op, then Y / Space to climb over. On the far side press A / E at **Unbolt**, then open the door for your partner (the near side says "Bolted from the other side"). |
| 3 Camera | Pistol out: LB / Tab to it, X to draw. Aim at the camera, hold LT / Z and stand still. | Walk into the blind spot (the pale blue-grey square). Then swap roles. |
| 3 door | When both stand in the blind spot at the same time the door unlocks. **Holster (X) first**, then open it (A / E). | Same. |
| 4 Laser | Stand about 1 m before the beams, press Co-op: you throw your partner over. | Run in and press Co-op to be thrown, then press the red release on the left fence. The beams go off; both walk through to the pad. A beam touch costs 15 HP. The jammer also holds the laser off. |
| 5 Annex and roof | Leg-up and relay onto the roof (as station 2). Both press the two roof plates (A / E) within 1 s. | Same, on the other plate. A lone press shows "Partner: press the other plate now": press again together. |
| 5 hatch | Crouch on the striped square facing the hatch, press Co-op: you lower your partner. | Press Co-op too, then hack the panel while hanging (A / E). |
| 5 way out | "Grid open": both go off the roof (front lip, no fall damage), in the front door, through the grid, to the back-room airlock. | Same. |
| 6 Scanners | Start when both small lights are green. Press A / E at your scanner and stay put. | Same at the other scanner, within 1.5 s of your partner. Late or abandoned: 10 HP (never below 1; none if your partner never started). |
| 7 Rope wall | Leg-up one player onto the wall (as station 2). On top, face back down and press Co-op: the rope drops. | Press Co-op at the wall, then push the stick up to climb. |
| 8 Finish | Walk through the doorway into the lit zone. | Both inside the zone ends the course (time, alarms and revives show). |

**Health and revive**
- Costs: laser 15 HP, late or abandoned scanner hack 10 HP. Failing never ends the run.
- A downed player is revived by the partner: hold A / E next to them within 30 s. Twice per run.
- Both down, or the 30 s up, or revives spent: the bay restarts and both players come back at its start.

## 5. If you get stuck
- Pause (Esc / P / Menu) > **Quit to menu** > **Quit**. Then **Co-op**, host again, and pick **Start at** (Bay N) if it is
  listed. Both players leave; the host opens a new room.
- Still open (none block play):
  - Panel 7 says "Y / Space at the top"; the rope tops out on its own, just climb with the stick.
  - Station 6 radio says "Door open"; it is unlocked, open it with A / E.
  - Some lines say "X draws", others "X / RMB": the same action.
  - The leg-up lines do not name the crouch key (B / C).
  - A client sees no restart banner after a bay restart, only "BACK IN".
  - The lone-plate hint says "plate" even on other pair switches.
  - Revive heals fully. Throw, hang-down and rope use stand-in animations.
  - Your partner's gun shows no jam light. A client's palm strike is always a knockout. A client's stealth open is push-to-open.
  - If your partner's link drops mid hang-down you can stay frozen until you press B.

## 6. What changed for this test
S1 (in 4.9.0) and the light pass (this build):
- Every station's HUD step line now names its task (before, only the airlock row showed).
- Radio and panel texts name the pad and keyboard keys, the pistol and holster at station 3, and the way out of station 5.
- Station 2 bolt: **Unbolt** is reachable from anywhere within 1.6 m of the door on the far side, and turns off once opened,
  so the normal door menu returns on both sides.
- A lone press on the station 5 roof plates tells you to press with your partner.
- The leg-up squares at stations 2, 5 and 7 sit by the walls next to the door. The station 3 pocket is pale blue-grey, so
  "airlock pad" is unambiguous.
- A bay restart now brings back the surviving partner too; the host sees "PARTNER DOWN - Restarting the bay".

Lighting: lamps in every airlock, the station 5 roof and back room, the station 2 and 7 wall tops (LIGHT.md).
