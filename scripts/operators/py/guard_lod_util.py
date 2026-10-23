"""Pure numpy helpers of the guard LOD bake (guard-models G4, bake_guard.py). No bpy: they run in plain Python too
(`<blender>/5.2/python/bin/python.exe -I scripts/operators/py/guard_lod_util.py` runs the self-test below).

Images are float arrays (h, w, c) in Blender's pixel order: row 0 at v = 0 (the bottom), x from the left.
"""
import numpy as np


def raster(tris_px, values, w, h):
    """Rasterises triangles (T, 3, 2) given in pixel coordinates (x right, y up from the bottom; pixel centres at +0.5)
    with one value per triangle into (h, w) float32, plus the coverage mask. Later triangles win where they overlap."""
    out = np.zeros((h, w), np.float32)
    cov = np.zeros((h, w), bool)
    tris_px = np.asarray(tris_px, np.float64)
    for t, v in zip(tris_px, values):
        x0 = max(0, int(np.floor(t[:, 0].min())))
        x1 = min(w - 1, int(np.ceil(t[:, 0].max())))
        y0 = max(0, int(np.floor(t[:, 1].min())))
        y1 = min(h - 1, int(np.ceil(t[:, 1].max())))
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = t
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        l0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        l1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        l2 = 1.0 - l0 - l1
        eps = -1e-6
        inside = (l0 >= eps) & (l1 >= eps) & (l2 >= eps)
        if not inside.any():
            # a sliver thinner than a pixel still marks the pixel its centroid falls in
            px = min(w - 1, max(0, int((ax + bx + cx) / 3)))
            py = min(h - 1, max(0, int((ay + by + cy) / 3)))
            out[py, px] = v
            cov[py, px] = True
            continue
        sub = out[y0:y1 + 1, x0:x1 + 1]
        sub[inside] = v
        cov[y0:y1 + 1, x0:x1 + 1] |= inside
    return out, cov


def dilate(val, cov, iters):
    """Grows covered values into uncovered pixels `iters` pixels out (the max of covered neighbours): so bilinear
    filtering at an island's edge reads the island's own value."""
    val = val.copy()
    cov = cov.copy()
    for _ in range(iters):
        acc = np.zeros_like(val)
        hit = np.zeros_like(cov)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sv = np.roll(np.roll(val, dy, 0), dx, 1)
            sc = np.roll(np.roll(cov, dy, 0), dx, 1)
            take = sc & ~cov
            acc = np.where(take, np.maximum(acc, sv), acc)
            hit |= take
        val = np.where(hit, acc, val)
        cov = cov | hit
    return val, cov


def uv_to_rect(uv, offset, scale):
    """Local [0, 1] UV -> atlas UV: offset + uv * scale (no rotation, so tangent frames are unchanged)."""
    uv = np.asarray(uv, np.float64)
    return np.asarray(offset) + uv * np.asarray(scale)


def resize(img, w, h):
    """Box-filter downscale by whole factors, else nearest; (h, w, c) float. Upscaling repeats pixels."""
    H, W = img.shape[:2]
    if (W, H) == (w, h):
        return img.copy()
    if W % w == 0 and H % h == 0 and W >= w and H >= h:
        fx, fy = W // w, H // h
        return img.reshape(h, fy, w, fx, -1).mean(axis=(1, 3))
    ys = np.minimum((np.arange(h) + 0.5) * H / h, H - 1).astype(int)
    xs = np.minimum((np.arange(w) + 0.5) * W / w, W - 1).astype(int)
    return img[ys][:, xs]


def renormalize(nrm):
    """Tangent normal map (0..1 encoded) back to unit vectors after filtering; alpha kept."""
    v = nrm[..., :3] * 2.0 - 1.0
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    v = np.where(n > 1e-6, v / np.maximum(n, 1e-6), np.array([0.0, 0.0, 1.0]))
    out = nrm.copy()
    out[..., :3] = v * 0.5 + 0.5
    return out


