"""Fit targets for the guard gear kit (G3), per base. Pure numpy (no bpy): runs in Blender and in plain Python.

Until G1's base bodies exist (bodies/guard-<b>-body.json), the gear fits the rig the guards are posed by:
`proportions(build, refHeight)` (src/player/proportions.ts) and its bind joints (`operatorJoints`, operatorBody.ts),
copied into FIT below. tests/guardGearFit.test.ts recomputes FIT from the TypeScript and fails on any drift. The bind
pose is MakeHuman's A-pose (build_body.py keeps the game's limb lengths along MakeHuman's limb directions), so the arm
and thigh directions are Wren's measured bind directions (A_POSE). When a body report with `bindJoints` exists it wins.

Frames: FIT is in the game frame (+X right, +Y up, +Z forward, metres); everything the builders get is in Blender's
(+Z up, the figure faces -Y, his left is +X), via common.game_to_blender's mapping (x, y, z) -> (-x, -z, y).

The head (SPEC 7): one cranium per base. HEAD_PROFILE is a generic adult male head (sections from the neck to the
crown), scaled per base to the rig's head width, depth and crown height; the envelope is that surface offset by
`face.envelopeOffset` (15 mm: the thickest hair cap plus clearance). G1h exports the real envelope; refit then.
"""
import json
import math
import os

import numpy as np

# FIT-BEGIN (generated from src/player/proportions.ts + src/operators/operatorBody.ts; checked by tests/guardGearFit.test.ts)
FIT = json.loads(r'''
{
  "average": {"height": 1.77, "build": "average", "head": {"h": 0.2313, "w": 0.1598, "d": 0.2023}, "neck": {"len": 0.0607, "r": 0.0587},
    "y": {"hip": 0.9255, "waist": 1.062, "chest": 1.2744, "shoulder": 1.416, "neck": 1.4969, "knee": 0.5057, "ankle": 0.0759},
    "shoulderWidth": 0.4956, "shoulderHalf": 0.1922, "hipHalf": 0.091, "chest": {"w": 0.3439, "d": 0.2427}, "waist": {"w": 0.3034, "d": 0.2175},
    "pelvis": {"w": 0.354, "d": 0.2023}, "upperArm": {"len": 0.3034, "r0": 0.0506, "r1": 0.0384}, "forearm": {"len": 0.263, "r0": 0.0405, "r1": 0.0283},
    "hand": {"len": 0.1922}, "thigh": {"len": 0.3945, "r0": 0.0829, "r1": 0.0546},
    "joints": {"pelvis": [0, 0.9255, 0], "spine": [0, 1.062, 0], "chest": [0, 1.1935, 0], "neck": [0, 1.4969, 0], "head": [0, 1.6547, 0.01],
      "shL": [-0.1922, 1.416, -0.01], "shR": [0.1922, 1.416, -0.01], "hipR": [0.091, 0.8955, 0]}},
  "lean": {"height": 1.76, "build": "lean", "head": {"h": 0.23, "w": 0.1589, "d": 0.2011}, "neck": {"len": 0.0603, "r": 0.0513},
    "y": {"hip": 0.9202, "waist": 1.056, "chest": 1.2672, "shoulder": 1.408, "neck": 1.4885, "knee": 0.5029, "ankle": 0.0754},
    "shoulderWidth": 0.4682, "shoulderHalf": 0.1854, "hipHalf": 0.0859, "chest": {"w": 0.3146, "d": 0.2221}, "waist": {"w": 0.2715, "d": 0.1946},
    "pelvis": {"w": 0.3168, "d": 0.181}, "upperArm": {"len": 0.3017, "r0": 0.0443, "r1": 0.0336}, "forearm": {"len": 0.2615, "r0": 0.0354, "r1": 0.0248},
    "hand": {"len": 0.1911}, "thigh": {"len": 0.3922, "r0": 0.0726, "r1": 0.0478},
    "joints": {"pelvis": [0, 0.9202, 0], "spine": [0, 1.056, 0], "chest": [0, 1.1867, 0], "neck": [0, 1.4885, 0], "head": [0, 1.6454, 0.01],
      "shL": [-0.1854, 1.408, -0.01], "shR": [0.1854, 1.408, -0.01], "hipR": [0.0859, 0.8902, 0]}},
  "broad": {"height": 1.825, "build": "broad", "head": {"h": 0.2385, "w": 0.1648, "d": 0.2086}, "neck": {"len": 0.0626, "r": 0.0696},
    "y": {"hip": 0.9542, "waist": 1.095, "chest": 1.314, "shoulder": 1.46, "neck": 1.5434, "knee": 0.5214, "ankle": 0.0782},
    "shoulderWidth": 0.5621, "shoulderHalf": 0.2151, "hipHalf": 0.1002, "chest": {"w": 0.4007, "d": 0.2828}, "waist": {"w": 0.3567, "d": 0.2556},
    "pelvis": {"w": 0.4161, "d": 0.2378}, "upperArm": {"len": 0.3129, "r0": 0.06, "r1": 0.0456}, "forearm": {"len": 0.2711, "r0": 0.048, "r1": 0.0336},
    "hand": {"len": 0.1981}, "thigh": {"len": 0.4067, "r0": 0.0983, "r1": 0.0648},
    "joints": {"pelvis": [0, 0.9542, 0], "spine": [0, 1.095, 0], "chest": [0, 1.2306, 0], "neck": [0, 1.5434, 0], "head": [0, 1.7062, 0.01],
      "shL": [-0.2151, 1.46, -0.01], "shR": [0.2151, 1.46, -0.01], "hipR": [0.1002, 0.9242, 0]}}
}
''')
# FIT-END

