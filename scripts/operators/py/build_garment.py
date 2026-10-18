"""Pipeline stage 2: a garment sewn from 2D pattern panels onto the operator's body by Blender cloth simulation.

1. Measure the bind-pose body (circumferences, arm girths, landmark heights).
2. Draft the garment's panels and seams from those measurements (garments/<name>.py).
3. Mesh the panels (pattern.py); arrange them round the body (torso panels on the body's contour, sleeves as tubes
   round the arm, everything pushed clear of the skin).
4. Simulate: the flat pattern is the cloth's rest shape (a shape key read through Dynamic Mesh), sewing springs
   pull every seam pair together, scaled gravity settles the fabric on the body (collision, self collision away from
   the seams).
5. Weld the seams and save the simulated garment with its pattern-space UVs for the detail stage.

Writes build/operators/<id>/<id>-<garment>-sim.blend and <id>-<garment>-sim.npz / .json.
"""
import json
import math
import os
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import convex_hull_2d

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'garments'))
import common  # noqa: E402
from pattern import patch_outline, points_in_polygon, rounded_rect  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
    '--frames': {'type': int, 'default': 90},
    '--sim': {'default': '', 'help': 'JSON merged over the garment SIM table (tuning runs)'},
    '--under': {'default': '', 'help': 'comma list of the garments already built under this one (in build order): '
                                       'the blend of the last is opened, and every one of them is a collider'},
})
common.check_version()
common.seed_everything(args.seed)
garment = __import__(args.garment)


def merged(base, over):
    out = dict(base)
    for k, v in over.items():
        out[k] = merged(out.get(k, {}), v) if isinstance(v, dict) else v
    return out


SIM = merged(garment.SIM, json.loads(args.sim) if args.sim else {})

op_id = args.operator
UNDER_IDS = [u for u in args.under.split(',') if u]
# Multi-layer: the last built garment's blend holds the body and every earlier garment (their final objects and the
# welded simulation meshes, '<id>-<garment>'); those welded meshes are colliders under this garment.
src_blend = os.path.join(args.out, f'{op_id}-{UNDER_IDS[-1]}.blend' if UNDER_IDS else f'{op_id}-body.blend')
with open(os.path.join(args.out, f'{op_id}-body.json'), encoding='utf-8') as f:
    body_report = json.load(f)
bpy.ops.wm.open_mainfile(filepath=src_blend)
common.seed_everything(args.seed)
scene = bpy.context.scene
for o in [o for o in bpy.data.objects if o.name.startswith('collider')]:
    bpy.data.objects.remove(o)
body = bpy.data.objects[f'{op_id}-body']
rig = bpy.data.objects[f'{op_id}-rig']
J = {k: np.array(common.game_to_blender(v)) for k, v in body_report['bindJoints'].items()}
H = body_report['height']
s = H / 1.68
# A garment may prepare the body before it is measured (step 08a: the suit relaxes the skin over the bust, so the
# compression suit holds it as one smooth form). The changed body is saved with this garment's blends and every later
# layer is built over it.
BODY_PREPARED = garment.prepare_body(body, J, H) if hasattr(garment, 'prepare_body') else 0

# --- 1. Measure -----------------------------------------------------------------------------------------------------
BV = np.array([v.co[:] for v in body.data.vertices])
gnames = {g.index: g.name for g in body.vertex_groups}
dominant = []
for v in body.data.vertices:
    best = max(v.groups, key=lambda g: g.weight, default=None)
    dominant.append(gnames[best.group] if best else '')
dominant = np.array(dominant)
BV_BODY, DOM_BODY = BV, dominant
# Earlier layers (colliders below). Girths are measured on the body and each gets a fixed allowance per layer worn
# under it (the garment's UNDER_LAYERS): measuring over the simulated layers themselves was tried and over-measured
# by 5-10 cm (the hull of a wrinkled layer), which drafted a loose shirt whose sleeves slid up the arms.
UNDER = []
for u in UNDER_IDS:
    ob = bpy.data.objects.get(f'{op_id}-{u}')
    if ob is None:
        raise SystemExit(f'operators: {u} is not in {src_blend} (build the garments in order)')
    UNDER.append((u, ob, np.array([(ob.matrix_world @ v.co)[:] for v in ob.data.vertices])))
LAYERS = getattr(garment, 'UNDER_LAYERS', {}) if UNDER else {}
TORSO = {'pelvis', 'spine', 'chest', 'neck', 'hipL', 'hipR'}
is_torso = np.array([d in TORSO for d in dominant])


def hull_ring(pts2):
    idx = convex_hull_2d([tuple(p) for p in pts2])
    ring = pts2[idx]
    x, y = ring[:, 0], ring[:, 1]
    if 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) < 0:
        ring = ring[::-1]
    return ring


def ring_at(z, mask, band=0.006):
    sel = BV[mask & (np.abs(BV[:, 2] - z) < band)]
    return hull_ring(sel[:, :2])


def perimeter(ring):
    return float(np.linalg.norm(np.roll(ring, -1, axis=0) - ring, axis=1).sum())


def arm_circ(a, b, t, side_bones):
    """Girth of the limb segment a -> b at fraction t, from the vertices skinned to its bones."""
    mask = np.isin(dominant, side_bones)
    p = a + (b - a) * t
    d = (b - a) / np.linalg.norm(b - a)
    rel = BV[mask] - p
    near = rel[np.abs(rel @ d) < 0.006]
    u = np.cross(d, [0, 0, 1.0])
    if np.linalg.norm(u) < 1e-6:
        u = np.cross(d, [1.0, 0, 0])
    u /= np.linalg.norm(u)
    v = np.cross(d, u)
    return perimeter(hull_ring(np.stack([near @ u, near @ v], axis=1)))


y_hip = J['hipL'][2]
m = {
    'height': H,
    # Tops are cut long enough to tuck in (step 05): the hem drafted 5 cm below the hip joint settles about 8 cm higher
    # (the fabric runs over the chest and back), deep inside the trousers' waist.
    'z_hem': y_hip - 0.05 * s,
    'z_waist': J['spine'][2],
    'z_bust': body_report['bindJoints']['chest'][1] + 0.077 * s,
    'z_ua': J['shL'][2] - 0.085 * s,
    'z_neck': J['neck'][2],
}
for k in ('hem', 'waist', 'bust', 'ua'):
    m[f'circ_{k}'] = perimeter(ring_at(m[f'z_{k}'], is_torso))
neck_ring = ring_at(m['z_neck'] + 0.01, dominant == 'neck')
m['neck_half_w'] = float(np.ptp(neck_ring[:, 0]) / 2)
L = ('shL', 'elL', 'wrL')
m['circ_bicep'] = arm_circ(J['shL'], J['elL'], 0.35, ['shL'])
m['circ_elbow'] = arm_circ(J['shL'], J['elL'], 0.97, ['shL', 'elL'])
m['circ_wrist'] = arm_circ(J['elL'], J['wrL'], 0.95, ['elL', 'wrL'])
# The forearm is widest a little below the elbow (the flexor and extensor bellies), wider than the elbow itself: a
# sleeve drafted from the elbow and wrist alone cannot close round it.
FOREARM_T = (0.15, 0.2, 0.25, 0.3, 0.35, 0.4)
fore_c = [arm_circ(J['elL'], J['wrL'], t, ['elL']) for t in FOREARM_T]
m['circ_forearm'] = max(fore_c)
m['forearm_drop'] = FOREARM_T[int(np.argmax(fore_c))] * float(np.linalg.norm(J['wrL'] - J['elL']))  # below the elbow
upper = float(np.linalg.norm(J['elL'] - J['shL']))
fore = float(np.linalg.norm(J['wrL'] - J['elL']))
CUFF_EXT = 0.02 * s
m['sleeve_under'] = fore + upper - 0.11 * s + CUFF_EXT
m['sleeve_elbow'] = fore + CUFF_EXT
m['collar_h'] = 0.045 * s
# Legs (the leg block, garments/legwear.py): the crotch is the lowest body point on the midline; girth rows of the
# left leg (horizontal slices below the crotch) and of the torso (above it).
# The leg mesh is sparse along the shin (rows 2-3 cm apart), so these girths cut the mesh edges with the plane
# instead of collecting vertices near it.
EDGES = np.array([e.vertices[:] for e in body.data.edges])


def ring_cut(z, mask):
    """Convex hull of where the mesh edges (both ends in mask) cross the plane at height z."""
    e = EDGES[mask[EDGES[:, 0]] & mask[EDGES[:, 1]]]
    za, zb = BV[e[:, 0], 2], BV[e[:, 1], 2]
    hit = (za - z) * (zb - z) <= 0
    e, za, zb = e[hit], za[hit], zb[hit]
    t = np.where(np.abs(zb - za) > 1e-9, (z - za) / np.where(np.abs(zb - za) > 1e-9, zb - za, 1.0), 0.5)
    pts = BV[e[:, 0], :2] + (BV[e[:, 1], :2] - BV[e[:, 0], :2]) * t[:, None]
    return hull_ring(pts)


