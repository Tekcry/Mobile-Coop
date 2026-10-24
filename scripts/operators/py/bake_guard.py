"""bake_lods.py guard mode (guard-models G4; docs/guard-models/PLAN.md section 3 G4, SPEC sections 4-9).

Run by scripts/operators/guard-lods.mjs (the lods stage's node job), never alone:
  blender -b ... --python bake_lods.py -- --seed S --stage lods --job lods-<b> --guard --base <b> --layout <json>
      --kit <guards.json> --out <dir>
  blender -b ... --python bake_lods.py -- ... --guard --piece shield_riot --layout <json> --kit ... --out ...
bake_lods.py hands over here when `--guard` is among its args, so Wren's path and outputs stay byte-identical.

A base: per LOD ONE skinned mesh with ONE material (A3, PLAN 2):
  - the body (G1, bodies/guard-<b>-body.blend): the skin left visible under the base's outfits (body faces whose
    outward ray meets no garment of at least one outfit, one ring of faces of margin), decimated with the neck seam ring
    kept at every LOD, the procedural skin (guard_skin.skin) baked;
  - every head variant (G1h, heads/guard-<v>-head.blend: LOD0 / LOD1 / LOD2 meshes, the LOD0 eyes, the face tile PNGs),
    welded to the body's seam by hm08 index (G1h's `mh_index` against the body's `_mh` / `neckSeam.mhVerts`; no
    transform: G1h builds the heads in G1's body frame with a seam lock): the head's seam vertices take the body seam
    vertices' positions and skin weights;
  - every hair cap (heads/guard-<b>-haircaps.blend LOD0 / LOD1; LOD2 has none: the head's scalp vertices take the hair
    tint slot, "hair in the albedo" at > 25 m);
  - the garment parts of every outfit (G2, garments/guard-<b>-<part>.blend; a part two outfits share is one bake and one
    copy per outfit piece; parts not built yet are left out and listed in the bake notes, so a later run with the
    garments simply rebakes), skinned by nearest body vertex;
  - every gear / headwear / eyewear / kit piece (G3, gear/guard-<b>-<p>.blend), its rigid weights kept (nearest source
    vertex).
Every vertex carries `_PIECE` (index into the layout's `pieces`) and `_TINT` (tint slot). Pieces are separate
islands (no vertex is shared between pieces: G5's groupByPiece uses each triangle's first vertex).
Atlas (guardAtlas.mjs layout): procedural pieces (body, garments, gear) are unwrapped per piece and LOD into their
rect and baked from their own source on the GPU (selected to active, one piece at a time, so overlapping pieces never
bake into each other): tangent normal, AO, albedo, roughness / metal; heads, caps and the eye block are G1h's baked
tiles, resized into their rects. Albedo alpha = the tint mask (1 where the face's slot is not `none`, G5 / SPEC 8).
Normal / ORM at half the albedo size. Skin: LOD0 the 33 bones of the body report's `lodBones`, LOD1 / LOD2 its rig
joints with the fingers folded onto the wrists (`fold`); influences 4 / 4 / 2. The clavicle split is G1's (kept). The
skin albedo is used as baked (its 0.69 mean is scalp shadow, lead ruling: no divide here). Fabric-tinted garment
regions are rescaled per channel to the fabric neutral (x 0.78 for trousers; SPEC 8, G10a D3) and every region's linear
albedo mean over its covered texels goes into the bake JSON's `albedoMean` (guard-check.mjs checks the garments').
A head whose kinds all wear the balaclava for good (faceCovered: broad-1) loses the triangles the balaclava covers, the
eye slot and one ring kept (G10a D6; `coveredHeadTris` in the bake JSON).
Writes <out>/lods/guard-<id>-lod{0,1,2}.glb (PNG inside; guard-lods.mjs then fixes the attributes, encodes KTX2 and
writes the report), <out>/lods/textures/guard-<id>-lod<n>-{albedo,normal,orm}.png, <out>/lods/guard-<id>.bake.json.
"""
import argparse
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
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common  # noqa: E402
import guard_lod_util as U  # noqa: E402

T0 = time.time()
LODS = (0, 1, 2)
CAGE = (0.003, 0.012, 0.03)          # selected-to-active cage per LOD (m): the ray starts this far out
COPY_CAGE = 0.0015                   # a LOD0 piece that is its source unchanged (no decimation)
COVER_REACH = 0.08                   # body faces whose outward ray meets a garment within this are covered
HEAD_COVER_REACH = 1.0               # (G10a D6) a face-covered head's face whose outward ray meets the balaclava at all is hidden
SEAM_TOL = 0.002                     # head seam vertex to body seam vertex (m)
SCALP_REACH = 0.010                  # LOD2: head vertices this close to the buzz cap take the hair slot
ISLAND_MIN = 0.02                    # LOD meshes drop loose islands smaller than this (stitches, rivets; they bake in)
AO_SAMPLES = 32
# (G10a D3) SPEC 8 tints a fabric texel by target / tintNeutral.fabric, so a fabric-tinted garment's baked albedo must
# average that neutral (linear); G2's garments keep Wren's dark procedural cloth (~0.03), so the bake rescales them
FABRIC_SLOTS = ('uniform', 'kit', 'headwear')
LEGS_SHARE = 0.78                    # SPEC 8 (uniform row): trousers baked at 0.78 of the shirt's neutral
LEG_PARTS = ('trousers', 'work_trousers')
NOTES = []


def log(*a):
    print(f'[bake_guard {time.time() - T0:7.1f}s]', *a, flush=True)


def note(msg):
    NOTES.append(msg)
    log('NOTE', msg)


