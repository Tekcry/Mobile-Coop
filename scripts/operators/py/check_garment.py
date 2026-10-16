"""Automatic checks on a built garment (RUNBOOK step 03b; `npm run operators:check`).

Reads build/operators/<id>/<id>-<garment>{-sim.json,-sim.npz,.blend}; writes <id>-<garment>-check.json: a list of
checks, each {name, pass, value, limit, detail}. check.mjs adds the kit check and sets the exit code.

- seamGap: worst seam gap at the end of the simulation, before the weld (under 10 mm).
- simulation: finite positions, the seam gap never ran away, no vertex far from the skin (no divergence).
- edgeLength: no edge of any rendered garment mesh (modifiers applied) over 3 cm.
- solidify: no solidify spike (inner shell further from the outer than twice the thickness).
- albedo / roughness: measured, not read from the node values: every material is rendered as an emission of what
  feeds its Base Color and Roughness (Cycles, one sample per pixel, same rays as an ID render).
  Fabric albedo 0.02-0.06 linear (Rec. 709 luminance, 1st to 99th percentile); roughness 0.7-0.95 on fabric,
  0.55-0.9 on hard parts, 0.02-0.3 on the goggle lens (class 'lens', step 07: coated glass is glossy; its albedo is not
  judged). A material with too few pixels to judge fails as unsampled. Twelve views: front, back, the left upper arm,
  the neck, the left thigh and knee, the waist front, the left hand and the left foot (step 06), the head from the
  front left, the back left and the front low (step 07), and the right wrist from below (step 07 fix round 3: up the
  sleeve opening, where the base layer still shows once the hood covers the nape).
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import render as RN  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
    '--res': {'type': int, 'default': 900},
})
common.check_version()
op_id, gname = args.operator, args.garment
stem = os.path.join(args.out, f'{op_id}-{gname}')

LIMITS = {
    'seamGapMm': 10.0,
    'runawayGapM': 0.1,          # a seam gap this wide at any sampled frame means the sim blew up
    'skinDistM': 0.08,           # no simulated vertex further than this from the skin
    'edgeM': 0.03,
    'spikeFactor': 2.0,          # solidify: inner shell within this many thicknesses of the outer
    'albedo': {'fabric': (0.02, 0.06)},
    'roughness': {'fabric': (0.7, 0.95), 'hard': (0.55, 0.9), 'lens': (0.02, 0.3)},
    'minPixels': 150,
}
checks = []


def check(name, ok, value, limit, detail=''):
    checks.append({'name': name, 'pass': bool(ok), 'value': value, 'limit': limit, 'detail': detail})


# --- Simulation -----------------------------------------------------------------------------------------------------
with open(stem + '-sim.json', encoding='utf-8') as f:
    SR = json.load(f)
gaps = SR['seamGapByFrame']
final_gap = gaps[-1][2] * 1000
check('seamGap', final_gap < LIMITS['seamGapMm'], round(final_gap, 2), f"< {LIMITS['seamGapMm']} mm",
      'worst seam gap at the last settle frame, before the weld')

npz = np.load(stem + '-sim.npz')
P = npz['sim']
bpy.ops.wm.open_mainfile(filepath=stem + '.blend')
body = bpy.data.objects[f'{op_id}-body']
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(body, dg)
finite = bool(np.isfinite(P).all())
far, inside = 0.0, 0.0
if finite:
    for p in P:
        loc, nrm, _, d = bvh.find_nearest(Vector(p))
        if loc is None:
            continue
        far = max(far, d)
        inside = max(inside, -(Vector(p) - loc).dot(nrm))
worst_any = max(g for _, _, g in gaps)
ok = finite and worst_any < LIMITS['runawayGapM'] and far < LIMITS['skinDistM']
check('simulation', ok, {'finite': finite, 'worstGapM': round(worst_any, 4), 'farthestFromSkinM': round(far, 4),
                         'deepestInsideSkinMm': round(inside * 1000, 1)},
      f"finite; seam gap < {LIMITS['runawayGapM']} m every frame; < {LIMITS['skinDistM']} m from the skin",
      'deepestInsideSkinMm is reported, not judged (layering check comes with the next garments)')

# --- Render meshes --------------------------------------------------------------------------------------------------
scene = bpy.context.scene
items = [o for o in scene.objects if o.type == 'MESH' and not o.hide_render and o.name not in (body.name, 'floor')]
dg = bpy.context.evaluated_depsgraph_get()
worst_edge, worst_obj, spikes = 0.0, '', []
for o in items:
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    ed = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', ed)
    ed = ed.reshape(-1, 2)
    if len(ed):
        L = np.linalg.norm(co[ed[:, 0]] - co[ed[:, 1]], axis=1)
        if L.max() > worst_edge:
            worst_edge, worst_obj = float(L.max()), o.name
    for mod in o.modifiers:
        if mod.type == 'SOLIDIFY' and mod.show_render:
            base_n = len(o.data.vertices)
            if n >= 2 * base_n:
                d = np.linalg.norm(co[base_n:2 * base_n] - co[:base_n], axis=1)
                lim = LIMITS['spikeFactor'] * abs(mod.thickness)
                bad = int((d > lim).sum())
                if bad:
                    spikes.append({'object': o.name, 'vertices': bad, 'maxMm': round(float(d.max()) * 1000, 2)})
    ev.to_mesh_clear()
check('edgeLength', worst_edge <= LIMITS['edgeM'], round(worst_edge * 1000, 2), f"<= {LIMITS['edgeM'] * 1000:.0f} mm",
      f'longest edge: {worst_obj}')
check('solidify', not spikes, spikes, f"inner shell within {LIMITS['spikeFactor']} x thickness")

# --- Measured albedo and roughness ----------------------------------------------------------------------------------
mats = {}
for o in items:
    for slot in o.material_slots:
        if slot.material and slot.material.get('operators_class') in ('fabric', 'hard', 'lens'):
            mats[slot.material.name] = slot.material
untagged = sorted({s.material.name for o in items for s in o.material_slots
                   if s.material and s.material.get('operators_class') is None})
check('materialClass', not untagged, untagged, 'every garment material tagged fabric, hard or lens (materials.py)')

order = sorted(mats)
code = {name: k + 1 for k, name in enumerate(order)}


def principled(mat):
    return next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)


def source(mat, socket_name):
    """(linked output socket or None, default value) feeding the Principled input."""
    b = principled(mat)
    s = b.inputs[socket_name]
    return (s.links[0].from_socket if s.is_linked else None), s.default_value


def emit_all(mode):
    """Point every material's output at an emission of its albedo, its roughness or its ID code."""
    for name, mat in list(mats.items()) + [(m.name, m) for m in bpy.data.materials if m.name not in mats]:
        nt = mat.node_tree
        if nt is None:
            continue
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if out is None:
            continue
        em = nt.nodes.get('check_emit') or nt.nodes.new('ShaderNodeEmission')
        em.name = 'check_emit'
        em.inputs['Strength'].default_value = 1.0
        for l in list(em.inputs['Color'].links):
            nt.links.remove(l)
        if name in mats and mode in ('albedo', 'roughness'):
            sock, val = source(mat, 'Base Color' if mode == 'albedo' else 'Roughness')
            if sock is not None:
                nt.links.new(sock, em.inputs['Color'])
            else:
                em.inputs['Color'].default_value = tuple(val) if mode == 'albedo' else (val, val, val, 1.0)
        else:
            k = code.get(name, 0)
            em.inputs['Color'].default_value = (k / 64.0, 0.0, 0.0, 1.0)
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])


