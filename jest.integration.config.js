module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'server/src/**/*.{ts,js}',
    'client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js']
}; 