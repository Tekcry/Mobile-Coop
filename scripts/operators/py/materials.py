"""Procedural Cycles materials for the operator pipeline. Texture space is the 'pattern' UV layer in metres (the flat
fabric), so weaves and knits follow the grain of each panel. Night-adapted desaturated darks, never pure black
(SPEC 2). Wear is restrained: dust settles in creases (ambient occlusion), edges polish where they rub (pointiness
or the 'edge' attribute on patches).

Every material is tagged `operators_class` = 'fabric' or 'hard' (or 'lens': the goggle's coated glass, step 07);
`py/check_garment.py` measures its rendered albedo and roughness against the class limits (fabric albedo 0.02-0.06
linear, roughness 0.7-0.95; hard parts 0.55-0.9; lens roughness 0.02-0.3).
"""
import bpy


class Graph:
    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.out = self.node('ShaderNodeOutputMaterial')
        self.bsdf = self.node('ShaderNodeBsdfPrincipled')
        self.link(self.bsdf.outputs['BSDF'], self.out.inputs['Surface'])

    def node(self, kind, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def link(self, a, b):
        self.nt.links.new(a, b)

    def math(self, op, a, b=None, clamp=False):
        n = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                self.link(v, n.inputs[i])
        return n.outputs[0]

    def uv(self):
        t = self.node('ShaderNodeUVMap', uv_map='pattern')
        sep = self.node('ShaderNodeSeparateXYZ')
        self.link(t.outputs['UV'], sep.inputs[0])
        return sep.outputs['X'], sep.outputs['Y'], t.outputs['UV']

    def tri(self, x, period):
        """Triangle wave 0..1 with the given period: |fract(x / period) - 0.5| * 2."""
        f = self.math('FRACT', self.math('DIVIDE', x, period))
        return self.math('MULTIPLY', self.math('ABSOLUTE', self.math('SUBTRACT', f, 0.5)), 2.0)

    def smoothstep(self, lo, hi, x):
        n = self.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        n.inputs['From Min'].default_value = lo
        n.inputs['From Max'].default_value = hi
        self.link(x, n.inputs['Value'])
        return n.outputs['Result']

    def mix_rgb(self, fac, a, b, blend='MIX'):
        """Colour mix. The Mix node has float, vector and colour sockets with the same names: use the colour ones."""
        n = self.node('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        fac_in = n.inputs[0]
        col_in = [s for s in n.inputs if s.type == 'RGBA']
        col_out = [s for s in n.outputs if s.type == 'RGBA'][0]
        if isinstance(fac, (int, float)):
            fac_in.default_value = fac
        else:
            self.link(fac, fac_in)
        for sock, v in zip(col_in, (a, b)):
            if isinstance(v, tuple):
                sock.default_value = (*v, 1.0)
            else:
                self.link(v, sock)
        return col_out

    def noise(self, scale, detail=2.0, vector=None):
        n = self.node('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        if vector is not None:
            self.link(vector, n.inputs['Vector'])
        return n.outputs['Fac']

    def near_fade(self, near=0.5, far=1.4):
        """1 within `near` metres of the camera, 0 beyond `far`: sub-millimetre bump detail fades out before it
        aliases into moire bands at full-body distance (its look at distance comes from the coarser terms)."""
        cam = self.node('ShaderNodeCameraData')
        return self.smoothstep(far, near, cam.outputs['View Distance'])

    def bump(self, height, strength, distance, normal=None):
        b = self.node('ShaderNodeBump')
        if isinstance(strength, (int, float)):
            b.inputs['Strength'].default_value = strength
        else:
            self.link(strength, b.inputs['Strength'])
        b.inputs['Distance'].default_value = distance
        self.link(height, b.inputs['Height'])
        if normal is not None:
            self.link(normal, b.inputs['Normal'])
        return b.outputs['Normal']

    def wear(self, base, ao_dist=0.03, dust=(0.06, 0.057, 0.052), dust_amount=0.25, edge=None):
        """Dust in creases (AO) and polished, lighter edges."""
        ao = self.node('ShaderNodeAmbientOcclusion', samples=8)
        ao.inputs['Distance'].default_value = ao_dist
        crease = self.math('SUBTRACT', 1.0, ao.outputs['AO'])
        n = self.noise(140.0, 3.0)
        mask = self.math('MULTIPLY', self.smoothstep(0.15, 0.8, crease), self.smoothstep(0.35, 0.7, n))
        col = self.mix_rgb(self.math('MULTIPLY', mask, dust_amount), base, dust)
        if edge is not None:
            col = self.mix_rgb(self.math('MULTIPLY', edge, 0.3), col, (0.06, 0.06, 0.058))
        return col


def knit(name='knit', colour=(0.031, 0.032, 0.033)):
    """Fine elastic jersey knit: wales (columns of V loops) about 1.1 mm apart, soft sheen, fuzz."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, uvv = g.uv()
    wale = g.tri(u, 0.0011)
    loops = g.math('SINE', g.math('ADD', g.math('MULTIPLY', v, 6.2832 / 0.0009), g.math('MULTIPLY', wale, 2.6)))
    env = g.math('SUBTRACT', 1.0, g.math('POWER', wale, 4.0))
    fade = g.near_fade()
    knit_h = g.math('MULTIPLY', g.math('MULTIPLY', g.math('ADD', loops, 1.0), 0.5), env)
    h = g.math('ADD', g.math('MULTIPLY', knit_h, fade), g.math('MULTIPLY', g.noise(3000.0, 1.0), 0.35))
    nrm = g.bump(h, g.math('ADD', 0.12, g.math('MULTIPLY', fade, 0.23)), 0.00025)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.52, 0.62, pt)
    base = g.wear(colour, edge=edge)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.9
    g.bsdf.inputs['Sheen Weight'].default_value = 0.35
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.35
    g.bsdf.inputs['Sheen Tint'].default_value = (0.55, 0.58, 0.55, 1)
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def ripstop(name='ripstop', colour=(0.025, 0.026, 0.027), edge_attr=False):
    """Ripstop nylon/cotton: a plain weave with heavier reinforcement threads every 5 mm in both directions."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, uvv = g.uv()
    gu = g.smoothstep(0.93, 0.99, g.tri(g.math('ADD', u, 0.003), 0.006))
    gv = g.smoothstep(0.93, 0.99, g.tri(g.math('ADD', v, 0.003), 0.006))
    grid = g.math('MAXIMUM', gu, gv)
    weave = g.math('MULTIPLY', g.math('SINE', g.math('MULTIPLY', u, 6.2832 / 0.0004)),
                   g.math('SINE', g.math('MULTIPLY', v, 6.2832 / 0.0004)))
    h = g.math('ADD', g.math('MULTIPLY', grid, 0.6), g.math('MULTIPLY', g.math('MULTIPLY', weave, g.near_fade()), 0.15))
    h = g.math('ADD', h, g.math('MULTIPLY', g.noise(1800.0, 1.0), 0.25))
    nrm = g.bump(h, 0.8, 0.0003)
    base = g.mix_rgb(g.math('MULTIPLY', grid, 0.2), colour, (0.034, 0.035, 0.037))
    if edge_attr:
        at = g.node('ShaderNodeAttribute', attribute_name='edge', attribute_type='GEOMETRY')
        edge = g.math('MULTIPLY', g.smoothstep(0.006, 0.0, at.outputs['Fac']), g.smoothstep(0.3, 0.7, g.noise(90.0, 4.0)))
    else:
        pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
        edge = g.smoothstep(0.53, 0.63, pt)
    base = g.wear(base, edge=edge)
    g.link(base, g.bsdf.inputs['Base Color'])
    rough = g.math('SUBTRACT', 0.82, g.math('MULTIPLY', edge, 0.08))
    g.link(rough, g.bsdf.inputs['Roughness'])
    g.bsdf.inputs['Anisotropic'].default_value = 0.15
    tan = g.node('ShaderNodeTangent', direction_type='UV_MAP', uv_map='pattern')
    g.link(tan.outputs['Tangent'], g.bsdf.inputs['Tangent'])
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def thread(name='thread', colour=(0.036, 0.037, 0.039)):
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    g.bsdf.inputs['Base Color'].default_value = (*colour, 1)
    g.bsdf.inputs['Roughness'].default_value = 0.72
    g.bsdf.inputs['Sheen Weight'].default_value = 0.3
    return mat


def polymer(name='polymer', colour=(0.022, 0.022, 0.023), rough=0.7):
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = Graph(mat)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.55, 0.7, pt)
    g.link(g.mix_rgb(g.math('MULTIPLY', edge, 0.5), colour, (0.06, 0.06, 0.062)), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = rough
    return mat


def painted_metal(name='painted metal', colour=(0.022, 0.022, 0.024)):
    """Black-coated metal; the coating wears through to steel on the sharpest edges."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = Graph(mat)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.math('MULTIPLY', g.smoothstep(0.58, 0.72, pt), g.smoothstep(0.4, 0.6, g.noise(400.0, 3.0)))
    g.link(g.mix_rgb(edge, colour, (0.5, 0.5, 0.52)), g.bsdf.inputs['Base Color'])
    g.link(g.math('ADD', 0.4, g.math('MULTIPLY', edge, 0.6)), g.bsdf.inputs['Metallic'])
    g.link(g.math('SUBTRACT', 0.68, g.math('MULTIPLY', edge, 0.1)), g.bsdf.inputs['Roughness'])
    return mat


def webbing(name='binding', colour=(0.023, 0.024, 0.025)):
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    g.link(g.wear(colour), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.8
    g.bsdf.inputs['Sheen Weight'].default_value = 0.2
    return mat


def clay(name='mannequin', colour=(0.05, 0.05, 0.052)):
    mat = bpy.data.materials.new(name)
    g = Graph(mat)
    g.bsdf.inputs['Base Color'].default_value = (*colour, 1)
    g.bsdf.inputs['Roughness'].default_value = 0.6
    return mat


def cordura(name='cordura', colour=(0.022, 0.023, 0.024)):
    """Heavy Cordura reinforcement: a coarse basket weave (about 0.9 mm), darker than the sleeve, matte."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    wu = g.math('SINE', g.math('MULTIPLY', u, 6.2832 / 0.0009))
    wv = g.math('SINE', g.math('MULTIPLY', v, 6.2832 / 0.0009))
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', wu, wv), 0.5), g.math('MULTIPLY', g.noise(1500.0, 2.0), 0.5))
    nrm = g.bump(h, 0.7, 0.0004)
    at = g.node('ShaderNodeAttribute', attribute_name='edge', attribute_type='GEOMETRY')
    edge = g.math('MULTIPLY', g.smoothstep(0.008, 0.0, at.outputs['Fac']), g.smoothstep(0.35, 0.65, g.noise(80.0, 4.0)))
    centre = g.math('MULTIPLY', g.smoothstep(0.01, 0.03, at.outputs['Fac']), g.smoothstep(0.45, 0.7, g.noise(25.0, 3.0)))
    base = g.wear(colour, dust_amount=0.12, edge=g.math('MULTIPLY', g.math('MAXIMUM', edge, g.math('MULTIPLY', centre, 0.3)), 0.25))
    g.link(base, g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.88
    g.bsdf.inputs['Sheen Weight'].default_value = 0.1
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def loop(name='loop', colour=(0.023, 0.024, 0.025)):
    """Hook-and-loop loop side: dense fuzzy pile, fully matte, a little lighter in its fibre tips."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    n1 = g.noise(5000.0, 4.0)
    n2 = g.noise(900.0, 2.0)
    h = g.math('ADD', n1, g.math('MULTIPLY', n2, 0.5))
    nrm = g.bump(h, 0.6, 0.0004)
    g.link(g.mix_rgb(g.math('MULTIPLY', n1, 0.25), colour, (0.03, 0.031, 0.032)), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.95
    g.bsdf.inputs['Sheen Weight'].default_value = 0.1
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.6
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def softshell(name='softshell', colour=(0.027, 0.028, 0.025)):
    """Stretch soft-shell (trousers): a tight woven face over a brushed back. A fine 2/1 twill (about 0.7 mm) only at
    close range, otherwise smooth and matte with a faint sheen under raking light; slightly olive dark slate, so it
    separates from the charcoal shirt by hue and surface, not by value."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    twill = g.math('SINE', g.math('MULTIPLY', g.math('ADD', u, v), 6.2832 / 0.0007))
    fade = g.near_fade()
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', twill, fade), 0.25), g.math('MULTIPLY', g.noise(900.0, 2.0), 0.3))
    nrm = g.bump(h, g.math('ADD', 0.08, g.math('MULTIPLY', fade, 0.25)), 0.0003)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.53, 0.63, pt)
    base = g.wear(colour, dust_amount=0.3, edge=edge)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.link(g.math('SUBTRACT', 0.8, g.math('MULTIPLY', edge, 0.06)), g.bsdf.inputs['Roughness'])
    g.bsdf.inputs['Sheen Weight'].default_value = 0.25
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.45
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


# --- Torso and belt kit (step 08) -----------------------------------------------------------------------------------

def laminate(name='laser-cut laminate', colour=(0.025, 0.026, 0.026)):
    """Laser-cut laminate (the carrier's and the belt's webbing panels): a coated nylon face over a stiff core - a matte
    coating with a faint fine grain, smoother and less fuzzy than Cordura, scuffed lighter on its cut edges
    (pointiness)."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    # no woven pattern: on curved parts (the belt) a sub-millimetre weave aliased into moire bands (step 08)
    h = g.math('ADD', g.math('MULTIPLY', g.noise(600.0, 2.0), 0.35), g.math('MULTIPLY', g.noise(3000.0, 2.0), 0.15))
    nrm = g.bump(h, 0.25, 0.0003)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.56, 0.68, pt)
    g.link(g.wear(colour, dust_amount=0.15, edge=g.math('MULTIPLY', edge, 0.5)), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.76
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.5
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def elastic(name='cummerbund elastic', colour=(0.026, 0.027, 0.028)):
    """Wide woven elastic (the cummerbund): fine raised ribs across the stretch (about 1.6 mm apart along its height),
    a soft fibre sheen; matte."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    geo = g.node('ShaderNodeNewGeometry')
    z = g.node('ShaderNodeSeparateXYZ')
    g.link(geo.outputs['Position'], z.inputs[0])
    rib = g.math('ABSOLUTE', g.math('SINE', g.math('MULTIPLY', z.outputs['Z'], 6.2832 / 0.0016)))
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', rib, g.near_fade()), 0.6), g.math('MULTIPLY', g.noise(2500.0, 2.0), 0.3))
    nrm = g.bump(h, 0.5, 0.0004)
    g.link(g.wear(colour, dust_amount=0.12), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.86
    g.bsdf.inputs['Sheen Weight'].default_value = 0.25
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.5
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


# --- Gloves and boots (step 06) -------------------------------------------------------------------------------------
# These read a per-vertex 'wear' attribute (0..1, written by py/garments/gloves.py and boots.py): where the item is
# handled or scuffed - the trigger finger and the palm heel polish and darken, the toe rand scuffs lighter.

def _wear_attr(g):
    at = g.node('ShaderNodeAttribute', attribute_name='wear', attribute_type='GEOMETRY')
    return at.outputs['Fac']


def leather(name='glove leather', colour=(0.03, 0.029, 0.027)):
    """Thin goatskin (glove palm): a fine pebbled grain (cells about 0.5 mm) and creases; where it is handled ('wear')
    the grain polishes flat, darker and a little less rough. Matte, never glossy."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    _, _, uvv = g.uv()
    vor = g.node('ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE')
    vor.inputs['Scale'].default_value = 2000.0
    g.link(uvv, vor.inputs['Vector'])
    wear = _wear_attr(g)
    fade = g.near_fade(0.6, 1.6)
    grain = g.math('MULTIPLY', g.smoothstep(0.0, 0.12, vor.outputs['Distance']), g.math('SUBTRACT', 1.0, g.math('MULTIPLY', wear, 0.6)))
    h = g.math('ADD', g.math('MULTIPLY', grain, fade), g.math('MULTIPLY', g.noise(300.0, 3.0), 0.35))
    nrm = g.bump(h, 0.45, 0.0002)
    polished = g.mix_rgb(g.math('MULTIPLY', wear, 0.8), colour, (0.021, 0.0205, 0.02))
    base = g.wear(polished, ao_dist=0.01, dust_amount=0.12)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.link(g.math('SUBTRACT', 0.84, g.math('MULTIPLY', wear, 0.1)), g.bsdf.inputs['Roughness'])
    g.bsdf.inputs['Sheen Weight'].default_value = 0.1
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def suede(name='suede', colour=(0.027, 0.026, 0.024)):     # r2 item 4: darker (was 0.034)
    """Suede (boot overlays): a short raised nap - no weave, soft blotchy value shifts where the nap lies differently,
    a broad sheen at grazing angles, fully matte; scuffs ('wear') flatten the nap a little darker."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    _, _, uvv = g.uv()
    nap = g.node('ShaderNodeTexNoise')
    nap.inputs['Scale'].default_value = 40.0
    nap.inputs['Detail'].default_value = 4.0
    g.link(uvv, nap.inputs['Vector'])
    fine = g.noise(6000.0, 2.0, uvv)
    wear = _wear_attr(g)
    col = g.mix_rgb(g.math('MULTIPLY', g.smoothstep(0.35, 0.7, nap.outputs['Fac']), 0.35), colour, (0.033, 0.032, 0.029))
    col = g.mix_rgb(g.math('MULTIPLY', wear, 0.6), col, (0.024, 0.023, 0.022))
    base = g.wear(col, ao_dist=0.02, dust_amount=0.3)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.link(g.math('SUBTRACT', 0.93, g.math('MULTIPLY', wear, 0.08)), g.bsdf.inputs['Roughness'])
    # step 06 r2: a modest nap sheen (0.6 / 0.6 lit the toe caps near-white in the stealth view)
    g.bsdf.inputs['Sheen Weight'].default_value = 0.22
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.5
    g.bsdf.inputs['Sheen Tint'].default_value = (0.3, 0.3, 0.29, 1)
    # r2 item 4: a napped surface has a weak, broken specular; at the default level the rough Fresnel lobe lit the
    # upward-facing toe caps near-white under a back light (the floor's own grazing glare)
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.2
    g.link(g.bump(g.math('MULTIPLY', fine, g.near_fade()), 0.25, 0.0002), g.bsdf.inputs['Normal'])
    return mat


def nylon(name='boot nylon', colour=(0.025, 0.026, 0.027)):
    """Boot-upper nylon (1000-denier class): a tight plain weave, threads about 0.6 mm, matte with a faint sheen."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    wu = g.math('SINE', g.math('MULTIPLY', u, 6.2832 / 0.0006))
    wv = g.math('SINE', g.math('MULTIPLY', v, 6.2832 / 0.0006))
    fade = g.near_fade()
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', g.math('MULTIPLY', wu, wv), fade), 0.5), g.math('MULTIPLY', g.noise(1200.0, 2.0), 0.4))
    nrm = g.bump(h, 0.6, 0.0003)
    base = g.wear(colour, ao_dist=0.02, dust_amount=0.3)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.84
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.3     # r2 item 4 (see suede)
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def rubber(name='sole rubber', colour=(0.024, 0.024, 0.025), rough=0.82):
    """Soft matte rubber (sole, rand): a faint moulded stipple; dust packs into the hollows (AO) and the 'wear'
    attribute scuffs it lighter and a little smoother (the toe rand)."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = Graph(mat)
    gm = g.node('ShaderNodeNewGeometry')
    st = g.node('ShaderNodeTexNoise')
    st.inputs['Scale'].default_value = 1500.0
    st.inputs['Detail'].default_value = 1.0
    g.link(gm.outputs['Position'], st.inputs['Vector'])
    wear = _wear_attr(g)
    scuff = g.math('MULTIPLY', wear, g.smoothstep(0.3, 0.75, g.noise(120.0, 4.0, gm.outputs['Position'])))
    col = g.mix_rgb(g.math('MULTIPLY', scuff, 0.8), colour, (0.038, 0.037, 0.036))   # r2 item 4: was 0.055
    base = g.wear(col, ao_dist=0.006, dust=(0.07, 0.065, 0.058), dust_amount=0.55)
    g.link(base, g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.3     # r2 item 4: matte moulded rubber (see suede)
    g.link(g.math('SUBTRACT', rough, g.math('MULTIPLY', scuff, 0.12)), g.bsdf.inputs['Roughness'])
    g.link(g.bump(st.outputs['Fac'], 0.15, 0.0002), g.bsdf.inputs['Normal'])
    return mat


def anodised(name='anodised aluminium', colour=(0.024, 0.025, 0.026)):
    """Hard-anodised aluminium (the flip mount, SPEC 3.3): a fine satin sheen; the sharpest edges are worn through to
    bright metal."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = Graph(mat)
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.math('MULTIPLY', g.smoothstep(0.56, 0.68, pt), g.smoothstep(0.35, 0.6, g.noise(300.0, 3.0)))
    g.link(g.mix_rgb(edge, colour, (0.42, 0.42, 0.43)), g.bsdf.inputs['Base Color'])
    g.link(g.math('ADD', 0.7, g.math('MULTIPLY', edge, 0.3)), g.bsdf.inputs['Metallic'])
    g.link(g.math('SUBTRACT', 0.62, g.math('MULTIPLY', edge, 0.05)), g.bsdf.inputs['Roughness'])
    return mat


def lens(name='goggle lens', glow=(0.004, 1.0, 0.045), strength=1.1, attribute='emit'):
    """Coated objective glass (SPEC 3.3): near-black, glossy under a clear coat, a thin-film coating that throws a
    coloured reflection at an angle, and the display leaking through as the signature glow (D13: Wren green, Moth
    amber). Fix round 1 (step 07, item 4): the glow is scaled by the mesh's `attribute` (head_common.lens_assembly:
    1 at the centre, 0.25 at the rim, so it reads as coming from deep in the barrel), is a deeper green and weaker
    (1.8 over a near-white tonemap read pastel and swamped the specular), and the coat adds the glossy sheen over it.
    Without the attribute (a mesh that has none) the glow is uniform. Visual only."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'lens'
    g = Graph(mat)
    b = g.bsdf.inputs
    b['Base Color'].default_value = (0.004, 0.008, 0.006, 1.0)
    b['Roughness'].default_value = 0.05
    b['IOR'].default_value = 1.52
    b['Specular IOR Level'].default_value = 0.7
    b['Coat Weight'].default_value = 1.0
    b['Coat Roughness'].default_value = 0.03
    b['Coat IOR'].default_value = 1.5
    b['Thin Film Thickness'].default_value = 380.0
    b['Thin Film IOR'].default_value = 1.38
    b['Emission Color'].default_value = (*glow, 1.0)
    at = g.node('ShaderNodeAttribute')
    at.attribute_name, at.attribute_type = attribute, 'GEOMETRY'
    # an absent attribute reads 0: max(attr, 0) would kill the glow, so fall back with the attribute's alpha
    # (1 where the attribute exists) - weight = attr * alpha + (1 - alpha)
    wgt = g.math('ADD', g.math('MULTIPLY', at.outputs['Fac'], at.outputs['Alpha']),
                 g.math('SUBTRACT', 1.0, at.outputs['Alpha']))
    g.link(g.math('MULTIPLY', wgt, strength), b['Emission Strength'])
    return mat


def add_emitter(mat, colour=(1.0, 0.45, 0.12), strength=1.2, attribute='emit'):
    """A tiny muted status light on a hard part: emission where the mesh's `attribute` is 1 (ART-DIRECTION 4)."""
    g_nt = mat.node_tree
    bsdf = next(n for n in g_nt.nodes if n.type == 'BSDF_PRINCIPLED')
    at = g_nt.nodes.new('ShaderNodeAttribute')
    at.attribute_name, at.attribute_type = attribute, 'GEOMETRY'
    bsdf.inputs['Emission Color'].default_value = (*colour, 1.0)
    m = g_nt.nodes.new('ShaderNodeMath')
    m.operation = 'MULTIPLY'
    m.inputs[1].default_value = strength
    g_nt.links.new(at.outputs['Fac'], m.inputs[0])
    g_nt.links.new(m.outputs[0], bsdf.inputs['Emission Strength'])
    return mat



# --- Wren's stealth suit (step 08a, ART-DIRECTION 9.1) --------------------------------------------------------------
# One near-black family told apart by surface, not value (ART-DIRECTION 4): the shell's diamond micro-emboss, the
# stretch knit's fine ribs, the abrasion weave's dense basket, the grip's rubber pebble, the vent's perforation. Every
# albedo stays inside 0.02-0.06 linear (the check measures the 1st to 99th percentile), so the dark parts of each
# pattern (the vent holes, the pebble hollows) are 0.021-0.026, not black: their depth comes from the bump.

def suit_shell(name='suit shell', colour=(0.031, 0.032, 0.034)):
    """Bonded stretch soft-shell, the suit's main face: a tonal diamond micro-emboss (1.6 mm) that reads only within
    about a metre (near_fade), smooth and matte beyond; a faint fibre sheen."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    a = g.tri(g.math('ADD', u, v), 0.0016 * 1.4142)
    b = g.tri(g.math('SUBTRACT', u, v), 0.0016 * 1.4142)
    dia = g.math('MULTIPLY', g.smoothstep(0.08, 0.3, a), g.smoothstep(0.08, 0.3, b))   # raised diamonds, sunk grooves
    fade = g.near_fade(0.7, 1.6)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', dia, fade), 0.6), g.math('MULTIPLY', g.noise(900.0, 2.0), 0.2))
    nrm = g.bump(h, g.math('ADD', 0.04, g.math('MULTIPLY', fade, 0.28)), 0.0003)
    col = g.mix_rgb(g.math('MULTIPLY', g.math('SUBTRACT', 1.0, dia), g.math('MULTIPLY', fade, 0.5)), colour,
                    (0.026, 0.027, 0.028))
    g.link(g.wear(col, dust_amount=0.15), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.8
    g.bsdf.inputs['Sheen Weight'].default_value = 0.2
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.45
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def suit_stretch(name='suit stretch knit', colour=(0.034, 0.035, 0.036)):
    """Stretch knit (inner elbows, rear shoulders): fine ribs 2 mm apart across the stretch, softer and fuzzier than
    the shell, a little lighter by its sheen."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    rib = g.math('ABSOLUTE', g.math('SINE', g.math('MULTIPLY', u, 6.2832 / 0.004)))
    fade = g.near_fade(0.7, 1.6)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', rib, fade), 0.7), g.math('MULTIPLY', g.noise(2500.0, 1.0), 0.3))
    g.link(g.wear(colour, dust_amount=0.12), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.9
    g.bsdf.inputs['Sheen Weight'].default_value = 0.4
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.35
    g.link(g.bump(h, g.math('ADD', 0.06, g.math('MULTIPLY', fade, 0.3)), 0.0003), g.bsdf.inputs['Normal'])
    return mat


def suit_abrasion(name='suit abrasion weave', colour=(0.034, 0.035, 0.037)):
    """Abrasion panels (shoulder yokes, elbows, seat): a coarse basket weave (1.4 mm) that reads as a harder, flatter
    cloth than the shell; matter and a shade lighter, scuffed lighter where it pokes out (pointiness). Step 08a fix
    round 1, item 4: the 0.9 mm weave in the shell's tone did not read apart from the shell on the shoulder yokes."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    wu = g.math('SINE', g.math('MULTIPLY', u, 6.2832 / 0.0028))
    wv = g.math('SINE', g.math('MULTIPLY', v, 6.2832 / 0.0028))
    basket = g.math('ABSOLUTE', g.math('MULTIPLY', wu, wv))
    fade = g.near_fade(0.7, 1.6)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', basket, fade), 0.5), g.math('MULTIPLY', g.noise(600.0, 3.0), 0.35))
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.53, 0.63, pt)
    g.link(g.wear(colour, dust_amount=0.25, edge=edge), g.bsdf.inputs['Base Color'])
    g.link(g.math('SUBTRACT', 0.92, g.math('MULTIPLY', edge, 0.06)), g.bsdf.inputs['Roughness'])
    g.bsdf.inputs['Sheen Weight'].default_value = 0.1
    g.link(g.bump(h, g.math('ADD', 0.25, g.math('MULTIPLY', fade, 0.45)), 0.0004), g.bsdf.inputs['Normal'])
    return mat


def suit_grip(name='suit grip rubber', colour=(0.024, 0.024, 0.025)):
    """Rubberised grip (forearms, knees): a printed micro-pebble (about 1.8 mm) in matte rubber; a little glossier than
    the cloth, the pebble tops polished by contact."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = Graph(mat)
    _, _, uvv = g.uv()
    vor = g.node('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 550.0
    g.link(uvv, vor.inputs['Vector'])
    peb = g.math('SUBTRACT', 1.0, g.smoothstep(0.25, 0.5, vor.outputs['Distance']))
    g.link(g.mix_rgb(g.math('MULTIPLY', peb, 0.6), colour, (0.032, 0.032, 0.033)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(peb, 0.45, 0.0004), g.bsdf.inputs['Normal'])
    g.link(g.math('SUBTRACT', 0.72, g.math('MULTIPLY', peb, 0.08)), g.bsdf.inputs['Roughness'])
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.35
    return mat


def suit_vent(name='suit vent panel', colour=(0.033, 0.034, 0.035)):
    """Laser-perforated vents (underarm side panels, backs of the knees): staggered 1.4 mm holes on a 3.2 mm pitch,
    the darker mesh behind them; the holes are sunk by the bump."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    u, v, _ = g.uv()
    p = 0.0032
    vv = g.math('DIVIDE', v, p * 0.866)
    row = g.math('FLOOR', vv)
    fu = g.math('SUBTRACT', g.math('FRACT', g.math('ADD', g.math('DIVIDE', u, p), g.math('MULTIPLY', row, 0.5))), 0.5)
    fv = g.math('MULTIPLY', g.math('SUBTRACT', g.math('FRACT', vv), 0.5), 0.866)
    d = g.math('SQRT', g.math('ADD', g.math('MULTIPLY', fu, fu), g.math('MULTIPLY', fv, fv)))
    hole = g.math('SUBTRACT', 1.0, g.smoothstep(0.19, 0.24, d))          # radius 0.7 mm of the 3.2 mm pitch
    g.link(g.mix_rgb(hole, colour, (0.021, 0.021, 0.022)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(g.math('SUBTRACT', 1.0, hole), 0.7, 0.0004), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.84
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    return mat


def seam_tape(name='suit seam tape', colour=(0.028, 0.029, 0.03)):
    """Bonded seam tape: a thin laminated fabric tape heat-pressed over the seams, smoother than the shell (no emboss),
    a faint satin of the bonding film at a grazing angle. Fabric: it is cloth-backed."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = Graph(mat)
    h = g.math('MULTIPLY', g.noise(1800.0, 2.0), 0.4)
    g.link(g.wear(colour, dust_amount=0.12), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.74
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    g.link(g.bump(h, 0.08, 0.0002), g.bsdf.inputs['Normal'])
    return mat
