// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';

const { plugins: _1, parserOptions: _2, ...reactConfigRecommended } = react.configs.recommended;
const { plugins: _3, parserOptions: _4, ...reactJsxRuntime } = react.configs['jsx-runtime'];

export default tseslint.config(
    eslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        extends: [...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
        plugins: { react },
        extends: [reactConfigRecommended, reactJsxRuntime],
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: { prettier },
        rules: {
            'prettier/prettier': [
                'warn',
                {
                    endOfLine: 'auto',
                },
            ],
        },
    }
);
