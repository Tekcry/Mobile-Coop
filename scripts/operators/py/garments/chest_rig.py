"""Wren's chest rig on the chest plate, the radio in the back plate and the radio cable (step 09; SPEC 5.1 "Chest rig",
"Comms"; ART-DIRECTION 9.2; concept A2, D24, A39). A FITTED item over the armour: every part is bonded to a plate or
clipped to a strap, so nothing presses the suit.

- Two rifle magazines low on the chest plate (D28, R1): true 178 mm 5.56 magazines with their own forward curve,
  vertical, base plates up (the left hand grips a base plate and pulls up), side by side on one flat laminate placard
  panel; slim open-top pouches hold their lower 122 mm, a shock-cord loop over each base plate with a moulded rubber
  pull tab. The placard is one rigid piece on a moulded saddle bonded to the chest plate (its lower half stands off the
  rib segments); everything on it is skinned to the chest bone (D28).
- The gadget slot (upper right, over the right bust beside the magazines; the shoulder and side buckles take the
  corners): a flat laminate slot whose flap closes with a gunmetal magnetic tab; inside, the EMP and the two
  noisemakers as three flat stick-on discs.
- The knife moved to the left thigh (D28, leg_kit.py).
- The PTT clipped on the left shoulder strap at the collarbone: its body over the strap's inner edge, a rubber press
  pad, the earpiece plug's socket (step 07's cable ends on it) and the radio cable's socket on its top, a moulded clip
  round the strap's outer edge.
- The radio set into the back plate's recess (upper left; the recess floor is planar, D28), 1.8 mm clear of its walls; a low knurled channel knob, a
  rubber button; its 4 mm stub antenna runs along the plate's top edge under the moulded keeper (armour.py); its cable
  leaves the top connector, crosses the plate face onto the left shoulder strap's back tab, runs along the strap 4 mm in
  from its inner edge under the three keeper bridges and over the shoulder to the PTT, with strain-relief boots at both
  ends.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

import head_common as HC
import fitted as FT
import kit_common as KC
import torso_common as TC

KIT = 'magPouches'
KITS = ['gadgetSlot', 'ptt', 'radio', 'radioCable']
METHOD = ('hard and laminate parts laid on conformal maps of the chest and back plates (height fields) and the left '
          'shoulder strap path; the cable routed on the strap by its own frame (no simulation)')
# D28 R1: the rifle magazine pair (true 5.56 x 45 30-round: 178 mm overall, 62 mm fore-aft at the lips to 70 at the
# base, 24 mm thick, the base 16 mm forward of the lip line); lips 80 mm above the belt's top edge (z 0.941)
MAG_L, MAG_T, MAG_W0, MAG_W1, MAG_CURVE = 0.178, 0.024, 0.062, 0.070, 0.016
MAG_X, MAG_Z = 0.039, 0.941 + 0.080 + 0.089          # each magazine's centre x (+-), the pair's centre z
POUCH_Y = (-0.092, 0.030)                            # the pouch's bottom and top (magazine frame, y up from its centre)
PLATE_Z = 1.152                                      # the chest plate's lower edge zone (the saddle bonds above it)
GAD, GAD_HALF = (-0.0915, 1.245), (0.018, 0.025, 0.0065)
CABLE_R = 0.0016
STRAP_W, STRAP_T = 0.025, 0.0024
CAB_IN = 0.004                 # the cable runs this far in from the strap's inner edge (the keepers' line)
RADIO_C, RADIO_HALF = (0.058, 1.2865), (0.0262, 0.0287, 0.0028)     # a 5.6 mm module in the 4.7 mm recess
ANT_KX = 0.016                                                       # the antenna keeper's x
RADIO_DOME = 0.0004                                                  # its face crowned 0.4 mm


def soft(half, bulge=0.0015):
    """A laminate pouch filled by its load: the front pillows out, fuller toward the bottom."""
    hx, hy, hz = half

    def f(L):
        L = np.array(L, float)
        front = np.clip(L[:, 2] / hz, 0, 1)
        w = np.clip(1 - (L[:, 0] / hx) ** 2, 0, 1) * np.clip(1 - (L[:, 1] / hy) ** 2, 0, 1)
        low = 0.6 + 0.4 * np.clip((hy - L[:, 1]) / (2 * hy), 0, 1)
        L[:, 2] += bulge * front * w * low
        return L
    return f


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    pt, reg, meas = KC.Parts(base=100), {}, {}
    mats = KC.materials(reuse, MAT)

    def add(name, key, rng):
        reg.setdefault(name, []).append((key, rng[0], rng[1]))

    # --- The plate faces as maps -----------------------------------------------------------------------------------
    plate = bpy.data.objects[f'{op}-armour-plate']
    Vp, Fp = TC.mesh_world(plate, dg)
    t_front = TC.bvh(Vp, [f for f in Fp if Vp[list(f), 1].mean() < -0.02])
    t_back = TC.bvh(Vp, [f for f in Fp if Vp[list(f), 1].mean() > 0.0])
    Mf = KC.HField(t_front, -1.0, np.arange(-0.125, 0.12501, 0.002), np.arange(1.0, 1.3451, 0.002))
    rx0, rx1, rz0, rz1 = 0.0285, 0.0875, 1.2545, 1.3185          # armour.py's radio recess, 1.5 mm grown
    Mb = KC.HField(t_back, 1.0, np.arange(-0.01, 0.1301, 0.002), np.arange(1.23, 1.3451, 0.002),
                   skip=lambda x, z: rx0 < x < rx1 and rz0 < z < rz1)
    suit_tree, _, _ = KC.suit_trees(op, dg)
    H0 = 0.0003                    # parts are bonded on the plate face

    # --- Rifle magazines (D28 R1): one rigid placard on the chest plate --------------------------------------------
    CH = {'chest': 1.0}
    hy = MAG_L / 2
    Fmag, seat_g = KC.flat_on(Mf, 0.0, MAG_Z, (MAG_X + 0.0395, hy + 0.003), support=lambda P: P[:, 2] > PLATE_Z)
    meas['rifleMagSeat'] = {**seat_g, 'frame': Fmag.report()}
    r_pan = pt.part('rifleMagPlacard', CH, 'carrier', item='magPouches')
    n0 = pt.count('lam', 'cord', 'rubber')
    _, r_ = KC.cbox(pt('lam'), Fmag, 0.0, MAG_Z, (MAG_X + 0.0395, hy + 0.0015, 0.001), 0.0015, 0.0)   # the back panel
    add('magPouches', 'lam', r_)

    def mag_shape(L):
        L = np.array(L, float)
        t = np.clip((L[:, 1] + hy) / (2 * hy), 0, 1)                  # 0 at the lips (down), 1 at the base (up)
        half_w = 0.5 * (MAG_W0 + (MAG_W1 - MAG_W0) * t)
        L[:, 0] = L[:, 0] / (MAG_W1 / 2) * half_w + MAG_CURVE * t ** 2 - 0.004
        return L
    for k, cu in enumerate((-MAG_X, MAG_X)):
        nm = f'magPouch{k}'
        # the slim pouch (soft, open top, a bound top edge) round the magazine's lower 122 mm
        ph, pc = (POUCH_Y[1] - POUCH_Y[0]) / 2, (POUCH_Y[1] + POUCH_Y[0]) / 2
        half = (0.0385, ph, 0.0135)
        _, r_ = KC.cbox(pt('lam'), Fmag, cu, MAG_Z, half, 0.004, 0.002, off=(0.0, pc, 0.0), deform=soft(half, 0.001))
        add(nm, 'lam', r_)
        hx, hz = half[0], half[2]
        rim = [(-hx + 0.0016, 0.0018), (hx - 0.0016, 0.0018), (hx - 0.0016, 2 * hz - 0.0006), (-hx + 0.0016, 2 * hz - 0.0006)]
        loop = TC.densify_closed(np.array(rim), 0.002)
        yt = POUCH_Y[1] - 0.0009
        lp = [(a, yt, 0.002 + b) for a, b in loop] + [(loop[0][0], yt, 0.002 + loop[0][1])]
        KC.tube(pt('lam'), KC.mpts(Fmag, lp, cu, MAG_Z, 0.0, 0.0), 0.0011, sides=6, step=0.002)
        # the magazine: one rigid part (body and base plate), its back on the panel
        rid = pt.part(f'rifleMag{k}', CH, item='magPouches', size='rifleMag')
        nm0 = pt.count('poly')
        _, r_ = KC.cbox(pt('poly'), Fmag, cu, MAG_Z, (MAG_W1 / 2, hy - 0.004, MAG_T / 2), 0.003, 0.0025,
                        off=(0.0, -0.004, 0.0), step=0.004, deform=mag_shape)
        add(nm + 'Mag', 'poly', r_)
        bx = MAG_CURVE - 0.004 + 0.0005
        _, r_ = KC.cbox(pt('poly'), Fmag, cu, MAG_Z, (MAG_W1 / 2 + 0.002, 0.004, MAG_T / 2 + 0.0008), 0.0022, 0.0017,
                        off=(bx, hy - 0.004, 0.0))
        add(nm + 'Mag', 'poly', r_)
        pt.tag_since(nm0, rid)
        # the shock-cord loop over the base plate (anchored inside the pouch's sides) and its pull tab
        KC.cord_loop(pt('cord'), Fmag, cu, MAG_Z, 0.0, 0.002, hx + 0.001, POUCH_Y[1] - 0.012, hy + 0.0016 + 0.0004, hz,
                     r=0.0016, rise=0.014, cx=bx)
        _, r_ = KC.cbox(pt('rubber'), Fmag, cu, MAG_Z, (0.0058, 0.0013, 0.0048), 0.0011, 0.0025 + MAG_T / 2 - 0.0048,
                        off=(bx, hy + 0.0013 + 0.0002, 0.0))
        add(nm + 'Tab', 'rubber', r_)
    pt.tag_since(n0, r_pan)
    # the moulded saddle: the panel's back on the chest plate (it stands off the rib segments below, D28)
    zc = 0.5 * (PLATE_Z + MAG_Z + hy)
    hs = 0.5 * (MAG_Z + hy - PLATE_Z)
    if seat_g['maxMm'] > 3.0:
        r_seat = pt.part('rifleMagSeat', CH, 'mount', item='magPouches', gapMm=seat_g['maxMm'])
        nseat = pt.count('lam')
        rs = KC.seat(pt('lam'), Fmag, Mf, 0.0, zc, (MAG_X + 0.0365, hs - 0.002), h_top=-0.0002, h_base=0.0004)
        add('magPouches', 'lam', rs)
        pt.tag_since(nseat, r_seat)
    pt.seat_of('rifleMag', seat_g['maxMm'], 'rifleMagSeat' if seat_g['maxMm'] > 3.0 else None)
    meas['rifleMags'] = {'centresX': [-MAG_X, MAG_X], 'zLips': round(MAG_Z - hy, 3), 'zBase': round(MAG_Z + hy, 3),
                         'lengthMm': MAG_L * 1000, 'seatGapMm': seat_g, 'baseUp': True}

    # --- Gadget slot: EMP 1, noisemakers 2 (flat stick-on discs) ----------------------------------------------------
    gx_, gy_, gz_ = GAD_HALF
    _, r_ = KC.cbox(pt('lam'), Mf, GAD[0], GAD[1], GAD_HALF, 0.004, H0, 0.0, deform=soft(GAD_HALF, 0.001))
    add('gadgetSlot', 'lam', r_)
    _, r_ = KC.cbox(pt('lam'), Mf, GAD[0], GAD[1], (gx_ + 0.0006, 0.0115, 0.0011), 0.0009, H0, 0.0,
                    off=(0.0, gy_ - 0.0115 + 0.0012, 2 * gz_ + 0.0009))
    add('gadgetSlot', 'lam', r_)
    _, r_ = KC.cbox(pt('lam'), Mf, GAD[0], GAD[1], (gx_ + 0.0006, 0.0011, gz_ + 0.0011), 0.0009, H0, 0.0,
                    off=(0.0, gy_ + 0.0011, -0.0002))
    add('gadgetSlot', 'lam', r_)
    Fg, _ = KC.flat_on(Mf, GAD[0], GAD[1] + gy_ - 0.0195, (0.006, 0.0035))
    Fg = Fg.lifted(-0.0005)
    rid = pt.part('gadgetTab', CH, item='gadgetSlot')
    nt = pt.count('metal')
    _, r_ = KC.cbox(pt('metal'), Fg, GAD[0], GAD[1] + gy_ - 0.0195, (0.0058, 0.0032, 0.0010), 0.0008, H0, 0.0,
                    off=(0.0, 0.0, 2 * gz_ + 0.0031))
    add('gadgetTab', 'metal', r_)
    pt.tag_since(nt, rid)
    for k in range(3):             # the three discs inside (stacked face to face)
        z0 = 0.0013 + k * 0.0037
        KC.tube(pt('poly'), KC.mpts(Mf, [(0.0, -0.002, z0), (0.0, -0.002, z0 + 0.0033)], GAD[0], GAD[1], 0.0, H0),
                0.0148, sides=24)
    meas['gadgetSlot'] = {'contents': ['emp', 'noise', 'noise'], 'centre': list(GAD)}

    # --- The left shoulder strap's path (armour.py) and the earpiece plug (head_kit.py) --------------------------------
    st = bpy.data.objects[f'{op}-armour-strap']
    SP = np.array(st['ls_P']).reshape(-1, 3)
    SN = np.array(st['ls_N']).reshape(-1, 3)
    SB = np.array(st['ls_B']).reshape(-1, 3)
    Ss = np.array(st['ls_s'])
    inner = float(np.array(st['ls_inner']).ravel()[0])
    keepS = list(np.array(st['ls_keepS']).ravel())
    ST = TC.tangents(SP)
    cab_ob = bpy.data.objects[f'{op}-head_kit-cable']
    Vc = np.array([cab_ob.matrix_world @ v.co for v in cab_ob.data.vertices])
    c0, c1 = Vc[0:8].mean(axis=0), Vc[8:16].mean(axis=0)
    if c0[2] > Vc[-8:].mean(axis=0)[2]:
        c0, c1 = Vc[-8:].mean(axis=0), Vc[-16:-8].mean(axis=0)
    tq = FT.unit(c1 - c0)
    pb = c0 - tq * 0.014                    # the plug's lower end (head_kit: the plug runs 6 mm +- 8 mm below the start)
    front = np.where(SP[:, 1] < -0.02)[0]
    i_p = int(front[np.argmin(np.abs(SP[front, 2] - (pb[2] - 0.009)))])
    O_s = SP[i_p] + SN[i_p] * STRAP_T
    al, ac, nn = ST[i_p], SB[i_p], SN[i_p]
    if al[2] < 0:
        al = -al
    ac = FT.unit(np.cross(nn, al)) * (1.0 if np.cross(nn, al) @ SB[i_p] > 0 else -1.0)
    # the PTT: 23 x 18 x 9 mm; its top carries the earpiece socket (inner) and the radio socket (outer), 7 mm apart
    hpx, hpy, hpz = 0.0115, 0.009, 0.0045
    a_ear = float((pb - O_s) @ ac)
    c_ptt = O_s + nn * (hpz + 0.0003) + ac * (a_ear - inner * 0.0035) + al * (float((pb - O_s) @ al) - hpy - 0.0032)
    AX = [ac, al, nn]
    r_ptt = pt.part('ptt', CH, item='ptt')
    nptt = pt.count('poly', 'rubber')
    fr = KC.Frame(c_ptt, ac, al)                      # the PTT built in its own frame (design record)
    AXl = [fr.v(ac), fr.v(al), fr.v(nn)]
    Vq, Fq, Eq = pt('poly')
    pt.pad('poly')
    rng = HC.rbox(Vq, Fq, fr.p(c_ptt), AXl, (hpx, hpy, hpz), 0.003, step=0.0015)
    Eq.extend(TC.rbox_edge(Vq, rng, fr.p(c_ptt), AXl, (hpx, hpy, hpz)))
    add('ptt', 'poly', rng)
    Vr, Fr, Er = pt('rubber')
    pt.pad('rubber')
    cpad = c_ptt + nn * (hpz + 0.0008)
    rng = HC.rbox(Vr, Fr, fr.p(cpad), AXl, (0.0075, 0.0058, 0.0011), 0.001, step=0.001)
    Er.extend(TC.rbox_edge(Vr, rng, fr.p(cpad), AXl, (0.0075, 0.0058, 0.0011)))
    top = c_ptt + al * hpy
    socks = {}
    for nm, sx in (('ear', inner * 0.0035), ('radio', -inner * 0.0035)):
        cb = top + ac * sx + al * 0.0016
        pt.pad('poly')
        rng = HC.rbox(Vq, Fq, fr.p(cb), AXl, (0.0032, 0.0018, 0.0032), 0.0011, step=0.001)
        Eq.extend(TC.rbox_edge(Vq, rng, fr.p(cb), AXl, (0.0032, 0.0018, 0.0032)))
        socks[nm] = cb + al * 0.0018
    # the clip: a moulded tongue from the PTT's back across the strap's top to its outer edge, a lip over that edge
    P_out = SP[i_p] - ac * inner * 0.0 + SB[i_p] * (-inner) * (0.5 * STRAP_W)
    span = float((P_out - c_ptt) @ ac)
    cc = c_ptt + ac * (span / 2 + np.sign(span) * 0.0008) - nn * (hpz - 0.0005)
    hc = (abs(span) / 2 + 0.0012, 0.0055, 0.0007)
    pt.pad('poly')
    rng = HC.rbox(Vq, Fq, fr.p(cc), AXl, hc, 0.0005, step=0.0012)
    Eq.extend(TC.rbox_edge(Vq, rng, fr.p(cc), AXl, hc))
    cl = c_ptt + ac * (span + np.sign(span) * 0.0016) - nn * (hpz + 0.0004)
    pt.pad('poly')
    rng = HC.rbox(Vq, Fq, fr.p(cl), AXl, (0.0008, 0.0055, 0.0024), 0.0005, step=0.001)
    Eq.extend(TC.rbox_edge(Vq, rng, fr.p(cl), AXl, (0.0008, 0.0055, 0.0024)))
    pt.place(nptt, fr)
    pt.tag_since(nptt, r_ptt)
    # step 07's earpiece cable ends on the PTT's earpiece socket: its plug and its last 4 cm (cable, plug, collar clip)
    # are carried onto the socket, the move easing out along the cable (head_kit.py routes it from the collar)
    d_seat = socks['ear'] - pb
    seat_mm = round(float(np.linalg.norm(d_seat)) * 1000, 2)
    rings = Vc.reshape(-1, 8, 3).mean(axis=1)
    if np.linalg.norm(rings[0] - c0) > np.linalg.norm(rings[-1] - c0):
        rings = rings[::-1]
    rs = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(rings, axis=0), axis=1))])
    for ob in (cab_ob, bpy.data.objects[f'{op}-head_kit-poly']):
        Mw = np.array(ob.matrix_world)
        Mi = np.linalg.inv(Mw[:3, :3])
        W = np.array([ob.matrix_world @ v.co for v in ob.data.vertices])
        near_ = np.linalg.norm(W - c0, axis=1) < 0.07
        for k in np.where(near_)[0]:
            j = int(np.argmin(np.linalg.norm(rings - W[k], axis=1)))
            w = 1.0 - float(np.clip(rs[j] / 0.04, 0, 1)) ** 2 * (3 - 2 * float(np.clip(rs[j] / 0.04, 0, 1)))
            if j == 0 and np.linalg.norm(W[k] - c0) < 0.02:
                w = 1.0
            W[k] = W[k] + d_seat * w
        ob.data.vertices.foreach_set('co', ((W - Mw[:3, 3]) @ Mi.T).ravel())
        ob.data.update()
    Vc2 = np.array([cab_ob.matrix_world @ v.co for v in cab_ob.data.vertices]).reshape(-1, 8, 3).mean(axis=1)
    meas['earpieceCable'] = {'seatMoveMm': seat_mm, 'lengthM': round(float(TC.path_length(Vc2)), 3)}
    meas['ptt'] = {'centre': [round(float(v), 4) for v in c_ptt], 'strapS': round(float(Ss[i_p]), 3),
                   'plugMovedToSocketMm': seat_mm,
                   'overInnerEdgeMm': round((abs(a_ear - inner * 0.0035) + hpx - 0.5 * STRAP_W) * 1000, 1)}

    # --- Radio in the back plate's recess -------------------------------------------------------------------------------
    rcu, rcv = RADIO_C
    rhx, rhy, rhz = RADIO_HALF
    dome = (lambda L: np.column_stack([L[:, 0], L[:, 1], L[:, 2] + RADIO_DOME * np.clip(L[:, 2] / rhz, 0, 1)
                                       * np.clip(1 - (L[:, 0] / rhx) ** 2, 0, 1) * np.clip(1 - (L[:, 1] / rhy) ** 2, 0, 1)]))
    # the recess floor (planar, armour.py): a plane fitted to the plate's back faces inside the recess; the radio's
    # frame Fr has h = 0 at the plate face's level (the floor is 4.7 mm under it), so the old heights carry over
    fl = []
    for x_ in np.linspace(rx0 + 0.006, rx1 - 0.006, 7):
        for z_ in np.linspace(rz0 + 0.006, rz1 - 0.006, 7):
            h_, _, _ = TC.ray(t_back, (x_, 0.6, z_), (0.0, -1.0, 0.0), 1.2)
            if h_ is not None:
                fl.append(np.array(h_))
    fl = np.array(fl)
    fc = fl.mean(axis=0)
    fn = np.linalg.svd(fl - fc)[2][2]
    fn = fn if fn[1] > 0 else -fn
    fA = FT.unit(np.array([1.0, 0.0, 0.0]) - fn * fn[0])
    fU = FT.unit(np.cross(fn, fA))
    p0, dr = np.array([rcu, 0.6, rcv]), np.array([0.0, -1.0, 0.0])
    O_r = p0 + dr * float(((fc - p0) @ fn) / (dr @ fn)) + fn * 0.0047
    Fr = KC.Flat(O_r, fA, fU, fn, rcu, rcv)
    meas['radioFloor'] = {'planeFitMaxMm': round(float(np.abs((fl - fc) @ fn).max()) * 1000, 2), 'frame': Fr.report()}
    r_rad = pt.part('radio', CH, item='radio')
    nrad = pt.count('poly', 'metal', 'rubber')
    _, r_ = KC.cbox(pt('poly'), Fr, rcu, rcv, RADIO_HALF, 0.0024, -0.0047 + 0.0003, 0.0, deform=dome)   # 2.4 mm round edges
    add('radio', 'poly', r_)
    fr = KC.Frame.of_flat(Fr, rcu + 0.016, rcv + 0.018, 2 * rhz - 0.0047 + 0.0003 + 0.0006)
    Vm, Fm, Em = pt('metal')
    pt.pad('metal')
    b0 = len(Vm)
    HC.knurl(Vm, Fm, np.array([0.0, 0.0, 0.0006]), np.array([0.0, 0.0, 1.0]), 0.0042, 0.0014, ridges=20, rings=3)  # 1.4 mm
    Em.extend([0.0] * (len(Vm) - len(Em)))
    pt.place({'metal': b0}, fr)
    add('radio', 'metal', (b0, len(Vm)))
    _, r_ = KC.cbox(pt('rubber'), Fr, rcu - 0.012, rcv + 0.018, (0.0045, 0.0028, 0.0006), 0.0005,
                    2 * rhz - 0.0047 + 0.0003, 0.0)
    add('radio', 'rubber', r_)
    # the top connector: a polymer boss on the radio's top end, a gunmetal collar, the cable's boot
    bx = 0.080
    Bc = KC.mpts(Fr, [(bx, rcv + rhy - 0.0058, 0.0028), (bx, rcv + rhy - 0.0016, 0.0028)])
    KC.tube(pt('poly'), Bc, 0.0024, sides=16, step=0.002)
    add('radio', 'poly', tube_last(pt, 'poly'))
    Bm = KC.mpts(Fr, [(bx, rcv + rhy - 0.0026, 0.0028), (bx, rcv + rhy - 0.0006, 0.0028)])
    KC.tube(pt('metal'), Bm, 0.0028, sides=16, step=0.002)
    add('radio', 'metal', tube_last(pt, 'metal'))
    pt.tag_since(nrad, r_rad)
    # the stub antenna along the plate's top edge, under armour.py's keeper (x 0.018, z 1.317)
    face_r = 2 * rhz - 0.0047
    a0 = KC.mpts(Mb, [(0.0365, rcv + rhy - 0.004, face_r + 0.0021), (0.0335, rcv + rhy + 0.0004, 0.0026),
                      (0.0285, 1.3169, 0.0023)])
    P0, P1 = KC.mpts(Mb, [(0.0275, 1.317, 0.0), (0.0055, 1.317, 0.0)])
    Np_ = FT.unit(KC.mpts(Mb, [(0.0165, 1.317, 0.001)])[0] - KC.mpts(Mb, [(0.0165, 1.317, 0.0)])[0])   # out of the face
    a1 = [P0 + (P1 - P0) * f + Np_ * 0.0023 for f in np.linspace(0.0, 1.0 - 0.0015 / 0.022, 12)]
    ant = FT.smooth_polyline(TC.resample(np.vstack([a0, a1]), 0.002), 2)
    Va, Fa, Ea = pt('poly')
    pt.pad('poly')
    b0 = len(Va)
    HC.taper(Va, Fa, ant[:6], 0.0028, 0.0021, sides=12)
    FT.tube(Va, Fa, ant[4:], 0.002, sides=12)
    Ea.extend([0.0] * (len(Va) - len(Ea)))
    add('antenna', 'poly', (b0, len(Va)))
    # the antenna's keeper: a moulded rubber bridge bonded on the plate face either side of the antenna, its arch 0.6 mm
    # over it (armour.py's own keeper sits inside the plate, 0.7 mm proud, under the antenna)
    kx = P0 + (P1 - P0) * ((0.0275 - ANT_KX) / 0.022)
    kxa = FT.unit(P1 - P0)
    kxa = FT.unit(kxa - Np_ * (kxa @ Np_))
    kua = FT.unit(np.cross(Np_, kxa))
    kc = kx + Np_ * (0.0003 + 0.0008)
    Vr, Fr, Er = pt('rubber')
    pt.pad('rubber')
    rk = HC.rbox(Vr, Fr, kc, [kua, kxa, Np_], (0.0085, 0.0035, 0.0008), 0.0006, step=0.0008,
                 deform=lambda L: np.column_stack([L[:, 0], L[:, 1], L[:, 2] + 0.0049 * 0.5 * (1.0 + np.cos(
                     math.pi * np.clip(L[:, 0] / 0.0062, -1.0, 1.0)))]))
    Er.extend(TC.rbox_edge(Vr, rk, kc, [kua, kxa, Np_], (0.0085, 0.0035, 0.0008)))
    add('antenna', 'rubber', rk)
    meas['radio'] = {'centre': list(RADIO_C), 'half': list(RADIO_HALF), 'wallClearMm': 1.8,
                     'proudOfPlateMm': round((2 * rhz - 0.0047 + RADIO_DOME) * 1000, 1), 'edgeRoundMm': 2.4,
                     'antennaM': round(TC.path_length(ant), 3), 'antennaUnderKeeperMm': 0.9, 'keeperX': ANT_KX}

    # --- The radio cable: connector -> plate face -> the strap's back tab -> along the strap -> the PTT ---------------
    q0 = Bm[-1] + FT.unit(Bm[-1] - Bm[0]) * 0.0004
    line = SP + SB * inner * (0.5 * STRAP_W - CAB_IN) + SN * (STRAP_T * 0.9 + CABLE_R + 0.0002)
    back = np.where(SP[:, 1] > 0.0)[0]
    i_b = int(back[np.argmin(np.abs(SP[back, 2] - 1.334))])
    # the run ends 8 mm past the front keeper (toward the PTT), so the cable is under every bridge
    i_t = int(np.searchsorted(Ss, min(keepS) - 0.008))
    run = line[i_t:i_b + 1][::-1]
    pre = KC.mpts(Mb, [(bx, rcv + rhy + 0.0075, 0.0026), (bx + 0.003, rcv + rhy + 0.011, CABLE_R + 0.0003),
                       (0.089, 1.329, CABLE_R + 0.0003)])
    q_end = socks['radio']
    tail = [run[-1] + (q_end + al * 0.006 - run[-1]) * 0.5, q_end + al * 0.006, q_end + al * 0.0002]
    path = np.vstack([[q0], pre, run[::2], tail])
    path = FT.smooth_polyline(TC.resample(path, 0.003), 2)
    path[0], path[-1] = q0, q_end + al * 0.0002
    Vk, Fk, Ek = pt('cable')
    pt.pad('cable')
    b0 = len(Vk)
    FT.tube(Vk, Fk, path, CABLE_R, sides=8)
    HC.taper(Vk, Fk, path[:4], 0.0026, CABLE_R + 0.0002, sides=10)            # strain-relief boots
    HC.taper(Vk, Fk, path[-4:], CABLE_R + 0.0002, 0.0026, sides=10)
    Ek.extend([0.0] * (len(Vk) - len(Ek)))
    add('radioCable', 'cable', (b0, len(Vk)))
    sc_ = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    L = float(sc_[-1])
    ret = []
    for sk in sorted(keepS, reverse=True):          # from the radio end: the back keeper first
        i = int(np.searchsorted(Ss, sk))
        kp = SP[i] + SB[i] * inner * (0.5 * STRAP_W - CAB_IN)
        j = int(np.argmin(np.linalg.norm(path - kp, axis=1)))
        ret.append({'at': round(float(sc_[j]), 3), 'by': f'keeper bridge, strap {sk:.2f} m from the front buckle',
                    'offsetMm': round(float(np.linalg.norm(path[j] - kp)) * 1000, 1)})
    spans = np.diff([0.0] + [r['at'] for r in ret] + [L])
    hood = [bpy.data.objects.get(f'{op}-headwear-{n}') for n in ('hood', 'hem')]
    HV = np.vstack([TC.mesh_world(o, dg)[0] for o in hood if o is not None])
    HV = HV[HV[:, 2] < 1.5]
    meas['radioCable'] = {'lengthM': round(L, 3), 'retention': ret, 'maxFreeSpanM': round(float(spans.max()), 3),
                          'hoodClearM': round(float(min(np.min(np.linalg.norm(HV - q, axis=1)) for q in path[::4]))
                                              - CABLE_R, 4)}

    # --- Measurements: standoff off the body, the back lane, the PTT --------------------------------------------------
    so = {}
    for name in reg:
        if name.endswith('Mag') or name.endswith('Tab'):
            continue
        so[name] = KC.standoff(KC.reg_verts(pt, reg, [name, name + 'Mag', name + 'Tab']), suit_tree)
    meas['standoffFromSuitM'] = so
    meas['backLane'] = KC.lane_report(pt, reg, {'radio', 'antenna', 'radioCable'})
    # the gadget slot (soft, on the chest plate) rides the chest bone with its tab (D28)
    r_gs = pt.part('gadgetSlotCarrier', CH, 'carrier', item='gadgetSlot')
    for k_, a_, b_ in reg.get('gadgetSlot', []):
        if not any(pt.rid.get(k_, [0] * b_)[a_:b_]):
            pt.tag(k_, (a_, b_), r_gs)
    meas['rigid'] = pt.report()
    objs = KC.write_objects(scene, op, 'chest_rig', pt, mats)
    return {'shell': KC.shell_of(pt), 'objects': list(objs.values()), 'kits': KITS, 'measurements': meas,
            'report': {'parts': {k: len(v[1]) for k, v in pt.d.items()}}}


def tube_last(pt, key):
    return KC.tube.last
