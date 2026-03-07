import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/legacy/**',
            '**/bin/**',
            '**/www/**',
            '**/public/lib/**',
            '**/public/neutralino.js',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                Neutralino: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-implicit-any-catch': 'off',
        },
    }
);
