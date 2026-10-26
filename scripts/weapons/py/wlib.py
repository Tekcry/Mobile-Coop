"""Weapon pipeline library (feature/weapons; run headless by scripts/weapons/build.mjs through scripts/operators/blender.mjs).

Geometry is authored in the game's weapon frame (metres: +X right, +Y up, +Z along the bore, as src/config/weapons.json)
and converted to Blender (Z up, the model faces -Y, its right on -X: common.game_to_blender). One game mesh per weapon:
modelled parts with bevels, joined, unwrapped, the procedural materials baked on the GPU into one texture set (albedo,
ORM: occlusion R / roughness G / metal B, tangent normal), written as a GLB by `write_glb` in the layout the game's GLB
reader expects (src/operators/lab/glb.ts). KTX2 encoding follows in Node (scripts/weapons/build.mjs).
"""
import json
import math
import os
import struct

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def G(x, y, z):
    """Weapon / game frame to Blender."""
    return Vector((-x, -z, y))


def g_of(v):
    """Blender to the weapon / game frame."""
    return (-v[0], v[2], -v[1])


# ---------------------------------------------------------------------------------------------------------- materials

MATS = {}
OUTS = {}  # material name -> (base, rough, metal) output sockets (the bake routes them to an emission shader)


def _n(nt, kind, loc=(0, 0), **inputs):
    node = nt.nodes.new(kind)
    node.location = loc
    for k, v in inputs.items():
        node.inputs[k].default_value = v
    return node