core = (np.abs(BV_BODY[:, 0]) < 0.02) & (DOM_BODY == 'pelvis') & (BV_BODY[:, 2] < J['hipL'][2])
m['z_crotch'] = float(BV_BODY[core, 2].min()) if core.any() else float(J['hipL'][2] - 0.07 * s)
m['z_knee'] = float(J['knL'][2])
m['z_ankle'] = float(J['anL'][2])
_lx = np.interp(BV[:, 2], [J['anL'][2], J['knL'][2], J['hipL'][2]], [J['anL'][0], J['knL'][0], J['hipL'][0]])
LEG = (np.abs(BV[:, 0] - _lx) < 0.16) & (BV[:, 0] * np.sign(J['hipL'][0]) > 0.003) & (BV[:, 2] < m['z_crotch'] + 0.02)
m['leg_rows'] = [(float(zz), perimeter(ring_cut(zz, LEG))) for zz in np.arange(J['anL'][2] + 0.04, m['z_crotch'] - 0.006, 0.01)]
m['torso_rows'] = [(float(zz), perimeter(ring_cut(zz, is_torso))) for zz in np.arange(m['z_crotch'] + 0.01, J['spine'][2] + 0.06, 0.01)]
# The cloth rests on the collision surface, not the skin: every girth is measured there, so the pattern's ease is ease
# over the body (without this an 8 % sleeve ease could not close round the forearm: the 3 mm layer adds ~2 cm).
# Each layer under this garment adds its own thickness and collision gap (LAYER_T) round the body.
GAP = SIM['collision']['body'] + SIM['collision']['cloth']
LAYER_T = GAP + 0.0011
# The boots under a garment (step 06): their measured top girth plus one layer's allowance, so a hem can be drafted to
# seal over the boot shaft (trousers.cut 'hem_circ').
_boots_json = os.path.join(args.out, f'{op_id}-boots-sim.json')
if 'boots' in UNDER_IDS and os.path.exists(_boots_json):
    with open(_boots_json, encoding='utf-8') as _f:
        _bm = json.load(_f).get('measurements', {})
    if _bm:
        m['boot_top_girth'] = max(v['topGirthM'] for v in _bm.values()) + 2 * math.pi * (GAP + LAYER_T)


def allowance(k, z=None):
    n = LAYERS.get(k, LAYERS.get('default', 0))
    if callable(n):
        n = n(z)
    return 2 * math.pi * (GAP + n * LAYER_T)


for k in [k for k in m if k.startswith('circ_')]:
    m[k] += allowance(k)
for k in ('leg_rows', 'torso_rows'):
    m[k] = [(zz, c + allowance(k, zz)) for zz, c in m[k]]
m['layersUnder'] = {k: (v if not callable(v) else 'by height') for k, v in LAYERS.items()}
# Crotch path (step 05 fix round 1): the outline a centre seam follows from the front waist, under the crotch, to the
# back waist - the convex hull of a thin midline slab of the body in the side view (y, z), so it bridges the buttock
# cleft and the navel like the fabric does. legwear.draft_legs drafts the rise from it (the leg block's centre seams
# were first estimates and hung the crotch 6 cm low). crotch_offset: how far the garment sits off the skin there.


def hull_yz(pts):
    """Convex hull (Andrew's monotone chain), counter-clockwise, of 2D points."""
    pts = sorted(set(map(tuple, np.round(pts, 5))))

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and ((out[-1][0] - out[-2][0]) * (p[1] - out[-2][1])
                                     - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0])) <= 0:
                out.pop()
            out.append(p)
        return out
    lo, up = half(pts), half(pts[::-1])
    return np.array(lo[:-1] + up[:-1])


_slab = (np.abs(BV_BODY[:, 0]) < 0.025) & (BV_BODY[:, 2] >= m['z_crotch'] - 0.003) & (BV_BODY[:, 2] <= J['spine'][2] + 0.1)
m['crotch_hull'] = hull_yz(BV_BODY[_slab][:, [1, 2]]).tolist()
m['crotch_offset'] = allowance('torso_rows', m['z_crotch']) / (2 * math.pi)

pattern, details, info = garment.draft(m)
uv, panel_of, tris, pairs, seam_lines = pattern.mesh()
panel_names = list(pattern.panels)
panel_idx = np.array([panel_names.index(p) for p in panel_of])
PANELS_OF = panel_of
SEAM_OF = {}   # vertex pair -> seam name (diagnostics)
for _sl in seam_lines:
    for _a, _b in zip(_sl['a'][1], _sl['b'][1]):
        SEAM_OF[(int(_a), int(_b))] = _sl['name']
print(f'operators: {op_id} {args.garment}: {len(uv)} verts, {len(tris)} tris, {len(pairs)} seam pairs')

# --- 3. Arrange round the body --------------------------------------------------------------------------------------
# Body contour as a radial profile r(theta, z) round the torso axis, smoothed over height, so the start shape has no
# jumps between slices. theta = 0 at the front (-Y), increasing towards +X (anticlockwise seen from above).
N_TH = 240
TH = np.linspace(0, 2 * math.pi, N_TH, endpoint=False)
prof_cache = {}


def radial_profile(mask_key):
    if mask_key in prof_cache:
        return prof_cache[mask_key]
    mask = is_torso if mask_key == 'torso' else (dominant == 'neck') | is_torso
    zs = np.arange(min(m['z_hem'], m['z_crotch']) - 0.05, m['z_neck'] + 0.12, 0.005)
    R = np.zeros((len(zs), N_TH))
    C = np.zeros((len(zs), 2))
    for k, z in enumerate(zs):
        sel = BV[mask & (np.abs(BV[:, 2] - z) < 0.012)]
        if len(sel) < 8:
            R[k], C[k] = R[k - 1], C[k - 1]
            continue
        ring = hull_ring(sel[:, :2])
        c = np.array([0.0, (ring[:, 1].max() + ring[:, 1].min()) / 2])
        # Radius of the hull polygon along each direction from c.
        closed = np.concatenate([ring, ring[:1]])
        for j, th in enumerate(TH):
            d = np.array([math.sin(th), -math.cos(th)])
            best = 0.0
            for i in range(len(closed) - 1):
                a0, a1 = closed[i] - c, closed[i + 1] - c
                den = d[0] * (a1[1] - a0[1]) - d[1] * (a1[0] - a0[0])
                if abs(den) < 1e-12:
                    continue
                t = (a0[0] * (a1[1] - a0[1]) - a0[1] * (a1[0] - a0[0])) / den
                u = (a0[0] * d[1] - a0[1] * d[0]) / den
                if t > 0 and 0 <= u <= 1:
                    best = max(best, t)
            R[k, j] = best
        C[k] = c
    # Smooth over height (5 cm window) and around (symmetric).
    K = 5
    Rs = np.array([R[max(0, k - K):k + K + 1].mean(axis=0) for k in range(len(zs))])
    Rs = (Rs + Rs[:, (-np.arange(N_TH)) % N_TH]) / 2
    Cs = np.array([C[max(0, k - K):k + K + 1].mean(axis=0) for k in range(len(zs))])
    prof_cache[mask_key] = (zs, Rs, Cs)
    return prof_cache[mask_key]


def contour_point(mask_key, z, arc, offset):
    """Point at arc length `arc` from the front (+ towards +X) on the offset contour at height z."""
    zs, Rs, Cs = radial_profile(mask_key)
    k = int(np.clip(np.searchsorted(zs, z), 1, len(zs) - 1))
    f = float(np.clip((z - zs[k - 1]) / (zs[k] - zs[k - 1]), 0, 1))
    r = Rs[k - 1] * (1 - f) + Rs[k] * f + offset
    c = Cs[k - 1] * (1 - f) + Cs[k] * f
    pts = np.stack([c[0] + r * np.sin(TH), c[1] - r * np.cos(TH)], axis=1)
    closed = np.concatenate([pts, pts[:1]])
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(closed, axis=0), axis=1))])
    t = arc % cum[-1]
    i = int(np.clip(np.searchsorted(cum, t) - 1, 0, len(closed) - 2))
    g = (t - cum[i]) / max(cum[i + 1] - cum[i], 1e-12)
    p = closed[i] + (closed[i + 1] - closed[i]) * g
    return p, cum[-1]


co = np.zeros((len(uv), 3))
radial = np.zeros((len(uv), 3))  # outward direction of each start position (for pushing clear of the skin)
standoff = np.full(len(uv), 0.012)


def ids_of(pn):
    return np.where(panel_idx == panel_names.index(pn))[0] if pn in panel_names else np.zeros(0, dtype=np.int64)


for pn in [p for p in ('front', 'back') if p in panel_names]:
    sel = ids_of(pn)
    for i in sel:
        x, y = uv[i]
        z = min(m['z_hem'] + y, m['z_neck'] + 0.01)
        perim = contour_point('torso', z, 0.0, 0.015)[1]
        start = 0.0 if pn == 'front' else perim / 2  # the back panel starts at the back centre, +x towards -X
        p, _ = contour_point('torso', z, start + x, 0.015)
        co[i] = (p[0], p[1], z)
        c0 = radial_profile('torso')[2][int(np.clip(np.searchsorted(radial_profile('torso')[0], z), 0, len(radial_profile('torso')[0]) - 1))]
        radial[i] = (p[0] - c0[0], p[1] - c0[1], 0.0)

# Collar: round the neck, centre front at x = 0, towards +X first; its length spread over the neck contour.
sel = ids_of('collar')
for i in sel:
    x, y = uv[i]
    # The collar's bottom follows the neckline: low at the centre front, high at the back.
    z = m['z_neck'] - 0.015 * math.cos(2 * math.pi * x / info['collar_len']) + 0.005 + y
    perim = contour_point('neck', z, 0.0, 0.02)[1]
    p, _ = contour_point('neck', z, x * perim / info['collar_len'], 0.02)
    co[i] = (p[0], p[1], z)
    radial[i] = (p[0], p[1] - J['neck'][1], 0.0)


