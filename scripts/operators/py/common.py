"""Shared helpers for the operator pipeline's Blender scripts (run headless by scripts/operators/blender.mjs).

Every script: parse its args after '--', seed every random source, start from an empty scene, never touch the
network, write only under build/operators/.
"""
import argparse
import json
import random
import sys

import bpy

PINNED_BLENDER = (5, 2, 2)


def parse_args(extra=None):
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, required=True)
    for name, kw in (extra or {}).items():
        ap.add_argument(name, **kw)
    return ap.parse_args(argv)


def check_version():
    if tuple(bpy.app.version) != PINNED_BLENDER:
        raise SystemExit(f'Blender {bpy.app.version_string} refused: pinned to {".".join(map(str, PINNED_BLENDER))}')


def seed_everything(seed):
    """Fixed seeds: Python's random and every scene's Cycles seed, so the same scripts give the same assets."""
    random.seed(seed)
    try:
        import numpy
        numpy.random.seed(seed)
    except ImportError:
        pass
    for scene in bpy.data.scenes:
        scene.cycles.seed = seed


def empty_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def game_to_blender(p):
    """Game frame (+X right, +Y up, +Z forward, left-handed) to Blender (Z up, the model faces -Y, its right on -X).

    The determinant is -1: the handedness flip. The glTF exporter's Y-up conversion and Babylon's loader then
    bring the model back facing +Z with its right on +X (verified when the first glTF is loaded).
    """
    x, y, z = p
    return (-x, -z, y)


def load_operator(path, operator_id):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    for op in data['operators']:
        if op['id'] == operator_id:
            return op
    raise SystemExit(f'operator "{operator_id}" not in {path}')
