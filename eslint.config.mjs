import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'run-artifacts/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // An unawaited Playwright call silently skips the assertion it was meant to make.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['apps/lab-site/server.mjs'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
  },

  {
    // Browser scripts are plain classic scripts, served as-is, never bundled.
    files: ['apps/lab-site/public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
      sourceType: 'script',
    },
  },

  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Screenshot assertions are the point of the visual lab. The one allowed
      // skip is the documented platform gate in tests/visual/visual.spec.ts.
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      // Route handlers are awaited by Playwright, not by the test body.
      'playwright/no-conditional-in-test': 'off',
    },
  },

  // Prettier owns formatting; keep ESLint out of its way.
  prettier,
);
