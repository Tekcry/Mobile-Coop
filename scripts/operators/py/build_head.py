"""Guard heads, faces, eyes and hair caps (guard-models G1h; docs/guard-models/SPEC.md 7, PLAN.md G1h).

Two job modes (GB job contract, docs/guard-models/reports/GB-REPORT.md; the driver appends --kit and --out):
  --stage heads --job heads-<v>       --base <b> --head <v>   -> heads/guard-<v>-head.{blend,json} + face tile PNGs
  --stage heads --job haircaps-<b>    --haircaps --base <b>   -> heads/guard-<b>-haircaps.{blend,json} + cap tile PNGs,
                                                                 the base's head envelope and the shared eye block PNGs

Head: the MakeHuman hm08 head region (CC0, MPFB2 data from the pinned zip only) shaped by the base's macro sliders and
the variant's CC0 face targets (face regions only, so every head of a base shares the base's cranium), cut on the neck
edge loop of SPEC 7 (nearest 45% of the way from the neck joint to the head joint), ears kept, mouth closed (hm08's
neutral lips), ~4,000 triangles at LOD0, 1,200 / 400 at LOD1 / LOD2. The procedural skin (guard_skin.py) is baked from
the full-resolution head (subdivided once, pores / creases / brows / lashes / facial hair in the material) onto the
LOD0 mesh's own UV in the variant's 1024 face tile: albedo (neutral, mean ~0.75: the skin-tone tints multiply it),
tangent normal, ORM (R occlusion with the eyes present so the socket darkens, G roughness, B metal 0).
Eyes: generated here (a sphere with a cornea bulge, ~250 triangles each at LOD0, pole forward), UV into the shared eye
block (2 x 2 iris cells, SPEC 7 `face.irises` order), fixed (A15). LOD1 / LOD2 merge low eyes into the head object on a
second material slot.
Hair caps (A13): offset scalp shells over the base's shared cranium (the union of its head variants, so no variant pokes
through), thickness tapering to ~0.4 mm at the hairline, strand normals baked into a 256 tile per cap, LOD0 / LOD1.
Coordinates: metres, Blender frame (common.game_to_blender: Z up, the face toward -Y, the head's left on +X), the whole
MakeHuman body uniformly scaled from its stature at the base's sliders to the base's `refHeight`, feet at z = 0.
The body (G1) retargets its own copy of the hm08 body to the game skeleton; the head joins it by hm08 vertex index on
the seam loop (`seam.mhIndex` in the JSON, `mh_index` attribute on every LOD0 vertex) - G4 fits the head onto the
body's seam (or applies the body's head-bone transform, G1's report).
Faces are generated from CC0 targets, never modelled on a real person (BRIEF Limits, SPEC 11).
"""
import json
import math
import os
import sys
import time
import zipfile

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import guard_skin  # noqa: E402
import mh  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FILES_LIST = os.path.join(ROOT, 'scripts', 'operators', 'data', 'mpfb2-files.txt')
ZIP_DEFAULT = 'C:/NightShift/downloads/mpfb2-2.0.18/add-on-mpfb-v2.0.18.zip'

LOD_TRIS = {'lod0': 4000, 'lod1': 1200, 'lod2': 400}      # PLAN 5; the kit's head `tris` override these
EYE_RINGS = {  # polar angles (deg) of the rings between the poles, segments: 224 / 48 / 24 triangles per eye
    'lod0': ((6, 14, 24, 33, 45, 62, 85, 120), 14),   # 2 x 224 = 448 <= the kit's 500 (`face.eyes.tris`)
    'lod1': ((22, 45, 90), 8),
    'lod2': ((40, 90), 6),
}
IRIS_DEG = 31.0          # angular radius of the iris on the eyeball (12 mm iris on a 24 mm eye)
CORNEA_DEG = 36.0
CORNEA_BULGE = 0.10      # cornea apex lift as a fraction of the eye radius
# Hairline (SPEC 7 hair caps) in head units h = (y - eye y) / (crown y - eye y), knots over |azimuth| from the front.
HAIRLINE = ((0, 0.62), (30, 0.63), (50, 0.60), (64, 0.42), (74, -0.22), (84, -0.28), (94, 0.10), (118, 0.08),
            (138, -0.40), (180, -0.48))
CAP_STYLE = {  # thickness (m) on top / at the sides, hairline changes
    'buzz': {'top': None, 'side': None},
    'crop': {'top': None, 'side': 0.004, 'fringe': -0.05},
    'sidepart': {'top': None, 'side': 0.005},
    'receding': {'top': None, 'side': None, 'recede': 0.23},
    'fade': {'top': None, 'side': 0.0006, 'sideLine': 0.40},
}
EDGE_T = 0.0004          # shell thickness at the hairline (m): the cap edge sits just off the scalp
ENVELOPE_TRIS = 2000
SRC_SUBDIV = 2           # Catmull-Clark levels of the bake source / the cap source (hm08 head ~5 mm -> ~1.3 mm)
# Cranium lock (SPEC 7 "every head of a base keeps the base's cranium"): face-target offsets fade out from LOCK[0] to
# LOCK[1] head units below the lowest hairline of any cap style, ears excepted (some face targets move the crown).
LOCK = (-0.15, -0.05)
log_t0 = time.time()


def log(*a):
    print(f'[build_head {time.time() - log_t0:6.1f}s]', *a, flush=True)


# ---------------------------------------------------------------- MPFB2 data (CC0), only listed files, pinned zip
def listed_files():
    lists = [FILES_LIST] + [p for p in os.environ.get('MPFB2_FILES', '').split(os.pathsep) if p]
    out = []
    for path in lists:
        with open(path, encoding='utf-8') as f:
            for line in f:
                s = line.strip()
                if s and not s.startswith('#') and not s.startswith('/') and s not in out:
                    out.append(s)
    return out


def mpfb_dir(out, need):
    """A folder holding every needed data file: MPFB2_DIR, the pipeline cache, else extracted from the pinned zip into
    <out>/cache/mpfb2 (listed files only; written atomically so parallel jobs can share the cache)."""
    listed = set(listed_files())
    missing = [r for r in need if r not in listed]
    if missing:
        raise SystemExit(f'not in mpfb2-files.txt (face targets come only from the pinned zip, listed): {missing[:5]}')
    cands = [os.environ.get('MPFB2_DIR'), os.path.join(ROOT, 'build', 'operators', 'cache', 'mpfb2')]
    for c in cands:
        if c and all(os.path.exists(os.path.join(c, r)) for r in need):
            return c
    dest = os.path.join(out, 'cache', 'mpfb2')
    todo = [r for r in sorted(listed) if not os.path.exists(os.path.join(dest, r))]
    if todo:
        zpath = os.environ.get('MPFB2_ZIP') or ZIP_DEFAULT
        with zipfile.ZipFile(zpath) as z:
            names = set(z.namelist())
            for r in todo:
                src = 'data/' + r
                if src not in names:
                    if r in need:
                        raise SystemExit(f'{zpath}: no {src}')
                    continue
                p = os.path.join(dest, r)
                os.makedirs(os.path.dirname(p), exist_ok=True)
                tmp = f'{p}.{os.getpid()}.tmp'
                with open(tmp, 'wb') as f:
                    f.write(z.read(src))
                os.replace(tmp, p)
        log(f'MPFB2 data: {len(todo)} files from {zpath} -> {dest}')
    return dest


def strip_targets(rel):
    return rel[len('targets/'):] if rel.startswith('targets/') else rel


# ---------------------------------------------------------------- hm08 topology: neck seam loop and head region
class Topo:
    def __init__(self, body):
        self.faces = [f for f, g in zip(body.faces, body.face_group) if g == 'body']
        self.edge_faces = {}
        self.vert_edges = {}
        for fi, f in enumerate(self.faces):
            n = len(f)
            for k in range(n):
                e = (min(f[k], f[(k + 1) % n]), max(f[k], f[(k + 1) % n]))
                self.edge_faces.setdefault(e, []).append(fi)
                self.vert_edges.setdefault(e[0], set()).add(e)
                self.vert_edges.setdefault(e[1], set()).add(e)
        self.verts = np.array(sorted(self.vert_edges), dtype=np.int64)

    def walk_loop(self, e0, v0, limit=400):
        """The edge loop through quads from v0 along e0 (valence-4 vertices only); None if it does not close."""
        loop, e, v = [v0], e0, v0
        for _ in range(limit):
            w = e[0] if e[1] == v else e[1]
            if w == v0:
                return loop
            loop.append(w)
            fs = set(self.edge_faces[e])
            cand = [x for x in self.vert_edges[w] if x != e and not (set(self.edge_faces[x]) & fs)]
            if len(cand) != 1:
                return None
            e, v = cand[0], w
        return None


