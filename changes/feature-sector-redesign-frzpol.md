# Sector Ops guard freeze polish
kind: patch
- Guard render freeze (Sector Ops, render only): a guard behind a door that cracks or opens, or a breakable pane that
  opens, is re-tested and drawn at the next frame instead of up to 4 frames later; a hidden guard coming back into the
  view, or hidden right behind a wall's edge, is re-tested at once / every frame (ray budget still capped at 8 guards
  per frame).
- The freeze now samples a guard's knees, and a roof guard's moon shadow that falls off the edge onto the ground below
  keeps him drawn.
