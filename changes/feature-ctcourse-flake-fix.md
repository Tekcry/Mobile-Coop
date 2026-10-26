# Marlow Yard test fixes
kind: patch
- The Marlow Yard co-op test no longer stalls at the start when the computer is busy: its second window now always
  joins the first as a partner instead of sometimes opening a second room of its own.
- The test measures the partner throw over the laser beams on every game step, so a busy computer can no longer make a
  good throw look too low; a slow page load also gets two minutes instead of one.
