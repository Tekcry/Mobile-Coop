"""Scratch (D22 options): three whole-figure stealth concepts for Wren. Not pipeline code.
blender -b base.blend --python stealth.py -- --concept A --dest DIR --samples 80 [--shots front,back34,side,rim,chest]
A2 (D23): concept A made logical for the game. Run with --concept A2.
The suit is the step 05 base-layer hero mesh re-zoned (stretch / abrasion panels, bonded seam tape).
Kit is laid on the suit by ray height fields (Frame), plates are TC.slab shells, straps are hull-bridged bands.
"""
import argparse
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

REPO = r'C:\NightShift\Mobile-Coop-operators\scripts\operators\py'
sys.path.insert(0, REPO)
sys.path.insert(0, os.path.join(REPO, 'garments'))
import fitted as FT  # noqa: E402
import head_common as HC  # noqa: E402
import torso_common as TC  # noqa: E402
import materials as MT  # noqa: E402
import render as RN  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--concept', required=True)
ap.add_argument('--dest', required=True)
ap.add_argument('--samples', type=int, default=80)
ap.add_argument('--shots', default='front,back34,side,rim,chest')
ap.add_argument('--scale', type=int, default=100)
ap.add_argument('--save', default='')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
CON = args.concept
args.dest = os.path.abspath(args.dest)
os.makedirs(args.dest, exist_ok=True)
sc = bpy.context.scene

X = np.array([1.0, 0.0, 0.0])
Y = np.array([0.0, 1.0, 0.0])
Z = np.array([0.0, 0.0, 1.0])

# ---------------------------------------------------------------- scene: hide the military layers
for o in bpy.data.objects:
    if o.type in ('LIGHT', 'CAMERA'):
        bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    n = o.name
    if (not n.startswith('wren-')) or n.startswith('wren-combat_shirt') or n.startswith('wren-trousers'):
        o.hide_render = True
        o.hide_viewport = True

for n in ('wren-head_kit-cable',):
    bpy.data.objects[n].hide_render = True
gpus = RN.use_gpu(sc, args.samples)
print('stealth: GPU', gpus, 'concept', CON)

rig = bpy.data.objects['wren-rig']


def joint(name):
    b = rig.data.bones[name]
    return np.array((rig.matrix_world @ b.head_local)[:])


J = {k: joint(k) for k in ('pelvis', 'spine', 'chest', 'neck', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR',
                           'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR')}

suit = bpy.data.objects['wren-base_layer-hero']
dg = bpy.context.evaluated_depsgraph_get()
suit_eval = suit.evaluated_get(dg)
me_s = suit_eval.to_mesh()
mw = np.array(suit.matrix_world)
nv = len(me_s.vertices)
SV = np.zeros(nv * 3)
me_s.vertices.foreach_get('co', SV)
SV = SV.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
SF = [tuple(p.vertices) for p in me_s.polygons]
suit_eval.to_mesh_clear()
TREE = BVHTree.FromPolygons([tuple(v) for v in SV], SF)
print('stealth: suit', nv, 'verts', len(SF), 'faces')


# ---------------------------------------------------------------- materials
def get_mat(name, maker):
    m = bpy.data.materials.get(name)
    return m if m else maker()


M = {
    'shell': MT.softshell('suit shell', (0.024, 0.025, 0.026)),
    'stretch': MT.knit('suit stretch', (0.0145, 0.015, 0.016)),
    'abr': MT.cordura('suit abrasion', (0.043, 0.042, 0.039)),
    'top': MT.knit('top knit', (0.022, 0.023, 0.024)),
    'trou': MT.softshell('trouser shell', (0.032, 0.033, 0.027)),
    'tape': MT.polymer('seam tape', (0.012, 0.012, 0.013), 0.74),
    'plate': MT.polymer('plate polymer', (0.034, 0.037, 0.041), 0.66),
    'plate2': MT.cordura('plate cover', (0.024, 0.025, 0.025)),
    'lam': MT.laminate('carrier laminate', (0.025, 0.026, 0.026)),
    'elastic': MT.elastic('band elastic', (0.024, 0.025, 0.026)),
    'web': bpy.data.materials['harness webbing'],
    'poly': bpy.data.materials['harness polymer'],
    'metal': bpy.data.materials['hardware metal'],
    'anod': bpy.data.materials['anodised aluminium'],
    'cordura': MT.cordura('pouch cordura', (0.023, 0.024, 0.025)),
    'pod': bpy.data.materials.get('pod polymer') or MT.polymer('pod', (0.022, 0.022, 0.023), 0.7),
    'cord': bpy.data.materials.get('shock cord') or MT.webbing('cord'),
    'zip': bpy.data.materials.get('zip teeth') or MT.polymer('zipt'),
    'slider': bpy.data.materials.get('zip slider') or MT.painted_metal('slider'),
    'mag': MT.polymer('mag polymer', (0.021, 0.021, 0.022), 0.62),
    'pistol': MT.polymer('pistol polymer', (0.02, 0.02, 0.021), 0.6),
    'pad': MT.cordura('pad cordura', (0.021, 0.022, 0.022)),
    'trim': MT.polymer('edge trim', (0.016, 0.016, 0.017), 0.8),
}


# ---------------------------------------------------------------- frames: ray height fields over the suit
def rot(v, axis, ang):
    axis = FT.unit(axis)
    return (v * math.cos(ang) + np.cross(axis, v) * math.sin(ang) + axis * (axis @ v) * (1 - math.cos(ang)))


def ray_poly_max(poly, d):
    """Largest t with t*d on the closed 2D polygon (outer crossing)."""
    best = 0.0
    n = len(poly)
    for k in range(n):
        a, b = poly[k], poly[(k + 1) % n]
        e = b - a
        den = d[0] * (-e[1]) - d[1] * (-e[0])
        if abs(den) < 1e-12:
            continue
        t = (a[0] * (-e[1]) - a[1] * (-e[0])) / den
        s = (d[0] * a[1] - d[1] * a[0]) / den
        if 0 <= s <= 1 and t > best:
            best = t
    return best


class Frame:
    """Cylindrical map round an axis: u = theta * R0 (theta 0 along f, +90 deg along s), v along the axis from A.
    R(u, v) = distance from the axis to the suit's first hit (rays cast outward from the axis)."""

    def __init__(self, A, B, f, s_hint, R0, v0, v1, th0=-math.pi / 2, th1=1.5 * math.pi, step=0.004, reach=0.35):
        A, B = np.asarray(A, float), np.asarray(B, float)
        self.A, self.ax = A, FT.unit(B - A)
        f = np.asarray(f, float)
        self.f = FT.unit(f - self.ax * (f @ self.ax))
        s = np.asarray(s_hint, float)
        s = s - self.ax * (s @ self.ax) - self.f * (s @ self.f)
        self.s = FT.unit(s)
        self.R0, self.th0, self.th1 = R0, th0, th1
        self.th = np.arange(th0, th1 + 1e-9, step / R0)
        self.vs = np.arange(v0, v1 + 1e-9, step)
        R = np.full((len(self.vs), len(self.th)), np.nan)
        for i, v in enumerate(self.vs):
            o = Vector(A + self.ax * v)
            for j, t in enumerate(self.th):
                d = math.cos(t) * self.f + math.sin(t) * self.s
                hit = TREE.ray_cast(o, Vector(d), reach)
                if hit[0] is not None:
                    r1 = hit[3]
                    o2 = o + Vector(d * (r1 + 0.008))
                    h2 = TREE.ray_cast(o2, Vector(-d), 0.0085)
                    R[i, j] = r1 + 0.008 - h2[3] if h2[0] is not None else r1
        self.raw = self._fill(R)
        self.rig = self._blur(self._dilate_v(self._hull_rows(self.raw), 3), 3)
        self.soft = self._blur(self.raw, 1)

    @staticmethod
    def _fill(R):
        R = R.copy()
        good = ~np.isnan(R)
        if not good.any():
            raise SystemExit('frame: no hits')
        med = np.nanmedian(R)
        for i in range(R.shape[0]):
            row = R[i]
            g = ~np.isnan(row)
            if g.sum() >= 2:
                idx = np.arange(len(row))
                R[i] = np.interp(idx, idx[g], row[g])
        for j in range(R.shape[1]):
            col = R[:, j]
            g = ~np.isnan(col)
            if g.sum() >= 2:
                idx = np.arange(len(col))
                R[:, j] = np.interp(idx, idx[g], col[g])
        R[np.isnan(R)] = med
        return R

    def _hull_rows(self, R):
        out = R.copy()
        c, s_ = np.cos(self.th), np.sin(self.th)
        for i in range(R.shape[0]):
            P2 = np.stack([c * R[i], s_ * R[i]], 1)
            hull = FT.hull2d(P2)
            out[i] = [max(R[i, j], ray_poly_max(hull, np.array([c[j], s_[j]]))) for j in range(len(c))]
        return out

    @staticmethod
    def _dilate_v(R, k):
        out = R.copy()
        for di in range(-k, k + 1):
            out = np.maximum(out, np.roll(R, di, 0))
        return out

    @staticmethod
    def _dilate(R, k):
        out = R.copy()
        for di in range(-k, k + 1):
            for dj in range(-k, k + 1):
                out = np.maximum(out, np.roll(np.roll(R, di, 0), dj, 1))
        return out

    @staticmethod
    def _blur(R, n):
        for _ in range(n):
            P = np.pad(R, 1, mode='edge')
            R = (P[:-2, 1:-1] + P[2:, 1:-1] + P[1:-1, :-2] + P[1:-1, 2:] + 2 * P[1:-1, 1:-1]) / 6
        return R

    def R(self, u, v, mode='rig'):
        G = getattr(self, mode)
        u, v = np.broadcast_arrays(np.asarray(u, float), np.asarray(v, float))
        ti = np.clip((u / self.R0 - self.th0) / (self.th[1] - self.th[0]), 0, len(self.th) - 1.001)
        vi = np.clip((v - self.vs[0]) / (self.vs[1] - self.vs[0]), 0, len(self.vs) - 1.001)
        t0, v0 = ti.astype(int), vi.astype(int)
        ft, fv = ti - t0, vi - v0
        return ((G[v0, t0] * (1 - ft) + G[v0, t0 + 1] * ft) * (1 - fv)
                + (G[v0 + 1, t0] * (1 - ft) + G[v0 + 1, t0 + 1] * ft) * fv)

    def dirs(self, th):
        th = np.asarray(th, float)
        return np.cos(th)[..., None] * self.f + np.sin(th)[..., None] * self.s

    def P(self, u, v, h=0.0, mode='rig'):
        u, v, h = np.broadcast_arrays(np.asarray(u, float), np.asarray(v, float), np.asarray(h, float))
        r = self.R(u, v, mode) + h
        return self.A + v[..., None] * self.ax + self.dirs(u / self.R0) * r[..., None]

    def basis(self, u, v, h=0.0, mode='rig'):
        e = 0.002
        P = self.P(u, v, h, mode)
        tu = FT.unit(self.P(u + e, v, h, mode) - self.P(u - e, v, h, mode))
        tv = FT.unit(self.P(u, v + e, h, mode) - self.P(u, v - e, h, mode))
        n = FT.unit(np.cross(tu, tv))
        if n @ self.dirs(u / self.R0) < 0:
            n = -n
        tv = FT.unit(tv - n * (tv @ n))
        tu = FT.unit(np.cross(tv, n))
        return P, tu, tv, n

    def local(self, Pw):
        d = Pw - self.A
        v = d @ self.ax
        rv = d - np.outer(v, self.ax)
        th = np.arctan2(rv @ self.s, rv @ self.f)
        th = np.where(th < self.th0, th + 2 * math.pi, th)
        th = np.where(th > self.th0 + 2 * math.pi, th - 2 * math.pi, th)
        return th * self.R0, v, np.linalg.norm(rv, axis=1)


