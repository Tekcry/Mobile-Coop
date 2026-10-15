"""Pipeline stage 3: construction detail on a sewn garment, placed in pattern space on the simulated surface.

- Seam allowances and hems: the pressed allowance raises a narrow plateau beside each seam (on the side it is pressed
  to), hems show their fold; the fabric is then thickened (solidify).
- Stitches: real thread geometry, about 7 stitches per inch, on offset rows along every seam, hem and cuff
  (twin-needle topstitch on the raglans, flatlock zigzag on the knit side seams, single rows elsewhere).
- Patches: elbow pad pockets with a foam pad, upper-arm pockets with bound flaps, cuff tabs with box-X stitching,
  bar tacks at the pocket corners.
- The quarter zip: moulded teeth along the centre front and the collar, a painted metal slider and puller.
- Procedural materials (materials.py) on the pattern UVs: knit torso, ripstop sleeves and collar.

Reads build/operators/<id>/<id>-<garment>-sim.*; writes <id>-<garment>.blend and <id>-<garment>.json.
"""
import json
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import materials as MAT  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
from pattern import Panel, Pattern, SurfaceLookup, distance_to_polyline, resample, polyline_length, rounded_rect  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
})
common.check_version()
op_id, gname = args.operator, args.garment
stem = os.path.join(args.out, f'{op_id}-{gname}')
bpy.ops.wm.open_mainfile(filepath=stem + '-sim.blend')
common.seed_everything(args.seed)
with open(stem + '-sim.json', encoding='utf-8') as f:
    R = json.load(f)
npz = np.load(stem + '-sim.npz')
UV0 = npz['uv']
PANELS = R['panelNames']
PID = {n: i for i, n in enumerate(PANELS)}
panels = {n: Panel(n, R['panels'][n]['material'], [(c, np.array(pl)) for c, pl in R['outlines'][n]]) for n in PANELS}
outline_poly = {n: np.concatenate([pl[:-1] for _, pl in p.edges]) for n, p in panels.items()}
scene = bpy.context.scene
garment = bpy.data.objects[f'{op_id}-{gname}']
body = bpy.data.objects[f'{op_id}-body']
stats = {'stitches': 0, 'stitchRowsM': 0.0}

# --- Dense surface --------------------------------------------------------------------------------------------------
sub = garment.modifiers.new('sub', 'SUBSURF')
sub.levels = sub.render_levels = 2
sub.uv_smooth = 'PRESERVE_BOUNDARIES'
dg = bpy.context.evaluated_depsgraph_get()
dense = bpy.data.meshes.new_from_object(garment.evaluated_get(dg))
garment.modifiers.remove(sub)
nv = len(dense.vertices)
co = np.empty(nv * 3)
dense.vertices.foreach_get('co', co)
co = co.reshape(-1, 3)
nrm = np.empty(nv * 3)
dense.vertex_normals.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)
loop_v = np.empty(len(dense.loops), dtype=np.int64)
dense.loops.foreach_get('vertex_index', loop_v)
loop_uv = np.empty(len(dense.loops) * 2)
dense.uv_layers['pattern'].data.foreach_get('uv', loop_uv)
loop_uv = loop_uv.reshape(-1, 2)
face_panel = np.empty(len(dense.polygons), dtype=np.int64)
dense.attributes['panel'].data.foreach_get('value', face_panel)
loop_face = np.empty(len(dense.loops), dtype=np.int64)
for poly in dense.polygons:
    loop_face[poly.loop_start:poly.loop_start + poly.loop_total] = poly.index
loop_panel = face_panel[loop_face]


def seam_side_uv(side):
    pn, ids = side
    return pn, UV0[np.array(ids)]


# Height profiles (metres) beside seams and edges, per loop (a loop knows its panel and pattern point).
offset_loop = np.zeros(len(loop_uv))


def plateau(d, width, height, ramp=0.0015):
    return height * np.clip((width - d) / ramp, 0, 1)


