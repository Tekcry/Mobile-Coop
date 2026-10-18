"""The Heron Carbine (G76 rifle; feature/weapons, A2): an original short-stroke 5.56 mm carbine with the CT co-op kit's
underbarrel launcher always fitted (docs/ct-research kit digest 1.3) and a suppressor.

Real-world proportions (weapon frame, metres, bore at y 0.04): 10.5 in class barrel, collapsible stock (length of pull
about 0.33 m), 30-round curved magazine (about 178 mm along its curve), 180 mm x 39 mm suppressor, red dot on a riser
(sight axis 66 mm over the bore), a 40 mm class launcher tube (49 mm outside) under a free-float handguard. Overall
about 0.93 m. The game's hand points are kept: the trigger hand on the pistol grip at (0, -0.035, -0.01), the support
hand round the launcher's grip sleeve.
"""
import wlib as W

SIZE = 2048
BORE = 0.04
POINTS = {
    'grip': [0.0, -0.035, -0.01],
    'foregrip': [0.0, -0.040, 0.27],
    'muzzle': [0.0, BORE, 0.60],
    'mag': [0.0, -0.005, 0.10],
}
LT = -0.0165   # launcher tube axis (y)
LR = 0.0245    # launcher tube outside radius


def rail(name, z0, z1, y0, x=0.0106):
    """Picatinny-style rail: a base and cross teeth on a 10 mm pitch."""
    W.profile(name + '-base', 'anodised', [(z0, y0), (z1, y0), (z1, y0 + 0.0042), (z0, y0 + 0.0042)], -x, x, 0.0006, 1)
    z = z0 + 0.003
    i = 0
    while z + 0.0052 <= z1 - 0.002:
        W.section(f'{name}-t{i}', 'anodised', [(-x, y0 + 0.0042), (x, y0 + 0.0042), (x - 0.0022, y0 + 0.0088), (-x + 0.0022, y0 + 0.0088)],
                  z, z + 0.0052, 0.0005, 1)
        z += 0.01
        i += 1