def parse():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, required=True)
    ap.add_argument('--stage', default='lods')
    ap.add_argument('--job', default='')
    ap.add_argument('--guard', action='store_true')
    ap.add_argument('--base', default=None)
    ap.add_argument('--piece', default=None)
    ap.add_argument('--layout', required=True)
    ap.add_argument('--kit', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--samples', type=int, default=AO_SAMPLES)
    ap.add_argument('--save-blend', action='store_true')
    return ap.parse_args(argv)


# ---------------------------------------------------------------- scene helpers
def use_gpu(scene):
    scene.render.engine = 'CYCLES'
    scene.view_settings.view_transform = 'Standard'
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


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def activate(objs, active=None):
    bpy.context.view_layer.update()
    for o in bpy.context.view_layer.objects:
        if o is not None and o.select_get():
            o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


def tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def mesh_obj(name, me):
    o = bpy.data.objects.new(name, me)
    return link(o)


def evaluated_copy(o, name):
    """A new object holding o's evaluated mesh (modifiers applied) in world coordinates, materials and groups kept."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    me.transform(o.matrix_world)
    c = mesh_obj(name, me)
    for g in o.vertex_groups:
        if g.name not in c.vertex_groups:
            c.vertex_groups.new(name=g.name)
    return c


def join(objs, name):
    objs = [o for o in objs if o is not None]
    if not objs:
        return None
    if len(objs) > 1:
        activate(objs, objs[0])
        bpy.ops.object.join()
    o = objs[0]
    o.name = name
    o.data.name = name
    return o


def duplicate(o, name):
    c = o.copy()
    c.data = o.data.copy()
    c.name = c.data.name = name
    c.modifiers.clear()
    c.parent = None
    c.matrix_world = o.matrix_world.copy()
    return link(c)


def append(path, want):
    """Appends the named objects of a .blend (names absent from the file are skipped); returns {name: object}."""
    if not os.path.exists(path):
        return {}
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if want(n)]
    got = {}
    for o in dst.objects:
        if o is None:
            continue
        if o.name not in bpy.context.scene.collection.objects:
            link(o)
        o.hide_viewport = False   # hide_render stays as the file has it (G2: hidden = not shipped, e.g. the shell)
        o.parent = None
        got[o.name] = o
    return got


def weld(me, dist=0.0002):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(me)
    bm.free()


def triangulate(me):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()


def decimate(obj, target, keep_group=None):
    """Collapse-decimates obj in place to at most `target` triangles (three passes at most, as bake_lods.py);
    `keep_group`: vertices at weight 0 in that group are kept (the seam ring). Always triangulated."""
    for _ in range(4):
        n = tri_count(obj.data)
        if n <= target:
            break
        m = obj.modifiers.new('dec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.002, target / n * 0.995)
        m.use_collapse_triangulate = True
        if keep_group and keep_group in obj.vertex_groups:
            m.vertex_group = keep_group
            m.vertex_group_factor = 1000.0
        activate([obj])
        bpy.ops.object.modifier_apply(modifier=m.name)
    triangulate(obj.data)
    return tri_count(obj.data)


def drop_islands(obj, target=None, min_diag=0.0):
    """Drops obj's loose islands under `min_diag`, then the smallest until `target` triangles fit (U.island_mask; the
    largest island overall and on each side of x = 0 always stay, so a glove or boot pair keeps both members)."""
    me = obj.data
    co = np.empty(len(me.vertices) * 3, np.float64)
    me.vertices.foreach_get('co', co)
    lv = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get('vertex_index', lv)
    ls = np.empty(len(me.polygons), np.int32)
    lt = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get('loop_start', ls)
    me.polygons.foreach_get('loop_total', lt)
    keep, dropped = U.island_mask(co, lv, ls, lt, target, min_diag)
    if dropped:
        drop_faces(obj, keep)
    return dropped


def decimate_piece(obj, target, label):
    """A garment / gear LOD mesh to `target` triangles: tiny islands out first (a collapse decimate floors each island at
    a few triangles), then decimate, then the smallest islands out while still over (the source keeps them all)."""
    n0 = tri_count(obj.data)
    tiny = drop_islands(obj, None, ISLAND_MIN) if n0 > target else 0
    n = decimate(obj, target)
    # a collapse decimate stalls on G2's sewn heroes (smoke 2026-10-24: trousers stuck at 3,463 tris at every LOD):
    # cluster the vertices (weld at a growing distance, from half the target's mean edge) and collapse again
    d = 0.0
    while n > target and d < 0.25:
        if not d:
            area = np.empty(len(obj.data.polygons), np.float64)
            obj.data.polygons.foreach_get('area', area)
            d = max(0.002, 0.5 * math.sqrt(float(area.sum()) / max(1, target)))
        else:
            d *= 1.5
        cluster(obj, d)
        n = decimate(obj, target)
    over = 0
    if n > target:
        over = drop_islands(obj, target)
        triangulate(obj.data)
        n = tri_count(obj.data)
    if tiny or over or d:
        log(f'{label}: {n0} -> {n} tris (target {target}), {tiny} tiny islands and {over} more dropped'
            + (f', clustered at {d * 1000:.0f} mm' if d else ''))
    return n


def cluster(obj, d):
    """Vertex clustering: welds vertices closer than d (faces that collapse go), drops loose vertices and edges."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=d)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-12], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def drop_faces(obj, keep_mask):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep_mask[f.index]], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


def world_co(o):
    co = np.empty(len(o.data.vertices) * 3, np.float64)
    o.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    m = np.array(o.matrix_world)
    return co @ m[:3, :3].T + m[:3, 3]


def weights_of(o):
    names = {g.index: g.name for g in o.vertex_groups}
    return [{names[g.group]: g.weight for g in v.groups if g.weight > 0 and g.group in names} for v in o.data.vertices]


def set_weights(o, rows):
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    groups = {}
    for i, r in enumerate(rows):
        for b, w in r.items():
            g = groups.get(b) or o.vertex_groups.new(name=b)
            groups[b] = g
            g.add([i], float(w), 'REPLACE')


def set_point_attr(me, name, values):
    if name in me.attributes:
        me.attributes.remove(me.attributes[name])
    a = me.attributes.new(name, 'FLOAT', 'POINT')
    a.data.foreach_set('value', np.asarray(values, np.float32))


def point_attr(me, name):
    a = me.attributes.get(name)
    if a is None or a.domain != 'POINT':
        return None
    v = np.zeros(len(me.vertices), np.float32)
    a.data.foreach_get('value', v)
    return v


def int_point_attr(me, name):
    """An integer point attribute (G1's `_mh`, G1h's `mh_index`: hm08 vertex indices) as int64, or None."""
    a = me.attributes.get(name)
    if a is None or a.domain != 'POINT':
        return None
    v = np.zeros(len(me.vertices), np.int32 if a.data_type == 'INT' else np.float32)
    a.data.foreach_get('value', v)
    return np.rint(v).astype(np.int64)


def strip_attrs(me, keep=('_PIECE', '_TINT')):
    """Drops every generic attribute the export would carry (`_mh`, `_rigid`, masks...) but ours."""
    for a in list(me.attributes):
        if a.is_internal or a.name.startswith('.') or a.name in ('position', 'sharp_face', 'sharp_edge', 'material_index') or a.name in keep:
            continue
        if a.domain in ('POINT', 'FACE', 'EDGE') and a.data_type in ('FLOAT', 'INT', 'INT8', 'FLOAT2', 'FLOAT_VECTOR', 'FLOAT_COLOR', 'BYTE_COLOR', 'BOOLEAN'):
            try:
                me.attributes.remove(a)
            except RuntimeError:
                pass
    for c in list(me.color_attributes):
        me.color_attributes.remove(c)


def uv_array(me, layer):
    uv = np.empty(len(me.loops) * 2, np.float64)
    me.uv_layers[layer].data.foreach_get('uv', uv)
    return uv.reshape(-1, 2)


def set_only_uv(me, uv, name='atlas'):
    for l in list(me.uv_layers):
        if l.name != name:
            me.uv_layers.remove(l)
    lay = me.uv_layers.get(name) or me.uv_layers.new(name=name)
    lay.data.foreach_set('uv', np.asarray(uv, np.float32).ravel())
    me.uv_layers.active = lay


def unwrap_local(obj):
    """A new 'atlas' UV in [0, 1] (smart project + pack), the bake's target; the source UVs stay for the materials."""
    me = obj.data
    lay = me.uv_layers.get('atlas') or me.uv_layers.new(name='atlas')
    me.uv_layers.active = lay
    activate([obj])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=0.006)
    bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------- images
def new_image(name, w, h, data, alpha=False):
    img = bpy.data.images.new(name, max(1, w), max(1, h), alpha=alpha, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    img.generated_color = (0.5, 0.5, 1.0, 1.0) if name.endswith('normal') else (0.0, 0.0, 0.0, 1.0)
    if alpha:
        img.alpha_mode = 'STRAIGHT'
    return img


def pixels(img):
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)


def srgb_to_linear(a):
    a = np.clip(a, 0.0, 1.0)
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(a):
    a = np.clip(a, 0.0, 1.0)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)


def albedo_to_neutral(alb, cov, want, rounds=3):
    """(G10a D3) Scales an sRGB-encoded albedo (h, w, 4; `Image.pixels` of a byte sRGB image) per channel, in linear,
    so the mean over the covered texels is `want`: the weave, grid and wear keep their relative variation; clamped to
    [0, 1] (a few rounds, so texels the clamp caps do not pull the mean under the target). Returns (albedo, mean)."""
    lin = srgb_to_linear(alb[..., :3]).astype(np.float64)
    if not cov.any():
        return alb, [0.0, 0.0, 0.0]
    for _ in range(rounds):
        m = lin[cov].mean(axis=0)
        lin = np.clip(lin * (want / np.maximum(m, 1e-6)), 0.0, 1.0)
    out = alb.copy()
    out[..., :3] = linear_to_srgb(lin).astype(np.float32)
    return out, albedo_mean(out, cov)


