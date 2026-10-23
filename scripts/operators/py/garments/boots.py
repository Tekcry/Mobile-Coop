"""Wren's boots (step 06; SPEC 3.1 Boots, ART-DIRECTION 3: low-profile tactical, soft quiet soles, matte leather and
suede, short ankle). Built by py/build_fitted.py (DECISIONS A18): a parametric hard model sized from the body's foot.

The last: rings lofted round the foot and ankle, each the convex hull of the foot (and the base-layer leggings) in its
plane plus a wall clearance - vertical planes from the toe back to the throat, a fan of planes pivoting in front of
the throat round the heel, horizontal planes up the shaft - then a rounded toe box with toe room, smoothed along the
loft, pushed clear of the skin and flattened onto the sole. The top ends in a padded collar rolled over the lining.
Panels on the last: rubber rand round the bottom (rising over the toe and heel), suede toe cap, heel counter and
eyestays, nylon quarters, a recessed padded tongue, a padded collar. Twin stitch rows on the eyestays and the counter,
single rows elsewhere; the rand is moulded and glued (no stitch).
Hardware: four eyelets and two speed hooks a side (painted metal), criss-crossed laces lying over the tongue up to a
lace garage pocket at the tongue top (the bow tucked inside), a webbing pull loop at the heel (box-X stitched).
Sole: a cupped rubber unit with a toe spring, a heel bevel and a midsole groove; quiet low lugs (3.5 mm, chevron rows),
a recessed arch and a transverse heel-brake bar.
Wear ('wear' attribute): scuffed toe rand and toe cap, a scuffed heel; two shallow flex creases across the forefoot;
dust packs into the lugs through the rubber's ambient-occlusion dust.

Guard bake (docs/guard-models PLAN G2): run as the main script by guard-bake.mjs, it hands the job to guard_garment.py,
which calls configure() on a copy of this module (bottom of this file): the same boot sized from the guard's foot, a
taller shaft. Wren's boot is untouched while configure() has not been called.
"""
if __name__ == '__main__':   # guard bake job: py/ and py/garments/ on the path before the imports below
    import os as _os
    import sys as _sys
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _sys.path[:0] = [_here, _os.path.dirname(_here)]
import math

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import fitted as FT

KIT = 'boots'
METHOD = 'parametric hard model: a last lofted from the foot (convex section hulls plus clearance), a moulded sole'
N_RING = 84
CLEAR = 0.0045       # wall clearance off the skin and the base layer
TOE_ROOM = 0.014     # in front of the toes (plus the wall clearance); r2: longer so the plan can taper past the toes
TOE_RAISE = 0.008    # toe-box height added over the ball (fix 2: the bare foot is flat, the toe read as a duck bill)
LIFT = {'rand': 0.0008, 'toecap': 0.0009, 'counter': 0.0010, 'eyestay': 0.0014, 'tongue': -0.0012, 'collar': 0.0009,
        'quarter': 0.0}
SLOT = {'quarter': 0, 'tongue': 0, 'collar': 0, 'toecap': 1, 'counter': 1, 'eyestay': 1, 'rand': 2}
PRIO = {'rand': 7, 'tongue': 6, 'eyestay': 5, 'collar': 4, 'toecap': 3, 'counter': 2, 'quarter': 1}
TWIN = {'eyestay', 'counter'}
GUARD = False        # configure(): the guard bake (a measurement fallback in build_foot; never set on Wren's path)
Z_TOP = 0.155        # x s: the shaft's top above the floor (configure() raises it for the guards' field boot)


class Frame:
    """Foot-local coordinates: s along the foot from the heel back, w lateral (outward), z up (world z)."""

    def __init__(self, P, sgn):
        low = P[P[:, 2] < 0.03]
        self.c = low[:, :2].mean(axis=0)
        ev, evec = np.linalg.eigh(np.cov((low[:, :2] - self.c).T))
        f = evec[:, int(np.argmax(ev))]
        if f[1] > 0:
            f = -f   # the model faces -y: the toes are at -y
        lat = np.array([-f[1], f[0]])
        if lat[0] * sgn < 0:
            lat = -lat
        self.f, self.lat = f, lat
        self.s0 = 0.0
        self.s0 = float(self.local(P[P[:, 2] < 0.08])[:, 0].min())

    def local(self, P):
        P = np.atleast_2d(P)
        d = P[:, :2] - self.c
        return np.stack([d @ self.f - self.s0, d @ self.lat, P[:, 2]], axis=1)

    def world(self, Q):
        Q = np.atleast_2d(Q)
        xy = self.c + np.outer(Q[:, 0] + self.s0, self.f) + np.outer(Q[:, 1], self.lat)
        return np.column_stack([xy, Q[:, 2]])


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _guard_surface_points(body, z_max, step=0.002):
    """Guard mode only. Wren's body is subdivided, so its vertices sample the skin densely; a guard body is the bare
    game mesh (~9k vertices, rows 2-3 cm apart up the shin), so the loft's 3.5 mm section slabs miss whole vertex rows
    and the shaft rings come out partial or stop short of the top (smoke run: top girth 11-13 cm, Wren 24 cm). Points on
    the evaluated body's triangles below z_max, at most `step` apart."""
    import bpy
    dg = bpy.context.evaluated_depsgraph_get()
    ob = body.evaluated_get(dg)
    me = ob.to_mesh()
    me.calc_loop_triangles()
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    tri = np.zeros(len(me.loop_triangles) * 3, int)
    me.loop_triangles.foreach_get('vertices', tri)
    ob.to_mesh_clear()
    M = np.array(body.matrix_world)
    V = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    P = V[tri.reshape(-1, 3)]
    P = P[P[:, :, 2].min(axis=1) < z_max]
    edge = np.max(np.linalg.norm(P - np.roll(P, 1, axis=1), axis=2), axis=1)
    n_t = np.maximum(1, np.ceil(edge / step)).astype(int)
    out = []
    for n in np.unique(n_t):
        ij = np.array([(i, j) for i in range(n + 1) for j in range(n + 1 - i)], float) / n
        bary = np.column_stack([ij, 1.0 - ij.sum(axis=1)])
        out.append(np.einsum('bk,tkd->tbd', bary, P[n_t == n]).reshape(-1, 3))
    D = np.vstack(out)
    return D[D[:, 2] < z_max]