def envelope(v, r):
    """Smallest concave function over (v, r) points: a rigid plate's profile over hollows."""
    hull = []
    for p in zip(v, r):
        while len(hull) >= 2:
            (x1, y1), (x2, y2) = hull[-2], hull[-1]
            if (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1) >= 0:
                hull.pop()
            else:
                break
        hull.append(p)
    hx, hy = zip(*hull)
    return np.interp(v, hx, hy)


_PM = [0]


class PlateMap:
    def __init__(self, fr, off, mode='rig', vr=None):
        self.fr, self.off, self.mode = fr, off, mode
        if vr is not None and mode == 'rig':
            G = fr.rig.copy()
            i0 = max(0, int((vr[0] - fr.vs[0]) / (fr.vs[1] - fr.vs[0])) - 1)
            i1 = min(len(fr.vs), int((vr[1] - fr.vs[0]) / (fr.vs[1] - fr.vs[0])) + 2)
            for j in range(G.shape[1]):
                G[i0:i1, j] = envelope(fr.vs[i0:i1], G[i0:i1, j])
            _PM[0] += 1
            self.mode = f'pm{_PM[0]}'
            setattr(fr, self.mode, G)

    def S(self, x, y, h=0.0):
        return self.fr.P(x, y, np.asarray(h, float) + self.off, self.mode)


# frames (Blender: +Z up, faces -Y, wearer's left +X)
ZT0 = 0.80
print('stealth: building frames')
FR = {}
FR['torso'] = Frame((0, 0.01, ZT0), (0, 0.01, 1.5), -Y, X, 0.14, 0.0, 0.62)
FR['shL'] = Frame((0.06, 0.0, 1.31), (0.30, 0.0, 1.31), Z, -Y, 0.07, 0.0, 0.18, th0=-math.pi, th1=math.pi)
FR['shR'] = Frame((-0.06, 0.0, 1.31), (-0.30, 0.0, 1.31), Z, -Y, 0.07, 0.0, 0.18, th0=-math.pi, th1=math.pi)
for side, sg in (('L', 1.0), ('R', -1.0)):
    lat = X * sg
    FR['thigh' + side] = Frame(J['hip' + side] + np.array([0, 0, 0.06]), J['kn' + side], -Y, lat, 0.075, 0.0, 0.46)
    FR['shin' + side] = Frame(J['kn' + side], J['an' + side], -Y, lat, 0.055, -0.06, 0.34)
    FR['uarm' + side] = Frame(J['sh' + side], J['el' + side], -Y, lat, 0.045, 0.0, 0.30)
    FR['farm' + side] = Frame(J['el' + side], J['wr' + side], -Y, lat, 0.035, -0.04, 0.22)
print('stealth: frames done')


# ---------------------------------------------------------------- mesh helpers
PARTS = {}


def part(key):
    return PARTS.setdefault(key, ([], []))


def recalc(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def flush():
    for key, (V, F) in PARTS.items():
        if not F:
            continue
        V = np.asarray(V, float)
        ob = FT.add_mesh(sc, f'stealth-{CON}-{key}', V, F, M[key], smooth=True, uv=TC.box_uv(V, F),
                         attrs={'wear': np.zeros(len(V))})
        recalc(ob)
        mod = ob.modifiers.new('ws', 'WEIGHTED_NORMAL') if False else None
    PARTS.clear()


def outline_rr(u0, u1, v0, v1, r, notch=None):
    """Rounded rectangle (counter-clockwise) in (u, v); notch: list of extra polygon points replacing the top edge."""
    pts = [(u0, v0), (u1, v0), (u1, v1)]
    if notch:
        pts += notch
    pts += [(u0, v1)]
    poly = TC.fillet(np.array(pts), r, seg=6)
    return TC.densify_closed(poly, 0.004)


def plate(key, fr, outline, off, thick, rr=0.006, mode='rig'):
    V, F = part(key)
    outline = np.asarray(outline, float)
    pm = PlateMap(fr, off, mode, vr=(outline[:, 1].min(), outline[:, 1].max()))
    TC.slab(V, F, pm, outline, thick, rr=rr, rings=14)
    if key in ('plate', 'lam', 'pod') and thick > 0.004:
        # bound / rubberised edge trim round the rim
        E = pm.S(outline[:, 0], outline[:, 1], np.full(len(outline), thick * 0.5))
        tube_w('trim', np.vstack([E, E[:1]]), thick * 0.5 + 0.0004, sides=8)
    return pm



def band(key, fr, v, width, thick, off=0.0015, th0=None, th1=None, n=None, mode='raw', profile_round=0.35):
    """A strap round the frame axis at height v (hull-bridged: it runs straight over hollows)."""
    th0 = fr.th0 if th0 is None else th0
    th1 = fr.th1 if th1 is None else th1
    full = abs((th1 - th0) - 2 * math.pi) < 1e-6
    if n is None:
        n = max(16, int(abs(th1 - th0) * fr.R0 / 0.005))
    ths = np.linspace(th0, th1, n, endpoint=not full)
    rows = []
    for vv in (v - width / 2, v + width / 2):
        thg = np.linspace(th0, th1, 240, endpoint=not full)
        r = fr.R(thg * fr.R0, np.full_like(thg, vv), mode)
        P2 = np.stack([np.cos(thg) * r, np.sin(thg) * r], 1)
        hull = FT.hull2d(P2)
        rr = np.array([ray_poly_max(hull, np.array([math.cos(t), math.sin(t)])) for t in ths])
        rows.append(rr)
    rin = np.maximum(rows[0], rows[1]) + off
    V, F = part(key)
    base = len(V)
    e = min(width * 0.25, thick * profile_round * 2)
    prof = [(0.0, -width / 2 + e), (thick * 0.5, -width / 2), (thick, -width / 2 + e),
            (thick, width / 2 - e), (thick * 0.5, width / 2), (0.0, width / 2 - e)]
    k = len(prof)
    for j, t in enumerate(ths):
        d = fr.dirs(t)
        for hh, dv in prof:
            V.append(fr.A + fr.ax * (v + dv) + d * (rin[j] + hh))
    m = n if full else n - 1
    for j in range(m):
        j2 = (j + 1) % n
        for q in range(k):
            q2 = (q + 1) % k
            F.append((base + j * k + q, base + j2 * k + q, base + j2 * k + q2, base + j * k + q2))
    if not full:
        F.append(tuple(base + q for q in range(k))[::-1])
        F.append(tuple(base + (n - 1) * k + q for q in range(k)))
    return ths, rin


def surf_strip(key, fr, uv_pts, width, thick, off=0.0015, mode='rig', step=0.004):
    uv = np.asarray(uv_pts, float)
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(uv, axis=0), axis=1))]
    s = np.linspace(0, L[-1], max(3, int(L[-1] / step)))
    us, vs = np.interp(s, L, uv[:, 0]), np.interp(s, L, uv[:, 1])
    P = fr.P(us, vs, off, mode)
    N = np.array([fr.basis(a, b, off, mode)[3] for a, b in zip(us, vs)])
    T = TC.tangents(P)
    B = FT.unit(np.cross(N, T))
    V, F = part(key)
    FT.strip(V, F, P, N, B, width, thick)
    return P, N, T, B


def box_at(key, fr, u, v, h, half, r, ang=0.0, mode='rig', tilt=0.0):
    """Rounded box on the frame surface at (u, v): half sizes along (tu, tv, n), turned by ang about n; tilt about tu
    (tips the top out)."""
    P, tu, tv, n = fr.basis(u, v, 0.0, mode)
    tu2, tv2 = rot(tu, n, ang), rot(tv, n, ang)
    if tilt:
        tv2, n = rot(tv2, tu2, tilt), rot(n, tu2, tilt)
    c = P + n * (h + half[2])
    V, F = part(key)
    HC.rbox(V, F, c, np.array([tu2, tv2, n]), half, r, step=0.004)
    return c, tu2, tv2, n


def rbox_w(key, c, axes, half, r, step=0.004):
    V, F = part(key)
    HC.rbox(V, F, np.asarray(c, float), np.asarray(axes, float), half, r, step=step)


def tube_w(key, pts, r, sides=8, closed=False):
    V, F = part(key)
    FT.tube(V, F, np.asarray(pts, float), r, sides=sides, closed=closed)


