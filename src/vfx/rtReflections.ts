import { Effect, Matrix, PassPostProcess, PostProcess, type Camera, type DepthRenderer, type Scene } from '../core/babylon';
import { PARAMS_GLSL, VX_MAT_GLSL, type VoxelTextures } from '../voxel/voxelPlugin';
import type { LightRegistry } from '../world/lights';

/** Lights the reflections shade their hits with (nearest the camera). */
export const RT_LIGHTS = 16;
/** Characters (capsules) the reflection rays can hit. */
export const RT_CAPSULES = 16;

/**
 * Ray-traced reflections (3.0, Reflections: Ray traced). Per pixel (every pixel, or half of them in a checkerboard
 * that alternates each frame): the voxel the pixel
 * shows (the brickmap) gives the surface - its axis normal, metalness, rain wetness and puddles - so only glossy
 * surfaces spend rays. The reflected ray (jittered by roughness; TAA averages it) first marches in screen space
 * against the depth buffer (what is on screen, characters included); missing that, it walks the brickmap with a DDA
 * (empty bricks skipped whole) and the characters as capsules, and shades the hit: palette colour, the sky fill by
 * the baked sky visibility, the nearest lights (no shadows), emissive. A full-resolution pass upsamples and adds it.
 */
Effect.ShadersStore['rtReflectFragmentShader'] = `
precision highp float;
precision highp int;
precision highp sampler3D;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
uniform highp sampler3D voxInd;
uniform highp sampler3D voxPool;
uniform highp sampler2D voxPal;
uniform highp sampler3D voxSky;
uniform vec3 voxOrigin;
uniform vec4 voxInfo;
uniform vec4 voxDims;
uniform vec4 skyO;
uniform vec3 skyD;
uniform vec3 skyFill;
uniform vec3 groundFill;
uniform mat4 invView;
uniform mat4 viewProj;
uniform vec3 camPos;
uniform float tanY;
uniform float aspect;
uniform float minZ;
uniform float maxZ;
uniform float frame;
uniform float halfRate;
uniform int count;
uniform vec4 lPos[${RT_LIGHTS}];
uniform vec4 lDir[${RT_LIGHTS}];
uniform vec4 lCol[${RT_LIGHTS}];
uniform int capN;
uniform vec4 capA[${RT_CAPSULES}];
uniform vec4 capB[${RT_CAPSULES}];
${PARAMS_GLSL}
${VX_MAT_GLSL}

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float skyVisAt(vec3 p) { return skyO.w > 0.0 ? texture(voxSky, (p - skyO.xyz) / (skyO.w * skyD)).r : 1.0; }

// ray / capsule (a - b, radius r): distance along the ray or -1
float capHit(vec3 ro, vec3 rd, vec3 a, vec3 b, float r) {
  vec3 ba = b - a;
  vec3 oa = ro - a;
  float baba = dot(ba, ba);
  float bard = dot(ba, rd);
  float baoa = dot(ba, oa);
  float rdoa = dot(rd, oa);
  float oaoa = dot(oa, oa);
  float qa = baba - bard * bard;
  float qb = baba * rdoa - baoa * bard;
  float qc = baba * oaoa - baoa * baoa - r * r * baba;
  float h = qb * qb - qa * qc;
  if (h < 0.0) return -1.0;
  float t = (-qb - sqrt(h)) / qa;
  float y = baoa + t * bard;
  if (y > 0.0 && y < baba) return t;
  vec3 oc = y <= 0.0 ? oa : ro - b;
  qb = dot(rd, oc);
  qc = dot(oc, oc) - r * r;
  h = qb * qb - qc;
  return h > 0.0 ? -qb - sqrt(h) : -1.0;
}

vec3 lightAt(vec3 p, vec3 n, vec3 albedo) {
  float vis = skyVisAt(p + n * 0.3);
  vec3 c = mix(groundFill, skyFill, n.y * 0.5 + 0.5) * (0.12 + 0.88 * vis) * albedo;
  for (int i = 0; i < ${RT_LIGHTS}; i++) {
    if (i >= count) break;
    vec3 l = lPos[i].xyz - p;
    float d = length(l);
    float r = lPos[i].w;
    if (d >= r) continue;
    l /= max(d, 1e-3);
    float att = 1.0 - d / r;
    att *= att;
    float cone = lDir[i].w > -1.5 ? smoothstep(lDir[i].w, mix(lDir[i].w, 1.0, 0.3), dot(-l, lDir[i].xyz)) : 1.0;
    c += albedo * lCol[i].rgb * max(dot(n, l), 0.0) * att * cone;
  }
  return c;
}

void main(void) {
  // half rate: a checkerboard, alternating each frame (the composite fills the gaps); a = 1 where traced
  if (halfRate > 0.5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y) + frame, 2.0) > 0.5) { gl_FragColor = vec4(0.0); return; }
  float d = texture2D(depthSampler, vUV).r;
  if (d >= 0.9999) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float viewZ = d * (minZ + maxZ) - minZ;
  vec2 ndc = vUV * 2.0 - 1.0;
  vec3 vdir = vec3(ndc.x * tanY * aspect, ndc.y * tanY, 1.0);
  vec3 wdir = normalize((invView * vec4(vdir, 0.0)).xyz);
  vec3 P = camPos + wdir * viewZ * length(vdir);
  float size = voxInfo.x;
  // the surface: a voxel face (axis normal); anything else (characters, weapons) reflects nothing here
  vec3 fn = cross(dFdx(P), dFdy(P));
  vec3 n = dot(fn, fn) > 1e-12 ? normalize(fn) : -wdir;
  if (dot(n, wdir) > 0.0) n = -n;
  vec3 an = abs(n);
  vec3 ax = an.x >= an.y && an.x >= an.z ? vec3(sign(n.x), 0.0, 0.0) : (an.y >= an.z ? vec3(0.0, sign(n.y), 0.0) : vec3(0.0, 0.0, sign(n.z)));
  vec3 gp = (P - voxOrigin) / size;
  int m = vxMat(ivec3(floor(gp - ax * 0.5)));
  if (m == 0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec4 pal = texelFetch(voxPal, ivec2(m, 0), 0);
  int pa = int(pal.a * 255.0 + 0.5);
  int kind = pa - (pa / 16) * 16;
  float metal = VX_P[kind].y;
  float pud = texelFetch(voxPal, ivec2(m, 1), 0).r;
  float vis = skyVisAt(P + ax * 0.3);
  float wet = voxInfo.z * smoothstep(0.55, 0.92, ax.y) * smoothstep(0.35, 0.8, vis);
  float rough = mix(0.8 - 0.45 * metal, 0.04, min(wet * (1.0 + pud), 1.0));
  if (rough > 0.62) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 albedo = pow(pal.rgb, vec3(2.2));
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  float cosV = max(dot(-wdir, ax), 0.0);
  vec3 fres = F0 + (1.0 - F0) * pow(1.0 - cosV, 5.0);
  vec3 weight = fres * (1.0 - rough) * (1.0 - rough);
  float j = ign(gl_FragCoord.xy + frame * 5.588238);
  vec3 jit = vec3(ign(gl_FragCoord.xy * 1.37 + frame), j, ign(gl_FragCoord.yx + frame * 2.3)) - 0.5;
  vec3 R = normalize(reflect(wdir, ax) + jit * rough * 0.6);
  if (dot(R, ax) < 0.02) R = normalize(R + ax * (0.02 - dot(R, ax)));
  vec3 o = P + ax * size * 0.6;
  // 1) screen space: what is on screen along the ray (characters included)
  vec3 col = vec3(0.0);
  bool hit = false;
  float t = 0.08 + j * 0.1;
  for (int i = 0; i < 20; i++) {
    vec3 q = o + R * t;
    vec4 c = viewProj * vec4(q, 1.0);
    if (c.w <= minZ) break;
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) break;
    float sd = texture2D(depthSampler, uv).r * (minZ + maxZ) - minZ;
    if (c.w > sd + 0.03 && c.w < sd + 0.5 + t * 0.05) {
      col = texture2D(textureSampler, uv).rgb;
      hit = true;
      break;
    }
    t *= 1.32;
  }
  if (!hit) {
    // 2) the voxels: a DDA through the brickmap (empty bricks skipped) and the characters as capsules
    vec3 p0 = (o - voxOrigin) / size;
    vec3 inv = 1.0 / max(abs(R), vec3(1e-5)) * sign(R + 1e-12);
    vec3 st = sign(R);
    ivec3 v = ivec3(floor(p0));
    vec3 tMax = (vec3(v) + max(st, 0.0) - p0) * inv;
    vec3 tDelta = abs(inv);
    ivec3 dims = ivec3(voxDims.xyz);
    float tv = -1.0;
    vec3 hn = vec3(0.0);
    int hm = 0;
    float tc = 0.0;
    for (int i = 0; i < 320; i++) {
      ivec3 b = v >> 3;
      if (any(lessThan(v, ivec3(0))) || any(greaterThanEqual(b, dims))) break;
      vec4 ind = texelFetch(voxInd, b, 0);
      if (ind.a < 0.5 / 255.0) {
        // empty brick: on to where the ray leaves it
        vec3 bmin = vec3(b * 8);
        vec3 bexit = (bmin + max(st, 0.0) * 8.0 - p0) * inv;
        float te = min(bexit.x, min(bexit.y, bexit.z));
        hn = bexit.x <= te ? vec3(-st.x, 0.0, 0.0) : (bexit.y <= te ? vec3(0.0, -st.y, 0.0) : vec3(0.0, 0.0, -st.z));
        tc = te + 1e-3;
        v = ivec3(floor(p0 + R * tc));
        tMax = (vec3(v) + max(st, 0.0) - p0) * inv;
      } else {
        int mm = vxMat(v);
        if (mm != 0 && i > 0) { tv = tc; hm = mm; break; }
        if (tMax.x < tMax.y && tMax.x < tMax.z) { tc = tMax.x; tMax.x += tDelta.x; v.x += int(st.x); hn = vec3(-st.x, 0.0, 0.0); }
        else if (tMax.y < tMax.z) { tc = tMax.y; tMax.y += tDelta.y; v.y += int(st.y); hn = vec3(0.0, -st.y, 0.0); }
        else { tc = tMax.z; tMax.z += tDelta.z; v.z += int(st.z); hn = vec3(0.0, 0.0, -st.z); }
      }
      if (tc * size > 30.0) break;
    }
    float tw = tv >= 0.0 ? tv * size : 1e9;
    float tcap = 1e9;
    for (int k = 0; k < ${RT_CAPSULES}; k++) {
      if (k >= capN) break;
      float h = capHit(o, R, capA[k].xyz, capB[k].xyz, capA[k].w);
      if (h > 0.0 && h < tcap) tcap = h;
    }
    if (tcap < tw) {
      vec3 hp = o + R * tcap;
      col = lightAt(hp, -R, vec3(0.035, 0.037, 0.04));
    } else if (tv >= 0.0) {
      vec3 hp = o + R * tw;
      vec4 hpal = texelFetch(voxPal, ivec2(hm, 0), 0);
      int hpa = int(hpal.a * 255.0 + 0.5);
      vec3 ha = pow(hpal.rgb, vec3(2.2)) * (0.92 + 0.16 * fract(sin(dot(vec3(v), vec3(12.9898, 78.233, 37.719))) * 43758.5453));
      col = lightAt(hp, hn, ha) + ha * float(hpa / 16) / 15.0 * 4.0;
    } else {
      // left the map: the open sky's fill where it is open
      col = skyFill * 0.5 * skyVisAt(o + R * 8.0);
    }
  }
  gl_FragColor = vec4(col * weight, 1.0);
}`;

