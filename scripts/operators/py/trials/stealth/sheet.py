import sys
import bpy
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
out, files = a[0], a[1:]
H = 750
tiles = []
for f in files:
    im = bpy.data.images.load(f)
    w = int(im.size[0] * H / im.size[1])
    im.scale(w, H)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, w, 4)
    tiles.append(px)
sheet = np.concatenate(tiles, axis=1)
img = bpy.data.images.new('sheet', sheet.shape[1], H, alpha=False)
img.pixels = sheet.ravel()
img.filepath_raw = out
img.file_format = 'PNG'
img.save()
