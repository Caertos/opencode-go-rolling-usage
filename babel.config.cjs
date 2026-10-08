module.exports = {
  env: {
    test: {
      // Jest needs CJS (it transpiles modules)
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    },
    // build (NODE_ENV != 'test') -> keep ESM for the final output.
    // Target Node 18 (the engines floor) so async/await and classes are kept
    // as-is instead of being downleveled to regenerator inlined per file.
    production: {
      presets: [['@babel/preset-env', { modules: false, targets: { node: '18' } }]]
    }
  },
  // Fallback for any other environment (local development, etc.)
  presets: [['@babel/preset-env', { modules: false, targets: { node: '18' } }]]
};