for sl in R['seamLines']:
    style = sl['style']
    for which in ('a', 'b'):
        pn, pl = seam_side_uv(sl[which])
        sel = np.where(loop_panel == PID[pn])[0]
        lo, hi = pl.min(axis=0) - 0.015, pl.max(axis=0) + 0.015
        sel = sel[np.all((loop_uv[sel] >= lo) & (loop_uv[sel] <= hi), axis=1)]
        if not len(sel):
            continue
        d = distance_to_polyline(loop_uv[sel], pl)
        if style == 'topstitch2':
            h = plateau(d, 0.010, 0.0007) if which == 'a' else 0 * d
        elif style == 'flatlock':
            h = plateau(d, 0.0035, 0.00045)
        elif style == 'topstitch1':
            h = plateau(d, 0.007, 0.0005) if which == 'a' else 0 * d
        else:
            h = 0 * d
        offset_loop[sel] = np.maximum(offset_loop[sel], h)

hem_rows = []
for kind, width, height in (('hems', 0.022, 0.0007), ('cuffs', 0.030, 0.0007)):
    for pn, c0, c1 in R['details'][kind]:
        pl = panels[pn].run(c0, c1)[0]
        hem_rows.append((pn, pl, kind))
        sel = np.where(loop_panel == PID[pn])[0]
        d = distance_to_polyline(loop_uv[sel], pl)
        offset_loop[sel] = np.maximum(offset_loop[sel], plateau(d, width, height, 0.002))
ct = R['details']['collarTop']
collar_top = panels[ct[0]].run(ct[1], ct[2])[0]
sel = np.where(loop_panel == PID['collar'])[0]
offset_loop[sel] = np.maximum(offset_loop[sel], plateau(distance_to_polyline(loop_uv[sel], collar_top), 0.006, 0.0005))
# The zip placket: the fabric folds up beside the zip on the centre front and the collar front.
zd = R['details']['zip']
zip_front = np.array([[0.0, zd['y_cf'] - zd['front_len']], [0.0, zd['y_cf']]])
sel = np.where(loop_panel == PID['front'])[0]
offset_loop[sel] = np.maximum(offset_loop[sel], plateau(distance_to_polyline(loop_uv[sel], zip_front), 0.012, 0.0009))

vert_off = np.zeros(nv)
np.maximum.at(vert_off, loop_v, offset_loop)
co_d = co + nrm * vert_off[:, None]
dense.vertices.foreach_set('co', co_d.ravel())
dense.update()
nrm = np.empty(nv * 3)
dense.vertex_normals.foreach_get('vector', nrm)
nrm = nrm.reshape(-1, 3)
dense.polygons.foreach_set('use_smooth', [True] * len(dense.polygons))

m_knit, m_rip, m_thread = MAT.knit(), MAT.ripstop(), MAT.thread()
m_rip_patch = MAT.ripstop('ripstop patch', edge_attr=True)
m_poly, m_metal, m_bind = MAT.polymer('zip teeth'), MAT.painted_metal('zip slider'), MAT.webbing('binding')
m_cordura, m_loop = MAT.cordura(), MAT.loop()
dense.materials.append(m_knit)
dense.materials.append(m_rip)
mat_idx = np.array([0 if R['panels'][n]['material'] == 'knit' else 1 for n in PANELS])[face_panel]
dense.polygons.foreach_set('material_index', mat_idx)
shirt = bpy.data.objects.new(f'{op_id}-{gname}-hero', dense)
scene.collection.objects.link(shirt)
sol = shirt.modifiers.new('thickness', 'SOLIDIFY')
sol.thickness = 0.0011
sol.offset = -1.0
sol.use_even_offset = False  # even offset spikes on near-degenerate vertices
sol.thickness_clamp = 1.0
sol.use_rim = True
garment.hide_render = True
garment.hide_viewport = True

# Lookup on the displaced outer surface.
dense.calc_loop_triangles()
lt = dense.loop_triangles
tri_loops = np.empty(len(lt) * 3, dtype=np.int64)
lt.foreach_get('loops', tri_loops)
tri_loops = tri_loops.reshape(-1, 3)
surf = SurfaceLookup(loop_uv[tri_loops], np.array(PANELS)[loop_panel[tri_loops[:, 0]]], loop_v[tri_loops], co_d, nrm)

