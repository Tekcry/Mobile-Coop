"""The riot shield (G3; SPEC 4 `held`): its own GLB, rigid on the left forearm (one weight vector: elL 0.5 / wrL 0.5).

Curved polymer, plain face (no text or insignia), a small view port near the top, two inner handles: a padded cuff
round the forearm and a grip bar in the fist. Built in the bind pose of the `broad` base (the enforcer's) along the
A-pose forearm: the long axis runs elbow to hand (the hand end is the top), the face looks out the back of the
forearm. The report's anchors give the grip frame, so the runtime can hold it in any pose.
"""
import math

import numpy as np

from gear.mesh import unit

R_CURVE = 0.60    # the face's curvature radius across (m)
STAND = 0.056     # inner face off the forearm axis (forearm radius + the cuff pad)
T = 0.006         # polymer thickness


def shield_riot(P, fit, e):
    el, wr, hand = fit.J['elL'], fit.J['wrL'], fit.J['handL']
    f = unit(wr - el)
    lat = np.array([1.0, 0.0, 0.0])
    n = unit(lat - f * float(np.dot(f, lat)))
    w = np.cross(n, f)
    Lf = float(np.linalg.norm(wr - el))
    grip_a = Lf + 0.075
    A = [-0.30, -0.18, -0.06, 0.06, 0.18, 0.30, 0.40, 0.48, 0.60]
    B = [-0.275, -0.20, -0.10, 0.0, 0.10, 0.20, 0.275]
    A = [a + (grip_a - 0.30) for a in A]
    port_a = (A[6], A[7])
    port_b = (-0.10, 0.10)

    def at(a, b, h):
        sag = R_CURVE - math.sqrt(R_CURVE ** 2 - b * b)
        return el + f * a + w * b + n * (h - sag)

    P.part('shield_riot', {'elL': 0.5, 'wrL': 0.5}, e['tint'])
    Out = np.array([[at(a, b, STAND + T) for a in A] for b in B])
    In = np.array([[at(a, b, STAND) for a in A] for b in B])
    f0 = len(P.F)
    P.slab(Out, In, 'shield')
    # the view port: the quads inside the window take the clear port material
    V, F, _ = P.arrays()
    for k in range(f0, len(P.F)):
        c = V[list(P.F[k])].mean(axis=0) - el
        a, b = float(np.dot(c, f)), float(np.dot(c, w))
        if port_a[0] < a < port_a[1] and port_b[0] < b < port_b[1] and abs(float(np.dot(c, n)) - STAND - T / 2) < 0.05:
            P.fmat[k] = 'port'
    # handles: a padded cuff round the forearm, a grip bar in the fist (standoffs to the inner face)
    P.part('shield_riot.handles', {'elL': 0.5, 'wrL': 0.5}, 'none')
    cuff_a = Lf * 0.45
    pts = [(-0.060, STAND), (-0.066, 0.0), (-0.046, -0.046), (0.0, -0.062), (0.046, -0.046), (0.066, 0.0), (0.060, STAND)]
    P.tube([el + f * cuff_a + w * b + n * h for b, h in pts], 0.022, 4, 'webbing', hint=tuple(f), scale=(0.2, 1.0))
    grip = [(-0.065, STAND), (-0.065, 0.004), (0.065, 0.004), (0.065, STAND)]
    P.tube([el + f * grip_a + w * b + n * h for b, h in grip], 0.012, 6, 'polymer', hint=tuple(f))
    P.anchors['grip'] = {
        'cuffCentre': [round(float(x), 4) for x in el + f * cuff_a],
        'gripCentre': [round(float(x), 4) for x in el + f * grip_a + n * 0.004],
        'axisAlongForearm': [round(float(x), 4) for x in f],
        'faceNormal': [round(float(x), 4) for x in n],
        'across': [round(float(x), 4) for x in w],
        'frame': 'Blender (+Z up, faces -Y, his left +X), bind pose of the broad base',
        'size': {'tall': round(A[-1] - A[0], 3), 'wide': round(B[-1] - B[0], 3), 'curveRadius': R_CURVE},
        'port': {'along': [round(port_a[0], 3), round(port_a[1], 3)], 'across': list(port_b)},
    }


BUILDERS = {'shield_riot': shield_riot}
