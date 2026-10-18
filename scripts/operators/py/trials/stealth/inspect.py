import bpy
for o in bpy.data.objects:
    print('OBJ', o.name, o.type, len(o.data.vertices) if o.type=='MESH' else '', [m.name for m in o.data.materials] if o.type=='MESH' else '', o.hide_render, o.parent.name if o.parent else '')
print('MATS', sorted(m.name for m in bpy.data.materials))
for o in bpy.data.objects:
    if o.type=='ARMATURE':
        for b in o.data.bones:
            h=o.matrix_world@b.head_local
            print('BONE', b.name, tuple(round(v,3) for v in h))