# --- Thread geometry ------------------------------------------------------------------------------------------------
TV, TF = [], []


def thread_seg(a, b, n, r=0.00018, arch=0.00016, sink=0.00012, sides=6):
    """One stitch: a slightly arched tube from a to b lying on the surface (normal n), ends sunk into the fabric."""
    d = b - a
    L = np.linalg.norm(d)
    if L < 1e-5:
        return
    t = d / L
    u = np.cross(n, t)
    u /= max(np.linalg.norm(u), 1e-12)
    w = np.cross(t, u)
    base = len(TV)
    rings = ((0.0, -sink), (0.5, arch), (1.0, -sink))
    for f, lift in rings:
        c = a + d * f + n * (lift + r)
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            TV.append(c + r * (math.cos(ang) * u + math.sin(ang) * w * 0.8))
    for ring in range(2):
        for k in range(sides):
            a0 = base + ring * sides + k
            a1 = base + ring * sides + (k + 1) % sides
            TF.append((a0, a1, a1 + sides, a0 + sides))
    stats['stitches'] += 1


def offset_into(pl, dist, poly):
    """Offset a polyline by dist towards the inside of the panel outline."""
    pl = np.asarray(pl, dtype=np.float64)
    t = np.gradient(pl, axis=0)
    t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-12)
    nn = np.stack([-t[:, 1], t[:, 0]], axis=1)
    mid = len(pl) // 2
    probe = pl[mid] + nn[mid] * 0.002
    from pattern import _points_in_polygon
    if not _points_in_polygon(probe[None], poly)[0]:
        nn = -nn
    return pl + nn * dist


def stitch_row(lookup, panel, pl, pitch=0.0036, length=0.0027, lift=0.0):
    L = polyline_length(pl)
    if L < pitch:
        return
    n = int(L / pitch)
    pts = resample(pl, n * 4)
    for k in range(n):
        qa, qb = pts[k * 4], pts[k * 4 + 3] if k * 4 + 3 < len(pts) else pts[-1]
        ra, rb = lookup(panel, qa), lookup(panel, qb)
        if ra is None or rb is None:
            continue
        nn = ra[1] + rb[1]
        nn /= np.linalg.norm(nn)
        thread_seg(ra[0] + nn * lift, rb[0] + nn * lift, nn)
    stats['stitchRowsM'] += L


def zigzag(lookup, panel, pl, width, pitch, poly):
    """Dense zigzag across a line (flatlock look, bar tacks)."""
    L = polyline_length(pl)
    n = max(2, int(L / pitch))
    c = resample(pl, n)
    t = np.gradient(c, axis=0)
    t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-12)
    nn = np.stack([-t[:, 1], t[:, 0]], axis=1)
    prev = None
    for k in range(n + 1):
        q = c[k] + nn[k] * (width / 2) * (1 if k % 2 else -1)
        r = lookup(panel, q)
        if r is None:
            prev = None
            continue
        if prev is not None:
            nm = prev[1] + r[1]
            thread_seg(prev[0], r[0], nm / np.linalg.norm(nm), r=0.00016, arch=0.0001)
        prev = r
    stats['stitchRowsM'] += L


for sl in R['seamLines']:
    style = sl['style']
    pa, pla = seam_side_uv(sl['a'])
    pb, plb = seam_side_uv(sl['b'])
    if style == 'topstitch2':
        for dist in (0.0025, 0.0085):
            stitch_row(surf, pa, offset_into(pla, dist, outline_poly[pa]))
    elif style == 'topstitch1':
        stitch_row(surf, pa, offset_into(pla, 0.003, outline_poly[pa]))
    elif style == 'dart':  # darts are stitched closed along their fold
        stitch_row(surf, pa, offset_into(pla, 0.0015, outline_poly[pa]), pitch=0.003, length=0.0024)
    elif style == 'flatlock':
        # Flatlock: looper threads either side plus the zigzag needle thread across the joined edges.
        for p_, pl_ in ((pa, pla), (pb, plb)):
            stitch_row(surf, p_, offset_into(pl_, 0.0028, outline_poly[p_]), pitch=0.0024, length=0.0021)
        zigzag(surf, pa, offset_into(pla, 0.0012, outline_poly[pa]), 0.0024, 0.0022, outline_poly[pa])
