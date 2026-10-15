"""Procedural Cycles materials for the operator pipeline. Texture space is the 'pattern' UV layer in metres (the flat
fabric), so weaves and knits follow the grain of each panel. Night-adapted desaturated darks, never pure black
(SPEC 2). Wear is restrained: dust settles in creases (ambient occlusion), edges polish where they rub (pointiness
or the 'edge' attribute on patches).

Every material is tagged `operators_class` = 'fabric' or 'hard'; `py/check_garment.py` measures its rendered albedo and
roughness against the class limits (fabric albedo 0.02-0.06 linear, roughness 0.7-0.95; hard parts 0.55-0.9).
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
