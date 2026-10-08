module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  // chalk and its ANSI helpers are ESM-only; let babel-jest transpile them.
  transformIgnorePatterns: ['/node_modules/(?!(chalk|ansi-styles)/)'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node']
};
