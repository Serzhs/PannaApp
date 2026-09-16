import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import i18next from 'eslint-plugin-i18next';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      'apps/api/src/db/migrations/**',
      'sketches/**',
      'apps/mobile/.expo/**',
      'apps/mobile/expo-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  // Type-aware rules need a TypeScript program, so they apply to TypeScript only.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // A reason on the line, or not at all. ts-ignore stays silent once the
      // underlying error goes away, which is exactly when you want telling.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Config files Metro and friends load with require(), not as modules.
    files: ['**/metro.config.js', '**/jest.config.js', 'apps/mobile/index.js', '**/*.cjs'],
    // scripts/*.mjs are Node programs run by pnpm, not part of either app.
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // Node scripts run by pnpm: ESM, with the Node globals available.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
  {
    // 0006: a user-visible string in a component is a string the second language never
    // sees. JSX text and the props that carry words are checked; tests and the
    // development-only gallery are not, since neither reaches a user.
    files: ['apps/mobile/src/**/*.tsx', 'apps/mobile/app/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'apps/mobile/src/features/design/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'label',
              'title',
              'body',
              'helper',
              'placeholder',
              'accessibilityLabel',
              'accessibilityHint',
              'submitLabel',
              'confirmLabel',
              'cancelLabel',
              'message',
            ],
          },
        },
      ],
    },
  },
  {
    // NestJS modules are declaration-only: the decorator carries everything and the
    // class body is meant to be empty.
    files: ['**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
  prettier,
);
