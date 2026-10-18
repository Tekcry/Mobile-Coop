import bpy
sc = bpy.context.scene
for vl in sc.view_layers:
    print('VL', vl.name, vl.material_override)
for n in ('wren-base_layer-hero', 'wren-boots-hero', 'wren-head_kit-housing'):
    o = bpy.data.objects[n]
    print('OBJ', n, [(s.link, s.material.name if s.material else None) for s in o.material_slots], [m.type for m in o.modifiers])
m = bpy.data.materials['compression knit']
print('MAT', m.use_nodes, [nd.bl_idname for nd in m.node_tree.nodes][:12])
out = [nd for nd in m.node_tree.nodes if nd.bl_idname == 'ShaderNodeOutputMaterial']
print('OUT', [(o.target, o.is_active_output, [l.from_node.bl_idname for l in o.inputs[0].links]) for o in out])
print('VIEW', sc.view_settings.view_transform, sc.view_settings.look, sc.view_settings.exposure, sc.view_settings.gamma, sc.display_settings.display_device)
