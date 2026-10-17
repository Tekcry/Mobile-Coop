"""Shared builders for Wren's step 09 storage items (chest_rig, waist_belt, leg_kit; SPEC 5.1, ART-DIRECTION 9.1-9.2).

Every part is laid on a conformal map M(u, v, h) -> world points: u across the surface, v up it, h out along its
normal. Three maps:
- HField: a plate face sampled as a height field from the front or the back (the chest rig on the chest plate, the
  radio in the back plate's recess); u = x, v = z.
- RingMap: a TC.Ring round the waist or a thigh (the belt kit, the leg kit); u = arc length round a reference row from
  a start angle, v = z.
- frames from either by finite differences (rigid parts: buckles, the holster shell).
A part is built in its own local box (x across, y up, z out from its back face) by head_common.rbox and every vertex is
then mapped, so a pouch's back lies on the curved face it is bonded to and its front follows it.

Frame (Blender): +Z up, the body faces -Y, the wearer's left is +X.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import fitted as FT
import head_common as HC
import torso_common as TC
from torso_common import Z


_PRE = {}        # id(V) -> (V, [(b0, b1, map-space points)]): the design record of every vertex built through a map


def record(V, b0, b1, S):
    """Records the map-space input S of vertices [b0, b1) of list V (their design coordinates, D28)."""
    e = _PRE.setdefault(id(V), (V, []))
    e[1].append((b0, b1, np.asarray(S, float).reshape(-1, 3).copy()))


def pre(V, b0, b1):
    """The recorded design coordinates of V[b0:b1] (NaN where none; a later record wins)."""
    out = np.full((b1 - b0, 3), np.nan)
    e = _PRE.get(id(V))
    if e is not None and e[0] is V:
        for a, b, S in e[1]:
            lo, hi = max(a, b0), min(b, b1)
            if lo < hi:
                out[lo - b0:hi - b0] = S[lo - a:hi - a]
    return out


class Frame:
    """A part's own frame for parts built in one frame (buckles, the PTT, the holster, canisters, sockets): origin O,
    axes X, Y and Z = X x Y (a rotation). Build at the origin with `p` / `v` (world points / vectors to local), then
    Parts.place moves the vertices out and records their local coordinates (plus `off`) as the design."""

    def __init__(self, O, X, Y, off=(0.0, 0.0, 0.0)):
        X = FT.unit(np.asarray(X, float))
        Y = FT.unit(np.asarray(Y, float) - X * float(np.dot(X, Y)))
        self.O = np.asarray(O, float).reshape(3)
        self.R = np.column_stack([X, Y, np.cross(X, Y)])
        self.off = np.asarray(off, float)

    @classmethod
    def of_flat(cls, F, u, v, h):
        """The frame at (u, v, h) on a Flat, its local coordinates continuing the Flat's map space (one design frame
        for a part built partly with cbox and partly in a frame)."""
        return cls(F(u, v, h).reshape(3), F.A, F.U, off=(u, v, h))

    def p(self, P):
        return (np.asarray(P, float) - self.O) @ self.R

    def v(self, D):
        return np.asarray(D, float) @ self.R

    def world(self, L):
        return self.O + np.asarray(L, float) @ self.R.T


class Parts:
    """Per-material vertex, face and edge-distance lists, and the rigid-part registry (D28): `tag` marks a vertex range
    of a key as rigid part `rid` and records its design coordinates (the part's own frame), `part` registers a part."""

    def __init__(self, base=0):
        self.d = {}
        self.rid, self.design, self.rigid, self.base = {}, {}, [], base

    def part(self, name, bones, role='hard', **kw):
        """Registers a rigid part: bones {bone: weight} (one bone or one fixed blend, D28); role 'hard' (shape, depth,
        size and skin checked), 'mount' (a moulded seat: skin), 'carrier' (a soft carrier skinned with its hard item).
        Returns its id (global per operator: the item's base plus its index)."""
        rid = self.base + len(self.rigid) + 1
        self.rigid.append({'id': rid, 'name': name, 'bones': bones, 'role': role, **kw})
        return rid

    def tag(self, key, rng, rid):
        """Marks vertices [b0, b1) of `key` as part `rid` with their design coordinates: the map-space input each vertex
        was built from (`cbox`, a `tube` on a Flat, `place`; recorded before the map, so a part laid through a curved
        map keeps its straight design and the shape check sees the bend). A hard part's vertex with no record raises."""
        V = self.d[key][0]
        R = self.rid.setdefault(key, [])
        D = self.design.setdefault(key, [])
        R.extend([0] * (len(V) - len(R)))
        D.extend([(0.0, 0.0, 0.0)] * (len(V) - len(D)))
        b0, b1 = rng
        L = pre(V, b0, b1)
        miss = ~np.isfinite(L).all(axis=1)
        if miss.any():
            e = next(x for x in self.rigid if x['id'] == rid)
            if e['role'] == 'hard':
                raise ValueError(f"rigid part {e['name']}: {int(miss.sum())} '{key}' vertices built with no design record")
            L[miss] = 0.0
        for i in range(b0, b1):
            R[i] = rid
        D[b0:b1] = [tuple(map(float, x)) for x in L]

    def seat_of(self, prefix, gap_mm, mount):
        """Records a hard part's seat gap (mm, its flat back to the surface under it) and the mount that fills it."""
        for e in self.rigid:
            if e['name'].startswith(prefix) and e['role'] == 'hard':
                e['seatGapMm'] = round(float(gap_mm), 1)
                e['mount'] = mount

    def count(self, *keys):
        return {k: len(self(k)[0]) for k in keys}

    def tag_since(self, counts, rid):
        """Tags every vertex added to each key since `counts` (from count())."""
        for k, n0 in counts.items():
            if len(self.d[k][0]) > n0:
                self.tag(k, (n0, len(self.d[k][0])), rid)

    def place(self, counts, fr):
        """Moves every vertex added to each key since `counts` - built in the part's own frame `fr` (a Frame: at the
        origin on the x, y, z axes) - to the world, and records the local coordinates (plus fr.off) as their design."""
        for k, n0 in counts.items():
            V = self.d[k][0]
            if len(V) > n0:
                L = np.asarray(V[n0:], float).reshape(-1, 3)
                V[n0:] = list(fr.world(L))
                record(V, n0, len(V), L + fr.off)

    def rigid_attrs(self, key):
        n = len(self.d[key][0])
        R = list(self.rid.get(key, []))
        R += [0] * (n - len(R))
        D = list(self.design.get(key, []))
        D += [(0.0, 0.0, 0.0)] * (n - len(D))
        D = np.asarray(D, float).reshape(-1, 3)
        return {'_rigid': np.asarray(R[:n], float), 'rdx': D[:n, 0], 'rdy': D[:n, 1], 'rdz': D[:n, 2]}

    def report(self):
        """The registry with each part's design extents (mm, along its own x, y, z) for the sim report."""
        out = []
        for e in self.rigid:
            pts = [np.asarray(self.design[k], float).reshape(-1, 3)[np.asarray(self.rid[k]) == e['id']] for k in self.rid]
            pts = [p for p in pts if len(p)]
            r = dict(e)
            if pts:
                P = np.vstack(pts)
                r['extentMm'] = [round(float(x) * 1000, 1) for x in (P.max(axis=0) - P.min(axis=0))]
                r['verts'] = int(len(P))
            out.append(r)
        return out

    def __call__(self, k):
        if k not in self.d:
            self.d[k] = ([], [], [])
        return self.d[k]

    def pad(self, k, val=0.05):
        V, _, E = self(k)
        E.extend([val] * (len(V) - len(E)))


def materials(reuse, MAT):
    """The step 09 kit materials: every one but the leg band elastic is an existing Wren material (one laminate, one
    polymer, one rubber, one gunmetal finish, ART-DIRECTION 9.1)."""
    return {
        'lam': reuse(MAT.laminate, 'armour strap', colour=(0.024, 0.025, 0.025)),
        'elastic': reuse(MAT.elastic, 'kit elastic', colour=(0.026, 0.027, 0.028)),
        'poly': reuse(MAT.polymer, 'harness polymer', colour=(0.022, 0.022, 0.023), rough=0.7),
        'rubber': reuse(MAT.rubber, 'armour edge rubber', colour=(0.021, 0.021, 0.022), rough=0.8),
        'metal': reuse(MAT.gunmetal, 'hardware gunmetal'),
        'cord': reuse(MAT.webbing, 'shock cord', colour=(0.026, 0.027, 0.028)),
        'cable': reuse(MAT.rubber, 'cable jacket', colour=(0.022, 0.022, 0.023), rough=0.72),
    }


def gauss(A, s):
    k = np.exp(-0.5 * (np.arange(-3 * s, 3 * s + 1) / s) ** 2)
    k /= k.sum()
    p = len(k) // 2
    B = np.pad(A, ((p, p), (0, 0)), mode='edge')
    B = np.stack([np.convolve(B[:, j], k, mode='valid') for j in range(A.shape[1])], 1)
    B = np.pad(B, ((0, 0), (p, p)), mode='edge')
    return np.stack([np.convolve(B[i], k, mode='valid') for i in range(A.shape[0])], 0)


class HField:
    """A face sampled from the front (side -1) or the back (+1) on an (x, z) grid; `skip(x, z)` marks samples to fill
    from their row instead (the radio recess: the map then runs over the recess at the plate's face)."""

    def __init__(self, tree, side, xs, zs, smooth=1, skip=None):
        self.side, self.xs, self.zs = side, np.asarray(xs, float), np.asarray(zs, float)
        D = np.full((len(zs), len(xs)), np.nan)
        for i, z in enumerate(self.zs):
            for j, x in enumerate(self.xs):
                if skip is not None and skip(x, z):
                    continue
                h, _, _ = TC.ray(tree, (x, side * 0.6, z), (0.0, -side, 0.0), 1.2)
                if h is not None:
                    D[i, j] = side * h[1]
        for i in range(len(zs)):
            ok = np.isfinite(D[i])
            if ok.any() and not ok.all():
                D[i, ~ok] = np.interp(self.xs[~ok], self.xs[ok], D[i, ok])
        for j in range(len(xs)):
            ok = np.isfinite(D[:, j])
            if ok.any() and not ok.all():
                D[~ok, j] = np.interp(self.zs[~ok], self.zs[ok], D[ok, j])
        D = np.nan_to_num(D, nan=float(np.nanmean(D)))
        if smooth:
            D = gauss(D, smooth)
        gx, gz = np.meshgrid(self.xs, self.zs)
        self.P = np.stack([gx, side * D, gz], -1)
        dx = np.gradient(self.P, self.xs, axis=1)
        dz = np.gradient(self.P, self.zs, axis=0)
        N = np.cross(dx, dz)
        N *= np.sign(N[..., 1:2] * side)
        self.N = N / np.linalg.norm(N, axis=-1, keepdims=True)

    def interp(self, A, x, z):
        fj = np.clip((x - self.xs[0]) / (self.xs[1] - self.xs[0]), 0, len(self.xs) - 1.001)
        fi = np.clip((z - self.zs[0]) / (self.zs[1] - self.zs[0]), 0, len(self.zs) - 1.001)
        j0, i0 = np.floor(fj).astype(int), np.floor(fi).astype(int)
        tj, ti = (fj - j0)[..., None], (fi - i0)[..., None]
        return ((A[i0, j0] * (1 - tj) + A[i0, j0 + 1] * tj) * (1 - ti)
                + (A[i0 + 1, j0] * (1 - tj) + A[i0 + 1, j0 + 1] * tj) * ti)

    def __call__(self, u, v, h=0.0):
        u, v, h = np.broadcast_arrays(np.asarray(u, float), np.asarray(v, float), np.asarray(h, float))
        P = self.interp(self.P, u, v)
        N = FT.unit(self.interp(self.N, u, v).reshape(-1, 3)).reshape(P.shape)
        return P + N * h[..., None]


class RingMap:
    """A TC.Ring as a map: u the arc length from angle t0 round the row at z_ref (positive with the angle), v = z."""

    def __init__(self, ring, t0, z_ref):
        self.r = ring
        th = ring.th
        P = np.array([self._at(np.full(1, t), np.full(1, z_ref), np.zeros(1))[0] for t in th])
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        self.s = s - float(np.interp(t0, th, s))
        self.th = th

    def theta(self, u):
        return np.interp(u, self.s, self.th)

    def _at(self, t, z, h):
        R = self.r
        j = np.interp(t, R.th, np.arange(len(R.th)))
        i = np.interp(z, R.zs, np.arange(len(R.zs)))
        j0 = np.minimum(j.astype(int), len(R.th) - 2)
        i0 = np.minimum(i.astype(int), len(R.zs) - 2)
        fj, fi = (j - j0)[:, None], (i - i0)[:, None]

        def lerp(A):
            return ((A[i0, j0] * (1 - fj) + A[i0, j0 + 1] * fj) * (1 - fi)
                    + (A[i0 + 1, j0] * (1 - fj) + A[i0 + 1, j0 + 1] * fj) * fi)
        n = FT.unit(lerp(R.Nn))
        return lerp(R.G) + n * h[:, None]

    def __call__(self, u, v, h=0.0):
        u, v, h = np.broadcast_arrays(np.asarray(u, float), np.asarray(v, float), np.asarray(h, float))
        shp = u.shape
        W = self._at(self.theta(u.ravel()), v.ravel(), h.ravel())
        return W.reshape(shp + (3,))


def frame(M, u, v, h, e=1e-3):
    """(O, across, up, out) on a map: finite differences, orthonormal (up kept in the face)."""
    O = M(u, v, h).reshape(3)
    A = FT.unit(M(u + e, v, h).reshape(3) - M(u - e, v, h).reshape(3))
    U = FT.unit(M(u, v + e, h).reshape(3) - M(u, v - e, h).reshape(3))
    N = FT.unit(np.cross(A, U))
    U = FT.unit(np.cross(N, A))
    return O, A, U, N


def rot2(lx, ly, a):
    """Local (x across, y up) turned by a (the top toward +u)."""
    c, s = math.cos(a), math.sin(a)
    return lx * c + ly * s, -lx * s + ly * c


def edge_local(L, half):
    gap = np.asarray(half, float)[None] - np.abs(L)
    return list(np.clip(np.sort(gap, axis=1)[:, 1], 0.0, 0.05))


def cbox(part, M, cu, cv, half, r, h0=0.0, rot=0.0, off=(0.0, 0.0, 0.0), step=0.003, deform=None):
    """A rounded box on map M: its centre at local `off` (x across, y up, z out from its back face at h0) from the anchor
    (cu, cv), turned by rot; half sizes (x, y, z). The back face (local z -half) lies at h0 + off[2]. Returns the local
    points (box frame, centred) and the vertex range."""
    V, F, E = part
    E.extend([0.05] * (len(V) - len(E)))
    half = np.asarray(half, float)
    b0, b1 = HC.rbox(V, F, np.zeros(3), np.eye(3), half, r, step=step, deform=deform)
    L = np.array(V[b0:b1], float)
    lx, ly = L[:, 0] + off[0], L[:, 1] + off[1]
    du, dv = rot2(lx, ly, rot)
    S = np.column_stack([cu + du, cv + dv, h0 + off[2] + half[2] + L[:, 2]])
    W = M(S[:, 0], S[:, 1], S[:, 2])
    V[b0:b1] = list(W.reshape(-1, 3))
    record(V, b0, b1, S)
    E.extend(edge_local(np.array(L), half))
    return L, (b0, b1)


class Flat:
    """A rigid map (D28): F(u, v, h) = O + A (u - cu) + U (v - cv) + N h. Anything laid on it through cbox / mpts /
    cord_loop keeps its design shape exactly (one rigid transform); the conformal maps stay for soft parts. A part's
    design record is the map-space input (u, v, h), never derived from the built points."""

    def __init__(self, O, A, U, N, cu, cv):
        self.O, self.A, self.U, self.N = (np.asarray(x, float).reshape(3) for x in (O, A, U, N))
        self.cu, self.cv = float(cu), float(cv)

    def __call__(self, u, v, h=0.0):
        u, v, h = np.broadcast_arrays(np.asarray(u, float), np.asarray(v, float), np.asarray(h, float))
        return (self.O + self.A * (u - self.cu)[..., None] + self.U * (v - self.cv)[..., None]
                + self.N * h[..., None])

    def lifted(self, dh):
        return Flat(self.O + self.N * dh, self.A, self.U, self.N, self.cu, self.cv)

    def report(self):
        return {'O': [round(float(x), 5) for x in self.O], 'A': [round(float(x), 4) for x in self.A],
                'U': [round(float(x), 4) for x in self.U], 'N': [round(float(x), 4) for x in self.N]}


def flat_on(M, cu, cv, half, rot=0.0, support=None, step=0.004, inset=0.002):
    """The rigid frame for a straight item over map M at (cu, cv): the plane fitted to the surface under its footprint
    (local half sizes (x, y), turned by rot; `support(P)` limits the fit to the points of the surface it is bonded to,
    e.g. one plate), moved out until no surface point under the footprint is in front of it. h = 0 on that plane.
    Returns (Flat, seat): seat {'maxMm', 'minMm'} the gap between the plane and the surface (the inner footprint)."""
    hx, hy = half
    xs = np.arange(-hx, hx + 1e-9, step)
    ys = np.arange(-hy, hy + 1e-9, step)
    gx, gy = np.meshgrid(xs, ys)
    du, dv = rot2(gx.ravel(), gy.ravel(), rot)
    P = M(cu + du, cv + dv, np.zeros_like(du)).reshape(-1, 3)
    _, A0, _, N0 = frame(M, cu, cv, 0.0)
    S = P[support(P)] if support is not None else P
    if len(S) < 3:
        S = P
    c = S.mean(axis=0)
    n = np.linalg.svd(S - c)[2][2]
    n = n if n @ N0 > 0 else -n
    A = FT.unit(A0 - n * (A0 @ n))
    U = FT.unit(np.cross(n, A))
    h = (P - c) @ n
    d = float(h.max())
    Pc = M(cu, cv, 0.0).reshape(3)
    O = Pc + n * (d - float((Pc - c) @ n))
    inner = (np.abs(gx.ravel()) <= hx - inset) & (np.abs(gy.ravel()) <= hy - inset)
    g = d - (h[inner] if inner.any() else h)
    return Flat(O, A, U, n, cu, cv), {'maxMm': round(float(g.max()) * 1000, 1), 'minMm': round(float(g.min()) * 1000, 1)}


def seat(part, F, M, cu, cv, half, rot=0.0, h_top=0.0, h_base=0.0, r=0.002, step=0.003):
    """A moulded seat (D28): a wedge under a straight item, its back on the surface (map M at h_base: it follows the
    body) and its front the item's flat back (F at h_top). half = (x, y) of its footprint. Returns the vertex range."""
    V, Fc, E = part
    E.extend([0.05] * (len(V) - len(E)))
    hz = 0.002
    b0, b1 = HC.rbox(V, Fc, np.zeros(3), np.eye(3), (half[0], half[1], hz), min(r, hz * 0.9), step=step)
    L = np.array(V[b0:b1], float)
    du, dv = rot2(L[:, 0], L[:, 1], rot)
    t = np.clip((L[:, 2] + hz) / (2 * hz), 0, 1)[:, None]
    back = M(cu + du, cv + dv, np.full(len(L), h_base)).reshape(-1, 3)
    front = F(cu + du, cv + dv, np.full(len(L), h_top)).reshape(-1, 3)
    V[b0:b1] = list(back * (1 - t) + front * t)
    E.extend(edge_local(L, (half[0], half[1], hz)))
    return b0, b1


class Mapped(np.ndarray):
    """World points from mpts that remember their map and map-space input (`src`), so `tube` can build a part laid on a
    Flat in map space (its design record)."""
    src = None


def mpts(M, pts, cu=0.0, cv=0.0, rot=0.0, h0=0.0):
    """Local polyline points (x, y, z) mapped like cbox (no centre offset)."""
    P = np.asarray(pts, float)
    du, dv = rot2(P[:, 0], P[:, 1], rot)
    S = np.column_stack([cu + du, cv + dv, h0 + P[:, 2]])
    W = M(S[:, 0], S[:, 1], S[:, 2]).reshape(-1, 3).view(Mapped)
    W.src = (M, S)
    return W


def tube(part, pts, r, sides=8, step=0.004, smooth=0):
    """A tube along a world polyline, resampled so no edge is long. Points from mpts on a Flat: the tube is built in
    map space and mapped (one rigid transform), and its map-space vertices are recorded as their design."""
    V, F, E = part
    E.extend([0.05] * (len(V) - len(E)))
    b0 = len(V)
    src = getattr(pts, 'src', None)
    flat = src is not None and isinstance(src[0], Flat)
    P = np.asarray(src[1] if flat else pts, float)
    P = TC.resample(P, step) if len(P) > 1 and TC.path_length(P) > step else P
    if smooth:
        P = FT.smooth_polyline(P, smooth)
    FT.tube(V, F, P, r, sides=sides)
    if flat:
        S = np.asarray(V[b0:], float).reshape(-1, 3)
        V[b0:] = list(src[0](S[:, 0], S[:, 1], S[:, 2]).reshape(-1, 3))
        record(V, b0, len(V), S)
        P = src[0](P[:, 0], P[:, 1], P[:, 2]).reshape(-1, 3)
    E.extend([0.0] * (len(V) - len(E)))
    tube.last = (b0, len(V))
    return P


def cord_loop(part, M, cu, cv, rot, h0, half_w, y_lo, y_top, z_c, r=0.0016, rise=None, cx=0.0, ex=0.35):
    """A shock-cord loop over a pouch top: anchored inside both side walls at y_lo, up the sides and over the top at
    y_top (local box coordinates of the pouch, z_c its depth; a squared arch, exponent ex, so it clears the corners of
    what it holds), mapped on M; cx shifts the arch across (a swept magazine's base plate)."""
    rise = rise if rise is not None else 0.6 * half_w
    pts = [(-half_w + 0.0022, y_lo, z_c), (-half_w - r * 0.6, y_lo + 0.003, z_c)]
    for a in np.linspace(math.pi, 0.0, 19):
        c, s = math.cos(a), math.sin(a)
        pts.append((cx * s + half_w * math.copysign(abs(c) ** ex, c), y_top - rise + rise * abs(s) ** ex, z_c))
    pts += [(half_w + r * 0.6, y_lo + 0.003, z_c), (half_w - 0.0022, y_lo, z_c)]
    return tube(part, mpts(M, pts, cu, cv, rot, h0), r, sides=8, step=0.002)


def buckle(pt, O, along, n, strap_w, rid):
    """A flush magnetic buckle (mag_buckle.build) built in its own frame and placed (its design record, D28): `along`
    the strap, `n` out from the surface at O; tags it as part rid."""
    import mag_buckle as MB
    along, n = FT.unit(np.asarray(along, float)), FT.unit(np.asarray(n, float))
    fr = Frame(O, np.cross(n, along), along)          # local: across +x, along +y, out -z (Z = across x along = -n)
    nb = pt.count('metal', 'rubber')
    MB.build(pt('metal'), pt('rubber'), np.zeros(3), (0.0, 1.0, 0.0), None, (0.0, 0.0, -1.0), strap_w)
    pt.place(nb, fr)
    pt.tag_since(nb, rid)


def presser_grid(M, u0, u1, v0, v1, h, step=0.004):
    us = np.arange(u0, u1 + 1e-9, step)
    vs = np.arange(v0, v1 + 1e-9, step)
    gu, gv = np.meshgrid(us, vs)
    P = M(gu, gv, np.full_like(gu, h)).reshape(-1, 3)
    c = len(us)
    Fq = [(i * c + j, i * c + j + 1, (i + 1) * c + j + 1, (i + 1) * c + j) for i in range(len(vs) - 1) for j in range(c - 1)]
    return P, Fq


def merge(parts):
    V, F, off = [], [], 0
    for Vp, Fp in parts:
        V.append(np.asarray(Vp, float))
        F += [tuple(i + off for i in f) for f in Fp]
        off += len(Vp)
    return np.vstack(V), F


def bvh(V, F):
    return BVHTree.FromPolygons([tuple(map(float, v)) for v in V], [tuple(f) for f in F])


def standoff(V, tree, reach=0.12):
    """The farthest vertex of a part from the suit (nearest-point distance), m."""
    worst = 0.0
    for p in np.asarray(V, float)[::3]:
        loc, _, _, d = tree.find_nearest(Vector(tuple(p)), reach)
        if loc is not None:
            worst = max(worst, d)
    return round(float(worst), 4)


def suit_trees(op, dg, keep=None):
    """The suit's render mesh (and a face filter): (tree, V, F)."""
    suit = bpy.data.objects[f'{op}-suit-hero']
    Vs, Fs = TC.mesh_world(suit, dg)
    if keep is not None:
        Fs = [f for f in Fs if keep(Vs[list(f)])]
    return TC.bvh(Vs, Fs), Vs, Fs


def suit_follow(op):
    suit = bpy.data.objects[f'{op}-suit-hero']
    return [suit] + [o for o in (bpy.data.objects.get(f'{op}-suit-{n}') for n in
                                 ('tape', 'zip', 'zip-tape', 'zip-slider', 'zip-garage')) if o is not None]


def write_objects(scene, op, item, pt, mats):
    objs = {}
    for key, (Vk, Fk, Ek) in pt.d.items():
        if not Fk:
            continue
        pt.pad(key)
        Ek = np.asarray(Ek[:len(Vk)], float)
        wear = np.clip(1.0 - Ek / 0.004, 0.0, 1.0) * 0.6
        ob = FT.add_mesh(scene, f'{op}-{item}-{key}', Vk, Fk, mats[key], smooth=True, uv=TC.box_uv(Vk, Fk),
                         attrs={'edge': Ek, 'wear': wear, **pt.rigid_attrs(key)})
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.shade_smooth()
        ob.data.set_sharp_from_angle(angle=math.radians(50.0))
        objs[key] = ob
    return objs


def shell_of(pt, every=1):
    """The item's shell for later layers: its parts' render geometry merged (hidden; build_fitted triangulates it)."""
    return merge([(np.asarray(V, float), F) for V, F, _ in pt.d.values() if F])


def empty(scene, name, origin, xa, ya, za, size=0.05):
    from mathutils import Matrix
    em = bpy.data.objects.new(name, None)
    em.empty_display_type = 'ARROWS'
    em.empty_display_size = size
    M = np.eye(4)
    M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = xa, ya, za, origin
    em.matrix_world = Matrix([list(r) for r in M])
    scene.collection.objects.link(em)
    return em


def lane_report(pt, reg, allowed):
    """Vertices of this item in the game's back-carry lane (A39: |x| < 0.10 m behind the body, z 0.86-1.42 m), per
    named part (reg: name -> [(key, b0, b1)]); `allowed` names the parts allowed there."""
    out = {}
    for name, rngs in reg.items():
        P = np.vstack([np.asarray(pt.d[k][0][a:b], float).reshape(-1, 3) for k, a, b in rngs])
        m = (np.abs(P[:, 0]) < 0.10) & (P[:, 1] > 0.0) & (P[:, 2] > 0.86) & (P[:, 2] < 1.42)
        if m.any():
            out[name] = {'verts': int(m.sum()), 'allowed': name in allowed}
    return out


def reg_verts(pt, reg, names):
    return [v for n in names if n in reg for k, a, b in reg[n] for v in pt.d[k][0][a:b]]


__all__ = ['Parts', 'Frame', 'buckle', 'record', 'pre', 'materials', 'HField', 'RingMap', 'Flat', 'flat_on', 'seat', 'frame', 'cbox', 'mpts',
           'tube', 'cord_loop', 'Z']
