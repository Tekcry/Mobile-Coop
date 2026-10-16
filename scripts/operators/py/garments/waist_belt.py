"""Wren's slim waist belt and its kit (step 09; SPEC 5.1 "Belt"; ART-DIRECTION 9.2; concept A2, A39, A41). A FITTED
item over the armour: a tensioned laminate band round the suit (TC.Ring: each row the hull of the suit pressed in as
far as it gives), closed at the front by a flush magnetic buckle; the suit pressed in under it (TC.compress, A33).

- Pistol magazine pouch, left front: a double open-top laminate pouch, two magazines, shock cord and pull tabs.
- Cam and mine pouch, left hip: flat, a flap closed by a gunmetal magnetic tab (two sticky cams, one prox mine inside).
- Sling socket, left hip behind the cam pouch: a flush gunmetal quick-detach socket on a laminate boss (the game's
  compact-gun sling slot's anchor, A41; no sling modelled, D24).
- Drone pod, rear left, and medkit, rear right: both outside the game's back-carry lane (|x| >= 0.105 m, A39). The pod
  a small hard polymer shell with a rubber lid seal and a gunmetal latch; the medkit a flat tear-away laminate pouch
  with a visible tear seam and a flat webbing pull handle bonded along its bottom edge.
- Rappel ring at the back centre: a gunmetal D folded flat in a low laminate tunnel, only its bow showing.
- No sit harness, leg loops or gear loops. The two leg hangers (leg_kit.py) loop round the belt in the gaps left here.

Every pouch is laid on a map of the hips (a Ring from 0.76 to 0.976 m; u the arc length from the front centre, positive
toward the wearer's left), its back on the belt's outer face.
"""
import math

import bpy
import numpy as np

import fitted as FT
import head_common as HC
import kit_common as KC
import mag_buckle as MB
import torso_common as TC

KIT = 'waistBelt'
KITS = ['pistolMagPouch', 'camMinePouch', 'rappelRing', 'slingSocket', 'dronePod', 'medPouch', 'magBuckle']
METHOD = ('a tensioned laminate band on the suit\'s pressed hull (rows round the waist), pouches and hard parts on a '
          'conformal map of the hips; the suit pressed in under the band (no simulation)')
BELT_W, BELT_T, Z_MID = 0.030, 0.003, 0.926
T_SPLIT = -84.0                 # the closure's angle (degrees; the front is -90, the wearer's left 0)
H_POUCH = BELT_T + 0.0006       # a pouch's back over the belt's outer face
LANE_X = 0.105                  # the back-carry lane's edge (A39) plus 5 mm
U_PISTOL, U_CAM, U_SOCKET = 0.072, 0.178, 0.224
U_HANG_L, U_HANG_R = 0.1220, -0.188      # the leg hangers' gaps (leg_kit.py)


def soft(half, bulge=0.0012):
    hx, hy, hz = half

    def f(L):
        L = np.array(L, float)
        front = np.clip(L[:, 2] / hz, 0, 1)
        w = np.clip(1 - (L[:, 0] / hx) ** 2, 0, 1) * np.clip(1 - (L[:, 1] / hy) ** 2, 0, 1)
        L[:, 2] += bulge * front * w * (0.6 + 0.4 * np.clip((hy - L[:, 1]) / (2 * hy), 0, 1))
        return L
    return f


def hip_tree(op, dg):
    return KC.suit_trees(op, dg, keep=lambda P: np.all(np.abs(P[:, 0]) < 0.24) and P[:, 2].min() > 0.70
                         and P[:, 2].max() < 1.02)


def hip_map(op, dg, skin):
    tree, _, _ = hip_tree(op, dg)
    ring = TC.Ring(tree, skin, -0.01, np.arange(0.76, 0.9761, 0.004), np.radians(np.arange(-275.0, 96.0, 1.0)),
                   reach=0.30)
    return KC.RingMap(ring, math.radians(-90.0), Z_MID), ring


