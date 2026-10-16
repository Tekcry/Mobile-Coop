"""Wren's head kit (step 07; SPEC 3.3 and 5.1 Head, ART-DIRECTION 1, 3, 4, D13, D19 and D20). Built by
py/build_fitted.py (DECISIONS A24): hard parts and webbing laid on the hood and balaclava surfaces (headwear.py), not
simulated.

- Head harness (D20, the options pass's strap 2): a hard polymer brow plate on the forehead and a hard, sculpted rear
  battery pod on the occiput (no soft cradle). Two 18 mm crown straps fork from the plate's top over the crown to the
  pod's upper corners; two 20 mm side straps above the ears (plate to pod) set by low-profile cam buckles, tails doubled
  back; bar tacks and box stitching where the webbing meets the plate and the pod. A chin strap from a D-ring on each
  side strap cups under the chin, side-release buckle on the left. The straps lie in the planes the hood is dented
  along (head_common.straps).
- Goggle (D20: the original step 07 housing): one square shroud over two optics (never three; no real product shape),
  a nose notch, the shroud lip round both objectives, coated lenses that glow green (D13, head_common.lens_assembly),
  rubber eyecups, the mode switch and a tiny muted amber status light. No flip mount (D19): the goggle hangs on a wide
  elastic band through a lug on each side of the housing, round the back of the head over the harness and the pod
  (A29). Two worn positions: in use (built, exported) over the eyes with the eyecups sealing on the eye port; stowed,
  slid up onto the brow over the hood. The stowed pose is a rigid transform stored on the goggle parts ('stowM'); the
  band and its cable are built for both positions ('goggle_pos'), the stowed set hidden (not exported, not checked).
- Goggle band (fix round 3): a relaxed elastic strip on the hood, hem and harness (it presses into the soft hood, which
  is dented under it), through the channel under the pod; each end wraps the lug's bar and returns under the band,
  bar-tacked. Its stitches are per pose ('band_st', 'band_s_st').
- Goggle cable: from the pod's outlet boss along the band's outer face under webbing keepers; 26 mm before the left lug
  it leaves the band over its top edge into a plug on the housing's side, strain relief boots at both ends.
- Comms: the earpiece in the left ear (under the balaclava), its slim boom mic along the left cheek under the hood
  edge to the mouth (foam windscreen); the earpiece cable from a plug at the left collarbone (the PTT arrives in step
  09) up to a clip on the shirt collar, under the hood skirt and the balaclava edge.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

import fitted as FT
import head_common as HC

KIT = 'headHarness'
PLUG_X = 0.085                  # the earpiece plug's x at the collarbone (step 09: on the PTT)
KITS = ['crownStrap', 'sideStraps', 'chinStrap', 'goggleBand', 'goggle', 'batteryPack', 'goggleCable', 'earpiece',
        'earpieceCable']
METHOD = 'hard parts and webbing laid on the hood and balaclava surfaces by rays (no simulation)'
WEB_T = 0.0016           # webbing thickness
BAND_W, BAND_T = 0.022, 0.0018   # the goggle band: wide elastic webbing (A29)
CUP_L = 0.014            # eyecup length (face to housing back)
H_HALF = (0.05, 0.023, 0.024)   # housing half sizes: width, depth, height
STOW_DEG = 16.0          # stowed: the goggle tips back with the brow
STOW_DZ = 0.046          # stowed: housing centre above the eye line
KEEPERS = 3              # webbing keepers holding the cable on the band
CABLE_R = 0.0013         # the goggle cable: a slim 2.6 mm cord seated on the band (fix round 2, item 1)
BAND_DENT = 0.0012       # the hood compressed round the band (the dent along its edges)
BAND_SINK = 0.0008       # fix round 3, item 1: the band's underside presses this far into the soft hood
BAND_BRIDGE = 0.002      # the most the band's centre stands off the hood over a hollow (it pulls the fabric in)
LUG_W = 0.0195           # the band gathered to fit the lug's slot (20.6 mm clear)
RET_L = 0.022            # each band end: wrapped round the lug's bar and returned under the band, bar-tacked


class Parts:
    def __init__(self):
        self.d = {}

    def __call__(self, k):
        if k not in self.d:
            self.d[k] = ([], [], [])     # V, F, emit
        return self.d[k]


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    fr = HC.head_frame(skin)
    S = HC.straps(fr)
    c, eye_z = fr['c'], fr['eye_z']
    X = np.array([1.0, 0.0, 0.0])
    Y = np.array([0.0, 1.0, 0.0])
    Z = np.array([0.0, 0.0, 1.0])

    def mesh_of(name):
        ob = bpy.data.objects[name]
        V = np.array([(ob.matrix_world @ v.co)[:] for v in ob.data.vertices])
        return V, [tuple(p.vertices) for p in ob.data.polygons]
    Vh, Fh = mesh_of(f'{op}-headwear-hood')
    Vb, Fb = mesh_of(f'{op}-headwear-balaclava')
    tree_u = HC.bvh(np.vstack([Vh, Vb]), Fh + [tuple(i + len(Vh) for i in f) for f in Fb])
    bal_tree = HC.bvh(Vb, Fb)
    layers = {u: (V, Fl) for u, V, Fl in ctx['layers']}
    collar = 'suit' if 'suit' in layers else 'combat_shirt'      # the collar layer (step 08a: the suit, A37)
    sh_tree = FT.bvh_outward(*layers[collar], skin) if collar in layers else None
    pt = Parts()
    stV, stF = [], []
    nst = 0
    meas = {'eyeZ': round(eye_z, 4), 'podZ': round(S['cradle']['z'], 4), 'topZ': round(fr['top'], 4)}

    # --- Harness straps (D20: split crown, side straps with cam buckles, chin strap) ----------------------------------
    spans = HC.strap_spans(tree_u, S)
    for nm in ('forkL', 'forkR', 'sideL', 'sideR', 'chin'):
        P, N = spans[nm]
        if nm != 'chin' and P[0][1] > P[-1][1]:
            P, N = P[::-1].copy(), N[::-1].copy()        # index 0 at the front
        if nm == 'chin' and P[0][0] < P[-1][0]:
            P, N = P[::-1].copy(), N[::-1].copy()        # index 0 on the left (+x)
        spans[nm] = (P, N)
        w = {'chin': 0.018, 'forkL': 0.018, 'forkR': 0.018}.get(nm, 0.02)
        V, F, _ = pt('web')
        T, B = HC.strap_mesh(V, F, P, N, w, WEB_T)
        meas[f'{nm}StrapM'] = round(HC.path_length(P), 3)
        for s_ in (-0.5, 0.5):   # edge stitching along the first and last 25 mm (sewn to the plate, the pod, D-rings)
            for sl in (slice(0, 7), slice(len(P) - 7, len(P))):
                q = P[sl] + B[sl] * s_ * (w - 0.003) + N[sl] * (WEB_T + 0.0003)
                nst += FT.stitch_row(stV, stF, q, N[sl])
        if nm != 'chin':         # bar tacks across the webbing 30 mm from each anchor
            for Lq in (0.03, HC.path_length(P) - 0.03):
                i = HC.at_length(P, Lq)
                HC.rbox(stV, stF, P[i] + N[i] * (WEB_T + 0.0004), [T[i], B[i], N[i]], (0.0018, 0.5 * w - 0.0028, 0.0005),
                        0.0003, step=0.0012)
                nst += 1
    # cam buckles on the side straps, about 50 mm behind the plate, and the doubled-back tails: placed after the goggle
    # band (below), clear of both its runs
    # chin strap: D-rings on the side straps, side-release buckle on the left
    P, N = spans['chin']
    T = HC.tangents(P)
    B = FT.unit(np.cross(N, T))
    V, F, _ = pt('metal')
    for i in (0, len(P) - 1):
        q = P[i] + N[i] * (WEB_T + 0.0012)
        ring = [q + B[i] * u_ * 0.011 + T[i] * v_ * 0.004 for u_, v_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        ring = HC.resample(FT.smooth_polyline(np.array(ring + ring[:1]), 0), np.tile(N[i], (5, 1)), 0.003)[0]
        FT.tube(V, F, ring, 0.0011, sides=6, closed=True)
    k0 = int(np.argmin(np.abs(P[:, 0])))
    meas['chinStrapBehindChinM'] = round(float(P[k0, 1] - fr['chin_pt'][1]), 4)
    meas['chinStrapBelowChinM'] = round(float(fr['chin_pt'][2] - P[k0, 2]), 4)
    meas['chinPointM'] = [round(float(v), 4) for v in fr['chin_pt']]
    meas['underChinM'] = [round(float(v), 4) for v in fr['under_chin']]
    # the buckle low on the left riser, at the jaw (fix round 3: at 55 mm it sat at cheekbone height under the goggle
    # band, which rode over it and stood 7.5 mm off the hood beside it)
    low = np.where(P[:, 2] < eye_z - 0.05)[0]
    ib = int(low[0]) if len(low) else HC.at_length(P, 0.055)
    meas['chinBuckleZM'] = round(float(P[ib, 2] - eye_z), 4)
    V, F, _ = pt('poly')
    HC.rbox(V, F, P[ib] + N[ib] * (WEB_T + 0.0033) + T[ib] * 0.006, [T[ib], B[ib], N[ib]], (0.012, 0.0105, 0.0034),
            0.002, step=0.0015)
    HC.rbox(V, F, P[ib] + N[ib] * (WEB_T + 0.0028) - T[ib] * 0.011, [T[ib], B[ib], N[ib]], (0.0065, 0.0085, 0.0026),
            0.0015, step=0.0012)

    # --- Hard brow plate and the rear pod's shell ----------------------------------------------------------------------
    pf, nf = HC.ray_in(tree_u, (0.0, c[1], S['plate']['z']), (0.0, -1.0, 0.0))
    V, F, _ = pt('poly')
    top_p, nrm_p, _ = HC.pad(V, F, tree_u, pf, X, Z, Y, S['plate']['hw'], S['plate']['hh'], 0.0038, corner=0.55,
                             lift=WEB_T + 0.0002)
    nf = FT.unit(nrm_p[0].mean(axis=0))
    pf_top = top_p[0].mean(axis=0)
    pj, nj = HC.ray_in(tree_u, (0.0, c[1], S['plate']['z'] + 0.016), (0.0, -1.0, 0.0))   # the fork junction block
    HC.rbox(V, F, pj + nj * 0.004, [X, FT.unit(np.cross(nj, X)), nj], (0.012, 0.007, 0.0028), 0.0018, step=0.0012)
    V, F, _ = pt('metal')
    for sx in (-1, 1):           # rivets through the side straps' tabs
        b0 = pf_top + X * sx * 0.026
        HC.taper(V, F, [b0, b0 + nf * 0.0018], 0.0032, 0.003, sides=8)
    cz = S['cradle']['z']
    pb, _ = HC.ray_in(tree_u, (0.0, c[1], cz), (0.0, 1.0, 0.0))
    V, F, _ = pt('pod')
    HC.pad(V, F, tree_u, pb, X, Z, -Y, S['cradle']['hw'] - 0.006, S['cradle']['hh'], 0.004, corner=0.6,
           lift=WEB_T + 0.0002)

    # --- Battery pod: the sculpted body on the shell, ribs, the screw cap (right), the cable outlet (left) -------------
    pc, nc = HC.ray_in(tree_u, (0.0, c[1], cz + 0.012), Y)
    u_ = FT.unit(np.cross(nc, X))
    if u_[2] < 0:
        u_ = -u_
    t_ = np.cross(u_, nc)
    if t_[0] < 0:
        t_ = -t_

    def bend(L):
        L = L.copy()
        L[:, 2] -= 6.5 * L[:, 0] ** 2
        return L
    half = (0.042, 0.023, 0.0068)
    Cp = pc + nc * (half[2] + 0.003)
    V, F, _ = pt('pod')
    HC.rbox(V, F, Cp, [t_, u_, nc], half, 0.0075, step=0.0018, deform=bend)
    for k in (-1, 1):
        HC.rbox(V, F, Cp + nc * 0.0068 + u_ * k * 0.0095, [t_, u_, nc], (0.028, 0.0021, 0.0012), 0.001, step=0.0015,
                deform=bend)
    cap_c = Cp - t_ * 0.0425 - nc * 0.0117
    HC.knurl(V, F, cap_c, -t_, 0.0078, 0.006, ridges=20)
    out_p = Cp + t_ * 0.031 - nc * 0.0062 + u_ * 0.0235
    HC.rbox(V, F, out_p, [t_, u_, nc], (0.005, 0.0035, 0.0045), 0.0015, step=0.0012)   # cable outlet boss (left, top)
    meas['podBodyM'] = [round(2 * h, 3) for h in half]

    # --- Goggle (the original step 07 housing, D20), in use: over the eyes -----------------------------------------
    yf, _ = HC.ray_in(tree_u, (0.032, c[1], eye_z), (0.0, -1.0, 0.0))
    y_face = float(yf[1])
    hx, hy, hz = H_HALF
    Hc = np.array([0.0, y_face - CUP_L - hy, eye_z + 0.003])
    y_back, y_front = Hc[1] + hy, Hc[1] - hy

    def notch(L):
        """The nose notch: the rear 22 mm of the housing's bottom rises over the nose bridge."""
        L = L.copy()
        wy = np.clip((L[:, 1] - (hy - 0.024)) / 0.006, 0, 1)
        wx = np.clip(1 - (np.abs(L[:, 0]) / 0.017) ** 2, 0, 1)
        zmin = -hz + 0.014 * wx * wy
        L[:, 2] = np.maximum(L[:, 2], zmin)
        return L
    Vg, Fg, Eg = pt('housing')
    HC.rbox(Vg, Fg, Hc, [X, Y, Z], H_HALF, 0.007, step=0.0025, emit=Eg, deform=notch)
    # shroud lip round both objectives
    rr_ = []
    for kk in range(128):
        a = 2 * math.pi * kk / 128
        ca, sa = math.cos(a), math.sin(a)
        ex = 2.0 / 0.35
        rr_.append((0.047 * np.sign(ca) * abs(ca) ** (2 / ex), 0.0215 * np.sign(sa) * abs(sa) ** (2 / ex)))
    rr_ = np.array(rr_)
    inner = rr_ * np.array([(0.047 - 0.0022) / 0.047, (0.0215 - 0.0022) / 0.0215])
    base = len(Vg)
    for prof, yy in ((rr_, y_front + 0.002), (rr_, y_front - 0.007), (inner, y_front - 0.007), (inner, y_front + 0.002)):
        for (px, pz) in prof:
            Vg.append(np.array([px, yy, Hc[2] + pz]))
            Eg.append(0.0)
    m = len(rr_)
    for r in range(4):
        r2 = (r + 1) % 4
        for kk in range(m):
            k2 = (kk + 1) % m
            Fg.append((base + r * m + kk, base + r * m + k2, base + r2 * m + k2, base + r2 * m + kk))
    # the status light (tiny, muted amber)
    s0 = len(Vg)
    HC.rbox(Vg, Fg, np.array([0.036, y_front + 0.005, Hc[2] + hz - 0.0004]), [X, Y, Z],
            (0.0017, 0.0017, 0.0012), 0.001, step=0.0008, emit=Eg)
    for q in range(s0, len(Vg)):
        Eg[q] = 1.0
    # the mode switch (night vision, thermal, camera feed: the multi-mode optic, ART-DIRECTION 3) on the left side
    HC.knurl(Vg, Fg, Hc + X * (hx + 0.0028) + Z * 0.006 - Y * 0.006, X, 0.0072, 0.0055, ridges=16)
    # band lugs (A29): a D-frame moulded onto each side, behind the mode switch; the band wraps its outer bar
    lug_bar = []
    for sx in (-1, 1):
        lc = Hc + Y * 0.009 - Z * 0.002
        HC.rbox(Vg, Fg, lc + X * sx * (hx + 0.0012), [X, Y, Z], (0.0032, 0.0055, 0.0125), 0.0015, step=0.0012)
        HC.rbox(Vg, Fg, lc + X * sx * (hx + 0.0078), [X, Y, Z], (0.0016, 0.0035, 0.0128), 0.0012, step=0.0012)
        for sz in (-1, 1):
            HC.rbox(Vg, Fg, lc + X * sx * (hx + 0.0048) + Z * sz * 0.0118, [X, Y, Z], (0.0045, 0.0035, 0.0015),
                    0.0010, step=0.0012)
        lug_bar.append(lc + X * sx * (hx + 0.0078))
    lug_bar = np.array(lug_bar)                 # [right (-x), left (+x)]
    Eg.extend([0.0] * (len(Vg) - len(Eg)))
    # objectives (fix round 1, item 4): a barrel out of the housing face, the domed coated glass seated deep in it,
    # the glow strongest at its centre (head_common.lens_assembly)
    lens_c = [np.array([sx * 0.032, y_front - 0.0005, Hc[2] - 0.001]) for sx in (-1, 1)]
    Vl, Fl, El = pt('lens')
    for lc in lens_c:
        HC.lens_assembly(Vg, Fg, Vl, Fl, El, lc, np.array([0.0, -1.0, 0.0]))
        Eg.extend([0.0] * (len(Vg) - len(Eg)))
    # eyecups: from the housing back to the face, sealing on the port
    Vc, Fc, _ = pt('cup')
    for sx in (-1, 1):
        cx = sx * 0.032
        rings_o, rings_i = [], []
        for kr in range(7):
            f = kr / 6
            ro, ri = [], []
            for kk in range(28):
                a = 2 * math.pi * kk / 28
                r = 0.0172 + 0.0022 * f + 0.0011 * math.sin(math.pi * f)
                px, pz = cx + r * math.cos(a), Hc[2] - 0.002 + r * math.sin(a)
                hit, _ = HC.ray_in(tree_u, (px, c[1], pz), (0.0, -1.0, 0.0))
                yc = float(hit[1]) - 0.0004 if hit is not None else y_face
                yc = min(yc, y_face + 0.009)        # soft rubber: it seals round the socket, not back to the temple
                yy = (y_back - 0.003) + (yc - (y_back - 0.003)) * f
                ro.append((px, yy, pz))
                ri.append((cx + (r - 0.0026) * math.cos(a), yy, Hc[2] - 0.002 + (r - 0.0026) * math.sin(a)))
            rings_o.append(ro)
            rings_i.append(ri)
        b0 = len(Vc)
        allr = rings_o + rings_i[::-1]
        for ring in allr:
            Vc.extend([np.array(p) for p in ring])
        for r in range(len(allr) - 1):
            for kk in range(28):
                k2 = (kk + 1) % 28
                Fc.append((b0 + r * 28 + kk, b0 + r * 28 + k2, b0 + (r + 1) * 28 + k2, b0 + (r + 1) * 28 + kk))

    # --- Stowed pose (D19): slid up onto the brow, tipped back with it, resting on its eyecups ------------------------
    def surface(keys):
        hv, hf, off = [Vh, Vb], list(Fh) + [tuple(i + len(Vh) for i in f) for f in Fb], len(Vh) + len(Vb)
        for k in keys:
            if pt.d.get(k) and pt.d[k][1]:
                hv.append(np.asarray(pt.d[k][0], float))
                hf += [tuple(i + off for i in f) for f in pt.d[k][1]]
                off += len(pt.d[k][0])
        return HC.bvh(np.vstack(hv), hf)
    surf = surface(('web', 'poly', 'pod', 'anod', 'metal'))   # what the stowed goggle rests on
    surf_band = surface(('web', 'poly', 'anod', 'metal'))     # the band runs through the channel under the pod
    al = math.radians(-STOW_DEG)
    R = np.array([[1, 0, 0], [0, math.cos(al), -math.sin(al)], [0, math.sin(al), math.cos(al)]])
    Fw = R @ np.array([0.0, -1.0, 0.0])
    zs = eye_z + STOW_DZ
    yb, _ = HC.ray_in(surf, (0.0, c[1], zs), (0.0, -1.0, 0.0))
    Hs = np.array([0.0, float(yb[1]) - hy - 0.004, zs])
    probe = np.vstack([np.asarray(Vg, float)[::4], np.asarray(Vc, float)[::3]])

    def clear_of(Pq):
        for q in Pq:
            loc, nrm, _, dist = surf.find_nearest(Vector(q))
            if loc is None:
                continue
            if (Vector(q) - loc).dot(nrm) < 0.0012:
                return False
        return True
    for it in range(60):
        if clear_of((probe - Hc) @ R.T + Hs):
            break
        Hs = Hs + Fw * 0.001
    stowM = np.eye(4)
    stowM[:3, :3] = R
    stowM[:3, 3] = Hs - R @ Hc
    Qc = (np.asarray(Vc, float) - Hc) @ R.T + Hs
    meas['stowedGapM'] = round(float(min(surf.find_nearest(Vector(q))[3] for q in Qc[::2])), 4)
    Qh = (np.asarray(Vg, float)[::3] - Hc) @ R.T + Hs
    meas['stowedHousingGapM'] = round(float(min(surf.find_nearest(Vector(q))[3] for q in Qh)), 4)
    meas['stowedLiftM'] = round(float(Hs[2] - Hc[2]), 4)
    meas['eyeReliefM'] = round(CUP_L, 3)

    # --- Goggle band and its cable, for both positions (A29) -----------------------------------------------------------
    def band(key, lugs, zb, Rg, Hg):
        """Fix round 3, item 1: the band as a relaxed elastic strip. It starts as the plane section's hull (outside
        everything), then shrinks (tension) under per-edge collision with the hood (it presses BAND_SINK in), the hem
        and the harness (not the balaclava: it is under the hood), pinned at the lugs' bars (each end leaves its bar
        along the goggle's side) and at a guide point under the pod (it enters the channel there)."""
        Bk = np.array([0.0, fr['back'](0.0, zb), zb])
        n = FT.unit(np.cross(lugs[1] - lugs[0], Bk - lugs[0]))
        e2 = FT.unit(lugs[1] - lugs[0])
        pl = {'O': c - n * float(np.dot(c - lugs[0], n)), 'n': n, 'e1': np.cross(n, e2), 'e2': e2}
        Pr, _, _ = HC.plane_ring(surf_band, pl, n=720)
        run = _hull_run(Pr, pl, lugs)
        if run[0][0] < run[-1][0]:
            run = run[::-1].copy()                     # index 0 on the left (+x)
        Yg, Zg = Rg @ Y, Rg @ Z
        ends = []
        for sx, lb in ((1.0, lugs[1]), (-1.0, lugs[0])):
            ng = Rg @ (X * sx)
            ends.append((lb + ng * 0.0017, ng))       # the band's underside on the bar's outer face
        gp, gn = HC.ray_in(soft_tree, (0.0, c[1], zb), Y)
        guide = gp - gn * BAND_SINK
        init = np.vstack([[ends[0][0]], [ends[0][0] + Yg * 0.006], run, [ends[1][0] + Yg * 0.006], [ends[1][0]]])
        Pb, Nb, wc, hgt = _relax_band(init, ends, Yg, guide, gn, soft_tree, hem_tree, harness_band, bal_tree)
        V, F, _ = pt(key)
        sV, sF, _ = pt(key + '_st')                    # its stitches: shown with its pose only
        # one continuous webbing: the left return under the band, round the left bar, the run, round the right bar,
        # the right return
        s_ = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Pb, axis=0), axis=1))])
        Lr = s_[-1]
        W = LUG_W + (BAND_W - LUG_W) * np.clip(np.minimum(s_, Lr - s_) / 0.016, 0.0, 1.0)
        pieces = []
        for side in (0, 1):
            (E, ng), lb = ends[side], (lugs[1] if side == 0 else lugs[0])
            wrap_p, wrap_n = [], []
            for ph in np.linspace(0.0, math.pi, 9):
                wrap_p.append(lb + ng * 0.0017 * math.cos(ph) - Yg * 0.0037 * math.sin(ph))
                wrap_n.append(FT.unit(ng * math.cos(ph) / 0.0017 - Yg * math.sin(ph) / 0.0037))
            idx = np.where(s_ <= RET_L)[0] if side == 0 else np.where(Lr - s_ <= RET_L)[0][::-1]
            ss = s_[idx] if side == 0 else Lr - s_[idx]
            g = 0.0034 * (1.0 - _smooth01(ss / 0.009)) + 0.0001
            ret_p = Pb[idx] - Nb[idx] * g[:, None]
            ret_n = -Nb[idx]
            pieces.append((np.vstack([wrap_p, ret_p[1:]]), np.vstack([wrap_n, ret_n[1:]])))
        (lp, ln), (rp, rn) = pieces
        Tm = HC.tangents(Pb)
        Bm = FT.unit(np.cross(Nb, Tm))
        Bm = np.where((Bm @ Zg)[:, None] < 0, -Bm, Bm)
        allP = np.vstack([lp[::-1], Pb[1:-1], rp])
        allN = np.vstack([ln[::-1], Nb[1:-1], rn])
        allW = np.concatenate([np.full(len(lp), LUG_W), W[1:-1], np.full(len(rp), LUG_W)])
        allB = np.vstack([np.tile(Zg, (len(lp), 1)), Bm[1:-1], np.tile(Zg, (len(rp), 1))])
        _strip_w(V, F, allP, allN, allB, allW, BAND_T)
        for side in (0, 1):                            # bar tack through both layers, stitch rows along the return
            i = HC.at_length(Pb, 0.016) if side == 0 else HC.at_length(Pb, Lr - 0.016)
            HC.rbox(sV, sF, Pb[i] + Nb[i] * (BAND_T + 0.0003), [Tm[i], Bm[i], Nb[i]],
                    (0.0018, 0.5 * LUG_W - 0.0028, 0.0005), 0.0003, step=0.0012)
            if side == 0:
                sl = slice(HC.at_length(Pb, 0.004), HC.at_length(Pb, 0.02) + 1)
            else:
                sl = slice(HC.at_length(Pb, Lr - 0.02), HC.at_length(Pb, Lr - 0.004) + 1)
            for e_ in (-0.5, 0.5):
                stitch_count[0] += FT.stitch_row(sV, sF, Pb[sl] + Bm[sl] * e_ * (LUG_W - 0.003)
                                                 + Nb[sl] * (BAND_T + 0.0003), Nb[sl])
            stitch_count[0] += 1
        Lb = HC.path_length(allP)
        # the cable: a slim cord from the pod outlet onto the band, seated on its outer face, under sewn webbing keeper
        # loops; 26 mm before the left bar it leaves the band over its top edge into a plug on the housing's side,
        # above the lug
        face_o = BAND_T + CABLE_R - 0.0001
        k = int(np.argmin(np.linalg.norm(Pb - out_p, axis=1)))
        jl = HC.at_length(Pb, 0.026)
        on = (Pb[jl:k + 1] + Nb[jl:k + 1] * face_o)[::-1]
        jm = HC.at_length(Pb, 0.012)
        plug = Hg + Rg @ (X * (hx + 0.0004) + Y * 0.009 + Z * 0.016)
        ng = ends[0][1]
        route = np.vstack([[out_p + u_ * 0.0045], [out_p + u_ * 0.009 + nc * 0.002], on[2:],
                           [Pb[jm] + Nb[jm] * (BAND_T + 0.0035) + Zg * 0.0125], [plug + ng * 0.008],
                           [plug + ng * 0.0035], [plug]])
        route = FT.smooth_polyline(HC.resample(route, np.tile(Z, (len(route), 1)), 0.004)[0], 2)
        route[-1] = plug
        Vr, Fr_, _ = pt(key + '_cable')
        FT.tube(Vr, Fr_, route, CABLE_R, sides=10)
        for seg_ in (route[:6], route[::-1][:4]):
            HC.taper(Vr, Fr_, seg_, 0.0025, 0.0018, sides=12)
        Lc = HC.path_length(route)
        keep_at = []
        for f in np.linspace(0.25, 0.75, KEEPERS):
            i = HC.at_length(route, f * Lc)
            j = int(np.argmin(np.linalg.norm(Pb - route[i], axis=1)))
            stitch_count[0] += _keeper(V, F, sV, sF, Pb[j] + Nb[j] * BAND_T, Tm[j], Nb[j])
            keep_at.append(round(float(f * Lc), 3))
        ctr = wc > 0.99
        out = {'bandM': round(Lb, 3), 'cableM': round(Lc, 3), 'keepersM': keep_at, 'backZM': round(float(zb - cz), 4),
               'maxStandoffM': round(float(hgt[ctr].max()), 4) if ctr.any() else 0.0,
               'meanStandoffM': round(float(hgt[ctr].mean()), 4) if ctr.any() else 0.0,
               'contactM': round(float(np.diff(s_)[ctr[1:]].sum()), 3),
               'standoffPeaks': [[round(float(s_[i]), 3), round(float(hgt[i]), 4)] + [round(float(v), 3) for v in Pb[i]]
                                 for i in np.argsort(-np.where(ctr, hgt, -1.0))[:3]],
               'standoffOver': 'hood + hem + harness: the band underside centre above the top surface, along its normal'}
        return out, (Pb, Nb, wc)
    harness = HC.bvh(*_merge([pt.d[k][:2] for k in ('web', 'poly', 'pod', 'anod', 'metal') if pt.d.get(k)]))
    harness_band = HC.bvh(*_merge([pt.d[k][:2] for k in ('web', 'poly', 'anod', 'metal') if pt.d.get(k)]))
    soft_tree = HC.bvh(Vh, Fh)
    hem_tree = HC.bvh(*mesh_of(f'{op}-headwear-hem')) if f'{op}-headwear-hem' in bpy.data.objects else None
    stitch_count = [0]
    meas['inUse'], path_in = band('band', lug_bar, cz + 0.006, np.eye(3), Hc)
    meas['stowed'], path_st = band('band_s', (lug_bar - Hc) @ R.T + Hs, cz + 0.022, R, Hs)
    # cam buckles on the side straps, nearest 50 mm behind the plate where neither band run (in use, stowed) crosses
    # (fix round 3: the stowed band rode over the buckle's lever and stood 4.2 mm off the strap beside it), and the
    # doubled-back tails
    runs = np.vstack([path_in[0], path_st[0]])
    for nm in ('sideL', 'sideR'):
        P, N = spans[nm]
        sP = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        dmin = np.array([np.min(np.linalg.norm(runs - q, axis=1)) for q in P])
        ok = [i for i in range(len(P)) if 0.03 <= sP[i] <= sP[-1] - 0.06      # the buckle and its 40 mm tail
              and dmin[(sP > sP[i] - 0.014) & (sP < sP[i] + 0.044)].min() > 0.5 * BAND_W + 0.004]
        i = min(ok, key=lambda q: abs(sP[q] - 0.05)) if ok else HC.at_length(P, 0.05)
        meas[f'{nm}CamBuckleM'] = round(float(sP[i]), 3)
        T = HC.tangents(P)
        B = FT.unit(np.cross(N, T))
        V, F, _ = pt('anod')
        HC.rbox(V, F, P[i] + N[i] * (WEB_T + 0.0018), [T[i], B[i], N[i]], (0.012, 0.0125, 0.0018), 0.0012, step=0.0012)
        lever_n = FT.unit(N[i] + T[i] * 0.18)
        HC.rbox(V, F, P[i] + N[i] * (WEB_T + 0.0042) + T[i] * 0.003, [FT.unit(np.cross(B[i], lever_n)), B[i], lever_n],
                (0.014, 0.0105, 0.0012), 0.0010, step=0.0012)
        j = HC.at_length(P, float(sP[i]) + 0.04)
        V, F, _ = pt('web')
        FT.strip(V, F, P[i:j] + N[i:j] * (WEB_T + 0.0005), N[i:j], B[i:j], 0.019, 0.0013)
    nst += stitch_count[0]
    # the hood (and its stitches) pressed in under the band: built in use; the stowed run as a per-vertex delta the
    # test render applies ('stow_delta')
    hood_n = FT.vertex_normals(Vh, Fh)
    hood_tree = HC.bvh(Vh, Fh)
    for nm in (f'{op}-headwear-hood', f'{op}-headwear-stitches'):
        ob = bpy.data.objects.get(nm)
        if ob is None:
            continue
        W = np.array([(ob.matrix_world @ v.co)[:] for v in ob.data.vertices])
        if nm.endswith('hood'):
            Nw = hood_n
        else:
            Nw = np.array([np.array(hood_tree.find_nearest(Vector(q))[1]) for q in W])
        d_in = _dent_field(W, Nw, *path_in, harness)
        d_st = _dent_field(W, Nw, *path_st, harness)
        Mi = np.linalg.inv(np.array(ob.matrix_world)[:3, :3])
        L = (W + d_in - np.array(ob.matrix_world)[:3, 3]) @ Mi.T
        ob.data.vertices.foreach_set('co', L.ravel())
        if 'stow_delta' in ob.data.attributes:
            ob.data.attributes.remove(ob.data.attributes['stow_delta'])
        att = ob.data.attributes.new('stow_delta', 'FLOAT_VECTOR', 'POINT')
        att.data.foreach_set('vector', ((d_st - d_in) @ Mi.T).ravel())
        ob.data.update()
        meas.setdefault('bandDentVerts', {})[nm.split('-')[-1]] = int((np.linalg.norm(d_in, axis=1) > 1e-5).sum())
    meas['goggleCableM'] = meas['inUse']['cableM']

    # --- Earpiece, boom mic, earpiece cable ---------------------------------------------------------------------------
    ear_z, ear_y = eye_z - 0.02, c[1] + 0.004
    eh, en = HC.ray_in(skin, (0.0, ear_y, ear_z), (1.0, 0.0, 0.0))
    V, F, _ = pt('poly')
    HC.rbox(V, F, eh - en * 0.003, [np.array([0.0, 1.0, 0.0]), Z, X], (0.007, 0.009, 0.005), 0.003, step=0.0015)
    mouth_z = fr['chin_z'] + 0.043
    boom = []
    for f in np.linspace(0.0, 1.0, 16):
        d = FT.unit((1 - f) * X + f * np.array([0.3, -1.0, 0.0]))
        oz = ear_z + (mouth_z - ear_z) * f
        o = np.array([0.0, c[1] - 0.012 - 0.02 * f, oz])
        p, n = HC.ray_in(bal_tree, o, d, 0.2)
        boom.append(p + n * (0.0022 + 0.004 * max(0.0, f - 0.8) / 0.2))
    boom = np.array(boom)
    boom[-1] = boom[-1] + np.array([-0.006, -0.002, 0.0])
    boom = FT.smooth_polyline(HC.resample(boom, np.tile(X, (len(boom), 1)), 0.003)[0], 3)
    FT.tube(V, F, boom, 0.0012, sides=8)
    Vfo, Ffo, _ = pt('foam')
    HC.rbox(Vfo, Ffo, boom[-1] + HC.tangents(boom)[-1] * 0.004, [X, np.array([0.0, 1.0, 0.0]), Z], (0.006, 0.0048, 0.0048),
            0.0046, step=0.0012)
    meas['boomM'] = round(HC.path_length(boom), 3)
    Vbd = np.asarray(pt.d['band'][0], float)        # the boom mic stays clear of the band (fix round 3)
    meas['boomBandClearM'] = round(float(min(np.min(np.linalg.norm(Vbd - q, axis=1)) for q in boom)) - 0.0012, 4)
    ecab = []
    if sh_tree is not None:
        ct = None
        Vs = layers[collar][0]
        neck = (np.abs(Vs[:, 0]) < 0.075) & (np.abs(Vs[:, 1] - fr['neck_y']) < 0.09) & (Vs[:, 2] > fr['neck_z'] - 0.08)
        ct = float(Vs[neck, 2].max())
        cd = lambda zz: HC.cable_dir(zz, ct, ear_z)   # noqa: E731  (the same line the hood rides over)
        # step 09: the plug ends on the PTT's top face (chest_rig: the PTT clipped on the left shoulder strap, its body
        # over the strap's inner edge at the collarbone), so the run starts 8.5 cm left of the centre line
        p0, n0 = HC.ray_in(sh_tree, (PLUG_X, 0.0, ct - 0.1), (0.0, -1.0, 0.0), 0.3)
        # every ray below starts on the near (left front) side and stops at the neck axis (far=1.0): it can never pass
        # the axis and find the collar or the skin on the far side (07-fixes-r4 MUST 1: the old 1.5 x cast looped the
        # cable through the throat to the right back of the neck). A ray that finds no shirt collar there takes the
        # skin plus the collar's 4 mm, on the same side.
        def near(tree, zz, lift):
            p, n = HC.ray_in(tree, (0.0, fr['neck_y'], zz), cd(zz), 0.2, far=1.0)
            if p is None and tree is not skin:
                p, n = HC.ray_in(skin, (0.0, fr['neck_y'], zz), cd(zz), 0.2, far=1.0)
                if p is not None:
                    p = p + n * lift
            return p, n
        p1, n1 = near(sh_tree, ct - 0.032, 0.004)
        p2, n2 = near(sh_tree, ct - 0.006, 0.004)
        # under the balaclava edge the cable lies on the skin, up the neck to the earpiece (hidden by the hood)
        p3, n3 = near(skin, ct + 0.012, 0.0)
        p4, n4 = near(skin, ear_z - 0.035, 0.0)
        p5, n5 = near(skin, ear_z - 0.022, 0.0)
        meas['earpieceRays'] = {k: [round(float(v), 4) for v in q] for k, q in
                                (('p1', p1), ('p2', p2), ('p3', p3), ('p4', p4))}
        # from the collarbone up to the collar the cable hugs the suit (each chord point taken to the nearest suit point,
        # 1.6 mm out), so it runs under the hood skirt's hem instead of spanning the hollow at the neck's base
        hug = []
        for f_ in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9):
            q_ = (p0 + Z * 0.012) + (p1 - p0 - Z * 0.012) * f_
            loc_, nrm_, _, _ = sh_tree.find_nearest(Vector(tuple(q_)))
            if loc_ is not None:
                hug.append(np.array(loc_) + FT.unit(np.array(nrm_)) * 0.0014)
        ecab = np.array([p0 + n0 * 0.006, p0 + n0 * 0.0016 + Z * 0.012] + hug + [p1 + n1 * 0.0016, p2 + n2 * 0.0016,
                         p2 + n2 * 0.0016 + Z * 0.008, p3 + n3 * 0.0006, p4 + n4 * 0.0006, p5 + n5 * 0.0006,
                         eh + en * 0.0025 - Z * 0.008])
        ecab = FT.smooth_polyline(HC.resample(ecab, np.tile(Z, (len(ecab), 1)), 0.004)[0], 2)
        # step 09 (07-fixes-r4): no ring centre inside the skin: each is kept 1.4 mm out (the cable's radius plus
        # 0.2 mm) along the skin's normal, smoothed and pushed again; it ends on the earpiece's outer face
        L_ = HC.path_length(ecab)
        for _ in range(3):
            for k_ in range(len(ecab)):
                loc, nrm, _, _ = skin.find_nearest(Vector(tuple(ecab[k_])))
                if loc is None:
                    continue
                loc, nrm = np.array(loc), FT.unit(np.array(nrm))
                d_ = float((ecab[k_] - loc) @ nrm)
                s_k = HC.path_length(ecab[:k_ + 1]) if k_ else 0.0
                if d_ < 0.0014 and k_ < len(ecab) - 1:
                    ecab[k_] = ecab[k_] + nrm * (0.0014 - d_)
            ecab[1:-1] = (ecab[:-2] + 2 * ecab[1:-1] + ecab[2:]) / 4 * 0.5 + ecab[1:-1] * 0.5
        Vr, Fr_, _ = pt('cable')
        FT.tube(Vr, Fr_, ecab, 0.0012, sides=8)
        V, F, _ = pt('poly')
        tq = HC.tangents(ecab)[0]
        HC.rbox(V, F, ecab[0] - tq * 0.006, [n0, np.cross(tq, n0), tq], (0.0035, 0.0035, 0.008), 0.002, step=0.0015)   # plug
        tq = HC.tangents(ecab)[HC.at_length(ecab, 0.03)]
        cq = ecab[HC.at_length(ecab, 0.03)]
        HC.rbox(V, F, cq - n1 * 0.0003, [tq, np.cross(n1, tq), n1], (0.004, 0.006, 0.0022), 0.0012, step=0.0012)  # collar clip
        meas['earpieceCableM'] = round(HC.path_length(ecab), 3)
        s_ = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(ecab, axis=0), axis=1))])
        z_edge = float(bpy.data.objects[f'{op}-headwear-balaclava'].get('bottomZ', ct - 0.016))
        meas['earpieceRetentionM'] = {'collarClip': 0.03, 'balaclavaEdge': round(float(s_[int(np.argmax(ecab[:, 2] > z_edge))]), 3)}

    # --- Objects --------------------------------------------------------------------------------------------------
    gp = reuse(MAT.polymer, 'goggle polymer', colour=(0.021, 0.022, 0.022), rough=0.64)
    if not gp.get('emitter'):
        MAT.add_emitter(gp, colour=(1.0, 0.42, 0.1), strength=1.5)
        gp['emitter'] = 1
    band_m = reuse(MAT.webbing, 'goggle band elastic', colour=(0.026, 0.026, 0.027))
    cable_m = reuse(MAT.rubber, 'cable jacket', colour=(0.022, 0.022, 0.023), rough=0.72)
    mats = {
        'web': reuse(MAT.webbing, 'harness webbing', colour=(0.023, 0.024, 0.024)),
        'poly': reuse(MAT.polymer, 'harness polymer', colour=(0.022, 0.022, 0.023), rough=0.7),
        'pod': reuse(MAT.polymer, 'pod polymer', colour=(0.021, 0.021, 0.022), rough=0.58),
        'metal': reuse(MAT.painted_metal, 'hardware metal'),
        'anod': reuse(MAT.anodised, 'anodised aluminium'),
        'housing': gp, 'lens': reuse(MAT.lens, 'goggle lens'),
        'cup': reuse(MAT.rubber, 'eyecup rubber', colour=(0.022, 0.022, 0.023), rough=0.84),
        'band': band_m, 'band_s': band_m, 'band_cable': cable_m, 'band_s_cable': cable_m, 'cable': cable_m,
        'band_st': reuse(MAT.thread, 'thread'), 'band_s_st': reuse(MAT.thread, 'thread'),
        'foam': reuse(MAT.knit, 'mic foam', colour=(0.028, 0.028, 0.029)),
    }
    GOGGLE = {'housing', 'lens', 'cup'}
    POS = {'band': 'inuse', 'band_cable': 'inuse', 'band_st': 'inuse', 'band_s': 'stowed', 'band_s_cable': 'stowed',
           'band_s_st': 'stowed'}
    objs = []
    for key, (V, F, E) in pt.d.items():
        if not F:
            continue
        uv = [(0.0, 0.0)] * sum(len(f) for f in F)
        attrs = {'wear': np.zeros(len(V))}
        if E:
            attrs['emit'] = np.asarray(E, float)
        ob = FT.add_mesh(scene, f'{op}-head_kit-{key}', V, F, mats[key], uv=uv, attrs=attrs)
        _recalc(ob)
        _poly_uv(ob)
        if key.endswith('_st'):
            ob.visible_shadow = False
        if key in GOGGLE:        # the stowed pose as a rigid transform (render_garment_test.py, the Lab later)
            ob['stowM'] = [float(v) for v in stowM.ravel()]
        if key in POS:
            ob['goggle_pos'] = POS[key]
            if POS[key] == 'stowed':
                ob.hide_render = True       # not exported, not checked: the build's pose is in use
        objs.append(ob)
    st = FT.add_mesh(scene, f'{op}-head_kit-stitches', stV, stF, reuse(MAT.thread, 'thread'))
    st.visible_shadow = False
    objs.append(st)

    shV, shF = [], []
    for nm in ('forkL', 'forkR', 'sideL', 'sideR', 'chin'):
        P, N = spans[nm]
        HC.strap_mesh(shV, shF, P, N, 0.02, 0.0005)
    return {
        'shell': (np.array(shV), shF),
        'objects': objs,
        'kits': KITS,
        'measurements': meas,
        'report': {'stitches': nst, 'parts': {k: len(v[1]) for k, v in pt.d.items()}},
    }