for pn, pl, kind in hem_rows:
    for dist in ((0.016, 0.021) if kind == 'hems' else (0.024, 0.030)):
        stitch_row(surf, pn, offset_into(pl, dist, outline_poly[pn]))
stitch_row(surf, 'collar', offset_into(collar_top, 0.003, outline_poly['collar']))
for x in (-0.009, 0.009):
    stitch_row(surf, 'front', np.array([[x, zd['y_cf'] - zd['front_len'] - 0.004], [x, zd['y_cf'] - 0.004]]))
zigzag(surf, 'front', np.array([[-0.011, zd['y_cf'] - zd['front_len'] - 0.006], [0.011, zd['y_cf'] - zd['front_len'] - 0.006]]),
       0.003, 0.0006, outline_poly['front'])

# --- Patches --------------------------------------------------------------------------------------------------------


def local(spec, q):
    """Pattern point -> the patch's own unrotated frame (for top / bottom tests)."""
    if not spec.get('angle'):
        return np.asarray(q, dtype=np.float64)
    pv = np.asarray(spec.get('pivot', spec['centre']), dtype=np.float64)
    ca, sa = math.cos(math.radians(-spec['angle'])), math.sin(math.radians(-spec['angle']))
    return (np.asarray(q, dtype=np.float64) - pv) @ np.array([[ca, sa], [-sa, ca]]) + pv


def to_pattern(spec, q):
    if not spec.get('angle'):
        return np.asarray(q, dtype=np.float64)
    pv = np.asarray(spec.get('pivot', spec['centre']), dtype=np.float64)
    ca, sa = math.cos(math.radians(spec['angle'])), math.sin(math.radians(spec['angle']))
    return (np.asarray(q, dtype=np.float64) - pv) @ np.array([[ca, sa], [-sa, ca]]) + pv


patch_objs = {}
patch_bulge = {}

# Sewn layers (pockets, flaps, the elbow pad, cuff tabs) are stiffer than the sleeve: they bridge its small wrinkles
# instead of copying them. They are placed on a smoothed copy of the garment surface, then pushed clear of the real
# one, so the sleeve's folds still lift them where a fold really runs underneath.
PATCH_SMOOTH = 30
ed_v = np.empty(len(dense.edges) * 2, dtype=np.int64)
dense.edges.foreach_get('vertices', ed_v)
ed_v = ed_v.reshape(-1, 2)
deg_v = np.bincount(ed_v.ravel(), minlength=nv).astype(np.float64)
co_s = co_d.copy()
for _ in range(PATCH_SMOOTH):
    acc = np.zeros_like(co_s)
    np.add.at(acc, ed_v[:, 0], co_s[ed_v[:, 1]])
    np.add.at(acc, ed_v[:, 1], co_s[ed_v[:, 0]])
    co_s = 0.5 * co_s + 0.5 * acc / np.maximum(deg_v, 1)[:, None]
tv_ = loop_v[tri_loops]
fn_ = np.cross(co_s[tv_[:, 1]] - co_s[tv_[:, 0]], co_s[tv_[:, 2]] - co_s[tv_[:, 0]])
nrm_s = np.zeros_like(co_s)
for k in range(3):
    np.add.at(nrm_s, tv_[:, k], fn_)
nrm_s /= np.maximum(np.linalg.norm(nrm_s, axis=1, keepdims=True), 1e-12)
surf_s = SurfaceLookup(loop_uv[tri_loops], np.array(PANELS)[loop_panel[tri_loops[:, 0]]], tv_, co_s, nrm_s)
real = BVHTree.FromPolygons([tuple(v) for v in co_d], [tuple(t) for t in tv_.tolist()])


