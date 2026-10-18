"""Wren's battle belt (step 08; SPEC 3.2 Belts and 5.1 Belt, ART-DIRECTION 3 Harness). Built by py/build_fitted.py
(DECISIONS A32): a tensioned two-layer band laid on the trousers' waistband and belt loops by rays; the trousers are
pressed in under it (torso_common.compress, A33).

- Inner belt: 38 mm, hook-and-loop face out, round the waist over the belt loops.
- Outer belt: 44 mm, slim padded Cordura with a laser-cut laminate face (one row of slots on the 38 mm pitch), bound
  edges, stitched; hook-and-loop to the inner belt. Its ends wrap the bars of a two-part metal quick-release buckle at
  the front (our own shape: a female frame with a sprung latch lever, a male tongue; low profile).
- On the belt: three grenade pouches front left (flap and a quiet snap, the flap's drop clears the hip), a double
  pistol magazine pouch front right (shock-cord loops, pull tabs), a rolled dump pouch rear right (two elastic bands),
  a horizontal knife sheath at the rear centre (nylon over a polymer insert, the knife's rubber grip to the right hand,
  a snap strap) on two belt straps. The drop-leg hanger (right side) comes with the holster in step 09.
"""
import math

import bpy
import numpy as np

import fitted as FT
import head_common as HC
import torso_common as TC
from carrier import Parts, Pouch, ring_frame, _recalc, _merge
from torso_common import Z

