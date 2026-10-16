"""Head geometry shared by the head items (step 07): `headwear.py` (balaclava and hood) and `head_kit.py` (harness,
flip mount, goggle, battery, cables, earpiece). Pure numpy plus mathutils BVH queries; the build scripts own the scene.

- `head_frame(skin)`: the head measured on the rendered skin by ray casts (crown centre, top, eye and chin heights,
  neck axis), so the same code fits Moth's head later.
- `capsule(...)`: a closed-top grid round the head and neck (a dome of rays from the crown centre, then horizontal rows
  down the neck), shrink-wrapped onto the skin and the layers under it: a knit pulled tight bridges the eye sockets,
  the nose and the ears the way a real balaclava does.
- `straps(fr)`: the harness strap planes. The hood dents along them (headwear.py) and the straps are laid along the
  same planes on the dented hood (head_kit.py), so the compression lines up.
- Solid builders: `rbox` (a rounded box on a fine grid, every edge under a few millimetres), `taper` (a tube whose
  radius changes: strain relief boots), `pad` (a slab conformed to a surface: front plate, rear cradle),
  `surface_path` (a polyline laid on a surface by rays).
"""
import math

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import fitted as FT

NU = 160          # columns round the head: about 3.5 mm apart at the cranium
ROW = 0.0034      # row spacing (m)


def ray_in(tree, origin, d, reach=0.25, far=1.5):
    """The outermost hit of `tree` along -d, from origin + d * reach: (point, normal) or (None, None). The cast is
    reach * far long; far=1.0 stops it at the origin (an axis), so it can never find the far side (step 09: the
    earpiece cable rays from the neck axis, 07-fixes-r4)."""
    d = np.asarray(d, float)
    o = np.asarray(origin, float) + d * reach
    loc, nrm, _, _ = tree.ray_cast(Vector(o), Vector(-d), reach * far)
    if loc is None:
        return None, None
    return np.array(loc), FT.unit(np.array(nrm))


def head_frame(skin):
    def front(x, z):
        p, _ = ray_in(skin, (x, 0.0, z), (0.0, -1.0, 0.0), 0.4)
        return p[1] if p is not None else 9.0

    def back(x, z):
        p, _ = ray_in(skin, (x, 0.0, z), (0.0, 1.0, 0.0), 0.4)
        return p[1] if p is not None else -9.0
    p, _ = ray_in(skin, (0.0, 0.0, 1.5), (0.0, 0.0, 1.0), 0.8)
    top = float(p[2])
    cz = top - 0.098
    cy = 0.5 * (front(0.0, cz + 0.02) + back(0.0, cz + 0.02))
    zs = np.arange(top - 0.135, top - 0.09, 0.002)
    ys = np.array([front(0.032, z) for z in zs])
    eye_z = float(zs[int(np.argmax(ys))]) - 0.002   # the socket's deepest point sits just above the pupil line
    zn = top - 0.215
    neck_y = 0.5 * (front(0.0, zn) + back(0.0, zn))
    nf = front(0.0, zn)
    chin_z = next((float(z) for z in np.arange(zn, eye_z - 0.04, 0.002) if front(0.0, z) < nf - 0.025), eye_z - 0.085)
    # the chin point (most forward below the mouth) and the skin under the chin 15 mm behind it (the chin strap)
    zc_ = np.arange(chin_z - 0.004, chin_z + 0.014, 0.001)     # below the lower lip
    yc_ = np.array([front(0.0, z) for z in zc_])
    chin_pt = np.array([0.0, float(yc_.min()), float(zc_[int(np.argmin(yc_))])])
    p, _ = ray_in(skin, (0.0, chin_pt[1] + 0.013, chin_pt[2] - 0.08), (0.0, 0.0, 1.0), 0.12)
    under = np.array(p) if p is not None else chin_pt + np.array([0.0, 0.015, -0.012])
    return {'top': top, 'c': np.array([0.0, cy, cz]), 'eye_z': eye_z, 'chin_z': chin_z, 'neck_y': neck_y,
            'neck_z': zn, 'front': front, 'back': back, 'chin_pt': chin_pt, 'under_chin': under}


