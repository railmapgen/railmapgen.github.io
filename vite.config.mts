/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config
export default defineConfig({
    base: '/',
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                demo: path.resolve(__dirname, 'runtime-demo', 'index.html')
            },
            output: {
                manualChunks: {
                    react: [
                        'react',
                        'react-dom',
                        'react-router-dom',
                        '@reduxjs/toolkit',
                        'react-redux',
                        'react-i18next',
                    ],
                    mantine: ['@mantine/core', '@mantine/hooks', '@railmapgen/mantine-components'],
                },
            },
        },
    },
    server: {
        proxy: {
            '^(/rmg/|/rmp/|/rmg-palette/|/rmg-template/|/rmg-templates/|/rmp-gallery/|/rmp-designer/|/rmg-components/|/svg-assets/|/rmg-translate/|/seed-project/|/rmg-runtime/)':
                {
                    target: 'https://railmapgen.github.io',
                    changeOrigin: true,
                    secure: false,
                },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        server: {
            deps: {
                fallbackCJS: false,
            },
        },
        watch: false,
    },
});
