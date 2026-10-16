"""Shared geometry for the fitted items (gloves, boots; step 06): they are not cloth-simulated. Gloves are shrink-fitted
panels on the hand (the hand's own surface, offset); boots are parametric hard models sized from the foot. Helpers:
mesh neighbours and smoothing, the push clear of a surface, surface-following stitch rows, tubes, boxes, rings and
the panel-boundary chains the stitches follow. Pure numpy and mathutils; the build scripts own the scene.
"""
import math

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-12)


def neighbours(n, faces):
    """Vertex neighbour lists of a polygon mesh (every polygon edge)."""
    nb = [set() for _ in range(n)]
    for f in faces:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            nb[a].add(b)
            nb[b].add(a)
    return [np.fromiter(s, dtype=np.int64) for s in nb]


def smooth_field(X, nb, iters, lam=0.5, fixed=None):
    """Laplacian smoothing of a per-vertex field (scalar or vector); 'fixed' vertices keep their value."""
    X = np.array(X, float)
    for _ in range(iters):
        avg = np.array([X[n].mean(axis=0) if len(n) else X[i] for i, n in enumerate(nb)])
        Y = X + lam * (avg - X)
        if fixed is not None:
            Y[fixed] = X[fixed]
        X = Y
    return X


def vertex_normals(V, F):
    N = np.zeros_like(V)
    for f in F:
        p = V[list(f)]
        n = np.zeros(3)
        for i in range(len(f)):
            n += np.cross(p[i], p[(i + 1) % len(f)])
        for i in f:
            N[i] += n
    return unit(N)


def bvh_of(obj, dg=None):
    if dg is None:
        dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(obj, dg)


def bvh_outward(V, F, skin):
    """A BVH of a thin layer (V, F) with every face turned to face away from the skin (a fold can turn some inward)."""
    out = []
    for f in F:
        p = V[list(f)]
        c = p.mean(axis=0)
        n = np.cross(p[1] - p[0], p[2] - p[0])
        loc, nrm, _, _ = skin.find_nearest(Vector(c))
        if loc is not None and np.dot(n, np.array(nrm)) < 0:
            f = tuple(f)[::-1]
        out.append(tuple(f))
    return BVHTree.FromPolygons([tuple(v) for v in V], out)


def push_out(P, trees, clear, reach=0.03, iters=4, nb=None, rings=6, decay=0.8, mask=None):
    """Every vertex closer than 'clear' to any of the surfaces (nearest point within reach, signed along the surface
    normal; behind it counts as inside) goes out to 'clear'. With 'nb' the push spreads into a smooth bump (no step at
    the edge of the pushed region); a last exact pass snaps the rest. Returns (P, moved mask)."""
    P = np.array(P, float)
    moved = np.zeros(len(P), bool)
    for it in range(iters + 1):
        D = np.zeros_like(P)
        need = np.zeros(len(P), bool)
        for i in range(len(P)):
            if mask is not None and not mask[i]:
                continue
            for tree in trees:
                loc, n_, _, d = tree.find_nearest(Vector(P[i]))
                if loc is None or d > reach:
                    continue
                h = (Vector(P[i]) - loc).dot(n_)
                if h < clear:
                    push = np.array(n_) * (clear - h)
                    if np.linalg.norm(push) > np.linalg.norm(D[i]):
                        D[i] = push
                    need[i] = True
        if not need.any():
            break
        moved |= need
        if nb is not None and it < iters:
            mag0 = np.linalg.norm(D, axis=1)
            S = D.copy()
            for _ in range(rings):
                A = decay * np.array([S[n].mean(axis=0) if len(n) else S[i] for i, n in enumerate(nb)])
                keep = need & (mag0 >= np.linalg.norm(A, axis=1))
                S = np.where(keep[:, None], D, A)
            D = S
        P += D
    return P, moved


# --- Primitive builders: each appends to (V, F) lists ---------------------------------------------------------------