def capsule(fr, skin, z_bot):
    """Ray grid round the head and neck: a dome of rays from the crown centre, then horizontal rows down the neck.
    Returns a dict: V (skin hits; pole first, then NU per row from the top down), F, per-vertex row, column, theta
    (0 at the back, +y), the ray origins O and directions D (a vertex only ever moves along its ray: P = O + D t)."""
    c = fr['c']
    r_dome = 0.095
    n_dome = int(round(math.pi / 2 * r_dome / ROW))
    th = 2 * math.pi * np.arange(NU) / NU
    O, D = [c.copy()], [np.array([0.0, 0.0, 1.0])]
    for a in np.linspace(0.0, math.pi / 2, n_dome + 1)[1:]:
        for t in th:
            O.append(c.copy())
            D.append(np.array([math.sin(a) * math.sin(t), math.sin(a) * math.cos(t), math.cos(a)]))
    R = n_dome
    for z in np.arange(c[2] - ROW, z_bot - 1e-6, -ROW):
        s = np.clip((z - fr['chin_z']) / (c[2] - fr['chin_z']), 0.0, 1.0)
        ay = fr['neck_y'] + (c[1] - fr['neck_y']) * s
        for t in th:
            O.append(np.array([0.0, ay, z]))
            D.append(np.array([math.sin(t), math.cos(t), 0.0]))
        R += 1
    O, D = np.array(O), np.array(D)
    t_skin = ray_t(skin, O, D)
    t_skin = np.where(np.isnan(t_skin), 0.05, t_skin)
    F = []
    for u in range(NU):
        F.append((0, 1 + (u + 1) % NU, 1 + u))
    for r in range(R - 1):
        for u in range(NU):
            u2 = (u + 1) % NU
            F.append((1 + r * NU + u, 1 + r * NU + u2, 1 + (r + 1) * NU + u2, 1 + (r + 1) * NU + u))
    rr = np.concatenate([[-1], np.repeat(np.arange(R), NU)])
    cc = np.concatenate([[0], np.tile(np.arange(NU), R)])
    tt = np.concatenate([[0.0], np.tile(th, R)])
    return {'V': O + D * t_skin[:, None], 'F': F, 'row': rr, 'col': cc, 'theta': tt, 'O': O, 'D': D, 't_skin': t_skin}


def cable_dir(z, collar_top, ear_z):
    """The earpiece cable's horizontal direction from the neck axis at height z (left side, +x): 44 degrees to the
    front at the collar, straight out to the side at the ear. head_kit.py routes the cable along it; headwear.py
    lifts the hood over it (the cable makes a soft ridge under the hood)."""
    f = float(np.clip((z - collar_top) / max(1e-6, (ear_z - 0.035) - collar_top), 0.0, 1.0))
    a = math.radians(-44.0) * (1.0 - f)
    return np.array([math.cos(a), math.sin(a), 0.0])


def ray_t(tree, O, D, reach=0.25):
    """Distance along each ray (origin O, direction D) of the outermost hit of `tree`, NaN where it misses."""
    t = np.full(len(O), np.nan)
    for i in range(len(O)):
        o = O[i] + D[i] * reach
        loc, _, _, dist = tree.ray_cast(Vector(o), Vector(-D[i]), reach * 1.5)
        if loc is not None:
            t[i] = reach - dist
    return t


def edges_of(F):
    E = set()
    for f in F:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            E.add((a, b) if a < b else (b, a))
    return np.array(sorted(E), int)


def membrane(O, D, t, F, tmin, target=None, rounds=60, lam=0.5, cling=0.06, tmax=None):
    """A stretched knit along fixed rays: each round moves every vertex along its ray by the ray part of the Laplacian
    (tension) and back toward `target` (cling, default tmin), never inside tmin nor outside tmax. Tension bridges the
    hollows (eye sockets, the mouth, behind the ears) and tents over the nose; cling keeps it on the broad forms."""
    E = edges_of(F)
    deg = np.bincount(E.ravel(), minlength=len(O)).astype(float)
    target = tmin if target is None else target
    t = np.maximum(np.array(t, float), tmin)
    for _ in range(rounds):
        P = O + D * t[:, None]
        Sm = np.zeros_like(P)
        np.add.at(Sm, E[:, 0], P[E[:, 1]])
        np.add.at(Sm, E[:, 1], P[E[:, 0]])
        avg = Sm / np.maximum(deg, 1)[:, None]
        t = t + lam * np.einsum('ij,ij->i', avg - P, D) - np.asarray(cling) * (t - target)
        t = np.maximum(t, tmin)
        if tmax is not None:
            m = ~np.isnan(tmax)
            t[m] = np.minimum(t[m], tmax[m])
    return t


