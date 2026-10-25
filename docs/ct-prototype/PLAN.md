# CT co-op prototype - plan (draft for Michael's approval, 2026-10-18)

Goal: a working two-player Chaos Theory co-op prototype, built in short slices that each end in something Michael
plays, with no days of unattended code that may not be used (Michael, 2026-10-18). Sources: docs/DECISIONS.md, the
research digests in docs/ct-research/ (levels, moves-mechanics, kit-design, design-kit, code-inventory) and
docs/ct-research/DECISIONS-PENDING.md (Michael's D-01 to D-25 and the 2026-10-18 answers, given G numbers at merge).

## Change (Michael, 2026-10-18): core feel first
"Core feel first": the movement track below becomes a fine-tuning job, not a quick prototype: a fresh session
rebuilds and tunes CT movement, camera, wall, doors, strike and goggles on Wren (Opus for tuning) until Michael signs
off, starting with a short code review that decides rewrite vs adjust for the player controller and animation graph.
Brief: docs/ct-prototype/FEEL-BRIEF.md on feature/ct-prototype. The co-op track (C1-C7) follows the sign-off as
prototype slices (Sonnet, medium).

## How every slice runs
- One branch `feature/ct-prototype` from master, folder `C:/NightShift/Mobile-Coop-ct-prototype`.
- One implementer agent per slice (Sonnet, medium effort: Michael, 2026-10-18, "Sonnet, medium" for all prototype slices; Opus only if a slice gets stuck; fine tuning later on Opus), then a light check only: `npm run check`, the slice's
  e2e suites on port 4191 (plus e2e-netmove / e2e-coop when it touches movement or src/net), a screenshot or short
  capture. No anim-audit fix rounds, no metric polish, no perf work (G4). Tests that assert old numbers are updated or
  marked "prototype: revisit", never left failing.
- Every number is a starting value (G10). CT has no published numbers for move heights, sync windows or jammer charge:
  they start where the digests suggest and are tuned by feel.
- After each slice: commit, push, then STOP. Michael plays it (two browser tabs on one PC: `?net=local`) for about 10-15
  minutes and says keep, change or drop. Nothing else starts until he answers.
- Co-op parity holds in every slice: what one player does, the other sees (remotes pose from MoveState).

## Order (Michael, 2026-10-18: "CT movement first")
Before M1: the operators PR (Wren replaces the player body for both players, G123) merges first, so posture and
animation are tuned once, on Wren. The menu job runs alongside on its own branch.

### Movement track (from docs/archive/locomotion/PROTOTYPE-PLAN.md P1-P4, updated to docs/DECISIONS.md)
| Slice | What Michael plays | Built |
| --- | --- | --- |
| M1 Body | Walk, crouch and stop like CT | Five analog speeds standing and crouched, no sprint (loco M20 Q8), max-speed rocker with no indicator, gear pips removed (G107); starts, stops frozen mid-stride at every speed (G26), ease to idle after about 1.7 s (G27), turns as the footage (G25, G33), CT posture, roll on held crouch (G32); silent bands two standing, three crouched (G40). |
| M2 Camera and aim | Explore and aim framing | CT framing about 1.8 m, head at centre (G28), rigid follow with a gentle swing, no zoom (G29), strict corner-peek (D-14), CT draw and lower timings (G103), shoulder swap only while aiming (G17), no aim assist (G16), marksman hold breath stays out until the kit slice. |
| M3 Wall, doors, pad layout | Back-to-wall, peek, doors | CT pad layout button for button (G96; back-to-wall on L3, G18), wall entry by button (G34), CT shuffle 0.35 m/s (G35), peek at once (G36), lean-out and SWAT turn removed (G52), door menu: open, stealth open, bash, optic cable (G97, G19), guards close doors behind them and notice open ones, one 15 % threshold (G41). |
| M4 Strike, grab, vision | Close combat and goggles | Palm strike, one hit on every human guard (G42), grab first, then knock out / kill (interrogate later) from a grab menu (G23, G43), goggles: instant cut in CT order thermal, electro, night, off (G100), CT grain and thermal (G101, G102), goggle on the brow when off (G73). |

### Co-op track: one original test level, "Pumphouse Nine" (levels digest section 4)
A municipal water pumping station at night, about 7-9 minutes for a pair, 8 beats in CT's training order. Original
setting and names; built with the level builder like the course lab (about 150-300 lines), greybox first.
| Slice | What Michael plays | Built |
| --- | --- | --- |
| C1 Shell | Both players start in two tabs, walk the greybox level, exit together | Two tabs auto-start into the level (any mode, not only the course), player cap 2 (G2, G50), extraction only when both are in the zone (D-15), partner beacons in two lamp colours (D-12), the prototype kit issued per player (below). |
| C2 Light | Shoot the yard floodlight, kill the office breaker, a guard walks to fix it, ambush from the dark | Lights, switches and door locks synced in every co-op mode (today only in the course), so both players and the guards see the same light (light parity); guards relight lamps and investigate dead lights (G11 kept). |
| C3 Team moves | Boost over the yard wall, ledge relay for the partner | Team moves anywhere with room (Michael, 2026-10-18; replaces G81), a prompt naming the move and who starts it, a polite refusal when there is no room; reuses today's boost and human ladder. |
| C4 Jammer | Jam the corridor camera while the partner passes, then swap | The held pistol jammer replaces the thrown EMP (Michael, 2026-10-18): hold on one light, camera or laser, charge drains while held and refills, standing still. |
| C5 Throw and alarms | Throw the partner over the tripwire gap; the far side releases the laser | Partner throw (D-07) with the far-side release; tripwire raises an alarm stage, never ends the run (D-02); guards put on armour and helmets as the stage rises, no heavies or dogs (Michael, 2026-10-18). |
| C6 Hang-down | Lower the partner head-first over the lit valve pit; hack while hanging, a guard walks underneath | Hang-down at the hoist point (D-07), holder controls height, hack while hanging, shared intel on both players' devices; guards see poorly above them (G44). |
| C7 Finale and failure | Split routes to two consoles, turn the keys within the window; get downed and revived | Two-key consoles with ready lights and a forgiving window (start about 1 s), a missed sync raises the alarm and resets (never death); both-present trigger at the overlook; revive within 30 s, two per mission, both down reloads the last checkpoint, checkpoints after beats 3 and 5 (D-03). |

### Prototype kit (fixed per mission and complementary: Michael, 2026-10-18; D-11)
Both: pistol with the held jammer, rifle with 30 rounds and the launcher fitted, the sticky camera round, one revive
syringe. Player A: shock round. Player B: flash grenade. Kept gadgets in code beyond this stay available for testing;
the EMP, noisemaker and carried mine are removed when the jammer lands (kit digest section 1).

## Not in the prototype (after Michael approves it)
Voice chat (D-06, D-17: after the prototype, Michael 2026-10-18), split-screen and LAN without internet (D-10), world
pings beyond the beacons, belay line, stack, carry and escort, two-person questioning (D-25), randomised solutions
(D-20), interrogation, knife, ring airfoil round, the bunker rebuild (G79), real mission maps, menus beyond the menu job,
missing sounds (G66), the level standard changes (review list, Michael 2026-10-18).

## Estimate
11 slices, each about 2-4 hours of agent work plus Michael's 10-15 minute play. Nothing runs past a slice without his
answer.
