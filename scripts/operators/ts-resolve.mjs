// Lets Node (type stripping) import the repo's extensionless TypeScript paths, e.g. '../player/proportions'.
// Used only by the offline operator scripts: `node --import ./scripts/operators/ts-resolve.mjs ...`.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/[.][cm]?[jt]s$/.test(spec) && ctx.parentURL?.endsWith('.ts')) {
    return next(spec + '.ts', ctx);
  }
  return next(spec, ctx);
}`),
);
