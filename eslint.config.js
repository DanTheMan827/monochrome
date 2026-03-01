import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
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
    reactPlugin.configs.flat.recommended,
    prettierConfig,
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                Neutralino: 'readonly',
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
    {
        files: ['**/*.js', '**/*.mjs'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
        },
    },
];
