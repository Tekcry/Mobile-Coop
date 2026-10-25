# Laptop queue: hold PR runs until the next train
kind: patch
- The laptop queue predicts when the next train arrives (from the last release's deploy wait or a newly green
  train-ready PR) and holds new PR runs until then, so trains stop cutting runs they let start.
- Under that hold only runs that fit before the next train start (known expected time, 120 s prep, 1.2 x slack).