def tube(V, F, pts, r, sides=8, closed=False, caps=True):
    """A round tube along a polyline (laces, binding, loops)."""
    pts = np.asarray(pts, float)
    n = len(pts)
    if n < 2:
        return
    T = np.zeros_like(pts)
    T[1:-1] = pts[2:] - pts[:-2]
    T[0] = pts[1] - pts[0] if not closed else pts[1] - pts[-1]
    T[-1] = pts[-1] - pts[-2] if not closed else pts[0] - pts[-2]
    T = unit(T)
    ref = np.array([0.0, 0.0, 1.0]) if abs(T[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = unit(np.cross(T[0], ref))
    base = len(V)
    for i in range(n):
        u = unit(u - T[i] * np.dot(u, T[i]))
        w = np.cross(T[i], u)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            V.append(pts[i] + r * (math.cos(a) * u + math.sin(a) * w))
    last = n if closed else n - 1
    for i in range(last):
        j = (i + 1) % n
        for k in range(sides):
            k2 = (k + 1) % sides
            F.append((base + i * sides + k, base + j * sides + k, base + j * sides + k2, base + i * sides + k2))
    if caps and not closed:
        F.append(tuple(base + k for k in range(sides))[::-1])
        F.append(tuple(base + (n - 1) * sides + k for k in range(sides)))


def box(V, F, c, t, u, n, size, bevel=0.25):
    """A box centred at c with axes t, u, n and full sizes (st, su, sn); the top corners chamfered by 'bevel'."""
    st, su, sn = size
    b = len(V)
    for zz, sc in ((-0.5, 1.0), (0.5, 1.0 - bevel)):
        for xx, yy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            V.append(np.asarray(c) + t * xx * st / 2 * sc + u * yy * su / 2 * sc + n * zz * sn)
    F.extend([(b, b + 3, b + 2, b + 1), (b + 4, b + 5, b + 6, b + 7)])
    for k in range(4):
        k2 = (k + 1) % 4
        F.append((b + k, b + k2, b + 4 + k2, b + 4 + k))


def ring(V, F, c, n, r_in, r_out, height, seg=16):
    """A flat ring (eyelet) centred at c, axis n."""
    n = unit(n)
    ref = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = unit(np.cross(n, ref))
    w = np.cross(n, u)
    b = len(V)
    prof = ((r_in, 0.0), (r_out, 0.0), (r_out * 0.95, height), (r_in * 1.05, height))
    for k in range(seg):
        a = 2 * math.pi * k / seg
        d = math.cos(a) * u + math.sin(a) * w
        for rr, hh in prof:
            V.append(np.asarray(c) + d * rr + n * hh)
    for k in range(seg):
        k2 = (k + 1) % seg
        for j in range(4):
            j2 = (j + 1) % 4
            F.append((b + k * 4 + j, b + k2 * 4 + j, b + k2 * 4 + j2, b + k * 4 + j2))


def thread_seg(V, F, a, b, n, r=0.00018, arch=0.00016, sink=0.00012, sides=6):
    """One stitch: a slightly arched tube from a to b on the surface (normal n), the ends sunk into it."""
    a, b, n = np.asarray(a), np.asarray(b), unit(n)
    mid = (a + b) / 2 + n * arch
    tube(V, F, [a - n * sink, (a + mid) / 2 + n * arch * 0.6, mid, (mid + b) / 2 + n * arch * 0.6, b - n * sink], r, sides)


def stitch_row(V, F, pts, nrm, pitch=0.0036, length=0.0027, lift=0.0002):
    """Stitches along a surface polyline (pts, per-point normals), about 7 per inch. Returns the stitch count."""
    pts, nrm = np.asarray(pts, float), unit(np.asarray(nrm, float))
    if len(pts) < 2:
        return 0
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    total = s[-1]
    count = 0
    x = (total % pitch) / 2
    while x + length <= total:
        p0, p1 = np.interp(x, s, np.arange(len(s))), np.interp(x + length, s, np.arange(len(s)))

        def at(f):
            i = min(int(f), len(pts) - 2)
            t = f - i
            return pts[i] * (1 - t) + pts[i + 1] * t, unit(nrm[i] * (1 - t) + nrm[i + 1] * t)
        a, na = at(p0)
        b, nb_ = at(p1)
        n = unit(na + nb_)
        thread_seg(V, F, a + n * lift, b + n * lift, n)
        count += 1
        x += pitch
    return count


def boundary_chains(F, labels, prio):
    """Edges between faces of different labels, chained into polylines. Returns [(vertex ids, (label_a, label_b),
    side label)], the side label being the one of higher priority (the overlay the stitch runs on)."""
    edge_faces = {}
    for fi, f in enumerate(F):
        k = len(f)
        for i in range(k):
            e = tuple(sorted((f[i], f[(i + 1) % k])))
            edge_faces.setdefault(e, []).append(fi)
    by_pair = {}
    for e, fs in edge_faces.items():
        if len(fs) != 2:
            continue
        la, lb = labels[fs[0]], labels[fs[1]]
        if la == lb:
            continue
        key = tuple(sorted((la, lb)))
        by_pair.setdefault(key, []).append(e)
    chains = []
    for key, edges in by_pair.items():
        adj = {}
        for a, b in edges:
            adj.setdefault(a, []).append(b)
            adj.setdefault(b, []).append(a)
        seen = set()
        starts = [v for v, n in adj.items() if len(n) != 2] + list(adj)
        for s0 in starts:
            if all(tuple(sorted((s0, n))) in seen for n in adj[s0]):
                continue
            chain = [s0]
            cur = s0
            while True:
                nxt = next((n for n in adj[cur] if tuple(sorted((cur, n))) not in seen), None)
                if nxt is None:
                    break
                seen.add(tuple(sorted((cur, nxt))))
                chain.append(nxt)
                cur = nxt
                if nxt == s0:
                    break
            if len(chain) >= 3:
                side = max(key, key=lambda l_: prio.get(l_, 0))
                chains.append((chain, key, side))
    return chains


def smooth_polyline(P, iters=3, closed=False):
    P = np.array(P, float)
    for _ in range(iters):
        Q = P.copy()
        if closed:
            Q = (np.roll(P, 1, 0) + 2 * P + np.roll(P, -1, 0)) / 4
        else:
            Q[1:-1] = (P[:-2] + 2 * P[1:-1] + P[2:]) / 4
        P = Q
    return P


def add_mesh(scene, name, V, F, mats, smooth=True, mat_index=None, uv=None, attrs=None):
    """A mesh object from vertex / face lists; 'uv' per face corner (flattened in face order) goes in the 'pattern'
    UV layer; 'attrs' {name: per-vertex float} become POINT attributes (the materials read 'wear')."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in V], [], [tuple(int(i) for i in f) for f in F])
    me.validate()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m)
    if mat_index is not None:
        me.polygons.foreach_set('material_index', [int(i) for i in mat_index])
    if uv is not None:
        lay = me.uv_layers.new(name='pattern')
        lay.data.foreach_set('uv', np.asarray(uv, np.float32).ravel())
    for k, vals in (attrs or {}).items():
        at = me.attributes.new(k, 'FLOAT', 'POINT')
        at.data.foreach_set('value', np.asarray(vals, np.float32))
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def hull2d(P):
    """Convex hull (counter-clockwise) of 2D points (monotone chain)."""
    pts = sorted(set(map(tuple, np.round(np.asarray(P, float), 7))))
    if len(pts) < 3:
        return np.array(pts)

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])


def resample_closed(poly, n, start_dir=None):
    """A closed polygon resampled to n points evenly by arc length; with start_dir the first point is where the ray
    from the centroid along start_dir leaves the polygon, and the order is counter-clockwise."""
    poly = np.asarray(poly, float)
    P = np.vstack([poly, poly[:1]])
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    total = s[-1]
    off = 0.0
    if start_dir is not None:
        c = poly.mean(axis=0)
        d = unit(start_dir)
        best, bi = -1e9, 0.0
        for i in range(len(poly)):
            a, b = P[i], P[i + 1]
            # intersection of the ray c + t d with segment a-b
            m = np.array([[d[0], a[0] - b[0]], [d[1], a[1] - b[1]]])
            if abs(np.linalg.det(m)) < 1e-14:
                continue
            t, u = np.linalg.solve(m, a - c)
            if t > 0 and -1e-9 <= u <= 1 + 1e-9 and t > best:
                best, bi = t, s[i] + u * seg[i]
        off = bi
    q = (off + np.linspace(0, total, n, endpoint=False)) % total
    x = np.interp(q, s, P[:, 0])
    y = np.interp(q, s, P[:, 1])
    return np.stack([x, y], axis=1)


def offset_closed(poly, d):
    """Offsets a counter-clockwise closed polygon outward by d (vertex normals from the neighbours)."""
    poly = np.asarray(poly, float)
    t = np.roll(poly, -1, 0) - np.roll(poly, 1, 0)
    n = unit(np.stack([t[:, 1], -t[:, 0]], axis=1))
    return poly + n * d


def strip(V, F, pts, nrm, binorm, width, thick, caps=True):
    """A flat strap along a polyline: rectangular section width x thick, lying on the surface (normal nrm, the width
    along binorm). Tabs, pull loops, webbing."""
    pts, nrm, binorm = np.asarray(pts, float), unit(np.asarray(nrm, float)), unit(np.asarray(binorm, float))
    base = len(V)
    for p, n, b in zip(pts, nrm, binorm):
        for sb, sn in ((-0.5, 0.0), (0.5, 0.0), (0.5, 1.0), (-0.5, 1.0)):
            V.append(p + b * sb * width + n * sn * thick)
    for i in range(len(pts) - 1):
        for k in range(4):
            k2 = (k + 1) % 4
            F.append((base + i * 4 + k, base + (i + 1) * 4 + k, base + (i + 1) * 4 + k2, base + i * 4 + k2))
    if caps:
        F.append((base + 3, base + 2, base + 1, base))
        e = base + (len(pts) - 1) * 4
        F.append((e, e + 1, e + 2, e + 3))


def hash_noise(P, scale, seed=0.0):
    """Smooth-ish value noise in [0, 1] from positions (sums of sines; deterministic, no texture)."""
    P = np.asarray(P, float) * scale
    v = (np.sin(P[:, 0] * 1.7 + P[:, 1] * 2.3 + seed) + np.sin(P[:, 1] * 1.3 - P[:, 2] * 2.9 + 2 * seed)
         + np.sin(P[:, 2] * 1.9 + P[:, 0] * 1.1 - seed))
    return np.clip(v / 6 + 0.5, 0, 1)


def level_slice(V, F, A, col, snap_t=0.18, locked=None):
    """Cut a polygon mesh along the zero contour of the per-vertex field A[:, col] (a level-set slice, step 06 r2).

    Every face the field changes sign across is split by the straight line through the interpolated zero points on its
    edges, so a panel edge drawn by the field is an exact, smooth curve on the surface instead of a stair step of
    whole faces. A sign change that falls within snap_t of a vertex moves that vertex onto the zero along the edge
    (no slivers) unless it is locked (already on an earlier contour). A holds every per-vertex attribute (fields,
    local coordinates, UVs) and is interpolated with the positions. Faces the field crosses more than twice (saddles)
    are left whole. Returns V, F, A, parent face index per new face, locked (vertices on any contour)."""
    V = np.array(V, float)
    A = np.array(A, float)
    n0 = len(V)
    locked = np.zeros(n0, bool) if locked is None else np.asarray(locked, bool).copy()
    phi = A[:, col]
    # snap near-vertex crossings
    best = {}
    for f in F:
        m = len(f)
        for i in range(m):
            a, b = f[i], f[(i + 1) % m]
            if phi[a] * phi[b] >= 0:
                continue
            t = phi[a] / (phi[a] - phi[b])
            for v, u, tv in ((a, b, t), (b, a, 1.0 - t)):
                if tv < snap_t and not locked[v] and (v not in best or tv < best[v][1]):
                    best[v] = (u, tv)
    for v, (u, tv) in best.items():
        V[v] = V[v] + tv * (V[u] - V[v])
        A[v] = A[v] + tv * (A[u] - A[v])
        A[v, col] = 0.0
    phi = A[:, col]
    on = np.abs(phi) < 1e-9
    locked |= on
    newV, newA, cut = [], [], {}

    def cut_vertex(a, b):
        key = (a, b) if a < b else (b, a)
        if key not in cut:
            p, q = key
            t = phi[p] / (phi[p] - phi[q])
            newV.append(V[p] + t * (V[q] - V[p]))
            row = A[p] + t * (A[q] - A[p])
            row[col] = 0.0
            newA.append(row)
            cut[key] = n0 + len(newV) - 1
        return cut[key]
    sgn = np.where(on, 0, np.sign(phi)).astype(int)
    outF, parent = [], []
    for fi, f in enumerate(F):
        s = [sgn[i] for i in f]
        m = len(f)
        if not (1 in s and -1 in s):
            outF.append(tuple(f))
            parent.append(fi)
            continue
        changes = sum(1 for i in range(m) if s[i] != s[(i + 1) % m] and s[i] != 0 and s[(i + 1) % m] != 0) \
            + sum(1 for i in range(m) if s[i] == 0)
        if changes > 2:
            outF.append(tuple(f))
            parent.append(fi)
            continue
        pos, neg = [], []
        for i in range(m):
            a, b = f[i], f[(i + 1) % m]
            if s[i] >= 0:
                pos.append(a)
            if s[i] <= 0:
                neg.append(a)
            if s[i] * s[(i + 1) % m] < 0:
                c = cut_vertex(a, b)
                pos.append(c)
                neg.append(c)
        for poly in (pos, neg):
            if len(poly) >= 3:
                if len(poly) <= 4:
                    outF.append(tuple(poly))
                    parent.append(fi)
                else:                       # fan the pentagon / hexagon (convex pieces of a quad)
                    for k in range(1, len(poly) - 1):
                        outF.append((poly[0], poly[k], poly[k + 1]))
                        parent.append(fi)
    if newV:
        V = np.vstack([V, np.array(newV)])
        A = np.vstack([A, np.array(newA)])
        locked = np.concatenate([locked, np.ones(len(newV), bool)])
    return V, outF, A, np.array(parent, int), locked


def split_step(V, F, group_val, N):
    """Give each face group its own copy of the vertices it shares with another group, lift each copy along N by its
    group's value and join the copies along every group boundary with a wall quad: an overlay ends on a real turned
    edge (step 06 r2), not a half-lifted ramp. group_val: per-face lift. Returns V, F, src (source vertex of each
    output vertex), wall faces as (face index into F, owning input face)."""
    gv = np.asarray(group_val, float)
    key_of = {}
    outV, src = [], []

    def vid(v, g):
        k = (v, round(g * 1e6))
        if k not in key_of:
            key_of[k] = len(outV)
            outV.append(V[v] + N[v] * g)
            src.append(v)
        return key_of[k]
    outF = []
    for fi, f in enumerate(F):
        outF.append(tuple(vid(v, gv[fi]) for v in f))
    edge = {}
    for fi, f in enumerate(F):
        m = len(f)
        for i in range(m):
            edge.setdefault((f[i], f[(i + 1) % m]), fi)
    walls = []
    for (p, q), fa in edge.items():
        fb = edge.get((q, p))
        if fb is None or fa > fb or abs(gv[fa] - gv[fb]) < 1e-7:
            continue
        hi, lo = (fa, fb) if gv[fa] > gv[fb] else (fb, fa)
        # in the higher face the edge runs (a, b); the wall continues its winding down to the lower copies
        a, b = (p, q) if hi == fa else (q, p)
        walls.append(((vid(b, gv[hi]), vid(a, gv[hi]), vid(a, gv[lo]), vid(b, gv[lo])), hi))
    return np.array(outV), outF, np.array(src, int), walls
