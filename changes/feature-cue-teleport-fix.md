# Shadow cues ignore teleports
kind: patch

- Shadow cues (behind the character shadow flag): a respawn, checkpoint restart or section start no longer makes your
  shadow read as a fast-moving one for a moment. A jump of more than 2 m between two checks (four times a sprint)
  counts as a fresh start, and so does a player joining or leaving; normal movement, sprinting included, reads as
  before.
