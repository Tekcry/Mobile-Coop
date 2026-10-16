"""Wren's composite armour and harness (step 08b; SPEC 3.2 "Composite plates and harness", "Weapon mount point", 3.5,
5.1 "Armour and harness"; ART-DIRECTION 9.1-9.2; concept A2). A FITTED item over the suit (DECISIONS A32 style, A53):
moulded hard parts and tensioned straps laid on the suit, which is then pressed in under them (torso_common.compress,
A33).

- Moulded plates: each plate is a conformal shell offset from a faired copy of the suit's surface. The suit is sampled
  as a height field (rays along Y, front and back); each row's outer envelope (a stretched sheet across the hollows) is
  blended back 40 % toward the surface, smoothed and never allowed inside the pressed surface, so the plate follows the
  bust and torso and bridges only the sternum hollow (and the spine groove at the back). A quadratic dome over each
  bust apex bridges the apex (A61); the back plate's lower rows are faired across x (one straight bottom band).
- Chest plate: neck scoop between two shoulder tabs, clear of the earpiece plug and the future PTT at the left
  collarbone (`plugClearM`). Three rib segments below it, each lapping the one below like shingles (its bottom band
  stands out over the next one's top), on an internal elastic web (two straps under the segments, hidden).
- Back plate: slim, ending at the ribs; the radio recess in its upper left (radio: step 09) with the antenna keeper on
  the top edge; the weapon mount on the spine: a flush gunmetal receiver bar inlaid in the plate with three keyhole
  sockets at the game's back slots (frames `weaponMount.backL/.backC/.backR`, A36, A40), splayed 0.08 rad.
- Every plate: chamfered edge, a moulded rubber trim round the rim, corner radii 9 / 18 / 36 mm (one family, 1:2:4),
  matte composite with a faint fibre texture (materials.composite).
- Harness: slim 25 mm laminate shoulder straps (chest plate tab to back plate tab, on the suit's convex hull, the
  left one with three flat keepers for the radio cable) and 22 mm side straps under the arms (front plate side to back
  plate side, tensioned bands on the hull); every closure a flush magnetic buckle (mag_buckle.py); strap ends bonded.

Frame (Blender): +Z up, the body faces -Y, the wearer's left is +X. Plate maps use (x, z) as their 2D parameters.
"""
import math

import bmesh
import bpy
import numpy as np

import fitted as FT
import head_common as HC
import mag_buckle as MB
import torso_common as TC
from torso_common import X, Z

KIT = 'chestPlate'
KITS = ['ribSegments', 'backPlate', 'harnessShoulders', 'torsoSideStraps', 'magBuckle', 'weaponMount']
METHOD = ('moulded composite shells offset from a faired copy of the suit, tensioned straps on the suit\'s convex '
          'hull, laid by rays; the suit pressed in under them (no simulation)')
T_CH, T_RIB, T_BK = 0.008, 0.005, 0.007      # plate thicknesses
CD = 0.003                                   # chamfer depth: the rim is CD thinner than the plate
LEDGE, CW = 0.0028, 0.0050                   # the trim covers LEDGE of the face; the chamfer then rises over CW
LIP = 0.0006                                 # rubber trim lip over the faces
WEB = 0.0010                                 # internal elastic web under the rib segments
LAP = T_RIB + 0.0008                         # a lapping plate's bottom band clears the plate under it
SINK = 0.0005                                # a plate presses the suit in by up to this at its high points
R1, R2, R3 = 0.009, 0.018, 0.036             # the corner radius family
STRAP_W, STRAP_T = 0.025, 0.0024
SIDE_W, SIDE_T = 0.022, 0.0022
FOLLOW = 0.3                                 # how far a plate follows a hollow (0 bridges it, 1 follows it)
SLOT_X, SPLAY = 0.07, 0.08                   # carrySlots.ts / weaponModel.ts: BACK_X, BACK_SPLAY
CLR = 0.0004                                 # a strap's inner face over a plate face or trim
ANT_X, ANT_Z = 0.018, 1.3170                 # the antenna keeper on the back plate (chest_rig's stub antenna, step 09)


class Parts:
    def __init__(self):
        self.d = {}

    def __call__(self, k):
        if k not in self.d:
            self.d[k] = ([], [], [])
        return self.d[k]

    def pad(self, k, val=0.05):
        V, _, E = self(k)
        E.extend([val] * (len(V) - len(E)))


def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# --- The faired suit surface and the shell maps ------------------------------------------------------------------
def upper_envelope(xs, d):
    """The outer envelope of a profile (x, d): its upper convex hull, sampled at xs (a stretched sheet across it)."""
    pts = [(x, v) for x, v in zip(xs, d) if np.isfinite(v)]
    up = []
    for p in pts:
        while len(up) >= 2 and ((up[-1][0] - up[-2][0]) * (p[1] - up[-2][1]) - (up[-1][1] - up[-2][1]) * (p[0] - up[-2][0])) >= 0:
            up.pop()
        up.append(p)
    up = np.array(up)
    return np.interp(xs, up[:, 0], up[:, 1])


def gauss1(a, s, axis):
    """A 1D Gaussian blur (sigma s samples, edge padded) along one axis of a 2D array."""
    k = np.exp(-0.5 * (np.arange(-3 * s, 3 * s + 1) / s) ** 2)
    k /= k.sum()
    p = len(k) // 2
    B = np.pad(a, ((p, p), (0, 0)) if axis == 0 else ((0, 0), (p, p)), mode='edge')
    if axis == 0:
        return np.stack([np.convolve(B[:, j], k, mode='valid') for j in range(a.shape[1])], 1)
    return np.stack([np.convolve(B[i], k, mode='valid') for i in range(a.shape[0])], 0)


def gauss(A, s):
    k = np.exp(-0.5 * (np.arange(-3 * s, 3 * s + 1) / s) ** 2)
    k /= k.sum()
    p = len(k) // 2
    B = np.pad(A, ((p, p), (0, 0)), mode='edge')
    B = np.stack([np.convolve(B[:, j], k, mode='valid') for j in range(A.shape[1])], 1)
    B = np.pad(B, ((0, 0), (p, p)), mode='edge')
    return np.stack([np.convolve(B[i], k, mode='valid') for i in range(A.shape[0])], 0)


