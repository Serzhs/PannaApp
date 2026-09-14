import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
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
    // NestJS modules are declaration-only: the decorator carries everything and the
    // class body is meant to be empty.
    files: ['**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
  prettier,
);
