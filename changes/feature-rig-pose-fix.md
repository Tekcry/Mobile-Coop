# Gameplay reads game state, not the animated body (rig-pose fix)
- Where you can be hit and seen now comes from your position and stance in the game, not from the animated body:
  guards aim at and hit the same spots on every machine, whatever the frame rate, the mocap setting or the tuner.
- Co-op: your partner is judged exactly like you on the host, with split head / body / leg hits (head x1.3, legs
  x0.75), at their latest position instead of a copy drawn 0.1 s behind. Friendly fire on Marlow Yard uses the same body.
- Your rounds start from your shoulder and aim in the game, not the animated muzzle (the muzzle still shows the tracer,
  flash and casing). The wall-poke check uses the same head as your hit box.
- A guard's head is the same on the host and the client, and the host judges a partner's headshot against it.
  Dog heads too.
- On a wall, the light meter and the guards read the same head point on both machines (light parity).
- Bodies lie where the guard fell in the game, on the floor below a ledge; the ragdoll eases onto that spot. Picking a
  body up steps in to the same place on both machines.
- Smaller: the weapon swap waits on a game timer, the course dummy's head follows its position, movement speed no
  longer depends on the mocap setting, rounds pass through ragdolls, and a lamp shot while hanging upside down counts
  in co-op.
