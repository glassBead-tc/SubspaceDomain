/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/js-with-ts-esm', // Try this preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/' // Ignore all node_modules
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json' // Explicitly use test config
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'test-output/coverage',
  coverageReporters: ['text', 'lcov', 'json'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-output',
      outputName: 'junit.xml',
      classNameTemplate: '{filepath}',
      titleTemplate: '{title}'
    }],
    ['./node_modules/jest-html-reporter', {
      pageTitle: 'MCP Bridge Server Test Report',
      outputPath: 'test-output/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/build/'
  ],
  verbose: true
};
