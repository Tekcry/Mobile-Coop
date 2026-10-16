"""Wren's plate carrier (step 08; SPEC 3.2, 3.5 and 5.1 Torso, ART-DIRECTION 2-5 and 8). Built by py/build_fitted.py
(DECISIONS A32): rigid and tensioned parts laid on the combat shirt by rays, not simulated; the shirt is then pressed in
under them (torso_common.compress, A33).

- Plate bags: slim front and back plates in Cordura bags, each a rigid curved slab (horizontal radius and vertical bow
  fitted to the shirt so it rests on the high points and bridges the hollows), rounded bound edges. The front is cut
  high with a shooter's cut, its top at the base of the throat but below the earpiece cable plug at the left collarbone
  (step 07); the back sits higher. Laser-cut laminate faces: horizontal slots 30 x 5.5 mm in rows 25.4 mm apart on the
  38 mm column pitch, the generic webbing standard (SPEC 3.2).
- Shoulder straps (the slim harness): padded 40 mm straps whose path is the convex hull of the shirt over the shoulder
  (a loaded strap runs straight between its anchors and bridges hollows), sewn to the back bag's face with a box-X,
  adjusted at the front through a polymer ladder lock on a 25 mm webbing tab coming out of the front bag's top edge;
  the tail rolled and held by an elastic keeper. Inner edges clear of the hood skirt and of the earpiece plug.
- Cummerbund: 140 mm wide elastic round the ribs, a tensioned band (Ring) from under the back bag's sides to under the
  front bag, where it closes on hook-and-loop under the front flap (the bag's lower front, bound, over the closure).
- Front: three flat rifle magazine pouches woven through the slots, each with its magazine, a shock-cord loop over the
  top and a pull tab; full pouches tip out at the bottom. Above them a zipped admin pouch, its top corners cut to the
  shooter's cut, with a pull loop.
- Left cummerbund: the radio pouch with the team radio (knobs, connector; its antenna bent down and held by an elastic
  loop); shock cord over the top. Right cummerbund: the medical pouch, pull tab and a quiet buckle.
- Back panel (rifle retention): a moulded butt cup low on the right, a bungee loop with a pull tab between two anchors
  at the top, and a flat padded drag handle along the top edge.
- Quick-release: a rubberised pull loop in a sleeve at the bottom centre of the front flap; its cable runs out of the
  sleeve into the bag through grommets.
"""
import math

import bmesh
import bpy
import numpy as np

import fitted as FT
import head_common as HC
import torso_common as TC
from torso_common import X, Y, Z

KIT = 'carrier'
KITS = ['carrierShoulders', 'cummerbund', 'magPouches', 'adminPouch', 'radioPouch', 'radio', 'medPouch', 'backPanel',
        'rifleBungee', 'carrierRelease']
METHOD = ('rigid plate bags fitted to the shirt, tensioned straps and cummerbund laid by rays; the shirt pressed in '
          'under them (no simulation)')
T_FRONT, T_BACK = 0.019, 0.017   # plate bag thickness (slim plates)
LAM = 0.0012                     # laser-cut laminate
STRAP_W = 0.040
CB_T = 0.004                     # cummerbund thickness
SINK = 0.0003
EDGE_DEFAULT = 0.05


class Parts:
    def __init__(self):
        self.d = {}

    def __call__(self, k):
        if k not in self.d:
            self.d[k] = ([], [], [])     # V, F, edge distance per vertex
        return self.d[k]

    def edge(self, k, vals=None):
        """Pads the part's edge list to its vertex count (vals: the edge distances of the vertices just added)."""
        V, _, E = self(k)
        n = len(V) - (len(vals) if vals is not None else 0)
        E.extend([EDGE_DEFAULT] * (n - len(E)))
        if vals is not None:
            E.extend(list(vals))


class Lifted(TC.Plate):
    """A plate map raised by `lift` (a flap on a bag's face)."""

    def __init__(self, base, lift):
        super().__init__(base.C, base.X, base.U, base.N, base.R, base.bow)
        self.lift = lift

    def S(self, x, y, h=0.0):
        return super().S(x, y, np.asarray(h, float) + self.lift)


def outline(W, wt, y_top, y_bot, cut_drop, r_bot=0.022, r_cut=0.012, r_top=0.008):
    P = np.array([(-W, y_bot), (W, y_bot), (W, y_top - cut_drop), (wt, y_top), (-wt, y_top), (-W, y_top - cut_drop)])
    return TC.densify_closed(TC.fillet(P, [r_bot, r_bot, r_cut, r_top, r_top, r_cut], seg=6), 0.005)


def frame(front, a):
    s, c = math.sin(a), math.cos(a)
    if front:
        return X, np.array([0.0, s, c]), np.array([0.0, -c, s])
    return -X, np.array([0.0, -s, c]), np.array([0.0, c, s])


def top_y(ol, x):
    near = np.abs(ol[:, 0] - x) < 0.004
    return float(ol[near & (ol[:, 1] > 0), 1].max())


def pframe(pl, x, y, h):
    e = 1e-4
    O = pl.S(x, y, h).reshape(3)
    Xp = FT.unit(pl.S(x + e, y, h).reshape(3) - pl.S(x - e, y, h).reshape(3))
    Up = FT.unit(pl.S(x, y + e, h).reshape(3) - pl.S(x, y - e, h).reshape(3))
    Np = FT.unit(np.cross(Xp, Up))
    return O, Xp, np.cross(Np, Xp), Np


def ring_frame(ring, t, z, h):
    O, Np = ring.at(t, z, h)
    Up = FT.unit(Z - Np * (Z @ Np))
    return O, FT.unit(np.cross(Up, Np)), Up, Np