def albedo_mean(alb, cov):
    """The linear mean RGB of an sRGB-encoded albedo over the covered texels (the bake report's `albedoMean`)."""
    if not cov.any():
        return [0.0, 0.0, 0.0]
    return [round(float(v), 4) for v in srgb_to_linear(alb[..., :3])[cov].mean(axis=0)]


def load_png(path, data):
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    a = pixels(img)
    bpy.data.images.remove(img)
    return a


def save_png(arr, path, name, data, alpha):
    h, w = arr.shape[:2]
    img = new_image(name, w, h, data, alpha)
    full = arr if arr.shape[2] == 4 else np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    img.pixels.foreach_set(np.ascontiguousarray(full, np.float32).ravel())
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img


# ---------------------------------------------------------------- baking (one piece, one LOD)
RAYS = ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow')


class Baker:
    """Bakes a target LOD mesh from its source piece into rect-sized images (selected to active), with only the
    source (and the occluders named) renderable, so pieces sharing space never bake into each other."""

    def __init__(self, scene, samples):
        self.scene = scene
        self.samples = samples
        self.mat = bpy.data.materials.new('guard-bake-target')
        self.mat.use_nodes = True
        self.node = self.mat.node_tree.nodes.new('ShaderNodeTexImage')
        self.node.name = 'bake'
        self.mat.node_tree.nodes.active = self.node
        self.swaps = None

    def isolate(self, shown):
        keep = set(o.name for o in shown)
        for o in bpy.data.objects:
            if o.type == 'MESH':
                o.hide_render = o.name not in keep

    def bake(self, kind, target, source, occluders, img, cage, samples=4):
        self.isolate([target, source, *occluders])
        for a in RAYS:
            setattr(target, a, False)
        target.data.materials.clear()
        target.data.materials.append(self.mat)
        self.node.image = img
        self.mat.node_tree.nodes.active = self.node
        activate([target, source], target)
        self.scene.cycles.samples = samples
        margin = max(2, min(img.size) // 64)
        kw = dict(type=kind, use_selected_to_active=True, cage_extrusion=cage, max_ray_distance=cage * 3, margin=margin,
                  margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES', uv_layer='atlas')
        if kind == 'NORMAL':
            kw.update(normal_space='TANGENT', normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z')
        bpy.ops.object.bake(**kw)

    # the source materials' Principled BSDFs routed to an Emission (albedo pass, roughness / metal / coverage pass)
    def swap_in(self, sources):
        if self.swaps is not None:
            return
        self.swaps = []
        seen = set()
        for s in sources:
            for mat in s.data.materials:
                if not mat or not mat.use_nodes or mat.name in seen:
                    continue
                seen.add(mat.name)
                nt = mat.node_tree
                for p in [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED']:
                    em = nt.nodes.new('ShaderNodeEmission')
                    em.inputs['Strength'].default_value = 1.0
                    cc = nt.nodes.new('ShaderNodeCombineColor')
                    for lk in list(p.outputs['BSDF'].links):
                        nt.links.new(em.outputs['Emission'], lk.to_socket)
                    self.swaps.append((nt, p, em, cc))

    def feed(self, which):
        for nt, p, em, cc in self.swaps:
            for lk in list(em.inputs['Color'].links):
                nt.links.remove(lk)
            if which == 'albedo':
                s = p.inputs['Base Color']
                if s.is_linked:
                    nt.links.new(s.links[0].from_socket, em.inputs['Color'])
                else:
                    v = s.default_value
                    em.inputs['Color'].default_value = (v[0], v[1], v[2], 1.0)
                continue
            for i, name in enumerate(('Roughness', 'Metallic')):
                s = p.inputs[name]
                for lk in list(cc.inputs[i].links):
                    nt.links.remove(lk)
                if s.is_linked:
                    nt.links.new(s.links[0].from_socket, cc.inputs[i])
                else:
                    cc.inputs[i].default_value = float(s.default_value)
            cc.inputs[2].default_value = 1.0
            nt.links.new(cc.outputs['Color'], em.inputs['Color'])


# ---------------------------------------------------------------- the base
def run_base(args, kit, L):
    b = L['base']
    out = args.out
    bodies = os.path.join(out, 'bodies')
    body_blend = os.path.join(bodies, f'guard-{b}-body.blend')
    with open(os.path.join(bodies, f'guard-{b}-body.json'), encoding='utf-8') as f:
        BR = json.load(f)
    bpy.ops.wm.open_mainfile(filepath=body_blend)
    common.seed_everything(args.seed)
    scene = bpy.context.scene
    device = use_gpu(scene)
    if scene.world is None:
        scene.world = bpy.data.worlds.new('bake')
    scene.world.light_settings.distance = 0.05
    log(b, 'device', device)
    rig = bpy.data.objects[f'guard-{b}-rig']
    body = bpy.data.objects[f'guard-{b}-body']
    href = bpy.data.objects.get(f'guard-{b}-headref')
    if href is not None:
        bpy.data.objects.remove(href, do_unlink=True)
    lod_bones = BR.get('lodBones')
    lod_bones_from = 'body report'
    if not lod_bones:   # a body baked before G1 wrote `lodBones`: the same lists from the kit
        lod_bones = U.lod_bones_from_kit(kit['bones'])
        lod_bones_from = 'kit (the body report has no lodBones)'
        log('lodBones from the kit')
    fold = lod_bones.get('fold', {})
    influences = lod_bones.get('influences', L.get('influences', [4, 4, 2]))
    piece_index = {p: i for i, p in enumerate(L['pieces'])}
    slot = {s: i for i, s in enumerate(L['tintSlots'])}
    NONE = slot['none']

    # body source (world coordinates) with the procedural skin; full weights table for nearest-vertex skinning
    import guard_skin
    body_src = evaluated_copy(body, f'src-{b}-body')
    body_src.data.materials.clear()
    skin_mat, _ = guard_skin.skin(f'guard-{b}-body-skin', 'clean')
    body_src.data.materials.append(skin_mat)
    body_w = weights_of(body)
    for g in body.vertex_groups:
        if g.name not in body_src.vertex_groups:
            body_src.vertex_groups.new(name=g.name)
    body_co = world_co(body)
    kd_body = KDTree(len(body_co))
    for i, p in enumerate(body_co):
        kd_body.insert(Vector(p), i)
    kd_body.balance()
    seam_idx = BR['neckSeam']['bodyVerts']
    seam_mh = [int(v) for v in BR['neckSeam']['mhVerts']]   # same order as bodyVerts
    seam_pts = body_co[seam_idx]
    body.hide_render = True

    def seam_pairing(o, kind):
        """(pair, snap) of a body / head LOD mesh onto the seam slots: by hm08 index (`_mh` on the body, `mh_index` on
        G1h's heads; eye faces never pair), by position when the mesh carries no index."""
        me = o.data
        co = world_co(o)
        mh = int_point_attr(me, '_mh' if kind == 'body' else 'mh_index')
        if mh is None:
            pair = U.seam_pairs(co, seam_pts, SEAM_TOL if kind == 'head' else 1e-5)
            snap = np.full(len(seam_pts), np.inf)
            for i, j in enumerate(pair):
                if j >= 0:
                    snap[j] = float(np.linalg.norm(co[i] - seam_pts[j]))
            return pair, snap, 'position'
        ok = np.ones(len(me.vertices), bool)
        if kind == 'head':
            mi = np.zeros(len(me.polygons), np.int32)
            me.polygons.foreach_get('material_index', mi)
            for p in me.polygons:
                if mi[p.index] == 1:
                    ok[list(p.vertices)] = False
        pair, snap = U.seam_pairs_mh(mh, co, seam_mh, seam_pts, ok)
        return pair, snap, 'mh'

    # ---- the pieces' sources
    heads = {}
    for h in L['heads']:
        hid = h['id']
        got = append(os.path.join(out, 'heads', f'guard-{hid}-head.blend'),
                     lambda n, hid=hid: n.startswith(f'guard-{hid}-head-lod') or n in (f'guard-{hid}-eyeL-lod0', f'guard-{hid}-eyeR-lod0'))
        if not got:
            note(f'head {hid}: heads/guard-{hid}-head.blend missing: left out')
            continue
        heads[hid] = got
    caps = {}
    if L['caps']:
        got = append(os.path.join(out, 'heads', f'guard-{b}-haircaps.blend'), lambda n: n.startswith(f'guard-{b}-cap-'))
        if not got:
            note(f'hair caps: heads/guard-{b}-haircaps.blend missing: left out')
        caps = got
    garments = {}
    for g in L['garments']:
        part = g['part']
        path = os.path.join(out, 'garments', f'guard-{b}-{part}.blend')
        got = append(path, lambda n, part=part: n == f'guard-{b}-{part}' or n.startswith(f'guard-{b}-{part}-'))
        shown = [o for o in got.values() if o.type == 'MESH' and o.name != f'guard-{b}-{part}' and not o.hide_render]
        if not shown:
            note(f'garment {part}: {os.path.relpath(path, out)} missing (G2 not baked yet): left out; outfits {g["outfits"]} miss it')
            for o in got.values():
                bpy.data.objects.remove(o, do_unlink=True)
            continue
        src = join([evaluated_copy(o, f'src-{b}-{part}-{o.name}') for o in shown], f'src-{b}-garment-{part}')
        weld(src.data)
        for o in got.values():
            bpy.data.objects.remove(o, do_unlink=True)
        garments[part] = src
    gear = {}
    for gp in L['gear']:
        pid = gp['id']
        got = append(os.path.join(out, 'gear', f'guard-{b}-{pid}.blend'), lambda n, pid=pid: n == f'guard-{b}-{pid}')
        o = got.get(f'guard-{b}-{pid}')
        if o is None:
            note(f'gear {pid}: gear/guard-{b}-{pid}.blend missing: left out')
            continue
        src = evaluated_copy(o, f'src-{b}-piece-{pid}')
        bpy.data.objects.remove(o, do_unlink=True)
        gear[pid] = src
    log('sources:', len(heads), 'heads,', len(caps), 'cap objects,', len(garments), 'garment parts,', len(gear), 'gear pieces')

    # ---- (G10a D6) heads whose kinds all wear the balaclava for good (faceCovered, SPEC A14): the head's front pokes
    # through the membrane (the 20-column ring cuts inside the nose, lips and chin; the throat rows ride the neck), which
    # showed skin from brow to chin. A head sample point is hidden when it pokes out (the segment from it to the head's
    # centre crosses the balaclava) or its outward ray meets the balaclava at all (only the eye slot lets a ray out);
    # every face whose sample points (centre and 0.8-inset corners, the body cover test's) are all hidden is dropped.
    # One ring of margin comes back around what stays, never a poking face; the eyes and the seam ring (the body weld)
    # always stay. (Measured on the bundled broad LOD0: the head seen in front of the balaclava below the eye slot
    # went from the whole centre column, brow to chin, to a few cells at the jaw.)
    covered_report = {}
    bal = gear.get('balaclava')
    for hid, got in heads.items():
        kinds = [k for k in kit.get('kinds', []) if hid in (k.get('heads') or [])]
        if not kinds or not all(k.get('faceCovered') for k in kinds):
            continue
        if bal is None:
            note(f'head {hid}: face covered but no balaclava built: head kept whole')
            continue
        bco = world_co(bal)
        tree = BVHTree.FromPolygons([Vector(p) for p in bco], [list(p.vertices) for p in bal.data.polygons])
        for lod in LODS:
            o = got.get(f'guard-{hid}-head-lod{lod}')
            if o is None:
                continue
            me = o.data
            mw = o.matrix_world
            rot = mw.to_3x3()
            mi = np.zeros(len(me.polygons), np.int32)
            me.polygons.foreach_get('material_index', mi)
            seam = seam_pairing(o, 'head')[0] >= 0
            centre = Vector(world_co(o).mean(axis=0))

            def pokes(q):
                d = centre - q
                return tree.ray_cast(q, d.normalized(), d.length)[0] is not None
            covered = np.zeros(len(me.polygons), bool)
            poking = np.zeros(len(me.polygons), bool)
            for p in me.polygons:
                if mi[p.index] == 1 or seam[list(p.vertices)].any():
                    continue
                c = mw @ p.center
                n = (rot @ p.normal).normalized()
                pts = [c] + [c + ((mw @ me.vertices[v].co) - c) * 0.8 for v in p.vertices]
                outside = [pokes(q) for q in pts]
                poking[p.index] = any(outside)
                covered[p.index] = all(o_ or tree.ray_cast(q + n * 0.0005, n, HEAD_COVER_REACH)[0] is not None
                                       for q, o_ in zip(pts, outside))
            vis_v = np.zeros(len(me.vertices), bool)
            for p in me.polygons:
                if not covered[p.index]:
                    vis_v[list(p.vertices)] = True
            keep = np.array([not covered[p.index] or (not poking[p.index] and vis_v[list(p.vertices)].any())
                             for p in me.polygons])
            tris = lambda m: [len(p.vertices) - 2 for p in m.polygons]   # noqa: E731
            t_all = sum(tris(me))
            drop_faces(o, keep)
            t_kept = sum(tris(o.data))
            covered_report.setdefault(f'lod{lod}', {})[hid] = {'dropped': t_all - t_kept, 'kept': t_kept}
            log(f'head {hid} LOD{lod}: {t_all - t_kept} of {t_all} tris under the balaclava dropped')

    # ---- the visible body: faces some outfit leaves uncovered (+ one ring)
    body0 = duplicate(body_src, f'g-{b}-body-lod0')
    outfit_trees = []
    for o in L['outfits']:
        parts = [garments[p] for p in o['parts'] if p in garments]
        if not parts:
            continue
        verts, polys = [], []
        for s in parts:
            base_i = len(verts)
            verts.extend(Vector(p) for p in world_co(s))
            polys.extend([base_i + v for v in p.vertices] for p in s.data.polygons)
        outfit_trees.append((o['id'], BVHTree.FromPolygons(verts, polys)))
    me = body0.data
    if outfit_trees:
        visible = np.zeros(len(me.polygons), bool)
        for oid, tree in outfit_trees:
            for p in me.polygons:
                if visible[p.index]:
                    continue
                n = p.normal
                c = p.center
                pts = [c] + [c + (me.vertices[v].co - c) * 0.8 for v in p.vertices]
                if any(tree.ray_cast(q + n * 0.0005, n, COVER_REACH)[0] is None for q in pts):
                    visible[p.index] = True
        # one ring of margin (cuffs, collars)
        vv = np.zeros(len(me.vertices), bool)
        for p in me.polygons:
            if visible[p.index]:
                vv[list(p.vertices)] = True
        keep = np.array([visible[p.index] or vv[list(p.vertices)].any() for p in me.polygons])
        # the seam ring always stays (the heads weld to it)
        seam_set = set(seam_idx)
        keep |= np.array([any(v in seam_set for v in p.vertices) for p in me.polygons])
        drop_faces(body0, keep)
        log('body: visible under the outfits', int(keep.sum()), 'of', len(keep), 'faces')
    else:
        note('body: no garment built for any outfit: the whole body is kept (over its budget until G2 lands)')
    keepg = body0.vertex_groups.new(name='g4-keep')
    on_seam = seam_pairing(body0, 'body')[0] >= 0
    for i in range(len(on_seam)):
        keepg.add([i], 0.0 if on_seam[i] else 1.0, 'REPLACE')

    # ---- LOD meshes per piece: {lod: [record]}; record = dict(obj, piece, kind, region, tint, source)
    records = {lod: [] for lod in LODS}
    bake_jobs = []  # (lod, record) for procedural pieces

    def add(lod, obj, piece, kind, region, tint, source=None, copy=False, occluders=()):
        r = {'obj': obj, 'piece': piece, 'kind': kind, 'region': region, 'tint': tint, 'source': source, 'copy': copy,
             'occluders': list(occluders)}
        records[lod].append(r)
        if source is not None:
            bake_jobs.append((lod, r))
        return r

    first_outfit = next((o for o in L['outfits'] if any(p in garments for p in o['parts'])), None)
    ctx_occluders = [garments[p] for p in (first_outfit['parts'] if first_outfit else []) if p in garments]

    # body
    budget = L['body']['tris']
    if not outfit_trees:
        budget = [max(t, int(tri_count(body0.data) * k)) for t, k in zip(budget, (0.25, 0.08, 0.03))]
    prev = body0
    for lod in LODS:
        o = prev if lod == 0 else duplicate(prev, f'g-{b}-body-lod{lod}')
        if lod == 0:
            o.vertex_groups.active = o.vertex_groups['g4-keep']
        decimate(o, budget[lod], 'g4-keep')
        add(lod, o, b, 'body', 'body', 'skin', body_src, occluders=ctx_occluders)
        prev = o

    # garments: one LOD chain per part, copied per outfit piece at assembly
    for g in L['garments']:
        src = garments.get(g['part'])
        if src is None:
            continue
        prev = src
        for lod in LODS:
            o = duplicate(prev, f'g-{b}-garment-{g["part"]}-lod{lod}')
            n = decimate_piece(o, g['tris'][lod], f'garment {g["part"]} LOD{lod}')
            copy = lod == 0 and n == tri_count(src.data)
            occ = [s for s in ctx_occluders if s is not src] + [body_src]
            add(lod, o, None, 'garment', f'garment:{g["part"]}', g['partTint'], src, copy=copy, occluders=occ)
            prev = o

    # gear
    for gp in L['gear']:
        src = gear.get(gp['id'])
        if src is None:
            continue
        prev = src
        for lod in LODS:
            o = duplicate(prev, f'g-{b}-piece-{gp["id"]}-lod{lod}')
            n = decimate_piece(o, gp['tris'][lod], f'gear {gp["id"]} LOD{lod}')
            add(lod, o, gp['id'], 'gear', gp['region'], None, src, copy=(lod == 0 and n == tri_count(src.data)))
            prev = o

    # heads, eyes (prebaked tiles)
    for hid, got in heads.items():
        for lod in LODS:
            o = got.get(f'guard-{hid}-head-lod{lod}')
            if o is None:
                note(f'head {hid}: no LOD{lod} object')
                continue
            add(lod, o, hid, 'head', f'head:{hid}', 'skin')
        for s in 'LR':
            e = got.get(f'guard-{hid}-eye{s}-lod0')
            if e is not None:
                add(0, e, hid, 'eye', 'eyes', 'none')
    # hair caps
    for c in L['caps']:
        for lod in (0, 1):
            o = caps.get(f'guard-{b}-cap-{c["id"]}-lod{lod}')
            if o is None:
                if caps:
                    note(f'cap {c["id"]}: no LOD{lod} object')
                continue
            add(lod, o, c['id'], 'cap', f'cap:{c["id"]}', 'hair')

    # ---- bake the procedural pieces into rect images
    baker = Baker(scene, args.samples)
    rects = {lod: {k: rect_px(r['rect'], lod, L) for k, r in L['regions'].items()} for lod in LODS}
    baked = {}   # (lod, region) -> dict(albedo, normal, orm) arrays
    for lod, r in bake_jobs:
        unwrap_local(r['obj'])
    t_bake = time.time()
    imgs = {}
    for lod, r in bake_jobs:
        key = (lod, r['region'])
        if key in imgs:
            continue
        w, h = rects[lod][r['region']][2:]
        nm = f'bake-{b}-{r["region"]}-lod{lod}'.replace(':', '-')
        imgs[key] = {'normal': new_image(nm + '-normal', max(4, w // 2), max(4, h // 2), True),
                     'ao': new_image(nm + '-ao', max(4, w // 2), max(4, h // 2), True),
                     'albedo': new_image(nm + '-albedo', max(4, w), max(4, h), False),
                     'rm': new_image(nm + '-rm', max(4, w // 2), max(4, h // 2), True)}
    done = set()
    for lod, r in bake_jobs:      # passes 1-2: the source's own shading (bump) and occlusion
        key = (lod, r['region'])
        if key in done:
            continue
        done.add(key)
        cage = COPY_CAGE if r['copy'] else CAGE[lod]
        baker.bake('NORMAL', r['obj'], r['source'], [], imgs[key]['normal'], cage, 4)
        baker.bake('AO', r['obj'], r['source'], r['occluders'], imgs[key]['ao'], cage, args.samples)
    baker.swap_in([r['source'] for _, r in bake_jobs])
    for which, ik in (('albedo', 'albedo'), ('rm', 'rm')):
        baker.feed(which)
        done = set()
        for lod, r in bake_jobs:
            key = (lod, r['region'])
            if key in done:
                continue
            done.add(key)
            cage = COPY_CAGE if r['copy'] else CAGE[lod]
            baker.bake('EMIT', r['obj'], r['source'], [], imgs[key][ik], cage, 2)
    rec_of = {}
    for lod, r in bake_jobs:
        rec_of.setdefault((lod, r['region']), r)
    fabric = float((kit.get('tintNeutral') or {}).get('fabric', 0.4))
    for key, im in imgs.items():
        nrm = pixels(im['normal'])
        ao = pixels(im['ao'])
        alb = pixels(im['albedo'])
        rm = pixels(im['rm'])
        cov = rm[..., 2] > 0.5      # coverage: the rm pass emits B = 1 on every source surface it reaches
        orm = np.stack([ao[..., 0], rm[..., 0], rm[..., 1], np.ones_like(ao[..., 0])], axis=2)
        orm = U.fill_missed(orm, cov)
        nrm = U.fill_missed(nrm, cov, (0.5, 0.5, 1.0, 1.0))
        cov_alb = U.resize(cov[..., None].astype(np.float32), alb.shape[1], alb.shape[0])[..., 0] > 0.5
        alb = U.fill_missed(alb, cov_alb)
        rec = rec_of[key]
        if rec['kind'] == 'garment' and rec['tint'] in FABRIC_SLOTS:
            part = key[1].split(':', 1)[1]
            want = fabric * (LEGS_SHARE if part in LEG_PARTS else 1.0)
            before = albedo_mean(alb, cov_alb)
            alb, mean = albedo_to_neutral(alb, cov_alb, want)
            log(f'{key[1]} LOD{key[0]}: albedo mean {before} -> {mean} (fabric neutral {want:.3f})')
        else:
            mean = albedo_mean(alb, cov_alb)
        bad = cov & ((nrm[..., 2] * 2 - 1) < 0.35)   # rays that met an edge wall: flatten (bake_lods.py rule)
        nrm[bad] = (0.5, 0.5, 1.0, 1.0)
        baked[key] = {'albedo': alb, 'normal': nrm, 'orm': orm, 'coverage': round(float(cov.mean()), 3), 'albedoMean': mean}
        for k in im.values():
            bpy.data.images.remove(k)
    log('baked', len(baked), 'piece rects in', round(time.time() - t_bake, 1), 's')

    # ---- prebaked tiles (G1h): face tiles, caps, eye block, resized per LOD
    tiles = {}
    for hid in heads:
        tiles[f'head:{hid}'] = {k: load_png(os.path.join(out, 'heads', f'guard-{hid}-face-{k}.png'), k != 'albedo') for k in ('albedo', 'normal', 'orm')}
    for c in L['caps']:
        tiles[f'cap:{c["id"]}'] = {k: load_png(os.path.join(out, 'heads', f'guard-{b}-cap-{c["id"]}-{k}.png'), k != 'albedo') for k in ('albedo', 'normal', 'orm')}
    tiles['eyes'] = {k: load_png(os.path.join(out, 'heads', f'guard-{b}-eyes-{k}.png'), k != 'albedo') for k in ('albedo', 'normal', 'orm')}
    for reg, t in tiles.items():
        for k, v in t.items():
            if v is None and (reg != 'eyes' or heads):
                note(f'{reg}: {k} tile PNG missing (filled flat)')

    # ---- per LOD: UVs into the atlas, attributes, weights, the seam weld, assembly, export
    seam_far = set()
    report = {'base': b, 'device': device, 'notes': NOTES, 'lods': [], 'leftScale': L.get('leftScale', 1),
              'lodBonesFrom': lod_bones_from,
              'garmentsBuilt': sorted(garments), 'gearBuilt': sorted(gear), 'headsBuilt': sorted(heads)}
    lods_dir = os.path.join(out, 'lods')
    tex_dir = os.path.join(lods_dir, 'textures')
    os.makedirs(tex_dir, exist_ok=True)
    buzz = None
    if L['caps']:
        cid = 'buzz' if any(c['id'] == 'buzz' for c in L['caps']) else L['caps'][0]['id']
        bz = caps.get(f'guard-{b}-cap-{cid}-lod1') or caps.get(f'guard-{b}-cap-{cid}-lod0')
        if bz is not None:
            bm = bmesh.new()
            bm.from_mesh(bz.data)
            bm.transform(bz.matrix_world)
            buzz = BVHTree.FromBMesh(bm)
            bm.free()

    for lod in LODS:
        W, H = L['atlas'][lod]
        NW, NH = L['normal'][lod]
        gut = max(1, int(round(8 * L['lodScale'][lod])))
        alb = np.zeros((H, W, 4), np.float32)
        alb[..., :3] = 0.45
        nrm = np.zeros((NH, NW, 4), np.float32)
        nrm[...] = (0.5, 0.5, 1.0, 1.0)
        orm = np.zeros((NH, NW, 4), np.float32)
        orm[...] = (1.0, 0.75, 0.0, 1.0)
        kx, ky = NW / W, NH / H
        # images into their rects
        for reg, rect in rects[lod].items():
            x, y, w, h = rect
            src = baked.get((lod, reg)) or tiles.get(reg)
            if not src:
                continue
            for k, dst, sx, sy in (('albedo', alb, 1, 1), ('normal', nrm, kx, ky), ('orm', orm, kx, ky)):
                im = src.get(k)
                if im is None:
                    continue
                tw, th = max(1, int(round(w * sx))), max(1, int(round(h * sy)))
                im = U.resize(im, tw, th)
                if k == 'normal':
                    im = U.renormalize(im)
                U.place(dst, im, int(round(x * sx)), int(round(y * sy)), max(1, int(round(gut * min(sx, sy)))))
        alb[..., 3] = 0.0
        objs = []
        tri_by_piece = {}
        mask_tris, mask_vals = [], []
        seam_kept = {}
        seam_snap = {}
        seam_how = {}
        for r in records[lod]:
            src_obj = r['obj']
            pieces = [r['piece']] if r['kind'] != 'garment' else [o['id'] for o in L['outfits'] if r['region'][8:] in o['parts']]
            for k, pid in enumerate(pieces):
                o = duplicate(src_obj, f'asm-{b}-lod{lod}-{src_obj.name}-{pid}')
                me = o.data
                triangulate(me)
                # UV into the atlas
                if r['kind'] in ('body', 'garment', 'gear'):
                    uv = uv_array(me, 'atlas')
                    off, sc = rect_uv(rects[lod][r['region']], W, H)
                    uv = U.uv_to_rect(uv, off, sc)
                else:
                    uv = uv_array(me, 'face') if 'face' in me.uv_layers else np.zeros((len(me.loops), 2))
                    mi = np.zeros(len(me.polygons), np.int32)
                    me.polygons.foreach_get('material_index', mi)
                    loop_mi = np.repeat(mi, [len(p.vertices) for p in me.polygons])
                    reg_main = r['region'] if r['kind'] != 'eye' else 'eyes'
                    off, sc = rect_uv(rects[lod][reg_main], W, H)
                    eoff, esc = rect_uv(rects[lod]['eyes'], W, H)
                    is_eye = (loop_mi == 1) if r['kind'] == 'head' else np.zeros(len(uv), bool)
                    uv = np.where(is_eye[:, None], U.uv_to_rect(uv, eoff, esc), U.uv_to_rect(uv, off, sc))
                set_only_uv(me, uv)
                # tint per vertex
                nv = len(me.vertices)
                if r['kind'] == 'gear':
                    t_src = point_attr(r['source'].data, '_TINT')
                    tint = nearest_values(o, r['source'], t_src if t_src is not None else np.full(len(r['source'].data.vertices), slot[pid_tint(L, pid)]))
                elif r['kind'] == 'head':
                    tint = np.full(nv, slot['skin'], np.float32)
                    mi = np.zeros(len(me.polygons), np.int32)
                    me.polygons.foreach_get('material_index', mi)
                    for p in me.polygons:
                        if mi[p.index] == 1:
                            tint[list(p.vertices)] = NONE
                    if lod == 2 and buzz is not None:   # hair in the albedo: the scalp takes the hair slot
                        co = world_co(o)
                        for i in range(nv):
                            hit = buzz.find_nearest(Vector(co[i]), SCALP_REACH)
                            if hit[0] is not None and tint[i] != NONE:
                                tint[i] = slot['hair']
                else:
                    tint = np.full(nv, slot[r['tint']], np.float32)
                set_point_attr(me, '_TINT', tint)
                set_point_attr(me, '_PIECE', np.full(nv, piece_index[pid], np.float32))
                # weights
                if r['kind'] == 'garment':
                    rows = [body_w[kd_body.find(Vector(p))[1]] for p in world_co(o)]
                elif r['kind'] == 'gear':
                    rows = nearest_rows(o, r['source'])
                else:
                    rows = weights_of(o)
                    if r['kind'] in ('head', 'eye', 'cap'):
                        rows = [w if w else {'head': 1.0} for w in rows]
                bones = lod_bones[f'lod{lod}']
                rows = U.fold_weights(rows, bones, fold, influences[lod])
                # the neck weld (lead ruling X2): head seam vertices paired with the body's seam ring by hm08 index, no
                # transform (G1h builds the heads in G1's body frame); the pair takes the body vertex's exact position
                # and skin weights, so the two pieces close without a crack (they stay separate vertices: G5 groups by
                # piece). A head whose seam sits off the body's (`seamSnapMm` > SEAM_TOL) is a bake note.
                if r['kind'] in ('body', 'head'):
                    pair, snap, how = seam_pairing(o, r['kind'])
                    seam_how[r['kind']] = how
                    if r['kind'] == 'body':
                        seam_rows = {int(j): rows[i] for i, j in enumerate(pair) if j >= 0}
                        report.setdefault('_seamRows', {})[lod] = seam_rows
                        seam_kept['body'] = int((pair >= 0).sum())
                    else:
                        sr = report.get('_seamRows', {}).get(lod, {})
                        inv = np.linalg.inv(np.array(o.matrix_world))
                        n_weld = 0
                        for i, j in enumerate(pair):
                            if j < 0:
                                continue
                            p = inv @ np.array([*seam_pts[j], 1.0])
                            me.vertices[i].co = Vector(p[:3])
                            if j in sr:
                                rows[i] = dict(sr[j])
                            n_weld += 1
                        seam_kept[pid] = n_weld
                        fin = snap[np.isfinite(snap)]
                        worst = float(fin.max()) if len(fin) else 0.0
                        seam_snap[pid] = round(worst * 1000, 2)
                        if worst > SEAM_TOL and pid not in seam_far:
                            seam_far.add(pid)
                            note(f'head {pid}: seam {worst * 1000:.1f} mm off the body seam (welded by hm08 index; '
                                 f'built outside G1\'s body frame?)')
                set_weights(o, rows)
                # tint mask triangles (albedo alpha)
                uvl = uv_array(me, 'atlas')
                for p in me.polygons:
                    ls = list(p.loop_indices)
                    mask_tris.append([[uvl[l][0] * W, uvl[l][1] * H] for l in ls[:3]])
                    mask_vals.append(0.0 if tint[me.loops[ls[0]].vertex_index] == NONE else 1.0)
                tri_by_piece[pid] = tri_by_piece.get(pid, 0) + tri_count(me)
                strip_attrs(me)
                me.materials.clear()
                objs.append(o)
        # tint mask into the albedo alpha (dilated so filtering at island edges keeps the island's value)
        mv, mc = U.raster(mask_tris, mask_vals, W, H)
        mv, mc = U.dilate(mv, mc, max(2, gut))
        alb[..., 3] = np.where(mc, mv, 0.0)
        stem = f'guard-{b}-lod{lod}'
        files = {}
        imgs_out = {}
        for k, arr, data, alpha in (('albedo', alb, False, True), ('normal', nrm, True, False), ('orm', orm, True, False)):
            path = os.path.join(tex_dir, f'{stem}-{k}.png')
            imgs_out[k] = save_png(arr, path, f'{stem}-{k}', data, alpha)
            files[k] = os.path.relpath(path, out).replace('\\', '/')
        final = join(objs, stem)
        mat = export_material(stem, imgs_out)
        final.data.materials.clear()
        final.data.materials.append(mat)
        final.data.shade_smooth()
        arm = lod_rig(rig, lod_bones[f'lod{lod}'], f'{stem}-rig')
        final.parent = arm
        final.matrix_parent_inverse = arm.matrix_world.inverted()
        final.modifiers.new('rig', 'ARMATURE').object = arm
        glb = os.path.join(lods_dir, f'{stem}.glb')
        export(arm, final, glb)
        report['lods'].append({'lod': lod, 'tris': tri_count(final.data), 'trisByPiece': tri_by_piece, 'textures': files,
                               'seamKept': seam_kept, 'seamSnapMm': seam_snap, 'seamBy': seam_how,
                               'bones': len(lod_bones[f'lod{lod}']), 'glb': os.path.relpath(glb, out).replace('\\', '/')})
        log('LOD', lod, tri_count(final.data), 'tris, pieces', len(tri_by_piece), 'seam', seam_kept)
        final.hide_render = True
    report.pop('_seamRows', None)
    report['bakeCoverage'] = {f'lod{k[0]}.{k[1]}': v['coverage'] for k, v in baked.items()}
    report['albedoMean'] = {f'lod{k[0]}.{k[1]}': v['albedoMean'] for k, v in baked.items()}   # linear, covered texels (G10a D3)
    report['coveredHeadTris'] = covered_report   # (G10a D6) per LOD, per face-covered head: tris dropped / kept
    report['seconds'] = round(time.time() - T0, 1)
    with open(os.path.join(lods_dir, f'guard-{b}.bake.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(lods_dir, f'guard-{b}-lods.blend'), compress=True)
    log('done', b, [l['tris'] for l in report['lods']])


def pid_tint(L, pid):
    for g in L['gear']:
        if g['id'] == pid:
            return g['tint']
    return 'none'


def nearest_index(o, src):
    sc = world_co(src)
    kd = KDTree(len(sc))
    for i, p in enumerate(sc):
        kd.insert(Vector(p), i)
    kd.balance()
    return [kd.find(Vector(p))[1] for p in world_co(o)]


def nearest_values(o, src, values):
    idx = nearest_index(o, src)
    return np.asarray(values, np.float32)[idx]


def nearest_rows(o, src):
    rows = weights_of(src)
    return [dict(rows[i]) for i in nearest_index(o, src)]


def rect_px(rect, lod, L):
    k = L['lodScale'][lod] if 'lodScale' in L else 1.0 / (1 << lod)
    if L.get('piece'):
        return [int(v) >> lod for v in rect]
    return [int(round(v * k)) for v in rect]


def rect_uv(rect, W, H):
    x, y, w, h = rect
    return (x / W, y / H), (w / W, h / H)


def lod_rig(rig, bones, name):
    arm = rig.copy()
    arm.data = rig.data.copy()
    arm.name = arm.data.name = name
    link(arm)
    arm.hide_viewport = False
    activate([arm])
    bpy.ops.object.mode_set(mode='EDIT')
    keep = set(bones)
    for eb in list(arm.data.edit_bones):
        if eb.name not in keep:
            arm.data.edit_bones.remove(eb)
    bpy.ops.object.mode_set(mode='OBJECT')
    for bn in arm.data.bones:
        bn.use_deform = True
    missing = keep - {bn.name for bn in arm.data.bones}
    if missing:
        raise SystemExit(f'{name}: bones of the body report missing from the rig: {sorted(missing)}')
    return arm


GLTF_OUT = None


def export_material(name, imgs):
    """Principled over the atlas (bake_lods.py finish_material's wiring: ORM R occlusion through the glTF Material
    Output group, G roughness, B metal), so the exporter writes one material with three textures."""
    global GLTF_OUT
    if GLTF_OUT is None:
        GLTF_OUT = bpy.data.node_groups.get('glTF Material Output')
        if GLTF_OUT is None:
            GLTF_OUT = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
            GLTF_OUT.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    uv = nt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'atlas'
    t = {}
    for k in ('albedo', 'orm', 'normal'):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = imgs[k]
        nt.links.new(uv.outputs['UV'], n.inputs['Vector'])
        t[k] = n
    nt.links.new(t['albedo'].outputs['Color'], bsdf.inputs['Base Color'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(t['orm'].outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.uv_map = 'atlas'
    nt.links.new(t['normal'].outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    go = nt.nodes.new('ShaderNodeGroup')
    go.node_tree = GLTF_OUT
    nt.links.new(sep.outputs['Red'], go.inputs['Occlusion'])
    return mat


def export(arm, obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in (arm, obj):
        o.hide_viewport = False
        o.hide_render = False
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_skins=True, export_def_bones=False, export_influence_nb=4, export_normals=True, export_tangents=True,
        export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_animations=False,
        export_cameras=False, export_lights=False, export_extras=False, export_attributes=True)
    for o in (arm, obj):
        o.select_set(False)


# ---------------------------------------------------------------- an own-GLB piece (the riot shield)
def run_piece(args, kit, L):
    pid = L['piece']
    out = args.out
    entry = next(p for p in kit['pieces'] if p['id'] == pid)
    base = entry.get('bakeBase') or 'broad'   # G3 builds the shield in the broad base's bind pose (pieces.SHIELD_BASE)
    gear_blend = os.path.join(out, 'gear', f'guard-{pid}.blend')
    if not os.path.exists(gear_blend):
        raise SystemExit(f'{gear_blend} missing: run the gear stage first')
    body_blend = os.path.join(out, 'bodies', f'guard-{base}-body.blend')
    if not os.path.exists(body_blend):
        raise SystemExit(f'{body_blend} missing: the shield skins on the {base} rig (run the bodies stage first)')
    bpy.ops.wm.open_mainfile(filepath=body_blend)
    common.seed_everything(args.seed)
    scene = bpy.context.scene
    device = use_gpu(scene)
    if scene.world is None:
        scene.world = bpy.data.worlds.new('bake')
    scene.world.light_settings.distance = 0.05
    rig = bpy.data.objects[f'guard-{base}-rig']
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    got = append(gear_blend, lambda n: n == f'guard-{pid}')
    if f'guard-{pid}' not in got:
        raise SystemExit(f'{gear_blend}: no object guard-{pid}')
    src = evaluated_copy(got[f'guard-{pid}'], f'src-{pid}')
    bpy.data.objects.remove(got[f'guard-{pid}'], do_unlink=True)
    slot = {s: i for i, s in enumerate(L['tintSlots'])}
    baker = Baker(scene, args.samples)
    lods_dir = os.path.join(out, 'lods')
    tex_dir = os.path.join(lods_dir, 'textures')
    report = {'piece': pid, 'device': device, 'notes': NOTES, 'lods': []}
    region = f'piece:{pid}'
    targets = {}
    prev = src
    for lod in LODS:
        o = duplicate(prev, f'g-{pid}-lod{lod}')
        n = decimate_piece(o, L['tris'][lod], f'{pid} LOD{lod}')
        unwrap_local(o)
        targets[lod] = (o, lod == 0 and n == tri_count(src.data))
        prev = o
    imgs = {}
    for lod, (o, copy) in targets.items():
        W, H = L['atlas'][lod]
        x, y, w, h = rect_px(L['regions'][region]['rect'], lod, L)
        imgs[lod] = {'normal': new_image(f'b-{pid}-{lod}-n', max(4, w // 2), max(4, h // 2), True),
                     'ao': new_image(f'b-{pid}-{lod}-ao', max(4, w // 2), max(4, h // 2), True),
                     'albedo': new_image(f'b-{pid}-{lod}-a', max(4, w), max(4, h), False),
                     'rm': new_image(f'b-{pid}-{lod}-rm', max(4, w // 2), max(4, h // 2), True)}
        cage = COPY_CAGE if copy else CAGE[lod]
        baker.bake('NORMAL', o, src, [], imgs[lod]['normal'], cage, 4)
        baker.bake('AO', o, src, [], imgs[lod]['ao'], cage, args.samples)
    baker.swap_in([src])
    for which in ('albedo', 'rm'):
        baker.feed(which)
        for lod, (o, copy) in targets.items():
            baker.bake('EMIT', o, src, [], imgs[lod][which], COPY_CAGE if copy else CAGE[lod], 2)
    t_src = point_attr(src.data, '_TINT')
    for lod, (o, _copy) in targets.items():
        W, H = L['atlas'][lod]
        NW, NH = L['normal'][lod]
        x, y, w, h = rect_px(L['regions'][region]['rect'], lod, L)
        rm = pixels(imgs[lod]['rm'])
        cov = rm[..., 2] > 0.5
        orm = U.fill_missed(np.stack([pixels(imgs[lod]['ao'])[..., 0], rm[..., 0], rm[..., 1], np.ones_like(rm[..., 0])], axis=2), cov)
        nrm_im = U.fill_missed(pixels(imgs[lod]['normal']), cov, (0.5, 0.5, 1.0, 1.0))
        alb_im = pixels(imgs[lod]['albedo'])
        alb = np.zeros((H, W, 4), np.float32)
        alb[..., :3] = 0.45
        nrm = np.zeros((NH, NW, 4), np.float32)
        nrm[...] = (0.5, 0.5, 1.0, 1.0)
        orm_a = np.zeros((NH, NW, 4), np.float32)
        orm_a[...] = (1.0, 0.75, 0.0, 1.0)
        U.place(alb, alb_im, x, y, max(1, 8 >> lod))
        U.place(nrm, U.renormalize(U.resize(nrm_im, max(1, w // 2), max(1, h // 2))), x // 2, y // 2, max(1, 4 >> lod))
        U.place(orm_a, U.resize(orm, max(1, w // 2), max(1, h // 2)), x // 2, y // 2, max(1, 4 >> lod))
        me = o.data
        uv = U.uv_to_rect(uv_array(me, 'atlas'), (x / W, y / H), (w / W, h / H))
        set_only_uv(me, uv)
        tint = nearest_values(o, src, t_src) if t_src is not None else np.full(len(me.vertices), slot[L['tint']], np.float32)
        set_point_attr(me, '_TINT', tint)
        set_point_attr(me, '_PIECE', np.zeros(len(me.vertices), np.float32))
        rows = U.fold_weights(nearest_rows(o, src), L['bones'], {}, 4 if lod < 2 else 2)
        set_weights(o, rows)
        mt, mv = [], []
        for p in me.polygons:
            ls = list(p.loop_indices)
            mt.append([[uv[l][0] * W, uv[l][1] * H] for l in ls[:3]])
            mv.append(0.0 if tint[me.loops[ls[0]].vertex_index] == slot['none'] else 1.0)
        val, c = U.raster(mt, mv, W, H)
        val, c = U.dilate(val, c, 2)
        alb[..., 3] = np.where(c, val, 0.0)
        strip_attrs(me)
        stem = f'guard-{pid}-lod{lod}'
        out_imgs = {}
        files = {}
        for k, arr, data, alpha in (('albedo', alb, False, True), ('normal', nrm, True, False), ('orm', orm_a, True, False)):
            path = os.path.join(tex_dir, f'{stem}-{k}.png')
            out_imgs[k] = save_png(arr, path, f'{stem}-{k}', data, alpha)
            files[k] = os.path.relpath(path, out).replace('\\', '/')
        o.name = o.data.name = stem
        me.materials.clear()
        me.materials.append(export_material(stem, out_imgs))
        arm = lod_rig(rig, L['bones'], f'{stem}-rig')
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
        o.modifiers.new('rig', 'ARMATURE').object = arm
        glb = os.path.join(lods_dir, f'{stem}.glb')
        export(arm, o, glb)
        report['lods'].append({'lod': lod, 'tris': tri_count(me), 'textures': files, 'glb': os.path.relpath(glb, out).replace('\\', '/')})
        log('LOD', lod, tri_count(me), 'tris')
    report['seconds'] = round(time.time() - T0, 1)
    with open(os.path.join(lods_dir, f'guard-{pid}.bake.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)


def main():
    args = parse()
    common.check_version()
    with open(args.kit, encoding='utf-8') as f:
        kit = json.load(f)
    with open(args.layout, encoding='utf-8') as f:
        L = json.load(f)
    if bool(args.base) == bool(args.piece):
        raise SystemExit('bake_lods.py --guard: give exactly one of --base or --piece')
    if args.base and L.get('base') != args.base:
        raise SystemExit(f'layout {args.layout} is for base {L.get("base")}, not {args.base}')
    if args.piece and L.get('piece') != args.piece:
        raise SystemExit(f'layout {args.layout} is for piece {L.get("piece")}, not {args.piece}')
    os.makedirs(os.path.join(args.out, 'lods', 'textures'), exist_ok=True)
    if args.base:
        run_base(args, kit, L)
    else:
        run_piece(args, kit, L)
