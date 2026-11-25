/** Identifiant du build, remplacé par scripts/patch-pages.mjs lors du déploiement. */
const RAW_BUILD_VERSION = '__BUILD_VERSION__';

export const BUILD_VERSION = RAW_BUILD_VERSION.startsWith('__') ? 'dev' : RAW_BUILD_VERSION;