# Underarm gussets: a small diamond in the armpit, gT towards the arm, gF towards the front.
for side, sgn in [(sd, g) for sd, g in (('L', 1.0), ('R', -1.0)) if f'gusset{sd}' in panel_names]:
    sel = ids_of(f'gusset{side}')
    perim = contour_point('torso', m['z_ua'], 0.0, 0.015)[1]
    p, _ = contour_point('torso', m['z_ua'], perim * (0.25 if sgn > 0 else 0.75), 0.015)
    c3 = np.array([p[0], p[1], m['z_ua']])
    e_y = np.array([sgn * 0.94, 0.0, 0.34])
    e_x = np.array([0.0, 1.0, 0.0]) * (1 if sgn > 0 else -1)
    for i in sel:
        co[i] = c3 + uv[i, 0] * e_x + uv[i, 1] * e_y
        radial[i] = (sgn, 0.0, 0.0)


def smooth_path(points, n=200):
    pts = np.array(points)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, cum[-1], n)
    P = np.stack([np.interp(t, cum, pts[:, k]) for k in range(3)], axis=1)
    for _ in range(40):  # relax the corners so the frame turns smoothly at the elbow and shoulder
        P[1:-1] = P[1:-1] * 0.5 + (P[:-2] + P[2:]) * 0.25
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    return P, np.concatenate([[0], np.cumsum(seg)])


for side in [sd for sd in ('L', 'R') if f'sleeve{sd}' in panel_names]:
    pn = f'sleeve{side}'
    sel = ids_of(pn)
    sh, el, wr = J[f'sh{side}'], J[f'el{side}'], J[f'wr{side}']
    cuff = wr + (wr - el) / np.linalg.norm(wr - el) * CUFF_EXT
    sgn = 1.0 if sh[0] > 0 else -1.0
    neck_pt = np.array([sgn * (m['neck_half_w'] + 0.015), J['neck'][1], m['z_neck'] + 0.01])
    P, cum = smooth_path([cuff, wr, el, sh, neck_pt])
    ys = uv[sel, 1]
    ytop = ys.max()
    # Width of the pattern at each height (both sides of the outline), for the tube radius.
    bins = np.linspace(0, ytop, 60)
    widths = []
    for b0 in bins:
        near = uv[sel][np.abs(ys - b0) < ytop / 60 + 0.004]
        widths.append(np.ptp(near[:, 0]) if len(near) > 1 else 0.05)
    widths = np.maximum(np.array(widths), 0.04)
    for i in sel:
        x, y = uv[i]
        t = y / ytop * cum[-1]
        k = min(int(np.searchsorted(cum, t)), len(P) - 1)
        k0 = max(k - 1, 0)
        T = P[min(k + 1, len(P) - 1)] - P[k0]
        T /= np.linalg.norm(T)
        U = np.array([0, 0, 1.0]) - T[2] * T
        U /= np.linalg.norm(U)
        S = np.cross(T, U)
        w = np.interp(y, bins, widths)
        r = w / (2 * math.pi) + 0.012
        th = 2 * math.pi * x / w
        co[i] = P[k] + r * (math.cos(th) * U + math.sin(th) * S)
        radial[i] = math.cos(th) * U + math.sin(th) * S

for pn in ('sleeveL', 'sleeveR'):
    standoff[ids_of(pn)] = 0.02
standoff[ids_of('collar')] = 0.018


def leg_path(side):
    """The leg's axis, ankle to above the hip, relaxed at the knee."""
    hip, kn, an = J[f'hip{side}'], J[f'kn{side}'], J[f'an{side}']
    top = hip + (hip - kn) / np.linalg.norm(hip - kn) * 0.12
    bot = an + (an - kn) / np.linalg.norm(an - kn) * 0.06
    return smooth_path([bot, an, kn, hip, top])


def arrange_legs(A, geo):
    """Leg block (garments/legwear.py): below the crotch every leg panel wraps half its leg as a tube round the leg
    axis (front from the inseam over the shin to the outseam, back the other way round); above it the panels lie on
    the torso contour (front centre at arc 0, back centre at half the perimeter); the gusset lies flat under the
    crotch, the waistband round the top like the collar."""
    z_hem, z_c = A['z_hem'], A['z_crotch']
    xs, xi = geo['x_side'], geo['x_inner']
    paths = {sd: leg_path(sd) for sd in ('L', 'R')}
    down = np.array([0.0, -1.0, 0.0])
    for pn, (sd, part, plain) in A['legs'].items():
        P_, _ = paths[sd]
        lat0 = np.array([1.0 if J[f'hip{sd}'][0] > 0 else -1.0, 0.0, 0.0])
        for i in ids_of(pn):
            x, y = uv[i]
            yy = max(float(y), 0.0)
            z = z_hem + y
            xc = x if plain else -x
            d = xc - float(xi(part, yy))
            w = {q: float(xs(q, yy) - xi(q, yy)) for q in ('front', 'back')}
            if z < z_c:
                c = w['front'] + w['back']
                fs = w['front'] / c
                phi = -math.pi * fs + (2 * math.pi * d / c if part == 'front' else -2 * math.pi * d / c)
                k = int(np.clip(np.searchsorted(P_[:, 2], z), 1, len(P_) - 1))
                f = float(np.clip((z - P_[k - 1, 2]) / max(P_[k, 2] - P_[k - 1, 2], 1e-9), 0, 1))
                ctr = P_[k - 1] * (1 - f) + P_[k] * f
                T = P_[k] - P_[k - 1]
                T /= np.linalg.norm(T)
                F = down - down.dot(T) * T
                F /= np.linalg.norm(F)
                Lt = lat0 - lat0.dot(T) * T - lat0.dot(F) * F
                Lt /= np.linalg.norm(Lt)
                rdir = math.cos(phi) * F + math.sin(phi) * Lt
                p3 = ctr + (c / (2 * math.pi) + A['offset']) * rdir
                if p3[0] * lat0[0] < 0.004:   # the inner thigh never crosses the midline
                    p3[0] = 0.004 * lat0[0]
                co[i] = p3
                radial[i] = rdir
            else:
                tot = 2 * (w['front'] + w['back'])
                perim = contour_point('torso', z, 0.0, A['offset'])[1]
                a = d / tot * perim
                arc = {('L', 'front'): a, ('R', 'front'): -a, ('L', 'back'): perim / 2 - a,
                       ('R', 'back'): perim / 2 + a}[(sd, part)]
                p, _ = contour_point('torso', z, arc, A['offset'])
                co[i] = (p[0], p[1], z)
                zs_, _, Cs_ = radial_profile('torso')
                c0 = Cs_[int(np.clip(np.searchsorted(zs_, z), 0, len(zs_) - 1))]
                radial[i] = (p[0] - c0[0], p[1] - c0[1], 0.0)
            standoff[i] = A['standoff']
    zs_, _, Cs_ = radial_profile('torso')
    cy = float(Cs_[int(np.clip(np.searchsorted(zs_, z_c), 0, len(zs_) - 1))][1])
    for i in ids_of(A['gusset']):
        x, y = uv[i]
        co[i] = (x, cy - y, A['gusset_z'])   # seen from below: +x the wearer's left (+X), +y the front (-Y)
        radial[i] = (0.0, 0.0, -1.0)
        standoff[i] = A['standoff']
    if A.get('band'):
        for i in ids_of(A['band']):
            x, y = uv[i]
            z = A['z_top'] + y
            perim = contour_point('torso', z, 0.0, A['offset'] + 0.002)[1]
            p, _ = contour_point('torso', z, x * perim / A['band_len'], A['offset'] + 0.002)
            co[i] = (p[0], p[1], z)
            radial[i] = (p[0], p[1] - cy, 0.0)
            standoff[i] = A['standoff']


if info.get('legs'):
    arrange_legs(info['legs'], info['leg_geometry'])

# Orientation check: every panel's faces must point away from the body (the pattern is seen from outside).
_ta = np.array(tris)
_fn = np.cross(co[_ta[:, 1]] - co[_ta[:, 0]], co[_ta[:, 2]] - co[_ta[:, 0]])
_out = np.einsum('ij,ij->i', _fn, radial[_ta].mean(axis=1)) > 0
for pi_, pn in enumerate(panel_names):
    fr = float(_out[panel_idx[_ta[:, 0]] == pi_].mean())
    print(f'operators: arrange {pn}: {fr * 100:.0f} % of faces outward', flush=True)
    if fr < 0.6:
        raise SystemExit(f'operators: panel {pn} is arranged inside out ({fr * 100:.0f} % outward)')

# Push every vertex clear of the skin and of the layers under this garment (one surface for both).
# A layer's folds turn some of its faces inward; push-out along such a face would pull the new cloth through the
# layer. Every layer face is wound to face away from the skin first (the colliders use the same faces).
_bv = [tuple(v.co) for v in body.data.vertices]
_bp = [tuple(p.vertices) for p in body.data.polygons]
_skin = BVHTree.FromPolygons(_bv, _bp)
LAYER_FACES = {}
for _u, _ob, _V in UNDER:
    _o = len(_bv)
    _bv += [tuple(v) for v in _V]
    faces, flipped = [], 0
    for p in _ob.data.polygons:
        loc, nrm_, _, _ = _skin.find_nearest(p.center)
        f = tuple(p.vertices)
        if loc is not None and p.normal.dot(p.center - loc) < 0 and p.normal.dot(nrm_) < 0:
            f = f[::-1]
            flipped += 1
        faces.append(f)
    LAYER_FACES[_u] = faces
    print(f'operators: layer {_u}: {len(faces)} faces, {flipped} turned to face out', flush=True)
    _bp += [tuple(i + _o for i in f) for f in faces]