def build():
    # --- upper receiver: a monolithic upper with a top rail, side charger on the left, ejection port on the right
    up = W.profile('upper', 'anodised', [(-0.088, 0.018), (0.176, 0.018), (0.176, 0.064, 0.003), (-0.088, 0.064, 0.003)], -0.0155, 0.0155, 0.0012, 2)
    port = W.box('port-cut', 'anodised', (0.012, 0.016, 0.062), (0.0155, 0.040, 0.052))
    W.cut(up, port)
    W.box('bolt', 'steel', (0.004, 0.012, 0.056), (0.0115, 0.040, 0.052), 0.0005, 1)
    W.box('deflector', 'anodised', (0.006, 0.012, 0.012), (0.017, 0.044, 0.006), 0.0015, 2)
    rail('rail', -0.086, 0.396, 0.064)
    # side charging handle (left) in its slot
    W.box('charger-slot', 'steel', (0.003, 0.006, 0.07), (-0.0163, 0.050, 0.10), 0.0005, 1)
    W.lathe('charger-knob', 'polymer', [(0.0, -0.0165), (0.0058, -0.0165), (0.0062, -0.024), (0.0055, -0.031), (0.0, -0.031)], centre=(0.050, 0.10), axis='x', segs=16)

    # --- lower receiver with the magazine well, pins, controls
    lo = W.profile('lower', 'anodised', [(-0.078, 0.018), (0.132, 0.018), (0.136, -0.040, 0.002), (0.130, -0.047, 0.002), (0.061, -0.047, 0.002),
                                        (0.058, -0.013, 0.003), (-0.040, -0.013), (-0.078, 0.002, 0.004)], -0.015, 0.015, 0.0012, 2)
    W.profile('magwell-flare', 'anodised', [(0.058, -0.047), (0.137, -0.047), (0.138, -0.039), (0.059, -0.036)], -0.0172, 0.0172, 0.001, 2)
    for z, y in ((-0.062, 0.008), (0.118, 0.010)):
        W.cyl('pin', 'steel', 0.0028, -0.016, 0.016, centre=(y, z), axis='x', segs=12)
    W.cyl('mag-release', 'steel', 0.0052, 0.0145, 0.018, centre=(-0.006, 0.050), axis='x', segs=14)
    W.box('bolt-catch', 'steel', (0.003, 0.016, 0.009), (-0.0162, 0.004, 0.064), 0.0008, 1)
    for s in (-1, 1):
        sel = W.box('selector', 'steel', (0.003, 0.006, 0.022), (s * 0.0163, 0.005, -0.024), 0.0008, 1)
        W.place(sel, rot=(0.5, 0, 0), origin=(s * 0.0163, 0.005, -0.030))
    W.profile('trigger', 'steel', [(0.030, -0.013), (0.036, -0.013), (0.035, -0.024), (0.040, -0.032, 0.002), (0.037, -0.033), (0.029, -0.022)], -0.003, 0.003, 0.0006, 1)
    W.box('guard-bar', 'anodised', (0.012, 0.005, 0.064), (0.0, -0.0365, 0.034), 0.0015, 2)
    W.box('guard-post', 'anodised', (0.012, 0.026, 0.006), (0.0, -0.026, 0.063), 0.0015, 2)

    # --- pistol grip (stippled panels), about 18 degrees back
    W.profile('grip', 'stipple', [(0.014, -0.012, 0.002), (-0.036, -0.010, 0.002), (-0.039, -0.022, 0.006), (-0.061, -0.118, 0.004), (-0.057, -0.127, 0.004),
                                  (-0.027, -0.127, 0.004), (-0.022, -0.119, 0.004), (-0.012, -0.090, 0.006), (-0.004, -0.080, 0.004), (-0.008, -0.066, 0.006),
                                  (0.002, -0.052, 0.004), (0.009, -0.032, 0.006)], -0.0142, 0.0142, 0.0035, 3)

    # --- 30-round curved magazine with its base plate and side ribs
    W.profile('mag', 'polymer', [(0.128, 0.004), (0.130, -0.05), (0.138, -0.10), (0.151, -0.152), (0.093, -0.158), (0.083, -0.10), (0.072, -0.05), (0.066, 0.004)],
              -0.0118, 0.0118, 0.0018, 2)
    W.profile('mag-plate', 'polymer', [(0.155, -0.150), (0.090, -0.156), (0.091, -0.169, 0.003), (0.159, -0.163, 0.003)], -0.0135, 0.0135, 0.0015, 2)
    for s in (-1, 1):
        for k, (a, b) in enumerate(((0.070, -0.062), (0.074, -0.082))):
            W.profile(f'mag-rib{k}', 'polymer', [(a + 0.004, b), (a + 0.060, b + 0.001), (a + 0.061, b - 0.005), (a + 0.005, b - 0.006)],
                      s * 0.0118 - 0.0008, s * 0.0118 + 0.0008, 0.0004, 1)

    # --- collapsible stock on a buffer tube, rubber butt pad, QD socket
    W.lathe('castle-nut', 'steel', [(0.0, -0.088), (0.0175, -0.088), (0.0175, -0.097), (0.0, -0.097)], centre=(0.0, 0.034), segs=24)
    W.cyl('buffer-tube', 'anodised', 0.0148, -0.27, -0.088, centre=(0.0, 0.034), segs=28)
    W.profile('stock', 'polymer', [(-0.172, 0.054, 0.006), (-0.312, 0.060, 0.008), (-0.316, -0.056, 0.008), (-0.292, -0.060, 0.01), (-0.236, -0.026, 0.02),
                                   (-0.186, 0.004, 0.008), (-0.170, 0.012, 0.004)], -0.019, 0.019, 0.003, 2)
    hole = W.profile('stock-hole', 'polymer', [(-0.268, 0.004), (-0.295, 0.006), (-0.296, -0.036), (-0.282, -0.040)], -0.03, 0.03, 0, 1, r=0.006)
    st = [o for o in W.PARTS if o.name == 'stock'][0]
    W.cut(st, hole)
    W.profile('butt-pad', 'rubber', [(-0.312, 0.060, 0.006), (-0.326, 0.061, 0.006), (-0.330, -0.057, 0.006), (-0.316, -0.056, 0.006)], -0.0205, 0.0205, 0.002, 2)
    W.box('stock-lever', 'polymer', (0.012, 0.006, 0.03), (0.0, 0.016, -0.190), 0.0015, 2)
    W.lathe('qd-stock', 'steel', [(0.0, 0.019), (0.0065, 0.019), (0.0065, 0.024), (0.0, 0.024)], centre=(0.030, -0.205), axis='x', segs=16)

    # --- free-float handguard with recessed slots, barrel nut ring
    hg = [(-0.022, 0.024), (-0.016, 0.014), (0.016, 0.014), (0.022, 0.024), (0.022, 0.056), (0.0165, 0.064), (-0.0165, 0.064), (-0.022, 0.056)]
    guard = W.section('handguard', 'anodised', hg, 0.176, 0.396, 0.0012, 2)
    for z in (0.214, 0.258, 0.302, 0.346):
        for s in (-1, 1):
            c = W.box('slot', 'anodised', (0.012, 0.0072, 0.032), (s * 0.026, 0.040, z), 0, 1)
            W.cut(guard, c)
    W.lathe('qd-guard', 'steel', [(0.0, 0.0215), (0.0065, 0.0215), (0.0065, 0.0255), (0.0, 0.0255)], centre=(0.040, 0.38), axis='x', segs=16)
    # folded back-up sights
    W.profile('bus-rear', 'anodised', [(-0.082, 0.073), (-0.050, 0.073), (-0.052, 0.083, 0.003), (-0.080, 0.083, 0.003)], -0.0095, 0.0095, 0.0008, 1)
    W.profile('bus-front', 'anodised', [(0.362, 0.073), (0.392, 0.073), (0.390, 0.084, 0.003), (0.366, 0.084, 0.003)], -0.0095, 0.0095, 0.0008, 1)

    # --- barrel and suppressor (wrench flats on the mount, front cap with the bore)
    W.cyl('barrel', 'steel', 0.0085, 0.390, 0.425, centre=(0.0, BORE), segs=20)
    W.lathe('supp-mount', 'knurl', [(0.0, 0.414), (0.0205, 0.414), (0.0215, 0.418), (0.0215, 0.444), (0.0, 0.444)], centre=(0.0, BORE), segs=32)
    W.lathe('suppressor', 'cerakote', [(0.0, 0.444), (0.0195, 0.444), (0.0195, 0.593), (0.0178, 0.600), (0.0060, 0.600), (0.0055, 0.592), (0.0, 0.592)],
            centre=(0.0, BORE), segs=40)

    # --- underbarrel launcher: mount rail, breech housing with its trigger, tube with a grip sleeve and a crowned muzzle
    W.box('launcher-mount', 'anodised', (0.026, 0.008, 0.19), (0.0, 0.0105, 0.285), 0.0012, 2)
    W.profile('launcher-breech', 'anodised', [(0.140, 0.007), (0.214, 0.007), (0.214, -0.044, 0.006), (0.150, -0.046, 0.008), (0.140, -0.030, 0.006)],
              -0.021, 0.021, 0.0015, 2)
    W.box('launcher-latch', 'steel', (0.004, 0.010, 0.016), (-0.0215, -0.018, 0.196), 0.0008, 1)
    W.profile('launcher-trigger', 'steel', [(0.163, -0.044), (0.168, -0.044), (0.169, -0.054), (0.173, -0.060, 0.002), (0.170, -0.061), (0.162, -0.052)], -0.003, 0.003, 0.0006, 1)
    W.box('launcher-guard', 'anodised', (0.010, 0.005, 0.050), (0.0, -0.064, 0.168), 0.0015, 2)
    W.box('launcher-guard-post', 'anodised', (0.010, 0.022, 0.005), (0.0, -0.055, 0.191), 0.0015, 2)
    W.lathe('launcher-tube', 'anodised', [(0.0, 0.212), (LR, 0.212), (LR, 0.388), (LR - 0.0012, 0.396), (0.0202, 0.396), (0.0202, 0.384), (0.0, 0.384)],
            centre=(0.0, LT), segs=40)
    W.lathe('launcher-sleeve', 'stipple', [(0.0, 0.226), (LR + 0.0008, 0.226), (LR + 0.0022, 0.231), (LR + 0.0022, 0.315), (LR + 0.0008, 0.320), (0.0, 0.320)],
            centre=(0.0, LT), segs=40)
    for z in (0.335, 0.352):
        W.lathe('launcher-band', 'anodised', [(0.0, z), (LR + 0.0012, z), (LR + 0.0012, z + 0.004), (0.0, z + 0.004)], centre=(0.0, LT), segs=40)

    # --- red dot on a riser: housing tube, lenses, turrets
    W.profile('riser', 'anodised', [(0.018, 0.0725), (0.078, 0.0725), (0.074, 0.090, 0.003), (0.022, 0.090, 0.003)], -0.012, 0.012, 0.0008, 1)
    W.lathe('dot-body', 'anodised', [(0.0, 0.020), (0.0150, 0.020), (0.0158, 0.024), (0.0158, 0.072), (0.0172, 0.080), (0.0172, 0.086), (0.0130, 0.086), (0.0130, 0.082), (0.0, 0.082)],
            centre=(0.0, 0.106), segs=32)
    W.cyl('dot-lens-rear', 'glass', 0.0128, 0.0195, 0.021, centre=(0.0, 0.106), segs=32, bevel=0)
    W.cyl('dot-lens-front', 'glass', 0.0128, 0.0805, 0.082, centre=(0.0, 0.106), segs=32, bevel=0)
    W.lathe('turret-top', 'anodised', [(0.0, 0.1205), (0.0072, 0.1205), (0.0072, 0.129), (0.0, 0.129)], centre=(0.0, 0.050), axis='y', segs=16)
    W.lathe('turret-side', 'anodised', [(0.0, 0.0150), (0.0072, 0.0150), (0.0072, 0.0235), (0.0, 0.0235)], centre=(0.106, 0.050), axis='x', segs=16)
