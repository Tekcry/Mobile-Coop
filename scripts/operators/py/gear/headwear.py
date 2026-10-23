"""Headwear and eyewear (G3; SPEC 4): cap, cap_officer, beanie, balaclava, headset, boonie, glasses_clear,
glasses_dark. Original, plain designs: no text, badges, insignia or brand shapes.

Fit `headEnvelope`: over the base's head envelope (the head plus ears plus envelopeOffset, gear/fit.py), rigid on
`head`. The balaclava is a `membrane` over the bare head and neck (rows on `head`, a blend row, rows on `neck`); the
glasses (`face`) sit on the nose bridge and the ears. Heights are metres above the head joint (half a head below the
crown, about eye level).
"""
import math

import numpy as np

from gear.fit import head_grid
from gear.mesh import frame_from, unit

TAU = 2 * math.pi


def ring(n):
    return list(np.linspace(-math.pi, math.pi, n, endpoint=False))


def _zs(fit):
    return fit.head_scale[2]


def _brim(P, fit, rim_pts, thetas, reach, droop, t, mat):
    """A brim from the rim points outward: reach(theta) m out, droop m down at the tip; t thick."""
    H = fit.J['head']
    rows_o = []
    for p, th in zip(rim_pts, thetas):
        d = unit(np.array([p[0] - H[0], p[1] - H[1], 0.0]))
        r = reach(th)
        rows_o.append([p + d * r * k + np.array([0, 0, -droop * k * k - 0.002]) for k in (0.0, 0.5, 1.0)])
    Po = np.array(rows_o)
    Pi = Po - np.array([0.0, 0.0, t])
    P.slab(Po, Pi, mat)


