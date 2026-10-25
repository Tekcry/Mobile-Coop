# V1 fresh check - level-validator (Night Shift | Marlow Build)

> **History, archived 2026-10-25 (doc-clarity).** The level-validator job's record, kept for reference only. The
> current rules are `docs/level-design.md`, the graph format `docs/level-validator/graph-schema.md`, the numbers
> `docs/design/scale-sheet.md`. Where this file differs from them, they win.

Code: origin/feature/level-validator-v1 e869ea92 (Cloud Builder 1), read in C:/NightShift/Mobile-Coop-level-validator-v5f
(ca1070d3 = job head + V1 merge; the two files are identical to e869ea92). Read-only review, nothing edited.

## Verdict: PASS (V1 code)
No crash and no wrong result on valid graphs against the spec as written. One job-level blocker sits outside V1's
files: 16 metrics keys the validator reads are not in metrics.json, so on the real metrics those checks are skipped
(each with one WARN). Fix that before the V5f run is read as final.

## Runs
- `node scripts/level-validate.mjs docs/level-validator/example.graph.json`: 0 errors, 9 WARN (all "metrics: <key>
  missing"), 2 INFO (guard bands missing), exit 0. Same as the builder's report.
- Merged campus run S1 + an S2 stub (scratchpad) + S3 + S4 + S5: no crash, 125 ERR / 112 WARN, cross-file spine links
  resolved. Without S2 it stops at structure: `links[21] s1-forecourt -> s2-reception: unknown space` (expected).
  Data findings for V5f, not V1: no S3 -> S4 spine link in any file (S4's note says it belongs to the S3 file).
- `npx vitest run tests/levelValidate.test.ts`: SKIPPED. C:/NightShift/heavy.lock still reads "laptop-queue | train 64
  d3d07151" at the end of the review. Builder reports 48/48. Run it once the lock clears.

## 1. M2 (no size / time constants; metrics keys)
- Clean. The only literals are structural (3 approaches, tension 1-5, HIGH_BEAT 4 / RELEASE_BEAT 2, the 3-in-a-row
  count, % = x100, EPS 1e-9, grid tolerance 1e-6). Every size / time / target comes through `c.num` / `c.range` /
  `c.obj` with a named key.
- Keys read that metrics.json lacks: **16, not 17** (the builder's own list is 16 and matches mine):
  sizes `ceiling_min`, `door_h_min`, `door_h_max`, `roller_door_w`, `duct_w`, `duct_h`, `tunnel_h`, `wall_jump_max_up`,
  `coop_lip`, `split_jump_w`, `split_jump_h`; rules `safe_drop_m`, `dead_end_max_m`, `guards_max`, `guards_early`,
  `guards_late`.
- Effect on the real metrics today: no ERR for guards > 10, ceiling < 2.4, door height outside 2.0-2.2, duct, roller
  door, tunnel, wall-jump > 3.8, co-op lip > 4.5, split-jump, dead-end depth > 15 m. Each prints one WARN.
- Naming trap: metrics-gen fills `sizes.*` by regex from sheet sections 1 / 3 (scripts/metrics-gen.mjs:78-109) and
  `rules.*` verbatim from section 8 (:179). If the lead adds the 16 as section 8 rows they land in `rules.*`, and V1
  reads 11 of them from `sizes.*`. Pick one: metrics-gen extracts the 11 sizes from section 3, or V1 reads them from
  `rules.*`.

## 2. M3 / M4
- M3 `checkRedundancy` (level-validate.mjs:685-706): one entry and one exit per section (ERR otherwise), non-spine links
  with both ends in the section, unit-capacity max flow (`edgeDisjointPaths` :160, a correct port: two-way link = two
  arcs, residual adjacency both ways, one-way links forward only). Correct.
- M4 targets (:566-592): missing shadow_pct / los_break_s / vantage / sees_pct = ERR (also with no metrics); outside
  0.4-0.6 / above 5 s / below 0.7 = ERR; unknown vantage.from = ERR. Correct.
- Split parity by summed link time (:765-849): `time_s`, else `length` / split_speed for walked kinds; untimed = 0 s +
  WARN, parity not judged (lead decision 5). |a-b| / longer leg. Correct.

## 3. Rules (mapping table + schema + lead decisions)
Implemented and correct: structure, function, unique ids, one start, campaign = [2], exfil; 2-player reach,
objective -> exfil, no softlock (pair_gate / team_rope as co-op); spine consecutive + skip test + exit -> entry; rule of
three + shadow / high / loud; secret in half (WARN); dead ends; routes cross; co-op coverage (half + every section);
split leg <= 90 s, parity 20%, overwatch, assist, partner reach, shared >= 2.0; pacing (3 high ERR, open > 2 WARN, no
release WARN, spine = tension 1); room class min ERR / max WARN / `no` class ERR / camera floor 6.0 ERR / custom WARN /
unknown class ERR; ceilings (open class + exterior + duct skip); step band; door / double door / opening / roller /
corridor / fire stair / open stair / duct / tunnel / wall jump / co-op lip / split jump per kind; guards ERR > max,
non-decreasing by players, bands INFO only; drop / rappel one way.

Missing (polish): opening lintel and double-door height not checked; corridor-class SPACE width 3.0-3.49 WARN (only the
corridor LINK has it); walk-through 3.5 floor for `custom` spaces; approaches count one-way links that only leave the
space (:559).

Builder deviations:
- Grid WARN scope (space w / l, link length, corridor / opening / roller widths only): ACCEPT. Section 8 says "every
  size, width, height and length", but 1.2 doors, 1.3 stairs and 2.1 / 3.3 heights are sheet sizes; the literal rule
  would WARN on every door.
- Safe drop as a WARN: ACCEPT the severity, REJECT the comment. :465-466 says no landing height exists in src/. It does:
  `LANDING = { soft: 0.6, roll: 2.5, heavy: 4.5 }`, src/player/movement.ts:168, "No fall damage (Blacklist)". PLAN
  asked for that grep. Fix the comment. `safe_drop_m` should be 4.5 (LANDING.heavy, a WARN: no fall damage), not the
  skill's 3.5.
- Partner reach skips untimed links, worst source to the nearest space of the other leg: ACCEPT the untimed rule (it
  matches decision 5 and stops ducts being free shortcuts). The "nearest" reading matches the schema ("from any space
  of leg a to any of leg b"). level-design 11.6 says "reaches any point of the other leg", which could mean every pair.
  Every pair cannot hold with 117 m legs against 45 m of reach, so keep nearest. The lead should write that reading
  into the schema.
- Split fork / rejoin: ACCEPT. The fork is the earliest file-order space with solo arcs into both legs' first spaces;
  without one, each leg uses its own entry. The rejoin is the earliest file-order space both last leg spaces lead to,
  excluding the fork. This matches the schema text, and excluding the fork stops a false rejoin back at the fork.
- Routes cross (all route kinds in a section form one group through shared spaces, entry / exit excluded): ACCEPT.
  It is a middle reading of 3.3 ("share a room or junction where a player can switch route"). A kind used only on a
  direct entry -> exit link is reported, which is consistent with "between entry and exit".
- Spine rules (non-spine cross-section link ERR, spine must join exit -> next entry ERR, start / exfil outside first /
  last section WARN): ACCEPT. They follow "two sections join by one spine connector" (11.2) and the schema tag table.

## 4. Multi-file
`run` (:998-1017) reads every file, `mergeGraphs` (:225), then one `validate`. Spaces and links are concatenated,
sections are unioned in file order, meta comes from the first file. Cross-file spine links and the one `start` work
(campus probe). No per-file validation: no bug. Note: sections union in FILE order, so pass S1..S5 in order. S1 lists
only ["S1"] and S5 only ["S5"]; S3 / S4 list all five.

## 5. Tests (48; pass cases come from the one base graph)
Fail cases present for every PLAN V1 fixture except as noted. Gaps (no fail case): roller door / duct / tunnel /
fire-stair / open-stair / double-door / opening widths, door height, wall-jump, co-op lip, split-jump, safe drop,
missing width / height / level_change; objective cannot reach exfil; duplicate id; unknown vantage.from; secret-in-half
WARN; assist / overwatch naming no split; legs never rejoin; "no spine link between" and "section has no spaces";
unknown tag WARN; guards key not in meta.players; invalid phase; CLI `run` with TWO files and a cross-file spine link
(only the in-memory merge is tested). The base graph has no tunnel / wall_jump / split_jump / drop / team_rope / rappel
link, so those kinds have no pass case either.

## Must-fix (job, before the V5f run is final; not V1 files)
1. docs/design/scale-sheet.md + scripts/metrics-gen.mjs:78-109 / :179: supply the 16 missing keys (above) under the
   names level-validate.mjs reads (sizes.* vs rules.*: see the naming trap). Owners: V2 (sheet) / V1a (generator) / lead.

## Should-fix (V1, one small round or the polish list)
1. scripts/level-validate.mjs:465-466: wrong "no landing height in src" comment; cite LANDING.heavy 4.5
   (src/player/movement.ts:168).
2. scripts/level-validate.mjs:494-500: no-softlock searches solo reach from `start` only. Behind a mandatory pair_gate,
   every later co-op target is flagged even when it has a solo route (probe: s -door- a -pair_gate- b, b -open_stair-
   c and b -coop_boost- c gives a false "c: reached only through co-op links"). Test reach from the co-op link's
   `from` space (or say "from start" in the message).
3. scripts/level-validate.mjs:384: the step band includes 0.40, but scale-sheet section 3 allows curbs "0.15 - 0.40".
   Make the lower bound exclusive.
4. tests/levelValidate.test.ts: add the gaps in section 5, at least the per-kind dimension fails and a two-file `run`.
5. graph-schema.md (lead): record the partner-reach "nearest space" reading against level-design 11.6.

## Polish
Opening lintel and double-door height; corridor-class space 3.0-3.49 WARN; 3.5 walk-through floor for custom spaces;
approaches should count only links that can enter the space (:559).