def place(atlas, img, x, y, gutter):
    """Writes img (h, w, c) at (x, y) of atlas and extends its edge pixels `gutter` pixels into the gutter round it
    (clipped to the atlas), so mips and bilinear filtering never mix in a neighbour or the fill colour."""
    h, w = img.shape[:2]
    H, W = atlas.shape[:2]
    g = int(gutter)
    padded = np.pad(img, ((g, g), (g, g), (0, 0)), mode='edge') if g > 0 else img
    X0, Y0 = x - g, y - g
    sx0, sy0 = max(0, -X0), max(0, -Y0)
    X1, Y1 = min(W, X0 + w + 2 * g), min(H, Y0 + h + 2 * g)
    atlas[max(0, Y0):Y1, max(0, X0):X1] = padded[sy0:sy0 + (Y1 - max(0, Y0)), sx0:sx0 + (X1 - max(0, X0))]


def fill_missed(img, cov, flat=None):
    """Texels no bake ray reached take the mean of the covered ones (or `flat`): no black holes in the maps."""
    if not cov.any() or cov.all():
        return img
    out = img.copy()
    fillv = np.asarray(flat, np.float32) if flat is not None else img[cov].mean(axis=0)
    out[~cov] = fillv
    return out


def fold_weights(rows, bones, fold, k):
    """Skin weights per vertex (list of {bone: w}) onto one LOD's bones: a bone in `fold` (finger -> wrist) gives its
    weight to its target, any other bone not in `bones` is dropped, then the top `k` are kept and normalised. A vertex
    left with no weight keeps its largest original bone's fold target or, failing that, the first bone."""
    bones = list(bones)
    have = set(bones)
    out = []
    for r in rows:
        acc = {}
        for b, w in r.items():
            if w <= 0:
                continue
            t = b
            seen = 0
            while t not in have and t in fold and seen < 8:
                t = fold[t]
                seen += 1
            if t in have:
                acc[t] = acc.get(t, 0.0) + w
        top = sorted(acc.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
        s = sum(w for _, w in top)
        if s <= 0:
            out.append({bones[0]: 1.0})
            continue
        out.append({b: w / s for b, w in top})
    return out


def seam_pairs(head_pts, body_pts, tol):
    """For each head vertex, the index of the body seam vertex within `tol` metres (or -1): the neck weld (G1h builds
    every head with its seam ring at the body's seam positions, so the match is exact up to float noise)."""
    head_pts = np.asarray(head_pts, np.float64).reshape(-1, 3)
    body_pts = np.asarray(body_pts, np.float64).reshape(-1, 3)
    if not len(body_pts) or not len(head_pts):
        return np.full(len(head_pts), -1, int)
    d = np.linalg.norm(head_pts[:, None, :] - body_pts[None, :, :], axis=2)
    j = d.argmin(axis=1)
    return np.where(d[np.arange(len(head_pts)), j] <= tol, j, -1)


def seam_pairs_mh(mh, pts, seam_mh, seam_pts, eligible=None):
    """The neck weld by hm08 index (lead ruling X2: G1h builds the heads in G1's body frame, so no transform): for each
    seam slot j (body seam vertex with hm08 index seam_mh[j] at seam_pts[j]) the one vertex of this mesh carrying that
    index (among `eligible`), the nearest to seam_pts[j] when decimation left more than one with it. Returns (pair, snap):
    pair[i] = j for the chosen vertex i, else -1; snap[j] = that vertex's distance to seam_pts[j] (inf when absent)."""
    mh = np.asarray(mh).reshape(-1)
    pts = np.asarray(pts, np.float64).reshape(-1, 3)
    seam_pts = np.asarray(seam_pts, np.float64).reshape(-1, 3)
    ok = np.ones(len(mh), bool) if eligible is None else np.asarray(eligible, bool)
    pair = np.full(len(mh), -1, int)
    snap = np.full(len(seam_mh), np.inf)
    for j, m in enumerate(seam_mh):
        cand = np.nonzero((mh == int(m)) & ok)[0]
        if not len(cand):
            continue
        d = np.linalg.norm(pts[cand] - seam_pts[j], axis=1)
        k = int(d.argmin())
        pair[cand[k]] = j
        snap[j] = float(d[k])
    return pair, snap


def lod_bones_from_kit(bones):
    """`lodBones` as G1's body report gives it, rebuilt from the kit's `bones` (bodies baked before G1 wrote it): LOD0 the
    rig joints + fingers, LOD1 / LOD2 the rig joints, each finger folding onto its `fingerParent` (finger<S>... -> wr<S>)."""
    rig = list(bones['rig'])
    fingers = list(bones.get('fingers', []))
    parent = bones.get('fingerParent', {})
    fold = {f: parent[f.split('_')[0]] for f in fingers if f.split('_')[0] in parent}
    return {'lod0': rig + fingers, 'lod1': rig, 'lod2': rig, 'fold': fold,
            'influences': list(bones.get('influences', [4, 4, 2]))}


def island_labels(nv, edges):
    """Loose-island label per vertex (the smallest vertex index of its island) from an (m, 2) int edge array: min-label
    hooking with pointer jumping, all numpy (a 1M-triangle garment hero settles in a few rounds)."""
    lab = np.arange(nv)
    edges = np.asarray(edges, np.int64).reshape(-1, 2)
    if not len(edges):
        return lab
    u, v = edges[:, 0], edges[:, 1]
    while True:
        lu, lv = lab[u], lab[v]
        m = np.minimum(lu, lv)
        new = lab.copy()
        np.minimum.at(new, lu, m)
        np.minimum.at(new, lv, m)
        while True:
            nn = new[new]
            if np.array_equal(nn, new):
                break
            new = nn
        if np.array_equal(new, lab):
            return lab
        lab = new


def island_mask(co, loop_verts, loop_start, loop_total, target=None, min_diag=0.0):
    """Per-polygon keep mask over a mesh's loose islands, for a LOD mesh whose source carries many tiny islands (G2's
    stitches, rivets, grommets: a collapse decimate cannot take an island below a few triangles, so 5,000 stitches floor
    a garment far over its budget; the full source still bakes them into the atlas). Islands whose bounding-box diagonal
    is under `min_diag` go first; then, when `target` is given, the smallest remaining islands go until the triangles left
    fit it. The largest island always stays, and so does the largest island on each side of the mid-plane x = 0 (by its
    bounding-box centre; X is lateral in G1's body frame), so a pair (two gloves, two boots) never loses one member: the
    mask may then stay over `target`. Returns (keep, islands dropped)."""
    co = np.asarray(co, np.float64).reshape(-1, 3)
    lv = np.asarray(loop_verts, np.int64)
    ls = np.asarray(loop_start, np.int64)
    lt = np.asarray(loop_total, np.int64)
    npoly = len(ls)
    if not npoly:
        return np.ones(0, bool), 0
    poly_of_loop = np.repeat(np.arange(npoly), lt)
    first = lv[ls][poly_of_loop]
    lab = island_labels(len(co), np.stack([lv, first], 1))
    plab = lab[lv[ls]]
    ids, pinv = np.unique(plab, return_inverse=True)
    k = len(ids)
    tris = np.bincount(pinv, weights=lt - 2, minlength=k)
    used = np.unique(lv)
    vinv = np.searchsorted(ids, lab[used])
    lo = np.full((k, 3), np.inf)
    hi = np.full((k, 3), -np.inf)
    np.minimum.at(lo, vinv, co[used])
    np.maximum.at(hi, vinv, co[used])
    diag = np.linalg.norm(hi - lo, axis=1)
    protect = np.zeros(k, bool)
    protect[int(np.argmax(tris))] = True
    cx = 0.5 * (lo[:, 0] + hi[:, 0])
    for side in (cx < 0, cx >= 0):
        idx = np.flatnonzero(side)
        if len(idx):
            protect[idx[np.lexsort((diag[idx], tris[idx]))[-1]]] = True  # most triangles, then the larger box
    drop = (diag < min_diag) & ~protect
    if target is not None:
        left = tris[~drop].sum()
        for i in np.argsort(diag, kind='stable'):
            if left <= target:
                break
            if drop[i] or protect[i]:
                continue
            drop[i] = True
            left -= tris[i]
    return ~drop[pinv], int(drop.sum())


def _selftest():
    v, c = raster([[[0, 0], [8, 0], [0, 8]]], [1.0], 8, 8)
    assert c[0, 0] and not c[7, 7] and v[0, 0] == 1.0, 'raster'
    v2, c2 = dilate(v, c, 1)
    assert c2.sum() > c.sum(), 'dilate'
    img = np.arange(16, dtype=np.float32).reshape(4, 4, 1)
    assert resize(img, 2, 2).shape == (2, 2, 1) and abs(resize(img, 2, 2)[0, 0, 0] - 2.5) < 1e-6, 'resize'
    at = np.zeros((10, 10, 1), np.float32)
    place(at, np.ones((2, 2, 1), np.float32), 4, 4, 1)
    assert at[3:7, 3:7].sum() == 16 and at.sum() == 16, 'place'
    w = fold_weights([{'fingerL_1': 0.6, 'wrL': 0.2, 'elL': 0.2}], ['wrL', 'elL'], {'fingerL_1': 'wrL'}, 2)
    assert abs(w[0]['wrL'] - 0.8) < 1e-9 and abs(w[0]['elL'] - 0.2) < 1e-9, 'fold'
    w = fold_weights([{'a': 0.5, 'b': 0.3, 'c': 0.2}], ['a', 'b', 'c'], {}, 2)
    assert set(w[0]) == {'a', 'b'} and abs(sum(w[0].values()) - 1) < 1e-9, 'limit'
    p = seam_pairs([[0, 0, 0], [1, 1, 1]], [[0, 0, 1e-7]], 1e-4)
    assert list(p) == [0, -1], 'seam'
    # mh weld: the duplicate index 7 (a decimated vertex) loses to the nearer one; an ineligible (eye) vertex never pairs
    pr, sn = seam_pairs_mh([7, 9, 7, 9, 3], [[0, 0, 0.5], [1, 0, 0], [0, 0, 0], [1, 0, 0], [5, 5, 5]],
                           [7, 9, 4], [[0, 0, 0], [1, 0, 0], [2, 0, 0]], [True, False, True, True, True])
    assert list(pr) == [-1, -1, 0, 1, -1] and sn[0] == 0 and sn[1] == 0 and sn[2] == np.inf, 'seam mh'
    lb = lod_bones_from_kit({'rig': ['root', 'wrL'], 'fingers': ['fingerL_1_1'], 'fingerParent': {'fingerL': 'wrL'}})
    assert lb['lod0'] == ['root', 'wrL', 'fingerL_1_1'] and lb['lod1'] == ['root', 'wrL'], 'lodBones'
    assert lb['fold'] == {'fingerL_1_1': 'wrL'} and lb['influences'] == [4, 4, 2], 'lodBones fold'
    n = renormalize(np.array([[[0.5, 0.5, 0.75, 1.0]]]))
    assert abs(n[0, 0, 2] - 1.0) < 1e-6, 'renormalize'
    lab = island_labels(7, [[5, 4], [4, 3], [3, 2], [2, 1], [1, 0]])
    assert list(lab) == [0, 0, 0, 0, 0, 0, 6], 'island labels'
    co = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [5, 5, 5], [5.001, 5, 5], [5, 5.001, 5],
          [2, 0, 0], [2.5, 0, 0], [2, 0.3, 0]]
    lv, ls, lt = [0, 1, 2, 0, 2, 3, 4, 5, 6, 9, 8, 7], [0, 3, 6, 9], [3, 3, 3, 3]
    keep, n = island_mask(co, lv, ls, lt, None, 0.01)
    assert list(keep) == [True, True, False, True] and n == 1, 'islands: tiny'
    keep, n = island_mask(co, lv, ls, lt, 2, 0.0)
    assert list(keep) == [True, True, False, False] and n == 2, 'islands: to budget'
    keep, n = island_mask(co, lv, ls, lt, 0, 10.0)
    assert list(keep) == [True, True, False, False] and n == 2, 'islands: largest stays'
    # a pair (gloves at x = -1 / +1, one triangle each) plus a small bit on the right: a target of 1 drops only the bit
    co = [[-1.2, 0, 0], [-0.8, 0, 0], [-1, 0.3, 0], [0.8, 0, 0], [1.2, 0, 0], [1, 0.3, 0],
          [0.5, 0, 0], [0.52, 0, 0], [0.5, 0.02, 0]]
    keep, n = island_mask(co, list(range(9)), [0, 3, 6], [3, 3, 3], 1, 0.0)
    assert list(keep) == [True, True, False] and n == 1, 'islands: a pair keeps both members'
    keep, n = island_mask(co, list(range(9)), [0, 3, 6], [3, 3, 3], None, 1.0)
    assert list(keep) == [True, True, False] and n == 1, 'islands: tiny pass keeps both members'
    print('guard_lod_util self-test: ok')


if __name__ == '__main__':
    _selftest()
