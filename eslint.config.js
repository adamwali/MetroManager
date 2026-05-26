import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '.vercel'] },

  // Base configuration for all TS/TSX files
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'engine', pattern: 'src/engine/**' },
        { type: 'state', pattern: 'src/state/**' },
        { type: 'ui', pattern: 'src/ui/**' },
        { type: 'types', pattern: 'src/types/**' },
        { type: 'utils', pattern: 'src/utils/**' },
        { type: 'app', pattern: 'src/{App,main}.{ts,tsx}', mode: 'file' },
        { type: 'test', pattern: 'src/test/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Architectural boundary: engine must be pure TypeScript.
      // It cannot import React, UI, or state (which depends on React).
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'engine',
              disallow: ['ui', 'state', 'app'],
              message: 'Engine code must be pure TypeScript. No React, UI, or state imports.',
            },
            {
              from: 'types',
              disallow: ['ui', 'state', 'app', 'engine'],
              message: 'Types must not depend on implementation modules.',
            },
            {
              from: 'utils',
              disallow: ['ui', 'state', 'app'],
              message: 'Utils must stay generic (no UI, state, or app coupling).',
            },
          ],
        },
      ],
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'engine',
              disallow: [
                'react',
                'react-dom',
                'react-*',
                'zustand',
                'framer-motion',
                'recharts',
                '@tailwindcss/*',
              ],
              message: 'Engine code must be pure TypeScript with no UI / framework deps.',
            },
          ],
        },
      ],
    },
  },

  // Tests and scripts can opt out of stricter rules where useful
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'boundaries/element-types': 'off',
      'boundaries/external': 'off',
    },
  },
);