class Field:
    """The suit sampled as a height field from the front (side -1) or the back (+1): D[i, j] the outward distance at
    (xs[j], zs[i]) (front: -y, back: +y), C the depth the suit can be pressed there (at most SINK), F the faired
    surface, P its points and N its outward normals."""

    def __init__(self, tree, under, side, xs, zs, follow=FOLLOW, fabric=None, caps=(), fair=None):
        self.side, self.xs, self.zs = side, np.asarray(xs, float), np.asarray(zs, float)
        R, C_ = len(zs), len(xs)
        D = np.full((R, C_), np.nan)
        Cc = np.zeros((R, C_))
        for i, z in enumerate(zs):
            for j, x in enumerate(xs):
                h, hn, _ = TC.ray(tree, (x, side * 0.5, z), (0.0, -side, 0.0), 1.0)
                if h is None:
                    continue
                D[i, j] = side * h[1]
                # the depth the fabric itself can give (the tape and zip over it do not compress): from the suit
                hf, hfn = h, hn
                if fabric is not None:
                    hf, hfn, _ = TC.ray(fabric, (x, side * 0.5, z), (0.0, -side, 0.0), 1.0)
                    if hf is None:
                        hf, hfn = h, hn
                Cc[i, j] = TC.compressible(hf, hfn, under, cap=SINK)
        for i in range(R):                  # a ray that missed: the row's nearest hit
            ok = np.isfinite(D[i])
            if ok.any() and not ok.all():
                D[i, ~ok] = np.interp(self.xs[~ok], self.xs[ok], D[i, ok])
        self.D, self.C = D, Cc
        Dc = D - Cc + 0.0004        # 0.4 mm of slack: the suit's sub-millimetre relief between the 3 mm samples
        # features narrower than about 2 cm (the bust points, seam tape ridges) are bridged, not followed: the floor
        # the plate rests on is the surface dilated by a 21 mm window and eased; broad forms are followed
        # (only where the surface faces the ray: on the flanks a window maximum would lift the plate off the slope)
        Wd = np.lib.stride_tricks.sliding_window_view(np.pad(Dc, 2, mode='edge'), (5, 5)).max(axis=(-1, -2))
        gz_, gx_ = np.gradient(gauss(Dc, 2), self.zs, self.xs)
        facing = smoothstep(0.88, 0.97, 1.0 / np.sqrt(1.0 + gx_ ** 2 + gz_ ** 2))
        floor = np.maximum(Dc + facing * (gauss(Wd, 2) - Dc), Dc)
        gx, gz = np.meshgrid(self.xs, self.zs)
        self.caps = []
        for xa, za in caps:
            # a rigid moulded shell bridges a narrow apex (the bust points): a smooth quadratic dome fitted to the floor
            # round the apex, lifted clear of it, raises the floor there (the plate sits higher, one convex form)
            win = (np.abs(gx - xa) < 0.015) & (np.abs(gz - za) < 0.015)
            i0, j0 = np.unravel_index(np.argmax(np.where(win, floor, -1.0)), floor.shape)
            dx, dz = gx - self.xs[j0], gz - self.zs[i0]
            r = np.sqrt(dx * dx + dz * dz)
            fit = r < 0.03
            A_ = np.stack([np.ones(fit.sum()), dx[fit], dz[fit], dx[fit] ** 2, dz[fit] ** 2, dx[fit] * dz[fit]], 1)
            cf = np.linalg.lstsq(A_, floor[fit], rcond=None)[0]
            Q = cf[0] + cf[1] * dx + cf[2] * dz + cf[3] * dx * dx + cf[4] * dz * dz + cf[5] * dx * dz
            lift = float(np.max((floor - Q)[r < 0.02])) + 0.0002
            Q = Q + lift - smoothstep(0.03, 0.05, r) * 0.02
            floor = np.maximum(floor, Q)
            self.caps.append({'apex': [round(float(self.xs[j0]), 3), round(float(self.zs[i0]), 3)],
                              'liftMm': round(lift * 1000, 2)})
        H = np.array([upper_envelope(self.xs, floor[i]) for i in range(R)])
        Fv = H - follow * (H - floor)
        for _ in range(16):
            Fv = np.maximum(gauss(Fv, 3), floor)
        for _ in range(4):                  # relax the clamp's creases: smooth, then ease back out where it dipped
            Fv = gauss(Fv, 2)
            Fv = Fv + gauss(np.maximum(floor - Fv, 0.0), 2) * 3.0
        Fv = np.maximum(Fv, floor - 0.0003)
        if fair is not None:
            # the lower rows faired across x (a plate's bottom band reads as one straight even moulded edge): each row
            # the stretched sheet across its hollows (the spine groove bridged), eased, lifted clear of the floor by a
            # row constant; the rows then eased into each other and lifted again; blended into the shell above zf1
            zf0, zf1, xl = fair
            rows = np.where(self.zs < zf1 + 0.012)[0]
            inx = np.abs(self.xs) < xl
            Fs = np.array([upper_envelope(self.xs, floor[i]) for i in rows])
            Fs = gauss1(Fs, 2, 1)
            for _ in range(2):
                Fs = Fs + np.maximum(0.0, (floor[rows] - Fs)[:, inx].max(axis=1))[:, None]
                Fs = gauss1(Fs, 2, 0)
            Fs = Fs + np.maximum(0.0, (floor[rows] - Fs)[:, inx].max(axis=1))[:, None]
            W = (1.0 - smoothstep(zf0, zf1, self.zs[rows]))[:, None] * (1.0 - smoothstep(xl, xl + 0.02, np.abs(self.xs)))[None, :]
            Fv[rows] = W * Fs + (1.0 - W) * Fv[rows]
            Fv = np.maximum(Fv, floor - 0.0003)
        self.floor = floor
        self.F = Fv
        self.P = np.stack([gx, side * Fv, gz], -1)
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


class Shell:
    """A plate map on a Field: S(x, z, h) = the faired surface + its normal * (off(x, z) + h)."""

    def __init__(self, field, off=None):
        self.f, self.off = field, off

    def S(self, x, y, h=0.0):
        x, y, h = np.broadcast_arrays(np.asarray(x, float), np.asarray(y, float), np.asarray(h, float))
        P = self.f.interp(self.f.P, x, y)
        N = FT.unit(self.f.interp(self.f.N, x, y).reshape(-1, 3)).reshape(P.shape)
        o = self.off(x, y) if self.off is not None else 0.0
        return P + N * (np.asarray(o) + h)[..., None]

    def normal(self, x, y):
        x, y = np.broadcast_arrays(np.asarray(x, float), np.asarray(y, float))
        P = self.f.interp(self.f.N, x, y)
        return FT.unit(P.reshape(-1, 3)).reshape(P.shape)


def outline(pts, radii, step=0.004):
    return TC.densify_closed(TC.fillet(np.array(pts, float), radii, seg=8), step)


def rrect(x0, x1, z0, z1, r):
    return outline([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], [r] * 4)


def frame2(ol):
    """Outward in-plane normals of a counter-clockwise 2D outline."""
    t = np.roll(ol, -1, 0) - np.roll(ol, 1, 0)
    return FT.unit(np.stack([t[:, 1], -t[:, 0]], 1))


# --- The moulded plate solid ------------------------------------------------------------------------------------------
D_RINGS = [0.0, 0.0008, 0.0016, 0.0024, LEDGE, LEDGE + 0.0012, LEDGE + 0.0025, LEDGE + 0.0037, LEDGE + CW,
           LEDGE + CW + 0.0008]
F_RINGS = [0.86, 0.72, 0.58, 0.45, 0.33, 0.22, 0.12]


def h_face(d, T):
    """The plate's outer face height over the inner face at distance d in from the rim (the chamfer of plate_solid)."""
    d = np.asarray(d, float)
    t = np.clip((d - LEDGE) / CW, 0.0, 1.0)
    a = 0.7
    k = 2.0 / (1.0 + a)
    s_ = np.where(t < a, k * t, 1.0 - k / (2 * (1 - a)) * (1.0 - t) ** 2)
    return (T - CD) + CD * s_


def plate_solid(V, F, E, sm, ol, T):
    """A closed moulded plate on shell map sm over the outline ol (x, z): inner face on the map (h 0), outer face h T,
    the rim CD thinner (a flat ledge under the rubber trim, then a chamfer over CW), a short wall at the rim. Rings:
    true insets near the rim (offset_closed), then scaled toward the centroid; a fan at the centre."""
    rings, dist = [], []
    for d in D_RINGS:
        rings.append(FT.offset_closed(ol, -d) if d > 0 else ol.copy())
        dist.append(d)
    last = rings[-1]
    c = last.mean(axis=0)
    for f in F_RINGS:
        rings.append(c + (last - c) * f)
        dist.append(D_RINGS[-1] + 0.01 * (1 - f) / 0.1)
    n = len(ol)
    T_rim = T - CD

    def h_out(d):
        # a straight chamfer (slope k) easing into the face over its last 30 % (zero slope at the face)
        t = np.clip((d - LEDGE) / CW, 0.0, 1.0) if CW > 0 else np.ones_like(np.asarray(d, float))
        a = 0.7
        k = 2.0 / (1.0 + a)
        s = np.where(t < a, k * t, 1.0 - k / (2 * (1 - a)) * (1.0 - t) ** 2)
        return T_rim + (T - T_rim) * s
    base = len(V)
    R = len(rings)
    for k in range(R):                                           # outer sheet
        V.extend(list(sm.S(rings[k][:, 0], rings[k][:, 1], h_out(dist[k])).reshape(-1, 3)))
        E.extend([dist[k]] * n)
    co = len(V)
    V.append(sm.S(c[0], c[1], T).reshape(3))
    E.append(0.05)
    bi = len(V)
    for k in range(R):                                           # inner sheet
        V.extend(list(sm.S(rings[k][:, 0], rings[k][:, 1], 0.0).reshape(-1, 3)))
        E.extend([dist[k]] * n)
    ci = len(V)
    V.append(sm.S(c[0], c[1], 0.0).reshape(3))
    E.append(0.05)
    wm = len(V)                                                  # the rim wall's middle row
    V.extend(list(sm.S(ol[:, 0], ol[:, 1], 0.5 * T_rim).reshape(-1, 3)))
    E.extend([0.0] * n)

    def o(k, j):
        return base + k * n + (j % n)

    def i_(k, j):
        return bi + k * n + (j % n)
    for k in range(R - 1):
        for j in range(n):
            F.append((o(k, j), o(k, j + 1), o(k + 1, j + 1), o(k + 1, j)))
            F.append((i_(k, j), i_(k + 1, j), i_(k + 1, j + 1), i_(k, j + 1)))
    for j in range(n):
        F.append((o(R - 1, j), o(R - 1, j + 1), co))
        F.append((i_(R - 1, j + 1), i_(R - 1, j), ci))
        F.append((o(0, j + 1), o(0, j), wm + j, wm + (j + 1) % n))
        F.append((wm + (j + 1) % n, wm + j, i_(0, j), i_(0, j + 1)))
    return base, len(V)


