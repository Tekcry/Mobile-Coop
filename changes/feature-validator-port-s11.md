# Validator port S11: a split leg may start with a co-op link from the fork
kind: patch
- `scripts/level-validate.mjs` (checkCoop, splits): when no space leads into both legs of a split by solo links, the
  fork may be the first space that leads into one leg by a solo link and into the other only by a co-op link (walked
  from its `from` end, never a `bolted` one; A28: both partners are at the fork for the boost). That link's time counts
  for its leg, and an INFO line names it: `split <id> leg <a|b>: entered by <link> (co-op, from the fork <space>)`.
  Both legs entered only by co-op links, or a co-op link bolted the wrong way, keep the `no solo link leads into` ERR.
  A split with a solo fork prints as before. Documented in `docs/level-validator/graph-schema.md`, "Splits".