def material(name, base, rough, metal=0.0, wear=None, bump=None, noise=0.07, cavity=0.35, emissive=None):
    """A procedural PBR material for the bake.

    base: linear RGB; rough / metal: 0-1. wear: (rgb, metal, rough, amount): bare material on worn convex edges (the
    Bevel node against the true normal). bump: (kind, strength, scale) with kind 'noise' (fine grain), 'stipple'
    (grip texture), 'knurl' (diamond knurling), 'brush' (brushed along the weapon's z). noise: albedo / roughness
    variation amount. cavity: darkening in crevices (AO node).
    """
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    geo = _n(nt, 'ShaderNodeNewGeometry', (-1400, 200))
    tc = _n(nt, 'ShaderNodeTexCoord', (-1400, -200))
    # object-space coordinates (mm-scale features stay the same size on every part)
    nz = _n(nt, 'ShaderNodeTexNoise', (-1100, 300))
    nz.inputs['Scale'].default_value = 140.0
    nz.inputs['Detail'].default_value = 8.0
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    var = _n(nt, 'ShaderNodeMapRange', (-900, 300))
    var.inputs['From Min'].default_value = 0.3
    var.inputs['From Max'].default_value = 0.7
    var.inputs['To Min'].default_value = 1.0 - noise
    var.inputs['To Max'].default_value = 1.0 + noise
    nt.links.new(nz.outputs['Fac'], var.inputs['Value'])
    base_rgb = _n(nt, 'ShaderNodeRGB', (-900, 500))
    base_rgb.outputs[0].default_value = (*base, 1.0)
    col = _n(nt, 'ShaderNodeMix', (-700, 450))
    col.data_type = 'RGBA'
    col.blend_type = 'MULTIPLY'
    col.inputs['Factor'].default_value = 1.0
    nt.links.new(base_rgb.outputs[0], col.inputs['A'])
    nt.links.new(var.outputs['Result'], col.inputs['B'])
    r_mul = _n(nt, 'ShaderNodeMath', (-700, 150))
    r_mul.operation = 'MULTIPLY'
    r_mul.inputs[1].default_value = rough
    nt.links.new(var.outputs['Result'], r_mul.inputs[0])
    col_out, r_out = col.outputs['Result'], r_mul.outputs[0]
    m_val = _n(nt, 'ShaderNodeValue', (-700, 0))
    m_val.outputs[0].default_value = metal
    m_out = m_val.outputs[0]
    if cavity > 0:
        ao = _n(nt, 'ShaderNodeAmbientOcclusion', (-900, 700))
        ao.inputs['Distance'].default_value = 0.006
        ao.samples = 8
        ao.only_local = True
        cav = _n(nt, 'ShaderNodeMapRange', (-700, 700))
        cav.inputs['From Min'].default_value = 0.0
        cav.inputs['From Max'].default_value = 1.0
        cav.inputs['To Min'].default_value = 1.0 - cavity
        cav.inputs['To Max'].default_value = 1.0
        nt.links.new(ao.outputs['AO'], cav.inputs['Value'])
        c2 = _n(nt, 'ShaderNodeMix', (-500, 600))
        c2.data_type = 'RGBA'
        c2.blend_type = 'MULTIPLY'
        c2.inputs['Factor'].default_value = 1.0
        nt.links.new(col_out, c2.inputs['A'])
        nt.links.new(cav.outputs['Result'], c2.inputs['B'])
        col_out = c2.outputs['Result']
    if wear:
        w_rgb, w_metal, w_rough, amount = wear
        bev = _n(nt, 'ShaderNodeBevel', (-1100, -100))
        bev.samples = 8
        bev.inputs['Radius'].default_value = 0.0012
        dot = _n(nt, 'ShaderNodeVectorMath', (-900, -100))
        dot.operation = 'DOT_PRODUCT'
        nt.links.new(bev.outputs['Normal'], dot.inputs[0])
        nt.links.new(geo.outputs['True Normal'], dot.inputs[1])
        edge = _n(nt, 'ShaderNodeMapRange', (-700, -100))
        edge.inputs['From Min'].default_value = 0.985
        edge.inputs['From Max'].default_value = 0.90
        nt.links.new(dot.outputs['Value'], edge.inputs['Value'])
        # broken up by a coarser noise: chipped, not outlined
        n2 = _n(nt, 'ShaderNodeTexNoise', (-900, -300))
        n2.inputs['Scale'].default_value = 180.0
        n2.inputs['Detail'].default_value = 3.0
        nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
        n2r = _n(nt, 'ShaderNodeMapRange', (-700, -300))
        n2r.inputs['From Min'].default_value = 0.45
        n2r.inputs['From Max'].default_value = 0.6
        nt.links.new(n2.outputs['Fac'], n2r.inputs['Value'])
        mask = _n(nt, 'ShaderNodeMath', (-500, -200))
        mask.operation = 'MULTIPLY'
        nt.links.new(edge.outputs['Result'], mask.inputs[0])
        nt.links.new(n2r.outputs['Result'], mask.inputs[1])
        amt = _n(nt, 'ShaderNodeMath', (-350, -200))
        amt.operation = 'MULTIPLY'
        amt.use_clamp = True
        amt.inputs[1].default_value = amount
        nt.links.new(mask.outputs[0], amt.inputs[0])
        wc = _n(nt, 'ShaderNodeMix', (-200, 450))
        wc.data_type = 'RGBA'
        nt.links.new(amt.outputs[0], wc.inputs['Factor'])
        nt.links.new(col_out, wc.inputs['A'])
        wc.inputs['B'].default_value = (*w_rgb, 1.0)
        col_out = wc.outputs['Result']
        wr = _n(nt, 'ShaderNodeMix', (-200, 150))
        wr.data_type = 'FLOAT'
        nt.links.new(amt.outputs[0], wr.inputs['Factor'])
        nt.links.new(r_out, wr.inputs['A'])
        wr.inputs['B'].default_value = w_rough
        r_out = wr.outputs['Result']
        wm = _n(nt, 'ShaderNodeMix', (-200, 0))
        wm.data_type = 'FLOAT'
        nt.links.new(amt.outputs[0], wm.inputs['Factor'])
        nt.links.new(m_out, wm.inputs['A'])
        wm.inputs['B'].default_value = w_metal
        m_out = wm.outputs['Result']
    nt.links.new(col_out, bsdf.inputs['Base Color'])
    nt.links.new(r_out, bsdf.inputs['Roughness'])
    nt.links.new(m_out, bsdf.inputs['Metallic'])
    if bump:
        kind, strength, scale = bump
        if kind == 'stipple':
            tex = _n(nt, 'ShaderNodeTexVoronoi', (-900, -600))
            tex.inputs['Scale'].default_value = scale
            tex.feature = 'F1'
            nt.links.new(tc.outputs['Object'], tex.inputs['Vector'])
            h = tex.outputs['Distance']
        elif kind == 'knurl':
            # two crossed sine waves: a diamond knurl
            sep = _n(nt, 'ShaderNodeSeparateXYZ', (-1100, -600))
            nt.links.new(tc.outputs['Object'], sep.inputs[0])
            a = _n(nt, 'ShaderNodeMath', (-900, -550))
            a.operation = 'ADD'
            b = _n(nt, 'ShaderNodeMath', (-900, -700))
            b.operation = 'SUBTRACT'
            # around a cylinder along z: angle-free diamond from (x + y) and z
            xy = _n(nt, 'ShaderNodeMath', (-1000, -500))
            xy.operation = 'ADD'
            nt.links.new(sep.outputs['X'], xy.inputs[0])
            nt.links.new(sep.outputs['Y'], xy.inputs[1])
            nt.links.new(xy.outputs[0], a.inputs[0])
            nt.links.new(sep.outputs['Z'], a.inputs[1])
            nt.links.new(xy.outputs[0], b.inputs[0])
            nt.links.new(sep.outputs['Z'], b.inputs[1])
            s1 = _n(nt, 'ShaderNodeMath', (-750, -550))
            s1.operation = 'SINE'
            s2 = _n(nt, 'ShaderNodeMath', (-750, -700))
            s2.operation = 'SINE'
            k1 = _n(nt, 'ShaderNodeMath', (-850, -550))
            k1.operation = 'MULTIPLY'
            k1.inputs[1].default_value = scale
            k2 = _n(nt, 'ShaderNodeMath', (-850, -700))
            k2.operation = 'MULTIPLY'
            k2.inputs[1].default_value = scale
            nt.links.new(a.outputs[0], k1.inputs[0])
            nt.links.new(b.outputs[0], k2.inputs[0])
            nt.links.new(k1.outputs[0], s1.inputs[0])
            nt.links.new(k2.outputs[0], s2.inputs[0])
            mn = _n(nt, 'ShaderNodeMath', (-600, -600))
            mn.operation = 'MINIMUM'
            nt.links.new(s1.outputs[0], mn.inputs[0])
            nt.links.new(s2.outputs[0], mn.inputs[1])
            h = mn.outputs[0]
        elif kind == 'brush':
            mp = _n(nt, 'ShaderNodeMapping', (-1100, -600))
            mp.inputs['Scale'].default_value = (1.0, 0.02, 1.0)  # stretched along Blender Y = the weapon's z
            nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
            tex = _n(nt, 'ShaderNodeTexNoise', (-900, -600))
            tex.inputs['Scale'].default_value = scale
            tex.inputs['Detail'].default_value = 8.0
            nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
            h = tex.outputs['Fac']
        else:
            tex = _n(nt, 'ShaderNodeTexNoise', (-900, -600))
            tex.inputs['Scale'].default_value = scale
            tex.inputs['Detail'].default_value = 8.0
            nt.links.new(tc.outputs['Object'], tex.inputs['Vector'])
            h = tex.outputs['Fac']
        bp = _n(nt, 'ShaderNodeBump', (-400, -500))
        bp.inputs['Strength'].default_value = strength
        bp.inputs['Distance'].default_value = 0.0004
        nt.links.new(h, bp.inputs['Height'])
        nt.links.new(bp.outputs['Normal'], bsdf.inputs['Normal'])
    if emissive:
        bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    MATS[name] = m
    OUTS[name] = (col_out, r_out, m_out)
    return m


