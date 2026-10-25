# Validator port S7b: nav-floor warning and the long-throw exception
kind: patch
- Level validator, engine facts (`scripts/level-checks/engine.mjs`): a space more than `rules.nav_floor_depth_m`
  (scale sheet section 8, 1.5 m) below storey 0 that is an encounter space or has guards prints a WARN: the guards'
  nav grid does not reach that deep (level-design 12.1). The row is read only when such a space exists below storey 0;
  a missing row prints one WARN and the check is skipped. Ropes still go both ways (a `team_rope` down from an upper
  storey inside the `rope_span` band is fine) and the validator has no human-ladder row of its own: a `human_ladder`
  lip is judged by the co-op lip band (`sizes.coop_lip`) as before.
- Level validator, throw gaps (`scripts/level-validate.mjs`, the `team_throw` check): a throw marked as an approved
  long throw is judged against the scale sheet's "Long throw (named spots only)" row (`sizes.throw_long`, gap at most
  4.9 m at the listed spots) instead of the 2.7 m throw gap row. Every other throw keeps the 2.7 m row.
- Graph schema, new optional link field `exception` (for `docs/level-validator/graph-schema.md`, links table):
  - What it is: the name of an approved exception to a size row, written on the one link it covers. The only value
    today is `"long_throw"`, and only a `team_throw` link may carry it.
  - Why it exists: Michael's pick (2026-10-25 ~20:45, "Mix of both") allows a longer team throw, a 5.8 m throw over a
    gap of up to 4.9 m, at a few named spots that Campaign Build picks. The mechanism is per link, never per map, so
    one approved spot never loosens the rest of the map.
  - Where the approval lives: in the scale sheet, section 3, row "Long throw (named spots only)". `metrics-gen` reads it
    into `sizes.throw_long` = `{ max, spots }`, with each spot written `<meta.map>:<from>><to>` (the map id, then the
    link's `from` and `to` space ids). Today's spots: `tallowWharf:w2-pawn-loft>w2-reading-room` (C4, the pawn loft to
    the reading room) and `tallowWharf:w2-arcade-roof>w3-roof` (C5, the arcade roof to the W3 roof). A new spot is a
    sheet change and needs Michael's approval; the field alone approves nothing.
  - How the validator reads it:
    - `exception: "long_throw"` on a `team_throw` at a listed spot: the gap (`width`) passes up to the row's max with
      an INFO line naming the approved spot; a wider gap is an ERROR.
    - `exception: "long_throw"` at a spot the row does not list (the same space ids on another map included): ERROR,
      "not an approved long-throw spot".
    - No `exception` field: the 2.7 m throw gap row, listed spots included (the field states the intent).
    - Any other `exception` value: ERROR. The field on any other link kind: ERROR.
    - The metrics file has no `sizes.throw_long` (or it is not `{ max, spots }`): one WARN, and the throw falls back to
      the 2.7 m row.
  - Example link: `{ "from": "w2-pawn-loft", "to": "w2-reading-room", "kind": "team_throw", "route": "high",
    "width": 4.9, "exception": "long_throw" }` on a graph whose `meta.map` is `tallowWharf`.
