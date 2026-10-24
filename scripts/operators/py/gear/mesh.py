"""Pure-numpy mesh building for the guard gear kit (G3): one Piece per job, made of rigid parts.

Every part is a closed solid (slab, tube, box, lathe) so build_gear.py can recalc outward normals. Each part carries
its declared bone weights (one weight vector, the rigid-kit rule of rigid_skin.py), its tint slot (SPEC 8) and a
material key; build_gear.py writes them as the '_rigid' and '_TINT' point attributes, vertex groups and materials.
Frame: Blender (+Z up, the figure faces -Y, his left +X), metres.
"""
import math

import numpy as np


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.where(n > 0, n, 1.0)


def grid_normals(P, close_u=False):
    """Per-point normals of a (nu, nv, 3) grid: du x dv by central differences (one-sided at open edges)."""
    P = np.asarray(P, float)
    if close_u:
        du = np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0)
    else:
        du = np.gradient(P, axis=0)
    dv = np.gradient(P, axis=1)
    return unit(np.cross(du, dv))


def frame_from(z_axis, hint=(0.0, 0.0, 1.0)):
    """A right-handed (x, y, z) frame whose z is z_axis and whose y leans toward hint."""
    z = unit(z_axis)
    h = np.asarray(hint, float)
    if abs(float(np.dot(unit(h), z))) > 0.95:
        h = np.array([1.0, 0.0, 0.0]) if abs(z[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    x = unit(np.cross(h, z))
    y = np.cross(z, x)
    return x, y, z


class Piece:
    def __init__(self, piece_id):
        self.id = piece_id
        self.V = []          # list of (n, 3) arrays
        self.nv = 0
        self.F = []          # faces (tuples of global vertex indices)
        self.fmat = []       # material key per face
        self.vpart = []      # part index per vertex (list of arrays)
        self.parts = []      # {'name', 'bones', 'tint', 'role'}
        self.cur = None
        self.anchors = {}    # named points / frames for the report (shield grip, helmet drop box, ...)

    # --- parts ----------------------------------------------------------------------------------------------------
    def part(self, name, bones, tint, role='hard'):
        s = sum(bones.values())
        self.parts.append({'name': name, 'bones': {b: w / s for b, w in bones.items()}, 'tint': tint, 'role': role})
        self.cur = len(self.parts) - 1
        return self.cur

    def _add(self, pts, faces, mat):
        pts = np.asarray(pts, float).reshape(-1, 3)
        o = self.nv
        self.V.append(pts)
        self.vpart.append(np.full(len(pts), self.cur, np.int64))
        self.nv += len(pts)
        for f in faces:
            self.F.append(tuple(o + int(i) for i in f))
            self.fmat.append(mat)
        return o

    # --- primitives -----------------------------------------------------------------------------------------------
    def slab(self, Pout, Pin, mat, close_u=False, rim_mat=None):
        """A closed shell between two (nu, nv, 3) grids: the outer face, the inner face (reversed) and the rims along
        the open borders. close_u wraps u (a ring)."""
        Pout = np.asarray(Pout, float)
        Pin = np.asarray(Pin, float)
        nu, nv = Pout.shape[:2]
        idx = lambda a, i, j: a * nu * nv + i * nv + j      # noqa: E731
        pts = np.concatenate([Pout.reshape(-1, 3), Pin.reshape(-1, 3)])
        faces, rims = [], []
        us = range(nu if close_u else nu - 1)
        for i in us:
            i2 = (i + 1) % nu
            for j in range(nv - 1):
                faces.append((idx(0, i, j), idx(0, i2, j), idx(0, i2, j + 1), idx(0, i, j + 1)))
                faces.append((idx(1, i, j + 1), idx(1, i2, j + 1), idx(1, i2, j), idx(1, i, j)))
        for i in us:
            i2 = (i + 1) % nu
            rims.append((idx(0, i2, 0), idx(0, i, 0), idx(1, i, 0), idx(1, i2, 0)))
            rims.append((idx(0, i, nv - 1), idx(0, i2, nv - 1), idx(1, i2, nv - 1), idx(1, i, nv - 1)))
        if not close_u:
            for j in range(nv - 1):
                rims.append((idx(0, 0, j), idx(0, 0, j + 1), idx(1, 0, j + 1), idx(1, 0, j)))
                rims.append((idx(0, nu - 1, j + 1), idx(0, nu - 1, j), idx(1, nu - 1, j), idx(1, nu - 1, j + 1)))
        o = self._add(pts, faces, mat)
        if rims:
            for f in rims:
                self.F.append(tuple(o + i for i in f))
                self.fmat.append(rim_mat or mat)
        return o

    def shell(self, P, t, mat, close_u=False, inward=True, rim_mat=None):
        """A slab of thickness t under (or over) a surface grid, along the grid's normals (oriented outward from the
        grid's centroid)."""
        P = np.asarray(P, float)
        N = grid_normals(P, close_u)
        c = P.reshape(-1, 3).mean(axis=0)
        if float(np.sum((P - c) * N)) < 0:
            N = -N
        Q = P - N * t if inward else P + N * t
        return self.slab(P, Q, mat, close_u, rim_mat) if inward else self.slab(Q, P, mat, close_u, rim_mat)

    def dome(self, P, pole, t, mat, rim_mat=None):
        """A closed-top shell: P (nu ring, nv rows, 3) from the rim (v = 0) up to the top row, closed by one fan to
        `pole` (the outer apex), t thick inward along the grid normals."""
        P = np.asarray(P, float)
        pole = np.asarray(pole, float)
        nu, nv = P.shape[:2]
        N = grid_normals(P, True)
        c = P.reshape(-1, 3).mean(axis=0)
        if float(np.sum((P - c) * N)) < 0:
            N = -N
        Q = P - N * t
        pole_i = pole - unit(pole - c) * t
        pts = np.concatenate([P.reshape(-1, 3), Q.reshape(-1, 3), [pole, pole_i]])
        A = lambda i, j: i * nv + j                    # noqa: E731
        B = lambda i, j: nu * nv + i * nv + j          # noqa: E731
        po, pi = 2 * nu * nv, 2 * nu * nv + 1
        faces, rims = [], []
        for i in range(nu):
            i2 = (i + 1) % nu
            for j in range(nv - 1):
                faces.append((A(i, j), A(i2, j), A(i2, j + 1), A(i, j + 1)))
                faces.append((B(i, j + 1), B(i2, j + 1), B(i2, j), B(i, j)))
            faces.append((A(i, nv - 1), A(i2, nv - 1), po))
            faces.append((pi, B(i2, nv - 1), B(i, nv - 1)))
            rims.append((A(i2, 0), A(i, 0), B(i, 0), B(i2, 0)))
        o = self._add(pts, faces, mat)
        for f in rims:
            self.F.append(tuple(o + k for k in f))
            self.fmat.append(rim_mat or mat)
        return o

    def sheet(self, P, mat, close_u=False, pole=None, skip=None):
        """A one-sided surface (a knit membrane): quads of the grid, optionally closed by a fan to `pole` above the
        last row; skip(i, j) -> True leaves quad (i, j) out (an opening)."""
        P = np.asarray(P, float)
        nu, nv = P.shape[:2]
        pts = P.reshape(-1, 3)
        faces = []
        A = lambda i, j: i * nv + j                    # noqa: E731
        for i in range(nu if close_u else nu - 1):
            i2 = (i + 1) % nu
            for j in range(nv - 1):
                if skip is not None and skip(i, j):
                    continue
                faces.append((A(i, j), A(i2, j), A(i2, j + 1), A(i, j + 1)))
        if pole is not None:
            pts = np.concatenate([pts, [np.asarray(pole, float)]])
            for i in range(nu if close_u else nu - 1):
                faces.append((A(i, nv - 1), A((i + 1) % nu, nv - 1), nu * nv))
        return self._add(pts, faces, mat)

    def assign(self, o, n, parts):
        """Moves vertices [o, o + n) of the last added block to the given part indices (array of n)."""
        k = len(self.vpart) - 1
        start = self.nv - len(self.vpart[k])
        self.vpart[k][o - start:o - start + n] = np.asarray(parts, np.int64)

    def tube(self, path, radius, sides, mat, closed=False, hint=(0.0, 0.0, 1.0), scale=None):
        """A tube along a polyline (n, 3), radius a scalar or per-point list, `sides` round; capped unless closed.
        scale: optional (sx, sy) to flatten the section (a strap: wide and thin)."""
        path = np.asarray(path, float)
        n = len(path)
        r = np.broadcast_to(np.asarray(radius, float), (n,))
        sx, sy = scale or (1.0, 1.0)
        rings = []
        for k in range(n):
            if closed:
                d = path[(k + 1) % n] - path[k - 1]
            else:
                d = path[min(k + 1, n - 1)] - path[max(k - 1, 0)]
            x, y, _ = frame_from(d, hint)
            ring = [path[k] + (x * math.cos(a) * sx + y * math.sin(a) * sy) * r[k]
                    for a in np.linspace(0, 2 * math.pi, sides, endpoint=False)]
            rings.append(ring)
        pts = np.array(rings).reshape(-1, 3)
        faces = []
        segs = n if closed else n - 1
        for k in range(segs):
            k2 = (k + 1) % n
            for s in range(sides):
                s2 = (s + 1) % sides
                faces.append((k * sides + s, k * sides + s2, k2 * sides + s2, k2 * sides + s))
        if not closed:
            faces.append(tuple(reversed(range(sides))))
            faces.append(tuple((n - 1) * sides + s for s in range(sides)))
        return self._add(pts, faces, mat)

    def box(self, c, axes, half, mat, r=0.0, seg=1):
        """A box at c with axes (x, y, z unit vectors) and half sizes (hx, hy, hz). r > 0 rounds the four edges along
        z (a rounded-rectangle prism, `seg` segments per corner)."""
        c = np.asarray(c, float)
        X, Y, Z = (np.asarray(a, float) for a in axes)
        hx, hy, hz = half
        if r <= 0:
            ring = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
        else:
            r = min(r, hx * 0.95, hy * 0.95)
            ring = []
            for cx, cy, a0 in ((hx - r, -hy + r, -90), (hx - r, hy - r, 0), (-hx + r, hy - r, 90), (-hx + r, -hy + r, 180)):
                for k in range(seg + 1):
                    a = math.radians(a0 + 90.0 * k / seg)
                    ring.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        m = len(ring)
        pts = [c + X * u + Y * v + Z * w for w in (-hz, hz) for (u, v) in ring]
        faces = [tuple(reversed(range(m))), tuple(m + k for k in range(m))]
        for k in range(m):
            k2 = (k + 1) % m
            faces.append((k, k2, m + k2, m + k))
        return self._add(pts, faces, mat)

    def lathe(self, c, axis, profile, sides, mat, hint=(0.0, 0.0, 1.0)):
        """A closed solid of revolution about `axis` through c: profile [(r, h), ...] from one end to the other,
        r = 0 ends are poles."""
        x, y, z = frame_from(axis, hint)
        c = np.asarray(c, float)
        pts, faces = [], []
        rows = []
        for r, h in profile:
            if r <= 1e-6:
                rows.append([len(pts)])
                pts.append(c + z * h)
            else:
                row = []
                for a in np.linspace(0, 2 * math.pi, sides, endpoint=False):
                    row.append(len(pts))
                    pts.append(c + z * h + (x * math.cos(a) + y * math.sin(a)) * r)
                rows.append(row)
        for a, b in zip(rows, rows[1:]):
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                for s in range(sides):
                    faces.append((a[0], b[(s + 1) % sides], b[s]))
            elif len(b) == 1:
                for s in range(sides):
                    faces.append((a[s], a[(s + 1) % sides], b[0]))
            else:
                for s in range(sides):
                    s2 = (s + 1) % sides
                    faces.append((a[s], a[s2], b[s2], b[s]))
        if len(rows[0]) > 1:
            faces.append(tuple(reversed(rows[0])))
        if len(rows[-1]) > 1:
            faces.append(tuple(rows[-1]))
        return self._add(np.array(pts), faces, mat)

    # --- results --------------------------------------------------------------------------------------------------
    def arrays(self):
        V = np.concatenate(self.V) if self.V else np.zeros((0, 3))
        P = np.concatenate(self.vpart) if self.vpart else np.zeros(0, np.int64)
        return V, self.F, P

    def tris(self):
        return sum(len(f) - 2 for f in self.F)

    def part_tris(self):
        _, F, P = self.arrays()
        out = [0] * len(self.parts)
        for f in F:
            out[int(P[f[0]])] += len(f) - 2
        return out

    def bounds(self):
        V, _, _ = self.arrays()
        return V.min(axis=0), V.max(axis=0)

    def bones(self):
        return sorted({b for p in self.parts for b in p['bones']})


def ring_grid(fn, thetas, vs):
    """A (len(thetas), len(vs), 3) grid of fn(theta, v)."""
    return np.array([[fn(t, v) for v in vs] for t in thetas], float)
