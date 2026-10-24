"""Procedural skin, hair and eye materials for the guard heads (guard-models G1h, docs/guard-models/SPEC.md 7).

Everything is generated here: no external skin, eye or hair assets (BRIEF Limits). The materials are baked into the
face tile (skin), the hair cap tiles (hair) by `py/build_head.py`; the eye block is painted directly with numpy.

Neutral albedos (SPEC 7, 8): skin mean ~0.75 linear (the four skin-tone tints multiply it: tint = colour / 0.75), hair
mean ~0.6 (tint = colour / 0.6). The neutral carries only relative variation (redness, lips, shave shadow, brows,
lashes, facial hair), so every tone keeps it.

Skin masks are float point attributes on the high head mesh (0..1), written by build_head.py from the MakeHuman
landmarks and face-target regions:
  m_red (nose, cheeks, ears), m_lips, m_wet (eyelid rim on the eyeball), m_brow, m_lash, m_beard (facial-hair area),
  m_scalp (hair area: shave shadow), m_tzone (forehead and nose: a little glossier), m_crease (forehead, crow's feet).
Texture space is object coordinates in metres (the head is not mirrored or scaled after the masks are written).
"""
import math

import bpy
import numpy as np

from materials import Graph

SKIN_NEUTRAL = 0.75
HAIR_NEUTRAL = 0.6

# Facial hair per SPEC 7 (`face.facialHair`): shadow strength, dot density, strand cover.
FACIAL_HAIR = {
    'clean': {'shadow': 0.10, 'dots': 0.0, 'cover': 0.0},
    'stubble': {'shadow': 0.30, 'dots': 0.55, 'cover': 0.0},
    'beard': {'shadow': 0.35, 'dots': 0.6, 'cover': 0.8},
}


def _attr(g, name):
    return g.node('ShaderNodeAttribute', attribute_name=name, attribute_type='GEOMETRY').outputs['Fac']