def clear_of_garment(pts, min_gap):
    """Push points that sit closer than min_gap above the real (wrinkled) garment surface out to min_gap."""
    moved = 0
    for i in range(len(pts)):
        loc, n_, _, _ = real.find_nearest(Vector(pts[i]))
        if loc is None:
            continue
        h = (Vector(pts[i]) - loc).dot(n_)
        if h < min_gap:
            pts[i] = np.array(loc + n_ * min_gap)
            moved += 1
    return moved


def settle_patch(pts, tris_, min_gap, iters=8):
    """Relax the bumps the push-out leaves, keeping the patch clear: interior vertices average their neighbours, edge
    vertices only their neighbours along the edge (a sewn edge stays a clean line, not a ripple), then push out."""
    e = np.concatenate([tris_[:, [0, 1]], tris_[:, [1, 2]], tris_[:, [2, 0]]])
    key = np.sort(e, axis=1)
    uniq, count = np.unique(key, axis=0, return_counts=True)
    rim = uniq[count == 1]
    on_rim = np.zeros(len(pts), bool)
    on_rim[rim.ravel()] = True
    inner = e[~on_rim[e[:, 0]]]
    pushed = 0
    for _ in range(iters):
        acc, deg = np.zeros_like(pts), np.zeros(len(pts))
        np.add.at(acc, inner[:, 0], pts[inner[:, 1]])
        np.add.at(deg, inner[:, 0], 1)
        for a_, b_ in ((0, 1), (1, 0)):
            np.add.at(acc, rim[:, a_], pts[rim[:, b_]])
            np.add.at(deg, rim[:, a_], 1)
        pts = 0.5 * pts + 0.5 * acc / np.maximum(deg, 1)[:, None]
        pushed = clear_of_garment(pts, min_gap)
    return pts, pushed


def bulge_fn(spec):
    kind, b = spec['kind'], spec['bulge']
    c = np.array(spec['centre'])
    w, h = spec['size']
    outline = rounded_rect(spec['centre'], spec['size'], spec['r'], angle=spec.get('angle', 0.0),
                           pivot=spec.get('pivot'))

    def f(q):
        q = np.atleast_2d(q)
        d = distance_to_polyline(q, np.concatenate([outline, outline[:1]]))
        if kind == 'pad':
            return b * np.clip(d / 0.016, 0, 1) ** 0.6
        if kind == 'garage':
            return 0.0058 * np.clip(d / 0.003, 0, 1) ** 0.5
        if kind == 'pocket':
            # Contents sit low in the pocket (gravity): the bulge peaks in the lower half.
            yy = (local(spec, q)[..., 1] - (c[1] - h / 2)) / h
            return b * np.clip(d / 0.012, 0, 1) ** 0.7 * np.clip(1.3 - yy, 0.3, 1.0)
        return 0 * d
    return f, outline


