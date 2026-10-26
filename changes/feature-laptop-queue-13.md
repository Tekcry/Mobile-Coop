# Auto-drop finds train members past 100 commits (F44)
kind: patch
- Auto-train reads a train's members from `git log --first-parent --merges origin/master..<head>` instead of gh's
  PR commit list, which stops at the oldest 100 commits: a big train (127, 168 commits) lost its merge subjects there,
  so auto-drop found no member to drop and the master-moved rebuild had nobody to rebuild. gh's list stays as the
  fallback when git cannot read the log.
