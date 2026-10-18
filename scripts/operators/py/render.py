"""Shared GPU render setup for pipeline test renders: Cycles on OptiX (hardware GPU, never CPU fallback silently),
a neutral studio and a raking-light rig, WebP output.
"""
import math

import bpy
from mathutils import Vector


def use_gpu(scene, samples=256):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    gpus = [d for d in prefs.devices if d.type == 'OPTIX']
    if not gpus:
        raise SystemExit('no OptiX GPU: test renders must run on the hardware GPU')
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Base Contrast'
    return [d.name for d in gpus]


def world(scene, strength=0.15, colour=(0.18, 0.19, 0.21)):
    w = bpy.data.worlds.new('studio')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (*colour, 1.0)
    bg.inputs[1].default_value = strength
    scene.world = w


def area_light(name, loc, target, power, size, colour=(1.0, 0.98, 0.95)):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.size = size
    data.color = colour
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    look_at(obj, target)
    return obj


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(name, loc, target, lens=85.0):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_start = 0.02
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    look_at(obj, target)
    return obj


def floor(size=6.0):
    me = bpy.data.meshes.new('floor')
    h = size / 2
    me.from_pydata([(-h, -h, 0), (h, -h, 0), (h, h, 0), (-h, h, 0)], [], [(0, 1, 2, 3)])
    obj = bpy.data.objects.new('floor', me)
    bpy.context.scene.collection.objects.link(obj)
    mat = bpy.data.materials.new('floor')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.08, 0.08, 0.085, 1)
    bsdf.inputs['Roughness'].default_value = 0.8
    me.materials.append(mat)
    return obj


def clay(name='clay', colour=(0.32, 0.32, 0.33)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Roughness'].default_value = 0.6
    return mat


def studio_rig(centre, height):
    """Key front-left, fill right, rim behind: neutral turntable light."""
    cx, cy, cz = centre
    area_light('key', (cx + 1.6, cy - 2.2, cz + 1.2), centre, 450, 1.6)
    area_light('fill', (cx - 2.2, cy - 1.2, cz + 0.4), centre, 140, 2.0, (0.92, 0.95, 1.0))
    area_light('rim', (cx - 0.6, cy + 2.4, cz + height * 0.6), centre, 380, 1.2, (0.9, 0.95, 1.0))


def write_webp(scene, path, res, quality=90):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = quality
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def deg(v):
    return math.radians(v)
