/**
 * Single import surface for Babylon.js. Game code imports from here, never from
 * '@babylonjs/core' directly, so tree-shaking and required side-effect modules
 * are managed in one place.
 */
export { Engine } from '@babylonjs/core/Engines/engine';
export { Scene } from '@babylonjs/core/scene';
export { Vector3, Vector2, Quaternion, Matrix, TmpVectors } from '@babylonjs/core/Maths/math.vector';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
export { Scalar } from '@babylonjs/core/Maths/math.scalar';
export { Ray } from '@babylonjs/core/Culling/ray';
export { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
export { Material } from '@babylonjs/core/Materials/material';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
export { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
export { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
export { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
export { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
export { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
export { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
export { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
export { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
export { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
export { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
export { Observable } from '@babylonjs/core/Misc/observable';
export { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
export { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
export { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
export { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
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
export { BallAndSocketConstraint, HingeConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint';
export type { Nullable } from '@babylonjs/core/types';
export type { IPhysicsCollisionEvent } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';

// Side-effect modules (register scene components / engine extensions).
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Rendering/edgesRenderer';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

// Babylon 9 stubs out methods whose side-effect module is missing. Warn loudly
// so the smoke test catches any missing import above.
import { SetMissingSideEffectWarningsEnabled } from '@babylonjs/core/Misc/devTools';
SetMissingSideEffectWarningsEnabled(true);
