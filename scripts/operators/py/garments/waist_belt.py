"""Wren's slim waist belt and its kit (step 09; SPEC 5.1 "Belt"; ART-DIRECTION 9.2; concept A2, A39, A41). A FITTED
item over the armour: a tensioned laminate band round the suit (TC.Ring: each row the hull of the suit pressed in as
far as it gives), closed at the front by a flush magnetic buckle; the suit pressed in under it (TC.compress, A33).

- Pistol magazines (D28): two true 128 mm 9 mm magazines, horizontal, one above the other at 9 o'clock on the left hip
  side (the lower row's bottom at the belt's lower edge, so the raised thigh clears them), base plates forward (the left
  hand pulls each forward along its axis); a slim double pouch open at the front with a shock-cord loop and pull tab
  per magazine, on one flat laminate panel; the panel on a moulded seat over the belt and the hip (one rigid piece,
  skinned to the pelvis).
- Cam and mine pouch, front left (D28: the old pistol spot): flat, a flap closed by a gunmetal magnetic tab (two
  sticky cams, one prox mine inside).
- Sling socket, about 8 o'clock behind the pistol magazines (D28; A41's slot moved back): a flush gunmetal
  quick-detach socket on a laminate boss (the game's compact-gun sling slot's anchor; no sling modelled, D24).
- Drone pod, rear left, and medkit, rear right: both outside the game's back-carry lane (|x| >= 0.105 m, A39). The pod
  (D28, D1) a flat hard polymer shell on a moulded saddle, raised 25 mm so the knee-up crawl clears it, with a rubber lid seal and a gunmetal latch; the medkit a flat tear-away laminate pouch
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
import torso_common as TC

KIT = 'waistBelt'
KITS = ['pistolMagPouch', 'camMinePouch', 'rappelRing', 'slingSocket', 'dronePod', 'medPouch', 'magBuckle']
METHOD = ('a tensioned laminate band on the suit\'s pressed hull (rows round the waist), pouches and hard parts on a '
          'conformal map of the hips; the suit pressed in under the band (no simulation)')
BELT_W, BELT_T, Z_MID = 0.030, 0.003, 0.926
T_SPLIT = -84.0                 # the closure's angle (degrees; the front is -90, the wearer's left 0)
H_POUCH = BELT_T + 0.0006       # a pouch's back over the belt's outer face
LANE_X = 0.105                  # the back-carry lane's edge (A39) plus 5 mm
U_HANG_R = -0.188                       # the right leg hanger's gap (leg_kit.py); the left one is laid out in build()
# D28 pistol magazines (9 mm double stack: 128 x 34 x 24 mm, straight), the rows and the clock positions
PMAG_L, PMAG_W, PMAG_T = 0.128, 0.034, 0.024
PMAG_Z0 = Z_MID - BELT_W / 2 + 0.0005    # the lower row's bottom: at the belt's lower edge
SOCKET_DEG = 30.0                        # the sling socket at about 8 o'clock (0 = 9 o'clock, the wearer's left)
# A88: the 9 o'clock magazines and the 8 o'clock socket fill the left belt up to the back-carry lane, so the drone pod
# (D1, flat on a saddle, true 84 x 80 x 19 mm) takes the rear right and the soft medkit the right side in front of the
# holster hanger
POD_W, POD_H, POD_T = 0.084, 0.080, 0.019
PB = {'pelvis': 1.0}


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
                         and P[:, 2].max() < 1.06)


def hip_map(op, dg, skin):
    tree, _, _ = hip_tree(op, dg)
    ring = TC.Ring(tree, skin, -0.01, np.arange(0.76, 1.0521, 0.004), np.radians(np.arange(-275.0, 96.0, 1.0)),
                   reach=0.30)
    return KC.RingMap(ring, math.radians(-90.0), Z_MID), ring


def lane_u(M, sign, z=Z_MID):
    """The arc position (u) on the back where the hips' surface at height z crosses x = sign * LANE_X."""
    us = np.arange(0.0, 0.5, 0.001) * sign
    P = M(us, np.full_like(us, z), np.zeros_like(us)).reshape(-1, 3)
    ok = (P[:, 1] > 0.0) & (np.abs(P[:, 0]) <= LANE_X)
    return float(us[np.argmax(ok)])


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    pt, reg, meas = KC.Parts(base=200), {}, {}
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
    KC.buckle(pt, O, A_, N_, BELT_W, pt.part('beltBuckle', PB, item='magBuckle'))
    meas['closure'] = {'u': round(u_c, 4), 'at': [round(float(v), 4) for v in O]}

    # --- Pistol magazines (D28): 9 o'clock, horizontal, two rows, base plates forward ------------------------------------
    u9 = float(np.interp(0.0, Mh.th, Mh.s))
    z_lo = PMAG_Z0 + 0.0025 + PMAG_W / 2                  # the rows' centres (pouch wall 2.5 mm)
    z_hi = z_lo + PMAG_W + 0.0035
    cvp = 0.5 * (z_lo + z_hi)
    hxp, hyp = PMAG_L / 2 + 0.003, 0.5 * (z_hi - z_lo) + PMAG_W / 2 + 0.003
    Fp0, seat_p = KC.flat_on(Mh, u9, cvp, (hxp, hyp))
    Fp = Fp0.lifted(H_POUCH)                               # clear of the belt's face
    meas['pistolMagSeat'] = {**seat_p, 'liftMm': H_POUCH * 1000, 'frame': Fp.report()}
    r_pan = pt.part('pistolMagPanel', PB, 'carrier', item='pistolMagPouch')
    n0 = pt.count('lam', 'cord', 'rubber')
    _, r_ = KC.cbox(pt('lam'), Fp, u9, cvp, (hxp, hyp, 0.001), 0.002, 0.0)
    add('pistolMagPouch', 'lam', r_)
    for k, zr in enumerate((z_lo, z_hi)):
        dv = zr - cvp
        # the pouch: closed at the rear, open at the front (the base plate and 25 mm of the magazine out of it)
        ph = (0.0475, PMAG_W / 2 + 0.0025, PMAG_T / 2 + 0.0015)
        _, r_ = KC.cbox(pt('lam'), Fp, u9, cvp, ph, 0.004, 0.002, off=(0.0165, dv, 0.0), deform=soft(ph, 0.0008))
        add('pistolMagPouch', 'lam', r_)
        x_m = 0.0165 - ph[0] + 0.0009
        ring_ = TC.densify_closed(np.array([(-ph[1] + 0.0016, 0.0018), (ph[1] - 0.0016, 0.0018),
                                            (ph[1] - 0.0016, 2 * ph[2] - 0.0006), (-ph[1] + 0.0016, 2 * ph[2] - 0.0006)]), 0.002)
        lp = [(x_m, dv + a, 0.002 + b) for a, b in ring_] + [(x_m, dv + ring_[0][0], 0.002 + ring_[0][1])]
        KC.tube(pt('lam'), KC.mpts(Fp, lp, u9, cvp, 0.0, 0.0), 0.001, sides=6, step=0.002)
        # the magazine (one rigid part): body 120 mm and base plate 8 mm, the base plate forward (local -x)
        rid = pt.part(f'pistolMag{k}', PB, item='pistolMagPouch', size='pistolMag')
        nm0 = pt.count('poly')
        zc_ = 0.0025 + PMAG_T / 2
        _, r_ = KC.cbox(pt('poly'), Fp, u9, cvp, (0.060, PMAG_W / 2 - 0.0004, PMAG_T / 2 - 0.0006), 0.0025,
                        zc_ - PMAG_T / 2 + 0.0006, off=(0.004, dv, 0.0))
        add('pistolMagPouch', 'poly', r_)
        _, r_ = KC.cbox(pt('poly'), Fp, u9, cvp, (0.004, PMAG_W / 2, PMAG_T / 2), 0.0018, zc_ - PMAG_T / 2,
                        off=(-0.060, dv, 0.0))
        add('pistolMagPouch', 'poly', r_)
        pt.tag_since(nm0, rid)
        # the shock-cord loop round the base plate (from the pouch's top and bottom faces) and its pull tab
        yt = PMAG_W / 2 + 0.0016
        cl = [(x_m + 0.006, dv + yt, zc_), (-0.050, dv + yt, zc_)]
        for a in np.linspace(0.5 * math.pi, 1.5 * math.pi, 19):
            c_, s_ = math.cos(a), math.sin(a)
            cl.append((-0.058 + 0.0076 * math.copysign(abs(c_) ** 0.35, c_), dv + yt * math.copysign(abs(s_) ** 0.35, s_), zc_))
        cl += [(-0.050, dv - yt, zc_), (x_m + 0.006, dv - yt, zc_)]
        KC.tube(pt('cord'), KC.mpts(Fp, cl, u9, cvp, 0.0, 0.0), 0.0014, sides=8, step=0.002)
        _, r_ = KC.cbox(pt('rubber'), Fp, u9, cvp, (0.0012, 0.0045, 0.0042), 0.001, zc_ - 0.0042,
                        off=(-0.0682, dv, 0.0))
        add('pistolMagPouch', 'rubber', r_)
    pt.tag_since(n0, r_pan)
    if seat_p['maxMm'] + H_POUCH * 1000 > 3.0:
        r_seat = pt.part('pistolMagSeat', PB, 'mount', item='pistolMagPouch', gapMm=round(seat_p['maxMm'] + H_POUCH * 1000, 1))
        ns = pt.count('lam')
        rs = KC.seat(pt('lam'), Fp, Mh, u9, cvp, (hxp - 0.002, hyp - 0.002), h_top=-0.0002, h_base=0.0004)
        add('pistolMagPouch', 'lam', rs)
        pt.tag_since(ns, r_seat)
    pt.seat_of('pistolMag', seat_p['maxMm'] + H_POUCH * 1000, 'pistolMagSeat' if seat_p['maxMm'] + H_POUCH * 1000 > 3.0 else None)
    u_mf = u9 - 0.066                                     # the magazines' front end (base plates and cord)
    U_HANG_L = u_mf - 0.016                               # the left leg hanger's gap, in front of them
    U_CAM = U_HANG_L - 0.011 - 0.004 - 0.032              # the cam pouch in front of the hanger
    meas['pistolMags'] = {'u9': round(u9, 4), 'rowsZ': [round(z_lo, 4), round(z_hi, 4)],
                          'lowerRowBottomZ': round(z_lo - PMAG_W / 2, 4), 'beltLowerEdgeZ': round(Z_MID - BELT_W / 2, 4),
                          'lengthMm': PMAG_L * 1000, 'baseForward': True}

    # --- Cam and mine pouch (front left, D28): flat, flap with a magnetic tab --------------------------------------------
    r_cam = pt.part('camMinePouchCarrier', PB, 'carrier', item='camMinePouch')
    n0 = pt.count('lam', 'poly')
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
    for (x0, y0, rr, d) in ((-0.017, 0.012, 0.0105, 0.014), (0.017, 0.012, 0.0105, 0.014), (0.0, -0.014, 0.0145, 0.012)):
        KC.tube(pt('poly'), KC.mpts(Mh, [(x0, y0, 0.0015), (x0, y0, 0.0015 + d)], U_CAM, cv, 0.0, H_POUCH), rr, sides=20)
    pt.tag_since(n0, r_cam)
    Ft, _ = KC.flat_on(Mh, U_CAM, cv + hy - 0.023, (0.007, 0.0035))
    Ft = Ft.lifted(-0.0005)                            # bonded into the soft flap (its crown under the tab)
    rid = pt.part('camTab', PB, item='camMinePouch')
    nt = pt.count('metal')
    _, r_ = KC.cbox(pt('metal'), Ft, U_CAM, cv + hy - 0.023, (0.0065, 0.0034, 0.001), 0.0008, H_POUCH + 2 * hz + 0.003)
    add('camMinePouch', 'metal', r_)
    pt.tag_since(nt, rid)
    meas['camMinePouch'] = {'contents': ['stickyCam', 'stickyCam', 'mine'], 'u': round(U_CAM, 4)}

    # --- Sling socket (about 8 o'clock, behind the pistol magazines): a flush quick-detach socket on a boss -------------
    U_SOCKET = max(float(np.interp(math.radians(SOCKET_DEG), Mh.th, Mh.s)), u9 + PMAG_L / 2 + 0.006 + 0.0115)
    Fs, _ = KC.flat_on(Mh, U_SOCKET, Z_MID, (0.0115, 0.0125))
    Fs = Fs.lifted(BELT_T + 0.0001)
    rid = pt.part('slingSocket', PB, item='slingSocket')
    ns = pt.count('lam', 'metal', 'rubber')
    _, r_ = KC.cbox(pt('lam'), Fs, U_SOCKET, Z_MID, (0.0115, 0.0125, 0.0011), 0.0009, 0.0)
    add('slingSocket', 'lam', r_)
    fr = KC.Frame.of_flat(Fs, U_SOCKET, Z_MID, 0.0022)  # the socket and its stud built in Fs's own map space
    O = fr.O
    nf = pt.count('metal', 'rubber')
    Vm, Fm, Em = pt('metal')
    pt.pad('metal')
    b0 = len(Vm)
    ez = np.array([0.0, 0.0, 1.0])
    FT.ring(Vm, Fm, np.zeros(3), ez, 0.0034, 0.0078, 0.0026, seg=32)
    FT.ring(Vm, Fm, ez * 0.0006, ez, 0.0, 0.0036, 0.0004, seg=24)               # the bore's floor, 2 mm down
    Em.extend([0.0] * (len(Vm) - len(Em)))
    add('slingSocket', 'metal', (b0, len(Vm)))
    KC.tube(pt('rubber'), [np.array([0.0098, 0.0, 0.0]), np.array([0.0098, 0.0, 0.0016])], 0.0016, sides=12)
    pt.place(nf, fr)
    pt.tag_since(ns, rid)
    th_s = float(np.interp(U_SOCKET, Mh.s, Mh.th))
    meas['slingSocket'] = {'u': round(U_SOCKET, 4), 'at': [round(float(v), 4) for v in O],
                           'clockDeg': round(math.degrees(th_s), 1), 'clock': round(9.0 - math.degrees(th_s) / 30.0, 2)}

    # --- Drone pod (rear right, A88) and medkit (right side), outside the back-carry lane ------------------------------------
    uL, uR = lane_u(Mh, 1.0), lane_u(Mh, -1.0)
    z_pod0 = Z_MID + BELT_W / 2 + 0.005 - POD_H          # its top 5 mm over the belt (as the step 09 pod)
    uLp = max(lane_u(Mh, -1.0, z) for z in np.linspace(z_pod0, z_pod0 + POD_H, 6))   # the right lane edge (u < 0)
    pod_w = POD_W
    half = (pod_w / 2, POD_H / 2, POD_T / 2)
    hx, hy, hz = half
    pu = uLp + hx
    cv = z_pod0 + hy
    Fd, seat_d = KC.flat_on(Mh, pu, cv, (hx, hy))
    Fd = Fd.lifted(H_POUCH)
    rid = pt.part('dronePod', PB, item='dronePod', size='dronePod')
    npd = pt.count('poly', 'rubber', 'metal')
    _, r_ = KC.cbox(pt('poly'), Fd, pu, cv, half, 0.006, 0.0)
    add('dronePod', 'poly', r_)
    pt.tag_since(npd, rid)                         # the shell (true size); its seal and latch: one more part
    rid = pt.part('dronePodLatch', PB, item='dronePod')
    npd = pt.count('poly', 'rubber', 'metal')
    seal = TC.densify_closed(TC.fillet(np.array([(-hx - 0.0004, -0.0004), (hx + 0.0004, -0.0004),
                                                 (hx + 0.0004, 2 * hz + 0.0004), (-hx - 0.0004, 2 * hz + 0.0004)]),
                                       [0.004, 0.006, 0.006, 0.004], seg=6), 0.002)
    lp = [(a, hy - 0.017, b) for a, b in seal] + [(seal[0][0], hy - 0.017, seal[0][1])]
    KC.tube(pt('rubber'), KC.mpts(Fd, lp, pu, cv, 0.0, 0.0), 0.0009, sides=6, step=0.002)
    _, r_ = KC.cbox(pt('metal'), Fd, pu, cv, (0.009, 0.0062, 0.0013), 0.001, 0.0, off=(0.0, hy - 0.017, 2 * hz + 0.0001))
    add('dronePod', 'metal', r_)
    pt.tag_since(npd, rid)
    gap_d = seat_d['maxMm'] + H_POUCH * 1000
    if gap_d > 3.0:                                    # D1: the flat pod on a moulded saddle
        r_seat = pt.part('dronePodSeat', PB, 'mount', item='dronePod', gapMm=round(gap_d, 1))
        ns = pt.count('lam')
        rs = KC.seat(pt('lam'), Fd, Mh, pu, cv, (hx - 0.003, hy - 0.003), h_top=-0.0002, h_base=0.0004)
        add('dronePod', 'lam', rs)
        pt.tag_since(ns, r_seat)
    pt.seat_of('dronePod', gap_d, 'dronePodSeat' if gap_d > 3.0 else None)
    # the pod's laminate tab: up the belt's face under the pod and round the belt's top (it hangs the pod)
    r_tab = pt.part('dronePodTab', PB, 'carrier', item='dronePod')
    nt = pt.count('lam')
    ut = pu
    v0t, v1t = z_pod0 + 0.006, Z_MID + BELT_W / 2 + 0.004
    _, r_ = KC.cbox(pt('lam'), Mh, ut, 0.5 * (v0t + v1t), (0.012, 0.5 * (v1t - v0t), 0.0008), 0.0007, BELT_T + 0.0001)
    add('dronePod', 'lam', r_)
    pt.tag_since(nt, r_tab)
    meas['dronePod'] = {'u': [round(pu - hx, 4), round(pu + hx, 4)], 'widthM': round(pod_w, 4), 'laneU': round(uLp, 4),
                        'sizeMm': [round(pod_w * 1000, 1), POD_H * 1000, POD_T * 1000],
                        'z': [round(cv - hy, 4), round(cv + hy, 4)], 'seatGapMm': round(gap_d, 1)}
    half = (0.045, 0.036, 0.008)
    hx, hy, hz = half
    mu = U_HANG_R + 0.011 + 0.004 + hx                   # A88: the right side, in front of the holster hanger
    cv = Z_MID + BELT_W / 2 + 0.005 - hy
    r_med = pt.part('medPouch', PB, 'carrier', item='medPouch')          # soft (D28): skinned to the pelvis
    nmed = pt.count('lam', 'rubber')
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
    pt.tag_since(nmed, r_med)
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
    Fr, _ = KC.flat_on(Mh, ub, T_V0 + 0.002 - depth / 2, (0.014, depth / 2 + 0.003))
    rid = pt.part('rappelRing', PB, item='rappelRing')
    nr = pt.count('metal')
    KC.tube(pt('metal'), KC.mpts(Fr, bow, ub, T_V0 + 0.002), WR, sides=12, step=0.0015)
    add('rappelRing', 'metal', KC.tube.last)
    pt.tag_since(nr, rid)
    meas['rappelRing'] = {'u': round(ub, 4), 'wireDiaMm': WR * 2000, 'bowBelowTunnelMm': round((T_V0 - v_bot + WR) * 1000, 1),
                          'bowAboveBeltEdgeMm': round((v_bot - WR - (Z_MID - BELT_W / 2)) * 1000, 1)}

    # --- Fit, the lane, the suit pressed in ---------------------------------------------------------------------------
    so = {n: KC.standoff(KC.reg_verts(pt, reg, [n]), suit_tree) for n in reg}
    meas['standoffFromSuitM'] = so
    meas['backLane'] = KC.lane_report(pt, reg, {'rappelRing', 'waistBelt'})
    meas['hangerGapsU'] = {'left': round(U_HANG_L, 4), 'right': U_HANG_R}
    meas['rigid'] = pt.report()
    PV, PF = KC.merge(press)
    meas['suitPress'] = TC.compress(KC.suit_follow(op), [TC.bvh(PV, PF)], skin, cap=0.0025,
                                    region=(PV.min(axis=0), PV.max(axis=0)))
    objs = KC.write_objects(scene, op, 'waist_belt', pt, mats)
    objs['lam']['hangU'] = [float(U_HANG_L), float(U_HANG_R)]          # leg_kit.py loops its hangers round these
    return {'shell': KC.shell_of(pt), 'objects': list(objs.values()), 'kits': KITS, 'measurements': meas,
            'report': {'parts': {k: len(v[1]) for k, v in pt.d.items()}}}
