# anim-guard - checker report (2026-10-20)

Checked `git diff 00b654cd 90d1c8bf` (head 90d1c8bf) against `docs/anim-guard/BRIEF.md`, `docs/anim-rework/BRIEF.md`
"Holding a guard" (M5) and the bible's realism standard.

## Verdict: PASS

## Checks
1. Only new files: yes. 18 files, all added (`git diff --name-status`), nothing existing edited. No `src/` file outside
   `src/anim/clips/keyed/guard_*.ts` imports the clips: not wired. No em dashes, no reference-game names.
   The sheet tool (`scripts/anim-keys/sheet.mjs`, `py/sheet_clip.py`) and the underscore names are outside the brief's
   literal scope list but logged as A6 and A1.
2. The clips match the brief:
   - Stumble: trunk arched back, pelvis behind the feet, short steps backwards, the front foot on its heel, the swing foot
     never above 3.5 cm (dragging / skimming), one foot always planted.
   - Hands: both hands up in front of the throat at chin height on the holder's forearm, elbows down and out, pull and
     re-grip cycle.
   - Choke sag: buckle, lowered to sitting, laid back, still; pelvis drop capped at 1.2 m/s (controlled).
   - Knife collapse: stiffen, knees, forward face down, still by about 1.85 s of 3 s; no flailing, no hand to the throat.
     Short and not gratuitous.
3. Sheets (all four viewed, choke and collapse zoomed): knees bend forward only (keys: knee 3 to 109, never negative;
   hip adduction within -5 to 4.4, so no sideways knees); feet on the floor or deliberately dragging; both one-shots end
   lying still (sag on the back, collapse face down). No limb through the body I could see at capsule resolution; the
   collapse's arms pass under the trunk in the side view but the front view shows them out to the sides.
4. Tests: `npx vitest run tests/animGuard.test.ts` 21/21. They import the real baked TS clips (sampling, unit
   quaternions, wrist frames, trunk and elbow ranges, segment lengths, 60 Hz continuity, end pose and stillness, drop
   speed, direction of fall) and run FK on the key JSON for the floor and the stumble's feet (the runtime clip carries
   no legs, so that is the only way). Limits are meaningful.
5. Format: the four TS files build through `keyedClip()` from `src/anim/keyed.ts`; `npx tsc --noEmit` clean.
6. Report slice-6 notes spot-checked: `characterRig.ts:1746` (`keyW` only in the free gait) and `:2053` (`keyArmW`)
   correct; `src/ai/enemyRig.ts:14` and `src/ai/body.ts:12` build `CharacterRig`; `sampleKeyed` wraps the phase
   (`keyed.ts:153-155`), so the one-shot formula `min(t / d, 1) x 47 / 48` lands on frame 47. Accurate.

## Polish (not blocking)
- The knife collapse keys an ankle of -70 deg (prone, foot pointed); real plantarflexion tops out near 50. Ease to about
  -50 when the leg channel is wired.
- The joint-range test checks trunk and elbows only; add the leg ranges (knee >= 0, ankle within -50 to 30) on the key FK
  for all four clips so the one-shots are covered too.
- Choke sag around 1.3-1.6 s: the right forearm falls across the belly and may graze the trunk capsule; check in game.
- `sheet.mjs` hardcodes the local ffmpeg path (same as `build.mjs`; `FFMPEG` overrides it).