# ---------------------------------------------------------------- suit zoning (stretch / abrasion panels) and tape
def in_poly(poly, U, Vv):
    inside = np.zeros(len(U), bool)
    n = len(poly)
    for k in range(n):
        x1, y1 = poly[k]
        x2, y2 = poly[(k + 1) % n]
        c = ((y1 > Vv) != (y2 > Vv)) & (U < (x2 - x1) * (Vv - y1) / (y2 - y1 + 1e-12) + x1)
        inside ^= c
    return inside


def ellipse(uc, vc, a, b, n=72):
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    return np.stack([uc + a * np.cos(t), vc + b * np.sin(t)], 1)


ZONES = []      # (label, frame key, outline)


def zone(label, fk, poly):
    ZONES.append((label, fk, np.asarray(poly, float)))


def suit_zones(variant):
    R0 = {k: f.R0 for k, f in FR.items()}
    for sd, sg in (('L', 1), ('R', -1)):
        # knees: front abrasion pad panel, back-of-knee stretch
        kv = 0.0
        zone('abr', 'shin' + sd, ellipse(0.0, kv - 0.005, 0.055, 0.085))
        zone('stretch', 'shin' + sd, ellipse(math.pi * R0['shin' + sd], kv, 0.06, 0.07))
        # elbows: outer point abrasion, inner stretch
        zone('abr', 'farm' + sd, ellipse(math.pi * R0['farm' + sd], 0.0, 0.04, 0.05))
        zone('stretch', 'farm' + sd, ellipse(0.0, -0.01, 0.035, 0.04))
        # forearm outer abrasion panel (wrist to below the elbow)
        if variant != 'C':
            zone('abr', 'farm' + sd, outline_rr(0.55 * math.pi / 2 * R0['farm' + sd] * 0 + 0.02, 0.085,
                                                 0.06, 0.20, 0.012))
        # shoulder tops: abrasion yoke on the shoulder frame (theta 0 = up)
        if variant != 'C':
            zone('abr', 'sh' + sd, outline_rr(-0.075, 0.07, 0.035, 0.14, 0.02))
        # armpit / side stretch gusset: torso side band down from the armpit
        su = (math.pi / 2) * 0.14 * sg
        zone('stretch', 'torso', outline_rr(su - 0.035, su + 0.035, 0.27, 0.5, 0.02))
        # rear shoulder stretch panel (reach)
        zone('stretch', 'sh' + sd, outline_rr(-math.pi * 0.07 * 0.95, -0.085, 0.04, 0.15, 0.015))
    # seat abrasion
    zone('abr', 'torso', outline_rr(math.pi * 0.14 - 0.12, math.pi * 0.14 + 0.12, 0.0, 0.13, 0.04))


LABEL_IDX = {'shell': 0, 'stretch': 1, 'abr': 2}


def apply_suit(variant):
    suit_zones(variant)
    me = suit.data
    names = ['shell', 'stretch', 'abr'] if variant != 'B' else ['top', 'stretch', 'abr', 'trou']
    me.materials.clear()
    for k in names:
        me.materials.append(M[k])
    npoly = len(me.polygons)
    C = np.zeros(npoly * 3)
    me.polygons.foreach_get('center', C)
    C = C.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
    lab = np.zeros(npoly, int)
    if variant == 'B':
        lab[C[:, 2] < 0.935] = 3
    for label, fk, poly in ZONES:
        fr = FR[fk]
        u, v, r = fr.local(C)
        lo, hi = poly.min(0), poly.max(0)
        cand = (u >= lo[0]) & (u <= hi[0]) & (v >= lo[1]) & (v <= hi[1])
        idx = np.nonzero(cand)[0]
        if not len(idx):
            continue
        Rf = fr.R(u[idx], v[idx], 'raw')
        ok = np.abs(r[idx] - Rf) < 0.012
        ins = in_poly(poly, u[idx], v[idx]) & ok
        lab[idx[ins]] = LABEL_IDX[label]
        # bonded seam tape along the zone outline
        surf_strip('tape', fr, np.vstack([poly, poly[:1]]), 0.0055, 0.0007, off=0.0003, mode='soft')
    me.polygons.foreach_set('material_index', lab.tolist())
    me.update()


# ---------------------------------------------------------------- kit pieces
TOR = FR['torso']
TU = TOR.R0 * math.pi          # u of the back centre


def zt(z):
    return z - ZT0


def sit_harness(slim=False):
    """Climbing sit harness: waist belt, leg loops, belay loop, gear loops, buckle, descender on a locker."""
    w = 0.032 if slim else 0.044
    band('web' if slim else 'pad', TOR, zt(0.925), w, 0.0045 if slim else 0.007, off=0.0018)
    # buckle at the front (two-part metal, own shape), slightly off centre
    P, tu, tv, n = TOR.basis(0.035, zt(0.925), 0.008)
    rbox_w('metal', P + n * 0.004, [tu, tv, n], (0.017, 0.012 if slim else 0.016, 0.004), 0.003)
    rbox_w('metal', P + n * 0.004 + tu * 0.026, [tu, tv, n], (0.008, 0.010, 0.003), 0.0025)
    for sd, sg in (('L', 1), ('R', -1)):
        th = FR['thigh' + sd]
        band('web' if slim else 'pad', th, 0.155, 0.03 if slim else 0.036, 0.004 if slim else 0.006, off=0.0016)
        # rear elastic risers: leg loop back to waist belt back
        surf_strip('elastic', TOR, [(TU - 0.07 * sg, zt(0.905)), (TU - 0.075 * sg, zt(0.80))], 0.018, 0.002,
                   off=0.004)
        if not slim:
            # gear loops on the waist belt sides (moulded polymer arcs)
            for uu in (0.10, 0.20):
                ua = uu * sg
                pts = []
                for t in np.linspace(0, math.pi, 12):
                    q = TOR.P(ua + 0.025 * math.cos(t) * sg, zt(0.905) - 0.014 * math.sin(t), 0.010 + 0.002 * math.sin(t))
                    pts.append(q)
                tube_w('poly', pts, 0.0045, sides=8)
    # belay loop: flat sewn webbing loop, front centre, waist tie-in down to the leg-loop tie-in
    P0 = TOR.P(0.0, zt(0.905), 0.010)
    P1 = TOR.P(0.0, zt(0.835), 0.025)
    ctr = (P0 + P1) / 2
    loop, rad = [], []
    for t in np.linspace(0, 2 * math.pi, 41):
        q = ctr + (P0 - P1) / 2 * math.cos(t) + X * 0.011 * math.sin(t)
        loop.append(q)
    loop = np.array(loop)
    pn = FT.unit(np.cross(P0 - P1, X))
    rad = FT.unit(loop - ctr)
    V, F = part('web')
    FT.strip(V, F, loop - pn * 0.009, rad, np.repeat(pn[None], len(loop), 0), 0.018, 0.003, caps=False)
    # leg-loop tie-in straps to the belay loop
    for sd, sg in (('L', 1), ('R', -1)):
        Q = FR['thigh' + sd].P(-0.035, 0.15, 0.006)
        tube_w('web', [P1 + X * 0.006 * sg, (P1 + Q) / 2 - Y * 0.006, Q], 0.0055, sides=6)
    # locking carabiner (pear) on the belay loop, plate descender on it
    c = P1 + np.array([0.0, -0.012, -0.03])
    car = []
    for t in np.linspace(0, 2 * math.pi, 36, endpoint=False):
        rx = 0.016 if math.sin(t) > 0 else 0.011
        car.append(c + X * rx * math.cos(t) + Z * 0.04 * math.sin(t) * 0.8)
    tube_w('anod', car, 0.0042, sides=8, closed=True)
    tube_w('anod', [c + X * 0.016 + Z * 0.005, c + X * 0.017 - Z * 0.012], 0.0062, sides=8)   # locking sleeve
    dc = c + np.array([-0.004, -0.010, -0.05])
    rbox_w('anod', dc, [X, Z, -Y], (0.019, 0.034, 0.004), 0.0035)
    for dz in (0.012, -0.010):
        ring = [dc + X * 0.006 * math.cos(t) + Z * (dz + 0.010 * math.sin(t)) - Y * 0.0045
                for t in np.linspace(0, 2 * math.pi, 20, endpoint=False)]
        tube_w('metal', ring, 0.0016, sides=6, closed=True)
    # haul loop at the back
    hb = TOR.P(TU, zt(0.94), 0.008)
    tube_w('web', [hb + Z * 0.012 + X * 0.012, hb + Z * 0.03 - Y * -0.01, hb + Z * 0.012 - X * 0.012], 0.004)


def thigh_holster(sd='R', hang_from=0.905, low=True):
    sg = 1 if sd == 'L' else -1
    th = FR['thigh' + sd]
    uc = 0.06 * sg * 1.0       # outer-front of the thigh (theta ~ +45..70 deg lateral)
    uc = (math.radians(80) * th.R0) * 1.0
    v0, v1 = (0.20, 0.38) if low else (0.10, 0.28)
    plate('poly', th, outline_rr(uc - 0.042, uc + 0.042, v0, v1, 0.012), 0.004, 0.004, rr=0.002)
    for vv in (v0 + 0.05, v1 - 0.04):
        band('web', th, vv, 0.026, 0.0028, off=0.0016)
        P, tu, tv, n = th.basis(uc - 0.03, vv, 0.010)
        rbox_w('poly', P + n * 0.003, [tu, tv, n], (0.012, 0.014, 0.004), 0.002)       # side-release buckle
    # hanger from the waist belt
    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.025, 0.0028, off=0.006)
    # moulded holster shell (pistol in it, muzzle down), grip out at the top, retention hood
    c, tu, tv, n = box_at('pistol', th, uc, (v0 + v1) / 2 + 0.01, 0.008, (0.026, 0.085, 0.017), 0.009)
    # the thigh frame's v runs down the leg, so -tv is up
    up = -tv
    rbox_w('pistol', c + up * 0.105 + n * 0.006 + tu * 0.0, [tu, up, n], (0.014, 0.045, 0.012), 0.006)   # grip
    rbox_w('poly', c + up * 0.07 + n * 0.014, [tu, up, n], (0.022, 0.016, 0.006), 0.004)            # hood
    tube_w('pistol', [c - up * 0.085, c - up * 0.14], 0.0135, sides=14)                           # suppressor
    tube_w('metal', [c - up * 0.139, c - up * 0.141], 0.0137, sides=14)


