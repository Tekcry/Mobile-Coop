# Animation and controls rework - plan

Brief: `BRIEF.md` (Michael 2026-10-20 13:30-13:40, M1-M5, A1-A3). Built on feature/ct-prototype (the G8 keyed-clip
pipeline, `scripts/anim-keys/`, `src/anim/keyed.ts`, `src/anim/clips/keyed/`). The CT movement references are dropped
for movement and animation (Michael: "Can you ignore CT movement references"); the reference is real-world operator
technique. No tracing of any game's animation.

Each slice: an Opus implementer, an independent Opus check, at most one fix round, `npm run check`, e2e:quick on the
desktop plus e2e-ctcourse / e2e-coop / e2e-netmove solo on the laptop, a contact sheet for Michael, /ct/, then a small
PR to master (the orchestrator merges).

| slice | scope | report |
| --- | --- | --- |
| 1 | Controls: analogue speed from the stick (no gears or speed buttons), three states (holstered / low ready / aiming), LT held aims, X tap holster / draw, X hold reload (A2), LT from holstered draws to aim slower (sling draw, existing animation until slice 3), RT fire only aiming (A3), RT tap knockout / hold kill (holstered and holding), LT while holding = pistol shield, traversal auto-holsters and returns to the state; KBM (A1); settings migration; docs and tests | `S1-REPORT.md` |
| 2 | Holstered locomotion standing and crouched, idles, starts / stops / turns, continuous speed and direction blends (keyed clips) | `S2-REPORT.md` |
| 3 | Low ready and aiming, rifle and pistol, standing and crouched, the glide, all weapon transitions incl. the sling draw | `S3-REPORT.md` |
| 4 | Sneak, crouch walk and run, the crouched idle with the knee hand | `S4-REPORT.md` |
| 5 | Walls and corners, standing and crouched (slide, peek, slicing, aim out) | `S5-REPORT.md` |
| 6 | Close quarters: grab, hold (slow, backward-first, limited turning, knife at the throat), shield, choke knockout, knife kill, carry | `S6-REPORT.md` |

Parked from the CT job: `park/ct-h1-wip` (the crouch-run roll may still apply); G8 walk rounds 1-3b are the starting
point for slice 2's clips, not its target.