bvh = BVHTree.FromPolygons(_bv, _bp)


def push_clear():
    """Snap any vertex closer than its standoff to the skin or an earlier layer out to the standoff (nearest point)."""

    count = 0
    for i in range(len(co)):
        loc, nrm_, _, _ = bvh.find_nearest(Vector(co[i]))
        if loc is None:
            continue
        if (Vector(co[i]) - loc).dot(nrm_) < standoff[i]:
            co[i] = np.array(loc + nrm_ * standoff[i])
            count += 1
    return count


# Snap clear, then relax the start shape (neighbours in the pattern stay neighbours in 3D) and snap again. Without
# the relaxation, armpit vertices land on different surfaces (arm, chest) and the simulation tears them apart.
tri_arr = np.array(tris)
nbr_sum = np.zeros_like(co)
deg = np.zeros(len(co))
for a_, b_ in ((0, 1), (1, 2), (2, 0)):
    np.add.at(deg, tri_arr[:, a_], 1)
    np.add.at(deg, tri_arr[:, b_], 1)
pushed = push_clear()
# Pinned panels (SIM 'pin', below) keep their arranged shape: the relaxation would shrink a band's ring away from its
# closing seam (a 32 mm gap at the centre front) and collapse its height (3 cm to 5 mm), and the pin holds it there.
PIN = SIM.get('pin') or {}
pin_ids = np.concatenate([ids_of(pn) for pn in PIN.get('panels', [])]) if PIN.get('panels') else np.zeros(0, int)
co_pin = co[pin_ids].copy()
for it in range(12):
    nbr_sum[:] = 0
    for a_, b_ in ((0, 1), (1, 2), (2, 0)):
        np.add.at(nbr_sum, tri_arr[:, a_], co[tri_arr[:, b_]])
        np.add.at(nbr_sum, tri_arr[:, b_], co[tri_arr[:, a_]])
    co = co * 0.5 + 0.5 * nbr_sum / np.maximum(deg, 1)[:, None]
    co[pin_ids] = co_pin
    pushed = push_clear()

# --- 4. Cloth simulation --------------------------------------------------------------------------------------------
me = bpy.data.meshes.new(f'{op_id}-{args.garment}')
loose = [list(p) for p in pairs]
me.from_pydata(co.tolist(), loose, tris)
me.validate()
obj = bpy.data.objects.new(f'{op_id}-{args.garment}', me)
scene.collection.objects.link(obj)
# Rest shape: the flat pattern (lengths and zero curvature come from the cut fabric, not the arrangement).
obj.shape_key_add(name='arranged')
flat = obj.shape_key_add(name='pattern')
flat.value = 0.0  # Blender 5.2 adds keys at 1.0; the start shape must stay the arranged one
for i, (x, y) in enumerate(uv):
    flat.data[i].co = (x, y, 0.0)
# Pinned panels (SIM 'pin', step 05 fix round 1): a waistband is held on its arranged ring (its drafted height round
# the body and the layers) while the legs are sewn to it, then held softly (or released) in the settle. Without it the
# band slid 6-7 cm down: the layers under it are not colliders in the simulation (see LAYER_COLLIDERS), so the band,
# drafted over them, rode on the bare skin with a layer allowance of slack, and nothing in the cloth model grips.
# A pinned vertex follows the base mesh, which from frame 2 is the 'pattern' key: the pinned panel's key is its
# arranged shape (it is not sewn to itself, so no spring spans the flat and the arranged layout).
for i in pin_ids:
    flat.data[int(i)].co = tuple(co[int(i)])
vg_pin = obj.vertex_groups.new(name='pin') if len(pin_ids) else None
uvl = me.uv_layers.new(name='pattern')
for loop in me.loops:
    uvl.data[loop.index].uv = uv[loop.vertex_index]
pid = me.attributes.new('panel', 'INT', 'FACE')
for poly in me.polygons:
    pid.data[poly.index].value = int(panel_idx[poly.vertices[0]])

MAT = {name: p.material for name, p in pattern.panels.items()}
# Per-vertex stiffness: the panel's material (or the panel's own entry), raised inside sewn-on patches. Blender maps
# a vertex group weight w to min + (max - min) * w, so each property gets its own group spanning its range.
PROPS = ('tension', 'shear', 'bending')  # compression follows tension (Blender uses one group for both)
stiff = {p: np.zeros(len(uv)) for p in PROPS}
for pi, name in enumerate(panel_names):
    ids = panel_idx == pi
    spec = SIM['panels'].get(name, SIM['materials'][MAT[name]])
    for p in PROPS:
        stiff[p][ids] = spec[p]
patch_verts = 0
for spec in details['patches']:
    over = SIM['patches'].get(spec['kind'])
    if not over:
        continue
    outline = patch_outline(spec)
    ids = np.where(panel_idx == panel_names.index(spec['panel']))[0]
    inside = ids[points_in_polygon(uv[ids], outline)]
    patch_verts += len(inside)
    for p, v in over.items():
        stiff[p][inside] = np.maximum(stiff[p][inside], v)
# Seamed-in inserts (details 'inserts', e.g. the trousers' stretch-knit panel behind the knee): the region inside the
# insert's seam takes its own material's stiffness.
for spec in details.get('inserts') or []:
    ids = np.where(panel_idx == panel_names.index(spec['panel']))[0]
    inside = ids[points_in_polygon(uv[ids], np.asarray(spec['outline'], dtype=np.float64))]
    for p, v in SIM['materials'][spec['material']].items():
        stiff[p][inside] = v
RANGE = {p: (float(stiff[p].min()), float(stiff[p].max())) for p in PROPS}
for p in PROPS:
    lo, hi = RANGE[p]
    vg = obj.vertex_groups.new(name=f'stiff_{p}')
    w = (stiff[p] - lo) / max(hi - lo, 1e-9)
    for value in np.unique(np.round(w, 4)):
        vg.add(np.where(np.round(w, 4) == value)[0].tolist(), float(value), 'REPLACE')

# Seam vertices and their neighbours stay out of self collision: the two sides of a seam lie on each other, and self
# collision would hold them apart (the seam gap grew from 9 to 12 mm in the settle phase before this).
near_seam = np.zeros(len(uv), bool)
near_seam[[i for pr in pairs for i in pr]] = True
for _ in range(int(SIM.get('seam_self_rings', 2))):     # step 08a fix round 2: the suit keeps 4 rings out
    grow = near_seam.copy()
    for a_, b_ in ((0, 1), (1, 2), (2, 0)):
        grow[tri_arr[near_seam[tri_arr[:, a_]], b_]] = True
        grow[tri_arr[near_seam[tri_arr[:, b_]], a_]] = True
    near_seam = grow
vg_self = obj.vertex_groups.new(name='self_collision')
vg_self.add(np.where(~near_seam)[0].tolist(), 1.0, 'REPLACE')

coll_src = body.copy()
coll_src.data = body.data.copy()
coll_src.modifiers.clear()
coll_src.parent = None
coll_src.matrix_world = body.matrix_world
coll_src.name = 'collider'
scene.collection.objects.link(coll_src)
cm = coll_src.modifiers.new('collision', 'COLLISION')
coll_src.collision.thickness_outer = SIM['collision']['body']
coll_src.collision.cloth_friction = SIM['friction']
body.hide_render = True
# The earlier layers as cloth colliders (their welded simulation surfaces, every face turned outward). Off by default
# (SIM 'layer_collision'): Blender's cloth against a thin cloth collider tore the shirt in test runs - with the layers
# colliding while sewing, the seams could not meet across the armpits (seam gaps 7-15 cm); colliding only in the settle
# phase, the push-out stretched the sewn seams to 37 mm. The layers are resolved after the simulation instead
# (layer_push below): the new garment is drafted over them (UNDER_LAYERS) and pushed clear of them, then relaxed.
LAYER_COLLIDERS = []
for u, ob, _V in UNDER:
    _me = bpy.data.meshes.new(f'collider-{u}')
    _me.from_pydata([tuple(v) for v in _V], [], LAYER_FACES[u])
    cu = bpy.data.objects.new(f'collider-{u}', _me)
    scene.collection.objects.link(cu)
    cu.hide_viewport = cu.hide_render = False
    cu.modifiers.new('collision', 'COLLISION')
    cu.collision.thickness_outer = SIM['collision']['body']
    cu.collision.cloth_friction = SIM.get('layer_friction', SIM['friction'])   # fabric on fabric
    # A layer is a thin sheet whose folds turn some faces inward: two-sided collision (no normal culling) keeps the
    # new cloth on the side it starts on, outside.
    cu.collision.use_culling = SIM.get('layer_culling', True)
    LAYER_COLLIDERS.append(cu)
    cu.hide_render = True