# Shared material set (linear albedo; realistic dark finishes, readable apart in game light).
def standard_materials():
    material('anodised', (0.030, 0.031, 0.033), 0.42, 0.0, bump=('noise', 0.08, 900.0))
    material('polymer', (0.040, 0.040, 0.038), 0.62, 0.0, bump=('noise', 0.12, 700.0))
    material('stipple', (0.036, 0.036, 0.034), 0.72, 0.0, bump=('stipple', 0.35, 1400.0), cavity=0.5)
    material('steel', (0.20, 0.20, 0.21), 0.42, 1.0, wear=((0.55, 0.55, 0.56), 1.0, 0.25, 0.6), noise=0.15)
    material('cerakote', (0.050, 0.050, 0.052), 0.58, 0.0, wear=((0.30, 0.30, 0.31), 1.0, 0.4, 0.5), bump=('noise', 0.1, 600.0))
    material('rubber', (0.024, 0.024, 0.024), 0.88, 0.0, bump=('noise', 0.2, 400.0))
    material('glass', (0.012, 0.016, 0.018), 0.06, 0.0, noise=0.0, cavity=0.0)
    material('knurl', (0.20, 0.20, 0.21), 0.48, 1.0, bump=('knurl', 0.5, 2200.0), noise=0.1)
    material('brass', (0.55, 0.42, 0.20), 0.38, 1.0, noise=0.1)


# ---------------------------------------------------------------------------------------------------------- geometry

PARTS = []


def _link(name, me, mat):
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    me.materials.append(MATS[mat])
    PARTS.append(obj)
    return obj


def fillet(pts, r, n=4):
    """Rounds every corner of a closed 2D polygon (radius r, clamped to 45% of the shorter edge), n points per arc.
    A per-corner radius: give pts as (a, b, r)."""
    out = []
    N = len(pts)
    for i in range(N):
        p0 = np.array(pts[i - 1][:2], float)
        p1 = np.array(pts[i][:2], float)
        p2 = np.array(pts[(i + 1) % N][:2], float)
        rr = pts[i][2] if len(pts[i]) > 2 else r
        if rr <= 0:
            out.append(tuple(p1))
            continue
        d0, d1 = p0 - p1, p2 - p1
        l0, l1 = np.linalg.norm(d0), np.linalg.norm(d1)
        c = min(rr, 0.45 * l0, 0.45 * l1)
        a, b = p1 + d0 / l0 * c, p1 + d1 / l1 * c
        for k in range(n + 1):
            t = k / n
            q = (1 - t) ** 2 * a + 2 * (1 - t) * t * p1 + t ** 2 * b
            out.append(tuple(q))
    return out