# MakeHuman A-pose limb directions (game frame, unit), measured from Wren's bind joints (wren-body.json bindJoints):
# upper arm 42.7 deg out, elbow bent 38.8 deg forward, thigh 8.1 deg out. Left side; the right mirrors x.
A_POSE = {
    'upperArmL': (-0.6783, -0.7347, 0.0164),
    'forearmL': (-0.5155, -0.5708, 0.6392),
    'handL': (-0.2899, -0.6884, 0.6647),
    'thighR': (0.1123, -0.9900, 0.0862),
}

# A generic adult male head, the head joint at the origin (game rig: half a head below the crown), x out to the left,
# y back, z up, metres at head width 0.1598 / depth 0.2023 / crown 0.1153 (the `average` base). Per height z: the
# front surface y, the back surface y, the half width. Above z = 0 the cranium is an ellipsoid on the z = 0 section.
HEAD_REF = {'w': 0.1598, 'd': 0.2023, 'crown': 0.1153}
HEAD_PROFILE = {
    'z': [-0.175, -0.13, -0.115, -0.09, -0.06, -0.035, -0.01, 0.0],
    'yf': [-0.050, -0.048, -0.074, -0.088, -0.095, -0.099, -0.100, -0.100],
    'yb': [0.052, 0.054, 0.060, 0.074, 0.088, 0.097, 0.101, 0.101],
    'hw': [0.060, 0.058, 0.048, 0.062, 0.070, 0.075, 0.079, 0.080],
}
EAR = {'z': -0.02, 'y': 0.008, 'out': 0.022, 'h': 0.06}   # ears: centre height, depth, how far they stand out, height
SHIRT = 0.006        # shirt over the skin (G2's uniform), m
JACKET = 0.012       # the officer's jacket over the skin


def g2b(p):
    x, y, z = p
    return np.array([-x, -z, y], float)


def unit(v):
    v = np.asarray(v, float)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


