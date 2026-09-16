/**
 * jest-expo rather than Vitest for this workspace alone: React Native ships
 * untranspiled Flow that esbuild cannot read, and jest-expo is the transform Metro
 * itself uses. The api and shared workspaces stay on Vitest.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  // Worklets picks its JavaScript build over the native one under Jest, so Reanimated
  // runs for real in tests instead of through a stand-in that lacks half its hooks.
  resolver: 'react-native-worklets/jest/resolver.js',
  // Components translate through i18next, which must be started before they render.
  setupFilesAfterEnv: ['<rootDir>/src/i18n/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // A native module, so tests get the mock the library ships instead.
    '^react-native-keyboard-controller$': 'react-native-keyboard-controller/jest',
  },
};