def neck_seam(body, co, topo, at):
    """SPEC 7: the hm08 neck edge loop whose mean height is nearest `at` of the way from the neck joint to the head
    joint. Loops are walked sideways from the back midline vertices. Returns the ordered hm08 vertex indices."""
    yn = body.joint(co, 'joint-neck')[1]
    yh = body.joint(co, 'joint-head')[1]
    ys = yn + at * (yh - yn)
    bv = topo.verts
    mid = bv[np.abs(co[bv, 0]) < 1e-4]
    back = mid[(co[mid, 2] < body.joint(co, 'joint-neck')[2] + 0.2) & (np.abs(co[mid, 1] - ys) < 0.6)]
    best = None
    for v in back:
        es = sorted(topo.vert_edges[v], key=lambda e: -abs(co[e[0], 0] - co[e[1], 0]))
        loop = topo.walk_loop(es[0], int(v))
        if loop is None or len(loop) < 16:
            continue
        d = abs(co[loop, 1].mean() - ys)
        if best is None or d < best[0]:
            best = (d, loop)
    if best is None:
        raise SystemExit('neck seam: no closed edge loop found near the neck')
    return best[1], ys


def head_region(co, topo, seam):
    """Faces above the seam loop: flood fill from the crown without crossing the loop's edges."""
    n = len(seam)
    cut = {(min(seam[i], seam[(i + 1) % n]), max(seam[i], seam[(i + 1) % n])) for i in range(n)}
    top = int(topo.verts[np.argmax(co[topo.verts, 1])])
    start = topo.edge_faces[next(iter(topo.vert_edges[top]))][0]
    seen, stack = {start}, [start]
    while stack:
        f = topo.faces[stack.pop()]
        for k in range(len(f)):
            e = (min(f[k], f[(k + 1) % len(f)]), max(f[k], f[(k + 1) % len(f)]))
            if e in cut:
                continue
            for g in topo.edge_faces[e]:
                if g not in seen:
                    seen.add(g)
                    stack.append(g)
    faces = [topo.faces[i] for i in sorted(seen)]
    if len(faces) > len(topo.faces) // 2:
        raise SystemExit('neck seam: the flood fill leaked past the loop')
    return faces


def ring_distance(faces, seam):
    """Edge-ring distance of every head vertex from the seam loop (0 on the loop)."""
    adj = {}
    for f in faces:
        for k in range(len(f)):
            a, b = f[k], f[(k + 1) % len(f)]
            adj.setdefault(a, set()).add(b)
            adj.setdefault(b, set()).add(a)
    dist = {v: 0 for v in seam}
    front = list(seam)
    while front:
        nxt = []
        for v in front:
            for w in adj[v]:
                if w not in dist:
                    dist[w] = dist[v] + 1
                    nxt.append(w)
        front = nxt
    return dist


def vertex_normals(co, faces):
    nrm = np.zeros_like(co)
    for f in faces:
        p = co[f]
        n = np.cross(p[2] - p[0], p[3] - p[1]) if len(f) == 4 else np.cross(p[1] - p[0], p[2] - p[0])
        for v in f:
            nrm[v] += n
    ln = np.linalg.norm(nrm, axis=1, keepdims=True)
    return nrm / np.maximum(ln, 1e-12)


