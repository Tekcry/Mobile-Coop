# Test Chamber rename
kind: patch
- Clean-up N15: the dev map's inside name `studio` is now `chamber` everywhere in the code, tests and scripts (map id, `?autostart=chamber`, `window.__chamber`, `app.chamber()`, the `chamber:` field on capture rows, the `clips/mixamo/chamber/` folder, `e2e-chamber`). On-screen text already said Test Chamber. The co-op version is now 88 (the lobby's map id changed), so an older build cannot join. Saves and old `?map=studio` links are not carried over.
