"""Small kit (G3; SPEC 4 `rigid`): radio, pouch_belt, holster_thigh, flashlight_mount. One bone each, plain shapes.

The radio and the torch sit high on the chest just outside where the vest's shoulder straps run (x beyond the strap's
outer edge, above the front panel's top), so they read the same with or without vest_soft. The belt sits on the
trouser waistband below the vest's hem; the holster rides the right thigh (hipR) with a hanger from the belt.
"""
import math

import numpy as np

from gear.fit import SHIRT
from gear.mesh import unit

UP = np.array([0.0, 0.0, 1.0])


def _chest_spot(fit, s, dz):
    """A point on the shirt high on the chest, side s (+1 his left), outside the vest strap, and its outward normal."""
    y = fit.f['y']
    z = y['shoulder'] + dz
    strap_out = fit.f['neck']['r'] * 1.55 + 0.025
    x = strap_out + 0.035
    hw = fit.torso_section(z)[2]
    th = s * math.asin(min(0.96, x / hw))
    p = fit.torso_point(th, z, SHIRT)
    c = np.array([0.0, (fit.torso_section(z)[0] + fit.torso_section(z)[1]) / 2, z])
    n = unit(np.array([p[0] - c[0], p[1] - c[1], 0.0]))
    n = unit(n + np.array([0.0, -0.6, 0.0]))     # face mostly forward
    return p, n


def radio(P, fit, e):
    """Compact radio in an open-top pouch on the left chest, short stub antenna, a knob and a talk button."""
    P.part('radio', {'chest': 1.0}, e['tint'])
    p, n = _chest_spot(fit, 1.0, -0.03)
    X = unit(np.cross(UP, n))
    w, h, d = 0.058, 0.090, 0.030
    pouch_c = p + n * (d / 2 + 0.002) + UP * (-0.012)
    P.box(pouch_c, (X, n, UP), (w / 2 + 0.004, d / 2 + 0.003, h / 2 - 0.01), 'cordura', r=0.006, seg=2)
    body_c = p + n * (d / 2 + 0.002) + UP * 0.006
    P.box(body_c, (X, n, UP), (w / 2, d / 2, h / 2), 'polymer', r=0.007, seg=2)
    top = body_c + UP * (h / 2)
    P.lathe(top + X * 0.014, UP, [(0.0, 0.0), (0.006, 0.0), (0.005, 0.010), (0.003, 0.055), (0.0045, 0.058), (0.0, 0.060)], 6, 'rubber')
    P.lathe(top - X * 0.014, UP, [(0.0, 0.0), (0.007, 0.0), (0.007, 0.010), (0.0, 0.011)], 8, 'polymer')
    P.box(body_c - X * (w / 2 + 0.002) + UP * 0.012, (X, n, UP), (0.003, 0.008, 0.014), 'rubber')


def flashlight_mount(P, fit, e):
    """A clip mount high on the right chest (where the vest's right shoulder strap runs) holding a short torch that
    points forward."""
    P.part('flashlight_mount', {'chest': 1.0}, e['tint'])
    p, n = _chest_spot(fit, -1.0, -0.035)
    X = unit(np.cross(UP, n))
    P.box(p + n * 0.004, (X, n, UP), (0.016, 0.004, 0.028), 'polymer', r=0.004, seg=1)
    clip = p + n * 0.016
    P.box(clip, (X, n, UP), (0.010, 0.010, 0.012), 'polymer')
    fwd = np.array([0.0, -1.0, 0.0])
    c = clip + n * 0.020 - fwd * 0.045
    P.lathe(c, fwd, [(0.0, 0.0), (0.012, 0.0), (0.012, 0.075), (0.016, 0.085), (0.016, 0.110), (0.013, 0.112), (0.0, 0.112)], 8, 'metal')


