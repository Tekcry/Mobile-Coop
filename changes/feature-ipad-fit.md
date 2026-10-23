# iPad display fit
kind: patch
- iPad: the version label stays fully on screen (bottom / right offsets include the safe-area insets, `--vh` follows `dvh`
  where supported), the page and menu frame fill the visible viewport (no dark bottom strip), the "integrated GPU ... Windows
  Settings" banner and settings hint show only on Windows, and the pause menu's co-op room line wraps in its own block clear
  of the help box. Desktop rendering (zero insets) is unchanged.
