# Changelog build skips entries already released
kind: patch
- Merge tools: the CHANGELOG assembly (`scripts/changelog-assemble.mjs`, run by `scripts/merge-train.mjs`) no longer writes
  a `changes/` entry again when its text (whitespace-normalised) is already an entry in CHANGELOG.md. Each skipped entry is
  printed. A fragment with no entries left adds no block; its file is still deleted. Tests: `tests/changelogAssemble.test.ts`.
