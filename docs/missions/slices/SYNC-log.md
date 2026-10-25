# Mission sync log (Split Shift, Code Relay vs Sector Ops)

## 2026-10-25 ~09:30 - after Michael's sign-off picks (Sector Ops 7c021f01)

Inputs: `origin/feature/sector-redesign-signoff` 7c021f01 ("Michael's picks S1-S5"), `SYNC.md`, the diff fe3ef35f..7c021f01,
`S2-detail.md`, `S4-detail.md`, S2 / S3 / S4 pages. Greybox data: none pushed for S2 or S4 after 7c021f01 (every
`sector-redesign*` branch checked after a fetch).

What Sector Ops changed since the last sync (fe3ef35f):
- S1-S5 picks filled in; every pick is the plan as drawn (S2 void 14.5 m / 18 guards, S3 re-plan / 20, S4 one 6 m
  goods-in lobby, S5 26 inside the 32 cap).
- Data: only `campusOps-S5.json` (CR7 becomes a one-way `rappel` arch -> well plus a one-way `team_rope` well -> arch).
  S5's code pair stays a reserved spare; no mission uses it.
- `campusOps-S2.json`, `campusOps-S4.json`, `SYNC.md`, `S2-detail.md`, `S4-detail.md` and the S2 / S4 plan SVGs are
  byte-identical to fe3ef35f. S3's re-plan keeps the C2 far door and the C3 door, so Split Shift's exit over C2 and
  Code Relay's start at C3's checkpoint stand.

What changed in the mission specs (ids, `area` boxes, tracks and exfil already matched; text only):
- Split Shift (026f61af): 4B route reads s2-foyer (hall end); #8's panel stop (2.2, -6.5); keypad on both facilities
  doors (-4, -1) and (-7.5, 3); kitchen west door (-30, -26), overhear box (-31, -26); ss-5 hint (K2 faces the comms
  door, pg-brg on his blind side); ss-opt hint (new #21 turns at the east-wing north door (-9, -1.5)). Graph notes and SIGNOFF
  name 7c021f01.
- Code Relay (e4fd5c07): the merged goods-in lobby: 2B runs s4-lobby's goods lane (s4-svc is gone), Vault's track,
  1B's hint and the hall reinforcement name the goods lane; the dock board's own lamp (C7); new posts in leads and hints
  (#25 night runner at the desk, #22 second keyholder round the cage); #20's walk to the cage front; kp-deck at
  (30.5, 45); secNc at (8, 43.5); new kp-riser row (34, 46.5). SIGNOFF lists 8 planned devices (kp-riser added).
- Plans (PLAN-*.svg): not regenerated; no S2 / S4 geometry moved.

Validator (`scripts/level-validate.mjs` from feature/mission-validator 0c62a921, VAL-DIMS; the five plan graphs at
7c021f01):

| Run | ERR | WARN | Mission ERR | Mission WARN |
| --- | --- | --- | --- | --- |
| Campus alone | 0 | 119 | - | - |
| + Split Shift | 0 | 119 | 0 | 0 |
| + Code Relay | 0 | 120 | 0 | 1 (S4 has no choke node: the colonnade exit is the choke, by design) |

### Sector Ops must
- Nothing in the data. Keep every S2 / S4 space id, sync id and device spot in `SYNC.md` through greybox; when a planned
  node is built, put the `src` line in `SYNC.md` and tell Marlow Build.
- Doc tidy (optional, no mission effect): done in Sector Ops 9eb7b9c6.
  - Done: `S4-detail.md` section 7 held item 3 closed. Code Relay 2B now reads `s4-lobby` (goods lane), not `s4-svc`.
  - Done: `S4-detail.md` line 2 and section 3 heading now say `syncs`, the S4 graph's key.
