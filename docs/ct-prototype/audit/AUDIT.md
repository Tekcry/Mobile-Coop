# Movement audit vs the CT footage (2026-10-20, overnight)

Michael's brief: `../DECISIONS.md` (2026-10-19 23:15, 23:20, 23:45). Catalogue: `../FOOTAGE-CATALOGUE.md`. Six area audits
(Opus, cut short by the usage limit: rows not frame-stepped are marked "estimate"): `AUDIT-LOCOMOTION.md`,
`AUDIT-CAMERA.md`, `AUDIT-AIM.md`, `AUDIT-WALLS.md`, `AUDIT-TRAVERSAL.md`, `AUDIT-ACTIONMENU.md`. Frames used:
`pc/ct-work/frames/<area>/` (local only).

## Slices, in order (what Michael feels first)
| slice | area | items (detail and numbers in the area file) | size |
| --- | --- | --- | --- |
| G1 | Legs and gait | walk / jog / run gaits; rest pose; the over-exaggerated sneak near guards with the hand near the knife (Michael 00:55); turns: pelvis, knees and feet turn with the torso (`TURN_FOLLOW.twistMax` 0.9 -> 0.25, `PELVIS_FOLLOW_MAX` 0.35 -> 0.05, planted feet follow the root yaw in free movement, side foot offset <= 0.14 m: also the bob); walk upright, stance knee <= 10 deg; run 4.6 steps/s, ~1.0 m a step (`stepLenMax` 0.95), run lean earlier (1.6-3.0 m/s); kneel within ~0.3 s of the stop, no squat first; crouch-run rear knee >= 0.15 m off the floor; drop landing dip 0.4 m with arms out | L |
| G2 | Aim and weapons | rifle draw back to cheek in ~0.2 s and holster ~0.2 s (footage 111908; replaces G103's 0.75 s raise, assumed A-entry); rifle slung diagonally on the back (stock at the right shoulder, muzzle down-left); upper body rigid in ADS (hips take part of the aim pitch); pistol two-handed, lower (chin height) | M |
| G3 | Camera | open spaces frame the whole body at ~3.3 m (interiors 1.8 m): a per-space boom; ADS head position from the footage (`shoulderAds`, `boomAds`); pivot 1.68, start pitch -0.21; wall peek yaw 45 deg, 0.35 s; traversal presets centred | M |
| G4 | Traversal | drainpipe: one reach per hand per ~1.15 s, feet together with a push surge; hang shimmy 0.5 m/s, 1.0 s hand cycle, legs trail ~16 deg; climb-up 0.85 s ending crouched, stand only on a held stick; ladder 1.7 rungs/s, top-out 1.0 s | M |
| G7 | Grab, hold, knockout | grab from behind, hostage hold and walk, carry, knockouts (Michael 00:55; rows in AUDIT-WALLS.md); after G4 | L |
| G5 | Action menu | CT's hold-A context menu (Michael 23:20): spec in `AUDIT-ACTIONMENU.md` | M |
| G6 | Walls and doors | the hand on the knee crouched against a wall (Michael 00:55); wall slide 0.35 / 0.30 m/s; standing slide torso turned toward travel; crouched wall stance side-on; door open step with the palm on the leaf, stealth open; grab pull-in and neck hold; body pick-up 2.0 s, carry 1.2 m/s | L |

Missing entirely (prototype later, after G1-G6): free-hanging rope climb, floor trap, scope view (first person 1.5x),
rail vault and beam walk (not measured).

## Assumed decisions (A-numbers in `../DECISIONS.md`)
- Where the footage contradicts an earlier recorded number (G103 raise timing, the F1a camera offsets), the footage
  wins (Michael 23:45: "operate identically to those recorded"); each change says what it replaces so it can be undone.
  Confirmed by Michael 00:50; the explore offset and FOV now follow CT too.

## Questions for Michael (morning)
- Explore camera shoulder offset: answered 00:50 "Match CT (0.15 m)" (G3).
- FOV: answered 00:50 "Match CT (86)" (G3). Footage beats G103 / F1a: "Footage wins".