/** Full resolution: the scene plus the (upsampled) reflections. */
Effect.ShadersStore['rtCompositeFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D sceneSampler;
uniform vec2 texel;
void main(void) {
  vec4 c = texture2D(sceneSampler, vUV);
  // a small tent over the traced pixels (a = 1; the checkerboard's gaps are 0), jittered per frame, TAA does the rest
  vec4 r = texture2D(textureSampler, vUV) * 0.4;
  r += texture2D(textureSampler, vUV + vec2(texel.x, 0.0)) * 0.15;
  r += texture2D(textureSampler, vUV - vec2(texel.x, 0.0)) * 0.15;
  r += texture2D(textureSampler, vUV + vec2(0.0, texel.y)) * 0.15;
  r += texture2D(textureSampler, vUV - vec2(0.0, texel.y)) * 0.15;
  gl_FragColor = vec4(c.rgb + r.rgb / max(r.a, 1e-3), c.a);
}`;

/** What the reflections read: the structure layer's brickmap and its fill / rain state. */
export interface RtSource {
  tex: VoxelTextures;
  /** Rain wetness 0..1 and the hemisphere fill the voxels take (sky above, ground below). */
  state: () => { wet: number; skyFill: readonly number[]; groundFill: readonly number[] };
  /** Characters as capsules: fills `a` (x, y, z, radius) and `b` (x, y, z, 0) per capsule; returns the count. */
  capsules: (a: Float32Array, b: Float32Array, max: number) => number;
  lights: LightRegistry | null;
}

export class RtReflections {
  private copy: PassPostProcess;
  private rt: PostProcess;
  private comp: PostProcess;
  private readonly invView = new Matrix();
  private readonly lPos = new Float32Array(RT_LIGHTS * 4);
  private readonly lDir = new Float32Array(RT_LIGHTS * 4);
  private readonly lCol = new Float32Array(RT_LIGHTS * 4);
  private readonly capA = new Float32Array(RT_CAPSULES * 4);
  private readonly capB = new Float32Array(RT_CAPSULES * 4);
  private ids = new Int32Array(RT_LIGHTS);
  private dist = new Float32Array(RT_LIGHTS);
  private count = 0;
  private caps = 0;
  private frameN = 0;

  constructor(
    private scene: Scene,
    private camera: Camera,
    private src: RtSource,
    depth: DepthRenderer,
    half: boolean,
    /** The texture type ahead of tone mapping (half float on desktop: `PostStack.hdr`). */
    textureType: number,
  ) {
    this.copy = new PassPostProcess('rtScene', 1, camera, undefined, undefined, false, textureType);
    const rt = new PostProcess(
      'rtReflect',
      'rtReflect',
      ['voxOrigin', 'voxInfo', 'voxDims', 'skyO', 'skyD', 'skyFill', 'groundFill', 'invView', 'viewProj', 'camPos', 'tanY', 'aspect', 'minZ', 'maxZ', 'frame', 'halfRate', 'count', 'lPos', 'lDir', 'lCol', 'capN', 'capA', 'capB'],
      ['depthSampler', 'voxInd', 'voxPool', 'voxPal', 'voxSky'],
      1,
      camera,
      undefined,
      undefined,
      false,
      null,
      textureType,
    );
    rt.onApply = (e) => {
      const cam = this.camera;
      const t = this.src.tex;
      const s = this.src.state();
      cam.getViewMatrix().invertToRef(this.invView);
      e.setTexture('depthSampler', depth.getDepthMap());
      e.setTexture('voxInd', t.index);
      e.setTexture('voxPool', t.pool);
      e.setTexture('voxPal', t.palette);
      if (t.sky) e.setTexture('voxSky', t.sky);
      e.setFloat3('voxOrigin', t.origin[0], t.origin[1], t.origin[2]);
      e.setFloat4('voxInfo', t.size, 0, s.wet, 0);
      e.setFloat4('voxDims', t.bricks[0], t.bricks[1], t.bricks[2], 0);
      e.setFloat4('skyO', t.skyOrigin[0], t.skyOrigin[1], t.skyOrigin[2], t.sky ? t.skyCell : 0);
      e.setFloat3('skyD', t.skyDims[0], t.skyDims[1], t.skyDims[2]);
      e.setFloat3('skyFill', s.skyFill[0] ?? 0, s.skyFill[1] ?? 0, s.skyFill[2] ?? 0);
      e.setFloat3('groundFill', s.groundFill[0] ?? 0, s.groundFill[1] ?? 0, s.groundFill[2] ?? 0);
      e.setMatrix('invView', this.invView);
      e.setMatrix('viewProj', cam.getTransformationMatrix());
      const p = cam.globalPosition;
      e.setFloat3('camPos', p.x, p.y, p.z);
      e.setFloat('tanY', Math.tan(cam.fov / 2));
      e.setFloat('aspect', rt.width / Math.max(1, rt.height));
      e.setFloat('minZ', cam.minZ);
      e.setFloat('maxZ', cam.maxZ);
      e.setFloat('frame', this.frameN % 64);
      e.setFloat('halfRate', half ? 1 : 0);
      e.setInt('count', this.count);
      e.setFloatArray4('lPos', this.lPos);
      e.setFloatArray4('lDir', this.lDir);
      e.setFloatArray4('lCol', this.lCol);
      e.setInt('capN', this.caps);
      e.setFloatArray4('capA', this.capA);
      e.setFloatArray4('capB', this.capB);
    };
    this.rt = rt;
    const comp = new PostProcess('rtComposite', 'rtComposite', ['texel'], ['sceneSampler'], 1, camera, undefined, undefined, false, null, textureType);
    comp.onApply = (e) => {
      e.setTextureFromPostProcessOutput('sceneSampler', this.copy);
      e.setFloat2('texel', 1 / Math.max(1, rt.width), 1 / Math.max(1, rt.height));
    };
    this.comp = comp;
  }

  /** Per render frame: the nearest lights and the characters. */
  frame(): void {
    this.frameN++;
    this.caps = this.src.capsules(this.capA, this.capB, RT_CAPSULES);
    const reg = this.src.lights;
    if (!reg) {
      this.count = 0;
      return;
    }
    const p = this.camera.globalPosition;
    // nearest lights that are on (allocation-free insertion)
    let n = 0;
    const ls = reg.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (!l.on || l.destroyed) continue;
      const dx = l.x - p.x;
      const dy = l.y - p.y;
      const dz = l.z - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - l.radius;
      if (d > 30) continue;
      let k = n < RT_LIGHTS ? n++ : RT_LIGHTS;
      if (k === RT_LIGHTS && d >= this.dist[RT_LIGHTS - 1]!) continue;
      if (k === RT_LIGHTS) k = RT_LIGHTS - 1;
      while (k > 0 && this.dist[k - 1]! > d) {
        this.dist[k] = this.dist[k - 1]!;
        this.ids[k] = this.ids[k - 1]!;
        k--;
      }
      this.dist[k] = d;
      this.ids[k] = i;
    }
    for (let k = 0; k < n; k++) {
      const l = ls[this.ids[k]!]!;
      this.lPos[k * 4] = l.x;
      this.lPos[k * 4 + 1] = l.y;
      this.lPos[k * 4 + 2] = l.z;
      this.lPos[k * 4 + 3] = l.cone ? Math.min(l.reach ?? l.radius, l.radius) : l.radius;
      if (l.cone) {
        this.lDir[k * 4] = l.cone.dx;
        this.lDir[k * 4 + 1] = l.cone.dy;
        this.lDir[k * 4 + 2] = l.cone.dz;
        this.lDir[k * 4 + 3] = l.cone.cosOuter;
      } else {
        this.lDir[k * 4 + 3] = -2;
      }
      this.lCol[k * 4] = l.color[0] * l.intensity;
      this.lCol[k * 4 + 1] = l.color[1] * l.intensity;
      this.lCol[k * 4 + 2] = l.color[2] * l.intensity;
    }
    this.count = n;
  }

  dispose(): void {
    this.copy.dispose(this.camera);
    this.rt.dispose(this.camera);
    this.comp.dispose(this.camera);
    void this.scene;
  }
}