def build_foot(ctx, side, out, store):
    J, skin = ctx['J'], ctx['skin']
    sc = ctx['H'] / 1.68
    z_top = Z_TOP * sc
    sgn = float(np.sign(J[f'an{side}'][0]))
    BVE = ctx['BVE']
    sel = (BVE[:, 2] < z_top + 0.04) & (BVE[:, 0] * sgn > 0.04) & (BVE[:, 0] * sgn < 0.32)
    PC = BVE[sel]
    if GUARD:   # the guard body is a game mesh with no subdivision: sample its faces (see _guard_surface_points)
        D = _guard_surface_points(ctx['body'], z_top + 0.04)
        PC = np.vstack([PC, D[(D[:, 0] * sgn > 0.04) & (D[:, 0] * sgn < 0.32)]])
    bl = next(((V, F) for u, V, F in ctx['layers'] if u in ('suit', 'base_layer')), None)
    if bl is not None:
        Vb = bl[0]
        PC = np.vstack([PC, Vb[(Vb[:, 2] < z_top + 0.04) & (Vb[:, 0] * sgn > 0.04) & (Vb[:, 0] * sgn < 0.32)]])
    fr = Frame(BVE[sel], sgn)
    LP = fr.local(PC)
    L = float(LP[LP[:, 2] < 0.05, 0].max())

    def front(z):
        m = (np.abs(LP[:, 2] - z) < 0.004) & (LP[:, 0] < L * 0.6)
        return float(LP[m, 0].max())

    def top_at(s):
        m = np.abs(LP[:, 0] - s) < 0.004
        return float(LP[m, 2].max()) if m.any() else 0.0
    s_Q = front(0.09 * sc) + 0.028
    z_Q = max(top_at(s_Q) + 0.03, 0.085 * sc)

    def ring(O, e2, m, extra=None, add=None):
        """The section in the plane through O (s, z) spanned by the lateral axis and e2 (s, z): the convex hull of the
        foot points within 3.5 mm of it, offset by the clearance, resampled from the +e2 (bottom / back) point."""
        sz = LP[:, [0, 2]] - O
        dist = sz @ m
        r = sz @ e2
        msk = (np.abs(dist) < 0.0035) & (r > -0.002) & (np.abs(LP[:, 1]) < 0.09)
        if extra is not None:
            msk &= extra
        pts = np.stack([LP[msk, 1], r[msk]], axis=1)
        if add is not None:
            pts = np.vstack([pts, add])
        if len(pts) < 6:
            return None
        h = FT.hull2d(pts)
        if len(h) < 3:
            return None
        dense = FT.resample_closed(h, 200)
        off = FT.offset_closed(dense, CLEAR)
        return FT.resample_closed(off, N_RING, start_dir=(0.0, 1.0))

    rings = []   # (2D ring (w, r), origin O (s, z), e2)
    down, back = np.array([0.0, -1.0]), np.array([-1.0, 0.0])
    # The toe box (step 06 fix 2): from the ball forward the ball section (with its clearance) is mapped onto a rounded,
    # slightly asymmetric toe - superellipses in plan round a toe point a third of the way to the medial edge (the
    # medial side straighter, the lateral side rounder) and an ellipse in side view, so the toe height falls toward
    # the tip. The bare toes (measured on Wren: 2.0-2.6 cm high, tapering to the big toe) stay inside with the clearance;
    # rings are dense near the tip so the nose closes round, not on a flat face.
    s_ball = 0.7 * L
    s_tip = L + TOE_ROOM + CLEAR
    rg_ball = ring(np.array([s_ball, z_Q]), down, np.array([1.0, 0.0]), LP[:, 2] < z_Q + 0.01)
    w_mid = 0.5 * (rg_ball[:, 0].min() + rg_ball[:, 0].max())
    w_tip = w_mid + 0.3 * (rg_ball[:, 0].min() - w_mid)       # medial is -w (lat points outward on both feet)
    z_nb = 0.014                                              # the nose closes at this height (inside the rand)
    z_b = z_Q - rg_ball[:, 1]
    z_b = z_b + TOE_RAISE * np.clip((z_b - z_nb) / (z_b.max() - z_nb), 0.0, 1.0)
    toe_pts = LP[(LP[:, 0] > s_ball) & (LP[:, 2] < z_Q + 0.01)]
    for v_ in np.linspace(0.975, 0.0, 40):
        u = 1.0 - (1.0 - v_) ** 1.5                           # dense near the tip, 3 mm apart at the ball
        s = s_ball + u * (s_tip - s_ball)
        kM = max(1 - u ** 2.0, 0.0) ** (1 / 2.0)             # r2 item 3: tapered plan (was 2.6, a square toe)
        kL = max(1 - u ** 1.7, 0.0) ** (1 / 1.7)
        kH = math.sqrt(max(1 - u * u, 0.0))
        w2 = w_tip + (rg_ball[:, 0] - w_tip) * np.where(rg_ball[:, 0] < w_tip, kM, kL)
        z2 = np.where(z_b > z_nb, z_nb + (z_b - z_nb) * kH, z_b)
        # never inside the toes: grow the section where a toe point (plus clearance) would poke through
        near = toe_pts[np.abs(toe_pts[:, 0] - s) < 0.0025]
        if len(near):
            g = 1.0
            for wq, zq in near[:, 1:]:
                ex = (wq - w_tip) / ((rg_ball[:, 0].min() if wq < w_tip else rg_ball[:, 0].max()) - w_tip + 1e-9)
                k_ = kM if wq < w_tip else kL
                if ex > 0:
                    g = max(g, (ex + CLEAR * 0.6 / abs(rg_ball[:, 0] - w_tip).max()) / max(k_, 1e-3))
            if g > 1.0:
                w2 = w_tip + (w2 - w_tip) * min(g, 1.35)
        rings.append((np.column_stack([w2, z_Q - z2]), np.array([s, z_Q]), down))
    for s in np.arange(s_ball - 0.003, s_Q, -0.003):
        rg = ring(np.array([s, z_Q]), down, np.array([1.0, 0.0]), LP[:, 2] < z_Q + 0.01)
        if rg is not None:
            rings.append((rg, np.array([s, z_Q]), down))
    # toe-box height: the bare foot is flat (ball 3.6 cm high), so the vamp is raised up to TOE_RAISE from the throat
    # forward (the upper part of each section stretched), giving a domed toe box instead of a wedge (fix 2)
    for rg, O, _ in rings:
        zz = z_Q - rg[:, 1]
        zt = float(zz.max())
        k_r = TOE_RAISE * float(smoothstep(s_Q + 0.008, s_ball, O[0]))
        if k_r > 0 and zt > z_nb + 0.004 and O[0] < s_ball - 1e-6:   # the nose rings were mapped from the raised ball
            rg[:, 1] = z_Q - (zz + k_r * np.clip((zz - z_nb) / (zt - z_nb), 0.0, 1.0))
    nose = []
    Q = np.array([s_Q, z_Q])
    for a in np.radians(np.arange(3.0, 90.0, 3.0)):
        e2 = np.array([-math.sin(a), -math.cos(a)])
        m = np.array([math.cos(a), -math.sin(a)])
        rg = ring(Q, e2, m)
        if rg is not None:
            rings.append((rg, Q, e2))
    for z in np.arange(z_Q, z_top + 1e-6, 0.004):
        rg = ring(np.array([s_Q, z]), back, np.array([0.0, 1.0]), LP[:, 0] < s_Q + 0.01)
        if rg is not None:
            rings.append((rg, np.array([s_Q, z]), back))
    T = len(rings)

    # 3D grid, top-line index per ring (the point nearest the pivot side: min r)
    G = np.zeros((T, N_RING, 3))
    k_top = np.zeros(T, int)
    for t, (rg, O, e2) in enumerate(rings):
        sz = O + np.outer(rg[:, 1], e2)
        G[t] = np.column_stack([sz[:, 0], rg[:, 0], sz[:, 1]])
        k_top[t] = int(np.argmin(rg[:, 1]))
    # The lace centre line: each ring's lateral centre, smoothed along the loft (the front of a ring is flat, so its
    # nearest point to the pivot jumps from ring to ring); the top point is the front-half point nearest that centre.
    wc = np.array([rg[:, 0].mean() for rg, _, _ in rings])
    for _ in range(6):
        wc[1:-1] = (wc[:-2] + 2 * wc[1:-1] + wc[2:]) / 4
    for t, (rg, _, _) in enumerate(rings):
        front = rg[:, 1] < rg[:, 1].mean()
        cand = np.where(front)[0]
        k_top[t] = int(cand[np.argmin(np.abs(rg[cand, 0] - wc[t]))])
    # smooth along the loft (the section families meet with small kinks), keeping the nose tip and the top ring
    for _ in range(8):
        G[1:-1] = G[1:-1] + 0.5 * ((G[:-2] + G[2:]) / 2 - G[1:-1])

    def sole_top(s):
        s = np.asarray(s, float)
        z = 0.027 + (0.019 - 0.027) * smoothstep(0.06, 0.14, s)
        return z + 0.35 * np.maximum(s - (L - 0.01), 0)

    def z_cut(s):
        return sole_top(s) - 0.003
    G[..., 2] = np.maximum(G[..., 2], z_cut(G[..., 0]))

    # collar: a padded roll over the lining (radial offsets of the top ring round its centre)
    top = G[-1].copy()
    cen = top.mean(axis=0)
    rad = FT.unit((top - cen) * np.array([1, 1, 0]))
    collar = []
    for off, dz in ((0.0025, 0.003), (0.0006, 0.0068), (-0.0024, 0.0046), (-0.0036, -0.008), (-0.0036, -0.03)):
        collar.append(top + rad * off + np.array([0, 0, dz]))
    G = np.concatenate([G, np.array(collar)], axis=0)
    k_top = np.concatenate([k_top, np.full(len(collar), k_top[-1])])
    T_main = T
    T = len(G)

    # to world, mesh, push clear of the skin and the base layer
    W = fr.world(G.reshape(-1, 3))
    idx = np.arange(T * N_RING).reshape(T, N_RING)
    F = []
    for t in range(T - 1):
        for k in range(N_RING):
            k2 = (k + 1) % N_RING
            F.append((idx[t, k], idx[t, k2], idx[t + 1, k2], idx[t + 1, k]))
    tip = len(W)
    W = np.vstack([W, fr.world(np.array([[s_tip + 0.0004, w_tip, float(z_Q - rings[0][0][:, 1].mean())]]))])
    for k in range(N_RING):
        F.append((tip, idx[0, (k + 1) % N_RING], idx[0, k]))
    # outward winding (solidify goes inward; the loft's winding follows the side's lateral axis)
    votes = 0
    for f in F[::37]:
        p_ = W[list(f)]
        n_ = np.cross(p_[1] - p_[0], p_[2] - p_[0])
        c_ = p_.mean(axis=0)
        loc_, _, _, _ = skin.find_nearest(Vector(c_))
        if loc_ is not None:
            votes += 1 if np.dot(n_, c_ - np.array(loc_)) > 0 else -1
    if votes < 0:
        F = [tuple(f)[::-1] for f in F]
    nb = FT.neighbours(len(W), F)
    lining = np.zeros(len(W), bool)
    lining[idx[T_main + 2:].ravel()] = True
    mask = ~lining
    trees = [skin]
    if bl is not None:
        mask_bl = mask & (W[:, 2] > float(bl[0][:, 2].min()) + 0.003)
        W, _ = FT.push_out(W, [FT.bvh_outward(bl[0], bl[1], skin)], CLEAR * 0.6, nb=nb, mask=mask_bl)
    W, moved = FT.push_out(W, trees, CLEAR * 0.6, nb=nb, mask=mask)
    Lw = fr.local(W)
    Lw[:, 2] = np.maximum(Lw[:, 2], z_cut(Lw[:, 0]))
    W = fr.world(Lw)
    # fields: local coords, top-line offset, ring index distance from the top
    loc = fr.local(W)
    s_, w_, z_ = loc[:, 0], loc[:, 1], loc[:, 2]
    tt = np.repeat(np.arange(T), N_RING)
    kk = np.tile(np.arange(N_RING), T)
    tt = np.append(tt, 0)
    kk = np.append(kk, 0)
    w_topline = np.concatenate([wc, np.full(T - len(wc), wc[-1])])
    w_rel = w_ - w_topline[tt]
    dk = np.abs(((kk - k_top[tt]) + N_RING // 2) % N_RING - N_RING // 2) / N_RING
    s_lace0 = 0.64 * L
    t_lace0 = next(t for t in range(len(nose), T_main) if rings[t][2][1] > -0.999 or rings[t][1][0] <= s_lace0)
    in_lace = (tt >= t_lace0) & (tt < T_main)

    def rand_g(s, w, z):
        # rubber rand: a band round the bottom (rising at the heel) and a toe bumper whose edge is a curve in plan
        # across the nose (fix 2: a z line on the toe's near-flat crown snapped into tears)
        zl = z_cut(s) + 0.003 + 0.010 + 0.006 * smoothstep(0.05, 0.0, s)
        sb = s_tip - 0.016 + 0.018 * (w / 0.03) ** 2
        return np.minimum(z - zl, sb - s)

    # UVs in metres: arc length round the ring, distance along the top line. Carried per vertex through the slicing,
    # the ring coordinate as an angle (cos, sin) so a cut on the seam edge interpolates correctly.
    arc = np.zeros((T, N_RING + 1))
    G3 = W[:T * N_RING].reshape(T, N_RING, 3)
    for t in range(T):
        seg = np.linalg.norm(np.diff(np.vstack([G3[t], G3[t][:1]]), axis=0), axis=1)
        arc[t, 1:] = np.cumsum(seg)
    tl = np.array([G3[t, k_top[t]] for t in range(T)])
    vline = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(tl, axis=0), axis=1))])
    perim = arc[tt, N_RING]
    ang = 2 * math.pi * arc[tt, kk] / perim
    v_v = vline[tt].copy()
    v_v[-1] = -0.01

    # Panels (step 06 r2): the shell is cut along each panel field's zero contour (a level-set slice) before
    # labelling, so every panel edge is an exact smooth curve, not a stair step of whole faces. Negative = inside.
    PH = [np.maximum(s_ - (0.075 - 0.55 * np.maximum(z_ - 0.03, 0)), z_ - 0.095),     # 0 heel counter
          (L - 0.06 + 0.025 * (w_rel / 0.04) ** 2) - s_,                                 # 1 toe cap
          (z_top - 0.022) - z_,                                                          # 2 collar
          np.abs(w_rel) - 0.026,                                                         # 3 eyestay
          np.abs(w_rel) - 0.011,                                                         # 4 tongue
          rand_g(s_, w_rel, z_)]                                                         # 5 rand
    P0 = 9
    A = np.column_stack([s_, w_rel, z_, dk, (tt < T_main).astype(float), np.cos(ang), np.sin(ang), v_v, perim] + PH)
    F0 = F
    parent = np.arange(len(F0))
    locked = np.zeros(len(W), bool)
    n_before = len(W)
    for c in range(P0, P0 + len(PH)):
        W, F, A, par, locked = FT.level_slice(W, F, A, c, locked=locked)
        parent = parent[par]
    print(f'[boots {side}] level-set slice: {n_before} -> {len(W)} verts, {len(F0)} -> {len(F)} faces')

    def maj(b):
        return np.array([2 * int(b[list(f)].sum()) > len(f) for f in F0])
    E_f, G_f, M_f = maj(in_lace & (dk < 0.25)), maj(in_lace & (dk < 0.2)), maj(tt < T_main)
    labels = []
    for fi_, f in enumerate(F):
        p_ = parent[fi_]
        ph = A[list(f), P0:].mean(axis=0)
        lab = 'quarter'
        if ph[0] < 0:
            lab = 'counter'
        if ph[1] < 0:
            lab = 'toecap'
        if ph[2] < 0 or not M_f[p_]:
            lab = 'collar'
        if E_f[p_] and ph[3] < 0:
            lab = 'eyestay'
        if G_f[p_] and ph[4] < 0:
            lab = 'tongue'
        if M_f[p_] and ph[5] < 0:
            lab = 'rand'
        labels.append(lab)
    shell = W.copy()
    s_, w_rel, z_, dk = A[:, 0], A[:, 1], A[:, 2], A[:, 3]
    nb = FT.neighbours(len(W), F)
    N = FT.vertex_normals(W, F)
    # forefoot flex creases on the top of the vamp
    topness = np.clip(1 - dk / 0.3, 0, 1) * (A[:, 4] > 0.5)
    crease = np.zeros(len(W))
    for c in (0.68 * L, 0.725 * L):
        crease += np.exp(-((s_ - c - 0.006 * w_rel / 0.03) / 0.0016) ** 2)
    W = W - N * (0.0007 * crease * topness)[:, None]
    N = FT.vertex_normals(W, F)
    # overlays on a real step: each lift group keeps its own vertices, joined by a wall (a turned leather edge)
    flift = np.array([LIFT[l_] for l_ in labels])
    Vo, Fo, src, walls = FT.split_step(W, F, flift, N)
    top_lift = np.full(len(W), -1.0)
    rt = np.zeros(len(W), bool)
    for f, l_, g_ in zip(F, labels, flift):
        top_lift[list(f)] = np.maximum(top_lift[list(f)], g_)
        if l_ in ('rand', 'toecap'):
            rt[list(f)] = True
    W = W + N * top_lift[:, None]       # the reference surface for the stitches and the hardware: the overlay top
    N = FT.vertex_normals(W, F)
    nz = FT.hash_noise(W, 700.0, 2.0 if side == 'L' else 5.0)
    wear = 0.9 * smoothstep(L - 0.05, L + 0.01, s_) * rt
    wear = np.maximum(wear, 0.5 * smoothstep(0.02, 0.0, s_) * (z_ < 0.06))
    wear = np.maximum(wear, 0.35 * crease * topness)
    wear = FT.smooth_field(wear, nb, 3) * (0.6 + 0.4 * nz)
    loc = fr.local(W)
    s_, w_, z_ = loc[:, 0], loc[:, 1], loc[:, 2]
    # toe plan check (r2 item 3): width 2 cm behind the tip against the ball width
    lw = loc[:T_main * N_RING]

    def width_at(s):
        m_ = np.abs(lw[:, 0] - s) < 0.002
        return float(np.ptp(lw[m_, 1])) if m_.any() else 0.0
    s_nose = float(lw[:, 0].max())
    print(f'[boots {side}] toe width 2 cm behind the tip {width_at(s_nose - 0.02) * 1000:.1f} mm, ball '
          f'{width_at(s_ball) * 1000:.1f} mm ({width_at(s_nose - 0.02) / max(width_at(s_ball), 1e-6) * 100:.0f} %)')

    u_all = (np.arctan2(A[:, 6], A[:, 5]) % (2 * math.pi)) / (2 * math.pi) * A[:, 8]
    uv = []
    for f in Fo:
        ss = [src[i] for i in f]
        us = np.array([u_all[i] for i in ss])
        if us.max() - us.min() > 0.5 * A[ss[0], 8]:
            us = np.where(us < 0.5 * A[ss[0], 8], us + A[ss[0], 8], us)
        uv.extend((float(u_), float(A[i, 7])) for u_, i in zip(us, ss))
    for wf, hi in walls:
        ss = [src[i] for i in wf]
        us = np.array([u_all[i] for i in ss])
        if us.max() - us.min() > 0.5 * A[ss[0], 8]:
            us = np.where(us < 0.5 * A[ss[0], 8], us + A[ss[0], 8], us)
        uv.extend((float(us[j]), float(A[ss[j], 7]) + (0.0012 if j >= 2 else 0.0)) for j in range(4))
    Fo = Fo + [wf for wf, _ in walls]
    labels_o = labels + [labels[hi] for _, hi in walls]

    o = len(out['V'])
    out['V'].extend(Vo)
    out['F'].extend([tuple(i + o for i in f) for f in Fo])
    out['labels'].extend(labels_o)
    out['wall'].extend([False] * (len(Fo) - len(walls)) + [True] * len(walls))
    out['uv'].extend(uv)
    out['wear'].extend(wear[src])
    so = len(store['shellV'])
    store['shellV'].extend(shell)
    store['shellF'].extend([tuple(i + so for i in f) for f in F])

    # stitches: every panel boundary except the glued rand; twin rows on the eyestays and the counter
    SV, SF = store['stitchV'], store['stitchF']
    face_c = np.array([W[list(f)].mean(axis=0) for f in F])
    edge_face = {}
    for fi_, f in enumerate(F):
        for i in range(len(f)):
            edge_face.setdefault(tuple(sorted((f[i], f[(i + 1) % len(f)]))), []).append(fi_)
    stitches = 0
    for chain, key, sidel in FT.boundary_chains(F, labels, PRIO):
        if 'rand' in key:
            continue
        pts, nrm = W[chain], N[chain]
        Tg = FT.unit(np.gradient(pts, axis=0))
        X = FT.unit(np.cross(nrm, Tg))
        mid = len(chain) // 2
        e = tuple(sorted((chain[mid - 1], chain[mid])))
        sg = 1.0
        for fj in edge_face.get(e, []):
            if labels[fj] == sidel:
                sg = 1.0 if np.dot(face_c[fj] - (W[e[0]] + W[e[1]]) / 2, X[mid]) > 0 else -1.0
        closed = chain[0] == chain[-1]
        for d in ((0.0013, 0.0036) if sidel in TWIN else (0.0014,)):
            row = FT.smooth_polyline(pts + X * sg * d, 3, closed)
            stitches += FT.stitch_row(SV, SF, row, nrm, lift=0.0002)

    # lacing: stations along the top line, eyelets (4) then speed hooks (2) each side at 18 mm off the centre
    bvh = BVHTree.FromPolygons([tuple(p) for p in W], [tuple(f) for f in F])
    lace_t = [t for t in range(t_lace0, T_main) if G[t, k_top[t], 2] < z_top - 0.03]
    tl_pts = np.array([W[idx[t, k_top[t]]] for t in lace_t])
    dl = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(tl_pts, axis=0), axis=1))])

    def eyestay_pt(d, sign):
        t = lace_t[int(np.clip(np.searchsorted(dl, d), 0, len(lace_t) - 1))]
        k0 = k_top[t]
        prev = idx[t, k0]
        for step in range(1, N_RING // 3):
            k = (k0 + sign * step) % N_RING
            v = idx[t, k]
            if abs(w_[v] - w_[idx[t, k0]]) >= 0.018:
                return W[v], N[v]
            prev = v
        return W[prev], N[prev]
    HV, HF = store['hwV'], store['hwF']
    stations = []
    for j, fr_ in enumerate((0.04, 0.2, 0.36, 0.52, 0.72, 0.88)):
        pair = []
        for sign in (1, -1):
            p, n = eyestay_pt(fr_ * dl[-1], sign)
            c = p + n * 0.0003
            if j < 4:
                # eyelet: a raised grommet (rolled rim 1.4 mm proud) so it reads at a grazing angle too (fix 4)
                FT.ring(HV, HF, c, n, 0.0015, 0.0031, 0.0014, 16)
                e_u = FT.unit(np.cross(n, [0.0, 0.0, 1.0] if abs(n[2]) < 0.9 else [1.0, 0.0, 0.0]))
                e_w = np.cross(n, e_u)
                FT.tube(HV, HF, [c + n * 0.0013 + (e_u * math.cos(a_) + e_w * math.sin(a_)) * 0.0023
                                 for a_ in np.linspace(0, 2 * math.pi, 17)[:-1]], 0.0006, 6, closed=True)
                pair.append((c + n * 0.0008, n))
            else:
                # speed hook (fix 4): a riveted base, a post standing 4.5 mm proud, the lip bending up the boot (toward
                # the collar) and down again, so the hook opens toward the top and the lace sits round the post
                upb = np.array([0.0, 0.0, 1.0]) - n * n[2]
                upb = FT.unit(upb if np.linalg.norm(upb) > 1e-6 else FT.unit(np.cross(n, [1.0, 0.0, 0.0])))
                FT.ring(HV, HF, c, n, 0.0009, 0.0030, 0.0012, 16)
                FT.tube(HV, HF, [c + n * 0.0008, c + n * 0.0030, c + n * 0.0046 + upb * 0.0006,
                                 c + n * 0.0052 + upb * 0.0022, c + n * 0.0046 + upb * 0.0037,
                                 c + n * 0.0031 + upb * 0.0043], 0.0011, 10)
                pair.append((c + n * 0.0022 - upb * 0.0005, n))
        stations.append(pair)

    def lace_path(a, b, over):
        pts = []
        for u in np.linspace(0, 1, 14):
            q = a * (1 - u) + b * u
            locq, nq, _, _ = bvh.find_nearest(Vector(q))
            bump = 0.0013 + 0.0011 * math.sin(math.pi * u) + (0.0018 * math.exp(-((u - 0.5) / 0.15) ** 2) if over else 0.0)
            pts.append(np.array(locq) + np.array(nq) * bump)
        return FT.smooth_polyline(pts, 2)
    LV, LF = store['laceV'], store['laceF']
    (a0, _), (b0, _) = stations[0]
    FT.tube(LV, LF, lace_path(a0, b0, False), 0.0011, 8)
    for j in range(len(stations) - 1):
        (al, _), (ar, _) = stations[j]
        (bl_, _), (br, _) = stations[j + 1]
        FT.tube(LV, LF, lace_path(al, br, j % 2 == 0), 0.0011, 8)
        FT.tube(LV, LF, lace_path(ar, bl_, j % 2 == 1), 0.0011, 8)
    # lace garage: a pocket on the tongue top holding the bow; the lace ends run into its mouth
    gt = [t for t in range(t_lace0, T_main) if z_top - 0.036 <= G[t, k_top[t], 2] <= z_top - 0.01]
    if len(gt) >= 2:
        gp = np.array([W[idx[t, k_top[t]]] for t in gt])
        gn = FT.unit(np.array([N[idx[t, k_top[t]]] for t in gt]).mean(axis=0))
        gc = gp.mean(axis=0)
        g_t = FT.unit(gp[-1] - gp[0])
        g_t = FT.unit(g_t - gn * (g_t @ gn))
        g_u = np.cross(gn, g_t)
        FT.box(store['garV'], store['garF'], gc + gn * 0.0008, g_t, g_u, gn, (0.026, 0.024, 0.0046), 0.3)
        for sb in (-1, 1):
            p0 = gc + gn * 0.0031 + g_u * sb * 0.0095
            stitches += FT.stitch_row(SV, SF, np.linspace(p0 - g_t * 0.011, p0 + g_t * 0.011, 10), np.tile(gn, (10, 1)), lift=0.0)
        (al, _), (ar, _) = stations[-1]
        mouth = gc - g_t * 0.0135 + gn * 0.0012
        FT.tube(LV, LF, lace_path(al, mouth - g_u * 0.002, False), 0.0011, 8)
        FT.tube(LV, LF, lace_path(ar, mouth + g_u * 0.002, True), 0.0011, 8)
    # pull loop at the heel back (the back line is index 0 of the shaft rings)
    shaft = [t for t in range(T_main) if rings[t][2][0] < -0.99 and G[t, 0, 2] > z_top - 0.04]
    bp = np.array([W[idx[t, 0]] for t in shaft])
    bn = np.array([N[idx[t, 0]] for t in shaft])
    if len(bp) >= 2:
        up = np.array([0.0, 0.0, 1.0])
        latb = FT.unit(np.cross(up, bn[-1]))
        b_ = bn[-1]
        ctr = bp[-1] + up * 0.019 - b_ * 0.0014
        rr = 0.0026
        legs_out = [bp[-1] + b_ * 0.0012 + up * h for h in (0.006, 0.012)]
        arcs = [ctr + b_ * rr * math.cos(a) + up * rr * math.sin(a) for a in np.linspace(0, math.pi, 9)]
        legs_in = [bp[-1] - b_ * 0.004 + up * h for h in (0.008, -0.004, -0.014)]
        path = list(bp + bn * 0.0012) + legs_out + arcs + legs_in
        nrm_p = list(bn) + [b_] * 2 + [FT.unit(b_ * math.cos(a) + up * math.sin(a)) for a in np.linspace(0, math.pi, 9)] + [-b_] * 3
        FT.strip(store['pullV'], store['pullF'], np.array(path), np.array(nrm_p), np.tile(latb, (len(path), 1)), 0.014, 0.0016)
        b0, b1 = bp[0] + bn[0] * 0.0029, bp[min(len(bp) - 1, 4)] + bn[0] * 0.0029
        cs = [b0 - latb * 0.005, b0 + latb * 0.005, b1 + latb * 0.005, b1 - latb * 0.005]
        for p_, q_ in ((cs[0], cs[1]), (cs[1], cs[2]), (cs[2], cs[3]), (cs[3], cs[0]), (cs[0], cs[2]), (cs[1], cs[3])):
            stitches += FT.stitch_row(SV, SF, np.linspace(p_, q_, 8), np.tile(bn[0], (8, 1)), lift=0.0)
    store['stitches'] += stitches

    # sole: the upper's flattened footprint, flared 3.5 mm; a recessed arch on the inside
    foot_pts = loc[:T_main * N_RING][loc[:T_main * N_RING, 2] <= z_cut(loc[:T_main * N_RING, 0]) + 0.0006][:, :2]
    hull = FT.hull2d(foot_pts)
    outline = FT.offset_closed(FT.resample_closed(FT.resample_closed(hull, 400), 160, start_dir=(-1.0, 0.0)), 0.0035)
    wc = outline[:, 1].mean()
    medial = outline[:, 1] < wc
    pull = 0.004 * np.sin(np.pi * np.clip((outline[:, 0] - 0.06) / 0.09, 0, 1)) * medial
    outline[:, 1] += pull * np.sign(wc - outline[:, 1])
    s_end = float(outline[:, 0].max())

    def z_bottom(s):
        s = np.asarray(s, float)
        return 0.0035 + 0.3 * np.maximum(s - (s_end - 0.03), 0) + 0.35 * np.maximum(0.012 - s, 0)
    arch = (lambda s: 0.0025 * smoothstep(0.066, 0.08, s) * smoothstep(0.13, 0.115, s))
    rows = [(0.0022, 'b', 0.0), (0.0, 'b', 0.0018)]
    rings_s = []
    cen2 = outline.mean(axis=0)
    for inset, ref, dz in rows + [(0.0, 'm', -0.0012), (0.0009, 'm', 0.0), (0.0, 'm', 0.0012), (0.0, 't', -0.0012),
                                  (0.0012, 't', 0.0)]:
        o2 = FT.offset_closed(outline, -inset) if inset else outline.copy()
        zb, zt = z_bottom(o2[:, 0]) + arch(o2[:, 0]), sole_top(o2[:, 0])
        z = {'b': zb, 't': zt, 'm': (zb + zt) / 2}[ref] + dz
        rings_s.append(np.column_stack([o2, z]))
    sV, sF = [], []
    for k in range(1, 9):   # bottom: concentric rings to a centre point
        o2 = cen2 + (rings_s[0][:, :2] - cen2) * (1 - k / 9)
        rings_s.insert(0, np.column_stack([o2, z_bottom(o2[:, 0]) + arch(o2[:, 0])]))
    for k in range(1, 9):   # top (inside the upper)
        o2 = cen2 + (rings_s[-1][:, :2] - cen2) * (1 - k / 9)
        rings_s.append(np.column_stack([o2, sole_top(o2[:, 0])]))
    M = len(outline)
    for rg in rings_s:
        sV.extend(fr.world(rg))
    for r in range(len(rings_s) - 1):
        for k in range(M):
            k2 = (k + 1) % M
            sF.append((r * M + k, r * M + k2, (r + 1) * M + k2, (r + 1) * M + k))
    cb = len(sV)
    sV.append(fr.world(np.array([[cen2[0], cen2[1], float(z_bottom(cen2[0]) + arch(cen2[0]))]]))[0])
    ct = len(sV)
    sV.append(fr.world(np.array([[cen2[0], cen2[1], float(sole_top(cen2[0]))]]))[0])
    last = (len(rings_s) - 1) * M
    for k in range(M):
        k2 = (k + 1) % M
        sF.append((cb, k2, k))
        sF.append((ct, last + k, last + k2))
    sV = np.array(sV)
    # outward: the bottom fan faces down
    fb = sF[-2]
    nbot = np.cross(sV[fb[1]] - sV[fb[0]], sV[fb[2]] - sV[fb[0]])
    if nbot[2] > 0:
        sF = [tuple(f)[::-1] for f in sF]
    so_ = len(out['soleV'])
    out['soleV'].extend(sV)
    out['soleF'].extend([tuple(i + so_ for i in f) for f in sF])
    out['soleWear'].extend(0.5 * smoothstep(s_end - 0.04, s_end, fr.local(sV)[:, 0]))
    # lugs: chevron rows on the forefoot and the heel, a heel-brake bar at the heel front; none under the arch
    inner = FT.offset_closed(outline, -0.005)
    from pattern import _points_in_polygon
    lugV, lugF = out['lugV'], out['lugF']
    nl = 0
    down3 = np.array([0.0, 0.0, -1.0])
    for region in ((0.004, 0.06), (0.128, s_end - 0.004)):
        row = 0
        for s in np.arange(region[0], region[1], 0.0115):
            ws = np.arange(-0.07, 0.07, 0.0145) + (0.00725 if row % 2 else 0.0)
            for w in ws:
                ang = math.radians(18.0 if (w - wc) > 0 else -18.0)
                t2 = np.array([math.sin(ang), math.cos(ang)])   # (s, w) direction of the lug's long side
                u2 = np.array([t2[1], -t2[0]])
                corners = [np.array([s, w]) + t2 * a * 0.006 + u2 * b * 0.00325 for a in (-1, 1) for b in (-1, 1)]
                if not _points_in_polygon(np.array(corners), inner).all():
                    continue
                zb = float(z_bottom(s))
                c3 = fr.world(np.array([[s, w, zb - 0.0016]]))[0]
                tw = fr.world(np.array([[s + t2[0], w + t2[1], 0.0]]))[0] - fr.world(np.array([[s, w, 0.0]]))[0]
                uw = fr.world(np.array([[s + u2[0], w + u2[1], 0.0]]))[0] - fr.world(np.array([[s, w, 0.0]]))[0]
                FT.box(lugV, lugF, c3, FT.unit(tw), FT.unit(uw), down3, (0.012, 0.0065, 0.0036), 0.18)
                nl += 1
            row += 1
    # heel brake: a transverse bar across the front of the heel block
    hs = 0.064
    in_w = inner[np.abs(inner[:, 0] - hs) < 0.004, 1]
    if len(in_w) >= 2:
        w0, w1 = float(in_w.min()), float(in_w.max())
        c3 = fr.world(np.array([[hs, (w0 + w1) / 2, float(z_bottom(hs)) - 0.0018]]))[0]
        tw = FT.unit(fr.world(np.array([[hs, 1.0, 0.0]]))[0] - fr.world(np.array([[hs, 0.0, 0.0]]))[0])
        uw = FT.unit(fr.world(np.array([[hs + 1.0, 0.0, 0.0]]))[0] - fr.world(np.array([[hs, 0.0, 0.0]]))[0])
        n_bar = max(2, int((w1 - w0) / 0.02) + 1)
        for j in range(n_bar):   # split so no edge passes 3 cm
            cj = c3 + tw * ((j + 0.5) / n_bar - 0.5) * (w1 - w0)
            FT.box(lugV, lugF, cj, tw, uw, down3, ((w1 - w0) / n_bar + 0.0004, 0.0075, 0.004), 0.12)
        nl += 1
    def hull_perim(zz):
        pts = W[:T_main * N_RING][np.abs(W[:T_main * N_RING, 2] - zz) < 0.003][:, :2]
        if len(pts) < 3 and GUARD:   # guard: no shaft point in the band; measure the shaft ring nearest zz
            ring_z = W[:T_main * N_RING, 2].reshape(T_main, N_RING).mean(axis=1)
            t_ = int(np.argmin(np.abs(ring_z - zz)))
            pts = W[t_ * N_RING:(t_ + 1) * N_RING, :2]
        if len(pts) < 3:
            return 0.0
        h = FT.hull2d(pts)
        return float(np.linalg.norm(np.diff(np.vstack([h, h[:1]]), axis=0), axis=1).sum())
    store['measure'][side] = {
        'footLengthM': round(L, 4), 'bootLengthM': round(float(s_end - outline[:, 0].min()), 4),
        'ballWidthM': round(float(np.ptp(outline[np.abs(outline[:, 0] - 0.7 * L) < 0.01, 1])) if (np.abs(outline[:, 0] - 0.7 * L) < 0.01).any() else 0.0, 4),
        'topHeightM': round(z_top, 4), 'topGirthM': round(hull_perim(z_top - 0.004), 4),
        'girthAtHemM': round(hull_perim(0.104 * ctx['H'] / 1.68), 4), 'rings': T, 'lugs': nl,
        'pushedClear': int(moved.sum()), 'sliceVerts': int(len(shell) - n_before), 'toeWidthRatio': round(width_at(s_nose - 0.02) / max(width_at(s_ball), 1e-6), 3), 'throat': [round(float(s_Q), 4), round(float(z_Q), 4)],
    }
    if GUARD:   # where the shaft's top rings really are (the top girth is measured 4 mm under z_top)
        rz = W[:T_main * N_RING, 2].reshape(T_main, N_RING)
        store['measure'][side]['shaftTopRingsZ'] = [[round(float(r.min()), 4), round(float(r.max()), 4)] for r in rz[-4:]]


def build(ctx):
    scene, reuse, MAT = ctx['scene'], ctx['reuse'], ctx['MAT']
    out = {k: [] for k in ('V', 'F', 'labels', 'wall', 'uv', 'wear', 'soleV', 'soleF', 'soleWear', 'lugV', 'lugF')}
    store = {k: [] for k in ('shellV', 'shellF', 'stitchV', 'stitchF', 'hwV', 'hwF', 'laceV', 'laceF', 'garV', 'garF',
                             'pullV', 'pullF')}
    store.update({'stitches': 0, 'measure': {}})
    for side in ('L', 'R'):
        build_foot(ctx, side, out, store)
    op = ctx['op_id']
    rubber = reuse(MAT.rubber, 'sole rubber')
    nylon = reuse(MAT.nylon, 'boot nylon')
    mats = [nylon, reuse(MAT.suede, 'suede'), rubber]
    upper = FT.add_mesh(scene, f'{op}-boots-hero', out['V'], out['F'], mats, mat_index=[SLOT[l] for l in out['labels']],
                        uv=out['uv'], attrs={'wear': out['wear']})
    # the overlay walls are hard edges: they must not bend the panels' smooth normals (a sawtooth band otherwise)
    me_u = upper.data
    ekey = {e.key: e.index for e in me_u.edges}
    for p_, is_wall in zip(me_u.polygons, out['wall']):
        if is_wall:
            p_.use_smooth = False
            for ek in p_.edge_keys:
                me_u.edges[ekey[ek]].use_edge_sharp = True
    sol = upper.modifiers.new('thickness', 'SOLIDIFY')
    sol.thickness = 0.0014
    sol.offset = -1.0
    sol.use_even_offset = False
    sol.use_rim = True
    sole = FT.add_mesh(scene, f'{op}-boots-sole', out['soleV'], out['soleF'], rubber, attrs={'wear': out['soleWear']})
    lugs = FT.add_mesh(scene, f'{op}-boots-lugs', out['lugV'], out['lugF'], rubber, smooth=False,
                       attrs={'wear': np.zeros(len(out['lugV']))})
    stitches = FT.add_mesh(scene, f'{op}-boots-stitches', store['stitchV'], store['stitchF'], reuse(MAT.thread, 'thread'))
    stitches.visible_shadow = False
    hw = FT.add_mesh(scene, f'{op}-boots-hardware', store['hwV'], store['hwF'], reuse(MAT.painted_metal, 'hardware metal'))
    laces = FT.add_mesh(scene, f'{op}-boots-laces', store['laceV'], store['laceF'], reuse(MAT.webbing, 'lace'))
    gar = FT.add_mesh(scene, f'{op}-boots-garage', store['garV'], store['garF'], nylon,
                      uv=[(0.0, 0.0)] * sum(len(f) for f in store['garF']), attrs={'wear': np.zeros(len(store['garV']))})
    _planar_uv(gar)
    pull = FT.add_mesh(scene, f'{op}-boots-pull', store['pullV'], store['pullF'], reuse(MAT.webbing, 'binding'))
    return {
        'shell': (np.array(store['shellV']), store['shellF']),
        'objects': [upper, sole, lugs, stitches, hw, laces, gar, pull],
        'measurements': store['measure'],
        'report': {'stitches': store['stitches'], 'panelFaces': {k: out['labels'].count(k) for k in SLOT}},
    }


def _orient_outward(ob, skin):
    me = ob.data
    flip = 0
    total = 0
    for p in me.polygons[::50]:
        loc, nrm, _, d = skin.find_nearest(p.center)
        if loc is None:
            continue
        total += 1
        if p.normal.dot(p.center - loc) < 0:
            flip += 1
    if total and flip > total / 2:
        me.flip_normals()


def _planar_uv(ob):
    me = ob.data
    lay = me.uv_layers['pattern']
    for p in me.polygons:
        n = np.abs(np.array(p.normal))
        ax = [j for j in range(3) if j != int(np.argmax(n))]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            lay.data[li].uv = (co[ax[0]], co[ax[1]])


# --- Guard bake (docs/guard-models PLAN G2, SPEC 4: laced boots on every outfit) ---------------------------------------
# The same boot, sized from the guard's own foot (the last is lofted from it), with a shaft 2 cm taller (a field boot
# under the trousers' hem). One boots job per base serves every outfit there (lean: uniform_rolled and work).
def configure(part, variant=None, prefix=None, **_):
    """Guard mode for this module copy (guard_garment.load_part)."""
    global GUARD, KIT, Z_TOP
    if variant is not None:
        raise SystemExit(f'boots: no variants (got {variant!r})')
    if part != 'boots':
        raise SystemExit(f'boots: the part must be "boots" (build_garment reads boots-sim.json by that name), got {part!r}')
    GUARD = True
    KIT = part
    Z_TOP = 0.175


if __name__ == '__main__':   # guard bake job (guard-bake.mjs --stage garments)
    import guard_garment
    guard_garment.main()
