# Guard gear merge polish
kind: patch
- Enforcers anywhere on a map, at any facing, now share one merged shield (the merge key comes from the parts' local
  places, not their world matrices, whose float error far from the origin built a new shield source per enforcer).
- The merged shield and the merged armour receive shadows like the guard's body, instead of copying the part base's
  setting at build time.