def add_cloth(self_collision, frames):
    cloth = obj.modifiers.new('cloth', 'CLOTH')
    cs = cloth.settings
    cs.quality = SIM['quality']
    cs.mass = SIM['mass']
    cs.effector_weights.gravity = SIM['gravity']
    cs.air_damping = SIM['air_damping']
    cs.tension_damping = cs.compression_damping = cs.shear_damping = SIM['spring_damping']
    cs.tension_stiffness, cs.tension_stiffness_max = RANGE['tension']
    cs.compression_stiffness, cs.compression_stiffness_max = RANGE['tension']
    cs.vertex_group_structural_stiffness = 'stiff_tension'
    cs.shear_stiffness, cs.shear_stiffness_max = RANGE['shear']
    cs.vertex_group_shear_stiffness = 'stiff_shear'
    cs.bending_stiffness, cs.bending_stiffness_max = RANGE['bending']
    cs.vertex_group_bending = 'stiff_bending'
    cs.use_sewing_springs = True
    cs.sewing_force_max = SIM['sewing_force']
    # The flat pattern is the rest shape through Dynamic Mesh: Blender 5.2 ignores the cloth's rest shape key (tested:
    # a sheet with a 0.6x rest key never shrinks), but with Dynamic Mesh the spring rest lengths and bend angles follow
    # the base mesh every frame while the cloth keeps its own positions. The 'pattern' key is animated from 0 (the
    # arranged start) to 1 (the flat cut) at frame 2, so the base mesh, and with it the rest shape, is the pattern.
    cs.use_dynamic_mesh = True
    if vg_pin is not None:
        cs.vertex_group_mass = 'pin'
        cs.pin_stiffness = PIN.get('stiffness', 1.0)
    cs.use_internal_springs = False
    cc = cloth.collision_settings
    cc.use_collision = True
    cc.distance_min = SIM['collision']['cloth']
    cc.collision_quality = SIM['collision_quality']
    cc.use_self_collision = self_collision
    cc.self_distance_min = 0.003
    cc.vertex_group_self_collisions = 'self_collision'
    cc.self_friction = 5.0
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = frames
    scene.frame_start, scene.frame_end = 1, frames
    return cloth


def evaluated_positions():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    em = ev.to_mesh()
    out = np.array([v.co[:] for v in em.vertices])
    ev.to_mesh_clear()
    return out


# Phase A: sew without self collision so seam edges can pass over each other to meet. Phase B: settle with self
# collision from the sewn state (the rest shape stays the flat pattern).
PHASES = (('sew', False, args.frames), ('settle', True, max(30, args.frames // 3)))
t0 = time.time()
gaps = []


def rest_is_pattern_from_frame_2():
    """Key the 'pattern' shape: 0 at frame 1 (the cloth starts from the arranged shape), 1 from frame 2 (the rest shape
    is the flat cut). A gradual ramp does not work: the key blends positions, not edge lengths, and where the flat
    layout faces the other way (the back panel) a blended edge passes through zero length and the cloth collapses."""
    obj.data.shape_keys.animation_data_clear()
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'CONSTANT'
    flat.value = 0.0
    flat.keyframe_insert('value', frame=1)
    flat.value = 1.0
    flat.keyframe_insert('value', frame=2)


for phase, self_coll, frames in PHASES:
    for cu in LAYER_COLLIDERS:
        cu.collision.use = bool(SIM.get('layer_collision')) and phase != 'sew'
    rest_is_pattern_from_frame_2()
    scene.frame_set(1)
    if vg_pin is not None:
        vg_pin.add(pin_ids.tolist(), float(PIN.get(phase, 0.0)), 'REPLACE')
    cloth = add_cloth(self_coll, frames)
    for f in range(1, frames + 1):
        scene.frame_set(f)
        if f % 15 == 0 or f == frames:
            P = evaluated_positions()
            gv = np.linalg.norm(P[[a for a, _ in pairs]] - P[[b for _, b in pairs]], axis=1)
            gap = float(gv.max())
            gaps.append((phase, f, gap))
            wa, wb = pairs[int(np.argmax(gv))]
            print(f'operators:   worst seam {SEAM_OF.get((wa, wb), SEAM_OF.get((wb, wa), "?"))}', flush=True)
            drift = float(np.linalg.norm(P.mean(axis=0) - co.mean(axis=0)))
            print(f'operators: {phase} frame {f}/{frames}, worst seam gap {gap * 1000:.1f} mm, '
                  f'centroid drift {drift * 1000:.0f} mm, {time.time() - t0:.0f} s', flush=True)
            if not np.isfinite(P).all() or gap > 0.5:
                far = np.argsort(-np.linalg.norm(P - co, axis=1))[:8]
                for i in far:
                    print('  moved', i, PANELS_OF[i], np.round(uv[i], 3), np.round(co[i], 3), '->', np.round(P[i], 2))
                raise SystemExit(f'cloth simulation diverged in {phase} at frame {f} (seam gap {gap:.2f} m)')
    obj.modifiers.remove(cloth)
    scene.frame_set(1)
    for i, kd in enumerate(obj.data.shape_keys.key_blocks['arranged'].data):
        kd.co = P[i]
sim_seconds = time.time() - t0
if not np.isfinite(P).all():
    raise SystemExit('cloth simulation diverged')


def under_bvh():
    """The outer faces of every layer under this garment, as one BVH (None without layers)."""
    if not UNDER:
        return None
    lv, lf = [], []
    for u, _ob, V in UNDER:
        o = len(lv)
        lv += [tuple(v) for v in V]
        lf += [tuple(i + o for i in f) for f in LAYER_FACES[u]]
    return BVHTree.FromPolygons(lv, lf)


def spread(D, need, rings=8, decay=0.86):
    """A per-vertex push (D, vectors; need: the vertices that must move) spread into a smooth bump: each ring out takes
    a decayed average of the ring inside it, and a vertex keeps the larger of its own push and its neighbours'. A
    vertex-by-vertex snap leaves a step at the edge of the pushed region (dark dashes in raking light, step 05 fix
    round 2); the spread bump has no step."""
    mag0 = np.linalg.norm(D, axis=1)
    S = D.copy()
    for _ in range(rings):
        A = decay * neighbour_avg(S)
        keep = need & (mag0 >= np.linalg.norm(A, axis=1))
        S = np.where(keep[:, None], D, A)
    return S


def push_out(P, tree, clear, reach=0.03, iters=4, rings=8, decay=0.86):
    """Every vertex closer than 'clear' to the surface (nearest point within reach, along its normal) goes out to
    'clear', as a spread bump (see spread), repeated until nothing is left inside; a last exact snap of the
    remainder (sub-millimetre by then). Returns the new positions, the vertices that had to move and the largest
    first-pass push."""
    P = P.copy()
    moved_any = np.zeros(len(P), bool)
    first = 0.0
    for it in range(iters + 1):
        D = np.zeros_like(P)
        need = np.zeros(len(P), bool)
        for i in range(len(P)):
            loc, n_, _, d = tree.find_nearest(Vector(P[i]))
            if loc is None or d > reach:
                continue
            h = (Vector(P[i]) - loc).dot(n_)
            if h < clear:
                D[i] = np.array(n_) * (clear - h)
                need[i] = True
        if not need.any():
            break
        if it == 0:
            first = float(np.linalg.norm(D, axis=1).max())
        moved_any |= need
        P += D if it == iters else spread(D, need, rings, decay)
    return P, moved_any, first


def layer_push(P):
    """Resolve the layers under this garment: every vertex closer than one layer step (LAYER_T) to the outer face of a
    layer below, or behind it, goes out to LAYER_T, spread into a smooth bump (push_out)."""
    if not UNDER:
        return P, 0
    P, moved, first = push_out(P, under_bvh(), LAYER_T)
    print(f'operators: layer push: largest {first * 1000:.1f} mm', flush=True)
    return P, int(moved.sum())


def interior_mask():
    """Vertices off every panel edge (an edge used by one triangle): the seams and hems stay where the simulation
    sewed them while the surface between them is faired."""
    e = np.sort(np.concatenate([tri_arr[:, [0, 1]], tri_arr[:, [1, 2]], tri_arr[:, [2, 0]]]), axis=1)
    ue, cnt = np.unique(e, axis=0, return_counts=True)
    inner = np.ones(len(P), bool)
    inner[ue[cnt == 1].ravel()] = False
    return inner


def neighbour_avg(X):
    acc = np.zeros_like(X)
    for a_, b_ in ((0, 1), (1, 2), (2, 0)):
        np.add.at(acc, tri_arr[:, a_], X[tri_arr[:, b_]])
        np.add.at(acc, tri_arr[:, b_], X[tri_arr[:, a_]])
    return acc / np.maximum(deg, 1)[:, None]


def smoothed_skin(iters):
    """The skin with its small features (nipples, the navel, creases) faired out (Taubin, shrink-free): the surface a
    compression knit lies on. A knit under tension bridges anything much smaller than its own curvature."""
    V = np.array([v.co[:] for v in body.data.vertices])
    E = np.array([e.vertices[:] for e in body.data.edges])
    dg = np.bincount(E.ravel(), minlength=len(V)).astype(np.float64)
    for _ in range(iters):
        for f in (0.5, -0.53):
            acc = np.zeros_like(V)
            np.add.at(acc, E[:, 0], V[E[:, 1]])
            np.add.at(acc, E[:, 1], V[E[:, 0]])
            V = V + f * (acc / np.maximum(dg, 1)[:, None] - V)
    return BVHTree.FromPolygons([tuple(v) for v in V], [tuple(p.vertices) for p in body.data.polygons])


def subdivided_skin(taubin=10):
    """The body as rendered (its subdivision surface, bind pose) with a light Taubin fairing: a smooth support. The
    cling's skin is the coarse cage, whose convex corners a relaxed membrane tents over (step 08a retry, item 2: the two
    abdomen 'dimples' were the suit tented on two cage vertices of the lower belly)."""
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = body.evaluated_get(dg)
    me_ = ev.to_mesh()
    mw = np.array(body.matrix_world)
    V = np.array([v.co[:] for v in me_.vertices]) @ mw[:3, :3].T + mw[:3, 3]
    E = np.array([e.vertices[:] for e in me_.edges])
    F = [tuple(p_.vertices) for p_ in me_.polygons]
    ev.to_mesh_clear()
    dg_ = np.bincount(E.ravel(), minlength=len(V)).astype(np.float64)
    for _ in range(taubin):
        for f in (0.5, -0.53):
            acc = np.zeros_like(V)
            np.add.at(acc, E[:, 0], V[E[:, 1]])
            np.add.at(acc, E[:, 1], V[E[:, 0]])
            V = V + f * (acc / np.maximum(dg_, 1)[:, None] - V)
    return BVHTree.FromPolygons([tuple(v) for v in V], F)


def _evaluated_body():
    """The body as rendered (its subdivision surface, bind pose): world vertices, vertex normals, faces."""
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = body.evaluated_get(dg)
    me_ = ev.to_mesh()
    mw = np.array(body.matrix_world)
    V = np.array([v.co[:] for v in me_.vertices]) @ mw[:3, :3].T + mw[:3, 3]
    N = np.array([v.normal[:] for v in me_.vertices]) @ mw[:3, :3].T
    F = [tuple(p_.vertices) for p_ in me_.polygons]
    ev.to_mesh_clear()
    return V, N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9), F


def fitted_skin(win, sig, so, guard):
    """A support with no relief smaller than 'sig' (fix round 1 of the 08a retry, item 1): the subdivided body inside the
    zone's window 'win' (a weight per body vertex, 0-1) is replaced by its moving-least-squares surface (a quadratic
    height field in each vertex's own frame, Gaussian weights of radius 'sig'). A quadratic keeps the belly's broad
    curvature and drops the rectus ridges, the linea alba and the navel, which a Taubin fairing of the fine mesh keeps
    (a band-pass: 5-7 cm features pass). The fitted part is lifted evenly so that nothing of the body comes nearer than
    'guard' to cloth held 'so' off it (a membrane over the ridges, not between them). Returns (BVH, lift in m)."""
    V, N, F = _evaluated_body()
    R = np.where(win > 0)[0]
    if not len(R):
        return BVHTree.FromPolygons([tuple(v) for v in V], F), 0.0
    c_ = V[R].mean(axis=0)
    rad = np.linalg.norm(V[R] - c_, axis=1).max() + 3 * sig
    nR = N[R].mean(axis=0)
    nR /= np.linalg.norm(nR)
    S_ = np.where((np.linalg.norm(V - c_, axis=1) < rad) & (N @ nR > 0.0))[0]
    Q, NS = V[S_], N[S_]
    proj, nrm = np.empty((len(R), 3)), np.empty((len(R), 3))
    up = np.array([0.0, 0.0, 1.0])
    for k in range(0, len(R), 160):
        p = V[R[k:k + 160]]
        d2 = ((Q[None, :, :] - p[:, None, :]) ** 2).sum(-1)
        g = np.exp(-d2 / (2 * sig * sig)) * (d2 < 9 * sig * sig)
        n = np.einsum('cn,ni->ci', g, NS)                       # the frame: the Gaussian-averaged normal
        n /= np.linalg.norm(n, axis=1, keepdims=True)
        g = g * (np.einsum('ci,ni->cn', n, NS) > 0.3)            # nothing from a surface facing away
        t1 = np.cross(n, up)
        t1 /= np.linalg.norm(t1, axis=1, keepdims=True)
        t2 = np.cross(n, t1)
        D = Q[None, :, :] - p[:, None, :]
        u, v, h = (np.einsum('cni,ci->cn', D, t) for t in (t1, t2, n))
        A = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], -1)
        M = np.einsum('cn,cni,cnj->cij', g, A, A) + 1e-12 * np.eye(6)
        r = np.einsum('cn,cni,cn->ci', g, A, h)
        c0 = np.linalg.solve(M, r[..., None])[:, 0, 0]
        proj[k:k + 160] = p + c0[:, None] * n
        nrm[k:k + 160] = n
    w = win[R]
    exc = np.einsum('ri,ri->r', V[R] - proj, nrm)               # + = the body outside the fitted surface
    lift = max(0.0, float(exc[w > 0.3].max()) - (so - guard)) if (w > 0.3).any() else 0.0
    V = V.copy()
    V[R] = V[R] + w[:, None] * (proj - V[R] + lift * nrm)
    print(f"operators: fitted support: {len(R)} vertices, relief removed up to {exc.max() * 1000:.1f} mm out / "
          f"{-exc.min() * 1000:.1f} mm in, lift {lift * 1000:.1f} mm", flush=True)
    return BVHTree.FromPolygons([tuple(v) for v in V], F), lift