def render_exr(path):
    scene.render.image_settings.file_format = 'OPEN_EXR'
    scene.render.image_settings.color_depth = '32'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    os.remove(path)
    return px.reshape(-1, 4)[:, :3]


try:
    RN.use_gpu(scene, 1)
except SystemExit:
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.cycles.pixel_filter_type = 'BOX'
scene.cycles.filter_width = 0.01
scene.cycles.max_bounces = 0
scene.cycles.seed = args.seed
scene.cycles.use_animated_seed = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0.0
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = args.res, int(args.res * 1.25), 100
RN.world(scene, 0.0)
for o in list(bpy.data.objects):
    if o.type in ('LIGHT', 'CAMERA'):
        bpy.data.objects.remove(o)
with open(os.path.join(args.out, f'{op_id}-body.json'), encoding='utf-8') as f:
    J = {k: np.array(common.game_to_blender(v)) for k, v in json.load(f)['bindJoints'].items()}
sh, el, nk = J['shL'], J['elL'], J['neck']
views = [
    ((0.22, -2.45, 1.22), (0.0, 0.0, 1.06), 55),
    ((0.3, 2.45, 1.25), (0.0, 0.0, 1.08), 55),
    (tuple(sh + (el - sh) * 0.5 + np.array([np.sign(sh[0]) * 0.22, 0.3, 0.1])), tuple(sh + (el - sh) * 0.5), 35),
    (tuple(nk + np.array([0.05, -0.38, 0.0])), tuple(nk + np.array([0.0, -0.04, -0.04])), 50),
    # the legs (trousers, leggings): the left thigh and knee, and the waist front
    (tuple(J['knL'] + np.array([np.sign(J['knL'][0]) * 0.35, -0.75, 0.25])), tuple((J['knL'] + J['hipL']) / 2), 40),
    (tuple(J['spine'] + np.array([0.12, -0.6, -0.08])), tuple(J['spine'] + np.array([0.0, -0.1, -0.1])), 45),
    # the left hand from the front-outside and the left foot from the front-outside (gloves, boots: step 06)
    (tuple(J['wrL'] + np.array([np.sign(J['wrL'][0]) * 0.25, -0.45, 0.0])), tuple(J['wrL'] + np.array([0.0, -0.06, -0.06])), 50),
    (tuple(J['anL'] + np.array([np.sign(J['anL'][0]) * 0.4, -0.5, 0.15])), tuple(np.array([J['anL'][0], J['anL'][1] - 0.05, 0.05])), 50),
    # the right wrist from below, up the sleeve opening (step 07 fix round 3): the base layer's only visible patch in the
    # full head stack (855 px measured; the lower hood skirt covers the nape, where it showed before)
    (tuple(J['wrR'] + np.array([0.0, -0.05, -0.3])), tuple(J['wrR']), 50),
    # the head (step 07): front left (boom mic, the left knob), back left (cradle, battery, cord lock), front low (lenses)
    (tuple(J['head'] + np.array([0.2, -0.36, 0.04])), tuple(J['head'] + np.array([0.0, -0.05, -0.01])), 50),
    (tuple(J['head'] + np.array([0.24, 0.34, 0.08])), tuple(J['head'] + np.array([0.0, 0.03, 0.0])), 50),
    (tuple(J['head'] + np.array([-0.06, -0.38, -0.08])), tuple(J['head'] + np.array([0.0, -0.08, 0.0])), 50),
]
samples = {name: {'albedo': [], 'roughness': []} for name in order}
tmp = os.path.abspath(os.path.join(args.out, 'check-tmp.exr'))  # Blender resolves relative render paths itself
for k, (loc, tgt, lens) in enumerate(views):
    scene.camera = RN.camera(f'check{k}', loc, tgt, lens)
    emit_all('id')
    ids = np.rint(render_exr(tmp)[:, 0] * 64.0).astype(int)
    emit_all('albedo')
    alb = render_exr(tmp) @ np.array([0.2126, 0.7152, 0.0722])
    emit_all('roughness')
    rough = render_exr(tmp)[:, 0]
    for name in order:
        sel = ids == code[name]
        samples[name]['albedo'].append(alb[sel])
        samples[name]['roughness'].append(rough[sel])