def _hull_run(P, pl, lugs):
    """The band's starting line in its plane: the convex hull of the section and the two lugs (outside everything),
    resampled every 3 mm, the run behind the lugs (not across the face)."""
    O, e1, e2 = pl['O'], pl['e1'], pl['e2']
    A = np.vstack([P, lugs])
    U = np.stack([(A - O) @ e1, (A - O) @ e2], axis=1)
    pts = U[np.lexsort((U[:, 1], U[:, 0]))]

    def half(seq):
        h = []
        for q in seq:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (q[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (q[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(q)
        return h
    H = np.array(half(pts)[:-1] + half(pts[::-1])[:-1])
    Hc = np.vstack([H, H[:1]])
    s_ = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Hc, axis=0), axis=1))])
    t = np.arange(0.0, s_[-1], 0.003)
    Hs = np.stack([np.interp(t, s_, Hc[:, 0]), np.interp(t, s_, Hc[:, 1])], axis=1)
    P3 = O + Hs[:, :1] * e1 + Hs[:, 1:] * e2
    side = P3[:, 1] > max(lugs[0][1], lugs[1][1]) + 0.012
    n = len(side)
    best, cur, start, bstart = 0, 0, 0, 0
    for k in range(2 * n):
        if side[k % n]:
            if cur == 0:
                start = k
            cur += 1
            if cur > best and cur <= n:
                best, bstart = cur, start
        else:
            cur = 0
    return P3[[(bstart + i) % n for i in range(best)]]