def _prism(pts, a0, a1, axis):
    """bmesh prism: a closed 2D polygon extruded from a0 to a1 along a weapon axis.
    axis 'x': pts are (z, y); 'z': pts are (x, y); 'y': pts are (x, z)."""
    def P(u, v, a):
        if axis == 'x':
            return G(a, v, u)
        if axis == 'z':
            return G(u, v, a)
        return G(u, a, v)
    bm = bmesh.new()
    lo = [bm.verts.new(P(u, v, a0)) for u, v in pts]
    hi = [bm.verts.new(P(u, v, a1)) for u, v in pts]
    bm.faces.new(lo)
    bm.faces.new(list(reversed(hi)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def _finish(bm, name, mat, bevel, segs, smooth=35.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = _link(name, me, mat)
    if bevel > 0:
        md = obj.modifiers.new('bevel', 'BEVEL')
        md.width = bevel
        md.segments = segs
        md.limit_method = 'ANGLE'
        md.angle_limit = math.radians(40)
        md.harden_normals = False
        md.miter_outer = 'MITER_ARC'
    obj['smooth'] = smooth
    return obj


def profile(name, mat, pts, x0, x1, bevel=0.0012, segs=2, r=0.0, n=4):
    """Side-profile part: polygon (z, y) extruded across x from x0 to x1. r > 0 rounds its corners."""
    p = fillet(pts, r, n) if r > 0 or any(len(q) > 2 for q in pts) else [q[:2] for q in pts]
    return _finish(_prism(p, x0, x1, 'x'), name, mat, bevel, segs)


def section(name, mat, pts, z0, z1, bevel=0.001, segs=2, r=0.0, n=4):
    """Cross-section part: polygon (x, y) extruded along the bore from z0 to z1."""
    p = fillet(pts, r, n) if r > 0 or any(len(q) > 2 for q in pts) else [q[:2] for q in pts]
    return _finish(_prism(p, z0, z1, 'z'), name, mat, bevel, segs)


def plan(name, mat, pts, y0, y1, bevel=0.001, segs=2, r=0.0, n=4):
    """Plan-view part: polygon (x, z) extruded up from y0 to y1."""
    p = fillet(pts, r, n) if r > 0 or any(len(q) > 2 for q in pts) else [q[:2] for q in pts]
    return _finish(_prism(p, y0, y1, 'y'), name, mat, bevel, segs)


def box(name, mat, size, centre, bevel=0.001, segs=2, r=0.0):
    w, h, l = size
    x, y, z = centre
    pts = [(z - l / 2, y - h / 2), (z + l / 2, y - h / 2), (z + l / 2, y + h / 2), (z - l / 2, y + h / 2)]
    return profile(name, mat, pts, x - w / 2, x + w / 2, bevel, segs, r)


def rrect(w, h, r, cx=0.0, cy=0.0):
    """A rounded rectangle's corners (with per-corner radius) for section / profile."""
    return [(cx - w / 2, cy - h / 2, r), (cx + w / 2, cy - h / 2, r), (cx + w / 2, cy + h / 2, r), (cx - w / 2, cy + h / 2, r)]


def lathe(name, mat, prof, centre=(0.0, 0.0), axis='z', segs=32, bevel=0.0, smooth=35.0, start=0.0):
    """Turned part: profile [(r, a)] revolved about an axis parallel to the weapon's `axis` through `centre`
    (the other two coordinates). Ends with r > 0 are capped."""
    bm = bmesh.new()
    rings = []
    for rad, a in prof:
        ring = []
        k = 1 if rad <= 1e-6 else segs
        for i in range(k):
            t = start + 2 * math.pi * i / segs
            u, v = rad * math.cos(t), rad * math.sin(t)
            if axis == 'z':
                p = G(centre[0] + u, centre[1] + v, a)
            elif axis == 'x':
                p = G(a, centre[0] + v, centre[1] + u)  # centre = (y, z)
            else:
                p = G(centre[0] + u, a, centre[1] + v)  # centre = (x, z)
            ring.append(bm.verts.new(p))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        if len(r0) == 1 and len(r1) == 1:
            continue
        if len(r0) == 1:
            for i in range(segs):
                bm.faces.new((r0[0], r1[i], r1[(i + 1) % segs]))
        elif len(r1) == 1:
            for i in range(segs):
                bm.faces.new((r0[i], r0[(i + 1) % segs], r1[0]))
        else:
            for i in range(segs):
                j = (i + 1) % segs
                bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    if len(rings[0]) > 1:
        bm.faces.new(rings[0])
    if len(rings[-1]) > 1:
        bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name, mat, bevel, 1, smooth)


def cyl(name, mat, r, a0, a1, centre=(0.0, 0.0), axis='z', segs=24, bevel=0.0005):
    return lathe(name, mat, [(r, a0), (r, a1)], centre, axis, segs, bevel)


def cut(obj, cutter, solver='EXACT'):
    """Boolean difference; the cutter is deleted."""
    md = obj.modifiers.new('cut', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.solver = solver
    md.object = cutter
    # the boolean goes before any bevel so the cut edges are bevelled too
    while obj.modifiers[0] != md:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_move_up(modifier=md.name)
    _apply(obj, md.name)
    PARTS.remove(cutter)
    bpy.data.objects.remove(cutter)


def union(obj, other, solver='EXACT'):
    md = obj.modifiers.new('join', 'BOOLEAN')
    md.operation = 'UNION'
    md.solver = solver
    md.object = other
    while obj.modifiers[0] != md:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_move_up(modifier=md.name)
    _apply(obj, md.name)
    PARTS.remove(other)
    bpy.data.objects.remove(other)


def _apply(obj, mod):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod)
    obj.select_set(False)


def mirror_x(obj, name):
    """A copy mirrored across the weapon's x = 0 plane."""
    me = obj.data.copy()
    o2 = obj.copy()
    o2.data = me
    o2.name = name
    bpy.context.scene.collection.objects.link(o2)
    o2.scale = (-o2.scale[0], o2.scale[1], o2.scale[2])
    PARTS.append(o2)
    return o2


def place(obj, rot=None, origin=(0, 0, 0), offset=(0, 0, 0)):
    """Rotates a part about a weapon-frame point (rot: game-frame Euler XYZ radians about origin) then offsets it."""
    o = G(*origin)
    m = Matrix.Translation(o)
    if rot:
        # game-frame rotation axes in Blender: x -> -X, y -> Z, z -> -Y
        rx, ry, rz = rot
        m = m @ Matrix.Rotation(-rx, 4, 'X') @ Matrix.Rotation(ry, 4, 'Z') @ Matrix.Rotation(-rz, 4, 'Y')
    m = Matrix.Translation(G(*offset)) @ m @ Matrix.Translation(-o)
    obj.matrix_world = m @ obj.matrix_world
    return obj


# ---------------------------------------------------------------------------------------------------------- assemble

def is_mag(name):
    """(anim-cleanup) Magazine parts (their own mesh in the GLB: a reload pulls them): 'mag', 'mag-plate', 'mag-rib'."""
    base = name.split('.')[0]
    return base == 'mag' or base.startswith('mag-plate') or base.startswith('mag-rib')


SLIDE_PARTS = ('slide', 'extractor', 'rear-sight', 'front-sight')


def is_slide(name):
    """(piano-knife S4a) Slide parts (their own mesh in the GLB: an empty pistol locks the slide back). Exact base
    names: 'slide-stop' and 'slide-stop-pin' are frame parts, the barrel hood stays with the barrel."""
    return name.split('.')[0] in SLIDE_PARTS


def join_all(name):
    """Applies every part's modifiers and transforms, smooths by angle, joins into one mesh object."""
    objs = list(PARTS)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for md in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if o.scale[0] < 0 or o.matrix_world.determinant() < 0:
            pass
        me = o.data
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(o.get('smooth', 35.0)))
        # (anim-cleanup) the magazine tag survives the join (other parts get the default 0)
        at = me.attributes.get('wmag') or me.attributes.new('wmag', 'INT', 'POINT')
        at.data.foreach_set('value', [1 if is_mag(o.name) else 0] * len(me.vertices))
        # (piano-knife S4a) the slide tag survives the join the same way
        st = me.attributes.get('wslide') or me.attributes.new('wslide', 'INT', 'POINT')
        st.data.foreach_set('value', [1 if is_slide(o.name) else 0] * len(me.vertices))
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    # a mirrored copy (negative scale) is flipped back by transform_apply; normals recomputed to be safe
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00002)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # triangles now: the bake, the tangents (MikkTSpace needs tris / quads) and the game see the same faces
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.set_sharp_from_angle(angle=math.radians(35.0))
    PARTS.clear()
    PARTS.append(obj)
    return obj


