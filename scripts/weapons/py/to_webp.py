"""PNG screenshots to WebP (the in-game review shots kept in git): blender -b --python to_webp.py -- <dir> [quality]."""
import glob
import os
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
src = os.path.abspath(argv[0])
q = int(argv[1]) if len(argv) > 1 else 85
scene = bpy.context.scene
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.quality = q
scene.render.image_settings.color_mode = 'RGB'
for png in sorted(glob.glob(os.path.join(src, '*.png'))):
    im = bpy.data.images.load(png)
    out = png[:-4] + '.webp'
    im.save_render(out, scene=scene)
    bpy.data.images.remove(im)
    os.remove(png)
    print('webp', os.path.basename(out), os.path.getsize(out))