for spec in R['details']['patches']:
    pn = spec['panel']
    f, outline = bulge_fn(spec)
    patch_bulge[spec['name']] = f
    p = Panel(spec['name'], 'ripstop', [('o', np.concatenate([outline, outline[:1]]))])
    puv, _, ptris, _, _ = Pattern([p], [], 0.004).mesh()
    gap = 0.0009
    if spec.get('over'):  # flap and loop panel sit on the pocket
        base_off = gap * 2 + 0.0008 + patch_bulge[spec['over']](puv) + (0.0004 if spec['kind'] == 'flap' else 0.0)
    else:
        base_off = gap + f(puv)
    pts, nrms, missing = [], [], []
    for i, q in enumerate(puv):
        r = surf_s(pn, q)
        if r is None:  # off the panel (should not happen): filled from the nearest found neighbour below
            missing.append(i)
            r = (np.full(3, np.nan), np.array([0, 0, 1.0]))
        pts.append(r[0] + r[1] * base_off[i])
        nrms.append(r[1])
    pts = np.array(pts)
    found = np.where(~np.isnan(pts[:, 0]))[0]
    for i in missing:
        j = found[np.argmin(np.linalg.norm(puv[found] - puv[i], axis=1))]
        pts[i] = pts[j]
    stats.setdefault('patchLookupMisses', {})[spec['name']] = len(missing)
    # Clear of the real surface (and of the pocket under a flap), then relaxed; pushed = vertices still held out.
    min_gap = gap * 2 + 0.0008 if spec.get('over') else gap
    clear_of_garment(pts, min_gap)
    pts, pushed = settle_patch(pts, np.array(ptris), min_gap)
    stats.setdefault('patchPushedClear', {})[spec['name']] = pushed
    me = bpy.data.meshes.new(spec['name'])
    me.from_pydata(pts.tolist(), [], [list(t) for t in ptris])
    me.validate()
    uvl = me.uv_layers.new(name='pattern')
    for loop in me.loops:
        uvl.data[loop.index].uv = puv[loop.vertex_index]
    edge = me.attributes.new('edge', 'FLOAT', 'POINT')
    ed = distance_to_polyline(puv, np.concatenate([outline, outline[:1]]))
    edge.data.foreach_set('value', ed)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append({'ripstop': m_rip_patch, 'cordura': m_cordura, 'loop': m_loop}[spec.get('material', 'ripstop')])
    ob = bpy.data.objects.new(spec['name'], me)
    scene.collection.objects.link(ob)
    s2 = ob.modifiers.new('thickness', 'SOLIDIFY')
    s2.thickness = 0.0008
    s2.offset = -1.0
    s2.use_rim = True
    # Lookup on the patch itself for its stitches.
    tri_uv = puv[np.array(ptris)]
    nr = np.array(nrms)
    look = SurfaceLookup(tri_uv, np.array([spec['name']] * len(ptris)), np.array(ptris), pts, nr, cell=0.01)
    patch_objs[spec['name']] = (ob, look, outline)
    c = np.array(spec['centre'])
    w, h = spec['size']
    flat = rounded_rect(spec['centre'], spec['size'], spec['r'])           # unrotated outline
    closed_f = np.concatenate([flat, flat[:1]])
    rows = []                                                              # rows in the unrotated frame
    top = c[1] + h / 2
    ins = lambda d: offset_into(closed_f, d, flat)  # noqa: E731
    if spec['kind'] in ('pad', 'pocket'):
        for d in (0.002, 0.007):
            row = ins(d)
            rows.append(row[row[:, 1] < top - d - 0.001])
        rows.append(np.array([[c[0] - w / 2 + 0.004, top - 0.008], [c[0] + w / 2 - 0.004, top - 0.008]]))
    elif spec['kind'] == 'flap':
        row = ins(0.003)
        rows.append(row[row[:, 1] < top - 0.006])
        rows.append(np.array([[c[0] - w / 2 + 0.003, top - 0.004], [c[0] + w / 2 - 0.003, top - 0.004]]))
    elif spec['kind'] in ('loop', 'garage'):
        rows.append(ins(0.002))
    elif spec['kind'] == 'tab':
        bot = c[1] - h / 2
        box = np.array([[c[0] - w / 2 + 0.004, bot + 0.004], [c[0] + w / 2 - 0.004, bot + 0.004],
                        [c[0] + w / 2 - 0.004, bot + 0.026], [c[0] - w / 2 + 0.004, bot + 0.026],
                        [c[0] - w / 2 + 0.004, bot + 0.004]])
        rows += [box, np.array([box[0], box[2]]), np.array([box[1], box[3]])]
        row = ins(0.002)
        rows.append(row[row[:, 1] > bot + 0.03])
    for row in rows:
        if len(row) > 1:
            stitch_row(look, spec['name'], to_pattern(spec, row))
    if spec['kind'] == 'pocket':
        for sx in (-1, 1):  # bar tacks at the top corners take the load of the opening
            x = c[0] + sx * (w / 2 - 0.004)
            zigzag(look, spec['name'], to_pattern(spec, np.array([[x, top - 0.012], [x, top - 0.002]])), 0.0025,
                   0.0006, outline)
    if spec['kind'] == 'pad':
        for sx in (-1, 1):
            x = c[0] + sx * (w / 2 - 0.006)
            zigzag(look, spec['name'], np.array([[x, top - 0.014], [x, top - 0.004]]), 0.0025, 0.0006, outline)