def tri_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def unwrap(obj, margin=0.004):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)


# ---------------------------------------------------------------------------------------------------------- bake

def use_gpu(scene, samples=16):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    gpus = [d for d in prefs.devices if d.type == 'OPTIX']
    if not gpus:
        raise SystemExit('no OptiX GPU: bakes and renders run on the hardware GPU')
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = samples
    return [d.name for d in gpus]


def _image(name, size, srgb):
    im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    return im


def _target(obj, im):
    for slot in obj.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.get('bake-target') or nt.nodes.new('ShaderNodeTexImage')
        node.name = 'bake-target'
        node.image = im
        nt.nodes.active = node


def _route(obj, which):
    """Material outputs straight to an emission shader (which: 0 base, 1 roughness, 2 metal); None restores."""
    for slot in obj.material_slots:
        m = slot.material
        nt = m.node_tree
        out = nt.nodes['Material Output']
        if which is None:
            nt.links.new(nt.nodes['Principled BSDF'].outputs['BSDF'], out.inputs['Surface'])
            continue
        em = nt.nodes.get('bake-emit') or nt.nodes.new('ShaderNodeEmission')
        em.name = 'bake-emit'
        em.inputs['Strength'].default_value = 1.0
        nt.links.new(OUTS[m.name][which], em.inputs['Color'])
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])


