# Laptop queue: quarantine and claim-time skips
kind: patch
- Laptop queue (F48): the desktop worker keeps no automatic quarantine list of its own (it drops an old one at start),
  so it forgives only the committed `scripts/e2e-quarantine.json`; its failures go to a laptop rerun, where the
  laptop's list applies. A desktop-only `e2e-sectorops:6` entry had forgiven #525's affected run.
- Laptop queue (F46): just before a claim, both workers read the request's PR fresh and withdraw it (a done claim,
  error statuses, a log line) when the PR is merged or closed, the sha is no longer the PR head, or CI `check` failed
  on the head. A GitHub error still runs it.
- Laptop queue: every `gh` call retries once on a TLS handshake timeout.
