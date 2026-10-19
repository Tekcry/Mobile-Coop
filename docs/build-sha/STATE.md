# Build commit label - state

**Now (2026-10-19):** done; PR to master open, waiting for the orchestrator's review, version (patch) and merge.

**Next:** after the merge and the next Pages deploy, the /ct/ label should read ct-movement's commit (e5fc587), not
master's. Nothing else unless the review asks.

## Done
- 2026-10-19: `npm run check` PASS on the laptop (1783 passed, 1 skipped; buildSha.test 3/3); the local build's bundle
  holds the branch's own HEAD (4c34704).
- 2026-10-19: branch off master fca0e267; `pickBuildSha` (HEAD first, GITHUB_SHA fallback) with a Vitest test;
  vite.config.ts uses it; deploy.md, CHANGELOG.