def utility_pouch(sd='L', low=True):
    th = FR['thigh' + sd]
    uc = math.radians(62) * th.R0
    v0 = 0.21 if low else 0.12
    band('web', th, v0 + 0.11, 0.024, 0.0026, off=0.0016)
    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.022, 0.0026, off=0.005)
    c, tu, tv, n = box_at('cordura', th, uc, v0 + 0.07, 0.003, (0.042, 0.065, 0.013), 0.008)
    rbox_w('cordura', c - tv * 0.05 + n * 0.012, [tu, tv, n], (0.044, 0.018, 0.003), 0.003)      # flap
    rbox_w('poly', c - tv * 0.034 + n * 0.0155, [tu, tv, n], (0.008, 0.005, 0.002), 0.0015)       # pull tab


def forearm_pouch(sd='L'):
    fa = FR['farm' + sd]
    uc = math.radians(80) * fa.R0
    plate('cordura', fa, outline_rr(uc - 0.03, uc + 0.03, 0.06, 0.15, 0.01), 0.002, 0.011, rr=0.005)
    for vv in (0.075, 0.135):
        band('elastic', fa, vv, 0.014, 0.002, off=0.0012)
    P, tu, tv, n = fa.basis(uc, 0.105, 0.013)
    tube_w('zip', [fa.P(uc - 0.026, 0.07, 0.0135), fa.P(uc - 0.026, 0.14, 0.0135)], 0.0012, sides=6)


def back_pod(z0=0.955, z1=1.075, w=0.11, thick=0.048):
    plate('pod', TOR, outline_rr(TU - w, TU + w, zt(z0), zt(z1), 0.03), 0.004, thick, rr=0.018)
    ol = outline_rr(TU - w + 0.004, TU + w - 0.004, zt(z0) + 0.004, zt(z1) - 0.004, 0.026)
    P = TOR.P(ol[:, 0], ol[:, 1], 0.004 + thick * 0.62)
    tube_w('poly', np.vstack([P, P[:1]]), 0.0016, sides=6)
    for uu in (TU - w * 0.6, TU + w * 0.6):
        surf_strip('web', TOR, [(uu, zt(z1) + 0.06), (uu, zt(z1) - 0.01)], 0.02, 0.0025, off=0.004)


def mag(key, fr, u, v, h, ang, pistol=True, mode='rig'):
    hw, hh, hd = (0.017, 0.042, 0.011) if pistol else (0.026, 0.055, 0.016)
    c, tu, tv, n = box_at(key, fr, u, v, h, (hw, hh, hd), 0.006, ang=ang, mode=mode)
    up = tv if fr is not TOR else tv
    rbox_w('mag', c + up * (hh + 0.006) + n * 0.0, [tu, up, n], (hw * 0.62, 0.012, hd * 0.75), 0.004)
    # shock-cord retention loop over the mag top and a pull tab
    loop = [c + up * (hh + 0.009) + tu * hw * 0.55 * math.cos(t) + n * (hd * 0.85) * math.sin(t)
            for t in np.linspace(-0.2, math.pi + 0.2, 12)]
    tube_w('cord', loop, 0.0016, sides=6)
    rbox_w('poly', c + up * (hh + 0.015) + n * (hd * 0.9), [tu, up, n], (0.006, 0.005, 0.0018), 0.0012)
    return c, tu, up, n


def chest_zip():
    pts = [(0.045, zt(1.405)), (-0.03, zt(1.35)), (-0.11, zt(1.28)), (-0.17, zt(1.21))]
    P, N, T, B = surf_strip('zip', TOR, pts, 0.0075, 0.0012, off=0.0012, mode='soft')
    rbox_w('slider', P[2] + N[2] * 0.003, [B[2], T[2], N[2]], (0.006, 0.009, 0.0025), 0.0015)


# ---------------------------------------------------------------- concepts
def concept_A():
    apply_suit('A')
    chest_zip()
    # contoured low-profile chest plate (shooter's cut at the shoulders, neck scoop)
    neck = [(0.075, zt(1.335)), (0.04, zt(1.31)), (-0.04, zt(1.31)), (-0.075, zt(1.335))]
    ol = outline_rr(-0.115, 0.115, zt(1.14), zt(1.335), 0.03, notch=neck)
    cp = plate('plate', TOR, ol, 0.0155, 0.0065, rr=0.0042)
    # overlapping rib / abdomen segments (each tucks under the one above)
    for k, (z0, z1, hw, off) in enumerate(((1.085, 1.152, 0.105, 0.0105), (1.035, 1.10, 0.095, 0.0058),
                                           (0.985, 1.05, 0.085, 0.0012))):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.018), off, 0.0045, rr=0.0035)
    # slim back plate
    plate('plate', TOR, outline_rr(TU - 0.10, TU + 0.10, zt(1.14), zt(1.33), 0.035), 0.008, 0.0065, rr=0.004)
    # low plate harness: narrow side straps under the arms, slim shoulder straps
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=0.72, th1=math.pi - 0.5)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=-math.pi / 2, th1=-0.72)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=math.pi + 0.5, th1=1.5 * math.pi)
    for sd in ('L', 'R'):
        fr = FR['sh' + sd]
        band('web', fr, 0.045, 0.024, 0.003, off=0.003, th0=-1.6, th1=1.52, mode='rig')
        P, tu, tv, n = fr.basis(1.42 * fr.R0, 0.045, 0.006)
        rbox_w('poly', P + n * 0.003, [tv, tu, n], (0.016, 0.011, 0.0035), 0.002)
    # flat chest rig on the plate: two angled mag slots (left), one gadget slot (right)
    for k, u in enumerate((0.026, 0.074)):
        mag('cordura', TOR, u, zt(1.19), 0.0225, -0.32, pistol=True, mode=cp.mode)
    c, tu, tv, n = box_at('cordura', TOR, -0.06, zt(1.215), 0.0225, (0.036, 0.04, 0.012), 0.007, mode=cp.mode)
    rbox_w('cordura', c + tv * 0.03 + n * 0.012, [tu, tv, n], (0.038, 0.014, 0.003), 0.003)
    # PTT on the left shoulder strap
    P, tu, tv, n = FR['shL'].basis(0.045 * 0 + 0.0, 0.045, 0.006)
    rbox_w('poly', FR['shL'].P(1.25 * 0.07, 0.045, 0.012), [X, Z, -Y], (0.012, 0.016, 0.006), 0.004)
    sit_harness(slim=False)
    thigh_holster('R', low=True)
    utility_pouch('L', low=True)
    forearm_pouch('L')
    back_pod()


def concept_B():
    apply_suit('B')
    # cut-down minimal carrier: front and back plate bags in laminate, the chest rig built into the front
    neck = [(0.07, zt(1.32)), (0.035, zt(1.30)), (-0.035, zt(1.30)), (-0.07, zt(1.32))]
    fp = plate('lam', TOR, outline_rr(-0.115, 0.115, zt(1.06), zt(1.32), 0.025, notch=neck), 0.009, 0.016, rr=0.007)
    plate('lam', TOR, outline_rr(TU - 0.105, TU + 0.105, zt(1.06), zt(1.32), 0.025), 0.009, 0.014, rr=0.007)
    # built-in rig: three mag slots across the lower front, admin flap above
    for u in (-0.07, 0.0, 0.07):
        mag('cordura', TOR, u, zt(1.115), 0.0245, 0.0, pistol=True, mode=fp.mode)
    c, tu, tv, n = box_at('cordura', TOR, 0.0, zt(1.245), 0.0245, (0.085, 0.035, 0.007), 0.006, mode=fp.mode)
    tube_w('zip', [c + tv * 0.03 - tu * 0.075 + n * 0.007, c + tv * 0.03 + tu * 0.075 + n * 0.007], 0.0014)
    # narrow elastic cummerbund, slim padded shoulder straps
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=0.7, th1=math.pi - 0.6)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=-math.pi / 2, th1=-0.7)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=math.pi + 0.6, th1=1.5 * math.pi)
    for sd in ('L', 'R'):
        band('pad', FR['sh' + sd], 0.05, 0.036, 0.007, off=0.003, th0=-1.6, th1=1.6, mode='rig')
    # articulated knees with low knee armour: two overlapping hard shells per knee
    for sd in ('L', 'R'):
        sh = FR['shin' + sd]
        band('elastic', sh, 0.058, 0.018, 0.002, off=0.0012)
        plate('plate', sh, outline_rr(-0.045, 0.045, -0.035, 0.03, 0.02), 0.0045, 0.008, rr=0.004)
        plate('plate', sh, outline_rr(-0.038, 0.038, 0.034, 0.085, 0.016), 0.0036, 0.006, rr=0.0035)
        # knee darts (stitched tucks) above the knee: tape lines on the trousers
        for du in (-0.03, 0.03):
            surf_strip('tape', FR['thigh' + sd], [(du, 0.33), (du * 0.6, 0.39)], 0.003, 0.0006, off=0.0008,
                       mode='soft')
    # belt that doubles as a climbing harness: wide belt, leg loops sewn to it, belay loop, locker
    sit_harness(slim=False)
    thigh_holster('R', low=True)
    back_pod(z0=0.95, z1=1.05, w=0.10, thick=0.04)