report_mats = {}
for name in order:
    cls = mats[name]['operators_class']
    a = np.concatenate(samples[name]['albedo'])
    r = np.concatenate(samples[name]['roughness'])
    entry = {'class': cls, 'pixels': int(len(a))}
    if len(a) < LIMITS['minPixels']:
        check(f'sampled:{name}', False, len(a), f">= {LIMITS['minPixels']} pixels over the views")
        report_mats[name] = entry
        continue
    pa = [round(float(x), 4) for x in np.percentile(a, [1, 50, 99])]
    pr = [round(float(x), 4) for x in np.percentile(r, [1, 50, 99])]
    entry.update({'albedoP1P50P99': pa, 'roughnessP1P50P99': pr})
    report_mats[name] = entry
    if cls in LIMITS['albedo']:
        lo, hi = LIMITS['albedo'][cls]
        check(f'albedo:{name}', lo <= pa[0] and pa[2] <= hi, pa, f'{lo}-{hi} linear (P1, P50, P99)')
    lo, hi = LIMITS['roughness'][cls]
    check(f'roughness:{name}', lo <= pr[0] and pr[2] <= hi, pr, f'{lo}-{hi} ({cls}; P1, P50, P99)')

report = {'operator': op_id, 'item': gname, 'pass': all(c['pass'] for c in checks), 'checks': checks,
          'materials': report_mats}
with open(stem + '-check.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1)
for c in checks:
    print(f"operators check: {op_id} {gname} {'PASS' if c['pass'] else 'FAIL'} {c['name']}: {c['value']} ({c['limit']})")
