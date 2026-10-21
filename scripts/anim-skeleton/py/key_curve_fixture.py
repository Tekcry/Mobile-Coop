"""(anim-skeleton S4b) Blender's own keyframe curves for the exact-preview tests (tests/keyCurve.test.ts).

Three parts, written as one JSON (--out):
- `synthetic`: scalar F-curves keyed as key_clip.py keys a clip (keys at their frames of a 48-frame span, the first
  repeated at 48, a CYCLES modifier, BEZIER, AUTO_CLAMPED, fc.update()), evaluated at half frames over the span;
- `rest`: every bone's rest frame (armature space) of the first .blend;
- `real`: from baked clip .blend files (key_clip.py --blend), the F-curves of a few bones: their keys, Blender's computed
  handles and the curve evaluated at the clip's sample frames.
Spec (--spec, JSON): {"synthetic": [{"name", "keys": [[frame, value], ...]}], "blends": [{"name", "path", "frames",
"bones": [...]}]}. Run through scripts/anim-skeleton/s4b-fixtures.mjs (headless, the pinned Blender).
"""
import json
import os
import sys

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'operators', 'py'))
import common  # noqa: E402

args = common.parse_args({'--spec': {'required': True}, '--out': {'required': True}})
common.check_version()
SPAN = 48
with open(args.spec, encoding='utf-8') as f:
    spec = json.load(f)


def curves(act):
    """Every F-curve of the action (Blender 5 layered actions keep them in channelbags), as key_clip.py."""
    out = list(getattr(act, 'fcurves', []) or [])
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                out.extend(bag.fcurves)
    return out


out = {'blender': bpy.app.version_string, 'synthetic': [], 'real': []}

common.empty_scene()
ob = bpy.data.objects.new('probe', None)
bpy.context.scene.collection.objects.link(ob)
for i, c in enumerate(spec.get('synthetic', [])):
    prop = f'p{i}'
    ob[prop] = 0.0
    for fr, v in c['keys']:
        ob[prop] = float(v)
        ob.keyframe_insert(f'["{prop}"]', frame=fr)
    ob[prop] = float(c['keys'][0][1])
    ob.keyframe_insert(f'["{prop}"]', frame=SPAN)
for fc in curves(ob.animation_data.action):
    fc.modifiers.new('CYCLES')
    for kp in fc.keyframe_points:
        kp.interpolation = 'BEZIER'
        kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    fc.update()
by_path = {fc.data_path: fc for fc in curves(ob.animation_data.action)}
for i, c in enumerate(spec.get('synthetic', [])):
    fc = by_path[f'["p{i}"]']
    xs = [q / 2 for q in range(2 * SPAN + 1)]
    out['synthetic'].append({
        'name': c['name'],
        'keys': c['keys'],
        'smoothing': fc.auto_smoothing,
        'handles': [[list(kp.handle_left), list(kp.handle_right)] for kp in fc.keyframe_points],
        'x': xs,
        'y': [fc.evaluate(x) for x in xs],
    })

for b in spec.get('blends', []):
    bpy.ops.wm.open_mainfile(filepath=b['path'])
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    N = b['frames']
    xs = [i * SPAN / N for i in range(N)]
    # the bones' rest frames (armature space, Blender's frame): a bone's channels are its pose in this frame
    if 'rest' not in out:
        out['rest'] = {bn.name: [list(r) for r in bn.matrix_local.to_3x3()] for bn in arm.data.bones}
    for fc in curves(arm.animation_data.action):
        bone = fc.data_path.split('"')[1] if '"' in fc.data_path else ''
        if bone not in b['bones']:
            continue
        out['real'].append({
            'clip': b['name'],
            'path': fc.data_path,
            'index': fc.array_index,
            'cyclic': fc.modifiers[0].type if fc.modifiers else '',
            'smoothing': fc.auto_smoothing,
            'keys': [list(kp.co) for kp in fc.keyframe_points],
            'handles': [[list(kp.handle_left), list(kp.handle_right)] for kp in fc.keyframe_points],
            'x': xs,
            'y': [fc.evaluate(x) for x in xs],
        })

with open(args.out, 'w', encoding='utf-8') as fh:
    json.dump(out, fh)
print(f"key_curve_fixture: {len(out['synthetic'])} synthetic, {len(out['real'])} real curves -> {args.out}")
