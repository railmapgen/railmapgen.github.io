import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { coverageConfigDefaults } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config
export default defineConfig({
    base: '/',
    plugins: [react()],
    build: {
        rolldownOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                contributors: path.resolve(__dirname, 'contributors', 'index.html'),
                demo: path.resolve(__dirname, 'runtime-demo', 'index.html'),
            },
            output: {
                codeSplitting: {
                    groups: [
                        { test: /node_modules\/react/, name: 'react' },
                        { test: /node_modules\/@mantine/, name: 'mantine' },
                    ],
                },
            },
        },
    },
    server: {
        proxy: {
            '^(/rmg/|/rmp/|/rmg-palette/|/rmg-template/|/rmg-templates/|/rmp-gallery/|/rmp-designer/|/mantine-components/|/svg-assets/|/rmg-translate/|/__APP_NAME__/|/rmg-runtime/)':
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
        watch: false,
        coverage: {
            provider: 'v8',
            exclude: coverageConfigDefaults.exclude,
            skipFull: true,
        },
    },
});
