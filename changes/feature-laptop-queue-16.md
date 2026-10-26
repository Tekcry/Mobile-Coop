# Laptop queue: desktop-red reruns go first
kind: patch
- Laptop queue: a laptop rerun of a desktop failure now sits in the fix tier (F52), so the final verdict on a PR that
  reads red runs ahead of front and green work instead of waiting behind trains (piano reruns waited ~2 h).