def trim(V, F, E, sm, ol, T):
    """The moulded rubber trim round a plate's rim: a rounded U section gripping the edge, LIP over both faces and
    covering the ledge, standing 2 mm out from the rim."""
    T_rim = T - CD
    nb = frame2(ol)
    P0 = sm.S(ol[:, 0], ol[:, 1], 0.0)
    Pb = sm.S(ol[:, 0] + nb[:, 0] * 1e-3, ol[:, 1] + nb[:, 1] * 1e-3, 0.0)
    B = FT.unit((Pb - P0).reshape(-1, 3))
    N = sm.normal(ol[:, 0], ol[:, 1]).reshape(-1, 3)
    B = FT.unit(B - N * np.sum(B * N, 1, keepdims=True))
    # section (b out from the rim, n up from the inner face): a rounded rectangle, counter-clockwise
    b0, b1, n0, n1, r = -(LEDGE + 0.0002), 0.0012, 0.0, T_rim + LIP, 0.0008
    sec = TC.fillet(np.array([(b0, n0), (b1, n0), (b1, n1), (b0, n1)]), [0.0004, r, r, 0.0004], seg=4)
    m = len(sec)
    base = len(V)
    for i in range(len(ol)):
        for b, h in sec:
            V.append(P0[i] + B[i] * b + N[i] * h)
            E.append(max(0.0, 0.002 - abs(b - 0.0012)))
    n = len(ol)
    for i in range(n):
        for k in range(m):
            F.append((base + i * m + k, base + ((i + 1) % n) * m + k, base + ((i + 1) % n) * m + (k + 1) % m,
                      base + i * m + (k + 1) % m))


def keyhole(w=0.0042, r=0.0065, z_bot=-0.011):
    """A keyhole socket outline (counter-clockwise, local x across, z up): a round entry (radius r, centred r above
    the origin) over a narrow lock slot (half width w) down to z_bot with a round end."""
    zi = r - math.sqrt(r * r - w * w)                     # where the slot's sides meet the entry circle
    P = [(w * math.cos(t), z_bot + w + w * math.sin(t)) for t in np.linspace(math.pi, 2 * math.pi, 9)]
    P += [(w, z) for z in np.linspace(z_bot + w, zi, 5)[1:-1]]
    a0 = math.atan2(zi - r, w)
    P += [(r * math.cos(t), r + r * math.sin(t)) for t in np.linspace(a0, math.pi - a0, 31)]
    P += [(-w, z) for z in np.linspace(zi, z_bot + w, 5)[1:-1]]
    return np.array(P)


def snap(P2, poly, inside_is_bad):
    """Grid points on the wrong side of a closed outline moved onto it (the nearest point of a dense copy)."""
    dense = TC.densify_closed(poly, 0.0003)
    ins = TC.inside(poly, P2)
    bad = np.where(ins if inside_is_bad else ~ins)[0]
    for k0 in range(0, len(bad), 2000):
        ch = bad[k0:k0 + 2000]
        d2 = ((P2[ch, None, :] - dense[None, :, :]) ** 2).sum(-1)
        P2[ch] = dense[np.argmin(d2, axis=1)]
    return P2


def twist(P2, tw, ol):
    """The grid warp round the splayed sockets: each socket's neighbourhood turned rigidly by its splay (a socket
    built upright on the grid, then turned whole), easing to no turn between 13.4 and 16.5 mm from its centre and
    within 3 mm of the bar's outline (the outline stays on the unturned grid). tw: (cx, cz, angle) per socket."""
    P2 = np.asarray(P2, float).copy()
    keep = smoothstep(0.0004, 0.003, TC.dist_to_poly(ol, P2) * np.where(TC.inside(ol, P2), 1.0, 0.0))
    out = P2.copy()
    for cx, cz, a in tw:
        d = P2 - np.array([cx, cz])
        r = np.linalg.norm(d, axis=1)
        th = a * (1.0 - smoothstep(0.0134, 0.0165, r)) * keep
        cs, sn = np.cos(th), np.sin(th)
        m = th != 0
        out[m, 0] = cx + d[m, 0] * cs[m] + d[m, 1] * sn[m]
        out[m, 1] = cz - d[m, 0] * sn[m] + d[m, 1] * cs[m]
    return out


def bar_mesh(V, F, E, sm, ol, holes, T, step=0.0006, tw=()):
    """A thin hard plate with holes on a map (the receiver bar): a fine grid sheet `T` out (TC.perforated: a wall `T`
    deep round its border and every hole), grid points snapped onto the outline and the hole outlines so the cut edges
    follow them; even quads, no slivers to smear the shading. With `tw` the holes are given upright (on the grid) and
    each is turned with its neighbourhood afterwards (twist), so a splayed socket is as clean as an upright one."""
    xs = np.arange(ol[:, 0].min() - step, ol[:, 0].max() + step + 1e-9, step)
    zs = np.arange(ol[:, 1].min() - step, ol[:, 1].max() + step + 1e-9, step)
    gx, gz = np.meshgrid(xs, zs)
    cx, cz = (gx[:-1, :-1] + gx[1:, 1:]) / 2, (gz[:-1, :-1] + gz[1:, 1:]) / 2
    C2 = np.stack([cx.ravel(), cz.ravel()], 1)
    solid = TC.inside(ol, C2)
    for hpoly in holes:
        solid &= ~TC.inside(hpoly, C2)
    P2 = np.stack([gx.ravel(), gz.ravel()], 1)
    P2 = snap(P2, ol, False)
    for hpoly in holes:
        P2 = snap(P2, hpoly, True)
    if tw:
        P2 = twist(P2, tw, ol)
        holes = [twist(h, tw, ol) for h in holes]
    gx, gz = P2[:, 0].reshape(gx.shape), P2[:, 1].reshape(gz.shape)
    G = sm.S(gx, gz, T)
    Nn = sm.normal(gx, gz)
    b0 = len(V)
    TC.perforated(V, F, G, Nn, solid.reshape(cx.shape), T)
    ed = np.minimum(TC.dist_to_poly(ol, P2), np.min([TC.dist_to_poly(h, P2) for h in holes], axis=0))
    E.extend(list(np.concatenate([ed, ed])))
    return b0


def grid_faces(sm, ol, h, step=0.006):
    """A coarse sheet of the map at height h over the outline (pressers and the shell for later layers)."""
    gx, gz = np.meshgrid(np.arange(ol[:, 0].min(), ol[:, 0].max() + 1e-6, step),
                         np.arange(ol[:, 1].min(), ol[:, 1].max() + 1e-6, step))
    ins = TC.inside(ol, np.stack([gx.ravel(), gz.ravel()], 1)).reshape(gx.shape)
    P = sm.S(gx, gz, h)
    cols = gx.shape[1]
    Fq = [(i * cols + j, i * cols + j + 1, (i + 1) * cols + j + 1, (i + 1) * cols + j)
          for i in range(gx.shape[0] - 1) for j in range(cols - 1)
          if ins[i, j] and ins[i + 1, j] and ins[i, j + 1] and ins[i + 1, j + 1]]
    return P.reshape(-1, 3), Fq


