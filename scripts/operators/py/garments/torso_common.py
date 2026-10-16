"""Shared geometry for the torso and belt kit (step 08; DECISIONS A32): the carrier's plate bags, its padded shoulder
straps, the cummerbund and the belt are rigid or tensioned parts laid on the shirt and trouser surfaces by rays, not
cloth-simulated. The fabric under them is compressed by `compress` (the "re-settle" of the shirt with the carrier as
a collider, A33): every vertex of the layers under a presser that lies above the presser's underside moves in to it,
never closer than one knit thickness to the layer below, and the move spreads into a smooth dent.

Frame (Blender): +Z up, the body faces -Y, the wearer's left is +X.
"""
import math

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import fitted as FT

X = np.array([1.0, 0.0, 0.0])
Y = np.array([0.0, 1.0, 0.0])
Z = np.array([0.0, 0.0, 1.0])


def mesh_world(ob, dg=None, evaluated=True):
    """World vertices and polygons of an object (modifiers applied when evaluated)."""
    if evaluated and dg is not None:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
    else:
        me = ob.data
    M = np.array(ob.matrix_world)
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    V = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    F = [tuple(p.vertices) for p in me.polygons]
    if evaluated and dg is not None:
        ob.evaluated_get(dg).to_mesh_clear()
    return V, F


def bvh(V, F):
    return BVHTree.FromPolygons([tuple(map(float, v)) for v in V], [tuple(int(i) for i in f) for f in F])


def ray(tree, o, d, reach=0.6):
    """First hit of a ray: (point, normal, distance) or (None, None, None)."""
    loc, nrm, _, dist = tree.ray_cast(Vector(tuple(map(float, o))), Vector(tuple(map(float, d))), reach)
    if loc is None:
        return None, None, None
    return np.array(loc), np.array(nrm), float(dist)


def fillet(poly, radii, seg=6):
    """A closed polygon (counter-clockwise, 2D) with each corner k rounded to radius radii[k]."""
    poly = np.asarray(poly, float)
    out = []
    n = len(poly)
    for k in range(n):
        p0, p1, p2 = poly[k - 1], poly[k], poly[(k + 1) % n]
        a, b = FT.unit(p0 - p1), FT.unit(p2 - p1)
        r = radii[k] if hasattr(radii, '__len__') else radii
        cosang = float(np.clip(a @ b, -1, 1))
        ang = math.acos(cosang)
        if r <= 0 or ang > math.pi - 1e-3:
            out.append(p1)
            continue
        t = r / math.tan(ang / 2)
        t = min(t, 0.45 * np.linalg.norm(p0 - p1), 0.45 * np.linalg.norm(p2 - p1))
        q0, q2 = p1 + a * t, p1 + b * t
        bis = FT.unit(a + b)
        # the arc through q0 and q2 tangent to both edges: centre on the bisector at distance t / cos(half the turn)
        rr = t * math.tan(ang / 2)
        c = p1 + bis * math.sqrt(t * t + rr * rr)
        a0 = math.atan2(*(q0 - c)[::-1])
        a2 = math.atan2(*(q2 - c)[::-1])
        da = (a2 - a0 + math.pi) % (2 * math.pi) - math.pi
        for i in range(seg + 1):
            ang_i = a0 + da * i / seg
            out.append(c + rr * np.array([math.cos(ang_i), math.sin(ang_i)]))
    return np.array(out)


def densify_closed(poly, step):
    poly = np.asarray(poly, float)
    out = []
    for k in range(len(poly)):
        a, b = poly[k], poly[(k + 1) % len(poly)]
        m = max(1, int(math.ceil(np.linalg.norm(b - a) / step)))
        for i in range(m):
            out.append(a + (b - a) * i / m)
    return np.array(out)


def inside(poly, P):
    """Point-in-polygon (even-odd) for 2D points P (n, 2)."""
    P = np.asarray(P, float)
    x, y = P[:, 0], P[:, 1]
    res = np.zeros(len(P), bool)
    n = len(poly)
    for k in range(n):
        x0, y0 = poly[k]
        x1, y1 = poly[(k + 1) % n]
        c = ((y0 > y) != (y1 > y)) & (x < (x1 - x0) * (y - y0) / (y1 - y0 + 1e-15) + x0)
        res ^= c
    return res