class Pouch:
    """A soft box on a frame (O on the mounting face; Xp across, Up up, Np out): top edge at `top` above O, `hgt`
    tall, `d` deep; the front pillows out by `bulge`, the bottom tips out by `tip` (weight), the top narrows by
    `taper`. map(local) gives world points of box-local coordinates (x across, y from the top edge, z out)."""

    def __init__(self, O, Xp, Up, Np, w, hgt, d, top=0.0, r=0.006, bulge=0.003, tip=0.004, taper=0.0):
        self.O, self.A = O, np.array([Xp, Up, Np])
        self.w, self.h, self.d, self.top, self.r, self.bulge, self.tip, self.taper = w, hgt, d, top, r, bulge, tip, taper
        self.c_loc = np.array([0.0, top - hgt / 2, d / 2])

    def deform(self, L):
        L = np.array(L, float)
        hw, hh, hd = self.w / 2, self.h / 2, self.d / 2
        if self.taper:
            L[:, 0] *= 1 - self.taper * (np.clip(L[:, 1] / hh, -1, 1) + 1) / 2
        front = np.clip(L[:, 2] / hd, 0, 1)
        L[:, 2] += (self.bulge * front * np.clip(1 - (L[:, 0] / hw) ** 2, 0, 1)
                    * np.clip(1 - (L[:, 1] / hh) ** 2, 0, 1))
        L[:, 2] += self.tip * (hh - L[:, 1]) / self.h
        return L

    def build(self, V, F):
        c = self.O + self.c_loc @ self.A
        rng = HC.rbox(V, F, c, self.A, (self.w / 2, self.h / 2, self.d / 2), self.r, step=0.003, deform=self.deform)
        return TC.rbox_edge(V, rng, c, self.A, (self.w / 2, self.h / 2, self.d / 2))

    def map(self, L):
        """World points of box-local points (x, y from the top edge, z from the back face)."""
        L = np.atleast_2d(np.asarray(L, float)).copy()
        L = L - self.c_loc
        L = self.deform(L) + self.c_loc
        return self.O + L @ self.A


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    shirt = bpy.data.objects[f'{op}-combat_shirt-hero']
    base = bpy.data.objects[f'{op}-base_layer-hero']
    Vs, Fs = TC.mesh_world(shirt, dg)
    keep = [f for f in Fs if all(abs(Vs[i, 0]) < 0.2 for i in f)]
    zip_ob = bpy.data.objects.get(f'{op}-combat_shirt-zip')
    if zip_ob is not None:
        Vz, Fz = TC.mesh_world(zip_ob, dg)
        off = len(Vs)
        Vs = np.vstack([Vs, Vz])
        keep += [tuple(i + off for i in f) for f in Fz]
    torso = TC.bvh(Vs, keep)
    Vb_, Fb_ = TC.mesh_world(base, dg)
    under = TC.bvh(Vb_, Fb_)
    pt = Parts()
    stV, stF = [], []
    nst = 0
    meas = {}
    pressers = []                # (V, F) of every part's underside: the shirt is pressed in under them
    shV, shF = [], []

    # --- Plate bags: fitted rigid slabs ---------------------------------------------------------------------------
    def fit(front, z_top, z_bot, z_c, W, wt, cut):
        sgn = -1.0 if front else 1.0
        p0, _, _ = TC.ray(torso, (0.0, sgn * 0.5, z_c), (0.0, -sgn, 0.0), 1.0)
        best = None
        for a_deg in range(-12, 46, 3):
            a = math.radians(a_deg)
            Xa, U, N = frame(front, a)
            yt, yb = (z_top - z_c) / math.cos(a), (z_bot - z_c) / math.cos(a)
            ol = outline(W, wt, yt, yb, cut)
            gx, gy = np.meshgrid(np.linspace(-W + 0.005, W - 0.005, 13), np.linspace(yb + 0.005, yt - 0.005, 16))
            m = TC.inside(ol, np.stack([gx.ravel(), gy.ravel()], 1))
            xs, ys = gx.ravel()[m], gy.ravel()[m]
            for R in (0.25, 0.32, 0.42, 0.6):
                for bow in (0.0, 0.3, 0.6, 0.9):   # a plate's vertical curve is slight: 0.9 bows its ends back 6 mm
                    pl = TC.Plate(p0, Xa, U, N, R, bow)
                    P, Nn = pl.S(xs, ys), pl.normal(xs, ys)
                    g, miss = [], 0
                    for p, n in zip(P, Nn):
                        h, hn, t = TC.ray(torso, p + n * 0.25, -n, 0.5)
                        if h is None:
                            miss += 1
                            continue
                        g.append(t - 0.25 + TC.compressible(h, hn, under))
                    if len(g) < 10:
                        continue
                    g = np.array(g)
                    s = SINK - g.min()
                    score = float((g + s).mean()) + 0.03 * miss / len(P)
                    if best is None or score < best[0]:
                        best = (score, a, R, bow, ol)
        _, a, R, bow, ol = best
        Xa, U, N = frame(front, a)
        pl = TC.Plate(p0, Xa, U, N, R, bow)
        gx, gy = np.meshgrid(np.linspace(-W + 0.004, W - 0.004, 24), np.linspace(ol[:, 1].min() + 0.004,
                                                                                ol[:, 1].max() - 0.004, 30))
        m = TC.inside(ol, np.stack([gx.ravel(), gy.ravel()], 1))
        xs, ys = gx.ravel()[m], gy.ravel()[m]
        for _ in range(5):              # exact: shift along N until the closest point just presses in by SINK
            P, Nn = pl.S(xs, ys), pl.normal(xs, ys)
            need = []
            for p, n in zip(P, Nn):
                h, hn, t = TC.ray(torso, p + n * 0.25, -n, 0.5)
                if h is not None:
                    need.append((SINK - (t - 0.25 + TC.compressible(h, hn, under)), float(n @ N)))
            k = max(need, key=lambda q: q[0])
            pl = TC.Plate(pl.C + N * (k[0] / max(k[1], 0.5)), Xa, U, N, R, bow)
        gaps = np.array([-q[0] + SINK for q in need])
        return pl, ol, {'tiltDeg': round(math.degrees(a), 1), 'radiusM': R, 'bow': bow,
                        'gapMeanMm': round(float(gaps.mean()) * 1000, 1), 'gapMaxMm': round(float(gaps.max()) * 1000, 1)}

    W = 0.106
    plF, olF, meas['frontPlate'] = fit(True, 1.358, 1.085, 1.215, W, 0.038, 0.072)
    plB, olB, meas['backPlate'] = fit(False, 1.405, 1.100, 1.25, W, 0.076, 0.032)

    def bag(pl, ol, T, key, wear_bottom=True):
        V, F, E = pt(key)
        pt.edge(key)
        e0 = len(E)
        Pout, loc, ed = TC.slab(V, F, pl, ol, T, rr=0.008, rings=28, emit_edge=E)
        if wear_bottom:          # the scuffed bottom edge (SPEC 5.1 wear): the edge wear reaches further up there
            ybot = ol[:, 1].min()
            yy = np.concatenate([loc[..., 1].ravel(), loc[1:, :, 1].ravel()])
            Ee = np.array(E[e0:])
            E[e0:] = list(np.where(yy < ybot + 0.03, Ee * 0.4, Ee))
        # binding round the edge, stitched on the outer face
        rim = pl.S(ol[:, 0], ol[:, 1], 0.5 * T)
        rim = np.vstack([rim, rim[:1]])
        Vb, Fb, _ = pt('bind')
        FT.tube(Vb, Fb, rim, 0.5 * T + 0.0007, sides=10, closed=False, caps=False)
        pt.edge('bind')
        inset = FT.offset_closed(ol, -0.0045)
        q = pl.S(inset[:, 0], inset[:, 1], T + 0.0001)
        nq = pl.normal(inset[:, 0], inset[:, 1])
        n_ = FT.stitch_row(stV, stF, np.vstack([q, q[:1]]), np.vstack([nq, nq[:1]]))
        # presser (inner face) and shell (outer face) on a coarse grid
        gx, gy = np.meshgrid(np.arange(ol[:, 0].min(), ol[:, 0].max() + 1e-6, 0.006),
                             np.arange(ol[:, 1].min(), ol[:, 1].max() + 1e-6, 0.006))
        ins = TC.inside(ol, np.stack([gx.ravel(), gy.ravel()], 1)).reshape(gx.shape)
        Pin, Po = pl.S(gx, gy, 0.0), pl.S(gx, gy, T)
        pv, pf = [], []
        b0 = len(shV)
        shV.extend(list(Po.reshape(-1, 3)))
        pv.extend(list(Pin.reshape(-1, 3)))
        cols = gx.shape[1]
        for i in range(gx.shape[0] - 1):
            for j in range(cols - 1):
                if ins[i, j] and ins[i + 1, j] and ins[i, j + 1] and ins[i + 1, j + 1]:
                    f = (i * cols + j, i * cols + j + 1, (i + 1) * cols + j + 1, (i + 1) * cols + j)
                    pf.append(f)
                    shF.append(tuple(b0 + k for k in f))
        pressers.append((np.array(pv), pf))
        return n_

    nst += bag(plF, olF, T_FRONT, 'bag')
    nst += bag(plB, olB, T_BACK, 'bag')
    meas['frontTopZ'] = round(float(plF.S(0.0, olF[:, 1].max(), T_FRONT)[2]), 4)
    meas['backTopZ'] = round(float(plB.S(0.0, olB[:, 1].max(), T_BACK)[2]), 4)

    # laser-cut laminate on both faces (the front above the flap)
    yb_F = olF[:, 1].min()
    flap_top = yb_F + (1.15 - 1.085) / max(plF.U[2], 0.5)

    def laminate(pl, ol, T, y0, y1):
        V, F, _ = pt('lam')
        ins = FT.offset_closed(ol, -0.012)
        xs = np.arange(ol[:, 0].min() + 0.01, ol[:, 0].max() - 0.01 + 1e-6, 0.002)
        ys = np.arange(y0, y1 + 1e-6, 0.002)
        gx, gy = np.meshgrid(xs, ys)
        cx, cy = (gx[:-1, :-1] + gx[1:, 1:]) / 2, (gy[:-1, :-1] + gy[1:, 1:]) / 2
        # grid points outside the inset outline snap onto it: the laminate's cut edge follows the outline, not the grid
        dense = TC.densify_closed(ins, 0.0005)
        P2 = np.stack([gx.ravel(), gy.ravel()], 1)
        out = np.where(~TC.inside(ins, P2))[0]
        for k0 in range(0, len(out), 2000):
            ch = out[k0:k0 + 2000]
            d2 = ((P2[ch, None, :] - dense[None, :, :]) ** 2).sum(-1)
            P2[ch] = dense[np.argmin(d2, axis=1)]
        gx, gy = P2[:, 0].reshape(gx.shape), P2[:, 1].reshape(gy.shape)
        G = pl.S(gx, gy, T + LAM)
        Nn = pl.normal(gx, gy)
        solid = TC.inside(ins, np.stack([cx.ravel(), cy.ravel()], 1)).reshape(cx.shape)
        rows = np.arange(y0 + 0.014, y1 - 0.016, 0.0254)
        solid &= ~TC.slot_mask(cx, cy, rows, x_lim=float(np.abs(ins[:, 0]).max()) - 0.008)
        TC.perforated(V, F, G, Nn, solid, LAM + 0.0004)
        pt.edge('lam')
        return rows
    rowsF = laminate(plF, olF, T_FRONT, flap_top + 0.002, olF[:, 1].max())
    laminate(plB, olB, T_BACK, olB[:, 1].min(), olB[:, 1].max())

    # front flap over the cummerbund closure: the bag's lower front, bound, lifted on the face
    flap = Lifted(plF, T_FRONT + 0.0003)
    fol = TC.densify_closed(TC.fillet(np.array([(-W + 0.001, yb_F - 0.001), (W - 0.001, yb_F - 0.001),
                                                (W - 0.001, flap_top), (-W + 0.001, flap_top)]),
                                      [0.02, 0.02, 0.004, 0.004], seg=5), 0.005)
    V, F, E = pt('flap')
    pt.edge('flap')
    TC.slab(V, F, flap, fol, 0.0035, rr=0.0016, rings=14, emit_edge=E)
    q = flap.S(fol[:, 0] * 0.985, (fol[:, 1] - flap_top) * 0.95 + flap_top, 0.0036)
    nst += FT.stitch_row(stV, stF, q, flap.normal(fol[:, 0], fol[:, 1]))
    meas['flapTopZ'] = round(float(flap.S(0.0, flap_top, 0.0)[2]), 4)

    # quick-release: a rubber pull loop in a sleeve at the flap's bottom centre, the cable into the bag
    O, Xp, Up, Np = pframe(flap, 0.0, yb_F + 0.016, 0.0036)
    V, F, E = pt('flap')
    pt.edge('flap', TC.rbox_edge(V, HC.rbox(V, F, O + Np * 0.0035, [Xp, Up, Np], (0.026, 0.013, 0.0035), 0.002,
                                            step=0.003), O + Np * 0.0035, [Xp, Up, Np], (0.026, 0.013, 0.0035)))
    loop_pts = [O + Np * 0.0045 - Up * 0.005 + Xp * 0.009 * math.cos(a_) - Up * 0.013 * math.sin(a_)
                for a_ in np.linspace(0, math.pi, 13)]
    Vr, Fr, _ = pt('rubber')
    FT.tube(Vr, Fr, np.array(loop_pts), 0.0028, sides=10)
    pt.edge('rubber')
    for sx in (-1, 1):
        a0 = O + Np * 0.004 + Xp * sx * 0.024
        a1 = flap.S(sx * 0.05, yb_F + 0.02, 0.0036).reshape(3)
        cab = TC.resample(np.array([a0, (a0 + a1) / 2 + Np * 0.002, a1 + Np * 0.0015]), 0.004)
        FT.tube(Vr, Fr, FT.smooth_polyline(cab, 2), 0.0016, sides=8)
        pt.edge('rubber')
        Vm, Fm_, _ = pt('metal')
        FT.ring(Vm, Fm_, a1, flap.normal(sx * 0.05, yb_F + 0.02).reshape(3), 0.002, 0.0037, 0.0012)
        pt.edge('metal')

    # --- Shoulder straps (the slim harness) ----------------------------------------------------------------------
    hood_V = np.vstack([TC.mesh_world(bpy.data.objects[n], dg)[0] for n in (f'{op}-headwear-hood', f'{op}-headwear-hem')
                        if bpy.data.objects.get(n)])
    hood_V = hood_V[hood_V[:, 2] < 1.5]
    plug_ob = bpy.data.objects.get(f'{op}-head_kit-poly')
    plug_V = TC.mesh_world(plug_ob, dg)[0] if plug_ob else np.zeros((0, 3))
    plug_V = plug_V[(plug_V[:, 2] < 1.41) & (plug_V[:, 0] > 0.03) & (plug_V[:, 1] < -0.04)]
    strap_report = {}
    for sgn in (1.0, -1.0):
        side = 'L' if sgn > 0 else 'R'
        x_f, x_t, x_b = 0.094, 0.118, 0.094
        yF = top_y(olF, sgn * x_f)
        A_f = plF.S(sgn * x_f, yF - 0.003, 0.7 * T_FRONT).reshape(3)
        yB = top_y(olB, -sgn * x_b)
        A_b = plB.S(-sgn * x_b, yB - 0.036, T_BACK + LAM).reshape(3)
        qO, zO = 0.0, 1.24
        pts = [(-A_f[1], A_f[2]), (-A_b[1], A_b[2])]
        for dx in (-0.02, 0.0, 0.02):        # the bags' top edges and the back face under the pad end
            p = plF.S(sgn * x_f + dx, yF, 0.5 * T_FRONT + 0.0025).reshape(3)
            pts.append((-p[1], p[2]))
            for yy in np.linspace(yB - 0.036, yB, 6):
                p = plB.S(-sgn * x_b + dx, yy, T_BACK + LAM + (0.0025 if yy > yB - 0.004 else 0.0)).reshape(3)
                pts.append((-p[1], p[2]))
        ph_f = math.atan2(A_f[2] - zO, -A_f[1] - qO)
        ph_b = math.atan2(A_b[2] - zO, -A_b[1] - qO)
        phis = np.linspace(ph_f, ph_b, 90)

        def x_of(ph):
            return sgn * float(np.interp(ph, [ph_f, math.pi / 2, ph_b], [x_f, x_t, x_b]))
        for ph in phis:
            d3 = np.array([0.0, -math.cos(ph), math.sin(ph)])
            for dx in (-0.5 * STRAP_W, 0.0, 0.5 * STRAP_W):
                o = np.array([x_of(ph) + dx, -qO, zO]) + d3 * 0.35
                h, hn, _ = TC.ray(torso, o, -d3, 0.35)
                if h is None:
                    continue
                c = TC.compressible(h, hn, under)
                p = h - hn * c
                pts.append((-p[1], p[2]))
        pts.append((qO, zO - 0.1))
        hull = FT.hull2d(np.array(pts))
        iF = int(np.argmin(np.linalg.norm(hull - np.array([-A_f[1], A_f[2]]), axis=1)))
        iB = int(np.argmin(np.linalg.norm(hull - np.array([-A_b[1], A_b[2]]), axis=1)))
        chain = [hull[iF]]
        k = iF
        while k != iB:
            k = (k + 1) % len(hull)
            chain.append(hull[k])
        chain = np.array(chain)
        if chain[len(chain) // 2][1] < max(A_f[2], A_b[2]):   # went the wrong way round (under, via the centre)
            chain = [hull[iF]]
            k = iF
            while k != iB:
                k = (k - 1) % len(hull)
                chain.append(hull[k])
            chain = np.array(chain)
        c3 = np.array([[0.0, -q_, z_] for q_, z_ in chain])
        c3 = TC.resample(c3, 0.003)
        c3 = FT.smooth_polyline(c3, 3)
        ph = np.arctan2(c3[:, 2] - zO, -c3[:, 1] - qO)
        c3[:, 0] = [x_of(p_) for p_ in ph]
        P = c3
        T3 = TC.tangents(P)
        N3 = np.zeros_like(P)
        for i in range(len(P)):
            q2, z2 = -P[i, 1] - qO, P[i, 2] - zO
            n2 = np.array([0.0, -T3[i, 2], T3[i, 1]])     # perpendicular in the (y, z) plane
            if n2 @ np.array([0.0, -q2, z2]) < 0:
                n2 = -n2
            N3[i] = FT.unit(n2 - T3[i] * (n2 @ T3[i]))
        B3 = FT.unit(np.cross(N3, T3))
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        L = s[-1]
        sb = 0.03                                   # the ladder lock
        ib = int(np.searchsorted(s, sb))
        it = int(np.searchsorted(s, sb + 0.012))
        Vw, Fw, _ = pt('web')
        FT.strip(Vw, Fw, P[:it + 1] + N3[:it + 1] * 0.0002, N3[:it + 1], B3[:it + 1], 0.025, 0.0018)
        pt.edge('web')
        # pad from just above the buckle to the back end
        ip = int(np.searchsorted(s, sb + 0.006))
        Vp, Fp, Ep = pt('pad')
        pt.edge('pad')
        cols = 11
        top = TC.padded_strap(Vp, Fp, P[ip:], N3[ip:], B3[ip:], STRAP_W, 0.0075, 0.0035, cols=cols)
        sc = np.linspace(-0.5, 0.5, cols)
        pe = (0.5 - np.abs(sc)) * STRAP_W
        pt.edge('pad', list(np.tile(pe, len(P) - ip)) * 2)
        # edge stitching along the pad and a box-X where it is sewn to the back bag
        for cc in (1, cols - 2):
            nst += FT.stitch_row(stV, stF, top[:, cc] + N3[ip:] * 0.0001, N3[ip:])
        ie = int(np.searchsorted(s, L - 0.03)) - ip
        box = top[ie:, [1, cols - 2]]
        nb = N3[ip + ie:]
        corners = [box[0, 0], box[0, 1], box[-1, 1], box[-1, 0]]
        nc = [nb[0], nb[0], nb[-1], nb[-1]]
        for a_, b_ in ((0, 1), (1, 2), (2, 3), (3, 0), (0, 2), (1, 3)):
            seg = np.linspace(corners[a_], corners[b_], 12)
            nst += FT.stitch_row(stV, stF, seg + np.linspace(nc[a_], nc[b_], 12) * 0.0004, np.linspace(nc[a_], nc[b_], 12))
        # ladder lock, the tail folded back down over the tab, rolled and banded
        Vq, Fq, _ = pt('poly')
        cb = P[ib] + N3[ib] * 0.0035
        pt.edge('poly')
        HC.rbox(Vq, Fq, cb, [B3[ib], T3[ib], N3[ib]], (0.0165, 0.006, 0.0028), 0.0018, step=0.0015)
        HC.rbox(Vq, Fq, cb + N3[ib] * 0.0026 + T3[ib] * 0.002, [B3[ib], T3[ib], N3[ib]], (0.0135, 0.0018, 0.0009), 0.0007,
                step=0.0012)
        pt.edge('poly')
        i0 = int(np.searchsorted(s, sb - 0.022))
        FT.strip(Vw, Fw, P[i0:ib + 1] + N3[i0:ib + 1] * 0.0021, N3[i0:ib + 1], B3[i0:ib + 1], 0.0245, 0.0016)
        pt.edge('web')
        roll_c = P[i0] + N3[i0] * 0.0055
        FT.tube(Vw, Fw, [roll_c - B3[i0] * 0.0122, roll_c + B3[i0] * 0.0122], 0.0034, sides=12)
        pt.edge('web')
        ik = int(np.searchsorted(s, sb - 0.011))
        Ve, Fe, _ = pt('elastic')
        HC.rbox(Ve, Fe, P[ik] + N3[ik] * 0.0022, [B3[ik], T3[ik], N3[ik]], (0.0145, 0.0045, 0.0031), 0.0012, step=0.002)
        pt.edge('elastic')
        HC.rbox(stV, stF, A_f + N3[0] * (0.0012 + 0.0018), [B3[0], T3[0], N3[0]], (0.0105, 0.0016, 0.0004), 0.0003,
                step=0.0012)
        nst += 1
        # presser (underside) and shell
        Vpr, Fpr = [], []
        FT.strip(Vpr, Fpr, P, N3, B3, STRAP_W, 0.0002)
        pressers.append((np.array(Vpr), Fpr))
        b0 = len(shV)
        for i in range(0, len(P), 3):
            for sb_ in (-0.5, 0.5):
                shV.append(P[i] + B3[i] * sb_ * STRAP_W + N3[i] * 0.0075)
        m = len(range(0, len(P), 3))
        shF.extend([(b0 + 2 * i, b0 + 2 * i + 1, b0 + 2 * i + 3, b0 + 2 * i + 2) for i in range(m - 1)])
        allp = np.array(Vp[-(len(P) - ip) * cols * 2:])
        strap_report[side] = {
            'lengthM': round(float(L), 3),
            'hoodClearM': round(float(min(np.min(np.linalg.norm(hood_V - q_, axis=1)) for q_ in allp[::7])), 4),
            'innerEdgeTopX': round(float(abs(x_t) - STRAP_W / 2), 4),
            'plugClearM': (round(float(min(np.min(np.linalg.norm(plug_V - q_, axis=1)) for q_ in allp[::5])), 4)
                           if len(plug_V) else None),
        }
    meas['shoulderStraps'] = strap_report

    # --- Cummerbund ------------------------------------------------------------------------------------------------
    axis_y = -0.04
    zs = np.arange(1.105, 1.2451, 0.0035)
    th = np.radians(np.arange(-180.0, 180.0, 1.0))
    def under_bags(z):
        """The bags' inner faces at height z: the band runs straight from under a bag's side edge to the ribs (it
        bridges the air gap under a plate resting on the bust)."""
        pts = []
        for pl, ol in ((plF, olF), (plB, olB)):
            y = (z - pl.C[2]) / pl.U[2]
            if not (ol[:, 1].min() + 0.01 < y < ol[:, 1].max() - 0.01):
                continue
            for x in np.linspace(-W + 0.004, W - 0.004, 25):
                q = pl.S(x, y, -0.0006).reshape(3)
                pts.append((q[0], q[1] - axis_y))
        return np.array(pts)
    ring = TC.Ring(torso, under, axis_y, zs, th, extra=under_bags)
    meas['cummerbundMisses'] = ring.misses
    meas['cummerbundOutlierRays'] = ring.outliers

    def ang(p):
        return math.atan2(p[1] - axis_y, p[0])
    zc = 1.175
    eFL = ang(plF.S(W, (zc - 1.215) / plF.U[2], 0.0).reshape(3))
    eFR = ang(plF.S(-W, (zc - 1.215) / plF.U[2], 0.0).reshape(3))
    eBL = ang(plB.S(-W, (zc - 1.25) / plB.U[2], 0.0).reshape(3))
    eBR = ang(plB.S(W, (zc - 1.25) / plB.U[2], 0.0).reshape(3))
    ov = math.radians(14.0)
    bag_tree = TC.bvh(*_merge(pressers[:2]))
    cb = {}
    # left: from the front bag's edge (about -55 deg) round the side (0) to the back bag's (+55); right: from the back
    # bag's edge (about +125 deg) round through 180 to the front's (-125)
    for side in ('L', 'R'):
        if side == 'L':
            js = np.where((th >= eFL - ov) & (th <= eBL + ov))[0]
        else:
            js = np.concatenate([np.where(th >= eBR - ov)[0], np.where(th <= eFR + ov)[0]])
        G = ring.G[:, js].copy()
        Nn = ring.Nn[:, js].copy()
        # under the bags: the band slides in under them (its outer face below their inner face)
        tucked = 0
        for i in range(G.shape[0]):
            for j in range(G.shape[1]):
                h, _, t = TC.ray(bag_tree, G[i, j] - Nn[i, j] * 0.003, Nn[i, j], 0.03)
                if h is not None and t - 0.003 < CB_T + 0.0005:
                    G[i, j] -= Nn[i, j] * (CB_T + 0.0005 - (t - 0.003))
                    tucked += 1
        V, F, _ = pt('elastic')
        pt.edge('elastic')
        Gout = TC.band_slab(V, F, G, Nn, CB_T)
        pt.edge('elastic')
        for ii in (1, G.shape[0] - 2):
            nst += FT.stitch_row(stV, stF, Gout[ii] + Nn[ii] * 0.0001, Nn[ii])
        Vpr, Fpr = [], []
        R_, C_ = G.shape[:2]
        Vpr.extend(list(G.reshape(-1, 3)))
        Fpr.extend([(i * C_ + j, i * C_ + j + 1, (i + 1) * C_ + j + 1, (i + 1) * C_ + j)
                    for i in range(R_ - 1) for j in range(C_ - 1)])
        pressers.append((np.array(Vpr), Fpr))
        b0 = len(shV)
        sub = Gout[::4, ::3]
        shV.extend(list(sub.reshape(-1, 3)))
        r2, c2 = sub.shape[:2]
        shF.extend([(b0 + i * c2 + j, b0 + i * c2 + j + 1, b0 + (i + 1) * c2 + j + 1, b0 + (i + 1) * c2 + j)
                    for i in range(r2 - 1) for j in range(c2 - 1)])
        cb[side] = {'arcM': round(TC.path_length(Gout[len(zs) // 2]), 3), 'tuckedVerts': tucked}
    meas['cummerbund'] = cb

    # --- Front pouches: three magazine pouches, the admin pouch ----------------------------------------------------
    hF = T_FRONT + LAM + 0.0003
    y_mtop = flap_top + (1.245 - 1.15) / plF.U[2]
    mag_xs = (-0.071, 0.0, 0.071)
    Vpo, Fpo, Epo = pt('pouch')
    for mx in mag_xs:
        O, Xp, Up, Np = pframe(plF, mx, y_mtop, hF)
        pch = Pouch(O, Xp, Up, Np, 0.066, y_mtop - flap_top - 0.002, 0.03, r=0.006, bulge=0.0025, tip=0.004)
        pt.edge('pouch')
        pt.edge('pouch', pch.build(Vpo, Fpo))
        # binding along the top, stitch rows down the front edges
        top_line = pch.map([(x_, -0.0015, pch.d) for x_ in np.linspace(-0.031, 0.031, 16)])
        Vb, Fb, _ = pt('bind')
        FT.tube(Vb, Fb, top_line, 0.0016, sides=8)
        pt.edge('bind')
        for sx in (-1, 1):
            ln = pch.map([(sx * 0.03, -y_, pch.d + 0.0002) for y_ in np.linspace(0.006, pch.h - 0.008, 20)])
            nst += FT.stitch_row(stV, stF, ln, np.tile(Np, (len(ln), 1)))
        # the magazine standing 36 mm proud, ribbed, feed lips; shock cord over the top with a pull tab
        mag_h, mag_up = 0.08, 0.036
        mc = pch.map([(0.0, mag_up - mag_h / 2, pch.d / 2)])[0]
        Vg, Fg, _ = pt('mag')
        HC.rbox(Vg, Fg, mc, [Xp, Up, Np], (0.0305, mag_h / 2, 0.0112), 0.003, step=0.003)
        for ry in (0.012, 0.024):
            HC.rbox(Vg, Fg, pch.map([(0.0, ry, pch.d / 2 + 0.0112)])[0], [Xp, Up, Np], (0.026, 0.0012, 0.0008), 0.0006,
                    step=0.0015)
        HC.rbox(Vg, Fg, pch.map([(0.0, mag_up + 0.002, pch.d / 2)])[0], [Xp, Up, Np], (0.017, 0.0025, 0.0085), 0.0015,
                step=0.0015)
        pt.edge('mag')
        cord = pch.map([(-0.033, -0.006, 0.006), (-0.031, 0.01, pch.d / 2), (-0.02, mag_up + 0.0055, pch.d / 2),
                        (0.0, mag_up + 0.006, pch.d / 2), (0.02, mag_up + 0.0055, pch.d / 2), (0.031, 0.01, pch.d / 2),
                        (0.033, -0.006, 0.006)])
        Vc, Fc, _ = pt('cord')
        FT.tube(Vc, Fc, FT.smooth_polyline(TC.resample(cord, 0.003), 2), 0.0016, sides=8)
        pt.edge('cord')
        tab_c = pch.map([(0.0, mag_up - 0.005, pch.d / 2 + 0.0112 + 0.0012)])[0]
        Vw, Fw, _ = pt('web')
        HC.rbox(Vw, Fw, tab_c, [Xp, Up, Np], (0.009, 0.012, 0.0009), 0.0007, step=0.002)
        pt.edge('web')
        Vm, Fm_, _ = pt('metal')
        for sx in (-1, 1):
            FT.ring(Vm, Fm_, pch.map([(sx * 0.0335, -0.006, 0.006)])[0], Xp * sx, 0.0018, 0.0033, 0.001)
        pt.edge('metal')
    # admin pouch: top corners cut to the shooter's cut, zip along the top with a pull loop
    y_atop = olF[:, 1].max() - 0.008 / plF.U[2]
    O, Xp, Up, Np = pframe(plF, 0.0, y_atop, hF)
    a_h = (1.35 - 1.287) / plF.U[2]
    adm = Pouch(O, Xp, Up, Np, 0.15, a_h, 0.018, r=0.005, bulge=0.002, tip=0.001, taper=0.36)
    pt.edge('pouch')
    pt.edge('pouch', adm.build(Vpo, Fpo))
    zy = -0.009
    wz = 0.15 * (1 - 0.36 * (((a_h / 2 + zy) / (a_h / 2)) + 1) / 2) / 2 - 0.012
    Vz, Fz, _ = pt('zip')
    zl = adm.map([(x_, zy, adm.d + 0.0004) for x_ in np.linspace(-wz, wz, 40)])
    for i in range(len(zl) - 1):
        HC.rbox(Vz, Fz, (zl[i] + zl[i + 1]) / 2, [Xp, Up, Np], (np.linalg.norm(zl[i + 1] - zl[i]) / 2, 0.0022, 0.0007),
                0.0004, step=0.004)
    pt.edge('zip')
    sl = adm.map([(wz * 0.55, zy, adm.d + 0.0022)])[0]
    Vs_, Fs_, _ = pt('slider')
    HC.rbox(Vs_, Fs_, sl, [Xp, Up, Np], (0.006, 0.0045, 0.0018), 0.0012, step=0.0015)
    pt.edge('slider')
    Vc, Fc, _ = pt('cord')
    pl_loop = [sl + Np * 0.002 + Xp * 0.003 * math.cos(a_) - Up * (0.004 + 0.012 * math.sin(a_ / 2)) for a_ in
               np.linspace(0, 2 * math.pi, 17)]
    FT.tube(Vc, Fc, np.array(pl_loop), 0.0012, sides=6)
    pt.edge('cord')
    for sx in (-1, 1):
        ln = adm.map([(sx * (0.15 * (1 - 0.36 * ((-y_ + a_h / 2) / a_h)) / 2 - 0.003), -y_, adm.d + 0.0002)
                      for y_ in np.linspace(0.008, a_h - 0.006, 14)])
        nst += FT.stitch_row(stV, stF, ln, np.tile(Np, (len(ln), 1)))
    meas['adminZ'] = [round(float(adm.map([(0, -a_h, 0)])[0][2]), 4), round(float(adm.map([(0, 0, 0)])[0][2]), 4)]
    meas['magTopZ'] = round(float(pch.map([(0, mag_up, 0)])[0][2]), 4)

    # --- Radio pouch (left) and medical pouch (right) on the cummerbund ------------------------------------------
    hC = CB_T + 0.0003
    O, Xp, Up, Np = ring_frame(ring, math.radians(8.0), zc + 0.052, hC)
    rad = Pouch(O, Xp, Up, Np, 0.062, 0.1, 0.034, r=0.006, bulge=0.002, tip=0.005)
    pt.edge('pouch')
    pt.edge('pouch', rad.build(Vpo, Fpo))
    Vg, Fg, _ = pt('radio')
    r_up = 0.024
    rc = rad.map([(0.0, r_up - 0.06, rad.d / 2)])[0]
    HC.rbox(Vg, Fg, rc, [Xp, Up, Np], (0.0285, 0.06, 0.0152), 0.004, step=0.003)
    for kx, kr in ((-0.012, 0.0062), (0.008, 0.0045)):        # channel and volume knobs
        HC.knurl(Vg, Fg, rad.map([(kx, r_up + 0.006, rad.d / 2 - 0.003)])[0], Up, kr, 0.01, ridges=18)
    HC.rbox(Vg, Fg, rad.map([(0.019, r_up + 0.003, rad.d / 2 + 0.004)])[0], [Xp, Up, Np], (0.005, 0.004, 0.005),
            0.0015, step=0.0015)                              # the cable connector (radio cable: step 09)
    pt.edge('radio')
    # antenna: up from the top, bent down along the pouch's rear edge, an elastic loop holds it
    base_a = rad.map([(-0.02, r_up + 0.002, rad.d * 0.2)])[0]
    ant = [base_a, base_a + Up * 0.012]
    for a_ in np.linspace(0, math.pi, 9)[1:]:
        ant.append(base_a + Up * (0.012 + 0.009 * math.sin(a_)) - Xp * 0.009 * (1 - math.cos(a_)) * 0.5 - Np * 0.0)
    tail = rad.map([(-0.036, y_, rad.d * 0.25) for y_ in np.linspace(0.0, -0.085, 12)])
    ant = np.vstack([np.array(ant), tail])
    ant = FT.smooth_polyline(TC.resample(ant, 0.003), 3)
    Vr, Fr, _ = pt('rubber')
    FT.tube(Vr, Fr, ant, 0.0028, sides=10)
    pt.edge('rubber')
    Ve, Fe, _ = pt('elastic')
    HC.rbox(Ve, Fe, rad.map([(-0.033, -0.07, rad.d * 0.25)])[0], [Xp, Up, Np], (0.0055, 0.005, 0.0062), 0.0018, step=0.002)
    pt.edge('elastic')
    cord = rad.map([(-0.033, -0.006, 0.006), (-0.03, r_up + 0.004, rad.d / 2), (0.0, r_up + 0.0175, rad.d / 2),
                    (0.03, r_up + 0.004, rad.d / 2), (0.033, -0.006, 0.006)])
    Vc, Fc, _ = pt('cord')
    FT.tube(Vc, Fc, FT.smooth_polyline(TC.resample(cord, 0.003), 2), 0.0016, sides=8)
    pt.edge('cord')
    meas['radioPouchZ'] = round(float(O[2]), 4)

    O, Xp, Up, Np = ring_frame(ring, math.radians(172.0), zc + 0.048, hC)
    med = Pouch(O, Xp, Up, Np, 0.07, 0.095, 0.04, r=0.008, bulge=0.004, tip=0.005)
    pt.edge('pouch')
    pt.edge('pouch', med.build(Vpo, Fpo))
    # lid strap over the top down the front to a quiet buckle; pull tab on top
    strap = med.map([(0.0, -0.018, 0.004), (0.0, 0.004, 0.012), (0.0, 0.006, med.d * 0.6), (0.0, 0.002, med.d + 0.002),
                     (0.0, -0.02, med.d + 0.0045)])
    strap = FT.smooth_polyline(TC.resample(strap, 0.003), 2)
    Tq = TC.tangents(strap)
    Nq = FT.unit(np.cross(Tq, np.tile(Xp, (len(strap), 1))))
    Nq = np.where((Nq @ Np)[:, None] + (Nq @ Up)[:, None] < 0, -Nq, Nq)
    Vw, Fw, _ = pt('web')
    FT.strip(Vw, Fw, strap, Nq, np.tile(Xp, (len(strap), 1)), 0.02, 0.0016)
    pt.edge('web')
    Vq, Fq, _ = pt('poly')
    bc = med.map([(0.0, -0.032, med.d + 0.0055)])[0]
    HC.rbox(Vq, Fq, bc, [Xp, Up, Np], (0.012, 0.011, 0.0032), 0.0018, step=0.0015)
    HC.rbox(Vq, Fq, bc - Up * 0.016, [Xp, Up, Np], (0.0085, 0.006, 0.0026), 0.0015, step=0.0015)
    pt.edge('poly')
    tab = med.map([(0.012, 0.004, med.d * 0.45)])[0]
    HC.rbox(Vw, Fw, tab + Up * 0.006, [Xp, Np, Up], (0.007, 0.0008, 0.008), 0.0006, step=0.002)
    pt.edge('web')

    # --- Back panel: drag handle, bungee loop with a pull tab, butt cup ----------------------------------------------
    hB = T_BACK + LAM + 0.0003
    yBt = olB[:, 1].max()
    O, Xp, Up, Np = pframe(plB, 0.0, yBt - 0.016, hB)
    Vp, Fp, _ = pt('pad')
    pt.edge('pad')
    hc = O + Np * 0.004
    pt.edge('pad', TC.rbox_edge(Vp, HC.rbox(Vp, Fp, hc, [Xp, Up, Np], (0.05, 0.011, 0.004), 0.0035, step=0.003), hc,
                                [Xp, Up, Np], (0.05, 0.011, 0.004)))
    for sx in (-1, 1):
        HC.rbox(stV, stF, O + Xp * sx * 0.06 + Np * 0.0012, [Xp, Up, Np], (0.0016, 0.0095, 0.0004), 0.0003, step=0.0012)
        Vw, Fw, _ = pt('web')
        HC.rbox(Vw, Fw, O + Xp * sx * 0.059 + Np * 0.001, [Xp, Up, Np], (0.009, 0.0125, 0.0009), 0.0006, step=0.002)
        pt.edge('web')
        nst += 1
    ya = yBt - 0.05
    anchors = []
    for sx in (-1, 1):
        Oa, Xa_, Ua, Na = pframe(plB, sx * 0.05, ya, hB)
        Vq, Fq, _ = pt('poly')
        HC.rbox(Vq, Fq, Oa + Na * 0.003, [Xa_, Ua, Na], (0.008, 0.0065, 0.003), 0.002, step=0.0015)
        pt.edge('poly')
        anchors.append(Oa + Na * 0.0035)
    mid = pframe(plB, 0.0, ya - 0.008, hB)
    bung = TC.resample(np.array([anchors[0], (anchors[0] + mid[0]) / 2 + mid[3] * 0.003, mid[0] + mid[3] * 0.003,
                                 (anchors[1] + mid[0]) / 2 + mid[3] * 0.003, anchors[1]]), 0.003)
    Vc, Fc, _ = pt('cord')
    FT.tube(Vc, Fc, FT.smooth_polyline(bung, 3), 0.0022, sides=8)
    pt.edge('cord')
    Vw, Fw, _ = pt('web')
    HC.rbox(Vw, Fw, mid[0] + mid[3] * 0.0055 - mid[2] * 0.008, [mid[1], mid[2], mid[3]], (0.008, 0.011, 0.0009), 0.0006,
            step=0.002)
    pt.edge('web')
    # butt cup low on the right (back local +x is the wearer's right), a moulded polymer cup with a dished top
    yc = olB[:, 1].min() + 0.032
    O, Xp, Up, Np = pframe(plB, 0.045, yc, hB)

    def dish(L):
        L = L.copy()
        w_ = np.clip(1 - (L[:, 0] / 0.022) ** 2, 0, 1) * np.clip(1 - ((L[:, 2]) / 0.012) ** 2, 0, 1)
        top = L[:, 1] > 0.012
        L[top, 1] -= 0.016 * w_[top]
        return L
    Vq, Fq, _ = pt('poly')
    HC.rbox(Vq, Fq, O + Np * 0.017, [Xp, Up, Np], (0.028, 0.02, 0.016), 0.006, step=0.002, deform=dish)
    pt.edge('poly')
    for sx in (-1, 1):
        Vm, Fm_, _ = pt('metal')
        HC.taper(Vm, Fm_, [O + Xp * sx * 0.021 - Up * 0.012 + Np * 0.0005, O + Xp * sx * 0.021 - Up * 0.012 + Np * 0.0028],
                 0.0032, 0.0029, sides=10)
        pt.edge('metal')

    # --- The shirt pressed in under the carrier ------------------------------------------------------------------------
    follow = [shirt] + [o for o in (bpy.data.objects.get(f'{op}-combat_shirt-stitches'), zip_ob,
                                    bpy.data.objects.get(f'{op}-combat_shirt-zip-slider')) if o is not None]
    allP = np.vstack([v for v, _ in pressers])
    meas['shirtPress'] = TC.compress(follow, [TC.bvh(v, f) for v, f in pressers], under, cap=0.0025,
                                     region=(allP.min(axis=0), allP.max(axis=0)))

    # --- Objects ---------------------------------------------------------------------------------------------------
    cord_m = bpy.data.materials.get('shock cord') or MAT.rubber('shock cord', rough=0.8)
    mats = {
        'bag': reuse(MAT.cordura, 'cordura'), 'flap': reuse(MAT.cordura, 'cordura'),
        'pouch': reuse(MAT.cordura, 'cordura'), 'pad': reuse(MAT.cordura, 'cordura'),
        'lam': reuse(MAT.laminate, 'laser-cut laminate'), 'bind': reuse(MAT.webbing, 'binding'),
        'web': reuse(MAT.webbing, 'harness webbing', colour=(0.023, 0.024, 0.024)),
        'elastic': reuse(MAT.elastic, 'cummerbund elastic'),
        'poly': reuse(MAT.polymer, 'kit polymer', colour=(0.023, 0.023, 0.024), rough=0.68),
        'mag': reuse(MAT.polymer, 'kit polymer', colour=(0.023, 0.023, 0.024), rough=0.68),
        'radio': reuse(MAT.polymer, 'kit polymer', colour=(0.023, 0.023, 0.024), rough=0.68),
        'metal': reuse(MAT.painted_metal, 'hardware metal'), 'cord': cord_m,
        'rubber': reuse(MAT.rubber, 'cable jacket', colour=(0.022, 0.022, 0.023), rough=0.72),
        'zip': bpy.data.materials.get('zip teeth') or reuse(MAT.polymer, 'kit polymer'),
        'slider': bpy.data.materials.get('zip slider') or reuse(MAT.painted_metal, 'hardware metal'),
    }
    objs = []
    for key, (V, F, E) in pt.d.items():
        if not F:
            continue
        pt.edge(key)
        ob = FT.add_mesh(scene, f'{op}-carrier-{key}', V, F, mats[key], smooth=True, uv=TC.box_uv(V, F),
                         attrs={'edge': np.asarray(E[:len(V)], float), 'wear': np.zeros(len(V))})
        if key != 'lam':         # the laminate is an open sheet built facing out (TC.perforated)
            _recalc(ob)
        else:                    # smooth face, crisp slot walls (flat facets on a curve read as a plaid of shading)
            ob.data.shade_smooth()
            ob.data.set_sharp_from_angle(angle=math.radians(45.0))
        objs.append(ob)
    st = FT.add_mesh(scene, f'{op}-carrier-stitches', stV, stF, reuse(MAT.thread, 'thread'))
    st.visible_shadow = False
    objs.append(st)
    return {
        'shell': (np.array(shV), shF),
        'objects': objs,
        'kits': KITS,
        'measurements': meas,
        'report': {'stitches': nst, 'parts': {k: len(v[1]) for k, v in pt.d.items()}},
    }


def _merge(parts):
    V, F, off = [], [], 0
    for Vp, Fp in parts:
        V.append(np.asarray(Vp, float))
        F += [tuple(i + off for i in f) for f in Fp]
        off += len(Vp)
    return np.vstack(V), F


def _recalc(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