# Flap binding: a folded tape round the three free edges of each flap.
BV_, BF_ = [], []


def tube(points, normals, r, sides=8):
    base0 = len(BV_)
    n = len(points)
    for i in range(n):
        t = points[min(i + 1, n - 1)] - points[max(i - 1, 0)]
        t /= max(np.linalg.norm(t), 1e-12)
        u = np.cross(normals[i], t)
        u /= max(np.linalg.norm(u), 1e-12)
        w = np.cross(t, u)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            BV_.append(points[i] + r * (math.cos(a) * u * 1.6 + math.sin(a) * w))
    for i in range(n - 1):
        for k in range(sides):
            a0 = base0 + i * sides + k
            a1 = base0 + i * sides + (k + 1) % sides
            BF_.append((a0, a1, a1 + sides, a0 + sides))


for name, (ob, look, outline) in patch_objs.items():
    if 'Flap' not in name:
        continue
    spec = next(p for p in R['details']['patches'] if p['name'] == name)
    closed = np.concatenate([outline, outline[:1]])
    top = local(spec, closed)[:, 1].max()
    edge_pts = resample(closed, 240)
    edge_pts = edge_pts[local(spec, edge_pts)[:, 1] < top - 0.003]
    P3, N3 = [], []
    for q in edge_pts:
        r = look(name, q)
        if r is None:
            continue
        P3.append(r[0] - r[1] * 0.0004)
        N3.append(r[1])
    # Separate runs where the edge leaves the flap's free sides (the sewn top edge carries no binding).
    P3, N3 = np.array(P3), np.array(N3)
    breaks = np.where(np.linalg.norm(np.diff(P3, axis=0), axis=1) > 0.01)[0] + 1
    for a_, b_ in zip(np.concatenate([[0], breaks]), np.concatenate([breaks, [len(P3)]])):
        if b_ - a_ > 2:
            tube(P3[a_:b_], N3[a_:b_], 0.0009)

# --- Zip ------------------------------------------------------------------------------------------------------------
ZV, ZF, MV, MF = [], [], [], []


def box(store_v, store_f, c, t, u, n, size, bevel=0.25):
    """A bevelled box (chamfered top edges) centred at c with axes t (length), u (width), n (height)."""
    lx, ly, lz = size[0] / 2, size[1] / 2, size[2]
    b = bevel
    prof = [(-lx, -ly, 0), (lx, -ly, 0), (lx, ly, 0), (-lx, ly, 0),
            (-lx * (1 - b), -ly * (1 - b), lz), (lx * (1 - b), -ly * (1 - b), lz),
            (lx * (1 - b), ly * (1 - b), lz), (-lx * (1 - b), ly * (1 - b), lz)]
    base0 = len(store_v)
    for x, y, z in prof:
        store_v.append(c + t * x + u * y + n * z)
    for f in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)):
        store_f.append(tuple(base0 + i for i in f))


zpath = []
for y in np.linspace(zd['y_cf'] - zd['front_len'], zd['y_cf'], 90):
    zpath.append(('front', (0.0, y)))
for k in np.linspace(0, 1, 26)[1:]:
    zpath.append(('collar', (zd['collar_inset'] * k * 0.98, zd['collar_h'] * k * 0.98)))
zp, zn = [], []
for pn, q in zpath:
    r = surf(pn, q)
    if r is not None:
        zp.append(r[0])
        zn.append(r[1])