def concept_C():
    apply_suit('C')
    chest_zip()
    # bonded armour panels: chest (split at the sternum), segmented abdomen, shoulders, forearms, shins
    # one bonded chest panel (rigid: it bridges the bust, no anatomical sculpting), two flex segments below
    neck = [(0.07, zt(1.345)), (0.035, zt(1.325)), (-0.035, zt(1.325)), (-0.07, zt(1.345))]
    plate('plate', TOR, outline_rr(-0.11, 0.11, zt(1.165), zt(1.345), 0.03, notch=neck), 0.003, 0.0055, rr=0.0035)
    for z0, z1, hw in ((1.11, 1.155, 0.085), (1.06, 1.10, 0.078)):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.016), 0.002, 0.0045, rr=0.003)
    plate('plate', TOR, outline_rr(TU - 0.09, TU + 0.09, zt(1.13), zt(1.33), 0.03), 0.003, 0.0055, rr=0.0035)
    for sd, sg in (('L', 1), ('R', -1)):
        shf = FR['sh' + sd]
        plate('plate', shf, outline_rr(-0.06, 0.06, 0.06, 0.125, 0.02), 0.003, 0.005, rr=0.003)
        ua = FR['uarm' + sd]
        lat = math.pi / 2 * ua.R0
        plate('plate', ua, outline_rr(lat - 0.045, lat + 0.045, 0.02, 0.075, 0.018), 0.003, 0.0048, rr=0.003)
        plate('plate', ua, outline_rr(lat - 0.04, lat + 0.04, 0.085, 0.135, 0.016), 0.003, 0.0045, rr=0.003)
        fa = FR['farm' + sd]
        uo = math.radians(115) * fa.R0
        plate('plate', fa, outline_rr(uo - 0.035, uo + 0.035, -0.035, 0.03, 0.016), 0.003, 0.0048, rr=0.003)
        plate('plate', fa, outline_rr(uo - 0.03, uo + 0.03, 0.04, 0.12, 0.014), 0.003, 0.0045, rr=0.003)
        plate('plate', fa, outline_rr(uo - 0.026, uo + 0.026, 0.13, 0.20, 0.012), 0.003, 0.0042, rr=0.003)
        sh = FR['shin' + sd]
        plate('plate', sh, outline_rr(-0.042, 0.042, -0.045, 0.03, 0.02), 0.003, 0.006, rr=0.0035)
        plate('plate', sh, outline_rr(-0.036, 0.036, 0.04, 0.17, 0.016), 0.003, 0.005, rr=0.003)
        plate('plate', sh, outline_rr(-0.032, 0.032, 0.18, 0.28, 0.014), 0.003, 0.0045, rr=0.003)
    # flush suit pockets: thin bonded pockets with a zip across the top
    def pocket(fr, u0, u1, v0, v1, zip_top):
        plate('shell', fr, outline_rr(u0, u1, v0, v1, 0.01), 0.0012, 0.003, rr=0.0015, mode='soft')
        vz = v1 - 0.008 if zip_top else v0 + 0.008
        tube_w('zip', fr.P(np.linspace(u0 + 0.008, u1 - 0.008, 12), np.full(12, vz), 0.0045, 'soft'), 0.0013)
    thL = FR['thighL']
    pocket(thL, math.radians(40) * thL.R0, math.radians(95) * thL.R0, 0.08, 0.22, False)
    uaL = FR['uarmL']
    pocket(uaL, math.radians(-10) * uaL.R0, math.radians(60) * uaL.R0, 0.12, 0.2, False)
    pocket(TOR, -0.165, -0.105, zt(1.0), zt(1.1), False)
    pocket(TOR, 0.03, 0.105, zt(0.84), zt(0.92), False)
    # slim rope harness only, the thigh holster, a slim mag carrier on the left hip
    sit_harness(slim=True)
    thigh_holster('R', low=True)
    for u in (0.12, 0.165):
        mag('cordura', TOR, u, zt(0.85) - 0.0, 0.006, 0.12, pistol=True, mode='raw')




# ================================================================ A2 (D23): concept A made logical for the game
G = MT.Graph


