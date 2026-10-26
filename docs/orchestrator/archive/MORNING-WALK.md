# Morning walk on /preview/ (2026-10-23, refreshed 06:15)

Start: main menu label "v4.66.0 PREVIEW" (4.66.1+ or 4.67.0 = more landed after 06:40; older = reopen the tab once).
Overnight on /preview/: 4.64.0 mocap switch (Settings > Gameplay > "Mocap locomotion", OFF by default), 4.65.0 guards see
poorly above you + no reload mid-match after a deploy, 4.66.0 guards hear by range (walls muffle; one investigates, the
rest turn and stay). Mocap batch 1 (pops, crouch walk, sprint) lands this morning as its own PR, still OFF by default.
First, two chores for you: restart Night Shift | Character Build on the laptop (it dropped at ~04:58; prompt in
docs/orchestrator/HANDOFF.md section 5), and clear Menu Notes (context 40%; resume block in docs/marlow-final/STATE.md).
Decisions to review (applied overnight, each with its undo): docs/orchestrator/archive/MORNING-REVIEW.md.
Notes: Pause > Report feedback. "Waiting N" = docs/ROADMAP.md "Waiting on Michael" item N. Routes:
- Marlow solo: Co-op > Host a room > Mode Campaign > Start mission (the host may start alone).
- Two windows: A: Co-op > Host a room (Room: Public). B: Co-op > Browse rooms > pick it > Ready. A: Start mission.
- Sector Ops solo: Sector Ops > Warehouse > briefing > Start. Co-op: Host a room > Mode Sector Ops.

## 1. On /preview/ now (4.55.0-4.63.1, not walked yet)
- Draws and holsters (4.56.0) - Marlow solo, X with each gun.
  Look: rifle out ~1.1 s, pistol ~0.75 s, one smooth move; double-tap X or vault mid-draw reverses it, no snap.
  Settles: Waiting 1 (draws signed off).
- Security room, bay 3 (4.55.0) - two windows, station 3.
  Look: console refuses while the duty guard stands; drop him, use it: camera dark on both screens; bay restart resets.
  Settles: Waiting 1.
- Wheel opens on goggles (4.55.0) - any match, hold LB.
  Look: A with the stick centred cycles vision; stick onto a gun, let go: vision lights; stick + LB together picks the gun.
  Settles: Waiting 1 and Waiting 4 (W grace).
- Body and feet (4.61.0) - Marlow solo, holstered walk, jog, sneak, crouch walk, turns.
  Look: hips and shoulders counter-turn, hips sway, head nods; turning feet lift and pivot; no run pop per foot strike.
  Settles: Waiting 1 (go-ahead for your full anim tune, now that N1 / N2 have landed).
- Wall block and recoil (4.57.0) - Sector Ops solo, aim the rifle into a wall up close, then fire.
  Look: gun tips muzzle-down about the butt and comes back as you step off, no stall; each shot kicks hands and chest.
  Settles: Waiting 4 (A2 muzzle-down over CT's muzzle-up; A1 recoil above CT's 0.5 deg; undo = recoilMul 0).
- Landing roll (4.62.0) - Marlow solo, drop off a ledge onto open floor, then one next to a wall.
  Look: open floor: grounded shoulder roll; under ~1.5 m of room: she lands without the roll, no head in the wall.
  Settles: Waiting 6.
- Vents (4.59.0) - Sector Ops section 3, service route, plant room west door grate.
  Look: tap Y kicks it open; hold Y (or Y then A held) unscrews quietly; keyboard Space tap / Space then E held.
  Settles: Waiting 7 (hold-jump unscrew, T1 A1).
- Sector Ops lights (4.61.0) - Settings > Graphics > preset High or Epic, then Sector Ops section 1.
  Look: no white ceiling-to-floor fog cones under the LED strips; goods-in, workshop and girder read darker.
  Settles: Waiting 5 (close it, or name a spot).
- Hand swap, elbow strike, kills (4.59.0 / 4.60.0) - Sector Ops: swap shoulders aiming, RT tap and hold on guards.
  Look: gun passes low across the chest, not round the head; elbow lands on the hit; kill blows land on the kill.
  Settles: no Waiting item (N4c / N4d sign-off).
- Cameras, lasers, power panels (4.57.0 / 4.59.0) - Sector Ops, and Marlow station 4.
  Look: cameras watch a floor patch, faint grid; lasers only in NV, alarm not damage; jam the panel (RB): lasers off.
  Settles: no Waiting item (sector-fixes C / P).
- Co-op holders and traversal (4.62.0) - two windows, Marlow leg-up, throw, hang-down, rope stations.
  Look: the helper moves (dips, throws, leans on the rope); mantles plant both hands; split brace hands on the walls.
  Settles: no Waiting item (N4b sign-off).
- Sector Ops co-op routes and team doors (4.63.0) - two windows, Sector Ops co-op, each section.
  Look: leg-up onto the 4.4 m lip (out of solo reach), partner relays or drops the rope; only the far side gets Unbolt.
  Settles: base for Waiting 9 (r2 below replaces the door pathways).

## 2. Arriving overnight (if merged by morning; check the label and ROADMAP "Done")
- Mocap toggle, train 15 = 4.64.0 - Settings > Gameplay > "Mocap locomotion" on, then Marlow solo, holstered.
  Look: CMU walk / jog / run, walking 90 deg turns, start, stop, turn on the spot; toggle off = the game as before.
  Settles: Waiting 8 (keep mocap and grow it, or stay hand-keyed).
- More mocap clips (mocap-trial-2) - same toggle: crouch walk, sprint, strafe, back to a wall.
  Look: no pops between clips; planted feet stay put in turns (no twisting about the ankle).
  Settles: Waiting 8.
- Sector Ops team doors r2 (sector-fixes-r2) - two windows, then Sector Ops solo, each section.
  Look: each team pathway needs both players, solo still finishes every section, guards do not stall at bolted doors.
  Settles: Waiting 9.
- Marlow Yard redesign (marlow-final) - Co-op > Host a room > Campaign, two windows.
  Look: new flow, objective list guides (no pads), glass gallery, LED strips, sliding doors, co-op set pieces, 15-20 min.
  Settles: ROADMAP Decided marlow-final M4-M6 (no Waiting number). Not merged: review docs/marlow-final/SPEC.md.

## 3. Known, do not report
- LT draw from mid-holster: the gun passes through the trunk (Waiting 1).
- Walk step length vs the wall peek (#67 S2b): yours to fix in animation dev (Waiting 3).
- Mocap as captured (your call): pelvis bob 5.5-6.6 cm, knee-out 3.5 cm, smaller run arm swing.
- Mocap: holstered moves only (jog / run turns, jog stop, run start not in); per machine, the partner shows its own.
- 4.64.0 without mocap-trial-2: a planted foot can twist about the ankle in turns (fixed in mocap-trial-2).
- Laser beams cannot be jammed (jam the panel); Sector Ops cameras have no console; floods and torches keep beams.
- No roll with under ~1.5 m of room: by design (ROLL_CLEAR).
- Marlow redesign: lighting rule loosenings are proposals only; guards are normal models; the gallery is view only.
