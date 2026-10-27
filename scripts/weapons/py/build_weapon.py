"""Builds one weapon (feature/weapons): parts -> one mesh -> unwrap -> GPU bake -> GLB + report (+ renders).

  blender -b --factory-startup --python build_weapon.py -- --seed N --weapon rifle --out build/weapons [--render DIR]

The weapon module (py/<id>.py) defines SIZE (texture size), POINTS (weapon-frame hand points, muzzle, magazine point:
src/config/weapons.json) and build() (creates the parts with wlib). Output: <out>/<id>/<id>.glb (PNG textures; KTX2
follows in Node), <id>-*.png, <id>-report.json, <id>.blend; renders as WebP into --render.
The magazine and, for a pistol, the slide are meshes of their own in the GLB (`<id>-mag`, `<id>-slide`: wlib.write_glb); the report's `split` names their parts.
"""
import importlib
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'operators', 'py'))
import common  # noqa: E402
import wlib as W  # noqa: E402

args = common.parse_args({'--weapon': {'required': True}, '--out': {'required': True}, '--render': {'default': ''},
                          '--no-bake': {'action': 'store_true'}})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)
wid = args.weapon
mod = importlib.import_module(wid)
out = os.path.join(args.out, wid)
os.makedirs(out, exist_ok=True)

W.standard_materials()
mod.build()
parts = [o.name for o in W.PARTS]
split = {'mag': [n for n in parts if W.is_mag(n)], 'slide': [n for n in parts if W.is_slide(n)]}
# hand points measured against the separate parts (joined shells overlap): inside any part, and the distance to the
# nearest part surface
surface = W.points_vs_parts(mod.POINTS)
part_bounds = W.part_bounds()
obj = W.join_all(wid)
W.unwrap(obj)
report = {'id': wid, 'parts': parts, 'triangles': W.tri_count(obj), 'bounds': W.game_bounds(obj), 'textureSize': mod.SIZE,
          'points': mod.POINTS, 'surface': surface, 'partBounds': part_bounds, 'split': split}
if not args.no_bake:
    files, ims = W.bake(obj, out, wid, mod.SIZE)
    report['glb'] = W.write_glb(os.path.join(out, f'{wid}.glb'), obj, wid, files)
    report['textures'] = {k: os.path.basename(v) for k, v in files.items()}
    baked = W.baked_material(f'{wid}-baked', ims)
    obj.data.materials.clear()
    obj.data.materials.append(baked)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f'{wid}.blend'))

if args.render:
    os.makedirs(args.render, exist_ok=True)
    scene = bpy.context.scene
    W.render_setup(scene, 128)
    b = report['bounds']
    z0, z1 = b['min'][2], b['max'][2]
    y0, y1 = b['min'][1], b['max'][1]
    zc, yc = (z0 + z1) / 2, (y0 + y1) / 2
    L = z1 - z0
    c = W.G(0, yc, zc)
    W.backdrop(z=y0 - 0.05)
    W.light('key', (c.x - 1.2 * L, c.y - 0.6 * L, c.z + 1.5 * L), c, 60 * L, 1.0 * L)
    W.light('fill', (c.x + 1.4 * L, c.y + 0.3 * L, c.z + 0.6 * L), c, 25 * L, 1.5 * L, (0.9, 0.94, 1.0))
    W.light('rim', (c.x, c.y + 1.6 * L, c.z + 1.0 * L), c, 45 * L, 0.8 * L, (0.9, 0.95, 1.0))
    W.scale_bar(math.ceil(L * 10) / 10, z0, y0 - 0.03, x=0.0)
    views = {
        'right': ((c.x - 2.0 * L, c.y, c.z), None, 1.15 * L),         # the weapon's right side, orthographic (scale)
        'left34': ((c.x + 1.3 * L, c.y - 0.9 * L, c.z + 0.45 * L), 55.0, None),
        'right34': ((c.x - 1.2 * L, c.y + 0.9 * L, c.z + 0.6 * L), 55.0, None),
        'front': ((c.x - 0.25 * L, c.y - 1.6 * L, c.z + 0.1 * L), 70.0, None),
    }
    for name, (loc, lens, ortho) in views.items():
        cam = W.camera(name, loc, c, lens or 50.0, ortho)
        scene.camera = cam
        W.render(os.path.join(args.render, f'{wid}-{name}.webp'))
    getattr(mod, 'extra_renders', lambda *a: None)(scene, args.render, report)

with open(os.path.join(out, f'{wid}-report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1)
print('weapon', wid, json.dumps({k: report[k] for k in ('triangles', 'bounds', 'surface')}))