def _px(im):
    a = np.empty(im.size[0] * im.size[1] * 4, np.float32)
    im.pixels.foreach_get(a)
    return a.reshape(im.size[1], im.size[0], 4)


def bake(obj, out_dir, stem, size):
    """Bakes albedo, ORM and normal into PNGs: <stem>-albedo.png, <stem>-orm.png, <stem>-normal.png."""
    scene = bpy.context.scene
    use_gpu(scene, 16)
    bk = scene.render.bake
    bk.margin = max(4, size // 128)
    bk.margin_type = 'EXTEND'
    bk.target = 'IMAGE_TEXTURES'
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    files = {}
    ims = {}
    for kind, which in (('albedo', 0), ('rough', 1), ('metal', 2)):
        im = _image(f'{stem}-{kind}', size, kind == 'albedo')
        _target(obj, im)
        _route(obj, which)
        scene.cycles.samples = 16
        bpy.ops.object.bake(type='EMIT', margin=bk.margin, use_clear=True)
        ims[kind] = im
    _route(obj, None)
    im = _image(f'{stem}-ao', size, False)
    _target(obj, im)
    scene.cycles.samples = 64
    scene.world = scene.world or bpy.data.worlds.new('bake')
    bpy.ops.object.bake(type='AO', margin=bk.margin, use_clear=True)
    ims['ao'] = im
    im = _image(f'{stem}-normal', size, False)
    _target(obj, im)
    scene.cycles.samples = 16
    bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', margin=bk.margin, use_clear=True)
    ims['normal'] = im
    # ORM: occlusion R (softened: the game's lighting adds its own), roughness G, metal B
    ao = _px(ims['ao'])[..., 0]
    orm = np.ones((size, size, 4), np.float32)
    orm[..., 0] = 0.35 + 0.65 * ao
    orm[..., 1] = _px(ims['rough'])[..., 0]
    orm[..., 2] = _px(ims['metal'])[..., 0]
    o_im = _image(f'{stem}-orm', size, False)
    o_im.pixels.foreach_set(orm.ravel())
    for kind, im in (('albedo', ims['albedo']), ('orm', o_im), ('normal', ims['normal'])):
        path = os.path.join(out_dir, f'{stem}-{kind}.png')
        im.filepath_raw = path
        im.file_format = 'PNG'
        im.save()
        files[kind] = path
    return files, {'albedo': ims['albedo'], 'orm': o_im, 'normal': ims['normal']}


def baked_material(name, ims):
    """The game's material on the mesh (for the renders): baked albedo x AO, ORM, tangent normal."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    ta = _n(nt, 'ShaderNodeTexImage', (-700, 300))
    ta.image = ims['albedo']
    to = _n(nt, 'ShaderNodeTexImage', (-700, 0))
    to.image = ims['orm']
    tn = _n(nt, 'ShaderNodeTexImage', (-700, -300))
    tn.image = ims['normal']
    sep = _n(nt, 'ShaderNodeSeparateColor', (-400, 0))
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    mul = _n(nt, 'ShaderNodeMix', (-200, 300))
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    nt.links.new(ta.outputs['Color'], mul.inputs['A'])
    nt.links.new(sep.outputs['Red'], mul.inputs['B'])
    nt.links.new(mul.outputs['Result'], bsdf.inputs['Base Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    nm = _n(nt, 'ShaderNodeNormalMap', (-200, -300))
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


# ---------------------------------------------------------------------------------------------------------- GLB

def write_glb(path, obj, name, files):
    """One mesh, one material with the baked PNGs, in glTF's frame (Y up; the game's reader mirrors x back)."""
    me = obj.data
    me.calc_loop_triangles()
    me.calc_tangents(uvmap=me.uv_layers.active.name)
    nl = len(me.loops)
    vi = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', vi)
    nor = np.empty(nl * 3, np.float32)
    me.loops.foreach_get('normal', nor)
    tan = np.empty(nl * 3, np.float32)
    me.loops.foreach_get('tangent', tan)
    sgn = np.empty(nl, np.float32)
    me.loops.foreach_get('bitangent_sign', sgn)
    uv = np.empty(nl * 2, np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    vmag = np.zeros(len(me.vertices), np.int32)
    if me.attributes.get('wmag') is not None:
        me.attributes['wmag'].data.foreach_get('value', vmag)
    vslide = np.zeros(len(me.vertices), np.int32)
    if me.attributes.get('wslide') is not None:
        me.attributes['wslide'].data.foreach_get('value', vslide)
    co = co.reshape(-1, 3)[vi]
    nor, tan, uv = nor.reshape(-1, 3), tan.reshape(-1, 3), uv.reshape(-1, 2)
    tri = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('loops', tri)
    # Blender (x, y, z) -> glTF (x, z, -y): a rotation, so winding and the bitangent sign are kept
    rot = lambda a: np.stack([a[:, 0], a[:, 2], -a[:, 1]], 1)  # noqa: E731
    P_all, N_all, T_all = rot(co), rot(nor), rot(tan)
    UV_all = np.stack([uv[:, 0], 1.0 - uv[:, 1]], 1)
    # (anim-cleanup) the magazine's triangles (every corner tagged) are a mesh of their own: `<name>-mag`;
    # (piano-knife S4a) the slide's likewise: `<name>-slide`. A triangle with any untagged corner stays in the body.
    t3 = tri.reshape(-1, 3)
    tmag = vmag[vi[t3]].min(1) > 0
    tslide = (vslide[vi[t3]].min(1) > 0) & ~tmag
    groups = [(name, t3[~tmag & ~tslide].ravel())]
    if tmag.any():
        groups.append((f'{name}-mag', t3[tmag].ravel()))
    if tslide.any():
        groups.append((f'{name}-slide', t3[tslide].ravel()))
    blobs, views, accessors = [], [], []
    off = 0

    def add(data, target=None):
        nonlocal off
        b = data.tobytes()
        pad = (-len(b)) % 4
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), **({'target': target} if target else {})})
        blobs.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(views) - 1

    def acc(data, comp, typ, target, minmax=False):
        v = add(data, target)
        a = {'bufferView': v, 'componentType': comp, 'count': int(data.shape[0]), 'type': typ}
        if minmax:
            a['min'] = [float(x) for x in data.min(0)]
            a['max'] = [float(x) for x in data.max(0)]
        accessors.append(a)
        return len(accessors) - 1

    meshes_js, nodes_js, stats = [], [], {'vertices': 0, 'triangles': 0, 'meshTriangles': {}}
    for gname, gtri in groups:
        used = np.unique(gtri)
        P, N, UV = P_all[used], N_all[used], UV_all[used]
        T, S = T_all[used], sgn[used]
        key = np.concatenate([np.round(P, 6), np.round(N, 4), np.round(UV, 6), np.round(T, 3), S[:, None]], 1)
        uniq, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        inv = inv.ravel()
        remap = np.full(len(P_all), -1, np.int64)
        remap[used] = inv
        Pg, Ng, UVg = P[first].astype(np.float32), N[first].astype(np.float32), UV[first].astype(np.float32)
        T4 = np.concatenate([T[first], S[first, None]], 1).astype(np.float32)
        idx = remap[gtri].astype(np.uint32)
        a_p = acc(Pg, 5126, 'VEC3', 34962, True)
        a_n = acc(Ng, 5126, 'VEC3', 34962)
        a_t = acc(UVg, 5126, 'VEC2', 34962)
        a_g = acc(T4, 5126, 'VEC4', 34962)
        a_i = acc(idx, 5125, 'SCALAR', 34963)
        meshes_js.append({'name': gname, 'primitives': [{'attributes': {'POSITION': a_p, 'NORMAL': a_n, 'TEXCOORD_0': a_t, 'TANGENT': a_g}, 'indices': a_i, 'material': 0}]})
        nodes_js.append({'name': gname, 'mesh': len(meshes_js) - 1})
        stats['vertices'] += int(Pg.shape[0])
        stats['triangles'] += int(idx.shape[0] // 3)
        stats['meshTriangles'][gname] = int(idx.shape[0] // 3)
    images = []
    for kind in ('albedo', 'orm', 'normal'):
        with open(files[kind], 'rb') as f:
            data = f.read()
        v = add(np.frombuffer(data, np.uint8))
        images.append({'name': f'{name}-{kind}', 'mimeType': 'image/png', 'bufferView': v})
    gl = {
        'asset': {'version': '2.0', 'generator': 'night-shift scripts/weapons'},
        'scene': 0, 'scenes': [{'nodes': list(range(len(nodes_js)))}],
        'nodes': nodes_js,
        'meshes': meshes_js,
        'materials': [{'name': f'{name}-weapon', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 1.0, 'roughnessFactor': 1.0,
                                                                         'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 1}},
                       'occlusionTexture': {'index': 1}, 'normalTexture': {'index': 2}}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'textures': [{'source': i, 'sampler': 0} for i in range(3)],
        'images': images,
        'accessors': accessors, 'bufferViews': views,
        'buffers': [{'byteLength': off}],
    }
    js = json.dumps(gl, separators=(',', ':')).encode('utf8')
    js += b' ' * ((-len(js)) % 4)
    bin_ = b''.join(blobs)
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942))
        f.write(bin_)
    return {**stats, 'meshes': [m['name'] for m in meshes_js], 'bytes': os.path.getsize(path)}


def game_bounds(obj):
    v = np.empty(len(obj.data.vertices) * 3, np.float32)
    obj.data.vertices.foreach_get('co', v)
    v = v.reshape(-1, 3)
    g = np.stack([-v[:, 0], v[:, 2], -v[:, 1]], 1)
    return {'min': [round(float(x), 4) for x in g.min(0)], 'max': [round(float(x), 4) for x in g.max(0)]}


def points_vs_parts(points):
    """Per point: {'inside': part name or None, 'mm': distance to the nearest part surface} (parts with modifiers)."""
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [(o.name, BVHTree.FromObject(o, dg)) for o in PARTS]
    out = {}
    for k, p in points.items():
        q = G(*p)
        best, inside = 1e9, None
        for name, t in trees:
            loc, nrm, _, d = t.find_nearest(q)
            if loc is None:
                continue
            best = min(best, d)
            if (q - loc).dot(nrm) < 0 and inside is None:
                inside = name
        out[k] = {'inside': inside, 'mm': round(best * 1000, 1)}
    return out


def part_bounds():
    dg = bpy.context.evaluated_depsgraph_get()
    out = {}
    for o in PARTS:
        e = o.evaluated_get(dg)
        vs = [e.matrix_world @ v.co for v in e.data.vertices]
        g = np.array([g_of(v) for v in vs])
        b = (g.min(0).round(4).tolist(), g.max(0).round(4).tolist())
        out[o.name] = b if o.name not in out else [np.minimum(out[o.name][0], b[0]).tolist(), np.maximum(out[o.name][1], b[1]).tolist()]
    return out


def nearest_surface(obj, p):
    """Distance (m) from a weapon-frame point to the mesh surface, negative inside."""
    bvh = BVHTree.FromObject(obj, bpy.context.evaluated_depsgraph_get())
    q = G(*p)
    loc, nrm, _, d = bvh.find_nearest(q)
    if loc is None:
        return None
    return -d if (q - loc).dot(nrm) < 0 else d


# ---------------------------------------------------------------------------------------------------------- renders

def _look(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def render_setup(scene, samples=96):
    use_gpu(scene, samples)
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Base Contrast'
    w = bpy.data.worlds.new('studio')
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.20, 0.21, 0.23, 1.0)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
    scene.world = w
    scene.render.film_transparent = False


def light(name, loc, target, power, size, colour=(1.0, 0.97, 0.93)):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.size = size
    data.color = colour
    o = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    _look(o, target)
    return o


def camera(name, loc, target, lens=70.0, ortho=None):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_start = 0.005
    if ortho:
        data.type = 'ORTHO'
        data.ortho_scale = ortho
    o = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    _look(o, target)
    return o


def backdrop(z=-0.3, colour=(0.10, 0.10, 0.105)):
    me = bpy.data.meshes.new('backdrop')
    h = 4.0
    me.from_pydata([(-h, -h, z), (h, -h, z), (h, h, z), (-h, h, z)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new('backdrop', me)
    bpy.context.scene.collection.objects.link(o)
    m = bpy.data.materials.new('backdrop')
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1)
    b.inputs['Roughness'].default_value = 0.85
    me.materials.append(m)
    return o


def scale_bar(length, z0, y_up, x=0.0, step=0.1):
    """A ruler under the weapon (Blender coords on the weapon's side plane): alternating 10 cm blocks, light and dark."""
    objs = []
    n = int(round(length / step))
    for i in range(n):
        me = bpy.data.meshes.new(f'ruler{i}')
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(f'ruler{i}', me)
        bpy.context.scene.collection.objects.link(o)
        o.scale = (0.004, step, 0.006)
        o.location = (x, -(z0 + step * (i + 0.5)), y_up)
        m = bpy.data.materials.new(f'ruler{i}')
        c = 0.7 if i % 2 == 0 else 0.15
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (c, c * 0.95, c * 0.5, 1)
        me.materials.append(m)
        objs.append(o)
    return objs


def render(path, res=(1600, 900), quality=90):
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = quality
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