class Fit:
    """One base's fit targets in Blender's frame."""

    def __init__(self, base_id, env_offset=0.015, body=None):
        if base_id not in FIT:
            raise SystemExit(f'gear fit: no targets for base "{base_id}"')
        f = FIT[base_id]
        self.base = base_id
        self.f = f
        self.height = f['height']
        self.env_offset = env_offset
        self.source = 'targets: proportions(build, refHeight) + MakeHuman A-pose directions (no G1 body yet)'
        J = {k: np.array(v, float) for k, v in f['joints'].items()}
        L = f['upperArm']['len'], f['forearm']['len'], f['hand']['len']
        for side, sx in (('L', 1.0), ('R', -1.0)):
            sh = J[f'sh{side}'] if f'sh{side}' in J else J['shL'] * np.array([-1, 1, 1])
            m = np.array([sx, 1.0, 1.0])
            el = sh + np.array(A_POSE['upperArmL']) * m * L[0]
            wr = el + np.array(A_POSE['forearmL']) * m * L[1]
            hand = wr + np.array(A_POSE['handL']) * m * L[2]
            J[f'el{side}'], J[f'wr{side}'], J[f'hand{side}'] = el, wr, hand
        J['knR'] = J['hipR'] + np.array(A_POSE['thighR']) * f['thigh']['len']
        if body and body.get('bindJoints'):
            for k, v in body['bindJoints'].items():
                J[k] = np.array(v, float)
            self.source = 'G1 body report bindJoints'
        self.J = {k: g2b(v) for k, v in J.items()}
        h = f['head']
        crown = self.height - f['joints']['head'][1]
        if body and body.get('bindJoints', {}).get('head'):
            crown = self.height - body['bindJoints']['head'][1]
        self.head_scale = np.array([h['w'] / HEAD_REF['w'], h['d'] / HEAD_REF['d'], crown / HEAD_REF['crown']])
        self.crown = crown

    # --- head ---------------------------------------------------------------------------------------------------
    def head_section(self, z):
        """(yf, yb, hw) of the bare head at height z above the head joint (Blender: y back), base-scaled."""
        sx, sy, sz = self.head_scale
        zr = z / sz
        P = HEAD_PROFILE
        if zr >= 0.0:
            q = math.sqrt(max(0.0, 1.0 - (zr / HEAD_REF['crown']) ** 2))
            yf, yb, hw = P['yf'][-1] * q, P['yb'][-1] * q, P['hw'][-1] * q
        else:
            zc = max(zr, P['z'][0])
            yf, yb, hw = (float(np.interp(zc, P['z'], P[k])) for k in ('yf', 'yb', 'hw'))
        return yf * sy, yb * sy, hw * sx

    def head_point(self, theta, z, off=0.0, ears=False):
        """A point on the head (plus `off` outward in the section plane) at height z above the head joint and angle
        theta round the vertical (0 = straight ahead, -Y; pi/2 = his left, +X), in Blender world coordinates."""
        yf, yb, hw = self.head_section(z)
        cy, dy = (yf + yb) / 2.0, (yb - yf) / 2.0
        s, c = math.sin(theta), math.cos(theta)
        e = 2.4      # superellipse exponent: a little squarer than an ellipse
        r = 1.0 / ((abs(s) / max(hw, 1e-6)) ** e + (abs(c) / max(dy, 1e-6)) ** e) ** (1.0 / e)
        if ears:
            k = max(0.0, 1.0 - ((z / self.head_scale[2] - EAR['z']) / (EAR['h'] / 2)) ** 2)
            side = max(0.0, abs(s) - 0.85) / 0.15
            r += EAR['out'] * self.head_scale[0] * k * side
        H = self.J['head']
        return H + np.array([r * s + 0.0, cy - r * c, z]) + np.array([s, -c, 0.0]) * off

    def envelope_point(self, theta, z, extra=0.0):
        """The SPEC head envelope (head + ears + envelopeOffset) plus `extra`."""
        return self.head_point(theta, z, self.env_offset + extra, ears=True)

    def head_top(self):
        return self.J['head'][2] + self.crown

    # --- torso --------------------------------------------------------------------------------------------------
    def torso_section(self, z):
        """(yf, yb, hw) of the bare torso at world height z (Blender: y back): waist, chest and upper chest from the
        rig's girths, rounded off toward the neck base. The section is centred 1 cm ahead of the joints."""
        f = self.f
        y = f['y']
        zs = [y['hip'] - 0.05, y['hip'], y['waist'], y['chest'], y['shoulder'] - 0.04, y['neck'] - 0.01, y['neck'] + 0.03]
        hw = [f['pelvis']['w'] / 2, f['pelvis']['w'] / 2 * 0.97, f['waist']['w'] / 2, f['chest']['w'] / 2,
              f['chest']['w'] / 2 * 1.02, f['neck']['r'] * 1.9, f['neck']['r'] * 1.05]
        hd = [f['pelvis']['d'] / 2, f['pelvis']['d'] / 2, f['waist']['d'] / 2, f['chest']['d'] / 2,
              f['chest']['d'] / 2 * 0.86, f['neck']['r'] * 1.35, f['neck']['r'] * 1.0]
        w = float(np.interp(z, zs, hw))
        d = float(np.interp(z, zs, hd))
        cy = -0.01
        return cy - d, cy + d, w

    def torso_point(self, theta, z, off=0.0, e=2.6):
        yf, yb, hw = self.torso_section(z)
        cy, dy = (yf + yb) / 2.0, (yb - yf) / 2.0
        s, c = math.sin(theta), math.cos(theta)
        r = 1.0 / ((abs(s) / hw) ** e + (abs(c) / dy) ** e) ** (1.0 / e)
        return np.array([r * s, cy - r * c, z]) + np.array([s, -c, 0.0]) * off

    def report(self):
        return {'base': self.base, 'source': self.source, 'height': self.height, 'headScale': [round(float(x), 4) for x in self.head_scale],
                'envelopeOffset': self.env_offset, 'joints': {k: [round(float(x), 4) for x in v] for k, v in self.J.items()}}


