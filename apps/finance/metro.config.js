const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships a wasm binary; drizzle migrations are .sql files.
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('sql');

// expo-sqlite web needs SharedArrayBuffer, which needs cross-origin isolation.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