def dist_to_poly(poly, P):
    """Distance from 2D points to a closed polyline."""
    P = np.asarray(P, float)
    best = np.full(len(P), 1e9)
    n = len(poly)
    for k in range(n):
        a, b = poly[k], poly[(k + 1) % n]
        ab = b - a
        t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-15), 0, 1)
        d = np.linalg.norm(P - (a + np.outer(t, ab)), axis=1)
        best = np.minimum(best, d)
    return best


class Plate:
    """A rigid plate bag's surface map: local (x across, y up the plate, h out from its inner face) to world.
    C: the plate's local origin (on its inner face); X, U, N: across, up and out; R: the horizontal radius of its
    curve (about an axis along U); bow: the vertical curve (the top and bottom edges curve back toward the body)."""

    def __init__(self, C, Xa, U, N, R, bow):
        self.C, self.X, self.U, self.N, self.R, self.bow = (np.asarray(C, float), FT.unit(Xa), FT.unit(U), FT.unit(N),
                                                             float(R), float(bow))

    def S(self, x, y, h=0.0):
        x, y, h = np.broadcast_arrays(np.asarray(x, float), np.asarray(y, float), np.asarray(h, float))
        th = x / self.R
        out = (self.C[None] + np.outer((np.sin(th) * (self.R + h)).ravel(), self.X)
               + np.outer(((np.cos(th) * (self.R + h)) - self.R - self.bow * y ** 2).ravel(), self.N)
               + np.outer(y.ravel(), self.U))
        return out.reshape(x.shape + (3,))

    def normal(self, x, y):
        e = 1e-4
        dx = self.S(x + e, y) - self.S(x - e, y)
        dy = self.S(x, y + e) - self.S(x, y - e)
        return FT.unit(np.cross(dx, dy).reshape(-1, 3)).reshape(np.shape(dx))


def slab(V, F, plate, outline, thick, rr=0.009, rings=26, emit_edge=None):
    """A closed rounded slab on a plate map: rings of the outline scaled toward its centroid (dense at the rim), the
    inner and outer sheets meeting at the outline (a rounded, bound edge). Returns (outer ring points (rings+1, n, 3),
    their local (x, y), edge distances)."""
    c = outline.mean(axis=0)
    fs = 1.0 - (1.0 - np.linspace(0, 1, rings + 1)) ** 2.2            # 0 = centre .. 1 = rim, dense at the rim
    fs = fs[::-1]                                                     # rim first
    rim_r = np.linalg.norm(outline - c, axis=1)
    loc, ed = [], []
    for f in fs:
        L = c + (outline - c) * f
        loc.append(L)
        ed.append((1.0 - f) * rim_r)
    loc, ed = np.array(loc), np.array(ed)
    prof = np.sqrt(np.clip(1 - (1 - np.clip(ed / rr, 0, 1)) ** 2, 0, 1))
    h_in = 0.5 * thick * (1 - prof)
    h_out = thick - 0.5 * thick * (1 - prof)
    Pin = plate.S(loc[..., 0], loc[..., 1], h_in)
    Pout = plate.S(loc[..., 0], loc[..., 1], h_out)
    nr, n = loc.shape[:2]
    base = len(V)
    # outer sheet rows 0..nr-1 (row 0 = rim, shared), inner sheet rows 1..nr-1
    V.extend(list(Pout.reshape(-1, 3)))
    bi = len(V)
    V.extend(list(Pin[1:].reshape(-1, 3)))

    def io(r, j):
        return base + r * n + (j % n)

    def ii(r, j):
        return io(0, j) if r == 0 else bi + (r - 1) * n + (j % n)
    for r in range(nr - 1):
        for j in range(n):
            F.append((io(r, j), io(r, j + 1), io(r + 1, j + 1), io(r + 1, j)))
            F.append((ii(r, j), ii(r + 1, j), ii(r + 1, j + 1), ii(r, j + 1)))
    if emit_edge is not None:
        emit_edge.extend(list(ed.ravel()) + list(ed[1:].ravel()))
    return Pout, loc, ed


