# Laptop queue service
kind: patch
- Tooling: `scripts/laptop-queue/` (queue service, `request.mjs` CLI, `serve.mjs`, `install-task.ps1`) runs requests from the
  `laptop-queue` branch and `train/*` heads on the two laptop slots, shards train runs across 4189 + 4192 and posts
  `laptop-e2e` / `laptop-e2e/<set>` commit statuses. Docs: `docs/systems/testing-tools.md` "Laptop queue".