def _band_heights(P, N, B, trees, width):
    """Per point, per tree: the lowest height of the band's underside (left edge, middle, right edge) above that
    surface, measured along -N by rays (a heightfield: no face-orientation trouble on the closed harness parts), and
    the summed hit normals of the soft surfaces. Heights are +inf where nothing is under the band."""
    n = len(P)
    H = np.full((n, len(trees)), np.inf)
    Hm = np.full((n, len(trees)), np.inf)
    Ns = np.zeros((n, 3))
    for i in range(n):
        for e in (-0.5, 0.0, 0.5):
            q = P[i] + B[i] * e * width
            o = Vector(q + N[i] * 0.015)
            d = Vector(-N[i])
            for k, (tree, _cl, soft) in enumerate(trees):
                if tree is None:
                    continue
                loc, nrm, _, dist = tree.ray_cast(o, d, 0.03)
                if loc is None:
                    continue
                h = dist - 0.015
                H[i, k] = min(H[i, k], h)
                if e == 0.0:
                    Hm[i, k] = h
                if soft:
                    nv = np.array(nrm)
                    Ns[i] += nv if nv @ N[i] > 0 else -nv
    return H, Hm, Ns


def _relax_band(init, ends, Yg, guide, gn, soft, hem, hard, bal):
    """Fix round 3, item 1: the band as a relaxed strip. Each pass: shrink (every free point moves halfway to its
    neighbours' mean: the band's tension), then per-edge collision (the left edge, middle and right edge must clear the
    hood by -BAND_SINK (it presses in), the hem and the harness by 0.1 / 0.2 mm, the balaclava by 2.5 mm), the normal
    following the soft surface under it. Pinned: each end on its lug's bar and 6 mm straight off it along the goggle's
    side, and the guide point under the pod. Coarse (12 mm) then fine (5 mm), then resampled every 3 mm. Returns points
    (the underside's centre line, left to right), normals, the contact weight (0 on the free spans) and the centre
    line's height above hood + hem + harness."""
    trees = [(soft, -BAND_SINK, True), (hem, 0.0001, True), (hard, 0.0002, False), (bal, 0.0025, True)]
    cl = np.array([t[1] for t in trees])

    def setup(P0, N0, step):
        P, N = HC.resample(P0, N0, step)
        n = len(P)
        pin = np.zeros(n, bool)
        k1 = max(1, int(round(0.006 / step)))
        for j in range(k1 + 1):
            P[j] = ends[0][0] + Yg * (0.006 * j / k1)
            P[n - 1 - j] = ends[1][0] + Yg * (0.006 * j / k1)
            N[j], N[n - 1 - j] = ends[0][1], ends[1][1]
            pin[j] = pin[n - 1 - j] = True
        ig = int(np.argmin(np.linalg.norm(P - guide, axis=1)))
        P[ig], N[ig], pin[ig] = guide, gn, True
        return P, N, pin

    def collide(P, N, pin):
        s_ = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        extra = np.where(np.minimum(s_, s_[-1] - s_) <= RET_L + 0.003, BAND_T + 0.0002, 0.0)   # the return under it
        T = HC.tangents(P)
        B = FT.unit(np.cross(N, T))
        H, _, Ns = _band_heights(P, N, B, trees, BAND_W)
        need = np.max(cl[None, :] + extra[:, None] - H, axis=1)
        need = np.where(pin, 0.0, np.maximum(need, 0.0))
        P = P + N * need[:, None]
        has = np.linalg.norm(Ns, axis=1) > 1e-6
        Nn = np.where(has[:, None], FT.unit(Ns + 1e-12), N)
        Nn = FT.unit(Nn - T * np.sum(Nn * T, axis=1)[:, None])
        for _ in range(2):
            Nn[1:-1] = FT.unit(0.5 * Nn[1:-1] + 0.25 * (Nn[:-2] + Nn[2:]))
        Nn[pin] = N[pin]
        return P, Nn

    cy = 0.5 * (ends[0][0][1] + guide[1])       # a first normal: away from the head's vertical axis
    N0 = FT.unit(np.column_stack([init[:, 0], init[:, 1] - cy, np.zeros(len(init))]))
    P, N = init, N0
    for step, iters in ((0.012, 160), (0.005, 160)):
        P, N, pin = setup(P, N, step)
        for _ in range(iters):
            Q = P.copy()
            Q[1:-1] = P[1:-1] + 0.5 * (0.5 * (P[:-2] + P[2:]) - P[1:-1])
            Q[pin] = P[pin]
            P, N = collide(Q, N, pin)
    P, N, pin = setup(P, N, 0.003)
    for _ in range(3):
        P, N = collide(P, N, pin)
    T = HC.tangents(P)
    B = FT.unit(np.cross(N, T))
    H, Hm, _ = _band_heights(P, N, B, trees, BAND_W)
    touch = np.where(np.min(H[:, :3] - cl[None, :3], axis=1) < 0.0012)[0]
    wc = np.zeros(len(P))
    if len(touch):
        wc[touch[0]:touch[-1] + 1] = 1.0
    # where the tensioned strip still bridges a hollow of the loose hood (over the temple) by more than BAND_BRIDGE, it
    # pulls the hood fabric in with it: the band follows down (the hood is dented under it, _dent_field), never closer
    # than 0.2 mm to the harness, 0.1 mm to the hem or 2.4 mm to the balaclava (the compressed hood between)
    for _ in range(3):
        hc = np.min(Hm[:, :3], axis=1)
        pull = np.where(np.isfinite(hc) & (wc > 0) & ~pin, np.maximum(hc - BAND_BRIDGE, 0.0), 0.0)
        for _ in range(4):
            pull[1:-1] = np.maximum(pull[1:-1], 0.5 * pull[1:-1] + 0.25 * (pull[:-2] + pull[2:]))
        cap = np.minimum.reduce([H[:, 2] - 0.0002, H[:, 1] - 0.0001, H[:, 3] - 0.0024])
        pull = np.where(pin, 0.0, np.clip(np.minimum(pull, np.where(np.isfinite(cap), cap, 1.0)), 0.0, None))
        P = P - N * pull[:, None]
        H, Hm, _ = _band_heights(P, N, B, trees, BAND_W)
    hgt = np.min(Hm[:, :3], axis=1)
    hgt = np.where(np.isfinite(hgt), hgt, 0.0)
    w2 = wc.copy()
    for _ in range(2):              # a short ramp off each free span (the dent fades in)
        w2[1:-1] = np.minimum(w2[1:-1], 0.25 * w2[:-2] + 0.5 * w2[1:-1] + 0.25 * w2[2:])
    return P, N, w2, hgt


