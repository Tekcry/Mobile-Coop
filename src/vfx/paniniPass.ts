import { Effect, PostProcess, type Camera } from '../core/babylon';
import { paniniScale } from '../core/panini';

/** Panini projection (3.0, Display > Panini): per output pixel the rectilinear point to sample (`core/panini`). */
Effect.ShadersStore['paniniFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec4 params;
void main(void) {
  // params: tan of the half FOVs (x, y), strength d, fit zoom
  vec2 view = (vUV * 2.0 - 1.0) * params.xy * params.w;
  float d = params.z;
  float viewDist = 1.0 + d;
  float hypSq = view.x * view.x + viewDist * viewDist;
  float isect = view.x * d;
  float cylDistMinusD = (-isect * view.x + viewDist * sqrt(max(hypSq - isect * isect, 0.0))) / hypSq;
  float cylDist = cylDistMinusD + d;
  vec2 src = view * (cylDist / viewDist / max(cylDist - d, 1e-6));
  vec2 uv = src / params.xy * 0.5 + 0.5;
  gl_FragColor = texture2D(textureSampler, clamp(uv, vec2(0.0), vec2(1.0)));
}`;

export class PaniniPass {
  readonly pp: PostProcess;

  constructor(
    private camera: Camera,
    private strength: number,
  ) {
    const pp = new PostProcess('panini', 'panini', ['params'], null, 1, camera);
    pp.onApply = (e) => {
      const tanY = Math.tan(this.camera.fov / 2);
      const tanX = tanY * (pp.width / Math.max(1, pp.height));
      e.setFloat4('params', tanX, tanY, this.strength, paniniScale(tanX, this.strength));
    };
    this.pp = pp;
  }

  dispose(): void {
    this.pp.dispose(this.camera);
  }
}
