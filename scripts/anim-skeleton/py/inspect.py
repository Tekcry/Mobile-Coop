"""anim-skeleton P0: prints a short summary of wren-lods.blend (objects, armatures, bones, mesh LODs, vertex groups).

  blender -b build/anim-skeleton/wren-lods.blend --python scripts/anim-skeleton/py/inspect.py
"""
import bpy

print('== objects')
for o in bpy.data.objects:
    extra = ''
    if o.type == 'MESH':
        arm = next((m.object.name for m in o.modifiers if m.type == 'ARMATURE' and m.object), None)
        extra = f'verts {len(o.data.vertices)} groups {len(o.vertex_groups)} arm {arm} shapekeys {len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0} mods {[m.type for m in o.modifiers]}'
    print(f'  {o.name!r} {o.type} parent={o.parent.name if o.parent else None} {extra}')
print('== scenes', [(s.name, s.render.engine, len(s.objects)) for s in bpy.data.scenes])
for o in bpy.data.objects:
    if o.type != 'ARMATURE':
        continue
    bones = o.data.bones
    print(f'== armature {o.name} ({len(bones)} bones) mw-identity={o.matrix_world == o.matrix_world.Identity(4)}')
    names = [b.name for b in bones if not b.name.startswith(('finger', 'toes'))]
    for n in names:
        b = bones[n]
        print(f'  {n} <- {b.parent.name if b.parent else None} head {tuple(round(x, 3) for x in b.head_local)} tail {tuple(round(x, 3) for x in b.tail_local)}')
    fing = [b.name for b in bones if b.name.startswith('finger')]
    toes = [b.name for b in bones if b.name.startswith('toes')]
    if fing:
        print('  fingers', len(fing), fing[:4], '... parents', sorted({bones[n].parent.name for n in fing}))
    if toes:
        print('  toes', len(toes), toes[:3])
for o in bpy.data.objects:
    if o.type == 'MESH' and o.vertex_groups and len(o.data.vertices) > 1000:
        print(f'== groups {o.name}:', [g.name for g in o.vertex_groups if not g.name.startswith(('finger', 'toes'))], '+', sum(1 for g in o.vertex_groups if g.name.startswith(('finger', 'toes'))), 'finger/toe')