def _smooth01(x):
    t = np.clip(x, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _strip_w(V, F, pts, nrm, binorm, width, thick):
    """FT.strip with a width per point (the band gathers into the lug's slot)."""
    pts, nrm, binorm = np.asarray(pts, float), FT.unit(np.asarray(nrm, float)), FT.unit(np.asarray(binorm, float))
    base = len(V)
    for p, n, b, w in zip(pts, nrm, binorm, width):
        for sb, sn in ((-0.5, 0.0), (0.5, 0.0), (0.5, 1.0), (-0.5, 1.0)):
            V.append(p + b * sb * w + n * sn * thick)
    for i in range(len(pts) - 1):
        for k in range(4):
            k2 = (k + 1) % 4
            F.append((base + i * 4 + k, base + (i + 1) * 4 + k, base + (i + 1) * 4 + k2, base + i * 4 + k2))
    F.append((base + 3, base + 2, base + 1, base))
    e = base + (len(pts) - 1) * 4
    F.append((e, e + 1, e + 2, e + 3))


def _dent_field(W, Nw, Pb, Nb, wd, harness):
    """The hood pressed in under the band (Pb, Nb: its underside): each point within the band's footprint (and a 6 mm
    falloff) moves in along its normal by BAND_DENT times the band's contact weight, and under the band at least 0.2 mm
    below its underside (it presses BAND_SINK in); not under other harness parts (they lie on the hood)."""
    from mathutils.kdtree import KDTree
    kd = KDTree(len(Pb))
    for i, q in enumerate(Pb):
        kd.insert(Vector(q), i)
    kd.balance()
    Tb = HC.tangents(Pb)
    Bb = FT.unit(np.cross(Nb, Tb))
    D = np.zeros_like(W)
    reach = 0.5 * BAND_W + 0.012
    for v in range(len(W)):
        _, j, dist = kd.find(Vector(W[v]))
        if dist > reach or wd[j] < 1e-3:
            continue
        r = W[v] - Pb[j]
        b, h, a = abs(float(r @ Bb[j])), float(r @ Nb[j]), abs(float(r @ Tb[j]))
        if a > 0.0035 or h > 0.005 or h < -0.006:
            continue
        w = float(np.clip((0.5 * BAND_W + 0.006 - b) / 0.007, 0.0, 1.0))   # the pulled dent fades out 6 mm off the edge
        w = w * w * (3 - 2 * w)
        if w <= 0.0 or harness.find_nearest(Vector(W[v]))[3] < 0.004:
            continue
        amt = BAND_DENT * w * wd[j]
        if b < 0.5 * BAND_W + 0.0015 and h > -0.0002:     # under the band: at least 0.2 mm below its underside
            amt = max(amt, min((h + 0.0002) / max(float(Nw[v] @ Nb[j]), 0.5), 0.0028))
        D[v] = -Nw[v] * amt
    return D


def _keeper(V, F, stV, stF, base, T, N):
    """A sewn webbing keeper loop over the cable: an 8 mm strip across the band, flat on it at the sides and arched
    over the cord in the middle, a bar tack at each sewn end. Returns the stitch count."""
    B = FT.unit(np.cross(N, T))
    bs = np.linspace(-0.5 * BAND_W + 0.0012, 0.5 * BAND_W - 0.0012, 23)
    rr = CABLE_R + 0.0012
    hump = np.sqrt(np.clip(1.0 - (bs / rr) ** 2, 0.0, 1.0))
    h = 0.00012 + (2 * CABLE_R + 0.0002) * hump
    pts = FT.smooth_polyline(base + np.outer(bs, B) + np.outer(h, N), 2)
    ta = HC.tangents(pts)
    nrm = FT.unit(np.cross(T, ta))
    nrm = np.where((nrm @ N)[:, None] < 0, -nrm, nrm)
    FT.strip(V, F, pts, nrm, np.tile(T, (len(pts), 1)), 0.008, 0.0006)
    for sb in (-1.0, 1.0):
        HC.rbox(stV, stF, base + B * sb * (0.5 * BAND_W - 0.0032) + N * 0.001, [T, B, N], (0.0034, 0.0011, 0.00025),
                0.0002, step=0.0012)
    return 2


def _max_gap(P, surf):
    g = []
    for q in P:
        loc, nrm, _, _ = surf.find_nearest(Vector(q))
        if loc is not None:
            g.append(float(np.dot(q - np.array(loc), np.array(nrm))))
    return max(g) if g else 0.0


def _merge(parts):
    V, F, off = [], [], 0
    for Vp, Fp in parts:
        V.append(np.asarray(Vp, float))
        F += [tuple(i + off for i in f) for f in Fp]
        off += len(Vp)
    return np.vstack(V), F


def _recalc(ob):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def _poly_uv(ob):
    me = ob.data
    lay = me.uv_layers['pattern']
    for p in me.polygons:
        n = np.abs(np.array(p.normal))
        k = int(np.argmax(n))
        ax = [j for j in range(3) if j != k]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            lay.data[li].uv = (co[ax[0]], co[ax[1]])
