"""MakeHuman hm08 base body (CC0 data from MPFB2, fetched by scripts/operators/fetch-base-body.mjs).

Pure numpy: reads the base mesh, applies macro targets, finds joint centres and reads the CC0 default rig weights.
No MPFB code is used. MakeHuman's frame: +Y up, the body faces +Z, its left on +X, decimetres, origin near the crotch.
"""
import gzip
import json
import os

import numpy as np

RACES = ('african', 'asian', 'caucasian')


class BaseBody:
    def __init__(self, data_dir):
        self.dir = data_dir
        verts, faces, face_group = [], [], []
        group = None
        with open(os.path.join(data_dir, '3dobjs', 'base.obj'), encoding='utf-8') as f:
            for line in f:
                if line.startswith('v '):
                    verts.append([float(t) for t in line.split()[1:4]])
                elif line.startswith('g '):
                    group = line.split(None, 1)[1].strip()
                elif line.startswith('f '):
                    faces.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
                    face_group.append(group)
        self.base = np.array(verts, dtype=np.float64)
        self.faces = faces
        self.face_group = face_group
        with open(os.path.join(data_dir, 'mesh_metadata', 'basemesh_vertex_groups.json'), encoding='utf-8') as f:
            self.vgroups = json.load(f)
        self._targets = {}

    def group_indices(self, name):
        idx = []
        for a, b in self.vgroups[name]:
            idx.extend(range(a, b + 1))
        return np.array(idx, dtype=np.int64)

    def target(self, rel):
        """A .target.gz as (indices, offsets) in decimetres."""
        if rel not in self._targets:
            path = os.path.join(self.dir, 'targets', rel)
            idx, off = [], []
            with gzip.open(path, 'rt', encoding='utf-8') as f:
                for line in f:
                    t = line.split()
                    if len(t) != 4 or line.startswith('#'):
                        continue
                    idx.append(int(t[0]))
                    off.append([float(t[1]), float(t[2]), float(t[3])])
            self._targets[rel] = (np.array(idx, dtype=np.int64), np.array(off, dtype=np.float64).reshape(-1, 3))
        return self._targets[rel]

    def apply(self, co, rel, weight):
        if abs(weight) < 1e-6:
            return
        idx, off = self.target(rel)
        if len(idx):
            co[idx] += off * weight

    def macro(self, gender, muscle, weight, height=0.5, proportions=0.5):
        """Vertex positions for the macro sliders (MakeHuman's own weighting, age fixed at young adult = 25)."""
        co = self.base.copy()
        genders = (('female', 1.0 - gender), ('male', gender))
        muscles = _tri('minmuscle', 'averagemuscle', 'maxmuscle', muscle)
        weights = _tri('minweight', 'averageweight', 'maxweight', weight)
        for g, gw in genders:
            for race in RACES:
                self.apply(co, f'macrodetails/{race}-{g}-young.target.gz', gw / 3.0)
            for m, mw in muscles:
                for w, ww in weights:
                    base_w = gw * mw * ww
                    self.apply(co, f'macrodetails/universal-{g}-young-{m}-{w}.target.gz', base_w)
                    if height > 0.5:
                        self.apply(co, f'macrodetails/height/{g}-young-{m}-{w}-maxheight.target.gz',
                                   base_w * (height - 0.5) * 2.0)
                    elif height < 0.5:
                        self.apply(co, f'macrodetails/height/{g}-young-{m}-{w}-minheight.target.gz',
                                   base_w * (0.5 - height) * 2.0)
                    if proportions > 0.5:
                        self.apply(co, f'macrodetails/proportions/{g}-young-{m}-{w}-idealproportions.target.gz',
                                   base_w * (proportions - 0.5) * 2.0)
                    elif proportions < 0.5:
                        self.apply(co, f'macrodetails/proportions/{g}-young-{m}-{w}-uncommonproportions.target.gz',
                                   base_w * (0.5 - proportions) * 2.0)
        return co

    def joint(self, co, name):
        """Centre of a joint cube (e.g. 'joint-l-elbow')."""
        return co[self.group_indices(name)].mean(axis=0)

    def weights(self, rig='default'):
        with open(os.path.join(self.dir, 'rigs', 'standard', f'weights.{rig}.json'), encoding='utf-8') as f:
            return json.load(f)['weights']


def _tri(lo, mid, hi, v):
    """MakeHuman's three-way slider split: 0 -> lo, 0.5 -> mid, 1 -> hi."""
    if v < 0.5:
        return ((lo, 1.0 - v * 2.0), (mid, v * 2.0))
    return ((mid, 1.0 - (v - 0.5) * 2.0), (hi, (v - 0.5) * 2.0))
