# Snapshot line endings
kind: patch
- Tooling: `.gitattributes` checks out `*.snap` with LF, so vitest no longer rewrites the snapshot on CRLF checkouts and leaves the merge-train worktree dirty.