zp, zn = np.array(zp), np.array(zn)
teeth = 0
seg = np.linalg.norm(np.diff(zp, axis=0), axis=1)
cum = np.concatenate([[0], np.cumsum(seg)])
pitch = 0.0026
for k, s_ in enumerate(np.arange(0.002, cum[-1] - 0.012, pitch)):
    i = int(np.clip(np.searchsorted(cum, s_) - 1, 0, len(zp) - 2))
    f = (s_ - cum[i]) / max(seg[i], 1e-9)
    c = zp[i] + (zp[i + 1] - zp[i]) * f
    n = zn[i]
    t = (zp[i + 1] - zp[i]) / max(seg[i], 1e-9)
    u = np.cross(n, t)
    u /= np.linalg.norm(u)
    side = 1 if k % 2 else -1
    box(ZV, ZF, c + n * 0.0008 + u * side * 0.0008, t, u, n, (0.0019, 0.0042, 0.0013), 0.35)
    teeth += 1
# Tape either side of the teeth.
for side in (-1, 1):
    pts = []
    for i in range(len(zp)):
        t = zp[min(i + 1, len(zp) - 1)] - zp[max(i - 1, 0)]
        t /= np.linalg.norm(t)
        u = np.cross(zn[i], t)
        u /= np.linalg.norm(u)
        pts.append((zp[i] + u * side * 0.0026 + zn[i] * 0.0007, zp[i] + u * side * 0.0060 + zn[i] * 0.0007))
    base0 = len(ZV)
    for a, b in pts:
        ZV.extend([a, b])
    for i in range(len(pts) - 1):
        ZF.append((base0 + 2 * i, base0 + 2 * i + 1, base0 + 2 * i + 3, base0 + 2 * i + 2))
# Slider at the top (zip closed) and its puller hanging down along the zip.
top_c, top_n = zp[-6], zn[-6]
t_ = zp[-1] - zp[-10]
t_ /= np.linalg.norm(t_)
u_ = np.cross(top_n, t_)
u_ /= np.linalg.norm(u_)
box(MV, MF, top_c + top_n * 0.0009, t_, u_, top_n, (0.013, 0.0095, 0.0042), 0.3)
box(MV, MF, top_c + top_n * 0.0048 - t_ * 0.0125, t_, u_, top_n, (0.024, 0.0068, 0.0016), 0.2)


def add_mesh(name, V, F, mat, smooth=True, bevel=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in V], [], F)
    me.validate()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL')
        bv.width = 0.0003
        bv.segments = 2
    return ob


add_mesh(f'{op_id}-{gname}-stitches', TV, TF, m_thread)
add_mesh(f'{op_id}-{gname}-binding', BV_, BF_, m_bind)
add_mesh(f'{op_id}-{gname}-zip', ZV, ZF, m_poly, smooth=False, bevel=True)
add_mesh(f'{op_id}-{gname}-zip-slider', MV, MF, m_metal, smooth=False, bevel=True)
body.hide_render = False
body.data.materials.clear()
body.data.materials.append(MAT.clay())
sb = body.modifiers.new('sub', 'SUBSURF')
sb.levels = sb.render_levels = 1
for o in bpy.data.objects:
    if o.name == 'collider':
        o.hide_render = True

bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
tri_count = sum(len(o.data.polygons) for o in scene.objects if o.type == 'MESH' and not o.hide_render and o != body)
report = {
    'operator': op_id, 'garment': gname, 'seed': args.seed,
    'denseVerts': nv, 'stitches': stats['stitches'], 'stitchRowsM': round(stats['stitchRowsM'], 2),
    'patches': [{k: v for k, v in p.items() if k != 'centre'} for p in R['details']['patches']],
    'zipTeeth': teeth, 'patchLookupMisses': stats.get('patchLookupMisses', {}),
    'patchPushedClear': stats.get('patchPushedClear', {}), 'heroFacesBeforeSolidify': tri_count,
}
with open(stem + '.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1)
print(f"operators: {op_id} {gname} detail: {stats['stitches']} stitches over {stats['stitchRowsM']:.1f} m of rows, "
      f"{len(patch_objs)} patches, zip {teeth} teeth -> {stem}.blend")