def mat_shell(name, colour):
    """Premium bonded suit face: a fine tonal diamond micro-emboss (about 1.6 mm) over a matte soft-shell."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = G(mat)
    u, v, _ = g.uv()
    a = g.tri(g.math('ADD', u, v), 0.0016)
    b = g.tri(g.math('SUBTRACT', u, v), 0.0016)
    dia = g.math('MULTIPLY', a, b)
    fade = g.near_fade(0.6, 1.8)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', dia, fade), 0.6), g.math('MULTIPLY', g.noise(900.0, 2.0), 0.25))
    nrm = g.bump(h, g.math('ADD', 0.05, g.math('MULTIPLY', fade, 0.22)), 0.0003)
    col = g.mix_rgb(g.math('MULTIPLY', g.math('MULTIPLY', dia, fade), 0.3), colour, tuple(c * 0.8 for c in colour))
    g.link(g.wear(col, dust_amount=0.18), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.8
    g.bsdf.inputs['Sheen Weight'].default_value = 0.2
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.45
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def mat_vent(name, colour):
    """Laser-perforated vent panel: staggered 1.4 mm holes on a 3.2 mm pitch showing the dark mesh behind."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = G(mat)
    u, v, _ = g.uv()
    p = 0.0032
    vv = g.math('DIVIDE', v, p)
    row = g.math('FLOOR', vv)
    fu = g.math('SUBTRACT', g.math('FRACT', g.math('ADD', g.math('DIVIDE', u, p), g.math('MULTIPLY', row, 0.5))), 0.5)
    fv = g.math('SUBTRACT', g.math('FRACT', vv), 0.5)
    d = g.math('SQRT', g.math('ADD', g.math('MULTIPLY', fu, fu), g.math('MULTIPLY', fv, fv)))
    hole = g.math('SUBTRACT', 1.0, g.smoothstep(0.2, 0.26, d))
    g.link(g.mix_rgb(hole, colour, (0.005, 0.005, 0.0055)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(g.math('SUBTRACT', 1.0, hole), 0.6, 0.0004), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.82
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    return mat


def mat_grip(name, colour):
    """Rubberised grip panel: a printed micro-pebble (about 1.8 mm) in matte rubber."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = G(mat)
    _, _, uvv = g.uv()
    vor = g.node('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 550.0
    g.link(uvv, vor.inputs['Vector'])
    peb = g.math('SUBTRACT', 1.0, g.smoothstep(0.25, 0.5, vor.outputs['Distance']))
    g.link(g.mix_rgb(g.math('MULTIPLY', peb, 0.35), colour, tuple(c * 1.35 for c in colour)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(peb, 0.45, 0.0004), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.66
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.35
    return mat


def mat_comp(name, colour):
    """Composite plate: a matte resin face over a faint fine fibre texture; chamfers catch a little lighter."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = G(mat)
    u, v, _ = g.uv()
    tw = g.tri(g.math('ADD', g.math('MULTIPLY', u, 1.0), g.math('MULTIPLY', v, 0.5)), 0.0024)
    fade = g.near_fade(0.6, 1.6)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', tw, fade), 0.25), g.math('MULTIPLY', g.noise(500.0, 2.0), 0.3))
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.54, 0.66, pt)
    g.link(g.mix_rgb(g.math('MULTIPLY', edge, 0.45), colour, (0.07, 0.072, 0.075)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(h, 0.12, 0.0003), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.62
    return mat


M['shell'] = mat_shell('a2 suit shell', (0.024, 0.025, 0.026))
M['vent'] = mat_vent('a2 vent panel', (0.019, 0.02, 0.021))
M['grip'] = mat_grip('a2 grip rubber', (0.018, 0.018, 0.019))
M['plate'] = mat_comp('a2 composite', (0.03, 0.032, 0.035))
M['gun'] = MT.anodised('a2 gunmetal', (0.05, 0.052, 0.056))
M['tape'] = MT.polymer('a2 seam tape', (0.02, 0.021, 0.022), 0.72)
M['rmetal'] = MT.painted_metal('a2 rifle finish', (0.026, 0.027, 0.029))
M['rpoly'] = MT.polymer('a2 rifle polymer', (0.022, 0.022, 0.023), 0.68)
M['lacebar'] = MT.polymer('a2 lace', (0.02, 0.02, 0.021), 0.75)


# ---------------------------------------------------------------- suit
def zones_a2():
    R0 = {k: f.R0 for k, f in FR.items()}
    for sd, sg in (('L', 1), ('R', -1)):
        zone('grip', 'shin' + sd, ellipse(0.0, -0.005, 0.052, 0.08))                       # knee grip
        zone('vent', 'shin' + sd, ellipse(math.pi * R0['shin' + sd], 0.0, 0.055, 0.065))   # back of knee
        zone('abr', 'farm' + sd, ellipse(math.pi * R0['farm' + sd], 0.0, 0.04, 0.05))      # elbow point
        zone('stretch', 'farm' + sd, ellipse(0.0, -0.01, 0.035, 0.04))                      # inner elbow
        zone('grip', 'farm' + sd, outline_rr(0.02, 0.085, 0.06, 0.20, 0.012))               # forearm grip
        zone('abr', 'sh' + sd, outline_rr(-0.075, 0.07, 0.035, 0.14, 0.02))                 # shoulder yoke
        su = (math.pi / 2) * 0.14 * sg
        zone('vent', 'torso', outline_rr(su - 0.032, su + 0.032, 0.30, 0.49, 0.02))         # underarm vent
        zone('stretch', 'sh' + sd, outline_rr(-math.pi * 0.07 * 0.95, -0.085, 0.04, 0.15, 0.015))
    zone('abr', 'torso', outline_rr(math.pi * 0.14 - 0.12, math.pi * 0.14 + 0.12, 0.0, 0.13, 0.04))


def apply_suit_a2():
    zones_a2()
    names = ['shell', 'stretch', 'abr', 'grip', 'vent']
    idx = {k: i for i, k in enumerate(names)}
    me = suit.data
    me.materials.clear()
    for k in names:
        me.materials.append(M[k])
    npoly = len(me.polygons)
    C = np.zeros(npoly * 3)
    me.polygons.foreach_get('center', C)
    C = C.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
    lab = np.zeros(npoly, int)
    for label, fk, poly in ZONES:
        fr = FR[fk]
        u, v, r = fr.local(C)
        lo, hi = poly.min(0), poly.max(0)
        cand = np.nonzero((u >= lo[0]) & (u <= hi[0]) & (v >= lo[1]) & (v <= hi[1]))[0]
        if not len(cand):
            continue
        ok = np.abs(r[cand] - fr.R(u[cand], v[cand], 'raw')) < 0.012
        ins = in_poly(poly, u[cand], v[cand]) & ok
        lab[cand[ins]] = idx[label]
        surf_strip('tape', fr, np.vstack([poly, poly[:1]]), 0.006, 0.0006, off=0.0003, mode='soft')
    me.polygons.foreach_set('material_index', lab.tolist())
    me.update()
    bpy.data.objects['wren-base_layer-stitches'].hide_render = True     # bonded construction: no visible stitching


def mag_buckle(P, tu, tv, n, w=0.026, h=0.018):
    """Quiet magnetic quick-release: two flush gunmetal halves with a split line, on a rubber-edged base."""
    rbox_w('trim', P + n * 0.0013, [tu, tv, n], (w / 2 + 0.0015, h / 2 + 0.0012, 0.0013), 0.001)
    for sgn in (1, -1):
        rbox_w('gun', P + n * 0.0038 + tu * sgn * (w * 0.255), [tu, tv, n], (w * 0.235, h / 2, 0.0021), 0.0015)


def mag_pouch(fr, u, v, h, ang, half, mode):
    """Open-top mag pouch: shock-cord loop and pull tab over the magazine's base plate."""
    hw, hh, hd = half
    c, tu, tv, n = box_at('cordura', fr, u, v, h, half, 0.005, ang=ang, mode=mode)
    rbox_w('mag', c + tv * (hh + 0.005), [tu, tv, n], (hw * 0.66, 0.009, hd * 0.75), 0.0035)
    loop = [c + tv * (hh + 0.008) + tu * hw * 0.55 * math.cos(t) + n * (hd * 0.85) * math.sin(t)
            for t in np.linspace(-0.2, math.pi + 0.2, 12)]
    tube_w('cord', loop, 0.0016, sides=6)
    rbox_w('poly', c + tv * (hh + 0.013) + n * (hd * 0.92), [tu, tv, n], (0.006, 0.005, 0.0018), 0.0012)


def concept_A2():
    for side, sg in (('L', 1.0), ('R', -1.0)):     # short reach: inner-thigh rays must not find the other leg
        FR['thigh' + side] = Frame(J['hip' + side] + np.array([0, 0, 0.06]), J['kn' + side], -Y, X * sg, 0.075, 0.0,
                                   0.46, reach=0.11)
    apply_suit_a2()
    chest_zip()
    # ---- armour: contoured composite chest plate, three overlapping rib segments, slim back plate
    neck = [(0.075, zt(1.335)), (0.04, zt(1.31)), (-0.04, zt(1.31)), (-0.075, zt(1.335))]
    cp = plate('plate', TOR, outline_rr(-0.115, 0.115, zt(1.14), zt(1.335), 0.03, notch=neck), 0.0155, 0.0065, rr=0.0042)
    for z0, z1, hw, off in ((1.085, 1.152, 0.105, 0.0105), (1.035, 1.10, 0.095, 0.0058), (0.985, 1.05, 0.085, 0.0012)):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.018), off, 0.0045, rr=0.0035)
    bp = plate('plate', TOR, outline_rr(TU - 0.10, TU + 0.10, zt(1.14), zt(1.33), 0.035), 0.008, 0.0065, rr=0.004)
    # ---- low-profile harness with magnetic buckles
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=0.72, th1=math.pi - 0.5)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=-math.pi / 2, th1=-0.72)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=math.pi + 0.5, th1=1.5 * math.pi)
    for uu in (0.108, -0.108):
        mag_buckle(*TOR.basis(uu, zt(1.17), 0.0065, mode=cp.mode)[0:4], w=0.024, h=0.02)
    for sd in ('L', 'R'):
        fr = FR['sh' + sd]
        band('web', fr, 0.032, 0.022, 0.003, off=0.003, th0=-1.6, th1=1.52, mode='rig')
        P, tu, tv, n = fr.basis(1.36 * fr.R0, 0.032, 0.006)
        mag_buckle(P, tv, tu, n, w=0.022, h=0.016)
    # ---- chest rig on the plate: two rifle mags right of centre (tops lean to the left hand), gadget slot, knife
    for u in (-0.018, -0.072):
        mag_pouch(TOR, u, zt(1.205), 0.0225, 0.28, (0.023, 0.047, 0.0115), cp.mode)
    c, tu, tv, n = box_at('cordura', TOR, -0.062, zt(1.292), 0.0225, (0.03, 0.02, 0.0085), 0.006, mode=cp.mode)
    rbox_w('cordura', c + tv * 0.013 + n * 0.0085, [tu, tv, n], (0.032, 0.009, 0.0022), 0.002)      # flap
    rbox_w('gun', c + tv * 0.004 + n * 0.0105, [tu, tv, n], (0.007, 0.004, 0.0015), 0.0012)         # magnetic tab
    # knife: slim sheath on the plate left of centre, handle down
    c, tu, tv, n = box_at('poly', TOR, 0.05, zt(1.248), 0.0225, (0.011, 0.045, 0.006), 0.004, mode=cp.mode)
    rbox_w('gun', c - tv * 0.047 + n * 0.0005, [tu, tv, n], (0.0135, 0.0025, 0.007), 0.0015)        # guard
    rbox_w('grip', c - tv * 0.08 + n * 0.0005, [tu, tv, n], (0.0098, 0.031, 0.0072), 0.0042)        # handle
    rbox_w('gun', c - tv * 0.113 + n * 0.0005, [tu, tv, n], (0.0085, 0.0025, 0.0064), 0.002)        # pommel
    rbox_w('gun', c + tv * 0.018 + n * 0.007, [tu, tv, n], (0.0042, 0.008, 0.0015), 0.0012)         # release
    # ---- comms: PTT at the left collarbone where the step 07 earpiece cable ends
    bpy.data.objects['wren-head_kit-cable'].hide_render = False
    pend = np.array([0.071, -0.079, 1.366])
    hit = TREE.find_nearest(Vector(pend))
    nn = FT.unit(np.array(hit[1][:]))
    up = FT.unit(Z - nn * (Z @ nn))
    side = FT.unit(np.cross(up, nn))
    pc = pend - up * 0.016 + nn * 0.004
    rbox_w('poly', pc, [side, up, nn], (0.011, 0.016, 0.0055), 0.004)
    rbox_w('gun', pc + nn * 0.0058, [side, up, nn], (0.0065, 0.0085, 0.0014), 0.003)
    PTT = pc
    # ---- waist belt: slim, integrated, magnetic front closure, flush rappel ring at the back
    band('lam', TOR, zt(0.925), 0.032, 0.0045, off=0.0018)
    mag_buckle(*TOR.basis(0.012, zt(0.925), 0.0065)[0:4], w=0.04, h=0.026)
    P, tu, tv, n = TOR.basis(TU, zt(0.925), 0.0065)
    rbox_w('lam', P + n * 0.0025, [tu, tv, n], (0.024, 0.017, 0.0025), 0.002)                      # ring tunnel
    ring = [P - tv * 0.016 + n * 0.0022 + tu * 0.014 * math.cos(t) - tv * 0.012 * math.sin(t)
            for t in np.linspace(0, math.pi, 14)]
    tube_w('gun', ring, 0.0028, sides=8)
    # ---- pistol: suppressed sidearm, mid right thigh
    holster_a2()
    # ---- pistol mags: slim double pouch, left front of the belt (support hand)
    for u in (0.068, 0.1):
        mag_pouch(TOR, u, zt(0.905), 0.0065, 0.0, (0.0155, 0.038, 0.0095), 'raw')
    # ---- sticky cams and mines: small flat pouch at the left hip
    c, tu, tv, n = box_at('cordura', TOR, 0.205, zt(0.888), 0.0062, (0.034, 0.034, 0.0105), 0.006, mode='raw')
    rbox_w('cordura', c + tv * 0.026 + n * 0.0105, [tu, tv, n], (0.036, 0.012, 0.0022), 0.002)
    rbox_w('gun', c + tv * 0.016 + n * 0.013, [tu, tv, n], (0.0075, 0.004, 0.0015), 0.0012)
    # ---- throwables: three double canister sleeves on the left thigh panel
    thigh_sleeves()
    # ---- back: radio module in the plate, rifle, pod, medkit
    back_kit(bp, PTT)
    boots_a2()


def holster_a2():
    th = FR['thighR']
    uc = math.radians(80) * th.R0
    v0, v1 = 0.11, 0.29
    plate('poly', th, outline_rr(uc - 0.04, uc + 0.04, v0, v1, 0.012), 0.004, 0.004, rr=0.002)
    for vv in (v0 + 0.05, v1 - 0.035):
        band('elastic', th, vv, 0.024, 0.0026, off=0.0016)
        mag_buckle(*th.basis(uc - 0.055, vv, 0.0045)[0:4], w=0.02, h=0.02)
    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.024, 0.0028, off=0.006)
    c, tu, tv, n = box_at('pistol', th, uc, (v0 + v1) / 2 + 0.01, 0.008, (0.025, 0.083, 0.016), 0.009)
    up = -tv
    rbox_w('pistol', c + up * 0.103 + n * 0.006, [tu, up, n], (0.014, 0.044, 0.012), 0.006)        # grip
    rbox_w('poly', c + up * 0.068 + n * 0.014, [tu, up, n], (0.021, 0.016, 0.006), 0.004)          # hood
    rbox_w('gun', c + up * 0.068 + n * 0.0205 + tu * 0.012, [tu, up, n], (0.005, 0.006, 0.0015), 0.001)
    tube_w('rmetal', [c - up * 0.083, c - up * 0.145], 0.0132, sides=16)                         # suppressor
    tube_w('gun', [c - up * 0.144, c - up * 0.146], 0.0134, sides=16)