def pouch_belt(P, fit, e):
    """A plain duty belt on the trouser waistband with a plain buckle and two small closed pouches on the hips."""
    P.part('pouch_belt', {'pelvis': 1.0}, e['tint'])
    y = fit.f['y']
    z = y['waist'] - 0.045
    off = 0.008
    th = np.linspace(-math.pi, math.pi, 24, endpoint=False)
    hb = 0.022
    Out = np.array([[fit.torso_point(a, zz, off + 0.006) for zz in (z - hb, z + hb)] for a in th])
    In = np.array([[fit.torso_point(a, zz, off) for zz in (z - hb, z + hb)] for a in th])
    P.slab(Out, In, 'webbing', close_u=True)
    front = fit.torso_point(0.0, z, off + 0.006)
    n = np.array([0.0, -1.0, 0.0])
    P.box(front + n * 0.004, (np.array([1.0, 0, 0]), n, UP), (0.030, 0.004, 0.026), 'metal', r=0.004, seg=1)
    for s in (1.0, -1.0):
        a = s * 1.15
        p = fit.torso_point(a, z - 0.012, off + 0.006)
        q = unit(np.array([math.sin(a), -math.cos(a), 0.0]))
        X = unit(np.cross(UP, q))
        c = p + q * 0.019
        P.box(c, (X, q, UP), (0.036, 0.017, 0.042), 'cordura', r=0.007, seg=2)
        P.box(c + UP * 0.030 + q * 0.016, (X, q, UP), (0.038, 0.003, 0.016), 'cordura')


def holster_thigh(P, fit, e):
    """Drop-leg holster on the right thigh: the holster shell on the outside of the thigh, two thigh straps and a
    hanger strap up to the belt. The pistol itself is the carry slot's own mesh (weaponModel.holster)."""
    P.part('holster_thigh', {'hipR': 1.0}, e['tint'])
    hip, kn = fit.J['hipR'], fit.J['knR']
    ax = unit(kn - hip)
    L = float(np.linalg.norm(kn - hip))
    r0, r1 = fit.f['thigh']['r0'], fit.f['thigh']['r1']
    rad = lambda k: (r0 + (r1 - r0) * k) * 1.12 + 0.008      # noqa: E731 (thigh over the trousers)
    out = unit(np.array([-1.0, 0.0, 0.0]) - ax * float(np.dot(ax, [-1.0, 0.0, 0.0])))
    fwd = unit(np.cross(out, ax))
    if fwd[1] > 0:
        fwd = -fwd
    for k in (0.33, 0.60):
        c = hip + ax * L * k
        ring = [c + (out * math.cos(a) + fwd * math.sin(a)) * (rad(k) + 0.002) for a in np.linspace(0, 2 * math.pi, 10, endpoint=False)]
        P.tube(ring, 0.014, 4, 'webbing', closed=True, hint=tuple(ax), scale=(0.18, 1.0))
    kc = 0.42
    c = hip + ax * L * kc + out * (rad(kc) + 0.006 + 0.024)
    P.box(c - out * 0.020, (fwd, out, -ax), (0.045, 0.004, 0.12), 'cordura', r=0.01, seg=1)        # leg platform
    P.box(c, (fwd, out, -ax), (0.032, 0.022, 0.10), 'polymer', r=0.010, seg=2)                      # holster shell
    mouth = c - ax * 0.10
    P.box(mouth + out * 0.006, (fwd, out, -ax), (0.036, 0.026, 0.012), 'polymer')                    # mouth band
    belt = fit.torso_point(-1.55, fit.f['y']['waist'] - 0.045, 0.016)
    P.tube([belt, (belt + mouth) / 2 + out * 0.012, mouth - ax * 0.01], 0.016, 4, 'webbing', hint=tuple(fwd), scale=(0.2, 1.0))
    P.anchors['holster'] = {'mouth': [round(float(x), 4) for x in mouth], 'axisDown': [round(float(x), 4) for x in ax],
                            'out': [round(float(x), 4) for x in out], 'frame': 'Blender, bind pose'}


BUILDERS = {'radio': radio, 'flashlight_mount': flashlight_mount, 'pouch_belt': pouch_belt, 'holster_thigh': holster_thigh}
