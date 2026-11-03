# Night Shift - what carries over to Unreal
Owner: the orchestrator. Status: current (Unreal re-plan run, 2026-11-03; checked against the files on the laptop).

The Babylon.js build is paused, not deleted (N58): everything below stays where it is in this repository and on the
laptop. "Moves across" means the Unreal work reads or imports it as it is.

## Moves across as it is
| What | Where | Note |
|---|---|---|
| Michael's decisions | `docs/plan/DECISIONS-2026-11.md` (N1-N60) | Babylon-only entries (N8 Edge tests, N14 branches, N21 flags, N24-N25 relay, N51 code textures) apply to the paused build only |
| Vision draft v3 (provisional) | `docs/plan/VISION-DRAFT-v3.md` | Unchanged; its last line ("GitHub tests every change") becomes the laptop's automated run |
| Story, ending, campaign outline | `docs/story.md`, `docs/plan/ENDING-DRAFT.md`, `docs/plan/CAMPAIGN-OUTLINE.md` | |
| Michael's feedback record | `docs/plan/FEEDBACK-RECORD.md` | Now with walk test round 1 |
| Chaos Theory measurements | `docs/research/ct-movement/` (13 files) | The source videos are on the other PC |
| Basic movement checklist and references | N55 | Phase 2's target |
| Mission recipe, playtest kit, scope tiers | `docs/plan/MISSION-TEMPLATE.md`, `PLAYTEST-KIT.md`, `SCOPE.md` | Provisional numbers stay provisional (N48) |
| Hazelight lessons | `docs/research/hazelight-2026-11/` | Hypotheses (N48) |
| Mixamo raw files (130 MB) | `D:/NightShift/mixamo-raw/` | 3 characters (`xbot`, `ybot`, `swat`), 79 moves, 3 packs (94 FBX), Action Forge crouch clips (CC0); imported straight into Unreal |
| Music | `src/assets/music/game/` (9 rendered stems, 7 MB) | Imported as sound files |
| Music generator | `src/audio/score/`, `scripts/music/`, `docs/audio/` | Runs on Node with no Babylon code; stays here as the offline tool that renders stems |
| Sound effects | `src/assets/sfx/` (foley and weapon sound sheets) | Cut into single sounds on import |
| Menu font | `src/ui/fonts/` (Barlow Condensed, SIL OFL) | |
| Credits | `docs/art-credits.md`, `docs/audio-credits.md`, `docs/audio/samples.md` | Rows for what moves; new Unreal assets add rows |
| Blender 5.2.2 portable, `grab.sh` | `D:/NightShift/tools/` | Mixamo downloads and fixes |

## Rebuilt in Unreal (all code)
- Movement, camera, animation setup (Mixamo import and retarget replace `scripts/mixamo/pack.mjs` and the old rig).
- Two-player co-op (Unreal's built-in networking replaces WebRTC and the relay).
- Guards, sight and hearing, the light meter, readable darkness, night vision and thermal.
- Team moves, gadgets, weapons, context actions, pings, compass, HUD, menus, saves, checkpoints, rating.
- The Test Chamber (its layout rules N7, N11, N17 and `docs/plan/TEST-CHAMBER-SPEC.md` are the reference), then Marlow
  Yard and the missions.
- The automated run (RULES 7) and the music director (adaptive playback).

## Dropped (left in the paused build)
- The Babylon.js, Vite and TypeScript game code, its tests (unit, browser, the automated run) and the old rig and tuner.
- Electron and the Steam bindings for it (D3), WebRTC, the public signalling and the Metered relay (D4, D22, N24, N25).
- Surface textures made in code (N51): Unreal levels use free textured assets under the prototype standard (N49).
- The browser build, GitHub Pages, the phone test launch, the Kestrel editor (Unreal's editor replaces it).