def membrane_zones(P, zones, so, guard, skin):
    """Membrane zones (SIM 'cling' 'zones', step 08a fix round 3): where a compression knit spans a broad form (the
    lower belly and the front of the crotch) it is one taut surface, not a copy of the skin and not the solver's
    bunching. In each zone (a front box in body measurements, with a smooth falloff) the surface between the seams is
    relaxed as a membrane and only held clear of the cling's faired skin (at 'standoff') and of the real skin (at
    'guard'): it bridges hollows (the navel, the abdomen's grooves) and convex bunches of excess cloth settle onto the
    skin. With 'max_off' a vertex standing more than standoff + max_off off the faired skin is also drawn in to it
    (seam vertices too, which the relax keeps)."""
    P = P.copy()
    inner = interior_mask()
    # 'seams' (step 08a retry, item 1): the zone relaxes its seams with the cloth, each seam as one line (its paired
    # vertices, welded later, are held together at their mean and relaxed over both sides' neighbours), so a seam the
    # simulation left wavy (the centre front above the gusset) is drawn straight with the membrane.
    par = np.arange(len(P))

    def _root(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for a_, b_ in pairs:
        ra, rb = _root(a_), _root(b_)
        if ra != rb:
            par[max(ra, rb)] = min(ra, rb)
    root = np.array([_root(i) for i in range(len(P))])
    paired = np.bincount(root, minlength=len(P))[root] > 1

    def welded_avg(X):
        acc = np.zeros_like(X)
        cnt = np.zeros(len(X))
        for a_, b_ in ((0, 1), (1, 2), (2, 0)):
            np.add.at(acc, tri_arr[:, a_], X[tri_arr[:, b_]])
            np.add.at(acc, tri_arr[:, b_], X[tri_arr[:, a_]])
            np.add.at(cnt, tri_arr[:, a_], 1.0)
            np.add.at(cnt, tri_arr[:, b_], 1.0)
        accR = np.zeros_like(X)
        np.add.at(accR, root, acc)
        cR = np.bincount(root, weights=cnt, minlength=len(X))
        return accR[root] / np.maximum(cR[root], 1.0)[:, None]

    def snap_pairs(X, sel):
        S_ = np.zeros_like(X)
        np.add.at(S_, root, X)
        c_ = np.bincount(root, minlength=len(X)).astype(float)
        X = X.copy()
        X[sel] = (S_[root] / c_[root][:, None])[sel]
        return X
    final_guard = []
    for zc in zones:
        z0 = m[zc['z'][0]] + zc['z'][1] * s
        z1 = m[zc['z'][2]] + zc['z'][3] * s
        fall, hx = zc.get('fall', 0.02) * s, zc['x'] * s
        side_ = zc.get('side', -1)

        def weight(X, hx=hx, z0=z0, z1=z1, fall=fall, side_=side_):
            w = (np.clip((hx - np.abs(X[:, 0])) / fall, 0, 1) * np.clip((X[:, 2] - z0) / fall, 0, 1)
                 * np.clip((z1 - X[:, 2]) / fall, 0, 1) * (X[:, 1] * side_ > 0.02 * s))   # side -1 front, +1 back
            return w * w * (3 - 2 * w)
        w = weight(P)
        idx = np.where(w > 0)[0]
        # 'support' (step 08a retry, item 2): 'subdiv' holds the zone off the subdivided, lightly faired body (both the
        # standoff and the guard) instead of the coarse cage, so the membrane does not tent on the cage's corners.
        zskin, zreal = (skin, _skin)
        if zc.get('support') == 'subdiv':
            zskin = zreal = subdivided_skin(zc.get('support_fair', 10))
        elif zc.get('support') == 'fit':
            # fix round 1 of the 08a retry, item 1: the subdivided body (lightly faired) kept the rectus relief and the
            # membrane copied it (a six-pack in e); the fitted support has none.
            Vb, _, _ = _evaluated_body()
            zskin, _lift = fitted_skin(weight(Vb), zc.get('fit_sigma', 0.04) * s, so, guard)
            zreal = zskin
        final_guard.append((weight, zskin if zc.get('support') == 'fit' else None))
        seams_ = bool(zc.get('seams'))
        movable = (inner | paired) if seams_ else inner
        if seams_:
            wr = np.zeros(len(P))
            np.maximum.at(wr, root, w)
            w = np.maximum(w, wr[root] * paired)     # a seam's two sides carry the same weight
            idx = np.where(w > 0)[0]
            jsel = paired & (w > 0)
        wi = (0.5 * w * movable)[:, None]
        mo = zc.get('max_off')
        # 'draw_from' (step 08a retry, item 1): the draw-in to max_off only above this height (smooth over 'fall'),
        # so the membrane can run down over the gusset's front without being pulled into the gap between the thighs.
        dfz = m[zc['draw_from'][0]] + zc['draw_from'][1] * s if zc.get('draw_from') else None
        for it in range(zc.get('relax', 40)):
            if seams_:
                P = snap_pairs(P, jsel)
                P = P + wi * (welded_avg(P) - P)
            else:
                P = P + wi * (neighbour_avg(P) - P)
            for i in idx:
                loc, n_, _, d = zskin.find_nearest(Vector(P[i]))
                if loc is None or d > 0.05:
                    continue
                h = (Vector(P[i]) - loc).dot(n_)
                if h < so:
                    P[i] = P[i] + np.array(n_) * (so - h)
                elif mo is not None and h > so + mo:
                    dw = 1.0 if dfz is None else float(np.clip((P[i][2] - dfz) / fall, 0.0, 1.0))
                    P[i] = P[i] - np.array(n_) * (h - so - mo) * w[i] * w[i] * dw
                loc, n_, _, d = zreal.find_nearest(Vector(P[i]))
                if loc is not None and d < 0.05:
                    h = (Vector(P[i]) - loc).dot(n_)
                    if h < guard:
                        P[i] = P[i] + np.array(n_) * (guard - h)
        print(f"operators: membrane zone {zc['name']}: {len(idx)} vertices, z {z0:.3f}-{z1:.3f}", flush=True)
    # 08a retry, item 2: zones held off the subdivided body take their final guard off it too (the coarse cage's convex
    # corners stand up to a few mm outside the rendered body; a guard off them tented the abdomen on two cage vertices).
    # Fix round 1 of the 08a retry, item 1: only the zones' own vertices take that guard (each zone's weight, blended);
    # the rest of the suit keeps the guard off the cage, as before the zones had supports.
    base, _, _ = push_out(P, _skin, guard, reach=0.03)
    sub = subdivided_skin(0) if any(zc.get('support') for zc in zones) else _skin
    out = base.copy()
    for wfn, tree in final_guard:
        wz = wfn(P)
        if not (wz > 0).any():
            continue
        Pz, _, _ = push_out(P, tree if tree is not None else sub, guard, reach=0.03)
        out = out + wz[:, None] * (Pz - out)
    return out


def cling(P, cfg):
    """Compression knit (SIM 'cling'): the fabric is drawn onto the skin, not draped over it. Every vertex within
    'reach' of the skin goes to 'standoff' off it (nearest point), the surface between the seams is relaxed
    tangentially, repeated. Removes the bridging shelves, ring steps and the accordion ripples the mass-spring cloth
    leaves where a negative-ease knit is compressed along its length. With 'bridge' (Taubin iterations) the knit is
    drawn onto a faired copy of the skin, so it runs smooth over small features such as the nipples (step 05 fix
    round 2), and is then only pushed clear of the real skin ('guard'), as a broad spread bump."""
    P = P.copy()
    inner = interior_mask()
    so, reach = cfg.get('standoff', 0.0035), cfg.get('reach', 0.025)
    # 'reach_panels' (step 08a fix round 2): a panel that bridges further off the skin (the suit's pinned crotch
    # gusset) is drawn in from further out.
    reach_v = np.full(len(P), reach)
    for pn, r_ in (cfg.get('reach_panels') or {}).items():
        reach_v[ids_of(pn)] = r_
    skin = smoothed_skin(cfg['bridge']) if cfg.get('bridge') else _skin
    moved = 0
    for it in range(cfg.get('iters', 4) + 1):
        for i in range(len(P)):
            loc, n_, _, d = skin.find_nearest(Vector(P[i]))
            if loc is None or d > reach_v[i]:
                continue
            hgt = (Vector(P[i]) - loc).dot(n_)
            if hgt < reach_v[i]:
                P[i] = np.array(loc + n_ * so)
                moved += it == 0
        if it < cfg.get('iters', 4):
            P[inner] = 0.5 * P[inner] + 0.5 * neighbour_avg(P)[inner]
    # Then relaxed and only pushed out (not drawn in): the knit tents over what is left of small features instead of
    # shrink-wrapping them.
    for _ in range(cfg.get('tent', 3)):
        P[inner] = 0.5 * P[inner] + 0.5 * neighbour_avg(P)[inner]
        for i in range(len(P)):
            loc, n_, _, d = skin.find_nearest(Vector(P[i]))
            if loc is not None and d < reach and (Vector(P[i]) - loc).dot(n_) < so:
                P[i] = np.array(loc + n_ * so)
    if cfg.get('bridge'):
        P, gm, first = push_out(P, _skin, cfg.get('guard', 0.0015), reach=reach, rings=cfg.get('guard_rings', 8),
                                decay=cfg.get('guard_decay', 0.86))
        post['clingGuard'] = {'verts': int(gm.sum()), 'maxMm': round(first * 1000, 2)}
        print(f"operators: cling guard: {int(gm.sum())} vertices pushed off the real skin, largest "
              f"{first * 1000:.2f} mm", flush=True)
    if cfg.get('zones'):
        P = membrane_zones(P, cfg['zones'], so, cfg.get('guard', 0.0015), skin)
    # A panel that laps over another (the top's hem over the leggings' waistband) lies one layer further out there.
    lap = cfg.get('lap')
    if lap:
        under = ids_of(lap['under'])
        z_lim = float(P[under, 2].max()) + lap.get('above', 0.01)
        for pn in lap['over']:
            for i in ids_of(pn):
                ramp = float(np.clip((z_lim + 0.02 - P[i, 2]) / 0.02, 0.0, 1.0))   # eased out above the band
                if ramp > 0:
                    loc, n_, _, d = _skin.find_nearest(Vector(P[i]))
                    if loc is not None and d < reach:
                        P[i] = np.array(loc + n_ * (so + ramp * LAYER_T))
    return P, int(moved)


def boundary_lines():
    """Panel-edge vertices with their two neighbours along the edge (seams, hems), excluding corners (a turn sharper
    than about 35 degrees in the flat pattern, or more or fewer than two edge neighbours)."""
    e = np.sort(np.concatenate([tri_arr[:, [0, 1]], tri_arr[:, [1, 2]], tri_arr[:, [2, 0]]]), axis=1)
    ue, cnt = np.unique(e, axis=0, return_counts=True)
    be = ue[cnt == 1]
    nb = {}
    for a_, b_ in be:
        nb.setdefault(int(a_), []).append(int(b_))
        nb.setdefault(int(b_), []).append(int(a_))
    ids, l, r = [], [], []
    for v, n2 in nb.items():
        if len(n2) != 2:
            continue
        d1, d2 = uv[v] - uv[n2[0]], uv[n2[1]] - uv[v]
        c = float(np.dot(d1, d2) / max(np.linalg.norm(d1) * np.linalg.norm(d2), 1e-12))
        if c < 0.82:
            continue
        ids.append(v)
        l.append(n2[0])
        r.append(n2[1])
    return np.array(ids, int), np.array(l, int), np.array(r, int)


def fair(P, cfg):
    """Soft-shell drape (SIM 'fair'): Taubin smoothing (shrink-free) of the surface between the seams removes the
    small-scale dents the solver leaves on a heavy woven panel; broad folds are longer than the filter and stay. The
    seam and hem lines are faired along themselves (1D, the corners held), so a sewn edge is a clean line, not a
    frill, and the stitches on it run straight (step 05 fix round 2)."""
    P = P.copy()
    inner = interior_mask()
    bi, bl, br = boundary_lines()
    if cfg.get('panels'):                    # only these panels (e.g. the shirt's front over the bust)
        zone = np.zeros(len(P), bool)
        for pn in cfg['panels']:
            zone[ids_of(pn)] = True
        inner &= zone
        keep = zone[bi]
        bi, bl, br = bi[keep], bl[keep], br[keep]
    for _ in range(cfg.get('iters', 6)):
        for f in (cfg.get('lam', 0.5), cfg.get('mu', -0.53)):
            avg = neighbour_avg(P)
            edge_avg = 0.5 * (P[bl] + P[br])
            P[inner] = P[inner] + f * (avg[inner] - P[inner])
            if cfg.get('edges', True) and len(bi):
                P[bi] = P[bi] + f * (edge_avg - P[bi])
    return P


def envelope_bvh(cfg, lo, hi):
    """The layers under this garment with their hollows bridged (SIM 'bridge'): in a box round the region, each layer
    is smoothed and every vertex kept at the larger of its smoothed and its real height (along its normal), repeated
    'iters' times - a rubber sheet pulled over the layer. It spans hollows narrower than about sqrt(iters) edges (the
    gluteal cleft, the sacral dimple, the lumbar groove) and sits on the crowns between them."""
    lv, lf = [], []
    for u, _ob, V in UNDER:
        V0 = np.asarray(V, float)
        F = np.array(LAYER_FACES[u], int)
        E = np.unique(np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1), axis=0)
        dg_ = np.bincount(E.ravel(), minlength=len(V0)).astype(np.float64)
        fn = np.cross(V0[F[:, 1]] - V0[F[:, 0]], V0[F[:, 2]] - V0[F[:, 0]])
        N0 = np.zeros_like(V0)
        for k in range(3):
            np.add.at(N0, F[:, k], fn)
        N0 /= np.maximum(np.linalg.norm(N0, axis=1), 1e-12)[:, None]
        free = np.all((V0 >= lo) & (V0 <= hi), axis=1)
        X = V0.copy()
        for _ in range(cfg.get('iters', 120)):
            acc = np.zeros_like(X)
            np.add.at(acc, E[:, 0], X[E[:, 1]])
            np.add.at(acc, E[:, 1], X[E[:, 0]])
            Y = 0.5 * X + 0.5 * acc / np.maximum(dg_, 1)[:, None]
            h = np.einsum('ij,ij->i', Y - V0, N0)
            Y = np.where((h < 0)[:, None], Y - h[:, None] * N0, Y)    # never below the real layer
            X = np.where(free[:, None], Y, V0)
        o = len(lv)
        lv += [tuple(v) for v in X]
        lf += [tuple(i + o for i in f) for f in LAYER_FACES[u]]
    return BVHTree.FromPolygons(lv, lf)


