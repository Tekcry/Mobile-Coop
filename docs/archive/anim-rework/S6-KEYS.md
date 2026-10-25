# Slice 6 keys: Wren's hold clips (Course Ready Build, 2026-10-20)

Keyed by hand in the G8 key format (BRIEF M5, section 3 "Holding a guard"), never traced. New files only; nothing is
wired.

The arms were solved numerically onto the guard's contact points and written as plain angles. The guard was posed from
his own keys (`guard_held_hands`, `guard_held_stumble`, `guard_choke_sag`, `guard_knife_collapse`) at the game's hold
placement (`GRAB.hold` 0.32 m ahead, `side` 0.1 m to her left), scaled 1.78 / 1.68 against Wren. The solver used a JS
mirror of `key_clip.py`'s FK, which reproduces the baked arm channels exactly. Prototype quality.

## Files
Keys are in `scripts/anim-keys/keys/<clip>.json`; baked modules in `src/anim/clips/keyed/<clip>.ts`
(`KEYED_HOLD_IDLE` ...). None is mirrored, so the hands keep their sides.

Strips are in `docs/anim-rework/shots/s6-keys/`:
- `<clip>-side.png` / `-front.png`: Wren alone.
- `<clip>-pair-side.png` / `-pair-front.png`: Wren (light) against the guard (dark), posed from his clip at the same
  time. `key_clip.py` draws one figure only, so the pair sheets come from a scratch Blender script (capsules from
  the FK joints).

| Clip | Keys / frames | Paired guard clip | Timing |
| --- | --- | --- | --- |
| hold_idle | 8 / 32 | guard_held_hands | cycle |
| hold_back | 8 / 32 | guard_held_stumble (phase-matched: both left feet land behind at 0, duty 0.62) | cycle, phase from distance like his |
| hold_side | 8 / 32 (one step to the RIGHT) | guard_held_hands | cycle |
| hold_fwd | 8 / 32 | guard_held_hands | cycle |
| hold_choke | 11 / 48, at his key frames 0, 1, 5, 10, 14, 18, 22, 28, 33, 40, 47 | guard_choke_sag | one-shot 5.5 s, phase min(t / 5.5, 1) x 47 / 48 |
| hold_knife | 12 / 48, at his key frames 0, 1, 3, 5, 8, 11, 15, 20, 25, 29, 40, 47 | guard_knife_collapse | one-shot 3.0 s, phase min(t / 3, 1) x 47 / 48 |

## Contact points (Wren's 1.75 m body frame)
- **Knife (right) forearm** across the front of his throat: the point 30 % up from his neck to his head and 7.5 cm in
  front of it (about y 1.56 m, z 0.23 m, his midline x -0.10 m). His hands hook this forearm in his held_hands keys.
  - The forearm lies 2.8-3.1 cm (its own radius) from the point on every hold key.
  - The wrist runs 10 cm past it to his left, rising a little toward his left jaw. Elbow bend 24-37 deg.
  - Wren is 10 cm shorter, so the arm reaches up over his right shoulder.
- **Support (left) forearm** across his chest under his elbows: his chest joint plus 6 cm up and 15.5 cm forward. The
  forearm is 3.4-4.0 cm from it on every key, the hand on his right chest. Elbow bend 28-48 deg.
- **Body:** her pelvis 10 cm behind her root (11 cm in the push).
  - Chest-to-back gap 0 to 3 cm in the idle, back and side holds; at most 0.7 cm overlap in the push, where her chest
    leans on him.
  - Measured as capsule gaps with the preview radii (chest 13 cm), which are generous.
- **Choke:**
  - 0-1.2 s: the right forearm tightens across his throat, and her left palm is on her right wrist.
  - 1.2-3.2 s: both palms under his arms on his upper chest, within 0-4 cm of the target.
  - 3.8 s: the hands hover about 11 cm above his shoulders as she lets go.
  - No overlap from 2.1 s onward: her knees spread either side of his head (legs add -15, centred on him with dx -10).
- **Knife:** the hand draws 6 cm back across his throat (0-0.32 s), then lets go at 0.35 s as he folds forward away
  from her. From 0.5 s the nearest parts are 1.5-7.6 cm apart.

## Wiring notes (slice 6)
- **Root motion in the choke.** He folds back onto her: his neck passes her start position by 1.6 s and his head lies
  0.81 m behind it. So she steps back through pelvis dz from -16 to -92 cm (1.2-3.8 s), then to -106 cm by 5.4 s.
  - Move her root back by that amount and take the clip's dz relative to it.
  - Or let the dz drive a root offset; the planner feet will not follow a pelvis-only offset.
- **Crouched depth.** The clips' dy is the full depth (the choke goes down to -38 cm). Do not add it to the procedural
  crouch.
- **Arms.**
  - Let the keyed arms replace `holdHandTargets` (the current procedural pose has the left forearm across the throat
    and the right hand on his shoulder; the brief and these keys swap that: knife hand at the throat, support arm
    across the chest).
  - Or keep the IK and feed it these keys' hand positions.
  - The guard's hands are keyed on the knife forearm, so the keyed version matches him.
- **Human shield (procedural, not keyed).** The pistol comes up past his right shoulder in the right hand; the left
  forearm stays across his chest as here; her head goes behind his right shoulder, cheek to the sights. Her trunk and
  legs can keep hold_idle / hold_back.
- **hold_side** is written to the right; mirror it for the left. The guard has no side clip; his feet follow the planner.
- **Duty and liftH:** holds 0.56-0.62 / 0.04, matched to his stumble for hold_back.
- **Not checked:** in-game contact (the game's guard proportions, the 2 cm hostage sway), the GPU look, e2e-clip.

## Issue found in my earlier key generators (S3-S5)
The S3, S4 and S5 generators set the pelvis height from the longest planted leg, but for a foot planted on its toes
they subtracted the heel lift instead of adding it. This S6 generator has it right.

- **In the game:** no effect.
  - The game's feet come from the foot planner.
  - The delivered dy values follow the flat planted leg and keep their 1-2 cm bob.
- **In the previews:** on keys where a toes-down planted foot sinks, the preview's floor snap lifts the whole figure.
  - Worst: crouch_run phase 0.375 (up to 11.5 cm).
  - sneak 0.125 (8 cm), crouch_walk and wall_crouch_slide 0 (6 cm), wall_crouch_peek (6.6 cm).
  - The glides, ready stance, wall standing clips and both crouched idles are within 3 cm.
- **Fix if wanted:** re-key those clips' toe-off legs so both planted legs agree, then rebake.
