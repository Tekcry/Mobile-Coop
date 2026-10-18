import bpy, numpy as np
for n in ('wren-base_layer-hero','wren-boots-hero','wren-boots-sole','wren-boots-lugs','wren-boots-laces','wren-boots-pull','wren-headwear-hood','wren-headwear-hem','wren-head_kit-cable','wren-body','wren-gloves-hero'):
    o = bpy.data.objects[n]
    me = o.data
    V = np.array([o.matrix_world @ v.co for v in me.vertices])
    print('S', n, 'mods', [m.type for m in o.modifiers], 'uv', [u.name for u in me.uv_layers], 'min', V.min(0).round(3), 'max', V.max(0).round(3))
    if n == 'wren-base_layer-hero':
        L = V[(V[:,0]>0.05)]
        print('S suit min z left leg', L[:,2].min().round(3))
    if n == 'wren-head_kit-cable':
        i = np.argsort(V[:,2]); print('S cable low', V[i[:3]].round(3), 'high', V[i[-3:]].round(3))
    if n == 'wren-boots-hero':
        L = V[V[:,0]>0]
        for z in (0.015,0.025,0.035,0.05,0.08,0.11,0.14,0.18):
            s = L[np.abs(L[:,2]-z)<0.004]
            if len(s): print('S boot z', z, 'x', s[:,0].min().round(3), s[:,0].max().round(3), 'y', s[:,1].min().round(3), s[:,1].max().round(3))
    if n == 'wren-body':
        L = V[(V[:,0]>0.05)&(np.abs(V[:,2]-0.12)<0.005)]
        print('S body ankle z.12 x', L[:,0].min().round(3), L[:,0].max().round(3), 'y', L[:,1].min().round(3), L[:,1].max().round(3))
