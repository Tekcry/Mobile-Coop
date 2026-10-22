# N3 draw and holster times - real-world research (2026-10-22)

Michael (2026-10-22, ROADMAP Decided): "Research what is believable and realistic." These are the new defaults. Every
value stays on the tuner's Draw sliders (draw time / holster time multipliers); the per-clip speed slider is Course
Ready's (feature/clip-speed).

## What the game times
The game's draw time runs from the press to the gun settled at low ready: hand movement only. Published figures time
"signal to first shot", which adds a reaction (perceive, decide) and a raise-and-fire from the ready. So the draw is
taken as a difference of two measured times, never a raw "draw to shot" figure.

## Sources
1. Hontz and Rheingans (1996), 76 officers, 15 ft, light cue (summarised in [Officer.com, "Fractions of a
   Second"](https://www.officer.com/article/10248725/fractions-of-a-second)): one shot on a large target from low ready
   1.15 s; the same from the holster 1.90 s. Same people, same cue, same shot: **the holster adds 0.75 s** over low
   ready.
2. Same article, high-speed video: raise to fire (gun in hand, low to shot) 0.59 s.
3. Lewinski / Force Science (secondary: [POLICE, "The Force
   Scientist"](https://www.policemag.com/340288/the-force-scientist), [Law Officer, Tueller drill research
   comparison](https://www.lawofficer.com/tueller-drill-research-comparison/)): stimulus to sighted shot, Level II
   holster 1.50 s, Level III 1.70 s; retention adds time.
4. AZPOST study ([VirTra](https://www.virtra.com/time-analysis-of-a-certified-peace-officers-blog/)): certified
   officers, cold, tone to one round at 3 yd 1.78 s (SD 0.33); slowest holster (Safariland 6280) 1.87 s.
5. Slung rifle: unsling and on target "in less than two seconds" as the practised standard ([Athlon Outdoors, rifle
   shooting tips](https://athlonoutdoors.com/article/rifle-shooting-tips/)); about 2 s for a two-point sling transition
   ([308AR forum](https://forum.308ar.com/topic/10416-how-to-properly-utilize-and-transition-your-beachin-tactical-2-point-sling/)).
   No official timed standard exists.
6. Rifle-to-pistol transition: a demonstrated 1.02 s ([Safariland CADRE Dispatch](https://inside.safariland.com/?p=39518));
   qualification courses allow 4-10 s including shots (e.g. [Action Target Gunfighter
   standards](https://shop.actiontarget.com/images/Gunfighter%20standards%20instructions.pdf)).
7. Holstering: no timed standard anywhere. Instructors teach it slow and deliberate, finger out, the gun guided and
   seated ([Shooting Illustrated, "Holster Your Handgun Slowly, Not
   Quickly"](https://www.shootingillustrated.com/content/holster-your-handgun-slowly-not-quickly/); [Shooting
   Illustrated, "Speed Holstering: Why It's a Bad
   Idea"](https://shootingillustrated.com/content/speed-holstering-why-it-s-a-bad-idea)).

## Defaults
| Value | Old (master 4.51.0) | New | Derivation |
| --- | --- | --- | --- |
| Pistol draw, X (holster to low ready) | 0.5 s | **0.75 s** | Source 1: 1.90 - 1.15 s. A thigh retention holster sits between Level II and III (source 3). |
| Rifle draw, X (back to low ready) | 0.3 s | **1.1 s** | Source 5: ~2.0 s on target, minus the raise to fire (0.59 s, source 2) and a ~0.3 s reaction. |
| Pistol LT sling draw (holster to aimed) | 0.8 s | 1.2 s | `slingDrawMult` 1.6 kept: draw plus the raise to the eye. |
| Rifle LT sling draw (back to aimed) | 0.75 s | 1.5 s | `slingDrawLong` 1.36 kept: draw plus the raise to the shoulder. |
| Pistol holster | 0.15 s | **0.9 s** | Source 7: slower than the draw; reverse path, seat, retention. |
| Rifle holster (to the back) | 0.15 s | **1.0 s** | Source 7, same reasoning; the sling guides it. |

All new raise times are at or above the bible's minimums (G103: 0.6 s pistol, 0.75 s rifle). The holster times exceed
the bible's "0.5-0.6 s to lower" (G103) and replace G2's 0.15 s: Michael's 2026-10-22 instruction outranks both; the
bible G103 line is updated on this branch. Undo: the "Old" column (drawState.ts), or the tuner multipliers.