def straps(fr):
    """The harness strap planes and spans (D-shaped: head kit and hood dent read the same numbers).
    Front plate: centred on the forehead; rear cradle on the occiput; the side straps run from the plate's sides above
    the ears to the cradle; the crown strap from the plate top over the crown to the cradle top; the chin strap from a
    D-ring on each side strap, in front of the ear, under the chin."""
    c, top = fr['c'], fr['top']
    plate = {'z': top - 0.032, 'hw': 0.036, 'hh': 0.014}
    cradle = {'z': top - 0.118, 'hw': 0.056, 'hh': 0.03}
    yF, yB = fr['front'](0.0, plate['z']), fr['back'](0.0, cradle['z'])
    F_ = np.array([0.0, yF, plate['z'] - 0.002])
    B_ = np.array([0.0, yB, cradle['z']])
    X = np.array([1.0, 0.0, 0.0])
    D = FT.unit(B_ - F_)
    side_n = FT.unit(np.cross(X, D))
    side_o = F_ + D * float(np.dot(c - F_, D))
    side = {'name': 'side', 'O': side_o, 'n': side_n, 'e1': -D, 'e2': X, 'w': 0.02}
    crown = {'name': 'crown', 'O': c.copy(), 'n': X, 'e1': np.array([0.0, -1.0, 0.0]), 'e2': np.array([0.0, 0.0, 1.0]),
             'w': 0.025}
    # chin strap: through the side strap 28 mm in front of the ear line and under the chin
    ya = c[1] - 0.022
    za = F_[2] + (ya - F_[1]) * (D[2] / D[1])
    A_ = np.array([0.0, ya, za])
    # under the chin (fix round 1, item 5): the plane passes the skin 15 mm behind the chin point, so the strap cups
    # under the chin instead of crossing the throat at the collar (the old target, neck_y - 0.05, lay on the neck)
    C_ = fr['under_chin'] + np.array([0.0, 0.0, 0.004])
    Dc = FT.unit(C_ - A_)
    chin = {'name': 'chin', 'O': 0.5 * (A_ + C_), 'n': FT.unit(np.cross(X, Dc)),
            'e1': -Dc, 'e2': X, 'w': 0.018, 'za': za}
    # split crown (D20, options-pass strap 2): two 18 mm straps fork from the brow plate's top over the crown, 24 mm
    # either side of the centre line at the top, to the rear pod's upper corners (42 mm out, 20 mm above its centre)
    top = fr['top']
    Ft = np.array([0.0, fr['front'](0.0, plate['z'] + 0.012) - 0.002, plate['z'] + 0.012])
    forks = {}
    for nm, sx in (('forkL', 1.0), ('forkR', -1.0)):
        zr = cradle['z'] + 0.02
        Rr = np.array([sx * 0.042, fr['back'](sx * 0.042, zr), zr])
        Tp = np.array([sx * 0.024, c[1] + 0.01, top])
        n = FT.unit(np.cross(Rr - Ft, Tp - Ft))
        e1 = FT.unit(np.cross(n, np.array([0.0, 0.0, 1.0])))
        forks[nm] = {'name': nm, 'O': c - n * float(np.dot(c - Ft, n)), 'n': n, 'e1': e1, 'e2': np.cross(n, e1),
                     'w': 0.018, 'z_front': plate['z'] + 0.006, 'z_back': cradle['z'] + 0.02}
    return {'plate': plate, 'cradle': cradle, 'side': side, 'crown': crown, 'chin': chin, **forks}


def fork_keep(S, s, P):
    """Where a fork strap lies on the head: above the brow plate's anchor in front, above the pod's in the back."""
    cy = S['crown']['O'][1]
    return np.where(P[:, 1] < cy, P[:, 2] > s['z_front'], P[:, 2] > s['z_back'])


