"""Body armour (G3; SPEC 4 `torsoShell`): vest_soft and plate_heavy, fitted per base over the shirt.

Each is rigid plates and straps, one weight vector per part on its declared bones: panels ride chest 0.75 / spine
0.25, the side straps spine 0.6 / chest 0.4, a shoulder strap chest 0.5 / clav 0.5, the plate's shoulder guards their
shoulder bone. Fitted to the base's torso targets (gear/fit.py torso_section: the rig's chest, waist and pelvis girths)
over the shirt (SHIRT) with clearance; G2's `compress` presses the shirt in under them once both are baked (G4).
"""
import math

import numpy as np

from gear.fit import SHIRT
from gear.mesh import frame_from, unit

PANEL = {'chest': 0.75, 'spine': 0.25}
SIDE = {'spine': 0.6, 'chest': 0.4}


def _panel(P, fit, t0, t1, zb, ztop, off, t, nu, nv, mat):
    """A plate panel over the torso: theta t0..t1, from zb up to ztop(theta), inner surface `off` out, t thick."""
    th = np.linspace(t0, t1, nu)
    In, Out = [], []
    for a in th:
        zs = np.linspace(zb, ztop(a), nv)
        In.append([fit.torso_point(a, z, off) for z in zs])
        Out.append([fit.torso_point(a, z, off + t) for z in zs])
    Out = np.array(Out)
    In = np.array(In)
    # round the panel's outer face a little toward its edges (a pillowed carrier)
    P.slab(Out, In, mat)
    return Out


def _strap_over(P, fit, s, x, zf, zb_, off, w, t, mat):
    """A shoulder strap at x (his left s = +1) from the front panel's top over the trapezius to the back panel's."""
    yf = fit.torso_point(0.0, zf, off)[1]
    yb = fit.torso_point(math.pi, zb_, off)[1]
    y = fit.f['y']
    ztop = y['neck'] - 0.018 + off + t
    path = []
    for a in np.linspace(0.0, math.pi, 9):
        k = a / math.pi
        zbase = zf + (zb_ - zf) * k
        yy = (yf + yb) / 2 - (yb - yf) / 2 * math.cos(a)
        zz = zbase + (ztop - zbase) * math.sin(a) ** 0.6
        path.append(np.array([s * x, yy, zz]))
    P.tube(path, w / 2, 4, mat, hint=(1, 0, 0), scale=(t / w * 2.0, 1.0))


def _pouch(P, fit, theta, z, off, size, mat, flap=True):
    """A closed pouch on a panel: a rounded box on the panel's face, with a flap over its top."""
    w, h, d = size
    base = fit.torso_point(theta, z, off)
    n = unit(base - np.array([0.0, (fit.torso_section(z)[0] + fit.torso_section(z)[1]) / 2, z]))
    n[2] = 0.0
    n = unit(n)
    X = unit(np.cross(np.array([0.0, 0.0, 1.0]), n))
    Z = np.array([0.0, 0.0, 1.0])
    c = base + n * (d / 2)
    P.box(c, (X, n, Z), (w / 2, d / 2, h / 2), mat, r=min(0.008, d / 2 * 0.9), seg=1)
    if flap:
        P.box(c + Z * (h / 2 - 0.012) + n * (d / 2 + 0.002), (X, n, Z), (w / 2 + 0.003, 0.003, 0.016), mat)


def _carrier(P, fit, e, t, top_drop, scoop, n_front, n_back):
    tint = e['tint']
    y = fit.f['y']
    off = SHIRT + 0.008
    zb = y['waist'] + 0.02
    zt_f = y['shoulder'] - top_drop
    zt_b = y['shoulder'] - top_drop + 0.035
    P.part(f"{e['id']}.front", PANEL, tint)
    front = _panel(P, fit, -0.98, 0.98, zb, lambda a: zt_f - scoop * math.exp(-(a / 0.42) ** 2), off, t, n_front[0], n_front[1], 'cordura')
    P.part(f"{e['id']}.back", PANEL, tint)
    _panel(P, fit, math.pi - 0.98, math.pi + 0.98, zb, lambda a: zt_b - scoop * 0.4 * math.exp(-((a - math.pi) / 0.42) ** 2),
           off, t, n_back[0], n_back[1], 'cordura')
    # side straps (cummerbund) from the front panel round to the back panel on each side
    P.part(f"{e['id']}.sides", SIDE, tint)
    for s in (1.0, -1.0):
        ths = np.linspace(0.90, math.pi - 0.90, 5) * s
        In = np.array([[fit.torso_point(a, z, off) for z in (zb + 0.01, zb + 0.07, zb + 0.13)] for a in ths])
        Out = np.array([[fit.torso_point(a, z, off + 0.006) for z in (zb + 0.01, zb + 0.07, zb + 0.13)] for a in ths])
        P.slab(Out, In, 'webbing')
    # shoulder straps
    for s, side in ((1.0, 'L'), (-1.0, 'R')):
        P.part(f"{e['id']}.strap{side}", {'chest': 0.5, f'clav{side}': 0.5}, tint)
        x = fit.f['neck']['r'] * 1.55
        a_f = math.asin(min(0.95, x / fit.torso_section(zt_f)[2]))
        zf = zt_f - scoop * math.exp(-(a_f / 0.42) ** 2) - 0.004
        _strap_over(P, fit, s, x, zf, zt_b - 0.004, off + t * 0.3, 0.050, max(0.008, t * 0.6), 'cordura')
    return front, zb, off