# ---------------------------------------------------------------- landmarks and masks (MakeHuman frame, dm)
def smooth(lo, hi, x):
    t = np.clip((np.asarray(x, dtype=np.float64) - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


class Face:
    """Landmarks of one head shape and the azimuth / height frame the hairline and masks use."""

    def __init__(self, body, co, hv):
        self.body, self.co, self.hv = body, co, hv
        el = body.group_indices('helper-l-eye')
        er = body.group_indices('helper-r-eye')
        self.eyes = []
        for g in (el, er):
            # the helper is the eyeball with its cornea: radius from the side and vertical extents, the centre set
            # back from the cornea apex by radius x (1 + bulge), so the generated eye fills the hm08 socket exactly
            lo, hi = co[g].min(axis=0), co[g].max(axis=0)
            r = float((hi[0] - lo[0]) + (hi[1] - lo[1])) / 4.0
            c = np.array([(lo[0] + hi[0]) / 2.0, (lo[1] + hi[1]) / 2.0, hi[2] - r * (1.0 + CORNEA_BULGE)])
            self.eyes.append((c, r))
        self.E = (self.eyes[0][0] + self.eyes[1][0]) / 2.0
        p = co[hv]
        self.top = float(p[:, 1].max())
        lvl = p[np.abs(p[:, 1] - self.E[1]) < 0.3]
        self.cz = float((lvl[:, 2].max() + lvl[:, 2].min()) / 2.0)
        self.ht = self.top - self.E[1]

    def frame(self, pts):
        az = np.degrees(np.arctan2(np.abs(pts[:, 0]), pts[:, 2] - self.cz))
        h = (pts[:, 1] - self.E[1]) / self.ht
        return az, h


def target_region(body, rels, n):
    w = np.zeros(n)
    for rel in rels:
        idx, off = body.target(strip_targets(rel))
        if not len(idx):
            continue
        m = np.linalg.norm(off, axis=1)
        w[idx] = np.maximum(w[idx], np.clip(m / max(np.percentile(m, 90), 1e-9), 0.0, 1.0))
    return w


def hairline(az, style=None):
    knots = np.array(HAIRLINE)
    hl = np.interp(az, knots[:, 0], knots[:, 1])
    st = CAP_STYLE.get(style, {})
    if 'fringe' in st:
        hl = hl + st['fringe'] * smooth(40, 20, az)
    if 'recede' in st:
        hl = hl + st['recede'] * np.exp(-((az - 44.0) / 13.0) ** 2)
    return hl


MASK_TARGETS = {
    'ears': ['targets/ears/l-ear-scale-incr.target.gz', 'targets/ears/r-ear-scale-incr.target.gz'],
    'nose': ['targets/nose/nose-scale-horiz-incr.target.gz', 'targets/nose/nose-scale-vert-incr.target.gz'],
    'lips': ['targets/mouth/mouth-lowerlip-volume-incr.target.gz', 'targets/mouth/mouth-upperlip-volume-decr.target.gz'],
    'cheeks': ['targets/cheek/l-cheek-volume-incr.target.gz', 'targets/cheek/r-cheek-volume-incr.target.gz'],
}


REGIONS = ('ears', 'nose', 'lips', 'cheeks')


def region_masks(face):
    """Per hm08 vertex: the regions the face targets move (ears, nose, lips, cheeks), 0..1, and two landmarks."""
    body, co, n, hv = face.body, face.co, len(face.co), face.hv
    reg = {k: target_region(body, MASK_TARGETS[k], n) for k in REGIONS}
    reg['lips'] = smooth(0.25, 0.6, reg['lips'])
    nb = co[reg['nose'] > 0.6]
    nose_base = float(nb[:, 1].min()) if len(nb) else float(face.E[1] - 0.5)
    mid = hv[(np.abs(co[hv, 0]) < 0.05) & (co[hv, 1] < nose_base - 0.35)]
    chin = co[mid[np.argmax(co[mid, 2])]]  # the chin's most forward point
    return reg, {'noseBase': nose_base, 'chin': [float(x) for x in chin]}


def geometric_masks(face, co, reg, marks):
    """Masks 0..1 for guard_skin.skin at points `co` (MakeHuman frame, dm); `reg`: the region masks at those points."""
    n = len(co)
    az, h = face.frame(co)
    ears, nose, lips, cheeks = (np.asarray(reg[k]) for k in REGIONS)
    wet, lash, brow, crow = (np.zeros(n) for _ in range(4))
    for c, r in face.eyes:
        # eyes: the lid rim on the eyeball (wet line) and the lashes, front half only
        d = np.linalg.norm(co - c, axis=1)
        front = smooth(c[2] + 0.1 * r, c[2] + 0.5 * r, co[:, 2])
        wet = np.maximum(wet, (1 - smooth(r + 0.004, r + 0.02, d)) * front)
        upper = 0.25 + 0.75 * smooth(-0.35 * r, 0.25 * r, co[:, 1] - c[1])
        lash = np.maximum(lash, (1 - smooth(r + 0.01, r + 0.035, d)) * front * upper)
        # brow arc over the eye: dx outward from the eye centre; centre height and half thickness in dm
        side = np.sign(c[0])
        dx = (co[:, 0] - c[0]) * side
        t = np.clip((dx + 0.17) / 0.47, 0, 1)
        yc = c[1] + 0.22 + 0.06 * np.sin(t * math.pi * 0.85) - 0.03 * t
        half = 0.05 - 0.028 * t
        on = (1 - smooth(half * 0.55, half, np.abs(co[:, 1] - yc))) * smooth(-0.2, -0.15, dx) * (1 - smooth(0.27, 0.32, dx))
        on *= smooth(c[2] - 0.05, c[2] + 0.15, co[:, 2]) * (np.sign(co[:, 0]) == side)
        brow = np.maximum(brow, on)
        corner = c + np.array([side * 1.25 * r, 0.0, -0.2 * r])
        crow = np.maximum(crow, 1 - smooth(0.06, 0.16, np.linalg.norm(co - corner, axis=1)))
    hl = hairline(az)
    scalp = smooth(-0.04, 0.04, h - hl) * (1 - ears)
    forehead = smooth(0.30, 0.38, h) * (1 - smooth(hl - 0.12, hl - 0.04, h)) * (1 - smooth(35, 55, az))
    tzone = np.maximum(forehead, nose * 0.8)
    crease = np.maximum(forehead * (1 - smooth(0.5, 0.6, h)), crow * 0.8)
    # facial hair area: jaw, chin, upper lip (below the nose base, rising toward the sideburns), sideburns
    nose_base, chin = marks['noseBase'], marks['chin']
    upper_y = nose_base + 0.9 * np.clip(np.abs(co[:, 0]) - 0.22, 0, None) - 0.02
    beard = 1 - smooth(upper_y - 0.03, upper_y + 0.03, co[:, 1])
    beard = np.maximum(beard, (1 - smooth(74, 84, az)) * smooth(60, 70, az) * (1 - smooth(0.0, 0.12, h)))
    beard *= (1 - smooth(78, 92, az)) * (1 - ears) * (1 - lips) * (1 - nose * 0.9)
    beard *= smooth(chin[1] - 0.55, chin[1] - 0.3, co[:, 1])  # under the jaw down to the upper throat
    red = np.clip(np.maximum.reduce([nose * 0.7, cheeks * smooth(-0.6, 0.0, h) * 0.6, ears * 0.75]), 0, 1)
    return {'m_red': red, 'm_lips': lips, 'm_wet': wet, 'm_brow': brow, 'm_lash': lash, 'm_beard': beard,
            'm_scalp': scalp, 'm_tzone': tzone, 'm_crease': crease}


def masks(face):
    """Masks at the hm08 vertices themselves (checks; the bake evaluates them on the subdivided source)."""
    reg, marks = region_masks(face)
    return geometric_masks(face, face.co, reg, marks), marks


# ---------------------------------------------------------------- Blender helpers
def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def new_mesh_obj(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate()
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool))
    return link(bpy.data.objects.new(name, me))


def set_attr(me, name, values, kind='FLOAT'):
    a = me.attributes.new(name, kind, 'POINT')
    a.data.foreach_set('value', np.asarray(values, dtype=np.int32 if kind == 'INT' else np.float32))


def tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def activate(obj):
    bpy.context.view_layer.update()   # objects removed or joined earlier can leave stale entries in the layer
    for o in bpy.context.view_layer.objects:
        if o is not None:
            o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def duplicate(obj, name):
    o = obj.copy()
    o.data = obj.data.copy()
    o.name = o.data.name = name
    o.modifiers.clear()
    return link(o)


def decimate(obj, target, protect=None, symmetry=True):
    """Collapse-decimate to `target` triangles. `protect`: a vertex group whose weight-0 vertices are kept (the
    decimator's vertex-group cost rises as the weight falls)."""
    t0 = tri_count(obj.data)
    if t0 <= target:
        mod = obj.modifiers.new('tri', 'TRIANGULATE')
    else:
        mod = obj.modifiers.new('dec', 'DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = target / t0
        mod.use_collapse_triangulate = True
        mod.use_symmetry = symmetry
        mod.symmetry_axis = 'X'
        if protect:
            mod.vertex_group = protect
            mod.vertex_group_factor = 1000.0
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return tri_count(obj.data)


def unwrap(obj, seams=None, margin=0.004, method='ANGLE_BASED'):
    me = obj.data
    if seams is not None:
        me.edges.foreach_set('use_seam', seams)
    if not me.uv_layers:
        me.uv_layers.new(name='face')
    activate(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    if seams is None:
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin, area_weight=0.0, scale_to_bounds=False)
    else:
        bpy.ops.uv.unwrap(method=method, margin=margin)
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def uv_stats(me):
    uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    tot = flip = 0
    area = 0.0
    for p in me.polygons:
        ls = list(p.loop_indices)
        for k in range(1, len(ls) - 1):
            a, b, c = uv[ls[0]], uv[ls[k]], uv[ls[k + 1]]
            s = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            area += abs(s) / 2
            tot += 1
            flip += s < 0
    return {'coverage': round(float(area), 3), 'flippedTris': int(min(flip, tot - flip)), 'tris': tot}


def use_gpu(scene):
    scene.render.engine = 'CYCLES'
    if os.environ.get('GUARD_BAKE_CPU'):
        scene.cycles.device = 'CPU'
        return 'CPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA', 'HIP'):
        try:
            prefs.compute_device_type = kind
        except TypeError:
            continue
        prefs.refresh_devices()
        devs = [d for d in prefs.devices if d.type == kind]
        if devs:
            for d in prefs.devices:
                d.use = d.type == kind
            scene.cycles.device = 'GPU'
            return f'{kind}: {devs[0].name}'
    scene.cycles.device = 'CPU'
    return 'CPU'


def new_image(name, size, data):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    img.generated_color = (0.5, 0.5, 1.0, 1.0) if name.endswith('normal') else (0.0, 0.0, 0.0, 1.0)
    return img


def save_png(img, path):
    img.file_format = 'PNG'
    tmp = f'{path}.{os.getpid()}.tmp.png'
    img.filepath_raw = tmp
    img.save()
    os.replace(tmp, path)
    img.filepath_raw = path


def px(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(-1, 4)


def bake_target_material(obj, name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.name = 'bake'
    mat.node_tree.nodes.active = node
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return node


def bake(scene, kind, samples, low, highs, extrusion, ray):
    activate(low)
    for h in highs:
        h.select_set(True)
    bpy.context.view_layer.objects.active = low
    scene.cycles.samples = samples
    kw = dict(type=kind, margin=8, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES')
    if highs:
        kw.update(use_selected_to_active=True, cage_extrusion=extrusion, max_ray_distance=ray)
    if kind == 'NORMAL':
        kw.update(normal_space='TANGENT', normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z')
    t = time.time()
    bpy.ops.object.bake(**kw)
    log(f'baked {kind} {samples} spp in {time.time() - t:.1f}s')


def emit_feed(sockets, which):
    """Route a guard_skin graph's albedo or roughness (or the BSDF, which=None) to the material output."""
    g = sockets['graph']
    em = g.nt.nodes.get('bake-emit') or g.node('ShaderNodeEmission', name='bake-emit')
    if which is None:
        g.link(g.bsdf.outputs['BSDF'], g.out.inputs['Surface'])
        return
    for lk in list(em.inputs['Color'].links):
        g.nt.links.remove(lk)
    g.link(sockets[which], em.inputs['Color'])
    g.link(em.outputs['Emission'], g.out.inputs['Surface'])


def bake_tile(scene, low, highs, sockets_list, size, prefix, extrusion, ray, ao_samples=32):
    """Albedo / normal / ORM of `low`'s active UV from `highs` (or from itself when highs is empty)."""
    node = bake_target_material(low, f'{prefix}-bake') if highs else None
    imgs = {k: new_image(f'{prefix}-{k}', size, k != 'albedo') for k in ('albedo', 'normal', 'ao', 'rough')}
    if node is None:  # self-bake: an image node in the object's own material
        mat = low.data.materials[0]
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        mat.node_tree.nodes.active = node

    def run(kind, img, samples):
        node.image = img
        bake(scene, kind, samples, low, highs, extrusion, ray)
    run('NORMAL', imgs['normal'], 4)
    run('AO', imgs['ao'], ao_samples)
    for s in sockets_list:
        emit_feed(s, 'albedo')
    run('EMIT', imgs['albedo'], 4)
    for s in sockets_list:
        emit_feed(s, 'rough')
    run('EMIT', imgs['rough'], 4)
    for s in sockets_list:
        emit_feed(s, None)
    orm = new_image(f'{prefix}-orm', size, True)
    o = px(imgs['ao'])
    o[:, 1] = px(imgs['rough'])[:, 0]
    o[:, 2] = 0.0
    o[:, 3] = 1.0
    orm.pixels.foreach_set(o.ravel())
    alb = px(imgs['albedo'])[:, :3]   # a byte sRGB image: pixels read back encoded
    alb = np.where(alb <= 0.04045, alb / 12.92, np.power((np.clip(alb, 0, 1) + 0.055) / 1.055, 2.4))
    cov = alb.sum(axis=1) > 1e-6       # texels the bake wrote (islands + margin); the rest stay black
    cov = cov if cov.any() else np.ones(len(alb), dtype=bool)
    stats = {'albedoMeanLinear': [round(float(x), 4) for x in alb[cov].mean(axis=0)],
             'roughMean': round(float(o[cov, 1].mean()), 3), 'aoMean': round(float(o[cov, 0].mean()), 3),
             'texelCoverage': round(float(cov.mean()), 3)}
    bpy.data.images.remove(imgs['ao'])
    bpy.data.images.remove(imgs['rough'])
    return {'albedo': imgs['albedo'], 'normal': imgs['normal'], 'orm': orm}, stats


def final_material(name, imgs, uv='face'):
    """Principled material over baked maps (the blend's look; the runtime builds its own from the atlas)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uv
    tex = {}
    for k in ('albedo', 'normal', 'orm'):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.name = k
        t.image = imgs[k]
        nt.links.new(uvn.outputs['UV'], t.inputs['Vector'])
        tex[k] = t
    nt.links.new(tex['albedo'].outputs['Color'], bsdf.inputs['Base Color'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tex['orm'].outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.uv_map = uv
    nt.links.new(tex['normal'].outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


# ---------------------------------------------------------------- eyes
def eye_mesh(name, centre, radius, lod, cell, cells=2):
    """A UV sphere with the pole forward (-Y), the cornea bulged; UV into the eye block's iris cell (`cell` index)."""
    rings, seg = EYE_RINGS[lod]
    verts, uvs = [], []
    col, row = cell % cells, cell // cells

    def cell_uv(alpha, phi):
        a = math.degrees(alpha)
        if a <= IRIS_DEG:
            rho = guard_skin.IRIS_R * a / IRIS_DEG
        else:
            rho = guard_skin.IRIS_R + (0.49 - guard_skin.IRIS_R) * min(1.0, (a - IRIS_DEG) / (90.0 - IRIS_DEG))
        return ((col + 0.5 + rho * math.cos(phi)) / cells, (row + 0.5 + rho * math.sin(phi)) / cells)

    def point(alpha):
        bulge = 1.0 + CORNEA_BULGE * max(0.0, math.cos(min(1.0, math.degrees(alpha) / CORNEA_DEG) * math.pi / 2)) ** 1.5
        return radius * bulge
    pts = [(0.0, -point(0.0), 0.0)]
    for a in rings:
        al = math.radians(a)
        rr = point(al)
        for s in range(seg):
            ph = 2 * math.pi * s / seg
            pts.append((rr * math.sin(al) * math.cos(ph), -rr * math.cos(al), rr * math.sin(al) * math.sin(ph)))
    pts.append((0.0, radius, 0.0))
    faces = []
    nr = len(rings)
    for s in range(seg):
        faces.append((0, 1 + (s + 1) % seg, 1 + s))
    for r in range(nr - 1):
        for s in range(seg):
            a, b = 1 + r * seg + s, 1 + r * seg + (s + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    last = len(pts) - 1
    for s in range(seg):
        a = 1 + (nr - 1) * seg
        faces.append((last, a + s, a + (s + 1) % seg))
    verts = [(centre[0] + p[0], centre[1] + p[1], centre[2] + p[2]) for p in pts]
    obj = new_mesh_obj(name, verts, faces)
    me = obj.data
    uvl = me.uv_layers.new(name='face')
    for p in me.polygons:
        for li in p.loop_indices:
            vi = me.loops[li].vertex_index
            x, y, z = pts[vi]
            al = math.acos(max(-1.0, min(1.0, -y / max(1e-9, math.sqrt(x * x + y * y + z * z)))))
            ph = math.atan2(z, x) if (abs(x) + abs(z)) > 1e-9 else 0.0
            uvl.data[li].uv = cell_uv(al, ph)
    recalc_normals(obj)
    return obj


def recalc_normals(obj):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()


def eye_block_images(irises, size=256):
    alb, nrm, orm = guard_skin.eye_block(irises, size)
    out = {}
    for k, a, data in (('albedo', alb, False), ('normal', nrm, True), ('orm', orm, True)):
        img = bpy.data.images.new(f'eyes-{k}', size, size, alpha=False)
        img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
        if not data:  # the block is painted linear; the sRGB image stores encoded values
            a = a.copy()
            c = a[..., :3]
            a[..., :3] = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)
        img.pixels.foreach_set(a.ravel())
        img.pack()
        out[k] = img
    return out


# ---------------------------------------------------------------- shared setup
def load_kit(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def by_id(items, i, what):
    for it in items:
        if it['id'] == i:
            return it
    raise SystemExit(f'{what} "{i}" not in the kit')


def shaped(body, base, recipe=None, lock=None):
    """The base's macro shape plus the head recipe's face targets; `lock` (per hm08 vertex, 0..1) holds the cranium."""
    m = base['macro']
    co0 = body.macro(m['gender'], m['muscle'], m['weight'], proportions=m['proportions'])
    co = co0.copy()
    for rel, w in (recipe or {}).items():
        if rel.startswith('targets/head/'):
            raise SystemExit(f'{rel}: head recipes use face-region targets only (SPEC 7)')
        body.apply(co, strip_targets(rel), float(w))
    if lock is not None:
        co = co0 + (co - co0) * (1.0 - lock)[:, None]
    return co


def cranium_lock(body, co_base, hv):
    """Per hm08 vertex: 1 on the cranium (at and above every cap style's hairline less a band), 0 on the face and
    ears. Computed on the base shape, so it is the same for every head of a base."""
    face = Face(body, co_base, hv)
    az, h = face.frame(co_base)
    hl = np.min([hairline(az, s) for s in [None] + list(CAP_STYLE)], axis=0)
    ears = target_region(body, MASK_TARGETS['ears'], len(co_base))
    lock = smooth(LOCK[0], LOCK[1], h - hl) * (1.0 - smooth(0.1, 0.4, ears))
    out = np.zeros(len(co_base))
    out[hv] = lock[hv]
    return out


class Frame:
    """MakeHuman (dm, +Y up, faces +Z, left +X) -> Blender metres for the base: uniform scale to refHeight."""

    def __init__(self, body, co_base, ref_height):
        bidx = body.group_indices('body')
        self.floor = float(co_base[bidx, 1].min())
        self.stature = float(co_base[bidx, 1].max() - self.floor) / 10.0
        self.k = ref_height / self.stature

    def bl(self, p):
        p = np.asarray(p, dtype=np.float64)
        g = np.stack([-p[..., 0] * 0.1 * self.k, (p[..., 1] - self.floor) * 0.1 * self.k, p[..., 2] * 0.1 * self.k], -1)
        return np.stack([-g[..., 0], -g[..., 2], g[..., 1]], -1)  # common.game_to_blender

    def mh(self, b):
        """Inverse of bl: Blender metres -> MakeHuman decimetres."""
        b = np.asarray(b, dtype=np.float64)
        s = 0.1 * self.k
        return np.stack([b[..., 0] / s, b[..., 2] / s + self.floor, -b[..., 1] / s], -1)


def subdivided(obj, levels):
    """Apply Catmull-Clark `levels` to obj; returns (co, normals, quads) of the result in Blender metres."""
    mod = obj.modifiers.new('sub', 'SUBSURF')
    mod.levels = mod.render_levels = levels
    mod.uv_smooth = 'PRESERVE_BOUNDARIES'
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    nrm = np.empty(n * 3)
    me.vertex_normals.foreach_get('vector', nrm)
    tot = np.empty(len(me.polygons), dtype=np.int64)
    me.polygons.foreach_get('loop_total', tot)
    if (tot != 4).any():
        raise SystemExit(f'{obj.name}: subdivision left non-quads')
    lv = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get('vertex_index', lv)
    return co.reshape(-1, 3), nrm.reshape(-1, 3), lv.reshape(-1, 4)


def resample(src_pts, src_vals, pts, k=4):
    """Inverse-distance interpolation of per-vertex values (rows of src_vals) at pts (KD-tree, k nearest)."""
    from mathutils import kdtree
    tree = kdtree.KDTree(len(src_pts))
    for i, p in enumerate(src_pts):
        tree.insert(p, i)
    tree.balance()
    vals = np.asarray(src_vals, dtype=np.float64)
    out = np.zeros((len(pts),) + vals.shape[1:])
    for i, p in enumerate(pts):
        hits = tree.find_n(p, k)
        w = np.array([1.0 / max(d, 1e-6) for _, _, d in hits])
        out[i] = (vals[[j for _, j, _ in hits]] * w.reshape((-1,) + (1,) * (vals.ndim - 1))).sum(axis=0) / w.sum()
    return out


def setup(args, kit, base, recipes):
    need = ['3dobjs/base.obj', 'mesh_metadata/basemesh_vertex_groups.json']
    need += [r for r in listed_files() if r.startswith('targets/macrodetails/')]
    for rec in recipes:
        need += list(rec.keys())
    for rels in MASK_TARGETS.values():
        need += rels
    need = list(dict.fromkeys(need))
    data = mpfb_dir(args.out, need)
    body = mh.BaseBody(data)
    co_base = shaped(body, base)
    topo = Topo(body)
    seam, seam_y = neck_seam(body, co_base, topo, kit['face']['neckSeam']['at'])
    faces = head_region(co_base, topo, seam)
    hv = np.array(sorted({v for f in faces for v in f}), dtype=np.int64)
    frame = Frame(body, co_base, base['refHeight'])
    lock = cranium_lock(body, co_base, hv)
    log(f'hm08 head: {len(faces)} quads, {len(hv)} verts, seam {len(seam)} verts at MH y {co_base[seam, 1].mean():.3f} '
        f'(target {seam_y:.3f}), scale {frame.k:.4f}, cranium lock on {int((lock > 0.99).sum())} verts')
    return body, co_base, topo, seam, faces, hv, frame, lock


def eye_tris(lod):
    rings, seg = EYE_RINGS[lod]
    return 2 * seg + 2 * seg * (len(rings) - 1)


def cap_styles(kit, base_id):
    """The cap styles with a mesh that the base's kinds wear (kit `kinds[].hairCaps`; bald has no mesh)."""
    styles = []
    for k in kit.get('kinds', []):
        if k.get('base') == base_id:
            for s in k.get('hairCaps', []):
                if s not in styles:
                    styles.append(s)
    return [c for c in kit['hairCaps'] if c['id'] in styles and c['tris'][0] > 0]


def push_report(co_base, cos, hv, nrm, frame, inside=None):
    """Max outward offset (mm) of each head from the base shape, over the head and inside the cap region."""
    out = {}
    for hid, co in cos.items():
        d = ((co - co_base) * nrm).sum(axis=1) * 100.0 * frame.k
        row = {'headMaxMm': round(float(d[hv].max()), 2)}
        if inside is not None and inside.any():
            row['capRegionMaxAbsMm'] = round(float(np.abs(d[inside]).max()), 3)
        out[hid] = row
    return out


def make_envelope(name, co_u, faces, hv, frame, off):
    """SPEC 7 head envelope: the union head (ears included) offset outward by `off` metres, ~2,000 triangles."""
    nrm_u = vertex_normals(co_u, faces)
    remap = {int(v): i for i, v in enumerate(hv)}
    pos = co_u + nrm_u * (off * 10.0 / frame.k)
    env = new_mesh_obj(name, frame.bl(pos[hv]), [[remap[v] for v in f] for f in faces])
    tris = decimate(env, ENVELOPE_TRIS)
    pe = np.array([v.co[:] for v in env.data.vertices])
    env['piece'] = 'envelope'
    return env, {'object': env.name, 'offset': off, 'tris': tris,
                 'min': [round(float(x), 4) for x in pe.min(axis=0)], 'max': [round(float(x), 4) for x in pe.max(axis=0)]}


def build_head_mesh(name, co, faces, hv, frame):
    remap = {int(v): i for i, v in enumerate(hv)}
    obj = new_mesh_obj(name, frame.bl(co[hv]), [[remap[v] for v in f] for f in faces])
    set_attr(obj.data, 'mh_index', hv, 'INT')
    return obj, remap


def back_seam_edges(obj, co, hv, face):
    """UV cut: the back midline from the neck seam up to the crown."""
    me = obj.data
    ev = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    p = co[hv]
    mid = np.abs(p[:, 0]) < 1e-4
    back = p[:, 2] < face.cz
    sel = mid[ev[:, 0]] & mid[ev[:, 1]] & back[ev[:, 0]] & back[ev[:, 1]]
    return sel


def region_seam_edges(obj, label):
    """UV cuts between face regions: the edges whose two faces carry different labels (`label[i]`: polygon i)."""
    me = obj.data
    side = {}
    for p in me.polygons:
        for ek in p.edge_keys:
            side.setdefault(ek, set()).add(int(label[p.index]))
    sel = np.zeros(len(me.edges), dtype=bool)
    for e in me.edges:
        if len(side.get(e.key, ())) > 1:
            sel[e.index] = True
    return sel


FACE_AZ = 72.0           # the face island: in front of this azimuth (deg) and below the hairline
FACE_UV_GAIN = 1.9       # its texel density over the rest of the head (the face reads; the back of the head is hair)


def face_labels(obj, co, hv, face, ears):
    """Per polygon of the hm08 head object: 2 ear, 1 face (front, below the hairline), 0 the rest."""
    az, h = face.frame(co[hv])
    front = (az < FACE_AZ) & (h < hairline(az))
    ear = np.asarray(ears) > 0.5
    lab = np.zeros(len(obj.data.polygons), dtype=np.int64)
    for p in obj.data.polygons:
        vs = list(p.vertices)
        if ear[vs].mean() > 0.5:
            lab[p.index] = 2
        elif front[vs].mean() > 0.5:
            lab[p.index] = 1
    return lab


def gain_island(obj, lab, which, gain, margin):
    """Scale the UVs of polygons labelled `which` by `gain` about their centre, then repack keeping relative sizes."""
    me = obj.data
    uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    loops = np.array([li for p in me.polygons if lab[p.index] == which for li in p.loop_indices], dtype=np.int64)
    if not len(loops):
        return
    c = (uv[loops].min(axis=0) + uv[loops].max(axis=0)) / 2.0
    uv[loops] = c + (uv[loops] - c) * gain
    me.uv_layers.active.data.foreach_set('uv', uv.ravel())
    activate(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------- mode: one head variant
def run_head(args, kit):
    t_start = time.time()
    base = by_id(kit['bases'], args.base, 'base')
    head = by_id(kit['heads'], args.head, 'head')
    if head.get('base', args.base) != args.base:
        raise SystemExit(f'head {head["id"]} belongs to base {head["base"]}, not {args.base}')
    tris = dict(zip(('lod0', 'lod1', 'lod2'), head.get('tris') or [LOD_TRIS[k] for k in ('lod0', 'lod1', 'lod2')]))
    # LOD1 / LOD2 budgets hold the merged eyes (PLAN 5: "in head"); LOD0's eyes are their own budget (kit face.eyes)
    head_target = {'lod0': tris['lod0'], 'lod1': tris['lod1'] - 2 * eye_tris('lod1'),
                   'lod2': tris['lod2'] - 2 * eye_tris('lod2')}
    body, co_base, topo, seam, faces, hv, frame, lock = setup(args, kit, base, [head['targets']])
    co = shaped(body, base, head['targets'], lock)
    face = Face(body, co, hv)
    reg, marks = region_masks(face)
    dist = ring_distance(faces, seam)
    tile = int(kit.get('atlas', {}).get('faceTile', [1024])[0])
    scene = bpy.context.scene
    device = use_gpu(scene)
    log('bake device', device)

    # full-resolution source (the bake's high mesh): masks, skin weights, hm08 indices
    src, remap = build_head_mesh(f'guard-{head["id"]}-head-src', co, faces, hv, frame)
    blend_loops = kit['face']['neckSeam'].get('blendLoops', 2)
    w_head = np.array([min(1.0, 0.5 + 0.5 * dist[int(v)] / blend_loops) for v in hv])
    vg_h = src.vertex_groups.new(name='head')
    vg_n = src.vertex_groups.new(name='neck')
    keep = src.vertex_groups.new(name='decimate')
    seam_set = set(seam)
    for i, v in enumerate(hv):
        vg_h.add([i], float(w_head[i]), 'REPLACE')
        if w_head[i] < 1.0:
            vg_n.add([i], float(1.0 - w_head[i]), 'REPLACE')
        keep.add([i], 0.0 if int(v) in seam_set else 1.0, 'REPLACE')
    # UV on the full mesh, carried through the decimation: the face its own island at FACE_UV_GAIN x the density, the
    # rest cut up the back of the head, the ears their own islands
    src.data.uv_layers.new(name='face')
    labels = face_labels(src, co, hv, face, reg['ears'][hv])
    seams = back_seam_edges(src, co, hv, face) | region_seam_edges(src, labels)
    unwrap(src, seams=seams, margin=0.006)
    gain_island(src, labels, 1, FACE_UV_GAIN, 0.006)
    uvs_full = uv_stats(src.data)

    # LODs
    lods = {}
    lod0 = duplicate(src, f'guard-{head["id"]}-head-lod0')
    decimate(lod0, head_target['lod0'], protect='decimate')
    lods['lod0'] = lod0
    lod1 = duplicate(lod0, f'guard-{head["id"]}-head-lod1')
    decimate(lod1, head_target['lod1'], protect='decimate')
    lods['lod1'] = lod1
    lod2 = duplicate(lod1, f'guard-{head["id"]}-head-lod2')
    decimate(lod2, head_target['lod2'], protect='decimate')
    lods['lod2'] = lod2
    seam_pos = frame.bl(co[seam])

    def seam_kept(obj):
        p = np.array([v.co[:] for v in obj.data.vertices])
        d = np.min(np.linalg.norm(p[None, :, :] - seam_pos[:, None, :], axis=2), axis=1)
        return int((d < 1e-5).sum())
    log('head tris', {k: tri_count(o.data) for k, o in lods.items()}, 'seam kept',
        {k: seam_kept(o) for k, o in lods.items()}, '/', len(seam))

    # eyes (LOD0 separate objects; LOD1 / LOD2 merged into the head on material slot 1)
    irises = kit['face']['irises']
    cell = irises.index(head.get('iris', irises[0]))
    eye_objs = {}
    for lod in ('lod0', 'lod1', 'lod2'):
        for side, (c, r) in zip(('L', 'R'), face.eyes):
            eye_objs[(lod, side)] = eye_mesh(f'guard-{head["id"]}-eye{side}-{lod}', frame.bl(c), r * 0.1 * frame.k, lod, cell)
    eye_counts = {lod: sum(tri_count(eye_objs[(lod, s)].data) for s in 'LR') for lod in ('lod0', 'lod1', 'lod2')}

    # bake source: the full mesh subdivided (SRC_SUBDIV), masks evaluated at its own vertices (brows, lashes and the
    # lid line need ~1 mm, the hm08 face is ~5 mm), with the procedural skin
    hi = duplicate(src, f'guard-{head["id"]}-head-hi')
    hi_co, _, _ = subdivided(hi, SRC_SUBDIV)
    reg_hi = resample(frame.bl(co[hv]), np.stack([reg[k][hv] for k in REGIONS], axis=1), hi_co)
    mk = geometric_masks(face, frame.mh(hi_co), {k: reg_hi[:, i] for i, k in enumerate(REGIONS)}, marks)
    for k, v in mk.items():
        set_attr(hi.data, k, v)
    log(f'bake source: {len(hi.data.polygons)} quads, masks {sorted(mk)}')
    mat, sockets = guard_skin.skin(f'skin-{head["id"]}', head.get('facialHair', 'clean'))
    hi.data.materials.clear()
    hi.data.materials.append(mat)
    eyes_ao = [eye_objs[('lod0', s)] for s in 'LR']
    for o in list(lods.values()) + [src] + [e for (lod, _), e in eye_objs.items() if lod != 'lod0']:
        o.hide_render = True
    lod0.hide_render = False
    for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(lod0, attr, False)  # the bake target sits on the source: never an occluder (bake_lods.py does the same)
    for o in eyes_ao:  # present for the AO (socket shadow), never a bake source
        o.hide_render = False
    eye_imgs = eye_block_images(irises)
    eye_mat = final_material('eye', eye_imgs)
    for e in eye_objs.values():
        e.data.materials.append(eye_mat)
    scene.world = bpy.data.worlds.new('bake')
    scene.world.light_settings.distance = 0.03
    lod0.data.uv_layers.active = lod0.data.uv_layers['face']
    imgs, stats = bake_tile(scene, lod0, [hi], [sockets], tile, f'guard-{head["id"]}-face', 0.004, 0.012)
    out_dir = os.path.join(args.out, 'heads')
    os.makedirs(out_dir, exist_ok=True)
    pngs = {}
    for k, img in imgs.items():
        p = os.path.join(out_dir, f'guard-{head["id"]}-face-{k}.png')
        save_png(img, p)
        pngs[k] = os.path.relpath(p, args.out).replace('\\', '/')
    log('face tile', stats)

    # final materials and the merged LOD1 / LOD2 eyes
    face_mat = final_material(f'face-{head["id"]}', imgs)
    for lod, o in lods.items():
        o.data.materials.clear()
        o.data.materials.append(face_mat)
        o.hide_render = False
        if lod != 'lod0':
            o.data.materials.append(eye_mat)
            parts = [eye_objs[(lod, s)] for s in 'LR']
            for e in parts:
                for p in e.data.polygons:
                    p.material_index = 1
                e.data.materials.clear()
                e.data.materials.append(face_mat)
                e.data.materials.append(eye_mat)
            activate(o)
            for e in parts:
                e.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.join()
        o['tint'] = 'skin'
        o['piece'] = f'head:{head["id"]}'
    for s in 'LR':
        eye_objs[('lod0', s)]['tint'] = 'none'
        eye_objs[('lod0', s)]['piece'] = f'head:{head["id"]}'
    for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(lod0, attr, True)
    for o in (src, hi):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    for img in imgs.values():
        img.pack()

    # a base with no hair-cap job (broad: every kind balaclava) gets its envelope and eye block from its one head job
    extra = {}
    base_heads = [h for h in kit['heads'] if h.get('base') == args.base]
    if not cap_styles(kit, args.base):
        if len(base_heads) == 1:
            ears = target_region(body, MASK_TARGETS['ears'], len(co))
            env, env_info = make_envelope(f'guard-{args.base}-envelope', co, faces, hv, frame,
                                          kit['face']['envelopeOffset'])
            marks_env = envelope_landmarks(body, co, hv, frame, face, ears)
            env_info['json'] = write_envelope_json(args.out, base, kit, env, env_info, marks_env, args.job)
            extra['envelope'] = env_info
            extra['eyeBlock'] = write_eye_block(out_dir, args.out, args.base, irises)
        else:
            log(f'WARNING: base {args.base} has no hair-cap job and {len(base_heads)} heads: no envelope written')

    blend = os.path.join(out_dir, f'guard-{head["id"]}-head.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    lod_counts = {k: tri_count(o.data) for k, o in lods.items()}
    p0 = np.array([v.co[:] for v in lods['lod0'].data.vertices])
    report = {
        'head': head['id'], 'base': args.base, 'seed': args.seed, 'blender': bpy.app.version_string,
        'source': 'MakeHuman hm08 base mesh and CC0 face targets, MPFB2 data from the pinned zip (docs/art-credits.md); '
                  'skin, eyes and hair generated in-repo (guard_skin.py)',
        'targets': head['targets'], 'facialHair': head.get('facialHair'), 'iris': head.get('iris'), 'irisCell': cell,
        'tris': {'head': lod_counts, 'eyes': eye_counts, 'targets': tris, 'headTargets': head_target},
        'objects': {lod: o.name for lod, o in lods.items()} | {'eyeL': eye_objs[('lod0', 'L')].name,
                                                                 'eyeR': eye_objs[('lod0', 'R')].name},
        'materialSlots': {'0': 'face tile (UV "face")', '1': 'eye block (UV "face" in eye-block space; LOD1/LOD2)'},
        'seam': {'loopVerts': len(seam), 'mhIndex': [int(v) for v in seam],
                 'keptVerts': {k: seam_kept(o) for k, o in lods.items()},
                 'centre': [round(float(x), 5) for x in seam_pos.mean(axis=0)]},
        'frame': {'units': 'm', 'axes': 'Blender (Z up, face -Y, left +X)', 'refHeight': base['refHeight'],
                  'mhStatureAtSliders': frame.stature, 'uniformScale': frame.k},
        'bounds': {'min': [round(float(x), 4) for x in p0.min(axis=0)], 'max': [round(float(x), 4) for x in p0.max(axis=0)]},
        'eyes': [{'centre': [round(float(x), 5) for x in frame.bl(c)], 'radius': round(r * 0.1 * frame.k, 5)}
                 for c, r in face.eyes],
        'landmarks': {'eyeMid': [round(float(x), 5) for x in frame.bl(face.E)], 'noseBaseMhY': marks['noseBase']},
        'faceTile': {'size': tile, 'png': pngs, **stats, 'uv': uv_stats(lods['lod0'].data), 'uvFull': uvs_full},
        'maskCoverage': {k: round(float(v.mean()), 4) for k, v in mk.items()},   # over the bake source's vertices
        'craniumLock': {'band': LOCK, 'lockedVerts': int((lock[hv] > 0.99).sum()),
                        'shiftMaxMm': round(float(np.linalg.norm(co[hv] - co_base[hv], axis=1)[lock[hv] > 0.99].max(initial=0)
                                                  * 100.0 * frame.k), 3)},
        'skinWeights': {'bones': ['neck', 'head'], 'blendLoops': blend_loops},
        'device': device, 'seconds': round(time.time() - t_start, 1), **extra,
    }
    with open(os.path.join(out_dir, f'guard-{head["id"]}-head.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    log(f'{head["id"]}: head {lod_counts}, eyes {eye_counts}, tile {tile} -> {blend}')


# ---------------------------------------------------------------- mode: hair caps + head envelope + eye block (per base)
def union_shape(co_base, cos, hv, nrm):
    """Per head vertex, the variant position furthest out along the base normal."""
    out = co_base.copy()
    best = np.zeros(len(co_base))
    for co in cos:
        d = ((co - co_base) * nrm).sum(axis=1)
        sel = d > best
        sel[np.setdiff1d(np.arange(len(co_base)), hv)] = False
        out[sel] = co[sel]
        best[sel] = d[sel]
    return out, best


def envelope_landmarks(body, co_base, hv, frame, face, ears):
    """Blender-frame landmarks G3 fits headwear by: joints, eye mid, brow line, ears, scalp crown."""
    p = frame.bl(co_base[hv])
    ear_pts = frame.bl(co_base[ears > 0.5])
    eye = frame.bl(face.E)

    def r(v):
        return [round(float(x), 5) for x in v]
    return {
        'neckJoint': r(frame.bl(body.joint(co_base, 'joint-neck'))),
        'headJoint': r(frame.bl(body.joint(co_base, 'joint-head'))),
        'eyeMid': r(eye),
        'browZ': round(float(eye[2] + 0.022 * frame.k), 5),   # the brow arc's centre line (geometric_masks)
        'scalpCrownZ': round(float(p[:, 2].max()), 5),
        'ears': {'zRange': r([ear_pts[:, 2].min(), ear_pts[:, 2].max()]),
                 'yRange': r([ear_pts[:, 1].min(), ear_pts[:, 1].max()]),
                 'halfWidth': round(float(np.abs(ear_pts[:, 0]).max()), 5)} if len(ear_pts) else None,
    }


def write_envelope_json(out, base, kit, env, info, marks, job):
    """The per-base head envelope as a named bake output for G3: heads/<base>/envelope.json (Blender metres)."""
    me = env.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    tris = []
    for p in me.polygons:
        vs = list(p.vertices)
        for k in range(1, len(vs) - 1):
            tris.append([vs[0], vs[k], vs[k + 1]])
    lo, hi = co.min(axis=0), co.max(axis=0)
    cy = float(marks['headJoint'][1])   # radii about the vertical through the head joint (the head bone's pivot)
    caps = [c['offset'] for c in kit['hairCaps']]
    data = {
        'base': base['id'], 'job': job, 'refHeight': base['refHeight'],
        'units': 'm', 'axes': "Blender (Z up, the face toward -Y, the head's left on +X), feet at z = 0, base refHeight",
        'offset': info['offset'], 'thickestCap': max(caps), 'clearance': round(info['offset'] - max(caps), 4),
        'crownZ': round(float(hi[2]), 5),
        'centreY': round(cy, 5), 'radiiAbout': 'x = 0, y = centreY (the head joint); z from eyeMid',
        'maxRadii': {'x': round(float(np.abs(co[:, 0]).max()), 5), 'yFront': round(cy - float(lo[1]), 5),
                     'yBack': round(float(hi[1]) - cy, 5), 'zAboveEyes': round(float(hi[2]) - marks['eyeMid'][2], 5)},
        'bounds': {'min': info['min'], 'max': info['max']},
        'landmarks': marks,
        'mesh': {'tris': len(tris), 'verts': [[round(float(x), 5) for x in v] for v in co], 'faces': tris},
    }
    d = os.path.join(out, 'heads', base['id'])
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, 'envelope.json')
    tmp = f'{path}.{os.getpid()}.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    os.replace(tmp, path)
    return os.path.relpath(path, out).replace('\\', '/')


def write_eye_block(out_dir, out, base_id, irises):
    """The shared eye block (SPEC 7) per base, so parallel jobs never share a file."""
    eye_imgs = eye_block_images(irises)
    pngs = {}
    for k, img in eye_imgs.items():
        p = os.path.join(out_dir, f'guard-{base_id}-eyes-{k}.png')
        save_png(img, p)
        pngs[k] = os.path.relpath(p, out).replace('\\', '/')
    return {'size': 256, 'cells': irises, 'png': pngs, 'layout': 'cell i at column i % 2, row i // 2 (row 0 at v = 0)'}


def quad_edges(quads):
    e = np.concatenate([quads[:, [k, (k + 1) % 4]] for k in range(4)])
    e.sort(axis=1)
    return np.unique(e, axis=0)


def cap_shell(cap, S_co, S_n, S_q, edges, az, h, ears, face, frame):
    """One hair cap's shell on the subdivided union head: faces inside the style's hairline, the boundary snapped onto
    the hairline contour (no staircase), thickness from the style, tapering to EDGE_T at the hairline."""
    st = CAP_STYLE[cap['id']]
    hl = hairline(az, cap['id'])
    if 'sideLine' in st:
        hl = np.maximum(hl, np.where(az > 55, st['sideLine'], hl))
    depth = h - hl
    inside = (depth > 0) & (ears < 0.3)
    qsel = S_q[inside[S_q].all(axis=1)]
    if not len(qsel):
        raise SystemExit(f'cap {cap["id"]}: empty region')
    pos = S_co.copy()
    dep = depth.copy()
    acc = np.zeros_like(S_co)
    cnt = np.zeros(len(S_co))
    for a, b in ((edges[:, 0], edges[:, 1]), (edges[:, 1], edges[:, 0])):
        m = inside[a] & (depth[b] < 0)
        aa, bb = a[m], b[m]
        f = (depth[aa] / (depth[aa] - depth[bb]))[:, None]
        np.add.at(acc, aa, S_co[aa] + f * (S_co[bb] - S_co[aa]))
        np.add.at(cnt, aa, 1)
    snap = cnt > 0
    pos[snap] = acc[snap] / cnt[snap][:, None]
    dep[snap] = 0.0
    cv = np.unique(qsel)
    _, h_cv = face.frame(frame.mh(pos[cv]))
    top_t = cap['offset']
    side_t = st.get('side') or top_t
    t = side_t + (top_t - side_t) * smooth(0.45, 0.75, h_cv)
    t = EDGE_T + (t - EDGE_T) * smooth(0.0, 0.10, dep[cv])
    shell = pos[cv] + S_n[cv] * t[:, None]
    remap = np.full(len(S_co), -1, dtype=np.int64)
    remap[cv] = np.arange(len(cv))
    return shell, remap[qsel], t, int(snap[cv].sum())


def run_haircaps(args, kit):
    t_start = time.time()
    base = by_id(kit['bases'], args.base, 'base')
    heads = [h for h in kit['heads'] if h.get('base') == args.base]
    caps = cap_styles(kit, args.base)
    body, co_base, topo, seam, faces, hv, frame, lock = setup(args, kit, base, [h['targets'] for h in heads])
    nrm = vertex_normals(co_base, faces)
    cos = {h['id']: shaped(body, base, h['targets'], lock) for h in heads}
    co_u, push = union_shape(co_base, list(cos.values()), hv, nrm)
    face = Face(body, co_base, hv)
    ears = target_region(body, MASK_TARGETS['ears'], len(co_base))
    az0, h0 = face.frame(co_base)
    cap_region = np.zeros(len(co_base), dtype=bool)
    cap_region[hv] = (h0[hv] - hairline(az0[hv]) > 0) & (ears[hv] < 0.3)
    pushes = push_report(co_base, cos, hv, nrm, frame, cap_region)
    log(f'base {args.base}: {len(heads)} heads, styles {[c["id"] for c in caps]}, push {pushes}')
    scene = bpy.context.scene
    device = use_gpu(scene)
    scene.world = bpy.data.worlds.new('bake')
    scene.world.light_settings.distance = 0.02
    out_dir = os.path.join(args.out, 'heads')
    os.makedirs(out_dir, exist_ok=True)
    crown = frame.bl(co_u[hv[np.argmax(co_u[hv, 1])]])

    # the cap source: the union head subdivided (hm08's scalp is ~15 mm quads; the hairline needs a few mm)
    remap_h = {int(v): i for i, v in enumerate(hv)}
    union = new_mesh_obj(f'guard-{args.base}-union-src', frame.bl(co_u[hv]), [[remap_h[v] for v in f] for f in faces])
    S_co, S_n, S_q = subdivided(union, SRC_SUBDIV)
    bpy.data.objects.remove(union, do_unlink=True)
    az, h = face.frame(frame.mh(S_co))
    ears_s = resample(frame.bl(co_u[hv]), ears[hv][:, None], S_co)[:, 0]
    edges = quad_edges(S_q)
    log(f'cap source: {len(S_q)} quads')

    report_caps = {}
    baked = []
    for cap in caps:
        shell, cf, t, snapped = cap_shell(cap, S_co, S_n, S_q, edges, az, h, ears_s, face, frame)
        obj = new_mesh_obj(f'guard-{args.base}-cap-{cap["id"]}-lod0', shell.tolist(), cf.tolist())
        vg = obj.vertex_groups.new(name='head')
        vg.add(list(range(len(shell))), 1.0, 'REPLACE')
        src_tris = tri_count(obj.data)
        decimate(obj, cap['tris'][0])
        obj.data.uv_layers.new(name='face')
        unwrap(obj, seams=None, margin=0.01)
        mat, sockets = guard_skin.hair(f'hair-{cap["id"]}', cap['id'], tuple(crown),
                                        part_x=(crown[0] + 0.035 if cap['id'] == 'sidepart' else None))
        obj.data.materials.append(mat)
        for o in baked:  # one cap at a time in the AO bake (the shells overlap)
            o.hide_render = True
        size = int(cap['texels'][0])
        imgs, stats = bake_tile(scene, obj, [], [sockets], size, f'guard-{args.base}-cap-{cap["id"]}', 0, 0, ao_samples=16)
        pngs = {}
        for k, img in imgs.items():
            p = os.path.join(out_dir, f'guard-{args.base}-cap-{cap["id"]}-{k}.png')
            save_png(img, p)
            img.pack()
            pngs[k] = os.path.relpath(p, args.out).replace('\\', '/')
        fm = final_material(f'cap-{cap["id"]}', imgs)
        obj.data.materials.clear()
        obj.data.materials.append(fm)
        obj['tint'] = 'hair'
        obj['piece'] = f'hair:{cap["id"]}'
        baked.append(obj)
        lods = {'lod0': tri_count(obj.data)}
        if len(cap['tris']) > 1 and cap['tris'][1] > 0:
            o1 = duplicate(obj, f'guard-{args.base}-cap-{cap["id"]}-lod1')
            lods['lod1'] = decimate(o1, cap['tris'][1])
            o1['tint'] = 'hair'
            o1['piece'] = f'hair:{cap["id"]}'
            baked.append(o1)
        report_caps[cap['id']] = {'tris': lods, 'sourceTris': src_tris, 'budget': cap['tris'], 'texels': size, 'png': pngs,
                                  **stats, 'snappedEdgeVerts': snapped,
                                  'thicknessMm': [round(float(t.min()) * 1000, 2), round(float(t.max()) * 1000, 2)],
                                  'uv': uv_stats(obj.data)}
        log(f'cap {cap["id"]}: {lods} from {src_tris}, thickness {report_caps[cap["id"]]["thicknessMm"]} mm')
    for o in baked:
        o.hide_render = False

    env, env_info = make_envelope(f'guard-{args.base}-envelope', co_u, faces, hv, frame, kit['face']['envelopeOffset'])
    marks = envelope_landmarks(body, co_u, hv, frame, face, ears)
    env_info['json'] = write_envelope_json(args.out, base, kit, env, env_info, marks, args.job)
    eye_block = write_eye_block(out_dir, args.out, args.base, kit['face']['irises'])
    blend = os.path.join(out_dir, f'guard-{args.base}-haircaps.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    report = {
        'base': args.base, 'seed': args.seed, 'blender': bpy.app.version_string, 'heads': [hh['id'] for hh in heads],
        'caps': report_caps, 'bald': 'no mesh: scalp and shave shadow in the face tile',
        'variantPush': pushes, 'unionPushMaxMm': round(float(push[hv].max() * 100.0 * frame.k), 2),
        'envelope': env_info, 'eyeBlock': eye_block,
        'hairline': {'knots': HAIRLINE, 'styles': CAP_STYLE},
        'frame': {'units': 'm', 'axes': 'Blender (Z up, face -Y, left +X)', 'uniformScale': frame.k},
        'device': device, 'seconds': round(time.time() - t_start, 1),
    }
    with open(os.path.join(out_dir, f'guard-{args.base}-haircaps.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    log(f'{args.base}: caps {list(report_caps)}, envelope {env_info["tris"]} tris -> {blend}')


def main():
    args = common.parse_args({
        '--stage': {'default': 'heads'},
        '--job': {'default': ''},
        '--base': {'required': True},
        '--head': {'default': None},
        '--haircaps': {'action': 'store_true'},
        '--kit': {'required': True},
        '--out': {'required': True},
    })
    common.check_version()
    common.empty_scene()
    common.seed_everything(args.seed)
    bpy.context.preferences.filepaths.save_version = 0   # no .blend1 backups beside a rebaked output
    kit = load_kit(args.kit)
    if args.haircaps:
        run_haircaps(args, kit)
    elif args.head:
        run_head(args, kit)
        if os.environ.get('GUARD_HEAD_ALSO_CAPS') and cap_styles(kit, args.base):
            # smoke hook: a driver older than the haircaps-<base> job can still exercise the cap path in one head job
            common.empty_scene()
            common.seed_everything(args.seed)
            run_haircaps(args, kit)
    else:
        raise SystemExit('build_head.py: --head <variant> or --haircaps')


if __name__ == '__main__':
    main()