def thigh_sleeves():
    th = FR['thighL']
    R0 = th.R0
    plate('lam', th, outline_rr(math.radians(34) * R0, math.radians(110) * R0, 0.075, 0.305, 0.012), 0.004, 0.003,
          rr=0.0015)
    for vv in (0.14, 0.28):
        band('elastic', th, vv, 0.022, 0.0025, off=0.0016)
        mag_buckle(*th.basis(math.radians(20) * R0, vv, 0.0045)[0:4], w=0.02, h=0.019)
    surf_strip('web', th, [(math.radians(72) * R0, 0.0), (math.radians(72) * R0, 0.085)], 0.022, 0.0026, off=0.005)
    for k, deg_ in enumerate((50, 72, 94)):
        u = math.radians(deg_) * R0
        P0, tu0, tv0, n0 = th.basis(u, 0.1, 0.007, )
        P1, _, _, n1 = th.basis(u, 0.29, 0.007)
        a = P0 + n0 * 0.0185
        b = P1 + n1 * 0.0185
        tube_w('elastic', [a, b], 0.0185, sides=18)
        tube_w('trim', [a - FT.unit(b - a) * 0.0005, a + FT.unit(b - a) * 0.004], 0.0192, sides=18)  # bound top
        ax = FT.unit(a - b)
        cap = a + ax * 0.006
        tube_w('mag', [a, cap + ax * 0.004], 0.0158, sides=16)                                      # canister top
        if k == 0:      # frag: knurled ring
            for q in range(3):
                tube_w('gun', [cap - ax * (0.001 + q * 0.003), cap - ax * (0.0025 + q * 0.003)], 0.0164, sides=16)
        elif k == 1:    # gas: domed cap
            rbox_w('mag', cap + ax * 0.006, [FT.unit(np.cross(ax, n0)), n0, ax], (0.012, 0.012, 0.004), 0.004)
        else:           # flash: two ridges
            for q in range(2):
                tube_w('poly', [cap - ax * (0.0005 + q * 0.005), cap - ax * (0.0025 + q * 0.005)], 0.0168, sides=16)
        # shock-cord retention over the cap, pull tab on the outer face
        side = FT.unit(np.cross(ax, n0))
        loop = [a + ax * 0.012 + side * 0.016 * math.cos(t) + n0 * 0.016 * math.sin(t)
                for t in np.linspace(0, math.pi, 12)]
        tube_w('cord', loop, 0.0015, sides=6)
        rbox_w('poly', a + ax * 0.012 + n0 * 0.0175, [side, ax, n0], (0.005, 0.005, 0.0016), 0.0012)


def back_kit(bp, PTT):
    # radio module seated in a recess in the back plate's upper left; cable up the left shoulder strap to the PTT
    ru0, ru1, rz0, rz1 = TU - 0.094, TU - 0.04, zt(1.255), zt(1.316)
    plate('poly', TOR, outline_rr(ru0, ru1, rz0, rz1, 0.008), 0.0145, 0.0062, rr=0.0025, mode=bp.mode)
    P, tu, tv, n = TOR.basis((ru0 + ru1) / 2, rz1 - 0.012, 0.0215, mode=bp.mode)
    rbox_w('gun', P + n * 0.0012 + tu * 0.012, [tu, tv, n], (0.006, 0.004, 0.0014), 0.001)          # channel knob
    # antenna: short flexible stub along the plate's top edge toward the centre, in an elastic keeper
    A0 = TOR.P(ru1 - 0.004, rz1 - 0.004, 0.024, bp.mode)
    A1 = TOR.P(ru1 + 0.03, rz1 + 0.004, 0.0235, bp.mode)
    tube_w('rpoly', [A0, (A0 + A1) / 2, A1], 0.0032, sides=10)
    # cable: radio top -> over the left shoulder along the strap edge -> PTT
    fr = FR['shL']
    pts = [TOR.P(ru0 + 0.012, rz1 + 0.001, 0.0235, bp.mode), TOR.P(ru0 + 0.004, zt(1.345), 0.02)]
    for t in np.linspace(-1.45, 1.05, 9):
        pts.append(fr.P(t * fr.R0, 0.032 - 0.0125, 0.0055))
    pts.append(PTT + Z * 0.0 - FT.unit(PTT - pts[-1]) * 0.0)
    tube_w('cord', pts, 0.0019, sides=8)
    for t in (-0.9, 0.0, 0.8):
        P, tu, tv, n = fr.basis(t * fr.R0, 0.032 - 0.012, 0.004)
        rbox_w('elastic', P + n * 0.002, [tu, tv, n], (0.004, 0.006, 0.0025), 0.0015)               # keepers
    rifle(bp)
    # pod: folded tri-rotor + battery, low on the back, left of the rifle line
    pu0, pu1, pz0, pz1 = TU - 0.128, TU - 0.016, zt(0.964), zt(1.06)
    plate('pod', TOR, outline_rr(pu0, pu1, pz0, pz1, 0.022), 0.004, 0.04, rr=0.014)
    ol = outline_rr(pu0 + 0.004, pu1 - 0.004, pz0 + 0.004, pz1 - 0.004, 0.022)
    Pl = TOR.P(ol[:, 0], ol[:, 1], 0.004 + 0.04 * 0.6)
    tube_w('trim', np.vstack([Pl, Pl[:1]]), 0.0015, sides=6)                                       # lid seal
    P, tu, tv, n = TOR.basis((pu0 + pu1) / 2, pz0 + 0.012, 0.046)
    rbox_w('gun', P, [tu, tv, n], (0.012, 0.004, 0.003), 0.0015)                                   # lid latch
    for uu in (pu0 + 0.03, pu1 - 0.03):
        surf_strip('web', TOR, [(uu, zt(1.152)), (uu, pz1 - 0.015)], 0.018, 0.0025, off=0.006)
    # medkit: flat tear-away pouch on the belt under the pod
    plate('cordura', TOR, outline_rr(TU - 0.122, TU - 0.026, zt(0.866), zt(0.95), 0.014), 0.0065, 0.019, rr=0.006)
    P, tu, tv, n = TOR.basis(TU - 0.074, zt(0.866), 0.024)
    pull = [P + tu * 0.012 * math.cos(t) - tv * (0.002 + 0.011 * math.sin(t)) for t in np.linspace(0, math.pi, 12)]
    tube_w('web', pull, 0.0026, sides=6)                                                            # pull handle
    ol = outline_rr(TU - 0.118, TU - 0.03, zt(0.87), zt(0.946), 0.012)
    Pl = TOR.P(ol[:, 0], ol[:, 1], 0.0065 + 0.019 * 0.55)
    tube_w('trim', np.vstack([Pl, Pl[:1]]), 0.0012, sides=6)                                       # tear seam


def rifle(bp):
    """Compact suppressed carbine (original shape) in a hard mount: stock up behind the left shoulder, muzzle down
    to the right hip, held by a plate clamp at the receiver and a belt cup round the suppressor."""
    a2 = FT.unit(np.array([-0.423, -0.906]))
    B = np.array([0.14, 1.38])
    L = 0.66
    d2 = np.array([-a2[1], a2[0]])
    if d2[0] > 0:
        d2 = -d2                                       # gun-down (mag, grip) points up and to the wearer's right
    S_ = np.linspace(0, L, 40)
    cons = []
    for s in S_:
        for t, half in ((0.0, 0.021), (-0.03, 0.017)):
            cons.append((s, t, half))
    for s in np.linspace(0.19, 0.36, 8):
        for t in (0.04, 0.07, 0.10):
            cons.append((s, t, 0.013))
    cs, req = [], []
    for s, t, half in cons:
        x, z = B + a2 * s + d2 * t
        hit = TREE.ray_cast(Vector((x, 0.6, z)), Vector((0, -1, 0)), 1.0)
        if hit[0] is None:
            continue
        yh = hit[0].y
        extra = 0.004
        if abs(x) < 0.105 and 1.135 < z < 1.335:
            extra += 0.0235
        elif abs(z - 0.925) < 0.02:
            extra += 0.0075
        cs.append(s)
        req.append(yh + extra + half)
    cs, req = np.array(cs), np.array(req)
    best = None
    for k in np.linspace(-0.2, 0.2, 401):
        y0 = np.max(req - k * cs)
        sc_ = np.mean(y0 + k * cs - req)
        if best is None or sc_ < best[0]:
            best = (sc_, y0, k)
    _, y0, k = best
    print('stealth: rifle line y0 %.3f slope %.3f mean gap %.4f' % (y0, k, best[0]))
    a3 = FT.unit(np.array([a2[0], k, a2[1]]))
    d3 = np.array([d2[0], 0.0, d2[1]])
    n3 = FT.unit(np.cross(a3, d3))
    if n3[1] < 0:
        n3 = -n3
    d3 = FT.unit(np.cross(n3, a3))
    if d3 @ np.array([d2[0], 0, d2[1]]) < 0:
        d3 = -d3

    def c(s, t=0.0, h=0.0):
        return np.array([B[0] + a2[0] * s, y0 + k * s, B[1] + a2[1] * s]) + d3 * t + n3 * h

    AX = [a3, d3, n3]
    rbox_w('rpoly', c(0.009, 0.006), AX, (0.009, 0.047, 0.016), 0.005)                 # butt pad
    rbox_w('grip', c(0.0015, 0.006), AX, (0.0018, 0.042, 0.014), 0.0015)               # rubber butt face
    tube_w('rpoly', [c(0.012, -0.028), c(0.165, -0.012)], 0.0068, sides=10)            # stock bars
    tube_w('rpoly', [c(0.012, 0.042), c(0.15, 0.013)], 0.0062, sides=10)
    tube_w('rmetal', [c(0.10), c(0.172)], 0.0125, sides=14)                          # buffer tube
    rbox_w('rmetal', c(0.28), AX, (0.115, 0.024, 0.0155), 0.005)                     # receiver
    rbox_w('rmetal', c(0.30, 0.03), AX, (0.05, 0.012, 0.0145), 0.004)                # mag well
    rbox_w('rmetal', c(0.335, -0.028), AX, (0.095, 0.004, 0.0085), 0.0015)           # top rail
    rbox_w('rpoly', c(0.245, -0.042), AX, (0.026, 0.013, 0.0125), 0.005)             # enclosed sight
    g = FT.unit(d3 * 0.96 - a3 * 0.28)
    ga = FT.unit(np.cross(g, n3))
    rbox_w('rpoly', c(0.205, 0.024) + g * 0.044, [ga, g, n3], (0.0125, 0.044, 0.0132), 0.006)  # grip
    guard = [c(0.218 + 0.022 * (1 - math.cos(t)), 0.024 + 0.022 * math.sin(t)) for t in np.linspace(0, math.pi, 10)]
    tube_w('rmetal', guard, 0.0022, sides=6)
    m = FT.unit(d3 + a3 * 0.62)                       # swept toward the muzzle: stays inside the torso outline
    ma = FT.unit(np.cross(m, n3))
    rbox_w('mag', c(0.305, 0.03) + m * 0.044, [ma, m, n3], (0.0155, 0.044, 0.011), 0.004)        # magazine
    rbox_w('rpoly', c(0.305, 0.03) + m * 0.09, [ma, m, n3], (0.018, 0.004, 0.0125), 0.002)
    rbox_w('rpoly', c(0.47), AX, (0.08, 0.021, 0.0185), 0.0085)                      # handguard
    rbox_w('elastic', c(0.47), AX, (0.008, 0.0235, 0.0205), 0.003)                   # sling keeper
    tube_w('rmetal', [c(0.545), c(0.66)], 0.0175, sides=22)                          # suppressor
    tube_w('gun', [c(0.548), c(0.556)], 0.0181, sides=22)
    tube_w('gun', [c(0.655), c(0.661)], 0.0179, sides=22)
    # upper mount: composite riser on the back plate, gunmetal clamp round the receiver's rear
    s_m = 0.19
    gp = c(s_m)
    u, v, _ = TOR.local(gp[None])
    ps = TOR.P(u[0], v[0], 0.0215, bp.mode)
    back = gp - n3 * 0.0155
    hh = max(0.002, (back - ps) @ n3 / 2)
    rbox_w('plate', ps + n3 * hh, AX, (0.026, 0.028, hh), 0.003)
    for sgn in (1, -1):
        rbox_w('gun', c(s_m, sgn * 0.0265, 0.0), AX, (0.02, 0.0045, 0.017), 0.002)
    rbox_w('gun', c(s_m, -0.031, 0.008), AX, (0.008, 0.004, 0.006), 0.0015)          # release lever
    # lower mount: moulded cup round the suppressor on the belt (open bottom: the muzzle shows)
    tube_w('plate', [c(0.55), c(0.625)], 0.0222, sides=24)
    gp = c(0.585)
    u, v, _ = TOR.local(gp[None])
    ps = TOR.P(u[0], v[0], 0.0063)
    back = gp - n3 * 0.021
    hh = max(0.002, (back - ps) @ n3 / 2)
    rbox_w('plate', ps + n3 * hh, AX, (0.03, 0.016, hh), 0.003)


