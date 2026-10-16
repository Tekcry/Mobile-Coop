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


class Parts:
    """Per-material vertex, face and edge-distance lists."""

    def __init__(self):
        self.d = {}

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
        'metal': reuse(MAT.anodised, 'hardware gunmetal', colour=(0.05, 0.052, 0.056)),
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
    W = M(cu + du, cv + dv, h0 + off[2] + half[2] + L[:, 2])
    V[b0:b1] = list(W.reshape(-1, 3))
    E.extend(edge_local(np.array(L), half))
    return L, (b0, b1)


def mpts(M, pts, cu=0.0, cv=0.0, rot=0.0, h0=0.0):
    """Local polyline points (x, y, z) mapped like cbox (no centre offset)."""
    P = np.asarray(pts, float)
    du, dv = rot2(P[:, 0], P[:, 1], rot)
    return M(cu + du, cv + dv, h0 + P[:, 2]).reshape(-1, 3)


def tube(part, pts, r, sides=8, step=0.004, smooth=0):
    """A tube along a world polyline, resampled so no edge is long."""
    V, F, E = part
    E.extend([0.05] * (len(V) - len(E)))
    b0 = len(V)
    P = np.asarray(pts, float)
    P = TC.resample(P, step) if len(P) > 1 and TC.path_length(P) > step else P
    if smooth:
        P = FT.smooth_polyline(P, smooth)
    FT.tube(V, F, P, r, sides=sides)
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
                         attrs={'edge': Ek, 'wear': wear})
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


__all__ = ['Parts', 'materials', 'HField', 'RingMap', 'frame', 'cbox', 'mpts', 'tube', 'cord_loop', 'Z']