def vest_soft(P, fit, e):
    """Slim soft carrier: front and back panels, side straps, shoulder straps, two small front pouches."""
    t = 0.014
    front, zb, off = _carrier(P, fit, e, t, top_drop=0.085, scoop=0.050, n_front=(13, 9), n_back=(13, 9))
    P.part('vest_soft.pouches', PANEL, e['tint'])
    for a in (-0.38, 0.38):
        _pouch(P, fit, a, zb + 0.075, off + t, (0.085, 0.10, 0.030), 'cordura')


def plate_heavy(P, fit, e):
    """Thick plate carrier: front and back plates, side straps, padded shoulder straps, a collar guard round the front
    and sides of the neck, shoulder guards over each deltoid and three front pouches."""
    t = 0.026
    front, zb, off = _carrier(P, fit, e, t, top_drop=0.075, scoop=0.055, n_front=(13, 9), n_back=(13, 9))
    P.part('plate_heavy.pouches', PANEL, e['tint'])
    for a in (-0.48, 0.0, 0.48):
        _pouch(P, fit, a, zb + 0.08, off + t, (0.090, 0.13, 0.040), 'cordura')
    # collar guard: a padded band round the front and sides of the neck, flaring out at the bottom
    P.part('plate_heavy.collar', {'chest': 0.6, 'clavL': 0.2, 'clavR': 0.2}, e['tint'])
    y = fit.f['y']
    nr = fit.f['neck']['r']
    zc = y['neck']
    ths = np.linspace(-2.1, 2.1, 13)
    rows_o, rows_i = [], []
    for a in ths:
        d = np.array([math.sin(a), -math.cos(a), 0.0])
        r_lo, r_hi = nr * 1.75 + 0.03, nr * 1.25 + 0.022
        lo = np.array([0.0, -0.012, zc - 0.035]) + d * r_lo
        mid = np.array([0.0, -0.010, zc + 0.002]) + d * (r_lo + r_hi) / 2
        hi = np.array([0.0, -0.008, zc + 0.040]) + d * r_hi
        rows_o.append([lo, mid, hi])
        rows_i.append([p - d * 0.016 for p in (lo, mid, hi)])
    P.slab(np.array(rows_o), np.array(rows_i), 'cordura')
    # shoulder guards: a padded cap over each deltoid, square to the A-pose upper arm
    for s, side in ((1.0, 'L'), (-1.0, 'R')):
        P.part(f'plate_heavy.shoulder{side}', {f'sh{side}': 1.0}, e['tint'])
        sh = fit.J[f'sh{side}']
        el = fit.J[f'el{side}']
        ua = unit(el - sh)
        up = unit(np.array([s * abs(ua[2]), 0.0, abs(ua[0])]))
        fwd = np.array([0.0, -1.0, 0.0])
        r0 = fit.f['upperArm']['r0']
        C = sh + ua * 0.035
        ra, rb, rc = 0.085, r0 * 1.5 + 0.03, r0 * 1.15 + 0.03
        rows = []
        for u in np.linspace(-math.pi, math.pi, 10, endpoint=False):
            rows.append([C + up * rc * math.cos(v) + (ua * ra * math.cos(u) + fwd * rb * math.sin(u)) * math.sin(v)
                         for v in (1.15, 0.85, 0.55, 0.28)])
        G = np.array(rows)
        P.dome(G, C + up * rc, 0.010, 'cordura')


BUILDERS = {'vest_soft': vest_soft, 'plate_heavy': plate_heavy}