def boots_a2():
    """Lighter approach boot from the step 06 boot: cut low, padded collar, heel pull loop, sticky toe rand, low lugs."""
    def zcut(p):
        return 0.122 + 0.016 * min(1.0, max(0.0, (-p[1] - 0.0) / 0.06))

    for n in ('wren-boots-hero', 'wren-boots-laces', 'wren-boots-hardware', 'wren-boots-stitches'):
        o = bpy.data.objects[n]
        bm = bmesh.new()
        bm.from_mesh(o.data)
        M4 = o.matrix_world
        kill = [v for v in bm.verts if (M4 @ v.co).z > zcut(M4 @ v.co)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    for n in ('wren-boots-pull', 'wren-boots-garage'):
        bpy.data.objects[n].hide_render = True
    lg = bpy.data.objects['wren-boots-lugs']
    for v in lg.data.vertices:
        w = lg.matrix_world @ v.co
        w.z = 0.007 - (0.007 - w.z) * 0.45
        v.co = lg.matrix_world.inverted() @ w
    lg.data.update()
    dg2 = bpy.context.evaluated_depsgraph_get()
    hero = bpy.data.objects['wren-boots-hero']
    he = hero.evaluated_get(dg2)
    me = he.to_mesh()
    HV = np.array([hero.matrix_world @ v.co for v in me.vertices])
    HF = [tuple(p.vertices) for p in me.polygons]
    he.to_mesh_clear()
    for sg in (1, -1):
        keep = [f for f in HF if HV[f[0]][0] * sg > 0]
        tree = BVHTree.FromPolygons([tuple(v) for v in HV], keep)
        cx, cy = 0.163 * sg, -0.072

        def wrap(z, th, off):
            dv = np.array([math.cos(th), math.sin(th), 0.0])
            o = np.array([cx, cy, z]) + dv * 0.3
            hit = tree.ray_cast(Vector(o), Vector(-dv), 0.3)
            if hit[0] is None:
                return None
            return np.array(hit[0][:]) + FT.unit(np.array(hit[1][:])) * off

        # sticky rand: rubber band round the sole edge, rising over the toe
        ths = np.linspace(0, 2 * math.pi, 160, endpoint=False)
        rows = 6
        Vr, Fr = part('rand')
        base = len(Vr)
        ok = True
        grid = []
        for th in ths:
            front = max(0.0, -math.sin(th))
            ztop = 0.037 + 0.02 * front ** 1.6
            col = []
            for r_ in range(rows):
                z = 0.026 + (ztop - 0.026) * r_ / (rows - 1)
                p = wrap(z, th, 0.0026)
                col.append(p)
            grid.append(col)
        for j, col in enumerate(grid):
            for r_, p in enumerate(col):
                if p is None:
                    p = grid[j - 1][r_] if grid[j - 1][r_] is not None else np.array([cx, cy, 0.03])
                    grid[j][r_] = p
                Vr.append(p)
        nth = len(ths)
        for j in range(nth):
            j2 = (j + 1) % nth
            for r_ in range(rows - 1):
                Fr.append((base + j * rows + r_, base + j2 * rows + r_, base + j2 * rows + r_ + 1, base + j * rows + r_ + 1))
        # padded collar round the cut
        ring = []
        cx2 = 0.162 * sg
        for th in np.linspace(0, 2 * math.pi, 72, endpoint=False):
            dv = np.array([math.cos(th), math.sin(th), 0.0])
            z = zcut(np.array([cx2, -0.009 + dv[1] * 0.04, 0])) - 0.004
            o = np.array([cx2, -0.009, z]) + dv * 0.3
            hit = tree.ray_cast(Vector(o), Vector(-dv), 0.3)
            if hit[0] is not None:
                ring.append(np.array(hit[0][:]) + FT.unit(np.array(hit[1][:])) * 0.002)
        tube_w('pad', ring, 0.0055, sides=10, closed=True)
        # heel pull loop
        pb = max(ring, key=lambda q: q[1])
        tube_w('web', [pb + np.array([0.008 * sg, 0.003, -0.004]), pb + np.array([0.008 * sg, 0.012, 0.022]),
                       pb + np.array([-0.008 * sg, 0.012, 0.022]), pb + np.array([-0.008 * sg, 0.003, -0.004])],
               0.0028, sides=6)


M['rand'] = MT.rubber('a2 sticky rand', (0.027, 0.028, 0.03), 0.62)
concept_A2()
flush()
print('stealth: built')

# ---------------------------------------------------------------- render (same rig and AgX exposure as the concepts)
if args.save:
    bpy.ops.wm.save_as_mainfile(filepath=args.save)
RN.floor(8.0)
sc.view_settings.exposure = -1.9
try:
    sc.view_settings.look = 'AgX - Medium High Contrast'
except TypeError:
    pass
sc.cycles.max_bounces = 6
sc.render.film_transparent = False


def lights_studio():
    RN.world(sc, strength=0.12, colour=(0.2, 0.205, 0.215))
    RN.area_light('key', (2.2, -3.2, 2.6), (0, 0, 1.0), 520, 2.4)
    RN.area_light('fill', (-3.0, -2.2, 1.4), (0, 0, 0.9), 170, 3.0, (0.92, 0.95, 1.0))
    RN.area_light('rimL', (1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))
    RN.area_light('rimR', (-1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))


def lights_rim():
    RN.world(sc, strength=0.02, colour=(0.15, 0.16, 0.18))
    RN.area_light('rimL', (1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('rimR', (-1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('top', (0.0, 1.0, 3.2), (0, 0, 1.0), 120, 0.6, (0.8, 0.9, 1.0))


def clear_lights():
    for o in list(bpy.data.objects):
        if o.type == 'LIGHT':
            bpy.data.objects.remove(o)


def shoot(name, loc, target, lens, res):
    for o in list(bpy.data.objects):
        if o.type == 'CAMERA':
            bpy.data.objects.remove(o)
    c = RN.camera('cam', loc, target, lens)
    c.data.sensor_fit = 'VERTICAL'
    c.data.sensor_height = 24.0
    sc.camera = c
    res = (res[0] * args.scale // 100, res[1] * args.scale // 100)
    path = os.path.join(args.dest, f'A2-{name}.webp')
    RN.write_webp(sc, path, res, 90)
    print('stealth: wrote', path)


SH = set(args.shots.split(','))
FULL = (1000, 1500)
CLOSE = (1200, 1400)
lights_studio()
if 'front' in SH:
    shoot('front', (0, -5.7, 0.95), (0, 0, 0.88), 70, FULL)
if 'back34' in SH:
    shoot('back34', (3.9, 4.1, 1.05), (0, 0, 0.88), 70, FULL)
if 'side' in SH:
    shoot('side', (-5.7, 0, 0.95), (0, 0, 0.88), 70, FULL)
if 'chest' in SH:
    shoot('chest', (-0.75, -1.75, 1.25), (0.0, -0.05, 1.12), 70, CLOSE)
if 'back' in SH:
    shoot('back', (0.55, 2.0, 1.25), (0.0, 0.05, 1.08), 60, CLOSE)
if 'thigh-right' in SH:
    shoot('thigh-right', (-1.55, -1.05, 0.95), (-0.15, -0.01, 0.76), 70, CLOSE)
if 'thigh-left' in SH:
    shoot('thigh-left', (0.95, -1.7, 0.92), (0.14, -0.02, 0.8), 70, CLOSE)
if 'boot' in SH:
    shoot('boot', (-0.75, -0.9, 0.32), (-0.165, -0.07, 0.065), 70, CLOSE)
if 'rim' in SH:
    clear_lights()
    lights_rim()
    shoot('rim', (-2.4, -5.2, 1.0), (0, 0, 0.88), 70, FULL)
print('stealth: done')