def perforated(V, F, G, Nn, solid, depth):
    """A sheet on a grid of top points G (rows, cols, 3) with outward normals Nn (rows along +U, columns along +X, so
    X x U points out): a quad for every solid cell
    (solid: (rows-1, cols-1) bool), and a wall `depth` deep along -Nn on every edge between a solid and an open cell
    (laser-cut slots, the sheet's border). Returns the face count."""
    R, C = G.shape[:2]
    base = len(V)
    V.extend(list(G.reshape(-1, 3)))
    bot = len(V)
    V.extend(list((G - Nn * depth).reshape(-1, 3)))

    def t(i, j):
        return base + i * C + j

    def b(i, j):
        return bot + i * C + j
    nf = 0
    for i in range(R - 1):
        for j in range(C - 1):
            if solid[i, j]:
                F.append((t(i, j), t(i, j + 1), t(i + 1, j + 1), t(i + 1, j)))
                nf += 1

    def S(i, j):
        return 0 <= i < R - 1 and 0 <= j < C - 1 and solid[i, j]
    for i in range(R - 1):
        for j in range(C):           # vertical grid edges between cells (i, j-1) and (i, j)
            a_, b_ = S(i, j - 1), S(i, j)
            if a_ != b_:
                q = (t(i, j), t(i + 1, j), b(i + 1, j), b(i, j))
                F.append(q if b_ else q[::-1])          # facing the open cell
                nf += 1
    for i in range(R):
        for j in range(C - 1):       # horizontal grid edges between cells (i-1, j) and (i, j)
            a_, b_ = S(i - 1, j), S(i, j)
            if a_ != b_:
                q = (t(i, j + 1), t(i, j), b(i, j), b(i, j + 1))
                F.append(q if b_ else q[::-1])
                nf += 1
    return nf


def slot_mask(xc, yc, rows_y, slot_w=0.03, slot_h=0.0055, pitch=0.038, x_lim=None):
    """Open (slot) cells of a laser-cut panel: horizontal slots slot_w x slot_h in rows at rows_y, columns at the
    38 mm pitch centred on x = 0. xc, yc: cell centres (2D grids). x_lim: the slot columns' half extent."""
    open_ = np.zeros(xc.shape, bool)
    lim = x_lim if x_lim is not None else float(np.abs(xc).max())
    ncol = int(math.floor((2 * lim + pitch - slot_w) / pitch))
    cols = (np.arange(ncol) - (ncol - 1) / 2) * pitch
    for yr in rows_y:
        for xcol in cols:
            open_ |= (np.abs(xc - xcol) < slot_w / 2) & (np.abs(yc - yr) < slot_h / 2)
    return open_


def band_slab(V, F, G, Nn, thick, edge_round=True):
    """A closed band on a grid of inner-face points G (rows, cols, 3), outward normals Nn: outer sheet `thick` out, the
    top and bottom rows rounded (bound edges), the end columns closed."""
    R, C = G.shape[:2]
    prof = np.ones(R)
    if edge_round and R > 4:
        k = np.arange(R)
        e = np.minimum(k, R - 1 - k).astype(float)
        prof = np.sqrt(np.clip(1 - (1 - np.clip(e / 2.0, 0, 1)) ** 2, 0, 1))
    Gin = G + Nn * (0.5 * thick * (1 - prof))[:, None, None]
    Gout = G + Nn * (thick - 0.5 * thick * (1 - prof))[:, None, None]
    base = len(V)
    V.extend(list(Gout.reshape(-1, 3)))
    bi = len(V)
    V.extend(list(Gin.reshape(-1, 3)))

    def o(i, j):
        return base + i * C + j

    def n_(i, j):
        return bi + i * C + j
    for i in range(R - 1):
        for j in range(C - 1):
            F.append((o(i, j), o(i, j + 1), o(i + 1, j + 1), o(i + 1, j)))
            F.append((n_(i, j), n_(i + 1, j), n_(i + 1, j + 1), n_(i, j + 1)))
    for j in range(C - 1):          # top and bottom walls
        F.append((o(R - 1, j), o(R - 1, j + 1), n_(R - 1, j + 1), n_(R - 1, j)))
        F.append((o(0, j + 1), o(0, j), n_(0, j), n_(0, j + 1)))
    for i in range(R - 1):          # end walls
        F.append((o(i + 1, 0), o(i, 0), n_(i, 0), n_(i + 1, 0)))
        F.append((o(i, C - 1), o(i + 1, C - 1), n_(i + 1, C - 1), n_(i, C - 1)))
    return Gout


