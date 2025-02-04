import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
const config = defineConfig({
    build: {
        outDir: "../server/build"
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve('./src'),
            "@fonts": resolve('./assets/fonts'),
        }
    }
});

export default config;