def lens_assembly(Vb, Fb, Vl, Fl, El, c, axis, r_out=0.0132, r_glass=0.0108, length=0.0075, sag=0.0028, seg=40):
    """One objective on a housing face (step 07 fix round 1, item 4; housing-agnostic so a new housing reuses it): a
    barrel standing `length` out of the face at c along `axis` (outward), its lip chamfered; a thin retaining ring;
    the coated glass seated 6.5 mm below the lip and domed by `sag`, so the glass reads recessed and throws a moving
    highlight. Barrel and ring go to (Vb, Fb) (the housing), the glass to (Vl, Fl) with El the per-vertex glow weight
    (1 at the centre, 0.25 at the rim: the display deep in the barrel), read by materials.lens as `emit`."""
    n = FT.unit(np.asarray(axis, float))
    ref = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = FT.unit(np.cross(n, ref))
    w = np.cross(n, u)
    c = np.asarray(c, float)
    L = length
    prof = [(r_glass, -0.0005), (r_out, -0.0005), (r_out, L - 0.001), (r_out - 0.001, L), (r_glass + 0.0006, L),
            (r_glass, L - 0.0008)]
    b = len(Vb)
    m = len(prof)
    for k in range(seg):
        a = 2 * math.pi * k / seg
        d = math.cos(a) * u + math.sin(a) * w
        for rr, hh in prof:
            Vb.append(c + d * rr + n * hh)
    for k in range(seg):
        k2 = (k + 1) % seg
        for j in range(m):
            j2 = (j + 1) % m
            Fb.append((b + k * m + j, b + k2 * m + j, b + k2 * m + j2, b + k * m + j2))
    h_rim = L - 0.0065
    FT.ring(Vb, Fb, c + n * h_rim, n, r_glass - 0.0012, r_glass + 0.0002, 0.0007, seg=seg)
    R = r_glass - 0.0004
    b = len(Vl)
    Vl.append(c + n * (h_rim + sag))
    El.append(1.0)
    nr = 8
    for ring_k in range(1, nr + 1):
        f = ring_k / nr
        h = h_rim + sag * (1.0 - f * f)
        for k in range(seg):
            a = 2 * math.pi * k / seg
            Vl.append(c + (math.cos(a) * u + math.sin(a) * w) * R * f + n * h)
            El.append(0.25 + 0.75 * (1.0 - f * f) ** 2)
    for k in range(seg):
        k2 = (k + 1) % seg
        Fl.append((b, b + 1 + k, b + 1 + k2))
        for ring_k in range(1, nr):
            a0 = b + 1 + (ring_k - 1) * seg
            Fl.append((a0 + k, a0 + seg + k, a0 + seg + k2, a0 + k2))


def plane_ring(tree, s, n=480, reach=0.25):
    """The surface points round a strap plane: rays from s['O'] in the plane. Returns points, normals, angles."""
    pts, nrm, ang = [], [], []
    for k in range(n):
        a = 2 * math.pi * k / n
        d = math.cos(a) * s['e1'] + math.sin(a) * s['e2']
        p, q = ray_in(tree, s['O'], d, reach)
        if p is None:
            continue
        pts.append(p)
        nrm.append(q)
        ang.append(a)
    return np.array(pts), np.array(nrm), np.array(ang)


def strap_spans(tree, S):
    """Centre lines of the straps on the surface `tree`: {'crown': (P, N), 'sideL', 'sideR', 'chin'}."""
    plate, cradle = S['plate'], S['cradle']
    out = {}
    P, N, A = plane_ring(tree, S['crown'])
    cy = S['crown']['O'][1]
    keep = ((P[:, 1] < cy) & (P[:, 2] > plate['z'] + plate['hh'] - 0.004)) | \
           ((P[:, 1] >= cy) & (P[:, 2] > cradle['z'] + cradle['hh'] - 0.005))
    keep &= P[:, 2] > S['crown']['O'][2] - 0.02
    out['crown'] = _longest_run(P, N, keep)
    for nm in ('forkL', 'forkR'):
        P2, N2, _ = plane_ring(tree, S[nm], n=600)
        out[nm] = _longest_run(P2, N2, fork_keep(S, S[nm], P2))
    P, N, A = plane_ring(tree, S['side'])
    cy = S['crown']['O'][1]
    front = P[:, 1] < cy
    on_plate = front & (np.abs(P[:, 0]) < plate['hw'] - 0.004)
    on_cradle = ~front & (np.abs(P[:, 0]) < cradle['hw'] - 0.006)
    for nm, sg in (('sideL', 1.0), ('sideR', -1.0)):
        out[nm] = _longest_run(P, N, (~on_plate) & (~on_cradle) & (P[:, 0] * sg > 0))
    P, N, A = plane_ring(tree, S['chin'])
    out['chin'] = _longest_run(P, N, P[:, 2] < S['chin']['za'] - 0.003)
    return out


def _longest_run(P, N, mask):
    """The longest cyclic run of True in mask, as ordered points and normals (smoothed, resampled about 4 mm)."""
    n = len(mask)
    best, cur, start, bstart = 0, 0, 0, 0
    for k in range(2 * n):
        if mask[k % n]:
            if cur == 0:
                start = k
            cur += 1
            if cur > best and cur <= n:
                best, bstart = cur, start
        else:
            cur = 0
    idx = [(bstart + i) % n for i in range(best)]
    pts, nrm = FT.smooth_polyline(P[idx], 2), FT.unit(FT.smooth_polyline(N[idx], 2))
    return resample(pts, nrm, 0.004)