def cap(P, fit, e):
    """Soft six-panel peaked cap: a crown over the envelope (front band at mid-forehead, back above the nape), a
    small top button, a short curved brim. Seams are in the texture."""
    P.part('cap', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    rim = lambda t: (0.006 + 0.034 * (0.5 + 0.5 * math.cos(t)) - 0.012 * (0.5 - 0.5 * math.cos(t))) * zs   # noqa: E731
    th = ring(18)
    G, pole = head_grid(fit, th, rim, 5, fit.env_offset + 0.003, ears=False, top=0.93)
    G[:, -1] += np.array([0, 0, 0.004])            # a little crown height
    P.dome(G, pole + np.array([0, 0, 0.006]), 0.003, 'twill')
    P.lathe(pole + np.array([0, 0, 0.004]), (0, 0, 1), [(0.0, -0.002), (0.008, -0.001), (0.007, 0.003), (0.0, 0.005)], 6, 'twill')
    fr = [t for t in np.linspace(-1.05, 1.05, 9)]
    rim_pts = [fit.envelope_point(t, rim(t), 0.003) for t in fr]
    _brim(P, fit, rim_pts, fr, lambda t: 0.068 * math.cos(t * 0.95) ** 0.7, 0.012, 0.004, 'twill')


def cap_officer(P, fit, e):
    """Structured peaked cap: a straight band, a stiff crown rising and flaring a little wider than the band to a
    flat rounded top, a short hard visor, a plain cord across the front with a plain button at each end. No badge."""
    P.part('cap_officer', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    H = fit.J['head']
    th = ring(18)
    z0 = lambda t: (0.020 + 0.022 * (0.5 + 0.5 * math.cos(t))) * zs   # noqa: E731
    band_h = 0.040
    bot = np.array([fit.envelope_point(t, z0(t), 0.002) for t in th])
    top = bot + np.array([0, 0, band_h])
    inward = np.array([unit(np.array([p[0] - H[0], p[1] - H[1], 0.0])) * 0.003 for p in bot])[:, None, :]
    Bo = np.stack([bot, top], 1)
    P.slab(Bo, Bo - inward, 'twill', close_u=True)
    # crown: from the band top out 12 % (more in front), up to a flat top
    cen = np.array([H[0], H[1] + 0.006, 0.0])
    rows = []
    for p in top:
        d = np.array([p[0] - cen[0], p[1] - cen[1], 0.0])
        flare = 1.10 + 0.06 * max(0.0, -unit(d)[1])
        lift = 0.012 * max(0.0, -unit(d)[1])
        rows.append([p, cen + d * flare + np.array([0, 0, p[2] + 0.030 + lift]),
                     cen + d * flare * 0.93 + np.array([0, 0, p[2] + 0.042 + lift])])
    G = np.array(rows)
    pole = cen + np.array([0, 0, G[:, -1, 2].mean() + 0.003])
    P.dome(G, pole, 0.003, 'twill')
    # visor: short, hard, sloped down
    fr = [t for t in np.linspace(-1.0, 1.0, 7)]
    rim_pts = [fit.envelope_point(t, z0(t), 0.004) for t in fr]
    P.part('cap_officer.visor', {'head': 1.0}, 'none')
    _brim(P, fit, rim_pts, fr, lambda t: 0.058 * math.cos(t * 0.9) ** 0.8, 0.022, 0.003, 'gloss')
    # plain cord across the front of the band, a plain button at each end
    P.part('cap_officer.cord', {'head': 1.0}, 'none')
    cr = [t for t in np.linspace(-1.15, 1.15, 7)]
    path = [fit.envelope_point(t, z0(t) + band_h * 0.62, 0.006) for t in cr]
    P.tube(path, 0.0025, 4, 'cord')
    for t in (cr[0], cr[-1]):
        c = fit.envelope_point(t, z0(t) + band_h * 0.62, 0.006)
        P.lathe(c, unit(c - np.array([H[0], H[1], c[2]])), [(0.0, -0.001), (0.0045, 0.0), (0.004, 0.0025), (0.0, 0.0035)], 6, 'metal')


def beanie(P, fit, e):
    """Rib-knit watch cap with a rolled cuff above the ears: hides the hair cap, so it sits closer than the envelope."""
    P.part('beanie', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    rim = lambda t: (0.006 + 0.030 * (0.5 + 0.5 * math.cos(t)) - 0.022 * (0.5 - 0.5 * math.cos(t))) * zs   # noqa: E731
    th = ring(16)
    G, pole = head_grid(fit, th, rim, 7, fit.env_offset - 0.006, ears=True, top=0.95)
    # the cuff: the lowest three rows roll out 5 mm
    G2 = G.copy()
    H = fit.J['head']
    for j, k in ((0, 0.003), (1, 0.006), (2, 0.004)):
        d = G[:, j] - np.array([H[0], H[1], 0.0]) * 1.0
        d[:, 2] = 0.0
        G2[:, j] = G[:, j] + unit(d) * k
    G2[:, 1:3] += 0.0
    # a soft gather at the top
    G2[:, -1] += np.array([0, 0, 0.004])
    P.dome(G2, pole + np.array([0, 0, 0.007]), 0.004, 'knit')


def balaclava(P, fit, e):
    """Dark knit balaclava: one wide eye opening, over the head and down the neck (tucked into the shirt collar).
    A membrane 3 mm off the bare head (hair is hidden); rows above the jaw ride `head`, the neck rows ride `neck`,
    one blend row between (each row one weight vector)."""
    zs = _zs(fit)
    ph = P.part('balaclava', {'head': 1.0}, e['tint'])
    pb = P.part('balaclava.throat', {'head': 0.5, 'neck': 0.5}, e['tint'])
    pn = P.part('balaclava.neck', {'neck': 1.0}, e['tint'])
    P.cur = ph
    th = ring(20)
    low = [-0.215, -0.185, -0.155, -0.128, -0.10, -0.075, -0.048, -0.022, 0.018, 0.045]
    up = [fit.crown / zs * math.sin(a) for a in np.linspace(math.asin(0.055 / (fit.crown / zs)), math.asin(0.96), 4)]
    zr = [z * zs for z in low + up]
    S = np.array([[fit.head_point(t, z, 0.0, ears=True) for z in zr] for t in th])
    from gear.mesh import grid_normals
    N = grid_normals(S, True)
    if float(np.sum((S - fit.J['head']) * N)) < 0:
        N = -N
    G = S + N * 0.003
    yf, yb, _ = fit.head_section(fit.crown * 0.999)
    pole = fit.J['head'] + np.array([0.0, (yf + yb) / 2.0, fit.crown + 0.003])
    # eye opening: the front quads between z -0.022 and +0.018, |theta| < 0.66 rad
    eye_j = low.index(-0.022)
    skip = lambda i, j: j == eye_j and abs(th[i] + (th[1] - th[0]) / 2) < 0.66   # noqa: E731
    o = P.sheet(G, 'knit', close_u=True, pole=pole, skip=skip)
    nv = G.shape[1]
    parts = []
    for i in range(len(th)):
        for j in range(nv):
            z = low[j] if j < len(low) else 1.0
            parts.append(pn if z <= -0.155 else pb if z <= -0.128 else ph)
    parts.append(ph)
    P.assign(o, len(parts), parts)


def headset(P, fit, e):
    """Single-band headset: a band over the crown, two closed ear cups over the ears, a short boom mic on the left."""
    P.part('headset', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    H = fit.J['head']
    ear_z = -0.02 * zs
    band = [fit.envelope_point(math.copysign(math.pi / 2, a) if abs(a) > 1e-6 else math.pi / 2,
                               ear_z + 0.04 + (fit.crown - ear_z - 0.04) * math.cos(a), 0.004 + 0.008 * abs(math.sin(a)))
            for a in np.linspace(-math.pi / 2, math.pi / 2, 9)]
    P.tube(band, 0.010, 4, 'polymer', hint=(0, 1, 0), scale=(0.3, 1.0))
    for s in (1.0, -1.0):
        c = fit.head_point(s * math.pi / 2, ear_z, 0.004, ears=True)     # the cups sit on the ears, not the hair
        axis = np.array([s, 0.0, 0.0])
        P.lathe(c, axis, [(0.0, -0.002), (0.040, 0.0), (0.042, 0.012), (0.036, 0.024), (0.022, 0.030), (0.0, 0.031)], 10, 'polymer')
        P.box(c + np.array([s * 0.028, 0, 0.034]), ((0, 1, 0), (1, 0, 0), (0, 0, 1)), (0.010, 0.006, 0.012), 'polymer')
    # boom mic from the left cup round to the corner of the mouth
    c = fit.head_point(math.pi / 2, ear_z, 0.030, ears=True)
    mouth = fit.head_point(0.32, -0.065 * zs, 0.022)
    path = [c + np.array([-0.006, -0.02, -0.006]), c + np.array([-0.012, -0.055, -0.02]),
            (c + mouth) / 2 + np.array([0.012, -0.012, -0.012]), mouth]
    P.tube(path, 0.0035, 4, 'polymer')
    P.lathe(mouth, unit(mouth - path[-2]), [(0.0, -0.004), (0.007, -0.002), (0.007, 0.010), (0.0, 0.012)], 6, 'foam')


def boonie(P, fit, e):
    """Soft wide-brim field hat: a rounded crown with a sewn band, two small side vents, a wide soft brim drooping a
    little all round, a thin chin cord."""
    P.part('boonie', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    rim = lambda t: (0.020 + 0.020 * (0.5 + 0.5 * math.cos(t)) - 0.006 * (0.5 - 0.5 * math.cos(t))) * zs   # noqa: E731
    th = ring(16)
    G, pole = head_grid(fit, th, rim, 4, fit.env_offset + 0.006, ears=True, top=0.90)
    G[:, 1:] += np.array([0, 0, 0.006])
    P.dome(G, pole + np.array([0, 0, 0.004]), 0.003, 'twill')
    # brim all round
    H = fit.J['head']
    Po = []
    for k, t in enumerate(th):
        p = G[k, 0]
        d = unit(np.array([p[0] - H[0], p[1] - H[1], 0.0]))
        Po.append([p + d * r + np.array([0, 0, -dz]) for r, dz in ((0.0, 0.0), (0.035, 0.010), (0.068, 0.026))])
    Po = np.array(Po)
    P.slab(Po, Po - np.array([0, 0, 0.0035]), 'twill', close_u=True)
    # vents: two small grommets each side
    for s in (1.0, -1.0):
        c = fit.envelope_point(s * math.pi / 2, rim(s * math.pi / 2) + 0.035 * zs, 0.009)
        P.lathe(c, (s, 0, 0), [(0.0, -0.001), (0.005, 0.0), (0.005, 0.002), (0.0, 0.0025)], 6, 'metal')
    # chin cord: from the brim's sides down under the chin
    P.part('boonie.cord', {'head': 1.0}, 'none')
    a = G[th.index(min(th, key=lambda t: abs(t - math.pi / 2))), 0]
    b = G[th.index(min(th, key=lambda t: abs(t + math.pi / 2))), 0]
    chin = fit.head_point(0.0, -0.118 * zs, 0.012)
    path = [a, a + (chin - a) * 0.5 + np.array([0.012, 0.0, 0.0]), chin, b + (chin - b) * 0.5 + np.array([-0.012, 0.0, 0.0]), b]
    P.tube(path, 0.0016, 3, 'cord')


def _temple(P, fit, s, front, zs):
    """One glasses arm: from the lens's outer corner back over the ear."""
    ear = fit.head_point(s * math.pi / 2 * 1.08, -0.005 * zs, 0.004, ears=True)
    back = ear + np.array([0, 0.035, -0.022])
    P.tube([front, front + np.array([0, 0.03, 0.0]), ear, back], 0.0016, 4, 'metal', hint=(0, 0, 1))


def glasses_clear(P, fit, e):
    """Thin wire-frame glasses. The atlas has one opaque material (A3), so the clear lenses are left open: frames only."""
    P.part('glasses_clear', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    eye_z = 0.002 * zs
    for s in (1.0, -1.0):
        c = fit.head_point(s * 0.36, eye_z, 0.016)
        X = np.array([1.0, 0.0, 0.0])
        Z = np.array([0.0, 0.0, 1.0])
        loop = [c + X * 0.024 * math.cos(a) + Z * 0.017 * math.sin(a) for a in np.linspace(0, TAU, 10, endpoint=False)]
        P.tube(loop, 0.0013, 4, 'metal', closed=True, hint=(0, 1, 0))
        _temple(P, fit, s, c + np.array([s * 0.024, 0.0, 0.003]), zs)
    l = fit.head_point(0.13, eye_z + 0.004, 0.012)
    r = fit.head_point(-0.13, eye_z + 0.004, 0.012)
    P.tube([l, (l + r) / 2 + np.array([0, -0.004, 0.003]), r], 0.0013, 4, 'metal')


def glasses_dark(P, fit, e):
    """Wrap-around shooting glasses: one curved dark lens across both eyes, plain arms."""
    P.part('glasses_dark', {'head': 1.0}, e['tint'])
    zs = _zs(fit)
    eye_z = 0.002 * zs
    ths = list(np.linspace(-1.05, 1.05, 12))
    rows = []
    for t in ths:
        hgt = 0.019 * (1.0 - 0.35 * (abs(t) / 1.05) ** 2)
        dip = 0.010 * math.exp(-(t / 0.12) ** 2)       # the nose bridge notch
        rows.append([fit.head_point(t, eye_z + z, 0.018 + 0.004 * math.cos(t)) for z in (-hgt + dip, 0.0, hgt)])
    G = np.array(rows)
    P.shell(G, 0.002, 'lens_dark', inward=False)
    for s in (1.0, -1.0):
        front = G[-1 if s > 0 else 0, 2] + np.array([0, 0.002, -0.004])
        _temple(P, fit, s, front, zs)


BUILDERS = {
    'cap': cap, 'cap_officer': cap_officer, 'beanie': beanie, 'balaclava': balaclava, 'headset': headset,
    'boonie': boonie, 'glasses_clear': glasses_clear, 'glasses_dark': glasses_dark,
}
