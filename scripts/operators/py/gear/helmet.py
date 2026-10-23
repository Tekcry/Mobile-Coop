"""Helmets (G3; SPEC 4, BRIEF A6): helmet_std and helmet_heavy, rigid on `head`, over the base's head envelope.

helmet_std: a rounded polymer shell with a low side cut (over the ears, stopping at the brow line in front), a side
rail on each side, a rear pad and a two-point chin strap. It is also the dropped-helmet mesh (A6): its report gives
the drop box (`anchors.drop`) for HelmetDrops. helmet_heavy: the same shell with a thicker brow edge and a raised
clear visor on side pivots. The visor is raised, so it reads with or without a balaclava under it and looks right
when the helmet is knocked off (strict A5: drawn only while the gameplay helmet flag is set).
"""
import math

import numpy as np

from gear.fit import head_grid
from gear.mesh import unit

PAD = 0.006      # liner pads between the envelope and the shell
SHELL = 0.010    # shell thickness


def _rim(fit):
    zs = fit.head_scale[2]
    # front at the brow line, over the ears at the sides, above the nape at the back (a + b cos t + c cos 2t)
    a, b, c = -0.01875, 0.0375, 0.01625
    return lambda t: (a + b * math.cos(t) + c * math.cos(2 * t)) * zs        # noqa: E731


def _shell(P, fit, nu, nv, brow=0.0):
    rim = _rim(fit)
    th = list(np.linspace(-math.pi, math.pi, nu, endpoint=False))
    G, pole = head_grid(fit, th, rim, nv, fit.env_offset + PAD + SHELL, ears=True, top=0.94)
    # a slightly fuller crown and a little flare at the rim
    H = fit.J['head']
    for i in range(nu):
        d = G[i, 0] - np.array([H[0], H[1], G[i, 0, 2]])
        G[i, 0] += unit(d) * (0.004 + brow * max(0.0, math.cos(th[i])) ** 2)
    P.dome(G, pole + np.array([0, 0, 0.004]), SHELL + brow * 0.5, 'shell')
    return G, th, rim


def _common(P, fit, e, nu, nv, brow=0.0):
    tint = e['tint']
    P.part(e['id'], {'head': 1.0}, tint)
    G, th, rim = _shell(P, fit, nu, nv, brow)
    H = fit.J['head']
    zs = fit.head_scale[2]
    # side rails: a flat bar along each side of the shell, above the ear
    P.part(f"{e['id']}.rails", {'head': 1.0}, tint)
    for s in (1.0, -1.0):
        path = [fit.envelope_point(s * t, 0.012 * zs, PAD + SHELL + 0.004) for t in np.linspace(0.75, 2.2, 6)]
        P.tube(path, 0.009, 4, 'polymer', hint=(0, 0, 1), scale=(0.45, 1.0))
    # rear pad: a moulded block low on the back of the shell
    back = fit.envelope_point(math.pi, -0.008 * zs, PAD + SHELL + 0.004)
    P.box(back, ((1, 0, 0), (0, 0, 1), (0, 1, 0)), (0.030, 0.014, 0.006), 'polymer', r=0.005, seg=2)
    # two-point chin strap: from each side of the shell, down in front of the ears, under the chin
    P.part(f"{e['id']}.strap", {'head': 1.0}, 'none')
    zl = rim(math.pi / 2)
    a = fit.envelope_point(math.pi / 2 * 1.05, zl + 0.004, 0.006)
    b = fit.envelope_point(-math.pi / 2 * 1.05, zl + 0.004, 0.006)
    jaw = lambda s: fit.head_point(s * 1.0, -0.085 * zs, 0.005)      # noqa: E731
    chin = fit.head_point(0.0, -0.125 * zs, 0.006)
    path = [a, (a + jaw(1)) / 2 + np.array([0.004, 0, 0]), jaw(1), chin, jaw(-1), (b + jaw(-1)) / 2 + np.array([-0.004, 0, 0]), b]
    P.tube(path, 0.0085, 4, 'webbing', hint=(0, 1, 0), scale=(0.18, 1.0))
    return G, th, rim


def helmet_std(P, fit, e):
    G, th, rim = _common(P, fit, e, 24, 7)
    _drop(P, fit, G)


def helmet_heavy(P, fit, e):
    G, th, rim = _common(P, fit, e, 22, 6, brow=0.004)
    zs = fit.head_scale[2]
    H = fit.J['head']
    tint = e['tint']
    # pivots on the sides, in front of the rails
    P.part('helmet_heavy.pivots', {'head': 1.0}, tint)
    piv = []
    for s in (1.0, -1.0):
        c = fit.envelope_point(s * 1.25, 0.020 * zs, PAD + SHELL + 0.002)
        piv.append(c)
        P.lathe(c, (s, 0, 0), [(0.0, -0.002), (0.014, 0.0), (0.014, 0.006), (0.010, 0.009), (0.0, 0.010)], 8, 'polymer')
    # the raised visor: a curved clear band held up over the shell's front, from pivot to pivot
    P.part('helmet_heavy.visor', {'head': 1.0}, 'none')
    ths = list(np.linspace(-1.25, 1.25, 11))
    rows = []
    for t in ths:
        lo = fit.envelope_point(t, 0.050 * zs, PAD + SHELL + 0.010)
        hi = fit.envelope_point(t, 0.085 * zs, PAD + SHELL + 0.010)
        mid = (lo + hi) / 2 + unit(np.array([lo[0] - H[0], lo[1] - H[1], 0.0])) * 0.004
        rows.append([lo, mid, hi])
    Vg = np.array(rows)
    # pull the ends down to the pivots
    for k, s in ((0, -1.0), (len(ths) - 1, 1.0)):
        c = piv[0] if s > 0 else piv[1]
        Vg[k] = Vg[k] * 0.4 + np.array([c + np.array([s * 0.012, 0, dz]) for dz in (-0.004, 0.006, 0.016)]) * 0.6
    P.shell(Vg, 0.003, 'visor', inward=False)


def _drop(P, fit, G):
    """The dropped-helmet box for HelmetDrops (A6): the shell's extents in the head frame (game axes: w across, h up,
    d front to back), its centre relative to the head joint."""
    H = fit.J['head']
    lo, hi = G.reshape(-1, 3).min(axis=0), G.reshape(-1, 3).max(axis=0)
    hi[2] = max(hi[2], H[2] + fit.crown + fit.env_offset + PAD + SHELL)
    c = (lo + hi) / 2 - H
    P.anchors['drop'] = {
        'w': round(float(hi[0] - lo[0]), 4), 'h': round(float(hi[2] - lo[2]), 4), 'd': round(float(hi[1] - lo[1]), 4),
        'centreFromHeadGame': [round(float(-c[0]), 4), round(float(c[2]), 4), round(float(-c[1]), 4)],
        'note': 'helmet shell box (game frame, m): HelmetDrops scales the drop mesh by these instead of HELMET_FIT',
    }


BUILDERS = {'helmet_std': helmet_std, 'helmet_heavy': helmet_heavy}