def resample(pts, nrm, step):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    m = max(2, int(math.ceil(s[-1] / step)) + 1)
    q = np.linspace(0.0, s[-1], m)
    P = np.stack([np.interp(q, s, pts[:, k]) for k in range(3)], axis=1)
    N = FT.unit(np.stack([np.interp(q, s, nrm[:, k]) for k in range(3)], axis=1))
    return P, N


def path_length(P):
    return float(np.linalg.norm(np.diff(P, axis=0), axis=1).sum())


def at_length(P, L):
    """Point index nearest to arc length L along P."""
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    return int(np.argmin(np.abs(s - L)))


def tangents(P):
    T = np.zeros_like(P)
    T[1:-1] = P[2:] - P[:-2]
    T[0] = P[1] - P[0]
    T[-1] = P[-1] - P[-2]
    return FT.unit(T)


def strap_mesh(V, F, P, N, width, thick, lift=0.0003):
    """Webbing along a surface path (P, N): lies on the surface, its width across the path."""
    T = tangents(P)
    B = FT.unit(np.cross(N, T))
    FT.strip(V, F, P + N * lift, N, B, width, thick)
    return T, B


def rbox(V, F, c, axes, half, r, step=0.003, emit=None, deform=None):
    """A rounded box: centre c, orthonormal axes (3 rows), half sizes, edge radius r; each face a grid about `step`
    apart, welded, so the rounding is smooth and no edge is long. deform(local points) -> local points (optional).
    Returns the new vertex range."""
    half = np.asarray(half, float)
    cnt = [max(2, int(math.ceil(2 * h / step))) for h in half]
    key, loc = {}, []

    def vid(s):
        k = tuple(int(round(x * 1e5)) for x in s)
        if k not in key:
            key[k] = len(loc)
            loc.append(s)
        return key[k]
    faces = []
    for ax in range(3):
        a1, a2 = (ax + 1) % 3, (ax + 2) % 3
        for sgn in (-1.0, 1.0):
            g1 = np.linspace(-1, 1, cnt[a1] + 1)
            g2 = np.linspace(-1, 1, cnt[a2] + 1)
            ids = np.zeros((len(g1), len(g2)), int)
            for i, x1 in enumerate(g1):
                for j, x2 in enumerate(g2):
                    s = [0.0, 0.0, 0.0]
                    s[ax], s[a1], s[a2] = sgn, x1, x2
                    ids[i, j] = vid(tuple(s))
            for i in range(len(g1) - 1):
                for j in range(len(g2) - 1):
                    q = (ids[i, j], ids[i + 1, j], ids[i + 1, j + 1], ids[i, j + 1])
                    faces.append(q if sgn > 0 else q[::-1])
    S = np.array(loc, float) * half
    inner = np.maximum(half - r, 1e-5)
    Q = np.clip(S, -inner, inner)
    L = Q + FT.unit(S - Q) * r
    if deform is not None:
        L = deform(L)
    A = np.asarray(axes, float)
    base = len(V)
    W = np.asarray(c, float) + L @ A
    V.extend(list(W))
    F.extend([tuple(base + i for i in f) for f in faces])
    if emit is not None:
        emit.extend([0.0] * len(W))
    return base, len(V)


