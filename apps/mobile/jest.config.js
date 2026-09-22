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
  // Gesture handler's own mock, so gestures exist in tests without a native side.
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Native modules, so tests get the mocks the libraries ship instead.
    '^react-native-keyboard-controller$': 'react-native-keyboard-controller/jest',
    '^@react-native-community/netinfo$': '@react-native-community/netinfo/jest/netinfo-mock.js',
    '^expo-image-picker$': '<rootDir>/src/test/mocks/expo-image-picker.ts',
  },
};
