# Guards never vanish while their new model loads
kind: patch
- A guard whose new model is still getting ready to draw (its shader compiling, the first time you get close to each guard type) now shows his simpler body meanwhile instead of disappearing; a stuck or failed compile is retried as the simpler body already does.