def taper(V, F, pts, r0, r1, sides=10):
    """A tube along pts whose radius runs from r0 to r1 (strain relief boots), both ends capped."""
    pts = np.asarray(pts, float)
    n = len(pts)
    T = tangents(pts)
    ref = np.array([0.0, 0.0, 1.0]) if abs(T[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = FT.unit(np.cross(T[0], ref))
    base = len(V)
    for i in range(n):
        u = FT.unit(u - T[i] * np.dot(u, T[i]))
        w = np.cross(T[i], u)
        r = r0 + (r1 - r0) * i / max(1, n - 1)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            V.append(pts[i] + r * (math.cos(a) * u + math.sin(a) * w))
    for i in range(n - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            F.append((base + i * sides + k, base + (i + 1) * sides + k, base + (i + 1) * sides + k2, base + i * sides + k2))
    F.append(tuple(base + k for k in range(sides))[::-1])
    F.append(tuple(base + (n - 1) * sides + k for k in range(sides)))


def knurl(V, F, c, axis, r, length, ridges=24, rings=4):
    """A knurled knob: a cylinder along `axis` whose rim alternates r and r - 0.4 mm, closed with chamfered faces."""
    axis = FT.unit(axis)
    ref = np.array([0.0, 0.0, 1.0]) if abs(axis[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = FT.unit(np.cross(axis, ref))
    w = np.cross(axis, u)
    base = len(V)
    n = ridges * 2
    prof = [(-0.5, 0.8)] + [(-0.5 + 0.08 + 0.84 * k / (rings - 1), 1.0) for k in range(rings)] + [(0.5, 0.8)]
    for t, sc in prof:
        for k in range(n):
            a = 2 * math.pi * k / n
            rr = r * sc * (1.0 if k % 2 == 0 or sc < 1.0 else 0.93)
            V.append(np.asarray(c) + axis * t * length + rr * (math.cos(a) * u + math.sin(a) * w))
    m = len(prof)
    for i in range(m - 1):
        for k in range(n):
            k2 = (k + 1) % n
            F.append((base + i * n + k, base + (i + 1) * n + k, base + (i + 1) * n + k2, base + i * n + k2))
    for i, rev in ((0, True), (m - 1, False)):
        cen = len(V)
        V.append(np.asarray(c) + axis * prof[i][0] * length)
        for k in range(n):
            k2 = (k + 1) % n
            f = (base + i * n + k, base + i * n + k2, cen)
            F.append(f[::-1] if rev else f)


def pad(V, F, tree, centre, a, b, d, ha, hb, thick, corner=0.4, rings=7, seg=72, bevel=0.0018, lift=0.0004):
    """A slab conformed to a surface: an outline (superellipse with exponent from `corner`) in the plane (a, b) about
    `centre`, projected along d onto `tree`; the top is offset by `thick` and its outer ring pulled in by `bevel`
    (rounded edge). Returns (top points by ring, top normals by ring, outline points on the surface)."""
    ex = 2.0 / max(corner, 0.05)
    bot, top_, nrm = [], [], []
    for k in range(rings + 1):
        f = k / rings
        rowb, rowt, rown = [], [], []
        for j in range(seg):
            t = 2 * math.pi * j / seg
            ct, st = math.cos(t), math.sin(t)
            x = ha * f * np.sign(ct) * abs(ct) ** (2.0 / ex)
            y = hb * f * np.sign(st) * abs(st) ** (2.0 / ex)
            o = np.asarray(centre) + a * x + b * y
            p, n = ray_in(tree, o, -np.asarray(d), 0.15)
            if p is None:
                p, n = o, -np.asarray(d)
            rowb.append(p + n * lift)
            rowt.append(p + n * (lift + thick))
            rown.append(n)
        bot.append(rowb)
        top_.append(rowt)
        nrm.append(rown)
    bot, top_, nrm = np.array(bot), np.array(top_), np.array(nrm)
    # rounded top edge: the outer top ring pulled toward the previous ring and down a little
    top_[-1] = top_[-1] + (top_[-2] - top_[-1]) * min(1.0, bevel / max(1e-6, float(np.linalg.norm(top_[-1] - top_[-2], axis=1).mean()))) * 0.6 \
        - nrm[-1] * thick * 0.25
    base = len(V)
    cen_b = base
    V.append(bot[0].mean(axis=0))
    for k in range(1, rings + 1):
        V.extend(list(bot[k]))
    cen_t = len(V)
    V.append(top_[0].mean(axis=0))
    for k in range(1, rings + 1):
        V.extend(list(top_[k]))

    def ib(k, j):
        return cen_b + 1 + (k - 1) * seg + (j % seg)

    def it(k, j):
        return cen_t + 1 + (k - 1) * seg + (j % seg)
    for j in range(seg):
        F.append((cen_t, it(1, j), it(1, j + 1)))
        F.append((cen_b, ib(1, j + 1), ib(1, j)))
        for k in range(1, rings):
            F.append((it(k, j), it(k + 1, j), it(k + 1, j + 1), it(k, j + 1)))
            F.append((ib(k, j + 1), ib(k + 1, j + 1), ib(k + 1, j), ib(k, j)))
        F.append((it(rings, j), ib(rings, j), ib(rings, j + 1), it(rings, j + 1)))
    return top_, nrm, bot[-1]


def bvh(V, F):
    return BVHTree.FromPolygons([tuple(map(float, v)) for v in V], [tuple(int(i) for i in f) for f in F])
