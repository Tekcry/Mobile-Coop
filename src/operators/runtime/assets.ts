/**
 * The operator files in the build (step 11d; used from 11e). Vite emits every GLB under src/operators/assets/<id>/ into
 * dist/assets/ (hashed) and hands back its same-origin URL; nothing is fetched from anywhere else (CLAUDE.md). Until
 * step 11e copies the files there the glob is empty and the manifest reports every game LOD missing.
 */
import { manifestFromUrls, type OperatorManifest } from './manifest';

const FILES = import.meta.glob<string>('../assets/*/*.glb', { query: '?url', import: 'default', eager: true });

/** Wren's LOD files as built into this bundle. */
export function wrenManifest(): OperatorManifest {
  return manifestFromUrls('wren', FILES);
}