def load_body(out, base):
    """G1's body report for the base, if it was baked into the same out dir (bodies/guard-<b>-body.json)."""
    p = os.path.join(out or '', 'bodies', f'guard-{base}-body.json')
    if out and os.path.isfile(p):
        with open(p, encoding='utf-8') as fh:
            return json.load(fh)
    return None


def head_rows(z0, crown, nv, top=0.97):
    """nv heights from z0 up to top x crown, even along the head's profile arc (linear below the joint, along the
    cranium's quarter ellipse above it)."""
    lo = max(0.0, -z0)
    up_start = math.asin(min(1.0, max(0.0, z0 / crown))) if z0 > 0 else 0.0
    up_end = math.asin(top)
    L = lo + crown * (up_end - up_start)
    out = []
    for s in np.linspace(0.0, L, nv):
        if s < lo:
            out.append(z0 + s)
        else:
            out.append(crown * math.sin(up_start + (s - lo) / crown))
    return out


def head_grid(fit, thetas, z_rim, nv, off, ears=True, top=0.97, z_top=None):
    """A (len(thetas), nv, 3) grid over the head from the rim height z_rim(theta) up to near the crown, offset `off`
    along the surface normals (envelopeOffset is NOT included: pass it in off), and the pole above the crown.
    z_top(theta) optionally ends the rows lower (an open band)."""
    from gear.mesh import grid_normals    # noqa: PLC0415 (pure)
    rows = []
    for t in thetas:
        z0 = z_rim(t)
        if z_top is None:
            zs = head_rows(z0, fit.crown, nv, top)
        else:
            zs = list(np.linspace(z0, z_top(t), nv))
        rows.append([fit.head_point(t, z, 0.0, ears) for z in zs])
    S = np.array(rows, float)
    closed = abs((thetas[-1] - thetas[0]) + (thetas[1] - thetas[0]) - 2 * math.pi) < 1e-6
    N = grid_normals(S, closed)
    c = fit.J['head']
    if float(np.sum((S - c) * N)) < 0:
        N = -N
    yf, yb, _ = fit.head_section(fit.crown * 0.999)
    pole = fit.J['head'] + np.array([0.0, (yf + yb) / 2.0, fit.crown + off])
    return S + N * off, pole