def prism(sm, ol, h0, h1, V=None, F=None):
    """A closed conformal prism over the outline between map heights h0 and h1 (a boolean cutter), ring caps."""
    V = [] if V is None else V
    F = [] if F is None else F
    c = ol.mean(axis=0)
    n = len(ol)
    for h in (h0, h1):
        b = len(V)
        rings = [ol] + [c + (ol - c) * f for f in (0.66, 0.33)]
        for rg in rings:
            V.extend(list(sm.S(rg[:, 0], rg[:, 1], h).reshape(-1, 3)))
        V.append(sm.S(c[0], c[1], h).reshape(3))
        up = h == h1
        for k in range(2):
            for j in range(n):
                q = (b + k * n + j, b + k * n + (j + 1) % n, b + (k + 1) * n + (j + 1) % n, b + (k + 1) * n + j)
                F.append(q if up else q[::-1])
        for j in range(n):
            t = (b + 2 * n + j, b + 2 * n + (j + 1) % n, b + 3 * n)
            F.append(t if up else t[::-1])
    b1 = len(V) - (3 * n + 1)
    b0 = b1 - (3 * n + 1)
    for j in range(n):
        F.append((b0 + j, b0 + (j + 1) % n, b1 + (j + 1) % n, b1 + j)[::-1])
    return V, F


def gap_stats(sm, ol, tree, h=0.0, step=0.004):
    """Gaps from a plate's inner face (map height h) to the suit, by rays along the plate normal: (x, z, gap) rows;
    a negative gap is the depth the plate sits into the suit (pressed)."""
    gx, gz = np.meshgrid(np.arange(ol[:, 0].min(), ol[:, 0].max() + 1e-6, step),
                         np.arange(ol[:, 1].min(), ol[:, 1].max() + 1e-6, step))
    pts = np.stack([gx.ravel(), gz.ravel()], 1)
    pts = pts[TC.inside(FT.offset_closed(ol, -0.003), pts)]
    P = sm.S(pts[:, 0], pts[:, 1], h).reshape(-1, 3)
    Nn = sm.normal(pts[:, 0], pts[:, 1]).reshape(-1, 3)
    rows = []
    for (x, z), p, n in zip(pts, P, Nn):
        hit, _, t = TC.ray(tree, p + n * 0.03, -n, 0.1)
        if hit is not None:
            rows.append((x, z, t - 0.03))
    return np.array(rows)


def summary(rows):
    g = rows[:, 2]
    return {'meanMm': round(float(np.clip(g, 0, None).mean()) * 1000, 2), 'maxMm': round(float(g.max()) * 1000, 2),
            'maxAt': [round(float(v), 3) for v in rows[int(np.argmax(g)), :2]],
            'maxIntoSuitMm': round(float(max(0.0, -g.min())) * 1000, 2),
            'maxIntoSuitAt': [round(float(v), 3) for v in rows[int(np.argmin(g)), :2]], 'samples': int(len(g))}


def pframe(sm, x, z, h):
    e = 1e-4
    O = sm.S(x, z, h).reshape(3)
    Xp = FT.unit(sm.S(x + e, z, h).reshape(3) - sm.S(x - e, z, h).reshape(3))
    Up = FT.unit(sm.S(x, z + e, h).reshape(3) - sm.S(x, z - e, h).reshape(3))
    Np = FT.unit(np.cross(Xp, Up))
    return O, Xp, FT.unit(np.cross(Np, Xp)), Np


