/// <reference types="vitest" />

import { defineConfig, ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

const rmgProxies = [
    '/rmg/',
    '/rmp/',
    '/rmg-palette/',
    '/rmg-components/',
    '/rmg-templates/',
    '/seed-project/',
    '/rmg-translate/',
].reduce<Record<string, ProxyOptions>>(
    (acc, cur) => ({
        ...acc,
        [cur]: {
            target: 'https://uat-railmapgen.github.io',
            changeOrigin: true,
            secure: false,
        },
    }),
    {}
);

// https://vitejs.dev/config
export default defineConfig({
    base: '/',
    plugins: [
        react(),
        legacy({
            targets: ['defaults', '>0.2%', 'not dead'],
            modernPolyfills: true,
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-i18next'],
                    chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion', 'react-icons'],
                },
            },
        },
    },
    server: {
        proxy: {
            ...rmgProxies,
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        server: {
            deps: {
                fallbackCJS: true,
            },
        },
        watch: false,
    },
});