def padded_strap(V, F, P, N, B, width, t_mid, t_edge, cols=9):
    """A padded strap along a path P (normals N, across-direction B): flat underside, domed top (t_mid in the middle,
    t_edge at the edges), closed. `cols` columns across so no edge is long."""
    P, N, B = np.asarray(P, float), FT.unit(np.asarray(N, float)), FT.unit(np.asarray(B, float))
    s = np.linspace(-0.5, 0.5, cols)
    dome = t_edge + (t_mid - t_edge) * np.sqrt(np.clip(1 - (2 * s) ** 2, 0, 1)) ** 0.6
    n = len(P)
    top = P[:, None, :] + B[:, None, :] * (s * width)[None, :, None] + N[:, None, :] * dome[None, :, None]
    bot = P[:, None, :] + B[:, None, :] * (s * width)[None, :, None]
    return band_slab_closed(V, F, bot, top)


def band_slab_closed(V, F, bot, top):
    """Closes two matching sheets (n, cols, 3) into a solid: top and bottom quads, side walls along both edges, caps."""
    n, C = bot.shape[:2]
    base = len(V)
    V.extend(list(top.reshape(-1, 3)))
    bb = len(V)
    V.extend(list(bot.reshape(-1, 3)))

    def t(i, j):
        return base + i * C + j

    def b(i, j):
        return bb + i * C + j
    for i in range(n - 1):
        for j in range(C - 1):
            F.append((t(i, j), t(i + 1, j), t(i + 1, j + 1), t(i, j + 1)))
            F.append((b(i, j), b(i, j + 1), b(i + 1, j + 1), b(i + 1, j)))
        F.append((t(i, 0), b(i, 0), b(i + 1, 0), t(i + 1, 0)))
        F.append((t(i, C - 1), t(i + 1, C - 1), b(i + 1, C - 1), b(i, C - 1)))
    for i, rev in ((0, False), (n - 1, True)):
        for j in range(C - 1):
            q = (t(i, j), t(i, j + 1), b(i, j + 1), b(i, j))
            F.append(q[::-1] if rev else q)
    return top


def tangents(P):
    P = np.asarray(P, float)
    T = np.zeros_like(P)
    T[1:-1] = P[2:] - P[:-2]
    T[0] = P[1] - P[0]
    T[-1] = P[-1] - P[-2]
    return FT.unit(T)


def resample(P, step):
    P = np.asarray(P, float)
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    m = max(2, int(math.ceil(s[-1] / step)) + 1)
    q = np.linspace(0, s[-1], m)
    return np.stack([np.interp(q, s, P[:, k]) for k in range(3)], axis=1)


def path_length(P):
    return float(np.linalg.norm(np.diff(np.asarray(P, float), axis=0), axis=1).sum())