# --- Build --------------------------------------------------------------------------------------------------------------
def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    suit = bpy.data.objects[f'{op}-suit-hero']
    Vs, Fs = TC.mesh_world(suit, dg)
    keep = [f for f in Fs if all(abs(Vs[i, 0]) < 0.2 for i in f)]
    keep_ring = [f for f in keep if all(abs(Vs[i, 0]) < 0.165 for i in f)]
    extra = [bpy.data.objects.get(f'{op}-suit-{n}') for n in ('tape', 'zip', 'zip-tape')]
    Va, Fa = [Vs], list(keep)
    Fr_ = list(keep_ring)
    off = len(Vs)
    for ob in [o for o in extra if o is not None]:
        Vz, Fz = TC.mesh_world(ob, dg)
        Va.append(Vz)
        Fa += [tuple(i + off for i in f) for f in Fz]
        Fr_ += [tuple(i + off for i in f) for f in Fz]
        off += len(Vz)
    Va = np.vstack(Va)
    torso = TC.bvh(Va, Fa)
    torso_r = TC.bvh(Va, Fr_)
    raw = TC.bvh(Vs, keep)                      # the suit alone (the gaps are measured to it)
    under = skin
    pt = Parts()
    meas = {}
    pressers = []
    shV, shF = [], []

    def shell_add(P, Fq):
        b = len(shV)
        shV.extend(list(P))
        shF.extend([tuple(b + k for k in f) for f in Fq])

    def presser_add(P, Fq):
        pressers.append((np.asarray(P, float), list(Fq)))

    # --- The faired suit, front and back -------------------------------------------------------------------------
    front = Field(torso, under, -1.0, np.arange(-0.15, 0.1501, 0.003), np.arange(0.955, 1.3801, 0.003), fabric=raw,
                  caps=[(0.09, 1.219), (-0.09, 1.219)])
    back = Field(torso, under, 1.0, np.arange(-0.15, 0.1501, 0.003), np.arange(1.10, 1.3801, 0.003), fabric=raw,
                 fair=(1.205, 1.245, 0.115))
    meas['bustCaps'] = front.caps

    # --- Chest plate and rib segments ---------------------------------------------------------------------------------
    ch_ol = outline([(-0.115, 1.145), (0.115, 1.145), (0.115, 1.282), (0.108, 1.326), (0.068, 1.326), (0.036, 1.29),
                     (-0.036, 1.29), (-0.068, 1.326), (-0.108, 1.326), (-0.115, 1.282)],
                    [R2, R2, R3, R1, R1, R3, R3, R1, R1, R3])
    ribs = [(0.105, 1.086, 1.159), (0.096, 1.034, 1.100), (0.087, 0.982, 1.048)]
    BAND, RAMP = 0.014, 0.03

    def lap_off(z_bot, z_top, base_off, lap):
        # a shingle: flat across, tilted out from its top (tucked under the one above) to its bottom band (over the one
        # below); the chest plate only tilts out over its lowest RAMP (under the bust)
        def f(x, z):
            return base_off + lap * np.clip((z_top - np.asarray(z, float)) / max(z_top - z_bot - BAND, 1e-6), 0.0, 1.0)
        return f
    sm_ch = Shell(front, lap_off(1.145, 1.145 + BAND + RAMP, 0.0, WEB + LAP))   # its bottom band over rib 1
    sm_rib = [Shell(front, lap_off(z0, z1 - BAND, WEB, LAP) if k < 2 else (lambda x, z: WEB + 0 * np.asarray(z)))
              for k, (hw, z0, z1) in enumerate(ribs)]
    V, F_, E = pt('plate')
    plate_solid(V, F_, E, sm_ch, ch_ol, T_CH)
    Vt, Ft, Et = pt('trim')
    trim(Vt, Ft, Et, sm_ch, ch_ol, T_CH)
    rib_ols = [rrect(-hw, hw, z0, z1, R2) for hw, z0, z1 in ribs]
    for sm, ol in zip(sm_rib, rib_ols):
        plate_solid(V, F_, E, sm, ol, T_RIB)
        trim(Vt, Ft, Et, sm, ol, T_RIB)
    # the internal elastic web: two straps under the segments, from under the chest plate's bottom band to the last one
    web_sm = Shell(front, lambda x, z: 0.0 * np.asarray(z))
    Vw, Fw, Ew = pt('strap')
    for sx in (-1, 1):
        zz = np.arange(0.99, 1.1651, 0.003)
        P = web_sm.S(np.full_like(zz, sx * 0.05), zz, 0.0).reshape(-1, 3)
        Nn = web_sm.normal(np.full_like(zz, sx * 0.05), zz).reshape(-1, 3)
        Bn = FT.unit(np.cross(Nn, TC.tangents(P)))
        FT.strip(Vw, Fw, P, Nn, Bn, 0.025, WEB * 0.95)
        pt.pad('strap')
        presser_add(*_strip_sheet(P, Nn, Bn, 0.025))
    for sm, ol, T in [(sm_ch, ch_ol, T_CH)] + [(s, o, T_RIB) for s, o in zip(sm_rib, rib_ols)]:
        presser_add(*grid_faces(sm, FT.offset_closed(ol, 0.002), 0.0, step=0.004))
        shell_add(*grid_faces(sm, ol, T))

    # fit: gaps to the suit, the laps between the segments
    g_ch = gap_stats(sm_ch, ch_ol, raw)
    st = summary(g_ch)
    hollow = (np.abs(g_ch[:, 0]) < 0.045) & (g_ch[:, 1] > 1.165) & (g_ch[:, 1] < 1.29)
    st['maxOutsideSternumMm'] = round(float(g_ch[~hollow, 2].max()) * 1000, 2)
    st['maxOverSternumMm'] = round(float(g_ch[hollow, 2].max()) * 1000, 2)
    above = g_ch[:, 1] > 1.145 + BAND + RAMP          # above the bottom band that laps rib segment 1 (by design)
    st['maxAboveLapBandMm'] = round(float(g_ch[above, 2].max()) * 1000, 2)
    st['maxAboveLapBandAt'] = [round(float(v), 3) for v in g_ch[above][int(np.argmax(g_ch[above, 2])), :2]]
    st['lapBandStandoffMm'] = round((WEB + LAP) * 1000, 1)
    plate_gap = {'chestPlate': st, 'ribSegments': [summary(gap_stats(s, o, raw)) for s, o in zip(sm_rib, rib_ols)]}
    laps = []
    uppers = [(sm_ch, ch_ol, 1.145)] + [(s, o, z0) for s, o, (hw, z0, z1) in zip(sm_rib, rib_ols, ribs)]
    for k in range(3):
        su, ou, zb = uppers[k]
        sl, ol_l = sm_rib[k], rib_ols[k]
        hw_l, z0_l, z1_l = ribs[k]
        Vl, Fl = [], []
        plate_solid(Vl, Fl, [], sl, ol_l, T_RIB)
        trim(Vl, Fl, [], sl, ol_l, T_RIB)
        tl = TC.bvh(Vl, Fl)
        cl = []
        for x in np.linspace(-hw_l + 0.004, hw_l - 0.004, 25):
            for z in np.linspace(zb + 0.002, z1_l - 0.003, 4):
                p = su.S(x, z, 0.0).reshape(3)
                n = su.normal(x, z).reshape(3)
                hit, _, t = TC.ray(tl, p + n * 0.003, -n, 0.03)
                cl.append(t - 0.003 if hit is not None else np.nan)
        cl = np.array(cl)
        laps.append({'overlapMm': round((z1_l - zb) * 1000, 1), 'lowerHalfWidthM': hw_l,
                     'upperHalfWidthM': (0.115 if k == 0 else ribs[k - 1][0]),
                     'clearanceMinMm': round(float(np.nanmin(cl)) * 1000, 2),
                     'clearanceMaxMm': round(float(np.nanmax(cl)) * 1000, 2), 'missed': int(np.isnan(cl).sum())})
    meas['ribLaps'] = laps

    # --- Back plate: radio recess, antenna keeper, weapon mount ------------------------------------------------------
    bk_ol = outline([(-0.10, 1.142), (0.10, 1.142), (0.10, 1.27), (0.12, 1.295), (0.12, 1.338), (0.075, 1.338),
                     (0.06, 1.33), (-0.06, 1.33), (-0.075, 1.338), (-0.12, 1.338), (-0.12, 1.295), (-0.10, 1.27)],
                    [R2, R2, R2, R1, R1, R1, R2, R2, R1, R1, R1, R2])
    sm_bk = Shell(back, lambda x, z: 0.0 * np.asarray(z))
    nb0 = len(V)
    plate_solid(V, F_, E, sm_bk, bk_ol, T_BK)
    trim(Vt, Ft, Et, sm_bk, bk_ol, T_BK)
    plate_trims = (list(Vt), list(Ft))           # the plates' rim trims (for strapIntoPlateMm; keepers and bases after)
    presser_add(*grid_faces(sm_bk, FT.offset_closed(bk_ol, 0.002), 0.0, step=0.004))
    shell_add(*grid_faces(sm_bk, bk_ol, T_BK))
    g_bk = gap_stats(sm_bk, bk_ol, raw)
    plate_gap['backPlate'] = summary(g_bk)
    meas['plateGap'] = plate_gap
    # cutters (boolean differences, applied on the plate object below)
    rec_ol = rrect(0.030, 0.086, 1.256, 1.317, R1)
    cutV, cutF = prism(sm_bk, rec_ol, T_BK - 0.005, T_BK + 0.004)
    rx0, rx1, rz0, rz1 = -0.084, 0.084, 1.157, 1.191
    meas['radioRecess'] = {'xM': [0.030, 0.086], 'zM': [1.256, 1.317], 'depthM': 0.005}
    # antenna keeper (step 09): a moulded rubber bridge on the plate face below the top edge, left of the centre beside
    # the recess; the radio's 4 mm stub antenna (chest_rig.py) runs along the edge under its arch
    O, Xp, Up, Np = pframe(sm_bk, ANT_X, ANT_Z, T_BK)
    pt.pad('trim')
    kc = O + Np * 0.0008
    rng = HC.rbox(Vt, Ft, kc, [Up, Xp, Np], (0.0085, 0.0040, 0.0008), 0.0006, step=0.0008,
                  deform=lambda L: _arch(L, 0.0046, 0.0060))
    Et.extend(TC.rbox_edge(Vt, rng, kc, [Up, Xp, Np], (0.0085, 0.0040, 0.0008)))
    meas['antennaKeeper'] = {'x': ANT_X, 'z': ANT_Z, 'archMm': 4.6}
    # the receiver bar: a 1.6 mm gunmetal plate bonded flat on the back plate, three keyhole sockets cut through it
    sm_bar = Shell(back, lambda x, z: T_BK + 0.0 * np.asarray(z))
    Vm, Fm, Em = pt('metal')
    bar_ol = rrect(rx0, rx1, rz0, rz1, R1)
    BAR_T = 0.0016
    slots = {}
    holes, twists = [], []
    zc = (rz0 + rz1) / 2
    for name, sx in (('backL', 1.0), ('backC', 0.0), ('backR', -1.0)):
        a = sx * SPLAY                    # backL is the wearer's left (+X here; game x -0.07), its muzzle splays out
        x0 = sx * SLOT_X
        holes.append(keyhole() + np.array([x0, zc]))       # upright on the grid; turned by its splay in bar_mesh
        twists.append((x0, zc, a))
        # the frame: origin on the bar's face at the slot; Z = muzzle up (splayed out), Y = straight out from the back
        # (the game's slot: the gun's thin side flat to the back, weaponModel.ts holster()), X = Y x Z
        O = sm_bar.S(x0, zc, BAR_T).reshape(3)
        up = FT.unit(np.array([math.sin(a), 0.0, math.cos(a)]))
        out_ = np.array([0.0, 1.0, 0.0])
        xa = FT.unit(np.cross(out_, up))
        slots[name] = {'origin': [round(float(v), 5) for v in O], 'x': [round(float(v), 5) for v in xa],
                       'y': [round(float(v), 5) for v in out_], 'z': [round(float(v), 5) for v in up],
                       'splayRad': round(a, 3), 'slotXM': round(x0, 3)}
    pt.pad('metal')
    bar_mesh(Vm, Fm, Em, sm_bar, bar_ol, holes, BAR_T, tw=twists)
    # each socket's floor: a 0.3 mm gunmetal plate under the bar, a little larger than the socket (one machined part,
    # every socket the same even-depth pocket; no composite showing through)
    for hpoly in holes:
        fl = FT.offset_closed(twist(hpoly, twists, bar_ol), 0.0006)
        pt.pad('metal')
        prism(sm_bar, fl, 0.0, 0.0003, Vm, Fm)
        pt.pad('metal')
    meas['weaponMount'] = slots
    # standoffs: the plate's and the receiver's outer faces behind the suit on the spine (rig.backGear, A40)
    p_bar = sm_bar.S(0.0, zc, BAR_T).reshape(3)
    p_pl = sm_bk.S(0.0, 1.25, T_BK).reshape(3)

    def behind(p):
        hit, _, t = TC.ray(raw, p, np.array([0.0, -1.0, 0.0]), 0.1)
        return round(float(t), 4) if hit is not None else None
    meas['backGearM'] = behind(p_bar)
    meas['backPlateStandoffM'] = {'atSpineZ1.25': behind(p_pl), 'receiverZ': round(zc, 3)}

    # --- Shoulder straps (chest plate tab -> over the shoulder -> back plate tab) --------------------------------------
    hood_V = np.vstack([TC.mesh_world(bpy.data.objects[n], dg)[0] for n in (f'{op}-headwear-hood', f'{op}-headwear-hem')
                        if bpy.data.objects.get(n)])
    hood_V = hood_V[hood_V[:, 2] < 1.5]
    plug_ob = bpy.data.objects.get(f'{op}-head_kit-poly')
    plug_V = TC.mesh_world(plug_ob, dg)[0] if plug_ob else np.zeros((0, 3))
    plug_V = plug_V[(plug_V[:, 2] < 1.41) & (plug_V[:, 0] > 0.03) & (plug_V[:, 1] < -0.04)]
    meas['plugClearM'] = {'chestPlate': round(float(min(np.min(np.linalg.norm(plug_V - q, axis=1))
                                                          for q in np.array(V[:]).reshape(-1, 3)[::3]
                                                          if q[2] > 1.25 and q[0] > 0)), 4)}
    Vg, Fg, Eg = pt('metal')
    Vr, Fr, Er = pt('trim')
    strap_report = {}
    buckles = []
    bframes = []
    strap_rng = {}
    for sgn in (1.0, -1.0):
        side = 'L' if sgn > 0 else 'R'
        x_f, x_t, x_b = 0.09, 0.118, 0.106
        bw, bl = MB.size(STRAP_W)
        # the buckle on the chest plate's tab: its far half bonded to the plate, the strap bonded into the near half
        zb_ = 1.326 - 0.0085 - (bl / 2 + MB.RIM)
        O, Xp, Up, Np = pframe(sm_ch, sgn * x_f, zb_, T_CH)
        pt.pad('metal'), pt.pad('trim')
        bk = MB.build((Vg, Fg, Eg), (Vr, Fr, Er), O, -Up, None, Np, STRAP_W)
        buckles.append(('shoulder' + side, O))
        bframes.append((O, -Up, Np, bk['half'], bk['top']))
        A_f = O + Up * (bl / 4) + Np * 0.0006          # the strap end is bonded inside the near half
        # the run on the plate: from the near half's centre straight along the buckle's axis (the map's z at the
        # buckle's x), on the face, in the face's frame, to the chamfer; the hull path takes over from its end
        z_run = np.arange(zb_ + bl / 4, 1.326 - (LEDGE + CW) + 1e-9, 0.0015)
        run = [pframe(sm_ch, sgn * x_f, zz, T_CH + 0.0006) for zz in z_run]
        R_P = np.array([r_[0] for r_ in run])
        R_N = np.array([r_[3] for r_ in run])
        yB = 1.338
        A_b = sm_bk.S(sgn * x_b, yB - 0.02, T_BK + 0.0002).reshape(3)
        qO, zO = 0.0, 1.24
        pts = [(-A_f[1], A_f[2]), (-A_b[1], A_b[2])]
        for dx in (-0.5 * STRAP_W, 0.0, 0.5 * STRAP_W):
            for zz in np.linspace(zb_ + bl / 2, 1.326, 4):
                p = sm_ch.S(sgn * x_f + dx, zz, T_CH + 0.0006).reshape(3)
                pts.append((-p[1], p[2]))
            p = sm_ch.S(sgn * x_f + dx, 1.326 + 0.002, T_CH - CD + LIP + 0.0002).reshape(3)
            pts.append((-p[1], p[2]))
            for zz in np.linspace(yB - 0.02, yB, 6):
                p = sm_bk.S(sgn * x_b + dx, zz, (T_BK + 0.0002) if zz < yB - 0.006 else (T_BK - CD + LIP + 0.0002)).reshape(3)
                pts.append((-p[1], p[2]))
        ph_f = math.atan2(A_f[2] - zO, -A_f[1] - qO)
        ph_b = math.atan2(A_b[2] - zO, -A_b[1] - qO)

        def x_of(ph):
            return sgn * float(np.interp(ph, [ph_f, math.pi / 2, ph_b], [x_f, x_t, x_b]))
        for ph in np.linspace(ph_f, ph_b, 90):
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
        chain = None
        for stp in (1, -1):
            ch_ = [hull[iF]]
            k = iF
            while k != iB:
                k = (k + stp) % len(hull)
                ch_.append(hull[k])
            ch_ = np.array(ch_)
            if ch_[:, 1].max() > max(A_f[2], A_b[2]) + 0.03:
                chain = ch_
                break
        c3 = np.array([[0.0, -q_, z_] for q_, z_ in chain])
        c3 = FT.smooth_polyline(TC.resample(c3, 0.003), 3)
        c3[0], c3[-1] = [0.0, A_f[1], A_f[2]], [0.0, A_b[1], A_b[2]]
        ph = np.arctan2(c3[:, 2] - zO, -c3[:, 1] - qO)
        c3[:, 0] = [x_of(p_) for p_ in ph]
        # the run on the back plate's tab: from the chamfer straight down the map's z at x_b to the bonded end, on
        # the face, in the face's frame (the back end lies flat on the tab, no corner into it)
        z_bk = np.arange(yB - 0.02, 1.338 - (LEDGE + CW) + 1e-9, 0.0015)[::-1]
        B_P = sm_bk.S(np.full_like(z_bk, sgn * x_b), z_bk, T_BK + 0.0002).reshape(-1, 3)
        B_N = sm_bk.normal(np.full_like(z_bk, sgn * x_b), z_bk).reshape(-1, 3)
        # join: the hull path between its points past the runs' ends, its offsets to them eased out over 15 mm
        k0 = int(np.argmin(np.linalg.norm(c3[:, 1:] - R_P[-1, 1:], axis=1))) + 1
        k1 = int(np.argmin(np.linalg.norm(c3[:, 1:] - B_P[0, 1:], axis=1)))
        hp = c3[k0:k1]
        seg = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(hp, axis=0), axis=1))])
        u = seg + float(np.linalg.norm(hp[0] - R_P[-1]))
        v = (seg[-1] - seg) + float(np.linalg.norm(hp[-1] - B_P[0]))
        tf = FT.unit(R_P[-1] - R_P[-2])
        tb = FT.unit(B_P[0] - B_P[1])
        hp = (hp + (R_P[-1] + tf * u[0] - hp[0])[None, :] * (1.0 - smoothstep(0.0, 0.015, u))[:, None]
              + (B_P[0] + tb * v[-1] - hp[-1])[None, :] * (1.0 - smoothstep(0.0, 0.015, v))[:, None])
        P = np.vstack([R_P, hp, B_P])
        nr, nh = len(R_P), len(hp)
        T3 = TC.tangents(P)
        N3 = np.zeros_like(P)
        for i in range(len(P)):
            q2, z2 = -P[i, 1] - qO, P[i, 2] - zO
            n2 = np.array([0.0, -T3[i, 2], T3[i, 1]])
            if n2 @ np.array([0.0, -q2, z2]) < 0:
                n2 = -n2
            N3[i] = FT.unit(n2 - T3[i] * (n2 @ T3[i]))
        # the frame: the plate face's on the runs (the strap flat on the face, its edges along the buckle's sides),
        # eased into the hull path's over 25 mm
        wf = smoothstep(0.0, 0.025, u)
        wb = smoothstep(0.0, 0.025, v)
        Nh = N3[nr:nr + nh]
        Nh = FT.unit(Nh * (wf * wb)[:, None] + R_N[-1][None, :] * (1 - wf)[:, None] + B_N[0][None, :] * (1 - wb)[:, None])
        N3 = np.vstack([R_N, Nh, B_N])
        N3 = FT.unit(N3 - T3 * np.sum(N3 * T3, 1, keepdims=True))
        B3 = FT.unit(np.cross(N3, T3))
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        L = s[-1]
        Vp, Fp, Ep = pt('strap')
        pt.pad('strap')
        cols = 7
        v0 = len(Vp)
        top = TC.padded_strap(Vp, Fp, P, N3, B3, STRAP_W, STRAP_T, STRAP_T * 0.78, cols=cols)
        strap_rng['shoulder' + side] = (v0, len(Vp))
        sc = np.linspace(-0.5, 0.5, cols)
        Ep.extend(list(np.tile((0.5 - np.abs(sc)) * STRAP_W, len(P))) * 2)
        presser_add(*_strip_sheet(P, N3, B3, STRAP_W))
        b0 = len(shV)
        for i in range(0, len(P), 3):
            for sb_ in (-0.5, 0.5):
                shV.append(P[i] + B3[i] * sb_ * STRAP_W + N3[i] * STRAP_T)
        m = len(range(0, len(P), 3))
        shF.extend([(b0 + 2 * i, b0 + 2 * i + 1, b0 + 2 * i + 3, b0 + 2 * i + 2) for i in range(m - 1)])
        # the left strap: three flat keepers on its inner (neck-side) edge, ready for the radio cable (step 09)
        keep_at = []
        if side == 'L':
            inner = -1.0 if (B3[len(P) // 2] @ X) * sgn > 0 else 1.0
            for sk in (0.07, 0.2, 0.33):
                i = int(np.searchsorted(s, min(sk, L - 0.02)))
                # step 09: a moulded rubber bridge over the radio cable (its legs bonded to the strap's top 4 mm in
                # from the inner edge, an arch KEEP_ARCH high over the cable between them; was a flat block)
                cpos = P[i] + B3[i] * inner * (0.5 * STRAP_W - 0.004) + N3[i] * (STRAP_T * 0.88 + 0.0008)
                pt.pad('trim')
                rng = HC.rbox(Vr, Fr, cpos, [B3[i], T3[i], N3[i]], (0.0075, 0.0035, 0.0008), 0.0006, step=0.0008,
                              deform=_arch)
                Er.extend(TC.rbox_edge(Vr, rng, cpos, [B3[i], T3[i], N3[i]], (0.0075, 0.0035, 0.0008)))
                keep_at.append(round(float(s[i]), 3))
        if side == 'L':
            # the left strap's path for the radio cable (chest_rig.py, step 09): centre line, normal, across, length
            # along it, the inner (neck-side) edge's sign and the keepers' positions along it
            left_path = {'P': P, 'N': N3, 'B': B3, 's': s, 'inner': inner, 'keepS': keep_at}
        allp = np.array(Vp[-len(P) * cols * 2:])
        strap_report[side] = {
            'lengthM': round(float(L), 3), 'keepersAtM': keep_at,
            'hoodClearM': round(float(min(np.min(np.linalg.norm(hood_V - q_, axis=1)) for q_ in allp[::7])), 4),
            'innerEdgeTopX': round(float(abs(x_t) - STRAP_W / 2), 4),
            'plugClearM': (round(float(min(np.min(np.linalg.norm(plug_V - q_, axis=1)) for q_ in allp[::5])), 4)
                           if len(plug_V) else None),
        }
    meas['shoulderStraps'] = strap_report

    # --- Side straps under the arms (front plate side -> back plate side), 22 mm ---------------------------------------
    axis_y = -0.03
    z_lo = 1.163
    zs = np.linspace(z_lo, z_lo + SIDE_W, 13)
    th = np.radians(np.arange(-180.0, 180.0, 1.0))

    def over_plates(z):
        # the plates' outer surface at this height, every 1 mm: the face, the chord a tensioned band takes from the
        # face over the chamfer to the rubber trim, the trim's top out to its outer side (the map point lifted to the
        # row's height: the face tilts, so the map's z is corrected until the point is at z)
        pts2 = []
        for sm, ol, T in ((sm_ch, ch_ol, T_CH), (sm_bk, bk_ol, T_BK)):
            xs_ = np.arange(-0.135, 0.1351, 0.001)
            Q2 = np.stack([xs_, np.full_like(xs_, z)], 1)
            ins = TC.inside(ol, Q2)
            d = TC.dist_to_poly(ol, Q2) * np.where(ins, 1.0, -1.0)
            k = d > -0.0013
            h = np.where(d >= LEDGE + CW, T, np.maximum(h_face(d, T), T - CD + LIP + (CD - LIP) * np.clip(d, 0, None)
                                                         / (LEDGE + CW))) + CLR
            h = np.where(d < 0, T - CD + LIP + CLR, h)
            zq = np.full(k.sum(), z)
            for _ in range(3):
                q = sm.S(xs_[k], zq, h[k]).reshape(-1, 3)
                zq = zq - (q[:, 2] - z)
            pts2 += [(q_[0], q_[1] - axis_y) for q_ in q]
        return np.array(pts2)
    ring = TC.Ring(torso_r, under, axis_y, zs, th, extra=over_plates)
    meas['sideStrapRayMisses'] = ring.misses
    meas['sideStrapOutliers'] = ring.outliers
    side_rep = {}
    zc_s = float(zs.mean())
    for sgn in (1.0, -1.0):
        side = 'L' if sgn > 0 else 'R'
        bw, bl = MB.size(SIDE_W)
        # the map's z whose face point is at the band's mid height (the face under the bust tilts down, so the map's
        # z and the world's differ by several mm there)
        zq = zc_s
        for _ in range(4):
            zq -= float(sm_ch.S(sgn * 0.094, zq, T_CH).reshape(3)[2]) - zc_s
        pf = sm_ch.S(sgn * 0.094, zq, T_CH).reshape(3)
        pb = sm_bk.S(sgn * 0.09, zc_s, T_BK).reshape(3)
        af = math.atan2(pf[1] - axis_y, pf[0])
        ab = math.atan2(pb[1] - axis_y, pb[0])
        if sgn > 0:
            js = np.where((th >= af) & (th <= ab))[0]
        else:
            js = np.concatenate([np.where(th >= ab)[0], np.where(th <= af)[0]])
        G = ring.G[:, js].copy()
        Nn = ring.Nn[:, js].copy()
        # one tensioned band: the rows' hulls eased into each other (no ripple between them), the normals with them;
        # after every pass no point is let inside its row's hull (the hull holds the plates' faces and trims, so the
        # band cannot cut a corner into a plate)
        r0 = np.linalg.norm(G[..., :2] - np.array([0.0, axis_y]), axis=-1)
        a0 = np.unwrap(np.arctan2(G[..., 1] - axis_y, G[..., 0]), axis=1)
        for _ in range(6):
            G[1:-1] = (G[:-2] + 2 * G[1:-1] + G[2:]) / 4
            G[:, 1:-1] = (G[:, :-2] + 2 * G[:, 1:-1] + G[:, 2:]) / 4
            Nn[1:-1] = (Nn[:-2] + 2 * Nn[1:-1] + Nn[2:]) / 4
            for i in range(G.shape[0]):
                dv = G[i, :, :2] - np.array([0.0, axis_y])
                rr = np.linalg.norm(dv, axis=1)
                aa = np.unwrap(np.arctan2(dv[:, 1], dv[:, 0]))
                aa += 2 * math.pi * np.round((a0[i, 0] - aa[0]) / (2 * math.pi))
                o_ = np.argsort(a0[i])
                rmin = np.interp(aa, a0[i][o_], r0[i][o_])
                G[i, :, :2] = np.array([0.0, axis_y]) + dv * (np.maximum(rr, rmin) / rr)[:, None]
        # the band's own surface normal (not the rows' horizontal hull normal): under the bust the plate face is
        # steep, and a slab extruded horizontally would stand off it and miss the buckle's frame
        Ns = np.cross(np.gradient(G, axis=1), np.gradient(G, axis=0))
        Ns *= np.sign(np.sum(Ns * Nn))
        Nn = FT.unit(Ns.reshape(-1, 3)).reshape(Nn.shape)
        Vb, Fb, Eb = pt('strap')
        pt.pad('strap')
        v0 = len(Vb)
        Gout = TC.band_slab(Vb, Fb, G, Nn, SIDE_T)
        strap_rng['side' + side] = (v0, len(Vb))
        Eb.extend([0.004] * (len(Vb) - len(Eb)))
        R_, C_ = G.shape[:2]
        presser_add(G.reshape(-1, 3), [(i * C_ + j, i * C_ + j + 1, (i + 1) * C_ + j + 1, (i + 1) * C_ + j)
                                        for i in range(R_ - 1) for j in range(C_ - 1)])
        sub = Gout[::3, ::3]
        b0 = len(shV)
        shV.extend(list(sub.reshape(-1, 3)))
        r2, c2 = sub.shape[:2]
        shF.extend([(b0 + i * c2 + j, b0 + i * c2 + j + 1, b0 + (i + 1) * c2 + j + 1, b0 + (i + 1) * c2 + j)
                    for i in range(r2 - 1) for j in range(c2 - 1)])
        # the buckle on the chest plate, the band bonded into its near half (the band's front end)
        jf = 0 if sgn > 0 else C_ - 1
        mid = R_ // 2
        e_front = Gout[mid, jf]
        tdir = FT.unit(Gout[mid, jf] - Gout[mid, 1 if sgn > 0 else C_ - 2])         # along the band, toward the front
        O, Xp, Up, Np = pframe(sm_ch, sgn * 0.094, zq, T_CH)
        along = FT.unit(tdir - Np * (tdir @ Np))
        O = O + along * (bl / 4 + 0.001)              # the band's end is bonded inside the near half (past its centre)
        pt.pad('metal'), pt.pad('trim')
        bk = MB.build((Vg, Fg, Eg), (Vr, Fr, Er), O, along, None, Np, SIDE_W)
        buckles.append(('side' + side, O))
        bframes.append((O, along, Np, bk['half'], bk['top']))
        side_rep[side] = {'arcM': round(TC.path_length(Gout[mid]), 3), 'cols': int(C_),
                          'frontEndToBuckleM': round(float(np.linalg.norm(e_front - (O - along * (bl / 4 + 0.001)))), 4)}
    meas['sideStraps'] = side_rep
    meas['buckles'] = {k: [round(float(v), 4) for v in o] for k, o in buckles}

    # --- The suit pressed in under the armour ----------------------------------------------------------------------------
    follow = [suit] + [o for o in (bpy.data.objects.get(f'{op}-suit-{n}') for n in
                                   ('tape', 'zip', 'zip-tape', 'zip-slider', 'zip-garage')) if o is not None]
    PV, PF = _merge(pressers)
    meas['suitPress'] = TC.compress(follow, [TC.bvh(PV, PF)], under, cap=0.0025,
                                    region=(PV.min(axis=0), PV.max(axis=0)))

    # --- Objects ---------------------------------------------------------------------------------------------------------
    mats = {
        'plate': reuse(MAT.composite, 'armour composite'),
        'trim': reuse(MAT.rubber, 'armour edge rubber', colour=(0.021, 0.021, 0.022), rough=0.8),
        'metal': reuse(MAT.anodised, 'hardware gunmetal', colour=(0.05, 0.052, 0.056)),
        'strap': reuse(MAT.laminate, 'armour strap', colour=(0.024, 0.025, 0.025)),
    }
    objs = {}
    for key, (Vk, Fk, Ek) in pt.d.items():
        if not Fk:
            continue
        pt.pad(key)
        Ek = np.asarray(Ek[:len(Vk)], float)
        wear = np.clip(1.0 - Ek / 0.004, 0.0, 1.0) * 0.6
        ob = FT.add_mesh(scene, f'{op}-armour-{key}', Vk, Fk, mats[key], smooth=True, uv=TC.box_uv(Vk, Fk),
                         attrs={'edge': Ek, 'wear': wear})
        _recalc(ob)
        objs[key] = ob
    _cut(scene, objs['plate'], cutV, cutF, 'recess')
    pm = objs['plate']
    meas['strapIntoPlateMm'] = strap_into(
        np.array(pt.d['strap'][0]), strap_rng, bframes,
        [([pm.matrix_world @ v.co for v in pm.data.vertices], [tuple(q.vertices) for q in pm.data.polygons]),
         plate_trims])
    st_ob = objs['strap']
    for k_, v_ in left_path.items():
        st_ob['ls_' + k_] = list(np.asarray(v_, float).ravel())
    for ob in objs.values():
        ob.data.shade_smooth()
        ob.data.set_sharp_from_angle(angle=math.radians(50.0))
    # the mount frames as empties (A40; glTF empties from step 10)
    for name, fr in slots.items():
        em = bpy.data.objects.new(f'weaponMount.{name}', None)
        em.empty_display_type = 'ARROWS'
        em.empty_display_size = 0.05
        M = np.eye(4)
        M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = fr['x'], fr['y'], fr['z'], fr['origin']
        from mathutils import Matrix
        em.matrix_world = Matrix([list(r) for r in M])
        scene.collection.objects.link(em)
    return {
        'shell': (np.array(shV), shF),
        'objects': list(objs.values()),
        'kits': KITS,
        'measurements': meas,
        'report': {'parts': {k: len(v[1]) for k, v in pt.d.items()}, 'buckles': len(buckles)},
    }


def strap_into(SV, ranges, bframes, solids):
    """The deepest a strap's vertex lies inside a plate or a plate's rim trim (mm, per strap; ray parity, so no
    normals are trusted), leaving out the bonded ends inside a buckle (its base footprint, up to its top)."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    trees = [BVHTree.FromPolygons([Vector(tuple(v)) for v in V_], F_) for V_, F_ in solids]
    dirs = [Vector((1.0, 0.013, 0.007)).normalized(), Vector((-0.011, 1.0, 0.017)).normalized()]

    def inside(t, p):
        for d in dirs:
            o, c = Vector(p), 0
            while True:
                hit = t.ray_cast(o, d, 1.0)
                if hit[0] is None:
                    break
                c += 1
                o = hit[0] + d * 1e-6
            if c % 2 == 0:
                return False
        return True

    def bonded(p):
        for O, al, n, hb, top in bframes:
            d = p - O
            ac = np.cross(n, al)
            if abs(d @ al) <= hb[1] + 0.0005 and abs(d @ ac) <= hb[0] + 0.0005 and -0.002 < d @ n < top + 0.001:
                return True
        return False
    out = {}
    for name, (a, b) in ranges.items():
        worst, at = 0.0, None
        for p in SV[a:b]:
            for t in trees:
                hit = t.find_nearest(Vector(tuple(p)), 0.006)
                if hit[0] is None or hit[3] <= worst or bonded(p) or not inside(t, p):
                    continue
                worst, at = hit[3], p
        out[name] = {'mm': round(worst * 1000, 2), 'at': None if at is None else [round(float(v), 3) for v in at]}
    return out


KEEP_ARCH = 0.0036            # a cable keeper's arch over the strap (the 3.2 mm radio cable passes under it)


def _arch(L, h=KEEP_ARCH, w=0.0048):
    """A keeper bridge: the middle 2 w across raised h (a cosine arch), the legs flat."""
    L = np.array(L, float)
    x = np.clip(L[:, 0] / w, -1.0, 1.0)
    L[:, 2] += h * 0.5 * (1.0 + np.cos(math.pi * x))
    return L


def _strip_sheet(P, N, B, w):
    Vp, Fp = [], []
    FT.strip(Vp, Fp, P, N, B, w, 0.0002)
    return np.array(Vp), Fp


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


def _cut(scene, ob, V, F, name):
    """Applies a boolean difference with a cutter mesh (exact solver, self-intersecting cutters allowed)."""
    cut = FT.add_mesh(scene, f'cutter-{name}', V, F, [], smooth=False, uv=TC.box_uv(V, F),
                      attrs={'edge': np.zeros(len(V)), 'wear': np.zeros(len(V))})
    _recalc(cut)
    mod = ob.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.use_self = True
    mod.object = cut
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cut)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4], quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(ob.data)
    bm.free()
