/**
 * Single import surface for Babylon.js. Game code imports from here, never from
 * '@babylonjs/core' directly, so tree-shaking and required side-effect modules
 * are managed in one place.
 */
export { Engine } from '@babylonjs/core/Engines/engine';
export { Scene } from '@babylonjs/core/scene';
export { EngineStore } from '@babylonjs/core/Engines/engineStore';
export { Vector3, Vector2, Vector4, Quaternion, Matrix, TmpVectors } from '@babylonjs/core/Maths/math.vector';
export { Skeleton } from '@babylonjs/core/Bones/skeleton';
export { Bone } from '@babylonjs/core/Bones/bone';
// (feature/weapons) the operators' finger-grip morph targets
export { MorphTarget } from '@babylonjs/core/Morph/morphTarget';
export { MorphTargetManager } from '@babylonjs/core/Morph/morphTargetManager';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
export { Scalar } from '@babylonjs/core/Maths/math.scalar';
export { Ray } from '@babylonjs/core/Culling/ray';
export { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
export { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
export { Camera } from '@babylonjs/core/Cameras/camera';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { SpotLight } from '@babylonjs/core/Lights/spotLight';
export type { Light } from '@babylonjs/core/Lights/light';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
// KTX2 (Basis) textures: the operator LODs (step 11, D26, D27); the .ktx2 loader registers itself. No runtime network:
// Babylon's default decoder URL (cdn.babylonjs.com) is blanked here, so a KTX2 load that nobody configured fails instead
// of fetching it; the operator Lab points the decoder at bundled files (src/operators/lab/ktx2.ts).
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
KhronosTextureContainer2.URLConfig.jsDecoderModule = '';
export { KhronosTextureContainer2 };
export { Logger } from '@babylonjs/core/Misc/logger';
export { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
export { ClusteredLightContainer } from '@babylonjs/core/Lights/Clustered/clusteredLightContainer';
export { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
export { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
export { SSRRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline';
export { TAARenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/taaRenderingPipeline';
export { MotionBlurPostProcess } from '@babylonjs/core/PostProcesses/motionBlurPostProcess';
export { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
export type { DepthRenderer } from '@babylonjs/core/Rendering/depthRenderer';
export type { GeometryBufferRenderer } from '@babylonjs/core/Rendering/geometryBufferRenderer';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
export { Material } from '@babylonjs/core/Materials/material';
export { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
export type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
export { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
export { RawTexture3D } from '@babylonjs/core/Materials/Textures/rawTexture3D';
export { Constants } from '@babylonjs/core/Engines/constants';
export { Viewport } from '@babylonjs/core/Maths/math.viewport';
export { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
export { EffectRenderer, EffectWrapper } from '@babylonjs/core/Materials/effectRenderer';
export { ProceduralTexture } from '@babylonjs/core/Materials/Textures/Procedurals/proceduralTexture';
export { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
export { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe';
export { SubMesh } from '@babylonjs/core/Meshes/subMesh';
export type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
export { VertexBuffer, Buffer as GpuBuffer } from '@babylonjs/core/Buffers/buffer';
export type { DataBuffer } from '@babylonjs/core/Buffers/dataBuffer';
export { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
export { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
export { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
export { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
export { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
export { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
export { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
export { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
export { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
export type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
export { Observable, type Observer } from '@babylonjs/core/Misc/observable';
export { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
export { PassPostProcess } from '@babylonjs/core/PostProcesses/passPostProcess';
export type { PostProcessManager } from '@babylonjs/core/PostProcesses/postProcessManager';
export type { RenderTargetWrapper } from '@babylonjs/core/Engines/renderTargetWrapper';
export { Effect } from '@babylonjs/core/Materials/effect';
// (guard-ai carry fix) the GL state's cached pipelines: a body effect recompiled after a timed-out compile drops its own
export { getStateObject } from '@babylonjs/core/Engines/thinEngine.functions';
export { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
export { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
export { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
export { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
export type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
export { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
export { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
export {
  PhysicsShape,
  PhysicsShapeBox,
  PhysicsShapeSphere,
  PhysicsShapeCapsule,
  PhysicsShapeMesh,
  PhysicsShapeCylinder,
  PhysicsShapeContainer,
} from '@babylonjs/core/Physics/v2/physicsShape';
export { PhysicsCharacterController, CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController';
export type { CharacterSurfaceInfo } from '@babylonjs/core/Physics/v2/characterController';
export { PhysicsShapeType, PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
export { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
export { ShapeCastResult } from '@babylonjs/core/Physics/shapeCastResult';
export { BallAndSocketConstraint, HingeConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint';
export type { Nullable } from '@babylonjs/core/types';
export type { IPhysicsCollisionEvent } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';

// Side-effect modules (register scene components / engine extensions).
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Rendering/edgesRenderer';
import '@babylonjs/core/Rendering/boundingBoxRenderer';
import '@babylonjs/core/Rendering/outlineRenderer';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Shaders/postprocess.vertex';
// Standard material, edge and outline shaders registered up front: in the Vite dev server their lazy imports can load a
// second copy of the shader store and fall back to fetching .fx files that do not exist (seen in the level editor).
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/line.vertex';
import '@babylonjs/core/Shaders/line.fragment';
import '@babylonjs/core/Shaders/outline.vertex';
import '@babylonjs/core/Shaders/outline.fragment';
// PBR, shadow, depth and post-process shaders too: the dev server served index.html for imageProcessing.fragment.fx
// (black view, '<' syntax errors; Fallow walk, 2026-10-14).
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';
import '@babylonjs/core/Shaders/imageProcessing.fragment';
import '@babylonjs/core/Shaders/pass.fragment';
import '@babylonjs/core/Shaders/fxaa.vertex';
import '@babylonjs/core/Shaders/fxaa.fragment';
import '@babylonjs/core/Shaders/sharpen.fragment';
import '@babylonjs/core/Shaders/chromaticAberration.fragment';
import '@babylonjs/core/Shaders/extractHighlights.fragment';
import '@babylonjs/core/Shaders/bloomMerge.fragment';
import '@babylonjs/core/Shaders/kernelBlur.vertex';
import '@babylonjs/core/Shaders/kernelBlur.fragment';
import '@babylonjs/core/Shaders/circleOfConfusion.fragment';
import '@babylonjs/core/Shaders/depthOfField.fragment';
import '@babylonjs/core/Shaders/ssao2.fragment';
import '@babylonjs/core/Shaders/ssaoCombine.fragment';
import '@babylonjs/core/Shaders/screenSpaceReflection2.fragment';
import '@babylonjs/core/Shaders/motionBlur.fragment';
import '@babylonjs/core/Shaders/depth.vertex';
import '@babylonjs/core/Shaders/depth.fragment';
import '@babylonjs/core/Shaders/geometry.vertex';
import '@babylonjs/core/Shaders/geometry.fragment';
import '@babylonjs/core/Shaders/shadowMap.vertex';
import '@babylonjs/core/Shaders/shadowMap.fragment';
import '@babylonjs/core/Shaders/rgbdDecode.fragment';
import '@babylonjs/core/Lights/Clustered/clusteredLightingSceneComponent';
import '@babylonjs/core/Materials/Textures/Procedurals/proceduralTextureSceneComponent';
// (menu-ui slice 6) the procedural textures' vertex shader (the surface atlas): without it Babylon fetches it by URL
import '@babylonjs/core/Shaders/procedural.vertex';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';

// Babylon 9 stubs out methods whose side-effect module is missing. Warn loudly
// so the smoke test catches any missing import above.
import { SetMissingSideEffectWarningsEnabled } from '@babylonjs/core/Misc/devTools';
import { ThinEngine } from '@babylonjs/core/Engines/thinEngine';
import type { IPipelineContext } from '@babylonjs/core/Engines/IPipelineContext';
import type { WebGLPipelineContext } from '@babylonjs/core/Engines/WebGL/webGLPipelineContext';
import { getStateObject as getGlStateObject } from '@babylonjs/core/Engines/thinEngine.functions';
SetMissingSideEffectWarningsEnabled(true);

// (gl-warning-fix, backlog 27) A program deleted while its parallel link is still running (KHR_parallel_shader_compile,
// hardware GPUs only; a post stack rebuild or a material recompile disposes an effect that never finished compiling)
// makes Chrome / ANGLE query the deleted program: "GL_INVALID_VALUE: glGetProgramiv: Program object expected", a dozen
// per rebuild. Keep such a program until its link completes, then delete it; flag the context disposed at once so
// Babylon's own readiness poll stops without touching it. Relies on Babylon internals: tests/glWarningFix.test.ts pins
// the version and fails loudly on an upgrade (re-check this patch, then bump it there).
const COMPLETION_STATUS_KHR = 0x91b1;
/**
 * (guard-ai body watchdog) Babylon's `resetCachedPipeline`, run by the original delete below, is keyed by NAME (the
 * effect key): it disposes whatever context is cached under the name now, not the one being deleted. A context deleted
 * late (the deferred delete here, seconds after its effect was dropped, or a fallback's previous context deleted when
 * the next one compiles) then flagged the successor compiled under the same key disposed, so that effect could never
 * become ready (`_isRenderingStateCompiled` is false for a disposed context): the "program disposed, recompiling (2/3)"
 * right after a body recompile (sector-redesign lr16-lightbake-triage). Unlink the context first: its own cache entry
 * goes now (a new effect must not pick up a context being deleted), a successor's entry is left alone, and its name is
 * cleared so the original delete's reset touches nothing. Returns whether the cache held this very context.
 */
function unlinkCachedPipeline(ctx: WebGLPipelineContext & Pick<IPipelineContext, '_name'>): boolean {
  const name = ctx._name;
  if (!name || !ctx.context) return false;
  ctx._name = '';
  const cached = getGlStateObject(ctx.context).cachedPipelines;
  if (cached[name] !== ctx) return false;
  delete cached[name];
  return true;
}
const deletePipelineContext = ThinEngine.prototype._deletePipelineContext;
ThinEngine.prototype._deletePipelineContext = function (this: ThinEngine, pipelineContext: IPipelineContext): void {
  const ctx = pipelineContext as WebGLPipelineContext | null;
  // (as the original's reset did for its own entry: the context is flagged disposed)
  if (ctx?.program && unlinkCachedPipeline(ctx)) ctx.dispose();
  if (!ctx?.program || !ctx.isParallelCompiled) {
    deletePipelineContext.call(this, pipelineContext);
    return;
  }
  ctx._isDisposed = true;
  let tries = 0;
  const release = (): void => {
    if (this.isDisposed) return;
    const gl = this._gl;
    // already deleted, or from a context lost and restored since: isProgram raises no GL error (getProgramParameter would)
    if (ctx.program && !gl.isContextLost() && !gl.isProgram(ctx.program)) return;
    const linking = !!ctx.program && !gl.isContextLost() && !gl.getProgramParameter(ctx.program, COMPLETION_STATUS_KHR);
    if (linking && ++tries < 600) setTimeout(release, 16);
    else deletePipelineContext.call(this, ctx);
  };
  release();
};

/** WebGL2's guaranteed floor for MAX_3D_TEXTURE_SIZE is 256; nearly every GPU (ANGLE D3D11 included) reports 2048. */
const MAX_3D_TEXTURE_SIZE = 0x8073;
/**
 * (lr-tex3d) The GPU's largest 3D texture edge (texels), read from the context: a 3D upload past it fails ("texImage3D:
 * width, height or depth out of range") and the texture samples 0. 2048 when there is no WebGL2 context (NullEngine in
 * tests, where nothing uploads). Rendering only: gameplay never reads it.
 */
export function max3DTextureSize(engine: object): number {
  const e = engine as { _gl?: WebGL2RenderingContext | null; webGLVersion?: number };
  const gl = e._gl;
  if (!gl || (e.webGLVersion ?? 0) < 2 || typeof gl.getParameter !== 'function') return 2048;
  const v = Number(gl.getParameter(MAX_3D_TEXTURE_SIZE));
  return v > 0 ? v : 2048;
}
