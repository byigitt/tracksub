const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspaces: Metro must be told about the workspace root and node_modules
// hoisting locations so module resolution works for both root and app deps.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// better-auth requires package exports — leave the default (true) untouched.

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});