def compress(objs, pressers, under_tree, cap=0.0025, floor_gap=0.0016, falloff=0.01, sink=0.0003, reach=0.03,
             region=None):
    """Presses the fabric of `objs` (Blender mesh objects; their base vertices are the outer surface: solidify offset
    -1) in under the kit: each vertex that lies above a presser's underside (a ray out along its normal meets a presser
    within `reach`, or it is already behind one) moves in to `sink` under it, by at most `cap`, and never closer than
    `floor_gap` to the layer below (`under_tree`). The first object is the fabric itself; the others (its stitches,
    zip) follow its nearest vertex. The move spreads `falloff` into a smooth dent. Returns measurements."""
    main = objs[0]
    M = np.array(main.matrix_world)
    Mi = np.linalg.inv(M[:3, :3])
    n = len(main.data.vertices)
    co = np.empty(n * 3)
    main.data.vertices.foreach_get('co', co)
    W = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    Fm = [tuple(p.vertices) for p in main.data.polygons]
    Nw = FT.vertex_normals(W, Fm)
    D = np.zeros(n)
    capped, excess = 0, 0.0
    capped_at = []
    # candidates: near any presser (inside the pressers' box, grown by the reach and the falloff)
    if region is not None:
        lo, hi = np.asarray(region[0]) - reach - falloff, np.asarray(region[1]) + reach + falloff
        cand = np.where(np.all((W >= lo) & (W <= hi), axis=1))[0]
    else:
        cand = np.arange(n)
    for i in cand:
        p = W[i]
        best = None
        for tree in pressers:
            loc, nrm, _, d = tree.find_nearest(Vector(p), reach)
            if loc is None:
                continue
            # the presser's underside along this vertex's normal
            hit = tree.ray_cast(Vector(p - Nw[i] * 0.01), Vector(Nw[i]), 0.01 + reach)
            if hit[0] is None:
                continue
            h = hit[3] - 0.01            # presser underside distance out from the vertex (negative: vertex above it)
            need = sink - h
            if need > 0 and (best is None or need > best):
                best = need
        if best is None:
            continue
        lim = cap
        if under_tree is not None:
            hb = under_tree.ray_cast(Vector(p + Nw[i] * 0.001), Vector(-Nw[i]), 0.03)
            if hb[0] is not None:
                lim = min(cap, max(0.0, hb[3] - 0.001 - floor_gap))
        if best > lim + 0.0005:      # the part sits more than 0.5 mm into the fabric here (it cannot press further)
            capped += 1
            excess = max(excess, best - lim)
            if len(capped_at) < 12:
                capped_at.append([round(float(v), 3) for v in p] + [round(float(best - lim) * 1000, 2), round(float(lim) * 1000, 2)])
        D[i] = min(best, lim)
    pressed = D > 1e-6
    # smooth falloff: the dent spreads into its neighbours (no step at its edge)
    nb = FT.neighbours(n, Fm)
    S = D.copy()
    iters = max(1, int(falloff / 0.003))
    for _ in range(iters):
        A = S.copy()
        for i in cand:
            q = nb[i]
            if len(q):
                A[i] = S[q].mean() * 0.85
        S = np.maximum(D, A)
    disp = -Nw * S[:, None]
    W2 = W + disp
    main.data.vertices.foreach_set('co', ((W2 - M[:3, 3]) @ Mi.T).ravel())
    main.data.update()
    # followers: the displacement of the nearest fabric vertex
    kd = KDTree(n)
    for i, p in enumerate(W):
        kd.insert(Vector(p), i)
    kd.balance()
    for ob in objs[1:]:
        Mo = np.array(ob.matrix_world)
        Moi = np.linalg.inv(Mo[:3, :3])
        m = len(ob.data.vertices)
        c2 = np.empty(m * 3)
        ob.data.vertices.foreach_get('co', c2)
        Wo = c2.reshape(-1, 3) @ Mo[:3, :3].T + Mo[:3, 3]
        for k in range(m):
            _, j, dd = kd.find(Vector(Wo[k]))
            if dd < 0.012 and S[j] > 0:
                Wo[k] = Wo[k] + disp[j]
        ob.data.vertices.foreach_set('co', ((Wo - Mo[:3, 3]) @ Moi.T).ravel())
        ob.data.update()
    return {'pressedVerts': int(pressed.sum()), 'dentVerts': int((S > 1e-6).sum()),
            'maxPressMm': round(float(D.max()) * 1000, 2), 'cappedVerts': capped,
            'maxIntoFabricMm': round(excess * 1000, 2), 'cappedAt': capped_at}


def rbox_edge(V, rng, c, axes, half):
    """Per-vertex distance to the nearest edge of a rounded box built by head_common.rbox (cordura 'edge' wear)."""
    W = np.asarray(V[rng[0]:rng[1]], float) - np.asarray(c, float)
    L = W @ np.asarray(axes, float).T
    gap = np.asarray(half, float)[None] - np.abs(L)
    srt = np.sort(gap, axis=1)
    return list(np.clip(srt[:, 1], 0.0, 0.05))


def box_uv(V, F):
    """Per-corner UVs in metres by box projection (the cordura and laminate weaves are in metres)."""
    V = np.asarray(V, float)
    uv = []
    for f in F:
        p = V[list(f)]
        n = np.cross(p[1] - p[0], p[2] - p[0])
        k = int(np.argmax(np.abs(n)))
        ax = [j for j in range(3) if j != k]
        for q in p:
            uv.append((q[ax[0]], q[ax[1]]))
    return uv


def compressible(hit, n, under_tree, cap=0.0025, floor_gap=0.0016):
    """How far the fabric at a surface point can be pressed in: up to `cap`, never closer than `floor_gap` to the
    layer below."""
    if under_tree is None:
        return cap
    hb = under_tree.ray_cast(Vector(tuple(map(float, hit + n * 0.001))), Vector(tuple(map(float, -n))), 0.03)
    if hb[0] is None:
        return cap
    return float(np.clip(hb[3] - 0.001 - floor_gap, 0.0, cap))


