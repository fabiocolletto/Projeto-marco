import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/.svelte-kit/**',
    '**/build/**',
    '**/dist/**',
    'artifacts/**',
    'playwright-report/**',
    '**/.turbo/**',
  ],
};

const rawSvelteConfig = svelte.configs['flat/recommended'];
const svelteConfigs = Array.isArray(rawSvelteConfig) ? rawSvelteConfig : [rawSvelteConfig];

export default tseslint.config(
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{js,ts,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-console': process.env.CI ? 'warn' : 'off',
    },
  },
  ...svelteConfigs,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: {
          ts: tseslint.parser,
        },
        extraFileExtensions: ['.svelte'],
        projectService: false,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      'svelte/no-at-html-tags': 'warn',
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  eslintConfigPrettier,
);
