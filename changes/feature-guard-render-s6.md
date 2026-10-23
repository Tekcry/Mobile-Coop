# Guard render S6: per-cascade moon shadow lists
kind: minor
- Moon / sun shadows: each shadow cascade now draws only the moving casters inside it (exact per-cascade lists under
  the baked moon), so fewer shadow draws with many guards. No look change. `?guardsun=0` turns it off.
- (dev) `World.addShadowCaster` takes an optional sun reach (casters drop out of the moon's cascades beyond it, with
  hysteresis); nothing passes one yet.
