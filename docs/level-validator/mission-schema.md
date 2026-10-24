# Mission nodes - JSON schema (mission-framework VAL)

A mission is written into the map's connectivity graph as four top-level nodes beside `meta`, `spaces` and `links`
(BRIEF A17): `mission`, `objectives[]`, `rules[]`, `syncs[]`. The map schema (spaces, links, kinds, the `training`
profile, `bolted`, `requires_kill`, `mark`) is `docs/level-validator/graph-schema.md`; this page is the mission part.

- Run: `node scripts/level-validate.mjs <map files ...> <mission.json>`. The CLI merges the files (graph-schema "File
  layout and merge"): `objectives`, `rules` and `syncs` concatenate in file order; `mission` comes from the one file
  that has it (two files with a `mission` node in one run is an ERR: validate one mission at a time with its map).
- The checks live in `scripts/mission-validate.mjs` (`checkMission`), called from `validate()`. They run only when the
  merged graph has a `mission` node. Without one, `syncs[]` (Sector Ops' layout data, A16) gets its field checks only
  and `objectives[]` / `rules[]` are an ERR.
- Worked example: `docs/level-validator/example.mission.json` (a whole campaign map with its mission: two sections,
  forced co-op in each through a leg-up and a held shutter with bolted doors; 0 errors, 0 warnings).
- Sources: mission-framework PLAN section 2 (MissionDef), section 5 row VAL and "Validator detail (VAL)"; BRIEF M1-M5,
  A16, A17; `MISSION-DESIGN-AUDIT-2026-10-24.md` section 4 (feature/menu). Numbers: `docs/design/metrics.json`
  (scale-sheet section 8: `mission_steps`, `mission_step_min`, `mission_total_min`, `mission_rules_max`,
  `sector_parallel_min`, `sector_syncs_min`); a missing key prints one WARN and that check is skipped.
- Severity as in graph-schema: **ERR** (exit 1), **WARN** (justify in the mission's BEAT.md / SIGNOFF), **INFO**.

## `mission`

| Field | Type | Req | Meaning | Checks |
| --- | --- | --- | --- | --- |
| `id` | string | yes | MissionDef id (`?mission=<id>`) | ERR missing |
| `mode` | `campaign` / `sector` | yes | Must equal `meta.mode` | ERR other value or a mismatch; ERR any mission on a `training` map (M1: Marlow keeps its course objectives) |
| `players` | int[] | yes | Campaign `[2]` (M3, A2); Sector Ops a subset of `[1, 2, 3, 4]` (A1) | ERR otherwise; WARN a count not in `meta.players` |
| `start` | space id | no | Where this mission begins (a map may carry two missions, A18); default the space tagged `start` | ERR unknown space |
| `budget` | min | yes | Planned length of the mission | ERR outside `mission_total_min` (10-30); WARN outside the steps' own sum (required steps .. every step, longest team track) |

## `objectives[]` (one per MissionDef step)

| Field | Type | Req | Meaning | Checks |
| --- | --- | --- | --- | --- |
| `id` | string | yes | Step id | ERR missing or duplicate |
| `section` | section id | yes | One of `meta.sections` (SectorDef id) | ERR unknown; ERR when `space` is in another section |
| `space` | space id | yes | Where the step is done | ERR unknown |
| `team` | `a` / `b` / `all` | yes | Sector Ops: team A high / upstairs, B ground / service (A16); campaign: `all` only | ERR otherwise |
| `kind` | enum | yes | `reach`, `interact`, `intel`, `exploit`, `interrogate`, `carry`, `plant`, `sync`, `extract` | ERR unknown |
| `after` | step id[] | no | DAG edges: every listed step first; none = open at section start | ERR unknown id, itself, a cycle |
| `gives` / `needs` | string | no | Intel -> exploit: a fact flag one step gives and a later one needs | see checks |
| `lead` | space id | yes (not `extract`) | The space of its in-world lead (overheard line, document, map, terminal) | see checks |
| `seen_from` | space id | yes (not `extract`) | A space from which the goal is seen before it is reached | see checks |
| `minutes` | min | yes | Planned play time of the step | ERR outside `mission_step_min` (2-5) |
| `new_mechanic` | string or string[] | no | The one mechanic the step introduces | ERR two or more |
| `twist` | bool | no | The twist step | see checks |
| `optional` | `{ "reward": "gadget" / "syringe" / "medkit" }` | no | The optional objective (paid through section-rating's Grant) | ERR another shape |
| `text`, `hint` | string | no | Objective line and hint-layer line (MissionDef); not checked here (EN1's `checkMission` owns them) | |

## `rules[]`

| Field | Type | Req | Meaning | Checks |
| --- | --- | --- | --- | --- |
| `kind` | enum | yes | `ghost`, `noKills`, `noAlarms`, `noBodies`, `namedTarget`, `noGadgets`, `plantNotTake`, `oneChance`, `window` | ERR unknown |
| `scope` | `mission` / `a` / `b` | yes | Campaign: `mission` only | ERR otherwise |
| `text` | string | yes | The line in the briefing and the objective list (decision 2: signposted) | ERR missing |
| `step` | step id | `namedTarget` | The interrogate step whose guard is the named target | ERR not an `interrogate` step |
| `seconds` | s | `window` | The named window (A4) | ERR missing |

## `syncs[]` (Sector Ops sync-node contract, A16; Sector Ops owns them in `campusOps-S<N>.json`)

| Field | Type | Req | Meaning | Checks (always, with or without a mission) |
| --- | --- | --- | --- | --- |
| `id` | `sync-s<N>-<name>` | yes | Unique | ERR pattern or duplicate; WARN `<N>` differs from the space's section number |
| `kind` | enum | yes | `power_cut`, `camera_loop`, `code_source`, `code_sink`, `pair_door` | ERR unknown |
| `space` | space id | yes | Where the device is | ERR unknown |
| `src` | string | yes | Device code `file:line`, or `"planned"` | ERR missing |
| `lead` | space id | yes | Its in-world lead near the node | ERR missing or unknown |
| `solo` | s or string | `pair_door` | The solo timer fallback named in the briefing (seconds), or how one player does it | ERR another shape; with a mission, ERR a `pair_door` without it |

## Checks (`checkMission`)

| Check | Severity |
| --- | --- |
| Extraction: exactly one `extract` step, not optional, after every other required step (the last step) | ERR; WARN its space is not tagged `exfil` |
| Intel -> exploit: every `needs` has a `gives` step before it (through `after`); at least one such pair | ERR |
| One twist step | ERR none; WARN two or more |
| One optional objective with a reward | ERR none; WARN two or more |
| At most one `new_mechanic` per step | ERR |
| Step budget per team track (campaign: the whole mission; Sector Ops: team a's steps plus the `all` steps, and the same for team b, so parallel team steps count once per team): `mission_steps` 3-6 steps; each step `mission_step_min` 2-5 min; required steps at least the low end and every step at most the high end of `mission_total_min` 10-30 | ERR |
| Sector Ops solo run (players include 1): every step in sequence, may pass 30 min (longer, rated lower, never impossible) | INFO |
| Rules per team: mission scope plus the team's own, at most `mission_rules_max` (2; ghost counts as one); a kind twice for one team | ERR |
| A solo player carries every team's rules: more than `mission_rules_max` | WARN |
| `namedTarget` names an interrogate step | ERR; `plantNotTake` with no plant step WARN; `oneChance` INFO (opt-in, ends the mission, A12) |
| Lead and goal seen before reach: `lead` and `seen_from` present, a space, not the objective's own, reachable from the mission start without passing the objective's space (two players, all links) | ERR |
| Ghost run: start -> every objective -> the extraction over no `loud` link | ERR |
| Pacifist run: the same over no `requires_kill` link | ERR |
| Choke node per section: a space (not entry / exit) or a link that every entry -> exit route passes | WARN (pulls against the two-route rule and Sector Ops' two tracks; justify) |
| Campaign forced co-op (M3): in every section, with no co-op link and `bolted` links only from their far side, the entry does not reach the exit (no solo twin is checkCoop's ERR) | ERR |
| Sector Ops parallel objectives: required team a and team b steps that neither waits on, at least `sector_parallel_min` (2) | ERR |
| Sector Ops sync nodes in the mission's sections: at least `sector_syncs_min` (2) | ERR; WARN a mission section with fewer (A16 promises 2+ per section) |
| A `code_sink` with no `code_source` in its section; a `sync` step whose space holds no sync node | ERR |
| Sector Ops solo (players include 1): every objective and sync node reachable by one player from the start (no co-op link; `bolted` only from the far side; a `pair_gate` touching a space with a `pair_door` sync that has `solo` passes) | ERR |

Not checked here (rule of three, dead-end payoff, no solo twin, co-op coverage) are the map checks of
`level-validate.mjs`, which run on the same graph. Forced co-op and the other campaign checks need the mission node: a
campaign map is validated with its mission's file (`level-validate <map files> <mission.json>`), once per mission.