def bridge(P, cfg):
    """Soft-shell over the seat (SIM 'bridge', step 05 fix round 3): the back panels between the crotch and the band
    are pushed out to one layer step off the bridged layers (envelope_bvh), not the layers themselves, so the cloth
    spans the gluteal cleft and the lower-back hollows instead of shrink-wrapping them. Eased in above the crotch and
    out under the (pinned) band; the push is spread into a smooth bump (spread) and repeated."""
    zone = np.zeros(len(P), bool)
    for pn in cfg['panels']:
        zone[ids_of(pn)] = True
    z0, r0 = m['z_crotch'] + cfg['crotch'][0], cfg['crotch'][1]
    z_band = float(P[ids_of('waistband'), 2].min())
    z1, r1 = z_band - cfg['band'][0], cfg['band'][1]
    # The bridged box: behind the body's frontal plane (y > 'y_from'), from just above the crotch (the leggings' crotch
    # below it stays put and anchors the sheet) to above the band.
    lo = np.array([-0.4, cfg.get('y_from', 0.0), m['z_crotch'] + cfg.get('box_from_crotch', 0.01)])
    hi = np.array([0.4, 0.4, z_band + 0.06])
    tree = envelope_bvh(cfg, lo, hi)
    w = np.clip((P[:, 2] - z0) / r0, 0, 1) * np.clip((z1 - P[:, 2]) / r1, 0, 1)
    w = np.where(zone, w * w * (3 - 2 * w), 0.0)
    P = P.copy()
    first, moved = 0.0, np.zeros(len(P), bool)
    for it in range(cfg.get('passes', 4)):
        D = np.zeros_like(P)
        need = np.zeros(len(P), bool)
        for i in np.where(w > 0)[0]:
            loc, n_, _, d = tree.find_nearest(Vector(P[i]))
            if loc is None or d > cfg.get('reach', 0.06):
                continue
            h = (Vector(P[i]) - loc).dot(n_)
            if h < LAYER_T:
                D[i] = np.array(n_) * (LAYER_T - h) * w[i]
                need[i] = True
        if not need.any():
            break
        if it == 0:
            first = float(np.linalg.norm(D, axis=1).max())
        moved |= need
        P += spread(D, need, 6, 0.8)
        inner = interior_mask() & (w > 0)
        P[inner] = 0.5 * P[inner] + 0.5 * neighbour_avg(P)[inner]
    print(f'operators: bridge: {int(moved.sum())} vertices over the bridged layers, largest {first * 1000:.1f} mm',
          flush=True)
    return P, {'verts': int(moved.sum()), 'maxMm': round(first * 1000, 1)}