def lane_u(M, sign):
    """The arc position (u) on the back where the hips' surface crosses x = sign * LANE_X."""
    us = np.arange(0.0, 0.5, 0.001) * sign
    P = M(us, np.full_like(us, Z_MID), np.zeros_like(us)).reshape(-1, 3)
    ok = (P[:, 1] > 0.0) & (np.abs(P[:, 0]) <= LANE_X)
    return float(us[np.argmax(ok)])


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    pt, reg, meas = KC.Parts(), {}, {}
    mats = KC.materials(reuse, MAT)

    def add(name, key, rng):
        reg.setdefault(name, []).append((key, rng[0], rng[1]))
    tree, _, _ = hip_tree(op, dg)
    suit_tree, _, _ = KC.suit_trees(op, dg)
    Mh, hip = hip_map(op, dg, skin)
    meas['hipRayMisses'] = hip.misses

    # --- The band -----------------------------------------------------------------------------------------------------
    zs = np.linspace(Z_MID - BELT_W / 2, Z_MID + BELT_W / 2, 11)
    th = np.radians(T_SPLIT + np.arange(0.5, 359.6, 1.0))
    ring = TC.Ring(tree, skin, -0.01, zs, th, reach=0.30)
    G, Nn = ring.G.copy(), ring.Nn.copy()
    ax = np.array([0.0, -0.01])
    r0 = np.linalg.norm(G[..., :2] - ax, axis=-1)
    for _ in range(4):              # one tensioned band: rows eased into each other, never inside a row's hull
        G[1:-1] = (G[:-2] + 2 * G[1:-1] + G[2:]) / 4
        G[:, 1:-1] = (G[:, :-2] + 2 * G[:, 1:-1] + G[:, 2:]) / 4
        dv = G[..., :2] - ax
        rr = np.linalg.norm(dv, axis=-1)
        G[..., :2] = ax + dv * (np.maximum(rr, r0) / rr)[..., None]
    Ns = np.cross(np.gradient(G, axis=1), np.gradient(G, axis=0))
    Ns *= np.sign(np.sum(Ns * Nn, axis=-1))[..., None]
    Nn = FT.unit(Ns.reshape(-1, 3)).reshape(Nn.shape)
    Vb, Fb, Eb = pt('lam')
    b0 = len(Vb)
    TC.band_slab(Vb, Fb, G, Nn, BELT_T)
    Eb.extend([0.004] * (len(Vb) - len(Eb)))
    add('waistBelt', 'lam', (b0, len(Vb)))
    R_, C_ = G.shape[:2]
    press = [(G.reshape(-1, 3), [(i * C_ + j, i * C_ + j + 1, (i + 1) * C_ + j + 1, (i + 1) * C_ + j)
                                 for i in range(R_ - 1) for j in range(C_ - 1)])]
    meas['belt'] = {'widthM': BELT_W, 'thickM': BELT_T, 'zMid': Z_MID, 'lengthM': round(TC.path_length(G[R_ // 2]), 3),
                    'rayMisses': ring.misses}

    # the flush magnetic front closure over the band's two ends
    u_c = float(np.interp(math.radians(T_SPLIT), Mh.th, Mh.s))
    O, A_, U_, N_ = KC.frame(Mh, u_c, Z_MID, BELT_T + 0.0002)
    pt.pad('metal'), pt.pad('rubber')
    MB.build(pt('metal'), pt('rubber'), O, A_, None, N_, BELT_W)
    meas['closure'] = {'u': round(u_c, 4), 'at': [round(float(v), 4) for v in O]}

    # --- Pistol magazine pouch (left front): two cells, two magazines ---------------------------------------------------
    half = (0.0152, 0.036, 0.0085)
    hx, hy, hz = half
    cv = Z_MID + BELT_W / 2 + 0.003 - hy
    for k, du in enumerate((-0.0157, 0.0157)):
        cu = U_PISTOL + du
        _, r_ = KC.cbox(pt('lam'), Mh, cu, cv, half, 0.004, H_POUCH, deform=soft(half))
        add('pistolMagPouch', 'lam', r_)
        rim = TC.densify_closed(np.array([(-hx + 0.0016, 0.0018), (hx - 0.0016, 0.0018), (hx - 0.0016, 2 * hz - 0.0006),
                                          (-hx + 0.0016, 2 * hz - 0.0006)]), 0.002)
        lp = [(a, hy - 0.0009, b) for a, b in rim] + [(rim[0][0], hy - 0.0009, rim[0][1])]
        KC.tube(pt('lam'), KC.mpts(Mh, lp, cu, cv, 0.0, H_POUCH), 0.001, sides=6, step=0.002)
        _, r_ = KC.cbox(pt('poly'), Mh, cu, cv, (0.0112, 0.008, 0.006), 0.0025, H_POUCH, off=(0.0, hy + 0.002, hz - 0.006))
        add('pistolMagPouch', 'poly', r_)
        _, r_ = KC.cbox(pt('poly'), Mh, cu, cv, (0.0126, 0.0022, 0.0066), 0.0018, H_POUCH,
                        off=(0.0, hy + 0.0122, hz - 0.0066))
        add('pistolMagPouch', 'poly', r_)
        KC.cord_loop(pt('cord'), Mh, cu, cv, 0.0, H_POUCH, hx + 0.0008, hy - 0.01, hy + 0.0144 + 0.002, hz, r=0.0014,
                     rise=0.009)
        _, r_ = KC.cbox(pt('rubber'), Mh, cu, cv, (0.0048, 0.0042, 0.0012), 0.001, H_POUCH,
                        off=(0.0, hy + 0.0128, hz + 0.0066 + 0.0002))
        add('pistolMagPouch', 'rubber', r_)

    # --- Cam and mine pouch (left hip): flat, flap with a magnetic tab --------------------------------------------------
    half = (0.032, 0.033, 0.0085)
    hx, hy, hz = half
    cv = Z_MID + BELT_W / 2 + 0.005 - hy
    _, r_ = KC.cbox(pt('lam'), Mh, U_CAM, cv, half, 0.005, H_POUCH, deform=soft(half, 0.001))
    add('camMinePouch', 'lam', r_)
    _, r_ = KC.cbox(pt('lam'), Mh, U_CAM, cv, (hx + 0.0006, 0.013, 0.0011), 0.0009, H_POUCH,
                    off=(0.0, hy - 0.013 + 0.0012, 2 * hz + 0.0008))
    add('camMinePouch', 'lam', r_)
    _, r_ = KC.cbox(pt('lam'), Mh, U_CAM, cv, (hx + 0.0006, 0.0011, hz + 0.0011), 0.0009, H_POUCH,
                    off=(0.0, hy + 0.0011, -0.0002))
    add('camMinePouch', 'lam', r_)
    _, r_ = KC.cbox(pt('metal'), Mh, U_CAM, cv, (0.0065, 0.0034, 0.001), 0.0008, H_POUCH,
                    off=(0.0, hy - 0.023, 2 * hz + 0.003))
    add('camMinePouch', 'metal', r_)
    for (x0, y0, rr, d) in ((-0.017, 0.012, 0.0105, 0.014), (0.017, 0.012, 0.0105, 0.014), (0.0, -0.014, 0.0145, 0.012)):
        KC.tube(pt('poly'), KC.mpts(Mh, [(x0, y0, 0.0015), (x0, y0, 0.0015 + d)], U_CAM, cv, 0.0, H_POUCH), rr, sides=20)
    meas['camMinePouch'] = {'contents': ['stickyCam', 'stickyCam', 'mine'], 'u': U_CAM}

    # --- Sling socket (left hip): a flush quick-detach socket on a laminate boss ---------------------------------------
    _, r_ = KC.cbox(pt('lam'), Mh, U_SOCKET, Z_MID, (0.0115, 0.0125, 0.0011), 0.0009, BELT_T + 0.0001)
    add('slingSocket', 'lam', r_)
    O, A_, U_, N_ = KC.frame(Mh, U_SOCKET, Z_MID, BELT_T + 0.0023)
    Vm, Fm, Em = pt('metal')
    pt.pad('metal')
    b0 = len(Vm)
    FT.ring(Vm, Fm, O, N_, 0.0034, 0.0078, 0.0026, seg=32)
    FT.ring(Vm, Fm, O + N_ * 0.0006, N_, 0.0, 0.0036, 0.0004, seg=24)            # the bore's floor, 2 mm down
    Em.extend([0.0] * (len(Vm) - len(Em)))
    add('slingSocket', 'metal', (b0, len(Vm)))
    KC.tube(pt('rubber'), [O + A_ * 0.0098 + U_ * 0.0 + N_ * 0.0, O + A_ * 0.0098 + N_ * 0.0016], 0.0016, sides=12)
    meas['slingSocket'] = {'u': U_SOCKET, 'at': [round(float(v), 4) for v in O]}

    # --- Drone pod (rear left) and medkit (rear right), outside the back-carry lane ------------------------------------
    uL, uR = lane_u(Mh, 1.0), lane_u(Mh, -1.0)
    pod_w = min(0.084, uL - (U_SOCKET + 0.0125 + 0.003))
    half = (pod_w / 2, 0.040, 0.0095)
    hx, hy, hz = half
    pu = uL - hx
    cv = Z_MID + BELT_W / 2 + 0.005 - hy
    _, r_ = KC.cbox(pt('poly'), Mh, pu, cv, half, 0.006, H_POUCH)
    add('dronePod', 'poly', r_)
    seal = TC.densify_closed(TC.fillet(np.array([(-hx - 0.0004, -0.0004), (hx + 0.0004, -0.0004),
                                                 (hx + 0.0004, 2 * hz + 0.0004), (-hx - 0.0004, 2 * hz + 0.0004)]),
                                       [0.004, 0.006, 0.006, 0.004], seg=6), 0.002)
    lp = [(a, hy - 0.017, b) for a, b in seal] + [(seal[0][0], hy - 0.017, seal[0][1])]
    KC.tube(pt('rubber'), KC.mpts(Mh, lp, pu, cv, 0.0, H_POUCH), 0.0009, sides=6, step=0.002)
    _, r_ = KC.cbox(pt('metal'), Mh, pu, cv, (0.009, 0.0062, 0.0013), 0.001, H_POUCH, off=(0.0, hy - 0.017, 2 * hz + 0.0001))
    add('dronePod', 'metal', r_)
    meas['dronePod'] = {'u': [round(pu - hx, 4), round(pu + hx, 4)], 'widthM': round(pod_w, 4), 'laneU': round(uL, 4)}
    half = (0.045, 0.036, 0.008)
    hx, hy, hz = half
    mu = uR + hx
    cv = Z_MID + BELT_W / 2 + 0.005 - hy
    _, r_ = KC.cbox(pt('lam'), Mh, mu, cv, half, 0.006, H_POUCH, deform=soft(half, 0.0015))
    add('medPouch', 'lam', r_)
    loop = []
    for a in np.linspace(0, 2 * math.pi, 120):
        c, s_ = math.cos(a), math.sin(a)
        loop.append((math.copysign(abs(c) ** 0.18, c) * (hx + 0.0002), math.copysign(abs(s_) ** 0.18, s_) * (hy + 0.0002),
                     2 * hz * 0.58))
    KC.tube(pt('rubber'), KC.mpts(Mh, loop, mu, cv, 0.0, H_POUCH), 0.0007, sides=6, step=0.002)
    bulge = soft(half, 0.0015)

    def face_h(x, y):
        # the outer face's height (local z) at (x, y), the soft bulge included (flat part of the face only)
        return float(bulge(np.array([[x, y, hz]]))[0, 2])
    # the tear line: a moulded dashed seam across the outer face at the clamshell's split height, 3 mm dashes
    y_t = hy * 0.16
    for x0 in np.arange(-hx + 0.0075, hx - 0.0075 - 0.0029, 0.0047):
        dash = [(x_, y_t, hz + face_h(x_, y_t) - hz + 0.0001) for x_ in np.linspace(x0, x0 + 0.003, 4)]
        KC.tube(pt('rubber'), KC.mpts(Mh, [(a, b, hz + c) for a, b, c in dash], mu, cv, 0.0, H_POUCH), 0.00055, sides=6,
                step=0.001)
        add('medPouch', 'rubber', KC.tube.last)
    # the pull strap: 30 mm flat webbing bonded flush along the bottom edge, a bar tack at each end
    y_s = -hy + 0.0105
    lift = (lambda L: np.column_stack([L[:, 0], L[:, 1], L[:, 2] + np.array([face_h(x_, y_ + y_s) - hz for x_, y_ in
                                                                                zip(L[:, 0], L[:, 1])])]))
    _, r_ = KC.cbox(pt('lam'), Mh, mu, cv, (0.015, 0.004, 0.0007), 0.0006, H_POUCH, off=(0.0, y_s, 2 * hz - 0.0002),
                    step=0.0012, deform=lift)
    add('medPouch', 'lam', r_)
    for xt in (-0.0125, 0.0125):
        tack = [(xt, y_s + yy, 2 * hz + 0.0013 + face_h(xt, y_s + yy) - hz) for yy in np.linspace(-0.003, 0.003, 4)]
        KC.tube(pt('rubber'), KC.mpts(Mh, tack, mu, cv, 0.0, H_POUCH), 0.0004, sides=6, step=0.001)
        add('medPouch', 'rubber', KC.tube.last)
    meas['medPouch'] = {'u': [round(mu - hx, 4), round(mu + hx, 4)], 'laneU': round(uR, 4), 'contents': ['medkit'],
                        'pullStrapM': [0.030, 0.008], 'tearLineAtY': round(y_t, 4)}

    # --- Rappel ring (back centre) in a low tunnel -------------------------------------------------------------------
    ub = float(np.interp(math.radians(90.0), Mh.th, Mh.s))
    T_V0, T_V1 = Z_MID - BELT_W / 2 + 0.0085, Z_MID + BELT_W / 2 - 0.0015          # the tunnel's lower and upper edge
    _, r_ = KC.cbox(pt('lam'), Mh, ub, (T_V0 + T_V1) / 2, (0.021, (T_V1 - T_V0) / 2, 0.0016), 0.0012, BELT_T + 0.0001)
    add('rappelRing', 'lam', r_)
    WR = 0.0014                                       # the ring's wire radius; the bow lies on the belt's face
    v_bot = Z_MID - BELT_W / 2 + 0.0005 + WR          # the bow's centreline ends 0.5 mm above the belt's lower edge
    depth = T_V0 - v_bot + 0.002
    bow = []
    for a in np.linspace(0.0, math.pi, 25):
        sa = math.sin(a)
        bow.append((0.0125 * math.cos(a), -depth * sa ** 0.6, BELT_T + WR + 0.0001))
    leg = T_V1 - 0.004 - (T_V0 + 0.002)
    bow = [(0.0125, leg, BELT_T + WR + 0.0001)] + bow + [(-0.0125, leg, BELT_T + WR + 0.0001)]
    KC.tube(pt('metal'), KC.mpts(Mh, bow, ub, T_V0 + 0.002), WR, sides=12, step=0.0015)
    add('rappelRing', 'metal', KC.tube.last)
    meas['rappelRing'] = {'u': round(ub, 4), 'wireDiaMm': WR * 2000, 'bowBelowTunnelMm': round((T_V0 - v_bot + WR) * 1000, 1),
                          'bowAboveBeltEdgeMm': round((v_bot - WR - (Z_MID - BELT_W / 2)) * 1000, 1)}

    # --- Fit, the lane, the suit pressed in ---------------------------------------------------------------------------
    so = {n: KC.standoff(KC.reg_verts(pt, reg, [n]), suit_tree) for n in reg}
    meas['standoffFromSuitM'] = so
    meas['backLane'] = KC.lane_report(pt, reg, {'rappelRing', 'waistBelt'})
    meas['hangerGapsU'] = {'left': U_HANG_L, 'right': U_HANG_R}
    PV, PF = KC.merge(press)
    meas['suitPress'] = TC.compress(KC.suit_follow(op), [TC.bvh(PV, PF)], skin, cap=0.0025,
                                    region=(PV.min(axis=0), PV.max(axis=0)))
    objs = KC.write_objects(scene, op, 'waist_belt', pt, mats)
    return {'shell': KC.shell_of(pt), 'objects': list(objs.values()), 'kits': KITS, 'measurements': meas,
            'report': {'parts': {k: len(v[1]) for k, v in pt.d.items()}}}