def _obj(g, scale=(1.0, 1.0, 1.0)):
    tc = g.node('ShaderNodeTexCoord')
    if scale == (1.0, 1.0, 1.0):
        return tc.outputs['Object']
    mp = g.node('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = scale
    g.link(tc.outputs['Object'], mp.inputs['Vector'])
    return mp.outputs['Vector']


def _voronoi(g, scale, vector, feature='F1', out='Distance', randomness=1.0):
    n = g.node('ShaderNodeTexVoronoi', feature=feature)
    n.inputs['Scale'].default_value = scale
    n.inputs['Randomness'].default_value = randomness
    g.link(vector, n.inputs['Vector'])
    return n.outputs[out]


def _mul(g, *xs):
    acc = xs[0]
    for x in xs[1:]:
        acc = g.math('MULTIPLY', acc, x)
    return acc


def _scale_rgb(g, fac, col, rgb):
    """col * lerp(1, rgb, fac): a relative colour shift."""
    return g.mix_rgb(fac, col, g.mix_rgb(1.0, col, rgb, blend='MULTIPLY'))


def skin(name, facial_hair='clean'):
    """The face skin. Returns (material, sockets): 'albedo', 'rough' are the bake feeds; the BSDF is wired for renders."""
    fh = FACIAL_HAIR[facial_hair]
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'skin'
    g = Graph(mat)
    p = _obj(g)
    red, lips, wet = _attr(g, 'm_red'), _attr(g, 'm_lips'), _attr(g, 'm_wet')
    brow, lash, beard = _attr(g, 'm_brow'), _attr(g, 'm_lash'), _attr(g, 'm_beard')
    scalp, tzone, crease = _attr(g, 'm_scalp'), _attr(g, 'm_tzone'), _attr(g, 'm_crease')

    # --- albedo (neutral light, mean ~0.75): mottling, redness, lips, shave shadow, stubble, beard, brows, lashes
    mott = g.math('ADD', g.math('MULTIPLY', g.noise(45.0, 3.0, p), 0.10), 0.95)          # 0.95..1.05
    fine = g.math('ADD', g.math('MULTIPLY', g.noise(420.0, 2.0, p), 0.06), 0.97)
    v = g.math('MULTIPLY', mott, fine)
    cc = g.node('ShaderNodeCombineColor')
    for i in range(3):
        g.link(v, cc.inputs[i])
    col = g.mix_rgb(1.0, (SKIN_NEUTRAL, SKIN_NEUTRAL * 0.985, SKIN_NEUTRAL * 0.975), cc.outputs[0], blend='MULTIPLY')
    # redness blotches stronger in the middle of the masks
    red_n = _mul(g, red, g.math('ADD', 0.7, g.math('MULTIPLY', g.noise(30.0, 2.0, p), 0.6)))
    col = _scale_rgb(g, g.math('MINIMUM', red_n, 1.0), col, (1.0, 0.80, 0.80))
    col = _scale_rgb(g, lips, col, (0.92, 0.68, 0.68))
    # under-eye / eyelid slightly darker and cooler
    col = _scale_rgb(g, g.math('MULTIPLY', wet, 0.6), col, (0.85, 0.78, 0.80))
    # scalp: light shave shadow (bald, and under every cap)
    dots_s = g.smoothstep(0.35, 0.15, _voronoi(g, 900.0, p))
    shadow_s = g.math('ADD', 0.18, g.math('MULTIPLY', dots_s, 0.25))
    col = _scale_rgb(g, g.math('MULTIPLY', scalp, shadow_s), col, (0.42, 0.42, 0.44))
    # facial hair: shadow + stubble dots + strand cover (dark neutral; the skin tint darkens it further)
    if fh['shadow'] > 0:
        dots = g.smoothstep(0.32, 0.12, _voronoi(g, 1100.0, p))
        amt = g.math('ADD', fh['shadow'], g.math('MULTIPLY', dots, fh['dots']))
        col = _scale_rgb(g, g.math('MINIMUM', g.math('MULTIPLY', beard, amt), 1.0), col, (0.33, 0.33, 0.35))
    if fh['cover'] > 0:
        strands = g.noise(1.0, 2.0, _obj(g, (900.0, 900.0, 140.0)))
        cover = _mul(g, beard, g.smoothstep(0.30, 0.55, strands), fh['cover'])
        col = g.mix_rgb(g.math('MINIMUM', cover, 1.0), col, (0.07, 0.065, 0.06))
    # brows: strands running sideways (Blender X is the head's left-right)
    bstr = g.noise(1.0, 2.0, _obj(g, (160.0, 1400.0, 1400.0)))
    bcov = _mul(g, brow, g.smoothstep(0.32, 0.6, bstr))
    col = g.mix_rgb(g.math('MINIMUM', g.math('MULTIPLY', bcov, 1.2), 1.0), col, (0.06, 0.055, 0.05))
    col = g.mix_rgb(g.math('MINIMUM', g.math('MULTIPLY', lash, 1.1), 1.0), col, (0.03, 0.028, 0.027))
    albedo = col

    # --- roughness: skin 0.52, T-zone glossier, lips, the eye's wet line, hair areas rougher
    pores_r = g.math('MULTIPLY', g.noise(600.0, 1.0, p), 0.06)
    r = g.math('SUBTRACT', g.math('ADD', 0.49, pores_r), g.math('MULTIPLY', tzone, 0.08))
    r = g.math('ADD', r, g.math('MULTIPLY', lips, -0.15))
    r = g.math('ADD', r, g.math('MULTIPLY', g.math('MAXIMUM', bcov, g.math('MULTIPLY', beard, fh['cover'])), 0.15))
    rough = g.math('ADD', g.math('MULTIPLY', r, g.math('SUBTRACT', 1.0, wet)), g.math('MULTIPLY', wet, 0.12), clamp=True)

    # --- height for the normal: pores (cells ~1.2 mm), fine creases, beard / brow strands
    pores = g.math('MULTIPLY', g.smoothstep(0.0, 0.5, _voronoi(g, 820.0, p)), 0.6)
    micro = g.math('MULTIPLY', g.noise(1500.0, 2.0, p), 0.25)
    warp = g.math('MULTIPLY', g.noise(25.0, 2.0, p), 0.004)
    zc = g.node('ShaderNodeSeparateXYZ')
    g.link(p, zc.inputs[0])
    lines = g.math('SINE', g.math('MULTIPLY', g.math('ADD', zc.outputs['Z'], warp), 2 * math.pi / 0.0045))
    creases = _mul(g, crease, g.smoothstep(0.6, 1.0, lines), 0.9)
    h = g.math('ADD', g.math('ADD', pores, micro), g.math('MULTIPLY', creases, -1.0))
    h = g.math('ADD', h, g.math('MULTIPLY', bcov, 0.5))
    if fh['cover'] > 0:
        h = g.math('ADD', h, g.math('MULTIPLY', cover, 0.6))
    # lips smoother, scalp/wet smooth
    h = g.math('MULTIPLY', h, g.math('SUBTRACT', 1.0, g.math('MAXIMUM', wet, g.math('MULTIPLY', lips, 0.6))))
    nrm = g.bump(h, 0.35, 0.00025)

    g.link(albedo, g.bsdf.inputs['Base Color'])
    g.link(rough, g.bsdf.inputs['Roughness'])
    g.link(nrm, g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Subsurface Weight'].default_value = 0.15
    g.bsdf.inputs['Subsurface Radius'].default_value = (0.010, 0.004, 0.002)
    return mat, {'albedo': albedo, 'rough': rough, 'normal': nrm, 'graph': g}


def hair(name, style, crown, part_x=None):
    """Hair cap shell: opaque, strands flowing from the crown (meridians), a left side part on 'sidepart'.

    crown: the whorl in object coordinates (Blender, metres). Strand frequency and bump strength per style.
    """
    fine = {'buzz': (2600.0, 0.25), 'fade': (2200.0, 0.35), 'crop': (1500.0, 0.6), 'receding': (1600.0, 0.55),
            'sidepart': (1100.0, 0.8)}[style]
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hair'
    g = Graph(mat)
    tc = g.node('ShaderNodeTexCoord')
    rel = g.node('ShaderNodeVectorMath', operation='SUBTRACT')
    g.link(tc.outputs['Object'], rel.inputs[0])
    rel.inputs[1].default_value = crown
    sep = g.node('ShaderNodeSeparateXYZ')
    g.link(rel.outputs['Vector'], sep.inputs[0])
    x, y, z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
    phi = g.math('ARCTAN2', x, y)                               # azimuth around the vertical through the crown
    rho = g.math('SQRT', g.math('ADD', g.math('MULTIPLY', x, x), g.math('MULTIPLY', y, y)))
    theta = g.math('ARCTAN2', rho, z)                           # polar angle from straight up (0 over the crown)
    # strand coordinates: across = phi * radius scale, along = theta
    across = g.math('MULTIPLY', phi, 0.09 * fine[0])
    along = g.math('MULTIPLY', theta, 0.09 * fine[0] * 0.08)
    if style == 'sidepart' and part_x is not None:
        # the top is combed sideways from a part on the left (+X in Blender is the head's left): strands run along X
        top = g.smoothstep(0.35, 0.15, theta)
        ax = g.math('MULTIPLY', y, fine[0])
        az = g.math('MULTIPLY', x, fine[0] * 0.08)
        across = g.math('ADD', g.math('MULTIPLY', g.math('SUBTRACT', 1.0, top), g.math('MULTIPLY', phi, 0.09 * fine[0])),
                        g.math('MULTIPLY', top, ax))
        along = g.math('ADD', g.math('MULTIPLY', g.math('SUBTRACT', 1.0, top), along), g.math('MULTIPLY', top, az))
    cc = g.node('ShaderNodeCombineXYZ')
    g.link(across, cc.inputs['X'])
    g.link(along, cc.inputs['Y'])
    strands = g.noise(1.0, 3.0, cc.outputs['Vector'])
    clump = g.noise(0.25, 2.0, cc.outputs['Vector'])
    h = g.math('ADD', g.math('MULTIPLY', strands, 0.8), g.math('MULTIPLY', clump, 0.4))
    if style == 'sidepart' and part_x is not None:
        groove = g.smoothstep(0.004, 0.0, g.math('ABSOLUTE', g.math('SUBTRACT', x, part_x - crown[0])))
        h = g.math('SUBTRACT', h, g.math('MULTIPLY', groove, g.smoothstep(0.5, 0.25, theta)))
    v = g.math('ADD', 0.80, g.math('MULTIPLY', h, 0.33))     # mean ~1.0 of the neutral
    cc2 = g.node('ShaderNodeCombineColor')
    for i in range(3):
        g.link(v, cc2.inputs[i])
    albedo = g.mix_rgb(1.0, (HAIR_NEUTRAL, HAIR_NEUTRAL, HAIR_NEUTRAL), cc2.outputs[0], blend='MULTIPLY')
    rough = g.math('ADD', 0.42, g.math('MULTIPLY', strands, 0.12))
    nrm = g.bump(h, fine[1], 0.0004)
    g.link(albedo, g.bsdf.inputs['Base Color'])
    g.link(rough, g.bsdf.inputs['Roughness'])
    g.link(nrm, g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Sheen Weight'].default_value = 0.3
    return mat, {'albedo': albedo, 'rough': rough, 'normal': nrm, 'graph': g}


# ---------------------------------------------------------------- eye block (numpy, no bake)
IRIS = {  # linear RGB: outer ring, inner (near the pupil), fleck
    'brown': ((0.060, 0.030, 0.012), (0.120, 0.060, 0.020), (0.16, 0.09, 0.03)),
    'darkbrown': ((0.025, 0.013, 0.006), (0.055, 0.028, 0.010), (0.08, 0.045, 0.015)),
    'hazel': ((0.07, 0.07, 0.03), (0.14, 0.08, 0.025), (0.20, 0.16, 0.06)),
    'bluegrey': ((0.10, 0.14, 0.17), (0.20, 0.24, 0.26), (0.30, 0.33, 0.33)),
}
IRIS_R = 0.42      # iris radius in cell units (cell half-width = 0.5): the eye UV maps the eye's front onto the cell
PUPIL_R = 0.15


def eye_block(irises, size=256, seed=0):
    """Albedo (linear), normal (tangent, 0..1) and ORM arrays (size x size x 4) of the shared eye block: 2 x 2 cells,
    one iris colour each in `irises` order (cell i at column i % 2, row i // 2, row 0 at the bottom: Blender's v)."""
    rng = np.random.default_rng(seed)
    n = size // 2
    alb = np.zeros((size, size, 4), np.float32)
    nrm = np.zeros((size, size, 4), np.float32)
    orm = np.zeros((size, size, 4), np.float32)
    yy, xx = np.mgrid[0:n, 0:n]
    u = (xx + 0.5) / n - 0.5
    v = (yy + 0.5) / n - 0.5
    r = np.hypot(u, v)
    a = np.arctan2(v, u)
    for i, name in enumerate(irises):
        outer, inner, fleck = (np.array(c, np.float32) for c in IRIS[name])
        # sclera: warm off-white, faint veins toward the edge, darker at the edge (it curves away)
        sclera = np.array((0.62, 0.58, 0.55), np.float32)
        vein_a = rng.uniform(0, 2 * np.pi, 9)
        veins = np.zeros_like(r)
        for va in vein_a:
            d = np.abs(np.angle(np.exp(1j * (a - va - 0.25 * np.sin(r * 18 + va)))))
            veins = np.maximum(veins, np.clip(1 - d / 0.03, 0, 1) * np.clip((r - 0.47) / 0.08, 0, 1))
        c = sclera[None, None, :] * (1 - 0.18 * np.clip((r - 0.45) / 0.05, 0, 1))[..., None]
        c = c * (1 - 0.35 * veins[..., None] * np.array((0.2, 1, 1), np.float32))
        # iris: radial fibres, inner collarette, dark limbal ring
        t = np.clip(r / IRIS_R, 0, 1)
        fib = 0.5 + 0.5 * np.sin(a * 70 + 3 * np.sin(a * 11)) * np.sin(a * 23 + 2.0)
        ic = inner[None, None, :] * (1 - t[..., None]) + outer[None, None, :] * t[..., None]
        ic = ic * (0.8 + 0.4 * fib[..., None])
        fl = np.clip(1 - np.abs(t - 0.45) / 0.1, 0, 1) * (fib > 0.7)
        ic = ic * (1 - fl[..., None]) + fleck[None, None, :] * fl[..., None]
        limbal = np.clip((t - 0.85) / 0.15, 0, 1)
        ic = ic * (1 - 0.6 * limbal[..., None])
        iris = r < IRIS_R
        c = np.where(iris[..., None], ic, c)
        c = np.where((r < PUPIL_R)[..., None], np.array((0.006, 0.006, 0.007), np.float32), c)
        x0, y0 = (i % 2) * n, (i // 2) * n
        alb[y0:y0 + n, x0:x0 + n, :3] = c
        alb[y0:y0 + n, x0:x0 + n, 3] = 1
        # normal: the iris is a shallow cone (fibres), the sclera flat
        h = np.where(iris, 0.02 * fib, 0.0)
        gy, gx = np.gradient(h)
        nv = np.stack([-gx * 6, -gy * 6, np.ones_like(h)], -1)
        nv /= np.linalg.norm(nv, axis=-1, keepdims=True)
        nrm[y0:y0 + n, x0:x0 + n, :3] = nv * 0.5 + 0.5
        nrm[y0:y0 + n, x0:x0 + n, 3] = 1
        # ORM: occlusion 1 (the head's AO darkens the socket), wet roughness, no metal
        orm[y0:y0 + n, x0:x0 + n, 0] = 1.0 - 0.25 * np.clip((r - 0.44) / 0.06, 0, 1)
        orm[y0:y0 + n, x0:x0 + n, 1] = np.where(iris, 0.08, 0.12)
        orm[y0:y0 + n, x0:x0 + n, 3] = 1
    return alb, nrm, orm