KIT = 'belt'
KITS = ['grenadePouches', 'pistolMagPouch', 'dumpPouch', 'knifeSheath']
METHOD = 'a tensioned two-layer band laid on the trousers by rays; the trousers pressed in under it (no simulation)'
IN_T, OUT_T, LAM = 0.0024, 0.0055, 0.0012
Z0, Z1 = 0.953, 0.997            # outer belt edges
ZC = 0.5 * (Z0 + Z1)


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    tro = bpy.data.objects[f'{op}-trousers-hero']
    Vt, Ft = TC.mesh_world(tro, dg)
    keep = [f for f in Ft if all(abs(Vt[i, 0]) < 0.25 and 0.8 < Vt[i, 2] < 1.08 for i in f)]
    loops = [o for o in bpy.data.objects if o.name.startswith('beltLoop') and o.type == 'MESH']
    waist = TC.bvh(Vt, keep)
    loop_tree = TC.bvh(*_merge([TC.mesh_world(o, dg) for o in loops])) if loops else None
    shirt = bpy.data.objects[f'{op}-combat_shirt-hero']
    under = TC.bvh(*TC.mesh_world(shirt, dg))
    pt = Parts()
    stV, stF = [], []
    nst = 0
    meas = {}
    shV, shF = [], []

    axis_y = -0.026
    zs = np.arange(Z0, Z1 + 1e-6, 0.002)
    th = np.radians(np.arange(-180.0, 180.0, 0.75))
    ring = TC.Ring(waist, under, axis_y, zs, th, cap=0.002)
    meas['ringMisses'] = ring.misses
    meas['ringOutlierRays'] = ring.outliers
    G, Nn = ring.G.copy(), ring.Nn
    R_, C_ = G.shape[:2]
    # the belt loops are firm: the inner belt rides over them (lifted where a loop stands above the pressed waistband,
    # the lift eased along the row so it bridges each loop like a real belt)
    if loop_tree is not None:
        lift = np.zeros((R_, C_))
        for i in range(R_):
            for j in range(C_):
                h, _, t = TC.ray(loop_tree, G[i, j] + Nn[i, j] * 0.02, -Nn[i, j], 0.03)
                if h is not None:
                    lift[i, j] = max(0.0, 0.0203 - t)
        lift = np.max(lift[2:-2], axis=0)                 # the band's face, not the loops' top folds
        lift = np.maximum.reduce([np.roll(lift, k) for k in range(-6, 7)])
        kern = np.exp(-0.5 * (np.arange(-14, 15) / 6.0) ** 2)
        kern /= kern.sum()
        lift = np.maximum(lift * 0.0, np.convolve(np.concatenate([lift[-14:], lift, lift[:14]]), kern, 'same')[14:-14])
        lift = lift[None, :].repeat(R_, axis=0)
        G = G + Nn * lift[..., None]
        ring.G = G                   # every part placed on the belt sits on the lifted band
        meas_lift = round(float(lift.max()) * 1000, 2)
    else:
        meas_lift = 0.0
    mid = G[R_ // 2]
    arc = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(np.vstack([mid, mid[:1]]), axis=0), axis=1))])
    meas['beltCircumferenceM'] = round(float(arc[-1]), 3)
    meas['loopLiftMaxMm'] = meas_lift
    j_front = int(np.argmin(np.abs(th + math.pi / 2)))

    def theta_at(s):
        """The angle s metres along the belt from the front centre (positive: toward the wearer's left)."""
        a0 = arc[j_front]
        tgt = (a0 + s) % arc[-1]
        j = int(np.argmin(np.abs(arc[:-1] - tgt)))
        return float(th[j])

    # --- Inner belt (hook-and-loop face out) all round, the outer belt with its ends at the buckle ------------------
    inner_rows = np.where((zs > Z0 + 0.0025) & (zs < Z1 - 0.0025))[0]
    V, F, _ = pt('inner')
    pt.edge('inner')
    TC.band_slab(V, F, G[inner_rows], Nn[inner_rows], IN_T)
    pt.edge('inner')
    gap = 0.026                                  # the outer belt's ends: under the buckle's bars
    t_l, t_r = theta_at(gap), theta_at(-gap)
    js = np.concatenate([np.where(th >= t_l)[0], np.where(th <= t_r)[0]])
    Gb, Nb = G[:, js] + Nn[:, js] * (IN_T + 0.0002), Nn[:, js]
    V, F, _ = pt('outer')
    pt.edge('outer')
    Gout = TC.band_slab(V, F, Gb, Nb, OUT_T)
    pt.edge('outer')
    b0 = len(shV)
    sub = Gout[::3, ::4]
    shV.extend(list(sub.reshape(-1, 3)))
    r2, c2 = sub.shape[:2]
    shF.extend([(b0 + i * c2 + j, b0 + i * c2 + j + 1, b0 + (i + 1) * c2 + j + 1, b0 + (i + 1) * c2 + j)
                for i in range(r2 - 1) for j in range(c2 - 1)])
    for ii in (1, len(zs) - 2):
        nst += FT.stitch_row(stV, stF, Gout[ii] + Nb[ii] * 0.0001, Nb[ii])
    for ii in (0, len(zs) - 1):                 # bound top and bottom edges
        Vb, Fb, _ = pt('bind')
        FT.tube(Vb, Fb, Gb[ii] + Nb[ii] * (OUT_T * 0.5), OUT_T * 0.5 + 0.0006, sides=8, caps=True)
        pt.edge('bind')
    # laminate face: one row of slots along the middle
    rows = np.arange(2, len(zs) - 2)
    GL = Gout[rows][:, 2:-2] + Nb[rows][:, 2:-2] * LAM
    NL = Nb[rows][:, 2:-2]
    s_c = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(GL[len(rows) // 2], axis=0), axis=1))])
    cx = np.tile((s_c[:-1] + s_c[1:]) / 2, (len(rows) - 1, 1))
    cy = np.tile(((zs[rows][:-1] + zs[rows][1:]) / 2)[:, None], (1, len(s_c) - 1))
    cx = cx - cx.mean()
    solid = ~TC.slot_mask(cx, cy - ZC, [0.0], slot_w=0.03, slot_h=0.0062, x_lim=float(cx.max()) - 0.005)
    V, F, _ = pt('lam')
    TC.perforated(V, F, GL, NL, solid, LAM + 0.0004)
    pt.edge('lam')
    meas['outerBeltEndsDeg'] = [round(math.degrees(t_l), 1), round(math.degrees(t_r), 1)]
    h_face = IN_T + 0.0002 + OUT_T + LAM + 0.0003

    # --- Buckle: two-part metal quick release, sprung latch (our own shape) ----------------------------------------
    O, Xp, Up, Np = ring_frame(ring, th[j_front], ZC, IN_T + 0.0004)
    V, F, _ = pt('metal')
    HC.rbox(V, F, O + Xp * 0.012 + Np * 0.004, [Xp, Up, Np], (0.0175, 0.0225, 0.0036), 0.003, step=0.0025)   # female
    HC.rbox(V, F, O - Xp * 0.0175 + Np * 0.0035, [Xp, Up, Np], (0.0125, 0.0205, 0.003), 0.0028, step=0.0025)  # male
    HC.rbox(V, F, O - Xp * 0.003 + Np * 0.0042, [Xp, Up, Np], (0.0065, 0.0145, 0.0022), 0.0012, step=0.002)  # tongue
    lc = O + Xp * 0.0125 + Np * 0.0083
    HC.rbox(V, F, lc, [Xp, Up, Np], (0.0105, 0.016, 0.0013), 0.0011, step=0.002)                               # latch
    for k in range(4):
        HC.rbox(V, F, lc + Up * (-0.009 + k * 0.006) + Np * 0.0014, [Xp, Up, Np], (0.0085, 0.0008, 0.0005), 0.0004,
                step=0.002)
    for sx, xx in ((1, 0.029), (-1, -0.029)):     # the bars the belt ends wrap, and the wraps
        HC.rbox(V, F, O + Xp * xx + Np * 0.0047, [Up, Xp, Np], (0.019, 0.0018, 0.0016), 0.0012, step=0.002)
    pt.edge('metal')
    meas['buckleZ'] = round(float(O[2]), 4)

    # --- Grenade pouches (front left), flap and a quiet snap ---------------------------------------------------------
    Vpo, Fpo, _ = pt('pouch')
    tro_tree = waist

    def hang(t, w, hgt, d, top_above, extra_tip=0.002):
        O, Xp, Up, Np = ring_frame(ring, t, Z1, h_face)
        top = top_above
        # tip the bottom out until the back clears the hip below the belt
        need = 0.0
        for xx in np.linspace(-w / 2, w / 2, 5):
            for dy in np.linspace(0.02, hgt, 6):
                p = O + Xp * xx + Up * (top - dy)
                h, _, tt = TC.ray(tro_tree, p + Np * 0.06, -Np, 0.12)
                if h is not None:
                    pen = 0.06 - tt + 0.002
                    if pen > 0:
                        need = max(need, pen * hgt / dy)
        return O, Xp, Up, Np, need + extra_tip

    gren = []
    for k, s in enumerate((0.07, 0.135, 0.20)):
        t = theta_at(s)
        O, Xp, Up, Np, tip = hang(t, 0.06, 0.1, 0.042, 0.006)
        p = Pouch(O, Xp, Up, Np, 0.06, 0.1, 0.042, top=0.006, r=0.007, bulge=0.004, tip=tip)
        pt.edge('pouch')
        pt.edge('pouch', p.build(Vpo, Fpo))
        gren.append(round(tip * 1000, 1))
        # flap over the top and 42 mm down the front
        fl_top = p.map([(0.0, 0.0015, p.d / 2)])[0]
        V, F, _ = pt('flapc')
        pt.edge('flapc')
        HC.rbox(V, F, fl_top, [Xp, Up, Np], (0.0315, 0.0018, p.d / 2 + 0.002), 0.0016, step=0.003)
        fc = p.map([(0.0, -0.021, p.d + 0.0022)])[0]
        HC.rbox(V, F, fc, [Xp, Up, Np], (0.0315, 0.0225, 0.0018), 0.0016, step=0.003)
        pt.edge('flapc')
        sn = p.map([(0.0, -0.035, p.d + 0.004)])[0]
        Vm, Fm_, _ = pt('metal')
        HC.taper(Vm, Fm_, [sn - Np * 0.0005, sn + Np * 0.0022], 0.0058, 0.0048, sides=16)
        pt.edge('metal')
        for sx in (-1, 1):
            ln = p.map([(sx * 0.027, -y_, p.d + 0.0002) for y_ in np.linspace(0.045, 0.094, 12)])
            nst += FT.stitch_row(stV, stF, ln, np.tile(Np, (len(ln), 1)))
    meas['grenadeTipMm'] = gren

    # --- Pistol magazine pouch (front right, two magazines) ----------------------------------------------------------
    t = theta_at(-0.07)
    O, Xp, Up, Np, tip = hang(t, 0.074, 0.088, 0.026, 0.008)
    p = Pouch(O, Xp, Up, Np, 0.074, 0.088, 0.026, top=0.008, r=0.006, bulge=0.0025, tip=tip)
    pt.edge('pouch')
    pt.edge('pouch', p.build(Vpo, Fpo))
    meas['pistolMagTipMm'] = round(tip * 1000, 1)
    Vg, Fg, _ = pt('mag')
    for mx in (-0.018, 0.018):
        mc = p.map([(mx, 0.024 - 0.035, p.d / 2)])[0]
        HC.rbox(Vg, Fg, mc, [Xp, Up, Np], (0.0145, 0.035, 0.0105), 0.003, step=0.003)
        HC.rbox(Vg, Fg, p.map([(mx, 0.025, p.d / 2)])[0], [Xp, Up, Np], (0.009, 0.002, 0.007), 0.0012, step=0.0015)
        cord = p.map([(mx - 0.016, -0.004, 0.005), (mx - 0.014, 0.016, p.d / 2), (mx, 0.0285, p.d / 2),
                      (mx + 0.014, 0.016, p.d / 2), (mx + 0.016, -0.004, 0.005)])
        Vc, Fc, _ = pt('cord')
        FT.tube(Vc, Fc, FT.smooth_polyline(TC.resample(cord, 0.003), 2), 0.0014, sides=8)
        pt.edge('cord')
        Vw, Fw, _ = pt('web')
        HC.rbox(Vw, Fw, p.map([(mx, 0.018, p.d / 2 + 0.0118)])[0], [Xp, Up, Np], (0.0065, 0.009, 0.0008), 0.0006,
                step=0.002)
        pt.edge('web')
    pt.edge('mag')

    # --- Dump pouch (rear right): rolled, two elastic bands ----------------------------------------------------------
    t = math.radians(128.0)
    O, Xp, Up, Np = ring_frame(ring, t, Z0, h_face)
    rr, ln = 0.021, 0.125
    cc = O + Np * (rr + 0.001) - Up * (rr - 0.004)
    V, F, _ = pt('roll')
    pt.edge('roll')
    FT.tube(V, F, TC.resample(np.array([cc - Xp * ln / 2, cc + Xp * ln / 2]), 0.004), rr, sides=28)
    en = Np * math.cos(-0.5) + Up * math.sin(-0.5)          # the rolled flap's edge, lying on the roll's lower front
    HC.rbox(V, F, cc + en * (rr + 0.0004), [Xp, FT.unit(np.cross(en, Xp)), en], (ln / 2 - 0.004, 0.003, 0.0007), 0.0005,
            step=0.004)
    pt.edge('roll')
    Ve, Fe, _ = pt('elastic')
    for sx in (-0.035, 0.035):
        ring_pts = [cc + Xp * sx + rr * 1.06 * (math.cos(a) * Np + math.sin(a) * Up) for a in
                    np.linspace(0, 2 * math.pi, 29)[:-1]]
        FT.tube(Ve, Fe, np.array(ring_pts), 0.0018, sides=6, closed=True)
    pt.edge('elastic')
    Vw, Fw, _ = pt('web')
    HC.rbox(Vw, Fw, O + Np * 0.0012 - Up * 0.004, [Xp, Up, Np], (0.012, 0.016, 0.0009), 0.0006, step=0.002)
    pt.edge('web')
    meas['dumpPouchZ'] = round(float(cc[2]), 4)

    # --- Knife sheath (rear centre, horizontal): along the belt, the grip to the right ------------------------------
    zk = ZC - 0.005
    ts = [theta_at(s) for s in np.linspace(arc[-1] / 2 - 0.105, arc[-1] / 2 + 0.11, 72)]
    ts = np.unwrap(ts)
    hk = h_face + 0.0003
    fr = [ring_frame(ring, tt, zk, hk) for tt in ts]
    Ls = np.linspace(0.0, 0.215, len(ts))         # 0 = tip (wearer's left), the grip at the right end
    sheath, grip = Ls < 0.13, Ls >= 0.137

    def loft(key, mask, half_h, half_t, rnd=0.6):
        Vq, Fq, _ = pt(key)
        pt.edge(key)
        base = len(Vq)
        idx = np.where(mask)[0]
        m = 20
        ex = 2.0 / max(rnd, 0.05)
        for i in idx:
            O_, Xp_, Up_, Np_ = fr[i]
            hh, ht = half_h(Ls[i]), half_t(Ls[i])
            c = O_ + Np_ * ht
            for k in range(m):
                a = 2 * math.pi * k / m
                ca, sa = math.cos(a), math.sin(a)
                Vq.append(c + Up_ * hh * np.sign(sa) * abs(sa) ** (2 / ex) + Np_ * ht * np.sign(ca) * abs(ca) ** (2 / ex))
        n = len(idx)
        for i in range(n - 1):
            for k in range(m):
                k2 = (k + 1) % m
                Fq.append((base + i * m + k, base + (i + 1) * m + k, base + (i + 1) * m + k2, base + i * m + k2))
        Fq.append(tuple(base + k for k in range(m))[::-1])
        Fq.append(tuple(base + (n - 1) * m + k for k in range(m)))
        pt.edge(key)
    loft('sheath', sheath, lambda L: 0.008 + 0.009 * min(1.0, L / 0.06), lambda L: 0.0062, rnd=0.45)
    loft('rubber', grip, lambda L: 0.0105 - 0.002 * math.sin(min(1.0, (L - 0.137) / 0.078) * math.pi) ** 2,
         lambda L: 0.0098, rnd=0.8)
    ig = int(np.searchsorted(Ls, 0.133))
    O_, Xp_, Up_, Np_ = fr[ig]
    V, F, _ = pt('poly')
    HC.rbox(V, F, O_ + Np_ * 0.0098, [Xp_, Up_, Np_], (0.003, 0.0145, 0.0105), 0.0015, step=0.0015)   # guard
    ip_ = len(Ls) - 1
    O_, Xp_, Up_, Np_ = fr[ip_]
    HC.rbox(V, F, O_ + Np_ * 0.0098 + Xp_ * 0.002, [Xp_, Up_, Np_], (0.003, 0.0098, 0.0092), 0.0028, step=0.0015)
    pt.edge('poly')
    # snap strap over the grip by the guard; two belt straps behind the sheath, wrapped over the belt's top edge
    is_ = int(np.searchsorted(Ls, 0.15))
    O_, Xp_, Up_, Np_ = fr[is_]
    strap = [O_ + Up_ * (-0.012) + Np_ * 0.002, O_ + Up_ * (-0.008) + Np_ * 0.0185, O_ + Np_ * 0.0215,
             O_ + Up_ * 0.008 + Np_ * 0.0185, O_ + Up_ * 0.012 + Np_ * 0.002]
    strap = FT.smooth_polyline(TC.resample(np.array(strap), 0.002), 2)
    rad = strap - (O_ + Np_ * 0.0098)          # out from the grip's axis
    Nq = FT.unit(rad - np.outer(rad @ Xp_, Xp_))
    Vw, Fw, _ = pt('web')
    FT.strip(Vw, Fw, strap, Nq, np.tile(Xp_, (len(strap), 1)), 0.016, 0.0014)
    pt.edge('web')
    Vm, Fm_, _ = pt('metal')
    HC.taper(Vm, Fm_, [O_ + Up_ * 0.004 + Np_ * 0.0205, O_ + Up_ * 0.004 + Np_ * 0.0235], 0.0052, 0.0044, sides=16)
    pt.edge('metal')
    for Lq in (0.03, 0.105):
        i = int(np.searchsorted(Ls, Lq))
        tt = ts[i]
        pts = []
        for zz, hh in ((Z1 + 0.0035, h_face - OUT_T * 0.5), (Z1 + 0.002, h_face + 0.0004), (Z1 - 0.004, h_face + 0.0004),
                       (zk + 0.004, h_face + 0.0004)):
            q, _ = ring.at(tt, min(zz, Z1), hh)
            pts.append(q + Z * max(0.0, zz - Z1))
        pts = TC.resample(np.array(pts), 0.002)
        Tq = TC.tangents(pts)
        Nq = np.array([ring.at(tt, min(q[2], Z1))[1] for q in pts])
        Nq = FT.unit(Nq - Tq * (Nq * Tq).sum(1)[:, None])
        Bq = FT.unit(np.cross(Nq, Tq))
        FT.strip(Vw, Fw, pts, Nq, Bq, 0.02, 0.0014)
        pt.edge('web')
    meas['knifeSheathM'] = round(float(Ls[-1]), 3)

    # --- The trousers pressed in under the belt -------------------------------------------------------------------
    pres = [(G[inner_rows].reshape(-1, 3), [(i * C_ + j, i * C_ + j + 1, (i + 1) * C_ + j + 1, (i + 1) * C_ + j)
                                            for i in range(len(inner_rows) - 1) for j in range(C_ - 1)])]
    follow = [tro] + [o for o in [bpy.data.objects.get(f'{op}-trousers-stitches')] + loops if o is not None]
    allP = pres[0][0]
    meas['trouserPress'] = TC.compress(follow, [TC.bvh(*pres[0])], under, cap=0.002,
                                       region=(allP.min(axis=0), allP.max(axis=0)))

    # --- Objects -------------------------------------------------------------------------------------------------------
    cord_m = bpy.data.materials.get('shock cord') or MAT.rubber('shock cord', rough=0.8)
    poly = reuse(MAT.polymer, 'kit polymer', colour=(0.023, 0.023, 0.024), rough=0.68)
    mats = {
        'inner': reuse(MAT.loop, 'loop'), 'outer': reuse(MAT.cordura, 'cordura'), 'pouch': reuse(MAT.cordura, 'cordura'),
        'flapc': reuse(MAT.cordura, 'cordura'), 'roll': reuse(MAT.cordura, 'cordura'),
        'lam': reuse(MAT.laminate, 'laser-cut laminate'), 'bind': reuse(MAT.webbing, 'binding'),
        'web': reuse(MAT.webbing, 'harness webbing', colour=(0.023, 0.024, 0.024)),
        'elastic': reuse(MAT.elastic, 'cummerbund elastic'), 'poly': poly, 'mag': poly, 'sheath': poly,
        'metal': reuse(MAT.painted_metal, 'hardware metal'), 'cord': cord_m,
        'rubber': reuse(MAT.rubber, 'cable jacket', colour=(0.022, 0.022, 0.023), rough=0.72),
    }
    objs = []
    for key, (V, F, E) in pt.d.items():
        if not F:
            continue
        pt.edge(key)
        ob = FT.add_mesh(scene, f'{op}-belt-{key}', V, F, mats[key], smooth=True, uv=TC.box_uv(V, F),
                         attrs={'edge': np.asarray(E[:len(V)], float), 'wear': np.zeros(len(V))})
        if key != 'lam':         # the laminate is an open sheet built facing out (TC.perforated)
            _recalc(ob)
        else:                    # smooth face, crisp slot walls (flat facets on a curve read as a plaid of shading)
            ob.data.shade_smooth()
            ob.data.set_sharp_from_angle(angle=math.radians(45.0))
        objs.append(ob)
    st = FT.add_mesh(scene, f'{op}-belt-stitches', stV, stF, reuse(MAT.thread, 'thread'))
    st.visible_shadow = False
    objs.append(st)
    return {
        'shell': (np.array(shV), shF),
        'objects': objs,
        'kits': KITS,
        'measurements': meas,
        'report': {'stitches': nst, 'parts': {k: len(v[1]) for k, v in pt.d.items()}},
    }
