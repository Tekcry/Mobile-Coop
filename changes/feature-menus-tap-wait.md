# e2e-menus touch pause waits for the screen
kind: patch
- e2e-menus (item 29 touch): the pause-button tap and the Resume tap wait for the screen change (3 s cap) instead of
  reading the top screen after 4 frames; the tap is handled on a later sim step, and under the full parallel run the
  read came first (train 9 laptop run: "a tap on the pause button pauses ((none))"). Test only, no game change.