def tuck(P, cfg):
    """A tucked hem (SIM 'tuck'): below the waistband of the garment that goes over it, the fabric is drawn onto the
    layer under it (one layer step out), eased in over 'ramp' above. Without it the hem hangs where the simulation left
    it (3 cm proud of the base layer over the lower belly) and the trousers, pushed over it, show its edge as a lip
    under the band (step 05 fix round 2)."""
    tree = under_bvh() or _skin
    off = LAYER_T if UNDER else GAP
    z_full = m['z_waist'] + cfg.get('from_waist', 0.0) * (m['height'] / 1.68)
    ramp = cfg.get('ramp', 0.05)
    P = P.copy()
    w = np.clip((z_full + ramp - P[:, 2]) / ramp, 0.0, 1.0)
    w = w * w * (3 - 2 * w)
    n = 0
    for i in np.where(w > 0)[0]:
        loc, n_, _, d = tree.find_nearest(Vector(P[i]))
        if loc is None or d > 0.08:
            continue
        P[i] = P[i] + w[i] * (np.array(loc + n_ * off) - P[i])
        n += 1
    inner = interior_mask()
    sel = inner & (w > 0)
    for _ in range(cfg.get('relax', 4)):
        P[sel] = 0.5 * P[sel] + 0.5 * neighbour_avg(P)[sel]
    return P, n


post = {}
if SIM.get('cling'):
    P, post['clingVerts'] = cling(P, SIM['cling'])
    print(f"operators: cling: {post['clingVerts']} vertices drawn onto the skin", flush=True)
if SIM.get('tuck'):
    P, post['tuckVerts'] = tuck(P, SIM['tuck'])
    print(f"operators: tuck: {post['tuckVerts']} vertices drawn in under the waist", flush=True)
if SIM.get('bridge') and UNDER:
    P, post['bridge'] = bridge(P, SIM['bridge'])
if SIM.get('fair'):
    _before = P.copy()
    P = fair(P, SIM['fair'])
    post['fairMaxMm'] = round(float(np.linalg.norm(P - _before, axis=1).max()) * 1000, 1)
    print(f"operators: fair: max move {post['fairMaxMm']} mm", flush=True)
P, layer_pushed = layer_push(P)
if UNDER:
    print(f'operators: layers resolved: {layer_pushed} vertices pushed clear of {", ".join(UNDER_IDS)}', flush=True)

# --- 5. Weld the seams ----------------------------------------------------------------------------------------------
parent = list(range(len(P)))


def find(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]
        a = parent[a]
    return a


for a, b in pairs:
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[max(ra, rb)] = min(ra, rb)
groups = {}
for i in range(len(P)):
    groups.setdefault(find(i), []).append(i)
Pw = P.copy()
for root, members in groups.items():
    if len(members) > 1:
        Pw[members] = P[members].mean(axis=0)

obj.shape_key_clear()
for i, v in enumerate(me.vertices):
    v.co = Pw[i]
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
# Where the weld moved vertices more than a few millimetres (a seam the simulation left open), relax the fabric
# round them afterwards so the join does not leave a pinch. Collected before the weld (surviving vertices only).
moved = np.linalg.norm(Pw - P, axis=1)
roots = np.array([find(i) == i for i in range(len(P))])
region = set()
for root in {find(i) for i in range(len(P)) if moved[i] > 0.004}:
    r = min(0.06, 3.0 * float(moved[groups[root]].max()))
    near = np.where(roots & (np.linalg.norm(Pw - Pw[root], axis=1) < r))[0]
    region.update(bm.verts[int(k)] for k in near)
relaxed = len(region)
targetmap = {bm.verts[i]: bm.verts[find(i)] for i in range(len(P)) if find(i) != i}
bmesh.ops.weld_verts(bm, targetmap=targetmap)
loose_e = [e for e in bm.edges if not e.link_faces]
bmesh.ops.delete(bm, geom=loose_e, context='EDGES')
if region:
    for _ in range(8):
        bmesh.ops.smooth_vert(bm, verts=list(region), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(me)
bm.free()
for poly in me.polygons:
    poly.use_smooth = True

os.makedirs(args.out, exist_ok=True)
stem = os.path.join(args.out, f'{op_id}-{args.garment}-sim')
np.savez_compressed(stem + '.npz', uv=uv, panel_idx=panel_idx, tris=np.array(tris), sim=P,
                    pairs=np.array(pairs), weld=np.array([find(i) for i in range(len(P))]))
coll_src.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
report = {
    'operator': op_id, 'garment': args.garment, 'kit': garment.KIT, 'seed': args.seed, 'blender': bpy.app.version_string,
    'measurements': m, 'panels': {n: {'material': p.material, 'areaM2': round(p.area(), 4)}
                                  for n, p in pattern.panels.items()},
    'seams': [{'name': sl['name'], 'style': sl['style'], 'a': sl['a'][0], 'b': sl['b'][0], 'pairs': len(sl['a'][1])}
              for sl in seam_lines],
    'seamLines': [{'name': sl['name'], 'style': sl['style'], 'a': [sl['a'][0], [int(i) for i in sl['a'][1]]],
                   'b': [sl['b'][0], [int(i) for i in sl['b'][1]]]} for sl in seam_lines],
    'panelNames': panel_names,
    'details': details,
    'sim': SIM, 'patchStiffVerts': patch_verts, 'seamVertsNoSelfCollision': int(near_seam.sum()),
    'verts': len(uv), 'tris': len(tris), 'weldedVerts': len(me.vertices), 'pushedClear': pushed, 'relaxedAfterWeld': relaxed,
    'under': UNDER_IDS, 'layerPushed': layer_pushed, 'post': post, 'pinned': int(len(pin_ids)), 'bodyPrepared': BODY_PREPARED,
    'weldMoveMaxMm': round(float(moved.max()) * 1000, 1),
    'frames': args.frames, 'simSeconds': round(sim_seconds, 1), 'seamGapByFrame': gaps,
    'outlines': {n: [[c, np.asarray(pl).round(5).tolist()] for c, pl in p.edges] for n, p in pattern.panels.items()},
}
with open(stem + '.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
print(f'operators: {op_id} {args.garment} sewn: worst seam gap before weld {gaps[-1][2] * 1000:.1f} mm, '
      f'{sim_seconds:.0f} s -> {stem}.blend')