class Ring:
    """Horizontal rows round the body (a cummerbund, a belt): each row is the convex hull (the band's tension: it
    bridges hollows) of the fabric surface pressed in as far as it can go (plus `extra(z)` 2D points: hard parts it runs
    over), sampled at fixed angles from a vertical axis
    through (axis_x, axis_y). G: inner-face points (rows, cols, 3); Nn: outward normals. A limb ring (step 09: the
    thigh bands) passes its own axis_x and a short reach, so no ray can pass the axis into the other leg."""

    def __init__(self, tree, under_tree, axis_y, zs, thetas, cap=0.0025, floor_gap=0.0016, reach=0.45, extra=None,
                 axis_x=0.0):
        self.axis_x, self.axis_y, self.zs, self.th = axis_x, axis_y, np.asarray(zs, float), np.asarray(thetas, float)
        R, C = len(zs), len(thetas)
        G = np.zeros((R, C, 3))
        Nn = np.zeros((R, C, 3))
        self.misses = 0
        for i, z in enumerate(zs):
            pts = []
            for t in np.linspace(0, 2 * math.pi, 240, endpoint=False):
                d = np.array([math.cos(t), math.sin(t), 0.0])
                o = np.array([axis_x, axis_y, z]) + d * reach
                p, n, _ = ray(tree, o, -d, reach)
                if p is None:
                    self.misses += 1
                    continue
                c = compressible(p, n, under_tree, cap, floor_gap)
                q = p - n * c
                pts.append((q[0] - axis_x, q[1] - axis_y))
            # a ray that met a sleeve at the armpit stands out from its neighbours: dropped (radius more than 12 mm
            # over the median of the 31 around it)
            P2 = np.array(pts)
            r = np.linalg.norm(P2, axis=1)
            med = np.array([np.median(np.take(r, range(k - 15, k + 16), mode='wrap')) for k in range(len(r))])
            keep = r < med + 0.012
            self.outliers = getattr(self, 'outliers', 0) + int((~keep).sum())
            P2 = P2[keep]
            if extra is not None:        # other hard parts the band passes over at this height (the plate bags' faces)
                E2 = extra(z)
                if len(E2):
                    P2 = np.vstack([P2, E2])
            hull = FT.hull2d(P2)
            hull = densify_closed(hull, 0.002)
            for j, t in enumerate(thetas):
                d2 = np.array([math.cos(t), math.sin(t)])
                ang = np.arctan2(hull[:, 1], hull[:, 0])
                k = int(np.argmin(np.abs((ang - t + math.pi) % (2 * math.pi) - math.pi)))
                a, b = hull[k - 1], hull[(k + 1) % len(hull)]
                tn = FT.unit(b - a)
                nn = np.array([tn[1], -tn[0]])
                if nn @ d2 < 0:
                    nn = -nn
                # the exact crossing of the ray with the hull edge near k
                r_ = float(hull[k] @ d2)
                G[i, j] = (axis_x + d2[0] * r_, axis_y + d2[1] * r_, z)
                Nn[i, j] = (nn[0], nn[1], 0.0)
        # smooth the normals a little along each row
        for _ in range(2):
            Nn[:, 1:-1] = (Nn[:, :-2] + 2 * Nn[:, 1:-1] + Nn[:, 2:]) / 4
        self.G, self.Nn = G, FT.unit(Nn.reshape(-1, 3)).reshape(Nn.shape)

    def at(self, t, z, h=0.0):
        """Point and normal on the ring (inner face + h along the normal) at angle t and height z (interpolated)."""
        j = float(np.interp(t, self.th, np.arange(len(self.th))))
        i = float(np.interp(z, self.zs, np.arange(len(self.zs))))
        j0, i0 = min(int(j), len(self.th) - 2), min(int(i), len(self.zs) - 2)
        fj, fi = j - j0, i - i0

        def lerp(A):
            return ((A[i0, j0] * (1 - fj) + A[i0, j0 + 1] * fj) * (1 - fi)
                    + (A[i0 + 1, j0] * (1 - fj) + A[i0 + 1, j0 + 1] * fj) * fi)
        n = FT.unit(lerp(self.Nn))
        return lerp(self.G) + n * h, n

    def arc(self, t0, t1, z):
        """Arc length along a row between two angles (approximate, on the inner face)."""
        ts = np.linspace(t0, t1, 64)
        P = np.array([self.at(t, z)[0] for t in ts])
        return path_length(P)
