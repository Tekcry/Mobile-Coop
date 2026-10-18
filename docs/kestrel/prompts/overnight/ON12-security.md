# ON12 - Security devices: cameras, card readers, motion sensors, beams
Model: Opus, medium effort.
Decisions: 13

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/S0-security-spec.md` sections on devices and section 6 (the
`kestrel.security.json` shape) and section 5 numbers (SN ids in facts.json); `docs/kestrel/schema.md` section 4;
`scripts/kestrel/facts.json` S0 entries (grep `SN`); the S1 camera code (grep `camera` in `src/game/` and `src/world/`
for the security camera built in S1 Part A); ON7's guard view tester (reuse its sight-cone code); ON9's door `reader`
and `level` fields.

Michael (2026-10-13): place cameras, card readers, motion sensors and beams with their view cones; the security stages
need them.

| # | Decision |
| --- | --- |
| 1 | **Security file**: the editor loads and saves `docs/kestrel/kestrel.security.json` in the S0 section 6 shape (schema section 4), beside the campus and play files (one document for undo, drafts, the change log; sandbox-aware; no-op save byte-identical; created on first save). |
| 2 | **Cameras**: fixed and pan (sweep range and period) types from S0; placed on a wall or ceiling (Y menu: Security tab); aim with the right stick; field of view and range from S0 / facts (cited); the view cone drawn in 3D and on the plan, occluded by walls and objects with ON7's sight code; the light at each covered cell decides whether a player would be seen (S0's rule, cited), shown red / amber / clear as the guard view. |
| 3 | **Card readers and keypads**: placed on a door (snap to an opening: fills ON9's `reader` and `level`), or alone on a wall; access level 0-5 colour plate. |
| 4 | **Motion sensors (PIR)**: ceiling or wall; detection fan from S0; linked to lights (ON6 `motion` lamps) or to the alarm, picked on the card. |
| 5 | **Beams**: drawn between two wall points at a height; visible or invisible (S0); linked to the alarm. |
| 6 | **Security desk link**: every camera lists which monitor it shows on (S0); the security desk object (ON4) shows its feed list on the card. |
| 7 | **Coverage view** (View tab "Security coverage"): all camera cones and sensor fans tinted on the plan and floors, with the gaps (unwatched floor) left clear, per level. |
| 8 | **Checks**: S0 rules the checker already has run on the security file (no new rules; show their results in Checks). |
| 9 | **Walk test**: devices build in the game only where the game already has them (S1 cameras); others are not built and editor.md says which stage builds them (S2-S4). |
| 10 | Vitest: device records round-trip, camera cone occlusion on a synthetic level, reader snaps to a door and fills its fields, coverage gaps count. |
| 11 | e2e: a camera in Building A's ground corridor covering the main doors, a reader on the bridge door (level 2), a beam across a yard gap; coverage view on; save to the sandbox (security file written). |
| 12 | Screenshots: the Security tab, a camera cone with red / amber cells, the coverage view on the plan. |
| 13 | editor.md, schema.md section 4 notes. |

End per section 5. Commit id `ON12`.
