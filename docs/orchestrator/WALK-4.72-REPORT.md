# Walk report 4.72 / 4.73 (Michael, 2026-10-23 ~13:55)

Michael's words, routed by owner. Each lead: add these to its PLAN as slices (a fix batch per train), reply to the orchestrator only with the PR. "We need to fix all animations anyway, even the normal ones arent good" (ROADMAP Decided 13:55).

## Player Build (animation, mocap, co-op moves)
- P1 Mocap locomotion: "turning when walking is ok legs wise but anything faster is bad, legs sticking and overlapping eachother, hands randomly moving around when running, weird pose when running."
- P2 Crouch: "crouched idle looks ok, leaning a bit too far forward seems hard to balance in real life, the crouch walk is still awkard."
- P3 Mocap off: "has old animations which are also still as bad as they originally were."
- P4 Crouch cover strafe: "with rifle clips and moves around constantly, pistol shifts between knees."
- P5 Co-op partner: "animations are bad, doesnt match existing animations, seem more jumpy."
- P6 Co-op hostage: "coop partner has takedown option when host is holding hostage, but it doesnt do anything. should trigger coop takedown"; "if coop partner holds guard, host doesnt have option for takedown."
- P7 Co-op audio: "coop player shooting doubles audio and doesnt sound suppressed."
- Pass: co-op throw knocks the guard out (item 23).
- Direction: a full animation fix pass (Opus plans it from P1-P5 with measured before / after sheets); top priority (Michael 2026-10-20 "movement and animations are the top priority").

## Guard AI Build
- G1 Lasers: "when guards alerted when i cross laser, they somehow know ive climbed elsewhere. theres no way they could no that unless they saw me. change it so they come to look where the laser is and search the room."
- G2 Bodies: "guards investigating dead bodies give up too easily."
- G3 Urgency: "guards should rush to any triggered alarms or bodies reported, they need a sense of urgency when it makes logical sense."
- G4 Collision: "guards seem to walk through eachother and sometimes doors."
- G5 Carry: "they also dont always have to be low-ready, then can walk around holstered if they are in a calm area." (all guards still armed, G-decision 2026-10-23 ~01:25)
- G6 Security console (Marlow S3, with Marlow Build): "if i turn it off while hes distracted, he should notice when he sees it and turn it back on also."
- Pass / note: every guard carries a gun (item 4); a shot lamp drew some guards to inspect (item 9); noise behind walls brought nobody, but none were nearby (item 5 not proven).

## Marlow Build (Marlow Yard)
- M1 S3 hallway camera: "works, but it can be shot and broken. should be bulletproof."
- M2 Checkpoint restart is not a full reset: "i restarted checkpoint s3 after killing the guard, and the new guard detected the old guard and went cautious. i restarted checkpoint a second time and the guard went back to normal. camera was stil broken both times though. old guards dead body was still there too." Same in co-op: "spawned another guard and cautious".
- M3 "s2 restart doesnt reset doors either, seems to be a marlow yards issue. doesnt happen in sector ops warehouse."
- M4 S3 console: "tried to use s3 cameras, it said guard was still watching" (expected while he stands; see G6 for the switch-back behaviour).
- M5 Light: "light above s2 locked door is on and half over both rooms but doesnt shed any light into the first room - lighting system doesnt seem to be working properly or spreading light as much as it should. not realistic."

## Sector Ops Build (lighting review, co-op light sync)
- S1 Lighting realism: "goods in seems brighter but the lights just dont light up everything like the would normally. theres so many lights but its still hard to see, are the lights actually outputting light as they should realistically??" With M5: measure lamp output / falloff / bounce against real fittings (docs/archive/lighting-review/PROPOSAL.md LR1-LR12), propose one engine fix for all maps; Michael decides.
- S2 Co-op lamps: "host shot out light, coop game light turned off too, but coop shooting lights does nothing for either game." (client lamp shots never reach the host)
- S3 Team doors: "unbolt worked on one side as intended, didnt try client pressing it due to restart issue."
- Pass: Warehouse restart "everything seem to reset properly" (item 15).
