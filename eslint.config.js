import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'public/**', '.github/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: [
      'src/**/*.{ts,tsx}',
      'tests/**/*.ts',
      'vite.config.ts',
      'playwright.config.ts'
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'import/order': ['error', { 'newlines-between': 'always' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off'
    }
  },
  prettierConfig
];
